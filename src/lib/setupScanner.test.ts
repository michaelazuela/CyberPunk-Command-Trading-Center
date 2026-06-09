import assert from 'node:assert/strict';
import { getPrimarySetupRegistry, getSupportingEvidenceRegistry, SETUP_REGISTRY } from '../config/setupRegistry';
import {
  AnalysisResult,
  ChartContext,
  DayType,
  ExecutionStatus,
  NoTradeReason,
  SetupCandidateStatus,
  SetupType,
} from '../types';
import { computeZoneOverlap, getScannedSetupTypes, scanSetupCandidates } from './setupScanner';
import { normalizeCandidateIctModelLabel, normalizeIctModelLabel } from './ictModelLabels';
import { buildTradeJournalRecord } from './tradeJournal';

function resultWithText(
  text: string,
  entry = 7400,
  stop = 7396,
  triggerState: 'TRIGGERED' | 'PENDING_TRIGGER' | 'NO_TRIGGER' = 'PENDING_TRIGGER'
): AnalysisResult {
  return {
    dayType: 'LONG' as DayType,
    reasoning: text,
    confidence: 0.8,
    checks: [],
    levelCheck: 'Stop below active swing low.',
    structureStatus: text,
    current_rule_analysis: {
      summary: text,
      setup_detected: text,
      rule_category: text,
      entry,
      stop,
      target_1: null,
      target_2: null,
      trigger_state: triggerState,
      entry_trigger: 'Break of the completed trigger candle.',
      no_trade_reason: null,
      base_confidence: 'High',
    },
  };
}

function structuredContext(): ChartContext {
  return {
    sessionType: 'replay_morning',
    instrument: 'MES',
    tradeDate: '2026-05-08',
    timeframe: '5m',
    screenshotUsability: 'usable',
    keyLevels: {
      currentPrice: 7400,
      priorDayHigh: 7420,
      priorDayLow: 7380,
      overnightHigh: 7418,
      overnightLow: 7375,
      rthOpen: 7398,
      nearestSupport: 7396,
      activeSwingLow: 7396,
      activeSwingHigh: 7412,
      nearestResistance: 7410,
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
      rejectionWickPresent: false,
      breatherCandlePresent: false,
      reclaimCandlePresent: false,
      pullbackPresent: false,
      closeAboveKeyLevel: true,
      closeBelowKeyLevel: false,
    },
    extractedLevels: [
      {
        label: 'active swing low',
        price: 7396,
        role: 'support',
        source: 'ocr',
        confidence: 'High',
        evidence: 'Visible swing low under reclaim candle.',
      },
    ],
    candles: [
      {
        index: 0,
        timestamp: '10:00',
        open: 7398,
        high: 7402,
        low: 7396,
        close: 7401,
        direction: 'bullish',
        bodyQuality: 'large',
        upperWickQuality: 'small',
        lowerWickQuality: 'small',
        isExpansion: true,
        confidence: 'High',
      },
    ],
    swings: [
      {
        type: 'low',
        price: 7396,
        timestamp: '09:45',
        candleIndex: 3,
        label: 'active swing low',
        confidence: 'High',
      },
    ],
    fvgZones: [
      {
        direction: 'LONG',
        upper: 7401,
        lower: 7398,
        midpoint: 7399.5,
        formedAt: '09:55',
        filledPercent: 50,
        inverted: false,
        reclaimed: true,
        impulseQualified: true,
        impulseBodyRatio: 1.5,
        impulseRangeRatio: 1.5,
        reclaimTimestamp: '10:00',
        confidence: 'High',
      },
    ],
    liquidityEvents: [
      {
        type: 'sweep',
        direction: 'LONG',
        level: 7396,
        sweptLevelLabel: 'opening low',
        reclaimed: true,
        timestamp: '09:45',
        confidence: 'High',
        evidence: 'Wick swept opening low and reclaimed.',
      },
    ],
    liquiditySweeps: [
      {
        type: 'sweep',
        direction: 'LONG',
        level: 7396,
        sweptLevelLabel: 'opening low',
        reclaimed: true,
        timestamp: '09:45',
        confidence: 'High',
        evidence: 'Wick swept opening low and reclaimed.',
      },
    ],
    reclaimEvents: [
      {
        direction: 'LONG',
        reclaimedLevel: 7396,
        levelLabel: 'opening low',
        timestamp: '09:45',
        candleIndex: 0,
        confidence: 'High',
        evidence: 'Close reclaimed the swept low.',
      },
    ],
    failedBreakEvents: [
      {
        direction: 'LONG',
        failedLevel: 7396,
        levelLabel: 'opening low',
        sweptExtreme: 7396,
        timestamp: '09:45',
        candleIndex: 0,
        confidence: 'High',
        evidence: 'Failed breakdown below opening low.',
      },
    ],
    displacementCandles: [
      {
        direction: 'LONG',
        candleIndex: 0,
        timestamp: '10:00',
        open: 7398,
        high: 7402,
        low: 7396,
        close: 7401,
        bodyPoints: 3,
        rangePoints: 6,
        quality: 'confirmed',
        leavesImbalance: true,
        breaksStructure: true,
        displacementScore: 80,
        confidence: 'High',
        evidence: 'Large reclaim candle.',
      },
    ],
    setupReadyFacts: {
      pullbackIntoFvg: true,
      fvgReclaimed: true,
      breakOfStructure: true,
      sweepThenReclaim: true,
      notes: ['Fixture includes setup-ready facts.'],
    },
    gapContext: {
      gapPresent: false,
      direction: 'none',
      confidence: 'High',
    },
    compressionRange: {
      present: false,
      confidence: 'High',
    },
    setupEvidence: {
      liquiditySweep: {
        detected: true,
        possible: false,
        direction: 'LONG',
        entry: 7400,
        stop: 7396,
        invalidation: 'Break below active swing low.',
        requiredTrigger: 'Break of reclaim candle high.',
        triggerState: 'TRIGGERED',
        confidence: 'High',
        evidence: ['Structured sweep and reclaim facts detected.'],
        missingEvidence: [],
      },
    },
    timeframeMssEvidence: timeframeMssEvidenceLayer('bullish'),
    screenshotQuality: 'High',
    levelReadConfidence: 'High',
    candleReadConfidence: 'High',
    structureReadConfidence: 'High',
    setupReadConfidence: 'High',
    riskReadConfidence: 'High',
    entryStopConfidence: 'High',
    proposedEntry: 7400,
    proposedStop: 7396,
    riskPoints: 4,
    riskStatus: 'WithinLimit',
    entryConfirmed: true,
    stopConfirmed: true,
    requiresManualConfirmation: false,
    extractionWarnings: {
      screenshotUnclear: false,
      priceLabelsUnreadable: false,
      timeframeUnverified: false,
      levelsUnclear: false,
      manualEntryStopRequired: false,
      messages: [],
    },
    marketContext: 'Structured bullish sweep context.',
  };
}

function lunchContext(): ChartContext {
  const context = structuredContext();
  return {
    ...context,
    sessionType: 'replay_lunch',
    tradeDate: '2026-05-08',
    keyLevels: {
      ...context.keyLevels,
      currentPrice: 7416,
      morningHigh: 7418,
      morningLow: 7392,
      activeSwingHigh: 7419,
      activeSwingLow: 7412,
      morningHighSweep: 7419,
      morningLowSweep: null,
    },
    morningWindowContext: {
      complete: true,
      source: 'morning_analysis',
      morningHigh: 7418,
      morningLow: 7392,
      initialBalanceHigh: 7402,
      initialBalanceLow: 7392,
      openingDriveDirection: 'bullish',
      morningTrend: 'bullish_extension',
      morningHighSwept: true,
      morningLowSwept: false,
      failedHoldAboveMorningHigh: true,
      failedHoldBelowMorningLow: false,
      rangeReclaimed: false,
      confidence: 'High',
      evidence: ['Completed Morning window supplied morning high/low and bullish extension context.'],
      missingEvidence: [],
    },
    candleFacts: {
      lastClosedCandleDirection: 'bearish',
      expansionCandlePresent: false,
      rejectionWickPresent: true,
      breatherCandlePresent: false,
      reclaimCandlePresent: true,
      pullbackPresent: false,
      closeAboveKeyLevel: false,
      closeBelowKeyLevel: true,
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
      expansionCondition: false,
    },
    liquidityEvents: [
      {
        type: 'sweep',
        direction: 'SHORT',
        level: 7419,
        sweptLevelLabel: 'morning high',
        reclaimed: true,
        timestamp: '12:05',
        confidence: 'High',
        evidence: 'Price swept the completed Morning high and failed back below it.',
      },
    ],
    setupEvidence: {
      lunchFailedHighReversal: {
        detected: true,
        possible: false,
        direction: 'SHORT',
        entry: 7417.75,
        stop: 7419,
        invalidation: 'Trade is invalid if price reclaims and holds above the morning high sweep.',
        requiredTrigger: '5M close back below morning high or failed retest from below.',
        triggerState: 'TRIGGERED',
        confidence: 'High',
        evidence: ['Morning high was swept after a completed bullish Morning window and failed to hold.'],
        missingEvidence: [],
      },
    },
    timeframeMssEvidence: timeframeMssEvidenceLayer('bearish'),
    proposedEntry: 7417.75,
    proposedStop: 7419,
    riskPoints: 1.25,
    riskStatus: 'WithinLimit',
    entryConfirmed: true,
    stopConfirmed: true,
    requiresManualConfirmation: false,
    marketContext: 'Completed Morning context supports a Lunch failed high reversal check.',
  };
}

function shortModelOneContext(): ChartContext {
  const context = structuredContext();
  return {
    ...context,
    keyLevels: {
      ...context.keyLevels,
      currentPrice: 7400,
      activeSwingHigh: 7404,
      activeSwingLow: 7388,
    },
    marketStructure: {
      ...context.marketStructure!,
      trend: 'bearish',
      higherHigh: false,
      higherLow: false,
      lowerHigh: true,
      lowerLow: true,
      marketStructureShift: true,
      expansionCondition: true,
    },
    candleFacts: {
      ...context.candleFacts!,
      lastClosedCandleDirection: 'bearish',
      closeAboveKeyLevel: false,
      closeBelowKeyLevel: true,
    },
    fvgZones: [{
      direction: 'SHORT',
      lower: 7398,
      upper: 7401,
      midpoint: 7399.5,
      formedAt: '10:00',
      formedCandleIndex: 1,
      impulseQualified: true,
      impulseBodyRatio: 1.5,
      impulseRangeRatio: 1.5,
      confidence: 'High',
    }],
    liquidityEvents: [{
      type: 'sweep',
      direction: 'SHORT',
      level: 7404,
      sweptLevelLabel: 'opening high',
      reclaimed: true,
      timestamp: '09:45',
      confidence: 'High',
      evidence: 'Wick swept opening high and reclaimed lower.',
    }],
    liquiditySweeps: [{
      type: 'sweep',
      direction: 'SHORT',
      level: 7404,
      sweptLevelLabel: 'opening high',
      reclaimed: true,
      timestamp: '09:45',
      confidence: 'High',
      evidence: 'Wick swept opening high and reclaimed lower.',
    }],
    reclaimEvents: [{
      direction: 'SHORT',
      reclaimedLevel: 7404,
      levelLabel: 'opening high',
      timestamp: '09:45',
      candleIndex: 0,
      confidence: 'High',
      evidence: 'Close reclaimed back below the swept high.',
    }],
    failedBreakEvents: [{
      direction: 'SHORT',
      failedLevel: 7404,
      levelLabel: 'opening high',
      sweptExtreme: 7404,
      timestamp: '09:45',
      candleIndex: 0,
      confidence: 'High',
      evidence: 'Failed breakout above opening high.',
    }],
    displacementCandles: [{
      direction: 'SHORT',
      candleIndex: 1,
      timestamp: '10:00',
      open: 7403,
      high: 7404,
      low: 7396,
      close: 7397,
      bodyPoints: 6,
      rangePoints: 8,
      quality: 'confirmed',
      leavesImbalance: true,
      breaksStructure: true,
      displacementScore: 85,
      confidence: 'High',
      evidence: 'Bearish expansion candle created imbalance and broke structure.',
    }],
    candles: [
      {
        index: 0,
        timestamp: '09:45',
        open: 7401,
        high: 7404,
        low: 7400,
        close: 7401,
        direction: 'doji',
        confidence: 'High',
      },
      {
        index: 1,
        timestamp: '10:00',
        open: 7403,
        high: 7404,
        low: 7396,
        close: 7397,
        direction: 'bearish',
        bodyQuality: 'large',
        isExpansion: true,
        confidence: 'High',
      },
      {
        index: 2,
        timestamp: '10:05',
        open: 7397,
        high: 7400,
        low: 7395,
        close: 7396,
        direction: 'bearish',
        confidence: 'High',
      },
    ],
    setupReadyFacts: {
      pullbackIntoFvg: true,
      fvgReclaimed: true,
      breakOfStructure: true,
      sweepThenReclaim: true,
    },
    setupEvidence: {},
    timeframeMssEvidence: timeframeMssEvidenceLayer('bearish'),
    proposedEntry: 7400,
    proposedStop: 7404.25,
    riskPoints: 4.25,
  };
}

function timeframeMssEvidenceLayer(
  direction: 'bullish' | 'bearish',
  overrides: Partial<Record<'5M' | '15M' | '60M' | '120M' | '240M', Partial<NonNullable<ChartContext['timeframeMssEvidence']>['timeframes']['5M']>>> = {}
): NonNullable<ChartContext['timeframeMssEvidence']> {
  const buildEvidence = (
    timeframe: '5M' | '15M' | '60M' | '120M' | '240M'
  ): NonNullable<ChartContext['timeframeMssEvidence']>['timeframes']['5M'] => ({
    timeframe,
    direction,
    status: 'confirmed_mss',
    displacementQuality: {
      present: true,
      direction,
      score: 88,
      bodyToRange: 0.72,
      closeLocation: 0.83,
      rangeExpansion: 1.45,
    },
    breaksStructure: true,
    evidenceTimestamp: '2026-05-08T10:00:00-04:00',
    completedBarStatus: 'completed',
    barTimestampMode: 'close',
    barTimeZone: 'eastern',
    source: 'ninjatrader_ohlc',
    blockers: [],
    confidence: 86,
    ...overrides[timeframe],
  });
  return {
    source: 'ninjatrader_ohlc',
    authority: 'ohlc_facts_only',
    boundary: 'evidence_only_not_approval_or_execution_authority',
    timeframes: {
      '5M': buildEvidence('5M'),
      '15M': buildEvidence('15M'),
      '60M': buildEvidence('60M'),
      '120M': buildEvidence('120M'),
      '240M': buildEvidence('240M'),
    },
    notes: ['Test fixture active timeframe MSS evidence.'],
    approvesExecution: false,
    changesTradeLogic: false,
  };
}

function bullishTurtleSoupContext(): ChartContext {
  const context = structuredContext();
  return {
    ...context,
    keyLevels: {
      ...context.keyLevels,
      currentPrice: 7397,
      activeSwingLow: 7394,
      activeSwingHigh: 7402,
    },
    marketStructure: {
      ...context.marketStructure!,
      trend: 'unknown',
      marketStructureShift: false,
      expansionCondition: false,
    },
    candleFacts: {
      ...context.candleFacts!,
      lastClosedCandleDirection: 'bullish',
      expansionCandlePresent: false,
      rejectionWickPresent: true,
      reclaimCandlePresent: true,
      closeAboveKeyLevel: true,
      closeBelowKeyLevel: false,
    },
    candles: [
      {
        index: 0,
        timestamp: '09:45',
        open: 7396.5,
        high: 7397,
        low: 7394,
        close: 7396.25,
        direction: 'bullish',
        isRejection: true,
        confidence: 'High',
      },
      {
        index: 1,
        timestamp: '09:50',
        open: 7396.25,
        high: 7398,
        low: 7396,
        close: 7397,
        direction: 'bullish',
        isReclaim: true,
        confidence: 'High',
      },
    ],
    fvgZones: [],
    displacementCandles: [],
    liquidityEvents: [{
      type: 'sweep',
      direction: 'LONG',
      level: 7396,
      sweptLevelLabel: 'prior swing low',
      reclaimed: true,
      timestamp: '09:45',
      confidence: 'High',
      evidence: 'Prior swing low was raided and reclaimed.',
    }],
    liquiditySweeps: [{
      type: 'sweep',
      direction: 'LONG',
      level: 7396,
      sweptLevelLabel: 'prior swing low',
      reclaimed: true,
      timestamp: '09:45',
      confidence: 'High',
      evidence: 'Prior swing low was raided and reclaimed.',
    }],
    reclaimEvents: [{
      direction: 'LONG',
      reclaimedLevel: 7396,
      levelLabel: 'prior swing low',
      timestamp: '09:50',
      candleIndex: 1,
      confidence: 'High',
      evidence: 'Close reclaimed back above the swept low.',
    }],
    failedBreakEvents: [{
      direction: 'LONG',
      failedLevel: 7396,
      levelLabel: 'prior swing low',
      sweptExtreme: 7394,
      timestamp: '09:45',
      candleIndex: 0,
      confidence: 'High',
      evidence: 'Failed to continue below the raided low.',
    }],
    targetObjectives: [{
      label: 'Opposing buy-side liquidity',
      price: 7404,
      direction: 'LONG',
      source: 'app',
      type: 'liquidity_pool',
      confidence: 'High',
      score: 90,
      reason: 'Next buy-side liquidity above reclaim.',
    }],
    setupReadyFacts: {
      sweepThenReclaim: true,
      breakOfStructure: false,
      pullbackIntoFvg: false,
      fvgReclaimed: false,
    },
    setupEvidence: {},
    proposedEntry: 7397,
    proposedStop: 7393.75,
    riskPoints: 3.25,
  };
}

function bearishTurtleSoupContext(): ChartContext {
  const context = bullishTurtleSoupContext();
  return {
    ...context,
    keyLevels: {
      ...context.keyLevels,
      currentPrice: 7403,
      activeSwingHigh: 7406,
      activeSwingLow: 7398,
    },
    candleFacts: {
      ...context.candleFacts!,
      lastClosedCandleDirection: 'bearish',
      closeAboveKeyLevel: false,
      closeBelowKeyLevel: true,
    },
    candles: [
      {
        index: 0,
        timestamp: '09:45',
        open: 7403.5,
        high: 7406,
        low: 7403,
        close: 7403.75,
        direction: 'bearish',
        isRejection: true,
        confidence: 'High',
      },
      {
        index: 1,
        timestamp: '09:50',
        open: 7403.75,
        high: 7404,
        low: 7402,
        close: 7403,
        direction: 'bearish',
        isReclaim: true,
        confidence: 'High',
      },
    ],
    liquidityEvents: [{
      type: 'sweep',
      direction: 'SHORT',
      level: 7404,
      sweptLevelLabel: 'prior swing high',
      reclaimed: true,
      timestamp: '09:45',
      confidence: 'High',
      evidence: 'Prior swing high was raided and reclaimed.',
    }],
    liquiditySweeps: [{
      type: 'sweep',
      direction: 'SHORT',
      level: 7404,
      sweptLevelLabel: 'prior swing high',
      reclaimed: true,
      timestamp: '09:45',
      confidence: 'High',
      evidence: 'Prior swing high was raided and reclaimed.',
    }],
    reclaimEvents: [{
      direction: 'SHORT',
      reclaimedLevel: 7404,
      levelLabel: 'prior swing high',
      timestamp: '09:50',
      candleIndex: 1,
      confidence: 'High',
      evidence: 'Close reclaimed back below the swept high.',
    }],
    failedBreakEvents: [{
      direction: 'SHORT',
      failedLevel: 7404,
      levelLabel: 'prior swing high',
      sweptExtreme: 7406,
      timestamp: '09:45',
      candleIndex: 0,
      confidence: 'High',
      evidence: 'Failed to continue above the raided high.',
    }],
    targetObjectives: [{
      label: 'Opposing sell-side liquidity',
      price: 7396,
      direction: 'SHORT',
      source: 'app',
      type: 'liquidity_pool',
      confidence: 'High',
      score: 90,
      reason: 'Next sell-side liquidity below reclaim.',
    }],
    timeframeMssEvidence: timeframeMssEvidenceLayer('bearish'),
    proposedEntry: 7403,
    proposedStop: 7406.25,
    riskPoints: 3.25,
  };
}

function withBigPictureStructure(context: ChartContext, alignedDirection: 'LONG' | 'SHORT'): ChartContext {
  return {
    ...context,
    multiTimeframeContext: {
      source: 'ninjatrader_bridge',
      authority: 'ohlc_facts_only',
      fourHour: { trend: alignedDirection === 'LONG' ? 'bullish' : 'bearish' },
      oneHour: { trend: alignedDirection === 'LONG' ? 'bullish' : 'bearish' },
      fifteenMinute: { trend: alignedDirection === 'LONG' ? 'bullish' : 'bearish' },
      fiveMinute: { trend: alignedDirection === 'LONG' ? 'bullish' : 'bearish' },
      alignment: {
        macroBias: alignedDirection,
        sessionBias: alignedDirection,
        liquidityBias: alignedDirection,
        executionBias: alignedDirection,
        alignedDirection,
        conflicts: [],
        notes: [`Big-picture structure aligned ${alignedDirection}.`],
      },
      targetMap: { levelsToWatch: [] },
      rules: {
        higherTimeframesApproveTrades: false,
        fiveMinuteExecutionRequired: true,
        aiMayOverwriteOhlcFacts: false,
      },
      notes: [],
    } as ChartContext['multiTimeframeContext'],
  };
}

function sufficientHtfCoverageRows() {
  return [
    { timeframe: '4H' as const, barsLoaded: 180, rangeStart: '2026-05-01T00:00:00-04:00', rangeEnd: '2026-06-01T10:00:00-04:00', minimumExpectedDescription: '30 calendar days when available.', minimumSatisfied: true, status: 'sufficient' as const },
    { timeframe: '2H' as const, barsLoaded: 360, rangeStart: '2026-05-01T00:00:00-04:00', rangeEnd: '2026-06-01T10:00:00-04:00', minimumExpectedDescription: '30 calendar days when available.', minimumSatisfied: true, status: 'sufficient' as const },
    { timeframe: '1H' as const, barsLoaded: 720, rangeStart: '2026-05-01T00:00:00-04:00', rangeEnd: '2026-06-01T10:00:00-04:00', minimumExpectedDescription: '30 calendar days when available.', minimumSatisfied: true, status: 'sufficient' as const },
    { timeframe: '15M' as const, barsLoaded: 2880, rangeStart: '2026-05-01T00:00:00-04:00', rangeEnd: '2026-06-01T10:00:00-04:00', minimumExpectedDescription: '30 calendar days when available.', minimumSatisfied: true, status: 'sufficient' as const },
    { timeframe: '5M' as const, barsLoaded: 8640, rangeStart: '2026-05-01T00:00:00-04:00', rangeEnd: '2026-06-01T10:00:00-04:00', minimumExpectedDescription: '30 calendar days when available; active setup-scan window remains the execution trigger authority.', minimumSatisfied: true, status: 'sufficient' as const },
  ];
}

function sufficientHtfContextFields() {
  const timeframeCoverage = sufficientHtfCoverageRows();
  return {
    htfContextSufficiency: {
      overallStatus: 'sufficient' as const,
      timeframeCoverage,
      dataLimited: false,
      blockers: [],
      notes: ['HTF context sufficient: 4H/2H/1H/15M/5M minimum structured lookback met.'],
    },
    htfContextDataLimited: false,
    timeframeCoverage,
    classificationReliability: 'structural' as const,
    classificationReason: 'Fixture full 30-day HTF context is sufficient.',
  };
}

function dataLimitedHtfContextFields() {
  const timeframeCoverage = sufficientHtfCoverageRows().map((coverage) =>
    coverage.timeframe === '5M'
      ? {
          ...coverage,
          barsLoaded: 24,
          rangeStart: '2026-06-05T10:00:00-04:00',
          rangeEnd: '2026-06-05T11:55:00-04:00',
          minimumSatisfied: false,
          status: 'data_limited' as const,
          blocker: 'insufficient HTF context: 5M loaded 24 bars from 2026-06-05T10:00:00-04:00 to 2026-06-05T11:55:00-04:00; minimum expected: 30 calendar days when available; active setup-scan window remains the execution trigger authority.',
        }
      : coverage
  );
  const blockers = timeframeCoverage.flatMap((coverage) => 'blocker' in coverage && coverage.blocker ? [coverage.blocker] : []);
  return {
    htfContextSufficiency: {
      overallStatus: 'data_limited' as const,
      timeframeCoverage,
      dataLimited: true,
      blockers,
      notes: ['HTF context data-limited. Do not treat missing HTF draw or thin-history conflict as structural proof.'],
    },
    htfContextDataLimited: true,
    timeframeCoverage,
    classificationReliability: 'data_limited' as const,
    classificationReason: 'Fixture HTF context is data-limited.',
  };
}

function htfMssContext(direction: 'LONG' | 'SHORT', overrides: Partial<ChartContext> = {}): ChartContext {
  const bullish = direction === 'LONG';
  const context = structuredContext();
  return {
    ...context,
    sessionType: 'morning',
    chartTimestamp: '2026-06-01T10:35:00-04:00',
    marketContext: 'HTF draw continuation after raid/reclaim fixture.',
    keyLevels: {
      ...context.keyLevels,
      currentPrice: bullish ? 7604 : 7600,
      activeSwingLow: bullish ? 7580 : 7596,
      activeSwingHigh: bullish ? 7606 : 7624,
      previousDayHigh: bullish ? 7624 : context.keyLevels.previousDayHigh,
      previousDayLow: bullish ? context.keyLevels.previousDayLow : 7580,
      overnightHigh: bullish ? 7632.75 : context.keyLevels.overnightHigh,
      overnightLow: bullish ? context.keyLevels.overnightLow : 7576,
    },
    marketStructure: {
      trend: bullish ? 'bullish' : 'bearish',
      higherHigh: bullish,
      higherLow: bullish,
      lowerHigh: !bullish,
      lowerLow: !bullish,
      marketStructureShift: false,
      chopRangeCondition: false,
      compressionCondition: false,
      expansionCondition: false,
    },
    candleFacts: {
      lastClosedCandleDirection: bullish ? 'bullish' : 'bearish',
      expansionCandlePresent: false,
      rejectionWickPresent: false,
      breatherCandlePresent: false,
      reclaimCandlePresent: false,
      pullbackPresent: false,
      closeAboveKeyLevel: bullish,
      closeBelowKeyLevel: !bullish,
    },
    fvgZones: [],
    liquidityEvents: [],
    liquiditySweeps: [],
    reclaimEvents: [],
    failedBreakEvents: [],
    displacementCandles: [],
    setupReadyFacts: {
      sweepThenReclaim: false,
      breakOfStructure: false,
      pullbackIntoFvg: false,
      fvgReclaimed: false,
    },
    setupEvidence: {},
    proposedEntry: bullish ? 7604 : 7600,
    proposedStop: bullish ? 7600 : 7604,
    riskPoints: 4,
    riskStatus: 'WithinLimit',
    entryConfirmed: false,
    stopConfirmed: false,
    targetObjectives: [{
      label: bullish ? 'Prior RTH high / full ETH high' : 'Prior RTH low / full ETH low',
      price: bullish ? 7624 : 7580,
      direction,
      source: 'app',
      type: 'liquidity_pool',
      confidence: 'High',
      score: 92,
      reason: 'External liquidity draw target.',
    }],
    htfLiquidityDrawState: {
      source: 'ninjatrader_ohlc',
      authority: 'ohlc_facts_only',
      boundary: 'context_only_not_execution_authority',
      drawDirection: bullish ? 'buy_side' : 'sell_side',
      macroContext: bullish ? 'bullish' : 'bearish',
      raidState: bullish ? 'sell_side_raid' : 'buy_side_raid',
      liquidityRaidState: bullish ? 'sell_side_raid' : 'buy_side_raid',
      reclaimStatus: 'confirmed',
      externalLiquidityTarget: bullish ? 'full ETH high' : 'full ETH low',
      classification: 'MSS_TRIGGER_CONFIRMED',
      htfDrawContinuationPending: true,
      confidence: 86,
      notes: ['HTF draw continuation fixture.'],
      blockers: ['Execution still requires deterministic app gates.'],
      createsTradingPlanCandidate: false,
      approvesExecution: false,
      fiveMinuteMssTriggerConfirmed: true,
      fiveMinuteMssConfirmationType: 'swing_break_with_displacement',
      postShiftState: 'post_mss_digestion',
      fifteenMinuteConfirmationStatus: 'potential_mss',
      activeScanWindow: 'MORNING_SETUP_SCAN',
      fiveMinuteState: {
        timeframe: '5M',
        direction: bullish ? 'bullish' : 'bearish',
        status: 'confirmed',
        lifecycleState: 'confirmed_mss',
        evidence: [
          bullish
            ? 'Confirmed close above prior 5M swing high 7602 with displacement.'
            : 'Confirmed close below prior 5M swing low 7602 with displacement.',
        ],
        confirmationLevel: bullish ? 7602 : 7602,
        invalidationLevel: bullish ? 7580 : 7624,
        externalLiquidityTarget: bullish ? 'prior RTH high / full ETH high' : 'prior RTH low / full ETH low',
        confidence: 90,
      },
      timeframeStates: [
        {
          timeframe: '4H',
          direction: bullish ? 'bullish' : 'bearish',
          status: 'confirmed',
          lifecycleState: 'confirmed_mss',
          evidence: ['4H draw supports the direction.'],
          externalLiquidityTarget: bullish ? 'full ETH high' : 'full ETH low',
          confidence: 82,
        },
        {
          timeframe: '2H',
          direction: bullish ? 'bullish' : 'bearish',
          status: 'confirmed',
          lifecycleState: 'confirmed_mss',
          evidence: ['2H structure supports the direction.'],
          externalLiquidityTarget: bullish ? 'full ETH high' : 'full ETH low',
          confidence: 82,
        },
        {
          timeframe: '1H',
          direction: bullish ? 'bullish' : 'bearish',
          status: 'confirmed',
          lifecycleState: 'confirmed_mss',
          evidence: ['1H structure supports the direction.'],
          externalLiquidityTarget: bullish ? 'prior RTH high' : 'prior RTH low',
          confidence: 82,
        },
        {
          timeframe: '15M',
          direction: bullish ? 'bullish' : 'bearish',
          status: 'potential_mss',
          lifecycleState: 'potential_mss',
          evidence: ['15M raid/reclaim is potential but aligned.'],
          externalLiquidityTarget: bullish ? 'prior RTH high' : 'prior RTH low',
          confidence: 70,
        },
        {
          timeframe: '5M',
          direction: bullish ? 'bullish' : 'bearish',
          status: 'confirmed',
          lifecycleState: 'confirmed_mss',
          evidence: [
            bullish
              ? 'Confirmed close above prior 5M swing high 7602 with displacement.'
              : 'Confirmed close below prior 5M swing low 7602 with displacement.',
          ],
          confirmationLevel: 7602,
          invalidationLevel: bullish ? 7580 : 7624,
          externalLiquidityTarget: bullish ? 'prior RTH high / full ETH high' : 'prior RTH low / full ETH low',
          confidence: 90,
        },
      ],
      timeframeStack: [],
      ...sufficientHtfContextFields(),
    },
    timeframeMssEvidence: timeframeMssEvidenceLayer(bullish ? 'bullish' : 'bearish'),
    ...overrides,
  };
}

function htfPathwayCandidate(result: ReturnType<typeof scanSetupCandidates>) {
  return result.candidates.find((candidate) =>
    candidate.pathway === 'htf_liquidity_draw_mss' &&
    candidate.detectedStatus !== SetupCandidateStatus.NotDetected
  ) || null;
}

function htfDisplacementContinuationContext(
  direction: 'LONG' | 'SHORT',
  overrides: Partial<ChartContext> = {}
): ChartContext {
  const bullish = direction === 'LONG';
  const entry = bullish ? 7603.25 : 7582.75;
  const stop = bullish ? 7599 : 7590;
  const target = bullish ? 7620 : 7574.75;
  const context = structuredContext();
  const displacement = {
    direction,
    candleIndex: 0,
    timestamp: bullish ? '2026-06-02T10:00:00-04:00' : '2026-06-03T09:45:00-04:00',
    open: bullish ? 7590 : 7608.5,
    high: bullish ? 7605 : 7614.75,
    low: bullish ? 7588 : 7591.75,
    close: bullish ? 7604 : 7592.75,
    bodyPoints: bullish ? 14 : 15.75,
    rangePoints: bullish ? 17 : 23,
    bodyToRange: bullish ? 0.82 : 0.68,
    closeLocation: bullish ? 'top_quarter' as const : 'bottom_quarter' as const,
    displacementScore: 88,
    quality: 'high_quality' as const,
    leavesImbalance: true,
    breaksStructure: true,
    confidence: 'High' as const,
    evidence: bullish ? '15M bullish displacement after sell-side raid.' : '15M bearish displacement after failed buy-side hold.',
  };
  const fiveMinuteDisplacement = {
    ...displacement,
    candleIndex: 1,
    timestamp: bullish ? '2026-06-02T10:00:00-04:00' : '2026-06-03T11:25:00-04:00',
    open: bullish ? 7600 : 7588,
    high: bullish ? 7605 : 7589.25,
    low: bullish ? 7599 : 7580.5,
    close: entry,
    bodyPoints: bullish ? 3.25 : 5.25,
    rangePoints: bullish ? 6 : 8.75,
    evidence: bullish ? '5M bullish MSS close-through with displacement.' : '5M bearish MSS close-through with displacement.',
  };

  return {
    ...context,
    sessionType: 'morning',
    chartTimestamp: bullish ? '2026-06-02T10:05:00-04:00' : '2026-06-03T11:25:00-04:00',
    marketContext: 'HTF displacement + 5M MSS continuation fixture.',
    keyLevels: {
      ...context.keyLevels,
      currentPrice: entry,
      activeSwingLow: bullish ? 7599 : 7574.75,
      activeSwingHigh: bullish ? 7620 : 7590,
      overnightHigh: bullish ? 7632.75 : 7614.75,
      overnightLow: bullish ? 7590 : 7574,
      nearestSupport: bullish ? 7599 : 7574.75,
      nearestResistance: bullish ? 7620 : 7590,
    },
    marketStructure: {
      trend: bullish ? 'bullish' : 'bearish',
      higherHigh: bullish,
      higherLow: bullish,
      lowerHigh: !bullish,
      lowerLow: !bullish,
      marketStructureShift: true,
      chopRangeCondition: false,
      compressionCondition: false,
      expansionCondition: true,
    },
    candleFacts: {
      lastClosedCandleDirection: bullish ? 'bullish' : 'bearish',
      expansionCandlePresent: true,
      rejectionWickPresent: false,
      breatherCandlePresent: false,
      reclaimCandlePresent: false,
      pullbackPresent: false,
      closeAboveKeyLevel: bullish,
      closeBelowKeyLevel: !bullish,
    },
    candles: [
      {
        index: 1,
        timestamp: bullish ? '2026-06-02T10:00:00-04:00' : '2026-06-03T11:25:00-04:00',
        open: fiveMinuteDisplacement.open,
        high: fiveMinuteDisplacement.high,
        low: fiveMinuteDisplacement.low,
        close: fiveMinuteDisplacement.close,
        direction: bullish ? 'bullish' : 'bearish',
        bodyQuality: 'large',
        upperWickQuality: bullish ? 'small' : 'large',
        lowerWickQuality: bullish ? 'large' : 'small',
        isExpansion: true,
        confidence: 'High',
      },
      {
        index: 2,
        timestamp: bullish ? '2026-06-02T10:05:00-04:00' : '2026-06-03T11:30:00-04:00',
        open: entry,
        high: bullish ? entry + 1.5 : entry + 0.25,
        low: bullish ? entry - 0.25 : entry - 3,
        close: bullish ? entry + 1 : entry - 1.5,
        direction: bullish ? 'bullish' : 'bearish',
        bodyQuality: 'large',
        upperWickQuality: bullish ? 'small' : 'large',
        lowerWickQuality: bullish ? 'large' : 'small',
        isExpansion: true,
        confidence: 'High',
      },
    ],
    setupReadyFacts: {
      sweepThenReclaim: true,
      breakOfStructure: true,
      pullbackIntoFvg: true,
      fvgReclaimed: true,
    },
    structureQualityContext: {
      direction,
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
      reasons: ['5M MSS confirmed by completed candle close.'],
      missingReasons: [],
    },
    fvgZones: [{
      direction,
      upper: bullish ? 7603.5 : 7589,
      lower: bullish ? 7600.5 : 7584,
      impulseQualified: true,
      confidence: 'High',
    }],
    displacementCandles: [fiveMinuteDisplacement],
    multiTimeframeContext: {
      source: 'ninjatrader_bridge',
      authority: 'ohlc_facts_only',
      fourHour: { trend: bullish ? 'bullish' : 'bearish', displacementCandles: [], confidence: 'High', notes: [] },
      twoHour: { trend: bullish ? 'bullish' : 'bearish', displacementCandles: [], confidence: 'High', notes: [] },
      oneHour: { trend: bullish ? 'bullish' : 'bearish', displacementCandles: [], confidence: 'High', notes: [] },
      fifteenMinute: { trend: bullish ? 'bullish' : 'bearish', displacementCandles: [displacement], confidence: 'High', notes: [] },
      fiveMinute: { trend: bullish ? 'bullish' : 'bearish', displacementCandles: [fiveMinuteDisplacement], confidence: 'High', notes: [] },
      alignment: {
        macroBias: direction,
        sessionBias: direction,
        liquidityBias: direction,
        executionBias: direction,
        alignedDirection: direction,
        conflicts: [],
        notes: [`HTF displacement continuation aligned ${direction}.`],
      },
      targetMap: { levelsToWatch: [] },
      rules: {
        higherTimeframesApproveTrades: false,
        fiveMinuteExecutionRequired: true,
        aiMayOverwriteOhlcFacts: false,
      },
      notes: [],
    } as ChartContext['multiTimeframeContext'],
    htfLiquidityDrawState: {
      source: 'ninjatrader_ohlc',
      authority: 'ohlc_facts_only',
      boundary: 'context_only_not_execution_authority',
      drawDirection: bullish ? 'buy_side' : 'sell_side',
      planDirection: direction,
      macroContext: bullish ? 'bullish' : 'bearish',
      raidState: 'none',
      liquidityRaidState: 'none',
      reclaimStatus: 'confirmed',
      externalLiquidityTarget: bullish ? 'External buy-side liquidity' : 'External sell-side liquidity',
      classification: 'MSS_TRIGGER_CONFIRMED',
      htfDrawContinuationPending: true,
      confidence: 86,
      notes: ['HTF displacement continuation fixture.'],
      blockers: [],
      createsTradingPlanCandidate: false,
      approvesExecution: false,
      fiveMinuteMssTriggerConfirmed: true,
      fiveMinuteMssConfirmationType: 'swing_break_with_displacement',
      postShiftState: 'post_mss_digestion',
      fifteenMinuteConfirmationStatus: 'confirmed',
      activeScanWindow: 'MORNING_SETUP_SCAN',
      fiveMinuteState: {
        timeframe: '5M',
        direction: bullish ? 'bullish' : 'bearish',
        status: 'confirmed',
        lifecycleState: 'confirmed_mss',
        evidence: ['5M MSS confirmed by completed candle close with displacement.'],
        confirmationLevel: entry,
        invalidationLevel: stop,
        externalLiquidityTarget: bullish ? 'External buy-side liquidity' : 'External sell-side liquidity',
        confidence: 88,
      },
      timeframeStates: [
        { timeframe: '4H', direction: bullish ? 'bullish' : 'bearish', status: 'confirmed', lifecycleState: 'confirmed_mss', evidence: ['4H structure supports continuation.'], externalLiquidityTarget: bullish ? 'External buy-side liquidity' : 'External sell-side liquidity', confidence: 82 },
        { timeframe: '2H', direction: bullish ? 'bullish' : 'bearish', status: 'confirmed', lifecycleState: 'confirmed_mss', evidence: ['2H structure supports continuation.'], externalLiquidityTarget: bullish ? 'External buy-side liquidity' : 'External sell-side liquidity', confidence: 82 },
        { timeframe: '1H', direction: bullish ? 'bullish' : 'bearish', status: 'confirmed', lifecycleState: 'confirmed_mss', evidence: ['1H structure supports continuation.'], externalLiquidityTarget: bullish ? 'External buy-side liquidity' : 'External sell-side liquidity', confidence: 82 },
        { timeframe: '15M', direction: bullish ? 'bullish' : 'bearish', status: 'confirmed', lifecycleState: 'confirmed_mss', evidence: ['15M displacement supports continuation.'], externalLiquidityTarget: bullish ? 'External buy-side liquidity' : 'External sell-side liquidity', confidence: 84 },
        { timeframe: '5M', direction: bullish ? 'bullish' : 'bearish', status: 'confirmed', lifecycleState: 'confirmed_mss', evidence: ['5M MSS confirmed by completed candle close with displacement.'], confirmationLevel: entry, invalidationLevel: stop, externalLiquidityTarget: bullish ? 'External buy-side liquidity' : 'External sell-side liquidity', confidence: 88 },
      ],
      timeframeStack: [],
      ...sufficientHtfContextFields(),
    },
    higherTimeframeThesis: {
      direction,
      confidence: 'High',
      sourceTimeframes: ['15M', '5M'],
      reason: bullish ? 'Bullish delivery toward external buy-side liquidity.' : 'Bearish delivery toward external sell-side liquidity.',
      drawOnLiquidity: target,
      drawOnLiquidityLabel: bullish ? 'External buy-side liquidity' : 'External sell-side liquidity',
    },
    targetObjectives: [{
      label: bullish ? 'External buy-side liquidity' : 'External sell-side liquidity',
      price: target,
      direction,
      source: 'app',
      type: 'liquidity_pool',
      confidence: 'High',
      score: 95,
      reason: 'Primary external liquidity objective.',
    }],
    proposedEntry: entry,
    proposedStop: stop,
    riskPoints: Math.abs(entry - stop),
    riskStatus: Math.abs(entry - stop) > 4 ? 'RiskTooWide' : 'WithinLimit',
    entryConfirmed: true,
    stopConfirmed: true,
    requiresManualConfirmation: false,
    riskReadConfidence: 'High',
    timeframeMssEvidence: timeframeMssEvidenceLayer(bullish ? 'bullish' : 'bearish'),
    ...overrides,
  };
}

function failedPlanReversalContext(
  direction: 'LONG' | 'SHORT' = 'SHORT',
  overrides: Partial<ChartContext> = {}
): ChartContext {
  const base = htfDisplacementContinuationContext(direction);
  const originalPlanDirection = direction === 'SHORT' ? 'LONG' : 'SHORT';
  const failedDecisionLevel = direction === 'SHORT' ? 7518 : 7604.75;
  return {
    ...base,
    setupReadyFacts: {
      ...base.setupReadyFacts!,
      breakOfStructure: true,
    },
    failedPlanReversal: {
      source: 'ninjatrader_ohlc',
      boundary: 'opposite_side_review_only_not_execution_authority',
      originalPlanDirection,
      oppositeDirection: direction,
      failedDecisionLevel,
      failedDecisionLevelRole: direction === 'SHORT' ? 'short_side_resistance' : 'long_side_support',
      failedPlanEvidence: [
        `App-owned ${originalPlanDirection} plan failed decision level ${failedDecisionLevel}.`,
      ],
      htfStackStatus: 'full_confirmation',
      timeframeConfirmations: [
        { timeframe: '5M', direction, status: 'confirmed', evidence: ['Fresh 5M opposite-side MSS confirmed by completed close.'] },
        { timeframe: '15M', direction, status: 'confirmed', evidence: ['15M opposite displacement/MSS confirmed.'] },
        { timeframe: '1H', direction, status: 'confirmed', evidence: ['1H opposite structure confirms.'] },
        { timeframe: '2H', direction, status: 'confirmed', evidence: ['2H opposite structure confirms.'] },
        { timeframe: '4H', direction, status: 'confirmed', evidence: ['4H opposite structure confirms.'] },
      ],
      fiveMinuteTriggerStatus: 'confirmed',
      decisionState: direction === 'SHORT'
        ? 'FAILED_LONG_TO_BEARISH_MSS_CONFIRMED'
        : 'FAILED_SHORT_TO_BULLISH_MSS_CONFIRMED',
      freshTriggerRequired: true,
      staleOrNoFreshEntry: false,
      reasons: [
        '15M, 1H, 2H, and 4H confirm the opposite side after the original app-owned plan failed.',
      ],
      blockers: [],
      createsCandidate: true,
      approvesExecution: false,
    },
    ...overrides,
  };
}

function isPrimarySetupCandidate(candidate: { setupType: SetupType }) {
  return (
    candidate.setupType === SetupType.SweepMssFvgRetrace ||
    candidate.setupType === SetupType.TurtleSoup ||
    candidate.setupType === SetupType.HtfDrawContinuationAfterRaid ||
    candidate.setupType === SetupType.HtfDisplacementMssContinuation ||
    candidate.setupType === SetupType.HtfDisplacementFvgContinuation ||
    candidate.setupType === SetupType.OpeningDriveFvgContinuation ||
    candidate.setupType === SetupType.IntradayMssMicroContinuation ||
    candidate.setupType === SetupType.FailedPlanReversal
  );
}

const tests: Array<[string, () => void]> = [
  ['Phase G computeZoneOverlap returns valid overlap for intersecting zones', () => {
    assert.deepEqual(computeZoneOverlap(7398, 7401, 7400, 7402), {
      valid: true,
      low: 7400,
      high: 7401,
    });
  }],

  ['Phase G computeZoneOverlap rejects non-overlapping zones', () => {
    assert.deepEqual(computeZoneOverlap(7398, 7399, 7400, 7401), {
      valid: false,
      low: null,
      high: null,
    });
  }],

  ['Phase G computeZoneOverlap normalizes reversed bounds', () => {
    assert.deepEqual(computeZoneOverlap(7401, 7398, 7400.5, 7399), {
      valid: true,
      low: 7399,
      high: 7400.5,
    });
  }],

  ['structured ChartContext includes required level fields', () => {
    const context = structuredContext();
    assert.equal(typeof context.keyLevels.currentPrice, 'number');
    assert.equal(typeof context.keyLevels.priorDayHigh, 'number');
    assert.equal(typeof context.keyLevels.priorDayLow, 'number');
    assert.equal(typeof context.keyLevels.overnightHigh, 'number');
    assert.equal(typeof context.keyLevels.overnightLow, 'number');
    assert.equal(typeof context.keyLevels.rthOpen, 'number');
    assert.equal(typeof context.keyLevels.nearestSupport, 'number');
    assert.equal(typeof context.keyLevels.nearestResistance, 'number');
    assert.equal(typeof context.keyLevels.activeSwingHigh, 'number');
    assert.equal(typeof context.keyLevels.activeSwingLow, 'number');
  }],

  ['structured ChartContext includes required structure fields', () => {
    const structure = structuredContext().marketStructure;
    assert.ok(structure);
    assert.equal(structure.trend, 'bullish');
    assert.equal(typeof structure.higherHigh, 'boolean');
    assert.equal(typeof structure.higherLow, 'boolean');
    assert.equal(typeof structure.lowerHigh, 'boolean');
    assert.equal(typeof structure.lowerLow, 'boolean');
    assert.equal(typeof structure.marketStructureShift, 'boolean');
    assert.equal(typeof structure.chopRangeCondition, 'boolean');
    assert.equal(typeof structure.compressionCondition, 'boolean');
    assert.equal(typeof structure.expansionCondition, 'boolean');
  }],

  ['structured ChartContext includes required candle facts', () => {
    const candles = structuredContext().candleFacts;
    assert.ok(candles);
    assert.equal(candles.lastClosedCandleDirection, 'bullish');
    assert.equal(typeof candles.expansionCandlePresent, 'boolean');
    assert.equal(typeof candles.rejectionWickPresent, 'boolean');
    assert.equal(typeof candles.breatherCandlePresent, 'boolean');
    assert.equal(typeof candles.reclaimCandlePresent, 'boolean');
    assert.equal(typeof candles.pullbackPresent, 'boolean');
    assert.equal(typeof candles.closeAboveKeyLevel, 'boolean');
    assert.equal(typeof candles.closeBelowKeyLevel, 'boolean');
  }],

  ['structured ChartContext includes risk/execution and confidence fields', () => {
    const context = structuredContext();
    assert.equal(context.proposedEntry, 7400);
    assert.equal(context.proposedStop, 7396);
    assert.equal(context.riskPoints, 4);
    assert.equal(context.riskStatus, 'WithinLimit');
    assert.equal(context.entryConfirmed, true);
    assert.equal(context.stopConfirmed, true);
    assert.equal(context.requiresManualConfirmation, false);
    assert.equal(context.structureReadConfidence, 'High');
    assert.equal(context.riskReadConfidence, 'High');
    assert.equal(context.entryStopConfidence, 'High');
  }],

  ['structured ChartContext includes setup evidence fields', () => {
    const evidence = structuredContext().setupEvidence;
    assert.ok(evidence?.liquiditySweep);
    assert.equal(evidence.liquiditySweep.detected, true);
    assert.equal(evidence.liquiditySweep.direction, 'LONG');
    assert.equal(evidence.liquiditySweep.confidence, 'High');
  }],

  ['structured ChartContext includes richer candle swing FVG liquidity gap and level facts', () => {
    const context = structuredContext();
    assert.equal(context.candles?.[0].direction, 'bullish');
    assert.equal(context.swings?.[0].type, 'low');
    assert.equal(context.fvgZones?.[0].direction, 'LONG');
    assert.equal(context.fvgZones?.[0].reclaimed, true);
    assert.equal(context.liquidityEvents?.[0].type, 'sweep');
    assert.equal(context.liquiditySweeps?.[0].type, 'sweep');
    assert.equal(context.reclaimEvents?.[0].direction, 'LONG');
    assert.equal(context.failedBreakEvents?.[0].direction, 'LONG');
    assert.equal(context.displacementCandles?.[0].direction, 'LONG');
    assert.equal(context.setupReadyFacts?.pullbackIntoFvg, true);
    assert.equal(context.setupReadyFacts?.fvgReclaimed, true);
    assert.equal(context.setupReadyFacts?.breakOfStructure, true);
    assert.equal(context.setupReadyFacts?.sweepThenReclaim, true);
    assert.equal(context.gapContext?.gapPresent, false);
    assert.equal(context.compressionRange?.present, false);
    assert.equal(context.extractedLevels?.[0].role, 'support');
  }],

  ['scanner creates active candidates only from primary model registry entries', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('Neutral baseline with no obvious setup.'),
    });
    const primary = getPrimarySetupRegistry('replay_morning');
    const supporting = getSupportingEvidenceRegistry('replay_morning');

    assert.equal(result.candidates.length, primary.length);
    assert.deepEqual(
      new Set(getScannedSetupTypes()),
      new Set(primary.map((entry) => entry.setupType))
    );
    assert.ok(result.candidates.some((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace));
    assert.ok(result.candidates.some((candidate) => candidate.setupType === SetupType.TurtleSoup));
    for (const entry of supporting) {
      assert.ok(!result.candidates.some((candidate) => candidate.setupType === entry.setupType));
    }
    for (const entry of SETUP_REGISTRY.filter((entry) => entry.role === 'deprecated')) {
      assert.ok(!result.candidates.some((candidate) => candidate.setupType === entry.setupType));
    }
  }],

  ['deprecated setup text does not create an active candidate', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('Momentum runaway long with vertical expansion and impulse continuation.', 7400, 7390),
    });
    const momentum = result.candidates.find((candidate) => candidate.setupType === SetupType.MomentumRunaway);

    assert.equal(momentum, undefined);
    assert.ok(result.candidates.every((candidate) => isPrimarySetupCandidate(candidate)));
  }],

  ['supporting evidence text contributes to the primary model without creating support candidates', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('Liquidity sweep long plus FVG pullback into imbalance after a breather reclaim.', 7400, 7390),
    });

    const primary = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);
    const fvgPullback = result.candidates.find((candidate) => candidate.setupType === SetupType.FvgImbalancePullback);
    const breather = result.candidates.find((candidate) => candidate.setupType === SetupType.MomentumPullbackBreatherReclaim);

    assert.equal(result.candidates.length, getPrimarySetupRegistry('replay_morning').length);
    assert.equal(primary?.executionStatus, ExecutionStatus.Conditional);
    assert.equal(fvgPullback, undefined);
    assert.equal(breather, undefined);
  }],

  ['setup detection alone does not approve a trade', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('Liquidity sweep long reclaimed the opening low with a pending trigger.', 7400, 7396),
    });
    const liquidity = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(liquidity);
    assert.equal(liquidity.detectedStatus, SetupCandidateStatus.Possible);
    assert.notEqual(liquidity.executionStatus, ExecutionStatus.Executable);
    assert.equal(liquidity.executionStatus, ExecutionStatus.Conditional);
  }],

  ['primary model remains conditional from narrative-only supporting evidence', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('Liquidity sweep long reclaimed the opening low with a confirmed trigger.', 7400, 7396, 'TRIGGERED'),
    });

    assert.equal(result.bestExecutableCandidate, null);
    assert.equal(result.bestConditionalCandidate?.setupType, SetupType.SweepMssFvgRetrace);
    assert.equal(result.bestConditionalCandidate?.executionStatus, ExecutionStatus.Conditional);
    assert.equal(result.bestConditionalCandidate?.entry, 7400);
    assert.equal(result.bestConditionalCandidate?.stop, 7396);
  }],

  ['best conditional candidate is shown when no executable candidate exists', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('FVG pullback long into imbalance needs reclaim confirmation.', NaN, 7396),
    });

    assert.equal(result.bestExecutableCandidate, null);
    assert.ok(result.bestConditionalCandidate);
    assert.equal(result.bestConditionalCandidate?.executionStatus, ExecutionStatus.Conditional);
    assert.equal(result.bestConditionalCandidate?.setupType, SetupType.SweepMssFvgRetrace);
  }],

  ['no executable or conditional setup exists only when nothing is detected', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('Neutral baseline with balanced chop and no clean price-action setup.', NaN, NaN),
    });

    assert.equal(result.bestExecutableCandidate, null);
    assert.equal(result.bestConditionalCandidate, null);
    assert.ok(result.candidates.every((candidate) =>
      candidate.executionStatus === ExecutionStatus.NotDetected ||
      candidate.executionStatus === ExecutionStatus.Invalid
    ));
    assert.ok(result.candidates.every((candidate) => candidate.detectedStatus !== SetupCandidateStatus.Detected));
  }],

  ['narrative-only primary model does not become executable without full structured Model 1 evidence', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('Liquidity sweep long reclaimed the opening low with a confirmed trigger.', 7400, 7396, 'TRIGGERED'),
    });
    const best = result.bestConditionalCandidate;

    assert.ok(best);
    assert.equal(best.executionStatus, ExecutionStatus.Conditional);
    assert.equal(typeof best.entry, 'number');
    assert.equal(typeof best.stop, 'number');
    assert.equal(typeof best.target1, 'number');
    assert.equal(typeof best.target2, 'number');
    assert.ok(best.invalidation);
    assert.ok(best.requiredTrigger);
    assert.equal(best.riskPoints, 4);
  }],

  ['high-priority wide raw stop remains visible as risk advisory', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('Liquidity sweep long reclaimed after a stop hunt.', 7400, 7388),
    });
    const liquidity = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(liquidity);
    assert.equal(liquidity.detectedStatus, SetupCandidateStatus.Possible);
    assert.notEqual(liquidity.blockReason, NoTradeReason.RiskTooWide);
    assert.equal(liquidity.riskAdvisoryStatus, 'RISK_EXTENDED_STRUCTURAL');
    assert.equal(liquidity.riskPoints, 12);
    assert.notEqual(liquidity.setupType, SetupType.NoSetup);
  }],

  ['weak setup with wide structure risk still does not become approved without complete gates', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('Opening gap fill long toward prior close.', 7400, 7388),
    });
    const gapFill = result.candidates.find((candidate) => candidate.setupType === SetupType.OpeningGapFill);

    assert.equal(gapFill, undefined);
    assert.equal(result.bestExecutableCandidate, null);
  }],

  ['T1 and T2 are calculated from R and rounded to MES tick size', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('Liquidity sweep long reclaimed the opening low with a confirmed trigger.', 7400.25, 7395.25, 'TRIGGERED'),
    });
    const best = result.bestConditionalCandidate;

    assert.ok(best);
    assert.equal(best.riskPoints, 5);
    assert.equal(best.target1, 7407.75);
    assert.equal(best.target2, 7410.25);
    assert.equal((best.target1 as number) % 0.25, 0);
    assert.equal((best.target2 as number) % 0.25, 0);
  }],

  ['deprecated manual-confirmation text does not create an active candidate', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('Momentum pullback breather reclaim is possible but exact entry and stop are unclear.', NaN, NaN),
    });
    const breather = result.candidates.find((candidate) => candidate.setupType === SetupType.MomentumPullbackBreatherReclaim);

    assert.equal(breather, undefined);
    assert.ok(result.candidates.every((candidate) => isPrimarySetupCandidate(candidate)));
  }],

  ['structured chart context is preferred over narrative text matching', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      chartContext: structuredContext(),
      result: resultWithText('Neutral baseline with no obvious setup.', NaN, NaN),
    });
    const liquidity = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(liquidity);
    assert.equal(liquidity.detectedStatus, SetupCandidateStatus.Detected);
    assert.equal(liquidity.executionStatus, ExecutionStatus.Executable);
    assert.equal(liquidity.entry, 7400);
    assert.equal(liquidity.stop, 7395.75);
    assert.ok(liquidity.evidence.some((item) => item.includes('Liquidity sweep') || item.includes('liquidity sweep')));
    assert.equal(result.bestExecutableCandidate?.setupType, SetupType.SweepMssFvgRetrace);
  }],

  ['narrative cannot override structured setup direction or evidence', () => {
    const context = structuredContext();
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      chartContext: context,
      result: resultWithText('Bearish momentum runaway short rejects resistance and should sell.', 7400, 7396, 'TRIGGERED'),
    });
    const liquidity = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(liquidity);
    assert.equal(liquidity.detectedStatus, SetupCandidateStatus.Detected);
    assert.equal(liquidity.direction, 'LONG');
    assert.ok(liquidity.evidence.some((item) => item.includes('Liquidity sweep') || item.includes('liquidity sweep')));
    assert.equal(result.bestExecutableCandidate?.setupType, SetupType.SweepMssFvgRetrace);
    assert.equal(result.bestExecutableCandidate?.direction, 'LONG');
  }],

  ['narrative trade language cannot approve when structured facts are missing or low confidence', () => {
    const context = structuredContext();
    context.setupEvidence = {};
    context.fvgZones = [];
    context.liquidityEvents = [];
    context.candles = [];
    context.candleFacts = {
      lastClosedCandleDirection: 'unknown',
      expansionCandlePresent: false,
      rejectionWickPresent: false,
      breatherCandlePresent: false,
      reclaimCandlePresent: false,
      pullbackPresent: false,
      closeAboveKeyLevel: false,
      closeBelowKeyLevel: false,
    };
    context.marketStructure = {
      trend: 'unknown',
      higherHigh: false,
      higherLow: false,
      lowerHigh: false,
      lowerLow: false,
      marketStructureShift: false,
      chopRangeCondition: false,
      compressionCondition: false,
      expansionCondition: false,
    };
    context.levelReadConfidence = 'Low';
    context.entryStopConfidence = 'Low';
    context.entryConfirmed = false;
    context.stopConfirmed = false;
    context.requiresManualConfirmation = true;
    context.liquiditySweeps = [];
    context.reclaimEvents = [];
    context.failedBreakEvents = [];
    context.setupReadyFacts = {
      ...context.setupReadyFacts,
      sweepThenReclaim: false,
    };

    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      chartContext: context,
      result: resultWithText('Liquidity sweep long reclaimed the opening low with a confirmed trigger.', 7400, 7396, 'TRIGGERED'),
    });
    const liquidity = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(liquidity);
    assert.equal(liquidity.detectedStatus, SetupCandidateStatus.NotDetected);
    assert.notEqual(liquidity.executionStatus, ExecutionStatus.Executable);
    assert.equal(result.bestExecutableCandidate, null);
  }],

  ['structured FVG facts can detect FVG without narrative setup text', () => {
    const context = structuredContext();
    context.setupEvidence = {};
    context.candleFacts = {
      ...context.candleFacts!,
      pullbackPresent: true,
    };

    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      chartContext: context,
      result: resultWithText('Neutral baseline with no named setup.', NaN, NaN),
    });
    const primary = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);
    const fvg = result.candidates.find((candidate) => candidate.setupType === SetupType.FairValueGap);
    const fvgPullback = result.candidates.find((candidate) => candidate.setupType === SetupType.FvgImbalancePullback);

    assert.equal(fvg, undefined);
    assert.equal(fvgPullback, undefined);
    assert.equal(primary?.detectedStatus, SetupCandidateStatus.Detected);
    assert.equal(primary?.executionStatus, ExecutionStatus.Executable);
  }],

  ['Phase E Model 1 qualifies only with full sweep reclaim displacement MSS FVG retrace sequence', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      chartContext: structuredContext(),
      result: null,
    });
    const modelOne = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(modelOne);
    assert.equal(modelOne.detectedStatus, SetupCandidateStatus.Detected);
    assert.equal(modelOne.executionStatus, ExecutionStatus.Executable);
    assert.ok(modelOne.evidence.includes('Liquidity sweep confirmed'));
    assert.ok(modelOne.evidence.includes('Reclaim after sweep confirmed'));
    assert.ok(modelOne.evidence.includes('Displacement confirmed'));
    assert.ok(modelOne.evidence.includes('Market structure shift confirmed'));
    assert.ok(modelOne.evidence.includes('Fair value gap / imbalance entry model'));
    assert.ok(modelOne.evidence.includes('Retrace into FVG confirmed'));
    assert.ok(modelOne.evidence.includes('Minimum 2.0R available'));
  }],

  ['active timeframe MSS ruleset keeps Model 1 executable only with aligned completed 5M MSS', () => {
    const context = structuredContext();
    context.timeframeMssEvidence = timeframeMssEvidenceLayer('bullish');

    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      chartContext: context,
      result: null,
    });
    const modelOne = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(modelOne);
    assert.equal(modelOne.executionStatus, ExecutionStatus.Executable);
    assert.equal(modelOne.activeRuleset?.timeframeMss?.applied, true);
    assert.equal(modelOne.activeRuleset?.timeframeMss?.status, 'passed');
    assert.equal(modelOne.activeRuleset?.timeframeMss?.appliesToAllModels, true);
    assert.equal(result.bestExecutableCandidate?.setupType, SetupType.SweepMssFvgRetrace);
  }],

  ['active timeframe MSS ruleset demotes Model 1 when completed 5M MSS opposes candidate direction', () => {
    const context = structuredContext();
    context.timeframeMssEvidence = timeframeMssEvidenceLayer('bearish');

    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      chartContext: context,
      result: null,
    });
    const modelOne = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(modelOne);
    assert.equal(modelOne.executionStatus, ExecutionStatus.Conditional);
    assert.equal(modelOne.blockReason, NoTradeReason.EntryTriggerPending);
    assert.equal(modelOne.activeRuleset?.timeframeMss?.status, 'blocked');
    assert.equal(modelOne.activeRuleset?.timeframeMss?.affectsExecution, true);
    assert.ok(modelOne.missingEvidence.includes('Active timeframe MSS ruleset requires confirmed completed aligned 5M MSS before executable status.'));
    assert.ok(modelOne.missingEvidence.includes('Active timeframe MSS ruleset found opposing completed 5M bearish MSS.'));
    assert.equal(result.bestExecutableCandidate, null);
  }],

  ['active timeframe MSS ruleset demotes Model 1 when NinjaTrader evidence layer is missing', () => {
    const context = structuredContext();
    delete context.timeframeMssEvidence;

    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      chartContext: context,
      result: null,
    });
    const modelOne = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(modelOne);
    assert.equal(modelOne.executionStatus, ExecutionStatus.Conditional);
    assert.equal(modelOne.blockReason, NoTradeReason.MissingRequiredContext);
    assert.equal(modelOne.activeRuleset?.timeframeMss?.status, 'missing_evidence_layer');
    assert.equal(modelOne.activeRuleset?.timeframeMss?.affectsExecution, true);
    assert.ok(modelOne.missingEvidence.includes('Active timeframe MSS ruleset requires NinjaTrader OHLC timeframeMssEvidence before executable status.'));
    assert.equal(result.bestExecutableCandidate, null);
  }],

  ['active timeframe MSS ruleset demotes Model 1 when completed HTF MSS opposes candidate direction', () => {
    const context = structuredContext();
    context.timeframeMssEvidence = timeframeMssEvidenceLayer('bullish', {
      '60M': {
        direction: 'bearish',
        status: 'confirmed_mss',
        breaksStructure: true,
      },
    });

    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      chartContext: context,
      result: null,
    });
    const modelOne = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(modelOne);
    assert.equal(modelOne.executionStatus, ExecutionStatus.Conditional);
    assert.equal(modelOne.activeRuleset?.timeframeMss?.status, 'blocked');
    assert.ok(modelOne.missingEvidence.includes('Active timeframe MSS ruleset found opposing completed HTF MSS on 60M.'));
    assert.equal(result.bestExecutableCandidate, null);
  }],

  ['global HTF line-in-the-sand rule blocks long execution until completed close above named resistance', () => {
    const context = structuredContext();
    context.sessionStory = {
      segments: [],
      displacementZones: [],
      relationships: [],
      bias: 'BALANCED',
      summary: 'Test session story includes a higher-timeframe obstacle.',
      notes: [],
      targetLevels: [{
        label: '60M bearish FVG lower boundary',
        price: 7404,
        type: 'resistance',
        source: 'ninjatrader',
        directionRelevance: 'LONG',
        confidence: 'High',
        evidence: 'Nearest higher-timeframe resistance sits in front of the long target path.',
      }],
    };

    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      chartContext: context,
      result: null,
    });
    const modelOne = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(modelOne);
    assert.equal(modelOne.executionStatus, ExecutionStatus.Conditional);
    assert.equal(modelOne.blockReason, NoTradeReason.EntryTriggerPending);
    assert.equal(modelOne.activeRuleset?.htfLineInSand?.applied, true);
    assert.equal(modelOne.activeRuleset?.htfLineInSand?.status, 'blocked');
    assert.equal(modelOne.activeRuleset?.htfLineInSand?.appliesToAllModels, true);
    assert.equal(modelOne.activeRuleset?.htfLineInSand?.lineInSand, 7404);
    assert.equal(
      modelOne.activeRuleset?.htfLineInSand?.requiredClose,
      'Completed 5M or 15M close above 7404.00 required before long continuation is active.'
    );
    assert.ok(modelOne.activeRuleset?.htfLineInSand?.lineReason?.includes('60M bearish FVG lower boundary'));
    assert.ok(modelOne.missingEvidence.some((item) => item.includes('No chase: wait for a completed 5M or 15M close above 7404.00')));
    assert.equal(result.bestExecutableCandidate, null);
  }],

  ['global HTF line-in-the-sand rule blocks short execution until completed close below named support', () => {
    const context = shortModelOneContext();
    context.sessionStory = {
      segments: [],
      displacementZones: [],
      relationships: [],
      bias: 'BALANCED',
      summary: 'Test session story includes a higher-timeframe obstacle.',
      notes: [],
      targetLevels: [{
        label: '120M bullish FVG lower boundary',
        price: 7395,
        type: 'support',
        source: 'ninjatrader',
        directionRelevance: 'SHORT',
        confidence: 'High',
        evidence: 'Nearest higher-timeframe support sits in front of the short target path.',
      }],
    };

    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      chartContext: context,
      result: null,
    });
    const modelOne = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(modelOne);
    assert.equal(modelOne.executionStatus, ExecutionStatus.Conditional);
    assert.equal(modelOne.blockReason, NoTradeReason.EntryTriggerPending);
    assert.equal(modelOne.activeRuleset?.htfLineInSand?.applied, true);
    assert.equal(modelOne.activeRuleset?.htfLineInSand?.status, 'blocked');
    assert.equal(modelOne.activeRuleset?.htfLineInSand?.appliesToAllModels, true);
    assert.equal(modelOne.activeRuleset?.htfLineInSand?.lineInSand, 7395);
    assert.equal(
      modelOne.activeRuleset?.htfLineInSand?.requiredClose,
      'Completed 5M or 15M close below 7395.00 required before short continuation is active.'
    );
    assert.ok(modelOne.activeRuleset?.htfLineInSand?.lineReason?.includes('120M bullish FVG lower boundary'));
    assert.ok(modelOne.missingEvidence.some((item) => item.includes('No chase: wait for a completed 5M or 15M close below 7395.00')));
    assert.equal(result.bestExecutableCandidate, null);
  }],

  ['Intraday MSS Micro Continuation creates human-review short after 15M/5M bearish MSS and 5M FVG rejection into HTF support', () => {
    const context = htfMssContext('SHORT', {
      sessionType: 'lunch',
      chartTimestamp: '2026-06-08T15:35:00-04:00',
      keyLevels: {
        ...htfMssContext('SHORT').keyLevels,
        currentPrice: 7417,
        activeSwingHigh: 7424.5,
        activeSwingLow: 7415.5,
      },
      proposedEntry: null,
      proposedStop: null,
      riskPoints: null,
      fvgZones: [{
        direction: 'SHORT',
        lower: 7418.5,
        upper: 7424.25,
        midpoint: 7421.25,
        formedAt: '2026-06-08T15:20:00-04:00',
        formedCandleIndex: 1,
        impulseQualified: true,
        impulseBodyRatio: 1.5,
        impulseRangeRatio: 1.5,
        confidence: 'High',
      }],
      candles: [
        { index: 0, timestamp: '2026-06-08T15:15:00-04:00', open: 7429, high: 7430, low: 7423, close: 7424, direction: 'bearish', confidence: 'High' },
        { index: 1, timestamp: '2026-06-08T15:20:00-04:00', open: 7424, high: 7424.25, low: 7418.5, close: 7418.25, direction: 'bearish', confidence: 'High', isExpansion: true },
        { index: 2, timestamp: '2026-06-08T15:25:00-04:00', open: 7416.25, high: 7422, low: 7416, close: 7417, direction: 'bearish', confidence: 'High', isRejection: true },
      ],
      structuralLevels: [{
        label: '120M/240M support low',
        price: 7415.5,
        type: 'support',
        source: 'ninjatrader',
        directionRelevance: 'SHORT',
        confidence: 'High',
        evidence: 'Nearest HTF support below current price.',
      }],
    });

    const result = scanSetupCandidates({ sessionType: 'lunch', chartContext: context, result: null });
    const micro = result.candidates.find((candidate) => candidate.setupType === SetupType.IntradayMssMicroContinuation);

    assert.ok(micro);
    assert.equal(micro.pathway, 'intraday_mss_micro_continuation');
    assert.equal(micro.direction, 'SHORT');
    assert.equal(micro.candidateState, 'HUMAN_REVIEW_READY');
    assert.equal(micro.humanReview?.status, 'HumanReviewReady');
    assert.equal(micro.humanReview?.canExecute, false);
    assert.equal(micro.executionStatus, ExecutionStatus.Conditional);
    assert.ok(micro.evidence.some((item) => item.includes('15:00-16:40 ET')));
    assert.equal(micro.entry, 7417);
    assert.equal(micro.stop, 7424.75);
    assert.equal(micro.activeRuleset?.htfLineInSand?.lineInSand, 7415.5);
    assert.equal(micro.activeRuleset?.htfLineInSand?.status, 'blocked');
    assert.equal(micro.activeCampaign?.status, 'active');
    assert.equal(micro.activeCampaign?.direction, 'SHORT');
    assert.equal(micro.activeCampaign?.primaryTrigger, '15M_5M_MSS');
    assert.equal(micro.activeCampaign?.authority, 'campaign_context_only_not_execution_authority');
    assert.equal(micro.activeCampaign?.obstacleMap.lineInSand, 7415.5);
    assert.equal(micro.activeCampaign?.obstacleMap.role, 'management_obstacle');
    assert.equal(micro.activeCampaign?.deDuplication.oneTradePerCampaignRecommended, true);
    assert.equal(micro.activeCampaign?.deDuplication.enforced, true);
    assert.equal(micro.activeCampaign?.deDuplication.resetPolicy, 'trade_date_direction_campaign');
    assert.ok(micro.activeCampaign?.notes.some((item) => item.includes('scanner alert ledger')));
    assert.equal(
      micro.activeRuleset?.htfLineInSand?.requiredClose,
      'Completed 5M or 15M close below 7415.50 required before short continuation is active.'
    );
    assert.ok(micro.evidence.some((item) => item.includes('Completed 5M bearish FVG retest/rejection confirmed')));
    assert.ok(micro.missingEvidence.some((item) => item.includes('No chase: wait for a completed 5M or 15M close below 7415.50')));
  }],

  ['Intraday MSS Micro Continuation supports mirrored long after 15M/5M bullish MSS and 5M FVG rejection below resistance', () => {
    const context = htfMssContext('LONG', {
      sessionType: 'lunch',
      chartTimestamp: '2026-06-08T13:35:00-04:00',
      keyLevels: {
        ...htfMssContext('LONG').keyLevels,
        currentPrice: 7419,
        activeSwingLow: 7411.5,
        activeSwingHigh: 7420.5,
      },
      proposedEntry: null,
      proposedStop: null,
      riskPoints: null,
      fvgZones: [{
        direction: 'LONG',
        lower: 7412,
        upper: 7417.75,
        midpoint: 7415,
        formedAt: '2026-06-08T13:20:00-04:00',
        formedCandleIndex: 1,
        impulseQualified: true,
        impulseBodyRatio: 1.5,
        impulseRangeRatio: 1.5,
        confidence: 'High',
      }],
      candles: [
        { index: 0, timestamp: '2026-06-08T13:15:00-04:00', open: 7408, high: 7413, low: 7407.5, close: 7412.5, direction: 'bullish', confidence: 'High' },
        { index: 1, timestamp: '2026-06-08T13:20:00-04:00', open: 7412.5, high: 7418, low: 7412, close: 7418, direction: 'bullish', confidence: 'High', isExpansion: true },
        { index: 2, timestamp: '2026-06-08T13:35:00-04:00', open: 7419.25, high: 7420, low: 7415, close: 7419, direction: 'bullish', confidence: 'High', isRejection: true },
      ],
      structuralLevels: [{
        label: '60M resistance high',
        price: 7420.5,
        type: 'resistance',
        source: 'ninjatrader',
        directionRelevance: 'LONG',
        confidence: 'High',
        evidence: 'Nearest HTF resistance above current price.',
      }],
    });

    const result = scanSetupCandidates({ sessionType: 'lunch', chartContext: context, result: null });
    const micro = result.candidates.find((candidate) => candidate.setupType === SetupType.IntradayMssMicroContinuation);

    assert.ok(micro);
    assert.equal(micro.direction, 'LONG');
    assert.equal(micro.candidateState, 'HUMAN_REVIEW_READY');
    assert.equal(micro.humanReview?.canExecute, false);
    assert.equal(micro.executionStatus, ExecutionStatus.Conditional);
    assert.equal(micro.entry, 7419);
    assert.equal(micro.stop, 7411.25);
    assert.equal(micro.activeRuleset?.htfLineInSand?.lineInSand, 7420.5);
    assert.equal(micro.activeRuleset?.htfLineInSand?.status, 'blocked');
    assert.equal(micro.activeCampaign?.status, 'active');
    assert.equal(micro.activeCampaign?.direction, 'LONG');
    assert.equal(micro.activeCampaign?.primaryTrigger, '15M_5M_MSS');
    assert.equal(micro.activeCampaign?.obstacleMap.lineInSand, 7420.5);
    assert.equal(micro.activeCampaign?.deDuplication.enforced, true);
    assert.equal(micro.activeCampaign?.deDuplication.resetPolicy, 'trade_date_direction_campaign');
    assert.equal(
      micro.activeRuleset?.htfLineInSand?.requiredClose,
      'Completed 5M or 15M close above 7420.50 required before long continuation is active.'
    );
    assert.ok(micro.evidence.some((item) => item.includes('Completed 5M bullish FVG retest/rejection confirmed')));
  }],

  ['Phase E FVG-only continuation does not qualify as Model 1', () => {
    const context = structuredContext();
    context.liquidityEvents = [];
    context.liquiditySweeps = [];
    context.reclaimEvents = [];
    context.failedBreakEvents = [];

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const modelOne = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(modelOne);
    assert.notEqual(modelOne.executionStatus, ExecutionStatus.Executable);
    assert.ok(modelOne.missingEvidence.includes('Liquidity sweep'));
  }],

  ['Phase E sweep and reclaim without displacement MSS FVG does not fully qualify', () => {
    const context = structuredContext();
    context.displacementCandles = [];
    context.fvgZones = [];
    context.marketStructure = { ...context.marketStructure!, marketStructureShift: false, expansionCondition: false };
    context.setupReadyFacts = { sweepThenReclaim: true };

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const modelOne = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(modelOne);
    assert.equal(modelOne.executionStatus, ExecutionStatus.Conditional);
    assert.ok(modelOne.missingEvidence.includes('Displacement'));
    assert.ok(modelOne.missingEvidence.includes('Market structure shift'));
    assert.ok(modelOne.missingEvidence.includes('Fair value gap / imbalance'));
  }],

  ['Phase E sweep displacement MSS without FVG retrace remains conditional', () => {
    const context = structuredContext();
    context.setupReadyFacts = { ...context.setupReadyFacts!, pullbackIntoFvg: false, fvgReclaimed: false };
    context.fvgZones = (context.fvgZones || []).map((zone) => ({ ...zone, formedCandleIndex: 1 }));
    context.candles = (context.candles || []).filter((candle) => candle.index <= 0);

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const modelOne = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(modelOne);
    assert.equal(modelOne.executionStatus, ExecutionStatus.Conditional);
    assert.ok(modelOne.missingEvidence.includes('Retrace into FVG'));
  }],

  ['Phase E weak FVG without impulse filter does not qualify', () => {
    const context = structuredContext();
    context.fvgZones = [{
      direction: 'LONG',
      lower: 7398,
      upper: 7401,
      midpoint: 7399.5,
      formedCandleIndex: 0,
      impulseQualified: false,
      impulseBodyRatio: 0.8,
      impulseRangeRatio: 0.9,
      confidence: 'High',
    }];

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const modelOne = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(modelOne);
    assert.equal(modelOne.executionStatus, ExecutionStatus.Conditional);
    assert.ok(modelOne.missingEvidence.includes('Fair value gap / imbalance'));
  }],

  ['Phase E entry outside FVG does not qualify', () => {
    const context = structuredContext();
    context.proposedEntry = 7405;
    context.setupEvidence = {};

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const modelOne = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(modelOne);
    assert.equal(modelOne.executionStatus, ExecutionStatus.Conditional);
    assert.equal(modelOne.entry, null);
    assert.ok(modelOne.missingEvidence.includes('Entry inside FVG or valid confluence zone'));
  }],

  ['Phase E missing 2R target room blocks full qualification', () => {
    const context = structuredContext();
    context.targetObjectives = [{
      label: 'Near obstacle',
      price: 7402,
      direction: 'LONG',
      source: 'app',
      type: 'liquidity_pool',
      confidence: 'High',
      score: 80,
      reason: 'Nearest liquidity is inside 2R.',
    }];

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const modelOne = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(modelOne);
    assert.equal(modelOne.executionStatus, ExecutionStatus.Conditional);
    assert.equal(modelOne.target2, null);
    assert.ok(modelOne.missingEvidence.includes('Minimum 2.0R available'));
  }],

  ['Phase E long stop is below sweep low', () => {
    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: structuredContext(), result: null });
    const modelOne = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(modelOne);
    assert.equal(modelOne.stop, 7395.75);
    assert.ok(modelOne.stop! < 7396);
  }],

  ['Phase E short stop is above sweep high', () => {
    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: shortModelOneContext(), result: null });
    const modelOne = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(modelOne);
    assert.equal(modelOne.executionStatus, ExecutionStatus.Executable);
    assert.equal(modelOne.stop, 7404.25);
    assert.ok(modelOne.stop! > 7404);
  }],

  ['big-picture bullish structure keeps countertrend bearish Model 1 conditional in morning', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      chartContext: withBigPictureStructure(shortModelOneContext(), 'LONG'),
      result: null,
    });
    const modelOne = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(modelOne);
    assert.equal(modelOne.direction, 'SHORT');
    assert.equal(modelOne.detectedStatus, SetupCandidateStatus.Possible);
    assert.equal(modelOne.executionStatus, ExecutionStatus.Conditional);
    assert.equal(modelOne.blockReason, NoTradeReason.EntryTriggerPending);
    assert.ok(modelOne.evidence.includes('Big-picture structure is bullish'));
    assert.ok(modelOne.missingEvidence.includes('Countertrend setup requires immediate failure confirmation; do not fight big-picture structure'));
    assert.equal(result.bestExecutableCandidate, null);
  }],

  ['big-picture bearish structure keeps countertrend bullish Model 1 conditional in lunch', () => {
    const context = withBigPictureStructure(structuredContext(), 'SHORT');
    context.sessionType = 'replay_lunch';
    const result = scanSetupCandidates({ sessionType: 'replay_lunch', chartContext: context, result: null });
    const modelOne = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(modelOne);
    assert.equal(modelOne.direction, 'LONG');
    assert.equal(modelOne.detectedStatus, SetupCandidateStatus.Possible);
    assert.equal(modelOne.executionStatus, ExecutionStatus.Conditional);
    assert.ok(modelOne.evidence.includes('Big-picture structure is bearish'));
    assert.ok(modelOne.missingEvidence.includes('Countertrend setup requires immediate failure confirmation; do not fight big-picture structure'));
    assert.equal(result.bestExecutableCandidate, null);
  }],

  ['Phase 3 bullish HTF draw pathway creates trading-plan candidate after sell-side raid and confirmed bullish 5M MSS', () => {
    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: htfMssContext('LONG'), result: null });
    const htfCandidate = htfPathwayCandidate(result);
    const primaryModel = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(htfCandidate);
    assert.equal(htfCandidate.direction, 'LONG');
    assert.equal(htfCandidate.candidateState, 'MSS_HOLD_CONFIRMED');
    assert.equal(htfCandidate.executionStatus, ExecutionStatus.Executable);
    assert.equal(htfCandidate.blockReason, null);
    assert.equal(htfCandidate.htfLiquidityDrawState?.createsTradingPlanCandidate, true);
    assert.equal(htfCandidate.htfLiquidityDrawState?.approvesExecution, false);
    assert.equal(htfCandidate.htfLiquidityDrawState?.boundary, 'candidate_creation_only_not_execution_authority');
    assert.ok(htfCandidate.evidence.includes('5M MSS trigger confirmed'));
    assert.ok(htfCandidate.evidence.includes('External liquidity target exists: full ETH high'));
    assert.ok(htfCandidate.evidence.some((line) => line.includes('Execution still requires deterministic entry, stop, target, risk, and final pipeline gates')));
    assert.ok(htfCandidate.evidence.some((line) => line.includes('5M MSS trigger confirmed by swing break with displacement')));
    assert.ok(htfCandidate.evidence.some((line) => line.includes('15M potential MSS / pending confirm')));
    assert.ok(htfCandidate.evidence.some((line) => line.includes('Pathway state: MSS_HOLD_CONFIRMED')));
    assert.ok(htfCandidate.nextAction.includes('Execution still requires final app-owned entry, stop, target, risk visibility, invalidation, session, screenshot-quality, and canExecute gates.'));
    assert.equal(/take the trade|enter now|buy now|sell now|trade approved/i.test(`${htfCandidate.evidence.join(' ')} ${htfCandidate.nextAction}`), false);
    assert.equal(result.bestExecutableCandidate?.pathway, 'htf_liquidity_draw_mss');
    assert.equal(primaryModel?.detectedStatus, SetupCandidateStatus.NotDetected);
  }],

  ['Phase 1B narrative HTF draw language cannot create the HTF draw continuation model without structured state', () => {
    const context = structuredContext();
    context.htfLiquidityDrawState = undefined;
    const result = scanSetupCandidates({
      sessionType: 'morning',
      chartContext: context,
      result: resultWithText('HTF draw continuation after sell-side raid and bullish 5M MSS toward external liquidity.'),
    });
    const htfModel = result.candidates.find((candidate) => candidate.setupType === SetupType.HtfDrawContinuationAfterRaid);

    assert.ok(htfModel);
    assert.equal(htfModel.detectedStatus, SetupCandidateStatus.NotDetected);
    assert.equal(htfPathwayCandidate(result), null);
    assert.equal(result.bestExecutableCandidate?.pathway === 'htf_liquidity_draw_mss', false);
  }],

  ['Phase 3 bearish HTF draw pathway creates trading-plan candidate after buy-side raid and confirmed bearish 5M MSS', () => {
    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: htfMssContext('SHORT'), result: null });
    const htfCandidate = htfPathwayCandidate(result);

    assert.ok(htfCandidate);
    assert.equal(htfCandidate.direction, 'SHORT');
    assert.equal(htfCandidate.candidateState, 'MSS_HOLD_CONFIRMED');
    assert.equal(htfCandidate.executionStatus, ExecutionStatus.Executable);
    assert.equal(htfCandidate.blockReason, null);
    assert.ok(htfCandidate.requiredTrigger?.includes('buy-side raid'));
    assert.ok(htfCandidate.evidence.includes('5M MSS trigger confirmed'));
    assert.ok(htfCandidate.evidence.includes('External liquidity target exists: full ETH low'));
    assert.equal(result.bestExecutableCandidate?.pathway, 'htf_liquidity_draw_mss');
  }],

  ['Phase 3 15M potential MSS supports candidate creation only when 5M MSS confirms', () => {
    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: htfMssContext('LONG'), result: null });
    const htfCandidate = htfPathwayCandidate(result);

    assert.ok(htfCandidate);
    assert.equal(htfCandidate.htfLiquidityDrawState?.timeframeStates.find((state) => state.timeframe === '15M')?.status, 'potential_mss');
    assert.equal(htfCandidate.candidateState, 'MSS_HOLD_CONFIRMED');
    assert.equal(htfCandidate.executionStatus, ExecutionStatus.Executable);
  }],

  ['Phase 3 15M pending confirm still supports candidate creation after 5M MSS confirms', () => {
    const context = htfMssContext('LONG');
    context.htfLiquidityDrawState!.timeframeStates = context.htfLiquidityDrawState!.timeframeStates.map((state) =>
      state.timeframe === '15M'
        ? { ...state, status: 'pending_confirm', lifecycleState: 'mss_trigger_pending', evidence: ['15M raid/reclaim is pending confirmation but aligned.'] }
        : state
    );

    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });
    const htfCandidate = htfPathwayCandidate(result);

    assert.ok(htfCandidate);
    assert.equal(htfCandidate.htfLiquidityDrawState?.timeframeStates.find((state) => state.timeframe === '15M')?.status, 'pending_confirm');
    assert.equal(htfCandidate.candidateState, 'MSS_HOLD_CONFIRMED');
    assert.equal(result.bestExecutableCandidate?.pathway, 'htf_liquidity_draw_mss');
  }],

  ['Phase 3B 15M confirmed state supports candidate creation after 5M MSS confirms', () => {
    const context = htfMssContext('LONG');
    context.htfLiquidityDrawState!.timeframeStates = context.htfLiquidityDrawState!.timeframeStates.map((state) =>
      state.timeframe === '15M'
        ? { ...state, status: 'confirmed', lifecycleState: 'confirmed_mss', evidence: ['15M raid/reclaim confirmed and aligned.'] }
        : state
    );

    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });
    const htfCandidate = htfPathwayCandidate(result);

    assert.ok(htfCandidate);
    assert.equal(htfCandidate.htfLiquidityDrawState?.timeframeStates.find((state) => state.timeframe === '15M')?.status, 'confirmed');
    assert.equal(htfCandidate.executionStatus, ExecutionStatus.Executable);
  }],

  ['Phase 3 no HTF draw pathway candidate is created when the 5M MSS trigger is missing', () => {
    const context = htfMssContext('LONG');
    context.htfLiquidityDrawState!.fiveMinuteState = {
      ...context.htfLiquidityDrawState!.fiveMinuteState,
      status: 'not_confirmed',
      lifecycleState: 'no_mss',
      evidence: ['5M has not confirmed a swing break/reclaim.'],
    };
    context.htfLiquidityDrawState!.timeframeStates = context.htfLiquidityDrawState!.timeframeStates.map((state) =>
      state.timeframe === '5M' ? context.htfLiquidityDrawState!.fiveMinuteState : state
    );

    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });

    assert.equal(htfPathwayCandidate(result), null);
    assert.equal(result.bestExecutableCandidate, null);
  }],

  ['Phase 3 5M potential MSS stays pending and cannot create a reversal-delivery candidate', () => {
    const context = htfMssContext('LONG');
    context.htfLiquidityDrawState!.classification = 'MSS_TRIGGER_PENDING';
    context.htfLiquidityDrawState!.fiveMinuteState = {
      ...context.htfLiquidityDrawState!.fiveMinuteState,
      status: 'potential_mss',
      lifecycleState: 'mss_trigger_pending',
      evidence: ['Potential 5M MSS forming, but no confirmed close through swing high with displacement yet.'],
    };
    context.htfLiquidityDrawState!.timeframeStates = context.htfLiquidityDrawState!.timeframeStates.map((state) =>
      state.timeframe === '5M' ? context.htfLiquidityDrawState!.fiveMinuteState : state
    );

    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });

    assert.equal(htfPathwayCandidate(result), null);
    assert.ok(result.candidates.every((candidate) => candidate.candidateState !== 'REVERSAL_DELIVERY_PLAN_CANDIDATE'));
    assert.ok(result.candidates.every((candidate) => candidate.candidateState !== 'QUALIFIED_CONDITIONAL'));
    assert.ok(result.candidates.every((candidate) => candidate.executionStatus !== ExecutionStatus.Executable));
  }],

  ['Phase 3B 5M failed MSS blocks the HTF draw continuation setup', () => {
    const context = htfMssContext('LONG');
    context.htfLiquidityDrawState!.classification = 'FAILED_MSS';
    context.htfLiquidityDrawState!.fiveMinuteState = {
      ...context.htfLiquidityDrawState!.fiveMinuteState,
      status: 'failed',
      lifecycleState: 'failed_mss',
      evidence: ['Bullish potential MSS failed by trading below the raid low.'],
    };
    context.htfLiquidityDrawState!.timeframeStates = context.htfLiquidityDrawState!.timeframeStates.map((state) =>
      state.timeframe === '5M' ? context.htfLiquidityDrawState!.fiveMinuteState : state
    );

    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });

    assert.equal(htfPathwayCandidate(result), null);
    assert.equal(result.bestExecutableCandidate, null);
  }],

  ['Phase 3B 5M conflicting MSS blocks the HTF draw continuation setup', () => {
    const context = htfMssContext('SHORT');
    context.htfLiquidityDrawState!.classification = 'CONFLICTING_MSS';
    context.htfLiquidityDrawState!.fiveMinuteState = {
      ...context.htfLiquidityDrawState!.fiveMinuteState,
      status: 'conflicting',
      lifecycleState: 'conflicting_mss',
      evidence: ['Opposite MSS confirmed after displacement digestion.'],
    };
    context.htfLiquidityDrawState!.timeframeStates = context.htfLiquidityDrawState!.timeframeStates.map((state) =>
      state.timeframe === '5M' ? context.htfLiquidityDrawState!.fiveMinuteState : state
    );

    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });

    assert.equal(htfPathwayCandidate(result), null);
    assert.equal(result.bestExecutableCandidate, null);
  }],

  ['Phase 3B 15M potential alone cannot create a candidate without confirmed 5M MSS', () => {
    const context = htfMssContext('LONG');
    context.htfLiquidityDrawState!.classification = 'MSS_TRIGGER_PENDING';
    context.htfLiquidityDrawState!.fiveMinuteState = {
      ...context.htfLiquidityDrawState!.fiveMinuteState,
      status: 'pending_confirm',
      lifecycleState: 'mss_trigger_pending',
      evidence: ['5M reclaim is pending; no confirmed close through the swing with displacement.'],
    };
    context.htfLiquidityDrawState!.timeframeStates = context.htfLiquidityDrawState!.timeframeStates.map((state) =>
      state.timeframe === '5M' ? context.htfLiquidityDrawState!.fiveMinuteState : state
    );

    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });

    assert.equal(context.htfLiquidityDrawState.timeframeStates.find((state) => state.timeframe === '15M')?.status, 'potential_mss');
    assert.equal(htfPathwayCandidate(result), null);
    assert.ok(result.candidates.every((candidate) => candidate.executionStatus !== ExecutionStatus.Executable));
  }],

  ['Phase 3B missing timeframe state remains safe and does not create HTF setup candidate', () => {
    const context = htfMssContext('LONG');
    context.htfLiquidityDrawState!.classification = 'NO_QUALIFIED_STATE';
    context.htfLiquidityDrawState!.confidence = 40;
    context.htfLiquidityDrawState!.timeframeStates = context.htfLiquidityDrawState!.timeframeStates.map((state) =>
      state.timeframe === '15M'
        ? { ...state, status: 'unknown', lifecycleState: 'unknown', direction: 'unknown', confidence: 0, evidence: ['15M OHLC is missing.'] }
        : state
    );

    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });
    const htfModel = result.candidates.find((candidate) => candidate.setupType === SetupType.HtfDrawContinuationAfterRaid);

    assert.equal(htfPathwayCandidate(result), null);
    assert.equal(htfModel?.detectedStatus, SetupCandidateStatus.NotDetected);
    assert.equal(result.bestExecutableCandidate, null);
  }],

  ['Phase 3B material 4H/1H conflict blocks the HTF draw continuation setup', () => {
    const context = htfMssContext('LONG');
    context.htfLiquidityDrawState!.macroContext = 'conflicting';
    context.htfLiquidityDrawState!.timeframeStates = context.htfLiquidityDrawState!.timeframeStates.map((state) =>
      state.timeframe === '4H' || state.timeframe === '1H'
        ? { ...state, direction: 'bearish', status: 'confirmed', lifecycleState: 'confirmed_mss', evidence: [`${state.timeframe} conflicts with the long draw.`] }
        : state
    );

    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });

    assert.equal(htfPathwayCandidate(result), null);
    assert.equal(result.bestExecutableCandidate, null);
  }],

  ['Phase 3B external liquidity target is required and does not replace app-computed R targets', () => {
    const valid = scanSetupCandidates({ sessionType: 'morning', chartContext: htfMssContext('LONG'), result: null });
    const htfCandidate = htfPathwayCandidate(valid);

    assert.ok(htfCandidate);
    assert.equal(htfCandidate.target1, 7610);
    assert.equal(htfCandidate.target2, 7612);
    assert.ok(htfCandidate.evidence.includes('External liquidity target exists: full ETH high'));

    const context = htfMssContext('LONG', {
      keyLevels: {
        currentPrice: 7604,
        activeSwingLow: null,
        activeSwingHigh: null,
        previousDayHigh: null,
        priorDayHigh: null,
        overnightHigh: null,
        londonHigh: null,
      },
      targetObjectives: [],
    });
    context.htfLiquidityDrawState!.externalLiquidityTarget = undefined;
    context.htfLiquidityDrawState!.timeframeStates = context.htfLiquidityDrawState!.timeframeStates.map((state) => ({
      ...state,
      externalLiquidityTarget: undefined,
    }));

    const noTarget = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });

    assert.equal(htfPathwayCandidate(noTarget), null);
    assert.equal(noTarget.bestExecutableCandidate, null);
  }],

  ['Phase 3B missing app-owned entry or stop keeps HTF setup non-executable', () => {
    const context = htfMssContext('LONG', {
      proposedEntry: null,
      proposedStop: null,
      riskPoints: null,
    });

    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });
    const htfCandidate = htfPathwayCandidate(result);

    assert.ok(htfCandidate);
    assert.equal(htfCandidate.candidateState, 'REVERSAL_DELIVERY_PLAN_CANDIDATE');
    assert.equal(htfCandidate.executionStatus, ExecutionStatus.Conditional);
    assert.equal(htfCandidate.entry, null);
    assert.equal(htfCandidate.stop, null);
    assert.equal(htfCandidate.target1, null);
    assert.equal(htfCandidate.target2, null);
    assert.equal(result.bestExecutableCandidate, null);
  }],

  ['Phase 3B active setup scan windows allow HTF setup through old cutoffs and block 15:30 ET', () => {
    const allowed = [
      { sessionType: 'morning' as const, chartTimestamp: '2026-06-01T11:15:00-04:00' },
      { sessionType: 'morning' as const, chartTimestamp: '2026-06-01T11:50:00-04:00' },
      { sessionType: 'lunch' as const, chartTimestamp: '2026-06-01T13:00:00-04:00' },
      { sessionType: 'lunch' as const, chartTimestamp: '2026-06-01T15:29:00-04:00' },
    ];

    for (const fixture of allowed) {
      const result = scanSetupCandidates({
        sessionType: fixture.sessionType,
        chartContext: htfMssContext('LONG', fixture),
        result: null,
      });
      assert.ok(htfPathwayCandidate(result), `${fixture.chartTimestamp} should allow HTF setup detection`);
    }

    const outside = scanSetupCandidates({
      sessionType: 'lunch',
      chartContext: htfMssContext('LONG', {
        sessionType: 'lunch',
        chartTimestamp: '2026-06-01T15:30:00-04:00',
      }),
      result: null,
    });

    assert.equal(htfPathwayCandidate(outside), null);
    assert.equal(outside.bestExecutableCandidate, null);
  }],

  ['Phase 3 4H potential MSS updates macro context but does not create a candidate by itself', () => {
    const context = htfMssContext('LONG');
    context.htfLiquidityDrawState!.classification = 'HTF_DRAW_DETECTED';
    context.htfLiquidityDrawState!.fiveMinuteState = {
      ...context.htfLiquidityDrawState!.fiveMinuteState,
      status: 'not_confirmed',
      lifecycleState: 'no_mss',
      evidence: ['5M trigger is absent.'],
    };
    context.htfLiquidityDrawState!.timeframeStates = context.htfLiquidityDrawState!.timeframeStates.map((state) =>
      state.timeframe === '4H'
        ? { ...state, status: 'potential_mss', lifecycleState: 'potential_mss', evidence: ['4H potential MSS context only.'] }
        : state.timeframe === '5M'
        ? context.htfLiquidityDrawState!.fiveMinuteState
        : state
    );

    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });

    assert.equal(context.htfLiquidityDrawState.timeframeStates.find((state) => state.timeframe === '4H')?.status, 'potential_mss');
    assert.equal(htfPathwayCandidate(result), null);
    assert.equal(result.bestExecutableCandidate, null);
  }],

  ['Phase 3 1H potential MSS updates session structure but does not create a candidate by itself', () => {
    const context = htfMssContext('SHORT');
    context.htfLiquidityDrawState!.classification = 'HTF_DRAW_DETECTED';
    context.htfLiquidityDrawState!.fiveMinuteState = {
      ...context.htfLiquidityDrawState!.fiveMinuteState,
      status: 'not_confirmed',
      lifecycleState: 'no_mss',
      evidence: ['5M trigger is absent.'],
    };
    context.htfLiquidityDrawState!.timeframeStates = context.htfLiquidityDrawState!.timeframeStates.map((state) =>
      state.timeframe === '1H'
        ? { ...state, status: 'potential_mss', lifecycleState: 'potential_mss', evidence: ['1H potential MSS context only.'] }
        : state.timeframe === '5M'
        ? context.htfLiquidityDrawState!.fiveMinuteState
        : state
    );

    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });

    assert.equal(context.htfLiquidityDrawState.timeframeStates.find((state) => state.timeframe === '1H')?.status, 'potential_mss');
    assert.equal(htfPathwayCandidate(result), null);
    assert.equal(result.bestExecutableCandidate, null);
  }],

  ['Phase 3 HTF draw alone does not create an executable trade', () => {
    const context = htfMssContext('LONG');
    context.htfLiquidityDrawState!.classification = 'HTF_DRAW_DETECTED';
    context.htfLiquidityDrawState!.fiveMinuteState = {
      ...context.htfLiquidityDrawState!.fiveMinuteState,
      status: 'not_confirmed',
      lifecycleState: 'no_mss',
      evidence: ['HTF bullish draw exists, but 5M MSS is absent.'],
    };
    context.htfLiquidityDrawState!.timeframeStates = context.htfLiquidityDrawState!.timeframeStates.map((state) =>
      state.timeframe === '5M' ? context.htfLiquidityDrawState!.fiveMinuteState : state
    );

    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });

    assert.equal(htfPathwayCandidate(result), null);
    assert.equal(result.bestExecutableCandidate, null);
  }],

  ['Phase 3 deterministic executable gates authorize execution after HTF/MSS model gates complete', () => {
    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: htfMssContext('LONG'), result: null });
    const htfCandidate = htfPathwayCandidate(result);

    assert.ok(htfCandidate);
    assert.equal(htfCandidate.candidateState, 'MSS_HOLD_CONFIRMED');
    assert.equal(htfCandidate.executionStatus, ExecutionStatus.Executable);
    assert.equal(result.bestExecutableCandidate?.pathway, 'htf_liquidity_draw_mss');
  }],

  ['RiskTooWide remains visible as advisory for HTF/MSS pathway candidates', () => {
    const context = htfMssContext('LONG', {
      proposedEntry: 7604,
      proposedStop: 7588,
      riskPoints: 16,
      riskStatus: 'RiskTooWide',
    });

    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });
    const htfCandidate = htfPathwayCandidate(result);

    assert.ok(htfCandidate);
    assert.equal(htfCandidate.candidateState, 'MSS_HOLD_CONFIRMED');
    assert.equal(htfCandidate.executionStatus, ExecutionStatus.Executable);
    assert.equal(htfCandidate.blockReason, null);
    assert.equal(htfCandidate.riskAdvisoryStatus, 'RISK_EXTENDED_STRUCTURAL');
    assert.ok(htfCandidate.evidence.includes('Risk exceeds standard limit. Human final decision required.'));
    assert.equal(result.bestExecutableCandidate?.pathway, 'htf_liquidity_draw_mss');
  }],

  ['Phase 3 HTF/MSS pathway can create a candidate when the legacy scanner identifies no setup', () => {
    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: htfMssContext('LONG'), result: null });
    const htfCandidate = htfPathwayCandidate(result);
    const legacyDetected = result.candidates.filter((candidate) => candidate.pathway !== 'htf_liquidity_draw_mss' && candidate.detectedStatus === SetupCandidateStatus.Detected);

    assert.ok(htfCandidate);
    assert.equal(htfCandidate.setupType, SetupType.HtfDrawContinuationAfterRaid);
    assert.equal(legacyDetected.length, 0);
    assert.equal(result.bestExecutableCandidate?.pathway, 'htf_liquidity_draw_mss');
  }],

  ['HTF displacement MSS continuation creates a long executable candidate with app targets and confidence score', () => {
    const context = htfDisplacementContinuationContext('LONG');
    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });
    const candidate = result.candidates.find((entry) => entry.setupType === SetupType.HtfDisplacementMssContinuation);

    assert.ok(candidate);
    assert.equal(candidate.pathway, 'htf_displacement_mss_continuation');
    assert.equal(candidate.direction, 'LONG');
    assert.equal(candidate.candidateState, 'MSS_HOLD_CONFIRMED');
    assert.equal(candidate.executionStatus, ExecutionStatus.Executable);
    assert.equal(candidate.entry, 7603.25);
    assert.equal(candidate.stop, 7599);
    assert.equal(candidate.target1, 7609.75);
    assert.equal(candidate.target2, 7611.75);
    assert.equal(candidate.riskAdvisoryStatus, 'RISK_WITHIN_STANDARD_LIMIT');
    assert.equal(candidate.riskPolicy, 'STANDARD_RISK');
    assert.ok((candidate.modelConfidenceScore ?? 0) >= 88);
    assert.ok(candidate.evidence.some((item) => item.includes('Confidence score')));
    assert.ok(candidate.evidence.some((item) => item.includes('canExecute means structurally complete')));
    assert.ok(candidate.evidence.some((item) => item.includes('completed 5M close confirmed')));
    assert.equal(result.bestExecutableCandidate?.setupType, SetupType.HtfDisplacementMssContinuation);
  }],

  ['HTF displacement MSS continuation creates a short executable candidate with advisory structural risk', () => {
    const context = htfDisplacementContinuationContext('SHORT');
    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });
    const candidate = result.candidates.find((entry) => entry.setupType === SetupType.HtfDisplacementMssContinuation);

    assert.ok(candidate);
    assert.equal(candidate.pathway, 'htf_displacement_mss_continuation');
    assert.equal(candidate.direction, 'SHORT');
    assert.equal(candidate.candidateState, 'MSS_HOLD_CONFIRMED');
    assert.equal(candidate.executionStatus, ExecutionStatus.Executable);
    assert.equal(candidate.entry, 7582.75);
    assert.equal(candidate.stop, 7590);
    assert.equal(candidate.target1, 7572);
    assert.equal(candidate.target2, 7568.25);
    assert.equal(candidate.riskAdvisoryStatus, 'RISK_ABOVE_STANDARD_LIMIT');
    assert.equal(candidate.riskPolicy, 'STRUCTURAL_RISK_ACKNOWLEDGED');
    assert.ok(candidate.evidence.some((item) => item.includes('Risk exceeds standard limit. Human final decision required.')));
    assert.equal(candidate.blockReason, null);
  }],

  ['HTF displacement MSS continuation cannot promote when the shared 30-day HTF context gate is data-limited', () => {
    const context = htfDisplacementContinuationContext('SHORT');
    context.htfLiquidityDrawState = {
      ...context.htfLiquidityDrawState!,
      ...dataLimitedHtfContextFields(),
    };
    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });
    const candidate = result.candidates.find((entry) => entry.setupType === SetupType.HtfDisplacementMssContinuation);

    assert.ok(candidate);
    assert.equal(candidate.executionStatus, ExecutionStatus.Conditional);
    assert.equal(candidate.blockReason, NoTradeReason.EntryTriggerPending);
    assert.ok(candidate.missingEvidence.some((item) => item.includes('Full 30-day HTF context gate is not satisfied')));
    assert.notEqual(result.bestExecutableCandidate?.setupType, SetupType.HtfDisplacementMssContinuation);
  }],

  ['HTF displacement FVG continuation does not treat NEUTRAL or UNKNOWN as higher-timeframe alignment', () => {
    const context = htfDisplacementContinuationContext('SHORT');
    context.higherTimeframeThesis = undefined;
    context.multiTimeframeContext = {
      ...context.multiTimeframeContext!,
      alignment: {
        ...context.multiTimeframeContext!.alignment,
        alignedDirection: 'UNKNOWN',
        conflicts: [],
        notes: ['Unknown alignment fixture.'],
      },
    };
    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });
    const candidate = result.candidates.find((entry) => entry.setupType === SetupType.HtfDisplacementFvgContinuation);

    assert.ok(candidate);
    assert.equal(candidate.executionStatus, ExecutionStatus.Conditional);
    assert.ok(candidate.missingEvidence.some((item) => item.includes('NEUTRAL/UNKNOWN no longer counts')));
    assert.notEqual(result.bestExecutableCandidate?.setupType, SetupType.HtfDisplacementFvgContinuation);
  }],

  ['HTF displacement MSS continuation follows fresh bearish displacement over stale long structure context', () => {
    const base = htfDisplacementContinuationContext('SHORT');
    const freshShortFifteen = {
      ...base.multiTimeframeContext!.fifteenMinute.displacementCandles[0],
      timestamp: '2026-06-05T10:00:00-04:00',
      evidence: 'Current 15M bearish displacement after failed long context.',
    };
    const freshShortFive = {
      ...base.multiTimeframeContext!.fiveMinute.displacementCandles[0],
      timestamp: '2026-06-05T10:00:00-04:00',
      evidence: 'Current 5M bearish MSS close-through with displacement.',
    };
    const staleLongDisplacement = {
      ...freshShortFifteen,
      direction: 'LONG' as const,
      timestamp: '2026-06-05T09:35:00-04:00',
      open: 7518,
      high: 7533,
      low: 7517,
      close: 7532,
      evidence: 'Older bullish displacement from failed long context.',
    };
    const context = htfDisplacementContinuationContext('SHORT', {
      chartTimestamp: '2026-06-05T10:05:00-04:00',
      structureQualityContext: {
        ...base.structureQualityContext!,
        direction: 'LONG',
        reasons: ['Stale long structure context from failed earlier plan.'],
      },
      multiTimeframeContext: {
        ...base.multiTimeframeContext!,
        fifteenMinute: {
          ...base.multiTimeframeContext!.fifteenMinute,
          displacementCandles: [
            staleLongDisplacement,
            freshShortFifteen,
          ],
        },
        fiveMinute: {
          ...base.multiTimeframeContext!.fiveMinute,
          displacementCandles: [
            {
              ...staleLongDisplacement,
              timestamp: '2026-06-05T09:40:00-04:00',
              close: 7530,
            },
            freshShortFive,
          ],
        },
      },
      displacementCandles: [freshShortFive],
    });

    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });
    const candidate = result.candidates.find((entry) => entry.setupType === SetupType.HtfDisplacementMssContinuation);

    assert.ok(candidate);
    assert.equal(candidate.direction, 'SHORT');
    assert.equal(candidate.candidateState, 'MSS_HOLD_CONFIRMED');
    assert.equal(candidate.executionStatus, ExecutionStatus.Executable);
    assert.equal(candidate.blockReason, null);
    assert.ok(candidate.evidence.some((item) => item.includes('bearish 15M displacement confirmed')));
    assert.equal(result.bestExecutableCandidate?.setupType, SetupType.HtfDisplacementMssContinuation);
  }],

  ['HTF displacement MSS continuation is not created when 5M MSS confirmation is missing', () => {
    const context = htfDisplacementContinuationContext('SHORT', {
      setupReadyFacts: {
        sweepThenReclaim: true,
        breakOfStructure: false,
        pullbackIntoFvg: true,
        fvgReclaimed: true,
      },
      marketStructure: {
        trend: 'bearish',
        higherHigh: false,
        higherLow: false,
        lowerHigh: true,
        lowerLow: true,
        marketStructureShift: false,
        chopRangeCondition: false,
        compressionCondition: false,
        expansionCondition: true,
      },
      structureQualityContext: {
        direction: 'SHORT',
        structureEvent: 'major_bos',
        structureTimeframe: '5m',
        executionTimeframeConfirmed: true,
        inducementSwept: true,
        validPullbackConfirmed: true,
        structureBreakConfirmedByClose: false,
        wickOnlyBreak: false,
        oldInducementStale: false,
        newInducementRequired: false,
        noChaseRequired: false,
        reasons: [],
        missingReasons: ['5M MSS is not confirmed by close.'],
      },
    });

    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });
    const candidate = result.candidates.find((entry) => entry.setupType === SetupType.HtfDisplacementMssContinuation);

    assert.ok(candidate);
    assert.equal(candidate.detectedStatus, SetupCandidateStatus.NotDetected);
    assert.notEqual(result.bestExecutableCandidate?.setupType, SetupType.HtfDisplacementMssContinuation);
  }],

  ['HTF displacement MSS continuation becomes conditional when less than 60 percent of liquidity path remains', () => {
    const staleContext = htfDisplacementContinuationContext('SHORT');
    const context = htfDisplacementContinuationContext('SHORT', {
      keyLevels: {
        ...staleContext.keyLevels,
        currentPrice: 7576,
      },
    });

    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });
    const candidate = result.candidates.find((entry) => entry.setupType === SetupType.HtfDisplacementMssContinuation);

    assert.ok(candidate);
    assert.equal(candidate.candidateState, 'NO_FRESH_ENTRY');
    assert.equal(candidate.executionStatus, ExecutionStatus.Conditional);
    assert.equal(candidate.blockReason, NoTradeReason.ChasingExtendedMove);
    assert.ok(candidate.missingEvidence.includes('At least 60% of the path to primary liquidity remains'));
    assert.ok(candidate.nextAction.includes('NO_FRESH_ENTRY'));
    assert.notEqual(result.bestExecutableCandidate?.setupType, SetupType.HtfDisplacementMssContinuation);
  }],

  ['HTF displacement MSS continuation marks extended structure as retest pending while target path remains', () => {
    const base = htfDisplacementContinuationContext('SHORT');
    const context = htfDisplacementContinuationContext('SHORT', {
      keyLevels: {
        ...base.keyLevels,
        currentPrice: 7586,
      },
    });

    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });
    const candidate = result.candidates.find((entry) => entry.setupType === SetupType.HtfDisplacementMssContinuation);

    assert.ok(candidate);
    assert.equal(candidate.candidateState, 'MSS_CONTINUATION_RETEST_PENDING');
    assert.equal(candidate.executionStatus, ExecutionStatus.Conditional);
    assert.equal(candidate.blockReason, NoTradeReason.EntryTriggerPending);
    assert.ok(candidate.missingEvidence.includes('Current price is not holding the correct side of the MSS decision level'));
    assert.ok(candidate.nextAction.includes('MSS_CONTINUATION_RETEST_PENDING'));
    assert.ok(candidate.nextAction.includes('completed 5M retest/rejection below the decision level'));
    assert.notEqual(result.bestExecutableCandidate?.setupType, SetupType.HtfDisplacementMssContinuation);
  }],

  ['HTF displacement MSS continuation blocks fresh entry when completed 5M candles are missing', () => {
    const context = htfDisplacementContinuationContext('SHORT', {
      candles: [],
    });

    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });
    const candidate = result.candidates.find((entry) => entry.setupType === SetupType.HtfDisplacementMssContinuation);

    assert.ok(candidate);
    assert.equal(candidate.candidateState, 'MSS_CONTINUATION_RETEST_PENDING');
    assert.equal(candidate.executionStatus, ExecutionStatus.Conditional);
    assert.equal(candidate.blockReason, NoTradeReason.EntryTriggerPending);
    assert.ok(candidate.missingEvidence.some((item) => item.includes('no completed 5M candles after the MSS trigger')));
    assert.notEqual(result.bestExecutableCandidate?.setupType, SetupType.HtfDisplacementMssContinuation);
  }],

  ['HTF displacement FVG continuation creates the June 3 short candidate without requiring MSS', () => {
    const base = htfDisplacementContinuationContext('SHORT');
    const noMssFiveMinute = (base.multiTimeframeContext?.fiveMinute.displacementCandles || []).map((candle) => ({
      ...candle,
      breaksStructure: false,
      evidence: '5M bearish displacement/FVG continuation without confirmed MSS.',
    }));
    const context = htfDisplacementContinuationContext('SHORT', {
      setupReadyFacts: {
        sweepThenReclaim: false,
        breakOfStructure: false,
        pullbackIntoFvg: true,
        fvgReclaimed: true,
      },
      marketStructure: {
        ...base.marketStructure!,
        marketStructureShift: false,
      },
      structureQualityContext: {
        ...base.structureQualityContext!,
        structureBreakConfirmedByClose: false,
        reasons: [],
        missingReasons: ['5M MSS not confirmed; FVG continuation still under review.'],
      },
      displacementCandles: noMssFiveMinute,
      multiTimeframeContext: {
        ...base.multiTimeframeContext!,
        fiveMinute: {
          ...base.multiTimeframeContext!.fiveMinute,
          displacementCandles: noMssFiveMinute,
        },
      },
    });

    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });
    const candidate = result.candidates.find((entry) => entry.setupType === SetupType.HtfDisplacementFvgContinuation);

    assert.ok(candidate);
    assert.equal(candidate.pathway, 'htf_displacement_fvg_continuation');
    assert.equal(candidate.direction, 'SHORT');
    assert.equal(candidate.executionStatus, ExecutionStatus.Executable);
    assert.equal(candidate.entry, 7582.75);
    assert.equal(candidate.stop, 7590);
    assert.equal(candidate.target1, 7572);
    assert.equal(candidate.target2, 7568.25);
    assert.equal(candidate.riskAdvisoryStatus, 'RISK_ABOVE_STANDARD_LIMIT');
    assert.ok(candidate.evidence.some((item) => item.includes('5M MSS not confirmed; not invented or required')));
    assert.ok(candidate.evidence.some((item) => item.includes('Risk exceeds standard limit. Human final decision required.')));
    assert.ok((candidate.modelConfidenceScore ?? 0) >= 80);
  }],

  ['HTF displacement FVG continuation creates a symmetric long candidate', () => {
    const base = htfDisplacementContinuationContext('LONG');
    const noMssFiveMinute = (base.multiTimeframeContext?.fiveMinute.displacementCandles || []).map((candle) => ({
      ...candle,
      breaksStructure: false,
      evidence: '5M bullish displacement/FVG continuation without confirmed MSS.',
    }));
    const context = htfDisplacementContinuationContext('LONG', {
      setupReadyFacts: {
        sweepThenReclaim: false,
        breakOfStructure: false,
        pullbackIntoFvg: true,
        fvgReclaimed: true,
      },
      marketStructure: {
        ...base.marketStructure!,
        marketStructureShift: false,
      },
      structureQualityContext: {
        ...base.structureQualityContext!,
        structureBreakConfirmedByClose: false,
        reasons: [],
        missingReasons: ['5M MSS not confirmed; FVG continuation still under review.'],
      },
      displacementCandles: noMssFiveMinute,
      multiTimeframeContext: {
        ...base.multiTimeframeContext!,
        fiveMinute: {
          ...base.multiTimeframeContext!.fiveMinute,
          displacementCandles: noMssFiveMinute,
        },
      },
    });

    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });
    const candidate = result.candidates.find((entry) => entry.setupType === SetupType.HtfDisplacementFvgContinuation);

    assert.ok(candidate);
    assert.equal(candidate.pathway, 'htf_displacement_fvg_continuation');
    assert.equal(candidate.direction, 'LONG');
    assert.equal(candidate.executionStatus, ExecutionStatus.Executable);
    assert.equal(candidate.entry, 7603.25);
    assert.equal(candidate.stop, 7599);
    assert.equal(candidate.target1, 7609.75);
    assert.equal(candidate.target2, 7611.75);
    assert.equal(candidate.riskAdvisoryStatus, 'RISK_WITHIN_STANDARD_LIMIT');
    assert.ok(candidate.evidence.some((item) => item.includes('5M MSS not confirmed; not invented or required')));
  }],

  ['HTF displacement FVG continuation does not require a separate 5M displacement candle', () => {
    const base = htfDisplacementContinuationContext('SHORT');
    const context = htfDisplacementContinuationContext('SHORT', {
      setupReadyFacts: {
        sweepThenReclaim: false,
        breakOfStructure: false,
        pullbackIntoFvg: true,
        fvgReclaimed: true,
      },
      marketStructure: {
        ...base.marketStructure!,
        marketStructureShift: false,
      },
      structureQualityContext: {
        ...base.structureQualityContext!,
        structureBreakConfirmedByClose: false,
        reasons: [],
        missingReasons: ['5M MSS not confirmed; FVG continuation still under review.'],
      },
      displacementCandles: [],
      multiTimeframeContext: {
        ...base.multiTimeframeContext!,
        fiveMinute: {
          ...base.multiTimeframeContext!.fiveMinute,
          displacementCandles: [],
        },
      },
    });

    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });
    const candidate = result.candidates.find((entry) => entry.setupType === SetupType.HtfDisplacementFvgContinuation);

    assert.ok(candidate);
    assert.equal(candidate.pathway, 'htf_displacement_fvg_continuation');
    assert.equal(candidate.direction, 'SHORT');
    assert.equal(candidate.executionStatus, ExecutionStatus.Executable);
    assert.ok(candidate.evidence.some((item) => item.includes('bearish 15M displacement confirmed')));
    assert.ok(candidate.evidence.some((item) => item.includes('5M FVG / imbalance supports continuation')));
    assert.equal(candidate.evidence.some((item) => item === 'bearish 5M displacement confirmed'), false);
    assert.ok(candidate.evidence.some((item) => item.includes('5M MSS not confirmed; not invented or required')));
    assert.ok((candidate.modelConfidenceScore ?? 0) >= 70);
  }],

  ['HTF displacement FVG continuation records confirmed MSS as confidence support only', () => {
    const context = htfDisplacementContinuationContext('SHORT');
    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });
    const candidate = result.candidates.find((entry) => entry.setupType === SetupType.HtfDisplacementFvgContinuation);

    assert.ok(candidate);
    assert.equal(candidate.candidateState, 'MSS_HOLD_CONFIRMED');
    assert.equal(candidate.executionStatus, ExecutionStatus.Executable);
    assert.ok(candidate.evidence.some((item) => item.includes('MSS_HOLD_CONFIRMED: completed 5M close confirmed')));
    assert.ok((candidate.modelConfidenceScore ?? 0) > 92);
  }],

  ['Opening Drive FVG continuation creates a human-review short plan with full levels and canExecute false', () => {
    const context = htfDisplacementContinuationContext('SHORT', {
      chartTimestamp: '2026-06-05T10:20:00-04:00',
      keyLevels: {
        ...htfDisplacementContinuationContext('SHORT').keyLevels,
        currentPrice: 7584,
      },
      proposedEntry: 7586.5,
      proposedStop: 7590,
      riskPoints: 3.5,
      fvgZones: [{
        direction: 'SHORT',
        upper: 7589,
        lower: 7584,
        midpoint: 7586.5,
        formedAt: '2026-06-05T09:45:00-04:00',
        formedCandleIndex: 1,
        filledPercent: 50,
        impulseQualified: true,
        confidence: 'High',
      }],
      targetObjectives: [{
        label: 'Forward sell-side liquidity',
        price: 7574,
        direction: 'SHORT',
        source: 'app',
        type: 'liquidity_pool',
        confidence: 'High',
        score: 95,
        reason: 'Forward target for opening drive short.',
      }],
    });
    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });
    const candidate = result.candidates.find((entry) => entry.setupType === SetupType.OpeningDriveFvgContinuation);

    assert.ok(candidate);
    assert.equal(candidate.direction, 'SHORT');
    assert.equal(candidate.pathway, 'opening_drive_fvg_continuation');
    assert.equal(candidate.candidateState, 'HUMAN_REVIEW_READY');
    assert.equal(candidate.executionStatus, ExecutionStatus.Conditional);
    assert.equal(candidate.blockReason, null);
    assert.equal(candidate.humanReview?.canExecute, false);
    assert.equal(candidate.humanReview?.requiresTraderConfirmation, true);
    assert.equal(candidate.humanReview?.discordTradePlanEligible, true);
    assert.equal(candidate.entry, 7586.5);
    assert.equal(candidate.stop, 7590);
    assert.equal(candidate.target1, 7581.25);
    assert.equal(candidate.target2, 7579.5);
    assert.notEqual(result.bestExecutableCandidate?.setupType, SetupType.OpeningDriveFvgContinuation);
    assert.equal(result.bestConditionalCandidate?.setupType, SetupType.OpeningDriveFvgContinuation);
    assert.ok(candidate.evidence.some((item) => item.includes('Human review required')));
  }],

  ['Opening Drive FVG continuation supports symmetric long human-review plans', () => {
    const context = htfDisplacementContinuationContext('LONG', {
      chartTimestamp: '2026-06-05T10:15:00-04:00',
      proposedEntry: 7602,
      proposedStop: 7599,
      riskPoints: 3,
      fvgZones: [{
        direction: 'LONG',
        upper: 7603.5,
        lower: 7600.5,
        midpoint: 7602,
        formedAt: '2026-06-05T09:45:00-04:00',
        formedCandleIndex: 1,
        filledPercent: 40,
        impulseQualified: true,
        confidence: 'High',
      }],
    });
    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });
    const candidate = result.candidates.find((entry) => entry.setupType === SetupType.OpeningDriveFvgContinuation);

    assert.ok(candidate);
    assert.equal(candidate.direction, 'LONG');
    assert.equal(candidate.candidateState, 'HUMAN_REVIEW_READY');
    assert.equal(candidate.executionStatus, ExecutionStatus.Conditional);
    assert.equal(candidate.humanReview?.requiresTraderConfirmation, true);
    assert.ok(candidate.evidence.some((item) => item.includes('Directional bias: LONG')));
  }],

  ['Opening Drive FVG continuation arms during observation but does not become human-review ready before 10:00 ET', () => {
    const context = htfDisplacementContinuationContext('SHORT', {
      chartTimestamp: '2026-06-05T09:50:00-04:00',
      fvgZones: [{
        direction: 'SHORT',
        upper: 7589,
        lower: 7584,
        midpoint: 7586.5,
        formedAt: '2026-06-05T09:45:00-04:00',
        formedCandleIndex: 1,
        filledPercent: 50,
        impulseQualified: true,
        confidence: 'High',
      }],
    });
    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });
    const candidate = result.candidates.find((entry) => entry.setupType === SetupType.OpeningDriveFvgContinuation);

    assert.ok(candidate);
    assert.equal(candidate.candidateState, 'OPENING_OBSERVATION_ARMED');
    assert.equal(candidate.executionStatus, ExecutionStatus.Conditional);
    assert.equal(candidate.blockReason, NoTradeReason.EntryTriggerPending);
    assert.equal(candidate.humanReview?.discordTradePlanEligible, false);
    assert.ok(candidate.missingEvidence.some((item) => item.includes('armed during 9:30-10:00')));
  }],

  ['Opening Drive FVG continuation reports opposing 60M/120M MSS as human-review caution instead of hard blocker', () => {
    const context = htfDisplacementContinuationContext('SHORT', {
      chartTimestamp: '2026-06-05T10:20:00-04:00',
      proposedEntry: 7586.5,
      proposedStop: 7590,
      riskPoints: 3.5,
      fvgZones: [{
        direction: 'SHORT',
        upper: 7589,
        lower: 7584,
        midpoint: 7586.5,
        formedAt: '2026-06-05T09:45:00-04:00',
        formedCandleIndex: 1,
        filledPercent: 50,
        impulseQualified: true,
        confidence: 'High',
      }],
      timeframeMssEvidence: timeframeMssEvidenceLayer('bearish', {
        '60M': { direction: 'bullish' },
        '120M': { direction: 'bullish' },
      }),
    });
    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });
    const candidate = result.candidates.find((entry) => entry.setupType === SetupType.OpeningDriveFvgContinuation);

    assert.ok(candidate);
    assert.equal(candidate.candidateState, 'HUMAN_REVIEW_READY');
    assert.equal(candidate.activeRuleset?.timeframeMss?.status, 'passed');
    assert.equal(candidate.missingEvidence.some((item) => item.includes('opposing completed HTF MSS')), false);
    assert.ok(candidate.evidence.some((item) => item.includes('HTF caution for human review')));
  }],

  ['Opening Drive FVG continuation skips behind-price short targets and uses the next forward sell-side objective', () => {
    const context = htfDisplacementContinuationContext('SHORT', {
      chartTimestamp: '2026-06-05T10:20:00-04:00',
      keyLevels: {
        ...htfDisplacementContinuationContext('SHORT').keyLevels,
        currentPrice: 7513.75,
      },
      proposedEntry: 7518,
      proposedStop: 7522,
      riskPoints: 4,
      fvgZones: [{
        direction: 'SHORT',
        upper: 7520,
        lower: 7516,
        midpoint: 7518,
        formedAt: '2026-06-05T10:00:00-04:00',
        formedCandleIndex: 1,
        filledPercent: 50,
        impulseQualified: true,
        confidence: 'High',
      }],
      targetObjectives: [
        {
          label: 'Behind-price London low',
          price: 7547,
          direction: 'SHORT',
          source: 'app',
          type: 'liquidity_pool',
          confidence: 'High',
          score: 90,
          reason: 'Behind current price and must be skipped.',
        },
        {
          label: 'Forward sell-side liquidity',
          price: 7505,
          direction: 'SHORT',
          source: 'app',
          type: 'liquidity_pool',
          confidence: 'High',
          score: 80,
          reason: 'Forward target below current price.',
        },
      ],
    });
    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });
    const candidate = result.candidates.find((entry) => entry.setupType === SetupType.OpeningDriveFvgContinuation);

    assert.ok(candidate);
    assert.equal(candidate.candidateState, 'HUMAN_REVIEW_READY');
    assert.ok(candidate.evidence.some((item) => item.includes('Forward sell-side liquidity 7505')));
    assert.equal(candidate.evidence.some((item) => item.includes('Behind-price London low')), false);
    assert.equal(candidate.missingEvidence.includes('Forward target room remains after the FVG retest'), false);
  }],

  ['HTF displacement FVG continuation is conditional when less than 60 percent path remains', () => {
    const base = htfDisplacementContinuationContext('SHORT');
    const context = htfDisplacementContinuationContext('SHORT', {
      keyLevels: {
        ...base.keyLevels,
        currentPrice: 7576,
      },
    });

    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });
    const candidate = result.candidates.find((entry) => entry.setupType === SetupType.HtfDisplacementFvgContinuation);

    assert.ok(candidate);
    assert.equal(candidate.candidateState, 'MSS_HOLD_TRIGGER_PENDING');
    assert.equal(candidate.executionStatus, ExecutionStatus.Conditional);
    assert.equal(candidate.blockReason, NoTradeReason.ChasingExtendedMove);
    assert.ok(candidate.missingEvidence.includes('At least 60% of the path to primary liquidity remains'));
    assert.ok(candidate.nextAction.includes('NO FRESH ENTRY'));
    assert.notEqual(result.bestExecutableCandidate?.setupType, SetupType.HtfDisplacementFvgContinuation);
  }],

  ['HTF displacement FVG continuation does not become executable without protected stop', () => {
    const context = htfDisplacementContinuationContext('SHORT', {
      proposedStop: null,
      riskPoints: null,
      riskStatus: 'Unknown',
    });

    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });
    const candidate = result.candidates.find((entry) => entry.setupType === SetupType.HtfDisplacementFvgContinuation);

    assert.ok(candidate);
    assert.equal(candidate.executionStatus, ExecutionStatus.Conditional);
    assert.equal(candidate.riskAdvisoryStatus, 'RISK_INVALID_OR_UNDEFINED');
    assert.ok(candidate.missingEvidence.includes('Protected 5M structure stop'));
    assert.notEqual(result.bestExecutableCandidate?.setupType, SetupType.HtfDisplacementFvgContinuation);
  }],

  ['HTF displacement FVG continuation does not become executable without external liquidity target', () => {
    const base = htfDisplacementContinuationContext('SHORT');
    const context = htfDisplacementContinuationContext('SHORT', {
      targetObjectives: [],
      keyLevels: {
        ...base.keyLevels,
        previousDayLow: null,
        priorDayLow: null,
        overnightLow: null,
        londonLow: null,
        activeSwingLow: null,
      },
      multiTimeframeContext: {
        ...base.multiTimeframeContext!,
        targetMap: { levelsToWatch: [] },
      },
      higherTimeframeThesis: {
        ...base.higherTimeframeThesis!,
        drawOnLiquidity: null,
        drawOnLiquidityLabel: null,
      },
    });

    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });
    const candidate = result.candidates.find((entry) => entry.setupType === SetupType.HtfDisplacementFvgContinuation);

    assert.ok(candidate);
    assert.equal(candidate.executionStatus, ExecutionStatus.Conditional);
    assert.ok(candidate.missingEvidence.includes('External liquidity target'));
    assert.notEqual(result.bestExecutableCandidate?.setupType, SetupType.HtfDisplacementFvgContinuation);
  }],

  ['Failed Plan Reversal creates a short candidate only after fresh 5M trigger and normal levels', () => {
    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: failedPlanReversalContext('SHORT'), result: null });
    const candidate = result.candidates.find((entry) => entry.setupType === SetupType.FailedPlanReversal);

    assert.ok(candidate);
    assert.equal(candidate.pathway, 'failed_plan_reversal');
    assert.equal(candidate.direction, 'SHORT');
    assert.equal(candidate.candidateState, 'OPPOSITE_SIDE_TRIGGER_CONFIRMED');
    assert.equal(candidate.executionStatus, ExecutionStatus.Executable);
    assert.equal(candidate.failedPlanReversal?.approvesExecution, false);
    assert.equal(candidate.failedPlanReversal?.originalPlanDirection, 'LONG');
    assert.ok(candidate.evidence.some((item) => item.includes('5M trigger status: confirmed')));
    assert.ok(candidate.evidence.some((item) => item.includes('Failed Plan Reversal does not approve execution')));
  }],

  ['Failed Plan Reversal supports long and short symmetry', () => {
    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: failedPlanReversalContext('LONG'), result: null });
    const candidate = result.candidates.find((entry) => entry.setupType === SetupType.FailedPlanReversal);

    assert.ok(candidate);
    assert.equal(candidate.direction, 'LONG');
    assert.equal(candidate.candidateState, 'OPPOSITE_SIDE_TRIGGER_CONFIRMED');
    assert.equal(candidate.executionStatus, ExecutionStatus.Executable);
    assert.equal(candidate.failedPlanReversal?.originalPlanDirection, 'SHORT');
    assert.ok(candidate.requiredTrigger?.includes('failed short decision level'));
  }],

  ['Failed Plan Reversal remains conditional when 5M trigger is pending', () => {
    const base = failedPlanReversalContext('SHORT');
    const context = failedPlanReversalContext('SHORT', {
      failedPlanReversal: {
        ...base.failedPlanReversal!,
        fiveMinuteTriggerStatus: 'pending_retest',
        decisionState: 'OPPOSITE_SIDE_RETEST_PENDING',
        createsCandidate: false,
      },
    });

    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });
    const candidate = result.candidates.find((entry) => entry.setupType === SetupType.FailedPlanReversal);

    assert.ok(candidate);
    assert.equal(candidate.candidateState, 'OPPOSITE_SIDE_RETEST_PENDING');
    assert.equal(candidate.executionStatus, ExecutionStatus.Conditional);
    assert.equal(candidate.blockReason, NoTradeReason.EntryTriggerPending);
    assert.ok(candidate.missingEvidence.includes('Fresh completed 5M opposite-side trigger/retest is not confirmed'));
  }],

  ['Failed Plan Reversal cannot become executable when stale or no fresh entry', () => {
    const base = failedPlanReversalContext('SHORT');
    const context = failedPlanReversalContext('SHORT', {
      failedPlanReversal: {
        ...base.failedPlanReversal!,
        fiveMinuteTriggerStatus: 'no_fresh_entry',
        decisionState: 'NO_FRESH_ENTRY',
        staleOrNoFreshEntry: true,
      },
    });

    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });
    const candidate = result.candidates.find((entry) => entry.setupType === SetupType.FailedPlanReversal);

    assert.ok(candidate);
    assert.equal(candidate.candidateState, 'NO_FRESH_ENTRY');
    assert.equal(candidate.executionStatus, ExecutionStatus.Conditional);
    assert.equal(candidate.blockReason, NoTradeReason.ChasingExtendedMove);
    assert.ok(candidate.nextAction.includes('NO FRESH ENTRY'));
    assert.notEqual(result.bestExecutableCandidate?.setupType, SetupType.FailedPlanReversal);
  }],

  ['Failed Plan Reversal HTF conflict blocks executable candidate creation', () => {
    const base = failedPlanReversalContext('SHORT');
    const context = failedPlanReversalContext('SHORT', {
      failedPlanReversal: {
        ...base.failedPlanReversal!,
        htfStackStatus: 'conflict',
        blockers: ['One or more required HTF frames materially conflict with the opposite-side move.'],
      },
    });

    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });
    const candidate = result.candidates.find((entry) => entry.setupType === SetupType.FailedPlanReversal);

    assert.ok(candidate);
    assert.equal(candidate.executionStatus, ExecutionStatus.Conditional);
    assert.ok(candidate.missingEvidence.includes('Opposite HTF stack is conflict; requires 15M, 1H, 2H, and 4H structure confirmation before the 5M execution trigger can create a candidate'));
    assert.notEqual(result.bestExecutableCandidate?.setupType, SetupType.FailedPlanReversal);
  }],

  ['Failed Plan Reversal requires 2H and 4H confirmation before 5M execution trigger can create candidate', () => {
    const base = failedPlanReversalContext('SHORT');
    const context = failedPlanReversalContext('SHORT', {
      failedPlanReversal: {
        ...base.failedPlanReversal!,
        htfStackStatus: 'mixed',
        timeframeConfirmations: base.failedPlanReversal!.timeframeConfirmations.map((item) =>
          item.timeframe === '2H' || item.timeframe === '4H'
            ? { ...item, direction: 'NEUTRAL', status: 'neutral', evidence: [`${item.timeframe} does not confirm opposite structure.`] }
            : item
        ),
        blockers: ['15M, 1H, 2H, and 4H structure confirmation is required before the 5M execution trigger can create a candidate.'],
        createsCandidate: false,
      },
    });

    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: context, result: null });
    const candidate = result.candidates.find((entry) => entry.setupType === SetupType.FailedPlanReversal);

    assert.ok(candidate);
    assert.equal(candidate.executionStatus, ExecutionStatus.Conditional);
    assert.equal(candidate.failedPlanReversal?.createsCandidate, false);
    assert.notEqual(result.bestExecutableCandidate?.setupType, SetupType.FailedPlanReversal);
    assert.ok(candidate.missingEvidence.some((item) => item.includes('15M, 1H, 2H, and 4H structure confirmation')));
  }],

  ['Phase 3B HTF setup label and journal record use the approved model name', () => {
    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: htfMssContext('LONG'), result: null });
    const htfCandidate = htfPathwayCandidate(result);

    assert.ok(htfCandidate);
    assert.equal(htfCandidate.setupType, SetupType.HtfDrawContinuationAfterRaid);
    assert.equal(htfCandidate.scenarioLabel, 'HTF Draw Continuation After Raid/Reclaim');
    assert.equal(normalizeIctModelLabel(htfCandidate.setupType), 'HTF Draw Continuation After Raid/Reclaim');
    assert.equal(normalizeCandidateIctModelLabel(htfCandidate), 'HTF Draw Continuation After Raid/Reclaim');

    const journal = buildTradeJournalRecord({
      dateTime: '2026-06-01T10:35:00-04:00',
      instrument: 'MES',
      session: 'morning',
      candidate: htfCandidate,
    });

    assert.equal(journal.modelType, 'HTF Draw Continuation After Raid/Reclaim');
    assert.ok(journal.setupTags.includes('sweep'));
    assert.ok(journal.setupTags.includes('reclaim'));
    assert.ok(journal.setupTags.includes('displacement'));
    assert.ok(journal.setupTags.includes('MSS'));
  }],

  ['HTF displacement FVG continuation label and journal record use the approved model name', () => {
    const result = scanSetupCandidates({ sessionType: 'morning', chartContext: htfDisplacementContinuationContext('SHORT'), result: null });
    const candidate = result.candidates.find((entry) => entry.setupType === SetupType.HtfDisplacementFvgContinuation);

    assert.ok(candidate);
    assert.equal(candidate.scenarioLabel, 'HTF Displacement + FVG Continuation');
    assert.equal(normalizeIctModelLabel(candidate.setupType), 'HTF Displacement + FVG Continuation');
    assert.equal(normalizeCandidateIctModelLabel(candidate), 'HTF Displacement + FVG Continuation');

    const journal = buildTradeJournalRecord({
      dateTime: '2026-06-03T11:25:00-04:00',
      instrument: 'MES',
      session: 'morning',
      candidate,
    });

    assert.equal(journal.modelType, 'HTF Displacement + FVG Continuation');
    assert.ok(journal.setupTags.includes('FVG'));
    assert.ok(journal.setupTags.includes('displacement'));
  }],

  ['Phase F bullish Turtle Soup qualifies with raid reclaim stop target and 2R', () => {
    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: bullishTurtleSoupContext(), result: null });
    const turtle = result.candidates.find((candidate) => candidate.setupType === SetupType.TurtleSoup);

    assert.ok(turtle);
    assert.equal(turtle.detectedStatus, SetupCandidateStatus.Detected);
    assert.equal(turtle.executionStatus, ExecutionStatus.Executable);
    assert.equal(turtle.direction, 'LONG');
    assert.equal(turtle.entry, 7397);
    assert.equal(turtle.stop, 7393.75);
    assert.ok(turtle.stop! < 7394);
    assert.equal(turtle.target2, 7404);
    assert.ok(turtle.evidence.includes('Liquidity raid confirmed'));
    assert.ok(turtle.evidence.includes('Established liquidity level confirmed'));
    assert.ok(turtle.evidence.includes('Sweep below sell-side liquidity confirmed'));
    assert.ok(turtle.evidence.includes('Reclaim after sweep confirmed'));
    assert.ok(turtle.evidence.includes('Failed continuation confirmed'));
    assert.ok(turtle.evidence.includes('Stop beyond sweep wick'));
    assert.ok(turtle.evidence.includes('Targeting opposing liquidity'));
    assert.ok(turtle.evidence.includes('Minimum 2.0R available'));
  }],

  ['active timeframe MSS ruleset applies to Turtle Soup execution models', () => {
    const context = bullishTurtleSoupContext();
    context.timeframeMssEvidence = timeframeMssEvidenceLayer('bearish');

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const turtle = result.candidates.find((candidate) => candidate.setupType === SetupType.TurtleSoup);

    assert.ok(turtle);
    assert.equal(turtle.detectedStatus, SetupCandidateStatus.Detected);
    assert.equal(turtle.executionStatus, ExecutionStatus.Conditional);
    assert.equal(turtle.activeRuleset?.timeframeMss?.applied, true);
    assert.equal(turtle.activeRuleset?.timeframeMss?.appliesToAllModels, true);
    assert.equal(turtle.activeRuleset?.timeframeMss?.affectsExecution, true);
    assert.ok(turtle.missingEvidence.includes('Active timeframe MSS ruleset found opposing completed 5M bearish MSS.'));
  }],

  ['Phase F bearish Turtle Soup qualifies with raid reclaim stop target and 2R', () => {
    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: bearishTurtleSoupContext(), result: null });
    const turtle = result.candidates.find((candidate) => candidate.setupType === SetupType.TurtleSoup);

    assert.ok(turtle);
    assert.equal(turtle.detectedStatus, SetupCandidateStatus.Detected);
    assert.equal(turtle.executionStatus, ExecutionStatus.Executable);
    assert.equal(turtle.direction, 'SHORT');
    assert.equal(turtle.entry, 7403);
    assert.equal(turtle.stop, 7406.25);
    assert.ok(turtle.stop! > 7406);
    assert.equal(turtle.target2, 7396);
    assert.ok(turtle.evidence.includes('Sweep above buy-side liquidity confirmed'));
    assert.ok(turtle.evidence.includes('Established liquidity level confirmed'));
  }],

  ['Turtle Soup requires an established prior swing or session liquidity level', () => {
    const context = bullishTurtleSoupContext();
    context.liquidityEvents = (context.liquidityEvents || []).map((event) => ({
      ...event,
      sweptLevelLabel: 'fresh local wick',
      evidence: 'Fresh local wick was tagged by the execution chart.',
    }));
    context.liquiditySweeps = (context.liquiditySweeps || []).map((event) => ({
      ...event,
      sweptLevelLabel: 'fresh local wick',
      evidence: 'Fresh local wick was tagged by the execution chart.',
    }));

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const turtle = result.candidates.find((candidate) => candidate.setupType === SetupType.TurtleSoup);

    assert.ok(turtle);
    assert.equal(turtle.detectedStatus, SetupCandidateStatus.NotDetected);
    assert.notEqual(turtle.executionStatus, ExecutionStatus.Executable);
    assert.ok(turtle.missingEvidence.includes('Turtle Soup requires an established prior swing or session liquidity level'));
  }],

  ['Turtle Soup accepts a matching established session liquidity level', () => {
    const context = bullishTurtleSoupContext();
    context.liquidityEvents = (context.liquidityEvents || []).map((event) => ({
      ...event,
      sweptLevelLabel: 'local low',
      evidence: 'Local low was swept and reclaimed.',
    }));
    context.liquiditySweeps = (context.liquiditySweeps || []).map((event) => ({
      ...event,
      sweptLevelLabel: 'local low',
      evidence: 'Local low was swept and reclaimed.',
    }));
    context.structuralLevels = [{
      label: 'Previous RTH low',
      price: 7396,
      type: 'low',
      source: 'previous_rth',
      directionRelevance: 'LONG',
      confidence: 'High',
      strengthScore: 85,
      strengthLabel: 'High',
      evidence: 'Prior RTH sell-side liquidity.',
    }];

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const turtle = result.candidates.find((candidate) => candidate.setupType === SetupType.TurtleSoup);

    assert.ok(turtle);
    assert.equal(turtle.detectedStatus, SetupCandidateStatus.Detected);
    assert.equal(turtle.executionStatus, ExecutionStatus.Executable);
    assert.ok(turtle.evidence.includes('Established liquidity level confirmed'));
  }],

  ['Killzone-style context supports approved models without creating a new model', () => {
    const context = bullishTurtleSoupContext();
    context.chartTimestamp = '2026-05-08T10:15:00';

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const turtle = result.candidates.find((candidate) => candidate.setupType === SetupType.TurtleSoup);

    assert.ok(turtle);
    assert.equal(turtle.executionStatus, ExecutionStatus.Executable);
    assert.ok(turtle.evidence.includes('Active window: Morning setup scan, 10:00-12:00 ET'));
    assert.ok(turtle.evidence.includes('Draw on opposing liquidity identified'));
    assert.ok(turtle.evidence.includes('Sweep-first sequence confirmed'));
    assert.ok(result.candidates.every((candidate) => isPrimarySetupCandidate(candidate)));
  }],

  ['Continuous Lunch/PM setup scan context stays supportive through 12:45 ET', () => {
    const context = bullishTurtleSoupContext();
    context.sessionType = 'replay_lunch';
    context.chartTimestamp = '2026-05-08T12:45:00';

    const result = scanSetupCandidates({ sessionType: 'replay_lunch', chartContext: context, result: null });
    const turtle = result.candidates.find((candidate) => candidate.setupType === SetupType.TurtleSoup);

    assert.ok(turtle);
    assert.ok(turtle.evidence.includes('Active window: Lunch/PM setup scan, 12:00-15:30 ET'));
    assert.equal(turtle.missingEvidence.includes('Fragmented lunch cutoff requires extra confirmation'), false);
    assert.ok(result.candidates.every((candidate) => isPrimarySetupCandidate(candidate)));
  }],

  ['Major BOS after inducement sweep boosts approved Model 1 structure quality', () => {
    const context = structuredContext();
    context.higherTimeframeThesis = {
      direction: 'LONG',
      confidence: 'High',
      sourceTimeframes: ['240m', '60m', '15m'],
      reason: 'Higher-timeframe thesis is bullish.',
      invalidationLevel: 7396,
      drawOnLiquidity: 7420,
      drawOnLiquidityLabel: 'Prior day high',
    };
    context.structureQualityContext = {
      direction: 'LONG',
      structureEvent: 'major_bos',
      structureTimeframe: '15m',
      executionTimeframeConfirmed: true,
      inducementSwept: true,
      validPullbackConfirmed: true,
      structureBreakConfirmedByClose: true,
      wickOnlyBreak: false,
      oldInducementStale: false,
      newInducementRequired: false,
      noChaseRequired: false,
      inducementFresh: true,
      inducementAgeBars: 3,
      reasons: [],
      missingReasons: [],
    };

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const modelOne = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(modelOne);
    assert.equal(modelOne.executionStatus, ExecutionStatus.Executable);
    assert.ok(modelOne.evidence.includes('Higher-timeframe thesis is bullish'));
    assert.ok(modelOne.evidence.includes('Major BOS confirmed after inducement sweep'));
    assert.ok(modelOne.evidence.includes('Liquidity engineered before structure break'));
    assert.ok(modelOne.evidence.includes('Valid pullback confirmed'));
  }],

  ['Major BOS after inducement sweep can support Turtle Soup without becoming a model', () => {
    const context = bullishTurtleSoupContext();
    context.chartTimestamp = '2026-05-08T10:15:00';
    context.higherTimeframeThesis = {
      direction: 'LONG',
      confidence: 'Medium',
      sourceTimeframes: ['60m', '15m'],
      reason: 'Higher-timeframe thesis is bullish.',
      drawOnLiquidity: 7404,
      drawOnLiquidityLabel: 'Opposing buy-side liquidity',
    };
    context.structureQualityContext = {
      direction: 'LONG',
      structureEvent: 'major_bos',
      structureTimeframe: '15m',
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
      reasons: [],
      missingReasons: [],
    };

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const turtle = result.candidates.find((candidate) => candidate.setupType === SetupType.TurtleSoup);

    assert.ok(turtle);
    assert.equal(turtle.executionStatus, ExecutionStatus.Executable);
    assert.ok(turtle.evidence.includes('Major BOS confirmed after inducement sweep'));
    assert.ok(turtle.evidence.includes('Valid pullback confirmed'));
    assert.ok(result.candidates.every((candidate) => isPrimarySetupCandidate(candidate)));
  }],

  ['Minor BOS without inducement downgrades otherwise valid setup to Conditional', () => {
    const context = structuredContext();
    context.structureQualityContext = {
      direction: 'LONG',
      structureEvent: 'minor_bos',
      structureTimeframe: '15m',
      executionTimeframeConfirmed: false,
      inducementSwept: false,
      validPullbackConfirmed: false,
      structureBreakConfirmedByClose: true,
      wickOnlyBreak: false,
      oldInducementStale: true,
      newInducementRequired: true,
      noChaseRequired: true,
      inducementFresh: false,
      inducementAgeBars: 8,
      reasons: [],
      missingReasons: [],
    };

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const modelOne = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(modelOne);
    assert.equal(modelOne.detectedStatus, SetupCandidateStatus.Possible);
    assert.equal(modelOne.executionStatus, ExecutionStatus.Conditional);
    assert.ok(modelOne.missingEvidence.includes('Minor BOS only'));
    assert.ok(modelOne.missingEvidence.includes('Inducement was not swept before structure break'));
    assert.ok(modelOne.missingEvidence.includes('Wait for new inducement sweep'));
    assert.ok(modelOne.missingEvidence.includes('Do not chase BOS candle'));
    assert.ok(modelOne.missingEvidence.includes('Original inducement is stale'));
    assert.ok(modelOne.nextAction.includes('Do not chase the BOS candle'));
  }],

  ['Wick grab alone is not valid pullback confirmation', () => {
    const context = structuredContext();
    context.structureQualityContext = {
      direction: 'LONG',
      structureEvent: 'major_bos',
      structureTimeframe: '15m',
      executionTimeframeConfirmed: false,
      inducementSwept: true,
      validPullbackConfirmed: false,
      structureBreakConfirmedByClose: false,
      wickOnlyBreak: true,
      oldInducementStale: false,
      newInducementRequired: false,
      noChaseRequired: true,
      inducementFresh: true,
      inducementAgeBars: 1,
      reasons: ['Pullback grab occurred'],
      missingReasons: [],
    };

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const modelOne = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(modelOne);
    assert.equal(modelOne.executionStatus, ExecutionStatus.Conditional);
    assert.ok(modelOne.evidence.includes('Pullback grab occurred'));
    assert.ok(modelOne.missingEvidence.includes('Wick-only break is not structure confirmation'));
    assert.ok(modelOne.missingEvidence.includes('Pullback grab occurred; closing break required'));
  }],

  ['CHOCH at meaningful higher-timeframe level can support reversal quality', () => {
    const context = bearishTurtleSoupContext();
    context.higherTimeframeThesis = {
      direction: 'SHORT',
      confidence: 'High',
      sourceTimeframes: ['240m', '60m'],
      reason: 'Higher-timeframe thesis is bearish.',
      drawOnLiquidity: 7396,
      drawOnLiquidityLabel: 'Opposing sell-side liquidity',
    };
    context.structureQualityContext = {
      direction: 'SHORT',
      structureEvent: 'choch',
      structureTimeframe: '15m',
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
      chochLocationType: 'prior_rth',
      reasons: [],
      missingReasons: [],
    };

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const turtle = result.candidates.find((candidate) => candidate.setupType === SetupType.TurtleSoup);

    assert.ok(turtle);
    assert.ok(turtle.evidence.includes('CHOCH at meaningful higher-timeframe level'));
    assert.ok(!turtle.missingEvidence.includes('Random CHOCH location; do not flip bias yet'));
  }],

  ['Random CHOCH location does not flip bias or approve execution by itself', () => {
    const context = bearishTurtleSoupContext();
    context.higherTimeframeThesis = {
      direction: 'LONG',
      confidence: 'High',
      sourceTimeframes: ['240m', '60m'],
      reason: 'Higher-timeframe thesis is bullish.',
      drawOnLiquidity: 7416,
      drawOnLiquidityLabel: 'Prior high',
    };
    context.structureQualityContext = {
      direction: 'SHORT',
      structureEvent: 'choch',
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
      inducementAgeBars: 1,
      chochAtMeaningfulLocation: false,
      chochLocationType: 'midrange',
      conflictsWithHigherTimeframeThesis: true,
      reasons: [],
      missingReasons: [],
    };

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const turtle = result.candidates.find((candidate) => candidate.setupType === SetupType.TurtleSoup);

    assert.ok(turtle);
    assert.equal(turtle.executionStatus, ExecutionStatus.Conditional);
    assert.ok(turtle.missingEvidence.includes('Random CHOCH location; do not flip bias yet'));
    assert.ok(turtle.missingEvidence.includes('Structure signal conflicts with higher-timeframe thesis'));
    assert.ok(result.candidates.every((candidate) => isPrimarySetupCandidate(candidate)));
  }],

  ['Premium discount alignment supports longs from discount', () => {
    const context = structuredContext();
    context.dealingRangeQuality = {
      rangeHigh: 7420,
      rangeLow: 7380,
      midpoint: 7400,
      currentPrice: 7396,
      location: 'discount',
      rangeSource: '15m',
      confidence: 'High',
      reason: 'Price is below equilibrium.',
    };

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const modelOne = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(modelOne);
    assert.ok(modelOne.evidence.includes('Premium/discount alignment'));
    assert.equal(modelOne.executionStatus, ExecutionStatus.Executable);
  }],

  ['Long in premium is conditional unless reversal logic is strong', () => {
    const context = structuredContext();
    context.dealingRangeQuality = {
      rangeHigh: 7420,
      rangeLow: 7380,
      midpoint: 7400,
      currentPrice: 7412,
      location: 'premium',
      rangeSource: '15m',
      confidence: 'High',
    };

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const modelOne = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(modelOne);
    assert.equal(modelOne.executionStatus, ExecutionStatus.Conditional);
    assert.ok(modelOne.missingEvidence.includes('Avoid longs in premium unless reversal logic is strong'));
  }],

  ['Target-before-entry check downgrades trade when nearest obstacle sits before 1R', () => {
    const context = structuredContext();
    context.targetObjectives = [{
      label: '15M reaction obstacle',
      price: 7402,
      direction: 'LONG',
      source: 'app',
      type: 'imbalance_zone',
      confidence: 'High',
      score: 70,
      reason: 'Obstacle sits before one R from entry.',
    }];

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const modelOne = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(modelOne);
    assert.equal(modelOne.executionStatus, ExecutionStatus.Conditional);
    assert.ok(modelOne.missingEvidence.some((item) => item.includes('Nearest obstacle sits before 1R')));
  }],

  ['Tier A displacement quality boosts structure reasons', () => {
    const context = structuredContext();
    context.displacementCandles = (context.displacementCandles || []).map((candle) => ({
      ...candle,
      quality: 'high_quality',
      bodyToRange: 0.72,
      closeLocation: 'top_quarter',
      leavesImbalance: true,
      breaksStructure: true,
    }));

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const modelOne = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(modelOne);
    assert.ok(modelOne.evidence.includes('Tier A displacement confirmed'));
  }],

  ['Chop session narrative downgrades otherwise valid setups', () => {
    const context = structuredContext();
    context.marketStructure = { ...context.marketStructure!, chopRangeCondition: true };
    context.sessionStory = {
      segments: [],
      displacementZones: [],
      relationships: [],
      bias: 'WAIT',
      summary: 'Balanced overlapping session.',
      targetLevels: [],
      notes: [],
    };

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const modelOne = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(modelOne);
    assert.equal(modelOne.executionStatus, ExecutionStatus.Conditional);
    assert.ok(modelOne.evidence.includes('Session narrative: chop'));
    assert.ok(modelOne.missingEvidence.includes('Chop/consolidation no-trade'));
  }],

  ['News macro caution window downgrades unconfirmed setup', () => {
    const context = structuredContext();
    context.newsMacroCaution = {
      active: true,
      eventLabel: 'High-impact macro release',
      minutesUntil: 2,
      confirmedAfterRelease: false,
      reason: 'Volatility event pending.',
    };

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const modelOne = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(modelOne);
    assert.equal(modelOne.executionStatus, ExecutionStatus.Conditional);
    assert.ok(modelOne.missingEvidence.some((item) => item.includes('High-impact news caution window')));
  }],

  ['big-picture bullish structure keeps countertrend bearish Turtle Soup conditional in morning', () => {
    const context = withBigPictureStructure(bearishTurtleSoupContext(), 'LONG');
    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const turtle = result.candidates.find((candidate) => candidate.setupType === SetupType.TurtleSoup);

    assert.ok(turtle);
    assert.equal(turtle.direction, 'SHORT');
    assert.equal(turtle.detectedStatus, SetupCandidateStatus.Possible);
    assert.equal(turtle.executionStatus, ExecutionStatus.Conditional);
    assert.ok(turtle.evidence.includes('Big-picture structure is bullish'));
    assert.ok(turtle.missingEvidence.includes('Countertrend setup requires immediate failure confirmation; do not fight big-picture structure'));
    assert.ok(turtle.requiredTrigger?.includes('Countertrend bearish Turtle Soup'));
    assert.ok(turtle.nextAction.includes('Countertrend conditional only'));
  }],

  ['big-picture bearish structure keeps countertrend bullish Turtle Soup conditional in lunch', () => {
    const context = withBigPictureStructure(bullishTurtleSoupContext(), 'SHORT');
    context.sessionType = 'replay_lunch';
    const result = scanSetupCandidates({ sessionType: 'replay_lunch', chartContext: context, result: null });
    const turtle = result.candidates.find((candidate) => candidate.setupType === SetupType.TurtleSoup);

    assert.ok(turtle);
    assert.equal(turtle.direction, 'LONG');
    assert.equal(turtle.detectedStatus, SetupCandidateStatus.Possible);
    assert.equal(turtle.executionStatus, ExecutionStatus.Conditional);
    assert.ok(turtle.evidence.includes('Big-picture structure is bearish'));
    assert.ok(turtle.missingEvidence.includes('Countertrend setup requires immediate failure confirmation; do not fight big-picture structure'));
    assert.ok(turtle.requiredTrigger?.includes('Countertrend bullish Turtle Soup'));
  }],

  ['big-picture aligned Turtle Soup can still qualify in morning or lunch', () => {
    const morning = scanSetupCandidates({
      sessionType: 'replay_morning',
      chartContext: withBigPictureStructure(bullishTurtleSoupContext(), 'LONG'),
      result: null,
    }).candidates.find((candidate) => candidate.setupType === SetupType.TurtleSoup);
    const lunchContext = withBigPictureStructure(bearishTurtleSoupContext(), 'SHORT');
    lunchContext.sessionType = 'replay_lunch';
    const lunch = scanSetupCandidates({
      sessionType: 'replay_lunch',
      chartContext: lunchContext,
      result: null,
    }).candidates.find((candidate) => candidate.setupType === SetupType.TurtleSoup);

    assert.equal(morning?.executionStatus, ExecutionStatus.Executable);
    assert.equal(lunch?.executionStatus, ExecutionStatus.Executable);
    assert.ok(!morning?.missingEvidence.includes('Countertrend setup requires immediate failure confirmation; do not fight big-picture structure'));
    assert.ok(!lunch?.missingEvidence.includes('Countertrend setup requires immediate failure confirmation; do not fight big-picture structure'));
  }],

  ['Phase F Turtle Soup does not require FVG to qualify', () => {
    const context = bullishTurtleSoupContext();
    context.fvgZones = [];

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const turtle = result.candidates.find((candidate) => candidate.setupType === SetupType.TurtleSoup);

    assert.ok(turtle);
    assert.equal(turtle.executionStatus, ExecutionStatus.Executable);
    assert.ok(!turtle.evidence.includes('Fair value gap / imbalance entry model'));
  }],

  ['Phase F Turtle Soup does not require full MSS or displacement to remain conditional', () => {
    const context = bullishTurtleSoupContext();
    context.proposedEntry = null;
    context.displacementCandles = [];
    context.marketStructure = { ...context.marketStructure!, marketStructureShift: false, expansionCondition: false };

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const turtle = result.candidates.find((candidate) => candidate.setupType === SetupType.TurtleSoup);

    assert.ok(turtle);
    assert.equal(turtle.detectedStatus, SetupCandidateStatus.Possible);
    assert.equal(turtle.executionStatus, ExecutionStatus.Conditional);
    assert.ok(turtle.missingEvidence.includes('Valid entry after reclaim or retrace'));
    assert.ok(!turtle.missingEvidence.includes('Displacement'));
    assert.ok(!turtle.missingEvidence.includes('Market structure shift'));
  }],

  ['Phase F Turtle Soup sweep without reclaim does not qualify', () => {
    const context = bullishTurtleSoupContext();
    context.liquidityEvents = (context.liquidityEvents || []).map((event) => ({ ...event, reclaimed: false }));
    context.liquiditySweeps = (context.liquiditySweeps || []).map((event) => ({ ...event, reclaimed: false }));
    context.reclaimEvents = [];
    context.setupReadyFacts = { ...context.setupReadyFacts!, sweepThenReclaim: false };
    context.candleFacts = { ...context.candleFacts!, closeAboveKeyLevel: false, reclaimCandlePresent: false };

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const turtle = result.candidates.find((candidate) => candidate.setupType === SetupType.TurtleSoup);

    assert.ok(turtle);
    assert.notEqual(turtle.executionStatus, ExecutionStatus.Executable);
    assert.equal(turtle.detectedStatus, SetupCandidateStatus.Possible);
    assert.ok(turtle.missingEvidence.includes('Reclaim confirmation missing'));
  }],

  ['Phase F Turtle Soup sweep and reclaim without valid entry stays conditional', () => {
    const context = bullishTurtleSoupContext();
    context.proposedEntry = null;

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const turtle = result.candidates.find((candidate) => candidate.setupType === SetupType.TurtleSoup);

    assert.ok(turtle);
    assert.equal(turtle.entry, null);
    assert.equal(turtle.executionStatus, ExecutionStatus.Conditional);
    assert.ok(turtle.missingEvidence.includes('Valid entry after reclaim or retrace'));
  }],

  ['Phase F Turtle Soup stop on wrong side of sweep blocks qualification', () => {
    const context = bullishTurtleSoupContext();
    context.proposedStop = 7394.5;

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const turtle = result.candidates.find((candidate) => candidate.setupType === SetupType.TurtleSoup);

    assert.ok(turtle);
    assert.equal(turtle.stop, null);
    assert.notEqual(turtle.executionStatus, ExecutionStatus.Executable);
    assert.ok(turtle.missingEvidence.includes('Stop beyond sweep wick'));
  }],

  ['Phase F Turtle Soup target room below 2R blocks qualification', () => {
    const context = bullishTurtleSoupContext();
    context.targetObjectives = [{
      label: 'Near obstacle',
      price: 7401,
      direction: 'LONG',
      source: 'app',
      type: 'liquidity_pool',
      confidence: 'High',
      score: 80,
      reason: 'Nearest opposing liquidity is below 2R.',
    }];

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const turtle = result.candidates.find((candidate) => candidate.setupType === SetupType.TurtleSoup);

    assert.ok(turtle);
    assert.equal(turtle.target2, null);
    assert.equal(turtle.executionStatus, ExecutionStatus.Conditional);
    assert.ok(turtle.missingEvidence.includes('Minimum 2.0R unavailable'));
  }],

  ['Phase F Turtle Soup rejects wick-only reversal without liquidity raid', () => {
    const context = bullishTurtleSoupContext();
    context.liquidityEvents = [];
    context.liquiditySweeps = [];
    context.reclaimEvents = [];
    context.failedBreakEvents = [];

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const turtle = result.candidates.find((candidate) => candidate.setupType === SetupType.TurtleSoup);

    assert.ok(turtle);
    assert.equal(turtle.detectedStatus, SetupCandidateStatus.NotDetected);
    assert.notEqual(turtle.executionStatus, ExecutionStatus.Executable);
    assert.ok(turtle.missingEvidence.includes('Wick-only rejection is not enough without a meaningful liquidity raid'));
  }],

  ['Phase F supporting evidence remains tags and not standalone Turtle Soup candidates', () => {
    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: bullishTurtleSoupContext(), result: null });

    assert.equal(result.candidates.length, getPrimarySetupRegistry('replay_morning').length);
    assert.ok(result.candidates.some((candidate) => candidate.setupType === SetupType.TurtleSoup));
    assert.equal(result.candidates.find((candidate) => candidate.setupType === SetupType.LiquiditySweep), undefined);
    assert.equal(result.candidates.find((candidate) => candidate.setupType === SetupType.FairValueGap), undefined);
    assert.equal(result.candidates.find((candidate) => candidate.setupType === SetupType.MarketStructureShift), undefined);
  }],

  ['Phase F deprecated setup types still cannot create active candidates', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      chartContext: bullishTurtleSoupContext(),
      result: resultWithText('Neutral structured context should preserve the primary-model-only candidate set.', 7397, 7393.75, 'TRIGGERED'),
    });

    assert.ok(result.candidates.every((candidate) => isPrimarySetupCandidate(candidate)));
    for (const entry of SETUP_REGISTRY.filter((entry) => entry.role === 'deprecated')) {
      assert.equal(result.candidates.find((candidate) => candidate.setupType === entry.setupType), undefined);
    }
  }],

  ['Phase G Breaker plus FVG overlap adds confluence to a valid Model 1 setup', () => {
    const context = structuredContext();
    context.breakerZones = [{
      direction: 'LONG',
      lower: 7399,
      upper: 7400.5,
      midpoint: 7399.75,
      confidence: 'High',
      evidence: 'Breaker overlaps the bullish FVG retrace.',
    }];

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const modelOne = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(modelOne);
    assert.equal(modelOne.executionStatus, ExecutionStatus.Executable);
    assert.ok(modelOne.evidence.includes('Breaker + FVG overlap confluence'));
    assert.ok(modelOne.evidence.includes('Entry inside breaker/FVG overlap'));
    assert.ok(modelOne.evidence.includes('FVG retrace supported by breaker overlap'));
  }],

  ['Phase G Breaker plus FVG overlap can support Turtle Soup', () => {
    const context = bullishTurtleSoupContext();
    context.fvgZones = [{
      direction: 'LONG',
      lower: 7396.5,
      upper: 7398,
      midpoint: 7397.25,
      impulseQualified: true,
      confidence: 'High',
    }];
    context.breakerZones = [{
      direction: 'LONG',
      lower: 7396.75,
      upper: 7397.25,
      midpoint: 7397,
      confidence: 'High',
      evidence: 'Breaker overlaps the FVG entry area.',
    }];

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const turtle = result.candidates.find((candidate) => candidate.setupType === SetupType.TurtleSoup);

    assert.ok(turtle);
    assert.equal(turtle.executionStatus, ExecutionStatus.Executable);
    assert.ok(turtle.evidence.includes('Breaker + FVG overlap confluence'));
    assert.ok(turtle.evidence.includes('Entry inside breaker/FVG overlap'));
  }],

  ['Phase G Breaker plus FVG overlap cannot create a candidate by itself', () => {
    const context = structuredContext();
    context.liquidityEvents = [];
    context.liquiditySweeps = [];
    context.reclaimEvents = [];
    context.failedBreakEvents = [];
    context.displacementCandles = [];
    context.marketStructure = { ...context.marketStructure!, marketStructureShift: false, expansionCondition: false };
    context.setupReadyFacts = { pullbackIntoFvg: true, fvgReclaimed: true, breakOfStructure: false, sweepThenReclaim: false };
    context.breakerZones = [{
      direction: 'LONG',
      lower: 7399,
      upper: 7400.5,
      midpoint: 7399.75,
      confidence: 'High',
    }];

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });

    assert.equal(result.candidates.length, getPrimarySetupRegistry('replay_morning').length);
    assert.equal(result.candidates.find((candidate) => candidate.setupType === SetupType.BreakerBlock), undefined);
    assert.equal(result.bestExecutableCandidate, null);
  }],

  ['Phase G BreakerBlock supporting evidence cannot become a primary candidate', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      chartContext: bullishTurtleSoupContext(),
      result: resultWithText('Breaker block overlap with imbalance is visible.', 7397, 7393.75, 'TRIGGERED'),
    });

    assert.equal(result.candidates.find((candidate) => candidate.setupType === SetupType.BreakerBlock), undefined);
    assert.ok(result.candidates.every((candidate) => isPrimarySetupCandidate(candidate)));
  }],

  ['Phase G Breaker plus FVG overlap cannot override missing Model 1 sweep', () => {
    const context = structuredContext();
    context.liquidityEvents = [];
    context.liquiditySweeps = [];
    context.breakerZones = [{
      direction: 'LONG',
      lower: 7399,
      upper: 7400.5,
      midpoint: 7399.75,
      confidence: 'High',
    }];

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const modelOne = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(modelOne);
    assert.notEqual(modelOne.executionStatus, ExecutionStatus.Executable);
    assert.ok(modelOne.missingEvidence.includes('Liquidity sweep'));
  }],

  ['Phase G Breaker plus FVG overlap cannot override missing Model 1 displacement or MSS', () => {
    const context = structuredContext();
    context.displacementCandles = [];
    context.marketStructure = { ...context.marketStructure!, marketStructureShift: false, expansionCondition: false };
    context.setupReadyFacts = { ...context.setupReadyFacts!, breakOfStructure: false };
    context.breakerZones = [{
      direction: 'LONG',
      lower: 7399,
      upper: 7400.5,
      midpoint: 7399.75,
      confidence: 'High',
    }];

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const modelOne = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(modelOne);
    assert.equal(modelOne.executionStatus, ExecutionStatus.Conditional);
    assert.ok(modelOne.missingEvidence.includes('Displacement'));
    assert.ok(modelOne.missingEvidence.includes('Market structure shift'));
  }],

  ['Phase G Breaker plus FVG overlap cannot override missing Turtle Soup reclaim', () => {
    const context = bullishTurtleSoupContext();
    context.liquidityEvents = (context.liquidityEvents || []).map((event) => ({ ...event, reclaimed: false }));
    context.liquiditySweeps = (context.liquiditySweeps || []).map((event) => ({ ...event, reclaimed: false }));
    context.reclaimEvents = [];
    context.setupReadyFacts = { ...context.setupReadyFacts!, sweepThenReclaim: false };
    context.candleFacts = { ...context.candleFacts!, closeAboveKeyLevel: false, reclaimCandlePresent: false };
    context.fvgZones = [{
      direction: 'LONG',
      lower: 7396.5,
      upper: 7398,
      midpoint: 7397.25,
      impulseQualified: true,
      confidence: 'High',
    }];
    context.breakerZones = [{
      direction: 'LONG',
      lower: 7396.75,
      upper: 7397.25,
      midpoint: 7397,
      confidence: 'High',
    }];

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const turtle = result.candidates.find((candidate) => candidate.setupType === SetupType.TurtleSoup);

    assert.ok(turtle);
    assert.notEqual(turtle.executionStatus, ExecutionStatus.Executable);
    assert.ok(turtle.missingEvidence.includes('Reclaim confirmation missing'));
    assert.ok(turtle.evidence.includes('Breaker + FVG overlap confluence'));
  }],

  ['Phase G Breaker plus FVG overlap cannot bypass minimum 2R', () => {
    const context = bullishTurtleSoupContext();
    context.targetObjectives = [{
      label: 'Near opposing liquidity',
      price: 7401,
      direction: 'LONG',
      source: 'app',
      type: 'liquidity_pool',
      confidence: 'High',
      score: 80,
      reason: 'Nearest opposing liquidity is below 2R.',
    }];
    context.fvgZones = [{
      direction: 'LONG',
      lower: 7396.5,
      upper: 7398,
      midpoint: 7397.25,
      impulseQualified: true,
      confidence: 'High',
    }];
    context.breakerZones = [{
      direction: 'LONG',
      lower: 7396.75,
      upper: 7397.25,
      midpoint: 7397,
      confidence: 'High',
    }];

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });
    const turtle = result.candidates.find((candidate) => candidate.setupType === SetupType.TurtleSoup);

    assert.ok(turtle);
    assert.equal(turtle.executionStatus, ExecutionStatus.Conditional);
    assert.equal(turtle.target2, null);
    assert.ok(turtle.missingEvidence.includes('Minimum 2.0R unavailable'));
  }],

  ['Phase G deprecated setup types still cannot create candidates with breaker confluence present', () => {
    const context = bullishTurtleSoupContext();
    context.fvgZones = [{
      direction: 'LONG',
      lower: 7396.5,
      upper: 7398,
      midpoint: 7397.25,
      impulseQualified: true,
      confidence: 'High',
    }];
    context.breakerZones = [{
      direction: 'LONG',
      lower: 7396.75,
      upper: 7397.25,
      midpoint: 7397,
      confidence: 'High',
    }];

    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      chartContext: context,
      result: resultWithText('Neutral structured context should preserve the primary-model-only candidate set.', 7397, 7393.75, 'TRIGGERED'),
    });

    assert.ok(result.candidates.every((candidate) => isPrimarySetupCandidate(candidate)));
    for (const entry of SETUP_REGISTRY.filter((entry) => entry.role === 'deprecated')) {
      assert.equal(result.candidates.find((candidate) => candidate.setupType === entry.setupType), undefined);
    }
  }],

  ['Phase G journal-facing candidate labels do not show BreakerBlock as a primary model', () => {
    const context = bullishTurtleSoupContext();
    context.fvgZones = [{
      direction: 'LONG',
      lower: 7396.5,
      upper: 7398,
      midpoint: 7397.25,
      impulseQualified: true,
      confidence: 'High',
    }];
    context.breakerZones = [{
      direction: 'LONG',
      lower: 7396.75,
      upper: 7397.25,
      midpoint: 7397,
      confidence: 'High',
    }];

    const result = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context, result: null });

    assert.deepEqual(
      new Set(result.candidates.map((candidate) => candidate.setupType)),
      new Set([
        SetupType.SweepMssFvgRetrace,
        SetupType.TurtleSoup,
        SetupType.HtfDrawContinuationAfterRaid,
        SetupType.HtfDisplacementMssContinuation,
        SetupType.HtfDisplacementFvgContinuation,
        SetupType.OpeningDriveFvgContinuation,
        SetupType.IntradayMssMicroContinuation,
        SetupType.FailedPlanReversal,
      ])
    );
    assert.ok(result.candidates.every((candidate) => candidate.scenarioLabel !== 'BreakerBlock'));
  }],

  ['narrative momentum long is not approved when structured candles show no expansion or continuation', () => {
    const context = structuredContext();
    context.setupEvidence = {};
    context.fvgZones = [];
    context.liquidityEvents = [];
    context.candles = [];
    context.candleFacts = {
      lastClosedCandleDirection: 'bullish',
      expansionCandlePresent: false,
      rejectionWickPresent: false,
      breatherCandlePresent: false,
      reclaimCandlePresent: false,
      pullbackPresent: false,
      closeAboveKeyLevel: false,
      closeBelowKeyLevel: false,
    };
    context.marketStructure = {
      trend: 'bullish',
      higherHigh: false,
      higherLow: false,
      lowerHigh: false,
      lowerLow: false,
      marketStructureShift: false,
      chopRangeCondition: true,
      compressionCondition: false,
      expansionCondition: false,
    };

    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      chartContext: context,
      result: resultWithText('Momentum long trade is confirmed and should execute.', 7400, 7396, 'TRIGGERED'),
    });
    const momentum = result.candidates.find((candidate) => candidate.setupType === SetupType.MomentumRunaway);

    assert.equal(momentum, undefined);
    assert.notEqual(result.bestExecutableCandidate?.setupType, SetupType.MomentumRunaway);
  }],

  ['liquidityEvents prior low sweep and reclaim detects Liquidity Sweep without narrative text', () => {
    const context = structuredContext();
    context.setupEvidence = {};
    context.fvgZones = [];
    context.liquidityEvents = [
      {
        type: 'sweep',
        direction: 'LONG',
        level: 7396,
        sweptLevelLabel: 'prior low',
        reclaimed: true,
        timestamp: '09:45',
        confidence: 'High',
        evidence: 'Prior low swept and reclaimed.',
      },
    ];

    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      chartContext: context,
      result: null,
    });
    const liquidity = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(liquidity);
    assert.equal(liquidity.detectedStatus, SetupCandidateStatus.Possible);
    assert.equal(liquidity.executionStatus, ExecutionStatus.Conditional);
  }],

  ['scanner does not require narrative text when structured evidence is present', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      chartContext: structuredContext(),
      result: null,
    });
    const liquidity = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(liquidity);
    assert.equal(liquidity.detectedStatus, SetupCandidateStatus.Detected);
    assert.equal(liquidity.executionStatus, ExecutionStatus.Executable);
    assert.equal(result.bestExecutableCandidate?.setupType, SetupType.SweepMssFvgRetrace);
  }],

  ['structured context requires manual confirmation when levels are unclear', () => {
    const context = structuredContext();
    context.setupEvidence = {
      momentumPullbackBreatherReclaim: {
        detected: true,
        direction: 'LONG',
        entry: null,
        stop: null,
        requiredTrigger: 'Manually confirm break of completed breather candle.',
        triggerState: 'PENDING_TRIGGER',
        confidence: 'Medium',
        evidence: ['Breather candle is visible.'],
        missingEvidence: ['Exact entry and stop labels are unclear.'],
      },
    };
    context.extractionWarnings = {
      priceLabelsUnreadable: true,
      levelsUnclear: true,
      manualEntryStopRequired: true,
      messages: ['Exact entry/stop levels require manual confirmation.'],
    };

    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      chartContext: context,
      result: resultWithText('Neutral baseline.', NaN, NaN),
    });
    const breather = result.candidates.find((candidate) => candidate.setupType === SetupType.MomentumPullbackBreatherReclaim);
    const primary = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.equal(breather, undefined);
    assert.ok(primary);
    assert.equal(primary.executionStatus, ExecutionStatus.Conditional);
    assert.equal(primary.entry, null);
    assert.equal(primary.stop, null);
    assert.ok(primary.missingEvidence.some((item) => item.toLowerCase().includes('manual') || item.toLowerCase().includes('unclear')));
  }],

  ['low level confidence forces manual confirmation even when structured entry and stop exist', () => {
    const context = structuredContext();
    context.levelReadConfidence = 'Low';
    context.extractionWarnings = {
      levelsUnclear: true,
      manualEntryStopRequired: true,
      messages: ['Level confidence is low.'],
    };

    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      chartContext: context,
      result: null,
    });
    const liquidity = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(liquidity);
    assert.equal(liquidity.executionStatus, ExecutionStatus.Conditional);
    assert.equal(liquidity.entry, null);
    assert.equal(liquidity.stop, null);
    assert.equal(liquidity.target1, null);
    assert.equal(liquidity.target2, null);
    assert.ok(liquidity.missingEvidence.includes('Exact entry/stop levels require manual confirmation.'));
  }],

  ['low entry stop confidence forces manual confirmation even when structured entry and stop exist', () => {
    const context = structuredContext();
    context.entryStopConfidence = 'Low';
    context.extractionWarnings = {
      manualEntryStopRequired: true,
      messages: ['Entry/stop confidence is low.'],
    };

    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      chartContext: context,
      result: null,
    });
    const liquidity = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(liquidity);
    assert.equal(liquidity.executionStatus, ExecutionStatus.Conditional);
    assert.equal(liquidity.entry, null);
    assert.equal(liquidity.stop, null);
    assert.equal(liquidity.target1, null);
    assert.equal(liquidity.target2, null);
  }],

  ['low screenshot quality forces manual confirmation and suppresses executable targets', () => {
    const context = structuredContext();
    context.screenshotQuality = 'Low';
    context.screenshotUsability = 'warning';
    context.extractionWarnings = {
      screenshotUnclear: true,
      manualEntryStopRequired: true,
      messages: ['Screenshot quality is low.'],
    };

    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      chartContext: context,
      result: null,
    });
    const liquidity = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(liquidity);
    assert.equal(liquidity.detectedStatus, SetupCandidateStatus.Possible);
    assert.equal(liquidity.executionStatus, ExecutionStatus.Conditional);
    assert.equal(liquidity.entry, null);
    assert.equal(liquidity.stop, null);
    assert.equal(liquidity.target1, null);
    assert.equal(liquidity.target2, null);
  }],

  ['unconfirmed structured risk fields force manual confirmation and suppress targets', () => {
    const context = structuredContext();
    context.entryConfirmed = false;
    context.stopConfirmed = false;
    context.requiresManualConfirmation = true;
    context.riskReadConfidence = 'Low';

    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      chartContext: context,
      result: null,
    });
    const liquidity = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(liquidity);
    assert.equal(liquidity.executionStatus, ExecutionStatus.Conditional);
    assert.equal(liquidity.entry, null);
    assert.equal(liquidity.stop, null);
    assert.equal(liquidity.target1, null);
    assert.equal(liquidity.target2, null);
    assert.ok(liquidity.missingEvidence.includes('Exact entry/stop levels require manual confirmation.'));
  }],

  ['Lunch subtypes do not activate without completed Morning window context', () => {
    const context = lunchContext();
    context.morningWindowContext = {
      complete: false,
      source: 'unknown',
      morningHigh: null,
      morningLow: null,
      confidence: 'Low',
      evidence: [],
      missingEvidence: ['Morning window context is not available.'],
    };
    context.keyLevels = {
      ...context.keyLevels,
      morningHigh: null,
      morningLow: null,
    };
    context.setupEvidence = {
      lunchFailedHighReversal: {
        detected: true,
        direction: 'SHORT',
        entry: 7417.75,
        stop: 7419,
        invalidation: 'Above sweep high.',
        requiredTrigger: 'Close below morning high.',
        triggerState: 'TRIGGERED',
        confidence: 'High',
        evidence: ['Lunch chart appears to fail above a high.'],
        missingEvidence: [],
      },
    };

    const result = scanSetupCandidates({
      sessionType: 'replay_lunch',
      chartContext: context,
      result: resultWithText('Lunch Failed High Reversal short is confirmed.', 7417.75, 7419, 'TRIGGERED'),
    });
    const failedHigh = result.candidates.find((candidate) => candidate.setupType === SetupType.LunchFailedHighReversal);

    assert.equal(failedHigh, undefined);
    assert.ok(result.candidates.every((candidate) => isPrimarySetupCandidate(candidate)));
    assert.notEqual(result.bestExecutableCandidate?.setupType, SetupType.LunchFailedHighReversal);
  }],

  ['deprecated lunch high-reversal evidence does not create an active candidate', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_lunch',
      chartContext: lunchContext(),
      result: null,
    });
    const failedHigh = result.candidates.find((candidate) => candidate.setupType === SetupType.LunchFailedHighReversal);

    assert.equal(failedHigh, undefined);
    assert.ok(result.candidates.every((candidate) => isPrimarySetupCandidate(candidate)));
    assert.notEqual(result.bestExecutableCandidate?.setupType, SetupType.LunchFailedHighReversal);
  }],

  ['deprecated lunch low-reversal evidence does not create an active candidate', () => {
    const context = lunchContext();
    context.keyLevels = {
      ...context.keyLevels,
      currentPrice: 7394,
      morningHighSweep: null,
      morningLowSweep: 7391.5,
      activeSwingHigh: 7398,
      activeSwingLow: 7391.5,
    };
    context.morningWindowContext = {
      ...context.morningWindowContext!,
      openingDriveDirection: 'bearish',
      morningTrend: 'bearish_extension',
      morningHighSwept: false,
      morningLowSwept: true,
      failedHoldAboveMorningHigh: false,
      failedHoldBelowMorningLow: true,
    };
    context.candleFacts = {
      ...context.candleFacts!,
      lastClosedCandleDirection: 'bullish',
      closeAboveKeyLevel: true,
      closeBelowKeyLevel: false,
    };
    context.liquidityEvents = [
      {
        type: 'sweep',
        direction: 'LONG',
        level: 7391.5,
        sweptLevelLabel: 'morning low',
        reclaimed: true,
        timestamp: '12:10',
        confidence: 'High',
        evidence: 'Price swept the completed Morning low and reclaimed it.',
      },
    ];
    context.setupEvidence = {
      lunchFailedLowReversal: {
        detected: true,
        direction: 'LONG',
        entry: 7394,
        stop: 7391.5,
        invalidation: 'Trade is invalid if price fails back below the morning low sweep.',
        requiredTrigger: '5M close back above morning low or failed retest from above.',
        triggerState: 'TRIGGERED',
        confidence: 'High',
        evidence: ['Morning low was swept and reclaimed after completed Morning context.'],
        missingEvidence: [],
      },
    };
    context.proposedEntry = 7394;
    context.proposedStop = 7391.5;

    const result = scanSetupCandidates({
      sessionType: 'replay_lunch',
      chartContext: context,
      result: null,
    });
    const failedLow = result.candidates.find((candidate) => candidate.setupType === SetupType.LunchFailedLowReversal);

    assert.equal(failedLow, undefined);
    assert.ok(result.candidates.every((candidate) => isPrimarySetupCandidate(candidate)));
  }],

  ['deprecated lunch compression evidence does not create an active candidate', () => {
    const context = lunchContext();
    context.setupEvidence = {
      lunchCompressionBreakout: {
        detected: true,
        direction: 'LONG',
        entry: 7416,
        stop: 7412,
        invalidation: 'Back inside compression range.',
        requiredTrigger: '5M break from lunch compression range.',
        triggerState: 'TRIGGERED',
        confidence: 'Medium',
        evidence: ['Compression range formed after completed Morning window.'],
        missingEvidence: [],
      },
    };
    context.compressionRange = {
      present: true,
      high: 7415.75,
      low: 7412,
      breakoutDirection: 'LONG',
      confidence: 'High',
    };
    context.proposedEntry = 7416;
    context.proposedStop = 7412;

    const result = scanSetupCandidates({
      sessionType: 'replay_lunch',
      chartContext: context,
      result: null,
    });
    const compression = result.candidates.find((candidate) => candidate.setupType === SetupType.LunchCompressionBreakout);

    assert.equal(compression, undefined);
    assert.ok(result.candidates.every((candidate) => isPrimarySetupCandidate(candidate)));
  }],

  ['deprecated lunch failed-continuation evidence does not create an active candidate', () => {
    const context = lunchContext();
    context.setupEvidence = {
      lunchFailedContinuation: {
        detected: true,
        direction: 'SHORT',
        entry: 7416,
        stop: 7419,
        invalidation: 'Continuation resumes above the failed push.',
        requiredTrigger: '5M reversal confirmation after continuation attempt fails.',
        triggerState: 'TRIGGERED',
        confidence: 'High',
        evidence: ['Bullish morning extension failed continuation near morning high.'],
        missingEvidence: [],
      },
    };
    context.proposedEntry = 7416;
    context.proposedStop = 7419;

    const result = scanSetupCandidates({
      sessionType: 'replay_lunch',
      chartContext: context,
      result: null,
    });
    const failedContinuation = result.candidates.find((candidate) => candidate.setupType === SetupType.LunchFailedContinuation);

    assert.equal(failedContinuation, undefined);
    assert.ok(result.candidates.every((candidate) => isPrimarySetupCandidate(candidate)));
  }],

  ['deprecated lunch range-reclaim evidence does not create an active candidate', () => {
    const context = lunchContext();
    context.morningWindowContext = {
      ...context.morningWindowContext!,
      rangeReclaimed: true,
    };
    context.setupEvidence = {
      lunchRangeReclaim: {
        detected: true,
        direction: 'LONG',
        entry: 7402,
        stop: 7398,
        invalidation: 'Fails back outside reclaimed range.',
        requiredTrigger: '5M reclaim back inside the defined range.',
        triggerState: 'TRIGGERED',
        confidence: 'Medium',
        evidence: ['Price reclaimed the completed Morning range.'],
        missingEvidence: [],
      },
    };
    context.proposedEntry = 7402;
    context.proposedStop = 7398;

    const result = scanSetupCandidates({
      sessionType: 'replay_lunch',
      chartContext: context,
      result: null,
    });
    const rangeReclaim = result.candidates.find((candidate) => candidate.setupType === SetupType.LunchRangeReclaim);

    assert.equal(rangeReclaim, undefined);
    assert.ok(result.candidates.every((candidate) => isPrimarySetupCandidate(candidate)));
  }],
];

for (const [name, test] of tests) {
  test();
  console.log(`✓ ${name}`);
}

console.log(`✓ Setup scanner verified across ${tests.length} cases.`);
