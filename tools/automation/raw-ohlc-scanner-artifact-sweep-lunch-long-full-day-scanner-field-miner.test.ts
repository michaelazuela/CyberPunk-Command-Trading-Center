import assert from 'node:assert/strict';
import { buildRawOhlcScannerArtifactSweepLunchLongFullDayScannerFieldMinerReport } from './raw-ohlc-scanner-artifact-sweep-lunch-long-full-day-scanner-field-miner';

const joinedRows = [
  ...Array.from({ length: 12 }, (_, index) => ({
    ticketId: `good-${index}`,
    tradeDate: '2026-06-10',
    session: 'lunch',
    setupType: 'SweepMssFvgRetrace',
    direction: 'LONG' as const,
    proofTime: '2026-06-10T13:05:00',
    outcomeStatus: 'resolved' as const,
    outcomeLabel: 't1_and_t2_hit',
    resolvedOneMesPl: 100,
    fields: {
      proofHour: '13',
      targetRoomStatus: 'target_room_valid',
      cleanPathToT1: 'true',
    },
  })),
  ...Array.from({ length: 12 }, (_, index) => ({
    ticketId: `bad-${index}`,
    tradeDate: '2026-06-11',
    session: 'lunch',
    setupType: 'SweepMssFvgRetrace',
    direction: 'LONG' as const,
    proofTime: '2026-06-11T14:05:00',
    outcomeStatus: 'resolved' as const,
    outcomeLabel: 'stopped_before_t1',
    resolvedOneMesPl: -50,
    fields: {
      proofHour: '14',
      targetRoomStatus: 'target_room_valid',
      cleanPathToT1: 'true',
    },
  })),
];

const report = buildRawOhlcScannerArtifactSweepLunchLongFullDayScannerFieldMinerReport({
  fullDayRollupPath: 'synthetic-full-day-rollup.json',
  replayPackagePath: 'synthetic-replay-package.json',
  fullDayRollup: { status: 'pass', rows: [] },
  replayPackage: { status: 'pass', rows: [] },
  joinedRows,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.joinedRows, 24);
assert.equal(report.summary.positiveCandidates, 1);
assert.equal(report.summary.negativeCandidates, 1);
assert.equal(report.summary.bestPositiveCandidate, 'proofHour=13');
assert.equal(report.summary.bestNegativeCandidate, 'proofHour=14');
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.equal(report.summary.recommendation, 'validate_scanner_field_candidates');
assert.equal(report.featureStats.find((row) => row.feature === 'proofHour' && row.value === '14')?.verdict, 'negative_candidate');
assert.match(report.markdown, /Scanner Field Miner/);

console.log('raw OHLC scanner artifact Sweep lunch LONG full-day scanner field miner verified.');
