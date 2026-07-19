import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureRollupReport,
  parseRawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureRollupArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-fresh-feature-rollup';
import type {
  RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport,
} from './raw-ohlc-scanner-artifact-openingdrive-oos-source-installed-selection';
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

function sourceReport(args: {
  tradeDate: string;
  comparableEvents: number;
  priorityLosses: number;
  openingDriveLosses: number;
  priorityOneMesPl: number;
  openingDriveOneMesPl: number;
}): RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport {
  return {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_oos_source_installed_selection',
    generatedAt: '2026-07-19T00:00:00.000Z',
    status: 'pass',
    authority,
    source: { samebarReports: ['samebar.json'] },
    summary: {
      comparableEvents: args.comparableEvents,
      installedPrioritySelectedRows: args.comparableEvents,
      installedOpeningDriveSelectedRows: 0,
      canExecuteTrueRows: 0,
      approvalBoundaryDriftRows: 0,
      priorityLosses: args.priorityLosses,
      openingDriveLosses: args.openingDriveLosses,
      openingDriveOneMesPl: args.openingDriveOneMesPl,
      priorityOneMesPl: args.priorityOneMesPl,
      deltaOneMesPl: args.priorityOneMesPl - args.openingDriveOneMesPl,
      recommendation: 'keep_researching_source_artifacts',
      livePromotionAllowedRows: 0,
    },
    rows: [{
      tradeDate: args.tradeDate,
      session: 'morning',
      proofTime: `${args.tradeDate}T09:20:00`,
      direction: 'LONG',
      openingDriveTicketId: `od-${args.tradeDate}`,
      priorityTicketId: `priority-${args.tradeDate}`,
      prioritySetupType: 'SweepMssFvgRetrace',
      installedPrimaryTicketId: `priority-${args.tradeDate}`,
      installedPrimarySetupType: 'SweepMssFvgRetrace',
      installedSelectedPriority: true,
      openingDriveOneMesPl: args.openingDriveOneMesPl,
      priorityOneMesPl: args.priorityOneMesPl,
      deltaOneMesPl: args.priorityOneMesPl - args.openingDriveOneMesPl,
      canExecuteTrueRows: 0,
      approvalBoundaryClean: true,
    }],
    blockers: [],
    recommendations: [],
    markdown: '',
  };
}

function comparisonReport(args: {
  sourcePath: string;
  matchingRows: number;
  caught: number;
  falseRejected: number;
  delta: number;
}): RawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureComparisonReport {
  return {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_fresh_feature_comparison',
    generatedAt: '2026-07-19T00:00:00.000Z',
    status: 'pass',
    authority,
    source: {
      packageReports: ['package.json'],
      sourceSelectionReports: [args.sourcePath],
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
      matchingFeatureRows: args.matchingRows,
      caughtUnderperformanceRows: args.caught,
      falseRejectedPriorityBetterRows: args.falseRejected,
      simulatedDeltaVsInstalledPriority: args.delta,
      liveInitialRankFeatureRows: 0,
      livePromotionAllowedRows: 0,
      broadeningAllowedNow: false,
      recommendation: args.matchingRows ? 'candidate_needs_larger_validation' : 'needs_fresh_unseen_artifacts',
    },
    rows: [],
    blockers: [],
    recommendations: [],
    markdown: '',
  };
}

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureRollupReport({
  sourceSelectionReports: ['source-a.json', 'source-b.json'],
  loadedSourceSelectionReports: [
    { path: 'source-a.json', report: sourceReport({ tradeDate: '2026-07-09', comparableEvents: 1, priorityLosses: 1, openingDriveLosses: 1, priorityOneMesPl: -48.75, openingDriveOneMesPl: -25 }) },
    { path: 'source-b.json', report: sourceReport({ tradeDate: '2026-07-15', comparableEvents: 9, priorityLosses: 3, openingDriveLosses: 8, priorityOneMesPl: 253.75, openingDriveOneMesPl: -429.96 }) },
  ],
  featureComparisonReports: ['comparison-a.json', 'comparison-b.json'],
  loadedFeatureComparisonReports: [
    { path: 'comparison-a.json', report: comparisonReport({ sourcePath: 'source-a.json', matchingRows: 1, caught: 1, falseRejected: 0, delta: 23.75 }) },
    { path: 'comparison-b.json', report: comparisonReport({ sourcePath: 'source-b.json', matchingRows: 0, caught: 0, falseRejected: 0, delta: 0 }) },
  ],
}, '2026-07-19T05:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.days, 2);
assert.equal(report.summary.comparableEvents, 10);
assert.equal(report.summary.priorityLosses, 4);
assert.equal(report.summary.openingDriveLosses, 9);
assert.equal(report.summary.priorityOneMesPl, 205);
assert.equal(report.summary.openingDriveOneMesPl, -454.96);
assert.equal(report.summary.deltaOneMesPl, 659.96);
assert.equal(report.summary.featureMatchingRows, 1);
assert.equal(report.summary.featureCaughtUnderperformanceRows, 1);
assert.equal(report.summary.featureFalseRejectedPriorityBetterRows, 0);
assert.equal(report.summary.featureSimulatedDeltaVsInstalledPriority, 23.75);
assert.equal(report.summary.liveInitialRankFeatureRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.broadeningAllowedNow, false);
assert.equal(report.summary.recommendation, 'do_not_install_feature_broaden_validation');
assert.equal(report.authority.changesTradingLogic, false);

const parsed = parseRawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureRollupArgs([
  '--source-selection-reports',
  'a.json,b.json',
  '--feature-comparison-reports',
  'c.json',
  '--out-dir',
  'out',
  '--json',
]);
assert.deepEqual(parsed.sourceSelectionReports.map((item) => item.endsWith('a.json') || item.endsWith('b.json')), [true, true]);
assert.equal(parsed.featureComparisonReports[0].endsWith('c.json'), true);
assert.equal(parsed.outDir.endsWith('out'), true);
assert.equal(parsed.json, true);

console.log('raw-ohlc-scanner-artifact-openingdrive-priority-fresh-feature-rollup.test passed');
