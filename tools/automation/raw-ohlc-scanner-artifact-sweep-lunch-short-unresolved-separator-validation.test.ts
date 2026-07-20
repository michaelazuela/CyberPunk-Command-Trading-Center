import assert from 'node:assert/strict';
import { buildRawOhlcScannerArtifactSweepLunchShortUnresolvedSeparatorValidationReport } from './raw-ohlc-scanner-artifact-sweep-lunch-short-unresolved-separator-validation';

function row(id: string, researchAction: 'keep_as_unresolved_review_note' | 'exclude_from_positive_rank_training', scannerFields: Record<string, string>) {
  return {
    ticketId: id,
    tradeDate: id.slice(0, 10),
    proofTime: `${id.slice(0, 10)}T12:00:00`,
    researchAction,
    scannerFields,
  };
}

const report = buildRawOhlcScannerArtifactSweepLunchShortUnresolvedSeparatorValidationReport({
  unresolvedDrilldownPath: 'synthetic-unresolved-drilldown.json',
  separatorMinerPath: 'synthetic-separator-miner.json',
  unresolvedDrilldown: {
    status: 'pass',
    rows: [
      row('2026-06-25-a', 'keep_as_unresolved_review_note', { proofHour: '12', evidenceCountBucket: '30_to_34' }),
      row('2026-06-25-b', 'keep_as_unresolved_review_note', { proofHour: '12', evidenceCountBucket: '30_to_34' }),
      row('2026-07-15-a', 'exclude_from_positive_rank_training', { proofHour: '15', evidenceCountBucket: '35_to_39' }),
      row('2026-07-15-b', 'exclude_from_positive_rank_training', { proofHour: '15', evidenceCountBucket: '35_to_39' }),
      row('2026-07-16-a', 'exclude_from_positive_rank_training', { proofHour: '14', evidenceCountBucket: '40_to_44' }),
    ],
  },
  separatorMiner: {
    status: 'pass',
    summary: {
      bestReviewNoteCandidate: 'proofHour=12',
      bestExclusionCandidate: 'evidenceCountBucket=35_to_39',
    },
  },
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.rows, 5);
assert.equal(report.summary.classifiedRows, 4);
assert.equal(report.summary.unclassifiedRows, 1);
assert.equal(report.summary.correctClassifiedRows, 4);
assert.equal(report.summary.falseReviewRows, 0);
assert.equal(report.summary.falseExclusionRows, 0);
assert.equal(report.summary.coverageShare, 0.8);
assert.equal(report.summary.classifiedAccuracyShare, 1);
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.equal(report.summary.recommendation, 'validate_on_broader_history');
assert.match(report.markdown, /Unresolved Separator Validation/);

console.log('raw OHLC scanner artifact Sweep lunch SHORT unresolved separator validation verified.');
