import assert from 'node:assert/strict';
import {
  marketDataSourceFromCounts,
  mergeMarketDataBars,
  repairMarketDataBarsWithinBaseRange,
  verifyMarketDataWindow,
} from './market-data-ingestion';
import { toMarketDataGapEventRecord } from './market-data-store';
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

console.log('Market data ingestion hardening verified.');
