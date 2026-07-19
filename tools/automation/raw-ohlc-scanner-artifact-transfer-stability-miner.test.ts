import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactTransferStabilityMinerReport,
  parseRawOhlcScannerArtifactTransferStabilityMinerArgs,
} from './raw-ohlc-scanner-artifact-transfer-stability-miner';
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
  setupType: string;
  session: 'morning' | 'lunch';
  direction: 'LONG' | 'SHORT';
  riskPoints: number;
  outcomeLabel: 't1_and_t2_hit' | 'stopped_before_t1' | 'no_target_or_stop_hit';
  resolvedOneMesPl: number | null;
}) {
  const resolved = args.outcomeLabel !== 'no_target_or_stop_hit';
  return {
    ticketId: args.id,
    tradeDate: '2026-07-15',
    session: args.session,
    setupType: args.setupType,
    direction: args.direction,
    outcomeLabel: args.outcomeLabel,
    outcomeStatus: resolved ? 'resolved' as const : 'unresolved' as const,
    resolvedOneMesPl: args.resolvedOneMesPl,
    proofTime: '2026-07-15T10:15:00',
    entryHitTime: '2026-07-15T10:15:00',
    firstReplayBarTime: '2026-07-15T10:20:00',
    stopHitTime: args.outcomeLabel === 'stopped_before_t1' ? '2026-07-15T10:20:00' : null,
    t1HitTime: args.outcomeLabel === 't1_and_t2_hit' ? '2026-07-15T10:20:00' : null,
    t2HitTime: args.outcomeLabel === 't1_and_t2_hit' ? '2026-07-15T10:25:00' : null,
    riskPoints: args.riskPoints,
    mfeR: args.outcomeLabel === 't1_and_t2_hit' ? 3 : 0.25,
    maeR: args.outcomeLabel === 'stopped_before_t1' ? 1.1 : 0.25,
    timeBucket: '10:00-10:59',
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

const stableWinners = Array.from({ length: 6 }, (_, index) => row({
  id: `stable-win-${index}`,
  setupType: 'AfterLunchDriveFvgContinuation',
  session: 'lunch',
  direction: 'LONG',
  riskPoints: 3,
  outcomeLabel: 't1_and_t2_hit',
  resolvedOneMesPl: 45,
}));

const trainOnlyWinners = Array.from({ length: 6 }, (_, index) => row({
  id: `train-only-win-${index}`,
  setupType: 'OpeningDriveFvgContinuation',
  session: 'morning',
  direction: 'SHORT',
  riskPoints: 6,
  outcomeLabel: 't1_and_t2_hit',
  resolvedOneMesPl: 60,
}));

const trainReport = report([...stableWinners, ...trainOnlyWinners]);
const testReport = report([
  ...stableWinners.map((item, index) => ({ ...item, ticketId: `stable-test-win-${index}` })),
  ...Array.from({ length: 6 }, (_, index) => row({
    id: `train-only-test-loss-${index}`,
    setupType: 'OpeningDriveFvgContinuation',
    session: 'morning',
    direction: 'SHORT',
    riskPoints: 6,
    outcomeLabel: 'stopped_before_t1',
    resolvedOneMesPl: -30,
  })),
]);

const mined = buildRawOhlcScannerArtifactTransferStabilityMinerReport({
  reportDir: 'reports',
  trainSamebarReportPaths: ['train.json'],
  trainSamebarReports: [trainReport],
  testSamebarReportPaths: ['test.json'],
  testSamebarReports: [testReport],
  minRowsPerPeriod: 5,
}, '2026-07-19T00:04:00.000Z');

assert.equal(mined.reportType, 'raw_ohlc_scanner_artifact_transfer_stability_miner');
assert.equal(mined.status, 'pass');
assert.equal(mined.authority.readOnly, true);
assert.equal(mined.authority.writesSupabase, false);
assert.equal(mined.authority.readsLiveBridge, false);
assert.equal(mined.authority.changesTradingLogic, false);
assert.equal(mined.authority.changesCanExecute, false);
assert.equal(mined.summary.trainRows, 12);
assert.equal(mined.summary.testRows, 12);
assert.equal(mined.summary.livePromotionAllowedRows, 0);
assert.equal(mined.summary.stablePositiveBuckets > 0, true);
assert.equal(mined.stablePositiveBuckets.some((bucket) => bucket.key.includes('AfterLunchDriveFvgContinuation')), true);
assert.equal(mined.unstableBuckets.some((bucket) => bucket.key.includes('OpeningDriveFvgContinuation') && bucket.verdict === 'train_positive_test_failed'), true);
assert.match(mined.markdown, /Raw-OHLC Transfer Stability Miner/);

const parsed = parseRawOhlcScannerArtifactTransferStabilityMinerArgs([
  '--train-samebar-reports',
  'june.json',
  '--test-samebar-reports',
  'july-a.json,july-b.json',
  '--min-rows-per-period',
  '7',
  '--json',
]);
assert.deepEqual(parsed.trainSamebarReports, ['june.json']);
assert.deepEqual(parsed.testSamebarReports, ['july-a.json', 'july-b.json']);
assert.equal(parsed.minRowsPerPeriod, 7);
assert.equal(parsed.json, true);

console.log('raw OHLC transfer stability miner verified.');
