import assert from 'node:assert/strict';
import { buildRawOhlcScannerArtifactSweepMorningLongNoChaseRankSimulationReport } from './raw-ohlc-scanner-artifact-sweep-morning-long-nochase-rank-simulation';
import type { JoinedRow } from './raw-ohlc-scanner-artifact-sweep-morning-long-preentry-field-miner';

const joinedRows: JoinedRow[] = [
  {
    ticketId: 'bad-top',
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
    ticketId: 'good-replacement',
    tradeDate: '2026-06-10',
    session: 'morning',
    setupType: 'SweepMssFvgRetrace',
    direction: 'LONG',
    proofTime: '2026-06-10T10:05:00',
    outcomeStatus: 'resolved',
    outcomeLabel: 't1_and_t2_hit',
    resolvedOneMesPl: 100,
    fields: {
      rankScoreBucket: 'lt_150',
      htfLineInSandStatus: 'not_applicable',
      hasNoChaseMissingEvidence: 'false',
    },
  },
];

const report = buildRawOhlcScannerArtifactSweepMorningLongNoChaseRankSimulationReport({
  joinedRows,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.joinedRows, 2);
assert.equal(report.summary.slates, 1);
assert.equal(report.summary.changedSlates, 1);
assert.equal(report.summary.baselineTopOneMesPl, null);
assert.equal(report.summary.simulatedTopOneMesPl, 100);
assert.equal(report.summary.topSelectionDeltaOneMesPl, null);
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.equal(report.summary.recommendation, 'keep_research_only');
assert.equal(report.slates[0].topChanged, true);
assert.match(report.markdown, /No-Chase Rank Simulation/);

console.log('raw OHLC scanner artifact Sweep morning LONG no-chase rank simulation verified.');
