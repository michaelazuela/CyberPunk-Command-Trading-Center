import assert from 'node:assert/strict';
import {
  buildHtfLiquidityDrawState,
  classifyTimeframeMssState,
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
  bars4H: bullishPendingBars(),
  bars1H: bullishPendingBars(),
  bars15M: bullishPendingBars(),
  bars5M: bullishPendingBars(),
  externalBuySideLiquidityTarget: 'London high / prior RTH high',
});
assert.equal(pendingState.classification, 'MSS_TRIGGER_PENDING');
assert.equal(pendingState.fiveMinuteState.lifecycleState, 'mss_trigger_pending');
assert.equal(pendingState.createsTradingPlanCandidate, false);
assert.equal(pendingState.approvesExecution, false);
assert.equal(JSON.stringify(pendingState).includes('REVERSAL_DELIVERY_PLAN_CANDIDATE'), false);
assert.equal(JSON.stringify(pendingState).includes('"canExecute"'), false);

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
assert.equal(oppositeAfterBullish.direction, 'bullish');
assert.equal(oppositeAfterBullish.status, 'conflicting');
assert.equal(oppositeAfterBullish.lifecycleState, 'opposite_mss_confirmed');

const bearishDigestion = classifyTimeframeMssState({
  timeframe: '5M',
  bars: bearishDigestionBars(),
});
assert.equal(bearishDigestion.direction, 'bearish');
assert.equal(bearishDigestion.status, 'confirmed');
assert.equal(bearishDigestion.lifecycleState, 'post_mss_digestion');

console.log('HTF liquidity draw MSS engine verified.');
