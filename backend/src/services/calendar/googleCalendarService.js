import { google } from 'googleapis';
import { env } from '../../config/env.js';
import { Integration, Appointment } from '../../models/index.js';
import { decryptSecret } from '../../utils/crypto.js';

function createOAuthClient() {
  if (!env.googleCalendarClientId || !env.googleCalendarClientSecret) {
    return null;
  }
  return new google.auth.OAuth2(
    env.googleCalendarClientId,
    env.googleCalendarClientSecret,
    env.googleCalendarRedirectUri
  );
}

export function getGoogleCalendarAuthUrl(organizationId) {
  const client = createOAuthClient();
  if (!client) return null;
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar.readonly'],
    state: String(organizationId),
  });
}

async function getCalendarClientForOrg(organizationId) {
  const integration = await Integration.findOne({
    organizationId,
    provider: 'google_calendar',
    status: 'connected',
  }).select('+encryptedCredentials');

  if (!integration || !integration.encryptedCredentials) return null;

  const client = createOAuthClient();
  if (!client) return null;

  const tokens = JSON.parse(decryptSecret(integration.encryptedCredentials));
  client.setCredentials(tokens);
  return google.calendar({ version: 'v3', auth: client });
}

export async function checkAvailability({ organizationId, dateStr, timezone = 'Asia/Kolkata' }) {
  const targetDate = new Date(dateStr);
  if (Number.isNaN(targetDate.getTime())) {
    throw new Error('Invalid date provided for availability check');
  }

  const dayStart = new Date(targetDate);
  dayStart.setHours(9, 0, 0, 0);
  const dayEnd = new Date(targetDate);
  dayEnd.setHours(18, 0, 0, 0);

  // Check existing appointments in MongoDB first
  const existingAppointments = await Appointment.find({
    organizationId,
    status: { $in: ['scheduled', 'rescheduled'] },
    startTime: { $gte: dayStart, $lt: dayEnd },
    deletedAt: null,
  }).lean();

  const busyRanges = existingAppointments.map((a) => ({
    start: new Date(a.startTime).getTime(),
    end: new Date(a.endTime).getTime(),
  }));

  // Also check Google Calendar if connected
  const calendar = await getCalendarClientForOrg(organizationId).catch(() => null);
  if (calendar) {
    try {
      const fb = await calendar.freebusy.query({
        requestBody: {
          timeMin: dayStart.toISOString(),
          timeMax: dayEnd.toISOString(),
          timeZone: timezone,
          items: [{ id: 'primary' }],
        },
      });
      const gBusy = fb.data.calendars?.primary?.busy || [];
      for (const b of gBusy) {
        busyRanges.push({ start: new Date(b.start).getTime(), end: new Date(b.end).getTime() });
      }
    } catch (err) {
      console.warn('[GoogleCalendar] freebusy check failed:', err.message);
    }
  }

  // Generate 30-min candidate slots from 09:00 to 17:30
  const availableSlots = [];
  for (let hour = 9; hour < 17; hour++) {
    for (const min of [0, 30]) {
      const slotStart = new Date(dayStart);
      slotStart.setHours(hour, min, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

      const overlaps = busyRanges.some(
        (b) => slotStart.getTime() < b.end && slotEnd.getTime() > b.start
      );
      if (!overlaps && slotStart > new Date()) {
        availableSlots.push({
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
        });
      }
    }
  }

  return availableSlots.slice(0, 8);
}

export async function createCalendarEvent({
  organizationId,
  title,
  description,
  startTime,
  endTime,
  attendeeEmail,
  timezone = 'Asia/Kolkata',
}) {
  const calendar = await getCalendarClientForOrg(organizationId).catch(() => null);
  if (!calendar) {
    // Internal calendar confirmation when Google Calendar OAuth is not yet linked
    return {
      providerConfirmed: true,
      googleCalendarEventId: '',
      meetingLink: `https://meet.salespilot.ai/${Date.now().toString(36)}`,
      externalSynced: false,
    };
  }

  const eventRes = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    requestBody: {
      summary: title,
      description,
      start: { dateTime: new Date(startTime).toISOString(), timeZone: timezone },
      end: { dateTime: new Date(endTime).toISOString(), timeZone: timezone },
      attendees: attendeeEmail ? [{ email: attendeeEmail }] : [],
      conferenceData: {
        createRequest: { requestId: `sp-${Date.now()}` },
      },
    },
  });

  return {
    providerConfirmed: true,
    googleCalendarEventId: eventRes.data.id || '',
    meetingLink: eventRes.data.hangoutLink || eventRes.data.htmlLink || '',
    externalSynced: true,
  };
}

export async function updateCalendarEvent({ organizationId, eventId, startTime, endTime, timezone = 'Asia/Kolkata' }) {
  if (!eventId) return { updated: true, externalSynced: false };
  const calendar = await getCalendarClientForOrg(organizationId).catch(() => null);
  if (!calendar) return { updated: true, externalSynced: false };

  await calendar.events.patch({
    calendarId: 'primary',
    eventId,
    requestBody: {
      start: { dateTime: new Date(startTime).toISOString(), timeZone: timezone },
      end: { dateTime: new Date(endTime).toISOString(), timeZone: timezone },
    },
  });
  return { updated: true, externalSynced: true };
}

export async function deleteCalendarEvent({ organizationId, eventId }) {
  if (!eventId) return { deleted: true, externalSynced: false };
  const calendar = await getCalendarClientForOrg(organizationId).catch(() => null);
  if (!calendar) return { deleted: true, externalSynced: false };

  await calendar.events.delete({ calendarId: 'primary', eventId });
  return { deleted: true, externalSynced: true };
}
