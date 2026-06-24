import assert from 'node:assert/strict';
import { buildHtfFvgReactionMemory } from './htfFvgReactionMemory';
import type { ChartCandleFact, ChartContext, FvgZoneFact, TimeframeFactSet } from '../types';

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

const bars60m: TestBar[] = [
  { time: '2026-06-23T00:00:00.0000000', open: 7533.5, high: 7535.25, low: 7496.5, close: 7509.25 },
  { time: '2026-06-23T01:00:00.0000000', open: 7509.25, high: 7512, low: 7481.75, close: 7483.25 },
  { time: '2026-06-23T02:00:00.0000000', open: 7483.5, high: 7488.25, low: 7465.5, close: 7468.5 },
  { time: '2026-06-23T03:00:00.0000000', open: 7468.75, high: 7472.25, low: 7444.5, close: 7447 },
  { time: '2026-06-23T04:00:00.0000000', open: 7447, high: 7455.5, low: 7428.5, close: 7434 },
  { time: '2026-06-24T11:00:00.0000000', open: 7454.75, high: 7494.25, low: 7436.5, close: 7493.5 },
  { time: '2026-06-24T12:00:00.0000000', open: 7493.5, high: 7496.5, low: 7474.5, close: 7480.25 },
  { time: '2026-06-24T13:00:00.0000000', open: 7480.25, high: 7485.5, low: 7450.5, close: 7452.75 },
  { time: '2026-06-24T14:00:00.0000000', open: 7453.25, high: 7461, low: 7407.75, close: 7418.25 },
];

const bars15m: TestBar[] = [
  { time: '2026-06-23T01:15:00.0000000', open: 7483.5, high: 7488.25, low: 7482.75, close: 7483.25 },
  { time: '2026-06-23T01:30:00.0000000', open: 7483.25, high: 7484.5, low: 7474.25, close: 7477 },
  { time: '2026-06-23T01:45:00.0000000', open: 7477, high: 7477.5, low: 7467.25, close: 7473.25 },
  { time: '2026-06-24T12:00:00.0000000', open: 7481.5, high: 7489.75, low: 7474.5, close: 7480.25 },
  { time: '2026-06-24T12:15:00.0000000', open: 7480.25, high: 7485.5, low: 7474.5, close: 7481.25 },
  { time: '2026-06-24T12:30:00.0000000', open: 7481.5, high: 7485, low: 7476.5, close: 7477.5 },
  { time: '2026-06-24T12:45:00.0000000', open: 7477.5, high: 7477.75, low: 7455, close: 7459.75 },
  { time: '2026-06-24T13:00:00.0000000', open: 7459.5, high: 7464.5, low: 7450.5, close: 7452.75 },
  { time: '2026-06-24T13:15:00.0000000', open: 7453.25, high: 7461, low: 7442, close: 7444 },
  { time: '2026-06-24T13:30:00.0000000', open: 7444, high: 7447.75, low: 7415.75, close: 7416.75 },
];

const bars5m: TestBar[] = [
  { time: '2026-06-24T12:30:00.0000000', open: 7483.25, high: 7483.25, low: 7476.5, close: 7477.5 },
  { time: '2026-06-24T12:35:00.0000000', open: 7477.5, high: 7477.75, low: 7471.5, close: 7473.25 },
  { time: '2026-06-24T12:40:00.0000000', open: 7473, high: 7476, low: 7461.25, close: 7461.5 },
  { time: '2026-06-24T12:45:00.0000000', open: 7461.5, high: 7462.25, low: 7455, close: 7459.75 },
  { time: '2026-06-24T12:50:00.0000000', open: 7459.5, high: 7461.75, low: 7455.5, close: 7459.25 },
  { time: '2026-06-24T12:55:00.0000000', open: 7459.5, high: 7464.5, low: 7454, close: 7454 },
  { time: '2026-06-24T13:00:00.0000000', open: 7454.25, high: 7456.25, low: 7450.5, close: 7452.75 },
  { time: '2026-06-24T13:05:00.0000000', open: 7453.25, high: 7461, low: 7451, close: 7460.25 },
  { time: '2026-06-24T13:10:00.0000000', open: 7460.25, high: 7460.75, low: 7442.5, close: 7445.75 },
  { time: '2026-06-24T13:15:00.0000000', open: 7445.75, high: 7450, low: 7442, close: 7444 },
  { time: '2026-06-24T13:20:00.0000000', open: 7444, high: 7447.75, low: 7431, close: 7433.75 },
  { time: '2026-06-24T13:25:00.0000000', open: 7433.75, high: 7434, low: 7425.75, close: 7426.75 },
  { time: '2026-06-24T13:30:00.0000000', open: 7426.75, high: 7428, low: 7420.5, close: 7420.75 },
];

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

function factSet(timeframe: TimeframeFactSet['timeframe'], bars: TestBar[]): TimeframeFactSet {
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
    trend: 'bearish',
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

const oneHour = factSet('1h', bars60m);
const fifteenMinute = factSet('15m', bars15m);
const fiveMinute = factSet('5m', bars5m);

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

const memory = buildHtfFvgReactionMemory({ chartContext, direction: 'SHORT' });
assert.ok(memory, 'expected HTF FVG reaction memory');
assert.equal(memory.sourceOfTruth, 'scanner_htf_parent_fvg_reaction_memory');
assert.equal(memory.direction, 'SHORT');
assert.equal(memory.approvalBoundary.changesTradeApprovals, false);
assert.equal(memory.approvalBoundary.changesCanExecute, false);
assert.equal(memory.approvalBoundary.changesEntryStopTargets, false);
assert.equal(memory.approvalBoundary.changesRiskRules, false);
assert.equal(memory.approvalBoundary.createsNewModel, false);

const parent60Upper = memory.parentZones.find((zone) =>
  zone.timeframe === '60M' &&
  zone.lower === 7488.25 &&
  zone.upper === 7496.5
);
assert.ok(parent60Upper, 'expected 60M upper parent FVG');
assert.equal(parent60Upper.state, 'rejected');
assert.equal(parent60Upper.latestReaction?.timestamp, '2026-06-24T12:00:00.0000000');
assert.equal(parent60Upper.latestReaction?.close, 7480.25);

const parent60Mid = memory.parentZones.find((zone) =>
  zone.timeframe === '60M' &&
  zone.lower === 7472.25 &&
  zone.upper === 7481.75
);
assert.ok(parent60Mid, 'expected 60M mid parent FVG');
assert.equal(parent60Mid.state, 'rejected');
assert.equal(parent60Mid.lifecycle.state, 'accepted_through');
assert.equal(parent60Mid.lifecycle.acceptedThroughAt, '2026-06-24T11:00:00.0000000');
assert.equal(parent60Mid.latestReaction?.timestamp, '2026-06-24T13:00:00.0000000');
assert.equal(parent60Mid.latestReaction?.close, 7452.75);

const fifteenMinuteShelf = memory.parentZones.find((zone) =>
  zone.timeframe === '15M' &&
  zone.lower === 7477.5 &&
  zone.upper === 7482.75
);
assert.ok(fifteenMinuteShelf, 'expected 15M bearish reaction shelf');
assert.equal(fifteenMinuteShelf.state, 'rejected');
assert.equal(fifteenMinuteShelf.latestReaction?.timestamp, '2026-06-24T12:45:00.0000000');

assert.equal(memory.activeReaction?.timeframe, '15M');
assert.equal(memory.activeReaction?.state, 'rejected');
assert.notEqual(memory.activeReaction?.lifecycle.state, 'accepted_through');
assert.notEqual(memory.activeReaction?.lifecycle.state, 'inverted');
assert.equal(memory.childConfirmation?.state, 'child_fvg_confirmed');
assert.equal(memory.childConfirmation?.lower, 7476);
assert.equal(memory.childConfirmation?.upper, 7476.5);
assert.equal(memory.childConfirmation?.midpoint, 7476.25);
assert.match(memory.summary, /Nearest active rejection zone: 15M SHORT parent FVG/);
assert.match(memory.summary, /child_fvg_confirmed/);
assert.match(memory.parentStackSummary, /Parent stack:/);
assert.match(memory.parentStackSummary, /60M 7488\.25-7496\.50 rejected/);
assert.match(memory.parentStackSummary, /15M 7477\.50-7482\.75 rejected/);

const longMemory = buildHtfFvgReactionMemory({ chartContext, direction: 'LONG' });
assert.ok(longMemory, 'expected stale opposite-side memory to remain visible');
assert.equal(longMemory.activeReaction, null, 'accepted-through opposite memory must not become active reaction context');
assert.equal(longMemory.parentZones[0]?.state, 'accepted_through');

console.log('HTF FVG reaction memory verified: parent-zone retest/rejection and 5M child confirmation are stored as non-execution metadata.');
