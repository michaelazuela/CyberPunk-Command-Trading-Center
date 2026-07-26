import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProblemOnlyQualityMinerReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-problem-only-quality-miner';

type BuildArgs = Parameters<typeof buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProblemOnlyQualityMinerReport>[0];

const overlaySimulation: BuildArgs['overlaySimulation'] = {
  status: 'pass',
  overlayRows: [
    {
      slateId: '2026-07-01|morning|NoInstalledSetup|LONG',
      tradeDate: '2026-07-01',
      session: 'morning',
      direction: 'LONG',
      proofTime: '2026-07-01T11:30:00',
      classLabel: 'problem',
      outcomeLabel: 'no_target_or_stop_hit',
      resolvedOneMesPl: null,
      riskPoints: 30,
      barsAfterProof: 5,
      rowCount: 5,
      entryHit: true,
      features: {
        session: 'morning',
        direction: 'LONG',
        riskBucket: 'risk_gte_25',
        proofWindow: 'proof_10_to_12',
        rowCountBucket: 'rows_3_to_5',
      },
      overlaySelected: false,
      overlayReason: 'not in positive-lane union',
    },
    {
      slateId: '2026-07-02|morning|NoInstalledSetup|LONG',
      tradeDate: '2026-07-02',
      session: 'morning',
      direction: 'LONG',
      proofTime: '2026-07-02T11:10:00',
      classLabel: 'problem',
      outcomeLabel: 'stopped_before_t1',
      resolvedOneMesPl: -100,
      riskPoints: 28,
      barsAfterProof: 12,
      rowCount: 4,
      entryHit: true,
      features: {
        session: 'morning',
        direction: 'LONG',
        riskBucket: 'risk_gte_25',
        proofWindow: 'proof_10_to_12',
        rowCountBucket: 'rows_3_to_5',
      },
      overlaySelected: false,
      overlayReason: 'not in positive-lane union',
    },
    {
      slateId: '2026-07-03|morning|NoInstalledSetup|SHORT',
      tradeDate: '2026-07-03',
      session: 'morning',
      direction: 'SHORT',
      proofTime: '2026-07-03T09:45:00',
      classLabel: 'winner',
      outcomeLabel: 't1_and_t2_hit',
      resolvedOneMesPl: 150,
      riskPoints: 8,
      barsAfterProof: 20,
      rowCount: 8,
      entryHit: true,
      features: {
        session: 'morning',
        direction: 'SHORT',
        riskBucket: 'risk_lt_10',
        proofWindow: 'proof_before_10',
        rowCountBucket: 'rows_6_to_10',
      },
      overlaySelected: true,
      overlayReason: 'riskBucket=risk_lt_10',
    },
  ],
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProblemOnlyQualityMinerReport({
  overlaySimulation,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.dateSessionGroups, 3);
assert.equal(report.summary.problemOnlyGroups, 2);
assert.ok(report.summary.featureCombosTested > 0);
assert.ok(report.summary.cleanProblemOnlyCombos > 0);
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.equal(report.summary.recommendation, 'validate_clean_problem_only_combos_against_broader_source');
assert.equal(report.featureCombos[0].verdict, 'clean_problem_only_candidate');
assert.equal(report.featureCombos[0].matchedProblemOnlyGroups, 2);
assert.match(report.markdown, /Problem-Only Quality Miner/);

console.log('OpeningDrive problem-only quality miner verified.');
