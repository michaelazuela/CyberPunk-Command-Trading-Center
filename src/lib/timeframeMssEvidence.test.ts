import assert from 'node:assert/strict';
import { buildMultiTimeframeMssEvidenceLayer, buildTimeframeMssEvidence } from './timeframeMssEvidence';
import { buildHtfLiquidityDrawState } from './htfLiquidityDrawEngine';
import type { NinjaBridgeBar } from './ninjaTraderBridge';

function bar(time: string, open: number, high: number, low: number, close: number): NinjaBridgeBar {
  return { time, open, high, low, close, volume: 1000 };
}

const june5FifteenMinuteBearishMss = [
  bar('2026-06-05T08:15:00-04:00', 100, 102, 98, 101),
  bar('2026-06-05T08:30:00-04:00', 101, 104, 100, 103),
  bar('2026-06-05T08:45:00-04:00', 103, 103, 99, 102),
  bar('2026-06-05T09:00:00-04:00', 102, 106, 101, 105),
  bar('2026-06-05T09:15:00-04:00', 105, 105, 100.5, 104),
  bar('2026-06-05T09:30:00-04:00', 104, 107, 101.5, 106),
  bar('2026-06-05T09:45:00-04:00', 106, 107, 94, 95),
];

const june5SixtyMinuteBearishMss = [
  bar('2026-06-05T04:00:00-04:00', 100, 102, 98, 101),
  bar('2026-06-05T05:00:00-04:00', 101, 104, 100, 103),
  bar('2026-06-05T06:00:00-04:00', 103, 103, 99, 102),
  bar('2026-06-05T07:00:00-04:00', 102, 106, 101, 105),
  bar('2026-06-05T08:00:00-04:00', 105, 105, 100.5, 104),
  bar('2026-06-05T09:00:00-04:00', 104, 107, 101.5, 106),
  bar('2026-06-05T10:00:00-04:00', 106, 107, 94, 95),
];

const june5OneTwentyMinuteDisplacementNoMssAtTen = [
  bar('2026-06-05T02:00:00-04:00', 116, 118, 112, 117),
  bar('2026-06-05T04:00:00-04:00', 117, 119, 113, 118),
  bar('2026-06-05T06:00:00-04:00', 118, 118.5, 104, 112),
  bar('2026-06-05T08:00:00-04:00', 112, 115, 111, 114),
  bar('2026-06-05T10:00:00-04:00', 114, 115, 105, 106),
];

const june5OneTwentyMinuteWithIncompleteNoonMss = [
  bar('2026-06-05T00:00:00-04:00', 100, 102, 98, 101),
  bar('2026-06-05T02:00:00-04:00', 101, 104, 100, 103),
  bar('2026-06-05T04:00:00-04:00', 103, 103, 99, 102),
  bar('2026-06-05T06:00:00-04:00', 102, 106, 101, 105),
  bar('2026-06-05T08:00:00-04:00', 105, 105, 100.5, 104),
  bar('2026-06-05T10:00:00-04:00', 102, 107, 101.5, 106),
  bar('2026-06-05T12:00:00-04:00', 106, 107, 94, 95),
];

const june5TwoFortyMinuteDisplacementNoMss = [
  bar('2026-06-05T00:00:00-04:00', 118, 119, 100, 116),
  bar('2026-06-05T04:00:00-04:00', 116, 117, 98, 114),
  bar('2026-06-05T08:00:00-04:00', 114, 120, 94, 100),
  bar('2026-06-05T12:00:00-04:00', 102, 103, 101, 102),
];

const fifteenMinute = buildTimeframeMssEvidence({
  timeframe: '15M',
  bars: june5FifteenMinuteBearishMss,
  asOfTimestamp: '2026-06-05T10:00:00-04:00',
});
assert.equal(fifteenMinute.direction, 'bearish');
assert.equal(fifteenMinute.status, 'confirmed_mss');
assert.equal(fifteenMinute.breaksStructure, true);
assert.equal(fifteenMinute.evidenceTimestamp, '2026-06-05T09:45:00-04:00');
assert.equal(fifteenMinute.completedBarStatus, 'completed');
assert.equal(fifteenMinute.source, 'ninjatrader_ohlc');
assert.ok(fifteenMinute.displacementQuality.score >= 70);

const sixtyMinute = buildTimeframeMssEvidence({
  timeframe: '60M',
  bars: june5SixtyMinuteBearishMss,
  asOfTimestamp: '2026-06-05T11:00:00-04:00',
});
assert.equal(sixtyMinute.direction, 'bearish');
assert.equal(sixtyMinute.status, 'confirmed_mss');
assert.equal(sixtyMinute.breaksStructure, true);
assert.equal(sixtyMinute.evidenceTimestamp, '2026-06-05T10:00:00-04:00');
assert.equal(sixtyMinute.completedBarStatus, 'completed');

const oneTwentyTen = buildTimeframeMssEvidence({
  timeframe: '120M',
  bars: june5OneTwentyMinuteDisplacementNoMssAtTen,
  asOfTimestamp: '2026-06-05T12:00:00-04:00',
});
assert.equal(oneTwentyTen.direction, 'bearish');
assert.equal(oneTwentyTen.status, 'displacement_without_mss');
assert.equal(oneTwentyTen.breaksStructure, false);
assert.equal(oneTwentyTen.evidenceTimestamp, '2026-06-05T10:00:00-04:00');
assert.ok(oneTwentyTen.blockers.some((item) => item.includes('did not break a confirmed swing structure level')));

const oneTwentyNoonIncomplete = buildTimeframeMssEvidence({
  timeframe: '120M',
  bars: june5OneTwentyMinuteWithIncompleteNoonMss,
  asOfTimestamp: '2026-06-05T12:30:00-04:00',
  barTimestampMode: 'open',
});
assert.equal(oneTwentyNoonIncomplete.status, 'displacement_without_mss');
assert.equal(oneTwentyNoonIncomplete.breaksStructure, false);
assert.equal(oneTwentyNoonIncomplete.evidenceTimestamp, '2026-06-05T10:00:00-04:00');
assert.ok(oneTwentyNoonIncomplete.blockers.some((item) => item.includes('latest bar is incomplete')));
assert.equal(oneTwentyNoonIncomplete.barTimestampMode, 'open');

const oneTwentyNoonCompleted = buildTimeframeMssEvidence({
  timeframe: '120M',
  bars: june5OneTwentyMinuteWithIncompleteNoonMss,
  asOfTimestamp: '2026-06-05T14:00:00-04:00',
  barTimestampMode: 'open',
});
assert.equal(oneTwentyNoonCompleted.status, 'confirmed_mss');
assert.equal(oneTwentyNoonCompleted.breaksStructure, true);
assert.equal(oneTwentyNoonCompleted.evidenceTimestamp, '2026-06-05T12:00:00-04:00');

const oneTwentyNoonCloseTimestampMode = buildTimeframeMssEvidence({
  timeframe: '120M',
  bars: june5OneTwentyMinuteWithIncompleteNoonMss,
  asOfTimestamp: '2026-06-05T12:30:00-04:00',
});
assert.equal(oneTwentyNoonCloseTimestampMode.status, 'confirmed_mss');
assert.equal(oneTwentyNoonCloseTimestampMode.breaksStructure, true);
assert.equal(oneTwentyNoonCloseTimestampMode.evidenceTimestamp, '2026-06-05T12:00:00-04:00');
assert.equal(oneTwentyNoonCloseTimestampMode.barTimestampMode, 'close');
assert.equal(oneTwentyNoonCloseTimestampMode.barTimeZone, 'eastern');

const twoForty = buildTimeframeMssEvidence({
  timeframe: '240M',
  bars: june5TwoFortyMinuteDisplacementNoMss,
  asOfTimestamp: '2026-06-05T12:00:00-04:00',
});
assert.equal(twoForty.direction, 'bearish');
assert.equal(twoForty.status, 'displacement_without_mss');
assert.equal(twoForty.breaksStructure, false);
assert.equal(twoForty.evidenceTimestamp, '2026-06-05T08:00:00-04:00');

const layer = buildMultiTimeframeMssEvidenceLayer({
  barsByTimeframe: {
    '5M': june5FifteenMinuteBearishMss,
    '15M': june5FifteenMinuteBearishMss,
    '60M': june5SixtyMinuteBearishMss,
    '120M': june5OneTwentyMinuteWithIncompleteNoonMss,
    '240M': june5TwoFortyMinuteDisplacementNoMss,
  },
  asOfTimestamp: '2026-06-05T12:30:00-04:00',
  barTimestampMode: 'open',
});
assert.equal(layer.boundary, 'evidence_only_not_approval_or_execution_authority');
assert.equal(layer.approvesExecution, false);
assert.equal(layer.changesTradeLogic, false);
assert.equal(layer.timeframes['15M'].status, 'confirmed_mss');
assert.equal(layer.timeframes['60M'].status, 'confirmed_mss');
assert.equal(layer.timeframes['120M'].evidenceTimestamp, '2026-06-05T10:00:00-04:00');
assert.equal(layer.timeframes['120M'].barTimestampMode, 'open');
assert.equal(layer.timeframes['240M'].status, 'displacement_without_mss');

const conflictingAggregate = buildHtfLiquidityDrawState({
  bars4H: [],
  bars2H: [],
  bars1H: [],
  bars15M: june5FifteenMinuteBearishMss,
  bars5M: [
    bar('2026-06-05T09:00:00-04:00', 100, 101, 99, 100),
    bar('2026-06-05T09:05:00-04:00', 100, 101, 98, 99),
    bar('2026-06-05T09:10:00-04:00', 99, 100, 97, 98),
    bar('2026-06-05T09:15:00-04:00', 98, 99, 96, 97),
    bar('2026-06-05T09:20:00-04:00', 97, 99, 95, 98),
    bar('2026-06-05T09:25:00-04:00', 98, 100, 96, 99),
    bar('2026-06-05T09:30:00-04:00', 99, 103, 98, 102.75),
    bar('2026-06-05T09:35:00-04:00', 102.5, 103, 101.75, 102.25),
    bar('2026-06-05T09:40:00-04:00', 102.25, 103.25, 102, 102.75),
    bar('2026-06-05T09:45:00-04:00', 102.75, 103.5, 101.5, 102.5),
    bar('2026-06-05T09:50:00-04:00', 102.5, 103, 94, 94.5),
  ],
});
assert.equal(conflictingAggregate.classification, 'CONFLICTING_MSS');
assert.equal(layer.timeframes['15M'].status, 'confirmed_mss');
assert.equal(layer.timeframes['15M'].evidenceTimestamp, '2026-06-05T09:45:00-04:00');

console.log('Multi-timeframe MSS evidence layer verified.');
