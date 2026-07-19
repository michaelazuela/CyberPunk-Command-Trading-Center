import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorImplementationPreflightReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-implementation-preflight';

const dryRun = {
  status: 'pass',
  summary: {
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
    recommendation: 'dry_run_supports_sweep_only_guarded_selector_research',
  },
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorImplementationPreflightReport({
  dryRunComparisonPath: 'dry-run.json',
  dryRunComparison: dryRun as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_implementation_preflight');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.implementationDraftEligible, true);
assert.equal(report.summary.runtimeInstallAllowed, false);
assert.equal(report.summary.changedSlates, 4);
assert.equal(report.summary.changedRowsGrossResolvedOneMesPl, 478.75);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'draft_no_runtime_selector_adapter_contract_next');
assert.match(report.markdown, /Implementation Preflight/);

const blocked = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorImplementationPreflightReport({
  dryRunComparisonPath: 'dry-run.json',
  dryRunComparison: {
    status: 'pass',
    summary: {
      ...dryRun.summary,
      missingOutcomeRows: 1,
    },
  } as any,
}, '2026-07-19T00:01:00.000Z');

assert.equal(blocked.status, 'fail');
assert.equal(blocked.summary.implementationDraftEligible, false);
assert.ok(blocked.blockers.includes('1 changed rows missing outcome evidence'));

const missing = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorImplementationPreflightReport({
  dryRunComparisonPath: null,
  dryRunComparison: null,
}, '2026-07-19T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing dry-run comparison path'));

console.log('OpeningDrive keep-later-proof selector implementation preflight verified.');
