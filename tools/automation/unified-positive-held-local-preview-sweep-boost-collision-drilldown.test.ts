import assert from 'node:assert/strict';
import { buildUnifiedPositiveHeldLocalPreviewSweepBoostCollisionDrilldownReport } from './unified-positive-held-local-preview-sweep-boost-collision-drilldown';
import type { UnifiedPositiveHeldLocalPreviewPositiveFamilyBoostValidationReport } from './unified-positive-held-local-preview-positive-family-boost-validation';
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

function timingRow(id: string, overrides: Partial<UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow> = {}): UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow {
  return {
    ticketId: id,
    tradeDate: '2026-07-09',
    session: 'morning',
    setupType: 'NoInstalledSetup',
    direction: 'SHORT',
    outcomeBucket: 'loss_stopped_before_t1',
    outcomeLabel: 'stopped_before_t1',
    resolvedOneMesPl: -95,
    proofTime: '2026-07-09T09:35:00',
    entryHitTime: '2026-07-09T09:35:00',
    proofToEntryMinutes: 0,
    riskPoints: 7,
    mfeR: 0.2,
    maeR: 1.4,
    issueTags: ['stopped_before_t1', 'same_bar_entry', 'adverse_excursion_at_or_over_1r'],
    ...overrides,
  };
}

const timingReport: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport = {
  reportType: 'unified_positive_held_local_preview_replay_package_source_proof_timing',
  generatedAt: '2026-07-20T00:00:00.000Z',
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
    evaluatedRows: 4,
    winners: 2,
    losses: 2,
    unresolved: 0,
    blocked: 0,
    grossResolvedOneMesPl: 65,
    positiveModelGroups: 1,
    negativeModelGroups: 0,
    unresolvedModelGroups: 0,
    livePromotionAllowedRows: 0,
  },
  modelTiming: [],
  rows: [
    timingRow('opening-winner', {
      setupType: 'NoInstalledSetup',
      outcomeBucket: 'winner_t1_t2',
      outcomeLabel: 't1_and_t2_hit',
      resolvedOneMesPl: 100,
      issueTags: ['full_delivery'],
      proofToEntryMinutes: 5,
      riskPoints: 9,
    }),
    timingRow('sweep-loss'),
    timingRow('sweep-better', {
      ticketId: 'sweep-better',
      tradeDate: '2026-07-10',
      resolvedOneMesPl: 50,
      outcomeBucket: 'winner_t1_t2',
      outcomeLabel: 't1_and_t2_hit',
      issueTags: ['full_delivery'],
      proofToEntryMinutes: 15,
      riskPoints: 11,
    }),
    timingRow('htf-lower', {
      ticketId: 'htf-lower',
      tradeDate: '2026-07-10',
      setupType: 'NoInstalledSetup',
      outcomeBucket: 'winner_t1_t2',
      outcomeLabel: 't1_and_t2_hit',
      resolvedOneMesPl: 25,
      issueTags: ['full_delivery'],
      proofToEntryMinutes: 20,
      riskPoints: 8,
    }),
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const boostReport: UnifiedPositiveHeldLocalPreviewPositiveFamilyBoostValidationReport = {
  reportType: 'unified_positive_held_local_preview_positive_family_boost_validation',
  generatedAt: '2026-07-20T00:01:00.000Z',
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
    sourceRows: 4,
    positiveFamilyRows: 2,
    boostCandidateModels: 1,
    slates: 2,
    topChangedSlates: 2,
    topBeforeOneMesPl: 125,
    topAfterOneMesPl: -45,
    topSelectionDeltaOneMesPl: -170,
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
      topAfterOneMesPl: -95,
      topChanged: true,
    },
    {
      slateId: '2026-07-10|morning',
      tradeDate: '2026-07-10',
      session: 'morning',
      rows: 2,
      topBeforeTicketId: 'htf-lower',
      topBeforeSetupType: 'NoInstalledSetup',
      topBeforeOneMesPl: 25,
      topAfterTicketId: 'sweep-better',
      topAfterSetupType: 'NoInstalledSetup',
      topAfterOneMesPl: 50,
      topChanged: true,
    },
  ],
  rows: [],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewSweepBoostCollisionDrilldownReport({
  reportDir: 'reports',
  sourceProofTimingPath: 'timing.json',
  sourceProofTimingReport: timingReport,
  boostValidationPath: 'boost.json',
  boostValidationReport: boostReport,
}, '2026-07-20T00:02:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_sweep_boost_collision_drilldown');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.changedSlates, 2);
assert.equal(report.summary.improvedSlates, 1);
assert.equal(report.summary.worsenedSlates, 1);
assert.equal(report.summary.changedTopSelectionDeltaOneMesPl, -170);
assert.equal(report.summary.worsenedDeltaOneMesPl, -195);
assert.equal(report.summary.worsenedWhereAfterSweep, 1);
assert.equal(report.summary.worsenedWhereBeforeWinner, 1);
assert.equal(report.summary.recommendation, 'mine_worsened_sweep_guard');
assert.equal(report.worsenedByBeforeSetup[0]?.key, 'NoInstalledSetup');
assert.equal(report.worsenedByAfterIssueTag.find((row) => row.key === 'same_bar_entry')?.rows, 1);
assert.equal(report.worsenedByAfterProofToEntryBucket[0]?.key, 'same_bar');
assert.equal(report.worsenedByAfterRiskBucket[0]?.key, '6.25-8');
assert.match(report.markdown, /Sweep Boost Collision Drilldown/);

const wrongFamily = buildUnifiedPositiveHeldLocalPreviewSweepBoostCollisionDrilldownReport({
  reportDir: 'reports',
  sourceProofTimingPath: 'timing.json',
  sourceProofTimingReport: timingReport,
  boostValidationPath: 'boost.json',
  boostValidationReport: {
    ...boostReport,
    source: { ...boostReport.source, selectedSetupTypes: ['NoInstalledSetup'] },
  },
}, '2026-07-20T00:03:00.000Z');

assert.equal(wrongFamily.status, 'fail');
assert.ok(wrongFamily.blockers.some((item) => item.includes('expected Sweep-only boost validation')));

console.log('unified positive held-local Sweep boost collision drilldown verified.');
