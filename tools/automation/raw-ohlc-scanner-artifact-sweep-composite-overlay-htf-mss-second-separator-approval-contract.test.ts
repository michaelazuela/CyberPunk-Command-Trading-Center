import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorApprovalContractReport,
  parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorApprovalContractArgs,
} from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-second-separator-approval-contract';

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

const proposalUpdate = {
  status: 'pass',
  authority,
  proposalUpdate: {
    scannerVisibleNow: false,
    requiresFutureApprovalGate: true,
  },
  summary: {
    recommendation: 'ready_for_approval_contract',
    simulationSelectedRows: 90,
    simulationSelectedWinners: 62,
    simulationSelectedLosses: 0,
    simulationSelectedUnresolved: 13,
    simulationSelectedOneMesPl: 6668.75,
    livePromotionAllowedRows: 0,
  },
};

const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorApprovalContractReport({
  reportDir: 'reports',
  proposalUpdatePath: 'proposal-update.json',
  proposalUpdate: proposalUpdate as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_second_separator_approval_contract');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.assumptions.implementationAllowedNow, false);
assert.equal(report.assumptions.scannerVisibleInstallAllowedNow, false);
assert.equal(report.approvalContract.approvalRequiredBeforeImplementation, true);
assert.equal(report.approvalContract.implementationAllowedNow, false);
assert.equal(report.approvalContract.scannerVisibleInstallAllowedNow, false);
assert.equal(report.summary.proposalReady, true);
assert.equal(report.summary.proposalSelectedWinners, 62);
assert.equal(report.summary.proposalSelectedLosses, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.failedGateCount, 0);
assert.equal(report.summary.recommendation, 'await_explicit_approval_or_broaden_research');
assert.ok(report.approvalContract.gates.every((gate) => gate.status === 'pass'));
assert.match(report.markdown, /HTF MSS Two-Separator Approval Contract/);

const parsed = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorApprovalContractArgs([
  '--proposal-update',
  'proposal-update.json',
  '--json',
]);
assert.equal(parsed.proposalUpdate, 'proposal-update.json');
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep composite overlay HTF MSS second-separator approval contract verified.');
