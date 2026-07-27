import { APPROVED_DESK_MODEL_DEFINITIONS } from '../../config/approvedDeskModels';
import { roundToTradeTick, stopOffsetPoints, targetsFromEntryStop } from '../../config/tradeRules';
import type { ChartCandleFact, ChartContext, DisplacementCandleFact, FvgZoneFact } from '../../types';

export interface DrivePullbackContinuationDetection {
  modelId: 'drive_pullback_continuation';
  detected: boolean;
  direction: 'LONG' | 'SHORT' | null;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  riskPoints: number | null;
  proofTime: string | null;
  driveTime: string | null;
  pullbackZone: { lower: number; upper: number; midpoint: number | null } | null;
  htfContext: 'support' | 'caution' | 'conflict' | 'unknown';
  evidence: string[];
  missingEvidence: string[];
  installsScannerCandidate: true;
  installsPromotion: true;
  installsDiscordPublishing: false;
  installsExecutionApproval: false;
}

interface DirectionalFacts {
  drive: DisplacementCandleFact | null;
  zone: FvgZoneFact | null;
  proofCandle: ChartCandleFact | null;
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

function allFvgZones(context: ChartContext): FvgZoneFact[] {
  return [
    ...(context.fvgZones || []),
    ...(context.multiTimeframeContext?.fiveMinute?.fvgZones || []),
  ];
}

function allDisplacements(context: ChartContext): DisplacementCandleFact[] {
  return [
    ...(context.displacementCandles || []),
    ...(context.multiTimeframeContext?.fiveMinute?.displacementCandles || []),
  ];
}

function zoneMidpoint(zone: FvgZoneFact): number | null {
  if (finitePrice(zone.midpoint)) return roundToTradeTick(zone.midpoint);
  if (finitePrice(zone.lower) && finitePrice(zone.upper)) return roundToTradeTick((zone.lower + zone.upper) / 2);
  return null;
}

function candleRejectsZone(direction: 'LONG' | 'SHORT', candle: ChartCandleFact, zone: FvgZoneFact): boolean {
  if (!finitePrice(zone.lower) || !finitePrice(zone.upper) || !finitePrice(candle.low) || !finitePrice(candle.high) || !finitePrice(candle.close) || !finitePrice(candle.open)) {
    return false;
  }
  const touched = candle.low <= zone.upper && candle.high >= zone.lower;
  if (!touched) return false;
  if (direction === 'LONG') return candle.close > candle.open && candle.close >= zoneMidpoint(zone)!;
  return candle.close < candle.open && candle.close <= zoneMidpoint(zone)!;
}

function latestDirectionalFacts(context: ChartContext, direction: 'LONG' | 'SHORT'): DirectionalFacts {
  const drives = allDisplacements(context).filter((item) => {
    if (item.direction !== direction) return false;
    if (item.quality === 'possible') return false;
    if (item.leavesImbalance === false) return false;
    return item.breaksStructure !== false;
  });
  const zones = allFvgZones(context).filter((zone) =>
    zone.direction === direction &&
    finitePrice(zone.lower) &&
    finitePrice(zone.upper) &&
    (zone.impulseQualified !== false || zone.reclaimed === true)
  );
  const candles = allFiveMinuteCandles(context);
  const zone = zones.at(-1) || null;
  const proofCandle = zone ? [...candles].reverse().find((candle) => candleRejectsZone(direction, candle, zone)) || null : null;
  return {
    drive: drives.at(-1) || null,
    zone,
    proofCandle,
  };
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

function entryFromFacts(direction: 'LONG' | 'SHORT', proofCandle: ChartCandleFact | null, zone: FvgZoneFact | null): number | null {
  if (proofCandle && finitePrice(proofCandle.close)) return roundToTradeTick(proofCandle.close);
  if (!zone) return null;
  const midpoint = zoneMidpoint(zone);
  if (midpoint !== null) return midpoint;
  if (direction === 'LONG' && finitePrice(zone.upper)) return roundToTradeTick(zone.upper);
  if (direction === 'SHORT' && finitePrice(zone.lower)) return roundToTradeTick(zone.lower);
  return null;
}

function htfContextForDirection(context: ChartContext, direction: 'LONG' | 'SHORT'): DrivePullbackContinuationDetection['htfContext'] {
  const aligned = context.multiTimeframeContext?.alignment?.alignedDirection;
  if (aligned === direction) return 'support';
  if (aligned === 'CONFLICTED') return 'caution';
  if ((aligned === 'LONG' || aligned === 'SHORT') && aligned !== direction) return 'conflict';
  return 'unknown';
}

function setupReadyForContinuation(context: ChartContext): boolean {
  return Boolean(
    context.setupReadyFacts?.pullbackIntoFvg ||
    context.setupReadyFacts?.fvgReclaimed ||
    context.setupReadyFacts?.breakOfStructure
  );
}

function detectDirection(context: ChartContext, direction: 'LONG' | 'SHORT'): DrivePullbackContinuationDetection {
  const model = APPROVED_DESK_MODEL_DEFINITIONS.find((item) => item.id === 'drive_pullback_continuation');
  const facts = latestDirectionalFacts(context, direction);
  const entry = entryFromFacts(direction, facts.proofCandle, facts.zone);
  const stop = stopFromFacts(context, direction, facts.proofCandle);
  const targets = targetsFromEntryStop(direction, entry, stop);
  const midpoint = facts.zone ? zoneMidpoint(facts.zone) : null;
  const proofTime = facts.proofCandle?.timestamp || facts.zone?.reclaimTimestamp || null;
  const evidence = [
    facts.drive ? `Drive displacement confirmed at ${facts.drive.timestamp || 'unknown time'}.` : null,
    facts.drive?.leavesImbalance ? 'Drive left imbalance context.' : null,
    facts.drive?.breaksStructure ? 'Drive broke structure.' : null,
    facts.zone ? `Pullback zone ${facts.zone.lower ?? 'unknown'}-${facts.zone.upper ?? 'unknown'} available.` : null,
    facts.proofCandle ? `Completed 5M pullback/rejection proof at ${facts.proofCandle.timestamp || 'unknown time'}.` : null,
    setupReadyForContinuation(context) ? 'Setup-ready continuation fact present.' : null,
    model ? `Model contract: ${model.displayName}.` : null,
  ].filter((line): line is string => Boolean(line));
  const missingEvidence = [
    facts.drive ? null : 'Missing directional drive displacement.',
    facts.zone ? null : 'Missing matching pullback/FVG continuation zone.',
    facts.proofCandle || setupReadyForContinuation(context) ? null : 'Missing completed 5M pullback/rejection proof.',
    entry !== null ? null : 'Missing deterministic entry reference.',
    stop !== null ? null : 'Missing protected 5M stop.',
    targets.target1 !== null && targets.target2 !== null ? null : 'Missing valid target math from entry/stop.',
  ].filter((line): line is string => Boolean(line));

  return {
    modelId: 'drive_pullback_continuation',
    detected: missingEvidence.length === 0,
    direction: missingEvidence.length === 0 ? direction : null,
    entry,
    stop,
    target1: targets.target1,
    target2: targets.target2,
    riskPoints: targets.riskPoints,
    proofTime,
    driveTime: facts.drive?.timestamp || null,
    pullbackZone: facts.zone && finitePrice(facts.zone.lower) && finitePrice(facts.zone.upper)
      ? { lower: facts.zone.lower, upper: facts.zone.upper, midpoint }
      : null,
    htfContext: htfContextForDirection(context, direction),
    evidence,
    missingEvidence,
    installsScannerCandidate: true,
    installsPromotion: true,
    installsDiscordPublishing: false,
    installsExecutionApproval: false,
  };
}

export function detectDrivePullbackContinuation(context: ChartContext): DrivePullbackContinuationDetection {
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
