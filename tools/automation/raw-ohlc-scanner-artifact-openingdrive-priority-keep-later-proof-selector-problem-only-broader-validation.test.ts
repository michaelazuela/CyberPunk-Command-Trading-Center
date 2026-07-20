import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProblemOnlyBroaderValidationReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-problem-only-broader-validation';

type BuildArgs = Parameters<typeof buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProblemOnlyBroaderValidationReport>[0];

const miner: BuildArgs['miner'] = {
  status: 'pass',
  featureCombos: [
    {
      featureCombo: 'direction=LONG&riskBucket=risk_gte_25',
      verdict: 'clean_problem_only_candidate',
      matchedProblemOnlyGroups: 2,
    },
    {
      featureCombo: 'direction=LONG&rowCountBucket=rows_6_to_10',
      verdict: 'clean_problem_only_candidate',
      matchedProblemOnlyGroups: 2,
    },
  ],
};

const outcome: BuildArgs['outcome'] = {
  status: 'pass',
  rows: [
    {
      ticketId: 'problem',
      tradeDate: '2026-07-01',
      session: 'morning',
      setupType: 'SweepMssFvgRetrace',
      direction: 'LONG',
      proofTime: '2026-07-01T11:00:00',
      outcomeStatus: 'resolved',
      outcomeLabel: 'stopped_before_t1',
      riskPoints: 30,
      barsAfterProof: 10,
      resolvedOneMesPl: -100,
    },
    {
      ticketId: 'winner',
      tradeDate: '2026-07-02',
      session: 'morning',
      setupType: 'SweepMssFvgRetrace',
      direction: 'SHORT',
      proofTime: '2026-07-02T11:00:00',
      outcomeStatus: 'resolved',
      outcomeLabel: 't1_and_t2_hit',
      riskPoints: 8,
      barsAfterProof: 10,
      resolvedOneMesPl: 120,
    },
  ],
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProblemOnlyBroaderValidationReport({
  miner,
  outcome,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.broaderOutcomeRows, 2);
assert.equal(report.summary.cleanMinerCombosRead, 2);
assert.equal(report.summary.supportedCombos, 1);
assert.equal(report.summary.unsupportedCombos, 1);
assert.equal(report.summary.survivingCombos, 1);
assert.equal(report.summary.recommendation, 'validate_surviving_combos_on_fresh_artifacts');
assert.equal(report.comboValidations[0].verdict, 'survives_broader_validation');
assert.match(report.markdown, /Broader Validation/);

console.log('OpeningDrive problem-only broader validation verified.');
