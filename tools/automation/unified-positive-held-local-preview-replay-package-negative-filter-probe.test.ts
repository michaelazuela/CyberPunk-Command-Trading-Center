import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewReplayPackageNegativeFilterProbeReport,
} from './unified-positive-held-local-preview-replay-package-negative-filter-probe';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport } from './unified-positive-held-local-preview-replay-package-source-proof-timing';

const timingReport: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport = {
  reportType: 'unified_positive_held_local_preview_replay_package_source_proof_timing',
  generatedAt: '2026-07-17T00:00:00.000Z',
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
    evaluatedRows: 5,
    winners: 3,
    losses: 2,
    unresolved: 0,
    blocked: 0,
    grossResolvedOneMesPl: 120,
    positiveModelGroups: 1,
    negativeModelGroups: 2,
    unresolvedModelGroups: 0,
    livePromotionAllowedRows: 0,
  },
  modelTiming: [],
  rows: [
    {
      ticketId: 'intraday-winner',
      tradeDate: '2026-06-26',
      session: 'lunch',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      outcomeBucket: 'winner_t1_t2',
      outcomeLabel: 't1_and_t2_hit',
      resolvedOneMesPl: 67.5,
      proofTime: '2026-06-26T12:15:00',
      entryHitTime: '2026-06-26T12:15:00',
      proofToEntryMinutes: 0,
      riskPoints: 6.75,
      mfeR: 4.26,
      maeR: 2.78,
      issueTags: ['full_delivery'],
    },
    {
      ticketId: 'intraday-loss',
      tradeDate: '2026-07-01',
      session: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      outcomeBucket: 'loss_stopped_before_t1',
      outcomeLabel: 'stopped_before_t1',
      resolvedOneMesPl: -61.25,
      proofTime: '2026-07-01T09:10:00',
      entryHitTime: '2026-07-01T09:20:00',
      proofToEntryMinutes: 10,
      riskPoints: 12.25,
      mfeR: 3.49,
      maeR: 2.43,
      issueTags: ['stopped_before_t1'],
    },
    {
      ticketId: 'turtle-winner',
      tradeDate: '2026-06-23',
      session: 'lunch',
      setupType: 'historicalReview',
      direction: 'LONG',
      outcomeBucket: 'winner_t1_t2',
      outcomeLabel: 't1_and_t2_hit',
      resolvedOneMesPl: 110,
      proofTime: '2026-06-23T11:55:00',
      entryHitTime: '2026-06-23T11:55:00',
      proofToEntryMinutes: 0,
      riskPoints: 8.75,
      mfeR: 3.69,
      maeR: 1.77,
      issueTags: ['full_delivery'],
    },
    {
      ticketId: 'turtle-loss',
      tradeDate: '2026-06-17',
      session: 'lunch',
      setupType: 'historicalReview',
      direction: 'LONG',
      outcomeBucket: 'loss_stopped_before_t1',
      outcomeLabel: 'stopped_before_t1',
      resolvedOneMesPl: -77.5,
      proofTime: '2026-06-17T11:55:00',
      entryHitTime: '2026-06-17T11:55:00',
      proofToEntryMinutes: 0,
      riskPoints: 15.5,
      mfeR: 1.13,
      maeR: 6.68,
      issueTags: ['stopped_before_t1'],
    },
    {
      ticketId: 'sweep-winner',
      tradeDate: '2026-06-08',
      session: 'lunch',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      outcomeBucket: 'winner_t1_t2',
      outcomeLabel: 't1_and_t2_hit',
      resolvedOneMesPl: 167.5,
      proofTime: '2026-06-08T12:00:00',
      entryHitTime: '2026-06-08T12:00:00',
      proofToEntryMinutes: 0,
      riskPoints: 16.75,
      mfeR: 3.22,
      maeR: 0.12,
      issueTags: ['full_delivery'],
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewReplayPackageNegativeFilterProbeReport({
  reportDir: 'reports',
  sourceProofTimingPath: 'timing.json',
  sourceProofTimingReport: timingReport,
}, '2026-07-17T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_replay_package_negative_filter_probe');
assert.equal(report.status, 'pass');
assert.equal(report.authority.researchOnly, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.summary.evaluatedRows, 5);
assert.equal(report.summary.probesEvaluated, 3);
assert.equal(report.summary.candidateProbes, 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);

const combined = report.rows.find((row) => row.filterId === 'intraday_turtle_model_specific_risk_caps');
assert.equal(combined?.keptWinners, 2);
assert.equal(combined?.rejectedWinners, 1);
assert.equal(combined?.rejectedLosses, 2);
assert.equal(combined?.affectedPositiveFamilyRows, 0);
assert.equal(combined?.decision, 'rejected_for_now');
assert.match(combined?.recommendation || '', /Reject for now/);
assert.match(report.markdown, /Negative Filter Probe/);

const missing = buildUnifiedPositiveHeldLocalPreviewReplayPackageNegativeFilterProbeReport({
  reportDir: 'reports',
  sourceProofTimingPath: null,
  sourceProofTimingReport: null,
}, '2026-07-17T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing source/proof timing path'));
assert.ok(missing.blockers.includes('no timing rows available for negative-filter probe'));

console.log('unified positive held-local replay package negative-filter probe verified.');
