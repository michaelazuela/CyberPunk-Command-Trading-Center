import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewSweepPenaltyLiveProposalReport,
} from './unified-positive-held-local-preview-sweep-penalty-live-proposal';
import type {
  UnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerOverlayDryRunReport,
} from './unified-positive-held-local-preview-sweep-penalty-fresh-scanner-overlay-dry-run';

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

const freshOverlay: UnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerOverlayDryRunReport = {
  reportType: 'unified_positive_held_local_preview_sweep_penalty_fresh_scanner_overlay_dry_run',
  generatedAt: '2026-07-18T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    reportDir: 'reports',
    sourceProofTimingPath: 'timing.json',
    intakeTriagePath: 'intake.json',
    readinessPath: 'readiness.json',
    scannerDryRunReplayPath: 'scanner.json',
  },
  assumptions: {
    freshOverlayDryRunOnly: true,
    usesOutcomeForEvaluationNotScoring: true,
    invalidStopSweepPenaltyOnly: true,
    normalScannerOutputPreserved: true,
    noOverlayInstalled: true,
    noLiveScannerRun: true,
    noLiveFilterInstalled: true,
    noRankPenaltyInstalled: true,
    noCanExecuteChange: true,
    livePromotionAllowed: false,
  },
  scoring: {
    invalidStopSweepPenaltyPoints: 18,
    baselineDoesNotUseOutcome: true,
  },
  summary: {
    sourceRows: 373,
    joinedRows: 373,
    sweepRows: 100,
    validSweepLeadRows: 80,
    invalidStopSweepPenaltyRows: 20,
    validSweepLeadRowsPenalized: 0,
    overlayPenaltyRows: 20,
    slates: 85,
    changedSlates: 1,
    changedFromInvalidStopSweepSlates: 1,
    changedToProtectedDestinationSlates: 1,
    baselineTopOneMesPl: 1863.83,
    overlayTopOneMesPl: 1898.83,
    topSelectionDeltaOneMesPl: 35,
    scannerDryRunRows: 4,
    scannerZeroLivePublishBehaviorChangeRows: 4,
    scannerBlockedRows: 0,
    recommendedAction: 'research_overlay_candidate_ready_for_live_proposal',
    livePromotionAllowedRows: 0,
  },
  slates: [],
  rows: [],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewSweepPenaltyLiveProposalReport({
  reportDir: 'reports',
  freshScannerOverlayDryRunPath: 'fresh.json',
  freshScannerOverlayDryRunReport: freshOverlay,
}, '2026-07-18T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.recommendation, 'approval_ready_for_narrow_live_rank_penalty');
assert.equal(report.approvalGate.requiredBeforeLiveInstall, true);
assert.equal(report.approvalGate.explicitUserApprovalRequired, true);
assert.equal(report.proposedRule.setupType, 'SweepMssFvgRetrace');
assert.equal(report.proposedRule.appliesOnlyWhen.executionStatus, 'Blocked');
assert.equal(report.proposedRule.appliesOnlyWhen.blockReason, 'InvalidStopLocation');
assert.equal(report.proposedRule.preservesValidSweepLead, true);
assert.equal(report.proposedRule.preservesraidReclaim, true);
assert.equal(report.proposedRule.preservesModelAvailability, true);
assert.equal(report.proposedRule.preservesCanExecute, true);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.match(report.markdown, /No raidReclaim removal/);
assert.match(report.markdown, /No canExecute removal or loosening/);

const blocked = buildUnifiedPositiveHeldLocalPreviewSweepPenaltyLiveProposalReport({
  reportDir: 'reports',
  freshScannerOverlayDryRunPath: 'fresh.json',
  freshScannerOverlayDryRunReport: {
    ...freshOverlay,
    summary: {
      ...freshOverlay.summary,
      validSweepLeadRowsPenalized: 1,
    },
  },
}, '2026-07-18T00:00:00.000Z');

assert.equal(blocked.status, 'fail');
assert.equal(blocked.recommendation, 'reject_live_proposal');
assert.ok(blocked.blockers.some((item) => item.includes('valid Conditional/EntryTriggerPending Sweep rows')));

console.log('unified positive held-local Sweep penalty live proposal verified.');
