import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyOosSlateComparisonReport,
} from './unified-positive-held-local-preview-afterlunch-proof-time-proxy-oos-slate-comparison';
import type {
  UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyValidationPackageReport,
} from './unified-positive-held-local-preview-afterlunch-proof-time-proxy-validation-package';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport,
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow,
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
      researchProxyCandidates: 2,
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
      packageRow('pkg-a', ['risk+hour:8.25-10|12']),
      packageRow('pkg-b', ['changedSlate:true']),
    ],
    blockers: [],
    recommendations: [],
    markdown: '',
  };
}

function packageRow(ticketId: string, matchedProxyIds: string[]): UnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyValidationPackageReport['rows'][number] {
  return {
    ticketId,
    tradeDate: '2026-06-01',
    session: 'lunch',
    setupType: 'AfterLunchDriveFvgContinuation',
    direction: 'LONG',
    proofTime: '2026-06-01T12:35:00',
    riskPoints: 9,
    proofRankInSlate: 1,
    firstValidProof: true,
    changedSlateRow: true,
    matchedProxyIds,
    outcomeBucket: 'winner_t1_t2',
    resolvedOneMesPl: 100,
    replayValidationStatus: 'queued_for_fresh_validation',
  };
}

function sourceTiming(): UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport {
  return {
    reportType: 'unified_positive_held_local_preview_replay_package_source_proof_timing',
    generatedAt: '2026-07-20T00:00:00.000Z',
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
      evaluatedRows: 4,
      winners: 3,
      losses: 1,
      unresolved: 0,
      blocked: 0,
      grossResolvedOneMesPl: 200,
      positiveModelGroups: 1,
      negativeModelGroups: 0,
      unresolvedModelGroups: 0,
      livePromotionAllowedRows: 0,
    },
    modelTiming: [],
    rows: [
      timingRow('2026-07-08-early-win', '2026-07-08T12:15:00', 7, 'winner_t1_t2', 140),
      timingRow('2026-07-08-proxy-win', '2026-07-08T12:40:00', 9, 'winner_t1_t2', 90),
      timingRow('2026-07-09-early-loss', '2026-07-09T13:00:00', 5, 'loss_stopped_before_t1', -25),
      timingRow('2026-07-09-later-win', '2026-07-09T13:05:00', 11, 'winner_t1_t2', 110),
    ],
    blockers: [],
    recommendations: [],
    markdown: '',
  };
}

function timingRow(ticketId: string, proofTime: string, riskPoints: number, outcomeBucket: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow['outcomeBucket'], resolvedOneMesPl: number): UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow {
  return {
    ticketId,
    tradeDate: proofTime.slice(0, 10),
    session: 'lunch',
    setupType: 'AfterLunchDriveFvgContinuation',
    direction: 'LONG',
    outcomeBucket,
    outcomeLabel: outcomeBucket === 'loss_stopped_before_t1' ? 'stopped_before_t1' : 't1_and_t2_hit',
    resolvedOneMesPl,
    proofTime,
    entryHitTime: proofTime,
    proofToEntryMinutes: 0,
    riskPoints,
    mfeR: outcomeBucket === 'loss_stopped_before_t1' ? 0.5 : 2,
    maeR: outcomeBucket === 'loss_stopped_before_t1' ? 1 : 0.25,
    issueTags: [],
  };
}

const report = buildUnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyOosSlateComparisonReport({
  reportDir: 'reports',
  validationPackagePath: 'validation.json',
  oosSourceProofTimingPath: 'timing.json',
  validationPackageReport: validationPackage(),
  oosSourceProofTimingReport: sourceTiming(),
}, '2026-07-20T01:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.rows, 4);
assert.equal(report.summary.slates, 2);
assert.equal(report.summary.slatesWithProxyMatch, 1);
assert.equal(report.summary.changedSlates, 1);
assert.equal(report.summary.baselineTopOneMesPl, 115);
assert.equal(report.summary.selectorTopOneMesPl, 65);
assert.equal(report.summary.topSelectionDeltaOneMesPl, -50);
assert.equal(report.summary.changedResolvedDeltaOneMesPl, -50);
assert.equal(report.summary.selectorMatchedLosses, 0);
assert.equal(report.summary.selectorChosenLosses, 1);
assert.equal(report.summary.recommendation, 'do_not_install_rank_boost');
assert.deepEqual(report.unsupportedProxyIds, ['changedSlate:true']);
assert.equal(report.slates[0].topChanged, true);
assert.equal(report.slates[1].selectorUsedFallback, true);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.writesSupabase, false);

const missing = buildUnifiedPositiveHeldLocalPreviewAfterLunchProofTimeProxyOosSlateComparisonReport({
  reportDir: 'reports',
  validationPackagePath: 'validation.json',
  oosSourceProofTimingPath: 'timing.json',
  validationPackageReport: { ...validationPackage(), rows: [packageRow('pkg-c', ['risk:>12'])] },
  oosSourceProofTimingReport: sourceTiming(),
}, '2026-07-20T01:00:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('no OOS AfterLunch slates had a proxy match'));

console.log('unified positive held-local AfterLunch proof-time proxy OOS slate comparison verified.');
