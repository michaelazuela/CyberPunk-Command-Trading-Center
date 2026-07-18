import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewSweepIntakeFeatureClassifierReport,
} from './unified-positive-held-local-preview-sweep-intake-feature-classifier';
import type { UnifiedPositiveHeldLocalPreviewIntakeTriageReport } from './unified-positive-held-local-preview-intake-triage';
import type { UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport } from './unified-positive-held-local-preview-replay-package-source-proof-timing';

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
    session: id.includes('lunch') ? 'lunch' : 'morning',
    setupType: 'SweepMssFvgRetrace',
    direction: id.includes('SHORT') ? 'SHORT' : 'LONG',
    outcomeBucket: 'winner_t1_t2',
    outcomeLabel: 't1_and_t2_hit',
    resolvedOneMesPl: 100,
    proofTime: `${id.slice(0, 10)}T12:00:00`,
    entryHitTime: `${id.slice(0, 10)}T12:05:00`,
    proofToEntryMinutes: 5,
    riskPoints: 8,
    mfeR: 2,
    maeR: 0.2,
    issueTags: ['full_delivery'],
    ...overrides,
  };
}

function intakeRow(id: string, overrides: Partial<UnifiedPositiveHeldLocalPreviewIntakeTriageReport['rows'][number]> = {}): UnifiedPositiveHeldLocalPreviewIntakeTriageReport['rows'][number] {
  return {
    intakeId: id,
    tradeDate: id.slice(0, 10),
    session: id.includes('lunch') ? 'lunch' : 'morning',
    instrument: 'MES',
    setupType: 'SweepMssFvgRetrace',
    direction: id.includes('SHORT') ? 'SHORT' : 'LONG',
    firstSeenTime: `${id.slice(0, 10)}T12:00:00.0000000`,
    lastSeenTime: `${id.slice(0, 10)}T12:05:00.0000000`,
    occurrences: 8,
    entry: 7500,
    stop: 7492,
    target1: 7512,
    target2: 7516,
    riskPoints: 8,
    candidateState: null,
    executionStatus: 'Conditional',
    detectedStatus: 'Conditional',
    blockReason: 'EntryTriggerPending',
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

const ids = [
  '2026-06-01-lunch-SweepMssFvgRetrace-SHORT',
  '2026-06-02-lunch-SweepMssFvgRetrace-SHORT',
  '2026-06-03-lunch-SweepMssFvgRetrace-SHORT',
  '2026-06-04-lunch-SweepMssFvgRetrace-SHORT',
  '2026-06-05-lunch-SweepMssFvgRetrace-SHORT',
  '2026-06-06-morning-SweepMssFvgRetrace-LONG',
  '2026-06-07-morning-SweepMssFvgRetrace-LONG',
  '2026-06-08-morning-SweepMssFvgRetrace-LONG',
];

const timingReport: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport = {
  reportType: 'unified_positive_held_local_preview_replay_package_source_proof_timing',
  generatedAt: '2026-07-17T00:00:00.000Z',
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
    evaluatedRows: 8,
    winners: 5,
    losses: 3,
    unresolved: 0,
    blocked: 0,
    grossResolvedOneMesPl: 320,
    positiveModelGroups: 1,
    negativeModelGroups: 0,
    unresolvedModelGroups: 0,
    livePromotionAllowedRows: 0,
  },
  modelTiming: [],
  rows: [
    ...ids.slice(0, 5).map((id) => timingRow(id)),
    ...ids.slice(5).map((id) => timingRow(id, {
      outcomeBucket: 'loss_stopped_before_t1',
      outcomeLabel: 'stopped_before_t1',
      resolvedOneMesPl: -60,
      proofToEntryMinutes: 0,
      issueTags: ['stopped_before_t1', 'same_bar_entry'],
    })),
  ],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const intakeReport: UnifiedPositiveHeldLocalPreviewIntakeTriageReport = {
  reportType: 'unified_positive_held_local_preview_intake_triage',
  generatedAt: '2026-07-17T00:00:00.000Z',
  status: 'pass',
  authority,
  source: {
    reportDir: 'reports',
    intakeReportPath: 'intake.json',
    maxReplayPackageRows: 500,
    maxRowsPerModel: 100,
  },
  summary: {
    intakeRowsRead: 8,
    newIntakeCandidates: 8,
    alreadyProcessedReferenceRows: 0,
    selectedReplayPackageRows: 8,
    heldForLaterBatchRows: 0,
    modelGroups: 1,
    proofStateGroups: 1,
    livePromotionAllowedRows: 0,
  },
  groups: [],
  rows: [
    ...ids.slice(0, 5).map((id) => intakeRow(id, { executionStatus: 'Conditional', blockReason: 'EntryTriggerPending' })),
    ...ids.slice(5).map((id) => intakeRow(id, { executionStatus: 'Blocked', blockReason: 'InvalidStopLocation', riskQuality: 'wide' })),
  ],
  selectedReplayPackage: [],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewSweepIntakeFeatureClassifierReport({
  reportDir: 'reports',
  sourceProofTimingPath: 'timing.json',
  sourceProofTimingReport: timingReport,
  intakeTriagePath: 'triage.json',
  intakeTriageReport: intakeReport,
}, '2026-07-17T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_sweep_intake_feature_classifier');
assert.equal(report.status, 'pass');
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.assumptions.noLiveFilterInstalled, true);
assert.equal(report.summary.sweepRows, 8);
assert.equal(report.summary.joinedRows, 8);
assert.ok(report.summary.acceptedClassifiers >= 1);
assert.equal(report.summary.livePromotionAllowedRows, 0);

const statusClassifier = report.classifiers.find((row) => row.featureName === 'executionStatus' && row.featureValue === 'Conditional');
assert.equal(statusClassifier?.decision, 'candidate_for_broader_replay_validation');
assert.equal(statusClassifier?.keptWinners, 5);
assert.equal(statusClassifier?.rejectedLosses, 3);
assert.equal(statusClassifier?.scannerVisibleEligible, false);

const missing = buildUnifiedPositiveHeldLocalPreviewSweepIntakeFeatureClassifierReport({
  reportDir: 'reports',
  sourceProofTimingPath: null,
  sourceProofTimingReport: null,
  intakeTriagePath: null,
  intakeTriageReport: null,
}, '2026-07-17T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing source/proof timing path'));
assert.ok(missing.blockers.includes('missing intake triage path'));

console.log('unified positive held-local Sweep intake feature classifier verified.');
