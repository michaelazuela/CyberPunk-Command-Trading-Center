import assert from 'node:assert/strict';
import { buildNinjaChartContext, type NinjaBridgeBar } from './ninjaTraderBridge';

function bar(index: number, open: number, high: number, low: number, close: number): NinjaBridgeBar {
  const time = new Date(Date.UTC(2026, 7, 31, 13, 30 + index * 5)).toISOString();
  return {
    time,
    open,
    high,
    low,
    close,
    volume: 1000,
  };
}

function timedBar(time: string, open: number, high: number, low: number, close: number): NinjaBridgeBar {
  return { time, open, high, low, close, volume: 1000 };
}

const bars: NinjaBridgeBar[] = [];
let price = 7600;
for (let index = 0; index < 18; index += 1) {
  bars.push(bar(index * 3, price, price + 0.5, price - 0.5, price + 0.25));
  bars.push(bar(index * 3 + 1, price + 0.25, price + 1, price, price + 0.5));
  price += 4;
  bars.push(bar(index * 3 + 2, price, price + 3, price - 0.25, price + 2.5));
  price += 2;
}

const context = buildNinjaChartContext({
  bars5m: bars,
  sessionType: 'morning',
  instrument: 'MES',
  tradeDate: '2026-08-31',
});

assert.ok(context);
assert.ok((context?.fvgZones?.length || 0) > 8);
assert.ok(
  (context?.multiTimeframeContext?.fiveMinute.fvgZones?.length || 0) > 8,
  'bridge context should retain the full detected FVG set, not a trimmed last-8 set',
);

const longRangeFifteenMinute: NinjaBridgeBar[] = [
  timedBar('2026-08-26T22:00:00-04:00', 7678, 7679.75, 7676, 7679),
  timedBar('2026-08-26T22:15:00-04:00', 7679, 7681, 7678.5, 7680),
  timedBar('2026-08-26T22:30:00-04:00', 7684, 7740, 7683.5, 7734),
];
let fillerPrice = 7734;
for (let index = 0; index < 140; index += 1) {
  const time = new Date(Date.UTC(2026, 7, 27, 2, 45 + index * 15)).toISOString();
  const open = fillerPrice;
  const close = fillerPrice + (index % 2 === 0 ? 0.25 : -0.25);
  longRangeFifteenMinute.push(timedBar(time, open, open + 1, open - 1, close));
  fillerPrice = close;
}

const longRangeContext = buildNinjaChartContext({
  bars5m: [
    timedBar('2026-08-31T09:45:00-04:00', 7700, 7705, 7698, 7703),
    timedBar('2026-08-31T09:50:00-04:00', 7703, 7706, 7701, 7704),
  ],
  bars15m: longRangeFifteenMinute,
  sessionType: 'morning',
  instrument: 'MES',
  tradeDate: '2026-08-31',
});

assert.ok(longRangeContext);
assert.ok(
  (longRangeContext?.multiTimeframeContext?.fifteenMinute.candles?.length || 0) > 80,
  '15M facts must preserve more than 80 candles so three-trading-day final boss zones can be retained',
);
assert.ok(
  longRangeContext?.multiTimeframeContext?.fifteenMinute.fvgZones?.some((zone) =>
    zone.direction === 'LONG' &&
    zone.lower === 7679.75 &&
    zone.upper === 7683.5
  ),
  '15M strict FVG final boss from Aug 26 must survive long-range candle fact retention',
);

console.log('ninja bridge FVG retention loopback test passed');
