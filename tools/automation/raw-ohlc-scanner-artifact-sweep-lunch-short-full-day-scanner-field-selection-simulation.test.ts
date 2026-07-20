import assert from 'node:assert/strict';
import { buildRawOhlcScannerArtifactSweepLunchShortFullDayScannerFieldSelectionSimulationReport } from './raw-ohlc-scanner-artifact-sweep-lunch-short-full-day-scanner-field-selection-simulation';

const report = buildRawOhlcScannerArtifactSweepLunchShortFullDayScannerFieldSelectionSimulationReport({
  scannerFieldMinerPath: 'synthetic-scanner-field-miner.json',
  scannerFieldMiner: {
    status: 'pass',
    summary: {
      bestPositiveCandidate: 'levelContextBucket=20_to_29',
      bestNegativeCandidate: 'rankScoreBucket=gte_250',
    },
    joinedRows: [
      {
        ticketId: 'bad-early',
        tradeDate: '2026-06-10',
        session: 'lunch',
        setupType: 'SweepMssFvgRetrace',
        direction: 'SHORT',
        proofTime: '2026-06-10T13:00:00',
        outcomeStatus: 'resolved',
        outcomeLabel: 'stopped_before_t1',
        resolvedOneMesPl: -50,
        fields: {
          levelContextBucket: '10_to_19',
          rankScoreBucket: 'gte_250',
        },
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
        resolvedOneMesPl: 55,
        fields: {
          levelContextBucket: '20_to_29',
          rankScoreBucket: '200_to_249',
        },
      },
    ],
  },
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.joinedRows, 2);
assert.equal(report.summary.slates, 1);
assert.equal(report.summary.changedSlates, 1);
assert.equal(report.summary.baselineTopOneMesPl, -50);
assert.equal(report.summary.simulatedTopOneMesPl, 55);
assert.equal(report.summary.topSelectionDeltaOneMesPl, 105);
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.equal(report.summary.recommendation, 'validate_on_broader_scanner_fields');
assert.match(report.markdown, /Scanner Field Selection Simulation/);

console.log('raw OHLC scanner artifact Sweep lunch SHORT full-day scanner field selection simulation verified.');
