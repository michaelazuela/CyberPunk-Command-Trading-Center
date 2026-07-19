import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactTransferStableFreshOutcomeComparisonReport,
  parseRawOhlcScannerArtifactTransferStableFreshOutcomeComparisonArgs,
} from './raw-ohlc-scanner-artifact-transfer-stable-fresh-outcome-comparison';
import type {
  RawOhlcScannerArtifactTransferStableValidationPackageReport,
} from './raw-ohlc-scanner-artifact-transfer-stable-validation-package';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport,
} from './unified-positive-held-local-preview-replay-package-outcome';

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

const validationPackage: RawOhlcScannerArtifactTransferStableValidationPackageReport = {
  reportType: 'raw_ohlc_scanner_artifact_transfer_stable_validation_package',
  generatedAt: '2026-07-19T00:06:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: 'reports', selectorReports: ['selector.json'] },
  assumptions: {
    consumesExistingSelectorReportsOnly: true,
    packagesResolvedRowsOnly: true,
    unresolvedRowsAreHeldOut: true,
    outcomeFieldsAreEvaluationOnly: true,
    noFreshMarketDataLoaded: true,
    noLiveRankInstalled: true,
    livePromotionAllowed: false,
  },
  summary: {
    selectorReports: 1,
    selectedRowsRead: 2,
    validationPackageRows: 2,
    heldUnresolvedRows: 0,
    winners: 1,
    otherResolved: 1,
    losses: 0,
    oneMesPl: 120,
    livePromotionAllowedRows: 0,
    recommendation: 'run_fresh_replay_validation',
  },
  byDaySessionModel: [],
  byModel: [],
  validationRows: [
    {
      ticketId: 'ticket-a',
      tradeDate: '2026-07-15',
      session: 'lunch',
      proofTime: '2026-07-15T12:15:00',
      setupType: 'AfterLunchDriveFvgContinuation',
      direction: 'LONG',
      riskPoints: 6,
      outcomeLabel: 't1_and_t2_hit',
      oneMesPl: 75,
      matchedZeroLossBuckets: [],
    },
    {
      ticketId: 'ticket-b',
      tradeDate: '2026-07-15',
      session: 'lunch',
      proofTime: '2026-07-15T12:20:00',
      setupType: 'SweepMssFvgRetrace',
      direction: 'SHORT',
      riskPoints: 5,
      outcomeLabel: 't1_hit_only',
      oneMesPl: 45,
      matchedZeroLossBuckets: [],
    },
  ],
  heldUnresolvedRows: [],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const freshOutcome: UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport = {
  reportType: 'unified_positive_held_local_preview_replay_package_outcome',
  generatedAt: '2026-07-19T00:09:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: 'reports', replayPackagePath: 'fresh-package.json' },
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
    stoppedBeforeT1Rows: 0,
    t1OnlyRows: 1,
    t1AndT2Rows: 1,
    noTargetOrStopRows: 0,
    grossResolvedOneMesPl: 120,
    modelGroups: [],
    daySessionModelGroups: [],
    livePromotionAllowedRows: 0,
  },
  rows: [
    {
      ticketId: 'ticket-a',
      tradeDate: '2026-07-15',
      session: 'lunch',
      setupType: 'AfterLunchDriveFvgContinuation',
      direction: 'LONG',
      proofTime: '2026-07-15T12:15:00',
      outcomeStatus: 'resolved',
      outcomeLabel: 't1_and_t2_hit',
      entry: 100,
      stop: 94,
      t1: 109,
      t2: 112,
      riskPoints: 6,
      barsSource: 'scanner_decision_tape_completed_5m',
      barsLoaded: 10,
      barsAfterProof: 5,
      entryHitTime: '2026-07-15T12:15:00',
      firstReplayBarTime: '2026-07-15T12:20:00',
      stopHitTime: null,
      t1HitTime: '2026-07-15T12:20:00',
      t2HitTime: '2026-07-15T12:25:00',
      maximumFavorableExcursion: 12,
      maximumAdverseExcursion: 1,
      resolvedOneMesPl: 75,
      resolvedR: 2.5,
      intrabarAmbiguity: false,
      blockers: [],
    },
    {
      ticketId: 'ticket-b',
      tradeDate: '2026-07-15',
      session: 'lunch',
      setupType: 'SweepMssFvgRetrace',
      direction: 'SHORT',
      proofTime: '2026-07-15T12:20:00',
      outcomeStatus: 'resolved',
      outcomeLabel: 't1_hit_only',
      entry: 100,
      stop: 105,
      t1: 92.5,
      t2: 90,
      riskPoints: 5,
      barsSource: 'scanner_decision_tape_completed_5m',
      barsLoaded: 10,
      barsAfterProof: 5,
      entryHitTime: '2026-07-15T12:20:00',
      firstReplayBarTime: '2026-07-15T12:25:00',
      stopHitTime: null,
      t1HitTime: '2026-07-15T12:25:00',
      t2HitTime: null,
      maximumFavorableExcursion: 8,
      maximumAdverseExcursion: 1,
      resolvedOneMesPl: 45,
      resolvedR: 1.8,
      intrabarAmbiguity: false,
      blockers: [],
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildRawOhlcScannerArtifactTransferStableFreshOutcomeComparisonReport({
  reportDir: 'reports',
  validationPackagePath: 'validation.json',
  validationPackage,
  freshOutcomePath: 'fresh.json',
  freshOutcome,
}, '2026-07-19T00:10:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_transfer_stable_fresh_outcome_comparison');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.validationRows, 2);
assert.equal(report.summary.exactMatches, 2);
assert.equal(report.summary.divergences, 0);
assert.equal(report.summary.freshLosses, 0);
assert.equal(report.summary.freshOneMesPl, 120);
assert.equal(report.summary.recommendation, 'ready_for_latest_artifact_replay');
assert.match(report.markdown, /Fresh Outcome Comparison/);

const parsed = parseRawOhlcScannerArtifactTransferStableFreshOutcomeComparisonArgs([
  '--validation-package',
  'validation.json',
  '--fresh-outcome',
  'fresh.json',
  '--json',
]);
assert.equal(parsed.validationPackage, 'validation.json');
assert.equal(parsed.freshOutcome, 'fresh.json');
assert.equal(parsed.json, true);

console.log('raw OHLC transfer-stable fresh outcome comparison verified.');
