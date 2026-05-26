import dotenv from 'dotenv';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAppTradePlan } from '../../src/lib/planEngine';
import { createPlanVersionId } from '../../src/lib/planMetadata';
import { TRADE_RULES } from '../../src/config/tradeRules';
import { selectBestTwoScenarios } from '../../src/lib/scenarioSelection';
import { buildTradeJournalRecord } from '../../src/lib/tradeJournal';
import { buildNinjaChartContext, getNinjaHistoricalBars, type NinjaBridgeBar } from '../../src/lib/ninjaTraderBridge';
import { applyStaleChaseGuard, DEFAULT_SCANNER_RISK_GUARDS } from '../../src/lib/localScannerEngine';
import { type AnalysisResult, type ChartContext, type SetupCandidate, type StructuralLevel } from '../../src/types';
import { fetchCachedMarketBars, loadMarketDataConfig, upsertMarketBars, type MarketBarTimeframe } from './market-data-store';
import {
  applyNewsMacroCaution,
  fetchMacroCalendarEvents,
  loadMacroCalendarConfig,
  loadWeeklyVisualMacroCalendarConfig,
  type MacroCalendarEvent,
} from './macro-calendar';
import { renderChartMarkup, renderPriceLevelMap } from './chart-markup-renderer';
import {
  compactDiscordSummary,
  validateDiscordPayload,
  type CompactDiscordAttachmentState,
  type DiscordWebhookPayload,
} from './discord-alert-format';
import {
  PROFESSIONAL_MODEL_ONE_LABEL,
  PROFESSIONAL_MODEL_TWO_LABEL,
  professionalizeReportText,
} from './professional-report-language';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

type AlertJob = 'weekly' | 'premarket' | 'morning' | 'lunch';
type SessionAlertJob = 'morning' | 'lunch';
type Instrument = 'MES' | 'MNQ';

interface SchedulerConfig {
  instrument: Instrument;
  bridgeInstrument: string;
  bridgeUrl: string;
  pollSeconds: number;
  jobs: Record<AlertJob, { enabled: boolean; timeEt: string }>;
}

interface AlertState {
  sent: Record<string, string>;
}

interface DiscordLinkButton {
  type: 2;
  style: 5;
  label: string;
  url: string;
  emoji?: { name: string };
}

interface DiscordActionRow {
  type: 1;
  components: DiscordLinkButton[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_FILE = path.join(__dirname, '.discord-alert-state.json');
const DISCORD_AUDIT_DIR = path.join(__dirname, 'discord-audit');

const DEFAULT_CONFIG: SchedulerConfig = {
  instrument: 'MES',
  bridgeInstrument: 'MES 06-26',
  bridgeUrl: process.env.NINJATRADER_BRIDGE_URL || 'http://127.0.0.1:8765',
  pollSeconds: 30,
  jobs: {
    premarket: { enabled: true, timeEt: '09:15' },
    morning: { enabled: true, timeEt: '10:10' },
    lunch: { enabled: true, timeEt: '13:00' },
    weekly: { enabled: true, timeEt: '08:00' },
  },
};

const MORNING_EXECUTION_START_ET = '09:30';
const MORNING_EXECUTION_END_ET = TRADE_RULES.executionWindows.morningExecution.endET;
const LUNCH_EXECUTION_START_ET = TRADE_RULES.executionWindows.middayTrapReversal.startET;
const LUNCH_EXECUTION_END_ET = TRADE_RULES.executionWindows.middayTrapReversal.endET;
const MARKET_STRUCTURE_CACHE_LIMIT = 20000;

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

function printHelp() {
  console.log([
    'Quant Desk Master Trading Desk Discord alerts',
    '',
    'Usage:',
    '  npm run nt:discord-alerts',
    '  npm run nt:discord-alerts -- --once weekly --dry-run',
    '  npm run nt:discord-alerts -- --once morning --dry-run',
    '  npm run nt:discord-alerts -- --once lunch',
    '',
    'Environment:',
    '  DISCORD_WEBHOOK_URL       Required unless --dry-run is used.',
    '  NINJATRADER_BRIDGE_URL    Optional, defaults to http://127.0.0.1:8765.',
    '',
    'Options:',
    '  --once weekly|premarket|morning|lunch   Run one alert immediately.',
    '  --session weekly|premarket|morning|lunch Alias for --once, for replay/manual tests.',
    '  --date YYYY-MM-DD                 Trade date for --once/--session.',
    '  --as-of HH:MM                    End the replay/manual analysis at this ET time.',
    '  --dry-run                       Build the message without posting to Discord.',
    '  --instrument MES|MNQ             Defaults to MES.',
    '  --bridge-instrument "MES 06-26" Defaults to MES 06-26.',
  ].join('\n'));
}

function getEtParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
  };
}

function getEtTradeDate(date = new Date()): string {
  const parts = getEtParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getEtClock(date = new Date()): string {
  const parts = getEtParts(date);
  return `${parts.hour}:${parts.minute}`;
}

function previousMonthStartDate(tradeDate: string): string {
  const [year, month] = tradeDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 2, 1));
  return date.toISOString().slice(0, 10);
}

function getDayOfWeek(tradeDate: string): string {
  return new Date(`${tradeDate}T12:00:00`).toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
  });
}

function addDaysToTradeDate(tradeDate: string, days: number): string {
  const [year, month, day] = tradeDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12));
  return date.toISOString().slice(0, 10);
}

function weeklyPlanRange(tradeDate: string): { start: string; end: string; label: string } {
  const [year, month, day] = tradeDate.split('-').map(Number);
  const base = new Date(Date.UTC(year, month - 1, day, 12));
  const dayOfWeek = base.getUTCDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
  const start = addDaysToTradeDate(tradeDate, daysUntilMonday);
  const end = addDaysToTradeDate(start, 4);
  const label = `${new Date(`${start}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' })}-${new Date(`${end}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })}`;
  return { start, end, label };
}

function normalizeEtClock(value: string): string {
  const [hourRaw, minuteRaw = '00'] = value.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error(`Invalid ET clock value: ${value}. Use HH:MM.`);
  }
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function etDateTime(tradeDate: string, time: string): string {
  // The trading app currently uses ET wall-clock strings with the active US market offset.
  // This local scheduler is meant for RTH alerting; adjust here if replaying non-DST dates.
  return `${tradeDate}T${time}:00-04:00`;
}

async function readState(): Promise<AlertState> {
  try {
    return JSON.parse(await fs.readFile(STATE_FILE, 'utf8')) as AlertState;
  } catch {
    return { sent: {} };
  }
}

async function writeState(state: AlertState): Promise<void> {
  await fs.writeFile(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

async function fetchBars(config: SchedulerConfig, timeframe: MarketBarTimeframe, from: string, to: string): Promise<NinjaBridgeBar[]> {
  const marketCache = loadMarketDataConfig();
  if (marketCache) {
    const cached = await fetchCachedMarketBars({
      instrument: config.bridgeInstrument,
      timeframe,
      from,
      to,
      config: marketCache,
      limit: MARKET_STRUCTURE_CACHE_LIMIT,
    });
    if (cached.length) {
      console.log(`[market-cache] ${timeframe}: loaded ${cached.length} stored bars for ${from} -> ${to}.`);
      return cached;
    }
  }

  const response = await getNinjaHistoricalBars({
    instrument: config.bridgeInstrument,
    timeframe,
    from,
    to,
    limit: timeframe === '5m' ? 6000 : MARKET_STRUCTURE_CACHE_LIMIT,
    baseUrl: config.bridgeUrl,
  });
  if (!response.ok || !response.bars?.length) {
    throw new Error(response.error || `No ${timeframe} bars returned from NinjaTrader for ${from} -> ${to}.`);
  }
  if (marketCache) {
    try {
      await upsertMarketBars({
        bars: response.bars,
        instrument: config.instrument,
        bridgeInstrument: config.bridgeInstrument,
        timeframe,
        config: marketCache,
      });
      console.log(`[market-cache] ${timeframe}: repaired cache with ${response.bars.length} bridge bars.`);
    } catch (error) {
      console.warn(`[market-cache] ${timeframe}: cache repair skipped:`, error instanceof Error ? error.message : String(error));
    }
  }
  return response.bars;
}

async function buildPremarketContext(config: SchedulerConfig, tradeDate: string) {
  const contextStartDate = previousMonthStartDate(tradeDate);
  const [bars240m, bars60m, bars15m] = await Promise.all([
    fetchBars(config, '240m', etDateTime(contextStartDate, '18:00'), etDateTime(tradeDate, '09:15')),
    fetchBars(config, '60m', etDateTime(contextStartDate, '18:00'), etDateTime(tradeDate, '09:15')),
    fetchBars(config, '15m', etDateTime(contextStartDate, '18:00'), etDateTime(tradeDate, '09:15')),
  ]);
  const context = buildNinjaChartContext({
    bars5m: bars15m.map((bar) => ({ ...bar })),
    bars15m,
    bars60m,
    bars240m,
    sessionType: 'morning',
    instrument: config.instrument,
    tradeDate,
  });
  return applyNewsMacroCaution(context, new Date(etDateTime(tradeDate, '09:15')), loadMacroCalendarConfig());
}

async function buildWeeklyContext(config: SchedulerConfig, tradeDate: string) {
  const contextStartDate = previousMonthStartDate(tradeDate);
  const contextEnd = etDateTime(tradeDate, '08:00');
  const [bars240m, bars60m, bars15m] = await Promise.all([
    fetchBars(config, '240m', etDateTime(contextStartDate, '18:00'), contextEnd),
    fetchBars(config, '60m', etDateTime(contextStartDate, '18:00'), contextEnd),
    fetchBars(config, '15m', etDateTime(contextStartDate, '18:00'), contextEnd),
  ]);
  const context = buildNinjaChartContext({
    bars5m: bars15m.map((bar) => ({ ...bar })),
    bars15m,
    bars60m,
    bars240m,
    sessionType: 'morning',
    instrument: config.instrument,
    tradeDate,
  });
  return applyNewsMacroCaution(context, new Date(contextEnd), loadMacroCalendarConfig());
}

async function buildSessionAnalysis(config: SchedulerConfig, job: SessionAlertJob, tradeDate: string, asOfEt?: string): Promise<AnalysisResult> {
  const contextStartDate = previousMonthStartDate(tradeDate);
  const executionStart = job === 'morning' ? MORNING_EXECUTION_START_ET : LUNCH_EXECUTION_START_ET;
  const executionEnd = normalizeEtClock(asOfEt || (job === 'morning' ? MORNING_EXECUTION_END_ET : LUNCH_EXECUTION_END_ET));
  const contextTo = etDateTime(tradeDate, executionEnd);
  const [bars240m, bars60m, bars15m, bars5m] = await Promise.all([
    fetchBars(config, '240m', etDateTime(contextStartDate, '18:00'), contextTo),
    fetchBars(config, '60m', etDateTime(contextStartDate, '18:00'), contextTo),
    fetchBars(config, '15m', etDateTime(contextStartDate, '18:00'), contextTo),
    fetchBars(
      config,
      '5m',
      etDateTime(tradeDate, executionStart),
      etDateTime(tradeDate, executionEnd)
    ),
  ]);
  const baseChartContext = buildNinjaChartContext({
    bars5m,
    bars15m,
    bars60m,
    bars240m,
    sessionType: job,
    instrument: config.instrument,
    tradeDate,
  });
  const chartContext = await applyNewsMacroCaution(
    baseChartContext,
    new Date(etDateTime(tradeDate, executionEnd)),
    loadMacroCalendarConfig(),
  );

  return {
    dayType: 'NO TRADE',
    reasoning: `NinjaTrader automated ${job} analysis from OHLC bars. AI screenshots were not required.`,
    confidence: 0.5,
    checks: [{ label: 'NinjaTrader OHLC imported', passed: true }],
    structuredChartContext: chartContext || undefined,
    current_rule_analysis: {
      summary: `Structured OHLC context imported from NinjaTrader for ${job}. The app-owned pipeline controls the final decision.`,
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

function moneyLine(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : 'N/A';
}

function truncateDiscord(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

function discordValue(value: string, maxLength = 1024): string {
  const cleaned = professionalizeReportText(value).trim() || 'N/A';
  return truncateDiscord(cleaned, maxLength);
}

function getOutcomeBaseUrl(): string | null {
  const raw =
    process.env.DISCORD_OUTCOME_BASE_URL ||
    process.env.APP_URL ||
    process.env.VITE_AUTH_REDIRECT_URL ||
    '';
  return raw ? raw.replace(/\/$/, '') : null;
}

function base64Url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function signOutcomePayload(encodedPayload: string): string | null {
  const secret = process.env.DISCORD_OUTCOME_SECRET || '';
  if (!secret) return null;
  return crypto.createHmac('sha256', secret).update(encodedPayload).digest('hex');
}

function buildOutcomeUrl(args: {
  planVersionId: string;
  sessionType: SessionAlertJob;
  tradeDate: string;
  instrument: Instrument;
  outcome: string;
  tradeResult: 'win' | 'loss' | 'scratch' | 'no_trade' | 'missed_trade';
  tradeTaken: boolean;
  direction?: 'LONG' | 'SHORT' | 'NONE';
  targetHit?: 'T1' | 'T2' | 'NEAREST_LIQUIDITY' | 'STOP' | 'NONE';
}): string | null {
  const baseUrl = getOutcomeBaseUrl();
  if (!baseUrl) return null;
  const payload = {
    v: 1,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 14,
    pid: args.planVersionId,
    s: args.sessionType,
    d: args.tradeDate,
    i: args.instrument,
    dow: getDayOfWeek(args.tradeDate),
    o: args.outcome,
    tr: args.tradeResult,
    tt: args.tradeTaken,
    dir: args.direction || 'NONE',
    hit: args.targetHit || 'NONE',
  };
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signature = signOutcomePayload(encodedPayload);
  if (!signature) return null;
  return `${baseUrl}/api/discord-outcome?t=${encodeURIComponent(`${encodedPayload}.${signature}`)}`;
}

function outcomeButton(label: string, emoji: string, url: string): DiscordLinkButton {
  return {
    type: 2,
    style: 5,
    label,
    emoji: { name: emoji },
    url,
  };
}

function buildOutcomeComponents(args: {
  planVersionId: string;
  sessionType: SessionAlertJob;
  tradeDate: string;
  instrument: Instrument;
}): DiscordActionRow[] | undefined {
  const makeUrl = (
    outcome: string,
    tradeResult: 'win' | 'loss' | 'scratch' | 'no_trade' | 'missed_trade',
    tradeTaken: boolean,
    direction: 'LONG' | 'SHORT' | 'NONE',
    targetHit: 'T1' | 'T2' | 'NEAREST_LIQUIDITY' | 'STOP' | 'NONE'
  ) => buildOutcomeUrl({ ...args, outcome, tradeResult, tradeTaken, direction, targetHit });

  const longT1 = makeUrl('long_t1', 'win', true, 'LONG', 'T1');
  const longT2 = makeUrl('long_t2', 'win', true, 'LONG', 'T2');
  const longLiquidity = makeUrl('long_nearest_liquidity', 'win', true, 'LONG', 'NEAREST_LIQUIDITY');
  const longStopped = makeUrl('long_stopped', 'loss', true, 'LONG', 'STOP');
  const shortT1 = makeUrl('short_t1', 'win', true, 'SHORT', 'T1');
  const shortT2 = makeUrl('short_t2', 'win', true, 'SHORT', 'T2');
  const shortLiquidity = makeUrl('short_nearest_liquidity', 'win', true, 'SHORT', 'NEAREST_LIQUIDITY');
  const shortStopped = makeUrl('short_stopped', 'loss', true, 'SHORT', 'STOP');
  const scratch = makeUrl('scratch', 'scratch', true, 'NONE', 'NONE');
  const notTaken = makeUrl('not_taken', 'no_trade', false, 'NONE', 'NONE');
  const missed = makeUrl('missed_trade', 'missed_trade', false, 'NONE', 'NONE');

  if (!longT1 || !longT2 || !longLiquidity || !longStopped || !shortT1 || !shortT2 || !shortLiquidity || !shortStopped || !scratch || !notTaken || !missed) {
    return undefined;
  }

  return [
    {
      type: 1,
      components: [
        outcomeButton('LONG T1 Hit', '🟢', longT1),
        outcomeButton('LONG T2 Hit', '🏆', longT2),
        outcomeButton('LONG Liquidity', '🎯', longLiquidity),
        outcomeButton('LONG Stopped', '🛑', longStopped),
      ],
    },
    {
      type: 1,
      components: [
        outcomeButton('SHORT T1 Hit', '🔴', shortT1),
        outcomeButton('SHORT T2 Hit', '🏆', shortT2),
        outcomeButton('SHORT Liquidity', '🎯', shortLiquidity),
        outcomeButton('SHORT Stopped', '🛑', shortStopped),
      ],
    },
    {
      type: 1,
      components: [
        outcomeButton('Scratch / BE', '⚪', scratch),
        outcomeButton('Not Taken', '🚫', notTaken),
        outcomeButton('Missed Trade', '⏭️', missed),
      ],
    },
  ];
}

function supabaseRestUrl(): string | null {
  const raw = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  return raw ? raw.replace(/\/$/, '') : null;
}

async function upsertDiscordAlertRagRecord(args: {
  planVersionId: string;
  job: SessionAlertJob;
  tradeDate: string;
  instrument: Instrument;
  analysis: AnalysisResult;
  normalized: ReturnType<typeof buildAppTradePlan>;
  candidates: SetupCandidate[];
}): Promise<void> {
  const supabaseUrl = supabaseRestUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const userId = process.env.DISCORD_RAG_USER_ID || '';
  if (!supabaseUrl || !serviceRoleKey || !userId) {
    console.warn('Discord alert RAG pending save skipped. Set SUPABASE_URL/VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and DISCORD_RAG_USER_ID to let Discord buttons update RAG.');
    return;
  }

  const selectedCandidate = args.candidates[0] || null;
  const journalRecord = buildTradeJournalRecord({
    dateTime: new Date().toISOString(),
    instrument: args.instrument,
    session: args.job,
    candidate: selectedCandidate,
    scannerScore: selectedCandidate ? candidateConfidenceScore(selectedCandidate) : null,
    entry: args.normalized.entry ?? selectedCandidate?.entry ?? null,
    stop: args.normalized.stop ?? selectedCandidate?.stop ?? null,
    target: args.normalized.t1 ?? selectedCandidate?.target1 ?? null,
    outcome: 'pending',
    discordAlertId: args.planVersionId,
    notes: 'Discord alert created. Awaiting trader outcome button.',
  });
  const payload = {
    user_id: userId,
    session_type: args.job,
    trade_date: args.tradeDate,
    day_of_week: getDayOfWeek(args.tradeDate),
    instrument: args.instrument,
    trade_result: 'pending',
    outcome: null,
    source: 'discord_alert',
    analysis_mode: 'live',
    setup_quality_score: 0.5,
    plan_version_id: args.planVersionId,
    entry_price: args.normalized.entry ?? selectedCandidate?.entry ?? null,
    stop_price: args.normalized.stop ?? selectedCandidate?.stop ?? null,
    target_1_price: args.normalized.t1 ?? selectedCandidate?.target1 ?? null,
    target_2_price: args.normalized.t2 ?? selectedCandidate?.target2 ?? null,
    risk_points: args.normalized.riskPoints ?? selectedCandidate?.riskPoints ?? null,
    embedding_text: [
      `Discord alert pending outcome for ${args.job} ${args.instrument} on ${args.tradeDate}.`,
      `Plan: ${args.normalized.decisionLabel || args.normalized.decision} ${args.normalized.setupName || ''}.`,
      `Journal model: ${journalRecord.modelType}. Tags: ${journalRecord.setupTags.join(', ') || 'none'}. Planned R: ${journalRecord.plannedR ?? 'pending'}.`,
      `Outcome buttons will record whether trade was taken, direction, and target result.`,
    ].join(' '),
    trade_plan_json: {
      planVersionId: args.planVersionId,
      discordOutcomeButtons: true,
      journalRecord,
      normalizedPlan: args.normalized,
      setupCandidates: args.candidates,
      targetObjectives: args.analysis.structuredChartContext?.targetObjectives || [],
      outcome: {
        tradeTaken: null,
        direction: null,
        targetHit: null,
        source: 'discord_button_pending',
      },
    },
    gemini_analysis_json: args.analysis,
    notes: 'Discord alert created. Awaiting trader outcome button.',
  };

  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
  const updateResponse = await fetch(`${supabaseUrl}/rest/v1/trade_embeddings?plan_version_id=eq.${encodeURIComponent(args.planVersionId)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload),
  });
  if (!updateResponse.ok) {
    throw new Error(`Discord alert RAG update failed (${updateResponse.status}): ${await updateResponse.text()}`);
  }
  const updatedRows = await updateResponse.json().catch(() => []);
  if (Array.isArray(updatedRows) && updatedRows.length > 0) return;

  const insertResponse = await fetch(`${supabaseUrl}/rest/v1/trade_embeddings`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!insertResponse.ok) {
    throw new Error(`Discord alert RAG insert failed (${insertResponse.status}): ${await insertResponse.text()}`);
  }
}

function currentPriceFromAnalysis(analysis: AnalysisResult): number | null {
  const currentPrice = analysis.structuredChartContext?.keyLevels?.currentPrice;
  if (typeof currentPrice === 'number' && Number.isFinite(currentPrice)) return currentPrice;
  const candles = analysis.structuredChartContext?.candles || [];
  const lastCandle = candles[candles.length - 1];
  return typeof lastCandle?.close === 'number' && Number.isFinite(lastCandle.close) ? lastCandle.close : null;
}

function topConditionalCandidates(candidates: SetupCandidate[] | undefined, currentPrice: number | null): SetupCandidate[] {
  const freshCandidates = (candidates || []).filter((candidate) => !applyStaleChaseGuard({
    candidate,
    currentPrice,
    guards: DEFAULT_SCANNER_RISK_GUARDS,
  }).stale);
  return selectBestTwoScenarios(freshCandidates);
}

function compactSentence(value?: string | null, maxLength = 150): string | null {
  const text = String(value || '').trim();
  if (!text) return null;
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 3)}...`;
}

function candidateConfidenceScore(candidate: SetupCandidate): number {
  if (typeof candidate.decisionQualityScore === 'number') return candidate.decisionQualityScore;
  const base =
    candidate.executionStatus === 'Executable' ? 55 :
    candidate.executionStatus === 'Conditional' ? 42 :
    candidate.executionStatus === 'Blocked' ? 35 :
    20;
  const confidence =
    candidate.confidence === 'High' ? 15 :
    candidate.confidence === 'Medium' ? 8 :
    2;
  const trigger = candidate.requiredTrigger ? 8 : 0;
  const stop = candidate.stop ? 8 : 0;
  const target = candidate.target1 && candidate.target2 ? 8 : 0;
  const context = candidate.levelContextScore ? Math.min(6, Math.round(candidate.levelContextScore / 4)) : 0;
  return Math.max(0, Math.min(100, Math.round(base + confidence + trigger + stop + target + context)));
}

function formatEventTimeEt(event: MacroCalendarEvent): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(event.date));
}

function formatEventCautionWindow(event: MacroCalendarEvent): string {
  const config = loadMacroCalendarConfig();
  const eventMs = new Date(event.date).getTime();
  const before = new Date(eventMs - config.cautionBeforeMinutes * 60_000);
  const after = new Date(eventMs + config.cautionAfterMinutes * 60_000);
  return `${formatEventTimeEt({ ...event, date: before.toISOString() })}-${formatEventTimeEt({ ...event, date: after.toISOString() })} ET`;
}

function eventInsideMorningWindow(event: MacroCalendarEvent, tradeDate: string): boolean {
  const eventMs = new Date(event.date).getTime();
  const start = new Date(etDateTime(tradeDate, MORNING_EXECUTION_START_ET)).getTime();
  const end = new Date(etDateTime(tradeDate, MORNING_EXECUTION_END_ET)).getTime();
  return Number.isFinite(eventMs) && eventMs >= start && eventMs <= end;
}

async function formatMorningNewsBrief(tradeDate: string, context: Partial<ChartContext> | null): Promise<string> {
  const config = loadMacroCalendarConfig();
  const events = (await fetchMacroCalendarEvents(config, new Date(etDateTime(tradeDate, '09:15'))))
    .filter((event) => getEtTradeDate(new Date(event.date)) === tradeDate)
    .sort((a, b) => a.date.localeCompare(b.date));
  const active = context?.newsMacroCaution;
  const lines = events.slice(0, 6).map((event) => {
    const overlap = eventInsideMorningWindow(event, tradeDate) ? 'overlaps morning scan' : 'outside morning scan';
    return `• 🗞️ **${formatEventTimeEt(event)} ET:** ${event.country} ${event.impact} Impact - ${event.title} (${overlap}; caution ${formatEventCautionWindow(event)})`;
  });

  return [
    lines.length ? lines.join('\n') : '✅ No configured USA medium/high-impact events found for this trade date.',
    active?.active
      ? `\n⚠️ Active caution: ${active.eventLabel || 'USA macro event'}${active.minutesUntil ? ` in ${active.minutesUntil} min` : active.minutesAfter != null ? ` released ${active.minutesAfter} min ago` : ''}. Wait for post-release structure confirmation.`
      : '\n✅ Active caution: none at the report timestamp.',
    '🚫 Desk rule: do not chase pre-news movement. Wait for sweep/reclaim and confirmed 5M structure.',
  ].join('\n');
}

async function formatDailyPlanNewsBrief(tradeDate: string, context: Partial<ChartContext> | null): Promise<string> {
  const config = loadMacroCalendarConfig();
  const events = (await fetchMacroCalendarEvents(config, new Date(etDateTime(tradeDate, '09:15'))))
    .filter((event) => getEtTradeDate(new Date(event.date)) === tradeDate)
    .sort((a, b) => a.date.localeCompare(b.date));
  const active = context?.newsMacroCaution;
  const lines = events.slice(0, 8).map((event) => {
    const icon = event.impact.toLowerCase() === 'high' ? '🗞️' : '⚠️';
    return `• ${icon} **${formatEventTimeEt(event)} ET:** ${event.country} ${event.impact} Impact - ${event.title} (caution ${formatEventCautionWindow(event)})`;
  });

  return [
    lines.length ? lines.join('\n') : '✅ No configured USA medium/high-impact events found for this trade date.',
    active?.active
      ? `\n⚠️ Active caution: ${active.eventLabel || 'USA macro event'}${active.minutesUntil ? ` in ${active.minutesUntil} min` : active.minutesAfter != null ? ` released ${active.minutesAfter} min ago` : ''}. Wait for post-release 5M structure confirmation.`
      : '\n✅ Active caution: none at the scoring timestamp.',
    '🚫 Desk rule: news does not create a trade. It only raises the confirmation standard.',
  ].join('\n');
}

function formatEventWeekday(event: MacroCalendarEvent): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
  }).format(new Date(event.date));
}

async function formatWeeklyNewsBrief(tradeDate: string): Promise<string> {
  const config = loadWeeklyVisualMacroCalendarConfig();
  const range = weeklyPlanRange(tradeDate);
  const events = (await fetchMacroCalendarEvents(config, new Date(etDateTime(tradeDate, '08:00'))))
    .filter((event) => {
      const eventDate = getEtTradeDate(new Date(event.date));
      return eventDate >= range.start && eventDate <= range.end;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!events.length) {
    return '✅ No configured USA high/medium-impact events found for the week. Keep normal macro caution rules active.';
  }

  return [
    ...events.slice(0, 10).map((event) =>
      event.impact.toLowerCase() === 'high'
        ? `• 🗞️ **${formatEventWeekday(event)} ${formatEventTimeEt(event)} ET:** ${event.country} ${event.impact} Impact - ${event.title} (hard caution ${formatEventCautionWindow(event)})`
        : `• ⚠️ **${formatEventWeekday(event)} ${formatEventTimeEt(event)} ET:** ${event.country} ${event.impact} Impact - ${event.title} (caution ${formatEventCautionWindow(event)})`
    ),
    events.length > 10 ? `• +${events.length - 10} more configured event(s) in the weekly calendar.` : null,
    '🚫 Desk rule: high- and medium-impact USA events trigger caution. Do not force fresh entries inside the caution window unless post-release 5M structure is already clean.',
  ].filter(Boolean).join('\n');
}

function isLiquidityLevel(level: StructuralLevel): boolean {
  return ['high', 'low', 'swing', 'liquidity_pool'].includes(level.type);
}

function sourceRank(source: StructuralLevel['source']): number {
  const order: StructuralLevel['source'][] = [
    'monthly_rth',
    'monthly_eth',
    'weekly_rth',
    'weekly_eth',
    'full_context',
    'three_day_rth',
    'three_day_eth',
    'previous_rth',
    'prior_eth',
    'asian',
    'london',
    'ny_premarket',
    'rth_morning',
    'current_window',
  ];
  const index = order.indexOf(source);
  return index >= 0 ? index : order.length;
}

function rankLiquidityLevels(levels: StructuralLevel[], currentPrice: number | null, side: 'buy' | 'sell'): StructuralLevel[] {
  const filtered = levels
    .filter(isLiquidityLevel)
    .filter((level) => side === 'buy' ? level.type === 'high' || level.directionRelevance === 'LONG' : level.type === 'low' || level.directionRelevance === 'SHORT');

  return filtered.sort((a, b) => {
    const aRelevant = currentPrice == null ? true : side === 'buy' ? a.price >= currentPrice : a.price <= currentPrice;
    const bRelevant = currentPrice == null ? true : side === 'buy' ? b.price >= currentPrice : b.price <= currentPrice;
    if (aRelevant !== bRelevant) return aRelevant ? -1 : 1;
    if (currentPrice != null) {
      const distance = Math.abs(a.price - currentPrice) - Math.abs(b.price - currentPrice);
      if (distance !== 0) return distance;
    }
    const rank = sourceRank(a.source) - sourceRank(b.source);
    if (rank !== 0) return rank;
    return side === 'buy' ? a.price - b.price : b.price - a.price;
  });
}

function uniqueLevels(levels: StructuralLevel[]): StructuralLevel[] {
  const seen = new Set<string>();
  return levels.filter((level) => {
    const key = `${level.label}:${level.price}:${level.source}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function levelSourceLabel(level: StructuralLevel): string {
  switch (level.source) {
    case 'monthly_rth':
      return 'Monthly RTH';
    case 'monthly_eth':
      return 'Monthly ETH';
    case 'weekly_rth':
      return 'Weekly RTH';
    case 'weekly_eth':
      return 'Weekly ETH';
    case 'three_day_rth':
      return '3D RTH';
    case 'three_day_eth':
      return '3D ETH';
    case 'previous_rth':
      return 'Prior RTH';
    case 'prior_eth':
      return 'Prior ETH';
    case 'asian':
      return 'Asian ETH';
    case 'london':
      return 'London ETH';
    case 'ny_premarket':
      return 'NY premarket';
    case 'rth_morning':
      return 'RTH morning';
    case 'current_window':
      return 'Active 5M/15M';
    case 'full_context':
      return level.contextRuleTags?.includes('4h_macro_context') ? '4H macro'
        : level.contextRuleTags?.includes('1h_session_context') ? '1H session'
        : 'Full ETH / HTF';
    default:
      return 'Chart context';
  }
}

function formatLevelWithSource(level: StructuralLevel): string {
  return `\`${level.price}\` ${level.label} _(${levelSourceLabel(level)})_`;
}

function formatLevelList(levels: StructuralLevel[], max = 3): string {
  const selected = uniqueLevels(levels).slice(0, max);
  if (!selected.length) return 'N/A';
  return selected.map(formatLevelWithSource).join(' / ');
}

function levelsBySources(levels: StructuralLevel[], sources: StructuralLevel['source'][]): StructuralLevel[] {
  return levels.filter((level) => sources.includes(level.source));
}

function formatLevelsOfInterest(context: Partial<ChartContext> | null): string {
  const levels = context?.structuralLevels || [];
  const currentPrice = typeof context?.keyLevels?.currentPrice === 'number' ? context.keyLevels.currentPrice : null;
  const buySide = rankLiquidityLevels(levels, currentPrice, 'buy');
  const sellSide = rankLiquidityLevels(levels, currentPrice, 'sell');
  const decisionLevel = sellSide[0] || buySide[0] || null;
  const upsideTargets = uniqueLevels(buySide).filter((level) => !decisionLevel || level.price !== decisionLevel.price).slice(0, 3);
  const downsideTargets = uniqueLevels(sellSide).filter((level) => !decisionLevel || level.price !== decisionLevel.price).slice(0, 3);

  if (!decisionLevel) {
    return [
      '🧱 No primary decision level was available from the imported OHLC.',
      '🕯️ Wait for the live 5M chart to build active swing liquidity.',
    ].join('\n');
  }

  return [
    `Going into today’s session, the desk is focused on ${formatLevelWithSource(decisionLevel)}.`,
    '',
    `• 📈 Holding above ${formatLevelWithSource(decisionLevel)} keeps upside liquidity in play:`,
    `  ${upsideTargets.length ? upsideTargets.map(formatLevelWithSource).join(' / ') : 'N/A'}`,
    '',
    `• 📉 Breaking and holding below ${formatLevelWithSource(decisionLevel)} opens downside liquidity:`,
    `  ${downsideTargets.length ? downsideTargets.map(formatLevelWithSource).join(' / ') : 'N/A'}`,
    '',
    '🚫 Desk rule: this is not an entry signal. Let price sweep, reclaim, reject, or hold, then require the 5M model trigger.',
  ].join('\n');
}

function formatMorningLiquidityLadder(context: Partial<ChartContext> | null): string {
  const levels = context?.structuralLevels || [];
  const currentPrice = typeof context?.keyLevels?.currentPrice === 'number' ? context.keyLevels.currentPrice : null;
  const macroSources: StructuralLevel['source'][] = ['monthly_rth', 'monthly_eth', 'weekly_rth', 'weekly_eth', 'full_context'];
  const sessionSources: StructuralLevel['source'][] = ['three_day_rth', 'three_day_eth', 'previous_rth', 'prior_eth', 'asian', 'london', 'ny_premarket'];
  const executionSources: StructuralLevel['source'][] = ['rth_morning', 'current_window'];
  const macro = levelsBySources(levels, macroSources);
  const session = levelsBySources(levels, sessionSources);
  const execution = levelsBySources(levels, executionSources);
  const activeSwingHigh = context?.keyLevels?.activeSwingHigh;
  const activeSwingLow = context?.keyLevels?.activeSwingLow;
  const executionBuy = formatLevelList(rankLiquidityLevels(execution, currentPrice, 'buy'), 1);
  const executionSell = formatLevelList(rankLiquidityLevels(execution, currentPrice, 'sell'), 1);
  const executionText = [
    `📈 Buy-side: ${executionBuy}${executionBuy === 'N/A' && typeof activeSwingHigh === 'number' ? ` / \`${activeSwingHigh}\` active 5M/15M swing high` : ''}`,
    `📉 Sell-side: ${executionSell}${executionSell === 'N/A' && typeof activeSwingLow === 'number' ? ` / \`${activeSwingLow}\` active 5M/15M swing low` : ''}`,
  ].join('\n');

  return [
    `💵 Current price: \`${moneyLine(currentPrice)}\``,
    '',
    '**🌐 Macro Liquidity - month/week/4H/1H context**',
    `📈 Buy-side: ${formatLevelList(rankLiquidityLevels(macro, currentPrice, 'buy'), 2)}`,
    `📉 Sell-side: ${formatLevelList(rankLiquidityLevels(macro, currentPrice, 'sell'), 2)}`,
    '',
    '**🕒 Session Liquidity - prior days / ETH / Asian / London / NY premarket**',
    `📈 Buy-side: ${formatLevelList(rankLiquidityLevels(session, currentPrice, 'buy'), 2)}`,
    `📉 Sell-side: ${formatLevelList(rankLiquidityLevels(session, currentPrice, 'sell'), 2)}`,
    '',
    '**🎯 Execution Liquidity - active 5M/15M map into the open**',
    executionText,
  ].join('\n');
}

function formatMorningSetupWatchlist(context: Partial<ChartContext> | null): string {
  const levels = context?.structuralLevels || [];
  const currentPrice = typeof context?.keyLevels?.currentPrice === 'number' ? context.keyLevels.currentPrice : null;
  const buySide = rankLiquidityLevels(levels, currentPrice, 'buy');
  const sellSide = rankLiquidityLevels(levels, currentPrice, 'sell');
  const structure = context?.multiTimeframeContext?.alignment?.alignedDirection || context?.marketStructure?.trend || 'unknown';
  const longArea = formatLevelList(sellSide, 2);
  const longTargets = formatLevelList(buySide, 2);
  const shortArea = formatLevelList(buySide, 2);
  const shortTargets = formatLevelList(sellSide, 2);

  return [
    `🧭 Big-picture: \`${String(structure)}\`. With-structure ranks higher; against-structure stays conditional until failure confirms.`,
    '',
    `**1️⃣ 🟢 LONG - ${PROFESSIONAL_MODEL_ONE_LABEL}**`,
    `📉 Stalk sell-side: ${longArea}.`,
    '✅ Need: stop-run -> reclaim -> displacement -> structure shift -> imbalance pullback.',
    `🎯 First targets: ${longTargets}.`,
    '🛡️ Gate: 5M entry, structure stop, minimum 2.0R.',
    '',
    `**2️⃣ 🔴 SHORT - ${PROFESSIONAL_MODEL_TWO_LABEL}**`,
    `📈 Stalk buy-side: ${shortArea}.`,
    '✅ Need: raid -> failed continuation -> reclaim below swept high -> valid entry/retest.',
    `🎯 First targets: ${shortTargets}.`,
    '🛡️ Gate: counter-structure remains conditional until failure is clear.',
  ].join('\n');
}

function formatWeeklyRecap(context: Partial<ChartContext> | null): string {
  const story = context?.sessionStory;
  const alignment = context?.multiTimeframeContext?.alignment;
  const trend = context?.marketStructure?.trend || 'unknown';
  return [
    `🧭 Last imported structure: \`${String(trend)}\`.`,
    alignment ? `🌐 Timeframe stack: 4H=${alignment.macroBias}, 1H=${alignment.sessionBias}, 15M=${alignment.liquidityBias}, 5M proxy=${alignment.executionBias}.` : '🌐 Timeframe stack unavailable from imported OHLC.',
    story?.summary ? `📖 Session story: ${story.summary}` : '📖 Session story: no dominant prior-month/weekly narrative detected yet.',
    story?.notes?.[0] ? `📝 Note: ${compactSentence(story.notes[0], 180)}` : null,
    '⚠️ Recap is context only. The desk still requires approved 5M execution during Morning/Lunch windows.',
  ].filter(Boolean).join('\n');
}

function formatWeeklyMarketContext(context: Partial<ChartContext> | null): string {
  const alignment = context?.multiTimeframeContext?.alignment;
  const htf = context?.higherTimeframeThesis;
  const currentPrice = typeof context?.keyLevels?.currentPrice === 'number' ? context.keyLevels.currentPrice : null;
  const bias = htf?.direction && htf.direction !== 'NO TRADE'
    ? htf.direction
    : alignment?.alignedDirection || 'UNKNOWN';
  return [
    `💵 Reference price: \`${moneyLine(currentPrice)}\``,
    `🧭 Parent bias: \`${bias}\``,
    htf?.reason ? `📌 HTF thesis: ${compactSentence(htf.reason, 180)}` : null,
    context?.dealingRangeQuality
      ? `⚖️ Dealing range: ${context.dealingRangeQuality.location} | Midpoint \`${moneyLine(context.dealingRangeQuality.midpoint)}\` | Source ${context.dealingRangeQuality.rangeSource || 'unknown'}`
      : '⚖️ Dealing range: unavailable until enough OHLC range context is loaded.',
    alignment?.conflicts?.length ? `⚠️ Conflict: ${compactSentence(alignment.conflicts.join(' '), 180)}` : '✅ No major timeframe conflict detected in the imported stack.',
  ].filter(Boolean).join('\n');
}

function formatWeeklyLiquidityMap(context: Partial<ChartContext> | null): string {
  const levels = context?.structuralLevels || [];
  const currentPrice = typeof context?.keyLevels?.currentPrice === 'number' ? context.keyLevels.currentPrice : null;
  const macroSources: StructuralLevel['source'][] = ['monthly_rth', 'monthly_eth', 'weekly_rth', 'weekly_eth', 'full_context'];
  const sessionSources: StructuralLevel['source'][] = ['three_day_rth', 'three_day_eth', 'previous_rth', 'prior_eth'];
  const macro = levelsBySources(levels, macroSources);
  const session = levelsBySources(levels, sessionSources);
  return [
    '**🌐 Parent Liquidity - month/week/4H/1H**',
    `📈 Buy-side: ${formatLevelList(rankLiquidityLevels(macro, currentPrice, 'buy'), 3)}`,
    `📉 Sell-side: ${formatLevelList(rankLiquidityLevels(macro, currentPrice, 'sell'), 3)}`,
    '',
    '**🕒 Session Liquidity - prior RTH / 3D / ETH**',
    `📈 Buy-side: ${formatLevelList(rankLiquidityLevels(session, currentPrice, 'buy'), 3)}`,
    `📉 Sell-side: ${formatLevelList(rankLiquidityLevels(session, currentPrice, 'sell'), 3)}`,
  ].join('\n');
}

function formatWeeklyLevelsOfInterest(context: Partial<ChartContext> | null): string {
  return formatLevelsOfInterest(context)
    .replace('Going into today’s session', 'Going into the week')
    .replace('opens downside liquidity', 'opens downside liquidity for the week');
}

function formatWeeklyApprovedModels(context: Partial<ChartContext> | null): string {
  const levels = context?.structuralLevels || [];
  const currentPrice = typeof context?.keyLevels?.currentPrice === 'number' ? context.keyLevels.currentPrice : null;
  const buySide = formatLevelList(rankLiquidityLevels(levels, currentPrice, 'buy'), 2);
  const sellSide = formatLevelList(rankLiquidityLevels(levels, currentPrice, 'sell'), 2);
  return [
    `**1️⃣ 🟢 ${PROFESSIONAL_MODEL_ONE_LABEL}**`,
    `📉 Best long stalk: sell-side sweep near ${sellSide}.`,
    '✅ Required: stop-run -> reclaim -> displacement -> structure shift -> imbalance pullback -> 5M entry/structure stop -> minimum 2.0R.',
    `🎯 Upside draw: ${buySide}.`,
    '',
    `**2️⃣ 🔴 ${PROFESSIONAL_MODEL_TWO_LABEL}**`,
    `📈 Best short stalk: buy-side raid near ${buySide}.`,
    '✅ Required: meaningful raid -> failed continuation -> reclaim -> valid entry/retest -> stop beyond sweep wick -> minimum 2.0R.',
    `🎯 Downside draw: ${sellSide}.`,
    '',
    '🚫 Supporting evidence can improve quality, but it cannot create a third model.',
  ].join('\n');
}

function formatWeeklyDeskRules(): string {
  return [
    '✅ Best trades: with big-picture structure, at meaningful liquidity, after sweep/reclaim, with clean 5M trigger and 2.0R.',
    '🟡 Conditional only: counter-structure, minor structure break without inducement swept, news caution, chop, stale setup, or obstacle before 1R.',
    '🔴 No trade: no sweep, no reclaim, no valid 5M trigger, wrong-side stop, under 2.0R, or outside approved scan windows.',
    '🧠 Parent rule: big-picture structure is the map. The 5M execution chart is the trigger.',
  ].join('\n');
}

type NormalizedAppTradePlan = ReturnType<typeof buildAppTradePlan>;

async function writeDiscordAuditLog(args: {
  job: SessionAlertJob;
  tradeDate: string;
  instrument: Instrument;
  planVersionId: string;
  analysis: AnalysisResult;
  normalized: NormalizedAppTradePlan;
  candidates: SetupCandidate[];
  chartMarkup: string | null;
  levelMap: string | null;
}): Promise<string> {
  await fs.mkdir(DISCORD_AUDIT_DIR, { recursive: true });
  const file = path.join(DISCORD_AUDIT_DIR, `${args.job}-${args.tradeDate}-${args.instrument}-${args.planVersionId}.json`);
  await fs.writeFile(file, JSON.stringify({
    createdAt: new Date().toISOString(),
    job: args.job,
    tradeDate: args.tradeDate,
    instrument: args.instrument,
    planVersionId: args.planVersionId,
    normalizedPlan: args.normalized,
    candidates: args.candidates,
    structuredChartContext: args.analysis.structuredChartContext || null,
    sessionLog: args.analysis.sessionLog || null,
    attachments: {
      chartMarkup: args.chartMarkup,
      priceLevelMap: args.levelMap,
    },
  }, null, 2));
  return file;
}

async function formatPlanPayload(args: {
  job: SessionAlertJob;
  tradeDate: string;
  planVersionId: string;
  instrument: Instrument;
  normalized: NormalizedAppTradePlan;
  candidates: SetupCandidate[];
  attachments: CompactDiscordAttachmentState;
}): Promise<DiscordWebhookPayload> {
  return compactDiscordSummary({
    session: args.job,
    tradeDate: args.tradeDate,
    planVersionId: args.planVersionId,
    instrument: args.instrument,
    normalized: args.normalized,
    candidates: args.candidates,
    attachments: args.attachments,
    sourceLabel: args.job === 'morning' ? 'Morning' : 'Lunch',
    windowLabel: args.job === 'morning'
      ? `${MORNING_EXECUTION_START_ET}-${MORNING_EXECUTION_END_ET} ET`
      : `${LUNCH_EXECUTION_START_ET}-${LUNCH_EXECUTION_END_ET} ET`,
    components: buildOutcomeComponents({
      planVersionId: args.planVersionId,
      sessionType: args.job,
      tradeDate: args.tradeDate,
      instrument: args.instrument,
    }),
  });
}

async function formatWeeklyPayload(tradeDate: string, context: Partial<ChartContext> | null, instrument: Instrument): Promise<DiscordWebhookPayload> {
  const range = weeklyPlanRange(tradeDate);
  const newsBrief = await formatWeeklyNewsBrief(tradeDate);
  const levels = context?.structuralLevels || [];
  return {
    username: 'Quant Desk',
    content: `# 🧭 Quant Desk Weekly Plan — ${instrument} ${range.label}\n🧠 Parent report for the week. Daily Morning/Lunch plans must trade inside this map.`,
    embeds: [
      {
        title: `🧭 Master Trading Desk Weekly Plan — ${range.label}`,
        description: '⚠️ Context only. This report builds the weekly map; it does not approve trades or place orders.',
        color: 0xffd54f,
        fields: [
          {
            name: '1️⃣ 📌 Weekly Recap',
            value: discordValue(formatWeeklyRecap(context)),
            inline: false,
          },
          {
            name: '2️⃣ 🧱 Market Context',
            value: discordValue(formatWeeklyMarketContext(context)),
            inline: false,
          },
          {
            name: '3️⃣ 🎯 Levels of Interest',
            value: discordValue(formatWeeklyLevelsOfInterest(context)),
            inline: false,
          },
          {
            name: '4️⃣ 💧 Liquidity Map',
            value: discordValue(formatWeeklyLiquidityMap(context)),
            inline: false,
          },
          {
            name: '5️⃣ 🧠 Approved Models For The Week',
            value: discordValue(formatWeeklyApprovedModels(context)),
            inline: false,
          },
          {
            name: '6️⃣ 🗞️ USA News Calendar',
            value: discordValue(newsBrief),
            inline: false,
          },
          {
            name: '7️⃣ ⚖️ Weekly Decision Rules',
            value: discordValue(formatWeeklyDeskRules()),
            inline: false,
          },
          {
            name: '8️⃣ 🕒 Execution Windows',
            value: discordValue([
              '👀 9:30-10:00 AM ET: Opening observation only.',
              '🔎 10:00-11:15 AM ET: Morning setup scanning after the opening range forms.',
              '🍽️ 11:50 AM-1:00 PM ET: Lunch setup scanning.',
              '🗺️ Outside those windows: Market Mapping only. No trade approval.',
              `🧱 Structured levels loaded: ${levels.length}.`,
            ].join('\n')),
            inline: false,
          },
        ],
        footer: { text: 'Quant Desk • Weekly Parent Map • App-Owned Trade Pipeline • No automated orders' },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

async function formatPremarketPayload(tradeDate: string, context: Partial<ChartContext> | null, instrument: Instrument): Promise<DiscordWebhookPayload> {
  const levels = context?.structuralLevels || [];
  const high = context?.keyLevels?.overnightHigh;
  const low = context?.keyLevels?.overnightLow;
  const trend = context?.marketStructure?.trend || 'unknown';
  const newsBrief = await formatMorningNewsBrief(tradeDate, context);
  return {
    username: 'Quant Desk',
    content: `# 🌅 Quant Desk Morning Brief — ${instrument} ${tradeDate}\n🧠 Desk prep only. Trade alerts still require the live 5M scanner.`,
    embeds: [
      {
        title: `🌙 Quant Desk Master Trading Desk Morning Brief — ${tradeDate}`,
        description: '⚠️ Context only. The 5M execution chart and app-owned pipeline still decide any trade plan.',
        color: 0x2962ff,
        fields: [
          {
            name: '📈 Instrument / Source',
            value: `📈 ${instrument} | 🕯️ NinjaTrader OHLC`,
            inline: true,
          },
          {
            name: '🧭 Broader Trend',
            value: discordValue(`🧭 ${String(trend)}`),
            inline: true,
          },
          {
            name: '🌙 ETH Range',
            value: discordValue(`📈 High: \`${moneyLine(high)}\`\n📉 Low: \`${moneyLine(low)}\``),
            inline: true,
          },
          {
            name: '🗞️ USA News Caution',
            value: discordValue(newsBrief),
            inline: false,
          },
          {
            name: '🧱 Levels of Interest',
            value: discordValue(formatLevelsOfInterest(context)),
            inline: false,
          },
          {
            name: '🧱 Multi-Timeframe Liquidity Ladder',
            value: discordValue(formatMorningLiquidityLadder(context)),
            inline: false,
          },
          {
            name: '🎯 Potential High-Quality Setups',
            value: discordValue(formatMorningSetupWatchlist(context)),
            inline: false,
          },
          {
            name: '⚠️ Decision Support Only',
            value: [
              '⚠️ This brief does not approve trades.',
              '🗺️ The liquidity ladder tells us WHERE.',
              '🎯 The approved model tells us WHEN.',
              '🕯️ The 5M execution chart tells us WHETHER.',
              '⚖️ The risk gate tells us IF IT IS WORTH TAKING.',
              levels.length ? `🧱 Structured levels loaded: ${levels.length}.` : '🧱 No structural levels available.',
            ].join('\n'),
            inline: false,
          },
        ],
        footer: { text: 'Quant Desk • Master Trading Desk ETH Context • App-Owned Trade Pipeline' },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

async function postDiscord(payload: DiscordWebhookPayload, dryRun: boolean, files: string[] = []): Promise<void> {
  if (dryRun) {
    console.log(JSON.stringify({ ...payload, chartMarkupFiles: files }, null, 2));
    return;
  }
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error('DISCORD_WEBHOOK_URL is required unless --dry-run is used. Add it once to .env.local as DISCORD_WEBHOOK_URL=your_discord_webhook_url.');
  }
  const separator = webhookUrl.includes('?') ? '&' : '?';
  const url = payload.components?.length ? `${webhookUrl}${separator}with_components=true` : webhookUrl;
  const validFiles = files.filter(Boolean);
  const payloadWithImage = validFiles[0] && payload.embeds[0]
    ? {
        ...payload,
        embeds: [
          {
            ...payload.embeds[0],
            image: { url: `attachment://${path.basename(validFiles[0])}` },
          },
          ...payload.embeds.slice(1),
        ],
      }
    : payload;
  const response = validFiles.length
    ? await (async () => {
        const form = new FormData();
        form.append('payload_json', JSON.stringify(payloadWithImage));
        for (const [index, file] of validFiles.entries()) {
          const bytes = await fs.readFile(file);
          form.append(`files[${index}]`, new Blob([bytes], { type: 'image/png' }), path.basename(file));
        }
        return fetch(url, { method: 'POST', body: form });
      })()
    : await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadWithImage),
      });
  if (!response.ok) {
    throw new Error(`Discord webhook failed (${response.status}).`);
  }
}

async function runJob(job: AlertJob, config: SchedulerConfig, dryRun: boolean, tradeDate = getEtTradeDate(), asOfEt?: string): Promise<void> {
  if (job === 'weekly') {
    const context = await buildWeeklyContext(config, tradeDate);
    await postDiscord(await formatWeeklyPayload(tradeDate, context, config.instrument), dryRun);
    return;
  }
  if (job === 'premarket') {
    const context = await buildPremarketContext(config, tradeDate);
    await postDiscord(await formatPremarketPayload(tradeDate, context, config.instrument), dryRun);
    return;
  }
  const analysis = await buildSessionAnalysis(config, job, tradeDate, asOfEt);
  const planVersionId = createPlanVersionId(job, tradeDate);
  const normalized = buildAppTradePlan(analysis, { sessionType: job, instrument: config.instrument, windowStatusOverride: 'active' });
  const candidates = topConditionalCandidates(normalized.setupCandidates, currentPriceFromAnalysis(analysis));
  try {
    await upsertDiscordAlertRagRecord({ planVersionId, job, tradeDate, instrument: config.instrument, analysis, normalized, candidates });
  } catch (error) {
    console.warn('Discord alert RAG pending save failed:', error instanceof Error ? error.message : String(error));
  }
  const renderInput = candidates[0]
    ? {
        chartContext: analysis.structuredChartContext || null,
        candidate: candidates[0],
        instrument: config.instrument,
        tradeDate,
        sessionLabel: job,
        filePrefix: `${job}-${tradeDate}-${config.instrument}`,
      }
    : null;
  const chartMarkup = renderInput ? await renderChartMarkup(renderInput) : null;
  const levelMap = renderInput ? await renderPriceLevelMap(renderInput) : null;
  if (candidates[0] && !chartMarkup) {
    throw new Error('Discord trade plan blocked: approved daily trade-plan render was not produced.');
  }
  if (candidates[0] && !levelMap) {
    throw new Error('Discord trade plan blocked: approved price level map render was not produced.');
  }
  const files = [chartMarkup, levelMap].filter((file): file is string => Boolean(file));
  const auditLogPath = await writeDiscordAuditLog({
    job,
    tradeDate,
    instrument: config.instrument,
    planVersionId,
    analysis,
    normalized,
    candidates,
    chartMarkup,
    levelMap,
  });
  const payload = await formatPlanPayload({
    job,
    tradeDate,
    planVersionId,
    instrument: config.instrument,
    normalized,
    candidates,
    attachments: {
      chartPlan: Boolean(chartMarkup),
      priceLevelMap: Boolean(levelMap),
      auditLogPath,
    },
  });
  validateDiscordPayload(payload, files);
  await postDiscord(payload, dryRun, files);
}

async function schedulerLoop(config: SchedulerConfig, dryRun: boolean): Promise<void> {
  console.log('Quant Desk Master Trading Desk Discord scheduler started.');
  console.log(`Bridge: ${config.bridgeUrl} | Instrument: ${config.bridgeInstrument} | Discord: ${dryRun ? 'dry-run' : 'enabled'}`);
  while (true) {
    const state = await readState();
    const tradeDate = getEtTradeDate();
    const clock = getEtClock();
    for (const [jobName, jobConfig] of Object.entries(config.jobs) as Array<[AlertJob, SchedulerConfig['jobs'][AlertJob]]>) {
      const key = `${tradeDate}:${jobName}`;
      if (jobName === 'weekly' && getDayOfWeek(tradeDate) !== 'Sunday') continue;
      if (jobConfig.enabled && clock >= jobConfig.timeEt && !state.sent[key]) {
        try {
          await runJob(jobName, config, dryRun, tradeDate, clock);
          state.sent[key] = new Date().toISOString();
          await writeState(state);
          console.log(`Sent ${jobName} alert for ${tradeDate}.`);
        } catch (error) {
          console.error(`Failed ${jobName} alert:`, error instanceof Error ? error.message : String(error));
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, config.pollSeconds * 1000));
  }
}

async function main() {
  if (hasArg('help')) {
    printHelp();
    return;
  }

  const config: SchedulerConfig = {
    ...DEFAULT_CONFIG,
    instrument: (argValue('instrument') as Instrument) || DEFAULT_CONFIG.instrument,
    bridgeInstrument: argValue('bridge-instrument') || DEFAULT_CONFIG.bridgeInstrument,
    bridgeUrl: argValue('bridge-url') || DEFAULT_CONFIG.bridgeUrl,
  };
  const dryRun = hasArg('dry-run');
  const once = (argValue('once') || argValue('session')) as AlertJob | null;
  const tradeDate = argValue('date') || getEtTradeDate();
  const asOfEt = argValue('as-of') ? normalizeEtClock(argValue('as-of') as string) : undefined;

  if (once) {
    if (!['weekly', 'premarket', 'morning', 'lunch'].includes(once)) {
      throw new Error('--once must be weekly, premarket, morning, or lunch.');
    }
    await runJob(once, config, dryRun, tradeDate, asOfEt);
    return;
  }

  await schedulerLoop(config, dryRun);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
