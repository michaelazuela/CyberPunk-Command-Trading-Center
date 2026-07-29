import assert from 'node:assert/strict';
import { ExecutionStatus, NoTradeReason, SetupType, TradeDecisionStatus, type AnalysisResult, type ChartCandleFact, type MultiTimeframeContext, type TimeframeFactSet } from '../types';
import { runTradeDecisionPipeline } from './tradeDecisionPipeline';

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

function fiveModelResult(): AnalysisResult {
  const candles = [
    candle(1, '2026-07-27T09:25:00-04:00', 7488, 7490, 7480, 7482),
    candle(2, '2026-07-27T09:30:00-04:00', 7493, 7496, 7493, 7495),
  ];
  return {
    dayType: 'LONG',
    reasoning: 'Structured OHLC proof, not narrative promotion.',
    confidence: 0.9,
    checks: [],
    structuredChartContext: {
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
      marketContext: 'Synthetic five-model pipeline test context.',
    },
  };
}

const narrativeOnly = runTradeDecisionPipeline({
  sessionType: 'replay_morning',
  instrument: 'MES',
  result: {
    dayType: 'LONG',
    reasoning: 'Saved narrative alone must not create model promotion.',
    confidence: 0.9,
    checks: [],
    current_rule_analysis: {
      summary: 'Ignored saved narrative.',
      setup_detected: 'Raid Failure Displacement Reversal',
      rule_category: 'five_model',
      entry: 7400,
      stop: 7396,
      target_1: 7406,
      target_2: 7408,
      no_trade_reason: null,
      base_confidence: 'High',
    },
  },
});

assert.equal(narrativeOnly.setupAssessment.setupType, SetupType.NoSetup);
assert.equal(narrativeOnly.finalTradePlan.setupType, SetupType.NoSetup);
assert.equal(narrativeOnly.finalTradePlan.status, TradeDecisionStatus.NoTrade);
assert.equal(narrativeOnly.finalTradePlan.noTradeReason, NoTradeReason.NoApprovedSetup);
assert.deepEqual(narrativeOnly.setupCandidates, []);

const structuredProof = runTradeDecisionPipeline({
  sessionType: 'replay_morning',
  instrument: 'MES',
  tradeDate: '2026-07-27',
  result: fiveModelResult(),
});

assert.equal(structuredProof.finalTradePlan.status, TradeDecisionStatus.ConditionalTrade);
assert.equal(structuredProof.finalTradePlan.setupType, SetupType.RaidFailureDisplacementReversal);
assert.equal(structuredProof.finalTradePlan.direction, 'LONG');
assert.equal(structuredProof.finalTradePlan.entry, 7495);
assert.equal(structuredProof.finalTradePlan.stop, 7490.75);
assert.equal(structuredProof.finalTradePlan.target1, 7501.5);
assert.equal(structuredProof.finalTradePlan.target2, 7503.5);
assert.equal(structuredProof.opportunitySelection.bestConditionalCandidate?.executionStatus, ExecutionStatus.Conditional);
assert.equal(structuredProof.opportunitySelection.bestConditionalCandidate?.humanReview?.canExecute, false);

console.log('tradeDecisionPipeline approved-model scanner contract verified');
