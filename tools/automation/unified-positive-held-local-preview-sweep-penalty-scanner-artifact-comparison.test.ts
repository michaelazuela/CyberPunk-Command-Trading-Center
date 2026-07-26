import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewSweepPenaltyScannerArtifactComparisonReport,
} from './unified-positive-held-local-preview-sweep-penalty-scanner-artifact-comparison';
import type { UnifiedPositiveScannerDryRunReplayReport } from './unified-positive-scanner-dry-run-replay';
import type {
  UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport,
} from './unified-positive-held-local-preview-sweep-penalty-installed-score-comparison';

const scannerDryRun: UnifiedPositiveScannerDryRunReplayReport = {
  reportType: 'unified_positive_scanner_dry_run_replay',
  generatedAt: '2026-07-18T00:00:00.000Z',
  status: 'pass',
  authority: {
    readOnly: true,
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
  },
  source: { heldLocalAdapterPath: 'adapter.json' },
  summary: {
    adapterRowsLoaded: 1,
    pairedDryRunRows: 1,
    heldLocalArtifactsObserved: 1,
    zeroLivePublishBehaviorChangeRows: 1,
    blockedRows: 0,
    normalShouldPostFalseRows: 1,
    adapterShouldPostFalseRows: 1,
    normalCanExecuteFalseRows: 1,
    adapterCanExecuteFalseRows: 1,
    normalPublishDiscordFalseRows: 1,
    adapterPublishDiscordFalseRows: 1,
  },
  rows: [{
    ticketId: '2026-07-09-evening-NoInstalledSetup-SHORT',
    sourceSnapshotId: 'scanner-evening-fixture',
    session: 'evening',
    setupType: 'NoInstalledSetup',
    direction: 'SHORT',
    normalDeskOutput: {
      sourceOfTruth: 'scanner_desk_state_normal_output_preserved',
      shouldPost: false,
      publishDiscord: false,
      canExecute: false,
      reason: 'Fixture.',
    },
    heldLocalOutput: {
      sourceOfTruth: 'scanner_owned_held_local_review_ticket_adapter',
      deskTicketState: 'ACTIVE_REVIEW',
      shouldPost: false,
      publishDiscord: false,
      canExecute: false,
      reviewOnly: true,
    },
    comparison: {
      zeroLivePublishBehaviorChange: true,
      heldLocalBesideNormalOutput: true,
      scannerBehaviorUnchanged: true,
      blockers: [],
    },
  }],
  recommendations: [],
  markdown: '',
};

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
    sourceRows: 2,
    joinedRows: 2,
    candidateBookRows: 2,
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
      ticketId: '2026-07-09-evening-NoInstalledSetup-SHORT',
      tradeDate: '2026-07-09',
      session: 'evening',
      setupType: 'NoInstalledSetup',
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
      ticketId: '2026-07-09-evening-NoInstalledSetup-LONG',
      tradeDate: '2026-07-09',
      session: 'evening',
      setupType: 'NoInstalledSetup',
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
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewSweepPenaltyScannerArtifactComparisonReport({
  reportDir: 'reports',
  scannerDryRunReplayPath: 'scanner.json',
  scannerDryRunReplayReport: scannerDryRun,
  installedScoreComparisonPath: 'installed.json',
  installedScoreComparisonReport: installedScore,
}, '2026-07-18T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.recommendation, 'scanner_artifacts_preserve_live_behavior');
assert.equal(report.summary.scannerDryRunRows, 1);
assert.equal(report.summary.joinedScannerRows, 1);
assert.equal(report.summary.invalidStopSweepScannerRows, 1);
assert.equal(report.summary.validSweepLeadScannerRows, 0);
assert.equal(report.summary.scannerBehaviorChangedRows, 0);
assert.equal(report.summary.shouldPostChangedRows, 0);
assert.equal(report.summary.publishDiscordChangedRows, 0);
assert.equal(report.summary.canExecuteChangedRows, 0);
assert.equal(report.summary.installedPenaltyRows, 1);
assert.equal(report.summary.installedValidSweepLeadRowsPenalized, 0);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.rows[0].installedPenaltyExpected, true);
assert.equal(report.rows[0].scannerBehaviorChanged, false);

const needsFresh = buildUnifiedPositiveHeldLocalPreviewSweepPenaltyScannerArtifactComparisonReport({
  reportDir: 'reports',
  scannerDryRunReplayPath: 'scanner.json',
  scannerDryRunReplayReport: {
    ...scannerDryRun,
    rows: [{
      ...scannerDryRun.rows[0],
      ticketId: '2026-07-09-evening-historicalReview-LONG',
      setupType: 'historicalReview',
      direction: 'LONG',
    }],
  },
  installedScoreComparisonPath: 'installed.json',
  installedScoreComparisonReport: {
    ...installedScore,
    rows: [{
      ...installedScore.rows[0],
      ticketId: '2026-07-09-evening-historicalReview-LONG',
      setupType: 'historicalReview',
      invalidStopSweepPenaltyCandidate: false,
      installedPenaltyExpected: false,
    }],
  },
}, '2026-07-18T00:00:00.000Z');

assert.equal(needsFresh.status, 'pass');
assert.equal(needsFresh.summary.recommendation, 'needs_fresh_scanner_artifacts');

const missingInstalledCoverage = buildUnifiedPositiveHeldLocalPreviewSweepPenaltyScannerArtifactComparisonReport({
  reportDir: 'reports',
  scannerDryRunReplayPath: 'scanner.json',
  scannerDryRunReplayReport: {
    ...scannerDryRun,
    rows: [{
      ...scannerDryRun.rows[0],
      ticketId: '2026-07-10-evening-historicalReview-LONG',
      setupType: 'historicalReview',
      direction: 'LONG',
    }],
  },
  installedScoreComparisonPath: 'installed.json',
  installedScoreComparisonReport: installedScore,
}, '2026-07-18T00:00:00.000Z');

assert.equal(missingInstalledCoverage.status, 'pass');
assert.equal(missingInstalledCoverage.summary.scannerRowsMissingInstalledScore, 1);
assert.equal(missingInstalledCoverage.summary.recommendation, 'needs_fresh_scanner_artifacts');

console.log('unified positive held-local Sweep penalty scanner-artifact comparison verified.');
