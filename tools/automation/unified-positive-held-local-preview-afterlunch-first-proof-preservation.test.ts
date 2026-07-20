import assert from 'node:assert/strict';
import { buildUnifiedPositiveHeldLocalPreviewAfterLunchFirstProofPreservationReport } from './unified-positive-held-local-preview-afterlunch-first-proof-preservation';
import type { UnifiedPositiveHeldLocalPreviewAfterLunchChangedSlateDrilldownReport } from './unified-positive-held-local-preview-afterlunch-changed-slate-drilldown';
import type { UnifiedPositiveHeldLocalPreviewAfterLunchTimingSelectionSimulationReport } from './unified-positive-held-local-preview-afterlunch-timing-selection-simulation';

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

const selectionSimulationReport: UnifiedPositiveHeldLocalPreviewAfterLunchTimingSelectionSimulationReport = {
  reportType: 'unified_positive_held_local_preview_afterlunch_timing_selection_simulation',
  generatedAt: '2026-07-19T00:00:00.000Z',
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
    cautionCandidates: ['proofHour=13'],
    positiveBoostPoints: 100,
    cautionPenaltyPoints: 100,
  },
  summary: {
    rows: 2,
    slates: 1,
    changedSlates: 1,
    baselineTopOneMesPl: 125,
    simulatedTopOneMesPl: 115,
    topSelectionDeltaOneMesPl: -10,
    changedResolvedDeltaOneMesPl: -10,
    runtimeRankConsumerAllowedByThisReport: false,
    recommendation: 'keep_research_only',
  },
  slates: [{
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
  }],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const changedSlateDrilldownReport: UnifiedPositiveHeldLocalPreviewAfterLunchChangedSlateDrilldownReport = {
  reportType: 'unified_positive_held_local_preview_afterlunch_changed_slate_drilldown',
  generatedAt: '2026-07-19T00:01:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: 'reports', sourceProofTimingPath: 'timing.json', selectionSimulationPath: 'selection.json' },
  assumptions: {
    savedReportsOnly: true,
    afterLunchChangedSlatesOnly: true,
    outcomesUsedOnlyForEvaluation: true,
    noRuntimeRankingChange: true,
    runtimeRankConsumerAllowedByThisReport: false,
  },
  summary: {
    changedSlates: 1,
    rows: 2,
    baselineWinnerRows: 1,
    simulatedWinnerRows: 1,
    totalChangedDeltaOneMesPl: -10,
    runtimeRankConsumerAllowedByThisReport: false,
    recommendation: 'inspect_first_proof_preservation',
  },
  rows: [
    {
      ticketId: 'baseline',
      slateId: '2026-06-10|lunch',
      proofTime: '2026-06-10T13:00:00',
      direction: 'LONG',
      riskPoints: 13,
      riskBucket: '>12',
      outcomeBucket: 'winner_t1_t2',
      resolvedOneMesPl: 125,
      baselineTop: true,
      simulatedTop: false,
      positiveHits: [],
      cautionHits: ['proofHour=13'],
    },
    {
      ticketId: 'simulated',
      slateId: '2026-06-10|lunch',
      proofTime: '2026-06-10T13:05:00',
      direction: 'LONG',
      riskPoints: 11,
      riskBucket: '10.25-12',
      outcomeBucket: 'winner_t1_t2',
      resolvedOneMesPl: 115,
      baselineTop: false,
      simulatedTop: true,
      positiveHits: ['riskBucket=10.25-12'],
      cautionHits: ['proofHour=13'],
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewAfterLunchFirstProofPreservationReport({
  reportDir: 'reports',
  selectionSimulationPath: 'selection.json',
  selectionSimulationReport,
  changedSlateDrilldownPath: 'drilldown.json',
  changedSlateDrilldownReport,
}, '2026-07-19T00:02:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_afterlunch_first_proof_preservation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.selectionChangedSlates, 1);
assert.equal(report.summary.selectionDeltaOneMesPl, -10);
assert.equal(report.summary.baselineBetterWinnerSlates, 1);
assert.equal(report.summary.laterTighterWinnerReplacementRows, 1);
assert.equal(report.summary.recommendation, 'preserve_first_valid_proof_research_only');
assert.match(report.markdown, /First-Proof Preservation/);

const missing = buildUnifiedPositiveHeldLocalPreviewAfterLunchFirstProofPreservationReport({
  reportDir: 'reports',
  selectionSimulationPath: null,
  selectionSimulationReport: null,
  changedSlateDrilldownPath: null,
  changedSlateDrilldownReport: null,
}, '2026-07-19T00:03:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing AfterLunch selection simulation path'));
assert.ok(missing.blockers.includes('missing AfterLunch changed-slate drilldown path'));

console.log('unified positive held-local AfterLunch first-proof preservation verified.');
