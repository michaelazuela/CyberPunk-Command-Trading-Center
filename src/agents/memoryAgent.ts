import type { AgentLearningSummary, RAGQuery, SimilarSetup } from '../types';

export type HistoricalSupport = 'SUPPORTS' | 'CONFLICTS' | 'NEUTRAL' | 'INSUFFICIENT_DATA';
export type MemoryConfidenceAdjustment = 'increase' | 'decrease' | 'neutral';

export interface MemoryAdvisory {
  historicalSupport: HistoricalSupport;
  confidenceAdjustment: MemoryConfidenceAdjustment;
  memoryWarning: string | null;
  ruleReviewRecommendation: string | null;
  similarSetupCount: number;
  completedSetupCount: number;
  summary?: AgentLearningSummary | null;
}

export const EMPTY_MEMORY_ADVISORY: MemoryAdvisory = {
  historicalSupport: 'INSUFFICIENT_DATA',
  confidenceAdjustment: 'neutral',
  memoryWarning: null,
  ruleReviewRecommendation: null,
  similarSetupCount: 0,
  completedSetupCount: 0,
  summary: null,
};

function buildMemorySummary(similarSetups: SimilarSetup[]): AgentLearningSummary {
  const completedOutcomes = similarSetups.filter(setup => ['win', 'loss', 'scratch'].includes(setup.tradeResult?.toLowerCase() || ''));
  const winCount = completedOutcomes.filter(setup => setup.tradeResult?.toLowerCase() === 'win').length;
  const lossCount = completedOutcomes.filter(setup => setup.tradeResult?.toLowerCase() === 'loss').length;
  const scratchCount = completedOutcomes.filter(setup => setup.tradeResult?.toLowerCase() === 'scratch').length;
  const pnlTicks = completedOutcomes
    .map(setup => setup.pnlTicks)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const pnlDollars = completedOutcomes
    .map(setup => setup.pnlDollars)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const completedCount = completedOutcomes.length;
  const winRate = completedCount > 0 ? winCount / completedCount : null;
  const avgPnlTicks = pnlTicks.length ? pnlTicks.reduce((sum, value) => sum + value, 0) / pnlTicks.length : null;
  const avgPnlDollars = pnlDollars.length ? pnlDollars.reduce((sum, value) => sum + value, 0) / pnlDollars.length : null;

  let confidenceAdjustment: MemoryConfidenceAdjustment = 'neutral';
  let strongestLesson = 'Not enough completed similar setups yet. Continue logging outcomes.';
  if (completedCount >= 3 && winRate !== null && winRate >= 0.7) {
    confidenceAdjustment = 'increase';
    strongestLesson = `Historically, similar setups have performed well (${Math.round(winRate * 100)}% win rate). Watch for confirmation.`;
  } else if (completedCount >= 3 && winRate !== null && winRate <= 0.4) {
    confidenceAdjustment = 'decrease';
    strongestLesson = `Warning: Similar setups have significantly underperformed (${Math.round(winRate * 100)}% win rate). Proceed with caution.`;
  } else if (completedCount >= 3) {
    strongestLesson = 'Similar setups have mixed results historically. Follow standard entry rules.';
  }

  const riskWarning = avgPnlTicks !== null && avgPnlTicks < 0
    ? `Historically negative expectancy observed on similar setups (avg ${avgPnlTicks.toFixed(1)} ticks). Do not modify stop rules automatically. Treat this as a caution flag and require stronger confirmation or mark for rule review.`
    : undefined;

  return {
    setupCount: similarSetups.length,
    completedCount,
    winCount,
    lossCount,
    scratchCount,
    pendingCount: similarSetups.length - completedCount,
    winRate,
    avgPnlTicks,
    avgPnlDollars,
    bestMatch: similarSetups[0],
    strongestLesson,
    riskWarning,
    confidenceAdjustment,
    confidenceAdjustmentReason: `Win rate is ${winRate !== null ? Math.round(winRate * 100) + '%' : 'unknown'} with ${completedCount} completed setups.`,
    midnightSetupCount: 0,
    midnightCompletedCount: 0,
    midnightWinRate: null,
    midnightAvgPnlTicks: null,
    midnightAvgPnlDollars: null,
    midnightBestMatch: undefined,
    midnightPatternLearned: 'Not enough Midnight Open history yet.',
    midnightRiskWarning: undefined,
  };
}

export function advisoryFromSimilarSetups(similarSetups: SimilarSetup[]): MemoryAdvisory {
  if (!similarSetups.length) return EMPTY_MEMORY_ADVISORY;

  const summary = buildMemorySummary(similarSetups);
  const historicalSupport: HistoricalSupport =
    summary.completedCount < 3
      ? 'INSUFFICIENT_DATA'
      : summary.confidenceAdjustment === 'increase'
        ? 'SUPPORTS'
        : summary.confidenceAdjustment === 'decrease'
          ? 'CONFLICTS'
          : 'NEUTRAL';

  return {
    historicalSupport,
    confidenceAdjustment: summary.confidenceAdjustment,
    memoryWarning: summary.riskWarning || null,
    ruleReviewRecommendation: historicalSupport === 'CONFLICTS'
      ? 'Similar completed setups conflict with this plan. Do not modify entry, stop, target, time-window, or setup rules automatically; require stronger confirmation or mark for rule review.'
      : null,
    similarSetupCount: summary.setupCount,
    completedSetupCount: summary.completedCount,
    summary,
  };
}

export async function retrieveMemoryAdvisory(query: RAGQuery): Promise<MemoryAdvisory> {
  try {
    const { retrieveSimilarSetups } = await import('../lib/rag');
    const similarSetups = await retrieveSimilarSetups(query);
    return advisoryFromSimilarSetups(similarSetups);
  } catch (error) {
    console.warn('[memory-agent] RAG retrieval advisory skipped:', error instanceof Error ? error.message : String(error));
    return {
      ...EMPTY_MEMORY_ADVISORY,
      historicalSupport: 'INSUFFICIENT_DATA',
      memoryWarning: 'Memory retrieval unavailable. Continue with app-owned rules and deterministic trade decision pipeline.',
    };
  }
}

export function memoryAuthorityNote(advisory: MemoryAdvisory): string {
  return [
    `Memory: ${advisory.historicalSupport}`,
    `Confidence adjustment: ${advisory.confidenceAdjustment}`,
    `Similar setups: ${advisory.similarSetupCount}`,
    `Completed outcomes: ${advisory.completedSetupCount}`,
    advisory.memoryWarning ? `Warning: ${advisory.memoryWarning}` : null,
    advisory.ruleReviewRecommendation,
    'Memory is advisory only. It must not approve trades or change entry, stop, target, setup, time-window, or risk rules.',
  ].filter(Boolean).join('\n');
}
