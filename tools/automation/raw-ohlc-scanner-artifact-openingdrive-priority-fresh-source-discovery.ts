import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport,
} from './raw-ohlc-scanner-artifact-openingdrive-oos-source-installed-selection';
import type {
  RawOhlcScannerArtifactSameBarSeparatorDrilldownReport,
} from './raw-ohlc-scanner-artifact-samebar-separator-drilldown';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport,
} from './unified-positive-held-local-preview-replay-package-outcome';

interface CliOptions {
  baselineReport: string | null;
  reportDir: string;
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
  | 'await_new_replay_outcomes'
  | 'convert_pending_outcomes_to_samebar_reports'
  | 'rerun_fresh_observation_monitor'
  | 'fix_inputs';

interface OutcomeDiscoveryRow {
  outcomeReportPath: string;
  generatedAt: string | null;
  mtimeMs: number;
  status: string;
  rows: number;
  livePromotionAllowedRows: number;
  alreadyConvertedToSamebar: boolean;
  samebarReportPath: string | null;
  suggestedCommand: string | null;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityFreshSourceDiscoveryReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_fresh_source_discovery';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    reportDir: string;
    baselineReport: string | null;
    baselineMtimeMs: number | null;
  };
  summary: {
    outcomeReportsAfterBaseline: number;
    pendingOutcomeReports: number;
    convertedOutcomeReports: number;
    failedOutcomeReports: number;
    samebarReportsAfterBaseline: number;
    livePromotionAllowedRows: 0;
    broadeningAllowedNow: false;
    recommendation: Recommendation;
  };
  rows: OutcomeDiscoveryRow[];
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

export function parseRawOhlcScannerArtifactOpeningDrivePriorityFreshSourceDiscoveryArgs(
  args = process.argv.slice(2),
): CliOptions {
  const reportDir = readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR;
  return {
    reportDir,
    baselineReport: readFlag(args, '--baseline-report') ||
      latestMatchingFile(reportDir, /^raw-ohlc-scanner-artifact-openingdrive-oos-source-installed-selection-\d+\.json$/),
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

function listJson(reportDir: string, pattern: RegExp): string[] {
  if (!fs.existsSync(reportDir)) return [];
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs);
}

function samebarConversions(reportDir: string): Map<string, string> {
  const conversions = new Map<string, string>();
  for (const filePath of listJson(reportDir, /^raw-ohlc-scanner-artifact-samebar-separator-drilldown-\d+\.json$/)) {
    const report = readJson<RawOhlcScannerArtifactSameBarSeparatorDrilldownReport>(filePath);
    if (report.source.replayPackageOutcomePath) conversions.set(path.resolve(report.source.replayPackageOutcomePath), filePath);
  }
  return conversions;
}

function commandFor(outcomeReportPath: string, reportDir: string): string {
  return `npm run research:raw-ohlc-scanner-artifact-samebar-separator-drilldown -- --replay-package-outcome "${outcomeReportPath}" --out-dir "${reportDir}" --json`;
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityFreshSourceDiscoveryReport, 'markdown'>): string {
  return [
    '# OpeningDrive Priority Fresh Source Discovery',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only source discovery. It scans saved diagnostic reports only. It does not run setupScanner, post Discord, write Supabase, read live bridge data, change scanner behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Outcome reports after baseline: ${report.summary.outcomeReportsAfterBaseline}.`,
    `- Pending outcome reports: ${report.summary.pendingOutcomeReports}.`,
    `- Converted outcome reports: ${report.summary.convertedOutcomeReports}.`,
    `- Failed outcome reports: ${report.summary.failedOutcomeReports}.`,
    `- Same-bar reports after baseline: ${report.summary.samebarReportsAfterBaseline}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Pending Commands',
    ...report.rows.filter((row) => row.suggestedCommand).map((row) => `- ${row.suggestedCommand}`),
    ...(report.rows.some((row) => row.suggestedCommand) ? [] : ['- None.']),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityFreshSourceDiscoveryReport(args: {
  reportDir: string;
  baselineReportPath: string | null;
  baselineReport: RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityFreshSourceDiscoveryReport {
  const baselineMtimeMs = args.baselineReportPath && fs.existsSync(args.baselineReportPath)
    ? fs.statSync(args.baselineReportPath).mtimeMs
    : null;
  const conversions = samebarConversions(args.reportDir);
  const outcomePaths = listJson(args.reportDir, /^unified-positive-held-local-preview-replay-package-outcome-\d+\.json$/)
    .filter((filePath) => baselineMtimeMs === null || fs.statSync(filePath).mtimeMs > baselineMtimeMs);
  const rows = outcomePaths.map((filePath) => {
    const report = readJson<UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport>(filePath);
    const resolved = path.resolve(filePath);
    const samebarReportPath = conversions.get(resolved) || null;
    const ok = report.status === 'pass' && report.summary.livePromotionAllowedRows === 0;
    return {
      outcomeReportPath: filePath,
      generatedAt: report.generatedAt || null,
      mtimeMs: fs.statSync(filePath).mtimeMs,
      status: report.status,
      rows: report.rows.length,
      livePromotionAllowedRows: report.summary.livePromotionAllowedRows,
      alreadyConvertedToSamebar: Boolean(samebarReportPath),
      samebarReportPath,
      suggestedCommand: ok && !samebarReportPath ? commandFor(filePath, args.reportDir) : null,
    };
  });
  const samebarReportsAfterBaseline = listJson(args.reportDir, /^raw-ohlc-scanner-artifact-samebar-separator-drilldown-\d+\.json$/)
    .filter((filePath) => baselineMtimeMs === null || fs.statSync(filePath).mtimeMs > baselineMtimeMs).length;
  const pending = rows.filter((row) => row.suggestedCommand).length;
  const converted = rows.filter((row) => row.alreadyConvertedToSamebar).length;
  const failed = rows.filter((row) => row.status !== 'pass' || row.livePromotionAllowedRows !== 0).length;
  const blockers = [
    !args.baselineReportPath ? 'missing baseline source-installed-selection report' : null,
    args.baselineReport && args.baselineReport.status !== 'pass' ? 'baseline source-installed-selection report did not pass' : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation: Recommendation = blockers.length
    ? 'fix_inputs'
    : pending > 0
      ? 'convert_pending_outcomes_to_samebar_reports'
      : samebarReportsAfterBaseline > 0
        ? 'rerun_fresh_observation_monitor'
        : 'await_new_replay_outcomes';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityFreshSourceDiscoveryReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_fresh_source_discovery',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      baselineReport: args.baselineReportPath,
      baselineMtimeMs,
    },
    summary: {
      outcomeReportsAfterBaseline: rows.length,
      pendingOutcomeReports: pending,
      convertedOutcomeReports: converted,
      failedOutcomeReports: failed,
      samebarReportsAfterBaseline,
      livePromotionAllowedRows: 0,
      broadeningAllowedNow: false,
      recommendation,
    },
    rows,
    blockers,
    recommendations: recommendation === 'convert_pending_outcomes_to_samebar_reports'
      ? ['Run the pending same-bar conversion commands, then rerun the fresh observation monitor.']
      : recommendation === 'rerun_fresh_observation_monitor'
        ? ['Fresh same-bar reports exist. Rerun the fresh observation monitor before any broadening decision.']
        : recommendation === 'await_new_replay_outcomes'
          ? ['No newer replay outcome reports exist yet. Generate a fresh replay package/outcome before conversion.']
          : ['Fix baseline/input blockers before using discovery.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function writeReport(report: RawOhlcScannerArtifactOpeningDrivePriorityFreshSourceDiscoveryReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-fresh-source-discovery-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, `${base}.md`), `${report.markdown}\n`, 'utf8');
  return jsonPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const options = parseRawOhlcScannerArtifactOpeningDrivePriorityFreshSourceDiscoveryArgs();
  const baselineReport = options.baselineReport && fs.existsSync(options.baselineReport)
    ? readJson<RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport>(options.baselineReport)
    : null;
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityFreshSourceDiscoveryReport({
    reportDir: options.reportDir,
    baselineReportPath: options.baselineReport,
    baselineReport,
  });
  const jsonPath = writeReport(report, options.reportDir);
  if (options.json) console.log(JSON.stringify({ status: report.status, jsonPath, summary: report.summary, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nWrote ${jsonPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}
