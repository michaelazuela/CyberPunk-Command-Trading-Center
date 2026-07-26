import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityStructuralContextMinerReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-structural-context-miner';
import type {
  RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport,
} from './raw-ohlc-scanner-artifact-openingdrive-oos-source-installed-selection';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-no-lookahead-feature-miner';

interface CliOptions {
  structuralContextReports: string[];
  sourceSelectionReports: string[];
  rawOhlcSources: string[];
  featureTag: string;
  outDir: string;
  json: boolean;
}

interface QueueRow {
  artifactType: 'source_selection_report' | 'raw_ohlc_source';
  path: string;
  tradeDates: string[];
  reason: 'not_yet_structural_context_mined' | 'no_source_selection_report_for_source';
  requiredNextCommand: string;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityStructuralValidationQueueReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_structural_validation_queue';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: {
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
  };
  source: {
    structuralContextReports: string[];
    sourceSelectionReports: string[];
    rawOhlcSources: string[];
    featureTag: string;
  };
  summary: {
    structuralContextReports: number;
    sourceSelectionReports: number;
    alreadyMinedSourceSelectionReports: number;
    queuedSourceSelectionReports: number;
    rawOhlcSources: number;
    queuedRawOhlcSources: number;
    liveInitialRankFeatureRows: 0;
    livePromotionAllowedRows: 0;
    broadeningAllowedNow: false;
    recommendation: 'run_queued_structural_context_mining' | 'generate_new_openingdrive_priority_collision_artifacts' | 'fix_inputs';
  };
  queueRows: QueueRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_FEATURE = 'best_conditional_NoInstalledSetup';

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

export function parseRawOhlcScannerArtifactOpeningDrivePriorityStructuralValidationQueueArgs(
  argv = process.argv.slice(2),
): CliOptions {
  return {
    structuralContextReports: splitPaths(readFlag(argv, '--structural-context-reports')).map((item) => path.resolve(item)),
    sourceSelectionReports: splitPaths(readFlag(argv, '--source-selection-reports')).map((item) => path.resolve(item)),
    rawOhlcSources: splitPaths(readFlag(argv, '--raw-ohlc-sources')).map((item) => path.resolve(item)),
    featureTag: readFlag(argv, '--feature-tag') || DEFAULT_FEATURE,
    outDir: path.resolve(readFlag(argv, '--out-dir') || DEFAULT_REPORT_DIR),
    json: argv.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function normalize(filePath: string): string {
  return path.resolve(filePath).toLowerCase();
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityStructuralValidationQueueReport['authority'] {
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

function tradeDatesFromSourceSelection(report: RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport): string[] {
  return [...new Set(report.rows.map((row) => row.tradeDate).filter(Boolean))].sort();
}

function rawSourceDateRange(filePath: string): string[] {
  const match = path.basename(filePath).match(/raw-ohlc-source-[^-]+-(\d{4}-\d{2}-\d{2})-to-(\d{4}-\d{2}-\d{2})-/);
  return match ? [match[1], match[2]] : [];
}

function minedSourceSelectionReportsFromStructuralReports(
  reports: RawOhlcScannerArtifactOpeningDrivePriorityStructuralContextMinerReport[],
): Set<string> {
  const output = new Set<string>();
  for (const report of reports) {
    for (const minerReportPath of report.source.minerReports) {
      if (!fs.existsSync(minerReportPath)) continue;
      const minerReport = readJson<RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport>(minerReportPath);
      for (const sourceSelectionReport of minerReport.source.sourceSelectionReports) output.add(normalize(sourceSelectionReport));
    }
  }
  return output;
}

function requiredMiningCommand(sourceSelectionReport: string): string {
  return `npm run research:raw-ohlc-scanner-artifact-openingdrive-priority-no-lookahead-feature-miner -- --source-selection-reports "${sourceSelectionReport}" --json && npm run research:raw-ohlc-scanner-artifact-openingdrive-priority-structural-context-miner -- --json`;
}

function requiredRawSourceCommand(rawOhlcSource: string): string {
  return `npm run research:raw-ohlc-scanner-artifacts -- --market-bars-json "${rawOhlcSource}" --json`;
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityStructuralValidationQueueReport, 'markdown'>): string {
  return [
    '# OpeningDrive Priority Structural Validation Queue',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only queue. It scans saved structural-context reports, source-selection reports, and raw OHLC source manifests only. It does not run setupScanner, post Discord, write Supabase, read live bridge data, change scanner behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Structural-context reports: ${report.summary.structuralContextReports}.`,
    `- Source-selection reports: ${report.summary.sourceSelectionReports}.`,
    `- Already mined source-selection reports: ${report.summary.alreadyMinedSourceSelectionReports}.`,
    `- Queued source-selection reports: ${report.summary.queuedSourceSelectionReports}.`,
    `- Raw OHLC sources: ${report.summary.rawOhlcSources}.`,
    `- Queued raw OHLC sources: ${report.summary.queuedRawOhlcSources}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Queue Rows',
    ...(report.queueRows.length ? report.queueRows.map((row) => `- ${row.artifactType}: ${row.path}; dates ${row.tradeDates.join(',') || 'unknown'}; reason ${row.reason}.`) : ['- None.']),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityStructuralValidationQueueReport(args: {
  structuralContextReports: string[];
  loadedStructuralContextReports: RawOhlcScannerArtifactOpeningDrivePriorityStructuralContextMinerReport[];
  sourceSelectionReports: string[];
  loadedSourceSelectionReports: Array<{
    path: string;
    report: RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport;
  }>;
  rawOhlcSources: string[];
  featureTag: string;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityStructuralValidationQueueReport {
  const minedSourceSelectionReports = minedSourceSelectionReportsFromStructuralReports(args.loadedStructuralContextReports);
  const queuedSourceSelectionRows = args.loadedSourceSelectionReports
    .filter((item) => !minedSourceSelectionReports.has(normalize(item.path)))
    .map((item): QueueRow => ({
      artifactType: 'source_selection_report',
      path: item.path,
      tradeDates: tradeDatesFromSourceSelection(item.report),
      reason: 'not_yet_structural_context_mined',
      requiredNextCommand: requiredMiningCommand(item.path),
    }));
  const minedDates = new Set(args.loadedSourceSelectionReports.flatMap((item) => tradeDatesFromSourceSelection(item.report)));
  const queuedRawSourceRows = args.rawOhlcSources
    .filter((rawSource) => rawSourceDateRange(rawSource).some((date) => !minedDates.has(date)))
    .map((rawSource): QueueRow => ({
      artifactType: 'raw_ohlc_source',
      path: rawSource,
      tradeDates: rawSourceDateRange(rawSource),
      reason: 'no_source_selection_report_for_source',
      requiredNextCommand: requiredRawSourceCommand(rawSource),
    }));
  const queueRows = [...queuedSourceSelectionRows, ...queuedRawSourceRows];
  const blockers = [
    args.structuralContextReports.length === 0 ? 'no structural-context reports supplied' : null,
    args.loadedStructuralContextReports.some((report) => report.status !== 'pass') ? 'one or more structural-context reports did not pass' : null,
    args.sourceSelectionReports.length === 0 ? 'no source-selection reports supplied' : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation: RawOhlcScannerArtifactOpeningDrivePriorityStructuralValidationQueueReport['summary']['recommendation'] = blockers.length
    ? 'fix_inputs'
    : queueRows.length > 0
      ? 'run_queued_structural_context_mining'
      : 'generate_new_openingdrive_priority_collision_artifacts';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityStructuralValidationQueueReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_structural_validation_queue',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      structuralContextReports: args.structuralContextReports,
      sourceSelectionReports: args.sourceSelectionReports,
      rawOhlcSources: args.rawOhlcSources,
      featureTag: args.featureTag,
    },
    summary: {
      structuralContextReports: args.loadedStructuralContextReports.length,
      sourceSelectionReports: args.loadedSourceSelectionReports.length,
      alreadyMinedSourceSelectionReports: minedSourceSelectionReports.size,
      queuedSourceSelectionReports: queuedSourceSelectionRows.length,
      rawOhlcSources: args.rawOhlcSources.length,
      queuedRawOhlcSources: queuedRawSourceRows.length,
      liveInitialRankFeatureRows: 0,
      livePromotionAllowedRows: 0,
      broadeningAllowedNow: false,
      recommendation,
    },
    queueRows,
    blockers,
    recommendations: recommendation === 'run_queued_structural_context_mining'
      ? ['Run queued local commands, then rerun the structural validation rollup. Keep the feature research-only.']
      : recommendation === 'generate_new_openingdrive_priority_collision_artifacts'
        ? ['Saved structural-validation artifacts are exhausted. Generate new OpeningDrive priority collision artifacts before proposing any scanner-visible penalty.']
        : ['Fix queue inputs before interpreting structural-validation queue output.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function writeReport(report: RawOhlcScannerArtifactOpeningDrivePriorityStructuralValidationQueueReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-structural-validation-queue-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, `${base}.md`), `${report.markdown}\n`, 'utf8');
  return jsonPath;
}

export function runRawOhlcScannerArtifactOpeningDrivePriorityStructuralValidationQueueCli(
  options = parseRawOhlcScannerArtifactOpeningDrivePriorityStructuralValidationQueueArgs(),
): RawOhlcScannerArtifactOpeningDrivePriorityStructuralValidationQueueReport {
  const structuralContextReports = options.structuralContextReports.length
    ? options.structuralContextReports
    : matchingReportPaths(/^raw-ohlc-scanner-artifact-openingdrive-priority-structural-context-miner-\d+\.json$/);
  const sourceSelectionReports = options.sourceSelectionReports.length
    ? options.sourceSelectionReports
    : matchingReportPaths(/^raw-ohlc-scanner-artifact-openingdrive-oos-source-installed-selection-\d+\.json$/);
  const rawOhlcSources = options.rawOhlcSources.length
    ? options.rawOhlcSources
    : matchingReportPaths(/^raw-ohlc-source-[^-]+-\d{4}-\d{2}-\d{2}-to-\d{4}-\d{2}-\d{2}-\d+\.json$/);
  const loadedStructuralContextReports = structuralContextReports.map((reportPath) =>
    readJson<RawOhlcScannerArtifactOpeningDrivePriorityStructuralContextMinerReport>(reportPath));
  const loadedSourceSelectionReports = sourceSelectionReports.map((reportPath) => ({
    path: reportPath,
    report: readJson<RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport>(reportPath),
  }));
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityStructuralValidationQueueReport({
    structuralContextReports,
    loadedStructuralContextReports,
    sourceSelectionReports,
    loadedSourceSelectionReports,
    rawOhlcSources,
    featureTag: options.featureTag,
  });
  const jsonPath = writeReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ status: report.status, jsonPath, summary: report.summary, queueRows: report.queueRows, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nWrote ${jsonPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  runRawOhlcScannerArtifactOpeningDrivePriorityStructuralValidationQueueCli();
}
