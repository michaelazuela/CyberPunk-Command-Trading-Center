import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewReplayQueueReport,
} from './unified-positive-held-local-preview-replay-queue';
import type { UnifiedPositiveGuardedScannerReplayReport } from './unified-positive-guarded-scanner-replay';
import type { UnifiedPositiveHeldLocalTicketAdapterReport } from './unified-positive-held-local-ticket-adapter';
import type { UnifiedPositiveHeldLocalPreviewDecisionSummaryReport } from './unified-positive-held-local-preview-decision-summary';
import type { UnifiedPositiveHeldLocalPreviewPayloadReport } from './unified-positive-held-local-preview-payload';

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

const ticketId = '2026-06-16-morning-historicalReview-LONG';

const decisionSummary: UnifiedPositiveHeldLocalPreviewDecisionSummaryReport = {
  reportType: 'unified_positive_held_local_preview_decision_summary',
  generatedAt: '2026-07-17T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { rollupPath: 'rollup.json' },
  summary: {
    rollupRows: 2,
    holdForManualReviewRows: 1,
    keepLocalReviewOnlyRows: 0,
    requestMoreChartEvidenceRows: 0,
    excludedFromResearchQueueRows: 0,
    queuedForReplayResearchRows: 1,
    livePromotionAllowedRows: 0,
    systemReviewNoteRows: 1,
    missingPlanCautionRows: 1,
    systemNoteDrivenDecisionRows: 0,
  },
  rows: [
    {
      ticketId,
      setupType: 'historicalReview',
      direction: 'LONG',
      noteDisposition: 'candidate_for_later_research',
      decisionAction: 'queue_for_replay_research',
      systemReviewNotes: ['historicalReview long remains review-only: this cluster lacks full plan-level proof.'],
      systemNotesAffectDecision: false,
      researchOnly: true,
      livePromotionAllowed: false,
      nextStep: 'Queue for a separate read-only replay research run.',
      boundary: 'Research decision only.',
    },
    {
      ticketId: '2026-06-17-morning-NoInstalledSetup-SHORT',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      noteDisposition: 'unreviewed',
      decisionAction: 'hold_for_manual_review',
      systemReviewNotes: [],
      systemNotesAffectDecision: false,
      researchOnly: true,
      livePromotionAllowed: false,
      nextStep: 'Hold for review.',
      boundary: 'Research decision only.',
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const heldLocalAdapter: UnifiedPositiveHeldLocalTicketAdapterReport = {
  reportType: 'unified_positive_held_local_ticket_adapter',
  generatedAt: '2026-07-17T00:01:00.000Z',
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
  source: { contractComparisonPath: 'comparison.json' },
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
      ticketId,
      sourceSnapshotId: 'scanner-morning-2026-06-16-MES-MORNING-20260616-140147',
      session: 'morning',
      setupType: 'historicalReview',
      direction: 'LONG',
      adapterStatus: 'held_local_artifact_created',
      artifact: {
        ticketId,
        canExecute: false,
        publishDiscord: false,
        deskTicket: {
          entry: 7625.5,
          stop: 7621.5,
          t1: 7634.25,
          t2: 7636.5,
        },
        deskPublishDecision: {
          shouldPost: false,
          entry: 7625.5,
          stop: 7621.5,
          t1: 7634.25,
          t2: 7636.5,
        },
      } as UnifiedPositiveHeldLocalTicketAdapterReport['rows'][number]['artifact'],
      blockers: [],
    },
  ],
  recommendations: [],
  markdown: '',
};

const guardedReplay: UnifiedPositiveGuardedScannerReplayReport = {
  reportType: 'unified_positive_guarded_scanner_replay',
  generatedAt: '2026-07-17T00:02:00.000Z',
  status: 'pass',
  authority: {
    readOnly: true,
    localOnly: true,
    researchOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    runsLiveSetupScanner: false,
    changesScannerBehavior: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    changesRiskRules: false,
    changesBridgeBehavior: false,
    changesDiscordPosting: false,
  },
  source: { heldLocalAdapterPath: 'adapter.json' },
  output: {
    dryRunReplayJsonPath: 'dry-run.json',
    dryRunReplayMarkdownPath: 'dry-run.md',
    inspectionJsonPath: 'inspection.json',
    inspectionMarkdownPath: 'inspection.md',
  },
  summary: {
    explicitGuardEnabled: true,
    dryRunReplayStatus: 'pass',
    inspectionStatus: 'pass',
    heldLocalTickets: 1,
    zeroLivePublishBehaviorChangeRows: 1,
    inspectableTickets: 1,
    blockedRows: 0,
  },
  blockers: [],
  recommendations: [],
  markdown: '',
};

const previewPayload: UnifiedPositiveHeldLocalPreviewPayloadReport = {
  reportType: 'unified_positive_held_local_preview_payload',
  generatedAt: '2026-07-17T00:03:00.000Z',
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
  source: { inspectionSurfacePath: 'inspection.json', wordingGuardPath: 'wording.json', historicalReviewReviewNotePlacementSimulationPath: null },
  summary: {
    inspectionRowsLoaded: 1,
    previewPayloadsCreated: 1,
    blockedRows: 0,
    shouldPostFalsePayloads: 1,
    canExecuteFalsePayloads: 1,
    publishDiscordFalsePayloads: 1,
    shouldDispatchFalsePayloads: 1,
    writesSupabaseFalsePayloads: 1,
    reviewNotePlacementAppliedPayloads: 0,
  },
  rows: [
    {
      ticketId,
      sourceSnapshotId: 'scanner-morning-2026-06-16-MES-MORNING-20260616-140147',
      session: 'morning',
      setupType: 'historicalReview',
      direction: 'LONG',
      status: 'preview_payload_created',
      payload: {
        sourceOfTruth: 'scanner_owned_held_local_local_preview_payload',
        ticketId,
        sourceSnapshotId: 'scanner-morning-2026-06-16-MES-MORNING-20260616-140147',
        session: 'morning',
        setupType: 'historicalReview',
        direction: 'LONG',
        state: 'ACTIVE_REVIEW',
        publishDiscord: false,
        shouldPost: false,
        canExecute: false,
        shouldDispatch: false,
        writesSupabase: false,
        reviewOnly: true,
        humanReviewOnly: true,
        noAutomatedOrders: true,
        title: 'historicalReview LONG ACTIVE_REVIEW local preview',
        sections: {
          what: 'what',
          where: 'where',
          when: 'when',
          why: 'why',
          invalidation: 'invalidation',
        },
        levels: {
          lineInSand: 7625.5,
          entry: 7625.5,
          stop: 7621.5,
          t1: 7634.25,
          t2: 7636.5,
        },
        htfStatus: 'sufficient',
        notes: [],
      },
      blockers: [],
    },
  ],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewReplayQueueReport({
  decisionSummaryPath: 'decision.json',
  decisionSummaryReport: decisionSummary,
  heldLocalAdapterPath: 'adapter.json',
  heldLocalAdapterReport: heldLocalAdapter,
  guardedReplayPath: 'guarded.json',
  guardedReplayReport: guardedReplay,
  previewPayloadPath: 'payload.json',
  previewPayloadReport: previewPayload,
}, '2026-07-17T00:04:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_replay_queue');
assert.equal(report.status, 'pass');
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.decisionRows, 2);
assert.equal(report.summary.queuedRows, 1);
assert.equal(report.summary.replayReadyRows, 1);
assert.equal(report.summary.blockedRows, 0);
assert.equal(report.summary.grossOneMesPlAvailableRows, 0);
assert.equal(report.summary.grossOneMesPlUnavailableRows, 1);
assert.equal(report.summary.grossOneMesPl, null);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.explicitReviewerQueuedRows, 1);
assert.equal(report.summary.systemNoteDrivenQueueRows, 0);
assert.equal(report.rows[0].tradeDate, '2026-06-16');
assert.equal(report.rows[0].session, 'morning');
assert.equal(report.rows[0].queueSource, 'explicit_reviewer_candidate_for_later_research');
assert.equal(report.rows[0].systemNotesAffectQueue, false);
assert.equal(report.rows[0].riskPoints, 4);
assert.equal(report.rows[0].t1R, 2.19);
assert.equal(report.rows[0].t2R, 2.75);
assert.equal(report.rows[0].evidence.explicitReviewerDisposition, true);
assert.equal(report.rows[0].evidence.canExecute, false);
assert.equal(report.rows[0].evidence.publishDiscord, false);
assert.equal(report.rows[0].evidence.shouldPost, false);
assert.equal(report.rows[0].evidence.writesSupabase, false);
assert.equal(report.rows.some((row) => row.ticketId === '2026-06-17-morning-NoInstalledSetup-SHORT'), false);
assert.match(report.markdown, /local-only read-only replay queue evidence/);

const unsafeAdapter = structuredClone(heldLocalAdapter);
if (unsafeAdapter.rows[0].artifact) (unsafeAdapter.rows[0].artifact as { canExecute: boolean }).canExecute = true;
const unsafeReport = buildUnifiedPositiveHeldLocalPreviewReplayQueueReport({
  decisionSummaryPath: 'decision.json',
  decisionSummaryReport: decisionSummary,
  heldLocalAdapterPath: 'adapter.json',
  heldLocalAdapterReport: unsafeAdapter,
  guardedReplayPath: 'guarded.json',
  guardedReplayReport: guardedReplay,
  previewPayloadPath: 'payload.json',
  previewPayloadReport: previewPayload,
}, '2026-07-17T00:05:00.000Z');

assert.equal(unsafeReport.status, 'fail');
assert.equal(unsafeReport.summary.blockedRows, 1);
assert.ok(unsafeReport.blockers.some((blocker) => blocker.includes('canExecute=false proof is missing')));

const missingReport = buildUnifiedPositiveHeldLocalPreviewReplayQueueReport({
  decisionSummaryPath: null,
  decisionSummaryReport: null,
  heldLocalAdapterPath: null,
  heldLocalAdapterReport: null,
  guardedReplayPath: null,
  guardedReplayReport: null,
  previewPayloadPath: null,
  previewPayloadReport: null,
}, '2026-07-17T00:06:00.000Z');

assert.equal(missingReport.status, 'fail');
assert.ok(missingReport.blockers.includes('missing decision summary path'));
assert.ok(missingReport.blockers.includes('missing guarded replay report'));

console.log('unified positive held-local preview replay queue verified.');
