import assert from 'node:assert/strict';
import { buildRawOhlcScannerArtifactSweepLunchShortFullDayStableFieldMinerReport } from './raw-ohlc-scanner-artifact-sweep-lunch-short-full-day-stable-field-miner';

const report = buildRawOhlcScannerArtifactSweepLunchShortFullDayStableFieldMinerReport({
  fullDayRollupPath: 'synthetic-full-day-rollup.json',
  fullDayRollup: {
    status: 'pass',
    rows: [
      ...Array.from({ length: 12 }, (_, index) => ({
        ticketId: `good-${index}`,
        tradeDate: '2026-06-10',
        session: 'lunch',
        setupType: 'SweepMssFvgRetrace',
        direction: 'SHORT' as const,
        proofTime: '2026-06-10T13:10:00',
        outcomeStatus: 'resolved' as const,
        outcomeLabel: 't1_and_t2_hit',
        entry: 100,
        stop: 110,
        t1: 85,
        t2: 80,
        riskPoints: 10,
        resolvedOneMesPl: 100,
      })),
      ...Array.from({ length: 12 }, (_, index) => ({
        ticketId: `bad-${index}`,
        tradeDate: '2026-06-10',
        session: 'lunch',
        setupType: 'SweepMssFvgRetrace',
        direction: 'SHORT' as const,
        proofTime: '2026-06-10T14:50:00',
        outcomeStatus: 'resolved' as const,
        outcomeLabel: 'stopped_before_t1',
        entry: 100,
        stop: 130,
        t1: 55,
        t2: 40,
        riskPoints: 30,
        resolvedOneMesPl: -150,
      })),
    ],
  },
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.targetRows, 24);
assert.equal(report.summary.positiveCandidates > 0, true);
assert.equal(report.summary.negativeCandidates > 0, true);
assert.equal(report.summary.bestPositiveCandidate, 'proofHour=13');
assert.equal(report.summary.bestNegativeCandidate, 'proofHour=14');
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.equal(report.summary.recommendation, 'validate_positive_candidate');
assert.match(report.markdown, /Sweep Lunch SHORT/);

console.log('raw OHLC scanner artifact Sweep lunch SHORT full-day stable field miner verified.');
