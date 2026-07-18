import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildNinjaChartContext, type NinjaBridgeBar } from '../../src/lib/ninjaTraderBridge';
import { scanSetupCandidates } from '../../src/lib/setupScanner';
import { ExecutionStatus, SetupCandidateStatus, type AnalysisResult, type ChartContext, type SetupCandidate } from '../../src/types';

type ReplaySession = 'morning' | 'lunch' | 'evening';
type ReplaySessionType = 'replay_morning' | 'replay_lunch';
type Timeframe = '5m' | '15m' | '60m' | '120m' | '240m';

interface CliOptions {
  startDate: string;
  endDate: string;
  instrument: ChartContext['instrument'];
  marketBarsJson: string;
  outDir: string;
  sessions: ReplaySession[];
  json: boolean;
}

type OhlcBar = NinjaBridgeBar;

interface ScannerArtifactEvent {
  eventTime: string;
  date: string;
  session: ReplaySession;
  sessionType: ReplaySessionType;
  completed5m: OhlcBar;
  htfCoverage: Record<Exclude<Timeframe, '5m'>, {
    barsThroughEvent: number;
    rangeStart: string | null;
    rangeEnd: string | null;
    requiredFrom: string;
    status: 'sufficient_30d' | 'partial' | 'missing';
  }>;
  setupCandidateStatus: {
    statuses: SetupCandidate[];
  };
  scannerSummary: {
    candidateCount: number;
    executableCount: number;
    conditionalCount: number;
    blockedCount: number;
    bestExecutableSetupType: string | null;
    bestConditionalSetupType: string | null;
  };
  blockers: string[];
}

export interface RawOhlcScannerArtifactGeneratorReport {
  reportType: 'raw_ohlc_scanner_artifact_generator';
  generatedAt: string;
  startDate: string;
  endDate: string;
  instrument: string;
  authority: {
    researchOnly: true;
    localOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    runsSetupScanner: true;
    scannerRunMode: 'replay_only';
    changesTradingRules: false;
    changesCanExecute: false;
    changesBridgeBehavior: false;
    changesScannerBehavior: false;
    changesDiscordPosting: false;
  };
  assumptions: {
    localMarketBarsJsonOnly: true;
    completedFiveMinuteBarsOnly: true;
    missingBarsAreNotInvented: true;
    htfContextIsMapNotExecution: true;
    fiveMinuteExecutionAuthorityPreserved: true;
    livePromotionAllowed: false;
  };
  source: {
    marketBarsJson: string;
  };
  artifactPath: string;
  summary: {
    eventsGenerated: number;
    eventsWithReadyHtf: number;
    eventsDataLimited: number;
    executableCandidates: number;
    conditionalCandidates: number;
    blockedCandidates: number;
    invalidGeometryBlockedCandidates: number;
    sessions: Record<ReplaySession, number>;
  };
  events: Record<string, ScannerArtifactEvent>;
  blockers: string[];
  recommendations: string[];
  reportMarkdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');
const TIMEFRAMES: Timeframe[] = ['5m', '15m', '60m', '120m', '240m'];
const HTF_TIMEFRAMES: Array<Exclude<Timeframe, '5m'>> = ['15m', '60m', '120m', '240m'];
const LOOKBACK_DAYS = 30;
const SESSION_WINDOWS: Record<ReplaySession, { start: number; end: number }> = {
  morning: { start: 9 * 60 + 15, end: 12 * 60 },
  lunch: { start: 12 * 60, end: 16 * 60 },
  evening: { start: 18 * 60 + 45, end: 22 * 60 + 15 },
};

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function assertDate(value: string, flag: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${flag} must use YYYY-MM-DD.`);
  return value;
}

function parseSessions(value: string | null): ReplaySession[] {
  if (!value) return ['morning', 'lunch'];
  const sessions = value.split(',').map((item) => item.trim()).filter(Boolean);
  const valid = sessions.filter((item): item is ReplaySession => item === 'morning' || item === 'lunch' || item === 'evening');
  if (valid.length !== sessions.length || !valid.length) throw new Error('--sessions must be a comma-separated list of morning,lunch,evening.');
  return Array.from(new Set(valid));
}

function parseInstrument(value: string): ChartContext['instrument'] {
  const normalized = value.toUpperCase();
  if (normalized === 'MES' || normalized === 'MNQ') return normalized;
  throw new Error('--instrument must be MES or MNQ.');
}

export function parseRawOhlcScannerArtifactGeneratorArgs(args = process.argv.slice(2)): CliOptions {
  const marketBarsJson = readFlag(args, '--market-bars-json');
  if (!marketBarsJson) throw new Error('--market-bars-json is required.');
  return {
    startDate: assertDate(readFlag(args, '--start-date') || '2026-06-10', '--start-date'),
    endDate: assertDate(readFlag(args, '--end-date') || '2026-06-12', '--end-date'),
    instrument: parseInstrument(readFlag(args, '--instrument') || 'MES'),
    marketBarsJson,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    sessions: parseSessions(readFlag(args, '--sessions')),
    json: args.includes('--json'),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function finiteNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeTime(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  return value.trim().replace(/\.\d+/, '').replace(/(?:Z|[+-]\d{2}:\d{2})$/, '').slice(0, 19);
}

function timeMs(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeBar(value: unknown): OhlcBar | null {
  const record = asRecord(value);
  const time = normalizeTime(record.time ?? record.candle_time_et ?? record.timestamp);
  const open = finiteNumber(record.open);
  const high = finiteNumber(record.high);
  const low = finiteNumber(record.low);
  const close = finiteNumber(record.close);
  if (!time || open === null || high === null || low === null || close === null) return null;
  if (high < Math.max(open, close) || low > Math.min(open, close)) return null;
  const volume = finiteNumber(record.volume);
  return { time, open, high, low, close, volume: volume ?? 0 };
}

function loadBars(file: string): Record<Timeframe, OhlcBar[]> {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
  const root = asRecord(raw);
  const grouped = asRecord(root.bars || root.timeframes || root);
  const output: Record<Timeframe, OhlcBar[]> = { '5m': [], '15m': [], '60m': [], '120m': [], '240m': [] };
  for (const timeframe of TIMEFRAMES) {
    const rows = Array.isArray(grouped[timeframe]) ? grouped[timeframe] as unknown[] : [];
    const byTime = new Map<string, OhlcBar>();
    for (const row of rows) {
      const bar = normalizeBar(row);
      if (bar) byTime.set(bar.time, bar);
    }
    output[timeframe] = [...byTime.values()].sort((a, b) => timeMs(a.time) - timeMs(b.time));
  }
  return output;
}

function addDays(dateText: string, days: number): string {
  const date = new Date(`${dateText}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateOnly(value: string): string {
  return value.slice(0, 10);
}

function minutesEt(value: string): number | null {
  const match = value.match(/T(\d{2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function sessionForBar(bar: OhlcBar): ReplaySession | null {
  const minutes = minutesEt(bar.time);
  if (minutes === null) return null;
  for (const [session, window] of Object.entries(SESSION_WINDOWS) as Array<[ReplaySession, { start: number; end: number }]>) {
    if (minutes >= window.start && minutes < window.end) return session;
  }
  return null;
}

function replaySessionType(session: ReplaySession): ReplaySessionType | null {
  if (session === 'morning') return 'replay_morning';
  if (session === 'lunch') return 'replay_lunch';
  return null;
}

function through<T extends { time: string }>(bars: T[], asOf: string): T[] {
  const end = timeMs(asOf);
  return bars.filter((bar) => timeMs(bar.time) <= end);
}

function inDateRange(bar: OhlcBar, startDate: string, endDate: string): boolean {
  const date = dateOnly(bar.time);
  return date >= startDate && date <= endDate;
}

function inSameDateSession(bar: OhlcBar, date: string, session: ReplaySession, asOf: string): boolean {
  if (dateOnly(bar.time) !== date || timeMs(bar.time) > timeMs(asOf)) return false;
  const minutes = minutesEt(bar.time);
  if (minutes === null) return false;
  const window = SESSION_WINDOWS[session];
  return minutes >= window.start && minutes < window.end;
}

function htfCoverage(bars: OhlcBar[], asOf: string): ScannerArtifactEvent['htfCoverage'][Exclude<Timeframe, '5m'>] {
  const throughEvent = through(bars, asOf);
  const requiredFrom = addDays(dateOnly(asOf), -LOOKBACK_DAYS);
  const rangeStart = throughEvent[0]?.time || null;
  const rangeEnd = throughEvent[throughEvent.length - 1]?.time || null;
  const status = !throughEvent.length
    ? 'missing'
    : rangeStart && dateOnly(rangeStart) <= requiredFrom
      ? 'sufficient_30d'
      : 'partial';
  return { barsThroughEvent: throughEvent.length, rangeStart, rangeEnd, requiredFrom, status };
}

function analysisForReplay(context: ChartContext): AnalysisResult {
  return {
    dayType: context.htfLiquidityDrawState?.planDirection === 'SHORT'
      ? 'SHORT'
      : context.htfLiquidityDrawState?.planDirection === 'LONG'
        ? 'LONG'
        : 'NO TRADE',
    reasoning: 'Raw OHLC scanner artifact generator. Local replay only; app-owned scanner produces candidate state.',
    confidence: 0.7,
    checks: [{ label: 'Local raw OHLC loaded', passed: true }],
    structuredChartContext: context,
    current_rule_analysis: {
      summary: 'Replay context from local OHLC. Not a live alert and not broker execution.',
      setup_detected: 'Pending deterministic setup scan',
      rule_category: 'APP_OWNED_REPLAY',
      entry: null,
      stop: null,
      target_1: null,
      target_2: null,
      trigger_state: 'PENDING_TRIGGER',
      entry_trigger: null,
      no_trade_reason: null,
      base_confidence: 'Medium',
    },
  };
}

function summarizeCandidates(candidates: SetupCandidate[], bestExecutable: SetupCandidate | null, bestConditional: SetupCandidate | null): ScannerArtifactEvent['scannerSummary'] {
  return {
    candidateCount: candidates.length,
    executableCount: candidates.filter((candidate) => candidate.executionStatus === ExecutionStatus.Executable).length,
    conditionalCount: candidates.filter((candidate) => candidate.executionStatus === ExecutionStatus.Conditional).length,
    blockedCount: candidates.filter((candidate) => candidate.executionStatus === ExecutionStatus.Blocked || candidate.detectedStatus === SetupCandidateStatus.Blocked).length,
    bestExecutableSetupType: bestExecutable?.setupType || null,
    bestConditionalSetupType: bestConditional?.setupType || null,
  };
}

function buildEvent(args: {
  bars: Record<Timeframe, OhlcBar[]>;
  completed5m: OhlcBar;
  instrument: ChartContext['instrument'];
}): ScannerArtifactEvent | null {
  const session = sessionForBar(args.completed5m);
  const sessionType = session ? replaySessionType(session) : null;
  if (!session || !sessionType) return null;
  const date = dateOnly(args.completed5m.time);
  const bars5m = args.bars['5m'].filter((bar) => inSameDateSession(bar, date, session, args.completed5m.time));
  const htfBars5m = through(args.bars['5m'], args.completed5m.time);
  const bars15m = through(args.bars['15m'], args.completed5m.time);
  const bars60m = through(args.bars['60m'], args.completed5m.time);
  const bars120m = through(args.bars['120m'], args.completed5m.time);
  const bars240m = through(args.bars['240m'], args.completed5m.time);
  const context = buildNinjaChartContext({
    bars5m,
    htfBars5m,
    bars15m,
    bars60m,
    bars120m,
    bars240m,
    sessionType,
    instrument: args.instrument,
    tradeDate: date,
  });
  if (!context) return null;
  const chartContext = context as ChartContext;
  const scan = scanSetupCandidates({ sessionType, chartContext, result: analysisForReplay(chartContext) });
  const coverage = {
    '15m': htfCoverage(args.bars['15m'], args.completed5m.time),
    '60m': htfCoverage(args.bars['60m'], args.completed5m.time),
    '120m': htfCoverage(args.bars['120m'], args.completed5m.time),
    '240m': htfCoverage(args.bars['240m'], args.completed5m.time),
  };
  const blockers = Object.entries(coverage)
    .filter(([, item]) => item.status !== 'sufficient_30d')
    .map(([timeframe, item]) => `${timeframe} ${item.status}; loaded ${item.barsThroughEvent} bars from ${item.rangeStart || 'N/A'} to ${item.rangeEnd || 'N/A'}, required from ${item.requiredFrom}`);
  return {
    eventTime: args.completed5m.time,
    date,
    session,
    sessionType,
    completed5m: args.completed5m,
    htfCoverage: coverage,
    setupCandidateStatus: { statuses: scan.candidates },
    scannerSummary: summarizeCandidates(scan.candidates, scan.bestExecutableCandidate, scan.bestConditionalCandidate),
    blockers,
  };
}

function recommendations(report: Omit<RawOhlcScannerArtifactGeneratorReport, 'recommendations' | 'reportMarkdown'>): string[] {
  const lines = [
    'Use this fresh scanner artifact package as the next replay-package input before changing any live-facing ranking or publish behavior.',
    'Compare the generated June 10/12 lunch artifacts against the prior saved decision tapes to confirm invalid geometry is gone at source.',
  ];
  if (report.summary.eventsDataLimited > 0) {
    lines.push('Do not draw HTF structural conclusions from data-limited events; reload or supply 30-day HTF OHLC first.');
  }
  if (report.summary.invalidGeometryBlockedCandidates > 0) {
    lines.push('Invalid entry/stop geometry is now blocked by the scanner validator in replay artifacts; keep the model family, but do not promote those rows.');
  }
  return lines;
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactGeneratorReport, 'reportMarkdown'>): string {
  const lines = [
    `# Raw OHLC Scanner Artifact Generator - ${report.instrument} ${report.startDate} to ${report.endDate}`,
    '',
    'Research-only local scanner artifact generation. It runs setupScanner in replay mode from local OHLC JSON only. No Discord posts, Supabase reads/writes, live bridge reads, scanner behavior changes, trading-rule changes, canExecute changes, or invented candles.',
    '',
    '## Summary',
    `- Events generated: ${report.summary.eventsGenerated}.`,
    `- HTF ready/data-limited events: ${report.summary.eventsWithReadyHtf}/${report.summary.eventsDataLimited}.`,
    `- Executable/conditional/blocked candidates: ${report.summary.executableCandidates}/${report.summary.conditionalCandidates}/${report.summary.blockedCandidates}.`,
    `- Invalid geometry blocked candidates: ${report.summary.invalidGeometryBlockedCandidates}.`,
    `- Sessions: morning ${report.summary.sessions.morning}, lunch ${report.summary.sessions.lunch}, evening ${report.summary.sessions.evening}.`,
    '',
    '## Sample Events',
    '| Time | Session | Candidates | Executable | Conditional | Blocked | HTF |',
    '|---|---|---:|---:|---:|---:|---|',
  ];
  for (const event of Object.values(report.events).slice(0, 30)) {
    const htfReady = Object.values(event.htfCoverage).every((item) => item.status === 'sufficient_30d') ? 'ready' : 'data_limited';
    lines.push(`| ${event.eventTime} | ${event.session} | ${event.scannerSummary.candidateCount} | ${event.scannerSummary.executableCount} | ${event.scannerSummary.conditionalCount} | ${event.scannerSummary.blockedCount} | ${htfReady} |`);
  }
  lines.push('', '## Recommendations');
  for (const item of report.recommendations) lines.push(`- ${item}`);
  return lines.join('\n');
}

export function buildRawOhlcScannerArtifactGeneratorReport(options: CliOptions, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactGeneratorReport {
  const bars = loadBars(options.marketBarsJson);
  const events: Record<string, ScannerArtifactEvent> = {};
  const completedBars = bars['5m']
    .filter((bar) => inDateRange(bar, options.startDate, options.endDate))
    .filter((bar) => {
      const session = sessionForBar(bar);
      return Boolean(session && options.sessions.includes(session));
    });
  for (const completed5m of completedBars) {
    const event = buildEvent({ bars, completed5m, instrument: options.instrument });
    if (event) events[event.eventTime] = event;
  }
  const allEvents = Object.values(events);
  const allCandidates = allEvents.flatMap((event) => event.setupCandidateStatus.statuses);
  const artifactPath = path.join(options.outDir, `raw-ohlc-scanner-artifacts-${options.instrument}-${options.startDate}-to-${options.endDate}-${Date.now()}.json`);
  const withoutRecommendationsAndMarkdown: Omit<RawOhlcScannerArtifactGeneratorReport, 'recommendations' | 'reportMarkdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_generator',
    generatedAt,
    startDate: options.startDate,
    endDate: options.endDate,
    instrument: options.instrument,
    authority: {
      researchOnly: true,
      localOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      runsSetupScanner: true,
      scannerRunMode: 'replay_only',
      changesTradingRules: false,
      changesCanExecute: false,
      changesBridgeBehavior: false,
      changesScannerBehavior: false,
      changesDiscordPosting: false,
    },
    assumptions: {
      localMarketBarsJsonOnly: true,
      completedFiveMinuteBarsOnly: true,
      missingBarsAreNotInvented: true,
      htfContextIsMapNotExecution: true,
      fiveMinuteExecutionAuthorityPreserved: true,
      livePromotionAllowed: false,
    },
    source: { marketBarsJson: options.marketBarsJson },
    artifactPath,
    summary: {
      eventsGenerated: allEvents.length,
      eventsWithReadyHtf: allEvents.filter((event) => Object.values(event.htfCoverage).every((item) => item.status === 'sufficient_30d')).length,
      eventsDataLimited: allEvents.filter((event) => Object.values(event.htfCoverage).some((item) => item.status !== 'sufficient_30d')).length,
      executableCandidates: allCandidates.filter((candidate) => candidate.executionStatus === ExecutionStatus.Executable).length,
      conditionalCandidates: allCandidates.filter((candidate) => candidate.executionStatus === ExecutionStatus.Conditional).length,
      blockedCandidates: allCandidates.filter((candidate) => candidate.executionStatus === ExecutionStatus.Blocked || candidate.detectedStatus === SetupCandidateStatus.Blocked).length,
      invalidGeometryBlockedCandidates: allCandidates.filter((candidate) => candidate.executionStatus === ExecutionStatus.Blocked && candidate.blockReason === 'InvalidStopLocation').length,
      sessions: {
        morning: allEvents.filter((event) => event.session === 'morning').length,
        lunch: allEvents.filter((event) => event.session === 'lunch').length,
        evening: allEvents.filter((event) => event.session === 'evening').length,
      },
    },
    events,
    blockers: [
      !allEvents.length ? 'no local completed 5M scanner events generated for requested date/session range' : null,
    ].filter((item): item is string => Boolean(item)),
  };
  const recs = recommendations(withoutRecommendationsAndMarkdown);
  const withoutMarkdown = { ...withoutRecommendationsAndMarkdown, recommendations: recs };
  return { ...withoutMarkdown, reportMarkdown: buildMarkdown(withoutMarkdown) };
}

export function writeRawOhlcScannerArtifactGeneratorReport(report: RawOhlcScannerArtifactGeneratorReport, outDir: string): { jsonPath: string; markdownPath: string; artifactPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-generator-${report.instrument}-${report.startDate}-to-${report.endDate}-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(report.artifactPath, `${JSON.stringify({
    reportType: 'raw_ohlc_scanner_artifact_package',
    generatedAt: report.generatedAt,
    startDate: report.startDate,
    endDate: report.endDate,
    instrument: report.instrument,
    authority: report.authority,
    assumptions: report.assumptions,
    source: report.source,
    events: report.events,
  }, null, 2)}\n`, 'utf8');
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.reportMarkdown}\n`, 'utf8');
  return { jsonPath, markdownPath, artifactPath: report.artifactPath };
}

export async function runRawOhlcScannerArtifactGeneratorCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseRawOhlcScannerArtifactGeneratorArgs(rawArgs);
  const report = buildRawOhlcScannerArtifactGeneratorReport(options);
  const paths = writeRawOhlcScannerArtifactGeneratorReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.reportMarkdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
    console.log(`Artifact Package: ${paths.artifactPath}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runRawOhlcScannerArtifactGeneratorCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
