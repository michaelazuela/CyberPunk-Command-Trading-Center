import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResiduePackageSimulationReport,
  parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResiduePackageSimulationArgs,
} from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-second-residue-package-simulation';

const broadValidation = {
  status: 'pass',
  selectedRows: [
    { ticketId: 'base-reject', session: 'morning', direction: 'SHORT', proofTime: '2026-06-24T10:35:00', riskPoints: 25, outcomeStatus: 'resolved', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -125 },
    { ticketId: 'residue-reject', session: 'lunch', direction: 'SHORT', proofTime: '2026-06-24T13:35:00', riskPoints: 25, outcomeStatus: 'resolved', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -125 },
    { ticketId: 'second-loss-1', session: 'morning', direction: 'LONG', proofTime: '2026-06-25T11:10:00', riskPoints: 18, outcomeStatus: 'resolved', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -125 },
    { ticketId: 'second-loss-2', session: 'morning', direction: 'LONG', proofTime: '2026-06-25T11:15:00', riskPoints: 19, outcomeStatus: 'resolved', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -125 },
    { ticketId: 'second-loss-3', session: 'morning', direction: 'LONG', proofTime: '2026-06-25T11:20:00', riskPoints: 20, outcomeStatus: 'resolved', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -125 },
    { ticketId: 'winner', session: 'lunch', direction: 'LONG', proofTime: '2026-06-25T13:15:00', riskPoints: 10, outcomeStatus: 'resolved', outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 250 },
  ],
};

const packageSimulation = { status: 'pass', packages: [{ name: 'zero_winner_cost_all', scenarioNames: ['session+direction+riskBucket:session=morning|direction=SHORT|riskBucket=risk_gte_24'] }] };
const residuePackageSimulation = { status: 'pass', packages: [{ name: 'base_plus_zero_winner_residue_all', basePackageName: 'zero_winner_cost_all', residueScenarioNames: ['session+direction+riskBucket:session=lunch|direction=SHORT|riskBucket=risk_gte_24'] }] };
const secondResidueCompoundMiner = {
  status: 'pass',
  summary: { recommendation: 'simulate_second_residue_compound_package' },
  topSecondResidueCompoundScenarios: [
    { name: 'session+direction+riskBucket:session=morning|direction=LONG|riskBucket=risk_16_to_24', key: 'session=morning|direction=LONG|riskBucket=risk_16_to_24', rejectedWinnerCost: 0, rejectedLosses: 3 },
  ],
};

const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResiduePackageSimulationReport({
  reportDir: 'reports',
  broadValidationPath: 'broad-validation.json',
  packageSimulationPath: 'package-simulation.json',
  residuePackageSimulationPath: 'residue-package-simulation.json',
  secondResidueCompoundMinerPath: 'second-residue-compound-miner.json',
  packageName: 'base_plus_zero_winner_residue_all',
  broadValidation: broadValidation as any,
  packageSimulation: packageSimulation as any,
  residuePackageSimulation: residuePackageSimulation as any,
  secondResidueCompoundMiner: secondResidueCompoundMiner as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_second_residue_package_simulation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.thirdPackageSimulationOnly, true);
assert.equal(report.summary.inputRows, 6);
assert.equal(report.summary.basePackageRejectedRows, 2);
assert.equal(report.summary.zeroSelectedLossPackage, 'base_plus_second_zero_winner_all');
assert.equal(report.summary.recommendation, 'prepare_research_only_proposal_update');
assert.equal(report.packages[0].rejectedWinners, 0);
assert.equal(report.packages[0].rejectedLosses, 5);
assert.equal(report.packages[0].selectedLosses, 0);
assert.match(report.markdown, /HTF MSS Second Residue Package Simulation/);

const parsed = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResiduePackageSimulationArgs([
  '--broad-validation',
  'broad-validation.json',
  '--package-simulation',
  'package-simulation.json',
  '--residue-package-simulation',
  'residue-package-simulation.json',
  '--second-residue-compound-miner',
  'second-residue-compound-miner.json',
  '--json',
]);
assert.equal(parsed.packageName, 'base_plus_zero_winner_residue_all');
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep composite overlay HTF MSS second residue package simulation verified.');
