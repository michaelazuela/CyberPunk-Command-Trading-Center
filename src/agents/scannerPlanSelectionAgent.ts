import { ExecutionStatus, NoTradeReason, SetupCandidate, SetupCandidateStatus, SetupType, TradeDecisionStatus } from '../types';
import {
  applyStaleChaseGuard,
  classifyScannerVisibility,
  scannerStateFromDecision,
  type ScannerRiskGuards,
  type ScannerState,
  type ScannerVisibilityMetadata,
  type StaleChaseResult,
  type TargetCascadeResult,
} from '../lib/localScannerEngine';
import type { NormalizedTradePlan } from '../lib/tradePlan';
import { isValidPrice } from '../lib/tradePlan';

const INTRADAY_MSS_AUTHORITY_NOTE =
  'NinjaTrader OHLC and the app-owned setup scanner own this IntradayMssMicroContinuation campaign; Gemini/advisory agents may summarize it only.';
const INTRADAY_MSS_LIFECYCLE_NOTE =
  'First completed 5M close-through activates the campaign; the scanner keeps it alive until retest confirms, the line fails, target is already reached before alert, or the session window expires.';

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

type LatestCompletedBarPriceRange = {
  high?: number | null;
  low?: number | null;
} | null;

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

function candidateDeskReviewStrengthSort(a: SetupCandidate, b: SetupCandidate): number {
  const rankDiff = (b.rankScore ?? 0) - (a.rankScore ?? 0);
  if (rankDiff !== 0) return rankDiff;
  const confidenceDiff = (b.modelConfidenceScore ?? 0) - (a.modelConfidenceScore ?? 0);
  if (confidenceDiff !== 0) return confidenceDiff;
  const qualityDiff = (b.decisionQualityScore ?? 0) - (a.decisionQualityScore ?? 0);
  if (qualityDiff !== 0) return qualityDiff;
  return (b.priority ?? 0) - (a.priority ?? 0);
}

function candidateHasOpposingHtfConflict(candidate: SetupCandidate): boolean {
  const text = [
    ...(candidate.missingEvidence || []),
    ...(candidate.activeRuleset?.timeframeMss?.blockers || []),
    candidate.activeCampaign?.htfRelationship === 'conflict' ? 'active campaign HTF conflict' : null,
  ].filter(Boolean).join(' ');
  return /opposing.*htf|htf.*conflict|higher-timeframe.*not aligned|opposing completed.*mss|countertrend/i.test(text);
}

function candidateCanDriveScannerPlan(candidate: SetupCandidate): boolean {
  const triggerPendingBlock = candidate.blockReason === NoTradeReason.EntryTriggerPending;
  const specializedIntradayMssWatch =
    triggerPendingBlock &&
    candidate.setupType === SetupType.IntradayMssMicroContinuation &&
    candidate.candidateState === 'MSS_CONTINUATION_RETEST_PENDING';
  return (
    candidate.direction === 'LONG' ||
    candidate.direction === 'SHORT'
  ) && (
    candidate.executionStatus === ExecutionStatus.Executable ||
    candidate.executionStatus === ExecutionStatus.Conditional
  ) && !specializedIntradayMssWatch && (!candidate.blockReason || triggerPendingBlock);
}

function candidateInvalidatedByMarketPrice(
  candidate: SetupCandidate,
  currentPrice: number | null,
  latestCompletedBar?: LatestCompletedBarPriceRange,
): boolean {
  if (!isValidPrice(candidate.stop)) return false;
  const latestHigh = latestCompletedBar && isValidPrice(latestCompletedBar.high) ? latestCompletedBar.high : null;
  const latestLow = latestCompletedBar && isValidPrice(latestCompletedBar.low) ? latestCompletedBar.low : null;
  if (candidate.direction === 'LONG') {
    return (
      (isValidPrice(currentPrice) && currentPrice <= candidate.stop) ||
      (latestLow !== null && latestLow <= candidate.stop)
    );
  }
  if (candidate.direction === 'SHORT') {
    return (
      (isValidPrice(currentPrice) && currentPrice >= candidate.stop) ||
      (latestHigh !== null && latestHigh >= candidate.stop)
    );
  }
  return false;
}

function findNormalizedPlanCandidate(normalized: NormalizedTradePlan): SetupCandidate | null {
  const direct = normalized.opportunitySelection?.bestExecutableCandidate || normalized.opportunitySelection?.bestConditionalCandidate || null;
  if (direct && candidateMatchesNormalizedPlan(direct, normalized)) return direct;
  return (normalized.setupCandidates || [])
    .filter((candidate) => candidateMatchesNormalizedPlan(candidate, normalized))
    .sort(candidatePrioritySort)[0] || null;
}

function hasFullPlanLevels(candidate: SetupCandidate): boolean {
  return (
    isValidPrice(candidate.entry) &&
    isValidPrice(candidate.stop) &&
    isValidPrice(candidate.target1) &&
    isValidPrice(candidate.target2)
  );
}

function staleSeverity(stale: StaleChaseResult): number {
  if (!stale.stale) return 0;
  const reason = (stale.reason || '').toLowerCase();
  if (reason.includes('t1 was already reached')) return 3;
  if (reason.includes('closer to t1')) return 2;
  return 1;
}

function freshCandidateFromFallbackPool(
  normalized: NormalizedTradePlan,
  currentPrice: number | null,
  latestCompletedBar?: LatestCompletedBarPriceRange,
  guards?: Partial<ScannerRiskGuards>,
): SetupCandidate | null {
  const candidates = (normalized.setupCandidates || [])
    .filter(candidateCanDriveScannerPlan)
    .filter((candidate) => !candidateInvalidatedByMarketPrice(candidate, currentPrice, latestCompletedBar))
    .sort((a, b) => {
      const aHtfConflict = candidateHasOpposingHtfConflict(a);
      const bHtfConflict = candidateHasOpposingHtfConflict(b);
      if (aHtfConflict !== bHtfConflict) return aHtfConflict ? 1 : -1;

      const aSeverity = staleSeverity(applyStaleChaseGuard({ candidate: a, currentPrice, guards }));
      const bSeverity = staleSeverity(applyStaleChaseGuard({ candidate: b, currentPrice, guards }));
      if (aSeverity !== bSeverity) return aSeverity - bSeverity;

      const aFull = hasFullPlanLevels(a);
      const bFull = hasFullPlanLevels(b);
      if (aFull !== bFull) return aFull ? -1 : 1;

      return candidateDeskReviewStrengthSort(a, b);
    });

  return candidates[0] || null;
}

function earlyMoveReviewOppositeDirectionCandidate(normalized: NormalizedTradePlan, candidate: SetupCandidate | null): boolean {
  return (
    normalized.earlyMoveReview?.status === 'already_triggered_no_fresh_entry' &&
    Boolean(normalized.earlyMoveReview.direction) &&
    Boolean(candidate) &&
    candidate?.direction !== normalized.earlyMoveReview.direction &&
    (candidate?.direction === 'LONG' || candidate?.direction === 'SHORT')
  );
}

function freshOppositeEarlyMoveCandidateFromFallbackPool(
  normalized: NormalizedTradePlan,
  currentPrice: number | null,
  latestCompletedBar?: LatestCompletedBarPriceRange,
  guards?: Partial<ScannerRiskGuards>,
): SetupCandidate | null {
  const earlyMoveDirection = normalized.earlyMoveReview?.direction;
  if (
    normalized.earlyMoveReview?.status !== 'already_triggered_no_fresh_entry' ||
    (earlyMoveDirection !== 'LONG' && earlyMoveDirection !== 'SHORT')
  ) {
    return null;
  }

  const candidates = (normalized.setupCandidates || [])
    .filter(candidateCanDriveScannerPlan)
    .filter((candidate) => !candidateInvalidatedByMarketPrice(candidate, currentPrice, latestCompletedBar))
    .filter((candidate) => candidate.direction !== earlyMoveDirection)
    .sort((a, b) => {
      const aHtfConflict = candidateHasOpposingHtfConflict(a);
      const bHtfConflict = candidateHasOpposingHtfConflict(b);
      if (aHtfConflict !== bHtfConflict) return aHtfConflict ? 1 : -1;

      const aSeverity = staleSeverity(applyStaleChaseGuard({ candidate: a, currentPrice, guards }));
      const bSeverity = staleSeverity(applyStaleChaseGuard({ candidate: b, currentPrice, guards }));
      if (aSeverity !== bSeverity) return aSeverity - bSeverity;

      const aFull = hasFullPlanLevels(a);
      const bFull = hasFullPlanLevels(b);
      if (aFull !== bFull) return aFull ? -1 : 1;

      return candidateDeskReviewStrengthSort(a, b);
    });

  return candidates[0] || null;
}

function humanReviewCandidateFromFallbackPool(
  normalized: NormalizedTradePlan,
  currentPrice: number | null,
  latestCompletedBar?: LatestCompletedBarPriceRange,
): SetupCandidate | null {
  return (normalized.setupCandidates || [])
    .filter((candidate) => candidateCanDriveScannerPlan(candidate))
    .filter((candidate) => !candidateInvalidatedByMarketPrice(candidate, currentPrice, latestCompletedBar))
    .filter((candidate) =>
      candidate.candidateState === 'HUMAN_REVIEW_READY' ||
      candidate.humanReview?.discordTradePlanEligible === true
    )
    .sort((a, b) => {
      const aHtfConflict = candidateHasOpposingHtfConflict(a);
      const bHtfConflict = candidateHasOpposingHtfConflict(b);
      if (aHtfConflict !== bHtfConflict) return aHtfConflict ? 1 : -1;
      return candidateDeskReviewStrengthSort(a, b);
    })[0] || null;
}

function earlyMoveReviewAppliesToCandidate(normalized: NormalizedTradePlan, candidate: SetupCandidate | null): boolean {
  if (normalized.earlyMoveReview?.status !== 'already_triggered_no_fresh_entry') return false;
  if (!candidate || !normalized.earlyMoveReview.direction) return true;
  return normalized.earlyMoveReview.direction === candidate.direction;
}

function turtleSoupWatchCandidateFromPool(
  normalized: NormalizedTradePlan,
  currentPrice: number | null,
  latestCompletedBar?: LatestCompletedBarPriceRange,
): SetupCandidate | null {
  const candidate = (normalized.setupCandidates || [])
    .filter((item) =>
      item.setupType === SetupType.TurtleSoup &&
      (item.direction === 'LONG' || item.direction === 'SHORT') &&
      item.blockReason === NoTradeReason.InvalidStopLocation &&
      isValidPrice(item.entry) &&
      isValidPrice(item.stop) &&
      isValidPrice(item.target1)
    )
    .filter((item) => !candidateInvalidatedByMarketPrice(item, currentPrice, latestCompletedBar))
    .sort((a, b) => {
      const aHtfConflict = candidateHasOpposingHtfConflict(a);
      const bHtfConflict = candidateHasOpposingHtfConflict(b);
      if (aHtfConflict !== bHtfConflict) return aHtfConflict ? 1 : -1;
      return candidatePrioritySort(a, b);
    })[0] || null;

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
  return value.toFixed(2);
}

function turtleSoupLineReason(candidate: SetupCandidate): string {
  const evidence = candidate.evidence || [];
  return evidence.find((item) => /sweep|reclaim|swept|closed/i.test(item) && !/line in the sand/i.test(item)) ||
    evidence.find((item) => /sweep|reclaim|line in the sand|failed-low|failed-high/i.test(item)) ||
    candidate.scenarioLabel ||
    'Turtle Soup sweep/reclaim decision line from structured 5M OHLC.';
}

function withTurtleSoupLineInSand(candidate: SetupCandidate | null): SetupCandidate | null {
  if (
    !candidate ||
    candidate.setupType !== SetupType.TurtleSoup ||
    (candidate.direction !== 'LONG' && candidate.direction !== 'SHORT') ||
    !isValidPrice(candidate.entry)
  ) {
    return candidate;
  }

  const lineText = formatWatchPrice(candidate.entry);
  const side = candidate.direction === 'LONG' ? 'above' : 'below';
  const reason = turtleSoupLineReason(candidate);
  return {
    ...candidate,
    activeRuleset: {
      ...(candidate.activeRuleset || {}),
      htfLineInSand: candidate.activeRuleset?.htfLineInSand || {
        applied: true,
        status: 'passed',
        required: 'completed_5m_or_15m_close_beyond_htf_line',
        appliesToAllModels: true,
        affectsExecution: false,
        direction: candidate.direction,
        lineInSand: candidate.entry,
        lineReason: `${lineText} matters because it is the Turtle Soup sweep/reclaim decision line. ${reason}`,
        requiredClose: `Completed 5M hold/retest/reclaim ${side} ${lineText} required. No chase after extension.`,
        obstacleType: null,
        obstacleSource: null,
        evidence: [
          `Turtle Soup line in the sand: ${lineText}.`,
          reason,
        ],
        blockers: [
          `No chase: wait for completed 5M proof ${side} ${lineText} or a fresh retest.`,
        ],
      },
    },
  };
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
  const watchTrigger = `${directionText} MSS forming. Campaign active from app-owned completed 5M close-through. Line is ${lineLabel}. ${lineReason} A completed 5M hold/retest ${side} that area gives a human-review ${candidate.direction.toLowerCase()} plan.${extendedText}`;

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
      INTRADAY_MSS_AUTHORITY_NOTE,
      INTRADAY_MSS_LIFECYCLE_NOTE,
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

function missedReviewState(normalized: NormalizedTradePlan, stale: StaleChaseResult, candidate: SetupCandidate | null = null): ScannerPlanSelection {
  const reason = stale.reason || normalized.earlyMoveReview?.action || 'The selected plan is no longer a fresh executable entry.';
  return {
    candidate,
    stale: {
      state: 'Missed',
      stale: true,
      reason,
    },
    state: 'Missed',
    stateForAlert: 'Missed',
    reviewStatus: 'already_triggered_no_fresh_entry',
    auditWarnings: [
      candidate
        ? 'Selected app-owned plan was classified as already_triggered_no_fresh_entry. Scanner may publish it only as missed/no-fresh-entry review; canExecute remains false.'
        : 'Selected app-owned plan was classified as already_triggered_no_fresh_entry. Scanner will not publish it as executable.',
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
        ? `Opposite-direction early-move review ignored for IntradayMssMicroContinuation watch. ${INTRADAY_MSS_AUTHORITY_NOTE} Watch remains human-review only and canExecute remains false.`
        : `IntradayMssMicroContinuation watch surfaced from aligned 15M/5M MSS plus named line in the sand. ${INTRADAY_MSS_LIFECYCLE_NOTE} Completed 5M hold/retest is required and canExecute remains false.`,
    ],
  };
}

function triggerPendingReviewState(candidate: SetupCandidate): ScannerPlanSelection {
  return {
    candidate,
    stale: {
      state: 'TriggerPending',
      stale: false,
      reason: candidate.requiredTrigger || candidate.nextAction || 'Completed 5M trigger/retest is still pending.',
    },
    state: 'TriggerPending',
    stateForAlert: 'TriggerPending',
    reviewStatus: null,
    auditWarnings: [
      'EntryTriggerPending candidate surfaced as scanner watch/review context. No entry approval, canExecute, stop, target, or risk gate was changed.',
    ],
  };
}

function selectScannerPlanCore(args: {
  normalized: NormalizedTradePlan;
  currentPrice: number | null;
  latestCompletedBar?: LatestCompletedBarPriceRange;
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
      return missedReviewState(args.normalized, stale, appPlanCandidate);
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
    const oppositeProofCandidate = withTurtleSoupLineInSand(
      freshOppositeEarlyMoveCandidateFromFallbackPool(args.normalized, args.currentPrice, args.latestCompletedBar, args.guards),
    );
    if (oppositeProofCandidate && earlyMoveReviewOppositeDirectionCandidate(args.normalized, oppositeProofCandidate)) {
      const stale = applyStaleChaseGuard({
        candidate: oppositeProofCandidate,
        currentPrice: args.currentPrice,
        guards: args.guards,
      });
      const state = scannerStateFromDecision({
        decisionStatus: args.normalized.decisionStatus || (args.normalized.canExecute ? TradeDecisionStatus.ApprovedTrade : TradeDecisionStatus.Wait),
        candidate: oppositeProofCandidate,
        stale,
        targetCascade: args.targetCascade || null,
      });
      return {
        candidate: oppositeProofCandidate,
        stale,
        state,
        stateForAlert: oppositeProofCandidate.executionStatus === ExecutionStatus.Executable && state === 'Conditional' ? 'Executable' : state,
        reviewStatus: null,
        auditWarnings: ['Opposite-direction early-move review ignored because a valid app-owned opposite campaign candidate is present.'],
      };
    }

    const humanReviewCandidate = humanReviewCandidateFromFallbackPool(args.normalized, args.currentPrice, args.latestCompletedBar);
    if (humanReviewCandidate && earlyMoveReviewAppliesToCandidate(args.normalized, humanReviewCandidate)) {
      return humanReviewNoChaseState(args.normalized, humanReviewCandidate);
    }
    const turtleSoupWatchCandidate = turtleSoupWatchCandidateFromPool(args.normalized, args.currentPrice, args.latestCompletedBar);
    if (turtleSoupWatchCandidate) {
      return turtleSoupWatchState(turtleSoupWatchCandidate, !earlyMoveReviewAppliesToCandidate(args.normalized, turtleSoupWatchCandidate));
    }
    const intradayMssWatchCandidate = intradayMssRetestPendingWatchCandidateFromPool(args.normalized, args.currentPrice, args.guards);
    if (intradayMssWatchCandidate) {
      return intradayMssWatchState(intradayMssWatchCandidate, !earlyMoveReviewAppliesToCandidate(args.normalized, intradayMssWatchCandidate));
    }
    const proofCandidate = withTurtleSoupLineInSand(freshCandidateFromFallbackPool(args.normalized, args.currentPrice, args.latestCompletedBar, args.guards));
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
    }, proofCandidate);
  }

  const intradayMssWatchCandidate = intradayMssRetestPendingWatchCandidateFromPool(args.normalized, args.currentPrice, args.guards);
  const fallback = withTurtleSoupLineInSand(freshCandidateFromFallbackPool(args.normalized, args.currentPrice, args.latestCompletedBar, args.guards));
  if (!fallback) {
    const turtleSoupWatchCandidate = turtleSoupWatchCandidateFromPool(args.normalized, args.currentPrice, args.latestCompletedBar);
    if (turtleSoupWatchCandidate) return turtleSoupWatchState(turtleSoupWatchCandidate);
    if (intradayMssWatchCandidate) return intradayMssWatchState(intradayMssWatchCandidate);
  }
  const stale = applyStaleChaseGuard({
    candidate: fallback,
    currentPrice: args.currentPrice,
    guards: args.guards,
  });
  if (stale.stale) {
    if (intradayMssWatchCandidate) {
      const selection = intradayMssWatchState(intradayMssWatchCandidate);
      return {
        ...selection,
        auditWarnings: [
          ...selection.auditWarnings,
          'Stale/chasing fallback candidate did not suppress the OHLC-built IntradayMssMicroContinuation watch.',
        ],
      };
    }
    const selection = missedReviewState(args.normalized, stale, fallback);
    return {
      ...selection,
      auditWarnings: ['Fallback scanner candidate is stale/chasing. Scanner may publish it only as missed/no-fresh-entry review; canExecute remains false.'],
    };
  }

  if (fallback?.blockReason === NoTradeReason.EntryTriggerPending) {
    if (intradayMssWatchCandidate && fallback.setupType === SetupType.IntradayMssMicroContinuation) {
      return intradayMssWatchState(intradayMssWatchCandidate);
    }
    return triggerPendingReviewState(fallback);
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

export function selectScannerPlan(args: {
  normalized: NormalizedTradePlan;
  currentPrice: number | null;
  latestCompletedBar?: LatestCompletedBarPriceRange;
  guards?: Partial<ScannerRiskGuards>;
  targetCascade?: TargetCascadeResult | null;
}): ScannerPlanSelection {
  const selection = selectScannerPlanCore(args);
  return {
    ...selection,
    visibilityMetadata: classifyScannerVisibility({
      state: selection.stateForAlert,
      candidate: selection.candidate,
      canExecute: Boolean(args.normalized.canExecute),
      staleReason: selection.stale.reason,
    }),
  };
}
