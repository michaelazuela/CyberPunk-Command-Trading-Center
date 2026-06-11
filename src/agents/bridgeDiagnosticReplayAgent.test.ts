import assert from 'node:assert/strict';
import type { NinjaBridgeBar } from '../lib/ninjaTraderBridge';
import { buildCandidateLifecycleTrace, buildDeskState, classifyScannerVisibility } from '../lib/localScannerEngine';
import { ExecutionStatus, NoTradeReason, SetupCandidate, SetupCandidateStatus, SetupType } from '../types';
import { runBridgeDiagnosticReplay, type BridgeDiagnosticReplayInput } from './bridgeDiagnosticReplayAgent';
import { parseDiagnosticReplayArgs } from '../../tools/automation/diagnostic-replay';
import { normalizeScannerAuditRecord } from '../../tools/automation/scanner-audit-import';

function bar(time: string, open: number, high: number, low: number, close: number): NinjaBridgeBar {
  return { time, open, high, low, close, volume: 1000 };
}

const base5m = [
  bar('2026-05-29T09:30:00', 100, 101, 99, 100.5),
  bar('2026-05-29T09:35:00', 100.5, 101, 100, 100.75),
  bar('2026-05-29T09:40:00', 100.75, 108, 100.5, 107.5),
  bar('2026-05-29T09:45:00', 107.5, 109, 106.5, 108.5),
  bar('2026-05-29T09:50:00', 108.5, 110, 103, 104.5),
  bar('2026-05-29T09:55:00', 104.5, 109, 104, 108.75),
  bar('2026-05-29T10:00:00', 108.75, 112, 108, 111.5),
  bar('2026-05-29T10:05:00', 111.5, 114, 111, 113.5),
];

const bullish15m = [
  bar('2026-05-29T09:30:00', 100, 103, 99, 102),
  bar('2026-05-29T09:45:00', 102, 111, 101.5, 110),
  bar('2026-05-29T10:00:00', 110, 114, 108, 113),
];

const bullish60m = [
  bar('2026-05-29T08:00:00', 96, 100, 95, 99),
  bar('2026-05-29T09:00:00', 99, 106, 98, 105),
  bar('2026-05-29T10:00:00', 105, 114, 104, 113),
];

const bullish240m = [
  bar('2026-05-29T02:00:00', 92, 98, 91, 97),
  bar('2026-05-29T06:00:00', 97, 106, 96, 104),
  bar('2026-05-29T10:00:00', 104, 114, 103, 113),
];

function candidate(overrides: Partial<SetupCandidate> = {}): SetupCandidate {
  return {
    setupType: SetupType.SweepMssFvgRetrace,
    direction: 'LONG',
    detectedStatus: SetupCandidateStatus.Detected,
    confidence: 'High',
    priority: 98,
    entry: 108,
    stop: 103,
    target1: 115.5,
    target2: 118,
    riskPoints: 5,
    invalidation: 'Below 103',
    evidence: ['Liquidity sweep', 'Reclaim after sweep', 'Displacement', 'Market structure shift', 'FVG retrace', 'Minimum 2.0R'],
    missingEvidence: [],
    executionStatus: ExecutionStatus.Executable,
    blockReason: null,
    requiredTrigger: 'Completed 5M reclaim from FVG.',
    nextAction: 'Final action only after trigger remains confirmed.',
    reducedRiskPlan: null,
    ...overrides,
  };
}

function input(overrides: Partial<BridgeDiagnosticReplayInput> = {}): BridgeDiagnosticReplayInput {
  return {
    tradeDate: '2026-05-29',
    instrument: 'MES',
    session: 'morning',
    bars5m: base5m,
    bars15m: bullish15m,
    bars60m: bullish60m,
    bars240m: bullish240m,
    replayWindow: { from: '09:30', to: '10:15' },
    suspectedMoveDirection: 'LONG',
    scannerAlertSent: false,
    ...overrides,
  };
}

function deskStateFor(state: 'Watching' | 'Conditional', setupCandidate: SetupCandidate) {
  const visibility = classifyScannerVisibility({
    state,
    candidate: setupCandidate,
    alertDecision: { shouldSend: true, reason: `${state} fixture alert.` },
    canExecute: false,
  });
  const lifecycle = buildCandidateLifecycleTrace({
    candidates: [setupCandidate],
    selectedCandidate: setupCandidate,
    state,
    alertDecision: { shouldSend: true, reason: `${state} fixture alert.` },
    canExecute: false,
  });
  return buildDeskState({
    state,
    candidate: setupCandidate,
    visibilityMetadata: visibility,
    candidateLifecycleTrace: lifecycle,
    canExecute: false,
  });
}

const approvedNoAlert = runBridgeDiagnosticReplay(input({
  approvedSetupCandidates: [candidate({ riskPoints: 10, target1: 123, target2: 128 })],
  scannerSelectedCandidate: candidate({
    riskPoints: 10,
    target1: 123,
    target2: 128,
    activeRuleset: {
      timeframeMss: {
        applied: true,
        status: 'passed',
        required: 'aligned_confirmed_5m_mss',
        appliesToAllModels: true,
        affectsExecution: false,
        evidence: ['Aligned completed 5M MSS confirmed.'],
        blockers: [],
      },
    },
  }),
  scannerState: 'Executable',
}));
assert.equal(approvedNoAlert.finalClassification, 'A_VALID_APPROVED_NO_ALERT');
assert.equal(approvedNoAlert.tradePlanFeasibility.applicable, true);
assert.equal(approvedNoAlert.targetOutcomeReview.applicable, true);
assert.equal(approvedNoAlert.htfMssDiagnostics.authority, 'ohlc_facts_only');
assert.equal(approvedNoAlert.htfMssDiagnostics.boundary, 'context_only_not_execution_authority');
assert.equal(approvedNoAlert.htfMssDiagnostics.approvesExecution, false);
assert.equal(approvedNoAlert.htfMssDiagnostics.createsTradingPlanCandidate, false);
assert.ok(approvedNoAlert.htfMssDiagnostics.timeframeStack.some((item) => item.timeframe === '4H'));
assert.ok(approvedNoAlert.htfMssDiagnostics.timeframeStack.some((item) => item.timeframe === '1H'));
assert.ok(approvedNoAlert.htfMssDiagnostics.timeframeStack.some((item) => item.timeframe === '15M'));
assert.ok(approvedNoAlert.htfMssDiagnostics.timeframeStack.some((item) => item.timeframe === '5M'));
assert.equal(approvedNoAlert.timeframeMssEvidenceDiagnostics.authority, 'ohlc_facts_only');
assert.equal(approvedNoAlert.timeframeMssEvidenceDiagnostics.boundary, 'evidence_only_not_approval_or_execution_authority');
assert.equal(approvedNoAlert.timeframeMssEvidenceDiagnostics.approvesExecution, false);
assert.equal(approvedNoAlert.timeframeMssEvidenceDiagnostics.changesTradeLogic, false);
assert.ok(approvedNoAlert.timeframeMssEvidenceDiagnostics.timeframes.some((item) => item.timeframe === '15M'));
assert.ok(approvedNoAlert.timeframeMssEvidenceDiagnostics.timeframes.some((item) => item.timeframe === '60M'));
assert.ok(approvedNoAlert.timeframeMssEvidenceDiagnostics.timeframes.some((item) => item.timeframe === '240M'));
assert.ok(approvedNoAlert.timeframeMssEvidenceDiagnostics.timeframes.every((item) => item.barTimestampMode === 'close'));
assert.equal(approvedNoAlert.activeTimeframeMssRulesetDiagnostics.status, 'passed');
assert.equal(approvedNoAlert.activeTimeframeMssRulesetDiagnostics.appliesToAllModels, true);
assert.equal(approvedNoAlert.activeTimeframeMssRulesetDiagnostics.affectsExecution, false);
assert.ok(approvedNoAlert.activeTimeframeMssRulesetDiagnostics.summary.includes('passed'));
assert.equal(approvedNoAlert.newPlanRecommendation.recommendationType, 'scanner_bug_fix');
assert.equal(approvedNoAlert.scannerAuditContext.scannerAuditStatus, 'missing');

const auditEvent = normalizeScannerAuditRecord({
  createdAt: '2026-05-29T14:05:00Z',
  source: 'live-scanner',
  tradeDate: '2026-05-29',
  instrument: 'MES',
  session: 'morning',
  state: 'Executable',
  candidates: [candidate()],
  attachments: { chartMarkup: 'chart.png', priceLevelMap: 'levels.png' },
  scannerAuditWarnings: ['Audit warning sample.'],
}, 'C:/tmp/scanner-audit.json');
const approvedWithAudit = runBridgeDiagnosticReplay(input({
  approvedSetupCandidates: [candidate({ riskPoints: 10, target1: 123, target2: 128 })],
  scannerSelectedCandidate: candidate({ riskPoints: 10, target1: 123, target2: 128 }),
  scannerAuditEvents: [auditEvent],
}));
assert.equal(approvedWithAudit.finalClassification, 'A_VALID_APPROVED_NO_ALERT');
assert.equal(approvedWithAudit.scannerAuditContext.scannerAuditStatus, 'present');
assert.equal(approvedWithAudit.scannerAuditContext.matchingEvents.length, 1);
assert.ok(approvedWithAudit.scannerAuditContext.summary.includes('trade alert audit'));

const watchCandidateForReplay = candidate({
  entry: null,
  stop: null,
  target1: null,
  target2: null,
  riskPoints: null,
  requiredTrigger: 'Completed 5M close through line in the sand required. No chase.',
  executionStatus: ExecutionStatus.Conditional,
});
const conditionalCandidateForReplay = candidate({
  executionStatus: ExecutionStatus.Conditional,
  requiredTrigger: 'Completed 5M retest confirms human-review plan. No chase.',
});
const replayDeskStateWatchEvent = normalizeScannerAuditRecord({
  createdAt: '2026-05-29T14:01:00Z',
  source: 'live-scanner',
  tradeDate: '2026-05-29',
  instrument: 'MES',
  session: 'morning',
  state: 'Watching',
  candidate: watchCandidateForReplay,
  deskState: deskStateFor('Watching', watchCandidateForReplay),
}, 'C:/tmp/scanner-watch-audit.json');
const replayDeskStatePlanEvent = normalizeScannerAuditRecord({
  createdAt: '2026-05-29T14:08:00Z',
  source: 'live-scanner',
  tradeDate: '2026-05-29',
  instrument: 'MES',
  session: 'morning',
  state: 'Conditional',
  candidate: conditionalCandidateForReplay,
  deskState: deskStateFor('Conditional', conditionalCandidateForReplay),
}, 'C:/tmp/scanner-plan-audit.json');
const replayWithDeskState = runBridgeDiagnosticReplay(input({
  scannerAuditEvents: [replayDeskStateWatchEvent, replayDeskStatePlanEvent],
}));
assert.equal(replayWithDeskState.deskStateReplayValidation.sourceOfTruth, 'scanner_desk_state_replay_validation');
assert.equal(replayWithDeskState.deskStateReplayValidation.cycleCount, 2);
assert.equal(replayWithDeskState.deskStateReplayValidation.watchAppearedBeforePlan, true);
assert.equal(replayWithDeskState.deskStateReplayValidation.promotionPathObserved, true);
assert.equal(replayWithDeskState.deskStateReplayValidation.discordRagUiAligned, true);
assert.equal(replayWithDeskState.deskStateReplayValidation.authority.replayValidationApprovesTrade, false);

const approvedAlreadyTriggered = runBridgeDiagnosticReplay(input({
  approvedSetupCandidates: [candidate()],
  scannerSelectedCandidate: candidate(),
  scannerState: 'Missed',
  normalizedPlan: {
    decision: 'LONG',
    decisionLabel: 'LONG',
    executionDecision: 'Already triggered',
    planningDecision: 'Missed',
    hasConditionalPlans: false,
    entry: 108,
    stop: 103,
    t1: 115.5,
    t2: 118,
    riskPoints: 5,
    riskRewardT1: '1.5R',
    riskRewardT2: '2.0R',
    finalConfidence: 'High',
    whyThisPlan: 'Already triggered.',
    invalidation: 'Below 103',
    source: 'app_rule_engine',
    canExecute: false,
    decisionStatus: undefined,
    earlyMoveReview: {
      status: 'already_triggered_no_fresh_entry',
      direction: 'LONG',
      moveStart: 108,
      moveExtreme: 114,
      triggerArea: 108,
      currentPrice: 113.5,
      movePoints: 5.5,
      freshEntryAvailable: false,
      summary: 'Move already triggered.',
      reason: 'No fresh entry.',
      action: 'Do not chase.',
      journalSuggestion: 'Journal as missed.',
      approvalBoundary: {
        approvesTrade: false,
        changesEntry: false,
        changesStop: false,
        changesTargets: false,
        changesRisk: false,
      },
    },
  },
}));
assert.equal(approvedAlreadyTriggered.finalClassification, 'B_APPROVED_ALREADY_TRIGGERED');
assert.equal(approvedAlreadyTriggered.tradePlanFeasibility.alreadyTriggered, true);
assert.equal(approvedAlreadyTriggered.targetOutcomeReview.finalReplayOutcome, 'already extended before valid fresh entry');

const ictOnly = runBridgeDiagnosticReplay(input({
  approvedSetupCandidates: [
    candidate({
      executionStatus: ExecutionStatus.Conditional,
      blockReason: null,
      missingEvidence: ['Liquidity sweep/raid missing', 'Market structure shift missing'],
    }),
  ],
  scannerState: 'Watching',
}));
assert.equal(ictOnly.finalClassification, 'C_UNAPPROVED_ICT_FVG_WATCHLIST');
assert.equal(ictOnly.tradePlanFeasibility.applicable, false);
assert.equal(ictOnly.tradePlanFeasibility.candidateEntryTrigger, null);
assert.equal(ictOnly.tradePlanFeasibility.candidateStop, null);
assert.equal(ictOnly.tradePlanFeasibility.t1, null);
assert.equal(ictOnly.tradePlanFeasibility.t2, null);
assert.equal(ictOnly.targetOutcomeReview.applicable, false);
assert.equal(ictOnly.targetOutcomeReview.t1, null);
assert.equal(ictOnly.newPlanRecommendation.recommendationType, 'advisory_watchlist');
assert.equal(ictOnly.newPlanRecommendation.mustRemainAdvisory, true);
assert.equal(ictOnly.newPlanRecommendation.requiresSeparateApproval, true);
assert.equal(ictOnly.advisoryOnlyDetectorRecommendation.recommended, true);

const weak = runBridgeDiagnosticReplay(input({
  bars5m: [
    bar('2026-05-29T09:30:00', 100, 101, 99, 100.25),
    bar('2026-05-29T09:35:00', 100.25, 101, 99.5, 100),
    bar('2026-05-29T09:40:00', 100, 101, 99.75, 100.1),
    bar('2026-05-29T09:45:00', 100.1, 101, 99.8, 100.2),
  ],
  bars15m: [],
  bars60m: [],
  bars240m: [],
  approvedSetupCandidates: [],
}));
assert.equal(weak.finalClassification, 'D_NO_VALID_SETUP');
assert.equal(weak.newPlanRecommendation.recommendBuild, false);

const noHtfApproval = runBridgeDiagnosticReplay(input({
  approvedSetupCandidates: [candidate()],
  scannerSelectedCandidate: candidate(),
  bars60m: [],
  bars240m: [],
}));
assert.equal(noHtfApproval.finalClassification, 'C_UNAPPROVED_ICT_FVG_WATCHLIST');
assert.equal(noHtfApproval.higherTimeframeConfirmation, 'missing');
assert.equal(noHtfApproval.scannerAuditContext.scannerAuditStatus, 'missing');

const laterTargetHitDoesNotPromote = runBridgeDiagnosticReplay(input({
  approvedSetupCandidates: [
    candidate({
      executionStatus: ExecutionStatus.Blocked,
      blockReason: NoTradeReason.InvalidStopLocation,
      missingEvidence: ['Candidate stop was invalid.'],
    }),
  ],
}));
assert.equal(laterTargetHitDoesNotPromote.finalClassification, 'C_UNAPPROVED_ICT_FVG_WATCHLIST');
assert.equal(laterTargetHitDoesNotPromote.targetOutcomeReview.applicable, false);

const immutableInput = input({
  approvedSetupCandidates: [candidate()],
  scannerSelectedCandidate: candidate(),
});
const before = JSON.stringify(immutableInput);
const immutableReport = runBridgeDiagnosticReplay(immutableInput);
assert.equal(JSON.stringify(immutableInput), before);
assert.deepEqual(immutableReport.approvalBoundary, {
  diagnosticApprovesTrade: false,
  diagnosticChangesRules: false,
  diagnosticCreatesEntry: false,
  diagnosticCreatesTargets: false,
  diagnosticOverridesScanner: false,
  diagnosticPromotesModel: false,
  diagnosticBuildsNewPlan: false,
});
assert.equal(JSON.stringify(immutableReport).includes('"canExecute":true'), false);

const parsed = parseDiagnosticReplayArgs([
  '--date', '2026-05-28',
  '--instrument', 'MES',
  '--bridge-instrument', 'MES 06-26',
  '--from', '10:00',
  '--to', '12:00',
  '--direction', 'LONG',
  '--bridge-url', 'http://127.0.0.1:8765',
  '--bar-timestamp-mode', 'close',
  '--bar-time-zone', 'eastern',
  '--pretty',
]);
assert.equal(parsed.date, '2026-05-28');
assert.equal(parsed.instrument, 'MES');
assert.equal(parsed.bridgeInstrument, 'MES 06-26');
assert.equal(parsed.from, '10:00');
assert.equal(parsed.to, '12:00');
assert.equal(parsed.direction, 'LONG');
assert.equal(parsed.pretty, true);

console.log('Bridge diagnostic replay agent verified.');
