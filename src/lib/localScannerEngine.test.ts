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
  scoreScannerCandidate,
  shouldSendScannerAlert,
} from './localScannerEngine';
import { actualResultRFromExit, buildTradeJournalRecord } from './tradeJournal';
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
const openingWindow = resolveScannerWindow(new Date('2026-05-19T09:45:00-04:00'));
const outsideWindow = resolveScannerWindow(new Date('2026-05-19T08:00:00-04:00'));

assert.equal(openingWindow.session, 'premarket');
assert.equal(openingWindow.allowsTradePlan, false);
assert.equal(openingWindow.allowsDiscordAlert, false);
assert.equal(scannerContextLogLabel(openingWindow), 'Opening Observation Window');
assert.equal(scannerContextState(openingWindow), 'MarketMapping');
assert.equal(morningWindow.session, 'morning');
assert.equal(morningWindow.allowsTradePlan, true);
assert.equal(scannerContextState(morningWindow), 'MapReady');
assert.equal(lateMorningWindow.session, 'morning');
assert.equal(lateMorningWindow.allowsTradePlan, true);
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

const lunchWindow = resolveScannerWindow(new Date('2026-05-19T12:10:00-04:00'));
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

assert.equal(
  shouldSendScannerAlert({ state: 'Conditional', confidence: 76, window: morningWindow, candidate: strongCandidate }).shouldSend,
  true
);
assert.equal(
  shouldSendScannerAlert({ state: 'Conditional', confidence: 74, window: morningWindow, candidate: strongCandidate }).shouldSend,
  false
);
assert.equal(
  shouldSendScannerAlert({ state: 'Executable', confidence: 85, window: morningWindow, candidate: strongCandidate }).shouldSend,
  true
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

const notStale = applyStaleChaseGuard({ candidate: strongCandidate, currentPrice: 101 });
assert.equal(notStale.stale, false);

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

assert.equal(
  actualResultRFromExit({ direction: 'LONG', entry: 100, stop: 96, exit: 108 }),
  2
);
assert.equal(
  actualResultRFromExit({ direction: 'SHORT', entry: 100, stop: 104, exit: 92 }),
  2
);

console.log('localScannerEngine tests passed');
