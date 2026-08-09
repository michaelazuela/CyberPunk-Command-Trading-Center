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

interface Zone {
  direction: Direction;
  timeframe: InventoryTimeframe;
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

interface ObjectiveLevel {
  kind: 'tactical' | 'liquidity' | 'open_fvg' | 'session_extreme';
  label: string;
  price: number;
  reachedTime: string | null;
}

interface RejectionGate {
  gate: string;
  status: 'pass' | 'fail' | 'context';
  detail: string;
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
  objectiveLadder: ObjectiveLevel[];
  outcome: 'T2' | 'T1' | 'Stop' | 'SessionClose' | 'NoEntry';
  outcomeTime: string | null;
  exitPrice: number | null;
  oneMesPnl: number;
  reasons: string[];
}

interface DiagnosticReport {
  reportType: 'jan7_fvg_failure_diagnostic_trace';
  generatedAt: string;
  boundary: 'research_only_no_live_scanner_discord_or_trading_rule_change';
  bridgeInstrument: string;
  date: string;
  session: Session;
  sessionWindow: { from: string; to: string };
  source: {
    marketData: 'supabase_market_bars_read_only';
    completedHistoricalBarsOnly: true;
    chartAlignedContractRequired: true;
  };
  coverage: Record<MarketBarTimeframe, { bars: number; first: string | null; last: string | null }>;
  htfContext: Record<'60m' | '120m' | '240m', { bars: number; first: string | null; last: string | null }>;
  fvgInventoryAtSessionStart: FvgInventoryItem[];
  traces: TraceRow[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT_DIR = path.join(__dirname, 'replay-diagnostics');
const TIMEFRAMES: MarketBarTimeframe[] = ['5m', '15m', '60m', '120m', '240m'];
const POINT_VALUE_MES = 5;

function argValue(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function safeLabel(value: string): string {
  return value.replace(/[^0-9A-Za-z_-]+/g, '-');
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

function findParentDisplacementBar(zone: Zone, bars15m: Bar[]): Bar | null {
  const parentIndex = bars15m.findIndex((bar) => bar.time === zone.createdAt);
  if (parentIndex < 0) return null;
  const formationIndexes = [parentIndex - 2, parentIndex - 1, parentIndex].filter((index) => index >= 0);
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
      label: `${item.timeframe} ${item.direction} open FVG ${item.statusAtReview} created ${item.createdAt}`,
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
  const parentDisplacementBar = findParentDisplacementBar(zone, bars15m);
  const parentDisplacement = Boolean(parentDisplacementBar);
  if (!parentDisplacement) reasons.push('15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic.');

  const postCreate15m = bars15m.filter((bar) => bar.time > zone.createdAt && bar.time <= sessionWindow.to);
  const parentFailure = postCreate15m.find((bar) => overlapsZone(bar, zone) && acceptedThroughAgainstZone(bar, zone));
  if (!parentFailure) reasons.push('No 15M acceptance through the parent FVG was found inside this session window.');

  const returnFrom = parentFailure?.time ?? zone.createdAt;
  const postFailure5m = bars5m.filter((bar) => bar.time >= returnFrom && bar.time <= sessionWindow.to);
  const firstReturn = postFailure5m.find((bar) => overlapsZone(bar, zone));
  if (!firstReturn) reasons.push('After the parent failure, 5M did not return into the failed 15M FVG zone.');

  const wickDefenseBars = firstReturn
    ? postFailure5m.filter((bar) => bar.time >= firstReturn.time && overlapsZone(bar, zone) && hasWickDefense(bar, zone.direction))
    : [];
  if (!wickDefenseBars.length) reasons.push('No completed 5M wick-defense candle was found inside the failed FVG zone.');

  const firstDefense = wickDefenseBars[0] ?? firstReturn;
  const proof = firstDefense
    ? postFailure5m.find((bar) => bar.time >= firstDefense.time && closesContinuationSide(bar, zone))
    : null;
  if (!proof) reasons.push('No completed 5M continuation close away from the failed FVG zone was found after the return.');

  const stopLookback = proof ? barsBetween(bars5m, firstReturn?.time ?? returnFrom, proof.time) : [];
  const stop = proof ? findProtectedStop(zone.direction, stopLookback.length ? stopLookback : [proof]) : null;
  const entry = proof ? roundTick(proof.close) : null;
  const riskPoints = entry !== null && stop !== null
    ? roundTick(zone.direction === 'LONG' ? entry - stop : stop - entry)
    : null;
  if (riskPoints !== null && riskPoints <= 0) reasons.push('Protected 5M stop is not beyond entry on the active side.');

  const target1 = entry !== null && riskPoints !== null && riskPoints > 0
    ? roundTick(zone.direction === 'LONG' ? entry + riskPoints * 1.5 : entry - riskPoints * 1.5)
    : null;
  const target2 = entry !== null && riskPoints !== null && riskPoints > 0
    ? roundTick(zone.direction === 'LONG' ? entry + riskPoints * 2 : entry - riskPoints * 2)
    : null;
  const nearestLiquidity = entry !== null
    ? findNearestLiquidity(zone.direction, entry, bars5m.filter((bar) => bar.time < proof!.time))
    : null;

  const structurallyEligible = Boolean(
    parentDisplacement &&
    firstReturn &&
    wickDefenseBars.length &&
    proof &&
    stop !== null &&
    entry !== null &&
    riskPoints !== null &&
    riskPoints > 0 &&
    target1 !== null &&
    target2 !== null
  );
  const rejectionGates = buildRejectionGates({
    parentDisplacement,
    parentDisplacementTime: parentDisplacementBar?.time ?? null,
    parentFailure: parentFailure ?? null,
    firstReturn: firstReturn ?? null,
    wickDefenseBars,
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
    const outcome = evaluateOutcome({
      direction: zone.direction,
      entry,
      stop,
      target1,
      target2,
      bars: bars5m.filter((bar) => bar.time > proof.time && bar.time <= sessionWindow.to),
    });
    return {
      parentFvg: zone,
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
      objectiveLadder: buildObjectiveLadder({
        direction: zone.direction,
        entry,
        target1,
        target2,
        proofTime: proof.time,
        bars5m,
        inventory: fvgInventoryAtProof,
        sessionWindow,
        contextFrom: args.contextFrom,
      }),
      ...outcome,
      reasons,
    };
  }

  return {
    parentFvg: zone,
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
    objectiveLadder: [],
    outcome: 'NoEntry',
    outcomeTime: null,
    exitPrice: null,
    oneMesPnl: 0,
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
      .map((item) => `${item.timeframe} ${item.direction} ${item.lower.toFixed(2)}-${item.upper.toFixed(2)} created ${item.createdAt} status ${item.statusAtReview}`)
      .join('; ');
  };
  const formatObjectives = (items: ObjectiveLevel[]): string => {
    if (!items.length) return 'none';
    return items
      .map((item) => `${item.kind} ${item.price.toFixed(2)} ${item.reachedTime ? `reached ${item.reachedTime}` : 'not reached'} (${item.label})`)
      .join('; ');
  };
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
    return [
      `${trace.parentFvg.direction} proof completed at ${trace.proofTime} from ${trace.parentFvg.lower.toFixed(2)}-${trace.parentFvg.upper.toFixed(2)}.`,
      `${failedAbove + openAbove} failed/open FVG areas remained above as resistance/memory.`,
      `${openBelow} open FVG areas remained below as downside draw/context.`,
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
    `Instrument: ${report.bridgeInstrument}`,
    `Date/session: ${report.date} / ${report.session} (${report.sessionWindow.from} to ${report.sessionWindow.to})`,
    ``,
    `## Coverage`,
    ...TIMEFRAMES.map((timeframe) => {
      const item = report.coverage[timeframe];
      return `- ${timeframe}: ${item.bars} bars (${item.first ?? 'none'} to ${item.last ?? 'none'})`;
    }),
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
      `### ${index + 1}. ${trace.parentFvg.direction} 15M FVG ${trace.parentFvg.lower.toFixed(2)}-${trace.parentFvg.upper.toFixed(2)} created ${trace.parentFvg.createdAt}`,
      `- Verdict: ${trace.verdict}`,
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
      `- Open FVGs below at proof: ${formatInventory(trace.fvgInventoryAtProof.openBelow)}`,
      `- Failed FVGs above at proof: ${formatInventory(trace.fvgInventoryAtProof.failedAbove)}`,
      `- Open FVGs above at proof: ${formatInventory(trace.fvgInventoryAtProof.openAbove)}`,
      `- Objective ladder: ${formatObjectives(trace.objectiveLadder)}`,
      `- Story: ${storyForTrace(trace)}`,
      `- Outcome: ${trace.outcome}${trace.outcomeTime ? ` at ${trace.outcomeTime}` : ''}, one MES ${trace.oneMesPnl >= 0 ? '+' : ''}$${trace.oneMesPnl.toFixed(2)}`,
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
      limit: 20000,
    }));
  }
  return output;
}

async function main(): Promise<void> {
  const date = argValue('date', '2026-01-07');
  const session = argValue('session', 'lunch') as Session;
  if (!['morning', 'lunch', 'full-rth'].includes(session)) throw new Error(`Unsupported session: ${session}`);
  const bridgeInstrument = argValue('bridge-instrument', process.env.SUPERVISOR_BRIDGE_INSTRUMENT || 'MES 09-26');
  const label = safeLabel(argValue('label', `jan7-fvg-failure-${session}`));
  const sessionWindow = sessionWindowFor(date, session);
  const contextFrom = `${date}T09:15:00`;
  const loadFrom = `${addDays(date, -3)}T00:00:00`;
  const loadTo = `${date}T23:59:59`;
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

  const report: DiagnosticReport = {
    reportType: 'jan7_fvg_failure_diagnostic_trace',
    generatedAt: new Date().toISOString(),
    boundary: 'research_only_no_live_scanner_discord_or_trading_rule_change',
    bridgeInstrument,
    date,
    session,
    sessionWindow,
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
    fvgInventoryAtSessionStart: {
      openBelow: fvgInventoryAtSessionStart.filter((item) => item.relationToPrice === 'below' && ['open_untouched', 'partial_touch'].includes(item.statusAtReview)).length,
      failedAbove: fvgInventoryAtSessionStart.filter((item) => item.relationToPrice === 'above' && item.statusAtReview === 'failed_inverted').length,
      openAbove: fvgInventoryAtSessionStart.filter((item) => item.relationToPrice === 'above' && ['open_untouched', 'partial_touch'].includes(item.statusAtReview)).length,
    },
    parentFvgs: parentZones.length,
    eligible: eligible.length,
    tradeLikeDiagnostics: tradeLike.length,
    outputs: { jsonPath, markdownPath },
    eligibleRows: eligible.map((trace) => ({
      direction: trace.parentFvg.direction,
      parentFvg: `${trace.parentFvg.lower.toFixed(2)}-${trace.parentFvg.upper.toFixed(2)}`,
      parentCreatedAt: trace.parentFvg.createdAt,
      proofTime: trace.proofTime,
      entry: trace.entry,
      stop: trace.stop,
      target1: trace.target1,
      target2: trace.target2,
      outcome: trace.outcome,
      oneMesPnl: trace.oneMesPnl,
    })),
    diagnosticRowsThatWorkedButFailedStrictWorkflow: tradeLike
      .filter((trace) => !trace.eligible)
      .map((trace) => ({
        direction: trace.parentFvg.direction,
        parentFvg: `${trace.parentFvg.lower.toFixed(2)}-${trace.parentFvg.upper.toFixed(2)}`,
        parentCreatedAt: trace.parentFvg.createdAt,
        proofTime: trace.proofTime,
        entry: trace.entry,
        stop: trace.stop,
        target1: trace.target1,
        target2: trace.target2,
        outcome: trace.outcome,
        oneMesPnl: trace.oneMesPnl,
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
