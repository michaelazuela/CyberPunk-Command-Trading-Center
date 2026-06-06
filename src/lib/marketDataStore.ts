import { supabase } from './supabase';
import type { NinjaBridgeBar } from './ninjaTraderBridge';

export type MarketBarTimeframe = '5m' | '15m' | '60m' | '120m' | '240m';
export type MarketBarsSource = 'market_bars' | 'empty' | 'error';

interface MarketBarRow {
  candle_time_et: string;
  open: number | string;
  high: number | string;
  low: number | string;
  close: number | string;
  volume: number | string | null;
}

export interface MarketBarsCacheResult {
  bars: NinjaBridgeBar[];
  source: MarketBarsSource;
  error?: string;
}

export interface MarketBarsUpsertResult {
  saved: number;
  error?: string;
}

function normalizeMarketBarTime(value: string): string {
  return value
    .replace(/Z$/, '')
    .replace(/[+-]\d{2}:\d{2}$/, '')
    .slice(0, 19);
}

function toNumber(value: number | string | null | undefined): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rowToBar(row: MarketBarRow): NinjaBridgeBar {
  return {
    time: normalizeMarketBarTime(row.candle_time_et),
    open: toNumber(row.open),
    high: toNumber(row.high),
    low: toNumber(row.low),
    close: toNumber(row.close),
    volume: toNumber(row.volume),
  };
}

export async function fetchMarketBarsFromCache({
  bridgeInstrument,
  timeframe,
  from,
  to,
  limit = 5000,
}: {
  bridgeInstrument: string;
  timeframe: MarketBarTimeframe;
  from: string;
  to: string;
  limit?: number;
}): Promise<MarketBarsCacheResult> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (authError || !userId) {
    return { bars: [], source: 'empty', error: authError?.message || 'No authenticated Supabase user.' };
  }

  const { data, error } = await supabase
    .from('market_bars')
    .select('candle_time_et,open,high,low,close,volume')
    .eq('user_id', userId)
    .eq('bridge_instrument', bridgeInstrument)
    .eq('timeframe', timeframe)
    .gte('candle_time_et', normalizeMarketBarTime(from))
    .lte('candle_time_et', normalizeMarketBarTime(to))
    .order('candle_time_et', { ascending: true })
    .limit(limit);

  if (error) return { bars: [], source: 'error', error: error.message };
  const bars = ((data || []) as MarketBarRow[]).map(rowToBar);
  return { bars, source: bars.length ? 'market_bars' : 'empty' };
}

export async function upsertMarketBarsToCache({
  instrument,
  bridgeInstrument,
  timeframe,
  bars,
  metadata = {},
}: {
  instrument: 'MES' | 'MNQ';
  bridgeInstrument: string;
  timeframe: MarketBarTimeframe;
  bars: NinjaBridgeBar[];
  metadata?: Record<string, unknown>;
}): Promise<MarketBarsUpsertResult> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (authError || !userId || !bars.length) {
    return { saved: 0, error: authError?.message || (!userId ? 'No authenticated Supabase user.' : undefined) };
  }

  const rows = bars.map(bar => ({
    user_id: userId,
    instrument,
    bridge_instrument: bridgeInstrument,
    timeframe,
    candle_time_et: normalizeMarketBarTime(bar.time),
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume || 0,
    source: 'ninjatrader_bridge',
    metadata,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('market_bars')
    .upsert(rows, { onConflict: 'user_id,bridge_instrument,timeframe,candle_time_et' });

  return { saved: error ? 0 : rows.length, error: error?.message };
}
