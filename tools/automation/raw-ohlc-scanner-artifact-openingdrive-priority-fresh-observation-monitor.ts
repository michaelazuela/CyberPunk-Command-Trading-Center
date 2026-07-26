import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildRawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport,
  RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport,
} from './raw-ohlc-scanner-artifact-openingdrive-oos-source-installed-selection';
import type {
  RawOhlcScannerArtifactSameBarSeparatorDrilldownReport,
} from './raw-ohlc-scanner-artifact-samebar-separator-drilldown';

interface CliOptions {
  baselineReport: string | null;
  samebarReports: string[];
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

type Recommendation =
  | 'await_fresh_replay_or_live_observation_artifacts'
  | 'continue_observation'
  | 'investigate_before_broadening'
  | 'fix_inputs';

export interface RawOhlcScannerArtifactOpeningDrivePriorityFreshObservationMonitorReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_fresh_observation_monitor';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    baselineReport: string | null;
    freshSamebarReports: string[];
    autoSelectedFreshReportsAfterBaseline: boolean;
  };
  baseline: {
    status: 'pass' | 'fail' | 'missing';
    comparableEvents: number;
    installedPrioritySelectedRows: number;
    installedOpeningDriveSelectedRows: number;
    canExecuteTrueRows: number;
    approvalBoundaryDriftRows: number;
    priorityLosses: number;
    deltaOneMesPl: number | null;
  };
  freshObservation: {
    samebarReports: number;
    comparableEvents: number;
    installedPrioritySelectedRows: number;
    installedOpeningDriveSelectedRows: number;
    canExecuteTrueRows: number;
    approvalBoundaryDriftRows: number;
    priorityLosses: number;
    openingDriveOneMesPl: number | null;
    priorityOneMesPl: number | null;
    deltaOneMesPl: number | null;
  };
  summary: {
    recommendation: Recommendation;
    livePromotionAllowedRows: 0;
    broadeningAllowedNow: false;
  };
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

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function freshSamebarReportsAfterBaseline(reportDir: string, baselineReport: string | null): string[] {
  if (!baselineReport || !fs.existsSync(reportDir) || !fs.existsSync(baselineReport)) return [];
  const baselineMtime = fs.statSync(baselineReport).mtimeMs;
  return fs.readdirSync(reportDir)
    .filter((name) => /^raw-ohlc-scanner-artifact-samebar-separator-drilldown-\d+\.json$/.test(name))
    .map((name) => path.join(reportDir, name))
    .filter((filePath) => fs.statSync(filePath).mtimeMs > baselineMtime)
    .sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs);
}

export function parseRawOhlcScannerArtifactOpeningDrivePriorityFreshObservationMonitorArgs(
  args = process.argv.slice(2),
): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const baselineReport = readFlag(args, '--baseline-report') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-oos-source-installed-selection-\d+\.json$/);
  const explicitFreshReports = splitPaths(readFlag(args, '--samebar-reports'));
  return {
    baselineReport,
    samebarReports: explicitFreshReports.length
      ? explicitFreshReports
      : freshSamebarReportsAfterBaseline(outDir, baselineReport),
    outDir,
    json: args.includes('--json'),
  };
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

function zeroFreshObservation() {
  return {
    samebarReports: 0,
    comparableEvents: 0,
    installedPrioritySelectedRows: 0,
    installedOpeningDriveSelectedRows: 0,
    canExecuteTrueRows: 0,
    approvalBoundaryDriftRows: 0,
    priorityLosses: 0,
    openingDriveOneMesPl: null,
    priorityOneMesPl: null,
    deltaOneMesPl: null,
  };
}

function baselineSummary(report: RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport | null) {
  if (!report) {
    return {
      status: 'missing' as const,
      comparableEvents: 0,
      installedPrioritySelectedRows: 0,
      installedOpeningDriveSelectedRows: 0,
      canExecuteTrueRows: 0,
      approvalBoundaryDriftRows: 0,
      priorityLosses: 0,
      deltaOneMesPl: null,
    };
  }
  return {
    status: report.status,
    comparableEvents: report.summary.comparableEvents,
    installedPrioritySelectedRows: report.summary.installedPrioritySelectedRows,
    installedOpeningDriveSelectedRows: report.summary.installedOpeningDriveSelectedRows,
    canExecuteTrueRows: report.summary.canExecuteTrueRows,
    approvalBoundaryDriftRows: report.summary.approvalBoundaryDriftRows,
    priorityLosses: report.summary.priorityLosses,
    deltaOneMesPl: report.summary.deltaOneMesPl,
  };
}

function freshObservationFrom(
  samebarReports: string[],
  reports: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport[],
) {
  if (samebarReports.length === 0) return zeroFreshObservation();
  const fresh = buildRawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport({
    samebarReports,
    reports,
  });
  return {
    samebarReports: samebarReports.length,
    comparableEvents: fresh.summary.comparableEvents,
    installedPrioritySelectedRows: fresh.summary.installedPrioritySelectedRows,
    installedOpeningDriveSelectedRows: fresh.summary.installedOpeningDriveSelectedRows,
    canExecuteTrueRows: fresh.summary.canExecuteTrueRows,
    approvalBoundaryDriftRows: fresh.summary.approvalBoundaryDriftRows,
    priorityLosses: fresh.summary.priorityLosses,
    openingDriveOneMesPl: fresh.summary.openingDriveOneMesPl,
    priorityOneMesPl: fresh.summary.priorityOneMesPl,
    deltaOneMesPl: fresh.summary.deltaOneMesPl,
  };
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityFreshObservationMonitorReport, 'markdown'>): string {
  return [
    '# OpeningDrive Priority Fresh Observation Monitor',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only observation monitor. It consumes saved baseline/source reports and fresh same-bar diagnostic reports only. It does not run setupScanner, post Discord, write Supabase, read live bridge data, change scanner behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Baseline',
    `- Status: ${report.baseline.status}.`,
    `- Comparable events: ${report.baseline.comparableEvents}.`,
    `- Priority/OpenDrive selected rows: ${report.baseline.installedPrioritySelectedRows}/${report.baseline.installedOpeningDriveSelectedRows}.`,
    `- canExecute=true rows: ${report.baseline.canExecuteTrueRows}.`,
    `- Approval boundary drift rows: ${report.baseline.approvalBoundaryDriftRows}.`,
    `- Priority losses: ${report.baseline.priorityLosses}.`,
    `- Delta one-MES P/L: ${report.baseline.deltaOneMesPl ?? '-'}.`,
    '',
    '## Fresh Observation',
    `- Fresh same-bar reports: ${report.freshObservation.samebarReports}.`,
    `- Comparable events: ${report.freshObservation.comparableEvents}.`,
    `- Priority/OpenDrive selected rows: ${report.freshObservation.installedPrioritySelectedRows}/${report.freshObservation.installedOpeningDriveSelectedRows}.`,
    `- canExecute=true rows: ${report.freshObservation.canExecuteTrueRows}.`,
    `- Approval boundary drift rows: ${report.freshObservation.approvalBoundaryDriftRows}.`,
    `- Priority losses: ${report.freshObservation.priorityLosses}.`,
    `- One-MES P/L OpeningDrive / priority / delta: ${report.freshObservation.openingDriveOneMesPl ?? '-'}/${report.freshObservation.priorityOneMesPl ?? '-'}/${report.freshObservation.deltaOneMesPl ?? '-'}.`,
    '',
    '## Decision',
    `- Recommendation: ${report.summary.recommendation}.`,
    `- Broadening allowed now: ${report.summary.broadeningAllowedNow}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityFreshObservationMonitorReport(args: {
  baselineReportPath: string | null;
  baselineReport: RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport | null;
  samebarReports: string[];
  reports: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport[];
  autoSelectedFreshReportsAfterBaseline?: boolean;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityFreshObservationMonitorReport {
  const baseline = baselineSummary(args.baselineReport);
  const freshObservation = freshObservationFrom(args.samebarReports, args.reports);
  const blockers = [
    !args.baselineReportPath ? 'missing baseline source-installed-selection report' : null,
    args.baselineReport && args.baselineReport.status !== 'pass' ? 'baseline source-installed-selection report did not pass' : null,
    args.baselineReport && args.baselineReport.summary.canExecuteTrueRows !== 0 ? 'baseline created canExecute=true rows' : null,
    args.baselineReport && args.baselineReport.summary.approvalBoundaryDriftRows !== 0 ? 'baseline had approval-boundary drift rows' : null,
    args.reports.some((report) => report.status !== 'pass') ? 'one or more fresh same-bar reports did not pass' : null,
  ].filter((item): item is string => Boolean(item));
  const freshClean = freshObservation.samebarReports > 0 &&
    freshObservation.comparableEvents > 0 &&
    freshObservation.installedOpeningDriveSelectedRows === 0 &&
    freshObservation.canExecuteTrueRows === 0 &&
    freshObservation.approvalBoundaryDriftRows === 0 &&
    freshObservation.priorityLosses === 0;
  const recommendation: Recommendation = blockers.length
    ? 'fix_inputs'
    : freshObservation.samebarReports === 0 || freshObservation.comparableEvents === 0
      ? 'await_fresh_replay_or_live_observation_artifacts'
      : freshClean
        ? 'continue_observation'
        : 'investigate_before_broadening';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityFreshObservationMonitorReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_fresh_observation_monitor',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      baselineReport: args.baselineReportPath,
      freshSamebarReports: args.samebarReports,
      autoSelectedFreshReportsAfterBaseline: Boolean(args.autoSelectedFreshReportsAfterBaseline),
    },
    baseline,
    freshObservation,
    summary: {
      recommendation,
      livePromotionAllowedRows: 0,
      broadeningAllowedNow: false,
    },
    blockers,
    recommendations: recommendation === 'continue_observation'
      ? [
        'Fresh artifacts continue to support the installed same-event Sweep/HTF priority overlay.',
        'Keep this in observation before broadening to AfterLunch, historicalReview, Sweep variants, or failed-plan reversal.',
      ]
      : recommendation === 'await_fresh_replay_or_live_observation_artifacts'
        ? [
          'Generate or capture fresh same-bar replay/live-observation artifacts before broadening the overlay.',
          'Do not broaden based only on the saved OOS baseline.',
        ]
        : recommendation === 'investigate_before_broadening'
          ? ['Fresh artifacts disagree with the clean baseline. Investigate the contradiction before any broader install.']
          : ['Fix input report blockers before using this monitor for phase planning.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function writeReport(report: RawOhlcScannerArtifactOpeningDrivePriorityFreshObservationMonitorReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-fresh-observation-monitor-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, `${base}.md`), `${report.markdown}\n`, 'utf8');
  return jsonPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const options = parseRawOhlcScannerArtifactOpeningDrivePriorityFreshObservationMonitorArgs();
  const baselineReport = options.baselineReport && fs.existsSync(options.baselineReport)
    ? readJson<RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport>(options.baselineReport)
    : null;
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityFreshObservationMonitorReport({
    baselineReportPath: options.baselineReport,
    baselineReport,
    samebarReports: options.samebarReports,
    reports: options.samebarReports.map((filePath) => readJson<RawOhlcScannerArtifactSameBarSeparatorDrilldownReport>(filePath)),
    autoSelectedFreshReportsAfterBaseline: splitPaths(readFlag(process.argv.slice(2), '--samebar-reports')).length === 0,
  });
  const jsonPath = writeReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ status: report.status, jsonPath, summary: report.summary, freshObservation: report.freshObservation, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nWrote ${jsonPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}
