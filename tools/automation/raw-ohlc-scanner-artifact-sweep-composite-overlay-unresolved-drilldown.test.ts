import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSweepCompositeOverlayUnresolvedDrilldownReport,
  parseRawOhlcScannerArtifactSweepCompositeOverlayUnresolvedDrilldownArgs,
} from './raw-ohlc-scanner-artifact-sweep-composite-overlay-unresolved-drilldown';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport } from './unified-positive-held-local-preview-replay-package-outcome';

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

function row(ticketId: string, overrides: Partial<UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport['rows'][number]> = {}): UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport['rows'][number] {
  return {
    ticketId,
    tradeDate: '2026-07-16',
    session: 'lunch',
    setupType: 'IntradayMssMicroContinuation',
    direction: 'LONG',
    proofTime: '2026-07-16T14:00:00',
    outcomeStatus: 'unresolved',
    outcomeLabel: 'no_target_or_stop_hit',
    entry: 100,
    stop: 96,
    t1: 106,
    t2: 108,
    riskPoints: 4,
    barsSource: 'scanner_decision_tape_completed_5m',
    barsLoaded: 10,
    barsAfterProof: 10,
    entryHitTime: '2026-07-16T14:00:00',
    firstReplayBarTime: '2026-07-16T14:05:00',
    stopHitTime: null,
    t1HitTime: null,
    t2HitTime: null,
    maximumFavorableExcursion: 2,
    maximumAdverseExcursion: 1,
    resolvedOneMesPl: null,
    resolvedR: null,
    intrabarAmbiguity: false,
    blockers: [],
    ...overrides,
  };
}

const outcomeReport: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport = {
  reportType: 'unified_positive_held_local_preview_replay_package_outcome',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
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
    resolvedRows: 0,
    unresolvedRows: 3,
    blockedRows: 0,
    noFillRows: 1,
    stoppedBeforeT1Rows: 0,
    t1OnlyRows: 0,
    t1AndT2Rows: 0,
    noTargetOrStopRows: 2,
    grossResolvedOneMesPl: null,
    modelGroups: [],
    daySessionModelGroups: [],
    livePromotionAllowedRows: 0,
  },
  rows: [
    row('no-fill', {
      outcomeLabel: 'no_fill',
      entryHitTime: null,
      firstReplayBarTime: null,
      maximumFavorableExcursion: null,
      maximumAdverseExcursion: null,
    }),
    row('near-t1', {
      maximumFavorableExcursion: 5,
      maximumAdverseExcursion: 1,
    }),
    row('adverse-near-stop', {
      maximumFavorableExcursion: 1,
      maximumAdverseExcursion: 3.5,
    }),
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildRawOhlcScannerArtifactSweepCompositeOverlayUnresolvedDrilldownReport({
  reportDir: 'reports',
  outcomeReportPath: 'outcome.json',
  outcomeReport,
}, '2026-07-19T00:01:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_composite_overlay_unresolved_drilldown');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.outcomeRows, 3);
assert.equal(report.summary.unresolvedRows, 3);
assert.equal(report.summary.noFillRows, 1);
assert.equal(report.summary.nearT1Rows, 1);
assert.equal(report.summary.adverseNearStopRows, 1);
assert.equal(report.summary.weakFollowthroughRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'do_not_use_missing_top_coverage_as_positive_evidence');
assert.equal(report.rows.find((item) => item.ticketId === 'near-t1')?.favorableR, 1.25);
assert.match(report.markdown, /Unresolved Drilldown/);

const parsed = parseRawOhlcScannerArtifactSweepCompositeOverlayUnresolvedDrilldownArgs([
  '--outcome-report',
  'outcome.json',
  '--json',
]);
assert.equal(parsed.outcomeReport, 'outcome.json');
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep composite overlay unresolved drilldown verified.');
