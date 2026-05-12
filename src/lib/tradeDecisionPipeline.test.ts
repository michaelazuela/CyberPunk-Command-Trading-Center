import assert from 'node:assert/strict';
import { SETUP_REGISTRY } from '../config/setupRegistry';
import { DECISION_STEPS } from '../config/decisionSteps';
import {
  AnalysisResult,
  BiasDirection,
  DayType,
  ExecutionStatus,
  NoTradeReason,
  RiskStatus,
  SetupType,
  TradeDecisionStatus,
  TradeDecisionStep,
} from '../types';
import { runTradeDecisionPipeline, TradeDecisionPipelineInput } from './tradeDecisionPipeline';

function baseResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    dayType: 'TYPE 1 LONG' as DayType,
    reasoning: 'Bullish structure with higher low reclaim around the swing low.',
    confidence: 0.82,
    checks: [],
    levelCheck: 'Stop below active swing low.',
    structureStatus: 'Higher-low structure reclaimed the opening range.',
    current_rule_analysis: {
      summary: 'Liquidity sweep long reclaimed the opening low. Stop below active swing low.',
      setup_detected: 'Liquidity Sweep Long',
      rule_category: 'Trap Mechanics',
      entry: 7400,
      stop: 7396,
      target_1: null,
      target_2: null,
      trigger_state: 'TRIGGERED',
      entry_trigger: null,
      no_trade_reason: null,
      base_confidence: 'High',
    },
    ...overrides,
  };
}

function run(input: Partial<TradeDecisionPipelineInput> = {}) {
  return runTradeDecisionPipeline({
    result: baseResult(),
    sessionType: 'replay_morning',
    instrument: 'MES',
    ...input,
  });
}

function assertSameSequence(input: Partial<TradeDecisionPipelineInput> = {}) {
  const result = run(input);
  assert.deepEqual(result.auditTrail.map((step) => step.step), DECISION_STEPS);
  return result;
}

function stepStatus(result: ReturnType<typeof run>, step: TradeDecisionStep) {
  return result.auditTrail.find((item) => item.step === step)?.status;
}

const tests: Array<[string, () => void]> = [
  ['1. No screenshot uploaded', () => {
    const result = assertSameSequence({ result: null });
    assert.equal(result.status, TradeDecisionStatus.InvalidScreenshot);
    assert.equal(result.noTradeReason, NoTradeReason.InvalidScreenshot);
  }],

  ['2. Invalid screenshot', () => {
    const result = assertSameSequence({
      screenshotUsability: 'unusable',
      screenshotWarning: 'Screenshot is unreadable.',
    });
    assert.equal(result.status, TradeDecisionStatus.InvalidScreenshot);
    assert.equal(stepStatus(result, TradeDecisionStep.ConfirmScreenshotUsability), 'fail');
  }],

  ['3. Outside approved time window', () => {
    const result = assertSameSequence({
      sessionType: 'morning',
      windowStatusOverride: 'too_late',
    });
    assert.equal(result.status, TradeDecisionStatus.OutsideRules);
    assert.equal(result.noTradeReason, NoTradeReason.OutsideTimeWindow);
  }],

  ['4. Neutral bias / no setup', () => {
    const result = assertSameSequence({
      result: baseResult({
        dayType: 'NO TRADE',
        reasoning: 'Neutral chop with no clean directional bias.',
        current_rule_analysis: {
          summary: 'No clean structure.',
          setup_detected: 'No Setup',
          rule_category: 'None',
          entry: null,
          stop: null,
          target_1: null,
          target_2: null,
          no_trade_reason: 'No setup',
          base_confidence: 'Low',
        },
      }),
    });
    assert.equal(result.status, TradeDecisionStatus.NoTrade);
    assert.equal(result.biasAssessment.bias, BiasDirection.NoBias);
  }],

  ['5. Setup present but no entry trigger', () => {
    const result = assertSameSequence({
      result: baseResult({
        current_rule_analysis: {
          summary: 'Liquidity sweep is present, but the break trigger is not available yet.',
          setup_detected: 'Liquidity Sweep Long',
          rule_category: 'Trap Mechanics',
          entry: null,
          stop: 7396,
          target_1: null,
          target_2: null,
          no_trade_reason: null,
          base_confidence: 'Medium',
        },
      }),
    });
    assert.equal(result.status, TradeDecisionStatus.ConditionalTrade);
    assert.equal(result.noTradeReason, null);
  }],

  ['6. Stop exceeds 6 points', () => {
    const result = assertSameSequence({
      result: baseResult({
        current_rule_analysis: {
          ...baseResult().current_rule_analysis!,
          entry: 7400,
          stop: 7393.5,
        },
      }),
    });
    assert.equal(result.riskAssessment.status, RiskStatus.Warning);
    assert.equal(stepStatus(result, TradeDecisionStep.ValidateRiskLimit), 'warning');
  }],

  ['7. Type 2 setup stop exceeds 8 points', () => {
    const result = assertSameSequence({
      result: baseResult({
        current_rule_analysis: {
          ...baseResult().current_rule_analysis!,
          entry: 7400,
          stop: 7391.75,
        },
      }),
    });
    assert.equal(result.status, TradeDecisionStatus.Wait);
    assert.equal(result.noTradeReason, NoTradeReason.RiskTooWide);
  }],

  ['8. Missing invalidation', () => {
    const result = assertSameSequence({
      result: baseResult({
        current_rule_analysis: {
          ...baseResult().current_rule_analysis!,
          summary: 'Liquidity sweep long.',
        },
        levelCheck: '',
        structureStatus: '',
      }),
    });
    assert.equal(result.status, TradeDecisionStatus.ConditionalTrade);
    assert.equal(result.noTradeReason, null);
  }],

  ['9. Valid no-trade decision', () => {
    const result = assertSameSequence({
      result: baseResult({
        dayType: 'TYPE 1 LONG',
        reasoning: 'Balanced context with no approved setup active.',
        levelCheck: '',
        structureStatus: '',
        current_rule_analysis: {
          summary: 'No clean directional structure is present.',
          setup_detected: 'No Trade',
          rule_category: 'None',
          entry: null,
          stop: null,
          target_1: null,
          target_2: null,
          no_trade_reason: 'No active trigger',
          base_confidence: 'Low',
        },
      }),
    });
    assert.equal(result.status, TradeDecisionStatus.NoTrade);
    assert.equal(result.journalReady, true);
  }],

  ['10. Valid conditional trade', () => {
    const result = assertSameSequence({
      result: baseResult({
        current_rule_analysis: {
          ...baseResult().current_rule_analysis!,
          entry_trigger: 'Break above the trigger candle high.',
          trigger_state: 'PENDING_TRIGGER',
        },
      }),
    });
    assert.equal(result.status, TradeDecisionStatus.ConditionalTrade);
    assert.equal(result.finalTradePlan.entry, 7400);
  }],

  ['11. Valid approved trade', () => {
    const result = assertSameSequence();
    assert.equal(result.status, TradeDecisionStatus.ApprovedTrade);
    assert.equal(result.setupAssessment.setupType, SetupType.LiquiditySweep);
    assert.equal(result.target1, 7406);
    assert.equal(result.target2, 7408);
  }],

  ['12. Screenshot context says trade, but pipeline rejects due to risk', () => {
    const result = assertSameSequence({
      result: baseResult({
        confidence: 0.99,
        final_trade_plan: {
          decision: 'LONG',
          entry: 7400,
          stop: 7388,
          target_1: 7418,
          target_2: 7424,
          risk_reward: '2R',
          final_confidence: 'High',
          why_this_plan: 'Advisory context says this is a long trade.',
          what_would_invalidate: 'Stop below active swing low.',
        },
        current_rule_analysis: {
          ...baseResult().current_rule_analysis!,
          entry: 7400,
          stop: 7388,
        },
      }),
    });
    assert.equal(result.status, TradeDecisionStatus.Wait);
    assert.equal(result.noTradeReason, NoTradeReason.RiskTooWide);
    assert.equal(result.biasAssessment.confidence, 'High');
  }],

  ['13. Screenshot context is unclear, pipeline returns Wait or InvalidScreenshot', () => {
    const result = assertSameSequence({
      screenshotUsability: 'unusable',
      screenshotWarning: 'Screenshot context is unclear.',
    });
    assert.ok(
      result.status === TradeDecisionStatus.Wait ||
      result.status === TradeDecisionStatus.InvalidScreenshot
    );
  }],

  ['14. Pipeline carries every setup candidate into the final decision result', () => {
    const result = assertSameSequence();

    assert.equal(result.setupCandidates?.length, SETUP_REGISTRY.length);
    assert.deepEqual(
      new Set(result.setupCandidates?.map((candidate) => candidate.setupType)),
      new Set(SETUP_REGISTRY.map((entry) => entry.setupType))
    );
  }],

  ['15. Pipeline selects best executable candidate when one is available', () => {
    const result = assertSameSequence();

    assert.equal(result.status, TradeDecisionStatus.ApprovedTrade);
    assert.equal(result.opportunitySelection?.bestExecutableCandidate?.setupType, SetupType.LiquiditySweep);
    assert.equal(result.opportunitySelection?.bestExecutableCandidate?.executionStatus, ExecutionStatus.Executable);
    assert.equal(result.finalTradePlan.setupType, SetupType.LiquiditySweep);
  }],

  ['16. Pipeline shows best conditional candidate when no executable candidate exists', () => {
    const result = assertSameSequence({
      result: baseResult({
        current_rule_analysis: {
          ...baseResult().current_rule_analysis!,
          summary: 'FVG pullback into imbalance is possible but needs reclaim confirmation.',
          setup_detected: 'FVG Pullback Long',
          rule_category: 'Imbalance',
          entry: null,
          stop: 7396,
          trigger_state: 'PENDING_TRIGGER',
          entry_trigger: 'Manual confirmation required: pullback into imbalance must reclaim.',
        },
      }),
    });

    assert.equal(result.status, TradeDecisionStatus.ConditionalTrade);
    assert.equal(result.opportunitySelection?.bestExecutableCandidate, null);
    assert.ok(result.opportunitySelection?.bestConditionalCandidate);
    assert.notEqual(result.finalTradePlan.status, TradeDecisionStatus.NoTrade);
  }],

  ['17. NoTrade only appears when no executable or conditional candidate exists', () => {
    const result = assertSameSequence({
      result: baseResult({
        dayType: 'NO TRADE',
        reasoning: 'Neutral baseline with balanced chop and no clean price-action setup.',
        levelCheck: '',
        structureStatus: '',
        current_rule_analysis: {
          summary: 'Neutral baseline with no approved setup.',
          setup_detected: 'No Setup',
          rule_category: 'None',
          entry: null,
          stop: null,
          target_1: null,
          target_2: null,
          no_trade_reason: 'No active setup',
          base_confidence: 'Low',
        },
      }),
    });

    assert.equal(result.status, TradeDecisionStatus.NoTrade);
    assert.equal(result.opportunitySelection?.bestExecutableCandidate, null);
    assert.equal(result.opportunitySelection?.bestConditionalCandidate, null);
  }],

  ['18. ApprovedTrade is rejected when entry stop targets invalidation or trigger are not executable-ready', () => {
    const result = assertSameSequence({
      result: baseResult({
        current_rule_analysis: {
          ...baseResult().current_rule_analysis!,
          entry: null,
          stop: 7396,
          target_1: null,
          target_2: null,
          trigger_state: 'PENDING_TRIGGER',
          entry_trigger: null,
        },
      }),
    });

    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
    assert.equal(result.status, TradeDecisionStatus.ConditionalTrade);
    assert.equal(result.finalTradePlan.entry, null);
  }],

  ['19. High-priority RiskTooWide remains Wait or Conditional instead of No Setup', () => {
    const result = assertSameSequence({
      result: baseResult({
        current_rule_analysis: {
          ...baseResult().current_rule_analysis!,
          entry: 7400,
          stop: 7388,
        },
      }),
    });
    const liquidity = result.setupCandidates?.find((candidate) => candidate.setupType === SetupType.LiquiditySweep);

    assert.ok(liquidity);
    assert.equal(liquidity.blockReason, NoTradeReason.RiskTooWide);
    assert.ok(
      result.status === TradeDecisionStatus.Wait ||
      result.status === TradeDecisionStatus.ConditionalTrade
    );
    assert.notEqual(result.finalTradePlan.setupType, SetupType.NoSetup);
  }],

  ['20. Weak RiskTooWide setup does not become ApprovedTrade', () => {
    const result = assertSameSequence({
      result: baseResult({
        current_rule_analysis: {
          ...baseResult().current_rule_analysis!,
          summary: 'Opening gap fill long toward prior close. Stop below active swing low.',
          setup_detected: 'Opening Gap Fill Long',
          rule_category: 'Opening Range',
          entry: 7400,
          stop: 7388,
        },
      }),
    });

    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
    assert.equal(result.noTradeReason, NoTradeReason.RiskTooWide);
  }],

  ['21. Pipeline T1/T2 are calculated from R and rounded to 0.25', () => {
    const result = assertSameSequence({
      result: baseResult({
        current_rule_analysis: {
          ...baseResult().current_rule_analysis!,
          entry: 7400.1,
          stop: 7395.95,
        },
      }),
    });

    assert.equal(result.status, TradeDecisionStatus.ApprovedTrade);
    assert.equal(result.target1, 7406.25);
    assert.equal(result.target2, 7408.5);
    assert.equal((result.target1 as number) % 0.25, 0);
    assert.equal((result.target2 as number) % 0.25, 0);
  }],
];

for (const [name, test] of tests) {
  test();
  console.log(`✓ ${name}`);
}

console.log(`✓ Deterministic sequence verified across ${tests.length} cases.`);
