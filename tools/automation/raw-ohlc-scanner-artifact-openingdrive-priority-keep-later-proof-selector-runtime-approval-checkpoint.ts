import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSavedArtifactAdapterDryRunReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-saved-artifact-adapter-dry-run';

interface CliOptions {
  savedArtifactAdapterDryRun: string;
  outDir: string;
  json: boolean;
}

interface ApprovalGate {
  name: string;
  required: boolean;
  status: 'pass' | 'fail';
  proof: string;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeApprovalCheckpointReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_runtime_approval_checkpoint';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSavedArtifactAdapterDryRunReport['authority'];
  source: {
    reportDir: string;
    savedArtifactAdapterDryRunPath: string | null;
  };
  assumptions: {
    checkpointOnly: true;
    noRuntimeChangeInstalled: true;
    scannerVisibleInstallAllowedByThisReport: false;
    requiresExplicitRuntimeApproval: true;
    livePromotionAllowed: false;
  };
  proposedRuntimeScope: {
    modelScope: 'SweepMssFvgRetrace';
    selectorScope: 'keep_later_sweep_proof_only';
    likelyFilesToModify: string[];
    filesExplicitlyOutOfScope: string[];
    allowedBehaviorChange: string;
    forbiddenBehaviorChanges: string[];
    rollbackPath: string[];
  };
  approvalCheckpoint: {
    name: 'openingdrive_sweep_keep_later_proof_runtime_approval_checkpoint';
    gates: ApprovalGate[];
    requiredRegressionCommands: string[];
  };
  summary: {
    savedArtifactAdapterStatus: string | null;
    savedArtifactAdapterRecommendation: string | null;
    changedRowsBuilt: number;
    eligibleAdapterRows: number;
    blockedAdapterRows: number;
    nonSweepAdapterRows: number;
    missingOutcomeRows: number;
    changedRowsGrossResolvedOneMesPl: number | null;
    livePromotionAllowedRows: 0;
    runtimeInstallReadyForExplicitApproval: boolean;
    runtimeInstallAllowedByThisReport: false;
    recommendation: 'request_explicit_runtime_install_approval_or_continue_research' | 'fix_inputs';
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

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function parseArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = path.resolve(readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR);
  const savedArtifactAdapterDryRun = readFlag(args, '--saved-artifact-adapter-dry-run') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-saved-artifact-adapter-dry-run-\d+\.json$/);
  if (!savedArtifactAdapterDryRun) throw new Error('--saved-artifact-adapter-dry-run is required.');
  return {
    savedArtifactAdapterDryRun: path.resolve(savedArtifactAdapterDryRun),
    outDir,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeApprovalCheckpointReport['authority'] {
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeApprovalCheckpointReport, 'markdown'>): string {
  return [
    '# OpeningDrive Sweep Keep-Later-Proof Runtime Approval Checkpoint',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only approval checkpoint. It does not install selector behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Saved-artifact adapter status: ${report.summary.savedArtifactAdapterStatus ?? '-'}.`,
    `- Saved-artifact adapter recommendation: ${report.summary.savedArtifactAdapterRecommendation ?? '-'}.`,
    `- Changed rows built: ${report.summary.changedRowsBuilt}.`,
    `- Eligible adapter rows: ${report.summary.eligibleAdapterRows}.`,
    `- Blocked adapter rows: ${report.summary.blockedAdapterRows}.`,
    `- Non-Sweep adapter rows: ${report.summary.nonSweepAdapterRows}.`,
    `- Missing outcome rows: ${report.summary.missingOutcomeRows}.`,
    `- Changed rows gross one-MES P/L: ${report.summary.changedRowsGrossResolvedOneMesPl ?? '-'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Runtime install ready for explicit approval: ${report.summary.runtimeInstallReadyForExplicitApproval}.`,
    `- Runtime install allowed by this report: ${report.summary.runtimeInstallAllowedByThisReport}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Proposed Runtime Scope',
    `- Allowed behavior change: ${report.proposedRuntimeScope.allowedBehaviorChange}`,
    '- Likely files to modify:',
    ...report.proposedRuntimeScope.likelyFilesToModify.map((file) => `  - ${file}`),
    '- Files explicitly out of scope:',
    ...report.proposedRuntimeScope.filesExplicitlyOutOfScope.map((file) => `  - ${file}`),
    '',
    '## Approval Gates',
    ...report.approvalCheckpoint.gates.map((gate) => `- ${gate.name}: ${gate.status} - ${gate.proof}`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeApprovalCheckpointReport(args: {
  savedArtifactAdapterDryRunPath: string | null;
  savedArtifactAdapterDryRun: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSavedArtifactAdapterDryRunReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeApprovalCheckpointReport {
  const dryRun = args.savedArtifactAdapterDryRun;
  const gates: ApprovalGate[] = [
    {
      name: 'saved_artifact_adapter_status_pass',
      required: true,
      status: dryRun?.status === 'pass' ? 'pass' : 'fail',
      proof: dryRun ? `saved-artifact adapter status ${dryRun.status}` : 'saved-artifact adapter report missing',
    },
    {
      name: 'saved_artifact_adapter_recommends_checkpoint',
      required: true,
      status: dryRun?.summary.recommendation === 'saved_artifact_adapter_shape_passed_prepare_runtime_approval_checkpoint' ? 'pass' : 'fail',
      proof: dryRun ? `saved-artifact adapter recommendation ${dryRun.summary.recommendation}` : 'saved-artifact adapter report missing',
    },
    {
      name: 'adapter_rows_clean',
      required: true,
      status: dryRun
        && dryRun.summary.changedRowsBuilt === 4
        && dryRun.summary.eligibleAdapterRows === 4
        && dryRun.summary.blockedAdapterRows === 0
        && dryRun.summary.nonSweepAdapterRows === 0
        && dryRun.summary.missingOutcomeRows === 0
        ? 'pass'
        : 'fail',
      proof: dryRun ? `changed/eligible/blocked/nonSweep/missingOutcome ${dryRun.summary.changedRowsBuilt}/${dryRun.summary.eligibleAdapterRows}/${dryRun.summary.blockedAdapterRows}/${dryRun.summary.nonSweepAdapterRows}/${dryRun.summary.missingOutcomeRows}` : 'saved-artifact adapter report missing',
    },
    {
      name: 'live_outputs_remain_zero',
      required: true,
      status: dryRun
        && dryRun.summary.shouldPostRows === 0
        && dryRun.summary.publishDiscordRows === 0
        && dryRun.summary.canExecuteChangedRows === 0
        && dryRun.summary.livePromotionAllowedRows === 0
        ? 'pass'
        : 'fail',
      proof: dryRun ? `shouldPost/publishDiscord/canExecute/livePromotion ${dryRun.summary.shouldPostRows}/${dryRun.summary.publishDiscordRows}/${dryRun.summary.canExecuteChangedRows}/${dryRun.summary.livePromotionAllowedRows}` : 'saved-artifact adapter report missing',
    },
    {
      name: 'saved_artifact_only_boundary_preserved',
      required: true,
      status: dryRun?.assumptions.noRuntimeAdapterInstalled === true
        && dryRun.assumptions.noScannerVisibleSelectionInstalled === true
        && dryRun.authority.changesScannerBehavior === false
        && dryRun.authority.changesTradingLogic === false
        && dryRun.authority.changesCanExecute === false
        ? 'pass'
        : 'fail',
      proof: 'no runtime adapter, no scanner-visible selection, no scanner/trading/canExecute changes',
    },
  ];
  const failedGates = gates.filter((gate) => gate.required && gate.status === 'fail');
  const blockers = [
    !args.savedArtifactAdapterDryRunPath ? 'missing saved-artifact adapter dry-run path' : null,
    !dryRun ? 'missing saved-artifact adapter dry-run report' : null,
    ...failedGates.map((gate) => `runtime approval checkpoint gate failed: ${gate.name}`),
  ].filter((item): item is string => Boolean(item));
  const runtimeInstallReadyForExplicitApproval = blockers.length === 0;
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeApprovalCheckpointReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_runtime_approval_checkpoint',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: DEFAULT_REPORT_DIR,
      savedArtifactAdapterDryRunPath: args.savedArtifactAdapterDryRunPath,
    },
    assumptions: {
      checkpointOnly: true,
      noRuntimeChangeInstalled: true,
      scannerVisibleInstallAllowedByThisReport: false,
      requiresExplicitRuntimeApproval: true,
      livePromotionAllowed: false,
    },
    proposedRuntimeScope: {
      modelScope: 'SweepMssFvgRetrace',
      selectorScope: 'keep_later_sweep_proof_only',
      likelyFilesToModify: [
        'src/lib/setupScanner.ts',
        'src/lib/setupScanner.test.ts',
        'docs/PROJECT_STATUS.md',
      ],
      filesExplicitlyOutOfScope: [
        'tools/automation/nt-scanner.ts',
        'src/lib/tradeDecisionPipeline.ts',
        'src/lib/liveDiscordPostEligibility.ts',
        'Supabase migrations or schema files',
        'Discord posting, button, or formatter files',
        'NinjaTrader bridge/recorder/backfill files',
      ],
      allowedBehaviorChange: 'Add a narrowly guarded rank/selection preference for SweepMssFvgRetrace keep_later_sweep_proof candidates only when existing deterministic 5M proof, protected stop, entry, T1/T2, outcome-tested source/proof fields, and existing scanner candidate validity are present.',
      forbiddenBehaviorChanges: [
        'Do not loosen canExecute.',
        'Do not change entry/stop/T1/T2/risk/invalidation math.',
        'Do not post Discord or alter publish eligibility.',
        'Do not read or write Supabase.',
        'Do not read live bridge data.',
        'Do not broaden beyond SweepMssFvgRetrace keep_later_sweep_proof.',
        'Do not remove or weaken TurtleSoup or any approved model.',
      ],
      rollbackPath: [
        'Revert the single future runtime install commit.',
        'Rerun setupScanner/tradeDecisionPipeline focused tests plus full guard/lint/build/test.',
        'Confirm the selector preference no longer appears in setupScanner output.',
      ],
    },
    approvalCheckpoint: {
      name: 'openingdrive_sweep_keep_later_proof_runtime_approval_checkpoint',
      gates,
      requiredRegressionCommands: [
        'npx tsx src/lib/setupScanner.test.ts',
        'npx tsx src/lib/tradeDecisionPipeline.test.ts',
        'npx tsx tools/automation/raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-runtime-approval-checkpoint.test.ts',
        'npx tsc --noEmit --pretty false',
        'npm run guard:no-firebase',
        'npm run guard:architecture',
        'npm run guard:schema',
        'npm run lint',
        'npm run build',
        'npm run test',
        'git diff --check',
      ],
    },
    summary: {
      savedArtifactAdapterStatus: dryRun?.status || null,
      savedArtifactAdapterRecommendation: dryRun?.summary.recommendation || null,
      changedRowsBuilt: dryRun?.summary.changedRowsBuilt || 0,
      eligibleAdapterRows: dryRun?.summary.eligibleAdapterRows || 0,
      blockedAdapterRows: dryRun?.summary.blockedAdapterRows || 0,
      nonSweepAdapterRows: dryRun?.summary.nonSweepAdapterRows || 0,
      missingOutcomeRows: dryRun?.summary.missingOutcomeRows || 0,
      changedRowsGrossResolvedOneMesPl: dryRun?.summary.changedRowsGrossResolvedOneMesPl ?? null,
      livePromotionAllowedRows: 0,
      runtimeInstallReadyForExplicitApproval,
      runtimeInstallAllowedByThisReport: false,
      recommendation: blockers.length ? 'fix_inputs' : 'request_explicit_runtime_install_approval_or_continue_research',
    },
    blockers,
    recommendations: blockers.length
      ? ['Fix saved-artifact adapter dry-run inputs before any runtime approval decision.']
      : [
        'Runtime install is ready for an explicit approval decision, but this report does not install or authorize scanner-visible behavior by itself.',
        'If proceeding, implement exactly one small setupScanner rank/selection preference with focused regression tests and full verification.',
        'If not proceeding, continue research with broader saved scanner artifacts.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeApprovalCheckpointReport(
  report: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeApprovalCheckpointReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-runtime-approval-checkpoint-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeApprovalCheckpointCli(args = process.argv.slice(2)): void {
  const options = parseArgs(args);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeApprovalCheckpointReport({
    savedArtifactAdapterDryRunPath: options.savedArtifactAdapterDryRun,
    savedArtifactAdapterDryRun: fs.existsSync(options.savedArtifactAdapterDryRun)
      ? readJson<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSavedArtifactAdapterDryRunReport>(options.savedArtifactAdapterDryRun)
      : null,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeApprovalCheckpointReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeApprovalCheckpointCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
