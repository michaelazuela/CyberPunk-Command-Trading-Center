import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewPositiveFamilyBoostValidationReport,
} from './unified-positive-held-local-preview-positive-family-boost-validation';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport,
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

const timingReport: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport = {
  reportType: 'unified_positive_held_local_preview_replay_package_source_proof_timing',
  generatedAt: '2026-07-17T00:00:00.000Z',
  status: 'pass',
  authority,
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
    evaluatedRows: 7,
    winners: 5,
    losses: 2,
    unresolved: 0,
    blocked: 0,
    grossResolvedOneMesPl: 280,
    positiveModelGroups: 2,
    negativeModelGroups: 1,
    unresolvedModelGroups: 0,
    livePromotionAllowedRows: 0,
  },
  modelTiming: [],
  rows: [
    {
      ticketId: 'sweep-1',
      tradeDate: '2026-06-24',
      session: 'morning',
      setupType: 'SweepMssFvgRetrace',
      direction: 'LONG',
      outcomeBucket: 'winner_t1_t2',
      outcomeLabel: 't1_and_t2_hit',
      resolvedOneMesPl: 100,
      proofTime: '2026-06-24T09:30:00',
      entryHitTime: '2026-06-24T09:35:00',
      proofToEntryMinutes: 5,
      riskPoints: 8,
      mfeR: 2.4,
      maeR: 0.2,
      issueTags: ['full_delivery'],
    },
    {
      ticketId: 'sweep-2',
      tradeDate: '2026-06-25',
      session: 'morning',
      setupType: 'SweepMssFvgRetrace',
      direction: 'SHORT',
      outcomeBucket: 'winner_t1_t2',
      outcomeLabel: 't1_and_t2_hit',
      resolvedOneMesPl: 90,
      proofTime: '2026-06-25T09:30:00',
      entryHitTime: '2026-06-25T09:35:00',
      proofToEntryMinutes: 5,
      riskPoints: 10,
      mfeR: 2.1,
      maeR: 0.3,
      issueTags: ['full_delivery'],
    },
    {
      ticketId: 'sweep-3',
      tradeDate: '2026-06-26',
      session: 'morning',
      setupType: 'SweepMssFvgRetrace',
      direction: 'LONG',
      outcomeBucket: 'winner_t1_t2',
      outcomeLabel: 't1_and_t2_hit',
      resolvedOneMesPl: 110,
      proofTime: '2026-06-26T09:30:00',
      entryHitTime: '2026-06-26T09:35:00',
      proofToEntryMinutes: 5,
      riskPoints: 9,
      mfeR: 2.5,
      maeR: 0.4,
      issueTags: ['full_delivery'],
    },
    {
      ticketId: 'after-1',
      tradeDate: '2026-06-24',
      session: 'lunch',
      setupType: 'AfterLunchDriveFvgContinuation',
      direction: 'LONG',
      outcomeBucket: 'winner_t1_t2',
      outcomeLabel: 't1_and_t2_hit',
      resolvedOneMesPl: 75,
      proofTime: '2026-06-24T12:30:00',
      entryHitTime: '2026-06-24T12:35:00',
      proofToEntryMinutes: 5,
      riskPoints: 6,
      mfeR: 2.2,
      maeR: 0.2,
      issueTags: ['full_delivery'],
    },
    {
      ticketId: 'after-2',
      tradeDate: '2026-06-25',
      session: 'lunch',
      setupType: 'AfterLunchDriveFvgContinuation',
      direction: 'SHORT',
      outcomeBucket: 'winner_t1_t2',
      outcomeLabel: 't1_and_t2_hit',
      resolvedOneMesPl: 60,
      proofTime: '2026-06-25T12:30:00',
      entryHitTime: '2026-06-25T12:35:00',
      proofToEntryMinutes: 5,
      riskPoints: 7,
      mfeR: 2,
      maeR: 0.5,
      issueTags: ['full_delivery'],
    },
    {
      ticketId: 'after-loss',
      tradeDate: '2026-06-26',
      session: 'lunch',
      setupType: 'AfterLunchDriveFvgContinuation',
      direction: 'LONG',
      outcomeBucket: 'loss_stopped_before_t1',
      outcomeLabel: 'stopped_before_t1',
      resolvedOneMesPl: -30,
      proofTime: '2026-06-26T12:30:00',
      entryHitTime: '2026-06-26T12:30:00',
      proofToEntryMinutes: 0,
      riskPoints: 6,
      mfeR: 0.3,
      maeR: 1.2,
      issueTags: ['stopped_before_t1', 'same_bar_entry'],
    },
    {
      ticketId: 'other-loss',
      tradeDate: '2026-06-24',
      session: 'morning',
      setupType: 'IntradayMssMicroContinuation',
      direction: 'SHORT',
      outcomeBucket: 'loss_stopped_before_t1',
      outcomeLabel: 'stopped_before_t1',
      resolvedOneMesPl: -25,
      proofTime: '2026-06-24T09:30:00',
      entryHitTime: '2026-06-24T09:35:00',
      proofToEntryMinutes: 5,
      riskPoints: 5,
      mfeR: 0.4,
      maeR: 1.1,
      issueTags: ['stopped_before_t1'],
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewPositiveFamilyBoostValidationReport({
  reportDir: 'reports',
  sourceProofTimingPath: 'timing.json',
  sourceProofTimingReport: timingReport,
}, '2026-07-17T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_positive_family_boost_validation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.assumptions.noRankBoostInstalled, true);
assert.equal(report.scoring.baselineDoesNotUseOutcome, true);
assert.equal(report.summary.sourceRows, 7);
assert.equal(report.summary.positiveFamilyRows, 6);
assert.equal(report.summary.boostCandidateModels, 2);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.summary.recommendedAction, 'broader_replay_validate_positive_families_separately');

const sweep = report.models.find((row) => row.setupType === 'SweepMssFvgRetrace');
assert.equal(sweep?.decision, 'clean_boost_research_candidate');
assert.equal(sweep?.winners, 3);
assert.equal(sweep?.losses, 0);
assert.equal(sweep?.oneMesPl, 300);

const afterLunch = report.models.find((row) => row.setupType === 'AfterLunchDriveFvgContinuation');
assert.equal(afterLunch?.decision, 'isolated_boost_research_candidate');
assert.equal(afterLunch?.sameBarLosses, 1);
assert.match(afterLunch?.reason || '', /losses remain/);

assert.ok(report.rows.some((row) => row.ticketId === 'sweep-1' && row.boostApplied));
assert.match(report.markdown, /Positive Family Boost Validation/);

const sweepOnly = buildUnifiedPositiveHeldLocalPreviewPositiveFamilyBoostValidationReport({
  reportDir: 'reports',
  sourceProofTimingPath: 'timing.json',
  sourceProofTimingReport: timingReport,
  selectedSetupTypes: ['SweepMssFvgRetrace'],
}, '2026-07-17T00:01:30.000Z');

assert.deepEqual(sweepOnly.source.selectedSetupTypes, ['SweepMssFvgRetrace']);
assert.equal(sweepOnly.summary.positiveFamilyRows, 3);
assert.equal(sweepOnly.summary.boostCandidateModels, 1);
assert.equal(sweepOnly.models.some((row) => row.setupType === 'AfterLunchDriveFvgContinuation'), false);
assert.equal(sweepOnly.rows.find((row) => row.ticketId === 'after-1')?.boostApplied, false);

const missing = buildUnifiedPositiveHeldLocalPreviewPositiveFamilyBoostValidationReport({
  reportDir: 'reports',
  sourceProofTimingPath: null,
  sourceProofTimingReport: null,
}, '2026-07-17T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing source/proof timing path'));
assert.ok(missing.blockers.includes('no positive-family rows found'));

console.log('unified positive held-local positive-family boost validation verified.');
