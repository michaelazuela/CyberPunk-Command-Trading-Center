import assert from 'node:assert/strict';
import { scanSetupCandidates } from '../setupScanner';
import { detectFailedBreakoutReversal } from './failedBreakoutReversal';
import type { ChartCandleFact, ChartContext, MultiTimeframeContext, TimeframeFactSet } from '../../types';

function candle(index: number, timestamp: string, open: number, high: number, low: number, close: number): ChartCandleFact {
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

function factSet(candles: ChartCandleFact[]): TimeframeFactSet {
  return {
    timeframe: '5m',
    role: 'execution',
    barCount: candles.length,
    high: Math.max(...candles.map((item) => item.high || 0)),
    low: Math.min(...candles.map((item) => item.low || Number.POSITIVE_INFINITY)),
    open: candles[0]?.open ?? null,
    close: candles.at(-1)?.close ?? null,
    midpoint: null,
    rangePoints: null,
    trend: 'balanced',
    candles,
    fvgZones: [],
    liquiditySweeps: [],
    reclaimEvents: [],
    failedBreakEvents: [],
    displacementCandles: [],
    structuralLevels: [],
    confidence: 'High',
    notes: [],
  };
}

function mtf(candles: ChartCandleFact[], alignedDirection: 'LONG' | 'SHORT' | 'NEUTRAL' | 'CONFLICTED' | 'UNKNOWN'): MultiTimeframeContext {
  const fiveMinute = factSet(candles);
  return {
    source: 'ninjatrader_bridge',
    authority: 'ohlc_facts_only',
    fourHour: { ...fiveMinute, timeframe: '4h', role: 'macro_context' },
    twoHour: { ...fiveMinute, timeframe: '2h', role: 'session_structure' },
    oneHour: { ...fiveMinute, timeframe: '1h', role: 'session_structure' },
    fifteenMinute: { ...fiveMinute, timeframe: '15m', role: 'liquidity_map' },
    fiveMinute,
    alignment: {
      macroBias: 'NEUTRAL',
      sessionBias: 'NEUTRAL',
      liquidityBias: 'NEUTRAL',
      executionBias: 'NEUTRAL',
      alignedDirection,
      conflicts: [],
      notes: [],
    },
    targetMap: {
      levelsToWatch: [],
    },
    rules: {
      higherTimeframesApproveTrades: false,
      fiveMinuteExecutionRequired: true,
      aiMayOverwriteOhlcFacts: false,
    },
    notes: [],
  };
}

function context(overrides: Partial<ChartContext>): ChartContext {
  const candles = [
    candle(1, '2026-06-08T10:10:00-04:00', 7442, 7445, 7438, 7444),
    candle(2, '2026-06-08T10:15:00-04:00', 7444, 7448, 7440, 7447),
  ];
  return {
    sessionType: 'morning',
    instrument: 'MES',
    tradeDate: '2026-06-08',
    timeframe: '5m',
    chartTimestamp: '2026-06-08T10:15:00-04:00',
    screenshotUsability: 'usable',
    keyLevels: {
      currentPrice: 7447,
      activeSwingLow: 7438,
      activeSwingHigh: 7450,
    },
    candles,
    liquiditySweeps: [],
    reclaimEvents: [],
    failedBreakEvents: [],
    multiTimeframeContext: mtf(candles, 'LONG'),
    marketContext: 'Synthetic detector-only test context.',
    ...overrides,
  };
}

const longDetected = detectFailedBreakoutReversal(context({
  reclaimEvents: [{
    direction: 'LONG',
    reclaimedLevel: 7440,
    levelLabel: 'range low',
    timestamp: '2026-06-08T10:10:00-04:00',
    confidence: 'High',
  }],
  failedBreakEvents: [{
    direction: 'LONG',
    failedLevel: 7440,
    levelLabel: 'range low',
    sweptExtreme: 7438,
    timestamp: '2026-06-08T10:10:00-04:00',
    candleIndex: 1,
    confidence: 'High',
  }],
}));

assert.equal(longDetected.detected, true);
assert.equal(longDetected.direction, 'LONG');
assert.equal(longDetected.entry, 7440);
assert.equal(longDetected.stop, 7437.75);
assert.equal(longDetected.target1, 7443.5);
assert.equal(longDetected.target2, 7444.5);
assert.equal(longDetected.failedLevelLabel, 'range low');
assert.equal(longDetected.htfContext, 'support');
assert.equal(longDetected.installsScannerCandidate, true);
assert.equal(longDetected.installsPromotion, true);
assert.equal(longDetected.installsDiscordPublishing, false);
assert.equal(longDetected.installsExecutionApproval, false);

const shortDetected = detectFailedBreakoutReversal(context({
  multiTimeframeContext: mtf([candle(1, '2026-06-09T10:10:00-04:00', 7520, 7528, 7518, 7522)], 'SHORT'),
  reclaimEvents: [{
    direction: 'SHORT',
    reclaimedLevel: 7525,
    levelLabel: 'range high',
    timestamp: '2026-06-09T10:10:00-04:00',
    confidence: 'High',
  }],
  failedBreakEvents: [{
    direction: 'SHORT',
    failedLevel: 7525,
    levelLabel: 'range high',
    sweptExtreme: 7528,
    timestamp: '2026-06-09T10:10:00-04:00',
    candleIndex: 1,
    confidence: 'High',
  }],
}));

assert.equal(shortDetected.detected, true);
assert.equal(shortDetected.direction, 'SHORT');
assert.equal(shortDetected.entry, 7525);
assert.equal(shortDetected.stop, 7528.25);
assert.equal(shortDetected.target1, 7520.25);
assert.equal(shortDetected.target2, 7518.5);
assert.equal(shortDetected.failedLevelLabel, 'range high');
assert.equal(shortDetected.htfContext, 'support');

const missing = detectFailedBreakoutReversal(context({}));
assert.equal(missing.detected, false);
assert.equal(missing.missingEvidence.includes('Missing named failed-breakout level.'), true);

const scannerResult = scanSetupCandidates({ sessionType: 'morning', chartContext: context({}) });
assert.deepEqual(scannerResult.candidates, [], 'isolated detector phase must not wire scanner candidates');

console.log('failed breakout reversal detector contract verified');
