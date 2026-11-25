import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    industry: { type: String, default: 'SaaS & Technology', trim: true },
    website: { type: String, default: '', trim: true },
    description: { type: String, default: '' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    defaultLanguage: { type: String, enum: ['en', 'hi', 'hinglish'], default: 'en' },
    callingHours: {
      enabled: { type: Boolean, default: true },
      startHour: { type: Number, default: 9, min: 0, max: 23 },
      endHour: { type: Number, default: 20, min: 0, max: 23 },
      allowedDays: { type: [Number], default: [1, 2, 3, 4, 5, 6] }, // 0=Sun..6=Sat
    },
    compliance: {
      requireCallConsent: { type: Boolean, default: true },
      discloseAiIdentity: { type: Boolean, default: true },
      transcriptRetentionDays: { type: Number, default: 90, min: 7, max: 3650 },
      recordingEnabled: { type: Boolean, default: false },
    },
    billing: {
      plan: { type: String, enum: ['starter', 'growth', 'enterprise'], default: 'starter' },
      status: { type: String, enum: ['trialing', 'active', 'past_due', 'canceled'], default: 'trialing' },
      monthlyCallMinutesLimit: { type: Number, default: 1000 },
      monthlyLeadsLimit: { type: Number, default: 500 },
    },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Organization = mongoose.model('Organization', organizationSchema);
