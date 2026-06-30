import assert from 'node:assert/strict';
import { shouldSkipBackfillForCachedBars } from './backfill-market-bars';

function bars(count: number): Array<{ time: string }> {
  return Array.from({ length: count }, (_, index) => ({ time: `2026-06-29T${String(Math.floor(index / 12)).padStart(2, '0')}:${String((index % 12) * 5).padStart(2, '0')}:00` }));
}

assert.equal(shouldSkipBackfillForCachedBars({ timeframe: '5m', cachedBars: bars(199) }), false);
assert.equal(shouldSkipBackfillForCachedBars({ timeframe: '5m', cachedBars: bars(200) }), true);
assert.equal(shouldSkipBackfillForCachedBars({ timeframe: '15m', cachedBars: bars(59) }), false);
assert.equal(shouldSkipBackfillForCachedBars({ timeframe: '15m', cachedBars: bars(60) }), true);
assert.equal(shouldSkipBackfillForCachedBars({ timeframe: '60m', cachedBars: bars(18) }), true);
assert.equal(shouldSkipBackfillForCachedBars({ timeframe: '120m', cachedBars: bars(8) }), true);
assert.equal(shouldSkipBackfillForCachedBars({ timeframe: '240m', cachedBars: bars(4) }), true);

console.log('market_bars selective backfill skip verified.');
