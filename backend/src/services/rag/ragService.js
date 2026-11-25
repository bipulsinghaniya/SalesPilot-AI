import crypto from 'crypto';
import mongoose from 'mongoose';
import mammoth from 'mammoth';
import { env } from '../../config/env.js';
import { KnowledgeDocument, KnowledgeChunk } from '../../models/index.js';
import { createEmbedding } from '../ai/openaiClient.js';

export async function extractTextFromBuffer(buffer, fileType) {
  if (fileType === 'txt') {
    return buffer.toString('utf8');
  }
  if (fileType === 'docx') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  }
  if (fileType === 'pdf') {
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);
    return data.text || '';
  }
  throw new Error(`Unsupported file type: ${fileType}`);
}

export function cleanText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export function chunkText(text, chunkSize = 900, overlap = 150) {
  const cleaned = cleanText(text);
  if (!cleaned) return [];

  const chunks = [];
  let start = 0;
  while (start < cleaned.length) {
    let end = Math.min(start + chunkSize, cleaned.length);
    if (end < cleaned.length) {
      const lastPeriod = cleaned.lastIndexOf('.', end);
      const lastNewline = cleaned.lastIndexOf('\n', end);
      const boundary = Math.max(lastPeriod, lastNewline);
      if (boundary > start + chunkSize * 0.5) {
        end = boundary + 1;
      }
    }
    const slice = cleaned.slice(start, end).trim();
    if (slice) chunks.push(slice);
    if (end >= cleaned.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

export function computeFileHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export async function indexKnowledgeDocument(documentId) {
  const doc = await KnowledgeDocument.findById(documentId).select('+rawText');
  if (!doc || doc.deletedAt) return null;

  doc.status = 'processing';
  doc.errorMessage = '';
  await doc.save();

  try {
    const chunks = chunkText(doc.rawText || '');
    await KnowledgeChunk.deleteMany({ documentId: doc._id, organizationId: doc.organizationId });

    const chunkDocs = [];
    for (let i = 0; i < chunks.length; i++) {
      const content = chunks[i];
      const embedding = await createEmbedding(content);
      chunkDocs.push({
        organizationId: doc.organizationId,
        documentId: doc._id,
        documentTitle: doc.title,
        category: doc.category,
        chunkIndex: i,
        content,
        tokenEstimate: Math.ceil(content.length / 4),
        embedding,
      });
    }

    if (chunkDocs.length > 0) {
      await KnowledgeChunk.insertMany(chunkDocs);
    }

    doc.chunkCount = chunkDocs.length;
    doc.status = 'indexed';
    doc.indexedAt = new Date();
    await doc.save();
    return doc;
  } catch (err) {
    doc.status = 'failed';
    doc.errorMessage = err.message;
    await doc.save();
    throw err;
  }
}

function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom ? dot / denom : 0;
}

export async function searchKnowledge({ organizationId, query, category = null, limit = 5 }) {
  const orgObjectId = new mongoose.Types.ObjectId(organizationId);
  const queryEmbedding = await createEmbedding(query);

  const filter = { organizationId: orgObjectId };
  if (category) filter.category = category;

  // Attempt MongoDB Atlas $vectorSearch first
  try {
    const pipeline = [
      {
        $vectorSearch: {
          index: env.vectorIndexName,
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: Math.max(limit * 10, 50),
          limit,
          filter,
        },
      },
      {
        $project: {
          _id: 1,
          documentId: 1,
          documentTitle: 1,
          category: 1,
          content: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ];
    const results = await KnowledgeChunk.aggregate(pipeline);
    if (results.length > 0) return results;
  } catch {
    // Fallback to in-process cosine similarity scoped strictly to organizationId
  }

  const candidateChunks = await KnowledgeChunk.find(filter)
    .select('documentId documentTitle category content embedding')
    .limit(300)
    .lean();

  const scored = candidateChunks
    .map((chunk) => ({
      _id: chunk._id,
      documentId: chunk.documentId,
      documentTitle: chunk.documentTitle,
      category: chunk.category,
      content: chunk.content,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}
