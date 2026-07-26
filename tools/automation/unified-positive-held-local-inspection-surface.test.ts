import assert from 'node:assert/strict';
import { buildHeldLocalReviewTicketArtifact } from '../../src/lib/localScannerEngine';
import { SetupType } from '../../src/types';
import type { UnifiedPositiveHeldLocalTicketAdapterReport } from './unified-positive-held-local-ticket-adapter';
import type { UnifiedPositiveScannerDryRunReplayReport } from './unified-positive-scanner-dry-run-replay';
import { buildUnifiedPositiveHeldLocalInspectionSurfaceReport } from './unified-positive-held-local-inspection-surface';

const artifact = buildHeldLocalReviewTicketArtifact({
  ticketId: 'fixture-ticket',
  setupType: SetupType.NoSetup,
  direction: 'SHORT',
  sourceCandidateKey: 'NoInstalledSetup|fixture|SHORT|100.00|0',
  entry: 100,
  stop: 104,
  target1: 94,
  target2: 92,
  proofTime: '2026-07-01T13:05:00',
  triggerCondition: 'Fresh completed 5M sweep/MSS/FVG retest proof.',
  invalidationText: 'Invalid above 104.',
  htfStory: 'HTF context supports review only; 5M remains execution authority.',
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
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      adapterStatus: 'held_local_artifact_created',
      artifact,
      blockers: [],
    },
  ],
  recommendations: [],
  markdown: '',
} satisfies UnifiedPositiveHeldLocalTicketAdapterReport;

const dryRunReplay = {
  reportType: 'unified_positive_scanner_dry_run_replay',
  generatedAt: '2026-07-16T00:01:00.000Z',
  status: 'pass',
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
    heldLocalAdapterPath: 'adapter.json',
  },
  summary: {
    adapterRowsLoaded: 1,
    pairedDryRunRows: 1,
    heldLocalArtifactsObserved: 1,
    zeroLivePublishBehaviorChangeRows: 1,
    blockedRows: 0,
    normalShouldPostFalseRows: 1,
    adapterShouldPostFalseRows: 1,
    normalCanExecuteFalseRows: 1,
    adapterCanExecuteFalseRows: 1,
    normalPublishDiscordFalseRows: 1,
    adapterPublishDiscordFalseRows: 1,
  },
  rows: [
    {
      ticketId: 'fixture-ticket',
      sourceSnapshotId: 'scanner-fixture',
      session: null,
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      normalDeskOutput: {
        sourceOfTruth: 'scanner_desk_state_normal_output_preserved',
        shouldPost: false,
        publishDiscord: false,
        canExecute: false,
        reason: 'Dry-run fixture.',
      },
      heldLocalOutput: {
        sourceOfTruth: 'scanner_owned_held_local_review_ticket_adapter',
        deskTicketState: 'ACTIVE_REVIEW',
        shouldPost: false,
        publishDiscord: false,
        canExecute: false,
        reviewOnly: true,
      },
      comparison: {
        zeroLivePublishBehaviorChange: true,
        heldLocalBesideNormalOutput: true,
        scannerBehaviorUnchanged: true,
        blockers: [],
      },
    },
  ],
  recommendations: [],
  markdown: '',
} satisfies UnifiedPositiveScannerDryRunReplayReport;

const report = buildUnifiedPositiveHeldLocalInspectionSurfaceReport({
  heldLocalAdapter: adapterReport,
  dryRunReplay,
  heldLocalAdapterPath: 'adapter.json',
  dryRunReplayPath: 'dry-run.json',
}, '2026-07-16T00:02:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_inspection_surface');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.changesDiscordPosting, false);
assert.equal(report.summary.adapterRowsLoaded, 1);
assert.equal(report.summary.dryRunRowsLoaded, 1);
assert.equal(report.summary.inspectableTickets, 1);
assert.equal(report.summary.blockedRows, 0);
assert.equal(report.summary.normalShouldPostFalseRows, 1);
assert.equal(report.summary.heldLocalShouldPostFalseRows, 1);
assert.equal(report.summary.normalCanExecuteFalseRows, 1);
assert.equal(report.summary.heldLocalCanExecuteFalseRows, 1);
assert.equal(report.summary.normalPublishDiscordFalseRows, 1);
assert.equal(report.summary.heldLocalPublishDiscordFalseRows, 1);
assert.equal(report.rows[0].status, 'inspectable_held_local_ticket');
assert.equal(report.rows[0].session, null);
assert.equal(report.rows[0].heldLocalTicket?.state, 'ACTIVE_REVIEW');
assert.equal(report.rows[0].heldLocalTicket?.entry, 100);
assert.equal(report.rows[0].heldLocalTicket?.stop, 104);
assert.equal(report.rows[0].heldLocalTicket?.t1, 94);
assert.equal(report.rows[0].heldLocalTicket?.t2, 92);
assert.equal(report.rows[0].heldLocalTicket?.invalidationText, 'Invalid if price trades above the protected 5M stop line at 104.00. No automated order authority is granted.');
assert.equal(report.rows[0].boundaries.dryRunZeroLivePublishBehaviorChange, true);
assert.equal(report.rows[0].deskText?.what, 'NoInstalledSetup SHORT held-local ACTIVE_REVIEW ticket.');
assert.equal(report.rows[0].deskText?.invalidation, 'Invalid if price trades above the protected 5M stop line at 104.00. No automated order authority is granted.');
assert.match(report.markdown, /Inspectable tickets: 1/);
assert.match(report.markdown, /Invalid if price trades above the protected 5M stop line at 104.00/);

const failingDryRun = structuredClone(dryRunReplay) as UnifiedPositiveScannerDryRunReplayReport;
failingDryRun.status = 'fail';
failingDryRun.rows[0].comparison.zeroLivePublishBehaviorChange = false;
const failingReport = buildUnifiedPositiveHeldLocalInspectionSurfaceReport({
  heldLocalAdapter: adapterReport,
  dryRunReplay: failingDryRun,
}, '2026-07-16T00:03:00.000Z');

assert.equal(failingReport.status, 'fail');
assert.equal(failingReport.summary.inspectableTickets, 0);
assert.equal(failingReport.summary.blockedRows, 1);
assert.ok(failingReport.rows[0].blockers.includes('dry-run replay status fail'));
assert.ok(failingReport.rows[0].blockers.includes('dry-run replay did not preserve zero live publish behavior change'));

console.log('unified positive held-local inspection surface verified.');
