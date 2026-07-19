import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactSameBarSeparatorDrilldownReport,
  RawOhlcScannerArtifactSameBarSeparatorRow,
} from './raw-ohlc-scanner-artifact-samebar-separator-drilldown';

type BucketKind =
  | 'setupType'
  | 'session_setup'
  | 'direction_setup'
  | 'risk_setup'
  | 'time_setup'
  | 'session_direction_setup'
  | 'session_risk_setup';

interface CliOptions {
  trainSamebarReports: string[];
  testSamebarReports: string[];
  minRowsPerPeriod: number;
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

interface PeriodBucket {
  rows: number;
  winners: number;
  losses: number;
  otherResolved: number;
  unresolved: number;
  oneMesPl: number | null;
  winRateResolved: number | null;
  avgRiskPoints: number | null;
  avgMfeR: number | null;
  avgMaeR: number | null;
}

interface StabilityBucket {
  kind: BucketKind;
  key: string;
  train: PeriodBucket;
  test: PeriodBucket;
  verdict: 'stable_positive_research' | 'stable_caution_research' | 'train_positive_test_failed' | 'test_positive_train_failed' | 'mixed_or_insufficient';
  reason: string;
  score: number;
}

export interface RawOhlcScannerArtifactTransferStabilityMinerReport {
  reportType: 'raw_ohlc_scanner_artifact_transfer_stability_miner';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    reportDir: string;
    trainSamebarReports: string[];
    testSamebarReports: string[];
    minRowsPerPeriod: number;
  };
  assumptions: {
    consumesExistingSameBarReportsOnly: true;
    comparesPreEntryOrModelMetadataBucketsOnly: true;
    outcomeFieldsAreEvaluationOnly: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    trainRows: number;
    testRows: number;
    sharedBuckets: number;
    stablePositiveBuckets: number;
    stableCautionBuckets: number;
    trainPositiveTestFailedBuckets: number;
    testPositiveTrainFailedBuckets: number;
    livePromotionAllowedRows: 0;
    recommendation: 'mine_richer_no_lookahead_features' | 'validate_stable_buckets_on_fresh_replay' | 'fix_inputs';
  };
  stablePositiveBuckets: StabilityBucket[];
  stableCautionBuckets: StabilityBucket[];
  unstableBuckets: StabilityBucket[];
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

function splitPaths(value: string | null): string[] {
  return (value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function avg(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0) / numeric.length) : null;
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

export function parseRawOhlcScannerArtifactTransferStabilityMinerArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const minRows = Number(readFlag(args, '--min-rows-per-period') || 5);
  return {
    trainSamebarReports: splitPaths(readFlag(args, '--train-samebar-reports')),
    testSamebarReports: splitPaths(readFlag(args, '--test-samebar-reports')),
    minRowsPerPeriod: Number.isFinite(minRows) && minRows > 0 ? minRows : 5,
    outDir,
    json: args.includes('--json'),
  };
}

function riskBucket(row: RawOhlcScannerArtifactSameBarSeparatorRow): string {
  if (row.riskPoints < 4) return 'risk_lt_4';
  if (row.riskPoints < 8) return 'risk_4_to_8';
  if (row.riskPoints < 16) return 'risk_8_to_16';
  if (row.riskPoints < 24) return 'risk_16_to_24';
  if (row.riskPoints < 32) return 'risk_24_to_32';
  return 'risk_gte_32';
}

function bucketKey(row: RawOhlcScannerArtifactSameBarSeparatorRow, kind: BucketKind): string {
  if (kind === 'setupType') return row.setupType;
  if (kind === 'session_setup') return `${row.session}|${row.setupType}`;
  if (kind === 'direction_setup') return `${row.direction}|${row.setupType}`;
  if (kind === 'risk_setup') return `${riskBucket(row)}|${row.setupType}`;
  if (kind === 'time_setup') return `${row.timeBucket}|${row.setupType}`;
  if (kind === 'session_direction_setup') return `${row.session}|${row.direction}|${row.setupType}`;
  return `${row.session}|${riskBucket(row)}|${row.setupType}`;
}

function isWinner(row: RawOhlcScannerArtifactSameBarSeparatorRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 't1_and_t2_hit';
}

function isLoss(row: RawOhlcScannerArtifactSameBarSeparatorRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 'stopped_before_t1';
}

function summarize(rows: RawOhlcScannerArtifactSameBarSeparatorRow[]): PeriodBucket {
  const winners = rows.filter(isWinner).length;
  const losses = rows.filter(isLoss).length;
  const otherResolved = rows.filter((row) => row.outcomeStatus === 'resolved' && !isWinner(row) && !isLoss(row)).length;
  const unresolved = rows.filter((row) => row.outcomeStatus !== 'resolved').length;
  const resolved = winners + losses + otherResolved;
  return {
    rows: rows.length,
    winners,
    losses,
    otherResolved,
    unresolved,
    oneMesPl: sum(rows.map((row) => row.resolvedOneMesPl)),
    winRateResolved: resolved ? round(winners / resolved) : null,
    avgRiskPoints: avg(rows.map((row) => row.riskPoints)),
    avgMfeR: avg(rows.map((row) => row.mfeR)),
    avgMaeR: avg(rows.map((row) => row.maeR)),
  };
}

function bucketMap(rows: RawOhlcScannerArtifactSameBarSeparatorRow[]): Map<string, { kind: BucketKind; key: string; rows: RawOhlcScannerArtifactSameBarSeparatorRow[] }> {
  const kinds: BucketKind[] = ['setupType', 'session_setup', 'direction_setup', 'risk_setup', 'time_setup', 'session_direction_setup', 'session_risk_setup'];
  const map = new Map<string, { kind: BucketKind; key: string; rows: RawOhlcScannerArtifactSameBarSeparatorRow[] }>();
  for (const row of rows) {
    for (const kind of kinds) {
      const key = bucketKey(row, kind);
      const id = `${kind}:${key}`;
      const existing = map.get(id);
      if (existing) existing.rows.push(row);
      else map.set(id, { kind, key, rows: [row] });
    }
  }
  return map;
}

function isPositive(bucket: PeriodBucket, minRows: number): boolean {
  return bucket.rows >= minRows && (bucket.oneMesPl ?? 0) > 0 && (bucket.winRateResolved ?? 0) >= 0.6 && bucket.winners > bucket.losses;
}

function isCaution(bucket: PeriodBucket, minRows: number): boolean {
  return bucket.rows >= minRows && ((bucket.oneMesPl ?? 0) <= 0 || bucket.losses >= bucket.winners);
}

function classify(train: PeriodBucket, test: PeriodBucket, minRows: number): Pick<StabilityBucket, 'verdict' | 'reason' | 'score'> {
  const trainPositive = isPositive(train, minRows);
  const testPositive = isPositive(test, minRows);
  const trainCaution = isCaution(train, minRows);
  const testCaution = isCaution(test, minRows);
  const score = round((train.oneMesPl ?? 0) + (test.oneMesPl ?? 0) + ((train.winRateResolved ?? 0) + (test.winRateResolved ?? 0)) * 100 - (train.losses + test.losses) * 20);
  if (trainPositive && testPositive) return { verdict: 'stable_positive_research', reason: 'positive in both train and test periods using only bucket metadata', score };
  if (trainCaution && testCaution) return { verdict: 'stable_caution_research', reason: 'caution/loss-bearing in both train and test periods', score };
  if (trainPositive && !testPositive) return { verdict: 'train_positive_test_failed', reason: 'positive in train but did not transfer to test', score };
  if (testPositive && !trainPositive) return { verdict: 'test_positive_train_failed', reason: 'positive in test but absent or failed in train', score };
  return { verdict: 'mixed_or_insufficient', reason: 'insufficient rows or mixed cross-period evidence', score };
}

function buildStabilityBuckets(trainRows: RawOhlcScannerArtifactSameBarSeparatorRow[], testRows: RawOhlcScannerArtifactSameBarSeparatorRow[], minRows: number): StabilityBucket[] {
  const train = bucketMap(trainRows);
  const test = bucketMap(testRows);
  const ids = [...new Set([...train.keys(), ...test.keys()])].sort();
  return ids.map((id) => {
    const trainBucket = train.get(id);
    const testBucket = test.get(id);
    const kind = (trainBucket?.kind || testBucket?.kind) as BucketKind;
    const key = trainBucket?.key || testBucket?.key || id.split(':').slice(1).join(':');
    const trainSummary = summarize(trainBucket?.rows || []);
    const testSummary = summarize(testBucket?.rows || []);
    const verdict = classify(trainSummary, testSummary, minRows);
    return { kind, key, train: trainSummary, test: testSummary, ...verdict };
  }).sort((a, b) => b.score - a.score || b.train.rows + b.test.rows - (a.train.rows + a.test.rows) || a.kind.localeCompare(b.kind) || a.key.localeCompare(b.key));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function bucketRow(row: StabilityBucket): string {
  return `| ${row.kind} | ${escapeTable(row.key)} | ${row.train.rows} | ${row.train.winners}/${row.train.losses}/${row.train.otherResolved}/${row.train.unresolved} | ${row.train.oneMesPl ?? '-'} | ${row.test.rows} | ${row.test.winners}/${row.test.losses}/${row.test.otherResolved}/${row.test.unresolved} | ${row.test.oneMesPl ?? '-'} | ${row.score} | ${row.verdict} | ${escapeTable(row.reason)} |`;
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactTransferStabilityMinerReport, 'markdown'>): string {
  return [
    '# Raw-OHLC Transfer Stability Miner',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only transfer research. It compares saved same-bar reports only; it does not install rank behavior, loosen canExecute, post Discord, write Supabase, read the bridge, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Train/test rows: ${report.summary.trainRows}/${report.summary.testRows}.`,
    `- Shared buckets: ${report.summary.sharedBuckets}.`,
    `- Stable positive/caution: ${report.summary.stablePositiveBuckets}/${report.summary.stableCautionBuckets}.`,
    `- Train-positive failed/test-positive failed: ${report.summary.trainPositiveTestFailedBuckets}/${report.summary.testPositiveTrainFailedBuckets}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Stable Positive Buckets',
    '| Kind | Key | Train Rows | Train W/L/O/U | Train P/L | Test Rows | Test W/L/O/U | Test P/L | Score | Verdict | Reason |',
    '|---|---|---:|---|---:|---:|---|---:|---:|---|---|',
    ...report.stablePositiveBuckets.map(bucketRow),
    '',
    '## Stable Caution Buckets',
    '| Kind | Key | Train Rows | Train W/L/O/U | Train P/L | Test Rows | Test W/L/O/U | Test P/L | Score | Verdict | Reason |',
    '|---|---|---:|---|---:|---:|---|---:|---:|---|---|',
    ...report.stableCautionBuckets.map(bucketRow),
    '',
    '## Top Unstable Buckets',
    '| Kind | Key | Train Rows | Train W/L/O/U | Train P/L | Test Rows | Test W/L/O/U | Test P/L | Score | Verdict | Reason |',
    '|---|---|---:|---|---:|---:|---|---:|---:|---|---|',
    ...report.unstableBuckets.slice(0, 30).map(bucketRow),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactTransferStabilityMinerReport(args: {
  reportDir: string;
  trainSamebarReportPaths: string[];
  trainSamebarReports: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport[];
  testSamebarReportPaths: string[];
  testSamebarReports: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport[];
  minRowsPerPeriod?: number;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactTransferStabilityMinerReport {
  const minRowsPerPeriod = args.minRowsPerPeriod ?? 5;
  const trainRows = args.trainSamebarReports.flatMap((report) => report.rows || []);
  const testRows = args.testSamebarReports.flatMap((report) => report.rows || []);
  const buckets = buildStabilityBuckets(trainRows, testRows, minRowsPerPeriod);
  const stablePositiveBuckets = buckets.filter((bucket) => bucket.verdict === 'stable_positive_research');
  const stableCautionBuckets = buckets.filter((bucket) => bucket.verdict === 'stable_caution_research').sort((a, b) => a.score - b.score);
  const unstableBuckets = buckets.filter((bucket) => bucket.verdict === 'train_positive_test_failed' || bucket.verdict === 'test_positive_train_failed');
  const blockers = [
    args.trainSamebarReports.length === 0 ? 'missing train same-bar reports' : null,
    args.testSamebarReports.length === 0 ? 'missing test same-bar reports' : null,
    trainRows.length === 0 ? 'no train same-bar rows found' : null,
    testRows.length === 0 ? 'no test same-bar rows found' : null,
    ...args.trainSamebarReports.map((report, index) => report.status !== 'pass' ? `train same-bar report ${args.trainSamebarReportPaths[index]} status ${report.status}` : null),
    ...args.testSamebarReports.map((report, index) => report.status !== 'pass' ? `test same-bar report ${args.testSamebarReportPaths[index]} status ${report.status}` : null),
  ].filter((item): item is string => Boolean(item));
  const summary = {
    trainRows: trainRows.length,
    testRows: testRows.length,
    sharedBuckets: buckets.filter((bucket) => bucket.train.rows > 0 && bucket.test.rows > 0).length,
    stablePositiveBuckets: stablePositiveBuckets.length,
    stableCautionBuckets: stableCautionBuckets.length,
    trainPositiveTestFailedBuckets: buckets.filter((bucket) => bucket.verdict === 'train_positive_test_failed').length,
    testPositiveTrainFailedBuckets: buckets.filter((bucket) => bucket.verdict === 'test_positive_train_failed').length,
    livePromotionAllowedRows: 0 as const,
    recommendation: blockers.length
      ? 'fix_inputs' as const
      : stablePositiveBuckets.length
        ? 'validate_stable_buckets_on_fresh_replay' as const
        : 'mine_richer_no_lookahead_features' as const,
  };
  const base: Omit<RawOhlcScannerArtifactTransferStabilityMinerReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_transfer_stability_miner',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      trainSamebarReports: args.trainSamebarReportPaths,
      testSamebarReports: args.testSamebarReportPaths,
      minRowsPerPeriod,
    },
    assumptions: {
      consumesExistingSameBarReportsOnly: true,
      comparesPreEntryOrModelMetadataBucketsOnly: true,
      outcomeFieldsAreEvaluationOnly: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    summary,
    stablePositiveBuckets,
    stableCautionBuckets,
    unstableBuckets,
    blockers,
    recommendations: blockers.length
      ? ['Fix the train/test same-bar report inputs before using transfer stability findings.']
      : [
        stablePositiveBuckets.length
          ? 'Treat stable positive buckets as research hypotheses only; validate them on fresh replay before any scanner-visible proposal.'
          : 'Static same-bar bucket metadata did not produce a transfer-stable positive selector; mine richer no-lookahead proof/geometry/context fields next.',
        'Preserve canExecute, 5M execution authority, protected stops, target/risk math, Discord posting, Supabase persistence, and bridge behavior.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactTransferStabilityMinerReport(
  report: RawOhlcScannerArtifactTransferStabilityMinerReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-transfer-stability-miner-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactTransferStabilityMinerCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactTransferStabilityMinerArgs(args);
  const report = buildRawOhlcScannerArtifactTransferStabilityMinerReport({
    reportDir: options.outDir,
    trainSamebarReportPaths: options.trainSamebarReports,
    trainSamebarReports: options.trainSamebarReports.map((filePath) => readJson<RawOhlcScannerArtifactSameBarSeparatorDrilldownReport>(filePath)),
    testSamebarReportPaths: options.testSamebarReports,
    testSamebarReports: options.testSamebarReports.map((filePath) => readJson<RawOhlcScannerArtifactSameBarSeparatorDrilldownReport>(filePath)),
    minRowsPerPeriod: options.minRowsPerPeriod,
  });
  const paths = writeRawOhlcScannerArtifactTransferStabilityMinerReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({
      ...paths,
      status: report.status,
      summary: report.summary,
      stablePositiveBuckets: report.stablePositiveBuckets.slice(0, 10),
      stableCautionBuckets: report.stableCautionBuckets.slice(0, 10),
      unstableBuckets: report.unstableBuckets.slice(0, 10),
      blockers: report.blockers,
    }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactTransferStabilityMinerCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
