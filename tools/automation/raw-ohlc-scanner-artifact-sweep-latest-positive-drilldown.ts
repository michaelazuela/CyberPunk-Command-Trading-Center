import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactSameBarSeparatorDrilldownReport,
  RawOhlcScannerArtifactSameBarSeparatorRow,
} from './raw-ohlc-scanner-artifact-samebar-separator-drilldown';

type DrilldownKind =
  | 'session'
  | 'direction'
  | 'time'
  | 'risk'
  | 'session_direction'
  | 'session_time'
  | 'session_risk'
  | 'direction_time'
  | 'direction_risk'
  | 'time_risk'
  | 'session_direction_time'
  | 'session_direction_risk'
  | 'session_time_risk'
  | 'direction_time_risk'
  | 'session_direction_time_risk';

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

interface SegmentSummary {
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

interface SegmentDrilldown {
  kind: DrilldownKind;
  key: string;
  train: SegmentSummary;
  test: SegmentSummary;
  verdict:
    | 'research_candidate_zero_loss_transfer'
    | 'latest_positive_train_loss_bearing'
    | 'latest_positive_train_weak'
    | 'train_positive_latest_weak'
    | 'caution_or_insufficient';
  reason: string;
  score: number;
}

export interface RawOhlcScannerArtifactSweepLatestPositiveDrilldownReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_latest_positive_drilldown';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    reportDir: string;
    trainSamebarReports: string[];
    testSamebarReports: string[];
    minRowsPerPeriod: number;
    setupType: 'NoInstalledSetup';
  };
  assumptions: {
    consumesExistingSameBarReportsOnly: true;
    comparesPreEntryOrModelMetadataBucketsOnly: true;
    outcomeFieldsAreEvaluationOnly: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
    htfMssExcluded: true;
  };
  summary: {
    trainRows: number;
    testRows: number;
    latestPositiveSegments: number;
    zeroLossTransferSegments: number;
    latestPositiveTrainLossBearingSegments: number;
    livePromotionAllowedRows: 0;
    recommendation: 'fresh_replay_validate_zero_loss_segments' | 'mine_richer_sweep_fields' | 'fix_inputs';
  };
  zeroLossTransferSegments: SegmentDrilldown[];
  latestPositiveTrainLossBearingSegments: SegmentDrilldown[];
  latestPositiveTrainWeakSegments: SegmentDrilldown[];
  cautionSegments: SegmentDrilldown[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const SETUP_TYPE = 'NoInstalledSetup';

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

export function parseRawOhlcScannerArtifactSweepLatestPositiveDrilldownArgs(args = process.argv.slice(2)): CliOptions {
  const minRows = Number(readFlag(args, '--min-rows-per-period') || 5);
  return {
    trainSamebarReports: splitPaths(readFlag(args, '--train-samebar-reports')),
    testSamebarReports: splitPaths(readFlag(args, '--test-samebar-reports')),
    minRowsPerPeriod: Number.isFinite(minRows) && minRows > 0 ? minRows : 5,
    outDir: readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR,
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

function segmentKey(row: RawOhlcScannerArtifactSameBarSeparatorRow, kind: DrilldownKind): string {
  if (kind === 'session') return row.session;
  if (kind === 'direction') return row.direction;
  if (kind === 'time') return row.timeBucket;
  if (kind === 'risk') return riskBucket(row);
  if (kind === 'session_direction') return `${row.session}|${row.direction}`;
  if (kind === 'session_time') return `${row.session}|${row.timeBucket}`;
  if (kind === 'session_risk') return `${row.session}|${riskBucket(row)}`;
  if (kind === 'direction_time') return `${row.direction}|${row.timeBucket}`;
  if (kind === 'direction_risk') return `${row.direction}|${riskBucket(row)}`;
  if (kind === 'time_risk') return `${row.timeBucket}|${riskBucket(row)}`;
  if (kind === 'session_direction_time') return `${row.session}|${row.direction}|${row.timeBucket}`;
  if (kind === 'session_direction_risk') return `${row.session}|${row.direction}|${riskBucket(row)}`;
  if (kind === 'session_time_risk') return `${row.session}|${row.timeBucket}|${riskBucket(row)}`;
  if (kind === 'direction_time_risk') return `${row.direction}|${row.timeBucket}|${riskBucket(row)}`;
  return `${row.session}|${row.direction}|${row.timeBucket}|${riskBucket(row)}`;
}

function isWinner(row: RawOhlcScannerArtifactSameBarSeparatorRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 't1_and_t2_hit';
}

function isLoss(row: RawOhlcScannerArtifactSameBarSeparatorRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 'stopped_before_t1';
}

function summarize(rows: RawOhlcScannerArtifactSameBarSeparatorRow[]): SegmentSummary {
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

function isPositive(summary: SegmentSummary, minRows: number): boolean {
  return summary.rows >= minRows && (summary.oneMesPl ?? 0) > 0 && summary.winners > summary.losses && (summary.winRateResolved ?? 0) >= 0.6;
}

function segmentMap(rows: RawOhlcScannerArtifactSameBarSeparatorRow[]): Map<string, { kind: DrilldownKind; key: string; rows: RawOhlcScannerArtifactSameBarSeparatorRow[] }> {
  const kinds: DrilldownKind[] = [
    'session',
    'direction',
    'time',
    'risk',
    'session_direction',
    'session_time',
    'session_risk',
    'direction_time',
    'direction_risk',
    'time_risk',
    'session_direction_time',
    'session_direction_risk',
    'session_time_risk',
    'direction_time_risk',
    'session_direction_time_risk',
  ];
  const map = new Map<string, { kind: DrilldownKind; key: string; rows: RawOhlcScannerArtifactSameBarSeparatorRow[] }>();
  for (const row of rows.filter((item) => item.setupType === SETUP_TYPE)) {
    for (const kind of kinds) {
      const key = segmentKey(row, kind);
      const id = `${kind}:${key}`;
      const existing = map.get(id);
      if (existing) existing.rows.push(row);
      else map.set(id, { kind, key, rows: [row] });
    }
  }
  return map;
}

function classify(train: SegmentSummary, test: SegmentSummary, minRows: number): Pick<SegmentDrilldown, 'verdict' | 'reason' | 'score'> {
  const trainPositive = isPositive(train, minRows);
  const testPositive = isPositive(test, minRows);
  const score = round((test.oneMesPl ?? 0) * 2 + (train.oneMesPl ?? 0) + (test.winners - test.losses) * 25 + (train.winners - train.losses) * 10 - (test.unresolved + train.unresolved) * 5);
  if (trainPositive && testPositive && train.losses === 0 && test.losses === 0) {
    return {
      verdict: 'research_candidate_zero_loss_transfer',
      reason: 'Sweep segment is positive and zero-loss in both train and latest test using saved same-bar metadata only',
      score,
    };
  }
  if (testPositive && trainPositive && train.losses > 0) {
    return {
      verdict: 'latest_positive_train_loss_bearing',
      reason: 'latest Sweep segment is positive, but train period still contains stopped-before-T1 losses',
      score,
    };
  }
  if (testPositive && !trainPositive) {
    return {
      verdict: 'latest_positive_train_weak',
      reason: 'latest Sweep segment is positive, but train period is weak, absent, or below minimum sample',
      score,
    };
  }
  if (trainPositive && !testPositive) {
    return {
      verdict: 'train_positive_latest_weak',
      reason: 'train Sweep segment was positive but did not hold up in latest test',
      score,
    };
  }
  return {
    verdict: 'caution_or_insufficient',
    reason: 'segment is mixed, loss-bearing, unresolved, or below minimum sample',
    score,
  };
}

function buildSegments(
  trainRows: RawOhlcScannerArtifactSameBarSeparatorRow[],
  testRows: RawOhlcScannerArtifactSameBarSeparatorRow[],
  minRows: number,
): SegmentDrilldown[] {
  const train = segmentMap(trainRows);
  const test = segmentMap(testRows);
  const ids = [...new Set([...train.keys(), ...test.keys()])].sort();
  return ids.map((id) => {
    const trainSegment = train.get(id);
    const testSegment = test.get(id);
    const kind = (trainSegment?.kind || testSegment?.kind) as DrilldownKind;
    const key = trainSegment?.key || testSegment?.key || id.split(':').slice(1).join(':');
    const trainSummary = summarize(trainSegment?.rows || []);
    const testSummary = summarize(testSegment?.rows || []);
    return {
      kind,
      key,
      train: trainSummary,
      test: testSummary,
      ...classify(trainSummary, testSummary, minRows),
    };
  }).sort((a, b) => b.score - a.score || b.test.rows - a.test.rows || b.train.rows - a.train.rows || a.kind.localeCompare(b.kind) || a.key.localeCompare(b.key));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function segmentRow(row: SegmentDrilldown): string {
  return `| ${row.kind} | ${escapeTable(row.key)} | ${row.train.rows} | ${row.train.winners}/${row.train.losses}/${row.train.otherResolved}/${row.train.unresolved} | ${row.train.oneMesPl ?? '-'} | ${row.test.rows} | ${row.test.winners}/${row.test.losses}/${row.test.otherResolved}/${row.test.unresolved} | ${row.test.oneMesPl ?? '-'} | ${row.score} | ${row.verdict} | ${escapeTable(row.reason)} |`;
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepLatestPositiveDrilldownReport, 'markdown'>): string {
  return [
    '# Raw-OHLC Sweep Latest-Positive Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only NoInstalledSetup research. It consumes saved same-bar reports only; it does not run setupScanner, post Discord, write Supabase, read live bridge data, install rank behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Sweep train/test rows: ${report.summary.trainRows}/${report.summary.testRows}.`,
    `- Latest-positive segments: ${report.summary.latestPositiveSegments}.`,
    `- Zero-loss transfer segments: ${report.summary.zeroLossTransferSegments}.`,
    `- Latest-positive train-loss-bearing segments: ${report.summary.latestPositiveTrainLossBearingSegments}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Zero-Loss Transfer Segments',
    '| Kind | Key | Train Rows | Train W/L/O/U | Train P/L | Test Rows | Test W/L/O/U | Test P/L | Score | Verdict | Reason |',
    '|---|---|---:|---|---:|---:|---|---:|---:|---|---|',
    ...report.zeroLossTransferSegments.map(segmentRow),
    '',
    '## Latest Positive / Train Loss-Bearing Segments',
    '| Kind | Key | Train Rows | Train W/L/O/U | Train P/L | Test Rows | Test W/L/O/U | Test P/L | Score | Verdict | Reason |',
    '|---|---|---:|---|---:|---:|---|---:|---:|---|---|',
    ...report.latestPositiveTrainLossBearingSegments.map(segmentRow),
    '',
    '## Latest Positive / Train Weak Segments',
    '| Kind | Key | Train Rows | Train W/L/O/U | Train P/L | Test Rows | Test W/L/O/U | Test P/L | Score | Verdict | Reason |',
    '|---|---|---:|---|---:|---:|---|---:|---:|---|---|',
    ...report.latestPositiveTrainWeakSegments.map(segmentRow),
    '',
    '## Caution Segments',
    '| Kind | Key | Train Rows | Train W/L/O/U | Train P/L | Test Rows | Test W/L/O/U | Test P/L | Score | Verdict | Reason |',
    '|---|---|---:|---|---:|---:|---|---:|---:|---|---|',
    ...report.cautionSegments.slice(0, 30).map(segmentRow),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepLatestPositiveDrilldownReport(args: {
  reportDir: string;
  trainSamebarReportPaths: string[];
  trainSamebarReports: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport[];
  testSamebarReportPaths: string[];
  testSamebarReports: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport[];
  minRowsPerPeriod?: number;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepLatestPositiveDrilldownReport {
  const minRowsPerPeriod = args.minRowsPerPeriod ?? 5;
  const trainRows = args.trainSamebarReports.flatMap((report) => report.rows || []).filter((row) => row.setupType === SETUP_TYPE);
  const testRows = args.testSamebarReports.flatMap((report) => report.rows || []).filter((row) => row.setupType === SETUP_TYPE);
  const segments = buildSegments(trainRows, testRows, minRowsPerPeriod);
  const zeroLossTransferSegments = segments.filter((segment) => segment.verdict === 'research_candidate_zero_loss_transfer');
  const latestPositiveTrainLossBearingSegments = segments.filter((segment) => segment.verdict === 'latest_positive_train_loss_bearing');
  const latestPositiveTrainWeakSegments = segments.filter((segment) => segment.verdict === 'latest_positive_train_weak');
  const cautionSegments = segments.filter((segment) => segment.verdict === 'train_positive_latest_weak' || segment.verdict === 'caution_or_insufficient');
  const blockers = [
    args.trainSamebarReports.length === 0 ? 'missing train same-bar reports' : null,
    args.testSamebarReports.length === 0 ? 'missing test same-bar reports' : null,
    trainRows.length === 0 ? 'no train NoInstalledSetup same-bar rows found' : null,
    testRows.length === 0 ? 'no latest/test NoInstalledSetup same-bar rows found' : null,
    ...args.trainSamebarReports.map((report, index) => report.status !== 'pass' ? `train same-bar report ${args.trainSamebarReportPaths[index]} status ${report.status}` : null),
    ...args.testSamebarReports.map((report, index) => report.status !== 'pass' ? `test same-bar report ${args.testSamebarReportPaths[index]} status ${report.status}` : null),
  ].filter((item): item is string => Boolean(item));
  const latestPositiveSegments = segments.filter((segment) => isPositive(segment.test, minRowsPerPeriod)).length;
  const base: Omit<RawOhlcScannerArtifactSweepLatestPositiveDrilldownReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_latest_positive_drilldown',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      trainSamebarReports: args.trainSamebarReportPaths,
      testSamebarReports: args.testSamebarReportPaths,
      minRowsPerPeriod,
      setupType: SETUP_TYPE,
    },
    assumptions: {
      consumesExistingSameBarReportsOnly: true,
      comparesPreEntryOrModelMetadataBucketsOnly: true,
      outcomeFieldsAreEvaluationOnly: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
      htfMssExcluded: true,
    },
    summary: {
      trainRows: trainRows.length,
      testRows: testRows.length,
      latestPositiveSegments,
      zeroLossTransferSegments: zeroLossTransferSegments.length,
      latestPositiveTrainLossBearingSegments: latestPositiveTrainLossBearingSegments.length,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length
        ? 'fix_inputs'
        : zeroLossTransferSegments.length
          ? 'fresh_replay_validate_zero_loss_segments'
          : 'mine_richer_sweep_fields',
    },
    zeroLossTransferSegments,
    latestPositiveTrainLossBearingSegments,
    latestPositiveTrainWeakSegments,
    cautionSegments,
    blockers,
    recommendations: blockers.length
      ? ['Fix the saved same-bar report inputs before using Sweep drilldown findings.']
      : [
        zeroLossTransferSegments.length
          ? 'Treat zero-loss transfer segments as research candidates only; build a fresh replay package before any scanner-visible proposal.'
          : 'Do not install a Sweep selector from these metadata buckets; latest positives remain train-loss-bearing or train-weak.',
        'Keep HTF displacement MSS separate from this Sweep pass.',
        'Preserve canExecute, 5M execution authority, protected stops, target/risk math, Discord posting, Supabase persistence, and bridge behavior.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSweepLatestPositiveDrilldownReport(
  report: RawOhlcScannerArtifactSweepLatestPositiveDrilldownReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-sweep-latest-positive-drilldown-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSweepLatestPositiveDrilldownCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSweepLatestPositiveDrilldownArgs(args);
  const report = buildRawOhlcScannerArtifactSweepLatestPositiveDrilldownReport({
    reportDir: options.outDir,
    trainSamebarReportPaths: options.trainSamebarReports,
    trainSamebarReports: options.trainSamebarReports.map((filePath) => readJson<RawOhlcScannerArtifactSameBarSeparatorDrilldownReport>(filePath)),
    testSamebarReportPaths: options.testSamebarReports,
    testSamebarReports: options.testSamebarReports.map((filePath) => readJson<RawOhlcScannerArtifactSameBarSeparatorDrilldownReport>(filePath)),
    minRowsPerPeriod: options.minRowsPerPeriod,
  });
  const paths = writeRawOhlcScannerArtifactSweepLatestPositiveDrilldownReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({
      ...paths,
      status: report.status,
      summary: report.summary,
      zeroLossTransferSegments: report.zeroLossTransferSegments.slice(0, 10),
      latestPositiveTrainLossBearingSegments: report.latestPositiveTrainLossBearingSegments.slice(0, 10),
      latestPositiveTrainWeakSegments: report.latestPositiveTrainWeakSegments.slice(0, 10),
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
    runRawOhlcScannerArtifactSweepLatestPositiveDrilldownCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
