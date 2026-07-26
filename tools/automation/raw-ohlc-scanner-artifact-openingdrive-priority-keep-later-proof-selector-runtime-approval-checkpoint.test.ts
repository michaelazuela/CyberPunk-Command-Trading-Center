import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeApprovalCheckpointReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-runtime-approval-checkpoint';

const authority = {
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
} as const;

const savedArtifactAdapterDryRun = {
  status: 'pass',
  authority,
  assumptions: {
    noRuntimeAdapterInstalled: true,
    noScannerVisibleSelectionInstalled: true,
  },
  summary: {
    recommendation: 'saved_artifact_adapter_shape_passed_prepare_runtime_approval_checkpoint',
    changedRowsBuilt: 4,
    eligibleAdapterRows: 4,
    blockedAdapterRows: 0,
    nonSweepAdapterRows: 0,
    missingOutcomeRows: 0,
    changedRowsGrossResolvedOneMesPl: 478.75,
    shouldPostRows: 0,
    publishDiscordRows: 0,
    canExecuteChangedRows: 0,
    livePromotionAllowedRows: 0,
  },
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeApprovalCheckpointReport({
  savedArtifactAdapterDryRunPath: 'adapter-dry-run.json',
  savedArtifactAdapterDryRun: savedArtifactAdapterDryRun as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_runtime_approval_checkpoint');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.checkpointOnly, true);
assert.equal(report.assumptions.noRuntimeChangeInstalled, true);
assert.equal(report.assumptions.scannerVisibleInstallAllowedByThisReport, false);
assert.equal(report.proposedRuntimeScope.modelScope, 'NoInstalledSetup');
assert.ok(report.proposedRuntimeScope.likelyFilesToModify.includes('src/lib/setupScanner.ts'));
assert.ok(report.proposedRuntimeScope.filesExplicitlyOutOfScope.includes('src/lib/tradeDecisionPipeline.ts'));
assert.ok(report.proposedRuntimeScope.forbiddenBehaviorChanges.includes('Do not loosen canExecute.'));
assert.equal(report.summary.runtimeInstallReadyForExplicitApproval, true);
assert.equal(report.summary.runtimeInstallAllowedByThisReport, false);
assert.equal(report.summary.recommendation, 'request_explicit_runtime_install_approval_or_continue_research');
assert.match(report.markdown, /Runtime Approval Checkpoint/);

const blocked = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeApprovalCheckpointReport({
  savedArtifactAdapterDryRunPath: 'adapter-dry-run.json',
  savedArtifactAdapterDryRun: {
    ...savedArtifactAdapterDryRun,
    summary: {
      ...savedArtifactAdapterDryRun.summary,
      canExecuteChangedRows: 1,
    },
  } as any,
}, '2026-07-19T00:01:00.000Z');

assert.equal(blocked.status, 'fail');
assert.equal(blocked.summary.runtimeInstallReadyForExplicitApproval, false);
assert.ok(blocked.blockers.some((blocker) => blocker.includes('live_outputs_remain_zero')));

console.log('OpeningDrive keep-later-proof selector runtime approval checkpoint verified.');
