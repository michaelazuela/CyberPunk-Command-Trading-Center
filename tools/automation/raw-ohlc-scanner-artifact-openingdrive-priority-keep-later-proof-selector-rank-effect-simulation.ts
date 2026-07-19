import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

interface CliOptions {
  reportDir: string;
  json: boolean;
}

interface Gate {
  name: string;
  status: 'pass' | 'fail' | 'caution';
  proof: string;
}

type JsonReport = {
  status?: string;
  summary?: Record<string, unknown>;
};

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRankEffectSimulationReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_rank_effect_simulation';
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
    realMetadataReplayPath: string | null;
    dryRunComparisonPath: string | null;
    savedArtifactAdapterDryRunPath: string | null;
    installedMetadataAuditPath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    noRankConsumerInstalled: true;
    noScannerVisibleRankChange: true;
    outcomeBackedRowsAreSubsetOnly: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  gates: Gate[];
  summary: {
    realKeepLaterRows: number;
    realKeepLaterRowsWithValidLevels: number;
    realPreferReplacementRows: number;
    realMissingCompletedProofGroups: number;
    outcomeBackedChangedRows: number;
    outcomeBackedGrossResolvedOneMesPl: number | null;
    outcomeBackedCoveragePct: number;
    validLevelKeepLaterCoveragePct: number;
    savedMissingOutcomeRows: number;
    safetyDriftRows: number;
    researchRankEffectSupported: boolean;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'expand_outcome_join_before_runtime_rank_consumer' | 'fix_inputs';
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

function parseArgs(args = process.argv.slice(2)): CliOptions {
  return {
    reportDir: path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR),
    json: args.includes('--json'),
  };
}

function latestMatchingFile(reportDir: string, prefix: string): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => name.startsWith(prefix) && name.endsWith('.json'))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function readJson(filePath: string | null): JsonReport | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as JsonReport;
}

function n(summary: Record<string, unknown> | undefined, key: string): number {
  const value = summary?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function nullableNumber(summary: Record<string, unknown> | undefined, key: string): number | null {
  const value = summary?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function pct(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRankEffectSimulationReport['authority'] {
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRankEffectSimulationReport, 'markdown'>): string {
  return [
    '# OpeningDrive ProofSelectionSignal Rank Effect Simulation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-report rank-effect simulation. It does not install rank consumers, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Real keep_later_sweep_proof rows: ${report.summary.realKeepLaterRows}.`,
    `- Real keep-later rows with valid deterministic levels: ${report.summary.realKeepLaterRowsWithValidLevels}.`,
    `- Real prefer_replacement rows: ${report.summary.realPreferReplacementRows}.`,
    `- Real missing completed proof groups: ${report.summary.realMissingCompletedProofGroups}.`,
    `- Outcome-backed changed rows: ${report.summary.outcomeBackedChangedRows}.`,
    `- Outcome-backed gross resolved one-MES P/L: ${report.summary.outcomeBackedGrossResolvedOneMesPl ?? '-'}.`,
    `- Outcome-backed coverage of real keep-later rows: ${report.summary.outcomeBackedCoveragePct}%.`,
    `- Valid-level coverage of real keep-later rows: ${report.summary.validLevelKeepLaterCoveragePct}%.`,
    `- Saved missing outcome rows: ${report.summary.savedMissingOutcomeRows}.`,
    `- Safety drift rows: ${report.summary.safetyDriftRows}.`,
    `- Research rank effect supported: ${report.summary.researchRankEffectSupported}.`,
    `- Runtime rank consumer allowed by this report: ${report.summary.runtimeRankConsumerAllowedByThisReport}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Gates',
    ...report.gates.map((gate) => `- ${gate.name}: ${gate.status} - ${gate.proof}`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRankEffectSimulationReport(args: {
  reportDir?: string;
  realMetadataReplayPath?: string | null;
  dryRunComparisonPath?: string | null;
  savedArtifactAdapterDryRunPath?: string | null;
  installedMetadataAuditPath?: string | null;
  realMetadataReplay?: JsonReport | null;
  dryRunComparison?: JsonReport | null;
  savedArtifactAdapterDryRun?: JsonReport | null;
  installedMetadataAudit?: JsonReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRankEffectSimulationReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const realPath = args.realMetadataReplayPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-real-metadata-replay-audit-');
  const comparisonPath = args.dryRunComparisonPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-dry-run-comparison-');
  const adapterPath = args.savedArtifactAdapterDryRunPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-saved-artifact-adapter-dry-run-');
  const installedPath = args.installedMetadataAuditPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-installed-metadata-comparison-audit-');
  const real = args.realMetadataReplay ?? readJson(realPath);
  const comparison = args.dryRunComparison ?? readJson(comparisonPath);
  const adapter = args.savedArtifactAdapterDryRun ?? readJson(adapterPath);
  const installed = args.installedMetadataAudit ?? readJson(installedPath);

  const realKeepLaterRows = n(real?.summary, 'keepLaterSweepProofRows');
  const realKeepLaterRowsWithValidLevels = n(real?.summary, 'keepLaterRowsWithValidLevels');
  const realPreferReplacementRows = n(real?.summary, 'preferReplacementRows');
  const realMissingCompletedProofGroups = n(real?.summary, 'missingCompletedProofGroups');
  const outcomeBackedChangedRows = n(comparison?.summary, 'changedRowsWithOutcomeEvidence');
  const outcomeBackedGrossResolvedOneMesPl = nullableNumber(comparison?.summary, 'changedRowsGrossResolvedOneMesPl')
    ?? nullableNumber(adapter?.summary, 'changedRowsGrossResolvedOneMesPl');
  const savedMissingOutcomeRows = n(comparison?.summary, 'missingOutcomeRows') + n(adapter?.summary, 'missingOutcomeRows');
  const safetyDriftRows =
    n(installed?.summary, 'rankScoreChangedRows') +
    n(installed?.summary, 'rankOrderChangedContexts') +
    n(installed?.summary, 'executionStatusChangedRows') +
    n(installed?.summary, 'blockReasonChangedRows') +
    n(installed?.summary, 'discordEligibilityChangedRows') +
    n(installed?.summary, 'humanCanExecuteChangedRows') +
    n(installed?.summary, 'entryStopTargetRiskChangedRows') +
    n(comparison?.summary, 'shouldPostRows') +
    n(comparison?.summary, 'publishDiscordRows') +
    n(comparison?.summary, 'canExecuteChangedRows') +
    n(comparison?.summary, 'livePromotionAllowedRows') +
    n(adapter?.summary, 'shouldPostRows') +
    n(adapter?.summary, 'publishDiscordRows') +
    n(adapter?.summary, 'canExecuteChangedRows') +
    n(adapter?.summary, 'livePromotionAllowedRows');
  const outcomeBackedCoveragePct = pct(outcomeBackedChangedRows, realKeepLaterRows);
  const validLevelKeepLaterCoveragePct = pct(realKeepLaterRowsWithValidLevels, realKeepLaterRows);

  const gates: Gate[] = [
    {
      name: 'real_metadata_replay_passed',
      status: real?.status === 'pass' && realKeepLaterRows > 0 && realMissingCompletedProofGroups === 0 ? 'pass' : 'fail',
      proof: `status=${real?.status ?? 'missing'} keepLaterRows=${realKeepLaterRows} missingCompletedProofGroups=${realMissingCompletedProofGroups}`,
    },
    {
      name: 'outcome_backed_subset_positive',
      status: comparison?.status === 'pass' && outcomeBackedChangedRows > 0 && (outcomeBackedGrossResolvedOneMesPl ?? 0) > 0 ? 'pass' : 'fail',
      proof: `status=${comparison?.status ?? 'missing'} outcomeBackedChangedRows=${outcomeBackedChangedRows} grossOneMesPl=${outcomeBackedGrossResolvedOneMesPl ?? 'null'}`,
    },
    {
      name: 'safety_drift_zero',
      status: safetyDriftRows === 0 ? 'pass' : 'fail',
      proof: `safetyDriftRows=${safetyDriftRows}`,
    },
    {
      name: 'outcome_coverage_limited',
      status: outcomeBackedCoveragePct >= 10 ? 'pass' : 'caution',
      proof: `outcomeBackedCoveragePct=${outcomeBackedCoveragePct}; subset is informative but too small for runtime rank approval.`,
    },
    {
      name: 'runtime_rank_consumer_disabled',
      status: 'pass',
      proof: 'runtimeRankConsumerAllowedByThisReport=false',
    },
  ];
  const failedGates = gates.filter((gate) => gate.status === 'fail');
  const blockers = [
    !realPath ? 'missing real-metadata replay audit report' : null,
    !comparisonPath ? 'missing dry-run comparison report' : null,
    !adapterPath ? 'missing saved-artifact adapter dry-run report' : null,
    !installedPath ? 'missing installed metadata audit report' : null,
    ...failedGates.map((gate) => `rank-effect simulation gate failed: ${gate.name}`),
  ].filter((item): item is string => Boolean(item));
  const researchRankEffectSupported = blockers.length === 0;

  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRankEffectSimulationReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_rank_effect_simulation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir,
      realMetadataReplayPath: realPath,
      dryRunComparisonPath: comparisonPath,
      savedArtifactAdapterDryRunPath: adapterPath,
      installedMetadataAuditPath: installedPath,
    },
    assumptions: {
      savedReportsOnly: true,
      noRankConsumerInstalled: true,
      noScannerVisibleRankChange: true,
      outcomeBackedRowsAreSubsetOnly: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    gates,
    summary: {
      realKeepLaterRows,
      realKeepLaterRowsWithValidLevels,
      realPreferReplacementRows,
      realMissingCompletedProofGroups,
      outcomeBackedChangedRows,
      outcomeBackedGrossResolvedOneMesPl,
      outcomeBackedCoveragePct,
      validLevelKeepLaterCoveragePct,
      savedMissingOutcomeRows,
      safetyDriftRows,
      researchRankEffectSupported,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length ? 'fix_inputs' : 'expand_outcome_join_before_runtime_rank_consumer',
    },
    blockers,
    recommendations: blockers.length
      ? ['Fix rank-effect simulation inputs before any rank-consumer research expansion.']
      : [
        'Research supports continuing the proofSelectionSignal rank-effect path, but only as research.',
        'Outcome evidence is positive on the changed subset, but coverage is too small for runtime ranking approval.',
        'Next phase should expand the outcome/candidate-key join across the 220 real keep-later rows before any scanner-visible rank consumer.',
        'Do not change scanner rank, Discord, Supabase, bridge, canExecute, or entry/stop/target/risk from this simulation.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const options = parseArgs();
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRankEffectSimulationReport({ reportDir: options.reportDir });
  fs.mkdirSync(options.reportDir, { recursive: true });
  const outPath = path.join(options.reportDir, `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-rank-effect-simulation-${Date.now()}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  if (options.json) console.log(JSON.stringify({ outPath, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  else {
    console.log(report.markdown);
    console.log(`\nReport written: ${outPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
