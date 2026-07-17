import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewTurtleSoupReviewNoteWordingProbeReport,
} from './unified-positive-held-local-preview-turtlesoup-review-note-wording-probe';
import type {
  UnifiedPositiveHeldLocalPreviewTurtleSoupBlockedReasonDrilldownReport,
} from './unified-positive-held-local-preview-turtlesoup-blocked-reason-drilldown';

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

const drilldownReport: UnifiedPositiveHeldLocalPreviewTurtleSoupBlockedReasonDrilldownReport = {
  reportType: 'unified_positive_held_local_preview_turtlesoup_blocked_reason_drilldown',
  generatedAt: '2026-07-17T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    reportDir: 'diagnostic-reports',
    turtleSoupReplayPackagePath: 'package.json',
    turtleSoupRankSimulationPath: 'rank-simulation.json',
  },
  assumptions: {
    drilldownIsResearchOnly: true,
    noRankPenaltyInstalled: true,
    noReviewNoteInstalled: true,
    noHardBlockInstalled: true,
    noModelRemoved: true,
    livePromotionAllowed: false,
  },
  summary: {
    packageRows: 4,
    blockedRows: 4,
    blockedWinners: 1,
    blockedLosses: 3,
    blockedUnresolved: 0,
    blockedOneMesPl: -210,
    clusters: 2,
    reviewNoteCandidateClusters: 1,
    rankPenaltyRejectedByPriorSimulation: true,
    recommendedAction: 'draft_review_note_wording_only',
    livePromotionAllowedRows: 0,
  },
  clusters: [
    {
      clusterId: 'missing_full_plan_levels|morning|LONG',
      reason: 'missing_full_plan_levels',
      session: 'morning',
      direction: 'LONG',
      rows: 4,
      winners: 1,
      losses: 3,
      unresolved: 0,
      oneMesPl: -210,
      reviewNoteCandidate: true,
    },
    {
      clusterId: 'missing_full_plan_levels|lunch|SHORT',
      reason: 'missing_full_plan_levels',
      session: 'lunch',
      direction: 'SHORT',
      rows: 3,
      winners: 2,
      losses: 0,
      unresolved: 1,
      oneMesPl: 140,
      reviewNoteCandidate: false,
    },
  ],
  sampleReviewNote: 'TurtleSoup remains valid, but this candidate is review-only.',
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewTurtleSoupReviewNoteWordingProbeReport({
  reportDir: 'diagnostic-reports',
  blockedReasonDrilldownPath: 'drilldown.json',
  blockedReasonDrilldownReport: drilldownReport,
}, '2026-07-17T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_turtlesoup_review_note_wording_probe');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.noReviewNoteInstalled, true);
assert.equal(report.assumptions.noTicketSuppression, true);
assert.equal(report.assumptions.noRankChange, true);
assert.equal(report.summary.clustersRead, 2);
assert.equal(report.summary.noteCandidateClusters, 1);
assert.equal(report.summary.wordingRows, 1);
assert.equal(report.summary.suppressTicketRows, 0);
assert.equal(report.summary.rankingChangeRows, 0);
assert.equal(report.summary.canExecuteChangeRows, 0);
assert.equal(report.summary.entryStopTargetChangeRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendedAction, 'keep_research_only_wording_candidate');
assert.equal(report.rows[0].suppressesTicket, false);
assert.equal(report.rows[0].changesRanking, false);
assert.equal(report.rows[0].changesCanExecute, false);
assert.match(report.rows[0].proposedNote, /Require fresh completed 5M entry/);
assert.match(report.markdown, /Review Note Wording Probe/);

const missing = buildUnifiedPositiveHeldLocalPreviewTurtleSoupReviewNoteWordingProbeReport({
  reportDir: 'diagnostic-reports',
  blockedReasonDrilldownPath: null,
  blockedReasonDrilldownReport: null,
}, '2026-07-17T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing TurtleSoup blocked reason drilldown path'));

console.log('unified positive held-local TurtleSoup review note wording probe verified.');
