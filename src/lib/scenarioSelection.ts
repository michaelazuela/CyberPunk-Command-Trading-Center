import { targetsFromEntryStop, TRADE_RULES } from '../config/tradeRules';
import { ExecutionStatus, NoTradeReason, SetupCandidate } from '../types';

export interface CandidateComputedLevels {
  stop: number | null;
  risk: number | null;
  target1: number | null;
  target2: number | null;
}

export interface BestTwoScenarioSelection {
  bestLong: SetupCandidate | null;
  bestShort: SetupCandidate | null;
  orderedCandidates: SetupCandidate[];
  rejectedCandidatesWithReasons: Array<{ candidate: SetupCandidate; reason: string }>;
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function roundToTick(value: number): number {
  return Math.round(value / TRADE_RULES.targetModel.tickSize) * TRADE_RULES.targetModel.tickSize;
}

export function candidateComputedLevels(candidate: SetupCandidate): CandidateComputedLevels {
  const stop = isNumber(candidate.stop) ? candidate.stop : null;
  const computed = targetsFromEntryStop(candidate.direction, candidate.entry ?? null, stop);
  const risk = isNumber(candidate.riskPoints)
    ? candidate.riskPoints
    : computed.riskPoints;
  return {
    stop,
    risk: isNumber(risk) ? roundToTick(risk) : null,
    target1: isNumber(candidate.target1) ? candidate.target1 : computed.target1,
    target2: isNumber(candidate.target2) ? candidate.target2 : computed.target2,
  };
}

export function candidateHasConcretePlan(candidate: SetupCandidate): boolean {
  const levels = candidateComputedLevels(candidate);
  return candidate.direction !== 'NO TRADE' &&
    isNumber(candidate.entry) &&
    isNumber(levels.stop) &&
    isNumber(levels.risk) &&
    isNumber(levels.target1) &&
    isNumber(levels.target2);
}

function retestPlanScore(candidate: SetupCandidate): number {
  const text = `${candidate.scenarioLabel || ''} ${candidate.requiredTrigger || ''} ${candidate.nextAction || ''}`.toLowerCase();
  let score = 0;
  if (text.includes('retest')) score += 18;
  if (text.includes('pullback')) score += 14;
  if (text.includes('reclaim')) score += 12;
  if (text.includes('not the breakout chase') || text.includes('do not chase')) score += 10;
  if (text.includes('imbalance')) score += 8;
  return score;
}

export function scenarioScore(candidate: SetupCandidate): number {
  const levels = candidateComputedLevels(candidate);
  const confidenceScore =
    candidate.confidence === 'High' ? 24 :
    candidate.confidence === 'Medium' ? 14 :
    2;
  const executionScore =
    candidate.executionStatus === ExecutionStatus.Executable ? 44 :
    candidate.executionStatus === ExecutionStatus.Conditional ? 30 :
    candidate.blockReason === NoTradeReason.RiskTooWide ? 16 :
    candidate.executionStatus === ExecutionStatus.Blocked ? 8 :
    0;
  const concretePlanScore = candidateHasConcretePlan(candidate) ? 42 : isNumber(candidate.entry) && isNumber(levels.stop) ? 18 : 0;
  const targetScore = isNumber(levels.target1) && isNumber(levels.target2) ? 18 : 0;
  const triggerScore = candidate.requiredTrigger ? 14 : 0;
  const stopScore = isNumber(levels.stop) ? 14 : 0;
  const riskQualityScore =
    !isNumber(levels.risk) ? 0 :
    levels.risk <= TRADE_RULES.maxRiskPoints ? 18 :
    candidate.blockReason === NoTradeReason.RiskTooWide ? 4 :
    -18;
  const targetMapScore = candidate.targetObjectivePlan ? 12 : 0;
  const clarityScore = Math.round(((candidate.entryClarity || 0) + (candidate.stopClarity || 0) + (candidate.targetClarity || 0)) * 8);
  const proximityScore = Math.round((candidate.proximityScore || 0) * 10);
  const levelContextScore = candidate.levelContextScore || 0;

  return (
    (candidate.rankScore || 0) +
    (candidate.priority || 0) +
    confidenceScore +
    executionScore +
    concretePlanScore +
    targetScore +
    triggerScore +
    stopScore +
    riskQualityScore +
    targetMapScore +
    retestPlanScore(candidate) +
    clarityScore +
    proximityScore +
    levelContextScore
  );
}

function sameScenario(a: SetupCandidate, b: SetupCandidate): boolean {
  if (a.direction !== b.direction) return false;
  const entryA = a.entry ?? null;
  const entryB = b.entry ?? null;
  const stopA = a.stop ?? null;
  const stopB = b.stop ?? null;
  const similarEntry = isNumber(entryA) && isNumber(entryB) && Math.abs(entryA - entryB) <= 1;
  const similarStop = isNumber(stopA) && isNumber(stopB) && Math.abs(stopA - stopB) <= 1;
  const sameTrigger = Boolean(a.requiredTrigger && b.requiredTrigger && a.requiredTrigger === b.requiredTrigger);
  const sameSetupAndReference = a.setupType === b.setupType && similarEntry;
  return (similarEntry && similarStop) || sameTrigger || sameSetupAndReference;
}

export function selectBestTwoScenarios(candidates: SetupCandidate[] | undefined | null): SetupCandidate[] {
  const selection = selectBestTwoScenarioDetails(candidates);
  const result = [selection.bestLong, selection.bestShort].filter(Boolean) as SetupCandidate[];
  return result.sort((a, b) => scenarioScore(b) - scenarioScore(a));
}

export function selectBestTwoScenarioDetails(candidates: SetupCandidate[] | undefined | null): BestTwoScenarioSelection {
  const rejectedCandidatesWithReasons: Array<{ candidate: SetupCandidate; reason: string }> = [];
  const eligible = (candidates || [])
    .filter((candidate) => {
      if (candidate.direction !== 'LONG' && candidate.direction !== 'SHORT') {
        rejectedCandidatesWithReasons.push({ candidate, reason: 'No long/short direction.' });
        return false;
      }
      if (
        candidate.executionStatus !== ExecutionStatus.Executable &&
        candidate.executionStatus !== ExecutionStatus.Conditional &&
        candidate.blockReason !== NoTradeReason.RiskTooWide
      ) {
        rejectedCandidatesWithReasons.push({ candidate, reason: 'Candidate is not executable, conditional, or risk-blocked planning quality.' });
        return false;
      }
      return true;
    })
    .sort((a, b) => scenarioScore(b) - scenarioScore(a));

  const unique: SetupCandidate[] = [];
  eligible.forEach((candidate) => {
    if (unique.some((existing) => sameScenario(existing, candidate))) {
      rejectedCandidatesWithReasons.push({ candidate, reason: 'Deduped against a stronger same-direction scenario.' });
      return;
    }
    unique.push(candidate);
  });

  const bestByDirection = (direction: 'LONG' | 'SHORT') =>
    unique.filter((candidate) => candidate.direction === direction).sort((a, b) => scenarioScore(b) - scenarioScore(a))[0] || null;

  const bestLong = bestByDirection('LONG');
  const bestShort = bestByDirection('SHORT');

  return {
    bestLong,
    bestShort,
    orderedCandidates: unique,
    rejectedCandidatesWithReasons,
  };
}
