import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPackageSimulationReport,
  parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPackageSimulationArgs,
} from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-compound-package-simulation';

const broadValidation = {
  status: 'pass',
  selectedRows: [
    { ticketId: 'winner', session: 'morning', direction: 'LONG', proofTime: '2026-06-24T10:30:00', riskPoints: 12, outcomeStatus: 'resolved', outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 200 },
    { ticketId: 'loss-1', session: 'morning', direction: 'SHORT', proofTime: '2026-06-24T10:35:00', riskPoints: 25, outcomeStatus: 'resolved', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -125 },
    { ticketId: 'loss-2', session: 'morning', direction: 'SHORT', proofTime: '2026-06-24T10:40:00', riskPoints: 25, outcomeStatus: 'resolved', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -125 },
    { ticketId: 'loss-3', session: 'morning', direction: 'SHORT', proofTime: '2026-06-24T10:45:00', riskPoints: 25, outcomeStatus: 'resolved', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -125 },
    { ticketId: 'loss-4', session: 'morning', direction: 'SHORT', proofTime: '2026-06-24T10:50:00', riskPoints: 25, outcomeStatus: 'resolved', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -125 },
    { ticketId: 'loss-5', session: 'morning', direction: 'SHORT', proofTime: '2026-06-24T10:55:00', riskPoints: 25, outcomeStatus: 'resolved', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -125 },
  ],
};

const compoundMiner = {
  status: 'pass',
  summary: {
    recommendation: 'simulate_compound_package',
  },
  topCompoundScenarios: [
    {
      name: 'session+direction+riskBucket:session=morning|direction=SHORT|riskBucket=risk_gte_24',
      key: 'session=morning|direction=SHORT|riskBucket=risk_gte_24',
      rejectedWinnerCost: 0,
      rejectedLosses: 5,
    },
  ],
};

const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPackageSimulationReport({
  reportDir: 'reports',
  broadValidationPath: 'broad-validation.json',
  compoundMinerPath: 'compound-miner.json',
  broadValidation: broadValidation as any,
  compoundMiner: compoundMiner as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_compound_package_simulation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.preEntryFeaturesOnly, true);
assert.equal(report.summary.inputSelectedRows, 6);
assert.equal(report.summary.inputLossRows, 5);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.zeroSelectedLossPackage, 'zero_winner_cost_all');
assert.equal(report.summary.recommendation, 'prepare_research_only_proposal_update');
assert.equal(report.packages[0].rejectedWinners, 0);
assert.equal(report.packages[0].rejectedLosses, 5);
assert.match(report.markdown, /HTF MSS Compound Package Simulation/);

const parsed = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPackageSimulationArgs([
  '--broad-validation',
  'broad-validation.json',
  '--compound-miner',
  'compound-miner.json',
  '--json',
]);
assert.equal(parsed.broadValidation, 'broad-validation.json');
assert.equal(parsed.compoundMiner, 'compound-miner.json');
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep composite overlay HTF MSS compound package simulation verified.');
