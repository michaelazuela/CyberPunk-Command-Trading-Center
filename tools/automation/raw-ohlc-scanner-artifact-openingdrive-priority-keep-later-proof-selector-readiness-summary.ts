import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport,
} from './unified-positive-held-local-preview-replay-package-outcome';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictBlockerDrilldownReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-missing-strict-blocker-drilldown';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingLevelGenerationPathDiagnosticReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-missing-level-generation-path-diagnostic';

interface CliOptions {
  outcome: string;
  blockerDrilldown: string;
  levelPathDiagnostic: string;
  outDir: string;
  json: boolean;
}

interface ModelReadinessRow {
  setupType: string;
  replayRows: number;
  resolvedRows: number;
  unresolvedRows: number;
  grossResolvedOneMesPl: number | null;
  blockedRows: number;
  waitingForEntryTriggerRows: number;
  invalidatedRows: number;
  evidenceState: 'positive_strict_ready_subset' | 'weak_or_mixed_subset' | 'insufficient_replay_coverage';
  readinessConclusion: string;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorReadinessSummaryReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_readiness_summary';
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
    reportDir: string;
    outcomePath: string | null;
    blockerDrilldownPath: string | null;
    levelPathDiagnosticPath: string | null;
  };
  assumptions: {
    combinesSavedResearchReportsOnly: true;
    noLiveSelectorInstalled: true;
    blockedRowsAreExcludedFromPerformance: true;
    livePromotionAllowed: false;
  };
  summary: {
    strictReadyReplayRows: number;
    strictReadyResolvedRows: number;
    strictReadyUnresolvedRows: number;
    strictReadyGrossOneMesPl: number | null;
    blockedRowsExcluded: number;
    waitingForEntryTriggerRows: number;
    invalidatedRows: number;
    livePromotionAllowedRows: 0;
    recommendation:
      | 'continue_research_no_live_selector'
      | 'prepare_sweep_only_guarded_proposal'
      | 'fix_inputs';
  };
  modelRows: ModelReadinessRow[];
  conclusions: string[];
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
  const outcome = readFlag(args, '--outcome') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-replay-package-outcome-\d+\.json$/);
  const blockerDrilldown = readFlag(args, '--blocker-drilldown') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-missing-strict-blocker-drilldown-\d+\.json$/);
  const levelPathDiagnostic = readFlag(args, '--level-path-diagnostic') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-missing-level-generation-path-diagnostic-\d+\.json$/);
  if (!outcome) throw new Error('--outcome is required.');
  if (!blockerDrilldown) throw new Error('--blocker-drilldown is required.');
  if (!levelPathDiagnostic) throw new Error('--level-path-diagnostic is required.');
  return {
    outcome: path.resolve(outcome),
    blockerDrilldown: path.resolve(blockerDrilldown),
    levelPathDiagnostic: path.resolve(levelPathDiagnostic),
    outDir,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorReadinessSummaryReport['authority'] {
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

function modelRows(args: {
  outcome: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport | null;
  blockerDrilldown: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictBlockerDrilldownReport | null;
  levelPathDiagnostic: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingLevelGenerationPathDiagnosticReport | null;
}): ModelReadinessRow[] {
  const setupTypes = new Set<string>();
  for (const row of args.outcome?.summary.modelGroups || []) setupTypes.add(row.setupType);
  for (const row of args.blockerDrilldown?.rows || []) setupTypes.add(row.setupType);
  return [...setupTypes].sort().map((setupType) => {
    const outcomeGroup = args.outcome?.summary.modelGroups.find((row) => row.setupType === setupType);
    const blockedRows = (args.blockerDrilldown?.rows || []).filter((row) => row.setupType === setupType).length;
    const levelRows = (args.levelPathDiagnostic?.rows || []).filter((row) => row.setupType === setupType);
    const waitingForEntryTriggerRows = levelRows.filter((row) => row.pathState === 'waiting_for_entry_trigger').length;
    const invalidatedRows = levelRows.filter((row) => row.pathState === 'invalidated_without_replayable_entry').length;
    const replayRows = outcomeGroup?.rows || 0;
    const grossResolvedOneMesPl = outcomeGroup?.grossResolvedOneMesPl ?? null;
    const evidenceState: ModelReadinessRow['evidenceState'] = replayRows < 3
      ? 'insufficient_replay_coverage'
      : grossResolvedOneMesPl !== null && grossResolvedOneMesPl > 0
        ? 'positive_strict_ready_subset'
        : 'weak_or_mixed_subset';
    return {
      setupType,
      replayRows,
      resolvedRows: outcomeGroup?.resolvedRows || 0,
      unresolvedRows: outcomeGroup?.unresolvedRows || 0,
      grossResolvedOneMesPl,
      blockedRows,
      waitingForEntryTriggerRows,
      invalidatedRows,
      evidenceState,
      readinessConclusion: evidenceState === 'positive_strict_ready_subset'
        ? 'Strict-ready subset is positive, but blocked/no-entry rows remain excluded from ranking evidence.'
        : evidenceState === 'weak_or_mixed_subset'
          ? 'Strict-ready subset is weak or mixed; do not remove the model from this evidence alone.'
          : 'Replay coverage is too small for selector readiness.',
    };
  });
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorReadinessSummaryReport, 'markdown'>): string {
  return [
    '# OpeningDrive Keep-Later-Proof Selector Readiness Summary',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only selector-readiness summary. It combines saved research reports only and does not install selector behavior, post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Strict-ready replay rows: ${report.summary.strictReadyReplayRows}.`,
    `- Strict-ready resolved rows: ${report.summary.strictReadyResolvedRows}.`,
    `- Strict-ready unresolved rows: ${report.summary.strictReadyUnresolvedRows}.`,
    `- Strict-ready gross one-MES P/L: ${report.summary.strictReadyGrossOneMesPl ?? 'not available'}.`,
    `- Blocked rows excluded: ${report.summary.blockedRowsExcluded}.`,
    `- Waiting-for-entry-trigger rows: ${report.summary.waitingForEntryTriggerRows}.`,
    `- Invalidated rows: ${report.summary.invalidatedRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Models',
    '| Setup | Replay Rows | Resolved | Unresolved | P/L | Blocked Excluded | Waiting Entry | Invalidated | Evidence |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---|',
    ...report.modelRows.map((row) => `| ${row.setupType} | ${row.replayRows} | ${row.resolvedRows} | ${row.unresolvedRows} | ${row.grossResolvedOneMesPl ?? '-'} | ${row.blockedRows} | ${row.waitingForEntryTriggerRows} | ${row.invalidatedRows} | ${row.evidenceState} |`),
    '',
    '## Conclusions',
    ...report.conclusions.map((item) => `- ${item}`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorReadinessSummaryReport(args: {
  outcomePath: string | null;
  outcome: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport | null;
  blockerDrilldownPath: string | null;
  blockerDrilldown: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictBlockerDrilldownReport | null;
  levelPathDiagnosticPath: string | null;
  levelPathDiagnostic: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingLevelGenerationPathDiagnosticReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorReadinessSummaryReport {
  const blockers = [
    !args.outcomePath ? 'missing outcome path' : null,
    !args.outcome ? 'missing outcome report' : null,
    args.outcome && args.outcome.status !== 'pass' ? `outcome status ${args.outcome.status}` : null,
    !args.blockerDrilldownPath ? 'missing blocker drilldown path' : null,
    !args.blockerDrilldown ? 'missing blocker drilldown report' : null,
    args.blockerDrilldown && args.blockerDrilldown.status !== 'pass' ? `blocker drilldown status ${args.blockerDrilldown.status}` : null,
    !args.levelPathDiagnosticPath ? 'missing level path diagnostic path' : null,
    !args.levelPathDiagnostic ? 'missing level path diagnostic report' : null,
    args.levelPathDiagnostic && args.levelPathDiagnostic.status !== 'pass' ? `level path diagnostic status ${args.levelPathDiagnostic.status}` : null,
  ].filter((item): item is string => Boolean(item));
  const rows = modelRows(args);
  const summary = args.outcome?.summary;
  const blockedRowsExcluded = args.blockerDrilldown?.summary.blockedRows || 0;
  const waitingForEntryTriggerRows = args.levelPathDiagnostic?.summary.waitingForEntryTriggerRows || 0;
  const invalidatedRows = args.levelPathDiagnostic?.summary.invalidatedWithoutReplayableEntryRows || 0;
  const sweep = rows.find((row) => row.setupType === 'SweepMssFvgRetrace');
  const recommendation = blockers.length ? 'fix_inputs'
    : sweep?.evidenceState === 'positive_strict_ready_subset' && blockedRowsExcluded === 0 ? 'prepare_sweep_only_guarded_proposal'
      : 'continue_research_no_live_selector';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorReadinessSummaryReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_readiness_summary',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: DEFAULT_REPORT_DIR,
      outcomePath: args.outcomePath,
      blockerDrilldownPath: args.blockerDrilldownPath,
      levelPathDiagnosticPath: args.levelPathDiagnosticPath,
    },
    assumptions: {
      combinesSavedResearchReportsOnly: true,
      noLiveSelectorInstalled: true,
      blockedRowsAreExcludedFromPerformance: true,
      livePromotionAllowed: false,
    },
    summary: {
      strictReadyReplayRows: summary?.packageRows || 0,
      strictReadyResolvedRows: summary?.resolvedRows || 0,
      strictReadyUnresolvedRows: summary?.unresolvedRows || 0,
      strictReadyGrossOneMesPl: summary?.grossResolvedOneMesPl ?? null,
      blockedRowsExcluded,
      waitingForEntryTriggerRows,
      invalidatedRows,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    modelRows: rows,
    conclusions: [
      'SweepMssFvgRetrace strict-ready evidence is positive in this package, but blocked placeholder/no-chase rows remain excluded.',
      'raidReclaim strict-ready evidence is weak in this package, but the blocked raidReclaim row is waiting for fresh entry and is not removal proof.',
      'No scanner-visible selector, model removal, canExecute change, or entry/stop/target/risk change is supported by this summary alone.',
    ],
    blockers,
    recommendations: blockers.length
      ? ['Fix source report inputs before using selector-readiness summary.']
      : ['Continue research-only selector validation; do not install live selector behavior while blocked/no-entry rows remain unresolved.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorReadinessSummaryReport(
  report: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorReadinessSummaryReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-readiness-summary-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorReadinessSummaryCli(args = process.argv.slice(2)): void {
  const options = parseArgs(args);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorReadinessSummaryReport({
    outcomePath: options.outcome,
    outcome: fs.existsSync(options.outcome) ? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport>(options.outcome) : null,
    blockerDrilldownPath: options.blockerDrilldown,
    blockerDrilldown: fs.existsSync(options.blockerDrilldown) ? readJson<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingStrictBlockerDrilldownReport>(options.blockerDrilldown) : null,
    levelPathDiagnosticPath: options.levelPathDiagnostic,
    levelPathDiagnostic: fs.existsSync(options.levelPathDiagnostic) ? readJson<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingLevelGenerationPathDiagnosticReport>(options.levelPathDiagnostic) : null,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorReadinessSummaryReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, modelRows: report.modelRows }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorReadinessSummaryCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
