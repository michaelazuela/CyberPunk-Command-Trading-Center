import assert from 'node:assert/strict';
import { buildRawOhlcScannerArtifactSweepMorningLongOutcomeDrilldownReport } from './raw-ohlc-scanner-artifact-sweep-morning-long-outcome-drilldown';

const rows = [
  ...Array.from({ length: 12 }, (_, index) => ({
    ticketId: `stop-${index}`,
    tradeDate: '2026-06-10',
    session: 'morning',
    setupType: 'NoInstalledSetup',
    direction: 'LONG' as const,
    proofTime: `2026-06-10T10:${String(index).padStart(2, '0')}:00`,
    outcomeStatus: 'resolved' as const,
    outcomeLabel: 'stopped_before_t1',
    entry: 7500,
    stop: 7488,
    t1: 7518,
    t2: 7524,
    riskPoints: 12,
    barsLoaded: 30,
    barsAfterProof: 20,
    entryHitTime: '2026-06-10T10:05:00',
    firstReplayBarTime: '2026-06-10T10:05:00',
    stopHitTime: '2026-06-10T10:20:00',
    t1HitTime: null,
    t2HitTime: null,
    maximumFavorableExcursion: 5,
    maximumAdverseExcursion: 12,
    resolvedOneMesPl: -60,
    resolvedR: -1,
    blockers: [],
  })),
  ...Array.from({ length: 8 }, (_, index) => ({
    ticketId: `win-${index}`,
    tradeDate: '2026-06-11',
    session: 'morning',
    setupType: 'NoInstalledSetup',
    direction: 'LONG' as const,
    proofTime: `2026-06-11T11:${String(index).padStart(2, '0')}:00`,
    outcomeStatus: 'resolved' as const,
    outcomeLabel: 't1_and_t2_hit',
    entry: 7500,
    stop: 7490,
    t1: 7515,
    t2: 7520,
    riskPoints: 10,
    barsLoaded: 30,
    barsAfterProof: 18,
    entryHitTime: '2026-06-11T11:05:00',
    firstReplayBarTime: '2026-06-11T11:05:00',
    stopHitTime: null,
    t1HitTime: '2026-06-11T11:15:00',
    t2HitTime: '2026-06-11T11:20:00',
    maximumFavorableExcursion: 22,
    maximumAdverseExcursion: 2,
    resolvedOneMesPl: 100,
    resolvedR: 2,
    blockers: [],
  })),
  {
    ticketId: 'ignored-short',
    tradeDate: '2026-06-11',
    session: 'morning',
    setupType: 'NoInstalledSetup',
    direction: 'SHORT' as const,
    proofTime: '2026-06-11T11:00:00',
    outcomeStatus: 'resolved' as const,
    outcomeLabel: 'stopped_before_t1',
    entry: 7500,
    stop: 7510,
    t1: 7485,
    t2: 7480,
    riskPoints: 10,
    barsLoaded: 30,
    barsAfterProof: 18,
    entryHitTime: '2026-06-11T11:05:00',
    firstReplayBarTime: '2026-06-11T11:05:00',
    stopHitTime: '2026-06-11T11:20:00',
    t1HitTime: null,
    t2HitTime: null,
    maximumFavorableExcursion: 2,
    maximumAdverseExcursion: 10,
    resolvedOneMesPl: -50,
    resolvedR: -1,
    blockers: [],
  },
];

const report = buildRawOhlcScannerArtifactSweepMorningLongOutcomeDrilldownReport({
  outcomePath: 'synthetic-outcome.json',
  outcome: { status: 'pass', rows },
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.filteredRows, 20);
assert.equal(report.summary.resolvedRows, 20);
assert.equal(report.summary.unresolvedRows, 0);
assert.equal(report.summary.winnerRows, 8);
assert.equal(report.summary.problemRows, 12);
assert.equal(report.summary.stoppedRows, 12);
assert.equal(report.summary.noFillRows, 0);
assert.equal(report.summary.noTargetOrStopRows, 0);
assert.equal(report.summary.grossResolvedOneMesPl, 80);
assert.equal(report.summary.dominantProblem, 'stopped_before_t1');
assert.equal(report.summary.recommendation, 'investigate_morning_long_filters');
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.equal(report.bucketRows.find((row) => row.bucketType === 'outcome_label' && row.bucket === 'stopped_before_t1')?.rows, 12);
assert.equal(report.sampleRows.length, 12);
assert.equal(report.sampleRows[0].causeClass, 'stopped_before_t1');
assert.match(report.markdown, /Sweep Morning LONG Outcome Drilldown/);

console.log('raw OHLC scanner artifact Sweep morning LONG outcome drilldown verified.');
