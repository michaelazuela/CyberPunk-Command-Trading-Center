import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewhistoricalReviewExtremeRiskRankSimulationReport,
} from './unified-positive-held-local-preview-raidReclaim-extreme-risk-rank-simulation';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport,
} from './unified-positive-held-local-preview-replay-package-source-proof-timing';
import type {
  UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport,
} from './unified-positive-held-local-preview-sweep-penalty-installed-score-comparison';
import type {
  UnifiedPositiveHeldLocalPreviewValidReviewSeparatorDiagnosticReport,
} from './unified-positive-held-local-preview-valid-review-separator-diagnostic';

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
    sweepRows: 0,
    validSweepLeadRows: 0,
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
      ticketId: '2026-06-01-morning-historicalReview-LONG',
      tradeDate: '2026-06-01',
      session: 'morning',
      setupType: 'historicalReview',
      direction: 'LONG',
      executionStatus: 'Conditional',
      blockReason: 'EntryTriggerPending',
      installedScore: 90,
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
      ticketId: '2026-06-01-morning-NoInstalledSetup-SHORT',
      tradeDate: '2026-06-01',
      session: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      executionStatus: 'Conditional',
      blockReason: 'EntryTriggerPending',
      installedScore: 84,
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
      ticketId: '2026-06-02-lunch-historicalReview-LONG',
      tradeDate: '2026-06-02',
      session: 'lunch',
      setupType: 'historicalReview',
      direction: 'LONG',
      executionStatus: 'Conditional',
      blockReason: 'EntryTriggerPending',
      installedScore: 80,
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
    losses: 2,
    unresolved: 0,
    blocked: 0,
    grossResolvedOneMesPl: -25,
    positiveModelGroups: 1,
    negativeModelGroups: 1,
    unresolvedModelGroups: 0,
    livePromotionAllowedRows: 0,
  },
  modelTiming: [],
  rows: [
    {
      ticketId: '2026-06-01-morning-historicalReview-LONG',
      tradeDate: '2026-06-01',
      session: 'morning',
      setupType: 'historicalReview',
      direction: 'LONG',
      outcomeBucket: 'loss_stopped_before_t1',
      outcomeLabel: 'stopped_before_t1',
      resolvedOneMesPl: -100,
      proofTime: '2026-06-01T10:00:00.000Z',
      entryHitTime: '2026-06-01T10:05:00.000Z',
      proofToEntryMinutes: 5,
      riskPoints: 18,
      mfeR: 0.2,
      maeR: 1,
      issueTags: [],
    },
    {
      ticketId: '2026-06-01-morning-NoInstalledSetup-SHORT',
      tradeDate: '2026-06-01',
      session: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      outcomeBucket: 'winner_t1_t2',
      outcomeLabel: 't1_and_t2_hit',
      resolvedOneMesPl: 200,
      proofTime: '2026-06-01T10:00:00.000Z',
      entryHitTime: '2026-06-01T10:05:00.000Z',
      proofToEntryMinutes: 5,
      riskPoints: 8,
      mfeR: 2,
      maeR: 0.2,
      issueTags: [],
    },
    {
      ticketId: '2026-06-02-lunch-historicalReview-LONG',
      tradeDate: '2026-06-02',
      session: 'lunch',
      setupType: 'historicalReview',
      direction: 'LONG',
      outcomeBucket: 'loss_stopped_before_t1',
      outcomeLabel: 'stopped_before_t1',
      resolvedOneMesPl: -125,
      proofTime: '2026-06-02T13:00:00.000Z',
      entryHitTime: '2026-06-02T13:05:00.000Z',
      proofToEntryMinutes: 5,
      riskPoints: 10,
      mfeR: 0.2,
      maeR: 1,
      issueTags: [],
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const separator = {
  reportType: 'unified_positive_held_local_preview_valid_review_separator_diagnostic',
  generatedAt: '2026-07-18T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    reportDir: 'reports',
    validReviewTopSlateOutcomePath: 'valid-review.json',
  },
  assumptions: {
    outcomeUsedForEvaluationOnly: true,
    separatorFieldsArePreEntryOrModelMetadata: true,
    noLiveFilterInstalled: true,
    livePromotionAllowed: false,
  },
  summary: {
    sourceRows: 3,
    evaluatedRows: 3,
    winners: 1,
    losses: 2,
    unresolved: 0,
    grossResolvedOneMesPl: -25,
    candidatePositiveSelectorBuckets: 0,
    candidateCautionFilterBuckets: 1,
    livePromotionAllowedRows: 0,
    recommendation: 'review_candidate_selectors_before_install',
  },
  buckets: [],
  topPositiveBuckets: [],
  topCautionBuckets: [{
    kind: 'setupRiskBucket',
    key: 'historicalReview|risk_extreme_over_15',
    rows: 3,
    winners: 1,
    losses: 2,
    unresolved: 0,
    grossResolvedOneMesPl: -81.25,
    winRateResolved: 0.33,
    avgRiskPoints: 20.67,
    avgProofToEntryMinutes: 1.67,
    recommendation: 'candidate_caution_filter',
  }],
  blockers: [],
  recommendations: [],
  markdown: '',
} satisfies UnifiedPositiveHeldLocalPreviewValidReviewSeparatorDiagnosticReport;

const report = buildUnifiedPositiveHeldLocalPreviewhistoricalReviewExtremeRiskRankSimulationReport({
  reportDir: 'reports',
  installedScoreComparisonPath: 'installed.json',
  installedScoreComparisonReport: installed,
  sourceProofTimingPath: 'timing.json',
  sourceProofTimingReport: timing,
  separatorDiagnosticPath: 'separator.json',
  separatorDiagnosticReport: separator,
}, '2026-07-18T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.penalizedRows, 1);
assert.equal(report.summary.topChangedSlates, 1);
assert.equal(report.summary.topBeforeOneMesPl, -225);
assert.equal(report.summary.topAfterOneMesPl, 75);
assert.equal(report.summary.topSelectionDeltaOneMesPl, 300);
assert.equal(report.summary.canExecuteFalseRows, 3);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.assumptions.outcomeUsedForEvaluationOnly, true);
assert.equal(report.assumptions.noRankPenaltyInstalled, true);
assert.equal(report.assumptions.noHardBlockInstalled, true);
assert.equal(report.assumptions.noModelRemoved, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.changesEntryStopTargets, false);
assert.equal(report.rows.find((row) => row.ticketId === '2026-06-01-morning-historicalReview-LONG')?.penaltyApplied, true);
assert.equal(report.rows.find((row) => row.ticketId === '2026-06-02-lunch-historicalReview-LONG')?.penaltyApplied, false);

const blocked = buildUnifiedPositiveHeldLocalPreviewhistoricalReviewExtremeRiskRankSimulationReport({
  reportDir: 'reports',
  installedScoreComparisonPath: null,
  installedScoreComparisonReport: null,
  sourceProofTimingPath: 'timing.json',
  sourceProofTimingReport: timing,
  separatorDiagnosticPath: 'separator.json',
  separatorDiagnosticReport: separator,
}, '2026-07-18T00:01:00.000Z');

assert.equal(blocked.status, 'fail');
assert.equal(blocked.summary.recommendation, 'reject_missing_source');
assert.ok(blocked.blockers.some((item) => item.includes('missing installed-score comparison path')));

console.log('unified positive held-local historicalReview extreme-risk rank simulation verified.');
