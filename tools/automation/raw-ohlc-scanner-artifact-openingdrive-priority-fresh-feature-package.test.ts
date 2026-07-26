import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityFreshFeaturePackageReport,
  parseRawOhlcScannerArtifactOpeningDrivePriorityFreshFeaturePackageArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-fresh-feature-package';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-no-lookahead-feature-miner';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureValidationReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-no-lookahead-feature-validation';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'openingdrive-fresh-feature-package-'));
const minerPath = path.join(tempRoot, 'miner.json');

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
    eventRows: 1,
    rowsWithTapeFeatures: 1,
    priorityUnderperformanceRows: 1,
    priorityBetterRows: 0,
    candidateFeatureRows: 2,
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
      featureTag: 'first_replay_adverse_ge_0_25r',
      rows: 1,
      priorityUnderperformanceRows: 1,
      priorityBetterRows: 0,
      priorityEqualRows: 0,
      falseRejectPriorityBetterRows: 0,
      separatorType: 'candidate_no_lookahead',
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
      immediateFeatureTags: ['proof_bar_failed_close_through_entry', 'first_replay_adverse_ge_0_25r'],
      blockers: [],
    },
  ],
  blockers: [],
  recommendations: ['Validate features on fresh artifacts.'],
  markdown: '',
};

fs.writeFileSync(minerPath, JSON.stringify(minerReport), 'utf8');

const validationReport: RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureValidationReport = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_no_lookahead_feature_validation',
  generatedAt: '2026-07-19T01:00:00.000Z',
  status: 'pass',
  authority,
  source: { minerReports: [minerPath] },
  assumptions: {
    consumesSavedMinerReportsOnly: true,
    validatesResearchFeatureTagsOnly: true,
    noLiveScoringUsed: true,
    noSetupScannerRun: true,
    noDiscordOrSupabaseSideEffects: true,
    livePromotionAllowed: false,
  },
  summary: {
    minerReports: 1,
    eventRows: 1,
    candidateFeatureRows: 2,
    validationPassRows: 2,
    validationRejectRows: 0,
    liveInitialRankFeatureRows: 0,
    livePromotionAllowedRows: 0,
    broadeningAllowedNow: false,
    recommendation: 'queue_fresh_artifact_validation',
  },
  validationRows: [
    {
      featureTag: 'proof_bar_failed_close_through_entry',
      sourceRows: 1,
      caughtUnderperformanceRows: 1,
      falseRejectedPriorityBetterRows: 0,
      priorityEqualRows: 0,
      installedPriorityOneMesPl: -48.75,
      fallbackOpeningDriveOneMesPl: -25,
      simulatedDeltaVsInstalledPriority: 23.75,
      liveInitialRankInstallableNow: false,
      livePromotionAllowedNow: false,
      decision: 'candidate_needs_fresh_validation',
    },
    {
      featureTag: 'first_replay_adverse_ge_0_25r',
      sourceRows: 1,
      caughtUnderperformanceRows: 1,
      falseRejectedPriorityBetterRows: 0,
      priorityEqualRows: 0,
      installedPriorityOneMesPl: -48.75,
      fallbackOpeningDriveOneMesPl: -25,
      simulatedDeltaVsInstalledPriority: 23.75,
      liveInitialRankInstallableNow: false,
      livePromotionAllowedNow: false,
      decision: 'candidate_needs_fresh_validation',
    },
  ],
  blockers: [],
  recommendations: ['Queue fresh artifact validation.'],
  markdown: '',
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityFreshFeaturePackageReport({
  validationReports: ['validation.json'],
  loadedValidationReports: [validationReport],
}, '2026-07-19T02:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.initialRankFeaturePackageRows, 1);
assert.equal(report.summary.postEntryOnlyFeatureRowsExcluded, 1);
assert.equal(report.summary.liveInitialRankFeatureRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.broadeningAllowedNow, false);
assert.equal(report.summary.recommendation, 'run_fresh_scanner_artifact_comparison');
assert.equal(report.packageRows.length, 1);
assert.equal(report.packageRows[0].featureTag, 'proof_bar_failed_close_through_entry');
assert.equal(report.packageRows[0].simulatedDeltaVsInstalledPriority, 23.75);
assert.equal(report.packageRows[0].evaluationOnly, true);
assert.equal(report.assumptions.excludesPostEntryResearchFeatures, true);
assert.equal(report.authority.changesTradingLogic, false);

const parsed = parseRawOhlcScannerArtifactOpeningDrivePriorityFreshFeaturePackageArgs([
  '--validation-reports',
  'a.json,b.json',
  '--out-dir',
  'out',
  '--json',
]);
assert.deepEqual(parsed.validationReports.map((item) => item.endsWith('a.json') || item.endsWith('b.json')), [true, true]);
assert.equal(parsed.outDir.endsWith('out'), true);
assert.equal(parsed.json, true);

console.log('raw-ohlc-scanner-artifact-openingdrive-priority-fresh-feature-package.test passed');
