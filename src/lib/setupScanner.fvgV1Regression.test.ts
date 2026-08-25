import assert from 'node:assert/strict';
import { ChartContext, ExecutionStatus, SetupCandidateStatus, SetupType } from '../types';
import { scanSetupCandidates } from './setupScanner';

function coverageRows() {
  return [
    { timeframe: '4H' as const, barsLoaded: 180, rangeStart: '2026-07-26T00:00:00-04:00', rangeEnd: '2026-08-25T09:50:00-04:00', minimumExpectedDescription: '30 calendar days when available.', minimumSatisfied: true, status: 'sufficient' as const },
    { timeframe: '2H' as const, barsLoaded: 360, rangeStart: '2026-07-26T00:00:00-04:00', rangeEnd: '2026-08-25T09:50:00-04:00', minimumExpectedDescription: '30 calendar days when available.', minimumSatisfied: true, status: 'sufficient' as const },
    { timeframe: '1H' as const, barsLoaded: 720, rangeStart: '2026-07-26T00:00:00-04:00', rangeEnd: '2026-08-25T09:50:00-04:00', minimumExpectedDescription: '30 calendar days when available.', minimumSatisfied: true, status: 'sufficient' as const },
    { timeframe: '15M' as const, barsLoaded: 1995, rangeStart: '2026-07-26T18:15:00-04:00', rangeEnd: '2026-08-25T09:45:00-04:00', minimumExpectedDescription: '30 calendar days when available.', minimumSatisfied: true, status: 'sufficient' as const },
    { timeframe: '5M' as const, barsLoaded: 5987, rangeStart: '2026-07-26T18:05:00-04:00', rangeEnd: '2026-08-25T09:50:00-04:00', minimumExpectedDescription: '30 calendar days when available; active setup-scan window remains the execution trigger authority.', minimumSatisfied: true, status: 'sufficient' as const },
  ];
}

function aug25MesMorningFvgFailureShortContext(): ChartContext {
  const candles: NonNullable<ChartContext['candles']> = [
    [0, '2026-08-25T09:20:00-04:00', 7698, 7700.75, 7696.75, 7699.25],
    [1, '2026-08-25T09:25:00-04:00', 7699, 7699.5, 7696.75, 7697],
    [2, '2026-08-25T09:30:00-04:00', 7697, 7700.25, 7694.75, 7695],
    [3, '2026-08-25T09:35:00-04:00', 7695, 7701.25, 7692.5, 7700.5],
    [4, '2026-08-25T09:40:00-04:00', 7700.25, 7700.5, 7694.5, 7695],
    [5, '2026-08-25T09:45:00-04:00', 7695.25, 7699.75, 7692, 7697.75],
    [6, '2026-08-25T09:50:00-04:00', 7698, 7698.75, 7693, 7693.25],
  ].map(([index, timestamp, open, high, low, close]) => ({
    index: index as number,
    timestamp: timestamp as string,
    open: open as number,
    high: high as number,
    low: low as number,
    close: close as number,
    direction: (close as number) > (open as number) ? 'bullish' : 'bearish',
    bodyQuality: index === 4 || index === 6 ? 'large' : 'normal',
    upperWickQuality: index === 5 ? 'large' : 'small',
    lowerWickQuality: 'small',
    isExpansion: index === 4 || index === 6,
    isRejection: index === 5,
    confidence: 'High',
  }));
  const bearishFvg = {
    direction: 'SHORT' as const,
    lower: 7698.5,
    upper: 7704.5,
    midpoint: 7701.5,
    formedAt: '2026-08-25T09:40:00-04:00',
    formedCandleIndex: 4,
    filledPercent: 35,
    impulseQualified: true,
    impulseBodyRatio: 1.4,
    impulseRangeRatio: 1.5,
    confidence: 'High' as const,
  };
  const displacement = {
    direction: 'SHORT' as const,
    candleIndex: 4,
    timestamp: '2026-08-25T09:40:00-04:00',
    open: 7700.25,
    high: 7700.5,
    low: 7694.5,
    close: 7695,
    bodyPoints: 5.25,
    rangePoints: 6,
    bodyToRange: 0.88,
    closeLocation: 'bottom_quarter' as const,
    quality: 'high_quality' as const,
    leavesImbalance: true,
    breaksStructure: true,
    displacementScore: 88,
    confidence: 'High' as const,
    evidence: 'Opening-drive bearish displacement left imbalance and broke structure.',
  };
  const factSet = (timeframe: '4h' | '2h' | '1h' | '15m' | '5m', role: 'macro_context' | 'session_structure' | 'liquidity_map' | 'execution') => ({
    timeframe,
    role,
    barCount: timeframe === '5m' ? 5987 : timeframe === '15m' ? 1995 : 180,
    high: 7715,
    low: 7660,
    open: 7697,
    close: 7697.75,
    midpoint: 7687.5,
    rangePoints: 55,
    trend: 'bearish' as const,
    candles: timeframe === '5m' ? candles : [],
    fvgZones: timeframe === '15m' ? [bearishFvg] : [],
    liquiditySweeps: [],
    reclaimEvents: [],
    failedBreakEvents: [],
    displacementCandles: [displacement],
    structuralLevels: [],
    confidence: 'High' as const,
    notes: [],
  });
  const mssEvidence = (timeframe: '5M' | '15M' | '60M' | '120M' | '240M', confirmed = false) => ({
    timeframe,
    direction: confirmed ? 'bearish' as const : 'neutral' as const,
    status: confirmed ? 'confirmed_mss' as const : 'no_mss' as const,
    displacementQuality: {
      present: confirmed,
      direction: confirmed ? 'bearish' as const : null,
      score: confirmed ? 88 : 0,
      bodyToRange: confirmed ? 0.88 : null,
      closeLocation: confirmed ? 0.85 : null,
      rangeExpansion: confirmed ? 1.4 : null,
    },
    breaksStructure: confirmed,
    structureBreak: confirmed
      ? {
          type: 'mss' as const,
          brokenLevel: timeframe === '5M' ? 7694.75 : 7698.5,
          brokenSwingTimestamp: timeframe === '5M' ? '2026-08-25T09:30:00-04:00' : '2026-08-25T09:15:00-04:00',
          priorStructureDirection: 'bullish' as const,
          closeThroughPoints: timeframe === '5M' ? 1.5 : 0.75,
          wickOnlyBreak: false,
        }
      : undefined,
    evidenceTimestamp: confirmed ? (timeframe === '5M' ? '2026-08-25T09:50:00-04:00' : '2026-08-25T09:45:00-04:00') : null,
    completedBarStatus: 'completed' as const,
    barTimestampMode: 'open' as const,
    barTimeZone: 'eastern' as const,
    source: 'ninjatrader_ohlc' as const,
    blockers: confirmed ? [] : [`${timeframe} not required for this focused FVG v1 regression.`],
    confidence: confirmed ? 88 : 0,
  });
  const timeframeCoverage = coverageRows();

  return {
    sessionType: 'replay_morning',
    instrument: 'MES',
    tradeDate: '2026-08-25',
    timeframe: '5m',
    chartTimestamp: '2026-08-25T09:50:00-04:00',
    screenshotUsability: 'usable',
    keyLevels: {
      currentPrice: 7697.75,
      activeSwingHigh: 7701.25,
      activeSwingLow: 7692,
      nearestSupport: 7688,
      nearestResistance: 7701.25,
      openingRangeHigh: 7701.25,
      openingRangeLow: 7692,
      rthOpen: 7697,
    },
    marketStructure: {
      trend: 'bearish',
      higherHigh: false,
      higherLow: false,
      lowerHigh: true,
      lowerLow: true,
      marketStructureShift: true,
      chopRangeCondition: false,
      compressionCondition: false,
      expansionCondition: true,
    },
    candleFacts: {
      lastClosedCandleDirection: 'bearish',
      expansionCandlePresent: true,
      rejectionWickPresent: true,
      breatherCandlePresent: false,
      reclaimCandlePresent: false,
      pullbackPresent: true,
      closeAboveKeyLevel: false,
      closeBelowKeyLevel: true,
    },
    candles,
    swings: [
      { type: 'high', price: 7701.25, timestamp: '2026-08-25T09:35:00-04:00', candleIndex: 3, label: 'protected 5M swing high', confidence: 'High' },
      { type: 'low', price: 7692, timestamp: '2026-08-25T09:45:00-04:00', candleIndex: 5, label: 'fresh 5M downside break area', confidence: 'High' },
    ],
    fvgZones: [bearishFvg],
    displacementCandles: [displacement],
    setupReadyFacts: {
      pullbackIntoFvg: true,
      fvgReclaimed: false,
      breakOfStructure: true,
      sweepThenReclaim: false,
    },
    multiTimeframeContext: {
      source: 'ninjatrader_bridge',
      authority: 'ohlc_facts_only',
      fourHour: factSet('4h', 'macro_context'),
      twoHour: factSet('2h', 'macro_context'),
      oneHour: factSet('1h', 'session_structure'),
      fifteenMinute: factSet('15m', 'liquidity_map'),
      fiveMinute: factSet('5m', 'execution'),
      alignment: {
        macroBias: 'SHORT',
        sessionBias: 'SHORT',
        liquidityBias: 'SHORT',
        executionBias: 'SHORT',
        alignedDirection: 'SHORT',
        conflicts: [],
        notes: ['15M FVG battle zone failed and 5M execution evidence aligned short.'],
      },
      targetMap: { levelsToWatch: [] },
      rules: {
        higherTimeframesApproveTrades: false,
        fiveMinuteExecutionRequired: true,
        aiMayOverwriteOhlcFacts: false,
      },
      notes: ['15M context is map only; 5M provides execution proof.'],
    },
    timeframeMssEvidence: {
      source: 'ninjatrader_ohlc',
      authority: 'ohlc_facts_only',
      boundary: 'evidence_only_not_approval_or_execution_authority',
      timeframes: {
        '5M': {
          ...mssEvidence('5M', true),
          structureBreak: { type: 'mss', brokenLevel: 7694.75, brokenSwingTimestamp: '2026-08-25T09:30:00-04:00', priorStructureDirection: 'bullish', closeThroughPoints: 1.5, wickOnlyBreak: false },
        },
        '15M': mssEvidence('15M', true),
        '60M': mssEvidence('60M'),
        '120M': mssEvidence('120M'),
        '240M': mssEvidence('240M'),
      },
      notes: ['Test fixture active timeframe MSS evidence.'],
      approvesExecution: false,
      changesTradeLogic: false,
    },
    htfLiquidityDrawState: {
      source: 'ninjatrader_ohlc',
      authority: 'ohlc_facts_only',
      boundary: 'context_only_not_execution_authority',
      drawDirection: 'sell_side',
      planDirection: 'SHORT',
      macroContext: 'bearish',
      liquidityRaidState: 'none',
      classification: 'MSS_TRIGGER_CONFIRMED',
      timeframeStates: [],
      fiveMinuteState: {
        timeframe: '5M',
        direction: 'bearish',
        status: 'confirmed',
        lifecycleState: 'confirmed_mss',
        evidence: ['5M bearish MSS confirmed after 15M FVG failure.'],
        confidence: 88,
      },
      htfDrawContinuationPending: false,
      htfContextSufficiency: { overallStatus: 'sufficient', timeframeCoverage, dataLimited: false, blockers: [], notes: ['HTF context sufficient.'] },
      htfContextDataLimited: false,
      timeframeCoverage,
      classificationReliability: 'structural',
      confidence: 88,
      notes: ['HTF context sufficient; 15M remains context and 5M remains execution authority.'],
      blockers: [],
      createsTradingPlanCandidate: false,
      approvesExecution: false,
    },
    screenshotQuality: 'High',
    levelReadConfidence: 'High',
    candleReadConfidence: 'High',
    structureReadConfidence: 'High',
    setupReadConfidence: 'High',
    riskReadConfidence: 'High',
    entryStopConfidence: 'High',
    entryConfirmed: true,
    stopConfirmed: true,
    requiresManualConfirmation: false,
    riskStatus: 'WithinLimit',
    extractionWarnings: {
      screenshotUnclear: false,
      priceLabelsUnreadable: false,
      timeframeUnverified: false,
      levelsUnclear: false,
      manualEntryStopRequired: false,
      messages: [],
    },
    marketContext: 'MES 2026-08-25 morning: 15M bearish FVG failed, then 5M rejected the retest and accepted lower.',
  };
}

const result = scanSetupCandidates({
  sessionType: 'replay_morning',
  chartContext: aug25MesMorningFvgFailureShortContext(),
  result: null,
});
const fvgV1 = result.candidates.find((candidate) => candidate.setupType === SetupType.FvgTradingSystemV1);

assert.ok(fvgV1);
assert.equal(result.candidates.length, 1);
assert.equal(fvgV1.direction, 'SHORT');
assert.equal(fvgV1.detectedStatus, SetupCandidateStatus.Detected);
assert.equal(fvgV1.executionStatus, ExecutionStatus.Executable);
assert.equal(fvgV1.entry, 7697.75);
assert.equal(fvgV1.stop, 7701.5);
assert.equal(fvgV1.riskPoints, 3.75);
assert.equal(fvgV1.target1, 7692.25);
assert.equal(fvgV1.target2, 7690.25);
assert.equal(fvgV1.blockReason, null);
assert.ok(fvgV1.evidence.includes('15M same-direction FVG battle zone present'));
assert.ok(fvgV1.evidence.includes('15M FVG failure accepted beyond the battle-zone boundary by completed 5M close'));
assert.ok(fvgV1.evidence.includes('Completed 5M MSS confirms execution direction'));
assert.ok(fvgV1.evidence.includes('Stop tied to protected 5M structure'));
assert.ok(fvgV1.evidence.some((item) => item.includes('No-chase gate clean')));
assert.equal(result.bestExecutableCandidate?.setupType, SetupType.FvgTradingSystemV1);

console.log('FVG v1 2026-08-25 MES morning failure-short regression verified.');
