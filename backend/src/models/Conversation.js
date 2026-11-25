import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
      required: true,
      index: true,
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
      index: true,
    },
    channel: {
      type: String,
      enum: ['text', 'voice', 'telephony', 'hybrid'],
      default: 'text',
    },
    activeMode: {
      type: String,
      enum: ['text', 'voice'],
      default: 'text',
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'escalated', 'closed'],
      default: 'active',
      index: true,
    },
    language: {
      type: String,
      enum: ['en', 'hi', 'hinglish'],
      default: 'en',
    },
    contextSummary: { type: String, default: '' },
    detectedIntent: { type: String, default: 'general_inquiry' },
    sentiment: {
      overall: { type: String, enum: ['positive', 'neutral', 'negative', 'frustrated'], default: 'neutral' },
      score: { type: Number, default: 0, min: -1, max: 1 },
      buyingIntent: { type: String, enum: ['high', 'medium', 'low', 'none'], default: 'none' },
      timeline: [
        {
          sentiment: String,
          buyingIntent: String,
          timestamp: { type: Date, default: Date.now },
        },
      ],
    },
    messageCount: { type: Number, default: 0 },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    escalatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    escalationReason: { type: String, default: '' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

conversationSchema.index({ organizationId: 1, lastMessageAt: -1 });

export const Conversation = mongoose.model('Conversation', conversationSchema);
