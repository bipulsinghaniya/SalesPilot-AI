import mongoose from 'mongoose';

export const PIPELINE_STAGES = [
  'new',
  'contacted',
  'qualified',
  'demo_scheduled',
  'negotiation',
  'converted',
  'lost',
];

const noteSchema = new mongoose.Schema(
  {
    content: { type: String, required: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    authorName: { type: String, default: 'AI Agent' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const leadSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 140 },
    email: { type: String, lowercase: true, trim: true, index: true },
    phone: { type: String, trim: true, index: true },
    company: { type: String, trim: true, default: '' },
    jobTitle: { type: String, trim: true, default: '' },
    source: {
      type: String,
      enum: ['voice_inbound', 'voice_outbound', 'text_chat', 'manual', 'web_widget', 'import'],
      default: 'text_chat',
    },
    pipelineStage: {
      type: String,
      enum: PIPELINE_STAGES,
      default: 'new',
      index: true,
    },
    leadScore: { type: Number, default: 0, min: 0, max: 100, index: true },
    leadStatus: {
      type: String,
      enum: ['hot', 'warm', 'cold'],
      default: 'cold',
      index: true,
    },
    qualificationFactors: {
      interest: { type: String, enum: ['high', 'medium', 'low', 'unknown'], default: 'unknown' },
      budgetFit: { type: String, enum: ['suitable', 'tight', 'unsuitable', 'unknown'], default: 'unknown' },
      budgetAmount: { type: Number, default: null },
      purchaseTimeline: {
        type: String,
        enum: ['immediate', 'within_30_days', 'within_90_days', 'later', 'unknown'],
        default: 'unknown',
      },
      decisionAuthority: { type: String, enum: ['decision_maker', 'influencer', 'researcher', 'unknown'], default: 'unknown' },
      requirements: { type: [String], default: [] },
      evidence: { type: [String], default: [] },
      recommendedAction: { type: String, default: 'continue_discovery' },
      lastEvaluatedAt: { type: Date },
    },
    sentiment: {
      overall: {
        type: String,
        enum: ['positive', 'neutral', 'negative', 'frustrated', 'unknown'],
        default: 'unknown',
      },
      buyingIntent: { type: String, enum: ['high', 'medium', 'low', 'none'], default: 'none' },
      concerns: { type: [String], default: [] },
      buyingSignals: { type: [String], default: [] },
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    notes: { type: [noteSchema], default: [] },
    nextFollowUpAt: { type: Date, default: null, index: true },
    optOut: {
      doNotCall: { type: Boolean, default: false },
      doNotEmail: { type: Boolean, default: false },
      optedOutAt: { type: Date },
    },
    estimatedValue: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

leadSchema.index({ organizationId: 1, pipelineStage: 1, deletedAt: 1 });
leadSchema.index({ organizationId: 1, leadStatus: 1, leadScore: -1 });
leadSchema.index({ name: 'text', email: 'text', company: 'text' });

export const Lead = mongoose.model('Lead', leadSchema);
