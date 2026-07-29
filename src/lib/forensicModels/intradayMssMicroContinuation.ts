import { APPROVED_DESK_MODEL_DEFINITIONS } from '../../config/approvedDeskModels';
import { nearestProtectedStructureStopFromLevels, roundToTradeTick, targetsFromEntryStop } from '../../config/tradeRules';
import type { ChartCandleFact, ChartContext } from '../../types';

const MICRO_WINDOW_MINUTES = 15;
const MICRO_WINDOW_BARS = 3;

export interface IntradayMssMicroContinuationDetection {
  modelId: 'intraday_mss_micro_continuation';
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
  microWindowMinutes: number;
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
  candlePosition: number;
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

function minutesBetween(start: string | null | undefined, end: string | null | undefined): number | null {
  if (!start || !end) return null;
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  return (endMs - startMs) / 60000;
}

function isInsideMicroWindow(candle: ChartCandleFact, candlePosition: number, shift: ShiftFact): boolean {
  const barDistance = candlePosition - shift.candlePosition;
  if (barDistance <= 0 || barDistance > MICRO_WINDOW_BARS) return false;
  const minuteDistance = minutesBetween(shift.candle.timestamp, candle.timestamp);
  return minuteDistance === null || (minuteDistance > 0 && minuteDistance <= MICRO_WINDOW_MINUTES);
}

function findShiftFacts(candles: ChartCandleFact[]): ShiftFact[] {
  const shifts: ShiftFact[] = [];
  for (let position = 3; position < candles.length; position += 1) {
    const candle = candles[position];
    const lookback = candles.slice(Math.max(0, position - 6), position);
    const priorHigh = Math.max(...lookback.map((item) => finitePrice(item.high) ? item.high : Number.NEGATIVE_INFINITY));
    const priorLow = Math.min(...lookback.map((item) => finitePrice(item.low) ? item.low : Number.POSITIVE_INFINITY));
    if (!finitePrice(candle.close) || !Number.isFinite(priorHigh) || !Number.isFinite(priorLow)) continue;
    if (candle.close > priorHigh) {
      shifts.push({ direction: 'LONG', candle, candlePosition: position, level: priorHigh });
    }
    if (candle.close < priorLow) {
      shifts.push({ direction: 'SHORT', candle, candlePosition: position, level: priorLow });
    }
  }
  return shifts;
}

function microProofAfterShift(candles: ChartCandleFact[], shift: ShiftFact): ChartCandleFact | null {
  return candles.find((candle, position) => {
    if (!isInsideMicroWindow(candle, position, shift)) return false;
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
    const proofCandle = microProofAfterShift(candles, shift);
    if (proofCandle) return { shift, proofCandle };
  }
  const shift = shifts.at(-1) || null;
  return { shift, proofCandle: shift ? microProofAfterShift(candles, shift) : null };
}

function entryFromProof(proofCandle: ChartCandleFact | null): number | null {
  if (!finitePrice(proofCandle?.close)) return null;
  return roundToTradeTick(proofCandle.close);
}

function stopFromFacts(
  context: ChartContext,
  direction: 'LONG' | 'SHORT',
  shift: ShiftFact | null,
  proofCandle: ChartCandleFact | null,
  entry: number | null
): number | null {
  const protectedLevels = direction === 'LONG'
    ? [context.keyLevels.activeSwingLow, shift?.candle.low, proofCandle?.low]
    : [context.keyLevels.activeSwingHigh, shift?.candle.high, proofCandle?.high];
  return nearestProtectedStructureStopFromLevels(direction, entry, protectedLevels);
}

function htfContextForDirection(context: ChartContext, direction: 'LONG' | 'SHORT'): IntradayMssMicroContinuationDetection['htfContext'] {
  const aligned = context.multiTimeframeContext?.alignment?.alignedDirection;
  if (aligned === direction) return 'support';
  if (aligned === 'CONFLICTED') return 'caution';
  if ((aligned === 'LONG' || aligned === 'SHORT') && aligned !== direction) return 'conflict';
  return 'unknown';
}

function detectDirection(context: ChartContext, direction: 'LONG' | 'SHORT'): IntradayMssMicroContinuationDetection {
  const model = APPROVED_DESK_MODEL_DEFINITIONS.find((item) => item.id === 'intraday_mss_micro_continuation');
  const facts = latestDirectionalFacts(context, direction);
  const entry = entryFromProof(facts.proofCandle);
  const stop = stopFromFacts(context, direction, facts.shift, facts.proofCandle, entry);
  const targets = targetsFromEntryStop(direction, entry, stop);
  const evidence = [
    facts.shift ? `Completed intraday ${direction} 5M MSS at ${facts.shift.candle.timestamp || 'unknown time'} through ${facts.shift.level}.` : null,
    facts.proofCandle ? `Fast 5M micro retest/hold proof completed at ${facts.proofCandle.timestamp || 'unknown time'} within ${MICRO_WINDOW_MINUTES} minutes of MSS.` : null,
    model ? `Model contract: ${model.displayName}.` : null,
  ].filter((line): line is string => Boolean(line));
  const missingEvidence = [
    facts.shift ? null : 'Missing completed intraday 5M MSS.',
    facts.proofCandle ? null : `Missing fast 5M micro retest/hold proof within ${MICRO_WINDOW_MINUTES} minutes after MSS.`,
    entry !== null ? null : 'Missing deterministic entry reference.',
    stop !== null ? null : 'Missing nearest protected 5M structure stop.',
    targets.target1 !== null && targets.target2 !== null ? null : 'Missing valid target math from entry/stop.',
  ].filter((line): line is string => Boolean(line));

  return {
    modelId: 'intraday_mss_micro_continuation',
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
    microWindowMinutes: MICRO_WINDOW_MINUTES,
    htfContext: htfContextForDirection(context, direction),
    evidence,
    missingEvidence,
    installsScannerCandidate: true,
    installsPromotion: true,
    installsDiscordPublishing: Boolean(model?.installsDiscordPublishing),
    installsExecutionApproval: false,
  };
}

export function detectIntradayMssMicroContinuation(context: ChartContext): IntradayMssMicroContinuationDetection {
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
