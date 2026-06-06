import type {
  ChartContext,
  DisplacementCandleFact,
  FailedBreakEventFact,
  FailedPlanReversalContext,
  FailedPlanReversalFiveMinuteTriggerStatus,
  FailedPlanReversalHtfStackStatus,
  FailedPlanReversalTimeframeConfirmation,
  PriceDirection,
  TimeframeFactSet,
} from '../types';

type Direction = Exclude<PriceDirection, 'NO TRADE'>;

function oppositeDirection(direction: Direction): Direction {
  return direction === 'LONG' ? 'SHORT' : 'LONG';
}

function directionToTrend(direction: Direction): 'bullish' | 'bearish' {
  return direction === 'LONG' ? 'bullish' : 'bearish';
}

function trendToDirection(trend: TimeframeFactSet['trend'] | undefined): FailedPlanReversalTimeframeConfirmation['direction'] {
  if (trend === 'bullish') return 'LONG';
  if (trend === 'bearish') return 'SHORT';
  if (trend === 'balanced') return 'NEUTRAL';
  return 'UNKNOWN';
}

function readableConfidence(value: string | undefined): boolean {
  return value === 'High' || value === 'Medium';
}

function confirmedDisplacement(
  displacements: DisplacementCandleFact[] | undefined,
  direction: Direction,
): DisplacementCandleFact | null {
  return (
    displacements?.find((item) =>
      item.direction === direction &&
      readableConfidence(item.confidence) &&
      (item.quality === 'confirmed' || item.quality === 'high_quality' || item.breaksStructure === true)
    ) || null
  );
}

function timeframeConfirmation(
  timeframe: FailedPlanReversalTimeframeConfirmation['timeframe'],
  facts: TimeframeFactSet | undefined,
  direction: Direction,
): FailedPlanReversalTimeframeConfirmation {
  if (!facts || facts.barCount <= 0) {
    return {
      timeframe,
      direction: 'UNKNOWN',
      status: 'data_limited',
      evidence: [`${timeframe} structured OHLC is missing or empty.`],
    };
  }

  const alignedTrend = facts.trend === directionToTrend(direction);
  const conflictingTrend =
    facts.trend === directionToTrend(oppositeDirection(direction));
  const displacement = confirmedDisplacement(facts.displacementCandles, direction);
  const conflictingDisplacement = confirmedDisplacement(facts.displacementCandles, oppositeDirection(direction));
  const evidence: string[] = [];

  if (alignedTrend) evidence.push(`${timeframe} trend is ${facts.trend}.`);
  if (displacement) evidence.push(`${timeframe} ${direction.toLowerCase()} displacement/MSS evidence is present.`);
  if (conflictingTrend) evidence.push(`${timeframe} trend conflicts as ${facts.trend}.`);
  if (conflictingDisplacement) evidence.push(`${timeframe} has opposite displacement evidence.`);

  if (alignedTrend && displacement) {
    return { timeframe, direction, status: 'confirmed', evidence };
  }
  if (alignedTrend || displacement) {
    return { timeframe, direction, status: 'aligned', evidence };
  }
  if (conflictingTrend || conflictingDisplacement) {
    return {
      timeframe,
      direction: oppositeDirection(direction),
      status: 'conflicting',
      evidence,
    };
  }
  return {
    timeframe,
    direction: trendToDirection(facts.trend),
    status: facts.trend === 'balanced' ? 'neutral' : 'unknown',
    evidence: evidence.length ? evidence : [`${timeframe} does not confirm opposite-side structure.`],
  };
}

function htfStackStatus(confirmations: FailedPlanReversalTimeframeConfirmation[]): FailedPlanReversalHtfStackStatus {
  const byTimeframe = new Map(confirmations.map((item) => [item.timeframe, item]));
  const fifteen = byTimeframe.get('15M');
  const oneHour = byTimeframe.get('1H');
  const twoHour = byTimeframe.get('2H');
  const fourHour = byTimeframe.get('4H');
  const primaryAligned = [fifteen, oneHour].every((item) => item?.status === 'aligned' || item?.status === 'confirmed');
  const primaryDataLimited = [fifteen, oneHour].some((item) => item?.status === 'data_limited' || item?.status === 'unknown');
  const materialConflict = [fifteen, oneHour, twoHour, fourHour].some((item) => item?.status === 'conflicting');
  const higherAligned = [twoHour, fourHour].some((item) => item?.status === 'aligned' || item?.status === 'confirmed');
  const higherNeutralOrLimited = [twoHour, fourHour].every((item) =>
    item?.status === 'aligned' ||
    item?.status === 'confirmed' ||
    item?.status === 'neutral' ||
    item?.status === 'data_limited' ||
    item?.status === 'unknown'
  );

  if (materialConflict) return 'conflict';
  if (primaryDataLimited) return 'data_limited';
  if (primaryAligned && higherAligned) return 'full_confirmation';
  if (primaryAligned && higherNeutralOrLimited) return 'supported_confirmation';
  return 'mixed';
}

function latestFailedBreakEvent(events: FailedBreakEventFact[] | undefined): FailedBreakEventFact | null {
  const filtered = (events || []).filter((item) =>
    (item.direction === 'LONG' || item.direction === 'SHORT') &&
    isAppOwnedFailedPlanEvent(item)
  );
  if (!filtered.length) return null;
  return filtered[filtered.length - 1] || null;
}

function isAppOwnedFailedPlanEvent(event: FailedBreakEventFact): boolean {
  const text = [event.levelLabel, event.evidence].filter(Boolean).join(' ').toLowerCase();
  return (
    text.includes('app-owned') ||
    text.includes('app owned') ||
    text.includes('failed plan') ||
    text.includes('decision level') ||
    text.includes('reclaim level')
  );
}

function fiveMinuteStatus(chartContext: ChartContext, direction: Direction): FailedPlanReversalFiveMinuteTriggerStatus {
  const structure = chartContext.structureQualityContext;
  if (structure?.oldInducementStale || structure?.noChaseRequired) return 'no_fresh_entry';
  if (
    structure?.direction === direction &&
    structure.executionTimeframeConfirmed &&
    structure.structureBreakConfirmedByClose &&
    !structure.wickOnlyBreak
  ) {
    return 'confirmed';
  }

  const fiveMinute = chartContext.multiTimeframeContext?.fiveMinute;
  const fiveMinuteDisplacement = confirmedDisplacement(fiveMinute?.displacementCandles, direction) ||
    confirmedDisplacement(chartContext.displacementCandles, direction);
  if (fiveMinuteDisplacement?.breaksStructure) return 'confirmed';
  if (fiveMinuteDisplacement) return 'pending_retest';
  if (chartContext.setupReadyFacts?.breakOfStructure || chartContext.marketStructure?.marketStructureShift) {
    return 'pending_retest';
  }
  return 'pending_mss';
}

function decisionStateFor(
  originalDirection: Direction,
  triggerStatus: FailedPlanReversalFiveMinuteTriggerStatus,
): FailedPlanReversalContext['decisionState'] {
  if (triggerStatus === 'stale' || triggerStatus === 'no_fresh_entry') return 'NO_FRESH_ENTRY';
  if (triggerStatus === 'confirmed') {
    return originalDirection === 'LONG'
      ? 'FAILED_LONG_TO_BEARISH_MSS_CONFIRMED'
      : 'FAILED_SHORT_TO_BULLISH_MSS_CONFIRMED';
  }
  if (triggerStatus === 'pending_retest') return 'OPPOSITE_SIDE_RETEST_PENDING';
  return originalDirection === 'LONG'
    ? 'FAILED_LONG_TO_BEARISH_DECISION_PENDING'
    : 'FAILED_SHORT_TO_BULLISH_DECISION_PENDING';
}

export function buildFailedPlanReversalContextFromChartContext(
  chartContext: ChartContext,
): FailedPlanReversalContext | null {
  if (chartContext.failedPlanReversal) return chartContext.failedPlanReversal;

  const failedEvent = latestFailedBreakEvent(chartContext.failedBreakEvents);
  if (!failedEvent || (failedEvent.direction !== 'LONG' && failedEvent.direction !== 'SHORT')) return null;

  const opposite = failedEvent.direction;
  const original = oppositeDirection(opposite);
  const mtf = chartContext.multiTimeframeContext;
  const confirmations: FailedPlanReversalTimeframeConfirmation[] = [
    timeframeConfirmation('15M', mtf?.fifteenMinute, opposite),
    timeframeConfirmation('1H', mtf?.oneHour, opposite),
    timeframeConfirmation('2H', mtf?.twoHour, opposite),
    timeframeConfirmation('4H', mtf?.fourHour, opposite),
    timeframeConfirmation('5M', mtf?.fiveMinute, opposite),
  ];
  const stackStatus = htfStackStatus(confirmations);
  const triggerStatus = fiveMinuteStatus(chartContext, opposite);
  const htfEligible = stackStatus === 'full_confirmation' || stackStatus === 'supported_confirmation';
  const triggerConfirmed = triggerStatus === 'confirmed';
  const staleOrNoFreshEntry = triggerStatus === 'stale' || triggerStatus === 'no_fresh_entry';
  const blockers = [
    ...(!htfEligible ? [`Opposite HTF stack is ${stackStatus}; requires full or supported confirmation.`] : []),
    ...(!triggerConfirmed ? ['Fresh completed 5M opposite-side trigger/retest is not confirmed.'] : []),
    ...(staleOrNoFreshEntry ? ['No fresh entry: reversal trigger is stale or price already left the decision level.'] : []),
  ];
  const failedLevel = typeof failedEvent.failedLevel === 'number' && Number.isFinite(failedEvent.failedLevel)
    ? failedEvent.failedLevel
    : null;

  return {
    source: 'ninjatrader_ohlc',
    boundary: 'opposite_side_review_only_not_execution_authority',
    originalPlanDirection: original,
    oppositeDirection: opposite,
    failedDecisionLevel: failedLevel,
    failedDecisionLevelRole: opposite === 'SHORT' ? 'short_side_resistance' : 'long_side_support',
    failedPlanEvidence: [
      failedEvent.evidence || `Failed ${original.toLowerCase()} decision level converted into ${opposite.toLowerCase()} review context.`,
      ...(failedEvent.levelLabel ? [`Failed level label: ${failedEvent.levelLabel}`] : []),
    ],
    htfStackStatus: stackStatus,
    timeframeConfirmations: confirmations,
    fiveMinuteTriggerStatus: triggerStatus,
    decisionState: decisionStateFor(original, triggerStatus),
    freshTriggerRequired: true,
    staleOrNoFreshEntry,
    reasons: [
      `Failed ${original} plan/decision level is being evaluated as an opposite-side ${opposite} decision level.`,
      `15M/1H opposite confirmation status: ${stackStatus}.`,
      `5M trigger status: ${triggerStatus}.`,
    ],
    blockers,
    createsCandidate: htfEligible && triggerConfirmed && !staleOrNoFreshEntry,
    approvesExecution: false,
  };
}
