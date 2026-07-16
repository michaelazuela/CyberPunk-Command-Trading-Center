import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getNinjaHistoricalBars,
  type NinjaBridgeBar,
  type NinjaBridgeTimeframe,
} from '../../src/lib/ninjaTraderBridge';
import {
  fetchCachedMarketBars,
  loadMarketDataConfig,
  normalizeCandleTimeEt,
  type MarketBarTimeframe,
  type MarketDataConfig,
} from './market-data-store';
import {
  marketDataSourceFromCounts,
  mergeMarketDataBars,
  verifyMarketDataWindow,
  type MarketDataWindowVerification,
} from './market-data-ingestion';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

type SourceMode = 'local-json' | 'market-bars' | 'bridge' | 'market-bars-then-bridge';
type Timeframe = '5m' | '15m' | '60m' | '120m' | '240m';

interface CliOptions {
  startDate: string;
  endDate: string;
  instrument: string;
  bridgeInstrument: string;
  bridgeUrl: string;
  source: SourceMode;
  inputJson: string | null;
  outDir: string;
  chunkDays: number;
  lookbackDays: number;
  json: boolean;
}

interface LoadedTimeframe {
  timeframe: Timeframe;
  requestedFrom: string;
  requestedTo: string;
  bars: NinjaBridgeBar[];
  localBars: number;
  cacheBars: number;
  bridgeBars: number;
  bridgeRequests: number;
  failures: string[];
  verification: MarketDataWindowVerification;
}

export interface ControlledHtfOhlcAcquisitionReport {
  reportType: 'controlled_htf_ohlc_acquisition';
  generatedAt: string;
  startDate: string;
  endDate: string;
  instrument: string;
  bridgeInstrument: string;
  source: SourceMode;
  authority: {
    researchOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: boolean;
    readsLiveBridge: boolean;
    runsSetupScanner: false;
    changesTradingRules: false;
    changesCanExecute: false;
    changesBridgeBehavior: false;
    changesScannerBehavior: false;
  };
  assumptions: {
    missingBarsAreNotInvented: true;
    canonicalOutputIsLocalOnly: true;
    marketBarsReadsAreReadOnly: true;
    bridgeReadsAreHistoricalReadOnly: true;
    htfLookbackCalendarDays: number;
  };
  canonicalMarketBarsPath: string;
  summary: {
    totalBars: number;
    sufficientTimeframes: Timeframe[];
    dataLimitedTimeframes: Timeframe[];
    liveSupabaseReadAttempted: boolean;
    liveBridgeReadAttempted: boolean;
  };
  coverage: Array<{
    timeframe: Timeframe;
    source: MarketDataWindowVerification['source'];
    barsLoaded: number;
    localBars: number;
    cacheBars: number;
    bridgeBars: number;
    bridgeRequests: number;
    rangeStart: string | null;
    rangeEnd: string | null;
    sufficient: boolean;
    failures: string[];
    warning: string | null;
  }>;
  recommendations: string[];
  reportMarkdown: string;
}

interface AcquisitionDeps {
  loadConfig?: () => MarketDataConfig | null;
  fetchCached?: typeof fetchCachedMarketBars;
  fetchHistorical?: typeof getNinjaHistoricalBars;
}

type AcquisitionBaseReport = Omit<
  ControlledHtfOhlcAcquisitionReport,
  'canonicalMarketBarsPath' | 'summary' | 'coverage' | 'recommendations' | 'reportMarkdown'
>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');
const TIMEFRAMES: Array<{ key: Timeframe; bridge: NinjaBridgeTimeframe; minimumBars: number }> = [
  { key: '5m', bridge: '5m', minimumBars: 1 },
  { key: '15m', bridge: '15m', minimumBars: 1 },
  { key: '60m', bridge: '60m', minimumBars: 1 },
  { key: '120m', bridge: '120m', minimumBars: 1 },
  { key: '240m', bridge: '240m', minimumBars: 1 },
];

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

function assertSource(value: string): SourceMode {
  if (value === 'local-json' || value === 'market-bars' || value === 'bridge' || value === 'market-bars-then-bridge') return value;
  throw new Error('--source must be local-json, market-bars, bridge, or market-bars-then-bridge.');
}

export function parseControlledHtfOhlcAcquisitionArgs(args = process.argv.slice(2)): CliOptions {
  const startDate = assertDate(readFlag(args, '--start-date') || '2026-06-01', '--start-date');
  const endDate = assertDate(readFlag(args, '--end-date') || '2026-07-02', '--end-date');
  const instrument = (readFlag(args, '--instrument') || 'MES').toUpperCase();
  return {
    startDate,
    endDate,
    instrument,
    bridgeInstrument: readFlag(args, '--bridge-instrument') || process.env.NINJATRADER_BRIDGE_INSTRUMENT || instrument,
    bridgeUrl: readFlag(args, '--bridge-url') || process.env.NINJATRADER_BRIDGE_URL || 'http://127.0.0.1:8765',
    source: assertSource(readFlag(args, '--source') || 'local-json'),
    inputJson: readFlag(args, '--input-json'),
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    chunkDays: Math.max(1, Math.trunc(Number(readFlag(args, '--chunk-days') || 7))),
    lookbackDays: Math.max(1, Math.trunc(Number(readFlag(args, '--lookback-days') || 30))),
    json: args.includes('--json'),
  };
}

function addDays(dateText: string, days: number): string {
  const date = new Date(`${dateText}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function easternOffsetFor(dateText: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    timeZoneName: 'shortOffset',
  }).formatToParts(new Date(`${dateText}T12:00:00Z`));
  const raw = parts.find((part) => part.type === 'timeZoneName')?.value || 'GMT-4';
  const match = raw.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return '-04:00';
  return `${match[1]}${match[2].padStart(2, '0')}:${(match[3] || '00').padStart(2, '0')}`;
}

function requestFromDate(startDate: string, lookbackDays: number): string {
  return `${addDays(startDate, -lookbackDays)}T00:00:00${easternOffsetFor(startDate)}`;
}

function requestToDate(endDate: string): string {
  return `${endDate}T23:59:59${easternOffsetFor(endDate)}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function finiteNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeBar(value: unknown): NinjaBridgeBar | null {
  const record = asRecord(value);
  const time = normalizeCandleTimeEt(String(record.time ?? record.candle_time_et ?? record.timestamp ?? ''));
  const open = finiteNumber(record.open);
  const high = finiteNumber(record.high);
  const low = finiteNumber(record.low);
  const close = finiteNumber(record.close);
  if (!time || open === null || high === null || low === null || close === null) return null;
  if (high < Math.max(open, close, low) || low > Math.min(open, close, high)) return null;
  const volume = finiteNumber(record.volume);
  return { time, open, high, low, close, volume: volume || 0 };
}

function loadLocalBars(inputJson: string | null): Record<Timeframe, NinjaBridgeBar[]> {
  const output: Record<Timeframe, NinjaBridgeBar[]> = { '5m': [], '15m': [], '60m': [], '120m': [], '240m': [] };
  if (!inputJson) return output;
  const root = asRecord(JSON.parse(fs.readFileSync(inputJson, 'utf8')) as unknown);
  const grouped = asRecord(root.bars || root.timeframes || root);
  for (const timeframe of TIMEFRAMES.map((item) => item.key)) {
    const rows = Array.isArray(grouped[timeframe]) ? grouped[timeframe] as unknown[] : [];
    output[timeframe] = mergeMarketDataBars(rows.map(normalizeBar).filter((bar): bar is NinjaBridgeBar => Boolean(bar)), []);
  }
  return output;
}

async function fetchBridgeSegmented(args: {
  bridgeUrl: string;
  bridgeInstrument: string;
  timeframe: NinjaBridgeTimeframe;
  fromDate: string;
  toDate: string;
  toTimestamp: string;
  chunkDays: number;
  fetchHistorical: typeof getNinjaHistoricalBars;
}): Promise<{ bars: NinjaBridgeBar[]; requests: number; failures: string[] }> {
  const chunks: NinjaBridgeBar[][] = [];
  const failures: string[] = [];
  let requests = 0;

  for (let date = args.fromDate; date <= args.toDate; date = addDays(date, args.chunkDays)) {
    const nextDate = addDays(date, args.chunkDays);
    const from = `${date}T00:00:00${easternOffsetFor(date)}`;
    const to = nextDate > args.toDate ? args.toTimestamp : `${nextDate}T00:00:00${easternOffsetFor(nextDate)}`;
    requests += 1;
    try {
      const response = await args.fetchHistorical({
        instrument: args.bridgeInstrument,
        timeframe: args.timeframe,
        from,
        to,
        limit: 5000,
        baseUrl: args.bridgeUrl,
      });
      if (!response.ok) {
        failures.push(`${args.timeframe} ${from} to ${to}: ${response.error || 'bridge returned not ok'}`);
        continue;
      }
      chunks.push(response.bars || []);
    } catch (error) {
      failures.push(`${args.timeframe} ${from} to ${to}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { bars: mergeMarketDataBars(chunks.flat(), []), requests, failures };
}

async function loadTimeframe(args: {
  options: CliOptions;
  timeframe: typeof TIMEFRAMES[number];
  localBars: NinjaBridgeBar[];
  requestedFrom: string;
  requestedTo: string;
  deps: Required<AcquisitionDeps>;
}): Promise<LoadedTimeframe> {
  const failures: string[] = [];
  const wantsMarketBars = args.options.source === 'market-bars' || args.options.source === 'market-bars-then-bridge';
  const wantsBridge = args.options.source === 'bridge' || args.options.source === 'market-bars-then-bridge';
  const config = wantsMarketBars ? args.deps.loadConfig() : null;
  if (wantsMarketBars && !config) failures.push('market_bars read skipped: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or DISCORD_RAG_USER_ID is missing.');

  const cacheBars = config
    ? await args.deps.fetchCached({
      instrument: args.options.bridgeInstrument,
      timeframe: args.timeframe.key,
      from: args.requestedFrom,
      to: args.requestedTo,
      config,
      limit: 25000,
    }).catch((error) => {
      failures.push(`market_bars ${args.timeframe.key}: ${error instanceof Error ? error.message : String(error)}`);
      return [] as NinjaBridgeBar[];
    })
    : [];

  const bridge = wantsBridge
    ? await fetchBridgeSegmented({
      bridgeUrl: args.options.bridgeUrl,
      bridgeInstrument: args.options.bridgeInstrument,
      timeframe: args.timeframe.bridge,
      fromDate: addDays(args.options.startDate, -args.options.lookbackDays),
      toDate: args.options.endDate,
      toTimestamp: args.requestedTo,
      chunkDays: args.options.chunkDays,
      fetchHistorical: args.deps.fetchHistorical,
    })
    : { bars: [], requests: 0, failures: [] };

  failures.push(...bridge.failures);
  const sourceBars = args.options.source === 'bridge'
    ? mergeMarketDataBars(bridge.bars, args.localBars)
    : args.options.source === 'market-bars'
      ? mergeMarketDataBars(cacheBars, args.localBars)
      : args.options.source === 'market-bars-then-bridge'
        ? mergeMarketDataBars(bridge.bars, mergeMarketDataBars(cacheBars, args.localBars))
        : mergeMarketDataBars(args.localBars, []);

  const verification = verifyMarketDataWindow({
    bars: sourceBars,
    timeframe: args.timeframe.key,
    requestedFrom: args.requestedFrom,
    requestedTo: args.requestedTo,
    requiredLookbackDays: args.options.lookbackDays,
    minimumBars: args.timeframe.minimumBars,
    source: marketDataSourceFromCounts(cacheBars.length + args.localBars.length, bridge.bars.length),
    cacheBars: cacheBars.length + args.localBars.length,
    bridgeRepairBars: bridge.bars.length,
    bridgeInstrument: args.options.bridgeInstrument,
  });

  return {
    timeframe: args.timeframe.key,
    requestedFrom: args.requestedFrom,
    requestedTo: args.requestedTo,
    bars: mergeMarketDataBars(sourceBars, []),
    localBars: args.localBars.length,
    cacheBars: cacheBars.length,
    bridgeBars: bridge.bars.length,
    bridgeRequests: bridge.requests,
    failures,
    verification,
  };
}

function writeCanonicalMarketBars(args: {
  report: AcquisitionBaseReport;
  loaded: LoadedTimeframe[];
  outDir: string;
}): string {
  fs.mkdirSync(args.outDir, { recursive: true });
  const base = `controlled-htf-ohlc-source-${args.report.instrument}-${args.report.startDate}-to-${args.report.endDate}-${Date.now()}`;
  const file = path.join(args.outDir, `${base}.json`);
  const bars: Record<Timeframe, NinjaBridgeBar[]> = { '5m': [], '15m': [], '60m': [], '120m': [], '240m': [] };
  for (const item of args.loaded) bars[item.timeframe] = item.bars;
  fs.writeFileSync(file, `${JSON.stringify({
    reportType: 'controlled_htf_ohlc_canonical_market_bars',
    generatedAt: args.report.generatedAt,
    instrument: args.report.instrument,
    bridgeInstrument: args.report.bridgeInstrument,
    source: args.report.source,
    authority: {
      localFileOnly: true,
      noDiscordPost: true,
      noSupabaseWrite: true,
      noScannerRuleExecution: true,
      missingBarsAreNotInvented: true,
    },
    bars,
  }, null, 2)}\n`, 'utf8');
  return file;
}

function recommendations(report: Omit<ControlledHtfOhlcAcquisitionReport, 'recommendations' | 'reportMarkdown'>): string[] {
  const lines = [
    'Feed canonicalMarketBarsPath into research:raw-ohlc-pipeline --input-json for the next replay pass.',
    'Keep data-limited timeframes out of HTF promotion conclusions until their coverage is sufficient.',
  ];
  if (report.summary.dataLimitedTimeframes.length) {
    lines.push(`Data-limited timeframes: ${report.summary.dataLimitedTimeframes.join(', ')}. Load/repair these bars before treating replay conclusions as final.`);
  }
  return lines;
}

function buildMarkdown(report: Omit<ControlledHtfOhlcAcquisitionReport, 'reportMarkdown'>): string {
  const lines = [
    `# Controlled HTF OHLC Acquisition - ${report.instrument} ${report.startDate} to ${report.endDate}`,
    '',
    'Research-only acquisition report. No Discord posts, Supabase writes, scanner execution, scanner behavior changes, trading-rule changes, canExecute changes, bridge behavior changes, or invented candles.',
    '',
    `Source mode: ${report.source}.`,
    `Canonical market-bars JSON: ${report.canonicalMarketBarsPath}`,
    '',
    '## Coverage',
    '| Timeframe | Source | Bars | Local | Cache | Bridge | Range Start | Range End | Sufficient | Warning |',
    '|---|---|---:|---:|---:|---:|---|---|---|---|',
  ];
  for (const row of report.coverage) {
    lines.push(`| ${row.timeframe} | ${row.source} | ${row.barsLoaded} | ${row.localBars} | ${row.cacheBars} | ${row.bridgeBars} | ${row.rangeStart || 'N/A'} | ${row.rangeEnd || 'N/A'} | ${row.sufficient ? 'yes' : 'no'} | ${row.warning || '-'} |`);
  }
  lines.push('', '## Recommendations');
  for (const item of report.recommendations) lines.push(`- ${item}`);
  return lines.join('\n');
}

export async function buildControlledHtfOhlcAcquisitionReport(
  options: CliOptions,
  generatedAt = new Date().toISOString(),
  deps: AcquisitionDeps = {},
): Promise<ControlledHtfOhlcAcquisitionReport> {
  const resolvedDeps: Required<AcquisitionDeps> = {
    loadConfig: deps.loadConfig || loadMarketDataConfig,
    fetchCached: deps.fetchCached || fetchCachedMarketBars,
    fetchHistorical: deps.fetchHistorical || getNinjaHistoricalBars,
  };
  const local = loadLocalBars(options.inputJson);
  const requestedFrom = requestFromDate(options.startDate, options.lookbackDays);
  const requestedTo = requestToDate(options.endDate);
  const loaded: LoadedTimeframe[] = [];
  for (const timeframe of TIMEFRAMES) {
    loaded.push(await loadTimeframe({
      options,
      timeframe,
      localBars: local[timeframe.key],
      requestedFrom,
      requestedTo,
      deps: resolvedDeps,
    }));
  }
  const baseReport: AcquisitionBaseReport = {
    reportType: 'controlled_htf_ohlc_acquisition',
    generatedAt,
    startDate: options.startDate,
    endDate: options.endDate,
    instrument: options.instrument,
    bridgeInstrument: options.bridgeInstrument,
    source: options.source,
    authority: {
      researchOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: options.source === 'market-bars' || options.source === 'market-bars-then-bridge',
      readsLiveBridge: options.source === 'bridge' || options.source === 'market-bars-then-bridge',
      runsSetupScanner: false,
      changesTradingRules: false,
      changesCanExecute: false,
      changesBridgeBehavior: false,
      changesScannerBehavior: false,
    },
    assumptions: {
      missingBarsAreNotInvented: true,
      canonicalOutputIsLocalOnly: true,
      marketBarsReadsAreReadOnly: true,
      bridgeReadsAreHistoricalReadOnly: true,
      htfLookbackCalendarDays: options.lookbackDays,
    },
  };
  const canonicalMarketBarsPath = writeCanonicalMarketBars({ report: baseReport, loaded, outDir: options.outDir });
  const withoutRecommendationsAndMarkdown: Omit<ControlledHtfOhlcAcquisitionReport, 'recommendations' | 'reportMarkdown'> = {
    ...baseReport,
    canonicalMarketBarsPath,
    summary: {
      totalBars: loaded.reduce((sum, item) => sum + item.bars.length, 0),
      sufficientTimeframes: loaded.filter((item) => item.verification.sufficient).map((item) => item.timeframe),
      dataLimitedTimeframes: loaded.filter((item) => !item.verification.sufficient).map((item) => item.timeframe),
      liveSupabaseReadAttempted: baseReport.authority.readsLiveSupabase,
      liveBridgeReadAttempted: baseReport.authority.readsLiveBridge,
    },
    coverage: loaded.map((item) => ({
      timeframe: item.timeframe,
      source: item.verification.source,
      barsLoaded: item.verification.barsLoaded,
      localBars: item.localBars,
      cacheBars: item.cacheBars,
      bridgeBars: item.bridgeBars,
      bridgeRequests: item.bridgeRequests,
      rangeStart: item.verification.rangeStart,
      rangeEnd: item.verification.rangeEnd,
      sufficient: item.verification.sufficient,
      failures: item.failures,
      warning: item.verification.warning,
    })),
  };
  const recs = recommendations(withoutRecommendationsAndMarkdown);
  const withoutMarkdown = { ...withoutRecommendationsAndMarkdown, recommendations: recs };
  return { ...withoutMarkdown, reportMarkdown: buildMarkdown(withoutMarkdown) };
}

export function writeControlledHtfOhlcAcquisitionReport(report: ControlledHtfOhlcAcquisitionReport, outDir: string): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `controlled-htf-ohlc-acquisition-${report.instrument}-${report.startDate}-to-${report.endDate}-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.reportMarkdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export async function runControlledHtfOhlcAcquisitionCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseControlledHtfOhlcAcquisitionArgs(rawArgs);
  const report = await buildControlledHtfOhlcAcquisitionReport(options);
  const paths = writeControlledHtfOhlcAcquisitionReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, canonicalMarketBarsPath: report.canonicalMarketBarsPath, summary: report.summary }, null, 2));
  } else {
    console.log(report.reportMarkdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runControlledHtfOhlcAcquisitionCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
