import assert from 'node:assert/strict';
import { resolveScannerWindow, shouldSendScannerAlert } from '../lib/localScannerEngine';
import { buildNinjaChartContext, type NinjaBridgeBar } from '../lib/ninjaTraderBridge';
import { buildAppTradePlan } from '../lib/planEngine';
import { ExecutionStatus, NoTradeReason, SetupCandidateStatus, SetupType, TradeDecisionStatus, type SetupCandidate } from '../types';
import { selectScannerPlan } from './scannerPlanSelectionAgent';

function candidate(overrides: Partial<SetupCandidate> = {}): SetupCandidate {
  return {
    setupType: SetupType.LiquiditySweep,
    scenarioLabel: 'Liquidity Sweep Reversal failed breakdown wick rejection impulse market structure shift imbalance discount',
    direction: 'LONG',
    detectedStatus: SetupCandidateStatus.Detected,
    confidence: 'High',
    priority: 90,
    entry: 100,
    stop: 96,
    target1: 108,
    target2: 108,
    riskPoints: 4,
    invalidation: 'Invalid below protected swing low.',
    rankScore: 100,
    evidence: ['sweep/reclaim confirmed', 'local market structure shift confirmed', 'expansion impulse confirmed'],
    missingEvidence: [],
    executionStatus: ExecutionStatus.Conditional,
    blockReason: null,
    requiredTrigger: '5M close above reclaim level, then pullback holds.',
    nextAction: 'Wait for reclaim retest.',
    reducedRiskPlan: null,
    ...overrides,
  };
}

function bar(time: string, open: number, high: number, low: number, close: number): NinjaBridgeBar {
  return { time, open, high, low, close, volume: 1 };
}

const staleNormalizedCandidate = candidate({
  entry: 100,
  stop: 96,
  target1: 106,
  target2: 108,
  riskPoints: 4,
  executionStatus: ExecutionStatus.Executable,
});
const staleNormalizedPlan: any = {
  canExecute: true,
  decisionStatus: TradeDecisionStatus.ApprovedTrade,
  decision: 'LONG',
  entry: 100,
  stop: 96,
  t1: 106,
  t2: 108,
  setupCandidates: [staleNormalizedCandidate],
  opportunitySelection: { bestExecutableCandidate: staleNormalizedCandidate },
  earlyMoveReview: { status: 'already_triggered_no_fresh_entry', action: 'No fresh entry.' },
};
const stalePlanBefore = JSON.stringify(staleNormalizedPlan);
const staleSelection = selectScannerPlan({ normalized: staleNormalizedPlan, currentPrice: 109 });
assert.equal(staleSelection.stateForAlert, 'Missed');
assert.equal(staleSelection.candidate, null);
assert.equal(staleSelection.reviewStatus, 'already_triggered_no_fresh_entry');
assert.equal(staleSelection.stale.stale, true);
assert.ok(staleSelection.auditWarnings.some((warning) => warning.includes('already_triggered_no_fresh_entry')));
assert.equal(JSON.stringify(staleNormalizedPlan), stalePlanBefore);

const blockedPlanCandidate = candidate({
  executionStatus: ExecutionStatus.Blocked,
  blockReason: NoTradeReason.InvalidStopLocation,
});
const blockedSelection = selectScannerPlan({
  normalized: {
    canExecute: true,
    decisionStatus: TradeDecisionStatus.ApprovedTrade,
    decision: 'LONG',
    entry: blockedPlanCandidate.entry,
    stop: blockedPlanCandidate.stop,
    setupCandidates: [blockedPlanCandidate],
    opportunitySelection: { bestExecutableCandidate: blockedPlanCandidate },
  } as any,
  currentPrice: 101,
});
assert.equal(blockedSelection.stateForAlert, 'Blocked');
assert.equal(blockedSelection.candidate, blockedPlanCandidate);
assert.notEqual(blockedSelection.stateForAlert, 'Approved');
assert.notEqual(blockedSelection.stateForAlert, 'Executable');

const wrongDirectionCandidate = candidate({
  direction: 'SHORT',
  entry: 100,
  stop: 104,
  target1: 92,
  target2: 92,
  executionStatus: ExecutionStatus.Executable,
});
const directionMismatchSelection = selectScannerPlan({
  normalized: {
    canExecute: true,
    decisionStatus: TradeDecisionStatus.ApprovedTrade,
    decision: 'LONG',
    entry: 100,
    stop: 96,
    setupCandidates: [wrongDirectionCandidate],
    opportunitySelection: { bestExecutableCandidate: wrongDirectionCandidate },
  } as any,
  currentPrice: 101,
});
assert.equal(directionMismatchSelection.candidate, null);
assert.equal(directionMismatchSelection.stateForAlert, 'NoTrade');
assert.ok(directionMismatchSelection.auditWarnings.some((warning) => warning.includes('no matching app-owned candidate')));

const freshExecutableCandidate = candidate({
  executionStatus: ExecutionStatus.Executable,
  entry: 100,
  stop: 96,
  target1: 106,
  target2: 108,
});
const selectedExecutable = selectScannerPlan({
  normalized: {
    canExecute: true,
    decisionStatus: TradeDecisionStatus.ApprovedTrade,
    decision: 'LONG',
    entry: freshExecutableCandidate.entry,
    stop: freshExecutableCandidate.stop,
    setupCandidates: [freshExecutableCandidate],
    opportunitySelection: { bestExecutableCandidate: freshExecutableCandidate },
  } as any,
  currentPrice: 101,
});
assert.equal(selectedExecutable.candidate, freshExecutableCandidate);
assert.equal(selectedExecutable.stateForAlert, 'Approved');
assert.equal(selectedExecutable.reviewStatus, null);

const fallbackStaleCandidate = candidate({
  executionStatus: ExecutionStatus.Executable,
  entry: 100,
  stop: 96,
  target1: 106,
  target2: 108,
});
const staleFallback = selectScannerPlan({
  normalized: {
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    decision: 'NO TRADE',
    setupCandidates: [fallbackStaleCandidate],
  } as any,
  currentPrice: 108,
});
assert.equal(staleFallback.stateForAlert, 'Missed');
assert.equal(staleFallback.candidate, null);
assert.equal(staleFallback.reviewStatus, 'already_triggered_no_fresh_entry');

const morningMoveBars: NinjaBridgeBar[] = [
  bar('2026-05-28T09:30:00-04:00', 7535.75, 7538.75, 7534.75, 7535.25),
  bar('2026-05-28T09:35:00-04:00', 7535.25, 7537.25, 7527.75, 7530.00),
  bar('2026-05-28T09:40:00-04:00', 7530.00, 7530.00, 7525.50, 7527.25),
  bar('2026-05-28T09:45:00-04:00', 7527.25, 7530.25, 7525.50, 7528.75),
  bar('2026-05-28T09:50:00-04:00', 7528.50, 7532.00, 7526.00, 7527.25),
  bar('2026-05-28T09:55:00-04:00', 7527.25, 7537.25, 7526.25, 7531.75),
  bar('2026-05-28T10:00:00-04:00', 7531.75, 7536.25, 7530.50, 7535.75),
  bar('2026-05-28T10:05:00-04:00', 7535.75, 7539.75, 7533.50, 7536.50),
  bar('2026-05-28T10:10:00-04:00', 7536.25, 7540.25, 7533.50, 7540.25),
  bar('2026-05-28T10:15:00-04:00', 7540.25, 7574.00, 7535.00, 7564.75),
];

function normalizedFromMorningMoveThrough(index: number) {
  const bars = morningMoveBars.slice(0, index + 1);
  const chartContext = buildNinjaChartContext({
    bars5m: bars,
    sessionType: 'morning',
    instrument: 'MES',
    tradeDate: '2026-05-28',
  });
  return buildAppTradePlan({
    dayType: 'NO TRADE' as any,
    reasoning: 'Bridge fixture regression.',
    confidence: 0.5,
    checks: [],
    structuredChartContext: chartContext || undefined,
    current_rule_analysis: {
      summary: 'Bridge fixture regression.',
      setup_detected: 'Pending deterministic setup scan',
      rule_category: 'APP_OWNED_PIPELINE',
      entry: null,
      stop: null,
      target_1: null,
      target_2: null,
      trigger_state: 'NO_TRIGGER',
      entry_trigger: null,
      no_trade_reason: null,
      base_confidence: 'Medium',
    },
  }, { sessionType: 'morning', instrument: 'MES', windowStatusOverride: 'active' });
}

const openingMovePlan = normalizedFromMorningMoveThrough(5);
const openingMoveSelection = selectScannerPlan({
  normalized: openingMovePlan,
  currentPrice: morningMoveBars[5].close,
});
assert.equal(resolveScannerWindow(new Date('2026-05-28T09:55:00-04:00')).allowsDiscordAlert, false);
assert.equal(
  shouldSendScannerAlert({
    state: openingMoveSelection.stateForAlert,
    confidence: 100,
    window: resolveScannerWindow(new Date('2026-05-28T09:55:00-04:00')),
    candidate: openingMoveSelection.candidate,
    stale: openingMoveSelection.stale.stale,
  }).shouldSend,
  false
);

const tenAmMovePlan = normalizedFromMorningMoveThrough(6);
const tenAmSelection = selectScannerPlan({
  normalized: tenAmMovePlan,
  currentPrice: morningMoveBars[6].close,
});
assert.notEqual(tenAmSelection.stateForAlert, 'Approved');
assert.notEqual(tenAmSelection.stateForAlert, 'Executable');
assert.equal(tenAmSelection.candidate, null);
assert.equal(
  shouldSendScannerAlert({
    state: tenAmSelection.stateForAlert,
    confidence: 100,
    window: resolveScannerWindow(new Date('2026-05-28T10:00:00-04:00')),
    candidate: tenAmSelection.candidate,
    stale: tenAmSelection.stale.stale,
  }).shouldSend,
  false
);

const tenOhFiveMovePlan = normalizedFromMorningMoveThrough(7);
const tenOhFiveSelection = selectScannerPlan({
  normalized: tenOhFiveMovePlan,
  currentPrice: morningMoveBars[7].close,
});
assert.notEqual(tenOhFiveSelection.stateForAlert, 'Approved');
assert.notEqual(tenOhFiveSelection.stateForAlert, 'Executable');

const tenFifteenMovePlan = normalizedFromMorningMoveThrough(9);
const tenFifteenSelection = selectScannerPlan({
  normalized: tenFifteenMovePlan,
  currentPrice: morningMoveBars[9].close,
});
assert.equal(tenFifteenSelection.stateForAlert, 'Missed');
assert.equal(tenFifteenSelection.candidate, null);
