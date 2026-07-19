import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowOutcomeJoinReport,
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowOutcomeJoinRow,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-outcome-join';

interface CliOptions {
  outcomeJoin: string;
  outDir: string;
  json: boolean;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowCoverageQueueRow {
  priority: number;
  tradeDate: string;
  sessionType: string;
  setupType: string;
  direction: string;
  selectorDecision: string;
  shadowRows: number;
  wouldChangePrimaryRows: number;
  sampleSnapshotIds: string[];
  replayQueueKey: string;
  recommendedAction: 'build_saved_outcome_replay_for_missing_key';
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowCoverageQueueReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_shadow_coverage_queue';
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
    outcomeJoinPath: string;
  };
  summary: {
    unmatchedGroupsQueued: number;
    unmatchedShadowRowsQueued: number;
    wouldChangePrimaryRowsQueued: number;
    keepLaterSweepProofGroups: number;
    preferReplacementGroups: number;
    topPriorityKey: string | null;
    recommendation: 'build_missing_outcome_replay_package' | 'no_missing_coverage' | 'fix_inputs';
  };
  rows: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowCoverageQueueRow[];
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
  const outcomeJoin = readFlag(args, '--outcome-join') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-outcome-join-\d+\.json$/);
  if (!outcomeJoin) throw new Error('--outcome-join is required.');
  return {
    outcomeJoin: path.resolve(outcomeJoin),
    outDir,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowCoverageQueueReport['authority'] {
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

function queueKey(row: Pick<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowOutcomeJoinRow, 'tradeDate' | 'sessionType' | 'setupType' | 'direction' | 'selectorDecision'>): string {
  return `${row.tradeDate}|${row.sessionType}|${row.setupType}|${row.direction}|${row.selectorDecision}`;
}

function queueRows(rows: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowOutcomeJoinRow[]): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowCoverageQueueRow[] {
  return rows
    .filter((row) => row.outcomeEvidenceCount === 0)
    .sort((a, b) =>
      b.shadowRows - a.shadowRows ||
      b.wouldChangePrimaryRows - a.wouldChangePrimaryRows ||
      a.tradeDate.localeCompare(b.tradeDate) ||
      a.sessionType.localeCompare(b.sessionType) ||
      a.setupType.localeCompare(b.setupType) ||
      a.direction.localeCompare(b.direction)
    )
    .map((row, index) => ({
      priority: index + 1,
      tradeDate: row.tradeDate,
      sessionType: row.sessionType,
      setupType: row.setupType,
      direction: row.direction,
      selectorDecision: row.selectorDecision,
      shadowRows: row.shadowRows,
      wouldChangePrimaryRows: row.wouldChangePrimaryRows,
      sampleSnapshotIds: row.sampleSnapshotIds,
      replayQueueKey: queueKey(row),
      recommendedAction: 'build_saved_outcome_replay_for_missing_key',
    }));
}

function buildMarkdown(
  report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowCoverageQueueReport, 'markdown'>,
): string {
  return [
    '# OpeningDrive Keep-Later-Proof Selector Shadow Coverage Queue',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only coverage queue. It consumes a saved outcome-join report only. It does not replay OHLC, install ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Unmatched groups queued: ${report.summary.unmatchedGroupsQueued}.`,
    `- Unmatched shadow rows queued: ${report.summary.unmatchedShadowRowsQueued}.`,
    `- Would-change-primary rows queued: ${report.summary.wouldChangePrimaryRowsQueued}.`,
    `- Keep-later Sweep proof groups: ${report.summary.keepLaterSweepProofGroups}.`,
    `- Prefer-replacement groups: ${report.summary.preferReplacementGroups}.`,
    `- Top priority key: ${report.summary.topPriorityKey ?? '-'}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Queue',
    '| Priority | Date | Session | Setup | Side | Selector | Shadow Rows | Would Change | Key |',
    '|---:|---|---|---|---|---|---:|---:|---|',
    ...report.rows.map((row) => `| ${row.priority} | ${row.tradeDate} | ${row.sessionType} | ${row.setupType} | ${row.direction} | ${row.selectorDecision} | ${row.shadowRows} | ${row.wouldChangePrimaryRows} | ${row.replayQueueKey} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowCoverageQueueReport(args: {
  outcomeJoinPath: string;
  outcomeJoin: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowOutcomeJoinReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowCoverageQueueReport {
  const sourceRows = args.outcomeJoin?.rows || [];
  const rows = queueRows(sourceRows);
  const blockers = [
    !args.outcomeJoin ? 'missing outcome join report' : null,
    args.outcomeJoin && args.outcomeJoin.status !== 'pass' ? `outcome join status ${args.outcomeJoin.status}` : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation = blockers.length
    ? 'fix_inputs'
    : rows.length
      ? 'build_missing_outcome_replay_package'
      : 'no_missing_coverage';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowCoverageQueueReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_shadow_coverage_queue',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      outcomeJoinPath: args.outcomeJoinPath,
    },
    summary: {
      unmatchedGroupsQueued: rows.length,
      unmatchedShadowRowsQueued: rows.reduce((sum, row) => sum + row.shadowRows, 0),
      wouldChangePrimaryRowsQueued: rows.reduce((sum, row) => sum + row.wouldChangePrimaryRows, 0),
      keepLaterSweepProofGroups: rows.filter((row) => row.selectorDecision === 'keep_later_sweep_proof').length,
      preferReplacementGroups: rows.filter((row) => row.selectorDecision === 'prefer_replacement').length,
      topPriorityKey: rows[0]?.replayQueueKey || null,
      recommendation,
    },
    rows,
    blockers,
    recommendations: recommendation === 'build_missing_outcome_replay_package'
      ? [
        'Build a saved-outcome replay package for these missing keys before any live-facing selector proposal.',
        'Prioritize largest shadow-row groups first, then groups with would-change-primary rows.',
      ]
      : recommendation === 'no_missing_coverage'
        ? ['Outcome coverage is complete for this shadow join; proceed to reviewed separator validation.']
        : ['Fix or regenerate the outcome join input before continuing.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowCoverageQueueReport(
  report: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowCoverageQueueReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-coverage-queue-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowCoverageQueueCli(args = process.argv.slice(2)): void {
  const options = parseArgs(args);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowCoverageQueueReport({
    outcomeJoinPath: options.outcomeJoin,
    outcomeJoin: fs.existsSync(options.outcomeJoin)
      ? readJson<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowOutcomeJoinReport>(options.outcomeJoin)
      : null,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowCoverageQueueReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowCoverageQueueCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
