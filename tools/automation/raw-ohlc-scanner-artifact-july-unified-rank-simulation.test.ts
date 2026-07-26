import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactJulyUnifiedRankSimulationReport,
  parseRawOhlcScannerArtifactJulyUnifiedRankSimulationArgs,
} from './raw-ohlc-scanner-artifact-july-unified-rank-simulation';
import type { RawOhlcScannerArtifactJulyUnifiedSeparatorReport } from './raw-ohlc-scanner-artifact-july-unified-separator';
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
  direction: 'LONG' | 'SHORT';
  riskPoints: number;
  outcomeLabel: 't1_and_t2_hit' | 'stopped_before_t1';
  resolvedOneMesPl: number;
}) {
  return {
    ticketId: args.id,
    tradeDate: '2026-07-15',
    session: 'lunch',
    setupType: args.setupType,
    direction: args.direction,
    outcomeLabel: args.outcomeLabel,
    outcomeStatus: 'resolved' as const,
    resolvedOneMesPl: args.resolvedOneMesPl,
    proofTime: '2026-07-15T13:15:00',
    entryHitTime: '2026-07-15T13:15:00',
    firstReplayBarTime: '2026-07-15T13:20:00',
    stopHitTime: args.outcomeLabel === 'stopped_before_t1' ? '2026-07-15T13:20:00' : null,
    t1HitTime: args.outcomeLabel === 't1_and_t2_hit' ? '2026-07-15T13:20:00' : null,
    t2HitTime: args.outcomeLabel === 't1_and_t2_hit' ? '2026-07-15T13:25:00' : null,
    riskPoints: args.riskPoints,
    mfeR: args.outcomeLabel === 't1_and_t2_hit' ? 3 : 0.2,
    maeR: args.outcomeLabel === 'stopped_before_t1' ? 1.2 : 0.2,
    timeBucket: '13:00-13:59',
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
    sameBarRows: 2,
    winners: 1,
    losses: 1,
    unresolved: 0,
    grossOneMesPl: 20,
    modelsWithPositiveSameBar: 1,
    modelsWithSameBarLosses: 1,
    livePromotionAllowedRows: 0,
  },
  modelSummaries: [],
  timeBuckets: [],
  rows: [
    row({ id: 'good-sweep', setupType: 'NoInstalledSetup', direction: 'LONG', riskPoints: 6, outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 90 }),
    row({ id: 'bad-open', setupType: 'NoInstalledSetup', direction: 'SHORT', riskPoints: 18, outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -70 }),
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const separatorReport: RawOhlcScannerArtifactJulyUnifiedSeparatorReport = {
  reportType: 'raw_ohlc_scanner_artifact_july_unified_separator',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: 'reports', samebarReports: ['samebar.json'] },
  assumptions: {
    consumesExistingSameBarReportsOnly: true,
    separatorFieldsArePreEntryOrModelMetadata: true,
    outcomeFieldsAreEvaluationOnly: true,
    noLiveFilterInstalled: true,
    livePromotionAllowed: false,
  },
  summary: {
    sourceReports: 1,
    sourceRows: 2,
    winners: 1,
    losses: 1,
    otherResolved: 0,
    unresolved: 0,
    oneMesPl: 20,
    positiveResearchBuckets: 1,
    cautionResearchBuckets: 1,
    livePromotionAllowedRows: 0,
    recommendation: 'build_research_rank_simulation',
  },
  buckets: [],
  topPositiveBuckets: [
    {
      kind: 'session_direction_setup',
      key: 'lunch|LONG|NoInstalledSetup',
      rows: 10,
      winners: 9,
      losses: 0,
      otherResolved: 1,
      unresolved: 0,
      oneMesPl: 450,
      winRateResolved: 0.9,
      avgRiskPoints: 6,
      avgMfeR: 3,
      avgMaeR: 0.2,
      score: 80,
      recommendation: 'positive_research_selector',
    },
  ],
  topCautionBuckets: [
    {
      kind: 'risk_setup',
      key: 'risk_16_to_24|NoInstalledSetup',
      rows: 6,
      winners: 1,
      losses: 5,
      otherResolved: 0,
      unresolved: 0,
      oneMesPl: -240,
      winRateResolved: 0.17,
      avgRiskPoints: 18,
      avgMfeR: 1,
      avgMaeR: 2,
      score: -30,
      recommendation: 'caution_research_filter',
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildRawOhlcScannerArtifactJulyUnifiedRankSimulationReport({
  reportDir: 'reports',
  separatorReportPath: 'separator.json',
  separatorReport,
  samebarReportPaths: ['samebar.json'],
  samebarReports: [samebarReport],
}, '2026-07-19T00:01:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_july_unified_rank_simulation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.sourceRows, 2);
assert.equal(report.summary.proofEvents, 1);
assert.equal(report.summary.selectedRows, 1);
assert.equal(report.summary.selectedSummary.winners, 1);
assert.equal(report.summary.selectedSummary.losses, 0);
assert.equal(report.summary.rejectedSummary.losses, 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.selectedRows[0].ticketId, 'good-sweep');
assert.equal(report.summary.recommendation, 'revise_rank_simulation');
assert.match(report.markdown, /July Raw-OHLC Unified Rank Simulation/);

const strictReport = buildRawOhlcScannerArtifactJulyUnifiedRankSimulationReport({
  reportDir: 'reports',
  separatorReportPath: 'separator.json',
  separatorReport,
  samebarReportPaths: ['samebar.json'],
  samebarReports: [samebarReport],
  mode: 'strict_specific_zero_loss',
}, '2026-07-19T00:02:00.000Z');

assert.equal(strictReport.source.mode, 'strict_specific_zero_loss');
assert.equal(strictReport.summary.selectedRows, 1);
assert.equal(strictReport.summary.selectedSummary.losses, 0);
assert.equal(strictReport.selectedRows[0].ticketId, 'good-sweep');

const riskCappedReport = buildRawOhlcScannerArtifactJulyUnifiedRankSimulationReport({
  reportDir: 'reports',
  separatorReportPath: 'separator.json',
  separatorReport,
  samebarReportPaths: ['samebar.json'],
  samebarReports: [samebarReport],
  mode: 'strict_specific_zero_loss',
  maxRiskPoints: 5,
}, '2026-07-19T00:03:00.000Z');

assert.equal(riskCappedReport.source.maxRiskPoints, 5);
assert.equal(riskCappedReport.summary.selectedRows, 0);

const parsed = parseRawOhlcScannerArtifactJulyUnifiedRankSimulationArgs([
  '--separator-report',
  'separator.json',
  '--samebar-reports',
  'a.json,b.json',
  '--mode',
  'strict_specific_zero_loss',
  '--max-risk-points',
  '16',
  '--json',
]);
assert.equal(parsed.separatorReport, 'separator.json');
assert.deepEqual(parsed.samebarReports, ['a.json', 'b.json']);
assert.equal(parsed.mode, 'strict_specific_zero_loss');
assert.equal(parsed.maxRiskPoints, 16);
assert.equal(parsed.json, true);

console.log('raw OHLC July unified rank simulation verified.');
