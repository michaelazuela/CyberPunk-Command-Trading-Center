import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssOnlySimulationReport,
  parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssOnlySimulationArgs,
} from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-only-simulation';

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

const originalTopDrilldown = {
  status: 'pass',
  authority,
  rows: [
    {
      slateId: 'slate-1',
      originalTopTicketId: 'old-1',
      originalTopSetupType: 'IntradayMssMicroContinuation',
      evidenceClass: 'no_chase_or_stale_original',
      originalSourceTags: ['no_chase', 'late_day_after_1500'],
    },
    {
      slateId: 'slate-2',
      originalTopTicketId: 'old-2',
      originalTopSetupType: 'IntradayMssMicroContinuation',
      evidenceClass: 'no_chase_or_stale_original',
      originalSourceTags: ['no_chase'],
    },
  ],
};

const outcomeComparison = {
  status: 'pass',
  authority,
  rows: [
    {
      slateId: 'slate-1',
      tradeDate: '2026-07-17',
      session: 'morning',
      overlayTopTicketId: 'old-1',
      overlayTopSetupType: 'IntradayMssMicroContinuation',
      negativeTopTicketId: 'new-1',
      negativeTopSetupType: 'HtfDisplacementMssContinuation',
      replacementCoverageStatus: 'ready_for_replay_package',
      replacementOutcomeStatus: 'resolved',
      replacementOutcomeLabel: 't1_and_t2_hit',
      replacementResolvedOneMesPl: 125,
    },
    {
      slateId: 'slate-2',
      tradeDate: '2026-07-17',
      session: 'morning',
      overlayTopTicketId: 'old-2',
      overlayTopSetupType: 'IntradayMssMicroContinuation',
      negativeTopTicketId: 'new-2',
      negativeTopSetupType: 'IntradayMssMicroContinuation',
      replacementCoverageStatus: 'ready_for_replay_package',
      replacementOutcomeStatus: 'resolved',
      replacementOutcomeLabel: 'stopped_before_t1',
      replacementResolvedOneMesPl: -25,
    },
  ],
};

const modelTagCrosstab = {
  status: 'pass',
  authority,
  summary: {
    recommendation: 'isolate_htf_mss_research_overlay',
  },
};

const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssOnlySimulationReport({
  reportDir: 'reports',
  originalTopDrilldownPath: 'original.json',
  outcomeComparisonPath: 'comparison.json',
  modelTagCrosstabPath: 'crosstab.json',
  originalTopDrilldown: originalTopDrilldown as any,
  outcomeComparison: outcomeComparison as any,
  modelTagCrosstab: modelTagCrosstab as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_only_simulation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.changedSlates, 2);
assert.equal(report.summary.selectedRows, 1);
assert.equal(report.summary.selectedResolvedRows, 1);
assert.equal(report.summary.selectedResolvedGrossOneMesPl, 125);
assert.equal(report.summary.rejectedRows, 1);
assert.equal(report.summary.rejectedNonHtfMssRows, 1);
assert.equal(report.summary.selectedNoChaseRows, 1);
assert.equal(report.summary.selectedLateDayRows, 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'prepare_promotion_disabled_live_proposal');
assert.equal(report.rows.find((row) => row.slateId === 'slate-1')?.selectedByHtfMssOnlyOverlay, true);
assert.equal(report.rows.find((row) => row.slateId === 'slate-2')?.selectedByHtfMssOnlyOverlay, false);
assert.match(report.markdown, /HTF MSS-Only Overlay Simulation/);

const parsed = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssOnlySimulationArgs([
  '--original-top-drilldown',
  'original.json',
  '--outcome-comparison',
  'comparison.json',
  '--model-tag-crosstab',
  'crosstab.json',
  '--json',
]);
assert.equal(parsed.originalTopDrilldown, 'original.json');
assert.equal(parsed.outcomeComparison, 'comparison.json');
assert.equal(parsed.modelTagCrosstab, 'crosstab.json');
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep composite overlay HTF MSS-only simulation verified.');
