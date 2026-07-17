import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewTurtleSoupRankSimulationReport,
} from './unified-positive-held-local-preview-turtlesoup-rank-simulation';
import type {
  UnifiedPositiveHeldLocalPreviewTurtleSoupRankPenaltyValidationReport,
} from './unified-positive-held-local-preview-turtlesoup-rank-penalty-validation';
import type {
  UnifiedPositiveHeldLocalPreviewTurtleSoupReplayPackageReport,
} from './unified-positive-held-local-preview-turtlesoup-replay-package';

type PackageRow = UnifiedPositiveHeldLocalPreviewTurtleSoupReplayPackageReport['rows'][number];

function packageRow(args: {
  id: string;
  group: PackageRow['group'];
  outcomeBucket: PackageRow['outcomeBucket'];
  pl: number | null;
  selected?: boolean;
  weak?: number;
}): PackageRow {
  return {
    rowId: args.id,
    tradeDate: args.id.slice(0, 10),
    session: args.id.includes('lunch') ? 'lunch' : 'morning',
    direction: args.id.includes('SHORT') ? 'SHORT' : 'LONG',
    group: args.group,
    outcomeBucket: args.outcomeBucket,
    resolvedOneMesPl: args.pl,
    proofTime: '2026-06-17T09:30:00',
    eventTime: '2026-06-17T09:30:00',
    sourceFile: 'tape.json',
    modelCandidateExecutionStatus: args.group === 'blocked_protected_stop' ? 'Blocked' : 'Conditional',
    modelCandidateState: 'HUMAN_REVIEW_READY',
    protectedStopEvidence: args.group === 'blocked_protected_stop',
    entryTriggerPendingEvidence: args.group !== 'blocked_protected_stop',
    modelCandidateHasFullPlanLevels: args.group !== 'blocked_protected_stop',
    scorecardWeakCount: args.weak ?? 0,
    selectedMatchesReviewedModel: args.selected ?? false,
  };
}

const rows = [
  packageRow({
    id: '2026-06-17-morning-TurtleSoup-LONG-blocked-winner',
    group: 'blocked_protected_stop',
    outcomeBucket: 'winner',
    pl: 50,
    selected: true,
  }),
  packageRow({
    id: '2026-06-17-morning-TurtleSoup-SHORT-clean-winner',
    group: 'conditional_protected_stop_clean',
    outcomeBucket: 'winner',
    pl: 120,
    weak: 3,
  }),
  packageRow({
    id: '2026-06-18-lunch-TurtleSoup-LONG-blocked-loss',
    group: 'blocked_protected_stop',
    outcomeBucket: 'loss',
    pl: -100,
    selected: true,
  }),
  packageRow({
    id: '2026-06-18-lunch-TurtleSoup-SHORT-clean-winner',
    group: 'conditional_protected_stop_clean',
    outcomeBucket: 'winner',
    pl: 150,
    weak: 3,
  }),
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
    conditionalProtectedStopCleanRows: 2,
    blockedProtectedStopRows: 2,
    otherTurtleSoupStateRows: 0,
    groupSummaries: 3,
    daySessionSummaries: 2,
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

const validationReport: UnifiedPositiveHeldLocalPreviewTurtleSoupRankPenaltyValidationReport = {
  reportType: 'unified_positive_held_local_preview_turtlesoup_rank_penalty_validation',
  generatedAt: '2026-07-17T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    reportDir: 'diagnostic-reports',
    turtleSoupReplayPackagePath: 'package.json',
    turtleSoupActionProbePath: 'probe.json',
  },
  assumptions: {
    validationIsResearchOnly: true,
    validatesRankPenaltyNotHardBlock: true,
    falseRejectWinnersMustRemainVisible: true,
    noRankPenaltyInstalled: true,
    noModelRemoved: true,
    livePromotionAllowed: false,
  },
  summary: {
    packageRows: rows.length,
    affectedRows: 2,
    affectedWinners: 1,
    affectedLosses: 1,
    affectedUnresolved: 0,
    affectedOneMesPl: -50,
    preservedRows: 2,
    preservedWinners: 2,
    preservedLosses: 0,
    preservedUnresolved: 0,
    preservedOneMesPl: 270,
    falseRejectWinnerRows: 1,
    segmentSummaries: 0,
    recommendation: 'validate_research_rank_penalty_only',
    livePromotionAllowedRows: 0,
  },
  segments: [],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewTurtleSoupRankSimulationReport({
  reportDir: 'diagnostic-reports',
  turtleSoupReplayPackagePath: 'package.json',
  turtleSoupReplayPackageReport: packageReport,
  turtleSoupRankPenaltyValidationPath: 'validation.json',
  turtleSoupRankPenaltyValidationReport: validationReport,
}, '2026-07-17T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_turtlesoup_rank_simulation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.assumptions.usesOutcomeForEvaluationNotScoring, true);
assert.equal(report.scoring.baselineDoesNotUseOutcome, true);
assert.equal(report.summary.slates, 2);
assert.equal(report.summary.penalizedRows, 2);
assert.equal(report.summary.topChangedSlates, 2);
assert.equal(report.summary.blockedTopBeforeSlates, 2);
assert.equal(report.summary.blockedTopAfterSlates, 0);
assert.equal(report.summary.topBeforeOneMesPl, -50);
assert.equal(report.summary.topAfterOneMesPl, 270);
assert.equal(report.summary.topSelectionDeltaOneMesPl, 320);
assert.equal(report.summary.falseWinnerDemotions, 1);
assert.equal(report.summary.hardBlockFalseRejectWinners, 1);
assert.equal(report.summary.recommendation, 'continue_research_rank_penalty_with_false_winner_review');
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.ok(report.rows.some((row) => row.falseWinnerDemotion));
assert.match(report.markdown, /Rank Simulation/);

const missing = buildUnifiedPositiveHeldLocalPreviewTurtleSoupRankSimulationReport({
  reportDir: 'diagnostic-reports',
  turtleSoupReplayPackagePath: null,
  turtleSoupReplayPackageReport: null,
  turtleSoupRankPenaltyValidationPath: null,
  turtleSoupRankPenaltyValidationReport: null,
}, '2026-07-17T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing TurtleSoup replay package path'));

console.log('unified positive held-local TurtleSoup rank simulation verified.');
