import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssResiduePackageSimulationReport,
  parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssResiduePackageSimulationArgs,
} from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-residue-package-simulation';

const broadValidation = {
  status: 'pass',
  selectedRows: [
    { ticketId: 'winner', session: 'morning', direction: 'LONG', proofTime: '2026-06-24T10:30:00', riskPoints: 12, outcomeStatus: 'resolved', outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 200 },
    { ticketId: 'base-loss', session: 'morning', direction: 'SHORT', proofTime: '2026-06-24T10:35:00', riskPoints: 25, outcomeStatus: 'resolved', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -125 },
    { ticketId: 'residue-loss-1', session: 'lunch', direction: 'SHORT', proofTime: '2026-06-24T13:35:00', riskPoints: 25, outcomeStatus: 'resolved', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -125 },
    { ticketId: 'residue-loss-2', session: 'lunch', direction: 'SHORT', proofTime: '2026-06-24T13:40:00', riskPoints: 26, outcomeStatus: 'resolved', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -125 },
    { ticketId: 'residue-loss-3', session: 'lunch', direction: 'SHORT', proofTime: '2026-06-24T13:45:00', riskPoints: 27, outcomeStatus: 'resolved', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -125 },
    { ticketId: 'residue-loss-4', session: 'lunch', direction: 'SHORT', proofTime: '2026-06-24T13:50:00', riskPoints: 28, outcomeStatus: 'resolved', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -125 },
  ],
};

const packageSimulation = {
  status: 'pass',
  packages: [
    {
      name: 'zero_winner_cost_all',
      rejectedRows: 1,
      scenarioNames: ['session+direction+riskBucket:session=morning|direction=SHORT|riskBucket=risk_gte_24'],
    },
  ],
};

const residueCompoundMiner = {
  status: 'pass',
  summary: {
    recommendation: 'simulate_residue_compound_package',
  },
  topResidueCompoundScenarios: [
    {
      name: 'session+direction+riskBucket:session=lunch|direction=SHORT|riskBucket=risk_gte_24',
      key: 'session=lunch|direction=SHORT|riskBucket=risk_gte_24',
      rejectedWinnerCost: 0,
      rejectedLosses: 4,
    },
  ],
};

const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssResiduePackageSimulationReport({
  reportDir: 'reports',
  broadValidationPath: 'broad-validation.json',
  packageSimulationPath: 'package-simulation.json',
  residueCompoundMinerPath: 'residue-compound-miner.json',
  basePackageName: 'zero_winner_cost_all',
  broadValidation: broadValidation as any,
  packageSimulation: packageSimulation as any,
  residueCompoundMiner: residueCompoundMiner as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_residue_package_simulation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.secondPackageSimulationOnly, true);
assert.equal(report.summary.inputRows, 6);
assert.equal(report.summary.basePackageRejectedRows, 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.zeroSelectedLossPackage, 'base_plus_zero_winner_residue_all');
assert.equal(report.summary.recommendation, 'prepare_research_only_proposal_update');
assert.equal(report.packages[0].rejectedWinners, 0);
assert.equal(report.packages[0].rejectedLosses, 5);
assert.match(report.markdown, /HTF MSS Residue Package Simulation/);

const parsed = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssResiduePackageSimulationArgs([
  '--broad-validation',
  'broad-validation.json',
  '--package-simulation',
  'package-simulation.json',
  '--residue-compound-miner',
  'residue-compound-miner.json',
  '--base-package-name',
  'zero_winner_cost_all',
  '--json',
]);
assert.equal(parsed.basePackageName, 'zero_winner_cost_all');
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep composite overlay HTF MSS residue package simulation verified.');
