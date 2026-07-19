import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSameBarModelSeparatorReport,
  parseRawOhlcScannerArtifactSameBarModelSeparatorArgs,
} from './raw-ohlc-scanner-artifact-samebar-model-separator';
import type { RawOhlcScannerArtifactSameBarSeparatorDrilldownReport } from './raw-ohlc-scanner-artifact-samebar-separator-drilldown';

const separatorReport: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport = {
  reportType: 'raw_ohlc_scanner_artifact_samebar_separator_drilldown',
  generatedAt: '2026-07-18T00:00:00.000Z',
  status: 'pass',
  authority: {
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
  },
  source: { reportDir: 'reports', replayPackageOutcomePath: 'outcome.json' },
  assumptions: {
    usesReadOnlyReplayOutcomeOnly: true,
    analyzesSameBarRowsOnly: true,
    firstReplayBarMeansFirstCompletedBarAfterEntryBar: true,
    livePromotionAllowed: false,
  },
  summary: {
    sameBarRows: 3,
    winners: 1,
    losses: 1,
    unresolved: 1,
    grossOneMesPl: 20,
    modelsWithPositiveSameBar: 1,
    modelsWithSameBarLosses: 1,
    livePromotionAllowedRows: 0,
  },
  modelSummaries: [],
  timeBuckets: [],
  rows: [
    {
      ticketId: 'opening-win',
      tradeDate: '2026-06-10',
      session: 'morning',
      setupType: 'OpeningDriveFvgContinuation',
      direction: 'LONG',
      outcomeLabel: 't1_and_t2_hit',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: 40,
      proofTime: '2026-06-10T10:20:00',
      entryHitTime: '2026-06-10T10:20:00',
      firstReplayBarTime: '2026-06-10T10:25:00',
      stopHitTime: null,
      t1HitTime: '2026-06-10T10:25:00',
      t2HitTime: '2026-06-10T10:30:00',
      riskPoints: 5,
      mfeR: 2,
      maeR: 0.25,
      timeBucket: '10:00-10:59',
      separatorTags: ['winner_t1_t2', 'first_replay_bar_t1'],
    },
    {
      ticketId: 'opening-loss',
      tradeDate: '2026-06-10',
      session: 'morning',
      setupType: 'OpeningDriveFvgContinuation',
      direction: 'LONG',
      outcomeLabel: 'stopped_before_t1',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: -20,
      proofTime: '2026-06-10T10:30:00',
      entryHitTime: '2026-06-10T10:30:00',
      firstReplayBarTime: '2026-06-10T10:35:00',
      stopHitTime: '2026-06-10T10:35:00',
      t1HitTime: null,
      t2HitTime: null,
      riskPoints: 3,
      mfeR: 0.25,
      maeR: 1,
      timeBucket: '10:00-10:59',
      separatorTags: ['stopped_before_t1', 'first_replay_bar_stop', 'mae_at_or_over_1r'],
    },
    {
      ticketId: 'after-lunch-ignored',
      tradeDate: '2026-06-10',
      session: 'lunch',
      setupType: 'AfterLunchDriveFvgContinuation',
      direction: 'SHORT',
      outcomeLabel: 't1_and_t2_hit',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: 40,
      proofTime: '2026-06-10T12:30:00',
      entryHitTime: '2026-06-10T12:30:00',
      firstReplayBarTime: '2026-06-10T12:35:00',
      stopHitTime: null,
      t1HitTime: '2026-06-10T12:35:00',
      t2HitTime: '2026-06-10T12:40:00',
      riskPoints: 4,
      mfeR: 2,
      maeR: 0.25,
      timeBucket: '12:00-12:59',
      separatorTags: ['winner_t1_t2'],
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildRawOhlcScannerArtifactSameBarModelSeparatorReport({
  reportDir: 'reports',
  samebarSeparatorReportPath: 'separator.json',
  samebarSeparatorReport: separatorReport,
  setupType: 'OpeningDriveFvgContinuation',
}, '2026-07-18T00:01:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_samebar_model_separator');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.rows, 2);
assert.equal(report.summary.winners, 1);
assert.equal(report.summary.losses, 1);
assert.equal(report.summary.grossOneMesPl, 20);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.directionBuckets[0].bucket, 'LONG');
assert.equal(report.riskBuckets.some((bucket) => bucket.bucket === 'risk_lt_4' && bucket.losses === 1), true);
assert.equal(report.tagBuckets.some((bucket) => bucket.bucket === 'first_replay_bar_stop' && bucket.losses === 1), true);
assert.match(report.markdown, /Same-Bar Model Separator/);
assert.match(report.recommendations[0], /Research only/);

assert.throws(
  () => parseRawOhlcScannerArtifactSameBarModelSeparatorArgs(['--out-dir', 'missing-dir']),
  /--samebar-separator-report is required/,
);

console.log('raw OHLC scanner artifact same-bar model separator verified.');
