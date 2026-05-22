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
    proposedEntry: 7400,
    proposedStop: 7404.25,
    riskPoints: 4.25,
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
    assert.ok(result.candidates.every((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace || candidate.setupType === SetupType.TurtleSoup));
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

  ['high-priority wide raw stop remains visible and blocked by risk', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('Liquidity sweep long reclaimed after a stop hunt.', 7400, 7388),
    });
    const liquidity = result.candidates.find((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace);

    assert.ok(liquidity);
    assert.equal(liquidity.detectedStatus, SetupCandidateStatus.Possible);
    assert.equal(liquidity.blockReason, NoTradeReason.RiskTooWide);
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
    assert.ok(result.candidates.every((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace || candidate.setupType === SetupType.TurtleSoup));
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
    assert.ok(turtle.evidence.includes('Sweep below sell-side liquidity confirmed'));
    assert.ok(turtle.evidence.includes('Reclaim after sweep confirmed'));
    assert.ok(turtle.evidence.includes('Failed continuation confirmed'));
    assert.ok(turtle.evidence.includes('Stop beyond sweep wick'));
    assert.ok(turtle.evidence.includes('Targeting opposing liquidity'));
    assert.ok(turtle.evidence.includes('Minimum 2.0R available'));
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

    assert.ok(result.candidates.every((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace || candidate.setupType === SetupType.TurtleSoup));
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
    assert.ok(result.candidates.every((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace || candidate.setupType === SetupType.TurtleSoup));
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

    assert.ok(result.candidates.every((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace || candidate.setupType === SetupType.TurtleSoup));
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
      new Set([SetupType.SweepMssFvgRetrace, SetupType.TurtleSoup])
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
    assert.ok(result.candidates.every((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace || candidate.setupType === SetupType.TurtleSoup));
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
    assert.ok(result.candidates.every((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace || candidate.setupType === SetupType.TurtleSoup));
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
    assert.ok(result.candidates.every((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace || candidate.setupType === SetupType.TurtleSoup));
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
    assert.ok(result.candidates.every((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace || candidate.setupType === SetupType.TurtleSoup));
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
    assert.ok(result.candidates.every((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace || candidate.setupType === SetupType.TurtleSoup));
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
    assert.ok(result.candidates.every((candidate) => candidate.setupType === SetupType.SweepMssFvgRetrace || candidate.setupType === SetupType.TurtleSoup));
  }],
];

for (const [name, test] of tests) {
  test();
  console.log(`✓ ${name}`);
}

console.log(`✓ Setup scanner verified across ${tests.length} cases.`);
