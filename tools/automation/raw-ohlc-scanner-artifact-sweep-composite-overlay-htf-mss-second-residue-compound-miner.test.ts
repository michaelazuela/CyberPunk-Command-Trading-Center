import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueCompoundMinerReport,
  parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueCompoundMinerArgs,
} from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-second-residue-compound-miner';

const broadValidation = {
  status: 'pass',
  selectedRows: [
    { ticketId: 'base-reject', tradeDate: '2026-06-24', session: 'morning', direction: 'SHORT', proofTime: '2026-06-24T10:35:00', riskPoints: 25, outcomeStatus: 'resolved', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -125 },
    { ticketId: 'residue-package-reject', tradeDate: '2026-06-24', session: 'lunch', direction: 'SHORT', proofTime: '2026-06-24T13:35:00', riskPoints: 25, outcomeStatus: 'resolved', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -125 },
    { ticketId: 'second-loss-1', tradeDate: '2026-06-25', session: 'morning', direction: 'LONG', proofTime: '2026-06-25T11:10:00', riskPoints: 18, outcomeStatus: 'resolved', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -125 },
    { ticketId: 'second-loss-2', tradeDate: '2026-06-25', session: 'morning', direction: 'LONG', proofTime: '2026-06-25T11:15:00', riskPoints: 19, outcomeStatus: 'resolved', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -125 },
    { ticketId: 'second-loss-3', tradeDate: '2026-06-25', session: 'morning', direction: 'LONG', proofTime: '2026-06-25T11:20:00', riskPoints: 20, outcomeStatus: 'resolved', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -125 },
    { ticketId: 'second-loss-4', tradeDate: '2026-06-25', session: 'morning', direction: 'LONG', proofTime: '2026-06-25T11:25:00', riskPoints: 21, outcomeStatus: 'resolved', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -125 },
    { ticketId: 'other-winner', tradeDate: '2026-06-25', session: 'lunch', direction: 'SHORT', proofTime: '2026-06-25T13:15:00', riskPoints: 10, outcomeStatus: 'resolved', outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 250 },
  ],
};

const packageSimulation = {
  status: 'pass',
  packages: [
    {
      name: 'zero_winner_cost_all',
      scenarioNames: ['session+direction+riskBucket:session=morning|direction=SHORT|riskBucket=risk_gte_24'],
    },
  ],
};

const residuePackageSimulation = {
  status: 'pass',
  packages: [
    {
      name: 'base_plus_zero_winner_residue_all',
      basePackageName: 'zero_winner_cost_all',
      residueScenarioNames: ['session+direction+riskBucket:session=lunch|direction=SHORT|riskBucket=risk_gte_24'],
    },
  ],
};

const secondResidueDrilldown = {
  status: 'pass',
  summary: {
    recommendation: 'mine_second_residue_compounds',
  },
};

const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueCompoundMinerReport({
  reportDir: 'reports',
  broadValidationPath: 'broad-validation.json',
  packageSimulationPath: 'package-simulation.json',
  residuePackageSimulationPath: 'residue-package-simulation.json',
  secondResidueDrilldownPath: 'second-residue-drilldown.json',
  packageName: 'base_plus_zero_winner_residue_all',
  broadValidation: broadValidation as any,
  packageSimulation: packageSimulation as any,
  residuePackageSimulation: residuePackageSimulation as any,
  secondResidueDrilldown: secondResidueDrilldown as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_second_residue_compound_miner');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.secondResidueOnly, true);
assert.equal(report.assumptions.excludesDateRegimeFeatures, true);
assert.equal(report.assumptions.excludesReplayOutcomeFields, true);
assert.equal(report.summary.inputRows, 7);
assert.equal(report.summary.packageRejectedRows, 2);
assert.equal(report.summary.secondResidueRows, 5);
assert.equal(report.summary.secondResidueLossRows, 4);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.zeroWinnerCostScenario, 'session+direction+timeBucket+riskBucket:session=morning|direction=LONG|timeBucket=11:00-11:59|riskBucket=risk_16_to_24');
assert.equal(report.summary.recommendation, 'simulate_second_residue_compound_package');
assert.ok(report.topSecondResidueCompoundScenarios.every((scenario) => !scenario.features.includes('tradeDate' as any)));
assert.match(report.markdown, /HTF MSS Second Residue Compound Miner/);

const parsed = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueCompoundMinerArgs([
  '--broad-validation',
  'broad-validation.json',
  '--package-simulation',
  'package-simulation.json',
  '--residue-package-simulation',
  'residue-package-simulation.json',
  '--second-residue-drilldown',
  'second-residue-drilldown.json',
  '--package-name',
  'base_plus_zero_winner_residue_all',
  '--json',
]);
assert.equal(parsed.packageName, 'base_plus_zero_winner_residue_all');
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep composite overlay HTF MSS second residue compound miner verified.');
