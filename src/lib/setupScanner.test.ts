import assert from 'node:assert/strict';
import { SETUP_REGISTRY } from '../config/setupRegistry';
import {
  AnalysisResult,
  ChartContext,
  DayType,
  ExecutionStatus,
  NoTradeReason,
  SetupCandidateStatus,
  SetupType,
} from '../types';
import { getScannedSetupTypes, scanSetupCandidates } from './setupScanner';

function resultWithText(
  text: string,
  entry = 7400,
  stop = 7396,
  triggerState: 'TRIGGERED' | 'PENDING_TRIGGER' | 'NO_TRIGGER' = 'PENDING_TRIGGER'
): AnalysisResult {
  return {
    dayType: 'TYPE 1 LONG' as DayType,
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

const tests: Array<[string, () => void]> = [
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
    assert.equal(context.liquidityEvents?.[0].type, 'sweep');
    assert.equal(context.gapContext?.gapPresent, false);
    assert.equal(context.compressionRange?.present, false);
    assert.equal(context.extractedLevels?.[0].role, 'support');
  }],

  ['scanner represents every approved setup registry entry', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('Neutral baseline with no obvious setup.'),
    });

    assert.equal(result.candidates.length, SETUP_REGISTRY.length);
    assert.deepEqual(
      new Set(getScannedSetupTypes()),
      new Set(SETUP_REGISTRY.map((entry) => entry.setupType))
    );
    assert.ok(result.candidates.some((candidate) => candidate.setupType === SetupType.FvgImbalancePullback));
    assert.ok(result.candidates.some((candidate) => candidate.setupType === SetupType.MomentumPullbackBreatherReclaim));
    assert.ok(result.candidates.some((candidate) => candidate.setupType === SetupType.LunchFailedHighReversal));
    assert.ok(result.candidates.some((candidate) => candidate.setupType === SetupType.LunchFailedLowReversal));
    assert.ok(result.candidates.some((candidate) => candidate.setupType === SetupType.LunchCompressionBreakout));
    assert.ok(result.candidates.some((candidate) => candidate.setupType === SetupType.LunchFailedContinuation));
    assert.ok(result.candidates.some((candidate) => candidate.setupType === SetupType.LunchRangeReclaim));
  }],

  ['risk too wide preserves detected setup candidate', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('Momentum runaway long with vertical expansion and staircase continuation.', 7400, 7390),
    });
    const momentum = result.candidates.find((candidate) => candidate.setupType === SetupType.MomentumRunaway);

    assert.ok(momentum);
    assert.equal(momentum.detectedStatus, SetupCandidateStatus.Detected);
    assert.equal(momentum.executionStatus, ExecutionStatus.Conditional);
    assert.equal(momentum.blockReason, NoTradeReason.RiskTooWide);
    assert.ok(momentum.reducedRiskPlan);
  }],

  ['one blocked setup does not stop remaining setup evaluation', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('Liquidity sweep long plus FVG pullback into imbalance after a breather reclaim.', 7400, 7390),
    });

    const liquidity = result.candidates.find((candidate) => candidate.setupType === SetupType.LiquiditySweep);
    const fvgPullback = result.candidates.find((candidate) => candidate.setupType === SetupType.FvgImbalancePullback);
    const breather = result.candidates.find((candidate) => candidate.setupType === SetupType.MomentumPullbackBreatherReclaim);

    assert.equal(result.candidates.length, SETUP_REGISTRY.length);
    assert.equal(liquidity?.executionStatus, ExecutionStatus.Conditional);
    assert.equal(fvgPullback?.executionStatus, ExecutionStatus.Conditional);
    assert.equal(breather?.executionStatus, ExecutionStatus.Conditional);
  }],

  ['setup detection alone does not approve a trade', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('Liquidity sweep long reclaimed the opening low with a pending trigger.', 7400, 7396),
    });
    const liquidity = result.candidates.find((candidate) => candidate.setupType === SetupType.LiquiditySweep);

    assert.ok(liquidity);
    assert.equal(liquidity.detectedStatus, SetupCandidateStatus.Detected);
    assert.notEqual(liquidity.executionStatus, ExecutionStatus.Executable);
    assert.equal(liquidity.executionStatus, ExecutionStatus.Conditional);
  }],

  ['best executable candidate is selected when available', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('Liquidity sweep long reclaimed the opening low with a confirmed trigger.', 7400, 7396, 'TRIGGERED'),
    });

    assert.equal(result.bestExecutableCandidate?.setupType, SetupType.LiquiditySweep);
    assert.equal(result.bestExecutableCandidate?.executionStatus, ExecutionStatus.Executable);
    assert.equal(result.bestExecutableCandidate?.entry, 7400);
    assert.equal(result.bestExecutableCandidate?.stop, 7396);
  }],

  ['best conditional candidate is shown when no executable candidate exists', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('FVG pullback long into imbalance needs reclaim confirmation.', NaN, 7396),
    });

    assert.equal(result.bestExecutableCandidate, null);
    assert.ok(result.bestConditionalCandidate);
    assert.equal(result.bestConditionalCandidate?.executionStatus, ExecutionStatus.Conditional);
    assert.ok(
      result.candidates.some((candidate) =>
        candidate.setupType === SetupType.FvgImbalancePullback &&
        candidate.executionStatus === ExecutionStatus.Conditional
      )
    );
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

  ['approved execution requires entry stop targets invalidation trigger and risk inside limit', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('Liquidity sweep long reclaimed the opening low with a confirmed trigger.', 7400, 7396, 'TRIGGERED'),
    });
    const best = result.bestExecutableCandidate;

    assert.ok(best);
    assert.equal(best.executionStatus, ExecutionStatus.Executable);
    assert.equal(typeof best.entry, 'number');
    assert.equal(typeof best.stop, 'number');
    assert.equal(typeof best.target1, 'number');
    assert.equal(typeof best.target2, 'number');
    assert.ok(best.invalidation);
    assert.ok(best.requiredTrigger);
    assert.ok((best.riskPoints || Infinity) <= 8);
  }],

  ['high-priority RiskTooWide setup becomes conditional instead of no setup', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('Liquidity sweep long reclaimed after a stop hunt.', 7400, 7388),
    });
    const liquidity = result.candidates.find((candidate) => candidate.setupType === SetupType.LiquiditySweep);

    assert.ok(liquidity);
    assert.equal(liquidity.detectedStatus, SetupCandidateStatus.Detected);
    assert.equal(liquidity.executionStatus, ExecutionStatus.Conditional);
    assert.equal(liquidity.blockReason, NoTradeReason.RiskTooWide);
    assert.notEqual(liquidity.setupType, SetupType.NoSetup);
  }],

  ['weak setup with RiskTooWide does not become approved', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('Opening gap fill long toward prior close.', 7400, 7388),
    });
    const gapFill = result.candidates.find((candidate) => candidate.setupType === SetupType.OpeningGapFill);

    assert.ok(gapFill);
    assert.equal(gapFill.blockReason, NoTradeReason.RiskTooWide);
    assert.notEqual(gapFill.executionStatus, ExecutionStatus.Executable);
  }],

  ['T1 and T2 are calculated from R and rounded to MES tick size', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('Liquidity sweep long reclaimed the opening low with a confirmed trigger.', 7400.1, 7395.95, 'TRIGGERED'),
    });
    const best = result.bestExecutableCandidate;

    assert.ok(best);
    assert.ok(Math.abs((best.riskPoints || 0) - 4.15) < 0.001);
    assert.equal(best.target1, 7406.25);
    assert.equal(best.target2, 7408.5);
    assert.equal((best.target1 as number) % 0.25, 0);
    assert.equal((best.target2 as number) % 0.25, 0);
  }],

  ['uncertain entry or stop levels require manual confirmation', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      result: resultWithText('Momentum pullback breather reclaim is possible but exact entry and stop are unclear.', NaN, NaN),
    });
    const breather = result.candidates.find((candidate) => candidate.setupType === SetupType.MomentumPullbackBreatherReclaim);

    assert.ok(breather);
    assert.equal(breather.executionStatus, ExecutionStatus.Conditional);
    assert.ok(
      breather.blockReason === NoTradeReason.EntryTriggerMissing ||
      breather.blockReason === NoTradeReason.InvalidStopLocation
    );
    assert.ok(breather.requiredTrigger);
    assert.equal(breather.entry, null);
    assert.equal(breather.stop, null);
  }],

  ['structured chart context is preferred over narrative text matching', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      chartContext: structuredContext(),
      result: resultWithText('Neutral baseline with no obvious setup.', NaN, NaN),
    });
    const liquidity = result.candidates.find((candidate) => candidate.setupType === SetupType.LiquiditySweep);

    assert.ok(liquidity);
    assert.equal(liquidity.detectedStatus, SetupCandidateStatus.Detected);
    assert.equal(liquidity.executionStatus, ExecutionStatus.Executable);
    assert.equal(liquidity.entry, 7400);
    assert.equal(liquidity.stop, 7396);
    assert.equal(liquidity.evidence[0], 'Structured sweep and reclaim facts detected.');
    assert.equal(result.bestExecutableCandidate?.setupType, SetupType.LiquiditySweep);
  }],

  ['narrative cannot override structured setup direction or evidence', () => {
    const context = structuredContext();
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      chartContext: context,
      result: resultWithText('Bearish momentum runaway short rejects resistance and should sell.', 7400, 7396, 'TRIGGERED'),
    });
    const liquidity = result.candidates.find((candidate) => candidate.setupType === SetupType.LiquiditySweep);

    assert.ok(liquidity);
    assert.equal(liquidity.detectedStatus, SetupCandidateStatus.Detected);
    assert.equal(liquidity.direction, 'LONG');
    assert.equal(liquidity.evidence[0], 'Structured sweep and reclaim facts detected.');
    assert.equal(result.bestExecutableCandidate?.setupType, SetupType.LiquiditySweep);
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

    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      chartContext: context,
      result: resultWithText('Liquidity sweep long reclaimed the opening low with a confirmed trigger.', 7400, 7396, 'TRIGGERED'),
    });
    const liquidity = result.candidates.find((candidate) => candidate.setupType === SetupType.LiquiditySweep);

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
    const fvg = result.candidates.find((candidate) => candidate.setupType === SetupType.FairValueGap);
    const fvgPullback = result.candidates.find((candidate) => candidate.setupType === SetupType.FvgImbalancePullback);

    assert.equal(fvg?.detectedStatus, SetupCandidateStatus.Detected);
    assert.equal(fvgPullback?.detectedStatus, SetupCandidateStatus.Detected);
    assert.equal(fvg?.executionStatus, ExecutionStatus.Conditional);
    assert.equal(fvgPullback?.executionStatus, ExecutionStatus.Conditional);
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

    assert.ok(momentum);
    assert.equal(momentum.detectedStatus, SetupCandidateStatus.NotDetected);
    assert.notEqual(momentum.executionStatus, ExecutionStatus.Executable);
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
    const liquidity = result.candidates.find((candidate) => candidate.setupType === SetupType.LiquiditySweep);

    assert.ok(liquidity);
    assert.equal(liquidity.detectedStatus, SetupCandidateStatus.Detected);
    assert.notEqual(liquidity.executionStatus, ExecutionStatus.NotDetected);
  }],

  ['scanner does not require narrative text when structured evidence is present', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_morning',
      chartContext: structuredContext(),
      result: null,
    });
    const liquidity = result.candidates.find((candidate) => candidate.setupType === SetupType.LiquiditySweep);

    assert.ok(liquidity);
    assert.equal(liquidity.detectedStatus, SetupCandidateStatus.Detected);
    assert.equal(liquidity.executionStatus, ExecutionStatus.Executable);
    assert.equal(result.bestExecutableCandidate?.setupType, SetupType.LiquiditySweep);
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

    assert.ok(breather);
    assert.equal(breather.detectedStatus, SetupCandidateStatus.Detected);
    assert.equal(breather.executionStatus, ExecutionStatus.Conditional);
    assert.equal(breather.entry, null);
    assert.equal(breather.stop, null);
    assert.ok(breather.missingEvidence.includes('Exact entry and stop labels are unclear.'));
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
    const liquidity = result.candidates.find((candidate) => candidate.setupType === SetupType.LiquiditySweep);

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
    const liquidity = result.candidates.find((candidate) => candidate.setupType === SetupType.LiquiditySweep);

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
    const liquidity = result.candidates.find((candidate) => candidate.setupType === SetupType.LiquiditySweep);

    assert.ok(liquidity);
    assert.equal(liquidity.detectedStatus, SetupCandidateStatus.Detected);
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
    const liquidity = result.candidates.find((candidate) => candidate.setupType === SetupType.LiquiditySweep);

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

    assert.ok(failedHigh);
    assert.equal(failedHigh.detectedStatus, SetupCandidateStatus.NotDetected);
    assert.equal(failedHigh.executionStatus, ExecutionStatus.NotDetected);
    assert.ok(failedHigh.missingEvidence.includes('Completed Morning window context is required before this Lunch subtype can activate.'));
    assert.notEqual(result.bestExecutableCandidate?.setupType, SetupType.LunchFailedHighReversal);
  }],

  ['Lunch Failed High Reversal detects only after completed Morning high context is available', () => {
    const result = scanSetupCandidates({
      sessionType: 'replay_lunch',
      chartContext: lunchContext(),
      result: null,
    });
    const failedHigh = result.candidates.find((candidate) => candidate.setupType === SetupType.LunchFailedHighReversal);

    assert.ok(failedHigh);
    assert.equal(failedHigh.detectedStatus, SetupCandidateStatus.Detected);
    assert.equal(failedHigh.direction, 'SHORT');
    assert.equal(failedHigh.executionStatus, ExecutionStatus.Executable);
    assert.equal(failedHigh.entry, 7417.75);
    assert.equal(failedHigh.stop, 7419);
    assert.equal(result.bestExecutableCandidate?.setupType, SetupType.LunchFailedHighReversal);
  }],

  ['Lunch Failed Low Reversal detects from completed Morning low sweep context', () => {
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

    assert.ok(failedLow);
    assert.equal(failedLow.detectedStatus, SetupCandidateStatus.Detected);
    assert.equal(failedLow.direction, 'LONG');
    assert.equal(failedLow.executionStatus, ExecutionStatus.Executable);
  }],

  ['Lunch Compression Breakout detects from completed Morning context plus compression facts', () => {
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

    assert.ok(compression);
    assert.equal(compression.detectedStatus, SetupCandidateStatus.Detected);
    assert.equal(compression.executionStatus, ExecutionStatus.Executable);
  }],

  ['Lunch Failed Continuation detects from completed Morning extension and structure shift', () => {
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

    assert.ok(failedContinuation);
    assert.equal(failedContinuation.detectedStatus, SetupCandidateStatus.Detected);
    assert.equal(failedContinuation.executionStatus, ExecutionStatus.Executable);
  }],

  ['Lunch Range Reclaim detects from completed Morning range reclaim facts', () => {
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

    assert.ok(rangeReclaim);
    assert.equal(rangeReclaim.detectedStatus, SetupCandidateStatus.Detected);
    assert.equal(rangeReclaim.executionStatus, ExecutionStatus.Executable);
  }],
];

for (const [name, test] of tests) {
  test();
  console.log(`✓ ${name}`);
}

console.log(`✓ Setup scanner verified across ${tests.length} cases.`);
