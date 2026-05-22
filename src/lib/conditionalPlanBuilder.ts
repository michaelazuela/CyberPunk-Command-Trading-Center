import {
  ChartContext,
  ExecutionStatus,
  NoTradeReason,
  MissingLevelRequirement,
  SetupCandidate,
  SetupCandidateStatus,
  SetupType,
} from '../types';
import { targetsFromEntryStop, TRADE_RULES } from '../config/tradeRules';

type Direction = SetupCandidate['direction'];
const PRIMARY_MODEL_SETUP_TYPES = new Set<SetupType>([SetupType.SweepMssFvgRetrace, SetupType.TurtleSoup]);

interface FailedReclaimShortReference {
  reference: number;
  entry: number;
  stop: number;
  triggerCandleClose: number;
  triggerCandleHigh: number;
  protectedHigh: number;
  timestamp?: string | null;
}

interface ReclaimLongReference {
  reference: number;
  entry: number;
  stop: number;
  triggerCandleClose: number;
  triggerCandleLow: number;
  triggerCandleHigh: number;
  protectedLow: number;
  timestamp?: string | null;
}

interface OpeningRangeContinuationReference {
  direction: Exclude<Direction, 'NO TRADE'>;
  reference: number;
  entry: number;
  stop: number;
  trigger: string;
  invalidation: string;
  protectedLevel: number;
}

interface ImbalancePullbackReference {
  direction: Exclude<Direction, 'NO TRADE'>;
  zoneLabel: string;
  entry: number;
  stop: number;
  reference: number;
  trigger: string;
  invalidation: string;
}

interface IctModelOneReference {
  direction: Exclude<Direction, 'NO TRADE'>;
  zoneLabel: string;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  risk: number;
  trigger: string;
  invalidation: string;
  evidence: string[];
}

interface TurtleSoupReference {
  direction: Exclude<Direction, 'NO TRADE'>;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  risk: number;
  referenceLevel: number;
  sweepExtreme: number;
  trigger: string;
  invalidation: string;
  evidence: string[];
  confidence: SetupCandidate['confidence'];
  hasConfirmation: boolean;
}

interface CompressionRangeReference {
  high: number;
  low: number;
  breakoutDirection: Direction;
  confidence: SetupCandidate['confidence'];
}

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
  const computedTargets = targetsFromEntryStop(direction, entry, stop);
  if ((direction !== 'LONG' && direction !== 'SHORT') || !isPrice(entry) || !isPrice(stop) || computedTargets.target1 === null || computedTargets.target2 === null) {
    return { target1: null, target2: null };
  }
  return computedTargets;
}

function rTarget(direction: Exclude<Direction, 'NO TRADE'>, entry: number, risk: number, multiple: number): number {
  return roundToTick(direction === 'LONG' ? entry + risk * multiple : entry - risk * multiple);
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

function readableCandles(chartContext: ChartContext) {
  return (chartContext.candles || [])
    .filter((candle) =>
      candle.confidence !== 'Low' &&
      candle.confidence !== 'Unreadable' &&
      isPrice(candle.open) &&
      isPrice(candle.high) &&
      isPrice(candle.low) &&
      isPrice(candle.close)
    )
    .sort((a, b) => a.index - b.index);
}

function detectFailedReclaimShort(chartContext: ChartContext): FailedReclaimShortReference | null {
  const candles = readableCandles(chartContext);
  const tick = TRADE_RULES.targetModel.tickSize;
  if (candles.length < 2) return null;

  const recent = candles.slice(-8);
  const matches: FailedReclaimShortReference[] = [];
  for (let index = recent.length - 1; index >= 1; index -= 1) {
    const trigger = recent[index];
    const prior = recent[index - 1];
    const priorClose = prior.close as number;
    const triggerClose = trigger.close as number;
    const triggerHigh = trigger.high as number;
    const priorHigh = prior.high as number;
    const priorOpen = prior.open as number;
    const triggerOpen = trigger.open as number;
    const bearishCloseThroughPriorClose = triggerClose <= priorClose - tick;
    const priorReclaimedHigher = priorClose >= priorOpen || priorHigh > priorClose + tick;
    const triggerRejected = trigger.direction === 'bearish' || triggerClose < triggerOpen;

    if (!bearishCloseThroughPriorClose || !priorReclaimedHigher || !triggerRejected) continue;

    const localProtectedHigh = Math.max(
      priorHigh,
      triggerHigh,
      ...recent.slice(Math.max(0, index - 3), index + 1).map((candle) => candle.high as number)
    );

    matches.push({
      reference: roundToTick(priorClose),
      entry: roundToTick(priorClose - tick),
      stop: roundToTick(localProtectedHigh + tick),
      triggerCandleClose: roundToTick(triggerClose),
      triggerCandleHigh: roundToTick(triggerHigh),
      protectedHigh: roundToTick(localProtectedHigh),
      timestamp: trigger.timestamp,
    });
  }

  return matches.sort((a, b) => b.reference - a.reference)[0] || null;
}

function detectMorningReclaimLong(chartContext: ChartContext): ReclaimLongReference | null {
  const candles = readableCandles(chartContext);
  const tick = TRADE_RULES.targetModel.tickSize;
  if (candles.length < 2) return null;

  const recent = candles.slice(-8);
  const matches: ReclaimLongReference[] = [];
  for (let index = recent.length - 1; index >= 1; index -= 1) {
    const trigger = recent[index];
    const prior = recent[index - 1];
    const priorClose = prior.close as number;
    const triggerClose = trigger.close as number;
    const triggerLow = trigger.low as number;
    const triggerHigh = trigger.high as number;
    const priorLow = prior.low as number;
    const priorOpen = prior.open as number;
    const triggerOpen = trigger.open as number;
    const bullishCloseThroughPriorClose = triggerClose >= priorClose + tick;
    const priorFailedLower = priorClose <= priorOpen || priorLow < priorClose - tick;
    const triggerReclaimed = trigger.direction === 'bullish' || triggerClose > triggerOpen;

    if (!bullishCloseThroughPriorClose || !priorFailedLower || !triggerReclaimed) continue;

    const localProtectedLow = Math.min(
      priorLow,
      triggerLow,
      ...recent.slice(Math.max(0, index - 3), index + 1).map((candle) => candle.low as number)
    );

    matches.push({
      reference: roundToTick(priorClose),
      entry: roundToTick(triggerHigh + tick),
      stop: roundToTick(localProtectedLow - tick),
      triggerCandleClose: roundToTick(triggerClose),
      triggerCandleLow: roundToTick(triggerLow),
      triggerCandleHigh: roundToTick(triggerHigh),
      protectedLow: roundToTick(localProtectedLow),
      timestamp: trigger.timestamp,
    });
  }

  return matches.sort((a, b) => b.reference - a.reference)[0] || null;
}

function detectMorningOpeningRangeContinuation(chartContext: ChartContext): OpeningRangeContinuationReference | null {
  const candles = readableCandles(chartContext);
  const { openingRangeHigh, openingRangeLow } = chartContext.keyLevels;
  const tick = TRADE_RULES.targetModel.tickSize;
  if (!isPrice(openingRangeHigh) || !isPrice(openingRangeLow) || candles.length < 2) return null;

  const recent = candles.slice(-8);
  const longRetest = recent
    .filter((candle) =>
      (candle.low as number) <= openingRangeHigh + tick &&
      (candle.close as number) >= openingRangeHigh &&
      (candle.high as number) > openingRangeHigh
    )
    .sort((a, b) => b.index - a.index)[0];
  if (longRetest) {
    const protectedLow = Math.min(longRetest.low as number, ...recent.slice(-4).map((candle) => candle.low as number));
    return {
      direction: 'LONG',
      reference: roundToTick(openingRangeHigh),
      entry: roundToTick((longRetest.high as number) + tick),
      stop: roundToTick(protectedLow - tick),
      trigger: `5M close above opening range high ${roundToTick(openingRangeHigh)}, then retest holds.`,
      invalidation: `Invalid if price fails back below the opening range retest structure near ${roundToTick(protectedLow - tick)}.`,
      protectedLevel: roundToTick(protectedLow),
    };
  }

  const shortRetest = recent
    .filter((candle) =>
      (candle.high as number) >= openingRangeLow - tick &&
      (candle.close as number) <= openingRangeLow &&
      (candle.low as number) < openingRangeLow
    )
    .sort((a, b) => b.index - a.index)[0];
  if (shortRetest) {
    const protectedHigh = Math.max(shortRetest.high as number, ...recent.slice(-4).map((candle) => candle.high as number));
    return {
      direction: 'SHORT',
      reference: roundToTick(openingRangeLow),
      entry: roundToTick((shortRetest.low as number) - tick),
      stop: roundToTick(protectedHigh + tick),
      trigger: `5M close below opening range low ${roundToTick(openingRangeLow)}, then retest fails.`,
      invalidation: `Invalid if price reclaims the opening range retest structure near ${roundToTick(protectedHigh + tick)}.`,
      protectedLevel: roundToTick(protectedHigh),
    };
  }

  return null;
}

function detectImbalancePullback(chartContext: ChartContext): ImbalancePullbackReference | null {
  const candles = readableCandles(chartContext);
  const zones = (chartContext.fvgZones || [])
    .filter((zone) => confidenceIsReadable(zone.confidence) && isPrice(zone.upper) && isPrice(zone.lower))
    .sort((a, b) => {
      const aScore = (a.reclaimed ? 2 : 0) + (a.filledPercent !== null && a.filledPercent !== undefined && a.filledPercent > 0 ? 1 : 0);
      const bScore = (b.reclaimed ? 2 : 0) + (b.filledPercent !== null && b.filledPercent !== undefined && b.filledPercent > 0 ? 1 : 0);
      return bScore - aScore;
    });
  const zone = zones[0];
  if (!zone || candles.length < 1) return null;

  const tick = TRADE_RULES.targetModel.tickSize;
  const lower = roundToTick(zone.lower as number);
  const upper = roundToTick(zone.upper as number);
  const midpoint = roundToTick(zone.midpoint ?? (upper + lower) / 2);
  const recent = candles.slice(-6);

  if (zone.direction === 'LONG') {
    const reclaim = recent.find((candle) =>
      (candle.low as number) <= upper &&
      (candle.close as number) >= midpoint &&
      (candle.direction === 'bullish' || candle.isReclaim)
    );
    const protectedLow = Math.min(lower, ...recent.map((candle) => candle.low as number));
    const entryReference = reclaim ? (reclaim.high as number) : midpoint;
    return {
      direction: 'LONG',
      zoneLabel: `${lower}-${upper} Imbalance Zone`,
      reference: midpoint,
      entry: roundToTick(entryReference + tick),
      stop: roundToTick(protectedLow - tick),
      trigger: `5M reclaim out of ${lower}-${upper} imbalance zone, then break the pullback candle high.`,
      invalidation: `Invalid if the imbalance hold fails below protected structure near ${roundToTick(protectedLow - tick)}.`,
    };
  }

  const rejection = recent.find((candle) =>
    (candle.high as number) >= lower &&
    (candle.close as number) <= midpoint &&
    (candle.direction === 'bearish' || candle.isRejection)
  );
  const protectedHigh = Math.max(upper, ...recent.map((candle) => candle.high as number));
  const entryReference = rejection ? (rejection.low as number) : midpoint;
  return {
    direction: 'SHORT',
    zoneLabel: `${lower}-${upper} Imbalance Zone`,
    reference: midpoint,
    entry: roundToTick(entryReference - tick),
    stop: roundToTick(protectedHigh + tick),
    trigger: `5M rejection from ${lower}-${upper} imbalance zone, then break the pullback candle low.`,
    invalidation: `Invalid if price reclaims above protected imbalance structure near ${roundToTick(protectedHigh + tick)}.`,
  };
}

function priceInZone(price: number, lower: number, upper: number): boolean {
  return price >= Math.min(lower, upper) && price <= Math.max(lower, upper);
}

function candleTouchesZone(candle: ReturnType<typeof readableCandles>[number], lower: number, upper: number): boolean {
  return (
    isPrice(candle.high) &&
    isPrice(candle.low) &&
    (candle.low as number) <= Math.max(lower, upper) &&
    (candle.high as number) >= Math.min(lower, upper)
  );
}

function intervalOverlap(
  breakerLow: number,
  breakerHigh: number,
  fvgLow: number,
  fvgHigh: number
): { valid: boolean; low: number; high: number } {
  const overlapLow = Math.max(Math.min(breakerLow, breakerHigh), Math.min(fvgLow, fvgHigh));
  const overlapHigh = Math.min(Math.max(breakerLow, breakerHigh), Math.max(fvgLow, fvgHigh));
  return { valid: overlapLow < overlapHigh, low: roundToTick(overlapLow), high: roundToTick(overlapHigh) };
}

function breakerFvgConfluence(
  chartContext: ChartContext,
  direction: Exclude<Direction, 'NO TRADE'>,
  entry: number | null,
  zone?: { lower?: number | null; upper?: number | null } | null
): string | null {
  if (!isPrice(entry)) return null;
  const fvgZones = zone
    ? [zone]
    : (chartContext.fvgZones || []).filter((item) => item.direction === direction && item.impulseQualified !== false);
  const breakerZones = chartContext.breakerZones || [];
  for (const breaker of breakerZones) {
    if (breaker.direction !== direction || !confidenceIsReadable(breaker.confidence) || !isPrice(breaker.lower) || !isPrice(breaker.upper)) continue;
    for (const fvg of fvgZones) {
      if (!isPrice(fvg.lower) || !isPrice(fvg.upper)) continue;
      const overlap = intervalOverlap(breaker.lower, breaker.upper, fvg.lower, fvg.upper);
      if (overlap.valid && priceInZone(entry, overlap.low, overlap.high)) {
        return `Breaker/FVG confluence: price retraced into ${overlap.low}-${overlap.high} overlap zone.`;
      }
    }
  }
  return null;
}

function improveConfidence(confidence: SetupCandidate['confidence'], confluence: string | null): SetupCandidate['confidence'] {
  if (!confluence) return confidence;
  if (confidence === 'Low') return 'Medium';
  if (confidence === 'Medium') return 'High';
  return confidence;
}

function targetBeyondEntry(chartContext: ChartContext, direction: Exclude<Direction, 'NO TRADE'>, entry: number, minimumTarget: number): number {
  const candidates = [
    ...(chartContext.targetObjectives || [])
      .filter((target) => target.direction === direction)
      .map((target) => target.price),
    ...(chartContext.structuralLevels || [])
      .filter((level) =>
        (level.directionRelevance === direction || level.directionRelevance === 'BOTH') &&
        (level.type === 'liquidity_pool' || level.type === 'swing' || level.type === 'high' || level.type === 'low')
      )
      .map((level) => level.price),
    direction === 'LONG' ? chartContext.keyLevels.activeSwingHigh : chartContext.keyLevels.activeSwingLow,
    direction === 'LONG' ? chartContext.keyLevels.overnightHigh : chartContext.keyLevels.overnightLow,
  ].filter(isPrice);

  const directional = direction === 'LONG'
    ? candidates.filter((price) => price >= minimumTarget && price > entry).sort((a, b) => a - b)
    : candidates.filter((price) => price <= minimumTarget && price < entry).sort((a, b) => b - a);

  return roundToTick(directional[0] || minimumTarget);
}

function candleAfterTimestamp(candles: ReturnType<typeof readableCandles>, timestamp?: string | null) {
  const index = candles.findIndex((candle) => candle.timestamp === timestamp);
  return index >= 0 ? candles[index + 1] || null : null;
}

function reclaimConfirmationCandle(
  candles: ReturnType<typeof readableCandles>,
  direction: Exclude<Direction, 'NO TRADE'>,
  level: number,
  timestamp?: string | null
) {
  const startIndex = candles.findIndex((candle) => candle.timestamp === timestamp);
  const search = candles.slice(Math.max(0, startIndex));
  return search.find((candle) =>
    direction === 'LONG'
      ? (candle.close as number) > level
      : (candle.close as number) < level
  ) || null;
}

function wickRejectionSupport(
  candle: ReturnType<typeof readableCandles>[number] | null | undefined,
  direction: Exclude<Direction, 'NO TRADE'>,
  sweptLevel: number
): { present: boolean; label: string | null } {
  if (!candle || !isPrice(candle.open) || !isPrice(candle.high) || !isPrice(candle.low) || !isPrice(candle.close)) {
    return { present: false, label: null };
  }
  const body = Math.max(Math.abs(candle.close - candle.open), TRADE_RULES.targetModel.tickSize);
  const range = candle.high - candle.low;
  if (range <= 0) return { present: false, label: null };

  const upperWick = candle.high - Math.max(candle.open, candle.close);
  const lowerWick = Math.min(candle.open, candle.close) - candle.low;
  const closeLocation = (candle.close - candle.low) / range;
  const bullish =
    direction === 'LONG' &&
    candle.low < sweptLevel &&
    candle.close > sweptLevel &&
    lowerWick >= body * 1.5 &&
    closeLocation >= 0.5;
  const bearish =
    direction === 'SHORT' &&
    candle.high > sweptLevel &&
    candle.close < sweptLevel &&
    upperWick >= body * 1.5 &&
    closeLocation <= 0.5;

  if (!bullish && !bearish) return { present: false, label: null };
  const wickSize = direction === 'LONG' ? lowerWick : upperWick;
  return {
    present: true,
    label: direction === 'LONG'
      ? `Wick rejection support: lower wick ${roundToTick(wickSize)} is at least 1.5x body, swept sell-side liquidity, and closed back above ${roundToTick(sweptLevel)}.`
      : `Wick rejection support: upper wick ${roundToTick(wickSize)} is at least 1.5x body, swept buy-side liquidity, and closed back below ${roundToTick(sweptLevel)}.`,
  };
}

function detectTurtleSoup(chartContext: ChartContext): TurtleSoupReference[] {
  const candles = readableCandles(chartContext);
  const tick = TRADE_RULES.targetModel.tickSize;
  if (candles.length < 3) return [];

  const displacements = chartContext.displacementCandles || [];
  const structureShift = Boolean(chartContext.marketStructure?.marketStructureShift || chartContext.setupReadyFacts?.breakOfStructure);
  const sweeps = (chartContext.liquiditySweeps || chartContext.liquidityEvents || [])
    .filter((event) => event.type === 'sweep' && event.reclaimed && confidenceIsReadable(event.confidence) && isPrice(event.level));

  return sweeps.flatMap((sweep): TurtleSoupReference[] => {
    const direction = sweep.direction === 'LONG' ? 'LONG' : sweep.direction === 'SHORT' ? 'SHORT' : null;
    if (!direction || !isPrice(sweep.level)) return [];

    const sweepCandle = candles.find((candle) => candle.timestamp === sweep.timestamp);
    const wickSupport = wickRejectionSupport(sweepCandle, direction, sweep.level);
    const confirmation = reclaimConfirmationCandle(candles, direction, sweep.level, sweep.timestamp);
    const next = candleAfterTimestamp(candles, sweep.timestamp);
    const matchingDisplacement = displacements.find((item) =>
      item.direction === direction &&
      (item.quality === 'confirmed' || item.quality === 'high_quality')
    );
    const confirmsReversal = Boolean(
      confirmation ||
      (next && (direction === 'LONG' ? next.direction === 'bullish' : next.direction === 'bearish')) ||
      matchingDisplacement ||
      structureShift
    );
    if (!confirmsReversal) return [];

    const sweepExtreme = direction === 'LONG'
      ? firstPrice(sweepCandle?.low, sweep.level, chartContext.keyLevels.activeSwingLow)
      : firstPrice(sweepCandle?.high, sweep.level, chartContext.keyLevels.activeSwingHigh);
    if (!isPrice(sweepExtreme)) return [];

    const entry = direction === 'LONG'
      ? firstPrice(confirmation?.close, roundToTick(sweep.level + tick))
      : firstPrice(confirmation?.close, roundToTick(sweep.level - tick));
    if (!isPrice(entry)) return [];

    const stop = direction === 'LONG'
      ? roundToTick(sweepExtreme - tick)
      : roundToTick(sweepExtreme + tick);
    const risk = riskPoints(entry, stop);
    if (!isPrice(risk)) return [];

    const minimumTarget = rTarget(direction, entry, risk, 2);
    const target1 = targetBeyondEntry(chartContext, direction, entry, minimumTarget);
    const reward = Math.abs(target1 - entry);
    if (reward / risk < 2) return [];
    const target2 = targetBeyondEntry(chartContext, direction, entry, rTarget(direction, entry, risk, 2.5));
    const confluence = breakerFvgConfluence(chartContext, direction, entry);
    const baseConfidence: SetupCandidate['confidence'] = matchingDisplacement && structureShift ? 'High' : matchingDisplacement || structureShift ? 'Medium' : 'Low';
    const confidence = improveConfidence(baseConfidence, confluence);
    const breakoutText = direction === 'LONG' ? 'failed breakdown reversal' : 'failed breakout reversal';

    return [{
      direction,
      entry: roundToTick(entry),
      stop,
      target1,
      target2,
      risk,
      referenceLevel: roundToTick(sweep.level),
      sweepExtreme: roundToTick(sweepExtreme),
      trigger: direction === 'LONG'
        ? `Bullish Turtle Soup: sell-side sweep below ${roundToTick(sweep.level)}, reclaim back above the swept low, then confirm upward rejection or expansion.`
        : `Bearish Turtle Soup: buy-side sweep above ${roundToTick(sweep.level)}, reclaim back below the swept high, then confirm downward rejection or expansion.`,
      invalidation: direction === 'LONG'
        ? `Invalid if price trades below the sweep wick structure stop near ${stop}.`
        : `Invalid if price trades above the sweep wick structure stop near ${stop}.`,
      evidence: [
        `${direction === 'LONG' ? 'Sell-side' : 'Buy-side'} liquidity was swept and reclaimed.`,
        wickSupport.label || 'No qualifying wick rejection support; wick evidence is optional and cannot trigger by itself.',
        confluence || 'No breaker/FVG overlap confluence; breaker context is optional and cannot trigger by itself.',
        `Turtle Soup ${breakoutText} target room passes the minimum 2.0R expected-value filter.`,
        matchingDisplacement
          ? `${direction === 'LONG' ? 'Bullish' : 'Bearish'} expansion confirms the reversal attempt.`
          : 'Expansion is not fully confirmed; keep as conditional until price confirms.',
        structureShift
          ? 'Market structure shift supports the reversal.'
          : 'Market structure shift is not fully confirmed; this remains a watchlist/conditional reversal.',
        `Stop ${stop} is beyond the sweep wick; target ${target1} is opposing liquidity or a valid 2.0R objective.`,
      ],
      confidence,
      hasConfirmation: Boolean(confirmation || matchingDisplacement),
    }];
  }).sort((a, b) => b.risk - a.risk).slice(0, 2);
}

function detectIctModelOne(chartContext: ChartContext): IctModelOneReference | null {
  const candles = readableCandles(chartContext);
  const tick = TRADE_RULES.targetModel.tickSize;
  if (candles.length < 4) return null;

  const sweeps = (chartContext.liquiditySweeps || chartContext.liquidityEvents || [])
    .filter((event) => event.type === 'sweep' && event.reclaimed && confidenceIsReadable(event.confidence) && isPrice(event.level));
  const displacements = (chartContext.displacementCandles || [])
    .filter((candle) =>
      (candle.quality === 'confirmed' || candle.quality === 'high_quality') &&
      candle.breaksStructure &&
      candle.leavesImbalance
    );
  const fvgZones = (chartContext.fvgZones || [])
    .filter((zone) => zone.impulseQualified !== false && confidenceIsReadable(zone.confidence) && isPrice(zone.upper) && isPrice(zone.lower));

  const candidates: IctModelOneReference[] = [];

  for (const sweep of sweeps) {
    const direction = sweep.direction === 'LONG' ? 'LONG' : sweep.direction === 'SHORT' ? 'SHORT' : null;
    if (!direction) continue;
    const matchingDisplacement = displacements.find((item) => item.direction === direction);
    const zone = fvgZones.find((item) => item.direction === direction);
    if (!matchingDisplacement || !zone) continue;

    const lower = roundToTick(Math.min(zone.lower as number, zone.upper as number));
    const upper = roundToTick(Math.max(zone.lower as number, zone.upper as number));
    const midpoint = roundToTick(zone.midpoint ?? (lower + upper) / 2);
    const formedIndex = typeof zone.formedCandleIndex === 'number' ? zone.formedCandleIndex : -1;
    const retraceCandle = candles.find((candle) => candle.index > formedIndex && candleTouchesZone(candle, lower, upper));
    if (!retraceCandle) continue;

    const entry = priceInZone(midpoint, lower, upper) ? midpoint : direction === 'LONG' ? lower : upper;
    const sweepCandle = candles.find((candle) => candle.timestamp === sweep.timestamp);
    const sweepExtreme = direction === 'LONG'
      ? firstPrice(sweepCandle?.low, chartContext.keyLevels.activeSwingLow, sweep.level)
      : firstPrice(sweepCandle?.high, chartContext.keyLevels.activeSwingHigh, sweep.level);
    if (!isPrice(sweepExtreme)) continue;
    const stop = direction === 'LONG'
      ? roundToTick(sweepExtreme - tick)
      : roundToTick(sweepExtreme + tick);
    const risk = riskPoints(entry, stop);
    if (!isPrice(risk)) continue;
    const minimumTarget = rTarget(direction, entry, risk, 2);
    const target1 = targetBeyondEntry(chartContext, direction, entry, minimumTarget);
    const reward = Math.abs(target1 - entry);
    if (reward / risk < 2) continue;
    const target2 = targetBeyondEntry(chartContext, direction, entry, rTarget(direction, entry, risk, 2.5));
    const confluence = breakerFvgConfluence(chartContext, direction, entry, zone);

    candidates.push({
      direction,
      zoneLabel: `${lower}-${upper} Imbalance Zone`,
      entry: roundToTick(entry),
      stop,
      target1,
      target2,
      risk,
      trigger: direction === 'LONG'
        ? `Entry only on retrace into bullish imbalance ${lower}-${upper} after sweep, reclaim, displacement, and bullish structure shift.`
        : `Entry only on retrace into bearish imbalance ${lower}-${upper} after sweep, reclaim, displacement, and bearish structure shift.`,
      invalidation: direction === 'LONG'
        ? `Invalid if price trades below the sweep low structure stop near ${stop}.`
        : `Invalid if price trades above the sweep high structure stop near ${stop}.`,
      evidence: [
        direction === 'LONG' ? 'Sell-side liquidity swept and reclaimed.' : 'Buy-side liquidity swept and reclaimed.',
        wickRejectionSupport(sweepCandle, direction, sweep.level).label || 'Wick support was not required; the model still requires displacement, structure shift, and imbalance retrace.',
        confluence || 'No breaker/FVG overlap confluence; Model 1 qualification still comes from sweep, reclaim, displacement, structure shift, and imbalance retrace.',
        `${direction === 'LONG' ? 'Bullish' : 'Bearish'} displacement confirmed with market structure shift.`,
        `${direction === 'LONG' ? 'Bullish' : 'Bearish'} impulse-qualified imbalance created and retraced.`,
        `Entry ${roundToTick(entry)} sits inside ${lower}-${upper}; stop ${stop} is beyond the sweep wick.`,
        `Minimum 2.0R target requirement passed; target ${target1}.`,
      ],
    });
  }

  return candidates.sort((a, b) => b.risk - a.risk)[0] || null;
}

function deriveCompressionRangeFromRecentBars(chartContext: ChartContext): CompressionRangeReference | null {
  const candles = readableCandles(chartContext);
  if (chartContext.compressionRange?.present && isPrice(chartContext.compressionRange.high) && isPrice(chartContext.compressionRange.low)) {
    return {
      high: chartContext.compressionRange.high as number,
      low: chartContext.compressionRange.low as number,
      breakoutDirection: chartContext.compressionRange.breakoutDirection || 'NO TRADE',
      confidence: confidenceIsReadable(chartContext.compressionRange.confidence) ? 'Medium' : 'Low',
    };
  }
  if (candles.length < 8) return null;
  const compression = candles.slice(-8, -1);
  const trigger = candles[candles.length - 1];
  const high = Math.max(...compression.map((candle) => candle.high as number));
  const low = Math.min(...compression.map((candle) => candle.low as number));
  const range = high - low;
  const averageRange = compression.reduce((sum, candle) => sum + ((candle.high as number) - (candle.low as number)), 0) / compression.length;
  const isTight = range <= averageRange * 2.4;
  const breakoutDirection =
    (trigger.close as number) > high ? 'LONG' :
    (trigger.close as number) < low ? 'SHORT' :
    'NO TRADE';
  if (!isTight && breakoutDirection === 'NO TRADE') return null;
  return {
    high: roundToTick(high),
    low: roundToTick(low),
    breakoutDirection,
    confidence: isTight ? 'Medium' : 'Low',
  };
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
  target1Override?: number | null;
  target2Override?: number | null;
}): SetupCandidate {
  const structureStop = isPrice(input.stop) ? roundToTick(input.stop) : null;
  const risk = riskPoints(input.entry, structureStop);
  const computedTargets = targets(input.direction, input.entry, structureStop);
  const target1 = input.target1Override ?? computedTargets.target1;
  const target2 = input.target2Override ?? computedTargets.target2;
  const execution = executionFor(input.entry, structureStop, Boolean(input.hasTrigger), Boolean(input.invalidation));
  const levelContext = levelContextForDirection(input.chartContext, input.direction);

  return {
    setupType: input.setupType,
    scenarioLabel: input.scenarioLabel ?? null,
    direction: input.direction,
    detectedStatus: SetupCandidateStatus.Conditional,
    confidence: input.confidence || 'Medium',
    priority: input.priority,
    entry: input.entry,
    stop: structureStop,
    target1,
    target2,
    riskPoints: risk,
    invalidation: input.invalidation,
    entryClarity: isPrice(input.entry) ? 0.8 : 0.35,
    stopClarity: isPrice(input.stop) ? 0.8 : 0.35,
    targetClarity: target1 !== null && target2 !== null ? 0.8 : 0,
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
  const failedReclaimShort = detectFailedReclaimShort(chartContext);
  const breakdownSupport = firstPrice(failedReclaimShort?.reference, support);
  const rejectionEvidence = Boolean(
    failedReclaimShort ||
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
  const reclaimLong = detectMorningReclaimLong(chartContext);
  const openingRangeContinuation = detectMorningOpeningRangeContinuation(chartContext);
  const imbalancePullback = detectImbalancePullback(chartContext);
  const ictModelOne = detectIctModelOne(chartContext);
  const turtleSoupPlans = detectTurtleSoup(chartContext);

  const plans: SetupCandidate[] = [];

  for (const turtleSoup of turtleSoupPlans) {
    plans.push(makeCandidate({
      chartContext,
      setupType: SetupType.TurtleSoup,
      scenarioLabel: `${turtleSoup.direction === 'LONG' ? 'Bullish' : 'Bearish'} Turtle Soup Reversal`,
      direction: turtleSoup.direction,
      entry: turtleSoup.entry,
      stop: turtleSoup.stop,
      priority: 96,
      confidence: turtleSoup.confidence,
      evidence: turtleSoup.evidence,
      requiredTrigger: turtleSoup.trigger,
      nextAction: 'Preferred plan: take only the reclaim-confirmed reversal or the retrace after expansion; do not chase the first reversal candle.',
      invalidation: turtleSoup.invalidation,
      hasTrigger: turtleSoup.hasConfirmation,
      target1Override: turtleSoup.target1,
      target2Override: turtleSoup.target2,
    }));
  }

  if (ictModelOne) {
    plans.push(makeCandidate({
      chartContext,
      setupType: SetupType.SweepMssFvgRetrace,
      scenarioLabel: `ICT Model 1 ${ictModelOne.direction === 'LONG' ? 'Long' : 'Short'}: Sweep Reclaim Imbalance Retrace`,
      direction: ictModelOne.direction,
      entry: ictModelOne.entry,
      stop: ictModelOne.stop,
      priority: 98,
      confidence: 'High',
      evidence: ictModelOne.evidence,
      requiredTrigger: ictModelOne.trigger,
      nextAction: 'Preferred plan: execute only from the imbalance retrace after sweep, reclaim, displacement, and structure shift are confirmed.',
      invalidation: ictModelOne.invalidation,
      hasTrigger: true,
      target1Override: ictModelOne.target1,
      target2Override: ictModelOne.target2,
    }));
  }

  if (rejectionEvidence || resistance || support) {
    const entry = firstPrice(failedReclaimShort?.entry, breakdownSupport ? roundToTick(breakdownSupport - TRADE_RULES.targetModel.tickSize) : null);
    const stop = firstPrice(failedReclaimShort?.stop, resistance ? roundToTick(resistance + TRADE_RULES.targetModel.tickSize) : null);
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
        failedReclaimShort
          ? `Failed reclaim reference: ${failedReclaimShort.reference}; completed 5M candle closed at ${failedReclaimShort.triggerCandleClose}.`
          : 'Failed reclaim reference not confirmed from completed candles.',
        failedReclaimShort
          ? `Protected failed-structure high: ${failedReclaimShort.protectedHigh}.`
          : resistance ? `Failed high / resistance reference: ${resistance}.` : 'Failed high / resistance reference not confirmed.',
        breakdownSupport ? `Breakdown trigger reference: ${breakdownSupport}.` : 'Breakdown trigger reference not confirmed.',
      ],
      missingEvidence: [
        !breakdownSupport ? 'Support/reclaim breakdown level is missing.' : '',
        !stop ? 'Failed high / swing high stop reference is missing.' : '',
      ].filter(Boolean),
      missingLevels: [
        !breakdownSupport ? missingLevel('breakdownLevel', 'Breakdown / reclaim support level', 'Needed to define the short trigger and ENTRY.', 'entry') : null,
        !stop ? missingLevel('failedHigh', 'Failed high / swing high', 'Needed to place the short STOP above the failed high.', 'stop') : null,
        !(failedReclaimShort || chartContext.candleFacts?.closeBelowKeyLevel === true) ? missingLevel('triggerCandleLow', '5M close below failed reclaim level', 'Needed before this short can become executable.', 'trigger') : null,
      ].filter(Boolean) as MissingLevelRequirement[],
      requiredTrigger: failedReclaimShort
        ? `5M close below failed reclaim level (${failedReclaimShort.reference}).`
        : breakdownSupport ? `5M close below ${breakdownSupport}.` : '5M close below the active reclaim/support area.',
      nextAction: failedReclaimShort
        ? `Preferred plan: short the failed retest of ${failedReclaimShort.reference}; do not chase if price is already extended toward the target.`
        : 'Wait for failed hold above resistance, then confirm breakdown below reclaim/support before shorting.',
      invalidation: stop ? `Invalid if price reclaims and holds above protected structure near ${stop}.` : 'Invalid if price reclaims the failed high.',
      hasTrigger: Boolean(failedReclaimShort || chartContext.candleFacts?.closeBelowKeyLevel === true),
    }));
  }

  if (reclaimEvidence || reclaimLong || resistance || support) {
    const entryBase = firstPrice(reclaimLong?.entry, reclaimResistance ? roundToTick(reclaimResistance + TRADE_RULES.targetModel.tickSize) : null, levels.triggerCandleHigh);
    const entry = entryBase ? roundToTick(entryBase) : null;
    const stop = firstPrice(reclaimLong?.stop, reclaimStop ? roundToTick(reclaimStop) : null);
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
        reclaimLong
          ? `Completed 5M reclaim reference: ${reclaimLong.reference}; reclaim candle high: ${reclaimLong.triggerCandleHigh}.`
          : reclaimResistance ? `Reclaim reference: ${reclaimResistance}.` : 'Reclaim reference not confirmed.',
        reclaimLong
          ? `Protected reclaim swing low: ${reclaimLong.protectedLow}.`
          : reclaimStop ? `Pullback/support stop reference: ${reclaimStop}.` : 'Pullback/support stop reference not confirmed.',
        nyPremarketHighTarget ? `NY Premarket High target reference: ${nyPremarketHighTarget}.` : 'NY Premarket High target reference not confirmed.',
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
      requiredTrigger: reclaimLong
        ? `Break back above reclaim candle high (${reclaimLong.triggerCandleHigh}) after the pullback holds.`
        : reclaimResistance ? `5M close above reclaim level (${reclaimResistance}), then pullback holds.` : '5M close above reclaim level, then pullback holds.',
      nextAction: `Preferred plan: long the successful reclaim retest, not the breakout chase${reclaimTargetPhrase}.`,
      invalidation: stop ? `Invalid if reclaim level fails and price breaks back below protected structure near ${stop}.` : 'Invalid if reclaim level fails.',
      hasTrigger: Boolean(reclaimLong || chartContext.candleFacts?.closeAboveKeyLevel === true),
    }));
  }

  if (openingRangeContinuation) {
    plans.push(makeCandidate({
      chartContext,
      setupType: SetupType.MorningOpeningRangeContinuation,
      scenarioLabel: openingRangeContinuation.direction === 'LONG'
        ? 'Opening Range Retest Continuation Long'
        : 'Opening Range Retest Continuation Short',
      direction: openingRangeContinuation.direction,
      entry: openingRangeContinuation.entry,
      stop: openingRangeContinuation.stop,
      priority: 87,
      confidence: 'Medium',
      evidence: [
        'Morning builder detected an opening range continuation path.',
        `Opening range reference: ${openingRangeContinuation.reference}.`,
        `Protected retest structure: ${openingRangeContinuation.protectedLevel}.`,
      ],
      missingLevels: [],
      requiredTrigger: openingRangeContinuation.trigger,
      nextAction: 'Preferred plan: trade the opening range retest/reclaim, not the breakout chase.',
      invalidation: openingRangeContinuation.invalidation,
      hasTrigger: true,
    }));
  }

  if (imbalancePullback) {
    plans.push(makeCandidate({
      chartContext,
      setupType: SetupType.FvgImbalancePullback,
      scenarioLabel: `${imbalancePullback.direction === 'LONG' ? 'Long' : 'Short'} Imbalance Pullback`,
      direction: imbalancePullback.direction,
      entry: imbalancePullback.entry,
      stop: imbalancePullback.stop,
      priority: 86,
      confidence: 'Medium',
      evidence: [
        'Morning builder detected an imbalance pullback planning path.',
        `Imbalance reference: ${imbalancePullback.zoneLabel}.`,
      ],
      requiredTrigger: imbalancePullback.trigger,
      nextAction: 'Wait for continuation away from the imbalance retest; do not enter on a blind touch.',
      invalidation: imbalancePullback.invalidation,
      hasTrigger: Boolean(chartContext.setupReadyFacts?.fvgReclaimed || chartContext.candleFacts?.closeAboveKeyLevel || chartContext.candleFacts?.closeBelowKeyLevel),
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
  const compressionRange = deriveCompressionRangeFromRecentBars(chartContext);
  const compressionHigh = firstPrice(compressionRange?.high, levels.nearestResistance, levels.activeSwingHigh);
  const compressionLow = firstPrice(compressionRange?.low, levels.nearestSupport, levels.activeSwingLow);
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
  const hasCompletedMorningContext = Boolean(morning?.complete && morningHigh && morningLow);
  const imbalancePullback = detectImbalancePullback(chartContext);
  const ictModelOne = detectIctModelOne(chartContext);
  const turtleSoupPlans = detectTurtleSoup(chartContext);
  const plans: SetupCandidate[] = [];

  for (const turtleSoup of turtleSoupPlans) {
    plans.push(makeCandidate({
      chartContext,
      setupType: SetupType.TurtleSoup,
      scenarioLabel: `${turtleSoup.direction === 'LONG' ? 'Bullish' : 'Bearish'} Turtle Soup Reversal`,
      direction: turtleSoup.direction,
      entry: turtleSoup.entry,
      stop: turtleSoup.stop,
      priority: 96,
      confidence: turtleSoup.confidence,
      evidence: turtleSoup.evidence,
      missingEvidence: hasCompletedMorningContext ? [] : ['Completed Morning context is incomplete; keep this as conditional only.'],
      requiredTrigger: turtleSoup.trigger,
      nextAction: 'Preferred plan: take only the reclaim-confirmed reversal or the retrace after expansion; do not chase the first reversal candle.',
      invalidation: turtleSoup.invalidation,
      hasTrigger: hasCompletedMorningContext && turtleSoup.hasConfirmation,
      target1Override: turtleSoup.target1,
      target2Override: turtleSoup.target2,
    }));
  }

  if (ictModelOne) {
    plans.push(makeCandidate({
      chartContext,
      setupType: SetupType.SweepMssFvgRetrace,
      scenarioLabel: `ICT Model 1 ${ictModelOne.direction === 'LONG' ? 'Long' : 'Short'}: Sweep Reclaim Imbalance Retrace`,
      direction: ictModelOne.direction,
      entry: ictModelOne.entry,
      stop: ictModelOne.stop,
      priority: 98,
      confidence: 'High',
      evidence: ictModelOne.evidence,
      missingEvidence: hasCompletedMorningContext ? [] : ['Completed Morning context is incomplete; keep this as conditional only.'],
      requiredTrigger: ictModelOne.trigger,
      nextAction: 'Preferred plan: execute only from the imbalance retrace after sweep, reclaim, displacement, and structure shift are confirmed.',
      invalidation: ictModelOne.invalidation,
      hasTrigger: hasCompletedMorningContext,
      target1Override: ictModelOne.target1,
      target2Override: ictModelOne.target2,
    }));
  }

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

  if (compressionRange || chartContext.marketStructure?.compressionCondition) {
    const direction = compressionRange?.breakoutDirection && compressionRange.breakoutDirection !== 'NO TRADE'
      ? compressionRange.breakoutDirection
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
      confidence: compressionRange?.confidence || 'Low',
      evidence: [
        hasCompletedMorningContext
          ? 'Lunch builder reviewed compression breakout from completed Morning context.'
          : 'Lunch builder derived compression from recent completed 5M bars, but completed Morning context is still required for high quality.',
      ],
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

  if (imbalancePullback) {
    plans.push(makeCandidate({
      chartContext,
      setupType: SetupType.FvgImbalancePullback,
      scenarioLabel: `${imbalancePullback.direction === 'LONG' ? 'Long' : 'Short'} Imbalance Pullback`,
      direction: imbalancePullback.direction,
      entry: imbalancePullback.entry,
      stop: imbalancePullback.stop,
      priority: 86,
      confidence: 'Medium',
      evidence: [
        'Lunch builder detected an imbalance pullback planning path.',
        `Imbalance reference: ${imbalancePullback.zoneLabel}.`,
        hasCompletedMorningContext ? 'Completed Morning range context is available.' : 'Completed Morning range context is not complete.',
      ],
      missingEvidence: hasCompletedMorningContext ? [] : ['Completed Morning range context is missing.'],
      missingLevels: hasCompletedMorningContext ? [] : [
        missingLevel('morningHigh', 'Completed Morning high/low', 'Needed to validate Lunch imbalance pullback context.', 'context', 'morning_context'),
      ],
      requiredTrigger: imbalancePullback.trigger,
      nextAction: 'Wait for continuation away from the imbalance retest; do not enter on a blind touch.',
      invalidation: imbalancePullback.invalidation,
      hasTrigger: Boolean(hasCompletedMorningContext && (chartContext.setupReadyFacts?.fvgReclaimed || chartContext.candleFacts?.closeAboveKeyLevel || chartContext.candleFacts?.closeBelowKeyLevel)),
    }));
  }

  if (hasCompletedMorningContext && (reclaimEvidence || support || resistance)) {
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
        'Lunch conditional builder reviewed range-reclaim long path from completed Morning range context.',
        `Completed Morning range: ${morningLow}-${morningHigh}.`,
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

  if (hasCompletedMorningContext && (rejectionEvidence || support || resistance)) {
    const entryBase = firstPrice(support, compressionLow, levels.triggerCandleLow);
    const stopBase = firstPrice(resistance, compressionHigh, levels.triggerCandleHigh);
    const entry = entryBase ? roundToTick(entryBase - TRADE_RULES.targetModel.tickSize) : null;
    const stop = stopBase ? roundToTick(stopBase + TRADE_RULES.targetModel.tickSize) : null;
    plans.push(makeCandidate({
      chartContext,
      setupType: SetupType.LunchFailedContinuation,
      scenarioLabel: nyPremarketLowTarget
        ? 'Failed bullish continuation toward NY Premarket Low'
        : 'Failed bullish continuation',
      direction: 'SHORT',
      entry,
      stop,
      priority: 84,
      confidence: rejectionEvidence ? 'Medium' : 'Low',
      evidence: [
        'Lunch conditional builder reviewed failed bullish continuation short path from completed Morning context.',
        `Completed Morning range: ${morningLow}-${morningHigh}.`,
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

  if (hasCompletedMorningContext && (reclaimEvidence || support || resistance)) {
    const entryBase = firstPrice(resistance, compressionHigh, morningLow, levels.triggerCandleHigh);
    const stopBase = firstPrice(support, compressionLow, levels.triggerCandleLow);
    const entry = entryBase ? roundToTick(entryBase + TRADE_RULES.targetModel.tickSize) : null;
    const stop = stopBase ? roundToTick(stopBase - TRADE_RULES.targetModel.tickSize) : null;
    plans.push(makeCandidate({
      chartContext,
      setupType: SetupType.LunchFailedContinuation,
      scenarioLabel: nyPremarketHighTarget
        ? 'Failed bearish continuation toward NY Premarket High'
        : 'Failed bearish continuation',
      direction: 'LONG',
      entry,
      stop,
      priority: 84,
      confidence: reclaimEvidence ? 'Medium' : 'Low',
      evidence: [
        'Lunch conditional builder reviewed failed bearish continuation long path from completed Morning context.',
        `Completed Morning range: ${morningLow}-${morningHigh}.`,
        entryBase ? `Reclaim trigger reference: ${entryBase}.` : 'Reclaim trigger reference not confirmed.',
        nyPremarketHighTarget ? `NY Premarket High target reference: ${nyPremarketHighTarget}.` : 'NY Premarket High target reference not confirmed.',
        stopBase ? `Support / failed-low stop reference: ${stopBase}.` : 'Support / failed-low stop reference not confirmed.',
      ],
      missingEvidence: [
        !entryBase ? 'Reclaim or upper trigger level is missing.' : '',
        !stopBase ? 'Support / failed-low stop reference is missing.' : '',
      ].filter(Boolean),
      missingLevels: [
        !entryBase ? missingLevel('reclaimLevel', 'Lunch reclaim level after failed bearish continuation', 'Needed to define the long trigger and ENTRY.', 'entry') : null,
        !stopBase ? missingLevel('activeSwingLow', 'Lunch failed-continuation protected low', 'Needed to place the long STOP below structure.', 'stop') : null,
        chartContext.candleFacts?.closeAboveKeyLevel !== true ? missingLevel('triggerCandleHigh', '5M close above lunch reclaim level', 'Needed before this Lunch long can become executable.', 'trigger') : null,
      ].filter(Boolean) as MissingLevelRequirement[],
      requiredTrigger: entryBase ? `5M close above reclaim level (${entryBase}), then pullback holds.` : '5M close above the lunch reclaim level, then pullback holds.',
      nextAction: 'Wait for the failed bearish continuation to reclaim and retest; do not chase the first bounce.',
      invalidation: stopBase ? `Invalid if price loses the failed-continuation reclaim structure near ${stop}.` : 'Invalid if reclaim level fails.',
      hasTrigger: chartContext.candleFacts?.closeAboveKeyLevel === true || morning?.failedHoldBelowMorningLow === true,
    }));
  }

  return plans;
}

export function buildConditionalPlans(chartContext: ChartContext): SetupCandidate[] {
  if (chartContext.screenshotUsability === 'unusable') return [];
  const sessionType = chartContext.sessionType;
  if (sessionType === 'morning' || sessionType === 'replay_morning') {
    return buildMorningPlans(chartContext).filter((candidate) => PRIMARY_MODEL_SETUP_TYPES.has(candidate.setupType));
  }
  if (sessionType === 'lunch' || sessionType === 'replay_lunch') {
    return buildLunchPlans(chartContext).filter((candidate) => PRIMARY_MODEL_SETUP_TYPES.has(candidate.setupType));
  }
  return [];
}
