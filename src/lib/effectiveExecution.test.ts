import assert from 'node:assert/strict';
import { TradeDecisionStatus } from '../types';
import { getEffectiveCanExecute, isEffectivelyExecutable } from './effectiveExecution';
import { normalizeTradePlan } from './tradePlan';

assert.equal(
  getEffectiveCanExecute({ decisionStatus: TradeDecisionStatus.ConditionalTrade, canExecute: true }),
  false,
  'ConditionalTrade with raw canExecute=true must not be effectively executable'
);

assert.equal(
  getEffectiveCanExecute({ decisionStatus: TradeDecisionStatus.ApprovedTrade, canExecute: true }),
  true,
  'ApprovedTrade with canExecute=true is effectively executable'
);

assert.equal(
  getEffectiveCanExecute({ decisionStatus: TradeDecisionStatus.ApprovedTrade, canExecute: false }),
  false,
  'ApprovedTrade still requires raw canExecute=true'
);

assert.equal(
  isEffectivelyExecutable({ status: TradeDecisionStatus.Wait, canExecute: true }),
  false,
  'Status overrides cannot make non-approved decisions executable'
);

const conditionalPlan = normalizeTradePlan({
  dayType: 'LONG',
  reasoning: 'Actual historical OHLC replay context.',
  confidence: 0.7,
  checks: [],
  current_rule_analysis: {
    summary: 'Conditional app-owned plan with levels, but no final approval.',
    setup_detected: 'HTF Draw Continuation After Raid/Reclaim',
    rule_category: 'APP_OWNED_ACTUAL_OHLC_REPLAY',
    entry: 7625.5,
    stop: 7622.5,
    target_1: null,
    target_2: null,
    trigger_state: 'PENDING_TRIGGER',
    entry_trigger: 'Defined reclaim/retest trigger required before execution.',
    no_trade_reason: null,
    base_confidence: 'Medium',
  },
}, 'MES', 'replay_lunch');

assert.notEqual(conditionalPlan.decisionStatus, TradeDecisionStatus.ApprovedTrade);
assert.equal(conditionalPlan.canExecute, false, 'normalizeTradePlan must not expose conditional levels as executable');
assert.equal(getEffectiveCanExecute(conditionalPlan), false);

console.log('Effective execution semantics verified.');
