import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactSameBarSeparatorDrilldownReport,
  RawOhlcScannerArtifactSameBarSeparatorRow,
} from './raw-ohlc-scanner-artifact-samebar-separator-drilldown';
import type { RawOhlcScannerArtifactSameBarAllowlistProbeReport } from './raw-ohlc-scanner-artifact-samebar-allowlist-probe';

interface CliOptions {
  samebarSeparatorReport: string;
  setupType: string;
  outDir: string;
  json: boolean;
}

interface BucketSummary {
  bucket: string;
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  winRate: number | null;
  grossOneMesPl: number | null;
}

export interface RawOhlcScannerArtifactSameBarModelSeparatorReport {
  reportType: 'raw_ohlc_scanner_artifact_samebar_model_separator';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: RawOhlcScannerArtifactSameBarAllowlistProbeReport['authority'];
  source: {
    reportDir: string;
    samebarSeparatorReportPath: string | null;
    setupType: string;
  };
  assumptions: {
    readOnlyPostProcessor: true;
    usesExistingSameBarSeparatorRowsOnly: true;
    livePromotionAllowed: false;
  };
  summary: BucketSummary & {
    setupType: string;
    livePromotionAllowedRows: 0;
  };
  directionBuckets: BucketSummary[];
  timeBuckets: BucketSummary[];
  riskBuckets: BucketSummary[];
  tagBuckets: BucketSummary[];
  recommendations: string[];
  blockers: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_SETUP_TYPE = 'OpeningDriveFvgContinuation';

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

export function parseRawOhlcScannerArtifactSameBarModelSeparatorArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const samebarSeparatorReport = readFlag(args, '--samebar-separator-report') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-samebar-separator-drilldown-\d+\.json$/);
  if (!samebarSeparatorReport) throw new Error('--samebar-separator-report is required.');
  return {
    samebarSeparatorReport,
    setupType: readFlag(args, '--setup-type') || DEFAULT_SETUP_TYPE,
    outDir,
    json: args.includes('--json'),
  };
}

function authority(): RawOhlcScannerArtifactSameBarAllowlistProbeReport['authority'] {
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

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function isWinner(row: RawOhlcScannerArtifactSameBarSeparatorRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 't1_and_t2_hit';
}

function isLoss(row: RawOhlcScannerArtifactSameBarSeparatorRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 'stopped_before_t1';
}

function riskBucket(row: RawOhlcScannerArtifactSameBarSeparatorRow): string {
  if (row.riskPoints < 4) return 'risk_lt_4';
  if (row.riskPoints < 8) return 'risk_4_to_8';
  if (row.riskPoints < 16) return 'risk_8_to_16';
  return 'risk_gte_16';
}

function summarize(bucket: string, rows: RawOhlcScannerArtifactSameBarSeparatorRow[]): BucketSummary {
  const winners = rows.filter(isWinner).length;
  const losses = rows.filter(isLoss).length;
  const unresolved = rows.filter((row) => row.outcomeStatus !== 'resolved').length;
  return {
    bucket,
    rows: rows.length,
    winners,
    losses,
    unresolved,
    winRate: rows.length ? round(winners / rows.length) : null,
    grossOneMesPl: sum(rows.map((row) => row.resolvedOneMesPl)),
  };
}

function groupBy(rows: RawOhlcScannerArtifactSameBarSeparatorRow[], bucketFor: (row: RawOhlcScannerArtifactSameBarSeparatorRow) => string): BucketSummary[] {
  const groups = new Map<string, RawOhlcScannerArtifactSameBarSeparatorRow[]>();
  for (const row of rows) {
    const bucket = bucketFor(row);
    groups.set(bucket, [...(groups.get(bucket) || []), row]);
  }
  return [...groups.entries()]
    .map(([bucket, bucketRows]) => summarize(bucket, bucketRows))
    .sort((a, b) => (b.grossOneMesPl ?? Number.NEGATIVE_INFINITY) - (a.grossOneMesPl ?? Number.NEGATIVE_INFINITY));
}

function tagBuckets(rows: RawOhlcScannerArtifactSameBarSeparatorRow[]): BucketSummary[] {
  const groups = new Map<string, RawOhlcScannerArtifactSameBarSeparatorRow[]>();
  for (const row of rows) {
    for (const tag of row.separatorTags) {
      groups.set(tag, [...(groups.get(tag) || []), row]);
    }
  }
  return [...groups.entries()]
    .map(([bucket, bucketRows]) => summarize(bucket, bucketRows))
    .sort((a, b) => b.rows - a.rows || (b.grossOneMesPl ?? 0) - (a.grossOneMesPl ?? 0));
}

function recommendationsFor(summary: BucketSummary, tagSummaries: BucketSummary[]): string[] {
  const lossTags = tagSummaries.filter((bucket) => bucket.losses > 0 && (bucket.winRate ?? 1) < 0.7).map((bucket) => bucket.bucket);
  return [
    'Research only: do not install a same-bar allowlist or scanner-visible rank change from this post-processor alone.',
    summary.grossOneMesPl !== null && summary.grossOneMesPl > 0
      ? `${summary.bucket} is positive at same-bar row level, but losses must be separated before publish-quality evidence is allowed.`
      : `${summary.bucket} is not positive enough for a same-bar allowlist hypothesis.`,
    lossTags.length
      ? `Loss-bearing separator tags to validate next: ${lossTags.slice(0, 5).join(', ')}.`
      : 'No dominant loss-bearing separator tag was isolated; keep the model research-only.',
  ];
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSameBarModelSeparatorReport, 'markdown'>): string {
  return [
    '# Raw OHLC Same-Bar Model Separator',
    '',
    `Setup: ${report.summary.setupType}`,
    '',
    'Authority: local-only read-only post-processor. It does not run setupScanner, post Discord, write Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Rows: ${report.summary.rows}.`,
    `- Winners: ${report.summary.winners}.`,
    `- Losses: ${report.summary.losses}.`,
    `- Gross one-MES P/L: ${report.summary.grossOneMesPl ?? 'n/a'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSameBarModelSeparatorReport(args: {
  reportDir: string;
  samebarSeparatorReportPath: string | null;
  samebarSeparatorReport: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport | null;
  setupType: string;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSameBarModelSeparatorReport {
  const rows = (args.samebarSeparatorReport?.rows || []).filter((row) => row.setupType === args.setupType);
  const summary = {
    setupType: args.setupType,
    ...summarize(args.setupType, rows),
    livePromotionAllowedRows: 0 as const,
  };
  const tagSummaries = tagBuckets(rows);
  const blockers = [
    !args.samebarSeparatorReport ? 'missing same-bar separator drilldown report' : null,
    rows.length === 0 ? `no same-bar rows found for ${args.setupType}` : null,
  ].filter((item): item is string => Boolean(item));
  const report: Omit<RawOhlcScannerArtifactSameBarModelSeparatorReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_samebar_model_separator',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      samebarSeparatorReportPath: args.samebarSeparatorReportPath,
      setupType: args.setupType,
    },
    assumptions: {
      readOnlyPostProcessor: true,
      usesExistingSameBarSeparatorRowsOnly: true,
      livePromotionAllowed: false,
    },
    summary,
    directionBuckets: groupBy(rows, (row) => row.direction),
    timeBuckets: groupBy(rows, (row) => row.timeBucket),
    riskBuckets: groupBy(rows, riskBucket),
    tagBuckets: tagSummaries,
    recommendations: recommendationsFor(summary, tagSummaries),
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

function writeReport(report: RawOhlcScannerArtifactSameBarModelSeparatorReport, outDir: string): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-samebar-model-separator-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(markdownPath, report.markdown);
  return { jsonPath, markdownPath };
}

export async function runRawOhlcScannerArtifactSameBarModelSeparatorCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseRawOhlcScannerArtifactSameBarModelSeparatorArgs(rawArgs);
  const samebarSeparatorReport = readJson<RawOhlcScannerArtifactSameBarSeparatorDrilldownReport>(options.samebarSeparatorReport);
  const report = buildRawOhlcScannerArtifactSameBarModelSeparatorReport({
    reportDir: options.outDir,
    samebarSeparatorReportPath: options.samebarSeparatorReport,
    samebarSeparatorReport,
    setupType: options.setupType,
  });
  const paths = writeReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
    return;
  }
  console.log(report.markdown);
  console.log(`\nWrote ${paths.jsonPath}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runRawOhlcScannerArtifactSameBarModelSeparatorCli().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
