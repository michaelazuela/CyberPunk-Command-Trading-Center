import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAppTradePlan } from '../../src/lib/planEngine';
import { createPlanVersionId } from '../../src/lib/planMetadata';
import { TRADE_RULES } from '../../src/config/tradeRules';
import {
  buildNinjaChartContext,
  getNinjaBridgeBars,
  getNinjaBridgeHealth,
  getNinjaHistoricalBars,
  getNinjaBridgePositions,
  getNinjaBridgeSnapshot,
  type NinjaBridgeBar,
} from '../../src/lib/ninjaTraderBridge';
import { normalizeCandidateIctModelLabel } from '../../src/lib/ictModelLabels';
import {
  assessBridgeBarStaleness,
  applyStaleChaseGuard,
  buildTargetCascade,
  DEFAULT_SCANNER_RISK_GUARDS,
  getScannerTradeDate,
  latestCompletedBar,
  MARKET_MAPPING_COVERAGE,
  parseBridgeTime,
  resolveScannerWindow,
  scannerAlertKey,
  scannerContextLogLabel,
  scannerContextState,
  scannerStateFromDecision,
  scoreScannerCandidate,
  shouldSendScannerAlert,
  toEtMinutes,
  type BridgeTimeZoneMode,
  type BridgeTimestampMode,
  type ScannerState,
  type ScannerThresholds,
} from '../../src/lib/localScannerEngine';
import { TradeDecisionStatus, type AnalysisResult, type SetupCandidate, type TargetObjective } from '../../src/types';
import { fetchCachedMarketBars, loadMarketDataConfig, upsertMarketBars, type MarketBarTimeframe } from './market-data-store';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

type Instrument = 'MES' | 'MNQ';
type LiveSession = 'morning' | 'lunch';

interface ScannerConfig {
  instrument: Instrument;
  bridgeInstrument: string;
  bridgeUrl: string;
  account: string;
  pollSeconds: number;
  dryRun: boolean;
  once: boolean;
  continuousMode: boolean;
  scanWindows: boolean;
  discordEnabled: boolean;
  afternoonEnabled: boolean;
  thresholds: ScannerThresholds;
  maxChaseDistancePoints: number;
  maxChaseDistanceR: number;
  staleSetupMaxCandles: number;
  targetAlreadySweptLookbackCandles: number;
  allowRetestOnlyEntries: boolean;
  maxStaleBarMinutes: number;
  marketMapRefreshSeconds: number;
  barTimestampMode: BridgeTimestampMode;
  barTimeZone: BridgeTimeZoneMode;
}

interface ScannerStateFile {
  sent: Record<string, { state: ScannerState; confidence: number; sentAt: string }>;
  windowStartSent: Record<string, string>;
  lastCompleted5mBySession: Record<string, string>;
  lastMarketMapRefreshBySession: Record<string, string>;
}

interface DiscordWebhookPayload {
  username: string;
  content?: string;
  embeds: Array<{
    title: string;
    description?: string;
    color: number;
    fields: Array<{ name: string; value: string; inline?: boolean }>;
    footer: { text: string };
    timestamp: string;
  }>;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_FILE = path.join(__dirname, '.nt-scanner-state.json');
const TIMEFRAMES: MarketBarTimeframe[] = ['5m', '15m', '60m', '240m'];

function argValue(name: string): string | null {
  const prefix = `--${name}=`;
  const directIndex = process.argv.indexOf(`--${name}`);
  if (directIndex >= 0 && process.argv[directIndex + 1]) return process.argv[directIndex + 1];
  const matched = process.argv.find((arg) => arg.startsWith(prefix));
  return matched ? matched.slice(prefix.length) : null;
}

function hasArg(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function boolArg(name: string, fallback: boolean): boolean {
  const value = argValue(name);
  if (value === null) return hasArg(name) ? true : fallback;
  if (['false', '0', 'no', 'off'].includes(value.toLowerCase())) return false;
  if (['true', '1', 'yes', 'on'].includes(value.toLowerCase())) return true;
  return fallback;
}

function numberArg(name: string, fallback: number): number {
  const raw = argValue(name);
  if (raw === null) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function printHelp() {
  console.log([
    'Quant Desk local deterministic NinjaTrader scanner',
    '',
    'Usage:',
    '  npm run nt:scanner',
    '  npm run nt:scanner -- --once --dry-run',
    '  npm run nt:scanner -- --instrument MES --bridge-instrument "MES 06-26"',
    '  npm run nt:scanner -- --dry-run',
    '',
    'Options:',
    '  --once                         Run one poll cycle and exit.',
    '  --dry-run                      Print/log alert payloads instead of posting to Discord.',
    '  --instrument MES|MNQ           Logical app instrument, defaults to MES.',
    '  --bridge-instrument "MES 06-26" NinjaTrader bridge instrument.',
    '  --bridge-url URL               Defaults to http://127.0.0.1:8765.',
    '  --poll-seconds 60              Poll cadence, minimum 15 seconds for continuous mode.',
    '  --discord false                Disable Discord sends but keep scanner logs.',
    '  --scan-windows false           Disable trade-plan scans; context/health only.',
    '  --afternoon true               Enable optional afternoon window.',
    '  --max-stale-bar-minutes 10     Refuse live scans when latest completed 5M bar is older than this.',
    '  --market-map-refresh-seconds 300 Refresh durable look-left map while outside trade windows.',
    '  --bar-timestamp-mode close     NinjaTrader bar timestamps are usually close times; use open if your bridge emits bar start times.',
    '  --bar-time-zone central        Timezone for NinjaTrader bar timestamps without offsets: central, eastern, pacific, or local.',
  ].join('\n'));
}

function loadConfig(): ScannerConfig {
  const dryRun = hasArg('dry-run');
  const once = hasArg('once');
  const timestampMode = argValue('bar-timestamp-mode') || process.env.NINJATRADER_BAR_TIMESTAMP_MODE || 'close';
  const timeZoneArg = argValue('bar-time-zone') || process.env.NINJATRADER_BAR_TIME_ZONE || 'central';
  const barTimeZone: BridgeTimeZoneMode = ['eastern', 'central', 'pacific', 'local'].includes(timeZoneArg)
    ? (timeZoneArg as BridgeTimeZoneMode)
    : 'central';
  return {
    instrument: ((argValue('instrument') || 'MES') as Instrument),
    bridgeInstrument: argValue('bridge-instrument') || process.env.NINJATRADER_BRIDGE_INSTRUMENT || 'MES 06-26',
    bridgeUrl: argValue('bridge-url') || process.env.NINJATRADER_BRIDGE_URL || 'http://127.0.0.1:8765',
    account: argValue('account') || process.env.NINJATRADER_ACCOUNT || 'Sim101',
    pollSeconds: Math.max(once ? 1 : 15, numberArg('poll-seconds', 60)),
    dryRun,
    once,
    continuousMode: boolArg('continuous', true),
    scanWindows: boolArg('scan-windows', true),
    discordEnabled: boolArg('discord', true),
    afternoonEnabled: boolArg('afternoon', false),
    thresholds: {
      conditional: numberArg('conditional-threshold', 75),
      executable: numberArg('executable-threshold', 85),
      educationalBlocked: numberArg('blocked-threshold', 70),
    },
    maxChaseDistancePoints: numberArg('max-chase-points', DEFAULT_SCANNER_RISK_GUARDS.maxChaseDistancePoints),
    maxChaseDistanceR: numberArg('max-chase-r', DEFAULT_SCANNER_RISK_GUARDS.maxChaseDistanceR),
    staleSetupMaxCandles: numberArg('stale-candles', DEFAULT_SCANNER_RISK_GUARDS.staleSetupMaxCandles),
    targetAlreadySweptLookbackCandles: numberArg('target-swept-lookback', DEFAULT_SCANNER_RISK_GUARDS.targetAlreadySweptLookbackCandles),
    allowRetestOnlyEntries: boolArg('allow-retest-only', DEFAULT_SCANNER_RISK_GUARDS.allowRetestOnlyEntries),
    maxStaleBarMinutes: numberArg('max-stale-bar-minutes', 10),
    marketMapRefreshSeconds: Math.max(60, numberArg('market-map-refresh-seconds', 300)),
    barTimestampMode: timestampMode === 'open' ? 'open' : 'close',
    barTimeZone,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readState(): Promise<ScannerStateFile> {
  try {
    const parsed = JSON.parse(await fs.readFile(STATE_FILE, 'utf8')) as Partial<ScannerStateFile>;
    return {
      sent: parsed.sent || {},
      windowStartSent: parsed.windowStartSent || {},
      lastCompleted5mBySession: parsed.lastCompleted5mBySession || {},
      lastMarketMapRefreshBySession: parsed.lastMarketMapRefreshBySession || {},
    };
  } catch {
    return { sent: {}, windowStartSent: {}, lastCompleted5mBySession: {}, lastMarketMapRefreshBySession: {} };
  }
}

async function writeState(state: ScannerStateFile): Promise<void> {
  await fs.writeFile(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function previousCalendarDate(tradeDate: string): string {
  const date = new Date(`${tradeDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function etDateTime(tradeDate: string, time: string): string {
  return `${tradeDate}T${time}:00-04:00`;
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function money(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : 'N/A';
}

function timeframeMinutes(timeframe: MarketBarTimeframe): number {
  if (timeframe === '60m') return 60;
  if (timeframe === '240m') return 240;
  return Number(timeframe.replace('m', '')) || 5;
}

function recentHistoricalWindow(timeframe: MarketBarTimeframe, limit: number): { from: string; to: string } {
  const minutes = timeframeMinutes(timeframe);
  const to = new Date();
  const lookbackMinutes =
    timeframe === '5m'
      ? 120
      : Math.max(90, minutes * Math.max(limit, 40) * 1.25);
  const from = new Date(to.getTime() - lookbackMinutes * 60_000);
  return { from: from.toISOString(), to: to.toISOString() };
}

function clip(value: string, max = 1024): string {
  const text = value.trim() || 'N/A';
  return text.length <= max ? text : `${text.slice(0, max - 3)}...`;
}

function statusColor(state: ScannerState): number {
  if (state === 'Approved' || state === 'Executable') return 0x00c853;
  if (state === 'Conditional' || state === 'TriggerPending' || state === 'Missed') return 0xffd600;
  if (state === 'Blocked' || state === 'NoTrade') return 0xff6d00;
  return 0x78909c;
}

function statusEmoji(state: ScannerState): string {
  if (state === 'Approved' || state === 'Executable') return '🟢';
  if (state === 'Conditional' || state === 'TriggerPending') return '🟡';
  if (state === 'Missed') return '⏭️';
  if (state === 'Blocked') return '🟠';
  return '⚪';
}

function planName(candidate: SetupCandidate | null): string {
  if (!candidate) return 'No active plan';
  return modelType(candidate);
}

function modelType(candidate: SetupCandidate | null): 'Sweep -> MSS -> FVG Retrace' | 'Turtle Soup Reversal' | 'ICT setup' {
  return normalizeCandidateIctModelLabel(candidate);
}

function tradeDecisionFromScore(score: number): 'No Trade' | 'Watchlist' | 'Conditional' | 'Qualified' {
  if (score >= 80) return 'Qualified';
  if (score >= 65) return 'Conditional';
  if (score >= 45) return 'Watchlist';
  return 'No Trade';
}

function riskReward(candidate: SetupCandidate | null): string {
  if (
    typeof candidate?.entry !== 'number' ||
    typeof candidate?.target1 !== 'number' ||
    typeof candidate?.riskPoints !== 'number' ||
    candidate.riskPoints <= 0
  ) {
    return 'N/A';
  }
  return `${(Math.abs(candidate.target1 - candidate.entry) / candidate.riskPoints).toFixed(2)}R`;
}

function sanitizeIctReason(reason: string): string {
  const text = reason.toLowerCase();
  if (text.includes('liquidity sweep') || text.includes('sweep identified')) return 'Liquidity sweep confirmed';
  if (text.includes('reclaim after sweep')) return 'Reclaim after sweep confirmed';
  if (text.includes('wick rejection')) return 'Wick rejection support';
  if (text.includes('turtle soup')) return 'Turtle Soup reversal';
  if (text.includes('breaker + fvg') || text.includes('breaker/fvg')) return 'Breaker + FVG overlap confluence';
  if (text.includes('displacement') || text.includes('expansion') || text.includes('impulse')) return text.includes('no confirmed') || text.includes('missing') ? 'No confirmed displacement' : 'Displacement confirmed';
  if (text.includes('market structure shift')) return text.includes('no confirmed') || text.includes('missing') ? 'No confirmed market structure shift' : 'Market structure shift confirmed';
  if (text.includes('fair value gap') || text.includes('fvg') || text.includes('imbalance')) return text.includes('no ') || text.includes('missing') ? 'No fair value gap / imbalance entry model' : 'Fair value gap / imbalance entry model';
  if (text.includes('premium') || text.includes('discount') || text.includes('range location')) return 'Premium/discount alignment';
  if (text.includes('higher-timeframe')) return 'Higher-timeframe bias aligned';
  if (text.includes('entry') || text.includes('stop') || text.includes('target')) return 'Entry, stop, and target available';
  if (text.includes('minimum 2.0r') || text.includes('low ev')) return text.includes('unavailable') ? 'Minimum 2.0R unavailable' : 'Minimum 2.0R available';
  if (text.includes('stale') || text.includes('chase') || text.includes('expired')) return 'ICT setup expired: stale/chase guard active';
  if (text.includes('chop') || text.includes('consolidation') || text.includes('overlap')) return 'Chop/consolidation no-trade';
  if (text.includes('outside')) return 'Outside approved session';
  if (text.includes('no confirmed liquidity') || text.includes('liquidity sweep missing')) return 'No confirmed liquidity sweep';
  return reason;
}

function uniqueReasons(reasons: string[]): string {
  const selected = [...new Set(reasons.map(sanitizeIctReason))].slice(0, 6);
  return selected.length ? selected.join('\n') : 'N/A';
}

function hardDisqualifierReason(reasons: string[]): string {
  const hard = reasons
    .map(sanitizeIctReason)
    .find((reason) =>
      reason === 'ICT setup expired: stale/chase guard active' ||
      reason === 'Chop/consolidation no-trade' ||
      reason === 'Outside approved session' ||
      reason === 'No confirmed displacement' ||
      reason === 'Minimum 2.0R unavailable'
    );
  return hard || 'N/A';
}

function objectiveLine(label: string, objective: TargetObjective | null | undefined): string {
  if (!objective) return `${label}: N/A`;
  return `${label}: ${objective.price} ${objective.label}`;
}

function mappingSessionForWindow(window: ReturnType<typeof resolveScannerWindow>): LiveSession {
  if (window.session === 'lunch') return 'lunch';
  if (window.nextWindowLabel?.toLowerCase().includes('midday')) return 'lunch';
  return 'morning';
}

async function fetchFreshBridgeBars(config: ScannerConfig, timeframe: MarketBarTimeframe, limit = 220): Promise<NinjaBridgeBar[]> {
  const response = await getNinjaBridgeBars(config.bridgeInstrument, timeframe, limit, config.bridgeUrl);
  const cachedBars = response.ok ? response.bars || [] : [];
  if (timeframe !== '5m') return cachedBars;

  const freshness = assessBridgeBarStaleness({
    latestBar: latestCompletedBar(cachedBars, 5, new Date(), config.barTimestampMode, config.barTimeZone),
    timeframeMinutes: 5,
    maxStaleBarMinutes: config.maxStaleBarMinutes,
    timestampMode: config.barTimestampMode,
    timeZoneMode: config.barTimeZone,
  });
  if (!freshness.stale) return cachedBars;

  const window = recentHistoricalWindow(timeframe, limit);
  const historical = await getNinjaHistoricalBars({
    instrument: config.bridgeInstrument,
    timeframe,
    from: window.from,
    to: window.to,
    limit,
    baseUrl: config.bridgeUrl,
  });
  if (!historical.ok || !historical.bars?.length) {
    console.warn(`[scanner-bridge] ${timeframe}: live cache stale and historical repair returned no bars: ${historical.error || 'unknown error'}`);
    return cachedBars;
  }

  const repairedFreshness = assessBridgeBarStaleness({
    latestBar: latestCompletedBar(historical.bars, 5, new Date(), config.barTimestampMode, config.barTimeZone),
    timeframeMinutes: 5,
      maxStaleBarMinutes: config.maxStaleBarMinutes,
      timestampMode: config.barTimestampMode,
      timeZoneMode: config.barTimeZone,
    });
  if (repairedFreshness.stale) {
    console.warn(`[scanner-bridge] ${timeframe}: historical repair still stale: ${repairedFreshness.reason}`);
    return cachedBars;
  }

  console.log(`[scanner-bridge] ${timeframe}: repaired stale live cache with ${historical.bars.length} recent historical bars.`);
  return historical.bars;
}

async function fetchLiveBars(config: ScannerConfig): Promise<Record<MarketBarTimeframe, NinjaBridgeBar[]>> {
  const entries = await Promise.all(TIMEFRAMES.map(async (timeframe) => {
    const bars = await fetchFreshBridgeBars(config, timeframe, 220);
    if (!bars.length) return [timeframe, []] as const;
    const marketConfig = loadMarketDataConfig();
    if (marketConfig) {
      try {
        await upsertMarketBars({
          bars,
          instrument: config.instrument,
          bridgeInstrument: config.bridgeInstrument,
          timeframe,
          config: marketConfig,
        });
      } catch (error) {
        console.warn(`[scanner-cache] ${timeframe}: cache upsert skipped: ${formatError(error)}`);
      }
    }
    return [timeframe, bars] as const;
  }));
  return Object.fromEntries(entries) as Record<MarketBarTimeframe, NinjaBridgeBar[]>;
}

async function fetchLookLeftBars(config: ScannerConfig, tradeDate: string, session: LiveSession): Promise<Record<MarketBarTimeframe, NinjaBridgeBar[]>> {
  const marketConfig = loadMarketDataConfig();
  const priorDate = previousCalendarDate(tradeDate);
  const contextTo = etDateTime(tradeDate, session === 'morning' ? '11:15' : '13:00');
  const from = etDateTime(priorDate, '18:00');
  const entries = await Promise.all(TIMEFRAMES.map(async (timeframe) => {
    if (marketConfig) {
      const cached = await fetchCachedMarketBars({
        instrument: config.bridgeInstrument,
        timeframe,
        from,
        to: contextTo,
        config: marketConfig,
        limit: 6000,
      });
      if (cached.length) return [timeframe, cached] as const;
    }
    return [timeframe, []] as const;
  }));
  return Object.fromEntries(entries) as Record<MarketBarTimeframe, NinjaBridgeBar[]>;
}

function mergeBars(primary: NinjaBridgeBar[], fallback: NinjaBridgeBar[]): NinjaBridgeBar[] {
  const byTime = new Map<string, NinjaBridgeBar>();
  fallback.forEach((bar) => byTime.set(bar.time, bar));
  primary.forEach((bar) => byTime.set(bar.time, bar));
  return [...byTime.values()].sort((a, b) => String(a.time).localeCompare(String(b.time)));
}

function analysisFromBars(args: {
  config: ScannerConfig;
  session: LiveSession;
  tradeDate: string;
  bars: Record<MarketBarTimeframe, NinjaBridgeBar[]>;
}): AnalysisResult {
  const chartContext = buildNinjaChartContext({
    bars5m: args.bars['5m'],
    bars15m: args.bars['15m'],
    bars60m: args.bars['60m'],
    bars240m: args.bars['240m'],
    sessionType: args.session,
    instrument: args.config.instrument,
    tradeDate: args.tradeDate,
  });

  return {
    dayType: 'NO TRADE',
    reasoning: `NinjaTrader local scanner imported ${args.session} OHLC context. The app-owned deterministic pipeline controls the decision.`,
    confidence: 0.5,
    checks: [{ label: 'NinjaTrader OHLC imported', passed: Boolean(chartContext) }],
    structuredChartContext: chartContext || undefined,
    current_rule_analysis: {
      summary: `Local scanner context from NinjaTrader bridge for ${args.session}.`,
      setup_detected: 'Pending deterministic setup scan',
      rule_category: 'APP_OWNED_PIPELINE',
      entry: null,
      stop: null,
      target_1: null,
      target_2: null,
      trigger_state: 'NO_TRIGGER',
      entry_trigger: null,
      no_trade_reason: null,
      base_confidence: 'Medium',
    },
  };
}

function chooseBestCandidate(
  candidates: SetupCandidate[] | undefined,
  currentPrice: number | null,
  config: ScannerConfig
): SetupCandidate | null {
  return (candidates || [])
    .filter((candidate) => candidate.direction === 'LONG' || candidate.direction === 'SHORT')
    .filter((candidate) => candidate.executionStatus === 'Executable' || candidate.executionStatus === 'Conditional' || candidate.executionStatus === 'Blocked')
    .filter((candidate) => !applyStaleChaseGuard({
      candidate,
      currentPrice,
      guards: {
        maxChaseDistancePoints: config.maxChaseDistancePoints,
        maxChaseDistanceR: config.maxChaseDistanceR,
        staleSetupMaxCandles: config.staleSetupMaxCandles,
        targetAlreadySweptLookbackCandles: config.targetAlreadySweptLookbackCandles,
        allowRetestOnlyEntries: config.allowRetestOnlyEntries,
      },
    }).stale)
    .sort((a, b) => (b.rankScore || b.priority || 0) - (a.rankScore || a.priority || 0))[0] || null;
}

function analysisTimestampDate(analysis: AnalysisResult, completed5m: NinjaBridgeBar | null, config: ScannerConfig): Date {
  const structured = analysis.structuredChartContext;
  const timestamp =
    structured?.chartTimestamp ||
    structured?.screenshotTimestamp ||
    analysis.sessionLog?.timestamp ||
    completed5m?.time ||
    null;

  if (timestamp) {
    const timestampText = String(timestamp);
    const hasExplicitZone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(timestampText);
    if (!hasExplicitZone) {
      const parsedBridgeTime = parseBridgeTime(timestampText, config.barTimeZone);
      if (parsedBridgeTime) return parsedBridgeTime;
    }
  }

  if (timestamp === completed5m?.time) {
    const parsedBridgeTime = parseBridgeTime(String(completed5m.time), config.barTimeZone);
    if (parsedBridgeTime) return parsedBridgeTime;
  }

  if (timestamp) {
    const parsed = new Date(timestamp);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return new Date();
}

async function refreshMarketMapContext(args: {
  config: ScannerConfig;
  state: ScannerStateFile;
  tradeDate: string;
  window: ReturnType<typeof resolveScannerWindow>;
  liveBars: Record<MarketBarTimeframe, NinjaBridgeBar[]>;
}): Promise<string> {
  const session = mappingSessionForWindow(args.window);
  const key = `${args.tradeDate}:${session}`;
  const lastRefresh = args.state.lastMarketMapRefreshBySession[key];
  const lastRefreshMs = lastRefresh ? new Date(lastRefresh).getTime() : 0;
  const elapsedSeconds = lastRefreshMs ? (Date.now() - lastRefreshMs) / 1000 : Number.POSITIVE_INFINITY;
  if (elapsedSeconds < args.config.marketMapRefreshSeconds) {
    return `market map fresh (${session}; next durable refresh in ${Math.ceil(args.config.marketMapRefreshSeconds - elapsedSeconds)}s).`;
  }

  try {
    const cachedBars = await fetchLookLeftBars(args.config, args.tradeDate, session);
    const bars = {
      '5m': mergeBars(args.liveBars['5m'], cachedBars['5m']),
      '15m': mergeBars(args.liveBars['15m'], cachedBars['15m']),
      '60m': mergeBars(args.liveBars['60m'], cachedBars['60m']),
      '240m': mergeBars(args.liveBars['240m'], cachedBars['240m']),
    };
    const analysis = analysisFromBars({ config: args.config, session, tradeDate: args.tradeDate, bars });
    const objectives = analysis.structuredChartContext?.targetObjectives?.length || 0;
    args.state.lastMarketMapRefreshBySession[key] = new Date().toISOString();
    return `market map refreshed (${session}; ${MARKET_MAPPING_COVERAGE.join(', ')}; ${objectives} target objectives).`;
  } catch (error) {
    return `market map refresh skipped: ${formatError(error)}`;
  }
}

function buildDiscordPayload(args: {
  session: LiveSession;
  tradeDate: string;
  config: ScannerConfig;
  state: ScannerState;
  confidence: ReturnType<typeof scoreScannerCandidate>;
  candidate: SetupCandidate | null;
  normalized: ReturnType<typeof buildAppTradePlan>;
  currentPrice: number | null;
  completed5m: NinjaBridgeBar | null;
  scoringTimestamp: string;
  scoringTimestampSource: string;
  windowLabel: string;
  staleReason: string | null;
  targetCascade: ReturnType<typeof buildTargetCascade>;
  alertReason: string;
}): DiscordWebhookPayload {
  const candidate = args.candidate;
  const targetPlan = candidate?.targetObjectivePlan;
  const trigger = candidate?.requiredTrigger || 'Wait for completed 5M trigger.';
  const invalidation = candidate?.invalidation || args.normalized.invalidation || 'Do not execute without structure invalidation.';
  const model = modelType(candidate);
  const decision = tradeDecisionFromScore(args.confidence.score);
  const planLine = [
    `Instrument: ${args.config.instrument}`,
    `Session: ${args.session}`,
    `Timestamp used for scoring: ${args.scoringTimestamp} (${args.scoringTimestampSource})`,
    `Direction: ${candidate?.direction || 'N/A'}`,
    `Model type: ${model}`,
    `Score: ${args.confidence.score}/100`,
    `Trade decision: ${decision}`,
    `Current: ${money(args.currentPrice)} | Completed 5M: ${args.completed5m?.time || 'N/A'}`,
  ].join('\n');
  const executionLine = [
    `Trigger: ${trigger}`,
    `Entry area: ${money(candidate?.entry)}`,
    `Stop: ${money(candidate?.stop)}`,
    `Target: ${money(candidate?.target1)}${candidate?.target2 ? ` | Runner: ${money(candidate.target2)}` : ''}`,
    `Risk/reward: ${riskReward(candidate)}`,
  ].join('\n');
  const targetLine = [
    objectiveLine('Obstacle / Reaction Zone', targetPlan?.obstacleTarget1 || targetPlan?.nearestObstacleTarget),
    objectiveLine('Primary Liquidity Target', targetPlan?.liquidityTarget1 || targetPlan?.nearestLiquidityTarget || args.targetCascade.activeTarget),
    objectiveLine('Runner Liquidity', targetPlan?.liquidityRunnerTarget || targetPlan?.runnerTarget),
    `Target Cascade: ${args.targetCascade.path.join(' ')}`,
  ].join('\n');
  const reasonLine = [
    `Alert qualification: ${args.alertReason}`,
    `Qualified reasons:\n${uniqueReasons(args.confidence.qualifiedReasons)}`,
    `Missing reasons:\n${uniqueReasons(args.confidence.missingReasons)}`,
    `Hard disqualifier: ${hardDisqualifierReason(args.confidence.missingReasons)}`,
  ].filter(Boolean).join('\n');

  return {
    username: 'Quant Desk',
    content: `# ${statusEmoji(args.state)} Quant Desk ICT Scanner Alert — ${decision}\nDecision support only. No automated orders were placed.`,
    embeds: [
      {
        title: `📊 Local Scanner Trading Card — ${args.tradeDate}`,
        description: 'Do not execute from the card alone. Wait for the 5M trigger, structure stop, risk check, and target room confirmation.',
        color: statusColor(args.state),
        fields: [
          { name: '1️⃣ Trade State', value: clip(planLine), inline: false },
          { name: '2️⃣ ICT Plan', value: clip(executionLine), inline: false },
          { name: '3️⃣ Targets', value: clip(targetLine), inline: false },
          { name: '4️⃣ Invalidation / No Chase', value: clip(`${invalidation}\n${args.staleReason || 'Preferred retest entry required. No chase entry.'}`), inline: false },
          { name: '5️⃣ Alert Quality', value: clip(reasonLine), inline: false },
        ],
        footer: { text: 'Quant Desk • Local Scanner • Read-only bridge • No automated orders' },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

async function postDiscord(payload: DiscordWebhookPayload, config: ScannerConfig): Promise<void> {
  if (config.dryRun || !config.discordEnabled) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) throw new Error('DISCORD_WEBHOOK_URL is required unless --dry-run or --discord false is used.');
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Discord webhook failed (${response.status}): ${await response.text()}`);
}

function buildWindowStartPayload(args: {
  session: LiveSession;
  tradeDate: string;
  config: ScannerConfig;
  currentPrice: number | null;
  completed5m: NinjaBridgeBar | null;
  windowLabel: string;
}): DiscordWebhookPayload {
  const sessionLabel = args.session === 'morning' ? 'Morning' : 'Lunch';
  const windowRange = args.session === 'morning'
    ? `${TRADE_RULES.executionWindows.morningExecution.startET}-${TRADE_RULES.executionWindows.morningExecution.endET} ET`
    : `${TRADE_RULES.executionWindows.middayTrapReversal.startET}-${TRADE_RULES.executionWindows.middayTrapReversal.endET} ET`;
  const fullSchedule = [
    `Before ${TRADE_RULES.executionWindows.openingObservation.startET} ET: Market Mapping only`,
    `${TRADE_RULES.executionWindows.openingObservation.startET}-${TRADE_RULES.executionWindows.openingObservation.endET} ET: Opening observation, no trade approval`,
    `${TRADE_RULES.executionWindows.morningExecution.startET}-${TRADE_RULES.executionWindows.morningExecution.endET} ET: Morning setup scanning`,
    `${TRADE_RULES.executionWindows.morningExecution.endET}-${TRADE_RULES.executionWindows.middayTrapReversal.startET} ET: Market Mapping only`,
    `${TRADE_RULES.executionWindows.middayTrapReversal.startET}-${TRADE_RULES.executionWindows.middayTrapReversal.endET} ET: Lunch setup scanning`,
    `After ${TRADE_RULES.executionWindows.middayTrapReversal.endET} ET: Market Mapping only`,
  ].join('\n');
  return {
    username: 'Quant Desk',
    content: `# Quant Desk Scanner Window Active — ${sessionLabel}\nDecision support only. No automated orders were placed.`,
    embeds: [
      {
        title: `${sessionLabel} Setup Scanner Online — ${args.tradeDate}`,
        description: 'The live scanner is connected and actively checking the two approved ICT models. Keep an eye out for a confirmed setup during this window. This notice is not a trade alert, and no-trade remains a valid professional decision.',
        color: 0x00bcd4,
        fields: [
          {
            name: 'Scanner Window',
            value: clip([
              `Window: ${args.windowLabel}`,
              `Time: ${windowRange}`,
              `Instrument: ${args.config.instrument}`,
              `Bridge instrument: ${args.config.bridgeInstrument}`,
            ].join('\n')),
            inline: false,
          },
          {
            name: 'Full Scanner Schedule',
            value: clip(fullSchedule),
            inline: false,
          },
          {
            name: 'Live Data',
            value: clip([
              `Bridge: ${args.config.bridgeUrl}`,
              `Poll cadence: ${args.config.pollSeconds}s`,
              `Current price: ${money(args.currentPrice)}`,
              `Latest completed 5M: ${args.completed5m?.time || 'N/A'}`,
            ].join('\n')),
            inline: false,
          },
          {
            name: 'Approved Models',
            value: 'Sweep -> MSS -> FVG Retrace\nTurtle Soup Reversal',
            inline: false,
          },
        ],
        footer: { text: 'Quant Desk • Scanner heartbeat • Trade approval still requires full 5M confirmation' },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

async function sendWindowStartAlert(args: {
  config: ScannerConfig;
  state: ScannerStateFile;
  tradeDate: string;
  session: LiveSession;
  windowLabel: string;
  currentPrice: number | null;
  completed5m: NinjaBridgeBar | null;
}): Promise<void> {
  const key = `${args.tradeDate}:${args.session}:scanner-window-start`;
  if (args.state.windowStartSent[key]) return;

  const payload = buildWindowStartPayload({
    session: args.session,
    tradeDate: args.tradeDate,
    config: args.config,
    currentPrice: args.currentPrice,
    completed5m: args.completed5m,
    windowLabel: args.windowLabel,
  });

  await postDiscord(payload, args.config);
  args.state.windowStartSent[key] = new Date().toISOString();
  console.log(`[scanner] Sent ${args.session} scanner window start heartbeat.`);
}

async function runCycle(config: ScannerConfig): Promise<void> {
  const now = new Date();
  const window = resolveScannerWindow(now, config.afternoonEnabled);
  const tradeDate = getScannerTradeDate(now);
  const state = await readState();

  let healthOk = false;
  try {
    const health = await getNinjaBridgeHealth(config.bridgeUrl);
    healthOk = Boolean(health.ok);
  } catch (error) {
    console.error(`[scanner] bridge health failed: ${formatError(error)}`);
  }

  if (!healthOk) {
    console.log(`[scanner] ${new Date().toISOString()} NoData: bridge unavailable.`);
    return;
  }

  const [snapshot, positions, liveBars] = await Promise.all([
    getNinjaBridgeSnapshot(config.bridgeInstrument, config.bridgeUrl).catch(() => null),
    getNinjaBridgePositions(config.account, config.bridgeUrl).catch(() => null),
    fetchLiveBars(config),
  ]);

  const completed5m = latestCompletedBar(liveBars['5m'], 5, now, config.barTimestampMode, config.barTimeZone);
  let currentPrice = snapshot?.currentPrice ?? snapshot?.last?.close ?? completed5m?.close ?? null;
  const snapshotFreshness = assessBridgeBarStaleness({
    latestBar: snapshot?.last || null,
    timeframeMinutes: 1,
    now,
    maxStaleBarMinutes: config.maxStaleBarMinutes,
    timestampMode: config.barTimestampMode,
    timeZoneMode: config.barTimeZone,
  });
  if (snapshotFreshness.stale && completed5m) {
    currentPrice = completed5m.close;
  }
  const positionText = positions?.positions?.length ? positions.positions.map((item) => `${item.marketPosition} ${item.quantity}`).join(', ') : 'flat / none returned';
  const bridgeFreshness = assessBridgeBarStaleness({
    latestBar: completed5m,
    timeframeMinutes: 5,
    now,
    maxStaleBarMinutes: config.maxStaleBarMinutes,
    timestampMode: config.barTimestampMode,
    timeZoneMode: config.barTimeZone,
  });

  if (bridgeFreshness.stale) {
    console.log(`[scanner] NoData: ${bridgeFreshness.reason}`);
    return;
  }

  if (!window.allowsTradePlan || !config.scanWindows) {
    const mappingState = scannerContextState(window);
    const mappingLabel = config.scanWindows ? scannerContextLogLabel(window) : 'Market Mapping Mode';
    const mapStatus = await refreshMarketMapContext({ config, state, tradeDate, window, liveBars });
    console.log(`[scanner] ${mappingLabel}: ${mappingState}, context updated only | current ${money(currentPrice)} | completed 5M ${completed5m?.time || 'N/A'} | positions ${positionText} | ${mapStatus}`);
    await writeState(state);
    return;
  }

  const session = window.session === 'lunch' ? 'lunch' : 'morning';
  const sessionKey = `${tradeDate}:${session}`;
  if (!completed5m) {
    console.log(`[scanner] ${window.label}: NoData, no completed 5M candle available.`);
    return;
  }
  const sameCompletedCandle = state.lastCompleted5mBySession[sessionKey] === completed5m.time;

  try {
    await sendWindowStartAlert({
      config,
      state,
      tradeDate,
      session,
      windowLabel: window.label,
      currentPrice,
      completed5m,
    });
    await writeState(state);
  } catch (error) {
    console.warn(`[scanner] ${session} window start heartbeat skipped: ${formatError(error)}`);
  }

  const cachedBars = await fetchLookLeftBars(config, tradeDate, session).catch((error) => {
    console.warn(`[scanner] Supabase look-left cache unavailable: ${formatError(error)}`);
    return null;
  });
  const bars = cachedBars
    ? {
        '5m': mergeBars(liveBars['5m'], cachedBars['5m']),
        '15m': mergeBars(liveBars['15m'], cachedBars['15m']),
        '60m': mergeBars(liveBars['60m'], cachedBars['60m']),
        '240m': mergeBars(liveBars['240m'], cachedBars['240m']),
      }
    : liveBars;
  const analysis = analysisFromBars({ config, session, tradeDate, bars });
  const normalized = buildAppTradePlan(analysis, { sessionType: session, instrument: config.instrument, windowStatusOverride: 'active' });
  const candidate = chooseBestCandidate(normalized.setupCandidates, currentPrice, config);
  const scoringDate = analysisTimestampDate(analysis, completed5m, config);
  const scoringTimestampSource =
    analysis.structuredChartContext?.chartTimestamp ? 'chartTimestamp' :
    analysis.structuredChartContext?.screenshotTimestamp ? 'screenshotTimestamp' :
    analysis.sessionLog?.timestamp ? 'analysis session timestamp' :
    completed5m?.time ? 'latest completed 5M candle' :
    'system time fallback';
  const currentEtMinutes = toEtMinutes(scoringDate);
  const confidence = scoreScannerCandidate(
    candidate,
    window,
    currentPrice,
    analysis.structuredChartContext?.multiTimeframeContext?.alignment?.alignedDirection === candidate?.direction,
    currentEtMinutes,
  );
  const stale = applyStaleChaseGuard({
    candidate,
    currentPrice,
    guards: {
      maxChaseDistancePoints: config.maxChaseDistancePoints,
      maxChaseDistanceR: config.maxChaseDistanceR,
      staleSetupMaxCandles: config.staleSetupMaxCandles,
      targetAlreadySweptLookbackCandles: config.targetAlreadySweptLookbackCandles,
      allowRetestOnlyEntries: config.allowRetestOnlyEntries,
    },
  });
  const objectives = (analysis.structuredChartContext?.targetObjectives || candidate?.targetObjectivePlan?.objectives || []) as TargetObjective[];
  const targetCascade = buildTargetCascade({
    candidate,
    objectives,
    recentBars: bars['5m'],
    lookbackCandles: config.targetAlreadySweptLookbackCandles,
  });
  const decisionState = scannerStateFromDecision({
    decisionStatus: normalized.decisionStatus || (normalized.canExecute ? TradeDecisionStatus.ApprovedTrade : TradeDecisionStatus.Wait),
    candidate,
    stale,
    targetCascade,
  });
  const stateForAlert =
    candidate?.executionStatus === 'Executable' && decisionState === 'Conditional'
      ? 'Executable'
      : decisionState;
  const alertKey = scannerAlertKey({ tradeDate, instrument: config.instrument, session: window.session, candidate, state: stateForAlert });
  const existing = state.sent[alertKey];
  const alertDecision = shouldSendScannerAlert({
    state: stateForAlert,
    confidence: confidence.score,
    window,
    candidate,
    thresholds: config.thresholds,
    stale: stale.stale,
    duplicate: Boolean(existing),
    stateImproved: false,
  });

  console.log(`[scanner] ${session} ${completed5m.time}: ${stateForAlert} confidence ${confidence.score}/100 | ${sameCompletedCandle ? 'same completed 5M, refreshed live plan | ' : ''}${alertDecision.reason}`);
  state.lastCompleted5mBySession[sessionKey] = completed5m.time;

  if (alertDecision.shouldSend) {
    const planVersionId = createPlanVersionId(session, tradeDate);
    const payload = buildDiscordPayload({
      session,
      tradeDate,
      config,
      state: stateForAlert,
      confidence,
      candidate,
      normalized,
      currentPrice,
      completed5m,
      scoringTimestamp: scoringDate.toISOString(),
      scoringTimestampSource,
      windowLabel: window.label,
      staleReason: stale.reason,
      targetCascade,
      alertReason: alertDecision.reason,
    });
    payload.content = `${payload.content}\nPlan ID: \`${planVersionId}\``;
    await postDiscord(payload, config);
    state.sent[alertKey] = { state: stateForAlert, confidence: confidence.score, sentAt: new Date().toISOString() };
  }

  await writeState(state);
}

async function main() {
  if (hasArg('help')) {
    printHelp();
    return;
  }

  const config = loadConfig();
  console.log('Quant Desk local deterministic scanner started.');
  console.log(`Bridge: ${config.bridgeUrl} | Instrument: ${config.bridgeInstrument} | Poll: ${config.pollSeconds}s | Bar time: ${config.barTimeZone}/${config.barTimestampMode} | Discord: ${config.discordEnabled && !config.dryRun ? 'enabled' : 'dry-run/log only'}`);

  do {
    try {
      await runCycle(config);
    } catch (error) {
      console.error(`[scanner] cycle failed: ${formatError(error)}`);
    }
    if (!config.once && config.continuousMode) await sleep(config.pollSeconds * 1000);
  } while (!config.once && config.continuousMode);
}

main().catch((error) => {
  console.error(formatError(error));
  process.exitCode = 1;
});
