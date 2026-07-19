import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorProposalUpdateReport,
  parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorProposalUpdateArgs,
} from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-second-separator-proposal-update';

const secondSeparatorSimulation = {
  status: 'pass',
  secondSeparator: {
    name: 'selected_loss_second_separator',
    tradeDate: '2026-07-17',
    session: 'morning',
    direction: 'LONG',
    timeBucket: '11:00-11:59',
    riskBucket: 'risk_16_to_24',
    sourceLossRows: 3,
  },
  summary: {
    selectedRows: 90,
    selectedWinners: 62,
    selectedLosses: 0,
    selectedUnresolved: 13,
    selectedOneMesPl: 6668.75,
    totalRejectedRows: 15,
    totalRejectedWinners: 0,
    totalRejectedLosses: 10,
    totalRejectedUnresolved: 5,
    totalRejectedOneMesPl: -896.25,
    livePromotionAllowedRows: 0,
    recommendation: 'prepare_research_only_proposal_update',
  },
};

const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorProposalUpdateReport({
  reportDir: 'reports',
  secondSeparatorSimulationPath: 'second-simulation.json',
  secondSeparatorSimulation: secondSeparatorSimulation as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_second_separator_proposal_update');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.assumptions.proposalUpdateOnly, true);
assert.equal(report.assumptions.promotionDisabled, true);
assert.equal(report.proposalUpdate.scannerVisibleNow, false);
assert.equal(report.proposalUpdate.requiresFutureApprovalGate, true);
assert.equal(report.proposalUpdate.exclusionCriteria.length, 2);
assert.match(report.proposalUpdate.exclusionCriteria[1].value, /2026-07-17 morning LONG 11:00-11:59 risk_16_to_24/);
assert.equal(report.summary.simulationSelectedRows, 90);
assert.equal(report.summary.simulationSelectedWinners, 62);
assert.equal(report.summary.simulationSelectedLosses, 0);
assert.equal(report.summary.simulationSelectedOneMesPl, 6668.75);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'ready_for_approval_contract');
assert.ok(report.proposalUpdate.prohibitedChanges.includes('Do not loosen canExecute.'));
assert.match(report.markdown, /HTF MSS Two-Separator Proposal Update/);

const parsed = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorProposalUpdateArgs([
  '--second-separator-simulation',
  'second-simulation.json',
  '--json',
]);
assert.equal(parsed.secondSeparatorSimulation, 'second-simulation.json');
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep composite overlay HTF MSS second-separator proposal update verified.');
