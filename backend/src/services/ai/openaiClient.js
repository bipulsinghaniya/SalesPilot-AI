import OpenAI from 'openai';
import { env } from '../../config/env.js';

let client = null;

export function getOpenAIClient(apiKeyOverride = null) {
  const apiKey = apiKeyOverride || env.openaiApiKey;
  if (!apiKey) return null;
  if (!apiKeyOverride && client) return client;
  const instance = new OpenAI({ apiKey });
  if (!apiKeyOverride) client = instance;
  return instance;
}

export async function createEmbedding(text, apiKeyOverride = null) {
  const openai = getOpenAIClient(apiKeyOverride);
  if (!openai) {
    // Deterministic 1536-dim fallback vector for offline/dev testing when OPENAI_API_KEY is unset
    const vec = new Array(1536).fill(0);
    for (let i = 0; i < text.length; i++) {
      vec[i % 1536] += (text.charCodeAt(i) % 31) / 31;
    }
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return vec.map((v) => v / norm);
  }

  const res = await openai.embeddings.create({
    model: env.openaiEmbeddingModel,
    input: text.slice(0, 8000),
  });
  return res.data[0].embedding;
}
