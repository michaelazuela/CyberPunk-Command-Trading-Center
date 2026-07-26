import assert from 'node:assert/strict';
import { NoTradeReason, SetupType, TradeDecisionStatus } from '../types';
import { runTradeDecisionPipeline } from './tradeDecisionPipeline';

const result = runTradeDecisionPipeline({
  sessionType: 'replay_morning',
  instrument: 'MES',
  result: {
    dayType: 'LONG',
    reasoning: 'Saved narrative is ignored for setup/model promotion while blank-slate mode is active.',
    confidence: 0.9,
    checks: [],
    current_rule_analysis: {
      summary: 'Ignored saved narrative.',
      setup_detected: 'Ignored saved setup text.',
      rule_category: 'blank_slate',
      entry: 7400,
      stop: 7396,
      target_1: 7406,
      target_2: 7408,
      no_trade_reason: null,
      base_confidence: 'High',
    },
  },
});

assert.equal(result.setupAssessment.setupType, SetupType.NoSetup);
assert.equal(result.finalTradePlan.setupType, SetupType.NoSetup);
assert.equal(result.finalTradePlan.status, TradeDecisionStatus.NoTrade);
assert.equal(result.finalTradePlan.noTradeReason, NoTradeReason.NoApprovedSetup);
assert.deepEqual(result.setupCandidates, []);
assert.equal(result.opportunitySelection?.bestExecutableCandidate, null);
assert.equal(result.opportunitySelection?.bestConditionalCandidate, null);

console.log('tradeDecisionPipeline blank-slate contract verified');
