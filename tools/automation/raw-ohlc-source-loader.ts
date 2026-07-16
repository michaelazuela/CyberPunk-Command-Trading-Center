import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type ReplaySession = 'morning' | 'lunch' | 'evening';
type Timeframe = '5m' | '15m' | '60m' | '120m' | '240m';
type SourceKind = 'local_input_json' | 'decision_tape_completed_5m' | 'empty';

interface CliOptions {
  startDate: string;
  endDate: string;
  instrument: string;
  auditDir: string;
  outDir: string;
  inputJson: string | null;
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

interface TimeframeLoadSummary {
  timeframe: Timeframe;
  source: SourceKind;
  bars: number;
  malformedBars: number;
  rangeStart: string | null;
  rangeEnd: string | null;
}

export interface RawOhlcSourceLoaderReport {
  reportType: 'raw_ohlc_source_loader';
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
    canonicalLocalJsonOnly: true;
    missingBarsAreNotInvented: true;
    decisionTapeFallbackIs5mOnly: true;
    outputFeedsRawOhlcReplayAdapter: true;
  };
  canonicalMarketBarsPath: string;
  summary: {
    totalBars: number;
    malformedBars: number;
    decisionTapeFiveMinuteBars: number;
    localInputBars: number;
    timeframesWithData: Timeframe[];
    htfTimeframesWithData: Array<Exclude<Timeframe, '5m'>>;
  };
  coverageByTimeframe: TimeframeLoadSummary[];
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

export function parseRawOhlcSourceLoaderArgs(args = process.argv.slice(2)): CliOptions {
  return {
    startDate: assertDate(readFlag(args, '--start-date') || '2026-06-01', '--start-date'),
    endDate: assertDate(readFlag(args, '--end-date') || '2026-07-02', '--end-date'),
    instrument: (readFlag(args, '--instrument') || 'MES').toUpperCase(),
    auditDir: readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    inputJson: readFlag(args, '--input-json'),
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

function emptyBars(): Record<Timeframe, OhlcBar[]> {
  return { '5m': [], '15m': [], '60m': [], '120m': [], '240m': [] };
}

function emptyMalformed(): Record<Timeframe, number> {
  return { '5m': 0, '15m': 0, '60m': 0, '120m': 0, '240m': 0 };
}

function addBar(target: Record<Timeframe, Map<string, OhlcBar>>, timeframe: Timeframe, bar: OhlcBar): void {
  target[timeframe].set(bar.time, bar);
}

function mapBuckets(): Record<Timeframe, Map<string, OhlcBar>> {
  return { '5m': new Map(), '15m': new Map(), '60m': new Map(), '120m': new Map(), '240m': new Map() };
}

function finalizeBuckets(buckets: Record<Timeframe, Map<string, OhlcBar>>): Record<Timeframe, OhlcBar[]> {
  const output = emptyBars();
  for (const timeframe of TIMEFRAMES) {
    output[timeframe] = [...buckets[timeframe].values()].sort((a, b) => timeMs(a.time) - timeMs(b.time));
  }
  return output;
}

function loadInputJson(inputJson: string | null): { bars: Record<Timeframe, OhlcBar[]>; malformed: Record<Timeframe, number>; sourceBars: number } {
  const malformed = emptyMalformed();
  const buckets = mapBuckets();
  if (!inputJson) return { bars: emptyBars(), malformed, sourceBars: 0 };
  const raw = JSON.parse(fs.readFileSync(inputJson, 'utf8')) as unknown;
  const root = asRecord(raw);
  const grouped = asRecord(root.bars || root.timeframes || root);
  let sourceBars = 0;
  for (const timeframe of TIMEFRAMES) {
    const rows = Array.isArray(grouped[timeframe])
      ? grouped[timeframe] as unknown[]
      : Array.isArray(raw)
        ? raw.filter((row) => asRecord(row).timeframe === timeframe)
        : [];
    for (const row of rows) {
      const bar = normalizeBar(row);
      if (!bar) {
        malformed[timeframe] += 1;
        continue;
      }
      sourceBars += 1;
      addBar(buckets, timeframe, bar);
    }
  }
  return { bars: finalizeBuckets(buckets), malformed, sourceBars };
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

function tapePath(options: Pick<CliOptions, 'auditDir' | 'instrument'>, date: string, session: ReplaySession): string {
  return path.join(options.auditDir, `scanner-decision-tape-${date}-${options.instrument}-${session}.json`);
}

function loadDecisionTape5m(options: CliOptions): { bars: OhlcBar[]; malformed: number } {
  const byTime = new Map<string, OhlcBar>();
  let malformed = 0;
  for (const date of dateRange(options.startDate, options.endDate)) {
    for (const session of SESSIONS) {
      const file = tapePath(options, date, session);
      if (!fs.existsSync(file)) continue;
      let tape: Record<string, unknown>;
      try {
        tape = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
      } catch {
        malformed += 1;
        continue;
      }
      for (const event of Object.values(asRecord(tape.events))) {
        const bar = normalizeBar(asRecord(event).completed5m);
        if (bar) byTime.set(bar.time, bar);
      }
    }
  }
  return { bars: [...byTime.values()].sort((a, b) => timeMs(a.time) - timeMs(b.time)), malformed };
}

function mergeSources(inputBars: Record<Timeframe, OhlcBar[]>, tape5m: OhlcBar[]): Record<Timeframe, OhlcBar[]> {
  const buckets = mapBuckets();
  for (const timeframe of TIMEFRAMES) {
    for (const bar of inputBars[timeframe]) addBar(buckets, timeframe, bar);
  }
  for (const bar of tape5m) {
    if (!buckets['5m'].has(bar.time)) addBar(buckets, '5m', bar);
  }
  return finalizeBuckets(buckets);
}

function coverage(timeframe: Timeframe, bars: OhlcBar[], malformedBars: number, source: SourceKind): TimeframeLoadSummary {
  return {
    timeframe,
    source,
    bars: bars.length,
    malformedBars,
    rangeStart: bars[0]?.time || null,
    rangeEnd: bars[bars.length - 1]?.time || null,
  };
}

function writeCanonicalMarketBars(args: {
  options: CliOptions;
  bars: Record<Timeframe, OhlcBar[]>;
  generatedAt: string;
}): string {
  fs.mkdirSync(args.options.outDir, { recursive: true });
  const base = `raw-ohlc-source-${args.options.instrument}-${args.options.startDate}-to-${args.options.endDate}-${Date.now()}.json`;
  const outputPath = path.join(args.options.outDir, base);
  fs.writeFileSync(outputPath, `${JSON.stringify({
    reportType: 'raw_ohlc_source_canonical_market_bars',
    generatedAt: args.generatedAt,
    instrument: args.options.instrument,
    startDate: args.options.startDate,
    endDate: args.options.endDate,
    authority: {
      researchOnly: true,
      sourceLoaderOnly: true,
      noLiveSupabaseRead: true,
      noLiveBridgeRead: true,
      missingBarsAreNotInvented: true,
    },
    bars: args.bars,
  }, null, 2)}\n`, 'utf8');
  return outputPath;
}

function recommendations(report: Omit<RawOhlcSourceLoaderReport, 'recommendations' | 'reportMarkdown'>): string[] {
  const lines = [
    'Pass the canonicalMarketBarsPath into research:raw-ohlc-replay-adapter with --market-bars-json to prove replay coverage.',
    'This loader intentionally does not read live Supabase or bridge; approve that as a separate controlled read phase if local JSON is not enough.',
  ];
  if (report.summary.htfTimeframesWithData.length < HTF_TIMEFRAMES.length) {
    lines.push('HTF coverage is incomplete, so scanner-cycle replay should remain data-limited until 15M/60M/120M/240M OHLC is loaded.');
  }
  return lines;
}

function buildMarkdown(report: Omit<RawOhlcSourceLoaderReport, 'reportMarkdown'>): string {
  const lines = [
    `# Raw OHLC Source Loader - ${report.instrument} ${report.startDate} to ${report.endDate}`,
    '',
    'Research-only canonical source loader. No Discord posts, Supabase reads/writes, bridge reads, scanner behavior changes, trading-rule changes, canExecute changes, or invented candles.',
    '',
    `Canonical market-bars JSON: ${report.canonicalMarketBarsPath}`,
    '',
    '## Summary',
    `- Total canonical bars: ${report.summary.totalBars}.`,
    `- Local input bars accepted: ${report.summary.localInputBars}.`,
    `- Decision-tape 5M bars accepted: ${report.summary.decisionTapeFiveMinuteBars}.`,
    `- Malformed bars rejected: ${report.summary.malformedBars}.`,
    `- Timeframes with data: ${report.summary.timeframesWithData.join(', ') || 'none'}.`,
    `- HTF timeframes with data: ${report.summary.htfTimeframesWithData.join(', ') || 'none'}.`,
    '',
    '## Coverage',
    '| Timeframe | Source | Bars | Malformed | Range Start | Range End |',
    '|---|---|---:|---:|---|---|',
  ];
  for (const row of report.coverageByTimeframe) {
    lines.push(`| ${row.timeframe} | ${row.source} | ${row.bars} | ${row.malformedBars} | ${row.rangeStart || 'N/A'} | ${row.rangeEnd || 'N/A'} |`);
  }
  lines.push('', '## Recommendations');
  for (const item of report.recommendations) lines.push(`- ${item}`);
  return lines.join('\n');
}

export function buildRawOhlcSourceLoaderReport(options: CliOptions, generatedAt = new Date().toISOString()): RawOhlcSourceLoaderReport {
  const input = loadInputJson(options.inputJson);
  const tape5m = loadDecisionTape5m(options);
  const bars = mergeSources(input.bars, tape5m.bars);
  const canonicalMarketBarsPath = writeCanonicalMarketBars({ options, bars, generatedAt });
  const coverageByTimeframe = TIMEFRAMES.map((timeframe) => {
    const source: SourceKind = input.bars[timeframe].length
      ? 'local_input_json'
      : timeframe === '5m' && tape5m.bars.length
        ? 'decision_tape_completed_5m'
        : 'empty';
    const malformedBars = input.malformed[timeframe] + (timeframe === '5m' ? tape5m.malformed : 0);
    return coverage(timeframe, bars[timeframe], malformedBars, source);
  });
  const summary = {
    totalBars: TIMEFRAMES.reduce((sum, timeframe) => sum + bars[timeframe].length, 0),
    malformedBars: coverageByTimeframe.reduce((sum, row) => sum + row.malformedBars, 0),
    decisionTapeFiveMinuteBars: tape5m.bars.length,
    localInputBars: input.sourceBars,
    timeframesWithData: TIMEFRAMES.filter((timeframe) => bars[timeframe].length > 0),
    htfTimeframesWithData: HTF_TIMEFRAMES.filter((timeframe) => bars[timeframe].length > 0),
  };
  const withoutRecommendationsAndMarkdown: Omit<RawOhlcSourceLoaderReport, 'recommendations' | 'reportMarkdown'> = {
    reportType: 'raw_ohlc_source_loader',
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
      canonicalLocalJsonOnly: true,
      missingBarsAreNotInvented: true,
      decisionTapeFallbackIs5mOnly: true,
      outputFeedsRawOhlcReplayAdapter: true,
    },
    canonicalMarketBarsPath,
    summary,
    coverageByTimeframe,
  };
  const recs = recommendations(withoutRecommendationsAndMarkdown);
  const withoutMarkdown = { ...withoutRecommendationsAndMarkdown, recommendations: recs };
  return { ...withoutMarkdown, reportMarkdown: buildMarkdown(withoutMarkdown) };
}

export function writeRawOhlcSourceLoaderReport(report: RawOhlcSourceLoaderReport, outDir: string): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-source-loader-${report.instrument}-${report.startDate}-to-${report.endDate}-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.reportMarkdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export async function runRawOhlcSourceLoaderCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseRawOhlcSourceLoaderArgs(rawArgs);
  const report = buildRawOhlcSourceLoaderReport(options);
  const paths = writeRawOhlcSourceLoaderReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, canonicalMarketBarsPath: report.canonicalMarketBarsPath, summary: report.summary }, null, 2));
  } else {
    console.log(report.reportMarkdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runRawOhlcSourceLoaderCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
