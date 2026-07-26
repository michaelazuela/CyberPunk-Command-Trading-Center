import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityStructuralValidationQueueReport,
  parseRawOhlcScannerArtifactOpeningDrivePriorityStructuralValidationQueueArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-structural-validation-queue';
import type {
  RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport,
} from './raw-ohlc-scanner-artifact-openingdrive-oos-source-installed-selection';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-no-lookahead-feature-miner';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityStructuralContextMinerReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-structural-context-miner';

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

function sourceSelectionReport(tradeDate: string): RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport {
  return {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_oos_source_installed_selection',
    generatedAt: '2026-07-19T00:00:00.000Z',
    status: 'pass',
    authority,
    source: { samebarReports: [] },
    summary: {
      comparableEvents: 1,
      installedPrioritySelectedRows: 1,
      installedOpeningDriveSelectedRows: 0,
      canExecuteTrueRows: 0,
      approvalBoundaryDriftRows: 0,
      priorityLosses: 0,
      openingDriveLosses: 0,
      openingDriveOneMesPl: 0,
      priorityOneMesPl: 0,
      deltaOneMesPl: 0,
      recommendation: 'keep_researching_source_artifacts',
      livePromotionAllowedRows: 0,
    },
    rows: [{
      tradeDate,
      session: 'morning',
      proofTime: `${tradeDate}T10:00:00`,
      direction: 'LONG',
      openingDriveTicketId: `od-${tradeDate}`,
      priorityTicketId: `priority-${tradeDate}`,
      prioritySetupType: 'NoInstalledSetup',
      installedPrimaryTicketId: `priority-${tradeDate}`,
      installedPrimarySetupType: 'NoInstalledSetup',
      installedSelectedPriority: true,
      openingDriveOneMesPl: 0,
      priorityOneMesPl: 0,
      deltaOneMesPl: 0,
      canExecuteTrueRows: 0,
      approvalBoundaryClean: true,
    }],
    blockers: [],
    recommendations: [],
    markdown: '',
  };
}

function minerReport(sourceSelectionPath: string): RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport {
  return {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_no_lookahead_feature_miner',
    generatedAt: '2026-07-19T00:00:00.000Z',
    status: 'pass',
    authority,
    source: { sourceSelectionReports: [sourceSelectionPath] },
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
      priorityUnderperformanceRows: 0,
      priorityBetterRows: 0,
      candidateFeatureRows: 0,
      liveInitialRankFeatureRows: 0,
      livePromotionAllowedRows: 0,
      broadeningAllowedNow: false,
      recommendation: 'continue_observation',
    },
    featureRows: [],
    rows: [],
    blockers: [],
    recommendations: [],
    markdown: '',
  };
}

function structuralReport(minerPath: string): RawOhlcScannerArtifactOpeningDrivePriorityStructuralContextMinerReport {
  return {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_structural_context_miner',
    generatedAt: '2026-07-19T00:00:00.000Z',
    status: 'pass',
    authority,
    source: { minerReports: [minerPath] },
    assumptions: {
      consumesSavedMinerReportsReplayPackagesAndScannerTapesOnly: true,
      usesProofTimeSnapshotOnly: true,
      noFutureOutcomeLabelsUsedForStructuralTags: true,
      noLiveScoringUsed: true,
      noSetupScannerRun: true,
      livePromotionAllowed: false,
    },
    summary: {
      minerReports: 1,
      sourceRows: 1,
      dedupedRows: 1,
      rowsWithStructuralContext: 1,
      priorityLossRows: 0,
      priorityNonLossRows: 1,
      candidateFeatureRows: 0,
      liveInitialRankFeatureRows: 0,
      livePromotionAllowedRows: 0,
      broadeningAllowedNow: false,
      recommendation: 'do_not_install_structural_filter',
    },
    featureRows: [],
    rows: [],
    blockers: [],
    recommendations: [],
    markdown: '',
  };
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'openingdrive-structural-queue-'));
const minedSourcePath = path.join(tmp, 'source-mined.json');
const unseenSourcePath = path.join(tmp, 'source-unseen.json');
const minerPath = path.join(tmp, 'miner.json');
fs.writeFileSync(minedSourcePath, JSON.stringify(sourceSelectionReport('2026-07-15')));
fs.writeFileSync(unseenSourcePath, JSON.stringify(sourceSelectionReport('2026-07-18')));
fs.writeFileSync(minerPath, JSON.stringify(minerReport(minedSourcePath)));

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityStructuralValidationQueueReport({
  structuralContextReports: ['structural.json'],
  loadedStructuralContextReports: [structuralReport(minerPath)],
  sourceSelectionReports: [minedSourcePath, unseenSourcePath],
  loadedSourceSelectionReports: [
    { path: minedSourcePath, report: sourceSelectionReport('2026-07-15') },
    { path: unseenSourcePath, report: sourceSelectionReport('2026-07-18') },
  ],
  rawOhlcSources: [path.join(tmp, 'raw-ohlc-source-MES-2026-07-01-to-2026-07-20-1.json')],
  featureTag: 'best_conditional_NoInstalledSetup',
}, '2026-07-19T05:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.structuralContextReports, 1);
assert.equal(report.summary.sourceSelectionReports, 2);
assert.equal(report.summary.alreadyMinedSourceSelectionReports, 1);
assert.equal(report.summary.queuedSourceSelectionReports, 1);
assert.equal(report.summary.queuedRawOhlcSources, 1);
assert.equal(report.summary.liveInitialRankFeatureRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.broadeningAllowedNow, false);
assert.equal(report.summary.recommendation, 'run_queued_structural_context_mining');
assert.equal(report.queueRows.some((row) => row.path === unseenSourcePath && row.reason === 'not_yet_structural_context_mined'), true);
assert.equal(report.authority.changesTradingLogic, false);

const parsed = parseRawOhlcScannerArtifactOpeningDrivePriorityStructuralValidationQueueArgs([
  '--structural-context-reports',
  'a.json',
  '--source-selection-reports',
  'b.json',
  '--raw-ohlc-sources',
  'c.json',
  '--feature-tag',
  'feature',
  '--out-dir',
  'out',
  '--json',
]);
assert.equal(parsed.structuralContextReports[0].endsWith('a.json'), true);
assert.equal(parsed.sourceSelectionReports[0].endsWith('b.json'), true);
assert.equal(parsed.rawOhlcSources[0].endsWith('c.json'), true);
assert.equal(parsed.featureTag, 'feature');
assert.equal(parsed.outDir.endsWith('out'), true);
assert.equal(parsed.json, true);

console.log('raw-ohlc-scanner-artifact-openingdrive-priority-structural-validation-queue.test passed');
