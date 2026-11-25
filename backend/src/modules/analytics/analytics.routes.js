import { Router } from 'express';
import { Lead, Call, Appointment, Conversation } from '../../models/index.js';
import { requireAuth, requireOrg } from '../../middlewares/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getOpenAIClient } from '../../services/ai/openaiClient.js';
import { env } from '../../config/env.js';

const router = Router();

router.get('/overview', requireAuth, requireOrg, asyncHandler(async (req, res) => {
  const orgId = req.organization._id;
  const days = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [
    totalLeads,
    hotLeads,
    warmLeads,
    coldLeads,
    convertedLeads,
    totalCalls,
    successfulCalls,
    appointmentsBooked,
    pendingFollowUps,
    callStats,
    sentimentAgg,
    sourceAgg,
    pipelineAgg,
    dailyCallsAgg,
    dailyLeadsAgg,
  ] = await Promise.all([
    Lead.countDocuments({ organizationId: orgId, deletedAt: null }),
    Lead.countDocuments({ organizationId: orgId, leadStatus: 'hot', deletedAt: null }),
    Lead.countDocuments({ organizationId: orgId, leadStatus: 'warm', deletedAt: null }),
    Lead.countDocuments({ organizationId: orgId, leadStatus: 'cold', deletedAt: null }),
    Lead.countDocuments({ organizationId: orgId, pipelineStage: 'converted', deletedAt: null }),
    Call.countDocuments({ organizationId: orgId, deletedAt: null }),
    Call.countDocuments({ organizationId: orgId, status: 'completed', deletedAt: null }),
    Appointment.countDocuments({ organizationId: orgId, status: { $ne: 'canceled' }, deletedAt: null }),
    Lead.countDocuments({ organizationId: orgId, nextFollowUpAt: { $gte: new Date() }, deletedAt: null }),
    Call.aggregate([
      { $match: { organizationId: orgId, deletedAt: null, durationSec: { $gt: 0 } } },
      { $group: { _id: null, avgDuration: { $avg: '$durationSec' } } },
    ]),
    Conversation.aggregate([
      { $match: { organizationId: orgId, deletedAt: null } },
      { $group: { _id: '$sentiment.overall', count: { $sum: 1 } } },
    ]),
    Lead.aggregate([
      { $match: { organizationId: orgId, deletedAt: null } },
      { $group: { _id: '$source', count: { $sum: 1 } } },
    ]),
    Lead.aggregate([
      { $match: { organizationId: orgId, deletedAt: null } },
      { $group: { _id: '$pipelineStage', count: { $sum: 1 }, avgScore: { $avg: '$leadScore' } } },
    ]),
    Call.aggregate([
      { $match: { organizationId: orgId, startTime: { $gte: since }, deletedAt: null } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$startTime' } },
          calls: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Lead.aggregate([
      { $match: { organizationId: orgId, createdAt: { $gte: since }, deletedAt: null } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          leads: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const avgCallDurationSec = Math.round(callStats[0]?.avgDuration || 0);
  const conversionRate = totalLeads > 0 ? Number(((convertedLeads / totalLeads) * 100).toFixed(1)) : 0;

  // Merge daily trends
  const trendMap = new Map();
  for (const row of dailyCallsAgg) {
    trendMap.set(row._id, { date: row._id, calls: row.calls, leads: 0 });
  }
  for (const row of dailyLeadsAgg) {
    const existing = trendMap.get(row._id) || { date: row._id, calls: 0, leads: 0 };
    existing.leads = row.leads;
    trendMap.set(row._id, existing);
  }
  const trends = [...trendMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  res.json({
    success: true,
    data: {
      historicalMetrics: {
        totalLeads,
        hotLeads,
        warmLeads,
        coldLeads,
        convertedLeads,
        conversionRate,
        totalCalls,
        successfulCalls,
        avgCallDurationSec,
        appointmentsBooked,
        pendingFollowUps,
      },
      sentimentDistribution: sentimentAgg.map((s) => ({ name: s._id || 'neutral', value: s.count })),
      leadSourceDistribution: sourceAgg.map((s) => ({ name: s._id || 'unknown', value: s.count })),
      pipelinePerformance: pipelineAgg.map((p) => ({
        stage: p._id,
        count: p.count,
        avgScore: Math.round(p.avgScore || 0),
      })),
      trends,
    },
  });
}));

router.get('/insights', requireAuth, requireOrg, asyncHandler(async (req, res) => {
  const orgId = req.organization._id;
  const [topLeads, recentCalls] = await Promise.all([
    Lead.find({ organizationId: orgId, deletedAt: null })
      .sort({ leadScore: -1 })
      .limit(10)
      .select('name company leadScore leadStatus pipelineStage sentiment qualificationFactors')
      .lean(),
    Call.find({ organizationId: orgId, deletedAt: null })
      .sort({ startTime: -1 })
      .limit(10)
      .select('summary sentiment durationSec followUpRecommendation')
      .lean(),
  ]);

  const openai = getOpenAIClient();
  if (!openai) {
    return res.json({
      success: true,
      data: {
        isAiGeneratedPrediction: true,
        priorityLeads: topLeads.filter((l) => l.leadScore >= 70).slice(0, 3),
        insights: [
          {
            title: 'Prioritize High-Intent Prospects',
            detail: `You have ${topLeads.filter((l) => l.leadStatus === 'hot').length} hot leads ready for immediate demo scheduling.`,
          },
          {
            title: 'Address Common Pricing Objections Early',
            detail: 'Upload clear ROI comparison sheets to your Knowledge Base so AI agents can handle budget questions.',
          },
          {
            title: 'Follow-up Cadence',
            detail: 'Leads engaged via both Voice and Text convert faster when followed up within 24 hours.',
          },
        ],
      },
    });
  }

  const completion = await openai.chat.completions.create({
    model: env.openaiChatModel,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are a B2B sales intelligence analyst. Return JSON with key "insights" (array of 4 objects with "title" and "detail") covering top product interest, common objections, conversion drivers, and recommended actions.',
      },
      {
        role: 'user',
        content: JSON.stringify({ topLeads, recentCalls }),
      },
    ],
  });

  const parsed = JSON.parse(completion.choices[0]?.message?.content || '{"insights":[]}');
  res.json({
    success: true,
    data: {
      isAiGeneratedPrediction: true,
      priorityLeads: topLeads.slice(0, 3),
      insights: parsed.insights || [],
    },
  });
}));

export default router;
