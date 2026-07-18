import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerOverlayDryRunReport,
} from './unified-positive-held-local-preview-sweep-penalty-fresh-scanner-overlay-dry-run';
import type { UnifiedPositiveHeldLocalPreviewIntakeTriageReport } from './unified-positive-held-local-preview-intake-triage';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport } from './unified-positive-held-local-preview-replay-package-source-proof-timing';
import type { UnifiedPositiveScannerDryRunReplayReport } from './unified-positive-scanner-dry-run-replay';
import type { UnifiedPositiveHeldLocalPreviewSweepPenaltyScannerOverlayReadinessReport } from './unified-positive-held-local-preview-sweep-penalty-scanner-overlay-readiness';

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

function timingRow(id: string, setupType: string, resolvedOneMesPl: number): UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport['rows'][number] {
  return {
    ticketId: id,
    tradeDate: id.slice(0, 10),
    session: 'morning',
    setupType,
    direction: id.includes('SHORT') ? 'SHORT' : 'LONG',
    outcomeBucket: resolvedOneMesPl > 0 ? 'winner_t1_t2' : 'loss_stopped_before_t1',
    outcomeLabel: resolvedOneMesPl > 0 ? 't1_and_t2_hit' : 'stopped_before_t1',
    resolvedOneMesPl,
    proofTime: `${id.slice(0, 10)}T09:30:00`,
    entryHitTime: `${id.slice(0, 10)}T09:35:00`,
    proofToEntryMinutes: 5,
    riskPoints: 8,
    mfeR: resolvedOneMesPl > 0 ? 2 : 0.3,
    maeR: resolvedOneMesPl > 0 ? 0.2 : 1.1,
    issueTags: resolvedOneMesPl > 0 ? ['full_delivery'] : ['stopped_before_t1'],
  };
}

function intakeRow(id: string, setupType: string, executionStatus: string, blockReason: string, modelPriority: number): UnifiedPositiveHeldLocalPreviewIntakeTriageReport['rows'][number] {
  return {
    intakeId: id,
    tradeDate: id.slice(0, 10),
    session: 'morning',
    instrument: 'MES',
    setupType,
    direction: id.includes('SHORT') ? 'SHORT' : 'LONG',
    firstSeenTime: `${id.slice(0, 10)}T09:30:00.0000000`,
    lastSeenTime: `${id.slice(0, 10)}T09:35:00.0000000`,
    occurrences: 8,
    entry: 7500,
    stop: 7492,
    target1: 7512,
    target2: 7516,
    riskPoints: 8,
    candidateState: null,
    executionStatus,
    detectedStatus: 'Conditional',
    blockReason,
    sourceFile: 'scanner-decision-tape-fixture.json',
    intakeDecision: 'candidate_for_review_intake',
    proofState: 'scanner_held_complete',
    modelPriority,
    proofPriority: 55,
    occurrencePriority: 10,
    riskQuality: 'normal',
    triageScore: 160,
    triageDecision: 'selected_for_replay_package',
    triageReason: 'Fixture.',
  };
}

const invalidSweepId = '2026-06-01-morning-SweepMssFvgRetrace-SHORT';
const validSweepId = '2026-06-01-morning-SweepMssFvgRetrace-LONG';
const turtleSoupId = '2026-06-01-morning-TurtleSoup-LONG';

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
    winners: 2,
    losses: 1,
    unresolved: 0,
    blocked: 0,
    grossResolvedOneMesPl: 125,
    positiveModelGroups: 2,
    negativeModelGroups: 0,
    unresolvedModelGroups: 0,
    livePromotionAllowedRows: 0,
  },
  modelTiming: [],
  rows: [
    timingRow(invalidSweepId, 'SweepMssFvgRetrace', -45),
    timingRow(validSweepId, 'SweepMssFvgRetrace', 80),
    timingRow(turtleSoupId, 'TurtleSoup', 90),
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
    intakeRow(invalidSweepId, 'SweepMssFvgRetrace', 'Blocked', 'InvalidStopLocation', 90),
    intakeRow(validSweepId, 'SweepMssFvgRetrace', 'Conditional', 'EntryTriggerPending', 78),
    intakeRow(turtleSoupId, 'TurtleSoup', 'Conditional', 'EntryTriggerPending', 76),
  ],
  selectedReplayPackage: [],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const readinessReport: UnifiedPositiveHeldLocalPreviewSweepPenaltyScannerOverlayReadinessReport = {
  reportType: 'unified_positive_held_local_preview_sweep_penalty_scanner_overlay_readiness',
  generatedAt: '2026-07-18T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: 'reports', sweepPenaltyGuardedReplayPath: 'guarded.json', scannerDryRunReplayPath: 'scanner.json' },
  assumptions: {
    readinessOnly: true,
    noOverlayInstalled: true,
    noLiveScannerRun: true,
    noLiveFilterInstalled: true,
    noRankPenaltyInstalled: true,
    noCanExecuteChange: true,
    livePromotionAllowed: false,
  },
  summary: {
    guardedReplayStatus: 'pass',
    scannerDryRunStatus: 'pass',
    validSweepLeadRows: 1,
    invalidStopSweepPenaltyRows: 1,
    validSweepLeadRowsPenalized: 0,
    guardedChangedSlates: 1,
    guardedTopSelectionDeltaOneMesPl: 125,
    scannerDryRunRows: 1,
    scannerZeroLivePublishBehaviorChangeRows: 1,
    scannerBlockedRows: 0,
    recommendedAction: 'ready_for_fresh_research_scanner_overlay_dry_run',
    livePromotionAllowedRows: 0,
  },
  blockers: [],
  recommendations: [],
  markdown: '',
};

const scannerDryRunReplayReport: UnifiedPositiveScannerDryRunReplayReport = {
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
  rows: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerOverlayDryRunReport({
  reportDir: 'reports',
  sourceProofTimingPath: 'timing.json',
  sourceProofTimingReport,
  intakeTriagePath: 'triage.json',
  intakeTriageReport,
  readinessPath: 'readiness.json',
  readinessReport,
  scannerDryRunReplayPath: 'scanner.json',
  scannerDryRunReplayReport,
}, '2026-07-18T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_sweep_penalty_fresh_scanner_overlay_dry_run');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesScannerBehavior, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.assumptions.noOverlayInstalled, true);
assert.equal(report.summary.validSweepLeadRows, 1);
assert.equal(report.summary.invalidStopSweepPenaltyRows, 1);
assert.equal(report.summary.validSweepLeadRowsPenalized, 0);
assert.equal(report.summary.overlayPenaltyRows, 1);
assert.equal(report.summary.changedSlates, 1);
assert.equal(report.summary.changedFromInvalidStopSweepSlates, 1);
assert.equal(report.summary.changedToProtectedDestinationSlates, 1);
assert.equal(report.summary.baselineTopOneMesPl, -45);
assert.equal(report.summary.overlayTopOneMesPl, 80);
assert.equal(report.summary.topSelectionDeltaOneMesPl, 125);
assert.equal(report.summary.scannerZeroLivePublishBehaviorChangeRows, 1);
assert.equal(report.summary.scannerBlockedRows, 0);
assert.equal(report.summary.recommendedAction, 'research_overlay_candidate_ready_for_live_proposal');

const validSweep = report.rows.find((row) => row.ticketId === validSweepId);
assert.equal(validSweep?.validSweepLead, true);
assert.equal(validSweep?.overlayPenaltyApplied, false);
assert.equal(validSweep?.normalScannerOutputPreserved, true);
assert.equal(validSweep?.scannerVisibleEligible, false);

const invalidSweep = report.rows.find((row) => row.ticketId === invalidSweepId);
assert.equal(invalidSweep?.invalidStopSweepPenaltyCandidate, true);
assert.equal(invalidSweep?.overlayPenaltyApplied, true);
assert.match(report.markdown, /Fresh Scanner Overlay Dry-Run/);

const unsafeScanner = structuredClone(scannerDryRunReplayReport);
unsafeScanner.summary.zeroLivePublishBehaviorChangeRows = 0;
unsafeScanner.summary.blockedRows = 1;
const unsafe = buildUnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerOverlayDryRunReport({
  reportDir: 'reports',
  sourceProofTimingPath: 'timing.json',
  sourceProofTimingReport,
  intakeTriagePath: 'triage.json',
  intakeTriageReport,
  readinessPath: 'readiness.json',
  readinessReport,
  scannerDryRunReplayPath: 'scanner.json',
  scannerDryRunReplayReport: unsafeScanner,
}, '2026-07-18T00:02:00.000Z');

assert.equal(unsafe.status, 'fail');
assert.ok(unsafe.blockers.includes('scanner dry-run has blocked rows'));
assert.ok(unsafe.blockers.includes('scanner dry-run would change live publish behavior'));

console.log('unified positive held-local Sweep penalty fresh scanner overlay dry-run verified.');
