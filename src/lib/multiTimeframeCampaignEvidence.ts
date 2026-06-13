import { targetsFromEntryStop, TRADE_RULES } from '../config/tradeRules';
import type {
  BridgeBarTimestampMode,
  BridgeBarTimeZoneMode,
  MssEvidenceDirection,
  MssEvidenceTimeframe,
  PriceDirection,
  TimeframeMssEvidence,
} from '../types';
import type { NinjaBridgeBar } from './ninjaTraderBridge';
import { buildTimeframeMssEvidence } from './timeframeMssEvidence';

type CampaignTimeframe = '15M' | '60M' | '120M' | '240M';
type CampaignDirection = 'LONG' | 'SHORT' | 'NEUTRAL' | 'CONFLICT' | 'DATA_LIMITED';

const CAMPAIGN_TIMEFRAMES: CampaignTimeframe[] = ['15M', '60M', '120M', '240M'];
const WEIGHTS: Record<CampaignTimeframe, number> = {
  '15M': 30,
  '60M': 25,
  '120M': 20,
  '240M': 25,
};

export interface CampaignCoverageFact {
  timeframe: CampaignTimeframe | '5M';
  barsLoaded: number;
  rangeStart: string | null;
  rangeEnd: string | null;
  sufficient: boolean;
  minimumExpected: string;
}

export interface CampaignTimeframeEvidence {
  timeframe: CampaignTimeframe;
  mss: TimeframeMssEvidence;
  latestDisplacement: {
    present: boolean;
    direction: Exclude<MssEvidenceDirection, 'neutral' | 'unknown'> | null;
    timestamp: string | null;
    score: number;
  };
  longSupport: number;
  shortSupport: number;
  effectiveDirection: PriceDirection;
  blockers: string[];
}

export interface MultiTimeframeCampaignEvidence {
  source: 'ninjatrader_ohlc';
  authority: 'campaign_context_only';
  boundary: 'audit_only_not_approval_or_execution_authority';
  asOfTimestamp: string;
  campaignDirection: CampaignDirection;
  campaignConfidence: number;
  reliability: 'sufficient' | 'partial' | 'data_limited';
  timeframes: CampaignTimeframeEvidence[];
  fifteenMinuteAlignment: 'aligned' | 'opposed' | 'neutral' | 'data_limited';
  blockers: string[];
  evidence: string[];
  coverage: CampaignCoverageFact[];
  approvesExecution: false;
  changesTradeLogic: false;
}

export interface FiveMinuteCampaignTrigger {
  status: 'found' | 'not_found';
  direction: Exclude<PriceDirection, 'NO TRADE'>;
  triggerType: 'fresh_5m_structure_break' | 'none';
  timestamp: string | null;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  riskPoints: number | null;
  riskStatus: 'standard' | 'extended' | 'invalid' | 'unknown';
  brokenLevel: number | null;
  protectedStructure: number | null;
  evidence: string[];
  blockers: string[];
  canExecute: false;
}

function normalizeTime(value: string): string {
  return String(value || '').trim().replace(/\.\d+/, '').replace(/(?:Z|[+-]\d{2}:\d{2})$/, '').slice(0, 19);
}

function timeMs(value: string): number {
  return new Date(`${normalizeTime(value)}-04:00`).getTime();
}

function validBars(bars?: NinjaBridgeBar[]): NinjaBridgeBar[] {
  return (bars || [])
    .filter((bar) =>
      bar &&
      typeof bar.time === 'string' &&
      Number.isFinite(bar.open) &&
      Number.isFinite(bar.high) &&
      Number.isFinite(bar.low) &&
      Number.isFinite(bar.close) &&
      bar.high >= Math.max(bar.open, bar.close) &&
      bar.low <= Math.min(bar.open, bar.close)
    )
    .slice()
    .sort((a, b) => timeMs(a.time) - timeMs(b.time));
}

function barsThrough(bars: NinjaBridgeBar[] | undefined, asOfTimestamp: string): NinjaBridgeBar[] {
  const asOf = timeMs(asOfTimestamp);
  return validBars(bars).filter((bar) => timeMs(bar.time) <= asOf);
}

function range(bar: NinjaBridgeBar): number {
  return Math.max(0, bar.high - bar.low);
}

function body(bar: NinjaBridgeBar): number {
  return Math.abs(bar.close - bar.open);
}

function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function directionForBar(bar: NinjaBridgeBar): Exclude<MssEvidenceDirection, 'neutral' | 'unknown'> | null {
  if (bar.close > bar.open) return 'bullish';
  if (bar.close < bar.open) return 'bearish';
  return null;
}

function planDirection(direction: MssEvidenceDirection | null | undefined): PriceDirection {
  if (direction === 'bullish') return 'LONG';
  if (direction === 'bearish') return 'SHORT';
  return 'NO TRADE';
}

function latestDisplacement(bars: NinjaBridgeBar[]): CampaignTimeframeEvidence['latestDisplacement'] {
  for (let index = bars.length - 1; index >= 0; index -= 1) {
    const bar = bars[index];
    const candleRange = range(bar);
    const direction = directionForBar(bar);
    if (!direction || candleRange <= 0) continue;
    const bodyToRange = body(bar) / candleRange;
    const closeLocation = direction === 'bullish'
      ? (bar.close - bar.low) / candleRange
      : (bar.high - bar.close) / candleRange;
    const priorAverage = average(bars.slice(Math.max(0, index - 8), index).map(range).filter((value) => value > 0));
    const rangeExpansion = priorAverage > 0 ? candleRange / priorAverage : 1;
    const score = Math.round(Math.max(0, Math.min(100, (bodyToRange * 45) + (closeLocation * 35) + (Math.min(rangeExpansion, 2) / 2 * 20))));
    if (bodyToRange >= 0.5 && closeLocation >= 0.65 && rangeExpansion >= 1.15) {
      return { present: true, direction, timestamp: normalizeTime(bar.time), score };
    }
  }
  return { present: false, direction: null, timestamp: null, score: 0 };
}

function supportFor(
  timeframe: CampaignTimeframe,
  evidence: TimeframeMssEvidence,
  displacement: CampaignTimeframeEvidence['latestDisplacement']
): { longSupport: number; shortSupport: number; blockers: string[] } {
  const weight = WEIGHTS[timeframe];
  let longSupport = 0;
  let shortSupport = 0;
  const blockers = [...(evidence.blockers || [])];
  const add = (direction: MssEvidenceDirection | null | undefined, value: number) => {
    if (direction === 'bullish') longSupport += value;
    if (direction === 'bearish') shortSupport += value;
  };

  if (evidence.status === 'confirmed_mss') add(evidence.direction, weight);
  else if (evidence.status === 'displacement_without_mss') add(evidence.direction, weight * 0.55);
  else if (evidence.status === 'insufficient_data' || evidence.status === 'pending_incomplete_bar') blockers.push(`${timeframe}: campaign read is data-limited.`);

  if (displacement.present) add(displacement.direction, weight * 0.35);
  return {
    longSupport: Math.round(longSupport),
    shortSupport: Math.round(shortSupport),
    blockers,
  };
}

function directionFromSupport(longSupport: number, shortSupport: number): PriceDirection {
  if (longSupport > shortSupport) return 'LONG';
  if (shortSupport > longSupport) return 'SHORT';
  return 'NO TRADE';
}

export function buildMultiTimeframeCampaignEvidence(args: {
  barsByTimeframe: Partial<Record<'15M' | '60M' | '120M' | '240M', NinjaBridgeBar[]>>;
  asOfTimestamp: string;
  coverage?: CampaignCoverageFact[];
  barTimestampMode?: BridgeBarTimestampMode;
  barTimeZone?: BridgeBarTimeZoneMode;
}): MultiTimeframeCampaignEvidence {
  const coverage = args.coverage || [];
  const timeframes = CAMPAIGN_TIMEFRAMES.map((timeframe) => {
    const bars = barsThrough(args.barsByTimeframe[timeframe], args.asOfTimestamp);
    const mss = buildTimeframeMssEvidence({
      timeframe: timeframe as MssEvidenceTimeframe,
      bars,
      asOfTimestamp: args.asOfTimestamp,
      barTimestampMode: args.barTimestampMode || 'open',
      barTimeZone: args.barTimeZone || 'eastern',
    });
    const displacement = latestDisplacement(bars);
    const support = supportFor(timeframe, mss, displacement);
    return {
      timeframe,
      mss,
      latestDisplacement: displacement,
      ...support,
      effectiveDirection: directionFromSupport(support.longSupport, support.shortSupport),
      blockers: support.blockers,
    };
  });

  const dataLimitedCoverage = coverage.filter((item) => item.timeframe !== '5M' && !item.sufficient);
  const dataLimitedEvidence = timeframes.filter((item) =>
    item.mss.status === 'insufficient_data' ||
    item.mss.status === 'pending_incomplete_bar'
  );
  const reliability = dataLimitedCoverage.length || dataLimitedEvidence.length
    ? dataLimitedEvidence.length >= 2 || dataLimitedCoverage.length >= 2 ? 'data_limited' : 'partial'
    : 'sufficient';
  const longScore = timeframes.reduce((sum, item) => sum + item.longSupport, 0);
  const shortScore = timeframes.reduce((sum, item) => sum + item.shortSupport, 0);
  const diff = Math.abs(longScore - shortScore);
  const winner = shortScore > longScore ? 'SHORT' : longScore > shortScore ? 'LONG' : 'NO TRADE';
  const fifteen = timeframes.find((item) => item.timeframe === '15M');
  const fifteenDirection = fifteen?.effectiveDirection || 'NO TRADE';
  const fifteenMinuteAlignment = reliability === 'data_limited'
    ? 'data_limited'
    : winner === 'NO TRADE' || fifteenDirection === 'NO TRADE'
      ? 'neutral'
      : fifteenDirection === winner ? 'aligned' : 'opposed';

  let campaignDirection: CampaignDirection = 'NEUTRAL';
  if (reliability === 'data_limited') campaignDirection = 'DATA_LIMITED';
  else if (diff < 20 && longScore >= 25 && shortScore >= 25) campaignDirection = 'CONFLICT';
  else if (winner !== 'NO TRADE' && Math.max(longScore, shortScore) >= 45) campaignDirection = winner;
  const blockers = [
    ...dataLimitedCoverage.map((item) => `${item.timeframe}: insufficient 30-day campaign coverage (${item.barsLoaded} bars, ${item.rangeStart || 'N/A'} to ${item.rangeEnd || 'N/A'}).`),
    ...timeframes.flatMap((item) => item.blockers),
    ...(fifteenMinuteAlignment === 'opposed' ? ['15M campaign map opposes the winning HTF campaign direction.'] : []),
    ...(campaignDirection === 'CONFLICT' ? ['Campaign evidence is mixed across 15M/60M/120M/240M.'] : []),
  ];
  const evidence = timeframes.map((item) =>
    `${item.timeframe}: MSS=${item.mss.status}/${item.mss.direction} at ${item.mss.evidenceTimestamp || 'N/A'}, displacement=${item.latestDisplacement.present ? `${item.latestDisplacement.direction} at ${item.latestDisplacement.timestamp}` : 'none'}, support L/S=${item.longSupport}/${item.shortSupport}.`
  );

  return {
    source: 'ninjatrader_ohlc',
    authority: 'campaign_context_only',
    boundary: 'audit_only_not_approval_or_execution_authority',
    asOfTimestamp: normalizeTime(args.asOfTimestamp),
    campaignDirection,
    campaignConfidence: Math.max(0, Math.min(100, Math.round(Math.max(longScore, shortScore) - Math.min(longScore, shortScore) + (fifteenMinuteAlignment === 'aligned' ? 10 : 0)))),
    reliability,
    timeframes,
    fifteenMinuteAlignment,
    blockers,
    evidence,
    coverage,
    approvesExecution: false,
    changesTradeLogic: false,
  };
}

type SwingPoint = {
  type: 'high' | 'low';
  index: number;
  price: number;
  timestamp: string;
};

function confirmedSwings(bars: NinjaBridgeBar[], strength = 1): SwingPoint[] {
  const swings: SwingPoint[] = [];
  for (let index = strength; index < bars.length - strength; index += 1) {
    const bar = bars[index];
    const left = bars.slice(index - strength, index);
    const right = bars.slice(index + 1, index + strength + 1);
    if (left.every((item) => bar.high > item.high) && right.every((item) => bar.high > item.high)) swings.push({ type: 'high', index, price: bar.high, timestamp: bar.time });
    if (left.every((item) => bar.low < item.low) && right.every((item) => bar.low < item.low)) swings.push({ type: 'low', index, price: bar.low, timestamp: bar.time });
  }
  return swings;
}

function lastSwingBefore(swings: SwingPoint[], index: number, type: SwingPoint['type']): SwingPoint | null {
  return swings.filter((swing) => swing.type === type && swing.index < index).at(-1) || null;
}

export function findFirstFiveMinuteCampaignStructureTrigger(args: {
  bars5m: NinjaBridgeBar[];
  direction: Exclude<PriceDirection, 'NO TRADE'>;
  fromTimestamp: string;
  maxRiskPoints?: number;
}): FiveMinuteCampaignTrigger {
  const bars = validBars(args.bars5m);
  const from = timeMs(args.fromTimestamp);
  const swings = confirmedSwings(bars);
  const maxRisk = args.maxRiskPoints || TRADE_RULES.maxRiskPoints;

  for (let index = 1; index < bars.length; index += 1) {
    const bar = bars[index];
    const prior = bars[index - 1];
    if (timeMs(bar.time) < from) continue;
    const swingLow = lastSwingBefore(swings, index, 'low');
    const swingHigh = lastSwingBefore(swings, index, 'high');
    const bearishBreak = args.direction === 'SHORT' && swingLow && prior.close >= swingLow.price && bar.close < swingLow.price;
    const bullishBreak = args.direction === 'LONG' && swingHigh && prior.close <= swingHigh.price && bar.close > swingHigh.price;
    if (!bearishBreak && !bullishBreak) continue;

    const entry = bar.close;
    const protectedStructure = args.direction === 'SHORT' ? swingHigh?.price ?? null : swingLow?.price ?? null;
    const stop = protectedStructure === null
      ? null
      : args.direction === 'SHORT'
        ? protectedStructure + TRADE_RULES.targetModel.tickSize
        : protectedStructure - TRADE_RULES.targetModel.tickSize;
    const riskPoints = stop === null ? null : Math.abs(entry - stop);
    const targets = stop !== null && riskPoints > 0 ? targetsFromEntryStop(args.direction, entry, stop) : null;
    const riskStatus = riskPoints === null || riskPoints <= 0
      ? 'invalid'
      : riskPoints <= maxRisk ? 'standard' : 'extended';
    return {
      status: 'found',
      direction: args.direction,
      triggerType: 'fresh_5m_structure_break',
      timestamp: normalizeTime(bar.time),
      entry,
      stop,
      target1: targets?.target1 ?? null,
      target2: targets?.target2 ?? null,
      riskPoints,
      riskStatus,
      brokenLevel: args.direction === 'SHORT' ? swingLow?.price ?? null : swingHigh?.price ?? null,
      protectedStructure,
      evidence: [
        `${args.direction} 5M completed close broke structure at ${normalizeTime(bar.time)}.`,
        `Entry audit uses trigger candle close ${entry}; stop uses protected 5M structure ${stop ?? 'N/A'}.`,
      ],
      blockers: riskStatus === 'extended' ? [`Risk ${riskPoints} exceeds standard ${maxRisk} point limit.`] : [],
      canExecute: false,
    };
  }

  return {
    status: 'not_found',
    direction: args.direction,
    triggerType: 'none',
    timestamp: null,
    entry: null,
    stop: null,
    target1: null,
    target2: null,
    riskPoints: null,
    riskStatus: 'unknown',
    brokenLevel: null,
    protectedStructure: null,
    evidence: [],
    blockers: [`No fresh ${args.direction} completed 5M structure break found after ${normalizeTime(args.fromTimestamp)}.`],
    canExecute: false,
  };
}
