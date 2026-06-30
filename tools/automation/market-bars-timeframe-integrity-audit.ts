import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import {
  buildMarketBarTimeframeIntegrityReport,
  createMarketDataClient,
  loadMarketDataConfig,
  marketBarTimeframeMinutes,
  normalizeCandleTimeEt,
  type MarketBarTimeframe,
} from './market-data-store';
import type { NinjaBridgeBar } from '../../src/lib/ninjaTraderBridge';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

const TIMEFRAMES: MarketBarTimeframe[] = ['5m', '15m', '60m', '120m', '240m'];
const DEFAULT_LIMIT = 12_000;

function argValue(name: string): string | null {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return null;
  return process.argv[index + 1] || null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function parseTimeframes(): MarketBarTimeframe[] {
  const raw = argValue('timeframe');
  if (!raw) return TIMEFRAMES;
  const items = raw.split(',').map((item) => item.trim()).filter(Boolean);
  const valid = items.filter((item): item is MarketBarTimeframe => TIMEFRAMES.includes(item as MarketBarTimeframe));
  return valid.length ? valid : TIMEFRAMES;
}

function defaultFromEt(now = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [year, month, day] = formatter.format(now).split('-').map(Number);
  const base = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  base.setUTCDate(base.getUTCDate() - 30);
  return `${base.toISOString().slice(0, 10)}T00:00:00`;
}

function defaultToEt(now = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return `${formatter.format(now)}T23:59:59`;
}

async function fetchRows(args: {
  client: ReturnType<typeof createMarketDataClient>;
  userId: string;
  bridgeInstrument: string | null;
  timeframe: MarketBarTimeframe;
  fromEt: string;
  toEt: string;
  limit: number;
}): Promise<{ bars: NinjaBridgeBar[]; errors: string[] }> {
  const pageSize = 1000;
  const rows: any[] = [];
  const errors: string[] = [];
  for (let from = 0; from < args.limit; from += pageSize) {
    const to = Math.min(from + pageSize - 1, args.limit - 1);
    let query = args.client
      .from('market_bars')
      .select('candle_time_et,open,high,low,close,volume')
      .eq('user_id', args.userId)
      .eq('timeframe', args.timeframe)
      .gte('candle_time_et', args.fromEt)
      .lte('candle_time_et', args.toEt)
      .order('candle_time_et', { ascending: true })
      .range(from, to);
    if (args.bridgeInstrument) query = query.eq('bridge_instrument', args.bridgeInstrument);
    const result = await query;
    if (result.error) {
      errors.push(String(result.error.message || result.error));
      break;
    }
    const page = result.data || [];
    rows.push(...page);
    if (page.length < to - from + 1) break;
  }
  return {
    bars: rows.map((row: any) => ({
      time: String(row.candle_time_et),
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: Number(row.volume || 0),
    })),
    errors,
  };
}

function writeReceipt(report: Record<string, unknown>): string {
  const dir = path.resolve('tools', 'automation', 'diagnostic-reports');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const receiptPath = path.join(dir, `market_bars_timeframe_integrity-${stamp}.json`);
  fs.writeFileSync(receiptPath, JSON.stringify(report, null, 2));
  return receiptPath;
}

async function main() {
  const config = loadMarketDataConfig();
  if (!config) throw new Error('Missing Supabase market data config. Expected SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and DISCORD_RAG_USER_ID.');
  const bridgeInstrument = argValue('bridge-instrument');
  const fromEt = normalizeCandleTimeEt(argValue('from') || defaultFromEt());
  const toEt = normalizeCandleTimeEt(argValue('to') || defaultToEt());
  const limit = Math.max(1, Math.trunc(Number(argValue('limit') || DEFAULT_LIMIT)));
  const client = createMarketDataClient(config);
  const buckets = [];
  const errors: string[] = [];

  for (const timeframe of parseTimeframes()) {
    const fetched = await fetchRows({
      client,
      userId: config.userId,
      bridgeInstrument,
      timeframe,
      fromEt,
      toEt,
      limit,
    });
    errors.push(...fetched.errors.map((error) => `${timeframe}: ${error}`));
    buckets.push({
      bridgeInstrument: bridgeInstrument || 'all',
      timeframe,
      ...buildMarketBarTimeframeIntegrityReport(fetched.bars, timeframe),
      errors: fetched.errors,
    });
  }

  const riskStatus = errors.length
    ? 'partial'
    : buckets.every((bucket) => bucket.valid)
      ? 'ready'
      : 'blocked';
  const report = {
    reportType: 'market_bars_timeframe_integrity_audit',
    generatedAt: new Date().toISOString(),
    dryRun: true,
    scope: {
      bridgeInstrument,
      fromEt,
      toEt,
      timeframes: parseTimeframes(),
      limit,
    },
    buckets,
    errors,
    riskStatus,
    mutatesData: false,
    boundary: 'market_bars_cache_integrity_only_no_trading_logic_changed',
  };
  const receiptPath = writeReceipt(report);

  if (hasFlag('json')) {
    console.log(JSON.stringify({ ...report, receiptPath }, null, 2));
    return;
  }
  console.log(`market_bars timeframe integrity audit complete. riskStatus=${riskStatus} receipt=${receiptPath}`);
  for (const bucket of buckets) {
    console.log(`${bucket.timeframe}: rows=${bucket.rows} valid=${bucket.valid} oldest=${bucket.oldestCandleTimeEt || 'unknown'} newest=${bucket.newestCandleTimeEt || 'unknown'} intervals=${JSON.stringify(bucket.observedIntervalMinutes)}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
