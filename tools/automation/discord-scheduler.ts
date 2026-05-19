import dotenv from 'dotenv';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAppTradePlan } from '../../src/lib/planEngine';
import { createPlanVersionId } from '../../src/lib/planMetadata';
import { targetsFromEntryStop, TRADE_RULES } from '../../src/config/tradeRules';
import { buildNinjaChartContext, getNinjaHistoricalBars, type NinjaBridgeBar } from '../../src/lib/ninjaTraderBridge';
import { TradeDecisionStatus, type AnalysisResult, type SetupCandidate, type TargetObjective } from '../../src/types';
import { fetchCachedMarketBars, loadMarketDataConfig, upsertMarketBars, type MarketBarTimeframe } from './market-data-store';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

type AlertJob = 'premarket' | 'morning' | 'lunch';
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

interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields: DiscordEmbedField[];
  footer: { text: string };
  timestamp: string;
}

interface DiscordWebhookPayload {
  username: string;
  content?: string;
  embeds: DiscordEmbed[];
  components?: DiscordActionRow[];
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

const DEFAULT_CONFIG: SchedulerConfig = {
  instrument: 'MES',
  bridgeInstrument: 'MES 06-26',
  bridgeUrl: process.env.NINJATRADER_BRIDGE_URL || 'http://127.0.0.1:8765',
  pollSeconds: 30,
  jobs: {
    premarket: { enabled: true, timeEt: '09:15' },
    morning: { enabled: true, timeEt: '10:10' },
    lunch: { enabled: true, timeEt: '13:00' },
  },
};

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
    '  npm run nt:discord-alerts -- --once morning --dry-run',
    '  npm run nt:discord-alerts -- --once lunch',
    '',
    'Environment:',
    '  DISCORD_WEBHOOK_URL       Required unless --dry-run is used.',
    '  NINJATRADER_BRIDGE_URL    Optional, defaults to http://127.0.0.1:8765.',
    '',
    'Options:',
    '  --once premarket|morning|lunch   Run one alert immediately.',
    '  --session premarket|morning|lunch Alias for --once, for replay/manual tests.',
    '  --date YYYY-MM-DD                 Trade date for --once/--session.',
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

function previousCalendarDate(tradeDate: string): string {
  const date = new Date(`${tradeDate}T12:00:00`);
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

function getDayOfWeek(tradeDate: string): string {
  return new Date(`${tradeDate}T12:00:00`).toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
  });
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
      limit: 5000,
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
    limit: 3000,
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
  const priorDate = previousCalendarDate(tradeDate);
  const [bars240m, bars60m, bars15m] = await Promise.all([
    fetchBars(config, '240m', etDateTime(priorDate, '18:00'), etDateTime(tradeDate, '09:15')),
    fetchBars(config, '60m', etDateTime(priorDate, '18:00'), etDateTime(tradeDate, '09:15')),
    fetchBars(config, '15m', etDateTime(priorDate, '18:00'), etDateTime(tradeDate, '09:15')),
  ]);
  return buildNinjaChartContext({
    bars5m: bars15m.map((bar) => ({ ...bar })),
    bars15m,
    bars60m,
    bars240m,
    sessionType: 'morning',
    instrument: config.instrument,
    tradeDate,
  });
}

async function buildSessionAnalysis(config: SchedulerConfig, job: Exclude<AlertJob, 'premarket'>, tradeDate: string): Promise<AnalysisResult> {
  const priorDate = previousCalendarDate(tradeDate);
  const contextTo = etDateTime(tradeDate, job === 'morning' ? '10:00' : '13:00');
  const [bars240m, bars60m, bars15m, bars5m] = await Promise.all([
    fetchBars(config, '240m', etDateTime(priorDate, '18:00'), contextTo),
    fetchBars(config, '60m', etDateTime(priorDate, '18:00'), contextTo),
    fetchBars(config, '15m', etDateTime(priorDate, '18:00'), contextTo),
    fetchBars(
      config,
      '5m',
      etDateTime(tradeDate, job === 'morning' ? '09:30' : '11:50'),
      etDateTime(tradeDate, job === 'morning' ? '10:10' : '13:00')
    ),
  ]);
  const chartContext = buildNinjaChartContext({
    bars5m,
    bars15m,
    bars60m,
    bars240m,
    sessionType: job,
    instrument: config.instrument,
    tradeDate,
  });

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
  const cleaned = value.trim() || 'N/A';
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
  sessionType: Exclude<AlertJob, 'premarket'>;
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
  sessionType: Exclude<AlertJob, 'premarket'>;
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
  job: Exclude<AlertJob, 'premarket'>;
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
      `Outcome buttons will record whether trade was taken, direction, and target result.`,
    ].join(' '),
    trade_plan_json: {
      planVersionId: args.planVersionId,
      discordOutcomeButtons: true,
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

function statusEmoji(status: string | undefined): string {
  if (status === TradeDecisionStatus.ApprovedTrade) return '🟢';
  if (status === TradeDecisionStatus.ConditionalTrade || status === TradeDecisionStatus.Wait) return '🟡';
  if (status === TradeDecisionStatus.NoTrade || status === TradeDecisionStatus.OutsideRules) return '🔴';
  if (status === TradeDecisionStatus.InvalidScreenshot) return '⚪';
  return '🟡';
}

function statusColor(status: string | undefined): number {
  if (status === TradeDecisionStatus.ApprovedTrade) return 0x00c853;
  if (status === TradeDecisionStatus.ConditionalTrade || status === TradeDecisionStatus.Wait) return 0xffa000;
  if (status === TradeDecisionStatus.NoTrade || status === TradeDecisionStatus.OutsideRules) return 0xd50000;
  if (status === TradeDecisionStatus.InvalidScreenshot) return 0x78909c;
  return 0xff6d00;
}

function compactSetupName(candidate: SetupCandidate): string {
  if (candidate.scenarioLabel) return candidate.scenarioLabel;
  return candidate.setupType.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function topConditionalCandidates(candidates: SetupCandidate[] | undefined): SetupCandidate[] {
  const eligible = (candidates || [])
    .filter((candidate) => candidate.executionStatus === 'Conditional' || candidate.executionStatus === 'Blocked')
    .filter((candidate) => candidate.direction === 'LONG' || candidate.direction === 'SHORT');
  const bestLong = eligible.find((candidate) => candidate.direction === 'LONG');
  const bestShort = eligible.find((candidate) => candidate.direction === 'SHORT');

  if (bestLong && bestShort) {
    return [bestLong, bestShort].sort((a, b) => eligible.indexOf(a) - eligible.indexOf(b));
  }

  return eligible.slice(0, 2);
}

function formatObjectiveLine(objective: TargetObjective): string {
  const distance = typeof objective.distancePoints === 'number' ? `, ${objective.distancePoints.toFixed(2)} pts` : '';
  const multiple = typeof objective.rMultiple === 'number' ? `, ${objective.rMultiple.toFixed(2)}R` : '';
  return `- ${objective.label}: ${objective.price}${distance}${multiple}`;
}

function objectiveDirectionLabel(direction: 'LONG' | 'SHORT'): { primary: string; opposing: string; runner: string } {
  return direction === 'LONG'
    ? { primary: 'upside', opposing: 'downside', runner: 'Major upside liquidity' }
    : { primary: 'downside', opposing: 'upside', runner: 'Major downside liquidity' };
}

function nearestObjectiveByDirection(
  objectives: TargetObjective[],
  direction: 'LONG' | 'SHORT',
  entry?: number,
  exclude?: TargetObjective | null
): TargetObjective | null {
  const validEntry = typeof entry === 'number' && Number.isFinite(entry);
  const filtered = objectives
    .filter((objective) => objective.direction === direction)
    .filter((objective) => !exclude || objective.label !== exclude.label || objective.price !== exclude.price)
    .filter((objective) => {
      if (!validEntry) return true;
      return direction === 'LONG' ? objective.price > entry : objective.price < entry;
    })
    .sort((a, b) => {
      if (!validEntry) return b.score - a.score;
      return Math.abs(a.price - entry) - Math.abs(b.price - entry);
    });

  return filtered[0] || null;
}

function isSessionSource(source: TargetObjective['source']): boolean {
  return [
    'asian',
    'london',
    'ny_premarket',
    'full_context',
    'prior_eth',
    'previous_rth',
    'rth_morning',
    'lunch',
  ].includes(source);
}

function isRealLiquidityObjective(objective?: TargetObjective | null): objective is TargetObjective {
  if (!objective) return false;
  if (objective.type === 'liquidity_pool' || objective.type === 'swing') return true;
  return (objective.type === 'high' || objective.type === 'low') && isSessionSource(objective.source);
}

function isObstacleObjective(objective?: TargetObjective | null): objective is TargetObjective {
  if (!objective) return false;
  return [
    'imbalance_zone',
    'imbalance_midpoint',
    'displacement_origin',
    'gap',
    'round_number',
    'midnight_open',
    'rth_open',
    'support',
    'resistance',
  ].includes(objective.type);
}

function nearestLiquidityByDirection(
  objectives: TargetObjective[],
  direction: 'LONG' | 'SHORT',
  entry?: number,
  exclude?: TargetObjective | null
): TargetObjective | null {
  return nearestObjectiveByDirection(objectives.filter(isRealLiquidityObjective), direction, entry, exclude);
}

function nearestObstacleByDirection(
  objectives: TargetObjective[],
  direction: 'LONG' | 'SHORT',
  entry?: number,
  exclude?: TargetObjective | null
): TargetObjective | null {
  return nearestObjectiveByDirection(objectives.filter(isObstacleObjective), direction, entry, exclude);
}

function formatLiquidityObjective(label: string, objective?: TargetObjective | null): string {
  if (!objective) return `${label}: N/A`;
  return `${label}: ${objective.price} ${objective.label}`;
}

function sameObjective(a?: TargetObjective | null, b?: TargetObjective | null): boolean {
  if (!a || !b) return false;
  return a.label === b.label && a.price === b.price;
}

function compactObjective(objective?: TargetObjective | null): string {
  if (!objective) return 'N/A';
  return `${objective.price} ${objective.label}`;
}

function compactSentence(value?: string | null, maxLength = 150): string | null {
  const text = String(value || '').trim();
  if (!text) return null;
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 3)}...`;
}

function candidateLevels(candidate: SetupCandidate): { stop: number | null; risk: number | null; target1: number | null; target2: number | null } {
  const stop = typeof candidate.stop === 'number' && Number.isFinite(candidate.stop) ? candidate.stop : null;
  const computed = targetsFromEntryStop(candidate.direction, candidate.entry, stop);
  return {
    stop,
    risk: typeof candidate.riskPoints === 'number' && Number.isFinite(candidate.riskPoints)
      ? candidate.riskPoints
      : computed.riskPoints,
    target1: typeof candidate.target1 === 'number' && Number.isFinite(candidate.target1) ? candidate.target1 : computed.target1,
    target2: typeof candidate.target2 === 'number' && Number.isFinite(candidate.target2) ? candidate.target2 : computed.target2,
  };
}

function candidateConfidenceScore(candidate: SetupCandidate): number {
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

function simpleScenarioLine(candidate: SetupCandidate): string {
  const direction = candidate.direction === 'SHORT' ? 'SHORT' : 'LONG';
  const trigger = candidate.requiredTrigger || 'Wait for confirmation';
  const levels = candidateLevels(candidate);
  const plan = `E ${moneyLine(candidate.entry)} | Structure Stop ${moneyLine(levels.stop)} | T1 ${moneyLine(levels.target1)} | T2 ${moneyLine(levels.target2)}`;
  return [
    `**${direction} - ${compactSetupName(candidate)}**`,
    `Trigger: ${trigger}`,
    `Plan: ${plan}`,
  ].join('\n');
}

function cleanScenarioLine(candidate: SetupCandidate, objectives: TargetObjective[] = []): string {
  const direction = candidate.direction === 'SHORT' ? 'SHORT' : 'LONG';
  const levels = candidateLevels(candidate);
  const sourceObjectives = candidate.targetObjectivePlan?.objectives?.length
    ? candidate.targetObjectivePlan.objectives
    : objectives;
  const nearestLiquidity =
    candidate.targetObjectivePlan?.liquidityTarget1 ||
    candidate.targetObjectivePlan?.nearestLiquidityTarget ||
    nearestLiquidityByDirection(sourceObjectives, direction, candidate.entry);
  const obstacle =
    candidate.targetObjectivePlan?.obstacleTarget1 ||
    candidate.targetObjectivePlan?.nearestObstacleTarget ||
    nearestObstacleByDirection(sourceObjectives, direction, candidate.entry);
  const runner =
    candidate.targetObjectivePlan?.liquidityRunnerTarget ||
    candidate.targetObjectivePlan?.runnerTarget ||
    nearestLiquidityByDirection(sourceObjectives, direction, candidate.entry, nearestLiquidity);
  const trigger = compactSentence(candidate.requiredTrigger, 120) || 'Wait for confirmation';

  return [
    `**${direction} - ${compactSetupName(candidate)}**`,
    `State: ${candidate.executionStatus} | Confidence: ${candidateConfidenceScore(candidate)} / 100`,
    `Trigger: ${trigger}`,
    `Entry \`${moneyLine(candidate.entry)}\` | Structure Stop \`${moneyLine(levels.stop)}\` | Actual Risk \`${moneyLine(levels.risk)}\``,
    `T1 \`${moneyLine(levels.target1)}\` | T2 \`${moneyLine(levels.target2)}\``,
    `Obstacle / Reaction Zone: \`${compactObjective(obstacle)}\``,
    `Primary Liquidity: \`${compactObjective(nearestLiquidity)}\`${runner && !sameObjective(runner, nearestLiquidity) ? ` | Runner Liquidity: \`${compactObjective(runner)}\`` : ''}`,
  ].join('\n');
}

function formatCleanScenarios(candidates: SetupCandidate[], targetObjectives: TargetObjective[]): string {
  if (!candidates.length) return 'No active long/short scenario. Wait for a clean 5M trigger.';
  return candidates
    .slice(0, 2)
    .map((candidate, index) => `${index + 1}. ${cleanScenarioLine(candidate, targetObjectives)}`)
    .join('\n\n');
}

function formatCleanInvalidations(candidates: SetupCandidate[]): string {
  if (!candidates.length) return 'No scenario invalidation yet. Do not execute without a 5M trigger, structure-based stop, actual risk check, and clear target room.';
  return candidates
    .slice(0, 2)
    .map((candidate, index) => {
      const direction = candidate.direction === 'SHORT' ? 'SHORT' : 'LONG';
      const levels = candidateLevels(candidate);
      const invalidation = compactSentence(candidate.invalidation, 130) || `Invalid if price violates the protected structure level near ${moneyLine(levels.stop)}.`;
      return `${index + 1}. **${direction}:** ${invalidation} Structure Stop: \`${moneyLine(levels.stop)}\``;
    })
    .join('\n');
}

function formatCandidateObjectives(candidate: SetupCandidate, fallbackObjectives: TargetObjective[] = []): string {
  const isValidObjectiveForCandidate = (objective: TargetObjective): boolean => {
    if (objective.direction !== candidate.direction) return false;
    if (typeof candidate.entry !== 'number' || !Number.isFinite(candidate.entry)) return true;
    if (candidate.direction === 'LONG') return objective.price > candidate.entry;
    if (candidate.direction === 'SHORT') return objective.price < candidate.entry;
    return false;
  };
  const selected = [
    candidate.targetObjectivePlan?.selectedT1,
    candidate.targetObjectivePlan?.selectedT2,
  ].filter(Boolean).filter(isValidObjectiveForCandidate) as TargetObjective[];
  const nearestLiquidityTarget =
    candidate.targetObjectivePlan?.liquidityTarget1 ||
    candidate.targetObjectivePlan?.nearestLiquidityTarget;
  const nearestObstacleTarget =
    candidate.targetObjectivePlan?.obstacleTarget1 ||
    candidate.targetObjectivePlan?.nearestObstacleTarget;
  const secondLiquidityTarget = candidate.targetObjectivePlan?.liquidityTarget2;
  const runnerTarget =
    candidate.targetObjectivePlan?.liquidityRunnerTarget ||
    candidate.targetObjectivePlan?.runnerTarget;
  const targetPathWarning = candidate.targetObjectivePlan?.targetPathWarning;
  const targetInstruction = candidate.targetObjectivePlan?.targetManagementInstruction;
  const sourceObjectives = candidate.targetObjectivePlan?.objectives?.length
    ? candidate.targetObjectivePlan.objectives
    : fallbackObjectives;
  const directionLabels = objectiveDirectionLabel(candidate.direction === 'SHORT' ? 'SHORT' : 'LONG');
  const nearestDirectionalTarget =
    nearestLiquidityTarget && isValidObjectiveForCandidate(nearestLiquidityTarget)
      ? nearestLiquidityTarget
      : nearestLiquidityByDirection(sourceObjectives, candidate.direction === 'SHORT' ? 'SHORT' : 'LONG', candidate.entry);
  const nearestDirectionalObstacle =
    nearestObstacleTarget && isValidObjectiveForCandidate(nearestObstacleTarget)
      ? nearestObstacleTarget
      : nearestObstacleByDirection(sourceObjectives, candidate.direction === 'SHORT' ? 'SHORT' : 'LONG', candidate.entry);
  const runnerDirectionalTarget =
    runnerTarget && isValidObjectiveForCandidate(runnerTarget)
      ? runnerTarget
      : nearestLiquidityByDirection(
          sourceObjectives,
          candidate.direction === 'SHORT' ? 'SHORT' : 'LONG',
          candidate.entry,
          nearestDirectionalTarget
        );
  const opposingTarget = nearestLiquidityByDirection(
    sourceObjectives,
    candidate.direction === 'SHORT' ? 'LONG' : 'SHORT',
    candidate.entry
  );
  const additional = sourceObjectives
    .filter(isValidObjectiveForCandidate)
    .filter((objective) => !selected.some((picked) => picked.label === objective.label && picked.price === objective.price))
    .slice(0, 3);
  const objectives = [...selected, ...additional].slice(0, 4);

  if (!objectives.length) {
    const levels = candidateLevels(candidate);
    return [
      'App Targets:',
      `T1: ${moneyLine(levels.target1)}`,
      `T2: ${moneyLine(levels.target2)}`,
      '',
      'Liquidity Map:',
      formatLiquidityObjective('Nearest obstacle / reaction zone', nearestDirectionalObstacle),
      `Nearest ${directionLabels.primary} liquidity: N/A`,
      `${directionLabels.runner}: N/A`,
      `Nearest ${directionLabels.opposing} liquidity: ${opposingTarget ? `${opposingTarget.price} ${opposingTarget.label}` : 'N/A'}`,
      '',
      'Target Quality:',
      'T1/T2 are tactical targets calculated from actual entry-to-structure-stop risk.',
      'No liquidity map levels found for this direction.',
      targetInstruction ? `Target Plan: ${targetInstruction}` : null,
    ].filter(Boolean).join('\n');
  }

  const levels = candidateLevels(candidate);
  return [
    'App Targets:',
    `T1: ${moneyLine(levels.target1)}`,
    `T2: ${moneyLine(levels.target2)}`,
    '',
    'Liquidity Map:',
    formatLiquidityObjective('Nearest obstacle / reaction zone', nearestDirectionalObstacle),
    formatLiquidityObjective('LQ1 real 15M/session liquidity', nearestDirectionalTarget),
    formatLiquidityObjective('LQ2 real 15M/session liquidity', secondLiquidityTarget || runnerDirectionalTarget),
    formatLiquidityObjective(`Nearest ${directionLabels.opposing} liquidity`, opposingTarget),
    '',
    'Target Quality:',
    'T1/T2 are close-range tactical targets.',
    targetInstruction ||
      (nearestDirectionalTarget
        ? `Runner target only valid if price clears ${nearestDirectionalTarget.price} and holds.`
        : 'Runner target requires a confirmed break and hold beyond the tactical target zone.'),
    targetPathWarning ? `Target path warning: ${targetPathWarning}` : null,
    '',
    'Additional levels:',
    ...objectives.map(formatObjectiveLine),
  ].filter(Boolean).join('\n');
}

function formatContextHighLowTargets(objectives: TargetObjective[] = []): string {
  const contextTargets = objectives
    .filter((objective) =>
      objective.source === 'full_context' ||
      objective.source === 'prior_eth' ||
      objective.source === 'asian' ||
      objective.source === 'london' ||
      objective.label.toLowerCase().includes('eth') ||
      objective.label.toLowerCase().includes('overnight') ||
      objective.label.toLowerCase().includes('asian') ||
      objective.label.toLowerCase().includes('london')
    )
    .sort((a, b) => a.price - b.price);

  const priorityOrder = ['full_context', 'prior_eth', 'asian', 'london'];
  const selected = priorityOrder.flatMap((source) => {
    const sourceTargets = contextTargets.filter((objective) => objective.source === source);
    const low = sourceTargets.find((objective) => objective.type === 'low');
    const high = [...sourceTargets].reverse().find((objective) => objective.type === 'high');
    return [low, high].filter(Boolean) as TargetObjective[];
  });

  if (!selected.length) {
    return 'No ETH / Asian / London high-low levels were available from the imported data.';
  }

  return selected
    .map((objective) => `• **${objective.label}:** \`${objective.price}\``)
    .join('\n');
}

function formatSessionLevelContext(analysis: AnalysisResult): string {
  const context = analysis.structuredChartContext?.sessionLevelContext;
  if (!context) {
    return 'No session level context was available from the imported OHLC data.';
  }

  const formatLevel = (prefix: string, levels = context.levels) => {
    const selected = levels.slice(0, 3);
    if (!selected.length) return [`**${prefix}:** none detected`];
    return [
      `**${prefix}:**`,
      ...selected.map((level) =>
        `• **${level.label}:** \`${level.price}\`${level.contextNote ? ` — ${level.contextNote}` : ''}`
      ),
    ];
  };

  const relationshipLines = context.relationships.slice(0, 3).map((relationship) =>
    `• **${relationship.bias}:** ${relationship.evidence}`
  );

  return [
    ...formatLevel('Upside Levels To Watch', context.strongestLongLevels),
    '',
    ...formatLevel('Downside Levels To Watch', context.strongestShortLevels),
    relationshipLines.length ? '\n**Session Context Rules:**' : '',
    ...relationshipLines,
    '',
    '_Use these as reaction zones and runner targets. The 5M trigger, risk, stop, and invalidation still decide execution._',
  ].filter(Boolean).join('\n');
}

function formatCandidateValue(candidate: SetupCandidate, fallbackObjectives: TargetObjective[] = []): string {
  const minimumPracticalRisk = TRADE_RULES.stopQuality.minimumPracticalRiskPoints.MES;
  const levels = candidateLevels(candidate);
  const riskTooTight =
    typeof levels.risk === 'number' &&
    Number.isFinite(levels.risk) &&
    levels.risk > 0 &&
    levels.risk < minimumPracticalRisk;
  return [
    `Status: ${candidate.executionStatus}${candidate.blockReason ? ` | Blocker: ${candidate.blockReason}` : ''}`,
    `Trigger: ${candidate.requiredTrigger || 'Needs confirmation'}`,
    `Entry ${moneyLine(candidate.entry)} | Structure Stop ${moneyLine(levels.stop)} | Actual Risk ${moneyLine(levels.risk)} | T1 ${moneyLine(levels.target1)} | T2 ${moneyLine(levels.target2)}`,
    riskTooTight
      ? `Stop Quality: TOO TIGHT for MES. Minimum practical stop is ${minimumPracticalRisk} points. Wait for cleaner structure or a wider pullback/retest stop.`
      : `Stop Quality: ${typeof candidate.riskPoints === 'number' ? 'Acceptable practical range' : 'Unknown until entry/stop confirm'}`,
    candidate.levelContextSummary ? `Market Map: ${candidate.levelContextSummary}` : 'Market Map: No clear session reaction zone attached.',
    formatCandidateObjectives(candidate, fallbackObjectives),
    `Plain English: ${candidate.nextAction || 'Wait for a cleaner trigger.'}`,
  ].join('\n');
}

function formatFiveWsScenario(candidate: SetupCandidate, objectives: TargetObjective[] = []): string {
  const direction = candidate.direction === 'LONG' ? 'LONG' : 'SHORT';
  const levels = candidateLevels(candidate);
  const sourceObjectives = candidate.targetObjectivePlan?.objectives?.length
    ? candidate.targetObjectivePlan.objectives
    : objectives;
  const nearestLiquidity =
    candidate.targetObjectivePlan?.liquidityTarget1 ||
    candidate.targetObjectivePlan?.nearestLiquidityTarget ||
    nearestLiquidityByDirection(sourceObjectives, direction, candidate.entry);
  const obstacle =
    candidate.targetObjectivePlan?.obstacleTarget1 ||
    candidate.targetObjectivePlan?.nearestObstacleTarget ||
    nearestObstacleByDirection(sourceObjectives, direction, candidate.entry);
  const secondLiquidity =
    candidate.targetObjectivePlan?.liquidityTarget2 ||
    nearestLiquidityByDirection(sourceObjectives, direction, candidate.entry, nearestLiquidity);
  const runner =
    candidate.targetObjectivePlan?.liquidityRunnerTarget ||
    candidate.targetObjectivePlan?.runnerTarget ||
    nearestLiquidityByDirection(sourceObjectives, direction, candidate.entry, secondLiquidity || nearestLiquidity);
  const rawTargetInstruction = candidate.targetObjectivePlan?.targetManagementInstruction || '';
  const targetInstruction = rawTargetInstruction.startsWith('No 15M/session')
    ? null
    : compactSentence(rawTargetInstruction);
  const uniqueLq2 = sameObjective(secondLiquidity, nearestLiquidity) ? null : secondLiquidity;
  const uniqueRunner = sameObjective(runner, nearestLiquidity) || sameObjective(runner, uniqueLq2) ? null : runner;
  const blocker = candidate.blockReason ? ` | Blocker: ${candidate.blockReason}` : '';
  return [
    `**Best ${direction === 'LONG' ? 'Long' : 'Short'} Scenario - ${compactSetupName(candidate)}**`,
    `Status: ${candidate.executionStatus}${blocker} | Confidence: ${candidateConfidenceScore(candidate)} / 100`,
    `Trigger: ${candidate.requiredTrigger || 'Wait for confirmation'}`,
    `Plan: Entry ${moneyLine(candidate.entry)} | Structure Stop ${moneyLine(levels.stop)} | Actual Risk ${moneyLine(levels.risk)}`,
    `Targets: T1 ${moneyLine(levels.target1)} | T2 ${moneyLine(levels.target2)}`,
    `Obstacle / Reaction Zone: ${compactObjective(obstacle)}`,
    `Primary Liquidity: ${compactObjective(nearestLiquidity)}`,
    uniqueLq2 ? `Next Liquidity: ${compactObjective(uniqueLq2)}` : null,
    uniqueRunner ? `Runner Liquidity: ${compactObjective(uniqueRunner)}` : null,
    targetInstruction ? `Note: ${targetInstruction}` : null,
  ].filter(Boolean).join('\n');
}

function formatFiveWsWhere(candidates: SetupCandidate[], targetObjectives: TargetObjective[]): string {
  if (!candidates.length) {
    return 'No active scenario levels. Wait for a clean 5M trigger.';
  }
  return candidates
    .slice(0, 2)
    .map((candidate, index) => `${index + 1}. ${formatFiveWsScenario(candidate, targetObjectives)}`)
    .join('\n\n');
}

function formatSessionStoryLine(analysis: AnalysisResult): string {
  const story = analysis.structuredChartContext?.sessionStory;
  if (!story) return 'Session story: no dominant overnight/Asian/London/RTH relationship detected.';
  const zone = story.displacementZones?.[0];
  return [
    `Session story: ${story.summary}`,
    zone ? `Key zone: ${zone.label} ${zone.lower}-${zone.upper}` : null,
  ].filter(Boolean).join('\n');
}

function formatFiveWsWhen(candidates: SetupCandidate[]): string {
  if (!candidates.length) return 'When a clean 5M trigger forms.';
  return candidates
    .slice(0, 2)
    .map((candidate, index) => `${index + 1}. ${candidate.requiredTrigger || 'Wait for confirmation'}`)
    .join('\n');
}

function formatBestScenarios(candidates: SetupCandidate[]): string {
  if (!candidates.length) return 'No active long/short scenario. Wait for a clean 5M trigger.';
  return candidates
    .slice(0, 2)
    .map((candidate, index) => `${index + 1}. ${simpleScenarioLine(candidate)}`)
    .join('\n\n');
}

function formatTargetFocus(candidates: SetupCandidate[], objectives: TargetObjective[]): string {
  const first = candidates[0];
  if (!first) return 'Tactical T1/T2 only after ENTRY and STOP are confirmed.';
  const direction = first.direction === 'SHORT' ? 'SHORT' : 'LONG';
  const sourceObjectives = first.targetObjectivePlan?.objectives?.length
    ? first.targetObjectivePlan.objectives
    : objectives;
  const nearest =
    first.targetObjectivePlan?.liquidityTarget1 ||
    first.targetObjectivePlan?.nearestLiquidityTarget ||
    nearestLiquidityByDirection(sourceObjectives, direction, first.entry);
  const obstacle =
    first.targetObjectivePlan?.obstacleTarget1 ||
    first.targetObjectivePlan?.nearestObstacleTarget ||
    nearestObstacleByDirection(sourceObjectives, direction, first.entry);
  const runner =
    first.targetObjectivePlan?.liquidityRunnerTarget ||
    first.targetObjectivePlan?.runnerTarget ||
    nearestLiquidityByDirection(sourceObjectives, direction, first.entry, nearest);
  return [
    `T1/T2: app-computed from confirmed ENTRY/STOP.`,
    `Nearest obstacle/reaction: ${compactObjective(obstacle)}`,
    `Nearest real liquidity: ${compactObjective(nearest)}`,
    runner && !sameObjective(runner, nearest) ? `Runner liquidity: ${compactObjective(runner)}` : null,
  ].filter(Boolean).join('\n');
}

function formatPlanPayload(job: Exclude<AlertJob, 'premarket'>, tradeDate: string, analysis: AnalysisResult, planVersionId: string, instrument: Instrument): DiscordWebhookPayload {
  const normalized = buildAppTradePlan(analysis, { sessionType: job, instrument, windowStatusOverride: 'active' });
  const candidates = topConditionalCandidates(normalized.setupCandidates);
  const header = job === 'morning' ? 'Morning Plan Alert' : 'Lunch Plan Alert';
  const finalStatus = normalized.decisionStatus || (normalized.canExecute ? TradeDecisionStatus.ApprovedTrade : TradeDecisionStatus.Wait);
  const hasPlanningPaths = candidates.length > 0;
  const deskDecision = hasPlanningPaths && !normalized.canExecute
    ? 'WAIT / CONDITIONAL'
    : normalized.decisionLabel || normalized.decision;
  const finalStatusLabel = `${statusEmoji(finalStatus)} ${deskDecision}`;
  const targetObjectives = analysis.structuredChartContext?.targetObjectives || [];
  const components = buildOutcomeComponents({
    planVersionId,
    sessionType: job,
    tradeDate,
    instrument,
  });
  const fields: DiscordEmbedField[] = [
    {
      name: '1️⃣ What',
      value: discordValue(
        `**${finalStatusLabel}**\n` +
        `${hasPlanningPaths && !normalized.canExecute ? 'Planning paths only. No execution until the 5M trigger confirms, stop is tied to structure, actual risk is acceptable, and target room is clear.' : normalized.planningDecision}\n` +
        `${job === 'morning' ? 'Morning Analysis' : 'Lunch Reversal'} | ${instrument} | ${tradeDate}`
      ),
      inline: false,
    },
    {
      name: '2️⃣ Where',
      value: discordValue(formatCleanScenarios(candidates, targetObjectives)),
      inline: false,
    },
    {
      name: '3️⃣ When',
      value: discordValue(formatFiveWsWhen(candidates)),
      inline: false,
    },
    {
      name: '4️⃣ Invalidation',
      value: discordValue(formatCleanInvalidations(candidates)),
      inline: false,
    },
    {
      name: '5️⃣ Watch-Out',
      value: discordValue(
        `${compactSentence(normalized.whyThisPlan, 160) || 'Do not chase. Let the 5M trigger prove the path.'}\n` +
        `${components ? 'Button guide: 🟢 LONG T1 | 🏆 T2 | 🎯 liquidity target | 🛑 stopped | 🔴 SHORT T1 | ⚪ scratch | 🚫 not taken | ⏭ missed.' : 'RAG buttons are not shown until DISCORD_OUTCOME_BASE_URL and DISCORD_OUTCOME_SECRET are set.'}\n` +
        `${components ? 'Use the buttons only after you know what happened. They update RAG/journal learning only.' : ''}\n` +
        'Decision support only. No automated orders were placed.'
      ),
      inline: false,
    },
  ];

  return {
    username: 'Quant Desk',
    content: `# ${statusEmoji(finalStatus)} Quant Desk ${header} — ${deskDecision}\nPlan ID: \`${planVersionId}\`${components ? '\nUse outcome buttons below to feed RAG.' : ''}`,
    embeds: [
      {
        title: `📊 5 W Trading Card — ${tradeDate}`,
        description: 'Decision support only. No automated orders were placed.',
        color: statusColor(finalStatus),
        fields,
        footer: { text: 'Quant Desk • App-Owned Trade Pipeline • No automated orders' },
        timestamp: new Date().toISOString(),
      },
    ],
    ...(components ? { components } : {}),
  };
}

function formatPremarketPayload(tradeDate: string, context: ReturnType<typeof buildNinjaChartContext>): DiscordWebhookPayload {
  const levels = context?.structuralLevels || [];
  const high = context?.keyLevels?.overnightHigh;
  const low = context?.keyLevels?.overnightLow;
  const trend = context?.marketStructure?.trend || 'unknown';
  return {
    username: 'Quant Desk',
    embeds: [
      {
        title: `🌙 Quant Desk Master Trading Desk Premarket ETH Rundown — ${tradeDate}`,
        description: 'Context only. The 5M execution chart and app-owned pipeline still decide any trade plan.',
        color: 0x2962ff,
        fields: [
          {
            name: '📈 Instrument / Source',
            value: 'MES | NinjaTrader OHLC',
            inline: true,
          },
          {
            name: '🧭 Broader Trend',
            value: discordValue(String(trend)),
            inline: true,
          },
          {
            name: '🌙 ETH Range',
            value: discordValue(`High: \`${moneyLine(high)}\`\nLow: \`${moneyLine(low)}\``),
            inline: true,
          },
          {
            name: '🧱 Key Levels Into Morning',
            value: discordValue(levels.slice(0, 8).map((level) => `• ${level.label}: ${level.price} (${level.type})`).join('\n') || 'No structural levels available.'),
            inline: false,
          },
          {
            name: '⚠️ Decision Support Only',
            value: 'This rundown does not approve trades. Final execution requires the 5M chart, setup scanner, risk checks, and app-owned pipeline.',
            inline: false,
          },
        ],
        footer: { text: 'Quant Desk • Master Trading Desk ETH Context • App-Owned Trade Pipeline' },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

async function postDiscord(payload: DiscordWebhookPayload, dryRun: boolean): Promise<void> {
  if (dryRun) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error('DISCORD_WEBHOOK_URL is required unless --dry-run is used. Add it once to .env.local as DISCORD_WEBHOOK_URL=your_discord_webhook_url.');
  }
  const separator = webhookUrl.includes('?') ? '&' : '?';
  const url = payload.components?.length ? `${webhookUrl}${separator}with_components=true` : webhookUrl;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Discord webhook failed (${response.status}).`);
  }
}

async function runJob(job: AlertJob, config: SchedulerConfig, dryRun: boolean, tradeDate = getEtTradeDate()): Promise<void> {
  if (job === 'premarket') {
    const context = await buildPremarketContext(config, tradeDate);
    await postDiscord(formatPremarketPayload(tradeDate, context), dryRun);
    return;
  }
  const analysis = await buildSessionAnalysis(config, job, tradeDate);
  const planVersionId = createPlanVersionId(job, tradeDate);
  const normalized = buildAppTradePlan(analysis, { sessionType: job, instrument: config.instrument, windowStatusOverride: 'active' });
  const candidates = topConditionalCandidates(normalized.setupCandidates);
  try {
    await upsertDiscordAlertRagRecord({ planVersionId, job, tradeDate, instrument: config.instrument, analysis, normalized, candidates });
  } catch (error) {
    console.warn('Discord alert RAG pending save failed:', error instanceof Error ? error.message : String(error));
  }
  await postDiscord(formatPlanPayload(job, tradeDate, analysis, planVersionId, config.instrument), dryRun);
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
      if (jobConfig.enabled && clock >= jobConfig.timeEt && !state.sent[key]) {
        try {
          await runJob(jobName, config, dryRun, tradeDate);
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

  if (once) {
    if (!['premarket', 'morning', 'lunch'].includes(once)) {
      throw new Error('--once must be premarket, morning, or lunch.');
    }
    await runJob(once, config, dryRun, tradeDate);
    return;
  }

  await schedulerLoop(config, dryRun);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
