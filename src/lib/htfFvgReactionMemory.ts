import type { ChartCandleFact, ChartContext, FvgZoneFact, TimeframeFactSet } from '../types';

export type HtfFvgReactionDirection = 'LONG' | 'SHORT';
export type HtfFvgReactionTimeframe = '240M' | '120M' | '60M' | '15M' | '5M';
export type HtfFvgReactionState =
  | 'untested'
  | 'retested'
  | 'rejected'
  | 'accepted_through'
  | 'inside_zone'
  | 'data_limited';

export type HtfFvgLifecycleState =
  | 'active_untested'
  | 'active_retested'
  | 'partially_mitigated'
  | 'rejected'
  | 'accepted_through'
  | 'inverted'
  | 'data_limited';

export interface HtfFvgLifecycle {
  sourceOfTruth: 'scanner_htf_parent_fvg_lifecycle';
  state: HtfFvgLifecycleState;
  touchCount: number;
  firstTouchAt: string | null;
  latestTouchAt: string | null;
  acceptedThroughAt: string | null;
  invertedAt: string | null;
  deepestMitigationPercent: number | null;
  evidence: string[];
}

export interface HtfFvgReactionEvent {
  sourceOfTruth: 'scanner_htf_parent_fvg_reaction_event';
  timeframe: HtfFvgReactionTimeframe;
  timestamp: string | null;
  state: HtfFvgReactionState;
  close: number | null;
  evidence: string;
}

export interface HtfFvgReactionZoneMemory {
  sourceOfTruth: 'scanner_htf_parent_fvg_reaction_zone_memory';
  direction: HtfFvgReactionDirection;
  timeframe: Exclude<HtfFvgReactionTimeframe, '5M'>;
  lower: number;
  upper: number;
  midpoint: number;
  formedAt: string | null;
  confidence: FvgZoneFact['confidence'];
  latestReaction: HtfFvgReactionEvent | null;
  lifecycle: HtfFvgLifecycle;
  state: HtfFvgReactionState;
  evidence: string[];
}

export interface HtfFvgChildConfirmationMemory {
  sourceOfTruth: 'scanner_htf_parent_fvg_child_confirmation_memory';
  direction: HtfFvgReactionDirection;
  timeframe: '5M';
  lower: number | null;
  upper: number | null;
  midpoint: number | null;
  formedAt: string | null;
  state: 'child_fvg_confirmed' | 'waiting_for_child_5m_proof' | 'data_limited';
  evidence: string[];
}

export interface HtfFvgReactionMemory {
  sourceOfTruth: 'scanner_htf_parent_fvg_reaction_memory';
  direction: HtfFvgReactionDirection | null;
  parentZones: HtfFvgReactionZoneMemory[];
  activeReaction: HtfFvgReactionZoneMemory | null;
  childConfirmation: HtfFvgChildConfirmationMemory | null;
  summary: string;
  parentStackSummary: string;
  approvalBoundary: {
    changesTradeApprovals: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRiskRules: false;
    createsNewModel: false;
  };
}

function numericOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function timeframeLabel(timeframe: TimeframeFactSet['timeframe']): HtfFvgReactionTimeframe | null {
  if (timeframe === '4h') return '240M';
  if (timeframe === '2h') return '120M';
  if (timeframe === '1h') return '60M';
  if (timeframe === '15m') return '15M';
  if (timeframe === '5m') return '5M';
  return null;
}

function htfPriority(timeframe: HtfFvgReactionTimeframe): number {
  if (timeframe === '240M') return 4;
  if (timeframe === '120M') return 3;
  if (timeframe === '60M') return 2;
  if (timeframe === '15M') return 1;
  return 0;
}

function candleTimestamp(candle: ChartCandleFact): string | null {
  return candle.timestamp || null;
}

function maybeCandleTimestamp(candle: ChartCandleFact | null | undefined): string | null {
  return candle?.timestamp || null;
}

function candleAfterZoneFormation(candle: ChartCandleFact, zone: FvgZoneFact): boolean {
  if (!zone.formedAt || !candle.timestamp) return true;
  return candle.timestamp > zone.formedAt;
}

function candleTouchesZone(candle: ChartCandleFact, lower: number, upper: number): boolean {
  const high = numericOrNull(candle.high);
  const low = numericOrNull(candle.low);
  if (high === null || low === null) return false;
  return high >= lower && low <= upper;
}

function reactionStateForClose(direction: HtfFvgReactionDirection, close: number | null, lower: number, upper: number): HtfFvgReactionState {
  if (close === null) return 'retested';
  if (close >= lower && close <= upper) return 'inside_zone';
  if (direction === 'SHORT') return close < lower ? 'rejected' : 'accepted_through';
  return close > upper ? 'rejected' : 'accepted_through';
}

function clamp(value: number, lower: number, upper: number): number {
  return Math.max(lower, Math.min(upper, value));
}

function mitigationPercent(direction: HtfFvgReactionDirection, candle: ChartCandleFact, lower: number, upper: number): number | null {
  const height = upper - lower;
  if (height <= 0) return null;
  if (direction === 'LONG') {
    const low = numericOrNull(candle.low);
    if (low === null || low > upper) return null;
    const mitigatedPrice = clamp(low, lower, upper);
    return Math.round(((upper - mitigatedPrice) / height) * 100);
  }
  const high = numericOrNull(candle.high);
  if (high === null || high < lower) return null;
  const mitigatedPrice = clamp(high, lower, upper);
  return Math.round(((mitigatedPrice - lower) / height) * 100);
}

function closeAcceptedThrough(direction: HtfFvgReactionDirection, candle: ChartCandleFact, lower: number, upper: number): boolean {
  const close = numericOrNull(candle.close);
  if (close === null) return false;
  return direction === 'LONG' ? close < lower : close > upper;
}

function closeRejectedFromZone(direction: HtfFvgReactionDirection, candle: ChartCandleFact, lower: number, upper: number): boolean {
  const close = numericOrNull(candle.close);
  if (close === null) return false;
  return direction === 'LONG' ? close > upper : close < lower;
}

function closeInsideZone(candle: ChartCandleFact, lower: number, upper: number): boolean {
  const close = numericOrNull(candle.close);
  return close !== null && close >= lower && close <= upper;
}

function buildLifecycle(args: {
  timeframe: HtfFvgReactionTimeframe;
  direction: HtfFvgReactionDirection;
  zone: FvgZoneFact;
  lower: number;
  upper: number;
  candles: ChartCandleFact[];
}): HtfFvgLifecycle {
  const touched = args.candles
    .filter((candle) => candleAfterZoneFormation(candle, args.zone))
    .filter((candle) => candleTouchesZone(candle, args.lower, args.upper));
  const accepted = touched.find((candle) => closeAcceptedThrough(args.direction, candle, args.lower, args.upper)) || null;
  const afterAccepted = accepted
    ? touched.filter((candle) => candleTimestamp(candle) !== null && candleTimestamp(candle)! > (candleTimestamp(accepted) || ''))
    : [];
  const inverted = afterAccepted.find((candle) => closeRejectedFromZone(args.direction === 'LONG' ? 'SHORT' : 'LONG', candle, args.lower, args.upper)) || null;
  const latest = touched[touched.length - 1] || null;
  const deepestMitigationPercent = touched.reduce<number | null>((max, candle) => {
    const percent = mitigationPercent(args.direction, candle, args.lower, args.upper);
    if (percent === null) return max;
    return max === null ? percent : Math.max(max, percent);
  }, null);
  const state: HtfFvgLifecycleState = !touched.length
    ? 'active_untested'
    : inverted
    ? 'inverted'
    : accepted
    ? 'accepted_through'
    : latest && closeRejectedFromZone(args.direction, latest, args.lower, args.upper)
    ? 'rejected'
    : latest && closeInsideZone(latest, args.lower, args.upper)
    ? 'partially_mitigated'
    : 'active_retested';
  const zoneText = `${args.lower.toFixed(2)}-${args.upper.toFixed(2)}`;
  return {
    sourceOfTruth: 'scanner_htf_parent_fvg_lifecycle',
    state,
    touchCount: touched.length,
    firstTouchAt: maybeCandleTimestamp(touched[0]),
    latestTouchAt: maybeCandleTimestamp(latest),
    acceptedThroughAt: maybeCandleTimestamp(accepted),
    invertedAt: maybeCandleTimestamp(inverted),
    deepestMitigationPercent,
    evidence: [
      `${args.timeframe} ${args.direction} parent FVG ${zoneText} lifecycle state=${state}.`,
      touched.length
        ? `Touches=${touched.length}; deepest mitigation=${deepestMitigationPercent ?? 'N/A'}%; latest touch=${maybeCandleTimestamp(latest) || 'N/A'}.`
        : 'No completed OHLC touch after formation; zone remains active and untested.',
      accepted ? `Accepted through at ${maybeCandleTimestamp(accepted) || 'N/A'} by completed close.` : 'No completed close accepted through this parent zone.',
      inverted ? `Inversion detected at ${maybeCandleTimestamp(inverted) || 'N/A'} after acceptance through.` : 'No inversion detected after acceptance.',
    ],
  };
}

function buildReactionEvent(args: {
  timeframe: HtfFvgReactionTimeframe;
  direction: HtfFvgReactionDirection;
  zone: FvgZoneFact;
  lower: number;
  upper: number;
  candles: ChartCandleFact[];
}): HtfFvgReactionEvent | null {
  const touched = args.candles
    .filter((candle) => candleAfterZoneFormation(candle, args.zone))
    .filter((candle) => candleTouchesZone(candle, args.lower, args.upper));
  const latest = touched[touched.length - 1];
  if (!latest) return null;
  const close = numericOrNull(latest.close);
  const state = reactionStateForClose(args.direction, close, args.lower, args.upper);
  const zoneText = `${args.lower.toFixed(2)}-${args.upper.toFixed(2)}`;
  return {
    sourceOfTruth: 'scanner_htf_parent_fvg_reaction_event',
    timeframe: args.timeframe,
    timestamp: candleTimestamp(latest),
    state,
    close,
    evidence: `${args.timeframe} ${args.direction} parent FVG ${zoneText} was retested; latest close ${close === null ? 'N/A' : close.toFixed(2)} classified as ${state}.`,
  };
}

function buildParentZoneMemory(args: {
  timeframe: Exclude<HtfFvgReactionTimeframe, '5M'>;
  zone: FvgZoneFact;
  candles: ChartCandleFact[];
}): HtfFvgReactionZoneMemory | null {
  if (args.zone.direction !== 'LONG' && args.zone.direction !== 'SHORT') return null;
  const lower = numericOrNull(args.zone.lower);
  const upper = numericOrNull(args.zone.upper);
  if (lower === null || upper === null) return null;
  if (typeof args.zone.filledPercent === 'number' && args.zone.filledPercent >= 100 && !args.zone.reclaimed) return null;
  const low = Math.min(lower, upper);
  const high = Math.max(lower, upper);
  const midpoint = numericOrNull(args.zone.midpoint) ?? (low + high) / 2;
  const lifecycle = buildLifecycle({
    timeframe: args.timeframe,
    direction: args.zone.direction,
    zone: args.zone,
    lower: low,
    upper: high,
    candles: args.candles,
  });
  const latestReaction = buildReactionEvent({
    timeframe: args.timeframe,
    direction: args.zone.direction,
    zone: args.zone,
    lower: low,
    upper: high,
    candles: args.candles,
  });
  const zoneText = `${low.toFixed(2)}-${high.toFixed(2)}`;
  return {
    sourceOfTruth: 'scanner_htf_parent_fvg_reaction_zone_memory',
    direction: args.zone.direction,
    timeframe: args.timeframe,
    lower: low,
    upper: high,
    midpoint,
    formedAt: args.zone.formedAt || null,
    confidence: args.zone.confidence,
    latestReaction,
    lifecycle,
    state: latestReaction?.state || 'untested',
    evidence: [
      `${args.timeframe} ${args.zone.direction} parent FVG ${zoneText}${args.zone.formedAt ? ` formed ${args.zone.formedAt}` : ''}.`,
      latestReaction?.evidence || `No later OHLC retest recorded for ${args.timeframe} parent FVG ${zoneText}.`,
      ...lifecycle.evidence,
    ],
  };
}

function buildChildConfirmation(args: {
  direction: HtfFvgReactionDirection | null;
  fiveMinute?: TimeframeFactSet | null;
}): HtfFvgChildConfirmationMemory | null {
  if (!args.direction || !args.fiveMinute) return null;
  const zones = (args.fiveMinute.fvgZones || [])
    .filter((zone) => zone.direction === args.direction)
    .filter((zone) => numericOrNull(zone.lower) !== null && numericOrNull(zone.upper) !== null);
  const zone = zones[0];
  if (!zone) {
    return {
      sourceOfTruth: 'scanner_htf_parent_fvg_child_confirmation_memory',
      direction: args.direction,
      timeframe: '5M',
      lower: null,
      upper: null,
      midpoint: null,
      formedAt: null,
      state: 'waiting_for_child_5m_proof',
      evidence: ['No same-direction 5M FVG child confirmation is present in structured OHLC facts.'],
    };
  }
  const lower = numericOrNull(zone.lower);
  const upper = numericOrNull(zone.upper);
  const low = lower === null || upper === null ? null : Math.min(lower, upper);
  const high = lower === null || upper === null ? null : Math.max(lower, upper);
  const midpoint = low === null || high === null ? null : numericOrNull(zone.midpoint) ?? (low + high) / 2;
  return {
    sourceOfTruth: 'scanner_htf_parent_fvg_child_confirmation_memory',
    direction: args.direction,
    timeframe: '5M',
    lower: low,
    upper: high,
    midpoint,
    formedAt: zone.formedAt || null,
    state: 'child_fvg_confirmed',
    evidence: [
      `Same-direction 5M child FVG confirmed${low !== null && high !== null ? ` at ${low.toFixed(2)}-${high.toFixed(2)}` : ''}${zone.formedAt ? ` formed ${zone.formedAt}` : ''}.`,
      'Child confirmation is context/routing memory only; completed 5M trigger, risk, target, invalidation, and canExecute gates remain unchanged.',
    ],
  };
}

function parentSets(context: ChartContext['multiTimeframeContext']): Array<{
  timeframe: Exclude<HtfFvgReactionTimeframe, '5M'>;
  set: TimeframeFactSet;
}> {
  return [
    context.fourHour,
    context.twoHour,
    context.oneHour,
    context.fifteenMinute,
  ]
    .filter((set): set is TimeframeFactSet => Boolean(set))
    .map((set) => ({ timeframe: timeframeLabel(set.timeframe), set }))
    .filter((item): item is { timeframe: Exclude<HtfFvgReactionTimeframe, '5M'>; set: TimeframeFactSet } =>
      item.timeframe === '240M' || item.timeframe === '120M' || item.timeframe === '60M' || item.timeframe === '15M'
    );
}

function activeReactionScore(zone: HtfFvgReactionZoneMemory): number {
  if (zone.lifecycle.state === 'accepted_through' || zone.lifecycle.state === 'inverted' || zone.lifecycle.state === 'data_limited') {
    return -1000;
  }
  const stateScore = zone.state === 'rejected'
    ? 100
    : zone.state === 'inside_zone'
    ? 70
    : zone.state === 'retested'
    ? 50
    : zone.state === 'accepted_through'
    ? 20
    : 0;
  return stateScore + htfPriority(zone.timeframe);
}

function timestampMs(value: string | null | undefined): number {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

function currentPriceFromContext(context: ChartContext['multiTimeframeContext']): number | null {
  const close = numericOrNull(context.fiveMinute?.close);
  if (close !== null) return close;
  const candles = context.fiveMinute?.candles || [];
  return numericOrNull(candles[candles.length - 1]?.close);
}

function distanceToZone(anchor: number | null, zone: HtfFvgReactionZoneMemory): number {
  if (anchor === null) return Number.POSITIVE_INFINITY;
  if (anchor >= zone.lower && anchor <= zone.upper) return 0;
  return Math.min(Math.abs(anchor - zone.lower), Math.abs(anchor - zone.upper));
}

function activeReactionDisplayScore(zone: HtfFvgReactionZoneMemory): number {
  if (zone.lifecycle.state === 'accepted_through' || zone.lifecycle.state === 'inverted' || zone.lifecycle.state === 'data_limited') return 0;
  if (zone.state === 'rejected') return 4;
  if (zone.state === 'inside_zone') return 3;
  if (zone.state === 'retested') return 2;
  if (zone.state === 'untested') return 1;
  return 0;
}

function selectActiveReaction(
  parentZones: HtfFvgReactionZoneMemory[],
  anchorPrice: number | null,
): HtfFvgReactionZoneMemory | null {
  return parentZones
    .filter((zone) => zone.state !== 'accepted_through')
    .filter((zone) => zone.lifecycle.state !== 'accepted_through' && zone.lifecycle.state !== 'inverted' && zone.lifecycle.state !== 'data_limited')
    .sort((a, b) => (
      activeReactionDisplayScore(b) - activeReactionDisplayScore(a) ||
      distanceToZone(anchorPrice, a) - distanceToZone(anchorPrice, b) ||
      htfPriority(b.timeframe) - htfPriority(a.timeframe) ||
      timestampMs(b.latestReaction?.timestamp) - timestampMs(a.latestReaction?.timestamp)
    ))[0] || null;
}

function parentStackSummary(
  parentZones: HtfFvgReactionZoneMemory[],
  direction: HtfFvgReactionDirection | null,
  anchorPrice: number | null,
): string {
  const stack = parentZones
    .filter((zone) => !direction || zone.direction === direction)
    .filter((zone) => zone.state !== 'accepted_through')
    .filter((zone) => zone.lifecycle.state !== 'accepted_through' && zone.lifecycle.state !== 'inverted' && zone.lifecycle.state !== 'data_limited')
    .sort((a, b) => (
      activeReactionDisplayScore(b) - activeReactionDisplayScore(a) ||
      htfPriority(b.timeframe) - htfPriority(a.timeframe) ||
      distanceToZone(anchorPrice, a) - distanceToZone(anchorPrice, b) ||
      timestampMs(b.latestReaction?.timestamp) - timestampMs(a.latestReaction?.timestamp)
    ))
    .slice(0, 5)
    .map((zone) => `${zone.timeframe} ${zone.lower.toFixed(2)}-${zone.upper.toFixed(2)} ${zone.state}`);
  return stack.length
    ? `Parent stack: ${stack.join(' / ')}.`
    : 'Parent stack: no active same-side HTF parent FVG zones.';
}

export function buildHtfFvgReactionMemory(args: {
  chartContext?: Partial<ChartContext> | null;
  direction?: HtfFvgReactionDirection | null;
}): HtfFvgReactionMemory | null {
  const context = args.chartContext?.multiTimeframeContext;
  if (!context) return null;
  const requestedDirection = args.direction === 'LONG' || args.direction === 'SHORT' ? args.direction : null;
  const currentPrice = currentPriceFromContext(context);
  const parentZones = parentSets(context)
    .flatMap(({ timeframe, set }) =>
      (set.fullWindowFvgZones?.length ? set.fullWindowFvgZones : set.fvgZones || [])
        .filter((zone) => !requestedDirection || zone.direction === requestedDirection)
        .map((zone) => buildParentZoneMemory({ timeframe, zone, candles: set.fullWindowCandles?.length ? set.fullWindowCandles : set.candles || [] }))
        .filter((zone): zone is HtfFvgReactionZoneMemory => Boolean(zone))
    )
    .sort((a, b) => activeReactionScore(b) - activeReactionScore(a) || htfPriority(b.timeframe) - htfPriority(a.timeframe));
  if (!parentZones.length) return null;
  const preliminaryActiveReaction = selectActiveReaction(parentZones, currentPrice);
  const direction = requestedDirection || preliminaryActiveReaction?.direction || null;
  const childConfirmation = buildChildConfirmation({
    direction,
    fiveMinute: context.fiveMinute,
  });
  const anchorPrice = numericOrNull(childConfirmation?.midpoint) ?? currentPrice;
  const activeReaction = selectActiveReaction(
    direction ? parentZones.filter((zone) => zone.direction === direction) : parentZones,
    anchorPrice,
  );
  const stackSummary = parentStackSummary(parentZones, direction, anchorPrice);
  const summary = activeReaction
    ? `Nearest active rejection zone: ${activeReaction.timeframe} ${activeReaction.direction} parent FVG ${activeReaction.lower.toFixed(2)}-${activeReaction.upper.toFixed(2)} is ${activeReaction.state}; ${childConfirmation?.state || 'no 5M child memory'}. ${stackSummary}`
    : 'No active HTF parent FVG reaction memory.';
  return {
    sourceOfTruth: 'scanner_htf_parent_fvg_reaction_memory',
    direction,
    parentZones,
    activeReaction,
    childConfirmation,
    summary,
    parentStackSummary: stackSummary,
    approvalBoundary: {
      changesTradeApprovals: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      changesRiskRules: false,
      createsNewModel: false,
    },
  };
}
