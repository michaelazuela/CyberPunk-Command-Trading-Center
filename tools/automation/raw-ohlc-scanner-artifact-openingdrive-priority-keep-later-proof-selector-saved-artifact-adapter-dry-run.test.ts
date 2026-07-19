import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSavedArtifactAdapterDryRunReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-saved-artifact-adapter-dry-run';

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

const adapterContract = {
  status: 'pass',
  authority,
  assumptions: {
    scannerVisibleInstallAllowedNow: false,
  },
  summary: {
    recommendation: 'draft_saved_artifact_adapter_dry_run_next',
  },
};

const dryRunComparison = {
  status: 'pass',
  summary: {
    recommendation: 'dry_run_supports_sweep_only_guarded_selector_research',
    changedRowsGrossResolvedOneMesPl: 478.75,
    shouldPostRows: 0,
    publishDiscordRows: 0,
    canExecuteChangedRows: 0,
    livePromotionAllowedRows: 0,
  },
  slates: [
    {
      slateId: '2026-06-10|morning',
      tradeDate: '2026-06-10',
      session: 'morning',
      baselineTicketId: 'baseline',
      baselineSetupType: 'TurtleSoup',
      proposedTicketId: 'proposed',
      proposedSetupType: 'SweepMssFvgRetrace',
      proposedSelectorDecision: 'keep_later_sweep_proof',
      selectedCandidateChanged: true,
      proposedStrictReadySourceProofPositive: true,
      proposedDeterministicLevelsValid: true,
      proposedOutcomeLabel: 't1_hit_only',
      proposedOneMesPl: 277.5,
      livePromotionAllowed: false,
    },
    {
      slateId: '2026-06-11|morning',
      tradeDate: '2026-06-11',
      session: 'morning',
      baselineTicketId: 'unchanged',
      baselineSetupType: 'TurtleSoup',
      proposedTicketId: 'unchanged',
      proposedSetupType: 'TurtleSoup',
      proposedSelectorDecision: 'prefer_replacement',
      selectedCandidateChanged: false,
      proposedStrictReadySourceProofPositive: false,
      proposedDeterministicLevelsValid: true,
      proposedOutcomeLabel: 't1_hit_only',
      proposedOneMesPl: 91.25,
      livePromotionAllowed: false,
    },
  ],
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSavedArtifactAdapterDryRunReport({
  adapterContractPath: 'contract.json',
  adapterContract: adapterContract as any,
  dryRunComparisonPath: 'dry-run.json',
  dryRunComparison: dryRunComparison as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_saved_artifact_adapter_dry_run');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.slatesLoaded, 2);
assert.equal(report.summary.adapterRowsBuilt, 2);
assert.equal(report.summary.changedRowsBuilt, 1);
assert.equal(report.summary.noChangeRowsBuilt, 1);
assert.equal(report.summary.eligibleAdapterRows, 1);
assert.equal(report.summary.blockedAdapterRows, 0);
assert.equal(report.summary.nonSweepAdapterRows, 0);
assert.equal(report.summary.missingOutcomeRows, 0);
assert.equal(report.summary.shouldPostRows, 0);
assert.equal(report.summary.publishDiscordRows, 0);
assert.equal(report.summary.canExecuteChangedRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'saved_artifact_adapter_shape_passed_prepare_runtime_approval_checkpoint');
assert.equal(report.rows[0].adapterDecision, 'would_select_sweep_keep_later_proof');
assert.equal(report.rows[0].adapterEligible, true);
assert.equal(report.rows[0].shouldPost, false);
assert.equal(report.rows[0].publishDiscord, false);
assert.equal(report.rows[0].canExecuteChanged, false);
assert.match(report.markdown, /Saved-Artifact Adapter Dry-Run/);

const blocked = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSavedArtifactAdapterDryRunReport({
  adapterContractPath: 'contract.json',
  adapterContract: adapterContract as any,
  dryRunComparisonPath: 'dry-run.json',
  dryRunComparison: {
    ...dryRunComparison,
    slates: [
      {
        ...dryRunComparison.slates[0],
        proposedSetupType: 'TurtleSoup',
      },
    ],
  } as any,
}, '2026-07-19T00:01:00.000Z');

assert.equal(blocked.status, 'fail');
assert.equal(blocked.summary.recommendation, 'fix_inputs');
assert.ok(blocked.blockers.some((blocker) => blocker.includes('not SweepMssFvgRetrace')));

const missing = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSavedArtifactAdapterDryRunReport({
  adapterContractPath: null,
  adapterContract: null,
  dryRunComparisonPath: null,
  dryRunComparison: null,
}, '2026-07-19T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing adapter contract path'));

console.log('OpeningDrive keep-later-proof selector saved-artifact adapter dry-run verified.');
