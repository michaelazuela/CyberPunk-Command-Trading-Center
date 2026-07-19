import assert from 'node:assert/strict';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityLossProfileReport,
  parseRawOhlcScannerArtifactOpeningDrivePriorityLossProfileArgs,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-loss-profile';
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
  tags: string[];
}): MinerRow {
  return {
    sourceSelectionReport: 'source.json',
    replayPackagePath: 'package.json',
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
    priorityBetter: args.priorityOneMesPl > -64.37,
    priorityEntry: 7610.75,
    priorityStop: 7601,
    priorityRiskPoints: 9.75,
    proofBarTime: args.proofTime,
    proofBarRangeR: 1,
    proofBarBodyDirection: 'bullish',
    proofBarCloseThroughEntry: true,
    firstReplayBarTime: '2026-07-15T10:25:00',
    firstReplayAdverseR: args.priorityOneMesPl < 0 ? 0.77 : 0,
    firstReplayFavorableR: 1,
    firstReplayCloseThroughEntry: args.priorityOneMesPl >= 0,
    firstReplayCloseAdverse: args.priorityOneMesPl < 0,
    immediateFeatureTags: args.tags,
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

const loss = row({
  ticketId: 'loss-ticket',
  proofTime: '2026-07-15T10:20:00',
  priorityOneMesPl: -48.75,
  tags: [
    'proof_bar_bullish',
    'proof_bar_closed_through_entry',
    'proof_bar_range_ge_1r',
    'first_replay_failed_close_through_entry',
    'first_replay_close_adverse',
  ],
});
const duplicateLoss = { ...loss };
const winnerWithSameInitialTags = row({
  ticketId: 'winner-ticket',
  proofTime: '2026-07-15T10:20:00',
  priorityOneMesPl: 73.75,
  tags: [
    'proof_bar_bullish',
    'proof_bar_closed_through_entry',
    'proof_bar_range_ge_1r',
    'first_replay_closed_through_entry',
  ],
});

const report = buildRawOhlcScannerArtifactOpeningDrivePriorityLossProfileReport({
  minerReports: ['miner.json'],
  loadedReports: [minerReport([loss, duplicateLoss, winnerWithSameInitialTags])],
}, '2026-07-19T05:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.sourceRows, 3);
assert.equal(report.summary.dedupedRows, 2);
assert.equal(report.summary.duplicateRowsRemoved, 1);
assert.equal(report.summary.priorityLossRows, 1);
assert.equal(report.summary.priorityNonLossRows, 1);
assert.equal(report.summary.initialRankCandidateRows, 0);
assert.equal(report.summary.postEntryResearchOnlyRows, 2);
assert.equal(report.summary.liveInitialRankFeatureRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.broadeningAllowedNow, false);
assert.equal(report.summary.recommendation, 'do_not_install_initial_rank_filter');

const proofRange = report.featureRows.find((row) => row.featureTag === 'proof_bar_range_ge_1r' && row.featurePhase === 'initial_rank');
assert.equal(proofRange?.priorityLossRows, 1);
assert.equal(proofRange?.falseRejectPriorityNonLossRows, 1);
assert.equal(proofRange?.conclusion, 'reject_initial_rank');

const postEntry = report.featureRows.find((row) => row.featureTag === 'first_replay_close_adverse');
assert.equal(postEntry?.featurePhase, 'post_entry_research_only');
assert.equal(postEntry?.priorityLossRows, 1);
assert.equal(postEntry?.priorityNonLossRows, 0);
assert.equal(postEntry?.conclusion, 'research_review_note_only');
assert.equal(postEntry?.liveInitialRankInstallableNow, false);
assert.equal(report.authority.changesTradingLogic, false);

const parsed = parseRawOhlcScannerArtifactOpeningDrivePriorityLossProfileArgs([
  '--miner-reports',
  'a.json,b.json',
  '--out-dir',
  'out',
  '--json',
]);
assert.deepEqual(parsed.minerReports.map((item) => item.endsWith('a.json') || item.endsWith('b.json')), [true, true]);
assert.equal(parsed.outDir.endsWith('out'), true);
assert.equal(parsed.json, true);

console.log('raw-ohlc-scanner-artifact-openingdrive-priority-loss-profile.test passed');
