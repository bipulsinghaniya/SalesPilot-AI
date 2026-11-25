import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { KnowledgeDocument, KnowledgeChunk } from '../../models/index.js';
import { requireAuth, requireOrg, requireRole } from '../../middlewares/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/AppError.js';
import {
  extractTextFromBuffer,
  computeFileHash,
  searchKnowledge,
} from '../../services/rag/ragService.js';
import { enqueueDocumentIndexing } from '../../queues/producers/jobProducers.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.pdf', '.docx', '.txt'].includes(ext)) {
      return cb(new AppError('Only PDF, DOCX, and TXT files are allowed', 400, 'INVALID_FILE_TYPE'));
    }
    cb(null, true);
  },
});

router.get('/', requireAuth, requireOrg, asyncHandler(async (req, res) => {
  const docs = await KnowledgeDocument.find({
    organizationId: req.organization._id,
    deletedAt: null,
  })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, data: docs });
}));

router.post(
  '/upload',
  requireAuth,
  requireOrg,
  requireRole('org_owner', 'org_admin', 'sales_manager'),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError('File is required', 400, 'MISSING_FILE');
    }

    const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    const fileHash = computeFileHash(req.file.buffer);

    const duplicate = await KnowledgeDocument.findOne({
      organizationId: req.organization._id,
      fileHash,
      deletedAt: null,
    });
    if (duplicate) {
      throw new AppError('This document has already been uploaded to your knowledge base', 409, 'DUPLICATE_DOCUMENT');
    }

    const rawText = await extractTextFromBuffer(req.file.buffer, ext);
    if (!rawText.trim()) {
      throw new AppError('Could not extract readable text from the uploaded file', 400, 'EMPTY_DOCUMENT');
    }

    const doc = await KnowledgeDocument.create({
      organizationId: req.organization._id,
      title: req.body.title || req.file.originalname,
      category: req.body.category || 'general',
      fileName: req.file.originalname,
      fileType: ext,
      fileSizeBytes: req.file.size,
      fileHash,
      rawText,
      status: 'pending',
      uploadedBy: req.user._id,
    });

    await enqueueDocumentIndexing({ documentId: String(doc._id), organizationId: String(req.organization._id) });

    res.status(201).json({ success: true, data: doc });
  })
);

router.post(
  '/text',
  requireAuth,
  requireOrg,
  requireRole('org_owner', 'org_admin', 'sales_manager'),
  asyncHandler(async (req, res) => {
    const { title, category, content } = req.body;
    if (!title || !content) {
      throw new AppError('Title and content are required', 400, 'VALIDATION_ERROR');
    }
    const buffer = Buffer.from(content, 'utf8');
    const doc = await KnowledgeDocument.create({
      organizationId: req.organization._id,
      title,
      category: category || 'general',
      fileName: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`,
      fileType: 'txt',
      fileSizeBytes: buffer.length,
      fileHash: computeFileHash(buffer),
      rawText: content,
      status: 'pending',
      uploadedBy: req.user._id,
    });

    await enqueueDocumentIndexing({ documentId: String(doc._id), organizationId: String(req.organization._id) });
    res.status(201).json({ success: true, data: doc });
  })
);

router.post(
  '/:id/reindex',
  requireAuth,
  requireOrg,
  requireRole('org_owner', 'org_admin', 'sales_manager'),
  asyncHandler(async (req, res) => {
    const doc = await KnowledgeDocument.findOne({
      _id: req.params.id,
      organizationId: req.organization._id,
      deletedAt: null,
    });
    if (!doc) throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');

    doc.status = 'pending';
    await doc.save();
    await enqueueDocumentIndexing({ documentId: String(doc._id), organizationId: String(req.organization._id) });
    res.json({ success: true, data: doc });
  })
);

router.get('/search', requireAuth, requireOrg, asyncHandler(async (req, res) => {
  const { q, category } = req.query;
  if (!q) throw new AppError('Query parameter q is required', 400, 'MISSING_QUERY');
  const results = await searchKnowledge({
    organizationId: req.organization._id,
    query: String(q),
    category: category ? String(category) : null,
    limit: 6,
  });
  res.json({ success: true, data: results });
}));

router.delete(
  '/:id',
  requireAuth,
  requireOrg,
  requireRole('org_owner', 'org_admin'),
  asyncHandler(async (req, res) => {
    const doc = await KnowledgeDocument.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.organization._id, deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { new: true }
    );
    if (!doc) throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    await KnowledgeChunk.deleteMany({ documentId: doc._id, organizationId: req.organization._id });
    res.json({ success: true, data: { deleted: true } });
  })
);

export default router;
