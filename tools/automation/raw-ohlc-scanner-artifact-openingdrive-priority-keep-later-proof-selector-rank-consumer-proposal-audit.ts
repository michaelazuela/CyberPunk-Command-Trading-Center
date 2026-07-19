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

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRankConsumerProposalAuditReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_rank_consumer_proposal_audit';
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
    realArtifactCollisionMinerPath: string | null;
    installedMetadataAuditPath: string | null;
    savedArtifactAdapterDryRunPath: string | null;
    dryRunComparisonPath: string | null;
  };
  assumptions: {
    proposalAuditOnly: true;
    noRankConsumerInstalled: true;
    noScannerVisibleRankChange: true;
    runtimeRankConsumerAllowedByThisReport: false;
    consumesSavedReportsOnly: true;
  };
  gates: Gate[];
  summary: {
    realOpeningDriveSweepGroups: number;
    realAfterLunchSweepGroups: number;
    installedSignalRows: number;
    installedKeepLaterRows: number;
    savedEligibleAdapterRows: number;
    savedChangedRowsGrossResolvedOneMesPl: number | null;
    savedMissingOutcomeRows: number;
    safetyDriftRows: number;
    researchRankConsumerSupported: boolean;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'build_real_metadata_replay_before_runtime_rank_consumer' | 'fix_inputs';
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

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRankConsumerProposalAuditReport['authority'] {
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRankConsumerProposalAuditReport, 'markdown'>): string {
  return [
    '# OpeningDrive ProofSelectionSignal Rank Consumer Proposal Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only proposal audit over saved reports. It does not install ranking behavior, change scanner behavior, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Real OpeningDrive + Sweep groups: ${report.summary.realOpeningDriveSweepGroups}.`,
    `- Real AfterLunch + Sweep groups: ${report.summary.realAfterLunchSweepGroups}.`,
    `- Installed signal rows in audit: ${report.summary.installedSignalRows}.`,
    `- Installed keep_later rows in audit: ${report.summary.installedKeepLaterRows}.`,
    `- Saved eligible adapter rows: ${report.summary.savedEligibleAdapterRows}.`,
    `- Saved changed rows gross one-MES P/L: ${report.summary.savedChangedRowsGrossResolvedOneMesPl ?? '-'}.`,
    `- Saved missing outcome rows: ${report.summary.savedMissingOutcomeRows}.`,
    `- Safety drift rows: ${report.summary.safetyDriftRows}.`,
    `- Research rank consumer supported: ${report.summary.researchRankConsumerSupported}.`,
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

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRankConsumerProposalAuditReport(args: {
  reportDir?: string;
  realArtifactCollisionMinerPath?: string | null;
  installedMetadataAuditPath?: string | null;
  savedArtifactAdapterDryRunPath?: string | null;
  dryRunComparisonPath?: string | null;
  realArtifactCollisionMiner?: JsonReport | null;
  installedMetadataAudit?: JsonReport | null;
  savedArtifactAdapterDryRun?: JsonReport | null;
  dryRunComparison?: JsonReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRankConsumerProposalAuditReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const realPath = args.realArtifactCollisionMinerPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-real-artifact-collision-miner-');
  const installedPath = args.installedMetadataAuditPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-installed-metadata-comparison-audit-');
  const adapterPath = args.savedArtifactAdapterDryRunPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-saved-artifact-adapter-dry-run-');
  const comparisonPath = args.dryRunComparisonPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-dry-run-comparison-');
  const real = args.realArtifactCollisionMiner ?? readJson(realPath);
  const installed = args.installedMetadataAudit ?? readJson(installedPath);
  const adapter = args.savedArtifactAdapterDryRun ?? readJson(adapterPath);
  const comparison = args.dryRunComparison ?? readJson(comparisonPath);
  const realOpeningDriveSweepGroups = n(real?.summary, 'openingDriveSweepGroups');
  const realAfterLunchSweepGroups = n(real?.summary, 'afterLunchSweepGroups');
  const installedSignalRows = n(installed?.summary, 'signalInstalledRows');
  const installedKeepLaterRows = n(installed?.summary, 'keepLaterSweepProofRows');
  const savedEligibleAdapterRows = n(adapter?.summary, 'eligibleAdapterRows');
  const savedChangedRowsGrossResolvedOneMesPl = nullableNumber(adapter?.summary, 'changedRowsGrossResolvedOneMesPl');
  const savedMissingOutcomeRows = n(adapter?.summary, 'missingOutcomeRows') + n(comparison?.summary, 'missingOutcomeRows');
  const safetyDriftRows =
    n(installed?.summary, 'rankScoreChangedRows') +
    n(installed?.summary, 'rankOrderChangedContexts') +
    n(installed?.summary, 'executionStatusChangedRows') +
    n(installed?.summary, 'blockReasonChangedRows') +
    n(installed?.summary, 'discordEligibilityChangedRows') +
    n(installed?.summary, 'humanCanExecuteChangedRows') +
    n(installed?.summary, 'entryStopTargetRiskChangedRows') +
    n(adapter?.summary, 'shouldPostRows') +
    n(adapter?.summary, 'publishDiscordRows') +
    n(adapter?.summary, 'canExecuteChangedRows') +
    n(adapter?.summary, 'livePromotionAllowedRows') +
    n(comparison?.summary, 'shouldPostRows') +
    n(comparison?.summary, 'publishDiscordRows') +
    n(comparison?.summary, 'canExecuteChangedRows') +
    n(comparison?.summary, 'livePromotionAllowedRows');
  const gates: Gate[] = [
    {
      name: 'real_artifact_collision_coverage',
      status: real?.status === 'pass' && realOpeningDriveSweepGroups > 0 ? 'pass' : 'fail',
      proof: `status=${real?.status ?? 'missing'} openingDriveSweepGroups=${realOpeningDriveSweepGroups} afterLunchSweepGroups=${realAfterLunchSweepGroups}`,
    },
    {
      name: 'installed_metadata_inert',
      status: installed?.status === 'pass' && installedSignalRows > 0 && safetyDriftRows === 0 ? 'pass' : 'fail',
      proof: `status=${installed?.status ?? 'missing'} signalRows=${installedSignalRows} safetyDriftRows=${safetyDriftRows}`,
    },
    {
      name: 'saved_adapter_positive_evidence',
      status: adapter?.status === 'pass' && savedEligibleAdapterRows > 0 && (savedChangedRowsGrossResolvedOneMesPl ?? 0) > 0 ? 'pass' : 'fail',
      proof: `status=${adapter?.status ?? 'missing'} eligibleRows=${savedEligibleAdapterRows} grossOneMesPl=${savedChangedRowsGrossResolvedOneMesPl ?? 'null'}`,
    },
    {
      name: 'outcome_completeness',
      status: savedMissingOutcomeRows === 0 ? 'pass' : 'fail',
      proof: `savedMissingOutcomeRows=${savedMissingOutcomeRows}`,
    },
    {
      name: 'runtime_rank_consumer_readiness',
      status: installedKeepLaterRows > 0 ? 'pass' : 'caution',
      proof: `installedKeepLaterRows=${installedKeepLaterRows}; current installed synthetic audit did not prove natural keep-later rows in scanner output.`,
    },
  ];
  const failedGates = gates.filter((gate) => gate.status === 'fail');
  const blockers = [
    !realPath ? 'missing real-artifact collision miner report' : null,
    !installedPath ? 'missing installed metadata audit report' : null,
    !adapterPath ? 'missing saved-artifact adapter dry-run report' : null,
    !comparisonPath ? 'missing dry-run comparison report' : null,
    ...failedGates.map((gate) => `proposal gate failed: ${gate.name}`),
  ].filter((item): item is string => Boolean(item));
  const researchRankConsumerSupported = blockers.length === 0;
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRankConsumerProposalAuditReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_rank_consumer_proposal_audit',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir,
      realArtifactCollisionMinerPath: realPath,
      installedMetadataAuditPath: installedPath,
      savedArtifactAdapterDryRunPath: adapterPath,
      dryRunComparisonPath: comparisonPath,
    },
    assumptions: {
      proposalAuditOnly: true,
      noRankConsumerInstalled: true,
      noScannerVisibleRankChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
      consumesSavedReportsOnly: true,
    },
    gates,
    summary: {
      realOpeningDriveSweepGroups,
      realAfterLunchSweepGroups,
      installedSignalRows,
      installedKeepLaterRows,
      savedEligibleAdapterRows,
      savedChangedRowsGrossResolvedOneMesPl,
      savedMissingOutcomeRows,
      safetyDriftRows,
      researchRankConsumerSupported,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length ? 'fix_inputs' : 'build_real_metadata_replay_before_runtime_rank_consumer',
    },
    blockers,
    recommendations: blockers.length
      ? ['Fix proposal audit inputs before any rank-consumer research expansion.']
      : [
        'Research supports continuing, but not installing, a proofSelectionSignal rank consumer.',
        'Next phase should run a real-metadata replay where saved real-artifact keep-later groups are reconstructed through current scanner metadata, not synthetic contexts.',
        'Do not change scanner rank, Discord, Supabase, bridge, canExecute, or entry/stop/target/risk from this proposal audit.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const options = parseArgs();
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRankConsumerProposalAuditReport({ reportDir: options.reportDir });
  fs.mkdirSync(options.reportDir, { recursive: true });
  const outPath = path.join(options.reportDir, `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-rank-consumer-proposal-audit-${Date.now()}.json`);
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
