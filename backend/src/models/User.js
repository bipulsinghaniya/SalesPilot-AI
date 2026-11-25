import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    userAgent: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, select: false },
    googleId: { type: String, sparse: true, index: true },
    avatarUrl: { type: String, default: '' },
    phone: { type: String, default: '' },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpiresAt: { type: Date, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
    refreshTokens: { type: [refreshTokenSchema], default: [], select: false },
    isSuperAdmin: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    notificationPreferences: {
      emailOnHotLead: { type: Boolean, default: true },
      emailOnAppointment: { type: Boolean, default: true },
      emailOnEscalation: { type: Boolean, default: true },
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ deletedAt: 1 });

export const User = mongoose.model('User', userSchema);
