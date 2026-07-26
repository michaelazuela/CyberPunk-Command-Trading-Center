import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDriveNoLookaheadSeparatorReport,
  parseRawOhlcScannerArtifactOpeningDriveNoLookaheadSeparatorArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-no-lookahead-separator';
import type { RawOhlcScannerArtifactSameBarSeparatorDrilldownReport } from './raw-ohlc-scanner-artifact-samebar-separator-drilldown';

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

const separatorReport: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport = {
  reportType: 'raw_ohlc_scanner_artifact_samebar_separator_drilldown',
  generatedAt: '2026-07-18T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: 'reports', replayPackageOutcomePath: 'outcome.json' },
  assumptions: {
    usesReadOnlyReplayOutcomeOnly: true,
    analyzesSameBarRowsOnly: true,
    firstReplayBarMeansFirstCompletedBarAfterEntryBar: true,
    livePromotionAllowed: false,
  },
  summary: {
    sameBarRows: 5,
    winners: 3,
    losses: 1,
    unresolved: 0,
    grossOneMesPl: 115,
    modelsWithPositiveSameBar: 1,
    modelsWithSameBarLosses: 1,
    livePromotionAllowedRows: 0,
  },
  modelSummaries: [],
  timeBuckets: [],
  rows: [
    {
      ticketId: 'opening-long-1',
      tradeDate: '2026-06-10',
      session: 'morning',
      setupType: 'NoInstalledSetup',
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
      ticketId: 'opening-long-2',
      tradeDate: '2026-06-10',
      session: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      outcomeLabel: 't1_and_t2_hit',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: 45,
      proofTime: '2026-06-10T10:30:00',
      entryHitTime: '2026-06-10T10:30:00',
      firstReplayBarTime: '2026-06-10T10:35:00',
      stopHitTime: null,
      t1HitTime: '2026-06-10T10:35:00',
      t2HitTime: '2026-06-10T10:40:00',
      riskPoints: 6,
      mfeR: 2.2,
      maeR: 0.1,
      timeBucket: '10:00-10:59',
      separatorTags: ['winner_t1_t2', 'mfe_at_or_over_2r'],
    },
    {
      ticketId: 'opening-short-loss',
      tradeDate: '2026-06-10',
      session: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      outcomeLabel: 'stopped_before_t1',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: -20,
      proofTime: '2026-06-10T10:35:00',
      entryHitTime: '2026-06-10T10:35:00',
      firstReplayBarTime: '2026-06-10T10:40:00',
      stopHitTime: '2026-06-10T10:40:00',
      t1HitTime: null,
      t2HitTime: null,
      riskPoints: 18,
      mfeR: 0.2,
      maeR: 1,
      timeBucket: '10:00-10:59',
      separatorTags: ['stopped_before_t1', 'first_replay_bar_stop', 'mae_at_or_over_1r'],
    },
    {
      ticketId: 'opening-nine-loss',
      tradeDate: '2026-06-10',
      session: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      outcomeLabel: 'stopped_before_t1',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: -15,
      proofTime: '2026-06-10T09:40:00',
      entryHitTime: '2026-06-10T09:40:00',
      firstReplayBarTime: '2026-06-10T09:45:00',
      stopHitTime: '2026-06-10T09:45:00',
      t1HitTime: null,
      t2HitTime: null,
      riskPoints: 3,
      mfeR: 0.1,
      maeR: 1,
      timeBucket: '09:00-09:59',
      separatorTags: ['stopped_before_t1'],
    },
    {
      ticketId: 'after-lunch-ignored',
      tradeDate: '2026-06-10',
      session: 'lunch',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      outcomeLabel: 't1_and_t2_hit',
      outcomeStatus: 'resolved',
      resolvedOneMesPl: 45,
      proofTime: '2026-06-10T12:30:00',
      entryHitTime: '2026-06-10T12:30:00',
      firstReplayBarTime: '2026-06-10T12:35:00',
      stopHitTime: null,
      t1HitTime: '2026-06-10T12:35:00',
      t2HitTime: '2026-06-10T12:40:00',
      riskPoints: 6,
      mfeR: 2,
      maeR: 0.2,
      timeBucket: '12:00-12:59',
      separatorTags: ['winner_t1_t2'],
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildRawOhlcScannerArtifactOpeningDriveNoLookaheadSeparatorReport({
  reportDir: 'reports',
  samebarSeparatorReportPath: 'separator.json',
  samebarSeparatorReport: separatorReport,
  setupType: 'NoInstalledSetup',
  minRows: 2,
}, '2026-07-18T00:01:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_no_lookahead_separator');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.sourceRows, 5);
assert.equal(report.summary.winners, 3);
assert.equal(report.summary.losses, 2);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.featurePolicy.allowedFeatureFields.includes('timeBucket+direction'), true);
assert.equal(report.featurePolicy.rejectedLookaheadFields.includes('separatorTags'), true);
assert.equal(report.featurePolicy.rejectedLookaheadFields.includes('mfeR'), true);

const timeBucket = report.buckets.find((bucket) => bucket.featureSet === 'time_bucket' && bucket.featureValue === '10:00-10:59');
assert.equal(timeBucket?.keptRows, 3);
assert.equal(timeBucket?.keptWinners, 2);
assert.equal(timeBucket?.keptLosses, 1);
assert.equal(timeBucket?.decision, 'rejected_for_now');

const longTenBucket = report.buckets.find((bucket) => bucket.featureSet === 'time_direction' && bucket.featureValue === '10:00-10:59|LONG');
assert.equal(longTenBucket?.keptRows, 2);
assert.equal(longTenBucket?.keptWinners, 2);
assert.equal(longTenBucket?.keptLosses, 0);
assert.equal(longTenBucket?.decision, 'candidate_for_more_research');
assert.match(report.markdown, /No-Lookahead Separator/);
assert.match(report.recommendations[0], /Research lead found/);

assert.throws(
  () => parseRawOhlcScannerArtifactOpeningDriveNoLookaheadSeparatorArgs(['--out-dir', 'missing-dir']),
  /--samebar-separator-report is required/,
);

assert.throws(
  () => parseRawOhlcScannerArtifactOpeningDriveNoLookaheadSeparatorArgs(['--samebar-separator-report', 'x.json', '--min-rows', '0']),
  /--min-rows must be a positive number/,
);

console.log('raw OHLC OpeningDrive no-lookahead separator verified.');
