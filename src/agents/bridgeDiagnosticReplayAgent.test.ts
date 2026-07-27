import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { NinjaBridgeBar } from '../lib/ninjaTraderBridge';
import { buildCandidateLifecycleTrace, buildDeskState, classifyScannerVisibility } from '../lib/localScannerEngine';
import { ExecutionStatus, NoTradeReason, SetupCandidate, SetupCandidateStatus, SetupType } from '../types';
import { runBridgeDiagnosticReplay, type BridgeDiagnosticReplayInput } from './bridgeDiagnosticReplayAgent';
import { parseDiagnosticReplayArgs } from '../../tools/automation/diagnostic-replay';
import { loadScannerAuditHistory, normalizeScannerAuditRecord } from '../../tools/automation/scanner-audit-import';

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
    setupType: SetupType.RaidFailureDisplacementReversal,
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
    evidence: ['Liquidity sweep', 'Reclaim after sweep', 'Displacement', 'Market structure shift', 'FVG retrace', 'Clean 1.5R path'],
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

function deskStateFor(state: 'Watching' | 'Conditional' | 'Blocked', setupCandidate: SetupCandidate) {
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
assert.ok(approvedNoAlert.timeframeMssEvidenceDiagnostics.timeframes.every((item) => item.barTimestampMode === 'open'));
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
assert.equal(replayWithDeskState.deskStateReplayValidation.watchToPlanPromotionProofed, true);
assert.equal(replayWithDeskState.deskStateReplayValidation.canExecuteBoundaryPreserved, true);
assert.equal(replayWithDeskState.deskStateReplayValidation.discordRagUiAligned, true);
assert.equal(replayWithDeskState.deskStateReplayValidation.promotionBoundary.changesTradeApprovals, false);
assert.equal(replayWithDeskState.deskStateReplayValidation.promotionBoundary.changesCanExecute, false);
assert.equal(replayWithDeskState.deskStateReplayValidation.authority.replayValidationApprovesTrade, false);
assert.equal(replayWithDeskState.phase9FReplayValidation.sourceOfTruth, 'bridge_diagnostic_phase9f_replay_validation');
assert.equal(replayWithDeskState.phase9FReplayValidation.status, 'pass');
assert.equal(replayWithDeskState.phase9FReplayValidation.checks.watchAppearedBeforeMove.status, 'pass');
assert.equal(replayWithDeskState.phase9FReplayValidation.checks.lineInSandMatchedMarketStructure.status, 'pass');
assert.equal(replayWithDeskState.phase9FReplayValidation.checks.planPromotedCorrectly.status, 'pass');
assert.equal(replayWithDeskState.phase9FReplayValidation.checks.noChasePreserved.status, 'pass');
assert.equal(replayWithDeskState.phase9FReplayValidation.checks.noTradeExplainedClearly.status, 'not_applicable');
assert.equal(replayWithDeskState.phase9FReplayValidation.checks.discordRagUiReflectSameDeskState.status, 'pass');
assert.equal(replayWithDeskState.phase9FReplayValidation.authority.replayApprovesTrade, false);
assert.equal(replayWithDeskState.phase9FReplayValidation.authority.replayChangesCanExecute, false);
assert.equal(replayWithDeskState.phase9FReplayValidation.authority.replayChangesScannerBehavior, false);

const blockedReplayCandidate = candidate({
  executionStatus: ExecutionStatus.Blocked,
  blockReason: null,
  riskAdvisoryStatus: 'RISK_EXTENDED_STRUCTURAL',
  riskPolicy: 'STRUCTURAL_RISK_ACKNOWLEDGED',
  missingEvidence: ['Extended structural risk review is required.'],
  requiredTrigger: 'Hold with reason: risk gate blocks execution; no trade until protected 5M structure improves.',
});
const blockedReplayEvent = normalizeScannerAuditRecord({
  createdAt: '2026-05-29T14:11:00Z',
  source: 'live-scanner',
  tradeDate: '2026-05-29',
  instrument: 'MES',
  session: 'morning',
  state: 'Blocked',
  candidate: blockedReplayCandidate,
  deskState: deskStateFor('Blocked', blockedReplayCandidate),
}, 'C:/tmp/scanner-blocked-audit.json');
const replayWithExplainedNoTrade = runBridgeDiagnosticReplay(input({
  scannerAuditEvents: [blockedReplayEvent],
}));
assert.equal(replayWithExplainedNoTrade.phase9FReplayValidation.checks.noTradeExplainedClearly.status, 'pass');
assert.match(replayWithExplainedNoTrade.phase9FReplayValidation.checks.noTradeExplainedClearly.summary, /explicit reason/);

function legacyPromotionDeskState(state: ReturnType<typeof deskStateFor>) {
  const clone = JSON.parse(JSON.stringify(state));
  delete clone.promotion.promotionReadiness;
  delete clone.promotion.requiredProof;
  delete clone.promotion.blockedBy;
  delete clone.promotion.approvalBoundary;
  return clone;
}

const mixedTapeDir = await mkdtemp(join(tmpdir(), 'scanner-decision-tape-import-'));
await writeFile(join(mixedTapeDir, 'scanner-decision-tape-2026-05-29-MES-lunch.json'), `${JSON.stringify({
  reportType: 'scanner_decision_event_tape',
  tradeDate: '2026-05-29',
  instrument: 'MES',
  session: 'lunch',
  events: {
    '2026-05-29T11:55:00.0000000': {
      recordedAt: '2026-05-29T15:56:00Z',
      time: '2026-05-29T11:55:00.0000000',
      scannerState: 'Conditional',
      deskState: legacyPromotionDeskState(deskStateFor('Conditional', conditionalCandidateForReplay)),
      discord: { shouldSend: true, sendOrSuppressReason: 'Pre-window review fixture.' },
    },
    '2026-05-29T12:00:00.0000000': {
      recordedAt: '2026-05-29T16:01:00Z',
      time: '2026-05-29T12:00:00.0000000',
      scannerState: 'TriggerPending',
      deskState: legacyPromotionDeskState(deskStateFor('Watching', watchCandidateForReplay)),
      discord: { shouldSend: true, sendOrSuppressReason: 'Decision tape watch fixture.' },
    },
    '2026-05-29T12:05:00.0000000': {
      recordedAt: '2026-05-29T16:06:00Z',
      time: '2026-05-29T12:05:00.0000000',
      scannerState: 'Conditional',
      deskState: legacyPromotionDeskState(deskStateFor('Conditional', conditionalCandidateForReplay)),
      discord: { shouldSend: true, sendOrSuppressReason: 'Decision tape review fixture.' },
    },
  },
}, null, 2)}\n`, 'utf8');
const mixedTapeHistory = await loadScannerAuditHistory(mixedTapeDir);
assert.equal(mixedTapeHistory.events.length, 3);
assert.equal(mixedTapeHistory.events[0].session, 'lunch');
assert.equal(mixedTapeHistory.events[0].marketTimestamp, '2026-05-29T11:55:00.0000000');
assert.equal(mixedTapeHistory.events[1].deskState?.promotion.requiredProof.length, 4);
assert.equal(mixedTapeHistory.events[1].deskState?.promotion.approvalBoundary.changesCanExecute, false);
assert.match(mixedTapeHistory.events[1].originalFilePath, /#2026-05-29T12:00:00\.0000000$/);
const replayFromMixedTape = runBridgeDiagnosticReplay(input({
  session: 'lunch',
  replayWindow: { from: '12:00', to: '12:10' },
  scannerAuditEvents: mixedTapeHistory.events,
}));
assert.equal(replayFromMixedTape.phase9FReplayValidation.status, 'pass');
assert.equal(replayFromMixedTape.deskStateReplayValidation.watchToPlanPromotionProofed, true);
assert.equal(replayFromMixedTape.phase9FReplayValidation.authority.replayChangesScannerBehavior, false);

const june11LongBias = candidate({
  setupType: SetupType.NoSetup,
  scenarioLabel: 'ICT no installed model path Long: Sweep Reclaim Imbalance Retrace',
  direction: 'LONG',
  entry: 7312,
  stop: 7271.75,
  target1: 7400,
  target2: 7420,
  riskPoints: 40.25,
  executionStatus: ExecutionStatus.Conditional,
  blockReason: NoTradeReason.EntryTriggerPending,
  requiredTrigger: 'Entry only on retrace into bullish imbalance 7281.75-7342 after sweep, reclaim, displacement, and bullish structure shift.',
  evidence: ['HTF MSS support in campaign direction: 60M, 120M.'],
  missingEvidence: ['Completed Morning context is incomplete; keep this as conditional only.'],
  rankScore: 229,
  decisionQualityScore: 87,
});
const june11CounterShort = candidate({
  setupType: SetupType.NoSetup,
  scenarioLabel: 'Bearish no installed model path',
  direction: 'SHORT',
  entry: 7298,
  stop: 7314.5,
  target1: 7263,
  target2: 7256.25,
  riskPoints: 16.5,
  executionStatus: ExecutionStatus.Conditional,
  blockReason: NoTradeReason.EntryTriggerPending,
  requiredTrigger: 'Bearish no installed model path requires completed 5M acceptance below 7303.50.',
  missingEvidence: [
    'Active timeframe MSS ruleset found opposing completed 5M bullish MSS.',
    'Active timeframe MSS ruleset found opposing completed HTF MSS on 60M, 120M.',
    'No chase: wait for a completed 5M or 15M close below 7303.50.',
  ],
  activeRuleset: {
    htfLineInSand: {
      applied: true,
      status: 'blocked',
      required: 'completed_5m_or_15m_close_beyond_htf_line',
      appliesToAllModels: true,
      lineInSand: 7303.5,
      direction: 'SHORT',
      requiredClose: 'Completed 5M or 15M close below 7303.50.',
      lineReason: 'Nearest structured HTF/session support or downside objective in the trade path.',
      obstacleType: 'imbalance_midpoint',
      obstacleSource: 'app',
      evidence: ['No chase: wait for completed close below the line.'],
      blockers: [],
      affectsExecution: false,
    },
  },
  rankScore: 228,
  decisionQualityScore: 93,
});
const june11Visibility = classifyScannerVisibility({
  state: 'Blocked',
  candidate: null,
  alertDecision: { shouldSend: false, reason: 'Blocked setup did not meet educational Discord threshold.' },
  canExecute: false,
});
const june11Lifecycle = buildCandidateLifecycleTrace({
  candidates: [june11LongBias, june11CounterShort],
  selectedCandidate: null,
  state: 'Blocked',
  alertDecision: { shouldSend: false, reason: 'Blocked setup did not meet educational Discord threshold.' },
  canExecute: false,
});
const june11DeskState = buildDeskState({
  state: 'Blocked',
  candidate: null,
  visibilityMetadata: june11Visibility,
  candidateLifecycleTrace: june11Lifecycle,
  canExecute: false,
});
assert.equal(june11DeskState.primaryDeskPlay.sourceOfTruth, 'scanner_primary_desk_play');
assert.equal(june11DeskState.primaryDeskPlay.direction, 'LONG');
assert.equal(june11DeskState.primaryDeskPlay.longBias.state, 'primary');
assert.equal(june11DeskState.primaryDeskPlay.shortBias.state, 'countertrend_review');
assert.equal(june11DeskState.primaryDeskPlay.shortBelow, 7303.5);
assert.equal(june11DeskState.primaryDeskPlay.discordEligible, true);
assert.equal(june11DeskState.canExecute, false);
assert.equal(june11DeskState.primaryDeskPlay.approvalBoundary.changesCanExecute, false);
assert.ok(june11DeskState.primaryDeskPlay.countertrendWarning?.includes('SHORT is pressing into bullish HTF/session structure'));
assert.ok(june11DeskState.primaryDeskPlay.countertrendWarning?.includes('Treat T1/T2 as management'));
assert.ok(june11DeskState.primaryDeskPlay.countertrendWarning?.includes('HTF/session reaction line 7303.50'));

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
  '--session', 'lunch',
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
assert.equal(parsed.session, 'lunch');
assert.equal(parsed.bridgeInstrument, 'MES 06-26');
assert.equal(parsed.from, '10:00');
assert.equal(parsed.to, '12:00');
assert.equal(parsed.direction, 'LONG');
assert.equal(parsed.pretty, true);

console.log('Bridge diagnostic replay agent verified.');
