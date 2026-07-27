import assert from 'node:assert/strict';
import { ExecutionStatus, SetupCandidateStatus, SetupType, TradeDecisionStatus, type SetupCandidate } from '../types';
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

function candidate(overrides: Partial<SetupCandidate> = {}): SetupCandidate {
  return {
    setupType: SetupType.RaidFailureDisplacementReversal,
    scenarioLabel: 'Raid Failure Displacement Reversal',
    direction: 'SHORT',
    detectedStatus: SetupCandidateStatus.Detected,
    confidence: 'High',
    priority: 100,
    entry: 7505.5,
    stop: 7515.5,
    target1: 7490.5,
    target2: 7485.5,
    riskPoints: 10,
    riskAdvisoryStatus: 'RISK_EXTENDED_STRUCTURAL',
    riskPolicy: 'STRUCTURAL_RISK_ACKNOWLEDGED',
    invalidation: 'Invalid above protected 5M structure stop 7515.5.',
    entryClarity: 1,
    stopClarity: 1,
    targetClarity: 1,
    proximityScore: 1,
    levelContextScore: 10,
    evidence: ['Completed 5M bearish displacement from protected structure.'],
    missingEvidence: [],
    executionStatus: ExecutionStatus.Conditional,
    blockReason: null,
    requiredTrigger: 'Completed 5M proof already present; wait for fresh pullback if extended.',
    nextAction: 'Approved model proof exists with extended structural risk. Use nearest protected 5M structure stop.',
    reducedRiskPlan: null,
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
assert.ok(selection.auditWarnings.some((warning) => warning.includes('no installed scanner candidate')));
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

const selectedCandidate = candidate();
const fiveModelSelection = selectScannerPlan({
  normalized: normalized({
    decision: 'SHORT',
    decisionLabel: 'SHORT',
    setupCandidates: [selectedCandidate],
  }),
  currentPrice: 7504,
});

assert.equal(fiveModelSelection.candidate, selectedCandidate);
assert.equal(fiveModelSelection.state, 'Conditional');
assert.equal(fiveModelSelection.stateForAlert, 'Conditional');
assert.equal(fiveModelSelection.auditWarnings.length, 0);
assert.equal(fiveModelSelection.visibilityMetadata?.visibilityMode, 'POST_CONDITIONAL');
assert.equal(fiveModelSelection.visibilityMetadata?.authority.registeredModel, true);
assert.equal(fiveModelSelection.visibilityMetadata?.authority.canExecute, false);
assert.doesNotMatch(fiveModelSelection.stale.reason || '', /Blank-slate mode/);

console.log('scannerPlanSelectionAgent installed-model selection contract verified');
