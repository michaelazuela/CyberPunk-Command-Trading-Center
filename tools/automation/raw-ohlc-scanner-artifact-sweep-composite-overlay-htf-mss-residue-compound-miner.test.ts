import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssResidueCompoundMinerReport,
  parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssResidueCompoundMinerArgs,
} from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-residue-compound-miner';

const broadValidation = {
  status: 'pass',
  selectedRows: [
    { ticketId: 'base-reject', session: 'morning', direction: 'SHORT', proofTime: '2026-06-24T10:35:00', riskPoints: 25, outcomeStatus: 'resolved', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -125 },
    { ticketId: 'residue-loss-1', session: 'morning', direction: 'LONG', proofTime: '2026-06-24T11:35:00', riskPoints: 29, outcomeStatus: 'resolved', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -125 },
    { ticketId: 'residue-loss-2', session: 'morning', direction: 'LONG', proofTime: '2026-06-24T11:40:00', riskPoints: 30, outcomeStatus: 'resolved', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -125 },
    { ticketId: 'residue-loss-3', session: 'morning', direction: 'LONG', proofTime: '2026-06-24T11:45:00', riskPoints: 31, outcomeStatus: 'resolved', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -125 },
    { ticketId: 'residue-loss-4', session: 'morning', direction: 'LONG', proofTime: '2026-06-24T11:50:00', riskPoints: 29, outcomeStatus: 'resolved', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -125 },
    { ticketId: 'residue-winner', session: 'lunch', direction: 'SHORT', proofTime: '2026-06-24T13:30:00', riskPoints: 10, outcomeStatus: 'resolved', outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 250 },
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

const residueDrilldown = {
  status: 'pass',
  summary: {
    recommendation: 'mine_residue_compounds',
  },
};

const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssResidueCompoundMinerReport({
  reportDir: 'reports',
  broadValidationPath: 'broad-validation.json',
  packageSimulationPath: 'package-simulation.json',
  residueDrilldownPath: 'residue-drilldown.json',
  packageName: 'zero_winner_cost_all',
  broadValidation: broadValidation as any,
  packageSimulation: packageSimulation as any,
  residueDrilldown: residueDrilldown as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_residue_compound_miner');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.residueOnly, true);
assert.equal(report.assumptions.excludesReplayOutcomeFields, true);
assert.equal(report.summary.inputRows, 6);
assert.equal(report.summary.basePackageRejectedRows, 1);
assert.equal(report.summary.residueRows, 5);
assert.equal(report.summary.residueLossRows, 4);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'simulate_residue_compound_package');
assert.ok(report.topResidueCompoundScenarios.some((scenario) => scenario.key.includes('direction=LONG')));
assert.match(report.markdown, /HTF MSS Residue Compound Miner/);

const parsed = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssResidueCompoundMinerArgs([
  '--broad-validation',
  'broad-validation.json',
  '--package-simulation',
  'package-simulation.json',
  '--residue-drilldown',
  'residue-drilldown.json',
  '--package-name',
  'zero_winner_cost_all',
  '--json',
]);
assert.equal(parsed.packageName, 'zero_winner_cost_all');
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep composite overlay HTF MSS residue compound miner verified.');
