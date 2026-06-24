import assert from 'node:assert/strict';
import { buildHtfFvgReactionMemory } from './htfFvgReactionMemory';
import type { ChartCandleFact, ChartContext, FvgZoneFact, TimeframeFactSet } from '../types';

function candle(
  timestamp: string,
  open: number,
  high: number,
  low: number,
  close: number,
  index: number,
): ChartCandleFact {
  return {
    index,
    timestamp,
    open,
    high,
    low,
    close,
    direction: close > open ? 'bullish' : close < open ? 'bearish' : 'doji',
    confidence: 'High',
  };
}

function factSet(args: {
  candles: ChartCandleFact[];
  zones: FvgZoneFact[];
  close?: number;
}): TimeframeFactSet {
  return {
    timeframe: '1h',
    role: 'session_structure',
    barCount: args.candles.length,
    high: Math.max(...args.candles.map((item) => item.high || Number.NEGATIVE_INFINITY)),
    low: Math.min(...args.candles.map((item) => item.low || Number.POSITIVE_INFINITY)),
    open: args.candles[0]?.open ?? null,
    close: args.close ?? args.candles[args.candles.length - 1]?.close ?? null,
    midpoint: null,
    rangePoints: null,
    trend: 'balanced',
    candles: args.candles.slice(-4),
    fvgZones: [],
    fullWindowCandles: args.candles,
    fullWindowFvgZones: args.zones,
    liquiditySweeps: [],
    reclaimEvents: [],
    failedBreakEvents: [],
    displacementCandles: [],
    structuralLevels: [],
    confidence: 'High',
    notes: [],
  };
}

function chartContext(oneHour: TimeframeFactSet): Partial<ChartContext> {
  const fiveMinute: TimeframeFactSet = {
    ...oneHour,
    timeframe: '5m',
    role: 'execution',
    candles: [candle('2026-06-24T10:00:00.0000000', 120, 121, 119, 120, 0)],
    fvgZones: [],
    fullWindowCandles: undefined,
    fullWindowFvgZones: undefined,
  };
  return {
    multiTimeframeContext: {
      source: 'ninjatrader_bridge',
      authority: 'ohlc_facts_only',
      fourHour: { ...oneHour, timeframe: '4h', fullWindowFvgZones: [] },
      oneHour,
      fifteenMinute: { ...oneHour, timeframe: '15m', fullWindowFvgZones: [] },
      fiveMinute,
      alignment: {
        macroBias: 'NEUTRAL',
        sessionBias: 'NEUTRAL',
        liquidityBias: 'NEUTRAL',
        executionBias: 'NEUTRAL',
        alignedDirection: 'NEUTRAL',
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

const parentZone: FvgZoneFact = {
  direction: 'LONG',
  lower: 100,
  upper: 110,
  midpoint: 105,
  formedAt: '2026-06-11T14:00:00.0000000',
  confidence: 'High',
  impulseQualified: true,
};

const partialMemory = buildHtfFvgReactionMemory({
  direction: 'LONG',
  chartContext: chartContext(factSet({
    zones: [parentZone],
    candles: [
      candle('2026-06-11T14:00:00.0000000', 111, 112, 110.5, 111.5, 0),
      candle('2026-06-12T10:00:00.0000000', 111, 112, 105, 107, 1),
    ],
  })),
});
assert.equal(partialMemory?.parentZones[0]?.lifecycle.state, 'partially_mitigated');
assert.equal(partialMemory?.parentZones[0]?.lifecycle.deepestMitigationPercent, 50);

const acceptedMemory = buildHtfFvgReactionMemory({
  direction: 'LONG',
  chartContext: chartContext(factSet({
    zones: [parentZone],
    candles: [
      candle('2026-06-11T14:00:00.0000000', 111, 112, 110.5, 111.5, 0),
      candle('2026-06-12T10:00:00.0000000', 111, 112, 99, 99, 1),
    ],
  })),
});
assert.equal(acceptedMemory?.parentZones[0]?.lifecycle.state, 'accepted_through');
assert.equal(acceptedMemory?.parentZones[0]?.lifecycle.acceptedThroughAt, '2026-06-12T10:00:00.0000000');

const invertedMemory = buildHtfFvgReactionMemory({
  direction: 'LONG',
  chartContext: chartContext(factSet({
    zones: [parentZone],
    candles: [
      candle('2026-06-11T14:00:00.0000000', 111, 112, 110.5, 111.5, 0),
      candle('2026-06-12T10:00:00.0000000', 111, 112, 99, 99, 1),
      candle('2026-06-13T10:00:00.0000000', 98, 105, 95, 96, 2),
    ],
  })),
});
assert.equal(invertedMemory?.parentZones[0]?.lifecycle.state, 'inverted');
assert.equal(invertedMemory?.parentZones[0]?.lifecycle.invertedAt, '2026-06-13T10:00:00.0000000');

const rejectedMemory = buildHtfFvgReactionMemory({
  direction: 'LONG',
  chartContext: chartContext(factSet({
    zones: [parentZone],
    candles: [
      candle('2026-06-11T14:00:00.0000000', 111, 112, 110.5, 111.5, 0),
      candle('2026-06-12T10:00:00.0000000', 111, 112, 104, 112, 1),
    ],
  })),
});
assert.equal(rejectedMemory?.parentZones[0]?.lifecycle.state, 'rejected');
assert.equal(rejectedMemory?.parentZones[0]?.lifecycle.touchCount, 1);

assert.equal(rejectedMemory?.approvalBoundary.changesCanExecute, false);
assert.equal(rejectedMemory?.approvalBoundary.changesTradeApprovals, false);
assert.equal(rejectedMemory?.approvalBoundary.changesEntryStopTargets, false);

console.log('HTF FVG lifecycle verified: partial, accepted-through, inverted, and rejected states are context-only metadata.');
