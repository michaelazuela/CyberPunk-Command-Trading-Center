import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewSweepBoostFreshPackagePlanReport,
} from './unified-positive-held-local-preview-sweep-boost-fresh-package-plan';
import type {
  UnifiedPositiveHeldLocalPreviewSweepBoostFreshValidationReadinessReport,
} from './unified-positive-held-local-preview-sweep-boost-fresh-validation-readiness';

const baseReadiness: UnifiedPositiveHeldLocalPreviewSweepBoostFreshValidationReadinessReport = {
  reportType: 'unified_positive_held_local_preview_sweep_boost_fresh_validation_readiness',
  generatedAt: '2026-07-20T00:00:00.000Z',
  status: 'pass',
  authority: {
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
  },
  source: {
    reportDir: 'reports',
    validationContractPath: 'validation-contract.json',
  },
  assumptions: {
    savedReportsOnly: true,
    readinessAuditOnly: true,
    noFreshDataGeneration: true,
    noRuntimeRankingChange: true,
    livePromotionAllowed: false,
  },
  lockedEvidence: {
    guardFeature: 'session_direction=morning|SHORT&&txt_rth_morning',
    trainArtifactPath: 'raw-ohlc-scanner-artifacts-MES-2026-06-01-to-2026-07-02-1.json',
    testArtifactPath: 'raw-ohlc-scanner-artifacts-MES-2026-07-03-to-2026-07-17-1.json',
    latestLockedEndDate: '2026-07-17',
  },
  summary: {
    rawArtifactsScanned: 60,
    candidateArtifactsAfterLockedEnd: 0,
    completeCandidatePackages: 0,
    bestCandidateArtifactPath: null,
    freshValidationReady: false,
    livePromotionAllowedRows: 0,
    recommendation: 'generate_fresh_unseen_saved_package',
  },
  candidates: [],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const noCandidate = buildUnifiedPositiveHeldLocalPreviewSweepBoostFreshPackagePlanReport({
  reportDir: 'reports',
  readinessPath: 'readiness.json',
  readinessReport: baseReadiness,
}, '2026-07-20T00:00:00.000Z');

assert.equal(noCandidate.status, 'pass');
assert.equal(noCandidate.summary.recommendation, 'build_fresh_unseen_package');
assert.equal(noCandidate.summary.requirementsSatisfied, 0);
assert.equal(noCandidate.summary.missingRequirements, 4);
assert.equal(noCandidate.lockedBoundary.minimumFreshArtifactEndDateExclusive, '2026-07-17');
assert.equal(noCandidate.summary.livePromotionAllowedRows, 0);
assert.equal(noCandidate.authority.postsDiscord, false);
assert.equal(noCandidate.authority.writesSupabase, false);
assert.equal(noCandidate.authority.readsLiveBridge, false);
assert.equal(noCandidate.authority.changesTradingLogic, false);
assert.ok(noCandidate.nextCommands.some((item) => item.includes('diagnostic:bridge-fresh-package-ready-gate')));
assert.ok(noCandidate.nextCommands.some((item) => item.includes('research:raw-ohlc-scanner-artifacts')));
assert.ok(noCandidate.nextCommands.some((item) => item.includes('--market-bars-json <fresh-market-bars-json>')));
assert.ok(noCandidate.nextCommands.some((item) => item.includes('--sessions morning,lunch')));
assert.ok(noCandidate.recommendations.some((item) => item.includes('Do not reuse')));

const completeCandidate = buildUnifiedPositiveHeldLocalPreviewSweepBoostFreshPackagePlanReport({
  reportDir: 'reports',
  readinessPath: 'readiness.json',
  readinessReport: {
    ...baseReadiness,
    summary: {
      ...baseReadiness.summary,
      candidateArtifactsAfterLockedEnd: 1,
      completeCandidatePackages: 1,
      bestCandidateArtifactPath: 'fresh-artifact.json',
      freshValidationReady: true,
      recommendation: 'run_fresh_validation_contract',
    },
    candidates: [{
      artifactPath: 'fresh-artifact.json',
      startDate: '2026-07-18',
      endDate: '2026-07-20',
      replayPackagePath: 'fresh-replay.json',
      outcomePath: 'fresh-outcome.json',
      sourceProofTimingPath: 'fresh-timing.json',
      complete: true,
      missing: [],
    }],
  },
}, '2026-07-20T00:00:00.000Z');

assert.equal(completeCandidate.status, 'pass');
assert.equal(completeCandidate.summary.recommendation, 'run_locked_validation');
assert.equal(completeCandidate.summary.requirementsSatisfied, 4);
assert.equal(completeCandidate.summary.missingRequirements, 0);
assert.equal(completeCandidate.selectedCandidate.complete, true);
assert.equal(completeCandidate.requirements.every((item) => item.satisfied), true);
assert.ok(completeCandidate.nextCommands.some((item) => item.includes('sweep-boost-guarded-selection-simulation')));

const failedReadiness = buildUnifiedPositiveHeldLocalPreviewSweepBoostFreshPackagePlanReport({
  reportDir: 'reports',
  readinessPath: 'readiness.json',
  readinessReport: {
    ...baseReadiness,
    status: 'fail',
  },
}, '2026-07-20T00:00:00.000Z');

assert.equal(failedReadiness.status, 'fail');
assert.equal(failedReadiness.summary.recommendation, 'fix_readiness_inputs');
assert.ok(failedReadiness.blockers.some((item) => item.includes('readiness status fail')));

console.log('unified positive held-local Sweep boost fresh package plan verified.');
