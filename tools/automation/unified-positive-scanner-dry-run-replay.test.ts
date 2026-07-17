import assert from 'node:assert/strict';
import { buildHeldLocalReviewTicketArtifact } from '../../src/lib/localScannerEngine';
import { SetupType } from '../../src/types';
import type { UnifiedPositiveHeldLocalTicketAdapterReport } from './unified-positive-held-local-ticket-adapter';
import { buildUnifiedPositiveScannerDryRunReplayReport } from './unified-positive-scanner-dry-run-replay';

const artifact = buildHeldLocalReviewTicketArtifact({
  ticketId: 'fixture-ticket',
  setupType: SetupType.TurtleSoup,
  direction: 'LONG',
  sourceCandidateKey: 'TurtleSoup|fixture|LONG|100.00|0',
  entry: 100,
  stop: 96,
  target1: 106,
  target2: 108,
  proofTime: '2026-07-01T10:05:00',
  triggerCondition: 'Fresh completed 5M retest/re-entry proof.',
  invalidationText: 'Invalid at 96.',
});

const adapterReport = {
  reportType: 'unified_positive_held_local_ticket_adapter',
  generatedAt: '2026-07-16T00:00:00.000Z',
  authority: {
    readOnly: true,
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
  },
  source: {
    contractComparisonPath: 'comparison.json',
  },
  summary: {
    comparisonRowsLoaded: 1,
    heldLocalArtifactsCreated: 1,
    blockedContractGapRows: 0,
    shouldPostFalseArtifacts: 1,
    canExecuteFalseArtifacts: 1,
    publishDiscordFalseArtifacts: 1,
  },
  rows: [
    {
      ticketId: 'fixture-ticket',
      sourceSnapshotId: 'scanner-fixture',
      session: null,
      setupType: 'TurtleSoup',
      direction: 'LONG',
      adapterStatus: 'held_local_artifact_created',
      artifact,
      blockers: [],
    },
  ],
  recommendations: [],
  markdown: '',
} satisfies UnifiedPositiveHeldLocalTicketAdapterReport;

const report = buildUnifiedPositiveScannerDryRunReplayReport({
  heldLocalAdapter: adapterReport,
  heldLocalAdapterPath: 'adapter.json',
}, '2026-07-16T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_scanner_dry_run_replay');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.changesDiscordPosting, false);
assert.equal(report.summary.adapterRowsLoaded, 1);
assert.equal(report.summary.pairedDryRunRows, 1);
assert.equal(report.summary.heldLocalArtifactsObserved, 1);
assert.equal(report.summary.zeroLivePublishBehaviorChangeRows, 1);
assert.equal(report.summary.blockedRows, 0);
assert.equal(report.summary.normalShouldPostFalseRows, 1);
assert.equal(report.summary.adapterShouldPostFalseRows, 1);
assert.equal(report.summary.normalCanExecuteFalseRows, 1);
assert.equal(report.summary.adapterCanExecuteFalseRows, 1);
assert.equal(report.summary.normalPublishDiscordFalseRows, 1);
assert.equal(report.summary.adapterPublishDiscordFalseRows, 1);
assert.equal(report.rows[0].normalDeskOutput.sourceOfTruth, 'scanner_desk_state_normal_output_preserved');
assert.equal(report.rows[0].session, null);
assert.equal(report.rows[0].normalDeskOutput.shouldPost, false);
assert.equal(report.rows[0].normalDeskOutput.publishDiscord, false);
assert.equal(report.rows[0].normalDeskOutput.canExecute, false);
assert.equal(report.rows[0].heldLocalOutput.deskTicketState, 'ACTIVE_REVIEW');
assert.equal(report.rows[0].heldLocalOutput.shouldPost, false);
assert.equal(report.rows[0].heldLocalOutput.publishDiscord, false);
assert.equal(report.rows[0].heldLocalOutput.canExecute, false);
assert.equal(report.rows[0].comparison.zeroLivePublishBehaviorChange, true);
assert.equal(report.rows[0].comparison.scannerBehaviorUnchanged, true);
assert.match(report.markdown, /Zero live publish behavior change rows: 1/);

const unsafeAdapter = structuredClone(adapterReport) as UnifiedPositiveHeldLocalTicketAdapterReport;
if (unsafeAdapter.rows[0].artifact) {
  (unsafeAdapter.rows[0].artifact.deskPublishDecision as { shouldPost: boolean }).shouldPost = true;
}
const unsafeReport = buildUnifiedPositiveScannerDryRunReplayReport({
  heldLocalAdapter: unsafeAdapter,
}, '2026-07-16T00:02:00.000Z');

assert.equal(unsafeReport.status, 'fail');
assert.equal(unsafeReport.summary.zeroLivePublishBehaviorChangeRows, 0);
assert.equal(unsafeReport.summary.blockedRows, 1);
assert.ok(unsafeReport.rows[0].comparison.blockers.includes('held-local adapter would change shouldPost'));

console.log('unified positive scanner dry-run replay verified.');
