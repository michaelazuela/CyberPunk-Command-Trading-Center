import dotenv from 'dotenv';
import { getNinjaBridgeBars } from '../../src/lib/ninjaTraderBridge';
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

async function recordOnce({
  bridgeUrl,
  instrument,
  bridgeInstrument,
  limit,
}: {
  bridgeUrl: string;
  instrument: Instrument;
  bridgeInstrument: string;
  limit: number;
}) {
  const config = loadMarketDataConfig();
  if (!config) {
    throw new Error('Market candle recorder requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and DISCORD_RAG_USER_ID in .env.local.');
  }

  let total = 0;
  for (const timeframe of TIMEFRAMES) {
    const response = await getNinjaBridgeBars(bridgeInstrument, timeframe, limit, bridgeUrl);
    if (!response.ok || !response.bars?.length) {
      console.warn(`[market-cache] ${timeframe}: no bars returned from bridge.`);
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
    console.log(`[market-cache] ${timeframe}: upserted ${result.upserted} bars.`);
  }
  return total;
}

async function main() {
  const bridgeUrl = argValue('bridge-url') || process.env.NINJATRADER_BRIDGE_URL || 'http://127.0.0.1:8765';
  const instrument = ((argValue('instrument') || 'MES') as Instrument);
  const bridgeInstrument = argValue('bridge-instrument') || 'MES 06-26';
  const pollSeconds = Number(argValue('poll-seconds') || '30');
  const limit = Math.max(10, Math.min(450, Number(argValue('limit') || '120')));
  const once = hasArg('once');

  console.log('Quant Desk NinjaTrader candle recorder started.');
  console.log(`Bridge: ${bridgeUrl} | Instrument: ${bridgeInstrument} | Timeframes: ${TIMEFRAMES.join(', ')}`);

  do {
    try {
      const total = await recordOnce({ bridgeUrl, instrument, bridgeInstrument, limit });
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
