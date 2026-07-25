import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewraidReclaimActionProbeReport,
} from './unified-positive-held-local-preview-raidReclaim-action-probe';
import type {
  UnifiedPositiveHeldLocalPreviewraidReclaimReplayPackageReport,
} from './unified-positive-held-local-preview-raidReclaim-replay-package';

type PackageRow = UnifiedPositiveHeldLocalPreviewraidReclaimReplayPackageReport['rows'][number];

function row(id: string, group: PackageRow['group'], outcomeBucket: PackageRow['outcomeBucket'], pl: number): PackageRow {
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

const rows: PackageRow[] = [
  row('2026-06-17-morning-a', 'conditional_protected_stop_clean', 'winner', 100),
  row('2026-06-18-morning-a', 'conditional_protected_stop_clean', 'winner', 90),
  row('2026-06-19-lunch-a', 'conditional_protected_stop_clean', 'loss', -30),
  row('2026-06-20-morning-a', 'blocked_protected_stop', 'loss', -80),
  row('2026-06-21-morning-a', 'blocked_protected_stop', 'loss', -70),
  row('2026-06-22-lunch-a', 'blocked_protected_stop', 'loss', -60),
  row('2026-06-23-lunch-a', 'blocked_protected_stop', 'unresolved', 0),
];

const packageReport: UnifiedPositiveHeldLocalPreviewraidReclaimReplayPackageReport = {
  reportType: 'unified_positive_held_local_preview_raidReclaim_replay_package',
  generatedAt: '2026-07-17T00:00:00.000Z',
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
    raidReclaimRows: rows.length,
    conditionalProtectedStopCleanRows: 3,
    blockedProtectedStopRows: 4,
    otherraidReclaimStateRows: 0,
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

const report = buildUnifiedPositiveHeldLocalPreviewraidReclaimActionProbeReport({
  reportDir: 'diagnostic-reports',
  raidReclaimReplayPackagePath: 'package.json',
  raidReclaimReplayPackageReport: packageReport,
}, '2026-07-17T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_raidReclaim_action_probe');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.noRankPenaltyInstalled, true);
assert.equal(report.assumptions.noReviewNoteInstalled, true);
assert.equal(report.assumptions.noModelRemoved, true);
assert.equal(report.summary.packageRows, rows.length);
assert.equal(report.summary.rankPenaltyCandidates, 2);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.rows[0].decision, 'rank_penalty_candidate');
assert.equal(report.rows[0].affectedOneMesPl, -210);
assert.equal(report.rows[0].preservedOneMesPl, 160);
assert.match(report.markdown, /raidReclaim Action Probe/);

const missing = buildUnifiedPositiveHeldLocalPreviewraidReclaimActionProbeReport({
  reportDir: 'diagnostic-reports',
  raidReclaimReplayPackagePath: null,
  raidReclaimReplayPackageReport: null,
}, '2026-07-17T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing raidReclaim replay package path'));

console.log('unified positive held-local raidReclaim action probe verified.');
