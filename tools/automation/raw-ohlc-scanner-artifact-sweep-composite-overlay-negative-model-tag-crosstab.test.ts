import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSweepCompositeOverlayNegativeModelTagCrosstabReport,
  parseRawOhlcScannerArtifactSweepCompositeOverlayNegativeModelTagCrosstabArgs,
} from './raw-ohlc-scanner-artifact-sweep-composite-overlay-negative-model-tag-crosstab';

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
      evidenceClass: 'no_chase_or_stale_original',
    },
    {
      slateId: 'slate-2',
      evidenceClass: 'no_chase_or_stale_original',
    },
  ],
};

const outcomeComparison = {
  status: 'pass',
  authority,
  summary: {
    changedSlates: 2,
  },
  rows: [
    {
      slateId: 'slate-1',
      negativeTopSetupType: 'HtfDisplacementMssContinuation',
      replacementOutcomeLabel: 't1_and_t2_hit',
      replacementOutcomeStatus: 'resolved',
      replacementResolvedOneMesPl: 125,
    },
    {
      slateId: 'slate-2',
      negativeTopSetupType: 'IntradayMssMicroContinuation',
      replacementOutcomeLabel: 'stopped_before_t1',
      replacementOutcomeStatus: 'resolved',
      replacementResolvedOneMesPl: -25,
    },
  ],
};

const report = buildRawOhlcScannerArtifactSweepCompositeOverlayNegativeModelTagCrosstabReport({
  reportDir: 'reports',
  originalTopDrilldownPath: 'original.json',
  outcomeComparisonPath: 'comparison.json',
  originalTopDrilldown: originalTopDrilldown as any,
  outcomeComparison: outcomeComparison as any,
}, '2026-07-19T00:00:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_composite_overlay_negative_model_tag_crosstab');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.changedSlates, 2);
assert.equal(report.summary.joinedRows, 2);
assert.equal(report.summary.groups, 2);
assert.equal(report.summary.htfMssRows, 1);
assert.equal(report.summary.htfMssResolvedRows, 1);
assert.equal(report.summary.htfMssResolvedGrossOneMesPl, 125);
assert.equal(report.summary.nonHtfMssResolvedGrossOneMesPl, -25);
assert.equal(report.summary.noChaseOrStaleRows, 2);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'isolate_htf_mss_research_overlay');
assert.match(report.markdown, /Model\/Tag Cross-Tab/);

const parsed = parseRawOhlcScannerArtifactSweepCompositeOverlayNegativeModelTagCrosstabArgs([
  '--original-top-drilldown',
  'original.json',
  '--outcome-comparison',
  'comparison.json',
  '--json',
]);
assert.equal(parsed.originalTopDrilldown, 'original.json');
assert.equal(parsed.outcomeComparison, 'comparison.json');
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep composite overlay negative model/tag cross-tab verified.');
