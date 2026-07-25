import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewSweepPenaltyGuardedReplayReport,
} from './unified-positive-held-local-preview-sweep-penalty-guarded-replay';
import type { UnifiedPositiveHeldLocalPreviewIntakeTriageReport } from './unified-positive-held-local-preview-intake-triage';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport } from './unified-positive-held-local-preview-replay-package-source-proof-timing';
import type { UnifiedPositiveHeldLocalPreviewSweepNonmatchingPenaltyValidationReport } from './unified-positive-held-local-preview-sweep-nonmatching-penalty-validation';

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

function timingRow(id: string, setupType: string, resolvedOneMesPl: number, overrides: Partial<UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport['rows'][number]> = {}): UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport['rows'][number] {
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
    ...overrides,
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
const leadSweepId = '2026-06-01-morning-SweepMssFvgRetrace-LONG';
const alternateId = '2026-06-01-morning-raidReclaim-LONG';

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
    evaluatedRows: 3,
    winners: 2,
    losses: 1,
    unresolved: 0,
    blocked: 0,
    grossResolvedOneMesPl: 135,
    positiveModelGroups: 2,
    negativeModelGroups: 0,
    unresolvedModelGroups: 0,
    livePromotionAllowedRows: 0,
  },
  modelTiming: [],
  rows: [
    timingRow(invalidSweepId, 'SweepMssFvgRetrace', -35),
    timingRow(leadSweepId, 'SweepMssFvgRetrace', 80),
    timingRow(alternateId, 'raidReclaim', 90),
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
    intakeRow(leadSweepId, 'SweepMssFvgRetrace', 'Conditional', 'EntryTriggerPending', 78),
    intakeRow(alternateId, 'raidReclaim', 'Conditional', 'EntryTriggerPending', 76),
  ],
  selectedReplayPackage: [],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const penaltyValidationReport: UnifiedPositiveHeldLocalPreviewSweepNonmatchingPenaltyValidationReport = {
  reportType: 'unified_positive_held_local_preview_sweep_nonmatching_penalty_validation',
  generatedAt: '2026-07-18T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    reportDir: 'reports',
    sourceProofTimingPath: 'timing.json',
    intakeTriagePath: 'triage.json',
    topSelectionSimulationPath: 'top-selection.json',
  },
  assumptions: {
    validationOnly: true,
    usesOutcomeForEvaluationNotScoring: true,
    sweepLeadIsConditionalEntryTriggerPending: true,
    nonmatchingRowsArePenaltyCandidatesNotRemovedModels: true,
    noLiveFilterInstalled: true,
    noRankPenaltyInstalled: true,
    noCanExecuteChange: true,
    livePromotionAllowed: false,
  },
  summary: {
    sourceRows: 3,
    joinedSweepRows: 2,
    sweepLeadRows: 1,
    nonmatchingSweepRows: 1,
    nonmatchingFalseRejectWinnerRows: 0,
    nonmatchingOneMesPl: -35,
    topSelectionDeltaOneMesPl: 125,
    recommendedAction: 'validate_invalid_stop_penalty_research_only',
    livePromotionAllowedRows: 0,
  },
  buckets: [],
  reasons: [],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewSweepPenaltyGuardedReplayReport({
  reportDir: 'reports',
  sourceProofTimingPath: 'timing.json',
  sourceProofTimingReport: timingReport,
  intakeTriagePath: 'triage.json',
  intakeTriageReport: intakeReport,
  penaltyValidationPath: 'penalty.json',
  penaltyValidationReport,
}, '2026-07-18T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_sweep_penalty_guarded_replay');
assert.equal(report.status, 'pass');
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.assumptions.noRankPenaltyInstalled, true);
assert.equal(report.summary.validSweepLeadRows, 1);
assert.equal(report.summary.invalidStopSweepPenaltyRows, 1);
assert.equal(report.summary.validSweepLeadRowsPenalized, 0);
assert.equal(report.summary.changedSlates, 1);
assert.equal(report.summary.changedFromInvalidStopSweepSlates, 1);
assert.equal(report.summary.changedToValidSweepOrAlternateSlates, 1);
assert.equal(report.summary.baselineTopOneMesPl, -35);
assert.equal(report.summary.guardedTopOneMesPl, 80);
assert.equal(report.summary.topSelectionDeltaOneMesPl, 115);
assert.equal(report.summary.livePromotionAllowedRows, 0);

const validLead = report.rows.find((row) => row.ticketId === leadSweepId);
assert.equal(validLead?.validSweepLead, true);
assert.equal(validLead?.penaltyApplied, false);

const invalidSweep = report.rows.find((row) => row.ticketId === invalidSweepId);
assert.equal(invalidSweep?.invalidStopSweepPenaltyCandidate, true);
assert.equal(invalidSweep?.penaltyApplied, true);
assert.match(report.markdown, /Sweep Penalty Guarded Replay/);

const missing = buildUnifiedPositiveHeldLocalPreviewSweepPenaltyGuardedReplayReport({
  reportDir: 'reports',
  sourceProofTimingPath: null,
  sourceProofTimingReport: null,
  intakeTriagePath: null,
  intakeTriageReport: null,
  penaltyValidationPath: null,
  penaltyValidationReport: null,
}, '2026-07-18T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing penalty validation path'));

console.log('unified positive held-local Sweep penalty guarded replay verified.');
