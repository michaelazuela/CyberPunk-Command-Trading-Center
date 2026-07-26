import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyFreshOutcomeComparisonReport,
} from './unified-positive-held-local-preview-afterlunch-proof-time-proxy-fresh-outcome-comparison';
import type {
  UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyValidationPackageReport,
} from './unified-positive-held-local-preview-afterlunch-proof-time-proxy-validation-package';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport,
} from './unified-positive-held-local-preview-replay-package-outcome';

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

function validationPackage(): UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyValidationPackageReport {
  return {
    reportType: 'unified_positive_held_local_preview_afterlunch_proof_time_proxy_validation_package',
    generatedAt: '2026-07-20T00:00:00.000Z',
    status: 'pass',
    authority,
    source: {
      reportDir: 'reports',
      separatorPath: 'separator.json',
      proofContextEnrichmentPath: 'enrichment.json',
    },
    assumptions: {
      savedReportsOnly: true,
      packagesResearchCandidatesOnly: true,
      excludesLookaheadRejectedSeparators: true,
      outcomeFieldsAreEvaluationOnly: true,
      noFreshReplayRunByThisReport: true,
      livePromotionAllowed: false,
    },
    summary: {
      sourceRows: 2,
      researchProxyCandidates: 1,
      packageRows: 2,
      winners: 2,
      losses: 0,
      unresolved: 0,
      oneMesPl: 200,
      livePromotionAllowedRows: 0,
      recommendation: 'run_fresh_replay_validation',
    },
    proxySummaries: [],
    rows: [
      {
        ticketId: 'ticket-a',
        tradeDate: '2026-06-01',
        session: 'lunch',
        setupType: 'NoInstalledSetup',
        direction: 'LONG',
        proofTime: '2026-06-01T12:35:00',
        riskPoints: 10,
        proofRankInSlate: 1,
        firstValidProof: true,
        changedSlateRow: true,
        matchedProxyIds: ['risk:10.25-12'],
        outcomeBucket: 'winner_t1_t2',
        resolvedOneMesPl: 100,
        replayValidationStatus: 'queued_for_fresh_validation',
      },
      {
        ticketId: 'ticket-b',
        tradeDate: '2026-06-02',
        session: 'lunch',
        setupType: 'NoInstalledSetup',
        direction: 'SHORT',
        proofTime: '2026-06-02T12:45:00',
        riskPoints: 10,
        proofRankInSlate: 2,
        firstValidProof: false,
        changedSlateRow: false,
        matchedProxyIds: ['risk:10.25-12'],
        outcomeBucket: 'winner_t1_t2',
        resolvedOneMesPl: 100,
        replayValidationStatus: 'queued_for_fresh_validation',
      },
    ],
    blockers: [],
    recommendations: [],
    markdown: '',
  };
}

function freshOutcome(ticketBLabel: 't1_and_t2_hit' | 'stopped_before_t1'): UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport {
  return {
    reportType: 'unified_positive_held_local_preview_replay_package_outcome',
    generatedAt: '2026-07-20T00:00:00.000Z',
    status: 'pass',
    authority,
    source: {
      reportDir: 'reports',
      replayPackagePath: 'fresh-replay.json',
    },
    assumptions: {
      oneMesPointValue: 5,
      usesCompletedFiveMinuteBarsOnly: true,
      missingBarsAreNotInvented: true,
      sameBarStopAndTargetUsesConservativeStopFirst: true,
      outcomeIsResearchOnly: true,
      livePromotionAllowed: false,
    },
    summary: {
      packageRows: 2,
      resolvedRows: 2,
      unresolvedRows: 0,
      blockedRows: 0,
      noFillRows: 0,
      stoppedBeforeT1Rows: ticketBLabel === 'stopped_before_t1' ? 1 : 0,
      t1OnlyRows: 0,
      t1AndT2Rows: ticketBLabel === 't1_and_t2_hit' ? 2 : 1,
      noTargetOrStopRows: 0,
      grossResolvedOneMesPl: ticketBLabel === 't1_and_t2_hit' ? 200 : 50,
      modelGroups: [],
      daySessionModelGroups: [],
      livePromotionAllowedRows: 0,
    },
    rows: [
      outcomeRow('ticket-a', 'LONG', 't1_and_t2_hit', 100),
      outcomeRow('ticket-b', 'SHORT', ticketBLabel, ticketBLabel === 't1_and_t2_hit' ? 100 : -50),
    ],
    blockers: [],
    recommendations: [],
    markdown: '',
  };
}

function outcomeRow(ticketId: string, direction: 'LONG' | 'SHORT', outcomeLabel: 't1_and_t2_hit' | 'stopped_before_t1', resolvedOneMesPl: number): UnifiedPositiveHeldLocalPreviewReplayPackageOutcomeReport['rows'][number] {
  return {
    ticketId,
    tradeDate: ticketId === 'ticket-a' ? '2026-06-01' : '2026-06-02',
    session: 'lunch',
    setupType: 'NoInstalledSetup',
    direction,
    proofTime: ticketId === 'ticket-a' ? '2026-06-01T12:35:00' : '2026-06-02T12:45:00',
    outcomeStatus: 'resolved',
    outcomeLabel,
    entry: 7500,
    stop: direction === 'LONG' ? 7490 : 7510,
    t1: direction === 'LONG' ? 7515 : 7485,
    t2: direction === 'LONG' ? 7520 : 7480,
    riskPoints: 10,
    barsSource: 'scanner_decision_tape_completed_5m',
    barsLoaded: 20,
    barsAfterProof: 10,
    entryHitTime: '2026-06-01T12:35:00',
    firstReplayBarTime: '2026-06-01T12:40:00',
    stopHitTime: outcomeLabel === 'stopped_before_t1' ? '2026-06-01T12:45:00' : null,
    t1HitTime: outcomeLabel === 't1_and_t2_hit' ? '2026-06-01T12:45:00' : null,
    t2HitTime: outcomeLabel === 't1_and_t2_hit' ? '2026-06-01T12:50:00' : null,
    maximumFavorableExcursion: 20,
    maximumAdverseExcursion: 1,
    resolvedOneMesPl,
    resolvedR: resolvedOneMesPl / 50,
    intrabarAmbiguity: false,
    blockers: [],
  };
}

const matched = buildUnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyFreshOutcomeComparisonReport({
  reportDir: 'reports',
  validationPackagePath: 'validation.json',
  freshOutcomePath: 'fresh.json',
  validationPackageReport: validationPackage(),
  freshOutcomeReport: freshOutcome('t1_and_t2_hit'),
}, '2026-07-20T01:00:00.000Z');

assert.equal(matched.status, 'pass');
assert.equal(matched.summary.validationRows, 2);
assert.equal(matched.summary.freshOutcomeRows, 2);
assert.equal(matched.summary.exactMatches, 2);
assert.equal(matched.summary.divergences, 0);
assert.equal(matched.summary.freshLosses, 0);
assert.equal(matched.summary.freshOneMesPl, 200);
assert.equal(matched.summary.recommendation, 'ready_for_out_of_sample_replay');
assert.equal(matched.authority.changesCanExecute, false);
assert.equal(matched.authority.changesTradingLogic, false);
assert.equal(matched.authority.writesSupabase, false);

const divergent = buildUnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyFreshOutcomeComparisonReport({
  reportDir: 'reports',
  validationPackagePath: 'validation.json',
  freshOutcomePath: 'fresh.json',
  validationPackageReport: validationPackage(),
  freshOutcomeReport: freshOutcome('stopped_before_t1'),
}, '2026-07-20T01:00:00.000Z');

assert.equal(divergent.status, 'pass');
assert.equal(divergent.summary.exactMatches, 1);
assert.equal(divergent.summary.divergences, 1);
assert.equal(divergent.summary.freshLosses, 1);
assert.equal(divergent.summary.recommendation, 'investigate_divergence');
assert.equal(divergent.divergentRows[0].ticketId, 'ticket-b');

console.log('unified positive held-local AfterLunch proof-time proxy fresh outcome comparison verified.');
