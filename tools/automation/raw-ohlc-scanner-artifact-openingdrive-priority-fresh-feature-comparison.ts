import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport,
} from './raw-ohlc-scanner-artifact-openingdrive-oos-source-installed-selection';
import type {
  RawOhlcScannerArtifactSameBarSeparatorDrilldownReport,
} from './raw-ohlc-scanner-artifact-samebar-separator-drilldown';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-no-lookahead-feature-miner';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityFreshFeaturePackageReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-fresh-feature-package';

interface CliOptions {
  packageReports: string[];
  sourceSelectionReports: string[];
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

type MinerReport = ReturnType<typeof buildRawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport>;
type MinerRow = MinerReport['rows'][number];

interface ComparisonRow {
  tradeDate: string;
  session: string;
  proofTime: string;
  direction: string;
  sourceSelectionReport: string;
  openingDriveTicketId: string;
  priorityTicketId: string;
  prioritySetupType: string;
  openingDriveOneMesPl: number | null;
  priorityOneMesPl: number | null;
  simulatedDeltaVsInstalledPriority: number | null;
  priorityUnderperformed: boolean;
  priorityBetter: boolean;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureComparisonReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_fresh_feature_comparison';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    packageReports: string[];
    sourceSelectionReports: string[];
  };
  assumptions: {
    consumesSavedPackageAndSourceSelectionReportsOnly: true;
    rebuildsMinerFromSavedArtifactsOnly: true;
    featureTag: 'proof_bar_failed_close_through_entry';
    excludesPostEntryResearchFeatures: true;
    outcomeFieldsAreEvaluationOnly: true;
    noLiveScoringUsed: true;
    noSetupScannerRun: true;
    livePromotionAllowed: false;
  };
  summary: {
    packageReports: number;
    sourceSelectionReports: number;
    minedEventRows: number;
    matchingFeatureRows: number;
    caughtUnderperformanceRows: number;
    falseRejectedPriorityBetterRows: number;
    simulatedDeltaVsInstalledPriority: number | null;
    liveInitialRankFeatureRows: 0;
    livePromotionAllowedRows: 0;
    broadeningAllowedNow: false;
    recommendation: 'needs_fresh_unseen_artifacts' | 'candidate_needs_larger_validation' | 'reject_for_now' | 'fix_inputs';
  };
  rows: ComparisonRow[];
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

function latestReportPaths(prefix: string): string[] {
  if (!fs.existsSync(DEFAULT_REPORT_DIR)) return [];
  return fs.readdirSync(DEFAULT_REPORT_DIR)
    .filter((file) => file.startsWith(prefix) && file.endsWith('.json'))
    .map((file) => path.join(DEFAULT_REPORT_DIR, file))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
    .slice(0, 1);
}

export function parseRawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureComparisonArgs(
  argv = process.argv.slice(2),
): CliOptions {
  return {
    packageReports: splitPaths(readFlag(argv, '--package-reports')).map((item) => path.resolve(item)),
    sourceSelectionReports: splitPaths(readFlag(argv, '--source-selection-reports')).map((item) => path.resolve(item)),
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
  if (values.some((value) => typeof value !== 'number')) return null;
  return values.reduce((total, value) => total + (value || 0), 0);
}

function sourceSelectionReportsFromPackages(packageReports: RawOhlcScannerArtifactOpeningDrivePriorityFreshFeaturePackageReport[]): string[] {
  return [...new Set(packageReports.flatMap((report) => report.packageRows.map((row) => row.sourceSelectionReport)))];
}

function loadSourceSelectionReport(filePath: string) {
  const report = readJson<RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport>(filePath);
  return {
    path: filePath,
    report,
    samebarReports: report.source.samebarReports.map((samebarPath) => readJson<RawOhlcScannerArtifactSameBarSeparatorDrilldownReport>(samebarPath)),
  };
}

function toComparisonRow(row: MinerRow): ComparisonRow {
  return {
    tradeDate: row.tradeDate,
    session: row.session,
    proofTime: row.proofTime,
    direction: row.direction,
    sourceSelectionReport: row.sourceSelectionReport,
    openingDriveTicketId: row.openingDriveTicketId,
    priorityTicketId: row.priorityTicketId,
    prioritySetupType: row.prioritySetupType,
    openingDriveOneMesPl: row.openingDriveOneMesPl,
    priorityOneMesPl: row.priorityOneMesPl,
    simulatedDeltaVsInstalledPriority: typeof row.openingDriveOneMesPl === 'number' && typeof row.priorityOneMesPl === 'number'
      ? row.openingDriveOneMesPl - row.priorityOneMesPl
      : null,
    priorityUnderperformed: row.priorityUnderperformed,
    priorityBetter: row.priorityBetter,
  };
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureComparisonReport, 'markdown'>): string {
  return [
    '# OpeningDrive Priority Fresh Feature Comparison',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only comparison. It rebuilds the miner from saved source-selection/same-bar artifacts only and does not run setupScanner, post Discord, write Supabase, read live bridge data, change scanner behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Source-selection reports: ${report.summary.sourceSelectionReports}.`,
    `- Mined event rows: ${report.summary.minedEventRows}.`,
    `- Matching feature rows: ${report.summary.matchingFeatureRows}.`,
    `- Caught underperformance / false rejected winners: ${report.summary.caughtUnderperformanceRows}/${report.summary.falseRejectedPriorityBetterRows}.`,
    `- Simulated delta vs installed priority: ${report.summary.simulatedDeltaVsInstalledPriority}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Rows',
    ...report.rows.map((row) => `- ${row.tradeDate} ${row.session} ${row.direction} ${row.proofTime}: priorityUnderperformed ${row.priorityUnderperformed}, priorityBetter ${row.priorityBetter}, simulated delta ${row.simulatedDeltaVsInstalledPriority}.`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureComparisonReport(args: {
  packageReports: string[];
  loadedPackageReports: RawOhlcScannerArtifactOpeningDrivePriorityFreshFeaturePackageReport[];
  sourceSelectionReports: string[];
  loadedSourceSelectionReports: Array<ReturnType<typeof loadSourceSelectionReport>>;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureComparisonReport {
  const minerReport = buildRawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport({
    sourceSelectionReports: args.sourceSelectionReports,
    loadedReports: args.loadedSourceSelectionReports,
  }, generatedAt);
  const rows = minerReport.rows.filter((row) => row.immediateFeatureTags.includes(FEATURE_TAG)).map(toComparisonRow);
  const simulatedDeltaVsInstalledPriority = sum(rows.map((row) => row.simulatedDeltaVsInstalledPriority));
  const blockers = [
    args.packageReports.length === 0 ? 'no package reports supplied' : null,
    args.loadedPackageReports.some((report) => report.status !== 'pass') ? 'one or more package reports did not pass' : null,
    args.sourceSelectionReports.length === 0 ? 'no source-selection reports supplied' : null,
    minerReport.status !== 'pass' ? 'rebuilt miner report did not pass' : null,
  ].filter((item): item is string => Boolean(item));
  const caughtUnderperformanceRows = rows.filter((row) => row.priorityUnderperformed).length;
  const falseRejectedPriorityBetterRows = rows.filter((row) => row.priorityBetter).length;
  const recommendation: RawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureComparisonReport['summary']['recommendation'] = blockers.length
    ? 'fix_inputs'
    : rows.length === 0
      ? 'needs_fresh_unseen_artifacts'
      : caughtUnderperformanceRows > 0 && falseRejectedPriorityBetterRows === 0
        ? 'candidate_needs_larger_validation'
        : 'reject_for_now';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureComparisonReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_fresh_feature_comparison',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      packageReports: args.packageReports,
      sourceSelectionReports: args.sourceSelectionReports,
    },
    assumptions: {
      consumesSavedPackageAndSourceSelectionReportsOnly: true,
      rebuildsMinerFromSavedArtifactsOnly: true,
      featureTag: FEATURE_TAG,
      excludesPostEntryResearchFeatures: true,
      outcomeFieldsAreEvaluationOnly: true,
      noLiveScoringUsed: true,
      noSetupScannerRun: true,
      livePromotionAllowed: false,
    },
    summary: {
      packageReports: args.loadedPackageReports.length,
      sourceSelectionReports: args.loadedSourceSelectionReports.length,
      minedEventRows: minerReport.rows.length,
      matchingFeatureRows: rows.length,
      caughtUnderperformanceRows,
      falseRejectedPriorityBetterRows,
      simulatedDeltaVsInstalledPriority,
      liveInitialRankFeatureRows: 0,
      livePromotionAllowedRows: 0,
      broadeningAllowedNow: false,
      recommendation,
    },
    rows,
    blockers,
    recommendations: recommendation === 'candidate_needs_larger_validation'
      ? ['The feature remains research-only but survived the available saved-artifact comparison; collect or run fresh unseen artifacts before any live-facing change.']
      : recommendation === 'needs_fresh_unseen_artifacts'
        ? ['No matching rows were found in available saved artifacts; generate fresh scanner-artifact evidence before interpreting this feature.']
        : recommendation === 'reject_for_now'
          ? ['The feature caught winners or failed to catch underperformance; reject for now.']
          : ['Fix package/source-selection inputs before interpreting comparison output.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function writeReport(report: RawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureComparisonReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-fresh-feature-comparison-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, `${base}.md`), `${report.markdown}\n`, 'utf8');
  return jsonPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const options = parseRawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureComparisonArgs();
  const packageReports = options.packageReports.length
    ? options.packageReports
    : latestReportPaths('raw-ohlc-scanner-artifact-openingdrive-priority-fresh-feature-package-');
  const loadedPackageReports = packageReports.map((reportPath) => readJson<RawOhlcScannerArtifactOpeningDrivePriorityFreshFeaturePackageReport>(reportPath));
  const sourceSelectionReports = options.sourceSelectionReports.length
    ? options.sourceSelectionReports
    : sourceSelectionReportsFromPackages(loadedPackageReports);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureComparisonReport({
    packageReports,
    loadedPackageReports,
    sourceSelectionReports,
    loadedSourceSelectionReports: sourceSelectionReports.map(loadSourceSelectionReport),
  });
  const jsonPath = writeReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ status: report.status, jsonPath, summary: report.summary, rows: report.rows, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nWrote ${jsonPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}
