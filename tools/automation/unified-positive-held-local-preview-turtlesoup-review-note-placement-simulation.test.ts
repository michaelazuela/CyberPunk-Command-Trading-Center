import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewTurtleSoupReviewNotePlacementSimulationReport,
} from './unified-positive-held-local-preview-turtlesoup-review-note-placement-simulation';
import type {
  UnifiedPositiveHeldLocalPreviewTurtleSoupReviewNoteWordingProbeReport,
} from './unified-positive-held-local-preview-turtlesoup-review-note-wording-probe';

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

const wordingProbeReport: UnifiedPositiveHeldLocalPreviewTurtleSoupReviewNoteWordingProbeReport = {
  reportType: 'unified_positive_held_local_preview_turtlesoup_review_note_wording_probe',
  generatedAt: '2026-07-17T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    reportDir: 'diagnostic-reports',
    blockedReasonDrilldownPath: 'drilldown.json',
  },
  assumptions: {
    wordingProbeIsResearchOnly: true,
    noReviewNoteInstalled: true,
    noTicketSuppression: true,
    noRankChange: true,
    noCanExecuteChange: true,
    noModelRemoved: true,
    livePromotionAllowed: false,
  },
  summary: {
    clustersRead: 1,
    noteCandidateClusters: 1,
    wordingRows: 1,
    suppressTicketRows: 0,
    rankingChangeRows: 0,
    canExecuteChangeRows: 0,
    entryStopTargetChangeRows: 0,
    livePromotionAllowedRows: 0,
    recommendedAction: 'keep_research_only_wording_candidate',
  },
  rows: [{
    clusterId: 'missing_full_plan_levels|morning|LONG',
    reason: 'missing_full_plan_levels',
    session: 'morning',
    direction: 'LONG',
    rows: 4,
    winners: 1,
    losses: 3,
    unresolved: 0,
    oneMesPl: -210,
    noteCandidate: true,
    proposedNote: 'TurtleSoup long remains review-only: require fresh completed 5M entry.',
    suppressesTicket: false,
    changesRanking: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    livePromotionAllowed: false,
  }],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewTurtleSoupReviewNotePlacementSimulationReport({
  reportDir: 'diagnostic-reports',
  reviewNoteWordingProbePath: 'wording.json',
  reviewNoteWordingProbeReport: wordingProbeReport,
}, '2026-07-17T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_turtlesoup_review_note_placement_simulation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.noPreviewUiChange, true);
assert.equal(report.assumptions.noTicketSuppression, true);
assert.equal(report.assumptions.noOrderChange, true);
assert.equal(report.summary.wordingRowsRead, 1);
assert.equal(report.summary.placementRows, 1);
assert.equal(report.summary.visibleBeforeRows, 1);
assert.equal(report.summary.visibleAfterRows, 1);
assert.equal(report.summary.orderPreservedRows, 1);
assert.equal(report.summary.suppressTicketRows, 0);
assert.equal(report.summary.rankingChangeRows, 0);
assert.equal(report.summary.canExecuteChangeRows, 0);
assert.equal(report.summary.discordPostingChangeRows, 0);
assert.equal(report.summary.supabaseWriteRows, 0);
assert.equal(report.summary.recommendedAction, 'keep_research_only_placement_candidate');
assert.equal(report.rows[0].placement, 'held_local_preview_notes');
assert.equal(report.rows[0].originalOrdinal, report.rows[0].simulatedOrdinal);
assert.equal(report.rows[0].ticketVisibleAfter, true);
assert.equal(report.rows[0].changesDiscordPosting, false);
assert.match(report.markdown, /Placement Simulation/);

const missing = buildUnifiedPositiveHeldLocalPreviewTurtleSoupReviewNotePlacementSimulationReport({
  reportDir: 'diagnostic-reports',
  reviewNoteWordingProbePath: null,
  reviewNoteWordingProbeReport: null,
}, '2026-07-17T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing TurtleSoup review-note wording probe path'));

console.log('unified positive held-local TurtleSoup review note placement simulation verified.');
