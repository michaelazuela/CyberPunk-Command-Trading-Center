import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport,
  parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationArgs,
} from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-two-separator-broad-validation';

const rows = [
  {
    ticketId: 'winner',
    tradeDate: '2026-07-17',
    session: 'morning',
    setupType: 'HtfDisplacementMssContinuation',
    direction: 'LONG',
    outcomeLabel: 't1_and_t2_hit',
    outcomeStatus: 'resolved',
    resolvedOneMesPl: 100,
    proofTime: '2026-07-17T10:25:00',
    riskPoints: 10,
  },
  {
    ticketId: 'loss-july-9',
    tradeDate: '2026-07-09',
    session: 'morning',
    setupType: 'HtfDisplacementMssContinuation',
    direction: 'SHORT',
    outcomeLabel: 'stopped_before_t1',
    outcomeStatus: 'resolved',
    resolvedOneMesPl: -90,
    proofTime: '2026-07-09T09:40:00',
    riskPoints: 18,
  },
  {
    ticketId: 'loss-second',
    tradeDate: '2026-07-17',
    session: 'morning',
    setupType: 'HtfDisplacementMssContinuation',
    direction: 'LONG',
    outcomeLabel: 'stopped_before_t1',
    outcomeStatus: 'resolved',
    resolvedOneMesPl: -88.75,
    proofTime: '2026-07-17T11:45:00',
    riskPoints: 17.75,
  },
];

const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport({
  reportDir: 'reports',
  samebarReports: ['samebar.json'],
  rows,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_two_separator_broad_validation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.promotionDisabled, true);
assert.equal(report.summary.sourceRows, 3);
assert.equal(report.summary.selectedRows, 1);
assert.equal(report.summary.rejectedRows, 2);
assert.equal(report.summary.selectedWinners, 1);
assert.equal(report.summary.selectedLosses, 0);
assert.equal(report.summary.rejectedLosses, 2);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'broaden_or_prepare_implementation_request');
assert.match(report.markdown, /HTF MSS Two-Separator Broad Validation/);

const parsed = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationArgs([
  '--samebar-reports',
  'a.json,b.json',
  '--json',
]);
assert.deepEqual(parsed.samebarReports, ['a.json', 'b.json']);
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep composite overlay HTF MSS two-separator broad validation verified.');
