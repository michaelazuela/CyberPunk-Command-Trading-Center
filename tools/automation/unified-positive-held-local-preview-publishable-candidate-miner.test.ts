import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewPublishableCandidateMinerReport,
  parseUnifiedPositiveHeldLocalPreviewPublishableCandidateMinerArgs,
} from './unified-positive-held-local-preview-publishable-candidate-miner';

const intake = {
  rows: [{
    intakeId: '2026-07-20-morning-IntradayMssMicroContinuation-LONG',
    tradeDate: '2026-07-20',
    session: 'morning',
    instrument: 'MES',
    setupType: 'IntradayMssMicroContinuation',
    direction: 'LONG',
    firstSeenTime: '2026-07-20T09:35:00.0000000',
    lastSeenTime: '2026-07-20T09:45:00.0000000',
    occurrences: 4,
    entry: 100,
    stop: 96,
    target1: 106,
    target2: 108,
    riskPoints: 4,
    candidateState: 'HUMAN_REVIEW_READY',
    executionStatus: 'Conditional',
    detectedStatus: 'Conditional',
    blockReason: null,
    sourceFile: 'scanner-decision-tape-2026-07-20-MES-morning.json',
    proofState: 'human_review_ready',
    triageScore: 225,
    triageDecision: 'selected_for_replay_package',
  }, {
    intakeId: '2026-07-20-morning-SweepMssFvgRetrace-LONG',
    tradeDate: '2026-07-20',
    session: 'morning',
    instrument: 'MES',
    setupType: 'SweepMssFvgRetrace',
    direction: 'LONG',
    firstSeenTime: '2026-07-20T10:00:00.0000000',
    lastSeenTime: '2026-07-20T10:10:00.0000000',
    occurrences: 2,
    entry: 100,
    stop: null,
    target1: null,
    target2: null,
    riskPoints: null,
    candidateState: 'HUMAN_REVIEW_READY',
    executionStatus: 'Conditional',
    detectedStatus: 'Conditional',
    blockReason: 'InvalidStopLocation',
    sourceFile: 'scanner-decision-tape-2026-07-20-MES-morning.json',
    proofState: 'human_review_ready',
    triageScore: 200,
    triageDecision: 'held_for_later_batch',
  }],
};

const replay = {
  rows: [{
    rowId: '2026-07-20-morning-IntradayMssMicroContinuation-LONG',
    tradeDate: '2026-07-20',
    session: 'morning',
    setupType: 'IntradayMssMicroContinuation',
    direction: 'LONG',
    outcomeBucket: 'winner',
    outcomeLabel: 't1_and_t2_hit',
    resolvedOneMesPl: 80,
    entryHitTime: '2026-07-20T09:40:00',
    blockers: [],
  }],
};

const report = buildUnifiedPositiveHeldLocalPreviewPublishableCandidateMinerReport({
  intakeTriagePath: 'intake.json',
  intakeTriageReport: intake,
  broadReplayPath: 'replay.json',
  broadReplayReport: replay,
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.intakeRowsRead, 2);
assert.equal(report.summary.replayRowsRead, 1);
assert.equal(report.summary.completeGeometryRows, 1);
assert.equal(report.summary.positiveProofRows, 2);
assert.equal(report.summary.scannerPublishCompleteRows, 1);
assert.equal(report.summary.scannerPublishShouldPostRows, 1);
assert.equal(report.summary.publishCanExecuteTrueRows, 0);
assert.equal(report.summary.publishableReviewCandidates, 1);
assert.equal(report.summary.publishableWinners, 1);
assert.equal(report.summary.publishableResolvedOneMesPl, 80);
assert.equal(report.summary.recommendation, 'build_replay_package_for_publishable_candidates');
assert.equal(report.selectedReplayPackage.length, 1);
assert.equal(report.selectedReplayPackage[0].setupType, 'IntradayMssMicroContinuation');
assert.equal(report.selectedReplayPackage[0].publishShouldPost, true);
assert.equal(report.rows.find((row) => row.setupType === 'SweepMssFvgRetrace')?.recommendation, 'blocked');

const missing = buildUnifiedPositiveHeldLocalPreviewPublishableCandidateMinerReport({
  intakeTriagePath: null,
  intakeTriageReport: null,
  broadReplayPath: null,
  broadReplayReport: null,
}, '2026-07-20T00:01:00.000Z');
assert.equal(missing.status, 'fail');
assert.equal(missing.summary.recommendation, 'fix_missing_input_reports');

const parsed = parseUnifiedPositiveHeldLocalPreviewPublishableCandidateMinerArgs([
  '--intake-triage',
  'intake.json',
  '--broad-replay',
  'replay.json',
  '--out-dir',
  'out',
  '--json',
]);
assert.equal(parsed.intakeTriagePath, 'intake.json');
assert.equal(parsed.broadReplayPath, 'replay.json');
assert.equal(parsed.outDir, 'out');
assert.equal(parsed.json, true);

console.log('unified positive held-local preview publishable candidate miner verified.');
