import assert from 'node:assert/strict';
import { buildUnifiedPositiveHeldLocalPreviewAfterLunchChangedSlateDrilldownReport } from './unified-positive-held-local-preview-afterlunch-changed-slate-drilldown';
import type { UnifiedPositiveHeldLocalPreviewAfterLunchTimingSelectionSimulationReport } from './unified-positive-held-local-preview-afterlunch-timing-selection-simulation';
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
    tradeDate: '2026-06-10',
    session: 'lunch',
    setupType: 'AfterLunchDriveFvgContinuation',
    direction: 'LONG',
    outcomeBucket: 'winner_t1_t2',
    outcomeLabel: 't1_and_t2_hit',
    resolvedOneMesPl: 100,
    proofTime: '2026-06-10T13:00:00',
    entryHitTime: '2026-06-10T13:05:00',
    proofToEntryMinutes: 5,
    riskPoints: 9,
    mfeR: 2,
    maeR: 0.5,
    issueTags: [],
    ...overrides,
  };
}

const sourceProofTimingReport: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport = {
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
    winners: 3,
    losses: 0,
    unresolved: 0,
    blocked: 0,
    grossResolvedOneMesPl: 310,
    positiveModelGroups: 1,
    negativeModelGroups: 0,
    unresolvedModelGroups: 0,
    livePromotionAllowedRows: 0,
  },
  modelTiming: [],
  rows: [
    row('baseline', { resolvedOneMesPl: 125, proofTime: '2026-06-10T13:00:00', riskPoints: 9 }),
    row('simulated', { resolvedOneMesPl: 115, proofTime: '2026-06-10T13:05:00', riskPoints: 11 }),
    row('other', { resolvedOneMesPl: 70, proofTime: '2026-06-11T13:05:00', tradeDate: '2026-06-11', riskPoints: 7 }),
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const selectionSimulationReport: UnifiedPositiveHeldLocalPreviewAfterLunchTimingSelectionSimulationReport = {
  reportType: 'unified_positive_held_local_preview_afterlunch_timing_selection_simulation',
  generatedAt: '2026-07-19T00:01:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: 'reports', sourceProofTimingPath: 'timing.json', fieldMinerPath: 'miner.json' },
  assumptions: {
    savedReportsOnly: true,
    afterLunchOnly: true,
    baselineUsesEarliestProofPerSlate: true,
    simulatedUsesKnownAtPlanFieldsOnly: true,
    outcomesUsedOnlyForEvaluation: true,
    noRuntimeRankingChange: true,
    runtimeRankConsumerAllowedByThisReport: false,
  },
  scoring: {
    positiveCandidates: ['riskBucket=10.25-12'],
    cautionCandidates: ['riskBucket=8.25-10'],
    positiveBoostPoints: 100,
    cautionPenaltyPoints: 100,
  },
  summary: {
    rows: 3,
    slates: 2,
    changedSlates: 1,
    baselineTopOneMesPl: 195,
    simulatedTopOneMesPl: 185,
    topSelectionDeltaOneMesPl: -10,
    changedResolvedDeltaOneMesPl: -10,
    runtimeRankConsumerAllowedByThisReport: false,
    recommendation: 'keep_research_only',
  },
  slates: [
    {
      slateId: '2026-06-10|lunch',
      rows: 2,
      baselineTicketId: 'baseline',
      baselineOutcomeBucket: 'winner_t1_t2',
      baselineOneMesPl: 125,
      simulatedTicketId: 'simulated',
      simulatedOutcomeBucket: 'winner_t1_t2',
      simulatedOneMesPl: 115,
      topChanged: true,
      deltaOneMesPl: -10,
    },
    {
      slateId: '2026-06-11|lunch',
      rows: 1,
      baselineTicketId: 'other',
      baselineOutcomeBucket: 'winner_t1_t2',
      baselineOneMesPl: 70,
      simulatedTicketId: 'other',
      simulatedOutcomeBucket: 'winner_t1_t2',
      simulatedOneMesPl: 70,
      topChanged: false,
      deltaOneMesPl: 0,
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewAfterLunchChangedSlateDrilldownReport({
  reportDir: 'reports',
  sourceProofTimingPath: 'timing.json',
  sourceProofTimingReport,
  selectionSimulationPath: 'selection.json',
  selectionSimulationReport,
}, '2026-07-19T00:02:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_afterlunch_changed_slate_drilldown');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.changedSlates, 1);
assert.equal(report.summary.rows, 2);
assert.equal(report.summary.baselineWinnerRows, 1);
assert.equal(report.summary.simulatedWinnerRows, 1);
assert.equal(report.summary.totalChangedDeltaOneMesPl, -10);
assert.equal(report.summary.recommendation, 'inspect_first_proof_preservation');

const baseline = report.rows.find((row) => row.ticketId === 'baseline');
const simulated = report.rows.find((row) => row.ticketId === 'simulated');
assert.equal(baseline?.baselineTop, true);
assert.deepEqual(baseline?.cautionHits, ['riskBucket=8.25-10']);
assert.equal(simulated?.simulatedTop, true);
assert.deepEqual(simulated?.positiveHits, ['riskBucket=10.25-12']);
assert.match(report.markdown, /Changed-Slate Drilldown/);

const missing = buildUnifiedPositiveHeldLocalPreviewAfterLunchChangedSlateDrilldownReport({
  reportDir: 'reports',
  sourceProofTimingPath: null,
  sourceProofTimingReport: null,
  selectionSimulationPath: null,
  selectionSimulationReport: null,
}, '2026-07-19T00:03:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing source/proof timing path'));
assert.ok(missing.blockers.includes('missing AfterLunch selection simulation path'));

console.log('unified positive held-local AfterLunch changed-slate drilldown verified.');
