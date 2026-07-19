import assert from 'node:assert/strict';
import { buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssResidueLossDrilldownReport, parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssResidueLossDrilldownArgs } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-residue-loss-drilldown';

const broadValidation = { status: 'pass', selectedRows: [
  { session: 'morning', direction: 'SHORT', proofTime: '2026-06-24T10:35:00', riskPoints: 25, outcomeStatus: 'resolved', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -125 },
  { session: 'morning', direction: 'LONG', proofTime: '2026-06-24T11:35:00', riskPoints: 17, outcomeStatus: 'resolved', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -125 },
  { session: 'morning', direction: 'LONG', proofTime: '2026-06-24T11:40:00', riskPoints: 18, outcomeStatus: 'resolved', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -125 },
  { session: 'morning', direction: 'LONG', proofTime: '2026-06-24T11:45:00', riskPoints: 19, outcomeStatus: 'resolved', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -125 },
  { session: 'lunch', direction: 'SHORT', proofTime: '2026-06-24T13:30:00', riskPoints: 10, outcomeStatus: 'resolved', outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 250 },
] };
const packageSimulation = { status: 'pass', packages: [{ name: 'zero_winner_cost_all', scenarioNames: ['session+direction+riskBucket:session=morning|direction=SHORT|riskBucket=risk_gte_24'] }] };
const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssResidueLossDrilldownReport({ reportDir: 'reports', broadValidationPath: 'broad.json', packageSimulationPath: 'package.json', packageName: 'zero_winner_cost_all', broadValidation: broadValidation as any, packageSimulation: packageSimulation as any }, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_residue_loss_drilldown');
assert.equal(report.status, 'pass');
assert.equal(report.summary.inputRows, 5);
assert.equal(report.summary.packageRejectedRows, 1);
assert.equal(report.summary.residueRows, 4);
assert.equal(report.summary.residueLossRows, 3);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'mine_residue_compounds');
assert.ok(report.topResidueBuckets.some((bucket) => bucket.feature === 'session' && bucket.key === 'morning'));
assert.match(report.markdown, /HTF MSS Residue Loss Drilldown/);

const parsed = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssResidueLossDrilldownArgs(['--broad-validation', 'broad.json', '--package-simulation', 'package.json', '--package-name', 'zero_winner_cost_all', '--json']);
assert.equal(parsed.packageName, 'zero_winner_cost_all');
assert.equal(parsed.json, true);
console.log('raw OHLC Sweep composite overlay HTF MSS residue loss drilldown verified.');
