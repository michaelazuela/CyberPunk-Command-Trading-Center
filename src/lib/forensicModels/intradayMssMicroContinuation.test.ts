import assert from 'node:assert/strict';
import { scanSetupCandidates } from '../setupScanner';
import { detectIntradayMssMicroContinuation } from './intradayMssMicroContinuation';
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

const longDetected = detectIntradayMssMicroContinuation(context(longCandles));
assert.equal(longDetected.detected, true);
assert.equal(longDetected.direction, 'LONG');
assert.equal(longDetected.entry, 102.75);
assert.equal(longDetected.stop, 101);
assert.equal(longDetected.target1, 105.5);
assert.equal(longDetected.target2, 106.25);
assert.equal(longDetected.shiftTime, '2026-06-15T09:30:00-04:00');
assert.equal(longDetected.proofTime, '2026-06-15T09:35:00-04:00');
assert.equal(longDetected.shiftLevel, 101.5);
assert.equal(longDetected.microWindowMinutes, 15);
assert.equal(longDetected.htfContext, 'support');
assert.equal(longDetected.installsScannerCandidate, true);
assert.equal(longDetected.installsPromotion, true);
assert.equal(longDetected.installsDiscordPublishing, true);
assert.equal(longDetected.installsExecutionApproval, false);

const shortCandles = [
  candle(1, '2026-06-17T12:00:00-04:00', 110, 111, 109, 110),
  candle(2, '2026-06-17T12:05:00-04:00', 110, 110.5, 108.75, 109.5),
  candle(3, '2026-06-17T12:10:00-04:00', 109.5, 110, 108.5, 109),
  candle(4, '2026-06-17T12:15:00-04:00', 109, 109.25, 106.5, 107),
  candle(5, '2026-06-17T12:20:00-04:00', 107, 108.75, 106.75, 107.25),
];

const shortDetected = detectIntradayMssMicroContinuation(context(shortCandles, {
  sessionType: 'lunch',
  multiTimeframeContext: mtf(shortCandles, 'SHORT'),
}));
assert.equal(shortDetected.detected, true);
assert.equal(shortDetected.direction, 'SHORT');
assert.equal(shortDetected.entry, 107.25);
assert.equal(shortDetected.stop, 109);
assert.equal(shortDetected.target1, 104.75);
assert.equal(shortDetected.target2, 103.75);
assert.equal(shortDetected.shiftTime, '2026-06-17T12:15:00-04:00');
assert.equal(shortDetected.proofTime, '2026-06-17T12:20:00-04:00');
assert.equal(shortDetected.htfContext, 'support');

const lateProofCandles = [
  ...longCandles.slice(0, 4),
  candle(5, '2026-06-15T09:35:00-04:00', 102.5, 102.75, 102, 102.25),
  candle(6, '2026-06-15T09:40:00-04:00', 102.25, 102.75, 102, 102.25),
  candle(7, '2026-06-15T09:45:00-04:00', 102.25, 102.75, 102, 102.25),
  candle(8, '2026-06-15T09:50:00-04:00', 102.25, 103.5, 101.25, 102.75),
];
const lateProof = detectIntradayMssMicroContinuation(context(lateProofCandles));
assert.equal(lateProof.detected, false);
assert.equal(lateProof.missingEvidence.includes('Missing fast 5M micro retest/hold proof within 15 minutes after MSS.'), true);

const scannerResult = scanSetupCandidates({ sessionType: 'morning', chartContext: context(longCandles) });
assert.equal(scannerResult.bestConditionalCandidate?.setupType, 'IntradayMssMicroContinuation');
assert.equal(scannerResult.bestConditionalCandidate?.scenarioLabel, 'Intraday MSS Micro Continuation');
assert.equal(scannerResult.bestConditionalCandidate?.humanReview?.canExecute, false);

console.log('intraday MSS micro continuation detector contract verified');
