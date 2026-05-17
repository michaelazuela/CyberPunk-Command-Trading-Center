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

function toCandleFacts(bars: NinjaBridgeBar[]): ChartCandleFact[] {
  const recent = bars.slice(-40);
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

function detectDisplacementCandles(candles: ChartCandleFact[]): DisplacementCandleFact[] {
  const readable = candles.filter(candle =>
    typeof candle.open === 'number' &&
    typeof candle.high === 'number' &&
    typeof candle.low === 'number' &&
    typeof candle.close === 'number'
  );
  const bodies = readable.map(candle => Math.abs((candle.close || 0) - (candle.open || 0)));
  const avgBody = bodies.length ? bodies.reduce((sum, body) => sum + body, 0) / bodies.length : 0;
  if (!avgBody) return [];

  return readable
    .filter(candle => candle.direction === 'bullish' || candle.direction === 'bearish')
    .filter(candle => Math.abs((candle.close || 0) - (candle.open || 0)) >= avgBody * 1.5 || candle.isExpansion)
    .map(candle => ({
      direction: candle.direction === 'bullish' ? 'LONG' : 'SHORT',
      candleIndex: candle.index,
      timestamp: candle.timestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      bodyPoints: Math.abs((candle.close || 0) - (candle.open || 0)),
      rangePoints: typeof candle.high === 'number' && typeof candle.low === 'number' ? candle.high - candle.low : null,
      confidence: 'High',
      evidence: 'Body is materially larger than recent average body.',
    }));
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
  const lastCandle = candles[candles.length - 1];
  const fvgZones = detectFvgZones(candles);
  const displacementCandles = detectDisplacementCandles(candles);
  const liquidityFacts = detectLiquidityAndReclaims(candles);
  const confidence = confidenceForBars(executionBars);
  const expansionPresent = candles.some(candle => candle.isExpansion);
  const rejectionPresent = candles.some(candle => candle.isRejection);
  const pullbackPresent = candles.slice(-4).some((candle, index, arr) =>
    index > 0 && candle.direction !== arr[index - 1].direction && candle.direction !== 'doji'
  );
  const structuralLevels = buildStructuralLevels({
    bars5m: executionBars,
    bars15m,
    midnightOpen,
    rthOpen: first.open,
  });
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
