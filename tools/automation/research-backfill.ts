import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getNinjaHistoricalBars,
  type NinjaBridgeBar,
  type NinjaBridgeTimeframe,
} from '../../src/lib/ninjaTraderBridge';
import { parseBridgeTime } from '../../src/lib/localScannerEngine';
import {
  runHistoricalResearchBackfill,
  type HistoricalResearchBackfillInput,
  type HistoricalResearchBackfillReport,
  type HistoricalResearchBarCoverage,
  type HistoricalResearchDetectorAudit,
  type HistoricalResearchPerDateBarCoverage,
  type HistoricalResearchSourceCoverage,
  type ResearchBackfillConceptId,
  type ResearchBackfillConceptSelector,
  type ResearchBackfillEvent,
} from '../../src/agents/historicalResearchBackfillAgent';
import { loadDiscordAuditHistory } from './scanner-audit-import';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

type Instrument = 'MES' | 'MNQ';
type BarTimestampMode = 'open' | 'close';
type BarTimeZoneMode = 'eastern' | 'central' | 'pacific' | 'local';
type BackfillSource = 'local' | 'supabase' | 'both';

export interface ResearchBackfillCliOptions {
  from: string;
  to: string;
  instrument: Instrument;
  bridgeInstrument: string | null;
  bridgeUrl: string;
  barTimestampMode: BarTimestampMode;
  barTimeZone: BarTimeZoneMode;
  source: BackfillSource;
  concept: ResearchBackfillConceptSelector;
  out: string;
  json: boolean;
  pretty: boolean;
  discord: boolean;
  auditDir: string;
  diagnosticDir: string;
  researchDir: string;
  outcomeObservationBars: number;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_BRIDGE_URL = process.env.NINJATRADER_BRIDGE_URL || 'http://127.0.0.1:8765';
const DEFAULT_OUT_DIR = path.join(__dirname, 'research-reports');
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'discord-audit');
const DEFAULT_DIAGNOSTIC_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_RESEARCH_DIR = path.resolve(__dirname, '../../docs/research');
const HISTORICAL_BRIDGE_TIMEFRAMES: Array<{ requested: NinjaBridgeTimeframe; report: HistoricalResearchBarCoverage['timeframe'] }> = [
  { requested: '5m', report: '5m' },
  { requested: '15m', report: '15m' },
  { requested: '60m', report: '60m' },
  { requested: '240m', report: '240m' },
];
const RESEARCH_BRIDGE_WINDOWS = [
  { key: 'london_window', from: '03:00', to: '04:00' },
  { key: 'rth_research_session', from: '09:30', to: '16:00' },
] as const;

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

function boolValue(value: string | null, fallback: boolean): boolean {
  if (value === null) return fallback;
  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
}

function etDate(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function requireDate(value: string | null, flag: string): string {
  if (value === 'auto') return etDate();
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${flag} must use YYYY-MM-DD format or auto.`);
  return value;
}

function assertConcept(value: string | null): ResearchBackfillConceptSelector {
  const concept = (value || 'all').toLowerCase();
  const allowed = [
    'all',
    'time_window_liquidity_delivery',
    'false_run_liquidity_fade',
    'amd_range_model',
    'final_hour_liquidity_draw',
  ];
  if (!allowed.includes(concept)) throw new Error('--concept must be all or a supported research concept id.');
  return concept as ResearchBackfillConceptSelector;
}

export function parseResearchBackfillArgs(args = process.argv.slice(2)): ResearchBackfillCliOptions {
  const instrument = (readFlag(args, '--instrument') || 'MES').toUpperCase();
  if (instrument !== 'MES' && instrument !== 'MNQ') throw new Error('--instrument must be MES or MNQ.');
  const timestampMode = (readFlag(args, '--bar-timestamp-mode') || 'open').toLowerCase();
  if (timestampMode !== 'open' && timestampMode !== 'close') throw new Error('--bar-timestamp-mode must be open or close.');
  const timeZone = (readFlag(args, '--bar-time-zone') || 'eastern').toLowerCase();
  if (timeZone !== 'eastern' && timeZone !== 'central' && timeZone !== 'pacific' && timeZone !== 'local') {
    throw new Error('--bar-time-zone must be eastern, central, pacific, or local.');
  }
  const source = (readFlag(args, '--source') || 'both').toLowerCase();
  if (source !== 'local' && source !== 'supabase' && source !== 'both') throw new Error('--source must be local, supabase, or both.');
  return {
    from: requireDate(readFlag(args, '--from') || '2026-01-01', '--from'),
    to: requireDate(readFlag(args, '--to') || 'auto', '--to'),
    instrument,
    bridgeInstrument: readFlag(args, '--bridge-instrument'),
    bridgeUrl: readFlag(args, '--bridge-url') || DEFAULT_BRIDGE_URL,
    barTimestampMode: timestampMode,
    barTimeZone: timeZone,
    source,
    concept: assertConcept(readFlag(args, '--concept')),
    out: readFlag(args, '--out') || DEFAULT_OUT_DIR,
    json: hasFlag(args, '--json'),
    pretty: hasFlag(args, '--pretty') || !hasFlag(args, '--json'),
    discord: boolValue(readFlag(args, '--discord'), false),
    auditDir: readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR,
    diagnosticDir: readFlag(args, '--diagnostic-dir') || DEFAULT_DIAGNOSTIC_DIR,
    researchDir: readFlag(args, '--research-dir') || DEFAULT_RESEARCH_DIR,
    outcomeObservationBars: Math.max(1, Number.parseInt(readFlag(args, '--outcome-observation-bars') || '12', 10) || 12),
  };
}

function timeframeMinutes(timeframe: NinjaBridgeTimeframe): number {
  if (timeframe === '1m') return 1;
  if (timeframe === '15m') return 15;
  if (timeframe === '60m' || timeframe === '1h') return 60;
  if (timeframe === '240m' || timeframe === '4h') return 240;
  return 5;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(dateText: string, days: number): string {
  const date = new Date(`${dateText}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDate(date);
}

function datesBetween(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let cursor = from; cursor <= to; cursor = addDays(cursor, 1)) {
    dates.push(cursor);
  }
  return dates;
}

function addCoverage(
  aggregate: Map<HistoricalResearchBarCoverage['timeframe'], HistoricalResearchBarCoverage>,
  timeframe: HistoricalResearchBarCoverage['timeframe'],
  delta: Partial<Omit<HistoricalResearchBarCoverage, 'timeframe'>>,
): void {
  const current = aggregate.get(timeframe) || barCoverageFor(timeframe, 0, 0);
  aggregate.set(timeframe, {
    timeframe,
    rawBarsLoaded: current.rawBarsLoaded + (delta.rawBarsLoaded || 0),
    barsFilteredIncomplete: current.barsFilteredIncomplete + (delta.barsFilteredIncomplete || 0),
    completedBarsRemaining: current.completedBarsRemaining + (delta.completedBarsRemaining || 0),
    invalidTimestampCount: (current.invalidTimestampCount || 0) + (delta.invalidTimestampCount || 0),
    invalidOhlcCount: (current.invalidOhlcCount || 0) + (delta.invalidOhlcCount || 0),
    requestFailures: (current.requestFailures || 0) + (delta.requestFailures || 0),
  });
}

export function filterCompletedBars(
  bars: NinjaBridgeBar[],
  timeframe: NinjaBridgeTimeframe,
  timestampMode: BarTimestampMode,
  timeZone: BarTimeZoneMode,
  now = new Date(),
): NinjaBridgeBar[] {
  return diagnoseBackfillBars(bars, timeframe, timestampMode, timeZone, now).completedBars;
}

function isValidOhlc(bar: NinjaBridgeBar): boolean {
  return [bar.open, bar.high, bar.low, bar.close].every((value) => typeof value === 'number' && Number.isFinite(value) && value > 0) &&
    bar.high >= Math.max(bar.open, bar.close) &&
    bar.low <= Math.min(bar.open, bar.close);
}

function diagnoseBackfillBars(
  bars: NinjaBridgeBar[],
  timeframe: NinjaBridgeTimeframe,
  timestampMode: BarTimestampMode,
  timeZone: BarTimeZoneMode,
  now = new Date(),
): {
  completedBars: NinjaBridgeBar[];
  barsFilteredIncomplete: number;
  invalidTimestampCount: number;
  invalidOhlcCount: number;
} {
  const minutes = timeframeMinutes(timeframe);
  const completedBars: NinjaBridgeBar[] = [];
  let barsFilteredIncomplete = 0;
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
    const completedAt = timestampMode === 'close'
      ? parsed.getTime()
      : parsed.getTime() + minutes * 60_000;
    if (completedAt <= now.getTime()) {
      completedBars.push(bar);
    } else {
      barsFilteredIncomplete += 1;
    }
  }

  return { completedBars, barsFilteredIncomplete, invalidTimestampCount, invalidOhlcCount };
}

function barCoverageFor(
  timeframe: HistoricalResearchBarCoverage['timeframe'],
  rawBarsLoaded: number,
  completedBarsRemaining: number,
  barsFilteredIncomplete = 0,
  invalidTimestampCount = 0,
  invalidOhlcCount = 0,
  requestFailures = 0,
): HistoricalResearchBarCoverage {
  return {
    timeframe,
    rawBarsLoaded,
    barsFilteredIncomplete,
    completedBarsRemaining,
    invalidTimestampCount,
    invalidOhlcCount,
    requestFailures,
  };
}

async function readJsonFiles(dir: string): Promise<unknown[]> {
  if (!existsSync(dir)) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const values: unknown[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    try {
      values.push(JSON.parse(await fs.readFile(path.join(dir, entry.name), 'utf8')));
    } catch {
      values.push({ readError: `Could not parse ${entry.name}` });
    }
  }
  return values;
}

async function readResearchNotes(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const notes: string[] = [];
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.md')) notes.push(entry.name);
  }
  return notes;
}

async function fetchCompletedBridgeBars(options: ResearchBackfillCliOptions, warnings: string[]): Promise<{
  bars5m: NinjaBridgeBar[];
  barCoverage: HistoricalResearchBarCoverage[];
  perDateBarCoverage: HistoricalResearchPerDateBarCoverage[];
}> {
  if (options.source === 'supabase') {
    return {
      bars5m: [],
      barCoverage: [
        barCoverageFor('5m', 0, 0),
        barCoverageFor('15m', 0, 0),
        barCoverageFor('60m', 0, 0),
        barCoverageFor('240m', 0, 0),
        barCoverageFor('daily', 0, 0),
      ],
      perDateBarCoverage: [],
    };
  }
  const instrument = options.bridgeInstrument || `${options.instrument} 06-26`;
  const perDateBarCoverage: HistoricalResearchPerDateBarCoverage[] = [];
  const bars5mByKey = new Map<string, NinjaBridgeBar>();
  const aggregate = new Map<HistoricalResearchBarCoverage['timeframe'], HistoricalResearchBarCoverage>();
  for (const timeframe of HISTORICAL_BRIDGE_TIMEFRAMES) {
    aggregate.set(timeframe.report, barCoverageFor(timeframe.report, 0, 0));
  }

  for (const date of datesBetween(options.from, options.to)) {
    for (const window of RESEARCH_BRIDGE_WINDOWS) {
      const from = `${date}T${window.from}:00`;
      const to = `${date}T${window.to}:00`;
      for (const timeframe of HISTORICAL_BRIDGE_TIMEFRAMES) {
        try {
          const response = await getNinjaHistoricalBars({
            instrument,
            timeframe: timeframe.requested,
            from,
            to,
            limit: 5000,
            baseUrl: options.bridgeUrl,
          });
          const rawBars = response.bars || [];
          const diagnostics = diagnoseBackfillBars(rawBars, timeframe.requested, options.barTimestampMode, options.barTimeZone);
          addCoverage(aggregate, timeframe.report, {
            rawBarsLoaded: rawBars.length,
            completedBarsRemaining: diagnostics.completedBars.length,
            barsFilteredIncomplete: diagnostics.barsFilteredIncomplete,
            invalidTimestampCount: diagnostics.invalidTimestampCount,
            invalidOhlcCount: diagnostics.invalidOhlcCount,
            requestFailures: response.ok === false ? 1 : 0,
          });
          perDateBarCoverage.push({
            date,
            window: window.key,
            timeframe: timeframe.report as HistoricalResearchPerDateBarCoverage['timeframe'],
            from,
            to,
            rawBarsLoaded: rawBars.length,
            barsFilteredIncomplete: diagnostics.barsFilteredIncomplete,
            completedBarsRemaining: diagnostics.completedBars.length,
            invalidTimestampCount: diagnostics.invalidTimestampCount,
            invalidOhlcCount: diagnostics.invalidOhlcCount,
            requestFailed: response.ok === false,
            errorMessage: response.ok === false ? response.error || 'Bridge returned ok=false.' : null,
          });
          if (response.ok === false) warnings.push(`Local bridge ${date} ${window.key} ${timeframe.requested} returned ok=false: ${response.error || 'unknown error'}`);
          if (timeframe.requested === '5m') {
            for (const bar of diagnostics.completedBars) bars5mByKey.set(`${bar.time}|${bar.open}|${bar.high}|${bar.low}|${bar.close}`, bar);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          warnings.push(`Local bridge ${date} ${window.key} ${timeframe.requested} data unavailable: ${message}`);
          addCoverage(aggregate, timeframe.report, { requestFailures: 1 });
          perDateBarCoverage.push({
            date,
            window: window.key,
            timeframe: timeframe.report as HistoricalResearchPerDateBarCoverage['timeframe'],
            from,
            to,
            rawBarsLoaded: 0,
            barsFilteredIncomplete: 0,
            completedBarsRemaining: 0,
            invalidTimestampCount: 0,
            invalidOhlcCount: 0,
            requestFailed: true,
            errorMessage: message,
          });
        }
      }
    }
  }
  const coverage = HISTORICAL_BRIDGE_TIMEFRAMES.map((timeframe) => aggregate.get(timeframe.report) || barCoverageFor(timeframe.report, 0, 0));
  coverage.push(barCoverageFor('daily', 0, 0));
  warnings.push('Daily bridge bars are not requested in this phase because the current local bridge timeframe contract does not expose a daily historical timeframe.');
  return {
    bars5m: [...bars5mByKey.values()].sort((a, b) => a.time.localeCompare(b.time)),
    barCoverage: coverage,
    perDateBarCoverage,
  };
}

async function loadSupabaseRecords(options: ResearchBackfillCliOptions, warnings: string[]): Promise<unknown[]> {
  if (options.source === 'local') return [];
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    warnings.push('Supabase config unavailable; continued with local/audit data only.');
    return [];
  }
  try {
    const client = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
    const { data, error } = await client
      .from('trade_embeddings')
      .select('*')
      .gte('created_at', `${options.from}T00:00:00`)
      .lte('created_at', `${options.to}T23:59:59`)
      .limit(1000);
    if (error) {
      warnings.push(`Supabase read unavailable: ${error.message}`);
      return [];
    }
    return data || [];
  } catch (error) {
    warnings.push(`Supabase read unavailable: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

function dateFromBar(bar: NinjaBridgeBar): string {
  return bar.time.slice(0, 10);
}

function clockFromBar(bar: NinjaBridgeBar): string {
  const match = bar.time.match(/T(\d{2}:\d{2})/);
  return match?.[1] || bar.time.slice(11, 16);
}

function timeIn(clock: string, from: string, to: string): boolean {
  return clock >= from && clock <= to;
}

function groupBarsByDate(bars: NinjaBridgeBar[]): Map<string, NinjaBridgeBar[]> {
  const map = new Map<string, NinjaBridgeBar[]>();
  for (const bar of bars) {
    const date = dateFromBar(bar);
    map.set(date, [...(map.get(date) || []), bar]);
  }
  return map;
}

function hasThreeBarInefficiency(bars: NinjaBridgeBar[]): boolean {
  for (let index = 2; index < bars.length; index += 1) {
    const first = bars[index - 2];
    const third = bars[index];
    if (first.high < third.low || first.low > third.high) return true;
  }
  return false;
}

function rangeOf(bars: NinjaBridgeBar[]): number {
  if (!bars.length) return 0;
  return Math.max(...bars.map((bar) => bar.high)) - Math.min(...bars.map((bar) => bar.low));
}

function deriveEventsFromBars(bars: NinjaBridgeBar[]): ResearchBackfillEvent[] {
  const events: ResearchBackfillEvent[] = [];
  for (const [date, dayBars] of groupBarsByDate(bars)) {
    const sorted = [...dayBars].sort((a, b) => a.time.localeCompare(b.time));
    const dayHigh = Math.max(...sorted.map((bar) => bar.high));
    const dayLow = Math.min(...sorted.map((bar) => bar.low));
    const windows = [
      { label: '3:00-4:00 NY', from: '03:00', to: '04:00' },
      { label: '10:00-11:00 NY', from: '10:00', to: '11:00' },
      { label: '2:00-3:00 NY', from: '14:00', to: '15:00' },
    ];
    for (const window of windows) {
      const windowBars = sorted.filter((bar) => timeIn(clockFromBar(bar), window.from, window.to));
      if (windowBars.length >= 3 && rangeOf(windowBars) >= 8) {
        const first = windowBars[0];
        const last = windowBars[windowBars.length - 1];
        events.push({
          concept: 'time_window_liquidity_delivery',
          date,
          time: clockFromBar(first),
          direction: last.close >= first.open ? 'LONG' : 'SHORT',
          window: window.label,
          summary: `Defined window showed liquidity-delivery range expansion of ${rangeOf(windowBars).toFixed(2)} points.`,
          classification: 'advisory_only',
          drawIdentified: true,
          fvgOrInefficiency: hasThreeBarInefficiency(windowBars),
          failureReasons: ['Approved no installed model path gates were not evaluated by research backfill.'],
        });
      }
    }

    const highIndex = sorted.findIndex((bar) => bar.high === dayHigh);
    if (highIndex >= 0) {
      const afterHigh = sorted.slice(highIndex + 1);
      const sellSideMove = afterHigh.some((bar) => bar.close <= dayHigh - 8);
      if (sellSideMove) {
        events.push({
          concept: 'false_run_liquidity_fade',
          date,
          time: clockFromBar(sorted[highIndex]),
          direction: 'SHORT',
          window: 'regular_session',
          summary: 'Price pressed a major intraday high and later delivered back toward sell-side liquidity.',
          classification: 'advisory_only',
          reachedDrawAfterFact: true,
          failedOrReversed: true,
          warningPatterns: ['False-run behavior needs historical reversal pattern validation before no installed model path mapping.'],
        });
      }
    }

    const openingBars = sorted.filter((bar) => timeIn(clockFromBar(bar), '09:30', '10:00'));
    const laterBars = sorted.filter((bar) => timeIn(clockFromBar(bar), '10:00', '11:30'));
    if (openingBars.length >= 3 && laterBars.length >= 3 && rangeOf(openingBars) <= 10 && rangeOf(laterBars) >= 12) {
      const first = openingBars[0];
      const last = laterBars[laterBars.length - 1];
      events.push({
        concept: 'amd_range_model',
        date,
        time: clockFromBar(first),
        direction: last.close >= first.open ? 'LONG' : 'SHORT',
        window: 'opening_reference',
        summary: 'Open-based accumulation followed by later range expansion was observed.',
        classification: 'advisory_only',
        accumulationZone: true,
        manipulationLeg: true,
        distributionFollowThrough: true,
        failureReasons: ['AMD narrative is research-only unless no installed model path gates independently pass.'],
      });
    }

    const finalHour = sorted.filter((bar) => timeIn(clockFromBar(bar), '15:15', '15:45'));
    if (finalHour.length >= 3 && rangeOf(finalHour) >= 6) {
      const first = finalHour[0];
      const last = finalHour[finalHour.length - 1];
      events.push({
        concept: 'final_hour_liquidity_draw',
        date,
        time: clockFromBar(first),
        direction: last.close >= first.open ? 'LONG' : 'SHORT',
        window: '3:15-3:45 NY',
        summary: 'Final-hour range expansion showed a possible liquidity draw condition.',
        classification: 'advisory_only',
        cleanLiquidityDraw: true,
        footholdPresent: hasThreeBarInefficiency(finalHour),
        failureReasons: ['Final-hour condition remains advisory-only unless current approved gates pass independently.'],
      });
    }

    if (dayHigh - dayLow < 5) {
      events.push({
        concept: 'time_window_liquidity_delivery',
        date,
        time: null,
        direction: 'NO TRADE',
        window: null,
        summary: 'Low-range day did not produce a meaningful research condition.',
        classification: 'advisory_only',
        failureReasons: ['No meaningful range expansion.'],
      });
    }
  }
  return events;
}

function deriveEventsFromRecords(records: unknown[]): ResearchBackfillEvent[] {
  const events: ResearchBackfillEvent[] = [];
  for (const value of records) {
    if (!value || typeof value !== 'object') continue;
    const record = value as Record<string, unknown>;
    const classification = String(record.finalClassification || '');
    if (classification === 'C_UNAPPROVED_ICT_FVG_WATCHLIST') {
      events.push({
        concept: 'final_hour_liquidity_draw',
        date: String(record.tradeDate || record.date || 'unknown'),
        time: null,
        direction: String(record.suspectedMoveDirection || record.direction || 'NO TRADE') as ResearchBackfillEvent['direction'],
        window: 'diagnostic_replay',
        summary: 'Existing diagnostic report classified the event as advisory-only ICT-style watchlist context.',
        classification: 'advisory_only',
        cleanLiquidityDraw: true,
        failureReasons: ['Existing diagnostic report did not approve an executable setup.'],
      });
    }
    if (classification === 'A_VALID_APPROVED_NO_ALERT' || classification === 'B_APPROVED_ALREADY_TRIGGERED') {
      events.push({
        concept: 'time_window_liquidity_delivery',
        date: String(record.tradeDate || record.date || 'unknown'),
        time: null,
        direction: String(record.suspectedMoveDirection || record.direction || 'NO TRADE') as ResearchBackfillEvent['direction'],
        window: 'diagnostic_replay',
        summary: 'Existing diagnostic report found an approved-model overlap.',
        classification: 'model1_overlap',
        model1Overlap: true,
      });
    }
  }
  return events;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function deriveEventsFromAuditRecords(records: unknown[]): ResearchBackfillEvent[] {
  const events: ResearchBackfillEvent[] = [];
  for (const value of records) {
    const record = asRecord(value);
    const researchConcept = String(record.researchConcept || record.concept || '');
    if (!researchConcept) continue;
    const conceptMap: Record<string, ResearchBackfillConceptId> = {
      time_window_liquidity_delivery: 'time_window_liquidity_delivery',
      false_run_liquidity_fade: 'false_run_liquidity_fade',
      amd_range_model: 'amd_range_model',
      final_hour_liquidity_draw: 'final_hour_liquidity_draw',
    };
    const concept = conceptMap[researchConcept];
    if (!concept) continue;
    events.push({
      concept,
      date: String(record.tradeDate || record.date || 'unknown'),
      time: typeof record.alertTimestamp === 'string' ? record.alertTimestamp.slice(11, 16) : null,
      direction: String(record.direction || 'NO TRADE') as ResearchBackfillEvent['direction'],
      window: String(record.session || record.alertType || 'audit_history'),
      summary: 'Audit record carried an explicit research concept tag.',
      classification: 'advisory_only',
      failureReasons: ['Audit-derived research event remains advisory-only.'],
    });
  }
  return events;
}

function uniqueDates(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function buildSourceCoverage(
  options: ResearchBackfillCliOptions,
  completedBars5m: NinjaBridgeBar[],
  auditRecords: unknown[],
  diagnosticReports: unknown[],
  supabaseRecords: unknown[],
  perDateBarCoverage: HistoricalResearchPerDateBarCoverage[],
): HistoricalResearchSourceCoverage {
  const localBridgeDatesScanned = uniqueDates(completedBars5m.map((bar) => bar.time.slice(0, 10)));
  const requestedDates = datesBetween(options.from, options.to);
  const completedDateSet = new Set(localBridgeDatesScanned);
  const failuresByDate = new Map<string, HistoricalResearchPerDateBarCoverage[]>();
  for (const coverage of perDateBarCoverage) {
    failuresByDate.set(coverage.date, [...(failuresByDate.get(coverage.date) || []), coverage]);
  }
  const skippedDates = requestedDates.filter((date) => {
    const rows = failuresByDate.get(date) || [];
    return rows.length > 0 && rows.every((row) => row.requestFailed);
  });
  return {
    localBridgeDatesScanned,
    supabaseRecordsScanned: supabaseRecords.length,
    auditJsonRecordsScanned: auditRecords.length,
    diagnosticReportsScanned: diagnosticReports.length,
    skippedDates,
    missingDataDates: requestedDates.filter((date) => !completedDateSet.has(date)),
    perDateBarCoverage,
  };
}

function buildDetectorAudit(events: ResearchBackfillEvent[], auditRecords: unknown[], completedBars5m: NinjaBridgeBar[]): Partial<Record<ResearchBackfillConceptId, HistoricalResearchDetectorAudit>> {
  const dateUniverse = uniqueDates([
    ...completedBars5m.map((bar) => bar.time.slice(0, 10)),
    ...auditRecords.map((record) => String(asRecord(record).tradeDate || '').slice(0, 10)).filter(Boolean),
  ]);
  const concepts: ResearchBackfillConceptId[] = [
    'time_window_liquidity_delivery',
    'false_run_liquidity_fade',
    'amd_range_model',
    'final_hour_liquidity_draw',
  ];
  const result: Partial<Record<ResearchBackfillConceptId, HistoricalResearchDetectorAudit>> = {};
  for (const concept of concepts) {
    const conceptEvents = events.filter((event) => event.concept === concept);
    const auditTaggedForConcept = auditRecords.filter((record) => String(asRecord(record).researchConcept || asRecord(record).concept || '') === concept).length;
    const rawCandidatePrefilterCount = conceptEvents.length + auditTaggedForConcept;
    const rejectedCount = auditRecords.length - auditTaggedForConcept;
    const topRejectionReasons = [
      completedBars5m.length ? '' : 'No completed 5M bars loaded for bar-based detector.',
      auditRecords.length ? 'Audit records scanned but most do not carry researchConcept tags or diagnostic classifications.' : 'No audit JSON records available.',
      rawCandidatePrefilterCount ? '' : 'No bar-based or record-based prefilter candidate matched this concept.',
    ].filter(Boolean);
    result[concept] = {
      conceptId: concept,
      datesEvaluated: dateUniverse,
      rawCandidatePrefilterCount,
      rejectedCount,
      topRejectionReasons,
      finalCandidateCount: conceptEvents.length,
    };
  }
  return result;
}

export async function buildHistoricalResearchBackfillInput(options: ResearchBackfillCliOptions): Promise<HistoricalResearchBackfillInput> {
  const dataWarnings: string[] = [];
  const bridgeData = await fetchCompletedBridgeBars(options, dataWarnings);
  const completedBars5m = bridgeData.bars5m;
  const supabaseRecords = await loadSupabaseRecords(options, dataWarnings);
  const auditHistory = await loadDiscordAuditHistory(options.auditDir);
  const diagnosticReports = await readJsonFiles(options.diagnosticDir);
  const existingResearchNotes = await readResearchNotes(options.researchDir);
  const events = [
    ...deriveEventsFromBars(completedBars5m),
    ...deriveEventsFromRecords(diagnosticReports),
    ...deriveEventsFromRecords(supabaseRecords),
    ...deriveEventsFromAuditRecords(auditHistory.events),
  ];
  const sourceCoverage = buildSourceCoverage(options, completedBars5m, auditHistory.events, diagnosticReports, supabaseRecords, bridgeData.perDateBarCoverage);
  const detectorAudit = buildDetectorAudit(events, auditHistory.events, completedBars5m);

  return {
    from: options.from,
    to: options.to,
    instrument: options.instrument,
    selectedConcept: options.concept,
    completedBars5m,
    supabaseRecords,
    auditRecords: auditHistory.events,
    diagnosticReports,
    existingResearchNotes,
    sourceCoverage,
    barCoverage: bridgeData.barCoverage,
    detectorAudit,
    dataWarnings: [...dataWarnings, ...auditHistory.warnings],
    events,
    outcomeObservationBars: options.outcomeObservationBars,
  };
}

function outputFiles(options: ResearchBackfillCliOptions, report: HistoricalResearchBackfillReport): { jsonFile: string; markdownFile: string } {
  const resolved = path.resolve(options.out);
  const base = path.extname(resolved)
    ? resolved.slice(0, -path.extname(resolved).length)
    : path.join(resolved, `research-backfill-${report.instrument}-${report.from}-to-${report.to}`);
  return {
    jsonFile: `${base}.json`,
    markdownFile: `${base}.md`,
  };
}

function writeReports(options: ResearchBackfillCliOptions, report: HistoricalResearchBackfillReport): { jsonFile: string; markdownFile: string } {
  const files = outputFiles(options, report);
  mkdirSync(path.dirname(files.jsonFile), { recursive: true });
  writeFileSync(files.jsonFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(files.markdownFile, `${report.markdown}\n`, 'utf8');
  return files;
}

function compactDiscordReadableSummary(report: HistoricalResearchBackfillReport): string {
  const candidates = report.fullCandidateEvents || [];
  const withObservationWindows = candidates.filter((candidate) => (candidate.postSignalBars || []).length > 0).length;
  const observationBarsSetting = candidates[0]?.observationWindowMinutes ? Math.max(1, candidates[0].observationWindowMinutes / 5) : 12;
  return [
    `[RESEARCH BACKFILL] ${report.instrument}`,
    `Range: ${report.from} to ${report.to}`,
    '',
    'Summary:',
    ...report.executiveSummary.map((line) => `- ${line}`),
    `- Total persisted candidates: ${candidates.length}`,
    `- Candidates with observation windows: ${withObservationWindows}`,
    `- Candidates without observation windows: ${candidates.length - withObservationWindows}`,
    `- Observation bars setting: ${observationBarsSetting}`,
    '- Advisory-only confirmation: yes',
    '',
    'Concepts:',
    ...report.conceptReports.map((concept) => `- ${concept.title}: ${concept.totalCandidates} candidate(s), ${concept.advisoryOnlyCount} advisory-only, rule change: ${concept.ruleChangeRecommendation}.`),
    ...(report.zeroCandidateExplanation.length ? ['', 'Zero-candidate explanation:', ...report.zeroCandidateExplanation.map((line) => `- ${line}`)] : []),
    '',
    'Authority: research-only. No entries, stops, T1/T2, outcome buttons, model promotion, or rule changes.',
  ].join('\n');
}

export async function runResearchBackfillCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseResearchBackfillArgs(rawArgs);
  const input = await buildHistoricalResearchBackfillInput(options);
  const report = runHistoricalResearchBackfill(input);
  const files = writeReports(options, report);
  console.log(`Research backfill saved: ${files.jsonFile}`);
  console.log(`Research backfill markdown saved: ${files.markdownFile}`);

  if (options.discord) {
    console.log('Research backfill Discord posting is not enabled in this phase; report was generated for Discord-readable review only.');
  }

  if (options.json) console.log(JSON.stringify(report, null, 2));
  if (options.pretty) console.log(compactDiscordReadableSummary(report));
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tools/automation/research-backfill.ts')) {
  runResearchBackfillCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
