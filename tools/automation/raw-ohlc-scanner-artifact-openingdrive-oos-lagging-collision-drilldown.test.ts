import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDriveOosLaggingCollisionDrilldownReport,
  parseRawOhlcScannerArtifactOpeningDriveOosLaggingCollisionDrilldownArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-oos-lagging-collision-drilldown';

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
  direction?: 'LONG' | 'SHORT';
  riskPoints?: number;
  oneMesPl: number;
  mfeR?: number;
  maeR?: number;
}) {
  return {
    ticketId: args.ticketId,
    tradeDate: args.proofTime.slice(0, 10),
    session: 'morning',
    setupType: args.setupType,
    direction: args.direction || 'LONG',
    outcomeLabel: 't1_and_t2_hit',
    outcomeStatus: 'resolved',
    resolvedOneMesPl: args.oneMesPl,
    proofTime: args.proofTime,
    entryHitTime: args.proofTime,
    firstReplayBarTime: args.proofTime,
    stopHitTime: null,
    t1HitTime: args.proofTime,
    t2HitTime: args.proofTime,
    riskPoints: args.riskPoints || 4.25,
    mfeR: args.mfeR ?? 2,
    maeR: args.maeR ?? 0,
    timeBucket: `${args.proofTime.slice(11, 13)}:00-${args.proofTime.slice(11, 13)}:59`,
    separatorTags: ['same_bar_clean'],
  };
}

const comparison = {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_oos_collision_comparison',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { oosPackagePath: 'oos.json', samebarReports: ['samebar.json'] },
  assumptions: {},
  summary: {},
  rows: [
    {
      selectedTicketId: 'selected-openingdrive',
      tradeDate: '2026-07-17',
      session: 'morning',
      proofTime: '2026-07-17T10:40:00',
      selectedDirection: 'LONG',
      selectedRiskPoints: 4.25,
      selectedOutcomeLabel: 't1_and_t2_hit',
      selectedOutcomeStatus: 'resolved',
      selectedOneMesPl: 42.5,
      competingRows: 2,
      competingSetupTypes: ['NoInstalledSetup', 'NoInstalledSetup'],
      competingLosses: 0,
      competingWinners: 2,
      bestCompetingTicketId: 'best-sweep',
      bestCompetingSetupType: 'NoInstalledSetup',
      bestCompetingDirection: 'LONG',
      bestCompetingOneMesPl: 212.5,
      selectedVsBestCompetingDelta: -170,
      collisionVerdict: 'selected_clean_but_competitor_better',
    },
    {
      selectedTicketId: 'selected-clean',
      tradeDate: '2026-07-17',
      session: 'morning',
      proofTime: '2026-07-17T11:00:00',
      selectedDirection: 'LONG',
      selectedRiskPoints: 5,
      selectedOutcomeLabel: 't1_and_t2_hit',
      selectedOutcomeStatus: 'resolved',
      selectedOneMesPl: 50,
      competingRows: 0,
      competingSetupTypes: [],
      competingLosses: 0,
      competingWinners: 0,
      bestCompetingTicketId: null,
      bestCompetingSetupType: null,
      bestCompetingDirection: null,
      bestCompetingOneMesPl: null,
      selectedVsBestCompetingDelta: null,
      collisionVerdict: 'selected_clean_no_competitor',
    },
  ],
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
    samebarRow({ ticketId: 'selected-openingdrive', proofTime: '2026-07-17T10:40:00', setupType: 'NoInstalledSetup', oneMesPl: 42.5, riskPoints: 4.25 }),
    samebarRow({ ticketId: 'best-sweep', proofTime: '2026-07-17T10:40:00', setupType: 'NoInstalledSetup', oneMesPl: 212.5, riskPoints: 8 }),
    samebarRow({ ticketId: 'htf-support', proofTime: '2026-07-17T10:40:00', setupType: 'NoInstalledSetup', oneMesPl: 210, riskPoints: 8 }),
    samebarRow({ ticketId: 'opposite-side', proofTime: '2026-07-17T10:40:00', setupType: 'historicalReview', direction: 'SHORT', oneMesPl: 50 }),
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
} as any;

const report = buildRawOhlcScannerArtifactOpeningDriveOosLaggingCollisionDrilldownReport({
  comparisonPath: 'comparison.json',
  comparison,
  samebarReports: ['samebar.json'],
  samebarReportPayloads: [samebarReport],
}, '2026-07-19T00:02:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_oos_lagging_collision_drilldown');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.runsSetupScanner, false);
assert.equal(report.summary.laggingRows, 1);
assert.equal(report.summary.laggingRowsWithSameDirectionCompetitors, 1);
assert.equal(report.summary.laggingRowsBestedBySweepOrHtf, 1);
assert.equal(report.summary.selectedOneMesPl, 42.5);
assert.equal(report.summary.bestCompetingOneMesPl, 212.5);
assert.equal(report.summary.deltaVsBestCompetingOneMesPl, -170);
assert.equal(report.summary.recommendation, 'research_sweep_htf_priority_over_openingdrive_same_event');
assert.equal(report.rows[0].sameDirectionCompetitors, 2);
assert.equal(report.rows[0].oppositeDirectionCompetitors, 1);
assert.equal(report.rows[0].likelySeparator, 'same_direction_sweep_or_htf_priority');
assert.equal(report.rows[0].allCandidates[0].ticketId, 'best-sweep');
assert.match(report.markdown, /OpeningDrive OOS Lagging Collision Drilldown/);

const blocked = buildRawOhlcScannerArtifactOpeningDriveOosLaggingCollisionDrilldownReport({
  comparisonPath: 'comparison.json',
  comparison: { ...comparison, rows: [] },
  samebarReports: ['samebar.json'],
  samebarReportPayloads: [samebarReport],
}, '2026-07-19T00:03:00.000Z');

assert.equal(blocked.status, 'fail');
assert.ok(blocked.blockers.some((blocker) => blocker.includes('no lagging OpeningDrive rows found')));

const parsed = parseRawOhlcScannerArtifactOpeningDriveOosLaggingCollisionDrilldownArgs([
  '--comparison',
  'comparison.json',
  '--samebar-reports',
  'a.json,b.json',
  '--out-dir',
  'reports',
  '--json',
]);
assert.equal(parsed.comparison, 'comparison.json');
assert.deepEqual(parsed.samebarReports, ['a.json', 'b.json']);
assert.equal(parsed.outDir, 'reports');
assert.equal(parsed.json, true);

console.log('raw OHLC OpeningDrive OOS lagging collision drilldown verified.');
