import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewSourceProofFilterReport,
} from './unified-positive-held-local-preview-source-proof-filter';
import type { UnifiedPositiveHeldLocalTicketAdapterReport } from './unified-positive-held-local-ticket-adapter';
import type { UnifiedPositiveHeldLocalPreviewFilterDifferenceReport } from './unified-positive-held-local-preview-filter-difference';
import type { UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport } from './unified-positive-held-local-preview-ohlc-outcome';

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

const formalReplay = {
  variants: [
    { name: 'strictExecutable', trades: [] },
    {
      name: 'dominantReview',
      trades: [
        {
          date: '2026-06-11',
          session: 'morning',
          source: 'selectedCandidate',
          direction: 'SHORT',
          setupType: 'TurtleSoup',
          state: 'Conditional',
          trigger: 'Bearish Turtle Soup sweep and reclaim.',
          entry: 100,
          stop: 104,
          oneMesGross: -20,
        },
        {
          date: '2026-06-18',
          session: 'morning',
          source: 'selectedCandidate',
          direction: 'SHORT',
          setupType: 'SweepMssFvgRetrace',
          state: 'Conditional',
          trigger: 'Sweep MSS FVG retrace.',
          entry: 200,
          stop: 210,
          oneMesGross: -50,
        },
      ],
    },
  ],
};

const ohlcOutcome: UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport = {
  reportType: 'unified_positive_held_local_preview_ohlc_outcome',
  generatedAt: '2026-07-17T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    replayQueuePath: 'queue.json',
    heldLocalAdapterPath: 'adapter.json',
    marketBarsJsonPath: 'market-bars.json',
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
    turtleSoupResolvedOneMesPl: 30,
    sweepMssFvgRetraceResolvedOneMesPl: 60,
    livePromotionAllowedRows: 0,
  },
  rows: [
    {
      ticketId: 'turtle-1',
      tradeDate: '2026-06-16',
      session: 'morning',
      setupType: 'TurtleSoup',
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
      ticketId: 'sweep-1',
      tradeDate: '2026-06-26',
      session: 'morning',
      setupType: 'SweepMssFvgRetrace',
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

const adapter = {
  reportType: 'unified_positive_held_local_ticket_adapter',
  rows: [
    {
      ticketId: 'turtle-1',
      adapterStatus: 'held_local_artifact_created',
      artifact: {
        canExecute: false,
        publishDiscord: false,
        deskPublishDecision: {
          shouldPost: false,
          triggerCondition: 'Fresh completed 5M completed_5m_retest_reentry printed at 2026-06-16T10:05:00.',
        },
        deskTicket: {
          triggerCondition: 'Fresh completed 5M completed_5m_retest_reentry printed at 2026-06-16T10:05:00.',
        },
      },
    },
    {
      ticketId: 'sweep-1',
      adapterStatus: 'held_local_artifact_created',
      artifact: {
        canExecute: false,
        publishDiscord: false,
        deskPublishDecision: {
          shouldPost: false,
          triggerCondition: 'Fresh completed 5M completed_5m_retest_reentry printed at 2026-06-26T10:00:00.',
        },
        deskTicket: {
          triggerCondition: 'Fresh completed 5M completed_5m_retest_reentry printed at 2026-06-26T10:00:00.',
        },
      },
    },
  ],
} as UnifiedPositiveHeldLocalTicketAdapterReport;

const filterDifference = {
  reportType: 'unified_positive_held_local_preview_filter_difference',
  status: 'pass',
  summary: {
    candidateFilterFindings: 2,
    livePromotionAllowedRows: 0,
  },
} as UnifiedPositiveHeldLocalPreviewFilterDifferenceReport;

const report = buildUnifiedPositiveHeldLocalPreviewSourceProofFilterReport({
  formalReplayPath: 'formal.json',
  formalReplayReport: formalReplay,
  ohlcOutcomePath: 'outcome.json',
  ohlcOutcomeReport: ohlcOutcome,
  heldLocalAdapterPath: 'adapter.json',
  heldLocalAdapterReport: adapter,
  filterDifferencePath: 'filter-difference.json',
  filterDifferenceReport: filterDifference,
}, '2026-07-17T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_source_proof_filter');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.evaluatedRows, 4);
assert.equal(report.summary.acceptedRows, 2);
assert.equal(report.summary.rejectedRows, 2);
assert.equal(report.summary.acceptedReviewedWinners, 2);
assert.equal(report.summary.rejectedFormalLosers, 2);
assert.equal(report.summary.acceptedFormalLosers, 0);
assert.equal(report.summary.rejectedReviewedWinners, 0);
assert.equal(report.summary.acceptedOneMesPl, 90);
assert.equal(report.summary.rejectedOneMesPl, -70);
assert.equal(report.summary.leakThroughLosingRows, 0);
assert.equal(report.summary.falseRejectReviewedWinningRows, 0);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.ok(report.rows.filter((row) => row.sourceBucket === 'formal_dominant_review_loser').every((row) => row.rejectionReasons.includes('missing scanner-owned held-local artifact')));
assert.ok(report.rows.filter((row) => row.sourceBucket === 'reviewed_held_local_winner').every((row) => row.completedFiveMinuteRetestReentryProof));
assert.match(report.markdown, /does not post Discord/);

const missingAdapter = buildUnifiedPositiveHeldLocalPreviewSourceProofFilterReport({
  formalReplayPath: 'formal.json',
  formalReplayReport: formalReplay,
  ohlcOutcomePath: 'outcome.json',
  ohlcOutcomeReport: ohlcOutcome,
  heldLocalAdapterPath: null,
  heldLocalAdapterReport: null,
  filterDifferencePath: 'filter-difference.json',
  filterDifferenceReport: filterDifference,
}, '2026-07-17T00:02:00.000Z');

assert.equal(missingAdapter.status, 'fail');
assert.ok(missingAdapter.blockers.includes('missing held-local adapter path'));
assert.ok(missingAdapter.blockers.includes('source/proof filter rejected at least one reviewed held-local winner'));

console.log('unified positive held-local preview source/proof filter verified.');
