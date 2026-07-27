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
assert.equal(longDetected.installsScannerCandidate, true);
assert.equal(longDetected.installsPromotion, true);
assert.equal(longDetected.installsDiscordPublishing, true);
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

const scannerResult = scanSetupCandidates({ sessionType: 'morning', chartContext: context({
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
}) });
assert.equal(scannerResult.bestConditionalCandidate?.setupType, 'RaidFailureDisplacementReversal');

function mtfWithFifteenMinute(
  fiveMinuteCandles: ChartCandleFact[],
  fifteenMinuteCandles: ChartCandleFact[],
  alignedDirection: 'LONG' | 'SHORT' | 'NEUTRAL' | 'CONFLICTED' | 'UNKNOWN',
): MultiTimeframeContext {
  const fiveMinute = factSet(fiveMinuteCandles);
  const fifteenMinute = { ...factSet(fifteenMinuteCandles), timeframe: '15m' as const, role: 'liquidity_map' as const };
  return {
    source: 'ninjatrader_bridge',
    authority: 'ohlc_facts_only',
    fourHour: { ...fifteenMinute, timeframe: '4h', role: 'macro_context' },
    twoHour: { ...fifteenMinute, timeframe: '2h', role: 'session_structure' },
    oneHour: { ...fifteenMinute, timeframe: '1h', role: 'session_structure' },
    fifteenMinute,
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
    targetMap: { levelsToWatch: [] },
    rules: {
      higherTimeframesApproveTrades: false,
      fiveMinuteExecutionRequired: true,
      aiMayOverwriteOhlcFacts: false,
    },
    notes: [],
  };
}

const fridayFiveMinute = [
  candle(1, '2026-06-26T09:35:00', 7381, 7388.25, 7360, 7370.25),
  candle(2, '2026-06-26T09:40:00', 7370.25, 7383.25, 7367.25, 7372.75),
  candle(3, '2026-06-26T09:45:00', 7373, 7386.5, 7368.75, 7384.25),
  candle(4, '2026-06-26T09:50:00', 7384.25, 7390.25, 7371.25, 7379),
  candle(5, '2026-06-26T09:55:00', 7378.75, 7389, 7377, 7385.75),
  candle(6, '2026-06-26T10:00:00', 7386, 7405.5, 7384, 7403.5),
];
const fridayFifteenMinute = [
  candle(1, '2026-06-26T08:45:00', 7394.5, 7397, 7383.5, 7384),
  candle(2, '2026-06-26T09:00:00', 7383.75, 7386.75, 7380, 7383.75),
  candle(3, '2026-06-26T09:15:00', 7384.25, 7385, 7373.25, 7376.75),
  candle(4, '2026-06-26T09:30:00', 7376.75, 7382.75, 7364.5, 7380.75),
  candle(5, '2026-06-26T09:45:00', 7381, 7388.25, 7360, 7384.25),
  candle(6, '2026-06-26T10:00:00', 7384.25, 7405.5, 7371.25, 7403.5),
];

const protectedShelfFallback = detectRaidFailureDisplacementReversal(context({
  tradeDate: '2026-06-26',
  chartTimestamp: '2026-06-26T10:00:00',
  candles: fridayFiveMinute,
  keyLevels: {
    currentPrice: 7403.5,
    activeSwingLow: 7360,
    activeSwingHigh: 7405.5,
  },
  multiTimeframeContext: mtfWithFifteenMinute(fridayFiveMinute, fridayFifteenMinute, 'LONG'),
}));
assert.equal(protectedShelfFallback.detected, true);
assert.equal(protectedShelfFallback.direction, 'LONG');
assert.equal(protectedShelfFallback.entry, 7383);
assert.equal(protectedShelfFallback.stop, 7368.5);
assert.equal(protectedShelfFallback.target1, 7404.75);
assert.equal(protectedShelfFallback.target2, 7412);
assert.equal(protectedShelfFallback.proofTime, '2026-06-26T09:45:00');
assert.equal(protectedShelfFallback.protectedShelfState, 'proof_completed');
assert.ok(protectedShelfFallback.evidence.some((line) => /protected shelf state: proof_completed/i.test(line)));

console.log('raid failure displacement reversal detector contract verified');
