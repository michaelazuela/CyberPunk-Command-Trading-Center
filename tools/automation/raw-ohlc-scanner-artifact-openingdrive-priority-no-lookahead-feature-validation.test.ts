import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureValidationReport,
  parseRawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureValidationArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-no-lookahead-feature-validation';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-no-lookahead-feature-miner';

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

const minerReport: RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_no_lookahead_feature_miner',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { sourceSelectionReports: ['source.json'] },
  assumptions: {
    consumesSavedSourceSelectionReportsOnly: true,
    consumesSavedSameBarReportsOnly: true,
    consumesSavedReplayPackageAndTapeOnly: true,
    usesCompletedFiveMinuteBarsOnly: true,
    noFutureOutcomeLabelsUsedForFeatureTags: true,
    firstReplayBarFeaturesArePostEntryResearchOnly: true,
    noLiveScoringUsed: true,
    noSetupScannerRun: true,
    livePromotionAllowed: false,
  },
  summary: {
    eventRows: 2,
    rowsWithTapeFeatures: 2,
    priorityUnderperformanceRows: 1,
    priorityBetterRows: 1,
    candidateFeatureRows: 1,
    liveInitialRankFeatureRows: 0,
    livePromotionAllowedRows: 0,
    broadeningAllowedNow: false,
    recommendation: 'validate_no_lookahead_feature_on_fresh_rows',
  },
  featureRows: [
    {
      featureTag: 'proof_bar_failed_close_through_entry',
      rows: 1,
      priorityUnderperformanceRows: 1,
      priorityBetterRows: 0,
      priorityEqualRows: 0,
      falseRejectPriorityBetterRows: 0,
      separatorType: 'candidate_no_lookahead',
      liveInitialRankInstallableNow: false,
    },
    {
      featureTag: 'proof_bar_bearish',
      rows: 2,
      priorityUnderperformanceRows: 1,
      priorityBetterRows: 1,
      priorityEqualRows: 0,
      falseRejectPriorityBetterRows: 1,
      separatorType: 'mixed',
      liveInitialRankInstallableNow: false,
    },
  ],
  rows: [
    {
      sourceSelectionReport: 'source.json',
      replayPackagePath: 'package.json',
      tradeDate: '2026-07-09',
      session: 'morning',
      proofTime: '2026-07-09T09:20:00',
      direction: 'LONG',
      prioritySetupType: 'NoInstalledSetup',
      openingDriveTicketId: 'od-loss',
      priorityTicketId: 'priority-loss',
      openingDriveOneMesPl: -25,
      priorityOneMesPl: -48.75,
      installedDeltaOneMesPl: -23.75,
      priorityUnderperformed: true,
      priorityBetter: false,
      priorityEntry: 7549,
      priorityStop: 7544,
      priorityRiskPoints: 5,
      proofBarTime: '2026-07-09T09:20:00',
      proofBarRangeR: 0.85,
      proofBarBodyDirection: 'bearish',
      proofBarCloseThroughEntry: false,
      firstReplayBarTime: '2026-07-09T09:25:00',
      firstReplayAdverseR: 0.35,
      firstReplayFavorableR: 0.1,
      firstReplayCloseThroughEntry: false,
      firstReplayCloseAdverse: true,
      immediateFeatureTags: ['proof_bar_bearish', 'proof_bar_failed_close_through_entry'],
      blockers: [],
    },
    {
      sourceSelectionReport: 'source.json',
      replayPackagePath: 'package.json',
      tradeDate: '2026-07-10',
      session: 'morning',
      proofTime: '2026-07-10T09:30:00',
      direction: 'LONG',
      prioritySetupType: 'NoInstalledSetup',
      openingDriveTicketId: 'od-win',
      priorityTicketId: 'priority-win',
      openingDriveOneMesPl: 50,
      priorityOneMesPl: 100,
      installedDeltaOneMesPl: 50,
      priorityUnderperformed: false,
      priorityBetter: true,
      priorityEntry: 7520,
      priorityStop: 7515,
      priorityRiskPoints: 5,
      proofBarTime: '2026-07-10T09:30:00',
      proofBarRangeR: 0.8,
      proofBarBodyDirection: 'bearish',
      proofBarCloseThroughEntry: true,
      firstReplayBarTime: '2026-07-10T09:35:00',
      firstReplayAdverseR: 0.05,
      firstReplayFavorableR: 0.6,
      firstReplayCloseThroughEntry: true,
      firstReplayCloseAdverse: false,
      immediateFeatureTags: ['proof_bar_bearish'],
      blockers: [],
    },
  ],
  blockers: [],
  recommendations: ['Validate features on fresh artifacts.'],
  markdown: '',
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureValidationReport({
  minerReports: ['miner.json'],
  loadedReports: [minerReport],
}, '2026-07-19T01:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.eventRows, 2);
assert.equal(report.summary.candidateFeatureRows, 1);
assert.equal(report.summary.validationPassRows, 1);
assert.equal(report.summary.liveInitialRankFeatureRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.broadeningAllowedNow, false);
assert.equal(report.summary.recommendation, 'queue_fresh_artifact_validation');

assert.equal(report.validationRows.length, 1);
assert.equal(report.validationRows[0].featureTag, 'proof_bar_failed_close_through_entry');
assert.equal(report.validationRows[0].caughtUnderperformanceRows, 1);
assert.equal(report.validationRows[0].falseRejectedPriorityBetterRows, 0);
assert.equal(report.validationRows[0].installedPriorityOneMesPl, -48.75);
assert.equal(report.validationRows[0].fallbackOpeningDriveOneMesPl, -25);
assert.equal(report.validationRows[0].simulatedDeltaVsInstalledPriority, 23.75);
assert.equal(report.validationRows[0].decision, 'candidate_needs_fresh_validation');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.livePromotionAllowed, false);

const parsed = parseRawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureValidationArgs([
  '--miner-reports',
  'a.json,b.json',
  '--out-dir',
  'out',
  '--json',
]);
assert.deepEqual(parsed.minerReports.map((item) => item.endsWith('a.json') || item.endsWith('b.json')), [true, true]);
assert.equal(parsed.outDir.endsWith('out'), true);
assert.equal(parsed.json, true);

console.log('raw-ohlc-scanner-artifact-openingdrive-priority-no-lookahead-feature-validation.test passed');
