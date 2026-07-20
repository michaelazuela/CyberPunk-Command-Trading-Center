import assert from 'node:assert/strict';
import { buildRawOhlcScannerArtifactSweepLunchShortUnresolvedSlateDrilldownReport } from './raw-ohlc-scanner-artifact-sweep-lunch-short-unresolved-slate-drilldown';

function row(overrides: Record<string, unknown>) {
  return ({
    ticketId: `ticket-${overrides.proofTime}`,
    tradeDate: '2026-06-25',
    session: 'lunch',
    setupType: 'SweepMssFvgRetrace',
    direction: 'SHORT',
    proofTime: '2026-06-25T12:35:00',
    entry: 7438.5,
    stop: 7459.25,
    t1: 7407.5,
    t2: 7397,
    riskPoints: 20.75,
    barsLoaded: 81,
    barsAfterProof: 41,
    outcomeStatus: 'unresolved',
    outcomeLabel: 'no_target_or_stop_hit',
    entryHitTime: '2026-06-25T12:35:00',
    stopHitTime: null,
    t1HitTime: null,
    t2HitTime: null,
    maximumFavorableExcursion: 30.25,
    maximumAdverseExcursion: 18.25,
    sourceArtifactPath: 'saved-artifact.json',
    fields: {
      riskBucket: '18.25-25',
      targetRoomStatus: 'blocked_before_t1',
    },
    ...overrides,
  }) as any;
}

const report = buildRawOhlcScannerArtifactSweepLunchShortUnresolvedSlateDrilldownReport({
  scannerFieldMinerPath: 'synthetic-scanner-field-miner.json',
  targetDate: '2026-06-25',
  scannerFieldMiner: {
    status: 'pass',
    joinedRows: [
      row({ proofTime: '2026-06-25T12:35:00' }),
      row({
        proofTime: '2026-06-25T13:00:00',
        maximumFavorableExcursion: 4,
        maximumAdverseExcursion: 2,
      }),
      row({
        proofTime: '2026-06-25T13:30:00',
        tradeDate: '2026-06-26',
      }),
      row({
        proofTime: '2026-06-25T13:35:00',
        setupType: 'OpeningDriveFvgContinuation',
      }),
    ],
  },
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.unresolvedRows, 2);
assert.equal(report.summary.planSignatures, 1);
assert.equal(report.summary.nearT1UnresolvedRows, 0);
assert.equal(report.summary.adverseNearStopRows, 1);
assert.equal(report.summary.weakFollowThroughRows, 1);
assert.equal(report.summary.keepAsReviewNoteRows, 1);
assert.equal(report.summary.excludeFromPositiveRankTrainingRows, 1);
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.equal(report.summary.recommendation, 'keep_unresolved_as_review_note');
assert.equal(report.rows[0].pointsShortOfT1, 0.75);
assert.equal(report.rows[0].mfeR, 1.46);
assert.equal(report.rows[0].maeR, 0.88);
assert.equal(report.rows[0].cause, 'adverse_near_stop');
assert.equal(report.rows[0].researchAction, 'keep_as_unresolved_review_note');
assert.equal(report.rows[1].cause, 'weak_follow_through');
assert.equal(report.rows[1].researchAction, 'exclude_from_positive_rank_training');
assert.match(report.markdown, /Lunch SHORT Unresolved Slate Drilldown/);

console.log('raw OHLC scanner artifact Sweep lunch SHORT unresolved slate drilldown verified.');
