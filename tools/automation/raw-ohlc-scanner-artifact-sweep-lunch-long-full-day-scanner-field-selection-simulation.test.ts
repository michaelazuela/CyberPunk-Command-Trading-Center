import assert from 'node:assert/strict';
import { buildRawOhlcScannerArtifactSweepLunchLongFullDayScannerFieldSelectionSimulationReport } from './raw-ohlc-scanner-artifact-sweep-lunch-long-full-day-scanner-field-selection-simulation';

const report = buildRawOhlcScannerArtifactSweepLunchLongFullDayScannerFieldSelectionSimulationReport({
  scannerFieldMinerPath: 'synthetic-scanner-field-miner.json',
  scannerFieldMiner: {
    status: 'pass',
    summary: {
      bestPositiveCandidate: 'hasNoChaseMissingEvidence=false',
      bestNegativeCandidate: 'levelContextBucket=20_to_29',
    },
    joinedRows: [
      {
        ticketId: 'bad-early',
        tradeDate: '2026-06-10',
        session: 'lunch',
        setupType: 'NoInstalledSetup',
        direction: 'LONG',
        proofTime: '2026-06-10T13:00:00',
        outcomeStatus: 'resolved',
        outcomeLabel: 'stopped_before_t1',
        resolvedOneMesPl: -50,
        fields: {
          hasNoChaseMissingEvidence: 'true',
          levelContextBucket: '20_to_29',
        },
      },
      {
        ticketId: 'good-later',
        tradeDate: '2026-06-10',
        session: 'lunch',
        setupType: 'NoInstalledSetup',
        direction: 'LONG',
        proofTime: '2026-06-10T13:05:00',
        outcomeStatus: 'resolved',
        outcomeLabel: 't1_and_t2_hit',
        resolvedOneMesPl: 55,
        fields: {
          hasNoChaseMissingEvidence: 'false',
          levelContextBucket: 'lt_0',
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

console.log('raw OHLC scanner artifact Sweep lunch LONG full-day scanner field selection simulation verified.');
