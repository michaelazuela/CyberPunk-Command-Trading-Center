import {
  AnalysisResult,
  ChartContext,
  ExecutionStatus,
  NoTradeReason,
  SetupCandidate,
  SetupCandidateStatus,
  SetupType,
} from '../types';
import { fixedRiskStopForDirection, fixedRiskTargetsForDirection, TRADE_RULES } from '../config/tradeRules';
import { SETUP_REGISTRY, SetupRegistryEntry, SetupSession } from '../config/setupRegistry';

type Direction = SetupCandidate['direction'];
type Confidence = SetupCandidate['confidence'];
type ReadConfidence = Exclude<ChartContext['levelReadConfidence'], undefined>;

interface ExtractedPlanFacts {
  text: string;
  direction: Direction;
  entry: number | null;
  stop: number | null;
  invalidation: string | null;
  requiredTrigger: string | null;
  triggerState: string | null;
  confidence: Confidence | null;
}

export interface SetupScannerInput {
  sessionType: SetupSession;
  result?: AnalysisResult | null;
  chartContext?: ChartContext | null;
  contextText?: string;
}

export interface SetupScanResult {
  candidates: SetupCandidate[];
  bestExecutableCandidate: SetupCandidate | null;
  bestConditionalCandidate: SetupCandidate | null;
}

function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) return value.map(normalizeText).join(' ');
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).map(normalizeText).join(' ');
  return '';
}

function buildSearchText(input: SetupScannerInput): string {
  const result = input.result;
  return [
    input.contextText,
    result?.dayType,
    result?.reasoning,
    result?.levelCheck,
    result?.structureStatus,
    normalizeText(result?.current_rule_analysis),
    normalizeText(result?.candidate_trade_plans),
    normalizeText(result?.best_trade_plan),
    normalizeText(result?.final_trade_plan),
    normalizeText(result?.tradePlan),
    normalizeText(result?.tags),
    normalizeText(result?.checks),
  ].filter(Boolean).join(' ').toUpperCase();
}

function hasAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword.toUpperCase()));
}

function inferDirection(text: string): Direction {
  if (text.includes('NO TRADE')) return 'NO TRADE';
  const longScore = [' LONG', 'BULLISH', 'BUY', 'SUPPORT', 'RECLAIM'].filter((token) => text.includes(token)).length;
  const shortScore = [' SHORT', 'BEARISH', 'SELL', 'RESISTANCE', 'REJECT'].filter((token) => text.includes(token)).length;
  if (longScore > shortScore) return 'LONG';
  if (shortScore > longScore) return 'SHORT';
  return 'NO TRADE';
}

function parsePrice(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

function roundToTick(price: number): number {
  return Math.round(price / TRADE_RULES.targetModel.tickSize) * TRADE_RULES.targetModel.tickSize;
}

function confidenceFrom(value: unknown): Confidence | null {
  if (value === 'High' || value === 'Medium' || value === 'Low') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'high') return 'High';
    if (lower === 'medium') return 'Medium';
    if (lower === 'low') return 'Low';
  }
  if (typeof value === 'number') {
    if (value >= 0.75) return 'High';
    if (value >= 0.45) return 'Medium';
    return 'Low';
  }
  return null;
}

function confidenceForStatus(status: SetupCandidateStatus): SetupCandidate['confidence'] {
  if (status === SetupCandidateStatus.Detected || status === SetupCandidateStatus.Blocked) return 'High';
  if (status === SetupCandidateStatus.Possible || status === SetupCandidateStatus.Conditional) return 'Medium';
  return 'Low';
}

function isReadableConfidence(confidence: ReadConfidence | null | undefined): boolean {
  return confidence === 'High' || confidence === 'Medium';
}

function hasStructuredChartFacts(chartContext?: ChartContext | null): boolean {
  if (!chartContext) return false;
  return Boolean(
    chartContext.setupEvidence ||
    chartContext.candleFacts ||
    chartContext.marketStructure ||
    chartContext.candles?.length ||
    chartContext.swings?.length ||
    chartContext.fvgZones?.length ||
    chartContext.liquidityEvents?.length ||
    chartContext.liquiditySweeps?.length ||
    chartContext.reclaimEvents?.length ||
    chartContext.failedBreakEvents?.length ||
    chartContext.displacementCandles?.length ||
    chartContext.setupReadyFacts ||
    chartContext.multiTimeframeContext ||
    chartContext.extractedLevels?.length ||
    chartContext.gapContext ||
    chartContext.compressionRange ||
    chartContext.levelReadConfidence ||
    chartContext.candleReadConfidence ||
    chartContext.structureReadConfidence ||
    chartContext.setupReadConfidence ||
    chartContext.entryStopConfidence
  );
}

function extractPlanFacts(result: AnalysisResult | null | undefined): ExtractedPlanFacts[] {
  if (!result) return [];
  const facts: ExtractedPlanFacts[] = [];
  const pushFact = (source: Record<string, unknown> | null | undefined, fallbackText: string) => {
    if (!source) return;
    const text = normalizeText(source) || fallbackText;
    const upperText = text.toUpperCase();
    facts.push({
      text: upperText,
      direction: inferDirection(upperText),
      entry: parsePrice(source.entry),
      stop: parsePrice(source.stop),
      invalidation: typeof source.invalidation === 'string'
        ? source.invalidation
        : typeof source.what_would_invalidate === 'string'
          ? source.what_would_invalidate
          : result.levelCheck || result.structureStatus || null,
      requiredTrigger: typeof source.entry_trigger === 'string'
        ? source.entry_trigger
        : typeof source.required_trigger === 'string'
          ? source.required_trigger
          : null,
      triggerState: typeof source.trigger_state === 'string' ? source.trigger_state : null,
      confidence: confidenceFrom(source.confidence ?? source.base_confidence ?? source.final_confidence ?? result.confidence),
    });
  };

  pushFact(result.current_rule_analysis as Record<string, unknown> | undefined, 'Current rule analysis');
  pushFact(result.best_trade_plan as unknown as Record<string, unknown> | undefined, 'Best trade plan');
  pushFact(result.final_trade_plan as Record<string, unknown> | undefined, 'Final trade plan');
  pushFact(result.tradePlan as unknown as Record<string, unknown> | undefined, 'Legacy trade plan');
  result.candidate_trade_plans?.forEach((plan) => pushFact(plan as unknown as Record<string, unknown>, 'Candidate trade plan'));

  return facts;
}

function findRelevantFacts(entry: SetupRegistryEntry, facts: ExtractedPlanFacts[], text: string): ExtractedPlanFacts[] {
  const keywords = [...entry.detectionKeywords, ...entry.possibleKeywords, ...entry.aliases].map((keyword) => keyword.toUpperCase());
  const relevant = facts.filter((fact) => keywords.some((keyword) => fact.text.includes(keyword)));
  if (relevant.length > 0) return relevant;
  if (hasAny(text, [...entry.detectionKeywords, ...entry.aliases, ...entry.possibleKeywords])) {
    return facts;
  }
  return [];
}

function evidenceKeyForSetup(setupType: SetupType): keyof NonNullable<ChartContext['setupEvidence']> | null {
  switch (setupType) {
    case SetupType.OrderBlock618: return 'orderBlockRetest';
    case SetupType.LiquiditySweep: return 'liquiditySweep';
    case SetupType.MomentumRunaway: return 'momentumRunaway';
    case SetupType.FairValueGap: return 'fairValueGap';
    case SetupType.FvgImbalancePullback: return 'imbalancePullback';
    case SetupType.MarketStructureShift: return 'marketStructureShift';
    case SetupType.OpeningOrderBlock: return 'openingOrderBlock';
    case SetupType.EqualHighsLows: return 'equalHighsEqualLows';
    case SetupType.InitialBalanceExtension: return 'initialBalanceExtension';
    case SetupType.PreviousDaySweep: return 'previousDayHighLowSweep';
    case SetupType.CompressionBreakout: return 'compressionBreakout';
    case SetupType.OpeningGapFill: return 'openingGapFill';
    case SetupType.BreakerBlock: return 'breakerBlock';
    case SetupType.AlgoKillZone: return 'algoKillZone';
    case SetupType.MitigationBlock: return 'mitigationBlock';
    case SetupType.MomentumPullbackBreatherReclaim: return 'momentumPullbackBreatherReclaim';
    case SetupType.MorningFailedHighLiquidityRejection: return 'morningFailedHighLiquidityRejection';
    case SetupType.MorningReclaimLong: return 'morningReclaimLong';
    case SetupType.LunchFailedHighReversal: return 'lunchFailedHighReversal';
    case SetupType.LunchFailedLowReversal: return 'lunchFailedLowReversal';
    case SetupType.LunchCompressionBreakout: return 'lunchCompressionBreakout';
    case SetupType.LunchFailedContinuation: return 'lunchFailedContinuation';
    case SetupType.LunchRangeReclaim: return 'lunchRangeReclaim';
    default: return null;
  }
}

function isLunchSubtype(setupType: SetupType): boolean {
  return setupType === SetupType.LunchFailedHighReversal ||
    setupType === SetupType.LunchFailedLowReversal ||
    setupType === SetupType.LunchCompressionBreakout ||
    setupType === SetupType.LunchFailedContinuation ||
    setupType === SetupType.LunchRangeReclaim;
}

function isLunchSession(sessionType: SetupSession): boolean {
  return sessionType === 'lunch' || sessionType === 'replay_lunch';
}

function hasCompletedMorningWindowContext(chartContext?: ChartContext | null): boolean {
  if (!chartContext) return false;
  const morningContext = chartContext.morningWindowContext;
  const levels = chartContext.keyLevels;
  return Boolean(
    (morningContext?.complete && (morningContext.morningHigh || levels.morningHigh) && (morningContext.morningLow || levels.morningLow)) ||
    (levels.morningHigh && levels.morningLow && (morningContext?.confidence === 'High' || morningContext?.confidence === 'Medium'))
  );
}

function setupEvidenceFromContext(entry: SetupRegistryEntry, chartContext?: ChartContext | null) {
  const key = evidenceKeyForSetup(entry.setupType);
  if (!key) return null;
  if (entry.setupType === SetupType.MomentumPullbackBreatherReclaim) {
    return chartContext?.setupEvidence?.momentumPullbackBreatherReclaim || chartContext?.setupEvidence?.momentumPullback || null;
  }
  return chartContext?.setupEvidence?.[key] || null;
}

function levelsRequireManualConfirmation(chartContext?: ChartContext | null): boolean {
  if (!chartContext) return false;
  return (
    chartContext.screenshotUsability === 'warning' ||
    chartContext.screenshotUsability === 'unusable' ||
    chartContext.screenshotQuality === 'Low' ||
    chartContext.screenshotQuality === 'Unreadable' ||
    chartContext.levelReadConfidence === 'Low' ||
    chartContext.levelReadConfidence === 'Unreadable' ||
    chartContext.riskReadConfidence === 'Low' ||
    chartContext.riskReadConfidence === 'Unreadable' ||
    chartContext.entryStopConfidence === 'Low' ||
    chartContext.entryStopConfidence === 'Unreadable' ||
    chartContext.requiresManualConfirmation === true ||
    chartContext.entryConfirmed === false ||
    chartContext.stopConfirmed === false ||
    chartContext.extractionWarnings?.levelsUnclear === true ||
    chartContext.extractionWarnings?.priceLabelsUnreadable === true ||
    chartContext.extractionWarnings?.manualEntryStopRequired === true
  );
}

function candleFactSummary(chartContext: ChartContext) {
  const candles = chartContext.candles || [];
  return {
    expansion: Boolean(chartContext.candleFacts?.expansionCandlePresent || candles.some((candle) => candle.isExpansion && isReadableConfidence(candle.confidence))),
    rejection: Boolean(chartContext.candleFacts?.rejectionWickPresent || candles.some((candle) => candle.isRejection && isReadableConfidence(candle.confidence))),
    breather: Boolean(chartContext.candleFacts?.breatherCandlePresent || candles.some((candle) => candle.isBreather && isReadableConfidence(candle.confidence))),
    reclaim: Boolean(chartContext.candleFacts?.reclaimCandlePresent || candles.some((candle) => candle.isReclaim && isReadableConfidence(candle.confidence))),
    pullback: Boolean(chartContext.candleFacts?.pullbackPresent || candles.some((candle) => candle.direction !== 'unknown' && candle.bodyQuality === 'small' && isReadableConfidence(candle.confidence))),
    closeAboveKeyLevel: Boolean(chartContext.candleFacts?.closeAboveKeyLevel),
    closeBelowKeyLevel: Boolean(chartContext.candleFacts?.closeBelowKeyLevel),
  };
}

function levelContextScoreForDirection(chartContext: ChartContext | null | undefined, direction: Direction): { score: number; summary: string } {
  if (!chartContext?.sessionLevelContext || (direction !== 'LONG' && direction !== 'SHORT')) {
    const mtf = chartContext?.multiTimeframeContext;
    if (!mtf || (direction !== 'LONG' && direction !== 'SHORT')) {
      return { score: 0, summary: 'No session level context score available.' };
    }
    const aligned = mtf.alignment.alignedDirection === direction;
    const conflicted = mtf.alignment.conflicts.length > 0;
    return {
      score: aligned ? 14 : conflicted ? -6 : 4,
      summary: `Multi-timeframe OHLC context: 4H=${mtf.alignment.macroBias}, 1H=${mtf.alignment.sessionBias}, 15M=${mtf.alignment.liquidityBias}, 5M=${mtf.alignment.executionBias}.`,
    };
  }
  const levels = direction === 'LONG'
    ? chartContext.sessionLevelContext.strongestLongLevels
    : chartContext.sessionLevelContext.strongestShortLevels;
  const best = levels[0];
  if (!best) {
    const mtf = chartContext.multiTimeframeContext;
    if (mtf) {
      const aligned = mtf.alignment.alignedDirection === direction;
      const conflicted = mtf.alignment.conflicts.length > 0;
      return {
        score: aligned ? 14 : conflicted ? -6 : 4,
        summary: `Multi-timeframe OHLC context: 4H=${mtf.alignment.macroBias}, 1H=${mtf.alignment.sessionBias}, 15M=${mtf.alignment.liquidityBias}, 5M=${mtf.alignment.executionBias}.`,
      };
    }
    return { score: 0, summary: 'No directional session level context found.' };
  }
  return {
    score: Math.min(Math.round((best.strengthScore || 0) / 5), 20),
    summary: `${best.label} ${best.price} is a ${direction === 'LONG' ? 'long-side' : 'short-side'} reaction zone to watch for reclaim, rejection, or target management.`,
  };
}

function structuredDirectionForSetup(entry: SetupRegistryEntry, chartContext?: ChartContext | null): Direction | null {
  if (!chartContext) return null;
  const evidence = setupEvidenceFromContext(entry, chartContext);
  if (evidence?.direction && evidence.direction !== 'NO TRADE') return evidence.direction;

  const readableFvg = chartContext.fvgZones?.find((zone) => isReadableConfidence(zone.confidence));
  if (
    (entry.setupType === SetupType.FairValueGap || entry.setupType === SetupType.FvgImbalancePullback) &&
    readableFvg?.direction
  ) {
    return readableFvg.direction;
  }

  const readableLiquidity = chartContext.liquidityEvents?.find((event) =>
    isReadableConfidence(event.confidence) &&
    event.direction !== 'NO TRADE' &&
    (
      entry.setupType === SetupType.LiquiditySweep ||
      entry.setupType === SetupType.EqualHighsLows ||
      entry.setupType === SetupType.PreviousDaySweep
    )
  );
  if (readableLiquidity?.direction && readableLiquidity.direction !== 'NO TRADE') return readableLiquidity.direction;

  if (entry.setupType === SetupType.MomentumRunaway || entry.setupType === SetupType.MomentumPullbackBreatherReclaim) {
    if (chartContext.marketStructure?.trend === 'bullish') return 'LONG';
    if (chartContext.marketStructure?.trend === 'bearish') return 'SHORT';
  }

  if (entry.setupType === SetupType.OpeningGapFill && chartContext.gapContext?.gapPresent && isReadableConfidence(chartContext.gapContext.confidence)) {
    if (chartContext.gapContext.direction === 'gap_down') return 'LONG';
    if (chartContext.gapContext.direction === 'gap_up') return 'SHORT';
  }

  if (entry.setupType === SetupType.CompressionBreakout && chartContext.compressionRange?.breakoutDirection && chartContext.compressionRange.breakoutDirection !== 'NO TRADE') {
    return chartContext.compressionRange.breakoutDirection;
  }

  if (entry.setupType === SetupType.LunchFailedHighReversal) return 'SHORT';
  if (entry.setupType === SetupType.LunchFailedLowReversal) return 'LONG';
  if (entry.setupType === SetupType.MorningFailedHighLiquidityRejection) return 'SHORT';
  if (entry.setupType === SetupType.MorningReclaimLong) return 'LONG';
  if (entry.setupType === SetupType.LunchCompressionBreakout && chartContext.compressionRange?.breakoutDirection && chartContext.compressionRange.breakoutDirection !== 'NO TRADE') {
    return chartContext.compressionRange.breakoutDirection;
  }
  if (entry.setupType === SetupType.LunchFailedContinuation) {
    if (chartContext.morningWindowContext?.morningTrend === 'bullish_extension') return 'SHORT';
    if (chartContext.morningWindowContext?.morningTrend === 'bearish_extension') return 'LONG';
  }
  if (entry.setupType === SetupType.LunchRangeReclaim) {
    if (chartContext.candleFacts?.closeAboveKeyLevel) return 'LONG';
    if (chartContext.candleFacts?.closeBelowKeyLevel) return 'SHORT';
  }

  return null;
}

function structuredContextSupportsSetup(entry: SetupRegistryEntry, chartContext?: ChartContext | null): boolean {
  if (!chartContext) return false;
  const structure = chartContext.marketStructure;
  const levels = chartContext.keyLevels;
  const candles = candleFactSummary(chartContext);
  const swings = chartContext.swings || [];
  const fvgZones = chartContext.fvgZones || [];
  const liquidityEvents = [...(chartContext.liquidityEvents || []), ...(chartContext.liquiditySweeps || [])];
  const gapContext = chartContext.gapContext;
  const compressionRange = chartContext.compressionRange;
  const hasReadableFvg = fvgZones.some((zone) => isReadableConfidence(zone.confidence));
  const hasReadableSwing = swings.some((swing) => swing.price !== null && isReadableConfidence(swing.confidence));
  const hasSweep = liquidityEvents.some((event) => event.type === 'sweep' && isReadableConfidence(event.confidence));
  const hasReclaim = liquidityEvents.some((event) => event.reclaimed && isReadableConfidence(event.confidence));
  const hasEqualLiquidity = liquidityEvents.some((event) =>
    (event.type === 'equal_highs' || event.type === 'equal_lows') &&
    isReadableConfidence(event.confidence)
  );
  const hasPreviousDaySweep = liquidityEvents.some((event) =>
    (event.type === 'pdh_sweep' || event.type === 'pdl_sweep') &&
    isReadableConfidence(event.confidence)
  );
  const hasMorningContext = hasCompletedMorningWindowContext(chartContext);
  const morningContext = chartContext.morningWindowContext;
  const sweptMorningHigh = Boolean(morningContext?.morningHighSwept || liquidityEvents.some((event) =>
    event.type === 'sweep' &&
    isReadableConfidence(event.confidence) &&
    event.sweptLevelLabel?.toLowerCase().includes('morning high')
  ));
  const sweptMorningLow = Boolean(morningContext?.morningLowSwept || liquidityEvents.some((event) =>
    event.type === 'sweep' &&
    isReadableConfidence(event.confidence) &&
    event.sweptLevelLabel?.toLowerCase().includes('morning low')
  ));

  switch (entry.setupType) {
    case SetupType.MomentumRunaway:
      return Boolean((candles.expansion || structure?.expansionCondition) && (structure?.trend === 'bullish' || structure?.trend === 'bearish'));
    case SetupType.MomentumPullbackBreatherReclaim:
      return Boolean(candles.breather || (candles.pullback && candles.reclaim));
    case SetupType.LiquiditySweep:
      return Boolean((hasSweep && hasReclaim) || (candles.rejection && (candles.reclaim || candles.closeAboveKeyLevel || candles.closeBelowKeyLevel)));
    case SetupType.MarketStructureShift:
      return Boolean(structure?.marketStructureShift);
    case SetupType.EqualHighsLows:
      return Boolean(hasEqualLiquidity || hasReadableSwing || candles.rejection);
    case SetupType.InitialBalanceExtension:
      return Boolean(levels.initialBalanceHigh && levels.initialBalanceLow && levels.currentPrice);
    case SetupType.PreviousDaySweep:
      return Boolean(hasPreviousDaySweep || ((levels.priorDayHigh || levels.previousDayHigh || levels.priorDayLow || levels.previousDayLow) && candles.rejection));
    case SetupType.CompressionBreakout:
      return Boolean((compressionRange?.present && isReadableConfidence(compressionRange.confidence)) || ((structure?.chopRangeCondition || structure?.compressionCondition) && (candles.expansion || structure?.expansionCondition)));
    case SetupType.OpeningGapFill:
      return Boolean((gapContext?.gapPresent && isReadableConfidence(gapContext.confidence)) || (levels.rthOpen && (levels.nearestSupport || levels.nearestResistance)));
    case SetupType.FvgImbalancePullback:
      return Boolean(hasReadableFvg && (candles.pullback || chartContext.setupReadyFacts?.pullbackIntoFvg || chartContext.setupReadyFacts?.fvgReclaimed));
    case SetupType.FairValueGap:
      return hasReadableFvg;
    case SetupType.OrderBlock618:
    case SetupType.OpeningOrderBlock:
    case SetupType.BreakerBlock:
    case SetupType.MitigationBlock:
    case SetupType.AlgoKillZone:
      return false;
    case SetupType.MorningFailedHighLiquidityRejection:
      return Boolean((candles.rejection || hasSweep) && (levels.nearestResistance || levels.activeSwingHigh || levels.openingRangeHigh));
    case SetupType.MorningReclaimLong:
      return Boolean((candles.reclaim || candles.closeAboveKeyLevel) && (levels.nearestResistance || levels.activeSwingHigh || levels.triggerCandleHigh));
    case SetupType.LunchFailedHighReversal:
      return Boolean(hasMorningContext && (sweptMorningHigh || morningContext?.failedHoldAboveMorningHigh) && (candles.closeBelowKeyLevel || candles.rejection || candles.reclaim));
    case SetupType.LunchFailedLowReversal:
      return Boolean(hasMorningContext && (sweptMorningLow || morningContext?.failedHoldBelowMorningLow) && (candles.closeAboveKeyLevel || candles.rejection || candles.reclaim));
    case SetupType.LunchCompressionBreakout:
      return Boolean(hasMorningContext && ((compressionRange?.present && isReadableConfidence(compressionRange.confidence)) || structure?.compressionCondition || structure?.chopRangeCondition));
    case SetupType.LunchFailedContinuation:
      return Boolean(hasMorningContext && (morningContext?.morningTrend === 'bullish_extension' || morningContext?.morningTrend === 'bearish_extension') && (structure?.marketStructureShift || candles.rejection || candles.closeAboveKeyLevel || candles.closeBelowKeyLevel));
    case SetupType.LunchRangeReclaim:
      return Boolean(hasMorningContext && (morningContext?.rangeReclaimed || hasReclaim || chartContext.setupReadyFacts?.fvgReclaimed || chartContext.setupReadyFacts?.sweepThenReclaim || candles.reclaim || candles.closeAboveKeyLevel || candles.closeBelowKeyLevel));
    default:
      return false;
  }
}

function structuredContextDetectsSetup(entry: SetupRegistryEntry, chartContext?: ChartContext | null): boolean {
  if (!chartContext) return false;
  const structure = chartContext.marketStructure;
  const candles = candleFactSummary(chartContext);
  const fvgZones = chartContext.fvgZones || [];
  const liquidityEvents = [...(chartContext.liquidityEvents || []), ...(chartContext.liquiditySweeps || [])];
  const hasReadableFvg = fvgZones.some((zone) => isReadableConfidence(zone.confidence));
  const hasSweep = liquidityEvents.some((event) => event.type === 'sweep' && isReadableConfidence(event.confidence));
  const hasReclaim = liquidityEvents.some((event) => event.reclaimed && isReadableConfidence(event.confidence));
  const hasMorningContext = hasCompletedMorningWindowContext(chartContext);
  const morningContext = chartContext.morningWindowContext;
  const sweptMorningHigh = Boolean(morningContext?.morningHighSwept || liquidityEvents.some((event) =>
    event.type === 'sweep' &&
    isReadableConfidence(event.confidence) &&
    event.sweptLevelLabel?.toLowerCase().includes('morning high')
  ));
  const sweptMorningLow = Boolean(morningContext?.morningLowSwept || liquidityEvents.some((event) =>
    event.type === 'sweep' &&
    isReadableConfidence(event.confidence) &&
    event.sweptLevelLabel?.toLowerCase().includes('morning low')
  ));

  switch (entry.setupType) {
    case SetupType.MomentumRunaway:
      return Boolean((candles.expansion || structure?.expansionCondition) && (structure?.trend === 'bullish' || structure?.trend === 'bearish'));
    case SetupType.LiquiditySweep:
      return Boolean(hasSweep && hasReclaim);
    case SetupType.FairValueGap:
      return hasReadableFvg;
    case SetupType.FvgImbalancePullback:
      return Boolean(hasReadableFvg && (candles.pullback || chartContext.setupReadyFacts?.pullbackIntoFvg || chartContext.setupReadyFacts?.fvgReclaimed));
    case SetupType.MorningFailedHighLiquidityRejection:
      return Boolean(candles.rejection && (chartContext.keyLevels.nearestSupport || chartContext.keyLevels.activeSwingLow));
    case SetupType.MorningReclaimLong:
      return Boolean((candles.reclaim || candles.closeAboveKeyLevel) && (chartContext.keyLevels.nearestResistance || chartContext.keyLevels.triggerCandleHigh));
    case SetupType.LunchFailedHighReversal:
      return Boolean(hasMorningContext && sweptMorningHigh && (morningContext?.failedHoldAboveMorningHigh || candles.closeBelowKeyLevel));
    case SetupType.LunchFailedLowReversal:
      return Boolean(hasMorningContext && sweptMorningLow && (morningContext?.failedHoldBelowMorningLow || candles.closeAboveKeyLevel));
    case SetupType.LunchCompressionBreakout:
      return Boolean(hasMorningContext && chartContext.compressionRange?.present && isReadableConfidence(chartContext.compressionRange.confidence) && chartContext.compressionRange.breakoutDirection !== 'NO TRADE');
    case SetupType.LunchFailedContinuation:
      return Boolean(hasMorningContext && (morningContext?.morningTrend === 'bullish_extension' || morningContext?.morningTrend === 'bearish_extension') && chartContext.marketStructure?.marketStructureShift);
    case SetupType.LunchRangeReclaim:
      return Boolean(hasMorningContext && (morningContext?.rangeReclaimed || hasReclaim || chartContext.setupReadyFacts?.fvgReclaimed || chartContext.setupReadyFacts?.sweepThenReclaim));
    default:
      return false;
  }
}

function riskPoints(entry: number | null, stop: number | null): number | null {
  if (!entry || !stop) return null;
  return Math.abs(entry - stop);
}

function computedTargets(direction: Direction, entry: number | null, stop: number | null): { target1: number | null; target2: number | null } {
  const fixedTargets = fixedRiskTargetsForDirection(direction, entry);
  if (fixedTargets.target1 === null || fixedTargets.target2 === null) return { target1: null, target2: null };
  return fixedTargets;
}

function executionStatusFor(
  status: SetupCandidateStatus,
  direction: Direction,
  risk: number | null,
  hasEntry: boolean,
  hasStop: boolean,
  hasTarget: boolean,
  hasInvalidation: boolean,
  hasPendingTrigger: boolean,
  priority: number,
  confidence: Confidence
): { executionStatus: ExecutionStatus; blockReason: NoTradeReason | null } {
  if (status === SetupCandidateStatus.NotDetected) {
    return { executionStatus: ExecutionStatus.NotDetected, blockReason: null };
  }
  if (status === SetupCandidateStatus.Invalid) {
    return { executionStatus: ExecutionStatus.Invalid, blockReason: NoTradeReason.NoApprovedSetup };
  }
  if (direction === 'NO TRADE') {
    return { executionStatus: ExecutionStatus.Conditional, blockReason: NoTradeReason.EntryTriggerPending };
  }
  if (risk !== null && risk > TRADE_RULES.maxRiskPoints) {
    const highQuality = priority >= 80 || confidence === 'High';
    return {
      executionStatus: highQuality ? ExecutionStatus.Conditional : ExecutionStatus.Blocked,
      blockReason: NoTradeReason.RiskTooWide,
    };
  }
  if (!hasEntry) return { executionStatus: ExecutionStatus.Conditional, blockReason: NoTradeReason.EntryTriggerMissing };
  if (!hasStop || risk === null || risk <= 0) return { executionStatus: ExecutionStatus.Conditional, blockReason: NoTradeReason.InvalidStopLocation };
  if (!hasTarget) return { executionStatus: ExecutionStatus.Conditional, blockReason: NoTradeReason.TargetsUnavailable };
  if (!hasInvalidation) return { executionStatus: ExecutionStatus.Conditional, blockReason: NoTradeReason.InvalidStopLocation };
  if (hasPendingTrigger) return { executionStatus: ExecutionStatus.Conditional, blockReason: NoTradeReason.EntryTriggerPending };
  if (status === SetupCandidateStatus.Possible || status === SetupCandidateStatus.Conditional) {
    return { executionStatus: ExecutionStatus.Conditional, blockReason: NoTradeReason.EntryTriggerPending };
  }
  return { executionStatus: ExecutionStatus.Executable, blockReason: null };
}

function candidateForEntry(entry: SetupRegistryEntry, input: SetupScannerInput, text: string): SetupCandidate {
  const allowed = entry.allowedSessions.includes(input.sessionType);
  const missingMorningWindowContext = isLunchSubtype(entry.setupType) && (!isLunchSession(input.sessionType) || !hasCompletedMorningWindowContext(input.chartContext));
  const structuredFactsPresent = hasStructuredChartFacts(input.chartContext);
  const allowNarrativeFallback = !structuredFactsPresent;
  const structuredEvidence = setupEvidenceFromContext(entry, input.chartContext);
  const manualLevelConfirmation = levelsRequireManualConfirmation(input.chartContext);
  const facts = allowNarrativeFallback ? findRelevantFacts(entry, extractPlanFacts(input.result), text) : [];
  const bestFact = facts.find((fact) => fact.entry !== null && fact.stop !== null) || facts[0] || null;
  const structuredDetected = !missingMorningWindowContext && Boolean(structuredEvidence?.detected || structuredContextDetectsSetup(entry, input.chartContext));
  const structuredPossible = !missingMorningWindowContext && Boolean(structuredEvidence?.possible || (!structuredDetected && structuredContextSupportsSetup(entry, input.chartContext)));
  const narrativeDetected = !isLunchSubtype(entry.setupType) && allowNarrativeFallback && hasAny(text, [...entry.detectionKeywords, ...entry.aliases]);
  const narrativePossible = !isLunchSubtype(entry.setupType) && allowNarrativeFallback && hasAny(text, entry.possibleKeywords);
  const detected = structuredDetected || narrativeDetected;
  const possible = !detected && (structuredPossible || narrativePossible);
  const structuredDirection = structuredDirectionForSetup(entry, input.chartContext);
  const direction = structuredDirection && structuredDirection !== 'NO TRADE'
    ? structuredDirection
    : bestFact?.direction && bestFact.direction !== 'NO TRADE'
    ? bestFact.direction
    : detected || possible ? inferDirection(text) : 'NO TRADE';
  const entryPrice = manualLevelConfirmation ? null : parsePrice(structuredEvidence?.entry) ?? parsePrice(input.chartContext?.proposedEntry) ?? bestFact?.entry ?? null;
  const extractedStopPrice = manualLevelConfirmation ? null : parsePrice(structuredEvidence?.stop) ?? parsePrice(input.chartContext?.proposedStop) ?? bestFact?.stop ?? null;
  const stopPrice = manualLevelConfirmation ? null : fixedRiskStopForDirection(direction, entryPrice) ?? extractedStopPrice;
  const extractedRisk = parsePrice(input.chartContext?.riskPoints);
  const risk =
    riskPoints(entryPrice, stopPrice) ??
    extractedRisk ??
    (input.chartContext?.riskStatus === 'RiskTooWide' ? TRADE_RULES.maxRiskPoints + TRADE_RULES.targetModel.tickSize : null);
  const targets = computedTargets(direction, entryPrice, stopPrice);
  const invalidation = structuredEvidence?.invalidation ?? (allowNarrativeFallback ? bestFact?.invalidation : null) ?? null;
  const confidence = structuredEvidence?.confidence || bestFact?.confidence || confidenceForStatus(detected ? SetupCandidateStatus.Detected : possible ? SetupCandidateStatus.Possible : SetupCandidateStatus.NotDetected);
  const levelContext = levelContextScoreForDirection(input.chartContext, direction);

  const detectedStatus =
    !allowed ? SetupCandidateStatus.Invalid :
    detected ? SetupCandidateStatus.Detected :
    possible ? SetupCandidateStatus.Possible :
    SetupCandidateStatus.NotDetected;

  const execution = executionStatusFor(
    detectedStatus,
    direction,
    risk,
    entryPrice !== null,
    stopPrice !== null,
    targets.target1 !== null && targets.target2 !== null,
    Boolean(typeof invalidation === 'string' && invalidation.trim().length >= 3),
    Boolean((structuredEvidence?.triggerState || bestFact?.triggerState)?.toUpperCase().includes('PENDING')),
    entry.priority,
    confidence
  );
  const visibleStatus =
    execution.blockReason === NoTradeReason.RiskTooWide && detectedStatus === SetupCandidateStatus.Detected
      ? SetupCandidateStatus.Detected
      : detectedStatus;

  return {
    setupType: entry.setupType,
    direction,
    detectedStatus: visibleStatus,
    confidence,
    priority: entry.priority,
    entry: entryPrice,
    stop: stopPrice,
    target1: targets.target1,
    target2: targets.target2,
    riskPoints: risk,
    invalidation,
    entryClarity: entryPrice !== null ? 1 : detected || possible ? 0.45 : 0,
    stopClarity: stopPrice !== null ? 1 : detected || possible ? 0.35 : 0,
    targetClarity: targets.target1 !== null && targets.target2 !== null ? 1 : 0,
    proximityScore: detected ? 0.75 : possible ? 0.55 : 0,
    levelContextScore: levelContext.score,
    levelContextSummary: levelContext.summary,
    evidence: structuredEvidence?.evidence?.length ? structuredEvidence.evidence : detected || possible ? entry.requiredEvidence : [],
    missingEvidence: missingMorningWindowContext
      ? ['Completed Morning window context is required before this Lunch subtype can activate.']
      : manualLevelConfirmation
      ? Array.from(new Set([...(structuredEvidence?.missingEvidence || []), 'Exact entry/stop levels require manual confirmation.']))
      : structuredEvidence?.missingEvidence?.length ? structuredEvidence.missingEvidence : detected ? [] : entry.requiredEvidence,
    executionStatus: execution.executionStatus,
    blockReason: execution.blockReason,
    requiredTrigger: structuredEvidence?.requiredTrigger || bestFact?.requiredTrigger || (detected || possible ? entry.defaultRequiredTrigger : null),
    nextAction:
      missingMorningWindowContext
        ? 'Load or complete Morning 15M/5M context first. Lunch subtypes cannot activate from the Lunch chart alone.'
        : execution.blockReason === NoTradeReason.RiskTooWide
        ? 'Execution blocked by risk. Preserve setup and wait for a clean fixed 5-point trigger.'
        : entry.defaultNextAction,
    reducedRiskPlan:
      execution.blockReason === NoTradeReason.RiskTooWide
        ? {
            direction,
            entry: null,
            stop: null,
            requiredTrigger: entry.defaultRequiredTrigger,
            invalidation: 'Reduced-risk plan must define a stop tied to active swing structure.',
            reasoning: 'Original setup is detected, but current entry-to-stop distance is too wide.',
        }
        : null,
  };
}

export function rankSetupCandidate(candidate: SetupCandidate): number {
  const executionScore =
    candidate.executionStatus === ExecutionStatus.Executable ? 100 :
    candidate.executionStatus === ExecutionStatus.Conditional ? 70 :
    candidate.executionStatus === ExecutionStatus.Blocked ? 15 :
    0;
  const confidenceScore =
    candidate.confidence === 'High' ? 20 :
    candidate.confidence === 'Medium' ? 10 :
    0;
  const riskQuality =
    candidate.riskPoints === null || candidate.riskPoints === undefined ? 0 :
    candidate.riskPoints <= TRADE_RULES.preferredRiskPoints ? 20 :
    candidate.riskPoints <= TRADE_RULES.maxRiskPoints ? 10 :
    -20;
  const clarityScore =
    ((candidate.entryClarity || 0) + (candidate.stopClarity || 0) + (candidate.targetClarity || 0)) * 10;
  const score =
    executionScore +
    confidenceScore +
    candidate.priority +
    riskQuality +
    clarityScore +
    (candidate.levelContextScore || 0) +
    (candidate.proximityScore || 0) * 10;
  candidate.rankScore = score;
  return score;
}

export function scanSetupCandidates(input: SetupScannerInput): SetupScanResult {
  const text = buildSearchText(input);
  const candidates = SETUP_REGISTRY
    .map((entry) => candidateForEntry(entry, input, text))
    .sort((a, b) => rankSetupCandidate(b) - rankSetupCandidate(a));

  const bestExecutableCandidate = candidates.find((candidate) => candidate.executionStatus === ExecutionStatus.Executable) || null;
  const bestConditionalCandidate = candidates.find((candidate) => candidate.executionStatus === ExecutionStatus.Conditional) || null;

  return {
    candidates,
    bestExecutableCandidate,
    bestConditionalCandidate,
  };
}

export function getScannedSetupTypes(): SetupType[] {
  return SETUP_REGISTRY.map((entry) => entry.setupType);
}
