import mongoose from 'mongoose';

const knowledgeDocumentSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['product', 'pricing', 'faq', 'policy', 'sales_guide', 'general'],
      default: 'general',
      index: true,
    },
    fileName: { type: String, required: true },
    fileType: { type: String, enum: ['pdf', 'docx', 'txt'], required: true },
    fileSizeBytes: { type: Number, required: true },
    fileHash: { type: String, required: true, index: true },
    storageUrl: { type: String, default: '' },
    rawText: { type: String, select: false },
    chunkCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'processing', 'indexed', 'failed'],
      default: 'pending',
      index: true,
    },
    errorMessage: { type: String, default: '' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    indexedAt: { type: Date },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

knowledgeDocumentSchema.index({ organizationId: 1, fileHash: 1, deletedAt: 1 });

export const KnowledgeDocument = mongoose.model('KnowledgeDocument', knowledgeDocumentSchema);
