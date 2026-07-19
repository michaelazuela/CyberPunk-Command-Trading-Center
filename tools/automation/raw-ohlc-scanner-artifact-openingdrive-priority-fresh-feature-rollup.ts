import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport,
} from './raw-ohlc-scanner-artifact-openingdrive-oos-source-installed-selection';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureComparisonReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-fresh-feature-comparison';

interface CliOptions {
  sourceSelectionReports: string[];
  featureComparisonReports: string[];
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

interface DailyRow {
  tradeDate: string;
  sourceSelectionReport: string;
  featureComparisonReport: string | null;
  comparableEvents: number;
  installedPrioritySelectedRows: number;
  priorityLosses: number;
  openingDriveLosses: number;
  priorityOneMesPl: number | null;
  openingDriveOneMesPl: number | null;
  deltaOneMesPl: number | null;
  featureMatchingRows: number;
  featureCaughtUnderperformanceRows: number;
  featureFalseRejectedPriorityBetterRows: number;
  featureSimulatedDeltaVsInstalledPriority: number | null;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureRollupReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_fresh_feature_rollup';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    sourceSelectionReports: string[];
    featureComparisonReports: string[];
  };
  assumptions: {
    consumesSavedSourceSelectionAndFeatureComparisonReportsOnly: true;
    featureTag: 'proof_bar_failed_close_through_entry';
    outcomeFieldsAreEvaluationOnly: true;
    noLiveScoringUsed: true;
    noSetupScannerRun: true;
    livePromotionAllowed: false;
  };
  summary: {
    days: number;
    comparableEvents: number;
    installedPrioritySelectedRows: number;
    priorityLosses: number;
    openingDriveLosses: number;
    priorityOneMesPl: number | null;
    openingDriveOneMesPl: number | null;
    deltaOneMesPl: number | null;
    featureMatchingRows: number;
    featureCaughtUnderperformanceRows: number;
    featureFalseRejectedPriorityBetterRows: number;
    featureSimulatedDeltaVsInstalledPriority: number | null;
    liveInitialRankFeatureRows: 0;
    livePromotionAllowedRows: 0;
    broadeningAllowedNow: false;
    recommendation: 'do_not_install_feature_broaden_validation' | 'feature_candidate_needs_larger_validation' | 'fix_inputs';
  };
  rows: DailyRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const FEATURE_TAG = 'proof_bar_failed_close_through_entry' as const;

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function splitPaths(value: string | null): string[] {
  return (value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function matchingReportPaths(pattern: RegExp): string[] {
  if (!fs.existsSync(DEFAULT_REPORT_DIR)) return [];
  return fs.readdirSync(DEFAULT_REPORT_DIR)
    .filter((file) => pattern.test(file))
    .map((file) => path.join(DEFAULT_REPORT_DIR, file))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
}

export function parseRawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureRollupArgs(
  argv = process.argv.slice(2),
): CliOptions {
  return {
    sourceSelectionReports: splitPaths(readFlag(argv, '--source-selection-reports')).map((item) => path.resolve(item)),
    featureComparisonReports: splitPaths(readFlag(argv, '--feature-comparison-reports')).map((item) => path.resolve(item)),
    outDir: path.resolve(readFlag(argv, '--out-dir') || DEFAULT_REPORT_DIR),
    json: argv.includes('--json'),
  };
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

function sum(values: Array<number | null>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? Math.round(numeric.reduce((total, value) => total + value, 0) * 100) / 100 : null;
}

function tradeDateFromSourceReport(report: RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport): string {
  return [...new Set(report.rows.map((row) => row.tradeDate))].sort()[0] || 'unknown';
}

function comparisonBySourcePath(reports: Array<{
  path: string;
  report: RawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureComparisonReport;
}>): Map<string, { path: string; report: RawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureComparisonReport }> {
  const output = new Map<string, { path: string; report: RawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureComparisonReport }>();
  for (const item of reports) {
    for (const sourcePath of item.report.source.sourceSelectionReports) output.set(path.resolve(sourcePath).toLowerCase(), item);
  }
  return output;
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureRollupReport, 'markdown'>): string {
  return [
    '# OpeningDrive Priority Fresh Feature Rollup',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only rollup. It consumes saved source-selection and feature-comparison reports only and does not run setupScanner, post Discord, write Supabase, read live bridge data, change scanner behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Days: ${report.summary.days}.`,
    `- Comparable events: ${report.summary.comparableEvents}.`,
    `- Priority / OpeningDrive P/L: ${report.summary.priorityOneMesPl}/${report.summary.openingDriveOneMesPl}.`,
    `- Priority / OpeningDrive losses: ${report.summary.priorityLosses}/${report.summary.openingDriveLosses}.`,
    `- Feature matches: ${report.summary.featureMatchingRows}.`,
    `- Caught underperformance / false rejected priority winners: ${report.summary.featureCaughtUnderperformanceRows}/${report.summary.featureFalseRejectedPriorityBetterRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Daily Rows',
    ...report.rows.map((row) => `- ${row.tradeDate}: comparable ${row.comparableEvents}, priority/opening P/L ${row.priorityOneMesPl}/${row.openingDriveOneMesPl}, priority/opening losses ${row.priorityLosses}/${row.openingDriveLosses}, feature matches ${row.featureMatchingRows}.`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureRollupReport(args: {
  sourceSelectionReports: string[];
  loadedSourceSelectionReports: Array<{
    path: string;
    report: RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport;
  }>;
  featureComparisonReports: string[];
  loadedFeatureComparisonReports: Array<{
    path: string;
    report: RawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureComparisonReport;
  }>;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureRollupReport {
  const comparisonLookup = comparisonBySourcePath(args.loadedFeatureComparisonReports);
  const rows = args.loadedSourceSelectionReports.map(({ path: reportPath, report }) => {
    const comparison = comparisonLookup.get(path.resolve(reportPath).toLowerCase());
    return {
      tradeDate: tradeDateFromSourceReport(report),
      sourceSelectionReport: reportPath,
      featureComparisonReport: comparison?.path || null,
      comparableEvents: report.summary.comparableEvents,
      installedPrioritySelectedRows: report.summary.installedPrioritySelectedRows,
      priorityLosses: report.summary.priorityLosses,
      openingDriveLosses: report.summary.openingDriveLosses,
      priorityOneMesPl: report.summary.priorityOneMesPl,
      openingDriveOneMesPl: report.summary.openingDriveOneMesPl,
      deltaOneMesPl: report.summary.deltaOneMesPl,
      featureMatchingRows: comparison?.report.summary.matchingFeatureRows || 0,
      featureCaughtUnderperformanceRows: comparison?.report.summary.caughtUnderperformanceRows || 0,
      featureFalseRejectedPriorityBetterRows: comparison?.report.summary.falseRejectedPriorityBetterRows || 0,
      featureSimulatedDeltaVsInstalledPriority: comparison?.report.summary.simulatedDeltaVsInstalledPriority || 0,
    };
  }).sort((a, b) => a.tradeDate.localeCompare(b.tradeDate));
  const blockers = [
    args.sourceSelectionReports.length === 0 ? 'no source-selection reports supplied' : null,
    args.loadedSourceSelectionReports.some((item) => item.report.status !== 'pass') ? 'one or more source-selection reports did not pass' : null,
    args.featureComparisonReports.length === 0 ? 'no feature-comparison reports supplied' : null,
    args.loadedFeatureComparisonReports.some((item) => item.report.status !== 'pass') ? 'one or more feature-comparison reports did not pass' : null,
  ].filter((item): item is string => Boolean(item));
  const featureMatchingRows = rows.reduce((total, row) => total + row.featureMatchingRows, 0);
  const featureCaughtUnderperformanceRows = rows.reduce((total, row) => total + row.featureCaughtUnderperformanceRows, 0);
  const featureFalseRejectedPriorityBetterRows = rows.reduce((total, row) => total + row.featureFalseRejectedPriorityBetterRows, 0);
  const priorityLosses = rows.reduce((total, row) => total + row.priorityLosses, 0);
  const recommendation: RawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureRollupReport['summary']['recommendation'] = blockers.length
    ? 'fix_inputs'
    : featureCaughtUnderperformanceRows > 0 && featureCaughtUnderperformanceRows >= priorityLosses && featureFalseRejectedPriorityBetterRows === 0
      ? 'feature_candidate_needs_larger_validation'
      : 'do_not_install_feature_broaden_validation';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureRollupReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_fresh_feature_rollup',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      sourceSelectionReports: args.sourceSelectionReports,
      featureComparisonReports: args.featureComparisonReports,
    },
    assumptions: {
      consumesSavedSourceSelectionAndFeatureComparisonReportsOnly: true,
      featureTag: FEATURE_TAG,
      outcomeFieldsAreEvaluationOnly: true,
      noLiveScoringUsed: true,
      noSetupScannerRun: true,
      livePromotionAllowed: false,
    },
    summary: {
      days: rows.length,
      comparableEvents: rows.reduce((total, row) => total + row.comparableEvents, 0),
      installedPrioritySelectedRows: rows.reduce((total, row) => total + row.installedPrioritySelectedRows, 0),
      priorityLosses,
      openingDriveLosses: rows.reduce((total, row) => total + row.openingDriveLosses, 0),
      priorityOneMesPl: sum(rows.map((row) => row.priorityOneMesPl)),
      openingDriveOneMesPl: sum(rows.map((row) => row.openingDriveOneMesPl)),
      deltaOneMesPl: sum(rows.map((row) => row.deltaOneMesPl)),
      featureMatchingRows,
      featureCaughtUnderperformanceRows,
      featureFalseRejectedPriorityBetterRows,
      featureSimulatedDeltaVsInstalledPriority: sum(rows.map((row) => row.featureSimulatedDeltaVsInstalledPriority)),
      liveInitialRankFeatureRows: 0,
      livePromotionAllowedRows: 0,
      broadeningAllowedNow: false,
      recommendation,
    },
    rows,
    blockers,
    recommendations: recommendation === 'feature_candidate_needs_larger_validation'
      ? ['Feature has at least one catch and no false rejected priority winners in this rollup, but it remains research-only until broader validation is complete.']
      : recommendation === 'do_not_install_feature_broaden_validation'
        ? ['Do not install this feature live from the current rollup. It needs broader validation or a stronger separator because it did not catch fresh priority losses.']
        : ['Fix rollup inputs before interpreting this evidence.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function writeReport(report: RawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureRollupReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-fresh-feature-rollup-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, `${base}.md`), `${report.markdown}\n`, 'utf8');
  return jsonPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const options = parseRawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureRollupArgs();
  const sourceSelectionReports = options.sourceSelectionReports.length
    ? options.sourceSelectionReports
    : matchingReportPaths(/^raw-ohlc-scanner-artifact-openingdrive-oos-source-installed-selection-\d+\.json$/).slice(0, 6);
  const featureComparisonReports = options.featureComparisonReports.length
    ? options.featureComparisonReports
    : matchingReportPaths(/^raw-ohlc-scanner-artifact-openingdrive-priority-fresh-feature-comparison-\d+\.json$/).slice(0, 12);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureRollupReport({
    sourceSelectionReports,
    loadedSourceSelectionReports: sourceSelectionReports.map((reportPath) => ({
      path: reportPath,
      report: readJson<RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport>(reportPath),
    })),
    featureComparisonReports,
    loadedFeatureComparisonReports: featureComparisonReports.map((reportPath) => ({
      path: reportPath,
      report: readJson<RawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureComparisonReport>(reportPath),
    })),
  });
  const jsonPath = writeReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ status: report.status, jsonPath, summary: report.summary, rows: report.rows, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nWrote ${jsonPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}
