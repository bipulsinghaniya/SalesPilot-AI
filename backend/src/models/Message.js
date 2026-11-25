import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant', 'system', 'tool'],
      required: true,
    },
    mode: {
      type: String,
      enum: ['text', 'voice'],
      default: 'text',
    },
    content: { type: String, required: true },
    toolCalls: { type: [mongoose.Schema.Types.Mixed], default: [] },
    sources: [
      {
        documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeDocument' },
        title: String,
        score: Number,
      },
    ],
    sentiment: { type: String, default: 'neutral' },
    latencyMs: { type: Number, default: 0 },
  },
  { timestamps: true }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

export const Message = mongoose.model('Message', messageSchema);
