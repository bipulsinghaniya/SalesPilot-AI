import mongoose from 'mongoose';

const agentSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    personality: {
      type: String,
      enum: ['professional', 'friendly', 'consultative', 'persuasive', 'informative'],
      default: 'consultative',
    },
    companyName: { type: String, required: true, trim: true },
    productDescription: { type: String, default: '' },
    salesObjectives: { type: String, default: 'Qualify prospects, answer questions accurately, and book product demos.' },
    preferredLanguage: {
      type: String,
      enum: ['en', 'hi', 'hinglish'],
      default: 'en',
    },
    voiceConfig: {
      provider: { type: String, enum: ['elevenlabs'], default: 'elevenlabs' },
      voiceId: { type: String, default: '21m00Tcm4TlvDq8ikWAM' },
      voiceName: { type: String, default: 'Rachel' },
      speakingSpeed: { type: Number, default: 1.0, min: 0.7, max: 1.3 },
      stability: { type: Number, default: 0.5, min: 0, max: 1 },
      style: { type: String, default: 'conversational' },
    },
    welcomeMessage: {
      type: String,
      default: 'Hello! Thank you for reaching out. How can I help you learn more about our solutions today?',
    },
    salesInstructions: { type: String, default: '' },
    qualificationCriteria: {
      minBudgetThreshold: { type: Number, default: 0 },
      targetTimelineDays: { type: Number, default: 30 },
      weights: {
        interest: { type: Number, default: 25 },
        budgetFit: { type: Number, default: 25 },
        timeline: { type: Number, default: 20 },
        authority: { type: Number, default: 15 },
        engagement: { type: Number, default: 15 },
      },
    },
    operatingHours: {
      timezone: { type: String, default: 'Asia/Kolkata' },
      startHour: { type: Number, default: 9 },
      endHour: { type: Number, default: 20 },
      alwaysAvailableForText: { type: Boolean, default: true },
    },
    callDurationLimitSec: { type: Number, default: 900, min: 60, max: 3600 },
    escalationRules: {
      escalateOnFrustration: { type: Boolean, default: true },
      escalateOnHumanRequest: { type: Boolean, default: true },
      escalateEmail: { type: String, default: '' },
    },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

agentSchema.index({ organizationId: 1, isActive: 1, deletedAt: 1 });

export const Agent = mongoose.model('Agent', agentSchema);
