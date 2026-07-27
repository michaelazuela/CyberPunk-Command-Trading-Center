import assert from 'node:assert/strict';
import { scanSetupCandidates } from '../setupScanner';
import { detectDrivePullbackContinuation } from './drivePullbackContinuation';
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
    candle(1, '2026-06-18T10:00:00-04:00', 100, 108, 99, 107),
    candle(2, '2026-06-18T10:05:00-04:00', 107, 108, 103, 104),
    candle(3, '2026-06-18T10:10:00-04:00', 104, 109, 102.5, 108.5),
  ];
  return {
    sessionType: 'morning',
    instrument: 'MES',
    tradeDate: '2026-06-18',
    timeframe: '5m',
    chartTimestamp: '2026-06-18T10:10:00-04:00',
    screenshotUsability: 'usable',
    keyLevels: {
      currentPrice: 108.5,
      activeSwingLow: 102.5,
      activeSwingHigh: 109,
    },
    candles,
    fvgZones: [],
    displacementCandles: [],
    setupReadyFacts: {},
    multiTimeframeContext: mtf(candles, 'LONG'),
    marketContext: 'Synthetic detector-only test context.',
    ...overrides,
  };
}

const longDetected = detectDrivePullbackContinuation(context({
  fvgZones: [{
    direction: 'LONG',
    lower: 103,
    upper: 105,
    midpoint: 104,
    formedAt: '2026-06-18T10:00:00-04:00',
    impulseQualified: true,
    confidence: 'High',
  }],
  displacementCandles: [{
    direction: 'LONG',
    candleIndex: 1,
    timestamp: '2026-06-18T10:00:00-04:00',
    open: 100,
    high: 108,
    low: 99,
    close: 107,
    bodyPoints: 7,
    rangePoints: 9,
    bodyToRange: 0.78,
    closeLocation: 'top_quarter',
    displacementScore: 90,
    quality: 'high_quality',
    leavesImbalance: true,
    breaksStructure: true,
    confidence: 'High',
  }],
  setupReadyFacts: {
    pullbackIntoFvg: true,
    fvgReclaimed: true,
    breakOfStructure: true,
  },
}));

assert.equal(longDetected.detected, true);
assert.equal(longDetected.direction, 'LONG');
assert.equal(longDetected.entry, 108.5);
assert.equal(longDetected.stop, 102.25);
assert.equal(longDetected.target1, 118);
assert.equal(longDetected.target2, 121);
assert.equal(longDetected.htfContext, 'support');
assert.equal(longDetected.installsScannerCandidate, true);
assert.equal(longDetected.installsPromotion, true);
assert.equal(longDetected.installsDiscordPublishing, false);
assert.equal(longDetected.installsExecutionApproval, false);

const shortCandles = [
  candle(1, '2026-06-19T13:00:00-04:00', 200, 201, 191, 192),
  candle(2, '2026-06-19T13:05:00-04:00', 192, 196, 191, 195),
  candle(3, '2026-06-19T13:10:00-04:00', 195, 196, 189, 190),
];
const shortDetected = detectDrivePullbackContinuation(context({
  sessionType: 'lunch',
  tradeDate: '2026-06-19',
  candles: shortCandles,
  keyLevels: {
    currentPrice: 190,
    activeSwingLow: 189,
    activeSwingHigh: 196,
  },
  multiTimeframeContext: mtf(shortCandles, 'SHORT'),
  fvgZones: [{
    direction: 'SHORT',
    lower: 193,
    upper: 196,
    midpoint: 194.5,
    formedAt: '2026-06-19T13:00:00-04:00',
    impulseQualified: true,
    confidence: 'High',
  }],
  displacementCandles: [{
    direction: 'SHORT',
    candleIndex: 1,
    timestamp: '2026-06-19T13:00:00-04:00',
    open: 200,
    high: 201,
    low: 191,
    close: 192,
    bodyPoints: 8,
    rangePoints: 10,
    bodyToRange: 0.8,
    closeLocation: 'bottom_quarter',
    displacementScore: 88,
    quality: 'confirmed',
    leavesImbalance: true,
    breaksStructure: true,
    confidence: 'High',
  }],
  setupReadyFacts: {
    pullbackIntoFvg: true,
    fvgReclaimed: true,
  },
}));

assert.equal(shortDetected.detected, true);
assert.equal(shortDetected.direction, 'SHORT');
assert.equal(shortDetected.entry, 190);
assert.equal(shortDetected.stop, 196.25);
assert.equal(shortDetected.target1, 180.75);
assert.equal(shortDetected.target2, 177.5);
assert.equal(shortDetected.htfContext, 'support');

const missing = detectDrivePullbackContinuation(context({}));
assert.equal(missing.detected, false);
assert.ok(missing.missingEvidence.includes('Missing directional drive displacement.'));

const scannerResult = scanSetupCandidates({ sessionType: 'morning', chartContext: context({}) });
assert.deepEqual(scannerResult.candidates, [], 'isolated detector phase must not wire scanner candidates');

console.log('drive pullback continuation detector contract verified');
