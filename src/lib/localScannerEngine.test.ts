import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  assessBridgeBarStaleness,
  applyStaleChaseGuard,
  buildCandidateLifecycleTrace,
  buildDeskState,
  buildSameSideCampaignStacks,
  buildTradeDecisionMapAudit,
  buildTargetCascade,
  compareFreshReentryPhase3Behavior,
  classifyScannerVisibility,
  latestCompletedBar,
  MARKET_MAPPING_COVERAGE,
  MARKET_MAPPING_OFF_HOURS_LABEL,
  resolveScannerWindow,
  scannerAlertKey,
  scannerContextLogLabel,
  scannerContextState,
  scannerStateFromDecision,
  selectScannerPlan,
  scoreScannerCandidate,
  shouldSendScannerAlert,
  validateDeskStateReplayPath,
} from './localScannerEngine';
import { SETUP_REGISTRY } from '../config/setupRegistry';
import { actualResultRFromExit, buildTradeJournalRecord } from './tradeJournal';
import { normalizeIctModelLabel, normalizeCandidateIctModelLabel } from './ictModelLabels';
import { buildAppTradePlan } from './planEngine';
import { buildNinjaChartContext } from './ninjaTraderBridge';
import { ExecutionStatus, NoTradeReason, SetupCandidateStatus, SetupType, TradeDecisionStatus, type ChartContext, type SetupCandidate, type TargetObjective, type TimeframeFactSet } from '../types';
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
const preOpenMappingWindow = resolveScannerWindow(new Date('2026-05-19T09:15:00-04:00'));
const postScanWindow = resolveScannerWindow(new Date('2026-05-19T15:30:00-04:00'));
const closeWindow = resolveScannerWindow(new Date('2026-05-19T16:00:00-04:00'));
const beforeEveningWindow = resolveScannerWindow(new Date('2026-05-19T18:44:00-04:00'));
const eveningWindow = resolveScannerWindow(new Date('2026-05-19T18:45:00-04:00'));
const lateEveningWindow = resolveScannerWindow(new Date('2026-05-19T22:14:00-04:00'));
const eveningCloseWindow = resolveScannerWindow(new Date('2026-05-19T22:15:00-04:00'));
const fridayEveningClosureWindow = resolveScannerWindow(new Date('2026-06-12T18:45:00-04:00'));
const weekendWindow = resolveScannerWindow(new Date('2026-06-13T10:00:00-04:00'));
const sundayBeforeEveningWindow = resolveScannerWindow(new Date('2026-06-14T18:44:00-04:00'));
const sundayEveningWindow = resolveScannerWindow(new Date('2026-06-14T18:45:00-04:00'));

assert.equal(openingWindow.session, 'morning');
assert.equal(openingWindow.allowsTradePlan, true);
assert.equal(openingWindow.allowsDiscordAlert, true);
assert.equal(openingWindow.allowsMarketMapping, true);
assert.equal(openingWindow.allowsDeskPlan, true);
assert.equal(scannerContextLogLabel(openingWindow), 'Market Mapping Mode');
assert.equal(scannerContextState(openingWindow), 'MapReady');
assert.equal(nineFiftyNineWindow.session, 'morning');
assert.equal(nineFiftyNineWindow.allowsTradePlan, true);
assert.equal(nineFiftyNineWindow.allowsDiscordAlert, true);
assert.equal(nineFiftyNineWindow.allowsMarketMapping, true);
assert.equal(nineFiftyNineWindow.allowsDeskPlan, true);
assert.equal(preOpenMappingWindow.session, 'morning');
assert.equal(preOpenMappingWindow.allowsTradePlan, true);
assert.equal(preOpenMappingWindow.allowsDiscordAlert, true);
assert.equal(preOpenMappingWindow.allowsMarketMapping, true);
assert.equal(preOpenMappingWindow.allowsDeskPlan, true);
assert.equal(scannerContextLogLabel(preOpenMappingWindow), 'Market Mapping Mode');
assert.equal(scannerContextState(preOpenMappingWindow), 'MapReady');
assert.equal(morningWindow.session, 'morning');
assert.equal(morningWindow.label, 'Morning Setup Scan');
assert.equal(morningWindow.allowsTradePlan, true);
assert.equal(morningWindow.allowsMarketMapping, true);
assert.equal(morningWindow.allowsDeskPlan, true);
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
assert.equal(postScanWindow.session, 'lunch');
assert.equal(postScanWindow.allowsTradePlan, true);
assert.equal(postScanWindow.allowsMarketMapping, true);
assert.equal(postScanWindow.allowsDeskPlan, true);
assert.equal(scannerContextLogLabel(postScanWindow), 'Market Mapping Mode');
assert.equal(scannerContextState(postScanWindow), 'MapReady');
assert.equal(outsideWindow.allowsDiscordAlert, false);
assert.equal(outsideWindow.allowsMarketMapping, false);
assert.equal(outsideWindow.allowsDeskPlan, false);
assert.equal(scannerContextLogLabel(outsideWindow), MARKET_MAPPING_OFF_HOURS_LABEL);
assert.equal(scannerContextState(outsideWindow), 'NoData');
assert.equal(closeWindow.allowsMarketMapping, false);
assert.equal(closeWindow.allowsDeskPlan, false);
assert.equal(scannerContextLogLabel(closeWindow), MARKET_MAPPING_OFF_HOURS_LABEL);
assert.equal(scannerContextState(closeWindow), 'NoData');
assert.equal(beforeEveningWindow.session, 'outside');
assert.equal(beforeEveningWindow.nextWindowLabel, 'Evening Setup Scan');
assert.equal(beforeEveningWindow.allowsTradePlan, false);
assert.equal(beforeEveningWindow.allowsMarketMapping, false);
assert.equal(eveningWindow.session, 'evening');
assert.equal(eveningWindow.label, 'Evening Setup Scan');
assert.equal(eveningWindow.allowsTradePlan, true);
assert.equal(eveningWindow.allowsDiscordAlert, true);
assert.equal(eveningWindow.allowsMarketMapping, true);
assert.equal(eveningWindow.allowsDeskPlan, true);
assert.equal(scannerContextLogLabel(eveningWindow), 'Market Mapping Mode');
assert.equal(scannerContextState(eveningWindow), 'MapReady');
assert.equal(lateEveningWindow.session, 'evening');
assert.equal(lateEveningWindow.allowsTradePlan, true);
assert.equal(eveningCloseWindow.session, 'outside');
assert.equal(eveningCloseWindow.allowsTradePlan, false);
assert.equal(eveningCloseWindow.allowsMarketMapping, false);
assert.equal(fridayEveningClosureWindow.session, 'outside');
assert.equal(fridayEveningClosureWindow.label, 'Market Closed - Weekend');
assert.equal(fridayEveningClosureWindow.allowsTradePlan, false);
assert.equal(weekendWindow.session, 'outside');
assert.equal(weekendWindow.label, 'Market Closed - Weekend');
assert.equal(weekendWindow.allowsTradePlan, false);
assert.equal(weekendWindow.allowsDiscordAlert, false);
assert.equal(weekendWindow.allowsMarketMapping, false);
assert.equal(weekendWindow.allowsDeskPlan, false);
assert.equal(scannerContextLogLabel(weekendWindow), MARKET_MAPPING_OFF_HOURS_LABEL);
assert.equal(scannerContextState(weekendWindow), 'NoData');
assert.equal(sundayBeforeEveningWindow.session, 'outside');
assert.equal(sundayBeforeEveningWindow.nextWindowLabel, 'Evening Setup Scan');
assert.equal(sundayEveningWindow.session, 'evening');
assert.equal(sundayEveningWindow.allowsTradePlan, true);
assert.equal(sundayEveningWindow.allowsDeskPlan, true);
assert.equal(sundayEveningWindow.allowsMarketMapping, true);
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
  new Date('2026-05-19T10:07:00-04:00'),
  'close'
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
  timestampMode: 'close',
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

const lowEvScore = scoreScannerCandidate(candidate({ target1: 105.75 }), morningWindow, 101, true, 10 * 60 + 5);
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
  shouldSendScannerAlert({ state: 'Watching', confidence: 64, window: morningWindow, candidate: strongCandidate }).shouldSend,
  false
);
const watchAlertDecision = shouldSendScannerAlert({ state: 'Watching', confidence: 65, window: morningWindow, candidate: strongCandidate });
assert.equal(watchAlertDecision.shouldSend, true);
assert.ok(watchAlertDecision.reason.includes('watch qualified'));
const triggerPendingWatchDecision = shouldSendScannerAlert({ state: 'TriggerPending', confidence: 65, window: morningWindow, candidate: strongCandidate });
assert.equal(triggerPendingWatchDecision.shouldSend, true);
assert.ok(triggerPendingWatchDecision.reason.includes('Watch only'));
const highQualityTriggerPendingShort = candidate({
  setupType: SetupType.SweepMssFvgRetrace,
  scenarioLabel: 'ICT Model 1 Short: Sweep Reclaim Imbalance Retrace',
  direction: 'SHORT',
  detectedStatus: SetupCandidateStatus.Conditional,
  executionStatus: ExecutionStatus.Conditional,
  blockReason: NoTradeReason.EntryTriggerPending,
  entry: 7445.75,
  stop: 7452.5,
  target1: 7435.75,
  target2: 7432.25,
  riskPoints: 6.75,
  rankScore: 227,
  decisionQualityScore: 93,
  evidence: ['Liquidity sweep, reclaim, displacement, bearish MSS, and FVG retrace are present.'],
  missingEvidence: ['Completed 5M trigger/retest proof still required.'],
  requiredTrigger: 'Entry only on retrace into bearish imbalance 7445-7446.5 after sweep, reclaim, displacement, and bearish structure shift.',
  tacticalZone: {
    sourceOfTruth: 'ohlc_fvg_zone',
    direction: 'SHORT',
    lower: 7445,
    upper: 7446.5,
    midpoint: 7445.75,
    label: '7445-7446.5 Imbalance Zone',
    sourceTimeframe: '5M',
    confidence: 'High',
    evidence: '7445-7446.5 Imbalance Zone from structured OHLC FVG facts.',
  },
});
const highQualityTriggerPendingAlert = shouldSendScannerAlert({
  state: 'TriggerPending',
  confidence: 0,
  window: morningWindow,
  candidate: highQualityTriggerPendingShort,
});
assert.equal(highQualityTriggerPendingAlert.shouldSend, true);
assert.match(highQualityTriggerPendingAlert.reason, /High-quality conditional review map qualified/);
assert.match(highQualityTriggerPendingAlert.reason, /canExecute still control execution/);
const highQualityTriggerPendingVisibility = classifyScannerVisibility({
  state: 'TriggerPending',
  candidate: highQualityTriggerPendingShort,
  window: morningWindow,
  alertDecision: highQualityTriggerPendingAlert,
  canExecute: false,
});
assert.equal(highQualityTriggerPendingVisibility.visibilityMode, 'POST_CONDITIONAL');
assert.equal(highQualityTriggerPendingVisibility.discordAction, 'post_conditional');
const highQualityTriggerPendingTrace = buildCandidateLifecycleTrace({
  candidates: [highQualityTriggerPendingShort],
  selectedCandidate: highQualityTriggerPendingShort,
  state: 'TriggerPending',
  window: morningWindow,
  alertDecision: highQualityTriggerPendingAlert,
  canExecute: false,
});
const highQualityTriggerPendingDeskState = buildDeskState({
  state: 'TriggerPending',
  candidate: highQualityTriggerPendingShort,
  visibilityMetadata: highQualityTriggerPendingVisibility,
  candidateLifecycleTrace: highQualityTriggerPendingTrace,
  currentPrice: 7445.5,
  canExecute: false,
});
assert.equal(highQualityTriggerPendingDeskState.primaryDeskPlay.direction, 'SHORT');
assert.equal(highQualityTriggerPendingDeskState.primaryDeskPlay.shortBias.state, 'primary');
assert.equal(highQualityTriggerPendingDeskState.primaryDeskPlay.shortBelow, 7445);
assert.equal(highQualityTriggerPendingDeskState.canExecute, false);

const june30SweepMssLong = candidate({
  setupType: SetupType.SweepMssFvgRetrace,
  scenarioLabel: 'ICT Model 1 Long: Sweep Reclaim Imbalance Retrace',
  direction: 'LONG',
  entry: 7514.5,
  stop: 7499.75,
  target1: 7550,
  target2: 7560,
  riskPoints: 14.75,
  rankScore: 261,
  decisionQualityScore: 92,
  modelConfidenceScore: null,
  executionStatus: ExecutionStatus.Conditional,
  blockReason: null,
  requiredTrigger: 'Entry only on retrace into bullish imbalance 7510.5-7518.25 after sweep, reclaim, displacement, and bullish structure shift.',
  tacticalZone: {
    sourceOfTruth: 'ohlc_fvg_zone',
    direction: 'LONG',
    lower: 7510.5,
    upper: 7518.25,
    midpoint: 7514.375,
    label: '7510.50-7518.25 bullish FVG',
    sourceTimeframe: '5M',
    confidence: 'High',
    evidence: 'June 30 defended bullish FVG.',
  },
});
const june30OpeningDriveLong = candidate({
  setupType: SetupType.OpeningDriveFvgContinuation,
  scenarioLabel: 'Opening Drive FVG Continuation',
  direction: 'LONG',
  entry: 7514.375,
  stop: 7510.25,
  target1: 7520.5,
  target2: 7522.75,
  riskPoints: 4.125,
  rankScore: 285.6,
  decisionQualityScore: 73,
  modelConfidenceScore: 93,
  executionStatus: ExecutionStatus.Conditional,
  blockReason: NoTradeReason.EntryTriggerPending,
  requiredTrigger: 'Human-review long: 15M bullish opening displacement, completed 5M bullish MSS/displacement, bullish 5M FVG retest/mitigation during 10:00-11:00 ET.',
  tacticalZone: {
    sourceOfTruth: 'ohlc_fvg_zone',
    direction: 'LONG',
    lower: 7510.5,
    upper: 7518.25,
    midpoint: 7514.375,
    label: '7510.50-7518.25 opening-drive FVG',
    sourceTimeframe: '5M',
    confidence: 'High',
    evidence: 'June 30 opening-drive defended FVG.',
  },
});
const june30IntradayMssLong = candidate({
  setupType: SetupType.IntradayMssMicroContinuation,
  scenarioLabel: 'Intraday MSS Micro Continuation',
  direction: 'LONG',
  entry: 7532.5,
  stop: 7492,
  target1: 7593.25,
  target2: 7613.5,
  riskPoints: 40.5,
  rankScore: 253,
  decisionQualityScore: 84,
  modelConfidenceScore: 100,
  executionStatus: ExecutionStatus.Conditional,
  blockReason: null,
  requiredTrigger: 'Human-review long: completed bullish 5M MSS plus bullish 15M MSS/displacement context, then bullish 5M FVG retest/rejection from 7510.50-7518.25 or completed close-through/retest above 7518.25.',
  tacticalZone: null,
});
const june30ShortDecoy = candidate({
  setupType: SetupType.SweepMssFvgRetrace,
  scenarioLabel: 'ICT Model 1 Short: Sweep Reclaim Imbalance Retrace',
  direction: 'SHORT',
  entry: 7512,
  stop: 7542,
  target1: 7467,
  target2: 7452,
  riskPoints: 30,
  rankScore: 261,
  decisionQualityScore: 98,
  modelConfidenceScore: null,
  executionStatus: ExecutionStatus.Conditional,
  blockReason: null,
  requiredTrigger: 'Entry only on retrace into bearish imbalance 7511.25-7512.75 after sweep, reclaim, displacement, and bearish structure shift.',
  tacticalZone: {
    sourceOfTruth: 'ohlc_fvg_zone',
    direction: 'SHORT',
    lower: 7511.25,
    upper: 7512.75,
    midpoint: 7512,
    label: '7511.25-7512.75 bearish FVG',
    sourceTimeframe: '5M',
    confidence: 'Medium',
    evidence: 'Decoy opposite-side candidate.',
  },
});
const june30AlertDecision = { shouldSend: false, reason: 'Conditional plan below threshold.' };
const june30Trace = buildCandidateLifecycleTrace({
  candidates: [june30SweepMssLong, june30OpeningDriveLong, june30IntradayMssLong, june30ShortDecoy],
  selectedCandidate: june30IntradayMssLong,
  state: 'Conditional',
  window: morningWindow,
  alertDecision: june30AlertDecision,
  canExecute: false,
});
const june30FreshStack = buildSameSideCampaignStacks({
  candidateLifecycleTrace: june30Trace,
  currentPrice: 7516,
})[0];
assert.equal(june30FreshStack.campaignDirection, 'LONG');
assert.equal(june30FreshStack.campaignStackMembers.length, 3);
assert.equal(june30FreshStack.leadTacticalPlanKey, 'SweepMssFvgRetrace|LONG|ICT Model 1 Long: Sweep Reclaim Imbalance Retrace|Conditional');
assert.equal(june30FreshStack.campaignThesisKey, 'IntradayMssMicroContinuation|LONG|Intraday MSS Micro Continuation|Conditional');
assert.equal(june30FreshStack.stackStatus, 'fresh_entry_available');
assert.equal(june30FreshStack.approvalBoundary.changesCanExecute, false);
const june30NoChaseStack = buildSameSideCampaignStacks({
  candidateLifecycleTrace: june30Trace,
  currentPrice: 7533.75,
})[0];
assert.equal(june30NoChaseStack.stackStatus, 'no_chase');
assert.equal(june30NoChaseStack.freshEntryStatus, 'no_chase');
assert.match(june30NoChaseStack.managementInstruction, /wait for a fresh pullback\/retest/i);
const june30Visibility = classifyScannerVisibility({
  state: 'Conditional',
  candidate: june30IntradayMssLong,
  window: morningWindow,
  alertDecision: june30AlertDecision,
  canExecute: false,
});
const june30DeskState = buildDeskState({
  state: 'Conditional',
  candidate: june30IntradayMssLong,
  visibilityMetadata: june30Visibility,
  candidateLifecycleTrace: june30Trace,
  currentPrice: 7533.75,
  canExecute: false,
});
assert.equal(june30DeskState.primaryDeskPlay.sameSideCampaignStack?.campaignDirection, 'LONG');
assert.equal(june30DeskState.primaryDeskPlay.sameSideCampaignStack?.stackStatus, 'no_chase');
assert.equal(june30DeskState.primaryDeskPlay.sameSideCampaignStack?.antiDrift.appTargetsFromLeadTacticalPlanOnly, true);
assert.equal(june30DeskState.primaryDeskPlay.approvalBoundary.changesTradeApprovals, false);
assert.equal(june30DeskState.canExecute, false);

const june30Tape = JSON.parse(readFileSync('tools/automation/discord-audit/scanner-decision-tape-2026-06-30-MES-morning.json', 'utf8'));
const june30TapeEvent1010 = june30Tape.events['2026-06-30T10:10:00.0000000'];
assert.equal(june30TapeEvent1010.deskState.primaryDeskPlay.direction, 'SHORT');
const june30TapeLifecycle = june30TapeEvent1010.candidateLifecycleTrace;
const june30TapeSelected = june30TapeLifecycle.selectedCandidate;
assert.equal(june30TapeSelected.direction, 'LONG');
assert.equal(june30TapeLifecycle.bestLongPlan.setupType, SetupType.SweepMssFvgRetrace);
assert.equal(june30TapeLifecycle.bestLongPlan.decisionQualityScore, 92);
assert.equal(june30TapeLifecycle.bestLongPlan.entry, 7514.5);
assert.equal(june30TapeLifecycle.bestLongPlan.stop, 7499.75);
assert.equal(june30TapeLifecycle.bestLongPlan.target1, 7550);
assert.equal(june30TapeLifecycle.bestLongPlan.target2, 7560);
const june30CurrentDeskStateFromTape = buildDeskState({
  state: june30TapeEvent1010.scannerState,
  candidate: june30TapeSelected,
  visibilityMetadata: june30TapeEvent1010.visibility,
  candidateLifecycleTrace: june30TapeLifecycle,
  currentPrice: june30TapeEvent1010.currentPrice,
  canExecute: false,
});
assert.equal(june30CurrentDeskStateFromTape.primaryDeskPlay.direction, 'LONG');
assert.equal(june30CurrentDeskStateFromTape.primaryDeskPlay.sameSideCampaignStack?.campaignDirection, 'LONG');
assert.equal(june30CurrentDeskStateFromTape.primaryDeskPlay.sameSideCampaignStack?.stackStatus, 'no_chase');
assert.equal(june30CurrentDeskStateFromTape.primaryDeskPlay.sameSideCampaignStack?.leadTacticalPlanKey, 'SweepMssFvgRetrace|LONG|ICT Model 1 Long: Sweep Reclaim Imbalance Retrace|Executable');
assert.equal(june30CurrentDeskStateFromTape.primaryDeskPlay.sameSideCampaignStack?.approvalBoundary.changesCanExecute, false);
assert.equal(june30CurrentDeskStateFromTape.canExecute, false);

const mirroredShortStack = buildSameSideCampaignStacks({
  candidateLifecycleTrace: buildCandidateLifecycleTrace({
    candidates: [
      candidate({
        setupType: SetupType.SweepMssFvgRetrace,
        direction: 'SHORT',
        scenarioLabel: 'Short Sweep MSS FVG Retrace',
        entry: 7514.5,
        stop: 7529.25,
        target1: 7485,
        target2: 7475,
        riskPoints: 14.75,
        decisionQualityScore: 92,
        requiredTrigger: 'Entry only on retrace into bearish imbalance 7510.5-7518.25 after sweep, reclaim, displacement, and bearish structure shift.',
        tacticalZone: {
          sourceOfTruth: 'ohlc_fvg_zone',
          direction: 'SHORT',
          lower: 7510.5,
          upper: 7518.25,
          midpoint: 7514.375,
          label: '7510.50-7518.25 bearish FVG',
          sourceTimeframe: '5M',
          confidence: 'High',
          evidence: 'Mirrored short FVG.',
        },
      }),
      candidate({
        setupType: SetupType.OpeningDriveFvgContinuation,
        direction: 'SHORT',
        scenarioLabel: 'Opening Drive FVG Continuation',
        entry: 7514.375,
        stop: 7520,
        target1: 7506,
        target2: 7502.75,
        riskPoints: 5.625,
        decisionQualityScore: 73,
        modelConfidenceScore: 93,
        blockReason: NoTradeReason.EntryTriggerPending,
        requiredTrigger: 'Human-review short: bearish opening displacement and bearish 5M FVG retest/mitigation.',
        tacticalZone: {
          sourceOfTruth: 'ohlc_fvg_zone',
          direction: 'SHORT',
          lower: 7510.5,
          upper: 7518.25,
          midpoint: 7514.375,
          label: '7510.50-7518.25 bearish opening-drive FVG',
          sourceTimeframe: '5M',
          confidence: 'High',
          evidence: 'Mirrored short opening-drive FVG.',
        },
      }),
      candidate({
        setupType: SetupType.IntradayMssMicroContinuation,
        direction: 'SHORT',
        scenarioLabel: 'Intraday MSS Micro Continuation',
        entry: 7509,
        stop: 7538,
        target1: 7465.5,
        target2: 7451,
        riskPoints: 29,
        decisionQualityScore: 84,
        modelConfidenceScore: 100,
        requiredTrigger: 'Human-review short: completed bearish 5M MSS plus bearish 15M MSS/displacement context, then bearish 5M FVG retest/rejection from 7510.50-7518.25.',
      }),
    ],
    selectedCandidate: null,
    state: 'Conditional',
    window: morningWindow,
    alertDecision: june30AlertDecision,
    canExecute: false,
  }),
  currentPrice: 7516,
})[0];
assert.equal(mirroredShortStack.campaignDirection, 'SHORT');
assert.equal(mirroredShortStack.campaignStackMembers.length, 3);
assert.equal(mirroredShortStack.campaignThesisKey, 'IntradayMssMicroContinuation|SHORT|Intraday MSS Micro Continuation|Conditional');
assert.equal(mirroredShortStack.approvalBoundary.changesTradeApprovals, false);
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
assert.equal(staleSelection.visibilityMetadata?.visibilityMode, 'HOLD_WITH_REASON');
assert.equal(staleSelection.visibilityMetadata?.authority.canExecute, true);
assert.equal(staleSelection.visibilityMetadata?.authority.executionEligible, true);
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
assert.equal(contextOnlyEarlyMoveSelection.visibilityMetadata?.visibilityMode, 'POST_WATCH');
assert.equal(contextOnlyEarlyMoveSelection.visibilityMetadata?.hasMeaningfulStructuredEvidence, false);
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
assert.equal(blockedSelection.visibilityMetadata?.visibilityMode, 'HOLD_WITH_REASON');
assert.equal(blockedSelection.visibilityMetadata?.holdWithReason, NoTradeReason.InvalidStopLocation);

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
assert.equal(tenOhFiveSelection.stateForAlert, 'Executable');
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

const dataQualityVisibility = classifyScannerVisibility({
  state: 'Conditional',
  candidate: candidate({
    setupType: SetupType.HtfDrawContinuationAfterRaid,
    htfLiquidityDrawState: {
      source: 'ninjatrader_ohlc',
      authority: 'ohlc_facts_only',
      boundary: 'candidate_creation_only_not_execution_authority',
      macroContext: 'unknown',
      liquidityRaidState: 'unknown',
      classification: 'NO_QUALIFIED_STATE',
      timeframeStates: [],
      fiveMinuteState: {
        timeframe: '5M',
        direction: 'unknown',
        status: 'unknown',
        lifecycleState: 'unknown',
        evidence: [],
        confidence: 0,
      },
      htfDrawContinuationPending: false,
      htfContextDataLimited: true,
      htfContextSufficiency: {
        overallStatus: 'data_limited',
        dataLimited: true,
        blockers: ['120M bars loaded below 30-day minimum.'],
        notes: [],
        timeframeCoverage: [],
      },
      classificationReliability: 'data_limited',
      confidence: 0,
      notes: [],
      blockers: ['120M bars loaded below 30-day minimum.'],
      createsTradingPlanCandidate: false,
      approvesExecution: false,
    },
  }),
  window: morningWindow,
  alertDecision: { shouldSend: false, reason: 'Blocked by fixture alert policy.' },
  canExecute: false,
});
assert.equal(dataQualityVisibility.visibilityMode, 'DATA_QUALITY_BLOCKER');
assert.equal(dataQualityVisibility.discordAction, 'hold');
assert.equal(dataQualityVisibility.authority.canExecute, false);
assert.ok(dataQualityVisibility.dataQualityBlocker?.includes('120M bars'));

const tradeDecisionMapAudit = buildTradeDecisionMapAudit();
assert.equal(tradeDecisionMapAudit.tradingLogicChanged, false);
assert.equal(tradeDecisionMapAudit.entries.length, SETUP_REGISTRY.length);
const auditedSetupTypes = new Set(tradeDecisionMapAudit.entries.map((entry) => entry.setupType));
for (const entry of SETUP_REGISTRY) {
  assert.equal(auditedSetupTypes.has(entry.setupType), true, `${entry.setupType} is missing from the Phase 9A audit`);
}
const deprecatedAuditEntries = tradeDecisionMapAudit.entries.filter((entry) => entry.role === 'deprecated');
assert.ok(deprecatedAuditEntries.length > 0);
assert.equal(deprecatedAuditEntries.every((entry) => !entry.discordEligible && !entry.executionEligible), true);
const supportingAuditEntries = tradeDecisionMapAudit.entries.filter((entry) => entry.role === 'supporting_evidence');
assert.ok(supportingAuditEntries.length > 0);
assert.equal(supportingAuditEntries.every((entry) => entry.watchEligible && !entry.planEligible && !entry.executionEligible), true);
const openingDriveAudit = tradeDecisionMapAudit.entries.find((entry) => entry.setupType === SetupType.OpeningDriveFvgContinuation);
assert.equal(openingDriveAudit?.humanReviewOnly, true);
assert.equal(openingDriveAudit?.executionEligible, false);
assert.ok(openingDriveAudit?.canExecuteRelationship.includes('canExecute=false'));
const afterLunchDriveAudit = tradeDecisionMapAudit.entries.find((entry) => entry.setupType === SetupType.AfterLunchDriveFvgContinuation);
assert.equal(afterLunchDriveAudit?.humanReviewOnly, true);
assert.equal(afterLunchDriveAudit?.executionEligible, false);
assert.ok(afterLunchDriveAudit?.canExecuteRelationship.includes('canExecute=false'));

const lifecycleTrace = buildCandidateLifecycleTrace({
  candidates: [
    strongCandidate,
    candidate({
      setupType: SetupType.TurtleSoup,
      scenarioLabel: 'Lower ranked short watch',
      direction: 'SHORT',
      executionStatus: ExecutionStatus.Conditional,
      rankScore: 72,
      entry: null,
      stop: null,
      target1: null,
      target2: null,
      missingEvidence: ['Completed 5M reclaim close missing.'],
      missingLevels: [{ key: 'entry', label: 'Entry trigger', reason: 'No completed 5M close.', source: '5m_execution', requiredFor: 'entry' }],
    }),
  ],
  selectedCandidate: strongCandidate,
  state: 'Executable',
  window: morningWindow,
  alertDecision: { shouldSend: false, reason: 'Discord duplicate suppressed by durable ledger.' },
  canExecute: true,
});
assert.equal(lifecycleTrace.candidateCount, 2);
assert.equal(lifecycleTrace.selectedCandidate?.setupType, strongCandidate.setupType);
assert.equal(lifecycleTrace.highestRankedCandidate?.setupType, strongCandidate.setupType);
assert.equal(lifecycleTrace.bestLongPlan?.selected, true);
assert.equal(lifecycleTrace.bestShortPlan?.filteredOutReason?.includes('missing full entry'), true);
assert.equal(lifecycleTrace.discordDecision.shouldSend, false);
assert.ok(lifecycleTrace.missingProofSummary.includes('Completed 5M reclaim close missing.'));
assert.equal(lifecycleTrace.notes.some((note) => note.includes('does not rerank')), true);

const deskVisibility = classifyScannerVisibility({
  state: 'Executable',
  candidate: strongCandidate,
  window: morningWindow,
  alertDecision: { shouldSend: false, reason: 'Discord duplicate suppressed by durable ledger.' },
  canExecute: false,
});
const deskState = buildDeskState({
  state: 'Executable',
  candidate: strongCandidate,
  visibilityMetadata: deskVisibility,
  candidateLifecycleTrace: lifecycleTrace,
  targetCascade: buildTargetCascade({
    candidate: strongCandidate,
    objectives: [objective(112, 'london')],
    recentBars: [],
  }),
  canExecute: false,
});
assert.equal(deskState.sourceOfTruth, 'scanner_desk_state');
assert.equal(deskState.marketMode, 'human_review_ready');
assert.equal(deskState.visibilityMode, deskVisibility.visibilityMode);
assert.equal(deskState.discordAction, deskVisibility.discordAction);
assert.equal(deskState.canExecute, false);
assert.equal(deskState.selectedCandidate?.setupType, strongCandidate.setupType);
assert.equal(deskState.bestLongPlan?.setupType, strongCandidate.setupType);
assert.equal(deskState.suppressionReason, 'Discord duplicate suppressed by durable ledger.');
assert.equal(deskState.dataQualityStatus, 'partial');
assert.equal(deskState.notes.some((note) => note.includes('does not change trade approvals')), true);
assert.equal(deskState.promotion.sourceOfTruth, 'scanner_desk_state_promotion_path');
assert.equal(deskState.promotion.currentStage, 'human_review_ready');
assert.equal(deskState.promotion.nextStage, 'posted_plan');
assert.equal(deskState.promotion.promotionReadiness, 'human_review_ready_waiting_for_existing_plan_gate');
assert.ok(deskState.promotion.requiredProof.includes('Existing trade decision pipeline must approve any posted plan.'));
assert.equal(deskState.promotion.approvalBoundary.changesTradeApprovals, false);
assert.equal(deskState.promotion.approvalBoundary.changesCanExecute, false);
assert.equal(deskState.promotion.approvalBoundary.changesEntryStopTargets, false);
assert.equal(deskState.promotion.approvalBoundary.changesRiskRules, false);
assert.equal(deskState.promotion.approvalBoundary.changesBridgeBehavior, false);
assert.equal(deskState.promotion.canPromoteNow, false);
assert.equal(deskState.primaryDeskPlay.levelTransition?.sourceOfTruth, 'scanner_level_transition_map');
assert.equal(deskState.primaryDeskPlay.levelTransition?.targetReactionLevel, 112);
assert.ok(deskState.primaryDeskPlay.levelTransition?.profitProtectionInstruction.includes('target/reaction decision area'));
assert.ok(deskState.primaryDeskPlay.levelTransition?.targetManagementInstruction.includes('take T1 seriously'));
assert.ok(deskState.primaryDeskPlay.levelTransition?.targetManagementInstruction.includes('cap expectation at T2'));
assert.equal(deskState.primaryDeskPlay.levelTransition?.approvalBoundary.changesCanExecute, false);
assert.equal(deskState.primaryDeskPlay.longBias.lineConfidence.sourceOfTruth, 'scanner_lifecycle_line_confidence');
assert.equal(deskState.primaryDeskPlay.longBias.lineConfidence.label, 'high');
assert.equal(deskState.primaryDeskPlay.longBias.lineConfidence.approvalBoundary.changesCanExecute, false);
assert.equal(deskState.primaryDeskPlay.longBias.htfReactionContext.sourceOfTruth, 'scanner_htf_reaction_context');
assert.equal(deskState.primaryDeskPlay.longBias.htfReactionContext.approvalBoundary.changesTradeApprovals, false);

const htfSupportedLong = candidate({
  scenarioLabel: 'HTF supported long recovery',
  direction: 'LONG',
  rankScore: 70,
  decisionQualityScore: 70,
  entry: 7407,
  stop: 7396.75,
  target1: 7422.5,
  target2: 7427.5,
  riskPoints: 10.25,
  evidence: ['Completed 5M reclaim/retest is the long-side recovery map.', 'HTF MSS support in campaign direction: 60M, 120M.'],
});
const htfOpposedShort = candidate({
  scenarioLabel: 'High score short into bullish HTF support',
  direction: 'SHORT',
  rankScore: 98,
  decisionQualityScore: 98,
  entry: 7391.25,
  stop: 7425,
  target1: 7340.75,
  target2: 7323.75,
  riskPoints: 33.75,
  missingEvidence: ['Active timeframe MSS ruleset found opposing completed HTF MSS on 60M, 120M.'],
});
const htfFramedLifecycle = buildCandidateLifecycleTrace({
  candidates: [htfOpposedShort, htfSupportedLong],
  selectedCandidate: htfOpposedShort,
  state: 'Conditional',
  window: morningWindow,
  alertDecision: { shouldSend: false, reason: 'Regression fixture: short was selected but is HTF-opposed.' },
  canExecute: false,
});
const htfFramedDeskState = buildDeskState({
  state: 'Conditional',
  candidate: htfOpposedShort,
  visibilityMetadata: classifyScannerVisibility({
    state: 'Conditional',
    candidate: htfOpposedShort,
    window: morningWindow,
    alertDecision: { shouldSend: false, reason: 'Regression fixture: short was selected but is HTF-opposed.' },
    canExecute: false,
  }),
  candidateLifecycleTrace: htfFramedLifecycle,
  canExecute: false,
});
assert.equal(htfFramedDeskState.selectedCandidate?.direction, 'SHORT');
assert.equal(htfFramedDeskState.primaryDeskPlay.direction, 'LONG');
assert.equal(htfFramedDeskState.primaryDeskPlay.longBias.state, 'primary');
assert.equal(htfFramedDeskState.primaryDeskPlay.shortBias.state, 'countertrend_review');
assert.ok(htfFramedDeskState.primaryDeskPlay.summary.includes('LONG remains primary'));
assert.ok(htfFramedDeskState.primaryDeskPlay.countertrendWarning?.includes('SHORT is pressing into bullish HTF/session structure'));
assert.equal(htfFramedDeskState.primaryDeskPlay.approvalBoundary.changesCanExecute, false);
assert.equal(htfFramedDeskState.primaryDeskPlay.approvalBoundary.changesTradeApprovals, false);

const refinedFifteenFiveLong = candidate({
  scenarioLabel: '15M and 5M bullish campaign refined from stale broad conflict',
  direction: 'LONG',
  setupType: SetupType.IntradayMssMicroContinuation,
  entry: 7434.5,
  stop: 7418.75,
  target1: 7458,
  target2: 7466,
  riskPoints: 15.75,
  evidence: [
    'HTF caution: opposing completed HTF MSS on 60M is reported for human review, not used to erase raw evidence or suppress the human-review plan.',
  ],
  missingEvidence: [
    'No completed 60M/120M/240M MSS support; HTF is caution/context only.',
  ],
  requiredTrigger: 'Human-review only: aligned completed 15M and 5M MSS. The completed 5M close-through activates the campaign.',
  activeCampaign: {
    id: '2026-06-12:LONG:15M5M-MSS',
    source: 'app_owned_structured_ohlc',
    authority: 'campaign_context_only_not_execution_authority',
    status: 'active',
    direction: 'LONG',
    primaryTrigger: '15M_5M_MSS',
    executionTimeframe: '5M',
    htfRelationship: 'caution',
    confidenceAdjustment: -2,
    evidenceLayers: [
      {
        layer: '15M_5M_MSS_CAMPAIGN',
        status: 'confirmed',
        direction: 'LONG',
        evidence: [
          'LONG 15M MSS/displacement context confirmed from structured OHLC.',
          'LONG 5M MSS confirmed from structured OHLC.',
        ],
        blockers: [],
      },
    ],
    htfSupportTimeframes: [],
    htfConflictTimeframes: ['60M'],
    obstacleMap: {
      lineInSand: 7420,
      reason: '15M/5M bullish campaign line in the sand.',
      role: 'management_obstacle',
      caution: 'Manage around 7420.00.',
    },
    deDuplication: {
      oneTradePerCampaignRecommended: true,
      enforced: true,
      resetPolicy: 'trade_date_direction_campaign',
    },
    notes: [
      'HTF conflict becomes caution/management context and does not erase raw 15M/5M MSS evidence.',
      '5M remains execution authority for entry, stop, risk, invalidation, and app targets.',
    ],
  },
});
const refinedFifteenFiveLifecycle = buildCandidateLifecycleTrace({
  candidates: [refinedFifteenFiveLong],
  selectedCandidate: refinedFifteenFiveLong,
  state: 'Conditional',
  window: onePmLunchPmWindow,
  alertDecision: { shouldSend: false, reason: 'Regression fixture: confirmed 15M/5M campaign should refine stale broad-context conflict.' },
  canExecute: false,
});
const refinedFifteenFiveDeskState = buildDeskState({
  state: 'Conditional',
  candidate: refinedFifteenFiveLong,
  visibilityMetadata: classifyScannerVisibility({
    state: 'Conditional',
    candidate: refinedFifteenFiveLong,
    window: onePmLunchPmWindow,
    alertDecision: { shouldSend: false, reason: 'Regression fixture: confirmed 15M/5M campaign should refine stale broad-context conflict.' },
    canExecute: false,
  }),
  candidateLifecycleTrace: refinedFifteenFiveLifecycle,
  canExecute: false,
});
assert.equal(refinedFifteenFiveLifecycle.selectedCandidate?.htfSupported, true);
assert.equal(refinedFifteenFiveLifecycle.selectedCandidate?.htfConflict, false);
assert.equal(refinedFifteenFiveDeskState.primaryDeskPlay.direction, 'LONG');
assert.equal(refinedFifteenFiveDeskState.primaryDeskPlay.longBias.state, 'primary');
assert.ok(!refinedFifteenFiveDeskState.primaryDeskPlay.summary.includes('No HTF-supported directional play'));
assert.equal(refinedFifteenFiveDeskState.primaryDeskPlay.approvalBoundary.changesCanExecute, false);
assert.equal(refinedFifteenFiveDeskState.primaryDeskPlay.approvalBoundary.changesTradeApprovals, false);

const unsupportedShort = candidate({
  scenarioLabel: 'High score short without HTF support',
  direction: 'SHORT',
  rankScore: 100,
  decisionQualityScore: 98,
  entry: 7391.25,
  stop: 7425,
  target1: 7340.75,
  target2: 7323.75,
  riskPoints: 33.75,
  evidence: ['Completed 5M bearish sweep/reclaim is present.'],
});
const unsupportedLifecycle = buildCandidateLifecycleTrace({
  candidates: [unsupportedShort],
  selectedCandidate: unsupportedShort,
  state: 'Conditional',
  window: morningWindow,
  alertDecision: { shouldSend: false, reason: 'Regression fixture: selected side lacks completed HTF support.' },
  canExecute: false,
});
const unsupportedDeskState = buildDeskState({
  state: 'Conditional',
  candidate: unsupportedShort,
  visibilityMetadata: classifyScannerVisibility({
    state: 'Conditional',
    candidate: unsupportedShort,
    window: morningWindow,
    alertDecision: { shouldSend: false, reason: 'Regression fixture: selected side lacks completed HTF support.' },
    canExecute: false,
  }),
  candidateLifecycleTrace: unsupportedLifecycle,
  canExecute: false,
});
assert.equal(unsupportedDeskState.primaryDeskPlay.direction, 'WAIT');
assert.equal(unsupportedDeskState.primaryDeskPlay.shortBias.state, 'secondary');
assert.ok(unsupportedDeskState.primaryDeskPlay.summary.includes('No HTF-supported directional play is confirmed'));
assert.ok(unsupportedDeskState.primaryDeskPlay.countertrendWarning?.includes('completed HTF support is not confirmed'));
assert.equal(unsupportedDeskState.primaryDeskPlay.approvalBoundary.changesCanExecute, false);
assert.equal(unsupportedDeskState.primaryDeskPlay.approvalBoundary.changesTradeApprovals, false);

const june12UnsupportedShort = candidate({
  scenarioLabel: 'June 12 short retrace without completed HTF support',
  setupType: SetupType.SweepMssFvgRetrace,
  direction: 'SHORT',
  rankScore: 261,
  decisionQualityScore: 98,
  entry: 7391.25,
  stop: 7425,
  target1: 7340.75,
  target2: 7323.75,
  riskPoints: 33.75,
  evidence: [
    'Completed 5M bearish sweep/reclaim is present.',
    'Generic structure supports the 5M trigger, but no completed HTF support is confirmed.',
    'No completed 60M/120M/240M MSS support; HTF is caution/context only.',
  ],
  requiredTrigger: 'Entry only on retrace into bearish imbalance 7383-7399.5 after sweep, reclaim, displacement, and bearish structure shift.',
  nextAction: 'Wait for retrace.',
});
const june12CountertrendLong = candidate({
  scenarioLabel: 'June 12 failed short long review',
  direction: 'LONG',
  rankScore: 196.5,
  decisionQualityScore: 50,
  modelConfidenceScore: 70,
  entry: null,
  stop: null,
  target1: 7450,
  target2: 7460,
  riskPoints: null,
  blockReason: NoTradeReason.EntryTriggerPending,
  missingEvidence: [
    'Active timeframe MSS ruleset found opposing completed HTF MSS on 15M, 240M.',
    'No chase: wait for a completed 5M or 15M close above 7410.00.',
  ],
  requiredTrigger: 'Failed Plan Reversal long requires failed short decision level, then fresh completed 5M bullish trigger/retest.',
});
const june12Lifecycle = buildCandidateLifecycleTrace({
  candidates: [june12UnsupportedShort, june12CountertrendLong],
  selectedCandidate: june12UnsupportedShort,
  state: 'Conditional',
  window: morningWindow,
  alertDecision: { shouldSend: false, reason: 'Regression fixture: June 12 selected short lacked completed HTF support.' },
  canExecute: false,
});
const june12DeskState = buildDeskState({
  state: 'Conditional',
  candidate: june12UnsupportedShort,
  visibilityMetadata: classifyScannerVisibility({
    state: 'Conditional',
    candidate: june12UnsupportedShort,
    window: morningWindow,
    alertDecision: { shouldSend: false, reason: 'Regression fixture: June 12 selected short lacked completed HTF support.' },
    canExecute: false,
  }),
  candidateLifecycleTrace: june12Lifecycle,
  canExecute: false,
});
assert.equal(june12DeskState.selectedCandidate?.direction, 'SHORT');
assert.equal(june12DeskState.selectedCandidate?.htfSupported, false);
assert.equal(june12DeskState.primaryDeskPlay.direction, 'WAIT');
assert.equal(june12DeskState.primaryDeskPlay.shortBias.state, 'secondary');
assert.equal(june12DeskState.primaryDeskPlay.longBias.state, 'countertrend_review');
assert.ok(june12DeskState.primaryDeskPlay.summary.includes('No HTF-supported directional play is confirmed'));
assert.ok(june12DeskState.primaryDeskPlay.countertrendWarning?.includes('completed HTF support is not confirmed'));
assert.equal(june12DeskState.primaryDeskPlay.approvalBoundary.changesCanExecute, false);
assert.equal(june12DeskState.primaryDeskPlay.approvalBoundary.changesTradeApprovals, false);

const june12ProtectedBullishHtfState: NonNullable<SetupCandidate['htfLiquidityDrawState']> = {
  source: 'ninjatrader_ohlc',
  authority: 'ohlc_facts_only',
  boundary: 'context_only_not_execution_authority',
  drawDirection: 'buy_side',
  planDirection: 'LONG',
  macroContext: 'conflicting',
  liquidityRaidState: 'none',
  classification: 'CONFLICTING_MSS',
  timeframeStates: [
    {
      timeframe: '4H',
      direction: 'neutral',
      status: 'conflicting',
      lifecycleState: 'conflicting_mss',
      evidence: ['4H wider structure remains two-sided.'],
      invalidationLevel: 7577.5,
      confirmationLevel: 7620.5,
      confidence: 45,
    },
    {
      timeframe: '2H',
      direction: 'neutral',
      status: 'conflicting',
      lifecycleState: 'conflicting_mss',
      evidence: ['2H wider structure remains two-sided.'],
      invalidationLevel: 7527.5,
      confirmationLevel: 7588,
      confidence: 45,
    },
    {
      timeframe: '1H',
      direction: 'bullish',
      status: 'confirmed',
      lifecycleState: 'confirmed_mss',
      evidence: ['1H protected bullish structure held above 7338.75.'],
      invalidationLevel: 7270.25,
      confirmationLevel: 7338.75,
      confidence: 70,
    },
    {
      timeframe: '15M',
      direction: 'bullish',
      status: 'confirmed',
      lifecycleState: 'confirmed_mss',
      evidence: ['15M protected MSS box held; completed close reclaimed 7411.75.'],
      invalidationLevel: 7377.5,
      confirmationLevel: 7411.75,
      externalLiquidityTarget: '15M buy-side draw 7460.00',
      confidence: 76,
    },
    {
      timeframe: '5M',
      direction: 'bullish',
      status: 'confirmed',
      lifecycleState: 'confirmed_mss',
      evidence: ['5M protected MSS held and reclaimed 7393.25.'],
      invalidationLevel: 7377.5,
      confirmationLevel: 7393.25,
      externalLiquidityTarget: '5M buy-side draw 7450.00',
      confidence: 78,
    },
  ],
  timeframeStack: [],
  fiveMinuteState: {
    timeframe: '5M',
    direction: 'bullish',
    status: 'confirmed',
    lifecycleState: 'confirmed_mss',
    evidence: ['5M protected MSS held and reclaimed 7393.25.'],
    invalidationLevel: 7377.5,
    confirmationLevel: 7393.25,
    confidence: 78,
  },
  fiveMinuteMssTriggerConfirmed: true,
  fiveMinuteMssConfirmationType: 'reclaim_then_break',
  postShiftState: 'retest_pending',
  fifteenMinuteConfirmationStatus: 'confirmed',
  activeScanWindow: 'MORNING_SETUP_SCAN',
  htfDrawContinuationPending: false,
  htfContextSufficiency: {
    overallStatus: 'sufficient',
    dataLimited: false,
    blockers: [],
    notes: [],
    timeframeCoverage: [],
  },
  htfContextDataLimited: false,
  timeframeCoverage: [],
  classificationReliability: 'structural',
  classificationReason: 'Protected 15M and 5M bullish structure held; wider HTF context remains management only.',
  confidence: 72,
  notes: [],
  blockers: [],
  createsTradingPlanCandidate: false,
  approvesExecution: false,
};
const june12ProtectedHoldDeskState = buildDeskState({
  state: 'Conditional',
  candidate: june12UnsupportedShort,
  visibilityMetadata: classifyScannerVisibility({
    state: 'Conditional',
    candidate: june12UnsupportedShort,
    window: morningWindow,
    alertDecision: { shouldSend: false, reason: 'Regression fixture: protected 15M/5M bullish structure held.' },
    canExecute: false,
  }),
  candidateLifecycleTrace: june12Lifecycle,
  htfLiquidityDrawState: june12ProtectedBullishHtfState,
  currentPrice: 7433.5,
  canExecute: false,
});
assert.equal(june12ProtectedHoldDeskState.selectedCandidate?.direction, 'SHORT');
assert.equal(june12ProtectedHoldDeskState.primaryDeskPlay.direction, 'LONG');
assert.equal(june12ProtectedHoldDeskState.primaryDeskPlay.trendConfirmation.sourceOfTruth, 'scanner_protected_structure_trend_confirmation');
assert.equal(june12ProtectedHoldDeskState.primaryDeskPlay.trendConfirmation.direction, 'LONG');
assert.equal(june12ProtectedHoldDeskState.primaryDeskPlay.trendConfirmation.status, 'aligned');
assert.equal(june12ProtectedHoldDeskState.primaryDeskPlay.modelRouting.sourceOfTruth, 'scanner_protected_structure_model_routing');
assert.equal(june12ProtectedHoldDeskState.primaryDeskPlay.modelRouting.primaryDirection, 'LONG');
assert.equal(june12ProtectedHoldDeskState.primaryDeskPlay.modelRouting.bestActiveModel, SetupType.IntradayMssMicroContinuation);
assert.equal(june12ProtectedHoldDeskState.primaryDeskPlay.modelRouting.bestApprovedModel, SetupType.IntradayMssMicroContinuation);
assert.equal(june12ProtectedHoldDeskState.primaryDeskPlay.modelRouting.longModelFit.sourceOfTruth, 'scanner_protected_structure_model_fit');
assert.equal(june12ProtectedHoldDeskState.primaryDeskPlay.modelRouting.longModelFit.status, 'best_fit');
assert.equal(june12ProtectedHoldDeskState.primaryDeskPlay.modelRouting.longModelFit.setupType, SetupType.IntradayMssMicroContinuation);
assert.equal(june12ProtectedHoldDeskState.primaryDeskPlay.modelRouting.shortModelFit.status, 'not_aligned');
assert.equal(june12ProtectedHoldDeskState.primaryDeskPlay.longBias.modelFit.setupType, SetupType.IntradayMssMicroContinuation);
assert.equal(june12ProtectedHoldDeskState.primaryDeskPlay.longBias.executableConsideration.sourceOfTruth, 'scanner_executable_consideration_gate_metadata');
assert.equal(june12ProtectedHoldDeskState.primaryDeskPlay.longBias.executableConsideration.status, 'review_only_missing_proof');
assert.equal(june12ProtectedHoldDeskState.primaryDeskPlay.longBias.executableConsideration.selectedRegisteredModel, SetupType.IntradayMssMicroContinuation);
assert.equal(june12ProtectedHoldDeskState.primaryDeskPlay.longBias.executableConsideration.canExecuteNow, false);
assert.equal(june12ProtectedHoldDeskState.primaryDeskPlay.longBias.tradeReadiness.sourceOfTruth, 'scanner_trade_readiness_routing');
assert.equal(june12ProtectedHoldDeskState.primaryDeskPlay.longBias.tradeReadiness.status, 'missed_no_chase');
assert.equal(june12ProtectedHoldDeskState.primaryDeskPlay.longBias.tradeReadiness.approvalBoundary.changesCanExecute, false);
assert.equal(june12ProtectedHoldDeskState.primaryDeskPlay.longBias.tradeReadiness.approvalBoundary.changesTradeApprovals, false);
assert.equal(june12ProtectedHoldDeskState.primaryDeskPlay.longBias.tradeReadiness.approvalBoundary.createsNewModel, false);
assert.equal(june12ProtectedHoldDeskState.primaryDeskPlay.shortBias.tradeReadiness.status, 'not_aligned');
assert.ok(june12ProtectedHoldDeskState.primaryDeskPlay.summary.includes('Desk Direction: LONG'));
assert.equal(june12ProtectedHoldDeskState.primaryDeskPlay.longBias.state, 'primary');
assert.equal(june12ProtectedHoldDeskState.primaryDeskPlay.shortBias.state, 'secondary');
const june12FifteenMinuteRow = june12ProtectedHoldDeskState.primaryDeskPlay.htfProtectedStructureMap.rows.find((row) => row.timeframe === '15M');
const june12FiveMinuteRow = june12ProtectedHoldDeskState.primaryDeskPlay.htfProtectedStructureMap.rows.find((row) => row.timeframe === '5M');
assert.equal(june12FifteenMinuteRow?.currentBias, 'BULL');
assert.equal(june12FifteenMinuteRow?.confirmationLine, 7411.75);
assert.equal(june12FifteenMinuteRow?.protectedStructure, 7377.5);
assert.equal(june12FifteenMinuteRow?.biasChangeLine, 7377.5);
assert.equal(june12FifteenMinuteRow?.biasChangeConfirmation, 'completed close+hold below');
assert.equal(june12FiveMinuteRow?.currentBias, 'BULL');
assert.equal(june12FiveMinuteRow?.confirmationLine, 7393.25);
assert.equal(june12FiveMinuteRow?.protectedStructure, 7377.5);
assert.equal(june12FiveMinuteRow?.biasChangeLine, 7377.5);
assert.equal(june12FiveMinuteRow?.biasChangeConfirmation, 'completed close+hold below');
assert.equal(june12ProtectedHoldDeskState.primaryDeskPlay.htfObjectiveLadder.direction, 'LONG');
assert.equal(june12ProtectedHoldDeskState.primaryDeskPlay.htfObjectiveLadder.appTarget1, 7450);
assert.equal(june12ProtectedHoldDeskState.primaryDeskPlay.htfObjectiveLadder.appTarget2, 7460);
assert.notEqual(june12ProtectedHoldDeskState.primaryDeskPlay.htfObjectiveLadder.appTarget1, june12UnsupportedShort.target1);
assert.ok(!june12ProtectedHoldDeskState.primaryDeskPlay.summary.includes('No HTF-supported directional play'));
assert.equal(june12ProtectedHoldDeskState.primaryDeskPlay.approvalBoundary.changesCanExecute, false);
assert.equal(june12ProtectedHoldDeskState.primaryDeskPlay.approvalBoundary.changesTradeApprovals, false);
assert.equal(june12ProtectedHoldDeskState.primaryDeskPlay.modelRouting.approvalBoundary.changesCanExecute, false);
assert.equal(june12ProtectedHoldDeskState.primaryDeskPlay.modelRouting.approvalBoundary.changesTradeApprovals, false);
assert.equal(june12ProtectedHoldDeskState.primaryDeskPlay.modelRouting.approvalBoundary.createsNewModel, false);

const june12DataLimitedProtectedHoldDeskState = buildDeskState({
  state: 'Conditional',
  candidate: june12UnsupportedShort,
  visibilityMetadata: classifyScannerVisibility({
    state: 'Conditional',
    candidate: june12UnsupportedShort,
    window: morningWindow,
    alertDecision: { shouldSend: false, reason: 'Regression fixture: data-limited protected HTF map cannot headline a side.' },
    canExecute: false,
  }),
  candidateLifecycleTrace: june12Lifecycle,
  htfLiquidityDrawState: {
    ...june12ProtectedBullishHtfState,
    classificationReliability: 'data_limited',
    htfContextDataLimited: true,
    htfContextSufficiency: {
      ...june12ProtectedBullishHtfState.htfContextSufficiency!,
      overallStatus: 'data_limited',
      dataLimited: true,
      blockers: ['Regression fixture: insufficient HTF history.'],
    },
  },
  currentPrice: 7433.5,
  canExecute: false,
});
assert.equal(june12DataLimitedProtectedHoldDeskState.primaryDeskPlay.direction, 'WAIT');
assert.equal(june12DataLimitedProtectedHoldDeskState.primaryDeskPlay.longBias.state, 'countertrend_review');
assert.equal(june12DataLimitedProtectedHoldDeskState.primaryDeskPlay.approvalBoundary.changesCanExecute, false);
assert.equal(june12DataLimitedProtectedHoldDeskState.primaryDeskPlay.approvalBoundary.changesTradeApprovals, false);

const staleSupportedFlagLifecycle = {
  ...june12Lifecycle,
  bestShortPlan: june12Lifecycle.bestShortPlan
    ? {
        ...june12Lifecycle.bestShortPlan,
        htfSupported: true,
        missingEvidence: [
          ...june12Lifecycle.bestShortPlan.missingEvidence,
          'No completed 60M/120M/240M MSS support; HTF is caution/context only.',
        ],
      }
    : null,
  selectedCandidate: june12Lifecycle.selectedCandidate
    ? {
        ...june12Lifecycle.selectedCandidate,
        htfSupported: true,
        missingEvidence: [
          ...june12Lifecycle.selectedCandidate.missingEvidence,
          'No completed 60M/120M/240M MSS support; HTF is caution/context only.',
        ],
      }
    : null,
};
const staleSupportedFlagDeskState = buildDeskState({
  state: 'Conditional',
  candidate: june12UnsupportedShort,
  visibilityMetadata: classifyScannerVisibility({
    state: 'Conditional',
    candidate: june12UnsupportedShort,
    window: morningWindow,
    alertDecision: { shouldSend: false, reason: 'Regression fixture: stale htfSupported flag cannot override HTF caution-only evidence.' },
    canExecute: false,
  }),
  candidateLifecycleTrace: staleSupportedFlagLifecycle,
  canExecute: false,
});
assert.equal(staleSupportedFlagDeskState.primaryDeskPlay.direction, 'WAIT');
assert.equal(staleSupportedFlagDeskState.primaryDeskPlay.shortBias.state, 'secondary');
assert.ok(staleSupportedFlagDeskState.primaryDeskPlay.summary.includes('No HTF-supported directional play is confirmed'));
assert.ok(staleSupportedFlagDeskState.primaryDeskPlay.countertrendWarning?.includes('completed HTF support is not confirmed'));
assert.equal(staleSupportedFlagDeskState.primaryDeskPlay.approvalBoundary.changesCanExecute, false);
assert.equal(staleSupportedFlagDeskState.primaryDeskPlay.approvalBoundary.changesTradeApprovals, false);

const htfSupportedButConflictedLong = candidate({
  scenarioLabel: 'Supported but HTF-opposed long review',
  direction: 'LONG',
  rankScore: 84,
  decisionQualityScore: 84,
  evidence: ['HTF MSS support in campaign direction: 60M.'],
  missingEvidence: ['Active timeframe MSS ruleset found opposing completed HTF MSS on 15M, 240M.'],
});
const htfSupportedButConflictedLifecycle = buildCandidateLifecycleTrace({
  candidates: [htfSupportedButConflictedLong],
  selectedCandidate: htfSupportedButConflictedLong,
  state: 'Conditional',
  window: morningWindow,
  alertDecision: { shouldSend: false, reason: 'Regression fixture: selected side has support text but remains HTF-opposed.' },
  canExecute: false,
});
const htfSupportedButConflictedDeskState = buildDeskState({
  state: 'Conditional',
  candidate: htfSupportedButConflictedLong,
  visibilityMetadata: classifyScannerVisibility({
    state: 'Conditional',
    candidate: htfSupportedButConflictedLong,
    window: morningWindow,
    alertDecision: { shouldSend: false, reason: 'Regression fixture: selected side has support text but remains HTF-opposed.' },
    canExecute: false,
  }),
  candidateLifecycleTrace: htfSupportedButConflictedLifecycle,
  canExecute: false,
});
assert.equal(htfSupportedButConflictedDeskState.primaryDeskPlay.direction, 'WAIT');
assert.equal(htfSupportedButConflictedDeskState.primaryDeskPlay.longBias.state, 'countertrend_review');
assert.ok(htfSupportedButConflictedDeskState.primaryDeskPlay.summary.includes('No HTF-supported directional play is confirmed'));
assert.ok(!htfSupportedButConflictedDeskState.primaryDeskPlay.summary.includes('No primary directional play'));
assert.equal(htfSupportedButConflictedDeskState.primaryDeskPlay.approvalBoundary.changesCanExecute, false);
assert.equal(htfSupportedButConflictedDeskState.primaryDeskPlay.approvalBoundary.changesTradeApprovals, false);

const targetPlanReactionObjective = objective(107, 'london');
const targetPlanRunnerObjective = objective(112, 'previous_rth');
const targetPlanExtensionObjective = objective(118, 'current_window');
const targetPlanOnlyCandidate = candidate({
  targetObjectivePlan: {
    objectives: [targetPlanReactionObjective, targetPlanRunnerObjective, targetPlanExtensionObjective],
    obstacleTarget1: null,
    liquidityTarget1: targetPlanReactionObjective,
    liquidityTarget2: targetPlanRunnerObjective,
    liquidityRunnerTarget: targetPlanExtensionObjective,
    nearestLiquidityTarget: targetPlanReactionObjective,
    nearestObstacleTarget: null,
    runnerTarget: targetPlanExtensionObjective,
    selectedT1: targetPlanReactionObjective,
    selectedT2: objective(108, 'london'),
    targetQuality: 'clear_path',
    targetModel: 'actual_r_with_structural_context',
    notes: [],
  },
});
const targetPlanOnlyLifecycle = buildCandidateLifecycleTrace({
  candidates: [targetPlanOnlyCandidate],
  selectedCandidate: targetPlanOnlyCandidate,
  state: 'Conditional',
  window: morningWindow,
  alertDecision: { shouldSend: false, reason: 'Target plan reaction fixture.' },
  canExecute: false,
});
const targetPlanOnlyDeskState = buildDeskState({
  state: 'Conditional',
  candidate: targetPlanOnlyCandidate,
  visibilityMetadata: classifyScannerVisibility({
    state: 'Conditional',
    candidate: targetPlanOnlyCandidate,
    window: morningWindow,
    alertDecision: { shouldSend: false, reason: 'Target plan reaction fixture.' },
    canExecute: false,
  }),
  candidateLifecycleTrace: targetPlanOnlyLifecycle,
  canExecute: false,
});
assert.equal(targetPlanOnlyDeskState.primaryDeskPlay.targetReactionLevel, 107);
assert.equal(targetPlanOnlyDeskState.primaryDeskPlay.targetReactionLabel, 'london liquidity 107');
assert.equal(targetPlanOnlyDeskState.primaryDeskPlay.levelTransition?.targetReactionLevel, 107);
assert.ok(targetPlanOnlyDeskState.primaryDeskPlay.levelTransition?.profitProtectionInstruction.includes('london liquidity 107'));
assert.equal(targetPlanOnlyDeskState.primaryDeskPlay.longBias.htfReactionContext.reactionLevel, 107);
assert.ok(targetPlanOnlyDeskState.primaryDeskPlay.longBias.htfReactionContext.sourceTimeframes.includes('15M'));
assert.equal(targetPlanOnlyDeskState.primaryDeskPlay.longBias.htfReactionContext.strength, 'moderate');
assert.equal(targetPlanOnlyDeskState.primaryDeskPlay.htfObjectiveLadder.sourceOfTruth, 'scanner_htf_objective_ladder');
assert.equal(targetPlanOnlyDeskState.primaryDeskPlay.htfObjectiveLadder.appTarget1, 108);
assert.equal(targetPlanOnlyDeskState.primaryDeskPlay.htfObjectiveLadder.appTarget2, 108);
assert.equal(targetPlanOnlyDeskState.primaryDeskPlay.htfObjectiveLadder.reaction?.price, 107);
assert.equal(targetPlanOnlyDeskState.primaryDeskPlay.htfObjectiveLadder.nextDraw?.price, 112);
assert.equal(targetPlanOnlyDeskState.primaryDeskPlay.htfObjectiveLadder.runner?.price, 118);
assert.ok(targetPlanOnlyDeskState.primaryDeskPlay.htfObjectiveLadder.managementInstruction.includes('App T1/T2 remain tactical'));
assert.equal(targetPlanOnlyDeskState.primaryDeskPlay.htfObjectiveLadder.approvalBoundary.changesEntryStopTargets, false);

const fvgDecisionZoneCandidate = candidate({
  setupType: SetupType.IntradayMssMicroContinuation,
  direction: 'SHORT',
  entry: 7588,
  stop: 7604,
  target1: 7564,
  target2: 7556,
  evidence: ['HTF MSS support in campaign direction: 60M.', 'FVG line in the sand mapped.'],
  tacticalZone: {
    sourceOfTruth: 'ohlc_fvg_zone',
    direction: 'SHORT',
    lower: 7589,
    upper: 7593,
    midpoint: 7591,
    label: '60M bearish FVG / imbalance zone',
    sourceTimeframe: '60M',
    confidence: 'High',
    evidence: '60M bearish FVG / imbalance zone from structured OHLC facts.',
  },
  activeRuleset: {
    htfLineInSand: {
      applied: true,
      status: 'blocked',
      required: 'completed_5m_or_15m_close_beyond_htf_line',
      appliesToAllModels: true,
      affectsExecution: true,
      direction: 'SHORT',
      lineInSand: 7591,
      lineReason: '7591.00 matters because it is the 60M bearish FVG lower boundary.',
      requiredClose: 'Completed 5M close below 7591.00 required before short continuation is active.',
      obstacleType: 'imbalance_zone',
      obstacleSource: 'app',
      evidence: ['60M bearish FVG lower boundary is mapped.'],
      blockers: ['Waiting for completed 5M acceptance below the FVG boundary.'],
    },
  },
});
const fvgDecisionZoneLifecycle = buildCandidateLifecycleTrace({
  candidates: [fvgDecisionZoneCandidate],
  selectedCandidate: fvgDecisionZoneCandidate,
  state: 'Conditional',
  window: morningWindow,
  alertDecision: { shouldSend: false, reason: 'FVG decision zone fixture.' },
  canExecute: false,
});
const fvgDecisionZoneDeskState = buildDeskState({
  state: 'Conditional',
  candidate: fvgDecisionZoneCandidate,
  visibilityMetadata: classifyScannerVisibility({
    state: 'Conditional',
    candidate: fvgDecisionZoneCandidate,
    window: morningWindow,
    alertDecision: { shouldSend: false, reason: 'FVG decision zone fixture.' },
    canExecute: false,
  }),
  candidateLifecycleTrace: fvgDecisionZoneLifecycle,
  currentPrice: 7594,
  canExecute: false,
});
assert.equal(fvgDecisionZoneDeskState.primaryDeskPlay.fvgDecisionZone?.sourceOfTruth, 'scanner_htf_fvg_decision_zone');
assert.equal(fvgDecisionZoneDeskState.primaryDeskPlay.fvgDecisionZone?.sourceTimeframe, '60M');
assert.equal(fvgDecisionZoneDeskState.primaryDeskPlay.fvgDecisionZone?.direction, 'SHORT');
assert.equal(fvgDecisionZoneDeskState.primaryDeskPlay.fvgDecisionZone?.lineInSand, 7591);
assert.equal(fvgDecisionZoneDeskState.primaryDeskPlay.fvgDecisionZone?.state, 'accepted_through');
assert.ok(fvgDecisionZoneDeskState.primaryDeskPlay.fvgDecisionZone?.managementInstruction.includes('does not approve execution'));
assert.equal(fvgDecisionZoneDeskState.primaryDeskPlay.fvgDecisionZone?.approvalBoundary.changesCanExecute, false);
assert.equal(fvgDecisionZoneDeskState.primaryDeskPlay.fvgDecisionZone?.approvalBoundary.changesTradeApprovals, false);
assert.equal(fvgDecisionZoneDeskState.primaryDeskPlay.fvgDecisionZone?.approvalBoundary.changesEntryStopTargets, false);
assert.equal(fvgDecisionZoneDeskState.primaryDeskPlay.activeTacticalZone?.sourceOfTruth, 'scanner_active_tactical_zone');
assert.equal(fvgDecisionZoneDeskState.primaryDeskPlay.activeTacticalZone?.direction, 'SHORT');
assert.equal(fvgDecisionZoneDeskState.primaryDeskPlay.activeTacticalZone?.lower, 7589);
assert.equal(fvgDecisionZoneDeskState.primaryDeskPlay.activeTacticalZone?.upper, 7593);
assert.equal(fvgDecisionZoneDeskState.primaryDeskPlay.activeTacticalZone?.state, 'waiting_retest');
assert.ok(fvgDecisionZoneDeskState.primaryDeskPlay.activeTacticalZone?.nextTrigger.includes('completed 5M hold/reject below'));
assert.ok(fvgDecisionZoneDeskState.primaryDeskPlay.activeTacticalZone?.reason.includes('structured OHLC facts'));
assert.equal(fvgDecisionZoneDeskState.primaryDeskPlay.activeTacticalZone?.approvalBoundary.changesCanExecute, false);
assert.equal(fvgDecisionZoneDeskState.primaryDeskPlay.activeTacticalZone?.approvalBoundary.changesTradeApprovals, false);
assert.equal(fvgDecisionZoneDeskState.primaryDeskPlay.activeTacticalZone?.approvalBoundary.changesEntryStopTargets, false);
assert.equal(fvgDecisionZoneDeskState.primaryDeskPlay.htfFvgCascade?.sourceOfTruth, 'scanner_htf_fvg_cascade_parent_zone_routing');
assert.equal(fvgDecisionZoneDeskState.primaryDeskPlay.htfFvgCascade?.direction, 'SHORT');
assert.equal(fvgDecisionZoneDeskState.primaryDeskPlay.htfFvgCascade?.parentZone?.timeframe, '60M');
assert.equal(fvgDecisionZoneDeskState.primaryDeskPlay.htfFvgCascade?.parentZone?.lower, 7589);
assert.equal(fvgDecisionZoneDeskState.primaryDeskPlay.htfFvgCascade?.parentZone?.upper, 7593);
assert.equal(fvgDecisionZoneDeskState.primaryDeskPlay.htfFvgCascade?.parentZone?.state, 'waiting_retest');
assert.equal(fvgDecisionZoneDeskState.primaryDeskPlay.htfFvgCascade?.childExecutionZone?.source, 'parent_htf_zone_with_5m_trigger');
assert.equal(fvgDecisionZoneDeskState.primaryDeskPlay.htfFvgCascade?.childExecutionZone?.timeframe, '5M');
assert.equal(fvgDecisionZoneDeskState.primaryDeskPlay.htfFvgCascade?.childExecutionZone?.lower, 7589);
assert.equal(fvgDecisionZoneDeskState.primaryDeskPlay.htfFvgCascade?.childExecutionZone?.upper, 7593);
assert.equal(fvgDecisionZoneDeskState.primaryDeskPlay.htfFvgCascade?.childExecutionZone?.entry, 7588);
assert.equal(fvgDecisionZoneDeskState.primaryDeskPlay.htfFvgCascade?.childExecutionZone?.stop, 7604);
assert.ok(fvgDecisionZoneDeskState.primaryDeskPlay.htfFvgCascade?.routingSummary.includes('HTF-first routing'));
assert.ok(fvgDecisionZoneDeskState.primaryDeskPlay.htfFvgCascade?.standDown.includes('completed 5M acceptance above parent zone'));
assert.equal(fvgDecisionZoneDeskState.primaryDeskPlay.htfFvgCascade?.approvalBoundary.changesCanExecute, false);
assert.equal(fvgDecisionZoneDeskState.primaryDeskPlay.htfFvgCascade?.approvalBoundary.changesTradeApprovals, false);
assert.equal(fvgDecisionZoneDeskState.primaryDeskPlay.htfFvgCascade?.approvalBoundary.changesEntryStopTargets, false);
assert.equal(fvgDecisionZoneDeskState.primaryDeskPlay.htfFvgCascade?.approvalBoundary.changesRiskRules, false);
assert.equal(fvgDecisionZoneDeskState.primaryDeskPlay.htfFvgCascade?.approvalBoundary.createsNewModel, false);

const routedHtfReactionCandidate = candidate({
  setupType: SetupType.IntradayMssMicroContinuation,
  scenarioLabel: '60M parent FVG rejection with 5M child proof',
  direction: 'SHORT',
  entry: 7588,
  stop: 7604,
  target1: 7564,
  target2: 7556,
  riskPoints: 16,
  requiredTrigger: 'Completed 5M close and hold below 7596.00.',
  nextAction: 'SHORT BELOW 7596.00 after completed 5M proof.',
  evidence: ['HTF parent FVG reaction rejected.', 'Same-direction 5M child FVG confirmed.'],
});
const routedHtfReactionLifecycle = buildCandidateLifecycleTrace({
  candidates: [routedHtfReactionCandidate],
  selectedCandidate: routedHtfReactionCandidate,
  state: 'Conditional',
  window: noonLunchPmWindow,
  alertDecision: { shouldSend: false, reason: 'HTF FVG reaction routing fixture.' },
  canExecute: false,
});
const routedHtfReactionChartContext = {
  multiTimeframeContext: {
    source: 'ninjatrader_bridge',
    authority: 'ohlc_facts_only',
    fourHour: {
      timeframe: '4h',
      role: 'macro_context',
      barCount: 0,
      high: null,
      low: null,
      open: null,
      close: null,
      midpoint: null,
      rangePoints: null,
      trend: 'unknown',
      candles: [],
      fvgZones: [],
      liquiditySweeps: [],
      reclaimEvents: [],
      failedBreakEvents: [],
      displacementCandles: [],
      structuralLevels: [],
      confidence: 'Low',
      notes: [],
    },
    oneHour: {
      timeframe: '1h',
      role: 'session_structure',
      barCount: 3,
      high: 7610,
      low: 7580,
      open: 7605,
      close: 7588.5,
      midpoint: 7595,
      rangePoints: 30,
      trend: 'bearish',
      candles: [
        { index: 0, timestamp: '2026-06-23T11:00:00.0000000', open: 7607, high: 7610, low: 7598, close: 7602, direction: 'bearish', confidence: 'High' },
        { index: 1, timestamp: '2026-06-23T12:00:00.0000000', open: 7588, high: 7603, low: 7582, close: 7588.5, direction: 'bearish', confidence: 'High' },
      ],
      fvgZones: [
        {
          direction: 'SHORT',
          lower: 7596,
          upper: 7604,
          midpoint: 7600,
          formedAt: '2026-06-23T10:00:00.0000000',
          confidence: 'High',
        },
      ],
      liquiditySweeps: [],
      reclaimEvents: [],
      failedBreakEvents: [],
      displacementCandles: [],
      structuralLevels: [],
      confidence: 'High',
      notes: [],
    },
    fifteenMinute: {
      timeframe: '15m',
      role: 'liquidity_map',
      barCount: 0,
      high: null,
      low: null,
      open: null,
      close: null,
      midpoint: null,
      rangePoints: null,
      trend: 'unknown',
      candles: [],
      fvgZones: [],
      liquiditySweeps: [],
      reclaimEvents: [],
      failedBreakEvents: [],
      displacementCandles: [],
      structuralLevels: [],
      confidence: 'Low',
      notes: [],
    },
    fiveMinute: {
      timeframe: '5m',
      role: 'execution',
      barCount: 3,
      high: 7598,
      low: 7580,
      open: 7594,
      close: 7588.5,
      midpoint: 7589,
      rangePoints: 18,
      trend: 'bearish',
      candles: [],
      fvgZones: [
        {
          direction: 'SHORT',
          lower: 7590,
          upper: 7592,
          midpoint: 7591,
          formedAt: '2026-06-23T12:05:00.0000000',
          confidence: 'High',
        },
      ],
      liquiditySweeps: [],
      reclaimEvents: [],
      failedBreakEvents: [],
      displacementCandles: [],
      structuralLevels: [],
      confidence: 'High',
      notes: [],
    },
    alignment: {
      macroBias: 'SHORT',
      sessionBias: 'SHORT',
      liquidityBias: 'SHORT',
      executionBias: 'SHORT',
      alignedDirection: 'SHORT',
      conflicts: [],
      notes: [],
    },
    targetMap: { levelsToWatch: [] },
    rules: {
      higherTimeframesApproveTrades: false,
      fiveMinuteExecutionRequired: true,
      aiMayOverwriteOhlcFacts: false,
    },
    notes: [],
  },
} as Partial<ChartContext>;
const routedHtfReactionDeskState = buildDeskState({
  state: 'Conditional',
  candidate: routedHtfReactionCandidate,
  visibilityMetadata: classifyScannerVisibility({
    state: 'Conditional',
    candidate: routedHtfReactionCandidate,
    window: noonLunchPmWindow,
    alertDecision: { shouldSend: false, reason: 'HTF FVG reaction routing fixture.' },
    canExecute: false,
  }),
  candidateLifecycleTrace: routedHtfReactionLifecycle,
  currentPrice: 7588.5,
  canExecute: false,
  chartContext: routedHtfReactionChartContext,
});
assert.equal(routedHtfReactionDeskState.primaryDeskPlay.direction, 'SHORT');
assert.equal(routedHtfReactionDeskState.primaryDeskPlay.htfFvgReactionRouting?.status, 'routed_active_reaction');
assert.equal(routedHtfReactionDeskState.primaryDeskPlay.htfFvgReactionRouting?.lineInSand, 7596);
assert.equal(routedHtfReactionDeskState.primaryDeskPlay.htfFvgReactionRouting?.lineLabel, 'SHORT BELOW 7596.00 from 60M parent FVG 7596.00-7604.00');
assert.equal(routedHtfReactionDeskState.primaryDeskPlay.htfFvgReactionRouting?.lifecycleState, 'rejected');
assert.equal(routedHtfReactionDeskState.primaryDeskPlay.htfFvgReactionRouting?.standDown, 'Stand down on completed 5M acceptance above parent zone 7604.00.');
assert.ok(routedHtfReactionDeskState.primaryDeskPlay.htfFvgReactionRouting?.reason.includes('Execution still requires normal 5M trigger'));
assert.equal(routedHtfReactionDeskState.primaryDeskPlay.htfFvgReactionRouting?.approvalBoundary.changesCanExecute, false);
assert.equal(routedHtfReactionDeskState.primaryDeskPlay.htfFvgReactionRouting?.approvalBoundary.changesTradeApprovals, false);
assert.equal(routedHtfReactionDeskState.primaryDeskPlay.htfFvgReactionRouting?.approvalBoundary.changesEntryStopTargets, false);
assert.equal(routedHtfReactionDeskState.primaryDeskPlay.htfFvgReactionRouting?.approvalBoundary.changesRiskRules, false);
assert.equal(routedHtfReactionDeskState.primaryDeskPlay.htfFvgReactionRouting?.approvalBoundary.createsNewModel, false);
assert.equal(routedHtfReactionDeskState.primaryDeskPlay.shortBias.tradeReadiness.status, 'not_aligned');
assert.equal(routedHtfReactionDeskState.primaryDeskPlay.shortBias.tradeReadiness.displayStatus, 'htf_parent_active_waiting_5m_proof');
assert.equal(routedHtfReactionDeskState.primaryDeskPlay.shortBias.tradeReadiness.displayLabel, 'HTF PARENT ACTIVE - WAITING 5M PROOF');
assert.match(routedHtfReactionDeskState.primaryDeskPlay.shortBias.tradeReadiness.displayReason || '', /completed 5M proof still controls/i);
assert.equal(routedHtfReactionDeskState.primaryDeskPlay.shortBias.tradeReadiness.approvalBoundary.changesCanExecute, false);
assert.equal(routedHtfReactionDeskState.primaryDeskPlay.shortBias.tradeReadiness.approvalBoundary.changesTradeApprovals, false);

const opposingParentHtfReactionChartContext = JSON.parse(JSON.stringify(routedHtfReactionChartContext)) as Partial<ChartContext>;
if (opposingParentHtfReactionChartContext.multiTimeframeContext?.oneHour) {
  opposingParentHtfReactionChartContext.multiTimeframeContext.oneHour.trend = 'bullish';
  opposingParentHtfReactionChartContext.multiTimeframeContext.oneHour.low = 7386;
  opposingParentHtfReactionChartContext.multiTimeframeContext.oneHour.high = 7408.75;
  opposingParentHtfReactionChartContext.multiTimeframeContext.oneHour.close = 7401.75;
  opposingParentHtfReactionChartContext.multiTimeframeContext.oneHour.candles = [
    { index: 0, timestamp: '2026-06-11T14:00:00.0000000', open: 7386, high: 7408.75, low: 7386, close: 7408.75, direction: 'bullish', confidence: 'High' },
    { index: 1, timestamp: '2026-06-25T09:55:00.0000000', open: 7424.75, high: 7432, low: 7399.5, close: 7401.75, direction: 'bearish', confidence: 'High' },
  ];
  opposingParentHtfReactionChartContext.multiTimeframeContext.oneHour.fvgZones = [
    {
      direction: 'LONG',
      lower: 7386,
      upper: 7408.75,
      midpoint: 7397.375,
      formedAt: '2026-06-11T14:00:00.0000000',
      confidence: 'High',
    },
  ];
}
if (opposingParentHtfReactionChartContext.multiTimeframeContext?.fiveMinute) {
  opposingParentHtfReactionChartContext.multiTimeframeContext.fiveMinute.fvgZones = [
    {
      direction: 'SHORT',
      lower: 7407,
      upper: 7410.5,
      midpoint: 7408.75,
      formedAt: '2026-06-25T09:50:00.0000000',
      confidence: 'High',
    },
  ];
}
const opposingParentHtfReactionDeskState = buildDeskState({
  state: 'Missed',
  candidate: routedHtfReactionCandidate,
  visibilityMetadata: classifyScannerVisibility({
    state: 'Missed',
    candidate: routedHtfReactionCandidate,
    window: noonLunchPmWindow,
    alertDecision: { shouldSend: false, reason: 'Missed setup below educational alert threshold.' },
    canExecute: false,
    staleReason: 'Move occurred without preferred retest. No chase entry.',
  }),
  candidateLifecycleTrace: buildCandidateLifecycleTrace({
    candidates: [routedHtfReactionCandidate],
    selectedCandidate: routedHtfReactionCandidate,
    state: 'Missed',
    window: noonLunchPmWindow,
    alertDecision: { shouldSend: false, reason: 'Missed setup below educational alert threshold.' },
    staleReason: 'Move occurred without preferred retest. No chase entry.',
    canExecute: false,
  }),
  currentPrice: 7401.75,
  canExecute: false,
  chartContext: opposingParentHtfReactionChartContext,
});
assert.equal(opposingParentHtfReactionDeskState.primaryDeskPlay.direction, 'WAIT');
assert.equal(opposingParentHtfReactionDeskState.primaryDeskPlay.htfFvgReactionRouting?.status, 'missing_child_5m_confirmation');
assert.equal(opposingParentHtfReactionDeskState.primaryDeskPlay.htfFvgParentReactionWatch?.sourceOfTruth, 'scanner_htf_parent_fvg_reaction_watch');
assert.equal(opposingParentHtfReactionDeskState.primaryDeskPlay.htfFvgParentReactionWatch?.direction, 'LONG');
assert.equal(opposingParentHtfReactionDeskState.primaryDeskPlay.htfFvgParentReactionWatch?.lineInSand, 7408.75);
assert.ok(opposingParentHtfReactionDeskState.primaryDeskPlay.htfFvgParentReactionWatch?.requiredProof.includes('same-direction completed 5M child proof'));
assert.equal(opposingParentHtfReactionDeskState.primaryDeskPlay.htfFvgParentReactionWatch?.approvalBoundary.changesCanExecute, false);
assert.equal(opposingParentHtfReactionDeskState.primaryDeskPlay.htfFvgParentReactionWatch?.approvalBoundary.changesTradeApprovals, false);
assert.equal(opposingParentHtfReactionDeskState.primaryDeskPlay.discordEligible, true);
assert.equal(opposingParentHtfReactionDeskState.primaryDeskPlay.longBias.tradeReadiness.status, 'not_aligned');
assert.equal(opposingParentHtfReactionDeskState.primaryDeskPlay.longBias.tradeReadiness.displayStatus, 'htf_parent_active_waiting_5m_child_confirmation');
assert.equal(opposingParentHtfReactionDeskState.primaryDeskPlay.longBias.tradeReadiness.displayLabel, 'HTF PARENT ACTIVE - WAITING 5M CHILD PROOF');
assert.match(opposingParentHtfReactionDeskState.primaryDeskPlay.longBias.tradeReadiness.displayAction || '', /same-direction completed 5M child proof/i);
assert.equal(opposingParentHtfReactionDeskState.primaryDeskPlay.longBias.tradeReadiness.approvalBoundary.changesCanExecute, false);

const missedHtfReactionVisibility = classifyScannerVisibility({
  state: 'Missed',
  candidate: routedHtfReactionCandidate,
  window: noonLunchPmWindow,
  alertDecision: { shouldSend: false, reason: 'Missed/no-chase fixture.' },
  canExecute: false,
  staleReason: 'Current price is closer to T1 than the preferred entry zone. Move occurred without preferred retest. No chase entry.',
});
const missedHtfReactionDeskState = buildDeskState({
  state: 'Missed',
  candidate: routedHtfReactionCandidate,
  visibilityMetadata: missedHtfReactionVisibility,
  candidateLifecycleTrace: buildCandidateLifecycleTrace({
    candidates: [routedHtfReactionCandidate],
    selectedCandidate: {
      ...routedHtfReactionCandidate,
      missingEvidence: [
        ...routedHtfReactionCandidate.missingEvidence,
        'No chase: old entry already moved into target context.',
      ],
    },
    state: 'Missed',
    window: noonLunchPmWindow,
    alertDecision: { shouldSend: false, reason: 'Missed/no-chase fixture.' },
    staleReason: 'Current price is closer to T1 than the preferred entry zone. Move occurred without preferred retest. No chase entry.',
    canExecute: false,
  }),
  currentPrice: 7564,
  canExecute: false,
  chartContext: routedHtfReactionChartContext,
});
assert.equal(missedHtfReactionDeskState.primaryDeskPlay.freshReentryWatch?.sourceOfTruth, 'scanner_fresh_tactical_reentry_watch');
assert.equal(missedHtfReactionDeskState.primaryDeskPlay.freshReentryWatch?.eligible, true);
assert.equal(missedHtfReactionDeskState.primaryDeskPlay.freshReentryWatch?.direction, 'SHORT');
assert.equal(missedHtfReactionDeskState.primaryDeskPlay.freshReentryWatch?.lineInSand, 7596);
assert.equal(missedHtfReactionDeskState.primaryDeskPlay.freshReentryWatch?.levelsStatus, 'pending_fresh_structure');
assert.ok(missedHtfReactionDeskState.primaryDeskPlay.freshReentryWatch?.requiredProof.includes('Completed 5M close/hold below 7596.00'));
assert.ok(missedHtfReactionDeskState.primaryDeskPlay.freshReentryWatch?.nextStep.includes('build a fresh deterministic entry/stop/T1/T2'));
assert.equal(missedHtfReactionDeskState.primaryDeskPlay.freshReentryWatch?.approvalBoundary.changesCanExecute, false);
assert.equal(missedHtfReactionDeskState.primaryDeskPlay.freshReentryWatch?.approvalBoundary.changesTradeApprovals, false);
assert.equal(missedHtfReactionDeskState.primaryDeskPlay.freshReentryWatch?.approvalBoundary.changesEntryStopTargets, false);
assert.equal(missedHtfReactionDeskState.primaryDeskPlay.freshReentryWatch?.approvalBoundary.changesRiskRules, false);
assert.equal(missedHtfReactionDeskState.primaryDeskPlay.freshReentryWatch?.approvalBoundary.changesRanking, false);
assert.equal(missedHtfReactionDeskState.primaryDeskPlay.freshReentryWatch?.approvalBoundary.createsNewModel, false);

const freshReentryPhase3ChartContext = JSON.parse(JSON.stringify(routedHtfReactionChartContext)) as Partial<ChartContext>;
if (freshReentryPhase3ChartContext.multiTimeframeContext?.fiveMinute) {
  freshReentryPhase3ChartContext.multiTimeframeContext.fiveMinute.candles = [
    { index: 0, timestamp: '2026-06-23T12:00:00.0000000', open: 7598, high: 7599.75, low: 7594, close: 7597, direction: 'bearish', confidence: 'High' },
    { index: 1, timestamp: '2026-06-23T12:05:00.0000000', open: 7597, high: 7598.25, low: 7589, close: 7592, direction: 'bearish', confidence: 'High' },
  ];
}
const freshReentryPhase3DeskState = buildDeskState({
  state: 'Missed',
  candidate: routedHtfReactionCandidate,
  visibilityMetadata: missedHtfReactionVisibility,
  candidateLifecycleTrace: buildCandidateLifecycleTrace({
    candidates: [routedHtfReactionCandidate],
    selectedCandidate: {
      ...routedHtfReactionCandidate,
      missingEvidence: [
        ...routedHtfReactionCandidate.missingEvidence,
        'No chase: old entry already moved into target context.',
      ],
    },
    state: 'Missed',
    window: noonLunchPmWindow,
    alertDecision: { shouldSend: false, reason: 'Missed/no-chase fixture.' },
    staleReason: 'Current price is closer to T1 than the preferred entry zone. Move occurred without preferred retest. No chase entry.',
    canExecute: false,
  }),
  currentPrice: 7592,
  canExecute: false,
  chartContext: freshReentryPhase3ChartContext,
});
const phase3CandidateSet = freshReentryPhase3DeskState.primaryDeskPlay.freshReentryCandidates;
assert.equal(phase3CandidateSet?.sourceOfTruth, 'scanner_fresh_tactical_reentry_candidate_builder');
assert.equal(phase3CandidateSet?.oldBehavior.watchOnly, true);
assert.equal(phase3CandidateSet?.approvalStatus, 'approved_discord_conditional_display');
assert.equal(phase3CandidateSet?.inputs.fiveMinuteAcceptance, true);
assert.equal(phase3CandidateSet?.bestCandidate?.source, 'active_line_retest');
assert.equal(phase3CandidateSet?.bestCandidate?.entry, 7596);
assert.equal(phase3CandidateSet?.bestCandidate?.stop, 7600);
assert.equal(phase3CandidateSet?.bestCandidate?.target1, 7590);
assert.equal(phase3CandidateSet?.bestCandidate?.target2, 7588);
assert.equal(phase3CandidateSet?.bestCandidate?.riskPoints, 4);
assert.equal(phase3CandidateSet?.bestCandidate?.status, 'ready_for_owner_review');
assert.equal(phase3CandidateSet?.bestCandidate?.approvalStatus, 'approved_discord_conditional_display');
assert.equal(phase3CandidateSet?.approvalBoundary.changesCanExecute, false);
assert.equal(phase3CandidateSet?.approvalBoundary.changesTradeApprovals, false);
assert.equal(phase3CandidateSet?.approvalBoundary.changesModelDefinitions, false);
assert.equal(phase3CandidateSet?.approvalBoundary.changesBarCloseHandling, false);
assert.equal(phase3CandidateSet?.approvalBoundary.approvedForDiscordConditionalDisplay, true);
assert.equal(phase3CandidateSet?.approvalBoundary.changesExecutionApproval, false);
assert.equal(freshReentryPhase3DeskState.canExecute, false);
assert.equal(freshReentryPhase3DeskState.visibilityMetadata.authority.canExecute, false);
const phase3Comparison = compareFreshReentryPhase3Behavior([missedHtfReactionDeskState, freshReentryPhase3DeskState]);
assert.equal(phase3Comparison.oldWatchOnlyCycles, 2);
assert.equal(phase3Comparison.newCandidateCycles, 1);
assert.equal(phase3Comparison.readyCandidateCycles, 1);
assert.equal(phase3Comparison.riskProfileChanged, true);
assert.equal(phase3Comparison.discordConditionalDisplayApproved, true);
assert.equal(phase3Comparison.canExecuteBoundaryPreserved, true);
assert.deepEqual(phase3Comparison.changedEntries[0], {
  cycleIndex: 0,
  direction: 'SHORT',
  oldEntry: 7588,
  oldStop: 7604,
  oldRiskPoints: 16,
  newEntry: 7596,
  newStop: 7600,
  newRiskPoints: 4,
  riskDeltaPoints: -12,
});

const waitWithParentHtfFvgCandidate = candidate({
  setupType: SetupType.IntradayMssMicroContinuation,
  scenarioLabel: '15M parent FVG reaction with 5M proof pending',
  direction: 'LONG',
  priority: 72,
  rankScore: 72,
  decisionQualityScore: 62,
  entry: 7453.75,
  stop: null,
  target1: null,
  target2: null,
  riskPoints: null,
  missingEvidence: ['opposing HTF context still requires completed 5M proof.'],
  nextAction: 'Wait for completed 5M close and hold above 7454.50.',
  requiredTrigger: 'Completed 5M close and hold above 7454.50.',
  activeRuleset: {
    htfLineInSand: {
      applied: true,
      status: 'blocked',
      required: 'completed_5m_or_15m_close_beyond_htf_line',
      appliesToAllModels: true,
      affectsExecution: true,
      direction: 'LONG',
      lineInSand: 7454.5,
      lineReason: '7454.50 is the active 15M confirmation line.',
      requiredClose: 'Completed 5M close above 7454.50 required before long continuation is active.',
      obstacleType: 'imbalance_zone',
      obstacleSource: 'ninjatrader',
      evidence: ['15M FVG reaction is mapped.'],
      blockers: ['Waiting for completed 5M acceptance above 7454.50.'],
    },
  },
});
const waitWithParentHtfFvgLifecycle = buildCandidateLifecycleTrace({
  candidates: [waitWithParentHtfFvgCandidate],
  selectedCandidate: waitWithParentHtfFvgCandidate,
  state: 'Conditional',
  window: noonLunchPmWindow,
  alertDecision: { shouldSend: false, reason: 'WAIT map fixture.' },
  canExecute: false,
});
const waitWithParentHtfFvgChartContext = {
  multiTimeframeContext: {
    source: 'ninjatrader_bridge',
    authority: 'ohlc_facts_only',
    fifteenMinute: {
      timeframe: '15m',
      role: 'liquidity_map',
      barCount: 120,
      high: 7480,
      low: 7420,
      open: 7440,
      close: 7453.5,
      midpoint: 7450,
      rangePoints: 60,
      trend: 'balanced',
      candles: [],
      fvgZones: [
        {
          direction: 'LONG',
          lower: 7448,
          upper: 7454.5,
          midpoint: 7451.25,
          formedAt: '2026-06-23T13:45:00.000-04:00',
          confidence: 'High',
        },
      ],
      liquiditySweeps: [],
      reclaimEvents: [],
      failedBreakEvents: [],
      displacementCandles: [],
      structuralLevels: [],
      confidence: 'High',
      notes: [],
    },
    oneHour: {
      timeframe: '1h',
      role: 'session_structure',
      barCount: 60,
      high: 7580,
      low: 7420,
      open: 7500,
      close: 7453.5,
      midpoint: 7500,
      rangePoints: 160,
      trend: 'bearish',
      candles: [],
      fvgZones: [],
      liquiditySweeps: [],
      reclaimEvents: [],
      failedBreakEvents: [],
      displacementCandles: [],
      structuralLevels: [],
      confidence: 'High',
      notes: [],
    },
    fourHour: {
      timeframe: '4h',
      role: 'macro_context',
      barCount: 30,
      high: 7580,
      low: 7420,
      open: 7540,
      close: 7453.5,
      midpoint: 7500,
      rangePoints: 160,
      trend: 'bearish',
      candles: [],
      fvgZones: [],
      liquiditySweeps: [],
      reclaimEvents: [],
      failedBreakEvents: [],
      displacementCandles: [],
      structuralLevels: [],
      confidence: 'High',
      notes: [],
    },
    fiveMinute: {
      timeframe: '5m',
      role: 'execution',
      barCount: 120,
      high: 7480,
      low: 7420,
      open: 7452,
      close: 7453.5,
      midpoint: 7450,
      rangePoints: 60,
      trend: 'balanced',
      candles: [],
      fvgZones: [],
      liquiditySweeps: [],
      reclaimEvents: [],
      failedBreakEvents: [],
      displacementCandles: [],
      structuralLevels: [],
      confidence: 'High',
      notes: [],
    },
    alignment: {
      macroBias: 'SHORT',
      sessionBias: 'SHORT',
      liquidityBias: 'NEUTRAL',
      executionBias: 'NEUTRAL',
      alignedDirection: 'CONFLICTED',
      conflicts: ['Higher timeframe resistance remains overhead.'],
      notes: [],
    },
    targetMap: {
      nearestUpsideLiquidity: null,
      majorUpsideLiquidity: null,
      nearestDownsideLiquidity: null,
      majorDownsideLiquidity: null,
      levelsToWatch: [],
    },
    rules: {
      higherTimeframesApproveTrades: false,
      fiveMinuteExecutionRequired: true,
      aiMayOverwriteOhlcFacts: false,
    },
    notes: [],
  },
} as Partial<ChartContext>;
const waitWithParentHtfFvgDeskState = buildDeskState({
  state: 'Conditional',
  candidate: waitWithParentHtfFvgCandidate,
  visibilityMetadata: classifyScannerVisibility({
    state: 'Conditional',
    candidate: waitWithParentHtfFvgCandidate,
    window: noonLunchPmWindow,
    alertDecision: { shouldSend: false, reason: 'WAIT map fixture.' },
    canExecute: false,
  }),
  candidateLifecycleTrace: waitWithParentHtfFvgLifecycle,
  currentPrice: 7453.5,
  canExecute: false,
  chartContext: waitWithParentHtfFvgChartContext,
});
assert.equal(waitWithParentHtfFvgDeskState.primaryDeskPlay.direction, 'WAIT');
assert.equal(waitWithParentHtfFvgDeskState.primaryDeskPlay.htfFvgCascade?.sourceOfTruth, 'scanner_htf_fvg_cascade_parent_zone_routing');
assert.equal(waitWithParentHtfFvgDeskState.primaryDeskPlay.htfFvgCascade?.direction, 'LONG');
assert.equal(waitWithParentHtfFvgDeskState.primaryDeskPlay.htfFvgCascade?.parentZone?.timeframe, '15M');
assert.equal(waitWithParentHtfFvgDeskState.primaryDeskPlay.htfFvgCascade?.parentZone?.lower, 7448);
assert.equal(waitWithParentHtfFvgDeskState.primaryDeskPlay.htfFvgCascade?.parentZone?.upper, 7454.5);
assert.equal(waitWithParentHtfFvgDeskState.primaryDeskPlay.htfFvgCascade?.parentZone?.state, 'in_zone');
assert.equal(waitWithParentHtfFvgDeskState.primaryDeskPlay.htfFvgCascade?.childExecutionZone?.source, 'parent_htf_zone_with_5m_trigger');
assert.ok(/completed 5M/i.test(waitWithParentHtfFvgDeskState.primaryDeskPlay.htfFvgCascade?.childExecutionZone?.triggerNeeded || ''));
assert.equal(waitWithParentHtfFvgDeskState.primaryDeskPlay.htfFvgCascade?.approvalBoundary.changesCanExecute, false);
assert.equal(waitWithParentHtfFvgDeskState.primaryDeskPlay.htfFvgCascade?.approvalBoundary.changesTradeApprovals, false);
assert.equal(waitWithParentHtfFvgDeskState.primaryDeskPlay.htfFvgCascade?.approvalBoundary.changesEntryStopTargets, false);

const cycleLevelHtfState: NonNullable<SetupCandidate['htfLiquidityDrawState']> = {
  source: 'ninjatrader_ohlc',
  authority: 'ohlc_facts_only',
  boundary: 'context_only_not_execution_authority',
  drawDirection: 'unknown',
  planDirection: 'NONE',
  macroContext: 'conflicting',
  raidState: 'none',
  liquidityRaidState: 'none',
  reclaimStatus: 'not_confirmed',
  classification: 'CONFLICTING_MSS',
  timeframeStates: [
    {
      timeframe: '4H',
      direction: 'neutral',
      status: 'conflicting',
      lifecycleState: 'conflicting_mss',
      evidence: ['Confirmed close above prior 5M swing high 7620.5 with displacement.'],
      invalidationLevel: 7386.25,
      confirmationLevel: 7620.5,
      externalLiquidityTarget: '4H buy-side reaction 7476.75',
      confidence: 35,
    },
    {
      timeframe: '15M',
      direction: 'bearish',
      status: 'confirmed',
      lifecycleState: 'confirmed_mss',
      evidence: ['Confirmed close below prior 5M swing low 7402.5 with displacement.'],
      invalidationLevel: 7418.25,
      confirmationLevel: 7402.5,
      externalLiquidityTarget: '15M sell-side reaction 7377.50',
      confidence: 66,
    },
  ],
  timeframeStack: [],
  fiveMinuteState: {
    timeframe: '5M',
    direction: 'neutral',
    status: 'conflicting',
    lifecycleState: 'conflicting_mss',
    evidence: [],
    confidence: 35,
  },
  fiveMinuteMssTriggerConfirmed: false,
  fiveMinuteMssConfirmationType: 'unknown',
  postShiftState: 'unknown',
  fifteenMinuteConfirmationStatus: 'confirmed',
  activeScanWindow: 'LUNCH_PM_SETUP_SCAN',
  htfDrawContinuationPending: false,
  htfContextSufficiency: {
    overallStatus: 'sufficient',
    dataLimited: false,
    blockers: [],
    notes: [],
    timeframeCoverage: [],
  },
  htfContextDataLimited: false,
  timeframeCoverage: [],
  classificationReliability: 'structural',
  classificationReason: 'Structured cycle-level HTF facts are sufficient.',
  confidence: 35,
  notes: [],
  blockers: [],
  createsTradingPlanCandidate: false,
  approvesExecution: false,
};
const fallbackHtfCandidate = candidate({
  htfLiquidityDrawState: undefined,
  evidence: ['Selected candidate has no embedded HTF state.'],
});
const fallbackHtfLifecycle = buildCandidateLifecycleTrace({
  candidates: [fallbackHtfCandidate],
  selectedCandidate: fallbackHtfCandidate,
  state: 'Watching',
  window: noonLunchPmWindow,
  alertDecision: { shouldSend: true, reason: 'Cycle-level HTF map fixture.' },
  canExecute: false,
});
const fallbackHtfDeskState = buildDeskState({
  state: 'Watching',
  candidate: fallbackHtfCandidate,
  visibilityMetadata: classifyScannerVisibility({
    state: 'Watching',
    candidate: fallbackHtfCandidate,
    window: noonLunchPmWindow,
    alertDecision: { shouldSend: true, reason: 'Cycle-level HTF map fixture.' },
    canExecute: false,
  }),
  candidateLifecycleTrace: fallbackHtfLifecycle,
  htfLiquidityDrawState: cycleLevelHtfState,
  canExecute: false,
});
assert.equal(fallbackHtfDeskState.htfContextStatus, 'sufficient');
assert.equal(fallbackHtfDeskState.primaryDeskPlay.htfProtectedStructureMap.sourceOfTruth, 'scanner_htf_protected_structure_map');
assert.equal(fallbackHtfDeskState.primaryDeskPlay.htfProtectedStructureMap.rows.length, 2);
assert.equal(fallbackHtfDeskState.primaryDeskPlay.htfProtectedStructureMap.rows[0].timeframe, '4H');
assert.equal(fallbackHtfDeskState.primaryDeskPlay.htfProtectedStructureMap.rows[0].protectedStructure, 7386.25);
assert.equal(fallbackHtfDeskState.primaryDeskPlay.htfProtectedStructureMap.rows[0].confirmationLine, 7620.5);
assert.equal(fallbackHtfDeskState.primaryDeskPlay.htfProtectedStructureMap.rows[0].target, 7476.75);
assert.equal(fallbackHtfDeskState.primaryDeskPlay.htfProtectedStructureMap.approvalBoundary.changesCanExecute, false);
assert.equal(fallbackHtfDeskState.primaryDeskPlay.htfProtectedStructureMap.approvalBoundary.changesEntryStopTargets, false);

const watchDeskVisibility = classifyScannerVisibility({
  state: 'Watching',
  candidate: candidate({
    entry: null,
    stop: null,
    target1: null,
    target2: null,
    requiredTrigger: 'Completed 5M close through line in the sand required.',
  }),
  window: morningWindow,
  alertDecision: { shouldSend: true, reason: 'Scanner watch qualified for Discord.' },
  canExecute: false,
});
const watchLifecycle = buildCandidateLifecycleTrace({
  candidates: [candidate({ entry: null, stop: null, target1: null, target2: null })],
  selectedCandidate: candidate({ entry: null, stop: null, target1: null, target2: null }),
  state: 'Watching',
  window: morningWindow,
  alertDecision: { shouldSend: true, reason: 'Scanner watch qualified for Discord.' },
  canExecute: false,
});
const watchDeskState = buildDeskState({
  state: 'Watching',
  candidate: candidate({
    entry: null,
    stop: null,
    target1: null,
    target2: null,
    requiredTrigger: 'Completed 5M close through line in the sand required.',
  }),
  visibilityMetadata: watchDeskVisibility,
  candidateLifecycleTrace: watchLifecycle,
  canExecute: false,
});
assert.equal(watchDeskState.promotion.currentStage, 'watch');
assert.equal(watchDeskState.promotion.nextStage, 'conditional');
assert.equal(watchDeskState.promotion.promotionReadiness, 'watch_waiting_for_completed_5m');
assert.ok(watchDeskState.promotion.requiredProof.includes('Completed 5M trigger or retest proof.'));
assert.ok(watchDeskState.promotion.requiredProof.includes('No-chase check when price is extended.'));
assert.ok(watchDeskState.promotion.blockedBy.includes('App-owned entry trigger not confirmed.'));
assert.equal(watchDeskState.promotion.canPromoteNow, false);
assert.ok(watchDeskState.promotion.missingProof.includes('App-owned entry trigger not confirmed.'));
const replayValidation = validateDeskStateReplayPath([watchDeskState, deskState]);
assert.equal(replayValidation.sourceOfTruth, 'scanner_desk_state_replay_validation');
assert.equal(replayValidation.watchAppearedBeforePlan, true);
assert.equal(replayValidation.promotionPathObserved, true);
assert.equal(replayValidation.watchToPlanPromotionProofed, true);
assert.equal(replayValidation.canExecuteBoundaryPreserved, true);
assert.equal(replayValidation.singleSourceOfTruthPresent, true);
assert.equal(replayValidation.discordRagUiAligned, true);
assert.equal(replayValidation.promotionBoundary.changesCanExecute, false);
assert.equal(replayValidation.authority.replayValidationApprovesTrade, false);
const emptyReplayValidation = validateDeskStateReplayPath([]);
assert.equal(emptyReplayValidation.cycleCount, 0);
assert.equal(emptyReplayValidation.singleSourceOfTruthPresent, false);
assert.equal(emptyReplayValidation.discordRagUiAligned, false);
assert.equal(emptyReplayValidation.noChasePreserved, false);
assert.equal(emptyReplayValidation.watchToPlanPromotionProofed, false);
assert.equal(emptyReplayValidation.canExecuteBoundaryPreserved, false);

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

function htfFvgMicroMssCandidate(direction: 'LONG' | 'SHORT', overrides: Partial<SetupCandidate> = {}): SetupCandidate {
  const line = direction === 'LONG' ? 7500.75 : 7490.25;
  const entry = direction === 'LONG' ? 7501.75 : 7489.25;
  const stop = direction === 'LONG' ? 7492.75 : 7498.75;
  const target1 = direction === 'LONG' ? 7515.25 : 7475;
  const target2 = direction === 'LONG' ? 7519.75 : 7470.25;
  return candidate({
    setupType: SetupType.IntradayMssMicroContinuation,
    scenarioLabel: `${direction} HTF FVG Reaction + 5M Micro MSS Reversal`,
    direction,
    candidateState: 'MSS_CONTINUATION_RETEST_PENDING',
    detectedStatus: SetupCandidateStatus.Conditional,
    executionStatus: ExecutionStatus.Conditional,
    priority: 96,
    rankScore: 236,
    decisionQualityScore: 72,
    modelConfidenceScore: 72,
    entry,
    stop,
    target1,
    target2,
    riskPoints: Math.abs(entry - stop),
    evidence: [
      `${direction} 60M HTF FVG parent reaction support from structured OHLC.`,
      `Completed ${direction === 'LONG' ? 'bullish' : 'bearish'} 5M MSS close-through.`,
      `${direction} HTF FVG reaction plus 5M micro MSS supports a human-review campaign.`,
    ],
    missingEvidence: [],
    blockReason: NoTradeReason.EntryTriggerPending,
    requiredTrigger: direction === 'LONG'
      ? 'Human-review long: completed bullish 5M MSS close-through, then completed 5M retest/hold above 7500.75.'
      : 'Human-review short: completed bearish 5M MSS close-through, then completed 5M retest/failure below 7490.25.',
    nextAction: direction === 'LONG'
      ? 'Long MSS forming from 60M HTF FVG reaction. Line in the sand 7500.75; wait for completed 5M retest/hold above it.'
      : 'Short MSS forming from 60M HTF FVG reaction. Line in the sand 7490.25; wait for completed 5M retest/failure below it.',
    invalidation: direction === 'LONG'
      ? 'Invalid if completed 5M acceptance fails below protected retest swing.'
      : 'Invalid if completed 5M acceptance fails above protected retest swing.',
    activeRuleset: {
      htfLineInSand: {
        applied: true,
        status: 'passed',
        required: 'completed_5m_or_15m_close_beyond_htf_line',
        appliesToAllModels: true,
        affectsExecution: false,
        direction,
        lineInSand: line,
        lineReason: direction === 'LONG'
          ? '7500.75 is the completed 5M MSS close-through/reclaim line after the 60M HTF FVG reaction.'
          : '7490.25 is the completed 5M MSS close-through/rejection line after the 60M HTF FVG reaction.',
        requiredClose: direction === 'LONG'
          ? 'Completed 5M close and hold above 7500.75.'
          : 'Completed 5M close and hold below 7490.25.',
        obstacleType: 'imbalance_zone',
        obstacleSource: 'ninjatrader',
        evidence: ['60M HTF FVG reaction is mapped from NinjaTrader OHLC.'],
        blockers: [],
      },
    },
    ...overrides,
  });
}

function htfFvgMicroMssChartContext(direction: 'LONG' | 'SHORT'): Partial<ChartContext> {
  const parentLower = direction === 'LONG' ? 7494 : 7490.25;
  const parentUpper = direction === 'LONG' ? 7500.75 : 7498;
  const formedAt = '2026-07-02T13:00:00.0000000';
  const reactionAt = '2026-07-02T14:00:00.0000000';
  const parentCandles = [
    {
      index: 0,
      timestamp: reactionAt,
      open: direction === 'LONG' ? 7497 : 7492,
      high: direction === 'LONG' ? 7504 : 7495,
      low: direction === 'LONG' ? 7495 : 7488,
      close: direction === 'LONG' ? 7503 : 7489,
      direction: direction === 'LONG' ? 'bullish' as const : 'bearish' as const,
      confidence: 'High' as const,
    },
  ];
  const parentSet: TimeframeFactSet = {
    timeframe: '1h',
    role: 'macro_context',
    barCount: parentCandles.length,
    high: parentCandles[0].high,
    low: parentCandles[0].low,
    open: parentCandles[0].open,
    close: parentCandles[0].close,
    midpoint: (parentCandles[0].high + parentCandles[0].low) / 2,
    rangePoints: parentCandles[0].high - parentCandles[0].low,
    trend: direction === 'LONG' ? 'bullish' : 'bearish',
    candles: parentCandles,
    fullWindowCandles: parentCandles,
    fvgZones: [{
      direction,
      lower: parentLower,
      upper: parentUpper,
      midpoint: (parentLower + parentUpper) / 2,
      formedAt,
      impulseQualified: true,
      confidence: 'High',
    }],
    fullWindowFvgZones: [{
      direction,
      lower: parentLower,
      upper: parentUpper,
      midpoint: (parentLower + parentUpper) / 2,
      formedAt,
      impulseQualified: true,
      confidence: 'High',
    }],
    liquiditySweeps: [],
    reclaimEvents: [],
    failedBreakEvents: [],
    displacementCandles: [],
    structuralLevels: [],
    confidence: 'High',
    notes: [],
  };
  const fiveMinuteSet: TimeframeFactSet = {
    ...parentSet,
    timeframe: '5m',
    role: 'execution',
    fvgZones: [{
      direction,
      lower: direction === 'LONG' ? 7500.75 : 7489.75,
      upper: direction === 'LONG' ? 7501.5 : 7490.25,
      midpoint: direction === 'LONG' ? 7501.125 : 7490,
      formedAt: '2026-07-02T14:10:00.0000000',
      impulseQualified: true,
      confidence: 'High',
    }],
    fullWindowFvgZones: undefined,
  };
  return {
    multiTimeframeContext: {
      source: 'ninjatrader_bridge',
      authority: 'ohlc_facts_only',
      fourHour: { ...parentSet, timeframe: '4h', fvgZones: [], fullWindowFvgZones: [] },
      oneHour: parentSet,
      fifteenMinute: { ...parentSet, timeframe: '15m', role: 'session_structure', fvgZones: [], fullWindowFvgZones: [] },
      fiveMinute: fiveMinuteSet,
      alignment: {
        macroBias: direction,
        sessionBias: direction,
        liquidityBias: direction,
        executionBias: direction,
        alignedDirection: direction,
        conflicts: [],
        notes: [],
      },
      targetMap: { levelsToWatch: [] },
      rules: {
        higherTimeframesApproveTrades: false,
        fiveMinuteExecutionRequired: true,
        aiMayOverwriteOhlcFacts: false,
      },
      notes: [],
    },
  };
}

const july2OldShort = htfFvgMicroMssCandidate('SHORT', {
  setupType: SetupType.SweepMssFvgRetrace,
  scenarioLabel: 'Old short campaign still visible',
  rankScore: 258,
  decisionQualityScore: 93,
  entry: 7504.5,
  stop: 7509,
  target1: 7497.75,
  target2: 7495.5,
  riskPoints: 4.5,
  evidence: ['Earlier bearish 5M FVG retest candidate.'],
  activeRuleset: {
    htfLineInSand: {
      applied: true,
      status: 'passed',
      required: 'completed_5m_or_15m_close_beyond_htf_line',
      appliesToAllModels: true,
      affectsExecution: false,
      direction: 'SHORT',
      lineInSand: 7503,
      lineReason: '7503.00 is the older bearish tactical retest line.',
      requiredClose: 'Completed 5M close below 7503.00.',
      obstacleType: 'imbalance_zone',
      obstacleSource: 'ninjatrader',
      evidence: ['Older bearish 5M imbalance retest.'],
      blockers: [],
    },
  },
  requiredTrigger: 'Entry only on retrace into bearish imbalance 7503-7505.75.',
  nextAction: 'Old short remains management only if the new long transition holds.',
});
const july2LongWatch = htfFvgMicroMssCandidate('LONG', {
  entry: 7501.75,
  stop: null,
  target1: null,
  target2: null,
  riskPoints: null,
  missingEvidence: [
    'Protected 5M retest swing stop blocked: retest low is not a confirmed protected 5M swing low.',
    'App T1/T2 from actual entry/stop risk',
  ],
});
const july2LongWatchTrace = buildCandidateLifecycleTrace({
  candidates: [july2OldShort, july2LongWatch],
  selectedCandidate: july2LongWatch,
  state: 'Conditional',
  window: noonLunchPmWindow,
  alertDecision: { shouldSend: false, reason: 'July 2 HTF FVG micro MSS watch fixture.' },
  canExecute: false,
});
const july2LongWatchDeskState = buildDeskState({
  state: 'Conditional',
  candidate: july2LongWatch,
  visibilityMetadata: classifyScannerVisibility({
    state: 'Conditional',
    candidate: july2LongWatch,
    window: noonLunchPmWindow,
    alertDecision: { shouldSend: false, reason: 'July 2 HTF FVG micro MSS watch fixture.' },
    canExecute: false,
  }),
  candidateLifecycleTrace: july2LongWatchTrace,
  currentPrice: 7504.25,
  canExecute: false,
  chartContext: htfFvgMicroMssChartContext('LONG'),
});
assert.equal(july2LongWatchDeskState.primaryDeskPlay.direction, 'LONG');
assert.equal(july2LongWatchDeskState.primaryDeskPlay.longBias.state, 'primary');
assert.equal(july2LongWatchDeskState.primaryDeskPlay.longBias.modelFit.setupType, SetupType.IntradayMssMicroContinuation);
assert.equal(july2LongWatchDeskState.primaryDeskPlay.longBias.modelFit.status, 'best_fit');
assert.match(july2LongWatchDeskState.primaryDeskPlay.longBias.modelFit.reason, /HTF FVG reaction plus completed 5M micro MSS/);
assert.equal(july2LongWatchDeskState.primaryDeskPlay.longBias.lineInSand, 7500.75);
assert.equal(july2LongWatchDeskState.primaryDeskPlay.longBias.tradeReadiness.status, 'wait_for_pullback_or_new_5m_structure');
assert.equal(july2LongWatchDeskState.primaryDeskPlay.discordEligible, true);
assert.equal(july2LongWatchDeskState.canExecute, false);
assert.equal(july2LongWatchDeskState.primaryDeskPlay.approvalBoundary.changesCanExecute, false);
assert.equal(july2LongWatchDeskState.primaryDeskPlay.htfFvgMicroMssProof?.htfFvgProof.status, 'sufficient');
assert.equal(july2LongWatchDeskState.primaryDeskPlay.htfFvgMicroMssProof?.htfFvgProof.timeframe, '60M');
assert.equal(july2LongWatchDeskState.primaryDeskPlay.htfFvgMicroMssProof?.fiveMinuteTriggerProof.status, 'completed');
assert.equal(july2LongWatchDeskState.primaryDeskPlay.htfFvgMicroMssProof?.protectedSwingProof.status, 'pending');
assert.equal(july2LongWatchDeskState.primaryDeskPlay.htfFvgMicroMssProof?.promotionReadiness, 'watch_only');

const july2LongFullPlan = htfFvgMicroMssCandidate('LONG', {
  entry: 7501.25,
  stop: 7492.75,
  target1: 7514,
  target2: 7518.25,
  riskPoints: 8.5,
  candidateState: 'QUALIFIED_CONDITIONAL',
  requiredTrigger: 'Completed 5M retest/hold above 7500.75 after the 14:20 ET protected swing low at 7493.00.',
  nextAction: 'Human-review long plan from 60M HTF FVG reaction and 5M retest/hold above 7500.75.',
});
const july2LongFullTrace = buildCandidateLifecycleTrace({
  candidates: [july2OldShort, july2LongFullPlan],
  selectedCandidate: july2LongFullPlan,
  state: 'Conditional',
  window: noonLunchPmWindow,
  alertDecision: { shouldSend: true, reason: 'July 2 protected retest/hold long qualified.' },
  canExecute: false,
});
const july2LongFullDeskState = buildDeskState({
  state: 'Conditional',
  candidate: july2LongFullPlan,
  visibilityMetadata: classifyScannerVisibility({
    state: 'Conditional',
    candidate: july2LongFullPlan,
    window: noonLunchPmWindow,
    alertDecision: { shouldSend: true, reason: 'July 2 protected retest/hold long qualified.' },
    canExecute: false,
  }),
  candidateLifecycleTrace: july2LongFullTrace,
  currentPrice: 7501.25,
  canExecute: false,
  chartContext: htfFvgMicroMssChartContext('LONG'),
});
assert.equal(july2LongFullDeskState.primaryDeskPlay.direction, 'LONG');
assert.equal(july2LongFullDeskState.primaryDeskPlay.longBias.state, 'primary');
assert.equal(july2LongFullDeskState.primaryDeskPlay.longBias.modelFit.status, 'best_fit');
assert.equal(july2LongFullDeskState.primaryDeskPlay.longBias.executableConsideration.canExecuteNow, false);
assert.equal(july2LongFullDeskState.primaryDeskPlay.longBias.lineInSand, 7500.75);
assert.equal(july2LongFullDeskState.bestLongPlan?.entry, 7501.25);
assert.equal(july2LongFullDeskState.bestLongPlan?.stop, 7492.75);
assert.equal(july2LongFullDeskState.bestLongPlan?.target1, 7514);
assert.equal(july2LongFullDeskState.bestLongPlan?.target2, 7518.25);
assert.equal(july2LongFullDeskState.canExecute, false);
assert.equal(july2LongFullDeskState.primaryDeskPlay.htfFvgMicroMssProof?.htfFvgProof.status, 'sufficient');
assert.equal(july2LongFullDeskState.primaryDeskPlay.htfFvgMicroMssProof?.fiveMinuteTriggerProof.status, 'completed');
assert.equal(july2LongFullDeskState.primaryDeskPlay.htfFvgMicroMssProof?.protectedSwingProof.status, 'confirmed');
assert.equal(july2LongFullDeskState.primaryDeskPlay.htfFvgMicroMssProof?.promotionReadiness, 'full_plan_allowed');

const mirroredShortWatch = htfFvgMicroMssCandidate('SHORT', {
  stop: null,
  target1: null,
  target2: null,
  riskPoints: null,
  missingEvidence: ['Protected 5M retest swing stop blocked: retest high is not a confirmed protected 5M swing high.'],
});
const mirroredShortTrace = buildCandidateLifecycleTrace({
  candidates: [mirroredShortWatch],
  selectedCandidate: mirroredShortWatch,
  state: 'Conditional',
  window: noonLunchPmWindow,
  alertDecision: { shouldSend: false, reason: 'Mirrored HTF FVG short watch fixture.' },
  canExecute: false,
});
const mirroredShortDeskState = buildDeskState({
  state: 'Conditional',
  candidate: mirroredShortWatch,
  visibilityMetadata: classifyScannerVisibility({
    state: 'Conditional',
    candidate: mirroredShortWatch,
    window: noonLunchPmWindow,
    alertDecision: { shouldSend: false, reason: 'Mirrored HTF FVG short watch fixture.' },
    canExecute: false,
  }),
  candidateLifecycleTrace: mirroredShortTrace,
  currentPrice: 7488.5,
  canExecute: false,
  chartContext: htfFvgMicroMssChartContext('SHORT'),
});
assert.equal(mirroredShortDeskState.primaryDeskPlay.direction, 'SHORT');
assert.equal(mirroredShortDeskState.primaryDeskPlay.shortBias.state, 'primary');
assert.equal(mirroredShortDeskState.primaryDeskPlay.shortBias.modelFit.setupType, SetupType.IntradayMssMicroContinuation);
assert.equal(mirroredShortDeskState.primaryDeskPlay.shortBias.lineInSand, 7490.25);
assert.equal(mirroredShortDeskState.primaryDeskPlay.shortBias.tradeReadiness.status, 'wait_for_pullback_or_new_5m_structure');
assert.equal(mirroredShortDeskState.canExecute, false);
assert.equal(mirroredShortDeskState.primaryDeskPlay.htfFvgMicroMssProof?.htfFvgProof.status, 'sufficient');
assert.equal(mirroredShortDeskState.primaryDeskPlay.htfFvgMicroMssProof?.fiveMinuteTriggerProof.status, 'completed');
assert.equal(mirroredShortDeskState.primaryDeskPlay.htfFvgMicroMssProof?.protectedSwingProof.status, 'pending');

console.log('localScannerEngine tests passed');
