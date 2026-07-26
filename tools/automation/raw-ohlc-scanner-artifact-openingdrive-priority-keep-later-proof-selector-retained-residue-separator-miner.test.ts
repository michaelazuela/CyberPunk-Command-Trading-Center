import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRetainedResidueSeparatorMinerReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-retained-residue-separator-miner';

type BuildArgs = Parameters<typeof buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRetainedResidueSeparatorMinerReport>[0];

function slate(date: string, direction: 'LONG' | 'SHORT', resolvedOneMesPl: number | null, rows = 3): NonNullable<BuildArgs['filterSimulation']>['filteredSlateRows'][number] {
  return {
    slateId: `${date}|lunch|NoInstalledSetup|${direction}`,
    rows,
    tradeDate: date,
    session: 'lunch',
    setupType: 'NoInstalledSetup',
    direction,
    proofTime: `${date}T13:00:00`,
    outcomeStatus: resolvedOneMesPl && resolvedOneMesPl > 0 ? 'resolved' : 'unresolved',
    outcomeLabel: resolvedOneMesPl && resolvedOneMesPl > 0 ? 't1_and_t2_hit' : 'no_fill',
    resolvedOneMesPl,
    filterDecision: 'retained',
  };
}

function outcome(date: string, direction: 'LONG' | 'SHORT', riskPoints: number, resolvedOneMesPl: number | null): NonNullable<BuildArgs['outcome']>['rows'][number] {
  return {
    tradeDate: date,
    session: 'lunch',
    setupType: 'NoInstalledSetup',
    direction,
    proofTime: `${date}T13:00:00`,
    outcomeStatus: resolvedOneMesPl && resolvedOneMesPl > 0 ? 'resolved' : 'unresolved',
    outcomeLabel: resolvedOneMesPl && resolvedOneMesPl > 0 ? 't1_and_t2_hit' : 'no_fill',
    riskPoints,
    barsAfterProof: 20,
    entryHitTime: resolvedOneMesPl && resolvedOneMesPl > 0 ? `${date}T13:00:00` : null,
    resolvedOneMesPl,
  };
}

const filterSimulation: BuildArgs['filterSimulation'] = {
  status: 'pass',
  filteredSlateRows: [
    slate('2026-07-01', 'LONG', 100),
    slate('2026-07-02', 'LONG', 100),
    slate('2026-07-03', 'LONG', 100),
    slate('2026-07-04', 'LONG', 100),
    slate('2026-07-05', 'SHORT', null),
    slate('2026-07-06', 'SHORT', null),
    slate('2026-07-07', 'SHORT', null),
    slate('2026-07-08', 'LONG', 25),
  ],
};

const outcomeReport: BuildArgs['outcome'] = {
  status: 'pass',
  rows: [
    outcome('2026-07-01', 'LONG', 8, 100),
    outcome('2026-07-02', 'LONG', 8, 100),
    outcome('2026-07-03', 'LONG', 8, 100),
    outcome('2026-07-04', 'LONG', 8, 100),
    outcome('2026-07-05', 'SHORT', 18, null),
    outcome('2026-07-06', 'SHORT', 18, null),
    outcome('2026-07-07', 'SHORT', 18, null),
    outcome('2026-07-08', 'LONG', 18, 25),
  ],
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRetainedResidueSeparatorMinerReport({
  filterSimulation,
  outcome: outcomeReport,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.retainedSlates, 8);
assert.equal(report.summary.retainedWinnerSlates, 5);
assert.equal(report.summary.retainedProblemSlates, 3);
assert.equal(report.featureStats.some((row) => row.feature === 'riskBucket' && row.value === 'risk_lt_10' && row.verdict === 'positive_lane_candidate'), true);
assert.equal(report.featureStats.some((row) => row.feature === 'riskBucket' && row.value === 'risk_15_to_20' && row.verdict === 'negative_filter_candidate'), true);
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.match(report.markdown, /Retained Residue Separator Miner/);

console.log('OpeningDrive retained residue separator miner verified.');
