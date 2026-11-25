import mongoose from 'mongoose';

const analyticsSnapshotSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    dateKey: { type: String, required: true }, // YYYY-MM-DD
    metrics: {
      totalLeads: { type: Number, default: 0 },
      hotLeads: { type: Number, default: 0 },
      warmLeads: { type: Number, default: 0 },
      coldLeads: { type: Number, default: 0 },
      totalCalls: { type: Number, default: 0 },
      successfulCalls: { type: Number, default: 0 },
      avgCallDurationSec: { type: Number, default: 0 },
      appointmentsBooked: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 },
      sentimentCounts: {
        positive: { type: Number, default: 0 },
        neutral: { type: Number, default: 0 },
        negative: { type: Number, default: 0 },
        frustrated: { type: Number, default: 0 },
      },
    },
  },
  { timestamps: true }
);

analyticsSnapshotSchema.index({ organizationId: 1, dateKey: 1 }, { unique: true });

export const AnalyticsSnapshot = mongoose.model('AnalyticsSnapshot', analyticsSnapshotSchema);
