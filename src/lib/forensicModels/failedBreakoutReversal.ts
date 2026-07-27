import { APPROVED_DESK_MODEL_DEFINITIONS } from '../../config/approvedDeskModels';
import { roundToTradeTick, stopOffsetPoints, targetsFromEntryStop } from '../../config/tradeRules';
import type { ChartCandleFact, ChartContext, FailedBreakEventFact, ReclaimEventFact } from '../../types';

export interface FailedBreakoutReversalDetection {
  modelId: 'failed_breakout_reversal';
  detected: boolean;
  direction: 'LONG' | 'SHORT' | null;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  riskPoints: number | null;
  proofTime: string | null;
  failedLevel: number | null;
  failedLevelLabel: string | null;
  htfContext: 'support' | 'caution' | 'conflict' | 'unknown';
  evidence: string[];
  missingEvidence: string[];
  installsScannerCandidate: true;
  installsPromotion: true;
  installsDiscordPublishing: false;
  installsExecutionApproval: false;
}

interface DirectionalFacts {
  failure: FailedBreakEventFact | null;
  reclaim: ReclaimEventFact | null;
  proofCandle: ChartCandleFact | null;
}

function finitePrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function allFailures(context: ChartContext): FailedBreakEventFact[] {
  return [
    ...(context.failedBreakEvents || []),
    ...(context.multiTimeframeContext?.fiveMinute?.failedBreakEvents || []),
  ];
}

function allReclaims(context: ChartContext): ReclaimEventFact[] {
  return [
    ...(context.reclaimEvents || []),
    ...(context.multiTimeframeContext?.fiveMinute?.reclaimEvents || []),
  ];
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

function candleConfirmsFailure(direction: 'LONG' | 'SHORT', candle: ChartCandleFact, failure: FailedBreakEventFact): boolean {
  if (!finitePrice(candle.open) || !finitePrice(candle.close) || !finitePrice(failure.failedLevel)) return false;
  if (direction === 'LONG') return candle.close > failure.failedLevel && candle.close >= candle.open;
  return candle.close < failure.failedLevel && candle.close <= candle.open;
}

function latestDirectionalFacts(context: ChartContext, direction: 'LONG' | 'SHORT'): DirectionalFacts {
  const failures = allFailures(context).filter((event) => event.direction === direction && finitePrice(event.failedLevel));
  const reclaims = allReclaims(context).filter((event) => event.direction === direction && finitePrice(event.reclaimedLevel));
  const candles = allFiveMinuteCandles(context);
  const failure = failures.at(-1) || null;
  const reclaim = failure
    ? reclaims.filter((event) => event.reclaimedLevel === failure.failedLevel || event.timestamp >= (failure.timestamp || '')).at(-1) || null
    : null;
  const proofCandle = failure
    ? candles.find((candle) =>
        (failure.candleIndex === undefined || candle.index >= failure.candleIndex) &&
        candleConfirmsFailure(direction, candle, failure)
      ) || null
    : null;
  return { failure, reclaim, proofCandle };
}

function entryFromFacts(failure: FailedBreakEventFact | null, reclaim: ReclaimEventFact | null, proofCandle: ChartCandleFact | null): number | null {
  if (finitePrice(reclaim?.reclaimedLevel)) return roundToTradeTick(reclaim.reclaimedLevel);
  if (finitePrice(failure?.failedLevel)) return roundToTradeTick(failure.failedLevel);
  if (finitePrice(proofCandle?.close)) return roundToTradeTick(proofCandle.close);
  return null;
}

function stopFromFacts(context: ChartContext, direction: 'LONG' | 'SHORT', failure: FailedBreakEventFact | null): number | null {
  const offset = stopOffsetPoints();
  if (finitePrice(failure?.sweptExtreme)) {
    return direction === 'LONG'
      ? roundToTradeTick(failure.sweptExtreme - offset)
      : roundToTradeTick(failure.sweptExtreme + offset);
  }
  if (direction === 'LONG' && finitePrice(context.keyLevels.activeSwingLow)) return roundToTradeTick(context.keyLevels.activeSwingLow - offset);
  if (direction === 'SHORT' && finitePrice(context.keyLevels.activeSwingHigh)) return roundToTradeTick(context.keyLevels.activeSwingHigh + offset);
  return null;
}

function htfContextForDirection(context: ChartContext, direction: 'LONG' | 'SHORT'): FailedBreakoutReversalDetection['htfContext'] {
  const aligned = context.multiTimeframeContext?.alignment?.alignedDirection;
  if (aligned === direction) return 'support';
  if (aligned === 'CONFLICTED') return 'caution';
  if ((aligned === 'LONG' || aligned === 'SHORT') && aligned !== direction) return 'conflict';
  return 'unknown';
}

function detectDirection(context: ChartContext, direction: 'LONG' | 'SHORT'): FailedBreakoutReversalDetection {
  const model = APPROVED_DESK_MODEL_DEFINITIONS.find((item) => item.id === 'failed_breakout_reversal');
  const facts = latestDirectionalFacts(context, direction);
  const entry = entryFromFacts(facts.failure, facts.reclaim, facts.proofCandle);
  const stop = stopFromFacts(context, direction, facts.failure);
  const targets = targetsFromEntryStop(direction, entry, stop);
  const proofTime = facts.reclaim?.timestamp || facts.proofCandle?.timestamp || facts.failure?.timestamp || null;
  const evidence = [
    facts.failure ? `Failed breakout confirmed at ${facts.failure.levelLabel || 'mapped level'} ${facts.failure.failedLevel ?? 'unknown'}.` : null,
    facts.reclaim ? `Reclaim/return through failed level confirmed at ${facts.reclaim.reclaimedLevel ?? 'unknown'}.` : null,
    facts.proofCandle ? `Completed 5M reversal proof at ${facts.proofCandle.timestamp || 'unknown time'}.` : null,
    proofTime ? `Completed 5M proof time: ${proofTime}.` : null,
    model ? `Model contract: ${model.displayName}.` : null,
  ].filter((line): line is string => Boolean(line));
  const missingEvidence = [
    facts.failure ? null : 'Missing named failed-breakout level.',
    facts.reclaim || facts.proofCandle ? null : 'Missing completed 5M reclaim/close-through proof.',
    entry !== null ? null : 'Missing deterministic entry reference.',
    stop !== null ? null : 'Missing protected 5M stop beyond failed breakout.',
    targets.target1 !== null && targets.target2 !== null ? null : 'Missing valid target math from entry/stop.',
  ].filter((line): line is string => Boolean(line));

  return {
    modelId: 'failed_breakout_reversal',
    detected: missingEvidence.length === 0,
    direction: missingEvidence.length === 0 ? direction : null,
    entry,
    stop,
    target1: targets.target1,
    target2: targets.target2,
    riskPoints: targets.riskPoints,
    proofTime,
    failedLevel: facts.failure?.failedLevel ?? null,
    failedLevelLabel: facts.failure?.levelLabel || facts.reclaim?.levelLabel || null,
    htfContext: htfContextForDirection(context, direction),
    evidence,
    missingEvidence,
    installsScannerCandidate: true,
    installsPromotion: true,
    installsDiscordPublishing: false,
    installsExecutionApproval: false,
  };
}

export function detectFailedBreakoutReversal(context: ChartContext): FailedBreakoutReversalDetection {
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
