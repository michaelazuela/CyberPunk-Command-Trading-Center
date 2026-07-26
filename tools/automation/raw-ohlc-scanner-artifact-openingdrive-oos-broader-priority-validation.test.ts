import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDriveOosBroaderPriorityValidationReport,
  parseRawOhlcScannerArtifactOpeningDriveOosBroaderPriorityValidationArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-oos-broader-priority-validation';

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

const reportFixture = {
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
    row({ ticketId: 'od-a', setupType: 'NoInstalledSetup', proofTime: '2026-07-17T10:00:00', oneMesPl: 100 }),
    row({ ticketId: 'sweep-a', setupType: 'NoInstalledSetup', proofTime: '2026-07-17T10:00:00', oneMesPl: 150 }),
    row({ ticketId: 'od-b', setupType: 'NoInstalledSetup', proofTime: '2026-07-17T10:05:00', oneMesPl: 200 }),
    row({ ticketId: 'htf-b', setupType: 'NoInstalledSetup', proofTime: '2026-07-17T10:05:00', oneMesPl: 180 }),
    row({ ticketId: 'short-sweep-ignore', setupType: 'NoInstalledSetup', proofTime: '2026-07-17T10:05:00', oneMesPl: 500, direction: 'SHORT' }),
    row({ ticketId: 'od-no-priority', setupType: 'NoInstalledSetup', proofTime: '2026-07-17T10:10:00', oneMesPl: 50 }),
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const report = buildRawOhlcScannerArtifactOpeningDriveOosBroaderPriorityValidationReport({
  samebarReports: ['samebar.json'],
  reports: [reportFixture],
}, '2026-07-19T00:01:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_oos_broader_priority_validation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.summary.comparableEvents, 4);
assert.equal(report.summary.priorityBetterRows, 0);
assert.equal(report.summary.openingDriveBetterOrEqualRows, 4);
assert.equal(report.summary.openingDriveOneMesPl, 900);
assert.equal(report.summary.priorityOneMesPl, 900);
assert.equal(report.summary.deltaOneMesPl, 0);
assert.equal(report.rows.find((item) => item.proofTime === '2026-07-17T10:05:00')?.prioritySetupType, 'NoInstalledSetup');
assert.match(report.markdown, /OpeningDrive OOS Broader Priority Validation/);

const blocked = buildRawOhlcScannerArtifactOpeningDriveOosBroaderPriorityValidationReport({
  samebarReports: ['samebar.json'],
  reports: [{ ...reportFixture, rows: [] }],
}, '2026-07-19T00:02:00.000Z');

assert.equal(blocked.status, 'fail');
assert.ok(blocked.blockers.some((blocker) => blocker.includes('no comparable OpeningDrive versus same-direction Sweep/HTF events found')));

const parsed = parseRawOhlcScannerArtifactOpeningDriveOosBroaderPriorityValidationArgs([
  '--samebar-reports',
  'a.json,b.json',
  '--out-dir',
  'reports',
  '--json',
]);
assert.deepEqual(parsed.samebarReports, ['a.json', 'b.json']);
assert.equal(parsed.outDir, 'reports');
assert.equal(parsed.json, true);

console.log('raw OHLC OpeningDrive OOS broader priority validation verified.');
