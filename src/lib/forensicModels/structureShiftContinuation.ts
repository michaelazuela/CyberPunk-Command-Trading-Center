import { APPROVED_DESK_MODEL_DEFINITIONS } from '../../config/approvedDeskModels';
import { roundToTradeTick, stopOffsetPoints, targetsFromEntryStop } from '../../config/tradeRules';
import type { ChartCandleFact, ChartContext } from '../../types';

export interface StructureShiftContinuationDetection {
  modelId: 'structure_shift_continuation';
  detected: boolean;
  direction: 'LONG' | 'SHORT' | null;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  riskPoints: number | null;
  proofTime: string | null;
  shiftTime: string | null;
  shiftLevel: number | null;
  htfContext: 'support' | 'caution' | 'conflict' | 'unknown';
  evidence: string[];
  missingEvidence: string[];
  installsScannerCandidate: true;
  installsPromotion: true;
  installsDiscordPublishing: boolean;
  installsExecutionApproval: false;
}

interface ShiftFact {
  direction: 'LONG' | 'SHORT';
  candle: ChartCandleFact;
  level: number;
}

function finitePrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function allFiveMinuteCandles(context: ChartContext): ChartCandleFact[] {
  return [
    ...(context.multiTimeframeContext?.fiveMinute?.fullWindowCandles || []),
    ...(context.multiTimeframeContext?.fiveMinute?.candles || []),
    ...(context.candles || []),
  ].filter((candle, index, array) => {
    const key = `${candle.timestamp || ''}|${candle.index}`;
    return array.findIndex((item) => `${item.timestamp || ''}|${item.index}` === key) === index;
  });
}

function findShiftFacts(candles: ChartCandleFact[]): ShiftFact[] {
  const shifts: ShiftFact[] = [];
  for (let index = 3; index < candles.length; index += 1) {
    const candle = candles[index];
    const lookback = candles.slice(Math.max(0, index - 6), index);
    const priorHigh = Math.max(...lookback.map((item) => finitePrice(item.high) ? item.high : Number.NEGATIVE_INFINITY));
    const priorLow = Math.min(...lookback.map((item) => finitePrice(item.low) ? item.low : Number.POSITIVE_INFINITY));
    if (!finitePrice(candle.close) || !Number.isFinite(priorHigh) || !Number.isFinite(priorLow)) continue;
    if (candle.close > priorHigh) {
      shifts.push({ direction: 'LONG', candle, level: priorHigh });
    }
    if (candle.close < priorLow) {
      shifts.push({ direction: 'SHORT', candle, level: priorLow });
    }
  }
  return shifts;
}

function proofAfterShift(candles: ChartCandleFact[], shift: ShiftFact): ChartCandleFact | null {
  return candles.find((candle) => {
    if (candle.index <= shift.candle.index) return false;
    if (!finitePrice(candle.open) || !finitePrice(candle.high) || !finitePrice(candle.low) || !finitePrice(candle.close)) {
      return false;
    }
    if (shift.direction === 'LONG') {
      const retestHold = candle.low <= shift.level && candle.close > shift.level;
      const continuationClose = candle.close > shift.candle.high && candle.close > candle.open;
      return retestHold || continuationClose;
    }
    const retestHold = candle.high >= shift.level && candle.close < shift.level;
    const continuationClose = candle.close < shift.candle.low && candle.close < candle.open;
    return retestHold || continuationClose;
  }) || null;
}

function latestDirectionalFacts(context: ChartContext, direction: 'LONG' | 'SHORT'): {
  shift: ShiftFact | null;
  proofCandle: ChartCandleFact | null;
} {
  const candles = allFiveMinuteCandles(context);
  const shifts = findShiftFacts(candles).filter((item) => item.direction === direction);
  for (const shift of [...shifts].reverse()) {
    const proofCandle = proofAfterShift(candles, shift);
    if (proofCandle) return { shift, proofCandle };
  }
  const shift = shifts.at(-1) || null;
  return { shift, proofCandle: shift ? proofAfterShift(candles, shift) : null };
}

function entryFromProof(proofCandle: ChartCandleFact | null): number | null {
  if (!finitePrice(proofCandle?.close)) return null;
  return roundToTradeTick(proofCandle.close);
}

function stopFromFacts(context: ChartContext, direction: 'LONG' | 'SHORT', proofCandle: ChartCandleFact | null): number | null {
  const offset = stopOffsetPoints();
  if (direction === 'LONG') {
    if (finitePrice(context.keyLevels.activeSwingLow)) return roundToTradeTick(context.keyLevels.activeSwingLow - offset);
    if (finitePrice(proofCandle?.low)) return roundToTradeTick(proofCandle.low - offset);
  }
  if (direction === 'SHORT') {
    if (finitePrice(context.keyLevels.activeSwingHigh)) return roundToTradeTick(context.keyLevels.activeSwingHigh + offset);
    if (finitePrice(proofCandle?.high)) return roundToTradeTick(proofCandle.high + offset);
  }
  return null;
}

function htfContextForDirection(context: ChartContext, direction: 'LONG' | 'SHORT'): StructureShiftContinuationDetection['htfContext'] {
  const aligned = context.multiTimeframeContext?.alignment?.alignedDirection;
  if (aligned === direction) return 'support';
  if (aligned === 'CONFLICTED') return 'caution';
  if ((aligned === 'LONG' || aligned === 'SHORT') && aligned !== direction) return 'conflict';
  return 'unknown';
}

function detectDirection(context: ChartContext, direction: 'LONG' | 'SHORT'): StructureShiftContinuationDetection {
  const model = APPROVED_DESK_MODEL_DEFINITIONS.find((item) => item.id === 'structure_shift_continuation');
  const facts = latestDirectionalFacts(context, direction);
  const entry = entryFromProof(facts.proofCandle);
  const stop = stopFromFacts(context, direction, facts.proofCandle);
  const targets = targetsFromEntryStop(direction, entry, stop);
  const evidence = [
    facts.shift ? `Completed ${direction} structure shift at ${facts.shift.candle.timestamp || 'unknown time'} through ${facts.shift.level}.` : null,
    facts.proofCandle ? `Completed 5M continuation proof after shift at ${facts.proofCandle.timestamp || 'unknown time'}.` : null,
    model ? `Model contract: ${model.displayName}.` : null,
  ].filter((line): line is string => Boolean(line));
  const missingEvidence = [
    facts.shift ? null : 'Missing completed structure shift.',
    facts.proofCandle ? null : 'Missing post-shift 5M continuation proof.',
    entry !== null ? null : 'Missing deterministic entry reference.',
    stop !== null ? null : 'Missing protected 5M structure stop.',
    targets.target1 !== null && targets.target2 !== null ? null : 'Missing valid target math from entry/stop.',
  ].filter((line): line is string => Boolean(line));

  return {
    modelId: 'structure_shift_continuation',
    detected: missingEvidence.length === 0,
    direction: missingEvidence.length === 0 ? direction : null,
    entry,
    stop,
    target1: targets.target1,
    target2: targets.target2,
    riskPoints: targets.riskPoints,
    proofTime: facts.proofCandle?.timestamp || null,
    shiftTime: facts.shift?.candle.timestamp || null,
    shiftLevel: facts.shift?.level ?? null,
    htfContext: htfContextForDirection(context, direction),
    evidence,
    missingEvidence,
    installsScannerCandidate: true,
    installsPromotion: true,
    installsDiscordPublishing: Boolean(model?.installsDiscordPublishing),
    installsExecutionApproval: false,
  };
}

export function detectStructureShiftContinuation(context: ChartContext): StructureShiftContinuationDetection {
  const longResult = detectDirection(context, 'LONG');
  const shortResult = detectDirection(context, 'SHORT');
  if (longResult.detected && !shortResult.detected) return longResult;
  if (shortResult.detected && !longResult.detected) return shortResult;
  if (longResult.detected && shortResult.detected) {
    const longTime = longResult.proofTime || '';
    const shortTime = shortResult.proofTime || '';
    return longTime >= shortTime ? longResult : shortResult;
  }
  return longResult.evidence.length >= shortResult.evidence.length ? longResult : shortResult;
}
