import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactTransferStableSelectorSimulationReport,
  parseRawOhlcScannerArtifactTransferStableSelectorSimulationArgs,
} from './raw-ohlc-scanner-artifact-transfer-stable-selector-simulation';
import type { RawOhlcScannerArtifactSameBarSeparatorDrilldownReport } from './raw-ohlc-scanner-artifact-samebar-separator-drilldown';
import type { RawOhlcScannerArtifactTransferStabilityMinerReport } from './raw-ohlc-scanner-artifact-transfer-stability-miner';

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
  riskPoints: number;
  proofTime?: string;
  outcomeLabel: 't1_and_t2_hit' | 'stopped_before_t1' | 'no_target_or_stop_hit';
  resolvedOneMesPl: number | null;
}) {
  const resolved = args.outcomeLabel !== 'no_target_or_stop_hit';
  return {
    ticketId: args.id,
    tradeDate: '2026-07-15',
    session: 'lunch',
    setupType: args.setupType,
    direction: 'LONG',
    outcomeLabel: args.outcomeLabel,
    outcomeStatus: resolved ? 'resolved' as const : 'unresolved' as const,
    resolvedOneMesPl: args.resolvedOneMesPl,
    proofTime: args.proofTime || '2026-07-15T12:15:00',
    entryHitTime: args.proofTime || '2026-07-15T12:15:00',
    firstReplayBarTime: '2026-07-15T12:20:00',
    stopHitTime: args.outcomeLabel === 'stopped_before_t1' ? '2026-07-15T12:20:00' : null,
    t1HitTime: args.outcomeLabel === 't1_and_t2_hit' ? '2026-07-15T12:20:00' : null,
    t2HitTime: args.outcomeLabel === 't1_and_t2_hit' ? '2026-07-15T12:25:00' : null,
    riskPoints: args.riskPoints,
    mfeR: args.outcomeLabel === 't1_and_t2_hit' ? 3 : 0.25,
    maeR: args.outcomeLabel === 'stopped_before_t1' ? 1.1 : 0.25,
    timeBucket: '12:00-12:59',
    separatorTags: [],
  };
}

const samebarReport: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport = {
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
    sameBarRows: 3,
    winners: 2,
    losses: 1,
    unresolved: 0,
    grossOneMesPl: 120,
    modelsWithPositiveSameBar: 1,
    modelsWithSameBarLosses: 1,
    livePromotionAllowedRows: 0,
  },
  modelSummaries: [],
  timeBuckets: [],
  rows: [
    row({ id: 'selected-low-risk', setupType: 'AfterLunchDriveFvgContinuation', riskPoints: 10, outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 75 }),
    row({ id: 'same-event-higher-risk', setupType: 'AfterLunchDriveFvgContinuation', riskPoints: 14, outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 105 }),
    row({ id: 'not-matching-loss', setupType: 'OpeningDriveFvgContinuation', riskPoints: 10, proofTime: '2026-07-15T13:15:00', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -50 }),
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const stabilityReport: RawOhlcScannerArtifactTransferStabilityMinerReport = {
  reportType: 'raw_ohlc_scanner_artifact_transfer_stability_miner',
  generatedAt: '2026-07-19T00:04:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: 'reports', trainSamebarReports: ['train.json'], testSamebarReports: ['test.json'], minRowsPerPeriod: 5 },
  assumptions: {
    consumesExistingSameBarReportsOnly: true,
    comparesPreEntryOrModelMetadataBucketsOnly: true,
    outcomeFieldsAreEvaluationOnly: true,
    noLiveRankInstalled: true,
    livePromotionAllowed: false,
  },
  summary: {
    trainRows: 10,
    testRows: 10,
    sharedBuckets: 1,
    stablePositiveBuckets: 1,
    zeroLossStablePositiveBuckets: 1,
    stableCautionBuckets: 0,
    trainPositiveTestFailedBuckets: 0,
    testPositiveTrainFailedBuckets: 0,
    livePromotionAllowedRows: 0,
    recommendation: 'validate_stable_buckets_on_fresh_replay',
  },
  stablePositiveBuckets: [],
  zeroLossStablePositiveBuckets: [{
    kind: 'setup_session_risk_time',
    key: 'AfterLunchDriveFvgContinuation|lunch|risk_8_to_16|12:00-12:59',
    train: { rows: 5, winners: 5, losses: 0, otherResolved: 0, unresolved: 0, oneMesPl: 500, winRateResolved: 1, avgRiskPoints: 10, avgMfeR: 3, avgMaeR: 0.2 },
    test: { rows: 5, winners: 5, losses: 0, otherResolved: 0, unresolved: 0, oneMesPl: 500, winRateResolved: 1, avgRiskPoints: 10, avgMfeR: 3, avgMaeR: 0.2 },
    verdict: 'stable_positive_research',
    reason: 'positive in both train and test periods using only bucket metadata',
    score: 1200,
  }],
  stableCautionBuckets: [],
  unstableBuckets: [],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildRawOhlcScannerArtifactTransferStableSelectorSimulationReport({
  reportDir: 'reports',
  transferStabilityReportPath: 'stability.json',
  transferStabilityReport: stabilityReport,
  samebarReportPaths: ['samebar.json'],
  samebarReports: [samebarReport],
}, '2026-07-19T00:05:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_transfer_stable_selector_simulation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.sourceRows, 3);
assert.equal(report.summary.proofEvents, 2);
assert.equal(report.summary.selectedRows, 1);
assert.equal(report.summary.selectedSummary.winners, 1);
assert.equal(report.summary.selectedSummary.losses, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.selectedRows[0].ticketId, 'selected-low-risk');
assert.match(report.markdown, /Transfer-Stable Selector Simulation/);

const noMatchReport = buildRawOhlcScannerArtifactTransferStableSelectorSimulationReport({
  reportDir: 'reports',
  transferStabilityReportPath: 'stability.json',
  transferStabilityReport: {
    ...stabilityReport,
    zeroLossStablePositiveBuckets: [{
      ...stabilityReport.zeroLossStablePositiveBuckets[0],
      key: 'SweepMssFvgRetrace|lunch|risk_4_to_8|12:00-12:59',
    }],
  },
  samebarReportPaths: ['samebar.json'],
  samebarReports: [samebarReport],
}, '2026-07-19T00:05:30.000Z');

assert.equal(noMatchReport.status, 'pass');
assert.equal(noMatchReport.summary.selectedRows, 0);
assert.equal(noMatchReport.summary.recommendation, 'no_matching_transfer_stable_bucket');
assert.match(noMatchReport.recommendations[0], /no-promotion/);

const parsed = parseRawOhlcScannerArtifactTransferStableSelectorSimulationArgs([
  '--transfer-stability-report',
  'stability.json',
  '--samebar-reports',
  'a.json,b.json',
  '--json',
]);
assert.equal(parsed.transferStabilityReport, 'stability.json');
assert.deepEqual(parsed.samebarReports, ['a.json', 'b.json']);
assert.equal(parsed.json, true);

console.log('raw OHLC transfer-stable selector simulation verified.');
