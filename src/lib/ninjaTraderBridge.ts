import type {
  ChartCandleFact,
  ChartContext,
  DisplacementCandleFact,
  FailedBreakEventFact,
  FvgZoneFact,
  LiquidityEventFact,
  MultiTimeframeAlignment,
  MultiTimeframeContext,
  ReadConfidence,
  ReclaimEventFact,
  StructuralLevel,
  TimeframeFactSet,
} from '../types';
import { buildStructuralLevels } from './sessionStructure';
import { buildSessionLevelContext } from './sessionLevelContextEngine';
import { buildSessionStory } from './sessionStoryEngine';
import { buildHtfLiquidityDrawState } from './htfLiquidityDrawEngine';

export type NinjaBridgeTimeframe = '1m' | '5m' | '15m' | '60m' | '240m' | '1h' | '4h';

export interface NinjaBridgeBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface NinjaBridgeHealth {
  ok: boolean;
  name?: string;
  version?: string;
  ninjaTraderVersion?: string;
  readOnly?: boolean;
  defaultInstrument?: string;
  serverTime?: string;
  error?: string;
}

export interface NinjaBridgeBarsResponse {
  ok: boolean;
  instrument: string;
  timeframe: NinjaBridgeTimeframe;
  count: number;
  bars: NinjaBridgeBar[];
  error?: string;
}

export interface NinjaBridgeSnapshot {
  ok: boolean;
  instrument: string;
  last?: NinjaBridgeBar | null;
  currentPrice?: number | null;
  sessionHigh?: number | null;
  sessionLow?: number | null;
  updatedAt?: string;
  error?: string;
}

export interface NinjaBridgePosition {
  instrument: string;
  marketPosition: string;
  quantity: number;
  averagePrice: number;
}

export interface NinjaBridgePositionsResponse {
  ok: boolean;
  account: string;
  positions: NinjaBridgePosition[];
  error?: string;
}

export interface NinjaBridgeLiveContext {
  health: NinjaBridgeHealth | null;
  accounts: string[];
  snapshot: NinjaBridgeSnapshot | null;
  bars5m: NinjaBridgeBar[];
  bars15m: NinjaBridgeBar[];
  bars60m: NinjaBridgeBar[];
  bars240m: NinjaBridgeBar[];
  positions: NinjaBridgePosition[];
  selectedAccount: string;
  selectedInstrument: string;
  connected: boolean;
  updatedAt: string | null;
  error: string | null;
}

const DEFAULT_BRIDGE_URL = 'http://127.0.0.1:8765';

export function describeNinjaBridgeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || 'Unknown bridge error');
  const fromSecureCloudflare =
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    !['localhost', '127.0.0.1'].includes(window.location.hostname);

  if (message.toLowerCase().includes('failed to fetch') && fromSecureCloudflare) {
    return [
      'Cloudflare HTTPS could not access the local NinjaTrader bridge at 127.0.0.1.',
      'Chrome may block public sites from reaching local loopback services.',
      'Use the local dev app or run the local companion server for live NinjaTrader data.',
    ].join(' ');
  }

  return message;
}

function bridgeUrl(path: string, params?: Record<string, string | number | undefined | null>, baseUrl = DEFAULT_BRIDGE_URL): string {
  const url = new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

async function fetchBridgeJson<T>(path: string, params?: Record<string, string | number | undefined | null>, baseUrl = DEFAULT_BRIDGE_URL): Promise<T> {
  const response = await fetch(bridgeUrl(path, params, baseUrl), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || `NinjaTrader bridge request failed (${response.status})`);
  }
  return data as T;
}

export async function getNinjaBridgeHealth(baseUrl = DEFAULT_BRIDGE_URL): Promise<NinjaBridgeHealth> {
  return fetchBridgeJson<NinjaBridgeHealth>('health', undefined, baseUrl);
}

export async function getNinjaBridgeSnapshot(instrument = 'MES 06-26', baseUrl = DEFAULT_BRIDGE_URL): Promise<NinjaBridgeSnapshot> {
  return fetchBridgeJson<NinjaBridgeSnapshot>('snapshot', { instrument }, baseUrl);
}

export async function getNinjaBridgeBars(
  instrument = 'MES 06-26',
  timeframe: NinjaBridgeTimeframe = '5m',
  limit = 100,
  baseUrl = DEFAULT_BRIDGE_URL
): Promise<NinjaBridgeBarsResponse> {
  return fetchBridgeJson<NinjaBridgeBarsResponse>('bars', { instrument, timeframe, limit }, baseUrl);
}

export async function getNinjaHistoricalBars({
  instrument = 'MES 06-26',
  timeframe = '5m',
  from,
  to,
  limit = 2000,
  baseUrl = DEFAULT_BRIDGE_URL,
}: {
  instrument?: string;
  timeframe?: NinjaBridgeTimeframe;
  from: string;
  to: string;
  limit?: number;
  baseUrl?: string;
}): Promise<NinjaBridgeBarsResponse & { source?: string; from?: string; to?: string }> {
  return fetchBridgeJson('historical-bars', { instrument, timeframe, from, to, limit }, baseUrl);
}

export async function getNinjaBridgeAccounts(baseUrl = DEFAULT_BRIDGE_URL): Promise<{ ok: boolean; accounts: string[]; preferred?: string[]; error?: string }> {
  return fetchBridgeJson('accounts', undefined, baseUrl);
}

export async function getNinjaBridgePositions(account = 'Sim101', baseUrl = DEFAULT_BRIDGE_URL): Promise<NinjaBridgePositionsResponse> {
  return fetchBridgeJson<NinjaBridgePositionsResponse>('positions', { account }, baseUrl);
}

function confidenceForBars(bars: NinjaBridgeBar[]): ReadConfidence {
  if (bars.length >= 8) return 'High';
  if (bars.length >= 3) return 'Medium';
  return bars.length > 0 ? 'Low' : 'Unreadable';
}

function candleDirection(bar: NinjaBridgeBar): ChartCandleFact['direction'] {
  if (bar.close > bar.open) return 'bullish';
  if (bar.close < bar.open) return 'bearish';
  return 'doji';
}

function minutesFromIso(value?: string | null): number | null {
  if (!value) return null;
  const match = value.match(/T(\d{2}):(\d{2})/);
  if (match) return Number(match[1]) * 60 + Number(match[2]);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.getHours() * 60 + date.getMinutes();
}

function inMinuteRange(minutes: number | null, start: number, end: number): boolean {
  if (minutes === null) return false;
  if (start <= end) return minutes >= start && minutes <= end;
  return minutes >= start || minutes <= end;
}

function sessionForTimestamp(value?: string | null): DisplacementCandleFact['session'] {
  const minutes = minutesFromIso(value);
  if (inMinuteRange(minutes, 20 * 60, 2 * 60)) return 'asian';
  if (inMinuteRange(minutes, 3 * 60, 8 * 60 + 29)) return 'london';
  if (inMinuteRange(minutes, 8 * 60 + 30, 9 * 60 + 29)) return 'ny_premarket';
  if (inMinuteRange(minutes, 9 * 60 + 30, 11 * 60 + 15)) return 'rth_morning';
  if (inMinuteRange(minutes, 11 * 60 + 50, 13 * 60)) return 'lunch';
  if (inMinuteRange(minutes, 18 * 60, 23 * 60 + 59)) return 'prior_eth';
  return 'current_window';
}

function toCandleFacts(bars: NinjaBridgeBar[], limit = 40): ChartCandleFact[] {
  const recent = bars.slice(-limit);
  const ranges = recent.map(bar => Math.abs(bar.close - bar.open));
  const avgBody = ranges.length ? ranges.reduce((sum, value) => sum + value, 0) / ranges.length : 0;
  return recent.map((bar, index) => {
    const body = Math.abs(bar.close - bar.open);
    const upperWick = bar.high - Math.max(bar.open, bar.close);
    const lowerWick = Math.min(bar.open, bar.close) - bar.low;
    return {
      index,
      timestamp: bar.time,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      direction: candleDirection(bar),
      bodyQuality: avgBody > 0 && body > avgBody * 1.6 ? 'large' : body <= avgBody * 0.55 ? 'small' : 'normal',
      upperWickQuality: upperWick > body ? 'large' : upperWick > 0 ? 'small' : 'none',
      lowerWickQuality: lowerWick > body ? 'large' : lowerWick > 0 ? 'small' : 'none',
      isExpansion: avgBody > 0 && body > avgBody * 1.6,
      isRejection: upperWick > body * 1.2 || lowerWick > body * 1.2,
      isBreather: avgBody > 0 && body < avgBody * 0.65,
      isReclaim: false,
      confidence: 'High',
    };
  });
}

function detectDisplacementCandles(candles: ChartCandleFact[], fvgZones: FvgZoneFact[] = []): DisplacementCandleFact[] {
  const readable = candles.filter(candle =>
    typeof candle.open === 'number' &&
    typeof candle.high === 'number' &&
    typeof candle.low === 'number' &&
    typeof candle.close === 'number'
  );
  const bodies = readable.map(candle => Math.abs((candle.close || 0) - (candle.open || 0)));
  const ranges = readable.map(candle => Math.max((candle.high || 0) - (candle.low || 0), 0));
  const avgBody = bodies.length ? bodies.reduce((sum, body) => sum + body, 0) / bodies.length : 0;
  const avgRange = ranges.length ? ranges.reduce((sum, range) => sum + range, 0) / ranges.length : 0;
  if (!avgBody) return [];

  return readable
    .filter(candle => candle.direction === 'bullish' || candle.direction === 'bearish')
    .map(candle => {
      const body = Math.abs((candle.close || 0) - (candle.open || 0));
      const range = typeof candle.high === 'number' && typeof candle.low === 'number' ? candle.high - candle.low : 0;
      const bodyToRange = range > 0 ? body / range : 0;
      const closeLocation =
        candle.direction === 'bullish' && range > 0 && ((candle.high || 0) - (candle.close || 0)) <= range * 0.25
          ? 'top_quarter'
          : candle.direction === 'bearish' && range > 0 && ((candle.close || 0) - (candle.low || 0)) <= range * 0.25
            ? 'bottom_quarter'
            : range > 0
              ? 'middle'
              : 'unknown';
      const session = sessionForTimestamp(candle.timestamp);
      const prior = readable.slice(0, Math.max(0, candle.index));
      const priorHigh = prior.length ? Math.max(...prior.map(item => item.high || 0)) : null;
      const priorLow = prior.length ? Math.min(...prior.map(item => item.low || Number.POSITIVE_INFINITY)) : null;
      const breaksStructure =
        candle.direction === 'bullish'
          ? typeof priorHigh === 'number' && (candle.high || 0) > priorHigh
          : typeof priorLow === 'number' && (candle.low || 0) < priorLow;
      const leavesImbalance = fvgZones.some(zone => {
        if (typeof zone.upper !== 'number' || typeof zone.lower !== 'number') return false;
        const upper = Math.max(zone.upper, zone.lower);
        const lower = Math.min(zone.upper, zone.lower);
        return lower <= (candle.high || 0) && upper >= (candle.low || 0);
      });
      const nearSessionOpen =
        inMinuteRange(minutesFromIso(candle.timestamp), 20 * 60, 20 * 60 + 30) ||
        inMinuteRange(minutesFromIso(candle.timestamp), 3 * 60, 3 * 60 + 30) ||
        inMinuteRange(minutesFromIso(candle.timestamp), 8 * 60 + 30, 9 * 60) ||
        inMinuteRange(minutesFromIso(candle.timestamp), 9 * 60 + 30, 10 * 60) ||
        inMinuteRange(minutesFromIso(candle.timestamp), 11 * 60 + 50, 12 * 60 + 20);
      const score =
        (body >= avgBody * 1.5 || candle.isExpansion ? 1 : 0) +
        (avgRange > 0 && range >= avgRange * 1.25 ? 1 : 0) +
        (bodyToRange >= 0.6 ? 1 : 0) +
        (closeLocation === 'top_quarter' || closeLocation === 'bottom_quarter' ? 1 : 0) +
        (breaksStructure ? 1 : 0) +
        (leavesImbalance ? 2 : 0) +
        (nearSessionOpen ? 1 : 0);

      return {
        direction: candle.direction === 'bullish' ? 'LONG' : 'SHORT',
        candleIndex: candle.index,
        timestamp: candle.timestamp,
        session,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        bodyPoints: body,
        rangePoints: range,
        bodyToRange: Math.round(bodyToRange * 100) / 100,
        closeLocation,
        displacementScore: score,
        quality: score >= 7 ? 'high_quality' : score >= 5 ? 'confirmed' : 'possible',
        leavesImbalance,
        breaksStructure,
        confidence: score >= 7 ? 'High' : score >= 5 ? 'Medium' : 'Low',
        evidence: [
          `Body ${body.toFixed(2)} vs avg ${avgBody.toFixed(2)}; range ${range.toFixed(2)} vs avg ${avgRange.toFixed(2)}.`,
          `Body/range ${Math.round(bodyToRange * 100)}%; close location ${closeLocation}.`,
          leavesImbalance ? 'Leaves/overlaps FVG imbalance.' : 'No FVG overlap.',
          breaksStructure ? 'Breaks prior structure.' : 'No structure break detected.',
          nearSessionOpen ? `Occurs near ${sessionForTimestamp(candle.timestamp)} timing.` : 'Not near major session open.',
        ].join(' '),
      } as DisplacementCandleFact;
    })
    .filter(candle => (candle.displacementScore || 0) >= 3);
}

const FVG_IMPULSE_BODY_MULTIPLE = 1.25;
const FVG_IMPULSE_RANGE_MULTIPLE = 1.25;

function detectFvgZones(candles: ChartCandleFact[]): FvgZoneFact[] {
  const zones: FvgZoneFact[] = [];
  const readable = candles.filter((candle) =>
    typeof candle.open === 'number' &&
    typeof candle.high === 'number' &&
    typeof candle.low === 'number' &&
    typeof candle.close === 'number'
  );
  const bodies = readable.map((candle) => Math.abs((candle.close as number) - (candle.open as number)));
  const ranges = readable.map((candle) => Math.max((candle.high as number) - (candle.low as number), 0));
  const avgBody = bodies.length ? bodies.reduce((sum, body) => sum + body, 0) / bodies.length : 0;
  const avgRange = ranges.length ? ranges.reduce((sum, range) => sum + range, 0) / ranges.length : 0;

  for (let index = 2; index < candles.length; index += 1) {
    const left = candles[index - 2];
    const middle = candles[index - 1];
    const right = candles[index];
    if (
      typeof left.high !== 'number' ||
      typeof left.low !== 'number' ||
      typeof right.high !== 'number' ||
      typeof right.low !== 'number'
    ) {
      continue;
    }

    const rightBody =
      typeof right.open === 'number' && typeof right.close === 'number'
        ? Math.abs(right.close - right.open)
        : 0;
    const rightRange = Math.max(right.high - right.low, 0);
    const bodyRatio = avgBody > 0 ? rightBody / avgBody : 0;
    const rangeRatio = avgRange > 0 ? rightRange / avgRange : 0;
    const impulseQualified =
      bodyRatio >= FVG_IMPULSE_BODY_MULTIPLE ||
      rangeRatio >= FVG_IMPULSE_RANGE_MULTIPLE ||
      right.isExpansion === true;

    if (!impulseQualified) continue;

    if (left.high < right.low) {
      const lower = left.high;
      const upper = right.low;
      const midpoint = (upper + lower) / 2;
      zones.push({
        direction: 'LONG',
        upper,
        lower,
        midpoint,
        formedAt: right.timestamp || middle.timestamp || null,
        formedCandleIndex: right.index,
        filledPercent: null,
        inverted: false,
        reclaimed: candles.slice(index + 1).some(candle => typeof candle.close === 'number' && candle.close > midpoint),
        reclaimTimestamp: candles.slice(index + 1).find(candle => typeof candle.close === 'number' && candle.close > midpoint)?.timestamp || null,
        impulseQualified,
        impulseBodyRatio: Math.round(bodyRatio * 100) / 100,
        impulseRangeRatio: Math.round(rangeRatio * 100) / 100,
        confidence: bodyRatio >= FVG_IMPULSE_BODY_MULTIPLE && rangeRatio >= FVG_IMPULSE_RANGE_MULTIPLE ? 'High' : 'Medium',
      });
    }

    if (left.low > right.high) {
      const upper = left.low;
      const lower = right.high;
      const midpoint = (upper + lower) / 2;
      zones.push({
        direction: 'SHORT',
        upper,
        lower,
        midpoint,
        formedAt: right.timestamp || middle.timestamp || null,
        formedCandleIndex: right.index,
        filledPercent: null,
        inverted: false,
        reclaimed: candles.slice(index + 1).some(candle => typeof candle.close === 'number' && candle.close < midpoint),
        reclaimTimestamp: candles.slice(index + 1).find(candle => typeof candle.close === 'number' && candle.close < midpoint)?.timestamp || null,
        impulseQualified,
        impulseBodyRatio: Math.round(bodyRatio * 100) / 100,
        impulseRangeRatio: Math.round(rangeRatio * 100) / 100,
        confidence: bodyRatio >= FVG_IMPULSE_BODY_MULTIPLE && rangeRatio >= FVG_IMPULSE_RANGE_MULTIPLE ? 'High' : 'Medium',
      });
    }
  }
  return zones.slice(-8);
}

function detectLiquidityAndReclaims(candles: ChartCandleFact[]): {
  liquiditySweeps: LiquidityEventFact[];
  reclaimEvents: ReclaimEventFact[];
  failedBreakEvents: FailedBreakEventFact[];
} {
  const liquiditySweeps: LiquidityEventFact[] = [];
  const reclaimEvents: ReclaimEventFact[] = [];
  const failedBreakEvents: FailedBreakEventFact[] = [];

  for (let index = 3; index < candles.length; index += 1) {
    const candle = candles[index];
    const lookback = candles.slice(Math.max(0, index - 6), index);
    const priorHigh = Math.max(...lookback.map(item => typeof item.high === 'number' ? item.high : Number.NEGATIVE_INFINITY));
    const priorLow = Math.min(...lookback.map(item => typeof item.low === 'number' ? item.low : Number.POSITIVE_INFINITY));
    if (
      typeof candle.high !== 'number' ||
      typeof candle.low !== 'number' ||
      typeof candle.close !== 'number' ||
      !Number.isFinite(priorHigh) ||
      !Number.isFinite(priorLow)
    ) {
      continue;
    }

    if (candle.low < priorLow && candle.close > priorLow) {
      liquiditySweeps.push({
        type: 'sweep',
        direction: 'LONG',
        level: priorLow,
        sweptLevelLabel: 'Recent swing low',
        reclaimed: true,
        timestamp: candle.timestamp,
        confidence: 'High',
        evidence: 'Candle swept below recent swing low and closed back above it.',
      });
      reclaimEvents.push({
        direction: 'LONG',
        reclaimedLevel: priorLow,
        levelLabel: 'Recent swing low',
        timestamp: candle.timestamp,
        candleIndex: candle.index,
        confidence: 'High',
        evidence: 'Close reclaimed the swept low.',
      });
      failedBreakEvents.push({
        direction: 'LONG',
        failedLevel: priorLow,
        levelLabel: 'Recent swing low',
        sweptExtreme: candle.low,
        timestamp: candle.timestamp,
        candleIndex: candle.index,
        confidence: 'High',
        evidence: 'Failed breakdown below recent swing low.',
      });
    }

    if (candle.high > priorHigh && candle.close < priorHigh) {
      liquiditySweeps.push({
        type: 'sweep',
        direction: 'SHORT',
        level: priorHigh,
        sweptLevelLabel: 'Recent swing high',
        reclaimed: true,
        timestamp: candle.timestamp,
        confidence: 'High',
        evidence: 'Candle swept above recent swing high and closed back below it.',
      });
      reclaimEvents.push({
        direction: 'SHORT',
        reclaimedLevel: priorHigh,
        levelLabel: 'Recent swing high',
        timestamp: candle.timestamp,
        candleIndex: candle.index,
        confidence: 'High',
        evidence: 'Close reclaimed below the swept high.',
      });
      failedBreakEvents.push({
        direction: 'SHORT',
        failedLevel: priorHigh,
        levelLabel: 'Recent swing high',
        sweptExtreme: candle.high,
        timestamp: candle.timestamp,
        candleIndex: candle.index,
        confidence: 'High',
        evidence: 'Failed breakout above recent swing high.',
      });
    }
  }

  return {
    liquiditySweeps: liquiditySweeps.slice(-8),
    reclaimEvents: reclaimEvents.slice(-8),
    failedBreakEvents: failedBreakEvents.slice(-8),
  };
}

function isPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function timeframeTrend(open: number | null, close: number | null): TimeframeFactSet['trend'] {
  if (!isPrice(open) || !isPrice(close)) return 'unknown';
  const delta = close - open;
  if (Math.abs(delta) < 1) return 'balanced';
  return delta > 0 ? 'bullish' : 'bearish';
}

function trendToBias(trend: TimeframeFactSet['trend']): MultiTimeframeAlignment['macroBias'] {
  if (trend === 'bullish') return 'LONG';
  if (trend === 'bearish') return 'SHORT';
  if (trend === 'balanced') return 'NEUTRAL';
  return 'UNKNOWN';
}

function summarizeBars(bars: NinjaBridgeBar[]): Pick<TimeframeFactSet, 'high' | 'low' | 'open' | 'close' | 'midpoint' | 'rangePoints' | 'barCount' | 'trend'> {
  const valid = bars.filter(bar => isPrice(bar.open) && isPrice(bar.high) && isPrice(bar.low) && isPrice(bar.close));
  const high = valid.length ? Math.max(...valid.map(bar => bar.high)) : null;
  const low = valid.length ? Math.min(...valid.map(bar => bar.low)) : null;
  const open = valid[0]?.open ?? null;
  const close = valid[valid.length - 1]?.close ?? null;
  return {
    barCount: valid.length,
    high,
    low,
    open,
    close,
    midpoint: high !== null && low !== null ? Math.round(((high + low) / 2) * 4) / 4 : null,
    rangePoints: high !== null && low !== null ? Math.round((high - low) * 4) / 4 : null,
    trend: timeframeTrend(open, close),
  };
}

function levelsForTimeframe(levels: StructuralLevel[], timeframe: TimeframeFactSet['timeframe']): StructuralLevel[] {
  const tag = timeframe === '4h'
    ? '4h_macro_context'
    : timeframe === '1h'
      ? '1h_session_context'
      : timeframe === '15m'
        ? '15m_liquidity_map'
        : '5m_execution';
  return levels.filter(level =>
    level.contextRuleTags?.includes(tag) ||
    (timeframe === '15m' && !level.contextRuleTags?.some(item => item.includes('4h') || item.includes('1h'))) ||
    (timeframe === '5m' && ['rth_morning', 'lunch', 'current_window'].includes(level.source))
  ).slice(0, 30);
}

function buildTimeframeFactSet({
  timeframe,
  role,
  bars,
  structuralLevels,
}: {
  timeframe: TimeframeFactSet['timeframe'];
  role: TimeframeFactSet['role'];
  bars: NinjaBridgeBar[];
  structuralLevels: StructuralLevel[];
}): TimeframeFactSet {
  const valid = bars.filter(bar => isPrice(bar.open) && isPrice(bar.high) && isPrice(bar.low) && isPrice(bar.close));
  const candles = toCandleFacts(valid, timeframe === '5m' ? 60 : 80);
  const fvgZones = detectFvgZones(candles);
  const liquidityFacts = detectLiquidityAndReclaims(candles);
  const displacementCandles = detectDisplacementCandles(candles, fvgZones);
  const summary = summarizeBars(valid);
  return {
    timeframe,
    role,
    ...summary,
    candles,
    fvgZones,
    liquiditySweeps: liquidityFacts.liquiditySweeps,
    reclaimEvents: liquidityFacts.reclaimEvents,
    failedBreakEvents: liquidityFacts.failedBreakEvents,
    displacementCandles,
    structuralLevels: levelsForTimeframe(structuralLevels, timeframe),
    confidence: confidenceForBars(valid),
    notes: [
      `${timeframe.toUpperCase()} ${role.replace(/_/g, ' ')} imported from NinjaTrader OHLC.`,
      `${valid.length} bars; trend ${summary.trend}; range ${summary.rangePoints ?? 'N/A'} points.`,
      'Facts only. Setup approval, ranking, and execution remain app-owned.',
    ],
  };
}

function buildMultiTimeframeAlignment({
  fourHour,
  oneHour,
  fifteenMinute,
  fiveMinute,
}: {
  fourHour: TimeframeFactSet;
  oneHour: TimeframeFactSet;
  fifteenMinute: TimeframeFactSet;
  fiveMinute: TimeframeFactSet;
}): MultiTimeframeAlignment {
  const macroBias = trendToBias(fourHour.trend);
  const sessionBias = trendToBias(oneHour.trend);
  const liquidityBias = trendToBias(fifteenMinute.trend);
  const executionBias = trendToBias(fiveMinute.trend);
  const directional = [macroBias, sessionBias, liquidityBias, executionBias].filter((bias): bias is 'LONG' | 'SHORT' => bias === 'LONG' || bias === 'SHORT');
  const longCount = directional.filter(bias => bias === 'LONG').length;
  const shortCount = directional.filter(bias => bias === 'SHORT').length;
  const conflicts: string[] = [];
  if (macroBias !== 'UNKNOWN' && executionBias !== 'UNKNOWN' && macroBias !== 'NEUTRAL' && executionBias !== 'NEUTRAL' && macroBias !== executionBias) {
    conflicts.push(`4H macro bias ${macroBias} conflicts with 5M execution bias ${executionBias}.`);
  }
  if (sessionBias !== 'UNKNOWN' && liquidityBias !== 'UNKNOWN' && sessionBias !== 'NEUTRAL' && liquidityBias !== 'NEUTRAL' && sessionBias !== liquidityBias) {
    conflicts.push(`1H session bias ${sessionBias} conflicts with 15M liquidity-map bias ${liquidityBias}.`);
  }
  const alignedDirection = longCount >= 3
    ? 'LONG'
    : shortCount >= 3
      ? 'SHORT'
      : conflicts.length
        ? 'CONFLICTED'
        : directional.length
          ? longCount > shortCount ? 'LONG' : shortCount > longCount ? 'SHORT' : 'NEUTRAL'
          : 'UNKNOWN';

  return {
    macroBias,
    sessionBias,
    liquidityBias,
    executionBias,
    alignedDirection,
    conflicts,
    notes: [
      `4H=${macroBias}, 1H=${sessionBias}, 15M=${liquidityBias}, 5M=${executionBias}.`,
      alignedDirection === 'CONFLICTED'
        ? 'Timeframes conflict; reduce certainty and require cleaner 5M confirmation.'
        : `Timeframe stack alignment: ${alignedDirection}.`,
    ],
  };
}

function buildTargetMap(levels: StructuralLevel[], currentPrice: number | null): MultiTimeframeContext['targetMap'] {
  if (!isPrice(currentPrice)) return { levelsToWatch: levels.slice(0, 8) };
  const upside = levels
    .filter(level => level.price > currentPrice)
    .sort((a, b) => a.price - b.price);
  const downside = levels
    .filter(level => level.price < currentPrice)
    .sort((a, b) => b.price - a.price);
  const strength = (level: StructuralLevel) => level.strengthScore || (level.confidence === 'High' ? 80 : level.confidence === 'Medium' ? 55 : 25);
  return {
    nearestUpsideLiquidity: upside[0] || null,
    majorUpsideLiquidity: [...upside].sort((a, b) => strength(b) - strength(a))[0] || null,
    nearestDownsideLiquidity: downside[0] || null,
    majorDownsideLiquidity: [...downside].sort((a, b) => strength(b) - strength(a))[0] || null,
    levelsToWatch: [...upside.slice(0, 3), ...downside.slice(0, 3)].slice(0, 6),
  };
}

function structuralTargetLabel(level: StructuralLevel | null | undefined): string | undefined {
  if (!level || !isPrice(level.price)) return undefined;
  return `${level.label} ${level.price}`;
}

function buildMultiTimeframeContext({
  bars5m,
  bars15m,
  bars60m,
  bars240m,
  structuralLevels,
  currentPrice,
}: {
  bars5m: NinjaBridgeBar[];
  bars15m: NinjaBridgeBar[];
  bars60m: NinjaBridgeBar[];
  bars240m: NinjaBridgeBar[];
  structuralLevels: StructuralLevel[];
  currentPrice: number | null;
}): MultiTimeframeContext {
  const fourHour = buildTimeframeFactSet({ timeframe: '4h', role: 'macro_context', bars: bars240m, structuralLevels });
  const oneHour = buildTimeframeFactSet({ timeframe: '1h', role: 'session_structure', bars: bars60m, structuralLevels });
  const fifteenMinute = buildTimeframeFactSet({ timeframe: '15m', role: 'liquidity_map', bars: bars15m, structuralLevels });
  const fiveMinute = buildTimeframeFactSet({ timeframe: '5m', role: 'execution', bars: bars5m, structuralLevels });
  const alignment = buildMultiTimeframeAlignment({ fourHour, oneHour, fifteenMinute, fiveMinute });
  return {
    source: 'ninjatrader_bridge',
    authority: 'ohlc_facts_only',
    fourHour,
    oneHour,
    fifteenMinute,
    fiveMinute,
    alignment,
    targetMap: buildTargetMap(structuralLevels, currentPrice),
    rules: {
      higherTimeframesApproveTrades: false,
      fiveMinuteExecutionRequired: true,
      aiMayOverwriteOhlcFacts: false,
    },
    notes: [
      'Machine-compatible bridge facts are built from 4H, 1H, 15M, and 5M NinjaTrader OHLC.',
      'Higher timeframes improve context, targets, and ranking; 5M remains execution authority.',
      'Gemini narrative is not the glue. Structured OHLC facts feed the app-owned engines.',
    ],
  };
}

export function buildNinjaChartContext({
  bars5m,
  bars15m = [],
  bars60m = [],
  bars240m = [],
  sessionType,
  instrument,
  tradeDate,
  midnightOpen,
}: {
  bars5m: NinjaBridgeBar[];
  bars15m?: NinjaBridgeBar[];
  bars60m?: NinjaBridgeBar[];
  bars240m?: NinjaBridgeBar[];
  sessionType: ChartContext['sessionType'];
  instrument: ChartContext['instrument'];
  tradeDate: string;
  midnightOpen?: number | null;
}): Partial<ChartContext> | null {
  const executionBars = bars5m.filter(bar =>
    Number.isFinite(bar.open) && Number.isFinite(bar.high) && Number.isFinite(bar.low) && Number.isFinite(bar.close)
  );
  if (!executionBars.length) return null;

  const last = executionBars[executionBars.length - 1];
  const first = executionBars[0];
  const recent = executionBars.slice(-8);
  const macroContextBars = [...bars240m, ...bars60m].filter(bar => Number.isFinite(bar.high) && Number.isFinite(bar.low));
  const allContextBars = [...macroContextBars, ...bars15m, ...executionBars].filter(bar => Number.isFinite(bar.high) && Number.isFinite(bar.low));
  const activeSwingHigh = recent.length ? Math.max(...recent.map(bar => bar.high)) : null;
  const activeSwingLow = recent.length ? Math.min(...recent.map(bar => bar.low)) : null;
  const contextHigh = allContextBars.length ? Math.max(...allContextBars.map(bar => bar.high)) : activeSwingHigh;
  const contextLow = allContextBars.length ? Math.min(...allContextBars.map(bar => bar.low)) : activeSwingLow;
  const trend = last.close > first.close ? 'bullish' : last.close < first.close ? 'bearish' : 'neutral';
  const candles = toCandleFacts(executionBars);
  const contextCandles = toCandleFacts(allContextBars, 240);
  const lastCandle = candles[candles.length - 1];
  const fvgZones = detectFvgZones(candles);
  const contextFvgZones = detectFvgZones(contextCandles);
  const displacementCandles = detectDisplacementCandles(candles, fvgZones);
  const contextDisplacementCandles = detectDisplacementCandles(contextCandles, contextFvgZones);
  const liquidityFacts = detectLiquidityAndReclaims(candles);
  const confidence = confidenceForBars(executionBars);
  const expansionPresent = candles.some(candle => candle.isExpansion);
  const rejectionPresent = candles.some(candle => candle.isRejection);
  const pullbackPresent = candles.slice(-4).some((candle, index, arr) =>
    index > 0 && candle.direction !== arr[index - 1].direction && candle.direction !== 'doji'
  );
  const baseStructuralLevels = buildStructuralLevels({
    bars5m: executionBars,
    bars15m,
    bars60m,
    bars240m,
    midnightOpen,
    rthOpen: first.open,
  });
  const sessionStory = buildSessionStory({
    bars: allContextBars,
    currentPrice: last.close,
    fvgZones: contextFvgZones,
    displacementCandles: contextDisplacementCandles,
  });
  const structuralLevels = [
    ...baseStructuralLevels,
    ...sessionStory.targetLevels,
  ];
  const sessionLevelContext = buildSessionLevelContext(structuralLevels, last.close, { fvgZones });
  const enrichedStructuralLevels = sessionLevelContext.levels;
  const structuralPrice = (source: string, type: 'high' | 'low') =>
    enrichedStructuralLevels.find(level => level.source === source && level.type === type)?.price ?? null;
  const multiTimeframeContext = buildMultiTimeframeContext({
    bars5m: executionBars,
    bars15m,
    bars60m,
    bars240m,
    structuralLevels: enrichedStructuralLevels,
    currentPrice: last.close,
  });
  const htfLiquidityDrawState = buildHtfLiquidityDrawState({
    bars4H: bars240m,
    bars1H: bars60m,
    bars15M: bars15m,
    bars5M: executionBars,
    externalBuySideLiquidityTarget:
      structuralTargetLabel(multiTimeframeContext.targetMap.nearestUpsideLiquidity) ||
      structuralTargetLabel(multiTimeframeContext.targetMap.majorUpsideLiquidity),
    externalSellSideLiquidityTarget:
      structuralTargetLabel(multiTimeframeContext.targetMap.nearestDownsideLiquidity) ||
      structuralTargetLabel(multiTimeframeContext.targetMap.majorDownsideLiquidity),
    chartTimestamp: last.time,
  });

  return {
    sessionType,
    instrument,
    tradeDate,
    timeframe: '5m',
    screenshotRole: '5m_execution',
    chartTimestamp: last.time,
    screenshotUsability: 'usable',
    keyLevels: {
      midnightOpen,
      currentPrice: last.close,
      rthOpen: first.open,
      overnightHigh: contextHigh,
      overnightLow: contextLow,
      previousDayHigh: structuralPrice('previous_rth', 'high'),
      previousDayLow: structuralPrice('previous_rth', 'low'),
      priorDayHigh: structuralPrice('previous_rth', 'high'),
      priorDayLow: structuralPrice('previous_rth', 'low'),
      nearestSupport: activeSwingLow,
      nearestResistance: activeSwingHigh,
      activeSwingHigh,
      activeSwingLow,
      triggerCandleHigh: last.high,
      triggerCandleLow: last.low,
    },
    structuralLevels: enrichedStructuralLevels,
    candles,
    fvgZones,
    liquidityEvents: liquidityFacts.liquiditySweeps,
    liquiditySweeps: liquidityFacts.liquiditySweeps,
    reclaimEvents: liquidityFacts.reclaimEvents,
    failedBreakEvents: liquidityFacts.failedBreakEvents,
    displacementCandles,
    marketStructure: {
      trend,
      higherHigh: executionBars.length > 2 && last.high >= Math.max(...executionBars.slice(0, -1).map(bar => bar.high)),
      higherLow: executionBars.length > 2 && last.low >= Math.min(...recent.slice(0, -1).map(bar => bar.low)),
      lowerHigh: executionBars.length > 2 && last.high < Math.max(...executionBars.slice(0, -1).map(bar => bar.high)),
      lowerLow: executionBars.length > 2 && last.low <= Math.min(...executionBars.slice(0, -1).map(bar => bar.low)),
      marketStructureShift: pullbackPresent && rejectionPresent,
      chopRangeCondition: Boolean(activeSwingHigh && activeSwingLow && activeSwingHigh - activeSwingLow < 8),
      compressionCondition: Boolean(activeSwingHigh && activeSwingLow && activeSwingHigh - activeSwingLow < 5),
      expansionCondition: expansionPresent,
    },
    candleFacts: {
      lastClosedCandleDirection: lastCandle?.direction || 'unknown',
      expansionCandlePresent: expansionPresent,
      rejectionWickPresent: rejectionPresent,
      breatherCandlePresent: candles.slice(-3).some(candle => candle.isBreather),
      reclaimCandlePresent: pullbackPresent,
      pullbackPresent,
      closeAboveKeyLevel: activeSwingHigh != null ? last.close > activeSwingHigh : undefined,
      closeBelowKeyLevel: activeSwingLow != null ? last.close < activeSwingLow : undefined,
    },
    setupReadyFacts: {
      pullbackIntoFvg: fvgZones.some(zone =>
        typeof zone.lower === 'number' &&
        typeof zone.upper === 'number' &&
        executionBars.some(bar => bar.low <= zone.upper && bar.high >= zone.lower)
      ),
      fvgReclaimed: fvgZones.some(zone => zone.reclaimed),
      breakOfStructure: pullbackPresent && rejectionPresent,
      sweepThenReclaim: liquidityFacts.liquiditySweeps.some(event => event.reclaimed),
      notes: [
        fvgZones.length ? `Detected ${fvgZones.length} FVG zone(s) from OHLC.` : 'No FVG zones detected from OHLC.',
        liquidityFacts.liquiditySweeps.length ? `Detected ${liquidityFacts.liquiditySweeps.length} sweep/reclaim event(s).` : 'No sweep/reclaim events detected from OHLC.',
      ],
    },
    screenshotQuality: confidence,
    levelReadConfidence: confidence,
    candleReadConfidence: confidence,
    structureReadConfidence: confidence,
    setupReadConfidence: confidence,
    riskReadConfidence: confidence,
    entryStopConfidence: 'Medium',
    requiresManualConfirmation: false,
    sessionLevelContext,
    sessionStory,
    multiTimeframeContext,
    htfLiquidityDrawState,
    targetObjectives: enrichedStructuralLevels.map(level => ({
      label: level.label,
      price: level.price,
      direction: level.directionRelevance === 'SHORT' ? 'SHORT' : 'LONG',
      source: level.source,
      type: level.type,
      confidence: level.confidence,
      score: level.strengthScore || 0,
      distancePoints: null,
      rMultiple: null,
      reason: `${level.label} from ${level.source} is available as target context. Strength=${level.strengthLabel || 'Low'} (${level.strengthScore || 0}).`,
    })),
    marketContext: `NinjaTrader live ${sessionType} ${instrument} machine-compatible OHLC context. 4H=${multiTimeframeContext.alignment.macroBias}, 1H=${multiTimeframeContext.alignment.sessionBias}, 15M=${multiTimeframeContext.alignment.liquidityBias}, 5M=${multiTimeframeContext.alignment.executionBias}. RTH/ETH hierarchy includes prior day, prior 3 sessions, prior week, and prior month when cached bars are available. ETH spans the full futures session, including RTH; RTH is also tracked separately for precision. 5M remains execution authority. Latest close ${last.close}. Active swing ${activeSwingLow}-${activeSwingHigh}. Structural levels=${enrichedStructuralLevels.length}.`,
    ocrText: `NinjaTrader Bridge OHLC facts: 5m=${executionBars.length}, 15m=${bars15m.length}, 1h=${bars60m.length}, 4h=${bars240m.length}. Multi-timeframe context=${multiTimeframeContext.alignment.alignedDirection}. RTH/ETH hierarchy=prior day/3-day/week/month. Structural levels=${enrichedStructuralLevels.length}.`,
  };
}
