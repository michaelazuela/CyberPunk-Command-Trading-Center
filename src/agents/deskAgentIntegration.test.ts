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
import { auditDeskStackSafety, buildDeskStackHandoff } from './deskAgentStack';

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
