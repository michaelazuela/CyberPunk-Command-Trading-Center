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
    state: latestReaction?.state || 'untested',
    evidence: [
      `${args.timeframe} ${args.zone.direction} parent FVG ${zoneText}${args.zone.formedAt ? ` formed ${args.zone.formedAt}` : ''}.`,
      latestReaction?.evidence || `No later OHLC retest recorded for ${args.timeframe} parent FVG ${zoneText}.`,
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

export function buildHtfFvgReactionMemory(args: {
  chartContext?: Partial<ChartContext> | null;
  direction?: HtfFvgReactionDirection | null;
}): HtfFvgReactionMemory | null {
  const context = args.chartContext?.multiTimeframeContext;
  if (!context) return null;
  const requestedDirection = args.direction === 'LONG' || args.direction === 'SHORT' ? args.direction : null;
  const parentZones = parentSets(context)
    .flatMap(({ timeframe, set }) =>
      (set.fvgZones || [])
        .filter((zone) => !requestedDirection || zone.direction === requestedDirection)
        .map((zone) => buildParentZoneMemory({ timeframe, zone, candles: set.candles || [] }))
        .filter((zone): zone is HtfFvgReactionZoneMemory => Boolean(zone))
    )
    .sort((a, b) => activeReactionScore(b) - activeReactionScore(a) || htfPriority(b.timeframe) - htfPriority(a.timeframe));
  if (!parentZones.length) return null;
  const activeReaction = parentZones.find((zone) => zone.state !== 'accepted_through') || null;
  const direction = requestedDirection || activeReaction?.direction || null;
  const childConfirmation = buildChildConfirmation({
    direction,
    fiveMinute: context.fiveMinute,
  });
  const summary = activeReaction
    ? `${activeReaction.timeframe} ${activeReaction.direction} parent FVG ${activeReaction.lower.toFixed(2)}-${activeReaction.upper.toFixed(2)} is ${activeReaction.state}; ${childConfirmation?.state || 'no 5M child memory'}.`
    : 'No active HTF parent FVG reaction memory.';
  return {
    sourceOfTruth: 'scanner_htf_parent_fvg_reaction_memory',
    direction,
    parentZones,
    activeReaction,
    childConfirmation,
    summary,
    approvalBoundary: {
      changesTradeApprovals: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      changesRiskRules: false,
      createsNewModel: false,
    },
  };
}
