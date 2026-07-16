import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type ReplaySession = 'morning' | 'lunch' | 'evening';
type Timeframe = '5m' | '15m' | '60m' | '120m' | '240m';
type HtfCoverageStatus = 'sufficient_30d' | 'partial' | 'missing';

interface CliOptions {
  startDate: string;
  endDate: string;
  instrument: string;
  marketBarsJson: string;
  outDir: string;
  json: boolean;
}

interface OhlcBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface HtfCycleCoverage {
  timeframe: Exclude<Timeframe, '5m'>;
  status: HtfCoverageStatus;
  barsThroughCycle: number;
  rangeStart: string | null;
  rangeEnd: string | null;
  requiredFrom: string;
}

export interface RawOhlcScannerCycleFrame {
  date: string;
  session: ReplaySession;
  completed5m: OhlcBar;
  htfCoverage: HtfCycleCoverage[];
  dataQualityStatus: 'ready' | 'data_limited';
  blocker: string | null;
}

export interface RawOhlcScannerCycleReplayReport {
  reportType: 'raw_ohlc_scanner_cycle_replay';
  generatedAt: string;
  startDate: string;
  endDate: string;
  instrument: string;
  authority: {
    researchOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    runsSetupScanner: false;
    changesTradingRules: false;
    changesCanExecute: false;
    changesBridgeBehavior: false;
    changesScannerBehavior: false;
  };
  assumptions: {
    canonicalMarketBarsJsonRequired: true;
    completedFiveMinuteCyclesOnly: true;
    missingBarsAreNotInvented: true;
    cycleFramesOnlyNoTradeDecisions: true;
    htfLookbackCalendarDays: 30;
  };
  source: {
    marketBarsJson: string;
  };
  summary: {
    totalCycles: number;
    readyCycles: number;
    dataLimitedCycles: number;
    morningCycles: number;
    lunchCycles: number;
    eveningCycles: number;
  };
  frames: RawOhlcScannerCycleFrame[];
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

export function parseRawOhlcScannerCycleReplayArgs(args = process.argv.slice(2)): CliOptions {
  const marketBarsJson = readFlag(args, '--market-bars-json');
  if (!marketBarsJson) throw new Error('--market-bars-json is required for raw OHLC scanner-cycle replay.');
  return {
    startDate: assertDate(readFlag(args, '--start-date') || '2026-06-01', '--start-date'),
    endDate: assertDate(readFlag(args, '--end-date') || '2026-07-02', '--end-date'),
    instrument: (readFlag(args, '--instrument') || 'MES').toUpperCase(),
    marketBarsJson,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
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
  return { time, open, high, low, close, ...(volume === null ? {} : { volume }) };
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

function minutesEt(time: string): number | null {
  const match = time.match(/T(\d{2}):(\d{2})/);
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

function inDateRange(bar: OhlcBar, startDate: string, endDate: string): boolean {
  const date = dateOnly(bar.time);
  return date >= startDate && date <= endDate;
}

function htfCoverageForCycle(bars: OhlcBar[], timeframe: Exclude<Timeframe, '5m'>, completed5m: OhlcBar): HtfCycleCoverage {
  const requiredFrom = addDays(dateOnly(completed5m.time), -LOOKBACK_DAYS);
  const throughCycle = bars.filter((bar) => bar.time <= completed5m.time);
  const rangeStart = throughCycle[0]?.time || null;
  const rangeEnd = throughCycle[throughCycle.length - 1]?.time || null;
  const status: HtfCoverageStatus = !throughCycle.length
    ? 'missing'
    : rangeStart && dateOnly(rangeStart) <= requiredFrom
      ? 'sufficient_30d'
      : 'partial';
  return { timeframe, status, barsThroughCycle: throughCycle.length, rangeStart, rangeEnd, requiredFrom };
}

function buildFrame(bars: Record<Timeframe, OhlcBar[]>, completed5m: OhlcBar): RawOhlcScannerCycleFrame | null {
  const session = sessionForBar(completed5m);
  if (!session) return null;
  const htfCoverage = HTF_TIMEFRAMES.map((timeframe) => htfCoverageForCycle(bars[timeframe], timeframe, completed5m));
  const blockers = htfCoverage
    .filter((coverage) => coverage.status !== 'sufficient_30d')
    .map((coverage) => `${coverage.timeframe} ${coverage.status}; loaded ${coverage.barsThroughCycle} bars from ${coverage.rangeStart || 'N/A'} to ${coverage.rangeEnd || 'N/A'}, required from ${coverage.requiredFrom}`);
  return {
    date: dateOnly(completed5m.time),
    session,
    completed5m,
    htfCoverage,
    dataQualityStatus: blockers.length ? 'data_limited' : 'ready',
    blocker: blockers.length ? blockers.join('; ') : null,
  };
}

function recommendations(report: Omit<RawOhlcScannerCycleReplayReport, 'recommendations' | 'reportMarkdown'>): string[] {
  const lines = [
    'Use these cycle frames as the safe input boundary for the next scanner-owned replay stage.',
    'Do not run setupScanner from this report until HTF coverage is sufficient or explicitly data-limited in the replay output.',
  ];
  if (report.summary.dataLimitedCycles > 0) {
    lines.push('Data-limited cycles need controlled 15M/60M/120M/240M OHLC loading before rule-conflict conclusions are trusted.');
  }
  if (report.summary.readyCycles > 0) {
    lines.push('Ready cycles can be used in the next phase to compare scanner-owned DeskPublishDecision output against Master Desk audit findings.');
  }
  return lines;
}

function buildMarkdown(report: Omit<RawOhlcScannerCycleReplayReport, 'reportMarkdown'>): string {
  const lines = [
    `# Raw OHLC Scanner-Cycle Replay - ${report.instrument} ${report.startDate} to ${report.endDate}`,
    '',
    'Research-only scanner-cycle frame report. No Discord posts, Supabase reads/writes, bridge reads, setupScanner execution, scanner behavior changes, trading-rule changes, canExecute changes, or invented candles.',
    '',
    '## Summary',
    `- Total completed 5M cycles: ${report.summary.totalCycles}.`,
    `- Ready cycles: ${report.summary.readyCycles}.`,
    `- Data-limited cycles: ${report.summary.dataLimitedCycles}.`,
    `- Morning/Lunch/Evening cycles: ${report.summary.morningCycles}/${report.summary.lunchCycles}/${report.summary.eveningCycles}.`,
    '',
    '## Sample Frames',
    '| Date | Session | Completed 5M | Close | Status | Blocker |',
    '|---|---|---|---:|---|---|',
  ];
  for (const frame of report.frames.slice(0, 40)) {
    lines.push(`| ${frame.date} | ${frame.session} | ${frame.completed5m.time} | ${frame.completed5m.close.toFixed(2)} | ${frame.dataQualityStatus} | ${frame.blocker || '-'} |`);
  }
  lines.push('', '## Recommendations');
  for (const item of report.recommendations) lines.push(`- ${item}`);
  return lines.join('\n');
}

export function buildRawOhlcScannerCycleReplayReport(options: CliOptions, generatedAt = new Date().toISOString()): RawOhlcScannerCycleReplayReport {
  const bars = loadBars(options.marketBarsJson);
  const frames = bars['5m']
    .filter((bar) => inDateRange(bar, options.startDate, options.endDate))
    .map((bar) => buildFrame(bars, bar))
    .filter((frame): frame is RawOhlcScannerCycleFrame => Boolean(frame));
  const withoutRecommendationsAndMarkdown: Omit<RawOhlcScannerCycleReplayReport, 'recommendations' | 'reportMarkdown'> = {
    reportType: 'raw_ohlc_scanner_cycle_replay',
    generatedAt,
    startDate: options.startDate,
    endDate: options.endDate,
    instrument: options.instrument,
    authority: {
      researchOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      runsSetupScanner: false,
      changesTradingRules: false,
      changesCanExecute: false,
      changesBridgeBehavior: false,
      changesScannerBehavior: false,
    },
    assumptions: {
      canonicalMarketBarsJsonRequired: true,
      completedFiveMinuteCyclesOnly: true,
      missingBarsAreNotInvented: true,
      cycleFramesOnlyNoTradeDecisions: true,
      htfLookbackCalendarDays: LOOKBACK_DAYS,
    },
    source: { marketBarsJson: options.marketBarsJson },
    summary: {
      totalCycles: frames.length,
      readyCycles: frames.filter((frame) => frame.dataQualityStatus === 'ready').length,
      dataLimitedCycles: frames.filter((frame) => frame.dataQualityStatus === 'data_limited').length,
      morningCycles: frames.filter((frame) => frame.session === 'morning').length,
      lunchCycles: frames.filter((frame) => frame.session === 'lunch').length,
      eveningCycles: frames.filter((frame) => frame.session === 'evening').length,
    },
    frames,
  };
  const recs = recommendations(withoutRecommendationsAndMarkdown);
  const withoutMarkdown = { ...withoutRecommendationsAndMarkdown, recommendations: recs };
  return { ...withoutMarkdown, reportMarkdown: buildMarkdown(withoutMarkdown) };
}

export function writeRawOhlcScannerCycleReplayReport(report: RawOhlcScannerCycleReplayReport, outDir: string): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-cycle-replay-${report.instrument}-${report.startDate}-to-${report.endDate}-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.reportMarkdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export async function runRawOhlcScannerCycleReplayCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseRawOhlcScannerCycleReplayArgs(rawArgs);
  const report = buildRawOhlcScannerCycleReplayReport(options);
  const paths = writeRawOhlcScannerCycleReplayReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, summary: report.summary }, null, 2));
  } else {
    console.log(report.reportMarkdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runRawOhlcScannerCycleReplayCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
