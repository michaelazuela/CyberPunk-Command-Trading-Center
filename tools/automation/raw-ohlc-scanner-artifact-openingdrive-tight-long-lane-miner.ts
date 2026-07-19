import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDriveFineRiskSlateDryRunReport,
} from './raw-ohlc-scanner-artifact-openingdrive-fine-risk-slate-dry-run';

interface CliOptions {
  slateDryRun: string;
  outDir: string;
  json: boolean;
}

interface Authority {
  readOnly: true;
  localOnly: true;
  researchOnly: true;
  postsDiscord: false;
  writesSupabase: false;
  readsLiveSupabase: false;
  readsLiveBridge: false;
  runsSetupScanner: false;
  changesScannerBehavior: false;
  changesTradingLogic: false;
  changesCanExecute: false;
  changesEntryStopTargets: false;
  changesRiskRules: false;
  changesBridgeBehavior: false;
  changesDiscordPosting: false;
  changesAppRuntime: false;
}

interface TightLongRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  proofTime: string;
  direction: string;
  riskPoints: number;
  outcomeLabel: string;
  outcomeStatus: string;
  oneMesPl: number | null;
  hourBucket: string;
  minuteBucket: string;
  riskBucket: string;
  fineRiskBucket: string;
}

interface BucketSummary {
  bucketType: string;
  key: string;
  rows: number;
  winners: number;
  losses: number;
  otherResolved: number;
  unresolved: number;
  oneMesPl: number | null;
  avgRiskPoints: number | null;
  liveUsable: boolean;
}

export interface RawOhlcScannerArtifactOpeningDriveTightLongLaneMinerReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_tight_long_lane_miner';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    slateDryRunPath: string;
  };
  assumptions: {
    savedDryRunOnly: true;
    tightLongOnly: true;
    dateBucketsAreResearchContextOnly: true;
    candidateUsesNoLookaheadFieldsOnly: true;
    outcomeFieldsAreEvaluationOnly: true;
    promotionDisabled: true;
    livePromotionAllowed: false;
  };
  summary: {
    rows: number;
    winners: number;
    losses: number;
    otherResolved: number;
    unresolved: number;
    oneMesPl: number | null;
    zeroLossLiveUsableBuckets: number;
    zeroLossDateBuckets: number;
    lossBuckets: number;
    livePromotionAllowedRows: 0;
    recommendation: 'mine_richer_structure' | 'prepare_research_only_candidate' | 'fix_inputs';
  };
  zeroLossBuckets: BucketSummary[];
  lossBuckets: BucketSummary[];
  allBuckets: BucketSummary[];
  rows: TightLongRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  const matches = fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
}

export function parseRawOhlcScannerArtifactOpeningDriveTightLongLaneMinerArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const slateDryRun = readFlag(args, '--slate-dry-run') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-fine-risk-slate-dry-run-\d+\.json$/);
  if (!slateDryRun) throw new Error('--slate-dry-run is required.');
  return { slateDryRun, outDir, json: args.includes('--json') };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): Authority {
  return {
    readOnly: true,
    localOnly: true,
    researchOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    runsSetupScanner: false,
    changesScannerBehavior: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    changesRiskRules: false,
    changesBridgeBehavior: false,
    changesDiscordPosting: false,
    changesAppRuntime: false,
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function hourBucket(proofTime: string): string {
  const hour = new Date(proofTime).getHours().toString().padStart(2, '0');
  return `${hour}:00-${hour}:59`;
}

function minuteBucket(proofTime: string): string {
  return new Date(proofTime).getMinutes().toString().padStart(2, '0');
}

function riskBucket(riskPoints: number): string {
  if (riskPoints < 5) return 'risk_4_to_5';
  if (riskPoints < 6) return 'risk_5_to_6';
  if (riskPoints < 7) return 'risk_6_to_7';
  return 'risk_7_to_8';
}

function fineRiskBucket(riskPoints: number): string {
  const lower = Math.floor(riskPoints * 2) / 2;
  const upper = lower + 0.5;
  return `risk_${lower.toFixed(1)}_to_${upper.toFixed(1)}`;
}

function toRows(report: RawOhlcScannerArtifactOpeningDriveFineRiskSlateDryRunReport): TightLongRow[] {
  return report.changedRows
    .filter((row) => row.selector === 'tight_long_risk_4_to_8')
    .map((row) => ({
      ticketId: row.ticketId,
      tradeDate: row.tradeDate,
      session: row.session,
      proofTime: row.proofTime,
      direction: row.direction,
      riskPoints: row.riskPoints,
      outcomeLabel: row.outcomeLabel,
      outcomeStatus: row.outcomeStatus,
      oneMesPl: row.oneMesPl,
      hourBucket: hourBucket(row.proofTime),
      minuteBucket: minuteBucket(row.proofTime),
      riskBucket: riskBucket(row.riskPoints),
      fineRiskBucket: fineRiskBucket(row.riskPoints),
    }));
}

function isWinner(row: TightLongRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 't1_and_t2_hit';
}

function isLoss(row: TightLongRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 'stopped_before_t1';
}

function sum(rows: TightLongRow[]): number | null {
  const values = rows.map((row) => row.oneMesPl).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return values.length ? round(values.reduce((total, value) => total + value, 0)) : null;
}

function avg(rows: TightLongRow[]): number | null {
  const values = rows.map((row) => row.riskPoints).filter((value) => Number.isFinite(value));
  return values.length ? round(values.reduce((total, value) => total + value, 0) / values.length) : null;
}

function summarize(bucketType: string, key: string, rows: TightLongRow[], liveUsable: boolean): BucketSummary {
  return {
    bucketType,
    key,
    rows: rows.length,
    winners: rows.filter(isWinner).length,
    losses: rows.filter(isLoss).length,
    otherResolved: rows.filter((row) => row.outcomeStatus === 'resolved' && !isWinner(row) && !isLoss(row)).length,
    unresolved: rows.filter((row) => row.outcomeStatus !== 'resolved').length,
    oneMesPl: sum(rows),
    avgRiskPoints: avg(rows),
    liveUsable,
  };
}

function bucket(rows: TightLongRow[], bucketType: string, keyFor: (row: TightLongRow) => string, liveUsable: boolean): BucketSummary[] {
  const groups = new Map<string, TightLongRow[]>();
  for (const row of rows) groups.set(keyFor(row), [...(groups.get(keyFor(row)) || []), row]);
  return [...groups.entries()].map(([key, groupRows]) => summarize(bucketType, key, groupRows, liveUsable));
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDriveTightLongLaneMinerReport, 'markdown'>): string {
  return [
    '# OpeningDrive Tight-Long Lane Miner',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only tight-long lane miner. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Rows W/L/O/U: ${report.summary.winners}/${report.summary.losses}/${report.summary.otherResolved}/${report.summary.unresolved}.`,
    `- One-MES P/L: ${report.summary.oneMesPl ?? '-'}.`,
    `- Zero-loss live-usable buckets: ${report.summary.zeroLossLiveUsableBuckets}.`,
    `- Zero-loss date buckets: ${report.summary.zeroLossDateBuckets}.`,
    `- Loss buckets: ${report.summary.lossBuckets}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Top Loss Buckets',
    '| Bucket | Key | Rows | W/L/O/U | P/L | Avg Risk | Live Usable |',
    '|---|---|---:|---|---:|---:|---|',
    ...report.lossBuckets.slice(0, 12).map((row) => `| ${row.bucketType} | ${row.key} | ${row.rows} | ${row.winners}/${row.losses}/${row.otherResolved}/${row.unresolved} | ${row.oneMesPl ?? '-'} | ${row.avgRiskPoints ?? '-'} | ${row.liveUsable} |`),
    '',
    '## Zero-Loss Buckets',
    '| Bucket | Key | Rows | W/L/O/U | P/L | Avg Risk | Live Usable |',
    '|---|---|---:|---|---:|---:|---|',
    ...report.zeroLossBuckets.slice(0, 16).map((row) => `| ${row.bucketType} | ${row.key} | ${row.rows} | ${row.winners}/${row.losses}/${row.otherResolved}/${row.unresolved} | ${row.oneMesPl ?? '-'} | ${row.avgRiskPoints ?? '-'} | ${row.liveUsable} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDriveTightLongLaneMinerReport(args: {
  slateDryRunPath: string;
  slateDryRun: RawOhlcScannerArtifactOpeningDriveFineRiskSlateDryRunReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDriveTightLongLaneMinerReport {
  const rows = args.slateDryRun ? toRows(args.slateDryRun) : [];
  const allBuckets = [
    ...bucket(rows, 'tradeDate', (row) => row.tradeDate, false),
    ...bucket(rows, 'hourBucket', (row) => row.hourBucket, true),
    ...bucket(rows, 'minuteBucket', (row) => row.minuteBucket, true),
    ...bucket(rows, 'riskBucket', (row) => row.riskBucket, true),
    ...bucket(rows, 'fineRiskBucket', (row) => row.fineRiskBucket, true),
    ...bucket(rows, 'hourBucket|riskBucket', (row) => `${row.hourBucket}|${row.riskBucket}`, true),
  ].sort((a, b) => b.losses - a.losses || a.winners - b.winners || b.rows - a.rows || a.key.localeCompare(b.key));
  const summary = summarize('all', 'tight_long_risk_4_to_8', rows, true);
  const zeroLossBuckets = allBuckets
    .filter((row) => row.rows >= 2 && row.losses === 0 && row.winners > 0)
    .sort((a, b) => Number(b.liveUsable) - Number(a.liveUsable) || b.winners - a.winners || (b.oneMesPl ?? 0) - (a.oneMesPl ?? 0));
  const lossBuckets = allBuckets
    .filter((row) => row.losses > 0)
    .sort((a, b) => b.losses - a.losses || a.winners - b.winners || b.rows - a.rows);
  const zeroLossLiveUsableBuckets = zeroLossBuckets.filter((row) => row.liveUsable).length;
  const blockers = [
    !args.slateDryRun ? 'missing OpeningDrive fine-risk slate dry-run report' : null,
    args.slateDryRun && args.slateDryRun.status !== 'pass' ? `slate dry-run status ${args.slateDryRun.status}` : null,
    rows.length === 0 ? 'no removed tight-long rows found' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactOpeningDriveTightLongLaneMinerReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_tight_long_lane_miner',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      slateDryRunPath: args.slateDryRunPath,
    },
    assumptions: {
      savedDryRunOnly: true,
      tightLongOnly: true,
      dateBucketsAreResearchContextOnly: true,
      candidateUsesNoLookaheadFieldsOnly: true,
      outcomeFieldsAreEvaluationOnly: true,
      promotionDisabled: true,
      livePromotionAllowed: false,
    },
    summary: {
      rows: summary.rows,
      winners: summary.winners,
      losses: summary.losses,
      otherResolved: summary.otherResolved,
      unresolved: summary.unresolved,
      oneMesPl: summary.oneMesPl,
      zeroLossLiveUsableBuckets,
      zeroLossDateBuckets: zeroLossBuckets.filter((row) => !row.liveUsable).length,
      lossBuckets: lossBuckets.length,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length ? 'fix_inputs' : zeroLossLiveUsableBuckets >= 2 ? 'prepare_research_only_candidate' : 'mine_richer_structure',
    },
    zeroLossBuckets,
    lossBuckets,
    allBuckets,
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Fix the slate dry-run input before mining the tight-long lane.']
      : [
        'Treat date buckets as research context only, never live filters.',
        zeroLossLiveUsableBuckets >= 2
          ? 'Several reusable zero-loss buckets exist; validate them with a package simulation before any approval contract.'
          : 'No strong reusable zero-loss bucket exists yet; mine richer no-lookahead structure from source artifacts.',
        'Do not change Discord, Supabase, NinjaTrader bridge, canExecute, entry, stop, target, risk, scanner runtime, or trading rules from this miner.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDriveTightLongLaneMinerReport(
  report: RawOhlcScannerArtifactOpeningDriveTightLongLaneMinerReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-tight-long-lane-miner-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDriveTightLongLaneMinerCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactOpeningDriveTightLongLaneMinerArgs(args);
  const report = buildRawOhlcScannerArtifactOpeningDriveTightLongLaneMinerReport({
    slateDryRunPath: options.slateDryRun,
    slateDryRun: fs.existsSync(options.slateDryRun)
      ? readJson<RawOhlcScannerArtifactOpeningDriveFineRiskSlateDryRunReport>(options.slateDryRun)
      : null,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDriveTightLongLaneMinerReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, topLossBuckets: report.lossBuckets.slice(0, 8), topZeroLossBuckets: report.zeroLossBuckets.slice(0, 8), blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try { runRawOhlcScannerArtifactOpeningDriveTightLongLaneMinerCli(); } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
