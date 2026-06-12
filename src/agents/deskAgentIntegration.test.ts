import assert from 'node:assert/strict';
import type { NinjaBridgeBar } from '../lib/ninjaTraderBridge';
import { ExecutionStatus, NoTradeReason, SetupCandidateStatus, SetupType, TradeDecisionStatus, type SetupCandidate } from '../types';
import { scoreConditionalCandidateRiskForDisplay } from './conditionalCandidateRiskAgent';
import { buildOutcomeClosureRecord, proofLearningAuthorityNote } from './proofLearningAgent';
import { evaluateScannerHealth } from './scannerHealthAgent';
import { selectScannerPlan } from './scannerPlanSelectionAgent';
import { buildWeeklyTradingAnalysisReport } from './tradingAnalysisAgent';
import { detectMorningContinuationWatchlist } from './morningContinuationWatchlistAgent';
import { buildWorkflowDecision, workflowAuthorityNote, workflowAuthoritySnapshot } from './workflowOrchestrator';
import { auditDeskStackSafety, buildDeskAgentPlanNarrative, buildDeskStackHandoff } from './deskAgentStack';
import { buildCandidateLifecycleTrace, buildDeskState, buildTargetCascade, classifyScannerVisibility } from '../lib/localScannerEngine';
import type { TargetObjective } from '../types';

function bar(time: string, open: number, high: number, low: number, close: number): NinjaBridgeBar {
  return { time, open, high, low, close, volume: 1000 };
}

function candidate(overrides: Partial<SetupCandidate> = {}): SetupCandidate {
  return {
    setupType: SetupType.LiquiditySweep,
    scenarioLabel: 'Desk integration fixture',
    direction: 'LONG',
    detectedStatus: SetupCandidateStatus.Detected,
    confidence: 'High',
    priority: 90,
    entry: 7603.25,
    stop: 7599,
    target1: 7611.75,
    target2: 7620,
    riskPoints: 4.25,
    invalidation: 'Invalid below protected sweep wick structure.',
    rankScore: 100,
    evidence: ['sweep/reclaim confirmed', '5M trigger confirmed', 'HTF stack aligned LONG'],
    missingEvidence: [],
    executionStatus: ExecutionStatus.Executable,
    blockReason: null,
    requiredTrigger: 'Completed 5M reclaim must stay confirmed.',
    nextAction: 'Verify deterministic gate output.',
    reducedRiskPlan: null,
    ...overrides,
  };
}

const readyHealth = evaluateScannerHealth({
  config: {
    appInstrument: 'MES',
    bridgeInstrument: 'MES 06-26',
    bridgeUrl: 'http://127.0.0.1:8765',
    timestampMode: 'close',
    barTimeZone: 'eastern',
    discordEnabled: true,
    dryRun: false,
    macroCalendarEnabled: true,
    maxStaleBarMinutes: 10,
  },
  bridgeHealth: { ok: true, defaultInstrument: 'MES 06-26' },
  bridgeReachable: true,
  latestCompleted5mBar: bar('2026-06-02T10:05:00-04:00', 7602, 7605, 7601, 7603.25),
  barStaleness: {
    stale: false,
    latestTime: '2026-06-02T10:05:00-04:00',
    ageMinutes: 1,
    maxAllowedMinutes: 10,
    reason: null,
  },
  discordWebhookConfigured: true,
  marketMapStatus: { loaded: true, usableBars: 6000, fallbackBridgeDataAvailable: true },
  completedFiveMinuteBarAssurance: {
    status: 'ready',
    message: 'Completed 5M Bar Assurance Gate ready: latest completed 5M bar is usable.',
    latestCompletedTime: '2026-06-02T10:05:00-04:00',
    expectedCompletedTime: '2026-06-02T10:05:00-04:00',
    sourceSummary: 'live 5M bars=30; history 5M=6000 from market_bars_bridge_repair',
    recoverySteps: [],
  },
  scannerStateFileStatus: { status: 'ok' },
  macroCalendarStatus: { enabled: true, loaded: true },
  scannerWindow: {
    session: 'morning',
    label: 'Morning Setup Scan',
    allowsTradePlan: true,
    allowsDiscordAlert: true,
  },
});
assert.equal(readyHealth.status, 'READY');
assert.equal(readyHealth.approvalBoundary.healthApprovesTrade, false);
assert.equal(readyHealth.approvalBoundary.healthCreatesEntry, false);

const selected = selectScannerPlan({
  normalized: {
    canExecute: true,
    decisionStatus: TradeDecisionStatus.ApprovedTrade,
    decision: 'LONG',
    entry: 7603.25,
    stop: 7599,
    t1: 7611.75,
    t2: 7620,
    setupCandidates: [candidate()],
    opportunitySelection: { bestExecutableCandidate: candidate() },
  } as any,
  currentPrice: 7603.5,
});
assert.equal(selected.stateForAlert, 'Approved');
assert.equal(selected.candidate?.executionStatus, ExecutionStatus.Executable);

const advisoryRisk = scoreConditionalCandidateRiskForDisplay(candidate({
  executionStatus: ExecutionStatus.Blocked,
  blockReason: NoTradeReason.RiskTooWide,
  riskPoints: 8.5,
}));
assert.equal(advisoryRisk.canExecute, false);
assert.equal(advisoryRisk.approvalBoundary.riskScoreApprovesTrade, false);
assert.ok(advisoryRisk.advisoryNotes.some((note) => note.includes('Risk exceeds standard limit. Human final decision required')));

const watchlist = detectMorningContinuationWatchlist({
  tradeDate: '2026-06-02',
  instrument: 'MES',
  window: { session: 'morning', label: 'Morning Setup Scan', allowsTradePlan: true },
  bars5m: [
    bar('2026-06-02T09:30:00-04:00', 7600, 7602, 7598, 7601),
    bar('2026-06-02T09:35:00-04:00', 7601, 7603, 7599, 7602),
    bar('2026-06-02T09:40:00-04:00', 7602, 7604, 7600, 7603),
    bar('2026-06-02T09:45:00-04:00', 7603, 7615, 7602, 7614),
  ],
  currentPrice: 7614,
});
assert.equal(watchlist.canExecute, false);
assert.equal(watchlist.tradeAlertEligible, false);
assert.equal(watchlist.approvalBoundary.watchlistApprovesTrade, false);

const workflowDecision = buildWorkflowDecision(null, {
  sessionType: 'morning',
  instrument: 'MES',
  windowStatusOverride: 'active',
});
assert.ok(workflowDecision.authorityNote.includes('tradeDecisionPipeline'));
assert.notEqual(workflowDecision.plan.decisionStatus, TradeDecisionStatus.ApprovedTrade);
assert.equal(workflowAuthoritySnapshot('decision').decisionAuthority, 'app_owned_pipeline');
assert.ok(workflowAuthorityNote().includes('final execution authority'));

const outcomeClosure = buildOutcomeClosureRecord({
  setupId: 'desk-integration',
  alertId: 'alert-1',
  planVersionId: 'plan-1',
  sessionType: 'morning',
  tradeDate: '2026-06-02',
  instrument: 'MES',
  originalNormalizedPlan: { canExecute: true, decisionStatus: TradeDecisionStatus.ApprovedTrade },
  selectedCandidateSnapshot: { setupType: SetupType.LiquiditySweep },
  outcome: 'win',
  tradeTaken: true,
  pnlTicks: 34,
  pnlDollars: 42.5,
});
assert.equal(outcomeClosure.approvalBoundary.proofSubmissionApprovesTrade, false);
assert.equal(outcomeClosure.approvalBoundary.ragSaveApprovesTradeRetroactively, false);
assert.ok(proofLearningAuthorityNote().includes('does not approve trades'));

const weeklyReport = buildWeeklyTradingAnalysisReport({
  weekEnding: '2026-06-05',
  instrument: 'MES',
  tradeAlertRecords: [{ state: 'Approved', sent: true }],
  healthEvents: [{ status: 'READY' }],
  dataWarnings: [],
});
assert.equal(weeklyReport.approvalBoundary.weeklyReportApprovesTrade, false);
assert.equal(weeklyReport.approvalBoundary.weeklyReportPromotesModel, false);
assert.equal(weeklyReport.recommendations.automaticRuleChangesRecommended, false);

const handoff = buildDeskStackHandoff();
assert.equal(handoff.stackName, 'quant_desk_trading_desk_stack');
assert.equal(handoff.boundary, 'decision_support_only_app_owned_execution_authority');
assert.deepEqual(
  handoff.roles.map((role) => role.key),
  [
    'scannerHealthAgent',
    'scannerPlanSelectionAgent',
    'conditionalCandidateRiskAgent',
    'morningContinuationWatchlistAgent',
    'riskReviewAgent',
    'workflowOrchestrator',
    'proofLearningAgent',
    'tradingAnalysisAgent',
  ],
);
assert.ok(handoff.roles.every((role) => role.mustNot.some((item) => item.includes('approve live execution') || item.includes('override'))));
assert.ok(handoff.safetyNotes.some((note) => note.includes('final execution authority')));
const scannerPlanRole = handoff.roles.find((role) => role.key === 'scannerPlanSelectionAgent');
assert.ok(scannerPlanRole?.consumes.some((item) => item.includes('NinjaTrader-OHLC setup candidates')));
assert.ok(scannerPlanRole?.produces.some((item) => item.includes('Intraday MSS watch lifecycle status')));
assert.ok(scannerPlanRole?.mustNot.some((item) => item.includes('Gemini/advisory context create Intraday MSS watches')));
const workflowRole = handoff.roles.find((role) => role.key === 'workflowOrchestrator');
assert.ok(workflowRole?.produces.some((item) => item.includes('DeskState plan narrative')));

const reactionObjective: TargetObjective = {
  label: 'London Session Low',
  price: 7288.25,
  direction: 'SHORT',
  source: 'london',
  type: 'low',
  confidence: 'High',
  score: 90,
  distancePoints: 51.5,
  rMultiple: 1.5,
  reason: 'Real session liquidity where short delivery can stall or reverse.',
};
const shortDeliveryCandidate = candidate({
  direction: 'SHORT',
  entry: 7339.75,
  stop: 7350.25,
  target1: 7324,
  target2: 7318.75,
  riskPoints: 10.5,
  rankScore: 95,
  requiredTrigger: 'Completed 5M acceptance below 7342.00, then failed retest.',
  activeRuleset: {
    htfLineInSand: {
      applied: true,
      status: 'passed',
      required: 'completed_5m_or_15m_close_beyond_htf_line',
      appliesToAllModels: true,
      affectsExecution: false,
      direction: 'SHORT',
      lineInSand: 7342,
      lineReason: 'Protected 5M short continuation line below HTF reaction area.',
      requiredClose: 'Completed 5M close below 7342.00.',
      obstacleType: 'low',
      obstacleSource: 'london',
      evidence: ['London Session Low is target/reaction context.'],
      blockers: [],
    },
  },
  targetObjectivePlan: {
    selectedT1: reactionObjective,
    selectedT2: null,
    nearestObstacleTarget: null,
    obstacleTarget1: null,
    nearestLiquidityTarget: reactionObjective,
    liquidityTarget1: reactionObjective,
    liquidityTarget2: null,
    liquidityRunnerTarget: null,
    runnerTarget: null,
    targetManagementInstruction: 'Management: take T1 seriously; cap expectation at T2 into HTF/session structure unless completed 5M acceptance clears it. Reversal risk is live.',
    liquidityMapSummary: 'LQ1 7288.25 London Session Low',
    targetPathWarning: null,
    targetQuality: 'clear_path',
    objectives: [reactionObjective],
    notes: [],
    targetModel: 'actual_r_with_structural_context',
  },
});
const longShiftCandidate = candidate({
  direction: 'LONG',
  entry: null,
  stop: null,
  target1: null,
  target2: null,
  riskPoints: null,
  rankScore: 80,
  requiredTrigger: 'Completed 5M reclaim above 7342.00 after protected structure shift.',
  activeRuleset: {
    htfLineInSand: {
      applied: true,
      status: 'passed',
      required: 'completed_5m_or_15m_close_beyond_htf_line',
      appliesToAllModels: true,
      affectsExecution: false,
      direction: 'LONG',
      lineInSand: 7342,
      lineReason: 'New protected 5M long line after reversal shift.',
      requiredClose: 'Completed 5M close above 7342.00.',
      obstacleType: 'high',
      obstacleSource: 'london',
      evidence: ['Long line appears only after protected 5M shift.'],
      blockers: [],
    },
  },
});
const deskLifecycle = buildCandidateLifecycleTrace({
  candidates: [shortDeliveryCandidate, longShiftCandidate],
  selectedCandidate: shortDeliveryCandidate,
  state: 'Conditional',
  alertDecision: { shouldSend: false, reason: 'Desk narrative fixture.' },
  canExecute: false,
});
const deskVisibility = classifyScannerVisibility({
  state: 'Conditional',
  candidate: shortDeliveryCandidate,
  alertDecision: { shouldSend: false, reason: 'Desk narrative fixture.' },
  canExecute: false,
});
const deskState = buildDeskState({
  state: 'Conditional',
  candidate: shortDeliveryCandidate,
  visibilityMetadata: deskVisibility,
  candidateLifecycleTrace: deskLifecycle,
  targetCascade: buildTargetCascade({
    candidate: shortDeliveryCandidate,
    objectives: [reactionObjective],
    recentBars: [],
  }),
  canExecute: false,
});
const deskNarrative = buildDeskAgentPlanNarrative(deskState);
const deskNarrativeText = deskNarrative.plainText.join('\n');
assert.equal(deskNarrative.sourceOfTruth, 'desk_agent_plan_narrative_from_scanner_desk_state');
assert.ok(deskNarrativeText.includes('LONG Bias:'));
assert.ok(deskNarrativeText.includes('LONG above 7342.00'));
assert.ok(deskNarrativeText.includes('Completed 5M reclaim above 7342.00 after protected structure shift.'));
assert.ok(deskNarrativeText.includes('SHORT Bias:'));
assert.ok(deskNarrativeText.includes('SHORT below 7342.00'));
assert.ok(deskNarrativeText.includes('Completed 5M acceptance below 7342.00, then failed retest.'));
assert.ok(deskNarrativeText.includes('Target/reaction: London Session Low 7288.25'));
assert.ok(deskNarrativeText.includes('take T1 seriously'));
assert.ok(deskNarrativeText.includes('cap expectation at T2 into HTF/session structure'));
assert.ok(deskNarrativeText.includes('Reversal risk is live'));
assert.ok(deskNarrativeText.includes('After 5M shift: LONG above 7342.00 / SHORT below 7342.00.'));
assert.equal(deskNarrative.approvalBoundary.changesCanExecute, false);
assert.equal(deskNarrative.approvalBoundary.changesEntryStopTargets, false);

const htfOppositionShort = candidate({
  direction: 'SHORT',
  entry: 7295.5,
  stop: 7336,
  target1: 7234.75,
  target2: 7214.5,
  riskPoints: 40.5,
  rankScore: 91,
  requiredTrigger: 'Entry only on retrace into bearish imbalance after sweep, reclaim, displacement, and bearish structure shift.',
  activeRuleset: {
    timeframeMss: {
      applied: true,
      status: 'blocked',
      required: 'aligned_confirmed_5m_mss',
      appliesToAllModels: true,
      affectsExecution: false,
      evidence: ['Active timeframe MSS context aligned on 15M, 240M.'],
      blockers: ['Active timeframe MSS ruleset found opposing completed HTF MSS on 60M, 120M.'],
    },
    htfLineInSand: {
      applied: true,
      status: 'blocked',
      required: 'completed_5m_or_15m_close_beyond_htf_line',
      appliesToAllModels: true,
      affectsExecution: false,
      direction: 'SHORT',
      lineInSand: 7302.75,
      lineReason: 'Nearest structured HTF/session support or downside objective in the trade path.',
      requiredClose: 'Completed 5M or 15M close below 7302.75 required before short continuation is active.',
      obstacleType: 'imbalance_zone',
      obstacleSource: 'rth_morning',
      evidence: ['HTF/session line 7302.75 is management context.'],
      blockers: ['No chase: wait for completed proof below HTF/session support.'],
    },
  },
  targetObjectivePlan: {
    selectedT1: reactionObjective,
    selectedT2: null,
    nearestObstacleTarget: null,
    obstacleTarget1: null,
    nearestLiquidityTarget: reactionObjective,
    liquidityTarget1: reactionObjective,
    liquidityTarget2: null,
    liquidityRunnerTarget: null,
    runnerTarget: null,
    targetManagementInstruction: null,
    liquidityMapSummary: 'LQ1 7288.25 London Session Low',
    targetPathWarning: null,
    targetQuality: 'target_blocked',
    objectives: [reactionObjective],
    notes: [],
    targetModel: 'actual_r_with_structural_context',
  },
});
const htfOppositionShortTrace = buildCandidateLifecycleTrace({
  candidates: [htfOppositionShort],
  selectedCandidate: htfOppositionShort,
  state: 'Conditional',
  alertDecision: { shouldSend: false, reason: 'HTF opposition fixture.' },
  canExecute: false,
});
const htfOppositionShortDeskState = buildDeskState({
  state: 'Conditional',
  candidate: htfOppositionShort,
  visibilityMetadata: classifyScannerVisibility({
    state: 'Conditional',
    candidate: htfOppositionShort,
    alertDecision: { shouldSend: false, reason: 'HTF opposition fixture.' },
    canExecute: false,
  }),
  candidateLifecycleTrace: htfOppositionShortTrace,
  canExecute: false,
});
const htfOppositionShortText = buildDeskAgentPlanNarrative(htfOppositionShortDeskState).plainText.join('\n');
assert.ok(htfOppositionShortText.includes('SHORT is pressing into bullish HTF/session structure'));
assert.ok(htfOppositionShortText.includes('Target/reaction: London Session Low 7288.25'));
assert.ok(htfOppositionShortText.includes('wait for a protected completed 5M line-in-the-sand shift'));

const htfOppositionLong = candidate({
  direction: 'LONG',
  entry: 7312,
  stop: 7271.75,
  target1: 7372.5,
  target2: 7392.5,
  riskPoints: 40.25,
  rankScore: 91,
  requiredTrigger: 'Entry only on retrace into bullish imbalance after sweep, reclaim, displacement, and bullish structure shift.',
  activeRuleset: {
    timeframeMss: {
      applied: true,
      status: 'blocked',
      required: 'aligned_confirmed_5m_mss',
      appliesToAllModels: true,
      affectsExecution: false,
      evidence: ['Active timeframe MSS context aligned on 15M, 240M.'],
      blockers: ['Active timeframe MSS ruleset found opposing completed HTF MSS on 60M, 120M.'],
    },
  },
});
const htfOppositionLongTrace = buildCandidateLifecycleTrace({
  candidates: [htfOppositionLong],
  selectedCandidate: htfOppositionLong,
  state: 'Conditional',
  alertDecision: { shouldSend: false, reason: 'HTF opposition fixture.' },
  canExecute: false,
});
const htfOppositionLongDeskState = buildDeskState({
  state: 'Conditional',
  candidate: htfOppositionLong,
  visibilityMetadata: classifyScannerVisibility({
    state: 'Conditional',
    candidate: htfOppositionLong,
    alertDecision: { shouldSend: false, reason: 'HTF opposition fixture.' },
    canExecute: false,
  }),
  candidateLifecycleTrace: htfOppositionLongTrace,
  canExecute: false,
});
const htfOppositionLongText = buildDeskAgentPlanNarrative(htfOppositionLongDeskState).plainText.join('\n');
assert.ok(htfOppositionLongText.includes('LONG is pressing into bearish HTF/session structure'));
assert.ok(htfOppositionLongText.includes('wait for a protected completed 5M line-in-the-sand shift'));

const safetyAudit = auditDeskStackSafety({
  readyHealth,
  advisoryRisk,
  watchlist,
  workflowDecision: {
    authorityNote: workflowDecision.authorityNote,
    decisionStatus: workflowDecision.plan.decisionStatus,
  },
  workflowSnapshot: workflowAuthoritySnapshot('decision'),
  outcomeClosure,
  weeklyReport,
  handoff,
  deskNarrative,
});
assert.equal(safetyAudit.safe, true, safetyAudit.findings.map((finding) => `${finding.path}: ${finding.reason}`).join('\n'));
assert.equal(safetyAudit.findingCount, 0);

const unsafeAudit = auditDeskStackSafety({
  rogueAgentOutput: {
    canExecute: true,
    note: 'Agent approved execution.',
  },
});
assert.equal(unsafeAudit.safe, false);
assert.ok(unsafeAudit.findings.some((finding) => finding.path.endsWith('canExecute')));
assert.ok(unsafeAudit.findings.some((finding) => String(finding.reason).includes('Unsafe authority phrase')));

console.log('Desk agent end-to-end authority boundaries verified.');
