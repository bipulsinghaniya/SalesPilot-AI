import { env } from '../../config/env.js';
import { Call, Lead, Appointment, AnalyticsSnapshot } from '../../models/index.js';
import { getOpenAIClient } from '../../services/ai/openaiClient.js';
import { indexKnowledgeDocument } from '../../services/rag/ragService.js';
import { sendEmail } from '../../services/email/emailService.js';

export async function processCallSummary({ callId, organizationId }) {
  const call = await Call.findOne({ _id: callId, organizationId });
  if (!call) return { skipped: true };

  const transcriptText = (call.transcript || [])
    .map((t) => `${t.speaker.toUpperCase()}: ${t.text}`)
    .join('\n');

  if (!transcriptText) {
    call.summary = 'No speech transcript captured during this call.';
    call.sentiment = 'neutral';
    await call.save();
    return { updated: true };
  }

  const openai = getOpenAIClient();
  if (!openai) {
    call.summary = `Call lasted ${call.durationSec}s with ${call.transcript.length} turns. Follow up with the prospect to confirm next steps.`;
    call.sentiment = 'neutral';
    call.followUpRecommendation = 'Send follow-up email with product brochure.';
    await call.save();
    return { updated: true, mocked: true };
  }

  const completion = await openai.chat.completions.create({
    model: env.openaiChatModel,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Analyze this sales call transcript and return JSON with keys: summary (2-3 concise sentences), sentiment (positive|neutral|negative|frustrated), followUpRecommendation (1 actionable sentence).',
      },
      { role: 'user', content: transcriptText.slice(0, 12000) },
    ],
  });

  const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
  call.summary = parsed.summary || call.summary;
  call.sentiment = ['positive', 'neutral', 'negative', 'frustrated'].includes(parsed.sentiment)
    ? parsed.sentiment
    : 'neutral';
  call.followUpRecommendation = parsed.followUpRecommendation || '';
  await call.save();

  return { updated: true };
}

export async function processDocumentIndexing({ documentId }) {
  return indexKnowledgeDocument(documentId);
}

export async function processEmailJob({ to, subject, html }) {
  return sendEmail({ to, subject, html });
}

export async function processAnalyticsSnapshot({ organizationId, dateKey }) {
  const day = dateKey || new Date().toISOString().slice(0, 10);
  const [totalLeads, hotLeads, warmLeads, coldLeads, totalCalls, successfulCalls, appointmentsBooked, conversions] =
    await Promise.all([
      Lead.countDocuments({ organizationId, deletedAt: null }),
      Lead.countDocuments({ organizationId, leadStatus: 'hot', deletedAt: null }),
      Lead.countDocuments({ organizationId, leadStatus: 'warm', deletedAt: null }),
      Lead.countDocuments({ organizationId, leadStatus: 'cold', deletedAt: null }),
      Call.countDocuments({ organizationId, deletedAt: null }),
      Call.countDocuments({ organizationId, status: 'completed', deletedAt: null }),
      Appointment.countDocuments({ organizationId, status: { $ne: 'canceled' }, deletedAt: null }),
      Lead.countDocuments({ organizationId, pipelineStage: 'converted', deletedAt: null }),
    ]);

  await AnalyticsSnapshot.findOneAndUpdate(
    { organizationId, dateKey: day },
    {
      $set: {
        metrics: {
          totalLeads,
          hotLeads,
          warmLeads,
          coldLeads,
          totalCalls,
          successfulCalls,
          appointmentsBooked,
          conversions,
        },
      },
    },
    { upsert: true }
  );

  return { aggregated: true, dateKey: day };
}
