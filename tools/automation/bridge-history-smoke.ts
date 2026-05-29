import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  getNinjaBridgeBars,
  getNinjaBridgeHealth,
  getNinjaHistoricalBars,
  type NinjaBridgeBar,
  type NinjaBridgeTimeframe,
} from '../../src/lib/ninjaTraderBridge';
import { parseBridgeTime } from '../../src/lib/localScannerEngine';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

type Instrument = 'MES' | 'MNQ';
type BarTimestampMode = 'open' | 'close';
type BarTimeZoneMode = 'eastern' | 'central' | 'pacific' | 'local';

export type BridgeHistoryLikelyCause =
  | 'bridge_unreachable'
  | 'instrument_mismatch'
  | 'unsupported_historical_endpoint'
  | 'unsupported_timeframe'
  | 'date_range_unavailable'
  | 'request_shape_mismatch'
  | 'completed_bar_filter_removed_all'
  | 'timestamp_timezone_parse_issue'
  | 'ninjatrader_history_not_loaded'
  | 'unknown';

export interface BridgeHistorySmokeCliOptions {
  instrument: Instrument;
  bridgeInstrument: string;
  date: string;
  from: string;
  to: string;
  timeframes: string[];
  bridgeUrl: string;
  barTimestampMode: BarTimestampMode;
  barTimeZone: BarTimeZoneMode;
  pretty: boolean;
  json: boolean;
}

export interface BridgeHistoryFilterDiagnostics {
  rawBarCount: number;
  completedBarCount: number;
  filteredIncompleteCount: number;
  invalidTimestampCount: number;
  invalidOhlcCount: number;
  firstReturnedBarTimestamp: string | null;
  lastReturnedBarTimestamp: string | null;
}

export interface BridgeHistoryRequestShape {
  label: string;
  endpoint: 'historical-bars' | 'bars' | 'health';
  bridgeUrl: string;
  bridgeInstrument: string;
  timeframe: string;
  from: string | null;
  to: string | null;
  timestampMode: BarTimestampMode;
  timeZoneMode: BarTimeZoneMode;
}

export interface BridgeHistoryTimeframeResult {
  timeframe: string;
  request: BridgeHistoryRequestShape;
  succeeded: boolean;
  bridgeOk: boolean | null;
  errorMessage: string | null;
  rawBarCount: number;
  firstReturnedBarTimestamp: string | null;
  lastReturnedBarTimestamp: string | null;
  completedBarCount: number;
  filteredIncompleteCount: number;
  invalidTimestampCount: number;
  invalidOhlcCount: number;
  aliasAttempts: BridgeHistoryAliasAttempt[];
}

export interface BridgeHistoryAliasAttempt {
  timeframeAlias: string;
  request: BridgeHistoryRequestShape;
  succeeded: boolean;
  bridgeOk: boolean | null;
  errorMessage: string | null;
  rawBarCount: number;
  completedBarCount: number;
}

export interface BridgeHistorySmokeReport {
  reportType: 'bridge_history_smoke';
  generatedAt: string;
  instrument: string;
  bridgeInstrument: string;
  bridgeUrl: string;
  dateWindowTested: { date: string; from: string; to: string };
  timeframeResults: BridgeHistoryTimeframeResult[];
  fallbackResults: BridgeHistoryTimeframeResult[];
  bestWorkingTimeframe: string | null;
  bestWorkingRequestShape: BridgeHistoryRequestShape | null;
  liveRecentBarsAvailable: boolean;
  historicalBarsAvailable: boolean;
  completedBarsAvailable: boolean;
  likelyCause: BridgeHistoryLikelyCause;
  recommendedFix: string;
  safeNextStep: string;
  approvalBoundary: {
    diagnosticChangesTradingRules: false;
    diagnosticChangesBridgeBehavior: false;
    diagnosticCreatesTrade: false;
    diagnosticCreatesTargets: false;
    diagnosticWritesRag: false;
    diagnosticChangesScanner: false;
  };
}

const DEFAULT_BRIDGE_URL = process.env.NINJATRADER_BRIDGE_URL || 'http://127.0.0.1:8765';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function assertClock(value: string | null, flag: string): string {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) throw new Error(`${flag} must use HH:mm format.`);
  return value;
}

function assertDate(value: string | null, flag: string): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${flag} must use YYYY-MM-DD format.`);
  return value;
}

function splitTimeframes(value: string | null): string[] {
  return (value || '5m,15m,60m,240m')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseBridgeHistorySmokeArgs(args = process.argv.slice(2)): BridgeHistorySmokeCliOptions {
  const instrument = (readFlag(args, '--instrument') || 'MES').toUpperCase();
  if (instrument !== 'MES' && instrument !== 'MNQ') throw new Error('--instrument must be MES or MNQ.');
  const timestampMode = (readFlag(args, '--bar-timestamp-mode') || 'close').toLowerCase();
  if (timestampMode !== 'open' && timestampMode !== 'close') throw new Error('--bar-timestamp-mode must be open or close.');
  const timeZone = (readFlag(args, '--bar-time-zone') || 'eastern').toLowerCase();
  if (timeZone !== 'eastern' && timeZone !== 'central' && timeZone !== 'pacific' && timeZone !== 'local') {
    throw new Error('--bar-time-zone must be eastern, central, pacific, or local.');
  }
  return {
    instrument,
    bridgeInstrument: readFlag(args, '--bridge-instrument') || `${instrument} 06-26`,
    date: assertDate(readFlag(args, '--date'), '--date'),
    from: assertClock(readFlag(args, '--from'), '--from'),
    to: assertClock(readFlag(args, '--to'), '--to'),
    timeframes: splitTimeframes(readFlag(args, '--timeframes')),
    bridgeUrl: readFlag(args, '--bridge-url') || DEFAULT_BRIDGE_URL,
    barTimestampMode: timestampMode,
    barTimeZone: timeZone,
    pretty: hasFlag(args, '--pretty') || !hasFlag(args, '--json'),
    json: hasFlag(args, '--json'),
  };
}

function timeframeMinutes(timeframe: string): number {
  const raw = timeframe.toLowerCase();
  if (raw === '1h' || raw === 'hour1') return 60;
  if (raw === '4h' || raw === 'hour4') return 240;
  if (raw.includes('15')) return 15;
  if (raw.includes('60')) return 60;
  if (raw.includes('240')) return 240;
  if (raw.includes('1') && !raw.includes('15')) return 1;
  return 5;
}

function isSupportedHelperTimeframe(timeframe: string): timeframe is NinjaBridgeTimeframe {
  return ['1m', '5m', '15m', '60m', '240m', '1h', '4h'].includes(timeframe);
}

function requestShape(args: {
  label: string;
  endpoint: 'historical-bars' | 'bars' | 'health';
  options: BridgeHistorySmokeCliOptions;
  timeframe: string;
  from: string | null;
  to: string | null;
}): BridgeHistoryRequestShape {
  return {
    label: args.label,
    endpoint: args.endpoint,
    bridgeUrl: args.options.bridgeUrl,
    bridgeInstrument: args.options.bridgeInstrument,
    timeframe: args.timeframe,
    from: args.from,
    to: args.to,
    timestampMode: args.options.barTimestampMode,
    timeZoneMode: args.options.barTimeZone,
  };
}

function buildIso(date: string, clock: string): string {
  return `${date}T${clock}:00`;
}

function easternOffsetFor(date: string): string {
  const utcNoon = new Date(`${date}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    timeZoneName: 'shortOffset',
  }).formatToParts(utcNoon);
  const value = parts.find((part) => part.type === 'timeZoneName')?.value || 'GMT-4';
  const match = value.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return '-04:00';
  const sign = match[1];
  const hour = match[2].padStart(2, '0');
  const minute = (match[3] || '00').padStart(2, '0');
  return `${sign}${hour}:${minute}`;
}

function buildIsoWithEasternOffset(date: string, clock: string): string {
  return `${date}T${clock}:00${easternOffsetFor(date)}`;
}

function etDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function isValidOhlc(bar: NinjaBridgeBar): boolean {
  return [bar.open, bar.high, bar.low, bar.close].every((value) => typeof value === 'number' && Number.isFinite(value) && value > 0) &&
    bar.high >= Math.max(bar.open, bar.close) &&
    bar.low <= Math.min(bar.open, bar.close);
}

export function diagnoseCompletedBars(
  bars: NinjaBridgeBar[],
  timeframe: string,
  timestampMode: BarTimestampMode,
  timeZone: BarTimeZoneMode,
  now = new Date(),
): BridgeHistoryFilterDiagnostics {
  const minutes = timeframeMinutes(timeframe);
  let completedBarCount = 0;
  let filteredIncompleteCount = 0;
  let invalidTimestampCount = 0;
  let invalidOhlcCount = 0;
  for (const bar of bars) {
    if (!isValidOhlc(bar)) {
      invalidOhlcCount += 1;
      continue;
    }
    const parsed = parseBridgeTime(bar.time, timeZone);
    if (!parsed) {
      invalidTimestampCount += 1;
      continue;
    }
    const completedAt = timestampMode === 'close' ? parsed.getTime() : parsed.getTime() + minutes * 60_000;
    if (completedAt <= now.getTime()) {
      completedBarCount += 1;
    } else {
      filteredIncompleteCount += 1;
    }
  }
  return {
    rawBarCount: bars.length,
    completedBarCount,
    filteredIncompleteCount,
    invalidTimestampCount,
    invalidOhlcCount,
    firstReturnedBarTimestamp: bars[0]?.time || null,
    lastReturnedBarTimestamp: bars[bars.length - 1]?.time || null,
  };
}

async function fetchHistoricalWithHelper(options: BridgeHistorySmokeCliOptions, timeframe: NinjaBridgeTimeframe, from: string, to: string): Promise<{ ok: boolean | null; bars: NinjaBridgeBar[]; error: string | null }> {
  try {
    const response = await getNinjaHistoricalBars({
      instrument: options.bridgeInstrument,
      timeframe,
      from,
      to,
      limit: 5000,
      baseUrl: options.bridgeUrl,
    });
    return {
      ok: response.ok,
      bars: response.bars || [],
      error: response.ok === false ? response.error || 'Bridge returned ok=false.' : null,
    };
  } catch (error) {
    return {
      ok: null,
      bars: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function fetchHistoricalRaw(options: BridgeHistorySmokeCliOptions, timeframe: string, from: string, to: string): Promise<{ ok: boolean | null; bars: NinjaBridgeBar[]; error: string | null }> {
  try {
    const url = new URL('historical-bars', options.bridgeUrl.endsWith('/') ? options.bridgeUrl : `${options.bridgeUrl}/`);
    url.searchParams.set('instrument', options.bridgeInstrument);
    url.searchParams.set('timeframe', timeframe);
    url.searchParams.set('from', from);
    url.searchParams.set('to', to);
    url.searchParams.set('limit', '5000');
    const response = await fetch(url);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: null, bars: [], error: data?.error || `HTTP ${response.status}` };
    }
    return {
      ok: typeof data?.ok === 'boolean' ? data.ok : null,
      bars: Array.isArray(data?.bars) ? data.bars : [],
      error: data?.ok === false ? data?.error || 'Bridge returned ok=false.' : null,
    };
  } catch (error) {
    return { ok: null, bars: [], error: error instanceof Error ? error.message : String(error) };
  }
}

async function runHistoricalAttempt(args: {
  options: BridgeHistorySmokeCliOptions;
  timeframe: string;
  from: string;
  to: string;
  label: string;
}): Promise<BridgeHistoryTimeframeResult> {
  const timeframe = args.timeframe;
  const helperSupported = isSupportedHelperTimeframe(timeframe);
  const response = helperSupported
    ? await fetchHistoricalWithHelper(args.options, timeframe, args.from, args.to)
    : await fetchHistoricalRaw(args.options, timeframe, args.from, args.to);
  const diagnostics = diagnoseCompletedBars(
    response.bars,
    timeframe,
    args.options.barTimestampMode,
    args.options.barTimeZone,
  );
  return {
    timeframe,
    request: requestShape({
      label: args.label,
      endpoint: 'historical-bars',
      options: args.options,
      timeframe,
      from: args.from,
      to: args.to,
    }),
    succeeded: response.error === null,
    bridgeOk: response.ok,
    errorMessage: response.error,
    rawBarCount: diagnostics.rawBarCount,
    firstReturnedBarTimestamp: diagnostics.firstReturnedBarTimestamp,
    lastReturnedBarTimestamp: diagnostics.lastReturnedBarTimestamp,
    completedBarCount: diagnostics.completedBarCount,
    filteredIncompleteCount: diagnostics.filteredIncompleteCount,
    invalidTimestampCount: diagnostics.invalidTimestampCount,
    invalidOhlcCount: diagnostics.invalidOhlcCount,
    aliasAttempts: [],
  };
}

function aliasesFor(timeframe: string): string[] {
  const lower = timeframe.toLowerCase();
  if (lower.includes('15')) return ['15M', 'Minute15', '15'];
  if (lower.includes('60') || lower === '1h') return ['1h', '60M', 'Hour1'];
  if (lower.includes('240') || lower === '4h') return ['4h', '240M', 'Hour4'];
  return ['5M', 'Minute5', '5'];
}

async function runAliasAttempts(options: BridgeHistorySmokeCliOptions, timeframe: string, from: string, to: string): Promise<BridgeHistoryAliasAttempt[]> {
  const attempts: BridgeHistoryAliasAttempt[] = [];
  for (const alias of aliasesFor(timeframe)) {
    const response = await fetchHistoricalRaw(options, alias, from, to);
    const diagnostics = diagnoseCompletedBars(response.bars, alias, options.barTimestampMode, options.barTimeZone);
    attempts.push({
      timeframeAlias: alias,
      request: requestShape({
        label: 'timeframe_alias',
        endpoint: 'historical-bars',
        options,
        timeframe: alias,
        from,
        to,
      }),
      succeeded: response.error === null,
      bridgeOk: response.ok,
      errorMessage: response.error,
      rawBarCount: diagnostics.rawBarCount,
      completedBarCount: diagnostics.completedBarCount,
    });
  }
  return attempts;
}

async function fetchLiveRecent(options: BridgeHistorySmokeCliOptions): Promise<BridgeHistoryTimeframeResult> {
  try {
    const response = await getNinjaBridgeBars(options.bridgeInstrument, '5m', 100, options.bridgeUrl);
    const diagnostics = diagnoseCompletedBars(response.bars || [], '5m', options.barTimestampMode, options.barTimeZone);
    return {
      timeframe: '5m',
      request: requestShape({
        label: 'live_recent_bars',
        endpoint: 'bars',
        options,
        timeframe: '5m',
        from: null,
        to: null,
      }),
      succeeded: response.ok !== false,
      bridgeOk: response.ok,
      errorMessage: response.ok === false ? response.error || 'Bridge returned ok=false.' : null,
      rawBarCount: diagnostics.rawBarCount,
      firstReturnedBarTimestamp: diagnostics.firstReturnedBarTimestamp,
      lastReturnedBarTimestamp: diagnostics.lastReturnedBarTimestamp,
      completedBarCount: diagnostics.completedBarCount,
      filteredIncompleteCount: diagnostics.filteredIncompleteCount,
      invalidTimestampCount: diagnostics.invalidTimestampCount,
      invalidOhlcCount: diagnostics.invalidOhlcCount,
      aliasAttempts: [],
    };
  } catch (error) {
    return {
      timeframe: '5m',
      request: requestShape({
        label: 'live_recent_bars',
        endpoint: 'bars',
        options,
        timeframe: '5m',
        from: null,
        to: null,
      }),
      succeeded: false,
      bridgeOk: null,
      errorMessage: error instanceof Error ? error.message : String(error),
      rawBarCount: 0,
      firstReturnedBarTimestamp: null,
      lastReturnedBarTimestamp: null,
      completedBarCount: 0,
      filteredIncompleteCount: 0,
      invalidTimestampCount: 0,
      invalidOhlcCount: 0,
      aliasAttempts: [],
    };
  }
}

async function bridgeReachable(baseUrl: string): Promise<boolean> {
  try {
    const health = await getNinjaBridgeHealth(baseUrl);
    return health.ok !== false;
  } catch {
    return false;
  }
}

function bestResult(results: BridgeHistoryTimeframeResult[]): BridgeHistoryTimeframeResult | null {
  return [...results]
    .filter((result) => result.completedBarCount > 0)
    .sort((a, b) => b.completedBarCount - a.completedBarCount)[0] || null;
}

function classifyCause(args: {
  reachable: boolean;
  primary: BridgeHistoryTimeframeResult[];
  fallback: BridgeHistoryTimeframeResult[];
  liveRecent: BridgeHistoryTimeframeResult;
}): BridgeHistoryLikelyCause {
  const all = [...args.primary, ...args.fallback];
  const anyHistoricalRaw = all.some((result) => result.rawBarCount > 0);
  const anyHistoricalCompleted = all.some((result) => result.completedBarCount > 0);
  const anyLive = args.liveRecent.rawBarCount > 0;
  const allErrors = all.flatMap((result) => [
    result.errorMessage || '',
    ...result.aliasAttempts.map((attempt) => attempt.errorMessage || ''),
  ]).join(' | ').toLowerCase();

  if (!args.reachable && !anyLive) return 'bridge_unreachable';
  if (allErrors.includes('instrument not found')) return 'instrument_mismatch';
  if (allErrors.includes('unknown endpoint') || allErrors.includes('404')) return 'unsupported_historical_endpoint';
  if (allErrors.includes('requires iso') || allErrors.includes('to must be after from')) return 'request_shape_mismatch';
  if (allErrors.includes('timeframe') && !anyHistoricalRaw) return 'unsupported_timeframe';
  if (anyHistoricalRaw && !anyHistoricalCompleted) {
    const invalidTimestamp = all.reduce((sum, result) => sum + result.invalidTimestampCount, 0);
    if (invalidTimestamp > 0) return 'timestamp_timezone_parse_issue';
    return 'completed_bar_filter_removed_all';
  }
  if (!anyHistoricalRaw && anyLive) {
    const recentFallbackWorked = args.fallback.some((result) => result.request.label.includes('recent') && result.rawBarCount > 0);
    return recentFallbackWorked ? 'date_range_unavailable' : 'ninjatrader_history_not_loaded';
  }
  if (!anyHistoricalRaw) return 'date_range_unavailable';
  if (anyHistoricalCompleted) return 'unknown';
  return 'unknown';
}

function fixForCause(cause: BridgeHistoryLikelyCause): { recommendedFix: string; safeNextStep: string } {
  switch (cause) {
    case 'bridge_unreachable':
      return {
        recommendedFix: 'Start NinjaTrader and the local Quant Desk bridge, then rerun the smoke test.',
        safeNextStep: 'Confirm /health and /bars respond before running research backfill.',
      };
    case 'instrument_mismatch':
      return {
        recommendedFix: 'Confirm the exact NinjaTrader instrument name, for example MES 06-26, and pass it with --bridge-instrument.',
        safeNextStep: 'Run the smoke test against the chart instrument shown in NinjaTrader.',
      };
    case 'unsupported_historical_endpoint':
      return {
        recommendedFix: 'Confirm the installed NinjaTrader bridge add-on includes the historical-bars endpoint.',
        safeNextStep: 'Update/reload the bridge add-on only after confirming the endpoint version.',
      };
    case 'unsupported_timeframe':
      return {
        recommendedFix: 'Use the timeframe spelling that returned bars in alias attempts, if one did.',
        safeNextStep: 'Do not change scanner/backfill timeframe defaults until a working alias is proven.',
      };
    case 'request_shape_mismatch':
      return {
        recommendedFix: 'Use ISO timestamps with an explicit ET offset, matching the bridge example format.',
        safeNextStep: 'Rerun with the smoke test and compare offsetless versus offset request shapes before a narrow backfill fix.',
      };
    case 'completed_bar_filter_removed_all':
      return {
        recommendedFix: 'Review timestamp mode and timezone settings; returned bars exist but all were considered incomplete.',
        safeNextStep: 'Try --bar-timestamp-mode open and --bar-time-zone eastern/local in the smoke test.',
      };
    case 'timestamp_timezone_parse_issue':
      return {
        recommendedFix: 'Inspect returned bar timestamps; parser could not read one or more values.',
        safeNextStep: 'Capture first/last returned timestamps from the smoke report before changing parsing.',
      };
    case 'ninjatrader_history_not_loaded':
      return {
        recommendedFix: 'Load historical data for the requested MES contract/date range in NinjaTrader.',
        safeNextStep: 'Test a recent small window first, then expand the date range.',
      };
    case 'date_range_unavailable':
      return {
        recommendedFix: 'Use a date/window known to be loaded in NinjaTrader or load the requested historical range.',
        safeNextStep: 'Run the smoke test on today or the latest chart-loaded session.',
      };
    default:
      return {
        recommendedFix: 'Review the per-timeframe request/error details in the smoke report.',
        safeNextStep: 'Do not change bridge or scanner behavior until a single cause is proven.',
      };
  }
}

export async function runBridgeHistorySmoke(options: BridgeHistorySmokeCliOptions): Promise<BridgeHistorySmokeReport> {
  const reachable = await bridgeReachable(options.bridgeUrl);
  const from = buildIso(options.date, options.from);
  const to = buildIso(options.date, options.to);
  const fromOffset = buildIsoWithEasternOffset(options.date, options.from);
  const toOffset = buildIsoWithEasternOffset(options.date, options.to);
  const primary: BridgeHistoryTimeframeResult[] = [];

  for (const timeframe of options.timeframes) {
    const result = await runHistoricalAttempt({ options, timeframe, from, to, label: 'primary_offsetless' });
    if (result.rawBarCount === 0) {
      result.aliasAttempts = await runAliasAttempts(options, timeframe, from, to);
    }
    primary.push(result);
  }

  const fallback: BridgeHistoryTimeframeResult[] = [];
  const allPrimaryZero = primary.every((result) => result.rawBarCount === 0);
  if (allPrimaryZero) {
    fallback.push(await runHistoricalAttempt({ options, timeframe: '5m', from: fromOffset, to: toOffset, label: 'primary_window_with_et_offset' }));
    const smallTo = buildIso(options.date, options.from < options.to ? addMinutes(options.from, 30) : options.to);
    fallback.push(await runHistoricalAttempt({ options, timeframe: '5m', from, to: smallTo, label: 'smaller_original_window' }));
    const today = etDate();
    fallback.push(await runHistoricalAttempt({
      options,
      timeframe: '5m',
      from: buildIsoWithEasternOffset(today, '09:30'),
      to: buildIsoWithEasternOffset(today, '11:15'),
      label: 'today_current_session_with_et_offset',
    }));
  }

  const liveRecent = await fetchLiveRecent(options);
  const best = bestResult([...primary, ...fallback]);
  const likelyCause = classifyCause({ reachable, primary, fallback, liveRecent });
  const fix = fixForCause(likelyCause);

  return {
    reportType: 'bridge_history_smoke',
    generatedAt: new Date().toISOString(),
    instrument: options.instrument,
    bridgeInstrument: options.bridgeInstrument,
    bridgeUrl: options.bridgeUrl,
    dateWindowTested: { date: options.date, from: options.from, to: options.to },
    timeframeResults: primary,
    fallbackResults: fallback,
    bestWorkingTimeframe: best?.timeframe || null,
    bestWorkingRequestShape: best?.request || null,
    liveRecentBarsAvailable: liveRecent.rawBarCount > 0,
    historicalBarsAvailable: [...primary, ...fallback].some((result) => result.rawBarCount > 0),
    completedBarsAvailable: [...primary, ...fallback].some((result) => result.completedBarCount > 0),
    likelyCause,
    recommendedFix: fix.recommendedFix,
    safeNextStep: fix.safeNextStep,
    approvalBoundary: {
      diagnosticChangesTradingRules: false,
      diagnosticChangesBridgeBehavior: false,
      diagnosticCreatesTrade: false,
      diagnosticCreatesTargets: false,
      diagnosticWritesRag: false,
      diagnosticChangesScanner: false,
    },
  };
}

function addMinutes(clock: string, minutes: number): string {
  const [hour, minute] = clock.split(':').map(Number);
  const total = hour * 60 + minute + minutes;
  const nextHour = Math.floor(total / 60) % 24;
  const nextMinute = total % 60;
  return `${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`;
}

function formatResult(result: BridgeHistoryTimeframeResult): string[] {
  const lines = [
    `- ${result.timeframe} [${result.request.label}] ${result.succeeded ? 'ok' : 'failed'} raw=${result.rawBarCount} completed=${result.completedBarCount} incomplete=${result.filteredIncompleteCount} invalidTs=${result.invalidTimestampCount} invalidOhlc=${result.invalidOhlcCount}`,
    `  Request: ${result.request.endpoint} instrument="${result.request.bridgeInstrument}" timeframe=${result.request.timeframe} from=${result.request.from || 'n/a'} to=${result.request.to || 'n/a'} url=${result.request.bridgeUrl}`,
    `  First/last: ${result.firstReturnedBarTimestamp || 'none'} -> ${result.lastReturnedBarTimestamp || 'none'}`,
    result.errorMessage ? `  Error: ${result.errorMessage}` : null,
    ...result.aliasAttempts.map((attempt) => `  Alias ${attempt.timeframeAlias}: ${attempt.succeeded ? 'ok' : 'failed'} raw=${attempt.rawBarCount} completed=${attempt.completedBarCount}${attempt.errorMessage ? ` error=${attempt.errorMessage}` : ''}`),
  ];
  return lines.filter(Boolean) as string[];
}

export function formatBridgeHistorySmokeReport(report: BridgeHistorySmokeReport): string {
  return [
    `[BRIDGE HISTORY SMOKE] ${report.instrument}`,
    `Bridge instrument: ${report.bridgeInstrument}`,
    `Bridge URL: ${report.bridgeUrl}`,
    `Window: ${report.dateWindowTested.date} ${report.dateWindowTested.from}-${report.dateWindowTested.to}`,
    '',
    'Primary timeframe results:',
    ...report.timeframeResults.flatMap(formatResult),
    '',
    'Fallback results:',
    ...(report.fallbackResults.length ? report.fallbackResults.flatMap(formatResult) : ['- none']),
    '',
    `Live/recent bars available: ${report.liveRecentBarsAvailable ? 'yes' : 'no'}`,
    `Historical bars available: ${report.historicalBarsAvailable ? 'yes' : 'no'}`,
    `Completed historical bars available: ${report.completedBarsAvailable ? 'yes' : 'no'}`,
    `Best working timeframe: ${report.bestWorkingTimeframe || 'none'}`,
    `Likely cause: ${report.likelyCause}`,
    `Recommended fix: ${report.recommendedFix}`,
    `Safe next step: ${report.safeNextStep}`,
    '',
    'Authority: diagnostic only. No trading rules, scanner behavior, bridge behavior, Discord alerts, or RAG writes changed.',
  ].join('\n');
}

export async function runBridgeHistorySmokeCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseBridgeHistorySmokeArgs(rawArgs);
  const report = await runBridgeHistorySmoke(options);
  if (options.json) console.log(JSON.stringify(report, null, 2));
  if (options.pretty) console.log(formatBridgeHistorySmokeReport(report));
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tools/automation/bridge-history-smoke.ts')) {
  runBridgeHistorySmokeCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

export const bridgeHistorySmokePaths = {
  script: path.join(__dirname, 'bridge-history-smoke.ts'),
};
