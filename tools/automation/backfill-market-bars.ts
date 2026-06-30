import dotenv from 'dotenv';
import { getNinjaHistoricalBars } from '../../src/lib/ninjaTraderBridge';
import { fetchRawCachedMarketBars, loadMarketDataConfig, upsertMarketBars, type MarketBarTimeframe } from './market-data-store';
import { resolveCurrentBridgeInstrument } from './bridge-instrument-resolver';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

type Instrument = 'MES' | 'MNQ';

const TIMEFRAMES: MarketBarTimeframe[] = ['5m', '15m', '60m', '120m', '240m'];

const MINIMUM_DAILY_CACHE_BARS: Record<MarketBarTimeframe, number> = {
  '5m': 200,
  '15m': 60,
  '60m': 18,
  '120m': 8,
  '240m': 4,
};

export function shouldSkipBackfillForCachedBars(args: {
  timeframe: MarketBarTimeframe;
  cachedBars: Array<{ time: string }>;
}): boolean {
  return args.cachedBars.length >= MINIMUM_DAILY_CACHE_BARS[args.timeframe];
}

function errorLooksLikeIoPressure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /timeout|timed out|statement timeout|upstream request timeout|57014/i.test(message);
}

function argValue(name: string): string | null {
  const prefix = `--${name}=`;
  const directIndex = process.argv.indexOf(`--${name}`);
  if (directIndex >= 0 && process.argv[directIndex + 1]) return process.argv[directIndex + 1];
  const matched = process.argv.find((arg) => arg.startsWith(prefix));
  return matched ? matched.slice(prefix.length) : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(dateText: string, days: number): string {
  const date = new Date(`${dateText}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDate(date);
}

function buildDates(): string[] {
  const explicitFrom = argValue('from');
  const explicitTo = argValue('to');
  const days = Math.max(1, Math.min(1000, Number(argValue('days') || '1000')));
  const end = explicitTo || isoDate(new Date());

  let start = explicitFrom;
  if (!start) {
    const startDate = new Date(`${end}T12:00:00Z`);
    startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
    start = isoDate(startDate);
  }

  const dates: string[] = [];
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    dates.push(cursor);
  }
  return dates;
}

function previousDate(dateText: string): string {
  return addDays(dateText, -1);
}

function etDateTime(dateText: string, time: string): string {
  return `${dateText}T${time}:00-04:00`;
}

async function main() {
  const bridgeUrl = argValue('bridge-url') || process.env.NINJATRADER_BRIDGE_URL || 'http://127.0.0.1:8765';
  const instrument = ((argValue('instrument') || 'MES') as Instrument);
  let bridgeInstrument = argValue('bridge-instrument') || process.env.NINJATRADER_BRIDGE_INSTRUMENT || instrument;
  const delayMs = Math.max(0, Number(argValue('delay-ms') || '250'));
  const config = loadMarketDataConfig();
  if (!config) {
    throw new Error('Market backfill requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and DISCORD_RAG_USER_ID in .env.local.');
  }

  const instrumentResolution = await resolveCurrentBridgeInstrument({
    bridgeUrl,
    appInstrument: instrument,
    requestedBridgeInstrument: bridgeInstrument,
  });
  bridgeInstrument = instrumentResolution.instrument;
  if (instrumentResolution.warning) console.warn(`[backfill] ${instrumentResolution.warning}`);

  const dates = buildDates();
  console.log(`Quant Desk market backfill: ${dates.length} trade date(s), ${bridgeInstrument}, ${TIMEFRAMES.join(', ')}.`);
  console.log('Backfill range uses prior 18:00 ET through trade date 17:00 ET to cover ETH plus RTH context.');

  let total = 0;
  for (const tradeDate of dates) {
    const prior = previousDate(tradeDate);
    const from = etDateTime(prior, '18:00');
    const to = etDateTime(tradeDate, '17:00');

    for (const timeframe of TIMEFRAMES) {
      try {
        const cachedBars = await fetchRawCachedMarketBars({
          instrument: bridgeInstrument,
          timeframe,
          from,
          to,
          config,
          limit: 5000,
        });
        if (shouldSkipBackfillForCachedBars({ timeframe, cachedBars })) {
          console.log(`[backfill] ${tradeDate} ${timeframe}: skipped; cache coverage already sufficient (${cachedBars.length} bars).`);
          continue;
        }
        const response = await getNinjaHistoricalBars({
          instrument: bridgeInstrument,
          timeframe,
          from,
          to,
          limit: 5000,
          baseUrl: bridgeUrl,
        });
        if (!response.ok || !response.bars?.length) {
          console.warn(`[backfill] ${tradeDate} ${timeframe}: no bars returned.`);
          continue;
        }
        const result = await upsertMarketBars({
          bars: response.bars,
          instrument,
          bridgeInstrument,
          timeframe,
          config,
        });
        total += result.upserted;
        console.log(`[backfill] ${tradeDate} ${timeframe}: upserted ${result.upserted}.`);
      } catch (error) {
        console.warn(`[backfill] ${tradeDate} ${timeframe}: ${error instanceof Error ? error.message : String(error)}`);
        if (errorLooksLikeIoPressure(error)) {
          console.warn('[backfill] IO pressure detected; stopping backfill early to avoid hammering Supabase.');
          console.log(`[backfill] partial complete: ${total} bars processed.`);
          return;
        }
      }
      if (delayMs > 0) await sleep(delayMs);
    }
  }

  console.log(`[backfill] complete: ${total} bars processed.`);
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tools/automation/backfill-market-bars.ts')) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
