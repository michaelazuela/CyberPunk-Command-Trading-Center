import assert from 'node:assert/strict';
import { buildUnifiedPositiveHeldLocalPreviewAfterLunchTimingSelectionSimulationReport } from './unified-positive-held-local-preview-afterlunch-timing-selection-simulation';
import type { UnifiedPositiveHeldLocalPreviewAfterLunchTimingFieldMinerReport } from './unified-positive-held-local-preview-afterlunch-timing-field-miner';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport, UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow } from './unified-positive-held-local-preview-replay-package-source-proof-timing';

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

function row(id: string, overrides: Partial<UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow> = {}): UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow {
  return {
    ticketId: id,
    tradeDate: id.slice(0, 10),
    session: 'lunch',
    setupType: 'NoInstalledSetup',
    direction: 'LONG',
    outcomeBucket: 'winner_t1_t2',
    outcomeLabel: 't1_and_t2_hit',
    resolvedOneMesPl: 100,
    proofTime: `${id.slice(0, 10)}T13:00:00`,
    entryHitTime: `${id.slice(0, 10)}T13:05:00`,
    proofToEntryMinutes: 5,
    riskPoints: 9,
    mfeR: 2,
    maeR: 0.5,
    issueTags: [],
    ...overrides,
  };
}

const timingReport: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport = {
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
    row('2026-06-10-lunch-early-loss', {
      outcomeBucket: 'loss_stopped_before_t1',
      outcomeLabel: 'stopped_before_t1',
      resolvedOneMesPl: -50,
      proofTime: '2026-06-10T13:00:00',
      riskPoints: 9,
    }),
    row('2026-06-10-lunch-later-win', {
      resolvedOneMesPl: 125,
      proofTime: '2026-06-10T13:10:00',
      riskPoints: 11,
    }),
    row('2026-06-11-lunch-early-win', {
      tradeDate: '2026-06-11',
      resolvedOneMesPl: 100,
      proofTime: '2026-06-11T12:05:00',
      riskPoints: 7,
    }),
    row('2026-06-11-lunch-later-win', {
      tradeDate: '2026-06-11',
      resolvedOneMesPl: 110,
      proofTime: '2026-06-11T13:05:00',
      riskPoints: 9,
    }),
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const fieldMinerReport: UnifiedPositiveHeldLocalPreviewAfterLunchTimingFieldMinerReport = {
  reportType: 'unified_positive_held_local_preview_afterlunch_timing_field_miner',
  generatedAt: '2026-07-19T00:01:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: 'reports', sourceProofTimingPath: 'timing.json' },
  assumptions: {
    savedReportsOnly: true,
    afterLunchOnly: true,
    knownAtPlanFieldsOnly: true,
    outcomeFieldsUsedOnlyForResearchLabels: true,
    noRuntimeRankingChange: true,
    runtimeRankConsumerAllowedByThisReport: false,
  },
  summary: {
    rows: 4,
    winners: 3,
    losses: 1,
    unresolved: 0,
    grossResolvedOneMesPl: 285,
    fieldBuckets: 2,
    positiveCandidates: 1,
    cautionCandidates: 1,
    bestPositiveCandidate: 'riskBucket=10.25-12',
    bestCautionCandidate: 'riskBucket=8.25-10',
    runtimeRankConsumerAllowedByThisReport: false,
    recommendation: 'validate_candidates_in_selection_simulation',
  },
  buckets: [
    {
      bucketId: 'riskBucket=10.25-12',
      field: 'riskBucket',
      value: '10.25-12',
      rows: 1,
      winners: 1,
      losses: 0,
      unresolved: 0,
      grossResolvedOneMesPl: 125,
      winnerRate: 1,
      lossRate: 0,
      verdict: 'positive_candidate',
    },
    {
      bucketId: 'riskBucket=8.25-10',
      field: 'riskBucket',
      value: '8.25-10',
      rows: 2,
      winners: 1,
      losses: 1,
      unresolved: 0,
      grossResolvedOneMesPl: 60,
      winnerRate: 0.5,
      lossRate: 0.5,
      verdict: 'caution_candidate',
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewAfterLunchTimingSelectionSimulationReport({
  reportDir: 'reports',
  sourceProofTimingPath: 'timing.json',
  sourceProofTimingReport: timingReport,
  fieldMinerPath: 'miner.json',
  fieldMinerReport,
}, '2026-07-19T00:02:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_afterlunch_timing_selection_simulation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.assumptions.runtimeRankConsumerAllowedByThisReport, false);
assert.equal(report.summary.rows, 4);
assert.equal(report.summary.slates, 2);
assert.equal(report.summary.changedSlates, 1);
assert.equal(report.summary.baselineTopOneMesPl, 50);
assert.equal(report.summary.simulatedTopOneMesPl, 225);
assert.equal(report.summary.topSelectionDeltaOneMesPl, 175);
assert.equal(report.summary.changedResolvedDeltaOneMesPl, 175);
assert.equal(report.summary.recommendation, 'validate_on_broader_history');
assert.equal(report.scoring.positiveCandidates[0], 'riskBucket=10.25-12');
assert.equal(report.scoring.cautionCandidates[0], 'riskBucket=8.25-10');
assert.match(report.markdown, /AfterLunch Timing Selection Simulation/);

const missing = buildUnifiedPositiveHeldLocalPreviewAfterLunchTimingSelectionSimulationReport({
  reportDir: 'reports',
  sourceProofTimingPath: null,
  sourceProofTimingReport: null,
  fieldMinerPath: null,
  fieldMinerReport: null,
}, '2026-07-19T00:03:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing source/proof timing path'));
assert.ok(missing.blockers.includes('missing AfterLunch timing field miner path'));

console.log('unified positive held-local AfterLunch timing selection simulation verified.');
