import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityRiskGuardValidationReport,
  parseRawOhlcScannerArtifactOpeningDrivePriorityRiskGuardValidationArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-risk-guard-validation';
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

function sourceReport(rows: RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport['rows']): RawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport {
  return {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_oos_source_installed_selection',
    generatedAt: '2026-07-19T00:00:00.000Z',
    status: 'pass',
    authority,
    source: { samebarReports: ['samebar.json'] },
    summary: {
      comparableEvents: rows.length,
      installedPrioritySelectedRows: rows.length,
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
    rows,
    blockers: [],
    recommendations: [],
    markdown: '',
  };
}

function sourceRow(args: {
  date: string;
  proofTime: string;
  openingDriveTicketId: string;
  priorityTicketId: string;
  odPl: number;
  priorityPl: number;
}) {
  return {
    tradeDate: args.date,
    session: 'morning',
    proofTime: args.proofTime,
    direction: 'LONG',
    openingDriveTicketId: args.openingDriveTicketId,
    priorityTicketId: args.priorityTicketId,
    prioritySetupType: 'SweepMssFvgRetrace',
    installedPrimaryTicketId: args.priorityTicketId,
    installedPrimarySetupType: 'SweepMssFvgRetrace',
    installedSelectedPriority: true,
    openingDriveOneMesPl: args.odPl,
    priorityOneMesPl: args.priorityPl,
    deltaOneMesPl: Math.round((args.priorityPl - args.odPl) * 100) / 100,
    canExecuteTrueRows: 0,
    approvalBoundaryClean: true,
  };
}

function samebarRow(args: {
  ticketId: string;
  setupType: string;
  date: string;
  proofTime: string;
  oneMesPl: number;
  riskPoints: number;
  outcomeLabel: 't1_and_t2_hit' | 'stopped_before_t1';
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
    riskPoints: args.riskPoints,
    mfeR: args.outcomeLabel === 't1_and_t2_hit' ? 2 : 0,
    maeR: args.outcomeLabel === 'stopped_before_t1' ? 1 : 0,
    timeBucket: `${args.proofTime.slice(11, 13)}:00-${args.proofTime.slice(11, 13)}:59`,
    separatorTags: [args.outcomeLabel],
  };
}

const rows = [
  sourceRow({
    date: '2026-07-09',
    proofTime: '2026-07-09T09:20:00',
    openingDriveTicketId: 'od-loss',
    priorityTicketId: 'priority-loss',
    odPl: -25,
    priorityPl: -48.75,
  }),
  sourceRow({
    date: '2026-07-17',
    proofTime: '2026-07-17T10:45:00',
    openingDriveTicketId: 'od-winner',
    priorityTicketId: 'priority-winner',
    odPl: 25,
    priorityPl: 212.5,
  }),
];

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
    samebarRow({ ticketId: 'od-loss', setupType: 'OpeningDriveFvgContinuation', date: '2026-07-09', proofTime: '2026-07-09T09:20:00', oneMesPl: -25, riskPoints: 5, outcomeLabel: 'stopped_before_t1' }),
    samebarRow({ ticketId: 'priority-loss', setupType: 'SweepMssFvgRetrace', date: '2026-07-09', proofTime: '2026-07-09T09:20:00', oneMesPl: -48.75, riskPoints: 9.75, outcomeLabel: 'stopped_before_t1' }),
    samebarRow({ ticketId: 'od-winner', setupType: 'OpeningDriveFvgContinuation', date: '2026-07-17', proofTime: '2026-07-17T10:45:00', oneMesPl: 25, riskPoints: 2.5, outcomeLabel: 't1_and_t2_hit' }),
    samebarRow({ ticketId: 'priority-winner', setupType: 'SweepMssFvgRetrace', date: '2026-07-17', proofTime: '2026-07-17T10:45:00', oneMesPl: 212.5, riskPoints: 21.25, outcomeLabel: 't1_and_t2_hit' }),
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityRiskGuardValidationReport({
  sourceSelectionReports: ['source.json'],
  loadedReports: [{
    path: 'source.json',
    report: sourceReport(rows),
    samebarReports: [samebar],
  }],
}, '2026-07-19T00:02:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_priority_risk_guard_validation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.summary.eventRows, 2);
assert.equal(report.summary.priorityUnderperformanceRows, 1);
assert.equal(report.summary.priorityBetterRows, 1);
assert.equal(report.summary.candidateGuardRows, 0);
assert.equal(report.summary.recommendation, 'no_simple_risk_guard_supported');
assert.equal(report.summary.broadeningAllowedNow, false);
assert.equal(report.summary.livePromotionAllowedRows, 0);

const ratio15 = report.guardRows.find((row) => row.guardId === 'risk_ratio_lte_1_5');
assert.ok(ratio15);
assert.equal(ratio15.caughtUnderperformanceRows, 1);
assert.equal(ratio15.missedUnderperformanceRows, 0);
assert.equal(ratio15.falseRejectedPriorityBetterRows, 1);
assert.equal(ratio15.decision, 'reject_for_now');

const ratio2 = report.guardRows.find((row) => row.guardId === 'risk_ratio_lte_2');
assert.ok(ratio2);
assert.equal(ratio2.missedUnderperformanceRows, 1);
assert.equal(ratio2.falseRejectedPriorityBetterRows, 1);
assert.equal(ratio2.decision, 'reject_for_now');
assert.match(report.markdown, /OpeningDrive Priority Risk Guard Validation/);

const blocked = buildRawOhlcScannerArtifactOpeningDrivePriorityRiskGuardValidationReport({
  sourceSelectionReports: [],
  loadedReports: [],
}, '2026-07-19T00:03:00.000Z');

assert.equal(blocked.status, 'fail');
assert.equal(blocked.summary.recommendation, 'fix_inputs');
assert.ok(blocked.blockers.some((blocker) => blocker.includes('no source-selection reports supplied')));

const parsed = parseRawOhlcScannerArtifactOpeningDrivePriorityRiskGuardValidationArgs([
  '--source-selection-reports',
  'a.json,b.json',
  '--out-dir',
  'reports',
  '--json',
]);
assert.deepEqual(parsed.sourceSelectionReports, ['a.json', 'b.json']);
assert.equal(parsed.outDir, 'reports');
assert.equal(parsed.json, true);

console.log('raw OHLC OpeningDrive priority risk-guard validation verified.');
