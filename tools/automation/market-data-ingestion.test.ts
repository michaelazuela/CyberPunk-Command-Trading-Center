import assert from 'node:assert/strict';
import {
  countTimeframeIntervalMismatches,
  latestOpenTimestampCoverageToleranceMs,
  marketDataSourceFromCounts,
  mergeMarketDataBars,
  repairMarketDataBarsWithinBaseRange,
  verifyMarketDataWindow,
} from './market-data-ingestion';
import {
  buildMarketBarTimeframeIntegrityReport,
  countMarketBarTimeframeIntervalMismatches,
  filterBarsToRequestedTimeframe,
  marketDataCachePageRanges,
  normalizeCandleTimeEt,
  toMarketBarRecords,
  toMarketDataGapEventRecord,
} from './market-data-store';
import type { NinjaBridgeBar } from '../../src/lib/ninjaTraderBridge';

function bar(time: string, open = 7410, high = 7412, low = 7408, close = 7411): NinjaBridgeBar {
  return { time, open, high, low, close, volume: 1000 };
}

function evenlySpacedBars(start: string, end: string, count: number): NinjaBridgeBar[] {
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  const stepMs = count > 1 ? (endMs - startMs) / (count - 1) : 0;
  return Array.from({ length: count }, (_, index) => {
    const iso = new Date(startMs + stepMs * index).toISOString().slice(0, 19);
    return bar(iso);
  });
}

function intervalBars(start: string, minutes: number, count: number): NinjaBridgeBar[] {
  const startMs = Date.parse(start);
  return Array.from({ length: count }, (_, index) => {
    const iso = new Date(startMs + index * minutes * 60_000).toISOString();
    return bar(iso);
  });
}

function intervalBarsEnding(end: string, minutes: number, count: number): NinjaBridgeBar[] {
  const endMs = Date.parse(end);
  const startMs = endMs - Math.max(0, count - 1) * minutes * 60_000;
  return Array.from({ length: count }, (_, index) => {
    const iso = new Date(startMs + index * minutes * 60_000).toISOString();
    return bar(iso);
  });
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

assert.deepEqual(marketDataCachePageRanges(2500), [
  { from: 0, to: 999 },
  { from: 1000, to: 1999 },
  { from: 2000, to: 2499 },
]);
assert.deepEqual(marketDataCachePageRanges(0), []);
assert.equal(countTimeframeIntervalMismatches([
  bar('2026-06-21T18:00:00-04:00'),
  bar('2026-06-21T18:05:00-04:00'),
  bar('2026-06-21T18:10:00-04:00'),
], '120m') > 0, true);
assert.equal(countMarketBarTimeframeIntervalMismatches([
  bar('2026-06-21T18:00:00-04:00'),
  bar('2026-06-21T18:05:00-04:00'),
], '120m') > 0, true);
assert.equal(countMarketBarTimeframeIntervalMismatches([
  bar('2026-06-21T18:00:00-04:00'),
  bar('2026-06-21T19:45:00-04:00'),
], '120m') > 0, true);
assert.equal(countMarketBarTimeframeIntervalMismatches([
  bar('2026-06-21T18:00:00-04:00'),
  bar('2026-06-21T20:00:00-04:00'),
], '240m') > 0, true);
assert.equal(countMarketBarTimeframeIntervalMismatches([
  bar('2026-06-21T18:00:00-04:00'),
  bar('2026-06-21T20:00:00-04:00'),
  bar('2026-06-21T22:00:00-04:00'),
], '120m'), 0);
assert.equal(countMarketBarTimeframeIntervalMismatches([
  bar('2026-06-21T18:00:00-04:00'),
  bar('2026-06-21T22:00:00-04:00'),
  bar('2026-06-22T02:00:00-04:00'),
], '240m'), 0);
const filteredTwoHourCache = filterBarsToRequestedTimeframe([
  bar('2026-06-21T18:00:00-04:00'),
  bar('2026-06-21T18:05:00-04:00'),
  bar('2026-06-21T18:10:00-04:00'),
  bar('2026-06-21T19:45:00-04:00'),
  bar('2026-06-21T20:00:00-04:00'),
  bar('2026-06-21T20:05:00-04:00'),
], '120m');
assert.deepEqual(filteredTwoHourCache.map((item) => item.time), [
  '2026-06-21T18:00:00-04:00',
  '2026-06-21T20:00:00-04:00',
]);
assert.equal(countMarketBarTimeframeIntervalMismatches(filteredTwoHourCache, '120m'), 0);
const filteredFourHourCache = filterBarsToRequestedTimeframe([
  bar('2026-06-21T18:00:00-04:00'),
  bar('2026-06-21T20:00:00-04:00'),
  bar('2026-06-21T22:00:00-04:00'),
  bar('2026-06-22T00:00:00-04:00'),
  bar('2026-06-22T02:00:00-04:00'),
], '240m');
assert.deepEqual(filteredFourHourCache.map((item) => item.time), [
  '2026-06-21T18:00:00-04:00',
  '2026-06-21T22:00:00-04:00',
  '2026-06-22T02:00:00-04:00',
]);
assert.equal(countMarketBarTimeframeIntervalMismatches(filteredFourHourCache, '240m'), 0);
const badFourHourIntegrity = buildMarketBarTimeframeIntegrityReport([
  bar('2026-06-21T18:00:00-04:00'),
  bar('2026-06-21T20:00:00-04:00'),
  bar('2026-06-21T22:00:00-04:00'),
], '240m');
assert.equal(badFourHourIntegrity.valid, false);
assert.equal(badFourHourIntegrity.invalidShortIntervalRows, 2);
assert.equal(badFourHourIntegrity.observedIntervalMinutes['120'], 2);
const goodFourHourIntegrity = buildMarketBarTimeframeIntegrityReport(filteredFourHourCache, '240m');
assert.equal(goodFourHourIntegrity.valid, true);
assert.equal(goodFourHourIntegrity.observedIntervalMinutes['240'], 2);

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

const malformedTwoHourBridgeRepair = verifyMarketDataWindow({
  bars: Array.from({ length: 81 }, (_, index) => bar(
    `2026-06-21T${String(Math.floor(index / 12)).padStart(2, '0')}:${String((index % 12) * 5).padStart(2, '0')}:00-04:00`,
  )),
  timeframe: '120m',
  requestedFrom: '2026-06-21T00:00:00-04:00',
  requestedTo: '2026-06-21T06:40:00-04:00',
  requiredLookbackDays: 1,
  minimumBars: 80,
  source: 'bridge_repair',
  cacheBars: 0,
  bridgeRepairBars: 81,
  bridgeInstrument: 'MES 09-26',
});
assert.equal(malformedTwoHourBridgeRepair.sufficient, false);
assert.equal(malformedTwoHourBridgeRepair.timeframeIntervalMismatches > 0, true);
assert.match(malformedTwoHourBridgeRepair.warning || '', /timeframeIntervalMismatches=/);

const sundayEveningFourHourCoverageBars = Array.from({ length: 41 }, (_, index) => bar(
  new Date(Date.parse('2026-05-13T22:00:00Z') + index * 18 * 60 * 60 * 1000).toISOString(),
));
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

const sundayEveningFridayOpenTimestampBars = [
  ...Array.from({ length: 40 }, (_, index) => bar(
    new Date(Date.parse('2026-05-22T02:00:00-04:00') + index * 16 * 60 * 60 * 1000).toISOString(),
  )),
  bar('2026-06-19T13:00:00-04:00'),
];
const sundayEveningFridayOpenTimestampWindow = verifyMarketDataWindow({
  bars: sundayEveningFridayOpenTimestampBars,
  timeframe: '240m',
  requestedFrom: '2026-05-22T00:00:00-04:00',
  requestedTo: '2026-06-21T20:25:00-04:00',
  requiredLookbackDays: 30,
  minimumBars: 40,
  source: 'market_bars_bridge_repair',
  cacheBars: 41,
  bridgeRepairBars: 0,
  bridgeInstrument: 'MES 09-26',
});
assert.equal(sundayEveningFridayOpenTimestampWindow.sufficient, true);
assert.equal(sundayEveningFridayOpenTimestampWindow.dataLimitation.status, 'none');

const sundayEveningTwoHourFridayCloseWindow = verifyMarketDataWindow({
  bars: intervalBarsEnding('2026-06-26T17:00:00-04:00', 120, 360),
  timeframe: '120m',
  requestedFrom: '2026-05-29T00:00:00-04:00',
  requestedTo: '2026-06-28T19:55:00-04:00',
  requiredLookbackDays: 30,
  minimumBars: 80,
  source: 'market_bars_bridge_repair',
  cacheBars: 360,
  bridgeRepairBars: 0,
  bridgeInstrument: 'MES 09-26',
});
assert.equal(sundayEveningTwoHourFridayCloseWindow.sufficient, true);
assert.equal(sundayEveningTwoHourFridayCloseWindow.dataLimitation.status, 'none');

const afterFirstSundayTwoHourWindow = verifyMarketDataWindow({
  bars: intervalBarsEnding('2026-06-26T17:00:00-04:00', 120, 360),
  timeframe: '120m',
  requestedFrom: '2026-05-29T00:00:00-04:00',
  requestedTo: '2026-06-28T20:00:00-04:00',
  requiredLookbackDays: 30,
  minimumBars: 80,
  source: 'market_bars_bridge_repair',
  cacheBars: 360,
  bridgeRepairBars: 0,
  bridgeInstrument: 'MES 09-26',
});
assert.equal(afterFirstSundayTwoHourWindow.sufficient, false);
assert.equal(afterFirstSundayTwoHourWindow.dataLimitation.status, 'bridge_or_cache_incomplete');

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

const mondayMorningClosedStartWindow = verifyMarketDataWindow({
  bars: [
    bar('2026-05-17T18:05:00-04:00'),
    bar('2026-05-30T12:00:00-04:00'),
    bar('2026-06-15T10:10:00-04:00'),
  ],
  timeframe: '5m',
  requestedFrom: '2026-05-16T00:00:00-04:00',
  requestedTo: '2026-06-15T10:10:00-04:00',
  requiredLookbackDays: 30,
  minimumBars: 3,
  source: 'market_bars_bridge_repair',
  cacheBars: 3,
  bridgeRepairBars: 0,
  bridgeInstrument: 'MES 09-26',
});
assert.equal(mondayMorningClosedStartWindow.sufficient, true);
assert.equal(mondayMorningClosedStartWindow.dataLimitation.status, 'none');

const liveTuesdayMorningHtfWindows = [
  {
    timeframe: '60m' as const,
    bars: intervalBars('2026-05-17T19:00:00-04:00', 60, 711),
    minimumBars: 120,
  },
  {
    timeframe: '120m' as const,
    bars: intervalBars('2026-05-17T20:00:00-04:00', 120, 355),
    minimumBars: 80,
  },
  {
    timeframe: '240m' as const,
    bars: intervalBars('2026-05-17T22:00:00-04:00', 240, 178),
    minimumBars: 40,
  },
];
for (const fixture of liveTuesdayMorningHtfWindows) {
  const verified = verifyMarketDataWindow({
    bars: fixture.bars,
    timeframe: fixture.timeframe,
    requestedFrom: '2026-05-17T00:00:00-04:00',
    requestedTo: '2026-06-16T09:50:00-04:00',
    requiredLookbackDays: 30,
    minimumBars: fixture.minimumBars,
    source: 'market_bars',
    cacheBars: fixture.bars.length,
    bridgeRepairBars: 0,
    bridgeInstrument: 'MES 09-26',
  });
  assert.equal(verified.sufficient, true, `${fixture.timeframe} live Tuesday morning HTF cache should be sufficient`);
  assert.equal(verified.dataLimitation.status, 'none');
}

const openTimestampCoverageFixtures = [
  { timeframe: '5m' as const, minutes: 5, minimumBars: 500, count: 8700, insideLast: '2026-06-23T19:10:00-04:00', outsideLast: '2026-06-23T19:00:00-04:00' },
  { timeframe: '15m' as const, minutes: 15, minimumBars: 500, count: 2900, insideLast: '2026-06-23T19:00:00-04:00', outsideLast: '2026-06-23T18:30:00-04:00' },
  { timeframe: '60m' as const, minutes: 60, minimumBars: 120, count: 730, insideLast: '2026-06-23T18:00:00-04:00', outsideLast: '2026-06-23T17:00:00-04:00' },
  { timeframe: '120m' as const, minutes: 120, minimumBars: 80, count: 365, insideLast: '2026-06-23T17:00:00-04:00', outsideLast: '2026-06-23T15:00:00-04:00' },
  { timeframe: '240m' as const, minutes: 240, minimumBars: 40, count: 183, insideLast: '2026-06-23T17:00:00-04:00', outsideLast: '2026-06-23T11:00:00-04:00' },
];
for (const fixture of openTimestampCoverageFixtures) {
  assert.equal(
    latestOpenTimestampCoverageToleranceMs(fixture.timeframe),
    (fixture.minutes * 2 + 30) * 60_000,
    `${fixture.timeframe} should use the shared open-timestamp coverage tolerance`,
  );
  const insideWindow = verifyMarketDataWindow({
    bars: intervalBarsEnding(fixture.insideLast, fixture.minutes, fixture.count),
    timeframe: fixture.timeframe,
    requestedFrom: '2026-05-24T00:00:00-04:00',
    requestedTo: '2026-06-23T19:45:00-04:00',
    requiredLookbackDays: 30,
    minimumBars: fixture.minimumBars,
    source: 'market_bars_bridge_repair',
    cacheBars: fixture.count,
    bridgeRepairBars: 10,
    bridgeInstrument: 'MES 09-26',
  });
  assert.equal(insideWindow.sufficient, true, `${fixture.timeframe} open-timestamp latest bar should satisfy history coverage`);

  const outsideWindow = verifyMarketDataWindow({
    bars: intervalBarsEnding(fixture.outsideLast, fixture.minutes, fixture.count),
    timeframe: fixture.timeframe,
    requestedFrom: '2026-05-24T00:00:00-04:00',
    requestedTo: '2026-06-23T19:45:00-04:00',
    requiredLookbackDays: 30,
    minimumBars: fixture.minimumBars,
    source: 'market_bars_bridge_repair',
    cacheBars: fixture.count,
    bridgeRepairBars: 10,
    bridgeInstrument: 'MES 09-26',
  });
  assert.equal(outsideWindow.sufficient, false, `${fixture.timeframe} stale latest bar should still fail history coverage`);
}

const mondayMorningLateStartWindow = verifyMarketDataWindow({
  bars: [
    bar('2026-05-19T09:30:00-04:00'),
    bar('2026-05-30T12:00:00-04:00'),
    bar('2026-06-15T10:10:00-04:00'),
  ],
  timeframe: '5m',
  requestedFrom: '2026-05-16T00:00:00-04:00',
  requestedTo: '2026-06-15T10:10:00-04:00',
  requiredLookbackDays: 30,
  minimumBars: 3,
  source: 'market_bars_bridge_repair',
  cacheBars: 3,
  bridgeRepairBars: 0,
  bridgeInstrument: 'MES 09-26',
});
assert.equal(mondayMorningLateStartWindow.sufficient, false);
assert.equal(mondayMorningLateStartWindow.dataLimitation.status, 'bridge_or_cache_incomplete');

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
