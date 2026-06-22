import dotenv from 'dotenv';
import { getNinjaHistoricalBars, type NinjaBridgeBar } from '../../src/lib/ninjaTraderBridge';
import {
  countMarketBarTimeframeIntervalMismatches,
  deleteMarketBarsRange,
  fetchRawCachedMarketBars,
  loadMarketDataConfig,
  normalizeCandleTimeEt,
  upsertMarketBars,
  type MarketBarTimeframe,
} from './market-data-store';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

type Instrument = 'MES' | 'MNQ';

const TARGET_TIMEFRAMES: MarketBarTimeframe[] = ['15m', '60m', '120m', '240m'];

function argValue(name: string): string | null {
  const prefix = `--${name}=`;
  const directIndex = process.argv.indexOf(`--${name}`);
  if (directIndex >= 0 && process.argv[directIndex + 1]) return process.argv[directIndex + 1];
  const matched = process.argv.find((arg) => arg.startsWith(prefix));
  return matched ? matched.slice(prefix.length) : null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function timeframeMinutes(timeframe: MarketBarTimeframe): number {
  if (timeframe === '60m') return 60;
  if (timeframe === '120m') return 120;
  if (timeframe === '240m') return 240;
  return Number(timeframe.replace('m', '')) || 5;
}

function parseEtParts(value: string): { date: string; hour: number; minute: number; second: number } | null {
  const normalized = normalizeCandleTimeEt(value);
  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  return {
    date: match[1],
    hour: Number(match[2]),
    minute: Number(match[3]),
    second: Number(match[4] || 0),
  };
}

function etWallClockMs(value: string): number | null {
  const parts = parseEtParts(value);
  if (!parts) return null;
  return Date.UTC(
    Number(parts.date.slice(0, 4)),
    Number(parts.date.slice(5, 7)) - 1,
    Number(parts.date.slice(8, 10)),
    parts.hour,
    parts.minute,
    parts.second,
  );
}

function etFromWallClockMs(ms: number): string {
  const date = new Date(ms);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}T${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}:00`;
}

function targetBucketStartEt(value: string, timeframe: MarketBarTimeframe): string | null {
  const parts = parseEtParts(value);
  if (!parts) return null;
  const minutes = timeframeMinutes(timeframe);
  const minuteOfDay = parts.hour * 60 + parts.minute;
  const bucketMinute = Math.floor(minuteOfDay / minutes) * minutes;
  return `${parts.date}T${String(Math.floor(bucketMinute / 60)).padStart(2, '0')}:${String(bucketMinute % 60).padStart(2, '0')}:00`;
}

function sortBars(bars: NinjaBridgeBar[]): NinjaBridgeBar[] {
  return [...bars]
    .filter((bar) => etWallClockMs(bar.time) !== null)
    .sort((a, b) => (etWallClockMs(a.time) || 0) - (etWallClockMs(b.time) || 0));
}

export function aggregateFiveMinuteBarsToTimeframe(bars: NinjaBridgeBar[], targetTimeframe: MarketBarTimeframe): NinjaBridgeBar[] {
  if (targetTimeframe === '5m') return sortBars(bars);
  const buckets = new Map<string, NinjaBridgeBar[]>();
  for (const bar of sortBars(bars)) {
    const bucket = targetBucketStartEt(bar.time, targetTimeframe);
    if (!bucket) continue;
    const list = buckets.get(bucket) || [];
    list.push(bar);
    buckets.set(bucket, list);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, bucketBars]) => {
      const ordered = sortBars(bucketBars);
      return {
        time,
        open: ordered[0].open,
        high: Math.max(...ordered.map((bar) => bar.high)),
        low: Math.min(...ordered.map((bar) => bar.low)),
        close: ordered[ordered.length - 1].close,
        volume: ordered.reduce((sum, bar) => sum + (Number(bar.volume) || 0), 0),
      };
    });
}

export function repairTimeframeRowsPlan(args: {
  rawTargetBars: NinjaBridgeBar[];
  sourceFiveMinuteBars: NinjaBridgeBar[];
  targetTimeframe: MarketBarTimeframe;
  from: string;
  to: string;
}): {
  rawTargetRows: number;
  rawTargetIntervalMismatches: number;
  sourceFiveMinuteRows: number;
  rebuiltRows: number;
  rebuiltIntervalMismatches: number;
  rebuiltFirst: string | null;
  rebuiltLast: string | null;
  rowsInRepairWindow: number;
} {
  const fromMs = etWallClockMs(args.from);
  const toMs = etWallClockMs(args.to);
  const rebuilt = aggregateFiveMinuteBarsToTimeframe(args.sourceFiveMinuteBars, args.targetTimeframe)
    .filter((bar) => {
      const ms = etWallClockMs(bar.time);
      return ms !== null && fromMs !== null && toMs !== null && ms >= fromMs && ms <= toMs;
    });
  const rawTargetIntervalMismatches = countMarketBarTimeframeIntervalMismatches(args.rawTargetBars, args.targetTimeframe);
  const rebuiltIntervalMismatches = countMarketBarTimeframeIntervalMismatches(rebuilt, args.targetTimeframe);
  return {
    rawTargetRows: args.rawTargetBars.length,
    rawTargetIntervalMismatches,
    sourceFiveMinuteRows: args.sourceFiveMinuteBars.length,
    rebuiltRows: rebuilt.length,
    rebuiltIntervalMismatches,
    rebuiltFirst: rebuilt[0]?.time || null,
    rebuiltLast: rebuilt[rebuilt.length - 1]?.time || null,
    rowsInRepairWindow: rebuilt.length,
  };
}

async function loadTrustedFiveMinuteBars(args: {
  bridgeInstrument: string;
  bridgeUrl: string;
  from: string;
  to: string;
  limit: number;
}): Promise<NinjaBridgeBar[]> {
  const response = await getNinjaHistoricalBars({
    instrument: args.bridgeInstrument,
    timeframe: '5m',
    from: args.from,
    to: args.to,
    limit: args.limit,
    baseUrl: args.bridgeUrl,
  });
  if (!response.ok || !response.bars?.length) {
    throw new Error(`Trusted 5M bridge history unavailable: ${response.error || 'no bars returned'}`);
  }
  const mismatches = countMarketBarTimeframeIntervalMismatches(response.bars, '5m');
  if (mismatches > 0) {
    throw new Error(`Trusted 5M bridge history is malformed: ${mismatches} interval mismatch(es).`);
  }
  return response.bars;
}

function assertTargetTimeframe(value: string): MarketBarTimeframe {
  const timeframe = value as MarketBarTimeframe;
  if (!TARGET_TIMEFRAMES.includes(timeframe)) {
    throw new Error(`--target-timeframe must be one of ${TARGET_TIMEFRAMES.join(', ')}.`);
  }
  return timeframe;
}

async function main() {
  const config = loadMarketDataConfig();
  if (!config) throw new Error('Repair requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and DISCORD_RAG_USER_ID in .env.local.');

  const instrument = ((argValue('instrument') || 'MES').toUpperCase() as Instrument);
  if (instrument !== 'MES' && instrument !== 'MNQ') throw new Error('--instrument must be MES or MNQ.');
  const bridgeInstrument = argValue('bridge-instrument') || process.env.NINJATRADER_BRIDGE_INSTRUMENT || `${instrument} 09-26`;
  const bridgeUrl = argValue('bridge-url') || process.env.NINJATRADER_BRIDGE_URL || 'http://127.0.0.1:8765';
  const targetTimeframe = assertTargetTimeframe(argValue('target-timeframe') || '120m');
  const from = argValue('from') || '2026-05-22T00:00:00-04:00';
  const to = argValue('to') || '2026-06-21T23:59:00-04:00';
  const limit = Math.max(100, Math.trunc(Number(argValue('limit') || '20000')));
  const apply = hasFlag('apply');

  const rawTargetBars = await fetchRawCachedMarketBars({
    instrument: bridgeInstrument,
    timeframe: targetTimeframe,
    from,
    to,
    config,
    limit,
  });
  const sourceFiveMinuteBars = await loadTrustedFiveMinuteBars({ bridgeInstrument, bridgeUrl, from, to, limit });
  const rebuilt = aggregateFiveMinuteBarsToTimeframe(sourceFiveMinuteBars, targetTimeframe).filter((bar) => {
    const ms = etWallClockMs(bar.time);
    const fromMs = etWallClockMs(from);
    const toMs = etWallClockMs(to);
    return ms !== null && fromMs !== null && toMs !== null && ms >= fromMs && ms <= toMs;
  });
  const plan = repairTimeframeRowsPlan({
    rawTargetBars,
    sourceFiveMinuteBars,
    targetTimeframe,
    from,
    to,
  });

  console.log(JSON.stringify({
    reportType: 'market_bars_timeframe_repair',
    mode: apply ? 'apply' : 'dry_run',
    instrument,
    bridgeInstrument,
    targetTimeframe,
    sourceTimeframe: '5m',
    from: normalizeCandleTimeEt(from),
    to: normalizeCandleTimeEt(to),
    ...plan,
    boundary: 'market_data_cache_repair_only_no_trading_logic_changed',
  }, null, 2));

  if (plan.rebuiltRows === 0) throw new Error('Repair aborted: rebuilt row count is zero.');
  if (plan.rebuiltIntervalMismatches > 0) throw new Error(`Repair aborted: rebuilt ${targetTimeframe} rows are malformed.`);

  if (!apply) {
    console.log('[repair] Dry-run only. Re-run with --apply to delete and replace target timeframe rows.');
    return;
  }

  const deleted = await deleteMarketBarsRange({
    instrument: bridgeInstrument,
    timeframe: targetTimeframe,
    from,
    to,
    config,
  });
  const upserted = await upsertMarketBars({
    bars: rebuilt,
    instrument,
    bridgeInstrument,
    timeframe: targetTimeframe,
    config,
  });
  const verified = await fetchRawCachedMarketBars({
    instrument: bridgeInstrument,
    timeframe: targetTimeframe,
    from,
    to,
    config,
    limit,
  });
  const verifiedMismatches = countMarketBarTimeframeIntervalMismatches(verified, targetTimeframe);
  console.log(JSON.stringify({
    action: 'repair_applied',
    deleted: deleted.deleted,
    upserted: upserted.upserted,
    verifiedRows: verified.length,
    verifiedIntervalMismatches: verifiedMismatches,
  }, null, 2));
  if (verifiedMismatches > 0) throw new Error(`Repair verification failed: ${verifiedMismatches} interval mismatch(es) remain.`);
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tools/automation/repair-market-bars-timeframe.ts')) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
