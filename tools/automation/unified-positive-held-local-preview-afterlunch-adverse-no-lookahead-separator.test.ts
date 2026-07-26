import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewAfterLunchAdverseNoLookaheadSeparatorReport,
} from './unified-positive-held-local-preview-afterlunch-adverse-no-lookahead-separator';
import type {
  UnifiedPositiveHeldLocalPreviewAfterLunchProofContextEnrichmentReport,
} from './unified-positive-held-local-preview-afterlunch-proof-context-enrichment';

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

function row(id: string, overrides: Partial<UnifiedPositiveHeldLocalPreviewAfterLunchProofContextEnrichmentReport['rows'][number]> = {}): UnifiedPositiveHeldLocalPreviewAfterLunchProofContextEnrichmentReport['rows'][number] {
  return {
    queueId: id,
    ticketId: id,
    slateId: '2026-06-29|lunch',
    tradeDate: '2026-06-29',
    session: 'lunch',
    setupType: 'NoInstalledSetup',
    direction: 'LONG',
    proofTime: '2026-06-29T13:15:00',
    proofRankInSlate: 1,
    firstValidProof: true,
    changedSlateRow: false,
    changedSlateBaselineTop: false,
    changedSlateSimulatedTop: false,
    outcomeBucket: 'winner_t1_t2',
    resolvedOneMesPl: 110,
    riskPoints: 11,
    enrichmentPriority: 75,
    enrichmentReason: 'first_valid_proof_in_slate',
    runtimeRankConsumerAllowed: false,
    proofToEntryMinutes: 0,
    entryHitTime: '2026-06-29T13:15:00',
    outcomeLabel: 't1_and_t2_hit',
    mfeR: 3,
    maeR: 0.2,
    issueTags: ['full_delivery'],
    contextTags: [],
    enrichmentBlockers: [],
    ...overrides,
  };
}

const enrichmentReport: UnifiedPositiveHeldLocalPreviewAfterLunchProofContextEnrichmentReport = {
  reportType: 'unified_positive_held_local_preview_afterlunch_proof_context_enrichment',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    reportDir: 'reports',
    queuePath: 'queue.json',
    sourceProofTimingPath: 'source.json',
  },
  assumptions: {
    savedReportsOnly: true,
    afterLunchOnly: true,
    joinsQueueToSourceProofTiming: true,
    noRuntimeRankingChange: true,
    runtimeRankConsumerAllowedByThisReport: false,
  },
  summary: {
    queueRows: 7,
    enrichedRows: 7,
    blockedRows: 0,
    winners: 6,
    losses: 1,
    unresolved: 0,
    grossResolvedOneMesPl: 530,
    highPriorityRows: 0,
    firstValidProofRows: 7,
    changedSlateRows: 0,
    changedSlateFirstProofRows: 0,
    changedSlateReplacementRows: 0,
    changedSlateFirstProofPl: null,
    changedSlateReplacementTopPl: null,
    sameBarEntryRows: 7,
    adverseExcursionRows: 1,
    intrabarAmbiguityRows: 0,
    runtimeRankConsumerAllowedByThisReport: false,
    recommendation: 'preserve_first_valid_proof_research_only',
  },
  buckets: [],
  rows: [
    row('candidate-1'),
    row('candidate-2'),
    row('candidate-3'),
    row('candidate-4'),
    row('candidate-5'),
    row('other-win', { riskPoints: 7, resolvedOneMesPl: 70 }),
    row('other-loss', {
      riskPoints: 7,
      outcomeBucket: 'loss_stopped_before_t1',
      outcomeLabel: 'stopped_before_t1',
      resolvedOneMesPl: -30,
      issueTags: ['stopped_before_t1', 'adverse_excursion_at_or_over_1r'],
      maeR: 1.2,
    }),
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewAfterLunchAdverseNoLookaheadSeparatorReport({
  reportDir: 'reports',
  proofContextEnrichmentPath: 'enrichment.json',
  proofContextEnrichmentReport: enrichmentReport,
}, '2026-07-19T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_afterlunch_adverse_no_lookahead_separator');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.sourceRows, 7);
assert.equal(report.summary.adverseNoRows, 6);
assert.equal(report.summary.adverseYesRows, 1);
assert.equal(report.summary.lookaheadRejectedSeparators, 1);
assert.equal(report.summary.researchCandidates > 0, true);
assert.equal(report.summary.topResearchCandidateId, 'risk:10.25-12');
assert.equal(report.summary.recommendation, 'validate_preentry_proxy_on_fresh_replay');
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);

const lookahead = report.separators.find((entry) => entry.separatorId === 'futurePath:adverse_no');
assert.equal(lookahead?.decision, 'lookahead_rejected');
assert.equal(lookahead?.usesFuturePathEvidence, true);

const candidate = report.separators.find((entry) => entry.separatorId === 'risk:10.25-12');
assert.equal(candidate?.decision, 'research_candidate');
assert.equal(candidate?.selectedWinners, 5);
assert.equal(candidate?.selectedLosses, 0);
assert.equal(candidate?.usesFuturePathEvidence, false);

const missing = buildUnifiedPositiveHeldLocalPreviewAfterLunchAdverseNoLookaheadSeparatorReport({
  reportDir: 'reports',
  proofContextEnrichmentPath: null,
  proofContextEnrichmentReport: null,
}, '2026-07-19T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing AfterLunch proof-context enrichment path'));

console.log('unified positive held-local AfterLunch adverse no-lookahead separator verified.');
