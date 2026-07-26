import assert from 'node:assert/strict';
import { TradeDecisionStatus } from '../types';
import type { NormalizedTradePlan } from '../lib/tradePlan';
import { selectScannerPlan } from './scannerPlanSelectionAgent';

function normalized(overrides: Partial<NormalizedTradePlan> = {}): NormalizedTradePlan {
  return {
    decision: 'NO TRADE',
    decisionLabel: 'NO TRADE',
    executionDecision: 'NO TRADE',
    planningDecision: 'NO TRADE',
    hasConditionalPlans: false,
    decisionStatus: TradeDecisionStatus.NoTrade,
    canExecute: false,
    entry: null,
    stop: null,
    t1: null,
    t2: null,
    riskPoints: null,
    riskRewardT1: null,
    riskRewardT2: null,
    invalidation: 'No model installed.',
    finalConfidence: 'Low',
    whyThisPlan: 'Blank slate.',
    noTradeReason: null,
    source: 'app_rule_engine',
    setupCandidates: [],
    ...overrides,
  };
}

const selection = selectScannerPlan({
  normalized: normalized(),
  currentPrice: 100,
});

assert.equal(selection.candidate, null);
assert.equal(selection.state, 'NoTrade');
assert.equal(selection.stateForAlert, 'NoTrade');
assert.equal(selection.reviewStatus, null);
assert.equal(selection.stale.stale, false);
assert.match(selection.stale.reason || '', /Blank-slate mode/);
assert.ok(selection.auditWarnings.some((warning) => warning.includes('no setup')));
assert.equal(selection.visibilityMetadata?.visibilityMode, 'NO_TRADE_WITH_REASON');
assert.equal(selection.visibilityMetadata?.authority.registeredModel, false);
assert.equal(selection.visibilityMetadata?.authority.canExecute, false);

const outsideRulesSelection = selectScannerPlan({
  normalized: normalized({ decisionStatus: TradeDecisionStatus.OutsideRules }),
  currentPrice: null,
});

assert.equal(outsideRulesSelection.candidate, null);
assert.equal(outsideRulesSelection.state, 'MarketMapping');
assert.equal(outsideRulesSelection.stateForAlert, 'MarketMapping');

console.log('scannerPlanSelectionAgent blank-slate contract verified');
