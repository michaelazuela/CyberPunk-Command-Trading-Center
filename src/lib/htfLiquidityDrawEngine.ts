import type { NinjaBridgeBar } from './ninjaTraderBridge';

export type HtfMssTimeframe = '4H' | '1H' | '15M' | '5M';

export type MssDirection = 'bullish' | 'bearish' | 'neutral' | 'unknown';

export type MssStatus =
  | 'potential_mss'
  | 'confirmed'
  | 'failed'
  | 'pending_confirm'
  | 'not_confirmed'
  | 'conflicting'
  | 'unknown';

export type MssLifecycleState =
  | 'no_mss'
  | 'potential_mss'
  | 'mss_trigger_pending'
  | 'confirmed_mss'
  | 'post_mss_digestion'
  | 'failed_mss'
  | 'opposite_mss_confirmed'
  | 'conflicting_mss'
  | 'unknown';

export type LiquidityRaidState =
  | 'sell_side_raid'
  | 'buy_side_raid'
  | 'none'
  | 'unknown';

export interface TimeframeMssState {
  timeframe: HtfMssTimeframe;
  direction: MssDirection;
  status: MssStatus;
  lifecycleState: MssLifecycleState;
  evidence: string[];
  invalidationLevel?: number;
  confirmationLevel?: number;
  externalLiquidityTarget?: string;
  confidence: number;
}

export type HtfLiquidityDrawClassification =
  | 'HTF_DRAW_DETECTED'
  | 'RAID_RECLAIM_DEVELOPING'
  | 'MSS_TRIGGER_PENDING'
  | 'MSS_TRIGGER_CONFIRMED'
  | 'NO_QUALIFIED_STATE'
  | 'FAILED_MSS'
  | 'POST_MSS_DIGESTION'
  | 'CONFLICTING_MSS';

export interface HtfLiquidityDrawState {
  source: 'ninjatrader_ohlc';
  authority: 'ohlc_facts_only';
  boundary: 'context_only_not_execution_authority';
  macroContext: MssDirection | 'conflicting';
  liquidityRaidState: LiquidityRaidState;
  classification: HtfLiquidityDrawClassification;
  timeframeStates: TimeframeMssState[];
  fiveMinuteState: TimeframeMssState;
  htfDrawContinuationPending: boolean;
  confidence: number;
  notes: string[];
  blockers: string[];
  createsTradingPlanCandidate: false;
  approvesExecution: false;
}

export interface HtfLiquidityDrawInput {
  bars4H?: NinjaBridgeBar[];
  bars1H?: NinjaBridgeBar[];
  bars15M?: NinjaBridgeBar[];
  bars5M?: NinjaBridgeBar[];
  externalBuySideLiquidityTarget?: string;
  externalSellSideLiquidityTarget?: string;
}

interface RaidEvent {
  type: Exclude<LiquidityRaidState, 'none' | 'unknown'>;
  index: number;
  sweptLevel: number;
  raidExtreme: number;
}

interface BreakEvent {
  index: number;
  level: number;
}

interface DirectionalAnalysis {
  raid: RaidEvent | null;
  breakEvent: BreakEvent | null;
  failed: boolean;
  postMssDigestion: boolean;
  oppositeMssConfirmed: boolean;
  evidence: string[];
}

const MIN_BARS_FOR_STRUCTURE = 5;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validBars(bars: NinjaBridgeBar[] | undefined): NinjaBridgeBar[] {
  return (bars || [])
    .filter((bar) =>
      bar &&
      isFiniteNumber(bar.open) &&
      isFiniteNumber(bar.high) &&
      isFiniteNumber(bar.low) &&
      isFiniteNumber(bar.close) &&
      bar.high >= Math.max(bar.open, bar.close) &&
      bar.low <= Math.min(bar.open, bar.close)
    )
    .slice()
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
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

function averageRangeBefore(bars: NinjaBridgeBar[], index: number): number {
  const prior = bars.slice(Math.max(0, index - 8), index);
  return average(prior.map(range).filter((value) => value > 0));
}

function isDisplacementBar(bars: NinjaBridgeBar[], index: number, direction: Exclude<MssDirection, 'neutral' | 'unknown'>): boolean {
  const bar = bars[index];
  if (!bar) return false;
  const candleRange = range(bar);
  if (candleRange <= 0) return false;
  const candleBody = body(bar);
  const closeLocation =
    direction === 'bullish'
      ? (bar.close - bar.low) / candleRange
      : (bar.high - bar.close) / candleRange;
  const avgRange = averageRangeBefore(bars, index);
  const expansion = avgRange > 0 ? candleRange >= avgRange * 1.15 : true;
  const directionalClose = direction === 'bullish' ? bar.close > bar.open : bar.close < bar.open;
  return directionalClose && candleBody / candleRange >= 0.5 && closeLocation >= 0.65 && expansion;
}

function priorLowLevel(bars: NinjaBridgeBar[], index: number): number | null {
  const prior = bars.slice(Math.max(0, index - 6), index);
  if (prior.length < 2) return null;
  return Math.min(...prior.map((bar) => bar.low));
}

function priorHighLevel(bars: NinjaBridgeBar[], index: number): number | null {
  const prior = bars.slice(Math.max(0, index - 6), index);
  if (prior.length < 2) return null;
  return Math.max(...prior.map((bar) => bar.high));
}

function findSellSideRaid(bars: NinjaBridgeBar[]): RaidEvent | null {
  for (let index = 2; index < bars.length; index += 1) {
    const level = priorLowLevel(bars, index);
    const bar = bars[index];
    if (level === null) continue;
    if (bar.low < level && bar.close > level) {
      return { type: 'sell_side_raid', index, sweptLevel: level, raidExtreme: bar.low };
    }
  }
  return null;
}

function findBuySideRaid(bars: NinjaBridgeBar[]): RaidEvent | null {
  for (let index = 2; index < bars.length; index += 1) {
    const level = priorHighLevel(bars, index);
    const bar = bars[index];
    if (level === null) continue;
    if (bar.high > level && bar.close < level) {
      return { type: 'buy_side_raid', index, sweptLevel: level, raidExtreme: bar.high };
    }
  }
  return null;
}

function confirmationLevelForRaid(bars: NinjaBridgeBar[], raid: RaidEvent, direction: Exclude<MssDirection, 'neutral' | 'unknown'>): number | null {
  const lookback = bars.slice(Math.max(0, raid.index - 8), raid.index);
  if (lookback.length < 2) return null;
  return direction === 'bullish'
    ? Math.max(...lookback.map((bar) => bar.high))
    : Math.min(...lookback.map((bar) => bar.low));
}

function findBreakAfterRaid(
  bars: NinjaBridgeBar[],
  raid: RaidEvent,
  direction: Exclude<MssDirection, 'neutral' | 'unknown'>,
  confirmationLevel: number | null
): BreakEvent | null {
  if (confirmationLevel === null) return null;
  for (let index = raid.index + 1; index < bars.length; index += 1) {
    const bar = bars[index];
    const breaksLevel = direction === 'bullish'
      ? bar.close > confirmationLevel
      : bar.close < confirmationLevel;
    if (breaksLevel && isDisplacementBar(bars, index, direction)) {
      return { index, level: confirmationLevel };
    }
  }
  return null;
}

function failedAfterRaid(
  bars: NinjaBridgeBar[],
  raid: RaidEvent,
  direction: Exclude<MssDirection, 'neutral' | 'unknown'>,
  beforeIndex: number | null
): boolean {
  const end = beforeIndex ?? bars.length;
  const afterRaid = bars.slice(raid.index + 1, end);
  return afterRaid.some((bar) =>
    direction === 'bullish'
      ? bar.low < raid.raidExtreme
      : bar.high > raid.raidExtreme
  );
}

function postShiftDigestion(
  bars: NinjaBridgeBar[],
  breakEvent: BreakEvent | null,
  direction: Exclude<MssDirection, 'neutral' | 'unknown'>
): boolean {
  if (!breakEvent) return false;
  const after = bars.slice(breakEvent.index + 1);
  if (after.length < 2) return false;
  const avgPriorRange = average(bars.slice(Math.max(0, breakEvent.index - 8), breakEvent.index + 1).map(range).filter((value) => value > 0));
  if (avgPriorRange <= 0) return false;
  const compressed = after.every((bar) => range(bar) <= avgPriorRange * 0.9);
  const noOppositeDisplacement = !after.some((_, offset) => isDisplacementBar(bars, breakEvent.index + 1 + offset, direction === 'bullish' ? 'bearish' : 'bullish'));
  return compressed && noOppositeDisplacement;
}

function oppositeMssAfterBreak(
  bars: NinjaBridgeBar[],
  breakEvent: BreakEvent | null,
  direction: Exclude<MssDirection, 'neutral' | 'unknown'>
): boolean {
  if (!breakEvent) return false;
  const after = bars.slice(breakEvent.index + 1);
  if (after.length < 3) return false;
  const oppositeDirection = direction === 'bullish' ? 'bearish' : 'bullish';
  const structureLevel = direction === 'bullish'
    ? Math.min(...bars.slice(Math.max(0, breakEvent.index - 4), breakEvent.index + 1).map((bar) => bar.low))
    : Math.max(...bars.slice(Math.max(0, breakEvent.index - 4), breakEvent.index + 1).map((bar) => bar.high));
  return after.some((bar, offset) => {
    const index = breakEvent.index + 1 + offset;
    const breaksOpposite = direction === 'bullish'
      ? bar.close < structureLevel
      : bar.close > structureLevel;
    return breaksOpposite && isDisplacementBar(bars, index, oppositeDirection);
  });
}

function analyzeDirection(bars: NinjaBridgeBar[], direction: Exclude<MssDirection, 'neutral' | 'unknown'>): DirectionalAnalysis {
  const raid = direction === 'bullish' ? findSellSideRaid(bars) : findBuySideRaid(bars);
  const evidence: string[] = [];
  if (!raid) {
    return {
      raid: null,
      breakEvent: null,
      failed: false,
      postMssDigestion: false,
      oppositeMssConfirmed: false,
      evidence,
    };
  }

  evidence.push(direction === 'bullish'
    ? `Sell-side liquidity swept and reclaimed at ${raid.sweptLevel}.`
    : `Buy-side liquidity swept and reclaimed at ${raid.sweptLevel}.`);

  const confirmationLevel = confirmationLevelForRaid(bars, raid, direction);
  const breakEvent = findBreakAfterRaid(bars, raid, direction, confirmationLevel);
  const failed = failedAfterRaid(bars, raid, direction, breakEvent?.index ?? null);
  const digestion = postShiftDigestion(bars, breakEvent, direction);
  const oppositeConfirmed = oppositeMssAfterBreak(bars, breakEvent, direction);

  if (breakEvent) {
    evidence.push(direction === 'bullish'
      ? `Confirmed close above prior 5M swing high ${breakEvent.level} with displacement.`
      : `Confirmed close below prior 5M swing low ${breakEvent.level} with displacement.`);
  } else if (confirmationLevel !== null) {
    evidence.push(direction === 'bullish'
      ? `Reclaim is developing; close above short-term swing high ${confirmationLevel} is still pending.`
      : `Reclaim is developing; close below short-term swing low ${confirmationLevel} is still pending.`);
  }

  if (failed) {
    evidence.push(direction === 'bullish'
      ? `Bullish potential MSS failed by trading below raid low ${raid.raidExtreme}.`
      : `Bearish potential MSS failed by trading above raid high ${raid.raidExtreme}.`);
  }
  if (digestion) evidence.push('Post-displacement candles are compressing without an opposite structure break.');
  if (oppositeConfirmed) evidence.push('Opposite MSS confirmed after displacement digestion.');

  return {
    raid,
    breakEvent,
    failed,
    postMssDigestion: digestion,
    oppositeMssConfirmed: oppositeConfirmed,
    evidence,
  };
}

function timeframeRoleEvidence(timeframe: HtfMssTimeframe): string {
  if (timeframe === '4H') return '4H MSS is macro draw context only and cannot create a candidate.';
  if (timeframe === '1H') return '1H MSS is session structure context only and cannot create a candidate.';
  if (timeframe === '15M') return '15M MSS is liquidity-map context only and cannot approve execution.';
  return '5M MSS is execution-timeframe evidence only; Phase 1 does not create trade candidates.';
}

function chooseDirection(bullish: DirectionalAnalysis, bearish: DirectionalAnalysis): Exclude<MssDirection, 'unknown'> {
  if (bullish.raid && bullish.failed && !bearish.raid) return 'bullish';
  if (bearish.raid && bearish.failed && !bullish.raid) return 'bearish';
  const bullishScore = (bullish.breakEvent ? 3 : 0) + (bullish.raid ? 1 : 0) - (bullish.failed ? 2 : 0);
  const bearishScore = (bearish.breakEvent ? 3 : 0) + (bearish.raid ? 1 : 0) - (bearish.failed ? 2 : 0);
  if (bullishScore > bearishScore && bullishScore > 0) return 'bullish';
  if (bearishScore > bullishScore && bearishScore > 0) return 'bearish';
  if (bullishScore === bearishScore && bullishScore > 0) return 'neutral';
  return 'neutral';
}

function buildStateForDirection(args: {
  timeframe: HtfMssTimeframe;
  direction: Exclude<MssDirection, 'neutral' | 'unknown'>;
  analysis: DirectionalAnalysis;
  target?: string;
}): TimeframeMssState {
  const { timeframe, direction, analysis, target } = args;
  const evidence = [...analysis.evidence, timeframeRoleEvidence(timeframe)];
  let status: MssStatus = 'not_confirmed';
  let lifecycleState: MssLifecycleState = 'no_mss';
  let confidence = 10;

  if (analysis.failed) {
    status = 'failed';
    lifecycleState = 'failed_mss';
    confidence = 20;
  } else if (analysis.oppositeMssConfirmed) {
    status = 'conflicting';
    lifecycleState = 'opposite_mss_confirmed';
    confidence = 45;
  } else if (analysis.breakEvent && analysis.postMssDigestion) {
    status = 'confirmed';
    lifecycleState = 'post_mss_digestion';
    confidence = 82;
  } else if (analysis.breakEvent) {
    status = 'confirmed';
    lifecycleState = 'confirmed_mss';
    confidence = 88;
  } else if (analysis.raid) {
    status = timeframe === '5M' ? 'pending_confirm' : 'potential_mss';
    lifecycleState = timeframe === '5M' ? 'mss_trigger_pending' : 'potential_mss';
    confidence = timeframe === '5M' ? 65 : 58;
  }

  if (target && status !== 'not_confirmed') {
    evidence.push(`External liquidity target context: ${target}.`);
    confidence = Math.min(100, confidence + 4);
  }

  return {
    timeframe,
    direction: status === 'not_confirmed' ? 'neutral' : direction,
    status,
    lifecycleState,
    evidence,
    invalidationLevel: analysis.raid?.raidExtreme,
    confirmationLevel: analysis.breakEvent?.level,
    externalLiquidityTarget: target,
    confidence,
  };
}

export function classifyTimeframeMssState(args: {
  timeframe: HtfMssTimeframe;
  bars?: NinjaBridgeBar[];
  externalBuySideLiquidityTarget?: string;
  externalSellSideLiquidityTarget?: string;
}): TimeframeMssState {
  const bars = validBars(args.bars);
  if (bars.length < MIN_BARS_FOR_STRUCTURE) {
    return {
      timeframe: args.timeframe,
      direction: 'unknown',
      status: 'unknown',
      lifecycleState: 'unknown',
      evidence: ['Insufficient OHLC bars to classify MSS state.', timeframeRoleEvidence(args.timeframe)],
      confidence: 0,
    };
  }

  const bullish = analyzeDirection(bars, 'bullish');
  const bearish = analyzeDirection(bars, 'bearish');
  const direction = chooseDirection(bullish, bearish);

  if (direction === 'bullish') {
    return buildStateForDirection({
      timeframe: args.timeframe,
      direction: 'bullish',
      analysis: bullish,
      target: args.externalBuySideLiquidityTarget,
    });
  }

  if (direction === 'bearish') {
    return buildStateForDirection({
      timeframe: args.timeframe,
      direction: 'bearish',
      analysis: bearish,
      target: args.externalSellSideLiquidityTarget,
    });
  }

  if ((bullish.raid || bearish.raid) && bullish.raid && bearish.raid) {
    return {
      timeframe: args.timeframe,
      direction: 'neutral',
      status: 'conflicting',
      lifecycleState: 'conflicting_mss',
      evidence: [
        ...bullish.evidence,
        ...bearish.evidence,
        'Both buy-side and sell-side raid/reclaim states are present without a dominant confirmed direction.',
        timeframeRoleEvidence(args.timeframe),
      ],
      confidence: 35,
    };
  }

  return {
    timeframe: args.timeframe,
    direction: 'neutral',
    status: 'not_confirmed',
    lifecycleState: 'no_mss',
    evidence: ['No qualifying raid/reclaim MSS sequence was confirmed from OHLC.', timeframeRoleEvidence(args.timeframe)],
    confidence: 10,
  };
}

function raidStateFromFiveMinute(state: TimeframeMssState): LiquidityRaidState {
  if (state.direction === 'bullish' && state.lifecycleState !== 'no_mss') return 'sell_side_raid';
  if (state.direction === 'bearish' && state.lifecycleState !== 'no_mss') return 'buy_side_raid';
  if (state.status === 'unknown') return 'unknown';
  return 'none';
}

function macroContextFromStates(states: TimeframeMssState[]): HtfLiquidityDrawState['macroContext'] {
  const contextStates = states.filter((state) => state.timeframe === '4H' || state.timeframe === '1H' || state.timeframe === '15M');
  const bullish = contextStates.filter((state) => state.direction === 'bullish' && state.status !== 'failed').length;
  const bearish = contextStates.filter((state) => state.direction === 'bearish' && state.status !== 'failed').length;
  if (bullish > bearish) return 'bullish';
  if (bearish > bullish) return 'bearish';
  if (bullish > 0 && bearish > 0) return 'conflicting';
  return 'neutral';
}

function classificationFromFiveMinute(state: TimeframeMssState, macroContext: HtfLiquidityDrawState['macroContext']): HtfLiquidityDrawClassification {
  if (state.lifecycleState === 'failed_mss') return 'FAILED_MSS';
  if (state.lifecycleState === 'opposite_mss_confirmed' || state.lifecycleState === 'conflicting_mss') return 'CONFLICTING_MSS';
  if (state.lifecycleState === 'post_mss_digestion') return 'POST_MSS_DIGESTION';
  if (state.lifecycleState === 'confirmed_mss') return 'MSS_TRIGGER_CONFIRMED';
  if (state.lifecycleState === 'mss_trigger_pending') return 'MSS_TRIGGER_PENDING';
  if (macroContext === 'bullish' || macroContext === 'bearish') return 'HTF_DRAW_DETECTED';
  return 'NO_QUALIFIED_STATE';
}

export function buildHtfLiquidityDrawState(input: HtfLiquidityDrawInput): HtfLiquidityDrawState {
  const timeframeStates = [
    classifyTimeframeMssState({
      timeframe: '4H',
      bars: input.bars4H,
      externalBuySideLiquidityTarget: input.externalBuySideLiquidityTarget,
      externalSellSideLiquidityTarget: input.externalSellSideLiquidityTarget,
    }),
    classifyTimeframeMssState({
      timeframe: '1H',
      bars: input.bars1H,
      externalBuySideLiquidityTarget: input.externalBuySideLiquidityTarget,
      externalSellSideLiquidityTarget: input.externalSellSideLiquidityTarget,
    }),
    classifyTimeframeMssState({
      timeframe: '15M',
      bars: input.bars15M,
      externalBuySideLiquidityTarget: input.externalBuySideLiquidityTarget,
      externalSellSideLiquidityTarget: input.externalSellSideLiquidityTarget,
    }),
    classifyTimeframeMssState({
      timeframe: '5M',
      bars: input.bars5M,
      externalBuySideLiquidityTarget: input.externalBuySideLiquidityTarget,
      externalSellSideLiquidityTarget: input.externalSellSideLiquidityTarget,
    }),
  ];
  const fiveMinuteState = timeframeStates.find((state) => state.timeframe === '5M') as TimeframeMssState;
  const macroContext = macroContextFromStates(timeframeStates);
  const classification = classificationFromFiveMinute(fiveMinuteState, macroContext);
  const confidence = Math.round(average(timeframeStates.map((state) => state.confidence)));
  const blockers = [
    'Phase 1 is context-only and does not create a trading-plan candidate.',
    '5M entry trigger, stop, risk, invalidation, and session gates remain required elsewhere before execution approval.',
  ];

  return {
    source: 'ninjatrader_ohlc',
    authority: 'ohlc_facts_only',
    boundary: 'context_only_not_execution_authority',
    macroContext,
    liquidityRaidState: raidStateFromFiveMinute(fiveMinuteState),
    classification,
    timeframeStates,
    fiveMinuteState,
    htfDrawContinuationPending: classification === 'MSS_TRIGGER_PENDING' || classification === 'MSS_TRIGGER_CONFIRMED',
    confidence,
    notes: [
      'Higher timeframe MSS states are market-map context only.',
      '5M confirmed MSS is evidence only in Phase 1 and does not approve a live trade.',
    ],
    blockers,
    createsTradingPlanCandidate: false,
    approvesExecution: false,
  };
}
