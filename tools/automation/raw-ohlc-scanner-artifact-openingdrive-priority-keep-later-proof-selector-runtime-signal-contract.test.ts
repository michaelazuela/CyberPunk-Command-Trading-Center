import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalContractReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-runtime-signal-contract';

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

const audit = {
  status: 'pass',
  authority,
  summary: {
    recommendation: 'add_scanner_owned_live_signal_contract_before_runtime_ranking',
    runtimeInstallBlockedByMissingLiveSignal: true,
    safeRuntimeInstallAllowedNow: false,
  },
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalContractReport({
  runtimeSignalAuditPath: 'runtime-signal-audit.json',
  runtimeSignalAudit: audit as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_runtime_signal_contract');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.assumptions.contractOnly, true);
assert.equal(report.assumptions.noRuntimeChangeInstalled, true);
assert.equal(report.proposedContract.contractName, 'scanner_owned_same_completed_5m_proof_selector_signal');
assert.equal(report.proposedContract.owner, 'setupScanner');
assert.equal(report.proposedContract.candidateField, 'proofSelectionSignal');
assert.deepEqual(report.proposedContract.allowedSetupScope, ['SweepMssFvgRetrace']);
assert.deepEqual(report.proposedContract.allowedSelectorDecision, ['keep_later_sweep_proof']);
assert.ok(report.proposedContract.requiredFields.some((field) => field.field === 'proofSelectionSignal.selectorDecision'));
assert.ok(report.proposedContract.requiredFields.every((field) => field.requiredForRuntimeSelector));
assert.equal(report.proposedContract.invariantFields.usesOutcomeData, false);
assert.equal(report.proposedContract.invariantFields.usesResearchLabels, false);
assert.equal(report.proposedContract.invariantFields.scannerVisibleInstallAllowedByThisContract, false);
assert.ok(report.proposedContract.likelyFutureFilesToModify.includes('src/types.ts'));
assert.ok(report.proposedContract.filesOutOfScope.includes('src/lib/tradeDecisionPipeline.ts'));
assert.equal(report.summary.contractReadyForTypeOnlyProposal, true);
assert.equal(report.summary.scannerVisibleRuntimeInstallAllowedByThisReport, false);
assert.equal(report.summary.recommendation, 'draft_type_only_scanner_signal_next');
assert.match(report.markdown, /Runtime Signal Contract/);

const blocked = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRuntimeSignalContractReport({
  runtimeSignalAuditPath: 'runtime-signal-audit.json',
  runtimeSignalAudit: {
    ...audit,
    summary: {
      ...audit.summary,
      runtimeInstallBlockedByMissingLiveSignal: false,
    },
  } as any,
}, '2026-07-19T00:01:00.000Z');

assert.equal(blocked.status, 'fail');
assert.equal(blocked.summary.contractReadyForTypeOnlyProposal, false);
assert.equal(blocked.summary.recommendation, 'fix_inputs');
assert.ok(blocked.blockers.some((blocker) => blocker.includes('audit_blocks_runtime_install_due_to_missing_live_signal')));

console.log('OpeningDrive keep-later-proof selector runtime signal contract verified.');
