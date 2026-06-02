import assert from 'node:assert/strict';

const FORMAL_BACKTEST_DESIGN_BOUNDARY = {
  reportType: 'formal_backtest_design_contract',
  boundary: 'research_only_not_execution_authority',
  humanFinalDecisionRequired: true,
  requiredDefinitions: {
    entryModel: 'missing',
    exitModel: 'missing',
    stopModel: 'missing',
    targetModel: 'missing',
    fillAssumption: 'missing',
    commissionAssumption: 'missing',
    slippageAssumption: 'missing',
    positionSizing: 'missing',
    sessionFilter: 'missing',
  },
  nextValidationSteps: [
    'formal_backtest',
    'slippage_commission_modeling',
    'broker_fill_assumptions',
    'partial_fill_behavior',
    'out_of_sample_validation',
    'session_time_of_day_breakdown',
    'drawdown_review',
    'expectancy_review',
    'unresolved_trade_handling_review',
  ],
  approvalBoundary: {
    changesTradingRules: false,
    changesScannerBehavior: false,
    changesBridgeBehavior: false,
    changesLiveExecutionBehavior: false,
    createsTrade: false,
    createsEntry: false,
    createsStop: false,
    createsTargets: false,
    setsCanExecute: false,
    activatesModel: false,
  },
};

const serialized = JSON.stringify(FORMAL_BACKTEST_DESIGN_BOUNDARY);

assert.equal(FORMAL_BACKTEST_DESIGN_BOUNDARY.boundary, 'research_only_not_execution_authority');
assert.equal(FORMAL_BACKTEST_DESIGN_BOUNDARY.humanFinalDecisionRequired, true);
assert.ok(Object.values(FORMAL_BACKTEST_DESIGN_BOUNDARY.requiredDefinitions).every((status) => status === 'missing'));
assert.ok(FORMAL_BACKTEST_DESIGN_BOUNDARY.nextValidationSteps.includes('formal_backtest'));
assert.ok(FORMAL_BACKTEST_DESIGN_BOUNDARY.nextValidationSteps.includes('slippage_commission_modeling'));
assert.ok(FORMAL_BACKTEST_DESIGN_BOUNDARY.nextValidationSteps.includes('broker_fill_assumptions'));
assert.equal(FORMAL_BACKTEST_DESIGN_BOUNDARY.approvalBoundary.changesTradingRules, false);
assert.equal(FORMAL_BACKTEST_DESIGN_BOUNDARY.approvalBoundary.setsCanExecute, false);
assert.equal(FORMAL_BACKTEST_DESIGN_BOUNDARY.approvalBoundary.activatesModel, false);
assert.equal(serialized.includes('canExecute":true'), false);

console.log('Formal backtest design boundary verified.');
