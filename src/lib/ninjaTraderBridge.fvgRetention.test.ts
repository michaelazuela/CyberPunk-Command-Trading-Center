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

console.log('ninja bridge FVG retention loopback test passed');
