import {
  ChartContext,
  ExecutionStatus,
  NoTradeReason,
  MissingLevelRequirement,
  SetupCandidate,
  SetupCandidateStatus,
  SetupType,
} from '../types';
import { fixedRiskStopForDirection, fixedRiskTargetsForDirection, TRADE_RULES } from '../config/tradeRules';

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
  const fixedTargets = fixedRiskTargetsForDirection(direction, entry);
  if ((direction !== 'LONG' && direction !== 'SHORT') || !isPrice(entry) || fixedTargets.target1 === null || fixedTargets.target2 === null) {
    return { target1: null, target2: null };
  }
  return fixedTargets;
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

function pricesFromCandles(chartContext: ChartContext, side: 'high' | 'low'): number[] {
  return (chartContext.candles || [])
    .filter((candle) => candle.confidence !== 'Low' && candle.confidence !== 'Unreadable')
    .map((candle) => side === 'high' ? candle.high : candle.low)
    .filter(isPrice);
}

function pricesFromSwings(chartContext: ChartContext, type: 'high' | 'low'): number[] {
  return (chartContext.swings || [])
    .filter((swing) => swing.type === type && swing.confidence !== 'Low' && swing.confidence !== 'Unreadable')
    .map((swing) => swing.price)
    .filter(isPrice);
}

function nearestBelow(price: number | null | undefined, levels: number[]): number | null {
  if (!isPrice(price)) return null;
  return levels.filter((level) => level < price).sort((a, b) => b - a)[0] || null;
}

function nearestAbove(price: number | null | undefined, levels: number[]): number | null {
  if (!isPrice(price)) return null;
  return levels.filter((level) => level > price).sort((a, b) => a - b)[0] || null;
}

function roundNumberAbove(price: number | null | undefined, interval = 5): number | null {
  if (!isPrice(price)) return null;
  const rounded = Math.ceil(price / interval) * interval;
  return rounded > price ? rounded : rounded + interval;
}

function nearbyMajorResistance(current: number | null | undefined, resistance: number | null): number | null {
  const reference = resistance || current;
  const roundNumber = roundNumberAbove(reference);
  if (!isPrice(roundNumber)) return resistance;
  if (isPrice(current) && roundNumber - current > 8) return resistance;
  if (isPrice(resistance) && roundNumber - resistance > 4) return resistance;
  return roundNumber;
}

function projectedPullbackStop(current: number | null | undefined, support: number | null): number | null {
  if (!isPrice(current)) return support;
  const projected = roundToTick(current - TRADE_RULES.targetModel.tickSize * 2);
  if (isPrice(support) && projected < support && support - projected > 2) return support;
  return projected;
}

function confidenceIsReadable(value: unknown): boolean {
  return value === 'High' || value === 'Medium';
}

function levelContextForDirection(chartContext: ChartContext, direction: Direction): { score: number; summary: string } {
  if (!chartContext.sessionLevelContext || (direction !== 'LONG' && direction !== 'SHORT')) {
    return { score: 0, summary: 'No session level context score available.' };
  }
  const levels = direction === 'LONG'
    ? chartContext.sessionLevelContext.strongestLongLevels
    : chartContext.sessionLevelContext.strongestShortLevels;
  const best = levels[0];
  if (!best) return { score: 0, summary: 'No directional session level context found.' };
  return {
    score: Math.min(Math.round((best.strengthScore || 0) / 5), 20),
    summary: `${best.label} ${best.price} is a ${direction === 'LONG' ? 'long-side' : 'short-side'} reaction zone to watch for reclaim, rejection, or target management.`,
  };
}

function findStructuralLevelPrice(
  chartContext: ChartContext,
  matcher: (label: string, source: string, type: string) => boolean
): number | null {
  const level = (chartContext.structuralLevels || []).find((item) =>
    isPrice(item.price) && matcher(item.label.toLowerCase(), String(item.source).toLowerCase(), String(item.type).toLowerCase())
  );
  return level?.price ?? null;
}

function nyPremarketHigh(chartContext: ChartContext): number | null {
  return firstPrice(
    chartContext.keyLevels.nyPremarketHigh,
    findStructuralLevelPrice(chartContext, (label, source, type) =>
      (source === 'ny_premarket' && type === 'high') ||
      label.includes('ny premarket high') ||
      label.includes('new york premarket high')
    )
  );
}

function nyPremarketLow(chartContext: ChartContext): number | null {
  return firstPrice(
    chartContext.keyLevels.nyPremarketLow,
    findStructuralLevelPrice(chartContext, (label, source, type) =>
      (source === 'ny_premarket' && type === 'low') ||
      label.includes('ny premarket low') ||
      label.includes('new york premarket low')
    )
  );
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
  chartContext: ChartContext;
  setupType: SetupType;
  scenarioLabel?: string | null;
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
  const fixedStop = fixedRiskStopForDirection(input.direction, input.entry);
  const risk = riskPoints(input.entry, fixedStop);
  const computedTargets = targets(input.direction, input.entry, fixedStop);
  const execution = executionFor(input.entry, fixedStop, Boolean(input.hasTrigger), Boolean(input.invalidation));
  const levelContext = levelContextForDirection(input.chartContext, input.direction);

  return {
    setupType: input.setupType,
    scenarioLabel: input.scenarioLabel ?? null,
    direction: input.direction,
    detectedStatus: SetupCandidateStatus.Conditional,
    confidence: input.confidence || 'Medium',
    priority: input.priority,
    entry: input.entry,
    stop: fixedStop,
    target1: computedTargets.target1,
    target2: computedTargets.target2,
    riskPoints: risk,
    invalidation: input.invalidation,
    entryClarity: isPrice(input.entry) ? 0.8 : 0.35,
    stopClarity: isPrice(input.stop) ? 0.8 : 0.35,
    targetClarity: computedTargets.target1 !== null && computedTargets.target2 !== null ? 0.8 : 0,
    proximityScore: 0.7,
    levelContextScore: levelContext.score,
    levelContextSummary: levelContext.summary,
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
    ...pricesFromCandles(chartContext, 'low'),
    ...pricesFromSwings(chartContext, 'low'),
    ...pricesFromExtractedLevels(chartContext, 'support'),
  ].filter(isPrice);
  const resistanceLevels = [
    levels.nearestResistance,
    levels.activeSwingHigh,
    levels.triggerCandleHigh,
    levels.openingRangeHigh,
    ...pricesFromCandles(chartContext, 'high'),
    ...pricesFromSwings(chartContext, 'high'),
    ...pricesFromExtractedLevels(chartContext, 'resistance'),
  ].filter(isPrice);

  const resistance = firstPrice(nearestAbove(current, resistanceLevels), levels.nearestResistance, levels.activeSwingHigh, resistanceLevels[0]);
  const support = firstPrice(nearestBelow(current, supportLevels), levels.nearestSupport, levels.activeSwingLow, supportLevels[0]);
  const reclaimResistance = firstPrice(nearbyMajorResistance(current, resistance), resistance, levels.triggerCandleHigh);
  const reclaimStop = firstPrice(projectedPullbackStop(current, support), levels.triggerCandleLow, support);
  const nyPremarketHighTarget = nyPremarketHigh(chartContext);
  const breakdownSupport = support;
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
    const entry = breakdownSupport ? roundToTick(breakdownSupport - TRADE_RULES.targetModel.tickSize) : null;
    const stop = resistance ? roundToTick(resistance + TRADE_RULES.targetModel.tickSize) : null;
    plans.push(makeCandidate({
      chartContext,
      setupType: SetupType.MorningFailedHighLiquidityRejection,
      direction: 'SHORT',
      entry,
      stop,
      priority: 89,
      confidence: rejectionEvidence ? 'Medium' : 'Low',
      evidence: [
        'Morning conditional builder reviewed failed-high / liquidity-rejection path.',
        resistance ? `Failed high / resistance reference: ${resistance}.` : 'Failed high / resistance reference not confirmed.',
        breakdownSupport ? `Breakdown trigger reference: ${breakdownSupport}.` : 'Breakdown trigger reference not confirmed.',
      ],
      missingEvidence: [
        !breakdownSupport ? 'Support/reclaim breakdown level is missing.' : '',
        !resistance ? 'Failed high / swing high stop reference is missing.' : '',
      ].filter(Boolean),
      missingLevels: [
        !breakdownSupport ? missingLevel('breakdownLevel', 'Breakdown / reclaim support level', 'Needed to define the short trigger and ENTRY.', 'entry') : null,
        !resistance ? missingLevel('failedHigh', 'Failed high / swing high', 'Needed to place the short STOP above the failed high.', 'stop') : null,
        chartContext.candleFacts?.closeBelowKeyLevel !== true ? missingLevel('triggerCandleLow', '5M close below breakdown level', 'Needed before this short can become executable.', 'trigger') : null,
      ].filter(Boolean) as MissingLevelRequirement[],
      requiredTrigger: breakdownSupport ? `5M close below ${breakdownSupport}.` : '5M close below the active reclaim/support area.',
      nextAction: 'Wait for failed hold above resistance, then confirm breakdown below reclaim/support before shorting.',
      invalidation: resistance ? `Invalid if price reclaims and holds above ${resistance}.` : 'Invalid if price reclaims the failed high.',
      hasTrigger: chartContext.candleFacts?.closeBelowKeyLevel === true,
    }));
  }

  if (reclaimEvidence || resistance || support) {
    const entryBase = reclaimResistance || levels.triggerCandleHigh;
    const entry = entryBase ? roundToTick(entryBase + TRADE_RULES.targetModel.tickSize) : null;
    const stop = reclaimStop ? roundToTick(reclaimStop) : null;
    const reclaimTargetPhrase = nyPremarketHighTarget ? ` toward NY Premarket High ${nyPremarketHighTarget}` : '';
    plans.push(makeCandidate({
      chartContext,
      setupType: SetupType.MorningReclaimLong,
      scenarioLabel: nyPremarketHighTarget
        ? 'Reclaim continuation toward NY Premarket High'
        : 'Reclaim continuation',
      direction: 'LONG',
      entry,
      stop,
      priority: 88,
      confidence: reclaimEvidence ? 'Medium' : 'Low',
      evidence: [
        'Morning conditional builder reviewed reclaim-long path.',
        reclaimResistance ? `Reclaim reference: ${reclaimResistance}.` : 'Reclaim reference not confirmed.',
        nyPremarketHighTarget ? `NY Premarket High target reference: ${nyPremarketHighTarget}.` : 'NY Premarket High target reference not confirmed.',
        reclaimStop ? `Pullback/support stop reference: ${reclaimStop}.` : 'Pullback/support stop reference not confirmed.',
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
      requiredTrigger: reclaimResistance ? `5M close above reclaim level (${reclaimResistance}), then pullback holds.` : '5M close above reclaim level, then pullback holds.',
      nextAction: `Wait for a reclaim close, then a pullback that holds before considering continuation${reclaimTargetPhrase}.`,
      invalidation: reclaimStop ? `Invalid if reclaim level fails and price breaks back below ${reclaimStop}.` : 'Invalid if reclaim level fails.',
      hasTrigger: chartContext.candleFacts?.closeAboveKeyLevel === true,
    }));
  }

  return plans;
}

function buildLunchPlans(chartContext: ChartContext): SetupCandidate[] {
  const levels = chartContext.keyLevels;
  const morning = chartContext.morningWindowContext;
  const current = levels.currentPrice;
  const sweepHigh = firstPrice(levels.morningHighSweep, levels.activeSwingHigh, levels.nearestResistance);
  const sweepLow = firstPrice(levels.morningLowSweep, levels.activeSwingLow, levels.nearestSupport);
  const morningHigh = firstPrice(levels.morningHigh, morning?.morningHigh);
  const morningLow = firstPrice(levels.morningLow, morning?.morningLow);
  const compressionHigh = firstPrice(chartContext.compressionRange?.high, levels.nearestResistance, levels.activeSwingHigh);
  const compressionLow = firstPrice(chartContext.compressionRange?.low, levels.nearestSupport, levels.activeSwingLow);
  const supportLevels = [
    levels.nearestSupport,
    levels.activeSwingLow,
    levels.triggerCandleLow,
    levels.morningLow,
    morning?.morningLow,
    compressionLow,
    ...pricesFromCandles(chartContext, 'low'),
    ...pricesFromSwings(chartContext, 'low'),
    ...pricesFromExtractedLevels(chartContext, 'support'),
  ].filter(isPrice);
  const resistanceLevels = [
    levels.nearestResistance,
    levels.activeSwingHigh,
    levels.triggerCandleHigh,
    levels.morningHigh,
    morning?.morningHigh,
    compressionHigh,
    ...pricesFromCandles(chartContext, 'high'),
    ...pricesFromSwings(chartContext, 'high'),
    ...pricesFromExtractedLevels(chartContext, 'resistance'),
  ].filter(isPrice);
  const support = firstPrice(nearestBelow(current, supportLevels), levels.nearestSupport, levels.activeSwingLow, compressionLow, supportLevels[0]);
  const resistance = firstPrice(nearestAbove(current, resistanceLevels), levels.nearestResistance, levels.activeSwingHigh, compressionHigh, resistanceLevels[0]);
  const nyPremarketHighTarget = nyPremarketHigh(chartContext);
  const nyPremarketLowTarget = nyPremarketLow(chartContext);
  const reclaimEvidence = Boolean(
    chartContext.candleFacts?.reclaimCandlePresent ||
    chartContext.candleFacts?.closeAboveKeyLevel ||
    morning?.rangeReclaimed ||
    morning?.failedHoldBelowMorningLow
  );
  const rejectionEvidence = Boolean(
    chartContext.candleFacts?.rejectionWickPresent ||
    chartContext.candleFacts?.closeBelowKeyLevel ||
    morning?.failedHoldAboveMorningHigh
  );
  const plans: SetupCandidate[] = [];

  if (morningHigh || morning?.failedHoldAboveMorningHigh || morning?.morningHighSwept) {
    const entry = morningHigh ? roundToTick(morningHigh - TRADE_RULES.targetModel.tickSize) : null;
    const stop = sweepHigh ? roundToTick(sweepHigh + TRADE_RULES.targetModel.tickSize) : null;
    plans.push(makeCandidate({
      chartContext,
      setupType: SetupType.LunchFailedHighReversal,
      scenarioLabel: nyPremarketLowTarget
        ? 'Failed high reversal toward NY Premarket Low'
        : 'Failed high reversal',
      direction: 'SHORT',
      entry,
      stop,
      priority: 94,
      confidence: morning?.failedHoldAboveMorningHigh ? 'High' : 'Medium',
      evidence: [
        'Lunch builder used completed Morning high context.',
        morningHigh ? `Morning high: ${morningHigh}.` : 'Morning high not confirmed.',
        nyPremarketLowTarget ? `NY Premarket Low target reference: ${nyPremarketLowTarget}.` : 'NY Premarket Low target reference not confirmed.',
      ],
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
      chartContext,
      setupType: SetupType.LunchFailedLowReversal,
      scenarioLabel: nyPremarketHighTarget
        ? 'Failed low reclaim toward NY Premarket High'
        : 'Failed low reclaim',
      direction: 'LONG',
      entry,
      stop,
      priority: 94,
      confidence: morning?.failedHoldBelowMorningLow ? 'High' : 'Medium',
      evidence: [
        'Lunch builder used completed Morning low context.',
        morningLow ? `Morning low: ${morningLow}.` : 'Morning low not confirmed.',
        nyPremarketHighTarget ? `NY Premarket High target reference: ${nyPremarketHighTarget}.` : 'NY Premarket High target reference not confirmed.',
      ],
      missingEvidence: [!morningLow ? 'Morning low is missing.' : '', !stop ? 'Sweep low stop reference is missing.' : ''].filter(Boolean),
      missingLevels: [
        !morningLow ? missingLevel('morningLow', 'Completed Morning low', 'Needed to define the failed-low reversal trigger.', 'context', 'morning_context') : null,
        !stop ? missingLevel('sweepLow', 'Lunch sweep low', 'Needed to place STOP one tick below the sweep low.', 'stop') : null,
        !(chartContext.candleFacts?.closeAboveKeyLevel === true || morning?.failedHoldBelowMorningLow === true) ? missingLevel('triggerCandleHigh', '5M close back above Morning low', 'Needed before this Lunch long can become executable.', 'trigger') : null,
      ].filter(Boolean) as MissingLevelRequirement[],
      requiredTrigger: morningLow ? `5M close back above reclaim level (${morningLow}), then pullback holds.` : '5M close back above reclaim level, then pullback holds.',
      nextAction: `Wait for failed hold below Morning low, reclaim close, and pullback-hold confirmation${nyPremarketHighTarget ? ` before considering continuation toward NY Premarket High ${nyPremarketHighTarget}` : ''}.`,
      invalidation: stop ? `Invalid if reclaim level fails and price holds below sweep low ${stop}.` : 'Invalid if reclaim level fails.',
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
      chartContext,
      setupType: SetupType.LunchCompressionBreakout,
      scenarioLabel: direction === 'LONG'
        ? (nyPremarketHighTarget ? 'Compression breakout toward NY Premarket High' : 'Compression breakout long')
        : direction === 'SHORT'
          ? (nyPremarketLowTarget ? 'Compression breakdown toward NY Premarket Low' : 'Compression breakout short')
          : 'Compression breakout',
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

  if (!plans.some((plan) => plan.direction === 'LONG') && (reclaimEvidence || support || resistance)) {
    const entryBase = firstPrice(resistance, compressionHigh, levels.triggerCandleHigh);
    const stopBase = firstPrice(support, compressionLow, levels.triggerCandleLow);
    const entry = entryBase ? roundToTick(entryBase + TRADE_RULES.targetModel.tickSize) : null;
    const stop = stopBase ? roundToTick(stopBase - TRADE_RULES.targetModel.tickSize) : null;
    plans.push(makeCandidate({
      chartContext,
      setupType: SetupType.LunchRangeReclaim,
      scenarioLabel: nyPremarketHighTarget
        ? 'Range reclaim continuation toward NY Premarket High'
        : 'Range reclaim continuation',
      direction: 'LONG',
      entry,
      stop,
      priority: 86,
      confidence: reclaimEvidence ? 'Medium' : 'Low',
      evidence: [
        'Lunch conditional builder reviewed range-reclaim long path from structured support/resistance.',
        entryBase ? `Reclaim trigger reference: ${entryBase}.` : 'Reclaim trigger reference not confirmed.',
        nyPremarketHighTarget ? `NY Premarket High target reference: ${nyPremarketHighTarget}.` : 'NY Premarket High target reference not confirmed.',
        stopBase ? `Support / failed-low stop reference: ${stopBase}.` : 'Support / failed-low stop reference not confirmed.',
      ],
      missingEvidence: [
        !entryBase ? 'Reclaim or resistance level is missing.' : '',
        !stopBase ? 'Support / failed-low stop reference is missing.' : '',
      ].filter(Boolean),
      missingLevels: [
        !entryBase ? missingLevel('reclaimLevel', 'Lunch reclaim / range high level', 'Needed to define the long trigger and ENTRY.', 'entry') : null,
        !stopBase ? missingLevel('activeSwingLow', 'Lunch support / failed-low structure', 'Needed to place the long STOP under structure.', 'stop') : null,
        chartContext.candleFacts?.closeAboveKeyLevel !== true ? missingLevel('triggerCandleHigh', '5M close above lunch reclaim level', 'Needed before this Lunch long can become executable.', 'trigger') : null,
      ].filter(Boolean) as MissingLevelRequirement[],
      requiredTrigger: entryBase ? `5M close above reclaim level (${entryBase}), then pullback holds.` : '5M close above reclaim level, then pullback holds.',
      nextAction: `Wait for failed-low or range reclaim confirmation before going long${nyPremarketHighTarget ? ` toward NY Premarket High ${nyPremarketHighTarget}` : ''}; do not chase inside the range.`,
      invalidation: stopBase ? `Invalid if reclaim level fails and price breaks back below ${stopBase}.` : 'Invalid if reclaim level fails.',
      hasTrigger: chartContext.candleFacts?.closeAboveKeyLevel === true || morning?.rangeReclaimed === true,
    }));
  }

  if (!plans.some((plan) => plan.direction === 'SHORT') && (rejectionEvidence || support || resistance)) {
    const entryBase = firstPrice(support, compressionLow, levels.triggerCandleLow);
    const stopBase = firstPrice(resistance, compressionHigh, levels.triggerCandleHigh);
    const entry = entryBase ? roundToTick(entryBase - TRADE_RULES.targetModel.tickSize) : null;
    const stop = stopBase ? roundToTick(stopBase + TRADE_RULES.targetModel.tickSize) : null;
    plans.push(makeCandidate({
      chartContext,
      setupType: SetupType.LunchFailedContinuation,
      scenarioLabel: nyPremarketLowTarget
        ? 'Failed continuation toward NY Premarket Low'
        : 'Failed continuation',
      direction: 'SHORT',
      entry,
      stop,
      priority: 84,
      confidence: rejectionEvidence ? 'Medium' : 'Low',
      evidence: [
        'Lunch conditional builder reviewed failed-continuation short path from structured support/resistance.',
        entryBase ? `Breakdown trigger reference: ${entryBase}.` : 'Breakdown trigger reference not confirmed.',
        nyPremarketLowTarget ? `NY Premarket Low target reference: ${nyPremarketLowTarget}.` : 'NY Premarket Low target reference not confirmed.',
        stopBase ? `Resistance / failed-high stop reference: ${stopBase}.` : 'Resistance / failed-high stop reference not confirmed.',
      ],
      missingEvidence: [
        !entryBase ? 'Breakdown or support level is missing.' : '',
        !stopBase ? 'Resistance / failed-high stop reference is missing.' : '',
      ].filter(Boolean),
      missingLevels: [
        !entryBase ? missingLevel('breakdownLevel', 'Lunch breakdown / range low level', 'Needed to define the short trigger and ENTRY.', 'entry') : null,
        !stopBase ? missingLevel('activeSwingHigh', 'Lunch resistance / failed-high structure', 'Needed to place the short STOP above structure.', 'stop') : null,
        chartContext.candleFacts?.closeBelowKeyLevel !== true ? missingLevel('triggerCandleLow', '5M close below lunch breakdown level', 'Needed before this Lunch short can become executable.', 'trigger') : null,
      ].filter(Boolean) as MissingLevelRequirement[],
      requiredTrigger: entryBase ? `5M close below ${entryBase}.` : '5M close below the lunch breakdown / range low level.',
      nextAction: 'Wait for failed hold above resistance, then confirm breakdown before shorting.',
      invalidation: stopBase ? `Invalid if price reclaims and holds above ${stopBase}.` : 'Invalid if price reclaims the failed high.',
      hasTrigger: chartContext.candleFacts?.closeBelowKeyLevel === true || morning?.failedHoldAboveMorningHigh === true,
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
