import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactSweepLatestPositiveDrilldownReport,
  parseRawOhlcScannerArtifactSweepLatestPositiveDrilldownArgs,
} from './raw-ohlc-scanner-artifact-sweep-latest-positive-drilldown';
import type { RawOhlcScannerArtifactSameBarSeparatorDrilldownReport } from './raw-ohlc-scanner-artifact-samebar-separator-drilldown';

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
  id: string;
  setupType?: string;
  session: 'morning' | 'lunch';
  direction: 'LONG' | 'SHORT';
  riskPoints: number;
  timeBucket: string;
  outcomeLabel: 't1_and_t2_hit' | 'stopped_before_t1' | 'no_target_or_stop_hit';
  resolvedOneMesPl: number | null;
}) {
  const resolved = args.outcomeLabel !== 'no_target_or_stop_hit';
  return {
    ticketId: args.id,
    tradeDate: '2026-07-16',
    session: args.session,
    setupType: args.setupType || 'SweepMssFvgRetrace',
    direction: args.direction,
    outcomeLabel: args.outcomeLabel,
    outcomeStatus: resolved ? 'resolved' as const : 'unresolved' as const,
    resolvedOneMesPl: args.resolvedOneMesPl,
    proofTime: '2026-07-16T13:15:00',
    entryHitTime: '2026-07-16T13:15:00',
    firstReplayBarTime: '2026-07-16T13:20:00',
    stopHitTime: args.outcomeLabel === 'stopped_before_t1' ? '2026-07-16T13:20:00' : null,
    t1HitTime: args.outcomeLabel === 't1_and_t2_hit' ? '2026-07-16T13:20:00' : null,
    t2HitTime: args.outcomeLabel === 't1_and_t2_hit' ? '2026-07-16T13:25:00' : null,
    riskPoints: args.riskPoints,
    mfeR: args.outcomeLabel === 't1_and_t2_hit' ? 3 : 0.25,
    maeR: args.outcomeLabel === 'stopped_before_t1' ? 1.1 : 0.25,
    timeBucket: args.timeBucket,
    separatorTags: [],
  };
}

function report(rows: ReturnType<typeof row>[]): RawOhlcScannerArtifactSameBarSeparatorDrilldownReport {
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
      unresolved: rows.filter((item) => item.outcomeStatus !== 'resolved').length,
      grossOneMesPl: rows.reduce((total, item) => total + (item.resolvedOneMesPl || 0), 0),
      modelsWithPositiveSameBar: 1,
      modelsWithSameBarLosses: rows.some((item) => item.outcomeLabel === 'stopped_before_t1') ? 1 : 0,
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

const zeroLossTrain = Array.from({ length: 5 }, (_, index) => row({
  id: `zero-train-${index}`,
  session: 'lunch',
  direction: 'LONG',
  riskPoints: 10,
  timeBucket: '12:00-12:59',
  outcomeLabel: 't1_and_t2_hit',
  resolvedOneMesPl: 100,
}));

const lossBearingTrain = [
  ...Array.from({ length: 8 }, (_, index) => row({
    id: `loss-bearing-train-win-${index}`,
    session: 'lunch',
    direction: 'SHORT',
    riskPoints: 18,
    timeBucket: '14:00-14:59',
    outcomeLabel: 't1_and_t2_hit',
    resolvedOneMesPl: 120,
  })),
  ...Array.from({ length: 2 }, (_, index) => row({
    id: `loss-bearing-train-loss-${index}`,
    session: 'lunch',
    direction: 'SHORT',
    riskPoints: 18,
    timeBucket: '14:00-14:59',
    outcomeLabel: 'stopped_before_t1',
    resolvedOneMesPl: -90,
  })),
];

const trainReport = report([
  ...zeroLossTrain,
  ...lossBearingTrain,
  row({
    id: 'ignored-htf',
    setupType: 'HtfDisplacementMssContinuation',
    session: 'lunch',
    direction: 'SHORT',
    riskPoints: 18,
    timeBucket: '14:00-14:59',
    outcomeLabel: 't1_and_t2_hit',
    resolvedOneMesPl: 500,
  }),
]);

const testReport = report([
  ...zeroLossTrain.map((item, index) => ({ ...item, ticketId: `zero-test-${index}` })),
  ...Array.from({ length: 6 }, (_, index) => row({
    id: `loss-bearing-test-win-${index}`,
    session: 'lunch',
    direction: 'SHORT',
    riskPoints: 18,
    timeBucket: '14:00-14:59',
    outcomeLabel: 't1_and_t2_hit',
    resolvedOneMesPl: 110,
  })),
]);

const drilldown = buildRawOhlcScannerArtifactSweepLatestPositiveDrilldownReport({
  reportDir: 'reports',
  trainSamebarReportPaths: ['train.json'],
  trainSamebarReports: [trainReport],
  testSamebarReportPaths: ['test.json'],
  testSamebarReports: [testReport],
  minRowsPerPeriod: 5,
}, '2026-07-19T00:07:00.000Z');

assert.equal(drilldown.reportType, 'raw_ohlc_scanner_artifact_sweep_latest_positive_drilldown');
assert.equal(drilldown.status, 'pass');
assert.equal(drilldown.authority.readOnly, true);
assert.equal(drilldown.authority.runsSetupScanner, false);
assert.equal(drilldown.authority.changesTradingLogic, false);
assert.equal(drilldown.authority.changesCanExecute, false);
assert.equal(drilldown.assumptions.htfMssExcluded, true);
assert.equal(drilldown.summary.livePromotionAllowedRows, 0);
assert.equal(drilldown.summary.trainRows, 15);
assert.equal(drilldown.summary.testRows, 11);
assert.equal(drilldown.zeroLossTransferSegments.some((segment) => segment.key === 'LONG'), true);
assert.equal(drilldown.latestPositiveTrainLossBearingSegments.some((segment) => segment.key === 'lunch|SHORT|14:00-14:59|risk_16_to_24'), true);
assert.equal(drilldown.zeroLossTransferSegments.every((segment) => segment.train.losses === 0 && segment.test.losses === 0), true);
assert.equal(drilldown.latestPositiveTrainLossBearingSegments.every((segment) => segment.test.losses === 0), true);
assert.match(drilldown.markdown, /Sweep Latest-Positive Drilldown/);

const parsed = parseRawOhlcScannerArtifactSweepLatestPositiveDrilldownArgs([
  '--train-samebar-reports',
  'train-a.json,train-b.json',
  '--test-samebar-reports',
  'latest.json',
  '--min-rows-per-period',
  '7',
  '--json',
]);
assert.deepEqual(parsed.trainSamebarReports, ['train-a.json', 'train-b.json']);
assert.deepEqual(parsed.testSamebarReports, ['latest.json']);
assert.equal(parsed.minRowsPerPeriod, 7);
assert.equal(parsed.json, true);

console.log('raw OHLC Sweep latest-positive drilldown verified.');
