import assert from 'node:assert/strict';
import { buildNinjaChartContext, type NinjaBridgeBar } from './ninjaTraderBridge';
import { buildHtfFvgReactionMemory } from './htfFvgReactionMemory';

function isoAt(base: Date, minutes: number): string {
  return new Date(base.getTime() + minutes * 60_000).toISOString().replace('Z', '');
}

function fillerBars(args: {
  start: string;
  count: number;
  minutes: number;
  price: number;
}): NinjaBridgeBar[] {
  const base = new Date(`${args.start}Z`);
  return Array.from({ length: args.count }, (_, index) => {
    const drift = (index % 3) * 0.25;
    const price = args.price + drift;
    return {
      time: isoAt(base, index * args.minutes),
      open: price,
      high: price + 1,
      low: price - 1,
      close: price + 0.25,
      volume: 100 + index,
    };
  });
}

function fullWindowBars(args: {
  start: string;
  count: number;
  minutes: number;
  leftHigh: number;
  rightLow: number;
  basePrice: number;
}): NinjaBridgeBar[] {
  const base = new Date(`${args.start}Z`);
  const bars: NinjaBridgeBar[] = [
    {
      time: isoAt(base, 0),
      open: args.leftHigh - 4,
      high: args.leftHigh,
      low: args.leftHigh - 8,
      close: args.leftHigh - 3,
      volume: 100,
    },
    {
      time: isoAt(base, args.minutes),
      open: args.leftHigh - 3,
      high: args.leftHigh - 1,
      low: args.leftHigh - 7,
      close: args.leftHigh - 4,
      volume: 101,
    },
    {
      time: isoAt(base, args.minutes * 2),
      open: args.rightLow + 1,
      high: args.rightLow + 12,
      low: args.rightLow,
      close: args.rightLow + 11,
      volume: 102,
    },
  ];
  for (let index = 3; index < args.count; index += 1) {
    const drift = (index % 5) * 0.25;
    const price = args.basePrice + drift;
    bars.push({
      time: isoAt(base, index * args.minutes),
      open: price,
      high: price + 1,
      low: price - 1,
      close: price + 0.25,
      volume: 100 + index,
    });
  }
  return bars;
}

const bars5m = fillerBars({ start: '2026-06-24T15:00:00', count: 24, minutes: 5, price: 111 });
const bars15m = fillerBars({ start: '2026-06-22T00:00:00', count: 120, minutes: 15, price: 111 });
const bars60m = fullWindowBars({
  start: '2026-06-11T13:00:00',
  count: 90,
  minutes: 60,
  leftHigh: 100,
  rightLow: 110,
  basePrice: 111,
});
const bars120m = fillerBars({ start: '2026-06-10T00:00:00', count: 90, minutes: 120, price: 111 });
const bars240m = fullWindowBars({
  start: '2026-06-11T10:00:00',
  count: 90,
  minutes: 240,
  leftHigh: 200,
  rightLow: 210,
  basePrice: 211,
});

const chartContext = buildNinjaChartContext({
  bars5m,
  htfBars5m: bars5m,
  bars15m,
  bars60m,
  bars120m,
  bars240m,
  sessionType: 'lunch',
  instrument: 'MES',
  tradeDate: '2026-06-24',
  barTimestampMode: 'open',
  barTimeZone: 'eastern',
});

assert.ok(chartContext?.multiTimeframeContext, 'expected multi-timeframe context');

const oneHour = chartContext.multiTimeframeContext.oneHour;
const fourHour = chartContext.multiTimeframeContext.fourHour;

assert.equal(
  oneHour.fvgZones.some((zone) => zone.direction === 'LONG' && zone.lower === 100 && zone.upper === 110),
  false,
  'recent one-hour display FVGs should not include the older parent zone'
);
assert.equal(
  oneHour.fullWindowFvgZones?.some((zone) => zone.direction === 'LONG' && zone.lower === 100 && zone.upper === 110),
  true,
  'full-window one-hour FVG inventory must retain the older parent zone'
);
assert.equal(
  fourHour.fullWindowFvgZones?.some((zone) => zone.direction === 'LONG' && zone.lower === 200 && zone.upper === 210),
  true,
  'full-window four-hour FVG inventory must retain the older parent zone'
);

const memory = buildHtfFvgReactionMemory({ chartContext, direction: 'LONG' });
assert.ok(memory?.parentZones.some((zone) => zone.timeframe === '60M' && zone.lower === 100 && zone.upper === 110));
assert.ok(memory?.parentZones.some((zone) => zone.timeframe === '240M' && zone.lower === 200 && zone.upper === 210));
assert.equal(memory?.approvalBoundary.changesCanExecute, false);
assert.equal(memory?.approvalBoundary.changesTradeApprovals, false);

console.log('HTF FVG full-window inventory verified: old parent zones survive recent display truncation without execution approval changes.');
