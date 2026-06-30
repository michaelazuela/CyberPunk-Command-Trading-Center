import fs from 'node:fs';
import path from 'node:path';
import { createMarketDataClient, loadMarketDataConfig, normalizeCandleTimeEt, type MarketBarTimeframe, type MarketDataConfig } from './market-data-store';

export const MARKET_BAR_RETENTION_TIMEFRAMES: MarketBarTimeframe[] = ['5m', '15m', '60m', '120m', '240m'];

export interface MarketBarsRetentionClient {
  from(table: string): any;
}

export interface MarketBarsRetentionScope {
  instrument?: string | null;
  bridgeInstrument?: string | null;
  timeframes?: MarketBarTimeframe[];
}

const DEFAULT_QUERY_TIMEOUT_MS = 20_000;

export interface MarketBarsRetentionBucket {
  bridgeInstrument: string;
  timeframe: MarketBarTimeframe;
  totalRows: number | null;
  olderThanRetentionRows: number | null;
  oldestCandleTimeEt: string | null;
  newestCandleTimeEt: string | null;
  errors: string[];
}

export interface MarketBarsRetentionAuditReport {
  reportType: 'market_bars_retention_audit';
  generatedAt: string;
  dryRun: true;
  retentionDays: number;
  cutoffEt: string;
  scope: MarketBarsRetentionScope;
  buckets: MarketBarsRetentionBucket[];
  ioPressureEvidence: string[];
  mutatesData: false;
  boundary: 'market_bars_cache_only_no_trading_logic_changed';
}

export interface MarketBarsRetentionApplyBucket extends MarketBarsRetentionBucket {
  selectedForDelete: number;
  deletedRows: number;
  batches: number;
}

export interface MarketBarsRetentionRunReport {
  reportType: 'market_bars_retention_run';
  generatedAt: string;
  dryRun: boolean;
  retentionDays: number;
  cutoffEt: string;
  batchSize: number;
  scope: MarketBarsRetentionScope;
  buckets: MarketBarsRetentionApplyBucket[];
  errors: string[];
  riskStatus: 'ready' | 'partial' | 'blocked';
  productionDeletionPerformed: boolean;
  boundary: 'market_bars_cache_only_no_trading_logic_changed';
}

export function computeRollingRetentionCutoffEt(now = new Date(), retentionDays = 30): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [year, month, day] = formatter.format(now).split('-').map(Number);
  const cutoffNoonUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  cutoffNoonUtc.setUTCDate(cutoffNoonUtc.getUTCDate() - Math.max(0, retentionDays - 1));
  return `${cutoffNoonUtc.toISOString().slice(0, 10)}T00:00:00`;
}

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && 'message' in error) return String((error as { message?: unknown }).message);
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function isTimeoutMessage(message: string): boolean {
  return /timeout|timed out|statement timeout|upstream request timeout|57014/i.test(message);
}

function scopedQuery(client: MarketBarsRetentionClient, config: MarketDataConfig, scope: MarketBarsRetentionScope, timeframe: MarketBarTimeframe) {
  let query = client
    .from('market_bars')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', config.userId)
    .eq('timeframe', timeframe);
  if (scope.instrument) query = query.eq('instrument', scope.instrument);
  if (scope.bridgeInstrument) query = query.eq('bridge_instrument', scope.bridgeInstrument);
  return query;
}

function withQueryTimeout<T>(query: T, timeoutMs = DEFAULT_QUERY_TIMEOUT_MS): T {
  if (
    typeof AbortSignal !== 'undefined' &&
    query &&
    typeof query === 'object' &&
    'abortSignal' in query &&
    typeof (query as { abortSignal?: unknown }).abortSignal === 'function'
  ) {
    return (query as { abortSignal: (signal: AbortSignal) => T }).abortSignal(AbortSignal.timeout(timeoutMs));
  }
  return query;
}

async function countRows(
  client: MarketBarsRetentionClient,
  config: MarketDataConfig,
  scope: MarketBarsRetentionScope,
  timeframe: MarketBarTimeframe,
  cutoffEt?: string,
): Promise<{ count: number | null; error: string | null }> {
  let query = scopedQuery(client, config, scope, timeframe);
  if (cutoffEt) query = query.lt('candle_time_et', cutoffEt);
  const result = await withQueryTimeout(query);
  return { count: typeof result.count === 'number' ? result.count : null, error: errorMessage(result.error) };
}

async function edgeCandle(
  client: MarketBarsRetentionClient,
  config: MarketDataConfig,
  scope: MarketBarsRetentionScope,
  timeframe: MarketBarTimeframe,
  ascending: boolean,
): Promise<{ bridgeInstrument: string | null; candleTimeEt: string | null; error: string | null }> {
  let query = client
    .from('market_bars')
    .select('bridge_instrument,candle_time_et')
    .eq('user_id', config.userId)
    .eq('timeframe', timeframe);
  if (scope.instrument) query = query.eq('instrument', scope.instrument);
  if (scope.bridgeInstrument) query = query.eq('bridge_instrument', scope.bridgeInstrument);
  const result = await withQueryTimeout(query.order('candle_time_et', { ascending }).limit(1));
  const row = Array.isArray(result.data) ? result.data[0] : null;
  return {
    bridgeInstrument: row?.bridge_instrument || scope.bridgeInstrument || null,
    candleTimeEt: row?.candle_time_et || null,
    error: errorMessage(result.error),
  };
}

function timeframesFromScope(scope: MarketBarsRetentionScope): MarketBarTimeframe[] {
  return scope.timeframes?.length ? scope.timeframes : MARKET_BAR_RETENTION_TIMEFRAMES;
}

export async function buildMarketBarsRetentionAuditReport(args: {
  client: MarketBarsRetentionClient;
  config: MarketDataConfig;
  scope?: MarketBarsRetentionScope;
  now?: Date;
  retentionDays?: number;
}): Promise<MarketBarsRetentionAuditReport> {
  const retentionDays = args.retentionDays || 30;
  const cutoffEt = computeRollingRetentionCutoffEt(args.now || new Date(), retentionDays);
  const scope = args.scope || {};
  const buckets: MarketBarsRetentionBucket[] = [];
  const ioPressureEvidence: string[] = [];

  for (const timeframe of timeframesFromScope(scope)) {
    const [total, older, oldest, newest] = await Promise.all([
      countRows(args.client, args.config, scope, timeframe),
      countRows(args.client, args.config, scope, timeframe, cutoffEt),
      edgeCandle(args.client, args.config, scope, timeframe, true),
      edgeCandle(args.client, args.config, scope, timeframe, false),
    ]);
    const errors = [total.error, older.error, oldest.error, newest.error].filter((item): item is string => Boolean(item));
    for (const item of errors) {
      if (isTimeoutMessage(item)) ioPressureEvidence.push(`${timeframe}: ${item}`);
    }
    buckets.push({
      bridgeInstrument: newest.bridgeInstrument || oldest.bridgeInstrument || scope.bridgeInstrument || 'unknown',
      timeframe,
      totalRows: total.count,
      olderThanRetentionRows: older.count,
      oldestCandleTimeEt: oldest.candleTimeEt,
      newestCandleTimeEt: newest.candleTimeEt,
      errors,
    });
  }

  return {
    reportType: 'market_bars_retention_audit',
    generatedAt: new Date().toISOString(),
    dryRun: true,
    retentionDays,
    cutoffEt,
    scope,
    buckets,
    ioPressureEvidence,
    mutatesData: false,
    boundary: 'market_bars_cache_only_no_trading_logic_changed',
  };
}

async function selectDeleteIds(args: {
  client: MarketBarsRetentionClient;
  config: MarketDataConfig;
  scope: MarketBarsRetentionScope;
  timeframe: MarketBarTimeframe;
  cutoffEt: string;
  batchSize: number;
}): Promise<{ ids: string[]; error: string | null }> {
  let query = args.client
    .from('market_bars')
    .select('id')
    .eq('user_id', args.config.userId)
    .eq('timeframe', args.timeframe)
    .lt('candle_time_et', args.cutoffEt)
    .order('candle_time_et', { ascending: true })
    .limit(args.batchSize);
  if (args.scope.instrument) query = query.eq('instrument', args.scope.instrument);
  if (args.scope.bridgeInstrument) query = query.eq('bridge_instrument', args.scope.bridgeInstrument);
  const result = await withQueryTimeout(query);
  return {
    ids: Array.isArray(result.data) ? result.data.map((row: { id: unknown }) => String(row.id)).filter(Boolean) : [],
    error: errorMessage(result.error),
  };
}

async function deleteIds(args: {
  client: MarketBarsRetentionClient;
  config: MarketDataConfig;
  ids: string[];
}): Promise<{ count: number; error: string | null }> {
  const query = args.client
    .from('market_bars')
    .delete({ count: 'exact' })
    .eq('user_id', args.config.userId)
    .in('id', args.ids);
  const result = await withQueryTimeout(query);
  return {
    count: typeof result.count === 'number' ? result.count : args.ids.length,
    error: errorMessage(result.error),
  };
}

export async function runMarketBarsRetention(args: {
  client: MarketBarsRetentionClient;
  config: MarketDataConfig;
  apply?: boolean;
  scope?: MarketBarsRetentionScope;
  now?: Date;
  retentionDays?: number;
  batchSize?: number;
  maxBatchesPerTimeframe?: number;
}): Promise<MarketBarsRetentionRunReport> {
  const retentionDays = args.retentionDays || 30;
  const cutoffEt = computeRollingRetentionCutoffEt(args.now || new Date(), retentionDays);
  const batchSize = Math.max(1, Math.trunc(args.batchSize || 500));
  const maxBatchesPerTimeframe = Math.max(1, Math.trunc(args.maxBatchesPerTimeframe || 100));
  const scope = args.scope || {};
  const buckets: MarketBarsRetentionApplyBucket[] = [];
  const errors: string[] = [];

  for (const timeframe of timeframesFromScope(scope)) {
    const [total, older, oldest, newest] = await Promise.all([
      countRows(args.client, args.config, scope, timeframe),
      countRows(args.client, args.config, scope, timeframe, cutoffEt),
      edgeCandle(args.client, args.config, scope, timeframe, true),
      edgeCandle(args.client, args.config, scope, timeframe, false),
    ]);
    const bucketErrors = [total.error, older.error, oldest.error, newest.error].filter((item): item is string => Boolean(item));
    let deletedRows = 0;
    let batches = 0;
    if (args.apply && !bucketErrors.length) {
      for (let index = 0; index < maxBatchesPerTimeframe; index += 1) {
        const selected = await selectDeleteIds({ client: args.client, config: args.config, scope, timeframe, cutoffEt, batchSize });
        if (selected.error) {
          bucketErrors.push(selected.error);
          break;
        }
        if (!selected.ids.length) break;
        const deleted = await deleteIds({ client: args.client, config: args.config, ids: selected.ids });
        batches += 1;
        if (deleted.error) {
          bucketErrors.push(deleted.error);
          break;
        }
        deletedRows += deleted.count;
        if (selected.ids.length < batchSize) break;
      }
    }
    errors.push(...bucketErrors.map((item) => `${timeframe}: ${item}`));
    buckets.push({
      bridgeInstrument: newest.bridgeInstrument || oldest.bridgeInstrument || scope.bridgeInstrument || 'unknown',
      timeframe,
      totalRows: total.count,
      olderThanRetentionRows: older.count,
      oldestCandleTimeEt: oldest.candleTimeEt,
      newestCandleTimeEt: newest.candleTimeEt,
      selectedForDelete: older.count || 0,
      deletedRows,
      batches,
      errors: bucketErrors,
    });
    if (bucketErrors.some(isTimeoutMessage)) break;
  }

  return {
    reportType: 'market_bars_retention_run',
    generatedAt: new Date().toISOString(),
    dryRun: !args.apply,
    retentionDays,
    cutoffEt,
    batchSize,
    scope,
    buckets,
    errors,
    riskStatus: errors.length ? 'partial' : 'ready',
    productionDeletionPerformed: Boolean(args.apply && buckets.some((bucket) => bucket.deletedRows > 0)),
    boundary: 'market_bars_cache_only_no_trading_logic_changed',
  };
}

export function parseMarketBarsRetentionScope(argv = process.argv.slice(2)): MarketBarsRetentionScope {
  const value = (name: string): string | null => {
    const direct = argv.indexOf(`--${name}`);
    if (direct >= 0 && argv[direct + 1]) return argv[direct + 1];
    const matched = argv.find((item) => item.startsWith(`--${name}=`));
    return matched ? matched.slice(name.length + 3) : null;
  };
  const timeframe = value('timeframe') as MarketBarTimeframe | null;
  return {
    instrument: value('instrument'),
    bridgeInstrument: value('bridge-instrument'),
    timeframes: timeframe ? [timeframe] : undefined,
  };
}

export function writeRetentionReceipt(report: MarketBarsRetentionRunReport | MarketBarsRetentionAuditReport, dir = path.resolve(process.cwd(), 'tools', 'automation', 'diagnostic-reports')): string {
  fs.mkdirSync(dir, { recursive: true });
  const stamp = report.generatedAt.replace(/[:.]/g, '-');
  const filePath = path.join(dir, `${report.reportType}-${stamp}.json`);
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf8');
  return filePath;
}

export function liveMarketBarsRetentionClient(): { client: MarketBarsRetentionClient; config: MarketDataConfig } {
  const config = loadMarketDataConfig();
  if (!config) throw new Error('market_bars retention tools require SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and DISCORD_RAG_USER_ID.');
  return { client: createMarketDataClient(config), config };
}

export function normalizeRetentionCutoff(value: string): string {
  return normalizeCandleTimeEt(value);
}
