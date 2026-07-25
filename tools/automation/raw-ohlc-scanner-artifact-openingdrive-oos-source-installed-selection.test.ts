import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport,
  parseRawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionArgs,
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

function row(args: {
  ticketId: string;
  setupType: string;
  proofTime: string;
  oneMesPl: number;
  direction?: 'LONG' | 'SHORT';
  outcomeLabel?: 't1_and_t2_hit' | 'stopped_before_t1' | 't1_hit_only';
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
    riskPoints: 4.25,
    mfeR: 2,
    maeR: 0,
    timeBucket: `${args.proofTime.slice(11, 13)}:00-${args.proofTime.slice(11, 13)}:59`,
    separatorTags: [],
  };
}

const samebar = {
  reportType: 'raw_ohlc_scanner_artifact_samebar_separator_drilldown',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {},
  assumptions: {},
  summary: {},
  modelSummaries: [],
  timeBuckets: [],
  rows: [
    row({ ticketId: 'od-a', setupType: 'OpeningDriveFvgContinuation', proofTime: '2026-07-17T10:00:00', oneMesPl: 100 }),
    row({ ticketId: 'sweep-a', setupType: 'SweepMssFvgRetrace', proofTime: '2026-07-17T10:00:00', oneMesPl: 150 }),
    row({ ticketId: 'od-b', setupType: 'OpeningDriveFvgContinuation', proofTime: '2026-07-17T10:05:00', oneMesPl: 120, direction: 'SHORT' }),
    row({ ticketId: 'htf-b', setupType: 'IntradayMssMicroContinuation', proofTime: '2026-07-17T10:05:00', oneMesPl: 200, direction: 'SHORT' }),
    row({ ticketId: 'wrong-side-ignore', setupType: 'SweepMssFvgRetrace', proofTime: '2026-07-17T10:05:00', oneMesPl: 500, direction: 'LONG' }),
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const report = buildRawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport({
  samebarReports: ['samebar.json'],
  reports: [samebar],
}, '2026-07-19T00:01:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_oos_source_installed_selection');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.summary.comparableEvents, 2);
assert.equal(report.summary.installedPrioritySelectedRows, 2);
assert.equal(report.summary.installedOpeningDriveSelectedRows, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.approvalBoundaryDriftRows, 0);
assert.equal(report.summary.priorityLosses, 0);
assert.equal(report.summary.openingDriveOneMesPl, 220);
assert.equal(report.summary.priorityOneMesPl, 350);
assert.equal(report.summary.deltaOneMesPl, 130);
assert.equal(report.rows[0].installedPrimaryTicketId, 'sweep-a');
assert.equal(report.rows[1].installedPrimaryTicketId, 'htf-b');
assert.match(report.markdown, /OpeningDrive OOS Source Installed Selection/);

const blocked = buildRawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionReport({
  samebarReports: ['samebar.json'],
  reports: [{ ...samebar, rows: [] }],
}, '2026-07-19T00:02:00.000Z');
assert.equal(blocked.status, 'fail');
assert.ok(blocked.blockers.some((blocker) => blocker.includes('no comparable source-artifact events found')));

const parsed = parseRawOhlcScannerArtifactOpeningDriveOosSourceInstalledSelectionArgs([
  '--samebar-reports',
  'a.json,b.json',
  '--out-dir',
  'reports',
  '--json',
]);
assert.deepEqual(parsed.samebarReports, ['a.json', 'b.json']);
assert.equal(parsed.outDir, 'reports');
assert.equal(parsed.json, true);

console.log('raw OHLC OpeningDrive OOS source installed selection verified.');
