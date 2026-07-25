import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDriveOosCollisionComparisonReport,
  parseRawOhlcScannerArtifactOpeningDriveOosCollisionComparisonArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-oos-collision-comparison';

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

function samebarRow(args: {
  ticketId: string;
  proofTime: string;
  setupType: string;
  oneMesPl: number;
  outcomeLabel?: 't1_and_t2_hit' | 'stopped_before_t1' | 't1_hit_only';
  direction?: 'LONG' | 'SHORT';
  riskPoints?: number;
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
    riskPoints: args.riskPoints || 4.25,
    mfeR: 2,
    maeR: 0,
    timeBucket: `${args.proofTime.slice(11, 13)}:00-${args.proofTime.slice(11, 13)}:59`,
    separatorTags: [],
  };
}

const oosPackage = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_oos_replay_collision_package',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { samebarReports: ['samebar.json'] },
  assumptions: {},
  summary: {
    sourceReports: 1,
    openingDriveRows: 3,
    selectedRows: 2,
    rejectedRows: 1,
    selectedLosses: 0,
    selectedOneMesPl: 240,
    rejectedLosses: 1,
    rejectedOneMesPl: -30,
    livePromotionAllowedRows: 0,
    recommendation: 'continue_to_collision_comparison',
  },
  selectedSummary: { rows: 2, winners: 1, losses: 0, otherResolved: 1, unresolved: 0, oneMesPl: 240, avgRiskPoints: 15 },
  rejectedSummary: { rows: 1, winners: 0, losses: 1, otherResolved: 0, unresolved: 0, oneMesPl: -30, avgRiskPoints: 6 },
  selectedRows: [
    {
      ticketId: 'selected-best',
      tradeDate: '2026-07-17',
      session: 'morning',
      setupType: 'OpeningDriveFvgContinuation',
      direction: 'LONG',
      proofTime: '2026-07-17T10:00:00',
      riskPoints: 26.25,
      outcomeLabel: 't1_hit_only',
      outcomeStatus: 'resolved',
      oneMesPl: 198.13,
      selectorMatched: true,
      matchedSelectors: ['fine_risk_24_to_32'],
    },
    {
      ticketId: 'selected-no-competitor',
      tradeDate: '2026-07-17',
      session: 'morning',
      setupType: 'OpeningDriveFvgContinuation',
      direction: 'LONG',
      proofTime: '2026-07-17T10:40:00',
      riskPoints: 4.25,
      outcomeLabel: 't1_and_t2_hit',
      outcomeStatus: 'resolved',
      oneMesPl: 42.5,
      selectorMatched: true,
      matchedSelectors: ['tight_long_10:00-10:59_risk_4_to_5'],
    },
  ],
  rejectedRows: [],
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const samebarReport = {
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
    samebarRow({ ticketId: 'selected-best', proofTime: '2026-07-17T10:00:00', setupType: 'OpeningDriveFvgContinuation', oneMesPl: 198.13, outcomeLabel: 't1_hit_only', riskPoints: 26.25 }),
    samebarRow({ ticketId: 'competitor-loss', proofTime: '2026-07-17T10:00:00', setupType: 'raidReclaim', oneMesPl: -30, outcomeLabel: 'stopped_before_t1' }),
    samebarRow({ ticketId: 'competitor-smaller-win', proofTime: '2026-07-17T10:00:00', setupType: 'IntradayMssMicroContinuation', oneMesPl: 80 }),
    samebarRow({ ticketId: 'selected-no-competitor', proofTime: '2026-07-17T10:40:00', setupType: 'OpeningDriveFvgContinuation', oneMesPl: 42.5 }),
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const report = buildRawOhlcScannerArtifactOpeningDriveOosCollisionComparisonReport({
  oosPackagePath: 'oos.json',
  oosPackage,
  samebarReports: ['samebar.json'],
  samebarReportPayloads: [samebarReport],
}, '2026-07-19T00:02:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_oos_collision_comparison');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.summary.selectedRows, 2);
assert.equal(report.summary.selectedRowsWithCompetitors, 1);
assert.equal(report.summary.selectedRowsWithoutCompetitors, 1);
assert.equal(report.summary.selectedRowsBeatingCompetitors, 1);
assert.equal(report.summary.selectedRowsLaggingBestCompetitor, 0);
assert.equal(report.summary.selectedLosses, 0);
assert.equal(report.summary.competingLosses, 1);
assert.equal(report.summary.selectedOneMesPl, 240.63);
assert.equal(report.summary.bestCompetingOneMesPl, 80);
assert.equal(report.summary.deltaVsBestCompetingOneMesPl, 160.63);
assert.equal(report.summary.recommendation, 'keep_installed_overlay_and_continue_live_observation');
assert.equal(report.rows.find((row) => row.selectedTicketId === 'selected-best')?.bestCompetingSetupType, 'IntradayMssMicroContinuation');
assert.equal(report.rows.find((row) => row.selectedTicketId === 'selected-no-competitor')?.collisionVerdict, 'selected_clean_no_competitor');
assert.match(report.markdown, /OpeningDrive OOS Collision Comparison/);

const lagging = buildRawOhlcScannerArtifactOpeningDriveOosCollisionComparisonReport({
  oosPackagePath: 'oos.json',
  oosPackage,
  samebarReports: ['samebar.json'],
  samebarReportPayloads: [{
    ...samebarReport,
    rows: [
      samebarRow({ ticketId: 'selected-best', proofTime: '2026-07-17T10:00:00', setupType: 'OpeningDriveFvgContinuation', oneMesPl: 198.13, outcomeLabel: 't1_hit_only', riskPoints: 26.25 }),
      samebarRow({ ticketId: 'competitor-bigger', proofTime: '2026-07-17T10:00:00', setupType: 'raidReclaim', oneMesPl: 250 }),
      samebarRow({ ticketId: 'selected-no-competitor', proofTime: '2026-07-17T10:40:00', setupType: 'OpeningDriveFvgContinuation', oneMesPl: 42.5 }),
    ],
  }],
}, '2026-07-19T00:03:00.000Z');

assert.equal(lagging.status, 'pass');
assert.equal(lagging.summary.selectedRowsLaggingBestCompetitor, 1);
assert.equal(lagging.summary.recommendation, 'inspect_competitor_collisions');

const blocked = buildRawOhlcScannerArtifactOpeningDriveOosCollisionComparisonReport({
  oosPackagePath: 'oos.json',
  oosPackage: {
    ...oosPackage,
    selectedRows: [{
      ...oosPackage.selectedRows[0],
      outcomeLabel: 'stopped_before_t1',
      oneMesPl: -30,
    }],
  },
  samebarReports: ['samebar.json'],
  samebarReportPayloads: [samebarReport],
}, '2026-07-19T00:04:00.000Z');

assert.equal(blocked.status, 'fail');
assert.ok(blocked.blockers.some((blocker) => blocker.includes('selected OOS rows include 1 loss rows')));

const parsed = parseRawOhlcScannerArtifactOpeningDriveOosCollisionComparisonArgs([
  '--oos-package',
  'oos.json',
  '--samebar-reports',
  'a.json,b.json',
  '--out-dir',
  'reports',
  '--json',
]);
assert.equal(parsed.oosPackage, 'oos.json');
assert.deepEqual(parsed.samebarReports, ['a.json', 'b.json']);
assert.equal(parsed.outDir, 'reports');
assert.equal(parsed.json, true);

console.log('raw OHLC OpeningDrive OOS collision comparison verified.');
