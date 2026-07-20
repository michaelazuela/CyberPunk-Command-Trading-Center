import assert from 'node:assert/strict';
import { buildRawOhlcScannerArtifactSweepLunchShortFullDayStableSelectionSimulationReport } from './raw-ohlc-scanner-artifact-sweep-lunch-short-full-day-stable-selection-simulation';

const report = buildRawOhlcScannerArtifactSweepLunchShortFullDayStableSelectionSimulationReport({
  fullDayRollupPath: 'synthetic-rollup.json',
  stableFieldMinerPath: 'synthetic-miner.json',
  stableFieldMiner: {
    status: 'pass',
    summary: {
      bestPositiveCandidate: 't1PointsBucket=20_to_29',
      bestNegativeCandidate: 'riskBucket=18.25-25',
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
        direction: 'SHORT',
        proofTime: '2026-06-10T13:00:00',
        outcomeStatus: 'resolved',
        outcomeLabel: 'stopped_before_t1',
        entry: 100,
        stop: 120,
        t1: 70,
        t2: 60,
        riskPoints: 20,
        resolvedOneMesPl: -100,
      },
      {
        ticketId: 'good-later',
        tradeDate: '2026-06-10',
        session: 'lunch',
        setupType: 'SweepMssFvgRetrace',
        direction: 'SHORT',
        proofTime: '2026-06-10T13:05:00',
        outcomeStatus: 'resolved',
        outcomeLabel: 't1_and_t2_hit',
        entry: 100,
        stop: 115,
        t1: 75,
        t2: 72,
        riskPoints: 15,
        resolvedOneMesPl: 125,
      },
    ],
  },
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.targetRows, 2);
assert.equal(report.summary.slates, 1);
assert.equal(report.summary.changedSlates, 1);
assert.equal(report.summary.baselineTopOneMesPl, -100);
assert.equal(report.summary.simulatedTopOneMesPl, 125);
assert.equal(report.summary.topSelectionDeltaOneMesPl, 225);
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.equal(report.summary.recommendation, 'validate_with_scanner_fields');
assert.match(report.markdown, /Sweep Lunch SHORT/);

console.log('raw OHLC scanner artifact Sweep lunch SHORT full-day stable selection simulation verified.');
