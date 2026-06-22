import type { NinjaBridgeBar } from '../lib/ninjaTraderBridge';
import type { NormalizedTradePlan } from '../lib/tradePlan';
import { isValidPrice } from '../lib/tradePlan';
import { buildHtfLiquidityDrawState, type HtfLiquidityDrawState } from '../lib/htfLiquidityDrawEngine';
import { buildMultiTimeframeMssEvidenceLayer } from '../lib/timeframeMssEvidence';
import { validateDeskStateReplayPath, type DeskState, type DeskStateReplayValidation } from '../lib/localScannerEngine';
import { summarizeActiveTimeframeMssRuleset, type ActiveTimeframeMssRulesetAudit } from '../lib/activeTimeframeMssRulesetAudit';
import { ExecutionStatus, SetupCandidate, SetupType, TradeDecisionStatus, type MultiTimeframeMssEvidenceLayer } from '../types';

export type BridgeDiagnosticClassification =
  | 'A_VALID_APPROVED_NO_ALERT'
  | 'B_APPROVED_ALREADY_TRIGGERED'
  | 'C_UNAPPROVED_ICT_FVG_WATCHLIST'
  | 'D_NO_VALID_SETUP';

export type DiagnosticDirection = 'LONG' | 'SHORT' | 'AUTO';
export type DiagnosticConfirmation = 'supported' | 'conflicted' | 'missing' | 'mixed';
export type FifteenMinuteConfirmation = 'confirmed' | 'rejected' | 'missing' | 'mixed';

export interface DiagnosticFvgBound {
  direction: 'LONG' | 'SHORT';
  lower: number;
  upper: number;
  midpoint: number;
  formedAt: string;
  sourceTimeframe: '5m' | '15m';
  displacementTime: string | null;
}

export interface DiagnosticGateReview {
  model: 'Model 1 Sweep -> MSS -> FVG Retrace' | 'Turtle Soup Reversal' | 'Other approved primary model';
  passedGates: string[];
  failedGates: string[];
  missingRequiredConditions: string[];
  higherTimeframeConfirmation: DiagnosticConfirmation;
  executableUnderCurrentRules: boolean;
}

export interface DiagnosticScannerAuditEvent {
  alertTimestamp: string | null;
  tradeDate: string | null;
  instrument: string | null;
  session: string | null;
  alertType: 'trade' | 'watchlist' | 'health' | 'diagnostic' | 'unknown';
  candidateSetupType: string | null;
  direction: string | null;
  scannerState: string | null;
  selectedCandidateDirection: string | null;
  selectedCandidateStatus: string | null;
  healthStatus: string | null;
  watchlistType: string | null;
  watchlistStatus: string | null;
  suppressionOrBlockReason: string | null;
  auditWarnings: string[];
  discordAlertSent: boolean | null;
  attachmentsGenerated: boolean;
  outcomeButtonsIncluded: boolean;
  ragOrSupabaseWriteAttempted: boolean;
  deskState?: DeskState | null;
  originalFilePath: string;
}

export interface BridgeDiagnosticReplayInput {
  tradeDate: string;
  instrument: 'MES' | 'MNQ' | string;
  session: 'morning' | 'lunch' | 'replay_morning' | 'replay_lunch';
  bars5m: NinjaBridgeBar[];
  bars5mContext?: NinjaBridgeBar[];
  bars15m: NinjaBridgeBar[];
  bars30m?: NinjaBridgeBar[];
  bars60m?: NinjaBridgeBar[];
  bars120m?: NinjaBridgeBar[];
  bars240m?: NinjaBridgeBar[];
  barsDaily?: NinjaBridgeBar[];
  normalizedPlan?: NormalizedTradePlan | null;
  approvedSetupCandidates?: SetupCandidate[] | null;
  scannerSelectedCandidate?: SetupCandidate | null;
  scannerState?: string | null;
  scannerAlertSent?: boolean | null;
  scannerAlertReason?: string | null;
  scannerAuditEvents?: DiagnosticScannerAuditEvent[] | null;
  watchlistDetected?: boolean | null;
  replayWindow: { from: string; to: string };
  suspectedMoveDirection: DiagnosticDirection;
  suspectedMoveWindow?: { from: string; to: string } | null;
}

export type Phase9FReplayCheckStatus = 'pass' | 'fail' | 'not_applicable';

export interface Phase9FReplayCheck {
  status: Phase9FReplayCheckStatus;
  summary: string;
}

export interface Phase9FReplayValidation {
  sourceOfTruth: 'bridge_diagnostic_phase9f_replay_validation';
  status: 'pass' | 'fail' | 'insufficient_replay_data';
  checks: {
    watchAppearedBeforeMove: Phase9FReplayCheck;
    lineInSandMatchedMarketStructure: Phase9FReplayCheck;
    planPromotedCorrectly: Phase9FReplayCheck;
    noChasePreserved: Phase9FReplayCheck;
    noTradeExplainedClearly: Phase9FReplayCheck;
    discordRagUiReflectSameDeskState: Phase9FReplayCheck;
  };
  findings: string[];
  authority: {
    replayApprovesTrade: false;
    replayChangesRules: false;
    replayChangesCanExecute: false;
    replayChangesScannerBehavior: false;
    replayChangesDiscordBehavior: false;
    replayChangesBridgeBehavior: false;
  };
}

export interface BridgeDiagnosticReplayReport {
  finalClassification: BridgeDiagnosticClassification;
  classificationLabel: string;
  tradeDate: string;
  instrument: string;
  replayWindow: { from: string; to: string };
  largerTimeframeContextSummary: string;
  higherTimeframeConfirmation: DiagnosticConfirmation;
  fifteenMinuteConfirmation: FifteenMinuteConfirmation;
  fiveMinuteReview: {
    direction: 'LONG' | 'SHORT' | 'NO TRADE';
    displacementPresent: boolean;
    displacementTime: string | null;
    displacementRangePoints: number | null;
    fvgPullbackPresent: boolean;
    confirmationBarTime: string | null;
    summary: string;
  };
  fvgBounds: DiagnosticFvgBound[];
  pullbackReview: {
    pullbackBarTime: string | null;
    status: 'respected' | 'pierced' | 'filled' | 'invalidated' | 'missing';
    summary: string;
  };
  approvedSetupGateReview: DiagnosticGateReview[];
  scannerAlertReview: {
    candidateCreated: boolean;
    candidateStatus: string | null;
    selectedCandidateSetupType: string | null;
    selectedCandidateDirection: string | null;
    alertState: string | null;
    alertSent: boolean;
    reason: string;
  };
  scannerAuditContext: {
    scannerAuditStatus: 'present' | 'missing';
    matchingEvents: DiagnosticScannerAuditEvent[];
    summary: string;
    warnings: string[];
  };
  deskStateReplayValidation: DeskStateReplayValidation;
  phase9FReplayValidation: Phase9FReplayValidation;
  tradePlanFeasibility: {
    applicable: boolean;
    candidateEntryTrigger: number | null;
    candidateStop: number | null;
    stopDistanceRisk: number | null;
    t1: number | null;
    t2: number | null;
    higherTimeframeTargetRoom: DiagnosticConfirmation;
    freshEntryExisted: boolean;
    alreadyTriggered: boolean;
    summary: string;
  };
  targetOutcomeReview: {
    applicable: boolean;
    entry: number | null;
    stop: number | null;
    t1: number | null;
    t2: number | null;
    firstCompletedBarAfterTrigger: string | null;
    t1Hit: boolean | null;
    t1HitTime: string | null;
    t2Hit: boolean | null;
    t2HitTime: string | null;
    stopHitBeforeTargets: boolean | null;
    stopHitTime: string | null;
    maximumFavorableExcursion: number | null;
    maximumAdverseExcursion: number | null;
    finalReplayOutcome: 'stopped before T1' | 'T1 hit only' | 'T1 and T2 hit' | 'no target hit' | 'already extended before valid fresh entry' | 'not applicable';
    authorityNote: string;
  };
  htfMssDiagnostics: {
    source: HtfLiquidityDrawState['source'];
    authority: HtfLiquidityDrawState['authority'];
    boundary: HtfLiquidityDrawState['boundary'];
    classification: HtfLiquidityDrawState['classification'];
    timeframeStack: Array<{
      timeframe: string;
      direction: string;
      status: string;
      lifecycleState: string;
      confidence: number;
    }>;
    raidState: HtfLiquidityDrawState['raidState'];
    reclaimStatus: HtfLiquidityDrawState['reclaimStatus'];
    fiveMinuteMssTriggerConfirmed: boolean;
    fiveMinuteMssConfirmationType: HtfLiquidityDrawState['fiveMinuteMssConfirmationType'];
    postShiftState: HtfLiquidityDrawState['postShiftState'];
    externalLiquidityTarget: string | null;
    activeScanWindow: HtfLiquidityDrawState['activeScanWindow'];
    htfContextSufficiency: HtfLiquidityDrawState['htfContextSufficiency'];
    htfContextDataLimited: boolean;
    timeframeCoverage: HtfLiquidityDrawState['timeframeCoverage'];
    classificationReliability: HtfLiquidityDrawState['classificationReliability'];
    classificationReason: string;
    createsTradingPlanCandidate: false;
    approvesExecution: false;
    blockers: string[];
    chartReportPath: null;
  };
  timeframeMssEvidenceDiagnostics: {
    source: MultiTimeframeMssEvidenceLayer['source'];
    authority: MultiTimeframeMssEvidenceLayer['authority'];
    boundary: MultiTimeframeMssEvidenceLayer['boundary'];
    timeframes: Array<{
      timeframe: string;
      direction: string;
      status: string;
      displacementPresent: boolean;
      displacementScore: number;
      breaksStructure: boolean;
      evidenceTimestamp: string | null;
      completedBarStatus: string;
      barTimestampMode: string;
      barTimeZone: string;
      confidence: number;
      blockers: string[];
    }>;
    notes: string[];
    approvesExecution: false;
    changesTradeLogic: false;
  };
  activeTimeframeMssRulesetDiagnostics: ActiveTimeframeMssRulesetAudit;
  filesOrFunctionsImpacted: string[];
  smallestSafeCodeChangeRecommendation: string;
  advisoryOnlyDetectorRecommendation: {
    recommended: boolean;
    name: string | null;
    behavior: string[];
    suggestedText: string | null;
    purpose: string;
  };
  newPlanRecommendation: {
    recommendBuild: boolean;
    recommendationType: 'none' | 'advisory_watchlist' | 'scanner_bug_fix' | 'human_rule_review';
    recommendedName: string | null;
    reason: string;
    minimumSampleSizeBeforeRuleReview: number | null;
    mustRemainAdvisory: boolean;
    requiresSeparateApproval: true;
  };
  testsToAdd: string[];
  approvalBoundary: {
    diagnosticApprovesTrade: false;
    diagnosticChangesRules: false;
    diagnosticCreatesEntry: false;
    diagnosticCreatesTargets: false;
    diagnosticOverridesScanner: false;
    diagnosticPromotesModel: false;
    diagnosticBuildsNewPlan: false;
  };
}

function sortedBars(bars: NinjaBridgeBar[] | null | undefined): NinjaBridgeBar[] {
  return [...(bars || [])]
    .filter((bar) =>
      typeof bar.time === 'string' &&
      isValidPrice(bar.open) &&
      isValidPrice(bar.high) &&
      isValidPrice(bar.low) &&
      isValidPrice(bar.close)
    )
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
}

function cloneCandidate(candidate: SetupCandidate | null | undefined): SetupCandidate | null {
  return candidate ? JSON.parse(JSON.stringify(candidate)) as SetupCandidate : null;
}

function requestedDirection(input: BridgeDiagnosticReplayInput, bars: NinjaBridgeBar[]): 'LONG' | 'SHORT' | 'NO TRADE' {
  if (input.suspectedMoveDirection === 'LONG' || input.suspectedMoveDirection === 'SHORT') return input.suspectedMoveDirection;
  if (input.normalizedPlan?.decision === 'LONG' || input.normalizedPlan?.decision === 'SHORT') return input.normalizedPlan.decision;
  const first = bars[0];
  const last = bars[bars.length - 1];
  if (!first || !last) return 'NO TRADE';
  if (last.close > first.open) return 'LONG';
  if (last.close < first.open) return 'SHORT';
  return 'NO TRADE';
}

function bodyToRange(bar: NinjaBridgeBar): number {
  const range = bar.high - bar.low;
  return range > 0 ? Math.abs(bar.close - bar.open) / range : 0;
}

function barDirection(bar: NinjaBridgeBar): 'LONG' | 'SHORT' | 'NO TRADE' {
  if (bar.close > bar.open) return 'LONG';
  if (bar.close < bar.open) return 'SHORT';
  return 'NO TRADE';
}

function trendDirection(bars: NinjaBridgeBar[]): 'LONG' | 'SHORT' | 'NEUTRAL' | 'MISSING' {
  if (bars.length < 2) return 'MISSING';
  const first = bars[0];
  const last = bars[bars.length - 1];
  if (last.close > first.open) return 'LONG';
  if (last.close < first.open) return 'SHORT';
  return 'NEUTRAL';
}

function detectDisplacement(bars: NinjaBridgeBar[], direction: 'LONG' | 'SHORT' | 'NO TRADE'): NinjaBridgeBar | null {
  if (direction === 'NO TRADE') return null;
  const ranges = bars.map((bar) => bar.high - bar.low).filter((range) => range > 0);
  const averageRange = ranges.length ? ranges.reduce((sum, range) => sum + range, 0) / ranges.length : 0;
  return bars.find((bar) =>
    barDirection(bar) === direction &&
    bodyToRange(bar) >= 0.55 &&
    (bar.high - bar.low) >= Math.max(averageRange * 1.25, 2)
  ) || null;
}

function detectFvgs(bars: NinjaBridgeBar[], sourceTimeframe: '5m' | '15m'): DiagnosticFvgBound[] {
  const zones: DiagnosticFvgBound[] = [];
  for (let index = 2; index < bars.length; index += 1) {
    const left = bars[index - 2];
    const middle = bars[index - 1];
    const right = bars[index];
    if (left.high < right.low) {
      const lower = left.high;
      const upper = right.low;
      zones.push({
        direction: 'LONG',
        lower,
        upper,
        midpoint: (lower + upper) / 2,
        formedAt: right.time,
        sourceTimeframe,
        displacementTime: middle.time || null,
      });
    }
    if (left.low > right.high) {
      const lower = right.high;
      const upper = left.low;
      zones.push({
        direction: 'SHORT',
        lower,
        upper,
        midpoint: (lower + upper) / 2,
        formedAt: right.time,
        sourceTimeframe,
        displacementTime: middle.time || null,
      });
    }
  }
  return zones;
}

function reviewPullback(bars: NinjaBridgeBar[], zone: DiagnosticFvgBound | null, direction: 'LONG' | 'SHORT' | 'NO TRADE') {
  if (!zone || direction === 'NO TRADE') {
    return { pullbackBarTime: null, status: 'missing' as const, summary: 'No completed FVG zone was available for pullback review.' };
  }
  const afterZone = bars.filter((bar) => new Date(bar.time).getTime() > new Date(zone.formedAt).getTime());
  const pullback = afterZone.find((bar) => bar.low <= zone.upper && bar.high >= zone.lower);
  if (!pullback) {
    return { pullbackBarTime: null, status: 'missing' as const, summary: 'No completed pullback into the FVG was found.' };
  }
  if (direction === 'LONG') {
    if (pullback.close < zone.lower) return { pullbackBarTime: pullback.time, status: 'invalidated' as const, summary: 'Pullback closed below the bullish FVG lower bound.' };
    if (pullback.low < zone.lower) return { pullbackBarTime: pullback.time, status: 'pierced' as const, summary: 'Pullback pierced the bullish FVG but did not close through it.' };
    if (pullback.low <= zone.midpoint) return { pullbackBarTime: pullback.time, status: 'filled' as const, summary: 'Pullback traded into the bullish FVG midpoint area.' };
    return { pullbackBarTime: pullback.time, status: 'respected' as const, summary: 'Pullback touched the bullish FVG and held above its lower bound.' };
  }
  if (pullback.close > zone.upper) return { pullbackBarTime: pullback.time, status: 'invalidated' as const, summary: 'Pullback closed above the bearish FVG upper bound.' };
  if (pullback.high > zone.upper) return { pullbackBarTime: pullback.time, status: 'pierced' as const, summary: 'Pullback pierced the bearish FVG but did not close through it.' };
  if (pullback.high >= zone.midpoint) return { pullbackBarTime: pullback.time, status: 'filled' as const, summary: 'Pullback traded into the bearish FVG midpoint area.' };
  return { pullbackBarTime: pullback.time, status: 'respected' as const, summary: 'Pullback touched the bearish FVG and held below its upper bound.' };
}

function confirmationAfterPullback(bars: NinjaBridgeBar[], pullbackTime: string | null, direction: 'LONG' | 'SHORT' | 'NO TRADE'): string | null {
  if (!pullbackTime || direction === 'NO TRADE') return null;
  return bars.find((bar) =>
    new Date(bar.time).getTime() > new Date(pullbackTime).getTime() &&
    barDirection(bar) === direction &&
    bodyToRange(bar) >= 0.45
  )?.time || null;
}

function higherTimeframeConfirmation(input: BridgeDiagnosticReplayInput, direction: 'LONG' | 'SHORT' | 'NO TRADE'): DiagnosticConfirmation {
  if (direction === 'NO TRADE') return 'missing';
  const frames = [input.bars30m, input.bars60m, input.bars120m, input.bars240m, input.barsDaily].map(sortedBars).filter((bars) => bars.length >= 2);
  if (!frames.length) return 'missing';
  const trends = frames.map(trendDirection).filter((trend) => trend !== 'MISSING');
  const supports = trends.filter((trend) => trend === direction).length;
  const conflicts = trends.filter((trend) => trend !== direction && trend !== 'NEUTRAL').length;
  if (supports > 0 && conflicts === 0) return 'supported';
  if (supports > 0 && conflicts > 0) return 'mixed';
  if (supports === 0 && conflicts > 0) return 'conflicted';
  return 'missing';
}

function fifteenMinuteConfirmation(bars15m: NinjaBridgeBar[], direction: 'LONG' | 'SHORT' | 'NO TRADE'): FifteenMinuteConfirmation {
  if (direction === 'NO TRADE' || bars15m.length < 2) return 'missing';
  const displacement = detectDisplacement(bars15m, direction);
  const trend = trendDirection(bars15m);
  const opposite = direction === 'LONG' ? 'SHORT' : 'LONG';
  if (displacement && trend === direction) return 'confirmed';
  if (trend === direction) return 'mixed';
  if (trend === opposite) return 'rejected';
  return 'missing';
}

function candidatePool(input: BridgeDiagnosticReplayInput): SetupCandidate[] {
  return [
    ...(input.approvedSetupCandidates || []),
    ...(input.normalizedPlan?.setupCandidates || []),
    input.scannerSelectedCandidate || null,
    input.normalizedPlan?.opportunitySelection?.bestExecutableCandidate || null,
    input.normalizedPlan?.opportunitySelection?.bestConditionalCandidate || null,
  ].filter(Boolean).map((candidate) => cloneCandidate(candidate) as SetupCandidate);
}

function candidateIsApprovedExecutable(candidate: SetupCandidate): boolean {
  return (
    (candidate.setupType === SetupType.SweepMssFvgRetrace || candidate.setupType === SetupType.TurtleSoup) &&
    candidate.executionStatus === ExecutionStatus.Executable &&
    candidate.direction !== 'NO TRADE' &&
    !candidate.blockReason
  );
}

function candidateAlreadyTriggered(input: BridgeDiagnosticReplayInput, candidate: SetupCandidate | null, currentPrice: number | null): boolean {
  if (input.normalizedPlan?.earlyMoveReview?.status === 'already_triggered_no_fresh_entry') return true;
  if (input.scannerState === 'Missed') return true;
  if (!candidate || !isValidPrice(currentPrice) || !isValidPrice(candidate.entry)) return false;
  if (candidate.direction === 'LONG') {
    return currentPrice > candidate.entry + Math.max(candidate.riskPoints || 0, 3);
  }
  if (candidate.direction === 'SHORT') {
    return currentPrice < candidate.entry - Math.max(candidate.riskPoints || 0, 3);
  }
  return false;
}

function buildGateReview(
  input: BridgeDiagnosticReplayInput,
  htf: DiagnosticConfirmation,
): DiagnosticGateReview[] {
  const candidates = candidatePool(input);
  const model1 = candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);
  const turtle = candidates.find((candidate) => candidate.setupType === SetupType.TurtleSoup);
  const reviewFor = (
    model: DiagnosticGateReview['model'],
    candidate: SetupCandidate | undefined,
    required: string[],
  ): DiagnosticGateReview => {
    const executable = Boolean(candidate && candidateIsApprovedExecutable(candidate));
    return {
      model,
      passedGates: candidate?.evidence || [],
      failedGates: candidate?.blockReason ? [candidate.blockReason] : [],
      missingRequiredConditions: candidate?.missingEvidence?.length ? candidate.missingEvidence : executable ? [] : required,
      higherTimeframeConfirmation: htf,
      executableUnderCurrentRules: executable && (htf === 'supported' || htf === 'mixed'),
    };
  };
  return [
    reviewFor('Model 1 Sweep -> MSS -> FVG Retrace', model1, [
      'Liquidity sweep/raid',
      'Reclaim after sweep',
      'Displacement',
      'Market structure shift',
      'FVG retrace',
      'Valid risk and minimum target room',
    ]),
    reviewFor('Turtle Soup Reversal', turtle, [
      'Swept swing/session level',
      'Reclaim back inside level',
      'Stop beyond sweep wick',
      'Opposing liquidity target with at least 2.0R',
    ]),
  ];
}

function findBestApprovedCandidate(input: BridgeDiagnosticReplayInput, htf: DiagnosticConfirmation): SetupCandidate | null {
  return candidatePool(input)
    .filter(candidateIsApprovedExecutable)
    .filter((candidate) => htf === 'supported' || htf === 'mixed')
    .sort((a, b) => (b.decisionQualityScore || b.rankScore || b.priority || 0) - (a.decisionQualityScore || a.rankScore || a.priority || 0))[0] || null;
}

function classify(args: {
  approvedCandidate: SetupCandidate | null;
  alreadyTriggered: boolean;
  htf: DiagnosticConfirmation;
  fifteen: FifteenMinuteConfirmation;
  ictComponent: boolean;
  scannerAlertSent: boolean;
}): BridgeDiagnosticClassification {
  const htfAcceptable = args.htf === 'supported' || args.htf === 'mixed';
  const fifteenAcceptable = args.fifteen === 'confirmed' || args.fifteen === 'mixed';
  if (args.approvedCandidate && htfAcceptable && fifteenAcceptable && !args.alreadyTriggered && !args.scannerAlertSent) {
    return 'A_VALID_APPROVED_NO_ALERT';
  }
  if (args.approvedCandidate && htfAcceptable && fifteenAcceptable && args.alreadyTriggered) {
    return 'B_APPROVED_ALREADY_TRIGGERED';
  }
  if (args.ictComponent) return 'C_UNAPPROVED_ICT_FVG_WATCHLIST';
  return 'D_NO_VALID_SETUP';
}

function labelFor(classification: BridgeDiagnosticClassification): string {
  switch (classification) {
    case 'A_VALID_APPROVED_NO_ALERT':
      return 'Valid approved executable setup, but no alert fired';
    case 'B_APPROVED_ALREADY_TRIGGERED':
      return 'Valid approved setup, but already triggered / no fresh entry';
    case 'C_UNAPPROVED_ICT_FVG_WATCHLIST':
      return 'ICT-style displacement/FVG pullback watchlist condition, not approved executable setup';
    case 'D_NO_VALID_SETUP':
      return 'No valid setup and no approved watchlist condition';
  }
}

function targetOutcome(
  classification: BridgeDiagnosticClassification,
  candidate: SetupCandidate | null,
  bars5m: NinjaBridgeBar[],
) {
  const authorityNote = 'Post-trigger target replay is diagnostic only and cannot retroactively approve invalid setup gates.';
  if (
    (classification !== 'A_VALID_APPROVED_NO_ALERT' && classification !== 'B_APPROVED_ALREADY_TRIGGERED') ||
    !candidate ||
    !isValidPrice(candidate.entry) ||
    !isValidPrice(candidate.stop) ||
    !isValidPrice(candidate.target1) ||
    !isValidPrice(candidate.target2)
  ) {
    return {
      applicable: false,
      entry: null,
      stop: null,
      t1: null,
      t2: null,
      firstCompletedBarAfterTrigger: null,
      t1Hit: null,
      t1HitTime: null,
      t2Hit: null,
      t2HitTime: null,
      stopHitBeforeTargets: null,
      stopHitTime: null,
      maximumFavorableExcursion: null,
      maximumAdverseExcursion: null,
      finalReplayOutcome: 'not applicable' as const,
      authorityNote,
    };
  }

  const entry = candidate.entry;
  const stop = candidate.stop;
  const t1 = candidate.target1;
  const t2 = candidate.target2;
  const direction = candidate.direction;
  const triggerIndex = bars5m.findIndex((bar) =>
    direction === 'LONG'
      ? bar.high >= entry
      : bar.low <= entry
  );
  const replayBars = triggerIndex >= 0 ? bars5m.slice(triggerIndex + 1) : [];
  let t1HitTime: string | null = null;
  let t2HitTime: string | null = null;
  let stopHitTime: string | null = null;
  let mfe = 0;
  let mae = 0;
  for (const bar of replayBars) {
    if (direction === 'LONG') {
      mfe = Math.max(mfe, bar.high - entry);
      mae = Math.max(mae, entry - bar.low);
      if (!stopHitTime && bar.low <= stop) stopHitTime = bar.time;
      if (!t1HitTime && bar.high >= t1) t1HitTime = bar.time;
      if (!t2HitTime && bar.high >= t2) t2HitTime = bar.time;
    } else {
      mfe = Math.max(mfe, entry - bar.low);
      mae = Math.max(mae, bar.high - entry);
      if (!stopHitTime && bar.high >= stop) stopHitTime = bar.time;
      if (!t1HitTime && bar.low <= t1) t1HitTime = bar.time;
      if (!t2HitTime && bar.low <= t2) t2HitTime = bar.time;
    }
  }
  const stopBeforeT1 = Boolean(stopHitTime && (!t1HitTime || new Date(stopHitTime).getTime() <= new Date(t1HitTime).getTime()));
  const finalReplayOutcome: BridgeDiagnosticReplayReport['targetOutcomeReview']['finalReplayOutcome'] =
    classification === 'B_APPROVED_ALREADY_TRIGGERED'
      ? 'already extended before valid fresh entry'
      : stopBeforeT1
        ? 'stopped before T1'
        : t2HitTime
          ? 'T1 and T2 hit'
          : t1HitTime
            ? 'T1 hit only'
            : 'no target hit';
  return {
    applicable: true,
    entry,
    stop,
    t1,
    t2,
    firstCompletedBarAfterTrigger: replayBars[0]?.time || null,
    t1Hit: Boolean(t1HitTime),
    t1HitTime,
    t2Hit: Boolean(t2HitTime),
    t2HitTime,
    stopHitBeforeTargets: stopBeforeT1,
    stopHitTime,
    maximumFavorableExcursion: mfe,
    maximumAdverseExcursion: mae,
    finalReplayOutcome,
    authorityNote,
  };
}

function targetLabelFromCandidate(candidate: SetupCandidate | null, direction: 'LONG' | 'SHORT' | 'NO TRADE'): string | undefined {
  if (!candidate || direction === 'NO TRADE') return undefined;
  if (candidate.htfLiquidityDrawState?.externalLiquidityTarget) {
    return candidate.htfLiquidityDrawState.externalLiquidityTarget;
  }
  const target = candidate.targetObjectivePlan?.nearestLiquidityTarget ||
    candidate.targetObjectivePlan?.liquidityTarget1 ||
    candidate.targetObjectivePlan?.liquidityTarget2 ||
    candidate.targetObjectivePlan?.liquidityRunnerTarget;
  if (target?.label && isValidPrice(target.price)) return `${target.label} ${target.price}`;
  if (isValidPrice(candidate.target2)) return `App T2 context ${candidate.target2}`;
  if (isValidPrice(candidate.target1)) return `App T1 context ${candidate.target1}`;
  return undefined;
}

function diagnosticTargetCandidate(input: BridgeDiagnosticReplayInput, candidate: SetupCandidate | null): SetupCandidate | null {
  return candidate ||
    input.scannerSelectedCandidate ||
    input.normalizedPlan?.opportunitySelection?.bestConditionalCandidate ||
    input.normalizedPlan?.opportunitySelection?.bestExecutableCandidate ||
    candidatePool(input)[0] ||
    null;
}

function buildHtfMssDiagnostics(input: BridgeDiagnosticReplayInput, direction: 'LONG' | 'SHORT' | 'NO TRADE', candidate: SetupCandidate | null): BridgeDiagnosticReplayReport['htfMssDiagnostics'] {
  const targetLabel = targetLabelFromCandidate(diagnosticTargetCandidate(input, candidate), direction);
  const sorted5m = sortedBars(input.bars5m);
  const sorted5mContext = sortedBars(input.bars5mContext?.length ? input.bars5mContext : input.bars5m);
  const state = buildHtfLiquidityDrawState({
    bars4H: sortedBars(input.bars240m),
    bars2H: sortedBars(input.bars120m),
    bars1H: sortedBars(input.bars60m),
    bars15M: sortedBars(input.bars15m),
    bars5M: sorted5mContext,
    externalBuySideLiquidityTarget: direction === 'LONG' ? targetLabel : undefined,
    externalSellSideLiquidityTarget: direction === 'SHORT' ? targetLabel : undefined,
    chartTimestamp: sorted5m.at(-1)?.time || null,
  });

  return {
    source: state.source,
    authority: state.authority,
    boundary: state.boundary,
    classification: state.classification,
    timeframeStack: state.timeframeStack.map((item) => ({
      timeframe: item.timeframe,
      direction: item.direction,
      status: item.status,
      lifecycleState: item.lifecycleState,
      confidence: item.confidence,
    })),
    raidState: state.raidState,
    reclaimStatus: state.reclaimStatus,
    fiveMinuteMssTriggerConfirmed: state.fiveMinuteMssTriggerConfirmed,
    fiveMinuteMssConfirmationType: state.fiveMinuteMssConfirmationType,
    postShiftState: state.postShiftState,
    externalLiquidityTarget: state.externalLiquidityTarget || null,
    activeScanWindow: state.activeScanWindow,
    htfContextSufficiency: state.htfContextSufficiency,
    htfContextDataLimited: state.htfContextDataLimited,
    timeframeCoverage: state.timeframeCoverage,
    classificationReliability: state.classificationReliability,
    classificationReason: state.classificationReason,
    createsTradingPlanCandidate: false,
    approvesExecution: false,
    blockers: state.blockers,
    chartReportPath: null,
  };
}

function buildTimeframeMssEvidenceDiagnostics(input: BridgeDiagnosticReplayInput): BridgeDiagnosticReplayReport['timeframeMssEvidenceDiagnostics'] {
  const sorted5m = sortedBars(input.bars5mContext?.length ? input.bars5mContext : input.bars5m);
  const sortedExecution5m = sortedBars(input.bars5m);
  const layer = buildMultiTimeframeMssEvidenceLayer({
    barsByTimeframe: {
      '5M': sorted5m,
      '15M': sortedBars(input.bars15m),
      '60M': sortedBars(input.bars60m),
      '120M': sortedBars(input.bars120m),
      '240M': sortedBars(input.bars240m),
    },
    asOfTimestamp: sortedExecution5m.at(-1)?.time || sorted5m.at(-1)?.time || null,
    barTimestampMode: 'open',
    barTimeZone: 'eastern',
  });

  return {
    source: layer.source,
    authority: layer.authority,
    boundary: layer.boundary,
    timeframes: Object.values(layer.timeframes).map((item) => ({
      timeframe: item.timeframe,
      direction: item.direction,
      status: item.status,
      displacementPresent: item.displacementQuality.present,
      displacementScore: item.displacementQuality.score,
      breaksStructure: item.breaksStructure,
      evidenceTimestamp: item.evidenceTimestamp,
      completedBarStatus: item.completedBarStatus,
      barTimestampMode: item.barTimestampMode,
      barTimeZone: item.barTimeZone,
      confidence: item.confidence,
      blockers: item.blockers,
    })),
    notes: layer.notes,
    approvesExecution: false,
    changesTradeLogic: false,
  };
}

function newPlanRecommendation(classification: BridgeDiagnosticClassification) {
  if (classification === 'A_VALID_APPROVED_NO_ALERT') {
    return {
      recommendBuild: true,
      recommendationType: 'scanner_bug_fix' as const,
      recommendedName: null,
      reason: 'Current approved rules produced a fresh setup but no alert was sent; review scanner alert gating.',
      minimumSampleSizeBeforeRuleReview: null,
      mustRemainAdvisory: false,
      requiresSeparateApproval: true as const,
    };
  }
  if (classification === 'B_APPROVED_ALREADY_TRIGGERED') {
    return {
      recommendBuild: true,
      recommendationType: 'human_rule_review' as const,
      recommendedName: 'Already-triggered / no-fresh-entry diagnostic tracking',
      reason: 'Approved setup evidence was present but the move was no longer a fresh entry.',
      minimumSampleSizeBeforeRuleReview: 20,
      mustRemainAdvisory: true,
      requiresSeparateApproval: true as const,
    };
  }
  if (classification === 'C_UNAPPROVED_ICT_FVG_WATCHLIST') {
    return {
      recommendBuild: true,
      recommendationType: 'advisory_watchlist' as const,
      recommendedName: '15M + 5M ICT-Style Displacement/FVG Pullback Watchlist',
      reason: 'The move showed displacement plus FVG pullback behavior, but current approved executable gates were not satisfied.',
      minimumSampleSizeBeforeRuleReview: 30,
      mustRemainAdvisory: true,
      requiresSeparateApproval: true as const,
    };
  }
  return {
    recommendBuild: false,
    recommendationType: 'none' as const,
    recommendedName: null,
    reason: 'No valid approved setup or advisory-quality ICT-style component was detected.',
    minimumSampleSizeBeforeRuleReview: null,
    mustRemainAdvisory: true,
    requiresSeparateApproval: true as const,
  };
}

function matchingAuditEvents(input: BridgeDiagnosticReplayInput): DiagnosticScannerAuditEvent[] {
  return [...(input.scannerAuditEvents || [])].filter((event) => {
    if (event.tradeDate && event.tradeDate !== input.tradeDate) return false;
    if (event.instrument && event.instrument.toUpperCase() !== String(input.instrument).toUpperCase()) return false;
    if (event.session && !String(event.session).toLowerCase().includes(input.session.replace('replay_', ''))) return false;
    return true;
  });
}

function auditSummary(classification: BridgeDiagnosticClassification, events: DiagnosticScannerAuditEvent[]): string {
  if (!events.length) return 'scannerAuditStatus: missing. No audit file matched this diagnostic window.';
  const tradeEvents = events.filter((event) => event.alertType === 'trade');
  const watchlistEvents = events.filter((event) => event.alertType === 'watchlist');
  const healthEvents = events.filter((event) => event.alertType === 'health');
  const sent = events.some((event) => event.discordAlertSent === true || event.alertType === 'trade');
  const suppressed = events.find((event) => event.suppressionOrBlockReason);
  if (classification === 'A_VALID_APPROVED_NO_ALERT' || classification === 'B_APPROVED_ALREADY_TRIGGERED') {
    if (sent) return `scannerAuditStatus: present. Audit history shows ${tradeEvents.length} trade alert audit event(s); review exact send state before calling an alert bug.`;
    if (suppressed) return `scannerAuditStatus: present. Audit history shows suppression/block reason: ${suppressed.suppressionOrBlockReason}.`;
    return 'scannerAuditStatus: present. Audit files exist, but no trade alert send evidence was found.';
  }
  return `scannerAuditStatus: present. Events found: trade=${tradeEvents.length}, watchlist=${watchlistEvents.length}, health=${healthEvents.length}. Audit context is supporting evidence only.`;
}

function phase9FCheck(status: Phase9FReplayCheckStatus, summary: string): Phase9FReplayCheck {
  return { status, summary };
}

function deskStateHasLineInSand(state: DeskState): boolean {
  return [
    state.lineInSand,
    state.primaryDeskPlay.lineInSand,
    state.primaryDeskPlay.longAbove,
    state.primaryDeskPlay.shortBelow,
  ].some((value) => typeof value === 'number' && Number.isFinite(value));
}

function deskStateExplainsNoTradeState(state: DeskState): boolean {
  const text = [
    state.suppressionReason,
    state.nextTrigger,
    state.invalidation,
    state.promotion.promotionTrigger,
    ...state.promotion.missingProof,
    ...state.promotion.blockedBy,
    ...state.notes,
  ].filter(Boolean).join(' ');
  return text.trim().length > 0;
}

function buildPhase9FReplayValidation(args: {
  deskStates: DeskState[];
  deskStateReplayValidation: DeskStateReplayValidation;
  moveObserved: boolean;
}): Phase9FReplayValidation {
  const states = [...args.deskStates];
  const hasDeskStates = states.length > 0;
  const noTradeStates = states.filter((state) =>
    state.visibilityMode === 'HOLD_WITH_REASON' ||
    state.visibilityMode === 'NO_TRADE_WITH_REASON' ||
    state.visibilityMode === 'DATA_QUALITY_BLOCKER' ||
    state.promotion.currentStage === 'no_trade'
  );

  const checks: Phase9FReplayValidation['checks'] = {
    watchAppearedBeforeMove: !hasDeskStates
      ? phase9FCheck('fail', 'No DeskState snapshots were available for replay validation.')
      : !args.moveObserved
        ? phase9FCheck('not_applicable', 'Replay did not include a measurable move/target outcome; watch-before-move could not be proven.')
        : args.deskStateReplayValidation.watchAppearedBeforePlan
          ? phase9FCheck('pass', 'A scanner-owned watch snapshot appeared before plan/review promotion in the replay path.')
          : phase9FCheck('fail', 'Replay did not show a scanner-owned watch before the later move or plan/review state.'),
    lineInSandMatchedMarketStructure: !hasDeskStates
      ? phase9FCheck('fail', 'No DeskState snapshots were available to inspect line-in-the-sand metadata.')
      : states.some(deskStateHasLineInSand)
        ? phase9FCheck('pass', 'Replay snapshots carried scanner-owned line-in-the-sand or directional battle-line metadata.')
        : phase9FCheck('fail', 'Replay snapshots did not expose a scanner-owned line in the sand for the command path.'),
    planPromotedCorrectly: args.deskStateReplayValidation.promotionPathObserved && args.deskStateReplayValidation.watchToPlanPromotionProofed
      ? phase9FCheck('pass', 'DeskState replay observed watch-to-plan continuity with proof/blocker metadata and canPromoteNow=false.')
      : phase9FCheck('fail', 'DeskState replay did not prove watch-to-plan continuity with Phase 9E proof metadata.'),
    noChasePreserved: args.deskStateReplayValidation.noChasePreserved
      ? phase9FCheck('pass', 'Non-executable replay states preserved no-chase, completed-5M, or protected-structure language.')
      : phase9FCheck('fail', 'At least one non-executable replay state lacked no-chase/completed-5M/protected-structure language.'),
    noTradeExplainedClearly: noTradeStates.length === 0
      ? phase9FCheck('not_applicable', 'Replay path did not include a hold, no-trade, or data-quality blocker DeskState.')
      : noTradeStates.every(deskStateExplainsNoTradeState)
        ? phase9FCheck('pass', 'Every hold/no-trade/data-quality replay state carried an explicit reason or next condition.')
        : phase9FCheck('fail', 'At least one hold/no-trade/data-quality replay state lacked a clear reason.'),
    discordRagUiReflectSameDeskState: args.deskStateReplayValidation.singleSourceOfTruthPresent && args.deskStateReplayValidation.discordRagUiAligned
      ? phase9FCheck('pass', 'DeskState, visibility metadata, lifecycle trace, and Discord/RAG/UI-facing fields stayed aligned.')
      : phase9FCheck('fail', 'DeskState source-of-truth or visibility/Discord/canExecute alignment diverged in replay.'),
  };
  const checkValues = Object.values(checks);
  const status = !hasDeskStates
    ? 'insufficient_replay_data'
    : checkValues.some((check) => check.status === 'fail')
      ? 'fail'
      : 'pass';

  return {
    sourceOfTruth: 'bridge_diagnostic_phase9f_replay_validation',
    status,
    checks,
    findings: checkValues.map((check) => check.summary),
    authority: {
      replayApprovesTrade: false,
      replayChangesRules: false,
      replayChangesCanExecute: false,
      replayChangesScannerBehavior: false,
      replayChangesDiscordBehavior: false,
      replayChangesBridgeBehavior: false,
    },
  };
}

export function runBridgeDiagnosticReplay(input: BridgeDiagnosticReplayInput): BridgeDiagnosticReplayReport {
  const bars5m = sortedBars(input.bars5m);
  const bars15m = sortedBars(input.bars15m);
  const direction = requestedDirection(input, bars5m);
  const htf = higherTimeframeConfirmation(input, direction);
  const fifteen = fifteenMinuteConfirmation(bars15m, direction);
  const fiveMinuteDisplacement = detectDisplacement(bars5m, direction);
  const fvgBounds = [
    ...detectFvgs(bars5m, '5m'),
    ...detectFvgs(bars15m, '15m'),
  ].filter((zone) => direction === 'NO TRADE' || zone.direction === direction);
  const primaryFvg = fvgBounds.find((zone) => zone.sourceTimeframe === '5m') || fvgBounds[0] || null;
  const pullbackReview = reviewPullback(bars5m, primaryFvg, direction);
  const confirmationBarTime = confirmationAfterPullback(bars5m, pullbackReview.pullbackBarTime, direction);
  const approvedCandidate = findBestApprovedCandidate(input, htf);
  const currentPrice = bars5m[bars5m.length - 1]?.close ?? null;
  const alreadyTriggered = candidateAlreadyTriggered(input, approvedCandidate, currentPrice);
  const ictComponent = Boolean(fiveMinuteDisplacement && primaryFvg && pullbackReview.status !== 'missing' && pullbackReview.status !== 'invalidated');
  const finalClassification = classify({
    approvedCandidate,
    alreadyTriggered,
    htf,
    fifteen,
    ictComponent,
    scannerAlertSent: Boolean(input.scannerAlertSent),
  });
  const gateReview = buildGateReview(input, htf);
  const targetReview = targetOutcome(finalClassification, approvedCandidate, bars5m);
  const htfMssDiagnostics = buildHtfMssDiagnostics(input, direction, approvedCandidate);
  const timeframeMssEvidenceDiagnostics = buildTimeframeMssEvidenceDiagnostics(input);
  const activeTimeframeMssRulesetDiagnostics = summarizeActiveTimeframeMssRuleset(input.scannerSelectedCandidate || approvedCandidate);
  const htfContextSummary = htfMssDiagnostics.htfContextDataLimited
    ? `${htfMssDiagnostics.classificationReason} ${htfMssDiagnostics.htfContextSufficiency.blockers.join(' ')}`
    : `HTF context sufficient. Classification reliability=${htfMssDiagnostics.classificationReliability}.`;
  const planApplicable = finalClassification === 'A_VALID_APPROVED_NO_ALERT' || finalClassification === 'B_APPROVED_ALREADY_TRIGGERED';
  const recommendation = newPlanRecommendation(finalClassification);
  const auditEvents = matchingAuditEvents(input);
  const deskStates = auditEvents
    .map((event) => event.deskState)
    .filter((state): state is DeskState => Boolean(state));
  const deskStateReplayValidation = validateDeskStateReplayPath(deskStates);
  const phase9FReplayValidation = buildPhase9FReplayValidation({
    deskStates,
    deskStateReplayValidation,
    moveObserved: Boolean(fiveMinuteDisplacement || confirmationBarTime || targetReview.t1Hit || targetReview.t2Hit || targetReview.stopHitBeforeTargets),
  });

  return {
    finalClassification,
    classificationLabel: labelFor(finalClassification),
    tradeDate: input.tradeDate,
    instrument: input.instrument,
    replayWindow: { ...input.replayWindow },
    largerTimeframeContextSummary: [
      `HTF confirmation=${htf}.`,
      `30M bars=${input.bars30m?.length || 0}, 60M bars=${input.bars60m?.length || 0}, 120M bars=${input.bars120m?.length || 0}, 4H bars=${input.bars240m?.length || 0}, Daily bars=${input.barsDaily?.length || 0}.`,
      htfContextSummary,
      htf === 'conflicted' ? 'Larger timeframe context conflicted with the suspected move.' : 'Larger timeframe context was treated as reporting context only.',
    ].join(' '),
    higherTimeframeConfirmation: htf,
    fifteenMinuteConfirmation: fifteen,
    fiveMinuteReview: {
      direction,
      displacementPresent: Boolean(fiveMinuteDisplacement),
      displacementTime: fiveMinuteDisplacement?.time || null,
      displacementRangePoints: fiveMinuteDisplacement ? fiveMinuteDisplacement.high - fiveMinuteDisplacement.low : null,
      fvgPullbackPresent: ictComponent,
      confirmationBarTime,
      summary: fiveMinuteDisplacement
        ? `Completed 5M bars show ${direction} displacement${primaryFvg ? ' with an FVG candidate' : ' without a completed FVG candidate'}.`
        : 'Completed 5M bars did not show a diagnostic displacement candle in the suspected direction.',
    },
    fvgBounds,
    pullbackReview,
    approvedSetupGateReview: gateReview,
    scannerAlertReview: {
      candidateCreated: candidatePool(input).length > 0,
      candidateStatus: input.scannerSelectedCandidate?.executionStatus || input.normalizedPlan?.decisionStatus || null,
      selectedCandidateSetupType: input.scannerSelectedCandidate?.setupType || approvedCandidate?.setupType || null,
      selectedCandidateDirection: input.scannerSelectedCandidate?.direction || approvedCandidate?.direction || null,
      alertState: input.scannerState || null,
      alertSent: Boolean(input.scannerAlertSent),
      reason: input.scannerAlertReason || auditSummary(finalClassification, auditEvents) || (input.scannerAlertSent ? 'Scanner alert was reported as sent.' : 'No scanner alert was reported in diagnostic input.'),
    },
    scannerAuditContext: {
      scannerAuditStatus: auditEvents.length ? 'present' : 'missing',
      matchingEvents: auditEvents,
      summary: auditSummary(finalClassification, auditEvents),
      warnings: auditEvents.flatMap((event) => event.auditWarnings || []),
    },
    deskStateReplayValidation,
    phase9FReplayValidation,
    tradePlanFeasibility: {
      applicable: planApplicable,
      candidateEntryTrigger: planApplicable ? approvedCandidate?.entry ?? null : null,
      candidateStop: planApplicable ? approvedCandidate?.stop ?? null : null,
      stopDistanceRisk: planApplicable ? approvedCandidate?.riskPoints ?? null : null,
      t1: planApplicable ? approvedCandidate?.target1 ?? null : null,
      t2: planApplicable ? approvedCandidate?.target2 ?? null : null,
      higherTimeframeTargetRoom: htf,
      freshEntryExisted: planApplicable && !alreadyTriggered,
      alreadyTriggered: planApplicable && alreadyTriggered,
      summary: planApplicable
        ? 'Feasibility reflects existing approved candidate data only.'
        : 'Not applicable. Advisory-only or no-setup classifications do not create entry, stop, risk, T1, or T2.',
    },
    targetOutcomeReview: targetReview,
    htfMssDiagnostics,
    timeframeMssEvidenceDiagnostics,
    activeTimeframeMssRulesetDiagnostics,
    filesOrFunctionsImpacted: [
      'src/lib/ninjaTraderBridge.ts::buildNinjaChartContext',
      'src/lib/setupScanner.ts::scanSetupCandidates',
      'src/lib/tradeDecisionPipeline.ts::runTradeDecisionPipeline',
      'src/lib/tradePlan.ts::normalizeTradePlan',
      'src/agents/scannerPlanSelectionAgent.ts::selectScannerPlan',
      'tools/automation/nt-scanner.ts::shouldSendScannerAlert path',
    ],
    smallestSafeCodeChangeRecommendation:
      finalClassification === 'A_VALID_APPROVED_NO_ALERT'
        ? 'Investigate scanner alert gating/state suppression with a focused regression fixture. Do not change setup rules.'
        : 'No scanner bug fix is recommended by this diagnostic classification.',
    advisoryOnlyDetectorRecommendation: {
      recommended: finalClassification === 'C_UNAPPROVED_ICT_FVG_WATCHLIST',
      name: finalClassification === 'C_UNAPPROVED_ICT_FVG_WATCHLIST' ? '15M + 5M ICT-Style Displacement/FVG Pullback Watchlist' : null,
      behavior: [
        'canExecute: false',
        'no entry',
        'no stop',
        'no T1/T2',
        'no risk calculation as executable plan',
        'no outcome buttons',
        'Discord text only',
      ],
      suggestedText: finalClassification === 'C_UNAPPROVED_ICT_FVG_WATCHLIST'
        ? 'ICT-style FVG pullback forming. Watch only - wait for current approved rules and higher-timeframe confirmation.'
        : null,
      purpose: 'Collect 20-30 examples before deciding whether a human-approved rule review is warranted.',
    },
    newPlanRecommendation: recommendation,
    testsToAdd: [
      'Approved executable setup with no scanner alert classifies as A.',
      'Approved stale/already-triggered setup classifies as B.',
      'Displacement/FVG pullback lacking approved gates classifies as C.',
      'Weak/no setup classifies as D.',
      'Advisory classifications never create entry/stop/T1/T2.',
    ],
    approvalBoundary: {
      diagnosticApprovesTrade: false,
      diagnosticChangesRules: false,
      diagnosticCreatesEntry: false,
      diagnosticCreatesTargets: false,
      diagnosticOverridesScanner: false,
      diagnosticPromotesModel: false,
      diagnosticBuildsNewPlan: false,
    },
  };
}
