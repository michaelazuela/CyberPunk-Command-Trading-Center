import { TRADE_RULES } from '../config/tradeRules';
import { ExecutionStatus, NoTradeReason, type SetupCandidate } from '../types';
import { cloneDeskBoundary, CONDITIONAL_RISK_APPROVAL_BOUNDARY } from './deskAgentBoundaries';

export type ConditionalRiskLabel =
  | 'Clean risk'
  | 'Acceptable risk'
  | 'Caution risk'
  | 'High risk'
  | 'Poor risk / avoid unless manually overridden';

export type HigherTimeframeRiskAlignment = 'aligned' | 'mixed' | 'conflict' | 'unknown';

export interface ConditionalCandidateRiskScore {
  score: number;
  label: ConditionalRiskLabel;
  riskPoints: number | null;
  maxAllowedRiskPoints: number;
  estimatedRewardPoints: number | null;
  estimatedRiskReward: number | null;
  blockReason: string | null;
  canExecute: false;
  decisionAuthority: 'advisory_only';
  reasons: string[];
  advisoryNotes: string[];
  approvalBoundary: {
    riskScoreApprovesTrade: false;
    riskScoreChangesRules: false;
    riskScoreOverridesRisk: false;
    riskScoreCreatesEntry: false;
    riskScoreCreatesTargets: false;
  };
}

export interface ScoreConditionalCandidateRiskInput {
  candidate: SetupCandidate;
  maxAllowedRiskPoints?: number;
  higherTimeframeAlignment?: HigherTimeframeRiskAlignment;
  priceExtended?: boolean;
  freshRetestCouldTightenRisk?: boolean;
}

function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function riskLabel(score: number): ConditionalRiskLabel {
  if (score >= 80) return 'Clean risk';
  if (score >= 65) return 'Acceptable risk';
  if (score >= 50) return 'Caution risk';
  if (score >= 35) return 'High risk';
  return 'Poor risk / avoid unless manually overridden';
}

function estimateReward(candidate: SetupCandidate): number | null {
  if (!isValidNumber(candidate.entry)) return null;
  const target = isValidNumber(candidate.target1)
    ? candidate.target1
    : isValidNumber(candidate.target2)
      ? candidate.target2
      : null;
  if (!isValidNumber(target)) return null;
  const reward = Math.abs(target - candidate.entry);
  return reward > 0 ? reward : null;
}

function isRiskTooWide(candidate: SetupCandidate): boolean {
  return candidate.blockReason === NoTradeReason.RiskTooWide;
}

export function inferHigherTimeframeRiskAlignment(candidate: SetupCandidate): HigherTimeframeRiskAlignment {
  const text = [
    candidate.levelContextSummary,
    candidate.decisionQualityRecommendation,
    ...candidate.evidence,
    ...candidate.missingEvidence,
  ].filter(Boolean).join(' ').toLowerCase();
  if (/\bhtf\b.*\baligned\b|higher[- ]timeframe.*\baligned\b|4h.*1h.*15m.*5m.*long|4h.*1h.*15m.*5m.*short/.test(text)) return 'aligned';
  if (/\bhtf\b.*\bconflict|higher[- ]timeframe.*\bconflict|conflicts with higher/.test(text)) return 'conflict';
  if (/\bmixed\b.*\bhtf\b|\bhtf\b.*\bmixed\b|higher[- ]timeframe.*\bmixed\b/.test(text)) return 'mixed';
  return 'unknown';
}

export function inferPriceExtended(candidate: SetupCandidate): boolean {
  const text = [
    candidate.blockReason,
    candidate.requiredTrigger,
    candidate.nextAction,
    candidate.levelContextSummary,
    candidate.decisionQualityRecommendation,
    ...candidate.evidence,
    ...candidate.missingEvidence,
  ].filter(Boolean).join(' ').toLowerCase();
  return /extended|chasing|chase|already triggered|no fresh entry/.test(text);
}

export function scoreConditionalCandidateRiskForDisplay(candidate: SetupCandidate): ConditionalCandidateRiskScore {
  return scoreConditionalCandidateRisk({
    candidate,
    higherTimeframeAlignment: inferHigherTimeframeRiskAlignment(candidate),
    priceExtended: inferPriceExtended(candidate),
    freshRetestCouldTightenRisk: Boolean(candidate.requiredTrigger?.toLowerCase().includes('retest')),
  });
}

export function scoreConditionalCandidateRisk(
  input: ScoreConditionalCandidateRiskInput,
): ConditionalCandidateRiskScore {
  const candidate = input.candidate;
  const maxAllowedRiskPoints = input.maxAllowedRiskPoints ?? TRADE_RULES.maxRiskPoints;
  const riskPoints = isValidNumber(candidate.riskPoints)
    ? candidate.riskPoints
    : isValidNumber(candidate.entry) && isValidNumber(candidate.stop)
      ? Math.abs(candidate.entry - candidate.stop)
      : null;
  const estimatedRewardPoints = estimateReward(candidate);
  const estimatedRiskReward = isValidNumber(riskPoints) && riskPoints > 0 && isValidNumber(estimatedRewardPoints)
    ? estimatedRewardPoints / riskPoints
    : null;

  let score = 100;
  const reasons: string[] = [];
  const advisoryNotes: string[] = [];

  if (isValidNumber(riskPoints) && riskPoints > 0) {
    const riskRatio = riskPoints / maxAllowedRiskPoints;
    if (riskRatio <= 1) {
      reasons.push(`Stop risk ${riskPoints.toFixed(2)} pts is inside the ${maxAllowedRiskPoints.toFixed(2)} pt app limit.`);
    } else if (riskRatio <= 1.25) {
      score -= 15;
      reasons.push(`Stop risk is 1-25% above the ${maxAllowedRiskPoints.toFixed(2)} pt app limit.`);
    } else if (riskRatio <= 1.5) {
      score -= 30;
      reasons.push(`Stop risk is 26-50% above the ${maxAllowedRiskPoints.toFixed(2)} pt app limit.`);
    } else {
      score -= 45;
      reasons.push(`Stop risk is more than 50% above the ${maxAllowedRiskPoints.toFixed(2)} pt app limit.`);
    }
  } else {
    score -= 25;
    reasons.push('Risk points are unavailable; advisory score cannot confirm risk quality.');
  }

  if (input.higherTimeframeAlignment === 'aligned') {
    score += 10;
    reasons.push('Higher-timeframe stack is aligned with the candidate direction.');
  } else if (input.higherTimeframeAlignment === 'conflict') {
    score -= 20;
    reasons.push('Higher-timeframe context conflicts with the candidate direction.');
  } else if (input.higherTimeframeAlignment === 'mixed') {
    reasons.push('Higher-timeframe context is mixed.');
  }

  if (isValidNumber(estimatedRiskReward)) {
    if (estimatedRiskReward >= 2) {
      score += 10;
      reasons.push('Estimated reward-to-risk is at least 2.0R.');
    } else if (estimatedRiskReward >= 1.5) {
      score += 5;
      reasons.push('Estimated reward-to-risk is between 1.5R and 2.0R.');
    } else if (estimatedRiskReward >= 1) {
      score -= 10;
      reasons.push('Estimated reward-to-risk is between 1.0R and 1.5R.');
    } else {
      score -= 25;
      reasons.push('Estimated reward-to-risk is below 1.0R.');
    }
  } else {
    advisoryNotes.push('Target reward is unavailable; do not treat this as an executable risk plan.');
  }

  if (input.priceExtended) {
    score -= 15;
    reasons.push('Current price is extended or would require chasing the reclaim candle.');
    advisoryNotes.push('Do not chase. Wait for a fresh completed 5M trigger/retest that brings risk inside limits.');
  }

  if (input.freshRetestCouldTightenRisk) {
    advisoryNotes.push('A tighter retest trigger may improve the risk profile, but it does not approve execution.');
  }

  if (isRiskTooWide(candidate)) {
    score = Math.min(score, input.priceExtended ? 49 : 64);
    advisoryNotes.push('Risk exceeds standard limit. Human final decision required; this advisory score does not approve risk.');
  }

  if (candidate.executionStatus !== ExecutionStatus.Executable) {
    advisoryNotes.push('This score is advisory only and does not change canExecute, decisionStatus, or app approval.');
  }

  const finalScore = clampScore(score);
  return {
    score: finalScore,
    label: riskLabel(finalScore),
    riskPoints,
    maxAllowedRiskPoints,
    estimatedRewardPoints,
    estimatedRiskReward,
    blockReason: candidate.blockReason || null,
    canExecute: false,
    decisionAuthority: 'advisory_only',
    reasons,
    advisoryNotes,
    approvalBoundary: cloneDeskBoundary(CONDITIONAL_RISK_APPROVAL_BOUNDARY),
  };
}
