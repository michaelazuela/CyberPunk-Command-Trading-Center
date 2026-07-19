import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureComparisonReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-fresh-feature-comparison';

interface CliOptions {
  comparisonReports: string[];
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

interface QueueRow {
  sourceSelectionReport: string;
  reason: 'not_yet_compared_for_proof_bar_failed_close_through_entry';
  requiredNextCommand: string;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityUnseenFeatureQueueReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_unseen_feature_queue';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    comparisonReports: string[];
    sourceSelectionReports: string[];
  };
  assumptions: {
    consumesSavedComparisonAndSourceSelectionReportsOnly: true;
    queuesUnseenSourceSelectionReportsOnly: true;
    featureTag: 'proof_bar_failed_close_through_entry';
    noLiveScoringUsed: true;
    noSetupScannerRun: true;
    livePromotionAllowed: false;
  };
  summary: {
    comparisonReports: number;
    sourceSelectionReports: number;
    alreadyComparedSourceSelectionReports: number;
    queuedSourceSelectionReports: number;
    livePromotionAllowedRows: 0;
    broadeningAllowedNow: false;
    recommendation: 'run_unseen_queue_comparison' | 'no_unseen_saved_artifacts' | 'fix_inputs';
  };
  queueRows: QueueRow[];
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

export function parseRawOhlcScannerArtifactOpeningDrivePriorityUnseenFeatureQueueArgs(
  argv = process.argv.slice(2),
): CliOptions {
  return {
    comparisonReports: splitPaths(readFlag(argv, '--comparison-reports')).map((item) => path.resolve(item)),
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

function normalize(filePath: string): string {
  return path.resolve(filePath).toLowerCase();
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityUnseenFeatureQueueReport, 'markdown'>): string {
  return [
    '# OpeningDrive Priority Unseen Feature Queue',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only queue builder. It consumes saved comparison/source-selection reports only and does not run setupScanner, post Discord, write Supabase, read live bridge data, change scanner behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Source-selection reports: ${report.summary.sourceSelectionReports}.`,
    `- Already compared: ${report.summary.alreadyComparedSourceSelectionReports}.`,
    `- Queued: ${report.summary.queuedSourceSelectionReports}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Queue Rows',
    ...(report.queueRows.length ? report.queueRows.map((row) => `- ${row.sourceSelectionReport}: ${row.reason}.`) : ['- None.']),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityUnseenFeatureQueueReport(args: {
  comparisonReports: string[];
  loadedComparisonReports: RawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureComparisonReport[];
  sourceSelectionReports: string[];
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityUnseenFeatureQueueReport {
  const alreadyCompared = new Set(args.loadedComparisonReports.flatMap((report) => report.source.sourceSelectionReports).map(normalize));
  const queueRows = args.sourceSelectionReports
    .filter((reportPath) => !alreadyCompared.has(normalize(reportPath)))
    .map((sourceSelectionReport) => ({
      sourceSelectionReport,
      reason: 'not_yet_compared_for_proof_bar_failed_close_through_entry' as const,
      requiredNextCommand: `npm run research:raw-ohlc-scanner-artifact-openingdrive-priority-fresh-feature-comparison -- --source-selection-reports "${sourceSelectionReport}" --json`,
    }));
  const blockers = [
    args.comparisonReports.length === 0 ? 'no comparison reports supplied' : null,
    args.loadedComparisonReports.some((report) => report.status !== 'pass') ? 'one or more comparison reports did not pass' : null,
    args.sourceSelectionReports.length === 0 ? 'no source-selection reports supplied' : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation: RawOhlcScannerArtifactOpeningDrivePriorityUnseenFeatureQueueReport['summary']['recommendation'] = blockers.length
    ? 'fix_inputs'
    : queueRows.length > 0
      ? 'run_unseen_queue_comparison'
      : 'no_unseen_saved_artifacts';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityUnseenFeatureQueueReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_unseen_feature_queue',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      comparisonReports: args.comparisonReports,
      sourceSelectionReports: args.sourceSelectionReports,
    },
    assumptions: {
      consumesSavedComparisonAndSourceSelectionReportsOnly: true,
      queuesUnseenSourceSelectionReportsOnly: true,
      featureTag: FEATURE_TAG,
      noLiveScoringUsed: true,
      noSetupScannerRun: true,
      livePromotionAllowed: false,
    },
    summary: {
      comparisonReports: args.loadedComparisonReports.length,
      sourceSelectionReports: args.sourceSelectionReports.length,
      alreadyComparedSourceSelectionReports: alreadyCompared.size,
      queuedSourceSelectionReports: queueRows.length,
      livePromotionAllowedRows: 0,
      broadeningAllowedNow: false,
      recommendation,
    },
    queueRows,
    blockers,
    recommendations: recommendation === 'run_unseen_queue_comparison'
      ? ['Run the queued saved source-selection reports through the fresh feature comparison before generating new artifacts.']
      : recommendation === 'no_unseen_saved_artifacts'
        ? ['No unseen saved source-selection reports remain; the next larger validation requires newly generated research artifacts.']
        : ['Fix comparison/source-selection inputs before interpreting the unseen queue.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function writeReport(report: RawOhlcScannerArtifactOpeningDrivePriorityUnseenFeatureQueueReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-unseen-feature-queue-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, `${base}.md`), `${report.markdown}\n`, 'utf8');
  return jsonPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const options = parseRawOhlcScannerArtifactOpeningDrivePriorityUnseenFeatureQueueArgs();
  const comparisonReports = options.comparisonReports.length
    ? options.comparisonReports
    : matchingReportPaths(/^raw-ohlc-scanner-artifact-openingdrive-priority-fresh-feature-comparison-\d+\.json$/).slice(0, 1);
  const sourceSelectionReports = options.sourceSelectionReports.length
    ? options.sourceSelectionReports
    : matchingReportPaths(/^raw-ohlc-scanner-artifact-openingdrive-oos-source-installed-selection-\d+\.json$/);
  const loadedComparisonReports = comparisonReports.map((reportPath) => readJson<RawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureComparisonReport>(reportPath));
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityUnseenFeatureQueueReport({
    comparisonReports,
    loadedComparisonReports,
    sourceSelectionReports,
  });
  const jsonPath = writeReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ status: report.status, jsonPath, summary: report.summary, queueRows: report.queueRows, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nWrote ${jsonPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}
