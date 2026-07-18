import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewSweepSegmentFilterReport,
} from './unified-positive-held-local-preview-sweep-segment-filter';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport } from './unified-positive-held-local-preview-replay-package-source-proof-timing';

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
    evaluatedRows: 8,
    winners: 4,
    losses: 2,
    unresolved: 2,
    blocked: 0,
    grossResolvedOneMesPl: 310,
    positiveModelGroups: 1,
    negativeModelGroups: 0,
    unresolvedModelGroups: 0,
    livePromotionAllowedRows: 0,
  },
  modelTiming: [],
  rows: [
    {
      ticketId: 'sweep-lunch-short-1',
      tradeDate: '2026-06-23',
      session: 'lunch',
      setupType: 'SweepMssFvgRetrace',
      direction: 'SHORT',
      outcomeBucket: 'winner_t1_t2',
      outcomeLabel: 't1_and_t2_hit',
      resolvedOneMesPl: 120,
      proofTime: '2026-06-23T12:00:00',
      entryHitTime: '2026-06-23T12:05:00',
      proofToEntryMinutes: 5,
      riskPoints: 8,
      mfeR: 2.4,
      maeR: 0.2,
      issueTags: ['full_delivery'],
    },
    {
      ticketId: 'sweep-lunch-short-2',
      tradeDate: '2026-06-24',
      session: 'lunch',
      setupType: 'SweepMssFvgRetrace',
      direction: 'SHORT',
      outcomeBucket: 'winner_t1_t2',
      outcomeLabel: 't1_and_t2_hit',
      resolvedOneMesPl: 115,
      proofTime: '2026-06-24T12:00:00',
      entryHitTime: '2026-06-24T12:05:00',
      proofToEntryMinutes: 5,
      riskPoints: 10,
      mfeR: 2.2,
      maeR: 0.3,
      issueTags: ['full_delivery'],
    },
    {
      ticketId: 'sweep-lunch-short-3',
      tradeDate: '2026-06-25',
      session: 'lunch',
      setupType: 'SweepMssFvgRetrace',
      direction: 'SHORT',
      outcomeBucket: 'winner_t1_t2',
      outcomeLabel: 't1_and_t2_hit',
      resolvedOneMesPl: 100,
      proofTime: '2026-06-25T12:00:00',
      entryHitTime: '2026-06-25T12:05:00',
      proofToEntryMinutes: 5,
      riskPoints: 11,
      mfeR: 2,
      maeR: 0.4,
      issueTags: ['full_delivery'],
    },
    {
      ticketId: 'sweep-morning-long-loss',
      tradeDate: '2026-06-26',
      session: 'morning',
      setupType: 'SweepMssFvgRetrace',
      direction: 'LONG',
      outcomeBucket: 'loss_stopped_before_t1',
      outcomeLabel: 'stopped_before_t1',
      resolvedOneMesPl: -45,
      proofTime: '2026-06-26T09:30:00',
      entryHitTime: '2026-06-26T09:30:00',
      proofToEntryMinutes: 0,
      riskPoints: 14,
      mfeR: 0.4,
      maeR: 1.3,
      issueTags: ['stopped_before_t1', 'same_bar_entry', 'adverse_excursion_at_or_over_1r'],
    },
    {
      ticketId: 'sweep-evening-short-loss',
      tradeDate: '2026-06-27',
      session: 'evening',
      setupType: 'SweepMssFvgRetrace',
      direction: 'SHORT',
      outcomeBucket: 'loss_stopped_before_t1',
      outcomeLabel: 'stopped_before_t1',
      resolvedOneMesPl: -35,
      proofTime: '2026-06-27T19:00:00',
      entryHitTime: '2026-06-27T19:00:00',
      proofToEntryMinutes: 0,
      riskPoints: 17,
      mfeR: 0.2,
      maeR: 1.2,
      issueTags: ['stopped_before_t1', 'same_bar_entry', 'adverse_excursion_at_or_over_1r'],
    },
    {
      ticketId: 'sweep-lunch-short-unresolved',
      tradeDate: '2026-06-28',
      session: 'lunch',
      setupType: 'SweepMssFvgRetrace',
      direction: 'SHORT',
      outcomeBucket: 'unresolved',
      outcomeLabel: 'no_fill',
      resolvedOneMesPl: null,
      proofTime: '2026-06-28T12:00:00',
      entryHitTime: null,
      proofToEntryMinutes: null,
      riskPoints: 9,
      mfeR: null,
      maeR: null,
      issueTags: ['no_fill'],
    },
    {
      ticketId: 'intraday-other',
      tradeDate: '2026-06-24',
      session: 'morning',
      setupType: 'IntradayMssMicroContinuation',
      direction: 'LONG',
      outcomeBucket: 'winner_t1_t2',
      outcomeLabel: 't1_and_t2_hit',
      resolvedOneMesPl: 55,
      proofTime: '2026-06-24T09:30:00',
      entryHitTime: '2026-06-24T09:35:00',
      proofToEntryMinutes: 5,
      riskPoints: 6,
      mfeR: 2,
      maeR: 0.2,
      issueTags: ['full_delivery'],
    },
    {
      ticketId: 'opening-other-unresolved',
      tradeDate: '2026-06-25',
      session: 'morning',
      setupType: 'OpeningDriveFvgContinuation',
      direction: 'SHORT',
      outcomeBucket: 'unresolved',
      outcomeLabel: 'no_target_or_stop_hit',
      resolvedOneMesPl: null,
      proofTime: '2026-06-25T10:00:00',
      entryHitTime: '2026-06-25T10:05:00',
      proofToEntryMinutes: 5,
      riskPoints: 7,
      mfeR: 0.8,
      maeR: 0.3,
      issueTags: ['no_target_or_stop_hit'],
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewSweepSegmentFilterReport({
  reportDir: 'reports',
  sourceProofTimingPath: 'timing.json',
  sourceProofTimingReport: timingReport,
}, '2026-07-17T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_sweep_segment_filter');
assert.equal(report.status, 'pass');
assert.equal(report.authority.readOnly, true);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.assumptions.sweepOnly, true);
assert.equal(report.assumptions.noLiveFilterInstalled, true);
assert.equal(report.summary.sourceRows, 8);
assert.equal(report.summary.sweepRows, 6);
assert.equal(report.summary.sweepWinners, 3);
assert.equal(report.summary.sweepLosses, 2);
assert.equal(report.summary.sweepUnresolved, 1);
assert.equal(report.summary.sweepOneMesPl, 255);
assert.ok(report.summary.segmentReplayCandidates >= 1);
assert.equal(report.summary.researchOnlySeparators, 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);

const entryWithin15 = report.rows.find((row) => row.segmentId === 'entry_within_15_minutes');
assert.equal(entryWithin15?.decision, 'candidate_for_segment_replay');
assert.equal(entryWithin15?.keptWinners, 3);
assert.equal(entryWithin15?.rejectedWinners, 0);
assert.equal(entryWithin15?.scannerVisibleEligible, false);

const lunchShortRisk = report.rows.find((row) => row.segmentId === 'lunch_short_risk_lte_12');
assert.equal(lunchShortRisk?.keptWinners, 3);
assert.equal(lunchShortRisk?.keptLosses, 0);
assert.equal(lunchShortRisk?.scannerVisibleEligible, false);

const noAdverse = report.rows.find((row) => row.segmentId === 'no_adverse_excursion_over_1r');
assert.equal(noAdverse?.decision, 'research_only_separator');
assert.equal(noAdverse?.source, 'replay_outcome');
assert.match(noAdverse?.recommendation || '', /pre-entry features/);
assert.equal(noAdverse?.scannerVisibleEligible, false);

assert.match(report.markdown, /Sweep Segment Filter/);

const missing = buildUnifiedPositiveHeldLocalPreviewSweepSegmentFilterReport({
  reportDir: 'reports',
  sourceProofTimingPath: null,
  sourceProofTimingReport: null,
}, '2026-07-17T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing source/proof timing path'));
assert.ok(missing.blockers.includes('no SweepMssFvgRetrace rows found'));

console.log('unified positive held-local Sweep segment filter verified.');
