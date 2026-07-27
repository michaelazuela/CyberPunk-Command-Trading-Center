import assert from 'node:assert/strict';
import { scanSetupCandidates } from '../setupScanner';
import { detectStructureShiftContinuation } from './structureShiftContinuation';
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

function context(candles: ChartCandleFact[], overrides: Partial<ChartContext> = {}): ChartContext {
  return {
    sessionType: 'morning',
    instrument: 'MES',
    tradeDate: '2026-06-15',
    timeframe: '5m',
    chartTimestamp: candles.at(-1)?.timestamp || '2026-06-15T10:00:00-04:00',
    screenshotUsability: 'usable',
    keyLevels: {
      currentPrice: candles.at(-1)?.close ?? 0,
      activeSwingLow: Math.min(...candles.map((item) => item.low || Number.POSITIVE_INFINITY)),
      activeSwingHigh: Math.max(...candles.map((item) => item.high || 0)),
    },
    candles,
    liquiditySweeps: [],
    reclaimEvents: [],
    failedBreakEvents: [],
    displacementCandles: [],
    multiTimeframeContext: mtf(candles, overrides.multiTimeframeContext?.alignment?.alignedDirection || 'LONG'),
    marketContext: 'Synthetic detector-only test context.',
    ...overrides,
  };
}

const longCandles = [
  candle(1, '2026-06-15T09:15:00-04:00', 100, 101, 99, 100),
  candle(2, '2026-06-15T09:20:00-04:00', 100, 101.5, 99.5, 100.5),
  candle(3, '2026-06-15T09:25:00-04:00', 100.5, 101.25, 100, 100.75),
  candle(4, '2026-06-15T09:30:00-04:00', 100.75, 103, 100.5, 102.5),
  candle(5, '2026-06-15T09:35:00-04:00', 102.5, 103.25, 101.25, 102.75),
];

const longDetected = detectStructureShiftContinuation(context(longCandles));
assert.equal(longDetected.detected, true);
assert.equal(longDetected.direction, 'LONG');
assert.equal(longDetected.entry, 102.75);
assert.equal(longDetected.stop, 98.75);
assert.equal(longDetected.target1, 108.75);
assert.equal(longDetected.target2, 110.75);
assert.equal(longDetected.shiftTime, '2026-06-15T09:30:00-04:00');
assert.equal(longDetected.proofTime, '2026-06-15T09:35:00-04:00');
assert.equal(longDetected.htfContext, 'support');
assert.equal(longDetected.installsScannerCandidate, true);
assert.equal(longDetected.installsPromotion, true);
assert.equal(longDetected.installsDiscordPublishing, false);
assert.equal(longDetected.installsExecutionApproval, false);

const shortCandles = [
  candle(1, '2026-06-17T12:00:00-04:00', 110, 111, 109, 110),
  candle(2, '2026-06-17T12:05:00-04:00', 110, 110.5, 108.75, 109.5),
  candle(3, '2026-06-17T12:10:00-04:00', 109.5, 110, 108.5, 109),
  candle(4, '2026-06-17T12:15:00-04:00', 109, 109.25, 106.5, 107),
  candle(5, '2026-06-17T12:20:00-04:00', 107, 108.75, 106.75, 107.25),
  candle(6, '2026-06-17T12:25:00-04:00', 107.25, 107.5, 105.75, 106),
];

const shortDetected = detectStructureShiftContinuation(context(shortCandles, {
  sessionType: 'lunch',
  multiTimeframeContext: mtf(shortCandles, 'SHORT'),
}));
assert.equal(shortDetected.detected, true);
assert.equal(shortDetected.direction, 'SHORT');
assert.equal(shortDetected.entry, 107.25);
assert.equal(shortDetected.stop, 111.25);
assert.equal(shortDetected.target1, 101.25);
assert.equal(shortDetected.target2, 99.25);
assert.equal(shortDetected.shiftTime, '2026-06-17T12:15:00-04:00');
assert.equal(shortDetected.proofTime, '2026-06-17T12:20:00-04:00');
assert.equal(shortDetected.htfContext, 'support');

const missing = detectStructureShiftContinuation(context(longCandles.slice(0, 4)));
assert.equal(missing.detected, false);
assert.equal(missing.missingEvidence.includes('Missing post-shift 5M continuation proof.'), true);

const scannerResult = scanSetupCandidates({ sessionType: 'morning', chartContext: context(longCandles) });
assert.equal(scannerResult.candidates.length, 1);
assert.equal(scannerResult.bestConditionalCandidate?.setupType, 'StructureShiftContinuation');

console.log('structure shift continuation detector contract verified');
