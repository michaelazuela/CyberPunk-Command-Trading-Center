import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadSelectedLossDrilldownReport,
  parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadSelectedLossDrilldownArgs,
} from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-broad-selected-loss-drilldown';

const broadValidation = {
  status: 'pass',
  summary: {
    recommendation: 'revise_separator',
    livePromotionAllowedRows: 0,
  },
  selectedRows: [
    {
      ticketId: 'winner',
      tradeDate: '2026-06-24',
      session: 'morning',
      setupType: 'HtfDisplacementMssContinuation',
      direction: 'LONG',
      outcomeLabel: 't1_and_t2_hit',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: 150,
      proofTime: '2026-06-24T10:25:00',
      riskPoints: 20,
    },
    {
      ticketId: 'loss-1',
      tradeDate: '2026-06-24',
      session: 'morning',
      setupType: 'HtfDisplacementMssContinuation',
      direction: 'LONG',
      outcomeLabel: 'stopped_before_t1',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: -125,
      proofTime: '2026-06-24T10:35:00',
      riskPoints: 25,
    },
    {
      ticketId: 'loss-2',
      tradeDate: '2026-06-24',
      session: 'morning',
      setupType: 'HtfDisplacementMssContinuation',
      direction: 'LONG',
      outcomeLabel: 'stopped_before_t1',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: -140,
      proofTime: '2026-06-24T10:45:00',
      riskPoints: 28,
    },
  ],
};

const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadSelectedLossDrilldownReport({
  reportDir: 'reports',
  broadValidationPath: 'broad-validation.json',
  broadValidation: broadValidation as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_broad_selected_loss_drilldown');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.drilldownOnly, true);
assert.equal(report.summary.broadSelectedRows, 3);
assert.equal(report.summary.lossRows, 2);
assert.equal(report.summary.lossOneMesPl, -265);
assert.equal(report.summary.dominantRiskBucket, 'risk_gte_24');
assert.equal(report.summary.dominantRiskBucketRows, 2);
assert.equal(report.summary.dominantTimeBucket, '10:00-10:59');
assert.equal(report.summary.dominantCombo, 'morning|LONG|10:00-10:59|risk_gte_24');
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'build_broad_loss_separator_simulation');
assert.equal(report.buckets.byDateSession[0].key, '2026-06-24|morning');
assert.match(report.markdown, /HTF MSS Broad Selected-Loss Drilldown/);

const parsed = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadSelectedLossDrilldownArgs([
  '--broad-validation',
  'broad-validation.json',
  '--json',
]);
assert.equal(parsed.broadValidation, 'broad-validation.json');
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep composite overlay HTF MSS broad selected-loss drilldown verified.');
