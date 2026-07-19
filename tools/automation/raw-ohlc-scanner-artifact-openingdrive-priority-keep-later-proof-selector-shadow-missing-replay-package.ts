import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowCoverageQueueReport,
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowCoverageQueueRow,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-coverage-queue';

interface CliOptions {
  coverageQueue: string;
  limit: number;
  outDir: string;
  json: boolean;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingReplayPackageRow {
  packagePriority: number;
  replayQueueKey: string;
  tradeDate: string;
  sessionType: string;
  setupType: string;
  direction: string;
  selectorDecision: string;
  shadowRows: number;
  wouldChangePrimaryRows: number;
  sampleSnapshotIds: string[];
  replayIntent: 'resolve_missing_shadow_outcome_coverage';
  outcomeReplayStatus: 'queued_for_saved_report_replay';
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingReplayPackageReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_shadow_missing_replay_package';
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
    coverageQueuePath: string;
    requestedLimit: number;
  };
  summary: {
    packageRows: number;
    packagedShadowRows: number;
    packagedWouldChangePrimaryRows: number;
    keepLaterSweepProofRows: number;
    preferReplacementRows: number;
    topReplayQueueKey: string | null;
    recommendation: 'run_saved_outcome_replay_for_package' | 'no_rows_to_package' | 'fix_inputs';
  };
  rows: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingReplayPackageRow[];
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

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function parseArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = path.resolve(readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR);
  const coverageQueue = readFlag(args, '--coverage-queue') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-coverage-queue-\d+\.json$/);
  const limit = Number(readFlag(args, '--limit') || 10);
  if (!coverageQueue) throw new Error('--coverage-queue is required.');
  if (!Number.isInteger(limit) || limit <= 0) throw new Error('--limit must be a positive integer.');
  return {
    coverageQueue: path.resolve(coverageQueue),
    limit,
    outDir,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingReplayPackageReport['authority'] {
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

function packageRows(rows: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowCoverageQueueRow[], limit: number): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingReplayPackageRow[] {
  return rows.slice(0, limit).map((row, index) => ({
    packagePriority: index + 1,
    replayQueueKey: row.replayQueueKey,
    tradeDate: row.tradeDate,
    sessionType: row.sessionType,
    setupType: row.setupType,
    direction: row.direction,
    selectorDecision: row.selectorDecision,
    shadowRows: row.shadowRows,
    wouldChangePrimaryRows: row.wouldChangePrimaryRows,
    sampleSnapshotIds: row.sampleSnapshotIds,
    replayIntent: 'resolve_missing_shadow_outcome_coverage',
    outcomeReplayStatus: 'queued_for_saved_report_replay',
  }));
}

function buildMarkdown(
  report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingReplayPackageReport, 'markdown'>,
): string {
  return [
    '# OpeningDrive Keep-Later-Proof Selector Shadow Missing Replay Package',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only missing replay package. It consumes a saved coverage queue only. It does not replay OHLC yet, install ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Package rows: ${report.summary.packageRows}.`,
    `- Packaged shadow rows: ${report.summary.packagedShadowRows}.`,
    `- Packaged would-change-primary rows: ${report.summary.packagedWouldChangePrimaryRows}.`,
    `- Keep-later Sweep proof rows: ${report.summary.keepLaterSweepProofRows}.`,
    `- Prefer-replacement rows: ${report.summary.preferReplacementRows}.`,
    `- Top replay queue key: ${report.summary.topReplayQueueKey ?? '-'}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Package Rows',
    '| Priority | Key | Shadow Rows | Would Change | Samples |',
    '|---:|---|---:|---:|---|',
    ...report.rows.map((row) => `| ${row.packagePriority} | ${row.replayQueueKey} | ${row.shadowRows} | ${row.wouldChangePrimaryRows} | ${row.sampleSnapshotIds.join(', ')} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingReplayPackageReport(args: {
  coverageQueuePath: string;
  coverageQueue: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowCoverageQueueReport | null;
  limit: number;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingReplayPackageReport {
  const rows = packageRows(args.coverageQueue?.rows || [], args.limit);
  const blockers = [
    !args.coverageQueue ? 'missing coverage queue report' : null,
    args.coverageQueue && args.coverageQueue.status !== 'pass' ? `coverage queue status ${args.coverageQueue.status}` : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation = blockers.length ? 'fix_inputs' : rows.length ? 'run_saved_outcome_replay_for_package' : 'no_rows_to_package';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingReplayPackageReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_shadow_missing_replay_package',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      coverageQueuePath: args.coverageQueuePath,
      requestedLimit: args.limit,
    },
    summary: {
      packageRows: rows.length,
      packagedShadowRows: rows.reduce((sum, row) => sum + row.shadowRows, 0),
      packagedWouldChangePrimaryRows: rows.reduce((sum, row) => sum + row.wouldChangePrimaryRows, 0),
      keepLaterSweepProofRows: rows.filter((row) => row.selectorDecision === 'keep_later_sweep_proof').length,
      preferReplacementRows: rows.filter((row) => row.selectorDecision === 'prefer_replacement').length,
      topReplayQueueKey: rows[0]?.replayQueueKey || null,
      recommendation,
    },
    rows,
    blockers,
    recommendations: recommendation === 'run_saved_outcome_replay_for_package'
      ? [
        'Run saved-report outcome replay for these packaged missing keys next.',
        'Keep package research-only and do not treat queued rows as wins or losses until replay resolves them.',
      ]
      : recommendation === 'no_rows_to_package'
        ? ['No missing rows remain in this coverage queue.']
        : ['Fix or regenerate the coverage queue input before continuing.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingReplayPackageReport(
  report: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingReplayPackageReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-missing-replay-package-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingReplayPackageCli(args = process.argv.slice(2)): void {
  const options = parseArgs(args);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingReplayPackageReport({
    coverageQueuePath: options.coverageQueue,
    coverageQueue: fs.existsSync(options.coverageQueue)
      ? readJson<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowCoverageQueueReport>(options.coverageQueue)
      : null,
    limit: options.limit,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingReplayPackageReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingReplayPackageCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
