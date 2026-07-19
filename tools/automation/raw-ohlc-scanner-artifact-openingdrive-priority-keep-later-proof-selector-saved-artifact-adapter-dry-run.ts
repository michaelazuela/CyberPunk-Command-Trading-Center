import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorAdapterContractReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-adapter-contract';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunComparisonReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-dry-run-comparison';

interface CliOptions {
  adapterContract: string;
  dryRunComparison: string;
  outDir: string;
  json: boolean;
}

interface AdapterDryRunRow {
  slateId: string;
  tradeDate: string;
  session: string;
  baselineTicketId: string | null;
  baselineSetupType: string | null;
  proposedTicketId: string | null;
  proposedSetupType: string | null;
  proposedSelectorDecision: string | null;
  adapterDecision: 'would_select_sweep_keep_later_proof' | 'no_change';
  adapterEligible: boolean;
  proposedOutcomeLabel: string | null;
  proposedOneMesPl: number | null;
  blockers: string[];
  shouldPost: false;
  publishDiscord: false;
  canExecuteChanged: false;
  livePromotionAllowed: false;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSavedArtifactAdapterDryRunReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_saved_artifact_adapter_dry_run';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorAdapterContractReport['authority'];
  source: {
    reportDir: string;
    adapterContractPath: string | null;
    dryRunComparisonPath: string | null;
  };
  assumptions: {
    savedArtifactsOnly: true;
    consumesAdapterContract: true;
    noRuntimeAdapterInstalled: true;
    noScannerVisibleSelectionInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    contractStatus: string | null;
    contractRecommendation: string | null;
    dryRunStatus: string | null;
    dryRunRecommendation: string | null;
    slatesLoaded: number;
    adapterRowsBuilt: number;
    changedRowsBuilt: number;
    noChangeRowsBuilt: number;
    eligibleAdapterRows: number;
    blockedAdapterRows: number;
    invalidProposedRows: number;
    nonSweepAdapterRows: number;
    missingOutcomeRows: number;
    changedRowsGrossResolvedOneMesPl: number | null;
    shouldPostRows: 0;
    publishDiscordRows: 0;
    canExecuteChangedRows: 0;
    livePromotionAllowedRows: 0;
    recommendation: 'saved_artifact_adapter_shape_passed_prepare_runtime_approval_checkpoint' | 'fix_inputs';
  };
  rows: AdapterDryRunRow[];
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
  const adapterContract = readFlag(args, '--adapter-contract') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-adapter-contract-\d+\.json$/);
  const dryRunComparison = readFlag(args, '--dry-run-comparison') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-dry-run-comparison-\d+\.json$/);
  if (!adapterContract) throw new Error('--adapter-contract is required.');
  if (!dryRunComparison) throw new Error('--dry-run-comparison is required.');
  return {
    adapterContract: path.resolve(adapterContract),
    dryRunComparison: path.resolve(dryRunComparison),
    outDir,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSavedArtifactAdapterDryRunReport['authority'] {
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

function buildRows(dryRunComparison: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunComparisonReport | null): AdapterDryRunRow[] {
  return (dryRunComparison?.slates || []).map((slate) => {
    const adapterDecision = slate.selectedCandidateChanged ? 'would_select_sweep_keep_later_proof' : 'no_change';
    const blockers = [
      slate.selectedCandidateChanged && slate.proposedSetupType !== 'SweepMssFvgRetrace' ? 'changed proposed row is not SweepMssFvgRetrace' : null,
      slate.selectedCandidateChanged && slate.proposedSelectorDecision !== 'keep_later_sweep_proof' ? 'changed proposed row is not keep_later_sweep_proof' : null,
      slate.selectedCandidateChanged && !slate.proposedStrictReadySourceProofPositive ? 'changed proposed row is not strict-ready/source-proof-positive' : null,
      slate.selectedCandidateChanged && !slate.proposedDeterministicLevelsValid ? 'changed proposed row has invalid deterministic levels' : null,
      slate.selectedCandidateChanged && slate.proposedOutcomeLabel === null ? 'changed proposed row is missing outcome evidence' : null,
      slate.livePromotionAllowed ? 'live promotion was allowed in saved dry-run slate' : null,
    ].filter((item): item is string => Boolean(item));
    return {
      slateId: slate.slateId,
      tradeDate: slate.tradeDate,
      session: slate.session,
      baselineTicketId: slate.baselineTicketId,
      baselineSetupType: slate.baselineSetupType,
      proposedTicketId: slate.proposedTicketId,
      proposedSetupType: slate.proposedSetupType,
      proposedSelectorDecision: slate.proposedSelectorDecision,
      adapterDecision,
      adapterEligible: slate.selectedCandidateChanged && blockers.length === 0,
      proposedOutcomeLabel: slate.proposedOutcomeLabel,
      proposedOneMesPl: slate.proposedOneMesPl,
      blockers,
      shouldPost: false,
      publishDiscord: false,
      canExecuteChanged: false,
      livePromotionAllowed: false,
    };
  });
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSavedArtifactAdapterDryRunReport, 'markdown'>): string {
  return [
    '# OpeningDrive Sweep Keep-Later-Proof Saved-Artifact Adapter Dry-Run',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only saved-artifact adapter dry-run. It does not install selector behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Contract status: ${report.summary.contractStatus ?? '-'}.`,
    `- Contract recommendation: ${report.summary.contractRecommendation ?? '-'}.`,
    `- Dry-run status: ${report.summary.dryRunStatus ?? '-'}.`,
    `- Dry-run recommendation: ${report.summary.dryRunRecommendation ?? '-'}.`,
    `- Slates loaded: ${report.summary.slatesLoaded}.`,
    `- Adapter rows built: ${report.summary.adapterRowsBuilt}.`,
    `- Changed rows built: ${report.summary.changedRowsBuilt}.`,
    `- Eligible adapter rows: ${report.summary.eligibleAdapterRows}.`,
    `- Blocked adapter rows: ${report.summary.blockedAdapterRows}.`,
    `- Non-Sweep adapter rows: ${report.summary.nonSweepAdapterRows}.`,
    `- Missing outcome rows: ${report.summary.missingOutcomeRows}.`,
    `- Changed rows gross one-MES P/L: ${report.summary.changedRowsGrossResolvedOneMesPl ?? '-'}.`,
    `- shouldPost rows: ${report.summary.shouldPostRows}.`,
    `- publishDiscord rows: ${report.summary.publishDiscordRows}.`,
    `- canExecute changed rows: ${report.summary.canExecuteChangedRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Changed Adapter Rows',
    '| Slate | Baseline | Proposed | Outcome | P/L | Status | Blockers |',
    '|---|---|---|---|---:|---|---|',
    ...report.rows
      .filter((row) => row.adapterDecision === 'would_select_sweep_keep_later_proof')
      .map((row) => `| ${row.slateId.replace(/\|/g, '/')} | ${row.baselineSetupType || '-'} | ${row.proposedSetupType || '-'} | ${row.proposedOutcomeLabel || '-'} | ${row.proposedOneMesPl ?? '-'} | ${row.adapterEligible ? 'eligible' : 'blocked'} | ${row.blockers.join(', ') || '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSavedArtifactAdapterDryRunReport(args: {
  adapterContractPath: string | null;
  adapterContract: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorAdapterContractReport | null;
  dryRunComparisonPath: string | null;
  dryRunComparison: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunComparisonReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSavedArtifactAdapterDryRunReport {
  const rows = buildRows(args.dryRunComparison);
  const changedRows = rows.filter((row) => row.adapterDecision === 'would_select_sweep_keep_later_proof');
  const blockedAdapterRows = changedRows.filter((row) => row.blockers.length > 0).length;
  const nonSweepAdapterRows = changedRows.filter((row) => row.proposedSetupType !== 'SweepMssFvgRetrace').length;
  const missingOutcomeRows = changedRows.filter((row) => row.proposedOutcomeLabel === null).length;
  const invalidProposedRows = changedRows.filter((row) => row.blockers.length > 0).length;
  const blockers = [
    !args.adapterContractPath ? 'missing adapter contract path' : null,
    !args.adapterContract ? 'missing adapter contract report' : null,
    args.adapterContract && args.adapterContract.status !== 'pass' ? `adapter contract status ${args.adapterContract.status}` : null,
    args.adapterContract && args.adapterContract.summary.recommendation !== 'draft_saved_artifact_adapter_dry_run_next' ? `adapter contract recommendation is ${args.adapterContract.summary.recommendation}` : null,
    args.adapterContract && args.adapterContract.assumptions.scannerVisibleInstallAllowedNow !== false ? 'adapter contract scanner-visible install is not locked off' : null,
    !args.dryRunComparisonPath ? 'missing dry-run comparison path' : null,
    !args.dryRunComparison ? 'missing dry-run comparison report' : null,
    args.dryRunComparison && args.dryRunComparison.status !== 'pass' ? `dry-run comparison status ${args.dryRunComparison.status}` : null,
    args.dryRunComparison && args.dryRunComparison.summary.recommendation !== 'dry_run_supports_sweep_only_guarded_selector_research' ? `dry-run comparison recommendation is ${args.dryRunComparison.summary.recommendation}` : null,
    changedRows.length === 0 ? 'no changed adapter rows were built' : null,
    blockedAdapterRows > 0 ? `${blockedAdapterRows} changed adapter rows are blocked` : null,
    nonSweepAdapterRows > 0 ? `${nonSweepAdapterRows} changed adapter rows are not SweepMssFvgRetrace` : null,
    missingOutcomeRows > 0 ? `${missingOutcomeRows} changed adapter rows are missing outcome evidence` : null,
    args.dryRunComparison && args.dryRunComparison.summary.shouldPostRows !== 0 ? `${args.dryRunComparison.summary.shouldPostRows} shouldPost rows in dry-run comparison` : null,
    args.dryRunComparison && args.dryRunComparison.summary.publishDiscordRows !== 0 ? `${args.dryRunComparison.summary.publishDiscordRows} publishDiscord rows in dry-run comparison` : null,
    args.dryRunComparison && args.dryRunComparison.summary.canExecuteChangedRows !== 0 ? `${args.dryRunComparison.summary.canExecuteChangedRows} canExecute changed rows in dry-run comparison` : null,
    args.dryRunComparison && args.dryRunComparison.summary.livePromotionAllowedRows !== 0 ? `${args.dryRunComparison.summary.livePromotionAllowedRows} live promotion rows in dry-run comparison` : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSavedArtifactAdapterDryRunReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_saved_artifact_adapter_dry_run',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: DEFAULT_REPORT_DIR,
      adapterContractPath: args.adapterContractPath,
      dryRunComparisonPath: args.dryRunComparisonPath,
    },
    assumptions: {
      savedArtifactsOnly: true,
      consumesAdapterContract: true,
      noRuntimeAdapterInstalled: true,
      noScannerVisibleSelectionInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      contractStatus: args.adapterContract?.status || null,
      contractRecommendation: args.adapterContract?.summary.recommendation || null,
      dryRunStatus: args.dryRunComparison?.status || null,
      dryRunRecommendation: args.dryRunComparison?.summary.recommendation || null,
      slatesLoaded: rows.length,
      adapterRowsBuilt: rows.length,
      changedRowsBuilt: changedRows.length,
      noChangeRowsBuilt: rows.length - changedRows.length,
      eligibleAdapterRows: changedRows.filter((row) => row.adapterEligible).length,
      blockedAdapterRows,
      invalidProposedRows,
      nonSweepAdapterRows,
      missingOutcomeRows,
      changedRowsGrossResolvedOneMesPl: args.dryRunComparison?.summary.changedRowsGrossResolvedOneMesPl ?? null,
      shouldPostRows: 0,
      publishDiscordRows: 0,
      canExecuteChangedRows: 0,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length ? 'fix_inputs' : 'saved_artifact_adapter_shape_passed_prepare_runtime_approval_checkpoint',
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved artifact adapter inputs before any runtime approval checkpoint.']
      : [
        'The saved-artifact adapter shape passed and remains research-only.',
        'Do not install runtime selector/ranking behavior from this report.',
        'Next phase may prepare a runtime approval checkpoint, but scanner-visible behavior still requires explicit approval.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSavedArtifactAdapterDryRunReport(
  report: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSavedArtifactAdapterDryRunReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-saved-artifact-adapter-dry-run-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSavedArtifactAdapterDryRunCli(args = process.argv.slice(2)): void {
  const options = parseArgs(args);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSavedArtifactAdapterDryRunReport({
    adapterContractPath: options.adapterContract,
    adapterContract: fs.existsSync(options.adapterContract)
      ? readJson<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorAdapterContractReport>(options.adapterContract)
      : null,
    dryRunComparisonPath: options.dryRunComparison,
    dryRunComparison: fs.existsSync(options.dryRunComparison)
      ? readJson<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorDryRunComparisonReport>(options.dryRunComparison)
      : null,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSavedArtifactAdapterDryRunReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSavedArtifactAdapterDryRunCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
