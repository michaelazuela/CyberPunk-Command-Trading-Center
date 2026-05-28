import type { AnalysisResult } from '../types';
import { buildAppTradePlan, type AppPlanContext } from '../lib/planEngine';
import type { NormalizedTradePlan } from '../lib/tradePlan';
import type { MemoryAdvisory } from './memoryAgent';

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
    authorityNote: [
      `App-owned trade decision authority: ${context.sessionType}`,
      'Risk review may surface warnings and rule-review notes only.',
      'Executable entry, stop, T1, T2, risk, invalidation, and approval remain owned by tradeDecisionPipeline, setupScanner, conditionalPlanBuilder, and tradeRules.',
    ].join(' '),
  };
}
