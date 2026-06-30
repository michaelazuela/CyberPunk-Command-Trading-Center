import assert from 'node:assert/strict';
import { buildMarketBarsRetentionAuditReport, computeRollingRetentionCutoffEt, type MarketBarsRetentionClient } from './market-bars-retention-core';

type Row = { id: string; user_id: string; instrument: string; bridge_instrument: string; timeframe: string; candle_time_et: string };

class Query {
  private filters: Array<(row: Row) => boolean> = [];
  private orderColumn: keyof Row | null = null;
  private orderAscending = true;
  private limitCount: number | null = null;
  constructor(private rows: Row[], private options: { count?: 'exact'; head?: boolean } = {}, private timeout = false) {}
  eq(column: keyof Row, value: string) { this.filters.push((row) => row[column] === value); return this; }
  lt(column: keyof Row, value: string) { this.filters.push((row) => row[column] < value); return this; }
  order(column: keyof Row, options: { ascending: boolean }) { this.orderColumn = column; this.orderAscending = options.ascending; return this; }
  limit(value: number) { this.limitCount = value; return this; }
  then(resolve: (value: any) => void) {
    if (this.timeout) return resolve({ data: null, count: null, error: { message: 'upstream request timeout' } });
    let data = this.rows.filter((row) => this.filters.every((filter) => filter(row)));
    if (this.orderColumn) {
      data = [...data].sort((a, b) => String(a[this.orderColumn!]).localeCompare(String(b[this.orderColumn!])));
      if (!this.orderAscending) data.reverse();
    }
    if (this.limitCount !== null) data = data.slice(0, this.limitCount);
    resolve({ data: this.options.head ? null : data, count: this.options.count === 'exact' ? data.length : null, error: null });
  }
}

class Client implements MarketBarsRetentionClient {
  constructor(private rows: Row[], private timeout = false) {}
  from(table: string) {
    assert.equal(table, 'market_bars');
    return {
      select: (_columns: string, options = {}) => new Query(this.rows, options, this.timeout),
    };
  }
}

const rows: Row[] = [
  { id: 'old', user_id: 'u1', instrument: 'MES', bridge_instrument: 'MES 09-26', timeframe: '5m', candle_time_et: '2026-06-01T23:55:00' },
  { id: 'keep', user_id: 'u1', instrument: 'MES', bridge_instrument: 'MES 09-26', timeframe: '5m', candle_time_et: '2026-06-02T00:00:00' },
  { id: 'new', user_id: 'u1', instrument: 'MES', bridge_instrument: 'MES 09-26', timeframe: '5m', candle_time_et: '2026-07-01T09:30:00' },
  { id: 'other', user_id: 'u2', instrument: 'MES', bridge_instrument: 'MES 09-26', timeframe: '5m', candle_time_et: '2026-05-01T00:00:00' },
];

assert.equal(computeRollingRetentionCutoffEt(new Date('2026-07-01T16:00:00Z')), '2026-06-02T00:00:00');
assert.equal(computeRollingRetentionCutoffEt(new Date('2026-06-30T16:00:00Z')), '2026-06-01T00:00:00');

const report = await buildMarketBarsRetentionAuditReport({
  client: new Client(rows),
  config: { userId: 'u1', supabaseUrl: 'https://example.supabase.co', serviceRoleKey: 'secret' },
  scope: { timeframes: ['5m'] },
  now: new Date('2026-07-01T16:00:00Z'),
});
assert.equal(report.mutatesData, false);
assert.equal(report.cutoffEt, '2026-06-02T00:00:00');
assert.equal(report.buckets[0].totalRows, 3);
assert.equal(report.buckets[0].olderThanRetentionRows, 1);
assert.equal(report.buckets[0].oldestCandleTimeEt, '2026-06-01T23:55:00');
assert.equal(report.buckets[0].newestCandleTimeEt, '2026-07-01T09:30:00');

const timeoutReport = await buildMarketBarsRetentionAuditReport({
  client: new Client(rows, true),
  config: { userId: 'u1', supabaseUrl: 'https://example.supabase.co', serviceRoleKey: 'secret' },
  scope: { timeframes: ['5m'] },
  now: new Date('2026-07-01T16:00:00Z'),
});
assert.equal(timeoutReport.ioPressureEvidence.length > 0, true);
assert.match(timeoutReport.ioPressureEvidence[0], /timeout/);

console.log('market_bars retention audit verified.');
