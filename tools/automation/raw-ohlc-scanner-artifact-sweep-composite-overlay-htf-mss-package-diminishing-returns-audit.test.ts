import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssPackageDiminishingReturnsAuditReport,
  parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssPackageDiminishingReturnsAuditArgs,
} from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-package-diminishing-returns-audit';

const compoundPackageSimulation = {
  status: 'pass',
  packages: [
    { name: 'zero_winner_cost_all', selectedWinners: 231, selectedLosses: 56, selectedUnresolved: 17, selectedOneMesPl: 22961.25, rejectedWinners: 0, rejectedLosses: 36, rejectedOneMesPl: -2557.5 },
  ],
};
const residuePackageSimulation = {
  status: 'pass',
  packages: [
    { name: 'base_plus_zero_winner_residue_all', selectedWinners: 231, selectedLosses: 47, selectedUnresolved: 17, selectedOneMesPl: 24081.25, rejectedWinners: 0, rejectedLosses: 45, rejectedOneMesPl: -3677.5 },
  ],
};
const secondResiduePackageSimulation = {
  status: 'pass',
  summary: {
    bestPackage: 'base_plus_second_top5_loss',
    zeroSelectedLossPackage: null,
  },
  packages: [
    { name: 'base_plus_second_zero_winner_all', selectedWinners: 231, selectedLosses: 44, selectedUnresolved: 17, selectedOneMesPl: 24203.75, rejectedWinners: 0, rejectedLosses: 48, rejectedOneMesPl: -3800 },
    { name: 'base_plus_second_top5_loss', selectedWinners: 223, selectedLosses: 33, selectedUnresolved: 16, selectedOneMesPl: 22631.25, rejectedWinners: 8, rejectedLosses: 59, rejectedOneMesPl: -2227.5 },
  ],
};

const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssPackageDiminishingReturnsAuditReport({
  reportDir: 'reports',
  compoundPackageSimulationPath: 'compound.json',
  residuePackageSimulationPath: 'residue.json',
  secondResiduePackageSimulationPath: 'second-residue.json',
  compoundPackageSimulation: compoundPackageSimulation as any,
  residuePackageSimulation: residuePackageSimulation as any,
  secondResiduePackageSimulation: secondResiduePackageSimulation as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_package_diminishing_returns_audit');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.packageChainAuditOnly, true);
assert.deepEqual(report.summary.cleanPackageMarginalLossReductions, [9, 3]);
assert.equal(report.summary.latestCleanMarginalLossReduction, 3);
assert.equal(report.summary.strongestPackageRejectedWinnerCost, 8);
assert.equal(report.summary.recommendation, 'halt_htf_mss_filter_mining_and_pivot');
assert.match(report.markdown, /HTF MSS Package Diminishing Returns Audit/);

const parsed = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssPackageDiminishingReturnsAuditArgs([
  '--compound-package-simulation',
  'compound.json',
  '--residue-package-simulation',
  'residue.json',
  '--second-residue-package-simulation',
  'second-residue.json',
  '--json',
]);
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep composite overlay HTF MSS package diminishing returns audit verified.');
