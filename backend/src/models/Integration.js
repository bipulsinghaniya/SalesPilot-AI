import mongoose from 'mongoose';

const integrationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ['openai', 'deepgram', 'elevenlabs', 'twilio', 'exotel', 'google_calendar', 'email', 'cloudinary'],
      required: true,
    },
    status: {
      type: String,
      enum: ['connected', 'disconnected', 'error'],
      default: 'disconnected',
    },
    encryptedCredentials: { type: String, default: '', select: false },
    maskedPreview: { type: String, default: '' },
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastVerifiedAt: { type: Date, default: null },
    errorMessage: { type: String, default: '' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

integrationSchema.index({ organizationId: 1, provider: 1 }, { unique: true });

export const Integration = mongoose.model('Integration', integrationSchema);
