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
  minRows: number;
  json: boolean;
}

interface FeatureBucket {
  featureSet: string;
  featureValue: string;
  evaluatedRows: number;
  keptRows: number;
  rejectedRows: number;
  keptWinners: number;
  keptLosses: number;
  keptUnresolved: number;
  rejectedWinners: number;
  rejectedLosses: number;
  rejectedUnresolved: number;
  keptWinRate: number | null;
  keptOneMesPl: number | null;
  rejectedOneMesPl: number | null;
  avgKeptRiskPoints: number | null;
  falseRejectWinnerRows: number;
  score: number;
  decision: 'candidate_for_more_research' | 'rejected_for_now';
}

export interface RawOhlcScannerArtifactOpeningDriveNoLookaheadSeparatorReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_no_lookahead_separator';
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
    usesNoLookaheadFeatureFieldsOnly: true;
    outcomeFieldsAreEvaluationOnly: true;
    candidatesAreNotLiveFilters: true;
    livePromotionAllowed: false;
  };
  featurePolicy: {
    allowedFeatureFields: string[];
    rejectedLookaheadFields: string[];
  };
  summary: {
    setupType: string;
    sourceRows: number;
    winners: number;
    losses: number;
    unresolved: number;
    grossOneMesPl: number | null;
    bucketsEvaluated: number;
    acceptedBuckets: number;
    topBucketId: string | null;
    livePromotionAllowedRows: 0;
  };
  buckets: FeatureBucket[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_SETUP_TYPE = 'OpeningDriveFvgContinuation';
const DEFAULT_MIN_ROWS = 8;

const ALLOWED_FEATURE_FIELDS = [
  'session',
  'direction',
  'proofTime.hour/timeBucket',
  'riskPoints.bucket',
  'session+direction',
  'timeBucket+direction',
  'timeBucket+riskBucket',
  'direction+riskBucket',
  'timeBucket+direction+riskBucket',
];

const REJECTED_LOOKAHEAD_FIELDS = [
  'outcomeLabel',
  'outcomeStatus',
  'resolvedOneMesPl',
  'entryHitTime',
  'firstReplayBarTime',
  'stopHitTime',
  't1HitTime',
  't2HitTime',
  'mfeR',
  'maeR',
  'separatorTags',
];

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

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

export function parseRawOhlcScannerArtifactOpeningDriveNoLookaheadSeparatorArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const samebarSeparatorReport = readFlag(args, '--samebar-separator-report') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-samebar-separator-drilldown-\d+\.json$/);
  const minRows = Number(readFlag(args, '--min-rows') || DEFAULT_MIN_ROWS);
  if (!samebarSeparatorReport) throw new Error('--samebar-separator-report is required.');
  if (!Number.isFinite(minRows) || minRows < 1) throw new Error('--min-rows must be a positive number.');
  return {
    samebarSeparatorReport,
    setupType: readFlag(args, '--setup-type') || DEFAULT_SETUP_TYPE,
    outDir,
    minRows,
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

function avg(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0) / numeric.length) : null;
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

function noLookaheadFeatures(row: RawOhlcScannerArtifactSameBarSeparatorRow): Array<{ set: string; value: string }> {
  const risk = riskBucket(row);
  return [
    { set: 'session', value: row.session },
    { set: 'direction', value: row.direction },
    { set: 'time_bucket', value: row.timeBucket },
    { set: 'risk_bucket', value: risk },
    { set: 'session_direction', value: `${row.session}|${row.direction}` },
    { set: 'time_direction', value: `${row.timeBucket}|${row.direction}` },
    { set: 'time_risk', value: `${row.timeBucket}|${risk}` },
    { set: 'direction_risk', value: `${row.direction}|${risk}` },
    { set: 'time_direction_risk', value: `${row.timeBucket}|${row.direction}|${risk}` },
  ];
}

function buildFeatureBucket(
  featureSet: string,
  featureValue: string,
  rows: RawOhlcScannerArtifactSameBarSeparatorRow[],
  minRows: number,
): FeatureBucket | null {
  const kept = rows.filter((row) => noLookaheadFeatures(row).some((feature) => feature.set === featureSet && feature.value === featureValue));
  const rejected = rows.filter((row) => !kept.includes(row));
  if (kept.length === 0 || rejected.length === 0) return null;
  const keptWinners = kept.filter(isWinner).length;
  const keptLosses = kept.filter(isLoss).length;
  const rejectedWinners = rejected.filter(isWinner).length;
  const rejectedLosses = rejected.filter(isLoss).length;
  const keptOneMesPl = sum(kept.map((row) => row.resolvedOneMesPl));
  const rejectedOneMesPl = sum(rejected.map((row) => row.resolvedOneMesPl));
  const falseRejectWinnerRows = rejectedWinners;
  const score = round((keptOneMesPl ?? 0) + (rejectedLosses * 15) - (keptLosses * 40) - (falseRejectWinnerRows * 20));
  const decision = kept.length >= minRows &&
    keptWinners > 0 &&
    keptLosses === 0 &&
    (keptOneMesPl ?? 0) > 0
    ? 'candidate_for_more_research'
    : 'rejected_for_now';
  return {
    featureSet,
    featureValue,
    evaluatedRows: rows.length,
    keptRows: kept.length,
    rejectedRows: rejected.length,
    keptWinners,
    keptLosses,
    keptUnresolved: kept.filter((row) => row.outcomeStatus !== 'resolved').length,
    rejectedWinners,
    rejectedLosses,
    rejectedUnresolved: rejected.filter((row) => row.outcomeStatus !== 'resolved').length,
    keptWinRate: kept.length ? round(keptWinners / kept.length) : null,
    keptOneMesPl,
    rejectedOneMesPl,
    avgKeptRiskPoints: avg(kept.map((row) => row.riskPoints)),
    falseRejectWinnerRows,
    score,
    decision,
  };
}

function buildFeatureBuckets(rows: RawOhlcScannerArtifactSameBarSeparatorRow[], minRows: number): FeatureBucket[] {
  const seen = new Set<string>();
  const buckets: FeatureBucket[] = [];
  for (const row of rows) {
    for (const feature of noLookaheadFeatures(row)) {
      const key = `${feature.set}|${feature.value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const bucket = buildFeatureBucket(feature.set, feature.value, rows, minRows);
      if (bucket) buckets.push(bucket);
    }
  }
  return buckets.sort((a, b) => {
    if (a.decision !== b.decision) return a.decision === 'candidate_for_more_research' ? -1 : 1;
    return b.score - a.score || b.keptRows - a.keptRows || a.falseRejectWinnerRows - b.falseRejectWinnerRows;
  });
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildRecommendations(blockers: string[], accepted: FeatureBucket[], topBucket: FeatureBucket | null): string[] {
  if (blockers.length) return ['Do not use OpeningDrive no-lookahead separator output until the source same-bar report loads cleanly.'];
  if (accepted.length) {
    return [
      `Research lead found: ${topBucket?.featureSet}=${topBucket?.featureValue} kept ${topBucket?.keptRows} rows with ${topBucket?.keptWinners}/${topBucket?.keptLosses} winners/losses and ${topBucket?.keptOneMesPl ?? 'n/a'} one-MES P/L.`,
      'Do not install this as a live filter yet; validate it on a fresh out-of-sample replay package with proof-time structured fields.',
      'No scanner-visible rank change, Discord posting change, Supabase write, canExecute change, or entry/stop/target/risk change is approved by this report.',
    ];
  }
  return [
    'No clean no-lookahead OpeningDrive separator met the conservative minimum-row and zero-loss gate.',
    'Keep OpeningDrive same-bar evidence research-only and mine richer proof-time geometry/session fields before any live-facing change.',
    'Do not use first-replay-bar T1/stop, MFE, MAE, or separator tags as live filters because they are outcome/path evidence.',
  ];
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDriveNoLookaheadSeparatorReport, 'markdown'>): string {
  return [
    '# Raw OHLC OpeningDrive No-Lookahead Separator',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only OpeningDrive no-lookahead separator. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Feature Policy',
    `- Allowed proof-time features: ${report.featurePolicy.allowedFeatureFields.join(', ')}.`,
    `- Rejected lookahead fields: ${report.featurePolicy.rejectedLookaheadFields.join(', ')}.`,
    '',
    '## Summary',
    `- Setup: ${report.summary.setupType}.`,
    `- Source rows: ${report.summary.sourceRows}.`,
    `- Winners/losses/unresolved: ${report.summary.winners}/${report.summary.losses}/${report.summary.unresolved}.`,
    `- Gross one-MES P/L: ${report.summary.grossOneMesPl ?? 'not available'}.`,
    `- Buckets evaluated/accepted: ${report.summary.bucketsEvaluated}/${report.summary.acceptedBuckets}.`,
    `- Top bucket: ${report.summary.topBucketId ?? '-'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Top Buckets',
    '| Decision | Feature | Kept W/L/U | Rejected W/L/U | Kept P/L | Rejected P/L | Avg Risk | False-Reject Winners | Score |',
    '|---|---|---|---|---:|---:|---:|---:|---:|',
    ...report.buckets.slice(0, 40).map((row) => `| ${row.decision} | ${escapeTable(`${row.featureSet}=${row.featureValue}`)} | ${row.keptWinners}/${row.keptLosses}/${row.keptUnresolved} | ${row.rejectedWinners}/${row.rejectedLosses}/${row.rejectedUnresolved} | ${row.keptOneMesPl ?? '-'} | ${row.rejectedOneMesPl ?? '-'} | ${row.avgKeptRiskPoints ?? '-'} | ${row.falseRejectWinnerRows} | ${row.score} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDriveNoLookaheadSeparatorReport(args: {
  reportDir: string;
  samebarSeparatorReportPath: string | null;
  samebarSeparatorReport: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport | null;
  setupType: string;
  minRows?: number;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDriveNoLookaheadSeparatorReport {
  const minRows = args.minRows ?? DEFAULT_MIN_ROWS;
  const rows = (args.samebarSeparatorReport?.rows || []).filter((row) => row.setupType === args.setupType);
  const buckets = buildFeatureBuckets(rows, minRows);
  const accepted = buckets.filter((bucket) => bucket.decision === 'candidate_for_more_research');
  const blockers = [
    !args.samebarSeparatorReportPath ? 'missing same-bar separator report path' : null,
    !args.samebarSeparatorReport ? 'missing same-bar separator report' : null,
    args.samebarSeparatorReport && args.samebarSeparatorReport.status !== 'pass' ? `same-bar separator status ${args.samebarSeparatorReport.status}` : null,
    rows.length === 0 ? `no same-bar rows found for ${args.setupType}` : null,
  ].filter((item): item is string => Boolean(item));
  const topBucket = accepted[0] || null;
  const base: Omit<RawOhlcScannerArtifactOpeningDriveNoLookaheadSeparatorReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_no_lookahead_separator',
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
      usesNoLookaheadFeatureFieldsOnly: true,
      outcomeFieldsAreEvaluationOnly: true,
      candidatesAreNotLiveFilters: true,
      livePromotionAllowed: false,
    },
    featurePolicy: {
      allowedFeatureFields: ALLOWED_FEATURE_FIELDS,
      rejectedLookaheadFields: REJECTED_LOOKAHEAD_FIELDS,
    },
    summary: {
      setupType: args.setupType,
      sourceRows: rows.length,
      winners: rows.filter(isWinner).length,
      losses: rows.filter(isLoss).length,
      unresolved: rows.filter((row) => row.outcomeStatus !== 'resolved').length,
      grossOneMesPl: sum(rows.map((row) => row.resolvedOneMesPl)),
      bucketsEvaluated: buckets.length,
      acceptedBuckets: accepted.length,
      topBucketId: topBucket ? `${topBucket.featureSet}=${topBucket.featureValue}` : null,
      livePromotionAllowedRows: 0,
    },
    buckets,
    blockers,
    recommendations: buildRecommendations(blockers, accepted, topBucket),
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDriveNoLookaheadSeparatorReport(
  report: RawOhlcScannerArtifactOpeningDriveNoLookaheadSeparatorReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-no-lookahead-separator-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDriveNoLookaheadSeparatorCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactOpeningDriveNoLookaheadSeparatorArgs(args);
  const samebarSeparatorReport = fs.existsSync(options.samebarSeparatorReport)
    ? readJson<RawOhlcScannerArtifactSameBarSeparatorDrilldownReport>(options.samebarSeparatorReport)
    : null;
  const report = buildRawOhlcScannerArtifactOpeningDriveNoLookaheadSeparatorReport({
    reportDir: options.outDir,
    samebarSeparatorReportPath: options.samebarSeparatorReport,
    samebarSeparatorReport,
    setupType: options.setupType,
    minRows: options.minRows,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDriveNoLookaheadSeparatorReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactOpeningDriveNoLookaheadSeparatorCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
