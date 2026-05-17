import dotenv from 'dotenv';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAppTradePlan } from '../../src/lib/planEngine';
import { createPlanVersionId } from '../../src/lib/planMetadata';
import { TRADE_RULES } from '../../src/config/tradeRules';
import { buildNinjaChartContext, getNinjaHistoricalBars, type NinjaBridgeBar } from '../../src/lib/ninjaTraderBridge';
import { TradeDecisionStatus, type AnalysisResult, type SetupCandidate, type TargetObjective } from '../../src/types';

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

async function fetchBars(config: SchedulerConfig, timeframe: '5m' | '15m', from: string, to: string): Promise<NinjaBridgeBar[]> {
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
  return response.bars;
}

async function buildPremarketContext(config: SchedulerConfig, tradeDate: string) {
  const priorDate = previousCalendarDate(tradeDate);
  const bars15m = await fetchBars(config, '15m', etDateTime(priorDate, '18:00'), etDateTime(tradeDate, '09:15'));
  return buildNinjaChartContext({
    bars5m: bars15m.map((bar) => ({ ...bar })),
    bars15m,
    sessionType: 'morning',
    instrument: config.instrument,
    tradeDate,
  });
}

async function buildSessionAnalysis(config: SchedulerConfig, job: Exclude<AlertJob, 'premarket'>, tradeDate: string): Promise<AnalysisResult> {
  const priorDate = previousCalendarDate(tradeDate);
  const bars15m = await fetchBars(
    config,
    '15m',
    etDateTime(priorDate, '18:00'),
    etDateTime(tradeDate, job === 'morning' ? '10:00' : '13:00')
  );
  const bars5m = await fetchBars(
    config,
    '5m',
    etDateTime(tradeDate, job === 'morning' ? '09:30' : '11:50'),
    etDateTime(tradeDate, job === 'morning' ? '10:10' : '13:00')
  );
  const chartContext = buildNinjaChartContext({
    bars5m,
    bars15m,
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
        outcomeButton('Long T1', '🟢', longT1),
        outcomeButton('Long T2', '🏆', longT2),
        outcomeButton('Long Liquidity', '🎯', longLiquidity),
        outcomeButton('Long Stopped', '🛑', longStopped),
      ],
    },
    {
      type: 1,
      components: [
        outcomeButton('Short T1', '🔴', shortT1),
        outcomeButton('Short T2', '🏆', shortT2),
        outcomeButton('Short Liquidity', '🎯', shortLiquidity),
        outcomeButton('Short Stopped', '🛑', shortStopped),
      ],
    },
    {
      type: 1,
      components: [
        outcomeButton('Scratch', '⚪', scratch),
        outcomeButton('Not Taken', '🚫', notTaken),
        outcomeButton('Missed', '⏭️', missed),
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
    outcome: 'pending',
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
      `Plan: ${args.normalized.decision} ${args.normalized.setupName || ''}.`,
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

function formatLiquidityObjective(label: string, objective?: TargetObjective | null): string {
  if (!objective) return `${label}: N/A`;
  return `${label}: ${objective.price} ${objective.label}`;
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
  const nearestLiquidityTarget = candidate.targetObjectivePlan?.nearestLiquidityTarget;
  const runnerTarget = candidate.targetObjectivePlan?.runnerTarget;
  const targetPathWarning = candidate.targetObjectivePlan?.targetPathWarning;
  const sourceObjectives = candidate.targetObjectivePlan?.objectives?.length
    ? candidate.targetObjectivePlan.objectives
    : fallbackObjectives;
  const directionLabels = objectiveDirectionLabel(candidate.direction === 'SHORT' ? 'SHORT' : 'LONG');
  const nearestDirectionalTarget =
    nearestLiquidityTarget && isValidObjectiveForCandidate(nearestLiquidityTarget)
      ? nearestLiquidityTarget
      : nearestObjectiveByDirection(sourceObjectives, candidate.direction === 'SHORT' ? 'SHORT' : 'LONG', candidate.entry);
  const runnerDirectionalTarget =
    runnerTarget && isValidObjectiveForCandidate(runnerTarget)
      ? runnerTarget
      : nearestObjectiveByDirection(
          sourceObjectives,
          candidate.direction === 'SHORT' ? 'SHORT' : 'LONG',
          candidate.entry,
          nearestDirectionalTarget
        );
  const opposingTarget = nearestObjectiveByDirection(
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
    return [
      'App Targets:',
      `T1: ${moneyLine(candidate.target1)}`,
      `T2: ${moneyLine(candidate.target2)}`,
      '',
      'Liquidity Map:',
      `Nearest ${directionLabels.primary} liquidity: N/A`,
      `${directionLabels.runner}: N/A`,
      `Nearest ${directionLabels.opposing} liquidity: ${opposingTarget ? `${opposingTarget.price} ${opposingTarget.label}` : 'N/A'}`,
      '',
      'Target Quality:',
      'T1/T2 are fixed-R tactical targets.',
      'No liquidity map levels found for this direction.',
    ].join('\n');
  }

  return [
    'App Targets:',
    `T1: ${moneyLine(candidate.target1)}`,
    `T2: ${moneyLine(candidate.target2)}`,
    '',
    'Liquidity Map:',
    formatLiquidityObjective(`Nearest ${directionLabels.primary} liquidity`, nearestDirectionalTarget),
    formatLiquidityObjective(directionLabels.runner, runnerDirectionalTarget),
    formatLiquidityObjective(`Nearest ${directionLabels.opposing} liquidity`, opposingTarget),
    '',
    'Target Quality:',
    'T1/T2 are close-range tactical targets.',
    nearestDirectionalTarget
      ? `Runner target only valid if price clears ${nearestDirectionalTarget.price} and holds.`
      : 'Runner target requires a confirmed break and hold beyond the tactical target zone.',
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
  const riskTooTight =
    typeof candidate.riskPoints === 'number' &&
    Number.isFinite(candidate.riskPoints) &&
    candidate.riskPoints > 0 &&
    candidate.riskPoints < minimumPracticalRisk;
  return [
    `Status: ${candidate.executionStatus}${candidate.blockReason ? ` | Blocker: ${candidate.blockReason}` : ''}`,
    `Trigger: ${candidate.requiredTrigger || 'Needs confirmation'}`,
    `Entry ${moneyLine(candidate.entry)} | Stop ${moneyLine(candidate.stop)} | Risk ${moneyLine(candidate.riskPoints)} | T1 ${moneyLine(candidate.target1)} | T2 ${moneyLine(candidate.target2)}`,
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
  const sourceObjectives = candidate.targetObjectivePlan?.objectives?.length
    ? candidate.targetObjectivePlan.objectives
    : objectives;
  const nearestLiquidity =
    candidate.targetObjectivePlan?.nearestLiquidityTarget ||
    nearestObjectiveByDirection(sourceObjectives, direction, candidate.entry);
  const runner =
    candidate.targetObjectivePlan?.runnerTarget ||
    nearestObjectiveByDirection(sourceObjectives, direction, candidate.entry, nearestLiquidity);
  const blocker = candidate.blockReason ? ` | Blocker: ${candidate.blockReason}` : '';
  return [
    `**${compactSetupName(candidate)} ${direction}**`,
    `Status: ${candidate.executionStatus}${blocker}`,
    `Trigger: ${candidate.requiredTrigger || 'Wait for confirmation'}`,
    `Entry ${moneyLine(candidate.entry)} | Stop ${moneyLine(candidate.stop)} | T1 ${moneyLine(candidate.target1)} | T2 ${moneyLine(candidate.target2)}`,
    nearestLiquidity ? `Next liquidity: ${nearestLiquidity.price} ${nearestLiquidity.label}` : 'Next liquidity: N/A',
    runner ? `Runner only after hold: ${runner.price} ${runner.label}` : null,
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

function formatPlanPayload(job: Exclude<AlertJob, 'premarket'>, tradeDate: string, analysis: AnalysisResult, planVersionId: string, instrument: Instrument): DiscordWebhookPayload {
  const normalized = buildAppTradePlan(analysis, { sessionType: job, instrument, windowStatusOverride: 'active' });
  const candidates = topConditionalCandidates(normalized.setupCandidates);
  const header = job === 'morning' ? 'Morning Plan Alert' : 'Lunch Plan Alert';
  const finalStatus = normalized.decisionStatus || (normalized.canExecute ? TradeDecisionStatus.ApprovedTrade : TradeDecisionStatus.Wait);
  const finalStatusLabel = `${statusEmoji(finalStatus)} ${finalStatus}`;
  const targetObjectives = analysis.structuredChartContext?.targetObjectives || [];
  const fields: DiscordEmbedField[] = [
    {
      name: '1️⃣ What',
      value: discordValue(
        `**${finalStatusLabel}**\n` +
        `${normalized.decision}${normalized.setupName ? ` - ${normalized.setupName}` : ''}\n` +
        `Session: ${job === 'morning' ? 'Morning Analysis' : 'Lunch Reversal'} | ${instrument} | ${tradeDate}`
      ),
      inline: false,
    },
    {
      name: '2️⃣ Why',
      value: discordValue([
        normalized.whyThisPlan || 'Wait for the highest-quality app-owned setup trigger.',
        formatSessionStoryLine(analysis),
      ].join('\n')),
      inline: false,
    },
    {
      name: '3️⃣ When',
      value: discordValue(formatFiveWsWhen(candidates)),
      inline: false,
    },
    {
      name: '4️⃣ Where',
      value: discordValue(formatFiveWsWhere(candidates, targetObjectives)),
      inline: false,
    },
    {
      name: '5️⃣ Watch-Out',
      value: discordValue(
        `${normalized.invalidation || 'Do not execute until entry, stop, trigger, risk, and invalidation pass.'}\n` +
        'Decision support only. No automated orders were placed.'
      ),
      inline: false,
    },
  ];

  const components = buildOutcomeComponents({
    planVersionId,
    sessionType: job,
    tradeDate,
    instrument,
  });

  return {
    username: 'Quant Desk',
    content: `# 📊 Quant Desk ${header}\n## ${statusEmoji(finalStatus)} ${finalStatus} • ${tradeDate}\nPlan ID: \`${planVersionId}\``,
    embeds: [
      {
        title: `📊 Quant Desk ${header} — ${tradeDate}`,
        description: '5 W trading card. App-owned decision support only.',
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
  const once = argValue('once') as AlertJob | null;
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
