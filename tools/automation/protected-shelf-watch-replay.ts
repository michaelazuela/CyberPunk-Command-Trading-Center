import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { detectProtectedShelfWatch, type ProtectedShelfBar, type ProtectedShelfWatch } from '../../src/lib/protectedShelfWatch';

type Timeframe = '5m' | '15m' | '60m' | '120m' | '240m';
type ReplaySession = 'morning' | 'lunch' | 'evening';

interface CliOptions {
  tradeDate: string;
  session: ReplaySession;
  instrument: string;
  marketBarsJson: string;
  outDir: string;
  json: boolean;
}

interface ProtectedShelfWatchReplayReport {
  reportType: 'protected_shelf_watch_replay';
  generatedAt: string;
  tradeDate: string;
  session: ReplaySession;
  instrument: string;
  authority: {
    replayOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    automatedOrders: false;
  };
  source: {
    marketBarsJson: string;
  };
  summary: {
    fiveMinuteBars: number;
    fifteenMinuteBars: number;
    state: ProtectedShelfWatch['state'];
    direction: ProtectedShelfWatch['direction'];
    entry: number | null;
    stop: number | null;
    target1: number | null;
    target2: number | null;
    proofTime: string | null;
    noChase: boolean;
  };
  watch: ProtectedShelfWatch;
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');
const SESSION_WINDOWS: Record<ReplaySession, { start: string; end: string }> = {
  morning: { start: '09:15:00', end: '12:00:00' },
  lunch: { start: '12:00:00', end: '16:00:00' },
  evening: { start: '18:45:00', end: '22:15:00' },
};

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function parseArgs(args = process.argv.slice(2)): CliOptions {
  const marketBarsJson = readFlag(args, '--market-bars-json');
  if (!marketBarsJson) throw new Error('--market-bars-json is required.');
  const tradeDate = readFlag(args, '--trade-date') || '2026-06-26';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tradeDate)) throw new Error('--trade-date must be YYYY-MM-DD.');
  const session = (readFlag(args, '--session') || 'morning') as ReplaySession;
  if (!SESSION_WINDOWS[session]) throw new Error('--session must be morning, lunch, or evening.');
  return {
    tradeDate,
    session,
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

function normalizeBar(value: unknown): ProtectedShelfBar | null {
  const record = asRecord(value);
  const time = normalizeTime(record.time ?? record.candle_time_et ?? record.timestamp);
  const open = finiteNumber(record.open);
  const high = finiteNumber(record.high);
  const low = finiteNumber(record.low);
  const close = finiteNumber(record.close);
  if (!time || open === null || high === null || low === null || close === null) return null;
  if (high < Math.max(open, close) || low > Math.min(open, close)) return null;
  return { time, open, high, low, close };
}

function loadBars(filePath: string): Record<Timeframe, ProtectedShelfBar[]> {
  const root = asRecord(JSON.parse(fs.readFileSync(filePath, 'utf8')));
  const grouped = asRecord(root.bars || root.timeframes || root);
  const output = { '5m': [], '15m': [], '60m': [], '120m': [], '240m': [] } as Record<Timeframe, ProtectedShelfBar[]>;
  for (const timeframe of Object.keys(output) as Timeframe[]) {
    const rows = Array.isArray(grouped[timeframe]) ? grouped[timeframe] as unknown[] : [];
    output[timeframe] = rows
      .map(normalizeBar)
      .filter((bar): bar is ProtectedShelfBar => Boolean(bar))
      .sort((a, b) => a.time.localeCompare(b.time));
  }
  return output;
}

function withinSession(bar: ProtectedShelfBar, tradeDate: string, session: ReplaySession): boolean {
  const window = SESSION_WINDOWS[session];
  return bar.time >= `${tradeDate}T${window.start}` && bar.time < `${tradeDate}T${window.end}`;
}

function fifteenContextBars(bars: ProtectedShelfBar[], tradeDate: string, session: ReplaySession): ProtectedShelfBar[] {
  const window = SESSION_WINDOWS[session];
  const start = `${tradeDate}T${window.start}`;
  return bars.filter((bar) => bar.time <= `${tradeDate}T${window.end}` && bar.time >= `${tradeDate}T08:00:00` && bar.time <= start)
    .concat(bars.filter((bar) => withinSession(bar, tradeDate, session)));
}

function buildMarkdown(report: Omit<ProtectedShelfWatchReplayReport, 'markdown'>): string {
  return [
    `# Protected Shelf Watch Replay - ${report.instrument} ${report.tradeDate} ${report.session}`,
    '',
    'Replay-only. No Discord posts, Supabase reads/writes, live bridge reads, canExecute changes, or automated orders.',
    '',
    '## Result',
    `- State: ${report.summary.state}.`,
    `- Direction: ${report.summary.direction || 'none'}.`,
    `- Entry/Stop/T1/T2: ${report.summary.entry ?? 'N/A'} / ${report.summary.stop ?? 'N/A'} / ${report.summary.target1 ?? 'N/A'} / ${report.summary.target2 ?? 'N/A'}.`,
    `- Proof time: ${report.summary.proofTime || 'N/A'}.`,
    `- No chase: ${report.summary.noChase}.`,
    '',
    '## Evidence',
    ...(report.watch.evidence.length ? report.watch.evidence.map((line) => `- ${line}`) : ['- None.']),
    '',
    '## Missing Evidence',
    ...(report.watch.missingEvidence.length ? report.watch.missingEvidence.map((line) => `- ${line}`) : ['- None.']),
  ].join('\n');
}

export function buildProtectedShelfWatchReplayReport(options: CliOptions, generatedAt = new Date().toISOString()): ProtectedShelfWatchReplayReport {
  const bars = loadBars(options.marketBarsJson);
  const fiveMinuteBars = bars['5m'].filter((bar) => withinSession(bar, options.tradeDate, options.session));
  const fifteenMinuteBars = fifteenContextBars(bars['15m'], options.tradeDate, options.session);
  const watch = detectProtectedShelfWatch({ fiveMinuteBars, fifteenMinuteBars });
  const report: Omit<ProtectedShelfWatchReplayReport, 'markdown'> = {
    reportType: 'protected_shelf_watch_replay',
    generatedAt,
    tradeDate: options.tradeDate,
    session: options.session,
    instrument: options.instrument,
    authority: {
      replayOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      automatedOrders: false,
    },
    source: { marketBarsJson: options.marketBarsJson },
    summary: {
      fiveMinuteBars: fiveMinuteBars.length,
      fifteenMinuteBars: fifteenMinuteBars.length,
      state: watch.state,
      direction: watch.direction,
      entry: watch.entry,
      stop: watch.stop,
      target1: watch.target1,
      target2: watch.target2,
      proofTime: watch.proofTime,
      noChase: watch.state === 'no_chase',
    },
    watch,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeProtectedShelfWatchReplayReport(report: ProtectedShelfWatchReplayReport, outDir: string): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `protected-shelf-watch-replay-${report.instrument}-${report.tradeDate}-${report.session}-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const report = buildProtectedShelfWatchReplayReport(options);
  const written = writeProtectedShelfWatchReplayReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...written, summary: report.summary }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nJSON: ${written.jsonPath}`);
    console.log(`Markdown: ${written.markdownPath}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
