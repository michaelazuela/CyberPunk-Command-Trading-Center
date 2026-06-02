import type { NinjaBridgeBar } from './ninjaTraderBridge';
import type { ChartCandleFact, ChartContext, StructuralLevel, TimeframeFactSet } from '../types';
import { classifyActiveSetupScanWindowByEtMinutes } from '../config/timeWindows';

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
  | 'REVERSAL_DELIVERY_PLAN_CANDIDATE'
  | 'QUALIFIED_CONDITIONAL'
  | 'EXECUTABLE'
  | 'NO_QUALIFIED_STATE'
  | 'FAILED_MSS'
  | 'POST_MSS_DIGESTION'
  | 'CONFLICTING_MSS';

export interface HtfLiquidityDrawState {
  source: 'ninjatrader_ohlc';
  authority: 'ohlc_facts_only';
  boundary: 'context_only_not_execution_authority';
  drawDirection: 'buy_side' | 'sell_side' | 'none' | 'unknown';
  planDirection: 'LONG' | 'SHORT' | 'NONE';
  macroContext: MssDirection | 'conflicting';
  raidState: LiquidityRaidState;
  liquidityRaidState: LiquidityRaidState;
  reclaimStatus: Extract<MssStatus, 'confirmed' | 'potential_mss' | 'pending_confirm' | 'not_confirmed' | 'unknown'>;
  externalLiquidityTarget?: string;
  classification: HtfLiquidityDrawClassification;
  timeframeStates: TimeframeMssState[];
  timeframeStack: TimeframeMssState[];
  fiveMinuteState: TimeframeMssState;
  fiveMinuteMssTriggerConfirmed: boolean;
  fiveMinuteMssConfirmationType: 'swing_break_with_displacement' | 'reclaim_then_break' | 'unknown';
  postShiftState: 'post_mss_digestion' | 'retest_pending' | 'continuation_pending' | 'opposite_mss_confirmed' | 'unknown';
  fifteenMinuteConfirmationStatus: Extract<MssStatus, 'confirmed' | 'potential_mss' | 'pending_confirm' | 'not_confirmed' | 'unknown'>;
  activeScanWindow: 'MORNING_SETUP_SCAN' | 'LUNCH_PM_SETUP_SCAN' | 'OUTSIDE_SETUP_SCAN';
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
  chartTimestamp?: string | null;
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

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function minutesFromTimestamp(value?: string | null): number | null {
  if (!value) return null;
  const match = value.match(/T(\d{2}):(\d{2})/);
  if (match) return Number(match[1]) * 60 + Number(match[2]);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.getHours() * 60 + date.getMinutes();
}

function activeScanWindowFromTimestamp(value?: string | null): HtfLiquidityDrawState['activeScanWindow'] {
  const minutes = minutesFromTimestamp(value);
  if (minutes === null) return 'OUTSIDE_SETUP_SCAN';
  return classifyActiveSetupScanWindowByEtMinutes(minutes);
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
  if (timeframe === '15M') return '15M potential/pending MSS is liquidity-map support only; it cannot approve execution, 5M confirmation controls plan creation, and execution still requires final gates.';
  return '5M MSS is execution-timeframe evidence; potential/pending states cannot create a reversal-delivery candidate until a swing break with displacement confirms.';
}

export function describeTimeframeMssStateForDisplay(state: TimeframeMssState): string {
  if (state.timeframe === '4H' || state.timeframe === '1H') {
    if (state.status === 'potential_mss' || state.status === 'pending_confirm') {
      return 'Potential MSS forming on HTF/session structure. Context only. Waiting for lower-timeframe confirmation.';
    }
    return `${state.timeframe} structure context only. It cannot approve execution.`;
  }

  if (state.timeframe === '15M') {
    if (state.status === 'potential_mss' || state.status === 'pending_confirm') {
      return '15M potential MSS / pending confirm. Liquidity map supports the idea, but 5M confirmation controls plan creation.';
    }
    if (state.status === 'confirmed') {
      return '15M MSS confirmation supports the liquidity map only; execution still requires 5M trigger and final gates.';
    }
    return '15M liquidity-map support is not confirmed.';
  }

  if (state.status === 'failed' || state.lifecycleState === 'failed_mss') {
    return 'Potential MSS failed. Structure did not confirm and price invalidated the reclaim/rejection area.';
  }
  if (state.lifecycleState === 'mss_trigger_pending' || state.status === 'potential_mss' || state.status === 'pending_confirm') {
    return '5M potential MSS forming. Waiting for confirmed swing break with displacement before creating a reversal-delivery candidate.';
  }
  if (state.lifecycleState === 'post_mss_digestion') {
    return 'Post-MSS digestion. Consolidation after displacement is not an opposite MSS unless post-displacement structure breaks with clear displacement.';
  }
  if (state.status === 'confirmed') {
    return '5M MSS trigger confirmed by swing break with displacement. Building candidate from HTF draw + raid/reclaim context.';
  }
  return '5M MSS trigger is not confirmed. No executable trade.';
}

export function describeHtfLiquidityDrawStateForDisplay(state: Pick<HtfLiquidityDrawState, 'classification'>): string {
  switch (state.classification) {
    case 'HTF_DRAW_DETECTED':
      return 'HTF draw detected. No 5M MSS trigger yet. Context only. No executable trade.';
    case 'RAID_RECLAIM_DEVELOPING':
      return 'Liquidity raid/reclaim developing. Waiting for 5M MSS trigger.';
    case 'MSS_TRIGGER_PENDING':
      return '5M MSS trigger pending. Potential MSS is forming, but no confirmed swing break with displacement yet.';
    case 'MSS_TRIGGER_CONFIRMED':
      return '5M MSS trigger confirmed by swing break with displacement. Building candidate from HTF draw + raid/reclaim context.';
    case 'REVERSAL_DELIVERY_PLAN_CANDIDATE':
      return 'HTF Draw Continuation After Raid/Reclaim candidate detected. HTF draw, liquidity raid/reclaim, and confirmed 5M MSS align. Execution still requires deterministic entry, stop, target, risk, and final pipeline gates.';
    case 'QUALIFIED_CONDITIONAL':
      return 'Qualified conditional. Directional structure supports the model, but execution still needs the listed trigger, retest, risk, or validation requirement.';
    case 'FAILED_MSS':
      return 'Potential MSS failed. Structure did not confirm and price invalidated the reclaim/rejection area.';
    case 'POST_MSS_DIGESTION':
      return 'Post-MSS digestion. Consolidation after displacement is not an opposite MSS unless post-displacement structure breaks with clear displacement.';
    case 'CONFLICTING_MSS':
      return 'Conflicting MSS state. No executable trade until directional structure resolves.';
    case 'EXECUTABLE':
      return 'Scanner candidate fields are complete. Final trade wording belongs only to the app-owned pipeline after all gates pass.';
    default:
      return 'No qualified HTF Draw Continuation After Raid/Reclaim state. Context only. No executable trade.';
  }
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

function directionalPlanFromState(state: TimeframeMssState): HtfLiquidityDrawState['planDirection'] {
  if (state.direction === 'bullish') return 'LONG';
  if (state.direction === 'bearish') return 'SHORT';
  return 'NONE';
}

function drawDirectionFromPlan(planDirection: HtfLiquidityDrawState['planDirection']): HtfLiquidityDrawState['drawDirection'] {
  if (planDirection === 'LONG') return 'buy_side';
  if (planDirection === 'SHORT') return 'sell_side';
  return 'unknown';
}

function safeReclaimStatus(state: TimeframeMssState): HtfLiquidityDrawState['reclaimStatus'] {
  if (state.status === 'failed' || state.status === 'conflicting') return 'not_confirmed';
  return state.status;
}

function safeFifteenMinuteStatus(state: TimeframeMssState | undefined): HtfLiquidityDrawState['fifteenMinuteConfirmationStatus'] {
  if (!state || state.status === 'failed' || state.status === 'conflicting') return 'not_confirmed';
  return state.status;
}

function fiveMinuteConfirmationType(state: TimeframeMssState): HtfLiquidityDrawState['fiveMinuteMssConfirmationType'] {
  const text = state.evidence.join(' ').toLowerCase();
  if (
    state.status === 'confirmed' &&
    text.includes('confirmed close') &&
    (text.includes('swing high') || text.includes('swing low')) &&
    text.includes('displacement')
  ) {
    return 'swing_break_with_displacement';
  }
  if (state.status === 'confirmed' && text.includes('reclaim') && text.includes('break')) {
    return 'reclaim_then_break';
  }
  return 'unknown';
}

function postShiftStateFromFiveMinute(state: TimeframeMssState): HtfLiquidityDrawState['postShiftState'] {
  if (state.lifecycleState === 'post_mss_digestion') return 'post_mss_digestion';
  if (state.lifecycleState === 'opposite_mss_confirmed') return 'opposite_mss_confirmed';
  if (state.lifecycleState === 'mss_trigger_pending') return 'retest_pending';
  if (state.lifecycleState === 'confirmed_mss') return 'continuation_pending';
  return 'unknown';
}

function externalTargetForPlan(args: {
  planDirection: HtfLiquidityDrawState['planDirection'];
  states: TimeframeMssState[];
  externalBuySideLiquidityTarget?: string;
  externalSellSideLiquidityTarget?: string;
}): string | undefined {
  if (args.planDirection === 'LONG') {
    return args.externalBuySideLiquidityTarget ||
      args.states.find((state) => state.direction === 'bullish' && state.externalLiquidityTarget)?.externalLiquidityTarget;
  }
  if (args.planDirection === 'SHORT') {
    return args.externalSellSideLiquidityTarget ||
      args.states.find((state) => state.direction === 'bearish' && state.externalLiquidityTarget)?.externalLiquidityTarget;
  }
  return undefined;
}

function hasMissingRequiredTimeframe(states: TimeframeMssState[]): boolean {
  return states.some((state) => state.status === 'unknown' || state.lifecycleState === 'unknown');
}

function htfNonConflict(states: TimeframeMssState[], planDirection: HtfLiquidityDrawState['planDirection']): boolean {
  if (planDirection === 'NONE') return false;
  const expected = planDirection === 'LONG' ? 'bullish' : 'bearish';
  const htfStates = states.filter((state) => state.timeframe === '4H' || state.timeframe === '1H');
  return htfStates.every((state) =>
    state.direction === expected ||
    state.direction === 'neutral' ||
    state.direction === 'unknown' ||
    state.status === 'not_confirmed'
  );
}

function fifteenMinuteSupportsPlan(state: TimeframeMssState | undefined, planDirection: HtfLiquidityDrawState['planDirection']): boolean {
  if (!state || planDirection === 'NONE') return false;
  const expected = planDirection === 'LONG' ? 'bullish' : 'bearish';
  return (
    state.direction === expected &&
    (state.status === 'confirmed' || state.status === 'potential_mss' || state.status === 'pending_confirm')
  );
}

function candidateConfidence(args: {
  states: TimeframeMssState[];
  fiveMinute: TimeframeMssState;
  fifteenMinute?: TimeframeMssState;
  planDirection: HtfLiquidityDrawState['planDirection'];
  externalTarget?: string;
  missingRequired: boolean;
  macroContext: HtfLiquidityDrawState['macroContext'];
}): number {
  if (args.missingRequired) {
    return clampScore(average(args.states.map((state) => state.confidence)) - 20);
  }

  let score = 20;
  if (args.planDirection !== 'NONE') score += 8;
  if (htfNonConflict(args.states, args.planDirection)) score += 16;
  if (args.macroContext === 'conflicting') score -= 22;
  if (fifteenMinuteSupportsPlan(args.fifteenMinute, args.planDirection)) score += 16;
  if (args.fiveMinute.status === 'confirmed') score += 26;
  else if (args.fiveMinute.status === 'pending_confirm' || args.fiveMinute.status === 'potential_mss') score += 10;
  if (fiveMinuteConfirmationType(args.fiveMinute) !== 'unknown') score += 8;
  if (args.externalTarget) score += 10;
  if (args.fiveMinute.lifecycleState === 'post_mss_digestion') score += 3;
  return clampScore(score);
}

function classificationFromState(args: {
  states: TimeframeMssState[];
  fiveMinute: TimeframeMssState;
  fifteenMinute?: TimeframeMssState;
  macroContext: HtfLiquidityDrawState['macroContext'];
  planDirection: HtfLiquidityDrawState['planDirection'];
  confidence: number;
  externalTarget?: string;
  missingRequired: boolean;
}): HtfLiquidityDrawClassification {
  const { fiveMinute, macroContext } = args;
  if (args.missingRequired) return 'NO_QUALIFIED_STATE';
  if (fiveMinute.lifecycleState === 'failed_mss') return 'FAILED_MSS';
  if (fiveMinute.lifecycleState === 'opposite_mss_confirmed' || fiveMinute.lifecycleState === 'conflicting_mss') return 'CONFLICTING_MSS';
  if (fiveMinute.lifecycleState === 'confirmed_mss' || fiveMinute.lifecycleState === 'post_mss_digestion') {
    if (
      args.planDirection !== 'NONE' &&
      args.externalTarget &&
      args.confidence >= 75 &&
      htfNonConflict(args.states, args.planDirection) &&
      fifteenMinuteSupportsPlan(args.fifteenMinute, args.planDirection)
    ) {
      return 'REVERSAL_DELIVERY_PLAN_CANDIDATE';
    }
    return 'MSS_TRIGGER_CONFIRMED';
  }
  if (fiveMinute.lifecycleState === 'mss_trigger_pending') return 'MSS_TRIGGER_PENDING';
  if (fiveMinute.lifecycleState === 'potential_mss') return 'RAID_RECLAIM_DEVELOPING';
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
  const fifteenMinuteState = timeframeStates.find((state) => state.timeframe === '15M');
  const macroContext = macroContextFromStates(timeframeStates);
  const missingRequired = hasMissingRequiredTimeframe(timeframeStates);
  const planDirection = directionalPlanFromState(fiveMinuteState);
  const externalLiquidityTarget = externalTargetForPlan({
    planDirection,
    states: timeframeStates,
    externalBuySideLiquidityTarget: input.externalBuySideLiquidityTarget,
    externalSellSideLiquidityTarget: input.externalSellSideLiquidityTarget,
  });
  const confidence = candidateConfidence({
    states: timeframeStates,
    fiveMinute: fiveMinuteState,
    fifteenMinute: fifteenMinuteState,
    planDirection,
    externalTarget: externalLiquidityTarget,
    missingRequired,
    macroContext,
  });
  const classification = classificationFromState({
    states: timeframeStates,
    fiveMinute: fiveMinuteState,
    fifteenMinute: fifteenMinuteState,
    macroContext,
    planDirection,
    confidence,
    externalTarget: externalLiquidityTarget,
    missingRequired,
  });
  const raidState = raidStateFromFiveMinute(fiveMinuteState);
  const blockers = [
    ...(missingRequired ? ['Missing one or more required 4H/1H/15M/5M OHLC timeframes; HTF/MSS state is not candidate-qualified.'] : []),
    ...(classification === 'MSS_TRIGGER_PENDING' || classification === 'RAID_RECLAIM_DEVELOPING'
      ? ['5M MSS is developing or pending; confirmed 5M swing break with displacement is still required.']
      : []),
    ...(classification === 'NO_QUALIFIED_STATE' && !missingRequired ? ['No qualifying HTF draw + raid/reclaim + 5M MSS state was derived from structured OHLC.'] : []),
    'HTF/MSS state population does not approve execution by itself.',
    '5M entry trigger, stop, risk, invalidation, and session gates remain required elsewhere before execution approval.',
  ];

  return {
    source: 'ninjatrader_ohlc',
    authority: 'ohlc_facts_only',
    boundary: 'context_only_not_execution_authority',
    drawDirection: drawDirectionFromPlan(planDirection),
    planDirection,
    macroContext,
    raidState,
    liquidityRaidState: raidState,
    reclaimStatus: safeReclaimStatus(fiveMinuteState),
    externalLiquidityTarget,
    classification,
    timeframeStates,
    timeframeStack: timeframeStates,
    fiveMinuteState,
    fiveMinuteMssTriggerConfirmed: fiveMinuteState.status === 'confirmed' &&
      (fiveMinuteState.lifecycleState === 'confirmed_mss' || fiveMinuteState.lifecycleState === 'post_mss_digestion'),
    fiveMinuteMssConfirmationType: fiveMinuteConfirmationType(fiveMinuteState),
    postShiftState: postShiftStateFromFiveMinute(fiveMinuteState),
    fifteenMinuteConfirmationStatus: safeFifteenMinuteStatus(fifteenMinuteState),
    activeScanWindow: activeScanWindowFromTimestamp(input.chartTimestamp),
    htfDrawContinuationPending:
      classification === 'MSS_TRIGGER_PENDING' ||
      classification === 'MSS_TRIGGER_CONFIRMED' ||
      classification === 'REVERSAL_DELIVERY_PLAN_CANDIDATE',
    confidence,
    notes: [
      'Structured HTF/MSS state was derived from NinjaTrader OHLC facts, not narrative fallback.',
      '4H and 1H define draw/session context; 15M defines liquidity-map support; 5M remains trigger authority.',
      '5M confirmed MSS can make the state candidate-eligible, but app-owned entry/stop/target/risk/session/canExecute gates still decide execution.',
    ],
    blockers,
    createsTradingPlanCandidate: false,
    approvesExecution: false,
  };
}

function candleFactsToBars(candles: ChartCandleFact[] | undefined): NinjaBridgeBar[] {
  return (candles || [])
    .filter((candle) =>
      typeof candle.open === 'number' &&
      typeof candle.high === 'number' &&
      typeof candle.low === 'number' &&
      typeof candle.close === 'number'
    )
    .map((candle, index) => ({
      time: candle.timestamp || `1970-01-01T00:${String(index).padStart(2, '0')}:00`,
      open: candle.open as number,
      high: candle.high as number,
      low: candle.low as number,
      close: candle.close as number,
      volume: 0,
    }));
}

function factSetToBars(factSet: TimeframeFactSet | undefined): NinjaBridgeBar[] {
  return candleFactsToBars(factSet?.candles);
}

function structuralTargetLabel(level: StructuralLevel | null | undefined): string | undefined {
  if (!level || !isFiniteNumber(level.price)) return undefined;
  return `${level.label} ${level.price}`;
}

export function buildHtfLiquidityDrawStateFromChartContext(
  chartContext: Pick<ChartContext, 'multiTimeframeContext' | 'chartTimestamp' | 'targetObjectives' | 'keyLevels'>
): HtfLiquidityDrawState | null {
  const mtf = chartContext.multiTimeframeContext;
  if (!mtf) return null;
  const upsideTarget =
    structuralTargetLabel(mtf.targetMap?.nearestUpsideLiquidity) ||
    structuralTargetLabel(mtf.targetMap?.majorUpsideLiquidity) ||
    chartContext.targetObjectives?.find((target) => target.direction === 'LONG')?.label ||
    (chartContext.keyLevels?.activeSwingHigh ? `active swing high ${chartContext.keyLevels.activeSwingHigh}` : undefined);
  const downsideTarget =
    structuralTargetLabel(mtf.targetMap?.nearestDownsideLiquidity) ||
    structuralTargetLabel(mtf.targetMap?.majorDownsideLiquidity) ||
    chartContext.targetObjectives?.find((target) => target.direction === 'SHORT')?.label ||
    (chartContext.keyLevels?.activeSwingLow ? `active swing low ${chartContext.keyLevels.activeSwingLow}` : undefined);

  return buildHtfLiquidityDrawState({
    bars4H: factSetToBars(mtf.fourHour),
    bars1H: factSetToBars(mtf.oneHour),
    bars15M: factSetToBars(mtf.fifteenMinute),
    bars5M: factSetToBars(mtf.fiveMinute),
    externalBuySideLiquidityTarget: upsideTarget,
    externalSellSideLiquidityTarget: downsideTarget,
    chartTimestamp: chartContext.chartTimestamp,
  });
}
