import { ExecutionStatus, SetupCandidate, TradeDecisionStatus } from '../types';
import {
  applyStaleChaseGuard,
  scannerStateFromDecision,
  type ScannerRiskGuards,
  type ScannerState,
  type StaleChaseResult,
  type TargetCascadeResult,
} from '../lib/localScannerEngine';
import type { NormalizedTradePlan } from '../lib/tradePlan';
import { isValidPrice } from '../lib/tradePlan';

export interface ScannerPlanSelection {
  candidate: SetupCandidate | null;
  stale: StaleChaseResult;
  state: ScannerState;
  stateForAlert: ScannerState;
  reviewStatus: 'already_triggered_no_fresh_entry' | null;
  auditWarnings: string[];
}

function normalizedPlanDirection(normalized: Pick<NormalizedTradePlan, 'decision'>): SetupCandidate['direction'] {
  return normalized.decision === 'LONG' || normalized.decision === 'SHORT' ? normalized.decision : 'NO TRADE';
}

function samePrice(a: number | null | undefined, b: number | null | undefined): boolean {
  if (!isValidPrice(a) || !isValidPrice(b)) return false;
  return Math.abs(a - b) < 0.01;
}

function candidateMatchesNormalizedPlan(candidate: SetupCandidate, normalized: NormalizedTradePlan): boolean {
  const direction = normalizedPlanDirection(normalized);
  if (direction === 'NO TRADE' || candidate.direction !== direction) return false;
  if (isValidPrice(normalized.entry) && !samePrice(candidate.entry, normalized.entry)) return false;
  if (isValidPrice(normalized.stop) && !samePrice(candidate.stop, normalized.stop)) return false;
  return true;
}

function candidatePrioritySort(a: SetupCandidate, b: SetupCandidate): number {
  return (b.decisionQualityScore || b.rankScore || b.priority || 0) - (a.decisionQualityScore || a.rankScore || a.priority || 0);
}

function candidateCanDriveScannerPlan(candidate: SetupCandidate): boolean {
  return (
    candidate.direction === 'LONG' ||
    candidate.direction === 'SHORT'
  ) && (
    candidate.executionStatus === ExecutionStatus.Executable ||
    candidate.executionStatus === ExecutionStatus.Conditional
  ) && !candidate.blockReason;
}

function findNormalizedPlanCandidate(normalized: NormalizedTradePlan): SetupCandidate | null {
  const direct = normalized.opportunitySelection?.bestExecutableCandidate || normalized.opportunitySelection?.bestConditionalCandidate || null;
  if (direct && candidateMatchesNormalizedPlan(direct, normalized)) return direct;
  return (normalized.setupCandidates || [])
    .filter((candidate) => candidateMatchesNormalizedPlan(candidate, normalized))
    .sort(candidatePrioritySort)[0] || null;
}

function candidateFromFallbackPool(normalized: NormalizedTradePlan): SetupCandidate | null {
  return (normalized.setupCandidates || [])
    .filter(candidateCanDriveScannerPlan)
    .sort(candidatePrioritySort)[0] || null;
}

function missedReviewState(normalized: NormalizedTradePlan, stale: StaleChaseResult): ScannerPlanSelection {
  const reason = stale.reason || normalized.earlyMoveReview?.action || 'The selected plan is no longer a fresh executable entry.';
  return {
    candidate: null,
    stale: {
      state: 'Missed',
      stale: true,
      reason,
    },
    state: 'Missed',
    stateForAlert: 'Missed',
    reviewStatus: 'already_triggered_no_fresh_entry',
    auditWarnings: [
      'Selected app-owned plan was classified as already_triggered_no_fresh_entry. Scanner will not publish it as executable.',
    ],
  };
}

export function selectScannerPlan(args: {
  normalized: NormalizedTradePlan;
  currentPrice: number | null;
  guards?: Partial<ScannerRiskGuards>;
  targetCascade?: TargetCascadeResult | null;
}): ScannerPlanSelection {
  const auditWarnings: string[] = [];
  const normalizedDirection = normalizedPlanDirection(args.normalized);
  const appPlanCandidate = findNormalizedPlanCandidate(args.normalized);

  if (
    args.normalized.canExecute &&
    normalizedDirection !== 'NO TRADE'
  ) {
    if (!appPlanCandidate) {
      return {
        candidate: null,
        stale: { state: 'NoTrade', stale: false, reason: null },
        state: 'NoTrade',
        stateForAlert: 'NoTrade',
        reviewStatus: null,
        auditWarnings: [`Normalized plan is ${normalizedDirection}, but no matching app-owned candidate was found. Scanner alert suppressed.`],
      };
    }

    if (appPlanCandidate.direction !== normalizedDirection) {
      return {
        candidate: null,
        stale: { state: 'NoTrade', stale: false, reason: null },
        state: 'NoTrade',
        stateForAlert: 'NoTrade',
        reviewStatus: null,
        auditWarnings: [`Normalized plan direction ${normalizedDirection} disagrees with selected candidate direction ${appPlanCandidate.direction}. Scanner alert suppressed.`],
      };
    }

    if (appPlanCandidate.executionStatus !== ExecutionStatus.Executable || appPlanCandidate.blockReason) {
      return {
        candidate: appPlanCandidate,
        stale: { state: 'Blocked', stale: false, reason: appPlanCandidate.blockReason || 'Selected candidate is not executable.' },
        state: 'Blocked',
        stateForAlert: 'Blocked',
        reviewStatus: null,
        auditWarnings: [`Normalized plan candidate is ${appPlanCandidate.executionStatus}${appPlanCandidate.blockReason ? `/${appPlanCandidate.blockReason}` : ''}; Approved/Executable alert suppressed.`],
      };
    }

    const stale = applyStaleChaseGuard({
      candidate: appPlanCandidate,
      currentPrice: args.currentPrice,
      guards: args.guards,
    });
    if (stale.stale || args.normalized.earlyMoveReview?.status === 'already_triggered_no_fresh_entry') {
      return missedReviewState(args.normalized, stale);
    }

    const state = scannerStateFromDecision({
      decisionStatus: args.normalized.decisionStatus || TradeDecisionStatus.ApprovedTrade,
      candidate: appPlanCandidate,
      stale,
      targetCascade: args.targetCascade || null,
    });
    const stateForAlert = state === 'Conditional' ? 'Executable' : state;
    return {
      candidate: appPlanCandidate,
      stale,
      state,
      stateForAlert,
      reviewStatus: null,
      auditWarnings,
    };
  }

  if (args.normalized.earlyMoveReview?.status === 'already_triggered_no_fresh_entry') {
    return missedReviewState(args.normalized, { state: 'Missed', stale: true, reason: args.normalized.earlyMoveReview.action });
  }

  const fallback = candidateFromFallbackPool(args.normalized);
  const stale = applyStaleChaseGuard({
    candidate: fallback,
    currentPrice: args.currentPrice,
    guards: args.guards,
  });
  if (stale.stale) {
    return {
      candidate: null,
      stale,
      state: 'Missed',
      stateForAlert: 'Missed',
      reviewStatus: 'already_triggered_no_fresh_entry',
      auditWarnings: ['Fallback scanner candidate is stale/chasing. Scanner will not publish it as executable.'],
    };
  }

  const state = scannerStateFromDecision({
    decisionStatus: args.normalized.decisionStatus || (args.normalized.canExecute ? TradeDecisionStatus.ApprovedTrade : TradeDecisionStatus.Wait),
    candidate: fallback,
    stale,
    targetCascade: args.targetCascade || null,
  });
  const stateForAlert =
    fallback?.executionStatus === ExecutionStatus.Executable && state === 'Conditional'
      ? 'Executable'
      : state;

  if (fallback && normalizedDirection !== 'NO TRADE' && fallback.direction !== normalizedDirection) {
    auditWarnings.push(`Fallback scanner candidate direction ${fallback.direction} differs from normalized plan direction ${normalizedDirection}.`);
  }

  return {
    candidate: fallback,
    stale,
    state,
    stateForAlert,
    reviewStatus: null,
    auditWarnings,
  };
}
