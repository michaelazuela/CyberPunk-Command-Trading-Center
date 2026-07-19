import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadFeatureSearchReport,
  parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadFeatureSearchArgs,
} from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-broad-feature-search';

const broadValidation = {
  status: 'pass',
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
      proofTime: '2026-06-24T10:30:00',
      riskPoints: 25,
      mfeR: 2,
      maeR: 0.2,
      firstReplayBarTime: '2026-06-24T10:35:00',
      stopHitTime: null,
      t1HitTime: '2026-06-24T10:40:00',
      separatorTags: ['clean_mfe'],
    },
    {
      ticketId: 'loss',
      tradeDate: '2026-06-24',
      session: 'morning',
      setupType: 'HtfDisplacementMssContinuation',
      direction: 'LONG',
      outcomeLabel: 'stopped_before_t1',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: -125,
      proofTime: '2026-06-24T10:35:00',
      riskPoints: 26,
      mfeR: 0.2,
      maeR: 1.1,
      firstReplayBarTime: '2026-06-24T10:40:00',
      stopHitTime: '2026-06-24T10:40:00',
      t1HitTime: null,
      separatorTags: ['mae_at_or_over_1r'],
    },
    {
      ticketId: 'loss-2',
      tradeDate: '2026-06-24',
      session: 'morning',
      setupType: 'HtfDisplacementMssContinuation',
      direction: 'LONG',
      outcomeLabel: 'stopped_before_t1',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: -125,
      proofTime: '2026-06-24T10:40:00',
      riskPoints: 27,
      mfeR: 0.2,
      maeR: 1.1,
      firstReplayBarTime: '2026-06-24T10:45:00',
      stopHitTime: '2026-06-24T10:45:00',
      t1HitTime: null,
      separatorTags: ['mae_at_or_over_1r'],
    },
    {
      ticketId: 'loss-3',
      tradeDate: '2026-06-24',
      session: 'morning',
      setupType: 'HtfDisplacementMssContinuation',
      direction: 'LONG',
      outcomeLabel: 'stopped_before_t1',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: -125,
      proofTime: '2026-06-24T10:45:00',
      riskPoints: 28,
      mfeR: 0.2,
      maeR: 1.1,
      firstReplayBarTime: '2026-06-24T10:50:00',
      stopHitTime: '2026-06-24T10:50:00',
      t1HitTime: null,
      separatorTags: ['mae_at_or_over_1r'],
    },
    {
      ticketId: 'loss-4',
      tradeDate: '2026-06-24',
      session: 'morning',
      setupType: 'HtfDisplacementMssContinuation',
      direction: 'LONG',
      outcomeLabel: 'stopped_before_t1',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: -125,
      proofTime: '2026-06-24T10:50:00',
      riskPoints: 29,
      mfeR: 0.2,
      maeR: 1.1,
      firstReplayBarTime: '2026-06-24T10:55:00',
      stopHitTime: '2026-06-24T10:55:00',
      t1HitTime: null,
      separatorTags: ['mae_at_or_over_1r'],
    },
  ],
};

const separatorSimulation = {
  status: 'pass',
  summary: {
    recommendation: 'continue_feature_search',
  },
};

const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadFeatureSearchReport({
  reportDir: 'reports',
  broadValidationPath: 'broad-validation.json',
  separatorSimulationPath: 'separator-simulation.json',
  broadValidation: broadValidation as any,
  separatorSimulation: separatorSimulation as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_broad_feature_search');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.outcomeFieldsResearchOnly, true);
assert.equal(report.summary.inputSelectedRows, 5);
assert.equal(report.summary.inputLossRows, 4);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'simulate_pre_entry_feature_candidates');
assert.ok(report.topPreEntryCandidates.some((bucket) => bucket.feature === 'riskBucket' && bucket.key === 'risk_gte_24'));
assert.ok(report.topReplayOutcomeResearchOnly.some((bucket) => bucket.feature === 'separatorTag' && bucket.key === 'mae_at_or_over_1r'));
assert.match(report.markdown, /HTF MSS Broad Feature Search/);

const parsed = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadFeatureSearchArgs([
  '--broad-validation',
  'broad-validation.json',
  '--separator-simulation',
  'separator-simulation.json',
  '--json',
]);
assert.equal(parsed.broadValidation, 'broad-validation.json');
assert.equal(parsed.separatorSimulation, 'separator-simulation.json');
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep composite overlay HTF MSS broad feature search verified.');
