import dotenv from 'dotenv';
import { getNinjaBridgeBars, getNinjaHistoricalBars } from '../../src/lib/ninjaTraderBridge';
import { assessBridgeBarStaleness, latestCompletedBar, type BridgeTimestampMode, type BridgeTimeZoneMode } from '../../src/lib/localScannerEngine';
import { loadMarketDataConfig, upsertMarketBars, type MarketBarTimeframe } from './market-data-store';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

type Instrument = 'MES' | 'MNQ';

const TIMEFRAMES: MarketBarTimeframe[] = ['5m', '15m', '60m', '240m'];

function argValue(name: string): string | null {
  const prefix = `--${name}=`;
  const directIndex = process.argv.indexOf(`--${name}`);
  if (directIndex >= 0 && process.argv[directIndex + 1]) return process.argv[directIndex + 1];
  const matched = process.argv.find((arg) => arg.startsWith(prefix));
  return matched ? matched.slice(prefix.length) : null;
}

function hasArg(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function numberArg(name: string, fallback: number): number {
  const raw = argValue(name);
  if (raw === null) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function timeframeMinutes(timeframe: MarketBarTimeframe): number {
  if (timeframe === '60m') return 60;
  if (timeframe === '240m') return 240;
  return Number(timeframe.replace('m', '')) || 5;
}

function recentHistoricalWindow(timeframe: MarketBarTimeframe, limit: number): { from: string; to: string } {
  const minutes = timeframeMinutes(timeframe);
  const to = new Date();
  const lookbackMinutes =
    timeframe === '5m'
      ? 120
      : Math.max(90, minutes * Math.max(limit, 40) * 1.25);
  const from = new Date(to.getTime() - lookbackMinutes * 60_000);
  return { from: from.toISOString(), to: to.toISOString() };
}

async function fetchRecorderBars(args: {
  bridgeUrl: string;
  bridgeInstrument: string;
  timeframe: MarketBarTimeframe;
  limit: number;
  maxStaleBarMinutes: number;
  barTimestampMode: BridgeTimestampMode;
  barTimeZone: BridgeTimeZoneMode;
}) {
  const response = await getNinjaBridgeBars(args.bridgeInstrument, args.timeframe, args.limit, args.bridgeUrl);
  const cachedBars = response.ok ? response.bars || [] : [];
  if (args.timeframe !== '5m') return cachedBars;

  const freshness = assessBridgeBarStaleness({
    latestBar: latestCompletedBar(cachedBars, 5, new Date(), args.barTimestampMode, args.barTimeZone),
    timeframeMinutes: 5,
    maxStaleBarMinutes: args.maxStaleBarMinutes,
    timestampMode: args.barTimestampMode,
    timeZoneMode: args.barTimeZone,
  });
  if (!freshness.stale) return cachedBars;

  const window = recentHistoricalWindow(args.timeframe, args.limit);
  const historical = await getNinjaHistoricalBars({
    instrument: args.bridgeInstrument,
    timeframe: args.timeframe,
    from: window.from,
    to: window.to,
    limit: args.limit,
    baseUrl: args.bridgeUrl,
  });
  if (!historical.ok || !historical.bars?.length) {
    console.warn(`[market-cache] ${args.timeframe}: live cache stale and historical repair returned no bars: ${historical.error || 'unknown error'}`);
    return cachedBars;
  }

  const repairedFreshness = assessBridgeBarStaleness({
    latestBar: latestCompletedBar(historical.bars, 5, new Date(), args.barTimestampMode, args.barTimeZone),
    timeframeMinutes: 5,
    maxStaleBarMinutes: args.maxStaleBarMinutes,
    timestampMode: args.barTimestampMode,
    timeZoneMode: args.barTimeZone,
  });
  if (repairedFreshness.stale) {
    console.warn(`[market-cache] ${args.timeframe}: historical repair still stale: ${repairedFreshness.reason}`);
    return cachedBars;
  }

  console.log(`[market-cache] ${args.timeframe}: repaired stale live cache with ${historical.bars.length} recent historical bars.`);
  return historical.bars;
}

async function recordOnce({
  bridgeUrl,
  instrument,
  bridgeInstrument,
  limit,
  maxStaleBarMinutes,
  barTimestampMode,
  barTimeZone,
}: {
  bridgeUrl: string;
  instrument: Instrument;
  bridgeInstrument: string;
  limit: number;
  maxStaleBarMinutes: number;
  barTimestampMode: BridgeTimestampMode;
  barTimeZone: BridgeTimeZoneMode;
}) {
  const config = loadMarketDataConfig();
  if (!config) {
    throw new Error('Market candle recorder requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and DISCORD_RAG_USER_ID in .env.local.');
  }

  const fiveMinuteBars = await fetchRecorderBars({ bridgeUrl, bridgeInstrument, timeframe: '5m', limit, maxStaleBarMinutes, barTimestampMode, barTimeZone });
  const latest5m = latestCompletedBar(fiveMinuteBars, 5, new Date(), barTimestampMode, barTimeZone);
  const freshness = assessBridgeBarStaleness({
    latestBar: latest5m,
    timeframeMinutes: 5,
    maxStaleBarMinutes,
    timestampMode: barTimestampMode,
    timeZoneMode: barTimeZone,
  });
  if (freshness.stale) {
    console.warn(`[market-cache] stale bridge data: ${freshness.reason}`);
    return 0;
  }

  let total = 0;
  for (const timeframe of TIMEFRAMES) {
    const bars = timeframe === '5m'
      ? fiveMinuteBars
      : await fetchRecorderBars({ bridgeUrl, bridgeInstrument, timeframe, limit, maxStaleBarMinutes, barTimestampMode, barTimeZone });
    if (!bars.length) {
      console.warn(`[market-cache] ${timeframe}: no bars returned from bridge.`);
      continue;
    }
    const result = await upsertMarketBars({
      bars,
      instrument,
      bridgeInstrument,
      timeframe,
      config,
    });
    total += result.upserted;
    console.log(`[market-cache] ${timeframe}: upserted ${result.upserted} bars.`);
  }
  return total;
}

async function main() {
  const bridgeUrl = argValue('bridge-url') || process.env.NINJATRADER_BRIDGE_URL || 'http://127.0.0.1:8765';
  const instrument = ((argValue('instrument') || 'MES') as Instrument);
  const bridgeInstrument = argValue('bridge-instrument') || 'MES 06-26';
  const pollSeconds = Number(argValue('poll-seconds') || '60');
  const limit = Math.max(10, Math.min(450, Number(argValue('limit') || '120')));
  const maxStaleBarMinutes = numberArg('max-stale-bar-minutes', 10);
  const timestampModeArg = argValue('bar-timestamp-mode') || process.env.NINJATRADER_BAR_TIMESTAMP_MODE || 'close';
  const barTimestampMode: BridgeTimestampMode = timestampModeArg === 'open' ? 'open' : 'close';
  const timeZoneArg = argValue('bar-time-zone') || process.env.NINJATRADER_BAR_TIME_ZONE || 'eastern';
  const barTimeZone: BridgeTimeZoneMode = ['eastern', 'central', 'pacific', 'local'].includes(timeZoneArg)
    ? (timeZoneArg as BridgeTimeZoneMode)
    : 'eastern';
  const once = hasArg('once');

  console.log('Quant Desk NinjaTrader candle recorder started.');
  console.log(`Bridge: ${bridgeUrl} | Instrument: ${bridgeInstrument} | Timeframes: ${TIMEFRAMES.join(', ')} | Bar time: ${barTimeZone}/${barTimestampMode}`);

  do {
    try {
      const total = await recordOnce({ bridgeUrl, instrument, bridgeInstrument, limit, maxStaleBarMinutes, barTimestampMode, barTimeZone });
      console.log(`[market-cache] cycle complete: ${total} bars processed at ${new Date().toISOString()}.`);
    } catch (error) {
      console.error('[market-cache] recorder error:', formatError(error));
    }
    if (!once) await sleep(Math.max(5, pollSeconds) * 1000);
  } while (!once);
}

main().catch((error) => {
  console.error(formatError(error));
  process.exitCode = 1;
});
