import type {
  ChartCandleFact,
  ChartContext,
  DisplacementCandleFact,
  FailedBreakEventFact,
  FvgZoneFact,
  LiquidityEventFact,
  ReadConfidence,
  ReclaimEventFact,
} from '../types';
import { buildStructuralLevels } from './sessionStructure';
import { buildSessionLevelContext } from './sessionLevelContextEngine';
import { buildSessionStory } from './sessionStoryEngine';

export type NinjaBridgeTimeframe = '1m' | '5m' | '15m';

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
  if (inMinuteRange(minutes, 9 * 60 + 30, 10 * 60 + 10)) return 'rth_morning';
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

function detectFvgZones(candles: ChartCandleFact[]): FvgZoneFact[] {
  const zones: FvgZoneFact[] = [];
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

    if (left.high < right.low) {
      const lower = left.high;
      const upper = right.low;
      const midpoint = (upper + lower) / 2;
      zones.push({
        direction: 'LONG',
        upper,
        lower,
        midpoint,
        formedAt: middle.timestamp || right.timestamp || null,
        filledPercent: null,
        inverted: false,
        reclaimed: candles.slice(index + 1).some(candle => typeof candle.close === 'number' && candle.close > midpoint),
        reclaimTimestamp: candles.slice(index + 1).find(candle => typeof candle.close === 'number' && candle.close > midpoint)?.timestamp || null,
        confidence: middle.isExpansion || right.isExpansion ? 'High' : 'Medium',
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
        formedAt: middle.timestamp || right.timestamp || null,
        filledPercent: null,
        inverted: false,
        reclaimed: candles.slice(index + 1).some(candle => typeof candle.close === 'number' && candle.close < midpoint),
        reclaimTimestamp: candles.slice(index + 1).find(candle => typeof candle.close === 'number' && candle.close < midpoint)?.timestamp || null,
        confidence: middle.isExpansion || right.isExpansion ? 'High' : 'Medium',
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

export function buildNinjaChartContext({
  bars5m,
  bars15m = [],
  sessionType,
  instrument,
  tradeDate,
  midnightOpen,
}: {
  bars5m: NinjaBridgeBar[];
  bars15m?: NinjaBridgeBar[];
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
  const allContextBars = [...bars15m, ...executionBars].filter(bar => Number.isFinite(bar.high) && Number.isFinite(bar.low));
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

  return {
    sessionType,
    instrument,
    tradeDate,
    timeframe: '5m',
    screenshotRole: '5m_execution',
    screenshotUsability: 'usable',
    keyLevels: {
      midnightOpen,
      currentPrice: last.close,
      rthOpen: first.open,
      overnightHigh: contextHigh,
      overnightLow: contextLow,
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
    marketContext: `NinjaTrader live ${sessionType} ${instrument} 5M OHLC context. Latest close ${last.close}. Active swing ${activeSwingLow}-${activeSwingHigh}. Structural levels=${enrichedStructuralLevels.length}.`,
    ocrText: `NinjaTrader Bridge OHLC bars: 5m=${executionBars.length}, 15m=${bars15m.length}. Structural levels=${enrichedStructuralLevels.length}.`,
  };
}
