import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxySourceComparisonReport,
} from './unified-positive-held-local-preview-afterlunch-proof-time-proxy-source-comparison';
import type {
  UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyValidationPackageReport,
} from './unified-positive-held-local-preview-afterlunch-proof-time-proxy-validation-package';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport,
} from './unified-positive-held-local-preview-replay-package-source-proof-timing';

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

const validationPackage: UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyValidationPackageReport = {
  reportType: 'unified_positive_held_local_preview_afterlunch_proof_time_proxy_validation_package',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: 'reports', separatorPath: 'separator.json', proofContextEnrichmentPath: 'enrichment.json' },
  assumptions: {
    savedReportsOnly: true,
    packagesResearchCandidatesOnly: true,
    excludesLookaheadRejectedSeparators: true,
    outcomeFieldsAreEvaluationOnly: true,
    noFreshReplayRunByThisReport: true,
    livePromotionAllowed: false,
  },
  summary: {
    sourceRows: 3,
    researchProxyCandidates: 1,
    packageRows: 2,
    winners: 2,
    losses: 0,
    unresolved: 0,
    oneMesPl: 220,
    livePromotionAllowedRows: 0,
    recommendation: 'run_fresh_replay_validation',
  },
  proxySummaries: [],
  rows: [
    {
      ticketId: 'selected-a',
      tradeDate: '2026-06-29',
      session: 'lunch',
      setupType: 'AfterLunchDriveFvgContinuation',
      direction: 'LONG',
      proofTime: '2026-06-29T13:15:00',
      riskPoints: 11,
      proofRankInSlate: 1,
      firstValidProof: true,
      changedSlateRow: false,
      matchedProxyIds: ['risk:10.25-12'],
      outcomeBucket: 'winner_t1_t2',
      resolvedOneMesPl: 110,
      replayValidationStatus: 'queued_for_fresh_validation',
    },
    {
      ticketId: 'selected-b',
      tradeDate: '2026-06-30',
      session: 'lunch',
      setupType: 'AfterLunchDriveFvgContinuation',
      direction: 'SHORT',
      proofTime: '2026-06-30T12:20:00',
      riskPoints: 9,
      proofRankInSlate: 2,
      firstValidProof: false,
      changedSlateRow: true,
      matchedProxyIds: ['changedSlate:true'],
      outcomeBucket: 'winner_t1_t2',
      resolvedOneMesPl: 110,
      replayValidationStatus: 'queued_for_fresh_validation',
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const sourceProofTiming: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport = {
  reportType: 'unified_positive_held_local_preview_replay_package_source_proof_timing',
  generatedAt: '2026-07-19T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: 'reports', replayPackageOutcomePath: 'outcome.json' },
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
    grossResolvedOneMesPl: 190,
    positiveModelGroups: 1,
    negativeModelGroups: 0,
    unresolvedModelGroups: 0,
    livePromotionAllowedRows: 0,
  },
  modelTiming: [],
  rows: [
    {
      ticketId: 'selected-a',
      tradeDate: '2026-06-29',
      session: 'lunch',
      setupType: 'AfterLunchDriveFvgContinuation',
      direction: 'LONG',
      outcomeBucket: 'winner_t1_t2',
      outcomeLabel: 't1_and_t2_hit',
      resolvedOneMesPl: 110,
      proofTime: '2026-06-29T13:15:00',
      entryHitTime: '2026-06-29T13:15:00',
      proofToEntryMinutes: 0,
      riskPoints: 11,
      mfeR: 2,
      maeR: 0.2,
      issueTags: [],
    },
    {
      ticketId: 'selected-b',
      tradeDate: '2026-06-30',
      session: 'lunch',
      setupType: 'AfterLunchDriveFvgContinuation',
      direction: 'SHORT',
      outcomeBucket: 'winner_t1_t2',
      outcomeLabel: 't1_and_t2_hit',
      resolvedOneMesPl: 110,
      proofTime: '2026-06-30T12:20:00',
      entryHitTime: '2026-06-30T12:20:00',
      proofToEntryMinutes: 0,
      riskPoints: 9,
      mfeR: 2,
      maeR: 0.2,
      issueTags: [],
    },
    {
      ticketId: 'excluded-loss',
      tradeDate: '2026-06-30',
      session: 'lunch',
      setupType: 'AfterLunchDriveFvgContinuation',
      direction: 'LONG',
      outcomeBucket: 'loss_stopped_before_t1',
      outcomeLabel: 'stopped_before_t1',
      resolvedOneMesPl: -30,
      proofTime: '2026-06-30T12:25:00',
      entryHitTime: '2026-06-30T12:25:00',
      proofToEntryMinutes: 0,
      riskPoints: 6,
      mfeR: 0.2,
      maeR: 1.2,
      issueTags: ['adverse_excursion_at_or_over_1r'],
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxySourceComparisonReport({
  reportDir: 'reports',
  validationPackagePath: 'package.json',
  sourceProofTimingPath: 'source.json',
  validationPackageReport: validationPackage,
  sourceProofTimingReport: sourceProofTiming,
}, '2026-07-19T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_afterlunch_proof_time_proxy_source_comparison');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.sourceRows, 3);
assert.equal(report.summary.packageRows, 2);
assert.equal(report.summary.matchedPackageRows, 2);
assert.equal(report.summary.missingSourceRows, 0);
assert.equal(report.summary.packageWinners, 2);
assert.equal(report.summary.packageLosses, 0);
assert.equal(report.summary.packageOneMesPl, 220);
assert.equal(report.summary.fullSourceLosses, 1);
assert.equal(report.summary.excludedSourceRows, 1);
assert.equal(report.summary.excludedSourceLosses, 1);
assert.equal(report.summary.freshReplayValidated, false);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendation, 'build_fresh_outcome_replay_for_package');
assert.equal(report.byProxy.length, 2);
assert.match(report.markdown, /Source Comparison/);

const missing = buildUnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxySourceComparisonReport({
  reportDir: 'reports',
  validationPackagePath: null,
  sourceProofTimingPath: null,
  validationPackageReport: null,
  sourceProofTimingReport: null,
}, '2026-07-19T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing AfterLunch proxy validation package path'));
assert.ok(missing.blockers.includes('missing source/proof timing path'));

console.log('unified positive held-local AfterLunch proof-time proxy source comparison verified.');
