import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactJulyUnifiedSeparatorReport,
  parseRawOhlcScannerArtifactJulyUnifiedSeparatorArgs,
} from './raw-ohlc-scanner-artifact-july-unified-separator';
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
    sameBarRows: 11,
    winners: 6,
    losses: 4,
    unresolved: 1,
    grossOneMesPl: 210,
    modelsWithPositiveSameBar: 1,
    modelsWithSameBarLosses: 1,
    livePromotionAllowedRows: 0,
  },
  modelSummaries: [],
  timeBuckets: [],
  rows: [
    row({ id: 'sweep-win-1', setupType: 'SweepMssFvgRetrace', session: 'lunch', direction: 'LONG', riskPoints: 6, outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 90 }),
    row({ id: 'sweep-win-2', setupType: 'SweepMssFvgRetrace', session: 'lunch', direction: 'LONG', riskPoints: 7, outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 90 }),
    row({ id: 'sweep-win-3', setupType: 'SweepMssFvgRetrace', session: 'lunch', direction: 'LONG', riskPoints: 8, outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 90 }),
    row({ id: 'sweep-win-4', setupType: 'SweepMssFvgRetrace', session: 'lunch', direction: 'LONG', riskPoints: 7, outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 90 }),
    row({ id: 'sweep-win-5', setupType: 'SweepMssFvgRetrace', session: 'lunch', direction: 'LONG', riskPoints: 8, outcomeLabel: 't1_and_t2_hit', resolvedOneMesPl: 90 }),
    row({ id: 'sweep-loss-1', setupType: 'SweepMssFvgRetrace', session: 'lunch', direction: 'LONG', riskPoints: 7, outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -35 }),
    row({ id: 'open-loss-1', setupType: 'OpeningDriveFvgContinuation', session: 'morning', direction: 'SHORT', riskPoints: 14, outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -70 }),
    row({ id: 'open-loss-2', setupType: 'OpeningDriveFvgContinuation', session: 'morning', direction: 'SHORT', riskPoints: 14, outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -70 }),
    row({ id: 'open-loss-3', setupType: 'OpeningDriveFvgContinuation', session: 'morning', direction: 'SHORT', riskPoints: 14, outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -70 }),
    row({ id: 'open-loss-4', setupType: 'OpeningDriveFvgContinuation', session: 'morning', direction: 'SHORT', riskPoints: 14, outcomeLabel: 'stopped_before_t1', resolvedOneMesPl: -70 }),
    row({ id: 'open-open-1', setupType: 'OpeningDriveFvgContinuation', session: 'morning', direction: 'SHORT', riskPoints: 14, outcomeLabel: 'no_target_or_stop_hit', resolvedOneMesPl: null }),
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildRawOhlcScannerArtifactJulyUnifiedSeparatorReport({
  reportDir: 'reports',
  samebarReportPaths: ['samebar.json'],
  samebarReports: [samebarReport],
}, '2026-07-19T00:01:00.000Z');

assert.equal(report.reportType, 'raw_ohlc_scanner_artifact_july_unified_separator');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.sourceRows, 11);
assert.equal(report.summary.positiveResearchBuckets > 0, true);
assert.equal(report.summary.cautionResearchBuckets > 0, true);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'build_research_rank_simulation');
assert.equal(report.topPositiveBuckets[0].recommendation, 'positive_research_selector');
assert.match(report.topPositiveBuckets[0].key, /SweepMssFvgRetrace/);
assert.equal(report.topCautionBuckets[0].recommendation, 'caution_research_filter');
assert.match(report.markdown, /July Raw-OHLC Unified Separator/);

const parsed = parseRawOhlcScannerArtifactJulyUnifiedSeparatorArgs([
  '--samebar-reports',
  'a.json,b.json',
  '--json',
]);
assert.deepEqual(parsed.samebarReports, ['a.json', 'b.json']);
assert.equal(parsed.json, true);

console.log('raw OHLC July unified separator verified.');
