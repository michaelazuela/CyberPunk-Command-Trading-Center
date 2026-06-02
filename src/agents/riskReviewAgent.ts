import type { AnalysisResult } from '../types';
import { buildAppTradePlan, type AppPlanContext } from '../lib/planEngine';
import type { NormalizedTradePlan } from '../lib/tradePlan';
import type { MemoryAdvisory } from './memoryAgent';
import { riskReviewAuthorityNote } from './deskAgentBoundaries';

export interface RiskReviewResult {
  plan: NormalizedTradePlan;
  memoryAdvisory?: MemoryAdvisory | null;
  ruleReviewRecommendation: string | null;
  authorityNote: string;
}

export function reviewRiskWithAppAuthority(
  analysis: AnalysisResult | null | undefined,
  context: AppPlanContext,
  memoryAdvisory?: MemoryAdvisory | null,
): RiskReviewResult {
  const plan = buildAppTradePlan(analysis, context);
  const ruleReviewRecommendation = memoryAdvisory?.ruleReviewRecommendation || null;

  return {
    plan,
    memoryAdvisory,
    ruleReviewRecommendation,
    authorityNote: riskReviewAuthorityNote(context.sessionType),
  };
}
