import assert from 'node:assert/strict';
import { buildRawOhlcScannerArtifactSweepMorningLongUnresolvedTopSlateDrilldownReport } from './raw-ohlc-scanner-artifact-sweep-morning-long-unresolved-top-slate-drilldown';

const report = buildRawOhlcScannerArtifactSweepMorningLongUnresolvedTopSlateDrilldownReport({
  rankSimulationPath: 'synthetic-rank.json',
  rankSimulation: {
    status: 'pass',
    slates: [
      {
        slateId: '2026-06-10|morning',
        rows: 2,
        baselineTopTicketId: 'bad-top',
        baselineTopOutcomeLabel: 'no_fill',
        baselineTopOneMesPl: null,
      },
    ],
    rows: [
      {
        ticketId: 'bad-top',
        slateId: '2026-06-10|morning',
        outcomeLabel: 'no_fill',
        resolvedOneMesPl: null,
        rankScoreBucket: '200_to_249',
        htfLineInSandStatus: 'blocked',
        hasNoChaseMissingEvidence: 'true',
        baselineScore: 225,
        simulatedScore: 145,
      },
      {
        ticketId: 'good-replacement',
        slateId: '2026-06-10|morning',
        outcomeLabel: 't1_and_t2_hit',
        resolvedOneMesPl: 100,
        rankScoreBucket: 'lt_150',
        htfLineInSandStatus: 'not_applicable',
        hasNoChaseMissingEvidence: 'false',
        baselineScore: 125,
        simulatedScore: 145,
      },
    ],
  },
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.slates, 1);
assert.equal(report.summary.unresolvedTopSlates, 1);
assert.equal(report.summary.replacementAvailableSlates, 1);
assert.equal(report.summary.allUnresolvedOrNoFillSlates, 0);
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.equal(report.summary.recommendation, 'inspect_replacement_available_slates');
assert.equal(report.rows[0].failureClass, 'replacement_available');
assert.equal(report.rows[0].bestResolvedOneMesPl, 100);
assert.match(report.markdown, /Unresolved Top-Slate Drilldown/);

console.log('raw OHLC scanner artifact Sweep morning LONG unresolved top-slate drilldown verified.');
