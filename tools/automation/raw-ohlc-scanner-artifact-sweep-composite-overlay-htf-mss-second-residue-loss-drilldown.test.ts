import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueLossDrilldownReport,
  parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueLossDrilldownArgs,
} from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-second-residue-loss-drilldown';

const broadValidation = {
  status: 'pass',
  selectedRows: [
    { ticketId: 'winner', tradeDate: '2026-06-24', session: 'morning', direction: 'LONG', proofTime: '2026-06-24T10:30:00', riskPoints: 12, outcomeStatus: 'resolved', outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 200 },
    { ticketId: 'base-loss', tradeDate: '2026-06-24', session: 'morning', direction: 'SHORT', proofTime: '2026-06-24T10:35:00', riskPoints: 25, outcomeStatus: 'resolved', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -125 },
    { ticketId: 'residue-package-loss', tradeDate: '2026-06-24', session: 'lunch', direction: 'SHORT', proofTime: '2026-06-24T13:35:00', riskPoints: 25, outcomeStatus: 'resolved', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -125 },
    { ticketId: 'second-residue-loss-1', tradeDate: '2026-06-25', session: 'morning', direction: 'LONG', proofTime: '2026-06-25T11:10:00', riskPoints: 18, outcomeStatus: 'resolved', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -125 },
    { ticketId: 'second-residue-loss-2', tradeDate: '2026-06-25', session: 'morning', direction: 'LONG', proofTime: '2026-06-25T11:15:00', riskPoints: 19, outcomeStatus: 'resolved', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -125 },
    { ticketId: 'second-residue-loss-3', tradeDate: '2026-06-25', session: 'morning', direction: 'LONG', proofTime: '2026-06-25T11:20:00', riskPoints: 20, outcomeStatus: 'resolved', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -125 },
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
  summary: {
    recommendation: 'continue_feature_search',
  },
  packages: [
    {
      name: 'base_plus_zero_winner_residue_all',
      basePackageName: 'zero_winner_cost_all',
      residueScenarioNames: ['session+direction+riskBucket:session=lunch|direction=SHORT|riskBucket=risk_gte_24'],
    },
  ],
};

const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueLossDrilldownReport({
  reportDir: 'reports',
  broadValidationPath: 'broad-validation.json',
  packageSimulationPath: 'package-simulation.json',
  residuePackageSimulationPath: 'residue-package-simulation.json',
  packageName: 'base_plus_zero_winner_residue_all',
  broadValidation: broadValidation as any,
  packageSimulation: packageSimulation as any,
  residuePackageSimulation: residuePackageSimulation as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_second_residue_loss_drilldown');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.secondResidueAfterPackageOnly, true);
assert.equal(report.summary.inputRows, 6);
assert.equal(report.summary.packageRejectedRows, 2);
assert.equal(report.summary.secondResidueRows, 4);
assert.equal(report.summary.secondResidueLossRows, 3);
assert.equal(report.summary.topPreEntryBucket, 'timeBucket:11:00-11:59');
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'mine_second_residue_compounds');
assert.ok(report.topPreEntryBuckets.some((bucket) => bucket.feature === 'direction' && bucket.key === 'LONG' && bucket.losses === 3));
assert.ok(report.topPreEntryBuckets.some((bucket) => bucket.feature === 'session' && bucket.key === 'morning' && bucket.losses === 3));
assert.ok(report.topRegimeBuckets.some((bucket) => bucket.feature === 'tradeDate' && bucket.key === '2026-06-25' && bucket.losses === 3));
assert.match(report.markdown, /HTF MSS Second Residue Loss Drilldown/);

const parsed = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueLossDrilldownArgs([
  '--broad-validation',
  'broad-validation.json',
  '--package-simulation',
  'package-simulation.json',
  '--residue-package-simulation',
  'residue-package-simulation.json',
  '--package-name',
  'base_plus_zero_winner_residue_all',
  '--json',
]);
assert.equal(parsed.packageName, 'base_plus_zero_winner_residue_all');
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep composite overlay HTF MSS second residue loss drilldown verified.');
