import { APPROVED_DESK_MODEL_DEFINITIONS } from '../../config/approvedDeskModels';
import { roundToTradeTick, stopOffsetPoints, targetsFromEntryStop } from '../../config/tradeRules';
import type { ChartCandleFact, ChartContext, FailedBreakEventFact, LiquidityEventFact, ReclaimEventFact } from '../../types';

export interface LiquidityRaidReclaimReversalDetection {
  modelId: 'liquidity_raid_reclaim_reversal';
  detected: boolean;
  direction: 'LONG' | 'SHORT' | null;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  riskPoints: number | null;
  proofTime: string | null;
  raidedLevel: number | null;
  raidedLevelLabel: string | null;
  htfContext: 'support' | 'caution' | 'conflict' | 'unknown';
  evidence: string[];
  missingEvidence: string[];
  installsScannerCandidate: false;
  installsPromotion: false;
  installsDiscordPublishing: false;
  installsExecutionApproval: false;
}

interface DirectionalFacts {
  sweep: LiquidityEventFact | null;
  reclaim: ReclaimEventFact | null;
  failure: FailedBreakEventFact | null;
}

function finitePrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function allSweeps(context: ChartContext): LiquidityEventFact[] {
  return [
    ...(context.liquiditySweeps || []),
    ...(context.multiTimeframeContext?.fiveMinute?.liquiditySweeps || []),
  ];
}

function allReclaims(context: ChartContext): ReclaimEventFact[] {
  return [
    ...(context.reclaimEvents || []),
    ...(context.multiTimeframeContext?.fiveMinute?.reclaimEvents || []),
  ];
}

function allFailures(context: ChartContext): FailedBreakEventFact[] {
  return [
    ...(context.failedBreakEvents || []),
    ...(context.multiTimeframeContext?.fiveMinute?.failedBreakEvents || []),
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

function latestDirectionalFacts(context: ChartContext, direction: 'LONG' | 'SHORT'): DirectionalFacts {
  const sweeps = allSweeps(context).filter((event) => event.direction === direction && event.reclaimed);
  const reclaims = allReclaims(context).filter((event) => event.direction === direction);
  const failures = allFailures(context).filter((event) => event.direction === direction);
  return {
    sweep: sweeps.at(-1) || null,
    reclaim: reclaims.at(-1) || null,
    failure: failures.at(-1) || null,
  };
}

function stopFromFacts(
  context: ChartContext,
  direction: 'LONG' | 'SHORT',
  failure: FailedBreakEventFact | null
): number | null {
  const offset = stopOffsetPoints();
  if (finitePrice(failure?.sweptExtreme)) {
    return direction === 'LONG'
      ? roundToTradeTick(failure.sweptExtreme - offset)
      : roundToTradeTick(failure.sweptExtreme + offset);
  }
  if (direction === 'LONG' && finitePrice(context.keyLevels.activeSwingLow)) {
    return roundToTradeTick(context.keyLevels.activeSwingLow - offset);
  }
  if (direction === 'SHORT' && finitePrice(context.keyLevels.activeSwingHigh)) {
    return roundToTradeTick(context.keyLevels.activeSwingHigh + offset);
  }
  return null;
}

function entryFromFacts(
  direction: 'LONG' | 'SHORT',
  sweep: LiquidityEventFact | null,
  reclaim: ReclaimEventFact | null,
  candles: ChartCandleFact[]
): number | null {
  if (finitePrice(reclaim?.reclaimedLevel)) return roundToTradeTick(reclaim.reclaimedLevel);
  if (finitePrice(sweep?.level)) return roundToTradeTick(sweep.level);
  const latest = candles.at(-1);
  if (!latest || !finitePrice(latest.close)) return null;
  return roundToTradeTick(latest.close);
}

function proofTimeFromFacts(reclaim: ReclaimEventFact | null, sweep: LiquidityEventFact | null, candles: ChartCandleFact[]): string | null {
  return reclaim?.timestamp || sweep?.timestamp || candles.at(-1)?.timestamp || null;
}

function htfContextForDirection(context: ChartContext, direction: 'LONG' | 'SHORT'): LiquidityRaidReclaimReversalDetection['htfContext'] {
  const aligned = context.multiTimeframeContext?.alignment?.alignedDirection;
  if (aligned === direction) return 'support';
  if (aligned === 'CONFLICTED') return 'caution';
  if ((aligned === 'LONG' || aligned === 'SHORT') && aligned !== direction) return 'conflict';
  return 'unknown';
}

function detectDirection(context: ChartContext, direction: 'LONG' | 'SHORT'): LiquidityRaidReclaimReversalDetection {
  const model = APPROVED_DESK_MODEL_DEFINITIONS.find((item) => item.id === 'liquidity_raid_reclaim_reversal');
  const facts = latestDirectionalFacts(context, direction);
  const candles = allFiveMinuteCandles(context);
  const entry = entryFromFacts(direction, facts.sweep, facts.reclaim, candles);
  const stop = stopFromFacts(context, direction, facts.failure);
  const targets = targetsFromEntryStop(direction, entry, stop);
  const raidedLevel = finitePrice(facts.sweep?.level) ? facts.sweep.level : finitePrice(facts.reclaim?.reclaimedLevel) ? facts.reclaim.reclaimedLevel : null;
  const proofTime = proofTimeFromFacts(facts.reclaim, facts.sweep, candles);
  const evidence = [
    facts.sweep ? `Raid confirmed at ${facts.sweep.sweptLevelLabel || 'mapped level'} ${facts.sweep.level ?? 'unknown'}.` : null,
    facts.reclaim ? `Reclaim confirmed at ${facts.reclaim.levelLabel || 'mapped level'} ${facts.reclaim.reclaimedLevel ?? 'unknown'}.` : null,
    facts.failure ? `Failed break fact confirms reversal structure at ${facts.failure.failedLevel ?? 'unknown'}.` : null,
    proofTime ? `Completed 5M proof time: ${proofTime}.` : null,
    model ? `Model contract: ${model.displayName}.` : null,
  ].filter((line): line is string => Boolean(line));
  const missingEvidence = [
    facts.sweep ? null : 'Missing reclaimed raid/sweep fact.',
    facts.reclaim ? null : 'Missing reclaim fact.',
    facts.failure ? null : 'Missing failed-break structure fact.',
    entry !== null ? null : 'Missing deterministic entry reference.',
    stop !== null ? null : 'Missing protected 5M stop.',
    targets.target1 !== null && targets.target2 !== null ? null : 'Missing valid target math from entry/stop.',
  ].filter((line): line is string => Boolean(line));

  return {
    modelId: 'liquidity_raid_reclaim_reversal',
    detected: missingEvidence.length === 0,
    direction: missingEvidence.length === 0 ? direction : null,
    entry,
    stop,
    target1: targets.target1,
    target2: targets.target2,
    riskPoints: targets.riskPoints,
    proofTime,
    raidedLevel,
    raidedLevelLabel: facts.sweep?.sweptLevelLabel || facts.reclaim?.levelLabel || facts.failure?.levelLabel || null,
    htfContext: htfContextForDirection(context, direction),
    evidence,
    missingEvidence,
    installsScannerCandidate: false,
    installsPromotion: false,
    installsDiscordPublishing: false,
    installsExecutionApproval: false,
  };
}

export function detectLiquidityRaidReclaimReversal(context: ChartContext): LiquidityRaidReclaimReversalDetection {
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
