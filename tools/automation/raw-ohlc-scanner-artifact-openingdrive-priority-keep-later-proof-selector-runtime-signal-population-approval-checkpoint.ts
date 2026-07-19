import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalScannerOutputDryRunReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-runtime-signal-scanner-output-dry-run';

interface CliOptions {
  scannerOutputDryRun: string;
  outDir: string;
  json: boolean;
}

interface ApprovalGate {
  name: string;
  required: boolean;
  status: 'pass' | 'fail';
  proof: string;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalPopulationApprovalCheckpointReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_runtime_signal_population_approval_checkpoint';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalScannerOutputDryRunReport['authority'];
  source: {
    reportDir: string;
    scannerOutputDryRunPath: string | null;
  };
  assumptions: {
    checkpointOnly: true;
    noRuntimeChangeInstalled: true;
    noScannerVisiblePopulationInstalled: true;
    rankConsumerDisabled: true;
    scannerVisibleInstallAllowedByThisReport: false;
  };
  proposedRuntimeScope: {
    allowedFutureBehavior: string;
    allowedFilesToModify: string[];
    filesExplicitlyOutOfScope: string[];
    requiredBeforeRuntimeInstall: string[];
    caveats: string[];
    forbiddenBehaviorChanges: string[];
    rollbackPath: string[];
  };
  approvalCheckpoint: {
    name: 'openingdrive_proof_selection_signal_population_approval_checkpoint';
    gates: ApprovalGate[];
    requiredRegressionCommands: string[];
  };
  summary: {
    scannerOutputDryRunStatus: string | null;
    scannerOutputDryRunRecommendation: string | null;
    candidatesCompared: number;
    syntheticCompanionRowsAdded: number;
    keepLaterSweepProofRows: number;
    rankScoreChangedRows: number;
    rankOrderChangedContexts: number;
    executionStatusChangedRows: number;
    blockReasonChangedRows: number;
    canExecuteChangedRows: number;
    livePromotionAllowedRows: number;
    readyForExplicitPopulationInstallApproval: boolean;
    runtimeInstallAllowedByThisReport: false;
    recommendation: 'request_explicit_population_install_approval_or_gather_real_artifact_replay' | 'fix_inputs';
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
  const scannerOutputDryRun = readFlag(args, '--scanner-output-dry-run') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-runtime-signal-scanner-output-dry-run-\d+\.json$/);
  if (!scannerOutputDryRun) throw new Error('--scanner-output-dry-run is required.');
  return {
    scannerOutputDryRun: path.resolve(scannerOutputDryRun),
    outDir,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalPopulationApprovalCheckpointReport['authority'] {
  return {
    readOnly: true,
    localOnly: true,
    researchOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    runsSetupScanner: true,
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalPopulationApprovalCheckpointReport, 'markdown'>): string {
  return [
    '# OpeningDrive ProofSelectionSignal Population Approval Checkpoint',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only approval checkpoint. It does not install scanner-visible population, add a rank consumer, post Discord, write Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Scanner-output dry-run status: ${report.summary.scannerOutputDryRunStatus ?? '-'}.`,
    `- Scanner-output dry-run recommendation: ${report.summary.scannerOutputDryRunRecommendation ?? '-'}.`,
    `- Candidates compared: ${report.summary.candidatesCompared}.`,
    `- Synthetic companion rows added: ${report.summary.syntheticCompanionRowsAdded}.`,
    `- keep_later_sweep_proof rows: ${report.summary.keepLaterSweepProofRows}.`,
    `- Rank score/order changed rows/contexts: ${report.summary.rankScoreChangedRows}/${report.summary.rankOrderChangedContexts}.`,
    `- Execution/block reason changed rows: ${report.summary.executionStatusChangedRows}/${report.summary.blockReasonChangedRows}.`,
    `- canExecute/live promotion rows: ${report.summary.canExecuteChangedRows}/${report.summary.livePromotionAllowedRows}.`,
    `- Ready for explicit population install approval: ${report.summary.readyForExplicitPopulationInstallApproval}.`,
    `- Runtime install allowed by this report: ${report.summary.runtimeInstallAllowedByThisReport}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Proposed Runtime Scope',
    `- ${report.proposedRuntimeScope.allowedFutureBehavior}`,
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

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalPopulationApprovalCheckpointReport(args: {
  scannerOutputDryRunPath: string | null;
  scannerOutputDryRun: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalScannerOutputDryRunReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalPopulationApprovalCheckpointReport {
  const dryRun = args.scannerOutputDryRun;
  const gates: ApprovalGate[] = [
    {
      name: 'scanner_output_dry_run_passed',
      required: true,
      status: dryRun?.status === 'pass' ? 'pass' : 'fail',
      proof: dryRun ? `scanner-output dry-run status ${dryRun.status}` : 'scanner-output dry-run missing',
    },
    {
      name: 'dry_run_recommends_population_checkpoint',
      required: true,
      status: dryRun?.summary.recommendation === 'prepare_scanner_population_approval_checkpoint_next' ? 'pass' : 'fail',
      proof: dryRun ? `scanner-output dry-run recommendation ${dryRun.summary.recommendation}` : 'scanner-output dry-run missing',
    },
    {
      name: 'inert_attachment_proven',
      required: true,
      status: dryRun &&
        dryRun.summary.rankScoreChangedRows === 0 &&
        dryRun.summary.rankOrderChangedContexts === 0 &&
        dryRun.summary.executionStatusChangedRows === 0 &&
        dryRun.summary.blockReasonChangedRows === 0 &&
        dryRun.summary.canExecuteChangedRows === 0 &&
        dryRun.summary.livePromotionAllowedRows === 0
        ? 'pass'
        : 'fail',
      proof: dryRun ? `rankScore/rankOrder/execution/block/canExecute/livePromotion ${dryRun.summary.rankScoreChangedRows}/${dryRun.summary.rankOrderChangedContexts}/${dryRun.summary.executionStatusChangedRows}/${dryRun.summary.blockReasonChangedRows}/${dryRun.summary.canExecuteChangedRows}/${dryRun.summary.livePromotionAllowedRows}` : 'scanner-output dry-run missing',
    },
    {
      name: 'synthetic_companion_caveat_recorded',
      required: true,
      status: dryRun && dryRun.summary.syntheticCompanionRowsAdded > 0 ? 'pass' : 'fail',
      proof: dryRun ? `synthetic companion rows ${dryRun.summary.syntheticCompanionRowsAdded}` : 'scanner-output dry-run missing',
    },
    {
      name: 'no_runtime_population_installed',
      required: true,
      status: dryRun?.assumptions.attachesSignalToClonedCandidatesOnly === true &&
        dryRun.assumptions.scannerVisibleInstallAllowedByThisReport === false &&
        dryRun.authority.changesScannerBehavior === false
        ? 'pass'
        : 'fail',
      proof: 'signals attached to cloned candidates only; scanner-visible install remains false',
    },
  ];
  const failedGates = gates.filter((gate) => gate.required && gate.status === 'fail');
  const blockers = [
    !args.scannerOutputDryRunPath ? 'missing scanner-output dry-run path' : null,
    !dryRun ? 'missing scanner-output dry-run report' : null,
    ...failedGates.map((gate) => `population approval checkpoint gate failed: ${gate.name}`),
  ].filter((item): item is string => Boolean(item));
  const readyForExplicitPopulationInstallApproval = blockers.length === 0;
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalPopulationApprovalCheckpointReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_runtime_signal_population_approval_checkpoint',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: DEFAULT_REPORT_DIR,
      scannerOutputDryRunPath: args.scannerOutputDryRunPath,
    },
    assumptions: {
      checkpointOnly: true,
      noRuntimeChangeInstalled: true,
      noScannerVisiblePopulationInstalled: true,
      rankConsumerDisabled: true,
      scannerVisibleInstallAllowedByThisReport: false,
    },
    proposedRuntimeScope: {
      allowedFutureBehavior: 'Future implementation may populate optional proofSelectionSignal metadata on scanner-owned candidates from completed 5M proof timestamps only; rank consumers remain disabled until a separate approval checkpoint.',
      allowedFilesToModify: [
        'src/lib/setupScanner.ts',
        'src/lib/setupScanner.test.ts',
        'docs/PROJECT_STATUS.md',
      ],
      filesExplicitlyOutOfScope: [
        'src/lib/tradeDecisionPipeline.ts',
        'src/lib/liveDiscordPostEligibility.ts',
        'tools/automation/nt-scanner.ts',
        'Supabase migrations or schema files',
        'Discord posting, button, or formatter files',
        'NinjaTrader bridge/recorder/backfill files',
      ],
      requiredBeforeRuntimeInstall: [
        'Explicit user approval for scanner-visible metadata population.',
        'Focused setupScanner regression proving scan output can carry metadata without rank/order/status changes.',
        'Real-artifact replay or saved scanner artifact coverage that does not rely only on synthetic companion rows.',
        'Full guard/lint/build/test pass.',
      ],
      caveats: [
        'The scanner-output dry-run added synthetic companion rows because synthetic scanner output produced only one scoped candidate per context.',
        'A runtime install must not claim real collision coverage until saved scanner artifacts prove natural same-proof candidate groups.',
      ],
      forbiddenBehaviorChanges: [
        'Do not add a rank bonus or penalty from proofSelectionSignal.',
        'Do not change canExecute.',
        'Do not change entry, stop, targets, risk, invalidation, or target room.',
        'Do not post Discord or change publish eligibility.',
        'Do not write Supabase or mutate RAG/journal records.',
        'Do not read live bridge data or repair market data.',
        'Do not use research artifact labels, P/L, Discord buttons, RAG outcomes, or Gemini advisory text as population input.',
      ],
      rollbackPath: [
        'Remove any proofSelectionSignal population assignment from setupScanner.',
        'Keep the type and pure helper only if still useful for research; otherwise remove them in a separate cleanup.',
        'Rerun setupScanner, tradeDecisionPipeline, guards, lint, build, and full test.',
      ],
    },
    approvalCheckpoint: {
      name: 'openingdrive_proof_selection_signal_population_approval_checkpoint',
      gates,
      requiredRegressionCommands: [
        'npx tsx src/lib/setupScanner.test.ts',
        'npx tsx src/lib/tradeDecisionPipeline.test.ts',
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
      scannerOutputDryRunStatus: dryRun?.status || null,
      scannerOutputDryRunRecommendation: dryRun?.summary.recommendation || null,
      candidatesCompared: dryRun?.summary.candidatesCompared || 0,
      syntheticCompanionRowsAdded: dryRun?.summary.syntheticCompanionRowsAdded || 0,
      keepLaterSweepProofRows: dryRun?.summary.keepLaterSweepProofRows || 0,
      rankScoreChangedRows: dryRun?.summary.rankScoreChangedRows || 0,
      rankOrderChangedContexts: dryRun?.summary.rankOrderChangedContexts || 0,
      executionStatusChangedRows: dryRun?.summary.executionStatusChangedRows || 0,
      blockReasonChangedRows: dryRun?.summary.blockReasonChangedRows || 0,
      canExecuteChangedRows: dryRun?.summary.canExecuteChangedRows || 0,
      livePromotionAllowedRows: dryRun?.summary.livePromotionAllowedRows || 0,
      readyForExplicitPopulationInstallApproval,
      runtimeInstallAllowedByThisReport: false,
      recommendation: blockers.length ? 'fix_inputs' : 'request_explicit_population_install_approval_or_gather_real_artifact_replay',
    },
    blockers,
    recommendations: [
      'Prefer one more real-artifact replay coverage phase before scanner-visible metadata population because current dry-run used synthetic companion rows.',
      'If explicit approval is granted anyway, keep the runtime population install metadata-only and do not add a rank consumer.',
      'Do not broaden into Discord, Supabase, bridge, canExecute, entry/stop/target/risk, or rank selection changes.',
    ],
  };
  return {
    ...base,
    markdown: buildMarkdown(base),
  };
}

function runCli(): void {
  const options = parseArgs();
  const dryRun = readJson<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalScannerOutputDryRunReport>(options.scannerOutputDryRun);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalPopulationApprovalCheckpointReport({
    scannerOutputDryRunPath: options.scannerOutputDryRun,
    scannerOutputDryRun: dryRun,
  });
  fs.mkdirSync(options.outDir, { recursive: true });
  const outPath = path.join(options.outDir, `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-runtime-signal-population-approval-checkpoint-${Date.now()}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  if (options.json) {
    console.log(JSON.stringify({ outPath, ...report }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport written: ${outPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
