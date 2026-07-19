import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorDiagnosticReport,
  parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorDiagnosticArgs,
} from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-separator-diagnostic';

const breadthValidation = {
  status: 'pass',
  summary: {
    negativeDaySessionGroups: 1,
    recommendation: 'build_htf_mss_separator_before_live_approval',
  },
};

const samebarReport = {
  status: 'pass',
  rows: [
    {
      ticketId: 'winner-1',
      tradeDate: '2026-07-06',
      session: 'morning',
      setupType: 'HtfDisplacementMssContinuation',
      direction: 'LONG',
      outcomeLabel: 't1_and_t2_hit',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: 90,
      proofTime: '2026-07-06T10:00:00',
      riskPoints: 9,
      mfeR: 2.2,
      maeR: 0.2,
      timeBucket: '10:00-10:59',
    },
    {
      ticketId: 'winner-2',
      tradeDate: '2026-07-06',
      session: 'morning',
      setupType: 'HtfDisplacementMssContinuation',
      direction: 'LONG',
      outcomeLabel: 't1_and_t2_hit',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: 85,
      proofTime: '2026-07-06T10:05:00',
      riskPoints: 8.5,
      mfeR: 2,
      maeR: 0.3,
      timeBucket: '10:00-10:59',
    },
    {
      ticketId: 'winner-3',
      tradeDate: '2026-07-06',
      session: 'morning',
      setupType: 'HtfDisplacementMssContinuation',
      direction: 'LONG',
      outcomeLabel: 't1_and_t2_hit',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: 80,
      proofTime: '2026-07-06T10:10:00',
      riskPoints: 8,
      mfeR: 2.1,
      maeR: 0.1,
      timeBucket: '10:00-10:59',
    },
    {
      ticketId: 'loss-1',
      tradeDate: '2026-07-09',
      session: 'morning',
      setupType: 'HtfDisplacementMssContinuation',
      direction: 'SHORT',
      outcomeLabel: 'stopped_before_t1',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: -50,
      proofTime: '2026-07-09T09:30:00',
      riskPoints: 10,
      mfeR: 0.2,
      maeR: 1.1,
      timeBucket: '09:00-09:59',
    },
    {
      ticketId: 'loss-2',
      tradeDate: '2026-07-09',
      session: 'morning',
      setupType: 'HtfDisplacementMssContinuation',
      direction: 'SHORT',
      outcomeLabel: 'stopped_before_t1',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: -45,
      proofTime: '2026-07-09T09:35:00',
      riskPoints: 9,
      mfeR: 0.1,
      maeR: 1,
      timeBucket: '09:00-09:59',
    },
    {
      ticketId: 'loss-3',
      tradeDate: '2026-07-09',
      session: 'morning',
      setupType: 'HtfDisplacementMssContinuation',
      direction: 'SHORT',
      outcomeLabel: 'stopped_before_t1',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: -40,
      proofTime: '2026-07-09T09:40:00',
      riskPoints: 8,
      mfeR: 0.1,
      maeR: 1.2,
      timeBucket: '09:00-09:59',
    },
  ],
};

const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorDiagnosticReport({
  reportDir: 'reports',
  breadthValidationPath: 'breadth.json',
  breadthValidation: breadthValidation as any,
  samebarReportPaths: ['samebar.json'],
  samebarReports: [samebarReport as any],
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_separator_diagnostic');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.htfMssOnly, true);
assert.equal(report.summary.htfMssRows, 6);
assert.equal(report.summary.winners, 3);
assert.equal(report.summary.losses, 3);
assert.equal(report.summary.oneMesPl, 120);
assert.equal(report.summary.negativeBreadthDaySessionGroups, 1);
assert.equal(report.summary.positiveBuckets > 0, true);
assert.equal(report.summary.cautionBuckets > 0, true);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'build_promotion_disabled_separator_simulation');
assert.ok(report.topPositiveBuckets.some((bucket) => bucket.key.includes('LONG')));
assert.ok(report.topCautionBuckets.some((bucket) => bucket.key.includes('SHORT')));
assert.match(report.markdown, /HTF MSS Separator Diagnostic/);

const parsed = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorDiagnosticArgs([
  '--breadth-validation',
  'breadth.json',
  '--samebar-reports',
  'samebar.json',
  '--json',
]);
assert.equal(parsed.breadthValidation, 'breadth.json');
assert.deepEqual(parsed.samebarReports, ['samebar.json']);
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep composite overlay HTF MSS separator diagnostic verified.');
