import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBreadthValidationReport,
  parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBreadthValidationArgs,
} from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-breadth-validation';

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

const julyRollup = {
  status: 'pass',
  daySessionModelGroups: [
    {
      tradeDate: '2026-07-06',
      session: 'morning',
      setupType: 'HtfDisplacementMssContinuation',
      rows: 9,
      resolvedRows: 9,
      unresolvedRows: 0,
      blockedRows: 0,
      grossResolvedOneMesPl: 692.5,
    },
    {
      tradeDate: '2026-07-09',
      session: 'morning',
      setupType: 'HtfDisplacementMssContinuation',
      rows: 7,
      resolvedRows: 7,
      unresolvedRows: 0,
      blockedRows: 0,
      grossResolvedOneMesPl: -630,
    },
    {
      tradeDate: '2026-07-09',
      session: 'lunch',
      setupType: 'SweepMssFvgRetrace',
      rows: 20,
      resolvedRows: 13,
      unresolvedRows: 7,
      blockedRows: 0,
      grossResolvedOneMesPl: 297.5,
    },
  ],
};

const approvalContract = {
  status: 'pass',
  summary: {
    proposalSelectedRows: 5,
    proposalSelectedResolvedRows: 4,
    proposalSelectedResolvedGrossOneMesPl: 655,
    recommendation: 'await_explicit_approval_or_broaden_research',
  },
};

const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBreadthValidationReport({
  reportDir: 'reports',
  julyRollupPath: 'july-rollup.json',
  approvalContractPath: 'approval-contract.json',
  julyRollup: julyRollup as any,
  approvalContract: approvalContract as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_breadth_validation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.assumptions.breadthValidationOnly, true);
assert.equal(report.summary.proposalSelectedRows, 5);
assert.equal(report.summary.proposalSelectedResolvedGrossOneMesPl, 655);
assert.equal(report.summary.julyHtfMssRows, 16);
assert.equal(report.summary.julyHtfMssResolvedRows, 16);
assert.equal(report.summary.julyHtfMssGrossResolvedOneMesPl, 62.5);
assert.equal(report.summary.julyHtfMssDaySessionGroups, 2);
assert.equal(report.summary.positiveDaySessionGroups, 1);
assert.equal(report.summary.negativeDaySessionGroups, 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'build_htf_mss_separator_before_live_approval');
assert.equal(report.negativeRows[0]?.tradeDate, '2026-07-09');
assert.match(report.markdown, /HTF MSS Breadth Validation/);

const parsed = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBreadthValidationArgs([
  '--july-rollup',
  'july-rollup.json',
  '--approval-contract',
  'approval-contract.json',
  '--json',
]);
assert.equal(parsed.julyRollup, 'july-rollup.json');
assert.equal(parsed.approvalContract, 'approval-contract.json');
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep composite overlay HTF MSS breadth validation verified.');
