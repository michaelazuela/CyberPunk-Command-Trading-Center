import { ChartContext, StructuredSetupEvidence, StructuredSetupEvidenceMap } from '../types';

const MAX_EXECUTION_LEVEL_DISTANCE = 30;

function isPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function distance(a: number | null | undefined, b: number | null | undefined): number | null {
  if (!isPrice(a) || !isPrice(b)) return null;
  return Math.abs(a - b);
}

function latestReadableCandle(context: ChartContext) {
  return [...(context.candles || [])]
    .reverse()
    .find((candle) =>
      candle.confidence !== 'Low' &&
      candle.confidence !== 'Unreadable' &&
      (isPrice(candle.close) || isPrice(candle.high) || isPrice(candle.low))
    );
}

function inferCurrentPrice(context: ChartContext): number | null {
  const candle = latestReadableCandle(context);
  if (isExecutionRole(context) && isPrice(candle?.close)) return candle.close as number;
  return context.keyLevels.currentPrice ?? candle?.close ?? null;
}

function isExecutionRole(context: ChartContext): boolean {
  return context.timeframe === '5m' || context.screenshotRole === '5m_execution' || context.screenshotRole === 'lunch_execution';
}

function hasStructuredExecutionInput(context: ChartContext): boolean {
  const keyLevelValues = [
    context.keyLevels.currentPrice,
    context.keyLevels.nearestResistance,
    context.keyLevels.nearestSupport,
    context.keyLevels.activeSwingHigh,
    context.keyLevels.activeSwingLow,
    context.keyLevels.triggerCandleHigh,
    context.keyLevels.triggerCandleLow,
    context.proposedEntry,
    context.proposedStop,
  ];
  const evidenceValues = Object.values(context.setupEvidence || {}).flatMap((evidence) => [
    evidence?.entry,
    evidence?.stop,
  ]);
  return keyLevelValues.some(isPrice) || evidenceValues.some(isPrice) || (context.candles || []).length > 0;
}

function keepNearCurrent(value: number | null | undefined, currentPrice: number | null, maxDistance = MAX_EXECUTION_LEVEL_DISTANCE): number | null | undefined {
  if (!isPrice(value)) return value;
  const delta = distance(value, currentPrice);
  if (delta === null) return value;
  return delta <= maxDistance ? value : null;
}

function sanitizeEvidenceLevels(evidence: StructuredSetupEvidence | undefined, currentPrice: number | null): StructuredSetupEvidence | undefined {
  if (!evidence) return evidence;
  const entry = keepNearCurrent(evidence.entry, currentPrice);
  const stop = keepNearCurrent(evidence.stop, currentPrice);
  if (entry === evidence.entry && stop === evidence.stop) return evidence;

  return {
    ...evidence,
    entry,
    stop,
    triggerState: evidence.triggerState === 'TRIGGERED' ? 'PENDING_TRIGGER' : evidence.triggerState,
    missingEvidence: Array.from(new Set([
      ...(evidence.missingEvidence || []),
      'Execution level was too far from current 5M hard-right structure and requires confirmation.',
    ])),
    confidence: evidence.confidence === 'High' ? 'Medium' : evidence.confidence,
  };
}

function sanitizeSetupEvidence(map: StructuredSetupEvidenceMap | undefined, currentPrice: number | null): StructuredSetupEvidenceMap | undefined {
  if (!map) return map;
  return Object.fromEntries(
    Object.entries(map).map(([key, value]) => [key, sanitizeEvidenceLevels(value, currentPrice)])
  ) as StructuredSetupEvidenceMap;
}

export function applyLevelSanity(context: ChartContext): ChartContext {
  if (!isExecutionRole(context)) return context;
  if (!hasStructuredExecutionInput(context)) return context;

  const currentPrice = inferCurrentPrice(context);
  if (!isPrice(currentPrice)) {
    return {
      ...context,
      requiresManualConfirmation: true,
      entryStopConfidence: context.entryStopConfidence === 'High' ? 'Medium' : context.entryStopConfidence,
      extractionWarnings: {
        ...context.extractionWarnings,
        levelsUnclear: true,
        messages: Array.from(new Set([
          ...(context.extractionWarnings?.messages || []),
          'Current 5M hard-right price could not be confirmed; execution levels require manual confirmation.',
        ])),
      },
    };
  }

  const candle = latestReadableCandle(context);
  const keyLevels = {
    ...context.keyLevels,
    currentPrice,
    nearestResistance: keepNearCurrent(context.keyLevels.nearestResistance, currentPrice),
    nearestSupport: keepNearCurrent(context.keyLevels.nearestSupport, currentPrice),
    activeSwingHigh: keepNearCurrent(context.keyLevels.activeSwingHigh, currentPrice),
    activeSwingLow: keepNearCurrent(context.keyLevels.activeSwingLow, currentPrice),
    triggerCandleHigh: keepNearCurrent(context.keyLevels.triggerCandleHigh ?? candle?.high, currentPrice),
    triggerCandleLow: keepNearCurrent(context.keyLevels.triggerCandleLow ?? candle?.low, currentPrice),
  };

  const removedSuspiciousLevel = [
    context.proposedEntry,
    context.proposedStop,
    ...Object.values(context.setupEvidence || {}).flatMap((evidence) => [evidence?.entry, evidence?.stop]),
  ].some((value) => isPrice(value) && distance(value, currentPrice)! > MAX_EXECUTION_LEVEL_DISTANCE);

  return {
    ...context,
    keyLevels,
    setupEvidence: sanitizeSetupEvidence(context.setupEvidence, currentPrice),
    proposedEntry: keepNearCurrent(context.proposedEntry, currentPrice),
    proposedStop: keepNearCurrent(context.proposedStop, currentPrice),
    requiresManualConfirmation: context.requiresManualConfirmation || removedSuspiciousLevel,
    entryConfirmed: removedSuspiciousLevel ? false : context.entryConfirmed,
    stopConfirmed: removedSuspiciousLevel ? false : context.stopConfirmed,
    entryStopConfidence: removedSuspiciousLevel && context.entryStopConfidence === 'High' ? 'Medium' : context.entryStopConfidence,
    extractionWarnings: removedSuspiciousLevel
      ? {
          ...context.extractionWarnings,
          levelsUnclear: true,
          messages: Array.from(new Set([
            ...(context.extractionWarnings?.messages || []),
            'One or more extracted execution levels were too far from current 5M hard-right structure and were ignored.',
          ])),
        }
      : context.extractionWarnings,
  };
}
