import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityFreshObservationMonitorReport,
  parseRawOhlcScannerArtifactOpeningDrivePriorityFreshObservationMonitorArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-fresh-observation-monitor';
import type {
  RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport,
} from './raw-ohlc-scanner-artifact-openingdrive-oos-source-installed-selection';

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

function baseline(): RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport {
  return {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_oos_source_installed_selection',
    generatedAt: '2026-07-19T00:00:00.000Z',
    status: 'pass',
    authority,
    source: { samebarReports: ['samebar-baseline.json'] },
    summary: {
      comparableEvents: 13,
      installedPrioritySelectedRows: 13,
      installedOpeningDriveSelectedRows: 0,
      canExecuteTrueRows: 0,
      approvalBoundaryDriftRows: 0,
      priorityLosses: 0,
      openingDriveLosses: 2,
      openingDriveOneMesPl: 934.39,
      priorityOneMesPl: 2300,
      deltaOneMesPl: 1365.61,
      recommendation: 'source_artifacts_match_installed_priority_overlay',
      livePromotionAllowedRows: 0,
    },
    rows: [],
    blockers: [],
    recommendations: [],
    markdown: '',
  };
}

function row(args: {
  ticketId: string;
  setupType: string;
  proofTime: string;
  oneMesPl: number;
  direction?: 'LONG' | 'SHORT';
  outcomeLabel?: 't1_and_t2_hit' | 'stopped_before_t1';
}) {
  return {
    ticketId: args.ticketId,
    tradeDate: args.proofTime.slice(0, 10),
    session: 'morning',
    setupType: args.setupType,
    direction: args.direction || 'LONG',
    outcomeLabel: args.outcomeLabel || 't1_and_t2_hit',
    outcomeStatus: 'resolved',
    resolvedOneMesPl: args.oneMesPl,
    proofTime: args.proofTime,
    entryHitTime: args.proofTime,
    firstReplayBarTime: args.proofTime,
    stopHitTime: args.outcomeLabel === 'stopped_before_t1' ? args.proofTime : null,
    t1HitTime: args.outcomeLabel === 'stopped_before_t1' ? null : args.proofTime,
    t2HitTime: args.outcomeLabel === 't1_and_t2_hit' || !args.outcomeLabel ? args.proofTime : null,
    riskPoints: 4,
    mfeR: 2,
    maeR: 0,
    timeBucket: `${args.proofTime.slice(11, 13)}:00-${args.proofTime.slice(11, 13)}:59`,
    separatorTags: [],
  };
}

const samebar = {
  reportType: 'raw_ohlc_scanner_artifact_samebar_separator_drilldown',
  generatedAt: '2026-07-19T01:00:00.000Z',
  status: 'pass',
  authority,
  source: {},
  assumptions: {},
  summary: {},
  modelSummaries: [],
  timeBuckets: [],
  rows: [
    row({ ticketId: 'od-fresh', setupType: 'OpeningDriveFvgContinuation', proofTime: '2026-07-20T10:00:00', oneMesPl: 50 }),
    row({ ticketId: 'sweep-fresh', setupType: 'SweepMssFvgRetrace', proofTime: '2026-07-20T10:00:00', oneMesPl: 125 }),
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const awaitingFresh = buildRawOhlcScannerArtifactOpeningDrivePriorityFreshObservationMonitorReport({
  baselineReportPath: 'baseline.json',
  baselineReport: baseline(),
  samebarReports: [],
  reports: [],
}, '2026-07-19T02:00:00.000Z');

assert.equal(awaitingFresh.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_fresh_observation_monitor');
assert.equal(awaitingFresh.status, 'pass');
assert.equal(awaitingFresh.authority.changesTradingLogic, false);
assert.equal(awaitingFresh.authority.readsLiveBridge, false);
assert.equal(awaitingFresh.summary.recommendation, 'await_fresh_replay_or_live_observation_artifacts');
assert.equal(awaitingFresh.summary.broadeningAllowedNow, false);
assert.equal(awaitingFresh.freshObservation.samebarReports, 0);
assert.match(awaitingFresh.markdown, /OpeningDrive Priority Fresh Observation Monitor/);

const freshClean = buildRawOhlcScannerArtifactOpeningDrivePriorityFreshObservationMonitorReport({
  baselineReportPath: 'baseline.json',
  baselineReport: baseline(),
  samebarReports: ['fresh-samebar.json'],
  reports: [samebar],
}, '2026-07-19T02:05:00.000Z');

assert.equal(freshClean.status, 'pass');
assert.equal(freshClean.summary.recommendation, 'continue_observation');
assert.equal(freshClean.freshObservation.samebarReports, 1);
assert.equal(freshClean.freshObservation.comparableEvents, 1);
assert.equal(freshClean.freshObservation.installedPrioritySelectedRows, 1);
assert.equal(freshClean.freshObservation.installedOpeningDriveSelectedRows, 0);
assert.equal(freshClean.freshObservation.canExecuteTrueRows, 0);
assert.equal(freshClean.freshObservation.approvalBoundaryDriftRows, 0);
assert.equal(freshClean.freshObservation.deltaOneMesPl, 75);

const blocked = buildRawOhlcScannerArtifactOpeningDrivePriorityFreshObservationMonitorReport({
  baselineReportPath: null,
  baselineReport: null,
  samebarReports: [],
  reports: [],
}, '2026-07-19T02:10:00.000Z');

assert.equal(blocked.status, 'fail');
assert.equal(blocked.summary.recommendation, 'fix_inputs');
assert.ok(blocked.blockers.some((blocker) => blocker.includes('missing baseline')));

const parsed = parseRawOhlcScannerArtifactOpeningDrivePriorityFreshObservationMonitorArgs([
  '--baseline-report',
  'baseline.json',
  '--samebar-reports',
  'a.json,b.json',
  '--out-dir',
  'reports',
  '--json',
]);
assert.equal(parsed.baselineReport, 'baseline.json');
assert.deepEqual(parsed.samebarReports, ['a.json', 'b.json']);
assert.equal(parsed.outDir, 'reports');
assert.equal(parsed.json, true);

console.log('raw OHLC OpeningDrive priority fresh observation monitor verified.');
