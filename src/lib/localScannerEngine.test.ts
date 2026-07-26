import assert from 'node:assert/strict';
import { SETUP_REGISTRY } from '../config/setupRegistry';
import { ExecutionStatus, NoTradeReason, SetupCandidateStatus, SetupType, TradeDecisionStatus, type SetupCandidate } from '../types';
import {
  assessBridgeBarStaleness,
  buildCandidateLifecycleTrace,
  buildDeskPublishDecision,
  buildDeskState,
  buildTradeDecisionMapAudit,
  classifyScannerVisibility,
  latestCompletedBar,
  resolveScannerWindow,
  scannerAlertKey,
  scannerContextState,
  scannerStateFromDecision,
  shouldSendScannerAlert,
} from './localScannerEngine';

function candidate(overrides: Partial<SetupCandidate> = {}): SetupCandidate {
  return {
    setupType: SetupType.NoSetup,
    scenarioLabel: 'Blank-slate compatibility fixture',
    direction: 'LONG',
    detectedStatus: SetupCandidateStatus.Conditional,
    confidence: 'Medium',
    priority: 0,
    entry: null,
    stop: null,
    target1: null,
    target2: null,
    riskPoints: null,
    invalidation: null,
    rankScore: 0,
    evidence: [],
    missingEvidence: ['No trading model is installed.'],
    executionStatus: ExecutionStatus.Blocked,
    blockReason: NoTradeReason.NoApprovedSetup,
    requiredTrigger: null,
    nextAction: 'Install a newly approved model definition before trade-plan promotion can resume.',
    reducedRiskPlan: null,
    ...overrides,
  };
}

const morningWindow = resolveScannerWindow(new Date('2026-05-19T10:05:00-04:00'));
const lunchWindow = resolveScannerWindow(new Date('2026-05-19T13:00:00-04:00'));
const eveningWindow = resolveScannerWindow(new Date('2026-05-19T18:45:00-04:00'));
const outsideWindow = resolveScannerWindow(new Date('2026-05-19T08:00:00-04:00'));

assert.equal(morningWindow.session, 'morning');
assert.equal(lunchWindow.session, 'lunch');
assert.equal(eveningWindow.session, 'evening');
assert.equal(outsideWindow.session, 'outside');
assert.equal(scannerContextState(morningWindow), 'MapReady');

const audit = buildTradeDecisionMapAudit(SETUP_REGISTRY);
assert.equal(audit.sourceOfTruth, 'setup_registry_trade_decision_map_audit');
assert.equal(audit.entries.length, 0);
assert.equal(audit.tradingLogicChanged, false);

const blankCandidate = candidate();
const visibility = classifyScannerVisibility({
  state: 'Blocked',
  candidate: blankCandidate,
  window: morningWindow,
  alertDecision: { shouldSend: false, reason: 'Blank slate blocks model publishing.' },
  canExecute: false,
});

assert.equal(visibility.visibilityMode, 'HOLD_WITH_REASON');
assert.equal(visibility.discordAction, 'hold');
assert.equal(visibility.authority.registeredModel, false);
assert.equal(visibility.authority.activeModel, false);
assert.equal(visibility.authority.executionEligible, false);
assert.equal(visibility.authority.canExecute, false);

const lifecycle = buildCandidateLifecycleTrace({
  candidates: [blankCandidate],
  selectedCandidate: null,
  state: 'Blocked',
  window: morningWindow,
  alertDecision: { shouldSend: false, reason: 'Blank slate blocks model publishing.' },
  canExecute: false,
});

assert.equal(lifecycle.candidateCount, 1);
assert.equal(lifecycle.createdCandidates[0]?.setupType, SetupType.NoSetup);
assert.equal(lifecycle.selectedCandidate, null);

const deskState = buildDeskState({
  state: 'Blocked',
  candidate: blankCandidate,
  visibilityMetadata: visibility,
  candidateLifecycleTrace: lifecycle,
  canExecute: false,
});

assert.equal(deskState.sourceOfTruth, 'scanner_desk_state');
assert.equal(deskState.canExecute, false);
assert.equal(deskState.deskTicket, null);

const publishDecision = buildDeskPublishDecision({
  deskState,
});
assert.equal(publishDecision.shouldPost, false);
assert.equal(publishDecision.discordAction, 'hold');

assert.equal(shouldSendScannerAlert({
  state: 'Blocked',
  candidate: blankCandidate,
  confidence: 0,
  window: morningWindow,
}).shouldSend, false);

assert.match(scannerAlertKey({
  tradeDate: '2026-06-08',
  instrument: 'MES',
  session: 'morning',
  state: 'Blocked',
  candidate: blankCandidate,
}), /NoSetup/);

const bars = [
  { time: '2026-06-08T09:30:00-04:00', open: 1, high: 2, low: 0, close: 1.5, volume: 1 },
  { time: '2026-06-08T09:35:00-04:00', open: 1.5, high: 2, low: 1, close: 1.75, volume: 1 },
];
const latest = latestCompletedBar(bars, 5, new Date('2026-06-08T09:40:00-04:00'));
assert.equal(latest?.time, bars[1]?.time);
assert.equal(assessBridgeBarStaleness({
  latestBar: latest,
  timeframeMinutes: 5,
  now: new Date('2026-06-08T09:40:00-04:00'),
  maxStaleBarMinutes: 10,
}).stale, false);

assert.equal(scannerStateFromDecision({
  decisionStatus: TradeDecisionStatus.NoTrade,
  candidate: null,
}), 'NoTrade');

console.log('localScannerEngine blank-slate compatibility verified');
