import assert from 'node:assert/strict';
import { buildRawOhlcScannerArtifactSweepLunchLongFullDayStableSelectionSimulationReport } from './raw-ohlc-scanner-artifact-sweep-lunch-long-full-day-stable-selection-simulation';

const report = buildRawOhlcScannerArtifactSweepLunchLongFullDayStableSelectionSimulationReport({
  fullDayRollupPath: 'synthetic-rollup.json',
  stableFieldMinerPath: 'synthetic-miner.json',
  stableFieldMiner: {
    status: 'pass',
    summary: {
      bestPositiveCandidate: 't2PointsBucket=lt_12',
      bestNegativeCandidate: 'riskBucket=8.25-12',
    },
  },
  fullDayRollup: {
    status: 'pass',
    rows: [
      {
        ticketId: 'bad-early',
        tradeDate: '2026-06-10',
        session: 'lunch',
        setupType: 'SweepMssFvgRetrace',
        direction: 'LONG',
        proofTime: '2026-06-10T13:00:00',
        outcomeStatus: 'resolved',
        outcomeLabel: 'stopped_before_t1',
        entry: 100,
        stop: 90,
        t1: 115,
        t2: 125,
        riskPoints: 10,
        resolvedOneMesPl: -50,
      },
      {
        ticketId: 'good-later',
        tradeDate: '2026-06-10',
        session: 'lunch',
        setupType: 'SweepMssFvgRetrace',
        direction: 'LONG',
        proofTime: '2026-06-10T13:05:00',
        outcomeStatus: 'resolved',
        outcomeLabel: 't1_and_t2_hit',
        entry: 100,
        stop: 95,
        t1: 107.5,
        t2: 111,
        riskPoints: 5,
        resolvedOneMesPl: 55,
      },
    ],
  },
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.targetRows, 2);
assert.equal(report.summary.slates, 1);
assert.equal(report.summary.changedSlates, 1);
assert.equal(report.summary.baselineTopOneMesPl, -50);
assert.equal(report.summary.simulatedTopOneMesPl, 55);
assert.equal(report.summary.topSelectionDeltaOneMesPl, 105);
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.equal(report.summary.recommendation, 'validate_with_scanner_fields');
assert.match(report.markdown, /Stable Selection Simulation/);

console.log('raw OHLC scanner artifact Sweep lunch LONG full-day stable selection simulation verified.');
