import { Worker } from 'bullmq';
import { connectDB, disconnectDB } from '../config/db.js';
import { getRedisConnection, closeRedis } from '../config/redis.js';
import { QUEUE_NAMES } from './queueRegistry.js';
import {
  processCallSummary,
  processDocumentIndexing,
  processEmailJob,
  processAnalyticsSnapshot,
} from './processors/jobProcessors.js';

const workers = [];

async function startWorkers() {
  await connectDB();
  const connection = getRedisConnection();

  const register = (queueName, handler, concurrency = 5) => {
    const worker = new Worker(queueName, async (job) => handler(job.data), {
      connection,
      concurrency,
    });
    worker.on('failed', (job, err) => {
      console.error(`[Worker:${queueName}] Job ${job?.id} failed:`, err.message);
    });
    workers.push(worker);
  };

  register(QUEUE_NAMES.CALL_PROCESSING, processCallSummary, 4);
  register(QUEUE_NAMES.AI_SUMMARIZATION, processCallSummary, 4);
  register(QUEUE_NAMES.DOCUMENT_PROCESSING, processDocumentIndexing, 2);
  register(QUEUE_NAMES.EMBEDDING_GENERATION, processDocumentIndexing, 2);
  register(QUEUE_NAMES.EMAIL_NOTIFICATIONS, processEmailJob, 5);
  register(QUEUE_NAMES.ANALYTICS_AGGREGATION, processAnalyticsSnapshot, 2);

  console.log(`[BullMQ] ${workers.length} background workers started`);
}

async function shutdown() {
  console.log('[BullMQ] Shutting down workers gracefully...');
  await Promise.all(workers.map((w) => w.close()));
  await closeRedis();
  await disconnectDB();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startWorkers().catch((err) => {
  console.error('[BullMQ] Fatal worker error:', err);
  process.exit(1);
});
