import assert from 'node:assert/strict';
import { TradeDecisionStatus } from '../types';
import type { NinjaBridgeBar } from '../lib/ninjaTraderBridge';
import type { NormalizedTradePlan } from '../lib/tradePlan';
import { evaluateScannerHealth } from './scannerHealthAgent';
import { selectScannerPlan } from './scannerPlanSelectionAgent';
import { buildWorkflowDecision, workflowAuthorityNote, workflowAuthoritySnapshot } from './workflowOrchestrator';
import { buildOutcomeClosureRecord, proofLearningAuthorityNote } from './proofLearningAgent';
import { buildWeeklyTradingAnalysisReport } from './tradingAnalysisAgent';
import { auditDeskStackSafety, buildDeskStackHandoff } from './deskAgentStack';

function bar(time: string, open: number, high: number, low: number, close: number): NinjaBridgeBar {
  return { time, open, high, low, close, volume: 1000 };
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

const normalized: NormalizedTradePlan = {
  decision: 'LONG',
  decisionLabel: 'LONG',
  executionDecision: 'NO TRADE',
  planningDecision: 'NO TRADE',
  hasConditionalPlans: false,
  entry: 7603.25,
  stop: 7599,
  t1: 7611.75,
  t2: 7620,
  riskPoints: 4.25,
  riskRewardT1: '1.5R',
  riskRewardT2: '2.0R',
  finalConfidence: 'High',
  whyThisPlan: 'Legacy executable-looking fixture should not select in blank-slate mode.',
  invalidation: 'No installed model.',
  source: 'app_rule_engine',
  canExecute: true,
  decisionStatus: TradeDecisionStatus.ApprovedTrade,
  setupCandidates: [],
};
const selected = selectScannerPlan({ normalized, currentPrice: 7603.5 });
assert.equal(selected.candidate, null);
assert.equal(selected.stateForAlert, 'NoTrade');
assert.equal(selected.visibilityMetadata?.authority.registeredModel, false);
assert.equal(selected.visibilityMetadata?.authority.canExecute, false);

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
  selectedCandidateSnapshot: { setupType: 'NoSetup' },
  outcome: 'win',
  tradeTaken: true,
  pnlTicks: 34,
  pnlDollars: 42.5,
});
assert.equal(outcomeClosure.approvalBoundary.proofSubmissionApprovesTrade, false);
assert.ok(proofLearningAuthorityNote().includes('does not approve trades'));

const weeklyReport = buildWeeklyTradingAnalysisReport({
  weekEnding: '2026-06-05',
  instrument: 'MES',
  tradeAlertRecords: [{ state: 'NoTrade', sent: false }],
  healthEvents: [{ status: 'READY' }],
  dataWarnings: [],
});
assert.equal(weeklyReport.approvalBoundary.weeklyReportApprovesTrade, false);
assert.equal(weeklyReport.approvalBoundary.weeklyReportPromotesModel, false);
assert.equal(weeklyReport.recommendations.automaticRuleChangesRecommended, false);

const handoff = buildDeskStackHandoff();
assert.equal(handoff.boundary, 'decision_support_only_app_owned_execution_authority');
assert.ok(handoff.roles.every((role) => role.mustNot.some((item) => item.includes('approve live execution') || item.includes('override'))));

const safetyAudit = auditDeskStackSafety({
  readyHealth,
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

console.log('Desk agent blank-slate authority boundaries verified.');
