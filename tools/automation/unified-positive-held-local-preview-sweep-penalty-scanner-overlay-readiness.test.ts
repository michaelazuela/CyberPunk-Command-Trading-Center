import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewSweepPenaltyScannerOverlayReadinessReport,
} from './unified-positive-held-local-preview-sweep-penalty-scanner-overlay-readiness';
import type { UnifiedPositiveScannerDryRunReplayReport } from './unified-positive-scanner-dry-run-replay';
import type {
  UnifiedPositiveHeldLocalPreviewSweepPenaltyGuardedReplayReport,
} from './unified-positive-held-local-preview-sweep-penalty-guarded-replay';

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

const guardedReport: UnifiedPositiveHeldLocalPreviewSweepPenaltyGuardedReplayReport = {
  reportType: 'unified_positive_held_local_preview_sweep_penalty_guarded_replay',
  generatedAt: '2026-07-18T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: 'reports', sourceProofTimingPath: 'timing.json', intakeTriagePath: 'triage.json', penaltyValidationPath: 'penalty.json' },
  assumptions: {
    dryRunOnly: true,
    usesOutcomeForEvaluationNotScoring: true,
    invalidStopSweepPenaltyOnly: true,
    validSweepLeadRowsProtected: true,
    strongerAlternateTicketsProtected: true,
    noLiveFilterInstalled: true,
    noRankPenaltyInstalled: true,
    noCanExecuteChange: true,
    livePromotionAllowed: false,
  },
  scoring: { invalidStopSweepPenaltyPoints: 18, baselineDoesNotUseOutcome: true },
  summary: {
    sourceRows: 373,
    joinedRows: 373,
    sweepRows: 100,
    validSweepLeadRows: 80,
    invalidStopSweepPenaltyRows: 20,
    validSweepLeadRowsPenalized: 0,
    slates: 85,
    changedSlates: 1,
    changedFromInvalidStopSweepSlates: 1,
    changedToValidSweepOrAlternateSlates: 1,
    baselineTopOneMesPl: 1863.83,
    guardedTopOneMesPl: 1898.83,
    topSelectionDeltaOneMesPl: 35,
    recommendedAction: 'research_penalty_ready_for_fresh_scanner_dry_run',
    livePromotionAllowedRows: 0,
  },
  slates: [],
  rows: [],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const scannerReport: UnifiedPositiveScannerDryRunReplayReport = {
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
    adapterRowsLoaded: 4,
    pairedDryRunRows: 4,
    heldLocalArtifactsObserved: 4,
    zeroLivePublishBehaviorChangeRows: 4,
    blockedRows: 0,
    normalShouldPostFalseRows: 4,
    adapterShouldPostFalseRows: 4,
    normalCanExecuteFalseRows: 4,
    adapterCanExecuteFalseRows: 4,
    normalPublishDiscordFalseRows: 4,
    adapterPublishDiscordFalseRows: 4,
  },
  rows: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewSweepPenaltyScannerOverlayReadinessReport({
  reportDir: 'reports',
  sweepPenaltyGuardedReplayPath: 'guarded.json',
  sweepPenaltyGuardedReplayReport: guardedReport,
  scannerDryRunReplayPath: 'scanner.json',
  scannerDryRunReplayReport: scannerReport,
}, '2026-07-18T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_sweep_penalty_scanner_overlay_readiness');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.assumptions.noOverlayInstalled, true);
assert.equal(report.summary.validSweepLeadRows, 80);
assert.equal(report.summary.validSweepLeadRowsPenalized, 0);
assert.equal(report.summary.scannerDryRunRows, 4);
assert.equal(report.summary.scannerZeroLivePublishBehaviorChangeRows, 4);
assert.equal(report.summary.scannerBlockedRows, 0);
assert.equal(report.summary.recommendedAction, 'ready_for_fresh_research_scanner_overlay_dry_run');
assert.equal(report.summary.livePromotionAllowedRows, 0);
assert.match(report.markdown, /Scanner Overlay Readiness/);

const unsafeScanner = structuredClone(scannerReport);
unsafeScanner.status = 'fail';
unsafeScanner.summary.zeroLivePublishBehaviorChangeRows = 3;
unsafeScanner.summary.blockedRows = 1;
const unsafe = buildUnifiedPositiveHeldLocalPreviewSweepPenaltyScannerOverlayReadinessReport({
  reportDir: 'reports',
  sweepPenaltyGuardedReplayPath: 'guarded.json',
  sweepPenaltyGuardedReplayReport: guardedReport,
  scannerDryRunReplayPath: 'scanner.json',
  scannerDryRunReplayReport: unsafeScanner,
}, '2026-07-18T00:02:00.000Z');

assert.equal(unsafe.status, 'fail');
assert.ok(unsafe.blockers.includes('scanner dry-run replay status fail'));
assert.ok(unsafe.blockers.includes('scanner dry-run has blocked rows'));

console.log('unified positive held-local Sweep penalty scanner overlay readiness verified.');
