import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAppTradePlan } from '../../src/lib/planEngine';
import { getEffectiveCanExecute } from '../../src/lib/effectiveExecution';
import { createPlanVersionId } from '../../src/lib/planMetadata';
import { buildTradeJournalRecord } from '../../src/lib/tradeJournal';
import { TRADE_RULES } from '../../src/config/tradeRules';
import {
  buildNinjaChartContext,
  getNinjaBridgeBars,
  getNinjaBridgeHealth,
  getNinjaHistoricalBars,
  getNinjaBridgePositions,
  getNinjaBridgeSnapshot,
  type NinjaBridgeBar,
  type NinjaBridgeHealth,
} from '../../src/lib/ninjaTraderBridge';
import {
  assessBridgeBarStaleness,
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
  scoreScannerCandidate,
  shouldSendScannerAlert,
  toEtMinutes,
  type BridgeTimeZoneMode,
  type BridgeTimestampMode,
  type ScannerConfidenceBreakdown,
  type ScannerState,
  type ScannerThresholds,
  type TargetCascadeResult,
} from '../../src/lib/localScannerEngine';
import { selectScannerPlan } from '../../src/agents/scannerPlanSelectionAgent';
import { scoreConditionalCandidateRiskForDisplay } from '../../src/agents/conditionalCandidateRiskAgent';
import {
  buildWatchlistEmbeddingText,
  buildWatchlistMemoryRecord,
  detectMorningContinuationWatchlist,
} from '../../src/agents/morningContinuationWatchlistAgent';
import {
  canSendAlertsFromHealth,
  evaluateScannerHealth,
  type ScannerHealthReport,
  type ScannerHealthStatus,
  type ScannerStateFileHealth,
} from '../../src/agents/scannerHealthAgent';
import { type AnalysisResult, type SetupCandidate, type TargetObjective } from '../../src/types';
import { fetchCachedMarketBars, loadMarketDataConfig, upsertMarketBars, type MarketBarTimeframe } from './market-data-store';
import { applyNewsMacroCaution, loadMacroCalendarConfig } from './macro-calendar';
import { renderChartMarkup, renderPriceLevelMap } from './chart-markup-renderer';
import { buildDiscordTradePlanVisualProvenance } from './discord-visual-contract';
import {
  compactDiscordSummary,
  morningWatchlistDiscordSummary,
  scannerHealthDiscordSummary,
  shouldSendScannerHealthAlert,
  validateDiscordPayload,
  type CompactDiscordAttachmentState,
  type DiscordWebhookPayload,
} from './discord-alert-format';
import {
  assertDiscordOutcomeEndpointSecretReady,
  buildOutcomeComponents,
  discordWebhookUrlForPayload,
  loadCanonicalDiscordOutcomeSecretFromEnvLocal,
} from './discord-outcome-buttons';
import {
  PROFESSIONAL_MODEL_ONE_LABEL,
  PROFESSIONAL_MODEL_TWO_LABEL,
  professionalizeReportText,
} from './professional-report-language';
import { resolveCurrentBridgeInstrument } from './bridge-instrument-resolver';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });
loadCanonicalDiscordOutcomeSecretFromEnvLocal();

type Instrument = 'MES' | 'MNQ';
type LiveSession = 'morning' | 'lunch';

export interface ScannerConfig {
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
  macroCalendarEnabled: boolean;
  barTimestampMode: BridgeTimestampMode;
  barTimeZone: BridgeTimeZoneMode;
}

interface ScannerStateFile {
  sent: Record<string, { state: ScannerState; confidence: number; sentAt: string }>;
  alertDeliveries: Record<string, ScannerAlertDeliveryRecord>;
  watchlistSent: Record<string, { direction: string; sentAt: string }>;
  windowStartSent: Record<string, string>;
  lastCompleted5mBySession: Record<string, string>;
  lastMarketMapRefreshBySession: Record<string, string>;
  lastHealthStatus: ScannerHealthStatus | null;
  lastHealthAlertSentAt: string | null;
}

interface ScannerStateReadResult {
  state: ScannerStateFile;
  health: ScannerStateFileHealth;
}

export type ScannerAlertDeliveryStatus = 'pending' | 'sent' | 'failed' | 'skipped' | 'failed_stale_no_retry';

export interface ScannerAlertDeliveryRecord {
  alertKey: string;
  planVersionId: string;
  instrument: Instrument;
  tradeDate: string;
  session: LiveSession;
  state: ScannerState;
  confidence: number;
  candidate: {
    setupType: string | null;
    direction: string | null;
    entry: number | null;
    stop: number | null;
    target1: number | null;
    target2: number | null;
  };
  deliveryStatus: ScannerAlertDeliveryStatus;
  webhookSource: ScannerWebhookEnvKey | 'dry_run' | 'discord_disabled' | null;
  httpStatus: number | null;
  discordMessageId: string | null;
  error: string | null;
  attemptedAt: string;
  sentAt: string | null;
  auditLogPath: string | null;
  stale: boolean;
  retryEligible: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_FILE = path.join(__dirname, '.nt-scanner-state.json');
const DISCORD_AUDIT_DIR = path.join(__dirname, 'discord-audit');
const TIMEFRAMES: MarketBarTimeframe[] = ['5m', '15m', '60m', '240m'];
const MARKET_STRUCTURE_CACHE_LIMIT = 20000;
export const SCANNER_REQUIRED_HISTORY_LOOKBACK_DAYS = 30;
const SCANNER_HISTORY_MIN_BARS: Record<MarketBarTimeframe, number> = {
  '5m': 500,
  '15m': 500,
  '60m': 120,
  '240m': 40,
};
const SCANNER_WEBHOOK_ENV_KEYS = ['QUANT_DESK_SCANNER_WEBHOOK_URL', 'SCANNER_DISCORD_WEBHOOK_URL', 'DISCORD_WEBHOOK_URL'] as const;

type ScannerWebhookEnvKey = typeof SCANNER_WEBHOOK_ENV_KEYS[number];

export type ScannerHistoryCoverageSource =
  | 'market_bars'
  | 'market_bars_bridge_repair'
  | 'bridge_repair'
  | 'missing';

export interface ScannerHistoryCoverageRecord {
  timeframe: MarketBarTimeframe;
  requiredLookbackDays: number;
  requestedFrom: string;
  requestedTo: string;
  barsLoaded: number;
  rangeStart: string | null;
  rangeEnd: string | null;
  source: ScannerHistoryCoverageSource;
  cacheBars: number;
  bridgeRepairBars: number;
  selfHealed: boolean;
  sufficient: boolean;
  warning: string | null;
}

export interface ScannerWebhookResolution {
  url: string | null;
  source: ScannerWebhookEnvKey | null;
  usingGenericFallback: boolean;
}

export function resolveScannerDiscordWebhookUrl(env: NodeJS.ProcessEnv = process.env): ScannerWebhookResolution {
  for (const key of SCANNER_WEBHOOK_ENV_KEYS) {
    const url = env[key]?.trim();
    if (url) {
      return {
        url,
        source: key,
        usingGenericFallback: key === 'DISCORD_WEBHOOK_URL',
      };
    }
  }
  return { url: null, source: null, usingGenericFallback: false };
}

function sanitizedError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/https:\/\/discord\.com\/api\/webhooks\/[^\s"'`]+/gi, 'https://discord.com/api/webhooks/[redacted]')
    .replace(/(QUANT_DESK_SCANNER_WEBHOOK_URL|SCANNER_DISCORD_WEBHOOK_URL|DISCORD_WEBHOOK_URL)=\S+/gi, '$1=[redacted]')
    .slice(0, 500);
}

function getDayOfWeek(tradeDate: string): string {
  return new Date(`${tradeDate}T12:00:00`).toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
  });
}

function supabaseRestUrl(): string | null {
  const raw = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  return raw ? raw.replace(/\/$/, '') : null;
}

function supabaseRagHeaders(serviceRoleKey: string): Record<string, string> {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

function candidateDeliverySnapshot(candidate: SetupCandidate | null): ScannerAlertDeliveryRecord['candidate'] {
  return {
    setupType: candidate?.setupType || null,
    direction: candidate?.direction || null,
    entry: typeof candidate?.entry === 'number' ? candidate.entry : null,
    stop: typeof candidate?.stop === 'number' ? candidate.stop : null,
    target1: typeof candidate?.target1 === 'number' ? candidate.target1 : null,
    target2: typeof candidate?.target2 === 'number' ? candidate.target2 : null,
  };
}

export function createPendingScannerAlertDeliveryRecord(args: {
  alertKey: string;
  planVersionId: string;
  instrument: Instrument;
  tradeDate: string;
  session: LiveSession;
  state: ScannerState;
  confidence: number;
  candidate: SetupCandidate | null;
  webhookSource: ScannerWebhookEnvKey | 'dry_run' | 'discord_disabled' | null;
  auditLogPath: string | null;
  attemptedAt?: string;
  stale?: boolean;
}): ScannerAlertDeliveryRecord {
  const stale = Boolean(args.stale);
  return {
    alertKey: args.alertKey,
    planVersionId: args.planVersionId,
    instrument: args.instrument,
    tradeDate: args.tradeDate,
    session: args.session,
    state: args.state,
    confidence: args.confidence,
    candidate: candidateDeliverySnapshot(args.candidate),
    deliveryStatus: 'pending',
    webhookSource: args.webhookSource,
    httpStatus: null,
    discordMessageId: null,
    error: null,
    attemptedAt: args.attemptedAt || new Date().toISOString(),
    sentAt: null,
    auditLogPath: args.auditLogPath,
    stale,
    retryEligible: !stale,
  };
}

export function markScannerAlertDeliverySent(
  record: ScannerAlertDeliveryRecord,
  args: {
    sentAt?: string;
    httpStatus?: number | null;
    webhookSource?: ScannerAlertDeliveryRecord['webhookSource'];
    discordMessageId?: string | null;
  } = {},
): ScannerAlertDeliveryRecord {
  return {
    ...record,
    deliveryStatus: 'sent',
    webhookSource: args.webhookSource ?? record.webhookSource,
    httpStatus: args.httpStatus ?? record.httpStatus,
    discordMessageId: args.discordMessageId ?? record.discordMessageId,
    error: null,
    sentAt: args.sentAt || new Date().toISOString(),
    retryEligible: false,
  };
}

export function markScannerAlertDeliveryFailed(
  record: ScannerAlertDeliveryRecord,
  args: { error: unknown; httpStatus?: number | null; stale?: boolean; webhookSource?: ScannerAlertDeliveryRecord['webhookSource'] },
): ScannerAlertDeliveryRecord {
  const stale = args.stale ?? record.stale;
  return {
    ...record,
    deliveryStatus: stale ? 'failed_stale_no_retry' : 'failed',
    webhookSource: args.webhookSource ?? record.webhookSource,
    httpStatus: args.httpStatus ?? record.httpStatus,
    error: sanitizedError(args.error),
    stale,
    retryEligible: !stale,
  };
}

export function markScannerAlertDeliverySkipped(
  record: ScannerAlertDeliveryRecord,
  args: { reason: string; webhookSource: 'dry_run' | 'discord_disabled' },
): ScannerAlertDeliveryRecord {
  return {
    ...record,
    deliveryStatus: 'skipped',
    webhookSource: args.webhookSource,
    error: args.reason,
    retryEligible: false,
  };
}

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
    '  --bridge-instrument "MES 06-26" NinjaTrader bridge instrument. If omitted or passed as MES/MNQ root only, scanner uses bridge /health defaultInstrument.',
    '  --bridge-url URL               Defaults to http://127.0.0.1:8765.',
    '  --poll-seconds 60              Poll cadence, minimum 15 seconds for continuous mode.',
    '  --discord false                Disable Discord sends but keep scanner logs.',
    '  --scan-windows false           Disable trade-plan scans; context/health only.',
    '  --afternoon true               Enable optional afternoon window.',
    '  --max-stale-bar-minutes 10     Refuse live scans when latest completed 5M bar is older than this.',
    '  --market-map-refresh-seconds 300 Refresh durable look-left map while outside trade windows.',
    '  --macro-calendar false         Disable high-impact macro calendar caution.',
    '  --bar-timestamp-mode close     NinjaTrader bar timestamps are usually close times; use open if your bridge emits bar start times.',
    '  --bar-time-zone eastern        Timezone for NinjaTrader bar timestamps without offsets: eastern, central, pacific, or local.',
    '',
    'Discord webhook precedence:',
    '  QUANT_DESK_SCANNER_WEBHOOK_URL, then SCANNER_DISCORD_WEBHOOK_URL, then legacy DISCORD_WEBHOOK_URL.',
  ].join('\n'));
}

function loadConfig(): ScannerConfig {
  const dryRun = hasArg('dry-run');
  const once = hasArg('once');
  const timestampMode = argValue('bar-timestamp-mode') || process.env.NINJATRADER_BAR_TIMESTAMP_MODE || 'close';
  const timeZoneArg = argValue('bar-time-zone') || process.env.NINJATRADER_BAR_TIME_ZONE || 'eastern';
  const barTimeZone: BridgeTimeZoneMode = ['eastern', 'central', 'pacific', 'local'].includes(timeZoneArg)
    ? (timeZoneArg as BridgeTimeZoneMode)
    : 'eastern';
  return {
    instrument: ((argValue('instrument') || 'MES') as Instrument),
    bridgeInstrument: argValue('bridge-instrument') || process.env.NINJATRADER_BRIDGE_INSTRUMENT || 'MES',
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
      conditional: numberArg('conditional-threshold', 65),
      executable: numberArg('executable-threshold', 80),
      educationalBlocked: numberArg('blocked-threshold', 70),
    },
    maxChaseDistancePoints: numberArg('max-chase-points', DEFAULT_SCANNER_RISK_GUARDS.maxChaseDistancePoints),
    maxChaseDistanceR: numberArg('max-chase-r', DEFAULT_SCANNER_RISK_GUARDS.maxChaseDistanceR),
    staleSetupMaxCandles: numberArg('stale-candles', DEFAULT_SCANNER_RISK_GUARDS.staleSetupMaxCandles),
    targetAlreadySweptLookbackCandles: numberArg('target-swept-lookback', DEFAULT_SCANNER_RISK_GUARDS.targetAlreadySweptLookbackCandles),
    allowRetestOnlyEntries: boolArg('allow-retest-only', DEFAULT_SCANNER_RISK_GUARDS.allowRetestOnlyEntries),
    maxStaleBarMinutes: numberArg('max-stale-bar-minutes', 10),
    marketMapRefreshSeconds: Math.max(60, numberArg('market-map-refresh-seconds', 300)),
    macroCalendarEnabled: boolArg('macro-calendar', true),
    barTimestampMode: timestampMode === 'open' ? 'open' : 'close',
    barTimeZone,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function emptyScannerState(): ScannerStateFile {
  return {
    sent: {},
    alertDeliveries: {},
    watchlistSent: {},
    windowStartSent: {},
    lastCompleted5mBySession: {},
    lastMarketMapRefreshBySession: {},
    lastHealthStatus: null,
    lastHealthAlertSentAt: null,
  };
}

async function readStateWithHealth(): Promise<ScannerStateReadResult> {
  try {
    const parsed = JSON.parse(await fs.readFile(STATE_FILE, 'utf8')) as Partial<ScannerStateFile>;
    return {
      state: {
        sent: parsed.sent || {},
        alertDeliveries: parsed.alertDeliveries || {},
        watchlistSent: parsed.watchlistSent || {},
        windowStartSent: parsed.windowStartSent || {},
        lastCompleted5mBySession: parsed.lastCompleted5mBySession || {},
        lastMarketMapRefreshBySession: parsed.lastMarketMapRefreshBySession || {},
        lastHealthStatus: parsed.lastHealthStatus || null,
        lastHealthAlertSentAt: parsed.lastHealthAlertSentAt || null,
      },
      health: { status: 'ok', message: 'Scanner state file is readable.' },
    };
  } catch (error) {
    const message = formatError(error);
    const isMissing = typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'ENOENT';
    return {
      state: emptyScannerState(),
      health: {
        status: isMissing ? 'missing_initialized' : 'corrupt',
        message: isMissing
          ? 'Scanner state file was missing and initialized safely.'
          : `Scanner state file could not be read; using an empty in-memory state for this cycle: ${message}`,
      },
    };
  }
}

async function readState(): Promise<ScannerStateFile> {
  return (await readStateWithHealth()).state;
}

async function writeState(state: ScannerStateFile): Promise<void> {
  await fs.writeFile(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

export interface MissedScannerDeliveryFinding {
  auditFile: string;
  alertKey: string;
  planVersionId: string | null;
  tradeDate: string | null;
  session: string | null;
  instrument: string | null;
  reason: string;
  deliveryStatus: ScannerAlertDeliveryStatus | 'missing';
  candidate: ScannerAlertDeliveryRecord['candidate'];
}

function candidateFromAudit(audit: any): SetupCandidate | null {
  const candidate = audit?.candidate;
  if (!candidate || typeof candidate !== 'object') return null;
  return candidate as SetupCandidate;
}

function auditCanExecute(audit: any): boolean {
  return audit?.source === 'live-scanner'
    && audit?.normalizedPlan?.canExecute === true
    && audit?.normalizedPlan?.decisionStatus === 'ApprovedTrade';
}

export async function findMissedExecutableScannerDeliveries(args: {
  auditDir?: string;
  state: ScannerStateFile;
  tradeDate?: string;
  instrument?: Instrument;
}): Promise<MissedScannerDeliveryFinding[]> {
  const auditDir = args.auditDir || DISCORD_AUDIT_DIR;
  let entries: string[] = [];
  try {
    entries = await fs.readdir(auditDir);
  } catch {
    return [];
  }

  const findings: MissedScannerDeliveryFinding[] = [];
  for (const name of entries) {
    if (!name.endsWith('.json') || !name.startsWith('scanner-')) continue;
    const auditFile = path.join(auditDir, name);
    let audit: any;
    try {
      audit = JSON.parse(await fs.readFile(auditFile, 'utf8'));
    } catch {
      continue;
    }
    if (!auditCanExecute(audit)) continue;
    if (args.tradeDate && audit.tradeDate !== args.tradeDate) continue;
    if (args.instrument && audit.instrument !== args.instrument) continue;
    const candidate = candidateFromAudit(audit);
    if (!candidate) continue;
    const alertKey = scannerAlertKey({
      tradeDate: audit.tradeDate,
      instrument: audit.instrument,
      session: audit.session,
      candidate,
      state: audit.state,
    });
    if (args.state.sent[alertKey]) continue;
    const delivery = args.state.alertDeliveries?.[alertKey];
    findings.push({
      auditFile,
      alertKey,
      planVersionId: typeof audit.planVersionId === 'string' ? audit.planVersionId : null,
      tradeDate: typeof audit.tradeDate === 'string' ? audit.tradeDate : null,
      session: typeof audit.session === 'string' ? audit.session : null,
      instrument: typeof audit.instrument === 'string' ? audit.instrument : null,
      reason: 'Executable scanner audit has normalizedPlan.canExecute=true, but no matching confirmed state.sent record exists.',
      deliveryStatus: delivery?.deliveryStatus || 'missing',
      candidate: candidateDeliverySnapshot(candidate),
    });
  }
  return findings;
}

async function warnOnMissedExecutableScannerDeliveries(args: {
  auditDir?: string;
  state: ScannerStateFile;
  tradeDate: string;
  instrument: Instrument;
}): Promise<void> {
  const findings = await findMissedExecutableScannerDeliveries(args);
  for (const finding of findings) {
    console.warn(
      `[scanner-delivery] Missed delivery diagnostic: ${finding.reason} alertKey=${finding.alertKey} status=${finding.deliveryStatus} audit=${finding.auditFile}`
    );
  }
}

function calendarDateBefore(tradeDate: string, days: number): string {
  const date = new Date(`${tradeDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
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

export function buildScannerHistoryPreloadPlan(tradeDate: string, session: LiveSession): Record<MarketBarTimeframe, { from: string; to: string; requiredLookbackDays: number; limit: number }> {
  const fromDate = calendarDateBefore(tradeDate, SCANNER_REQUIRED_HISTORY_LOOKBACK_DAYS);
  const to = etDateTime(tradeDate, session === 'morning' ? '12:00' : '15:30');
  return Object.fromEntries(TIMEFRAMES.map((timeframe) => [
    timeframe,
    {
      from: etDateTime(fromDate, '00:00'),
      to,
      requiredLookbackDays: SCANNER_REQUIRED_HISTORY_LOOKBACK_DAYS,
      limit: MARKET_STRUCTURE_CACHE_LIMIT,
    },
  ])) as Record<MarketBarTimeframe, { from: string; to: string; requiredLookbackDays: number; limit: number }>;
}

function barTimeMs(value?: string | null): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

export function barsCoverRequestedLookback(
  bars: NinjaBridgeBar[],
  requestedFrom: string,
  requestedTo: string,
  timeframe: MarketBarTimeframe = '5m',
): boolean {
  if (!bars.length) return false;
  const sorted = mergeBars([], bars);
  const first = barTimeMs(sorted[0]?.time);
  const last = barTimeMs(sorted[sorted.length - 1]?.time);
  const from = barTimeMs(requestedFrom);
  const to = barTimeMs(requestedTo);
  if (first === null || last === null || from === null || to === null) return false;
  const loadedSpanDays = (last - first) / (24 * 60 * 60 * 1000);
  const requiredSpanDays = Math.max(0, SCANNER_REQUIRED_HISTORY_LOOKBACK_DAYS - 1);
  const latestCompletedToleranceMs = (timeframeMinutes(timeframe) + 30) * 60_000;
  return (
    sorted.length >= SCANNER_HISTORY_MIN_BARS[timeframe] &&
    loadedSpanDays >= requiredSpanDays &&
    last >= to - latestCompletedToleranceMs
  );
}

export function summarizeScannerHistoryCoverage(record: ScannerHistoryCoverageRecord): string {
  const status = record.sufficient ? 'sufficient' : 'insufficient';
  const healed = record.selfHealed ? ', self-healed from bridge' : '';
  return `${record.timeframe}: ${status}, ${record.barsLoaded} bars, ${record.rangeStart || 'N/A'} to ${record.rangeEnd || 'N/A'}, source=${record.source}${healed}`;
}

function clip(value: string, max = 1024): string {
  const text = professionalizeReportText(value).trim() || 'N/A';
  return text.length <= max ? text : `${text.slice(0, max - 3)}...`;
}

async function writeScannerDiscordAuditLog(args: {
  session: LiveSession;
  tradeDate: string;
  instrument: Instrument;
  planVersionId: string;
  state: ScannerState;
  confidence: ReturnType<typeof scoreScannerCandidate>;
  candidate: SetupCandidate | null;
  displayCandidate?: SetupCandidate | null;
  normalized: ReturnType<typeof buildAppTradePlan>;
  currentPrice: number | null;
  completed5m: NinjaBridgeBar | null;
  scoringTimestamp: string;
  scoringTimestampSource: string;
  windowLabel: string;
  staleReason: string | null;
  scannerReviewStatus?: string | null;
  scannerAuditWarnings?: string[];
  historyCoverage?: ScannerHistoryCoverageRecord[];
  targetCascade: TargetCascadeResult;
  alertReason: string;
  chartMarkup: string | null;
  levelMap: string | null;
  auditDir?: string;
}): Promise<string> {
  const auditDir = args.auditDir || DISCORD_AUDIT_DIR;
  await fs.mkdir(auditDir, { recursive: true });
  const file = path.join(auditDir, `scanner-${args.session}-${args.tradeDate}-${args.instrument}-${args.planVersionId}.json`);
  const auditCandidate = args.displayCandidate ?? args.candidate;
  const conditionalRiskScore = auditCandidate
    ? scoreConditionalCandidateRiskForDisplay(auditCandidate)
    : null;
  await fs.writeFile(file, JSON.stringify({
    createdAt: new Date().toISOString(),
    source: 'live-scanner',
    session: args.session,
    tradeDate: args.tradeDate,
    instrument: args.instrument,
    planVersionId: args.planVersionId,
    state: args.state,
    confidence: args.confidence,
    candidate: auditCandidate,
    sourceCandidate: args.displayCandidate ? args.candidate : undefined,
    visualAuthority: args.displayCandidate ? 'normalized_plan' : undefined,
    conditionalRiskScore,
    normalizedPlan: args.normalized,
    currentPrice: args.currentPrice,
    completed5m: args.completed5m,
    scoringTimestamp: args.scoringTimestamp,
    scoringTimestampSource: args.scoringTimestampSource,
    windowLabel: args.windowLabel,
    staleReason: args.staleReason,
    scannerReviewStatus: args.scannerReviewStatus || null,
    scannerAuditWarnings: args.scannerAuditWarnings || [],
    historyCoverage: args.historyCoverage || [],
    historyCoverageSummary: (args.historyCoverage || []).map(summarizeScannerHistoryCoverage),
    targetCascade: args.targetCascade,
    alertReason: args.alertReason,
    attachments: {
      chartMarkup: args.chartMarkup,
      priceLevelMap: args.levelMap,
      ...(args.chartMarkup && args.levelMap ? buildDiscordTradePlanVisualProvenance(args.planVersionId) : {}),
    },
  }, null, 2));
  return file;
}

async function writeScannerWatchlistAuditLog(args: {
  tradeDate: string;
  instrument: Instrument;
  watchlistKey: string;
  completed5m: NinjaBridgeBar | null;
  currentPrice: number | null;
  windowLabel: string;
  watchlist: ReturnType<typeof detectMorningContinuationWatchlist>;
  memoryRecord: ReturnType<typeof buildWatchlistMemoryRecord>;
  embeddingText: string;
  auditDir?: string;
}): Promise<string> {
  const auditDir = args.auditDir || DISCORD_AUDIT_DIR;
  await fs.mkdir(auditDir, { recursive: true });
  const safeKey = args.watchlistKey.replace(/[^a-zA-Z0-9._-]/g, '-');
  const file = path.join(auditDir, `watchlist-${safeKey}.json`);
  await fs.writeFile(file, JSON.stringify({
    createdAt: new Date().toISOString(),
    source: 'live-scanner-watchlist',
    tradeDate: args.tradeDate,
    instrument: args.instrument,
    watchlistKey: args.watchlistKey,
    windowLabel: args.windowLabel,
    currentPrice: args.currentPrice,
    completed5m: args.completed5m,
    watchlist: args.watchlist,
    watchlistMemory: {
      record: args.memoryRecord,
      embeddingText: args.embeddingText,
      storage: 'scanner_audit_json_only',
      message: 'Watchlist saved for future context only. This does not change trade rules or future approval gates.',
      authority: 'Watchlist history may inform caution/context, not execution authority.',
    },
    approvalBoundary: args.watchlist.approvalBoundary,
    discord: {
      advisoryOnly: true,
      tradeAlertEligible: false,
      attachmentsGenerated: false,
      outcomeButtonsIncluded: false,
      ragMemoryWritten: false,
    },
    persistence: {
      supabaseRagWriteAttempted: false,
      reason: 'Existing RAG persistence is trade/setup-oriented; Phase 7C stores watchlist context in audit JSON only to avoid trade-memory contamination.',
    },
  }, null, 2));
  return file;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringField(record: Record<string, unknown> | null, keys: string[]): string | null {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return null;
}

function boolField(record: Record<string, unknown> | null, keys: string[]): boolean | null {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'boolean') return value;
  }
  return null;
}

function latestFactSummary(facts: unknown[]): { count: number; latest: Record<string, unknown> | null } {
  const records = facts.map(asRecord).filter((record): record is Record<string, unknown> => Boolean(record));
  return {
    count: records.length,
    latest: records.length ? records[records.length - 1] : null,
  };
}

function summarizeScannerEventTapeFacts(chartContext: unknown, completed5m: NinjaBridgeBar | null) {
  const context = asRecord(chartContext);
  const displacement = latestFactSummary(asArray(context?.displacementCandles));
  const sweeps = latestFactSummary([
    ...asArray(context?.liquiditySweeps),
    ...asArray(context?.liquidityEvents),
  ]);
  const reclaims = latestFactSummary(asArray(context?.reclaimEvents));
  const marketStructure = asRecord(context?.marketStructure);
  const setupReadyFacts = asRecord(context?.setupReadyFacts);
  const htfState = asRecord(context?.htfLiquidityDrawState);
  const latestDisplacement = displacement.latest;
  const fallbackBodyDirection =
    completed5m && completed5m.close > completed5m.open
      ? 'bullish'
      : completed5m && completed5m.close < completed5m.open
        ? 'bearish'
        : null;

  return {
    displacement: {
      direction:
        stringField(latestDisplacement, ['direction', 'bias']) ||
        stringField(asRecord(latestDisplacement?.candle), ['direction']) ||
        fallbackBodyDirection,
      count: displacement.count,
      latest: latestDisplacement,
    },
    sweepReclaim: {
      sweepCount: sweeps.count,
      reclaimCount: reclaims.count,
      latestSweep: sweeps.latest,
      latestReclaim: reclaims.latest,
      sweepReclaimPresent: sweeps.count > 0 || reclaims.count > 0,
    },
    mss: {
      breakOfStructure:
        boolField(marketStructure, ['breakOfStructure', 'marketStructureShift']) ??
        boolField(setupReadyFacts, ['breakOfStructure']),
      mssStatus:
        stringField(htfState, ['fiveMinuteMssStatus', 'postShiftState', 'state']) ||
        stringField(marketStructure, ['mssStatus', 'structureStatus']) ||
        null,
      htfState,
    },
  };
}

function summarizeScannerCandidateForTape(candidate: SetupCandidate | null, normalized: ReturnType<typeof buildAppTradePlan>) {
  const candidates = normalized.setupCandidates || [];
  return {
    selected: candidate
      ? {
          setupType: candidate.setupType,
          scenarioLabel: candidate.scenarioLabel,
          direction: candidate.direction,
          detectedStatus: candidate.detectedStatus,
          executionStatus: candidate.executionStatus,
          entry: candidate.entry,
          stop: candidate.stop,
          target1: candidate.target1,
          target2: candidate.target2,
          riskPoints: candidate.riskPoints,
          blockReason: candidate.blockReason,
          requiredTrigger: candidate.requiredTrigger,
          nextAction: candidate.nextAction,
        }
      : null,
    counts: {
      total: candidates.length,
      executable: candidates.filter((item) => item.executionStatus === 'Executable').length,
      conditional: candidates.filter((item) => item.executionStatus === 'Conditional').length,
      blocked: candidates.filter((item) => item.executionStatus === 'Blocked').length,
    },
    statuses: candidates.slice(0, 8).map((item) => ({
      setupType: item.setupType,
      direction: item.direction,
      detectedStatus: item.detectedStatus,
      executionStatus: item.executionStatus,
      entry: item.entry,
      stop: item.stop,
      target1: item.target1,
      target2: item.target2,
      riskPoints: item.riskPoints,
      blockReason: item.blockReason,
    })),
  };
}

export async function writeScannerDecisionTapeAuditLog(args: {
  session: LiveSession;
  tradeDate: string;
  instrument: Instrument;
  completed5m: NinjaBridgeBar | null;
  currentPrice: number | null;
  chartContext: unknown;
  candidate: SetupCandidate | null;
  normalized: ReturnType<typeof buildAppTradePlan>;
  state: ScannerState;
  confidence: ReturnType<typeof scoreScannerCandidate>;
  staleReason: string | null;
  scannerReviewStatus?: string | null;
  scannerAuditWarnings?: string[];
  alertDecision: { shouldSend: boolean; reason: string };
  planVersionId: string;
  dryRun: boolean;
  historyCoverage?: ScannerHistoryCoverageRecord[];
  auditDir?: string;
}): Promise<string> {
  const auditDir = args.auditDir || DISCORD_AUDIT_DIR;
  await fs.mkdir(auditDir, { recursive: true });
  const file = path.join(auditDir, `scanner-decision-tape-${args.tradeDate}-${args.instrument}-${args.session}.json`);
  const eventKey = args.completed5m?.time || args.planVersionId;
  let existing: Record<string, unknown> | null = null;
  try {
    existing = JSON.parse(await fs.readFile(file, 'utf8')) as Record<string, unknown>;
  } catch {
    existing = null;
  }
  const events = asRecord(existing?.events) || {};
  const event = {
    recordedAt: new Date().toISOString(),
    mode: args.dryRun ? 'dry_run' : 'live',
    time: args.completed5m?.time || null,
    completed5m: args.completed5m,
    currentPrice: args.currentPrice,
    facts: summarizeScannerEventTapeFacts(args.chartContext, args.completed5m),
    setupCandidateStatus: summarizeScannerCandidateForTape(args.candidate, args.normalized),
    plan: {
      planVersionId: args.planVersionId,
      decision: args.normalized.decision,
      decisionStatus: args.normalized.decisionStatus || null,
      noTradeReason: args.normalized.noTradeReason || null,
      entry: args.normalized.entry,
      stop: args.normalized.stop,
      t1: args.normalized.t1,
      t2: args.normalized.t2,
      riskPoints: args.normalized.riskPoints,
      canExecute: args.normalized.canExecute,
      earlyMoveReview: args.normalized.earlyMoveReview || null,
    },
    riskResult: {
      candidateRiskPoints: args.candidate?.riskPoints ?? null,
      blockReason: args.candidate?.blockReason ?? args.normalized.noTradeReason ?? null,
    },
    scannerState: args.state,
    reviewStatus: args.scannerReviewStatus || null,
    staleReason: args.staleReason,
    confidence: args.confidence,
    discord: {
      shouldSend: args.alertDecision.shouldSend,
      sendOrSuppressReason: args.alertDecision.reason,
      suppressed: !args.alertDecision.shouldSend,
    },
    classification: {
      live: !args.dryRun,
      replay: false,
      missed: args.state === 'Missed',
      stale: Boolean(args.staleReason),
      advisory: args.state === 'Watching' || args.state === 'TriggerPending',
    },
    auditWarnings: args.scannerAuditWarnings || [],
    historyCoverage: args.historyCoverage || [],
    historyCoverageSummary: (args.historyCoverage || []).map(summarizeScannerHistoryCoverage),
    authority: {
      decisionTapeApprovesTrade: false,
      decisionTapeChangesRules: false,
      decisionTapeChangesEntry: false,
      decisionTapeChangesStop: false,
      decisionTapeChangesTargets: false,
      decisionTapeChangesRisk: false,
      decisionTapeCanExecute: false,
    },
  };
  events[eventKey] = event;
  await fs.writeFile(file, JSON.stringify({
    reportType: 'scanner_decision_event_tape',
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tradeDate: args.tradeDate,
    instrument: args.instrument,
    session: args.session,
    boundary: 'decision_support_only_no_automated_orders',
    note: 'Chronological scanner event tape. Used for audit/reconstruction only; it does not approve trades or change execution gates.',
    eventCount: Object.keys(events).length,
    events,
  }, null, 2));
  return file;
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

async function fetchScannerHistoryFrame(args: {
  config: ScannerConfig;
  timeframe: MarketBarTimeframe;
  from: string;
  to: string;
  limit: number;
}): Promise<{ bars: NinjaBridgeBar[]; coverage: ScannerHistoryCoverageRecord }> {
  const marketConfig = loadMarketDataConfig();
  let cached: NinjaBridgeBar[] = [];
  if (marketConfig) {
    try {
      cached = await fetchCachedMarketBars({
        instrument: args.config.bridgeInstrument,
        timeframe: args.timeframe,
        from: args.from,
        to: args.to,
        config: marketConfig,
        limit: args.limit,
      });
    } catch (error) {
      console.warn(`[scanner-history] ${args.timeframe}: market_bars preload failed, attempting bridge self-heal: ${formatError(error)}`);
    }
  }

  let repaired: NinjaBridgeBar[] = [];
  const cacheSufficient = barsCoverRequestedLookback(cached, args.from, args.to, args.timeframe);
  if (!cacheSufficient) {
    try {
      const historical = await getNinjaHistoricalBars({
        instrument: args.config.bridgeInstrument,
        timeframe: args.timeframe,
        from: args.from,
        to: args.to,
        limit: args.limit,
        baseUrl: args.config.bridgeUrl,
      });
      repaired = historical.ok ? historical.bars || [] : [];
      if (!repaired.length) {
        console.warn(`[scanner-history] ${args.timeframe}: bridge self-heal returned no bars for ${args.from} to ${args.to}: ${historical.error || 'unknown error'}`);
      } else if (marketConfig) {
        try {
          await upsertMarketBars({
            bars: repaired,
            instrument: args.config.instrument,
            bridgeInstrument: args.config.bridgeInstrument,
            timeframe: args.timeframe,
            config: marketConfig,
          });
        } catch (error) {
          console.warn(`[scanner-history] ${args.timeframe}: self-healed bars loaded but cache upsert failed: ${formatError(error)}`);
        }
      }
    } catch (error) {
      console.warn(`[scanner-history] ${args.timeframe}: bridge self-heal failed: ${formatError(error)}`);
    }
  }

  const bars = mergeBars(repaired, cached);
  const sorted = mergeBars([], bars);
  const sufficient = barsCoverRequestedLookback(sorted, args.from, args.to, args.timeframe);
  const source: ScannerHistoryCoverageSource =
    cached.length && repaired.length ? 'market_bars_bridge_repair' :
    cached.length ? 'market_bars' :
    repaired.length ? 'bridge_repair' :
    'missing';
  const coverage: ScannerHistoryCoverageRecord = {
    timeframe: args.timeframe,
    requiredLookbackDays: SCANNER_REQUIRED_HISTORY_LOOKBACK_DAYS,
    requestedFrom: args.from,
    requestedTo: args.to,
    barsLoaded: sorted.length,
    rangeStart: sorted[0]?.time || null,
    rangeEnd: sorted[sorted.length - 1]?.time || null,
    source,
    cacheBars: cached.length,
    bridgeRepairBars: repaired.length,
    selfHealed: repaired.length > 0,
    sufficient,
    warning: sufficient
      ? null
      : `HTF history preload insufficient for ${args.timeframe}: required ${SCANNER_REQUIRED_HISTORY_LOOKBACK_DAYS} calendar days from ${args.from} to ${args.to}; loaded ${sorted.length} bars from ${sorted[0]?.time || 'N/A'} to ${sorted[sorted.length - 1]?.time || 'N/A'}.`,
  };
  return { bars: sorted, coverage };
}

export async function fetchLookLeftBars(config: ScannerConfig, tradeDate: string, session: LiveSession): Promise<Record<MarketBarTimeframe, NinjaBridgeBar[]>> {
  const result = await fetchLookLeftContext(config, tradeDate, session);
  return result.bars;
}

async function fetchLookLeftContext(config: ScannerConfig, tradeDate: string, session: LiveSession): Promise<{
  bars: Record<MarketBarTimeframe, NinjaBridgeBar[]>;
  coverage: ScannerHistoryCoverageRecord[];
}> {
  const marketConfig = loadMarketDataConfig();
  const plan = buildScannerHistoryPreloadPlan(tradeDate, session);
  const entries = await Promise.all(TIMEFRAMES.map(async (timeframe) => {
    const frame = plan[timeframe];
    const loaded = await fetchScannerHistoryFrame({
      config,
      timeframe,
      from: frame.from,
      to: frame.to,
      limit: frame.limit,
    });
    if (!marketConfig && loaded.coverage.source === 'bridge_repair') {
      loaded.coverage.warning = loaded.coverage.warning || `${timeframe}: market_bars config unavailable; using bridge self-heal only.`;
    }
    return [timeframe, loaded] as const;
  }));
  const coverage = entries.map(([, loaded]) => loaded.coverage);
  coverage.forEach((item) => {
    const line = summarizeScannerHistoryCoverage(item);
    if (item.sufficient) console.log(`[scanner-history] ${line}`);
    else console.warn(`[scanner-history] ${line} | ${item.warning}`);
  });
  return {
    bars: Object.fromEntries(entries.map(([timeframe, loaded]) => [timeframe, loaded.bars])) as Record<MarketBarTimeframe, NinjaBridgeBar[]>,
    coverage,
  };
}

function mergeBars(primary: NinjaBridgeBar[], fallback: NinjaBridgeBar[]): NinjaBridgeBar[] {
  const byTime = new Map<string, NinjaBridgeBar>();
  fallback.forEach((bar) => byTime.set(bar.time, bar));
  primary.forEach((bar) => byTime.set(bar.time, bar));
  return [...byTime.values()].sort((a, b) => String(a.time).localeCompare(String(b.time)));
}

async function analysisFromBars(args: {
  config: ScannerConfig;
  session: LiveSession;
  tradeDate: string;
  bars: Record<MarketBarTimeframe, NinjaBridgeBar[]>;
  asOf?: Date;
}): Promise<AnalysisResult> {
  const baseChartContext = buildNinjaChartContext({
    bars5m: args.bars['5m'],
    bars15m: args.bars['15m'],
    bars60m: args.bars['60m'],
    bars240m: args.bars['240m'],
    sessionType: args.session,
    instrument: args.config.instrument,
    tradeDate: args.tradeDate,
  });
  const chartContext = args.config.macroCalendarEnabled
    ? await applyNewsMacroCaution(baseChartContext, args.asOf || new Date(), loadMacroCalendarConfig())
    : baseChartContext;

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
    const lookLeft = await fetchLookLeftContext(args.config, args.tradeDate, session);
    const bars = {
      '5m': mergeBars(args.liveBars['5m'], lookLeft.bars['5m']),
      '15m': mergeBars(args.liveBars['15m'], lookLeft.bars['15m']),
      '60m': mergeBars(args.liveBars['60m'], lookLeft.bars['60m']),
      '240m': mergeBars(args.liveBars['240m'], lookLeft.bars['240m']),
    };
    const analysis = await analysisFromBars({ config: args.config, session, tradeDate: args.tradeDate, bars });
    const objectives = analysis.structuredChartContext?.targetObjectives?.length || 0;
    args.state.lastMarketMapRefreshBySession[key] = new Date().toISOString();
    return `market map refreshed (${session}; ${MARKET_MAPPING_COVERAGE.join(', ')}; ${objectives} target objectives; history ${lookLeft.coverage.map(summarizeScannerHistoryCoverage).join(' | ')}).`;
  } catch (error) {
    return `market map refresh skipped: ${formatError(error)}`;
  }
}

function buildDiscordPayload(args: {
  session: LiveSession;
  tradeDate: string;
  config: Pick<ScannerConfig, 'instrument'>;
  state: ScannerState;
  confidence: ScannerConfidenceBreakdown;
  candidate: SetupCandidate | null;
  normalized: ReturnType<typeof buildAppTradePlan>;
  windowLabel: string;
  planVersionId: string;
  attachments: CompactDiscordAttachmentState;
}): DiscordWebhookPayload {
  return compactDiscordSummary({
    session: args.session,
    tradeDate: args.tradeDate,
    instrument: args.config.instrument,
    planVersionId: args.planVersionId,
    normalized: args.normalized,
    candidates: args.candidate ? [args.candidate] : [],
    attachments: args.attachments,
    sourceLabel: 'Scanner',
    windowLabel: args.windowLabel,
    scoreOverride: args.confidence.score,
    decisionOverride: args.state,
    statusOverride: args.state,
    components: buildOutcomeComponents({
      planVersionId: args.planVersionId,
      sessionType: args.session,
      tradeDate: args.tradeDate,
      instrument: args.config.instrument,
      direction: args.candidate?.direction,
    }),
  });
}

export function candidateForNormalizedVisualAuthority(
  candidate: SetupCandidate | null,
  normalized: ReturnType<typeof buildAppTradePlan>,
): SetupCandidate | null {
  if (!candidate) return null;
  if (getEffectiveCanExecute(normalized)) return candidate;
  return {
    ...candidate,
    detectedStatus: 'Conditional' as SetupCandidate['detectedStatus'],
    executionStatus: 'Conditional' as SetupCandidate['executionStatus'],
    scenarioLabel: `${candidate.scenarioLabel || candidate.setupType} - normalized plan not executable`,
    nextAction: [
      normalized.whyThisPlan,
      'Normalized app-owned plan is not executable. Wait for a fresh completed 5M trigger/retest before human review.',
    ].filter(Boolean).join(' '),
    decisionQualityRecommendation: 'Conditional review only: normalized app-owned plan is not executable.',
  };
}

async function upsertScannerDiscordAlertRagRecord(args: {
  planVersionId: string;
  session: LiveSession;
  tradeDate: string;
  instrument: Instrument;
  analysis: AnalysisResult;
  normalized: ReturnType<typeof buildAppTradePlan>;
  candidate: SetupCandidate | null;
  confidence: number;
}): Promise<void> {
  const supabaseUrl = supabaseRestUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const userId = process.env.DISCORD_RAG_USER_ID || '';
  if (!supabaseUrl || !serviceRoleKey || !userId) {
    console.warn('Scanner Discord alert RAG pending save skipped. Set SUPABASE_URL/VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and DISCORD_RAG_USER_ID to let Discord buttons update RAG and lock the card after save.');
    return;
  }

  const journalRecord = buildTradeJournalRecord({
    dateTime: new Date().toISOString(),
    instrument: args.instrument,
    session: args.session,
    candidate: args.candidate,
    scannerScore: args.confidence,
    entry: args.normalized.entry ?? args.candidate?.entry ?? null,
    stop: args.normalized.stop ?? args.candidate?.stop ?? null,
    target: args.normalized.t1 ?? args.candidate?.target1 ?? null,
    outcome: 'pending',
    discordAlertId: args.planVersionId,
    notes: 'Scanner Discord alert created. Awaiting trader outcome button.',
  });
  const payload = {
    user_id: userId,
    session_type: args.session,
    trade_date: args.tradeDate,
    day_of_week: getDayOfWeek(args.tradeDate),
    instrument: args.instrument,
    trade_result: 'pending',
    outcome: null,
    source: 'discord_alert',
    analysis_mode: 'live',
    setup_quality_score: 0.5,
    plan_version_id: args.planVersionId,
    entry_price: args.normalized.entry ?? args.candidate?.entry ?? null,
    stop_price: args.normalized.stop ?? args.candidate?.stop ?? null,
    target_1_price: args.normalized.t1 ?? args.candidate?.target1 ?? null,
    target_2_price: args.normalized.t2 ?? args.candidate?.target2 ?? null,
    risk_points: args.normalized.riskPoints ?? args.candidate?.riskPoints ?? null,
    embedding_text: [
      `Scanner Discord alert pending outcome for ${args.session} ${args.instrument} on ${args.tradeDate}.`,
      `Plan: ${args.normalized.decisionLabel || args.normalized.decision} ${args.normalized.setupName || args.candidate?.setupType || ''}.`,
      `Journal model: ${journalRecord.modelType}. Tags: ${journalRecord.setupTags.join(', ') || 'none'}. Planned R: ${journalRecord.plannedR ?? 'pending'}.`,
      'Outcome buttons record trader-confirmed review only; no automated orders are placed.',
    ].join(' '),
    trade_plan_json: {
      planVersionId: args.planVersionId,
      discordOutcomeButtons: true,
      journalRecord,
      normalizedPlan: args.normalized,
      setupCandidates: args.candidate ? [args.candidate] : [],
      targetObjectives: args.analysis.structuredChartContext?.targetObjectives || [],
      outcome: {
        tradeTaken: null,
        direction: null,
        targetHit: null,
        source: 'discord_button_pending',
      },
      approvalBoundary: {
        discordOutcomeApprovesTrade: false,
        ragSaveApprovesTrade: false,
        buttonClickPlacesOrder: false,
      },
    },
    gemini_analysis_json: args.analysis,
    notes: 'Scanner Discord alert created. Awaiting trader outcome button.',
  };

  const headers = supabaseRagHeaders(serviceRoleKey);
  const updateResponse = await fetch(`${supabaseUrl}/rest/v1/trade_embeddings?plan_version_id=eq.${encodeURIComponent(args.planVersionId)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload),
  });
  if (!updateResponse.ok) {
    throw new Error(`Scanner Discord alert RAG update failed (${updateResponse.status}): ${await updateResponse.text()}`);
  }
  const updatedRows = await updateResponse.json().catch(() => []);
  if (Array.isArray(updatedRows) && updatedRows.length > 0) return;

  const insertResponse = await fetch(`${supabaseUrl}/rest/v1/trade_embeddings`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!insertResponse.ok) {
    throw new Error(`Scanner Discord alert RAG insert failed (${insertResponse.status}): ${await insertResponse.text()}`);
  }
}

async function attachDiscordMessageReceiptToRagRecord(args: {
  planVersionId: string;
  discordMessageId: string | null;
  webhookSource: ScannerWebhookEnvKey | 'dry_run' | 'discord_disabled' | null;
}): Promise<void> {
  if (!args.discordMessageId) return;
  const supabaseUrl = supabaseRestUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceRoleKey) return;

  const headers = supabaseRagHeaders(serviceRoleKey);
  const lookup = await fetch(
    `${supabaseUrl}/rest/v1/trade_embeddings?plan_version_id=eq.${encodeURIComponent(args.planVersionId)}&select=id,trade_plan_json`,
    { headers },
  );
  if (!lookup.ok) {
    console.warn(`Scanner Discord message receipt lookup skipped (${lookup.status}).`);
    return;
  }
  const rows = await lookup.json().catch(() => []);
  const row = Array.isArray(rows) && rows[0] ? rows[0] : null;
  if (!row?.id) return;
  const existingPlanJson = row.trade_plan_json && typeof row.trade_plan_json === 'object' ? row.trade_plan_json : {};
  const patch = {
    trade_plan_json: {
      ...existingPlanJson,
      discordMessage: {
        messageId: args.discordMessageId,
        webhookSource: args.webhookSource,
        editAfterOutcome: true,
        storedAt: new Date().toISOString(),
      },
    },
  };
  const update = await fetch(`${supabaseUrl}/rest/v1/trade_embeddings?id=eq.${encodeURIComponent(row.id)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(patch),
  });
  if (!update.ok) {
    console.warn(`Scanner Discord message receipt update skipped (${update.status}).`);
  }
}

function scannerWatchlistAlertKey(args: {
  tradeDate: string;
  instrument: Instrument;
  session: string;
  direction: string;
  watchlistType: string;
}): string {
  return `${args.tradeDate}:${args.instrument}:${args.session}:${args.direction}:${args.watchlistType}`;
}

function bridgeBarEtDate(bar: NinjaBridgeBar, mode: BridgeTimeZoneMode): string | null {
  const parsed = parseBridgeTime(bar.time, mode);
  if (!parsed) return null;
  return parsed.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

export function barsForMorningContinuationWatchlist(args: {
  bars5m: NinjaBridgeBar[];
  tradeDate: string;
  barTimeZone: BridgeTimeZoneMode;
  currentEtMinutes: number;
}): NinjaBridgeBar[] {
  const endMinutes = Math.max(args.currentEtMinutes, 10 * 60);
  return args.bars5m
    .filter((bar) => {
      if (bridgeBarEtDate(bar, args.barTimeZone) !== args.tradeDate) return false;
      const parsed = parseBridgeTime(bar.time, args.barTimeZone);
      if (!parsed) return false;
      const minutes = toEtMinutes(parsed);
      return minutes >= 9 * 60 + 30 && minutes <= endMinutes;
    })
    .sort((a, b) => {
      const aTime = parseBridgeTime(a.time, args.barTimeZone)?.getTime() || 0;
      const bTime = parseBridgeTime(b.time, args.barTimeZone)?.getTime() || 0;
      return aTime - bTime;
    });
}

export async function prepareLiveScannerWatchlistAlertArtifacts(args: {
  tradeDate: string;
  instrument: Instrument;
  watchlistKey: string;
  completed5m: NinjaBridgeBar | null;
  currentPrice: number | null;
  windowLabel: string;
  watchlist: ReturnType<typeof detectMorningContinuationWatchlist>;
  selectedCandidate?: SetupCandidate | null;
  normalized?: ReturnType<typeof buildAppTradePlan> | null;
  scannerState?: ScannerState | null;
  bars5m?: NinjaBridgeBar[];
  auditDir?: string;
}): Promise<{
  payload: DiscordWebhookPayload;
  files: string[];
  auditLogPath: string;
  memoryRecord: ReturnType<typeof buildWatchlistMemoryRecord>;
}> {
  const memoryRecord = buildWatchlistMemoryRecord({
    watchlist: args.watchlist,
    tradeDate: args.tradeDate,
    instrument: args.instrument,
    session: 'morning',
    bars5m: args.bars5m || [],
    currentPriceAtAlert: args.currentPrice,
    reasonNoEntry: args.watchlist.reason,
    scannerState: args.scannerState || null,
    selectedCandidateSnapshot: args.selectedCandidate || null,
    normalizedPlanSnapshot: args.normalized || null,
    auditWarnings: ['Phase 7C stored this as context-only audit memory. No Supabase/RAG trade-memory write was attempted.'],
  });
  const embeddingText = buildWatchlistEmbeddingText(memoryRecord);
  const auditLogPath = await writeScannerWatchlistAuditLog({
    tradeDate: args.tradeDate,
    instrument: args.instrument,
    watchlistKey: args.watchlistKey,
    completed5m: args.completed5m,
    currentPrice: args.currentPrice,
    windowLabel: args.windowLabel,
    watchlist: args.watchlist,
    memoryRecord,
    embeddingText,
    auditDir: args.auditDir,
  });
  const payload = morningWatchlistDiscordSummary({
    tradeDate: args.tradeDate,
    instrument: args.instrument,
    watchlist: args.watchlist,
  });
  const files: string[] = [];
  validateDiscordPayload(payload, files);
  return { payload, files, auditLogPath, memoryRecord };
}

export async function prepareLiveScannerDiscordAlertArtifacts(args: {
  session: LiveSession;
  tradeDate: string;
  config: Pick<ScannerConfig, 'instrument'>;
  state: ScannerState;
  confidence: ScannerConfidenceBreakdown;
  candidate: SetupCandidate | null;
  normalized: ReturnType<typeof buildAppTradePlan>;
  chartContext: AnalysisResult['structuredChartContext'] | null | undefined;
  currentPrice: number | null;
  completed5m: NinjaBridgeBar | null;
  scoringTimestamp: string;
  scoringTimestampSource: string;
  windowLabel: string;
  staleReason: string | null;
  scannerReviewStatus?: string | null;
  scannerAuditWarnings?: string[];
  historyCoverage?: ScannerHistoryCoverageRecord[];
  targetCascade: TargetCascadeResult;
  alertReason: string;
  planVersionId: string;
  outputDir?: string;
  auditDir?: string;
}): Promise<{
  payload: DiscordWebhookPayload;
  files: string[];
  chartMarkup: string | null;
  levelMap: string | null;
  auditLogPath: string;
}> {
  const visualCandidate = candidateForNormalizedVisualAuthority(args.candidate, args.normalized);
  const renderInput = visualCandidate
    ? {
        chartContext: args.chartContext || null,
        candidate: visualCandidate,
        instrument: args.config.instrument,
        tradeDate: args.tradeDate,
        sessionLabel: args.session,
        outputDir: args.outputDir,
        filePrefix: `scanner-${args.session}-${args.tradeDate}-${args.config.instrument}`,
      }
    : null;
  const chartMarkup = renderInput ? await renderChartMarkup(renderInput) : null;
  const levelMap = renderInput ? await renderPriceLevelMap(renderInput) : null;
  const files = [chartMarkup, levelMap].filter((file): file is string => Boolean(file));
  const auditLogPath = await writeScannerDiscordAuditLog({
    session: args.session,
    tradeDate: args.tradeDate,
    instrument: args.config.instrument,
    planVersionId: args.planVersionId,
    state: args.state,
    confidence: args.confidence,
    candidate: args.candidate,
    displayCandidate: visualCandidate,
    normalized: args.normalized,
    currentPrice: args.currentPrice,
    completed5m: args.completed5m,
    scoringTimestamp: args.scoringTimestamp,
    scoringTimestampSource: args.scoringTimestampSource,
    windowLabel: args.windowLabel,
    staleReason: args.staleReason,
    scannerReviewStatus: args.scannerReviewStatus,
    scannerAuditWarnings: args.scannerAuditWarnings,
    historyCoverage: args.historyCoverage,
    targetCascade: args.targetCascade,
    alertReason: args.alertReason,
    chartMarkup,
    levelMap,
    auditDir: args.auditDir,
  });
  const payload = buildDiscordPayload({
    session: args.session,
    tradeDate: args.tradeDate,
    config: args.config,
    state: args.state,
    confidence: args.confidence,
    candidate: visualCandidate,
    normalized: args.normalized,
    windowLabel: args.windowLabel,
    planVersionId: args.planVersionId,
    attachments: {
      chartPlan: Boolean(chartMarkup),
      priceLevelMap: Boolean(levelMap),
      auditLogPath,
    },
  });
  validateDiscordPayload(payload, files);
  return { payload, files, chartMarkup, levelMap, auditLogPath };
}

interface ScannerDiscordPostReceipt {
  deliveryStatus: 'sent' | 'skipped';
  webhookSource: ScannerWebhookEnvKey | 'dry_run' | 'discord_disabled' | null;
  httpStatus: number | null;
  discordMessageId: string | null;
}

class ScannerDiscordPostError extends Error {
  httpStatus: number | null;
  webhookSource: ScannerWebhookEnvKey | null;

  constructor(message: string, args: { httpStatus?: number | null; webhookSource?: ScannerWebhookEnvKey | null } = {}) {
    super(message);
    this.name = 'ScannerDiscordPostError';
    this.httpStatus = args.httpStatus ?? null;
    this.webhookSource = args.webhookSource ?? null;
  }
}

async function postDiscord(payload: DiscordWebhookPayload, config: ScannerConfig, files: string[] = []): Promise<ScannerDiscordPostReceipt> {
  validateDiscordPayload(payload, files);
  if (config.dryRun || !config.discordEnabled) {
    console.log(JSON.stringify({ ...payload, chartMarkupFiles: files }, null, 2));
    return {
      deliveryStatus: 'skipped',
      webhookSource: config.dryRun ? 'dry_run' : 'discord_disabled',
      httpStatus: null,
      discordMessageId: null,
    };
  }
  const webhook = resolveScannerDiscordWebhookUrl();
  if (!webhook.url) {
    throw new ScannerDiscordPostError('QUANT_DESK_SCANNER_WEBHOOK_URL or SCANNER_DISCORD_WEBHOOK_URL is required unless --dry-run or --discord false is used.', {
      webhookSource: webhook.source,
    });
  }
  if (webhook.usingGenericFallback) {
    console.warn('[scanner-discord] Using legacy DISCORD_WEBHOOK_URL. Prefer QUANT_DESK_SCANNER_WEBHOOK_URL for scanner-specific Discord separation.');
  }
  await assertDiscordOutcomeEndpointSecretReady(payload.components);
  const url = discordWebhookUrlForPayload(webhook.url, payload.components);
  const validFiles = files.filter(Boolean);
  const response = validFiles.length
    ? await (async () => {
        const form = new FormData();
        form.append('payload_json', JSON.stringify(payload));
        for (const [index, file] of validFiles.entries()) {
          const bytes = await fs.readFile(file);
          form.append(`files[${index}]`, new Blob([bytes], { type: 'image/png' }), path.basename(file));
        }
        return fetch(url, { method: 'POST', body: form });
      })()
    : await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
  if (!response.ok) {
    throw new ScannerDiscordPostError(`Discord webhook failed (${response.status}): ${await response.text()}`, {
      httpStatus: response.status,
      webhookSource: webhook.source,
    });
  }
  const bodyText = await response.text().catch(() => '');
  let discordMessageId: string | null = null;
  if (bodyText.trim()) {
    try {
      const parsed = JSON.parse(bodyText);
      discordMessageId = typeof parsed?.id === 'string' ? parsed.id : null;
    } catch {
      discordMessageId = null;
    }
  }
  return {
    deliveryStatus: 'sent',
    webhookSource: webhook.source,
    httpStatus: response.status,
    discordMessageId,
  };
}

async function sendScannerHealthAlertIfNeeded(args: {
  config: ScannerConfig;
  state: ScannerStateFile;
  report: ScannerHealthReport;
}): Promise<void> {
  const previousStatus = args.state.lastHealthStatus;
  const currentStatus = args.report.status;
  if (!shouldSendScannerHealthAlert(previousStatus, currentStatus)) return;

  if (!args.config.discordEnabled) {
    args.state.lastHealthStatus = currentStatus;
    console.log(`[scanner-health] Discord health alert skipped because Discord is disabled: ${previousStatus || 'none'} -> ${currentStatus}`);
    return;
  }

  const webhook = resolveScannerDiscordWebhookUrl();
  if (!args.config.dryRun && !webhook.url) {
    args.state.lastHealthStatus = currentStatus;
    console.warn(`[scanner-health] Discord health alert skipped because scanner Discord webhook is not configured: ${previousStatus || 'none'} -> ${currentStatus}`);
    return;
  }

  const payload = scannerHealthDiscordSummary({
    instrument: args.config.instrument,
    bridgeInstrument: args.config.bridgeInstrument,
    dryRun: args.config.dryRun,
    report: args.report,
  });

  try {
    await postDiscord(payload, args.config);
    args.state.lastHealthStatus = currentStatus;
    args.state.lastHealthAlertSentAt = new Date().toISOString();
    console.log(`[scanner-health] Health alert status change: ${previousStatus || 'none'} -> ${currentStatus}`);
  } catch (error) {
    console.warn(`[scanner-health] Discord health alert failed: ${formatError(error)}`);
  }
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
    `🗺️ Before ${TRADE_RULES.executionWindows.openingObservation.startET} ET: Market Mapping only`,
    `👀 ${TRADE_RULES.executionWindows.openingObservation.startET}-${TRADE_RULES.executionWindows.openingObservation.endET} ET: Opening observation, no trade approval`,
    `🔎 ${TRADE_RULES.executionWindows.morningExecution.startET}-${TRADE_RULES.executionWindows.morningExecution.endET} ET: Morning setup scanning`,
    `🗺️ ${TRADE_RULES.executionWindows.morningExecution.endET}-${TRADE_RULES.executionWindows.middayTrapReversal.startET} ET: Market Mapping only`,
    `🍽️ ${TRADE_RULES.executionWindows.middayTrapReversal.startET}-${TRADE_RULES.executionWindows.middayTrapReversal.endET} ET: Lunch setup scanning`,
    `🗺️ After ${TRADE_RULES.executionWindows.middayTrapReversal.endET} ET: Market Mapping only`,
  ].join('\n');
  return {
    username: 'Quant Desk',
    content: `# 🟢 Quant Desk Scanner Window Active — ${sessionLabel}\n⚠️ Decision support only. No automated orders were placed.`,
    embeds: [
      {
        title: `🟢 ${sessionLabel} Setup Scanner Online — ${args.tradeDate}`,
        description: '🔎 The live scanner is connected and actively checking the two approved trade models. Keep an eye out for a confirmed setup during this window. This notice is not a trade alert, and no-trade remains a valid professional decision.',
        color: 0x00bcd4,
        fields: [
          {
            name: '🕒 Scanner Window',
            value: clip([
              `🪟 Window: ${args.windowLabel}`,
              `⏰ Time: ${windowRange}`,
              `📈 Instrument: ${args.config.instrument}`,
              `🌉 Bridge instrument: ${args.config.bridgeInstrument}`,
            ].join('\n')),
            inline: false,
          },
          {
            name: '📅 Full Scanner Schedule',
            value: clip(fullSchedule),
            inline: false,
          },
          {
            name: '📡 Live Data',
            value: clip([
              `🌉 Bridge: ${args.config.bridgeUrl}`,
              `🔁 Poll cadence: ${args.config.pollSeconds}s`,
              `💵 Current price: ${money(args.currentPrice)}`,
              `🕯️ Latest completed 5M: ${args.completed5m?.time || 'N/A'}`,
            ].join('\n')),
            inline: false,
          },
          {
            name: '✅ Approved Models',
            value: `1️⃣ ${PROFESSIONAL_MODEL_ONE_LABEL}\n2️⃣ ${PROFESSIONAL_MODEL_TWO_LABEL}`,
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

function liveMarketMapStatus(liveBars: Partial<Record<MarketBarTimeframe, NinjaBridgeBar[]>>) {
  const availableTimeframes = TIMEFRAMES.filter((timeframe) => (liveBars[timeframe] || []).length > 0);
  const usableBars = availableTimeframes.reduce((total, timeframe) => total + (liveBars[timeframe] || []).length, 0);
  const loaded = availableTimeframes.length === TIMEFRAMES.length;
  const fallbackBridgeDataAvailable = usableBars > 0;

  return {
    loaded,
    usableBars,
    partial: availableTimeframes.length > 0 && !loaded,
    fallbackBridgeDataAvailable,
    message: loaded
      ? 'Live bridge bars are available across scanner market-map timeframes.'
      : fallbackBridgeDataAvailable
        ? 'Market-map cache may be incomplete, but live 5M/15M bridge context is available.'
        : 'Required market-map context is missing from live bridge bars.',
  };
}

function logScannerHealth(report: ScannerHealthReport): void {
  console.log(`[scanner-health] ${report.summary} ${report.recommendedAction}`);
  if (report.warnings.length) {
    console.warn(`[scanner-health] warnings: ${report.warnings.join(' | ')}`);
  }
  if (report.blockingReasons.length) {
    console.warn(`[scanner-health] blocking: ${report.blockingReasons.join(' | ')}`);
  }
}

async function runCycle(baseConfig: ScannerConfig): Promise<void> {
  let config = baseConfig;
  const now = new Date();
  const window = resolveScannerWindow(now, config.afternoonEnabled);
  const tradeDate = getScannerTradeDate(now);
  const stateRead = await readStateWithHealth();
  const state = stateRead.state;

  let healthOk = false;
  let bridgeHealth: NinjaBridgeHealth | null = null;
  const healthErrors: string[] = [];
  try {
    bridgeHealth = await getNinjaBridgeHealth(config.bridgeUrl);
    healthOk = Boolean(bridgeHealth.ok);
  } catch (error) {
    const message = formatError(error);
    healthErrors.push(`Bridge health failed: ${message}`);
    console.error(`[scanner] bridge health failed: ${message}`);
  }

  if (!healthOk) {
    const healthReport = evaluateScannerHealth({
      config: {
        appInstrument: config.instrument,
        bridgeInstrument: config.bridgeInstrument,
        bridgeUrl: config.bridgeUrl,
        timestampMode: config.barTimestampMode,
        barTimeZone: config.barTimeZone,
        discordEnabled: config.discordEnabled,
        dryRun: config.dryRun,
        macroCalendarEnabled: config.macroCalendarEnabled,
        maxStaleBarMinutes: config.maxStaleBarMinutes,
      },
      bridgeHealth,
      bridgeReachable: false,
      latestCompleted5mBar: null,
      barStaleness: {
        stale: true,
        latestTime: null,
        ageMinutes: null,
        maxAllowedMinutes: config.maxStaleBarMinutes,
        reason: 'Latest completed 5M bar unavailable because bridge health failed.',
      },
      discordWebhookConfigured: Boolean(resolveScannerDiscordWebhookUrl().url),
      marketMapStatus: { loaded: false, usableBars: 0, fallbackBridgeDataAvailable: false },
      scannerStateFileStatus: stateRead.health,
      macroCalendarStatus: {
        enabled: config.macroCalendarEnabled,
        loaded: !config.macroCalendarEnabled,
        unavailable: config.macroCalendarEnabled,
        message: config.macroCalendarEnabled ? 'Macro calendar was not evaluated because bridge health failed.' : 'Macro calendar is disabled intentionally.',
      },
      scannerWindow: window,
      errors: healthErrors,
    });
    logScannerHealth(healthReport);
    await sendScannerHealthAlertIfNeeded({ config, state, report: healthReport });
    await writeState(state);
    console.log(`[scanner] ${new Date().toISOString()} NoData: bridge unavailable.`);
    return;
  }

  const instrumentResolution = await resolveCurrentBridgeInstrument({
    bridgeUrl: config.bridgeUrl,
    appInstrument: config.instrument,
    requestedBridgeInstrument: config.bridgeInstrument,
  }, {
    getHealth: async () => bridgeHealth as NinjaBridgeHealth,
  });
  if (instrumentResolution.instrument !== config.bridgeInstrument || instrumentResolution.warning) {
    console.log(`[scanner-bridge] Active bridge instrument: ${instrumentResolution.instrument} (${instrumentResolution.source}).`);
    if (instrumentResolution.warning) console.warn(`[scanner-bridge] ${instrumentResolution.warning}`);
  }
  config = { ...config, bridgeInstrument: instrumentResolution.instrument };

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

  const healthReport = evaluateScannerHealth({
    config: {
      appInstrument: config.instrument,
      bridgeInstrument: config.bridgeInstrument,
      bridgeUrl: config.bridgeUrl,
      timestampMode: config.barTimestampMode,
      barTimeZone: config.barTimeZone,
      discordEnabled: config.discordEnabled,
      dryRun: config.dryRun,
      macroCalendarEnabled: config.macroCalendarEnabled,
      maxStaleBarMinutes: config.maxStaleBarMinutes,
    },
    bridgeHealth,
    bridgeReachable: healthOk,
    latestCompleted5mBar: completed5m,
    barStaleness: bridgeFreshness,
    discordWebhookConfigured: Boolean(resolveScannerDiscordWebhookUrl().url),
    marketMapStatus: liveMarketMapStatus(liveBars),
    scannerStateFileStatus: stateRead.health,
    macroCalendarStatus: {
      enabled: config.macroCalendarEnabled,
      loaded: config.macroCalendarEnabled,
      unavailable: false,
      message: config.macroCalendarEnabled
        ? 'Macro calendar is enabled; detailed event caution is evaluated during analysis.'
        : 'Macro calendar is disabled intentionally.',
    },
    scannerWindow: window,
  });
  logScannerHealth(healthReport);
  await sendScannerHealthAlertIfNeeded({ config, state, report: healthReport });

  if (!canSendAlertsFromHealth(healthReport)) {
    console.log(`[scanner] NoData: ${healthReport.blockingReasons.join(' | ')}`);
    await writeState(state);
    return;
  }

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

  const lookLeft = await fetchLookLeftContext(config, tradeDate, session).catch((error) => {
    console.warn(`[scanner] 30-day scanner history preload unavailable: ${formatError(error)}`);
    return null;
  });
  const historyCoverage = lookLeft?.coverage || [];
  const historyWarnings = historyCoverage.flatMap((item) => item.warning ? [item.warning] : []);
  const bars = lookLeft
    ? {
        '5m': mergeBars(liveBars['5m'], lookLeft.bars['5m']),
        '15m': mergeBars(liveBars['15m'], lookLeft.bars['15m']),
        '60m': mergeBars(liveBars['60m'], lookLeft.bars['60m']),
        '240m': mergeBars(liveBars['240m'], lookLeft.bars['240m']),
      }
    : liveBars;
  const macroAsOf = completed5m ? parseBridgeTime(completed5m.time, config.barTimeZone) || new Date() : new Date();
  const analysis = await analysisFromBars({ config, session, tradeDate, bars, asOf: macroAsOf });
  const normalized = buildAppTradePlan(analysis, { sessionType: session, instrument: config.instrument, windowStatusOverride: 'active' });
  const scoringDate = analysisTimestampDate(analysis, completed5m, config);
  const scoringTimestampSource =
    analysis.structuredChartContext?.chartTimestamp ? 'chartTimestamp' :
    analysis.structuredChartContext?.screenshotTimestamp ? 'screenshotTimestamp' :
    analysis.sessionLog?.timestamp ? 'analysis session timestamp' :
    completed5m?.time ? 'latest completed 5M candle' :
    'system time fallback';
  const currentEtMinutes = toEtMinutes(scoringDate);
  const scannerGuards = {
    maxChaseDistancePoints: config.maxChaseDistancePoints,
    maxChaseDistanceR: config.maxChaseDistanceR,
    staleSetupMaxCandles: config.staleSetupMaxCandles,
    targetAlreadySweptLookbackCandles: config.targetAlreadySweptLookbackCandles,
    allowRetestOnlyEntries: config.allowRetestOnlyEntries,
  };
  const initialSelection = selectScannerPlan({
    normalized,
    currentPrice,
    guards: scannerGuards,
  });
  const initialCandidate = initialSelection.candidate;
  const objectives = (analysis.structuredChartContext?.targetObjectives || initialCandidate?.targetObjectivePlan?.objectives || []) as TargetObjective[];
  const targetCascade = buildTargetCascade({
    candidate: initialCandidate,
    objectives,
    recentBars: bars['5m'],
    lookbackCandles: config.targetAlreadySweptLookbackCandles,
  });
  const selection = selectScannerPlan({
    normalized,
    currentPrice,
    guards: scannerGuards,
    targetCascade,
  });
  const candidate = selection.candidate;
  const confidence = scoreScannerCandidate(
    candidate,
    window,
    currentPrice,
    analysis.structuredChartContext?.multiTimeframeContext?.alignment?.alignedDirection === candidate?.direction,
    currentEtMinutes,
  );
  const stale = selection.stale;
  const stateForAlert = selection.stateForAlert;
  if (selection.auditWarnings.length) {
    console.warn(`[scanner] selection audit: ${selection.auditWarnings.join(' | ')}`);
  }
  const watchlistBars5m = barsForMorningContinuationWatchlist({
    bars5m: bars['5m'],
    tradeDate,
    barTimeZone: config.barTimeZone,
    currentEtMinutes,
  });
  const watchlist = detectMorningContinuationWatchlist({
    tradeDate,
    instrument: config.instrument,
    window,
    bars5m: watchlistBars5m,
    currentPrice,
    higherTimeframeAlignment:
      analysis.structuredChartContext?.multiTimeframeContext?.alignment?.alignedDirection === 'LONG' ||
      analysis.structuredChartContext?.multiTimeframeContext?.alignment?.alignedDirection === 'SHORT'
        ? analysis.structuredChartContext.multiTimeframeContext.alignment.alignedDirection
        : null,
    normalizedPlan: normalized,
    selectedCandidate: candidate,
    scannerState: stateForAlert,
  });
  if (watchlist.watchlistDetected) {
    console.log(
      `[scanner] [AM WATCHLIST] ${config.instrument} — ${watchlist.direction} DEVELOPING | WATCH ONLY — NO FRESH ENTRY | ${watchlist.reason} | ${watchlist.requiredNextCondition}`
    );
    console.warn(`[scanner] watchlist audit: ${watchlist.auditWarnings.join(' | ')}`);
    const watchlistKey = scannerWatchlistAlertKey({
      tradeDate,
      instrument: config.instrument,
      session: window.session,
      direction: watchlist.direction,
      watchlistType: watchlist.watchlistType,
    });
    if (!state.watchlistSent[watchlistKey]) {
      const watchlistArtifacts = await prepareLiveScannerWatchlistAlertArtifacts({
        tradeDate,
        instrument: config.instrument,
        watchlistKey,
        completed5m,
        currentPrice,
        windowLabel: window.label,
        watchlist,
        selectedCandidate: candidate,
        normalized,
        scannerState: stateForAlert,
        bars5m: watchlistBars5m,
      });
      try {
        const receipt = await postDiscord(watchlistArtifacts.payload, config, watchlistArtifacts.files);
        if (receipt.deliveryStatus === 'sent') {
          state.watchlistSent[watchlistKey] = { direction: watchlist.direction, sentAt: new Date().toISOString() };
          console.log(`[scanner] Sent advisory watchlist alert: ${watchlistKey} | audit=${watchlistArtifacts.auditLogPath}`);
        } else {
          console.log(`[scanner] Advisory watchlist alert skipped (${receipt.webhookSource || 'unknown'}): ${watchlistKey} | audit=${watchlistArtifacts.auditLogPath}`);
        }
      } catch (error) {
        console.warn(`[scanner] Advisory watchlist delivery failed safely; scanner will continue evaluating trade alerts: ${sanitizedError(error)}`);
      }
    } else {
      console.log(`[scanner] Advisory watchlist alert already sent for ${watchlistKey}.`);
    }
  }
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
  const planVersionId = createPlanVersionId(session, tradeDate);
  const decisionTapePath = await writeScannerDecisionTapeAuditLog({
    session,
    tradeDate,
    instrument: config.instrument,
    completed5m,
    currentPrice,
    chartContext: analysis.structuredChartContext || null,
    candidate,
    normalized,
    state: stateForAlert,
    confidence,
    staleReason: stale.reason,
    scannerReviewStatus: selection.reviewStatus,
    scannerAuditWarnings: [...selection.auditWarnings, ...historyWarnings],
    alertDecision,
    planVersionId,
    dryRun: config.dryRun,
    historyCoverage,
  });

  console.log(`[scanner] ${session} ${completed5m.time}: ${stateForAlert} confidence ${confidence.score}/100 | ${sameCompletedCandle ? 'same completed 5M, refreshed live plan | ' : ''}${alertDecision.reason} | decision tape=${decisionTapePath}`);
  state.lastCompleted5mBySession[sessionKey] = completed5m.time;

  const previousDelivery = state.alertDeliveries[alertKey];
  if (!alertDecision.shouldSend && stale.stale && previousDelivery?.deliveryStatus === 'failed' && previousDelivery.retryEligible) {
    state.alertDeliveries[alertKey] = {
      ...previousDelivery,
      deliveryStatus: 'failed_stale_no_retry',
      stale: true,
      retryEligible: false,
      error: previousDelivery.error || 'Discord delivery failed earlier; setup is now stale, so no retry will be attempted.',
    };
    console.warn(`[scanner-delivery] Failed alert delivery is now stale; no retry will be attempted: ${alertKey}`);
  }

  if (alertDecision.shouldSend) {
    const alertArtifacts = await prepareLiveScannerDiscordAlertArtifacts({
      session,
      tradeDate,
      config,
      planVersionId,
      state: stateForAlert,
      confidence,
      candidate,
      normalized,
      chartContext: analysis.structuredChartContext || null,
      currentPrice,
      completed5m,
      scoringTimestamp: scoringDate.toISOString(),
      scoringTimestampSource,
      windowLabel: window.label,
      staleReason: stale.reason,
      scannerReviewStatus: selection.reviewStatus,
      scannerAuditWarnings: [...selection.auditWarnings, ...historyWarnings],
      historyCoverage,
      targetCascade,
      alertReason: alertDecision.reason,
    });
    try {
      await upsertScannerDiscordAlertRagRecord({
        planVersionId,
        session,
        tradeDate,
        instrument: config.instrument,
        analysis,
        normalized,
        candidate,
        confidence: confidence.score,
      });
    } catch (error) {
      console.warn(`Scanner Discord alert RAG pending save failed safely: ${sanitizedError(error)}`);
    }
    const pendingDelivery = createPendingScannerAlertDeliveryRecord({
      alertKey,
      planVersionId,
      instrument: config.instrument,
      tradeDate,
      session,
      state: stateForAlert,
      confidence: confidence.score,
      candidate,
      webhookSource: config.dryRun ? 'dry_run' : (!config.discordEnabled ? 'discord_disabled' : resolveScannerDiscordWebhookUrl().source),
      auditLogPath: alertArtifacts.auditLogPath,
      stale: stale.stale,
    });
    state.alertDeliveries[alertKey] = pendingDelivery;
    await writeState(state);

    try {
      const receipt = await postDiscord(alertArtifacts.payload, config, alertArtifacts.files);
      if (receipt.deliveryStatus === 'sent') {
        const sentAt = new Date().toISOString();
        state.sent[alertKey] = { state: stateForAlert, confidence: confidence.score, sentAt };
        await attachDiscordMessageReceiptToRagRecord({
          planVersionId,
          discordMessageId: receipt.discordMessageId,
          webhookSource: receipt.webhookSource,
        });
        state.alertDeliveries[alertKey] = markScannerAlertDeliverySent(pendingDelivery, {
          sentAt,
          httpStatus: receipt.httpStatus,
          webhookSource: receipt.webhookSource,
          discordMessageId: receipt.discordMessageId,
        });
      } else {
        state.alertDeliveries[alertKey] = markScannerAlertDeliverySkipped(pendingDelivery, {
          reason: `Discord delivery skipped: ${receipt.webhookSource || 'unknown'}.`,
          webhookSource: receipt.webhookSource === 'discord_disabled' ? 'discord_disabled' : 'dry_run',
        });
      }
    } catch (error) {
      const httpStatus = error instanceof ScannerDiscordPostError ? error.httpStatus : null;
      const webhookSource = error instanceof ScannerDiscordPostError ? error.webhookSource : null;
      state.alertDeliveries[alertKey] = markScannerAlertDeliveryFailed(pendingDelivery, {
        error,
        httpStatus,
        webhookSource,
        stale: stale.stale,
      });
      console.warn(`[scanner-delivery] Executable alert delivery failed safely; scanner remains active and may retry while the setup remains fresh: ${sanitizedError(error)}`);
    }
  }

  await writeState(state);
  await warnOnMissedExecutableScannerDeliveries({ state, tradeDate, instrument: config.instrument });
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

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(formatError(error));
    process.exitCode = 1;
  });
}
