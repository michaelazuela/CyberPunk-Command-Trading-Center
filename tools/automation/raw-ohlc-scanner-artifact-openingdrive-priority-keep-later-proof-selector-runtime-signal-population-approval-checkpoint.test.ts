import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalPopulationApprovalCheckpointReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-runtime-signal-population-approval-checkpoint';

const authority = {
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
} as const;

const dryRun = {
  status: 'pass',
  authority,
  assumptions: {
    attachesSignalToClonedCandidatesOnly: true,
    scannerVisibleInstallAllowedByThisReport: false,
  },
  summary: {
    recommendation: 'prepare_scanner_population_approval_checkpoint_next',
    candidatesCompared: 4,
    syntheticCompanionRowsAdded: 2,
    keepLaterSweepProofRows: 2,
    rankScoreChangedRows: 0,
    rankOrderChangedContexts: 0,
    executionStatusChangedRows: 0,
    blockReasonChangedRows: 0,
    canExecuteChangedRows: 0,
    livePromotionAllowedRows: 0,
  },
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalPopulationApprovalCheckpointReport({
  scannerOutputDryRunPath: 'scanner-output-dry-run.json',
  scannerOutputDryRun: dryRun as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_runtime_signal_population_approval_checkpoint');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.assumptions.checkpointOnly, true);
assert.equal(report.assumptions.noRuntimeChangeInstalled, true);
assert.equal(report.assumptions.rankConsumerDisabled, true);
assert.equal(report.summary.readyForExplicitPopulationInstallApproval, true);
assert.equal(report.summary.runtimeInstallAllowedByThisReport, false);
assert.equal(report.summary.syntheticCompanionRowsAdded, 2);
assert.equal(report.summary.recommendation, 'request_explicit_population_install_approval_or_gather_real_artifact_replay');
assert.ok(report.proposedRuntimeScope.caveats.some((item) => item.includes('synthetic companion')));
assert.ok(report.proposedRuntimeScope.forbiddenBehaviorChanges.includes('Do not add a rank bonus or penalty from proofSelectionSignal.'));
assert.ok(report.proposedRuntimeScope.filesExplicitlyOutOfScope.includes('src/lib/tradeDecisionPipeline.ts'));
assert.ok(report.approvalCheckpoint.requiredRegressionCommands.includes('npm run test'));
assert.match(report.markdown, /Population Approval Checkpoint/);

const blocked = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalPopulationApprovalCheckpointReport({
  scannerOutputDryRunPath: 'scanner-output-dry-run.json',
  scannerOutputDryRun: {
    ...dryRun,
    summary: {
      ...dryRun.summary,
      rankScoreChangedRows: 1,
    },
  } as any,
}, '2026-07-19T00:01:00.000Z');

assert.equal(blocked.status, 'fail');
assert.equal(blocked.summary.readyForExplicitPopulationInstallApproval, false);
assert.ok(blocked.blockers.some((blocker) => blocker.includes('inert_attachment_proven')));

console.log('OpeningDrive keep-later-proof selector population approval checkpoint verified.');
