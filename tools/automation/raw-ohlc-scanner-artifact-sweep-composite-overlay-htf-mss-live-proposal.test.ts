import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssLiveProposalReport,
  parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssLiveProposalArgs,
} from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-live-proposal';

const authority = {
  readOnly: true,
  localOnly: true,
  researchOnly: true,
  postsDiscord: false,
  writesSupabase: false,
  readsLiveSupabase: false,
  readsLiveBridge: false,
  runsSetupScanner: false,
  changesScannerBehavior: false,
  changesTradingLogic: false,
  changesCanExecute: false,
  changesEntryStopTargets: false,
  changesRiskRules: false,
  changesBridgeBehavior: false,
  changesDiscordPosting: false,
  changesAppRuntime: false,
} as const;

const htfMssSimulation = {
  status: 'pass',
  authority,
  summary: {
    selectedRows: 5,
    selectedResolvedRows: 4,
    selectedUnresolvedRows: 1,
    selectedResolvedGrossOneMesPl: 655,
    livePromotionAllowedRows: 0,
    recommendation: 'prepare_promotion_disabled_live_proposal',
  },
};

const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssLiveProposalReport({
  reportDir: 'reports',
  htfMssSimulationPath: 'simulation.json',
  htfMssSimulation: htfMssSimulation as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_live_proposal');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.assumptions.proposalOnly, true);
assert.equal(report.assumptions.promotionDisabled, true);
assert.equal(report.proposal.scannerVisibleNow, false);
assert.equal(report.proposal.requiresFutureApprovalGate, true);
assert.equal(report.summary.simulationSelectedRows, 5);
assert.equal(report.summary.simulationSelectedResolvedRows, 4);
assert.equal(report.summary.simulationSelectedResolvedGrossOneMesPl, 655);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'ready_for_approval_checkpoint');
assert.ok(report.proposal.prohibitedChanges.includes('Do not loosen canExecute.'));
assert.match(report.markdown, /Promotion-Disabled HTF MSS-Only Overlay Proposal/);

const parsed = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssLiveProposalArgs([
  '--htf-mss-simulation',
  'simulation.json',
  '--json',
]);
assert.equal(parsed.htfMssSimulation, 'simulation.json');
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep composite overlay HTF MSS live proposal verified.');
