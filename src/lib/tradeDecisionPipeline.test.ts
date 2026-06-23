import assert from 'node:assert/strict';
import { getPrimarySetupRegistry, SETUP_REGISTRY } from '../config/setupRegistry';
import { DECISION_STEPS } from '../config/decisionSteps';
import {
  AnalysisResult,
  BiasDirection,
  ChartContext,
  DayType,
  ExecutionStatus,
  NoTradeReason,
  RiskStatus,
  SetupCandidateStatus,
  SetupType,
  StructuralLevel,
  TradeDecisionStatus,
  TradeDecisionStep,
} from '../types';
import { runTradeDecisionPipeline, TradeDecisionPipelineInput } from './tradeDecisionPipeline';
import { normalizeTradePlan } from './tradePlan';
import { buildChartContextConsensus } from './chartContextConsensus';
import { buildTargetObjectivePlan } from './targetObjectiveEngine';
import { selectBestTwoScenarios } from './scenarioSelection';
import { buildNinjaChartContext, type NinjaBridgeBar } from './ninjaTraderBridge';
import { buildConditionalPlans } from './conditionalPlanBuilder';

function baseResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    dayType: 'LONG' as DayType,
    reasoning: 'Bullish structure with higher low reclaim around the swing low.',
    confidence: 0.82,
    checks: [],
    levelCheck: 'Stop below active swing low.',
    structureStatus: 'Higher-low structure reclaimed the opening range.',
    current_rule_analysis: {
      summary: 'Liquidity sweep long reclaimed the opening low. Stop below active swing low.',
      setup_detected: 'Liquidity Sweep Long',
      rule_category: 'Trap Mechanics',
      entry: 7400,
      stop: 7396,
      target_1: null,
      target_2: null,
      trigger_state: 'TRIGGERED',
      entry_trigger: null,
      no_trade_reason: null,
      base_confidence: 'High',
    },
    ...overrides,
  };
}

function run(input: Partial<TradeDecisionPipelineInput> = {}) {
  return runTradeDecisionPipeline({
    result: baseResult(),
    sessionType: 'replay_morning',
    instrument: 'MES',
    ...input,
  });
}

function timeframeMssEvidenceLayer(direction: 'LONG' | 'SHORT'): NonNullable<ChartContext['timeframeMssEvidence']> {
  const mssDirection = direction === 'LONG' ? 'bullish' : 'bearish';
  const buildEvidence = (timeframeName: '5M' | '15M' | '60M' | '120M' | '240M'): NonNullable<ChartContext['timeframeMssEvidence']>['timeframes']['5M'] => ({
    timeframe: timeframeName,
    direction: mssDirection,
    status: 'confirmed_mss',
    displacementQuality: {
      present: true,
      direction: mssDirection,
      score: 88,
      bodyToRange: 0.72,
      closeLocation: 0.84,
      rangeExpansion: 1.5,
    },
    breaksStructure: true,
    evidenceTimestamp: '2026-05-08T10:00:00-04:00',
    completedBarStatus: 'completed',
    barTimestampMode: 'close',
    barTimeZone: 'eastern',
    source: 'ninjatrader_ohlc',
    blockers: [],
    confidence: 88,
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
    notes: ['Pipeline fixture active timeframe MSS evidence.'],
    approvesExecution: false,
    changesTradeLogic: false,
  };
}

function structuredContext(overrides: Partial<ChartContext> = {}): Partial<ChartContext> {
  return {
    timeframe: '5m',
    screenshotUsability: 'usable',
    keyLevels: {
      currentPrice: 7400,
      rthOpen: 7398,
      nearestSupport: 7396,
      nearestResistance: 7410,
      activeSwingHigh: 7412,
      activeSwingLow: 7396,
    },
    marketStructure: {
      trend: 'bullish',
      higherHigh: true,
      higherLow: true,
      lowerHigh: false,
      lowerLow: false,
      marketStructureShift: false,
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
    setupEvidence: {
      liquiditySweep: {
        detected: true,
        direction: 'LONG',
        entry: 7400,
        stop: 7396,
        invalidation: 'Break below active swing low.',
        requiredTrigger: 'Break of reclaim candle high.',
        triggerState: 'TRIGGERED',
        confidence: 'High',
        evidence: ['Structured sweep/reclaim context.'],
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
    timeframeMssEvidence: timeframeMssEvidenceLayer('LONG'),
    requiresManualConfirmation: false,
    extractionWarnings: {
      screenshotUnclear: false,
      priceLabelsUnreadable: false,
      timeframeUnverified: false,
      levelsUnclear: false,
      manualEntryStopRequired: false,
      messages: [],
    },
    ...overrides,
  };
}

function fullModelOneContext(overrides: Partial<ChartContext> = {}): Partial<ChartContext> {
  return structuredContext({
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
    fvgZones: [{
      direction: 'LONG',
      lower: 7398,
      upper: 7401,
      midpoint: 7399.5,
      formedCandleIndex: 0,
      impulseQualified: true,
      impulseBodyRatio: 1.5,
      impulseRangeRatio: 1.5,
      confidence: 'High',
    }],
    liquidityEvents: [{
      type: 'sweep',
      direction: 'LONG',
      level: 7396,
      sweptLevelLabel: 'opening low',
      reclaimed: true,
      timestamp: '09:45',
      confidence: 'High',
    }],
    liquiditySweeps: [{
      type: 'sweep',
      direction: 'LONG',
      level: 7396,
      sweptLevelLabel: 'opening low',
      reclaimed: true,
      timestamp: '09:45',
      confidence: 'High',
    }],
    reclaimEvents: [{
      direction: 'LONG',
      reclaimedLevel: 7396,
      timestamp: '09:45',
      confidence: 'High',
    }],
    failedBreakEvents: [{
      direction: 'LONG',
      failedLevel: 7396,
      sweptExtreme: 7396,
      timestamp: '09:45',
      confidence: 'High',
    }],
    displacementCandles: [{
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
    }],
    candles: [{
      index: 0,
      timestamp: '10:00',
      open: 7398,
      high: 7402,
      low: 7396,
      close: 7401,
      direction: 'bullish',
      bodyQuality: 'large',
      isExpansion: true,
      confidence: 'High',
    }],
    setupReadyFacts: {
      pullbackIntoFvg: true,
      fvgReclaimed: true,
      breakOfStructure: true,
      sweepThenReclaim: true,
    },
    proposedEntry: 7400,
    proposedStop: 7396,
    riskPoints: 4,
    ...overrides,
  });
}

function turtleSoupContext(overrides: Partial<ChartContext> = {}): Partial<ChartContext> {
  return structuredContext({
    marketStructure: {
      trend: 'unknown',
      higherHigh: false,
      higherLow: false,
      lowerHigh: false,
      lowerLow: false,
      marketStructureShift: false,
      chopRangeCondition: false,
      compressionCondition: false,
      expansionCondition: false,
    },
    candleFacts: {
      lastClosedCandleDirection: 'bullish',
      expansionCandlePresent: false,
      rejectionWickPresent: true,
      breatherCandlePresent: false,
      reclaimCandlePresent: true,
      pullbackPresent: false,
      closeAboveKeyLevel: true,
      closeBelowKeyLevel: false,
    },
    fvgZones: [],
    liquidityEvents: [{
      type: 'sweep',
      direction: 'LONG',
      level: 7396,
      sweptLevelLabel: 'prior swing low',
      reclaimed: true,
      timestamp: '09:45',
      confidence: 'High',
    }],
    liquiditySweeps: [{
      type: 'sweep',
      direction: 'LONG',
      level: 7396,
      sweptLevelLabel: 'prior swing low',
      reclaimed: true,
      timestamp: '09:45',
      confidence: 'High',
    }],
    reclaimEvents: [{
      direction: 'LONG',
      reclaimedLevel: 7396,
      timestamp: '09:50',
      confidence: 'High',
    }],
    failedBreakEvents: [{
      direction: 'LONG',
      failedLevel: 7396,
      sweptExtreme: 7394,
      timestamp: '09:45',
      confidence: 'High',
    }],
    candles: [{
      index: 0,
      timestamp: '09:45',
      open: 7396.5,
      high: 7397,
      low: 7394,
      close: 7396.25,
      direction: 'bullish',
      isRejection: true,
      confidence: 'High',
    }],
    setupReadyFacts: {
      sweepThenReclaim: true,
      breakOfStructure: false,
      pullbackIntoFvg: false,
      fvgReclaimed: false,
    },
    setupEvidence: {},
    proposedEntry: 7400,
    proposedStop: 7393.5,
    riskPoints: 6.5,
    ...overrides,
  });
}

function withStructuredBias(context: Partial<ChartContext>, alignedDirection: 'LONG' | 'SHORT'): Partial<ChartContext> {
  return {
    ...context,
    multiTimeframeContext: {
      source: 'ninjatrader_bridge',
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
        conflict: false,
        conflicts: [],
        notes: [`Big-picture structure aligned ${alignedDirection}.`],
      },
    } as unknown as ChartContext['multiTimeframeContext'],
  };
}

function sufficientHtfCoverageRows() {
  return [
    { timeframe: '4H' as const, barsLoaded: 180, rangeStart: '2026-05-06T00:00:00-04:00', rangeEnd: '2026-06-05T12:00:00-04:00', minimumExpectedDescription: '30 calendar days when available.', minimumSatisfied: true, status: 'sufficient' as const },
    { timeframe: '2H' as const, barsLoaded: 360, rangeStart: '2026-05-06T00:00:00-04:00', rangeEnd: '2026-06-05T12:00:00-04:00', minimumExpectedDescription: '30 calendar days when available.', minimumSatisfied: true, status: 'sufficient' as const },
    { timeframe: '1H' as const, barsLoaded: 720, rangeStart: '2026-05-06T00:00:00-04:00', rangeEnd: '2026-06-05T12:00:00-04:00', minimumExpectedDescription: '30 calendar days when available.', minimumSatisfied: true, status: 'sufficient' as const },
    { timeframe: '15M' as const, barsLoaded: 2880, rangeStart: '2026-05-06T00:00:00-04:00', rangeEnd: '2026-06-05T12:00:00-04:00', minimumExpectedDescription: '30 calendar days when available.', minimumSatisfied: true, status: 'sufficient' as const },
    { timeframe: '5M' as const, barsLoaded: 8640, rangeStart: '2026-05-06T00:00:00-04:00', rangeEnd: '2026-06-05T12:00:00-04:00', minimumExpectedDescription: '30 calendar days when available; active setup-scan window remains the execution trigger authority.', minimumSatisfied: true, status: 'sufficient' as const },
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

function htfDrawContinuationContext(direction: 'LONG' | 'SHORT' = 'LONG', overrides: Partial<ChartContext> = {}): Partial<ChartContext> {
  const bullish = direction === 'LONG';
  return structuredContext({
    chartTimestamp: '2026-06-01T10:35:00-04:00',
    keyLevels: {
      currentPrice: bullish ? 7604 : 7600,
      activeSwingLow: bullish ? 7580 : 7596,
      activeSwingHigh: bullish ? 7606 : 7624,
      priorDayHigh: bullish ? 7624 : null,
      priorDayLow: bullish ? null : 7580,
      overnightHigh: bullish ? 7632.75 : null,
      overnightLow: bullish ? null : 7576,
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
    setupEvidence: {},
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
    proposedEntry: bullish ? 7604 : 7600,
    proposedStop: bullish ? 7600 : 7604,
    riskPoints: 4,
    riskStatus: 'WithinLimit',
    entryConfirmed: true,
    stopConfirmed: true,
    timeframeMssEvidence: timeframeMssEvidenceLayer(direction),
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
    multiTimeframeContext: {
      source: 'ninjatrader_bridge',
      fourHour: { trend: bullish ? 'bullish' : 'bearish' },
      twoHour: { trend: bullish ? 'bullish' : 'bearish' },
      oneHour: { trend: bullish ? 'bullish' : 'bearish' },
      fifteenMinute: { trend: bullish ? 'bullish' : 'bearish' },
      fiveMinute: { trend: bullish ? 'bullish' : 'bearish' },
      alignment: {
        macroBias: direction,
        sessionBias: direction,
        liquidityBias: direction,
        executionBias: direction,
        alignedDirection: direction,
        conflict: false,
        conflicts: [],
        notes: [`HTF draw aligned ${direction}.`],
      },
    } as unknown as ChartContext['multiTimeframeContext'],
    htfLiquidityDrawState: {
      source: 'ninjatrader_ohlc',
      authority: 'ohlc_facts_only',
      boundary: 'context_only_not_execution_authority',
      drawDirection: bullish ? 'buy_side' : 'sell_side',
      planDirection: direction,
      macroContext: bullish ? 'bullish' : 'bearish',
      raidState: bullish ? 'sell_side_raid' : 'buy_side_raid',
      liquidityRaidState: bullish ? 'sell_side_raid' : 'buy_side_raid',
      reclaimStatus: 'confirmed',
      externalLiquidityTarget: bullish ? 'full ETH high' : 'full ETH low',
      classification: 'MSS_TRIGGER_CONFIRMED',
      htfDrawContinuationPending: true,
      confidence: 86,
      notes: ['HTF draw continuation pipeline fixture.'],
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
        confirmationLevel: 7602,
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
    ...overrides,
  });
}

function htfDisplacementFvgContinuationContext(direction: 'LONG' | 'SHORT' = 'SHORT', overrides: Partial<ChartContext> = {}): Partial<ChartContext> {
  const bullish = direction === 'LONG';
  const entry = bullish ? 7603.25 : 7582.75;
  const stop = bullish ? 7599 : 7590;
  const target = bullish ? 7620 : 7574.75;
  const displacement = {
    direction,
    candleIndex: 1,
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
    breaksStructure: false,
    confidence: 'High' as const,
    evidence: bullish ? '15M bullish displacement.' : '15M bearish displacement.',
  };
  const fiveMinute = {
    ...displacement,
    candleIndex: 2,
    timestamp: bullish ? '2026-06-02T10:05:00-04:00' : '2026-06-03T11:25:00-04:00',
    open: bullish ? 7600 : 7588,
    high: bullish ? 7605 : 7589.25,
    low: bullish ? 7599 : 7580.5,
    close: entry,
    bodyPoints: bullish ? 3.25 : 5.25,
    rangePoints: bullish ? 6 : 8.75,
    evidence: bullish ? '5M bullish displacement/FVG continuation.' : '5M bearish displacement/FVG continuation.',
  };
  return structuredContext({
    chartTimestamp: bullish ? '2026-06-02T10:05:00-04:00' : '2026-06-03T11:25:00-04:00',
    keyLevels: {
      currentPrice: entry,
      activeSwingLow: bullish ? 7599 : 7574.75,
      activeSwingHigh: bullish ? 7620 : 7590,
      overnightHigh: bullish ? 7632.75 : 7614.75,
      overnightLow: bullish ? 7590 : 7574,
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
    setupReadyFacts: {
      sweepThenReclaim: false,
      breakOfStructure: false,
      pullbackIntoFvg: true,
      fvgReclaimed: true,
    },
    setupEvidence: {},
    proposedEntry: entry,
    proposedStop: stop,
    riskPoints: Math.abs(entry - stop),
    riskStatus: Math.abs(entry - stop) > 4 ? 'RiskTooWide' : 'WithinLimit',
    fvgZones: [{
      direction,
      lower: bullish ? 7600.5 : 7584,
      upper: bullish ? 7603.5 : 7589,
      impulseQualified: true,
      confidence: 'High',
    }],
    displacementCandles: [fiveMinute],
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
    multiTimeframeContext: {
      source: 'ninjatrader_bridge',
      authority: 'ohlc_facts_only',
      fourHour: { trend: bullish ? 'bullish' : 'bearish', displacementCandles: [], confidence: 'High', notes: [] },
      twoHour: { trend: bullish ? 'bullish' : 'bearish', displacementCandles: [], confidence: 'High', notes: [] },
      oneHour: { trend: bullish ? 'bullish' : 'bearish', displacementCandles: [], confidence: 'High', notes: [] },
      fifteenMinute: { trend: bullish ? 'bullish' : 'bearish', displacementCandles: [displacement], confidence: 'High', notes: [] },
      fiveMinute: { trend: bullish ? 'bullish' : 'bearish', displacementCandles: [fiveMinute], confidence: 'High', notes: [] },
      alignment: {
        macroBias: direction,
        sessionBias: direction,
        liquidityBias: direction,
        executionBias: direction,
        alignedDirection: direction,
        conflicts: [],
        notes: [`HTF displacement FVG continuation aligned ${direction}.`],
      },
      targetMap: { levelsToWatch: [] },
      rules: {
        higherTimeframesApproveTrades: false,
        fiveMinuteExecutionRequired: true,
        aiMayOverwriteOhlcFacts: false,
      },
      notes: [],
    } as unknown as ChartContext['multiTimeframeContext'],
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
      notes: ['HTF displacement FVG continuation pipeline fixture.'],
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
        evidence: ['5M continuation confirmed by completed candle close with displacement.'],
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
        { timeframe: '5M', direction: bullish ? 'bullish' : 'bearish', status: 'confirmed', lifecycleState: 'confirmed_mss', evidence: ['5M continuation confirmed by completed candle close with displacement.'], confirmationLevel: entry, invalidationLevel: stop, externalLiquidityTarget: bullish ? 'External buy-side liquidity' : 'External sell-side liquidity', confidence: 88 },
      ],
      timeframeStack: [],
      ...sufficientHtfContextFields(),
    },
    higherTimeframeThesis: {
      direction,
      confidence: 'High',
      sourceTimeframes: ['15M', '5M'],
      reason: bullish ? 'Bullish displacement delivery toward external buy-side liquidity.' : 'Bearish displacement delivery toward external sell-side liquidity.',
      drawOnLiquidity: target,
      drawOnLiquidityLabel: bullish ? 'External buy-side liquidity' : 'External sell-side liquidity',
    },
    timeframeMssEvidence: timeframeMssEvidenceLayer(direction),
    ...overrides,
  });
}

function failedPlanReversalContext(direction: 'LONG' | 'SHORT' = 'SHORT', overrides: Partial<ChartContext> = {}): Partial<ChartContext> {
  const base = htfDisplacementFvgContinuationContext(direction);
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
      reasons: ['15M, 1H, 2H, and 4H confirm the opposite side after the original app-owned plan failed.'],
      blockers: [],
      createsCandidate: true,
      approvesExecution: false,
    },
    ...overrides,
  };
}

function bridgeBar(time: string, open: number, high: number, low: number, close: number): NinjaBridgeBar {
  return { time, open, high, low, close, volume: 1 };
}

function assertSameSequence(input: Partial<TradeDecisionPipelineInput> = {}) {
  const result = run(input);
  assert.deepEqual(result.auditTrail.map((step) => step.step), DECISION_STEPS);
  return result;
}

function stepStatus(result: ReturnType<typeof run>, step: TradeDecisionStep) {
  return result.auditTrail.find((item) => item.step === step)?.status;
}

function isPrimarySetupCandidate(candidate: { setupType: SetupType }) {
  return (
    candidate.setupType === SetupType.SweepMssFvgRetrace ||
    candidate.setupType === SetupType.TurtleSoup ||
    candidate.setupType === SetupType.HtfDrawContinuationAfterRaid ||
    candidate.setupType === SetupType.HtfDisplacementMssContinuation ||
    candidate.setupType === SetupType.HtfDisplacementFvgContinuation ||
    candidate.setupType === SetupType.OpeningDriveFvgContinuation ||
    candidate.setupType === SetupType.AfterLunchDriveFvgContinuation ||
    candidate.setupType === SetupType.IntradayMssMicroContinuation ||
    candidate.setupType === SetupType.FailedPlanReversal
  );
}

const tests: Array<[string, () => void]> = [
  ['1. No screenshot uploaded', () => {
    const result = assertSameSequence({ result: null });
    assert.equal(result.status, TradeDecisionStatus.InvalidScreenshot);
    assert.equal(result.noTradeReason, NoTradeReason.InvalidScreenshot);
  }],

  ['2. Invalid screenshot', () => {
    const result = assertSameSequence({
      screenshotUsability: 'unusable',
      screenshotWarning: 'Screenshot is unreadable.',
    });
    assert.equal(result.status, TradeDecisionStatus.InvalidScreenshot);
    assert.equal(stepStatus(result, TradeDecisionStep.ConfirmScreenshotUsability), 'fail');
  }],

  ['3. Outside approved time window', () => {
    const result = assertSameSequence({
      sessionType: 'morning',
      windowStatusOverride: 'too_late',
    });
    assert.equal(result.status, TradeDecisionStatus.OutsideRules);
    assert.equal(result.noTradeReason, NoTradeReason.OutsideTimeWindow);
  }],

  ['4. Neutral bias / no setup', () => {
    const result = assertSameSequence({
      result: baseResult({
        dayType: 'NO TRADE',
        reasoning: 'Neutral chop with no clean directional bias.',
        current_rule_analysis: {
          summary: 'No clean structure.',
          setup_detected: 'No Setup',
          rule_category: 'None',
          entry: null,
          stop: null,
          target_1: null,
          target_2: null,
          no_trade_reason: 'No setup',
          base_confidence: 'Low',
        },
      }),
    });
    assert.equal(result.status, TradeDecisionStatus.NoTrade);
    assert.equal(result.biasAssessment.bias, BiasDirection.NoBias);
  }],

  ['4b. Structured OHLC big-picture bias overrides neutral/no-trade text for final bias gate', () => {
    const result = assertSameSequence({
      result: baseResult({
        dayType: 'NO TRADE',
        reasoning: 'Historical replay shell did not provide narrative bias.',
        current_rule_analysis: {
          summary: 'Historical replay shell.',
          setup_detected: 'Pending deterministic setup scan',
          rule_category: 'APP_OWNED_PIPELINE',
          entry: null,
          stop: null,
          target_1: null,
          target_2: null,
          no_trade_reason: null,
          base_confidence: 'Medium',
        },
        structuredChartContext: withStructuredBias(fullModelOneContext(), 'LONG'),
      }),
    });
    assert.equal(result.biasAssessment.bias, BiasDirection.Bullish);
    assert.notEqual(stepStatus(result, TradeDecisionStep.DetermineBias), 'fail');
    assert.notEqual(result.noTradeReason, NoTradeReason.NoClearBias);
  }],

  ['5. Setup present but no entry trigger', () => {
    const result = assertSameSequence({
      result: baseResult({
        current_rule_analysis: {
          summary: 'Liquidity sweep is present, but the break trigger is not available yet.',
          setup_detected: 'Liquidity Sweep Long',
          rule_category: 'Trap Mechanics',
          entry: null,
          stop: 7396,
          target_1: null,
          target_2: null,
          no_trade_reason: null,
          base_confidence: 'Medium',
        },
      }),
    });
    assert.equal(result.status, TradeDecisionStatus.NoTrade);
    assert.equal(result.noTradeReason, NoTradeReason.EntryTriggerMissing);
  }],

  ['6. Wider structure stop is advisory and still visible', () => {
    const result = assertSameSequence({
      result: baseResult({
        structuredChartContext: turtleSoupContext(),
        current_rule_analysis: {
          ...baseResult().current_rule_analysis!,
          summary: 'Turtle Soup Reversal long after sell-side sweep and reclaim.',
          setup_detected: 'Turtle Soup Reversal Long',
          rule_category: 'Turtle Soup Reversal',
          entry: 7400,
          stop: 7393.5,
        },
      }),
    });
    assert.equal(result.riskAssessment.status, RiskStatus.Warning);
    assert.equal(result.riskAssessment.advisoryStatus, 'RISK_ABOVE_STANDARD_LIMIT');
    assert.equal(result.riskAssessment.riskPoints, 6.5);
    assert.equal(stepStatus(result, TradeDecisionStep.ValidateRiskLimit), 'warning');
  }],

  ['7. Alternate setup keeps plan visible when actual structure risk is too wide', () => {
    const result = assertSameSequence({
      result: baseResult({
        structuredChartContext: turtleSoupContext({ proposedStop: 7391.75, riskPoints: 8.25 }),
        current_rule_analysis: {
          ...baseResult().current_rule_analysis!,
          summary: 'Turtle Soup Reversal long after sell-side sweep and reclaim.',
          setup_detected: 'Turtle Soup Reversal Long',
          rule_category: 'Turtle Soup Reversal',
          entry: 7400,
          stop: 7391.75,
        },
      }),
    });
    assert.notEqual(result.noTradeReason, NoTradeReason.RiskTooWide);
    assert.equal(result.riskAssessment.status, RiskStatus.Warning);
    assert.equal(result.riskAssessment.riskPoints, 8.25);
  }],

  ['8. Missing invalidation', () => {
    const result = assertSameSequence({
      result: baseResult({
        current_rule_analysis: {
          ...baseResult().current_rule_analysis!,
          summary: 'Liquidity sweep long.',
        },
        levelCheck: '',
        structureStatus: '',
      }),
    });
    assert.equal(result.status, TradeDecisionStatus.NoTrade);
    assert.equal(result.noTradeReason, NoTradeReason.EntryTriggerMissing);
  }],

  ['9. Valid no-trade decision', () => {
    const result = assertSameSequence({
      result: baseResult({
        dayType: 'LONG',
        reasoning: 'Balanced context with no approved setup active.',
        levelCheck: '',
        structureStatus: '',
        current_rule_analysis: {
          summary: 'No clean directional structure is present.',
          setup_detected: 'No Trade',
          rule_category: 'None',
          entry: null,
          stop: null,
          target_1: null,
          target_2: null,
          no_trade_reason: 'No active trigger',
          base_confidence: 'Low',
        },
      }),
    });
    assert.equal(result.status, TradeDecisionStatus.NoTrade);
    assert.equal(result.journalReady, true);
  }],

  ['10. Narrative Turtle Soup remains no-trade until liquidity raid facts are structured', () => {
    const result = assertSameSequence({
      result: baseResult({
        current_rule_analysis: {
          ...baseResult().current_rule_analysis!,
          summary: 'Turtle Soup Reversal long after sell-side sweep and reclaim.',
          setup_detected: 'Turtle Soup Reversal Long',
          rule_category: 'Turtle Soup Reversal',
          entry_trigger: 'Break above the trigger candle high.',
          trigger_state: 'PENDING_TRIGGER',
        },
      }),
    });
    assert.equal(result.status, TradeDecisionStatus.NoTrade);
    assert.equal(result.noTradeReason, NoTradeReason.EntryTriggerMissing);
    assert.equal(result.finalTradePlan.entry, null);
  }],

  ['11. Narrative-only primary setup remains conditional until ICT gates are complete', () => {
    const result = assertSameSequence();
    assert.equal(result.status, TradeDecisionStatus.NoTrade);
    assert.equal(result.setupAssessment.setupType, SetupType.SweepMssFvgRetrace);
    assert.equal(result.riskAssessment.riskPoints, null);
    assert.equal(result.target1, null);
    assert.equal(result.target2, null);
  }],

  ['12. Screenshot context wide risk is advisory and not the no-trade reason', () => {
    const result = assertSameSequence({
      result: baseResult({
        confidence: 0.99,
        structuredChartContext: turtleSoupContext({ proposedStop: 7388, riskPoints: 12 }),
        final_trade_plan: {
          decision: 'LONG',
          entry: 7400,
          stop: 7388,
          target_1: 7418,
          target_2: 7424,
          risk_reward: '2R',
          final_confidence: 'High',
          why_this_plan: 'Advisory context says this is a long trade.',
          what_would_invalidate: 'Stop below active swing low.',
        },
        current_rule_analysis: {
          ...baseResult().current_rule_analysis!,
          summary: 'Turtle Soup Reversal long after sell-side sweep and reclaim.',
          setup_detected: 'Turtle Soup Reversal Long',
          rule_category: 'Turtle Soup Reversal',
          entry: 7400,
          stop: 7388,
        },
      }),
    });
    assert.notEqual(result.noTradeReason, NoTradeReason.RiskTooWide);
    assert.equal(result.setupCandidates.find((candidate) => candidate.setupType === SetupType.TurtleSoup)?.riskPoints, 12);
    assert.equal(result.setupCandidates.find((candidate) => candidate.setupType === SetupType.TurtleSoup)?.riskAdvisoryStatus, 'RISK_EXTENDED_STRUCTURAL');
    assert.equal(result.biasAssessment.confidence, 'High');
  }],

  ['13. Screenshot context is unclear, pipeline returns Wait or InvalidScreenshot', () => {
    const result = assertSameSequence({
      screenshotUsability: 'unusable',
      screenshotWarning: 'Screenshot context is unclear.',
    });
    assert.ok(
      result.status === TradeDecisionStatus.Wait ||
      result.status === TradeDecisionStatus.InvalidScreenshot
    );
  }],

  ['14. Pipeline carries only primary setup candidates into the final decision result', () => {
    const result = assertSameSequence();
    const primary = getPrimarySetupRegistry('morning');

    assert.equal(result.setupCandidates?.length, primary.length);
    assert.deepEqual(
      new Set(result.setupCandidates?.map((candidate) => candidate.setupType)),
      new Set(primary.map((entry) => entry.setupType))
    );
    for (const entry of SETUP_REGISTRY.filter((entry) => entry.role !== 'primary_model')) {
      assert.ok(!result.setupCandidates?.some((candidate) => candidate.setupType === entry.setupType));
    }
  }],

  ['15. Pipeline selects the primary model candidate when one is available', () => {
    const result = assertSameSequence({
      result: baseResult({ structuredChartContext: fullModelOneContext() as ChartContext }),
    });

    assert.equal(result.status, TradeDecisionStatus.ApprovedTrade);
    assert.equal(result.opportunitySelection?.bestExecutableCandidate?.setupType, SetupType.SweepMssFvgRetrace);
    assert.equal(result.opportunitySelection?.bestExecutableCandidate?.executionStatus, ExecutionStatus.Executable);
    assert.equal(result.finalTradePlan.setupType, SetupType.SweepMssFvgRetrace);
  }],

  ['15b. Pipeline can approve the HTF draw continuation model when deterministic gates are complete', () => {
    const result = assertSameSequence({
      result: baseResult({
        dayType: 'LONG',
        reasoning: 'HTF bullish draw after sell-side raid and confirmed 5M MSS.',
        structuredChartContext: htfDrawContinuationContext('LONG') as ChartContext,
      }),
    });

    assert.equal(result.status, TradeDecisionStatus.ApprovedTrade);
    assert.equal(result.opportunitySelection?.bestExecutableCandidate?.setupType, SetupType.HtfDrawContinuationAfterRaid);
    assert.equal(result.opportunitySelection?.bestExecutableCandidate?.executionStatus, ExecutionStatus.Executable);
    assert.equal(result.opportunitySelection?.bestExecutableCandidate?.pathway, 'htf_liquidity_draw_mss');
    assert.equal(result.finalTradePlan.setupType, SetupType.HtfDrawContinuationAfterRaid);
    assert.equal(result.finalTradePlan.entry, 7604);
    assert.equal(result.finalTradePlan.stop, 7600);
    assert.equal(result.finalTradePlan.target1, 7610);
    assert.equal(result.finalTradePlan.target2, 7612);
  }],

  ['15b2. Pipeline can approve the HTF displacement FVG continuation model when deterministic gates are complete', () => {
    const result = assertSameSequence({
      result: baseResult({
        dayType: 'SHORT',
        reasoning: '15M bearish displacement, 5M bearish FVG continuation, protected stop, and sell-side liquidity objective.',
        current_rule_analysis: {
          summary: '15M bearish displacement and 5M bearish FVG continuation into sell-side liquidity.',
          setup_detected: 'HTF Displacement + FVG Continuation',
          rule_category: 'Continuation',
          entry: 7582.75,
          stop: 7590,
          target_1: 7572,
          target_2: 7568.25,
          trigger_state: 'TRIGGERED',
          entry_trigger: '5M displacement/FVG continuation trigger.',
          no_trade_reason: null,
          base_confidence: 'High',
        },
        structuredChartContext: htfDisplacementFvgContinuationContext('SHORT') as ChartContext,
      }),
    });

    assert.equal(result.status, TradeDecisionStatus.ApprovedTrade);
    assert.equal(result.opportunitySelection?.bestExecutableCandidate?.setupType, SetupType.HtfDisplacementFvgContinuation);
    assert.equal(result.opportunitySelection?.bestExecutableCandidate?.executionStatus, ExecutionStatus.Executable);
    assert.equal(result.opportunitySelection?.bestExecutableCandidate?.pathway, 'htf_displacement_fvg_continuation');
    assert.equal(result.opportunitySelection?.bestExecutableCandidate?.riskAdvisoryStatus, 'RISK_ABOVE_STANDARD_LIMIT');
    assert.equal(result.finalTradePlan.setupType, SetupType.HtfDisplacementFvgContinuation);
    assert.equal(result.finalTradePlan.entry, 7582.75);
    assert.equal(result.finalTradePlan.stop, 7590);
    assert.equal(result.finalTradePlan.target1, 7572);
    assert.equal(result.finalTradePlan.target2, 7568.25);
  }],

  ['15b3. Complete failed-plan reversal short takes final selection authority instead of staying NO TRADE', () => {
    const result = assertSameSequence({
      result: baseResult({
        dayType: 'SHORT',
        reasoning: 'Original long plan failed; opposite bearish HTF/MSS stack and fresh 5M trigger are complete.',
        current_rule_analysis: {
          summary: 'Failed long decision level converted to bearish decision level after 15M, 1H, 2H, and 4H confirmation.',
          setup_detected: 'Failed Plan Reversal Short',
          rule_category: 'Failed Plan Reversal',
          entry: 7582.75,
          stop: 7590,
          target_1: null,
          target_2: null,
          trigger_state: 'TRIGGERED',
          entry_trigger: 'Fresh completed 5M bearish trigger/retest after failed long decision level.',
          no_trade_reason: null,
          base_confidence: 'High',
        },
        structuredChartContext: failedPlanReversalContext('SHORT') as ChartContext,
      }),
    });
    const reversalCandidate = result.setupCandidates?.find((candidate) => candidate.setupType === SetupType.FailedPlanReversal);

    assert.equal(reversalCandidate?.executionStatus, ExecutionStatus.Executable);
    assert.equal(reversalCandidate?.failedPlanReversal?.createsCandidate, true);
    assert.equal(reversalCandidate?.failedPlanReversal?.approvesExecution, false);
    assert.equal(result.status, TradeDecisionStatus.ApprovedTrade);
    assert.equal(result.opportunitySelection?.bestExecutableCandidate?.setupType, SetupType.FailedPlanReversal);
    assert.equal(result.finalTradePlan.setupType, SetupType.FailedPlanReversal);
    assert.equal(result.finalTradePlan.direction, 'SHORT');
    assert.equal(result.finalTradePlan.entry, 7582.75);
    assert.equal(result.finalTradePlan.stop, 7590);
    assert.notEqual(result.noTradeReason, NoTradeReason.NoApprovedSetup);
  }],

  ['15c. HTF draw continuation keeps app-computed targets and model-specific scorecard wording', () => {
    const result = assertSameSequence({
      result: baseResult({
        dayType: 'LONG',
        reasoning: 'HTF bullish draw after sell-side raid and confirmed 5M MSS toward full ETH high.',
        structuredChartContext: htfDrawContinuationContext('LONG') as ChartContext,
      }),
    });
    const htfCandidate = result.opportunitySelection?.bestExecutableCandidate;

    assert.equal(htfCandidate?.setupType, SetupType.HtfDrawContinuationAfterRaid);
    assert.equal(htfCandidate?.target1, 7610);
    assert.equal(htfCandidate?.target2, 7612);
    assert.notEqual(htfCandidate?.target1, 7624);
    assert.notEqual(htfCandidate?.target2, 7624);
    assert.ok(htfCandidate?.levelContextSummary?.includes('external target'));
    assert.ok(htfCandidate?.decisionQualityScorecard?.some((item) =>
      item.note === 'HTF draw continuation after raid/reclaim sequence quality.'
    ));
  }],

  ['15d. HTF draw continuation cannot approve when app-owned entry is missing', () => {
    const analysis = baseResult({
      dayType: 'LONG',
      reasoning: 'HTF bullish draw exists, but no clean retest entry is defined.',
      structuredChartContext: htfDrawContinuationContext('LONG', {
        proposedEntry: null,
        proposedStop: 7600,
        riskPoints: null,
      }) as ChartContext,
    });
    const result = assertSameSequence({
      result: analysis,
    });
    const plan = normalizeTradePlan(analysis, 'MES', 'replay_morning');

    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
    assert.equal(result.opportunitySelection?.bestExecutableCandidate, null);
    assert.equal(result.opportunitySelection?.bestConditionalCandidate?.setupType, SetupType.HtfDrawContinuationAfterRaid);
    assert.equal(result.finalTradePlan.entry, null);
    assert.equal(plan.canExecute, false);
  }],

  ['15e. HTF draw continuation remains structurally complete when risk is advisory', () => {
    const result = assertSameSequence({
      result: baseResult({
        dayType: 'LONG',
        reasoning: 'HTF bullish draw exists, but the protected structure stop is too wide.',
        structuredChartContext: htfDrawContinuationContext('LONG', {
          proposedEntry: 7604,
          proposedStop: 7588,
          riskPoints: 16,
          riskStatus: 'RiskTooWide',
        }) as ChartContext,
      }),
    });

    assert.equal(result.status, TradeDecisionStatus.ApprovedTrade);
    assert.notEqual(result.noTradeReason, NoTradeReason.RiskTooWide);
    assert.equal(result.opportunitySelection?.bestExecutableCandidate?.setupType, SetupType.HtfDrawContinuationAfterRaid);
    assert.equal(result.opportunitySelection?.bestExecutableCandidate?.riskAdvisoryStatus, 'RISK_EXTENDED_STRUCTURAL');
    assert.equal(stepStatus(result, TradeDecisionStep.ValidateRiskLimit), 'warning');
  }],

  ['15f. HTF draw continuation cannot approve when screenshot or chart quality is low', () => {
    const result = assertSameSequence({
      result: baseResult({
        dayType: 'LONG',
        reasoning: 'HTF bullish draw exists, but chart confidence is too low for execution.',
        structuredChartContext: htfDrawContinuationContext('LONG', {
          screenshotQuality: 'Low',
          levelReadConfidence: 'Low',
          entryStopConfidence: 'Low',
          extractionWarnings: {
            screenshotUnclear: false,
            priceLabelsUnreadable: true,
            timeframeUnverified: false,
            levelsUnclear: true,
            manualEntryStopRequired: true,
            messages: ['HTF chart quality is low.'],
          },
        }) as ChartContext,
      }),
    });

    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
    assert.equal(result.opportunitySelection?.bestExecutableCandidate?.setupType, SetupType.HtfDrawContinuationAfterRaid);
    assert.equal(result.finalTradePlan.entry, null);
  }],

  ['16. Pipeline shows best conditional candidate when no executable candidate exists', () => {
    const partialModelOne = fullModelOneContext({
      setupReadyFacts: {
        sweepThenReclaim: true,
        breakOfStructure: true,
        pullbackIntoFvg: false,
        fvgReclaimed: false,
      },
      fvgZones: [{
        direction: 'LONG',
        lower: 7398,
        upper: 7401,
        midpoint: 7399.5,
        formedCandleIndex: 1,
        impulseQualified: true,
        impulseBodyRatio: 1.5,
        impulseRangeRatio: 1.5,
        confidence: 'High',
      }],
    });
    const result = assertSameSequence({
      result: baseResult({
        structuredChartContext: partialModelOne as ChartContext,
        current_rule_analysis: {
          ...baseResult().current_rule_analysis!,
          summary: 'FVG pullback into imbalance is possible but needs reclaim confirmation.',
          setup_detected: 'FVG Pullback Long',
          rule_category: 'Imbalance',
          entry: null,
          stop: 7396,
          trigger_state: 'PENDING_TRIGGER',
          entry_trigger: 'Manual confirmation required: pullback into imbalance must reclaim.',
        },
      }),
    });

    assert.equal(result.status, TradeDecisionStatus.ConditionalTrade);
    assert.ok(result.opportunitySelection?.bestConditionalCandidate);
    assert.notEqual(result.finalTradePlan.status, TradeDecisionStatus.NoTrade);
  }],

  ['17. NoTrade only appears when no executable or conditional candidate exists', () => {
    const result = assertSameSequence({
      result: baseResult({
        dayType: 'NO TRADE',
        reasoning: 'Neutral baseline with balanced chop and no clean price-action setup.',
        levelCheck: '',
        structureStatus: '',
        current_rule_analysis: {
          summary: 'Neutral baseline with no approved setup.',
          setup_detected: 'No Setup',
          rule_category: 'None',
          entry: null,
          stop: null,
          target_1: null,
          target_2: null,
          no_trade_reason: 'No active setup',
          base_confidence: 'Low',
        },
      }),
    });

    assert.equal(result.status, TradeDecisionStatus.NoTrade);
    assert.equal(result.opportunitySelection?.bestExecutableCandidate, null);
    assert.equal(result.opportunitySelection?.bestConditionalCandidate, null);
  }],

  ['18. ApprovedTrade is rejected when entry stop targets invalidation or trigger are not executable-ready', () => {
    const result = assertSameSequence({
      result: baseResult({
        current_rule_analysis: {
          ...baseResult().current_rule_analysis!,
          entry: null,
          stop: 7396,
          target_1: null,
          target_2: null,
          trigger_state: 'PENDING_TRIGGER',
          entry_trigger: null,
        },
      }),
    });

    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
    assert.equal(result.status, TradeDecisionStatus.NoTrade);
    assert.equal(result.finalTradePlan.entry, null);
  }],

  ['19. High-priority wide structure stop remains visible as advisory', () => {
    const result = assertSameSequence({
      result: baseResult({
        structuredChartContext: turtleSoupContext({ proposedStop: 7388, riskPoints: 12 }),
        current_rule_analysis: {
          ...baseResult().current_rule_analysis!,
          summary: 'Turtle Soup Reversal long after sell-side sweep and reclaim.',
          setup_detected: 'Turtle Soup Reversal Long',
          rule_category: 'Turtle Soup Reversal',
          entry: 7400,
          stop: 7388,
        },
      }),
    });
    const liquidity = result.setupCandidates?.find((candidate) => candidate.setupType === SetupType.TurtleSoup);

    assert.ok(liquidity);
    assert.equal(liquidity.blockReason, null);
    assert.equal(liquidity.riskAdvisoryStatus, 'RISK_EXTENDED_STRUCTURAL');
    assert.equal(liquidity.riskPoints, 12);
    assert.notEqual(result.finalTradePlan.setupType, SetupType.NoSetup);
  }],

  ['20. Weak setup with wide structure risk does not approve', () => {
    const result = assertSameSequence({
      result: baseResult({
        current_rule_analysis: {
          ...baseResult().current_rule_analysis!,
          summary: 'Opening gap fill long toward prior close. Stop below active swing low.',
          setup_detected: 'Opening Gap Fill Long',
          rule_category: 'Opening Range',
          entry: 7400,
          stop: 7388,
        },
      }),
    });
    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
    assert.equal(result.riskAssessment.riskPoints, null);
    assert.equal(result.noTradeReason, NoTradeReason.EntryTriggerMissing);
  }],

  ['21. Pipeline T1/T2 are calculated from R and rounded to 0.25', () => {
    const result = assertSameSequence({
      result: baseResult({
        structuredChartContext: turtleSoupContext({
          proposedEntry: 7400.25,
          proposedStop: 7395.25,
          riskPoints: 5,
          failedBreakEvents: [{
            direction: 'LONG',
            failedLevel: 7396,
            sweptExtreme: 7395.5,
            timestamp: '09:45',
            confidence: 'High',
          }],
          candles: [{
            index: 0,
            timestamp: '09:45',
            open: 7396.5,
            high: 7397,
            low: 7395.5,
            close: 7396.25,
            direction: 'bullish',
            isRejection: true,
            confidence: 'High',
          }],
        }),
        current_rule_analysis: {
          ...baseResult().current_rule_analysis!,
          summary: 'Turtle Soup Reversal long after sell-side sweep and reclaim.',
          setup_detected: 'Turtle Soup Reversal Long',
          rule_category: 'Turtle Soup Reversal',
          entry: 7400.25,
          stop: 7395.25,
        },
      }),
    });

    assert.equal(result.status, TradeDecisionStatus.ApprovedTrade);
    assert.equal(result.riskAssessment.riskPoints, 5);
    assert.equal(result.target1, 7407.75);
    assert.equal(result.target2, 7410.25);
    assert.equal((result.target1 as number) % 0.25, 0);
    assert.equal((result.target2 as number) % 0.25, 0);
  }],

  ['22. Low screenshot quality blocks an otherwise executable structured trade from approval', () => {
    const result = assertSameSequence({
      result: baseResult({
        reasoning: 'Narrative should not override low screenshot quality.',
        structuredChartContext: structuredContext({
          screenshotQuality: 'Low',
          extractionWarnings: {
            screenshotUnclear: false,
            priceLabelsUnreadable: false,
            timeframeUnverified: false,
            levelsUnclear: false,
            manualEntryStopRequired: false,
            messages: ['Screenshot quality is low.'],
          },
        }),
      }),
    });

    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
    assert.equal(stepStatus(result, TradeDecisionStep.ConfirmScreenshotUsability), 'warning');
  }],

  ['23. Unreadable structured screenshot becomes InvalidScreenshot', () => {
    const result = assertSameSequence({
      result: baseResult({
        structuredChartContext: structuredContext({
          screenshotQuality: 'Unreadable',
          extractionWarnings: {
            screenshotUnclear: true,
            priceLabelsUnreadable: true,
            timeframeUnverified: true,
            levelsUnclear: true,
            manualEntryStopRequired: true,
            messages: ['Screenshot is unreadable.'],
          },
        }),
      }),
    });

    assert.equal(result.status, TradeDecisionStatus.InvalidScreenshot);
    assert.equal(result.noTradeReason, NoTradeReason.InvalidScreenshot);
  }],

  ['24. Structured low level confidence prevents T1/T2 calculation until levels are confirmed', () => {
    const result = assertSameSequence({
      result: baseResult({
        structuredChartContext: structuredContext({
          levelReadConfidence: 'Low',
          extractionWarnings: {
            screenshotUnclear: false,
            priceLabelsUnreadable: true,
            timeframeUnverified: false,
            levelsUnclear: true,
            manualEntryStopRequired: true,
            messages: ['Exact entry and stop require manual confirmation.'],
          },
        }),
      }),
    });

    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
  }],

  ['25. Structured low entry/stop confidence prevents executable prices and T1/T2 calculation', () => {
    const result = assertSameSequence({
      result: baseResult({
        structuredChartContext: structuredContext({
          entryStopConfidence: 'Low',
          extractionWarnings: {
            screenshotUnclear: false,
            priceLabelsUnreadable: false,
            timeframeUnverified: false,
            levelsUnclear: false,
            manualEntryStopRequired: true,
            messages: ['Entry/stop confidence is low. Manual confirmation required.'],
          },
        }),
      }),
    });

    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
  }],

  ['26. Narrative says trade, but structured facts reject it in the trade decision pipeline', () => {
    const result = assertSameSequence({
      result: baseResult({
        reasoning: 'Narrative says liquidity sweep long trade is confirmed and should execute.',
        current_rule_analysis: {
          ...baseResult().current_rule_analysis!,
          summary: 'Narrative says liquidity sweep long trade is confirmed and should execute.',
          entry: 7400,
          stop: 7396,
          trigger_state: 'TRIGGERED',
        },
        structuredChartContext: structuredContext({
          setupEvidence: {},
          fvgZones: [],
          liquidityEvents: [],
          candleFacts: {
            lastClosedCandleDirection: 'unknown',
            expansionCandlePresent: false,
            rejectionWickPresent: false,
            breatherCandlePresent: false,
            reclaimCandlePresent: false,
            pullbackPresent: false,
            closeAboveKeyLevel: false,
            closeBelowKeyLevel: false,
          },
          marketStructure: {
            trend: 'unknown',
            higherHigh: false,
            higherLow: false,
            lowerHigh: false,
            lowerLow: false,
            marketStructureShift: false,
            chopRangeCondition: false,
            compressionCondition: false,
            expansionCondition: false,
          },
        }),
      }),
    });

    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
    assert.ok(
      result.status === TradeDecisionStatus.Wait ||
      result.status === TradeDecisionStatus.ConditionalTrade ||
      result.status === TradeDecisionStatus.NoTrade
    );
    assert.equal(result.opportunitySelection?.bestExecutableCandidate, null);
  }],

  ['27. Structured unconfirmed entry/stop prevents approval and T1/T2 calculation', () => {
    const result = assertSameSequence({
      result: baseResult({
        structuredChartContext: structuredContext({
          entryConfirmed: false,
          stopConfirmed: false,
          requiresManualConfirmation: true,
          riskReadConfidence: 'Low',
          extractionWarnings: {
            screenshotUnclear: false,
            priceLabelsUnreadable: false,
            timeframeUnverified: false,
            levelsUnclear: true,
            manualEntryStopRequired: true,
            messages: ['Entry and stop are not confirmed.'],
          },
        }),
      }),
    });

    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
  }],

  ['28. Deprecated morning failed-high builder does not create an active candidate', () => {
    const result = assertSameSequence({
      sessionType: 'morning',
      windowStatusOverride: 'active',
      result: baseResult({
        dayType: 'NO TRADE',
        reasoning: 'Price rejected a key high and is waiting for a failed-high breakdown trigger.',
        current_rule_analysis: {
          summary: 'No executable trade yet.',
          setup_detected: 'No Setup',
          rule_category: 'None',
          entry: null,
          stop: null,
          target_1: null,
          target_2: null,
          no_trade_reason: 'Waiting for trigger',
          base_confidence: 'Medium',
        },
        structuredChartContext: structuredContext({
          keyLevels: {
            currentPrice: 7494.5,
            nearestSupport: 7488,
            nearestResistance: 7497.25,
            activeSwingHigh: 7497.25,
            activeSwingLow: 7488,
          },
          candleFacts: {
            lastClosedCandleDirection: 'bearish',
            expansionCandlePresent: false,
            rejectionWickPresent: true,
            breatherCandlePresent: false,
            reclaimCandlePresent: false,
            pullbackPresent: true,
            closeAboveKeyLevel: false,
            closeBelowKeyLevel: false,
          },
          setupEvidence: {},
          proposedEntry: null,
          proposedStop: null,
          entryConfirmed: false,
          stopConfirmed: false,
          requiresManualConfirmation: true,
        }),
      }),
    });

    const candidate = result.setupCandidates?.find((item) => item.setupType === SetupType.MorningFailedHighLiquidityRejection);
    assert.equal(candidate, undefined);
    assert.ok(result.setupCandidates?.every((item) => isPrimarySetupCandidate(item)));
    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
  }],

  ['29. Deprecated morning reclaim builder does not create an active candidate', () => {
    const result = assertSameSequence({
      sessionType: 'morning',
      windowStatusOverride: 'active',
      result: baseResult({
        structuredChartContext: structuredContext({
          keyLevels: {
            currentPrice: 7494.5,
            nearestSupport: 7494.25,
            nearestResistance: 7500,
            activeSwingHigh: 7500,
            activeSwingLow: 7494.25,
            nyPremarketHigh: 7512,
          },
          candleFacts: {
            lastClosedCandleDirection: 'bullish',
            expansionCandlePresent: false,
            rejectionWickPresent: false,
            breatherCandlePresent: true,
            reclaimCandlePresent: true,
            pullbackPresent: true,
            closeAboveKeyLevel: false,
            closeBelowKeyLevel: false,
          },
          setupEvidence: {},
          proposedEntry: null,
          proposedStop: null,
          entryConfirmed: false,
          stopConfirmed: false,
          requiresManualConfirmation: true,
        }),
      }),
    });

    const candidate = result.setupCandidates?.find((item) => item.setupType === SetupType.MorningReclaimLong);
    assert.equal(candidate, undefined);
    assert.ok(result.setupCandidates?.every((item) => isPrimarySetupCandidate(item)));
    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
  }],

  ['30. Deprecated morning reclaim does not appear from short-biased extraction', () => {
    const result = assertSameSequence({
      sessionType: 'morning',
      windowStatusOverride: 'active',
      result: baseResult({
        dayType: 'SHORT',
        reasoning: 'Price swept pre-market liquidity and rejected, but remains trapped below the 7500 round-number reclaim zone.',
        structuredChartContext: structuredContext({
          keyLevels: {
            currentPrice: 7494.5,
            nearestSupport: 7487,
            nearestResistance: 7497,
            activeSwingHigh: 7497,
            activeSwingLow: 7487,
          },
          candleFacts: {
            lastClosedCandleDirection: 'bearish',
            expansionCandlePresent: false,
            rejectionWickPresent: true,
            breatherCandlePresent: true,
            reclaimCandlePresent: false,
            pullbackPresent: true,
            closeAboveKeyLevel: false,
            closeBelowKeyLevel: false,
          },
          setupEvidence: {},
          proposedEntry: null,
          proposedStop: null,
          entryConfirmed: false,
          stopConfirmed: false,
          requiresManualConfirmation: true,
        }),
      }),
    });

    const longCandidate = result.setupCandidates?.find((item) => item.setupType === SetupType.MorningReclaimLong);
    assert.equal(longCandidate, undefined);
    assert.ok(result.setupCandidates?.every((item) => isPrimarySetupCandidate(item)));
    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
  }],

  ['30b. No clear bias keeps two-sided morning conditional paths visible as Wait', () => {
    const result = assertSameSequence({
      sessionType: 'morning',
      windowStatusOverride: 'active',
      result: baseResult({
        dayType: 'NO TRADE',
        reasoning: 'Direction is unresolved between reclaim resistance and breakdown support.',
        current_rule_analysis: {
          summary: 'Wait for either reclaim or breakdown trigger.',
          setup_detected: 'No Setup',
          rule_category: 'None',
          entry: null,
          stop: null,
          target_1: null,
          target_2: null,
          no_trade_reason: 'No clear bias',
          base_confidence: 'Medium',
        },
        structuredChartContext: structuredContext({
          keyLevels: {
            currentPrice: 7438,
            nearestSupport: 7432,
            nearestResistance: 7442,
            activeSwingHigh: 7442,
            activeSwingLow: 7432,
            triggerCandleHigh: 7442,
            triggerCandleLow: 7432,
          },
          candleFacts: {
            lastClosedCandleDirection: 'bullish',
            expansionCandlePresent: false,
            rejectionWickPresent: true,
            breatherCandlePresent: true,
            reclaimCandlePresent: false,
            pullbackPresent: true,
            closeAboveKeyLevel: false,
            closeBelowKeyLevel: false,
          },
          setupEvidence: {},
          proposedEntry: null,
          proposedStop: null,
          entryConfirmed: false,
          stopConfirmed: false,
          requiresManualConfirmation: true,
        }),
      }),
    });

    const longCandidate = result.setupCandidates?.find((item) => item.setupType === SetupType.MorningReclaimLong);
    const shortCandidate = result.setupCandidates?.find((item) => item.setupType === SetupType.MorningFailedHighLiquidityRejection);

    assert.equal(result.status, TradeDecisionStatus.NoTrade);
    assert.equal(stepStatus(result, TradeDecisionStep.DetermineBias), 'fail');
    assert.equal(longCandidate, undefined);
    assert.equal(shortCandidate, undefined);
    assert.ok(result.setupCandidates?.every((item) => isPrimarySetupCandidate(item)));
    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
  }],

  ['30c. Deprecated lunch failed-low builder does not create an active candidate', () => {
    const result = assertSameSequence({
      sessionType: 'lunch',
      windowStatusOverride: 'active',
      result: baseResult({
        dayType: 'NO TRADE',
        reasoning: 'Lunch is reviewing completed Morning range for failed-low reclaim.',
        current_rule_analysis: {
          summary: 'Wait for failed-low reclaim confirmation.',
          setup_detected: 'No Setup',
          rule_category: 'None',
          entry: null,
          stop: null,
          target_1: null,
          target_2: null,
          no_trade_reason: 'Waiting for trigger',
          base_confidence: 'Medium',
        },
        structuredChartContext: structuredContext({
          keyLevels: {
            currentPrice: 7440,
            morningLow: 7432,
            morningLowSweep: 7428,
            nearestSupport: 7432,
            nearestResistance: 7446,
            activeSwingHigh: 7446,
            activeSwingLow: 7428,
            nyPremarketHigh: 7460,
          },
          morningWindowContext: {
            complete: true,
            morningHigh: 7468,
            morningLow: 7432,
            morningLowSwept: true,
            failedHoldBelowMorningLow: false,
            openingDriveDirection: 'bearish',
            morningTrend: 'failed_continuation',
            confidence: 'High',
            evidence: ['Completed Morning low was swept during Lunch review.'],
            missingEvidence: [],
          },
          candleFacts: {
            lastClosedCandleDirection: 'bullish',
            expansionCandlePresent: false,
            rejectionWickPresent: true,
            breatherCandlePresent: true,
            reclaimCandlePresent: true,
            pullbackPresent: true,
            closeAboveKeyLevel: false,
            closeBelowKeyLevel: false,
          },
          setupEvidence: {},
          proposedEntry: null,
          proposedStop: null,
          entryConfirmed: false,
          stopConfirmed: false,
          requiresManualConfirmation: true,
        }),
      }),
    });

    const candidate = result.setupCandidates?.find((item) => item.setupType === SetupType.LunchFailedLowReversal);
    assert.equal(candidate, undefined);
    assert.ok(result.setupCandidates?.every((item) => isPrimarySetupCandidate(item)));
    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
  }],

  ['30d. Deprecated lunch failed-high builder does not create an active candidate', () => {
    const result = assertSameSequence({
      sessionType: 'lunch',
      windowStatusOverride: 'active',
      result: baseResult({
        dayType: 'NO TRADE',
        reasoning: 'Lunch is reviewing completed Morning high for failed-high reversal.',
        current_rule_analysis: {
          summary: 'Wait for failed-high reversal confirmation.',
          setup_detected: 'No Setup',
          rule_category: 'None',
          entry: null,
          stop: null,
          target_1: null,
          target_2: null,
          no_trade_reason: 'Waiting for trigger',
          base_confidence: 'Medium',
        },
        structuredChartContext: structuredContext({
          keyLevels: {
            currentPrice: 7460,
            morningHigh: 7468,
            morningHighSweep: 7472,
            nearestSupport: 7454,
            nearestResistance: 7468,
            activeSwingHigh: 7472,
            activeSwingLow: 7454,
            nyPremarketLow: 7440,
          },
          morningWindowContext: {
            complete: true,
            morningHigh: 7468,
            morningLow: 7432,
            morningHighSwept: true,
            failedHoldAboveMorningHigh: false,
            openingDriveDirection: 'bullish',
            morningTrend: 'bullish_extension',
            confidence: 'High',
            evidence: ['Completed Morning high was swept during Lunch review.'],
            missingEvidence: [],
          },
          candleFacts: {
            lastClosedCandleDirection: 'bearish',
            expansionCandlePresent: false,
            rejectionWickPresent: true,
            breatherCandlePresent: true,
            reclaimCandlePresent: false,
            pullbackPresent: true,
            closeAboveKeyLevel: false,
            closeBelowKeyLevel: false,
          },
          setupEvidence: {},
          proposedEntry: null,
          proposedStop: null,
          entryConfirmed: false,
          stopConfirmed: false,
          requiresManualConfirmation: true,
        }),
      }),
    });

    const candidate = result.setupCandidates?.find((item) => item.setupType === SetupType.LunchFailedHighReversal);
    assert.equal(candidate, undefined);
    assert.ok(result.setupCandidates?.every((item) => isPrimarySetupCandidate(item)));
    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
  }],

  ['31. Level sanity rejects stale execution levels before conditional plan math', () => {
    const result = assertSameSequence({
      sessionType: 'morning',
      windowStatusOverride: 'active',
      result: baseResult({
        dayType: 'SHORT',
        reasoning: 'Extractor proposed stale levels, but current 5M price is far below them.',
        structuredChartContext: structuredContext({
          keyLevels: {
            currentPrice: 7438,
            nearestSupport: 7419.75,
            nearestResistance: 7451,
            activeSwingHigh: 7451,
            activeSwingLow: 7419.75,
          },
          candles: [{
            index: 8,
            timestamp: '10:10',
            open: 7435,
            high: 7442,
            low: 7432,
            close: 7438,
            direction: 'bullish',
            confidence: 'High',
          }],
          candleFacts: {
            lastClosedCandleDirection: 'bullish',
            expansionCandlePresent: false,
            rejectionWickPresent: true,
            breatherCandlePresent: true,
            reclaimCandlePresent: false,
            pullbackPresent: true,
            closeAboveKeyLevel: false,
            closeBelowKeyLevel: false,
          },
          setupEvidence: {
            morningReclaimLong: {
              detected: false,
              possible: true,
              direction: 'LONG',
              entry: 7451.25,
              stop: 7437.5,
              invalidation: 'Break below pullback low.',
              requiredTrigger: 'Reclaim above stale level.',
              triggerState: 'PENDING_TRIGGER',
              confidence: 'High',
              evidence: ['Stale extracted long reclaim level.'],
              missingEvidence: [],
            },
          },
          proposedEntry: 7451.25,
          proposedStop: 7437.5,
          entryConfirmed: true,
          stopConfirmed: true,
          requiresManualConfirmation: false,
        }),
      }),
    });

    const staleEntries = (result.setupCandidates || [])
      .filter((candidate) => candidate.entry !== null && candidate.entry > 7446);
    assert.equal(staleEntries.length, 0);
    const longCandidate = result.setupCandidates?.find((item) => item.setupType === SetupType.MorningReclaimLong);
    assert.equal(longCandidate, undefined);
    assert.ok(result.setupCandidates?.every((item) => isPrimarySetupCandidate(item)));
    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
  }],

  ['32. OpenAI consensus forces manual confirmation on key level disagreement', () => {
    const primary = structuredContext({
      keyLevels: {
        currentPrice: 7500,
        nearestSupport: 7494,
        nearestResistance: 7504,
        activeSwingHigh: 7504,
        activeSwingLow: 7494,
      },
      entryStopConfidence: 'High',
      requiresManualConfirmation: false,
    });
    const validator = structuredContext({
      keyLevels: {
        currentPrice: 7494,
        nearestSupport: 7488,
        nearestResistance: 7498,
        activeSwingHigh: 7498,
        activeSwingLow: 7488,
      },
      entryStopConfidence: 'High',
      requiresManualConfirmation: false,
    });

    const consensus = buildChartContextConsensus(primary, validator, {
      agreement: 'major_disagreement',
      disagreements: ['OpenAI rejected the primary resistance read.'],
      warnings: [],
    });

    assert.equal(consensus.agreement, 'major_disagreement');
    assert.equal(consensus.context?.requiresManualConfirmation, true);
    assert.equal(consensus.context?.entryStopConfidence, 'Low');
    assert.ok(consensus.context?.extractionWarnings?.manualEntryStopRequired);
  }],

  ['33. Target engine treats imbalances as obstacles, not liquidity', () => {
    const levels: StructuralLevel[] = [
      {
        label: 'London Bearish Displacement Imbalance Top',
        price: 7446.5,
        type: 'imbalance_zone',
        source: 'london',
        directionRelevance: 'LONG',
        confidence: 'High',
        strengthScore: 95,
      },
      {
        label: 'London Session High',
        price: 7459,
        type: 'high',
        source: 'london',
        directionRelevance: 'LONG',
        confidence: 'High',
        strengthScore: 80,
      },
      {
        label: 'Equal High Liquidity Pool',
        price: 7462,
        type: 'liquidity_pool',
        source: 'ninjatrader',
        directionRelevance: 'LONG',
        confidence: 'Medium',
        strengthScore: 70,
      },
    ];

    const plan = buildTargetObjectivePlan({
      setupType: SetupType.MorningReclaimLong,
      direction: 'LONG',
      detectedStatus: SetupCandidateStatus.Conditional,
      confidence: 'High',
      priority: 90,
      evidence: [],
      missingEvidence: [],
      executionStatus: ExecutionStatus.Conditional,
      blockReason: null,
      requiredTrigger: '5M reclaim holds.',
      nextAction: 'Wait for reclaim.',
      reducedRiskPlan: null,
      entry: 7445.25,
      stop: 7440.25,
      target1: 7452.75,
      target2: 7455.25,
      invalidation: 'Reclaim fails.',
      riskPoints: 5,
    }, levels);

    assert.ok(plan);
    assert.equal(plan.obstacleTarget1?.label, 'London Bearish Displacement Imbalance Top');
    assert.equal(plan.liquidityTarget1?.label, 'London Session High');
    assert.notEqual(plan.nearestLiquidityTarget?.label, 'London Bearish Displacement Imbalance Top');
    assert.ok(plan.targetManagementInstruction?.includes('imbalance') || plan.notes.join(' ').includes('Imbalance'));
  }],

  ['34. Deprecated morning reclaim long does not create an active candidate from structured facts', () => {
    const result = assertSameSequence({
      sessionType: 'morning',
      windowStatusOverride: 'active',
      result: baseResult({
        dayType: 'NO TRADE',
        reasoning: 'Morning reclaim long path should be built from completed 5M facts.',
        current_rule_analysis: {
          summary: 'Wait for reclaim retest.',
          setup_detected: 'No Setup',
          rule_category: 'None',
          entry: null,
          stop: null,
          target_1: null,
          target_2: null,
          no_trade_reason: 'Waiting for trigger',
          base_confidence: 'Medium',
        },
        structuredChartContext: structuredContext({
          keyLevels: {
            currentPrice: 7398,
            nearestSupport: 7388,
            nearestResistance: 7400,
            activeSwingHigh: 7400,
            activeSwingLow: 7388,
          },
          candles: [
            { index: 1, open: 7396, high: 7397, low: 7388, close: 7390, direction: 'bearish', confidence: 'High' },
            { index: 2, open: 7390, high: 7399, low: 7389, close: 7398, direction: 'bullish', isReclaim: true, confidence: 'High' },
          ],
          candleFacts: {
            lastClosedCandleDirection: 'bullish',
            expansionCandlePresent: false,
            rejectionWickPresent: false,
            breatherCandlePresent: true,
            reclaimCandlePresent: true,
            pullbackPresent: true,
            closeAboveKeyLevel: false,
            closeBelowKeyLevel: false,
          },
          setupEvidence: {},
          proposedEntry: null,
          proposedStop: null,
          entryConfirmed: false,
          stopConfirmed: false,
          requiresManualConfirmation: true,
        }),
      }),
    });

    const candidate = result.setupCandidates?.find((item) => item.setupType === SetupType.MorningReclaimLong);
    assert.equal(candidate, undefined);
    assert.ok(result.setupCandidates?.every((item) => isPrimarySetupCandidate(item)));
    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
  }],

  ['35. Deprecated opening range continuation does not create an active candidate', () => {
    const result = assertSameSequence({
      sessionType: 'morning',
      windowStatusOverride: 'active',
      result: baseResult({
        dayType: 'NO TRADE',
        reasoning: 'Opening range broke and retested.',
        current_rule_analysis: {
          summary: 'Wait for OR retest continuation.',
          setup_detected: 'No Setup',
          rule_category: 'None',
          entry: null,
          stop: null,
          target_1: null,
          target_2: null,
          no_trade_reason: 'Waiting for trigger',
          base_confidence: 'Medium',
        },
        structuredChartContext: structuredContext({
          keyLevels: {
            currentPrice: 7410,
            openingRangeHigh: 7405,
            openingRangeLow: 7392,
            nearestSupport: 7405,
            nearestResistance: 7412,
            activeSwingHigh: 7412,
            activeSwingLow: 7404,
          },
          candles: [
            { index: 1, open: 7402, high: 7410, low: 7401, close: 7408, direction: 'bullish', confidence: 'High' },
            { index: 2, open: 7408, high: 7411, low: 7405, close: 7407, direction: 'bullish', confidence: 'High' },
          ],
          candleFacts: {
            lastClosedCandleDirection: 'bullish',
            expansionCandlePresent: true,
            rejectionWickPresent: false,
            breatherCandlePresent: false,
            reclaimCandlePresent: true,
            pullbackPresent: true,
            closeAboveKeyLevel: true,
            closeBelowKeyLevel: false,
          },
          setupEvidence: {},
          proposedEntry: null,
          proposedStop: null,
          entryConfirmed: false,
          stopConfirmed: false,
          requiresManualConfirmation: true,
        }),
      }),
    });

    const candidate = result.setupCandidates?.find((item) => item.setupType === SetupType.MorningOpeningRangeContinuation && item.direction === 'LONG');
    assert.equal(candidate, undefined);
    assert.ok(result.setupCandidates?.every((item) => isPrimarySetupCandidate(item)));
    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
  }],

  ['36. Supporting imbalance facts do not create an active support candidate', () => {
    const result = assertSameSequence({
      sessionType: 'lunch',
      windowStatusOverride: 'active',
      result: baseResult({
        dayType: 'NO TRADE',
        reasoning: '',
        current_rule_analysis: {
          summary: 'Structured imbalance facts only.',
          setup_detected: 'No Setup',
          rule_category: 'None',
          entry: null,
          stop: null,
          target_1: null,
          target_2: null,
          no_trade_reason: 'Waiting for trigger',
          base_confidence: 'Medium',
        },
        structuredChartContext: structuredContext({
          keyLevels: {
            currentPrice: 7448,
            morningHigh: 7460,
            morningLow: 7430,
            nearestSupport: 7444,
            nearestResistance: 7455,
            activeSwingHigh: 7455,
            activeSwingLow: 7440,
          },
          morningWindowContext: {
            complete: true,
            morningHigh: 7460,
            morningLow: 7430,
            confidence: 'High',
            evidence: ['Completed morning range available.'],
            missingEvidence: [],
          },
          fvgZones: [{
            direction: 'LONG',
            lower: 7444,
            upper: 7449,
            midpoint: 7446.5,
            filledPercent: 50,
            reclaimed: true,
            confidence: 'High',
          }],
          candles: [
            { index: 1, open: 7447, high: 7450, low: 7444, close: 7448, direction: 'bullish', isReclaim: true, confidence: 'High' },
          ],
          setupReadyFacts: {
            pullbackIntoFvg: true,
            fvgReclaimed: true,
            breakOfStructure: false,
            sweepThenReclaim: false,
            notes: [],
          },
          candleFacts: {
            lastClosedCandleDirection: 'bullish',
            expansionCandlePresent: true,
            rejectionWickPresent: false,
            breatherCandlePresent: false,
            reclaimCandlePresent: true,
            pullbackPresent: true,
            closeAboveKeyLevel: true,
            closeBelowKeyLevel: false,
          },
          setupEvidence: {},
          proposedEntry: null,
          proposedStop: null,
          entryConfirmed: false,
          stopConfirmed: false,
          requiresManualConfirmation: true,
        }),
      }),
    });

    const imbalance = result.setupCandidates?.find((item) => item.setupType === SetupType.FvgImbalancePullback && item.direction === 'LONG');
    assert.equal(imbalance, undefined);
    const selected = selectBestTwoScenarios(result.setupCandidates || []);
    assert.ok(!selected.some((candidate) => candidate.setupType === SetupType.FvgImbalancePullback));
    assert.ok(selected.every((candidate) => isPrimarySetupCandidate(candidate)));
    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
  }],

  ['37. ICT Model 1 requires sweep reclaim displacement structure shift and FVG retrace', () => {
    const context = {
      ...structuredContext({
          keyLevels: {
            currentPrice: 101,
            activeSwingHigh: 104,
            activeSwingLow: 96,
            nearestResistance: 104,
            nearestSupport: 96,
          },
          candles: [
            { index: 1, timestamp: '09:45', open: 98, high: 99, low: 96, close: 97, direction: 'bearish', confidence: 'High' },
            { index: 2, timestamp: '09:50', open: 97, high: 99, low: 96.5, close: 98.5, direction: 'bullish', confidence: 'High' },
            { index: 3, timestamp: '09:55', open: 98.5, high: 104, low: 101, close: 103.5, direction: 'bullish', isExpansion: true, confidence: 'High' },
            { index: 4, timestamp: '10:00', open: 102, high: 103, low: 100.25, close: 101, direction: 'bearish', confidence: 'High' },
          ],
          fvgZones: [{
            direction: 'LONG',
            lower: 99,
            upper: 101,
            midpoint: 100,
            formedAt: '09:55',
            formedCandleIndex: 3,
            impulseQualified: true,
            impulseBodyRatio: 1.8,
            impulseRangeRatio: 1.4,
            confidence: 'High',
          }],
          breakerZones: [{
            direction: 'LONG',
            lower: 99.5,
            upper: 100.5,
            midpoint: 100,
            formedAt: '09:55',
            source: 'app',
            confidence: 'High',
            evidence: 'Failed structure retest zone overlaps imbalance.',
          }],
          liquiditySweeps: [{
            type: 'sweep',
            direction: 'LONG',
            level: 96.5,
            sweptLevelLabel: 'Sell-side liquidity',
            reclaimed: true,
            timestamp: '09:45',
            confidence: 'High',
            evidence: 'Price swept sell-side liquidity and reclaimed.',
          }],
          displacementCandles: [{
            direction: 'LONG',
            candleIndex: 3,
            timestamp: '09:55',
            session: 'rth_morning',
            open: 98.5,
            high: 104,
            low: 101,
            close: 103.5,
            bodyPoints: 5,
            rangePoints: 5.5,
            bodyToRange: 0.9,
            closeLocation: 'top_quarter',
            displacementScore: 7,
            quality: 'high_quality',
            leavesImbalance: true,
            breaksStructure: true,
            confidence: 'High',
            evidence: 'Bullish expansion candle created imbalance and broke structure.',
          }],
          targetObjectives: [{
            label: 'Next buy-side liquidity',
            price: 110,
            direction: 'LONG',
            source: 'ninjatrader',
            type: 'liquidity_pool',
            confidence: 'High',
            score: 90,
            distancePoints: 10,
            rMultiple: 2,
            reason: 'Next buy-side liquidity above the entry.',
          }],
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
          setupReadyFacts: {
            pullbackIntoFvg: true,
            fvgReclaimed: false,
            breakOfStructure: true,
            sweepThenReclaim: true,
            notes: [],
          },
      }),
      sessionType: 'replay_morning',
      instrument: 'MES',
      tradeDate: '2026-05-19',
      timeframe: '5m',
      screenshotUsability: 'usable',
    } as ChartContext;

    const plans = buildConditionalPlans(context);
    const modelOne = plans.find((item) => item.scenarioLabel?.includes('ICT Model 1'));
    assert.ok(modelOne);
    assert.equal(modelOne.direction, 'LONG');
    assert.equal(modelOne.entry, 100);
    assert.equal(modelOne.stop, 95.75);
    assert.equal(modelOne.target1, 110);
    assert.equal(modelOne.tacticalZone?.sourceOfTruth, 'ohlc_fvg_zone');
    assert.equal(modelOne.tacticalZone?.direction, 'LONG');
    assert.equal(modelOne.tacticalZone?.lower, 99);
    assert.equal(modelOne.tacticalZone?.upper, 101);
    assert.equal(modelOne.tacticalZone?.sourceTimeframe, '5M');
    assert.ok((modelOne.target1! - modelOne.entry!) / modelOne.riskPoints! >= 2);
    assert.ok(modelOne.evidence.some((item) => item.includes('Minimum 2.0R')));
    assert.ok(modelOne.evidence.some((item) => item.includes('Breaker/FVG confluence')));
  }],

  ['38. Quant FVG detection filters weak gaps without impulse', () => {
    const weak = buildNinjaChartContext({
      sessionType: 'replay_morning',
      instrument: 'MES',
      tradeDate: '2026-05-19',
      bars5m: [
        bridgeBar('2026-05-19T09:30:00', 100, 100.5, 99.5, 100.4),
        bridgeBar('2026-05-19T09:35:00', 100.4, 100.6, 99.7, 100),
        bridgeBar('2026-05-19T09:40:00', 100.8, 101, 100.75, 100.9),
      ],
    });
    assert.equal(weak?.fvgZones?.length || 0, 0);

    const strong = buildNinjaChartContext({
      sessionType: 'replay_morning',
      instrument: 'MES',
      tradeDate: '2026-05-19',
      bars5m: [
        bridgeBar('2026-05-19T09:30:00', 100, 100.5, 99.5, 100),
        bridgeBar('2026-05-19T09:35:00', 100, 100.6, 99.7, 100.1),
        bridgeBar('2026-05-19T09:40:00', 100.5, 105, 101, 104.5),
      ],
    });
    assert.equal(strong?.fvgZones?.[0]?.direction, 'LONG');
    assert.equal(strong?.fvgZones?.[0]?.impulseQualified, true);
  }],

  ['39. Bullish Turtle Soup does not require FVG and enforces sweep wick stop plus 2R target', () => {
    const context = {
      ...structuredContext({
        keyLevels: {
          currentPrice: 98,
          activeSwingHigh: 105,
          activeSwingLow: 96,
          nearestResistance: 105,
          nearestSupport: 96.5,
        },
        candles: [
          { index: 1, timestamp: '09:40', open: 98, high: 99, low: 97, close: 98, direction: 'doji', confidence: 'High' },
          { index: 2, timestamp: '09:45', open: 96.75, high: 98.5, low: 96, close: 97.25, direction: 'bullish', isRejection: true, confidence: 'High' },
          { index: 3, timestamp: '09:50', open: 97.25, high: 101, low: 96.75, close: 100.5, direction: 'bullish', isExpansion: true, confidence: 'High' },
        ],
        liquiditySweeps: [{
          type: 'sweep',
          direction: 'LONG',
          level: 96.5,
          sweptLevelLabel: 'Sell-side liquidity',
          reclaimed: true,
          timestamp: '09:45',
          confidence: 'High',
          evidence: 'Price swept below sell-side liquidity and reclaimed.',
        }],
        displacementCandles: [{
          direction: 'LONG',
          candleIndex: 3,
          timestamp: '09:50',
          session: 'rth_morning',
          open: 97,
          high: 101,
          low: 96.75,
          close: 100.5,
          bodyPoints: 3.5,
          rangePoints: 4.25,
          bodyToRange: 0.82,
          closeLocation: 'top_quarter',
          displacementScore: 6,
          quality: 'confirmed',
          leavesImbalance: false,
          breaksStructure: true,
          confidence: 'High',
          evidence: 'Bullish expansion confirms reversal attempt.',
        }],
        targetObjectives: [{
          label: 'Opposing buy-side liquidity',
          price: 105,
          direction: 'LONG',
          source: 'ninjatrader',
          type: 'liquidity_pool',
          confidence: 'High',
          score: 90,
          distancePoints: 8,
          rMultiple: 6.4,
          reason: 'Opposing buy-side liquidity above the reclaim.',
        }],
        marketStructure: {
          trend: 'bullish',
          higherHigh: false,
          higherLow: true,
          lowerHigh: false,
          lowerLow: false,
          marketStructureShift: true,
          chopRangeCondition: false,
          compressionCondition: false,
          expansionCondition: true,
        },
        setupReadyFacts: {
          sweepThenReclaim: true,
          breakOfStructure: true,
          notes: [],
        },
      }),
      sessionType: 'replay_morning',
      instrument: 'MES',
      tradeDate: '2026-05-19',
      timeframe: '5m',
      screenshotUsability: 'usable',
    } as ChartContext;

    const turtleSoup = buildConditionalPlans(context).find((item) => item.setupType === SetupType.TurtleSoup && item.direction === 'LONG');
    assert.ok(turtleSoup);
    assert.equal(turtleSoup.entry, 97.25);
    assert.equal(turtleSoup.stop, 95.75);
    assert.equal(turtleSoup.target1, 99.5);
    assert.equal(turtleSoup.target2, 100.25);
    assert.notEqual(turtleSoup.target1, turtleSoup.target2);
    assert.ok((turtleSoup.target1! - turtleSoup.entry!) / turtleSoup.riskPoints! >= 1.5);
    assert.ok((turtleSoup.target2! - turtleSoup.entry!) / turtleSoup.riskPoints! >= 2);
    assert.ok(turtleSoup.evidence.some((item) => item.includes('Turtle Soup')));
    assert.ok(turtleSoup.evidence.some((item) => item.includes('Wick rejection support')));
  }],

  ['40. Bearish Turtle Soup targets opposing sell-side liquidity with stop above sweep wick', () => {
    const context = {
      ...structuredContext({
        keyLevels: {
          currentPrice: 102,
          activeSwingHigh: 105,
          activeSwingLow: 98,
          nearestResistance: 104,
          nearestSupport: 98,
        },
        candles: [
          { index: 1, timestamp: '09:40', open: 102, high: 103, low: 101, close: 102, direction: 'doji', confidence: 'High' },
          { index: 2, timestamp: '09:45', open: 104.25, high: 105.25, low: 102.5, close: 103.75, direction: 'bearish', isRejection: true, confidence: 'High' },
          { index: 3, timestamp: '09:50', open: 103.75, high: 104, low: 100, close: 100.5, direction: 'bearish', isExpansion: true, confidence: 'High' },
        ],
        liquiditySweeps: [{
          type: 'sweep',
          direction: 'SHORT',
          level: 104,
          sweptLevelLabel: 'Buy-side liquidity',
          reclaimed: true,
          timestamp: '09:45',
          confidence: 'High',
          evidence: 'Price swept above buy-side liquidity and reclaimed lower.',
        }],
        displacementCandles: [{
          direction: 'SHORT',
          candleIndex: 3,
          timestamp: '09:50',
          session: 'rth_morning',
          open: 103.5,
          high: 104,
          low: 100,
          close: 100.5,
          bodyPoints: 3,
          rangePoints: 4,
          bodyToRange: 0.75,
          closeLocation: 'bottom_quarter',
          displacementScore: 6,
          quality: 'confirmed',
          leavesImbalance: false,
          breaksStructure: true,
          confidence: 'High',
          evidence: 'Bearish expansion confirms reversal attempt.',
        }],
        targetObjectives: [{
          label: 'Opposing sell-side liquidity',
          price: 98,
          direction: 'SHORT',
          source: 'ninjatrader',
          type: 'liquidity_pool',
          confidence: 'High',
          score: 90,
          distancePoints: 5.5,
          rMultiple: 3.14,
          reason: 'Opposing sell-side liquidity below the failed breakout.',
        }],
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
        setupReadyFacts: {
          sweepThenReclaim: true,
          breakOfStructure: true,
          notes: [],
        },
      }),
      sessionType: 'replay_morning',
      instrument: 'MES',
      tradeDate: '2026-05-19',
      timeframe: '5m',
      screenshotUsability: 'usable',
    } as ChartContext;

    const turtleSoup = buildConditionalPlans(context).find((item) => item.setupType === SetupType.TurtleSoup && item.direction === 'SHORT');
    assert.ok(turtleSoup);
    assert.equal(turtleSoup.entry, 103.75);
    assert.equal(turtleSoup.stop, 105.5);
    assert.equal(turtleSoup.target1, 101.25);
    assert.equal(turtleSoup.target2, 100.25);
    assert.notEqual(turtleSoup.target1, turtleSoup.target2);
    assert.ok((turtleSoup.entry! - turtleSoup.target2!) / turtleSoup.riskPoints! >= 2);
    assert.ok(turtleSoup.requiredTrigger?.includes('Bearish Turtle Soup'));
    assert.ok(turtleSoup.evidence.some((item) => item.includes('Wick rejection support')));
  }],

  ['40b. Stale bearish Turtle Soup is blocked after current 5M trades through the stop', () => {
    const context = {
      ...structuredContext({
        keyLevels: {
          currentPrice: 106,
          activeSwingHigh: 106,
          activeSwingLow: 98,
          nearestResistance: 104,
          nearestSupport: 98,
        },
        candles: [
          { index: 1, timestamp: '09:40', open: 102, high: 103, low: 101, close: 102, direction: 'doji', confidence: 'High' },
          { index: 2, timestamp: '09:45', open: 104.25, high: 105.25, low: 102.5, close: 103.75, direction: 'bearish', isRejection: true, confidence: 'High' },
          { index: 3, timestamp: '09:50', open: 103.75, high: 104, low: 100, close: 100.5, direction: 'bearish', isExpansion: true, confidence: 'High' },
          { index: 4, timestamp: '09:55', open: 100.5, high: 106, low: 100, close: 106, direction: 'bullish', isExpansion: true, confidence: 'High' },
        ],
        liquiditySweeps: [{
          type: 'sweep',
          direction: 'SHORT',
          level: 104,
          sweptLevelLabel: 'Buy-side liquidity',
          reclaimed: true,
          timestamp: '09:45',
          confidence: 'High',
          evidence: 'Price swept above buy-side liquidity and reclaimed lower.',
        }],
        displacementCandles: [{
          direction: 'SHORT',
          candleIndex: 3,
          timestamp: '09:50',
          session: 'rth_morning',
          open: 103.5,
          high: 104,
          low: 100,
          close: 100.5,
          bodyPoints: 3,
          rangePoints: 4,
          bodyToRange: 0.75,
          closeLocation: 'bottom_quarter',
          displacementScore: 6,
          quality: 'confirmed',
          leavesImbalance: false,
          breaksStructure: true,
          confidence: 'High',
          evidence: 'Bearish expansion confirms reversal attempt.',
        }],
        targetObjectives: [{
          label: 'Opposing sell-side liquidity',
          price: 98,
          direction: 'SHORT',
          source: 'ninjatrader',
          type: 'liquidity_pool',
          confidence: 'High',
          score: 90,
          distancePoints: 5.5,
          rMultiple: 3.14,
          reason: 'Opposing sell-side liquidity below the failed breakout.',
        }],
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
        setupReadyFacts: {
          sweepThenReclaim: true,
          breakOfStructure: true,
          notes: [],
        },
      }),
      sessionType: 'replay_morning',
      instrument: 'MES',
      tradeDate: '2026-05-19',
      timeframe: '5m',
      screenshotUsability: 'usable',
    } as ChartContext;

    const result = runTradeDecisionPipeline({
      result: baseResult({
        dayType: 'SHORT',
        reasoning: 'Bridge replay should not keep a stopped short candidate alive.',
        structuredChartContext: context,
      }),
      sessionType: 'replay_morning',
      instrument: 'MES',
      tradeDate: '2026-05-19',
    });
    const staleShort = result.setupCandidates?.find((item) => item.setupType === SetupType.TurtleSoup && item.direction === 'SHORT');

    assert.ok(staleShort);
    assert.equal(staleShort.executionStatus, ExecutionStatus.Blocked);
    assert.equal(staleShort.blockReason, NoTradeReason.InvalidStopLocation);
    assert.ok(staleShort.missingEvidence.some((item) => item.includes('traded through the structure stop/invalidation')));
    assert.notEqual(result.opportunitySelection?.bestExecutableCandidate?.setupType, SetupType.TurtleSoup);
    assert.notEqual(result.finalTradePlan.direction, 'SHORT');
  }],

  ['40c. Morning bridge first move is flagged as already triggered with no fresh entry', () => {
    const bars5m: NinjaBridgeBar[] = [
      { time: '2026-05-28T09:30:00-04:00', open: 7535.75, high: 7538.75, low: 7534.75, close: 7535.25, volume: 1000 },
      { time: '2026-05-28T09:35:00-04:00', open: 7535.25, high: 7537.25, low: 7527.75, close: 7530.00, volume: 1000 },
      { time: '2026-05-28T09:40:00-04:00', open: 7530.00, high: 7530.00, low: 7525.50, close: 7527.25, volume: 1000 },
      { time: '2026-05-28T09:45:00-04:00', open: 7527.25, high: 7530.25, low: 7525.50, close: 7528.75, volume: 1000 },
      { time: '2026-05-28T09:50:00-04:00', open: 7528.50, high: 7532.00, low: 7526.00, close: 7527.25, volume: 1000 },
      { time: '2026-05-28T09:55:00-04:00', open: 7527.25, high: 7537.25, low: 7526.25, close: 7531.75, volume: 1000 },
      { time: '2026-05-28T10:00:00-04:00', open: 7531.75, high: 7536.25, low: 7530.50, close: 7535.75, volume: 1000 },
      { time: '2026-05-28T10:05:00-04:00', open: 7535.75, high: 7539.75, low: 7533.50, close: 7536.50, volume: 1000 },
      { time: '2026-05-28T10:10:00-04:00', open: 7536.25, high: 7540.25, low: 7533.50, close: 7540.25, volume: 1000 },
      { time: '2026-05-28T10:15:00-04:00', open: 7540.25, high: 7574.00, low: 7535.00, close: 7564.75, volume: 1000 },
      { time: '2026-05-28T10:20:00-04:00', open: 7564.75, high: 7568.75, low: 7555.50, close: 7564.50, volume: 1000 },
    ];
    const bridgeContext = buildNinjaChartContext({
      bars5m,
      sessionType: 'replay_morning',
      instrument: 'MES',
      tradeDate: '2026-05-28',
    });
    assert.ok(bridgeContext);

    const result = runTradeDecisionPipeline({
      result: baseResult({
        dayType: 'NO TRADE',
        reasoning: 'Bridge replay shows early upside expansion, but no fresh entry should be approved.',
        current_rule_analysis: {
          summary: 'First move already expanded; wait for a pullback or new trigger.',
          setup_detected: 'No Setup',
          rule_category: 'None',
          entry: null,
          stop: null,
          target_1: null,
          target_2: null,
          no_trade_reason: 'Move already triggered',
          base_confidence: 'Medium',
        },
        structuredChartContext: {
          ...bridgeContext,
          setupEvidence: {},
          proposedEntry: null,
          proposedStop: null,
          entryConfirmed: false,
          stopConfirmed: false,
          requiresManualConfirmation: true,
        },
      }),
      sessionType: 'replay_morning',
      instrument: 'MES',
      tradeDate: '2026-05-28',
    });

    assert.equal(result.earlyMoveReview?.status, 'already_triggered_no_fresh_entry');
    assert.equal(result.earlyMoveReview?.direction, 'LONG');
    assert.equal(result.earlyMoveReview?.freshEntryAvailable, false);
    assert.equal(result.earlyMoveReview?.approvalBoundary.approvesTrade, false);
    assert.equal(result.earlyMoveReview?.approvalBoundary.changesEntry, false);
    assert.equal(result.earlyMoveReview?.approvalBoundary.changesStop, false);
    assert.equal(result.earlyMoveReview?.approvalBoundary.changesTargets, false);
    assert.ok(result.earlyMoveReview?.summary.includes('7525.5'));
    assert.ok(result.earlyMoveReview?.action.includes('No fresh entry'));
    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
    assert.notEqual(result.finalTradePlan.direction, 'LONG');
    assert.equal(result.finalTradePlan.entry, null);
    assert.equal(result.finalTradePlan.stop, null);
  }],

  ['41. Breaker and FVG overlap alone does not create a trade candidate', () => {
    const context = {
      ...structuredContext({
        keyLevels: {
          currentPrice: 100,
          activeSwingHigh: 105,
          activeSwingLow: 95,
        },
        candles: [
          { index: 1, timestamp: '09:45', open: 99, high: 101, low: 98, close: 100, direction: 'bullish', confidence: 'High' },
          { index: 2, timestamp: '09:50', open: 100, high: 101, low: 99, close: 100.5, direction: 'bullish', confidence: 'High' },
          { index: 3, timestamp: '09:55', open: 100.5, high: 103, low: 101.5, close: 102, direction: 'bullish', isExpansion: true, confidence: 'High' },
          { index: 4, timestamp: '10:00', open: 102, high: 103, low: 100, close: 100.5, direction: 'bearish', confidence: 'High' },
        ],
        fvgZones: [{
          direction: 'LONG',
          lower: 101,
          upper: 101.5,
          midpoint: 101.25,
          formedCandleIndex: 3,
          impulseQualified: true,
          confidence: 'High',
        }],
        breakerZones: [{
          direction: 'LONG',
          lower: 100.75,
          upper: 101.25,
          midpoint: 101,
          source: 'app',
          confidence: 'High',
        }],
      }),
      sessionType: 'replay_morning',
      instrument: 'MES',
      tradeDate: '2026-05-19',
      timeframe: '5m',
      screenshotUsability: 'usable',
    } as ChartContext;

    const plans = buildConditionalPlans(context);
    assert.equal(plans.some((item) => item.scenarioLabel?.includes('ICT Model 1')), false);
    assert.equal(plans.some((item) => item.setupType === SetupType.TurtleSoup), false);
  }],
];

for (const [name, test] of tests) {
  test();
  console.log(`✓ ${name}`);
}

console.log(`✓ Deterministic sequence verified across ${tests.length} cases.`);
