import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport,
  parseRawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-no-lookahead-feature-miner';
import type {
  RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport,
} from './raw-ohlc-scanner-artifact-openingdrive-oos-source-installed-selection';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'openingdrive-no-lookahead-miner-'));
const tapePath = path.join(tempRoot, 'scanner-decision-tape.json');
const replayPackagePath = path.join(tempRoot, 'ready-replay-package.json');
const outcomePath = path.join(tempRoot, 'outcome.json');

fs.writeFileSync(tapePath, JSON.stringify({
  events: {
    a: { completed5m: { time: '2026-07-09T09:20:00', open: 7547.5, high: 7549, low: 7544.75, close: 7547, volume: 2423 } },
    b: { completed5m: { time: '2026-07-09T09:25:00', open: 7547, high: 7548.75, low: 7545, close: 7548.75, volume: 1772 } },
    c: { completed5m: { time: '2026-07-17T10:45:00', open: 7520, high: 7524, low: 7519.75, close: 7523.5, volume: 1200 } },
    d: { completed5m: { time: '2026-07-17T10:50:00', open: 7523.5, high: 7534, low: 7522.75, close: 7532, volume: 1800 } },
  },
}, null, 2));

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

function sourceReport(): RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport {
  return {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_oos_source_installed_selection',
    generatedAt: '2026-07-19T00:00:00.000Z',
    status: 'pass',
    authority,
    source: { samebarReports: ['samebar.json'] },
    summary: {
      comparableEvents: 2,
      installedPrioritySelectedRows: 2,
      installedOpeningDriveSelectedRows: 0,
      canExecuteTrueRows: 0,
      approvalBoundaryDriftRows: 0,
      priorityLosses: 1,
      openingDriveLosses: 1,
      openingDriveOneMesPl: 0,
      priorityOneMesPl: 0,
      deltaOneMesPl: 0,
      recommendation: 'keep_researching_source_artifacts',
      livePromotionAllowedRows: 0,
    },
    rows: [
      {
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
        canExecuteTrueRows: 0,
        approvalBoundaryClean: true,
      },
      {
        tradeDate: '2026-07-17',
        session: 'morning',
        proofTime: '2026-07-17T10:45:00',
        direction: 'LONG',
        openingDriveTicketId: 'od-win',
        priorityTicketId: 'priority-win',
        prioritySetupType: 'SweepMssFvgRetrace',
        installedPrimaryTicketId: 'priority-win',
        installedPrimarySetupType: 'SweepMssFvgRetrace',
        installedSelectedPriority: true,
        openingDriveOneMesPl: 25,
        priorityOneMesPl: 212.5,
        deltaOneMesPl: 187.5,
        canExecuteTrueRows: 0,
        approvalBoundaryClean: true,
      },
    ],
    blockers: [],
    recommendations: [],
    markdown: '',
  };
}

fs.writeFileSync(replayPackagePath, JSON.stringify({
  reportType: 'unified_positive_held_local_preview_replay_package',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {},
  assumptions: {},
  summary: { livePromotionAllowedRows: 0 },
  rows: [
    { ticketId: 'priority-loss', tradeDate: '2026-07-09', session: 'morning', instrument: 'MES', setupType: 'SweepMssFvgRetrace', direction: 'LONG', proofTime: '2026-07-09T09:20:00', firstSeenTime: '2026-07-09T09:20:00', entry: 7548.25, stop: 7538.5, t1: 7563, t2: 7567.75, riskPoints: 9.75, sourceTapePath: tapePath, outcomeInputStatus: 'ready_for_read_only_outcome_replay', blockers: [] },
    { ticketId: 'priority-win', tradeDate: '2026-07-17', session: 'morning', instrument: 'MES', setupType: 'SweepMssFvgRetrace', direction: 'LONG', proofTime: '2026-07-17T10:45:00', firstSeenTime: '2026-07-17T10:45:00', entry: 7521, stop: 7516, t1: 7528.5, t2: 7531, riskPoints: 5, sourceTapePath: tapePath, outcomeInputStatus: 'ready_for_read_only_outcome_replay', blockers: [] },
  ],
  excludedRows: [],
  blockers: [],
  recommendations: [],
  markdown: '',
}, null, 2));

fs.writeFileSync(outcomePath, JSON.stringify({
  reportType: 'unified_positive_held_local_preview_replay_package_outcome',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  source: { reportDir: tempRoot, replayPackagePath },
  assumptions: {},
  summary: {},
  rows: [],
  blockers: [],
  recommendations: [],
  markdown: '',
}, null, 2));

function samebarRow(args: {
  ticketId: string;
  setupType: string;
  date: string;
  proofTime: string;
  oneMesPl: number;
  firstReplayBarTime: string;
}) {
  return {
    ticketId: args.ticketId,
    tradeDate: args.date,
    session: 'morning',
    setupType: args.setupType,
    direction: 'LONG',
    outcomeLabel: args.oneMesPl < 0 ? 'stopped_before_t1' : 't1_and_t2_hit',
    outcomeStatus: 'resolved',
    resolvedOneMesPl: args.oneMesPl,
    proofTime: args.proofTime,
    entryHitTime: args.proofTime,
    firstReplayBarTime: args.firstReplayBarTime,
    stopHitTime: args.oneMesPl < 0 ? args.firstReplayBarTime : null,
    t1HitTime: args.oneMesPl > 0 ? args.firstReplayBarTime : null,
    t2HitTime: args.oneMesPl > 0 ? args.firstReplayBarTime : null,
    riskPoints: 5,
    mfeR: 2,
    maeR: 1,
    timeBucket: `${args.proofTime.slice(11, 13)}:00-${args.proofTime.slice(11, 13)}:59`,
    separatorTags: [],
  };
}

const samebar = {
  reportType: 'raw_ohlc_scanner_artifact_samebar_separator_drilldown',
  generatedAt: '2026-07-19T00:01:00.000Z',
  status: 'pass',
  authority,
  source: { replayPackageOutcomePath: outcomePath },
  assumptions: {},
  summary: {},
  modelSummaries: [],
  timeBuckets: [],
  rows: [
    samebarRow({ ticketId: 'od-loss', setupType: 'OpeningDriveFvgContinuation', date: '2026-07-09', proofTime: '2026-07-09T09:20:00', oneMesPl: -25, firstReplayBarTime: '2026-07-09T09:25:00' }),
    samebarRow({ ticketId: 'priority-loss', setupType: 'SweepMssFvgRetrace', date: '2026-07-09', proofTime: '2026-07-09T09:20:00', oneMesPl: -48.75, firstReplayBarTime: '2026-07-09T09:25:00' }),
    samebarRow({ ticketId: 'od-win', setupType: 'OpeningDriveFvgContinuation', date: '2026-07-17', proofTime: '2026-07-17T10:45:00', oneMesPl: 25, firstReplayBarTime: '2026-07-17T10:50:00' }),
    samebarRow({ ticketId: 'priority-win', setupType: 'SweepMssFvgRetrace', date: '2026-07-17', proofTime: '2026-07-17T10:45:00', oneMesPl: 212.5, firstReplayBarTime: '2026-07-17T10:50:00' }),
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport({
  sourceSelectionReports: ['source.json'],
  loadedReports: [{ path: 'source.json', report: sourceReport(), samebarReports: [samebar] }],
}, '2026-07-19T00:02:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_no_lookahead_feature_miner');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.eventRows, 2);
assert.equal(report.summary.rowsWithTapeFeatures, 2);
assert.equal(report.summary.priorityUnderperformanceRows, 1);
assert.equal(report.summary.priorityBetterRows, 1);
assert.equal(report.summary.liveInitialRankFeatureRows, 0);
assert.equal(report.summary.broadeningAllowedNow, false);

const failedClose = report.featureRows.find((row) => row.featureTag === 'proof_bar_failed_close_through_entry');
assert.ok(failedClose);
assert.equal(failedClose.priorityUnderperformanceRows, 1);
assert.equal(failedClose.priorityBetterRows, 0);
assert.equal(failedClose.separatorType, 'candidate_no_lookahead');
assert.equal(failedClose.liveInitialRankInstallableNow, false);
assert.match(report.markdown, /no-lookahead feature miner/i);

const blocked = buildRawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport({
  sourceSelectionReports: [],
  loadedReports: [],
}, '2026-07-19T00:03:00.000Z');
assert.equal(blocked.status, 'fail');
assert.equal(blocked.summary.recommendation, 'fix_inputs');

const parsed = parseRawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerArgs([
  '--source-selection-reports',
  'a.json,b.json',
  '--out-dir',
  'reports',
  '--json',
]);
assert.deepEqual(parsed.sourceSelectionReports, ['a.json', 'b.json']);
assert.equal(parsed.outDir, 'reports');
assert.equal(parsed.json, true);

console.log('raw OHLC OpeningDrive priority no-lookahead feature miner verified.');
