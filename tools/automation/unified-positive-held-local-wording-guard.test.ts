import assert from 'node:assert/strict';
import type { UnifiedPositiveHeldLocalInspectionSurfaceReport } from './unified-positive-held-local-inspection-surface';
import { buildUnifiedPositiveHeldLocalWordingGuardReport } from './unified-positive-held-local-wording-guard';

const inspectionSurface = {
  reportType: 'unified_positive_held_local_inspection_surface',
  generatedAt: '2026-07-16T00:00:00.000Z',
  status: 'pass',
  authority: {
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
  },
  source: {
    heldLocalAdapterPath: 'adapter.json',
    dryRunReplayPath: 'dry-run.json',
  },
  summary: {
    adapterRowsLoaded: 2,
    dryRunRowsLoaded: 2,
    inspectableTickets: 2,
    blockedRows: 0,
    normalShouldPostFalseRows: 2,
    heldLocalShouldPostFalseRows: 2,
    normalCanExecuteFalseRows: 2,
    heldLocalCanExecuteFalseRows: 2,
    normalPublishDiscordFalseRows: 2,
    heldLocalPublishDiscordFalseRows: 2,
  },
  rows: [
    {
      ticketId: 'long-ticket',
      sourceSnapshotId: 'scanner-long',
      session: null,
      setupType: 'historicalReview',
      direction: 'LONG',
      status: 'inspectable_held_local_ticket',
      normalDeskOutput: {
        shouldPost: false,
        publishDiscord: false,
        canExecute: false,
      },
      heldLocalTicket: {
        state: 'ACTIVE_REVIEW',
        primaryDirection: 'LONG',
        lineInSand: 100,
        triggerCondition: 'Fresh completed 5M proof.',
        entry: 100,
        stop: 96,
        t1: 106,
        t2: 108,
        invalidation: 96,
        invalidationText: 'Invalid if price trades below the protected 5M stop line at 96.00. No automated order authority is granted.',
        htfStatus: 'sufficient',
        htfStory: 'HTF context supports review only.',
        notes: [],
      },
      boundaries: {
        reviewOnly: true,
        humanReviewOnly: true,
        noAutomatedOrders: true,
        shouldPost: false,
        publishDiscord: false,
        canExecute: false,
        changesDiscordPosting: false,
        dryRunZeroLivePublishBehaviorChange: true,
      },
      deskText: {
        what: 'historicalReview LONG held-local ACTIVE_REVIEW ticket.',
        where: 'Line 100.00.',
        when: 'Fresh completed 5M proof.',
        why: 'HTF context supports review only.',
        invalidation: 'Invalid if price trades below the protected 5M stop line at 96.00. No automated order authority is granted.',
      },
      blockers: [],
    },
    {
      ticketId: 'short-ticket',
      sourceSnapshotId: 'scanner-short',
      session: null,
      setupType: 'historicalReview',
      direction: 'SHORT',
      status: 'inspectable_held_local_ticket',
      normalDeskOutput: {
        shouldPost: false,
        publishDiscord: false,
        canExecute: false,
      },
      heldLocalTicket: {
        state: 'ACTIVE_REVIEW',
        primaryDirection: 'SHORT',
        lineInSand: 100,
        triggerCondition: 'Fresh completed 5M proof.',
        entry: 100,
        stop: 104,
        t1: 94,
        t2: 92,
        invalidation: 104,
        invalidationText: 'Invalid if price trades above the protected 5M stop line at 104.00. No automated order authority is granted.',
        htfStatus: 'sufficient',
        htfStory: 'HTF context supports review only.',
        notes: [],
      },
      boundaries: {
        reviewOnly: true,
        humanReviewOnly: true,
        noAutomatedOrders: true,
        shouldPost: false,
        publishDiscord: false,
        canExecute: false,
        changesDiscordPosting: false,
        dryRunZeroLivePublishBehaviorChange: true,
      },
      deskText: {
        what: 'historicalReview SHORT held-local ACTIVE_REVIEW ticket.',
        where: 'Line 100.00.',
        when: 'Fresh completed 5M proof.',
        why: 'HTF context supports review only.',
        invalidation: 'Invalid if price trades above the protected 5M stop line at 104.00. No automated order authority is granted.',
      },
      blockers: [],
    },
  ],
  recommendations: [],
  markdown: '',
} satisfies UnifiedPositiveHeldLocalInspectionSurfaceReport;

const report = buildUnifiedPositiveHeldLocalWordingGuardReport({
  inspectionSurface,
  inspectionSurfacePath: 'inspection.json',
}, '2026-07-16T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_wording_guard');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.rowsChecked, 2);
assert.equal(report.summary.rowsPassed, 2);
assert.equal(report.summary.rowsFailed, 0);
assert.equal(report.summary.genericInvalidationFindings, 0);
assert.equal(report.summary.missingSideSpecificFindings, 0);
assert.equal(report.findings.length, 0);
assert.match(report.markdown, /Status: pass/);

const failingSurface = structuredClone(inspectionSurface) as UnifiedPositiveHeldLocalInspectionSurfaceReport;
if (failingSurface.rows[0].heldLocalTicket) {
  failingSurface.rows[0].heldLocalTicket.invalidationText = 'Invalid below/above the protected 5M stop line at 96.00.';
}
if (failingSurface.rows[0].deskText) {
  failingSurface.rows[0].deskText.invalidation = 'Invalid below/above the protected 5M stop line at 96.00.';
}
const failingReport = buildUnifiedPositiveHeldLocalWordingGuardReport({
  inspectionSurface: failingSurface,
}, '2026-07-16T00:02:00.000Z');

assert.equal(failingReport.status, 'fail');
assert.equal(failingReport.summary.rowsChecked, 2);
assert.equal(failingReport.summary.rowsPassed, 1);
assert.equal(failingReport.summary.rowsFailed, 1);
assert.equal(failingReport.summary.genericInvalidationFindings, 1);
assert.equal(failingReport.summary.missingSideSpecificFindings, 1);
assert.ok(failingReport.findings.some((finding) => finding.reason === 'generic_below_above_invalidation_wording'));
assert.ok(failingReport.findings.some((finding) => finding.reason === 'missing_side_specific_invalidation_wording'));

console.log('unified positive held-local wording guard verified.');
