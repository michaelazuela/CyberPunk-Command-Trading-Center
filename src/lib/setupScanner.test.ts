import assert from 'node:assert/strict';
import { ExecutionStatus, NoTradeReason, SetupCandidateStatus, SetupType, type ChartCandleFact, type ChartContext, type MultiTimeframeContext, type TimeframeFactSet } from '../types';
import {
  buildCompletedFiveMinuteProofSelectionSignals,
  computeZoneOverlap,
  getScannedSetupTypes,
  scanSetupCandidates,
} from './setupScanner';

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

function mtf(candles: ChartCandleFact[]): MultiTimeframeContext {
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
      alignedDirection: 'LONG',
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

function mtfWithFifteenMinute(fiveMinuteCandles: ChartCandleFact[], fifteenMinuteCandles: ChartCandleFact[]): MultiTimeframeContext {
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
  };
}

function context(sessionType: ChartContext['sessionType']): ChartContext {
  const candles = [
    candle(1, '2026-07-27T09:25:00-04:00', 7488, 7490, 7480, 7482),
    candle(2, '2026-07-27T09:30:00-04:00', 7493, 7496, 7493, 7495),
  ];
  return {
    sessionType,
    instrument: 'MES',
    tradeDate: '2026-07-27',
    timeframe: '5m',
    chartTimestamp: '2026-07-27T09:30:00-04:00',
    screenshotUsability: 'usable',
    keyLevels: {
      currentPrice: 7495,
      activeSwingLow: 7480,
      activeSwingHigh: 7498,
    },
    candles,
    liquiditySweeps: [{
      type: 'sweep',
      direction: 'LONG',
      level: 7482,
      sweptLevelLabel: 'overnight low',
      reclaimed: true,
      timestamp: '2026-07-27T09:25:00-04:00',
      confidence: 'High',
    }],
    reclaimEvents: [{
      direction: 'LONG',
      reclaimedLevel: 7482,
      levelLabel: 'overnight low',
      timestamp: '2026-07-27T09:25:00-04:00',
      confidence: 'High',
    }],
    failedBreakEvents: [{
      direction: 'LONG',
      failedLevel: 7482,
      levelLabel: 'overnight low',
      sweptExtreme: 7491,
      timestamp: '2026-07-27T09:25:00-04:00',
      confidence: 'High',
    }],
    displacementCandles: [{
      direction: 'LONG',
      candleIndex: 2,
      timestamp: '2026-07-27T09:30:00-04:00',
      open: 7493,
      high: 7496,
      low: 7493,
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
    multiTimeframeContext: mtf(candles),
    marketContext: 'Synthetic five-model scanner test context.',
  };
}

assert.deepEqual(computeZoneOverlap(10, 20, 15, 25), {
  valid: true,
  low: 15,
  high: 20,
});

assert.deepEqual(computeZoneOverlap(10, 12, 15, 25), {
  valid: false,
  low: null,
  high: null,
});

for (const sessionType of ['morning', 'lunch', 'evening'] as const) {
  const scan = scanSetupCandidates({
    sessionType,
    contextText: 'Narrative text alone must not create a model.',
    chartContext: context(sessionType),
  });
  const candidate = scan.candidates.find((item) => item.setupType === SetupType.RaidFailureDisplacementReversal);
  assert.ok(candidate, `${sessionType} must detect Raid Failure Displacement Reversal from completed 5M proof`);
  assert.equal(candidate.direction, 'LONG');
  assert.equal(candidate.executionStatus, ExecutionStatus.Conditional);
  assert.equal(candidate.entry, 7495);
  assert.equal(candidate.stop, 7490.75);
  assert.equal(candidate.target1, 7501.5);
  assert.equal(candidate.target2, 7503.5);
  assert.equal(candidate.humanReview?.canExecute, false);
  assert.equal(scan.bestExecutableCandidate, null);
  assert.equal(scan.bestConditionalCandidate?.setupType, SetupType.RaidFailureDisplacementReversal);
}

const extendedStructuralRiskScan = scanSetupCandidates({
  sessionType: 'morning',
  chartContext: {
    ...context('morning'),
    keyLevels: {
      currentPrice: 7509.25,
      activeSwingLow: 7490,
      activeSwingHigh: 7515.25,
    },
    liquiditySweeps: [{
      type: 'sweep',
      direction: 'SHORT',
      level: 7514.5,
      sweptLevelLabel: 'recent swing high',
      reclaimed: true,
      timestamp: '2026-07-27T09:15:00-04:00',
      confidence: 'High',
    }],
    reclaimEvents: [{
      direction: 'SHORT',
      reclaimedLevel: 7514.5,
      levelLabel: 'recent swing high',
      timestamp: '2026-07-27T09:15:00-04:00',
      confidence: 'High',
    }],
    failedBreakEvents: [{
      direction: 'SHORT',
      failedLevel: 7514.5,
      levelLabel: 'recent swing high',
      sweptExtreme: 7515.25,
      timestamp: '2026-07-27T09:15:00-04:00',
      confidence: 'High',
    }],
    displacementCandles: [{
      direction: 'SHORT',
      candleIndex: 2,
      timestamp: '2026-07-27T09:20:00-04:00',
      open: 7512.5,
      high: 7514,
      low: 7504.75,
      close: 7505.5,
      bodyPoints: 7,
      rangePoints: 9.25,
      bodyToRange: 0.76,
      closeLocation: 'bottom_quarter',
      displacementScore: 88,
      quality: 'confirmed',
      leavesImbalance: true,
      breaksStructure: true,
      confidence: 'High',
    }],
    multiTimeframeContext: mtf([
      candle(1, '2026-07-27T09:15:00-04:00', 7512.25, 7515.25, 7511.5, 7512.25),
      candle(2, '2026-07-27T09:20:00-04:00', 7512.5, 7514, 7504.75, 7505.5),
    ]),
  },
});
const extendedStructuralRiskCandidate = extendedStructuralRiskScan.bestConditionalCandidate;
assert.equal(extendedStructuralRiskCandidate?.setupType, SetupType.RaidFailureDisplacementReversal);
assert.equal(extendedStructuralRiskCandidate?.direction, 'SHORT');
assert.equal(extendedStructuralRiskCandidate?.entry, 7505.5);
assert.equal(extendedStructuralRiskCandidate?.stop, 7515.5);
assert.equal(extendedStructuralRiskCandidate?.riskPoints, 10);
assert.equal(extendedStructuralRiskCandidate?.riskPolicy, 'STRUCTURAL_RISK_ACKNOWLEDGED');
assert.equal(extendedStructuralRiskCandidate?.riskAdvisoryStatus, 'RISK_EXTENDED_STRUCTURAL');
assert.equal(extendedStructuralRiskCandidate?.blockReason, null);
assert.equal(extendedStructuralRiskCandidate?.missingEvidence.some((line) => /extended structural risk blocker|fixed risk cap/i.test(line)), false);

const symmetricRaidScan = scanSetupCandidates({
  sessionType: 'morning',
  chartContext: {
    ...context('morning'),
    keyLevels: {
      currentPrice: 7500,
      activeSwingLow: 7480,
      activeSwingHigh: 7520,
    },
    liquiditySweeps: [
      {
        type: 'sweep',
        direction: 'LONG',
        level: 7482,
        sweptLevelLabel: 'overnight low',
        reclaimed: true,
        timestamp: '2026-07-28T09:50:00-04:00',
        confidence: 'High',
      },
      {
        type: 'sweep',
        direction: 'SHORT',
        level: 7518,
        sweptLevelLabel: 'overnight high',
        reclaimed: true,
        timestamp: '2026-07-28T10:55:00-04:00',
        confidence: 'High',
      },
    ],
    reclaimEvents: [],
    failedBreakEvents: [
      {
        direction: 'LONG',
        failedLevel: 7482,
        levelLabel: 'overnight low',
        sweptExtreme: 7478,
        timestamp: '2026-07-28T09:50:00-04:00',
        confidence: 'High',
      },
      {
        direction: 'SHORT',
        failedLevel: 7518,
        levelLabel: 'overnight high',
        sweptExtreme: 7522,
        timestamp: '2026-07-28T10:55:00-04:00',
        confidence: 'High',
      },
    ],
    displacementCandles: [
      {
        direction: 'LONG',
        candleIndex: 3,
        timestamp: '2026-07-28T10:45:00-04:00',
        open: 7485,
        high: 7501,
        low: 7484,
        close: 7498,
        bodyPoints: 13,
        rangePoints: 17,
        bodyToRange: 0.76,
        closeLocation: 'top_quarter',
        displacementScore: 90,
        quality: 'confirmed',
        leavesImbalance: true,
        breaksStructure: true,
        confidence: 'High',
      },
      {
        direction: 'SHORT',
        candleIndex: 4,
        timestamp: '2026-07-28T11:00:00-04:00',
        open: 7516,
        high: 7517,
        low: 7498,
        close: 7501,
        bodyPoints: 15,
        rangePoints: 19,
        bodyToRange: 0.79,
        closeLocation: 'bottom_quarter',
        displacementScore: 90,
        quality: 'confirmed',
        leavesImbalance: true,
        breaksStructure: true,
        confidence: 'High',
      },
    ],
    multiTimeframeContext: mtf([
      candle(1, '2026-07-28T09:50:00-04:00', 7484, 7486, 7478, 7483),
      candle(2, '2026-07-28T10:45:00-04:00', 7485, 7501, 7484, 7498),
      candle(3, '2026-07-28T10:55:00-04:00', 7515, 7522, 7514, 7517),
      candle(4, '2026-07-28T11:00:00-04:00', 7516, 7517, 7498, 7501),
    ]),
  },
});
const symmetricRaidCandidates = symmetricRaidScan.candidates.filter((item) => item.setupType === SetupType.RaidFailureDisplacementReversal);
assert.equal(symmetricRaidCandidates.length, 2);
assert.ok(symmetricRaidCandidates.some((item) => item.direction === 'LONG' && item.entry === 7498 && item.stop === 7479.75));
assert.ok(symmetricRaidCandidates.some((item) => item.direction === 'SHORT' && item.entry === 7501 && item.stop === 7520.25));
assert.equal(symmetricRaidCandidates.every((item) => item.executionStatus === ExecutionStatus.Conditional), true);
assert.equal(symmetricRaidScan.bestExecutableCandidate, null);

const july28SellSideRaidLongScan = scanSetupCandidates({
  sessionType: 'morning',
  chartContext: {
    ...context('morning'),
    tradeDate: '2026-07-28',
    chartTimestamp: '2026-07-28T10:45:00-04:00',
    keyLevels: {
      currentPrice: 7440,
      activeSwingLow: 7417,
      activeSwingHigh: 7455.75,
    },
    candles: [
      candle(1, '2026-07-28T09:50:00-04:00', 7428, 7433.5, 7417, 7433),
      candle(2, '2026-07-28T10:00:00-04:00', 7427.75, 7430.25, 7418.75, 7421.75),
      candle(3, '2026-07-28T10:30:00-04:00', 7430.5, 7435, 7428.25, 7434.75),
      candle(4, '2026-07-28T10:45:00-04:00', 7432.5, 7443.5, 7431.25, 7440),
    ],
    liquiditySweeps: [{
      type: 'sweep',
      direction: 'LONG',
      level: 7419,
      sweptLevelLabel: 'ETH/overnight low',
      reclaimed: true,
      timestamp: '2026-07-28T09:50:00-04:00',
      confidence: 'High',
    }],
    reclaimEvents: [{
      direction: 'LONG',
      reclaimedLevel: 7419,
      levelLabel: 'ETH/overnight low',
      timestamp: '2026-07-28T09:50:00-04:00',
      confidence: 'High',
    }],
    failedBreakEvents: [{
      direction: 'LONG',
      failedLevel: 7419,
      levelLabel: 'ETH/overnight low',
      sweptExtreme: 7417,
      timestamp: '2026-07-28T09:50:00-04:00',
      confidence: 'High',
    }],
    displacementCandles: [{
      direction: 'LONG',
      candleIndex: 4,
      timestamp: '2026-07-28T10:45:00-04:00',
      open: 7432.5,
      high: 7443.5,
      low: 7431.25,
      close: 7440,
      bodyPoints: 7.5,
      rangePoints: 12.25,
      bodyToRange: 0.61,
      closeLocation: 'top_quarter',
      displacementScore: 82,
      quality: 'confirmed',
      leavesImbalance: true,
      breaksStructure: true,
      confidence: 'High',
    }],
    multiTimeframeContext: mtf([
      candle(1, '2026-07-28T09:50:00-04:00', 7428, 7433.5, 7417, 7433),
      candle(2, '2026-07-28T10:00:00-04:00', 7427.75, 7430.25, 7418.75, 7421.75),
      candle(3, '2026-07-28T10:30:00-04:00', 7430.5, 7435, 7428.25, 7434.75),
      candle(4, '2026-07-28T10:45:00-04:00', 7432.5, 7443.5, 7431.25, 7440),
    ]),
  },
});
const july28SellSideRaidLong = july28SellSideRaidLongScan.candidates.find((item) =>
  item.setupType === SetupType.RaidFailureDisplacementReversal &&
  item.direction === 'LONG'
);
assert.ok(july28SellSideRaidLong);
assert.equal(july28SellSideRaidLong.entry, 7430);
assert.equal(july28SellSideRaidLong.stop, 7428);
assert.equal(july28SellSideRaidLong.executionStatus, ExecutionStatus.Conditional);
assert.equal(july28SellSideRaidLong.humanReview?.canExecute, false);
assert.ok(july28SellSideRaidLong.evidence.some((line) => /ETH\/overnight low/i.test(line)));

const formingFiveMinute = [
  candle(1, '2026-06-25T09:15:00', 7484.25, 7489, 7478.75, 7483.75),
  candle(2, '2026-06-25T09:20:00', 7483.75, 7486.75, 7480, 7482),
  candle(3, '2026-06-25T09:25:00', 7482.25, 7487.75, 7481.25, 7485.75),
  candle(4, '2026-06-25T09:30:00', 7485.75, 7488.25, 7479, 7485.75),
];
const formingFifteenMinute = [
  candle(1, '2026-06-25T08:45:00', 7478, 7496.25, 7477.5, 7485.25),
  candle(2, '2026-06-25T09:00:00', 7485.25, 7492.75, 7481.5, 7486.75),
  candle(3, '2026-06-25T09:15:00', 7486.75, 7489, 7478.75, 7483.75),
  candle(4, '2026-06-25T09:30:00', 7483.75, 7488.25, 7479, 7485.75),
];
const formingWatchScan = scanSetupCandidates({
  sessionType: 'morning',
  chartContext: {
    ...context('morning'),
    tradeDate: '2026-06-25',
    chartTimestamp: '2026-06-25T09:30:00',
    candles: formingFiveMinute,
    liquiditySweeps: [],
    reclaimEvents: [],
    failedBreakEvents: [],
    displacementCandles: [],
    multiTimeframeContext: mtfWithFifteenMinute(formingFiveMinute, formingFifteenMinute),
    keyLevels: {
      currentPrice: 7485.75,
      activeSwingLow: 7479,
      activeSwingHigh: 7488.25,
    },
  },
});
assert.equal(formingWatchScan.candidates.length, 1);
assert.equal(formingWatchScan.bestConditionalCandidate?.setupType, SetupType.RaidFailureDisplacementReversal);
assert.equal(formingWatchScan.bestConditionalCandidate?.detectedStatus, SetupCandidateStatus.Possible);
assert.equal(formingWatchScan.bestConditionalCandidate?.direction, 'SHORT');
assert.equal(formingWatchScan.bestConditionalCandidate?.executionStatus, ExecutionStatus.Conditional);
assert.equal(formingWatchScan.bestConditionalCandidate?.blockReason, NoTradeReason.EntryTriggerPending);
assert.equal(formingWatchScan.bestConditionalCandidate?.entry, null);
assert.match(formingWatchScan.bestConditionalCandidate?.requiredTrigger || '', /wait for completed bearish 5M close-through proof/i);

const emptyScan = scanSetupCandidates({
  sessionType: 'morning',
  contextText: 'Narrative text alone must not create a model.',
});
assert.deepEqual(emptyScan.candidates, []);

assert.deepEqual(getScannedSetupTypes(), [
  SetupType.RaidFailureDisplacementReversal,
  SetupType.LiquidityRaidReclaimReversal,
  SetupType.FailedBreakoutReversal,
  SetupType.IntradayMssMicroContinuation,
  SetupType.StructureShiftContinuation,
  SetupType.DrivePullbackContinuation,
]);
assert.deepEqual(buildCompletedFiveMinuteProofSelectionSignals([
  {
    candidateKey: 'five-model-row',
    setupType: SetupType.RaidFailureDisplacementReversal,
    direction: 'LONG',
    sessionType: 'morning',
    completedBarTime: '2026-07-27T09:30:00.000Z',
  },
]), {});

console.log('setupScanner approved-model contract verified');
