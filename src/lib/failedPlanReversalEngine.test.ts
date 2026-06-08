import assert from 'node:assert/strict';
import {
  ChartContext,
  ExecutionStatus,
  SetupType,
  TimeframeFactSet,
} from '../types';
import { scanSetupCandidates } from './setupScanner';
import { buildFailedPlanReversalContextFromChartContext } from './failedPlanReversalEngine';

type Direction = 'LONG' | 'SHORT';

function timeframe(
  name: TimeframeFactSet['timeframe'],
  direction: Direction | 'NEUTRAL' | 'UNKNOWN',
  opts: { displacement?: boolean; conflict?: boolean; bars?: number } = {},
): TimeframeFactSet {
  const trend =
    direction === 'LONG' ? 'bullish' :
    direction === 'SHORT' ? 'bearish' :
    direction === 'NEUTRAL' ? 'balanced' :
    'unknown';
  const displacementDirection = opts.conflict
    ? direction === 'LONG' ? 'SHORT' : 'LONG'
    : direction === 'LONG' || direction === 'SHORT' ? direction : null;
  return {
    timeframe: name,
    role: name === '4h' ? 'macro_context' : name === '2h' || name === '1h' ? 'session_structure' : name === '15m' ? 'liquidity_map' : 'execution',
    barCount: opts.bars ?? 120,
    high: 7615,
    low: 7575,
    open: 7600,
    close: direction === 'SHORT' ? 7585 : 7610,
    midpoint: 7595,
    rangePoints: 40,
    trend,
    candles: [],
    fvgZones: [],
    liquiditySweeps: [],
    reclaimEvents: [],
    failedBreakEvents: [],
    displacementCandles: opts.displacement && displacementDirection ? [{
      direction: displacementDirection,
      candleIndex: 12,
      timestamp: '2026-06-05T10:00:00-04:00',
      open: displacementDirection === 'SHORT' ? 7608.5 : 7588.5,
      high: displacementDirection === 'SHORT' ? 7614.75 : 7605,
      low: displacementDirection === 'SHORT' ? 7591.75 : 7580,
      close: displacementDirection === 'SHORT' ? 7592.75 : 7604,
      bodyPoints: 15.75,
      rangePoints: 23,
      bodyToRange: 0.68,
      closeLocation: displacementDirection === 'SHORT' ? 'bottom_quarter' : 'top_quarter',
      displacementScore: 85,
      quality: 'confirmed',
      leavesImbalance: true,
      breaksStructure: true,
      confidence: 'High',
      evidence: `${name} ${displacementDirection} displacement confirmed by close.`,
    }] : [],
    structuralLevels: [],
    confidence: 'High',
    notes: [],
  };
}

function sufficientHtfContextFields() {
  const timeframeCoverage = [
    { timeframe: '4H' as const, barsLoaded: 180, rangeStart: '2026-05-06T00:00:00-04:00', rangeEnd: '2026-06-05T12:00:00-04:00', minimumExpectedDescription: '30 calendar days when available.', minimumSatisfied: true, status: 'sufficient' as const },
    { timeframe: '2H' as const, barsLoaded: 360, rangeStart: '2026-05-06T00:00:00-04:00', rangeEnd: '2026-06-05T12:00:00-04:00', minimumExpectedDescription: '30 calendar days when available.', minimumSatisfied: true, status: 'sufficient' as const },
    { timeframe: '1H' as const, barsLoaded: 720, rangeStart: '2026-05-06T00:00:00-04:00', rangeEnd: '2026-06-05T12:00:00-04:00', minimumExpectedDescription: '30 calendar days when available.', minimumSatisfied: true, status: 'sufficient' as const },
    { timeframe: '15M' as const, barsLoaded: 2880, rangeStart: '2026-05-06T00:00:00-04:00', rangeEnd: '2026-06-05T12:00:00-04:00', minimumExpectedDescription: '30 calendar days when available.', minimumSatisfied: true, status: 'sufficient' as const },
    { timeframe: '5M' as const, barsLoaded: 8640, rangeStart: '2026-05-06T00:00:00-04:00', rangeEnd: '2026-06-05T12:00:00-04:00', minimumExpectedDescription: '30 calendar days when available; active setup-scan window remains the execution trigger authority.', minimumSatisfied: true, status: 'sufficient' as const },
  ];
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

function timeframeMssEvidenceLayer(direction: Direction): NonNullable<ChartContext['timeframeMssEvidence']> {
  const mssDirection = direction === 'LONG' ? 'bullish' : 'bearish';
  const buildEvidence = (timeframeName: '5M' | '15M' | '60M' | '120M' | '240M'): NonNullable<ChartContext['timeframeMssEvidence']>['timeframes']['5M'] => ({
    timeframe: timeframeName,
    direction: mssDirection,
    status: 'confirmed_mss',
    displacementQuality: {
      present: true,
      direction: mssDirection,
      score: 86,
      bodyToRange: 0.68,
      closeLocation: 0.82,
      rangeExpansion: 1.4,
    },
    breaksStructure: true,
    evidenceTimestamp: '2026-06-05T10:05:00-04:00',
    completedBarStatus: 'completed',
    barTimestampMode: 'close',
    barTimeZone: 'eastern',
    source: 'ninjatrader_ohlc',
    blockers: [],
    confidence: 86,
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
    notes: ['Failed-plan reversal fixture active timeframe MSS evidence.'],
    approvesExecution: false,
    changesTradeLogic: false,
  };
}

function baseChartContext(direction: Direction = 'SHORT', overrides: Partial<ChartContext> = {}): ChartContext {
  const original = direction === 'SHORT' ? 'LONG' : 'SHORT';
  const bullish = direction === 'LONG';
  return {
    sessionType: 'morning',
    instrument: 'MES',
    tradeDate: '2026-06-05',
    timeframe: '5m',
    screenshotUsability: 'usable',
    keyLevels: {
      currentPrice: direction === 'SHORT' ? 7589.25 : 7604.25,
      activeSwingHigh: 7597.25,
      activeSwingLow: 7591.25,
      previousDayLow: 7574,
      previousDayHigh: 7632.75,
    },
    failedBreakEvents: [{
      direction,
      failedLevel: direction === 'SHORT' ? 7518 : 7604.75,
      levelLabel: `${original} decision/reclaim level`,
      sweptExtreme: direction === 'SHORT' ? 7524 : 7598,
      timestamp: '2026-06-05T10:00:00-04:00',
      candleIndex: 8,
      confidence: 'High',
      evidence: `App-owned ${original} plan failed its decision/reclaim level.`,
    }],
    multiTimeframeContext: {
      source: 'ninjatrader_bridge',
      authority: 'ohlc_facts_only',
      fourHour: timeframe('4h', direction, { displacement: true }),
      twoHour: timeframe('2h', direction, { displacement: true }),
      oneHour: timeframe('1h', direction, { displacement: true }),
      fifteenMinute: timeframe('15m', direction, { displacement: true }),
      fiveMinute: timeframe('5m', direction, { displacement: true }),
      alignment: {
        macroBias: 'NEUTRAL',
        sessionBias: direction,
        liquidityBias: direction,
        executionBias: direction,
        alignedDirection: direction,
        conflicts: [],
        notes: [],
      },
      targetMap: {
        nearestDownsideLiquidity: { label: 'External sell-side liquidity', price: 7574, type: 'low', source: 'ninjatrader', directionRelevance: 'SHORT', confidence: 'High', strengthScore: 90 },
        nearestUpsideLiquidity: { label: 'External buy-side liquidity', price: 7632.75, type: 'high', source: 'ninjatrader', directionRelevance: 'LONG', confidence: 'High', strengthScore: 90 },
        levelsToWatch: [],
      },
      rules: {
        higherTimeframesApproveTrades: false,
        fiveMinuteExecutionRequired: true,
        aiMayOverwriteOhlcFacts: false,
      },
      notes: [],
    },
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
      externalLiquidityTarget: direction === 'SHORT' ? 'External sell-side liquidity' : 'External buy-side liquidity',
      classification: 'MSS_TRIGGER_CONFIRMED',
      timeframeStates: [],
      timeframeStack: [],
      fiveMinuteState: {
        timeframe: '5M',
        direction: bullish ? 'bullish' : 'bearish',
        status: 'confirmed',
        lifecycleState: 'confirmed_mss',
        evidence: ['5M opposite-side trigger confirmed.'],
        confidence: 88,
      },
      fiveMinuteMssTriggerConfirmed: true,
      fiveMinuteMssConfirmationType: 'swing_break_with_displacement',
      postShiftState: 'post_mss_digestion',
      fifteenMinuteConfirmationStatus: 'confirmed',
      activeScanWindow: 'MORNING_SETUP_SCAN',
      htfDrawContinuationPending: true,
      confidence: 86,
      notes: [],
      blockers: [],
      createsTradingPlanCandidate: false,
      approvesExecution: false,
      ...sufficientHtfContextFields(),
    },
    displacementCandles: [{
      direction,
      candleIndex: 9,
      timestamp: '2026-06-05T10:05:00-04:00',
      open: direction === 'SHORT' ? 7595 : 7590,
      high: direction === 'SHORT' ? 7597 : 7607,
      low: direction === 'SHORT' ? 7587 : 7588,
      close: direction === 'SHORT' ? 7589.25 : 7604.25,
      quality: 'confirmed',
      leavesImbalance: true,
      breaksStructure: true,
      confidence: 'High',
    }],
    setupReadyFacts: { breakOfStructure: true },
    structureQualityContext: {
      direction,
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
      reasons: ['Completed 5M opposite-side MSS confirmed by close.'],
      missingReasons: [],
    },
    targetObjectives: [{
      label: direction === 'SHORT' ? 'External sell-side liquidity' : 'External buy-side liquidity',
      price: direction === 'SHORT' ? 7574 : 7632.75,
      direction,
      source: 'ninjatrader',
      type: direction === 'SHORT' ? 'low' : 'high',
      confidence: 'High',
      score: 92,
      reason: 'External liquidity objective.',
    }],
    proposedEntry: direction === 'SHORT' ? 7589.25 : 7604.25,
    proposedStop: direction === 'SHORT' ? 7597.25 : 7598.25,
    riskPoints: direction === 'SHORT' ? 8 : 6,
    riskStatus: 'WithinLimit',
    entryConfirmed: true,
    stopConfirmed: true,
    timeframeMssEvidence: timeframeMssEvidenceLayer(direction),
    marketContext: 'Structured OHLC test context.',
    ...overrides,
  };
}

const tests: Array<[string, () => void]> = [
  ['builds fully confirmed failed-long to bearish reversal context from structured OHLC', () => {
    const context = buildFailedPlanReversalContextFromChartContext(baseChartContext('SHORT'));
    assert.ok(context);
    assert.equal(context.originalPlanDirection, 'LONG');
    assert.equal(context.oppositeDirection, 'SHORT');
    assert.equal(context.htfStackStatus, 'full_confirmation');
    assert.equal(context.fiveMinuteTriggerStatus, 'confirmed');
    assert.equal(context.createsCandidate, true);
    assert.equal(context.approvesExecution, false);
    assert.equal(context.timeframeConfirmations.find((item) => item.timeframe === '2H')?.status, 'confirmed');
  }],

  ['builds failed-short to bullish reversal context symmetrically', () => {
    const context = buildFailedPlanReversalContextFromChartContext(baseChartContext('LONG'));
    assert.ok(context);
    assert.equal(context.originalPlanDirection, 'SHORT');
    assert.equal(context.oppositeDirection, 'LONG');
    assert.equal(context.htfStackStatus, 'full_confirmation');
    assert.equal(context.fiveMinuteTriggerStatus, 'confirmed');
    assert.equal(context.createsCandidate, true);
  }],

  ['scanner history coverage insufficiency downgrades aligned HTF facts to data-limited', () => {
    const chart = baseChartContext('SHORT', {
      scannerHistoryCoverage: [
        {
          timeframe: '15m',
          requiredLookbackDays: 30,
          requestedFrom: '2026-05-06T00:00:00-04:00',
          requestedTo: '2026-06-05T12:00:00-04:00',
          barsLoaded: 500,
          rangeStart: '2026-05-06T00:00:00-04:00',
          rangeEnd: '2026-06-05T12:00:00-04:00',
          source: 'market_bars',
          sufficient: true,
          warning: null,
        },
        {
          timeframe: '60m',
          requiredLookbackDays: 30,
          requestedFrom: '2026-05-06T00:00:00-04:00',
          requestedTo: '2026-06-05T12:00:00-04:00',
          barsLoaded: 240,
          rangeStart: '2026-05-06T00:00:00-04:00',
          rangeEnd: '2026-06-05T12:00:00-04:00',
          source: 'market_bars',
          sufficient: true,
          warning: null,
        },
        {
          timeframe: '120m',
          requiredLookbackDays: 30,
          requestedFrom: '2026-05-06T00:00:00-04:00',
          requestedTo: '2026-06-05T12:00:00-04:00',
          barsLoaded: 12,
          rangeStart: '2026-06-04T00:00:00-04:00',
          rangeEnd: '2026-06-05T12:00:00-04:00',
          source: 'bridge_repair',
          sufficient: false,
          warning: 'HTF history preload insufficient for 120m.',
          dataLimitation: {
            status: 'bridge_or_cache_incomplete',
            message: 'Requested 120m bars remain incomplete after cache preload, single bridge repair, and segmented bridge repair. The scanner cannot invent missing NinjaTrader bars; HTF promotion is blocked for this timeframe.',
            retryPolicy: 'cache_then_single_bridge_then_segmented_bridge',
            canInventMissingBars: false,
            htfPromotionAllowed: false,
            operatorAction: 'Load the requested MES 06-26 120m history in NinjaTrader or run npm run nt:backfill for the missing date range, then rerun the scanner/diagnostic.',
          },
        },
        {
          timeframe: '240m',
          requiredLookbackDays: 30,
          requestedFrom: '2026-05-06T00:00:00-04:00',
          requestedTo: '2026-06-05T12:00:00-04:00',
          barsLoaded: 6,
          rangeStart: '2026-06-04T00:00:00-04:00',
          rangeEnd: '2026-06-05T12:00:00-04:00',
          source: 'bridge_repair',
          sufficient: false,
          warning: 'HTF history preload insufficient for 240m.',
        },
      ],
    });
    const context = buildFailedPlanReversalContextFromChartContext(chart);
    assert.ok(context);
    assert.equal(context.htfStackStatus, 'data_limited');
    assert.equal(context.createsCandidate, false);
    assert.equal(context.timeframeConfirmations.find((item) => item.timeframe === '2H')?.status, 'data_limited');
    assert.equal(context.timeframeConfirmations.find((item) => item.timeframe === '4H')?.status, 'data_limited');
    assert.match(context.timeframeConfirmations.find((item) => item.timeframe === '2H')?.evidence.join(' ') || '', /cannot invent missing NinjaTrader bars/);
    assert.match(context.timeframeConfirmations.find((item) => item.timeframe === '2H')?.evidence.join(' ') || '', /Operator action: Load the requested MES 06-26 120m history/);
    assert.match(context.blockers.join(' '), /2H structured OHLC is data-limited or unavailable/);
    assert.match(context.blockers.join(' '), /4H structured OHLC is data-limited or unavailable/);
  }],

  ['does not create candidate when 1H materially conflicts', () => {
    const chart = baseChartContext('SHORT');
    chart.multiTimeframeContext!.oneHour = timeframe('1h', 'LONG', { displacement: true });
    const context = buildFailedPlanReversalContextFromChartContext(chart);
    assert.ok(context);
    assert.equal(context.htfStackStatus, 'conflict');
    assert.equal(context.createsCandidate, false);
    assert.match(context.blockers.join(' '), /requires 15M, 1H, 2H, and 4H structure confirmation/);
  }],

  ['does not create candidate when 2H materially conflicts', () => {
    const chart = baseChartContext('SHORT');
    chart.multiTimeframeContext!.twoHour = timeframe('2h', 'LONG', { displacement: true });
    const context = buildFailedPlanReversalContextFromChartContext(chart);
    assert.ok(context);
    assert.equal(context.htfStackStatus, 'conflict');
    assert.equal(context.createsCandidate, false);
  }],

  ['does not create candidate when 4H is neutral even if 15M 1H and 2H confirm', () => {
    const chart = baseChartContext('SHORT');
    chart.multiTimeframeContext!.fourHour = timeframe('4h', 'NEUTRAL');
    const context = buildFailedPlanReversalContextFromChartContext(chart);
    assert.ok(context);
    assert.equal(context.htfStackStatus, 'mixed');
    assert.equal(context.createsCandidate, false);
    assert.match(context.blockers.join(' '), /requires 15M, 1H, 2H, and 4H structure confirmation/);
  }],

  ['requires fresh completed 5M trigger before candidate creation', () => {
    const chart = baseChartContext('SHORT', {
      structureQualityContext: {
        ...baseChartContext('SHORT').structureQualityContext!,
        executionTimeframeConfirmed: false,
        structureBreakConfirmedByClose: false,
      },
      displacementCandles: [],
    });
    chart.multiTimeframeContext!.fiveMinute = timeframe('5m', 'SHORT', { displacement: false });
    const context = buildFailedPlanReversalContextFromChartContext(chart);
    assert.ok(context);
    assert.notEqual(context.fiveMinuteTriggerStatus, 'confirmed');
    assert.equal(context.createsCandidate, false);
  }],

  ['treats app-owned failed original 5M MSS as opposite-side trigger confirmation', () => {
    const chart = baseChartContext('SHORT', {
      structureQualityContext: {
        ...baseChartContext('SHORT').structureQualityContext!,
        executionTimeframeConfirmed: false,
        structureBreakConfirmedByClose: false,
      },
      displacementCandles: [],
      htfLiquidityDrawState: {
        source: 'ninjatrader_ohlc',
        authority: 'ohlc_facts_only',
        boundary: 'context_only_not_execution_authority',
        drawDirection: 'buy_side',
        planDirection: 'LONG',
        macroContext: 'conflicting',
        raidState: 'sell_side_raid',
        liquidityRaidState: 'sell_side_raid',
        reclaimStatus: 'not_confirmed',
        classification: 'FAILED_MSS',
        timeframeStates: [],
        timeframeStack: [],
        fiveMinuteState: {
          timeframe: '5M',
          direction: 'bullish',
          status: 'failed',
          lifecycleState: 'failed_mss',
          evidence: ['Bullish 5M MSS failed after app-owned long decision level failed.'],
          confidence: 20,
        },
        fiveMinuteMssTriggerConfirmed: false,
        htfDrawContinuationPending: false,
        confidence: 20,
        notes: [],
        blockers: [],
        createsTradingPlanCandidate: false,
        approvesExecution: false,
      },
    });
    chart.multiTimeframeContext!.fiveMinute = timeframe('5m', 'SHORT', { displacement: false });

    const context = buildFailedPlanReversalContextFromChartContext(chart);

    assert.ok(context);
    assert.equal(context.originalPlanDirection, 'LONG');
    assert.equal(context.oppositeDirection, 'SHORT');
    assert.equal(context.fiveMinuteTriggerStatus, 'confirmed');
    assert.equal(context.decisionState, 'FAILED_LONG_TO_BEARISH_MSS_CONFIRMED');
    assert.equal(context.createsCandidate, true);
    assert.equal(context.approvesExecution, false);
  }],

  ['marks stale/no fresh entry instead of candidate-ready', () => {
    const chart = baseChartContext('SHORT');
    chart.structureQualityContext = {
      ...chart.structureQualityContext!,
      noChaseRequired: true,
    };
    const context = buildFailedPlanReversalContextFromChartContext(chart);
    assert.ok(context);
    assert.equal(context.fiveMinuteTriggerStatus, 'no_fresh_entry');
    assert.equal(context.decisionState, 'NO_FRESH_ENTRY');
    assert.equal(context.createsCandidate, false);
  }],

  ['returns null when there is no failed decision level evidence', () => {
    const context = buildFailedPlanReversalContextFromChartContext(baseChartContext('SHORT', { failedBreakEvents: [] }));
    assert.equal(context, null);
  }],

  ['ignores generic failed-break liquidity events that are not app-owned plan failures', () => {
    const chart = baseChartContext('SHORT');
    chart.failedBreakEvents = [{
      direction: 'SHORT',
      failedLevel: 7518,
      levelLabel: 'Recent swing high',
      sweptExtreme: 7524,
      timestamp: '2026-06-05T10:00:00-04:00',
      candleIndex: 8,
      confidence: 'High',
      evidence: 'Failed breakout above recent swing high.',
    }];
    const context = buildFailedPlanReversalContextFromChartContext(chart);
    assert.equal(context, null);
  }],

  ['scanner consumes generated context without inheriting execution authority', () => {
    const chart = baseChartContext('SHORT');
    const generated = buildFailedPlanReversalContextFromChartContext(chart);
    assert.ok(generated);
    const result = scanSetupCandidates({
      sessionType: 'morning',
      chartContext: { ...chart, failedPlanReversal: generated },
      result: null,
    });
    const candidate = result.candidates.find((item) => item.setupType === SetupType.FailedPlanReversal);
    assert.ok(candidate);
    assert.equal(candidate.direction, 'SHORT');
    assert.equal(candidate.executionStatus, ExecutionStatus.Executable);
    assert.equal(candidate.failedPlanReversal?.approvesExecution, false);
    assert.equal(candidate.failedPlanReversal?.createsCandidate, true);
  }],
];

for (const [name, test] of tests) {
  try {
    test();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}
