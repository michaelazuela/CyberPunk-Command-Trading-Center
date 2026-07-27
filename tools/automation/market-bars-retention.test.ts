import assert from 'node:assert/strict';
import { runMarketBarsRetention, type MarketBarsRetentionClient } from './market-bars-retention-core';

type Row = { id: string; user_id: string; instrument: string; bridge_instrument: string; timeframe: string; candle_time_et: string };

class Query {
  private filters: Array<(row: Row) => boolean> = [];
  private orderColumn: keyof Row | null = null;
  private orderAscending = true;
  private limitCount: number | null = null;
  constructor(private rowsRef: { rows: Row[] }, private table: string, private mode: 'select' | 'delete', private options: { count?: 'exact'; head?: boolean } = {}, private timeout = false) {}
  eq(column: keyof Row, value: string) { this.filters.push((row) => row[column] === value); return this; }
  lt(column: keyof Row, value: string) { this.filters.push((row) => row[column] < value); return this; }
  in(column: keyof Row, values: string[]) { this.filters.push((row) => values.includes(String(row[column]))); return this; }
  order(column: keyof Row, options: { ascending: boolean }) { this.orderColumn = column; this.orderAscending = options.ascending; return this; }
  limit(value: number) { this.limitCount = value; return this; }
  then(resolve: (value: any) => void) {
    assert.equal(this.table, 'market_bars');
    if (this.timeout) return resolve({ data: null, count: null, error: { message: 'canceling statement due to statement timeout' } });
    let data = this.rowsRef.rows.filter((row) => this.filters.every((filter) => filter(row)));
    if (this.orderColumn) {
      data = [...data].sort((a, b) => String(a[this.orderColumn!]).localeCompare(String(b[this.orderColumn!])));
      if (!this.orderAscending) data.reverse();
    }
    if (this.limitCount !== null) data = data.slice(0, this.limitCount);
    if (this.mode === 'delete') {
      const ids = new Set(data.map((row) => row.id));
      this.rowsRef.rows = this.rowsRef.rows.filter((row) => !ids.has(row.id));
      return resolve({ data: null, count: ids.size, error: null });
    }
    resolve({ data: this.options.head ? null : data, count: this.options.count === 'exact' ? data.length : null, error: null });
  }
}

class Client implements MarketBarsRetentionClient {
  rowsRef: { rows: Row[] };
  constructor(rows: Row[], private timeout = false) { this.rowsRef = { rows }; }
  from(table: string) {
    return {
      select: (_columns: string, options = {}) => new Query(this.rowsRef, table, 'select', options, this.timeout),
      delete: (options = {}) => new Query(this.rowsRef, table, 'delete', options, this.timeout),
    };
  }
}

function fixtureRows(): Row[] {
  return [
    { id: 'jun1', user_id: 'u1', instrument: 'MES', bridge_instrument: 'MES 09-26', timeframe: '5m', candle_time_et: '2026-06-01T23:55:00' },
    { id: 'jun2', user_id: 'u1', instrument: 'MES', bridge_instrument: 'MES 09-26', timeframe: '5m', candle_time_et: '2026-06-02T00:00:00' },
    { id: 'jul1', user_id: 'u1', instrument: 'MES', bridge_instrument: 'MES 09-26', timeframe: '5m', candle_time_et: '2026-07-01T09:30:00' },
    { id: 'other-user-old', user_id: 'u2', instrument: 'MES', bridge_instrument: 'MES 09-26', timeframe: '5m', candle_time_et: '2026-05-01T00:00:00' },
    { id: 'other-tf-old', user_id: 'u1', instrument: 'MES', bridge_instrument: 'MES 09-26', timeframe: '15m', candle_time_et: '2026-06-01T23:45:00' },
  ];
}

const dryClient = new Client(fixtureRows());
const dryRun = await runMarketBarsRetention({
  client: dryClient,
  config: { userId: 'u1', supabaseUrl: 'https://example.supabase.co', serviceRoleKey: 'secret' },
  scope: { timeframes: ['5m'] },
  now: new Date('2026-07-01T16:00:00Z'),
  batchSize: 1,
});
assert.equal(dryRun.dryRun, true);
assert.equal(dryRun.productionDeletionPerformed, false);
assert.equal(dryRun.buckets[0].selectedForDelete, 1);
assert.equal(dryClient.rowsRef.rows.length, 5);

const applyClient = new Client(fixtureRows());
const applied = await runMarketBarsRetention({
  client: applyClient,
  config: { userId: 'u1', supabaseUrl: 'https://example.supabase.co', serviceRoleKey: 'secret' },
  apply: true,
  scope: { timeframes: ['5m'] },
  now: new Date('2026-07-01T16:00:00Z'),
  batchSize: 1,
});
assert.equal(applied.productionDeletionPerformed, true);
assert.equal(applied.htfRetentionPolicy, 'ignore_outside_rolling_30_day_window_do_not_delete_htf_rows');
assert.equal(applied.buckets[0].deletedRows, 1);
assert.deepEqual(applyClient.rowsRef.rows.map((row) => row.id).sort(), ['jul1', 'jun2', 'other-tf-old', 'other-user-old']);

const htfApplyClient = new Client(fixtureRows());
const htfApplied = await runMarketBarsRetention({
  client: htfApplyClient,
  config: { userId: 'u1', supabaseUrl: 'https://example.supabase.co', serviceRoleKey: 'secret' },
  apply: true,
  scope: { timeframes: ['15m'] },
  now: new Date('2026-07-01T16:00:00Z'),
  batchSize: 1,
});
assert.equal(htfApplied.productionDeletionPerformed, false);
assert.equal(htfApplied.buckets[0].selectedForDelete, 1);
assert.equal(htfApplied.buckets[0].deletedRows, 0);
assert.ok(htfApplyClient.rowsRef.rows.some((row) => row.id === 'other-tf-old'));

const timeoutClient = new Client(fixtureRows(), true);
const timeoutRun = await runMarketBarsRetention({
  client: timeoutClient,
  config: { userId: 'u1', supabaseUrl: 'https://example.supabase.co', serviceRoleKey: 'secret' },
  apply: true,
  scope: { timeframes: ['5m'] },
  now: new Date('2026-07-01T16:00:00Z'),
});
assert.equal(timeoutRun.riskStatus, 'partial');
assert.equal(timeoutRun.productionDeletionPerformed, false);
assert.match(timeoutRun.errors[0], /timeout/);

console.log('market_bars retention apply/dry-run verified.');
