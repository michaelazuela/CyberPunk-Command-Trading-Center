import { createClient } from '@supabase/supabase-js';
import type { NinjaBridgeBar } from '../../src/lib/ninjaTraderBridge';

export type MarketBarTimeframe = '5m' | '15m' | '60m' | '120m' | '240m';

export interface MarketDataConfig {
  userId: string;
  supabaseUrl: string;
  serviceRoleKey: string;
}

export interface MarketBarRecord {
  user_id: string;
  instrument: string;
  bridge_instrument: string;
  timeframe: MarketBarTimeframe;
  candle_time_et: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  source: string;
  metadata: Record<string, unknown>;
}

export interface MarketDataGapEventRecord {
  user_id: string;
  instrument: string;
  bridge_instrument: string;
  timeframe: MarketBarTimeframe;
  requested_from_et: string;
  requested_to_et: string;
  range_start_et: string | null;
  range_end_et: string | null;
  bars_loaded: number;
  cache_bars: number;
  bridge_repair_bars: number;
  source: string;
  status: 'open' | 'resolved' | 'ignored';
  data_limitation_message: string | null;
  operator_action: string | null;
  metadata: Record<string, unknown>;
}

function cleanSupabaseUrl(value: string): string {
  return value.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
}

export function loadMarketDataConfig(): MarketDataConfig | null {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const userId = process.env.DISCORD_RAG_USER_ID || '';
  if (!supabaseUrl || !serviceRoleKey || !userId) return null;
  return {
    userId,
    supabaseUrl: cleanSupabaseUrl(supabaseUrl),
    serviceRoleKey,
  };
}

export function createMarketDataClient(config: MarketDataConfig) {
  return createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizeCandleTimeEt(value: string): string {
  const trimmed = String(value || '').trim();
  if (!trimmed) return trimmed;
  const withoutFraction = trimmed.replace(/\.\d+/, '');
  const withoutOffset = withoutFraction.replace(/(?:Z|[+-]\d{2}:\d{2})$/, '');
  return withoutOffset.slice(0, 19);
}

function isFinitePrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function toMarketBarRecords({
  bars,
  userId,
  instrument,
  bridgeInstrument,
  timeframe,
}: {
  bars: NinjaBridgeBar[];
  userId: string;
  instrument: string;
  bridgeInstrument: string;
  timeframe: MarketBarTimeframe;
}): MarketBarRecord[] {
  return bars
    .filter((bar) => isFinitePrice(bar.open) && isFinitePrice(bar.high) && isFinitePrice(bar.low) && isFinitePrice(bar.close))
    .map((bar) => ({
      user_id: userId,
      instrument,
      bridge_instrument: bridgeInstrument,
      timeframe,
      candle_time_et: normalizeCandleTimeEt(bar.time),
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: Number.isFinite(Number(bar.volume)) ? Number(bar.volume) : 0,
      source: 'ninjatrader_bridge',
      metadata: {
        rawTime: bar.time,
        recorder: 'quant_desk_market_cache',
      },
    }))
    .filter((row) => Boolean(row.candle_time_et));
}

export async function upsertMarketBars({
  bars,
  instrument,
  bridgeInstrument,
  timeframe,
  config,
}: {
  bars: NinjaBridgeBar[];
  instrument: string;
  bridgeInstrument: string;
  timeframe: MarketBarTimeframe;
  config: MarketDataConfig;
}): Promise<{ upserted: number }> {
  const records = toMarketBarRecords({
    bars,
    userId: config.userId,
    instrument,
    bridgeInstrument,
    timeframe,
  });
  if (!records.length) return { upserted: 0 };

  const supabase = createMarketDataClient(config);
  const { error } = await supabase
    .from('market_bars')
    .upsert(records, {
      onConflict: 'user_id,bridge_instrument,timeframe,candle_time_et',
      ignoreDuplicates: false,
    });

  if (error) throw error;
  return { upserted: records.length };
}

export function toMarketDataGapEventRecord({
  userId,
  instrument,
  bridgeInstrument,
  timeframe,
  requestedFrom,
  requestedTo,
  rangeStart,
  rangeEnd,
  barsLoaded,
  cacheBars,
  bridgeRepairBars,
  source,
  dataLimitationMessage,
  operatorAction,
  metadata = {},
}: {
  userId: string;
  instrument: string;
  bridgeInstrument: string;
  timeframe: MarketBarTimeframe;
  requestedFrom: string;
  requestedTo: string;
  rangeStart: string | null;
  rangeEnd: string | null;
  barsLoaded: number;
  cacheBars: number;
  bridgeRepairBars: number;
  source: string;
  dataLimitationMessage: string | null;
  operatorAction: string | null;
  metadata?: Record<string, unknown>;
}): MarketDataGapEventRecord {
  return {
    user_id: userId,
    instrument,
    bridge_instrument: bridgeInstrument,
    timeframe,
    requested_from_et: normalizeCandleTimeEt(requestedFrom),
    requested_to_et: normalizeCandleTimeEt(requestedTo),
    range_start_et: rangeStart ? normalizeCandleTimeEt(rangeStart) : null,
    range_end_et: rangeEnd ? normalizeCandleTimeEt(rangeEnd) : null,
    bars_loaded: Math.max(0, Math.trunc(Number(barsLoaded) || 0)),
    cache_bars: Math.max(0, Math.trunc(Number(cacheBars) || 0)),
    bridge_repair_bars: Math.max(0, Math.trunc(Number(bridgeRepairBars) || 0)),
    source,
    status: 'open',
    data_limitation_message: dataLimitationMessage,
    operator_action: operatorAction,
    metadata,
  };
}

export async function upsertMarketDataGapEvent({
  config,
  record,
}: {
  config: MarketDataConfig;
  record: MarketDataGapEventRecord;
}): Promise<{ upserted: number }> {
  const supabase = createMarketDataClient(config);
  const { error } = await supabase
    .from('market_data_gap_events')
    .upsert({
      ...record,
      user_id: config.userId,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,bridge_instrument,timeframe,requested_from_et,requested_to_et',
      ignoreDuplicates: false,
    });

  if (error) throw error;
  return { upserted: 1 };
}

export async function fetchCachedMarketBars({
  instrument,
  timeframe,
  from,
  to,
  config,
  limit = 5000,
}: {
  instrument: string;
  timeframe: MarketBarTimeframe;
  from: string;
  to: string;
  config: MarketDataConfig;
  limit?: number;
}): Promise<NinjaBridgeBar[]> {
  const supabase = createMarketDataClient(config);
  const fromEt = normalizeCandleTimeEt(from);
  const toEt = normalizeCandleTimeEt(to);
  const { data, error } = await supabase
    .from('market_bars')
    .select('candle_time_et, open, high, low, close, volume')
    .eq('user_id', config.userId)
    .eq('bridge_instrument', instrument)
    .eq('timeframe', timeframe)
    .gte('candle_time_et', fromEt)
    .lte('candle_time_et', toEt)
    .order('candle_time_et', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data || []).map((row: any) => ({
    time: String(row.candle_time_et),
    open: Number(row.open),
    high: Number(row.high),
    low: Number(row.low),
    close: Number(row.close),
    volume: Number(row.volume || 0),
  }));
}
