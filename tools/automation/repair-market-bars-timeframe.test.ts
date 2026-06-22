import assert from 'node:assert/strict';
import { aggregateFiveMinuteBarsToTimeframe, repairTimeframeRowsPlan } from './repair-market-bars-timeframe';
import type { NinjaBridgeBar } from '../../src/lib/ninjaTraderBridge';

function bar(time: string, open: number, high: number, low: number, close: number, volume = 10): NinjaBridgeBar {
  return { time, open, high, low, close, volume };
}

const source5m = [
  bar('2026-06-21T18:00:00-04:00', 100, 101, 99, 100.5, 1),
  bar('2026-06-21T18:05:00-04:00', 100.5, 103, 100, 102, 2),
  bar('2026-06-21T18:10:00-04:00', 102, 102.5, 98, 99, 3),
  bar('2026-06-21T20:00:00-04:00', 110, 111, 109, 110.5, 4),
  bar('2026-06-21T20:05:00-04:00', 110.5, 112, 110, 111, 5),
];

const rebuilt120m = aggregateFiveMinuteBarsToTimeframe(source5m, '120m');
assert.equal(rebuilt120m.length, 2);
assert.deepEqual(rebuilt120m[0], {
  time: '2026-06-21T18:00:00',
  open: 100,
  high: 103,
  low: 98,
  close: 99,
  volume: 6,
});
assert.deepEqual(rebuilt120m[1], {
  time: '2026-06-21T20:00:00',
  open: 110,
  high: 112,
  low: 109,
  close: 111,
  volume: 9,
});

const plan = repairTimeframeRowsPlan({
  rawTargetBars: [
    bar('2026-06-21T18:00:00-04:00', 100, 101, 99, 100.5),
    bar('2026-06-21T18:05:00-04:00', 100.5, 103, 100, 102),
  ],
  sourceFiveMinuteBars: source5m,
  targetTimeframe: '120m',
  from: '2026-06-21T18:00:00-04:00',
  to: '2026-06-21T20:00:00-04:00',
});
assert.equal(plan.rawTargetRows, 2);
assert.equal(plan.rawTargetIntervalMismatches > 0, true);
assert.equal(plan.sourceFiveMinuteRows, 5);
assert.equal(plan.rebuiltRows, 2);
assert.equal(plan.rebuiltIntervalMismatches, 0);
assert.equal(plan.rebuiltFirst, '2026-06-21T18:00:00');
assert.equal(plan.rebuiltLast, '2026-06-21T20:00:00');

console.log('Market bars timeframe repair verified.');
