import type { NinjaBridgeBar } from '../../src/lib/ninjaTraderBridge';
import { normalizeCandleTimeEt, type MarketBarTimeframe } from './market-data-store';

export type MarketDataWindowSource =
  | 'market_bars'
  | 'market_bars_bridge_repair'
  | 'bridge_repair'
  | 'missing';

export interface MarketDataWindowVerification {
  timeframe: MarketBarTimeframe;
  requestedFrom: string;
  requestedTo: string;
  barsLoaded: number;
  rangeStart: string | null;
  rangeEnd: string | null;
  source: MarketDataWindowSource;
  cacheBars: number;
  bridgeRepairBars: number;
  selfHealed: boolean;
  sufficient: boolean;
  invalidBars: number;
  duplicateTimestamps: number;
  warning: string | null;
  dataLimitation: {
    status: 'none' | 'bridge_or_cache_incomplete';
    message: string | null;
    retryPolicy: 'cache_then_single_bridge_then_segmented_bridge';
    canInventMissingBars: false;
    htfPromotionAllowed: boolean;
    operatorAction?: string;
  };
}

function timeframeMinutes(timeframe: MarketBarTimeframe): number {
  if (timeframe === '60m') return 60;
  if (timeframe === '120m') return 120;
  if (timeframe === '240m') return 240;
  return Number(timeframe.replace('m', '')) || 5;
}

function normalizedTimestamp(value: string | null | undefined): string {
  return normalizeCandleTimeEt(String(value || ''));
}

function timestampMs(value: string | null | undefined): number | null {
  const parsed = Date.parse(normalizedTimestamp(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function hasValidOhlc(bar: NinjaBridgeBar): boolean {
  if (![bar.open, bar.high, bar.low, bar.close].every((value) => typeof value === 'number' && Number.isFinite(value))) {
    return false;
  }
  return bar.high >= Math.max(bar.open, bar.close, bar.low) && bar.low <= Math.min(bar.open, bar.close, bar.high);
}

function countInternalGaps(bars: NinjaBridgeBar[], timeframe: MarketBarTimeframe): number {
  const expectedMs = timeframeMinutes(timeframe) * 60_000;
  const toleranceMs = 60_000;
  let gaps = 0;
  for (let index = 1; index < bars.length; index += 1) {
    const previous = timestampMs(bars[index - 1]?.time);
    const current = timestampMs(bars[index]?.time);
    if (previous === null || current === null) continue;
    if (current - previous > expectedMs + toleranceMs) gaps += 1;
  }
  return gaps;
}

export function mergeMarketDataBars(primary: NinjaBridgeBar[], fallback: NinjaBridgeBar[]): NinjaBridgeBar[] {
  const byTime = new Map<string, { bar: NinjaBridgeBar; index: number; priority: number }>();
  const add = (bar: NinjaBridgeBar, priority: number, index: number) => {
    const key = normalizedTimestamp(bar.time);
    if (!key) return;
    const normalized = { ...bar, time: key };
    const existing = byTime.get(key);
    if (!existing || priority > existing.priority || (priority === existing.priority && index > existing.index)) {
      byTime.set(key, { bar: normalized, index, priority });
    }
  };
  fallback.forEach((bar, index) => add(bar, 0, index));
  primary.forEach((bar, index) => add(bar, 1, index));
  return [...byTime.values()]
    .sort((a, b) => String(a.bar.time).localeCompare(String(b.bar.time)))
    .map((item) => item.bar);
}

export function repairMarketDataBarsWithinBaseRange(baseBars: NinjaBridgeBar[], repairBars: NinjaBridgeBar[]): NinjaBridgeBar[] {
  const base = mergeMarketDataBars(baseBars, []);
  if (!base.length || !repairBars.length) return base;
  const baseTimes = base.map((bar) => timestampMs(bar.time)).filter((value): value is number => value !== null);
  if (!baseTimes.length) return base;
  const minTime = Math.min(...baseTimes);
  const maxTime = Math.max(...baseTimes);
  const repairWithinRange = mergeMarketDataBars(repairBars, []).filter((bar) => {
    const ms = timestampMs(bar.time);
    return ms !== null && ms >= minTime && ms <= maxTime;
  });
  return mergeMarketDataBars(base, repairWithinRange);
}

export function marketDataSourceFromCounts(cacheBars: number, bridgeRepairBars: number): MarketDataWindowSource {
  if (cacheBars > 0 && bridgeRepairBars > 0) return 'market_bars_bridge_repair';
  if (cacheBars > 0) return 'market_bars';
  if (bridgeRepairBars > 0) return 'bridge_repair';
  return 'missing';
}

export function verifyMarketDataWindow(args: {
  bars: NinjaBridgeBar[];
  timeframe: MarketBarTimeframe;
  requestedFrom: string;
  requestedTo: string;
  requiredLookbackDays: number;
  minimumBars: number;
  source: MarketDataWindowSource;
  cacheBars: number;
  bridgeRepairBars: number;
  bridgeInstrument: string;
}): MarketDataWindowVerification {
  const sorted = mergeMarketDataBars(args.bars.filter(hasValidOhlc), []);
  const invalidBars = args.bars.length - sorted.length;
  const normalizedInputTimes = args.bars.map((bar) => normalizedTimestamp(bar.time)).filter(Boolean);
  const duplicateTimestamps = normalizedInputTimes.length - new Set(normalizedInputTimes).size;
  const first = sorted[0]?.time || null;
  const last = sorted[sorted.length - 1]?.time || null;
  const firstMs = timestampMs(first);
  const lastMs = timestampMs(last);
  const fromMs = timestampMs(args.requestedFrom);
  const toMs = timestampMs(args.requestedTo);
  const loadedSpanDays = firstMs !== null && lastMs !== null ? (lastMs - firstMs) / (24 * 60 * 60 * 1000) : 0;
  const requiredSpanDays = Math.max(0, args.requiredLookbackDays - 1);
  const latestCompletedToleranceMs = (timeframeMinutes(args.timeframe) + 30) * 60_000;
  const startCoverageToleranceMs = (args.requiredLookbackDays > 1 ? 24 * 60 : timeframeMinutes(args.timeframe)) * 60_000;
  const internalGaps = args.requiredLookbackDays <= 1 ? countInternalGaps(sorted, args.timeframe) : 0;
  const sufficient = (
    sorted.length >= args.minimumBars &&
    invalidBars === 0 &&
    duplicateTimestamps === 0 &&
    internalGaps === 0 &&
    loadedSpanDays >= requiredSpanDays &&
    fromMs !== null &&
    firstMs !== null &&
    firstMs <= fromMs + startCoverageToleranceMs &&
    toMs !== null &&
    lastMs !== null &&
    lastMs >= toMs - latestCompletedToleranceMs
  );
  const dataLimitationMessage = sufficient
    ? null
    : `Requested ${args.timeframe} bars remain incomplete after market_bars preload and NinjaTrader repair. The scanner cannot invent missing NinjaTrader bars; HTF promotion is blocked for this timeframe.`;
  const warning = sufficient
    ? null
    : `Market-data ingestion insufficient for ${args.timeframe}: required ${args.requiredLookbackDays} calendar days from ${args.requestedFrom} to ${args.requestedTo}; loaded ${sorted.length} valid bars from ${first || 'N/A'} to ${last || 'N/A'}; invalid=${invalidBars}; duplicates=${duplicateTimestamps}; internalGaps=${internalGaps}.`;

  return {
    timeframe: args.timeframe,
    requestedFrom: args.requestedFrom,
    requestedTo: args.requestedTo,
    barsLoaded: sorted.length,
    rangeStart: first,
    rangeEnd: last,
    source: args.source,
    cacheBars: args.cacheBars,
    bridgeRepairBars: args.bridgeRepairBars,
    selfHealed: args.bridgeRepairBars > 0,
    sufficient,
    invalidBars,
    duplicateTimestamps,
    warning,
    dataLimitation: {
      status: sufficient ? 'none' : 'bridge_or_cache_incomplete',
      message: dataLimitationMessage,
      retryPolicy: 'cache_then_single_bridge_then_segmented_bridge',
      canInventMissingBars: false,
      htfPromotionAllowed: sufficient,
      operatorAction: sufficient
        ? undefined
        : `Load the requested ${args.bridgeInstrument} ${args.timeframe} history in NinjaTrader or run npm run nt:backfill for the missing date range, then rerun the scanner/diagnostic.`,
    },
  };
}
