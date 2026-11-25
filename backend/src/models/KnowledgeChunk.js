import mongoose from 'mongoose';

const knowledgeChunkSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KnowledgeDocument',
      required: true,
      index: true,
    },
    documentTitle: { type: String, required: true },
    category: { type: String, default: 'general', index: true },
    chunkIndex: { type: Number, required: true },
    content: { type: String, required: true },
    tokenEstimate: { type: Number, default: 0 },
    embedding: { type: [Number], required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

knowledgeChunkSchema.index({ organizationId: 1, documentId: 1, chunkIndex: 1 });

export const KnowledgeChunk = mongoose.model('KnowledgeChunk', knowledgeChunkSchema);
