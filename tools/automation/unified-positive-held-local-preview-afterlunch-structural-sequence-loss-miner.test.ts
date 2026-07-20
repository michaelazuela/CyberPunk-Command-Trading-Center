import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewAfterLunchStructuralSequenceLossMinerReport,
} from './unified-positive-held-local-preview-afterlunch-structural-sequence-loss-miner';
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

function timingRow(ticketId: string, proofTime: string, direction: 'LONG' | 'SHORT', outcomeBucket: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow['outcomeBucket'], resolvedOneMesPl: number): UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow {
  return {
    ticketId,
    tradeDate: proofTime.slice(0, 10),
    session: 'lunch',
    setupType: 'AfterLunchDriveFvgContinuation',
    direction,
    outcomeBucket,
    outcomeLabel: outcomeBucket === 'loss_stopped_before_t1' ? 'stopped_before_t1' : 't1_and_t2_hit',
    resolvedOneMesPl,
    proofTime,
    entryHitTime: proofTime,
    proofToEntryMinutes: 0,
    riskPoints: 5,
    mfeR: outcomeBucket === 'loss_stopped_before_t1' ? 0.5 : 2,
    maeR: outcomeBucket === 'loss_stopped_before_t1' ? 1 : 0.25,
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
    winners: 1,
    losses: 2,
    unresolved: 0,
    blocked: 0,
    grossResolvedOneMesPl: 0,
    positiveModelGroups: 1,
    negativeModelGroups: 0,
    unresolvedModelGroups: 0,
    livePromotionAllowedRows: 0,
  },
  modelTiming: [],
  rows: [
    timingRow('loss-short-line-behind', '2026-07-09T13:15:00', 'SHORT', 'loss_stopped_before_t1', -25),
    timingRow('loss-long-line-behind', '2026-07-10T13:20:00', 'LONG', 'loss_stopped_before_t1', -25),
    timingRow('win-line-ahead', '2026-07-11T13:25:00', 'LONG', 'winner_t1_t2', 50),
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

function replayRow(ticketId: string, proofTime: string, direction: 'LONG' | 'SHORT'): UnifiedPositiveHeldLocalPreviewReplayPackageReport['rows'][number] {
  return {
    ticketId,
    tradeDate: proofTime.slice(0, 10),
    session: 'lunch',
    instrument: 'MES',
    setupType: 'AfterLunchDriveFvgContinuation',
    direction,
    proofTime,
    firstSeenTime: proofTime,
    lastSeenTime: proofTime,
    occurrences: 1,
    entry: 100,
    stop: direction === 'LONG' ? 95 : 105,
    t1: direction === 'LONG' ? 107.5 : 92.5,
    t2: direction === 'LONG' ? 110 : 90,
    riskPoints: 5,
    t1R: 1.5,
    t2R: 2,
    proofState: 'Conditional:Conditional:none',
    triageScore: 0,
    sourceTapePath: 'artifact.json',
    barsSource: 'scanner_decision_tape_completed_5m',
    barsLoaded: 100,
    barsAfterProof: 80,
    firstBarTime: `${proofTime.slice(0, 10)}T09:15:00`,
    lastBarTime: `${proofTime.slice(0, 10)}T15:55:00`,
    outcomeInputStatus: 'ready_for_read_only_outcome_replay',
    blockers: [],
  };
}

const replayPackageReport = {
  rows: [
    replayRow('loss-short-line-behind', '2026-07-09T13:15:00', 'SHORT'),
    replayRow('loss-long-line-behind', '2026-07-10T13:20:00', 'LONG'),
    replayRow('win-line-ahead', '2026-07-11T13:25:00', 'LONG'),
  ],
} as UnifiedPositiveHeldLocalPreviewReplayPackageReport;

function scannerCandidate(direction: 'LONG' | 'SHORT', lineInSand: number, formedAt: string) {
  return {
    setupType: 'AfterLunchDriveFvgContinuation',
    candidateState: 'HUMAN_REVIEW_READY',
    direction,
    entry: 100,
    stop: direction === 'LONG' ? 95 : 105,
    targetRoom: {
      targetRoomStatus: 'blocked_before_t1',
      targetRoomReason: direction === 'LONG'
        ? 'Clean 1.5R path unavailable: RTH High at 103 sits before T1.'
        : 'Clean 1.5R path unavailable: RTH Low at 97 sits before T1.',
    },
    activeRuleset: {
      htfLineInSand: {
        status: 'blocked',
        lineInSand,
        evidence: [`Latest structured completed 5M close: ${lineInSand}.`],
      },
    },
    tacticalZone: {
      formedAt,
    },
    riskPoints: 5,
    modelConfidenceScore: 100,
  };
}

const scannerArtifactReport = {
  events: {
    '2026-07-09 2026-07-09T13:15:00': {
      setupCandidateStatus: { statuses: [scannerCandidate('SHORT', 102, '2026-07-09T13:00:00')] },
    },
    '2026-07-10T13:20:00': {
      setupCandidateStatus: { statuses: [scannerCandidate('LONG', 98, '2026-07-10T13:05:00')] },
    },
    '2026-07-11T13:25:00': {
      setupCandidateStatus: { statuses: [scannerCandidate('LONG', 103, '2026-07-11T13:10:00')] },
    },
  },
};

const report = buildUnifiedPositiveHeldLocalPreviewAfterLunchStructuralSequenceLossMinerReport({
  reportDir: 'reports',
  sourceProofTimingPath: 'source.json',
  replayPackagePath: 'replay.json',
  scannerArtifactPath: 'scanner.json',
  sourceProofTimingReport,
  replayPackageReport,
  scannerArtifactReport,
}, '2026-07-20T01:00:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_afterlunch_structural_sequence_loss_miner');
assert.equal(report.status, 'pass');
assert.equal(report.summary.sourceRows, 3);
assert.equal(report.summary.matchedRows, 3);
assert.equal(report.summary.winners, 1);
assert.equal(report.summary.losses, 2);
assert.equal(report.summary.researchCandidates >= 1, true);
assert.equal(report.summary.topResearchCandidateId, 'riskPoints<=10+htfLineBehindPrice');
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);

const top = report.selectors[0];
assert.equal(top.selectorId, 'riskPoints<=10+htfLineBehindPrice');
assert.equal(top.decision, 'research_candidate');
assert.equal(top.winners, 0);
assert.equal(top.losses, 2);
assert.equal(report.rows.find((row) => row.ticketId === 'loss-long-line-behind')?.htfLineCleared, false);
assert.equal(report.rows.find((row) => row.ticketId === 'loss-long-line-behind')?.htfLineTouched, true);

const missing = buildUnifiedPositiveHeldLocalPreviewAfterLunchStructuralSequenceLossMinerReport({
  reportDir: 'reports',
  sourceProofTimingPath: null,
  replayPackagePath: 'replay.json',
  scannerArtifactPath: 'scanner.json',
  sourceProofTimingReport: null,
  replayPackageReport,
  scannerArtifactReport,
}, '2026-07-20T01:00:00.000Z');

assert.equal(missing.status, 'fail');
assert.equal(missing.summary.recommendation, 'fix_inputs');
assert.ok(missing.blockers.includes('missing source/proof timing path'));

console.log('unified positive held-local AfterLunch structural sequence loss miner verified.');
