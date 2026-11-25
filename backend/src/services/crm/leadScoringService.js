const FACTOR_SCORES = {
  interest: { high: 1.0, medium: 0.6, low: 0.2, unknown: 0.1 },
  budgetFit: { suitable: 1.0, tight: 0.55, unsuitable: 0.1, unknown: 0.15 },
  purchaseTimeline: {
    immediate: 1.0,
    within_30_days: 0.85,
    within_90_days: 0.55,
    later: 0.25,
    unknown: 0.1,
  },
  decisionAuthority: {
    decision_maker: 1.0,
    influencer: 0.65,
    researcher: 0.3,
    unknown: 0.15,
  },
};

export function calculateDeterministicLeadScore(factors = {}, agentWeights = {}, messageCount = 1) {
  const weights = {
    interest: agentWeights.interest ?? 25,
    budgetFit: agentWeights.budgetFit ?? 25,
    timeline: agentWeights.timeline ?? 20,
    authority: agentWeights.authority ?? 15,
    engagement: agentWeights.engagement ?? 15,
  };

  const totalWeight =
    weights.interest + weights.budgetFit + weights.timeline + weights.authority + weights.engagement || 100;

  const interestRatio = FACTOR_SCORES.interest[factors.interest] ?? 0.1;
  const budgetRatio = FACTOR_SCORES.budgetFit[factors.budgetFit] ?? 0.15;
  const timelineRatio = FACTOR_SCORES.purchaseTimeline[factors.purchaseTimeline] ?? 0.1;
  const authorityRatio = FACTOR_SCORES.decisionAuthority[factors.decisionAuthority] ?? 0.15;
  const engagementRatio = Math.min(1.0, Math.max(0.2, messageCount / 8));

  const rawScore =
    ((interestRatio * weights.interest +
      budgetRatio * weights.budgetFit +
      timelineRatio * weights.timeline +
      authorityRatio * weights.authority +
      engagementRatio * weights.engagement) /
      totalWeight) *
    100;

  const leadScore = Math.round(Math.min(100, Math.max(0, rawScore)));
  let leadStatus = 'cold';
  if (leadScore >= 80) leadStatus = 'hot';
  else if (leadScore >= 50) leadStatus = 'warm';

  let recommendedAction = 'continue_discovery';
  if (leadScore >= 80) recommendedAction = 'schedule_demo';
  else if (leadScore >= 50) recommendedAction = 'send_pricing_and_followup';
  else if (factors.budgetFit === 'unsuitable') recommendedAction = 'nurture_sequence';

  return {
    leadScore,
    leadStatus,
    recommendedAction,
    breakdown: {
      interest: Math.round(interestRatio * weights.interest),
      budgetFit: Math.round(budgetRatio * weights.budgetFit),
      timeline: Math.round(timelineRatio * weights.timeline),
      authority: Math.round(authorityRatio * weights.authority),
      engagement: Math.round(engagementRatio * weights.engagement),
    },
  };
}
