import assert from 'node:assert/strict';
import { buildUnifiedPositiveHeldLocalPreviewAfterLunchTimingFieldMinerReport } from './unified-positive-held-local-preview-afterlunch-timing-field-miner';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport, UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow } from './unified-positive-held-local-preview-replay-package-source-proof-timing';

function row(id: string, proofTime: string, riskPoints: number, outcomeBucket: 'winner_t1_t2' | 'loss_stopped_before_t1', resolvedOneMesPl: number): UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow {
  return {
    ticketId: id,
    tradeDate: '2026-06-10',
    session: 'lunch',
    setupType: 'NoInstalledSetup',
    direction: 'LONG',
    outcomeBucket,
    outcomeLabel: outcomeBucket === 'winner_t1_t2' ? 't1_and_t2_hit' : 'stopped_before_t1',
    resolvedOneMesPl,
    proofTime,
    entryHitTime: proofTime,
    proofToEntryMinutes: 0,
    riskPoints,
    mfeR: 2,
    maeR: 1,
    issueTags: [],
  };
}

const rows: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow[] = [
  ...Array.from({ length: 10 }, (_, index) => row(`winner-${index}`, '2026-06-10T12:00:00', 11, 'winner_t1_t2', 100)),
  ...Array.from({ length: 3 }, (_, index) => row(`loss-${index}`, '2026-06-10T13:00:00', 5, 'loss_stopped_before_t1', -50)),
  { ...row('other-model', '2026-06-10T12:00:00', 10, 'winner_t1_t2', 100), setupType: 'NoInstalledSetup' },
];

const timingReport: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport = {
  reportType: 'unified_positive_held_local_preview_replay_package_source_proof_timing',
  generatedAt: '2026-07-19T00:00:00.000Z',
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
    evaluatedRows: rows.length,
    winners: 11,
    losses: 3,
    unresolved: 0,
    blocked: 0,
    grossResolvedOneMesPl: 950,
    positiveModelGroups: 1,
    negativeModelGroups: 0,
    unresolvedModelGroups: 0,
    livePromotionAllowedRows: 0,
  },
  modelTiming: [],
  rows,
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewAfterLunchTimingFieldMinerReport({
  sourceProofTimingPath: 'synthetic-timing.json',
  sourceProofTimingReport: timingReport,
}, '2026-07-19T00:01:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.rows, 14);
assert.equal(report.summary.winners, 11);
assert.equal(report.summary.losses, 3);
assert.equal(report.summary.grossResolvedOneMesPl, 950);
assert.equal(report.summary.positiveCandidates, 2);
assert.equal(report.summary.bestPositiveCandidate, 'proofHour=12');
assert.equal(report.summary.runtimeRankConsumerAllowedByThisReport, false);
assert.equal(report.summary.recommendation, 'validate_candidates_in_selection_simulation');
assert.match(report.markdown, /AfterLunch Timing Field Miner/);

console.log('unified positive held-local AfterLunch timing field miner verified.');
