import assert from 'node:assert/strict';
import {
  marketDataSourceFromCounts,
  mergeMarketDataBars,
  repairMarketDataBarsWithinBaseRange,
  verifyMarketDataWindow,
} from './market-data-ingestion';
import { normalizeCandleTimeEt, toMarketBarRecords, toMarketDataGapEventRecord } from './market-data-store';
import type { NinjaBridgeBar } from '../../src/lib/ninjaTraderBridge';

function bar(time: string, open = 7410, high = 7412, low = 7408, close = 7411): NinjaBridgeBar {
  return { time, open, high, low, close, volume: 1000 };
}

const liveWithGap = [
  bar('2026-06-09T13:10:00-04:00'),
  bar('2026-06-09T13:15:00-04:00'),
  bar('2026-06-09T13:25:00-04:00'),
  bar('2026-06-09T13:45:00-04:00'),
];

const repairContext = [
  bar('2026-06-09T13:05:00-04:00'),
  bar('2026-06-09T13:20:00-04:00'),
  bar('2026-06-09T13:30:00-04:00'),
  bar('2026-06-09T13:35:00-04:00'),
  bar('2026-06-09T13:40:00-04:00'),
  bar('2026-06-09T13:50:00-04:00'),
];

const repaired = repairMarketDataBarsWithinBaseRange(liveWithGap, repairContext);
assert.deepEqual(repaired.map((item) => item.time), [
  '2026-06-09T13:10:00',
  '2026-06-09T13:15:00',
  '2026-06-09T13:20:00',
  '2026-06-09T13:25:00',
  '2026-06-09T13:30:00',
  '2026-06-09T13:35:00',
  '2026-06-09T13:40:00',
  '2026-06-09T13:45:00',
]);
assert.equal(repaired.some((item) => item.time === '2026-06-09T13:05:00'), false);
assert.equal(repaired.some((item) => item.time === '2026-06-09T13:50:00'), false);

const merged = mergeMarketDataBars(
  [bar('2026-06-09T13:10:00-04:00', 1, 2, 0, 1.5)],
  [bar('2026-06-09T13:10:00-04:00', 10, 11, 9, 10.5), bar('2026-06-09T13:05:00-04:00')],
);
assert.deepEqual(merged.map((item) => item.time), ['2026-06-09T13:05:00', '2026-06-09T13:10:00']);
assert.equal(merged[1].open, 1);

assert.equal(marketDataSourceFromCounts(10, 2), 'market_bars_bridge_repair');
assert.equal(marketDataSourceFromCounts(10, 0), 'market_bars');
assert.equal(marketDataSourceFromCounts(0, 2), 'bridge_repair');
assert.equal(marketDataSourceFromCounts(0, 0), 'missing');

const sufficient = verifyMarketDataWindow({
  bars: repaired,
  timeframe: '5m',
  requestedFrom: '2026-06-09T13:10:00-04:00',
  requestedTo: '2026-06-09T13:45:00-04:00',
  requiredLookbackDays: 1,
  minimumBars: 6,
  source: 'market_bars_bridge_repair',
  cacheBars: 4,
  bridgeRepairBars: 4,
  bridgeInstrument: 'MES 06-26',
});
assert.equal(sufficient.sufficient, true);
assert.equal(sufficient.dataLimitation.status, 'none');
assert.equal(sufficient.dataLimitation.canInventMissingBars, false);

const sundayEveningFourHourCoverageBars = [
  ...Array.from({ length: 29 }, (_, index) => bar(
    `${new Date(Date.UTC(2026, 4, 15 + index)).toISOString().slice(0, 10)}T02:00:00-04:00`,
  )),
  ...Array.from({ length: 12 }, (_, index) => bar(
    `2026-06-12T${String(6 + index).padStart(2, '0')}:00:00-04:00`,
  )),
];
const sundayEveningFourHourWindow = verifyMarketDataWindow({
  bars: sundayEveningFourHourCoverageBars,
  timeframe: '240m',
  requestedFrom: '2026-05-15T00:00:00-04:00',
  requestedTo: '2026-06-14T20:50:00-04:00',
  requiredLookbackDays: 30,
  minimumBars: 40,
  source: 'market_bars_bridge_repair',
  cacheBars: 42,
  bridgeRepairBars: 0,
  bridgeInstrument: 'MES 09-26',
});
assert.equal(sundayEveningFourHourWindow.sufficient, true);
assert.equal(sundayEveningFourHourWindow.dataLimitation.status, 'none');

const afterFirstSundayFourHourWindow = verifyMarketDataWindow({
  bars: sundayEveningFourHourCoverageBars,
  timeframe: '240m',
  requestedFrom: '2026-05-15T00:00:00-04:00',
  requestedTo: '2026-06-14T22:00:00-04:00',
  requiredLookbackDays: 30,
  minimumBars: 40,
  source: 'market_bars_bridge_repair',
  cacheBars: 42,
  bridgeRepairBars: 0,
  bridgeInstrument: 'MES 09-26',
});
assert.equal(afterFirstSundayFourHourWindow.sufficient, false);
assert.equal(afterFirstSundayFourHourWindow.dataLimitation.status, 'bridge_or_cache_incomplete');

const insufficient = verifyMarketDataWindow({
  bars: liveWithGap,
  timeframe: '5m',
  requestedFrom: '2026-06-09T13:10:00-04:00',
  requestedTo: '2026-06-09T13:45:00-04:00',
  requiredLookbackDays: 1,
  minimumBars: 6,
  source: 'market_bars',
  cacheBars: 4,
  bridgeRepairBars: 0,
  bridgeInstrument: 'MES 06-26',
});
assert.equal(insufficient.sufficient, false);
assert.equal(insufficient.dataLimitation.status, 'bridge_or_cache_incomplete');
assert.match(insufficient.warning || '', /Market-data ingestion insufficient/);
assert.match(insufficient.dataLimitation.operatorAction || '', /nt:backfill/);

const gapRecord = toMarketDataGapEventRecord({
  userId: '00000000-0000-0000-0000-000000000001',
  instrument: 'MES',
  bridgeInstrument: 'MES 06-26',
  timeframe: insufficient.timeframe,
  requestedFrom: insufficient.requestedFrom,
  requestedTo: insufficient.requestedTo,
  rangeStart: insufficient.rangeStart,
  rangeEnd: insufficient.rangeEnd,
  barsLoaded: insufficient.barsLoaded,
  cacheBars: insufficient.cacheBars,
  bridgeRepairBars: insufficient.bridgeRepairBars,
  source: insufficient.source,
  dataLimitationMessage: insufficient.dataLimitation.message,
  operatorAction: insufficient.dataLimitation.operatorAction || null,
  metadata: {
    canInventMissingBars: false,
    htfPromotionAllowed: insufficient.dataLimitation.htfPromotionAllowed,
  },
});
assert.equal(gapRecord.requested_from_et, '2026-06-09T13:10:00');
assert.equal(gapRecord.requested_to_et, '2026-06-09T13:45:00');
assert.equal(gapRecord.status, 'open');
assert.equal(gapRecord.metadata.canInventMissingBars, false);
assert.equal(gapRecord.metadata.htfPromotionAllowed, false);

assert.equal(normalizeCandleTimeEt('2026-06-09T17:10:00Z'), '2026-06-09T13:10:00');
assert.equal(normalizeCandleTimeEt('2026-01-15T09:30:00-05:00'), '2026-01-15T09:30:00');
assert.equal(normalizeCandleTimeEt('2026-06-09T13:10:00.0000000'), '2026-06-09T13:10:00');

const persistedBars = toMarketBarRecords({
  bars: [
    bar('2026-06-09T17:10:00Z'),
    bar('2026-06-09T17:15:00Z', 10, 9, 8, 10.5),
  ],
  userId: '00000000-0000-0000-0000-000000000001',
  instrument: 'MES',
  bridgeInstrument: 'MES 06-26',
  timeframe: '5m',
});
assert.equal(persistedBars.length, 1);
assert.equal(persistedBars[0].candle_time_et, '2026-06-09T13:10:00');
assert.equal(persistedBars[0].metadata.rawTime, '2026-06-09T17:10:00Z');

const shiftedWindow = verifyMarketDataWindow({
  bars: [
    bar('2026-06-09T13:15:00-04:00'),
    bar('2026-06-09T13:20:00-04:00'),
    bar('2026-06-09T13:25:00-04:00'),
    bar('2026-06-09T13:30:00-04:00'),
    bar('2026-06-09T13:35:00-04:00'),
    bar('2026-06-09T13:40:00-04:00'),
    bar('2026-06-09T13:45:00-04:00'),
  ],
  timeframe: '5m',
  requestedFrom: '2026-06-09T13:00:00-04:00',
  requestedTo: '2026-06-09T13:45:00-04:00',
  requiredLookbackDays: 1,
  minimumBars: 6,
  source: 'bridge_repair',
  cacheBars: 0,
  bridgeRepairBars: 7,
  bridgeInstrument: 'MES 06-26',
});
assert.equal(shiftedWindow.sufficient, false);
assert.match(shiftedWindow.warning || '', /Market-data ingestion insufficient/);

console.log('Market data ingestion hardening verified.');
