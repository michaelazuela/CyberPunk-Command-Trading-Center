import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDriveRejectedGeometryMinerReport,
  parseRawOhlcScannerArtifactOpeningDriveRejectedGeometryMinerArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-rejected-geometry-miner';
import type {
  RawOhlcScannerArtifactSameBarSeparatorDrilldownReport,
  RawOhlcScannerArtifactSameBarSeparatorRow,
} from './raw-ohlc-scanner-artifact-samebar-separator-drilldown';

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
  direction: 'LONG' | 'SHORT';
  riskPoints: number;
  proofTime?: string;
  outcomeLabel: RawOhlcScannerArtifactSameBarSeparatorRow['outcomeLabel'];
  resolvedOneMesPl: number;
}): RawOhlcScannerArtifactSameBarSeparatorRow {
  const proofTime = args.proofTime || '2026-06-18T10:20:00';
  return {
    ticketId: args.ticketId,
    tradeDate: proofTime.slice(0, 10),
    session: 'morning',
    setupType: 'NoInstalledSetup',
    direction: args.direction,
    outcomeLabel: args.outcomeLabel,
    outcomeStatus: 'resolved',
    resolvedOneMesPl: args.resolvedOneMesPl,
    proofTime,
    entryHitTime: proofTime,
    firstReplayBarTime: `${proofTime.slice(0, 14)}25:00`,
    stopHitTime: args.outcomeLabel === 'stopped_before_t1' ? `${proofTime.slice(0, 14)}25:00` : null,
    t1HitTime: args.outcomeLabel === 't1_and_t2_hit' ? `${proofTime.slice(0, 14)}25:00` : null,
    t2HitTime: args.outcomeLabel === 't1_and_t2_hit' ? `${proofTime.slice(0, 14)}30:00` : null,
    riskPoints: args.riskPoints,
    mfeR: args.outcomeLabel === 't1_and_t2_hit' ? 2 : 0.3,
    maeR: args.outcomeLabel === 'stopped_before_t1' ? 1 : 0.2,
    timeBucket: `${proofTime.slice(11, 13)}:00-${proofTime.slice(11, 13)}:59`,
    separatorTags: args.outcomeLabel === 't1_and_t2_hit' ? ['winner_t1_t2'] : ['stopped_before_t1'],
  };
}

const separatorReport: RawOhlcScannerArtifactSameBarSeparatorDrilldownReport = {
  reportType: 'raw_ohlc_scanner_artifact_samebar_separator_drilldown',
  generatedAt: '2026-07-18T00:00:00.000Z',
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
    sameBarRows: 8,
    winners: 5,
    losses: 2,
    unresolved: 0,
    grossOneMesPl: 120,
    modelsWithPositiveSameBar: 1,
    modelsWithSameBarLosses: 1,
    livePromotionAllowedRows: 0,
  },
  modelSummaries: [],
  timeBuckets: [],
  rows: [
    row({ ticketId: 'candidate-win', direction: 'LONG', riskPoints: 5, outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 40 }),
    row({ ticketId: 'candidate-other', direction: 'LONG', riskPoints: 6, outcomeLabel: 'entry_not_filled' as RawOhlcScannerArtifactSameBarSeparatorRow['outcomeLabel'], resolvedOneMesPl: 0 }),
    row({ ticketId: 'rejected-short-win-1', direction: 'SHORT', riskPoints: 18, proofTime: '2026-06-18T10:35:00', outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 80 }),
    row({ ticketId: 'rejected-short-win-2', direction: 'SHORT', riskPoints: 20, proofTime: '2026-06-19T10:40:00', outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 85 }),
    row({ ticketId: 'rejected-short-win-3', direction: 'SHORT', riskPoints: 22, proofTime: '2026-06-20T10:45:00', outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 90 }),
    row({ ticketId: 'rejected-long-loss', direction: 'LONG', riskPoints: 18, proofTime: '2026-06-20T09:20:00', outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -90 }),
    { ...row({ ticketId: 'ignored-other-model', direction: 'SHORT', riskPoints: 18, outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 80 }), setupType: 'NoInstalledSetup' },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildRawOhlcScannerArtifactOpeningDriveRejectedGeometryMinerReport({
  reportDir: 'reports',
  samebarSeparatorReportPath: 'separator.json',
  samebarSeparatorReport: separatorReport,
  setupType: 'NoInstalledSetup',
  candidateDirection: 'LONG',
  candidateRiskBucket: 'risk_4_to_8',
  minBucketRows: 3,
}, '2026-07-18T00:01:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_openingdrive_rejected_geometry_miner');
assert.equal(report.status, 'pass');
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.sourceRows, 7);
assert.equal(report.summary.candidateRows, 2);
assert.equal(report.summary.rejectedRows, 5);
assert.equal(report.summary.candidateSummary.otherResolved, 1);
assert.equal(report.summary.rejectedWinnerRows, 4);
assert.equal(report.summary.rejectedLossRows, 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);

const cleanShortRiskBucket = report.topRejectedBuckets.find((bucket) => bucket.feature === 'direction_risk' && bucket.value === 'SHORT|risk_gte_16');
assert.ok(cleanShortRiskBucket);
assert.equal(cleanShortRiskBucket.rows, 4);
assert.equal(cleanShortRiskBucket.losses, 0);
assert.match(cleanShortRiskBucket.recommendation, /Clean rejected research lead/);

assert.equal(report.otherResolvedCandidateRows.length, 1);
assert.equal(report.otherResolvedCandidateRows[0].ticketId, 'candidate-other');
assert.equal(report.otherResolvedCandidateRows[0].fineRiskBucket, 'risk_6_to_8');
assert.match(report.markdown, /OpeningDrive Rejected Geometry Miner/);
assert.match(report.recommendations[0], /Research found/);

assert.throws(
  () => parseRawOhlcScannerArtifactOpeningDriveRejectedGeometryMinerArgs(['--out-dir', 'missing-dir']),
  /--samebar-separator-report is required/,
);
assert.throws(
  () => parseRawOhlcScannerArtifactOpeningDriveRejectedGeometryMinerArgs(['--samebar-separator-report', 'x.json', '--min-bucket-rows', '0']),
  /--min-bucket-rows must be a positive number/,
);

console.log('raw OHLC OpeningDrive rejected geometry miner verified.');
