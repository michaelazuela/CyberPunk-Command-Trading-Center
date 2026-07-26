import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactSelectionComparisonReport,
} from './unified-positive-held-local-preview-sweep-penalty-fresh-scanner-artifact-selection-comparison';
import type {
  UnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactPackageReport,
} from './unified-positive-held-local-preview-sweep-penalty-fresh-scanner-artifact-package';

const freshPackage: UnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactPackageReport = {
  reportType: 'unified_positive_held_local_preview_sweep_penalty_fresh_scanner_artifact_package',
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
    installedScoreComparisonPath: 'installed.json',
  },
  summary: {
    installedScoreRows: 4,
    freshArtifactRows: 4,
    sweepArtifactRows: 4,
    validSweepLeadArtifactRows: 2,
    invalidStopSweepArtifactRows: 2,
    installedPenaltyArtifactRows: 2,
    validSweepLeadRowsPenalized: 0,
    shouldPostFalseRows: 4,
    publishDiscordFalseRows: 4,
    canExecuteFalseRows: 4,
    entryStopTargetRiskPreservedRows: 4,
    blockedRows: 0,
    recommendation: 'fresh_scanner_artifacts_ready_for_selection_comparison',
    livePromotionAllowedRows: 0,
  },
  rows: [
    {
      ticketId: '2026-07-09-evening-NoInstalledSetup-SHORT-invalid',
      tradeDate: '2026-07-09',
      session: 'evening',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      candidateBookState: 'blocked',
      installedScore: 73,
      validSweepLead: false,
      invalidStopSweepPenaltyCandidate: true,
      installedPenaltyExpected: true,
      scannerArtifact: {
        sourceOfTruth: 'scanner_owned_fresh_candidate_book_artifact',
        deskTicketState: 'BLOCKED_REVIEW',
        reviewOnly: true,
        shouldPost: false,
        publishDiscord: false,
        canExecute: false,
        preservesEntryStopTargetRisk: true,
      },
      blockers: [],
    },
    {
      ticketId: '2026-07-09-evening-NoInstalledSetup-LONG-valid',
      tradeDate: '2026-07-09',
      session: 'evening',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      candidateBookState: 'human_review',
      installedScore: 76,
      validSweepLead: true,
      invalidStopSweepPenaltyCandidate: false,
      installedPenaltyExpected: false,
      scannerArtifact: {
        sourceOfTruth: 'scanner_owned_fresh_candidate_book_artifact',
        deskTicketState: 'ACTIVE_REVIEW',
        reviewOnly: true,
        shouldPost: false,
        publishDiscord: false,
        canExecute: false,
        preservesEntryStopTargetRisk: true,
      },
      blockers: [],
    },
    {
      ticketId: '2026-07-10-morning-NoInstalledSetup-SHORT-valid',
      tradeDate: '2026-07-10',
      session: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      candidateBookState: 'human_review',
      installedScore: 81,
      validSweepLead: true,
      invalidStopSweepPenaltyCandidate: false,
      installedPenaltyExpected: false,
      scannerArtifact: {
        sourceOfTruth: 'scanner_owned_fresh_candidate_book_artifact',
        deskTicketState: 'ACTIVE_REVIEW',
        reviewOnly: true,
        shouldPost: false,
        publishDiscord: false,
        canExecute: false,
        preservesEntryStopTargetRisk: true,
      },
      blockers: [],
    },
    {
      ticketId: '2026-07-10-morning-NoInstalledSetup-LONG-invalid',
      tradeDate: '2026-07-10',
      session: 'morning',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      candidateBookState: 'blocked',
      installedScore: 50,
      validSweepLead: false,
      invalidStopSweepPenaltyCandidate: true,
      installedPenaltyExpected: true,
      scannerArtifact: {
        sourceOfTruth: 'scanner_owned_fresh_candidate_book_artifact',
        deskTicketState: 'BLOCKED_REVIEW',
        reviewOnly: true,
        shouldPost: false,
        publishDiscord: false,
        canExecute: false,
        preservesEntryStopTargetRisk: true,
      },
      blockers: [],
    },
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactSelectionComparisonReport({
  reportDir: 'reports',
  freshScannerArtifactPackagePath: 'fresh.json',
  freshScannerArtifactPackageReport: freshPackage,
}, '2026-07-18T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.recommendation, 'fresh_artifact_selection_comparison_supports_installed_penalty');
assert.equal(report.summary.freshArtifactRows, 4);
assert.equal(report.summary.selectionRows, 4);
assert.equal(report.summary.slates, 2);
assert.equal(report.summary.changedSlates, 1);
assert.equal(report.summary.changedFromInvalidStopToValidSweepLeadSlates, 1);
assert.equal(report.summary.changedFromValidSweepLeadToInvalidStopSlates, 0);
assert.equal(report.summary.invalidStopBaselineTopSlates, 1);
assert.equal(report.summary.invalidStopInstalledTopSlates, 0);
assert.equal(report.summary.validSweepLeadInstalledTopSlates, 2);
assert.equal(report.summary.installedPenaltyRows, 2);
assert.equal(report.summary.validSweepLeadRowsPenalized, 0);
assert.equal(report.summary.shouldPostFalseRows, 4);
assert.equal(report.summary.publishDiscordFalseRows, 4);
assert.equal(report.summary.canExecuteFalseRows, 4);
assert.equal(report.summary.entryStopTargetRiskPreservedRows, 4);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.rows.every((row) => row.livePromotionAllowed === false), true);

const invalidToValidSlate = report.slates.find((slate) => slate.slateId === '2026-07-09|evening');
assert.equal(invalidToValidSlate?.baselineTopInvalidStop, true);
assert.equal(invalidToValidSlate?.installedTopValidSweepLead, true);

const blocked = buildUnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactSelectionComparisonReport({
  reportDir: 'reports',
  freshScannerArtifactPackagePath: 'fresh.json',
  freshScannerArtifactPackageReport: {
    ...freshPackage,
    rows: [{
      ...freshPackage.rows[1],
      installedPenaltyExpected: true,
    }],
  },
}, '2026-07-18T00:00:00.000Z');

assert.equal(blocked.status, 'fail');
assert.equal(blocked.summary.recommendation, 'reject_fresh_artifact_selection_comparison');
assert.ok(blocked.blockers.some((item) => item.includes('valid Sweep lead rows were penalized')));

console.log('unified positive held-local Sweep penalty fresh scanner-artifact selection comparison verified.');
