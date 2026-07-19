import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityFreshContradictionDrilldownReport,
  parseRawOhlcScannerArtifactOpeningDrivePriorityFreshContradictionDrilldownArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-fresh-contradiction-drilldown';
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

const sourceSelection: RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport = {
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
    openingDriveTicketId: 'od-a',
    priorityTicketId: 'sweep-a',
    prioritySetupType: 'SweepMssFvgRetrace',
    installedPrimaryTicketId: 'sweep-a',
    installedPrimarySetupType: 'SweepMssFvgRetrace',
    installedSelectedPriority: true,
    openingDriveOneMesPl: -25,
    priorityOneMesPl: -48.75,
    deltaOneMesPl: -23.75,
    canExecuteTrueRows: 0,
    approvalBoundaryClean: true,
  }],
  blockers: [],
  recommendations: [],
  markdown: '',
};

function samebarRow(args: {
  ticketId: string;
  setupType: string;
  oneMesPl: number;
  riskPoints: number;
  t1HitTime: string;
  t2HitTime: string;
  tags?: string[];
}) {
  return {
    ticketId: args.ticketId,
    tradeDate: '2026-07-09',
    session: 'morning',
    setupType: args.setupType,
    direction: 'LONG',
    outcomeLabel: 'stopped_before_t1',
    outcomeStatus: 'resolved',
    resolvedOneMesPl: args.oneMesPl,
    proofTime: '2026-07-09T09:20:00',
    entryHitTime: '2026-07-09T09:20:00',
    firstReplayBarTime: '2026-07-09T09:25:00',
    stopHitTime: '2026-07-09T09:35:00',
    t1HitTime: args.t1HitTime,
    t2HitTime: args.t2HitTime,
    riskPoints: args.riskPoints,
    mfeR: 3,
    maeR: 1.5,
    timeBucket: '09:00-09:59',
    separatorTags: args.tags || ['stopped_before_t1'],
  };
}

const samebar = {
  reportType: 'raw_ohlc_scanner_artifact_samebar_separator_drilldown',
  generatedAt: '2026-07-19T00:01:00.000Z',
  status: 'pass',
  authority,
  source: {},
  assumptions: {},
  summary: {},
  modelSummaries: [],
  timeBuckets: [],
  rows: [
    samebarRow({
      ticketId: 'od-a',
      setupType: 'OpeningDriveFvgContinuation',
      oneMesPl: -25,
      riskPoints: 5,
      t1HitTime: '2026-07-09T09:40:00',
      t2HitTime: '2026-07-09T09:45:00',
      tags: ['stopped_before_t1', 'intrabar_ambiguity'],
    }),
    samebarRow({
      ticketId: 'sweep-a',
      setupType: 'SweepMssFvgRetrace',
      oneMesPl: -48.75,
      riskPoints: 9.75,
      t1HitTime: '2026-07-09T09:55:00',
      t2HitTime: '2026-07-09T11:10:00',
    }),
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityFreshContradictionDrilldownReport({
  sourceSelectionReportPath: 'source-selection.json',
  sourceSelectionReport: sourceSelection,
  samebarReports: ['samebar.json'],
  reports: [samebar],
}, '2026-07-19T00:02:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_fresh_contradiction_drilldown');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.summary.sourceRows, 1);
assert.equal(report.summary.contradictionRows, 1);
assert.equal(report.summary.bothStoppedBeforeT1Rows, 1);
assert.equal(report.summary.priorityWiderRiskRows, 1);
assert.equal(report.summary.openingDriveIntrabarAmbiguityRows, 1);
assert.equal(report.summary.priorityLaterT1Rows, 1);
assert.equal(report.summary.priorityLaterT2Rows, 1);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.approvalBoundaryDriftRows, 0);
assert.equal(report.summary.totalPriorityWorseByOneMesPl, 23.75);
assert.equal(report.summary.recommendation, 'research_priority_risk_cap_before_broadening');
assert.equal(report.summary.broadeningAllowedNow, false);
assert.equal(report.rows[0].riskDeltaPoints, 4.75);
assert.equal(report.rows[0].riskRatio, 1.95);
assert.deepEqual(report.rows[0].rootCauseTags, [
  'both_stopped_before_t1',
  'priority_wider_risk',
  'openingdrive_intrabar_ambiguity',
  'priority_later_t1',
  'priority_later_t2',
  'same_event_priority_underperformed',
]);
assert.match(report.markdown, /OpeningDrive Priority Fresh Contradiction Drilldown/);

const clean = buildRawOhlcScannerArtifactOpeningDrivePriorityFreshContradictionDrilldownReport({
  sourceSelectionReportPath: 'source-selection.json',
  sourceSelectionReport: {
    ...sourceSelection,
    summary: { ...sourceSelection.summary, deltaOneMesPl: 10 },
    rows: [{ ...sourceSelection.rows[0], deltaOneMesPl: 10 }],
  },
  samebarReports: ['samebar.json'],
  reports: [samebar],
}, '2026-07-19T00:03:00.000Z');

assert.equal(clean.status, 'pass');
assert.equal(clean.summary.contradictionRows, 0);
assert.equal(clean.summary.recommendation, 'continue_observation');

const blocked = buildRawOhlcScannerArtifactOpeningDrivePriorityFreshContradictionDrilldownReport({
  sourceSelectionReportPath: null,
  sourceSelectionReport: null,
  samebarReports: [],
  reports: [],
}, '2026-07-19T00:04:00.000Z');

assert.equal(blocked.status, 'fail');
assert.equal(blocked.summary.recommendation, 'fix_inputs');
assert.ok(blocked.blockers.some((blocker) => blocker.includes('missing source-selection report')));

const parsed = parseRawOhlcScannerArtifactOpeningDrivePriorityFreshContradictionDrilldownArgs([
  '--source-selection-report',
  'source.json',
  '--samebar-reports',
  'a.json,b.json',
  '--out-dir',
  'reports',
  '--json',
]);
assert.equal(parsed.sourceSelectionReport, 'source.json');
assert.deepEqual(parsed.samebarReports, ['a.json', 'b.json']);
assert.equal(parsed.outDir, 'reports');
assert.equal(parsed.json, true);

console.log('raw OHLC OpeningDrive priority fresh contradiction drilldown verified.');
