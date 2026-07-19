import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageReport } from './unified-positive-held-local-preview-replay-package';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport } from './unified-positive-held-local-preview-replay-package-outcome';

type DrilldownKind =
  | 'proof_state'
  | 'execution_block'
  | 'detected_execution'
  | 'session_proof'
  | 'direction_proof'
  | 'time_proof'
  | 'risk_proof'
  | 'session_direction_proof'
  | 'session_direction_time_proof'
  | 'session_direction_risk_proof'
  | 'session_direction_time_risk_proof'
  | 'bars_after_proof'
  | 'occurrences'
  | 't1r'
  | 't2r';

interface CliOptions {
  trainReplayPackages: string[];
  trainOutcomeReports: string[];
  testReplayPackages: string[];
  testOutcomeReports: string[];
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

interface JoinedRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  proofTime: string;
  proofState: string;
  detectedStatus: string;
  executionStatus: string;
  blockReason: string;
  occurrences: number;
  riskPoints: number;
  t1R: number | null;
  t2R: number | null;
  barsAfterProof: number;
  proofToEntryMinutes: number | null;
  timeBucket: string;
  outcomeStatus: string;
  outcomeLabel: string;
  resolvedOneMesPl: number | null;
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

export interface RawOhlcScannerArtifactSweepSourceFieldDrilldownReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_source_field_drilldown';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    reportDir: string;
    trainReplayPackages: string[];
    trainOutcomeReports: string[];
    testReplayPackages: string[];
    testOutcomeReports: string[];
    minRowsPerPeriod: number;
    setupType: 'SweepMssFvgRetrace';
  };
  assumptions: {
    consumesExistingRawReplayPackagesAndOutcomeReportsOnly: true;
    analyzesSameBarSweepRowsOnly: true;
    comparesSourceFieldsAvailableBeforeOutcomeOnly: true;
    outcomeFieldsAreEvaluationOnly: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    trainJoinedRows: number;
    testJoinedRows: number;
    trainSameBarSweepRows: number;
    testSameBarSweepRows: number;
    zeroLossTransferSegments: number;
    latestPositiveTrainLossBearingSegments: number;
    latestPositiveTrainWeakSegments: number;
    livePromotionAllowedRows: 0;
    recommendation: 'fresh_replay_validate_zero_loss_source_segments' | 'mine_scanner_snapshot_fields' | 'fix_inputs';
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
const SETUP_TYPE = 'SweepMssFvgRetrace';

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

function timeMs(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

export function parseRawOhlcScannerArtifactSweepSourceFieldDrilldownArgs(args = process.argv.slice(2)): CliOptions {
  const minRows = Number(readFlag(args, '--min-rows-per-period') || 5);
  return {
    trainReplayPackages: splitPaths(readFlag(args, '--train-replay-packages')),
    trainOutcomeReports: splitPaths(readFlag(args, '--train-outcome-reports')),
    testReplayPackages: splitPaths(readFlag(args, '--test-replay-packages')),
    testOutcomeReports: splitPaths(readFlag(args, '--test-outcome-reports')),
    minRowsPerPeriod: Number.isFinite(minRows) && minRows > 0 ? minRows : 5,
    outDir: readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR,
    json: args.includes('--json'),
  };
}

function parseProofState(value: string): { detectedStatus: string; executionStatus: string; blockReason: string } {
  const [detectedStatus = 'unknown', executionStatus = 'unknown', blockReason = 'none'] = value.split(':');
  return { detectedStatus, executionStatus, blockReason: blockReason || 'none' };
}

function proofToEntryMinutes(proofTime: string, entryHitTime: string | null): number | null {
  if (!entryHitTime) return null;
  const minutes = (timeMs(entryHitTime) - timeMs(proofTime)) / 60000;
  return Number.isFinite(minutes) ? round(minutes) : null;
}

function timeBucket(proofTime: string): string {
  const hour = Number(proofTime.slice(11, 13));
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return 'unknown';
  return `${String(hour).padStart(2, '0')}:00-${String(hour).padStart(2, '0')}:59`;
}

function joinRows(
  packages: UnifiedPositiveHeldLocalPreviewReplayPackageReport[],
  outcomes: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport[],
): JoinedRow[] {
  const packageRows = packages.flatMap((report) => report.rows || []);
  const outcomeById = new Map(outcomes.flatMap((report) => report.rows || []).map((row) => [row.ticketId, row]));
  return packageRows.map((row) => {
    const outcome = outcomeById.get(row.ticketId);
    const parsed = parseProofState(row.proofState);
    return {
      ticketId: row.ticketId,
      tradeDate: row.tradeDate,
      session: row.session,
      setupType: row.setupType,
      direction: row.direction,
      proofTime: row.proofTime,
      proofState: row.proofState,
      detectedStatus: parsed.detectedStatus,
      executionStatus: parsed.executionStatus,
      blockReason: parsed.blockReason,
      occurrences: row.occurrences,
      riskPoints: row.riskPoints,
      t1R: row.t1R,
      t2R: row.t2R,
      barsAfterProof: row.barsAfterProof,
      proofToEntryMinutes: proofToEntryMinutes(row.proofTime, outcome?.entryHitTime || null),
      timeBucket: timeBucket(row.proofTime),
      outcomeStatus: outcome?.outcomeStatus || 'missing',
      outcomeLabel: outcome?.outcomeLabel || 'missing',
      resolvedOneMesPl: outcome?.resolvedOneMesPl ?? null,
    };
  });
}

function riskBucket(row: JoinedRow): string {
  if (row.riskPoints < 4) return 'risk_lt_4';
  if (row.riskPoints < 8) return 'risk_4_to_8';
  if (row.riskPoints < 16) return 'risk_8_to_16';
  if (row.riskPoints < 24) return 'risk_16_to_24';
  if (row.riskPoints < 32) return 'risk_24_to_32';
  return 'risk_gte_32';
}

function barsAfterProofBucket(row: JoinedRow): string {
  if (row.barsAfterProof <= 3) return 'bars_after_proof_lte_3';
  if (row.barsAfterProof <= 12) return 'bars_after_proof_4_to_12';
  return 'bars_after_proof_gt_12';
}

function occurrenceBucket(row: JoinedRow): string {
  if (row.occurrences <= 1) return 'occurrences_1';
  if (row.occurrences <= 3) return 'occurrences_2_to_3';
  return 'occurrences_gt_3';
}

function rBucket(value: number | null, label: string): string {
  if (value === null) return `${label}_unknown`;
  if (value < 1.5) return `${label}_lt_1_5`;
  if (value < 2) return `${label}_1_5_to_2`;
  return `${label}_gte_2`;
}

function segmentKey(row: JoinedRow, kind: DrilldownKind): string {
  if (kind === 'proof_state') return row.proofState;
  if (kind === 'execution_block') return `${row.executionStatus}|${row.blockReason}`;
  if (kind === 'detected_execution') return `${row.detectedStatus}|${row.executionStatus}`;
  if (kind === 'session_proof') return `${row.session}|${row.proofState}`;
  if (kind === 'direction_proof') return `${row.direction}|${row.proofState}`;
  if (kind === 'time_proof') return `${row.timeBucket}|${row.proofState}`;
  if (kind === 'risk_proof') return `${riskBucket(row)}|${row.proofState}`;
  if (kind === 'session_direction_proof') return `${row.session}|${row.direction}|${row.proofState}`;
  if (kind === 'session_direction_time_proof') return `${row.session}|${row.direction}|${row.timeBucket}|${row.proofState}`;
  if (kind === 'session_direction_risk_proof') return `${row.session}|${row.direction}|${riskBucket(row)}|${row.proofState}`;
  if (kind === 'session_direction_time_risk_proof') return `${row.session}|${row.direction}|${row.timeBucket}|${riskBucket(row)}|${row.proofState}`;
  if (kind === 'bars_after_proof') return barsAfterProofBucket(row);
  if (kind === 'occurrences') return occurrenceBucket(row);
  if (kind === 't1r') return rBucket(row.t1R, 't1r');
  return rBucket(row.t2R, 't2r');
}

function isWinner(row: JoinedRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 't1_and_t2_hit';
}

function isLoss(row: JoinedRow): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 'stopped_before_t1';
}

function summarize(rows: JoinedRow[]): SegmentSummary {
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
  };
}

function isPositive(summary: SegmentSummary, minRows: number): boolean {
  return summary.rows >= minRows && (summary.oneMesPl ?? 0) > 0 && summary.winners > summary.losses && (summary.winRateResolved ?? 0) >= 0.6;
}

function segmentMap(rows: JoinedRow[]): Map<string, { kind: DrilldownKind; key: string; rows: JoinedRow[] }> {
  const kinds: DrilldownKind[] = [
    'proof_state',
    'execution_block',
    'detected_execution',
    'session_proof',
    'direction_proof',
    'time_proof',
    'risk_proof',
    'session_direction_proof',
    'session_direction_time_proof',
    'session_direction_risk_proof',
    'session_direction_time_risk_proof',
    'bars_after_proof',
    'occurrences',
    't1r',
    't2r',
  ];
  const map = new Map<string, { kind: DrilldownKind; key: string; rows: JoinedRow[] }>();
  for (const row of rows.filter((item) => item.setupType === SETUP_TYPE && item.proofToEntryMinutes === 0)) {
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
  const score = round((test.oneMesPl ?? 0) * 2 + (train.oneMesPl ?? 0) + (test.winners - test.losses) * 20 + (train.winners - train.losses) * 8 - (train.unresolved + test.unresolved) * 5);
  if (trainPositive && testPositive && train.losses === 0 && test.losses === 0) {
    return { verdict: 'research_candidate_zero_loss_transfer', reason: 'source-field Sweep same-bar segment is positive and zero-loss in both train and latest test', score };
  }
  if (testPositive && trainPositive && train.losses > 0) {
    return { verdict: 'latest_positive_train_loss_bearing', reason: 'latest source-field segment is positive, but train period still has stopped-before-T1 losses', score };
  }
  if (testPositive && !trainPositive) {
    return { verdict: 'latest_positive_train_weak', reason: 'latest source-field segment is positive, but train is weak, absent, or below minimum sample', score };
  }
  if (trainPositive && !testPositive) {
    return { verdict: 'train_positive_latest_weak', reason: 'train source-field segment was positive but did not hold up in latest test', score };
  }
  return { verdict: 'caution_or_insufficient', reason: 'segment is mixed, loss-bearing, unresolved, or below minimum sample', score };
}

function buildSegments(trainRows: JoinedRow[], testRows: JoinedRow[], minRows: number): SegmentDrilldown[] {
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
    return { kind, key, train: trainSummary, test: testSummary, ...classify(trainSummary, testSummary, minRows) };
  }).sort((a, b) => b.score - a.score || b.test.rows - a.test.rows || b.train.rows - a.train.rows || a.kind.localeCompare(b.kind) || a.key.localeCompare(b.key));
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function segmentRow(row: SegmentDrilldown): string {
  return `| ${row.kind} | ${escapeTable(row.key)} | ${row.train.rows} | ${row.train.winners}/${row.train.losses}/${row.train.otherResolved}/${row.train.unresolved} | ${row.train.oneMesPl ?? '-'} | ${row.test.rows} | ${row.test.winners}/${row.test.losses}/${row.test.otherResolved}/${row.test.unresolved} | ${row.test.oneMesPl ?? '-'} | ${row.score} | ${row.verdict} | ${escapeTable(row.reason)} |`;
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepSourceFieldDrilldownReport, 'markdown'>): string {
  return [
    '# Raw-OHLC Sweep Source-Field Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only raw replay-package/source-field research. It consumes saved reports only and does not run setupScanner, post Discord, write Supabase, read live bridge data, install rank behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Joined train/test rows: ${report.summary.trainJoinedRows}/${report.summary.testJoinedRows}.`,
    `- Same-bar Sweep train/test rows: ${report.summary.trainSameBarSweepRows}/${report.summary.testSameBarSweepRows}.`,
    `- Zero-loss transfer segments: ${report.summary.zeroLossTransferSegments}.`,
    `- Latest-positive train-loss-bearing segments: ${report.summary.latestPositiveTrainLossBearingSegments}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
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

export function buildRawOhlcScannerArtifactSweepSourceFieldDrilldownReport(args: {
  reportDir: string;
  trainReplayPackagePaths: string[];
  trainReplayPackages: UnifiedPositiveHeldLocalPreviewReplayPackageReport[];
  trainOutcomeReportPaths: string[];
  trainOutcomeReports: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport[];
  testReplayPackagePaths: string[];
  testReplayPackages: UnifiedPositiveHeldLocalPreviewReplayPackageReport[];
  testOutcomeReportPaths: string[];
  testOutcomeReports: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport[];
  minRowsPerPeriod?: number;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepSourceFieldDrilldownReport {
  const minRowsPerPeriod = args.minRowsPerPeriod ?? 5;
  const trainRows = joinRows(args.trainReplayPackages, args.trainOutcomeReports);
  const testRows = joinRows(args.testReplayPackages, args.testOutcomeReports);
  const trainSameBarSweepRows = trainRows.filter((row) => row.setupType === SETUP_TYPE && row.proofToEntryMinutes === 0);
  const testSameBarSweepRows = testRows.filter((row) => row.setupType === SETUP_TYPE && row.proofToEntryMinutes === 0);
  const segments = buildSegments(trainRows, testRows, minRowsPerPeriod);
  const zeroLossTransferSegments = segments.filter((segment) => segment.verdict === 'research_candidate_zero_loss_transfer');
  const latestPositiveTrainLossBearingSegments = segments.filter((segment) => segment.verdict === 'latest_positive_train_loss_bearing');
  const latestPositiveTrainWeakSegments = segments.filter((segment) => segment.verdict === 'latest_positive_train_weak');
  const cautionSegments = segments.filter((segment) => segment.verdict === 'train_positive_latest_weak' || segment.verdict === 'caution_or_insufficient');
  const blockers = [
    args.trainReplayPackages.length !== args.trainOutcomeReports.length ? 'train replay package and outcome report counts differ' : null,
    args.testReplayPackages.length !== args.testOutcomeReports.length ? 'test replay package and outcome report counts differ' : null,
    args.trainReplayPackages.length === 0 ? 'missing train replay packages' : null,
    args.testReplayPackages.length === 0 ? 'missing test replay packages' : null,
    trainSameBarSweepRows.length === 0 ? 'no train same-bar Sweep source rows found' : null,
    testSameBarSweepRows.length === 0 ? 'no latest/test same-bar Sweep source rows found' : null,
    ...args.trainReplayPackages.map((report, index) => report.status !== 'pass' ? `train replay package ${args.trainReplayPackagePaths[index]} status ${report.status}` : null),
    ...args.testReplayPackages.map((report, index) => report.status !== 'pass' ? `test replay package ${args.testReplayPackagePaths[index]} status ${report.status}` : null),
    ...args.trainOutcomeReports.map((report, index) => report.status !== 'pass' ? `train outcome report ${args.trainOutcomeReportPaths[index]} status ${report.status}` : null),
    ...args.testOutcomeReports.map((report, index) => report.status !== 'pass' ? `test outcome report ${args.testOutcomeReportPaths[index]} status ${report.status}` : null),
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactSweepSourceFieldDrilldownReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_source_field_drilldown',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      trainReplayPackages: args.trainReplayPackagePaths,
      trainOutcomeReports: args.trainOutcomeReportPaths,
      testReplayPackages: args.testReplayPackagePaths,
      testOutcomeReports: args.testOutcomeReportPaths,
      minRowsPerPeriod,
      setupType: SETUP_TYPE,
    },
    assumptions: {
      consumesExistingRawReplayPackagesAndOutcomeReportsOnly: true,
      analyzesSameBarSweepRowsOnly: true,
      comparesSourceFieldsAvailableBeforeOutcomeOnly: true,
      outcomeFieldsAreEvaluationOnly: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      trainJoinedRows: trainRows.length,
      testJoinedRows: testRows.length,
      trainSameBarSweepRows: trainSameBarSweepRows.length,
      testSameBarSweepRows: testSameBarSweepRows.length,
      zeroLossTransferSegments: zeroLossTransferSegments.length,
      latestPositiveTrainLossBearingSegments: latestPositiveTrainLossBearingSegments.length,
      latestPositiveTrainWeakSegments: latestPositiveTrainWeakSegments.length,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length
        ? 'fix_inputs'
        : zeroLossTransferSegments.length
          ? 'fresh_replay_validate_zero_loss_source_segments'
          : 'mine_scanner_snapshot_fields',
    },
    zeroLossTransferSegments,
    latestPositiveTrainLossBearingSegments,
    latestPositiveTrainWeakSegments,
    cautionSegments,
    blockers,
    recommendations: blockers.length
      ? ['Fix replay package/outcome report inputs before using source-field findings.']
      : [
        zeroLossTransferSegments.length
          ? 'Treat zero-loss source-field segments as research candidates only; validate on fresh replay before scanner-visible behavior.'
          : 'Source fields still do not isolate a zero-loss transferable Sweep segment; mine richer scanner snapshot fields next.',
        'Do not use outcome path, MFE, MAE, or future bars as live selector inputs.',
        'Preserve canExecute, 5M execution authority, protected stops, target/risk math, Discord posting, Supabase persistence, and bridge behavior.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSweepSourceFieldDrilldownReport(
  report: RawOhlcScannerArtifactSweepSourceFieldDrilldownReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-sweep-source-field-drilldown-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSweepSourceFieldDrilldownCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSweepSourceFieldDrilldownArgs(args);
  const report = buildRawOhlcScannerArtifactSweepSourceFieldDrilldownReport({
    reportDir: options.outDir,
    trainReplayPackagePaths: options.trainReplayPackages,
    trainReplayPackages: options.trainReplayPackages.map((filePath) => readJson<UnifiedPositiveHeldLocalPreviewReplayPackageReport>(filePath)),
    trainOutcomeReportPaths: options.trainOutcomeReports,
    trainOutcomeReports: options.trainOutcomeReports.map((filePath) => readJson<UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport>(filePath)),
    testReplayPackagePaths: options.testReplayPackages,
    testReplayPackages: options.testReplayPackages.map((filePath) => readJson<UnifiedPositiveHeldLocalPreviewReplayPackageReport>(filePath)),
    testOutcomeReportPaths: options.testOutcomeReports,
    testOutcomeReports: options.testOutcomeReports.map((filePath) => readJson<UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport>(filePath)),
    minRowsPerPeriod: options.minRowsPerPeriod,
  });
  const paths = writeRawOhlcScannerArtifactSweepSourceFieldDrilldownReport(report, options.outDir);
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
    runRawOhlcScannerArtifactSweepSourceFieldDrilldownCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
