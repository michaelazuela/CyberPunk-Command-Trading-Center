import { ExecutionStatus, NoTradeReason, SetupCandidate, SetupCandidateStatus, SetupType, TradeDecisionStatus } from '../types';
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
  reviewStatus:
    | 'already_triggered_no_fresh_entry'
    | 'early_move_review_no_valid_candidate'
    | null;
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

function humanReviewCandidateFromFallbackPool(normalized: NormalizedTradePlan): SetupCandidate | null {
  return (normalized.setupCandidates || [])
    .filter((candidate) => candidateCanDriveScannerPlan(candidate))
    .filter((candidate) =>
      candidate.candidateState === 'HUMAN_REVIEW_READY' ||
      candidate.humanReview?.discordTradePlanEligible === true
    )
    .sort(candidatePrioritySort)[0] || null;
}

function earlyMoveReviewAppliesToCandidate(normalized: NormalizedTradePlan, candidate: SetupCandidate | null): boolean {
  if (normalized.earlyMoveReview?.status !== 'already_triggered_no_fresh_entry') return false;
  if (!candidate || !normalized.earlyMoveReview.direction) return true;
  return normalized.earlyMoveReview.direction === candidate.direction;
}

function turtleSoupWatchCandidateFromPool(normalized: NormalizedTradePlan): SetupCandidate | null {
  const candidate = (normalized.setupCandidates || [])
    .filter((item) =>
      item.setupType === SetupType.TurtleSoup &&
      (item.direction === 'LONG' || item.direction === 'SHORT') &&
      item.blockReason === NoTradeReason.InvalidStopLocation &&
      isValidPrice(item.entry) &&
      isValidPrice(item.stop) &&
      isValidPrice(item.target1)
    )
    .sort(candidatePrioritySort)[0] || null;

  if (!candidate) return null;

  const directionText = candidate.direction === 'SHORT' ? 'below' : 'above';
  const stopText = candidate.direction === 'SHORT' ? 'above' : 'below';
  const noChaseTarget = isValidPrice(candidate.target1) ? ` No chase if T1 ${candidate.target1} is already reached before alert.` : ' No chase if the first target is already reached before alert.';
  return {
    ...candidate,
    detectedStatus: SetupCandidateStatus.Conditional,
    executionStatus: ExecutionStatus.Conditional,
    blockReason: null,
    candidateState: 'QUALIFIED_CONDITIONAL',
    requiredTrigger: `Turtle Soup ${candidate.direction.toLowerCase()} forming. Line in the sand is ${candidate.entry}. A completed 5M close ${directionText} confirms; stop ${stopText} ${candidate.stop}.${noChaseTarget}`,
    nextAction: `Watch only. Wait for a completed 5M close ${directionText} ${candidate.entry}; do not chase if price has already delivered into T1.`,
    evidence: [
      ...(candidate.evidence || []),
      `Turtle Soup watch: line in the sand ${candidate.entry}; completed 5M close ${directionText} required before promotion.`,
    ],
    missingEvidence: [
      ...(candidate.missingEvidence || []),
      'Completed 5M confirmation close still required for Turtle Soup promotion.',
    ],
  };
}

function intradayMssWatchLine(candidate: SetupCandidate): number | null {
  const line = candidate.activeRuleset?.htfLineInSand?.lineInSand;
  return isValidPrice(line) ? line : null;
}

function formatWatchPrice(value: number): string {
  return Number.isInteger(value) ? value.toFixed(2) : String(value);
}

function hasAlignedIntradayMssEvidence(candidate: SetupCandidate): boolean {
  if (
    candidate.setupType === SetupType.IntradayMssMicroContinuation &&
    candidate.pathway === 'intraday_mss_micro_continuation' &&
    candidate.candidateState === 'MSS_CONTINUATION_RETEST_PENDING'
  ) {
    return true;
  }
  const evidenceText = [
    ...(candidate.evidence || []),
    ...(candidate.activeCampaign?.evidenceLayers || []).flatMap((layer) => layer.evidence || []),
  ].join(' ').toLowerCase();
  return (
    candidate.activeCampaign?.primaryTrigger === '15M_5M_MSS' ||
    (
      evidenceText.includes('15m mss confirmed') &&
      evidenceText.includes('5m mss confirmed')
    )
  );
}

function intradayMssRetestPendingWatchCandidateFromPool(
  normalized: NormalizedTradePlan,
  currentPrice: number | null,
  guards?: Partial<ScannerRiskGuards>,
): SetupCandidate | null {
  const candidate = (normalized.setupCandidates || [])
    .filter((item) =>
      item.setupType === SetupType.IntradayMssMicroContinuation &&
      item.candidateState === 'MSS_CONTINUATION_RETEST_PENDING' &&
      (item.direction === 'LONG' || item.direction === 'SHORT') &&
      hasAlignedIntradayMssEvidence(item) &&
      intradayMssWatchLine(item) !== null
    )
    .sort(candidatePrioritySort)[0] || null;

  if (!candidate) return null;

  const line = intradayMssWatchLine(candidate) as number;
  const lineReason = candidate.activeRuleset?.htfLineInSand?.lineReason || 'named HTF/session line in the sand';
  const fvgZone = (candidate.evidence || [])
    .find((item) => item.toLowerCase().includes('5m fvg / imbalance zone'))
    ?.split(':')
    .slice(1)
    .join(':')
    .trim();
  const lineText = formatWatchPrice(line);
  const lineLabel = fvgZone ? `${fvgZone} / HTF line ${lineText}` : lineText;
  const side = candidate.direction === 'LONG' ? 'above' : 'below';
  const directionText = candidate.direction === 'LONG' ? 'Long' : 'Short';
  const guardsWithDefaults = { maxChaseDistancePoints: 3, ...(guards || {}) };
  const extendedFromLine = isValidPrice(currentPrice) && Math.abs(currentPrice - line) > guardsWithDefaults.maxChaseDistancePoints;
  const extendedText = extendedFromLine
    ? ` Price is extended from ${lineText}; do not chase.`
    : ' Do not chase.';
  const watchTrigger = `${directionText} MSS forming. Line is ${lineLabel}. ${lineReason} A completed 5M hold/retest ${side} that area gives a human-review ${candidate.direction.toLowerCase()} plan.${extendedText}`;

  return {
    ...candidate,
    detectedStatus: SetupCandidateStatus.Conditional,
    executionStatus: ExecutionStatus.Conditional,
    blockReason: null,
    humanReview: {
      status: 'OpeningObservationArmed',
      canExecute: false,
      requiresTraderConfirmation: true,
      discordTradePlanEligible: true,
      reason: 'Intraday MSS micro-continuation watch is active. A completed 5M hold/retest is still required before human-review plan promotion.',
    },
    requiredTrigger: watchTrigger,
    nextAction: watchTrigger,
    evidence: [
      ...(candidate.evidence || []),
      `Intraday MSS watch: aligned 15M/5M MSS with named line in the sand ${lineText}.`,
      `No chase: wait for a completed 5M hold/retest ${side} ${lineText} before human-review plan promotion.`,
      ...(extendedFromLine ? [`Price is extended from the line in the sand ${lineText}; alert is watch-only, not a chase entry.`] : []),
    ],
    missingEvidence: [
      ...(candidate.missingEvidence || []),
      `Completed 5M hold/retest ${side} the named line in the sand still required.`,
    ],
  };
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

function humanReviewNoChaseState(normalized: NormalizedTradePlan, candidate: SetupCandidate): ScannerPlanSelection {
  return {
    candidate,
    stale: {
      state: 'Conditional',
      stale: false,
      reason: normalized.earlyMoveReview?.action || 'Human-review plan is available, but no fresh chase entry is approved.',
    },
    state: 'Conditional',
    stateForAlert: 'Conditional',
    reviewStatus: 'already_triggered_no_fresh_entry',
    auditWarnings: [
      'Human-review-ready plan kept for Discord decision support even though early-move review says no fresh chase entry. canExecute remains false.',
    ],
  };
}

function earlyMoveContextOnlyState(normalized: NormalizedTradePlan): ScannerPlanSelection {
  return {
    candidate: null,
    stale: {
      state: 'TriggerPending',
      stale: false,
      reason: normalized.earlyMoveReview?.action || 'Early move context was detected, but no valid app-owned candidate existed first.',
    },
    state: 'TriggerPending',
    stateForAlert: 'TriggerPending',
    reviewStatus: 'early_move_review_no_valid_candidate',
    auditWarnings: [
      'Early-move review is context only because no valid app-owned executable/conditional candidate existed first. Scanner will not classify this as a missed trade.',
    ],
  };
}

function turtleSoupWatchState(candidate: SetupCandidate, earlyMoveIgnored = false): ScannerPlanSelection {
  return {
    candidate,
    stale: {
      state: 'Conditional',
      stale: false,
      reason: candidate.requiredTrigger || 'Turtle Soup watch is forming; completed 5M confirmation is still required.',
    },
    state: 'Conditional',
    stateForAlert: 'Conditional',
    reviewStatus: null,
    auditWarnings: [
      earlyMoveIgnored
        ? 'Opposite-direction early-move review ignored for Turtle Soup watch. Watch remains decision-support only and canExecute remains false.'
        : 'Turtle Soup watch surfaced before full promotion. Completed 5M confirmation is required and canExecute remains false.',
    ],
  };
}

function intradayMssWatchState(candidate: SetupCandidate, earlyMoveIgnored = false): ScannerPlanSelection {
  return {
    candidate,
    stale: {
      state: 'Conditional',
      stale: false,
      reason: candidate.requiredTrigger || 'Intraday MSS watch is forming; completed 5M hold/retest is still required.',
    },
    state: 'Conditional',
    stateForAlert: 'Conditional',
    reviewStatus: null,
    auditWarnings: [
      earlyMoveIgnored
        ? 'Opposite-direction early-move review ignored for IntradayMssMicroContinuation watch. Watch remains human-review only and canExecute remains false.'
        : 'IntradayMssMicroContinuation watch surfaced from aligned 15M/5M MSS plus named line in the sand. Completed 5M hold/retest is required and canExecute remains false.',
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
    if (stale.stale || earlyMoveReviewAppliesToCandidate(args.normalized, appPlanCandidate)) {
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
    const humanReviewCandidate = humanReviewCandidateFromFallbackPool(args.normalized);
    if (humanReviewCandidate && earlyMoveReviewAppliesToCandidate(args.normalized, humanReviewCandidate)) {
      return humanReviewNoChaseState(args.normalized, humanReviewCandidate);
    }
    const turtleSoupWatchCandidate = turtleSoupWatchCandidateFromPool(args.normalized);
    if (turtleSoupWatchCandidate) {
      return turtleSoupWatchState(turtleSoupWatchCandidate, !earlyMoveReviewAppliesToCandidate(args.normalized, turtleSoupWatchCandidate));
    }
    const intradayMssWatchCandidate = intradayMssRetestPendingWatchCandidateFromPool(args.normalized, args.currentPrice, args.guards);
    if (intradayMssWatchCandidate) {
      return intradayMssWatchState(intradayMssWatchCandidate, !earlyMoveReviewAppliesToCandidate(args.normalized, intradayMssWatchCandidate));
    }
    const proofCandidate = candidateFromFallbackPool(args.normalized);
    if (!proofCandidate) return earlyMoveContextOnlyState(args.normalized);
    if (!earlyMoveReviewAppliesToCandidate(args.normalized, proofCandidate)) {
      const stale = applyStaleChaseGuard({
        candidate: proofCandidate,
        currentPrice: args.currentPrice,
        guards: args.guards,
      });
      const state = scannerStateFromDecision({
        decisionStatus: args.normalized.decisionStatus || (args.normalized.canExecute ? TradeDecisionStatus.ApprovedTrade : TradeDecisionStatus.Wait),
        candidate: proofCandidate,
        stale,
        targetCascade: args.targetCascade || null,
      });
      return {
        candidate: proofCandidate,
        stale,
        state,
        stateForAlert: proofCandidate.executionStatus === ExecutionStatus.Executable && state === 'Conditional' ? 'Executable' : state,
        reviewStatus: null,
        auditWarnings: ['Opposite-direction early-move review ignored for selected scanner candidate.'],
      };
    }
    return missedReviewState(args.normalized, {
      state: 'Missed',
      stale: true,
      reason: args.normalized.earlyMoveReview.action,
    });
  }

  const fallback = candidateFromFallbackPool(args.normalized);
  if (!fallback) {
    const turtleSoupWatchCandidate = turtleSoupWatchCandidateFromPool(args.normalized);
    if (turtleSoupWatchCandidate) return turtleSoupWatchState(turtleSoupWatchCandidate);
    const intradayMssWatchCandidate = intradayMssRetestPendingWatchCandidateFromPool(args.normalized, args.currentPrice, args.guards);
    if (intradayMssWatchCandidate) return intradayMssWatchState(intradayMssWatchCandidate);
  }
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
