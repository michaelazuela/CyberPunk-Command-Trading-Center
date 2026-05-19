import assert from 'node:assert/strict';
import { SETUP_REGISTRY } from '../config/setupRegistry';
import { DECISION_STEPS } from '../config/decisionSteps';
import {
  AnalysisResult,
  BiasDirection,
  ChartContext,
  DayType,
  ExecutionStatus,
  NoTradeReason,
  RiskStatus,
  SetupCandidateStatus,
  SetupType,
  StructuralLevel,
  TradeDecisionStatus,
  TradeDecisionStep,
} from '../types';
import { runTradeDecisionPipeline, TradeDecisionPipelineInput } from './tradeDecisionPipeline';
import { buildChartContextConsensus } from './chartContextConsensus';
import { buildTargetObjectivePlan } from './targetObjectiveEngine';

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

function structuredContext(overrides: Partial<ChartContext> = {}): Partial<ChartContext> {
  return {
    timeframe: '5m',
    screenshotUsability: 'usable',
    keyLevels: {
      currentPrice: 7400,
      rthOpen: 7398,
      nearestSupport: 7396,
      nearestResistance: 7410,
      activeSwingHigh: 7412,
      activeSwingLow: 7396,
    },
    marketStructure: {
      trend: 'bullish',
      higherHigh: true,
      higherLow: true,
      lowerHigh: false,
      lowerLow: false,
      marketStructureShift: false,
      chopRangeCondition: false,
      compressionCondition: false,
      expansionCondition: true,
    },
    candleFacts: {
      lastClosedCandleDirection: 'bullish',
      expansionCandlePresent: true,
      rejectionWickPresent: false,
      breatherCandlePresent: false,
      reclaimCandlePresent: false,
      pullbackPresent: false,
      closeAboveKeyLevel: true,
      closeBelowKeyLevel: false,
    },
    setupEvidence: {
      liquiditySweep: {
        detected: true,
        direction: 'LONG',
        entry: 7400,
        stop: 7396,
        invalidation: 'Break below active swing low.',
        requiredTrigger: 'Break of reclaim candle high.',
        triggerState: 'TRIGGERED',
        confidence: 'High',
        evidence: ['Structured sweep/reclaim context.'],
        missingEvidence: [],
      },
    },
    screenshotQuality: 'High',
    levelReadConfidence: 'High',
    candleReadConfidence: 'High',
    structureReadConfidence: 'High',
    setupReadConfidence: 'High',
    riskReadConfidence: 'High',
    entryStopConfidence: 'High',
    proposedEntry: 7400,
    proposedStop: 7396,
    riskPoints: 4,
    riskStatus: 'WithinLimit',
    entryConfirmed: true,
    stopConfirmed: true,
    requiresManualConfirmation: false,
    extractionWarnings: {
      screenshotUnclear: false,
      priceLabelsUnreadable: false,
      timeframeUnverified: false,
      levelsUnclear: false,
      manualEntryStopRequired: false,
      messages: [],
    },
    ...overrides,
  };
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

  ['6. Wider structure stop is blocked by actual risk', () => {
    const result = assertSameSequence({
      result: baseResult({
        current_rule_analysis: {
          ...baseResult().current_rule_analysis!,
          entry: 7400,
          stop: 7393.5,
        },
      }),
    });
    assert.equal(result.riskAssessment.status, RiskStatus.Blocked);
    assert.equal(result.riskAssessment.riskPoints, 6.5);
    assert.equal(stepStatus(result, TradeDecisionStep.ValidateRiskLimit), 'warning');
  }],

  ['7. Type 2 setup also blocks when actual structure risk is too wide', () => {
    const result = assertSameSequence({
      result: baseResult({
        current_rule_analysis: {
          ...baseResult().current_rule_analysis!,
          entry: 7400,
          stop: 7391.75,
        },
      }),
    });
    assert.equal(result.noTradeReason, NoTradeReason.RiskTooWide);
    assert.equal(result.riskAssessment.riskPoints, 8.25);
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
    assert.equal(result.riskAssessment.riskPoints, 4);
    assert.equal(result.target1, 7406);
    assert.equal(result.target2, 7408);
  }],

  ['12. Screenshot context trade is rejected when actual structure risk is too wide', () => {
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
    assert.equal(result.noTradeReason, NoTradeReason.RiskTooWide);
    assert.equal(result.riskAssessment.riskPoints, 12);
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

  ['19. High-priority wide structure stop remains visible but blocked', () => {
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
    assert.equal(liquidity.riskPoints, 12);
    assert.notEqual(result.finalTradePlan.setupType, SetupType.NoSetup);
  }],

  ['20. Weak setup with wide structure risk does not approve', () => {
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
    assert.equal(result.riskAssessment.riskPoints, 12);
    assert.equal(result.noTradeReason, NoTradeReason.RiskTooWide);
  }],

  ['21. Pipeline T1/T2 are calculated from R and rounded to 0.25', () => {
    const result = assertSameSequence({
      result: baseResult({
        current_rule_analysis: {
          ...baseResult().current_rule_analysis!,
          entry: 7400.25,
          stop: 7395.25,
        },
      }),
    });

    assert.equal(result.status, TradeDecisionStatus.ApprovedTrade);
    assert.equal(result.riskAssessment.riskPoints, 5);
    assert.equal(result.target1, 7407.75);
    assert.equal(result.target2, 7410.25);
    assert.equal((result.target1 as number) % 0.25, 0);
    assert.equal((result.target2 as number) % 0.25, 0);
  }],

  ['22. Low screenshot quality blocks an otherwise executable structured trade from approval', () => {
    const result = assertSameSequence({
      result: baseResult({
        reasoning: 'Narrative should not override low screenshot quality.',
        structuredChartContext: structuredContext({
          screenshotQuality: 'Low',
          extractionWarnings: {
            screenshotUnclear: false,
            priceLabelsUnreadable: false,
            timeframeUnverified: false,
            levelsUnclear: false,
            manualEntryStopRequired: false,
            messages: ['Screenshot quality is low.'],
          },
        }),
      }),
    });

    assert.ok(
      result.status === TradeDecisionStatus.Wait ||
      result.status === TradeDecisionStatus.ConditionalTrade
    );
    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
    assert.equal(stepStatus(result, TradeDecisionStep.ConfirmScreenshotUsability), 'warning');
  }],

  ['23. Unreadable structured screenshot becomes InvalidScreenshot', () => {
    const result = assertSameSequence({
      result: baseResult({
        structuredChartContext: structuredContext({
          screenshotQuality: 'Unreadable',
          extractionWarnings: {
            screenshotUnclear: true,
            priceLabelsUnreadable: true,
            timeframeUnverified: true,
            levelsUnclear: true,
            manualEntryStopRequired: true,
            messages: ['Screenshot is unreadable.'],
          },
        }),
      }),
    });

    assert.equal(result.status, TradeDecisionStatus.InvalidScreenshot);
    assert.equal(result.noTradeReason, NoTradeReason.InvalidScreenshot);
  }],

  ['24. Structured low level confidence prevents T1/T2 calculation until levels are confirmed', () => {
    const result = assertSameSequence({
      result: baseResult({
        structuredChartContext: structuredContext({
          levelReadConfidence: 'Low',
          extractionWarnings: {
            screenshotUnclear: false,
            priceLabelsUnreadable: true,
            timeframeUnverified: false,
            levelsUnclear: true,
            manualEntryStopRequired: true,
            messages: ['Exact entry and stop require manual confirmation.'],
          },
        }),
      }),
    });

    assert.ok(
      result.status === TradeDecisionStatus.ConditionalTrade || result.status === TradeDecisionStatus.Wait
    );
    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
  }],

  ['25. Structured low entry/stop confidence prevents executable prices and T1/T2 calculation', () => {
    const result = assertSameSequence({
      result: baseResult({
        structuredChartContext: structuredContext({
          entryStopConfidence: 'Low',
          extractionWarnings: {
            screenshotUnclear: false,
            priceLabelsUnreadable: false,
            timeframeUnverified: false,
            levelsUnclear: false,
            manualEntryStopRequired: true,
            messages: ['Entry/stop confidence is low. Manual confirmation required.'],
          },
        }),
      }),
    });

    assert.ok(
      result.status === TradeDecisionStatus.ConditionalTrade || result.status === TradeDecisionStatus.Wait
    );
    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
  }],

  ['26. Narrative says trade, but structured facts reject it in the trade decision pipeline', () => {
    const result = assertSameSequence({
      result: baseResult({
        reasoning: 'Narrative says liquidity sweep long trade is confirmed and should execute.',
        current_rule_analysis: {
          ...baseResult().current_rule_analysis!,
          summary: 'Narrative says liquidity sweep long trade is confirmed and should execute.',
          entry: 7400,
          stop: 7396,
          trigger_state: 'TRIGGERED',
        },
        structuredChartContext: structuredContext({
          setupEvidence: {},
          fvgZones: [],
          liquidityEvents: [],
          candleFacts: {
            lastClosedCandleDirection: 'unknown',
            expansionCandlePresent: false,
            rejectionWickPresent: false,
            breatherCandlePresent: false,
            reclaimCandlePresent: false,
            pullbackPresent: false,
            closeAboveKeyLevel: false,
            closeBelowKeyLevel: false,
          },
          marketStructure: {
            trend: 'unknown',
            higherHigh: false,
            higherLow: false,
            lowerHigh: false,
            lowerLow: false,
            marketStructureShift: false,
            chopRangeCondition: false,
            compressionCondition: false,
            expansionCondition: false,
          },
        }),
      }),
    });

    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
    assert.ok(
      result.status === TradeDecisionStatus.Wait ||
      result.status === TradeDecisionStatus.ConditionalTrade ||
      result.status === TradeDecisionStatus.NoTrade
    );
    assert.equal(result.opportunitySelection?.bestExecutableCandidate, null);
  }],

  ['27. Structured unconfirmed entry/stop prevents approval and T1/T2 calculation', () => {
    const result = assertSameSequence({
      result: baseResult({
        structuredChartContext: structuredContext({
          entryConfirmed: false,
          stopConfirmed: false,
          requiresManualConfirmation: true,
          riskReadConfidence: 'Low',
          extractionWarnings: {
            screenshotUnclear: false,
            priceLabelsUnreadable: false,
            timeframeUnverified: false,
            levelsUnclear: true,
            manualEntryStopRequired: true,
            messages: ['Entry and stop are not confirmed.'],
          },
        }),
      }),
    });

    assert.ok(
      result.status === TradeDecisionStatus.ConditionalTrade || result.status === TradeDecisionStatus.Wait
    );
    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
  }],

  ['28. Morning failed-high builder creates a visible conditional short with projected targets', () => {
    const result = assertSameSequence({
      sessionType: 'morning',
      windowStatusOverride: 'active',
      result: baseResult({
        dayType: 'NO TRADE',
        reasoning: 'Price rejected a key high and is waiting for a failed-high breakdown trigger.',
        current_rule_analysis: {
          summary: 'No executable trade yet.',
          setup_detected: 'No Setup',
          rule_category: 'None',
          entry: null,
          stop: null,
          target_1: null,
          target_2: null,
          no_trade_reason: 'Waiting for trigger',
          base_confidence: 'Medium',
        },
        structuredChartContext: structuredContext({
          keyLevels: {
            currentPrice: 7494.5,
            nearestSupport: 7488,
            nearestResistance: 7497.25,
            activeSwingHigh: 7497.25,
            activeSwingLow: 7488,
          },
          candleFacts: {
            lastClosedCandleDirection: 'bearish',
            expansionCandlePresent: false,
            rejectionWickPresent: true,
            breatherCandlePresent: false,
            reclaimCandlePresent: false,
            pullbackPresent: true,
            closeAboveKeyLevel: false,
            closeBelowKeyLevel: false,
          },
          setupEvidence: {},
          proposedEntry: null,
          proposedStop: null,
          entryConfirmed: false,
          stopConfirmed: false,
          requiresManualConfirmation: true,
        }),
      }),
    });

    const candidate = result.setupCandidates?.find((item) => item.setupType === SetupType.MorningFailedHighLiquidityRejection);
    assert.ok(candidate);
    assert.equal(candidate.executionStatus, ExecutionStatus.Conditional);
    assert.equal(candidate.direction, 'SHORT');
    assert.equal(candidate.entry, 7487.75);
    assert.equal(candidate.stop, 7497.5);
    assert.equal(candidate.target1, 7473.25);
    assert.equal(candidate.target2, 7468.25);
    assert.ok(candidate.missingLevels?.some((level) => level.key === 'triggerCandleLow' && level.requiredFor === 'trigger'));
    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
  }],

  ['29. Morning reclaim builder creates a visible conditional long with projected targets', () => {
    const result = assertSameSequence({
      sessionType: 'morning',
      windowStatusOverride: 'active',
      result: baseResult({
        structuredChartContext: structuredContext({
          keyLevels: {
            currentPrice: 7494.5,
            nearestSupport: 7494.25,
            nearestResistance: 7500,
            activeSwingHigh: 7500,
            activeSwingLow: 7494.25,
            nyPremarketHigh: 7512,
          },
          candleFacts: {
            lastClosedCandleDirection: 'bullish',
            expansionCandlePresent: false,
            rejectionWickPresent: false,
            breatherCandlePresent: true,
            reclaimCandlePresent: true,
            pullbackPresent: true,
            closeAboveKeyLevel: false,
            closeBelowKeyLevel: false,
          },
          setupEvidence: {},
          proposedEntry: null,
          proposedStop: null,
          entryConfirmed: false,
          stopConfirmed: false,
          requiresManualConfirmation: true,
        }),
      }),
    });

    const candidate = result.setupCandidates?.find((item) => item.setupType === SetupType.MorningReclaimLong);
    assert.ok(candidate);
    assert.equal(candidate.executionStatus, ExecutionStatus.Conditional);
    assert.equal(candidate.direction, 'LONG');
    assert.equal(candidate.scenarioLabel, 'Reclaim continuation toward NY Premarket High');
    assert.equal(candidate.entry, 7500.25);
    assert.equal(candidate.stop, 7494);
    assert.equal(candidate.target1, 7509.75);
    assert.equal(candidate.target2, 7512.75);
    assert.ok(candidate.requiredTrigger?.includes('5M close above reclaim level'));
    assert.ok(candidate.invalidation?.includes('reclaim level fails'));
    assert.ok(candidate.missingLevels?.some((level) => level.key === 'triggerCandleHigh' && level.requiredFor === 'trigger'));
    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
  }],

  ['30. Morning reclaim builder keeps long path visible from short-biased failed-high extraction', () => {
    const result = assertSameSequence({
      sessionType: 'morning',
      windowStatusOverride: 'active',
      result: baseResult({
        dayType: 'TYPE 1 SHORT',
        reasoning: 'Price swept pre-market liquidity and rejected, but remains trapped below the 7500 round-number reclaim zone.',
        structuredChartContext: structuredContext({
          keyLevels: {
            currentPrice: 7494.5,
            nearestSupport: 7487,
            nearestResistance: 7497,
            activeSwingHigh: 7497,
            activeSwingLow: 7487,
          },
          candleFacts: {
            lastClosedCandleDirection: 'bearish',
            expansionCandlePresent: false,
            rejectionWickPresent: true,
            breatherCandlePresent: true,
            reclaimCandlePresent: false,
            pullbackPresent: true,
            closeAboveKeyLevel: false,
            closeBelowKeyLevel: false,
          },
          setupEvidence: {},
          proposedEntry: null,
          proposedStop: null,
          entryConfirmed: false,
          stopConfirmed: false,
          requiresManualConfirmation: true,
        }),
      }),
    });

    const longCandidate = result.setupCandidates?.find((item) => item.setupType === SetupType.MorningReclaimLong);
    assert.ok(longCandidate);
    assert.equal(longCandidate.executionStatus, ExecutionStatus.Conditional);
    assert.equal(longCandidate.direction, 'LONG');
    assert.equal(longCandidate.entry, 7500.25);
    assert.equal(longCandidate.stop, 7494);
    assert.equal(longCandidate.target1, 7509.75);
    assert.equal(longCandidate.target2, 7512.75);
    assert.ok(longCandidate.requiredTrigger?.includes('7500'));
    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
  }],

  ['30b. No clear bias keeps two-sided morning conditional paths visible as Wait', () => {
    const result = assertSameSequence({
      sessionType: 'morning',
      windowStatusOverride: 'active',
      result: baseResult({
        dayType: 'NO TRADE',
        reasoning: 'Direction is unresolved between reclaim resistance and breakdown support.',
        current_rule_analysis: {
          summary: 'Wait for either reclaim or breakdown trigger.',
          setup_detected: 'No Setup',
          rule_category: 'None',
          entry: null,
          stop: null,
          target_1: null,
          target_2: null,
          no_trade_reason: 'No clear bias',
          base_confidence: 'Medium',
        },
        structuredChartContext: structuredContext({
          keyLevels: {
            currentPrice: 7438,
            nearestSupport: 7432,
            nearestResistance: 7442,
            activeSwingHigh: 7442,
            activeSwingLow: 7432,
            triggerCandleHigh: 7442,
            triggerCandleLow: 7432,
          },
          candleFacts: {
            lastClosedCandleDirection: 'bullish',
            expansionCandlePresent: false,
            rejectionWickPresent: true,
            breatherCandlePresent: true,
            reclaimCandlePresent: false,
            pullbackPresent: true,
            closeAboveKeyLevel: false,
            closeBelowKeyLevel: false,
          },
          setupEvidence: {},
          proposedEntry: null,
          proposedStop: null,
          entryConfirmed: false,
          stopConfirmed: false,
          requiresManualConfirmation: true,
        }),
      }),
    });

    const longCandidate = result.setupCandidates?.find((item) => item.setupType === SetupType.MorningReclaimLong);
    const shortCandidate = result.setupCandidates?.find((item) => item.setupType === SetupType.MorningFailedHighLiquidityRejection);

    assert.equal(result.status, TradeDecisionStatus.Wait);
    assert.equal(stepStatus(result, TradeDecisionStep.DetermineBias), 'warning');
    assert.ok(longCandidate);
    assert.ok(shortCandidate);
    assert.equal(longCandidate.direction, 'LONG');
    assert.equal(shortCandidate.direction, 'SHORT');
    assert.notEqual(result.status, TradeDecisionStatus.NoTrade);
    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
  }],

  ['30c. Lunch failed-low builder labels reclaim continuation toward NY Premarket High', () => {
    const result = assertSameSequence({
      sessionType: 'lunch',
      windowStatusOverride: 'active',
      result: baseResult({
        dayType: 'NO TRADE',
        reasoning: 'Lunch is reviewing completed Morning range for failed-low reclaim.',
        current_rule_analysis: {
          summary: 'Wait for failed-low reclaim confirmation.',
          setup_detected: 'No Setup',
          rule_category: 'None',
          entry: null,
          stop: null,
          target_1: null,
          target_2: null,
          no_trade_reason: 'Waiting for trigger',
          base_confidence: 'Medium',
        },
        structuredChartContext: structuredContext({
          keyLevels: {
            currentPrice: 7440,
            morningLow: 7432,
            morningLowSweep: 7428,
            nearestSupport: 7432,
            nearestResistance: 7446,
            activeSwingHigh: 7446,
            activeSwingLow: 7428,
            nyPremarketHigh: 7460,
          },
          morningWindowContext: {
            complete: true,
            morningHigh: 7468,
            morningLow: 7432,
            morningLowSwept: true,
            failedHoldBelowMorningLow: false,
            openingDriveDirection: 'bearish',
            morningTrend: 'failed_continuation',
            confidence: 'High',
            evidence: ['Completed Morning low was swept during Lunch review.'],
            missingEvidence: [],
          },
          candleFacts: {
            lastClosedCandleDirection: 'bullish',
            expansionCandlePresent: false,
            rejectionWickPresent: true,
            breatherCandlePresent: true,
            reclaimCandlePresent: true,
            pullbackPresent: true,
            closeAboveKeyLevel: false,
            closeBelowKeyLevel: false,
          },
          setupEvidence: {},
          proposedEntry: null,
          proposedStop: null,
          entryConfirmed: false,
          stopConfirmed: false,
          requiresManualConfirmation: true,
        }),
      }),
    });

    const candidate = result.setupCandidates?.find((item) => item.setupType === SetupType.LunchFailedLowReversal);
    assert.ok(candidate);
    assert.equal(candidate.executionStatus, ExecutionStatus.Conditional);
    assert.equal(candidate.direction, 'LONG');
    assert.equal(candidate.scenarioLabel, 'Failed low reclaim toward NY Premarket High');
    assert.ok(candidate.requiredTrigger?.includes('5M close back above reclaim level'));
    assert.ok(candidate.invalidation?.includes('reclaim level fails'));
    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
  }],

  ['30d. Lunch failed-high builder labels reversal toward NY Premarket Low', () => {
    const result = assertSameSequence({
      sessionType: 'lunch',
      windowStatusOverride: 'active',
      result: baseResult({
        dayType: 'NO TRADE',
        reasoning: 'Lunch is reviewing completed Morning high for failed-high reversal.',
        current_rule_analysis: {
          summary: 'Wait for failed-high reversal confirmation.',
          setup_detected: 'No Setup',
          rule_category: 'None',
          entry: null,
          stop: null,
          target_1: null,
          target_2: null,
          no_trade_reason: 'Waiting for trigger',
          base_confidence: 'Medium',
        },
        structuredChartContext: structuredContext({
          keyLevels: {
            currentPrice: 7460,
            morningHigh: 7468,
            morningHighSweep: 7472,
            nearestSupport: 7454,
            nearestResistance: 7468,
            activeSwingHigh: 7472,
            activeSwingLow: 7454,
            nyPremarketLow: 7440,
          },
          morningWindowContext: {
            complete: true,
            morningHigh: 7468,
            morningLow: 7432,
            morningHighSwept: true,
            failedHoldAboveMorningHigh: false,
            openingDriveDirection: 'bullish',
            morningTrend: 'bullish_extension',
            confidence: 'High',
            evidence: ['Completed Morning high was swept during Lunch review.'],
            missingEvidence: [],
          },
          candleFacts: {
            lastClosedCandleDirection: 'bearish',
            expansionCandlePresent: false,
            rejectionWickPresent: true,
            breatherCandlePresent: true,
            reclaimCandlePresent: false,
            pullbackPresent: true,
            closeAboveKeyLevel: false,
            closeBelowKeyLevel: false,
          },
          setupEvidence: {},
          proposedEntry: null,
          proposedStop: null,
          entryConfirmed: false,
          stopConfirmed: false,
          requiresManualConfirmation: true,
        }),
      }),
    });

    const candidate = result.setupCandidates?.find((item) => item.setupType === SetupType.LunchFailedHighReversal);
    assert.ok(candidate);
    assert.equal(candidate.executionStatus, ExecutionStatus.Conditional);
    assert.equal(candidate.direction, 'SHORT');
    assert.equal(candidate.scenarioLabel, 'Failed high reversal toward NY Premarket Low');
    assert.ok(candidate.requiredTrigger?.includes('5M close back below morning high'));
    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
  }],

  ['31. Level sanity rejects stale execution levels before conditional plan math', () => {
    const result = assertSameSequence({
      sessionType: 'morning',
      windowStatusOverride: 'active',
      result: baseResult({
        dayType: 'TYPE 1 SHORT',
        reasoning: 'Extractor proposed stale levels, but current 5M price is far below them.',
        structuredChartContext: structuredContext({
          keyLevels: {
            currentPrice: 7438,
            nearestSupport: 7419.75,
            nearestResistance: 7451,
            activeSwingHigh: 7451,
            activeSwingLow: 7419.75,
          },
          candles: [{
            index: 8,
            timestamp: '10:10',
            open: 7435,
            high: 7442,
            low: 7432,
            close: 7438,
            direction: 'bullish',
            confidence: 'High',
          }],
          candleFacts: {
            lastClosedCandleDirection: 'bullish',
            expansionCandlePresent: false,
            rejectionWickPresent: true,
            breatherCandlePresent: true,
            reclaimCandlePresent: false,
            pullbackPresent: true,
            closeAboveKeyLevel: false,
            closeBelowKeyLevel: false,
          },
          setupEvidence: {
            morningReclaimLong: {
              detected: false,
              possible: true,
              direction: 'LONG',
              entry: 7451.25,
              stop: 7437.5,
              invalidation: 'Break below pullback low.',
              requiredTrigger: 'Reclaim above stale level.',
              triggerState: 'PENDING_TRIGGER',
              confidence: 'High',
              evidence: ['Stale extracted long reclaim level.'],
              missingEvidence: [],
            },
          },
          proposedEntry: 7451.25,
          proposedStop: 7437.5,
          entryConfirmed: true,
          stopConfirmed: true,
          requiresManualConfirmation: false,
        }),
      }),
    });

    const staleEntries = (result.setupCandidates || [])
      .filter((candidate) => candidate.entry !== null && candidate.entry > 7446);
    assert.equal(staleEntries.length, 0);
    const longCandidate = result.setupCandidates?.find((item) => item.setupType === SetupType.MorningReclaimLong);
    assert.ok(longCandidate);
    assert.equal(longCandidate.direction, 'LONG');
    assert.ok(longCandidate.entry === null || longCandidate.entry <= 7446);
    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
  }],

  ['32. OpenAI consensus forces manual confirmation on key level disagreement', () => {
    const primary = structuredContext({
      keyLevels: {
        currentPrice: 7500,
        nearestSupport: 7494,
        nearestResistance: 7504,
        activeSwingHigh: 7504,
        activeSwingLow: 7494,
      },
      entryStopConfidence: 'High',
      requiresManualConfirmation: false,
    });
    const validator = structuredContext({
      keyLevels: {
        currentPrice: 7494,
        nearestSupport: 7488,
        nearestResistance: 7498,
        activeSwingHigh: 7498,
        activeSwingLow: 7488,
      },
      entryStopConfidence: 'High',
      requiresManualConfirmation: false,
    });

    const consensus = buildChartContextConsensus(primary, validator, {
      agreement: 'major_disagreement',
      disagreements: ['OpenAI rejected the primary resistance read.'],
      warnings: [],
    });

    assert.equal(consensus.agreement, 'major_disagreement');
    assert.equal(consensus.context?.requiresManualConfirmation, true);
    assert.equal(consensus.context?.entryStopConfidence, 'Low');
    assert.ok(consensus.context?.extractionWarnings?.manualEntryStopRequired);
  }],

  ['33. Target engine treats imbalances as obstacles, not liquidity', () => {
    const levels: StructuralLevel[] = [
      {
        label: 'London Bearish Displacement Imbalance Top',
        price: 7446.5,
        type: 'imbalance_zone',
        source: 'london',
        directionRelevance: 'LONG',
        confidence: 'High',
        strengthScore: 95,
      },
      {
        label: 'London Session High',
        price: 7459,
        type: 'high',
        source: 'london',
        directionRelevance: 'LONG',
        confidence: 'High',
        strengthScore: 80,
      },
      {
        label: 'Equal High Liquidity Pool',
        price: 7462,
        type: 'liquidity_pool',
        source: 'ninjatrader',
        directionRelevance: 'LONG',
        confidence: 'Medium',
        strengthScore: 70,
      },
    ];

    const plan = buildTargetObjectivePlan({
      setupType: SetupType.MorningReclaimLong,
      direction: 'LONG',
      detectedStatus: SetupCandidateStatus.Conditional,
      confidence: 'High',
      priority: 90,
      evidence: [],
      missingEvidence: [],
      executionStatus: ExecutionStatus.Conditional,
      blockReason: null,
      requiredTrigger: '5M reclaim holds.',
      nextAction: 'Wait for reclaim.',
      reducedRiskPlan: null,
      entry: 7445.25,
      stop: 7440.25,
      target1: 7452.75,
      target2: 7455.25,
      invalidation: 'Reclaim fails.',
      riskPoints: 5,
    }, levels);

    assert.ok(plan);
    assert.equal(plan.obstacleTarget1?.label, 'London Bearish Displacement Imbalance Top');
    assert.equal(plan.liquidityTarget1?.label, 'London Session High');
    assert.notEqual(plan.nearestLiquidityTarget?.label, 'London Bearish Displacement Imbalance Top');
    assert.ok(plan.targetManagementInstruction?.includes('imbalance') || plan.notes.join(' ').includes('Imbalance'));
  }],
];

for (const [name, test] of tests) {
  test();
  console.log(`✓ ${name}`);
}

console.log(`✓ Deterministic sequence verified across ${tests.length} cases.`);
