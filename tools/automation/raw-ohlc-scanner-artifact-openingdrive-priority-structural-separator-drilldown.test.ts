import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityStructuralSeparatorDrilldownReport,
  parseRawOhlcScannerArtifactOpeningDrivePriorityStructuralSeparatorDrilldownArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-structural-separator-drilldown';
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

function samebarRow(args: {
  ticketId: string;
  setupType: string;
  date: string;
  proofTime: string;
  oneMesPl: number;
  outcomeLabel: 't1_and_t2_hit' | 'stopped_before_t1';
  tags?: string[];
}) {
  return {
    ticketId: args.ticketId,
    tradeDate: args.date,
    session: 'morning',
    setupType: args.setupType,
    direction: 'LONG',
    outcomeLabel: args.outcomeLabel,
    outcomeStatus: 'resolved',
    resolvedOneMesPl: args.oneMesPl,
    proofTime: args.proofTime,
    entryHitTime: args.proofTime,
    firstReplayBarTime: args.proofTime,
    stopHitTime: args.outcomeLabel === 'stopped_before_t1' ? args.proofTime : null,
    t1HitTime: args.outcomeLabel === 't1_and_t2_hit' ? args.proofTime : null,
    t2HitTime: args.outcomeLabel === 't1_and_t2_hit' ? args.proofTime : null,
    riskPoints: 5,
    mfeR: args.outcomeLabel === 't1_and_t2_hit' ? 2 : 0.5,
    maeR: args.outcomeLabel === 'stopped_before_t1' ? 1.2 : 0.4,
    timeBucket: `${args.proofTime.slice(11, 13)}:00-${args.proofTime.slice(11, 13)}:59`,
    separatorTags: args.tags || [args.outcomeLabel],
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
    samebarRow({ ticketId: 'od-loss', setupType: 'OpeningDriveFvgContinuation', date: '2026-07-09', proofTime: '2026-07-09T09:20:00', oneMesPl: -25, outcomeLabel: 'stopped_before_t1', tags: ['stopped_before_t1', 'intrabar_ambiguity'] }),
    samebarRow({ ticketId: 'priority-loss', setupType: 'SweepMssFvgRetrace', date: '2026-07-09', proofTime: '2026-07-09T09:20:00', oneMesPl: -48.75, outcomeLabel: 'stopped_before_t1' }),
    samebarRow({ ticketId: 'od-win', setupType: 'OpeningDriveFvgContinuation', date: '2026-07-17', proofTime: '2026-07-17T10:45:00', oneMesPl: 25, outcomeLabel: 't1_and_t2_hit' }),
    samebarRow({ ticketId: 'priority-win', setupType: 'SweepMssFvgRetrace', date: '2026-07-17', proofTime: '2026-07-17T10:45:00', oneMesPl: 212.5, outcomeLabel: 't1_and_t2_hit' }),
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityStructuralSeparatorDrilldownReport({
  sourceSelectionReports: ['source.json'],
  loadedReports: [{ path: 'source.json', report: sourceReport(), samebarReports: [samebar] }],
}, '2026-07-19T00:02:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_structural_separator_drilldown');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.eventRows, 2);
assert.equal(report.summary.priorityUnderperformanceRows, 1);
assert.equal(report.summary.priorityBetterRows, 1);
assert.equal(report.summary.liveInstallableFeatureRows, 0);
assert.equal(report.summary.broadeningAllowedNow, false);
assert.equal(report.summary.recommendation, 'mine_pre_entry_structural_separator');

const stopped = report.featureRows.find((row) => row.featureTag === 'priority_outcome_stopped_before_t1');
assert.ok(stopped);
assert.equal(stopped.priorityUnderperformanceRows, 1);
assert.equal(stopped.priorityBetterRows, 0);
assert.equal(stopped.separatorType, 'outcome_only');
assert.equal(stopped.liveInstallableNow, false);
assert.match(report.markdown, /Outcome timing and outcome labels are research-only/);

const blocked = buildRawOhlcScannerArtifactOpeningDrivePriorityStructuralSeparatorDrilldownReport({
  sourceSelectionReports: [],
  loadedReports: [],
}, '2026-07-19T00:03:00.000Z');
assert.equal(blocked.status, 'fail');
assert.equal(blocked.summary.recommendation, 'fix_inputs');

const parsed = parseRawOhlcScannerArtifactOpeningDrivePriorityStructuralSeparatorDrilldownArgs([
  '--source-selection-reports',
  'a.json,b.json',
  '--out-dir',
  'reports',
  '--json',
]);
assert.deepEqual(parsed.sourceSelectionReports, ['a.json', 'b.json']);
assert.equal(parsed.outDir, 'reports');
assert.equal(parsed.json, true);

console.log('raw OHLC OpeningDrive priority structural separator drilldown verified.');
