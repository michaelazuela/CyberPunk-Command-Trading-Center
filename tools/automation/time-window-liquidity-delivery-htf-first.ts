import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertNoExecutableLedgerFields } from './model-candidate-ledger';
import { WINDOW_DEFINITIONS } from './time-window-liquidity-delivery';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

type AuditWindowCode = 'LONDON' | 'AM' | 'PM';
type SupportedTimeframe =
  | '1m'
  | '5m'
  | '15m'
  | '30m'
  | '60m'
  | '1h'
  | '240m'
  | '4h'
  | 'daily'
  | 'session';
type HtfFirstBucket =
  | 'priority_1_htf_draw_delivery_achieved'
  | 'priority_2_htf_draw_delivery_failed'
  | 'priority_3_htf_draw_delivery_not_observed'
  | 'priority_4_execution_only_without_htf_draw'
  | 'priority_5_no_valid_draw_or_noisy';
type HtfDrawContextStatus = 'present' | 'missing' | 'conflicting' | 'unclear';
type TwldContextClassification =
  | 'htf_draw_with_execution_window_delivery'
  | 'htf_draw_without_execution_window_delivery'
  | 'htf_draw_but_execution_window_conflicts'
  | 'execution_only_observation_no_htf_draw'
  | 'no_valid_draw'
  | 'unclear_needs_chart_review';

interface CliOptions {
  symbol: string;
  from: string;
  to: string;
  windows: AuditWindowCode[];
  outDir: string;
  pretty: boolean;
  json: boolean;
}

interface Bar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface TimeframeDiscovery {
  codedSupportedTimeframes: SupportedTimeframe[];
  discoveredHigherTimeframes: SupportedTimeframe[];
  cachedMarketBarTimeframes: SupportedTimeframe[];
  bridgeOnlyTimeframes: SupportedTimeframe[];
  diagnosticOnlyTimeframes: SupportedTimeframe[];
  chartContextTimeframes: SupportedTimeframe[];
  sessionDerivedTimeframes: SupportedTimeframe[];
  executionTimeframe: '5m';
  executionTimeframeRole: 'execution_only';
  notes: string[];
}

interface DrawReference {
  kind: string;
  timeframe: SupportedTimeframe;
  price: number;
  reachedInsideWindow: boolean;
  reachedBeforeWindow: boolean;
  stillValidDuringWindow: boolean;
  distanceFromWindowOpen: number;
  source: 'candle_derived' | 'session_derived';
}

interface HtfFirstCandidate {
  candidateId: string;
  date: string;
  symbol: string;
  windowStudied: AuditWindowCode;
  windowLabel: string;
  executionTimeframe: '5m';
  executionTimeframeRole: 'execution_only';
  discoveredHigherTimeframes: SupportedTimeframe[];
  availableDrawContextTimeframes: SupportedTimeframe[];
  primaryDrawContextTimeframes: SupportedTimeframe[];
  primaryDrawTimeframe: SupportedTimeframe | null;
  drawSourceTimeframes: SupportedTimeframe[];
  htfDrawContextPresent: boolean;
  htfDrawContextStatus: HtfDrawContextStatus;
  htfDrawType: string | null;
  htfDrawLevel: number | null;
  htfDrawStillValidDuringWindow: boolean | null;
  htfDrawReachedBeforeWindow: boolean | null;
  executionWindowSupportsHtfDraw: boolean;
  executionWindowConflictsWithHtfDraw: boolean;
  deliveryOccurredDuringWindow: boolean;
  deliveryOccurredAfterWindow: boolean;
  twldContextClassification: TwldContextClassification;
  htfFirstBucket: HtfFirstBucket;
  fvgOrInefficiencyPresent: boolean;
  marketStructureShiftPresent: boolean;
  sweepRaidPlusReclaimPresent: boolean;
  modelOneOverlapPossible: boolean;
  raidReclaimOverlapPossible: boolean;
  drawReferences: DrawReference[];
  notes: string[];
  researchOnly: true;
  boundary: 'research_only_not_execution_authority';
}

interface HtfFirstAuditReport {
  reportType: 'time_window_liquidity_delivery_htf_first_audit';
  generatedAt: string;
  symbol: string;
  from: string;
  to: string;
  windowStudied: AuditWindowCode;
  boundary: 'research_only_not_execution_authority';
  researchOnlyWarning: string;
  timeframeDiscovery: TimeframeDiscovery;
  source: {
    marketData: 'supabase_market_bars';
    completedHistoricalBarsOnly: true;
    executionTimeframe: '5m';
    drawContextRule: 'all_supported_timeframes_above_5m';
  };
  summary: {
    candidateCount: number;
    htfDrawPresentCount: number;
    htfDrawMissingCount: number;
    deliveryDuringWindowCount: number;
    deliveryAfterWindowCount: number;
    executionConflictCount: number;
    bucketCounts: Record<HtfFirstBucket, number>;
  };
  candidates: HtfFirstCandidate[];
  outputPaths: {
    jsonPath: string;
    markdownPath: string;
  };
}

interface ReconsiderationReport {
  reportType: 'time_window_liquidity_delivery_htf_first_reconsideration';
  generatedAt: string;
  symbol: string;
  from: string;
  to: string;
  boundary: 'research_only_not_execution_authority';
  researchOnlyWarning: string;
  timeframeDiscovery: TimeframeDiscovery;
  amSummary: HtfFirstAuditReport['summary'] | null;
  pmSummary: HtfFirstAuditReport['summary'] | null;
  priorAmLabelsThatMayNeedReconsideration: Array<{
    sampleId: string;
    finalHumanLabel: string | null;
    htfFirstBucket: HtfFirstBucket | null;
    reason: string;
  }>;
  priorPmTriageSamplesThatMayNeedReconsideration: Array<{
    sampleId: string;
    priorBucket: string | null;
    htfFirstBucket: HtfFirstBucket | null;
    reason: string;
  }>;
  recommendedNextHumanReviewSet: string[];
  previousAmConclusion: 'stand' | 'soften' | 'reopen';
  outputPaths: {
    jsonPath: string;
    markdownPath: string;
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'time-window-liquidity-delivery', 'htf-first');
const TWLD_DIR = path.join(__dirname, 'time-window-liquidity-delivery');
const RESEARCH_BOUNDARY = 'research_only_not_execution_authority' as const;
const RESEARCH_WARNING = 'Research-only HTF-first TWLD report. This does not approve trades, create execution authority, or mutate human labels.';
const CACHED_TIMEFRAMES: SupportedTimeframe[] = ['5m', '15m', '60m', '240m'];
const BRIDGE_TIMEFRAMES: SupportedTimeframe[] = ['1m', '5m', '15m', '60m', '240m', '1h', '4h'];
const DIAGNOSTIC_TIMEFRAMES: SupportedTimeframe[] = ['30m', '60m', '240m', 'daily'];
const CHART_CONTEXT_TIMEFRAMES: SupportedTimeframe[] = ['4h', '1h', '15m', '5m'];
const SESSION_DERIVED_TIMEFRAMES: SupportedTimeframe[] = ['session', 'daily'];
const HTF_BUCKETS: HtfFirstBucket[] = [
  'priority_1_htf_draw_delivery_achieved',
  'priority_2_htf_draw_delivery_failed',
  'priority_3_htf_draw_delivery_not_observed',
  'priority_4_execution_only_without_htf_draw',
  'priority_5_no_valid_draw_or_noisy',
];
const TICK_SIZE = 0.25;

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  return inline ? inline.slice(prefix.length) : null;
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function requireDate(value: string | null, flag: string): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${flag} must use YYYY-MM-DD.`);
  return value;
}

function parseWindow(value: string): AuditWindowCode {
  const normalized = value.toUpperCase();
  if (normalized !== 'AM' && normalized !== 'PM' && normalized !== 'LONDON') throw new Error('--windows must contain AM, PM, or LONDON.');
  return normalized;
}

export function parseTimeWindowLiquidityDeliveryHtfFirstArgs(args = process.argv.slice(2)): CliOptions {
  const symbol = (readFlag(args, '--symbol') || 'MES').toUpperCase();
  if (symbol !== 'MES') throw new Error('TWLD HTF-first research currently supports --symbol MES only.');
  const windows = (readFlag(args, '--windows') || 'AM,PM').split(',').map((value) => parseWindow(value.trim())).filter(Boolean);
  return {
    symbol,
    from: requireDate(readFlag(args, '--from') || '2018-01-01', '--from'),
    to: requireDate(readFlag(args, '--to') || '2026-05-31', '--to'),
    windows,
    outDir: readFlag(args, '--out') || DEFAULT_OUT_DIR,
    pretty: hasFlag(args, '--pretty') || !hasFlag(args, '--json'),
    json: hasFlag(args, '--json'),
  };
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function timeframeMinutes(timeframe: SupportedTimeframe): number {
  if (timeframe === '1m') return 1;
  if (timeframe === '5m') return 5;
  if (timeframe === '15m') return 15;
  if (timeframe === '30m') return 30;
  if (timeframe === '60m' || timeframe === '1h') return 60;
  if (timeframe === '240m' || timeframe === '4h') return 240;
  return 1440;
}

function normalizeDrawTimeframe(timeframe: SupportedTimeframe): SupportedTimeframe {
  if (timeframe === '1h') return '60m';
  if (timeframe === '4h') return '240m';
  return timeframe;
}

export function discoverTwldSupportedTimeframes(): TimeframeDiscovery {
  const codedSupportedTimeframes = unique([
    ...BRIDGE_TIMEFRAMES,
    ...CACHED_TIMEFRAMES,
    ...DIAGNOSTIC_TIMEFRAMES,
    ...CHART_CONTEXT_TIMEFRAMES,
    ...SESSION_DERIVED_TIMEFRAMES,
  ]);
  const discoveredHigherTimeframes = codedSupportedTimeframes
    .filter((timeframe) => timeframeMinutes(timeframe) > 5 || timeframe === 'session')
    .sort((a, b) => timeframeMinutes(a) - timeframeMinutes(b) || a.localeCompare(b));
  return {
    codedSupportedTimeframes,
    discoveredHigherTimeframes,
    cachedMarketBarTimeframes: CACHED_TIMEFRAMES,
    bridgeOnlyTimeframes: ['1m', '1h', '4h'],
    diagnosticOnlyTimeframes: ['30m', 'daily'],
    chartContextTimeframes: CHART_CONTEXT_TIMEFRAMES,
    sessionDerivedTimeframes: SESSION_DERIVED_TIMEFRAMES,
    executionTimeframe: '5m',
    executionTimeframeRole: 'execution_only',
    notes: [
      'Discovered from NinjaBridgeTimeframe, MarketBarTimeframe, diagnostic replay input fields, chart context types, and session-derived level structures.',
      '5m is execution-only. All coded timeframes above 5m are draw-context candidates.',
      'Cached historical OHLC currently covers 5m, 15m, 60m, and 240m. 1h/4h are aliases for 60m/240m. 30m and daily are diagnostic/input-only unless supplied elsewhere.',
    ],
  };
}

function asNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeTime(value: string): string {
  return value.replace(/Z$/, '').replace(/[+-]\d{2}:\d{2}$/, '').slice(0, 19);
}

async function fetchMarketBars(symbol: string, timeframe: SupportedTimeframe, from: string, to: string): Promise<Bar[]> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error('Supabase config is required to read market_bars.');
  const client = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
  const bars: Bar[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client
      .from('market_bars')
      .select('candle_time_et,open,high,low,close,volume')
      .eq('instrument', symbol)
      .eq('timeframe', timeframe)
      .gte('candle_time_et', `${from}T00:00:00`)
      .lte('candle_time_et', `${to}T23:59:59`)
      .order('candle_time_et', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`market_bars ${timeframe} read failed: ${error.message}`);
    for (const row of data || []) {
      bars.push({
        time: normalizeTime(String(row.candle_time_et)),
        open: asNumber(row.open),
        high: asNumber(row.high),
        low: asNumber(row.low),
        close: asNumber(row.close),
        volume: asNumber(row.volume),
      });
    }
    if (!data || data.length < pageSize) break;
  }
  return validBars(bars);
}

function validBars(bars: Bar[]): Bar[] {
  return [...bars]
    .filter((bar) =>
      bar.open > 0 &&
      bar.high >= Math.max(bar.open, bar.close) &&
      bar.low <= Math.min(bar.open, bar.close)
    )
    .sort((a, b) => a.time.localeCompare(b.time));
}

function dateFromBar(bar: Bar): string {
  return bar.time.slice(0, 10);
}

function clockFromBar(bar: Bar): string {
  return bar.time.slice(11, 16);
}

function high(bars: Bar[]): number {
  return Math.max(...bars.map((bar) => bar.high));
}

function low(bars: Bar[]): number {
  return Math.min(...bars.map((bar) => bar.low));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function groupByDate(bars: Bar[]): Map<string, Bar[]> {
  const grouped = new Map<string, Bar[]>();
  for (const bar of bars) grouped.set(dateFromBar(bar), [...(grouped.get(dateFromBar(bar)) || []), bar]);
  return grouped;
}

function inWindow(clock: string, definition: { fromClock: string; toClock: string }): boolean {
  return clock >= definition.fromClock && clock <= definition.toClock;
}

function weekKey(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  const day = parsed.getUTCDay() || 7;
  parsed.setUTCDate(parsed.getUTCDate() - day + 1);
  return parsed.toISOString().slice(0, 10);
}

function previousSessionBars(dayBars: Bar[], window: AuditWindowCode): Bar[] {
  if (window === 'AM') return dayBars.filter((bar) => clockFromBar(bar) >= '03:00' && clockFromBar(bar) < '09:30');
  if (window === 'PM') return dayBars.filter((bar) => clockFromBar(bar) >= '09:30' && clockFromBar(bar) < '12:00');
  return dayBars.filter((bar) => clockFromBar(bar) < '03:00');
}

function priorWeekBars(allBeforeDate: Bar[], date: string): Bar[] {
  const currentWeek = weekKey(date);
  const priorWeeks = unique(allBeforeDate.map((bar) => weekKey(dateFromBar(bar))).filter((key) => key < currentWeek)).sort();
  const priorWeek = priorWeeks.at(-1);
  return priorWeek ? allBeforeDate.filter((bar) => weekKey(dateFromBar(bar)) === priorWeek) : [];
}

function findEqualLevel(bars: Bar[], side: 'high' | 'low'): number | null {
  const values = bars.slice(-120).map((bar) => side === 'high' ? bar.high : bar.low);
  for (let i = values.length - 1; i >= 1; i -= 1) {
    for (let j = i - 1; j >= 0; j -= 1) {
      if (Math.abs(values[i] - values[j]) <= TICK_SIZE) return round((values[i] + values[j]) / 2);
    }
  }
  return null;
}

function recentSwing(bars: Bar[], side: 'high' | 'low'): number | null {
  const recent = bars.slice(-40);
  if (recent.length < 5) return null;
  return side === 'high' ? round(high(recent)) : round(low(recent));
}

function hasInefficiency(bars: Bar[]): boolean {
  for (let index = 2; index < bars.length; index += 1) {
    if (bars[index - 2].high < bars[index].low || bars[index - 2].low > bars[index].high) return true;
  }
  return false;
}

function structureShift(bars: Bar[]): boolean {
  if (bars.length < 6) return false;
  const midpoint = Math.floor(bars.length / 2);
  const first = bars.slice(0, midpoint);
  const second = bars.slice(midpoint);
  return (high(second) > high(first) && low(second) > low(first)) || (low(second) < low(first) && high(second) < high(first));
}

function sweepReclaim(windowBars: Bar[], references: DrawReference[]): boolean {
  return references.some((reference) => {
    if (!reference.reachedInsideWindow) return false;
    if (/low/i.test(reference.kind)) return windowBars.some((bar) => bar.low <= reference.price && bar.close > reference.price);
    if (/high/i.test(reference.kind)) return windowBars.some((bar) => bar.high >= reference.price && bar.close < reference.price);
    return false;
  });
}

function addReference(args: {
  references: DrawReference[];
  kind: string;
  timeframe: SupportedTimeframe;
  price: number | null;
  windowOpen: number;
  windowHigh: number;
  windowLow: number;
  beforeWindow: Bar[];
  source: DrawReference['source'];
}): void {
  if (args.price === null || !Number.isFinite(args.price)) return;
  args.references.push({
    kind: args.kind,
    timeframe: args.timeframe,
    price: round(args.price),
    reachedInsideWindow: args.windowLow <= args.price && args.windowHigh >= args.price,
    reachedBeforeWindow: args.beforeWindow.some((bar) => bar.low <= args.price! && bar.high >= args.price!),
    stillValidDuringWindow: !args.beforeWindow.some((bar) => bar.low <= args.price! && bar.high >= args.price!),
    distanceFromWindowOpen: round(Math.abs(args.price - args.windowOpen)),
    source: args.source,
  });
}

function bestDrawReference(references: DrawReference[]): DrawReference | null {
  return [...references]
    .filter((reference) => reference.stillValidDuringWindow)
    .sort((a, b) =>
      (b.reachedInsideWindow ? 1 : 0) - (a.reachedInsideWindow ? 1 : 0) ||
      b.distanceFromWindowOpen - a.distanceFromWindowOpen
    )[0] || references[0] || null;
}

function bucketFor(candidate: Pick<HtfFirstCandidate, 'htfDrawContextPresent' | 'deliveryOccurredDuringWindow' | 'executionWindowConflictsWithHtfDraw' | 'fvgOrInefficiencyPresent' | 'marketStructureShiftPresent'>): HtfFirstBucket {
  if (candidate.htfDrawContextPresent && candidate.deliveryOccurredDuringWindow) return 'priority_1_htf_draw_delivery_achieved';
  if (candidate.htfDrawContextPresent && candidate.executionWindowConflictsWithHtfDraw) return 'priority_2_htf_draw_delivery_failed';
  if (candidate.htfDrawContextPresent) return 'priority_3_htf_draw_delivery_not_observed';
  if (candidate.fvgOrInefficiencyPresent || candidate.marketStructureShiftPresent) return 'priority_4_execution_only_without_htf_draw';
  return 'priority_5_no_valid_draw_or_noisy';
}

function classifyContext(candidate: Pick<HtfFirstCandidate, 'htfDrawContextPresent' | 'deliveryOccurredDuringWindow' | 'executionWindowConflictsWithHtfDraw' | 'fvgOrInefficiencyPresent' | 'marketStructureShiftPresent'>): TwldContextClassification {
  if (candidate.htfDrawContextPresent && candidate.deliveryOccurredDuringWindow) return 'htf_draw_with_execution_window_delivery';
  if (candidate.htfDrawContextPresent && candidate.executionWindowConflictsWithHtfDraw) return 'htf_draw_but_execution_window_conflicts';
  if (candidate.htfDrawContextPresent) return 'htf_draw_without_execution_window_delivery';
  if (candidate.fvgOrInefficiencyPresent || candidate.marketStructureShiftPresent) return 'execution_only_observation_no_htf_draw';
  return 'no_valid_draw';
}

export function buildHtfFirstCandidate(args: {
  symbol: string;
  date: string;
  window: AuditWindowCode;
  dayBars5m: Bar[];
  allBefore5m: Bar[];
  htfBarsByTimeframe: Partial<Record<SupportedTimeframe, Bar[]>>;
  discovery: TimeframeDiscovery;
}): HtfFirstCandidate | null {
  const definition = WINDOW_DEFINITIONS[args.window];
  const windowBars = args.dayBars5m.filter((bar) => inWindow(clockFromBar(bar), definition));
  if (windowBars.length < 3) return null;
  const windowOpen = windowBars[0].open;
  const windowHigh = high(windowBars);
  const windowLow = low(windowBars);
  const beforeWindow = [...args.allBefore5m, ...args.dayBars5m.filter((bar) => clockFromBar(bar) < definition.fromClock)];
  const references: DrawReference[] = [];
  const availableDrawContextTimeframes = args.discovery.discoveredHigherTimeframes.filter((timeframe) => {
    if (timeframe === 'session' || timeframe === 'daily') return true;
    return (args.htfBarsByTimeframe[normalizeDrawTimeframe(timeframe)] || []).length > 0;
  });

  const priorDates = unique(args.allBefore5m.map(dateFromBar)).sort();
  const previousDate = priorDates.at(-1);
  const previousDayBars = previousDate ? args.allBefore5m.filter((bar) => dateFromBar(bar) === previousDate) : [];
  const sessionBars = previousSessionBars(args.dayBars5m, args.window);
  const weekBars = priorWeekBars(args.allBefore5m, args.date);
  addReference({ references, kind: 'prior_day_high', timeframe: 'daily', price: previousDayBars.length ? high(previousDayBars) : null, windowOpen, windowHigh, windowLow, beforeWindow, source: 'session_derived' });
  addReference({ references, kind: 'prior_day_low', timeframe: 'daily', price: previousDayBars.length ? low(previousDayBars) : null, windowOpen, windowHigh, windowLow, beforeWindow, source: 'session_derived' });
  addReference({ references, kind: 'prior_session_high', timeframe: 'session', price: sessionBars.length ? high(sessionBars) : null, windowOpen, windowHigh, windowLow, beforeWindow, source: 'session_derived' });
  addReference({ references, kind: 'prior_session_low', timeframe: 'session', price: sessionBars.length ? low(sessionBars) : null, windowOpen, windowHigh, windowLow, beforeWindow, source: 'session_derived' });
  addReference({ references, kind: 'prior_week_high', timeframe: 'daily', price: weekBars.length ? high(weekBars) : null, windowOpen, windowHigh, windowLow, beforeWindow, source: 'session_derived' });
  addReference({ references, kind: 'prior_week_low', timeframe: 'daily', price: weekBars.length ? low(weekBars) : null, windowOpen, windowHigh, windowLow, beforeWindow, source: 'session_derived' });
  addReference({ references, kind: 'equal_highs', timeframe: 'session', price: findEqualLevel(beforeWindow, 'high'), windowOpen, windowHigh, windowLow, beforeWindow, source: 'session_derived' });
  addReference({ references, kind: 'equal_lows', timeframe: 'session', price: findEqualLevel(beforeWindow, 'low'), windowOpen, windowHigh, windowLow, beforeWindow, source: 'session_derived' });

  for (const timeframe of ['15m', '60m', '240m'] as SupportedTimeframe[]) {
    const bars = (args.htfBarsByTimeframe[timeframe] || []).filter((bar) => dateFromBar(bar) < args.date || (dateFromBar(bar) === args.date && clockFromBar(bar) < definition.fromClock));
    if (!bars.length) continue;
    addReference({ references, kind: `${timeframe}_swing_high`, timeframe, price: recentSwing(bars, 'high'), windowOpen, windowHigh, windowLow, beforeWindow, source: 'candle_derived' });
    addReference({ references, kind: `${timeframe}_swing_low`, timeframe, price: recentSwing(bars, 'low'), windowOpen, windowHigh, windowLow, beforeWindow, source: 'candle_derived' });
    if (hasInefficiency(bars.slice(-30))) {
      const recent = bars.slice(-30);
      addReference({ references, kind: `${timeframe}_fvg_or_inefficiency_midpoint`, timeframe, price: round((high(recent) + low(recent)) / 2), windowOpen, windowHigh, windowLow, beforeWindow, source: 'candle_derived' });
    }
  }

  const primary = bestDrawReference(references);
  const fvg = hasInefficiency(windowBars);
  const mss = structureShift(windowBars);
  const sweep = sweepReclaim(windowBars, references);
  const deliveryDuring = Boolean(primary?.reachedInsideWindow);
  const deliveryAfter = Boolean(primary && args.dayBars5m.filter((bar) => clockFromBar(bar) > definition.toClock).some((bar) => bar.low <= primary.price && bar.high >= primary.price));
  const htfDrawPresent = Boolean(primary);
  const conflict = htfDrawPresent && !deliveryDuring && windowBars.length > 0 && Math.abs(windowBars[windowBars.length - 1].close - windowOpen) < 1;
  const draft = {
    htfDrawContextPresent: htfDrawPresent,
    deliveryOccurredDuringWindow: deliveryDuring,
    executionWindowConflictsWithHtfDraw: conflict,
    fvgOrInefficiencyPresent: fvg,
    marketStructureShiftPresent: mss,
  };
  const bucket = bucketFor(draft);
  const classification = classifyContext(draft);
  const sourceTimeframes = unique(references.map((reference) => reference.timeframe));
  const primaryTimeframes = primary ? unique(references.filter((reference) => reference.price === primary.price).map((reference) => reference.timeframe)) : [];

  const candidate: HtfFirstCandidate = {
    candidateId: `${definition.id}-${args.date}`,
    date: args.date,
    symbol: args.symbol,
    windowStudied: args.window,
    windowLabel: definition.displayName,
    executionTimeframe: '5m',
    executionTimeframeRole: 'execution_only',
    discoveredHigherTimeframes: args.discovery.discoveredHigherTimeframes,
    availableDrawContextTimeframes,
    primaryDrawContextTimeframes: primaryTimeframes,
    primaryDrawTimeframe: primary?.timeframe || null,
    drawSourceTimeframes: sourceTimeframes,
    htfDrawContextPresent: htfDrawPresent,
    htfDrawContextStatus: htfDrawPresent ? conflict ? 'conflicting' : 'present' : 'missing',
    htfDrawType: primary?.kind || null,
    htfDrawLevel: primary?.price || null,
    htfDrawStillValidDuringWindow: primary?.stillValidDuringWindow ?? null,
    htfDrawReachedBeforeWindow: primary?.reachedBeforeWindow ?? null,
    executionWindowSupportsHtfDraw: deliveryDuring || sweep || mss,
    executionWindowConflictsWithHtfDraw: conflict,
    deliveryOccurredDuringWindow: deliveryDuring,
    deliveryOccurredAfterWindow: deliveryAfter,
    twldContextClassification: classification,
    htfFirstBucket: bucket,
    fvgOrInefficiencyPresent: fvg,
    marketStructureShiftPresent: mss,
    sweepRaidPlusReclaimPresent: sweep,
    modelOneOverlapPossible: fvg && mss && sweep,
    raidReclaimOverlapPossible: sweep && !(fvg && mss),
    drawReferences: references,
    notes: [
      'Research-only HTF-first TWLD candidate. 5m is execution-window observation only.',
      primary
        ? `Primary draw context is ${primary.kind} from ${primary.timeframe} at ${primary.price}.`
        : 'No higher-timeframe draw context was found before the execution window.',
      'No entries, stops, T1/T2, alerts, or execution authority are created.',
    ],
    researchOnly: true,
    boundary: RESEARCH_BOUNDARY,
  };
  assertNoExecutableLedgerFields(candidate);
  return candidate;
}

function bucketCounts(candidates: HtfFirstCandidate[]): Record<HtfFirstBucket, number> {
  return Object.fromEntries(HTF_BUCKETS.map((bucket) => [bucket, candidates.filter((candidate) => candidate.htfFirstBucket === bucket).length])) as Record<HtfFirstBucket, number>;
}

function auditPaths(options: Pick<CliOptions, 'outDir' | 'symbol' | 'from' | 'to'>, window: AuditWindowCode): HtfFirstAuditReport['outputPaths'] {
  const base = path.join(path.resolve(options.outDir), `time-window-liquidity-delivery-HTF-first-audit-${options.symbol}-${window}-${options.from}-to-${options.to}`);
  return { jsonPath: `${base}.json`, markdownPath: `${base}.md` };
}

export function buildHtfFirstAuditReport(args: {
  options: Pick<CliOptions, 'symbol' | 'from' | 'to' | 'outDir'>;
  window: AuditWindowCode;
  barsByTimeframe: Partial<Record<SupportedTimeframe, Bar[]>>;
  discovery?: TimeframeDiscovery;
}): HtfFirstAuditReport {
  const discovery = args.discovery || discoverTwldSupportedTimeframes();
  const bars5m = validBars(args.barsByTimeframe['5m'] || []);
  const grouped = groupByDate(bars5m);
  const candidates: HtfFirstCandidate[] = [];
  for (const date of [...grouped.keys()].sort()) {
    const dayBars = grouped.get(date) || [];
    const allBefore = bars5m.filter((bar) => dateFromBar(bar) < date);
    const candidate = buildHtfFirstCandidate({
      symbol: args.options.symbol,
      date,
      window: args.window,
      dayBars5m: dayBars,
      allBefore5m: allBefore,
      htfBarsByTimeframe: args.barsByTimeframe,
      discovery,
    });
    if (candidate) candidates.push(candidate);
  }
  const report: HtfFirstAuditReport = {
    reportType: 'time_window_liquidity_delivery_htf_first_audit',
    generatedAt: new Date().toISOString(),
    symbol: args.options.symbol,
    from: args.options.from,
    to: args.options.to,
    windowStudied: args.window,
    boundary: RESEARCH_BOUNDARY,
    researchOnlyWarning: RESEARCH_WARNING,
    timeframeDiscovery: discovery,
    source: {
      marketData: 'supabase_market_bars',
      completedHistoricalBarsOnly: true,
      executionTimeframe: '5m',
      drawContextRule: 'all_supported_timeframes_above_5m',
    },
    summary: {
      candidateCount: candidates.length,
      htfDrawPresentCount: candidates.filter((candidate) => candidate.htfDrawContextPresent).length,
      htfDrawMissingCount: candidates.filter((candidate) => !candidate.htfDrawContextPresent).length,
      deliveryDuringWindowCount: candidates.filter((candidate) => candidate.deliveryOccurredDuringWindow).length,
      deliveryAfterWindowCount: candidates.filter((candidate) => candidate.deliveryOccurredAfterWindow).length,
      executionConflictCount: candidates.filter((candidate) => candidate.executionWindowConflictsWithHtfDraw).length,
      bucketCounts: bucketCounts(candidates),
    },
    candidates,
    outputPaths: auditPaths(args.options, args.window),
  };
  assertNoExecutableLedgerFields(report);
  return report;
}

function renderAuditMarkdown(report: HtfFirstAuditReport): string {
  return [
    `# Time-Window Liquidity Delivery HTF-First Audit - ${report.symbol} ${report.windowStudied}`,
    '',
    report.researchOnlyWarning,
    'This report does not apply labels, approve trades, create alerts, or create execution authority.',
    '',
    `Date range: ${report.from} to ${report.to}`,
    `Boundary: ${report.boundary}`,
    '',
    '## Timeframe Discovery',
    `- Coded/supported timeframes: ${report.timeframeDiscovery.codedSupportedTimeframes.join(', ')}`,
    `- Higher timeframes above 5m: ${report.timeframeDiscovery.discoveredHigherTimeframes.join(', ')}`,
    `- Cached OHLC timeframes: ${report.timeframeDiscovery.cachedMarketBarTimeframes.join(', ')}`,
    `- Execution timeframe: ${report.timeframeDiscovery.executionTimeframe} (${report.timeframeDiscovery.executionTimeframeRole})`,
    '',
    '## Summary',
    `- Candidates: ${report.summary.candidateCount}`,
    `- HTF draw present: ${report.summary.htfDrawPresentCount}`,
    `- HTF draw missing: ${report.summary.htfDrawMissingCount}`,
    `- Delivery during window: ${report.summary.deliveryDuringWindowCount}`,
    `- Delivery after window: ${report.summary.deliveryAfterWindowCount}`,
    `- Execution-window conflicts: ${report.summary.executionConflictCount}`,
    '',
    '## HTF-First Buckets',
    ...HTF_BUCKETS.map((bucket) => `- ${bucket}: ${report.summary.bucketCounts[bucket]}`),
    '',
    '## Sample Table',
    '| Date | Bucket | HTF Draw | Primary TF | Draw Level | Delivery During | Delivery After | FVG | MSS | Sweep/Reclaim | Classification |',
    '|---|---|---|---|---:|---:|---:|---:|---:|---:|---|',
    ...report.candidates.slice(0, 80).map((candidate) =>
      `| ${candidate.date} | ${candidate.htfFirstBucket} | ${candidate.htfDrawType || 'none'} | ${candidate.primaryDrawTimeframe || 'none'} | ${candidate.htfDrawLevel ?? 'n/a'} | ${candidate.deliveryOccurredDuringWindow ? 'Yes' : 'No'} | ${candidate.deliveryOccurredAfterWindow ? 'Yes' : 'No'} | ${candidate.fvgOrInefficiencyPresent ? 'Yes' : 'No'} | ${candidate.marketStructureShiftPresent ? 'Yes' : 'No'} | ${candidate.sweepRaidPlusReclaimPresent ? 'Yes' : 'No'} | ${candidate.twldContextClassification} |`
    ),
    report.candidates.length > 80 ? `\n_${report.candidates.length - 80} additional candidate(s) available in JSON._` : '',
    '',
    'Research-only. 5M remains execution-only observation; HTF draw context does not approve a trade or model.',
  ].filter((line) => line !== '').join('\n');
}

function readJson<T>(file: string): T | null {
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

function reviewedPath(window: AuditWindowCode, symbol: string, from: string, to: string): string {
  return path.join(TWLD_DIR, 'review-packs', 'reviewed', `time-window-liquidity-delivery-${window}-curated-review-pack-${symbol}-${from}-to-${to}.reviewed.json`);
}

function triagePath(symbol: string, from: string, to: string): string {
  return path.join(TWLD_DIR, 'review-packs', 'triage', `time-window-liquidity-delivery-PM-advisory-only-triage-${symbol}-${from}-to-${to}.json`);
}

function reconsiderationPaths(options: Pick<CliOptions, 'outDir' | 'symbol' | 'from' | 'to'>): ReconsiderationReport['outputPaths'] {
  const base = path.join(path.resolve(options.outDir), `time-window-liquidity-delivery-HTF-first-reconsideration-${options.symbol}-${options.from}-to-${options.to}`);
  return { jsonPath: `${base}.json`, markdownPath: `${base}.md` };
}

function buildReconsiderationReport(options: Pick<CliOptions, 'symbol' | 'from' | 'to' | 'outDir'>, reports: HtfFirstAuditReport[], discovery: TimeframeDiscovery): ReconsiderationReport {
  const am = reports.find((report) => report.windowStudied === 'AM') || null;
  const pm = reports.find((report) => report.windowStudied === 'PM') || null;
  const amReviewed = readJson<{ samples?: Array<{ sampleId: string; finalHumanLabel: string | null }> }>(reviewedPath('AM', options.symbol, options.from, options.to));
  const pmTriage = readJson<{ records?: Array<{ sampleId: string; qualityBucket?: string }>; recommendedFirstReviewSubset?: Array<{ sampleId: string }> }>(triagePath(options.symbol, options.from, options.to));
  const amById = new Map((am?.candidates || []).map((candidate) => [`advisory_only_samples-${candidate.candidateId}`, candidate]));
  const pmById = new Map((pm?.candidates || []).map((candidate) => [`advisory_only_samples-${candidate.candidateId}`, candidate]));
  const priorAmLabelsThatMayNeedReconsideration = (amReviewed?.samples || [])
    .filter((sample) => sample.finalHumanLabel === 'reject_time_window_standalone' || sample.finalHumanLabel === 'weak_or_noisy')
    .map((sample) => {
      const candidate = amById.get(sample.sampleId);
      const shouldReconsider = candidate?.htfDrawContextPresent && candidate.htfFirstBucket !== 'priority_5_no_valid_draw_or_noisy';
      return shouldReconsider
        ? {
            sampleId: sample.sampleId,
            finalHumanLabel: sample.finalHumanLabel,
            htfFirstBucket: candidate?.htfFirstBucket || null,
            reason: 'Prior weak/reject label may deserve chart review because HTF-first context found a higher-timeframe draw.',
          }
        : null;
    })
    .filter(Boolean) as ReconsiderationReport['priorAmLabelsThatMayNeedReconsideration'];
  const priorPmTriageSamplesThatMayNeedReconsideration = (pmTriage?.records || [])
    .filter((record) => record.qualityBucket === 'priority_4_fvg_mss_not_observed' || record.qualityBucket === 'priority_5_low_quality_or_noisy')
    .map((record) => {
      const candidate = pmById.get(record.sampleId);
      const shouldReconsider = candidate?.htfDrawContextPresent && candidate.htfFirstBucket !== 'priority_5_no_valid_draw_or_noisy';
      return shouldReconsider
        ? {
            sampleId: record.sampleId,
            priorBucket: record.qualityBucket || null,
            htfFirstBucket: candidate?.htfFirstBucket || null,
            reason: 'Prior PM triage priority may be too low because HTF-first context found a draw above 5M.',
          }
        : null;
    })
    .filter(Boolean) as ReconsiderationReport['priorPmTriageSamplesThatMayNeedReconsideration'];
  const recommendedNextHumanReviewSet = unique([
    ...priorAmLabelsThatMayNeedReconsideration.slice(0, 10).map((item) => item.sampleId),
    ...(pmTriage?.recommendedFirstReviewSubset || []).map((item) => item.sampleId),
    ...priorPmTriageSamplesThatMayNeedReconsideration.slice(0, 10).map((item) => item.sampleId),
  ]);
  const report: ReconsiderationReport = {
    reportType: 'time_window_liquidity_delivery_htf_first_reconsideration',
    generatedAt: new Date().toISOString(),
    symbol: options.symbol,
    from: options.from,
    to: options.to,
    boundary: RESEARCH_BOUNDARY,
    researchOnlyWarning: RESEARCH_WARNING,
    timeframeDiscovery: discovery,
    amSummary: am?.summary || null,
    pmSummary: pm?.summary || null,
    priorAmLabelsThatMayNeedReconsideration,
    priorPmTriageSamplesThatMayNeedReconsideration,
    recommendedNextHumanReviewSet,
    previousAmConclusion: priorAmLabelsThatMayNeedReconsideration.length ? 'reopen' : 'soften',
    outputPaths: reconsiderationPaths(options),
  };
  assertNoExecutableLedgerFields(report);
  return report;
}

function renderReconsiderationMarkdown(report: ReconsiderationReport): string {
  return [
    `# Time-Window Liquidity Delivery HTF-First Reconsideration - ${report.symbol}`,
    '',
    report.researchOnlyWarning,
    'This report does not apply labels, approve trades, create alerts, or create execution authority.',
    '',
    `Date range: ${report.from} to ${report.to}`,
    `Boundary: ${report.boundary}`,
    '',
    '## Discovered Higher Timeframes',
    `- ${report.timeframeDiscovery.discoveredHigherTimeframes.join(', ')}`,
    '',
    '## AM Samples That May Need Reconsideration',
    report.priorAmLabelsThatMayNeedReconsideration.length ? '| Sample ID | Prior Label | HTF-First Bucket | Reason |' : '_None found._',
    report.priorAmLabelsThatMayNeedReconsideration.length ? '|---|---|---|---|' : '',
    ...report.priorAmLabelsThatMayNeedReconsideration.map((item) => `| ${item.sampleId} | ${item.finalHumanLabel || 'n/a'} | ${item.htfFirstBucket || 'n/a'} | ${item.reason} |`),
    '',
    '## PM Triage Samples That May Need Reconsideration',
    report.priorPmTriageSamplesThatMayNeedReconsideration.length ? '| Sample ID | Prior Bucket | HTF-First Bucket | Reason |' : '_None found._',
    report.priorPmTriageSamplesThatMayNeedReconsideration.length ? '|---|---|---|---|' : '',
    ...report.priorPmTriageSamplesThatMayNeedReconsideration.map((item) => `| ${item.sampleId} | ${item.priorBucket || 'n/a'} | ${item.htfFirstBucket || 'n/a'} | ${item.reason} |`),
    '',
    '## Recommended Next Human Review Set',
    ...report.recommendedNextHumanReviewSet.map((sampleId) => `- ${sampleId}`),
    report.recommendedNextHumanReviewSet.length ? '' : '- None',
    '',
    `Previous AM conclusion: ${report.previousAmConclusion}`,
    '',
    'Research-only. Existing human labels are not changed by this report.',
  ].filter((line) => line !== '').join('\n');
}

function writeReport(report: HtfFirstAuditReport | ReconsiderationReport, markdown: string): void {
  mkdirSync(path.dirname(report.outputPaths.jsonPath), { recursive: true });
  writeFileSync(report.outputPaths.jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(report.outputPaths.markdownPath, `${markdown}\n`, 'utf8');
}

export async function runTimeWindowLiquidityDeliveryHtfFirst(options: CliOptions): Promise<{ audits: HtfFirstAuditReport[]; reconsideration: ReconsiderationReport }> {
  const discovery = discoverTwldSupportedTimeframes();
  const barsByTimeframe: Partial<Record<SupportedTimeframe, Bar[]>> = {};
  for (const timeframe of CACHED_TIMEFRAMES) {
    barsByTimeframe[timeframe] = await fetchMarketBars(options.symbol, timeframe, options.from, options.to);
  }
  const audits = options.windows.map((window) => buildHtfFirstAuditReport({ options, window, barsByTimeframe, discovery }));
  for (const audit of audits) writeReport(audit, renderAuditMarkdown(audit));
  const reconsideration = buildReconsiderationReport(options, audits, discovery);
  writeReport(reconsideration, renderReconsiderationMarkdown(reconsideration));
  return { audits, reconsideration };
}

export async function runTimeWindowLiquidityDeliveryHtfFirstCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseTimeWindowLiquidityDeliveryHtfFirstArgs(rawArgs);
  const result = await runTimeWindowLiquidityDeliveryHtfFirst(options);
  if (options.json) console.log(JSON.stringify(result, null, 2));
  if (options.pretty) {
    console.log([
      '[TIME-WINDOW LIQUIDITY DELIVERY HTF-FIRST]',
      `Symbol: ${options.symbol}`,
      `Date range: ${options.from} to ${options.to}`,
      `Windows: ${options.windows.join(', ')}`,
      `Discovered HTFs above 5m: ${result.reconsideration.timeframeDiscovery.discoveredHigherTimeframes.join(', ')}`,
      ...result.audits.map((audit) => `${audit.windowStudied}: candidates=${audit.summary.candidateCount}; HTF draw=${audit.summary.htfDrawPresentCount}; no HTF draw=${audit.summary.htfDrawMissingCount}`),
      `Reconsideration JSON: ${result.reconsideration.outputPaths.jsonPath}`,
      `Reconsideration Markdown: ${result.reconsideration.outputPaths.markdownPath}`,
      'Research-only. No labels, trades, entries, stops, targets, alerts, or execution authority are created.',
    ].join('\n'));
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tools/automation/time-window-liquidity-delivery-htf-first.ts')) {
  runTimeWindowLiquidityDeliveryHtfFirstCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
