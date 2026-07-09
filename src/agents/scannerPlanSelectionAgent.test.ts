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
assert.equal(staleSelection.candidate, staleNormalizedCandidate);
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
  currentPrice: 7454,
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
  currentPrice: 7454,
});
assert.equal(turtleSoupWatchWithOppositeEarlyMove.stateForAlert, 'Conditional');
assert.equal(turtleSoupWatchWithOppositeEarlyMove.candidate?.direction, 'SHORT');
assert.equal(turtleSoupWatchWithOppositeEarlyMove.reviewStatus, null);
assert.ok(turtleSoupWatchWithOppositeEarlyMove.auditWarnings.some((warning) => warning.includes('Opposite-direction early-move review ignored')));

const invalidatedTurtleSoupShort = candidate({
  setupType: SetupType.TurtleSoup,
  scenarioLabel: 'Invalidated Turtle Soup SHORT',
  direction: 'SHORT',
  detectedStatus: SetupCandidateStatus.Blocked,
  executionStatus: ExecutionStatus.Blocked,
  entry: 7437.5,
  stop: 7440.25,
  target1: 7401.25,
  target2: 7383,
  riskPoints: 2.75,
  blockReason: NoTradeReason.InvalidStopLocation,
  requiredTrigger: null,
  nextAction: 'Old short watch should not be reused after stop is breached.',
  evidence: ['Buy-side sweep and reclaim context present.'],
});
const validTurtleSoupLong = candidate({
  setupType: SetupType.TurtleSoup,
  scenarioLabel: 'Current Turtle Soup LONG',
  direction: 'LONG',
  detectedStatus: SetupCandidateStatus.Blocked,
  executionStatus: ExecutionStatus.Blocked,
  entry: 7410.75,
  stop: 7408.25,
  target1: 7470,
  target2: 7480,
  riskPoints: 2.5,
  blockReason: NoTradeReason.InvalidStopLocation,
  requiredTrigger: null,
  nextAction: 'Long watch remains valid above its protected stop.',
  evidence: ['Sell-side sweep and reclaim context present.'],
});
const invalidatedShortSkippedForLongWatch = selectScannerPlan({
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    setupCandidates: [invalidatedTurtleSoupShort, validTurtleSoupLong],
  } as any,
  currentPrice: 7440,
  latestCompletedBar: { high: 7443.25, low: 7434.25 },
});
assert.equal(invalidatedShortSkippedForLongWatch.stateForAlert, 'Conditional');
assert.equal(invalidatedShortSkippedForLongWatch.candidate?.direction, 'LONG');
assert.equal(invalidatedShortSkippedForLongWatch.candidate?.setupType, SetupType.TurtleSoup);
assert.equal(invalidatedShortSkippedForLongWatch.candidate?.blockReason, null);
assert.ok(invalidatedShortSkippedForLongWatch.candidate?.requiredTrigger?.includes('completed 5M close above'));

const htfOpposedShort = candidate({
  setupType: SetupType.TurtleSoup,
  scenarioLabel: 'HTF-opposed Turtle Soup SHORT',
  direction: 'SHORT',
  detectedStatus: SetupCandidateStatus.Conditional,
  executionStatus: ExecutionStatus.Conditional,
  entry: 7427.25,
  stop: 7440.25,
  target1: 7399.5,
  target2: 7383,
  riskPoints: 13,
  blockReason: NoTradeReason.EntryTriggerPending,
  rankScore: 240,
  priority: 96,
  missingEvidence: ['Active timeframe MSS ruleset found opposing completed HTF MSS on 60M, 120M.'],
  requiredTrigger: 'Bearish Turtle Soup short pending.',
  nextAction: 'Short is HTF-opposed review only.',
});
const nonConflictedLongReview = candidate({
  setupType: SetupType.SweepMssFvgRetrace,
  scenarioLabel: 'Non-conflicted LONG review',
  direction: 'LONG',
  detectedStatus: SetupCandidateStatus.Conditional,
  executionStatus: ExecutionStatus.Conditional,
  entry: 7418,
  stop: 7398.25,
  target1: 7460,
  target2: 7477.5,
  riskPoints: 19.75,
  blockReason: NoTradeReason.EntryTriggerPending,
  rankScore: 230,
  priority: 98,
  missingEvidence: ['Completed Morning context is incomplete; keep this as conditional only.'],
  requiredTrigger: 'Entry only on retrace into bullish imbalance after sweep, reclaim, displacement, and bullish structure shift.',
  nextAction: 'Long review is waiting on retrace.',
});
const htfOpposedShortDoesNotSuppressLong = selectScannerPlan({
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    setupCandidates: [htfOpposedShort, nonConflictedLongReview],
  } as any,
  currentPrice: 7434.5,
  latestCompletedBar: { high: 7440, low: 7430.75 },
});
assert.equal(htfOpposedShortDoesNotSuppressLong.stateForAlert, 'Missed');
assert.equal(htfOpposedShortDoesNotSuppressLong.candidate?.direction, 'LONG');
assert.equal(htfOpposedShortDoesNotSuppressLong.candidate?.setupType, SetupType.SweepMssFvgRetrace);

const highQualityLowerRankMicroContinuation = candidate({
  setupType: SetupType.IntradayMssMicroContinuation,
  scenarioLabel: 'Intraday MSS Micro Continuation SHORT',
  direction: 'SHORT',
  detectedStatus: SetupCandidateStatus.Conditional,
  executionStatus: ExecutionStatus.Conditional,
  candidateState: 'HUMAN_REVIEW_READY',
  entry: 7612.75,
  stop: 7638,
  target1: 7573.5,
  target2: 7562.25,
  riskPoints: 25.25,
  rankScore: 255,
  decisionQualityScore: 84,
  modelConfidenceScore: 100,
  blockReason: NoTradeReason.EntryTriggerPending,
  requiredTrigger: 'Completed 5M close below the line, then failed retest.',
  nextAction: 'Review only until completed 5M retest confirms.',
  evidence: [
    'Bearish 15M MSS confirmed from NinjaTrader OHLC timeframe evidence.',
    'Bearish 5M MSS confirmed from NinjaTrader OHLC timeframe evidence.',
  ],
});
const strongerRankedHtfBackedReview = candidate({
  setupType: SetupType.AfterLunchDriveFvgContinuation,
  scenarioLabel: 'After Lunch Drive FVG Continuation SHORT',
  direction: 'SHORT',
  detectedStatus: SetupCandidateStatus.Conditional,
  executionStatus: ExecutionStatus.Conditional,
  candidateState: 'HUMAN_REVIEW_READY',
  entry: 7612.75,
  stop: 7622.75,
  target1: 7597.75,
  target2: 7592.75,
  riskPoints: 10,
  rankScore: 256,
  decisionQualityScore: 78,
  modelConfidenceScore: 100,
  blockReason: NoTradeReason.EntryTriggerPending,
  requiredTrigger: 'Completed 5M close below the FVG line, then failed retest.',
  nextAction: 'Review only until completed 5M retest confirms.',
  evidence: [
    'Bearish 15M MSS confirmed from NinjaTrader OHLC timeframe evidence.',
    'Bearish 5M MSS confirmed from NinjaTrader OHLC timeframe evidence.',
    'Structured HTF support backs the short review.',
  ],
});
const strongestRankedReviewSelection = selectScannerPlan({
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    setupCandidates: [highQualityLowerRankMicroContinuation, strongerRankedHtfBackedReview],
  } as any,
  currentPrice: 7613.5,
  latestCompletedBar: { high: 7617, low: 7608 },
});
assert.equal(strongestRankedReviewSelection.stateForAlert, 'TriggerPending');
assert.equal(strongestRankedReviewSelection.candidate, strongerRankedHtfBackedReview);
assert.equal(strongestRankedReviewSelection.candidate?.setupType, SetupType.AfterLunchDriveFvgContinuation);
assert.equal(strongestRankedReviewSelection.candidate?.rankScore, 256);
assert.equal(strongestRankedReviewSelection.candidate?.decisionQualityScore, 78);

const pendingDeskPlayCandidate = candidate({
  setupType: SetupType.SweepMssFvgRetrace,
  scenarioLabel: 'LONG desk play pullback into imbalance',
  direction: 'LONG',
  executionStatus: ExecutionStatus.Conditional,
  blockReason: NoTradeReason.EntryTriggerPending,
  entry: 7312,
  stop: 7271.75,
  target1: 7372.5,
  target2: 7392.5,
  riskPoints: 40.25,
  priority: 92,
  rankScore: 92,
  requiredTrigger: 'Entry only on completed 5M pullback/retest into bullish imbalance 7281.75-7342.',
  nextAction: 'Wait for completed 5M retest/hold; no chase.',
  evidence: [
    'Sell-side sweep and reclaim confirmed.',
    'Bullish displacement and imbalance context are present.',
    'Market structure shift context is present.',
  ],
});
const pendingDeskPlaySelection = selectScannerPlan({
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    setupCandidates: [pendingDeskPlayCandidate],
  } as any,
  currentPrice: 7313,
});
assert.equal(pendingDeskPlaySelection.stateForAlert, 'TriggerPending');
assert.equal(pendingDeskPlaySelection.candidate, pendingDeskPlayCandidate);
assert.equal(pendingDeskPlaySelection.candidate?.blockReason, NoTradeReason.EntryTriggerPending);
assert.equal(pendingDeskPlaySelection.stale.stale, false);
assert.equal(pendingDeskPlaySelection.visibilityMetadata?.visibilityMode, 'POST_WATCH');
assert.equal(pendingDeskPlaySelection.visibilityMetadata?.discordAction, 'post_watch');
assert.ok(pendingDeskPlaySelection.auditWarnings.some((warning) => warning.includes('EntryTriggerPending candidate surfaced')));

const missedPendingDeskPlaySelection = selectScannerPlan({
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    setupCandidates: [pendingDeskPlayCandidate],
  } as any,
  currentPrice: 7398.5,
});
assert.equal(missedPendingDeskPlaySelection.stateForAlert, 'Missed');
assert.equal(missedPendingDeskPlaySelection.candidate, pendingDeskPlayCandidate);
assert.equal(missedPendingDeskPlaySelection.reviewStatus, 'already_triggered_no_fresh_entry');
assert.equal(missedPendingDeskPlaySelection.stale.stale, true);
assert.ok(missedPendingDeskPlaySelection.stale.reason?.includes('No chase'));

const staleLongReclaimAfterFailedCampaign = candidate({
  setupType: SetupType.TurtleSoup,
  scenarioLabel: 'Bullish Turtle Soup Reversal',
  direction: 'LONG',
  executionStatus: ExecutionStatus.Executable,
  entry: 7366.5,
  stop: 7335,
  target1: 7430,
  target2: 7450,
  riskPoints: 31.5,
  priority: 99,
  rankScore: 99,
  evidence: ['Failed-low / Turtle Soup long line in the sand: 7366.50.'],
});
const juneTenShortFailedLongCampaign = candidate({
  setupType: SetupType.TurtleSoup,
  scenarioLabel: 'Bearish failed-plan reversal after reclaim failure',
  direction: 'SHORT',
  executionStatus: ExecutionStatus.Executable,
  entry: 7338.25,
  stop: 7360.5,
  target1: 7247,
  target2: 7247,
  riskPoints: 22.25,
  priority: 90,
  rankScore: 90,
  evidence: [
    'App-owned LONG decision level 7366.50 failed.',
    '15M/1H/2H/4H opposite confirmation status: full_confirmation.',
    '5M trigger status: confirmed.',
  ],
});
const juneTenFailedCampaignSelection = selectScannerPlan({
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    setupCandidates: [staleLongReclaimAfterFailedCampaign, juneTenShortFailedLongCampaign],
    earlyMoveReview: {
      status: 'already_triggered_no_fresh_entry',
      direction: 'LONG',
      action: 'Old long move is extended; no fresh long entry.',
    },
  } as any,
  currentPrice: 7340.25,
});
assert.notEqual(juneTenFailedCampaignSelection.candidate, staleLongReclaimAfterFailedCampaign);
assert.equal(juneTenFailedCampaignSelection.candidate?.direction, 'SHORT');
assert.equal(juneTenFailedCampaignSelection.candidate?.setupType, SetupType.TurtleSoup);
assert.equal(juneTenFailedCampaignSelection.candidate?.entry, 7338.25);
assert.equal(juneTenFailedCampaignSelection.candidate?.stop, 7360.5);
assert.equal(juneTenFailedCampaignSelection.candidate?.target1, 7247);
assert.equal(juneTenFailedCampaignSelection.candidate?.activeRuleset?.htfLineInSand?.lineInSand, 7338.25);
assert.ok(juneTenFailedCampaignSelection.candidate?.activeRuleset?.htfLineInSand?.requiredClose?.includes('below 7338.25'));
assert.equal(juneTenFailedCampaignSelection.reviewStatus, null);
assert.notEqual(juneTenFailedCampaignSelection.stateForAlert, 'NoTrade');
assert.ok(juneTenFailedCampaignSelection.auditWarnings.some((warning) => warning.includes('valid app-owned opposite campaign candidate')));

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
assert.ok(intradayMssWatchSelection.candidate?.requiredTrigger?.includes('Campaign active from app-owned completed 5M close-through'));
assert.ok(intradayMssWatchSelection.candidate?.requiredTrigger?.includes('Line is 7359.25-7361.00 / HTF line 7361.00'));
assert.ok(intradayMssWatchSelection.candidate?.requiredTrigger?.includes('completed 5M hold/retest above'));
assert.ok(intradayMssWatchSelection.candidate?.requiredTrigger?.includes('do not chase'));
assert.ok(intradayMssWatchSelection.candidate?.evidence?.some((item) => item.includes('NinjaTrader OHLC') && item.includes('Gemini/advisory agents may summarize')));
assert.ok(intradayMssWatchSelection.candidate?.evidence?.some((item) => item.includes('First completed 5M close-through activates the campaign')));
assert.ok(intradayMssWatchSelection.auditWarnings.some((warning) => warning.includes('First completed 5M close-through activates the campaign')));
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

const staleFallbackShouldNotSuppressIntradayMssWatch = selectScannerPlan({
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    setupCandidates: [
      candidate({
        setupType: SetupType.LiquiditySweep,
        scenarioLabel: 'Stale generic fallback candidate',
        direction: 'LONG',
        executionStatus: ExecutionStatus.Executable,
        entry: 100,
        stop: 96,
        target1: 106,
        target2: 108,
        riskPoints: 4,
        priority: 1000,
        rankScore: 1000,
      }),
      intradayMssLongWatch,
    ],
  } as any,
  currentPrice: 108,
});
assert.equal(staleFallbackShouldNotSuppressIntradayMssWatch.stateForAlert, 'Conditional');
assert.equal(staleFallbackShouldNotSuppressIntradayMssWatch.candidate?.setupType, SetupType.IntradayMssMicroContinuation);
assert.equal(staleFallbackShouldNotSuppressIntradayMssWatch.candidate?.candidateState, 'MSS_CONTINUATION_RETEST_PENDING');
assert.equal(staleFallbackShouldNotSuppressIntradayMssWatch.reviewStatus, null);
assert.equal(staleFallbackShouldNotSuppressIntradayMssWatch.stale.stale, false);
assert.ok(staleFallbackShouldNotSuppressIntradayMssWatch.auditWarnings.some((warning) => warning.includes('Stale/chasing fallback candidate did not suppress')));

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

const rawApprovedButNoTradeCandidate = candidate({
  executionStatus: ExecutionStatus.Executable,
  entry: 100,
  stop: 96,
  target1: 106,
  target2: 108,
});
const rawApprovedButNoTradeSelection = selectScannerPlan({
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.ApprovedTrade,
    decision: 'NO TRADE',
    setupCandidates: [rawApprovedButNoTradeCandidate],
  } as any,
  currentPrice: 101,
});
assert.equal(rawApprovedButNoTradeSelection.stateForAlert, 'Conditional');
assert.notEqual(rawApprovedButNoTradeSelection.stateForAlert, 'Approved');
assert.notEqual(rawApprovedButNoTradeSelection.stateForAlert, 'Executable');

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
assert.equal(staleFallback.candidate, fallbackStaleCandidate);
assert.equal(staleFallback.reviewStatus, 'already_triggered_no_fresh_entry');

const staleSmallModelOne = candidate({
  setupType: SetupType.SweepMssFvgRetrace,
  scenarioLabel: 'Sweep MSS FVG smaller failed-low continuation',
  direction: 'LONG',
  executionStatus: ExecutionStatus.Executable,
  entry: 7342,
  stop: 7335,
  target1: 7360,
  target2: 7360,
  riskPoints: 7,
  priority: 100,
  rankScore: 100,
});
const solidTurtleSoupLong = candidate({
  setupType: SetupType.TurtleSoup,
  scenarioLabel: 'Bullish Turtle Soup failed-low reclaim',
  direction: 'LONG',
  executionStatus: ExecutionStatus.Executable,
  entry: 7366.5,
  stop: 7335,
  target1: 7430,
  target2: 7450,
  riskPoints: 31.5,
  priority: 90,
  rankScore: 90,
  requiredTrigger: 'Completed 5M hold/retest/reclaim above 7366.50.',
  evidence: [
    'Failed-low / Turtle Soup long line in the sand: 7366.50.',
    '9:40 ET candle reclaimed hard after sweeping down to 7335.25 and closed at 7366.50.',
  ],
});
const solidPlanSelection = selectScannerPlan({
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    setupCandidates: [staleSmallModelOne, solidTurtleSoupLong],
  } as any,
  currentPrice: 7384,
});
assert.equal(solidPlanSelection.stateForAlert, 'Missed');
assert.notEqual(solidPlanSelection.candidate, solidTurtleSoupLong);
assert.equal(solidPlanSelection.candidate?.setupType, SetupType.TurtleSoup);
assert.equal(solidPlanSelection.candidate?.entry, 7366.5);
assert.equal(solidPlanSelection.candidate?.stop, 7335);
assert.equal(solidPlanSelection.candidate?.target1, 7430);
assert.equal(solidPlanSelection.candidate?.target2, 7450);
assert.equal(solidPlanSelection.candidate?.activeRuleset?.htfLineInSand?.lineInSand, 7366.5);
assert.ok(solidPlanSelection.candidate?.activeRuleset?.htfLineInSand?.lineReason?.includes('Turtle Soup sweep/reclaim decision line'));
assert.ok(solidPlanSelection.candidate?.activeRuleset?.htfLineInSand?.requiredClose?.includes('hold/retest/reclaim above'));
assert.equal(solidPlanSelection.reviewStatus, 'already_triggered_no_fresh_entry');
assert.equal(solidPlanSelection.stale.stale, true);
assert.ok(solidPlanSelection.stale.reason?.includes('Do not chase'));

const julyOneTurtleSoupLong = candidate({
  setupType: SetupType.TurtleSoup,
  scenarioLabel: 'Bullish Turtle Soup failed-low reclaim',
  direction: 'LONG',
  executionStatus: ExecutionStatus.Executable,
  entry: 7548.25,
  stop: 7539.75,
  target1: 7561,
  target2: 7565.25,
  riskPoints: 8.5,
  priority: 99,
  rankScore: 99,
  decisionQualityScore: 82,
  evidence: [
    'Failed-low / Turtle Soup long line in the sand: 7548.25.',
    'Structured 5M reclaim and protected stop are present.',
  ],
});
const julyOneWideIntradayMssLong = candidate({
  setupType: SetupType.IntradayMssMicroContinuation,
  scenarioLabel: 'Intraday MSS Micro Continuation',
  direction: 'LONG',
  executionStatus: ExecutionStatus.Conditional,
  candidateState: 'HUMAN_REVIEW_READY',
  entry: 7552.25,
  stop: 7523.5,
  target1: 7595.5,
  target2: 7609.75,
  riskPoints: 28.75,
  priority: 96,
  rankScore: 253,
  decisionQualityScore: 84,
  modelConfidenceScore: 100,
  requiredTrigger: 'Completed 5M or 15M close above 7555.50 required before long continuation is active.',
  evidence: [
    'Bullish 15M MSS context.',
    'Bullish 5M FVG execution trigger.',
  ],
  missingEvidence: [
    'No chase: wait for a completed 5M or 15M close above 7555.50.',
  ],
});
const julyOneSelection = selectScannerPlan({
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    setupCandidates: [julyOneWideIntradayMssLong, julyOneTurtleSoupLong],
  } as any,
  currentPrice: 7549,
  latestCompletedBar: { high: 7549.75, low: 7547.5 },
});
assert.equal(julyOneSelection.candidate?.setupType, SetupType.TurtleSoup);
assert.equal(julyOneSelection.candidate?.entry, 7548.25);
assert.equal(julyOneSelection.candidate?.stop, 7539.75);
assert.equal(julyOneSelection.candidate?.target1, 7561);
assert.equal(julyOneSelection.candidate?.activeRuleset?.htfLineInSand?.lineInSand, 7548.25);
assert.equal(julyOneSelection.stateForAlert, 'Conditional');
assert.equal(julyOneSelection.visibilityMetadata?.authority.canExecute, false);

const julyOneLateSelection = selectScannerPlan({
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    setupCandidates: [julyOneWideIntradayMssLong, julyOneTurtleSoupLong],
  } as any,
  currentPrice: 7555,
  latestCompletedBar: { high: 7555.5, low: 7547.5 },
});
assert.equal(julyOneLateSelection.candidate, julyOneWideIntradayMssLong);
assert.equal(julyOneLateSelection.stateForAlert, 'Conditional');

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
assert.equal(resolveScannerWindow(new Date('2026-05-28T09:55:00-04:00')).allowsDiscordAlert, true);
assert.equal(resolveScannerWindow(new Date('2026-05-28T09:55:00-04:00')).allowsDeskPlan, true);
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
assert.equal(tenOhFiveSelection.stateForAlert, 'Conditional');
assert.equal(tenOhFiveSelection.candidate?.direction, 'SHORT');
assert.ok(tenOhFiveSelection.auditWarnings.some((warning) => warning.includes('Opposite-direction early-move review ignored')));

const tenFifteenMovePlan = normalizedFromMorningMoveThrough(9);
const tenFifteenSelection = selectScannerPlan({
  normalized: tenFifteenMovePlan,
  currentPrice: morningMoveBars[9].close,
});
assert.equal(tenFifteenSelection.stateForAlert, 'TriggerPending');
assert.equal(tenFifteenSelection.candidate, null);
assert.equal(tenFifteenSelection.reviewStatus, 'early_move_review_no_valid_candidate');
assert.equal(tenFifteenSelection.stale.stale, false);
