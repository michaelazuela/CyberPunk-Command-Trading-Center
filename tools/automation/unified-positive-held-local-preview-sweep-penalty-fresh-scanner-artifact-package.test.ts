import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactPackageReport,
} from './unified-positive-held-local-preview-sweep-penalty-fresh-scanner-artifact-package';
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
    sourceRows: 3,
    joinedRows: 3,
    candidateBookRows: 3,
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
      ticketId: '2026-07-09-evening-SweepMssFvgRetrace-SHORT',
      tradeDate: '2026-07-09',
      session: 'evening',
      setupType: 'SweepMssFvgRetrace',
      direction: 'SHORT',
      executionStatus: 'Blocked',
      blockReason: 'InvalidStopLocation',
      installedScore: 26.12,
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
      ticketId: '2026-07-09-evening-SweepMssFvgRetrace-LONG',
      tradeDate: '2026-07-09',
      session: 'evening',
      setupType: 'SweepMssFvgRetrace',
      direction: 'LONG',
      executionStatus: 'Conditional',
      blockReason: 'EntryTriggerPending',
      installedScore: 86.11,
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
      ticketId: '2026-07-09-evening-TurtleSoup-LONG',
      tradeDate: '2026-07-09',
      session: 'evening',
      setupType: 'TurtleSoup',
      direction: 'LONG',
      executionStatus: 'Conditional',
      blockReason: 'EntryTriggerPending',
      installedScore: 88.53,
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

const report = buildUnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactPackageReport({
  reportDir: 'reports',
  installedScoreComparisonPath: 'installed.json',
  installedScoreComparisonReport: installedScore,
}, '2026-07-18T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.recommendation, 'fresh_scanner_artifacts_ready_for_selection_comparison');
assert.equal(report.summary.installedScoreRows, 3);
assert.equal(report.summary.freshArtifactRows, 2);
assert.equal(report.summary.sweepArtifactRows, 2);
assert.equal(report.summary.validSweepLeadArtifactRows, 1);
assert.equal(report.summary.invalidStopSweepArtifactRows, 1);
assert.equal(report.summary.installedPenaltyArtifactRows, 1);
assert.equal(report.summary.validSweepLeadRowsPenalized, 0);
assert.equal(report.summary.shouldPostFalseRows, 2);
assert.equal(report.summary.publishDiscordFalseRows, 2);
assert.equal(report.summary.canExecuteFalseRows, 2);
assert.equal(report.summary.entryStopTargetRiskPreservedRows, 2);
assert.equal(report.summary.blockedRows, 0);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.rows.some((row) => row.setupType === 'TurtleSoup'), false);
assert.equal(report.rows.find((row) => row.validSweepLead)?.scannerArtifact.deskTicketState, 'ACTIVE_REVIEW');
assert.equal(report.rows.find((row) => row.invalidStopSweepPenaltyCandidate)?.scannerArtifact.deskTicketState, 'BLOCKED_REVIEW');

const blocked = buildUnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactPackageReport({
  reportDir: 'reports',
  installedScoreComparisonPath: 'installed.json',
  installedScoreComparisonReport: {
    ...installedScore,
    rows: [{
      ...installedScore.rows[1],
      installedPenaltyExpected: true,
    }],
  },
}, '2026-07-18T00:00:00.000Z');

assert.equal(blocked.status, 'fail');
assert.equal(blocked.summary.recommendation, 'reject_fresh_scanner_artifacts');
assert.ok(blocked.blockers.some((item) => item.includes('valid Sweep lead row was penalized')));

console.log('unified positive held-local Sweep penalty fresh scanner-artifact package verified.');
