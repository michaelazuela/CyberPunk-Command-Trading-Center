import assert from 'node:assert/strict';
import { buildRawOhlcScannerArtifactSweepMorningLongPreentryFieldMinerReport } from './raw-ohlc-scanner-artifact-sweep-morning-long-preentry-field-miner';

const joinedRows = [
  ...Array.from({ length: 8 }, (_, index) => ({
    ticketId: `bad-${index}`,
    tradeDate: '2026-06-10',
    session: 'morning',
    setupType: 'SweepMssFvgRetrace',
    direction: 'LONG' as const,
    proofTime: '2026-06-10T11:05:00',
    outcomeStatus: 'unresolved' as const,
    outcomeLabel: 'no_target_or_stop_hit',
    resolvedOneMesPl: null,
    fields: {
      proofHour: '11',
      riskBucket: '>25',
      targetRoomStatus: 'target_room_valid',
    },
  })),
  ...Array.from({ length: 8 }, (_, index) => ({
    ticketId: `good-${index}`,
    tradeDate: '2026-06-11',
    session: 'morning',
    setupType: 'SweepMssFvgRetrace',
    direction: 'LONG' as const,
    proofTime: '2026-06-11T10:05:00',
    outcomeStatus: 'resolved' as const,
    outcomeLabel: 't1_and_t2_hit',
    resolvedOneMesPl: 100,
    fields: {
      proofHour: '10',
      riskBucket: '18.25-25',
      targetRoomStatus: 'target_room_valid',
    },
  })),
];

const report = buildRawOhlcScannerArtifactSweepMorningLongPreentryFieldMinerReport({
  outcomePath: 'synthetic-outcome.json',
  replayPackagePath: 'synthetic-package.json',
  outcome: { status: 'pass', rows: [] },
  replayPackage: { status: 'pass', rows: [] },
  joinedRows,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.joinedRows, 16);
assert.equal(report.summary.featureStats, 5);
assert.equal(report.summary.negativeCandidates, 2);
assert.equal(report.summary.positiveCandidates, 2);
assert.equal(report.summary.bestNegativeCandidate, 'proofHour=11');
assert.equal(report.summary.bestPositiveCandidate, 'proofHour=10');
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.equal(report.summary.recommendation, 'validate_preentry_field_candidates');
assert.equal(report.featureStats.find((row) => row.feature === 'riskBucket' && row.value === '>25')?.verdict, 'negative_candidate');
assert.match(report.markdown, /Pre-Entry Field Miner/);

console.log('raw OHLC scanner artifact Sweep morning LONG pre-entry field miner verified.');
