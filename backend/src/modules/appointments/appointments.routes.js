import { Router } from 'express';
import { z } from 'zod';
import { Appointment, Lead } from '../../models/index.js';
import { requireAuth, requireOrg } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/AppError.js';
import {
  checkAvailability,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '../../services/calendar/googleCalendarService.js';
import { sendAppointmentConfirmationEmail } from '../../services/email/emailService.js';
import { emitToOrg } from '../../sockets/index.js';

const router = Router();

const bookSchema = z.object({
  leadId: z.string(),
  title: z.string().min(2),
  description: z.string().optional(),
  startTime: z.string(),
  durationMinutes: z.number().min(15).max(120).default(30),
  timezone: z.string().default('Asia/Kolkata'),
  attendeeName: z.string().min(1),
  attendeeEmail: z.string().email(),
});

router.get('/', requireAuth, requireOrg, asyncHandler(async (req, res) => {
  const filter = { organizationId: req.organization._id, deletedAt: null };
  if (req.query.status) filter.status = req.query.status;

  const appointments = await Appointment.find(filter)
    .populate('leadId', 'name email company phone leadScore')
    .sort({ startTime: 1 })
    .lean();

  res.json({ success: true, data: appointments });
}));

router.get('/availability', requireAuth, requireOrg, asyncHandler(async (req, res) => {
  const dateStr = req.query.date || new Date().toISOString().slice(0, 10);
  const timezone = req.query.timezone || req.organization.timezone || 'Asia/Kolkata';
  const slots = await checkAvailability({ organizationId: req.organization._id, dateStr, timezone });
  res.json({ success: true, data: slots });
}));

router.post('/', requireAuth, requireOrg, validate(bookSchema), asyncHandler(async (req, res) => {
  const start = new Date(req.body.startTime);
  if (Number.isNaN(start.getTime())) throw new AppError('Invalid startTime', 400, 'INVALID_DATE');
  const end = new Date(start.getTime() + req.body.durationMinutes * 60 * 1000);

  const conflict = await Appointment.findOne({
    organizationId: req.organization._id,
    status: { $in: ['scheduled', 'rescheduled'] },
    startTime: { $lt: end },
    endTime: { $gt: start },
    deletedAt: null,
  });
  if (conflict) {
    throw new AppError('Time slot is already booked', 409, 'SLOT_UNAVAILABLE');
  }

  const calRes = await createCalendarEvent({
    organizationId: req.organization._id,
    title: req.body.title,
    description: req.body.description || '',
    startTime: start,
    endTime: end,
    attendeeEmail: req.body.attendeeEmail,
    timezone: req.body.timezone,
  });

  const appointment = await Appointment.create({
    organizationId: req.organization._id,
    leadId: req.body.leadId,
    assignedUserId: req.user._id,
    title: req.body.title,
    description: req.body.description || '',
    startTime: start,
    endTime: end,
    timezone: req.body.timezone,
    attendeeName: req.body.attendeeName,
    attendeeEmail: req.body.attendeeEmail,
    meetingLink: calRes.meetingLink,
    googleCalendarEventId: calRes.googleCalendarEventId,
    providerConfirmed: calRes.providerConfirmed,
  });

  await Lead.findByIdAndUpdate(req.body.leadId, { pipelineStage: 'demo_scheduled' });
  await sendAppointmentConfirmationEmail({
    to: appointment.attendeeEmail,
    attendeeName: appointment.attendeeName,
    title: appointment.title,
    startTime: appointment.startTime,
    timezone: appointment.timezone,
    meetingLink: appointment.meetingLink,
    companyName: req.organization.name,
  }).catch(() => {});

  emitToOrg(req.organization._id, 'appointment:booked', { appointment });
  res.status(201).json({ success: true, data: appointment });
}));

router.patch('/:id/reschedule', requireAuth, requireOrg, asyncHandler(async (req, res) => {
  const { startTime, durationMinutes = 30 } = req.body;
  const appt = await Appointment.findOne({ _id: req.params.id, organizationId: req.organization._id, deletedAt: null });
  if (!appt) throw new AppError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');

  const start = new Date(startTime);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  await updateCalendarEvent({
    organizationId: req.organization._id,
    eventId: appt.googleCalendarEventId,
    startTime: start,
    endTime: end,
    timezone: appt.timezone,
  });

  appt.startTime = start;
  appt.endTime = end;
  appt.status = 'rescheduled';
  await appt.save();
  res.json({ success: true, data: appt });
}));

router.patch('/:id/cancel', requireAuth, requireOrg, asyncHandler(async (req, res) => {
  const appt = await Appointment.findOne({ _id: req.params.id, organizationId: req.organization._id, deletedAt: null });
  if (!appt) throw new AppError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');

  await deleteCalendarEvent({ organizationId: req.organization._id, eventId: appt.googleCalendarEventId });
  appt.status = 'canceled';
  appt.cancelReason = req.body.reason || '';
  await appt.save();
  res.json({ success: true, data: appt });
}));

export default router;
