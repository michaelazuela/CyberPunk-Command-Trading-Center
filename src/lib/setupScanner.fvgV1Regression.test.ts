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

function aug26MesMorningFvgDefendedLongContext(): ChartContext {
  const candles: NonNullable<ChartContext['candles']> = [
    [0, '2026-08-26T09:20:00-04:00', 7682, 7684, 7679.5, 7681.75],
    [1, '2026-08-26T09:25:00-04:00', 7681.75, 7683.25, 7678.25, 7680.5],
    [2, '2026-08-26T09:30:00-04:00', 7680.5, 7682.25, 7678.25, 7678.75],
    [3, '2026-08-26T09:35:00-04:00', 7678.75, 7690.75, 7678.75, 7689],
    [4, '2026-08-26T09:40:00-04:00', 7689, 7690.5, 7688.5, 7688],
    [5, '2026-08-26T09:45:00-04:00', 7688, 7698.25, 7686.5, 7695.25],
    [6, '2026-08-26T09:50:00-04:00', 7695.5, 7699.25, 7691.25, 7694.75],
  ].map(([index, timestamp, open, high, low, close]) => ({
    index: index as number,
    timestamp: timestamp as string,
    open: open as number,
    high: high as number,
    low: low as number,
    close: close as number,
    direction: (close as number) > (open as number) ? 'bullish' : 'bearish',
    bodyQuality: index === 3 || index === 5 ? 'large' : 'normal',
    upperWickQuality: 'small',
    lowerWickQuality: index === 5 ? 'large' : 'small',
    isExpansion: index === 3 || index === 5,
    isRejection: index === 5,
    isReclaim: index === 5,
    confidence: 'High',
  }));
  const bullishFvg = {
    direction: 'LONG' as const,
    lower: 7687.75,
    upper: 7690,
    midpoint: 7688.75,
    formedAt: '2026-08-26T09:30:00-04:00',
    formedCandleIndex: 2,
    filledPercent: 40,
    impulseQualified: true,
    impulseBodyRatio: 1.4,
    impulseRangeRatio: 1.5,
    confidence: 'High' as const,
  };
  const fifteenDisplacement = {
    direction: 'LONG' as const,
    candleIndex: 5,
    timestamp: '2026-08-26T09:45:00-04:00',
    open: 7688,
    high: 7698.25,
    low: 7686.5,
    close: 7695.25,
    bodyPoints: 7.25,
    rangePoints: 11.75,
    bodyToRange: 0.62,
    closeLocation: 'top_quarter' as const,
    quality: 'high_quality' as const,
    leavesImbalance: true,
    breaksStructure: false,
    displacementScore: 82,
    confidence: 'High' as const,
    evidence: '15M bullish displacement/support zone defended after RTH open.',
  };
  const fiveDisplacement = {
    ...fifteenDisplacement,
    evidence: '5M bullish defended FVG continuation candle held the battle zone.',
  };
  const factSet = (timeframe: '4h' | '2h' | '1h' | '15m' | '5m', role: 'macro_context' | 'session_structure' | 'liquidity_map' | 'execution') => ({
    timeframe,
    role,
    barCount: timeframe === '5m' ? 5987 : timeframe === '15m' ? 1995 : 180,
    high: 7720,
    low: 7660,
    open: 7680,
    close: 7695.25,
    midpoint: 7690,
    rangePoints: 60,
    trend: 'bullish' as const,
    candles: timeframe === '5m' ? candles : [],
    fvgZones: timeframe === '15m' ? [bullishFvg] : [],
    liquiditySweeps: [],
    reclaimEvents: [],
    failedBreakEvents: [],
    displacementCandles: timeframe === '15m' ? [fifteenDisplacement] : timeframe === '5m' ? [fiveDisplacement] : [],
    structuralLevels: [],
    confidence: 'High' as const,
    notes: [],
  });
  const mssEvidence = (timeframe: '5M' | '15M' | '60M' | '120M' | '240M', confirmed = false) => ({
    timeframe,
    direction: confirmed ? 'bullish' as const : 'neutral' as const,
    status: confirmed ? 'confirmed_mss' as const : 'no_mss' as const,
    displacementQuality: {
      present: confirmed,
      direction: confirmed ? 'bullish' as const : null,
      score: confirmed ? 86 : 0,
      bodyToRange: confirmed ? 0.62 : null,
      closeLocation: confirmed ? 0.85 : null,
      rangeExpansion: confirmed ? 1.4 : null,
    },
    breaksStructure: confirmed,
    structureBreak: confirmed
      ? {
          type: 'mss' as const,
          brokenLevel: timeframe === '5M' ? 7690 : 7688.75,
          brokenSwingTimestamp: timeframe === '5M' ? '2026-08-26T09:35:00-04:00' : '2026-08-26T09:30:00-04:00',
          priorStructureDirection: 'bearish' as const,
          closeThroughPoints: timeframe === '5M' ? 5.25 : 1.25,
          wickOnlyBreak: false,
        }
      : undefined,
    evidenceTimestamp: confirmed ? (timeframe === '5M' ? '2026-08-26T09:45:00-04:00' : '2026-08-26T09:45:00-04:00') : null,
    completedBarStatus: 'completed' as const,
    barTimestampMode: 'open' as const,
    barTimeZone: 'eastern' as const,
    source: 'ninjatrader_ohlc' as const,
    blockers: confirmed ? [] : [`${timeframe} not required for this focused FVG v1 defended-long regression.`],
    confidence: confirmed ? 86 : 0,
  });
  const timeframeCoverage = coverageRows();

  return {
    sessionType: 'replay_morning',
    instrument: 'MES',
    tradeDate: '2026-08-26',
    timeframe: '5m',
    chartTimestamp: '2026-08-26T09:50:00-04:00',
    screenshotUsability: 'usable',
    keyLevels: {
      currentPrice: 7695.25,
      activeSwingHigh: 7698.25,
      activeSwingLow: 7686.5,
      nearestSupport: 7687.75,
      nearestResistance: 7702,
      openingRangeHigh: 7698.25,
      openingRangeLow: 7678.25,
      rthOpen: 7680.5,
      previousDayHigh: 7708,
    },
    marketStructure: {
      trend: 'bullish',
      higherHigh: true,
      higherLow: true,
      lowerHigh: false,
      lowerLow: false,
      marketStructureShift: true,
      chopRangeCondition: false,
      compressionCondition: false,
      expansionCondition: true,
    },
    candleFacts: {
      lastClosedCandleDirection: 'bullish',
      expansionCandlePresent: true,
      rejectionWickPresent: true,
      breatherCandlePresent: false,
      reclaimCandlePresent: true,
      pullbackPresent: true,
      closeAboveKeyLevel: true,
      closeBelowKeyLevel: false,
    },
    candles,
    swings: [
      { type: 'low', price: 7686.5, timestamp: '2026-08-26T09:45:00-04:00', candleIndex: 5, label: 'protected 5M defended FVG swing low', confidence: 'High' },
      { type: 'high', price: 7698.25, timestamp: '2026-08-26T09:45:00-04:00', candleIndex: 5, label: 'RTH upside expansion high', confidence: 'High' },
    ],
    fvgZones: [bullishFvg],
    displacementCandles: [fiveDisplacement],
    setupReadyFacts: {
      pullbackIntoFvg: true,
      fvgReclaimed: true,
      breakOfStructure: true,
      sweepThenReclaim: true,
    },
    structureQualityContext: {
      direction: 'LONG',
      structureEvent: 'major_bos',
      structureTimeframe: '5m',
      executionTimeframeConfirmed: true,
      inducementSwept: true,
      validPullbackConfirmed: true,
      structureBreakConfirmedByClose: true,
      wickOnlyBreak: false,
      oldInducementStale: false,
      newInducementRequired: false,
      noChaseRequired: false,
      inducementFresh: true,
      inducementAgeBars: 2,
      chochAtMeaningfulLocation: true,
      chochLocationType: 'fvg',
      conflictsWithHigherTimeframeThesis: false,
      reasons: ['Defended 15M FVG support engineered liquidity before the 5M continuation break.'],
      missingReasons: [],
    },
    dealingRangeQuality: {
      rangeHigh: 7708,
      rangeLow: 7686.5,
      midpoint: 7697.25,
      currentPrice: 7695.25,
      location: 'discount',
      rangeSource: '15m',
      confidence: 'High',
      reason: 'Defended FVG long is still below the 15M dealing-range midpoint at trigger time.',
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
        macroBias: 'LONG',
        sessionBias: 'LONG',
        liquidityBias: 'LONG',
        executionBias: 'LONG',
        alignedDirection: 'LONG',
        conflicts: [],
        notes: ['15M bullish FVG battle zone defended and 5M execution evidence aligned long.'],
      },
      targetMap: { levelsToWatch: [] },
      rules: {
        higherTimeframesApproveTrades: false,
        fiveMinuteExecutionRequired: true,
        aiMayOverwriteOhlcFacts: false,
      },
      notes: ['15M support is context only; 5M provides execution proof.'],
    },
    timeframeMssEvidence: {
      source: 'ninjatrader_ohlc',
      authority: 'ohlc_facts_only',
      boundary: 'evidence_only_not_approval_or_execution_authority',
      timeframes: {
        '5M': mssEvidence('5M', true),
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
      drawDirection: 'buy_side',
      planDirection: 'LONG',
      macroContext: 'bullish',
      liquidityRaidState: 'none',
      classification: 'MSS_TRIGGER_CONFIRMED',
      timeframeStates: [],
      fiveMinuteState: {
        timeframe: '5M',
        direction: 'bullish',
        status: 'confirmed',
        lifecycleState: 'confirmed_mss',
        evidence: ['5M bullish MSS confirmed after 15M FVG support defense.'],
        confidence: 86,
      },
      htfDrawContinuationPending: false,
      htfContextSufficiency: { overallStatus: 'sufficient', timeframeCoverage, dataLimited: false, blockers: [], notes: ['HTF context sufficient.'] },
      htfContextDataLimited: false,
      timeframeCoverage,
      classificationReliability: 'structural',
      confidence: 86,
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
    marketContext: 'MES 2026-08-26 morning: 15M bullish FVG battle zone defended and 5M confirmed long continuation before the move became stale.',
  };
}

function aug26MesMorningFvgDefendedShortContext(): ChartContext {
  const longContext = aug26MesMorningFvgDefendedLongContext();
  const candles: NonNullable<ChartContext['candles']> = [
    [0, '2026-08-26T10:00:00-04:00', 7701.5, 7702, 7698.25, 7700.75],
    [1, '2026-08-26T10:05:00-04:00', 7700.75, 7701.25, 7696.75, 7698.25],
    [2, '2026-08-26T10:10:00-04:00', 7698.25, 7700, 7695.75, 7696],
    [3, '2026-08-26T10:15:00-04:00', 7696, 7696.5, 7688.5, 7690],
    [4, '2026-08-26T10:20:00-04:00', 7690, 7695.5, 7689.25, 7694.5],
    [5, '2026-08-26T10:25:00-04:00', 7694.5, 7695.25, 7685.25, 7687.75],
    [6, '2026-08-26T10:30:00-04:00', 7687.75, 7690, 7684.5, 7686.5],
  ].map(([index, timestamp, open, high, low, close]) => ({
    index: index as number,
    timestamp: timestamp as string,
    open: open as number,
    high: high as number,
    low: low as number,
    close: close as number,
    direction: (close as number) > (open as number) ? 'bullish' : 'bearish',
    bodyQuality: index === 3 || index === 5 ? 'large' : 'normal',
    upperWickQuality: index === 5 ? 'large' : 'small',
    lowerWickQuality: 'small',
    isExpansion: index === 3 || index === 5,
    isRejection: index === 5,
    isReclaim: index === 5,
    confidence: 'High',
  }));
  const bearishFvg = {
    direction: 'SHORT' as const,
    lower: 7692.5,
    upper: 7695.25,
    midpoint: 7693.75,
    formedAt: '2026-08-26T10:10:00-04:00',
    formedCandleIndex: 2,
    filledPercent: 45,
    impulseQualified: true,
    impulseBodyRatio: 1.4,
    impulseRangeRatio: 1.5,
    confidence: 'High' as const,
  };
  const bearishDisplacement = {
    direction: 'SHORT' as const,
    candleIndex: 5,
    timestamp: '2026-08-26T10:25:00-04:00',
    open: 7694.5,
    high: 7695.25,
    low: 7685.25,
    close: 7687.75,
    bodyPoints: 6.75,
    rangePoints: 10,
    bodyToRange: 0.68,
    closeLocation: 'bottom_quarter' as const,
    quality: 'high_quality' as const,
    leavesImbalance: true,
    breaksStructure: false,
    displacementScore: 84,
    confidence: 'High' as const,
    evidence: '5M bearish defended FVG continuation candle held the battle zone.',
  };
  const factSet = (timeframe: '4h' | '2h' | '1h' | '15m' | '5m', role: 'macro_context' | 'session_structure' | 'liquidity_map' | 'execution') => ({
    ...longContext.multiTimeframeContext!.fiveMinute,
    timeframe,
    role,
    high: 7702,
    low: 7684.5,
    open: 7701.5,
    close: 7687.75,
    midpoint: 7693.25,
    trend: 'bearish' as const,
    candles: timeframe === '5m' ? candles : [],
    fvgZones: timeframe === '15m' ? [bearishFvg] : [],
    displacementCandles: timeframe === '15m' || timeframe === '5m' ? [bearishDisplacement] : [],
  });
  const mssEvidence = (timeframe: '5M' | '15M' | '60M' | '120M' | '240M', confirmed = false) => ({
    ...longContext.timeframeMssEvidence!.timeframes[timeframe],
    direction: confirmed ? 'bearish' as const : 'neutral' as const,
    status: confirmed ? 'confirmed_mss' as const : 'no_mss' as const,
    displacementQuality: {
      present: confirmed,
      direction: confirmed ? 'bearish' as const : null,
      score: confirmed ? 84 : 0,
      bodyToRange: confirmed ? 0.68 : null,
      closeLocation: confirmed ? 0.85 : null,
      rangeExpansion: confirmed ? 1.4 : null,
    },
    breaksStructure: confirmed,
    structureBreak: confirmed
      ? {
          type: 'mss' as const,
          brokenLevel: timeframe === '5M' ? 7692.5 : 7693.75,
          brokenSwingTimestamp: '2026-08-26T10:20:00-04:00',
          priorStructureDirection: 'bullish' as const,
          closeThroughPoints: 4.75,
          wickOnlyBreak: false,
        }
      : undefined,
    evidenceTimestamp: confirmed ? '2026-08-26T10:25:00-04:00' : null,
    blockers: confirmed ? [] : [`${timeframe} not required for this focused FVG v1 defended-short regression.`],
    confidence: confirmed ? 84 : 0,
  });
  const timeframeCoverage = coverageRows();

  return {
    ...longContext,
    tradeDate: '2026-08-26',
    chartTimestamp: '2026-08-26T10:30:00-04:00',
    keyLevels: {
      ...longContext.keyLevels,
      currentPrice: 7687.75,
      activeSwingHigh: 7695.25,
      activeSwingLow: 7684.5,
      nearestSupport: 7684.5,
      nearestResistance: 7695.25,
      previousDayLow: 7675,
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
      reclaimCandlePresent: true,
      pullbackPresent: true,
      closeAboveKeyLevel: false,
      closeBelowKeyLevel: true,
    },
    candles,
    swings: [
      { type: 'high', price: 7695.25, timestamp: '2026-08-26T10:25:00-04:00', candleIndex: 5, label: 'protected 5M defended FVG swing high', confidence: 'High' },
      { type: 'low', price: 7685.25, timestamp: '2026-08-26T10:25:00-04:00', candleIndex: 5, label: 'downside expansion low', confidence: 'High' },
    ],
    fvgZones: [bearishFvg],
    displacementCandles: [bearishDisplacement],
    structureQualityContext: {
      direction: 'SHORT',
      structureEvent: 'major_bos',
      structureTimeframe: '5m',
      executionTimeframeConfirmed: true,
      inducementSwept: true,
      validPullbackConfirmed: true,
      structureBreakConfirmedByClose: true,
      wickOnlyBreak: false,
      oldInducementStale: false,
      newInducementRequired: false,
      noChaseRequired: false,
      inducementFresh: true,
      inducementAgeBars: 2,
      chochAtMeaningfulLocation: true,
      chochLocationType: 'fvg',
      conflictsWithHigherTimeframeThesis: false,
      reasons: ['Defended 15M FVG resistance engineered liquidity before the 5M continuation break.'],
      missingReasons: [],
    },
    dealingRangeQuality: {
      rangeHigh: 7695.25,
      rangeLow: 7675,
      midpoint: 7685.25,
      currentPrice: 7687.75,
      location: 'premium',
      rangeSource: '15m',
      confidence: 'High',
      reason: 'Defended FVG short is still above the 15M dealing-range midpoint at trigger time.',
    },
    multiTimeframeContext: {
      ...longContext.multiTimeframeContext!,
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
        notes: ['15M bearish FVG battle zone defended and 5M execution evidence aligned short.'],
      },
    },
    timeframeMssEvidence: {
      ...longContext.timeframeMssEvidence!,
      timeframes: {
        '5M': mssEvidence('5M', true),
        '15M': mssEvidence('15M', true),
        '60M': mssEvidence('60M'),
        '120M': mssEvidence('120M'),
        '240M': mssEvidence('240M'),
      },
    },
    htfLiquidityDrawState: {
      ...longContext.htfLiquidityDrawState!,
      drawDirection: 'sell_side',
      planDirection: 'SHORT',
      macroContext: 'bearish',
      fiveMinuteState: {
        timeframe: '5M',
        direction: 'bearish',
        status: 'confirmed',
        lifecycleState: 'confirmed_mss',
        evidence: ['5M bearish MSS confirmed after 15M FVG resistance defense.'],
        confidence: 84,
      },
      htfContextSufficiency: { overallStatus: 'sufficient', timeframeCoverage, dataLimited: false, blockers: [], notes: ['HTF context sufficient.'] },
      timeframeCoverage,
      confidence: 84,
    },
    marketContext: 'MES 2026-08-26 morning: 15M bearish FVG battle zone defended and 5M confirmed short continuation before the move became stale.',
  };
}

const result = scanSetupCandidates({
  sessionType: 'replay_morning',
  chartContext: aug25MesMorningFvgFailureShortContext(),
  result: null,
});
const fvgV1 = result.candidates.find((candidate) => candidate.setupType === SetupType.FvgTradingSystemV1);

assert.ok(fvgV1);
assert.ok(result.candidates.length >= 1);
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

const defendedLongResult = scanSetupCandidates({
  sessionType: 'replay_morning',
  chartContext: aug26MesMorningFvgDefendedLongContext(),
  result: null,
});
const defendedLong = defendedLongResult.candidates.find((candidate) => candidate.setupType === SetupType.FvgTradingSystemV1);

assert.ok(defendedLong);
assert.ok(defendedLongResult.candidates.length >= 1);
assert.equal(defendedLong.direction, 'LONG');
assert.equal(defendedLong.detectedStatus, SetupCandidateStatus.Detected);
assert.equal(defendedLong.executionStatus, ExecutionStatus.Executable);
assert.equal(defendedLong.entry, 7690);
assert.equal(defendedLong.stop, 7686.25);
assert.equal(defendedLong.riskPoints, 3.75);
assert.equal(defendedLong.target1, 7695.75);
assert.equal(defendedLong.target2, 7697.5);
assert.equal(defendedLong.blockReason, null);
assert.ok(defendedLong.evidence.includes('15M same-direction FVG battle zone present'));
assert.ok(defendedLong.evidence.includes('15M bullish displacement/support context is present before defended-first continuation'));
assert.ok(defendedLong.evidence.includes('Completed 5M MSS confirms execution direction'));
assert.ok(defendedLong.evidence.includes('Stop tied to protected 5M structure'));
assert.ok(defendedLong.evidence.some((item) => item.includes('No-chase gate clean')));
assert.equal(defendedLongResult.bestExecutableCandidate?.setupType, SetupType.FvgTradingSystemV1);

console.log('FVG v1 2026-08-26 MES morning defended-long regression verified.');

const defendedShortResult = scanSetupCandidates({
  sessionType: 'replay_morning',
  chartContext: aug26MesMorningFvgDefendedShortContext(),
  result: null,
});
const defendedShort = defendedShortResult.candidates.find((candidate) => candidate.setupType === SetupType.FvgTradingSystemV1);

assert.ok(defendedShort);
assert.ok(defendedShortResult.candidates.length >= 1);
assert.equal(defendedShort.direction, 'SHORT');
assert.equal(defendedShort.detectedStatus, SetupCandidateStatus.Detected);
assert.equal(defendedShort.executionStatus, ExecutionStatus.Executable);
assert.equal(defendedShort.entry, 7692.5);
assert.equal(defendedShort.stop, 7696.75);
assert.equal(defendedShort.riskPoints, 4.25);
assert.equal(defendedShort.target1, 7686.25);
assert.equal(defendedShort.target2, 7684);
assert.equal(defendedShort.blockReason, null);
assert.ok(defendedShort.evidence.includes('15M same-direction FVG battle zone present'));
assert.ok(defendedShort.evidence.includes('15M bearish displacement/support context is present before defended-first continuation'));
assert.ok(defendedShort.evidence.includes('Completed 5M MSS confirms execution direction'));
assert.ok(defendedShort.evidence.includes('Stop tied to protected 5M structure'));
assert.ok(defendedShort.evidence.some((item) => item.includes('No-chase gate clean')));
assert.equal(defendedShortResult.bestExecutableCandidate?.setupType, SetupType.FvgTradingSystemV1);

console.log('FVG v1 2026-08-26 MES morning defended-short regression verified.');
