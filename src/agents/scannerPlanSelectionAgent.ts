import { ExecutionStatus, SetupCandidate, SetupCandidateStatus, TradeDecisionStatus } from '../types';
import {
  classifyScannerVisibility,
  type ScannerState,
  type ScannerVisibilityMetadata,
  type StaleChaseResult,
  type TargetCascadeResult,
} from '../lib/localScannerEngine';
import { candidateHasConcretePlan, scenarioScore } from '../lib/scenarioSelection';
import { COLLISION_WAIT_MESSAGE, applyCollisionFirstArbitration } from '../lib/collisionFirstArbitration';
import type { NormalizedTradePlan } from '../lib/tradePlan';
import type { NinjaBridgeBar } from '../lib/ninjaTraderBridge';

export interface ScannerPlanSelection {
  candidate: SetupCandidate | null;
  stale: StaleChaseResult;
  state: ScannerState;
  stateForAlert: ScannerState;
  reviewStatus:
    | 'already_triggered_no_fresh_entry'
    | 'early_move_review_no_valid_candidate'
    | null;
  auditWarnings: string[];
  visibilityMetadata?: ScannerVisibilityMetadata;
}

interface ScannerPlanSelectionResult {
  candidate: SetupCandidate | null;
  blockedReason: string | null;
  auditWarnings: string[];
}

type PlanLevelBar = {
  high?: number | null;
  low?: number | null;
};

function stateFromNormalizedPlan(normalized: NormalizedTradePlan): ScannerState {
  if (normalized.decisionStatus === TradeDecisionStatus.OutsideRules) return 'MarketMapping';
  return 'NoTrade';
}

function stateFromCandidate(candidate: SetupCandidate, normalized: NormalizedTradePlan): ScannerState {
  if (candidate.executionStatus === ExecutionStatus.Executable) {
    return normalized.canExecute ? 'Approved' : 'Executable';
  }
  if (candidate.executionStatus === ExecutionStatus.Conditional) return 'Conditional';
  if (candidate.executionStatus === ExecutionStatus.Blocked || candidate.blockReason) return 'Blocked';
  if (candidate.detectedStatus === SetupCandidateStatus.Possible) return candidate.requiredTrigger ? 'TriggerPending' : 'Watching';
  if (candidate.detectedStatus === SetupCandidateStatus.Blocked) return 'Blocked';
  return stateFromNormalizedPlan(normalized);
}

function candidateSelectionReason(candidate: SetupCandidate | null, fallback: string | null): string | null {
  if (!candidate) return fallback;
  if (candidate.riskAdvisoryStatus === 'RISK_EXTENDED_STRUCTURAL') {
    return 'Extended structural risk: nearest protected 5M structure stop is required.';
  }
  return candidate.blockReason || candidate.requiredTrigger || candidate.nextAction || fallback;
}

function staleAtCurrentPrice(candidate: SetupCandidate, currentPrice: number | null): boolean {
  if (typeof currentPrice !== 'number' || !Number.isFinite(currentPrice)) return false;
  if (!candidateHasConcretePlan(candidate)) return false;
  if (
    typeof candidate.entry !== 'number' ||
    typeof candidate.stop !== 'number' ||
    typeof candidate.target1 !== 'number'
  ) return false;

  const buffer = 0.25;
  if (candidate.direction === 'LONG') {
    if (currentPrice <= candidate.stop + buffer) return true;
    if (currentPrice >= candidate.target1 - buffer) return true;
  }
  if (candidate.direction === 'SHORT') {
    if (currentPrice >= candidate.stop - buffer) return true;
    if (currentPrice <= candidate.target1 + buffer) return true;
  }

  return Math.abs(candidate.target1 - currentPrice) < Math.abs(currentPrice - candidate.entry);
}

function candidateSide(candidate: SetupCandidate): 'LONG' | 'SHORT' | null {
  return candidate.direction === 'LONG' || candidate.direction === 'SHORT' ? candidate.direction : null;
}

function priceTouchesPlanLevel(candidate: SetupCandidate, bar: PlanLevelBar | null | undefined, level: 'entry' | 'stop' | 'target1' | 'target2'): boolean {
  const price = candidate[level];
  return typeof price === 'number' &&
    Number.isFinite(price) &&
    typeof bar?.high === 'number' &&
    Number.isFinite(bar.high) &&
    typeof bar?.low === 'number' &&
    Number.isFinite(bar.low) &&
    bar.low <= price &&
    bar.high >= price;
}

function targetTouchedBeforeEntry(candidate: SetupCandidate, recentCompletedBars: NinjaBridgeBar[] | undefined): boolean {
  const side = candidateSide(candidate);
  if (!side || !candidateHasConcretePlan(candidate)) return false;
  const bars = (recentCompletedBars || []).slice(-20);
  let firstTargetIndex = -1;
  let firstEntryIndex = -1;
  for (let index = 0; index < bars.length; index += 1) {
    if (firstTargetIndex < 0 && (priceTouchesPlanLevel(candidate, bars[index], 'target1') || priceTouchesPlanLevel(candidate, bars[index], 'target2'))) {
      firstTargetIndex = index;
    }
    if (firstEntryIndex < 0 && priceTouchesPlanLevel(candidate, bars[index], 'entry')) {
      firstEntryIndex = index;
    }
  }
  return firstTargetIndex >= 0 && firstEntryIndex >= 0 && firstTargetIndex < firstEntryIndex;
}

function sameCandleEntryStop(candidate: SetupCandidate, latestCompletedBar: PlanLevelBar | null | undefined): boolean {
  return priceTouchesPlanLevel(candidate, latestCompletedBar, 'entry') && priceTouchesPlanLevel(candidate, latestCompletedBar, 'stop');
}

function extendedProtectedStopWithoutFreshCompression(candidate: SetupCandidate): boolean {
  const risk = candidate.riskPoints;
  if (typeof risk !== 'number' || !Number.isFinite(risk) || risk < 20) return false;
  const text = [
    candidate.riskAdvisoryStatus,
    candidate.riskPolicy,
    candidate.requiredTrigger,
    candidate.nextAction,
    candidate.blockReason,
  ].filter(Boolean).join(' ');
  return /extended structural|protected 5M structure stop|nearest protected 5M structure/i.test(text);
}

function freshnessBlockReason(args: {
  candidate: SetupCandidate;
  currentPrice: number | null;
  latestCompletedBar?: PlanLevelBar | null;
  recentCompletedBars?: NinjaBridgeBar[];
}): string | null {
  if (targetTouchedBeforeEntry(args.candidate, args.recentCompletedBars)) {
    return 'Stale/no-chase: T1/T2 was already touched before the old entry could fill. Wait for a fresh completed 5M setup.';
  }
  if (sameCandleEntryStop(args.candidate, args.latestCompletedBar)) {
    return 'Same-candle ambiguity: entry and protected 5M stop were both touched in the completed 5M candle. Wait for a fresh completed 5M retest/hold.';
  }
  if (staleAtCurrentPrice(args.candidate, args.currentPrice)) {
    return 'Stale/no-chase: current price is already beyond the fresh entry/target room for this candidate.';
  }
  if (extendedProtectedStopWithoutFreshCompression(args.candidate)) {
    return 'Forming evidence only: nearest protected 5M structure stop is extended from entry. Wait for a fresh retest/hold that gives a closer protected 5M stop and target room.';
  }
  return null;
}

function duplicateCampaignKey(candidate: SetupCandidate): string {
  return [
    candidate.setupType,
    candidate.scenarioLabel || 'no-scenario',
    candidate.direction,
    candidate.entry,
    candidate.stop,
  ].join('|');
}

function collapseDuplicateCandidates(candidates: SetupCandidate[]): { candidates: SetupCandidate[]; suppressed: number } {
  const byKey = new Map<string, SetupCandidate>();
  let suppressed = 0;
  for (const candidate of candidates) {
    const key = duplicateCampaignKey(candidate);
    const previous = byKey.get(key);
    if (!previous) {
      byKey.set(key, candidate);
      continue;
    }
    suppressed += 1;
    if (scenarioScore(candidate) > scenarioScore(previous)) byKey.set(key, candidate);
  }
  return { candidates: [...byKey.values()], suppressed };
}

function selectBestScannerCandidate(args: {
  candidates: SetupCandidate[] | undefined;
  currentPrice: number | null;
  latestCompletedBar?: PlanLevelBar | null;
  recentCompletedBars?: NinjaBridgeBar[];
}): ScannerPlanSelectionResult {
  const candidates = args.candidates || [];
  const arbitration = applyCollisionFirstArbitration(candidates);
  if (arbitration.state === 'collision_wait') {
    return {
      candidate: null,
      blockedReason: COLLISION_WAIT_MESSAGE,
      auditWarnings: [COLLISION_WAIT_MESSAGE],
    };
  }
  const eligibleBeforeCollapse = candidates
    .filter((candidate) => {
      if (arbitration.allowedDirection && candidate.direction !== arbitration.allowedDirection) return false;
      if (candidate.direction !== 'LONG' && candidate.direction !== 'SHORT') return false;
      if (!candidateHasConcretePlan(candidate)) return false;
      return candidate.executionStatus === ExecutionStatus.Executable ||
        candidate.executionStatus === ExecutionStatus.Conditional ||
        candidate.executionStatus === ExecutionStatus.Blocked ||
        candidate.detectedStatus === SetupCandidateStatus.Possible ||
        Boolean(candidate.blockReason);
    })
    .sort((a, b) => scenarioScore(b) - scenarioScore(a));
  const collapsed = collapseDuplicateCandidates(eligibleBeforeCollapse);
  const eligible = collapsed.candidates.sort((a, b) => scenarioScore(b) - scenarioScore(a));
  const freshEligible = eligible.filter((candidate) => !freshnessBlockReason({
    candidate,
    currentPrice: args.currentPrice,
    latestCompletedBar: args.latestCompletedBar,
    recentCompletedBars: args.recentCompletedBars,
  }));
  if (freshEligible[0]) {
    return {
      candidate: freshEligible[0],
      blockedReason: null,
      auditWarnings: collapsed.suppressed > 0
        ? [`Collapsed ${collapsed.suppressed} duplicate same-session/model/side/entry/stop candidate(s) before scanner plan selection.`]
        : [],
    };
  }
  const blockedReason = eligible
    .map((candidate) => freshnessBlockReason({
      candidate,
      currentPrice: args.currentPrice,
      latestCompletedBar: args.latestCompletedBar,
      recentCompletedBars: args.recentCompletedBars,
    }))
    .find((reason): reason is string => Boolean(reason)) || null;
  return {
    candidate: null,
    blockedReason,
    auditWarnings: [
      ...(collapsed.suppressed > 0 ? [`Collapsed ${collapsed.suppressed} duplicate same-session/model/side/entry/stop candidate(s) before scanner plan selection.`] : []),
      ...(blockedReason ? [blockedReason] : []),
    ],
  };
}

export function selectScannerPlan(args: {
  normalized: NormalizedTradePlan;
  currentPrice: number | null;
  latestCompletedBar?: {
    high?: number | null;
    low?: number | null;
  } | null;
  recentCompletedBars?: NinjaBridgeBar[];
  guards?: unknown;
  targetCascade?: TargetCascadeResult | null;
}): ScannerPlanSelection {
  const freshCollisionArbitration = applyCollisionFirstArbitration(args.normalized.setupCandidates);
  const collisionArbitration =
    freshCollisionArbitration.state !== 'collision_wait'
      ? freshCollisionArbitration
      : args.normalized.collisionArbitration || freshCollisionArbitration;
  if (collisionArbitration.state === 'collision_wait') {
    const state: ScannerState = 'NoTrade';
    const stale: StaleChaseResult = {
      state,
      stale: false,
      reason: COLLISION_WAIT_MESSAGE,
    };
    return {
      candidate: null,
      stale,
      state,
      stateForAlert: state,
      reviewStatus: null,
      auditWarnings: [
        COLLISION_WAIT_MESSAGE,
        'Opposite-side model evidence is context only until one side completes the full 5M proof contract.',
      ],
      visibilityMetadata: classifyScannerVisibility({
        state,
        candidate: null,
        canExecute: false,
        staleReason: stale.reason,
      }),
    };
  }
  const selectionResult = selectBestScannerCandidate({
    candidates: args.normalized.setupCandidates,
    currentPrice: args.currentPrice,
    latestCompletedBar: args.latestCompletedBar,
    recentCompletedBars: args.recentCompletedBars,
  });
  const candidate = selectionResult.candidate;
  const state = candidate ? stateFromCandidate(candidate, args.normalized) : stateFromNormalizedPlan(args.normalized);
  const staleReason = candidateSelectionReason(
    candidate,
    candidate ? null : selectionResult.blockedReason || 'Blank-slate mode: scanner plan selection has no installed model candidate for this cycle.',
  );
  const stale: StaleChaseResult = {
    state,
    stale: false,
    reason: staleReason,
  };
  return {
    candidate,
    stale,
    state,
    stateForAlert: state,
    reviewStatus: null,
    auditWarnings: candidate ? selectionResult.auditWarnings : selectionResult.auditWarnings.length
      ? selectionResult.auditWarnings
      : ['Blank-slate mode: no installed scanner candidate is available for selection.'],
    visibilityMetadata: classifyScannerVisibility({
      state,
      candidate,
      canExecute: Boolean(candidate && args.normalized.canExecute),
      staleReason: stale.reason,
    }),
  };
}
