import assert from 'node:assert/strict';
import { aggregateFiveMinuteBarsToTimeframe, parseTargetTimeframes, repairTimeframeRowsPlan } from './repair-market-bars-timeframe';
import type { NinjaBridgeBar } from '../../src/lib/ninjaTraderBridge';
import type { MarketBarTimeframe } from './market-data-store';

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

const continuous5m = [
  bar('2026-06-21T00:00:00-04:00', 100, 101, 99, 100.25, 1),
  bar('2026-06-21T00:05:00-04:00', 100.25, 102, 100, 101.5, 2),
  bar('2026-06-21T00:10:00-04:00', 101.5, 101.75, 98.5, 99.5, 3),
  bar('2026-06-21T00:15:00-04:00', 99.5, 103, 99.25, 102.5, 4),
  bar('2026-06-21T00:20:00-04:00', 102.5, 104, 102, 103.5, 5),
  bar('2026-06-21T00:25:00-04:00', 103.5, 103.75, 101, 101.25, 6),
  bar('2026-06-21T00:30:00-04:00', 101.25, 105, 101, 104.5, 7),
  bar('2026-06-21T00:35:00-04:00', 104.5, 106, 104, 105.5, 8),
  bar('2026-06-21T00:40:00-04:00', 105.5, 105.75, 103, 103.25, 9),
  bar('2026-06-21T00:45:00-04:00', 103.25, 107, 103, 106.5, 10),
  bar('2026-06-21T00:50:00-04:00', 106.5, 108, 106, 107.5, 11),
  bar('2026-06-21T00:55:00-04:00', 107.5, 107.75, 105, 105.25, 12),
  bar('2026-06-21T01:00:00-04:00', 105.25, 109, 105, 108.5, 13),
  bar('2026-06-21T01:05:00-04:00', 108.5, 110, 108, 109.5, 14),
  bar('2026-06-21T01:10:00-04:00', 109.5, 109.75, 107, 107.25, 15),
  bar('2026-06-21T01:15:00-04:00', 107.25, 111, 107, 110.5, 16),
];

const expectedByTimeframe: Record<MarketBarTimeframe, { rows: number; first: string; last: string }> = {
  '5m': { rows: 16, first: '2026-06-21T00:00:00-04:00', last: '2026-06-21T01:15:00-04:00' },
  '15m': { rows: 6, first: '2026-06-21T00:00:00', last: '2026-06-21T01:15:00' },
  '60m': { rows: 2, first: '2026-06-21T00:00:00', last: '2026-06-21T01:00:00' },
  '120m': { rows: 1, first: '2026-06-21T00:00:00', last: '2026-06-21T00:00:00' },
  '240m': { rows: 1, first: '2026-06-21T00:00:00', last: '2026-06-21T00:00:00' },
};

for (const timeframe of parseTargetTimeframes('all-htf')) {
  const rebuilt = aggregateFiveMinuteBarsToTimeframe(continuous5m, timeframe);
  const expected = expectedByTimeframe[timeframe];
  assert.equal(rebuilt.length, expected.rows, `${timeframe} row count`);
  assert.equal(rebuilt[0]?.time, expected.first, `${timeframe} first bucket`);
  assert.equal(rebuilt[rebuilt.length - 1]?.time, expected.last, `${timeframe} last bucket`);
  assert.equal(rebuilt[0]?.open, 100, `${timeframe} open comes from first 5M bar`);
  assert.equal(rebuilt[0]?.high, timeframe === '15m' ? 102 : timeframe === '60m' ? 108 : 111, `${timeframe} high aggregates source bars`);
  assert.equal(rebuilt[0]?.low, 98.5, `${timeframe} low aggregates source bars`);
}

assert.deepEqual(parseTargetTimeframes('15m,60m,120m,240m'), ['15m', '60m', '120m', '240m']);

console.log('Market bars all-HTF timeframe repair verified.');
