import dotenv from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { getNinjaHistoricalBars, type NinjaBridgeBar, type NinjaBridgeTimeframe } from '../../src/lib/ninjaTraderBridge';
import { parseBridgeTime } from '../../src/lib/localScannerEngine';
import { TRADE_RULES } from '../../src/config/tradeRules';
import { fetchCachedMarketBars, loadMarketDataConfig, type MarketBarTimeframe } from './market-data-store';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

type Direction = 'LONG' | 'SHORT';
type TimeframeKey = '5m' | '15m' | '60m' | '120m' | '240m';
type AuditMode = 'broad' | 'v2' | 'v3' | 'v4' | 'v5' | 'v6';

const REPORT_DIR = resolve('tools/automation/replay-diagnostics');
const TIMEFRAMES: Array<{ bridge: NinjaBridgeTimeframe; market: MarketBarTimeframe; key: TimeframeKey }> = [
  { bridge: '5m', market: '5m', key: '5m' },
  { bridge: '15m', market: '15m', key: '15m' },
  { bridge: '60m', market: '60m', key: '60m' },
  { bridge: '120m', market: '120m', key: '120m' },
  { bridge: '240m', market: '240m', key: '240m' },
];

interface LoadedTimeframe {
  timeframe: TimeframeKey;
  bars: NinjaBridgeBar[];
  cacheBars: number;
  bridgeBars: number;
  bridgeRequests: number;
  bridgeFailures: string[];
  rangeStart: string | null;
  rangeEnd: string | null;
  source: string;
}

interface SwingPoint {
  type: 'high' | 'low';
  index: number;
  price: number;
  timestamp: string;
}

interface TradeCandidate {
  tradeDate: string;
  timestamp: string;
  session: 'morning' | 'lunch';
  direction: Direction;
  triggerType: 'close_through_mss_line';
  lineInSand: number;
  lineReason: string;
  htfStory: string;
  htfSupport: string[];
  htfCaution: string[];
  managementNotes: string[];
  evidenceTags: string[];
  catalystScore: number;
  catalystScoreBreakdown: string[];
  entry: number;
  stop: number;
  riskPoints: number;
  target1: number;
  target2: number;
  outcome: {
    firstHit: 'T1' | 'T2' | 'STOP' | 'NONE' | 'AMBIGUOUS';
    exitPrice: number | null;
    points: number | null;
    mesProfitLossDollars: number | null;
    maxFavorablePoints: number;
    maxAdversePoints: number;
  };
  structure: {
    priorSwingHigh: number | null;
    priorSwingLow: number | null;
    stopSwing: number;
    mssClose: number;
  };
}

function argValue(name: string): string | null {
  const prefix = `--${name}=`;
  const directIndex = process.argv.indexOf(`--${name}`);
  if (directIndex >= 0 && process.argv[directIndex + 1]) return process.argv[directIndex + 1];
  const matched = process.argv.find((arg) => arg.startsWith(prefix));
  return matched ? matched.slice(prefix.length) : null;
}

function normalizeTime(value: string): string {
  return String(value || '').trim().replace(/\.\d+/, '').replace(/(?:Z|[+-]\d{2}:\d{2})$/, '').slice(0, 19);
}

function timestampMs(value: string): number {
  return parseBridgeTime(value, 'eastern')?.getTime() ?? Number.NaN;
}

function dateOnly(value: string): string {
  return normalizeTime(value).slice(0, 10);
}

function minutesEt(value: string): number | null {
  const match = normalizeTime(value).match(/T(\d{2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function addDays(dateText: string, days: number): string {
  const date = new Date(`${dateText}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function validBar(bar: NinjaBridgeBar): boolean {
  return Boolean(
    bar &&
    typeof bar.time === 'string' &&
    Number.isFinite(bar.open) &&
    Number.isFinite(bar.high) &&
    Number.isFinite(bar.low) &&
    Number.isFinite(bar.close) &&
    bar.high >= Math.max(bar.open, bar.close) &&
    bar.low <= Math.min(bar.open, bar.close),
  );
}

function mergeBars(...sources: NinjaBridgeBar[][]): NinjaBridgeBar[] {
  const byTime = new Map<string, NinjaBridgeBar>();
  for (const source of sources) {
    for (const bar of source) {
      if (validBar(bar)) byTime.set(normalizeTime(bar.time), { ...bar, time: normalizeTime(bar.time) });
    }
  }
  return [...byTime.values()].sort((a, b) => timestampMs(a.time) - timestampMs(b.time));
}

function roundToTick(price: number): number {
  return Math.round(price / TRADE_RULES.targetModel.tickSize) * TRADE_RULES.targetModel.tickSize;
}

function isActiveScanTime(value: string): boolean {
  const minutes = minutesEt(value);
  if (minutes === null) return false;
  return (minutes >= 10 * 60 && minutes < 12 * 60) || (minutes >= 12 * 60 && minutes < 15 * 60 + 30);
}

function sessionFor(value: string): 'morning' | 'lunch' {
  return (minutesEt(value) ?? 0) < 12 * 60 ? 'morning' : 'lunch';
}

async function fetchBridgeRange(args: {
  bridgeUrl: string;
  bridgeInstrument: string;
  timeframe: NinjaBridgeTimeframe;
  fromDate: string;
  toDate: string;
}): Promise<{ bars: NinjaBridgeBar[]; requests: number; failures: string[] }> {
  const from = `${args.fromDate}T00:00:00-04:00`;
  const to = `${args.toDate}T16:00:00-04:00`;
  try {
    const response = await Promise.race([
      getNinjaHistoricalBars({
        instrument: args.bridgeInstrument,
        timeframe: args.timeframe,
        from,
        to,
        limit: 30000,
        baseUrl: args.bridgeUrl,
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('bridge historical-bars range request timed out after 30000ms')), 30_000);
      }),
    ]);
    if (response.ok && Array.isArray(response.bars)) {
      return { bars: mergeBars(response.bars), requests: 1, failures: [] };
    }
    return { bars: [], requests: 1, failures: [`${args.timeframe}: ${response.error || 'bridge returned not ok'}`] };
  } catch (error) {
    return { bars: [], requests: 1, failures: [`${args.timeframe}: ${error instanceof Error ? error.message : String(error)}`] };
  }
}

async function loadTimeframe(args: {
  bridgeUrl: string;
  instrument: string;
  bridgeInstrument: string;
  timeframe: { bridge: NinjaBridgeTimeframe; market: MarketBarTimeframe; key: TimeframeKey };
  fromDate: string;
  toDate: string;
  skipBridge: boolean;
  skipCache: boolean;
}): Promise<LoadedTimeframe> {
  const from = `${args.fromDate}T00:00:00-04:00`;
  const to = `${args.toDate}T16:00:00-04:00`;
  const config = loadMarketDataConfig();
  const cached = !args.skipCache && config
    ? await fetchCachedMarketBars({
      instrument: args.bridgeInstrument,
      timeframe: args.timeframe.market,
      from,
      to,
      config,
      limit: 30000,
    }).catch(() => [])
    : [];
  const bridge = args.skipBridge
    ? { bars: [] as NinjaBridgeBar[], requests: 0, failures: [] as string[] }
    : await fetchBridgeRange({
      bridgeUrl: args.bridgeUrl,
      bridgeInstrument: args.bridgeInstrument,
      timeframe: args.timeframe.bridge,
      fromDate: args.fromDate,
      toDate: args.toDate,
    });
  const bars = mergeBars(cached, bridge.bars);
  return {
    timeframe: args.timeframe.key,
    bars,
    cacheBars: cached.length,
    bridgeBars: bridge.bars.length,
    bridgeRequests: bridge.requests,
    bridgeFailures: bridge.failures,
    rangeStart: bars[0]?.time || null,
    rangeEnd: bars[bars.length - 1]?.time || null,
    source: cached.length && bridge.bars.length ? 'market_bars_plus_bridge_repair' : bridge.bars.length ? 'ninjatrader_bridge' : cached.length ? 'market_bars' : 'missing',
  };
}

function confirmedSwings(bars: NinjaBridgeBar[], strength = 1): SwingPoint[] {
  const swings: SwingPoint[] = [];
  for (let index = strength; index < bars.length - strength; index += 1) {
    const bar = bars[index];
    const left = bars.slice(index - strength, index);
    const right = bars.slice(index + 1, index + strength + 1);
    if (left.every((item) => bar.high > item.high) && right.every((item) => bar.high > item.high)) {
      swings.push({ type: 'high', index, price: bar.high, timestamp: bar.time });
    }
    if (left.every((item) => bar.low < item.low) && right.every((item) => bar.low < item.low)) {
      swings.push({ type: 'low', index, price: bar.low, timestamp: bar.time });
    }
  }
  return swings;
}

function lastSwingBefore(swings: SwingPoint[], index: number, type: SwingPoint['type']): SwingPoint | null {
  let found: SwingPoint | null = null;
  for (const swing of swings) {
    if (swing.index >= index) break;
    if (swing.type === type) found = swing;
  }
  return found;
}

function priorTrend(swings: SwingPoint[], index: number): 'bullish' | 'bearish' | 'unknown' {
  const highs = swings.filter((swing) => swing.type === 'high' && swing.index < index).slice(-2);
  const lows = swings.filter((swing) => swing.type === 'low' && swing.index < index).slice(-2);
  const risingHighs = highs.length === 2 && highs[1].price > highs[0].price;
  const risingLows = lows.length === 2 && lows[1].price > lows[0].price;
  const fallingHighs = highs.length === 2 && highs[1].price < highs[0].price;
  const fallingLows = lows.length === 2 && lows[1].price < lows[0].price;
  if (risingHighs && risingLows) return 'bullish';
  if (fallingHighs && fallingLows) return 'bearish';
  return 'unknown';
}

function latestHtfStory(args: {
  timestamp: string;
  direction: Direction;
  bars15m: NinjaBridgeBar[];
  bars60m: NinjaBridgeBar[];
  bars120m: NinjaBridgeBar[];
  bars240m: NinjaBridgeBar[];
}): { story: string; support: string[]; caution: string[] } {
  const support: string[] = [];
  const caution: string[] = [];
  for (const [label, bars] of [
    ['15M', args.bars15m],
    ['60M', args.bars60m],
    ['120M', args.bars120m],
    ['240M', args.bars240m],
  ] as const) {
    const prior = bars.filter((bar) => timestampMs(bar.time) <= timestampMs(args.timestamp));
    const last = prior[prior.length - 1];
    const prev = prior[prior.length - 2];
    if (!last || !prev) continue;
    const bearish = last.close < last.open && last.close < prev.low;
    const bullish = last.close > last.open && last.close > prev.high;
    if ((args.direction === 'SHORT' && bearish) || (args.direction === 'LONG' && bullish)) {
      support.push(`${label} displacement/close-through supports ${args.direction}.`);
    } else if ((args.direction === 'SHORT' && bullish) || (args.direction === 'LONG' && bearish)) {
      caution.push(`${label} recent displacement opposes ${args.direction}.`);
    }
  }
  return {
    story: support.length
      ? support.join(' ')
      : 'No decisive HTF displacement support found at this timestamp; 5M close-through remains the execution observation.',
    support,
    caution,
  };
}

function findMssCloseThroughCandidates(args: {
  bars5m: NinjaBridgeBar[];
  bars15m: NinjaBridgeBar[];
  bars60m: NinjaBridgeBar[];
  bars120m: NinjaBridgeBar[];
  bars240m: NinjaBridgeBar[];
  fromDate: string;
  toDate: string;
  mode: AuditMode;
}): TradeCandidate[] {
  const bars = args.bars5m;
  const swings = confirmedSwings(bars, 1);
  const candidates: TradeCandidate[] = [];
  const usedCampaigns = new Set<string>();
  for (let index = 10; index < bars.length; index += 1) {
    const bar = bars[index];
    const tradeDate = dateOnly(bar.time);
    if (tradeDate < args.fromDate || tradeDate > args.toDate || !isActiveScanTime(bar.time)) continue;

    const priorLow = lastSwingBefore(swings, index, 'low');
    const priorHigh = lastSwingBefore(swings, index, 'high');
    const trend = priorTrend(swings, index);
    const shortBreak = priorLow && bar.close < priorLow.price && trend !== 'bearish';
    const longBreak = priorHigh && bar.close > priorHigh.price && trend !== 'bullish';
    const direction: Direction | null = shortBreak ? 'SHORT' : longBreak ? 'LONG' : null;
    if (!direction) continue;

    const stopSwing = direction === 'SHORT' ? priorHigh : priorLow;
    if (!stopSwing) continue;

    const campaignKey = `${tradeDate}:${sessionFor(bar.time)}:${direction}`;
    if (usedCampaigns.has(campaignKey)) continue;

    const entry = roundToTick(bar.close);
    const stop = roundToTick(direction === 'SHORT' ? stopSwing.price + TRADE_RULES.targetModel.tickSize : stopSwing.price - TRADE_RULES.targetModel.tickSize);
    const riskPoints = roundToTick(Math.abs(entry - stop));
    if (riskPoints <= 0) continue;
    const target1 = roundToTick(direction === 'SHORT' ? entry - riskPoints * 1.5 : entry + riskPoints * 1.5);
    const target2 = roundToTick(direction === 'SHORT' ? entry - riskPoints * 2 : entry + riskPoints * 2);
    const laterBars = bars.filter((candidateBar) => dateOnly(candidateBar.time) === tradeDate && timestampMs(candidateBar.time) > timestampMs(bar.time));
    const outcome = outcomeFromLaterBars(direction, laterBars, entry, stop, target1, target2);
    const htf = latestHtfStory({
      timestamp: bar.time,
      direction,
      bars15m: args.bars15m,
      bars60m: args.bars60m,
      bars120m: args.bars120m,
      bars240m: args.bars240m,
    });
    const line = roundToTick(direction === 'SHORT' ? priorLow.price : priorHigh.price);
    const failedAuctionTags = failedAuctionEvidence({
      direction,
      timestamp: bar.time,
      bars5m: bars,
      bars60m: args.bars60m,
      bars120m: args.bars120m,
      bars240m: args.bars240m,
      requireConfirmedHtfSwing: args.mode === 'v6',
    });
    const displacementTags = [
      ...htf.support.filter((item) => item.startsWith('15M')).map(() => '15M_DISPLACEMENT_PLUS_5M_CLOSE_THROUGH'),
      ...htf.support.filter((item) => !item.startsWith('15M')).map((item) => `${item.slice(0, item.indexOf(' '))}_DISPLACEMENT_PLUS_5M_CLOSE_THROUGH`),
    ];
    const obstacleTags = htfObstacleManagementEvidence({
      direction,
      timestamp: bar.time,
      entry,
      target1,
      lineInSand: line,
      bars15m: args.bars15m,
      bars60m: args.bars60m,
      bars120m: args.bars120m,
      bars240m: args.bars240m,
    });
    const evidenceTags = [...failedAuctionTags, ...displacementTags, ...obstacleTags];
    const catalystScore = scorePrimaryCatalysts(evidenceTags, line);
    const managementNotes = [
      ...(htf.caution.length
        ? ['HTF caution/obstacle context present: do not erase the trade; use the named line and first app target for management.']
        : []),
      ...(obstacleTags.length ? [`HTF obstacle/management evidence: ${obstacleTags.join(', ')}.`] : []),
      'No risk cap applied in research output; trader decides whether risk is acceptable.',
    ];
    if (args.mode === 'v2' && htf.support.length === 0) continue;
    if (args.mode === 'v3' && evidenceTags.length === 0) continue;
    if (args.mode === 'v4' && !evidenceTags.some(isPrimaryCampaignCatalystTag)) continue;
    if ((args.mode === 'v5' || args.mode === 'v6') && catalystScore.score < 2) continue;

    usedCampaigns.add(campaignKey);
    candidates.push({
      tradeDate,
      timestamp: bar.time,
      session: sessionFor(bar.time),
      direction,
      triggerType: 'close_through_mss_line',
      lineInSand: line,
      lineReason: direction === 'SHORT'
        ? 'Completed 5M close below prior protected swing low.'
        : 'Completed 5M close above prior protected swing high.',
      htfStory: htf.story,
      htfSupport: htf.support,
      htfCaution: htf.caution,
      managementNotes,
      evidenceTags,
      catalystScore: catalystScore.score,
      catalystScoreBreakdown: catalystScore.breakdown,
      entry,
      stop,
      riskPoints,
      target1,
      target2,
      outcome,
      structure: {
        priorSwingHigh: priorHigh?.price ?? null,
        priorSwingLow: priorLow?.price ?? null,
        stopSwing: stopSwing.price,
        mssClose: bar.close,
      },
    });
  }
  return candidates;
}

function isPrimaryCampaignCatalystTag(tag: string): boolean {
  return tag.startsWith('HTF_FAILED_AUCTION_') || tag.includes('_DISPLACEMENT_PLUS_5M_CLOSE_THROUGH');
}

function priceFromTag(tag: string): number | null {
  const match = tag.match(/_(\d+\.\d{2})$/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function scorePrimaryCatalysts(tags: string[], lineInSand: number): { score: number; breakdown: string[] } {
  let score = 0;
  const breakdown: string[] = [];
  const seen = new Set<string>();
  const add = (key: string, points: number, reason: string) => {
    if (seen.has(key)) return;
    seen.add(key);
    score += points;
    breakdown.push(`${reason} +${points}`);
  };
  for (const tag of tags) {
    if (tag.startsWith('HTF_FAILED_AUCTION_240M_')) add('failed_auction_240m', 2, '240M failed auction');
    else if (tag.startsWith('HTF_FAILED_AUCTION_120M_')) add('failed_auction_120m', 1, '120M failed auction');
    else if (tag.startsWith('HTF_FAILED_AUCTION_60M_')) add('failed_auction_60m', 0.5, '60M failed auction');

    if (tag.startsWith('15M_DISPLACEMENT_PLUS_5M_CLOSE_THROUGH')) add('displacement_15m', 1, '15M displacement');
    else if (tag.startsWith('60M_DISPLACEMENT_PLUS_5M_CLOSE_THROUGH')) add('displacement_60m', 1, '60M displacement');
    else if (tag.startsWith('120M_DISPLACEMENT_PLUS_5M_CLOSE_THROUGH')) add('displacement_120m', 2, '120M displacement');
    else if (tag.startsWith('240M_DISPLACEMENT_PLUS_5M_CLOSE_THROUGH')) add('displacement_240m', 2, '240M displacement');

    if (tag.startsWith('HTF_FAILED_AUCTION_')) {
      const price = priceFromTag(tag);
      if (price !== null && Math.abs(price - lineInSand) <= TRADE_RULES.targetModel.tickSize) {
        add('failed_auction_equals_line', 1, 'Failed-auction line equals 5M close-through line');
      }
    }
  }
  return { score, breakdown };
}

function previousHtfBars(args: { timestamp: string; bars: NinjaBridgeBar[] }): NinjaBridgeBar[] {
  return args.bars
    .filter((bar) => timestampMs(bar.time) < timestampMs(args.timestamp))
    .slice(-3);
}

function isConfirmedHtfSwingLevel(args: {
  bars: NinjaBridgeBar[];
  timestamp: string;
  levelTimestamp: string;
  type: 'high' | 'low';
}): boolean {
  const priorBars = args.bars.filter((bar) => timestampMs(bar.time) < timestampMs(args.timestamp));
  const index = priorBars.findIndex((bar) => normalizeTime(bar.time) === normalizeTime(args.levelTimestamp));
  if (index < 1 || index > priorBars.length - 2) return false;
  const bar = priorBars[index];
  const prev = priorBars[index - 1];
  const next = priorBars[index + 1];
  return args.type === 'high'
    ? bar.high > prev.high && bar.high > next.high
    : bar.low < prev.low && bar.low < next.low;
}

function failedAuctionEvidence(args: {
  direction: Direction;
  timestamp: string;
  bars5m: NinjaBridgeBar[];
  bars60m: NinjaBridgeBar[];
  bars120m: NinjaBridgeBar[];
  bars240m: NinjaBridgeBar[];
  requireConfirmedHtfSwing?: boolean;
}): string[] {
  const currentIndex = args.bars5m.findIndex((bar) => normalizeTime(bar.time) === normalizeTime(args.timestamp));
  if (currentIndex < 0) return [];
  const recent5m = args.bars5m.slice(Math.max(0, currentIndex - 12), currentIndex + 1);
  const tags: string[] = [];
  for (const [label, bars] of [
    ['60M', args.bars60m],
    ['120M', args.bars120m],
    ['240M', args.bars240m],
  ] as const) {
    for (const htfBar of previousHtfBars({ timestamp: args.timestamp, bars })) {
      if (args.direction === 'SHORT') {
        const swept = recent5m.some((bar) => bar.high > htfBar.high);
        const rejected = recent5m[recent5m.length - 1]?.close < htfBar.high;
        const meaningful = !args.requireConfirmedHtfSwing || isConfirmedHtfSwingLevel({
          bars,
          timestamp: args.timestamp,
          levelTimestamp: htfBar.time,
          type: 'high',
        });
        if (swept && rejected && meaningful) {
          tags.push(`HTF_FAILED_AUCTION_${label}_HIGH_${roundToTick(htfBar.high).toFixed(2)}`);
          break;
        }
      } else {
        const swept = recent5m.some((bar) => bar.low < htfBar.low);
        const reclaimed = recent5m[recent5m.length - 1]?.close > htfBar.low;
        const meaningful = !args.requireConfirmedHtfSwing || isConfirmedHtfSwingLevel({
          bars,
          timestamp: args.timestamp,
          levelTimestamp: htfBar.time,
          type: 'low',
        });
        if (swept && reclaimed && meaningful) {
          tags.push(`HTF_FAILED_AUCTION_${label}_LOW_${roundToTick(htfBar.low).toFixed(2)}`);
          break;
        }
      }
    }
  }
  return tags;
}

function htfObstacleManagementEvidence(args: {
  direction: Direction;
  timestamp: string;
  entry: number;
  target1: number;
  lineInSand: number;
  bars15m: NinjaBridgeBar[];
  bars60m: NinjaBridgeBar[];
  bars120m: NinjaBridgeBar[];
  bars240m: NinjaBridgeBar[];
}): string[] {
  const tags: string[] = [];
  for (const [label, bars] of [
    ['15M', args.bars15m],
    ['60M', args.bars60m],
    ['120M', args.bars120m],
    ['240M', args.bars240m],
  ] as const) {
    const prior = previousHtfBars({ timestamp: args.timestamp, bars });
    const levels = prior.flatMap((bar) => [
      { name: 'open', price: bar.open },
      { name: 'high', price: bar.high },
      { name: 'low', price: bar.low },
      { name: 'close', price: bar.close },
    ]);
    for (const level of levels) {
      const price = roundToTick(level.price);
      const betweenEntryAndT1 = args.direction === 'SHORT'
        ? price <= args.entry && price >= args.target1
        : price >= args.entry && price <= args.target1;
      const acceptedThroughLine = Math.abs(price - args.lineInSand) <= 2 * TRADE_RULES.targetModel.tickSize &&
        (args.direction === 'SHORT' ? args.entry < price : args.entry > price);
      if (betweenEntryAndT1 || acceptedThroughLine) {
        tags.push(`HTF_OBSTACLE_${label}_${level.name.toUpperCase()}_${price.toFixed(2)}_${betweenEntryAndT1 ? 'USED_AS_T1_MANAGEMENT' : 'ACCEPTED_THROUGH'}`);
        break;
      }
    }
  }
  return tags;
}

function outcomeFromLaterBars(
  direction: Direction,
  laterBars: NinjaBridgeBar[],
  entry: number,
  stop: number,
  target1: number,
  target2: number,
): TradeCandidate['outcome'] {
  let firstHit: TradeCandidate['outcome']['firstHit'] = 'NONE';
  let exitPrice: number | null = laterBars[laterBars.length - 1]?.close ?? null;
  let maxFavorablePoints = 0;
  let maxAdversePoints = 0;
  for (const bar of laterBars) {
    const favorable = direction === 'SHORT' ? entry - bar.low : bar.high - entry;
    const adverse = direction === 'SHORT' ? bar.high - entry : entry - bar.low;
    maxFavorablePoints = Math.max(maxFavorablePoints, favorable);
    maxAdversePoints = Math.max(maxAdversePoints, adverse);
    const stopHit = direction === 'SHORT' ? bar.high >= stop : bar.low <= stop;
    const t1Hit = direction === 'SHORT' ? bar.low <= target1 : bar.high >= target1;
    const t2Hit = direction === 'SHORT' ? bar.low <= target2 : bar.high >= target2;
    if (stopHit && (t1Hit || t2Hit)) {
      firstHit = 'AMBIGUOUS';
      exitPrice = null;
      break;
    }
    if (stopHit) {
      firstHit = 'STOP';
      exitPrice = stop;
      break;
    }
    if (t2Hit) {
      firstHit = 'T2';
      exitPrice = target2;
      break;
    }
    if (t1Hit) {
      firstHit = 'T1';
      exitPrice = target1;
      break;
    }
  }
  const points = exitPrice === null ? null : direction === 'SHORT' ? entry - exitPrice : exitPrice - entry;
  return {
    firstHit,
    exitPrice,
    points: points === null ? null : roundToTick(points),
    mesProfitLossDollars: points === null ? null : Math.round(points * 5 * 100) / 100,
    maxFavorablePoints: roundToTick(maxFavorablePoints),
    maxAdversePoints: roundToTick(maxAdversePoints),
  };
}

function markdownReport(report: any): string {
  const candidates = report.candidates as TradeCandidate[];
  const daily = report.dailySummary as any[];
  return [
    '# Active Campaign Close-Through Audit',
    '',
    `Instrument: ${report.instrument} (${report.bridgeInstrument})`,
    `Range: ${report.fromDate} through ${report.toDate}`,
    `Mode: ${report.mode}`,
    report.mode === 'v2'
      ? 'Pattern: ActiveCampaign Close-Through v2. One trade per campaign, directional 15M/HTF displacement support required, completed 5M MSS close-through, named line in the sand, no risk cap.'
      : report.mode === 'v3'
      ? 'Pattern: ActiveCampaign Close-Through v3. One trade per campaign, completed 5M MSS close-through, named line in the sand, and at least one explicit evidence layer: HTF failed auction, 15M displacement, HTF displacement, or HTF obstacle accepted/used for management. No risk cap.'
      : report.mode === 'v4'
      ? 'Pattern: ActiveCampaign Close-Through v4. One trade per campaign, completed 5M MSS close-through, named line in the sand, and at least one primary campaign catalyst: HTF failed auction, 15M displacement, or 60M/120M/240M displacement. HTF obstacle is management only. No risk cap.'
      : report.mode === 'v5'
      ? 'Pattern: ActiveCampaign Close-Through v5. One trade per campaign, completed 5M MSS close-through, named line in the sand, no risk cap, and primary catalyst score >= 2. HTF obstacle is management only.'
      : report.mode === 'v6'
      ? 'Pattern: ActiveCampaign Close-Through v6. One trade per campaign, completed 5M MSS close-through, named line in the sand, no risk cap, primary catalyst score >= 2, and failed-auction catalyst credit only when the swept HTF high/low is a confirmed HTF swing level. HTF obstacle is management only.'
      : 'Pattern: one trade per date/session/direction after completed 5M MSS close-through line.',
    'Authority: research-only; no scanner rules, Discord behavior, bridge behavior, or canExecute changed.',
    '',
    '## Summary',
    '',
    `- Trades: ${report.summary.trades}`,
    `- Longs: ${report.summary.longs}`,
    `- Shorts: ${report.summary.shorts}`,
    `- T1: ${report.summary.t1}`,
    `- T2: ${report.summary.t2}`,
    `- Stops: ${report.summary.stop}`,
    `- None by close: ${report.summary.none}`,
    `- Ambiguous: ${report.summary.ambiguous}`,
    `- Gross one MES P/L excluding ambiguous: $${report.summary.grossMesProfitLossExAmbiguous.toFixed(2)}`,
    `- Broad candidates excluded by mode: ${report.summary.excludedByMode}`,
    '',
    '## Daily P/L',
    '',
    '| Date | Trades | T1 | T2 | Stop | None | Ambiguous | One MES P/L |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...(daily.length ? daily.map((day) => `| ${day.tradeDate} | ${day.trades} | ${day.t1} | ${day.t2} | ${day.stop} | ${day.none} | ${day.ambiguous} | $${day.pnl.toFixed(2)} |`) : ['| N/A | 0 | 0 | 0 | 0 | 0 | 0 | $0.00 |']),
    '',
    '## Trade Breakdown',
    '',
    '| # | Date | Time ET | Session | Dir | Line | Entry | Stop | Risk | T1 | T2 | Score | Outcome | 1 MES P/L | Evidence / HTF Read / Management |',
    '| ---: | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | --- |',
    ...(candidates.length ? candidates.map((trade, index) => [
      `| ${index + 1}`,
      trade.tradeDate,
      normalizeTime(trade.timestamp).slice(11, 16),
      trade.session,
      trade.direction,
      trade.lineInSand.toFixed(2),
      trade.entry.toFixed(2),
      trade.stop.toFixed(2),
      trade.riskPoints.toFixed(2),
      trade.target1.toFixed(2),
      trade.target2.toFixed(2),
      (trade.catalystScore ?? 0).toFixed(1),
      trade.outcome.firstHit,
      trade.outcome.mesProfitLossDollars === null ? 'N/A' : `$${trade.outcome.mesProfitLossDollars.toFixed(2)}`,
      `${trade.catalystScoreBreakdown?.length ? `Catalyst: ${trade.catalystScoreBreakdown.join(', ')}. ` : ''}${trade.evidenceTags?.length ? `Evidence: ${trade.evidenceTags.join(', ')}. ` : ''}${trade.htfSupport.length ? trade.htfSupport.join(' ') : '5M execution only'}${trade.htfCaution.length ? ` Caution: ${trade.htfCaution.join(' ')}` : ''}${trade.managementNotes?.length ? ` Management: ${trade.managementNotes.join(' ')}` : ''}`.replace(/\|/g, '/'),
      '|',
    ].join(' | ')) : ['| N/A | N/A | N/A | N/A | N/A | 0 | 0 | 0 | 0 | 0 | 0 | NONE | $0.00 | N/A |']),
    '',
    '## Notes',
    '',
    '- This audit deliberately uses one trade per campaign/date/session/direction to avoid counting every continuation candle as a separate trade.',
    '- V2 requires directional 15M or HTF displacement support. Failed-auction support is not separately reconstructed in this quick runner unless it appears as directional displacement support in OHLC.',
    '- V3 explicitly reconstructs simple OHLC failed-auction evidence against recent 60M/120M/240M highs/lows and HTF obstacle/management levels from recent 15M/60M/120M/240M OHLC.',
    '- V4 does not allow HTF obstacle/management evidence to qualify a trade by itself; it must have failed-auction or displacement campaign evidence.',
    '- V5 requires primary catalyst score >= 2: 240M failed auction +2, 120M failed auction +1, 60M failed auction +0.5, 15M displacement +1, 60M displacement +1, 120M displacement +2, 240M displacement +2, failed-auction line equals 5M close-through line +1. HTF obstacle is management only.',
    '- V6 keeps V5 scoring but only credits failed-auction catalysts when the failed HTF high/low is a confirmed HTF swing level in that timeframe.',
    '- Entry is the completed 5M close-through close, rounded to tick.',
    '- Stop is the opposite protected 5M swing plus one tick.',
    '- T1/T2 are 1.5R and 2.0R from actual entry/stop risk.',
    '- Ambiguous means a single later candle touched stop and target; intrabar order is unknowable from 5M OHLC.',
  ].join('\n');
}

async function main() {
  const instrument = argValue('instrument') || 'MES';
  const bridgeInstrument = argValue('bridge-instrument') || 'MES 06-26';
  const bridgeUrl = argValue('bridge-url') || process.env.NINJATRADER_BRIDGE_URL || 'http://127.0.0.1:8765';
  const toDate = argValue('to-date') || new Date().toISOString().slice(0, 10);
  const fromDate = argValue('from-date') || addDays(toDate, -30);
  const skipBridge = process.argv.includes('--skip-bridge');
  const skipCache = process.argv.includes('--skip-cache');
  const modeArg = argValue('mode');
  const mode: AuditMode = modeArg === 'v6' ? 'v6' : modeArg === 'v5' ? 'v5' : modeArg === 'v4' ? 'v4' : modeArg === 'v3' ? 'v3' : modeArg === 'v2' ? 'v2' : 'broad';
  const suffix = mode;
  const outJson = argValue('out-json') || join(REPORT_DIR, `active-campaign-close-through-audit-${suffix}-${fromDate}-to-${toDate}.json`);
  const outMd = argValue('out-md') || join(REPORT_DIR, `active-campaign-close-through-audit-${suffix}-${fromDate}-to-${toDate}.md`);
  mkdirSync(REPORT_DIR, { recursive: true });

  const loaded = await Promise.all(TIMEFRAMES.map((timeframe) => loadTimeframe({
    bridgeUrl,
    instrument,
    bridgeInstrument,
    timeframe,
    fromDate,
    toDate,
    skipBridge,
    skipCache,
  })));
  const bars = Object.fromEntries(loaded.map((entry) => [entry.timeframe, entry.bars])) as Record<TimeframeKey, NinjaBridgeBar[]>;
  const broadCandidates = findMssCloseThroughCandidates({
    bars5m: bars['5m'] || [],
    bars15m: bars['15m'] || [],
    bars60m: bars['60m'] || [],
    bars120m: bars['120m'] || [],
    bars240m: bars['240m'] || [],
    fromDate,
    toDate,
    mode: 'broad',
  });
  const candidates = mode === 'v2' || mode === 'v3' || mode === 'v4' || mode === 'v5' || mode === 'v6'
    ? findMssCloseThroughCandidates({
      bars5m: bars['5m'] || [],
      bars15m: bars['15m'] || [],
      bars60m: bars['60m'] || [],
      bars120m: bars['120m'] || [],
      bars240m: bars['240m'] || [],
      fromDate,
      toDate,
      mode,
    })
    : broadCandidates;
  const dailySummary = [...new Set(candidates.map((candidate) => candidate.tradeDate))].sort().map((tradeDate) => {
    const dayTrades = candidates.filter((candidate) => candidate.tradeDate === tradeDate);
    const nonAmbiguous = dayTrades.filter((trade) => trade.outcome.firstHit !== 'AMBIGUOUS');
    return {
      tradeDate,
      trades: dayTrades.length,
      t1: dayTrades.filter((trade) => trade.outcome.firstHit === 'T1').length,
      t2: dayTrades.filter((trade) => trade.outcome.firstHit === 'T2').length,
      stop: dayTrades.filter((trade) => trade.outcome.firstHit === 'STOP').length,
      none: dayTrades.filter((trade) => trade.outcome.firstHit === 'NONE').length,
      ambiguous: dayTrades.filter((trade) => trade.outcome.firstHit === 'AMBIGUOUS').length,
      pnl: nonAmbiguous.reduce((sum, trade) => sum + (trade.outcome.mesProfitLossDollars || 0), 0),
    };
  });
  const nonAmbiguous = candidates.filter((trade) => trade.outcome.firstHit !== 'AMBIGUOUS');
  const report = {
    generatedAt: new Date().toISOString(),
    instrument,
    bridgeInstrument,
    fromDate,
    toDate,
    mode,
    dataSources: loaded.map(({ bars: _bars, ...entry }) => ({ ...entry, barsLoaded: _bars.length })),
    summary: {
      trades: candidates.length,
      longs: candidates.filter((trade) => trade.direction === 'LONG').length,
      shorts: candidates.filter((trade) => trade.direction === 'SHORT').length,
      t1: candidates.filter((trade) => trade.outcome.firstHit === 'T1').length,
      t2: candidates.filter((trade) => trade.outcome.firstHit === 'T2').length,
      stop: candidates.filter((trade) => trade.outcome.firstHit === 'STOP').length,
      none: candidates.filter((trade) => trade.outcome.firstHit === 'NONE').length,
      ambiguous: candidates.filter((trade) => trade.outcome.firstHit === 'AMBIGUOUS').length,
      grossMesProfitLossExAmbiguous: nonAmbiguous.reduce((sum, trade) => sum + (trade.outcome.mesProfitLossDollars || 0), 0),
      excludedByMode: broadCandidates.length - candidates.length,
    },
    dailySummary,
    candidates,
  };
  writeFileSync(outJson, JSON.stringify(report, null, 2));
  writeFileSync(outMd, markdownReport(report));
  console.log(JSON.stringify({ outJson, outMd, summary: report.summary }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
