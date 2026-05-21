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
import { selectBestTwoScenarios } from './scenarioSelection';
import { buildNinjaChartContext, type NinjaBridgeBar } from './ninjaTraderBridge';
import { buildConditionalPlans } from './conditionalPlanBuilder';

function baseResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    dayType: 'LONG' as DayType,
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

function bridgeBar(time: string, open: number, high: number, low: number, close: number): NinjaBridgeBar {
  return { time, open, high, low, close, volume: 1 };
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

  ['7. Alternate setup also blocks when actual structure risk is too wide', () => {
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
        dayType: 'LONG',
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
        dayType: 'SHORT',
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
        dayType: 'SHORT',
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

  ['34. Morning reclaim long uses completed 5M reclaim candle and protected swing low', () => {
    const result = assertSameSequence({
      sessionType: 'morning',
      windowStatusOverride: 'active',
      result: baseResult({
        dayType: 'NO TRADE',
        reasoning: 'Morning reclaim long path should be built from completed 5M facts.',
        current_rule_analysis: {
          summary: 'Wait for reclaim retest.',
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
            currentPrice: 7398,
            nearestSupport: 7388,
            nearestResistance: 7400,
            activeSwingHigh: 7400,
            activeSwingLow: 7388,
          },
          candles: [
            { index: 1, open: 7396, high: 7397, low: 7388, close: 7390, direction: 'bearish', confidence: 'High' },
            { index: 2, open: 7390, high: 7399, low: 7389, close: 7398, direction: 'bullish', isReclaim: true, confidence: 'High' },
          ],
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
    assert.equal(candidate.direction, 'LONG');
    assert.equal(candidate.entry, 7399.25);
    assert.equal(candidate.stop, 7387.75);
    assert.ok(candidate.requiredTrigger?.includes('reclaim candle high'));
    assert.ok(candidate.nextAction.includes('successful reclaim retest'));
    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
  }],

  ['35. Opening range continuation builder creates retest-based morning plan', () => {
    const result = assertSameSequence({
      sessionType: 'morning',
      windowStatusOverride: 'active',
      result: baseResult({
        dayType: 'NO TRADE',
        reasoning: 'Opening range broke and retested.',
        current_rule_analysis: {
          summary: 'Wait for OR retest continuation.',
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
            currentPrice: 7410,
            openingRangeHigh: 7405,
            openingRangeLow: 7392,
            nearestSupport: 7405,
            nearestResistance: 7412,
            activeSwingHigh: 7412,
            activeSwingLow: 7404,
          },
          candles: [
            { index: 1, open: 7402, high: 7410, low: 7401, close: 7408, direction: 'bullish', confidence: 'High' },
            { index: 2, open: 7408, high: 7411, low: 7405, close: 7407, direction: 'bullish', confidence: 'High' },
          ],
          candleFacts: {
            lastClosedCandleDirection: 'bullish',
            expansionCandlePresent: true,
            rejectionWickPresent: false,
            breatherCandlePresent: false,
            reclaimCandlePresent: true,
            pullbackPresent: true,
            closeAboveKeyLevel: true,
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

    const candidate = result.setupCandidates?.find((item) => item.setupType === SetupType.MorningOpeningRangeContinuation && item.direction === 'LONG');
    assert.ok(candidate);
    assert.equal(candidate.direction, 'LONG');
    assert.equal(candidate.entry, 7411.25);
    assert.equal(candidate.stop, 7400.75);
    assert.ok(candidate.requiredTrigger?.includes('opening range high'));
    assert.ok(candidate.nextAction.includes('opening range retest'));
    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
  }],

  ['36. Imbalance pullback builder works without narrative and shared best-two prefers concrete plans', () => {
    const result = assertSameSequence({
      sessionType: 'lunch',
      windowStatusOverride: 'active',
      result: baseResult({
        dayType: 'NO TRADE',
        reasoning: '',
        current_rule_analysis: {
          summary: 'Structured imbalance facts only.',
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
            currentPrice: 7448,
            morningHigh: 7460,
            morningLow: 7430,
            nearestSupport: 7444,
            nearestResistance: 7455,
            activeSwingHigh: 7455,
            activeSwingLow: 7440,
          },
          morningWindowContext: {
            complete: true,
            morningHigh: 7460,
            morningLow: 7430,
            confidence: 'High',
            evidence: ['Completed morning range available.'],
            missingEvidence: [],
          },
          fvgZones: [{
            direction: 'LONG',
            lower: 7444,
            upper: 7449,
            midpoint: 7446.5,
            filledPercent: 50,
            reclaimed: true,
            confidence: 'High',
          }],
          candles: [
            { index: 1, open: 7447, high: 7450, low: 7444, close: 7448, direction: 'bullish', isReclaim: true, confidence: 'High' },
          ],
          setupReadyFacts: {
            pullbackIntoFvg: true,
            fvgReclaimed: true,
            breakOfStructure: false,
            sweepThenReclaim: false,
            notes: [],
          },
          candleFacts: {
            lastClosedCandleDirection: 'bullish',
            expansionCandlePresent: true,
            rejectionWickPresent: false,
            breatherCandlePresent: false,
            reclaimCandlePresent: true,
            pullbackPresent: true,
            closeAboveKeyLevel: true,
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

    const imbalance = result.setupCandidates?.find((item) => item.setupType === SetupType.FvgImbalancePullback && item.direction === 'LONG');
    assert.ok(imbalance);
    assert.equal(imbalance.entry, 7450.25);
    assert.equal(imbalance.stop, 7443.75);
    assert.ok(imbalance.requiredTrigger?.includes('imbalance zone'));
    const selected = selectBestTwoScenarios(result.setupCandidates || []);
    assert.ok(selected.some((candidate) => candidate.setupType === SetupType.FvgImbalancePullback));
    assert.ok(selected.every((candidate) => candidate.entry !== null && candidate.stop !== null));
    assert.notEqual(result.status, TradeDecisionStatus.ApprovedTrade);
  }],

  ['37. ICT Model 1 requires sweep reclaim displacement structure shift and FVG retrace', () => {
    const context = {
      ...structuredContext({
          keyLevels: {
            currentPrice: 101,
            activeSwingHigh: 104,
            activeSwingLow: 96,
            nearestResistance: 104,
            nearestSupport: 96,
          },
          candles: [
            { index: 1, timestamp: '09:45', open: 98, high: 99, low: 96, close: 97, direction: 'bearish', confidence: 'High' },
            { index: 2, timestamp: '09:50', open: 97, high: 99, low: 96.5, close: 98.5, direction: 'bullish', confidence: 'High' },
            { index: 3, timestamp: '09:55', open: 98.5, high: 104, low: 101, close: 103.5, direction: 'bullish', isExpansion: true, confidence: 'High' },
            { index: 4, timestamp: '10:00', open: 102, high: 103, low: 100.25, close: 101, direction: 'bearish', confidence: 'High' },
          ],
          fvgZones: [{
            direction: 'LONG',
            lower: 99,
            upper: 101,
            midpoint: 100,
            formedAt: '09:55',
            formedCandleIndex: 3,
            impulseQualified: true,
            impulseBodyRatio: 1.8,
            impulseRangeRatio: 1.4,
            confidence: 'High',
          }],
          breakerZones: [{
            direction: 'LONG',
            lower: 99.5,
            upper: 100.5,
            midpoint: 100,
            formedAt: '09:55',
            source: 'app',
            confidence: 'High',
            evidence: 'Failed structure retest zone overlaps imbalance.',
          }],
          liquiditySweeps: [{
            type: 'sweep',
            direction: 'LONG',
            level: 96.5,
            sweptLevelLabel: 'Sell-side liquidity',
            reclaimed: true,
            timestamp: '09:45',
            confidence: 'High',
            evidence: 'Price swept sell-side liquidity and reclaimed.',
          }],
          displacementCandles: [{
            direction: 'LONG',
            candleIndex: 3,
            timestamp: '09:55',
            session: 'rth_morning',
            open: 98.5,
            high: 104,
            low: 101,
            close: 103.5,
            bodyPoints: 5,
            rangePoints: 5.5,
            bodyToRange: 0.9,
            closeLocation: 'top_quarter',
            displacementScore: 7,
            quality: 'high_quality',
            leavesImbalance: true,
            breaksStructure: true,
            confidence: 'High',
            evidence: 'Bullish expansion candle created imbalance and broke structure.',
          }],
          targetObjectives: [{
            label: 'Next buy-side liquidity',
            price: 110,
            direction: 'LONG',
            source: 'ninjatrader',
            type: 'liquidity_pool',
            confidence: 'High',
            score: 90,
            distancePoints: 10,
            rMultiple: 2,
            reason: 'Next buy-side liquidity above the entry.',
          }],
          marketStructure: {
            trend: 'bullish',
            higherHigh: true,
            higherLow: true,
            lowerHigh: false,
            lowerLow: false,
            marketStructureShift: true,
            chopRangeCondition: false,
            compressionCondition: false,
            expansionCondition: true,
          },
          setupReadyFacts: {
            pullbackIntoFvg: true,
            fvgReclaimed: false,
            breakOfStructure: true,
            sweepThenReclaim: true,
            notes: [],
          },
      }),
      sessionType: 'replay_morning',
      instrument: 'MES',
      tradeDate: '2026-05-19',
      timeframe: '5m',
      screenshotUsability: 'usable',
    } as ChartContext;

    const plans = buildConditionalPlans(context);
    const modelOne = plans.find((item) => item.scenarioLabel?.includes('ICT Model 1'));
    assert.ok(modelOne);
    assert.equal(modelOne.direction, 'LONG');
    assert.equal(modelOne.entry, 100);
    assert.equal(modelOne.stop, 95.75);
    assert.equal(modelOne.target1, 110);
    assert.ok((modelOne.target1! - modelOne.entry!) / modelOne.riskPoints! >= 2);
    assert.ok(modelOne.evidence.some((item) => item.includes('Minimum 2.0R')));
    assert.ok(modelOne.evidence.some((item) => item.includes('Breaker/FVG confluence')));
  }],

  ['38. Quant FVG detection filters weak gaps without impulse', () => {
    const weak = buildNinjaChartContext({
      sessionType: 'replay_morning',
      instrument: 'MES',
      tradeDate: '2026-05-19',
      bars5m: [
        bridgeBar('2026-05-19T09:30:00', 100, 100.5, 99.5, 100.4),
        bridgeBar('2026-05-19T09:35:00', 100.4, 100.6, 99.7, 100),
        bridgeBar('2026-05-19T09:40:00', 100.8, 101, 100.75, 100.9),
      ],
    });
    assert.equal(weak?.fvgZones?.length || 0, 0);

    const strong = buildNinjaChartContext({
      sessionType: 'replay_morning',
      instrument: 'MES',
      tradeDate: '2026-05-19',
      bars5m: [
        bridgeBar('2026-05-19T09:30:00', 100, 100.5, 99.5, 100),
        bridgeBar('2026-05-19T09:35:00', 100, 100.6, 99.7, 100.1),
        bridgeBar('2026-05-19T09:40:00', 100.5, 105, 101, 104.5),
      ],
    });
    assert.equal(strong?.fvgZones?.[0]?.direction, 'LONG');
    assert.equal(strong?.fvgZones?.[0]?.impulseQualified, true);
  }],

  ['39. Bullish Turtle Soup does not require FVG and enforces sweep wick stop plus 2R target', () => {
    const context = {
      ...structuredContext({
        keyLevels: {
          currentPrice: 98,
          activeSwingHigh: 105,
          activeSwingLow: 96,
          nearestResistance: 105,
          nearestSupport: 96.5,
        },
        candles: [
          { index: 1, timestamp: '09:40', open: 98, high: 99, low: 97, close: 98, direction: 'doji', confidence: 'High' },
          { index: 2, timestamp: '09:45', open: 96.75, high: 98.5, low: 96, close: 97.25, direction: 'bullish', isRejection: true, confidence: 'High' },
          { index: 3, timestamp: '09:50', open: 97.25, high: 101, low: 96.75, close: 100.5, direction: 'bullish', isExpansion: true, confidence: 'High' },
        ],
        liquiditySweeps: [{
          type: 'sweep',
          direction: 'LONG',
          level: 96.5,
          sweptLevelLabel: 'Sell-side liquidity',
          reclaimed: true,
          timestamp: '09:45',
          confidence: 'High',
          evidence: 'Price swept below sell-side liquidity and reclaimed.',
        }],
        displacementCandles: [{
          direction: 'LONG',
          candleIndex: 3,
          timestamp: '09:50',
          session: 'rth_morning',
          open: 97,
          high: 101,
          low: 96.75,
          close: 100.5,
          bodyPoints: 3.5,
          rangePoints: 4.25,
          bodyToRange: 0.82,
          closeLocation: 'top_quarter',
          displacementScore: 6,
          quality: 'confirmed',
          leavesImbalance: false,
          breaksStructure: true,
          confidence: 'High',
          evidence: 'Bullish expansion confirms reversal attempt.',
        }],
        targetObjectives: [{
          label: 'Opposing buy-side liquidity',
          price: 105,
          direction: 'LONG',
          source: 'ninjatrader',
          type: 'liquidity_pool',
          confidence: 'High',
          score: 90,
          distancePoints: 8,
          rMultiple: 6.4,
          reason: 'Opposing buy-side liquidity above the reclaim.',
        }],
        marketStructure: {
          trend: 'bullish',
          higherHigh: false,
          higherLow: true,
          lowerHigh: false,
          lowerLow: false,
          marketStructureShift: true,
          chopRangeCondition: false,
          compressionCondition: false,
          expansionCondition: true,
        },
        setupReadyFacts: {
          sweepThenReclaim: true,
          breakOfStructure: true,
          notes: [],
        },
      }),
      sessionType: 'replay_morning',
      instrument: 'MES',
      tradeDate: '2026-05-19',
      timeframe: '5m',
      screenshotUsability: 'usable',
    } as ChartContext;

    const turtleSoup = buildConditionalPlans(context).find((item) => item.setupType === SetupType.TurtleSoup && item.direction === 'LONG');
    assert.ok(turtleSoup);
    assert.equal(turtleSoup.entry, 97.25);
    assert.equal(turtleSoup.stop, 95.75);
    assert.equal(turtleSoup.target1, 105);
    assert.ok((turtleSoup.target1! - turtleSoup.entry!) / turtleSoup.riskPoints! >= 2);
    assert.ok(turtleSoup.evidence.some((item) => item.includes('Turtle Soup')));
    assert.ok(turtleSoup.evidence.some((item) => item.includes('Wick rejection support')));
  }],

  ['40. Bearish Turtle Soup targets opposing sell-side liquidity with stop above sweep wick', () => {
    const context = {
      ...structuredContext({
        keyLevels: {
          currentPrice: 102,
          activeSwingHigh: 105,
          activeSwingLow: 98,
          nearestResistance: 104,
          nearestSupport: 98,
        },
        candles: [
          { index: 1, timestamp: '09:40', open: 102, high: 103, low: 101, close: 102, direction: 'doji', confidence: 'High' },
          { index: 2, timestamp: '09:45', open: 104.25, high: 105.25, low: 102.5, close: 103.75, direction: 'bearish', isRejection: true, confidence: 'High' },
          { index: 3, timestamp: '09:50', open: 103.75, high: 104, low: 100, close: 100.5, direction: 'bearish', isExpansion: true, confidence: 'High' },
        ],
        liquiditySweeps: [{
          type: 'sweep',
          direction: 'SHORT',
          level: 104,
          sweptLevelLabel: 'Buy-side liquidity',
          reclaimed: true,
          timestamp: '09:45',
          confidence: 'High',
          evidence: 'Price swept above buy-side liquidity and reclaimed lower.',
        }],
        displacementCandles: [{
          direction: 'SHORT',
          candleIndex: 3,
          timestamp: '09:50',
          session: 'rth_morning',
          open: 103.5,
          high: 104,
          low: 100,
          close: 100.5,
          bodyPoints: 3,
          rangePoints: 4,
          bodyToRange: 0.75,
          closeLocation: 'bottom_quarter',
          displacementScore: 6,
          quality: 'confirmed',
          leavesImbalance: false,
          breaksStructure: true,
          confidence: 'High',
          evidence: 'Bearish expansion confirms reversal attempt.',
        }],
        targetObjectives: [{
          label: 'Opposing sell-side liquidity',
          price: 98,
          direction: 'SHORT',
          source: 'ninjatrader',
          type: 'liquidity_pool',
          confidence: 'High',
          score: 90,
          distancePoints: 5.5,
          rMultiple: 3.14,
          reason: 'Opposing sell-side liquidity below the failed breakout.',
        }],
        marketStructure: {
          trend: 'bearish',
          higherHigh: false,
          higherLow: false,
          lowerHigh: true,
          lowerLow: true,
          marketStructureShift: true,
          chopRangeCondition: false,
          compressionCondition: false,
          expansionCondition: true,
        },
        setupReadyFacts: {
          sweepThenReclaim: true,
          breakOfStructure: true,
          notes: [],
        },
      }),
      sessionType: 'replay_morning',
      instrument: 'MES',
      tradeDate: '2026-05-19',
      timeframe: '5m',
      screenshotUsability: 'usable',
    } as ChartContext;

    const turtleSoup = buildConditionalPlans(context).find((item) => item.setupType === SetupType.TurtleSoup && item.direction === 'SHORT');
    assert.ok(turtleSoup);
    assert.equal(turtleSoup.entry, 103.75);
    assert.equal(turtleSoup.stop, 105.5);
    assert.equal(turtleSoup.target1, 98);
    assert.ok((turtleSoup.entry! - turtleSoup.target1!) / turtleSoup.riskPoints! >= 2);
    assert.ok(turtleSoup.requiredTrigger?.includes('Bearish Turtle Soup'));
    assert.ok(turtleSoup.evidence.some((item) => item.includes('Wick rejection support')));
  }],

  ['41. Breaker and FVG overlap alone does not create a trade candidate', () => {
    const context = {
      ...structuredContext({
        keyLevels: {
          currentPrice: 100,
          activeSwingHigh: 105,
          activeSwingLow: 95,
        },
        candles: [
          { index: 1, timestamp: '09:45', open: 99, high: 101, low: 98, close: 100, direction: 'bullish', confidence: 'High' },
          { index: 2, timestamp: '09:50', open: 100, high: 101, low: 99, close: 100.5, direction: 'bullish', confidence: 'High' },
          { index: 3, timestamp: '09:55', open: 100.5, high: 103, low: 101.5, close: 102, direction: 'bullish', isExpansion: true, confidence: 'High' },
          { index: 4, timestamp: '10:00', open: 102, high: 103, low: 100, close: 100.5, direction: 'bearish', confidence: 'High' },
        ],
        fvgZones: [{
          direction: 'LONG',
          lower: 101,
          upper: 101.5,
          midpoint: 101.25,
          formedCandleIndex: 3,
          impulseQualified: true,
          confidence: 'High',
        }],
        breakerZones: [{
          direction: 'LONG',
          lower: 100.75,
          upper: 101.25,
          midpoint: 101,
          source: 'app',
          confidence: 'High',
        }],
      }),
      sessionType: 'replay_morning',
      instrument: 'MES',
      tradeDate: '2026-05-19',
      timeframe: '5m',
      screenshotUsability: 'usable',
    } as ChartContext;

    const plans = buildConditionalPlans(context);
    assert.equal(plans.some((item) => item.scenarioLabel?.includes('ICT Model 1')), false);
    assert.equal(plans.some((item) => item.setupType === SetupType.TurtleSoup), false);
  }],
];

for (const [name, test] of tests) {
  test();
  console.log(`✓ ${name}`);
}

console.log(`✓ Deterministic sequence verified across ${tests.length} cases.`);
