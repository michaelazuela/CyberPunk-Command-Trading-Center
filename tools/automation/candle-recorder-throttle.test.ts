import assert from 'node:assert/strict';
import {
  createRecorderWriteState,
  markRecorderWriteFailure,
  markRecorderWriteSuccess,
  selectRecorderBarsForUpsert,
} from './candle-recorder';

const bars = [
  { time: '2026-06-29T19:00:00-04:00' },
  { time: '2026-06-29T19:05:00-04:00' },
  { time: '2026-06-29T19:10:00-04:00' },
];

const state = createRecorderWriteState();
const first = selectRecorderBarsForUpsert({
  bars,
  bridgeInstrument: 'MES 09-26',
  timeframe: '5m',
  state,
  nowMs: 1_000,
});
assert.equal(first.length, 3);
markRecorderWriteSuccess({
  bars: first,
  bridgeInstrument: 'MES 09-26',
  timeframe: '5m',
  state,
});

const second = selectRecorderBarsForUpsert({
  bars,
  bridgeInstrument: 'MES 09-26',
  timeframe: '5m',
  state,
  nowMs: 2_000,
});
assert.equal(second.length, 0);

const withNewFive = selectRecorderBarsForUpsert({
  bars: [...bars, { time: '2026-06-29T19:15:00-04:00' }],
  bridgeInstrument: 'MES 09-26',
  timeframe: '5m',
  state,
  nowMs: 3_000,
});
assert.deepEqual(withNewFive.map((bar) => bar.time), ['2026-06-29T19:15:00-04:00']);

const htfState = createRecorderWriteState();
const htfFirst = selectRecorderBarsForUpsert({
  bars: [{ time: '2026-06-29T16:00:00-04:00' }],
  bridgeInstrument: 'MES 09-26',
  timeframe: '120m',
  state: htfState,
  nowMs: 1_000,
});
assert.equal(htfFirst.length, 1);
markRecorderWriteSuccess({
  bars: htfFirst,
  bridgeInstrument: 'MES 09-26',
  timeframe: '120m',
  state: htfState,
});
assert.equal(selectRecorderBarsForUpsert({
  bars: [{ time: '2026-06-29T16:00:00-04:00' }],
  bridgeInstrument: 'MES 09-26',
  timeframe: '120m',
  state: htfState,
  nowMs: 2_000,
}).length, 0);
assert.equal(selectRecorderBarsForUpsert({
  bars: [{ time: '2026-06-29T18:00:00-04:00' }],
  bridgeInstrument: 'MES 09-26',
  timeframe: '120m',
  state: htfState,
  nowMs: 3_000,
}).length, 1);

markRecorderWriteFailure({
  bridgeInstrument: 'MES 09-26',
  timeframe: '15m',
  state,
  error: new Error('upstream request timeout'),
  nowMs: 10_000,
  cooldownMs: 60_000,
});
assert.equal(selectRecorderBarsForUpsert({
  bars: [{ time: '2026-06-29T19:15:00-04:00' }],
  bridgeInstrument: 'MES 09-26',
  timeframe: '15m',
  state,
  nowMs: 20_000,
}).length, 0);
assert.equal(selectRecorderBarsForUpsert({
  bars: [{ time: '2026-06-29T19:15:00-04:00' }],
  bridgeInstrument: 'MES 09-26',
  timeframe: '15m',
  state,
  nowMs: 80_001,
}).length, 1);

console.log('candle recorder write throttle verified.');
