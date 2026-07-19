import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport,
  parseRawOhlcScannerArtifactOpeningDriveFreshReplayPackageArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-fresh-replay-package';

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
  outcomeLabel: 't1_and_t2_hit' | 'stopped_before_t1';
  resolvedOneMesPl: number;
  setupType?: string;
}) {
  return {
    ticketId: args.ticketId,
    tradeDate: args.proofTime.slice(0, 10),
    session: 'morning',
    setupType: args.setupType || 'OpeningDriveFvgContinuation',
    direction: args.direction,
    outcomeLabel: args.outcomeLabel,
    outcomeStatus: 'resolved' as const,
    resolvedOneMesPl: args.resolvedOneMesPl,
    proofTime: args.proofTime,
    entryHitTime: args.proofTime,
    firstReplayBarTime: `${args.proofTime.slice(0, 14)}25:00`,
    stopHitTime: args.outcomeLabel === 'stopped_before_t1' ? `${args.proofTime.slice(0, 14)}25:00` : null,
    t1HitTime: args.outcomeLabel === 't1_and_t2_hit' ? `${args.proofTime.slice(0, 14)}25:00` : null,
    t2HitTime: args.outcomeLabel === 't1_and_t2_hit' ? `${args.proofTime.slice(0, 14)}30:00` : null,
    riskPoints: args.riskPoints,
    mfeR: args.outcomeLabel === 't1_and_t2_hit' ? 2 : 0.2,
    maeR: args.outcomeLabel === 'stopped_before_t1' ? 1 : 0.2,
    timeBucket: `${args.proofTime.slice(11, 13)}:00-${args.proofTime.slice(11, 13)}:59`,
    separatorTags: args.outcomeLabel === 't1_and_t2_hit' ? ['winner_t1_t2'] : ['stopped_before_t1'],
  };
}

function report(rows: ReturnType<typeof row>[]) {
  return {
    reportType: 'raw_ohlc_scanner_artifact_samebar_separator_drilldown',
    generatedAt: '2026-07-19T00:00:00.000Z',
    status: 'pass',
    authority,
    source: { reportDir: 'reports', replayPackageOutcomePath: 'outcome.json' },
    assumptions: {
      usesReadOnlyReplayOutcomeOnly: true,
      analyzesSameBarRowsOnly: true,
      firstReplayBarMeansFirstCompletedBarAfterEntryBar: true,
      livePromotionAllowed: false,
    },
    summary: {
      sameBarRows: rows.length,
      winners: rows.filter((item) => item.outcomeLabel === 't1_and_t2_hit').length,
      losses: rows.filter((item) => item.outcomeLabel === 'stopped_before_t1').length,
      unresolved: 0,
      grossOneMesPl: 0,
      modelsWithPositiveSameBar: 1,
      modelsWithSameBarLosses: 1,
      livePromotionAllowedRows: 0,
    },
    modelSummaries: [],
    timeBuckets: [],
    rows,
    blockers: [],
    recommendations: [],
    markdown: '',
  };
}

const replayReport = buildRawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport({
  reportDir: 'reports',
  setupType: 'OpeningDriveFvgContinuation',
  reports: [
    {
      filePath: 'reports/001-old.json',
      report: report([
        row({ ticketId: 'duplicate-ticket', proofTime: '2026-07-10T09:35:00', direction: 'LONG', riskPoints: 5, outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -25 }),
        row({ ticketId: 'ignored-model', proofTime: '2026-07-10T09:40:00', direction: 'LONG', riskPoints: 5, outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 50, setupType: 'AfterLunchDriveFvgContinuation' }),
      ]) as any,
    },
    {
      filePath: 'reports/002-new.json',
      report: report([
        row({ ticketId: 'duplicate-ticket', proofTime: '2026-07-10T09:35:00', direction: 'LONG', riskPoints: 5, outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 50 }),
        row({ ticketId: 'wide-win', proofTime: '2026-07-10T09:50:00', direction: 'SHORT', riskPoints: 26, outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 260 }),
        row({ ticketId: 'same-event-wide', proofTime: '2026-07-10T09:35:00', direction: 'SHORT', riskPoints: 26, outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 260 }),
        row({ ticketId: 'rejected-loss', proofTime: '2026-07-10T10:15:00', direction: 'SHORT', riskPoints: 12, outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -60 }),
      ]) as any,
    },
  ],
}, '2026-07-19T00:00:00.000Z');

assert.equal(replayReport.reportType, 'raw_ohlc_scanner_artifact_openingdrive_fresh_replay_package');
assert.equal(replayReport.status, 'pass');
assert.equal(replayReport.authority.changesTradingLogic, false);
assert.equal(replayReport.assumptions.savedReportsOnly, true);
assert.equal(replayReport.summary.sourceReports, 2);
assert.equal(replayReport.summary.sourceRows, 5);
assert.equal(replayReport.summary.dedupedRows, 4);
assert.equal(replayReport.summary.proofEvents, 3);
assert.equal(replayReport.summary.selectedRows, 2);
assert.equal(replayReport.summary.rejectedRows, 2);
assert.equal(replayReport.summary.collisionEvents, 1);
assert.equal(replayReport.summary.selectedSummary.losses, 0);
assert.equal(replayReport.summary.sampleSizeReady, false);
assert.equal(replayReport.summary.recommendation, 'mine_openingdrive_separator');
assert.deepEqual(replayReport.selectedRows.map((item) => item.ticketId), ['duplicate-ticket', 'wide-win']);
assert.match(replayReport.markdown, /OpeningDrive Fresh Replay Package/);

const parsed = parseRawOhlcScannerArtifactOpeningDriveFreshReplayPackageArgs([
  '--report-dir',
  'reports',
  '--setup-type',
  'OpeningDriveFvgContinuation',
  '--json',
]);
assert.equal(parsed.reportDir, 'reports');
assert.equal(parsed.json, true);

console.log('raw OHLC OpeningDrive fresh replay package verified.');
