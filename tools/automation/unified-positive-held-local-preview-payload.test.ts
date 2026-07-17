import assert from 'node:assert/strict';
import type { UnifiedPositiveHeldLocalInspectionSurfaceReport } from './unified-positive-held-local-inspection-surface';
import {
  buildUnifiedPositiveHeldLocalPreviewPayloadReport,
  type UnifiedPositiveHeldLocalPreviewPayloadReport,
} from './unified-positive-held-local-preview-payload';
import type { UnifiedPositiveHeldLocalWordingGuardReport } from './unified-positive-held-local-wording-guard';
import type {
  UnifiedPositiveHeldLocalPreviewTurtleSoupReviewNotePlacementSimulationReport,
} from './unified-positive-held-local-preview-turtlesoup-review-note-placement-simulation';

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
    adapterRowsLoaded: 1,
    dryRunRowsLoaded: 1,
    inspectableTickets: 1,
    blockedRows: 0,
    normalShouldPostFalseRows: 1,
    heldLocalShouldPostFalseRows: 1,
    normalCanExecuteFalseRows: 1,
    heldLocalCanExecuteFalseRows: 1,
    normalPublishDiscordFalseRows: 1,
    heldLocalPublishDiscordFalseRows: 1,
  },
  rows: [
    {
      ticketId: 'long-ticket',
      sourceSnapshotId: 'scanner-long',
      session: null,
      setupType: 'TurtleSoup',
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
        notes: ['fixture note'],
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
        what: 'TurtleSoup LONG held-local ACTIVE_REVIEW ticket.',
        where: 'Line 100.00; entry 100.00; stop 96.00; T1 106.00; T2 108.00.',
        when: 'Fresh completed 5M proof.',
        why: 'HTF context supports review only.',
        invalidation: 'Invalid if price trades below the protected 5M stop line at 96.00. No automated order authority is granted.',
      },
      blockers: [],
    },
  ],
  recommendations: [],
  markdown: '',
} satisfies UnifiedPositiveHeldLocalInspectionSurfaceReport;

const wordingGuard = {
  reportType: 'unified_positive_held_local_wording_guard',
  generatedAt: '2026-07-16T00:01:00.000Z',
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
    inspectionSurfacePath: 'inspection.json',
  },
  summary: {
    rowsChecked: 1,
    rowsPassed: 1,
    rowsFailed: 0,
    genericInvalidationFindings: 0,
    missingSideSpecificFindings: 0,
  },
  findings: [],
  recommendations: [],
  markdown: '',
} satisfies UnifiedPositiveHeldLocalWordingGuardReport;

const report = buildUnifiedPositiveHeldLocalPreviewPayloadReport({
  inspectionSurface,
  wordingGuard,
  inspectionSurfacePath: 'inspection.json',
  wordingGuardPath: 'wording.json',
}, '2026-07-16T00:02:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_payload');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.changesDiscordPosting, false);
assert.equal(report.summary.inspectionRowsLoaded, 1);
assert.equal(report.summary.previewPayloadsCreated, 1);
assert.equal(report.summary.blockedRows, 0);
assert.equal(report.summary.shouldPostFalsePayloads, 1);
assert.equal(report.summary.canExecuteFalsePayloads, 1);
assert.equal(report.summary.publishDiscordFalsePayloads, 1);
assert.equal(report.summary.shouldDispatchFalsePayloads, 1);
assert.equal(report.summary.writesSupabaseFalsePayloads, 1);
assert.equal(report.rows[0].status, 'preview_payload_created');
assert.equal(report.rows[0].session, null);
assert.equal(report.rows[0].payload?.sourceOfTruth, 'scanner_owned_held_local_local_preview_payload');
assert.equal(report.rows[0].payload?.session, null);
assert.equal(report.rows[0].payload?.state, 'ACTIVE_REVIEW');
assert.equal(report.rows[0].payload?.publishDiscord, false);
assert.equal(report.rows[0].payload?.shouldPost, false);
assert.equal(report.rows[0].payload?.canExecute, false);
assert.equal(report.rows[0].payload?.shouldDispatch, false);
assert.equal(report.rows[0].payload?.writesSupabase, false);
assert.equal(report.rows[0].payload?.reviewOnly, true);
assert.equal(report.rows[0].payload?.humanReviewOnly, true);
assert.equal(report.rows[0].payload?.noAutomatedOrders, true);
assert.equal(report.rows[0].payload?.levels.entry, 100);
assert.equal(report.rows[0].payload?.levels.stop, 96);
assert.equal(report.rows[0].payload?.sections.invalidation, 'Invalid if price trades below the protected 5M stop line at 96.00. No automated order authority is granted.');
assert.match(report.markdown, /Preview payloads created: 1/);
assert.match(report.markdown, /shouldDispatch=false payloads: 1/);
assert.equal(report.summary.reviewNotePlacementAppliedPayloads, 0);

const placementSimulation = {
  reportType: 'unified_positive_held_local_preview_turtlesoup_review_note_placement_simulation',
  generatedAt: '2026-07-16T00:01:30.000Z',
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
    changesAppRuntime: false,
  },
  source: {
    reportDir: 'diagnostic-reports',
    reviewNoteWordingProbePath: 'wording-probe.json',
  },
  assumptions: {
    placementSimulationIsResearchOnly: true,
    noPreviewUiChange: true,
    noReviewNoteInstalled: true,
    noTicketSuppression: true,
    noOrderChange: true,
    noRankChange: true,
    noCanExecuteChange: true,
    livePromotionAllowed: false,
  },
  summary: {
    wordingRowsRead: 1,
    placementRows: 1,
    visibleBeforeRows: 1,
    visibleAfterRows: 1,
    orderPreservedRows: 1,
    suppressTicketRows: 0,
    rankingChangeRows: 0,
    canExecuteChangeRows: 0,
    entryStopTargetChangeRows: 0,
    discordPostingChangeRows: 0,
    supabaseWriteRows: 0,
    livePromotionAllowedRows: 0,
    recommendedAction: 'keep_research_only_placement_candidate',
  },
  rows: [{
    clusterId: 'missing_full_plan_levels|morning|LONG',
    placement: 'held_local_preview_notes',
    originalOrdinal: 1,
    simulatedOrdinal: 1,
    reason: 'missing_full_plan_levels',
    session: 'morning',
    direction: 'LONG',
    proposedNote: 'TurtleSoup long remains review-only: the liquidity-raid idea is visible, but this cluster lacks full plan-level proof. Require fresh completed 5M entry, protected stop, invalidation, and app targets before treating it as actionable.',
    ticketVisibleBefore: true,
    ticketVisibleAfter: true,
    orderPreserved: true,
    suppressesTicket: false,
    changesRanking: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    changesDiscordPosting: false,
    writesSupabase: false,
  }],
  blockers: [],
  recommendations: [],
  markdown: '',
} satisfies UnifiedPositiveHeldLocalPreviewTurtleSoupReviewNotePlacementSimulationReport;

const placementSurface = structuredClone(inspectionSurface) as UnifiedPositiveHeldLocalInspectionSurfaceReport;
placementSurface.rows[0].session = 'morning';
const placementReport = buildUnifiedPositiveHeldLocalPreviewPayloadReport({
  inspectionSurface: placementSurface,
  wordingGuard,
  placementSimulation,
  turtleSoupReviewNotePlacementSimulationPath: 'placement.json',
}, '2026-07-16T00:02:30.000Z');

assert.equal(placementReport.status, 'pass');
assert.equal(placementReport.source.turtleSoupReviewNotePlacementSimulationPath, 'placement.json');
assert.equal(placementReport.summary.previewPayloadsCreated, 1);
assert.equal(placementReport.summary.reviewNotePlacementAppliedPayloads, 1);
assert.equal(placementReport.rows[0].session, 'morning');
assert.equal(placementReport.rows[0].payload?.session, 'morning');
assert.equal(placementReport.rows[0].payload?.publishDiscord, false);
assert.equal(placementReport.rows[0].payload?.shouldPost, false);
assert.equal(placementReport.rows[0].payload?.canExecute, false);
assert.equal(placementReport.rows[0].payload?.shouldDispatch, false);
assert.equal(placementReport.rows[0].payload?.writesSupabase, false);
assert.ok(placementReport.rows[0].payload?.notes.some((note) => note.includes('lacks full plan-level proof')));

const failingGuard = structuredClone(wordingGuard) as UnifiedPositiveHeldLocalWordingGuardReport;
failingGuard.status = 'fail';
failingGuard.summary.rowsPassed = 0;
failingGuard.summary.rowsFailed = 1;
failingGuard.findings = [
  {
    ticketId: 'long-ticket',
    setupType: 'TurtleSoup',
    direction: 'LONG',
    reason: 'generic_below_above_invalidation_wording',
    evidence: 'Invalid below/above.',
  },
];
const blockedReport = buildUnifiedPositiveHeldLocalPreviewPayloadReport({
  inspectionSurface,
  wordingGuard: failingGuard,
}, '2026-07-16T00:03:00.000Z');

assert.equal(blockedReport.status, 'fail');
assert.equal(blockedReport.summary.previewPayloadsCreated, 0);
assert.equal(blockedReport.summary.blockedRows, 1);
assert.equal(blockedReport.rows[0].payload, null);
assert.ok(blockedReport.rows[0].blockers.includes('wording guard status fail'));
assert.ok(blockedReport.rows[0].blockers.includes('wording guard finding exists for ticket'));

const boundaryBreak = structuredClone(inspectionSurface) as UnifiedPositiveHeldLocalInspectionSurfaceReport;
boundaryBreak.rows[0].boundaries.publishDiscord = true as false;
const boundaryReport: UnifiedPositiveHeldLocalPreviewPayloadReport = buildUnifiedPositiveHeldLocalPreviewPayloadReport({
  inspectionSurface: boundaryBreak,
  wordingGuard,
}, '2026-07-16T00:04:00.000Z');

assert.equal(boundaryReport.status, 'fail');
assert.equal(boundaryReport.summary.previewPayloadsCreated, 0);
assert.ok(boundaryReport.rows[0].blockers.includes('publishDiscord boundary is not false'));

console.log('unified positive held-local preview payload verified.');
