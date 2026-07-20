import assert from 'node:assert/strict';
import { buildUnifiedPositiveHeldLocalPreviewAfterLunchProofContextQueueReport } from './unified-positive-held-local-preview-afterlunch-proof-context-queue';
import type { UnifiedPositiveHeldLocalPreviewAfterLunchChangedSlateDrilldownReport } from './unified-positive-held-local-preview-afterlunch-changed-slate-drilldown';
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

function timingRow(id: string, overrides: Partial<UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow> = {}): UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow {
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
    riskPoints: 12,
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
    evaluatedRows: 4,
    winners: 3,
    losses: 1,
    unresolved: 0,
    blocked: 0,
    grossResolvedOneMesPl: 250,
    positiveModelGroups: 1,
    negativeModelGroups: 0,
    unresolvedModelGroups: 0,
    livePromotionAllowedRows: 0,
  },
  modelTiming: [],
  rows: [
    timingRow('baseline', { proofTime: '2026-06-10T13:00:00', resolvedOneMesPl: 125 }),
    timingRow('replacement', { proofTime: '2026-06-10T13:05:00', resolvedOneMesPl: 115, riskPoints: 11 }),
    timingRow('next-slate', { tradeDate: '2026-06-11', proofTime: '2026-06-11T13:00:00', resolvedOneMesPl: 110 }),
    timingRow('other-model', { setupType: 'TurtleSoup', proofTime: '2026-06-11T13:05:00' }),
  ],
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
      ticketId: 'replacement',
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

const report = buildUnifiedPositiveHeldLocalPreviewAfterLunchProofContextQueueReport({
  reportDir: 'reports',
  sourceProofTimingPath: 'timing.json',
  sourceProofTimingReport,
  changedSlateDrilldownPath: 'drilldown.json',
  changedSlateDrilldownReport,
}, '2026-07-19T00:02:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_afterlunch_proof_context_queue');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.summary.sourceRows, 3);
assert.equal(report.summary.queueRows, 3);
assert.equal(report.summary.slates, 2);
assert.equal(report.summary.firstValidProofRows, 2);
assert.equal(report.summary.changedSlateRows, 2);
assert.equal(report.summary.highPriorityRows, 2);
assert.equal(report.summary.recommendation, 'run_afterlunch_specific_proof_context_enrichment');
assert.equal(report.rows[0].ticketId, 'baseline');
assert.equal(report.rows[0].enrichmentPriority, 100);
assert.equal(report.rows[0].changedSlateBaselineTop, true);
assert.equal(report.rows[1].ticketId, 'replacement');
assert.equal(report.rows[1].enrichmentPriority, 90);
assert.equal(report.rows.every((row) => row.runtimeRankConsumerAllowed === false), true);
assert.match(report.markdown, /AfterLunch Proof-Context Queue/);

const missing = buildUnifiedPositiveHeldLocalPreviewAfterLunchProofContextQueueReport({
  reportDir: 'reports',
  sourceProofTimingPath: null,
  sourceProofTimingReport: null,
  changedSlateDrilldownPath: null,
  changedSlateDrilldownReport: null,
}, '2026-07-19T00:03:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing source/proof timing path'));

console.log('unified positive held-local AfterLunch proof-context queue verified.');
