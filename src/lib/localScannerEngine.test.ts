import assert from 'node:assert/strict';
import {
  assessBridgeBarStaleness,
  applyStaleChaseGuard,
  buildTargetCascade,
  latestCompletedBar,
  MARKET_MAPPING_COVERAGE,
  resolveScannerWindow,
  scannerAlertKey,
  scannerContextLogLabel,
  scannerContextState,
  scannerStateFromDecision,
  selectScannerPlan,
  scoreScannerCandidate,
  shouldSendScannerAlert,
} from './localScannerEngine';
import { actualResultRFromExit, buildTradeJournalRecord } from './tradeJournal';
import { normalizeIctModelLabel, normalizeCandidateIctModelLabel } from './ictModelLabels';
import { buildAppTradePlan } from './planEngine';
import { buildNinjaChartContext } from './ninjaTraderBridge';
import { ExecutionStatus, NoTradeReason, SetupCandidateStatus, SetupType, TradeDecisionStatus, type SetupCandidate, type TargetObjective } from '../types';
import type { NinjaBridgeBar } from './ninjaTraderBridge';

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

function objective(price: number, source: TargetObjective['source'], direction: 'LONG' | 'SHORT' = 'LONG'): TargetObjective {
  return {
    label: `${source} liquidity ${price}`,
    price,
    direction,
    source,
    type: 'liquidity_pool',
    confidence: 'High',
    score: 80,
    distancePoints: Math.abs(price - 100),
    rMultiple: Math.abs(price - 100) / 4,
    reason: 'Test objective',
  };
}

function bar(time: string, open: number, high: number, low: number, close: number): NinjaBridgeBar {
  return { time, open, high, low, close, volume: 1 };
}

const morningWindow = resolveScannerWindow(new Date('2026-05-19T10:05:00-04:00'));
const lateMorningWindow = resolveScannerWindow(new Date('2026-05-19T11:10:00-04:00'));
const elevenThirtyMorningWindow = resolveScannerWindow(new Date('2026-05-19T11:30:00-04:00'));
const elevenFiftyNineMorningWindow = resolveScannerWindow(new Date('2026-05-19T11:59:00-04:00'));
const noonLunchPmWindow = resolveScannerWindow(new Date('2026-05-19T12:00:00-04:00'));
const onePmLunchPmWindow = resolveScannerWindow(new Date('2026-05-19T13:00:00-04:00'));
const twoThirtyLunchPmWindow = resolveScannerWindow(new Date('2026-05-19T14:30:00-04:00'));
const threeTwentyNineLunchPmWindow = resolveScannerWindow(new Date('2026-05-19T15:29:00-04:00'));
const openingWindow = resolveScannerWindow(new Date('2026-05-19T09:45:00-04:00'));
const nineFiftyNineWindow = resolveScannerWindow(new Date('2026-05-19T09:59:00-04:00'));
const outsideWindow = resolveScannerWindow(new Date('2026-05-19T08:00:00-04:00'));
const postScanWindow = resolveScannerWindow(new Date('2026-05-19T15:30:00-04:00'));

assert.equal(openingWindow.session, 'premarket');
assert.equal(openingWindow.allowsTradePlan, false);
assert.equal(openingWindow.allowsDiscordAlert, false);
assert.equal(scannerContextLogLabel(openingWindow), 'Opening Observation Window');
assert.equal(scannerContextState(openingWindow), 'MarketMapping');
assert.equal(nineFiftyNineWindow.session, 'premarket');
assert.equal(nineFiftyNineWindow.allowsTradePlan, false);
assert.equal(nineFiftyNineWindow.allowsDiscordAlert, false);
assert.equal(morningWindow.session, 'morning');
assert.equal(morningWindow.label, 'Morning Setup Scan');
assert.equal(morningWindow.allowsTradePlan, true);
assert.equal(scannerContextState(morningWindow), 'MapReady');
assert.equal(lateMorningWindow.session, 'morning');
assert.equal(lateMorningWindow.allowsTradePlan, true);
assert.equal(elevenThirtyMorningWindow.session, 'morning');
assert.equal(elevenThirtyMorningWindow.allowsTradePlan, true);
assert.equal(elevenFiftyNineMorningWindow.session, 'morning');
assert.equal(elevenFiftyNineMorningWindow.allowsTradePlan, true);
assert.equal(noonLunchPmWindow.session, 'lunch');
assert.equal(noonLunchPmWindow.label, 'Lunch/PM Setup Scan');
assert.equal(noonLunchPmWindow.allowsTradePlan, true);
assert.equal(onePmLunchPmWindow.session, 'lunch');
assert.equal(onePmLunchPmWindow.allowsTradePlan, true);
assert.equal(twoThirtyLunchPmWindow.session, 'lunch');
assert.equal(twoThirtyLunchPmWindow.allowsTradePlan, true);
assert.equal(threeTwentyNineLunchPmWindow.session, 'lunch');
assert.equal(threeTwentyNineLunchPmWindow.allowsTradePlan, true);
assert.equal(postScanWindow.session, 'outside');
assert.equal(postScanWindow.allowsTradePlan, false);
assert.equal(outsideWindow.allowsDiscordAlert, false);
assert.equal(scannerContextLogLabel(outsideWindow), 'Market Mapping Mode');
assert.equal(scannerContextState(outsideWindow), 'MarketMapping');
assert.ok(MARKET_MAPPING_COVERAGE.includes('prior day/week/month levels'));

const completed = latestCompletedBar(
  [
    bar('2026-05-19T09:55:00', 1, 2, 0, 1),
    bar('2026-05-19T10:05:00', 1, 2, 0, 1),
  ],
  5,
  new Date('2026-05-19T10:07:00-04:00'),
  'open'
);
assert.equal(completed?.time, '2026-05-19T09:55:00');

const closeTimestampCompleted = latestCompletedBar(
  [
    bar('2026-05-19T09:55:00', 1, 2, 0, 1),
    bar('2026-05-19T10:05:00', 1, 2, 0, 1),
  ],
  5,
  new Date('2026-05-19T10:07:00-04:00')
);
assert.equal(closeTimestampCompleted?.time, '2026-05-19T10:05:00');

const freshBridge = assessBridgeBarStaleness({
  latestBar: bar('2026-05-19T10:00:00', 1, 2, 0, 1),
  timeframeMinutes: 5,
  now: new Date('2026-05-19T10:12:00-04:00'),
  maxStaleBarMinutes: 10,
  timestampMode: 'open',
});
assert.equal(freshBridge.stale, false);

const freshCloseTimestampBridge = assessBridgeBarStaleness({
  latestBar: bar('2026-05-19T10:05:00', 1, 2, 0, 1),
  timeframeMinutes: 5,
  now: new Date('2026-05-19T10:12:00-04:00'),
  maxStaleBarMinutes: 10,
});
assert.equal(freshCloseTimestampBridge.stale, false);

const centralBridgeTime = assessBridgeBarStaleness({
  latestBar: bar('2026-05-19T21:35:00', 1, 2, 0, 1),
  timeframeMinutes: 5,
  now: new Date('2026-05-19T19:47:00-07:00'),
  maxStaleBarMinutes: 15,
  timestampMode: 'close',
  timeZoneMode: 'central',
});
assert.equal(centralBridgeTime.stale, false);

const easternBridgeTime = assessBridgeBarStaleness({
  latestBar: bar('2026-05-19T21:35:00', 1, 2, 0, 1),
  timeframeMinutes: 5,
  now: new Date('2026-05-19T19:47:00-07:00'),
  maxStaleBarMinutes: 15,
  timestampMode: 'close',
  timeZoneMode: 'eastern',
});
assert.equal(easternBridgeTime.stale, true);

const staleBridge = assessBridgeBarStaleness({
  latestBar: bar('2026-05-17T19:00:00', 1, 2, 0, 1),
  timeframeMinutes: 5,
  now: new Date('2026-05-19T18:05:00-04:00'),
  maxStaleBarMinutes: 10,
});
assert.equal(staleBridge.stale, true);
assert.ok(staleBridge.reason?.includes('latest completed 5M candle is stale'));

const strongCandidate = candidate();
const strongScore = scoreScannerCandidate(strongCandidate, morningWindow, 101, true, 10 * 60 + 5);
assert.ok(strongScore.score >= 75);
assert.ok(strongScore.qualifiedReasons.some((reason) => reason.includes('Liquidity sweep confirmed')));

const tenAmWindow = resolveScannerWindow(new Date('2026-05-19T10:00:00-04:00'));
assert.equal(tenAmWindow.session, 'morning');
assert.equal(tenAmWindow.allowsTradePlan, true);
const tenAmWithStaleDiagnosticClockScore = scoreScannerCandidate(strongCandidate, tenAmWindow, 101, true, 14 * 60);
assert.notEqual(tenAmWithStaleDiagnosticClockScore.hardBlocker, 'outside approved ICT execution session');
assert.ok(tenAmWithStaleDiagnosticClockScore.score >= 75);

const lunchWindow = resolveScannerWindow(new Date('2026-05-19T12:10:00-04:00'));
assert.equal(lunchWindow.session, 'lunch');
assert.equal(lunchWindow.allowsTradePlan, true);
const lunchWithStaleDiagnosticClockScore = scoreScannerCandidate(strongCandidate, lunchWindow, 101, true, 8 * 60);
assert.notEqual(lunchWithStaleDiagnosticClockScore.hardBlocker, 'outside approved ICT execution session');
assert.ok(lunchWithStaleDiagnosticClockScore.score >= 65);

const pmCutoffWindow = resolveScannerWindow(new Date('2026-05-19T15:29:00-04:00'));
assert.equal(pmCutoffWindow.session, 'lunch');
assert.equal(pmCutoffWindow.allowsTradePlan, true);
const pmCutoffWithStaleDiagnosticClockScore = scoreScannerCandidate(strongCandidate, pmCutoffWindow, 101, true, 8 * 60);
assert.notEqual(pmCutoffWithStaleDiagnosticClockScore.hardBlocker, 'outside approved ICT execution session');
assert.ok(pmCutoffWithStaleDiagnosticClockScore.score >= 65);

const midStrengthCandidate = candidate({
  scenarioLabel: 'Liquidity Sweep Reversal failed breakdown impulse',
  evidence: ['sweep/reclaim confirmed', 'expansion impulse confirmed'],
});
const midMorningScore = scoreScannerCandidate(midStrengthCandidate, morningWindow, 101, true, 10 * 60 + 5);
const lunchScore = scoreScannerCandidate(midStrengthCandidate, lunchWindow, 101, true, 12 * 60 + 10);
assert.ok(lunchScore.score < midMorningScore.score);
assert.ok(lunchScore.score >= 45);

const outsideScore = scoreScannerCandidate(strongCandidate, outsideWindow, 101, true, 8 * 60);
assert.equal(outsideScore.score, 0);

const lowEvScore = scoreScannerCandidate(candidate({ target1: 106 }), morningWindow, 101, true, 10 * 60 + 5);
assert.equal(lowEvScore.score, 0);

const staleScore = scoreScannerCandidate(candidate({ blockReason: 'stale setup' as NoTradeReason }), morningWindow, 101, true, 10 * 60 + 5);
assert.equal(staleScore.score, 0);

const wickOnlyScore = scoreScannerCandidate(candidate({
  setupType: SetupType.LiquiditySweep,
  scenarioLabel: 'Wick rejection support at swept liquidity',
  evidence: ['wick rejection support only'],
  requiredTrigger: 'Wick rejection support only.',
  nextAction: 'Only a wick is present; confirmation behavior is missing.',
  target1: 108,
}), morningWindow, 101, false, 10 * 60 + 5);
assert.equal(wickOnlyScore.score, 0);
assert.ok(wickOnlyScore.missingReasons.some((reason) => reason.includes('Wick rejection support is not enough')));

const turtleSoupWickScore = scoreScannerCandidate(candidate({
  setupType: SetupType.TurtleSoup,
  scenarioLabel: 'Bullish Turtle Soup failed breakdown reversal',
  evidence: [
    'sell-side liquidity sweep identified',
    'reclaim after sweep identified',
    'wick rejection support: lower wick swept sell-side liquidity and closed back above swept low',
    'expansion impulse confirmed',
    'market structure shift confirmed',
  ],
  requiredTrigger: 'Turtle Soup reclaim confirmation after sweep.',
}), morningWindow, 101, true, 10 * 60 + 5);
assert.ok(turtleSoupWickScore.score >= 75);
assert.ok(turtleSoupWickScore.qualifiedReasons.some((reason) => reason.includes('Wick rejection support')));

const countertrendScore = scoreScannerCandidate(candidate({
  setupType: SetupType.SweepMssFvgRetrace,
  scenarioLabel: 'Sweep -> MSS -> FVG Retrace',
  evidence: [
    'Liquidity sweep confirmed',
    'Reclaim after sweep confirmed',
    'Displacement confirmed',
    'Market structure shift confirmed',
    'Fair value gap / imbalance entry model',
    'Big-picture structure is bullish',
  ],
  missingEvidence: ['Countertrend setup requires immediate failure confirmation; do not fight big-picture structure'],
  requiredTrigger: 'Countertrend bearish setup requires fresh 5M confirmation.',
  nextAction: 'Countertrend conditional only. Requires immediate reclaim failure and fresh 5M confirmation. Do not fight big-picture structure.',
}), morningWindow, 101, false, 10 * 60 + 5);
assert.ok(countertrendScore.score < strongScore.score);
assert.ok(countertrendScore.missingReasons.includes('Countertrend setup requires immediate failure confirmation; do not fight big-picture structure'));

assert.equal(
  shouldSendScannerAlert({ state: 'Conditional', confidence: 76, window: morningWindow, candidate: strongCandidate }).shouldSend,
  true
);
assert.equal(
  shouldSendScannerAlert({ state: 'Conditional', confidence: 74, window: morningWindow, candidate: strongCandidate }).shouldSend,
  true
);
assert.equal(
  shouldSendScannerAlert({ state: 'Conditional', confidence: 64, window: morningWindow, candidate: strongCandidate }).shouldSend,
  false
);

const intradayMssWatchCandidate = candidate({
  setupType: SetupType.IntradayMssMicroContinuation,
  scenarioLabel: 'Intraday MSS Micro Continuation',
  direction: 'LONG',
  detectedStatus: SetupCandidateStatus.Conditional,
  executionStatus: ExecutionStatus.Conditional,
  candidateState: 'MSS_CONTINUATION_RETEST_PENDING',
  blockReason: null,
  entry: null,
  stop: 7352.75,
  target1: null,
  target2: null,
  riskPoints: null,
  modelConfidenceScore: 58,
  humanReview: {
    status: 'OpeningObservationArmed',
    canExecute: false,
    requiresTraderConfirmation: true,
    discordTradePlanEligible: true,
    reason: 'Intraday MSS watch is active; completed 5M hold/retest still required.',
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
    'Market structure shift confirmed',
    'Fair value gap / imbalance entry model',
  ],
  requiredTrigger: 'Long MSS forming. Line is 7359.25-7361.00. Do not chase. A completed 5M hold/retest above that area gives a human-review long plan.',
});
const intradayMssWatchScore = scoreScannerCandidate(intradayMssWatchCandidate, morningWindow, 7366, true, 10 * 60 + 5);
assert.notEqual(intradayMssWatchScore.hardBlocker, 'no ICT candidate/reference level');
assert.ok(intradayMssWatchScore.scorecard?.some((item) => item.note.includes('Intraday MSS Micro Continuation watch is active')));
const intradayMssWatchAlert = shouldSendScannerAlert({
  state: 'Conditional',
  confidence: 50,
  window: morningWindow,
  candidate: intradayMssWatchCandidate,
});
assert.equal(intradayMssWatchAlert.shouldSend, true);
assert.ok(intradayMssWatchAlert.reason.includes('Intraday MSS Micro Continuation watch qualified'));

assert.equal(
  shouldSendScannerAlert({ state: 'Executable', confidence: 80, window: morningWindow, candidate: strongCandidate }).shouldSend,
  true
);
assert.equal(
  shouldSendScannerAlert({ state: 'Executable', confidence: 79, window: morningWindow, candidate: strongCandidate }).shouldSend,
  false
);
assert.equal(
  shouldSendScannerAlert({ state: 'Watching', confidence: 100, window: morningWindow, candidate: strongCandidate }).shouldSend,
  false
);
assert.equal(
  shouldSendScannerAlert({ state: 'MarketMapping', confidence: 100, window: outsideWindow, candidate: strongCandidate }).shouldSend,
  false
);
assert.equal(
  shouldSendScannerAlert({ state: 'Conditional', confidence: 100, window: outsideWindow, candidate: strongCandidate }).shouldSend,
  false
);
assert.equal(
  shouldSendScannerAlert({ state: 'Conditional', confidence: 100, window: morningWindow, candidate: strongCandidate, duplicate: true }).shouldSend,
  false
);
assert.equal(
  shouldSendScannerAlert({ state: 'Conditional', confidence: 100, window: morningWindow, candidate: strongCandidate, duplicate: true, stateImproved: true }).shouldSend,
  true
);
assert.equal(
  shouldSendScannerAlert({
    state: 'Blocked',
    confidence: 70,
    window: morningWindow,
    candidate: candidate({ executionStatus: ExecutionStatus.Blocked, blockReason: NoTradeReason.RiskTooWide }),
  }).shouldSend,
  true
);

const stale = applyStaleChaseGuard({ candidate: strongCandidate, currentPrice: 104 });
assert.equal(stale.state, 'Missed');
assert.equal(stale.stale, true);

const targetAlreadyReached = applyStaleChaseGuard({ candidate: strongCandidate, currentPrice: 108 });
assert.equal(targetAlreadyReached.state, 'Missed');
assert.equal(targetAlreadyReached.stale, true);
assert.ok(targetAlreadyReached.reason?.includes('T1 was already reached'));

const notStale = applyStaleChaseGuard({ candidate: strongCandidate, currentPrice: 101 });
assert.equal(notStale.stale, false);

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

const mixedTimestampModeContext = buildNinjaChartContext({
  bars5m: [
    bar('2026-06-09T13:30:00-04:00', 7418, 7420, 7415, 7419),
    bar('2026-06-09T13:10:00-04:00', 7416, 7417, 7414, 7415),
    bar('2026-06-09T13:15:00-04:00', 7415, 7416, 7411.5, 7413),
    bar('2026-06-09T13:15:00-04:00', 7415.25, 7416.25, 7411.75, 7413.25),
    bar('2026-06-09T13:15:00-04:00', 7413, 7417, 7413, 7416.5),
    bar('2026-06-09T13:25:00-04:00', 7412.5, 7418, 7412, 7418),
    bar('2026-06-09T13:45:00-04:00', 7419, 7422, 7418, 7421),
  ],
  sessionType: 'lunch',
  instrument: 'MES',
  tradeDate: '2026-06-09',
  barTimestampMode: 'close',
});
assert.ok(mixedTimestampModeContext);
assert.deepEqual(
  mixedTimestampModeContext.candles?.map((candle) => candle.timestamp),
  [
    '2026-06-09T13:05:00-04:00',
    '2026-06-09T13:10:00-04:00',
    '2026-06-09T13:15:00-04:00',
    '2026-06-09T13:20:00-04:00',
    '2026-06-09T13:25:00-04:00',
    '2026-06-09T13:40:00-04:00',
  ]
);
assert.equal(mixedTimestampModeContext.chartTimestamp, '2026-06-09T13:40:00-04:00');
assert.equal(mixedTimestampModeContext.timeframeMssEvidence?.timeframes['5M'].barTimestampMode, 'open');
assert.equal(mixedTimestampModeContext.extractionWarnings?.timeframeUnverified, true);
assert.ok(mixedTimestampModeContext.extractionWarnings?.messages?.some((message) => message.includes('approximately 2 missing 5M bar(s)')));

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

const cascade = buildTargetCascade({
  candidate: strongCandidate,
  objectives: [objective(105, 'ninjatrader'), objective(110, 'full_context')],
  recentBars: [bar('2026-05-19T10:00:00', 100, 106, 99, 104)],
});
assert.equal(cascade.sweptTargets.length, 1);
assert.equal(cascade.activeTarget?.price, 110);
assert.equal(cascade.promotedTarget?.price, 110);

const noRoom = buildTargetCascade({
  candidate: strongCandidate,
  objectives: [objective(101, 'ninjatrader')],
  recentBars: [],
});
assert.equal(noRoom.targetRoomPoor, true);

assert.equal(scannerStateFromDecision({ decisionStatus: TradeDecisionStatus.ApprovedTrade, candidate: strongCandidate }), 'Approved');
assert.equal(scannerStateFromDecision({ decisionStatus: TradeDecisionStatus.Wait, candidate: strongCandidate }), 'Conditional');
assert.equal(scannerStateFromDecision({ decisionStatus: TradeDecisionStatus.NoTrade, candidate: null }), 'NoTrade');
assert.equal(scannerStateFromDecision({ decisionStatus: TradeDecisionStatus.OutsideRules, candidate: null }), 'MarketMapping');
assert.equal(scannerStateFromDecision({ decisionStatus: TradeDecisionStatus.Wait, candidate: strongCandidate, stale }), 'Missed');

const keyA = scannerAlertKey({ tradeDate: '2026-05-19', instrument: 'MES', session: 'morning', candidate: strongCandidate, state: 'Conditional' });
const keyB = scannerAlertKey({ tradeDate: '2026-05-19', instrument: 'MES', session: 'morning', candidate: strongCandidate, state: 'Executable' });
assert.notEqual(keyA, keyB);

const journalRecord = buildTradeJournalRecord({
  dateTime: '2026-05-19T10:05:00-04:00',
  instrument: 'MES',
  session: 'morning',
  candidate: turtleSoupWickScore.score >= 75 ? candidate({
    setupType: SetupType.TurtleSoup,
    scenarioLabel: 'Bullish Turtle Soup sweep reclaim displacement market structure shift imbalance discount',
    evidence: ['sell-side liquidity sweep identified', 'reclaim after sweep identified', 'wick rejection support', 'higher-timeframe bias aligned'],
  }) : strongCandidate,
  scannerScore: 82,
  discordAlertId: 'MORNING-20260519-100500',
  notes: 'Journal contract test. Outcome pending until trader confirms result.',
  higherTimeframeAligned: true,
});
assert.equal(journalRecord.modelType, 'Turtle Soup Reversal');
assert.equal(journalRecord.direction, 'LONG');
assert.equal(journalRecord.scannerScore, 82);
assert.equal(journalRecord.plannedR, 2);
assert.equal(journalRecord.actualResultR, null);
assert.equal(journalRecord.outcome, 'pending');
assert.equal(journalRecord.discordAlertId, 'MORNING-20260519-100500');
assert.ok(journalRecord.setupTags.includes('Turtle Soup'));
assert.ok(journalRecord.setupTags.includes('sweep'));
assert.ok(journalRecord.setupTags.includes('HTF aligned'));

const modelOneJournal = buildTradeJournalRecord({
  dateTime: '2026-05-19T10:10:00-04:00',
  instrument: 'MES',
  session: 'morning',
  candidate: candidate({
    setupType: SetupType.SweepMssFvgRetrace,
    scenarioLabel: 'Liquidity sweep reclaim displacement MSS FVG retrace',
    evidence: ['Liquidity sweep confirmed', 'Reclaim after sweep confirmed', 'Breaker + FVG overlap confluence'],
  }),
});
assert.equal(modelOneJournal.modelType, 'Sweep -> MSS -> FVG Retrace');
assert.ok(modelOneJournal.setupTags.includes('sweep'));
assert.ok(modelOneJournal.setupTags.includes('breaker/FVG confluence'));

const turtleJournal = buildTradeJournalRecord({
  dateTime: '2026-05-19T10:15:00-04:00',
  instrument: 'MES',
  session: 'morning',
  candidate: candidate({
    setupType: SetupType.TurtleSoup,
    scenarioLabel: 'Bullish Turtle Soup Reversal',
    evidence: ['Turtle Soup reversal', 'Breaker + FVG overlap confluence'],
  }),
});
assert.equal(turtleJournal.modelType, 'Turtle Soup Reversal');
assert.ok(turtleJournal.setupTags.includes('Turtle Soup'));
assert.ok(turtleJournal.setupTags.includes('breaker/FVG confluence'));

const htfDrawJournal = buildTradeJournalRecord({
  dateTime: '2026-05-19T10:18:00-04:00',
  instrument: 'MES',
  session: 'morning',
  candidate: candidate({
    setupType: SetupType.HtfDrawContinuationAfterRaid,
    scenarioLabel: 'HTF Draw Continuation After Raid/Reclaim',
    evidence: ['HTF liquidity draw detected', '5M MSS trigger confirmed', 'sell-side raid + bullish 5M MSS'],
  }),
});
assert.equal(htfDrawJournal.modelType, 'HTF Draw Continuation After Raid/Reclaim');

for (const setupType of [
  SetupType.LiquiditySweep,
  SetupType.FairValueGap,
  SetupType.FvgImbalancePullback,
  SetupType.MarketStructureShift,
  SetupType.PreviousDaySweep,
  SetupType.EqualHighsLows,
  SetupType.BreakerBlock,
]) {
  assert.equal(normalizeIctModelLabel(setupType), 'ICT setup');
  assert.equal(normalizeCandidateIctModelLabel(candidate({ setupType })), 'ICT setup');
}

for (const setupType of [
  SetupType.OrderBlock618,
  SetupType.MomentumRunaway,
  SetupType.OpeningOrderBlock,
  SetupType.InitialBalanceExtension,
  SetupType.OpeningGapFill,
  SetupType.CompressionBreakout,
  SetupType.AlgoKillZone,
  SetupType.MitigationBlock,
  SetupType.MomentumPullbackBreatherReclaim,
  SetupType.MorningFailedHighLiquidityRejection,
  SetupType.MorningReclaimLong,
  SetupType.MorningOpeningRangeContinuation,
  SetupType.LunchFailedHighReversal,
  SetupType.LunchFailedLowReversal,
  SetupType.LunchCompressionBreakout,
  SetupType.LunchFailedContinuation,
  SetupType.LunchRangeReclaim,
]) {
  assert.equal(normalizeIctModelLabel(setupType), 'ICT setup');
  assert.equal(normalizeCandidateIctModelLabel(candidate({ setupType })), 'ICT setup');
}

for (const setupType of [
  SetupType.LiquiditySweep,
  SetupType.FairValueGap,
  SetupType.FvgImbalancePullback,
  SetupType.MarketStructureShift,
  SetupType.PreviousDaySweep,
  SetupType.EqualHighsLows,
  SetupType.BreakerBlock,
  SetupType.OrderBlock618,
  SetupType.MomentumRunaway,
  SetupType.OpeningOrderBlock,
  SetupType.InitialBalanceExtension,
  SetupType.OpeningGapFill,
  SetupType.CompressionBreakout,
  SetupType.AlgoKillZone,
  SetupType.MitigationBlock,
  SetupType.MomentumPullbackBreatherReclaim,
  SetupType.MorningFailedHighLiquidityRejection,
  SetupType.MorningReclaimLong,
  SetupType.MorningOpeningRangeContinuation,
  SetupType.LunchFailedHighReversal,
  SetupType.LunchFailedLowReversal,
  SetupType.LunchCompressionBreakout,
  SetupType.LunchFailedContinuation,
  SetupType.LunchRangeReclaim,
]) {
  const record = buildTradeJournalRecord({
    dateTime: '2026-05-19T10:20:00-04:00',
    instrument: 'MES',
    session: 'morning',
    candidate: candidate({
      setupType,
      scenarioLabel: `${setupType} supporting evidence`,
      evidence: ['Liquidity sweep confirmed', 'Fair value gap / imbalance entry model', 'Breaker + FVG overlap confluence'],
    }),
  });
  assert.equal(record.modelType, 'ICT setup');
  assert.ok(record.setupTags.includes('sweep'));
  assert.ok(record.setupTags.includes('FVG'));
}

assert.equal(normalizeIctModelLabel(SetupType.SweepMssFvgRetrace), 'Sweep -> MSS -> FVG Retrace');
assert.equal(normalizeIctModelLabel(SetupType.TurtleSoup), 'Turtle Soup Reversal');
assert.equal(normalizeIctModelLabel(SetupType.HtfDrawContinuationAfterRaid), 'HTF Draw Continuation After Raid/Reclaim');
assert.equal(normalizeCandidateIctModelLabel(candidate({ setupType: SetupType.SweepMssFvgRetrace })), 'Sweep -> MSS -> FVG Retrace');
assert.equal(normalizeCandidateIctModelLabel(candidate({ setupType: SetupType.TurtleSoup })), 'Turtle Soup Reversal');
assert.equal(normalizeCandidateIctModelLabel(candidate({ setupType: SetupType.HtfDrawContinuationAfterRaid })), 'HTF Draw Continuation After Raid/Reclaim');

assert.equal(
  actualResultRFromExit({ direction: 'LONG', entry: 100, stop: 96, exit: 108 }),
  2
);
assert.equal(
  actualResultRFromExit({ direction: 'SHORT', entry: 100, stop: 104, exit: 92 }),
  2
);

console.log('localScannerEngine tests passed');
