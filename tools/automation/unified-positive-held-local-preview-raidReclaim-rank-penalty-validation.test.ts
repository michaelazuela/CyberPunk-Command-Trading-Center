import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewhistoricalReviewRankPenaltyValidationReport,
} from './unified-positive-held-local-preview-raidReclaim-rank-penalty-validation';
import type {
  UnifiedPositiveHeldLocalPreviewhistoricalReviewActionProbeReport,
} from './unified-positive-held-local-preview-raidReclaim-action-probe';
import type {
  UnifiedPositiveHeldLocalPreviewhistoricalReviewReplayPackageReport,
} from './unified-positive-held-local-preview-raidReclaim-replay-package';

type PackageRow = UnifiedPositiveHeldLocalPreviewhistoricalReviewReplayPackageReport['rows'][number];

function packageRow(id: string, group: PackageRow['group'], outcomeBucket: PackageRow['outcomeBucket'], pl: number): PackageRow {
  return {
    rowId: id,
    tradeDate: id.slice(0, 10),
    session: id.includes('lunch') ? 'lunch' : 'morning',
    direction: 'LONG',
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
    scorecardWeakCount: group === 'blocked_protected_stop' ? 3 : 1,
    selectedMatchesReviewedModel: true,
  };
}

const rows = [
  packageRow('2026-06-17-morning-clean-1', 'conditional_protected_stop_clean', 'winner', 100),
  packageRow('2026-06-18-lunch-clean-1', 'conditional_protected_stop_clean', 'winner', 90),
  packageRow('2026-06-19-morning-clean-1', 'conditional_protected_stop_clean', 'loss', -30),
  packageRow('2026-06-20-morning-blocked-1', 'blocked_protected_stop', 'winner', 20),
  packageRow('2026-06-21-morning-blocked-1', 'blocked_protected_stop', 'loss', -80),
  packageRow('2026-06-22-lunch-blocked-1', 'blocked_protected_stop', 'loss', -70),
  packageRow('2026-06-23-lunch-blocked-1', 'blocked_protected_stop', 'loss', -60),
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

const packageReport: UnifiedPositiveHeldLocalPreviewhistoricalReviewReplayPackageReport = {
  reportType: 'unified_positive_held_local_preview_historicalReview_replay_package',
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
    historicalReviewRows: rows.length,
    conditionalProtectedStopCleanRows: 3,
    blockedProtectedStopRows: 4,
    otherhistoricalReviewStateRows: 0,
    groupSummaries: 3,
    daySessionSummaries: 7,
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

const actionProbeReport: UnifiedPositiveHeldLocalPreviewhistoricalReviewActionProbeReport = {
  reportType: 'unified_positive_held_local_preview_historicalReview_action_probe',
  generatedAt: '2026-07-17T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: 'diagnostic-reports', historicalReviewReplayPackagePath: 'package.json' },
  assumptions: {
    probesAreResearchOnly: true,
    noRankPenaltyInstalled: true,
    noReviewNoteInstalled: true,
    noModelRemoved: true,
    livePromotionAllowed: false,
  },
  summary: {
    packageRows: rows.length,
    probesEvaluated: 1,
    rankPenaltyCandidates: 1,
    reviewNoteCandidates: 0,
    rejectedProbes: 0,
    livePromotionAllowedRows: 0,
  },
  rows: [],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewhistoricalReviewRankPenaltyValidationReport({
  reportDir: 'diagnostic-reports',
  historicalReviewReplayPackagePath: 'package.json',
  historicalReviewReplayPackageReport: packageReport,
  historicalReviewActionProbePath: 'probe.json',
  historicalReviewActionProbeReport: actionProbeReport,
}, '2026-07-17T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_historicalReview_rank_penalty_validation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.validatesRankPenaltyNotHardBlock, true);
assert.equal(report.assumptions.falseRejectWinnersMustRemainVisible, true);
assert.equal(report.assumptions.noRankPenaltyInstalled, true);
assert.equal(report.summary.affectedWinners, 1);
assert.equal(report.summary.affectedLosses, 3);
assert.equal(report.summary.falseRejectWinnerRows, 1);
assert.equal(report.summary.recommendation, 'validate_research_rank_penalty_only');
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.ok(report.segments.length > 0);
assert.match(report.markdown, /Rank Penalty Validation/);

const missing = buildUnifiedPositiveHeldLocalPreviewhistoricalReviewRankPenaltyValidationReport({
  reportDir: 'diagnostic-reports',
  historicalReviewReplayPackagePath: null,
  historicalReviewReplayPackageReport: null,
  historicalReviewActionProbePath: null,
  historicalReviewActionProbeReport: null,
}, '2026-07-17T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing historicalReview replay package path'));

console.log('unified positive held-local historicalReview rank penalty validation verified.');
