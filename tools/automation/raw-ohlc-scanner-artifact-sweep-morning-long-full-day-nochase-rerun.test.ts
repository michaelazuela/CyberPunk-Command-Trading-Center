import assert from 'node:assert/strict';
import { buildRawOhlcScannerArtifactSweepMorningLongFullDayNoChaseRerunReport } from './raw-ohlc-scanner-artifact-sweep-morning-long-full-day-nochase-rerun';
import type { JoinedRow } from './raw-ohlc-scanner-artifact-sweep-morning-long-preentry-field-miner';

const joinedRows: JoinedRow[] = [
  {
    ticketId: 'stale-unresolved',
    tradeDate: '2026-06-10',
    session: 'morning',
    setupType: 'SweepMssFvgRetrace',
    direction: 'LONG',
    proofTime: '2026-06-10T11:05:00',
    outcomeStatus: 'unresolved',
    outcomeLabel: 'no_target_or_stop_hit',
    resolvedOneMesPl: null,
    fields: {
      rankScoreBucket: '200_to_249',
      htfLineInSandStatus: 'blocked',
      hasNoChaseMissingEvidence: 'true',
    },
  },
  {
    ticketId: 'still-weak',
    tradeDate: '2026-06-10',
    session: 'morning',
    setupType: 'SweepMssFvgRetrace',
    direction: 'LONG',
    proofTime: '2026-06-10T11:10:00',
    outcomeStatus: 'unresolved',
    outcomeLabel: 'no_target_or_stop_hit',
    resolvedOneMesPl: null,
    fields: {
      rankScoreBucket: 'lt_150',
      htfLineInSandStatus: 'not_applicable',
      hasNoChaseMissingEvidence: 'false',
    },
  },
];

const report = buildRawOhlcScannerArtifactSweepMorningLongFullDayNoChaseRerunReport({
  joinedRows,
  fullDayComparisonPath: 'synthetic-comparison.json',
  unresolvedDrilldownPath: 'synthetic-drilldown.json',
  fullDayComparison: {
    status: 'pass',
    rows: [
      {
        ticketId: 'stale-unresolved',
        fullDayOutcomeLabel: 't1_and_t2_hit',
        fullDayOneMesPl: 100,
      },
      {
        ticketId: 'still-weak',
        fullDayOutcomeLabel: 'no_target_or_stop_hit',
        fullDayOneMesPl: null,
      },
    ],
  },
  unresolvedDrilldown: {
    status: 'pass',
    rows: [{
      ticketId: 'still-weak',
      causeClass: 'weak_follow_through',
      rankResearchAction: 'exclude_from_positive_rank_training',
    }],
  },
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.status, 'fail');
assert.equal(report.summary.joinedRows, 2);
assert.equal(report.summary.fullDayResolvedRows, 1);
assert.equal(report.summary.fullDayUnresolvedRows, 1);
assert.equal(report.summary.weakFollowThroughRows, 1);
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.equal(report.rankSimulation.rows.find((row) => row.ticketId === 'stale-unresolved')?.outcomeLabel, 't1_and_t2_hit');
assert.equal(report.splitValidation.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.match(report.blockers.join(' '), /split validation status fail/);
assert.match(report.markdown, /Full-Day No-Chase Rerun/);

console.log('raw OHLC scanner artifact Sweep morning LONG full-day no-chase rerun verified.');
