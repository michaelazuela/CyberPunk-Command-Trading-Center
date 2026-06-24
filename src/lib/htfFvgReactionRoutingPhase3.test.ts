import assert from 'node:assert/strict';
import {
  buildCandidateLifecycleTrace,
  buildDeskState,
  classifyScannerVisibility,
  resolveScannerWindow,
} from './localScannerEngine';
import { ExecutionStatus, SetupCandidateStatus, SetupType, type ChartCandleFact, type ChartContext, type FvgZoneFact, type SetupCandidate, type TimeframeFactSet } from '../types';

type Direction = 'LONG' | 'SHORT';

interface TestBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface TestFvg {
  direction: Direction;
  formedAt: string;
  lower: number;
  upper: number;
  midpoint: number;
}

function candidate(direction: Direction, overrides: Partial<SetupCandidate> = {}): SetupCandidate {
  const entry = direction === 'SHORT' ? 7476.25 : 7456.25;
  const stop = direction === 'SHORT' ? 7485.75 : 7448.25;
  const target1 = direction === 'SHORT' ? 7462 : 7468.25;
  const target2 = direction === 'SHORT' ? 7457.25 : 7472.25;
  return {
    setupType: direction === 'SHORT' ? SetupType.AfterLunchDriveFvgContinuation : SetupType.IntradayMssMicroContinuation,
    scenarioLabel: `${direction} lifecycle fixture`,
    direction,
    detectedStatus: SetupCandidateStatus.Detected,
    confidence: 'High',
    priority: direction === 'LONG' ? 95 : 90,
    entry,
    stop,
    target1,
    target2,
    riskPoints: Math.abs(entry - stop),
    invalidation: direction === 'SHORT'
      ? 'Invalid if completed 5M reclaims above 7485.75.'
      : 'Invalid if completed 5M accepts below 7448.25.',
    rankScore: direction === 'LONG' ? 99 : 92,
    decisionQualityScore: direction === 'LONG' ? 99 : 98,
    modelConfidenceScore: direction === 'LONG' ? 92 : 98,
    evidence: ['Complete scanner-owned levels are present.'],
    missingEvidence: [],
    executionStatus: ExecutionStatus.Conditional,
    blockReason: null,
    requiredTrigger: direction === 'SHORT'
      ? 'Completed 5M close below 7463.00, then retest failure.'
      : 'Completed 5M close above 7456.25, then hold.',
    nextAction: direction === 'SHORT'
      ? 'Wait for completed 5M proof below 7463.00.'
      : 'Wait for completed 5M proof above 7456.25.',
    activeRuleset: {
      htfLineInSand: {
        applied: true,
        lineInSand: direction === 'SHORT' ? 7463 : 7456.25,
        requiredClose: direction === 'SHORT' ? 'Completed 5M close below 7463.00.' : 'Completed 5M close above 7456.25.',
        status: 'missing_context',
        required: 'completed_5m_or_15m_close_beyond_htf_line',
        appliesToAllModels: true,
        affectsExecution: false,
        direction,
        lineReason: direction === 'SHORT' ? '5M child FVG confirms 60M parent bearish FVG rejection.' : 'Long micro-continuation line.',
        obstacleType: 'imbalance_zone',
        obstacleSource: 'ninjatrader',
        evidence: [],
        blockers: [],
      },
    },
    reducedRiskPlan: null,
    ...overrides,
  };
}

function candleDirection(bar: TestBar): ChartCandleFact['direction'] {
  if (bar.close > bar.open) return 'bullish';
  if (bar.close < bar.open) return 'bearish';
  return 'doji';
}

function candles(bars: TestBar[]): ChartCandleFact[] {
  return bars.map((bar, index) => ({
    index,
    timestamp: bar.time,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    direction: candleDirection(bar),
    confidence: 'High',
  }));
}

function detectFvgZones(bars: TestBar[]): TestFvg[] {
  const zones: TestFvg[] = [];
  for (let index = 2; index < bars.length; index += 1) {
    const left = bars[index - 2];
    const right = bars[index];
    if (left.high < right.low) {
      zones.push({
        direction: 'LONG',
        formedAt: right.time,
        lower: left.high,
        upper: right.low,
        midpoint: (left.high + right.low) / 2,
      });
    }
    if (left.low > right.high) {
      zones.push({
        direction: 'SHORT',
        formedAt: right.time,
        lower: right.high,
        upper: left.low,
        midpoint: (right.high + left.low) / 2,
      });
    }
  }
  return zones;
}

function fvgFacts(bars: TestBar[]): FvgZoneFact[] {
  return detectFvgZones(bars).map((zone) => ({
    direction: zone.direction,
    lower: zone.lower,
    upper: zone.upper,
    midpoint: zone.midpoint,
    formedAt: zone.formedAt,
    impulseQualified: true,
    confidence: 'High',
  }));
}

function factSet(timeframe: TimeframeFactSet['timeframe'], bars: TestBar[], trend: TimeframeFactSet['trend']): TimeframeFactSet {
  const high = Math.max(...bars.map((bar) => bar.high));
  const low = Math.min(...bars.map((bar) => bar.low));
  return {
    timeframe,
    role: timeframe === '5m' ? 'execution' : timeframe === '15m' ? 'session_structure' : 'macro_context',
    barCount: bars.length,
    high,
    low,
    open: bars[0]?.open ?? null,
    close: bars[bars.length - 1]?.close ?? null,
    midpoint: (high + low) / 2,
    rangePoints: high - low,
    trend,
    candles: candles(bars),
    fvgZones: fvgFacts(bars),
    liquiditySweeps: [],
    reclaimEvents: [],
    failedBreakEvents: [],
    displacementCandles: [],
    structuralLevels: [],
    confidence: 'High',
    notes: [],
  };
}

const oneHourBars: TestBar[] = [
  { time: '2026-06-23T00:00:00.0000000', open: 7533.5, high: 7535.25, low: 7496.5, close: 7509.25 },
  { time: '2026-06-23T01:00:00.0000000', open: 7509.25, high: 7512, low: 7481.75, close: 7483.25 },
  { time: '2026-06-23T02:00:00.0000000', open: 7483.5, high: 7488.25, low: 7465.5, close: 7468.5 },
  { time: '2026-06-24T11:00:00.0000000', open: 7454.75, high: 7494.25, low: 7436.5, close: 7493.5 },
  { time: '2026-06-24T12:00:00.0000000', open: 7493.5, high: 7496.5, low: 7474.5, close: 7480.25 },
];

const fifteenMinuteBars: TestBar[] = [
  { time: '2026-06-23T01:15:00.0000000', open: 7483.5, high: 7488.25, low: 7482.75, close: 7483.25 },
  { time: '2026-06-23T01:30:00.0000000', open: 7483.25, high: 7484.5, low: 7474.25, close: 7477 },
  { time: '2026-06-23T01:45:00.0000000', open: 7477, high: 7477.5, low: 7467.25, close: 7473.25 },
  { time: '2026-06-24T12:30:00.0000000', open: 7481.5, high: 7485, low: 7476.5, close: 7477.5 },
  { time: '2026-06-24T12:45:00.0000000', open: 7477.5, high: 7477.75, low: 7455, close: 7459.75 },
];

const fiveMinuteBars: TestBar[] = [
  { time: '2026-06-24T12:30:00.0000000', open: 7483.25, high: 7483.25, low: 7476.5, close: 7477.5 },
  { time: '2026-06-24T12:35:00.0000000', open: 7477.5, high: 7477.75, low: 7471.5, close: 7473.25 },
  { time: '2026-06-24T12:40:00.0000000', open: 7473, high: 7476, low: 7461.25, close: 7461.5 },
];

const oneHour = factSet('1h', oneHourBars, 'bearish');
const fifteenMinute = factSet('15m', fifteenMinuteBars, 'bearish');
const fiveMinute = factSet('5m', fiveMinuteBars, 'bearish');
const chartContext: Partial<ChartContext> = {
  multiTimeframeContext: {
    source: 'ninjatrader_bridge',
    authority: 'ohlc_facts_only',
    fourHour: { ...oneHour, timeframe: '4h', candles: [], fvgZones: [] },
    oneHour,
    fifteenMinute,
    fiveMinute,
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
};

const selectedLong = candidate('LONG');
const completeShort = candidate('SHORT');
const window = resolveScannerWindow(new Date('2026-06-24T12:45:00-04:00'));
const alertDecision = { shouldSend: false, reason: 'Phase 3 fixture: selected long should not bury HTF-FVG-backed short.' };
const trace = buildCandidateLifecycleTrace({
  candidates: [selectedLong, completeShort],
  selectedCandidate: selectedLong,
  state: 'Conditional',
  window,
  alertDecision,
  canExecute: false,
});
const visibility = classifyScannerVisibility({
  state: 'Conditional',
  candidate: selectedLong,
  window,
  alertDecision,
  canExecute: false,
});
const deskState = buildDeskState({
  state: 'Conditional',
  candidate: selectedLong,
  visibilityMetadata: visibility,
  candidateLifecycleTrace: trace,
  chartContext,
  currentPrice: 7461.5,
  canExecute: false,
});

assert.equal(trace.selectedCandidate?.direction, 'LONG');
assert.equal(trace.highestRankedCandidate?.direction, 'LONG');
assert.equal(trace.bestShortPlan?.hasFullPlanLevels, true);
assert.equal(deskState.primaryDeskPlay.direction, 'SHORT');
assert.equal(deskState.primaryDeskPlay.htfFvgReactionRouting?.status, 'routed_active_reaction');
assert.equal(deskState.primaryDeskPlay.htfFvgReactionRouting?.direction, 'SHORT');
assert.equal(deskState.primaryDeskPlay.htfFvgReactionMemory?.activeReaction?.direction, 'SHORT');
assert.equal(deskState.primaryDeskPlay.htfFvgReactionMemory?.activeReaction?.state, 'rejected');
assert.equal(deskState.primaryDeskPlay.htfFvgReactionMemory?.childConfirmation?.state, 'child_fvg_confirmed');
assert.equal(deskState.primaryDeskPlay.shortBias.state, 'primary');
assert.equal(deskState.primaryDeskPlay.shortBelow, 7463);
assert.equal(deskState.primaryDeskPlay.shortBias.lineInSand, 7463);
assert.equal(deskState.primaryDeskPlay.shortBias.executableConsideration.canExecuteNow, false);
assert.equal(deskState.canExecute, false);
assert.equal(deskState.primaryDeskPlay.approvalBoundary.changesCanExecute, false);
assert.equal(deskState.primaryDeskPlay.htfFvgReactionRouting?.approvalBoundary.changesCanExecute, false);
assert.equal(deskState.primaryDeskPlay.htfFvgReactionRouting?.approvalBoundary.changesTradeApprovals, false);
assert.equal(deskState.primaryDeskPlay.htfFvgReactionRouting?.approvalBoundary.changesEntryStopTargets, false);
assert.equal(deskState.primaryDeskPlay.htfFvgReactionRouting?.approvalBoundary.changesRiskRules, false);
assert.equal(deskState.primaryDeskPlay.htfFvgReactionRouting?.approvalBoundary.changesRanking, false);
assert.equal(deskState.primaryDeskPlay.htfFvgReactionRouting?.approvalBoundary.createsNewModel, false);

console.log('Phase 3 HTF FVG reaction routing verified: active parent reaction + 5M child proof surfaces the complete side without execution approval changes.');
