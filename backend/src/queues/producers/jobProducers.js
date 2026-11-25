import { getQueue, QUEUE_NAMES } from '../queueRegistry.js';
import {
  processCallSummary,
  processDocumentIndexing,
  processAnalyticsSnapshot,
} from '../processors/jobProcessors.js';

export async function enqueueCallPostProcessing({ callId, organizationId }) {
  const queue = await getQueue(QUEUE_NAMES.CALL_PROCESSING);
  if (queue) {
    await queue.add(
      'post-process-call',
      { callId, organizationId },
      { jobId: `call-post-${callId}` }
    );
    return { queued: true };
  }
  // Graceful inline fallback when Redis is unavailable in local dev
  setImmediate(() => {
    processCallSummary({ callId, organizationId }).catch((e) =>
      console.warn('[FallbackCallProcessor]', e.message)
    );
  });
  return { queued: false, fallback: true };
}

export async function enqueueDocumentIndexing({ documentId, organizationId }) {
  const queue = await getQueue(QUEUE_NAMES.DOCUMENT_PROCESSING);
  if (queue) {
    await queue.add(
      'index-document',
      { documentId, organizationId },
      { jobId: `doc-index-${documentId}-${Date.now()}` }
    );
    return { queued: true };
  }
  setImmediate(() => {
    processDocumentIndexing({ documentId }).catch((e) =>
      console.warn('[FallbackDocProcessor]', e.message)
    );
  });
  return { queued: false, fallback: true };
}

export async function enqueueEmailNotification(payload) {
  const queue = await getQueue(QUEUE_NAMES.EMAIL_NOTIFICATIONS);
  if (queue) {
    await queue.add('send-email', payload);
    return { queued: true };
  }
  return { queued: false };
}

export async function enqueueAnalyticsAggregation({ organizationId, dateKey }) {
  const queue = await getQueue(QUEUE_NAMES.ANALYTICS_AGGREGATION);
  if (queue) {
    await queue.add(
      'aggregate-daily',
      { organizationId, dateKey },
      { jobId: `analytics-${organizationId}-${dateKey}` }
    );
    return { queued: true };
  }
  await processAnalyticsSnapshot({ organizationId, dateKey }).catch(() => {});
  return { queued: false, fallback: true };
}
