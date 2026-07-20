import assert from 'node:assert/strict';
import { buildUnifiedPositiveHeldLocalPreviewSweepBoostCollisionSnapshotGuardMinerReport } from './unified-positive-held-local-preview-sweep-boost-collision-snapshot-guard-miner';
import type { UnifiedPositiveHeldLocalPreviewSweepBoostCollisionDrilldownReport } from './unified-positive-held-local-preview-sweep-boost-collision-drilldown';

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

function collision(ticketId: string, bucket: 'improved' | 'worsened' | 'same', deltaOneMesPl: number, overrides: Partial<UnifiedPositiveHeldLocalPreviewSweepBoostCollisionDrilldownReport['rows'][number]> = {}): UnifiedPositiveHeldLocalPreviewSweepBoostCollisionDrilldownReport['rows'][number] {
  const [date, session] = ticketId.split('-');
  return {
    slateId: `${date}|${session}`,
    tradeDate: date,
    session,
    bucket,
    deltaOneMesPl,
    topChanged: true,
    before: {
      ticketId: 'before',
      setupType: 'OpeningDriveFvgContinuation',
      outcomeBucket: 'winner_t1_t2',
      resolvedOneMesPl: bucket === 'worsened' ? 100 : 25,
      direction: 'SHORT',
      proofTime: `${date}T09:35:00`,
      proofToEntryMinutes: 5,
      proofToEntryBucket: '1-10m',
      riskPoints: 8,
      riskBucket: '6.25-8',
      mfeR: 2,
      maeR: 0.2,
      issueTags: ['full_delivery'],
    },
    after: {
      ticketId,
      setupType: 'SweepMssFvgRetrace',
      outcomeBucket: bucket === 'improved' ? 'winner_t1_t2' : 'loss_stopped_before_t1',
      resolvedOneMesPl: bucket === 'improved' ? 80 : -90,
      direction: 'SHORT',
      proofTime: `${date}T09:35:00`,
      proofToEntryMinutes: 0,
      proofToEntryBucket: 'same_bar',
      riskPoints: 7,
      riskBucket: '6.25-8',
      mfeR: 0.5,
      maeR: 1.4,
      issueTags: ['same_bar_entry'],
    },
    ...overrides,
  };
}

function report(row: UnifiedPositiveHeldLocalPreviewSweepBoostCollisionDrilldownReport['rows'][number]): UnifiedPositiveHeldLocalPreviewSweepBoostCollisionDrilldownReport {
  return {
    reportType: 'unified_positive_held_local_preview_sweep_boost_collision_drilldown',
    generatedAt: '2026-07-20T00:00:00.000Z',
    status: 'pass',
    authority,
    source: {
      reportDir: 'reports',
      sourceProofTimingPath: 'timing.json',
      boostValidationPath: 'boost.json',
      selectedSetupTypes: ['SweepMssFvgRetrace'],
    },
    assumptions: {
      savedReportsOnly: true,
      sweepOnlyBoostReportsExpected: true,
      outcomesUsedOnlyForEvaluation: true,
      noRuntimeRankingChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      changedSlates: 1,
      improvedSlates: row.bucket === 'improved' ? 1 : 0,
      worsenedSlates: row.bucket === 'worsened' ? 1 : 0,
      sameSlates: row.bucket === 'same' ? 1 : 0,
      changedTopSelectionDeltaOneMesPl: row.deltaOneMesPl,
      worsenedDeltaOneMesPl: row.bucket === 'worsened' ? row.deltaOneMesPl : null,
      worsenedWhereAfterSweep: row.bucket === 'worsened' ? 1 : 0,
      worsenedWhereBeforeWinner: row.bucket === 'worsened' ? 1 : 0,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: 'mine_worsened_sweep_guard',
    },
    worsenedByBeforeSetup: [],
    worsenedByAfterIssueTag: [],
    worsenedByAfterProofToEntryBucket: [],
    worsenedByAfterRiskBucket: [],
    rows: [row],
    blockers: [],
    recommendations: [],
    markdown: '',
  };
}

function artifact(ticketId: string, text: string) {
  const parts = ticketId.split('-');
  const date = parts.slice(0, 3).join('-');
  const session = parts[3];
  const direction = parts[5];
  const stamp = parts[6];
  const compact = stamp.slice(0, 4) + '-' + stamp.slice(4, 6) + '-' + stamp.slice(6, 11) + ':' + stamp.slice(11, 13) + ':' + stamp.slice(13, 15);
  return {
    events: {
      [compact]: {
        eventTime: compact,
        date,
        session,
        setupCandidateStatus: {
          statuses: [{
            setupType: 'SweepMssFvgRetrace',
            direction,
            confidence: 'High',
            riskPoints: 7,
            riskPolicy: 'STANDARD_RISK',
            rankScore: 126,
            targetRoom: {
              targetRoomStatus: 'blocked_before_t1',
              targetRoomReason: text,
            },
            levelContextSummary: text,
            evidence: [text],
            missingEvidence: ['Opposing completed 5M MSS caution.'],
            activeRuleset: {
              htfLineInSand: { status: 'blocked', obstacleSource: 'rth', obstacleType: 'imbalance_zone' },
            },
          }],
        },
      },
    },
  };
}

const trainTicket = '2026-07-09-morning-SweepMssFvgRetrace-SHORT-20260709T093500';
const testTicket = '2026-07-10-morning-SweepMssFvgRetrace-SHORT-20260710T093500';
const improvedTicket = '2026-07-11-morning-SweepMssFvgRetrace-SHORT-20260711T093500';

const mined = buildUnifiedPositiveHeldLocalPreviewSweepBoostCollisionSnapshotGuardMinerReport({
  reportDir: 'reports',
  trainCollisionPath: 'train.json',
  trainCollisionReport: report(collision(trainTicket, 'worsened', -120)),
  trainArtifactPath: 'train-artifact.json',
  trainArtifact: artifact(trainTicket, 'RTH Morning imbalance and opposing completed 5M MSS caution.'),
  testCollisionPath: 'test.json',
  testCollisionReport: report(collision(testTicket, 'worsened', -80)),
  testArtifactPath: 'test-artifact.json',
  testArtifact: artifact(testTicket, 'RTH Morning imbalance and opposing completed 5M MSS caution.'),
}, '2026-07-20T00:01:00.000Z');

assert.equal(mined.reportType, 'unified_positive_held_local_preview_sweep_boost_collision_snapshot_guard_miner');
assert.equal(mined.status, 'pass');
assert.equal(mined.authority.changesTradingLogic, false);
assert.equal(mined.authority.changesCanExecute, false);
assert.equal(mined.summary.trainRows, 1);
assert.equal(mined.summary.testRows, 1);
assert.equal(mined.summary.trainMatchedRows, 1);
assert.equal(mined.summary.testMatchedRows, 1);
assert.equal(mined.summary.cautionCandidates > 0, true);
assert.equal(mined.summary.recommendation, 'validate_caution_candidate');
assert.ok(mined.cautionCandidates.some((row) => row.feature === 'txt_rth_morning'));
assert.match(mined.markdown, /Snapshot Guard Miner/);

const withImprovedCollision = buildUnifiedPositiveHeldLocalPreviewSweepBoostCollisionSnapshotGuardMinerReport({
  reportDir: 'reports',
  trainCollisionPath: 'train.json',
  trainCollisionReport: report(collision(improvedTicket, 'improved', 55)),
  trainArtifactPath: 'train-artifact.json',
  trainArtifact: artifact(improvedTicket, 'RTH Morning imbalance and opposing completed 5M MSS caution.'),
  testCollisionPath: 'test.json',
  testCollisionReport: report(collision(testTicket, 'worsened', -80)),
  testArtifactPath: 'test-artifact.json',
  testArtifact: artifact(testTicket, 'RTH Morning imbalance and opposing completed 5M MSS caution.'),
}, '2026-07-20T00:02:00.000Z');

assert.equal(withImprovedCollision.summary.cautionCandidates, 0);

const missing = buildUnifiedPositiveHeldLocalPreviewSweepBoostCollisionSnapshotGuardMinerReport({
  reportDir: 'reports',
  trainCollisionPath: null,
  trainArtifactPath: null,
  testCollisionPath: null,
  testArtifactPath: null,
  trainCollisionReport: null,
  trainArtifact: null,
  testCollisionReport: null,
  testArtifact: null,
}, '2026-07-20T00:03:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing train collision drilldown path'));
assert.ok(missing.blockers.includes('missing train raw scanner artifact path'));

console.log('unified positive held-local Sweep boost collision snapshot guard miner verified.');
