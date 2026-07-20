import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewAfterLunchDistanceRatioLossMinerReport,
} from './unified-positive-held-local-preview-afterlunch-distance-ratio-loss-miner';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageReport } from './unified-positive-held-local-preview-replay-package';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport,
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow,
} from './unified-positive-held-local-preview-replay-package-source-proof-timing';

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

function timingRow(ticketId: string, proofTime: string, riskPoints: number, outcomeBucket: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow['outcomeBucket'], resolvedOneMesPl: number): UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow {
  return {
    ticketId,
    tradeDate: proofTime.slice(0, 10),
    session: 'lunch',
    setupType: 'AfterLunchDriveFvgContinuation',
    direction: 'LONG',
    outcomeBucket,
    outcomeLabel: outcomeBucket === 'loss_stopped_before_t1' ? 'stopped_before_t1' : 't1_and_t2_hit',
    resolvedOneMesPl,
    proofTime,
    entryHitTime: proofTime,
    proofToEntryMinutes: 0,
    riskPoints,
    mfeR: outcomeBucket === 'loss_stopped_before_t1' ? 3 : 2,
    maeR: outcomeBucket === 'loss_stopped_before_t1' ? 2 : 0.25,
    issueTags: [],
  };
}

const sourceProofTimingReport: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport = {
  reportType: 'unified_positive_held_local_preview_replay_package_source_proof_timing',
  generatedAt: '2026-07-20T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: 'reports', replayPackageOutcomePath: 'outcome.json' },
  assumptions: {
    usesReadOnlyOutcomeReportOnly: true,
    fullDeliveryWinnerMeansT1AndT2Hit: true,
    stoppedBeforeT1MeansTimingLoss: true,
    unresolvedRowsAreNotWinsOrLosses: true,
    staleEntryThresholdMinutes: 30,
    livePromotionAllowed: false,
  },
  summary: {
    evaluatedRows: 3,
    winners: 2,
    losses: 1,
    unresolved: 0,
    blocked: 0,
    grossResolvedOneMesPl: 175,
    positiveModelGroups: 1,
    negativeModelGroups: 0,
    unresolvedModelGroups: 0,
    livePromotionAllowedRows: 0,
  },
  modelTiming: [],
  rows: [
    timingRow('loss-tight', '2026-07-09T13:20:00', 5.88, 'loss_stopped_before_t1', -25),
    timingRow('win-wide-risk', '2026-07-10T13:20:00', 12, 'winner_t1_t2', 100),
    timingRow('win-clean', '2026-07-11T13:20:00', 5, 'winner_t1_t2', 100),
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

function replayRow(ticketId: string, proofTime: string): UnifiedPositiveHeldLocalPreviewReplayPackageReport['rows'][number] {
  return {
    ticketId,
    tradeDate: proofTime.slice(0, 10),
    session: 'lunch',
    instrument: 'MES',
    setupType: 'AfterLunchDriveFvgContinuation',
    direction: 'LONG',
    proofTime,
    firstSeenTime: proofTime,
    lastSeenTime: proofTime,
    occurrences: 1,
    entry: 100,
    stop: 94,
    t1: 109,
    t2: 112,
    riskPoints: 6,
    t1R: 1.5,
    t2R: 2,
    proofState: 'Conditional:Conditional:none',
    triageScore: 0,
    sourceTapePath: 'artifact.json',
    barsSource: 'scanner_decision_tape_completed_5m',
    barsLoaded: 100,
    barsAfterProof: 80,
    firstBarTime: '2026-07-09T09:15:00',
    lastBarTime: '2026-07-11T15:55:00',
    outcomeInputStatus: 'ready_for_read_only_outcome_replay',
    blockers: [],
  };
}

const replayPackageReport = {
  rows: [
    replayRow('loss-tight', '2026-07-09T13:20:00'),
    replayRow('win-wide-risk', '2026-07-10T13:20:00'),
    replayRow('win-clean', '2026-07-11T13:20:00'),
  ],
} as UnifiedPositiveHeldLocalPreviewReplayPackageReport;

function scannerCandidate(overrides: Record<string, unknown>) {
  return {
    setupType: 'AfterLunchDriveFvgContinuation',
    candidateState: 'HUMAN_REVIEW_READY',
    direction: 'LONG',
    entry: 100,
    stop: 94,
    targetRoom: {
      targetRoomStatus: 'blocked_before_t1',
      targetRoomReason: 'Clean 1.5R path unavailable: London Session High at 102 sits before T1.',
    },
    activeRuleset: {
      htfLineInSand: {
        status: 'blocked',
        lineInSand: 103,
        evidence: ['Latest structured completed 5M close: 102.75.'],
      },
    },
    modelConfidenceScore: 100,
    ...overrides,
  };
}

const scannerArtifactReport = {
  events: {
    '2026-07-09T13:20:00': {
      setupCandidateStatus: { statuses: [scannerCandidate({})] },
    },
    '2026-07-10T13:20:00': {
      setupCandidateStatus: { statuses: [scannerCandidate({})] },
    },
    '2026-07-11T13:20:00': {
      setupCandidateStatus: {
        statuses: [
          scannerCandidate({
            targetRoom: {
              targetRoomStatus: 'clean_t1_t2',
              targetRoomReason: 'Clean path to T1 and T2.',
            },
            activeRuleset: {
              htfLineInSand: {
                status: 'passed',
                lineInSand: 101,
                evidence: ['Latest structured completed 5M close: 101.25.'],
              },
            },
          }),
        ],
      },
    },
  },
};

const report = buildUnifiedPositiveHeldLocalPreviewAfterLunchDistanceRatioLossMinerReport({
  reportDir: 'reports',
  sourceProofTimingPath: 'source.json',
  replayPackagePath: 'replay.json',
  scannerArtifactPath: 'scanner.json',
  sourceProofTimingReport,
  replayPackageReport,
  scannerArtifactReport,
}, '2026-07-20T01:00:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_afterlunch_distance_ratio_loss_miner');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.sourceRows, 3);
assert.equal(report.summary.matchedRows, 3);
assert.equal(report.summary.winners, 2);
assert.equal(report.summary.losses, 1);
assert.equal(report.summary.researchCandidates >= 1, true);
assert.equal(report.summary.topResearchCandidateId, 'htfLineBlocked+riskPoints<=6+targetObstacleDistanceR<=0.35');
assert.equal(report.summary.recommendation, 'validate_compound_distance_separator_on_broader_replay');
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);

const top = report.separators[0];
assert.equal(top.decision, 'research_candidate');
assert.equal(top.winners, 0);
assert.equal(top.losses, 1);
assert.equal(report.rows[0].targetObstacleDistanceR, 0.34);
assert.equal(report.rows[0].latestCloseBeyondLine, false);

const missing = buildUnifiedPositiveHeldLocalPreviewAfterLunchDistanceRatioLossMinerReport({
  reportDir: 'reports',
  sourceProofTimingPath: null,
  replayPackagePath: 'replay.json',
  scannerArtifactPath: 'scanner.json',
  sourceProofTimingReport: null,
  replayPackageReport,
  scannerArtifactReport,
}, '2026-07-20T01:00:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing source/proof timing path'));

console.log('unified positive held-local AfterLunch distance/ratio loss miner verified.');
