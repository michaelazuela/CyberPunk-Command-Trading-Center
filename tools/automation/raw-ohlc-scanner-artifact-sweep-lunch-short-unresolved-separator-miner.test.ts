import assert from 'node:assert/strict';
import { buildRawOhlcScannerArtifactSweepLunchShortUnresolvedSeparatorMinerReport } from './raw-ohlc-scanner-artifact-sweep-lunch-short-unresolved-separator-miner';

function row(id: string, researchAction: 'keep_as_unresolved_review_note' | 'exclude_from_positive_rank_training', scannerFields: Record<string, string>) {
  return {
    ticketId: id,
    tradeDate: id.slice(0, 10),
    proofTime: `${id.slice(0, 10)}T12:00:00`,
    cause: researchAction === 'keep_as_unresolved_review_note' ? 'near_t1_unresolved' : 'no_stop_no_target',
    researchAction,
    scannerFields,
  };
}

const report = buildRawOhlcScannerArtifactSweepLunchShortUnresolvedSeparatorMinerReport({
  unresolvedDrilldownPath: 'synthetic-unresolved-drilldown.json',
  unresolvedDrilldown: {
    status: 'pass',
    rows: [
      row('2026-06-25-a', 'keep_as_unresolved_review_note', { riskBucket: '<=8', levelContextBucket: 'gte_30', mixed: 'same' }),
      row('2026-06-25-b', 'keep_as_unresolved_review_note', { riskBucket: '<=8', levelContextBucket: 'gte_30', mixed: 'same' }),
      row('2026-07-08-a', 'keep_as_unresolved_review_note', { riskBucket: '<=8', levelContextBucket: 'gte_30', mixed: 'same' }),
      row('2026-07-15-a', 'exclude_from_positive_rank_training', { riskBucket: '18.25-25', levelContextBucket: 'lt_0', mixed: 'same' }),
      row('2026-07-15-b', 'exclude_from_positive_rank_training', { riskBucket: '18.25-25', levelContextBucket: 'lt_0', mixed: 'same' }),
      row('2026-07-15-c', 'exclude_from_positive_rank_training', { riskBucket: '18.25-25', levelContextBucket: 'lt_0', mixed: 'same' }),
    ],
  },
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.sourceRows, 6);
assert.equal(report.summary.reviewNoteRows, 3);
assert.equal(report.summary.exclusionRows, 3);
assert.equal(report.summary.reviewNoteCandidates, 2);
assert.equal(report.summary.exclusionCandidates, 2);
assert.equal(report.summary.bestReviewNoteCandidate, 'levelContextBucket=gte_30');
assert.equal(report.summary.bestExclusionCandidate, 'levelContextBucket=lt_0');
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.equal(report.summary.recommendation, 'validate_candidates_in_selection_simulation');
assert.equal(report.buckets.find((bucket) => bucket.bucketId === 'mixed=same')?.decision, 'research_only_context');
assert.match(report.markdown, /Unresolved Separator Miner/);

console.log('raw OHLC scanner artifact Sweep lunch SHORT unresolved separator miner verified.');
