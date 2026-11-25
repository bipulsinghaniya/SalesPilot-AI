import mongoose from 'mongoose';

const transcriptEntrySchema = new mongoose.Schema(
  {
    speaker: { type: String, enum: ['customer', 'agent', 'system'], required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    sentiment: { type: String, default: 'neutral' },
  },
  { _id: false }
);

const callSchema = new mongoose.Schema(
  {
    callSid: { type: String, unique: true, sparse: true, index: true },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null, index: true },
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', default: null },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true, index: true },
    provider: { type: String, enum: ['browser_mic', 'twilio', 'exotel'], default: 'browser_mic' },
    direction: { type: String, enum: ['inbound', 'outbound'], default: 'inbound' },
    customerPhone: { type: String, default: '' },
    startTime: { type: Date, default: Date.now, index: true },
    endTime: { type: Date, default: null },
    durationSec: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['ringing', 'in_progress', 'completed', 'failed', 'no_answer', 'busy', 'canceled'],
      default: 'in_progress',
      index: true,
    },
    consentObtained: { type: Boolean, default: true },
    aiDisclosed: { type: Boolean, default: true },
    transcript: { type: [transcriptEntrySchema], default: [] },
    recordingUrl: { type: String, default: '' },
    summary: { type: String, default: '' },
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative', 'frustrated', 'unknown'],
      default: 'unknown',
    },
    leadScore: { type: Number, default: 0, min: 0, max: 100 },
    followUpRecommendation: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

callSchema.index({ organizationId: 1, startTime: -1 });
callSchema.index({ 'transcript.text': 'text', summary: 'text' });

export const Call = mongoose.model('Call', callSchema);
