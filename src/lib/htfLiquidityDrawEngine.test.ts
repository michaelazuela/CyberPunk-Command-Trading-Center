import assert from 'node:assert/strict';
import {
  buildHtfLiquidityDrawState,
  buildHtfLiquidityDrawStateFromChartContext,
  classifyTimeframeMssState,
  describeHtfLiquidityDrawStateForDisplay,
  describeTimeframeMssStateForDisplay,
  type HtfMssTimeframe,
} from './htfLiquidityDrawEngine';
import type { NinjaBridgeBar } from './ninjaTraderBridge';

function bar(index: number, open: number, high: number, low: number, close: number): NinjaBridgeBar {
  return {
    time: `2026-06-01T${String(Math.floor(index / 12)).padStart(2, '0')}:${String((index % 12) * 5).padStart(2, '0')}:00`,
    open,
    high,
    low,
    close,
    volume: 1000,
  };
}

function candleFacts(bars: NinjaBridgeBar[]) {
  return bars.map((item, index) => ({
    index,
    timestamp: item.time,
    open: item.open,
    high: item.high,
    low: item.low,
    close: item.close,
    direction: item.close > item.open ? 'bullish' : item.close < item.open ? 'bearish' : 'doji',
    confidence: 'High',
  }));
}

function bullishPendingBars(): NinjaBridgeBar[] {
  return [
    bar(0, 100, 101, 99, 100),
    bar(1, 100, 101, 98, 99),
    bar(2, 99, 100, 97, 98),
    bar(3, 98, 99, 96, 97),
    bar(4, 97, 99, 95, 98),
    bar(5, 98, 100, 96, 99),
  ];
}

function bullishConfirmedBars(): NinjaBridgeBar[] {
  return [
    ...bullishPendingBars(),
    bar(6, 99, 103, 98, 102.75),
  ];
}

function bullishFailedBars(): NinjaBridgeBar[] {
  return [
    ...bullishPendingBars(),
    bar(6, 98, 99, 94.5, 95),
  ];
}

function bullishDigestionBars(): NinjaBridgeBar[] {
  return [
    ...bullishConfirmedBars(),
    bar(7, 102.5, 103, 101.75, 102.25),
    bar(8, 102.25, 103.25, 102, 102.75),
    bar(9, 102.75, 103.5, 102.25, 103),
  ];
}

function bullishOppositeMssBars(): NinjaBridgeBar[] {
  return [
    ...bullishConfirmedBars(),
    bar(7, 102.5, 103, 101.75, 102.25),
    bar(8, 102.25, 103.25, 102, 102.75),
    bar(9, 102.75, 103.5, 101.5, 102.5),
    bar(10, 102.5, 103, 94, 94.5),
  ];
}

function bearishPendingBars(): NinjaBridgeBar[] {
  return [
    bar(0, 100, 101, 99, 100),
    bar(1, 100, 102, 99, 101),
    bar(2, 101, 103, 100, 102),
    bar(3, 102, 104, 101, 103),
    bar(4, 103, 105, 102, 103),
    bar(5, 103, 104, 101, 102),
  ];
}

function bearishConfirmedBars(): NinjaBridgeBar[] {
  return [
    ...bearishPendingBars(),
    bar(6, 102, 103, 97, 97.25),
  ];
}

function bearishFailedBars(): NinjaBridgeBar[] {
  return [
    ...bearishPendingBars(),
    bar(6, 103, 105.5, 102, 105),
  ];
}

function bearishDigestionBars(): NinjaBridgeBar[] {
  return [
    ...bearishConfirmedBars(),
    bar(7, 97.25, 98, 96.75, 97.5),
    bar(8, 97.5, 98, 96.5, 97),
    bar(9, 97, 97.5, 96, 96.75),
  ];
}

function sufficientHtfContext(seed: NinjaBridgeBar[], count = 40): NinjaBridgeBar[] {
  const fillerCount = Math.max(0, count - seed.length);
  const filler = Array.from({ length: fillerCount }, (_, index) =>
    bar(index, 100, 101, 99, index % 2 === 0 ? 100.25 : 99.75)
  );
  return [
    ...filler,
    ...seed.map((item, index) => ({
      ...item,
      time: bar(fillerCount + index, item.open, item.high, item.low, item.close).time,
    })),
  ];
}

function fifteenMinuteBroadConflictBars(): NinjaBridgeBar[] {
  return [
    bar(0, 100, 101, 99, 100),
    bar(1, 100, 102, 99, 101),
    bar(2, 101, 103, 100, 102),
    bar(3, 102, 104, 101, 103),
    bar(4, 103, 105, 102, 103),
    bar(5, 103, 104, 101, 102),
    bar(6, 102, 103, 98, 100),
    bar(7, 100, 102, 99, 101),
  ];
}

function fifteenMinuteBullishReclaimFailedBars(): NinjaBridgeBar[] {
  return [
    ...fifteenMinuteBroadConflictBars(),
    bar(8, 100, 101, 97, 97.5),
  ];
}

function assertContextOnlyState(timeframe: HtfMssTimeframe): void {
  const state = classifyTimeframeMssState({
    timeframe,
    bars: bullishPendingBars(),
    externalBuySideLiquidityTarget: 'prior RTH high',
  });
  assert.equal(state.status, 'potential_mss');
  assert.equal(state.lifecycleState, 'potential_mss');
  assert.equal(state.direction, 'bullish');
  assert.ok(state.evidence.some((line) => line.includes('cannot create a candidate') || line.includes('cannot approve execution')));
}

assertContextOnlyState('4H');
assertContextOnlyState('1H');

const fifteenMinute = classifyTimeframeMssState({
  timeframe: '15M',
  bars: bullishPendingBars(),
});
assert.equal(fifteenMinute.status, 'potential_mss');
assert.equal(fifteenMinute.lifecycleState, 'potential_mss');
assert.ok(fifteenMinute.evidence.some((line) => line.includes('cannot approve execution')));

const pendingState = buildHtfLiquidityDrawState({
  bars4H: sufficientHtfContext(bullishPendingBars()),
  bars1H: sufficientHtfContext(bullishPendingBars()),
  bars15M: sufficientHtfContext(bullishPendingBars()),
  bars5M: bullishPendingBars(),
  externalBuySideLiquidityTarget: 'London high / prior RTH high',
});
assert.equal(pendingState.classification, 'MSS_TRIGGER_PENDING');
assert.equal(pendingState.fiveMinuteState.lifecycleState, 'mss_trigger_pending');
assert.equal(pendingState.planDirection, 'LONG');
assert.equal(pendingState.drawDirection, 'buy_side');
assert.equal(pendingState.fiveMinuteMssTriggerConfirmed, false);
assert.equal(pendingState.fifteenMinuteConfirmationStatus, 'potential_mss');
assert.equal(pendingState.createsTradingPlanCandidate, false);
assert.equal(pendingState.approvesExecution, false);
assert.equal(JSON.stringify(pendingState).includes('REVERSAL_DELIVERY_PLAN_CANDIDATE'), false);
assert.equal(JSON.stringify(pendingState).includes('"canExecute"'), false);
assert.ok(describeHtfLiquidityDrawStateForDisplay(pendingState).includes('5M MSS trigger pending'));
assert.ok(describeHtfLiquidityDrawStateForDisplay(pendingState).includes('no confirmed swing break with displacement'));
assert.ok(describeTimeframeMssStateForDisplay(pendingState.fiveMinuteState).includes('5M potential MSS forming'));
assert.ok(describeTimeframeMssStateForDisplay(pendingState.fiveMinuteState).includes('before creating a reversal-delivery candidate'));
assert.ok(describeTimeframeMssStateForDisplay(pendingState.timeframeStates.find((state) => state.timeframe === '15M')!).includes('5M confirmation controls plan creation'));

const confirmedCandidateEligible = buildHtfLiquidityDrawState({
  bars4H: sufficientHtfContext(bullishPendingBars()),
  bars1H: sufficientHtfContext(bullishPendingBars()),
  bars15M: sufficientHtfContext(bullishPendingBars()),
  bars5M: bullishConfirmedBars(),
  externalBuySideLiquidityTarget: 'London high / prior RTH high',
  chartTimestamp: '2026-06-01T10:35:00',
});
assert.equal(confirmedCandidateEligible.classification, 'REVERSAL_DELIVERY_PLAN_CANDIDATE');
assert.equal(confirmedCandidateEligible.planDirection, 'LONG');
assert.equal(confirmedCandidateEligible.raidState, 'sell_side_raid');
assert.equal(confirmedCandidateEligible.fiveMinuteMssTriggerConfirmed, true);
assert.equal(confirmedCandidateEligible.fiveMinuteMssConfirmationType, 'swing_break_with_displacement');
assert.equal(confirmedCandidateEligible.activeScanWindow, 'MORNING_SETUP_SCAN');
assert.ok(confirmedCandidateEligible.confidence >= 75);
assert.equal(confirmedCandidateEligible.createsTradingPlanCandidate, false);
assert.equal(confirmedCandidateEligible.approvesExecution, false);
assert.ok(describeHtfLiquidityDrawStateForDisplay(confirmedCandidateEligible).includes('Execution still requires deterministic entry, stop, target, risk, and final pipeline gates'));
assert.ok(describeTimeframeMssStateForDisplay(confirmedCandidateEligible.fiveMinuteState).includes('Building candidate from HTF draw + raid/reclaim context'));

const broad15mConflict = classifyTimeframeMssState({
  timeframe: '15M',
  bars: fifteenMinuteBroadConflictBars(),
});
assert.equal(broad15mConflict.status, 'conflicting');
assert.equal(broad15mConflict.lifecycleState, 'conflicting_mss');

const refined15mSupport = buildHtfLiquidityDrawState({
  bars4H: sufficientHtfContext(bullishPendingBars()),
  bars1H: sufficientHtfContext(bullishPendingBars()),
  bars15M: sufficientHtfContext(fifteenMinuteBroadConflictBars()),
  bars5M: bullishConfirmedBars(),
  externalBuySideLiquidityTarget: 'London high / prior RTH high',
  chartTimestamp: '2026-06-01T14:05:00',
});
assert.equal(refined15mSupport.fifteenMinuteConfirmationStatus, 'potential_mss');
assert.equal(refined15mSupport.classification, 'REVERSAL_DELIVERY_PLAN_CANDIDATE');
assert.ok(refined15mSupport.timeframeStack.find((state) => state.timeframe === '15M')?.evidence.some((line) => line.includes('broad-context conflict/opposite state refined')));

const failed15mReclaimStaysBlocked = buildHtfLiquidityDrawState({
  bars4H: sufficientHtfContext(bullishPendingBars()),
  bars1H: sufficientHtfContext(bullishPendingBars()),
  bars15M: sufficientHtfContext(fifteenMinuteBullishReclaimFailedBars()),
  bars5M: bullishConfirmedBars(),
  externalBuySideLiquidityTarget: 'London high / prior RTH high',
  chartTimestamp: '2026-06-01T14:05:00',
});
assert.notEqual(failed15mReclaimStaysBlocked.fifteenMinuteConfirmationStatus, 'potential_mss');
assert.notEqual(failed15mReclaimStaysBlocked.classification, 'REVERSAL_DELIVERY_PLAN_CANDIDATE');

const bearishCandidateEligible = buildHtfLiquidityDrawState({
  bars4H: sufficientHtfContext(bearishPendingBars()),
  bars1H: sufficientHtfContext(bearishPendingBars()),
  bars15M: sufficientHtfContext(bearishPendingBars()),
  bars5M: bearishConfirmedBars(),
  externalSellSideLiquidityTarget: 'London low / prior RTH low',
  chartTimestamp: '2026-06-01T14:10:00',
});
assert.equal(bearishCandidateEligible.classification, 'REVERSAL_DELIVERY_PLAN_CANDIDATE');
assert.equal(bearishCandidateEligible.planDirection, 'SHORT');
assert.equal(bearishCandidateEligible.drawDirection, 'sell_side');
assert.equal(bearishCandidateEligible.raidState, 'buy_side_raid');
assert.equal(bearishCandidateEligible.activeScanWindow, 'LUNCH_PM_SETUP_SCAN');

const refined15mBearishSupport = buildHtfLiquidityDrawState({
  bars4H: sufficientHtfContext(bearishPendingBars()),
  bars1H: sufficientHtfContext(bearishPendingBars()),
  bars15M: sufficientHtfContext(fifteenMinuteBroadConflictBars()),
  bars5M: bearishConfirmedBars(),
  externalSellSideLiquidityTarget: 'London low / prior RTH low',
  chartTimestamp: '2026-06-01T14:10:00',
});
assert.equal(refined15mBearishSupport.planDirection, 'SHORT');
assert.equal(refined15mBearishSupport.fifteenMinuteConfirmationStatus, 'potential_mss');
assert.equal(refined15mBearishSupport.classification, 'REVERSAL_DELIVERY_PLAN_CANDIDATE');

const fifteenThirtyOutside = buildHtfLiquidityDrawState({
  bars4H: sufficientHtfContext(bearishPendingBars()),
  bars1H: sufficientHtfContext(bearishPendingBars()),
  bars15M: sufficientHtfContext(bearishPendingBars()),
  bars5M: bearishConfirmedBars(),
  externalSellSideLiquidityTarget: 'London low / prior RTH low',
  chartTimestamp: '2026-06-01T15:30:00',
});
assert.equal(fifteenThirtyOutside.activeScanWindow, 'OUTSIDE_SETUP_SCAN');

const missingTimeframes = buildHtfLiquidityDrawState({
  bars5M: bullishConfirmedBars(),
  externalBuySideLiquidityTarget: 'prior RTH high',
});
assert.equal(missingTimeframes.classification, 'MSS_TRIGGER_CONFIRMED');
assert.equal(missingTimeframes.htfContextDataLimited, true);
assert.equal(missingTimeframes.classificationReliability, 'data_limited');
assert.ok(missingTimeframes.timeframeStack.some((state) => state.timeframe === '4H' && state.status === 'unknown'));
assert.ok(missingTimeframes.blockers.some((line) => line.includes('4H: missing structured OHLC context')));

const malformedBars = buildHtfLiquidityDrawState({
  bars4H: sufficientHtfContext(bullishPendingBars()),
  bars1H: sufficientHtfContext(bullishPendingBars()),
  bars15M: sufficientHtfContext(bullishPendingBars()),
  bars5M: [
    { time: '2026-06-01T10:00:00', open: 100, high: 99, low: 101, close: 100, volume: 1000 },
    { time: '2026-06-01T10:05:00', open: Number.NaN, high: 102, low: 99, close: 101, volume: 1000 },
  ],
  externalBuySideLiquidityTarget: 'prior RTH high',
});
assert.equal(malformedBars.classification, 'NO_QUALIFIED_STATE');
assert.equal(malformedBars.fiveMinuteState.status, 'unknown');
assert.equal(malformedBars.fiveMinuteMssTriggerConfirmed, false);
assert.equal(malformedBars.createsTradingPlanCandidate, false);
assert.equal(malformedBars.approvesExecution, false);
assert.ok(malformedBars.blockers.some((line) => line.includes('Missing one or more required 4H/1H/15M/5M')));

const derivedFromChartContext = buildHtfLiquidityDrawStateFromChartContext({
  chartTimestamp: '2026-06-01T10:45:00',
  keyLevels: { activeSwingHigh: 104, activeSwingLow: 95 },
  targetObjectives: [],
  multiTimeframeContext: {
    source: 'ninjatrader_bridge',
    authority: 'ohlc_facts_only',
    fourHour: { candles: candleFacts(sufficientHtfContext(bullishPendingBars())) },
    oneHour: { candles: candleFacts(sufficientHtfContext(bullishPendingBars())) },
    fifteenMinute: { candles: candleFacts(sufficientHtfContext(bullishPendingBars())) },
    fiveMinute: { candles: candleFacts(bullishConfirmedBars()) },
    targetMap: {
      nearestUpsideLiquidity: { label: 'prior RTH high', price: 104 },
      levelsToWatch: [],
    },
  } as any,
});
assert.ok(derivedFromChartContext);
assert.equal(derivedFromChartContext.classification, 'REVERSAL_DELIVERY_PLAN_CANDIDATE');
assert.equal(derivedFromChartContext.externalLiquidityTarget, 'prior RTH high 104');

const noStructuredFallback = buildHtfLiquidityDrawStateFromChartContext({
  chartTimestamp: '2026-06-01T10:45:00',
  keyLevels: {},
  targetObjectives: [],
  multiTimeframeContext: undefined,
});
assert.equal(noStructuredFallback, null);

const dataLimitedHtfWithConfirmed5m = buildHtfLiquidityDrawState({
  bars4H: bullishPendingBars().slice(0, 4),
  bars1H: bullishPendingBars().slice(0, 4),
  bars15M: bullishPendingBars().slice(0, 4),
  bars5M: bullishConfirmedBars(),
  externalBuySideLiquidityTarget: 'prior RTH high',
  chartTimestamp: '2026-06-01T14:05:00',
});
assert.equal(dataLimitedHtfWithConfirmed5m.htfContextDataLimited, true);
assert.equal(dataLimitedHtfWithConfirmed5m.htfContextSufficiency.overallStatus, 'data_limited');
assert.equal(dataLimitedHtfWithConfirmed5m.classificationReliability, 'data_limited');
assert.equal(dataLimitedHtfWithConfirmed5m.fiveMinuteMssTriggerConfirmed, true);
assert.equal(dataLimitedHtfWithConfirmed5m.classification, 'MSS_TRIGGER_CONFIRMED');
assert.notEqual(dataLimitedHtfWithConfirmed5m.classification, 'REVERSAL_DELIVERY_PLAN_CANDIDATE');
assert.ok(dataLimitedHtfWithConfirmed5m.blockers.some((line) => line.includes('insufficient HTF context: 4H loaded 4 bars')));
assert.ok(dataLimitedHtfWithConfirmed5m.classificationReason.includes('5M bullish MSS confirmed, but HTF context is data-limited'));
assert.equal(dataLimitedHtfWithConfirmed5m.createsTradingPlanCandidate, false);
assert.equal(dataLimitedHtfWithConfirmed5m.approvesExecution, false);

const missingHtfContext = buildHtfLiquidityDrawState({
  bars5M: bullishConfirmedBars(),
  externalBuySideLiquidityTarget: 'prior RTH high',
});
assert.equal(missingHtfContext.htfContextSufficiency.overallStatus, 'missing');
assert.equal(missingHtfContext.classificationReliability, 'data_limited');
assert.ok(missingHtfContext.timeframeCoverage.find((coverage) => coverage.timeframe === '4H')?.status === 'missing');
assert.ok(missingHtfContext.blockers.some((line) => line.includes('4H: missing structured OHLC context')));

const failedBullish = classifyTimeframeMssState({
  timeframe: '5M',
  bars: bullishFailedBars(),
});
assert.equal(failedBullish.direction, 'bullish');
assert.equal(failedBullish.status, 'failed');
assert.equal(failedBullish.lifecycleState, 'failed_mss');

const failedBearish = classifyTimeframeMssState({
  timeframe: '5M',
  bars: bearishFailedBars(),
});
assert.equal(failedBearish.direction, 'bearish');
assert.equal(failedBearish.status, 'failed');
assert.equal(failedBearish.lifecycleState, 'failed_mss');

const confirmedBullish = classifyTimeframeMssState({
  timeframe: '5M',
  bars: bullishConfirmedBars(),
  externalBuySideLiquidityTarget: 'full ETH high',
});
assert.equal(confirmedBullish.direction, 'bullish');
assert.equal(confirmedBullish.status, 'confirmed');
assert.equal(confirmedBullish.lifecycleState, 'confirmed_mss');
assert.ok(confirmedBullish.evidence.some((line) => line.includes('Confirmed close above prior 5M swing high')));
assert.equal(confirmedBullish.externalLiquidityTarget, 'full ETH high');

const digestion = classifyTimeframeMssState({
  timeframe: '5M',
  bars: bullishDigestionBars(),
});
assert.equal(digestion.direction, 'bullish');
assert.equal(digestion.status, 'confirmed');
assert.equal(digestion.lifecycleState, 'post_mss_digestion');
assert.ok(digestion.evidence.some((line) => line.includes('Post-displacement candles are compressing')));
assert.ok(describeTimeframeMssStateForDisplay(digestion).includes('Consolidation after displacement is not an opposite MSS'));

const notBearishFromDigestion = classifyTimeframeMssState({
  timeframe: '5M',
  bars: bullishDigestionBars(),
});
assert.notEqual(notBearishFromDigestion.direction, 'bearish');
assert.notEqual(notBearishFromDigestion.lifecycleState, 'opposite_mss_confirmed');

const oppositeAfterBullish = classifyTimeframeMssState({
  timeframe: '5M',
  bars: bullishOppositeMssBars(),
});
assert.equal(oppositeAfterBullish.direction, 'neutral');
assert.equal(oppositeAfterBullish.status, 'conflicting');
assert.equal(oppositeAfterBullish.lifecycleState, 'conflicting_mss');

const bearishDigestion = classifyTimeframeMssState({
  timeframe: '5M',
  bars: bearishDigestionBars(),
});
assert.equal(bearishDigestion.direction, 'bearish');
assert.equal(bearishDigestion.status, 'confirmed');
assert.equal(bearishDigestion.lifecycleState, 'post_mss_digestion');

console.log('HTF liquidity draw MSS engine verified.');
