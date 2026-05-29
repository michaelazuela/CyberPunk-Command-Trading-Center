import assert from 'node:assert/strict';
import { ExecutionStatus, SetupCandidateStatus, SetupType, TradeDecisionStatus, type SetupCandidate } from '../types';
import type { NinjaBridgeBar } from '../lib/ninjaTraderBridge';
import type { NormalizedTradePlan } from '../lib/tradePlan';
import { detectMorningContinuationWatchlist } from './morningContinuationWatchlistAgent';

function bar(time: string, open: number, high: number, low: number, close: number): NinjaBridgeBar {
  return { time, open, high, low, close, volume: 1000 };
}

function candidate(overrides: Partial<SetupCandidate> = {}): SetupCandidate {
  return {
    setupType: SetupType.SweepMssFvgRetrace,
    scenarioLabel: 'App-owned executable setup',
    direction: 'LONG',
    detectedStatus: SetupCandidateStatus.Detected,
    confidence: 'High',
    priority: 90,
    entry: 100,
    stop: 96,
    target1: 106,
    target2: 108,
    riskPoints: 4,
    invalidation: 'Invalid below protected swing low.',
    rankScore: 100,
    evidence: ['approved setup evidence'],
    missingEvidence: [],
    executionStatus: ExecutionStatus.Executable,
    blockReason: null,
    requiredTrigger: '5M trigger.',
    nextAction: 'Execute only if trigger remains confirmed.',
    reducedRiskPlan: null,
    ...overrides,
  };
}

function normalized(overrides: Partial<NormalizedTradePlan> = {}): NormalizedTradePlan {
  return {
    decision: 'NO TRADE',
    decisionLabel: 'NO TRADE',
    executionDecision: 'No executable trade.',
    planningDecision: 'Watch only.',
    hasConditionalPlans: false,
    entry: null,
    stop: null,
    t1: null,
    t2: null,
    riskPoints: null,
    riskRewardT1: null,
    riskRewardT2: null,
    finalConfidence: 'Low',
    whyThisPlan: 'No executable setup.',
    invalidation: 'No trade.',
    source: 'app_rule_engine',
    canExecute: false,
    decisionStatus: TradeDecisionStatus.Wait,
    setupCandidates: [],
    opportunitySelection: {
      bestExecutableCandidate: null,
      bestConditionalCandidate: null,
      finalDecision: TradeDecisionStatus.Wait,
      noTradeReason: null,
    },
    earlyMoveReview: null,
    ...overrides,
  };
}

const morningWindow = {
  session: 'morning' as const,
  label: 'Morning Execution Window',
  allowsTradePlan: true,
};

const lunchWindow = {
  session: 'lunch' as const,
  label: 'Lunch Review',
  allowsTradePlan: true,
};

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

const beforeBars = JSON.stringify(morningMoveBars);
const plan = normalized({
  earlyMoveReview: {
    status: 'already_triggered_no_fresh_entry',
    direction: 'LONG',
    moveStart: 7525.5,
    moveExtreme: 7574,
    triggerArea: 7535.75,
    currentPrice: 7564.75,
    movePoints: 48.5,
    freshEntryAvailable: false,
    summary: 'First move detected.',
    reason: 'Already extended.',
    action: 'No fresh entry.',
    journalSuggestion: 'Journal missed move.',
    approvalBoundary: {
      approvesTrade: false,
      changesEntry: false,
      changesStop: false,
      changesTargets: false,
      changesRisk: false,
    },
  },
});
const beforePlan = JSON.stringify(plan);
const result = detectMorningContinuationWatchlist({
  tradeDate: '2026-05-28',
  instrument: 'MES',
  window: morningWindow,
  bars5m: morningMoveBars,
  currentPrice: 7564.75,
  normalizedPlan: plan,
  selectedCandidate: null,
  scannerState: 'Missed',
});

assert.equal(result.watchlistDetected, true);
assert.equal(result.watchlistType, 'morning_continuation_watchlist');
assert.equal(result.direction, 'LONG');
assert.equal(result.status, 'WATCH_ONLY');
assert.equal(result.canExecute, false);
assert.equal(result.tradeAlertEligible, false);
assert.equal(result.freshEntryAvailable, false);
assert.equal(result.noChaseWarning, true);
assert.equal(result.memoryEligible, true);
assert.equal(result.approvalBoundary.watchlistApprovesTrade, false);
assert.equal(result.approvalBoundary.watchlistChangesRules, false);
assert.equal(result.approvalBoundary.watchlistCreatesEntry, false);
assert.equal(result.approvalBoundary.watchlistCreatesTargets, false);
assert.equal(result.approvalBoundary.watchlistOverridesScanner, false);
assert.ok(result.reason.includes('no fresh entry'));
assert.ok(result.requiredNextCondition.includes('completed 5M pullback'));
assert.ok(result.missingEvidence.some((item) => item.includes('approved rules')));
assert.equal(JSON.stringify(morningMoveBars), beforeBars);
assert.equal(JSON.stringify(plan), beforePlan);
assert.equal('entry' in result, false);
assert.equal('stop' in result, false);
assert.equal('t1' in result, false);
assert.equal('t2' in result, false);

const lunchResult = detectMorningContinuationWatchlist({
  tradeDate: '2026-05-28',
  instrument: 'MES',
  window: lunchWindow,
  bars5m: morningMoveBars,
  currentPrice: 7564.75,
  normalizedPlan: plan,
});
assert.equal(lunchResult.watchlistDetected, false);
assert.equal(lunchResult.canExecute, false);
assert.equal(lunchResult.tradeAlertEligible, false);

const executableCandidate = candidate();
const suppressed = detectMorningContinuationWatchlist({
  tradeDate: '2026-05-28',
  instrument: 'MES',
  window: morningWindow,
  bars5m: morningMoveBars,
  currentPrice: 7564.75,
  normalizedPlan: normalized({
    canExecute: true,
    decision: 'LONG',
    decisionStatus: TradeDecisionStatus.ApprovedTrade,
    entry: executableCandidate.entry,
    stop: executableCandidate.stop,
    setupCandidates: [executableCandidate],
    opportunitySelection: {
      bestExecutableCandidate: executableCandidate,
      bestConditionalCandidate: null,
      finalDecision: TradeDecisionStatus.ApprovedTrade,
      noTradeReason: null,
    },
  }),
  selectedCandidate: executableCandidate,
  scannerState: 'Approved',
});
assert.equal(suppressed.watchlistDetected, false);
assert.equal(suppressed.canExecute, false);
assert.equal(suppressed.tradeAlertEligible, false);
assert.ok(suppressed.missingEvidence.some((item) => item.includes('executable setup')));

const quietBars = [
  bar('2026-05-28T10:00:00-04:00', 100, 101, 99, 100),
  bar('2026-05-28T10:05:00-04:00', 100, 101, 99, 100.25),
  bar('2026-05-28T10:10:00-04:00', 100.25, 101.25, 99.75, 100.5),
  bar('2026-05-28T10:15:00-04:00', 100.5, 101.5, 100, 100.75),
];
const quiet = detectMorningContinuationWatchlist({
  tradeDate: '2026-05-28',
  instrument: 'MES',
  window: morningWindow,
  bars5m: quietBars,
  currentPrice: 100.75,
  normalizedPlan: normalized(),
});
assert.equal(quiet.watchlistDetected, false);
assert.equal(quiet.canExecute, false);
assert.equal(quiet.tradeAlertEligible, false);

console.log('Morning continuation watchlist agent verified.');
