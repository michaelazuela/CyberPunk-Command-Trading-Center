import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport,
} from './unified-positive-held-local-preview-sweep-penalty-installed-score-comparison';
import type { UnifiedPositiveHeldLocalPreviewIntakeTriageReport } from './unified-positive-held-local-preview-intake-triage';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport } from './unified-positive-held-local-preview-replay-package-source-proof-timing';
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

function timingRow(
  id: string,
  setupType: string,
): UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport['rows'][number] {
  return {
    ticketId: id,
    tradeDate: '2026-07-09',
    session: 'evening',
    setupType,
    direction: id.includes('SHORT') ? 'SHORT' : 'LONG',
    outcomeBucket: 'winner_t1_t2',
    outcomeLabel: 't1_and_t2_hit',
    resolvedOneMesPl: 40,
    proofTime: '2026-07-09T19:00:00.0000000',
    entryHitTime: '2026-07-09T19:05:00.0000000',
    proofToEntryMinutes: 5,
    riskPoints: 8,
    mfeR: 2,
    maeR: 0.2,
    issueTags: [],
  };
}

function intakeRow(
  id: string,
  setupType: string,
  executionStatus: string,
  blockReason: string,
): UnifiedPositiveHeldLocalPreviewIntakeTriageReport['rows'][number] {
  return {
    intakeId: id,
    tradeDate: '2026-07-09',
    session: 'evening',
    instrument: 'MES',
    setupType,
    direction: id.includes('SHORT') ? 'SHORT' : 'LONG',
    firstSeenTime: '2026-07-09T19:00:00.0000000',
    lastSeenTime: '2026-07-09T19:05:00.0000000',
    occurrences: 2,
    entry: 7500,
    stop: id.includes('SHORT') ? 7508 : 7492,
    target1: id.includes('SHORT') ? 7488 : 7512,
    target2: id.includes('SHORT') ? 7484 : 7516,
    riskPoints: 8,
    candidateState: null,
    executionStatus,
    detectedStatus: 'Conditional',
    blockReason,
    sourceFile: 'fixture.json',
    intakeDecision: 'candidate_for_review_intake',
    proofState: 'scanner_held_complete',
    modelPriority: 80,
    proofPriority: 55,
    occurrencePriority: 10,
    riskQuality: 'normal',
    triageScore: 150,
    triageDecision: 'selected_for_replay_package',
    triageReason: 'Fixture.',
  };
}

const invalidSweepId = '2026-07-09-evening-SweepMssFvgRetrace-SHORT';
const validSweepId = '2026-07-09-evening-SweepMssFvgRetrace-LONG';
const turtleId = '2026-07-09-evening-TurtleSoup-LONG';

const sourceProofTimingReport: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport = {
  reportType: 'unified_positive_held_local_preview_replay_package_source_proof_timing',
  generatedAt: '2026-07-18T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: 'reports', replayPackageOutcomePath: 'outcome.json' },
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
    winners: 3,
    losses: 0,
    unresolved: 0,
    blocked: 0,
    grossResolvedOneMesPl: 120,
    positiveModelGroups: 2,
    negativeModelGroups: 0,
    unresolvedModelGroups: 0,
    livePromotionAllowedRows: 0,
  },
  modelTiming: [],
  rows: [
    timingRow(invalidSweepId, 'SweepMssFvgRetrace'),
    timingRow(validSweepId, 'SweepMssFvgRetrace'),
    timingRow(turtleId, 'TurtleSoup'),
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const intakeTriageReport: UnifiedPositiveHeldLocalPreviewIntakeTriageReport = {
  reportType: 'unified_positive_held_local_preview_intake_triage',
  generatedAt: '2026-07-18T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: 'reports', intakeReportPath: 'intake.json', maxReplayPackageRows: 500, maxRowsPerModel: 100 },
  summary: {
    intakeRowsRead: 3,
    newIntakeCandidates: 3,
    alreadyProcessedReferenceRows: 0,
    selectedReplayPackageRows: 3,
    heldForLaterBatchRows: 0,
    modelGroups: 2,
    proofStateGroups: 1,
    livePromotionAllowedRows: 0,
  },
  groups: [],
  rows: [
    intakeRow(invalidSweepId, 'SweepMssFvgRetrace', 'Blocked', 'InvalidStopLocation'),
    intakeRow(validSweepId, 'SweepMssFvgRetrace', 'Conditional', 'EntryTriggerPending'),
    intakeRow(turtleId, 'TurtleSoup', 'Conditional', 'EntryTriggerPending'),
  ],
  selectedReplayPackage: [],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const overlayReport: UnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerOverlayDryRunReport = {
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
  scoring: { invalidStopSweepPenaltyPoints: 18, baselineDoesNotUseOutcome: true },
  summary: {
    sourceRows: 3,
    joinedRows: 3,
    sweepRows: 2,
    validSweepLeadRows: 1,
    invalidStopSweepPenaltyRows: 1,
    validSweepLeadRowsPenalized: 0,
    overlayPenaltyRows: 1,
    slates: 1,
    changedSlates: 1,
    changedFromInvalidStopSweepSlates: 1,
    changedToProtectedDestinationSlates: 1,
    baselineTopOneMesPl: 5,
    overlayTopOneMesPl: 40,
    topSelectionDeltaOneMesPl: 35,
    scannerDryRunRows: 1,
    scannerZeroLivePublishBehaviorChangeRows: 1,
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

const report = buildUnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport({
  reportDir: 'reports',
  sourceProofTimingPath: 'timing.json',
  sourceProofTimingReport,
  intakeTriagePath: 'intake.json',
  intakeTriageReport,
  freshScannerOverlayDryRunPath: 'overlay.json',
  freshScannerOverlayDryRunReport: overlayReport,
}, '2026-07-18T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.recommendation, 'installed_score_path_matches_research_overlay');
assert.equal(report.summary.validSweepLeadRows, 1);
assert.equal(report.summary.invalidStopSweepPenaltyRows, 1);
assert.equal(report.summary.installedPenaltyRows, 1);
assert.equal(report.summary.validSweepLeadRowsPenalized, 0);
assert.equal(report.summary.canExecuteTrueRows, 0);
assert.equal(report.summary.entryStopTargetRiskDriftRows, 0);
assert.equal(report.summary.overlayTopSelectionDeltaOneMesPl, 35);
assert.equal(report.summary.overlayMatchesExpectedRows, true);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);

const invalidSweep = report.rows.find((row) => row.ticketId === invalidSweepId);
const validSweep = report.rows.find((row) => row.ticketId === validSweepId);
assert.equal(invalidSweep?.installedPenaltyExpected, true);
assert.equal(validSweep?.installedPenaltyExpected, false);
assert.equal(validSweep?.entryPreserved, true);
assert.equal(validSweep?.stopPreserved, true);
assert.equal(validSweep?.target1Preserved, true);
assert.equal(validSweep?.target2Preserved, true);
assert.equal(validSweep?.riskPreserved, true);

console.log('unified positive held-local Sweep penalty installed-score comparison verified.');
