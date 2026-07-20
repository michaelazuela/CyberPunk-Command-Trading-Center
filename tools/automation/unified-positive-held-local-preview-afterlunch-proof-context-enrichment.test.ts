import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewAfterLunchProofContextEnrichmentReport,
} from './unified-positive-held-local-preview-afterlunch-proof-context-enrichment';
import type { UnifiedPositiveHeldLocalPreviewAfterLunchProofContextQueueReport } from './unified-positive-held-local-preview-afterlunch-proof-context-queue';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport } from './unified-positive-held-local-preview-replay-package-source-proof-timing';

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

const queueReport: UnifiedPositiveHeldLocalPreviewAfterLunchProofContextQueueReport = {
  reportType: 'unified_positive_held_local_preview_afterlunch_proof_context_queue',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    reportDir: 'reports',
    sourceProofTimingPath: 'source.json',
    changedSlateDrilldownPath: 'drilldown.json',
  },
  assumptions: {
    savedReportsOnly: true,
    afterLunchOnly: true,
    queueOnly: true,
    noRuntimeRankingChange: true,
    runtimeRankConsumerAllowedByThisReport: false,
  },
  summary: {
    sourceRows: 3,
    queueRows: 3,
    slates: 1,
    firstValidProofRows: 1,
    changedSlateRows: 2,
    highPriorityRows: 2,
    runtimeRankConsumerAllowedByThisReport: false,
    recommendation: 'run_afterlunch_specific_proof_context_enrichment',
  },
  rows: [
    {
      queueId: '2026-06-29|lunch|baseline',
      ticketId: 'baseline',
      slateId: '2026-06-29|lunch',
      tradeDate: '2026-06-29',
      session: 'lunch',
      setupType: 'AfterLunchDriveFvgContinuation',
      direction: 'LONG',
      proofTime: '2026-06-29T13:15:00',
      proofRankInSlate: 1,
      firstValidProof: true,
      changedSlateRow: true,
      changedSlateBaselineTop: true,
      changedSlateSimulatedTop: false,
      outcomeBucket: 'winner_t1_t2',
      resolvedOneMesPl: 125,
      riskPoints: 12.5,
      enrichmentPriority: 100,
      enrichmentReason: 'first_valid_proof_in_changed_slate',
      runtimeRankConsumerAllowed: false,
    },
    {
      queueId: '2026-06-29|lunch|replacement',
      ticketId: 'replacement',
      slateId: '2026-06-29|lunch',
      tradeDate: '2026-06-29',
      session: 'lunch',
      setupType: 'AfterLunchDriveFvgContinuation',
      direction: 'LONG',
      proofTime: '2026-06-29T13:20:00',
      proofRankInSlate: 2,
      firstValidProof: false,
      changedSlateRow: true,
      changedSlateBaselineTop: false,
      changedSlateSimulatedTop: true,
      outcomeBucket: 'winner_t1_t2',
      resolvedOneMesPl: 100,
      riskPoints: 10,
      enrichmentPriority: 90,
      enrichmentReason: 'changed_slate_comparison_row',
      runtimeRankConsumerAllowed: false,
    },
    {
      queueId: '2026-06-29|lunch|loss',
      ticketId: 'loss',
      slateId: '2026-06-29|lunch',
      tradeDate: '2026-06-29',
      session: 'lunch',
      setupType: 'AfterLunchDriveFvgContinuation',
      direction: 'SHORT',
      proofTime: '2026-06-29T13:25:00',
      proofRankInSlate: 3,
      firstValidProof: false,
      changedSlateRow: false,
      changedSlateBaselineTop: false,
      changedSlateSimulatedTop: false,
      outcomeBucket: 'loss_stopped_before_t1',
      resolvedOneMesPl: -30,
      riskPoints: 6,
      enrichmentPriority: 40,
      enrichmentReason: 'later_afterlunch_proof_context',
      runtimeRankConsumerAllowed: false,
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const sourceProofTimingReport: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport = {
  reportType: 'unified_positive_held_local_preview_replay_package_source_proof_timing',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    reportDir: 'reports',
    replayPackageOutcomePath: 'outcome.json',
  },
  assumptions: {
    usesReadOnlyOutcomeReportOnly: true,
    fullDeliveryWinnerMeansT1AndT2Hit: true,
    stoppedBeforeT1MeansTimingLoss: true,
    unresolvedRowsAreNotWinsOrLosses: true,
    staleEntryThresholdMinutes: 30,
    livePromotionAllowed: false,
  },
  summary: {
    evaluatedRows: 3,
    winners: 2,
    losses: 1,
    unresolved: 0,
    blocked: 0,
    grossResolvedOneMesPl: 195,
    positiveModelGroups: 1,
    negativeModelGroups: 0,
    unresolvedModelGroups: 0,
    livePromotionAllowedRows: 0,
  },
  modelTiming: [],
  rows: [
    {
      ticketId: 'baseline',
      tradeDate: '2026-06-29',
      session: 'lunch',
      setupType: 'AfterLunchDriveFvgContinuation',
      direction: 'LONG',
      outcomeBucket: 'winner_t1_t2',
      outcomeLabel: 't1_and_t2_hit',
      resolvedOneMesPl: 125,
      proofTime: '2026-06-29T13:15:00',
      entryHitTime: '2026-06-29T13:15:00',
      proofToEntryMinutes: 0,
      riskPoints: 12.5,
      mfeR: 9,
      maeR: 0.2,
      issueTags: ['full_delivery', 'same_bar_entry'],
    },
    {
      ticketId: 'replacement',
      tradeDate: '2026-06-29',
      session: 'lunch',
      setupType: 'AfterLunchDriveFvgContinuation',
      direction: 'LONG',
      outcomeBucket: 'winner_t1_t2',
      outcomeLabel: 't1_and_t2_hit',
      resolvedOneMesPl: 100,
      proofTime: '2026-06-29T13:20:00',
      entryHitTime: '2026-06-29T13:20:00',
      proofToEntryMinutes: 0,
      riskPoints: 10,
      mfeR: 10,
      maeR: 0.25,
      issueTags: ['full_delivery', 'same_bar_entry'],
    },
    {
      ticketId: 'loss',
      tradeDate: '2026-06-29',
      session: 'lunch',
      setupType: 'AfterLunchDriveFvgContinuation',
      direction: 'SHORT',
      outcomeBucket: 'loss_stopped_before_t1',
      outcomeLabel: 'stopped_before_t1',
      resolvedOneMesPl: -30,
      proofTime: '2026-06-29T13:25:00',
      entryHitTime: '2026-06-29T13:25:00',
      proofToEntryMinutes: 0,
      riskPoints: 6,
      mfeR: 2,
      maeR: 1.2,
      issueTags: ['stopped_before_t1', 'same_bar_entry', 'adverse_excursion_at_or_over_1r'],
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewAfterLunchProofContextEnrichmentReport({
  reportDir: 'reports',
  queuePath: 'queue.json',
  sourceProofTimingPath: 'source.json',
  queueReport,
  sourceProofTimingReport,
}, '2026-07-19T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_afterlunch_proof_context_enrichment');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.queueRows, 3);
assert.equal(report.summary.enrichedRows, 3);
assert.equal(report.summary.blockedRows, 0);
assert.equal(report.summary.winners, 2);
assert.equal(report.summary.losses, 1);
assert.equal(report.summary.grossResolvedOneMesPl, 195);
assert.equal(report.summary.changedSlateFirstProofPl, 125);
assert.equal(report.summary.changedSlateReplacementTopPl, 100);
assert.equal(report.summary.recommendation, 'preserve_first_valid_proof_research_only');
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);

const baseline = report.rows.find((row) => row.ticketId === 'baseline');
assert.ok(baseline?.contextTags.includes('first_valid_proof'));
assert.ok(baseline?.contextTags.includes('baseline_top'));
assert.ok(baseline?.contextTags.includes('same_bar_entry'));

const loss = report.rows.find((row) => row.ticketId === 'loss');
assert.ok(loss?.contextTags.includes('adverse_excursion_at_or_over_1r'));
assert.ok(loss?.contextTags.includes('loss'));

assert.ok(report.buckets.some((bucket) => bucket.bucketId === 'rank:first_valid_proof' && bucket.grossResolvedOneMesPl === 125));
assert.match(report.markdown, /AfterLunch Proof-Context Enrichment/);

const missing = buildUnifiedPositiveHeldLocalPreviewAfterLunchProofContextEnrichmentReport({
  reportDir: 'reports',
  queuePath: null,
  sourceProofTimingPath: null,
  queueReport: null,
  sourceProofTimingReport: null,
}, '2026-07-19T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing AfterLunch proof-context queue path'));
assert.ok(missing.blockers.includes('missing source/proof timing path'));

console.log('unified positive held-local AfterLunch proof-context enrichment verified.');
