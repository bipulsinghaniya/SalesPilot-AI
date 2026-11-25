import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', default: null },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', default: null },
    assignedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true },
    timezone: { type: String, default: 'Asia/Kolkata' },
    status: {
      type: String,
      enum: ['scheduled', 'rescheduled', 'completed', 'canceled', 'no_show'],
      default: 'scheduled',
      index: true,
    },
    attendeeName: { type: String, required: true },
    attendeeEmail: { type: String, required: true, lowercase: true, trim: true },
    meetingLink: { type: String, default: '' },
    googleCalendarEventId: { type: String, default: '', index: true },
    providerConfirmed: { type: Boolean, default: false },
    idempotencyKey: { type: String, unique: true, sparse: true },
    cancelReason: { type: String, default: '' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

appointmentSchema.index({ organizationId: 1, startTime: 1, status: 1 });

export const Appointment = mongoose.model('Appointment', appointmentSchema);
