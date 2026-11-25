import { Queue } from 'bullmq';
import { getRedisConnection, isRedisReady } from '../config/redis.js';

export const QUEUE_NAMES = {
  CALL_PROCESSING: 'call-processing',
  AI_SUMMARIZATION: 'ai-summarization',
  SENTIMENT_ANALYSIS: 'sentiment-analysis',
  LEAD_SCORING: 'lead-scoring',
  EMAIL_NOTIFICATIONS: 'email-notifications',
  SCHEDULED_FOLLOWUPS: 'scheduled-followups',
  ANALYTICS_AGGREGATION: 'analytics-aggregation',
  DOCUMENT_PROCESSING: 'document-processing',
  EMBEDDING_GENERATION: 'embedding-generation',
};

const queues = new Map();

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: 200,
  removeOnFail: 500,
};

export async function getQueue(name) {
  const ready = await isRedisReady();
  if (!ready) return null;

  if (!queues.has(name)) {
    const connection = getRedisConnection();
    queues.set(name, new Queue(name, { connection, defaultJobOptions }));
  }
  return queues.get(name);
}

export async function closeAllQueues() {
  await Promise.all([...queues.values()].map((q) => q.close().catch(() => {})));
  queues.clear();
}
