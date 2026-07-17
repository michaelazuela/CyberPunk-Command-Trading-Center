import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewRankOverlayExpansionReport,
} from './unified-positive-held-local-preview-rank-overlay-expansion';
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

function sourceReport(rows: UnifiedPositiveHeldLocalPreviewSourceProofFilterReport['rows']): UnifiedPositiveHeldLocalPreviewSourceProofFilterReport {
  const accepted = rows.filter((row) => row.decision === 'accepted_for_research_validation');
  const rejected = rows.filter((row) => row.decision === 'rejected_by_source_proof_filter');
  return {
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
      targetSetupTypes: ['TurtleSoup', 'SweepMssFvgRetrace'],
      requiresScannerOwnedHeldLocalArtifact: true,
      requiresCompletedFiveMinuteRetestReentryProof: true,
      requiresCanExecuteFalseForResearch: true,
      requiresPublishDiscordFalseForResearch: true,
      requiresShouldPostFalseForResearch: true,
      livePromotionAllowed: false,
    },
    summary: {
      evaluatedRows: rows.length,
      acceptedRows: accepted.length,
      rejectedRows: rejected.length,
      acceptedReviewedWinners: accepted.length,
      rejectedFormalLosers: rejected.length,
      acceptedFormalLosers: 0,
      rejectedReviewedWinners: 0,
      acceptedOneMesPl: accepted.reduce((total, row) => total + (row.outcomeOneMesPl ?? 0), 0),
      rejectedOneMesPl: rejected.reduce((total, row) => total + (row.outcomeOneMesPl ?? 0), 0),
      leakThroughLosingRows: 0,
      falseRejectReviewedWinningRows: 0,
      removeModelRecommendations: 0,
      broadenLiveBehaviorRecommendations: 0,
      changeCanExecuteRecommendations: 0,
      livePromotionAllowedRows: 0,
    },
    rows,
    blockers: [],
    recommendations: [],
    markdown: '',
  };
}

function accepted(rowId: string, setupType: 'TurtleSoup' | 'SweepMssFvgRetrace', pl: number): UnifiedPositiveHeldLocalPreviewSourceProofFilterReport['rows'][number] {
  return {
    rowId,
    sourceBucket: 'reviewed_held_local_winner',
    setupType,
    tradeDate: '2026-06-26',
    session: 'morning',
    direction: 'LONG',
    source: 'local_market_bars_json',
    outcomeOneMesPl: pl,
    scannerOwnedHeldLocalArtifact: true,
    completedFiveMinuteRetestReentryProof: true,
    artifactCanExecuteFalse: true,
    artifactPublishDiscordFalse: true,
    artifactShouldPostFalse: true,
    decision: 'accepted_for_research_validation',
    rejectionReasons: [],
  };
}

function rejected(rowId: string, pl: number): UnifiedPositiveHeldLocalPreviewSourceProofFilterReport['rows'][number] {
  return {
    rowId,
    sourceBucket: 'formal_dominant_review_loser',
    setupType: 'TurtleSoup',
    tradeDate: '2026-06-11',
    session: 'morning',
    direction: 'SHORT',
    source: 'selectedCandidate',
    outcomeOneMesPl: pl,
    scannerOwnedHeldLocalArtifact: false,
    completedFiveMinuteRetestReentryProof: false,
    artifactCanExecuteFalse: false,
    artifactPublishDiscordFalse: false,
    artifactShouldPostFalse: false,
    decision: 'rejected_by_source_proof_filter',
    rejectionReasons: ['missing scanner-owned held-local artifact'],
  };
}

function outcome(ticketId: string, setupType: 'TurtleSoup' | 'SweepMssFvgRetrace', pl: number, riskPoints: number, mfe: number, mae: number): UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport['rows'][number] {
  return {
    ticketId,
    tradeDate: '2026-06-26',
    session: 'morning',
    setupType,
    direction: 'LONG',
    sourceSnapshotId: `snap-${ticketId}`,
    proofTime: '2026-06-26T10:00:00',
    outcomeStatus: 'resolved',
    outcomeLabel: 't1_hit_only',
    entry: 100,
    stop: 95,
    t1: 107.5,
    t2: 110,
    riskPoints,
    barsSource: 'local_market_bars_json',
    barsLoaded: 20,
    entryHitTime: '2026-06-26T10:05:00',
    firstReplayBarTime: '2026-06-26T10:10:00',
    stopHitTime: null,
    t1HitTime: '2026-06-26T10:30:00',
    t2HitTime: null,
    maximumFavorableExcursion: mfe,
    maximumAdverseExcursion: mae,
    resolvedOneMesPl: pl,
    resolvedR: 1.5,
    intrabarAmbiguity: false,
    blockers: [],
  };
}

function outcomeReport(rows: UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport['rows']): UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport {
  return {
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
      queuedRows: rows.length,
      resolvedRows: rows.length,
      unresolvedRows: 0,
      blockedRows: 0,
      grossResolvedOneMesPl: rows.reduce((total, row) => total + (row.resolvedOneMesPl ?? 0), 0),
      turtleSoupResolvedOneMesPl: rows.filter((row) => row.setupType === 'TurtleSoup').reduce((total, row) => total + (row.resolvedOneMesPl ?? 0), 0),
      sweepMssFvgRetraceResolvedOneMesPl: rows.filter((row) => row.setupType === 'SweepMssFvgRetrace').reduce((total, row) => total + (row.resolvedOneMesPl ?? 0), 0),
      livePromotionAllowedRows: 0,
    },
    rows,
    blockers: [],
    recommendations: [],
    markdown: '',
  };
}

const report = buildUnifiedPositiveHeldLocalPreviewRankOverlayExpansionReport({
  reportDir: 'diagnostic-reports',
  sourceProofFilterPaths: ['newest-source.json', 'older-source.json'],
  sourceProofFilterReports: [
    sourceReport([accepted('winner-existing', 'TurtleSoup', 40), rejected('formal-loser', -25)]),
    sourceReport([accepted('winner-existing', 'TurtleSoup', 40), accepted('winner-expanded', 'SweepMssFvgRetrace', 90)]),
  ],
  ohlcOutcomePaths: ['newest-outcome.json', 'older-outcome.json'],
  ohlcOutcomeReports: [
    outcomeReport([outcome('winner-existing', 'TurtleSoup', 40, 8, 12, 1)]),
    outcomeReport([outcome('winner-expanded', 'SweepMssFvgRetrace', 90, 6, 22, 0)]),
  ],
}, '2026-07-17T00:05:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_rank_overlay_expansion');
assert.equal(report.status, 'pass');
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.expansion.sourceProofReportsLoaded, 2);
assert.equal(report.expansion.ohlcOutcomeReportsLoaded, 2);
assert.equal(report.expansion.duplicateRowsRemoved, 1);
assert.equal(report.expansion.newestRows, 2);
assert.equal(report.expansion.expandedRowsBeyondNewest, 1);
assert.equal(report.rankOverlay.summary.evaluatedRows, 3);
assert.equal(report.rankOverlay.summary.rankedRows, 2);
assert.equal(report.rankOverlay.summary.rejectedRows, 1);
assert.equal(report.rankOverlay.summary.topRankedRowId, 'winner-expanded');
assert.equal(report.rankOverlay.summary.rankedOneMesPl, 130);
assert.equal(report.rankOverlay.summary.rejectedOneMesPl, -25);
assert.equal(report.rankOverlay.summary.livePromotionAllowedRows, 0);
assert.match(report.markdown, /Expanded rows beyond newest: 1/);

const missing = buildUnifiedPositiveHeldLocalPreviewRankOverlayExpansionReport({
  reportDir: 'diagnostic-reports',
  sourceProofFilterPaths: [],
  sourceProofFilterReports: [],
  ohlcOutcomePaths: [],
  ohlcOutcomeReports: [],
}, '2026-07-17T00:06:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('no source/proof filter reports found'));
assert.ok(missing.blockers.includes('no OHLC outcome reports found'));

console.log('unified positive held-local preview rank overlay expansion verified.');
