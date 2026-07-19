import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityStructuralContextMinerReport,
  parseRawOhlcScannerArtifactOpeningDrivePriorityStructuralContextMinerArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-structural-context-miner';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-no-lookahead-feature-miner';

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

type MinerRow = RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport['rows'][number];

function row(args: {
  ticketId: string;
  proofTime: string;
  priorityOneMesPl: number;
}): MinerRow {
  return {
    sourceSelectionReport: 'source.json',
    replayPackagePath: null,
    tradeDate: '2026-07-15',
    session: 'morning',
    proofTime: args.proofTime,
    direction: 'LONG',
    prioritySetupType: 'SweepMssFvgRetrace',
    openingDriveTicketId: `od-${args.ticketId}`,
    priorityTicketId: args.ticketId,
    openingDriveOneMesPl: -64.37,
    priorityOneMesPl: args.priorityOneMesPl,
    installedDeltaOneMesPl: 15.62,
    priorityUnderperformed: false,
    priorityBetter: true,
    priorityEntry: 7610.75,
    priorityStop: 7601,
    priorityRiskPoints: 9.75,
    proofBarTime: args.proofTime,
    proofBarRangeR: 1,
    proofBarBodyDirection: 'bullish',
    proofBarCloseThroughEntry: true,
    firstReplayBarTime: null,
    firstReplayAdverseR: null,
    firstReplayFavorableR: null,
    firstReplayCloseThroughEntry: null,
    firstReplayCloseAdverse: null,
    immediateFeatureTags: ['proof_bar_bullish'],
    blockers: [],
  };
}

function minerReport(rows: MinerRow[]): RawOhlcScannerArtifactOpeningDrivePriorityNoLookaheadFeatureMinerReport {
  return {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_no_lookahead_feature_miner',
    generatedAt: '2026-07-19T00:00:00.000Z',
    status: 'pass',
    authority,
    source: { sourceSelectionReports: ['source.json'] },
    assumptions: {
      consumesSavedSourceSelectionReportsOnly: true,
      consumesSavedSameBarReportsOnly: true,
      consumesSavedReplayPackageAndTapeOnly: true,
      usesCompletedFiveMinuteBarsOnly: true,
      noFutureOutcomeLabelsUsedForFeatureTags: true,
      firstReplayBarFeaturesArePostEntryResearchOnly: true,
      noLiveScoringUsed: true,
      noSetupScannerRun: true,
      livePromotionAllowed: false,
    },
    summary: {
      eventRows: rows.length,
      rowsWithTapeFeatures: rows.length,
      priorityUnderperformanceRows: 0,
      priorityBetterRows: 1,
      candidateFeatureRows: 0,
      liveInitialRankFeatureRows: 0,
      livePromotionAllowedRows: 0,
      broadeningAllowedNow: false,
      recommendation: 'continue_observation',
    },
    featureRows: [],
    rows,
    blockers: [],
    recommendations: [],
    markdown: '',
  };
}

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityStructuralContextMinerReport({
  minerReports: ['miner.json'],
  loadedReports: [minerReport([
    row({ ticketId: 'loss-a', proofTime: '2026-07-15T10:30:00', priorityOneMesPl: -48.75 }),
    row({ ticketId: 'loss-b', proofTime: '2026-07-15T10:35:00', priorityOneMesPl: -48.75 }),
    row({ ticketId: 'winner', proofTime: '2026-07-15T10:15:00', priorityOneMesPl: 73.75 }),
  ])],
}, '2026-07-19T05:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.dedupedRows, 3);
assert.equal(report.summary.priorityLossRows, 2);
assert.equal(report.summary.priorityNonLossRows, 1);
assert.equal(report.summary.rowsWithStructuralContext, 0);
assert.equal(report.summary.candidateFeatureRows, 0);
assert.equal(report.summary.liveInitialRankFeatureRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.broadeningAllowedNow, false);
assert.equal(report.summary.recommendation, 'do_not_install_structural_filter');
assert.equal(report.rows.every((item) => item.blockers.includes('missing source tape path')), true);
assert.equal(report.authority.changesTradingLogic, false);

const parsed = parseRawOhlcScannerArtifactOpeningDrivePriorityStructuralContextMinerArgs([
  '--miner-reports',
  'a.json,b.json',
  '--out-dir',
  'out',
  '--json',
]);
assert.deepEqual(parsed.minerReports.map((item) => item.endsWith('a.json') || item.endsWith('b.json')), [true, true]);
assert.equal(parsed.outDir.endsWith('out'), true);
assert.equal(parsed.json, true);

console.log('raw-ohlc-scanner-artifact-openingdrive-priority-structural-context-miner.test passed');
