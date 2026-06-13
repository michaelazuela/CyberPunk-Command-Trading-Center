import assert from 'node:assert/strict';
import { assertProtectedStructureReviewReportIsCompact } from './protected-structure-trade-review';

assert.doesNotThrow(() => assertProtectedStructureReviewReportIsCompact({
  reportType: 'protected_structure_trend_confirmation_trade_by_trade_review',
  source: {
    bars5m: 2297,
    cacheBars: 1000,
    bridgeBars: 1297,
    source: 'market_bars_bridge_repair',
    firstBar: '2026-06-08T00:00:00',
    lastBar: '2026-06-12T16:00:00.000',
  },
  campaigns: [
    {
      id: 13,
      direction: 'LONG',
      entry: 7429,
      stop: 7388.25,
      target1: 7490.25,
      target2: 7510.5,
      chart: 'reports/protected-structure-review/example.png',
    },
  ],
}));

assert.throws(
  () => assertProtectedStructureReviewReportIsCompact({
    source: { bars5m: 1 },
    bars: [{ time: '2026-06-12T11:00:00', open: 1, high: 2, low: 0, close: 1.5 }],
  }),
  /must not include raw bars data/,
);

assert.throws(
  () => assertProtectedStructureReviewReportIsCompact({
    campaigns: [
      {
        id: 1,
        candles: [{ time: '2026-06-12T11:00:00', open: 1, high: 2, low: 0, close: 1.5 }],
      },
    ],
  }),
  /must not include raw candles data/,
);

assert.throws(
  () => assertProtectedStructureReviewReportIsCompact({
    campaigns: [
      {
        id: 1,
        evidence: [{ timestamp: '2026-06-12T11:00:00', open: 1, high: 2, low: 0, close: 1.5 }],
      },
    ],
  }),
  /must not include raw OHLC bars/,
);

console.log('Protected structure trade-review compact report guard verified.');
