import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildUnifiedPositiveHeldLocalPreviewPublishableCandidateReplayOutcomePackageReport,
} from './unified-positive-held-local-preview-publishable-candidate-replay-outcome-package';

function writeTape(dir: string, name: string, bars: Array<{ time: string; open: number; high: number; low: number; close: number }>): void {
  fs.writeFileSync(path.join(dir, name), JSON.stringify({
    events: Object.fromEntries(bars.map((bar, index) => [`event-${index}`, { completed5m: bar }])),
  }, null, 2));
}

const auditDir = fs.mkdtempSync(path.join(os.tmpdir(), 'publishable-candidate-outcome-'));
writeTape(auditDir, 'winner.json', [
  { time: '2026-07-20T09:30:00', open: 100, high: 101, low: 99, close: 100.5 },
  { time: '2026-07-20T09:35:00', open: 100.5, high: 102, low: 100, close: 101.5 },
  { time: '2026-07-20T09:40:00', open: 101.5, high: 106, low: 101, close: 105.5 },
  { time: '2026-07-20T09:45:00', open: 105.5, high: 109, low: 105, close: 108 },
]);
writeTape(auditDir, 'loss.json', [
  { time: '2026-07-20T10:00:00', open: 200, high: 201, low: 199, close: 200.5 },
  { time: '2026-07-20T10:05:00', open: 200.5, high: 202, low: 200, close: 201.5 },
  { time: '2026-07-20T10:10:00', open: 201.5, high: 202, low: 195, close: 196 },
]);

const report = buildUnifiedPositiveHeldLocalPreviewPublishableCandidateReplayOutcomePackageReport({
  candidateMinerPath: 'miner.json',
  candidateMinerReport: {
    selectedReplayPackage: [{
      intakeId: 'winner-row',
      tradeDate: '2026-07-20',
      session: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      proofState: 'human_review_ready',
      entry: 101,
      stop: 99,
      target1: 104,
      target2: 105,
      riskPoints: 2,
      triageScore: 220,
      occurrences: 3,
      sourceFile: 'winner.json',
      publishShouldPost: true,
      publishHasCompletePlan: true,
      publishCanExecute: false,
      publishableReviewCandidate: true,
      outcomeBucket: 'winner',
      outcomeLabel: 't1_and_t2_hit',
      resolvedOneMesPl: 20,
      entryHitTime: '2026-07-20T09:35:00',
      blockers: [],
    }, {
      intakeId: 'loss-row',
      tradeDate: '2026-07-20',
      session: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      proofState: 'opening_observation_armed',
      entry: 201,
      stop: 198,
      target1: 205.5,
      target2: 207,
      riskPoints: 3,
      triageScore: 190,
      occurrences: 2,
      sourceFile: 'loss.json',
      publishShouldPost: true,
      publishHasCompletePlan: true,
      publishCanExecute: false,
      publishableReviewCandidate: true,
      outcomeBucket: null,
      outcomeLabel: null,
      resolvedOneMesPl: null,
      entryHitTime: '2026-07-20T10:05:00',
      blockers: [],
    }],
  },
  auditDir,
}, '2026-07-20T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.selectedRowsRead, 2);
assert.equal(report.summary.packageRows, 2);
assert.equal(report.summary.rowsWithLocalTapeBars, 2);
assert.equal(report.summary.publishCanExecuteTrueRows, 0);
assert.equal(report.summary.resolvedRows, 2);
assert.equal(report.summary.winnerRows, 1);
assert.equal(report.summary.lossRows, 1);
assert.equal(report.summary.grossResolvedOneMesPl, 5);
assert.equal(report.summary.joinedOutcomeComparedRows, 1);
assert.equal(report.summary.joinedOutcomeMatchRows, 1);
assert.equal(report.summary.joinedOutcomeMismatchRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'use_as_research_evidence_for_next_rank_overlay');
assert.equal(report.rows.find((row) => row.ticketId === 'winner-row')?.outcomeLabel, 't1_and_t2_hit');
assert.equal(report.rows.find((row) => row.ticketId === 'loss-row')?.outcomeLabel, 'stopped_before_t1');

const missing = buildUnifiedPositiveHeldLocalPreviewPublishableCandidateReplayOutcomePackageReport({
  candidateMinerPath: null,
  candidateMinerReport: null,
  auditDir,
}, '2026-07-20T00:01:00.000Z');
assert.equal(missing.status, 'fail');
assert.equal(missing.summary.recommendation, 'fix_missing_candidate_miner_report');

console.log('unified positive held-local preview publishable candidate replay outcome package verified.');
