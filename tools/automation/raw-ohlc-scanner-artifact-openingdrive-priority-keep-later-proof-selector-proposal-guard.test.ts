import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProposalGuardReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-proposal-guard';

const blockedReadiness = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_readiness_summary',
  status: 'pass',
  summary: {
    strictReadyReplayRows: 38,
    blockedRowsExcluded: 12,
    waitingForEntryTriggerRows: 4,
    invalidatedRows: 5,
    livePromotionAllowedRows: 0,
    recommendation: 'continue_research_no_live_selector',
  },
};

const blocked = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProposalGuardReport({
  readinessSummaryPath: 'readiness.json',
  readinessSummary: blockedReadiness as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(blocked.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_proposal_guard');
assert.equal(blocked.status, 'fail');
assert.equal(blocked.authority.readOnly, true);
assert.equal(blocked.authority.localOnly, true);
assert.equal(blocked.authority.researchOnly, true);
assert.equal(blocked.authority.postsDiscord, false);
assert.equal(blocked.authority.writesSupabase, false);
assert.equal(blocked.authority.readsLiveBridge, false);
assert.equal(blocked.authority.changesTradingLogic, false);
assert.equal(blocked.authority.changesCanExecute, false);
assert.equal(blocked.summary.proposalAllowed, false);
assert.equal(blocked.summary.strictReadyReplayRows, 38);
assert.equal(blocked.summary.blockedRowsExcluded, 12);
assert.equal(blocked.summary.waitingForEntryTriggerRows, 4);
assert.equal(blocked.summary.invalidatedRows, 5);
assert.equal(blocked.summary.livePromotionAllowedRows, 0);
assert.ok(blocked.summary.hardStopReasons.includes('12 blocked rows remain excluded from performance'));
assert.ok(blocked.summary.hardStopReasons.includes('readiness recommendation is continue_research_no_live_selector'));
assert.match(blocked.markdown, /Selector Proposal Guard/);

const passableReadiness = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_readiness_summary',
  status: 'pass',
  summary: {
    strictReadyReplayRows: 38,
    blockedRowsExcluded: 0,
    waitingForEntryTriggerRows: 0,
    invalidatedRows: 0,
    livePromotionAllowedRows: 0,
    recommendation: 'prepare_sweep_only_guarded_proposal',
  },
};

const passable = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProposalGuardReport({
  readinessSummaryPath: 'readiness.json',
  readinessSummary: passableReadiness as any,
}, '2026-07-19T00:01:00.000Z');

assert.equal(passable.status, 'pass');
assert.equal(passable.summary.proposalAllowed, false);
assert.deepEqual(passable.summary.hardStopReasons, []);
assert.deepEqual(passable.blockers, []);

const missing = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProposalGuardReport({
  readinessSummaryPath: null,
  readinessSummary: null,
}, '2026-07-19T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing readiness summary path'));
assert.ok(missing.blockers.includes('missing readiness summary report'));

console.log('OpeningDrive keep-later-proof selector proposal guard verified.');
