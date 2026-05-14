import {
  ChartContext,
  ExecutionStatus,
  NoTradeReason,
  MissingLevelRequirement,
  SetupCandidate,
  SetupCandidateStatus,
  SetupType,
} from '../types';
import { TRADE_RULES } from '../config/tradeRules';

type Direction = SetupCandidate['direction'];

function isPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function roundToTick(price: number): number {
  return Math.round(price / TRADE_RULES.targetModel.tickSize) * TRADE_RULES.targetModel.tickSize;
}

function riskPoints(entry: number | null, stop: number | null): number | null {
  if (!isPrice(entry) || !isPrice(stop)) return null;
  return roundToTick(Math.abs(entry - stop));
}

function targets(direction: Direction, entry: number | null, stop: number | null) {
  const risk = riskPoints(entry, stop);
  if ((direction !== 'LONG' && direction !== 'SHORT') || risk === null || !isPrice(entry)) {
    return { target1: null, target2: null };
  }
  const sign = direction === 'LONG' ? 1 : -1;
  return {
    target1: roundToTick(entry + sign * risk * TRADE_RULES.targetModel.t1R),
    target2: roundToTick(entry + sign * risk * TRADE_RULES.targetModel.t2R),
  };
}

function firstPrice(...values: Array<unknown>): number | null {
  for (const value of values) {
    if (isPrice(value)) return value;
  }
  return null;
}

function pricesFromExtractedLevels(chartContext: ChartContext, role: 'support' | 'resistance'): number[] {
  return (chartContext.extractedLevels || [])
    .filter((level) => level.role === role && isPrice(level.price) && (level.confidence === 'High' || level.confidence === 'Medium'))
    .map((level) => level.price as number);
}

function nearestBelow(price: number | null | undefined, levels: number[]): number | null {
  if (!isPrice(price)) return null;
  return levels.filter((level) => level < price).sort((a, b) => b - a)[0] || null;
}

function nearestAbove(price: number | null | undefined, levels: number[]): number | null {
  if (!isPrice(price)) return null;
  return levels.filter((level) => level > price).sort((a, b) => a - b)[0] || null;
}

function confidenceIsReadable(value: unknown): boolean {
  return value === 'High' || value === 'Medium';
}

function missingLevel(
  key: MissingLevelRequirement['key'],
  label: string,
  reason: string,
  requiredFor: MissingLevelRequirement['requiredFor'],
  source: MissingLevelRequirement['source'] = '5m_execution'
): MissingLevelRequirement {
  return { key, label, reason, requiredFor, source };
}

function executionFor(entry: number | null, stop: number | null, hasTrigger: boolean, hasInvalidation: boolean) {
  const risk = riskPoints(entry, stop);
  if (risk !== null && risk > TRADE_RULES.maxRiskPoints) {
    return { executionStatus: ExecutionStatus.Conditional, blockReason: NoTradeReason.RiskTooWide };
  }
  if (!isPrice(entry)) return { executionStatus: ExecutionStatus.Conditional, blockReason: NoTradeReason.EntryTriggerPending };
  if (!isPrice(stop) || risk === null || !hasInvalidation) {
    return { executionStatus: ExecutionStatus.Conditional, blockReason: NoTradeReason.InvalidStopLocation };
  }
  if (!hasTrigger) return { executionStatus: ExecutionStatus.Conditional, blockReason: NoTradeReason.EntryTriggerPending };
  return { executionStatus: ExecutionStatus.Executable, blockReason: null };
}

function makeCandidate(input: {
  setupType: SetupType;
  direction: Direction;
  entry: number | null;
  stop: number | null;
  priority: number;
  confidence?: SetupCandidate['confidence'];
  evidence: string[];
  missingEvidence?: string[];
  missingLevels?: MissingLevelRequirement[];
  requiredTrigger: string;
  nextAction: string;
  invalidation: string | null;
  hasTrigger?: boolean;
}): SetupCandidate {
  const risk = riskPoints(input.entry, input.stop);
  const computedTargets = targets(input.direction, input.entry, input.stop);
  const execution = executionFor(input.entry, input.stop, Boolean(input.hasTrigger), Boolean(input.invalidation));

  return {
    setupType: input.setupType,
    direction: input.direction,
    detectedStatus: SetupCandidateStatus.Conditional,
    confidence: input.confidence || 'Medium',
    priority: input.priority,
    entry: input.entry,
    stop: input.stop,
    target1: computedTargets.target1,
    target2: computedTargets.target2,
    riskPoints: risk,
    invalidation: input.invalidation,
    entryClarity: isPrice(input.entry) ? 0.8 : 0.35,
    stopClarity: isPrice(input.stop) ? 0.8 : 0.35,
    targetClarity: computedTargets.target1 !== null && computedTargets.target2 !== null ? 0.8 : 0,
    proximityScore: 0.7,
    evidence: input.evidence,
    missingEvidence: input.missingEvidence || [],
    missingLevels: input.missingLevels || [],
    executionStatus: execution.executionStatus,
    blockReason: execution.blockReason,
    requiredTrigger: input.requiredTrigger,
    nextAction: input.nextAction,
    reducedRiskPlan: execution.blockReason === NoTradeReason.RiskTooWide
      ? {
          direction: input.direction,
          entry: null,
          stop: null,
          target1: null,
          target2: null,
          requiredTrigger: input.requiredTrigger,
          invalidation: input.invalidation,
          reasoning: 'Original conditional plan has too much entry-to-stop risk. Wait for a tighter pullback, reclaim, or failed retest.',
        }
      : null,
  };
}

function buildMorningPlans(chartContext: ChartContext): SetupCandidate[] {
  const levels = chartContext.keyLevels;
  const current = levels.currentPrice;
  const supportLevels = [
    levels.nearestSupport,
    levels.activeSwingLow,
    levels.triggerCandleLow,
    levels.openingRangeLow,
    ...pricesFromExtractedLevels(chartContext, 'support'),
  ].filter(isPrice);
  const resistanceLevels = [
    levels.nearestResistance,
    levels.activeSwingHigh,
    levels.triggerCandleHigh,
    levels.openingRangeHigh,
    ...pricesFromExtractedLevels(chartContext, 'resistance'),
  ].filter(isPrice);

  const resistance = firstPrice(levels.nearestResistance, levels.activeSwingHigh, nearestAbove(current, resistanceLevels), resistanceLevels[0]);
  const support = firstPrice(levels.nearestSupport, levels.activeSwingLow, nearestBelow(current, supportLevels), supportLevels[0]);
  const rejectionEvidence = Boolean(
    chartContext.candleFacts?.rejectionWickPresent ||
    chartContext.liquidityEvents?.some((event) => event.type === 'sweep' && confidenceIsReadable(event.confidence)) ||
    chartContext.setupEvidence?.liquiditySweep?.possible ||
    chartContext.setupEvidence?.liquiditySweep?.detected
  );
  const reclaimEvidence = Boolean(
    chartContext.candleFacts?.reclaimCandlePresent ||
    chartContext.candleFacts?.closeAboveKeyLevel ||
    chartContext.setupEvidence?.momentumPullbackBreatherReclaim?.possible ||
    chartContext.setupEvidence?.momentumPullback?.possible
  );

  const plans: SetupCandidate[] = [];

  if (rejectionEvidence || resistance || support) {
    const entry = support ? roundToTick(support - TRADE_RULES.targetModel.tickSize) : null;
    const stop = resistance ? roundToTick(resistance + TRADE_RULES.targetModel.tickSize) : null;
    plans.push(makeCandidate({
      setupType: SetupType.MorningFailedHighLiquidityRejection,
      direction: 'SHORT',
      entry,
      stop,
      priority: 89,
      confidence: rejectionEvidence ? 'Medium' : 'Low',
      evidence: [
        'Morning conditional builder reviewed failed-high / liquidity-rejection path.',
        resistance ? `Failed high / resistance reference: ${resistance}.` : 'Failed high / resistance reference not confirmed.',
        support ? `Breakdown trigger reference: ${support}.` : 'Breakdown trigger reference not confirmed.',
      ],
      missingEvidence: [
        !support ? 'Support/reclaim breakdown level is missing.' : '',
        !resistance ? 'Failed high / swing high stop reference is missing.' : '',
      ].filter(Boolean),
      missingLevels: [
        !support ? missingLevel('breakdownLevel', 'Breakdown / reclaim support level', 'Needed to define the short trigger and ENTRY.', 'entry') : null,
        !resistance ? missingLevel('failedHigh', 'Failed high / swing high', 'Needed to place the short STOP above the failed high.', 'stop') : null,
        chartContext.candleFacts?.closeBelowKeyLevel !== true ? missingLevel('triggerCandleLow', '5M close below breakdown level', 'Needed before this short can become executable.', 'trigger') : null,
      ].filter(Boolean) as MissingLevelRequirement[],
      requiredTrigger: support ? `5M close below ${support}.` : '5M close below the active reclaim/support area.',
      nextAction: 'Wait for failed hold above resistance, then confirm breakdown below reclaim/support before shorting.',
      invalidation: resistance ? `Invalid if price reclaims and holds above ${resistance}.` : 'Invalid if price reclaims the failed high.',
      hasTrigger: chartContext.candleFacts?.closeBelowKeyLevel === true,
    }));
  }

  if (reclaimEvidence || resistance || support) {
    const entryBase = resistance || levels.triggerCandleHigh;
    const entry = entryBase ? roundToTick(entryBase + TRADE_RULES.targetModel.tickSize) : null;
    const stop = support ? roundToTick(support - TRADE_RULES.targetModel.tickSize) : null;
    plans.push(makeCandidate({
      setupType: SetupType.MorningReclaimLong,
      direction: 'LONG',
      entry,
      stop,
      priority: 88,
      confidence: reclaimEvidence ? 'Medium' : 'Low',
      evidence: [
        'Morning conditional builder reviewed reclaim-long path.',
        resistance ? `Reclaim reference: ${resistance}.` : 'Reclaim reference not confirmed.',
        support ? `Pullback/support stop reference: ${support}.` : 'Pullback/support stop reference not confirmed.',
      ],
      missingEvidence: [
        !entry ? 'Reclaim entry level is missing.' : '',
        !stop ? 'Pullback low / support stop reference is missing.' : '',
      ].filter(Boolean),
      missingLevels: [
        !entry ? missingLevel('reclaimLevel', 'Reclaim level / trigger candle high', 'Needed to define the long trigger and ENTRY.', 'entry') : null,
        !stop ? missingLevel('activeSwingLow', 'Pullback low / active swing low', 'Needed to place the long STOP under structure.', 'stop') : null,
        chartContext.candleFacts?.closeAboveKeyLevel !== true ? missingLevel('triggerCandleHigh', '5M close above reclaim level', 'Needed before this long can become executable.', 'trigger') : null,
      ].filter(Boolean) as MissingLevelRequirement[],
      requiredTrigger: resistance ? `5M close above ${resistance}, then pullback holds.` : '5M close above the key reclaim level, then pullback holds.',
      nextAction: 'Wait for reclaim and pullback-hold confirmation; do not chase below resistance.',
      invalidation: support ? `Invalid if price breaks back below ${support}.` : 'Invalid if reclaim fails and price breaks the pullback low.',
      hasTrigger: chartContext.candleFacts?.closeAboveKeyLevel === true,
    }));
  }

  return plans;
}

function buildLunchPlans(chartContext: ChartContext): SetupCandidate[] {
  const levels = chartContext.keyLevels;
  const morning = chartContext.morningWindowContext;
  const sweepHigh = firstPrice(levels.morningHighSweep, levels.activeSwingHigh, levels.nearestResistance);
  const sweepLow = firstPrice(levels.morningLowSweep, levels.activeSwingLow, levels.nearestSupport);
  const morningHigh = firstPrice(levels.morningHigh, morning?.morningHigh);
  const morningLow = firstPrice(levels.morningLow, morning?.morningLow);
  const compressionHigh = firstPrice(chartContext.compressionRange?.high, levels.nearestResistance, levels.activeSwingHigh);
  const compressionLow = firstPrice(chartContext.compressionRange?.low, levels.nearestSupport, levels.activeSwingLow);
  const plans: SetupCandidate[] = [];

  if (morningHigh || morning?.failedHoldAboveMorningHigh || morning?.morningHighSwept) {
    const entry = morningHigh ? roundToTick(morningHigh - TRADE_RULES.targetModel.tickSize) : null;
    const stop = sweepHigh ? roundToTick(sweepHigh + TRADE_RULES.targetModel.tickSize) : null;
    plans.push(makeCandidate({
      setupType: SetupType.LunchFailedHighReversal,
      direction: 'SHORT',
      entry,
      stop,
      priority: 94,
      confidence: morning?.failedHoldAboveMorningHigh ? 'High' : 'Medium',
      evidence: ['Lunch builder used completed Morning high context.', morningHigh ? `Morning high: ${morningHigh}.` : 'Morning high not confirmed.'],
      missingEvidence: [!morningHigh ? 'Morning high is missing.' : '', !stop ? 'Sweep high stop reference is missing.' : ''].filter(Boolean),
      missingLevels: [
        !morningHigh ? missingLevel('morningHigh', 'Completed Morning high', 'Needed to define the failed-high reversal trigger.', 'context', 'morning_context') : null,
        !stop ? missingLevel('sweepHigh', 'Lunch sweep high', 'Needed to place STOP one tick above the sweep high.', 'stop') : null,
        !(chartContext.candleFacts?.closeBelowKeyLevel === true || morning?.failedHoldAboveMorningHigh === true) ? missingLevel('triggerCandleLow', '5M close back below Morning high', 'Needed before this Lunch short can become executable.', 'trigger') : null,
      ].filter(Boolean) as MissingLevelRequirement[],
      requiredTrigger: morningHigh ? `5M close back below morning high ${morningHigh}.` : '5M close back below the Morning high.',
      nextAction: 'Wait for failed hold above Morning high and close back below before shorting.',
      invalidation: stop ? `Invalid if price holds above sweep high ${stop}.` : 'Invalid if price holds above the sweep high.',
      hasTrigger: chartContext.candleFacts?.closeBelowKeyLevel === true || morning?.failedHoldAboveMorningHigh === true,
    }));
  }

  if (morningLow || morning?.failedHoldBelowMorningLow || morning?.morningLowSwept) {
    const entry = morningLow ? roundToTick(morningLow + TRADE_RULES.targetModel.tickSize) : null;
    const stop = sweepLow ? roundToTick(sweepLow - TRADE_RULES.targetModel.tickSize) : null;
    plans.push(makeCandidate({
      setupType: SetupType.LunchFailedLowReversal,
      direction: 'LONG',
      entry,
      stop,
      priority: 94,
      confidence: morning?.failedHoldBelowMorningLow ? 'High' : 'Medium',
      evidence: ['Lunch builder used completed Morning low context.', morningLow ? `Morning low: ${morningLow}.` : 'Morning low not confirmed.'],
      missingEvidence: [!morningLow ? 'Morning low is missing.' : '', !stop ? 'Sweep low stop reference is missing.' : ''].filter(Boolean),
      missingLevels: [
        !morningLow ? missingLevel('morningLow', 'Completed Morning low', 'Needed to define the failed-low reversal trigger.', 'context', 'morning_context') : null,
        !stop ? missingLevel('sweepLow', 'Lunch sweep low', 'Needed to place STOP one tick below the sweep low.', 'stop') : null,
        !(chartContext.candleFacts?.closeAboveKeyLevel === true || morning?.failedHoldBelowMorningLow === true) ? missingLevel('triggerCandleHigh', '5M close back above Morning low', 'Needed before this Lunch long can become executable.', 'trigger') : null,
      ].filter(Boolean) as MissingLevelRequirement[],
      requiredTrigger: morningLow ? `5M close back above morning low ${morningLow}.` : '5M close back above the Morning low.',
      nextAction: 'Wait for failed hold below Morning low and close back above before going long.',
      invalidation: stop ? `Invalid if price holds below sweep low ${stop}.` : 'Invalid if price holds below the sweep low.',
      hasTrigger: chartContext.candleFacts?.closeAboveKeyLevel === true || morning?.failedHoldBelowMorningLow === true,
    }));
  }

  if (chartContext.compressionRange?.present || chartContext.marketStructure?.compressionCondition) {
    const direction = chartContext.compressionRange?.breakoutDirection && chartContext.compressionRange.breakoutDirection !== 'NO TRADE'
      ? chartContext.compressionRange.breakoutDirection
      : 'NO TRADE';
    const entry = direction === 'LONG' && compressionHigh
      ? roundToTick(compressionHigh + TRADE_RULES.targetModel.tickSize)
      : direction === 'SHORT' && compressionLow
        ? roundToTick(compressionLow - TRADE_RULES.targetModel.tickSize)
        : null;
    const stop = direction === 'LONG' && compressionLow
      ? roundToTick(compressionLow - TRADE_RULES.targetModel.tickSize)
      : direction === 'SHORT' && compressionHigh
        ? roundToTick(compressionHigh + TRADE_RULES.targetModel.tickSize)
        : null;
    plans.push(makeCandidate({
      setupType: SetupType.LunchCompressionBreakout,
      direction,
      entry,
      stop,
      priority: 78,
      confidence: confidenceIsReadable(chartContext.compressionRange?.confidence) ? 'Medium' : 'Low',
      evidence: ['Lunch builder reviewed compression breakout from completed Morning context.'],
      missingEvidence: [direction === 'NO TRADE' ? 'Compression breakout direction is not confirmed.' : ''].filter(Boolean),
      missingLevels: [
        !compressionHigh ? missingLevel('compressionHigh', 'Compression range high', 'Needed to define breakout/rejection levels.', 'context') : null,
        !compressionLow ? missingLevel('compressionLow', 'Compression range low', 'Needed to define breakout/rejection levels.', 'context') : null,
        direction === 'NO TRADE' ? missingLevel('entry', 'Compression breakout direction', 'Needed before ENTRY can be calculated.', 'trigger') : null,
      ].filter(Boolean) as MissingLevelRequirement[],
      requiredTrigger: '5M break from compression range with stop beyond the opposite boundary.',
      nextAction: 'Wait for clean compression break and risk check.',
      invalidation: stop ? `Invalid beyond opposite compression boundary near ${stop}.` : 'Invalid beyond the opposite compression boundary.',
      hasTrigger: direction !== 'NO TRADE',
    }));
  }

  return plans;
}

export function buildConditionalPlans(chartContext: ChartContext): SetupCandidate[] {
  if (chartContext.screenshotUsability === 'unusable') return [];
  const sessionType = chartContext.sessionType;
  if (sessionType === 'morning' || sessionType === 'replay_morning') return buildMorningPlans(chartContext);
  if (sessionType === 'lunch' || sessionType === 'replay_lunch') return buildLunchPlans(chartContext);
  return [];
}
