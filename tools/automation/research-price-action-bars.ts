import { fetchCachedMarketBars, loadMarketDataConfig, type MarketBarTimeframe, type MarketDataConfig } from './market-data-store';
import {
  getNinjaBridgeHealth,
  getNinjaHistoricalBars,
  type NinjaBridgeBar,
  type NinjaBridgeHealth,
  type NinjaBridgeTimeframe,
} from '../../src/lib/ninjaTraderBridge';
import type { PriceActionReviewBar, PriceActionReviewSampleLike } from '../../src/agents/priceActionReviewCardAgent';
import { resolveCurrentBridgeInstrument, type BridgeInstrumentResolutionSource } from './bridge-instrument-resolver';

export type PriceActionBarsDataSource = 'cache' | 'ninjatrader' | 'mixed' | 'missing';
export type PriceActionBarsTimeZone = 'eastern' | 'central' | 'pacific' | 'local' | string;
export type ActiveBridgeInstrumentSource = BridgeInstrumentResolutionSource;

export interface ResearchPriceActionBarsOptions {
  symbol?: string;
  bridgeInstrument?: string;
  bridgeUrl?: string;
  timezone?: PriceActionBarsTimeZone;
  fiveMinuteTimeframe?: '5m';
  fifteenMinuteTimeframe?: '15m';
  contextMinutes?: number;
  insetContextMinutes?: number;
  minimumFiveMinuteBars?: number;
  minimumFifteenMinuteBars?: number;
}

export interface ResolvedPriceActionWindow {
  sampleTimestamp: string | null;
  fiveMinute: {
    timeframe: '5m';
    from: string;
    to: string;
  } | null;
  fifteenMinute: {
    timeframe: '15m';
    from: string;
    to: string;
  } | null;
}

export interface ResearchPriceActionBarsResult {
  bars5m: PriceActionReviewBar[];
  bars15m: PriceActionReviewBar[];
  dataSource: PriceActionBarsDataSource;
  sourceByTimeframe: {
    '5m': PriceActionBarsDataSource;
    '15m': PriceActionBarsDataSource;
  };
  warnings: string[];
  resolvedWindow: ResolvedPriceActionWindow;
  resolvedContract: string;
  symbol: string;
  bridgeUrl: string;
  timezone: PriceActionBarsTimeZone;
  advisoryOnly: true;
  executionApproved: false;
}

export interface ResearchPriceActionBarsDependencies {
  loadMarketDataConfig?: () => MarketDataConfig | null;
  fetchCachedMarketBars?: typeof fetchCachedMarketBars;
  getNinjaHistoricalBars?: typeof getNinjaHistoricalBars;
}

export interface ActiveBridgeInstrumentResolution {
  instrument: string;
  source: ActiveBridgeInstrumentSource;
  warnings: string[];
  bridgeUrl: string;
}

export interface ActiveBridgeInstrumentDependencies {
  getNinjaBridgeHealth?: typeof getNinjaBridgeHealth;
  env?: Record<string, string | undefined>;
}

const DEFAULT_SYMBOL = 'MES';
const DEFAULT_BRIDGE_URL = 'http://127.0.0.1:8765';

function cleanInstrument(value: unknown): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return text ? text : null;
}

export async function resolveActiveBridgeInstrument(
  options: { bridgeUrl?: string; fallbackInstrument?: string } = {},
  dependencies: ActiveBridgeInstrumentDependencies = {},
): Promise<ActiveBridgeInstrumentResolution> {
  const bridgeUrl = options.bridgeUrl || DEFAULT_BRIDGE_URL;
  const env = dependencies.env || process.env;
  const requestedBridgeInstrument =
    cleanInstrument(options.fallbackInstrument) ||
    cleanInstrument(env.DEFAULT_CONTRACT) ||
    cleanInstrument(env.NINJATRADER_BRIDGE_INSTRUMENT);
  const resolution = await resolveCurrentBridgeInstrument({
    bridgeUrl,
    appInstrument: DEFAULT_SYMBOL,
    requestedBridgeInstrument,
  }, {
    getHealth: dependencies.getNinjaBridgeHealth,
  });
  return {
    instrument: resolution.instrument,
    source: resolution.source,
    warnings: resolution.warning ? [resolution.warning] : [],
    bridgeUrl,
  };
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function cleanTime(value: string | null | undefined): string | null {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  return `${pad(Number(match[1]))}:${match[2]}:${match[3] || '00'}`;
}

function isoLocal(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

function addMinutesToLocalTimestamp(timestamp: string, minutes: number): string {
  const date = new Date(`${timestamp}Z`);
  date.setUTCMinutes(date.getUTCMinutes() + minutes);
  return isoLocal(date);
}

function isValidDate(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function resolvePriceActionReviewWindow(
  sample: PriceActionReviewSampleLike,
  options: ResearchPriceActionBarsOptions = {},
): ResolvedPriceActionWindow & { warnings: string[] } {
  const warnings: string[] = [];
  if (!isValidDate(sample.date)) warnings.push('Sample date is missing or malformed; price-action bar windows cannot be resolved.');
  const time = cleanTime(sample.time);
  if (!time) warnings.push('Sample time is missing or malformed; price-action bar windows cannot be resolved.');
  if (!isValidDate(sample.date) || !time) {
    return { sampleTimestamp: null, fiveMinute: null, fifteenMinute: null, warnings };
  }

  const sampleTimestamp = `${sample.date}T${time}`;
  const contextMinutes = Math.max(10, Math.trunc(options.contextMinutes ?? 30));
  const insetContextMinutes = Math.max(30, Math.trunc(options.insetContextMinutes ?? 60));
  const fiveBefore = Math.floor(contextMinutes / 2);
  const fiveAfter = contextMinutes - fiveBefore;
  const insetBefore = Math.floor(insetContextMinutes / 2);
  const insetAfter = insetContextMinutes - insetBefore;
  return {
    sampleTimestamp,
    fiveMinute: {
      timeframe: options.fiveMinuteTimeframe || '5m',
      from: addMinutesToLocalTimestamp(sampleTimestamp, -fiveBefore),
      to: addMinutesToLocalTimestamp(sampleTimestamp, fiveAfter),
    },
    fifteenMinute: {
      timeframe: options.fifteenMinuteTimeframe || '15m',
      from: addMinutesToLocalTimestamp(sampleTimestamp, -insetBefore),
      to: addMinutesToLocalTimestamp(sampleTimestamp, insetAfter),
    },
    warnings,
  };
}

function isFinitePrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeBars(bars: NinjaBridgeBar[] | PriceActionReviewBar[] | undefined): PriceActionReviewBar[] {
  return [...(bars || [])]
    .filter((bar) =>
      typeof bar.time === 'string' &&
      isFinitePrice(bar.open) &&
      isFinitePrice(bar.high) &&
      isFinitePrice(bar.low) &&
      isFinitePrice(bar.close) &&
      bar.high >= Math.max(bar.open, bar.close) &&
      bar.low <= Math.min(bar.open, bar.close)
    )
    .map((bar) => ({
      time: bar.time,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      ...(typeof bar.volume === 'number' && Number.isFinite(bar.volume) ? { volume: bar.volume } : {}),
    }))
    .sort((left, right) => left.time.localeCompare(right.time));
}

function sourceSummary(source5m: PriceActionBarsDataSource, source15m: PriceActionBarsDataSource): PriceActionBarsDataSource {
  if (source5m === 'missing' && source15m === 'missing') return 'missing';
  if (source5m === source15m) return source5m;
  return 'mixed';
}

async function loadBarsForTimeframe(args: {
  timeframe: MarketBarTimeframe & NinjaBridgeTimeframe;
  minimumBars: number;
  window: { from: string; to: string };
  resolvedContract: string;
  bridgeUrl: string;
  config: MarketDataConfig | null;
  warnings: string[];
  deps: Required<ResearchPriceActionBarsDependencies>;
}): Promise<{ bars: PriceActionReviewBar[]; source: PriceActionBarsDataSource }> {
  let cached: PriceActionReviewBar[] = [];
  if (args.config) {
    try {
      cached = normalizeBars(await args.deps.fetchCachedMarketBars({
        instrument: args.resolvedContract,
        timeframe: args.timeframe,
        from: args.window.from,
        to: args.window.to,
        config: args.config,
      }));
    } catch (error) {
      args.warnings.push(`Cached ${args.timeframe} bars could not be read: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    args.warnings.push(`Cached ${args.timeframe} bars were not checked because market data cache configuration is unavailable.`);
  }

  if (cached.length >= args.minimumBars) return { bars: cached, source: 'cache' };
  args.warnings.push(`Cached ${args.timeframe} bars were missing or insufficient (${cached.length}/${args.minimumBars}); trying NinjaTrader historical fallback.`);

  try {
    const response = await args.deps.getNinjaHistoricalBars({
      instrument: args.resolvedContract,
      timeframe: args.timeframe,
      from: args.window.from,
      to: args.window.to,
      limit: 500,
      baseUrl: args.bridgeUrl,
    });
    const fallbackBars = normalizeBars(response.bars);
    if (response.ok !== false && fallbackBars.length >= args.minimumBars) {
      args.warnings.push(`NinjaTrader historical fallback used for ${args.timeframe} bars.`);
      return { bars: fallbackBars, source: 'ninjatrader' };
    }
    args.warnings.push(`NinjaTrader historical ${args.timeframe} bars were unavailable or insufficient (${fallbackBars.length}/${args.minimumBars})${response.error ? `: ${response.error}` : '.'}`);
  } catch (error) {
    args.warnings.push(`NinjaTrader historical ${args.timeframe} fallback failed safely: ${error instanceof Error ? error.message : String(error)}`);
  }

  return { bars: cached, source: cached.length ? 'cache' : 'missing' };
}

export async function resolveResearchPriceActionBars(
  sample: PriceActionReviewSampleLike,
  options: ResearchPriceActionBarsOptions = {},
  dependencies: ResearchPriceActionBarsDependencies = {},
): Promise<ResearchPriceActionBarsResult> {
  const deps: Required<ResearchPriceActionBarsDependencies> = {
    loadMarketDataConfig: dependencies.loadMarketDataConfig || loadMarketDataConfig,
    fetchCachedMarketBars: dependencies.fetchCachedMarketBars || fetchCachedMarketBars,
    getNinjaHistoricalBars: dependencies.getNinjaHistoricalBars || getNinjaHistoricalBars,
  };
  const symbol = (options.symbol || DEFAULT_SYMBOL).toUpperCase();
  const resolvedContract = options.bridgeInstrument || `${symbol} 06-26`;
  const bridgeUrl = options.bridgeUrl || DEFAULT_BRIDGE_URL;
  const timezone = options.timezone || 'eastern';
  const warnings: string[] = [];
  if (symbol === DEFAULT_SYMBOL && !resolvedContract.toUpperCase().startsWith(`${DEFAULT_SYMBOL} `)) {
    warnings.push(`Contract mismatch warning: symbol MES is being reviewed with ${resolvedContract}. Confirm the active chart contract before using this research evidence.`);
  }
  if (!['eastern', 'America/New_York'].includes(String(timezone))) {
    warnings.push(`Timezone ambiguity: sample timestamps are treated as local research timestamps; requested timezone=${timezone}.`);
  }

  const resolvedWindow = resolvePriceActionReviewWindow(sample, options);
  warnings.push(...resolvedWindow.warnings);
  if (!resolvedWindow.fiveMinute || !resolvedWindow.fifteenMinute) {
    return {
      bars5m: [],
      bars15m: [],
      dataSource: 'missing',
      sourceByTimeframe: { '5m': 'missing', '15m': 'missing' },
      warnings,
      resolvedWindow,
      resolvedContract,
      symbol,
      bridgeUrl,
      timezone,
      advisoryOnly: true,
      executionApproved: false,
    };
  }

  const config = deps.loadMarketDataConfig();
  const five = await loadBarsForTimeframe({
    timeframe: '5m',
    minimumBars: Math.max(1, Math.trunc(options.minimumFiveMinuteBars ?? 4)),
    window: resolvedWindow.fiveMinute,
    resolvedContract,
    bridgeUrl,
    config,
    warnings,
    deps,
  });
  const fifteen = await loadBarsForTimeframe({
    timeframe: '15m',
    minimumBars: Math.max(1, Math.trunc(options.minimumFifteenMinuteBars ?? 2)),
    window: resolvedWindow.fifteenMinute,
    resolvedContract,
    bridgeUrl,
    config,
    warnings,
    deps,
  });

  if (five.bars.length < Math.max(1, Math.trunc(options.minimumFiveMinuteBars ?? 4))) {
    warnings.push(`Insufficient 5-minute bars for PriceActionReviewCard (${five.bars.length}).`);
  }
  if (fifteen.bars.length < Math.max(1, Math.trunc(options.minimumFifteenMinuteBars ?? 2))) {
    warnings.push(`Insufficient 15-minute bars for PriceActionReviewCard (${fifteen.bars.length}).`);
  }

  return {
    bars5m: five.bars,
    bars15m: fifteen.bars,
    dataSource: sourceSummary(five.source, fifteen.source),
    sourceByTimeframe: { '5m': five.source, '15m': fifteen.source },
    warnings,
    resolvedWindow,
    resolvedContract,
    symbol,
    bridgeUrl,
    timezone,
    advisoryOnly: true,
    executionApproved: false,
  };
}
