import assert from 'node:assert/strict';
import { scanSetupCandidates } from './setupScanner';
import { ExecutionStatus, SetupType, type ChartContext } from '../types';

function htfState(direction: 'bullish' | 'bearish') {
  return {
    htfContextSufficiency: { overallStatus: 'sufficient', blockers: [] },
    htfContextDataLimited: false,
    classificationReliability: 'sufficient',
    blockers: [],
    classification: 'MSS_TRIGGER_CONFIRMED',
    fiveMinuteState: { timeframe: '5M', direction, status: 'confirmed', lifecycleState: 'confirmed_mss', evidence: [], confidence: 90 },
    timeframeStates: ['4H', '2H', '1H', '15M', '5M'].map((timeframe) => ({
      timeframe,
      direction,
      status: 'confirmed',
      lifecycleState: 'confirmed_mss',
      evidence: [],
      confidence: 90,
    })),
  };
}

function factSet(timeframe: '4h' | '2h' | '1h' | '15m' | '5m', trend: 'bullish' | 'bearish') {
  return {
    timeframe,
    role: timeframe === '5m' ? 'execution' : timeframe === '15m' ? 'liquidity_map' : 'macro_context',
    barCount: 30,
    high: null,
    low: null,
    open: null,
    close: null,
    midpoint: null,
    rangePoints: null,
    trend,
    candles: [],
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

function context(direction: 'LONG' | 'SHORT', oneZoneOnly = false): ChartContext {
  const bullish = direction === 'LONG';
  const trend = bullish ? 'bullish' : 'bearish';
  const firstZone = bullish
    ? { direction, lower: 7722.25, upper: 7726.75, midpoint: 7724.5, formedAt: '2026-08-27T04:30:00-04:00', formedCandleIndex: 1, impulseQualified: true, confidence: 'High' }
    : { direction, lower: 7699.5, upper: 7704, midpoint: 7701.75, formedAt: '2026-08-27T09:45:00-04:00', formedCandleIndex: 1, impulseQualified: true, confidence: 'High' };
  const finalBoss = bullish
    ? { direction, lower: 7700, upper: 7703, midpoint: 7701.5, formedAt: '2026-08-26T16:45:00-04:00', formedCandleIndex: 0, impulseQualified: true, confidence: 'High' }
    : { direction, lower: 7718, upper: 7721, midpoint: 7719.5, formedAt: '2026-08-26T16:45:00-04:00', formedCandleIndex: 0, impulseQualified: true, confidence: 'High' };
  const zones = oneZoneOnly ? [finalBoss] : [finalBoss, firstZone];
  const candles = bullish
    ? [
      { index: 0, timestamp: '2026-08-27T04:40:00-04:00', open: 7729, high: 7734, low: 7727.25, close: 7733.25, direction: 'bullish', confidence: 'High' },
      { index: 1, timestamp: '2026-08-27T09:45:00-04:00', open: 7730, high: 7731.5, low: oneZoneOnly ? 7701.5 : 7723.25, close: oneZoneOnly ? 7704 : 7727.25, direction: 'bullish', isReclaim: true, confidence: 'High' },
      { index: 2, timestamp: '2026-08-27T09:50:00-04:00', open: oneZoneOnly ? 7704 : 7727.25, high: oneZoneOnly ? 7711 : 7732, low: oneZoneOnly ? 7703.5 : 7726.75, close: oneZoneOnly ? 7710 : 7730.25, direction: 'bullish', isExpansion: true, confidence: 'High' },
    ]
    : [
      { index: 0, timestamp: '2026-08-27T09:40:00-04:00', open: 7695, high: 7699, low: 7688, close: 7689.25, direction: 'bearish', confidence: 'High' },
      { index: 1, timestamp: '2026-08-27T10:00:00-04:00', open: 7692, high: oneZoneOnly ? 7719.25 : 7702.5, low: 7688.5, close: oneZoneOnly ? 7716.75 : 7699, direction: 'bearish', isRejection: true, confidence: 'High' },
      { index: 2, timestamp: '2026-08-27T10:05:00-04:00', open: oneZoneOnly ? 7716.75 : 7699, high: oneZoneOnly ? 7717 : 7700, low: oneZoneOnly ? 7708 : 7690, close: oneZoneOnly ? 7709 : 7691.25, direction: 'bearish', isExpansion: true, confidence: 'High' },
    ];

  return {
    sessionType: 'replay_morning',
    instrument: 'MES',
    tradeDate: '2026-08-27',
    timeframe: '5m',
    chartTimestamp: bullish ? '2026-08-27T09:50:00-04:00' : '2026-08-27T10:05:00-04:00',
    screenshotTimezone: 'EST',
    screenshotUsability: 'usable',
    marketContext: 'FVG Strength Continuation fixture. Boundary break is not required.',
    keyLevels: bullish
      ? { currentPrice: oneZoneOnly ? 7710 : 7730.25, activeSwingLow: oneZoneOnly ? 7698.75 : 7721.75, previousDayHigh: 7750, activeSwingHigh: 7750 }
      : { currentPrice: oneZoneOnly ? 7709 : 7691.25, activeSwingHigh: oneZoneOnly ? 7722.25 : 7705.25, previousDayLow: 7672, activeSwingLow: 7672 },
    candles: candles as any,
    fvgZones: zones as any,
    displacementCandles: [{
      direction,
      candleIndex: 2,
      timestamp: candles[2].timestamp,
      bodyPoints: 7,
      rangePoints: 9,
      bodyToRange: 0.75,
      closeLocation: bullish ? 'top_quarter' : 'bottom_quarter',
      quality: 'confirmed',
      leavesImbalance: true,
      breaksStructure: true,
      confidence: 'High',
    }],
    setupReadyFacts: {
      pullbackIntoFvg: true,
      fvgReclaimed: bullish,
      breakOfStructure: true,
      sweepThenReclaim: false,
    },
    multiTimeframeContext: {
      source: 'ninjatrader_bridge',
      authority: 'ohlc_facts_only',
      fourHour: factSet('4h', trend),
      twoHour: factSet('2h', trend),
      oneHour: factSet('1h', trend),
      fifteenMinute: { ...factSet('15m', trend), fvgZones: zones },
      fiveMinute: { ...factSet('5m', trend), displacementCandles: [] },
      alignment: {
        macroBias: direction,
        sessionBias: direction,
        liquidityBias: direction,
        executionBias: direction,
        alignedDirection: direction,
        conflicts: [],
        notes: ['Trend-side FVG continuation fixture.'],
      },
      targetMap: { levelsToWatch: [] },
      rules: { higherTimeframesApproveTrades: false, fiveMinuteExecutionRequired: true, aiMayOverwriteOhlcFacts: false },
      notes: [],
    } as any,
    timeframeMssEvidence: {
      source: 'ninjatrader_ohlc',
      authority: 'ohlc_facts_only',
      boundary: 'evidence_only_not_approval_or_execution_authority',
      timeframes: {
        '5M': { timeframe: '5M', direction: trend, status: 'confirmed_mss', confidence: 90 },
        '15M': { timeframe: '15M', direction: trend, status: 'confirmed_mss', confidence: 90 },
      },
      notes: [],
      approvesExecution: false,
      changesTradeLogic: false,
    } as any,
    htfLiquidityDrawState: htfState(trend) as any,
    targetObjectives: [{
      label: bullish ? 'Forward buy-side liquidity' : 'Forward sell-side liquidity',
      price: bullish ? 7750 : 7672,
      direction,
      source: 'app',
      type: 'liquidity_pool',
      confidence: 'High',
      score: 95,
      reason: 'Forward objective.',
    }],
  };
}

for (const direction of ['LONG', 'SHORT'] as const) {
  const scan = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context(direction), result: null });
  const candidate = scan.candidates.find((item) => item.setupType === SetupType.FvgStrengthContinuation);
  assert.ok(candidate, `${direction} FVG strength continuation candidate should exist`);
  assert.equal(candidate.direction, direction);
  assert.equal(candidate.executionStatus, ExecutionStatus.Conditional);
  assert.equal(candidate.humanReview?.canExecute, false);
  assert.equal(candidate.humanReview?.discordTradePlanEligible, true);
  assert.match(candidate.requiredTrigger || '', /Boundary break is not required/);
  assert.ok(candidate.evidence.some((item) => /Boundary break is not required/i.test(item)));
  assert.ok(!candidate.evidence.some((item) => /sweep\/reclaim|sweep\/reject|sweep below|sweep above/i.test(item)));
  assert.ok(candidate.stop !== null);
  assert.ok(candidate.target1 !== null);
  assert.ok(candidate.target2 !== null);
}

const finalBossOnlyScan = scanSetupCandidates({ sessionType: 'replay_morning', chartContext: context('LONG', true), result: null });
const finalBossOnly = finalBossOnlyScan.candidates.find((item) => item.setupType === SetupType.FvgStrengthContinuation);
assert.ok(finalBossOnly);
assert.match(finalBossOnly.tacticalZone?.label || '', /Final Boss Zone/);
assert.match(finalBossOnly.levelContextSummary || '', /single 15M FVG can qualify|Final Boss Zone/i);

console.log('FVG Strength Continuation scanner checks passed.');
