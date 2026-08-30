import { createClient } from '@supabase/supabase-js';
import type { NinjaBridgeBar } from '../../src/lib/ninjaTraderBridge';
import { normalizeEtWallClock } from './et-time';

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

const MARKET_BARS_CACHE_PAGE_SIZE = 1000;

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

export const normalizeCandleTimeEt = normalizeEtWallClock;

function isFinitePrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasValidOhlcShape(bar: NinjaBridgeBar): boolean {
  if (!isFinitePrice(bar.open) || !isFinitePrice(bar.high) || !isFinitePrice(bar.low) || !isFinitePrice(bar.close)) {
    return false;
  }
  return bar.high >= Math.max(bar.open, bar.close, bar.low) && bar.low <= Math.min(bar.open, bar.close, bar.high);
}

function timeframeMinutes(timeframe: MarketBarTimeframe): number {
  if (timeframe === '60m') return 60;
  if (timeframe === '120m') return 120;
  if (timeframe === '240m') return 240;
  return Number(timeframe.replace('m', '')) || 5;
}

function marketBarTimeMs(value: string | null | undefined): number | null {
  const parsed = Date.parse(normalizeCandleTimeEt(String(value || '')));
  return Number.isFinite(parsed) ? parsed : null;
}

function marketBarMinuteOfDay(value: string | null | undefined): number | null {
  const match = normalizeCandleTimeEt(String(value || '')).match(/T(\d{2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function isAlignedToTimeframeMinute(value: string | null | undefined, timeframe: MarketBarTimeframe): boolean {
  const minuteOfDay = marketBarMinuteOfDay(value);
  if (minuteOfDay === null) return false;
  const minutes = timeframeMinutes(timeframe);
  if (minutes >= 60) return minuteOfDay % 60 === 0;
  return minuteOfDay % minutes === 0;
}

export function countMarketBarTimeframeIntervalMismatches(bars: NinjaBridgeBar[], timeframe: MarketBarTimeframe): number {
  const expectedMs = timeframeMinutes(timeframe) * 60_000;
  const minimumAllowedMs = expectedMs * 0.9;
  const sorted = bars
    .map((bar) => ({ bar, ms: marketBarTimeMs(bar.time) }))
    .filter((item): item is { bar: NinjaBridgeBar; ms: number } => item.ms !== null)
    .sort((a, b) => a.ms - b.ms);
  let mismatches = sorted.filter((item) => !isAlignedToTimeframeMinute(item.bar.time, timeframe)).length;
  for (let index = 1; index < sorted.length; index += 1) {
    const delta = sorted[index].ms - sorted[index - 1].ms;
    if (delta > 0 && delta < minimumAllowedMs) mismatches += 1;
  }
  return mismatches;
}

export function filterBarsToRequestedTimeframe(bars: NinjaBridgeBar[], timeframe: MarketBarTimeframe): NinjaBridgeBar[] {
  const expectedMs = timeframeMinutes(timeframe) * 60_000;
  const minimumAllowedMs = expectedMs * 0.9;
  const sorted = bars
    .map((bar) => ({ bar, ms: marketBarTimeMs(bar.time) }))
    .filter((item): item is { bar: NinjaBridgeBar; ms: number } => item.ms !== null && isAlignedToTimeframeMinute(item.bar.time, timeframe))
    .sort((a, b) => a.ms - b.ms);
  const kept: Array<{ bar: NinjaBridgeBar; ms: number }> = [];
  for (const item of sorted) {
    const previous = kept[kept.length - 1];
    if (!previous || item.ms - previous.ms >= minimumAllowedMs || item.ms - previous.ms <= 0) {
      kept.push(item);
    }
  }
  return kept.map((item) => item.bar);
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
    .filter(hasValidOhlcShape)
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
  const intervalMismatches = countMarketBarTimeframeIntervalMismatches(bars, timeframe);
  if (intervalMismatches > 0) {
    throw new Error(`Refusing to upsert ${bridgeInstrument} ${timeframe} market_bars: ${intervalMismatches} candle interval(s) are smaller than the requested timeframe.`);
  }
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

export function marketDataCachePageRanges(limit: number, pageSize = MARKET_BARS_CACHE_PAGE_SIZE): Array<{ from: number; to: number }> {
  const safeLimit = Math.max(0, Math.trunc(Number(limit) || 0));
  const safePageSize = Math.max(1, Math.trunc(Number(pageSize) || MARKET_BARS_CACHE_PAGE_SIZE));
  const ranges: Array<{ from: number; to: number }> = [];
  for (let from = 0; from < safeLimit; from += safePageSize) {
    ranges.push({ from, to: Math.min(from + safePageSize - 1, safeLimit - 1) });
  }
  return ranges;
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
  const rows: any[] = [];
  for (const range of marketDataCachePageRanges(limit)) {
    const { data, error } = await supabase
      .from('market_bars')
      .select('candle_time_et, open, high, low, close, volume')
      .eq('user_id', config.userId)
      .eq('bridge_instrument', instrument)
      .eq('timeframe', timeframe)
      .gte('candle_time_et', fromEt)
      .lte('candle_time_et', toEt)
      .order('candle_time_et', { ascending: true })
      .range(range.from, range.to);

    if (error) throw error;
    const page = data || [];
    rows.push(...page);
    if (page.length < (range.to - range.from + 1)) break;
  }

  return filterBarsToRequestedTimeframe(rows.map((row: any) => ({
    time: String(row.candle_time_et),
    open: Number(row.open),
    high: Number(row.high),
    low: Number(row.low),
    close: Number(row.close),
    volume: Number(row.volume || 0),
  })), timeframe);
}

export async function fetchRawCachedMarketBars({
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
  const rows: any[] = [];
  for (const range of marketDataCachePageRanges(limit)) {
    const { data, error } = await supabase
      .from('market_bars')
      .select('candle_time_et, open, high, low, close, volume')
      .eq('user_id', config.userId)
      .eq('bridge_instrument', instrument)
      .eq('timeframe', timeframe)
      .gte('candle_time_et', fromEt)
      .lte('candle_time_et', toEt)
      .order('candle_time_et', { ascending: true })
      .range(range.from, range.to);

    if (error) throw error;
    const page = data || [];
    rows.push(...page);
    if (page.length < (range.to - range.from + 1)) break;
  }

  return rows.map((row: any) => ({
    time: String(row.candle_time_et),
    open: Number(row.open),
    high: Number(row.high),
    low: Number(row.low),
    close: Number(row.close),
    volume: Number(row.volume || 0),
  }));
}

export async function deleteMarketBarsRange({
  instrument,
  timeframe,
  from,
  to,
  config,
}: {
  instrument: string;
  timeframe: MarketBarTimeframe;
  from: string;
  to: string;
  config: MarketDataConfig;
}): Promise<{ deleted: number | null }> {
  const supabase = createMarketDataClient(config);
  const fromEt = normalizeCandleTimeEt(from);
  const toEt = normalizeCandleTimeEt(to);
  const { count, error } = await supabase
    .from('market_bars')
    .delete({ count: 'exact' })
    .eq('user_id', config.userId)
    .eq('bridge_instrument', instrument)
    .eq('timeframe', timeframe)
    .gte('candle_time_et', fromEt)
    .lte('candle_time_et', toEt);

  if (error) throw error;
  return { deleted: count ?? null };
}
