import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type ReplaySession = 'morning' | 'lunch' | 'evening';
type Timeframe = '5m' | '15m' | '60m' | '120m' | '240m';
type OhlcSource = 'local_market_bars_json' | 'scanner_decision_tape_completed_5m' | 'missing';

interface CliOptions {
  startDate: string;
  endDate: string;
  instrument: string;
  auditDir: string;
  outDir: string;
  marketBarsJson: string | null;
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

interface TimeframeCoverage {
  timeframe: Timeframe;
  source: OhlcSource;
  bars: number;
  malformedBars: number;
  rangeStart: string | null;
  rangeEnd: string | null;
}

interface ReplaySessionFrame {
  date: string;
  session: ReplaySession;
  decisionTapePresent: boolean;
  selectedSource: OhlcSource;
  completedFiveMinuteBars: number;
  localFiveMinuteBars: number;
  htfBarsAvailable: Record<Exclude<Timeframe, '5m'>, number>;
  reconstructableFromRawOhlc: boolean;
  blocker: string | null;
}

export interface RawOhlcReplayAdapterReport {
  reportType: 'raw_ohlc_replay_adapter';
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
    changesTradingRules: false;
    changesCanExecute: false;
    changesBridgeBehavior: false;
    changesScannerBehavior: false;
  };
  assumptions: {
    localMarketBarsJsonOnly: true;
    decisionTapesUsedForCompleted5mFallback: true;
    missingBarsAreNotInvented: true;
    noScannerRuleExecutionYet: true;
  };
  sourcePreference: ['local_market_bars_json', 'scanner_decision_tape_completed_5m'];
  coverageByTimeframe: TimeframeCoverage[];
  sessions: ReplaySessionFrame[];
  summary: {
    totalSessions: number;
    decisionTapeSessions: number;
    missingDecisionTapeSessions: number;
    reconstructableSessions: number;
    missingDecisionTapeSessionsCoveredByRawOhlc: number;
    blockedSessions: number;
  };
  recommendations: string[];
  reportMarkdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'discord-audit');
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');
const TIMEFRAMES: Timeframe[] = ['5m', '15m', '60m', '120m', '240m'];
const HTF_TIMEFRAMES: Array<Exclude<Timeframe, '5m'>> = ['15m', '60m', '120m', '240m'];
const SESSIONS: ReplaySession[] = ['morning', 'lunch', 'evening'];

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

export function parseRawOhlcReplayAdapterArgs(args = process.argv.slice(2)): CliOptions {
  return {
    startDate: assertDate(readFlag(args, '--start-date') || '2026-06-01', '--start-date'),
    endDate: assertDate(readFlag(args, '--end-date') || '2026-07-02', '--end-date'),
    instrument: (readFlag(args, '--instrument') || 'MES').toUpperCase(),
    auditDir: readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    marketBarsJson: readFlag(args, '--market-bars-json'),
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

function dateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(`${startDate}T12:00:00Z`);
  const end = new Date(`${endDate}T12:00:00Z`);
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

function minutesEt(time: string): number | null {
  const match = time.match(/T(\d{2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function inSession(bar: OhlcBar, date: string, session: ReplaySession): boolean {
  if (bar.time.slice(0, 10) !== date) return false;
  const minutes = minutesEt(bar.time);
  if (minutes === null) return false;
  const window = SESSION_WINDOWS[session];
  return minutes >= window.start && minutes < window.end;
}

function sessionTapePath(options: Pick<CliOptions, 'auditDir' | 'instrument'>, date: string, session: ReplaySession): string {
  return path.join(options.auditDir, `scanner-decision-tape-${date}-${options.instrument}-${session}.json`);
}

function readDecisionTape5mBars(file: string): OhlcBar[] {
  if (!fs.existsSync(file)) return [];
  try {
    const tape = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
    const byTime = new Map<string, OhlcBar>();
    for (const event of Object.values(asRecord(tape.events))) {
      const bar = normalizeBar(asRecord(event).completed5m);
      if (bar) byTime.set(bar.time, bar);
    }
    return [...byTime.values()].sort((a, b) => timeMs(a.time) - timeMs(b.time));
  } catch {
    return [];
  }
}

function emptyBarsByTimeframe(): Record<Timeframe, OhlcBar[]> {
  return { '5m': [], '15m': [], '60m': [], '120m': [], '240m': [] };
}

function loadLocalMarketBars(file: string | null): { bars: Record<Timeframe, OhlcBar[]>; malformed: Record<Timeframe, number> } {
  const bars = emptyBarsByTimeframe();
  const malformed: Record<Timeframe, number> = { '5m': 0, '15m': 0, '60m': 0, '120m': 0, '240m': 0 };
  if (!file) return { bars, malformed };
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
  const root = asRecord(raw);
  const grouped = asRecord(root.bars || root.timeframes || root);
  for (const timeframe of TIMEFRAMES) {
    const direct = grouped[timeframe];
    const rows = Array.isArray(direct)
      ? direct
      : Array.isArray(raw)
        ? raw.filter((row) => asRecord(row).timeframe === timeframe)
        : [];
    const byTime = new Map<string, OhlcBar>();
    for (const row of rows) {
      const bar = normalizeBar(row);
      if (!bar) {
        malformed[timeframe] += 1;
        continue;
      }
      byTime.set(bar.time, bar);
    }
    bars[timeframe] = [...byTime.values()].sort((a, b) => timeMs(a.time) - timeMs(b.time));
  }
  return { bars, malformed };
}

function coverage(timeframe: Timeframe, bars: OhlcBar[], malformedBars: number, source: OhlcSource): TimeframeCoverage {
  return {
    timeframe,
    source,
    bars: bars.length,
    malformedBars,
    rangeStart: bars[0]?.time || null,
    rangeEnd: bars[bars.length - 1]?.time || null,
  };
}

function buildSessionFrame(args: {
  options: CliOptions;
  localBars: Record<Timeframe, OhlcBar[]>;
  date: string;
  session: ReplaySession;
}): ReplaySessionFrame {
  const tapePath = sessionTapePath(args.options, args.date, args.session);
  const decisionTapePresent = fs.existsSync(tapePath);
  const tapeBars = readDecisionTape5mBars(tapePath);
  const local5m = args.localBars['5m'].filter((bar) => inSession(bar, args.date, args.session));
  const selected5m = local5m.length ? local5m : tapeBars;
  const htfBarsAvailable = {
    '15m': args.localBars['15m'].filter((bar) => bar.time.slice(0, 10) <= args.date).length,
    '60m': args.localBars['60m'].filter((bar) => bar.time.slice(0, 10) <= args.date).length,
    '120m': args.localBars['120m'].filter((bar) => bar.time.slice(0, 10) <= args.date).length,
    '240m': args.localBars['240m'].filter((bar) => bar.time.slice(0, 10) <= args.date).length,
  };
  const htfReady = HTF_TIMEFRAMES.every((timeframe) => htfBarsAvailable[timeframe] > 0);
  const reconstructableFromRawOhlc = selected5m.length > 0 && htfReady;
  const selectedSource: OhlcSource = local5m.length ? 'local_market_bars_json' : tapeBars.length ? 'scanner_decision_tape_completed_5m' : 'missing';
  const blocker = reconstructableFromRawOhlc
    ? null
    : selected5m.length || tapeBars.length
      ? 'HTF local OHLC missing for at least one required timeframe.'
      : 'No completed 5M OHLC available from local market bars JSON or decision tape.';
  return {
    date: args.date,
    session: args.session,
    decisionTapePresent,
    selectedSource,
    completedFiveMinuteBars: selected5m.length,
    localFiveMinuteBars: local5m.length,
    htfBarsAvailable,
    reconstructableFromRawOhlc,
    blocker,
  };
}

function recommendations(report: Omit<RawOhlcReplayAdapterReport, 'recommendations' | 'reportMarkdown'>): string[] {
  const lines = [
    'Use this adapter as the source contract for the next scanner-cycle replay. It proves which sessions can be replayed from raw OHLC instead of decision tapes.',
    'Do not loosen publish or trading rules from adapter coverage alone; it only proves data availability and session frame construction.',
  ];
  if (report.summary.missingDecisionTapeSessionsCoveredByRawOhlc > 0) {
    lines.push('Next chunk should feed reconstructable raw-OHLC sessions into scanner-owned setup evaluation and compare the resulting DeskPublishDecision against historical holds.');
  }
  if (report.summary.blockedSessions > 0) {
    lines.push('Blocked sessions should remain data-limited until a controlled Supabase/bridge read phase is approved; missing candles are not invented.');
  }
  return lines;
}

function buildMarkdown(report: Omit<RawOhlcReplayAdapterReport, 'reportMarkdown'>): string {
  const lines = [
    `# Raw OHLC Replay Adapter - ${report.instrument} ${report.startDate} to ${report.endDate}`,
    '',
    'Research-only adapter report. No Discord posts, Supabase reads/writes, bridge reads, scanner behavior changes, trading-rule changes, canExecute changes, or invented candles.',
    '',
    '## Summary',
    `- Total sessions: ${report.summary.totalSessions}.`,
    `- Decision-tape sessions: ${report.summary.decisionTapeSessions}; missing decision-tape sessions: ${report.summary.missingDecisionTapeSessions}.`,
    `- Reconstructable raw-OHLC sessions: ${report.summary.reconstructableSessions}.`,
    `- Missing decision-tape sessions covered by raw OHLC: ${report.summary.missingDecisionTapeSessionsCoveredByRawOhlc}.`,
    `- Blocked sessions: ${report.summary.blockedSessions}.`,
    '',
    '## Coverage',
    '| Timeframe | Source | Bars | Malformed | Range Start | Range End |',
    '|---|---|---:|---:|---|---|',
  ];
  for (const row of report.coverageByTimeframe) {
    lines.push(`| ${row.timeframe} | ${row.source} | ${row.bars} | ${row.malformedBars} | ${row.rangeStart || 'N/A'} | ${row.rangeEnd || 'N/A'} |`);
  }
  lines.push('', '## Session Frames');
  lines.push('| Date | Session | Tape | Source | 5M Bars | HTF Ready | Reconstructable | Blocker |');
  lines.push('|---|---|---|---|---:|---|---|---|');
  for (const frame of report.sessions) {
    const htfReady = HTF_TIMEFRAMES.every((timeframe) => frame.htfBarsAvailable[timeframe] > 0);
    lines.push(`| ${frame.date} | ${frame.session} | ${frame.decisionTapePresent ? 'yes' : 'no'} | ${frame.selectedSource} | ${frame.completedFiveMinuteBars} | ${htfReady ? 'yes' : 'no'} | ${frame.reconstructableFromRawOhlc ? 'yes' : 'no'} | ${frame.blocker || '-'} |`);
  }
  lines.push('', '## Recommendations');
  for (const item of report.recommendations) lines.push(`- ${item}`);
  return lines.join('\n');
}

export function buildRawOhlcReplayAdapterReport(options: CliOptions, generatedAt = new Date().toISOString()): RawOhlcReplayAdapterReport {
  const { bars: localBars, malformed } = loadLocalMarketBars(options.marketBarsJson);
  const sessions = dateRange(options.startDate, options.endDate).flatMap((date) =>
    SESSIONS.map((session) => buildSessionFrame({ options, localBars, date, session }))
  );
  const coverageByTimeframe = TIMEFRAMES.map((timeframe) =>
    coverage(timeframe, localBars[timeframe], malformed[timeframe], localBars[timeframe].length ? 'local_market_bars_json' : 'missing')
  );
  const reportWithoutRecommendationsAndMarkdown: Omit<RawOhlcReplayAdapterReport, 'recommendations' | 'reportMarkdown'> = {
    reportType: 'raw_ohlc_replay_adapter',
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
      changesTradingRules: false,
      changesCanExecute: false,
      changesBridgeBehavior: false,
      changesScannerBehavior: false,
    },
    assumptions: {
      localMarketBarsJsonOnly: true,
      decisionTapesUsedForCompleted5mFallback: true,
      missingBarsAreNotInvented: true,
      noScannerRuleExecutionYet: true,
    },
    sourcePreference: ['local_market_bars_json', 'scanner_decision_tape_completed_5m'],
    coverageByTimeframe,
    sessions,
    summary: {
      totalSessions: sessions.length,
      decisionTapeSessions: sessions.filter((session) => session.decisionTapePresent).length,
      missingDecisionTapeSessions: sessions.filter((session) => !session.decisionTapePresent).length,
      reconstructableSessions: sessions.filter((session) => session.reconstructableFromRawOhlc).length,
      missingDecisionTapeSessionsCoveredByRawOhlc: sessions.filter((session) => !session.decisionTapePresent && session.reconstructableFromRawOhlc).length,
      blockedSessions: sessions.filter((session) => !session.reconstructableFromRawOhlc).length,
    },
  };
  const recs = recommendations(reportWithoutRecommendationsAndMarkdown);
  const reportWithoutMarkdown = { ...reportWithoutRecommendationsAndMarkdown, recommendations: recs };
  return {
    ...reportWithoutMarkdown,
    reportMarkdown: buildMarkdown(reportWithoutMarkdown),
  };
}

export function writeRawOhlcReplayAdapterReport(report: RawOhlcReplayAdapterReport, outDir: string): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-replay-adapter-${report.instrument}-${report.startDate}-to-${report.endDate}-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.reportMarkdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export async function runRawOhlcReplayAdapterCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseRawOhlcReplayAdapterArgs(rawArgs);
  const report = buildRawOhlcReplayAdapterReport(options);
  const paths = writeRawOhlcReplayAdapterReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, summary: report.summary }, null, 2));
  } else {
    console.log(report.reportMarkdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runRawOhlcReplayAdapterCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
