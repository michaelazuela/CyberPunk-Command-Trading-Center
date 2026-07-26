import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewValidReviewTopSlateOutcomeReport,
} from './unified-positive-held-local-preview-valid-review-top-slate-outcome';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport,
} from './unified-positive-held-local-preview-replay-package-source-proof-timing';
import type {
  UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport,
} from './unified-positive-held-local-preview-sweep-penalty-installed-score-comparison';

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

const installed: UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport = {
  reportType: 'unified_positive_held_local_preview_sweep_penalty_installed_score_comparison',
  generatedAt: '2026-07-18T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    reportDir: 'reports',
    sourceProofTimingPath: 'timing.json',
    intakeTriagePath: 'intake.json',
    freshScannerOverlayDryRunPath: 'overlay.json',
  },
  summary: {
    sourceRows: 3,
    joinedRows: 3,
    candidateBookRows: 3,
    sweepRows: 1,
    validSweepLeadRows: 1,
    invalidStopSweepPenaltyRows: 0,
    installedPenaltyRows: 0,
    validSweepLeadRowsPenalized: 0,
    canExecuteTrueRows: 0,
    entryStopTargetRiskDriftRows: 0,
    overlayTopSelectionDeltaOneMesPl: 0,
    overlayMatchesExpectedRows: true,
    recommendation: 'installed_score_path_matches_research_overlay',
    livePromotionAllowedRows: 0,
  },
  rows: [
    {
      ticketId: '2026-06-12-morning-NoInstalledSetup-SHORT',
      tradeDate: '2026-06-12',
      session: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      executionStatus: 'Conditional',
      blockReason: 'EntryTriggerPending',
      installedScore: 82,
      candidateBookState: 'human_review',
      validSweepLead: true,
      invalidStopSweepPenaltyCandidate: false,
      installedPenaltyExpected: false,
      canExecute: false,
      entryPreserved: true,
      stopPreserved: true,
      target1Preserved: true,
      target2Preserved: true,
      riskPreserved: true,
    },
    {
      ticketId: '2026-06-12-morning-historicalReview-LONG',
      tradeDate: '2026-06-12',
      session: 'morning',
      setupType: 'historicalReview',
      direction: 'LONG',
      executionStatus: 'Conditional',
      blockReason: 'EntryTriggerPending',
      installedScore: 70,
      candidateBookState: 'human_review',
      validSweepLead: false,
      invalidStopSweepPenaltyCandidate: false,
      installedPenaltyExpected: false,
      canExecute: false,
      entryPreserved: true,
      stopPreserved: true,
      target1Preserved: true,
      target2Preserved: true,
      riskPreserved: true,
    },
    {
      ticketId: '2026-06-13-lunch-NoInstalledSetup-LONG',
      tradeDate: '2026-06-13',
      session: 'lunch',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      executionStatus: 'Conditional',
      blockReason: 'EntryTriggerPending',
      installedScore: 86,
      candidateBookState: 'human_review',
      validSweepLead: false,
      invalidStopSweepPenaltyCandidate: false,
      installedPenaltyExpected: false,
      canExecute: false,
      entryPreserved: true,
      stopPreserved: true,
      target1Preserved: true,
      target2Preserved: true,
      riskPreserved: true,
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const timing: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport = {
  reportType: 'unified_positive_held_local_preview_replay_package_source_proof_timing',
  generatedAt: '2026-07-18T00:00:00.000Z',
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
    evaluatedRows: 3,
    winners: 1,
    losses: 1,
    unresolved: 1,
    blocked: 0,
    grossResolvedOneMesPl: 100,
    positiveModelGroups: 1,
    negativeModelGroups: 1,
    unresolvedModelGroups: 1,
    livePromotionAllowedRows: 0,
  },
  modelTiming: [],
  rows: [
    {
      ticketId: '2026-06-12-morning-NoInstalledSetup-SHORT',
      tradeDate: '2026-06-12',
      session: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      outcomeBucket: 'winner_t1_t2',
      outcomeLabel: 't1_and_t2_hit',
      resolvedOneMesPl: 200,
      proofTime: '2026-06-12T10:00:00',
      entryHitTime: '2026-06-12T10:10:00',
      proofToEntryMinutes: 10,
      riskPoints: 31,
      mfeR: 2,
      maeR: 0.2,
      issueTags: [],
    },
    {
      ticketId: '2026-06-12-morning-historicalReview-LONG',
      tradeDate: '2026-06-12',
      session: 'morning',
      setupType: 'historicalReview',
      direction: 'LONG',
      outcomeBucket: 'loss_stopped_before_t1',
      outcomeLabel: 'stopped_before_t1',
      resolvedOneMesPl: -100,
      proofTime: '2026-06-12T11:00:00',
      entryHitTime: '2026-06-12T11:10:00',
      proofToEntryMinutes: 10,
      riskPoints: 20,
      mfeR: 0.4,
      maeR: 1,
      issueTags: [],
    },
    {
      ticketId: '2026-06-13-lunch-NoInstalledSetup-LONG',
      tradeDate: '2026-06-13',
      session: 'lunch',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      outcomeBucket: 'loss_stopped_before_t1',
      outcomeLabel: 'stopped_before_t1',
      resolvedOneMesPl: -75,
      proofTime: '2026-06-13T12:30:00',
      entryHitTime: '2026-06-13T12:35:00',
      proofToEntryMinutes: 5,
      riskPoints: 15,
      mfeR: 0.1,
      maeR: 1,
      issueTags: [],
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewValidReviewTopSlateOutcomeReport({
  reportDir: 'reports',
  installedScoreComparisonPath: 'installed.json',
  installedScoreComparisonReport: installed,
  sourceProofTimingPath: 'timing.json',
  sourceProofTimingReport: timing,
}, '2026-07-18T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.recommendation, 'mine_valid_review_winner_loss_separators');
assert.equal(report.summary.slates, 2);
assert.equal(report.summary.validReviewTopSlates, 2);
assert.equal(report.summary.winners, 1);
assert.equal(report.summary.losses, 1);
assert.equal(report.summary.grossResolvedOneMesPl, 125);
assert.equal(report.summary.canExecuteFalseRows, 2);
assert.equal(report.rows.some((row) => row.ticketId === '2026-06-12-morning-historicalReview-LONG'), false);
assert.equal(report.rows.every((row) => row.livePromotionAllowed === false), true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.changesCanExecute, false);

const blocked = buildUnifiedPositiveHeldLocalPreviewValidReviewTopSlateOutcomeReport({
  reportDir: 'reports',
  installedScoreComparisonPath: null,
  installedScoreComparisonReport: null,
  sourceProofTimingPath: 'timing.json',
  sourceProofTimingReport: timing,
}, '2026-07-18T00:01:00.000Z');

assert.equal(blocked.status, 'fail');
assert.equal(blocked.summary.recommendation, 'reject_valid_review_top_slate_outcome');
assert.ok(blocked.blockers.some((item) => item.includes('missing installed-score comparison path')));

console.log('unified positive held-local valid-review top-slate outcome verified.');
