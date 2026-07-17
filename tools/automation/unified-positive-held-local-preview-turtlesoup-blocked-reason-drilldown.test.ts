import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewTurtleSoupBlockedReasonDrilldownReport,
} from './unified-positive-held-local-preview-turtlesoup-blocked-reason-drilldown';
import type {
  UnifiedPositiveHeldLocalPreviewTurtleSoupRankSimulationReport,
} from './unified-positive-held-local-preview-turtlesoup-rank-simulation';
import type {
  UnifiedPositiveHeldLocalPreviewTurtleSoupReplayPackageReport,
} from './unified-positive-held-local-preview-turtlesoup-replay-package';

type PackageRow = UnifiedPositiveHeldLocalPreviewTurtleSoupReplayPackageReport['rows'][number];

function packageRow(id: string, group: PackageRow['group'], outcomeBucket: PackageRow['outcomeBucket'], pl: number | null): PackageRow {
  return {
    rowId: id,
    tradeDate: id.slice(0, 10),
    session: id.includes('lunch') ? 'lunch' : 'morning',
    direction: id.includes('SHORT') ? 'SHORT' : 'LONG',
    group,
    outcomeBucket,
    resolvedOneMesPl: pl,
    proofTime: '2026-06-17T09:30:00',
    eventTime: '2026-06-17T09:30:00',
    sourceFile: 'tape.json',
    modelCandidateExecutionStatus: group === 'blocked_protected_stop' ? 'Blocked' : 'Conditional',
    modelCandidateState: 'HUMAN_REVIEW_READY',
    protectedStopEvidence: group === 'blocked_protected_stop',
    entryTriggerPendingEvidence: group !== 'blocked_protected_stop',
    modelCandidateHasFullPlanLevels: group !== 'blocked_protected_stop',
    scorecardWeakCount: group === 'blocked_protected_stop' ? 2 : 1,
    selectedMatchesReviewedModel: false,
  };
}

const rows = [
  packageRow('2026-06-17-morning-TurtleSoup-LONG-blocked-loss-1', 'blocked_protected_stop', 'loss', -100),
  packageRow('2026-06-17-morning-TurtleSoup-LONG-blocked-loss-2', 'blocked_protected_stop', 'loss', -80),
  packageRow('2026-06-18-morning-TurtleSoup-LONG-blocked-loss-3', 'blocked_protected_stop', 'loss', -70),
  packageRow('2026-06-19-morning-TurtleSoup-LONG-blocked-win-1', 'blocked_protected_stop', 'winner', 40),
  packageRow('2026-06-19-morning-TurtleSoup-SHORT-blocked-win-1', 'blocked_protected_stop', 'winner', 120),
  packageRow('2026-06-19-morning-TurtleSoup-SHORT-blocked-win-2', 'blocked_protected_stop', 'winner', 80),
  packageRow('2026-06-20-lunch-TurtleSoup-SHORT-clean-win-1', 'conditional_protected_stop_clean', 'winner', 120),
];

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

const packageReport: UnifiedPositiveHeldLocalPreviewTurtleSoupReplayPackageReport = {
  reportType: 'unified_positive_held_local_preview_turtlesoup_replay_package',
  generatedAt: '2026-07-17T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    reportDir: 'diagnostic-reports',
    structuredSnapshotMinerPath: 'miner.json',
    structuredSnapshotValidationPath: 'validation.json',
  },
  assumptions: {
    packageIsResearchOnly: true,
    usesPriorLocalSnapshotRowsOnly: true,
    noLiveReplayExecuted: true,
    noRankPenaltyInstalled: true,
    noModelRemoved: true,
    livePromotionAllowed: false,
  },
  summary: {
    sourceRows: rows.length,
    turtleSoupRows: rows.length,
    conditionalProtectedStopCleanRows: 1,
    blockedProtectedStopRows: 6,
    otherTurtleSoupStateRows: 0,
    groupSummaries: 3,
    daySessionSummaries: 5,
    replayQuestion: 'candidate_for_broader_replay',
    livePromotionAllowedRows: 0,
  },
  groups: [],
  daySessions: [],
  rows,
  blockers: [],
  recommendations: [],
  markdown: '',
};

const rankSimulationReport = {
  reportType: 'unified_positive_held_local_preview_turtlesoup_rank_simulation',
  generatedAt: '2026-07-17T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    reportDir: 'diagnostic-reports',
    turtleSoupReplayPackagePath: 'package.json',
    turtleSoupRankPenaltyValidationPath: 'validation.json',
  },
  assumptions: {
    simulationIsResearchOnly: true,
    noRankPenaltyInstalled: true,
    noHardBlockInstalled: true,
    noModelRemoved: true,
    sameDateSessionSlateOnly: true,
    usesOutcomeForEvaluationNotScoring: true,
    livePromotionAllowed: false,
  },
  scoring: {
    blockedProtectedStopPenaltyPoints: 25,
    baselineDoesNotUseOutcome: true,
  },
  summary: {
    packageRows: rows.length,
    simulatedRows: rows.length,
    slates: 5,
    penalizedRows: 6,
    topChangedSlates: 0,
    blockedTopBeforeSlates: 3,
    blockedTopAfterSlates: 3,
    topBeforeOneMesPl: -210,
    topAfterOneMesPl: -210,
    topSelectionDeltaOneMesPl: 0,
    falseWinnerDemotions: 0,
    hardBlockFalseRejectWinners: 1,
    recommendation: 'reject_rank_penalty',
    livePromotionAllowedRows: 0,
  },
  rows: [],
  slates: [],
  blockers: [],
  recommendations: [],
  markdown: '',
} satisfies UnifiedPositiveHeldLocalPreviewTurtleSoupRankSimulationReport;

const report = buildUnifiedPositiveHeldLocalPreviewTurtleSoupBlockedReasonDrilldownReport({
  reportDir: 'diagnostic-reports',
  turtleSoupReplayPackagePath: 'package.json',
  turtleSoupReplayPackageReport: packageReport,
  turtleSoupRankSimulationPath: 'rank-simulation.json',
  turtleSoupRankSimulationReport: rankSimulationReport,
}, '2026-07-17T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_turtlesoup_blocked_reason_drilldown');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.noReviewNoteInstalled, true);
assert.equal(report.summary.blockedRows, 6);
assert.equal(report.summary.blockedWinners, 3);
assert.equal(report.summary.blockedLosses, 3);
assert.equal(report.summary.blockedOneMesPl, -10);
assert.equal(report.summary.rankPenaltyRejectedByPriorSimulation, true);
assert.equal(report.summary.reviewNoteCandidateClusters, 2);
assert.equal(report.summary.recommendedAction, 'draft_review_note_wording_only');
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.clusters.find((cluster) => cluster.clusterId === 'missing_full_plan_levels|morning|SHORT')?.reviewNoteCandidate, true);
assert.match(report.sampleReviewNote ?? '', /TurtleSoup remains valid/);
assert.match(report.markdown, /Blocked Reason Drilldown/);

const missing = buildUnifiedPositiveHeldLocalPreviewTurtleSoupBlockedReasonDrilldownReport({
  reportDir: 'diagnostic-reports',
  turtleSoupReplayPackagePath: null,
  turtleSoupReplayPackageReport: null,
  turtleSoupRankSimulationPath: null,
  turtleSoupRankSimulationReport: null,
}, '2026-07-17T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing TurtleSoup replay package path'));

console.log('unified positive held-local TurtleSoup blocked reason drilldown verified.');
