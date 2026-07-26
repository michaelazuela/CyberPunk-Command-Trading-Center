import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDriveOosReplayCollisionPackageReport,
  parseRawOhlcScannerArtifactOpeningDriveOosReplayCollisionPackageArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-oos-replay-collision-package';

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
  proofTime: string;
  direction: 'LONG' | 'SHORT';
  riskPoints: number;
  outcomeLabel: 't1_and_t2_hit' | 'stopped_before_t1' | 't1_hit_only';
  oneMesPl: number;
  setupType?: string;
}) {
  return {
    ticketId: args.ticketId,
    tradeDate: args.proofTime.slice(0, 10),
    session: 'morning',
    setupType: args.setupType || 'NoInstalledSetup',
    direction: args.direction,
    outcomeLabel: args.outcomeLabel,
    outcomeStatus: 'resolved',
    resolvedOneMesPl: args.oneMesPl,
    proofTime: args.proofTime,
    entryHitTime: args.proofTime,
    firstReplayBarTime: args.proofTime,
    stopHitTime: args.outcomeLabel === 'stopped_before_t1' ? args.proofTime : null,
    t1HitTime: args.outcomeLabel !== 'stopped_before_t1' ? args.proofTime : null,
    t2HitTime: args.outcomeLabel === 't1_and_t2_hit' ? args.proofTime : null,
    riskPoints: args.riskPoints,
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
  summary: {
    sameBarRows: 5,
    winners: 3,
    losses: 1,
    unresolved: 0,
    grossOneMesPl: 450,
    modelsWithPositiveSameBar: 1,
    modelsWithSameBarLosses: 1,
    livePromotionAllowedRows: 0,
  },
  modelSummaries: [],
  timeBuckets: [],
  rows: [
    row({ ticketId: 'fine', proofTime: '2026-07-17T10:00:00', direction: 'LONG', riskPoints: 26.25, outcomeLabel: 't1_hit_only', oneMesPl: 190 }),
    row({ ticketId: 'tight', proofTime: '2026-07-17T10:40:00', direction: 'LONG', riskPoints: 4.25, outcomeLabel: 't1_and_t2_hit', oneMesPl: 42.5 }),
    row({ ticketId: 'rejected-loss', proofTime: '2026-07-17T09:50:00', direction: 'LONG', riskPoints: 6.25, outcomeLabel: 'stopped_before_t1', oneMesPl: -31.25 }),
    row({ ticketId: 'rejected-short-tight', proofTime: '2026-07-17T10:40:00', direction: 'SHORT', riskPoints: 4.25, outcomeLabel: 't1_and_t2_hit', oneMesPl: 42.5 }),
    row({ ticketId: 'other-model', proofTime: '2026-07-17T10:40:00', direction: 'LONG', riskPoints: 4.25, outcomeLabel: 't1_and_t2_hit', oneMesPl: 42.5, setupType: 'NoInstalledSetup' }),
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const packageReport = buildRawOhlcScannerArtifactOpeningDriveOosReplayCollisionPackageReport({
  samebarReports: ['samebar.json'],
  reports: [reportFixture],
}, '2026-07-19T00:01:00.000Z');

assert.equal(packageReport.reportType, 'raw_ohlc_scanner_artifact_openingdrive_oos_replay_collision_package');
assert.equal(packageReport.status, 'pass');
assert.equal(packageReport.authority.changesTradingLogic, false);
assert.equal(packageReport.authority.runsSetupScanner, false);
assert.equal(packageReport.summary.openingDriveRows, 5);
assert.equal(packageReport.summary.selectedRows, 3);
assert.equal(packageReport.summary.rejectedRows, 2);
assert.equal(packageReport.selectedSummary.winners, 2);
assert.equal(packageReport.selectedSummary.losses, 0);
assert.equal(packageReport.selectedSummary.otherResolved, 1);
assert.equal(packageReport.selectedSummary.oneMesPl, 275);
assert.equal(packageReport.rejectedSummary.losses, 1);
assert.equal(packageReport.summary.recommendation, 'continue_to_collision_comparison');
assert.ok(packageReport.selectedRows.find((entry) => entry.ticketId === 'fine')?.matchedSelectors.includes('fine_risk_24_to_32'));
assert.ok(packageReport.selectedRows.find((entry) => entry.ticketId === 'tight')?.matchedSelectors.includes('tight_long_10:00-10:59_risk_4_to_5'));
assert.match(packageReport.markdown, /OpeningDrive OOS Replay Collision Package/);

const blocked = buildRawOhlcScannerArtifactOpeningDriveOosReplayCollisionPackageReport({
  samebarReports: ['samebar.json'],
  reports: [{
    ...reportFixture,
    rows: [
      row({ ticketId: 'selected-loss', proofTime: '2026-07-17T10:40:00', direction: 'LONG', riskPoints: 4.25, outcomeLabel: 'stopped_before_t1', oneMesPl: -42.5 }),
    ],
  }],
}, '2026-07-19T00:02:00.000Z');

assert.equal(blocked.status, 'fail');
assert.ok(blocked.blockers.some((blocker) => blocker.includes('installed selector picked 1 OOS loss rows')));

const parsed = parseRawOhlcScannerArtifactOpeningDriveOosReplayCollisionPackageArgs([
  '--samebar-reports',
  'a.json,b.json',
  '--out-dir',
  'reports',
  '--json',
]);
assert.deepEqual(parsed.samebarReports, ['a.json', 'b.json']);
assert.equal(parsed.outDir, 'reports');
assert.equal(parsed.json, true);

console.log('raw OHLC OpeningDrive OOS replay collision package verified.');
