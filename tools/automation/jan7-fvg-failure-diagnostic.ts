import dotenv from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  fetchCachedMarketBars,
  loadMarketDataConfig,
  type MarketBarTimeframe,
} from './market-data-store';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

type Direction = 'LONG' | 'SHORT';
type Session = 'morning' | 'lunch' | 'full-rth';
type StandardOutcome = 'T2' | 'T1' | 'Stop' | 'SessionClose' | 'NoEntry';
type ManagedOutcome = StandardOutcome | 'LQ1';

interface Bar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

type InventoryTimeframe = '5m' | '15m' | '60m' | '120m' | '240m';
type FvgInventoryStatus = 'open_untouched' | 'partial_touch' | 'filled' | 'failed_inverted';
type FvgObstacleReaction =
  | 'none'
  | 'obstacle_before_t1_not_reached'
  | 'obstacle_before_t1_reached'
  | 'obstacle_defended_continuation_failed'
  | 'obstacle_reached_then_continued';
type ContinuationRead =
  | 'balanced_path_to_liquidity_valid'
  | 'clean_continuation'
  | 'obstacle_before_t1_manage_or_downgrade'
  | 'obstacle_defended_continuation_failed'
  | 'diagnostic_only_no_completed_plan';
type BalancedPathToLiquidityStatus =
  | 'balanced_path_to_liquidity'
  | 'not_balanced_path_to_liquidity'
  | 'no_liquidity_target'
  | 'diagnostic_only_no_completed_plan';

interface Zone {
  direction: Direction;
  timeframe: InventoryTimeframe;
  parentDisplacementAt: string;
  confirmedAt: string;
  createdAt: string;
  lower: number;
  upper: number;
  protectedLow: number;
  protectedHigh: number;
}

interface FvgInventoryItem extends Zone {
  statusAtReview: FvgInventoryStatus;
  firstTouchTime: string | null;
  filledTime: string | null;
  failedTime: string | null;
  relationToPrice: 'above' | 'below' | 'overlapping';
}

type BattleZoneRole = 'first_reaction_15m_fvg' | 'final_deepest_15m_fvg' | 'latest_active_leg_15m_fvg';
type BattleZoneDefenseStatus =
  | 'defended_on_15m'
  | 'failed_acceptance_through_15m'
  | 'untested_by_15m'
  | 'not_selected';
type FiveMinuteDefenseStatus =
  | 'confirmed_defense'
  | 'returned_no_confirmation'
  | 'accepted_through_zone'
  | 'not_returned'
  | 'not_selected_15m_battle_zone';

interface BattleZoneItem extends Zone {
  role: BattleZoneRole;
  defenseStatus: BattleZoneDefenseStatus;
  firstTouchTime: string | null;
  failedTime: string | null;
  defendedTime: string | null;
}

interface FiveMinuteDefenseRead {
  status: FiveMinuteDefenseStatus;
  returnTime: string | null;
  wickDefenseTime: string | null;
  proofTime: string | null;
  detail: string;
}

interface DefendedFirstContinuationRead {
  zone: Zone;
  defense: FiveMinuteDefenseRead;
  cutoffTime: string;
}

interface BattleZoneInventoryRead {
  scope: '15m_only_active_displacement_leg';
  rule: string;
  activeRole: BattleZoneRole | 'not_in_battle_inventory';
  firstReaction: BattleZoneItem | null;
  finalDeepest: BattleZoneItem | null;
  activeFiveMinuteDefense: FiveMinuteDefenseRead;
}

interface ObjectiveLevel {
  kind: 'tactical' | 'liquidity' | 'open_fvg' | 'session_extreme';
  label: string;
  price: number;
  reachedTime: string | null;
}

interface BalancedPathToLiquidityRead {
  status: BalancedPathToLiquidityStatus;
  reason: string;
  target: ObjectiveLevel | null;
}

interface RejectionGate {
  gate: string;
  status: 'pass' | 'fail' | 'context';
  detail: string;
}

interface ResearchTag {
  tag: 'holiday_bridge_thin_participation';
  status: 'context_only';
  detail: string;
}

interface ResearchRule {
  name: 'FvgBalancedPathContinuation' | 'FvgBattleZoneInventory';
  status: 'research_only_supporting_rule';
  definition: string;
  requiredFacts: string[];
  invalidation: string[];
  notAStandaloneTrigger: true;
}

interface TraceRow {
  parentFvg: Zone;
  eligible: boolean;
  verdict: 'valid_trace_candidate' | 'diagnostic_only_not_valid_under_clean_workflow';
  rejectionGates: RejectionGate[];
  parentDisplacement: boolean;
  parentDisplacementTime: string | null;
  parentFailureTime: string | null;
  firstReturnTime: string | null;
  wickDefenseTimes: string[];
  proofTime: string | null;
  entry: number | null;
  stop: number | null;
  riskPoints: number | null;
  target1: number | null;
  target2: number | null;
  nearestLiquidity: { label: string; price: number } | null;
  fvgInventoryAtProof: {
    openBelow: FvgInventoryItem[];
    failedAbove: FvgInventoryItem[];
    openAbove: FvgInventoryItem[];
  };
  battleZoneInventory: BattleZoneInventoryRead;
  objectiveLadder: ObjectiveLevel[];
  opposingFvgObstacleBeforeT1: FvgInventoryItem | null;
  opposingFvgObstacleReaction: FvgObstacleReaction;
  opposingFvgObstacleReactionTime: string | null;
  continuationRead: ContinuationRead;
  balancedPathToLiquidity: BalancedPathToLiquidityRead;
  liquidityFirstTarget: ObjectiveLevel | null;
  outcome: StandardOutcome;
  outcomeTime: string | null;
  exitPrice: number | null;
  oneMesPnl: number;
  managedOutcome: ManagedOutcome;
  managedOutcomeTime: string | null;
  managedExitPrice: number | null;
  managedOneMesPnl: number;
  reasons: string[];
}

interface DiagnosticReport {
  reportType: 'jan7_fvg_failure_diagnostic_trace';
  generatedAt: string;
  boundary: 'research_only_no_live_scanner_discord_or_trading_rule_change';
  requestedBridgeInstrument: string;
  bridgeInstrument: string;
  date: string;
  session: Session;
  sessionWindow: { from: string; to: string };
  contextDays: number;
  forwardDays: number;
  loadWindow: { from: string; to: string };
  source: {
    marketData: 'supabase_market_bars_read_only';
    completedHistoricalBarsOnly: true;
    chartAlignedContractRequired: true;
  };
  coverage: Record<MarketBarTimeframe, { bars: number; first: string | null; last: string | null }>;
  htfContext: Record<'60m' | '120m' | '240m', { bars: number; first: string | null; last: string | null }>;
  researchTags: ResearchTag[];
  researchRules: ResearchRule[];
  fvgInventoryAtSessionStart: FvgInventoryItem[];
  traces: TraceRow[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT_DIR = path.join(__dirname, 'replay-diagnostics');
const TIMEFRAMES: MarketBarTimeframe[] = ['5m', '15m', '60m', '120m', '240m'];
const POINT_VALUE_MES = 5;
const DEFAULT_FVG_RESEARCH_BRIDGE_INSTRUMENT = 'MES 09-26';
const BALANCED_PATH_CONTINUATION_RULE: ResearchRule = {
  name: 'FvgBalancedPathContinuation',
  status: 'research_only_supporting_rule',
  definition:
    'If price breaks out of a balanced/rebalanced range and no defended opposing FVG appears before the next real-liquidity or open-FVG objective, the move can travel cleanly through that path. This supports continuation and runner management after a valid FVG proof already exists.',
  requiredFacts: [
    '15M parent FVG setup is valid.',
    'Completed 5M wick-defense/proof exists.',
    'Nearest protected 5M structure stop is known.',
    'Objective ladder has a real liquidity or open-FVG objective ahead.',
    'No opposing FVG/HTF obstacle defends before that objective.',
  ],
  invalidation: [
    'Used without 15M parent FVG plus completed 5M proof.',
    'Opposing FVG/HTF obstacle defends before the objective.',
    'The objective was already reached before entry.',
    'Balanced path is treated as a standalone trigger.',
  ],
  notAStandaloneTrigger: true,
};
const BATTLE_ZONE_INVENTORY_RULE: ResearchRule = {
  name: 'FvgBattleZoneInventory',
  status: 'research_only_supporting_rule',
  definition:
    'Track only the first same-side 15M FVG reaction zone, the final/deepest same-side 15M FVG battle zone, and the latest active-session same-side 15M FVG from the active displacement leg. The selected 15M battle zone must then be defended on completed 5M candles before any entry model can use it.',
  requiredFacts: [
    '15M-only inventory for this research rule.',
    'Same-side active-session 15M displacement leg creates the candidate FVG stack.',
    'First same-side 15M FVG is the first reaction zone.',
    'Final/deepest same-side 15M FVG is the structure survival battle zone if the first zone fails.',
    'Latest same-side 15M FVG in the active session can be a valid active-leg battle zone when it is defended by 5M proof.',
    '5M confirms only after price returns into the selected 15M battle zone and rejects it.',
  ],
  invalidation: [
    'Every 15M FVG is tagged as equal importance.',
    'Middle-zone clutter is promoted over first reaction or final/deepest battle-zone roles.',
    '5M confirmation is used before the 15M battle zone is selected.',
    'The selected 15M battle zone accepts through against the intended direction.',
  ],
  notAStandaloneTrigger: true,
};

function argValue(name: string, fallback: string): string {
  const equalsPrefix = `--${name}=`;
  const equalsArg = process.argv.find((arg) => arg.startsWith(equalsPrefix));
  if (equalsArg) return equalsArg.slice(equalsPrefix.length);
  const flagIndex = process.argv.findIndex((arg) => arg === `--${name}`);
  if (flagIndex >= 0) {
    const value = process.argv[flagIndex + 1];
    if (value && !value.startsWith('--')) return value;
  }
  return fallback;
}

function argNumber(name: string, fallback: number): number {
  const parsed = Number(argValue(name, String(fallback)));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function argNonNegativeNumber(name: string, fallback: number): number {
  const parsed = Number(argValue(name, String(fallback)));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function safeLabel(value: string): string {
  return value.replace(/[^0-9A-Za-z_-]+/g, '-');
}

function normalizeFvgResearchBridgeInstrument(value: string): string {
  const text = String(value || '').trim().replace(/^\/+/, '').replace(/\s+/g, ' ');
  if (!text) return DEFAULT_FVG_RESEARCH_BRIDGE_INSTRUMENT;
  const upper = text.toUpperCase();
  if (upper === 'MES') return DEFAULT_FVG_RESEARCH_BRIDGE_INSTRUMENT;
  const monthNameMatch = upper.match(/^MES\s+SEP\s*-?\s*26$/);
  if (monthNameMatch) return DEFAULT_FVG_RESEARCH_BRIDGE_INSTRUMENT;
  const compactMonthNameMatch = upper.match(/^MES\s+SEP26$/);
  if (compactMonthNameMatch) return DEFAULT_FVG_RESEARCH_BRIDGE_INSTRUMENT;
  const numericMonthMatch = upper.match(/^MES\s+0?9\s*-?\s*26$/);
  if (numericMonthMatch) return DEFAULT_FVG_RESEARCH_BRIDGE_INSTRUMENT;
  return text;
}

function roundTick(value: number): number {
  return Math.round(value * 4) / 4;
}

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

function addDays(dateText: string, days: number): string {
  const date = new Date(`${dateText}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function sessionWindowFor(date: string, session: Session): { from: string; to: string } {
  if (session === 'morning') return { from: `${date}T09:15:00`, to: `${date}T12:00:00` };
  if (session === 'lunch') return { from: `${date}T12:00:00`, to: `${date}T16:00:00` };
  return { from: `${date}T09:15:00`, to: `${date}T16:00:00` };
}

function isKnownFederalHoliday(date: Date): boolean {
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return month === 1 && day === 1;
}

function researchTagsForDate(dateText: string): ResearchTag[] {
  const date = new Date(`${dateText}T00:00:00Z`);
  const priorDay = new Date(date);
  priorDay.setUTCDate(priorDay.getUTCDate() - 1);

  if (date.getUTCDay() === 5 && priorDay.getUTCDay() === 4 && isKnownFederalHoliday(priorDay)) {
    return [{
      tag: 'holiday_bridge_thin_participation',
      status: 'context_only',
      detail:
        'Prior calendar day was a Thursday federal holiday and this replay date is the Friday bridge session. Treat range/chop behavior as research context only; this tag does not block or approve trades.',
    }];
  }

  return [];
}

function validBars(bars: Bar[]): Bar[] {
  return bars
    .filter((bar) =>
      Number.isFinite(bar.open) &&
      Number.isFinite(bar.high) &&
      Number.isFinite(bar.low) &&
      Number.isFinite(bar.close) &&
      bar.high >= Math.max(bar.open, bar.close, bar.low) &&
      bar.low <= Math.min(bar.open, bar.close, bar.high)
    )
    .sort((a, b) => a.time.localeCompare(b.time));
}

function barsBetween(bars: Bar[], from: string, to: string): Bar[] {
  return bars.filter((bar) => bar.time >= from && bar.time <= to);
}

function bodyPoints(bar: Bar): number {
  return Math.abs(bar.close - bar.open);
}

function averageBody(bars: Bar[]): number {
  return bars.length ? bars.reduce((sum, bar) => sum + bodyPoints(bar), 0) / bars.length : 0;
}

function isDisplacement(bar: Bar, priorBars: Bar[], direction: Direction): boolean {
  const avg = averageBody(priorBars.slice(-12));
  const body = bodyPoints(bar);
  const range = Math.max(0.25, bar.high - bar.low);
  const closeLocation = direction === 'LONG' ? (bar.close - bar.low) / range : (bar.high - bar.close) / range;
  return body >= Math.max(2.5, avg * 1.35) && closeLocation >= 0.62;
}

function detectFvgs(bars: Bar[], timeframe: InventoryTimeframe): Zone[] {
  const zones: Zone[] = [];
  for (let index = 2; index < bars.length; index += 1) {
    const left = bars[index - 2];
    const middle = bars[index - 1];
    const right = bars[index];
    if (left.high < right.low) {
      zones.push({
        direction: 'LONG',
        timeframe,
        parentDisplacementAt: middle.time,
        confirmedAt: right.time,
        createdAt: right.time,
        lower: roundTick(left.high),
        upper: roundTick(right.low),
        protectedLow: roundTick(Math.min(left.low, middle.low, right.low)),
        protectedHigh: roundTick(Math.max(left.high, middle.high, right.high)),
      });
    }
    if (left.low > right.high) {
      zones.push({
        direction: 'SHORT',
        timeframe,
        parentDisplacementAt: middle.time,
        confirmedAt: right.time,
        createdAt: right.time,
        lower: roundTick(right.high),
        upper: roundTick(left.low),
        protectedLow: roundTick(Math.min(left.low, middle.low, right.low)),
        protectedHigh: roundTick(Math.max(left.high, middle.high, right.high)),
      });
    }
  }
  return zones;
}

function zoneParentDisplacementAt(zone: Zone): string {
  return zone.parentDisplacementAt ?? zone.createdAt;
}

function zoneConfirmedAt(zone: Zone): string {
  return zone.confirmedAt ?? zone.createdAt;
}

function findParentDisplacementBar(zone: Zone, bars15m: Bar[]): Bar | null {
  const confirmedIndex = bars15m.findIndex((bar) => bar.time === zoneConfirmedAt(zone));
  if (confirmedIndex < 0) return null;

  const directParentIndex = bars15m.findIndex((bar) => bar.time === zoneParentDisplacementAt(zone));
  if (directParentIndex >= 0) {
    const directParent = bars15m[directParentIndex];
    const priorBars = bars15m.slice(Math.max(0, directParentIndex - 12), directParentIndex);
    if (isDisplacement(directParent, priorBars, zone.direction)) return directParent;
  }

  const formationIndexes = [confirmedIndex - 2, confirmedIndex - 1, confirmedIndex].filter((index) => index >= 0);
  return formationIndexes
    .map((index) => ({
      bar: bars15m[index],
      priorBars: bars15m.slice(Math.max(0, index - 12), index),
    }))
    .find(({ bar, priorBars }) => isDisplacement(bar, priorBars, zone.direction))?.bar ?? null;
}

function overlapsZone(bar: Bar, zone: Zone): boolean {
  return bar.low <= zone.upper && bar.high >= zone.lower;
}

function acceptedThroughAgainstZone(bar: Bar, zone: Zone): boolean {
  return zone.direction === 'LONG' ? bar.close < zone.lower : bar.close > zone.upper;
}

function fullyMitigated(bar: Bar, zone: Zone): boolean {
  return zone.direction === 'LONG' ? bar.low <= zone.lower : bar.high >= zone.upper;
}

function relationToPrice(zone: Zone, price: number): FvgInventoryItem['relationToPrice'] {
  if (zone.upper < price) return 'below';
  if (zone.lower > price) return 'above';
  return 'overlapping';
}

function classifyFvgAtReview(zone: Zone, bars: Bar[], reviewTime: string, price: number): FvgInventoryItem {
  const postCreate = bars.filter((bar) => bar.time > zone.createdAt && bar.time <= reviewTime);
  const firstTouch = postCreate.find((bar) => overlapsZone(bar, zone)) ?? null;
  const filled = postCreate.find((bar) => fullyMitigated(bar, zone)) ?? null;
  const failed = postCreate.find((bar) => overlapsZone(bar, zone) && acceptedThroughAgainstZone(bar, zone)) ?? null;
  const statusAtReview: FvgInventoryStatus = failed
    ? 'failed_inverted'
    : filled
      ? 'filled'
      : firstTouch
        ? 'partial_touch'
        : 'open_untouched';

  return {
    ...zone,
    statusAtReview,
    firstTouchTime: firstTouch?.time ?? null,
    filledTime: filled?.time ?? null,
    failedTime: failed?.time ?? null,
    relationToPrice: relationToPrice(zone, price),
  };
}

function battleZoneDefenseStatus(zone: Zone, bars15m: Bar[], reviewTime: string): Pick<BattleZoneItem, 'defenseStatus' | 'firstTouchTime' | 'failedTime' | 'defendedTime'> {
  const postCreate = bars15m.filter((bar) => bar.time > zone.createdAt && bar.time <= reviewTime);
  const firstTouch = postCreate.find((bar) => overlapsZone(bar, zone)) ?? null;
  const failed = postCreate.find((bar) => overlapsZone(bar, zone) && acceptedThroughAgainstZone(bar, zone)) ?? null;
  const defended = postCreate.find((bar) =>
    overlapsZone(bar, zone) &&
    !acceptedThroughAgainstZone(bar, zone) &&
    closesContinuationSide(bar, zone)
  ) ?? null;

  if (defended && (!failed || defended.time < failed.time)) {
    return {
      defenseStatus: 'defended_on_15m',
      firstTouchTime: firstTouch?.time ?? null,
      failedTime: failed?.time ?? null,
      defendedTime: defended.time,
    };
  }
  if (failed) {
    return {
      defenseStatus: 'failed_acceptance_through_15m',
      firstTouchTime: firstTouch?.time ?? null,
      failedTime: failed.time,
      defendedTime: defended?.time ?? null,
    };
  }
  if (defended) {
    return {
      defenseStatus: 'defended_on_15m',
      firstTouchTime: firstTouch?.time ?? null,
      failedTime: null,
      defendedTime: defended.time,
    };
  }
  return {
    defenseStatus: firstTouch ? 'not_selected' : 'untested_by_15m',
    firstTouchTime: firstTouch?.time ?? null,
    failedTime: null,
    defendedTime: null,
  };
}

function buildBattleZoneItem(args: {
  zone: Zone;
  role: BattleZoneRole;
  bars15m: Bar[];
  reviewTime: string;
}): BattleZoneItem {
  const status = battleZoneDefenseStatus(args.zone, args.bars15m, args.reviewTime);
  return {
    ...args.zone,
    role: args.role,
    ...status,
  };
}

function zoneKey(zone: Zone): string {
  return `${zone.timeframe}:${zone.direction}:${zone.createdAt}:${zone.lower.toFixed(2)}:${zone.upper.toFixed(2)}`;
}

function sameZoneLocation(left: Zone, right: Zone): boolean {
  return left.timeframe === right.timeframe &&
    left.createdAt === right.createdAt &&
    left.lower === right.lower &&
    left.upper === right.upper;
}

function isDeeperSameSideZone(direction: Direction, candidate: Zone, current: Zone): boolean {
  return direction === 'LONG' ? candidate.lower < current.lower : candidate.upper > current.upper;
}

function readFiveMinuteDefense(
  zone: Zone,
  bars5m: Bar[],
  sessionWindow: { from: string; to: string },
  options: { allowBattleZoneHold?: boolean } = {},
): FiveMinuteDefenseRead {
  const reviewBars = bars5m.filter((bar) => bar.time >= zone.createdAt && bar.time <= sessionWindow.to);
  const firstReturn = reviewBars.find((bar) => overlapsZone(bar, zone)) ?? null;
  if (!firstReturn) {
    return {
      status: 'not_returned',
      returnTime: null,
      wickDefenseTime: null,
      proofTime: null,
      detail: '5M did not return into the selected 15M battle zone before the session ended.',
    };
  }

  const afterReturn = reviewBars.filter((bar) => bar.time >= firstReturn.time);
  const acceptedThrough = afterReturn.find((bar) => overlapsZone(bar, zone) && acceptedThroughAgainstZone(bar, zone)) ?? null;
  const wickDefense = afterReturn.find((bar) =>
    overlapsZone(bar, zone) &&
    hasWickDefense(bar, zone.direction) &&
    !acceptedThroughAgainstZone(bar, zone)
  ) ?? null;
  const battleZoneHold = options.allowBattleZoneHold
    ? afterReturn.find((bar) =>
        overlapsZone(bar, zone) &&
        !acceptedThroughAgainstZone(bar, zone) &&
        closesContinuationSide(bar, zone)
      ) ?? null
    : null;
  const defenseBar = wickDefense ?? battleZoneHold;
  const proof = defenseBar
    ? closesContinuationSide(defenseBar, zone)
      ? defenseBar
      : afterReturn.find((bar) => bar.time > defenseBar.time && closesContinuationSide(bar, zone))
    : null;

  if (proof) {
    return {
      status: 'confirmed_defense',
      returnTime: firstReturn.time,
      wickDefenseTime: defenseBar?.time ?? null,
      proofTime: proof.time,
      detail: wickDefense
        ? '5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.'
        : '5M returned into the active 15M battle zone, held it, and closed back in the continuation direction.',
    };
  }
  if (acceptedThrough) {
    return {
      status: 'accepted_through_zone',
      returnTime: firstReturn.time,
      wickDefenseTime: wickDefense?.time ?? null,
      proofTime: null,
      detail: `5M returned into the active 15M battle zone but accepted through it at ${acceptedThrough.time}.`,
    };
  }
  return {
    status: 'returned_no_confirmation',
    returnTime: firstReturn.time,
    wickDefenseTime: wickDefense?.time ?? null,
    proofTime: null,
    detail: '5M returned into the active 15M battle zone, but completed continuation proof was not found.',
  };
}

function findDefendedFirstContinuation(args: {
  zone: Zone;
  bars5m: Bar[];
  sessionWindow: { from: string; to: string };
  parentFailureTime: string | null;
}): DefendedFirstContinuationRead | null {
  const cutoffTime = args.parentFailureTime ?? args.sessionWindow.to;
  const defense = readFiveMinuteDefense(args.zone, args.bars5m, {
    from: args.sessionWindow.from,
    to: cutoffTime,
  });

  if (defense.status !== 'confirmed_defense' || !defense.proofTime) return null;

  return {
    zone: args.zone,
    defense,
    cutoffTime,
  };
}

function buildBattleZoneInventory(args: {
  activeZone: Zone;
  zones: Zone[];
  bars15m: Bar[];
  bars5m: Bar[];
  sessionWindow: { from: string; to: string };
  allowBattleZoneHold?: boolean;
}): BattleZoneInventoryRead {
  const activeDate = args.activeZone.createdAt.slice(0, 10);
  const activeSessionSameSide15mBase = args.zones
    .filter((zone) =>
      zone.timeframe === '15m' &&
      zone.direction === args.activeZone.direction &&
      zone.createdAt.slice(0, 10) === activeDate &&
      zone.createdAt >= args.sessionWindow.from &&
      zone.createdAt <= args.activeZone.createdAt
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const activeSessionSameSide15m = activeSessionSameSide15mBase
    .some((zone) => sameZoneLocation(zone, args.activeZone))
      ? activeSessionSameSide15mBase
      : [...activeSessionSameSide15mBase, args.activeZone].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const firstZone = activeSessionSameSide15m[0] ?? args.activeZone;
  const finalZone = activeSessionSameSide15m.reduce((current, candidate) =>
    isDeeperSameSideZone(args.activeZone.direction, candidate, current) ? candidate : current,
  firstZone);
  const latestActiveLegZone = activeSessionSameSide15m[activeSessionSameSide15m.length - 1] ?? args.activeZone;

  const firstReaction = buildBattleZoneItem({
    zone: firstZone,
    role: 'first_reaction_15m_fvg',
    bars15m: args.bars15m,
    reviewTime: args.sessionWindow.to,
  });
  const finalDeepest = buildBattleZoneItem({
    zone: finalZone,
    role: 'final_deepest_15m_fvg',
    bars15m: args.bars15m,
    reviewTime: args.sessionWindow.to,
  });

  const activeKey = zoneKey(args.activeZone);
  const activeRole = zoneKey(firstReaction) === activeKey
    ? 'first_reaction_15m_fvg'
    : zoneKey(finalDeepest) === activeKey
      ? 'final_deepest_15m_fvg'
      : zoneKey(latestActiveLegZone) === activeKey
        ? 'latest_active_leg_15m_fvg'
        : 'not_in_battle_inventory';
  const activeFiveMinuteDefense: FiveMinuteDefenseRead = activeRole === 'not_in_battle_inventory'
    ? {
        status: 'not_selected_15m_battle_zone',
        returnTime: null,
        wickDefenseTime: null,
        proofTime: null,
        detail:
          'The active 15M FVG is not the first reaction zone, final/deepest battle zone, or latest active-session 15M FVG, so 5M defense is diagnostic only and cannot promote this research model.',
      }
    : readFiveMinuteDefense(args.activeZone, args.bars5m, args.sessionWindow, {
        allowBattleZoneHold: args.allowBattleZoneHold,
      });

  return {
    scope: '15m_only_active_displacement_leg',
    rule:
      'Track only the active-session first same-side 15M FVG reaction zone, final/deepest same-side 15M FVG battle zone, and latest active-session same-side 15M FVG from the active leg; ignore middle-zone clutter for this model.',
    activeRole,
    firstReaction,
    finalDeepest,
    activeFiveMinuteDefense,
  };
}

function buildFvgInventory(args: {
  zones: Zone[];
  barsByTimeframe: Partial<Record<InventoryTimeframe, Bar[]>>;
  reviewTime: string;
  price: number;
}): FvgInventoryItem[] {
  return args.zones
    .filter((zone) => zone.createdAt <= args.reviewTime)
    .map((zone) => classifyFvgAtReview(zone, args.barsByTimeframe[zone.timeframe] ?? [], args.reviewTime, args.price))
    .sort((a, b) => {
      const distanceA = Math.min(Math.abs(args.price - a.lower), Math.abs(args.price - a.upper));
      const distanceB = Math.min(Math.abs(args.price - b.lower), Math.abs(args.price - b.upper));
      return distanceA - distanceB;
    });
}

function closesContinuationSide(bar: Bar, zone: Zone): boolean {
  return zone.direction === 'LONG' ? bar.close > zone.upper : bar.close < zone.lower;
}

function hasWickDefense(bar: Bar, direction: Direction): boolean {
  const body = bodyPoints(bar);
  const range = Math.max(0.25, bar.high - bar.low);
  const lowerWick = Math.min(bar.open, bar.close) - bar.low;
  const upperWick = bar.high - Math.max(bar.open, bar.close);
  if (direction === 'LONG') {
    return lowerWick >= Math.max(1, body * 0.6) && (bar.close - bar.low) / range >= 0.45;
  }
  return upperWick >= Math.max(1, body * 0.6) && (bar.high - bar.close) / range >= 0.45;
}

function findProtectedStop(direction: Direction, bars: Bar[]): number | null {
  if (!bars.length) return null;
  return direction === 'LONG'
    ? roundTick(Math.min(...bars.map((bar) => bar.low)))
    : roundTick(Math.max(...bars.map((bar) => bar.high)));
}

function findProtectedStructureStop(direction: Direction, bars: Bar[], entry: number, zone: Zone): number | null {
  const swings: { price: number; time: string }[] = [];
  for (let index = 1; index < bars.length - 1; index += 1) {
    const previous = bars[index - 1];
    const current = bars[index];
    const next = bars[index + 1];
    if (direction === 'LONG') {
      const isProtectedLow =
        current.low <= previous.low &&
        current.low <= next.low &&
        current.low < entry &&
        current.low <= zone.lower;
      if (isProtectedLow) swings.push({ price: current.low, time: current.time });
    } else {
      const isProtectedHigh =
        current.high >= previous.high &&
        current.high >= next.high &&
        current.high > entry &&
        current.high >= zone.upper;
      if (isProtectedHigh) swings.push({ price: current.high, time: current.time });
    }
  }

  if (!swings.length) return null;
  return roundTick(swings[swings.length - 1].price);
}

function protectedStopFromParentStructure(direction: Direction, localStop: number | null, parentZone: Zone): number | null {
  const parentStop = direction === 'LONG' ? parentZone.protectedLow : parentZone.protectedHigh;
  if (localStop === null) return parentStop;
  return roundTick(localStop);
}

function findNearestLiquidity(direction: Direction, entry: number, bars: Bar[]): { label: string; price: number } | null {
  const prior = bars.filter((bar) => direction === 'LONG' ? bar.high > entry : bar.low < entry);
  if (!prior.length) return null;
  if (direction === 'LONG') {
    const price = Math.min(...prior.map((bar) => bar.high));
    return { label: 'nearest prior high liquidity', price: roundTick(price) };
  }
  const price = Math.max(...prior.map((bar) => bar.low));
  return { label: 'nearest prior low liquidity', price: roundTick(price) };
}

function swingLiquidity(direction: Direction, bars: Bar[], entry: number): ObjectiveLevel[] {
  const levels: ObjectiveLevel[] = [];
  for (let index = 2; index < bars.length - 2; index += 1) {
    const window = bars.slice(index - 2, index + 3);
    const bar = bars[index];
    if (direction === 'SHORT') {
      const isSwingLow = bar.low === Math.min(...window.map((item) => item.low));
      if (isSwingLow && bar.low < entry) {
        levels.push({
          kind: 'liquidity',
          label: `prior 5M swing low liquidity from ${bar.time}`,
          price: roundTick(bar.low),
          reachedTime: null,
        });
      }
    } else {
      const isSwingHigh = bar.high === Math.max(...window.map((item) => item.high));
      if (isSwingHigh && bar.high > entry) {
        levels.push({
          kind: 'liquidity',
          label: `prior 5M swing high liquidity from ${bar.time}`,
          price: roundTick(bar.high),
          reachedTime: null,
        });
      }
    }
  }
  const unique = new Map<string, ObjectiveLevel>();
  for (const level of levels) unique.set(`${level.kind}:${level.price.toFixed(2)}`, level);
  return Array.from(unique.values()).sort((a, b) =>
    direction === 'SHORT' ? b.price - a.price : a.price - b.price
  );
}

function markReached(direction: Direction, level: ObjectiveLevel, bars: Bar[]): ObjectiveLevel {
  const reached = bars.find((bar) => direction === 'SHORT' ? bar.low <= level.price : bar.high >= level.price);
  return { ...level, reachedTime: reached?.time ?? null };
}

function buildObjectiveLadder(args: {
  direction: Direction;
  entry: number | null;
  target1: number | null;
  target2: number | null;
  proofTime: string | null;
  bars5m: Bar[];
  inventory: TraceRow['fvgInventoryAtProof'];
  sessionWindow: { from: string; to: string };
  contextFrom: string;
}): ObjectiveLevel[] {
  if (args.entry === null || args.proofTime === null) return [];
  const afterProof = args.bars5m.filter((bar) => bar.time > args.proofTime && bar.time <= args.sessionWindow.to);
  const beforeProof = args.bars5m.filter((bar) => bar.time >= args.contextFrom && bar.time < args.proofTime);
  const levels: ObjectiveLevel[] = [];
  if (args.target1 !== null) levels.push({ kind: 'tactical', label: 'T1 1.5R', price: args.target1, reachedTime: null });
  if (args.target2 !== null) levels.push({ kind: 'tactical', label: 'T2 2.0R', price: args.target2, reachedTime: null });

  levels.push(...swingLiquidity(args.direction, beforeProof, args.entry).slice(0, 8));
  const openFvgs = args.direction === 'SHORT' ? args.inventory.openBelow : args.inventory.openAbove;
  for (const item of openFvgs.slice(0, 8)) {
    levels.push({
      kind: 'open_fvg',
      label: `${item.timeframe} ${item.direction} open FVG ${item.statusAtReview} parent ${zoneParentDisplacementAt(item)} confirmed ${zoneConfirmedAt(item)}`,
      price: args.direction === 'SHORT' ? item.lower : item.upper,
      reachedTime: null,
    });
  }

  const sessionExtreme = args.direction === 'SHORT'
    ? Math.min(...beforeProof.map((bar) => bar.low))
    : Math.max(...beforeProof.map((bar) => bar.high));
  if (Number.isFinite(sessionExtreme)) {
    levels.push({
      kind: 'session_extreme',
      label: args.direction === 'SHORT' ? 'RTH low liquidity before proof' : 'RTH high liquidity before proof',
      price: roundTick(sessionExtreme),
      reachedTime: null,
    });
  }

  const unique = new Map<string, ObjectiveLevel>();
  for (const level of levels) {
    if (args.direction === 'SHORT' && level.price >= args.entry) continue;
    if (args.direction === 'LONG' && level.price <= args.entry) continue;
    unique.set(`${level.kind}:${level.price.toFixed(2)}:${level.label}`, level);
  }
  return Array.from(unique.values())
    .map((level) => markReached(args.direction, level, afterProof))
    .sort((a, b) => args.direction === 'SHORT' ? b.price - a.price : a.price - b.price)
    .slice(0, 14);
}

function firstLiquidityBeforeT1(args: {
  direction: Direction;
  entry: number;
  stop: number;
  target1: number;
  objectiveLadder: ObjectiveLevel[];
}): ObjectiveLevel | null {
  const minMeaningfulMove = Math.max(4, Math.abs(args.entry - args.stop) * 0.25);
  const realLiquidity = args.objectiveLadder.filter((level) =>
    ['liquidity', 'session_extreme'].includes(level.kind)
  );
  return realLiquidity.find((level) => {
    if (args.direction === 'LONG') {
      return level.price > args.entry + minMeaningfulMove && level.price < args.target1;
    }
    return level.price < args.entry - minMeaningfulMove && level.price > args.target1;
  }) ?? null;
}

function firstOpposingFvgObstacleBeforeT1(args: {
  direction: Direction;
  entry: number;
  target1: number;
  inventory: TraceRow['fvgInventoryAtProof'];
}): FvgInventoryItem | null {
  const candidates = args.direction === 'LONG'
    ? [...args.inventory.openAbove, ...args.inventory.failedAbove]
    : args.inventory.openBelow;

  return candidates
    .filter((item) => {
      const firstTouchPrice = args.direction === 'LONG' ? item.lower : item.upper;
      if (args.direction === 'LONG') {
        return firstTouchPrice > args.entry && firstTouchPrice < args.target1;
      }
      return firstTouchPrice < args.entry && firstTouchPrice > args.target1;
    })
    .sort((a, b) => {
      const priceA = args.direction === 'LONG' ? a.lower : a.upper;
      const priceB = args.direction === 'LONG' ? b.lower : b.upper;
      return Math.abs(priceA - args.entry) - Math.abs(priceB - args.entry);
    })[0] ?? null;
}

function evaluateFvgObstacleReaction(args: {
  direction: Direction;
  target1: number;
  obstacle: FvgInventoryItem | null;
  standardOutcome: Pick<TraceRow, 'outcome' | 'outcomeTime'>;
  bars: Bar[];
}): Pick<TraceRow, 'opposingFvgObstacleReaction' | 'opposingFvgObstacleReactionTime'> {
  if (!args.obstacle) {
    return { opposingFvgObstacleReaction: 'none', opposingFvgObstacleReactionTime: null };
  }

  const obstacleTouchPrice = args.direction === 'LONG' ? args.obstacle.lower : args.obstacle.upper;
  const obstacleReached = args.bars.find((bar) =>
    args.direction === 'LONG' ? bar.high >= obstacleTouchPrice : bar.low <= obstacleTouchPrice
  );

  if (!obstacleReached) {
    return {
      opposingFvgObstacleReaction: 'obstacle_before_t1_not_reached',
      opposingFvgObstacleReactionTime: null,
    };
  }

  const t1ReachedAfterObstacle = args.bars.find((bar) => {
    if (bar.time < obstacleReached.time) return false;
    return args.direction === 'LONG' ? bar.high >= args.target1 : bar.low <= args.target1;
  });

  if (t1ReachedAfterObstacle) {
    return {
      opposingFvgObstacleReaction: 'obstacle_reached_then_continued',
      opposingFvgObstacleReactionTime: obstacleReached.time,
    };
  }

  if (['Stop', 'SessionClose'].includes(args.standardOutcome.outcome)) {
    return {
      opposingFvgObstacleReaction: 'obstacle_defended_continuation_failed',
      opposingFvgObstacleReactionTime: obstacleReached.time,
    };
  }

  return {
    opposingFvgObstacleReaction: 'obstacle_before_t1_reached',
    opposingFvgObstacleReactionTime: obstacleReached.time,
  };
}

function classifyBalancedPathToLiquidity(args: {
  eligible: boolean;
  direction: Direction;
  entry: number;
  target1: number;
  liquidityFirstTarget: ObjectiveLevel | null;
  obstacleReaction: FvgObstacleReaction;
}): BalancedPathToLiquidityRead {
  if (!args.eligible) {
    return {
      status: 'diagnostic_only_no_completed_plan',
      reason: 'The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.',
      target: args.liquidityFirstTarget,
    };
  }
  if (!args.liquidityFirstTarget) {
    return {
      status: 'no_liquidity_target',
      reason: 'No meaningful real-liquidity target was found between entry and T1.',
      target: null,
    };
  }

  const targetBeforeT1 = args.direction === 'LONG'
    ? args.liquidityFirstTarget.price > args.entry && args.liquidityFirstTarget.price < args.target1
    : args.liquidityFirstTarget.price < args.entry && args.liquidityFirstTarget.price > args.target1;

  if (!targetBeforeT1) {
    return {
      status: 'not_balanced_path_to_liquidity',
      reason: 'The first liquidity objective is not between entry and T1, so it is not a near-path delivery target.',
      target: args.liquidityFirstTarget,
    };
  }
  if (args.obstacleReaction === 'obstacle_defended_continuation_failed') {
    return {
      status: 'not_balanced_path_to_liquidity',
      reason: 'An opposing FVG defended before T1, so the path did not deliver cleanly to liquidity.',
      target: args.liquidityFirstTarget,
    };
  }
  if (!args.liquidityFirstTarget.reachedTime) {
    return {
      status: 'not_balanced_path_to_liquidity',
      reason: 'The near liquidity objective sat in the path but was not reached during the replay window.',
      target: args.liquidityFirstTarget,
    };
  }

  return {
    status: 'balanced_path_to_liquidity',
    reason: 'The first real-liquidity objective sat between entry and T1, was reached, and no opposing FVG defended before delivery.',
    target: args.liquidityFirstTarget,
  };
}

function classifyContinuationRead(args: {
  eligible: boolean;
  obstacle: FvgInventoryItem | null;
  obstacleReaction: FvgObstacleReaction;
  balancedPathToLiquidity: BalancedPathToLiquidityRead;
}): ContinuationRead {
  if (!args.eligible) return 'diagnostic_only_no_completed_plan';
  if (args.obstacleReaction === 'obstacle_defended_continuation_failed') {
    return 'obstacle_defended_continuation_failed';
  }
  if (args.balancedPathToLiquidity.status === 'balanced_path_to_liquidity') {
    return 'balanced_path_to_liquidity_valid';
  }
  if (args.obstacle) return 'obstacle_before_t1_manage_or_downgrade';
  return 'clean_continuation';
}

function evaluateOutcome(args: {
  direction: Direction;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  bars: Bar[];
}): Pick<TraceRow, 'outcome' | 'outcomeTime' | 'exitPrice' | 'oneMesPnl'> {
  for (const bar of args.bars) {
    const stopHit = args.direction === 'LONG' ? bar.low <= args.stop : bar.high >= args.stop;
    const t2Hit = args.direction === 'LONG' ? bar.high >= args.target2 : bar.low <= args.target2;
    const t1Hit = args.direction === 'LONG' ? bar.high >= args.target1 : bar.low <= args.target1;
    if (stopHit) {
      return {
        outcome: 'Stop',
        outcomeTime: bar.time,
        exitPrice: args.stop,
        oneMesPnl: money((args.direction === 'LONG' ? args.stop - args.entry : args.entry - args.stop) * POINT_VALUE_MES),
      };
    }
    if (t2Hit) {
      return {
        outcome: 'T2',
        outcomeTime: bar.time,
        exitPrice: args.target2,
        oneMesPnl: money((args.direction === 'LONG' ? args.target2 - args.entry : args.entry - args.target2) * POINT_VALUE_MES),
      };
    }
    if (t1Hit) {
      return {
        outcome: 'T1',
        outcomeTime: bar.time,
        exitPrice: args.target1,
        oneMesPnl: money((args.direction === 'LONG' ? args.target1 - args.entry : args.entry - args.target1) * POINT_VALUE_MES),
      };
    }
  }

  const last = args.bars.at(-1);
  if (!last) return { outcome: 'NoEntry', outcomeTime: null, exitPrice: null, oneMesPnl: 0 };
  return {
    outcome: 'SessionClose',
    outcomeTime: last.time,
    exitPrice: last.close,
    oneMesPnl: money((args.direction === 'LONG' ? last.close - args.entry : args.entry - last.close) * POINT_VALUE_MES),
  };
}

function evaluateManagedOutcome(args: {
  direction: Direction;
  entry: number;
  stop: number;
  liquidityFirstTarget: ObjectiveLevel | null;
  standardOutcome: Pick<TraceRow, 'outcome' | 'outcomeTime' | 'exitPrice' | 'oneMesPnl'>;
  bars: Bar[];
}): Pick<TraceRow, 'managedOutcome' | 'managedOutcomeTime' | 'managedExitPrice' | 'managedOneMesPnl'> {
  if (!args.liquidityFirstTarget) {
    return {
      managedOutcome: args.standardOutcome.outcome,
      managedOutcomeTime: args.standardOutcome.outcomeTime,
      managedExitPrice: args.standardOutcome.exitPrice,
      managedOneMesPnl: args.standardOutcome.oneMesPnl,
    };
  }

  for (const bar of args.bars) {
    const stopHit = args.direction === 'LONG' ? bar.low <= args.stop : bar.high >= args.stop;
    const liquidityHit = args.direction === 'LONG'
      ? bar.high >= args.liquidityFirstTarget.price
      : bar.low <= args.liquidityFirstTarget.price;
    if (stopHit) break;
    if (liquidityHit) {
      return {
        managedOutcome: 'LQ1',
        managedOutcomeTime: bar.time,
        managedExitPrice: args.liquidityFirstTarget.price,
        managedOneMesPnl: money((args.direction === 'LONG'
          ? args.liquidityFirstTarget.price - args.entry
          : args.entry - args.liquidityFirstTarget.price) * POINT_VALUE_MES),
      };
    }
  }

  return {
    managedOutcome: args.standardOutcome.outcome,
    managedOutcomeTime: args.standardOutcome.outcomeTime,
    managedExitPrice: args.standardOutcome.exitPrice,
    managedOneMesPnl: args.standardOutcome.oneMesPnl,
  };
}

function inventoryAtProof(args: {
  proof: Bar | null;
  zones: Zone[];
  barsByTimeframe: Partial<Record<InventoryTimeframe, Bar[]>>;
}): TraceRow['fvgInventoryAtProof'] {
  if (!args.proof) return { openBelow: [], failedAbove: [], openAbove: [] };
  const inventory = buildFvgInventory({
    zones: args.zones,
    barsByTimeframe: args.barsByTimeframe,
    reviewTime: args.proof.time,
    price: args.proof.close,
  });
  return {
    openBelow: inventory
      .filter((item) => item.relationToPrice === 'below' && ['open_untouched', 'partial_touch'].includes(item.statusAtReview))
      .slice(0, 8),
    failedAbove: inventory
      .filter((item) => item.relationToPrice === 'above' && item.statusAtReview === 'failed_inverted')
      .slice(0, 8),
    openAbove: inventory
      .filter((item) => item.relationToPrice === 'above' && ['open_untouched', 'partial_touch'].includes(item.statusAtReview))
      .slice(0, 8),
  };
}

function buildRejectionGates(args: {
  parentDisplacement: boolean;
  parentDisplacementTime: string | null;
  parentFailure: Bar | null;
  firstReturn: Bar | null;
  wickDefenseBars: Bar[];
  proof: Bar | null;
  entry: number | null;
  stop: number | null;
  riskPoints: number | null;
  target1: number | null;
  target2: number | null;
  nearestLiquidity: { label: string; price: number } | null;
}): RejectionGate[] {
  return [
    {
      gate: '15m_parent_displacement',
      status: args.parentDisplacement ? 'pass' : 'fail',
      detail: args.parentDisplacement
        ? `15M FVG formation includes displacement at ${args.parentDisplacementTime}.`
        : '15M FVG exists, but no candle in the three-candle FVG formation passed the displacement heuristic.',
    },
    {
      gate: '15m_parent_failure_or_acceptance',
      status: args.parentFailure ? 'context' : 'context',
      detail: args.parentFailure
        ? `15M acceptance through/failure observed at ${args.parentFailure.time}.`
        : 'No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model.',
    },
    {
      gate: '5m_return_to_parent_or_nested_fvg',
      status: args.firstReturn ? 'pass' : 'fail',
      detail: args.firstReturn
        ? `5M returned into the parent/nested FVG at ${args.firstReturn.time}.`
        : '5M never returned into the parent/nested FVG during the session window.',
    },
    {
      gate: 'completed_5m_wick_defense',
      status: args.wickDefenseBars.length ? 'pass' : 'fail',
      detail: args.wickDefenseBars.length
        ? `Completed 5M wick defense found at ${args.wickDefenseBars.map((bar) => bar.time).join(', ')}.`
        : 'No completed 5M wick-defense candle was found inside the FVG area.',
    },
    {
      gate: 'completed_5m_continuation_proof',
      status: args.proof ? 'pass' : 'fail',
      detail: args.proof
        ? `Completed 5M continuation proof closed at ${args.proof.time}.`
        : 'No completed 5M continuation close away from the FVG was found after wick defense.',
    },
    {
      gate: 'entry_stop_risk_contract',
      status: args.entry !== null && args.stop !== null && args.riskPoints !== null && args.riskPoints > 0 ? 'pass' : 'fail',
      detail: args.entry !== null && args.stop !== null && args.riskPoints !== null && args.riskPoints > 0
        ? `Entry ${args.entry.toFixed(2)}, protected 5M stop ${args.stop.toFixed(2)}, risk ${args.riskPoints.toFixed(2)} pts.`
        : 'Missing valid entry, protected 5M stop, or positive entry-to-stop risk.',
    },
    {
      gate: 'tactical_targets_from_actual_risk',
      status: args.target1 !== null && args.target2 !== null ? 'pass' : 'fail',
      detail: args.target1 !== null && args.target2 !== null
        ? `T1 ${args.target1.toFixed(2)} and T2 ${args.target2.toFixed(2)} were calculated from actual risk.`
        : 'T1/T2 could not be calculated from actual entry-to-stop risk.',
    },
    {
      gate: 'target_room_or_liquidity_context',
      status: args.nearestLiquidity ? 'context' : 'fail',
      detail: args.nearestLiquidity
        ? `Nearest real liquidity context: ${args.nearestLiquidity.label} ${args.nearestLiquidity.price.toFixed(2)}.`
        : 'No nearest real liquidity objective was found before proof.',
    },
  ];
}

function traceZone(args: {
  zone: Zone;
  bars5m: Bar[];
  bars15m: Bar[];
  sessionWindow: { from: string; to: string };
  contextFrom: string;
  allZones: Zone[];
  barsByTimeframe: Partial<Record<InventoryTimeframe, Bar[]>>;
}): TraceRow {
  const { zone, bars5m, bars15m, sessionWindow } = args;
  const reasons: string[] = [];
  const postCreate15m = bars15m.filter((bar) => bar.time > zone.createdAt && bar.time <= sessionWindow.to);
  const parentFailure = postCreate15m.find((bar) => overlapsZone(bar, zone) && acceptedThroughAgainstZone(bar, zone));
  const defendedFirstContinuation = findDefendedFirstContinuation({
    zone,
    bars5m,
    sessionWindow,
    parentFailureTime: parentFailure?.time ?? null,
  });
  const activeZone = defendedFirstContinuation?.zone ?? zone;
  const parentDisplacementBar = findParentDisplacementBar(activeZone, bars15m);
  const parentDisplacement = Boolean(parentDisplacementBar);
  if (!parentDisplacement) reasons.push('15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic.');
  if (defendedFirstContinuation) {
    reasons.push(
      `Defended-first continuation precedence: ${activeZone.direction} 5M defense proof completed at ${defendedFirstContinuation.defense.proofTime} before ${parentFailure ? `later same-zone failure/reversal read at ${parentFailure.time}` : 'any later same-zone failure/reversal read'}. Review the defended continuation before labeling this zone as failure/reversal.`
    );
  } else if (!parentFailure) {
    reasons.push('No 15M acceptance through the parent FVG was found inside this session window.');
  }

  const returnFrom = defendedFirstContinuation ? activeZone.createdAt : parentFailure?.time ?? activeZone.createdAt;
  const postFailure5m = bars5m.filter((bar) => bar.time >= returnFrom && bar.time <= sessionWindow.to);
  const firstReturn = postFailure5m.find((bar) => overlapsZone(bar, activeZone));
  if (!firstReturn) reasons.push(defendedFirstContinuation
    ? 'After the 15M battle zone was created, 5M did not return into the defended 15M FVG zone.'
    : 'After the parent failure, 5M did not return into the failed 15M FVG zone.');

  const wickDefenseBars = firstReturn
    ? postFailure5m.filter((bar) => bar.time >= firstReturn.time && overlapsZone(bar, activeZone) && hasWickDefense(bar, activeZone.direction))
    : [];
  const defendedFirstDefenseBar = defendedFirstContinuation?.defense.wickDefenseTime
    ? postFailure5m.find((bar) => bar.time === defendedFirstContinuation.defense.wickDefenseTime) ?? null
    : null;
  const defendedFirstProofBar = defendedFirstContinuation?.defense.proofTime
    ? postFailure5m.find((bar) => bar.time === defendedFirstContinuation.defense.proofTime) ?? null
    : null;
  const effectiveDefenseBars = wickDefenseBars.length
    ? wickDefenseBars
    : defendedFirstDefenseBar
      ? [defendedFirstDefenseBar]
      : [];
  if (!effectiveDefenseBars.length) reasons.push(defendedFirstContinuation
    ? 'No completed 5M defended-zone hold or wick-defense candle was found inside the defended FVG zone.'
    : 'No completed 5M wick-defense candle was found inside the failed FVG zone.');

  const firstDefense = effectiveDefenseBars[0] ?? firstReturn;
  const proof = defendedFirstProofBar ?? (firstDefense
    ? postFailure5m.find((bar) => bar.time > firstDefense.time && closesContinuationSide(bar, activeZone))
    : null
  );
  if (!proof) reasons.push(defendedFirstContinuation
    ? 'No completed 5M continuation close away from the defended FVG zone was found after the return.'
    : 'No completed 5M continuation close away from the failed FVG zone was found after the return.');

  const entry = proof ? roundTick(proof.close) : null;
  const structureLookback = proof
    ? bars5m.filter((bar) => bar.time >= sessionWindow.from && bar.time < proof.time)
    : [];
  const localStop = proof && entry !== null
    ? findProtectedStructureStop(activeZone.direction, structureLookback, entry, activeZone)
    : null;
  const stop = proof ? protectedStopFromParentStructure(activeZone.direction, localStop, activeZone) : null;
  const riskPoints = entry !== null && stop !== null
    ? roundTick(activeZone.direction === 'LONG' ? entry - stop : stop - entry)
    : null;
  if (riskPoints !== null && riskPoints <= 0) reasons.push('Protected 5M stop is not beyond entry on the active side.');

  const target1 = entry !== null && riskPoints !== null && riskPoints > 0
    ? roundTick(activeZone.direction === 'LONG' ? entry + riskPoints * 1.5 : entry - riskPoints * 1.5)
    : null;
  const target2 = entry !== null && riskPoints !== null && riskPoints > 0
    ? roundTick(activeZone.direction === 'LONG' ? entry + riskPoints * 2 : entry - riskPoints * 2)
    : null;
  const nearestLiquidity = entry !== null
    ? findNearestLiquidity(activeZone.direction, entry, bars5m.filter((bar) => bar.time < proof!.time))
    : null;
  const battleZoneInventory = buildBattleZoneInventory({
    activeZone,
    zones: args.allZones,
    bars15m,
    bars5m,
    sessionWindow,
    allowBattleZoneHold: Boolean(defendedFirstContinuation),
  });
  const battleZoneEligible =
    battleZoneInventory.activeRole !== 'not_in_battle_inventory' &&
    battleZoneInventory.activeFiveMinuteDefense.status === 'confirmed_defense';
  if (battleZoneInventory.activeRole === 'not_in_battle_inventory') {
    reasons.push('15M FVG is middle-zone clutter for this research model; only the first reaction zone, final/deepest battle zone, or latest active-session FVG can promote.');
  } else if (battleZoneInventory.activeFiveMinuteDefense.status !== 'confirmed_defense') {
    reasons.push('Selected 15M battle zone did not receive completed 5M defense confirmation.');
  }

  const structurallyEligible = Boolean(
    parentDisplacement &&
    firstReturn &&
    effectiveDefenseBars.length &&
    proof &&
    stop !== null &&
    entry !== null &&
    riskPoints !== null &&
    riskPoints > 0 &&
    target1 !== null &&
    target2 !== null &&
    battleZoneEligible
  );
  const rejectionGates = buildRejectionGates({
    parentDisplacement,
    parentDisplacementTime: parentDisplacementBar?.time ?? null,
    parentFailure: parentFailure ?? null,
    firstReturn: firstReturn ?? null,
    wickDefenseBars: effectiveDefenseBars,
    proof,
    entry,
    stop,
    riskPoints,
    target1,
    target2,
    nearestLiquidity,
  });
  if (proof && stop !== null && entry !== null && riskPoints !== null && riskPoints > 0 && target1 !== null && target2 !== null) {
    const fvgInventoryAtProof = inventoryAtProof({
      proof,
      zones: args.allZones,
      barsByTimeframe: args.barsByTimeframe,
    });
    const afterProofBars = bars5m.filter((bar) => bar.time > proof.time);
    const objectiveLadder = buildObjectiveLadder({
      direction: activeZone.direction,
      entry,
      target1,
      target2,
      proofTime: proof.time,
      bars5m,
      inventory: fvgInventoryAtProof,
      sessionWindow,
      contextFrom: args.contextFrom,
    });
    const liquidityFirstTarget = firstLiquidityBeforeT1({
      direction: activeZone.direction,
      entry,
      stop,
      target1,
      objectiveLadder,
    });
    const opposingFvgObstacleBeforeT1 = firstOpposingFvgObstacleBeforeT1({
      direction: activeZone.direction,
      entry,
      target1,
      inventory: fvgInventoryAtProof,
    });
    const outcome = evaluateOutcome({
      direction: activeZone.direction,
      entry,
      stop,
      target1,
      target2,
      bars: afterProofBars,
    });
    const opposingFvgObstacleReaction = evaluateFvgObstacleReaction({
      direction: activeZone.direction,
      target1,
      obstacle: opposingFvgObstacleBeforeT1,
      standardOutcome: outcome,
      bars: afterProofBars,
    });
    const balancedPathToLiquidity = classifyBalancedPathToLiquidity({
      eligible: structurallyEligible,
      direction: activeZone.direction,
      entry,
      target1,
      liquidityFirstTarget,
      obstacleReaction: opposingFvgObstacleReaction.opposingFvgObstacleReaction,
    });
    const continuationRead = classifyContinuationRead({
      eligible: structurallyEligible,
      obstacle: opposingFvgObstacleBeforeT1,
      obstacleReaction: opposingFvgObstacleReaction.opposingFvgObstacleReaction,
      balancedPathToLiquidity,
    });
    const managedOutcome = evaluateManagedOutcome({
      direction: activeZone.direction,
      entry,
      stop,
      liquidityFirstTarget,
      standardOutcome: outcome,
      bars: afterProofBars,
    });
    return {
      parentFvg: activeZone,
      eligible: structurallyEligible,
      verdict: structurallyEligible ? 'valid_trace_candidate' : 'diagnostic_only_not_valid_under_clean_workflow',
      rejectionGates,
      parentDisplacement,
      parentDisplacementTime: parentDisplacementBar?.time ?? null,
      parentFailureTime: parentFailure?.time ?? null,
      firstReturnTime: firstReturn?.time ?? null,
      wickDefenseTimes: wickDefenseBars.map((bar) => bar.time),
      proofTime: proof.time,
      entry,
      stop,
      riskPoints,
      target1,
      target2,
      nearestLiquidity,
      fvgInventoryAtProof,
      battleZoneInventory,
      objectiveLadder,
      opposingFvgObstacleBeforeT1,
      ...opposingFvgObstacleReaction,
      continuationRead,
      balancedPathToLiquidity,
      liquidityFirstTarget,
      ...outcome,
      ...managedOutcome,
      reasons,
    };
  }

  return {
    parentFvg: activeZone,
    eligible: false,
    verdict: 'diagnostic_only_not_valid_under_clean_workflow',
    rejectionGates,
    parentDisplacement,
    parentDisplacementTime: parentDisplacementBar?.time ?? null,
    parentFailureTime: parentFailure?.time ?? null,
    firstReturnTime: firstReturn?.time ?? null,
    wickDefenseTimes: wickDefenseBars.map((bar) => bar.time),
    proofTime: proof?.time ?? null,
    entry,
    stop,
    riskPoints,
    target1,
    target2,
    nearestLiquidity,
    fvgInventoryAtProof: inventoryAtProof({ proof, zones: args.allZones, barsByTimeframe: args.barsByTimeframe }),
    battleZoneInventory,
    objectiveLadder: [],
    opposingFvgObstacleBeforeT1: null,
    opposingFvgObstacleReaction: 'none',
    opposingFvgObstacleReactionTime: null,
    continuationRead: 'diagnostic_only_no_completed_plan',
    balancedPathToLiquidity: {
      status: 'diagnostic_only_no_completed_plan',
      reason: 'The row did not produce a completed research plan with entry, stop, and targets.',
      target: null,
    },
    liquidityFirstTarget: null,
    outcome: 'NoEntry',
    outcomeTime: null,
    exitPrice: null,
    oneMesPnl: 0,
    managedOutcome: 'NoEntry',
    managedOutcomeTime: null,
    managedExitPrice: null,
    managedOneMesPnl: 0,
    reasons,
  };
}

function sameParentCampaignKey(trace: TraceRow): string | null {
  if (!trace.eligible || !trace.proofTime || !trace.parentDisplacementTime) return null;
  return `${trace.parentFvg.direction}:${trace.parentDisplacementTime}`;
}

function applyFirstProofCampaignGate(traces: TraceRow[]): TraceRow[] {
  const firstByCampaign = new Map<string, TraceRow>();

  for (const trace of traces) {
    const key = sameParentCampaignKey(trace);
    if (!key) continue;
    const current = firstByCampaign.get(key);
    if (!current || (trace.proofTime ?? '').localeCompare(current.proofTime ?? '') < 0) {
      firstByCampaign.set(key, trace);
    }
  }

  return traces.map((trace) => {
    const key = sameParentCampaignKey(trace);
    if (!key) return trace;
    const first = firstByCampaign.get(key);
    if (!first || first === trace || first.proofTime === trace.proofTime) return trace;

    const detail =
      `Earlier same-side completed 5M proof from the same parent displacement already completed at ${first.proofTime}. ` +
      'Later same-parent rows are management/re-entry context unless a reset rule is explicitly approved.';

    return {
      ...trace,
      eligible: false,
      verdict: 'diagnostic_only_not_valid_under_clean_workflow',
      rejectionGates: [
        ...trace.rejectionGates,
        {
          gate: 'first_valid_same_parent_proof',
          status: 'fail',
          detail,
        },
      ],
      reasons: [
        ...trace.reasons,
        `Late same-parent FVG continuation blocked. ${detail}`,
      ],
    };
  });
}

function markdownReport(report: DiagnosticReport): string {
  const formatInventory = (items: FvgInventoryItem[]): string => {
    if (!items.length) return 'none';
    return items
      .map((item) => `${item.timeframe} ${item.direction} ${item.lower.toFixed(2)}-${item.upper.toFixed(2)} parent ${zoneParentDisplacementAt(item)} confirmed ${zoneConfirmedAt(item)} status ${item.statusAtReview}`)
      .join('; ');
  };
  const formatObjectives = (items: ObjectiveLevel[]): string => {
    if (!items.length) return 'none';
    return items
      .map((item) => `${item.kind} ${item.price.toFixed(2)} ${item.reachedTime ? `reached ${item.reachedTime}` : 'not reached'} (${item.label})`)
      .join('; ');
  };
  const formatObstacle = (item: FvgInventoryItem | null): string => {
    if (!item) return 'none before T1';
    return `${item.timeframe} ${item.direction} ${item.lower.toFixed(2)}-${item.upper.toFixed(2)} parent ${zoneParentDisplacementAt(item)} confirmed ${zoneConfirmedAt(item)} status ${item.statusAtReview}`;
  };
  const formatBattleZone = (item: BattleZoneItem | null): string => {
    if (!item) return 'none';
    return `${item.role} ${item.direction} ${item.lower.toFixed(2)}-${item.upper.toFixed(2)} parent ${zoneParentDisplacementAt(item)} confirmed ${zoneConfirmedAt(item)} ${item.defenseStatus}${item.defendedTime ? ` defended ${item.defendedTime}` : ''}${item.failedTime ? ` failed ${item.failedTime}` : ''}`;
  };
  const formatFiveMinuteDefense = (read: FiveMinuteDefenseRead): string =>
    `${read.status}; return ${read.returnTime ?? 'none'}; wick ${read.wickDefenseTime ?? 'none'}; proof ${read.proofTime ?? 'none'}; ${read.detail}`;
  const formatGates = (items: RejectionGate[]): string => {
    if (!items.length) return 'none';
    return items.map((item) => `${item.status.toUpperCase()} ${item.gate}: ${item.detail}`).join(' | ');
  };
  const storyForTrace = (trace: TraceRow): string => {
    if (!trace.proofTime || !trace.entry) return 'No completed proof, so no trade story is formed.';
    const failedAbove = trace.fvgInventoryAtProof.failedAbove.length;
    const openAbove = trace.fvgInventoryAtProof.openAbove.length;
    const openBelow = trace.fvgInventoryAtProof.openBelow.length;
    const reachedStructural = trace.objectiveLadder
      .filter((item) => item.kind !== 'tactical' && item.reachedTime)
      .map((item) => `${item.price.toFixed(2)} ${item.kind}`)
      .slice(0, 4);
    const obstacleText = trace.opposingFvgObstacleBeforeT1
      ? `Opposing FVG obstacle before T1: ${trace.opposingFvgObstacleBeforeT1.timeframe} ${trace.opposingFvgObstacleBeforeT1.lower.toFixed(2)}-${trace.opposingFvgObstacleBeforeT1.upper.toFixed(2)} with reaction ${trace.opposingFvgObstacleReaction}.`
      : 'No opposing FVG obstacle was loaded before T1.';
    return [
      `${trace.parentFvg.direction} proof completed at ${trace.proofTime} from ${trace.parentFvg.lower.toFixed(2)}-${trace.parentFvg.upper.toFixed(2)}.`,
      `${failedAbove + openAbove} failed/open FVG areas remained above as resistance/memory.`,
      `${openBelow} open FVG areas remained below as downside draw/context.`,
      obstacleText,
      reachedStructural.length
        ? `Structural objectives reached after proof: ${reachedStructural.join(', ')}.`
        : 'No structural objective beyond tactical targets was reached inside the session window.',
      `T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.`,
    ].join(' ');
  };

  const lines = [
    `# Jan 7 FVG Failure Diagnostic Trace`,
    ``,
    `Boundary: ${report.boundary}`,
    `Instrument: ${report.bridgeInstrument}${report.requestedBridgeInstrument !== report.bridgeInstrument ? ` (requested ${report.requestedBridgeInstrument})` : ''}`,
    `Date/session: ${report.date} / ${report.session} (${report.sessionWindow.from} to ${report.sessionWindow.to})`,
    `Context window: ${report.contextDays} days (${report.loadWindow.from} to ${report.loadWindow.to})`,
    `Forward target-check horizon: ${report.forwardDays} day(s) after the review date`,
    ``,
    `## Coverage`,
    ...TIMEFRAMES.map((timeframe) => {
      const item = report.coverage[timeframe];
      return `- ${timeframe}: ${item.bars} bars (${item.first ?? 'none'} to ${item.last ?? 'none'})`;
    }),
    ``,
    `## Research Tags`,
    ...(report.researchTags.length
      ? report.researchTags.map((tag) => `- ${tag.tag} (${tag.status}): ${tag.detail}`)
      : ['- none']),
    ``,
    `## Research Rules`,
    ...report.researchRules.flatMap((rule) => [
      `- ${rule.name} (${rule.status}): ${rule.definition}`,
      `  - Required facts: ${rule.requiredFacts.join(' | ')}`,
      `  - Invalidation: ${rule.invalidation.join(' | ')}`,
      `  - Standalone trigger: ${rule.notAStandaloneTrigger ? 'no' : 'yes'}`,
    ]),
    ``,
    `## FVG Inventory At Session Start`,
    `- Open below: ${formatInventory(report.fvgInventoryAtSessionStart.filter((item) => item.relationToPrice === 'below' && ['open_untouched', 'partial_touch'].includes(item.statusAtReview)).slice(0, 10))}`,
    `- Failed above: ${formatInventory(report.fvgInventoryAtSessionStart.filter((item) => item.relationToPrice === 'above' && item.statusAtReview === 'failed_inverted').slice(0, 10))}`,
    `- Open above: ${formatInventory(report.fvgInventoryAtSessionStart.filter((item) => item.relationToPrice === 'above' && ['open_untouched', 'partial_touch'].includes(item.statusAtReview)).slice(0, 10))}`,
    ``,
    `## Trace Rows`,
  ];

  for (const [index, trace] of report.traces.entries()) {
    lines.push(
      ``,
      `### ${index + 1}. ${trace.parentFvg.direction} 15M FVG ${trace.parentFvg.lower.toFixed(2)}-${trace.parentFvg.upper.toFixed(2)} parent ${zoneParentDisplacementAt(trace.parentFvg)} confirmed ${zoneConfirmedAt(trace.parentFvg)}`,
      `- Verdict: ${trace.verdict}`,
      `- Continuation read: ${trace.continuationRead}`,
      `- Gate trace: ${formatGates(trace.rejectionGates)}`,
      `- Parent displacement: ${trace.parentDisplacement ? 'yes' : 'no'}`,
      `- Parent displacement candle: ${trace.parentDisplacementTime ?? 'none'}`,
      `- Parent failure: ${trace.parentFailureTime ?? 'not found'}`,
      `- First 5M return: ${trace.firstReturnTime ?? 'not found'}`,
      `- 5M wick defense: ${trace.wickDefenseTimes.length ? trace.wickDefenseTimes.join(', ') : 'none'}`,
      `- Proof: ${trace.proofTime ?? 'none'}`,
      `- Entry/stop/risk: ${trace.entry?.toFixed(2) ?? 'N/A'} / ${trace.stop?.toFixed(2) ?? 'N/A'} / ${trace.riskPoints?.toFixed(2) ?? 'N/A'} pts`,
      `- T1/T2: ${trace.target1?.toFixed(2) ?? 'N/A'} / ${trace.target2?.toFixed(2) ?? 'N/A'}`,
      `- Nearest liquidity: ${trace.nearestLiquidity ? `${trace.nearestLiquidity.label} ${trace.nearestLiquidity.price.toFixed(2)}` : 'N/A'}`,
      `- Opposing FVG obstacle before T1: ${formatObstacle(trace.opposingFvgObstacleBeforeT1)}`,
      `- Opposing FVG reaction: ${trace.opposingFvgObstacleReaction}${trace.opposingFvgObstacleReactionTime ? ` at ${trace.opposingFvgObstacleReactionTime}` : ''}`,
      `- 15M battle-zone scope: ${trace.battleZoneInventory.scope}`,
      `- 15M battle-zone active role: ${trace.battleZoneInventory.activeRole}`,
      `- 15M first reaction zone: ${formatBattleZone(trace.battleZoneInventory.firstReaction)}`,
      `- 15M final/deepest battle zone: ${formatBattleZone(trace.battleZoneInventory.finalDeepest)}`,
      `- 5M defense of active 15M zone: ${formatFiveMinuteDefense(trace.battleZoneInventory.activeFiveMinuteDefense)}`,
      `- Meaningful liquidity target before T1: ${trace.liquidityFirstTarget ? `${trace.liquidityFirstTarget.price.toFixed(2)} (${trace.liquidityFirstTarget.label})` : 'none before T1'}`,
      `- Balanced path to liquidity: ${trace.balancedPathToLiquidity.status} - ${trace.balancedPathToLiquidity.reason}`,
      `- Open FVGs below at proof: ${formatInventory(trace.fvgInventoryAtProof.openBelow)}`,
      `- Failed FVGs above at proof: ${formatInventory(trace.fvgInventoryAtProof.failedAbove)}`,
      `- Open FVGs above at proof: ${formatInventory(trace.fvgInventoryAtProof.openAbove)}`,
      `- Objective ladder: ${formatObjectives(trace.objectiveLadder)}`,
      `- Story: ${storyForTrace(trace)}`,
      `- Outcome: ${trace.outcome}${trace.outcomeTime ? ` at ${trace.outcomeTime}` : ''}, one MES ${trace.oneMesPnl >= 0 ? '+' : ''}$${trace.oneMesPnl.toFixed(2)}`,
      `- Managed outcome: ${trace.managedOutcome}${trace.managedOutcomeTime ? ` at ${trace.managedOutcomeTime}` : ''}, exit ${trace.managedExitPrice?.toFixed(2) ?? 'N/A'}, one MES ${trace.managedOneMesPnl >= 0 ? '+' : ''}$${trace.managedOneMesPnl.toFixed(2)}`,
      `- Reasons: ${trace.reasons.length ? trace.reasons.join(' ') : 'Qualified by this diagnostic heuristic.'}`,
    );
  }
  return `${lines.join('\n')}\n`;
}

async function loadBars(args: {
  instrument: string;
  from: string;
  to: string;
}): Promise<Record<MarketBarTimeframe, Bar[]>> {
  const config = loadMarketDataConfig();
  const output = {} as Record<MarketBarTimeframe, Bar[]>;
  for (const timeframe of TIMEFRAMES) {
    output[timeframe] = validBars(await fetchCachedMarketBars({
      instrument: args.instrument,
      timeframe,
      from: args.from,
      to: args.to,
      config,
      limit: 100000,
    }));
  }
  return output;
}

async function main(): Promise<void> {
  const date = argValue('date', '2026-01-07');
  const session = argValue('session', 'lunch') as Session;
  if (!['morning', 'lunch', 'full-rth'].includes(session)) throw new Error(`Unsupported session: ${session}`);
  const requestedBridgeInstrument = argValue(
    'bridge-instrument',
    process.env.SUPERVISOR_BRIDGE_INSTRUMENT || DEFAULT_FVG_RESEARCH_BRIDGE_INSTRUMENT,
  );
  const bridgeInstrument = normalizeFvgResearchBridgeInstrument(requestedBridgeInstrument);
  const label = safeLabel(argValue('label', `jan7-fvg-failure-${session}`));
  const contextDays = argNumber('context-days', 3);
  const forwardDays = argNonNegativeNumber('forward-days', 0);
  const sessionWindow = sessionWindowFor(date, session);
  const contextFrom = `${date}T09:15:00`;
  const loadFrom = `${addDays(date, -contextDays)}T00:00:00`;
  const loadTo = `${addDays(date, forwardDays)}T23:59:59`;
  const bars = await loadBars({ instrument: bridgeInstrument, from: loadFrom, to: loadTo });
  const fvgScanFrom = session === 'lunch' ? `${date}T11:30:00` : sessionWindow.from;
  const fvgScanTo = sessionWindow.to;
  const allZones = TIMEFRAMES.flatMap((timeframe) =>
    detectFvgs(bars[timeframe], timeframe)
      .filter((zone) => zone.createdAt >= loadFrom && zone.createdAt <= fvgScanTo)
  );
  const parentZones = detectFvgs(bars['15m'], '15m')
    .filter((zone) => zone.createdAt >= fvgScanFrom && zone.createdAt <= fvgScanTo)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const sessionStartBar = bars['5m'].find((bar) => bar.time >= sessionWindow.from) ?? bars['5m'].at(-1);
  const fvgInventoryAtSessionStart = sessionStartBar
    ? buildFvgInventory({
        zones: allZones,
        barsByTimeframe: bars,
        reviewTime: sessionWindow.from,
        price: sessionStartBar.close,
      })
    : [];
  const rawTraces = parentZones.map((zone) => traceZone({
    zone,
    bars5m: bars['5m'],
    bars15m: bars['15m'],
    sessionWindow,
    contextFrom,
    allZones,
    barsByTimeframe: bars,
  }));
  const traces = applyFirstProofCampaignGate(rawTraces);

  const coverage = Object.fromEntries(TIMEFRAMES.map((timeframe) => [
    timeframe,
    {
      bars: bars[timeframe].length,
      first: bars[timeframe][0]?.time ?? null,
      last: bars[timeframe].at(-1)?.time ?? null,
    },
  ])) as DiagnosticReport['coverage'];
  const researchTags = researchTagsForDate(date);

  const report: DiagnosticReport = {
    reportType: 'jan7_fvg_failure_diagnostic_trace',
    generatedAt: new Date().toISOString(),
    boundary: 'research_only_no_live_scanner_discord_or_trading_rule_change',
    requestedBridgeInstrument,
    bridgeInstrument,
    date,
    session,
    sessionWindow,
    contextDays,
    forwardDays,
    loadWindow: { from: loadFrom, to: loadTo },
    source: {
      marketData: 'supabase_market_bars_read_only',
      completedHistoricalBarsOnly: true,
      chartAlignedContractRequired: true,
    },
    coverage,
    htfContext: {
      '60m': coverage['60m'],
      '120m': coverage['120m'],
      '240m': coverage['240m'],
    },
    researchTags,
    researchRules: [BATTLE_ZONE_INVENTORY_RULE, BALANCED_PATH_CONTINUATION_RULE],
    fvgInventoryAtSessionStart,
    traces,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  const jsonPath = path.join(OUT_DIR, `${label}.json`);
  const markdownPath = path.join(OUT_DIR, `${label}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(markdownPath, markdownReport(report));

  const eligible = traces.filter((trace) => trace.eligible);
  const tradeLike = traces.filter((trace) => trace.outcome !== 'NoEntry');
  console.log(JSON.stringify({
    reportType: report.reportType,
    boundary: report.boundary,
    bridgeInstrument,
    date,
    session,
    contextDays,
    fvgInventoryAtSessionStart: {
      openBelow: fvgInventoryAtSessionStart.filter((item) => item.relationToPrice === 'below' && ['open_untouched', 'partial_touch'].includes(item.statusAtReview)).length,
      failedAbove: fvgInventoryAtSessionStart.filter((item) => item.relationToPrice === 'above' && item.statusAtReview === 'failed_inverted').length,
      openAbove: fvgInventoryAtSessionStart.filter((item) => item.relationToPrice === 'above' && ['open_untouched', 'partial_touch'].includes(item.statusAtReview)).length,
    },
    parentFvgs: parentZones.length,
    eligible: eligible.length,
    tradeLikeDiagnostics: tradeLike.length,
    researchTags,
    outputs: { jsonPath, markdownPath },
    eligibleRows: eligible.map((trace) => ({
      direction: trace.parentFvg.direction,
      parentFvg: `${trace.parentFvg.lower.toFixed(2)}-${trace.parentFvg.upper.toFixed(2)}`,
      parentCreatedAt: zoneParentDisplacementAt(trace.parentFvg),
      parentDisplacementAt: zoneParentDisplacementAt(trace.parentFvg),
      parentConfirmedAt: zoneConfirmedAt(trace.parentFvg),
      proofTime: trace.proofTime,
      entry: trace.entry,
      stop: trace.stop,
      target1: trace.target1,
      target2: trace.target2,
      liquidityFirstTarget: trace.liquidityFirstTarget
        ? {
            kind: trace.liquidityFirstTarget.kind,
            price: trace.liquidityFirstTarget.price,
            label: trace.liquidityFirstTarget.label,
            reachedTime: trace.liquidityFirstTarget.reachedTime,
          }
        : null,
      opposingFvgObstacleBeforeT1: trace.opposingFvgObstacleBeforeT1
        ? {
            timeframe: trace.opposingFvgObstacleBeforeT1.timeframe,
            direction: trace.opposingFvgObstacleBeforeT1.direction,
            zone: `${trace.opposingFvgObstacleBeforeT1.lower.toFixed(2)}-${trace.opposingFvgObstacleBeforeT1.upper.toFixed(2)}`,
            parentDisplacementAt: zoneParentDisplacementAt(trace.opposingFvgObstacleBeforeT1),
            confirmedAt: zoneConfirmedAt(trace.opposingFvgObstacleBeforeT1),
            createdAt: trace.opposingFvgObstacleBeforeT1.createdAt,
            statusAtReview: trace.opposingFvgObstacleBeforeT1.statusAtReview,
          }
        : null,
      opposingFvgObstacleReaction: trace.opposingFvgObstacleReaction,
      opposingFvgObstacleReactionTime: trace.opposingFvgObstacleReactionTime,
      continuationRead: trace.continuationRead,
      balancedPathToLiquidity: trace.balancedPathToLiquidity,
      outcome: trace.outcome,
      oneMesPnl: trace.oneMesPnl,
      managedOutcome: trace.managedOutcome,
      managedExitPrice: trace.managedExitPrice,
      managedOneMesPnl: trace.managedOneMesPnl,
    })),
    diagnosticRowsThatWorkedButFailedStrictWorkflow: tradeLike
      .filter((trace) => !trace.eligible)
      .map((trace) => ({
        direction: trace.parentFvg.direction,
        parentFvg: `${trace.parentFvg.lower.toFixed(2)}-${trace.parentFvg.upper.toFixed(2)}`,
        parentCreatedAt: zoneParentDisplacementAt(trace.parentFvg),
        parentDisplacementAt: zoneParentDisplacementAt(trace.parentFvg),
        parentConfirmedAt: zoneConfirmedAt(trace.parentFvg),
        proofTime: trace.proofTime,
        entry: trace.entry,
        stop: trace.stop,
        target1: trace.target1,
        target2: trace.target2,
        liquidityFirstTarget: trace.liquidityFirstTarget
          ? {
              kind: trace.liquidityFirstTarget.kind,
              price: trace.liquidityFirstTarget.price,
              label: trace.liquidityFirstTarget.label,
              reachedTime: trace.liquidityFirstTarget.reachedTime,
            }
          : null,
        opposingFvgObstacleBeforeT1: trace.opposingFvgObstacleBeforeT1
          ? {
              timeframe: trace.opposingFvgObstacleBeforeT1.timeframe,
              direction: trace.opposingFvgObstacleBeforeT1.direction,
              zone: `${trace.opposingFvgObstacleBeforeT1.lower.toFixed(2)}-${trace.opposingFvgObstacleBeforeT1.upper.toFixed(2)}`,
              parentDisplacementAt: zoneParentDisplacementAt(trace.opposingFvgObstacleBeforeT1),
              confirmedAt: zoneConfirmedAt(trace.opposingFvgObstacleBeforeT1),
              createdAt: trace.opposingFvgObstacleBeforeT1.createdAt,
              statusAtReview: trace.opposingFvgObstacleBeforeT1.statusAtReview,
            }
          : null,
        opposingFvgObstacleReaction: trace.opposingFvgObstacleReaction,
        opposingFvgObstacleReactionTime: trace.opposingFvgObstacleReactionTime,
        continuationRead: trace.continuationRead,
        balancedPathToLiquidity: trace.balancedPathToLiquidity,
        outcome: trace.outcome,
        oneMesPnl: trace.oneMesPnl,
        managedOutcome: trace.managedOutcome,
        managedExitPrice: trace.managedExitPrice,
        managedOneMesPnl: trace.managedOneMesPnl,
        failedGates: trace.rejectionGates
          .filter((gate) => gate.status === 'fail')
          .map((gate) => ({ gate: gate.gate, detail: gate.detail })),
        objectiveLadder: trace.objectiveLadder.map((item) => ({
          kind: item.kind,
          price: item.price,
          reachedTime: item.reachedTime,
          label: item.label,
        })),
        reasons: trace.reasons,
      })),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
