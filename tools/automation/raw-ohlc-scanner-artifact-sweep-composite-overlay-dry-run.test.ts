import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSweepCompositeOverlayDryRunReport,
  parseRawOhlcScannerArtifactSweepCompositeOverlayDryRunArgs,
} from './raw-ohlc-scanner-artifact-sweep-composite-overlay-dry-run';
import type { RawOhlcScannerArtifactSweepSnapshotFieldMinerReport } from './raw-ohlc-scanner-artifact-sweep-snapshot-field-miner';
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

function snapshotReport(): RawOhlcScannerArtifactSweepSnapshotFieldMinerReport {
  return {
    reportType: 'raw_ohlc_scanner_artifact_sweep_snapshot_field_miner',
    generatedAt: '2026-07-19T00:00:00.000Z',
    status: 'pass',
    authority,
    source: {
      reportDir: 'reports',
      trainArtifacts: [],
      trainOutcomeReports: [],
      testArtifacts: [],
      testOutcomeReports: [],
      minRowsPerPeriod: 5,
      setupType: 'SweepMssFvgRetrace',
    },
    assumptions: {
      consumesExistingRawScannerArtifactsAndOutcomeReportsOnly: true,
      extractsPreEntrySnapshotTagsOnly: true,
      outcomeFieldsAreEvaluationOnly: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      trainSnapshotRows: 1,
      testSnapshotRows: 1,
      zeroLossTransferSegments: 1,
      latestPositiveTrainLossBearingSegments: 0,
      latestPositiveTrainWeakSegments: 0,
      livePromotionAllowedRows: 0,
      recommendation: 'fresh_replay_validate_zero_loss_snapshot_segments',
    },
    zeroLossTransferSegments: [{
      kind: 'session_direction_candle_rank' as never,
      key: 'lunch|SHORT|bearish_close|close_middle_half|rank_180_to_239',
      train: { rows: 5, winners: 5, losses: 0, otherResolved: 0, unresolved: 0, oneMesPl: 100, winRateResolved: 1 },
      test: { rows: 5, winners: 5, losses: 0, otherResolved: 0, unresolved: 0, oneMesPl: 100, winRateResolved: 1 },
      verdict: 'research_candidate_zero_loss_transfer',
      reason: 'fixture',
      score: 1,
    }],
    latestPositiveTrainLossBearingSegments: [],
    latestPositiveTrainWeakSegments: [],
    cautionSegments: [],
    blockers: [],
    recommendations: [],
    markdown: '',
  };
}

const artifact = {
  reportType: 'raw_ohlc_scanner_artifacts',
  events: {
    '2026-07-16T14:00:00': {
      eventTime: '2026-07-16T14:00:00',
      date: '2026-07-16',
      session: 'lunch',
      completed5m: { time: '2026-07-16T14:00:00', open: 100, high: 104, low: 96, close: 99, volume: 100 },
      setupCandidateStatus: {
        statuses: [
          {
            setupType: 'OpeningDriveFvgContinuation',
            direction: 'SHORT',
            entry: 99,
            stop: 103,
            target1: 93,
            target2: 91,
            rankScore: 230,
          },
          {
            setupType: 'SweepMssFvgRetrace',
            direction: 'SHORT',
            entry: 99,
            stop: 103,
            target1: 93,
            target2: 91,
            rankScore: 220,
            missingEvidence: [],
            activeRuleset: { htfLineInSand: { status: 'not_applicable', obstacleSource: null, obstacleType: null } },
          },
          {
            setupType: 'SweepMssFvgRetrace',
            direction: 'SHORT',
            entry: null,
            stop: 103,
            target1: null,
            target2: null,
            rankScore: 221,
            missingEvidence: [],
            activeRuleset: { htfLineInSand: { status: 'not_applicable', obstacleSource: null, obstacleType: null } },
          },
        ],
      },
    },
  },
};

function outcome(ticketId: string, label: 't1_and_t2_hit' | 'stopped_before_t1', pl: number) {
  return {
    ticketId,
    tradeDate: '2026-07-16',
    session: 'lunch',
    setupType: ticketId.includes('SweepMssFvgRetrace') ? 'SweepMssFvgRetrace' : 'OpeningDriveFvgContinuation',
    direction: 'SHORT' as const,
    proofTime: '2026-07-16T14:00:00',
    outcomeStatus: 'resolved' as const,
    outcomeLabel: label,
    entry: 99,
    stop: 103,
    t1: 93,
    t2: 91,
    riskPoints: 4,
    barsSource: 'scanner_decision_tape_completed_5m' as const,
    barsLoaded: 10,
    barsAfterProof: 10,
    entryHitTime: '2026-07-16T14:00:00',
    firstReplayBarTime: '2026-07-16T14:05:00',
    stopHitTime: label === 'stopped_before_t1' ? '2026-07-16T14:05:00' : null,
    t1HitTime: label === 't1_and_t2_hit' ? '2026-07-16T14:05:00' : null,
    t2HitTime: label === 't1_and_t2_hit' ? '2026-07-16T14:10:00' : null,
    maximumFavorableExcursion: label === 't1_and_t2_hit' ? 8 : 1,
    maximumAdverseExcursion: label === 'stopped_before_t1' ? 5 : 1,
    resolvedOneMesPl: pl,
    resolvedR: label === 't1_and_t2_hit' ? 2 : -1,
    intrabarAmbiguity: false,
    blockers: [],
  };
}

const outcomeReport: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport = {
  reportType: 'unified_positive_held_local_preview_replay_package_outcome',
  generatedAt: '2026-07-19T00:01:00.000Z',
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
    packageRows: 2,
    resolvedRows: 2,
    unresolvedRows: 0,
    blockedRows: 0,
    noFillRows: 0,
    stoppedBeforeT1Rows: 1,
    t1OnlyRows: 0,
    t1AndT2Rows: 1,
    noTargetOrStopRows: 0,
    grossResolvedOneMesPl: 20,
    modelGroups: [],
    daySessionModelGroups: [],
    livePromotionAllowedRows: 0,
  },
  rows: [
    outcome('2026-07-16-lunch-OpeningDriveFvgContinuation-SHORT-20260716T140000', 'stopped_before_t1', -20),
    outcome('2026-07-16-lunch-SweepMssFvgRetrace-SHORT-20260716T140000', 't1_and_t2_hit', 40),
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildRawOhlcScannerArtifactSweepCompositeOverlayDryRunReport({
  reportDir: 'reports',
  snapshotMinerReportPath: 'snapshot.json',
  snapshotMinerReport: snapshotReport(),
  scannerArtifactPaths: ['artifact.json'],
  scannerArtifacts: [artifact],
  outcomeReportPaths: ['outcome.json'],
  outcomeReports: [outcomeReport],
  boostPoints: 25,
}, '2026-07-19T00:02:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_sweep_composite_overlay_dry_run');
assert.equal(report.status, 'pass');
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.overlayBoostRows, 1);
assert.equal(report.summary.incompleteCompositeMatchesNotBoosted, 1);
assert.equal(report.summary.changedSlates, 1);
assert.equal(report.summary.changedToValidatedCompositeSweepSlates, 1);
assert.equal(report.summary.topSelectionDeltaOneMesPl, 60);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.rows.find((row) => row.completeDeterministicLevels === false)?.overlayBoostApplied, false);
assert.match(report.markdown, /Sweep Composite Overlay Dry Run/);

const parsed = parseRawOhlcScannerArtifactSweepCompositeOverlayDryRunArgs([
  '--snapshot-miner-report',
  'snapshot.json',
  '--scanner-artifacts',
  'a.json,b.json',
  '--outcome-reports',
  'c.json',
  '--boost-points',
  '30',
  '--json',
]);
assert.equal(parsed.snapshotMinerReport, 'snapshot.json');
assert.deepEqual(parsed.scannerArtifacts, ['a.json', 'b.json']);
assert.deepEqual(parsed.outcomeReports, ['c.json']);
assert.equal(parsed.boostPoints, 30);
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep composite overlay dry run verified.');
