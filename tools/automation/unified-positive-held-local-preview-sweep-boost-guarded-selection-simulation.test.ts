import assert from 'node:assert/strict';
import { buildUnifiedPositiveHeldLocalPreviewSweepBoostGuardedSelectionSimulationReport } from './unified-positive-held-local-preview-sweep-boost-guarded-selection-simulation';
import type { UnifiedPositiveHeldLocalPreviewPositiveFamilyBoostValidationReport } from './unified-positive-held-local-preview-positive-family-boost-validation';
import type { UnifiedPositiveHeldLocalPreviewSweepBoostCollisionSnapshotGuardMinerReport } from './unified-positive-held-local-preview-sweep-boost-collision-snapshot-guard-miner';

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

const boostReport: UnifiedPositiveHeldLocalPreviewPositiveFamilyBoostValidationReport = {
  reportType: 'unified_positive_held_local_preview_positive_family_boost_validation',
  generatedAt: '2026-07-20T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    reportDir: 'reports',
    sourceProofTimingPath: 'timing.json',
    selectedSetupTypes: ['NoInstalledSetup'],
  },
  assumptions: {
    validationIsResearchOnly: true,
    boostIsHypotheticalOnly: true,
    usesOutcomeForEvaluationNotScoring: true,
    modelFamilyIsPreOutcomeFeature: true,
    noRankBoostInstalled: true,
    noCanExecuteChange: true,
    livePromotionAllowed: false,
  },
  scoring: {
    positiveFamilyBoostPoints: 12,
    baselineDoesNotUseOutcome: true,
  },
  summary: {
    sourceRows: 3,
    positiveFamilyRows: 2,
    boostCandidateModels: 1,
    slates: 2,
    topChangedSlates: 2,
    topBeforeOneMesPl: 140,
    topAfterOneMesPl: -10,
    topSelectionDeltaOneMesPl: -150,
    recommendedAction: 'broader_replay_validate_positive_families_separately',
    livePromotionAllowedRows: 0,
  },
  models: [],
  slates: [
    {
      slateId: '2026-07-09|morning',
      tradeDate: '2026-07-09',
      session: 'morning',
      rows: 2,
      topBeforeTicketId: 'opening-winner',
      topBeforeSetupType: 'NoInstalledSetup',
      topBeforeOneMesPl: 100,
      topAfterTicketId: 'sweep-loss',
      topAfterSetupType: 'NoInstalledSetup',
      topAfterOneMesPl: -90,
      topChanged: true,
    },
    {
      slateId: '2026-07-10|morning',
      tradeDate: '2026-07-10',
      session: 'morning',
      rows: 2,
      topBeforeTicketId: 'htf-lower',
      topBeforeSetupType: 'NoInstalledSetup',
      topBeforeOneMesPl: 40,
      topAfterTicketId: 'sweep-win',
      topAfterSetupType: 'NoInstalledSetup',
      topAfterOneMesPl: 80,
      topChanged: true,
    },
  ],
  rows: [],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const guardReport: UnifiedPositiveHeldLocalPreviewSweepBoostCollisionSnapshotGuardMinerReport = {
  reportType: 'unified_positive_held_local_preview_sweep_boost_collision_snapshot_guard_miner',
  generatedAt: '2026-07-20T00:01:00.000Z',
  status: 'pass',
  authority,
  source: {
    reportDir: 'reports',
    trainCollisionPath: 'train.json',
    trainArtifactPath: 'train-artifact.json',
    testCollisionPath: 'test.json',
    testArtifactPath: 'test-artifact.json',
  },
  assumptions: {
    savedReportsOnly: true,
    extractsScannerSnapshotFieldsOnly: true,
    outcomeBucketsUsedOnlyForEvaluation: true,
    noRuntimeRankingChange: true,
    runtimeRankConsumerAllowedByThisReport: false,
  },
  summary: {
    trainRows: 0,
    testRows: 2,
    trainMatchedRows: 0,
    testMatchedRows: 2,
    cautionCandidates: 1,
    bestCandidateFeature: 'feature=rth_morning_short',
    bestCandidateTrainWorsened: 0,
    bestCandidateTestWorsened: 1,
    bestCandidateTotalDeltaOneMesPl: -190,
    runtimeRankConsumerAllowedByThisReport: false,
    recommendation: 'validate_caution_candidate',
  },
  cautionCandidates: [],
  otherSegments: [],
  rows: [
    {
      period: 'test',
      slateId: '2026-07-09|morning',
      ticketId: 'sweep-loss',
      bucket: 'worsened',
      deltaOneMesPl: -190,
      session: 'morning',
      beforeSetupType: 'NoInstalledSetup',
      direction: 'SHORT',
      features: ['feature=rth_morning_short'],
    },
    {
      period: 'test',
      slateId: '2026-07-10|morning',
      ticketId: 'sweep-win',
      bucket: 'improved',
      deltaOneMesPl: 40,
      session: 'morning',
      beforeSetupType: 'NoInstalledSetup',
      direction: 'SHORT',
      features: [],
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewSweepBoostGuardedSelectionSimulationReport({
  reportDir: 'reports',
  boostValidationPath: 'boost.json',
  boostValidationReport: boostReport,
  guardMinerPath: 'guard.json',
  guardMinerReport: guardReport,
  period: 'test',
}, '2026-07-20T00:02:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_sweep_boost_guarded_selection_simulation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.slates, 2);
assert.equal(report.summary.rawChangedSlates, 2);
assert.equal(report.summary.revertedByGuard, 1);
assert.equal(report.summary.revertedWorsenedSlates, 1);
assert.equal(report.summary.revertedImprovedSlates, 0);
assert.equal(report.summary.baselineOneMesPl, 140);
assert.equal(report.summary.rawBoostOneMesPl, -10);
assert.equal(report.summary.guardedOneMesPl, 180);
assert.equal(report.summary.rawBoostDeltaOneMesPl, -150);
assert.equal(report.summary.guardedDeltaOneMesPl, 40);
assert.equal(report.summary.guardImprovementOverRawOneMesPl, 190);
assert.equal(report.summary.recommendation, 'fresh_validate_guard_before_live');
assert.equal(report.slates[0]?.guardedTicketId, 'opening-winner');
assert.match(report.markdown, /Guarded Selection Simulation/);

const missing = buildUnifiedPositiveHeldLocalPreviewSweepBoostGuardedSelectionSimulationReport({
  reportDir: 'reports',
  boostValidationPath: null,
  boostValidationReport: null,
  guardMinerPath: null,
  guardMinerReport: null,
}, '2026-07-20T00:03:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing boost validation path'));
assert.ok(missing.blockers.includes('missing guard miner path'));

console.log('unified positive held-local Sweep boost guarded selection simulation verified.');
