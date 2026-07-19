import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssApprovalContractReport,
  parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssApprovalContractArgs,
} from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-approval-contract';

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

const proposal = {
  status: 'pass',
  authority,
  proposal: {
    scannerVisibleNow: false,
    requiresFutureApprovalGate: true,
  },
  summary: {
    simulationSelectedRows: 5,
    simulationSelectedResolvedRows: 4,
    simulationSelectedUnresolvedRows: 1,
    simulationSelectedResolvedGrossOneMesPl: 655,
    livePromotionAllowedRows: 0,
    recommendation: 'ready_for_approval_checkpoint',
  },
};

const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssApprovalContractReport({
  reportDir: 'reports',
  proposalPath: 'proposal.json',
  proposal: proposal as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_approval_contract');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.assumptions.contractOnly, true);
assert.equal(report.assumptions.implementationAllowedNow, false);
assert.equal(report.assumptions.scannerVisibleInstallAllowedNow, false);
assert.equal(report.approvalContract.approvalRequiredBeforeImplementation, true);
assert.equal(report.approvalContract.implementationAllowedNow, false);
assert.equal(report.approvalContract.scannerVisibleInstallAllowedNow, false);
assert.equal(report.summary.proposalReady, true);
assert.equal(report.summary.proposalSelectedRows, 5);
assert.equal(report.summary.proposalSelectedResolvedRows, 4);
assert.equal(report.summary.proposalSelectedResolvedGrossOneMesPl, 655);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.failedGateCount, 0);
assert.equal(report.summary.recommendation, 'await_explicit_approval_or_broaden_research');
assert.ok(report.approvalContract.requiredRegressionCommands.includes('npm run test'));
assert.ok(report.approvalContract.implementationInvariants.some((item) => item.includes('canExecute must not be loosened')));
assert.match(report.markdown, /HTF MSS Overlay Approval Regression Contract/);

const failed = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssApprovalContractReport({
  reportDir: 'reports',
  proposalPath: 'bad-proposal.json',
  proposal: {
    ...proposal,
    summary: {
      ...proposal.summary,
      livePromotionAllowedRows: 1,
    },
  } as any,
}, '2026-07-19T00:00:00.000Z');
assert.equal(failed.status, 'fail');
assert.equal(failed.summary.recommendation, 'fix_inputs');
assert.ok(failed.blockers.some((blocker) => blocker.includes('promotion_still_disabled')));

const parsed = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssApprovalContractArgs([
  '--proposal',
  'proposal.json',
  '--json',
]);
assert.equal(parsed.proposal, 'proposal.json');
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep composite overlay HTF MSS approval contract verified.');
