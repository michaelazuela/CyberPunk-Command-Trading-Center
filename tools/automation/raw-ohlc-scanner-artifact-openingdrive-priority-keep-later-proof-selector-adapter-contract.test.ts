import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorAdapterContractReport,
  parseRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorAdapterContractArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-adapter-contract';

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

const preflight = {
  status: 'pass',
  authority,
  summary: {
    dryRunStatus: 'pass',
    dryRunRecommendation: 'dry_run_supports_sweep_only_guarded_selector_research',
    changedSlates: 4,
    sweepScopeRows: 19,
    changedRowsGrossResolvedOneMesPl: 478.75,
    invalidProposedRows: 0,
    nonSweepChangedRows: 0,
    missingOutcomeRows: 0,
    blockedCarveoutRowsRemain: 0,
    shouldPostRows: 0,
    publishDiscordRows: 0,
    canExecuteChangedRows: 0,
    livePromotionAllowedRows: 0,
    implementationDraftEligible: true,
    runtimeInstallAllowed: false,
    recommendation: 'draft_no_runtime_selector_adapter_contract_next',
  },
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorAdapterContractReport({
  reportDir: 'reports',
  preflightPath: 'preflight.json',
  preflight: preflight as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_adapter_contract');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.assumptions.contractOnly, true);
assert.equal(report.assumptions.noRuntimeAdapterInstalled, true);
assert.equal(report.assumptions.implementationAllowedNow, false);
assert.equal(report.assumptions.scannerVisibleInstallAllowedNow, false);
assert.equal(report.adapterContract.modelScope, 'SweepMssFvgRetrace');
assert.equal(report.adapterContract.selectorScope, 'keep_later_sweep_proof_only');
assert.equal(report.adapterContract.approvalRequiredBeforeRuntimeImplementation, true);
assert.equal(report.adapterContract.implementationAllowedNow, false);
assert.equal(report.adapterContract.scannerVisibleInstallAllowedNow, false);
assert.equal(report.summary.preflightReady, true);
assert.equal(report.summary.changedSlates, 4);
assert.equal(report.summary.sweepScopeRows, 19);
assert.equal(report.summary.changedRowsGrossResolvedOneMesPl, 478.75);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.failedGateCount, 0);
assert.equal(report.summary.recommendation, 'draft_saved_artifact_adapter_dry_run_next');
assert.ok(report.adapterContract.requiredRegressionCommands.includes('npm run test'));
assert.ok(report.adapterContract.forbiddenOutputs.some((item) => item.includes('No broadening to TurtleSoup')));
assert.ok(report.adapterContract.implementationInvariants.some((item) => item.includes('canExecute remains internal/audit-only')));
assert.match(report.markdown, /OpeningDrive Sweep Keep-Later-Proof Selector Adapter Contract/);

const failed = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorAdapterContractReport({
  reportDir: 'reports',
  preflightPath: 'bad-preflight.json',
  preflight: {
    ...preflight,
    summary: {
      ...preflight.summary,
      runtimeInstallAllowed: true,
    },
  } as any,
}, '2026-07-19T00:01:00.000Z');

assert.equal(failed.status, 'fail');
assert.equal(failed.summary.recommendation, 'fix_inputs');
assert.ok(failed.blockers.some((blocker) => blocker.includes('runtime_install_still_blocked')));

const parsed = parseRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorAdapterContractArgs([
  '--preflight',
  'preflight.json',
  '--json',
]);
assert.equal(parsed.preflight.endsWith('preflight.json'), true);
assert.equal(parsed.json, true);

console.log('OpeningDrive keep-later-proof selector adapter contract verified.');
