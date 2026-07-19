import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorSimulationReport,
  parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorSimulationArgs,
} from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-separator-simulation';

const diagnostic = {
  status: 'pass',
  summary: {
    recommendation: 'build_promotion_disabled_separator_simulation',
  },
  topPositiveBuckets: [
    { kind: 'session_risk', key: 'morning|risk_8_to_16' },
  ],
  topCautionBuckets: [
    { kind: 'date_session', key: '2026-07-09|morning' },
  ],
};

const samebarReport = {
  status: 'pass',
  rows: [
    {
      ticketId: 'winner',
      tradeDate: '2026-07-06',
      session: 'morning',
      setupType: 'HtfDisplacementMssContinuation',
      direction: 'LONG',
      outcomeLabel: 't1_and_t2_hit',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: 90,
      proofTime: '2026-07-06T10:00:00',
      riskPoints: 9,
      timeBucket: '10:00-10:59',
    },
    {
      ticketId: 'loss',
      tradeDate: '2026-07-09',
      session: 'morning',
      setupType: 'HtfDisplacementMssContinuation',
      direction: 'SHORT',
      outcomeLabel: 'stopped_before_t1',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: -90,
      proofTime: '2026-07-09T10:00:00',
      riskPoints: 18,
      timeBucket: '10:00-10:59',
    },
  ],
};

const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorSimulationReport({
  reportDir: 'reports',
  separatorDiagnosticPath: 'diagnostic.json',
  separatorDiagnostic: diagnostic as any,
  samebarReportPaths: ['samebar.json'],
  samebarReports: [samebarReport as any],
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_separator_simulation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.promotionDisabled, true);
assert.equal(report.summary.sourceRows, 2);
assert.equal(report.summary.selectedRows, 1);
assert.equal(report.summary.rejectedRows, 1);
assert.equal(report.summary.selectedWinners, 1);
assert.equal(report.summary.selectedLosses, 0);
assert.equal(report.summary.selectedOneMesPl, 90);
assert.equal(report.summary.rejectedLosses, 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'prepare_research_only_proposal_update');
assert.equal(report.selectedRows[0]?.ticketId, 'winner');
assert.equal(report.rejectedRows[0]?.ticketId, 'loss');
assert.match(report.markdown, /HTF MSS Separator Simulation/);

const parsed = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorSimulationArgs([
  '--separator-diagnostic',
  'diagnostic.json',
  '--samebar-reports',
  'samebar.json',
  '--json',
]);
assert.equal(parsed.separatorDiagnostic, 'diagnostic.json');
assert.deepEqual(parsed.samebarReports, ['samebar.json']);
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep composite overlay HTF MSS separator simulation verified.');
