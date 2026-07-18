import assert from 'node:assert/strict';
import {
  buildUnifiedPositiveHeldLocalPreviewSweepLeadTopSelectionSimulationReport,
} from './unified-positive-held-local-preview-sweep-lead-top-selection-simulation';
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
    setupType: id.includes('Intraday') ? 'IntradayMssMicroContinuation' : 'SweepMssFvgRetrace',
    direction: id.includes('SHORT') ? 'SHORT' : 'LONG',
    outcomeBucket: 'winner_t1_t2',
    outcomeLabel: 't1_and_t2_hit',
    resolvedOneMesPl: 100,
    proofTime: `${id.slice(0, 10)}T09:30:00`,
    entryHitTime: `${id.slice(0, 10)}T09:35:00`,
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
    setupType: id.includes('Intraday') ? 'IntradayMssMicroContinuation' : 'SweepMssFvgRetrace',
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

const leadId = '2026-06-01-morning-SweepMssFvgRetrace-LONG';
const badSweepId = '2026-06-01-morning-SweepMssFvgRetrace-SHORT';
const alternateId = '2026-06-01-morning-IntradayMssMicroContinuation-LONG';
const neutralId = '2026-06-02-morning-SweepMssFvgRetrace-LONG';

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
    evaluatedRows: 4,
    winners: 3,
    losses: 1,
    unresolved: 0,
    blocked: 0,
    grossResolvedOneMesPl: 250,
    positiveModelGroups: 2,
    negativeModelGroups: 0,
    unresolvedModelGroups: 0,
    livePromotionAllowedRows: 0,
  },
  modelTiming: [],
  rows: [
    timingRow(leadId, { resolvedOneMesPl: 120 }),
    timingRow(badSweepId, {
      outcomeBucket: 'loss_stopped_before_t1',
      outcomeLabel: 'stopped_before_t1',
      resolvedOneMesPl: -70,
      issueTags: ['stopped_before_t1'],
    }),
    timingRow(alternateId, { resolvedOneMesPl: 95 }),
    timingRow(neutralId, { tradeDate: '2026-06-02', resolvedOneMesPl: 105 }),
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
    intakeRowsRead: 4,
    newIntakeCandidates: 4,
    alreadyProcessedReferenceRows: 0,
    selectedReplayPackageRows: 4,
    heldForLaterBatchRows: 0,
    modelGroups: 2,
    proofStateGroups: 1,
    livePromotionAllowedRows: 0,
  },
  groups: [],
  rows: [
    intakeRow(leadId, { executionStatus: 'Conditional', blockReason: 'EntryTriggerPending', modelPriority: 78, proofPriority: 55 }),
    intakeRow(badSweepId, { executionStatus: 'Blocked', blockReason: 'InvalidStopLocation', modelPriority: 90, proofPriority: 55 }),
    intakeRow(alternateId, { modelPriority: 74, proofPriority: 55 }),
    intakeRow(neutralId, { tradeDate: '2026-06-02', executionStatus: 'Conditional', blockReason: 'EntryTriggerPending' }),
  ],
  selectedReplayPackage: [],
  blockers: [],
  recommendations: [],
  markdown: '',
};

const report = buildUnifiedPositiveHeldLocalPreviewSweepLeadTopSelectionSimulationReport({
  reportDir: 'reports',
  sourceProofTimingPath: 'timing.json',
  sourceProofTimingReport: timingReport,
  intakeTriagePath: 'triage.json',
  intakeTriageReport: intakeReport,
}, '2026-07-18T00:01:00.000Z');

assert.equal(report.reportType, 'unified_positive_held_local_preview_sweep_lead_top_selection_simulation');
assert.equal(report.status, 'pass');
assert.equal(report.authority.writesSupabase, false);
assert.equal(report.authority.postsDiscord, false);
assert.equal(report.authority.changesTradingLogic, false);
assert.equal(report.authority.changesCanExecute, false);
assert.equal(report.assumptions.noLiveFilterInstalled, true);
assert.equal(report.assumptions.livePromotionAllowed, false);
assert.equal(report.summary.sourceRows, 4);
assert.equal(report.summary.sweepRows, 3);
assert.equal(report.summary.sweepLeadRows, 2);
assert.equal(report.summary.nonMatchingSweepRows, 1);
assert.equal(report.summary.changedSlates, 1);
assert.equal(report.summary.baselineTopOneMesPl, 35);
assert.equal(report.summary.simulatedTopOneMesPl, 225);
assert.equal(report.summary.topSelectionDeltaOneMesPl, 190);
assert.equal(report.summary.recommendation, 'candidate_for_fresh_replay_validation');
assert.equal(report.summary.livePromotionAllowedRows, 0);

const changedSlate = report.slates.find((row) => row.slateId === '2026-06-01|morning');
assert.equal(changedSlate?.baselineTopTicketId, badSweepId);
assert.equal(changedSlate?.simulatedTopTicketId, leadId);
assert.equal(changedSlate?.deltaOneMesPl, 190);

const badSweep = report.rows.find((row) => row.ticketId === badSweepId);
assert.equal(badSweep?.sweepLeadPenaltyApplied, true);
assert.equal(badSweep?.scannerVisibleEligible, false);
assert.match(report.markdown, /Sweep Lead Top-Selection Simulation/);

const missing = buildUnifiedPositiveHeldLocalPreviewSweepLeadTopSelectionSimulationReport({
  reportDir: 'reports',
  sourceProofTimingPath: null,
  sourceProofTimingReport: null,
  intakeTriagePath: null,
  intakeTriageReport: null,
}, '2026-07-18T00:02:00.000Z');

assert.equal(missing.status, 'fail');
assert.ok(missing.blockers.includes('missing source/proof timing path'));
assert.ok(missing.blockers.includes('missing intake triage path'));

console.log('unified positive held-local Sweep lead top-selection simulation verified.');
