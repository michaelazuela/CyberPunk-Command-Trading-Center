import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureComparisonReport,
  parseRawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureComparisonArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-fresh-feature-comparison';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityFreshFeaturePackageReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-fresh-feature-package';

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

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'openingdrive-fresh-feature-comparison-'));
const tapePath = path.join(tempRoot, 'scanner-decision-tape.json');
const replayPackagePath = path.join(tempRoot, 'ready-package.json');
const outcomePath = path.join(tempRoot, 'outcome.json');

fs.writeFileSync(tapePath, JSON.stringify({
  events: {
    a: { completed5m: { time: '2026-07-09T09:20:00', open: 7547.5, high: 7549, low: 7544.75, close: 7547, volume: 2423 } },
    b: { completed5m: { time: '2026-07-09T09:25:00', open: 7547, high: 7548.75, low: 7545, close: 7548.75, volume: 1772 } },
  },
}, null, 2), 'utf8');

fs.writeFileSync(outcomePath, JSON.stringify({
  reportType: 'unified_positive_held_local_preview_replay_package_outcome',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { replayPackagePath },
  assumptions: {},
  summary: {},
  rows: [],
  blockers: [],
  recommendations: [],
  markdown: '',
}, null, 2), 'utf8');

fs.writeFileSync(replayPackagePath, JSON.stringify({
  reportType: 'unified_positive_held_local_preview_ready_replay_package',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {},
  assumptions: {},
  summary: {},
  rows: [{
    ticketId: 'priority-loss',
    tradeDate: '2026-07-09',
    session: 'morning',
    proofTime: '2026-07-09T09:20:00',
    direction: 'LONG',
    setupType: 'SweepMssFvgRetrace',
    entry: 7549,
    stop: 7544,
    riskPoints: 5,
    sourceTapePath: tapePath,
  }],
  blockers: [],
  recommendations: [],
  markdown: '',
}, null, 2), 'utf8');

const packageReport: RawOhlcScannerArtifactOpeningDrivePriorityFreshFeaturePackageReport = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_fresh_feature_package',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { validationReports: ['validation.json'], minerReports: ['miner.json'] },
  assumptions: {
    consumesSavedValidationAndMinerReportsOnly: true,
    packagesInitialRankUsableFeatureOnly: true,
    excludesPostEntryResearchFeatures: true,
    outcomeFieldsAreEvaluationOnly: true,
    noLiveScoringUsed: true,
    noSetupScannerRun: true,
    livePromotionAllowed: false,
  },
  summary: {
    validationReports: 1,
    minerReports: 1,
    validationCandidateRows: 2,
    initialRankFeaturePackageRows: 1,
    postEntryOnlyFeatureRowsExcluded: 1,
    liveInitialRankFeatureRows: 0,
    livePromotionAllowedRows: 0,
    broadeningAllowedNow: false,
    recommendation: 'run_fresh_scanner_artifact_comparison',
  },
  packageRows: [{
    featureTag: 'proof_bar_failed_close_through_entry',
    sourceSelectionReport: 'source.json',
    replayPackagePath: 'package.json',
    tradeDate: '2026-07-09',
    session: 'morning',
    proofTime: '2026-07-09T09:20:00',
    direction: 'LONG',
    openingDriveTicketId: 'od-loss',
    priorityTicketId: 'priority-loss',
    prioritySetupType: 'SweepMssFvgRetrace',
    openingDriveOneMesPl: -25,
    priorityOneMesPl: -48.75,
    simulatedDeltaVsInstalledPriority: 23.75,
    requiredFreshEvidence: ['proof bar failed to close through priority entry in candidate direction'],
    evaluationOnly: true,
  }],
  blockers: [],
  recommendations: ['Run fresh comparison.'],
  markdown: '',
};

const sourceReport = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_oos_source_installed_selection',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { samebarReports: ['samebar.json'] },
  summary: {
    comparableEvents: 1,
    installedPrioritySelectedRows: 1,
    installedOpeningDriveSelectedRows: 0,
    canExecuteTrueRows: 0,
    approvalBoundaryDriftRows: 0,
    priorityLosses: 1,
    openingDriveLosses: 1,
    openingDriveOneMesPl: -25,
    priorityOneMesPl: -48.75,
    deltaOneMesPl: -23.75,
    recommendation: 'keep_researching_source_artifacts',
    livePromotionAllowedRows: 0,
  },
  rows: [{
    tradeDate: '2026-07-09',
    session: 'morning',
    proofTime: '2026-07-09T09:20:00',
    direction: 'LONG',
    openingDriveTicketId: 'od-loss',
    priorityTicketId: 'priority-loss',
    prioritySetupType: 'SweepMssFvgRetrace',
    installedPrimaryTicketId: 'priority-loss',
    installedPrimarySetupType: 'SweepMssFvgRetrace',
    installedSelectedPriority: true,
    openingDriveOneMesPl: -25,
    priorityOneMesPl: -48.75,
    deltaOneMesPl: -23.75,
    canExecuteTrue: false,
    approvalBoundaryDrift: false,
  }],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const samebarReport = {
  reportType: 'raw_ohlc_scanner_artifact_samebar_separator_drilldown',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    replayPackageOutcomePath: outcomePath,
    replayPackagePath,
  },
  summary: {
    samebarEvents: 1,
    openingDriveRows: 1,
    priorityRows: 1,
    comparableEvents: 1,
    recommendation: 'continue_research',
    livePromotionAllowedRows: 0,
  },
  rows: [
    {
      tradeDate: '2026-07-09',
      session: 'morning',
      proofTime: '2026-07-09T09:20:00',
      direction: 'LONG',
      setupType: 'OpeningDriveFvgContinuation',
      ticketId: 'od-loss',
      entry: 7548,
      stop: 7544,
      riskPoints: 4,
      resolvedOneMesPl: -25,
      outcomeLabel: 'stopped_before_t1',
      outcomeStatus: 'resolved',
    },
    {
      tradeDate: '2026-07-09',
      session: 'morning',
      proofTime: '2026-07-09T09:20:00',
      direction: 'LONG',
      setupType: 'SweepMssFvgRetrace',
      ticketId: 'priority-loss',
      entry: 7549,
      stop: 7544,
      riskPoints: 5,
      resolvedOneMesPl: -48.75,
      outcomeLabel: 'stopped_before_t1',
      outcomeStatus: 'resolved',
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureComparisonReport({
  packageReports: ['package-report.json'],
  loadedPackageReports: [packageReport],
  sourceSelectionReports: ['source.json'],
  loadedSourceSelectionReports: [{
    path: 'source.json',
    report: sourceReport,
    samebarReports: [samebarReport],
  } as never],
}, '2026-07-19T03:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.minedEventRows, 1);
assert.equal(report.summary.matchingFeatureRows, 1);
assert.equal(report.summary.caughtUnderperformanceRows, 1);
assert.equal(report.summary.falseRejectedPriorityBetterRows, 0);
assert.equal(report.summary.simulatedDeltaVsInstalledPriority, 23.75);
assert.equal(report.summary.liveInitialRankFeatureRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.broadeningAllowedNow, false);
assert.equal(report.summary.recommendation, 'candidate_needs_larger_validation');
assert.equal(report.rows[0].priorityUnderperformed, true);
assert.equal(report.authority.changesTradingLogic, false);

const parsed = parseRawOhlcScannerArtifactOpeningDrivePriorityFreshFeatureComparisonArgs([
  '--package-reports',
  'a.json,b.json',
  '--source-selection-reports',
  'c.json',
  '--out-dir',
  'out',
  '--json',
]);
assert.deepEqual(parsed.packageReports.map((item) => item.endsWith('a.json') || item.endsWith('b.json')), [true, true]);
assert.equal(parsed.sourceSelectionReports[0].endsWith('c.json'), true);
assert.equal(parsed.outDir.endsWith('out'), true);
assert.equal(parsed.json, true);

console.log('raw-ohlc-scanner-artifact-openingdrive-priority-fresh-feature-comparison.test passed');
