import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertNoExecutableLedgerFields } from './model-candidate-ledger';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

type AuditWindowCode = 'LONDON' | 'AM' | 'PM';
type AuditWindowId =
  | 'london_liquidity_delivery_window'
  | 'am_liquidity_delivery_window'
  | 'pm_liquidity_delivery_window';
type OverlapClassification =
  | 'model_1_overlap_possible'
  | 'RAID_RECLAIM_overlap_possible'
  | 'advisory_only_time_window_research';

interface AuditOptions {
  symbol: string;
  from: string;
  to: string;
  window: AuditWindowCode;
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

interface WindowDefinition {
  code: AuditWindowCode;
  id: AuditWindowId;
  displayName: string;
  fromClock: string;
  toClock: string;
}

interface LiquidityReference {
  kind:
    | 'previous_day_high'
    | 'previous_day_low'
    | 'previous_session_high'
    | 'previous_session_low'
    | 'previous_week_high'
    | 'previous_week_low'
    | 'equal_highs'
    | 'equal_lows'
    | 'opening_range_high'
    | 'opening_range_low';
  price: number;
  distanceFromWindowOpen: number;
  reachedInsideWindow: boolean;
  roomAtWindowOpen: boolean;
}

interface WindowCandidateAudit {
  candidateId: string;
  date: string;
  symbol: string;
  windowId: AuditWindowId;
  windowLabel: string;
  barCount: number;
  windowHigh: number;
  windowLow: number;
  windowOpen: number;
  windowClose: number;
  windowRangeHandles: number;
  priorLiquidityReferences: LiquidityReference[];
  cleanDrawObserved: boolean;
  noDrawObserved: boolean;
  expectedDeliveryAvailable: boolean;
  expectedDeliveryHandles: number;
  expectedDeliveryTicks: number;
  deliveryAchieved: boolean;
  failedDelivery: boolean;
  fvgOrInefficiencyFormedInsideWindow: boolean;
  fvgOrInefficiencyRepricedInsideWindow: boolean;
  bodiesRespectedFvgOrInefficiency: boolean;
  marketStructureShiftPresent: boolean;
  sweepRaidPlusReclaimPresent: boolean;
  priceAlreadyReachedDrawBeforeSetup: boolean;
  riskWouldBeTooWideUnderCurrentApprovedRules: boolean;
  largerTimeframeContextConflictAvailable: boolean;
  overlapClassification: OverlapClassification;
  researchOnly: true;
  boundary: 'research_only_not_execution_authority';
  notes: string[];
}

export interface TimeWindowLiquidityDeliveryAuditReport {
  reportType: 'time_window_liquidity_delivery_audit';
  generatedAt: string;
  symbol: string;
  from: string;
  to: string;
  windowStudied: AuditWindowCode;
  windowDefinition: WindowDefinition;
  allWindowDefinitions: Record<AuditWindowCode, WindowDefinition>;
  source: {
    marketData: 'supabase_market_bars';
    timeframe: '5m';
    completedHistoricalBarsOnly: true;
  };
  boundary: 'research_only_not_execution_authority';
  researchOnlyWarning: string;
  evidenceCollectionThreshold: {
    minimumExamplesBeforeRuleReview: 20;
    preferredExamplesBeforeRuleReview: 30;
    currentExamples: number;
    readyForRuleReviewDiscussion: false;
    note: string;
  };
  summary: {
    barsRead: number;
    candidateCount: number;
    cleanDrawCount: number;
    noDrawCount: number;
    fvgOrInefficiencyCount: number;
    marketStructureShiftCount: number;
    deliveryAchievedCount: number;
    failedDeliveryCount: number;
    modelOneOverlapCount: number;
    raidReclaimOverlapCount: number;
    advisoryOnlyCount: number;
  };
  candidates: WindowCandidateAudit[];
  requiredNextActions: string[];
  outputPaths: {
    jsonPath: string;
    markdownPath: string;
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'time-window-liquidity-delivery');
const TICK_SIZE = 0.25;
const EXPECTED_DELIVERY_HANDLES = 10;

export const WINDOW_DEFINITIONS: Record<AuditWindowCode, WindowDefinition> = {
  LONDON: {
    code: 'LONDON',
    id: 'london_liquidity_delivery_window',
    displayName: 'London 3:00-4:00 NY',
    fromClock: '03:00',
    toClock: '04:00',
  },
  AM: {
    code: 'AM',
    id: 'am_liquidity_delivery_window',
    displayName: 'AM 10:00-11:00 NY',
    fromClock: '10:00',
    toClock: '11:00',
  },
  PM: {
    code: 'PM',
    id: 'pm_liquidity_delivery_window',
    displayName: 'PM 2:00-3:00 NY',
    fromClock: '14:00',
    toClock: '15:00',
  },
};

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

function parseWindow(value: string | null): AuditWindowCode {
  const normalized = (value || 'AM').toUpperCase();
  if (normalized !== 'AM' && normalized !== 'LONDON' && normalized !== 'PM') {
    throw new Error('--window must be AM, LONDON, or PM.');
  }
  return normalized;
}

export function parseTimeWindowLiquidityDeliveryArgs(args = process.argv.slice(2)): AuditOptions {
  const symbol = (readFlag(args, '--symbol') || 'MES').toUpperCase();
  if (symbol !== 'MES') throw new Error('Time-window liquidity-delivery research currently supports --symbol MES only.');
  return {
    symbol,
    from: requireDate(readFlag(args, '--from') || '2018-01-01', '--from'),
    to: requireDate(readFlag(args, '--to') || '2026-05-31', '--to'),
    window: parseWindow(readFlag(args, '--window')),
    outDir: readFlag(args, '--out') || DEFAULT_OUT_DIR,
    pretty: hasFlag(args, '--pretty') || !hasFlag(args, '--json'),
    json: hasFlag(args, '--json'),
  };
}

function asNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeTime(value: string): string {
  return value.replace(/Z$/, '').replace(/[+-]\d{2}:\d{2}$/, '').slice(0, 19);
}

async function fetchMarketBars(options: AuditOptions): Promise<Bar[]> {
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
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await client
      .from('market_bars')
      .select('candle_time_et,open,high,low,close,volume')
      .eq('instrument', options.symbol)
      .eq('timeframe', '5m')
      .gte('candle_time_et', `${options.from}T00:00:00`)
      .lte('candle_time_et', `${options.to}T23:59:59`)
      .order('candle_time_et', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`market_bars read failed: ${error.message}`);
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
  return bars.filter((bar) =>
    bar.open > 0 &&
    bar.high >= Math.max(bar.open, bar.close) &&
    bar.low <= Math.min(bar.open, bar.close)
  );
}

function clockFromBar(bar: Bar): string {
  return bar.time.slice(11, 16);
}

function dateFromBar(bar: Bar): string {
  return bar.time.slice(0, 10);
}

function inWindow(clock: string, definition: WindowDefinition): boolean {
  return clock >= definition.fromClock && clock <= definition.toClock;
}

export function classifyLiquidityDeliveryWindow(bar: Pick<Bar, 'time'>): AuditWindowId | null {
  const clock = bar.time.slice(11, 16);
  for (const definition of Object.values(WINDOW_DEFINITIONS)) {
    if (inWindow(clock, definition)) return definition.id;
  }
  return null;
}

function groupBarsByDate(bars: Bar[]): Map<string, Bar[]> {
  const grouped = new Map<string, Bar[]>();
  for (const bar of bars) grouped.set(dateFromBar(bar), [...(grouped.get(dateFromBar(bar)) || []), bar]);
  return grouped;
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

function weekKey(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  const day = parsed.getUTCDay() || 7;
  parsed.setUTCDate(parsed.getUTCDate() - day + 1);
  return parsed.toISOString().slice(0, 10);
}

function priorWeekBars(allBeforeDate: Bar[], date: string): Bar[] {
  const thisWeek = weekKey(date);
  const priorWeeks = [...new Set(allBeforeDate.map((bar) => weekKey(dateFromBar(bar))).filter((key) => key < thisWeek))].sort();
  const priorWeek = priorWeeks.at(-1);
  return priorWeek ? allBeforeDate.filter((bar) => weekKey(dateFromBar(bar)) === priorWeek) : [];
}

function previousSessionBars(dayBars: Bar[], definition: WindowDefinition): Bar[] {
  const before = dayBars.filter((bar) => clockFromBar(bar) < definition.fromClock);
  if (definition.code === 'AM') return before.filter((bar) => clockFromBar(bar) >= '03:00' && clockFromBar(bar) < '09:30');
  if (definition.code === 'PM') return before.filter((bar) => clockFromBar(bar) >= '09:30' && clockFromBar(bar) < '12:00');
  return before.filter((bar) => clockFromBar(bar) < '03:00');
}

function openingRangeBars(dayBars: Bar[]): Bar[] {
  return dayBars.filter((bar) => clockFromBar(bar) >= '09:30' && clockFromBar(bar) <= '10:00');
}

function addReference(
  references: LiquidityReference[],
  kind: LiquidityReference['kind'],
  price: number | null,
  windowOpen: number,
  windowHigh: number,
  windowLow: number,
): void {
  if (price === null || !Number.isFinite(price)) return;
  const distance = round(Math.abs(price - windowOpen));
  references.push({
    kind,
    price: round(price),
    distanceFromWindowOpen: distance,
    reachedInsideWindow: windowLow <= price && windowHigh >= price,
    roomAtWindowOpen: distance >= EXPECTED_DELIVERY_HANDLES,
  });
}

function findEqualLevels(before: Bar[], side: 'high' | 'low'): number | null {
  const values = before.slice(-80).map((bar) => side === 'high' ? bar.high : bar.low);
  for (let i = values.length - 1; i >= 1; i -= 1) {
    for (let j = i - 1; j >= 0; j -= 1) {
      if (Math.abs(values[i] - values[j]) <= TICK_SIZE) return round((values[i] + values[j]) / 2);
    }
  }
  return null;
}

interface InefficiencyZone {
  upper: number;
  lower: number;
  direction: 'up' | 'down';
  index: number;
}

function inefficiencies(bars: Bar[]): InefficiencyZone[] {
  const zones: InefficiencyZone[] = [];
  for (let index = 2; index < bars.length; index += 1) {
    if (bars[index - 2].high < bars[index].low) {
      zones.push({ lower: bars[index - 2].high, upper: bars[index].low, direction: 'up', index });
    }
    if (bars[index - 2].low > bars[index].high) {
      zones.push({ lower: bars[index].high, upper: bars[index - 2].low, direction: 'down', index });
    }
  }
  return zones;
}

function zoneTouched(zone: InefficiencyZone, bar: Bar): boolean {
  return bar.low <= zone.upper && bar.high >= zone.lower;
}

function bodiesRespectZones(zones: InefficiencyZone[], bars: Bar[]): boolean {
  if (!zones.length) return false;
  return zones.some((zone) => bars.slice(zone.index + 1).some((bar) => {
    if (!zoneTouched(zone, bar)) return false;
    return zone.direction === 'up'
      ? Math.min(bar.open, bar.close) >= zone.lower
      : Math.max(bar.open, bar.close) <= zone.upper;
  }));
}

function structureShift(windowBars: Bar[]): boolean {
  if (windowBars.length < 6) return false;
  const firstHalf = windowBars.slice(0, Math.floor(windowBars.length / 2));
  const secondHalf = windowBars.slice(Math.floor(windowBars.length / 2));
  return high(secondHalf) > high(firstHalf) && low(secondHalf) > low(firstHalf) ||
    low(secondHalf) < low(firstHalf) && high(secondHalf) < high(firstHalf);
}

function sweepReclaim(windowBars: Bar[], references: LiquidityReference[]): boolean {
  return references.some((reference) => {
    if (!reference.reachedInsideWindow) return false;
    if (/low/.test(reference.kind)) return windowBars.some((bar) => bar.low <= reference.price && bar.close > reference.price);
    if (/high/.test(reference.kind)) return windowBars.some((bar) => bar.high >= reference.price && bar.close < reference.price);
    return false;
  });
}

function priceReachedBeforeWindow(dayBars: Bar[], definition: WindowDefinition, references: LiquidityReference[]): boolean {
  const before = dayBars.filter((bar) => clockFromBar(bar) < definition.fromClock);
  return references.some((reference) => before.some((bar) => bar.low <= reference.price && bar.high >= reference.price));
}

function buildCandidate(
  symbol: string,
  date: string,
  definition: WindowDefinition,
  dayBars: Bar[],
  allBeforeDate: Bar[],
): WindowCandidateAudit | null {
  const windowBars = dayBars.filter((bar) => inWindow(clockFromBar(bar), definition));
  if (windowBars.length < 3) return null;
  const windowOpen = windowBars[0].open;
  const windowClose = windowBars[windowBars.length - 1].close;
  const windowHigh = high(windowBars);
  const windowLow = low(windowBars);
  const priorDates = [...new Set(allBeforeDate.map(dateFromBar))].sort();
  const previousDate = priorDates.at(-1);
  const previousDayBars = previousDate ? allBeforeDate.filter((bar) => dateFromBar(bar) === previousDate) : [];
  const sessionBars = previousSessionBars(dayBars, definition);
  const weekBars = priorWeekBars(allBeforeDate, date);
  const beforeWindow = [...allBeforeDate, ...dayBars.filter((bar) => clockFromBar(bar) < definition.fromClock)];
  const opening = openingRangeBars(dayBars);
  const references: LiquidityReference[] = [];
  addReference(references, 'previous_day_high', previousDayBars.length ? high(previousDayBars) : null, windowOpen, windowHigh, windowLow);
  addReference(references, 'previous_day_low', previousDayBars.length ? low(previousDayBars) : null, windowOpen, windowHigh, windowLow);
  addReference(references, 'previous_session_high', sessionBars.length ? high(sessionBars) : null, windowOpen, windowHigh, windowLow);
  addReference(references, 'previous_session_low', sessionBars.length ? low(sessionBars) : null, windowOpen, windowHigh, windowLow);
  addReference(references, 'previous_week_high', weekBars.length ? high(weekBars) : null, windowOpen, windowHigh, windowLow);
  addReference(references, 'previous_week_low', weekBars.length ? low(weekBars) : null, windowOpen, windowHigh, windowLow);
  addReference(references, 'equal_highs', findEqualLevels(beforeWindow, 'high'), windowOpen, windowHigh, windowLow);
  addReference(references, 'equal_lows', findEqualLevels(beforeWindow, 'low'), windowOpen, windowHigh, windowLow);
  addReference(references, 'opening_range_high', opening.length ? high(opening) : null, windowOpen, windowHigh, windowLow);
  addReference(references, 'opening_range_low', opening.length ? low(opening) : null, windowOpen, windowHigh, windowLow);

  const cleanReferences = references.filter((reference) => reference.roomAtWindowOpen);
  const zones = inefficiencies(windowBars);
  const repriced = zones.some((zone) => windowBars.slice(zone.index + 1).some((bar) => zoneTouched(zone, bar)));
  const bodiesRespected = bodiesRespectZones(zones, windowBars);
  const mss = structureShift(windowBars);
  const sweep = sweepReclaim(windowBars, references);
  const alreadyReached = priceReachedBeforeWindow(dayBars, definition, cleanReferences);
  const expectedDeliveryHandles = cleanReferences.length
    ? round(Math.max(...cleanReferences.map((reference) => reference.distanceFromWindowOpen)))
    : 0;
  const deliveryAchieved = cleanReferences.some((reference) => reference.reachedInsideWindow);
  const cleanDrawObserved = cleanReferences.length > 0 && !alreadyReached;
  const riskWideObservation = windowHigh - windowLow > 40;
  const overlapClassification: OverlapClassification = zones.length && mss && sweep
    ? 'model_1_overlap_possible'
    : sweep
      ? 'RAID_RECLAIM_overlap_possible'
      : 'advisory_only_time_window_research';

  return {
    candidateId: `${definition.id}-${date}`,
    date,
    symbol,
    windowId: definition.id,
    windowLabel: definition.displayName,
    barCount: windowBars.length,
    windowHigh: round(windowHigh),
    windowLow: round(windowLow),
    windowOpen: round(windowOpen),
    windowClose: round(windowClose),
    windowRangeHandles: round(windowHigh - windowLow),
    priorLiquidityReferences: references,
    cleanDrawObserved,
    noDrawObserved: !cleanDrawObserved,
    expectedDeliveryAvailable: expectedDeliveryHandles >= EXPECTED_DELIVERY_HANDLES,
    expectedDeliveryHandles,
    expectedDeliveryTicks: round(expectedDeliveryHandles / TICK_SIZE),
    deliveryAchieved,
    failedDelivery: cleanDrawObserved && !deliveryAchieved,
    fvgOrInefficiencyFormedInsideWindow: zones.length > 0,
    fvgOrInefficiencyRepricedInsideWindow: repriced,
    bodiesRespectedFvgOrInefficiency: bodiesRespected,
    marketStructureShiftPresent: mss,
    sweepRaidPlusReclaimPresent: sweep,
    priceAlreadyReachedDrawBeforeSetup: alreadyReached,
    riskWouldBeTooWideUnderCurrentApprovedRules: riskWideObservation,
    largerTimeframeContextConflictAvailable: false,
    overlapClassification,
    researchOnly: true,
    boundary: 'research_only_not_execution_authority',
    notes: [
      'Research-only time-window observation. No executable setup is created.',
      overlapClassification === 'model_1_overlap_possible'
        ? 'Model 1 overlap is advisory classification only; use current approved Model 1 rules for any separate review.'
        : overlapClassification === 'RAID_RECLAIM_overlap_possible'
          ? 'Raid Reclaim Reversal overlap is advisory classification only; use current approved Raid Reclaim Reversal rules for any separate review.'
          : 'Advisory-only time-window research; no approved model overlap was inferred.',
    ],
  };
}

export function buildTimeWindowLiquidityDeliveryAuditReport(
  options: AuditOptions,
  bars: Bar[],
): TimeWindowLiquidityDeliveryAuditReport {
  const definition = WINDOW_DEFINITIONS[options.window];
  const grouped = groupBarsByDate(bars);
  const dates = [...grouped.keys()].sort();
  const candidates: WindowCandidateAudit[] = [];
  for (const date of dates) {
    const dayBars = [...(grouped.get(date) || [])].sort((a, b) => a.time.localeCompare(b.time));
    const before = bars.filter((bar) => dateFromBar(bar) < date);
    const candidate = buildCandidate(options.symbol, date, definition, dayBars, before);
    if (candidate) candidates.push(candidate);
  }
  const paths = outputPaths(options);
  const report: TimeWindowLiquidityDeliveryAuditReport = {
    reportType: 'time_window_liquidity_delivery_audit',
    generatedAt: new Date().toISOString(),
    symbol: options.symbol,
    from: options.from,
    to: options.to,
    windowStudied: options.window,
    windowDefinition: definition,
    allWindowDefinitions: WINDOW_DEFINITIONS,
    source: {
      marketData: 'supabase_market_bars',
      timeframe: '5m',
      completedHistoricalBarsOnly: true,
    },
    boundary: 'research_only_not_execution_authority',
    researchOnlyWarning: 'Research-only. This report does not approve trades and does not create execution authority.',
    evidenceCollectionThreshold: {
      minimumExamplesBeforeRuleReview: 20,
      preferredExamplesBeforeRuleReview: 30,
      currentExamples: candidates.length,
      readyForRuleReviewDiscussion: false,
      note: 'Collect 20-30 examples per window before any rule-review discussion. No window is approved by this report.',
    },
    summary: {
      barsRead: bars.length,
      candidateCount: candidates.length,
      cleanDrawCount: candidates.filter((candidate) => candidate.cleanDrawObserved).length,
      noDrawCount: candidates.filter((candidate) => candidate.noDrawObserved).length,
      fvgOrInefficiencyCount: candidates.filter((candidate) => candidate.fvgOrInefficiencyFormedInsideWindow).length,
      marketStructureShiftCount: candidates.filter((candidate) => candidate.marketStructureShiftPresent).length,
      deliveryAchievedCount: candidates.filter((candidate) => candidate.deliveryAchieved).length,
      failedDeliveryCount: candidates.filter((candidate) => candidate.failedDelivery).length,
      modelOneOverlapCount: candidates.filter((candidate) => candidate.overlapClassification === 'model_1_overlap_possible').length,
      raidReclaimOverlapCount: candidates.filter((candidate) => candidate.overlapClassification === 'RAID_RECLAIM_overlap_possible').length,
      advisoryOnlyCount: candidates.filter((candidate) => candidate.overlapClassification === 'advisory_only_time_window_research').length,
    },
    candidates,
    requiredNextActions: [
      'Review sample evidence cards manually before any rule-review discussion.',
      'Keep Model 1 and Raid Reclaim Reversal overlap as advisory classification only.',
      'Do not create entries, stops, T1/T2, outcome buttons, live alerts, or execution authority from this audit.',
      'Collect 20-30 examples per window before discussing any rules.',
    ],
    outputPaths: paths,
  };
  assertNoExecutableLedgerFields(report);
  return report;
}

function outputPaths(options: AuditOptions): TimeWindowLiquidityDeliveryAuditReport['outputPaths'] {
  const base = path.join(path.resolve(options.outDir), `time-window-liquidity-delivery-audit-${options.symbol}-${options.window}`);
  return { jsonPath: `${base}.json`, markdownPath: `${base}.md` };
}

function yesNo(value: boolean): string {
  return value ? 'Yes' : 'No';
}

export function renderTimeWindowLiquidityDeliveryMarkdown(report: TimeWindowLiquidityDeliveryAuditReport): string {
  return [
    `# Time-Window Liquidity Delivery Audit - ${report.symbol} ${report.windowStudied}`,
    '',
    report.researchOnlyWarning,
    'This report does not approve trades and does not create execution authority.',
    '',
    `Symbol: ${report.symbol}`,
    `Date range: ${report.from} to ${report.to}`,
    `Window studied: ${report.windowDefinition.displayName}`,
    `Boundary: ${report.boundary}`,
    '',
    '## Summary',
    `- Candidate count: ${report.summary.candidateCount}`,
    `- Clean draw count: ${report.summary.cleanDrawCount}`,
    `- No-draw count: ${report.summary.noDrawCount}`,
    `- FVG/inefficiency count: ${report.summary.fvgOrInefficiencyCount}`,
    `- MSS count: ${report.summary.marketStructureShiftCount}`,
    `- Delivery achieved count: ${report.summary.deliveryAchievedCount}`,
    `- Failed delivery count: ${report.summary.failedDeliveryCount}`,
    `- Model 1 overlap count: ${report.summary.modelOneOverlapCount}`,
    `- Raid Reclaim Reversal overlap count: ${report.summary.raidReclaimOverlapCount}`,
    `- Advisory-only count: ${report.summary.advisoryOnlyCount}`,
    '',
    '## Evidence Collection Threshold',
    `- Current examples: ${report.evidenceCollectionThreshold.currentExamples}`,
    `- Minimum before rule-review discussion: ${report.evidenceCollectionThreshold.minimumExamplesBeforeRuleReview}`,
    `- Preferred before rule-review discussion: ${report.evidenceCollectionThreshold.preferredExamplesBeforeRuleReview}`,
    `- Ready for rule-review discussion: ${yesNo(report.evidenceCollectionThreshold.readyForRuleReviewDiscussion)}`,
    `- Note: ${report.evidenceCollectionThreshold.note}`,
    '',
    '## Sample Table',
    '| Date | Window | Clean Draw | Expected Delivery | Delivery Achieved | FVG/Inefficiency | MSS | Sweep/Reclaim | Overlap |',
    '|---|---|---:|---:|---:|---:|---:|---:|---|',
    ...report.candidates.slice(0, 50).map((candidate) =>
      `| ${candidate.date} | ${candidate.windowLabel} | ${yesNo(candidate.cleanDrawObserved)} | ${candidate.expectedDeliveryHandles.toFixed(2)} handles / ${candidate.expectedDeliveryTicks.toFixed(0)} ticks | ${yesNo(candidate.deliveryAchieved)} | ${yesNo(candidate.fvgOrInefficiencyFormedInsideWindow)} | ${yesNo(candidate.marketStructureShiftPresent)} | ${yesNo(candidate.sweepRaidPlusReclaimPresent)} | ${candidate.overlapClassification} |`
    ),
    report.candidates.length > 50 ? `\n_${report.candidates.length - 50} additional candidate(s) available in JSON._` : '',
    '',
    '## Required Next Actions',
    ...report.requiredNextActions.map((action) => `- ${action}`),
    '',
    'Research-only. No live alerts, no outcome buttons, no model promotion, and no execution behavior change.',
  ].filter((line) => line !== '').join('\n');
}

function writeReport(report: TimeWindowLiquidityDeliveryAuditReport): void {
  mkdirSync(path.dirname(report.outputPaths.jsonPath), { recursive: true });
  writeFileSync(report.outputPaths.jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(report.outputPaths.markdownPath, `${renderTimeWindowLiquidityDeliveryMarkdown(report)}\n`, 'utf8');
}

export async function runTimeWindowLiquidityDeliveryAudit(options: AuditOptions): Promise<TimeWindowLiquidityDeliveryAuditReport> {
  const bars = await fetchMarketBars(options);
  const report = buildTimeWindowLiquidityDeliveryAuditReport(options, bars);
  writeReport(report);
  return report;
}

export async function runTimeWindowLiquidityDeliveryCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseTimeWindowLiquidityDeliveryArgs(rawArgs);
  const report = await runTimeWindowLiquidityDeliveryAudit(options);
  if (options.json) console.log(JSON.stringify(report, null, 2));
  if (options.pretty) {
    console.log([
      '[TIME-WINDOW LIQUIDITY DELIVERY AUDIT]',
      `Symbol: ${report.symbol}`,
      `Date range: ${report.from} to ${report.to}`,
      `Window: ${report.windowDefinition.displayName}`,
      `JSON: ${report.outputPaths.jsonPath}`,
      `Markdown: ${report.outputPaths.markdownPath}`,
      `Candidates: ${report.summary.candidateCount}`,
      `Clean draws: ${report.summary.cleanDrawCount}`,
      `Model 1 overlaps: ${report.summary.modelOneOverlapCount}`,
      `Raid Reclaim Reversal overlaps: ${report.summary.raidReclaimOverlapCount}`,
      `Advisory-only: ${report.summary.advisoryOnlyCount}`,
      'Research-only. This report does not approve trades and does not create execution authority.',
    ].join('\n'));
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tools/automation/time-window-liquidity-delivery.ts')) {
  runTimeWindowLiquidityDeliveryCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
