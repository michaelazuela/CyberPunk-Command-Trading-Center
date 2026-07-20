import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSupportedFieldOutcomeMinerReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-supported-field-outcome-miner';

type BuildArgs = Parameters<typeof buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSupportedFieldOutcomeMinerReport>[0];

const joinedRows: BuildArgs['joinedRows'] = [
  {
    ticketId: 'p1',
    tradeDate: '2026-07-01',
    session: 'morning',
    setupType: 'SweepMssFvgRetrace',
    direction: 'LONG',
    proofTime: '2026-07-01T10:00:00',
    outcomeStatus: 'resolved',
    outcomeLabel: 'stopped_before_t1',
    resolvedOneMesPl: -50,
    fields: { targetRoomStatus: 'blocked_before_t1', confidence: 'Medium' },
  },
  {
    ticketId: 'p2',
    tradeDate: '2026-07-02',
    session: 'morning',
    setupType: 'SweepMssFvgRetrace',
    direction: 'LONG',
    proofTime: '2026-07-02T10:00:00',
    outcomeStatus: 'resolved',
    outcomeLabel: 'no_fill',
    resolvedOneMesPl: null,
    fields: { targetRoomStatus: 'blocked_before_t1', confidence: 'Medium' },
  },
  {
    ticketId: 'p3',
    tradeDate: '2026-07-03',
    session: 'morning',
    setupType: 'SweepMssFvgRetrace',
    direction: 'LONG',
    proofTime: '2026-07-03T10:00:00',
    outcomeStatus: 'resolved',
    outcomeLabel: 'no_target_or_stop_hit',
    resolvedOneMesPl: null,
    fields: { targetRoomStatus: 'blocked_before_t1', confidence: 'Medium' },
  },
  {
    ticketId: 'w1',
    tradeDate: '2026-07-04',
    session: 'morning',
    setupType: 'SweepMssFvgRetrace',
    direction: 'SHORT',
    proofTime: '2026-07-04T10:00:00',
    outcomeStatus: 'resolved',
    outcomeLabel: 't1_and_t2_hit',
    resolvedOneMesPl: 100,
    fields: { targetRoomStatus: 'clean_t1_t2', confidence: 'High' },
  },
];

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSupportedFieldOutcomeMinerReport({
  joinedRows,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.joinedRows, 4);
assert.equal(report.summary.negativeCandidates, 2);
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.equal(report.summary.recommendation, 'validate_supported_field_candidates');
assert.equal(report.featureStats[0].verdict, 'negative_candidate');
assert.match(report.markdown, /Supported Field Outcome Miner/);

console.log('OpeningDrive supported field outcome miner verified.');
