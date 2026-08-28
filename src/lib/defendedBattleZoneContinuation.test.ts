import assert from 'node:assert/strict';
import { scanSetupCandidates } from './setupScanner';
import { ExecutionStatus, SetupType } from '../types';

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

function context(direction: 'LONG' | 'SHORT') {
  const bullish = direction === 'LONG';
  return {
    sessionType: bullish ? 'replay_lunch' : 'replay_morning',
    chartTimestamp: bullish ? '2026-08-26T13:20:00-04:00' : '2026-08-26T10:00:00-04:00',
    marketContext: 'Defended battle-zone regression fixture.',
    keyLevels: bullish
      ? { currentPrice: 7685.5, activeSwingLow: 7671, activeSwingHigh: 7705 }
      : { currentPrice: 7697, activeSwingHigh: 7705, activeSwingLow: 7688 },
    candles: bullish
      ? [
        { index: 0, timestamp: '2026-08-26T12:40:00-04:00', open: 7680.25, high: 7681, low: 7673.25, close: 7673.5, direction: 'bearish', confidence: 'High' },
        { index: 1, timestamp: '2026-08-26T13:00:00-04:00', open: 7673.75, high: 7679.75, low: 7673.75, close: 7679.5, direction: 'bullish', isReclaim: true, confidence: 'High' },
        { index: 2, timestamp: '2026-08-26T13:20:00-04:00', open: 7683.75, high: 7687.25, low: 7683.75, close: 7685.5, direction: 'bullish', confidence: 'High' },
      ]
      : [
        { index: 0, timestamp: '2026-08-26T09:45:00-04:00', open: 7701, high: 7705, low: 7700.5, close: 7703.25, direction: 'bullish', confidence: 'High' },
        { index: 1, timestamp: '2026-08-26T09:50:00-04:00', open: 7703, high: 7703.25, low: 7698.75, close: 7699.5, direction: 'bearish', isReclaim: true, confidence: 'High' },
        { index: 2, timestamp: '2026-08-26T09:55:00-04:00', open: 7699.25, high: 7700.25, low: 7696.5, close: 7697, direction: 'bearish', confidence: 'High' },
      ],
    multiTimeframeContext: {
      source: 'ninjatrader_bridge',
      authority: 'ohlc_facts_only',
      fourHour: { trend: bullish ? 'bullish' : 'bearish', displacementCandles: [], confidence: 'High', notes: [] },
      twoHour: { trend: bullish ? 'bullish' : 'bearish', displacementCandles: [], confidence: 'High', notes: [] },
      oneHour: { trend: bullish ? 'bullish' : 'bearish', displacementCandles: [], confidence: 'High', notes: [] },
      fifteenMinute: {
        trend: bullish ? 'bullish' : 'bearish',
        displacementCandles: [],
        confidence: 'High',
        notes: [],
        fvgZones: [{
          direction,
          lower: bullish ? 7676 : 7700,
          upper: bullish ? 7678.5 : 7702,
          midpoint: bullish ? 7677.25 : 7701,
          formedAt: bullish ? '2026-08-25T22:45:00-04:00' : '2026-08-26T09:00:00-04:00',
          formedCandleIndex: 0,
          impulseQualified: true,
          confidence: bullish ? 'Medium' : 'High',
        }],
      },
      fiveMinute: { trend: bullish ? 'bullish' : 'bearish', displacementCandles: [], confidence: 'High', notes: [] },
      alignment: {
        macroBias: direction,
        sessionBias: direction,
        liquidityBias: direction,
        executionBias: direction,
        alignedDirection: direction,
        conflicts: [],
        notes: [],
      },
      targetMap: { levelsToWatch: [] },
      rules: { higherTimeframesApproveTrades: false, fiveMinuteExecutionRequired: true, aiMayOverwriteOhlcFacts: false },
      notes: [],
    },
    htfLiquidityDrawState: htfState(bullish ? 'bullish' : 'bearish'),
    targetObjectives: [{
      label: bullish ? 'Forward buy-side liquidity' : 'Forward sell-side liquidity',
      price: bullish ? 7705 : 7688,
      direction,
      source: 'app',
      type: 'liquidity_pool',
      confidence: 'High',
      score: 95,
      reason: 'Forward objective.',
    }],
    timeframeMssEvidence: {
      source: 'ninjatrader_ohlc',
      timeframes: {
        '5M': { timeframe: '5M', direction: bullish ? 'bullish' : 'bearish', status: 'confirmed_mss', confidence: 90 },
        '15M': { timeframe: '15M', direction: bullish ? 'bullish' : 'bearish', status: 'confirmed_mss', confidence: 90 },
      },
    },
  } as any;
}

for (const direction of ['LONG', 'SHORT'] as const) {
  const result = scanSetupCandidates({ sessionType: direction === 'LONG' ? 'replay_lunch' : 'replay_morning', chartContext: context(direction) });
  const candidate = result.candidates.find((item) => item.setupType === SetupType.DefendedBattleZoneContinuation);
  assert.ok(candidate, `${direction} candidate should exist`);
  assert.equal(candidate.direction, direction);
  assert.equal(candidate.candidateState, 'HUMAN_REVIEW_READY');
  assert.equal(candidate.executionStatus, ExecutionStatus.Conditional);
  assert.equal(candidate.humanReview?.canExecute, false);
  assert.equal(candidate.humanReview?.discordTradePlanEligible, true);
  assert.equal(candidate.activeCampaign?.deDuplication.resetPolicy, 'trade_date_direction_setup_zone_entry');
  assert.match(candidate.activeCampaign?.id || '', /DefendedBattleZoneContinuation:zone-/);
  assert.match(candidate.activeCampaign?.id || '', /:entry-/);
  assert.match(candidate.requiredTrigger || '', /Boundary break is not required/i);
  assert.doesNotMatch(candidate.requiredTrigger || '', /sweep|swept|reclaim above|rejection below/i);
  assert.doesNotMatch(candidate.levelContextSummary || '', /sweep|swept|reclaim above|rejection below/i);
  assert.equal(candidate.evidence.some((item) => /sweep|swept|reclaim above|rejection below/i.test(item)), false);
  assert.ok(candidate.evidence.some((item) => /5M defense candle/i.test(item)));
  assert.equal(result.bestExecutableCandidate?.setupType, undefined);
}

console.log('Defended Battle Zone Continuation regression checks passed.');
