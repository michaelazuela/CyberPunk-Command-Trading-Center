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

function selectBestScannerCandidate(candidates: SetupCandidate[] | undefined, currentPrice: number | null): SetupCandidate | null {
  const arbitration = applyCollisionFirstArbitration(candidates);
  if (arbitration.state === 'collision_wait') return null;
  const eligible = (candidates || [])
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
  const freshEligible = eligible.filter((candidate) => !staleAtCurrentPrice(candidate, currentPrice));
  return (freshEligible[0] || eligible[0]) ?? null;
}

export function selectScannerPlan(args: {
  normalized: NormalizedTradePlan;
  currentPrice: number | null;
  latestCompletedBar?: {
    high?: number | null;
    low?: number | null;
  } | null;
  guards?: unknown;
  targetCascade?: TargetCascadeResult | null;
}): ScannerPlanSelection {
  const collisionArbitration = args.normalized.collisionArbitration || applyCollisionFirstArbitration(args.normalized.setupCandidates);
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
  const candidate = selectBestScannerCandidate(args.normalized.setupCandidates, args.currentPrice);
  const state = candidate ? stateFromCandidate(candidate, args.normalized) : stateFromNormalizedPlan(args.normalized);
  const staleReason = candidateSelectionReason(
    candidate,
    candidate ? null : 'Blank-slate mode: scanner plan selection has no installed model candidate for this cycle.',
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
    auditWarnings: candidate ? [] : [
      'Blank-slate mode: no installed scanner candidate is available for selection.',
    ],
    visibilityMetadata: classifyScannerVisibility({
      state,
      candidate,
      canExecute: Boolean(candidate && args.normalized.canExecute),
      staleReason: stale.reason,
    }),
  };
}
