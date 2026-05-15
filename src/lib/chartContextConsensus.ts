import { ChartContext, ReadConfidence } from '../types';

export interface ChartContextConsensusResult {
  context: Partial<ChartContext> | undefined;
  agreement: 'not_run' | 'agree' | 'minor_disagreement' | 'major_disagreement' | 'unreadable' | 'error';
  disagreements: string[];
  warnings: string[];
}

const CRITICAL_LEVELS: Array<keyof ChartContext['keyLevels']> = [
  'currentPrice',
  'nearestSupport',
  'nearestResistance',
  'activeSwingHigh',
  'activeSwingLow',
  'triggerCandleHigh',
  'triggerCandleLow',
];

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function lowerConfidence(value?: ReadConfidence): ReadConfidence {
  if (value === 'Unreadable') return 'Unreadable';
  if (value === 'Low') return 'Low';
  return 'Low';
}

function confidenceRank(value?: ReadConfidence): number {
  if (value === 'High') return 3;
  if (value === 'Medium') return 2;
  if (value === 'Low') return 1;
  return 0;
}

function minConfidence(a?: ReadConfidence, b?: ReadConfidence): ReadConfidence | undefined {
  if (!a && !b) return a || b;
  return confidenceRank(a) <= confidenceRank(b) ? a : b;
}

function levelTolerance(level: keyof ChartContext['keyLevels']): number {
  if (level === 'currentPrice' || level === 'triggerCandleHigh' || level === 'triggerCandleLow') return 1.5;
  return 3;
}

export function buildChartContextConsensus(
  primaryContext: Partial<ChartContext> | undefined,
  validatorContext: Partial<ChartContext> | undefined,
  validatorMeta?: {
    agreement?: ChartContextConsensusResult['agreement'];
    disagreements?: string[];
    warnings?: string[];
    summary?: string;
  }
): ChartContextConsensusResult {
  if (!primaryContext || !validatorContext) {
    return {
      context: primaryContext,
      agreement: validatorContext ? 'error' : 'not_run',
      disagreements: [],
      warnings: validatorContext ? ['OpenAI validation did not return a usable primary context.'] : [],
    };
  }

  const disagreements = new Set<string>(validatorMeta?.disagreements || []);
  const warnings = new Set<string>(validatorMeta?.warnings || []);
  const primaryLevels = primaryContext.keyLevels || {};
  const validatorLevels = validatorContext.keyLevels || {};

  for (const level of CRITICAL_LEVELS) {
    const primary = primaryLevels[level];
    const validator = validatorLevels[level];
    if (!isNumber(primary) || !isNumber(validator)) continue;
    const delta = Math.abs(primary - validator);
    if (delta > levelTolerance(level)) {
      disagreements.add(`${String(level)} differs: Gemini=${primary}, OpenAI=${validator}, delta=${delta.toFixed(2)}.`);
    }
  }

  if (
    primaryContext.candleFacts?.lastClosedCandleDirection &&
    validatorContext.candleFacts?.lastClosedCandleDirection &&
    primaryContext.candleFacts.lastClosedCandleDirection !== 'unknown' &&
    validatorContext.candleFacts.lastClosedCandleDirection !== 'unknown' &&
    primaryContext.candleFacts.lastClosedCandleDirection !== validatorContext.candleFacts.lastClosedCandleDirection
  ) {
    disagreements.add(
      `lastClosedCandleDirection differs: Gemini=${primaryContext.candleFacts.lastClosedCandleDirection}, OpenAI=${validatorContext.candleFacts.lastClosedCandleDirection}.`
    );
  }

  const validatorUnreadable =
    validatorMeta?.agreement === 'unreadable' ||
    validatorContext.screenshotQuality === 'Unreadable' ||
    validatorContext.levelReadConfidence === 'Unreadable';
  const hasMajorDisagreement = disagreements.size >= 2 || validatorMeta?.agreement === 'major_disagreement';
  const hasMinorDisagreement = disagreements.size > 0 || validatorMeta?.agreement === 'minor_disagreement';
  const agreement = validatorUnreadable
    ? 'unreadable'
    : hasMajorDisagreement
      ? 'major_disagreement'
      : hasMinorDisagreement
        ? 'minor_disagreement'
        : 'agree';

  if (validatorMeta?.summary) {
    warnings.add(`OpenAI validation: ${validatorMeta.summary}`);
  }

  const forceManual = agreement === 'major_disagreement' || agreement === 'unreadable';
  const mergedWarnings = Array.from(new Set([
    ...(primaryContext.extractionWarnings?.messages || []),
    ...Array.from(warnings),
    ...(forceManual ? ['OpenAI validation disagreed with the primary extraction. Manual confirmation is required before execution.'] : []),
  ]));

  const context: Partial<ChartContext> = {
    ...primaryContext,
    levelReadConfidence: forceManual
      ? lowerConfidence(primaryContext.levelReadConfidence)
      : minConfidence(primaryContext.levelReadConfidence, validatorContext.levelReadConfidence),
    candleReadConfidence: forceManual
      ? lowerConfidence(primaryContext.candleReadConfidence)
      : minConfidence(primaryContext.candleReadConfidence, validatorContext.candleReadConfidence),
    structureReadConfidence: forceManual
      ? lowerConfidence(primaryContext.structureReadConfidence)
      : minConfidence(primaryContext.structureReadConfidence, validatorContext.structureReadConfidence),
    setupReadConfidence: forceManual
      ? lowerConfidence(primaryContext.setupReadConfidence)
      : minConfidence(primaryContext.setupReadConfidence, validatorContext.setupReadConfidence),
    entryStopConfidence: forceManual
      ? lowerConfidence(primaryContext.entryStopConfidence)
      : minConfidence(primaryContext.entryStopConfidence, validatorContext.entryStopConfidence),
    requiresManualConfirmation: primaryContext.requiresManualConfirmation || forceManual,
    extractionWarnings: {
      ...primaryContext.extractionWarnings,
      levelsUnclear: primaryContext.extractionWarnings?.levelsUnclear || forceManual,
      manualEntryStopRequired: primaryContext.extractionWarnings?.manualEntryStopRequired || forceManual,
      messages: mergedWarnings,
    },
  };

  return {
    context,
    agreement,
    disagreements: Array.from(disagreements),
    warnings: Array.from(warnings),
  };
}
