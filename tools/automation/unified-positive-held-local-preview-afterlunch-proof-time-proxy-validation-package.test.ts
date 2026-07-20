import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyValidationPackageReport,
} from './unified-positive-held-local-preview-afterlunch-proof-time-proxy-validation-package';
import type {
  UnifiedPositiveHeldLocalPreviewAfterLunchAdverseNoLookaheadSeparatorReport,
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

type EnrichedRow = UnifiedPositiveHeldLocalPreviewAfterLunchProofContextEnrichmentReport['rows'][number];

function enrichedRow(id: string, riskPoints: number, outcomeBucket: EnrichedRow['outcomeBucket'] = 'winner_t1_t2'): EnrichedRow {
  return {
    queueId: id,
    ticketId: id,
    slateId: '2026-06-29|lunch',
    tradeDate: '2026-06-29',
    session: 'lunch',
    setupType: 'AfterLunchDriveFvgContinuation',
    direction: 'LONG',
    proofTime: '2026-06-29T13:15:00',
    proofRankInSlate: 1,
    firstValidProof: true,
    changedSlateRow: false,
    changedSlateBaselineTop: false,
    changedSlateSimulatedTop: false,
    outcomeBucket,
    resolvedOneMesPl: outcomeBucket.startsWith('winner') ? 110 : -30,
    riskPoints,
    enrichmentPriority: 75,
    enrichmentReason: 'first_valid_proof_in_slate',
    runtimeRankConsumerAllowed: false,
    proofToEntryMinutes: 0,
    entryHitTime: '2026-06-29T13:15:00',
    outcomeLabel: outcomeBucket,
    mfeR: 2,
    maeR: outcomeBucket.startsWith('winner') ? 0.2 : 1.2,
    issueTags: outcomeBucket.startsWith('winner') ? ['full_delivery'] : ['stopped_before_t1', 'adverse_excursion_at_or_over_1r'],
    contextTags: [],
    enrichmentBlockers: [],
  };
}

const separatorReport: UnifiedPositiveHeldLocalPreviewAfterLunchAdverseNoLookaheadSeparatorReport = {
  reportType: 'unified_positive_held_local_preview_afterlunch_adverse_no_lookahead_separator',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: 'reports', proofContextEnrichmentPath: 'enrichment.json' },
  assumptions: {
    savedReportsOnly: true,
    afterLunchOnly: true,
    excludesOutcomeMfeMaeFromCandidateFeatures: true,
    adverseNoIsFuturePathEvidence: true,
    livePromotionAllowed: false,
  },
  summary: {
    sourceRows: 3,
    adverseNoRows: 2,
    adverseYesRows: 1,
    separatorsEvaluated: 2,
    researchCandidates: 1,
    lookaheadRejectedSeparators: 1,
    topResearchCandidateId: 'risk:10.25-12',
    adverseNoIdentifiableWithoutLookahead: false,
    runtimeRankConsumerAllowedByThisReport: false,
    recommendation: 'validate_preentry_proxy_on_fresh_replay',
  },
  separators: [
    {
      separatorId: 'risk:10.25-12',
      featureSet: 'risk',
      featureValue: '10.25-12',
      usesFuturePathEvidence: false,
      evaluatedRows: 3,
      selectedRows: 2,
      selectedWinners: 2,
      selectedLosses: 0,
      selectedUnresolved: 0,
      rejectedWinners: 0,
      rejectedLosses: 1,
      selectedOneMesPl: 220,
      rejectedOneMesPl: -30,
      selectedAdverseNoRows: 2,
      selectedAdverseYesRows: 0,
      adverseNoCoverage: 1,
      decision: 'research_candidate',
    },
    {
      separatorId: 'futurePath:adverse_no',
      featureSet: 'futurePath',
      featureValue: 'adverse_no',
      usesFuturePathEvidence: true,
      evaluatedRows: 3,
      selectedRows: 2,
      selectedWinners: 2,
      selectedLosses: 0,
      selectedUnresolved: 0,
      rejectedWinners: 0,
      rejectedLosses: 1,
      selectedOneMesPl: 220,
      rejectedOneMesPl: -30,
      selectedAdverseNoRows: 2,
      selectedAdverseYesRows: 0,
      adverseNoCoverage: 1,
      decision: 'lookahead_rejected',
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const enrichmentReport: UnifiedPositiveHeldLocalPreviewAfterLunchProofContextEnrichmentReport = {
  reportType: 'unified_positive_held_local_preview_afterlunch_proof_context_enrichment',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: 'reports', queuePath: 'queue.json', sourceProofTimingPath: 'source.json' },
  assumptions: {
    savedReportsOnly: true,
    afterLunchOnly: true,
    joinsQueueToSourceProofTiming: true,
    noRuntimeRankingChange: true,
    runtimeRankConsumerAllowedByThisReport: false,
  },
  summary: {
    queueRows: 3,
    enrichedRows: 3,
    blockedRows: 0,
    winners: 2,
    losses: 1,
    unresolved: 0,
    grossResolvedOneMesPl: 190,
    highPriorityRows: 0,
    firstValidProofRows: 3,
    changedSlateRows: 0,
    changedSlateFirstProofRows: 0,
    changedSlateReplacementRows: 0,
    changedSlateFirstProofPl: null,
    changedSlateReplacementTopPl: null,
    sameBarEntryRows: 3,
    adverseExcursionRows: 1,
    intrabarAmbiguityRows: 0,
    runtimeRankConsumerAllowedByThisReport: false,
    recommendation: 'preserve_first_valid_proof_research_only',
  },
  buckets: [],
  rows: [enrichedRow('selected-1', 11), enrichedRow('selected-2', 11.5), enrichedRow('rejected-loss', 7, 'loss_stopped_before_t1')],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyValidationPackageReport({
  reportDir: 'reports',
  separatorPath: 'separator.json',
  proofContextEnrichmentPath: 'enrichment.json',
  separatorReport,
  proofContextEnrichmentReport: enrichmentReport,
}, '2026-07-19T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_afterlunch_proof_time_proxy_validation_package');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.sourceRows, 3);
assert.equal(report.summary.researchProxyCandidates, 1);
assert.equal(report.summary.packageRows, 2);
assert.equal(report.summary.winners, 2);
assert.equal(report.summary.losses, 0);
assert.equal(report.summary.oneMesPl, 220);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'run_fresh_replay_validation');
assert.deepEqual(report.rows.map((row) => row.ticketId), ['selected-1', 'selected-2']);
assert.equal(report.rows.every((row) => row.matchedProxyIds.includes('risk:10.25-12')), true);
assert.equal(report.rows.some((row) => row.matchedProxyIds.includes('futurePath:adverse_no')), false);
assert.match(report.markdown, /Proof-Time Proxy Validation Package/);

const missing = buildUnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyValidationPackageReport({
  reportDir: 'reports',
  separatorPath: null,
  proofContextEnrichmentPath: null,
  separatorReport: null,
  proofContextEnrichmentReport: null,
}, '2026-07-19T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing AfterLunch no-lookahead separator path'));

console.log('unified positive held-local AfterLunch proof-time proxy validation package verified.');
