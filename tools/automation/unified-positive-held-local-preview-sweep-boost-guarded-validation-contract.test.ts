import assert from 'node:assert/strict';
import { buildUnifiedPositiveHeldLocalPreviewSweepBoostGuardedValidationContractReport } from './unified-positive-held-local-preview-sweep-boost-guarded-validation-contract';
import type { UnifiedPositiveHeldLocalPreviewSweepBoostGuardedSelectionSimulationReport } from './unified-positive-held-local-preview-sweep-boost-guarded-selection-simulation';

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

function simulation(period: 'train' | 'test'): UnifiedPositiveHeldLocalPreviewSweepBoostGuardedSelectionSimulationReport {
  return {
    reportType: 'unified_positive_held_local_preview_sweep_boost_guarded_selection_simulation',
    generatedAt: '2026-07-20T00:00:00.000Z',
    status: 'pass',
    authority,
    source: {
      reportDir: 'reports',
      boostValidationPath: 'boost.json',
      guardMinerPath: 'guard.json',
      period,
      guardFeature: 'session_direction=morning|SHORT&&txt_rth_morning',
    },
    assumptions: {
      savedReportsOnly: true,
      rawBoostRemainsHypothetical: true,
      guardIsHypotheticalOnly: true,
      usesOutcomeOnlyForEvaluation: true,
      noRuntimeRankingChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      slates: 10,
      rawChangedSlates: 4,
      revertedByGuard: 2,
      revertedImprovedSlates: period === 'test' ? 1 : 0,
      revertedWorsenedSlates: 2,
      revertedSameSlates: 0,
      baselineOneMesPl: 100,
      rawBoostOneMesPl: 150,
      guardedOneMesPl: 225,
      rawBoostDeltaOneMesPl: 50,
      guardedDeltaOneMesPl: 125,
      guardImprovementOverRawOneMesPl: 75,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: 'fresh_validate_guard_before_live',
    },
    slates: [],
    blockers: [],
    recommendations: [],
    markdown: '',
  };
}

const report = buildUnifiedPositiveHeldLocalPreviewSweepBoostGuardedValidationContractReport({
  reportDir: 'reports',
  trainSimulationPath: 'train.json',
  trainSimulationReport: simulation('train'),
  testSimulationPath: 'test.json',
  testSimulationReport: simulation('test'),
}, '2026-07-20T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_sweep_boost_guarded_validation_contract');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.researchContractReady, true);
assert.equal(report.summary.guardFeature, 'session_direction=morning|SHORT&&txt_rth_morning');
assert.equal(report.summary.recommendation, 'wait_for_fresh_unseen_artifact');
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.ok(report.freshValidationRequirements.some((item) => item.includes('fresh unseen raw scanner artifact')));
assert.ok(report.commandTemplate.some((item) => item.includes('guarded-selection-simulation')));
assert.match(report.markdown, /Validation Contract/);

const missing = buildUnifiedPositiveHeldLocalPreviewSweepBoostGuardedValidationContractReport({
  reportDir: 'reports',
  trainSimulationPath: null,
  trainSimulationReport: null,
  testSimulationPath: null,
  testSimulationReport: null,
}, '2026-07-20T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing train guarded selection simulation path'));
assert.ok(missing.blockers.includes('missing test guarded selection simulation path'));

console.log('unified positive held-local Sweep boost guarded validation contract verified.');
