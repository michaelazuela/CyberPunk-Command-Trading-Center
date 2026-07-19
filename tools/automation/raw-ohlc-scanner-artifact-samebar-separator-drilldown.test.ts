import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSameBarSeparatorDrilldownReport,
  parseRawOhlcScannerArtifactSameBarSeparatorDrilldownArgs,
} from './raw-ohlc-scanner-artifact-samebar-separator-drilldown';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport } from './unified-positive-held-local-preview-replay-package-outcome';

const outcomeReport: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport = {
  reportType: 'unified_positive_held_local_preview_replay_package_outcome',
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
  source: { reportDir: 'reports', replayPackagePath: 'package.json' },
  assumptions: {
    oneMesPointValue: 5,
    usesCompletedFiveMinuteBarsOnly: true,
    missingBarsAreNotInvented: true,
    sameBarStopAndTargetUsesConservativeStopFirst: true,
    outcomeIsResearchOnly: true,
    livePromotionAllowed: false,
  },
  summary: {
    packageRows: 3,
    resolvedRows: 3,
    unresolvedRows: 0,
    blockedRows: 0,
    noFillRows: 0,
    stoppedBeforeT1Rows: 1,
    t1OnlyRows: 0,
    t1AndT2Rows: 2,
    noTargetOrStopRows: 0,
    grossResolvedOneMesPl: 60,
    modelGroups: [],
    daySessionModelGroups: [],
    livePromotionAllowedRows: 0,
  },
  rows: [
    {
      ticketId: 'same-bar-win',
      tradeDate: '2026-06-10',
      session: 'lunch',
      setupType: 'AfterLunchDriveFvgContinuation',
      direction: 'SHORT',
      proofTime: '2026-06-10T12:50:00',
      outcomeStatus: 'resolved',
      outcomeLabel: 't1_and_t2_hit',
      entry: 100,
      stop: 104,
      t1: 94,
      t2: 92,
      riskPoints: 4,
      barsSource: 'scanner_decision_tape_completed_5m',
      barsLoaded: 5,
      barsAfterProof: 5,
      entryHitTime: '2026-06-10T12:50:00',
      firstReplayBarTime: '2026-06-10T12:55:00',
      stopHitTime: null,
      t1HitTime: '2026-06-10T12:55:00',
      t2HitTime: '2026-06-10T13:05:00',
      maximumFavorableExcursion: 10,
      maximumAdverseExcursion: 1,
      resolvedOneMesPl: 40,
      resolvedR: 2,
      intrabarAmbiguity: false,
      blockers: [],
    },
    {
      ticketId: 'same-bar-loss',
      tradeDate: '2026-06-10',
      session: 'lunch',
      setupType: 'AfterLunchDriveFvgContinuation',
      direction: 'SHORT',
      proofTime: '2026-06-10T13:05:00',
      outcomeStatus: 'resolved',
      outcomeLabel: 'stopped_before_t1',
      entry: 100,
      stop: 104,
      t1: 94,
      t2: 92,
      riskPoints: 4,
      barsSource: 'scanner_decision_tape_completed_5m',
      barsLoaded: 5,
      barsAfterProof: 5,
      entryHitTime: '2026-06-10T13:05:00',
      firstReplayBarTime: '2026-06-10T13:10:00',
      stopHitTime: '2026-06-10T13:10:00',
      t1HitTime: null,
      t2HitTime: null,
      maximumFavorableExcursion: 1,
      maximumAdverseExcursion: 4,
      resolvedOneMesPl: -20,
      resolvedR: -1,
      intrabarAmbiguity: false,
      blockers: [],
    },
    {
      ticketId: 'delayed-win-ignored',
      tradeDate: '2026-06-10',
      session: 'lunch',
      setupType: 'HtfDisplacementFvgContinuation',
      direction: 'LONG',
      proofTime: '2026-06-10T13:00:00',
      outcomeStatus: 'resolved',
      outcomeLabel: 't1_and_t2_hit',
      entry: 100,
      stop: 96,
      t1: 106,
      t2: 108,
      riskPoints: 4,
      barsSource: 'scanner_decision_tape_completed_5m',
      barsLoaded: 5,
      barsAfterProof: 5,
      entryHitTime: '2026-06-10T13:10:00',
      firstReplayBarTime: '2026-06-10T13:15:00',
      stopHitTime: null,
      t1HitTime: '2026-06-10T13:20:00',
      t2HitTime: '2026-06-10T13:25:00',
      maximumFavorableExcursion: 8,
      maximumAdverseExcursion: 1,
      resolvedOneMesPl: 40,
      resolvedR: 2,
      intrabarAmbiguity: false,
      blockers: [],
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildRawOhlcScannerArtifactSameBarSeparatorDrilldownReport({
  reportDir: 'reports',
  replayPackageOutcomePath: 'outcome.json',
  replayPackageOutcomeReport: outcomeReport,
}, '2026-07-18T00:01:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_samebar_separator_drilldown');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.localOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.sameBarRows, 2);
assert.equal(report.summary.winners, 1);
assert.equal(report.summary.losses, 1);
assert.equal(report.summary.grossOneMesPl, 20);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.modelSummaries[0].setupType, 'AfterLunchDriveFvgContinuation');
assert.equal(report.modelSummaries[0].firstReplayBarStopRows, 1);
assert.equal(report.modelSummaries[0].firstReplayBarT1Rows, 1);
assert.equal(report.rows.find((row) => row.ticketId === 'same-bar-loss')?.separatorTags.includes('first_replay_bar_stop'), true);
assert.equal(report.rows.find((row) => row.ticketId === 'same-bar-loss')?.timeBucket, '13:00-13:59');
assert.match(report.markdown, /Same-Bar Separator Drilldown/);

assert.throws(
  () => parseRawOhlcScannerArtifactSameBarSeparatorDrilldownArgs(['--out-dir', 'missing-dir']),
  /--replay-package-outcome is required/,
);

console.log('raw OHLC scanner artifact same-bar separator drilldown verified.');
