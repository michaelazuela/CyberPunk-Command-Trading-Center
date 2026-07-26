import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewRankOverlayReport,
} from './unified-positive-held-local-preview-rank-overlay';
import type { UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport } from './unified-positive-held-local-preview-ohlc-outcome';
import type { UnifiedPositiveHeldLocalPreviewSourceProofFilterReport } from './unified-positive-held-local-preview-source-proof-filter';

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

const sourceProofFilter: UnifiedPositiveHeldLocalPreviewSourceProofFilterReport = {
  reportType: 'unified_positive_held_local_preview_source_proof_filter',
  generatedAt: '2026-07-17T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    formalReplayPath: 'formal.json',
    ohlcOutcomePath: 'outcome.json',
    heldLocalAdapterPath: 'adapter.json',
    filterDifferencePath: 'filter.json',
  },
  filterCriteria: {
    targetSetupTypes: ['historicalReview', 'NoInstalledSetup'],
    requiresScannerOwnedHeldLocalArtifact: true,
    requiresCompletedFiveMinuteRetestReentryProof: true,
    requiresCanExecuteFalseForResearch: true,
    requiresPublishDiscordFalseForResearch: true,
    requiresShouldPostFalseForResearch: true,
    livePromotionAllowed: false,
  },
  summary: {
    evaluatedRows: 3,
    acceptedRows: 2,
    rejectedRows: 1,
    acceptedReviewedWinners: 2,
    rejectedFormalLosers: 1,
    acceptedFormalLosers: 0,
    rejectedReviewedWinners: 0,
    acceptedOneMesPl: 90,
    rejectedOneMesPl: -20,
    leakThroughLosingRows: 0,
    falseRejectReviewedWinningRows: 0,
    removeModelRecommendations: 0,
    broadenLiveBehaviorRecommendations: 0,
    changeCanExecuteRecommendations: 0,
    livePromotionAllowedRows: 0,
  },
  rows: [
    {
      rowId: 'formal-loser',
      sourceBucket: 'formal_dominant_review_loser',
      setupType: 'historicalReview',
      tradeDate: '2026-06-11',
      session: 'morning',
      direction: 'SHORT',
      source: 'selectedCandidate',
      outcomeOneMesPl: -20,
      scannerOwnedHeldLocalArtifact: false,
      completedFiveMinuteRetestReentryProof: false,
      artifactCanExecuteFalse: false,
      artifactPublishDiscordFalse: false,
      artifactShouldPostFalse: false,
      decision: 'rejected_by_source_proof_filter',
      rejectionReasons: ['missing scanner-owned held-local artifact'],
    },
    {
      rowId: 'winner-small',
      sourceBucket: 'reviewed_held_local_winner',
      setupType: 'historicalReview',
      tradeDate: '2026-06-16',
      session: 'morning',
      direction: 'LONG',
      source: 'local_market_bars_json',
      outcomeOneMesPl: 30,
      scannerOwnedHeldLocalArtifact: true,
      completedFiveMinuteRetestReentryProof: true,
      artifactCanExecuteFalse: true,
      artifactPublishDiscordFalse: true,
      artifactShouldPostFalse: true,
      decision: 'accepted_for_research_validation',
      rejectionReasons: [],
    },
    {
      rowId: 'winner-large',
      sourceBucket: 'reviewed_held_local_winner',
      setupType: 'NoInstalledSetup',
      tradeDate: '2026-06-26',
      session: 'morning',
      direction: 'LONG',
      source: 'local_market_bars_json',
      outcomeOneMesPl: 60,
      scannerOwnedHeldLocalArtifact: true,
      completedFiveMinuteRetestReentryProof: true,
      artifactCanExecuteFalse: true,
      artifactPublishDiscordFalse: true,
      artifactShouldPostFalse: true,
      decision: 'accepted_for_research_validation',
      rejectionReasons: [],
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const ohlcOutcome: UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport = {
  reportType: 'unified_positive_held_local_preview_ohlc_outcome',
  generatedAt: '2026-07-17T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    replayQueuePath: 'queue.json',
    heldLocalAdapterPath: 'adapter.json',
    marketBarsJsonPath: 'bars.json',
    auditDir: 'audit',
  },
  assumptions: {
    oneMesPointValue: 5,
    usesCompletedFiveMinuteBarsOnly: true,
    missingBarsAreNotInvented: true,
    sameBarStopAndTargetUsesConservativeStopFirst: true,
    outcomeIsResearchOnly: true,
  },
  summary: {
    queuedRows: 2,
    resolvedRows: 2,
    unresolvedRows: 0,
    blockedRows: 0,
    grossResolvedOneMesPl: 90,
    historicalReviewResolvedOneMesPl: 30,
    NoInstalledSetupResolvedOneMesPl: 60,
    livePromotionAllowedRows: 0,
  },
  rows: [
    {
      ticketId: 'winner-small',
      tradeDate: '2026-06-16',
      session: 'morning',
      setupType: 'historicalReview',
      direction: 'LONG',
      sourceSnapshotId: 'snap-1',
      proofTime: '2026-06-16T10:05:00',
      outcomeStatus: 'resolved',
      outcomeLabel: 't1_hit_only',
      entry: 100,
      stop: 96,
      t1: 106,
      t2: 108,
      riskPoints: 4,
      barsSource: 'local_market_bars_json',
      barsLoaded: 10,
      entryHitTime: '2026-06-16T10:10:00',
      firstReplayBarTime: '2026-06-16T10:15:00',
      stopHitTime: null,
      t1HitTime: '2026-06-16T10:30:00',
      t2HitTime: null,
      maximumFavorableExcursion: 8,
      maximumAdverseExcursion: 2,
      resolvedOneMesPl: 30,
      resolvedR: 1.5,
      intrabarAmbiguity: false,
      blockers: [],
    },
    {
      ticketId: 'winner-large',
      tradeDate: '2026-06-26',
      session: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      sourceSnapshotId: 'snap-2',
      proofTime: '2026-06-26T10:00:00',
      outcomeStatus: 'resolved',
      outcomeLabel: 't1_hit_only',
      entry: 200,
      stop: 190,
      t1: 215,
      t2: 220,
      riskPoints: 10,
      barsSource: 'local_market_bars_json',
      barsLoaded: 10,
      entryHitTime: '2026-06-26T10:05:00',
      firstReplayBarTime: '2026-06-26T10:10:00',
      stopHitTime: null,
      t1HitTime: '2026-06-26T10:30:00',
      t2HitTime: null,
      maximumFavorableExcursion: 20,
      maximumAdverseExcursion: 1,
      resolvedOneMesPl: 60,
      resolvedR: 1.2,
      intrabarAmbiguity: false,
      blockers: [],
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewRankOverlayReport({
  sourceProofFilterPath: 'source-proof.json',
  sourceProofFilterReport: sourceProofFilter,
  ohlcOutcomePath: 'outcome.json',
  ohlcOutcomeReport: ohlcOutcome,
}, '2026-07-17T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_rank_overlay');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.evaluatedRows, 3);
assert.equal(report.summary.rankedRows, 2);
assert.equal(report.summary.rejectedRows, 1);
assert.equal(report.summary.topRankedRowId, 'winner-large');
assert.equal(report.summary.rankedOneMesPl, 90);
assert.equal(report.summary.rejectedOneMesPl, -20);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.rows.find((row) => row.rowId === 'formal-loser')?.rank, null);
assert.ok(report.rows.find((row) => row.rowId === 'winner-large')?.rankScore);
assert.equal(report.supabaseBookmark.rlsautotest.bookmarked, true);
assert.equal(report.supabaseBookmark.rlsautotest.actionNow, 'none');
assert.equal(report.supabaseBookmark.rlsautotest.readsSupabase, false);
assert.equal(report.supabaseBookmark.rlsautotest.writesSupabase, false);
assert.match(report.markdown, /rlsautotest/);

const missing = buildUnifiedPositiveHeldLocalPreviewRankOverlayReport({
  sourceProofFilterPath: null,
  sourceProofFilterReport: null,
  ohlcOutcomePath: null,
  ohlcOutcomeReport: null,
}, '2026-07-17T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing source/proof filter path'));
assert.ok(missing.blockers.includes('missing OHLC outcome report'));

console.log('unified positive held-local preview rank overlay verified.');
