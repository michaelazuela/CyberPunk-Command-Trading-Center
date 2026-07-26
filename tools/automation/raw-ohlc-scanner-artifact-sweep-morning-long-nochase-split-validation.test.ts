import assert from 'node:assert/strict';
import { buildRawOhlcScannerArtifactSweepMorningLongNoChaseSplitValidationReport } from './raw-ohlc-scanner-artifact-sweep-morning-long-nochase-split-validation';
import type { JoinedRow } from './raw-ohlc-scanner-artifact-sweep-morning-long-preentry-field-miner';

const joinedRows: JoinedRow[] = [
  ...Array.from({ length: 8 }, (_, index) => ({
    ticketId: `bad-${index}`,
    tradeDate: '2026-06-10',
    session: 'morning',
    setupType: 'NoInstalledSetup',
    direction: 'LONG',
    proofTime: '2026-06-10T11:05:00',
    outcomeStatus: 'unresolved',
    outcomeLabel: 'no_target_or_stop_hit',
    resolvedOneMesPl: null,
    fields: {
      htfLineInSandStatus: 'blocked',
      hasNoChaseMissingEvidence: 'true',
    },
  } satisfies JoinedRow)),
  ...Array.from({ length: 8 }, (_, index) => ({
    ticketId: `good-${index}`,
    tradeDate: '2026-06-11',
    session: 'morning',
    setupType: 'NoInstalledSetup',
    direction: 'LONG',
    proofTime: '2026-06-11T10:05:00',
    outcomeStatus: 'resolved',
    outcomeLabel: 't1_and_t2_hit',
    resolvedOneMesPl: 100,
    fields: {
      htfLineInSandStatus: 'not_applicable',
      hasNoChaseMissingEvidence: 'false',
    },
  } satisfies JoinedRow)),
];

const report = buildRawOhlcScannerArtifactSweepMorningLongNoChaseSplitValidationReport({
  joinedRows,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.joinedRows, 16);
assert.equal(report.summary.blockedNoChaseRows, 8);
assert.equal(report.summary.notApplicableNoNoChaseRows, 8);
assert.equal(report.summary.blockedNoChaseProblemRate, 1);
assert.equal(report.summary.notApplicableNoNoChaseWinnerRate, 1);
assert.equal(report.summary.grossDeltaOneMesPl, 800);
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.equal(report.summary.recommendation, 'prepare_research_only_rank_simulation');
assert.equal(report.segmentRows.find((row) => row.segment === 'blocked_no_chase')?.problemRows, 8);
assert.match(report.markdown, /No-Chase Split Validation/);

console.log('raw OHLC scanner artifact Sweep morning LONG no-chase split validation verified.');
