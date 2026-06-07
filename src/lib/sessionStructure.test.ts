import assert from 'node:assert/strict';
import { buildNinjaChartContext, type NinjaBridgeBar } from './ninjaTraderBridge';
import { buildStructuralLevels, segmentTradingSession } from './sessionStructure';

function bar(time: string, open: number, high: number, low: number, close: number): NinjaBridgeBar {
  return { time, open, high, low, close, volume: 1 };
}

const bars: NinjaBridgeBar[] = [
  bar('2026-04-28T18:00:00-04:00', 82, 86, 78, 84),
  bar('2026-04-29T10:00:00-04:00', 85, 150, 70, 120),
  bar('2026-05-15T10:00:00-04:00', 96, 105, 90, 102),
  bar('2026-05-17T18:00:00-04:00', 92, 96, 88, 94),
  bar('2026-05-18T10:00:00-04:00', 95, 100, 90, 98),
  bar('2026-05-18T18:00:00-04:00', 101, 106, 99, 104),
  bar('2026-05-19T10:00:00-04:00', 100, 110, 95, 108),
  bar('2026-05-19T18:00:00-04:00', 111, 116, 109, 114),
  bar('2026-05-20T10:00:00-04:00', 110, 120, 100, 118),
  bar('2026-05-20T18:00:00-04:00', 121, 126, 119, 124),
  bar('2026-05-21T10:00:00-04:00', 120, 130, 105, 128),
  bar('2026-05-21T18:00:00-04:00', 131, 136, 129, 134),
  bar('2026-05-21T20:00:00-04:00', 134, 138, 132, 137),
  bar('2026-05-22T01:00:00-04:00', 137, 139, 133, 135),
  bar('2026-05-22T10:00:00-04:00', 130, 140, 120, 138),
  bar('2026-05-22T12:00:00-04:00', 138, 142, 136, 140),
];

const segments = segmentTradingSession(bars);
const byName = Object.fromEntries(segments.map(segment => [segment.name, segment]));

assert.equal(byName.previous_rth.label, 'Prior RTH Day');
assert.equal(byName.previous_rth.high, 130);
assert.equal(byName.previous_rth.low, 105);
assert.equal(byName.previous_rth.bars.length, 1);

assert.equal(byName.three_day_rth.high, 130);
assert.equal(byName.three_day_rth.low, 95);
assert.equal(byName.three_day_rth.bars.length, 3);

assert.equal(byName.weekly_rth.high, 130);
assert.equal(byName.weekly_rth.low, 90);
assert.equal(byName.weekly_rth.bars.length, 5);

assert.equal(byName.monthly_rth.high, 150);
assert.equal(byName.monthly_rth.low, 70);
assert.equal(byName.monthly_rth.bars.length, 1);

assert.equal(byName.prior_eth.high, 130);
assert.equal(byName.prior_eth.low, 105);
assert.equal(byName.three_day_eth.high, 130);
assert.equal(byName.three_day_eth.low, 95);
assert.equal(byName.asian.high, 139);
assert.equal(byName.asian.low, 132);
assert.equal(byName.rth_morning.label, 'Morning Setup Scan Window');
assert.equal(byName.rth_morning.high, 140);
assert.equal(byName.rth_morning.low, 120);
assert.equal(byName.lunch.label, 'Lunch/PM Setup Scan Window');
assert.equal(byName.lunch.high, 142);
assert.equal(byName.lunch.low, 136);

const levels = buildStructuralLevels({ bars5m: bars.slice(-2), bars15m: bars });
const priorDayHigh = levels.find(level => level.source === 'previous_rth' && level.type === 'high');
const threeDayLow = levels.find(level => level.source === 'three_day_rth' && level.type === 'low');
const weeklyEthHigh = levels.find(level => level.source === 'weekly_eth' && level.type === 'high');
const monthlyRthHigh = levels.find(level => level.source === 'monthly_rth' && level.type === 'high');

assert.equal(priorDayHigh?.label, 'Prior RTH Day High');
assert.equal(priorDayHigh?.price, 130);
assert.equal(threeDayLow?.label, 'Prior 3 RTH Days Low');
assert.equal(threeDayLow?.price, 95);
assert.equal(weeklyEthHigh?.label, 'Prior Week ETH High');
assert.equal(weeklyEthHigh?.price, 130);
assert.equal(monthlyRthHigh?.label, 'Previous Month RTH High');
assert.equal(monthlyRthHigh?.price, 150);

const chartContext = buildNinjaChartContext({
  bars5m: bars.slice(-2),
  bars15m: bars,
  bars60m: [],
  bars120m: [
    bar('2026-05-22T10:00:00-04:00', 140, 145, 130, 132),
    bar('2026-05-22T12:00:00-04:00', 132, 136, 120, 124),
  ],
  bars240m: [],
  sessionType: 'lunch',
  instrument: 'MES',
  tradeDate: '2026-05-22',
});

assert.equal(chartContext?.keyLevels.priorDayHigh, 130);
assert.equal(chartContext?.keyLevels.priorDayLow, 105);
assert.equal(chartContext?.multiTimeframeContext?.twoHour.barCount, 2);
assert.equal(chartContext?.multiTimeframeContext?.twoHour.trend, 'bearish');
assert.ok(chartContext?.marketContext?.includes('2H=SHORT'));
assert.ok(chartContext?.marketContext?.includes('ETH spans the full futures session, including RTH'));
assert.ok(chartContext?.targetObjectives?.some(objective => objective.source === 'three_day_rth'));
