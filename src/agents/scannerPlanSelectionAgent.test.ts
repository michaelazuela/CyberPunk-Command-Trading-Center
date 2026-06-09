import assert from 'node:assert/strict';
import { resolveScannerWindow, shouldSendScannerAlert } from '../lib/localScannerEngine';
import { buildNinjaChartContext, type NinjaBridgeBar } from '../lib/ninjaTraderBridge';
import { buildAppTradePlan } from '../lib/planEngine';
import { ExecutionStatus, NoTradeReason, SetupCandidateStatus, SetupType, TradeDecisionStatus, type SetupCandidate } from '../types';
import { selectScannerPlan } from './scannerPlanSelectionAgent';

function candidate(overrides: Partial<SetupCandidate> = {}): SetupCandidate {
  return {
    setupType: SetupType.LiquiditySweep,
    scenarioLabel: 'Liquidity Sweep Reversal failed breakdown wick rejection impulse market structure shift imbalance discount',
    direction: 'LONG',
    detectedStatus: SetupCandidateStatus.Detected,
    confidence: 'High',
    priority: 90,
    entry: 100,
    stop: 96,
    target1: 108,
    target2: 108,
    riskPoints: 4,
    invalidation: 'Invalid below protected swing low.',
    rankScore: 100,
    evidence: ['sweep/reclaim confirmed', 'local market structure shift confirmed', 'expansion impulse confirmed'],
    missingEvidence: [],
    executionStatus: ExecutionStatus.Conditional,
    blockReason: null,
    requiredTrigger: '5M close above reclaim level, then pullback holds.',
    nextAction: 'Wait for reclaim retest.',
    reducedRiskPlan: null,
    ...overrides,
  };
}

function bar(time: string, open: number, high: number, low: number, close: number): NinjaBridgeBar {
  return { time, open, high, low, close, volume: 1 };
}

const staleNormalizedCandidate = candidate({
  entry: 100,
  stop: 96,
  target1: 106,
  target2: 108,
  riskPoints: 4,
  executionStatus: ExecutionStatus.Executable,
});
const staleNormalizedPlan: any = {
  canExecute: true,
  decisionStatus: TradeDecisionStatus.ApprovedTrade,
  decision: 'LONG',
  entry: 100,
  stop: 96,
  t1: 106,
  t2: 108,
  setupCandidates: [staleNormalizedCandidate],
  opportunitySelection: { bestExecutableCandidate: staleNormalizedCandidate },
  earlyMoveReview: { status: 'already_triggered_no_fresh_entry', action: 'No fresh entry.' },
};
const stalePlanBefore = JSON.stringify(staleNormalizedPlan);
const staleSelection = selectScannerPlan({ normalized: staleNormalizedPlan, currentPrice: 109 });
assert.equal(staleSelection.stateForAlert, 'Missed');
assert.equal(staleSelection.candidate, null);
assert.equal(staleSelection.reviewStatus, 'already_triggered_no_fresh_entry');
assert.equal(staleSelection.stale.stale, true);
assert.ok(staleSelection.auditWarnings.some((warning) => warning.includes('already_triggered_no_fresh_entry')));
assert.equal(JSON.stringify(staleNormalizedPlan), stalePlanBefore);

const contextOnlyEarlyMoveSelection = selectScannerPlan({
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    setupCandidates: [],
    earlyMoveReview: { status: 'already_triggered_no_fresh_entry', action: 'No fresh entry without candidate proof.' },
  } as any,
  currentPrice: 109,
});
assert.equal(contextOnlyEarlyMoveSelection.stateForAlert, 'TriggerPending');
assert.equal(contextOnlyEarlyMoveSelection.candidate, null);
assert.equal(contextOnlyEarlyMoveSelection.reviewStatus, 'early_move_review_no_valid_candidate');
assert.equal(contextOnlyEarlyMoveSelection.stale.stale, false);
assert.ok(contextOnlyEarlyMoveSelection.auditWarnings.some((warning) => warning.includes('context only')));

const humanReviewOpeningDrive = candidate({
  setupType: SetupType.OpeningDriveFvgContinuation,
  direction: 'SHORT',
  executionStatus: ExecutionStatus.Conditional,
  candidateState: 'HUMAN_REVIEW_READY',
  entry: 7472.75,
  stop: 7491.25,
  target1: 7445,
  target2: 7435.75,
  riskPoints: 18.5,
  humanReview: {
    status: 'HumanReviewReady',
    canExecute: false,
    requiresTraderConfirmation: true,
    discordTradePlanEligible: true,
    reason: 'Opening-drive FVG continuation is structurally qualified for human review.',
  },
});
const humanReviewEarlyMoveSelection = selectScannerPlan({
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.ConditionalTrade,
    decision: 'SHORT',
    setupCandidates: [humanReviewOpeningDrive],
    earlyMoveReview: { status: 'already_triggered_no_fresh_entry', action: 'No fresh chase entry; human review only.' },
  } as any,
  currentPrice: 7463.5,
});
assert.equal(humanReviewEarlyMoveSelection.stateForAlert, 'Conditional');
assert.equal(humanReviewEarlyMoveSelection.candidate, humanReviewOpeningDrive);
assert.equal(humanReviewEarlyMoveSelection.reviewStatus, 'already_triggered_no_fresh_entry');
assert.equal(humanReviewEarlyMoveSelection.stale.stale, false);
assert.ok(humanReviewEarlyMoveSelection.auditWarnings.some((warning) => warning.includes('canExecute remains false')));
assert.equal(
  shouldSendScannerAlert({
    state: humanReviewEarlyMoveSelection.stateForAlert,
    confidence: 100,
    window: resolveScannerWindow(new Date('2026-06-09T10:05:00-04:00')),
    candidate: humanReviewEarlyMoveSelection.candidate,
    stale: humanReviewEarlyMoveSelection.stale.stale,
  }).shouldSend,
  true,
);

const turtleSoupShortWatch = candidate({
  setupType: SetupType.TurtleSoup,
  scenarioLabel: 'Turtle Soup SHORT',
  direction: 'SHORT',
  detectedStatus: SetupCandidateStatus.Blocked,
  executionStatus: ExecutionStatus.Blocked,
  entry: 7451.25,
  stop: 7456,
  target1: 7441.5,
  target2: 7437.25,
  riskPoints: 4.75,
  blockReason: NoTradeReason.InvalidStopLocation,
  requiredTrigger: null,
  nextAction: 'Waiting for completed 5M confirmation.',
  evidence: ['Buy-side sweep and reclaim context present.'],
});
const turtleSoupWatchSelection = selectScannerPlan({
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    setupCandidates: [turtleSoupShortWatch],
  } as any,
  currentPrice: 7462,
});
assert.equal(turtleSoupWatchSelection.stateForAlert, 'Conditional');
assert.notEqual(turtleSoupWatchSelection.candidate, turtleSoupShortWatch);
assert.equal(turtleSoupWatchSelection.candidate?.setupType, SetupType.TurtleSoup);
assert.equal(turtleSoupWatchSelection.candidate?.direction, 'SHORT');
assert.equal(turtleSoupWatchSelection.candidate?.executionStatus, ExecutionStatus.Conditional);
assert.equal(turtleSoupWatchSelection.candidate?.blockReason, null);
assert.equal(turtleSoupShortWatch.executionStatus, ExecutionStatus.Blocked);
assert.equal(turtleSoupShortWatch.blockReason, NoTradeReason.InvalidStopLocation);
assert.ok(turtleSoupWatchSelection.candidate?.requiredTrigger?.includes('Line in the sand is 7451.25'));
assert.ok(turtleSoupWatchSelection.candidate?.requiredTrigger?.includes('completed 5M close below'));
assert.ok(turtleSoupWatchSelection.candidate?.requiredTrigger?.includes('stop above 7456'));
assert.ok(turtleSoupWatchSelection.candidate?.requiredTrigger?.includes('No chase if T1 7441.5 is already reached'));
assert.equal(turtleSoupWatchSelection.reviewStatus, null);
assert.equal(turtleSoupWatchSelection.stale.stale, false);
assert.equal(
  shouldSendScannerAlert({
    state: turtleSoupWatchSelection.stateForAlert,
    confidence: 78,
    window: resolveScannerWindow(new Date('2026-06-09T10:10:00-04:00')),
    candidate: turtleSoupWatchSelection.candidate,
    stale: turtleSoupWatchSelection.stale.stale,
  }).shouldSend,
  true,
);

const turtleSoupWatchWithOppositeEarlyMove = selectScannerPlan({
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    setupCandidates: [turtleSoupShortWatch],
    earlyMoveReview: {
      status: 'already_triggered_no_fresh_entry',
      direction: 'LONG',
      action: 'Old long move is extended; no fresh long entry.',
    },
  } as any,
  currentPrice: 7462,
});
assert.equal(turtleSoupWatchWithOppositeEarlyMove.stateForAlert, 'Conditional');
assert.equal(turtleSoupWatchWithOppositeEarlyMove.candidate?.direction, 'SHORT');
assert.equal(turtleSoupWatchWithOppositeEarlyMove.reviewStatus, null);
assert.ok(turtleSoupWatchWithOppositeEarlyMove.auditWarnings.some((warning) => warning.includes('Opposite-direction early-move review ignored')));

const intradayMssLongWatch = candidate({
  setupType: SetupType.IntradayMssMicroContinuation,
  scenarioLabel: 'Intraday MSS Micro Continuation',
  direction: 'LONG',
  detectedStatus: SetupCandidateStatus.Possible,
  executionStatus: ExecutionStatus.Conditional,
  candidateState: 'MSS_CONTINUATION_RETEST_PENDING',
  entry: null,
  stop: 7352.75,
  target1: null,
  target2: null,
  riskPoints: null,
  modelConfidenceScore: 58,
  blockReason: NoTradeReason.EntryTriggerPending,
  humanReview: {
    status: 'OpeningObservationArmed',
    canExecute: false,
    requiresTraderConfirmation: true,
    discordTradePlanEligible: false,
    reason: 'Intraday MSS micro-continuation watch is active; wait for completed 5M hold/retest.',
  },
  activeCampaign: {
    id: '2026-06-09:LONG:15M5M-MSS',
    source: 'app_owned_structured_ohlc',
    authority: 'campaign_context_only_not_execution_authority',
    status: 'watch',
    direction: 'LONG',
    primaryTrigger: '15M_5M_MSS',
    executionTimeframe: '5M',
    htfRelationship: 'support',
    confidenceAdjustment: 6,
    evidenceLayers: [],
    htfSupportTimeframes: [],
    htfConflictTimeframes: [],
    obstacleMap: {
      lineInSand: 7361,
      reason: '7361.00 matters because it is the nearest structured HTF/session resistance in the trade path.',
      role: 'management_obstacle',
      caution: 'Do not chase; wait for acceptance.',
    },
    deDuplication: {
      oneTradePerCampaignRecommended: true,
      enforced: true,
      resetPolicy: 'trade_date_direction_campaign',
    },
    notes: ['5M remains execution authority.'],
  },
  activeRuleset: {
    htfLineInSand: {
      applied: true,
      status: 'blocked',
      required: 'completed_5m_or_15m_close_beyond_htf_line',
      appliesToAllModels: true,
      affectsExecution: false,
      direction: 'LONG',
      lineInSand: 7361,
      lineReason: '7361.00 matters because it is the nearest structured HTF/session resistance in the trade path.',
      requiredClose: 'Completed 5M or 15M close above 7361.00 required before long continuation is active.',
      obstacleType: 'resistance',
      obstacleSource: 'ninjatrader',
      evidence: ['Global HTF line-in-the-sand rule: 7361.00 matters.'],
      blockers: ['No chase: wait for completed close above 7361.00.'],
    },
  },
  evidence: [
    'Bullish 15M MSS confirmed from NinjaTrader OHLC timeframe evidence',
    'Bullish 5M MSS confirmed from NinjaTrader OHLC timeframe evidence',
    '5M FVG / imbalance zone: 7359.25-7361.00',
    'No chase: the model requires a completed 5M retest/rejection or completed acceptance beyond the HTF line in the sand.',
  ],
  missingEvidence: ['Bullish micro-continuation pending: wait for a completed 5M candle to retest the bullish FVG and close back above the upper boundary.'],
});
const intradayMssWatchSelection = selectScannerPlan({
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    setupCandidates: [intradayMssLongWatch],
  } as any,
  currentPrice: 7366,
});
assert.equal(intradayMssWatchSelection.stateForAlert, 'Conditional');
assert.notEqual(intradayMssWatchSelection.candidate, intradayMssLongWatch);
assert.equal(intradayMssWatchSelection.candidate?.setupType, SetupType.IntradayMssMicroContinuation);
assert.equal(intradayMssWatchSelection.candidate?.candidateState, 'MSS_CONTINUATION_RETEST_PENDING');
assert.equal(intradayMssWatchSelection.candidate?.blockReason, null);
assert.equal(intradayMssWatchSelection.candidate?.humanReview?.canExecute, false);
assert.equal(intradayMssWatchSelection.candidate?.humanReview?.discordTradePlanEligible, true);
assert.ok(intradayMssWatchSelection.candidate?.requiredTrigger?.includes('Long MSS forming'));
assert.ok(intradayMssWatchSelection.candidate?.requiredTrigger?.includes('Line is 7359.25-7361.00 / HTF line 7361.00'));
assert.ok(intradayMssWatchSelection.candidate?.requiredTrigger?.includes('completed 5M hold/retest above'));
assert.ok(intradayMssWatchSelection.candidate?.requiredTrigger?.includes('do not chase'));
assert.equal(intradayMssWatchSelection.reviewStatus, null);
assert.equal(intradayMssWatchSelection.stale.stale, false);
assert.equal(
  shouldSendScannerAlert({
    state: intradayMssWatchSelection.stateForAlert,
    confidence: 50,
    window: resolveScannerWindow(new Date('2026-06-09T14:45:00-04:00')),
    candidate: intradayMssWatchSelection.candidate,
    stale: intradayMssWatchSelection.stale.stale,
  }).shouldSend,
  true,
);

const intradayMssWatchWithoutDuplicatedEvidence = candidate({
  setupType: SetupType.IntradayMssMicroContinuation,
  scenarioLabel: 'Intraday MSS Micro Continuation',
  direction: 'LONG',
  detectedStatus: SetupCandidateStatus.Possible,
  executionStatus: ExecutionStatus.Conditional,
  pathway: 'intraday_mss_micro_continuation',
  candidateState: 'MSS_CONTINUATION_RETEST_PENDING',
  entry: null,
  stop: 7352.75,
  target1: null,
  target2: null,
  riskPoints: null,
  modelConfidenceScore: 58,
  blockReason: NoTradeReason.EntryTriggerPending,
  humanReview: {
    status: 'OpeningObservationArmed',
    canExecute: false,
    requiresTraderConfirmation: true,
    discordTradePlanEligible: false,
    reason: 'Intraday MSS micro-continuation watch is active; wait for completed 5M hold/retest.',
  },
  activeRuleset: {
    htfLineInSand: {
      applied: true,
      status: 'blocked',
      required: 'completed_5m_or_15m_close_beyond_htf_line',
      appliesToAllModels: true,
      affectsExecution: false,
      direction: 'LONG',
      lineInSand: 7361,
      lineReason: '7361.00 matters because it is the structured 5M FVG/retest decision boundary.',
      requiredClose: 'Completed 5M or 15M close above 7361.00 required before long continuation is active.',
      obstacleType: 'imbalance_zone',
      obstacleSource: 'app',
      evidence: ['Global HTF line-in-the-sand rule: 7361.00 matters.'],
      blockers: ['No chase: wait for completed close above 7361.00.'],
    },
  },
  evidence: ['5M FVG / imbalance zone: 7359.25-7361.00'],
  missingEvidence: ['Completed 5M hold/retest above the named line still required.'],
});
const intradayMssWatchWithoutDuplicatedEvidenceSelection = selectScannerPlan({
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    setupCandidates: [intradayMssWatchWithoutDuplicatedEvidence],
  } as any,
  currentPrice: 7366,
});
assert.equal(intradayMssWatchWithoutDuplicatedEvidenceSelection.stateForAlert, 'Conditional');
assert.equal(intradayMssWatchWithoutDuplicatedEvidenceSelection.candidate?.setupType, SetupType.IntradayMssMicroContinuation);
assert.equal(intradayMssWatchWithoutDuplicatedEvidenceSelection.candidate?.candidateState, 'MSS_CONTINUATION_RETEST_PENDING');
assert.equal(intradayMssWatchWithoutDuplicatedEvidenceSelection.candidate?.blockReason, null);
assert.equal(intradayMssWatchWithoutDuplicatedEvidenceSelection.candidate?.humanReview?.canExecute, false);
assert.equal(intradayMssWatchWithoutDuplicatedEvidenceSelection.candidate?.humanReview?.discordTradePlanEligible, true);
assert.ok(intradayMssWatchWithoutDuplicatedEvidenceSelection.candidate?.requiredTrigger?.includes('Long MSS forming'));
assert.ok(intradayMssWatchWithoutDuplicatedEvidenceSelection.candidate?.requiredTrigger?.includes('Line is 7359.25-7361.00 / HTF line 7361.00'));
assert.ok(intradayMssWatchWithoutDuplicatedEvidenceSelection.candidate?.requiredTrigger?.includes('completed 5M hold/retest above'));
assert.equal(intradayMssWatchWithoutDuplicatedEvidenceSelection.reviewStatus, null);
assert.equal(intradayMssWatchWithoutDuplicatedEvidenceSelection.stale.stale, false);

const blockedPlanCandidate = candidate({
  executionStatus: ExecutionStatus.Blocked,
  blockReason: NoTradeReason.InvalidStopLocation,
});
const blockedSelection = selectScannerPlan({
  normalized: {
    canExecute: true,
    decisionStatus: TradeDecisionStatus.ApprovedTrade,
    decision: 'LONG',
    entry: blockedPlanCandidate.entry,
    stop: blockedPlanCandidate.stop,
    setupCandidates: [blockedPlanCandidate],
    opportunitySelection: { bestExecutableCandidate: blockedPlanCandidate },
  } as any,
  currentPrice: 101,
});
assert.equal(blockedSelection.stateForAlert, 'Blocked');
assert.equal(blockedSelection.candidate, blockedPlanCandidate);
assert.notEqual(blockedSelection.stateForAlert, 'Approved');
assert.notEqual(blockedSelection.stateForAlert, 'Executable');

const wrongDirectionCandidate = candidate({
  direction: 'SHORT',
  entry: 100,
  stop: 104,
  target1: 92,
  target2: 92,
  executionStatus: ExecutionStatus.Executable,
});
const directionMismatchSelection = selectScannerPlan({
  normalized: {
    canExecute: true,
    decisionStatus: TradeDecisionStatus.ApprovedTrade,
    decision: 'LONG',
    entry: 100,
    stop: 96,
    setupCandidates: [wrongDirectionCandidate],
    opportunitySelection: { bestExecutableCandidate: wrongDirectionCandidate },
  } as any,
  currentPrice: 101,
});
assert.equal(directionMismatchSelection.candidate, null);
assert.equal(directionMismatchSelection.stateForAlert, 'NoTrade');
assert.ok(directionMismatchSelection.auditWarnings.some((warning) => warning.includes('no matching app-owned candidate')));

const freshExecutableCandidate = candidate({
  executionStatus: ExecutionStatus.Executable,
  entry: 100,
  stop: 96,
  target1: 106,
  target2: 108,
});
const selectedExecutable = selectScannerPlan({
  normalized: {
    canExecute: true,
    decisionStatus: TradeDecisionStatus.ApprovedTrade,
    decision: 'LONG',
    entry: freshExecutableCandidate.entry,
    stop: freshExecutableCandidate.stop,
    setupCandidates: [freshExecutableCandidate],
    opportunitySelection: { bestExecutableCandidate: freshExecutableCandidate },
  } as any,
  currentPrice: 101,
});
assert.equal(selectedExecutable.candidate, freshExecutableCandidate);
assert.equal(selectedExecutable.stateForAlert, 'Approved');
assert.equal(selectedExecutable.reviewStatus, null);

const fallbackStaleCandidate = candidate({
  executionStatus: ExecutionStatus.Executable,
  entry: 100,
  stop: 96,
  target1: 106,
  target2: 108,
});
const staleFallback = selectScannerPlan({
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    setupCandidates: [fallbackStaleCandidate],
  } as any,
  currentPrice: 108,
});
assert.equal(staleFallback.stateForAlert, 'Missed');
assert.equal(staleFallback.candidate, null);
assert.equal(staleFallback.reviewStatus, 'already_triggered_no_fresh_entry');

const morningMoveBars: NinjaBridgeBar[] = [
  bar('2026-05-28T09:30:00-04:00', 7535.75, 7538.75, 7534.75, 7535.25),
  bar('2026-05-28T09:35:00-04:00', 7535.25, 7537.25, 7527.75, 7530.00),
  bar('2026-05-28T09:40:00-04:00', 7530.00, 7530.00, 7525.50, 7527.25),
  bar('2026-05-28T09:45:00-04:00', 7527.25, 7530.25, 7525.50, 7528.75),
  bar('2026-05-28T09:50:00-04:00', 7528.50, 7532.00, 7526.00, 7527.25),
  bar('2026-05-28T09:55:00-04:00', 7527.25, 7537.25, 7526.25, 7531.75),
  bar('2026-05-28T10:00:00-04:00', 7531.75, 7536.25, 7530.50, 7535.75),
  bar('2026-05-28T10:05:00-04:00', 7535.75, 7539.75, 7533.50, 7536.50),
  bar('2026-05-28T10:10:00-04:00', 7536.25, 7540.25, 7533.50, 7540.25),
  bar('2026-05-28T10:15:00-04:00', 7540.25, 7574.00, 7535.00, 7564.75),
];

function normalizedFromMorningMoveThrough(index: number) {
  const bars = morningMoveBars.slice(0, index + 1);
  const chartContext = buildNinjaChartContext({
    bars5m: bars,
    sessionType: 'morning',
    instrument: 'MES',
    tradeDate: '2026-05-28',
  });
  return buildAppTradePlan({
    dayType: 'NO TRADE' as any,
    reasoning: 'Bridge fixture regression.',
    confidence: 0.5,
    checks: [],
    structuredChartContext: chartContext || undefined,
    current_rule_analysis: {
      summary: 'Bridge fixture regression.',
      setup_detected: 'Pending deterministic setup scan',
      rule_category: 'APP_OWNED_PIPELINE',
      entry: null,
      stop: null,
      target_1: null,
      target_2: null,
      trigger_state: 'NO_TRIGGER',
      entry_trigger: null,
      no_trade_reason: null,
      base_confidence: 'Medium',
    },
  }, { sessionType: 'morning', instrument: 'MES', windowStatusOverride: 'active' });
}

const openingMovePlan = normalizedFromMorningMoveThrough(5);
const openingMoveSelection = selectScannerPlan({
  normalized: openingMovePlan,
  currentPrice: morningMoveBars[5].close,
});
assert.equal(resolveScannerWindow(new Date('2026-05-28T09:55:00-04:00')).allowsDiscordAlert, false);
assert.equal(
  shouldSendScannerAlert({
    state: openingMoveSelection.stateForAlert,
    confidence: 100,
    window: resolveScannerWindow(new Date('2026-05-28T09:55:00-04:00')),
    candidate: openingMoveSelection.candidate,
    stale: openingMoveSelection.stale.stale,
  }).shouldSend,
  false
);

const tenAmMovePlan = normalizedFromMorningMoveThrough(6);
const tenAmSelection = selectScannerPlan({
  normalized: tenAmMovePlan,
  currentPrice: morningMoveBars[6].close,
});
assert.notEqual(tenAmSelection.stateForAlert, 'Approved');
assert.notEqual(tenAmSelection.stateForAlert, 'Executable');
assert.equal(tenAmSelection.candidate, null);
assert.equal(
  shouldSendScannerAlert({
    state: tenAmSelection.stateForAlert,
    confidence: 100,
    window: resolveScannerWindow(new Date('2026-05-28T10:00:00-04:00')),
    candidate: tenAmSelection.candidate,
    stale: tenAmSelection.stale.stale,
  }).shouldSend,
  false
);

const tenOhFiveMovePlan = normalizedFromMorningMoveThrough(7);
const tenOhFiveSelection = selectScannerPlan({
  normalized: tenOhFiveMovePlan,
  currentPrice: morningMoveBars[7].close,
});
assert.notEqual(tenOhFiveSelection.stateForAlert, 'Approved');
assert.equal(tenOhFiveSelection.stateForAlert, 'Executable');
assert.equal(tenOhFiveSelection.candidate?.direction, 'SHORT');
assert.ok(tenOhFiveSelection.auditWarnings.some((warning) => warning.includes('Opposite-direction early-move review ignored')));

const tenFifteenMovePlan = normalizedFromMorningMoveThrough(9);
const tenFifteenSelection = selectScannerPlan({
  normalized: tenFifteenMovePlan,
  currentPrice: morningMoveBars[9].close,
});
assert.equal(tenFifteenSelection.stateForAlert, 'Conditional');
assert.equal(tenFifteenSelection.candidate?.setupType, SetupType.TurtleSoup);
assert.equal(tenFifteenSelection.reviewStatus, null);
assert.equal(tenFifteenSelection.stale.stale, false);
