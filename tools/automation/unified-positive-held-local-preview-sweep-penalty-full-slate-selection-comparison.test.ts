import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewSweepPenaltyFullSlateSelectionComparisonReport,
} from './unified-positive-held-local-preview-sweep-penalty-full-slate-selection-comparison';
import type {
  UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport,
} from './unified-positive-held-local-preview-sweep-penalty-installed-score-comparison';

const installedScore: UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport = {
  reportType: 'unified_positive_held_local_preview_sweep_penalty_installed_score_comparison',
  generatedAt: '2026-07-18T00:00:00.000Z',
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
    sourceProofTimingPath: 'timing.json',
    intakeTriagePath: 'intake.json',
    freshScannerOverlayDryRunPath: 'overlay.json',
  },
  summary: {
    sourceRows: 4,
    joinedRows: 4,
    candidateBookRows: 4,
    sweepRows: 2,
    validSweepLeadRows: 1,
    invalidStopSweepPenaltyRows: 1,
    installedPenaltyRows: 1,
    validSweepLeadRowsPenalized: 0,
    canExecuteTrueRows: 0,
    entryStopTargetRiskDriftRows: 0,
    overlayTopSelectionDeltaOneMesPl: 35,
    overlayMatchesExpectedRows: true,
    recommendation: 'installed_score_path_matches_research_overlay',
    livePromotionAllowedRows: 0,
  },
  rows: [
    {
      ticketId: '2026-07-09-evening-NoInstalledSetup-SHORT-invalid',
      tradeDate: '2026-07-09',
      session: 'evening',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      executionStatus: 'Blocked',
      blockReason: 'InvalidStopLocation',
      installedScore: 73,
      candidateBookState: 'blocked',
      validSweepLead: false,
      invalidStopSweepPenaltyCandidate: true,
      installedPenaltyExpected: true,
      canExecute: false,
      entryPreserved: true,
      stopPreserved: true,
      target1Preserved: true,
      target2Preserved: true,
      riskPreserved: true,
    },
    {
      ticketId: '2026-07-09-evening-NoInstalledSetup-LONG-valid',
      tradeDate: '2026-07-09',
      session: 'evening',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      executionStatus: 'Conditional',
      blockReason: 'EntryTriggerPending',
      installedScore: 76,
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
      ticketId: '2026-07-10-morning-NoInstalledSetup-SHORT-valid',
      tradeDate: '2026-07-10',
      session: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      executionStatus: 'Conditional',
      blockReason: 'EntryTriggerPending',
      installedScore: 81,
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
      ticketId: '2026-07-10-morning-historicalReview-LONG-valid',
      tradeDate: '2026-07-10',
      session: 'morning',
      setupType: 'historicalReview',
      direction: 'LONG',
      executionStatus: 'Conditional',
      blockReason: 'EntryTriggerPending',
      installedScore: 78,
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

const report = buildUnifiedPositiveHeldLocalPreviewSweepPenaltyFullSlateSelectionComparisonReport({
  reportDir: 'reports',
  installedScoreComparisonPath: 'installed.json',
  installedScoreComparisonReport: installedScore,
}, '2026-07-18T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.recommendation, 'full_slate_selection_supports_installed_penalty');
assert.equal(report.summary.installedScoreRows, 4);
assert.equal(report.summary.selectionRows, 4);
assert.equal(report.summary.slates, 2);
assert.equal(report.summary.changedSlates, 1);
assert.equal(report.summary.changedFromInvalidStopSweepToValidReviewSlates, 1);
assert.equal(report.summary.changedFromValidReviewToInvalidStopSweepSlates, 0);
assert.equal(report.summary.invalidStopSweepBaselineTopSlates, 1);
assert.equal(report.summary.invalidStopSweepInstalledTopSlates, 0);
assert.equal(report.summary.validReviewInstalledTopSlates, 2);
assert.equal(report.summary.validSweepLeadRows, 1);
assert.equal(report.summary.invalidStopSweepRows, 1);
assert.equal(report.summary.installedPenaltyRows, 1);
assert.equal(report.summary.validSweepLeadRowsPenalized, 0);
assert.equal(report.summary.canExecuteFalseRows, 4);
assert.equal(report.summary.entryStopTargetRiskPreservedRows, 4);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.rows.every((row) => row.livePromotionAllowed === false), true);

const changedSlate = report.slates.find((slate) => slate.slateId === '2026-07-09|evening');
assert.equal(changedSlate?.baselineTopInvalidStopSweep, true);
assert.equal(changedSlate?.installedTopValidReviewCandidate, true);
assert.equal(changedSlate?.installedTopSetupType, 'NoInstalledSetup');

const blocked = buildUnifiedPositiveHeldLocalPreviewSweepPenaltyFullSlateSelectionComparisonReport({
  reportDir: 'reports',
  installedScoreComparisonPath: 'installed.json',
  installedScoreComparisonReport: {
    ...installedScore,
    rows: [{
      ...installedScore.rows[2],
      installedPenaltyExpected: true,
    }],
  },
}, '2026-07-18T00:00:00.000Z');

assert.equal(blocked.status, 'fail');
assert.equal(blocked.summary.recommendation, 'reject_full_slate_selection_comparison');
assert.ok(blocked.blockers.some((item) => item.includes('valid Sweep lead rows were penalized')));

console.log('unified positive held-local Sweep penalty full-slate selection comparison verified.');
