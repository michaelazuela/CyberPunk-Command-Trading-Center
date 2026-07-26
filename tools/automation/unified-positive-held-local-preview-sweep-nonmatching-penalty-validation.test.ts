import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewSweepNonmatchingPenaltyValidationReport,
} from './unified-positive-held-local-preview-sweep-nonmatching-penalty-validation';
import type { UnifiedPositiveHeldLocalPreviewIntakeTriageReport } from './unified-positive-held-local-preview-intake-triage';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport } from './unified-positive-held-local-preview-replay-package-source-proof-timing';
import type { UnifiedPositiveHeldLocalPreviewSweepLeadTopSelectionSimulationReport } from './unified-positive-held-local-preview-sweep-lead-top-selection-simulation';

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

function timingRow(id: string, overrides: Partial<UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport['rows'][number]> = {}): UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport['rows'][number] {
  return {
    ticketId: id,
    tradeDate: id.slice(0, 10),
    session: 'morning',
    setupType: 'NoInstalledSetup',
    direction: id.includes('SHORT') ? 'SHORT' : 'LONG',
    outcomeBucket: 'loss_stopped_before_t1',
    outcomeLabel: 'stopped_before_t1',
    resolvedOneMesPl: -50,
    proofTime: `${id.slice(0, 10)}T09:30:00`,
    entryHitTime: `${id.slice(0, 10)}T09:35:00`,
    proofToEntryMinutes: 5,
    riskPoints: 8,
    mfeR: 0.4,
    maeR: 1.1,
    issueTags: ['stopped_before_t1'],
    ...overrides,
  };
}

function intakeRow(id: string, overrides: Partial<UnifiedPositiveHeldLocalPreviewIntakeTriageReport['rows'][number]> = {}): UnifiedPositiveHeldLocalPreviewIntakeTriageReport['rows'][number] {
  return {
    intakeId: id,
    tradeDate: id.slice(0, 10),
    session: 'morning',
    instrument: 'MES',
    setupType: 'NoInstalledSetup',
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
    executionStatus: 'Blocked',
    detectedStatus: 'Conditional',
    blockReason: 'InvalidStopLocation',
    sourceFile: 'scanner-decision-tape-fixture.json',
    intakeDecision: 'candidate_for_review_intake',
    proofState: 'scanner_held_complete',
    modelPriority: 78,
    proofPriority: 55,
    occurrencePriority: 10,
    riskQuality: 'normal',
    triageScore: 160,
    triageDecision: 'selected_for_replay_package',
    triageReason: 'Fixture.',
    ...overrides,
  };
}

const leadId = '2026-06-01-morning-NoInstalledSetup-LONG';
const badIds = Array.from({ length: 10 }, (_, index) => `2026-06-${String(index + 2).padStart(2, '0')}-morning-NoInstalledSetup-SHORT`);

const timingReport: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport = {
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
    evaluatedRows: 11,
    winners: 1,
    losses: 10,
    unresolved: 0,
    blocked: 0,
    grossResolvedOneMesPl: -380,
    positiveModelGroups: 1,
    negativeModelGroups: 1,
    unresolvedModelGroups: 0,
    livePromotionAllowedRows: 0,
  },
  modelTiming: [],
  rows: [
    timingRow(leadId, {
      outcomeBucket: 'winner_t1_t2',
      outcomeLabel: 't1_and_t2_hit',
      resolvedOneMesPl: 120,
      mfeR: 2.2,
      maeR: 0.2,
      issueTags: ['full_delivery'],
    }),
    ...badIds.map((id) => timingRow(id)),
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const intakeReport: UnifiedPositiveHeldLocalPreviewIntakeTriageReport = {
  reportType: 'unified_positive_held_local_preview_intake_triage',
  generatedAt: '2026-07-18T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    reportDir: 'reports',
    intakeReportPath: 'intake.json',
    maxReplayPackageRows: 500,
    maxRowsPerModel: 100,
  },
  summary: {
    intakeRowsRead: 11,
    newIntakeCandidates: 11,
    alreadyProcessedReferenceRows: 0,
    selectedReplayPackageRows: 11,
    heldForLaterBatchRows: 0,
    modelGroups: 1,
    proofStateGroups: 1,
    livePromotionAllowedRows: 0,
  },
  groups: [],
  rows: [
    intakeRow(leadId, { executionStatus: 'Conditional', blockReason: 'EntryTriggerPending' }),
    ...badIds.map((id) => intakeRow(id)),
  ],
  selectedReplayPackage: [],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const topSelectionReport: UnifiedPositiveHeldLocalPreviewSweepLeadTopSelectionSimulationReport = {
  reportType: 'unified_positive_held_local_preview_sweep_lead_top_selection_simulation',
  generatedAt: '2026-07-18T00:00:00.000Z',
  status: 'pass',
  authority,
  source: { reportDir: 'reports', sourceProofTimingPath: 'timing.json', intakeTriagePath: 'triage.json' },
  assumptions: {
    simulationOnly: true,
    usesOutcomeForEvaluationNotScoring: true,
    sweepLeadIsExecutionStatusConditionalAndEntryTriggerPending: true,
    nonMatchingSweepRowsArePenalizedNotRemoved: true,
    noLiveFilterInstalled: true,
    noRankBoostInstalled: true,
    noCanExecuteChange: true,
    livePromotionAllowed: false,
  },
  scoring: { nonMatchingSweepPenaltyPoints: 18, baselineDoesNotUseOutcome: true },
  summary: {
    sourceRows: 11,
    joinedRows: 11,
    sweepRows: 11,
    sweepLeadRows: 1,
    nonMatchingSweepRows: 10,
    slates: 11,
    changedSlates: 1,
    baselineTopOneMesPl: -50,
    simulatedTopOneMesPl: 120,
    topSelectionDeltaOneMesPl: 170,
    recommendation: 'candidate_for_fresh_replay_validation',
    livePromotionAllowedRows: 0,
  },
  slates: [],
  rows: [],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewSweepNonmatchingPenaltyValidationReport({
  reportDir: 'reports',
  sourceProofTimingPath: 'timing.json',
  sourceProofTimingReport: timingReport,
  intakeTriagePath: 'triage.json',
  intakeTriageReport: intakeReport,
  topSelectionSimulationPath: 'top-selection.json',
  topSelectionSimulationReport: topSelectionReport,
}, '2026-07-18T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_sweep_nonmatching_penalty_validation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.assumptions.noRankPenaltyInstalled, true);
assert.equal(report.summary.joinedSweepRows, 11);
assert.equal(report.summary.sweepLeadRows, 1);
assert.equal(report.summary.nonmatchingSweepRows, 10);
assert.equal(report.summary.nonmatchingFalseRejectWinnerRows, 0);
assert.equal(report.summary.nonmatchingOneMesPl, -500);
assert.equal(report.summary.topSelectionDeltaOneMesPl, 170);
assert.equal(report.summary.recommendedAction, 'validate_invalid_stop_penalty_research_only');
assert.equal(report.reasons[0]?.executionStatus, 'Blocked');
assert.equal(report.reasons[0]?.blockReason, 'InvalidStopLocation');
assert.equal(report.reasons[0]?.falseRejectWinnerRows, 0);
assert.match(report.markdown, /Sweep Nonmatching Penalty Validation/);

const missing = buildUnifiedPositiveHeldLocalPreviewSweepNonmatchingPenaltyValidationReport({
  reportDir: 'reports',
  sourceProofTimingPath: null,
  sourceProofTimingReport: null,
  intakeTriagePath: null,
  intakeTriageReport: null,
  topSelectionSimulationPath: null,
  topSelectionSimulationReport: null,
}, '2026-07-18T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing source/proof timing path'));
assert.ok(missing.blockers.includes('missing top-selection simulation path'));

console.log('unified positive held-local Sweep nonmatching penalty validation verified.');
