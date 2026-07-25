import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewraidReclaimExtremeRiskCompanionFilterReport,
} from './unified-positive-held-local-preview-raidReclaim-extreme-risk-companion-filter';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport,
} from './unified-positive-held-local-preview-replay-package-source-proof-timing';
import type {
  UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport,
} from './unified-positive-held-local-preview-sweep-penalty-installed-score-comparison';
import type {
  UnifiedPositiveHeldLocalPreviewraidReclaimExtremeRiskRankSimulationReport,
} from './unified-positive-held-local-preview-raidReclaim-extreme-risk-rank-simulation';

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
    sourceRows: 2,
    joinedRows: 2,
    candidateBookRows: 2,
    sweepRows: 1,
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
      ticketId: '2026-06-10-lunch-raidReclaim-LONG',
      tradeDate: '2026-06-10',
      session: 'lunch',
      setupType: 'raidReclaim',
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
      ticketId: '2026-06-10-lunch-SweepMssFvgRetrace-LONG',
      tradeDate: '2026-06-10',
      session: 'lunch',
      setupType: 'SweepMssFvgRetrace',
      direction: 'LONG',
      executionStatus: 'Blocked',
      blockReason: 'InvalidStopLocation',
      installedScore: 84,
      candidateBookState: 'blocked',
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
    evaluatedRows: 2,
    winners: 0,
    losses: 1,
    unresolved: 0,
    blocked: 1,
    grossResolvedOneMesPl: -116.25,
    positiveModelGroups: 0,
    negativeModelGroups: 1,
    unresolvedModelGroups: 0,
    livePromotionAllowedRows: 0,
  },
  modelTiming: [],
  rows: [
    {
      ticketId: '2026-06-10-lunch-raidReclaim-LONG',
      tradeDate: '2026-06-10',
      session: 'lunch',
      setupType: 'raidReclaim',
      direction: 'LONG',
      outcomeBucket: 'loss_stopped_before_t1',
      outcomeLabel: 'stopped_before_t1',
      resolvedOneMesPl: -116.25,
      proofTime: '2026-06-10T13:00:00.000Z',
      entryHitTime: '2026-06-10T13:00:00.000Z',
      proofToEntryMinutes: 0,
      riskPoints: 23.25,
      mfeR: 0.2,
      maeR: 1,
      issueTags: [],
    },
    {
      ticketId: '2026-06-10-lunch-SweepMssFvgRetrace-LONG',
      tradeDate: '2026-06-10',
      session: 'lunch',
      setupType: 'SweepMssFvgRetrace',
      direction: 'LONG',
      outcomeBucket: 'blocked',
      outcomeLabel: 'blocked',
      resolvedOneMesPl: null,
      proofTime: null,
      entryHitTime: null,
      proofToEntryMinutes: null,
      riskPoints: null,
      mfeR: null,
      maeR: null,
      issueTags: ['blocked'],
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const extreme: UnifiedPositiveHeldLocalPreviewraidReclaimExtremeRiskRankSimulationReport = {
  reportType: 'unified_positive_held_local_preview_raidReclaim_extreme_risk_rank_simulation',
  generatedAt: '2026-07-18T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    reportDir: 'reports',
    installedScoreComparisonPath: 'installed.json',
    sourceProofTimingPath: 'timing.json',
    separatorDiagnosticPath: 'separator.json',
  },
  assumptions: {
    simulationIsResearchOnly: true,
    penaltyUsesPreEntryRiskOnly: true,
    outcomeUsedForEvaluationOnly: true,
    noRankPenaltyInstalled: true,
    noHardBlockInstalled: true,
    noModelRemoved: true,
    livePromotionAllowed: false,
  },
  scoring: {
    setupType: 'raidReclaim',
    riskThresholdPoints: 15,
    penaltyPoints: 12,
    baselineUsesInstalledScore: true,
  },
  summary: {
    installedRows: 2,
    joinedRows: 2,
    slates: 1,
    penalizedRows: 1,
    penalizedTopBeforeSlates: 1,
    penalizedTopAfterSlates: 0,
    topChangedSlates: 1,
    topBeforeOneMesPl: -116.25,
    topAfterOneMesPl: null,
    topSelectionDeltaOneMesPl: null,
    falseWinnerDemotions: 0,
    canExecuteFalseRows: 2,
    livePromotionAllowedRows: 0,
    recommendation: 'review_note_only',
  },
  rows: [],
  slates: [],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewraidReclaimExtremeRiskCompanionFilterReport({
  reportDir: 'reports',
  installedScoreComparisonPath: 'installed.json',
  installedScoreComparisonReport: installed,
  sourceProofTimingPath: 'timing.json',
  sourceProofTimingReport: timing,
  extremeRiskSimulationPath: 'extreme.json',
  extremeRiskSimulationReport: extreme,
}, '2026-07-18T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.recommendation, 'do_not_install_extreme_risk_penalty');
assert.equal(report.summary.rejectedBlockedReplacementVariants > 0, true);
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.equal(report.assumptions.replacementMustRemainValidReview, true);
assert.equal(report.assumptions.noLiveFilterInstalled, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.changesCanExecute, false);
assert.ok(report.variants.some((row) => row.variantId === 'risk_gte_23_proof_0' && row.recommendation === 'reject_for_blocked_replacement'));
assert.ok(report.changedSlates.every((row) => row.topAfterValidReview === false));

const blocked = buildUnifiedPositiveHeldLocalPreviewraidReclaimExtremeRiskCompanionFilterReport({
  reportDir: 'reports',
  installedScoreComparisonPath: null,
  installedScoreComparisonReport: null,
  sourceProofTimingPath: 'timing.json',
  sourceProofTimingReport: timing,
  extremeRiskSimulationPath: 'extreme.json',
  extremeRiskSimulationReport: extreme,
}, '2026-07-18T00:01:00.000Z');

assert.equal(blocked.status, 'fail');
assert.equal(blocked.summary.recommendation, 'reject_missing_source');
assert.ok(blocked.blockers.some((item) => item.includes('missing installed-score comparison path')));

console.log('unified positive held-local raidReclaim extreme-risk companion filter verified.');
