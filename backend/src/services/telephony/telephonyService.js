import twilio from 'twilio';
import { env } from '../../config/env.js';

export function isWithinCallingHours(organization) {
  if (!organization?.callingHours?.enabled) return true;
  const tz = organization.timezone || 'Asia/Kolkata';
  const now = new Date();
  const localParts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    hour12: false,
    weekday: 'short',
  }).formatToParts(now);

  const hourPart = localParts.find((p) => p.type === 'hour');
  const currentHour = Number(hourPart?.value ?? now.getHours());
  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dayPart = localParts.find((p) => p.type === 'weekday');
  const currentDay = dayMap[dayPart?.value] ?? now.getDay();

  const { startHour = 9, endHour = 20, allowedDays = [1, 2, 3, 4, 5, 6] } = organization.callingHours;
  return allowedDays.includes(currentDay) && currentHour >= startHour && currentHour < endHour;
}

export function verifyTwilioSignature(req) {
  if (!env.twilioAuthToken || env.nodeEnv === 'development') return true;
  const signature = req.headers['x-twilio-signature'];
  const url = `${env.backendUrl}${req.originalUrl}`;
  return twilio.validateRequest(env.twilioAuthToken, signature, url, req.body);
}

export function buildTwilioStreamTwiml({ streamWsUrl, callId, organizationId, agentId, disclosureMessage }) {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  if (disclosureMessage) {
    twiml.say({ voice: 'Polly.Aditi' }, disclosureMessage);
  }

  const connect = twiml.connect();
  const stream = connect.stream({ url: streamWsUrl });
  stream.parameter({ name: 'callId', value: String(callId) });
  stream.parameter({ name: 'organizationId', value: String(organizationId) });
  stream.parameter({ name: 'agentId', value: String(agentId) });

  return twiml.toString();
}

export async function initiateTwilioOutboundCall({ to, callId, organizationId, agentId }) {
  if (!env.twilioAccountSid || !env.twilioAuthToken || !env.twilioPhoneNumber) {
    throw new Error('Twilio credentials are not configured');
  }
  const client = twilio(env.twilioAccountSid, env.twilioAuthToken);
  const webhookUrl = `${env.backendUrl}/api/telephony/twilio/voice?callId=${callId}&organizationId=${organizationId}&agentId=${agentId}`;
  const statusCallback = `${env.backendUrl}/api/telephony/twilio/status?callId=${callId}`;

  return client.calls.create({
    to,
    from: env.twilioPhoneNumber,
    url: webhookUrl,
    statusCallback,
    statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
  });
}

export async function initiateExotelOutboundCall({ to, callId }) {
  if (!env.exotelApiKey || !env.exotelApiToken || !env.exotelSubdomain || !env.exotelCallerId) {
    throw new Error('Exotel credentials are not configured');
  }

  const auth = Buffer.from(`${env.exotelApiKey}:${env.exotelApiToken}`).toString('base64');
  const url = `https://${env.exotelSubdomain}/v1/Accounts/${env.exotelApiKey}/Calls/connect.json`;
  const params = new URLSearchParams({
    From: to,
    CallerId: env.exotelCallerId,
    CustomField: String(callId),
    StatusCallback: `${env.backendUrl}/api/telephony/exotel/status`,
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Exotel call initiation failed: ${errText}`);
  }
  return res.json();
}
