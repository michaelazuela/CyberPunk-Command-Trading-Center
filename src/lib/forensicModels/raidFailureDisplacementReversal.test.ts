import assert from 'node:assert/strict';
import { scanSetupCandidates } from '../setupScanner';
import { detectRaidFailureDisplacementReversal } from './raidFailureDisplacementReversal';
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
    candle(1, '2026-06-10T10:05:00-04:00', 7488, 7490, 7480, 7482),
    candle(2, '2026-06-10T10:10:00-04:00', 7482, 7496, 7481, 7495),
  ];
  return {
    sessionType: 'morning',
    instrument: 'MES',
    tradeDate: '2026-06-10',
    timeframe: '5m',
    chartTimestamp: '2026-06-10T10:10:00-04:00',
    screenshotUsability: 'usable',
    keyLevels: {
      currentPrice: 7495,
      activeSwingLow: 7480,
      activeSwingHigh: 7498,
    },
    candles,
    liquiditySweeps: [],
    reclaimEvents: [],
    failedBreakEvents: [],
    displacementCandles: [],
    multiTimeframeContext: mtf(candles, 'LONG'),
    marketContext: 'Synthetic detector-only test context.',
    ...overrides,
  };
}

const longDetected = detectRaidFailureDisplacementReversal(context({
  liquiditySweeps: [{
    type: 'sweep',
    direction: 'LONG',
    level: 7482,
    sweptLevelLabel: 'overnight low',
    reclaimed: true,
    timestamp: '2026-06-10T10:05:00-04:00',
    confidence: 'High',
  }],
  reclaimEvents: [{
    direction: 'LONG',
    reclaimedLevel: 7482,
    levelLabel: 'overnight low',
    timestamp: '2026-06-10T10:05:00-04:00',
    confidence: 'High',
  }],
  failedBreakEvents: [{
    direction: 'LONG',
    failedLevel: 7482,
    levelLabel: 'overnight low',
    sweptExtreme: 7480,
    timestamp: '2026-06-10T10:05:00-04:00',
    confidence: 'High',
  }],
  displacementCandles: [{
    direction: 'LONG',
    candleIndex: 2,
    timestamp: '2026-06-10T10:10:00-04:00',
    open: 7482,
    high: 7496,
    low: 7481,
    close: 7495,
    bodyPoints: 13,
    rangePoints: 15,
    bodyToRange: 0.87,
    closeLocation: 'top_quarter',
    displacementScore: 92,
    quality: 'high_quality',
    leavesImbalance: true,
    breaksStructure: true,
    confidence: 'High',
  }],
}));

assert.equal(longDetected.detected, true);
assert.equal(longDetected.direction, 'LONG');
assert.equal(longDetected.entry, 7495);
assert.equal(longDetected.stop, 7479.75);
assert.equal(longDetected.target1, 7518);
assert.equal(longDetected.target2, 7525.5);
assert.equal(longDetected.htfContext, 'support');
assert.equal(longDetected.displacementQuality, 'high_quality');
assert.equal(longDetected.installsScannerCandidate, false);
assert.equal(longDetected.installsPromotion, false);
assert.equal(longDetected.installsDiscordPublishing, false);
assert.equal(longDetected.installsExecutionApproval, false);

const shortDetected = detectRaidFailureDisplacementReversal(context({
  multiTimeframeContext: mtf([candle(1, '2026-06-11T12:10:00-04:00', 7550, 7558, 7538, 7540)], 'SHORT'),
  liquiditySweeps: [{
    type: 'sweep',
    direction: 'SHORT',
    level: 7554,
    sweptLevelLabel: 'morning high',
    reclaimed: true,
    timestamp: '2026-06-11T12:05:00-04:00',
    confidence: 'High',
  }],
  failedBreakEvents: [{
    direction: 'SHORT',
    failedLevel: 7554,
    levelLabel: 'morning high',
    sweptExtreme: 7558,
    timestamp: '2026-06-11T12:05:00-04:00',
    confidence: 'High',
  }],
  displacementCandles: [{
    direction: 'SHORT',
    candleIndex: 2,
    timestamp: '2026-06-11T12:10:00-04:00',
    open: 7550,
    high: 7552,
    low: 7538,
    close: 7540,
    bodyPoints: 10,
    rangePoints: 14,
    bodyToRange: 0.71,
    closeLocation: 'bottom_quarter',
    displacementScore: 84,
    quality: 'confirmed',
    leavesImbalance: false,
    breaksStructure: true,
    confidence: 'High',
  }],
}));

assert.equal(shortDetected.detected, true);
assert.equal(shortDetected.direction, 'SHORT');
assert.equal(shortDetected.entry, 7540);
assert.equal(shortDetected.stop, 7558.25);
assert.equal(shortDetected.target1, 7512.75);
assert.equal(shortDetected.target2, 7503.5);
assert.equal(shortDetected.htfContext, 'support');

const missingDisplacement = detectRaidFailureDisplacementReversal(context({
  liquiditySweeps: [{
    type: 'sweep',
    direction: 'LONG',
    level: 7482,
    sweptLevelLabel: 'overnight low',
    reclaimed: true,
    timestamp: '2026-06-10T10:05:00-04:00',
    confidence: 'High',
  }],
  failedBreakEvents: [{
    direction: 'LONG',
    failedLevel: 7482,
    levelLabel: 'overnight low',
    sweptExtreme: 7480,
    timestamp: '2026-06-10T10:05:00-04:00',
    confidence: 'High',
  }],
}));

assert.equal(missingDisplacement.detected, false);
assert.ok(missingDisplacement.missingEvidence.includes('Missing confirmed directional displacement after failure.'));

const scannerResult = scanSetupCandidates({ sessionType: 'morning', chartContext: context({}) });
assert.deepEqual(scannerResult.candidates, [], 'isolated detector phase must not wire scanner candidates');

console.log('raid failure displacement reversal detector contract verified');
