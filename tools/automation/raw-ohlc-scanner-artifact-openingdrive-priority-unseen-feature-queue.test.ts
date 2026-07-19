import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityUnseenFeatureQueueReport,
  parseRawOhlcScannerArtifactOpeningDrivePriorityUnseenFeatureQueueArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-unseen-feature-queue';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureComparisonReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-fresh-feature-comparison';

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

const comparisonReport: RawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureComparisonReport = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_fresh_feature_comparison',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    packageReports: ['package.json'],
    sourceSelectionReports: ['compared-source.json'],
  },
  assumptions: {
    consumesSavedPackageAndSourceSelectionReportsOnly: true,
    rebuildsMinerFromSavedArtifactsOnly: true,
    featureTag: 'proof_bar_failed_close_through_entry',
    excludesPostEntryResearchFeatures: true,
    outcomeFieldsAreEvaluationOnly: true,
    noLiveScoringUsed: true,
    noSetupScannerRun: true,
    livePromotionAllowed: false,
  },
  summary: {
    packageReports: 1,
    sourceSelectionReports: 1,
    minedEventRows: 1,
    matchingFeatureRows: 1,
    caughtUnderperformanceRows: 1,
    falseRejectedPriorityBetterRows: 0,
    simulatedDeltaVsInstalledPriority: 23.75,
    liveInitialRankFeatureRows: 0,
    livePromotionAllowedRows: 0,
    broadeningAllowedNow: false,
    recommendation: 'candidate_needs_larger_validation',
  },
  rows: [],
  blockers: [],
  recommendations: ['Need larger validation.'],
  markdown: '',
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityUnseenFeatureQueueReport({
  comparisonReports: ['comparison.json'],
  loadedComparisonReports: [comparisonReport],
  sourceSelectionReports: ['compared-source.json', 'unseen-source.json'],
}, '2026-07-19T04:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.sourceSelectionReports, 2);
assert.equal(report.summary.alreadyComparedSourceSelectionReports, 1);
assert.equal(report.summary.queuedSourceSelectionReports, 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.broadeningAllowedNow, false);
assert.equal(report.summary.recommendation, 'run_unseen_queue_comparison');
assert.equal(report.queueRows.length, 1);
assert.equal(report.queueRows[0].sourceSelectionReport, 'unseen-source.json');
assert.equal(report.queueRows[0].reason, 'not_yet_compared_for_proof_bar_failed_close_through_entry');
assert.equal(report.authority.changesTradingLogic, false);

const parsed = parseRawOhlcScannerArtifactOpeningDrivePriorityUnseenFeatureQueueArgs([
  '--comparison-reports',
  'a.json,b.json',
  '--source-selection-reports',
  'c.json',
  '--out-dir',
  'out',
  '--json',
]);
assert.deepEqual(parsed.comparisonReports.map((item) => item.endsWith('a.json') || item.endsWith('b.json')), [true, true]);
assert.equal(parsed.sourceSelectionReports[0].endsWith('c.json'), true);
assert.equal(parsed.outDir.endsWith('out'), true);
assert.equal(parsed.json, true);

console.log('raw-ohlc-scanner-artifact-openingdrive-priority-unseen-feature-queue.test passed');
