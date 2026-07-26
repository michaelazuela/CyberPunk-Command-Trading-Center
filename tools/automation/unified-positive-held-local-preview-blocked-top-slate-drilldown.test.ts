import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewBlockedTopSlateDrilldownReport,
} from './unified-positive-held-local-preview-blocked-top-slate-drilldown';
import type { UnifiedPositiveHeldLocalPreviewIntakeTriageReport } from './unified-positive-held-local-preview-intake-triage';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport,
} from './unified-positive-held-local-preview-replay-package-source-proof-timing';
import type {
  UnifiedPositiveHeldLocalPreviewSweepPenaltyFullSlateSelectionComparisonReport,
} from './unified-positive-held-local-preview-sweep-penalty-full-slate-selection-comparison';

const fullSlate: UnifiedPositiveHeldLocalPreviewSweepPenaltyFullSlateSelectionComparisonReport = {
  reportType: 'unified_positive_held_local_preview_sweep_penalty_full_slate_selection_comparison',
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
  scoring: {
    reconstructedInvalidStopPenaltyPoints: 18,
    baselineReconstruction: 'installedScorePlusPenaltyForInvalidStopSweepRows',
    installedScoreAuthority: 'candidateBookInstalledScoreComparison',
  },
  summary: {
    installedScoreRows: 1,
    selectionRows: 1,
    slates: 1,
    changedSlates: 0,
    changedFromInvalidStopSweepToValidReviewSlates: 0,
    changedFromValidReviewToInvalidStopSweepSlates: 0,
    invalidStopSweepBaselineTopSlates: 1,
    invalidStopSweepInstalledTopSlates: 1,
    validReviewBaselineTopSlates: 0,
    validReviewInstalledTopSlates: 0,
    validSweepLeadRows: 0,
    invalidStopSweepRows: 1,
    installedPenaltyRows: 1,
    validSweepLeadRowsPenalized: 0,
    canExecuteFalseRows: 1,
    entryStopTargetRiskPreservedRows: 1,
    livePromotionAllowedRows: 0,
    recommendation: 'full_slate_selection_neutral_keep_research_only',
  },
  slates: [{
    slateId: '2026-06-12|morning',
    tradeDate: '2026-06-12',
    session: 'morning',
    rows: 1,
    baselineTopTicketId: '2026-06-12-morning-NoInstalledSetup-LONG',
    baselineTopSetupType: 'NoInstalledSetup',
    baselineTopState: 'blocked',
    baselineTopScore: 43.94,
    baselineTopInvalidStopSweep: true,
    baselineTopValidReviewCandidate: false,
    installedTopTicketId: '2026-06-12-morning-NoInstalledSetup-LONG',
    installedTopSetupType: 'NoInstalledSetup',
    installedTopState: 'blocked',
    installedTopScore: 25.94,
    installedTopInvalidStopSweep: true,
    installedTopValidReviewCandidate: false,
    topChanged: false,
    changedFromInvalidStopSweepToValidReview: false,
    changedFromValidReviewToInvalidStopSweep: false,
  }],
  rows: [],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const intake: UnifiedPositiveHeldLocalPreviewIntakeTriageReport = {
  reportType: 'unified_positive_held_local_preview_intake_triage',
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
    intakeReportPath: 'reviewed.json',
    maxReplayPackageRows: 1,
    maxRowsPerModel: 1,
  },
  summary: {
    intakeRowsRead: 2,
    newIntakeCandidates: 2,
    alreadyProcessedReferenceRows: 0,
    selectedReplayPackageRows: 1,
    heldForLaterBatchRows: 1,
    modelGroups: 1,
    proofStateGroups: 1,
    livePromotionAllowedRows: 0,
  },
  groups: [],
  rows: [
    {
      intakeId: '2026-06-12-morning-NoInstalledSetup-LONG',
      tradeDate: '2026-06-12',
      session: 'morning',
      instrument: 'MES',
      setupType: 'NoInstalledSetup',
      direction: 'LONG',
      firstSeenTime: '2026-06-12T10:10:00.0000000',
      lastSeenTime: '2026-06-12T11:55:00.0000000',
      occurrences: 18,
      entry: 7395,
      stop: 7432,
      target1: 7450.5,
      target2: 7470,
      riskPoints: 37,
      candidateState: null,
      executionStatus: 'Blocked',
      detectedStatus: 'Blocked',
      blockReason: 'InvalidStopLocation',
      sourceFile: 'scanner-decision-tape-2026-06-12-MES-morning.json',
      intakeDecision: 'candidate_for_review_intake',
      proofState: 'scanner_held_complete',
      modelPriority: 78,
      proofPriority: 55,
      occurrencePriority: 18,
      riskQuality: 'wide',
      triageScore: 157,
      triageDecision: 'selected_for_replay_package',
      triageReason: 'Selected by read-only triage.',
    },
    {
      intakeId: '2026-06-12-morning-NoInstalledSetup-SHORT',
      tradeDate: '2026-06-12',
      session: 'morning',
      instrument: 'MES',
      setupType: 'NoInstalledSetup',
      direction: 'SHORT',
      firstSeenTime: '2026-06-12T10:00:00.0000000',
      lastSeenTime: '2026-06-12T11:45:00.0000000',
      occurrences: 3,
      entry: 7413.25,
      stop: 7444.25,
      target1: 7366.75,
      target2: 7281,
      riskPoints: 31,
      candidateState: null,
      executionStatus: 'Conditional',
      detectedStatus: 'Possible',
      blockReason: 'EntryTriggerPending',
      sourceFile: 'scanner-decision-tape-2026-06-12-MES-morning.json',
      intakeDecision: 'candidate_for_review_intake',
      proofState: 'scanner_held_complete',
      modelPriority: 78,
      proofPriority: 55,
      occurrencePriority: 3,
      riskQuality: 'wide',
      triageScore: 142,
      triageDecision: 'held_for_later_batch',
      triageReason: 'Held until selected into a small replay package.',
    },
  ],
  selectedReplayPackage: [],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const timing: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport = {
  reportType: 'unified_positive_held_local_preview_replay_package_source_proof_timing',
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
    evaluatedRows: 1,
    winners: 0,
    losses: 0,
    unresolved: 0,
    blocked: 1,
    grossResolvedOneMesPl: null,
    positiveModelGroups: 0,
    negativeModelGroups: 0,
    unresolvedModelGroups: 0,
    livePromotionAllowedRows: 0,
  },
  modelTiming: [],
  rows: [{
    ticketId: '2026-06-12-morning-NoInstalledSetup-LONG',
    tradeDate: '2026-06-12',
    session: 'morning',
    setupType: 'NoInstalledSetup',
    direction: 'LONG',
    outcomeBucket: 'blocked',
    outcomeLabel: 'blocked',
    resolvedOneMesPl: null,
    proofTime: '2026-06-12T10:10:00',
    entryHitTime: null,
    proofToEntryMinutes: null,
    riskPoints: 37,
    mfeR: null,
    maeR: null,
    issueTags: ['clean_research_row'],
  }],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewBlockedTopSlateDrilldownReport({
  reportDir: 'reports',
  fullSlateSelectionComparisonPath: 'full-slate.json',
  fullSlateSelectionComparisonReport: fullSlate,
  intakeTriagePath: 'intake.json',
  intakeTriageReport: intake,
  sourceProofTimingPath: 'timing.json',
  sourceProofTimingReport: timing,
}, '2026-07-18T00:00:00.000Z');

assert.equal(report.status, 'pass');
assert.equal(report.summary.recommendation, 'fix_replay_package_triage_selection_research_only');
assert.equal(report.summary.blockedTopSlates, 1);
assert.equal(report.summary.validCandidateHeldOutSlates, 1);
assert.equal(report.summary.noValidCandidateSlates, 0);
assert.equal(report.summary.missingContextSlates, 0);
assert.equal(report.rows[0].rootCause, 'valid_candidate_held_out_by_triage_selection');
assert.deepEqual(report.rows[0].selectedReplayRows, ['2026-06-12-morning-NoInstalledSetup-LONG']);
assert.deepEqual(report.rows[0].heldValidReviewRows, ['2026-06-12-morning-NoInstalledSetup-SHORT']);
assert.equal(report.rows[0].intake.find((row) => row.intakeId.endsWith('-SHORT'))?.validCandidateHeldForLater, true);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.readsLiveBridge, false);
assert.equal(report.authority.changesCanExecute, false);

const cleared = buildUnifiedPositiveHeldLocalPreviewBlockedTopSlateDrilldownReport({
  reportDir: 'reports',
  fullSlateSelectionComparisonPath: 'full-slate.json',
  fullSlateSelectionComparisonReport: {
    ...fullSlate,
    slates: [{
      ...fullSlate.slates[0],
      installedTopInvalidStopSweep: false,
      installedTopValidReviewCandidate: true,
      installedTopTicketId: '2026-06-12-morning-NoInstalledSetup-SHORT',
    }],
  },
  intakeTriagePath: 'intake.json',
  intakeTriageReport: intake,
  sourceProofTimingPath: 'timing.json',
  sourceProofTimingReport: timing,
}, '2026-07-18T00:00:30.000Z');

assert.equal(cleared.status, 'pass');
assert.equal(cleared.summary.recommendation, 'no_blocked_top_slates_remaining');
assert.equal(cleared.summary.blockedTopSlates, 0);
assert.equal(cleared.blockers.length, 0);

const blocked = buildUnifiedPositiveHeldLocalPreviewBlockedTopSlateDrilldownReport({
  reportDir: 'reports',
  fullSlateSelectionComparisonPath: null,
  fullSlateSelectionComparisonReport: null,
  intakeTriagePath: 'intake.json',
  intakeTriageReport: intake,
  sourceProofTimingPath: 'timing.json',
  sourceProofTimingReport: timing,
}, '2026-07-18T00:00:00.000Z');

assert.equal(blocked.status, 'fail');
assert.equal(blocked.summary.recommendation, 'reject_blocked_top_slate_drilldown');
assert.ok(blocked.blockers.some((item) => item.includes('missing full-slate selection comparison path')));

console.log('unified positive held-local blocked top slate drilldown verified.');
