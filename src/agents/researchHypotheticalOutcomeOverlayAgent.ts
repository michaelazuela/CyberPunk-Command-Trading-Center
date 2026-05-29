import type { ResearchBackfillDirection } from './historicalResearchBackfillAgent';
import type { ResearchOutcomeBar, ResearchOutcomeThresholds } from './researchOutcomeMathAgent';

export type ResearchHypotheticalFirstResolvedEvent =
  | 'favorable_threshold_one'
  | 'favorable_threshold_two'
  | 'adverse_invalidation'
  | 'neutral_no_resolution'
  | 'insufficient_data'
  | 'ambiguous_same_bar';

export type ResearchHypotheticalOutcomeLabel =
  | 'favorable_continuation'
  | 'partial_favorable'
  | 'adverse_first'
  | 'neutral_no_resolution'
  | 'ambiguous_same_bar'
  | 'insufficient_data';

export interface ResearchHypotheticalOutcomeOverlay {
  advisoryOnly: true;
  executionApproved: false;
  hypotheticalReferencePrice: number | null;
  hypotheticalInvalidationReference: number | null;
  hypotheticalThresholdOne: number | null;
  hypotheticalThresholdTwo: number | null;
  thresholdOnePoints: number;
  thresholdTwoPoints: number;
  adverseInvalidationPoints: number;
  observationWindowBars: number;
  firstResolvedEvent: ResearchHypotheticalFirstResolvedEvent;
  hypotheticalOutcomeLabel: ResearchHypotheticalOutcomeLabel;
  resolvedAtBarIndex: number | null;
  resolvedAtTime: string | null;
  maxFavorableExcursionPoints: number | null;
  maxAdverseExcursionPoints: number | null;
  notes: string[];
}

export interface ResearchHypotheticalOutcomeOverlayInput {
  direction: ResearchBackfillDirection;
  hypotheticalReferencePrice: number | null;
  postSignalBars: ResearchOutcomeBar[];
  thresholds: ResearchOutcomeThresholds;
  notes?: string[];
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function finite(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function emptyOverlay(
  thresholds: ResearchOutcomeThresholds,
  notes: string[],
  referencePrice: number | null,
): ResearchHypotheticalOutcomeOverlay {
  return {
    advisoryOnly: true,
    executionApproved: false,
    hypotheticalReferencePrice: finite(referencePrice) ? round(referencePrice) : null,
    hypotheticalInvalidationReference: null,
    hypotheticalThresholdOne: null,
    hypotheticalThresholdTwo: null,
    thresholdOnePoints: thresholds.thresholdOnePoints,
    thresholdTwoPoints: thresholds.thresholdTwoPoints,
    adverseInvalidationPoints: thresholds.adverseThresholdPoints,
    observationWindowBars: thresholds.observationWindowBars,
    firstResolvedEvent: 'insufficient_data',
    hypotheticalOutcomeLabel: 'insufficient_data',
    resolvedAtBarIndex: null,
    resolvedAtTime: null,
    maxFavorableExcursionPoints: null,
    maxAdverseExcursionPoints: null,
    notes,
  };
}

export function calculateResearchHypotheticalOutcomeOverlay(
  input: ResearchHypotheticalOutcomeOverlayInput,
): ResearchHypotheticalOutcomeOverlay {
  const notes = [...(input.notes || [])];
  const referencePrice = input.hypotheticalReferencePrice;
  if (input.direction !== 'LONG' && input.direction !== 'SHORT') {
    return emptyOverlay(input.thresholds, [...notes, 'Hypothetical overlay requires LONG or SHORT research direction.'], referencePrice);
  }
  if (!finite(referencePrice)) {
    return emptyOverlay(input.thresholds, [...notes, 'Hypothetical overlay requires a finite neutral reference price.'], null);
  }
  const bars = input.postSignalBars.slice(0, input.thresholds.observationWindowBars);
  if (!bars.length) {
    return emptyOverlay(input.thresholds, [...notes, 'Hypothetical overlay requires post-signal observation bars.'], referencePrice);
  }

  const isLong = input.direction === 'LONG';
  const hypotheticalThresholdOne = isLong
    ? referencePrice + input.thresholds.thresholdOnePoints
    : referencePrice - input.thresholds.thresholdOnePoints;
  const hypotheticalThresholdTwo = isLong
    ? referencePrice + input.thresholds.thresholdTwoPoints
    : referencePrice - input.thresholds.thresholdTwoPoints;
  const hypotheticalInvalidationReference = isLong
    ? referencePrice - input.thresholds.adverseThresholdPoints
    : referencePrice + input.thresholds.adverseThresholdPoints;
  const favorableExcursions = bars.map((bar) =>
    Math.max(0, isLong ? bar.high - referencePrice : referencePrice - bar.low)
  );
  const adverseExcursions = bars.map((bar) =>
    Math.max(0, isLong ? referencePrice - bar.low : bar.high - referencePrice)
  );

  let firstResolvedEvent: ResearchHypotheticalFirstResolvedEvent = 'neutral_no_resolution';
  let hypotheticalOutcomeLabel: ResearchHypotheticalOutcomeLabel = 'neutral_no_resolution';
  let resolvedAtBarIndex: number | null = null;
  let resolvedAtTime: string | null = null;
  let thresholdOneResolved = false;
  let thresholdTwoResolved = false;

  for (const [index, bar] of bars.entries()) {
    const favorableThresholdOne = isLong ? bar.high >= hypotheticalThresholdOne : bar.low <= hypotheticalThresholdOne;
    const favorableThresholdTwo = isLong ? bar.high >= hypotheticalThresholdTwo : bar.low <= hypotheticalThresholdTwo;
    const adverseInvalidation = isLong ? bar.low <= hypotheticalInvalidationReference : bar.high >= hypotheticalInvalidationReference;
    const favorableTouched = favorableThresholdOne || favorableThresholdTwo;

    if (favorableTouched && adverseInvalidation) {
      firstResolvedEvent = 'ambiguous_same_bar';
      hypotheticalOutcomeLabel = 'ambiguous_same_bar';
      resolvedAtBarIndex = index;
      resolvedAtTime = bar.time;
      break;
    }
    if (favorableThresholdTwo) {
      firstResolvedEvent = thresholdOneResolved ? firstResolvedEvent : 'favorable_threshold_two';
      hypotheticalOutcomeLabel = 'favorable_continuation';
      resolvedAtBarIndex ??= index;
      resolvedAtTime ??= bar.time;
      thresholdTwoResolved = true;
      break;
    }
    if (favorableThresholdOne) {
      firstResolvedEvent = thresholdOneResolved ? firstResolvedEvent : 'favorable_threshold_one';
      hypotheticalOutcomeLabel = 'partial_favorable';
      resolvedAtBarIndex ??= index;
      resolvedAtTime ??= bar.time;
      thresholdOneResolved = true;
      continue;
    }
    if (adverseInvalidation) {
      firstResolvedEvent = thresholdOneResolved ? firstResolvedEvent : 'adverse_invalidation';
      hypotheticalOutcomeLabel = thresholdOneResolved ? 'partial_favorable' : 'adverse_first';
      resolvedAtBarIndex = thresholdOneResolved ? resolvedAtBarIndex : index;
      resolvedAtTime = thresholdOneResolved ? resolvedAtTime : bar.time;
      break;
    }
  }

  if (thresholdOneResolved && !thresholdTwoResolved && hypotheticalOutcomeLabel !== 'ambiguous_same_bar') {
    hypotheticalOutcomeLabel = 'partial_favorable';
  }

  return {
    advisoryOnly: true,
    executionApproved: false,
    hypotheticalReferencePrice: round(referencePrice),
    hypotheticalInvalidationReference: round(hypotheticalInvalidationReference),
    hypotheticalThresholdOne: round(hypotheticalThresholdOne),
    hypotheticalThresholdTwo: round(hypotheticalThresholdTwo),
    thresholdOnePoints: input.thresholds.thresholdOnePoints,
    thresholdTwoPoints: input.thresholds.thresholdTwoPoints,
    adverseInvalidationPoints: input.thresholds.adverseThresholdPoints,
    observationWindowBars: input.thresholds.observationWindowBars,
    firstResolvedEvent,
    hypotheticalOutcomeLabel,
    resolvedAtBarIndex,
    resolvedAtTime,
    maxFavorableExcursionPoints: round(Math.max(...favorableExcursions)),
    maxAdverseExcursionPoints: round(Math.max(...adverseExcursions)),
    notes,
  };
}
