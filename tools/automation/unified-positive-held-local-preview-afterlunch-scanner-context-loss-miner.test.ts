import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewAfterLunchScannerContextLossMinerReport,
} from './unified-positive-held-local-preview-afterlunch-scanner-context-loss-miner';
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

function timingRow(ticketId: string, proofTime: string, outcomeBucket: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow['outcomeBucket'], resolvedOneMesPl: number): UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow {
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
    riskPoints: 6,
    mfeR: outcomeBucket === 'loss_stopped_before_t1' ? 4 : 2,
    maeR: outcomeBucket === 'loss_stopped_before_t1' ? 3 : 0.25,
    issueTags: outcomeBucket === 'loss_stopped_before_t1'
      ? ['stopped_before_t1', 'same_bar_entry', 'adverse_excursion_at_or_over_1r']
      : ['full_delivery', 'same_bar_entry'],
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
    grossResolvedOneMesPl: 170,
    positiveModelGroups: 1,
    negativeModelGroups: 0,
    unresolvedModelGroups: 0,
    livePromotionAllowedRows: 0,
  },
  modelTiming: [],
  rows: [
    timingRow('win-clean', '2026-07-08T12:40:00', 'winner_t1_t2', 100),
    timingRow('win-wide', '2026-07-08T12:45:00', 'winner_t1_t2', 95),
    timingRow('loss-obstructed', '2026-07-09T13:20:00', 'loss_stopped_before_t1', -25),
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const replayPackageReport = {
  reportType: 'unified_positive_held_local_preview_replay_package',
  generatedAt: '2026-07-20T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: 'reports', queuePath: 'queue.json', artifactPath: 'artifact.json' },
  assumptions: {
    savedReportsOnly: true,
    readOnlyReplayPackage: true,
    livePromotionAllowed: false,
  },
  summary: {
    selectedRowsRead: 3,
    replayPackageRows: 3,
    readyRows: 3,
    blockedRows: 0,
    directionallyInvalidGeometryRows: 0,
    modelGroups: 1,
    sessionGroups: 1,
    livePromotionAllowedRows: 0,
  },
  rows: [
    replayRow('win-clean', '2026-07-08T12:40:00'),
    replayRow('win-wide', '2026-07-08T12:45:00'),
    replayRow('loss-obstructed', '2026-07-09T13:20:00'),
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
} as unknown as UnifiedPositiveHeldLocalPreviewReplayPackageReport;

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
    entry: 7587.125,
    stop: 7581.25,
    t1: 7596,
    t2: 7599,
    riskPoints: 5.88,
    t1R: 1.5,
    t2R: 2,
    proofState: 'Conditional:Conditional:none',
    triageScore: 0,
    sourceTapePath: 'artifact.json',
    barsSource: 'scanner_decision_tape_completed_5m',
    barsLoaded: 100,
    barsAfterProof: 80,
    firstBarTime: '2026-07-08T09:15:00',
    lastBarTime: '2026-07-09T15:55:00',
    outcomeInputStatus: 'ready_for_read_only_outcome_replay',
    blockers: [],
  };
}

function scannerCandidate(overrides: Record<string, unknown> = {}) {
  return {
    setupType: 'AfterLunchDriveFvgContinuation',
    candidateState: 'HUMAN_REVIEW_READY',
    humanReview: {
      status: 'HumanReviewReady',
      canExecute: false,
      requiresTraderConfirmation: true,
      discordTradePlanEligible: true,
      reason: 'Ready for human review.',
    },
    direction: 'LONG',
    detectedStatus: 'Conditional',
    entry: 7587.125,
    stop: 7581.25,
    target1: 7596,
    target2: 7599,
    targetRoom: {
      targetRoomStatus: 'clean_to_t1',
      cleanPathToT1: true,
      obstacleBeforeT1: false,
      targetRoomReason: 'Clean path available.',
    },
    riskAdvisoryStatus: 'RISK_ABOVE_STANDARD_LIMIT',
    riskPolicy: 'STRUCTURAL_RISK_ACKNOWLEDGED',
    modelConfidenceScore: 90,
    evidence: [
      'Active timeframe MSS pass: completed 5M bullish MSS is aligned with candidate direction.',
    ],
    executionStatus: 'Conditional',
    blockReason: null,
    activeRuleset: {
      timeframeMss: { status: 'passed' },
      htfLineInSand: { status: 'passed', lineInSand: 7590 },
    },
    tacticalZone: { formedAt: '2026-07-09T13:10:00' },
    ...overrides,
  };
}

const scannerArtifactReport = {
  events: {
    '2026-07-08T12:40:00': {
      setupCandidateStatus: { statuses: [scannerCandidate()] },
    },
    '2026-07-08T12:45:00': {
      setupCandidateStatus: { statuses: [scannerCandidate({ targetRoom: { targetRoomStatus: 'blocked_before_t1', cleanPathToT1: false, obstacleBeforeT1: true, targetRoomReason: 'Obstacle before T1.' } })] },
    },
    '2026-07-09T13:20:00': {
      setupCandidateStatus: {
        statuses: [
          scannerCandidate({
            targetRoom: {
              targetRoomStatus: 'blocked_before_t1',
              cleanPathToT1: false,
              obstacleBeforeT1: true,
              targetRoomReason: 'London Session High sits before T1.',
            },
            evidence: [
              'HTF caution: opposing completed HTF MSS on 60M, 120M, 240M is reported for human review.',
              'Active timeframe MSS pass: completed 5M bullish MSS is aligned with candidate direction.',
            ],
            activeRuleset: {
              timeframeMss: { status: 'passed' },
              htfLineInSand: { status: 'blocked', lineInSand: 7590 },
            },
          }),
        ],
      },
    },
  },
};

const report = buildUnifiedPositiveHeldLocalPreviewAfterLunchScannerContextLossMinerReport({
  reportDir: 'reports',
  sourceProofTimingPath: 'source.json',
  replayPackagePath: 'replay.json',
  scannerArtifactPath: 'scanner.json',
  sourceProofTimingReport,
  replayPackageReport,
  scannerArtifactReport,
}, '2026-07-20T01:00:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_afterlunch_scanner_context_loss_miner');
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
assert.equal(report.summary.lossRowsWithTargetRoomBlockedBeforeT1, 1);
assert.equal(report.summary.winnerRowsWithTargetRoomBlockedBeforeT1, 1);
assert.equal(report.summary.lossRowsWithHtfLineBlocked, 1);
assert.equal(report.summary.winnerRowsWithHtfLineBlocked, 0);
assert.equal(report.summary.lossRowsWithOpposingHtfMssCaution, 1);
assert.equal(report.summary.winnerRowsWithOpposingHtfMssCaution, 0);
assert.equal(report.summary.topSeparatorId, 'htfLineBlocked=true');
assert.equal(report.summary.recommendation, 'validate_target_room_caution_as_review_note');
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.equal(report.lossRows[0].targetRoomReason, 'London Session High sits before T1.');

const missing = buildUnifiedPositiveHeldLocalPreviewAfterLunchScannerContextLossMinerReport({
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
assert.ok(missing.blockers.includes('missing source/proof timing report'));

console.log('unified positive held-local AfterLunch scanner-context loss miner verified.');
