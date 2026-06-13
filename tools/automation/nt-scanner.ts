import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAppTradePlan } from '../../src/lib/planEngine';
import { getEffectiveCanExecute } from '../../src/lib/effectiveExecution';
import { createPlanVersionId } from '../../src/lib/planMetadata';
import { buildTradeJournalRecord } from '../../src/lib/tradeJournal';
import { buildFailedPlanReversalContextFromChartContext } from '../../src/lib/failedPlanReversalEngine';
import { summarizeActiveTimeframeMssRuleset, type ActiveTimeframeMssRulesetAudit } from '../../src/lib/activeTimeframeMssRulesetAudit';
import { targetsFromEntryStop, TRADE_RULES } from '../../src/config/tradeRules';
import { MARKET_MAPPING_WINDOW } from '../../src/config/timeWindows';
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
  buildCandidateLifecycleTrace,
  buildDeskState,
  buildTargetCascade,
  classifyScannerVisibility,
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
  type DeskPlayDirectionalBias,
  type ScannerConfidenceBreakdown,
  type ScannerCandidateLifecycleTrace,
  type DeskState,
  type ScannerState,
  type ScannerThresholds,
  type ScannerVisibilityMetadata,
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
  type ScannerCompletedFiveMinuteBarAssuranceStatus,
  type ScannerHealthReport,
  type ScannerHealthStatus,
  type ScannerStateFileHealth,
} from '../../src/agents/scannerHealthAgent';
import {
  ExecutionStatus,
  NoTradeReason,
  SetupCandidateStatus,
  SetupType,
  type AnalysisResult,
  type ChartContext,
  type DecisionQualityScoreItem,
  type FailedBreakEventFact,
  type FailedPlanReversalContext,
  type SetupCandidate,
  type TargetObjective,
} from '../../src/types';
import {
  fetchCachedMarketBars,
  loadMarketDataConfig,
  normalizeCandleTimeEt,
  toMarketDataGapEventRecord,
  upsertMarketBars,
  upsertMarketDataGapEvent,
  type MarketDataGapEventRecord,
  type MarketDataConfig,
  type MarketBarTimeframe,
} from './market-data-store';
import {
  marketDataSourceFromCounts,
  mergeMarketDataBars,
  repairMarketDataBarsWithinBaseRange,
  verifyMarketDataWindow,
  type MarketDataWindowSource,
} from './market-data-ingestion';
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
import { etDateTime } from './et-time';
import { isGeminiAdvisoryFallbackEnabled } from '../../src/config/geminiFallback';
import {
  attachDiscordMessageReceiptToRagPayload,
  resolveDiscordRagPersistenceConfig,
  upsertDiscordAlertRagPayload,
} from './discord-rag-persistence';
import { repairDuplicateAuditTargets } from './audit-target-repair';

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
  preMarketDataGate: boolean;
  macroCalendarEnabled: boolean;
  geminiAdvisoryFallbackEnabled: boolean;
  barTimestampMode: BridgeTimestampMode;
  barTimeZone: BridgeTimeZoneMode;
  discordMessageCleanupEnabled?: boolean;
  discordMessageTtlMinutes?: number;
}

interface ScannerStateFile {
  sent: Record<string, { state: ScannerState; confidence: number; sentAt: string }>;
  alertDeliveries: Record<string, ScannerAlertDeliveryRecord>;
  activeCampaignSent: Record<string, ScannerActiveCampaignLedgerRecord>;
  watchlistSent: Record<string, { direction: string; sentAt: string }>;
  deskPlaySent: Record<string, { direction: string; lineInSand: number | null; sentAt: string }>;
  deskPlanRefreshSent: Record<string, ScannerDeskPlanRefreshLedgerRecord>;
  windowStartSent: Record<string, string>;
  dataQualityNoticeSent: Record<string, string>;
  discordCleanupMessages: Record<string, ScannerDiscordCleanupRecord>;
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
export type ScannerActiveCampaignResetPolicy = 'trade_date_direction_campaign';
export type ScannerDiscordCleanupKind = 'trade_alert' | 'desk_play' | 'watchlist' | 'window_start' | 'health' | 'data_quality';

export interface ScannerDiscordCleanupRecord {
  key: string;
  messageId: string;
  kind: ScannerDiscordCleanupKind;
  webhookSource: ScannerWebhookEnvKey | null;
  postedAt: string;
  expiresAt: string;
  deletedAt: string | null;
  deleteStatus: 'pending' | 'deleted' | 'failed' | 'skipped';
  lastError: string | null;
}

const SCANNER_DISCORD_EPHEMERAL_CLEANUP_KINDS = new Set<ScannerDiscordCleanupKind>([
  'health',
  'data_quality',
  'window_start',
]);

function scannerDiscordCleanupKindIsEphemeral(kind: ScannerDiscordCleanupKind): boolean {
  return SCANNER_DISCORD_EPHEMERAL_CLEANUP_KINDS.has(kind);
}

export interface ScannerActiveCampaignLedgerRecord {
  campaignId: string;
  tradeDate: string;
  direction: string;
  setupType: string | null;
  state: ScannerState;
  confidence: number;
  firstAlertKey: string;
  firstSentAt: string;
  lastSeenAt: string;
  suppressedCount: number;
  resetPolicy: ScannerActiveCampaignResetPolicy;
}

export interface ScannerDeskPlanRefreshLedgerRecord {
  fingerprint: string;
  tradeDate: string;
  instrument: Instrument;
  session: string;
  activeCampaignId: string | null;
  direction: string;
  latestCompleted5m: string | null;
  lineInSand: number | null;
  longLine: number | null;
  shortLine: number | null;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  targetReactionLevel: number | null;
  sentAt: string;
}

export interface ScannerActiveCampaignDurableLedgerConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
  userId: string;
}

export type ScannerActiveCampaignClaimSource = 'none' | 'supabase' | 'blocked';

export interface ScannerActiveCampaignClaimResult {
  source: ScannerActiveCampaignClaimSource;
  claimed: boolean;
  shouldSuppress: boolean;
  campaignId: string | null;
  reason: string | null;
  durableAvailable: boolean;
}

export interface ScannerActiveCampaignLedgerReadiness {
  ready: boolean;
  source: 'supabase' | 'missing_config' | 'error';
  message: string;
}

type FetchLike = typeof fetch;

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
    activeTimeframeMssRuleset: ActiveTimeframeMssRulesetAudit | null;
    activeCampaign: {
      id: string;
      status: string;
      direction: string;
      htfRelationship: string;
      lineInSand: number | null;
      deDuplication: {
        oneTradePerCampaignRecommended: true;
        enforced: boolean;
        resetPolicy: string;
      };
    } | null;
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
const MARKET_DATA_GAP_FALLBACK_LEDGER = path.join(__dirname, '.market-data-gap-events.json');
const TIMEFRAMES: MarketBarTimeframe[] = ['5m', '15m', '60m', '120m', '240m'];
const MARKET_STRUCTURE_CACHE_LIMIT = 20000;
export const SCANNER_REQUIRED_HISTORY_LOOKBACK_DAYS = 30;
const SCANNER_HISTORY_MIN_BARS: Record<MarketBarTimeframe, number> = {
  '5m': 500,
  '15m': 500,
  '60m': 120,
  '120m': 80,
  '240m': 40,
};
const SCANNER_WEBHOOK_ENV_KEYS = ['QUANT_DESK_SCANNER_WEBHOOK_URL', 'SCANNER_DISCORD_WEBHOOK_URL', 'DISCORD_WEBHOOK_URL'] as const;

type ScannerWebhookEnvKey = typeof SCANNER_WEBHOOK_ENV_KEYS[number];

export type ScannerHistoryCoverageSource =
  MarketDataWindowSource;

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
  invalidBars?: number;
  duplicateTimestamps?: number;
  dataLimitation?: {
    status: 'none' | 'bridge_or_cache_incomplete';
    message: string | null;
    retryPolicy: 'cache_then_single_bridge_then_segmented_bridge';
    canInventMissingBars: false;
    htfPromotionAllowed: boolean;
    operatorAction?: string;
  };
}

export interface ScannerTwoHourCoverageDiagnostic {
  timeframe: '120m';
  available: boolean;
  sufficient: boolean;
  barsLoaded: number;
  source: ScannerHistoryCoverageSource | 'not_requested';
  rangeStart: string | null;
  rangeEnd: string | null;
  warning: string | null;
  candidatePromotionBoundary: 'two_hour_context_required_for_full_confirmation';
}

export interface ScannerHtfHistoryCoverageReadiness {
  status: 'sufficient' | 'data_limited' | 'not_evaluated';
  requiredTimeframes: Array<'15m' | '60m' | '120m' | '240m'>;
  insufficientTimeframes: Array<'15m' | '60m' | '120m' | '240m'>;
  summary: string;
  candidatePromotionBoundary: 'htf_context_required_for_failed_plan_reversal';
}

export interface ScannerPreMarketDataReadinessBackfillGateReport {
  status: 'ready' | 'data_not_ready';
  requiredTimeframes: MarketBarTimeframe[];
  insufficientTimeframes: MarketBarTimeframe[];
  completedFiveMinuteReady: boolean;
  completedFiveMinuteMessage: string;
  sourceSummary: string;
  recoverySteps: string[];
  canEnterTradePlanningMode: boolean;
  boundary: 'data_readiness_only_not_trade_approval';
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

export function loadScannerActiveCampaignLedgerConfig(env: NodeJS.ProcessEnv = process.env): ScannerActiveCampaignDurableLedgerConfig | null {
  const supabaseUrl = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || '';
  const userId = env.DISCORD_RAG_USER_ID || '';
  if (!supabaseUrl || !serviceRoleKey || !userId) return null;
  return { supabaseUrl, serviceRoleKey, userId };
}

function candidateDeliverySnapshot(candidate: SetupCandidate | null): ScannerAlertDeliveryRecord['candidate'] {
  return {
    setupType: candidate?.setupType || null,
    direction: candidate?.direction || null,
    entry: typeof candidate?.entry === 'number' ? candidate.entry : null,
    stop: typeof candidate?.stop === 'number' ? candidate.stop : null,
    target1: typeof candidate?.target1 === 'number' ? candidate.target1 : null,
    target2: typeof candidate?.target2 === 'number' ? candidate.target2 : null,
    activeTimeframeMssRuleset: candidate ? summarizeActiveTimeframeMssRuleset(candidate) : null,
    activeCampaign: candidate?.activeCampaign
      ? {
          id: candidate.activeCampaign.id,
          status: candidate.activeCampaign.status,
          direction: candidate.activeCampaign.direction,
          htfRelationship: candidate.activeCampaign.htfRelationship,
          lineInSand: candidate.activeCampaign.obstacleMap.lineInSand,
          deDuplication: candidate.activeCampaign.deDuplication,
        }
      : null,
  };
}

export function scannerActiveCampaignKey(candidate: SetupCandidate | null | undefined): string | null {
  const id = candidate?.activeCampaign?.id;
  return typeof id === 'string' && id.trim() ? id.trim() : null;
}

export function shouldSuppressActiveCampaignScannerAlert(args: {
  activeCampaignSent?: Record<string, ScannerActiveCampaignLedgerRecord>;
  candidate?: SetupCandidate | null;
}): {
  shouldSuppress: boolean;
  campaignId: string | null;
  reason: string | null;
  record: ScannerActiveCampaignLedgerRecord | null;
} {
  const campaignId = scannerActiveCampaignKey(args.candidate);
  if (!campaignId) {
    return { shouldSuppress: false, campaignId: null, reason: null, record: null };
  }
  const record = args.activeCampaignSent?.[campaignId] || null;
  if (!record) {
    return { shouldSuppress: false, campaignId, reason: null, record: null };
  }
  return {
    shouldSuppress: true,
    campaignId,
    record,
    reason: `ActiveCampaign duplicate suppressed: one trade alert already sent for ${campaignId}. Reset requires a new trade-date/direction campaign key.`,
  };
}

export function recordActiveCampaignScannerAlertSent(args: {
  activeCampaignSent: Record<string, ScannerActiveCampaignLedgerRecord>;
  candidate?: SetupCandidate | null;
  tradeDate: string;
  state: ScannerState;
  confidence: number;
  alertKey: string;
  sentAt?: string;
}): void {
  const campaignId = scannerActiveCampaignKey(args.candidate);
  if (!campaignId) return;
  const sentAt = args.sentAt || new Date().toISOString();
  const previous = args.activeCampaignSent[campaignId];
  args.activeCampaignSent[campaignId] = {
    campaignId,
    tradeDate: args.tradeDate,
    direction: args.candidate?.direction || args.candidate?.activeCampaign?.direction || 'NONE',
    setupType: args.candidate?.setupType || null,
    state: args.state,
    confidence: args.confidence,
    firstAlertKey: previous?.firstAlertKey || args.alertKey,
    firstSentAt: previous?.firstSentAt || sentAt,
    lastSeenAt: sentAt,
    suppressedCount: previous?.suppressedCount || 0,
    resetPolicy: 'trade_date_direction_campaign',
  };
}

export function recordActiveCampaignScannerAlertSuppressed(args: {
  activeCampaignSent: Record<string, ScannerActiveCampaignLedgerRecord>;
  campaignId: string;
  seenAt?: string;
}): void {
  const previous = args.activeCampaignSent[args.campaignId];
  if (!previous) return;
  args.activeCampaignSent[args.campaignId] = {
    ...previous,
    lastSeenAt: args.seenAt || new Date().toISOString(),
    suppressedCount: previous.suppressedCount + 1,
  };
}

function scannerActiveCampaignLedgerHeaders(serviceRoleKey: string): Record<string, string> {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

function scannerActiveCampaignLedgerUrl(config: ScannerActiveCampaignDurableLedgerConfig, query = ''): string {
  return `${config.supabaseUrl}/rest/v1/scanner_active_campaign_alerts${query}`;
}

function scannerActiveCampaignRow(args: {
  config: ScannerActiveCampaignDurableLedgerConfig;
  campaignId: string;
  candidate?: SetupCandidate | null;
  tradeDate: string;
  instrument: Instrument;
  session: LiveSession;
  state: ScannerState;
  confidence: number;
  alertKey: string;
  planVersionId?: string | null;
  deliveryStatus?: 'pending' | 'sent' | 'failed' | 'skipped' | 'released';
}): Record<string, unknown> {
  return {
    user_id: args.config.userId,
    campaign_id: args.campaignId,
    trade_date: args.tradeDate,
    instrument: args.instrument,
    session: args.session,
    direction: args.candidate?.direction || args.candidate?.activeCampaign?.direction || 'NONE',
    setup_type: args.candidate?.setupType || null,
    state: args.state,
    confidence: args.confidence,
    alert_key: args.alertKey,
    plan_version_id: args.planVersionId || null,
    delivery_status: args.deliveryStatus || 'pending',
    last_seen_at: new Date().toISOString(),
    reset_policy: 'trade_date_direction_campaign',
    metadata: {
      source: 'nt_scanner_active_campaign_dedup',
      authority: args.candidate?.activeCampaign?.authority || null,
      htfRelationship: args.candidate?.activeCampaign?.htfRelationship || null,
      lineInSand: args.candidate?.activeCampaign?.obstacleMap?.lineInSand ?? null,
    },
  };
}

async function fetchScannerActiveCampaignRows(args: {
  config: ScannerActiveCampaignDurableLedgerConfig;
  campaignId: string;
  fetchImpl?: FetchLike;
}): Promise<any[]> {
  const fetchImpl = args.fetchImpl || fetch;
  const headers = scannerActiveCampaignLedgerHeaders(args.config.serviceRoleKey);
  const query = `?user_id=eq.${encodeURIComponent(args.config.userId)}&campaign_id=eq.${encodeURIComponent(args.campaignId)}&select=*`;
  const response = await fetchImpl(scannerActiveCampaignLedgerUrl(args.config, query), { headers });
  if (!response.ok) {
    throw new Error(`ActiveCampaign ledger lookup failed (${response.status}): ${await response.text()}`);
  }
  const rows = await response.json().catch(() => []);
  return Array.isArray(rows) ? rows : [];
}

async function patchScannerActiveCampaignLedger(args: {
  config: ScannerActiveCampaignDurableLedgerConfig;
  campaignId: string;
  patch: Record<string, unknown>;
  fetchImpl?: FetchLike;
}): Promise<void> {
  const fetchImpl = args.fetchImpl || fetch;
  const headers = scannerActiveCampaignLedgerHeaders(args.config.serviceRoleKey);
  const query = `?user_id=eq.${encodeURIComponent(args.config.userId)}&campaign_id=eq.${encodeURIComponent(args.campaignId)}`;
  const response = await fetchImpl(scannerActiveCampaignLedgerUrl(args.config, query), {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ ...args.patch, updated_at: new Date().toISOString() }),
  });
  if (!response.ok) {
    throw new Error(`ActiveCampaign ledger update failed (${response.status}): ${await response.text()}`);
  }
}

export async function claimDurableActiveCampaignScannerAlert(args: {
  config: ScannerActiveCampaignDurableLedgerConfig | null;
  candidate?: SetupCandidate | null;
  tradeDate: string;
  instrument: Instrument;
  session: LiveSession;
  state: ScannerState;
  confidence: number;
  alertKey: string;
  planVersionId: string;
  fetchImpl?: FetchLike;
}): Promise<ScannerActiveCampaignClaimResult> {
  const campaignId = scannerActiveCampaignKey(args.candidate);
  if (!campaignId) {
    return { source: 'none', claimed: true, shouldSuppress: false, campaignId: null, reason: null, durableAvailable: false };
  }
  if (!args.config) {
    return {
      source: 'blocked',
      claimed: false,
      shouldSuppress: true,
      campaignId,
      reason: 'ActiveCampaign alert blocked: durable Supabase ledger is required for one-trade-per-campaign de-duplication. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and DISCORD_RAG_USER_ID.',
      durableAvailable: false,
    };
  }

  const fetchImpl = args.fetchImpl || fetch;
  const headers = scannerActiveCampaignLedgerHeaders(args.config.serviceRoleKey);
  const row = scannerActiveCampaignRow({
    config: args.config,
    campaignId,
    candidate: args.candidate,
    tradeDate: args.tradeDate,
    instrument: args.instrument,
    session: args.session,
    state: args.state,
    confidence: args.confidence,
    alertKey: args.alertKey,
    planVersionId: args.planVersionId,
    deliveryStatus: 'pending',
  });
  const insert = await fetchImpl(scannerActiveCampaignLedgerUrl(args.config), {
    method: 'POST',
    headers,
    body: JSON.stringify(row),
  });
  if (insert.ok) {
    return {
      source: 'supabase',
      claimed: true,
      shouldSuppress: false,
      campaignId,
      reason: `ActiveCampaign durable ledger claimed ${campaignId}.`,
      durableAvailable: true,
    };
  }
  if (insert.status !== 409) {
    throw new Error(`ActiveCampaign ledger claim failed (${insert.status}): ${await insert.text()}`);
  }

  const existing = (await fetchScannerActiveCampaignRows({ config: args.config, campaignId, fetchImpl }))[0] || null;
  const status = typeof existing?.delivery_status === 'string' ? existing.delivery_status : 'pending';
  if (status === 'failed' || status === 'skipped' || status === 'released') {
    await patchScannerActiveCampaignLedger({
      config: args.config,
      campaignId,
      fetchImpl,
      patch: {
        ...row,
        delivery_status: 'pending',
        first_claimed_at: new Date().toISOString(),
      },
    });
    return {
      source: 'supabase',
      claimed: true,
      shouldSuppress: false,
      campaignId,
      reason: `ActiveCampaign durable ledger reclaimed ${campaignId} after prior ${status} delivery.`,
      durableAvailable: true,
    };
  }

  const suppressedCount = Number.isFinite(Number(existing?.suppressed_count)) ? Number(existing.suppressed_count) + 1 : 1;
  await patchScannerActiveCampaignLedger({
    config: args.config,
    campaignId,
    fetchImpl,
    patch: {
      last_seen_at: new Date().toISOString(),
      suppressed_count: suppressedCount,
      metadata: {
        ...(existing?.metadata && typeof existing.metadata === 'object' ? existing.metadata : {}),
        lastSuppressedAlertKey: args.alertKey,
        lastSuppressedPlanVersionId: args.planVersionId,
      },
    },
  });
  return {
    source: 'supabase',
    claimed: false,
    shouldSuppress: true,
    campaignId,
    reason: `ActiveCampaign duplicate suppressed by durable Supabase ledger: one trade alert already ${status} for ${campaignId}.`,
    durableAvailable: true,
  };
}

export async function markDurableActiveCampaignScannerAlertSent(args: {
  config: ScannerActiveCampaignDurableLedgerConfig | null;
  campaignId: string | null;
  fetchImpl?: FetchLike;
}): Promise<void> {
  if (!args.config || !args.campaignId) return;
  await patchScannerActiveCampaignLedger({
    config: args.config,
    campaignId: args.campaignId,
    fetchImpl: args.fetchImpl,
    patch: {
      delivery_status: 'sent',
      first_sent_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    },
  });
}

export async function releaseDurableActiveCampaignScannerAlertClaim(args: {
  config: ScannerActiveCampaignDurableLedgerConfig | null;
  campaignId: string | null;
  deliveryStatus: 'failed' | 'skipped' | 'released';
  reason: string;
  fetchImpl?: FetchLike;
}): Promise<void> {
  if (!args.config || !args.campaignId) return;
  const rows = await fetchScannerActiveCampaignRows({ config: args.config, campaignId: args.campaignId, fetchImpl: args.fetchImpl });
  const existing = rows[0] || {};
  await patchScannerActiveCampaignLedger({
    config: args.config,
    campaignId: args.campaignId,
    fetchImpl: args.fetchImpl,
    patch: {
      delivery_status: args.deliveryStatus,
      last_seen_at: new Date().toISOString(),
      metadata: {
        ...(existing?.metadata && typeof existing.metadata === 'object' ? existing.metadata : {}),
        releaseReason: args.reason,
        releasedAt: new Date().toISOString(),
      },
    },
  });
}

export async function verifyScannerActiveCampaignLedgerReady(args: {
  config: ScannerActiveCampaignDurableLedgerConfig | null;
  fetchImpl?: FetchLike;
}): Promise<ScannerActiveCampaignLedgerReadiness> {
  if (!args.config) {
    return {
      ready: false,
      source: 'missing_config',
      message: 'ActiveCampaign ledger is not configured. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and DISCORD_RAG_USER_ID.',
    };
  }
  const fetchImpl = args.fetchImpl || fetch;
  try {
    const response = await fetchImpl(
      scannerActiveCampaignLedgerUrl(args.config, '?select=id&limit=1'),
      { headers: scannerActiveCampaignLedgerHeaders(args.config.serviceRoleKey) },
    );
    if (!response.ok) {
      return {
        ready: false,
        source: 'error',
        message: `ActiveCampaign ledger check failed (${response.status}): ${await response.text()}`,
      };
    }
    return {
      ready: true,
      source: 'supabase',
      message: 'ActiveCampaign durable Supabase ledger is ready.',
    };
  } catch (error) {
    return {
      ready: false,
      source: 'error',
      message: `ActiveCampaign ledger check failed: ${formatError(error)}`,
    };
  }
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

function boolEnv(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (value === undefined) return fallback;
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
    '  --pre-market-data-gate true    Preload/repair 30-day 5M/15M/1H/2H/4H context before setup scans.',
    '  --macro-calendar false         Disable high-impact macro calendar caution.',
    '  --bar-timestamp-mode close     NinjaTrader bar timestamps are usually close times; use open if your bridge emits bar start times.',
    '  --bar-time-zone eastern        Timezone for NinjaTrader bar timestamps without offsets: eastern, central, pacific, or local.',
    '  --discord-message-cleanup true Delete scanner Discord messages after the configured TTL. Defaults to true.',
    '  --discord-message-ttl-minutes 15  Age in minutes before scanner Discord messages are deleted; 0 disables cleanup.',
    '  --preflight-active-campaign-ledger  Verify Supabase campaign ledger env/table and exit.',
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
  const ttlMinutes = Math.max(0, numberArg('discord-message-ttl-minutes', Number(process.env.SCANNER_DISCORD_MESSAGE_TTL_MINUTES || process.env.QUANT_DESK_SCANNER_MESSAGE_TTL_MINUTES || 15)));
  const cleanupEnabled = boolArg('discord-message-cleanup', boolEnv('SCANNER_DISCORD_MESSAGE_CLEANUP', true)) && ttlMinutes > 0;
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
    preMarketDataGate: boolArg('pre-market-data-gate', true),
    macroCalendarEnabled: boolArg('macro-calendar', true),
    geminiAdvisoryFallbackEnabled: isGeminiAdvisoryFallbackEnabled(),
    barTimestampMode: timestampMode === 'open' ? 'open' : 'close',
    barTimeZone,
    discordMessageCleanupEnabled: cleanupEnabled,
    discordMessageTtlMinutes: ttlMinutes,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function emptyScannerState(): ScannerStateFile {
  return {
    sent: {},
    alertDeliveries: {},
    activeCampaignSent: {},
    watchlistSent: {},
    deskPlaySent: {},
    deskPlanRefreshSent: {},
    windowStartSent: {},
    dataQualityNoticeSent: {},
    discordCleanupMessages: {},
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
        activeCampaignSent: parsed.activeCampaignSent || {},
        watchlistSent: parsed.watchlistSent || {},
        deskPlaySent: parsed.deskPlaySent || {},
        deskPlanRefreshSent: parsed.deskPlanRefreshSent || {},
        windowStartSent: parsed.windowStartSent || {},
        dataQualityNoticeSent: parsed.dataQualityNoticeSent || {},
        discordCleanupMessages: parsed.discordCleanupMessages || {},
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

type LocalMarketDataGapEventRecord = MarketDataGapEventRecord & {
  localRecordedAt: string;
  syncStatus: 'pending_supabase_sync' | 'synced_to_supabase';
  syncReason: string;
  syncedAt?: string;
  syncError?: string;
};

function marketDataGapEventKey(record: MarketDataGapEventRecord): string {
  return [
    record.user_id,
    record.bridge_instrument,
    record.timeframe,
    record.requested_from_et,
    record.requested_to_et,
  ].join('|');
}

export async function writeLocalMarketDataGapEvent(args: {
  record: MarketDataGapEventRecord;
  reason: string;
  ledgerPath?: string;
}): Promise<{ path: string; key: string; records: number }> {
  const ledgerPath = args.ledgerPath || MARKET_DATA_GAP_FALLBACK_LEDGER;
  const key = marketDataGapEventKey(args.record);
  let records: LocalMarketDataGapEventRecord[] = [];
  try {
    const parsed = JSON.parse(await fs.readFile(ledgerPath, 'utf8')) as unknown;
    records = Array.isArray(parsed) ? parsed.filter((item): item is LocalMarketDataGapEventRecord => Boolean(item && typeof item === 'object')) : [];
  } catch {
    records = [];
  }
  const localRecord: LocalMarketDataGapEventRecord = {
    ...args.record,
    localRecordedAt: new Date().toISOString(),
    syncStatus: 'pending_supabase_sync',
    syncReason: args.reason,
  };
  const existingIndex = records.findIndex((item) => marketDataGapEventKey(item) === key);
  if (existingIndex >= 0) {
    records[existingIndex] = localRecord;
  } else {
    records.push(localRecord);
  }
  await fs.mkdir(path.dirname(ledgerPath), { recursive: true });
  await fs.writeFile(ledgerPath, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
  return { path: ledgerPath, key, records: records.length };
}

export async function syncLocalMarketDataGapEventsToSupabase(args: {
  marketConfig: MarketDataConfig;
  ledgerPath?: string;
  upsert?: typeof upsertMarketDataGapEvent;
}): Promise<{ path: string; attempted: number; synced: number; failed: number }> {
  const ledgerPath = args.ledgerPath || MARKET_DATA_GAP_FALLBACK_LEDGER;
  let records: LocalMarketDataGapEventRecord[] = [];
  try {
    const parsed = JSON.parse(await fs.readFile(ledgerPath, 'utf8')) as unknown;
    records = Array.isArray(parsed) ? parsed.filter((item): item is LocalMarketDataGapEventRecord => Boolean(item && typeof item === 'object')) : [];
  } catch {
    return { path: ledgerPath, attempted: 0, synced: 0, failed: 0 };
  }

  const upsert = args.upsert || upsertMarketDataGapEvent;
  let attempted = 0;
  let synced = 0;
  let failed = 0;
  const now = new Date().toISOString();
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (record.syncStatus === 'synced_to_supabase') continue;
    attempted += 1;
    try {
      const { localRecordedAt, syncStatus, syncReason, syncedAt, syncError, ...marketRecord } = record;
      void localRecordedAt;
      void syncStatus;
      void syncReason;
      void syncedAt;
      void syncError;
      await upsert({
        config: args.marketConfig,
        record: {
          ...marketRecord,
          user_id: args.marketConfig.userId,
        },
      });
      records[index] = {
        ...record,
        user_id: args.marketConfig.userId,
        syncStatus: 'synced_to_supabase',
        syncReason: 'Synced automatically by scanner after Supabase market_data_gap_events became available.',
        syncedAt: now,
        syncError: undefined,
      };
      synced += 1;
    } catch (error) {
      records[index] = {
        ...record,
        syncError: formatError(error),
      };
      failed += 1;
    }
  }

  if (attempted > 0) {
    await fs.writeFile(ledgerPath, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
  }
  return { path: ledgerPath, attempted, synced, failed };
}

async function persistMarketDataGapEventWithFallback(args: {
  marketConfig: MarketDataConfig | null;
  record: MarketDataGapEventRecord;
  logPrefix: string;
}): Promise<{ source: 'supabase' | 'local_fallback'; detail: string }> {
  if (args.marketConfig) {
    try {
      await upsertMarketDataGapEvent({
        config: args.marketConfig,
        record: args.record,
      });
      return { source: 'supabase', detail: 'market_data_gap_events upserted' };
    } catch (error) {
      const reason = `Supabase market_data_gap_events unavailable: ${formatError(error)}`;
      const local = await writeLocalMarketDataGapEvent({ record: args.record, reason });
      console.warn(`${args.logPrefix}: ${reason}; wrote local fallback ${local.path}.`);
      return { source: 'local_fallback', detail: local.path };
    }
  }

  const reason = 'Supabase market-data env unavailable; local fallback repair ledger used.';
  const local = await writeLocalMarketDataGapEvent({ record: args.record, reason });
  console.warn(`${args.logPrefix}: ${reason} ${local.path}.`);
  return { source: 'local_fallback', detail: local.path };
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

function ymdInEt(value: string): string {
  return String(value || '').slice(0, 10);
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
  if (timeframe === '120m') return 120;
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

export function buildSegmentedHistoryRepairWindows(from: string, to: string, chunkDays = 5): Array<{ from: string; to: string }> {
  const fromDate = new Date(`${ymdInEt(from)}T12:00:00Z`);
  const toDate = new Date(`${ymdInEt(to)}T12:00:00Z`);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || fromDate > toDate) {
    return [{ from, to }];
  }

  const windows: Array<{ from: string; to: string }> = [];
  const cursor = new Date(fromDate);
  while (cursor <= toDate) {
    const chunkStart = cursor.toISOString().slice(0, 10);
    const chunkEndDate = new Date(cursor);
    chunkEndDate.setUTCDate(chunkEndDate.getUTCDate() + Math.max(1, chunkDays) - 1);
    if (chunkEndDate > toDate) chunkEndDate.setTime(toDate.getTime());
    const chunkEnd = chunkEndDate.toISOString().slice(0, 10);
    windows.push({
      from: chunkStart === ymdInEt(from) ? from : etDateTime(chunkStart, '00:00'),
      to: chunkEnd === ymdInEt(to) ? to : etDateTime(chunkEnd, '23:59'),
    });
    cursor.setUTCDate(cursor.getUTCDate() + Math.max(1, chunkDays));
  }
  return windows;
}

function scannerHistoryPreloadTo(tradeDate: string, session: LiveSession, asOf?: string | Date | null): string {
  const sessionClose = etDateTime(tradeDate, session === 'morning' ? '12:00' : '16:00');
  if (!asOf) return sessionClose;

  const rawAsOf = asOf instanceof Date ? asOf.toISOString() : asOf;
  const normalized = normalizeCandleTimeEt(rawAsOf);
  const asOfDate = normalized.slice(0, 10);
  const asOfTime = normalized.slice(11, 16);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate) || !/^\d{2}:\d{2}$/.test(asOfTime)) return sessionClose;

  const cappedTo = etDateTime(asOfDate, asOfTime);
  const sessionCloseMs = barTimeMs(sessionClose);
  const cappedToMs = barTimeMs(cappedTo);
  if (sessionCloseMs === null || cappedToMs === null) return sessionClose;
  return cappedToMs < sessionCloseMs ? cappedTo : sessionClose;
}

export function buildScannerHistoryPreloadPlan(
  tradeDate: string,
  session: LiveSession,
  asOf?: string | Date | null,
): Record<MarketBarTimeframe, { from: string; to: string; requiredLookbackDays: number; limit: number }> {
  const fromDate = calendarDateBefore(tradeDate, SCANNER_REQUIRED_HISTORY_LOOKBACK_DAYS);
  const to = scannerHistoryPreloadTo(tradeDate, session, asOf);
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
  const parsed = new Date(normalizeCandleTimeEt(value)).getTime();
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
  const startCoverageToleranceMs = 24 * 60 * 60_000;
  return (
    sorted.length >= SCANNER_HISTORY_MIN_BARS[timeframe] &&
    first <= from + startCoverageToleranceMs &&
    loadedSpanDays >= requiredSpanDays &&
    last >= to - latestCompletedToleranceMs
  );
}

export function summarizeScannerHistoryCoverage(record: ScannerHistoryCoverageRecord): string {
  const status = record.sufficient ? 'sufficient' : 'insufficient';
  const healed = record.selfHealed ? ', self-healed from bridge' : '';
  const limitation = record.dataLimitation?.message ? `, data-limit=${record.dataLimitation.message}` : '';
  return `${record.timeframe}: ${status}, ${record.barsLoaded} bars, ${record.rangeStart || 'N/A'} to ${record.rangeEnd || 'N/A'}, source=${record.source}${healed}${limitation}`;
}

export function twoHourCoverageDiagnostic(
  coverage: ScannerHistoryCoverageRecord[] | undefined,
): ScannerTwoHourCoverageDiagnostic {
  const record = (coverage || []).find((item) => item.timeframe === '120m');
  return {
    timeframe: '120m',
    available: Boolean(record && record.barsLoaded > 0),
    sufficient: Boolean(record?.sufficient),
    barsLoaded: record?.barsLoaded || 0,
    source: record?.source || 'not_requested',
    rangeStart: record?.rangeStart || null,
    rangeEnd: record?.rangeEnd || null,
    warning: record?.warning || (record ? null : '120M / 2H scanner history was not requested or not reported.'),
    candidatePromotionBoundary: 'two_hour_context_required_for_full_confirmation',
  };
}

function twoHourCurrentRunWarning(coverage: ScannerHistoryCoverageRecord[] | undefined): string | null {
  const diagnostic = twoHourCoverageDiagnostic(coverage);
  if (diagnostic.sufficient) return null;
  const detail = diagnostic.available
    ? `loaded ${diagnostic.barsLoaded} bars from ${diagnostic.rangeStart || 'N/A'} to ${diagnostic.rangeEnd || 'N/A'}`
    : 'no 120M / 2H bars were loaded';
  return `Operational data-quality defect: 120M / 2H scanner context is not sufficient for full HTF confirmation (${detail}). Candidate promotion requiring full 2H confirmation must treat this as data-limited context, not structural proof.`;
}

export function htfHistoryCoverageReadiness(
  coverage: ScannerHistoryCoverageRecord[] | undefined,
): ScannerHtfHistoryCoverageReadiness {
  const required: ScannerHtfHistoryCoverageReadiness['requiredTimeframes'] = ['15m', '60m', '120m', '240m'];
  if (!coverage?.length) {
    return {
      status: 'not_evaluated',
      requiredTimeframes: required,
      insufficientTimeframes: required,
      summary: 'HTF history coverage was not evaluated for this cycle; HTF structure cannot be treated as confirmed.',
      candidatePromotionBoundary: 'htf_context_required_for_failed_plan_reversal',
    };
  }

  const insufficient = required.filter((timeframe) => !coverage.find((item) => item.timeframe === timeframe && item.sufficient));
  if (!insufficient.length) {
    return {
      status: 'sufficient',
      requiredTimeframes: required,
      insufficientTimeframes: [],
      summary: '15M, 1H, 2H, and 4H scanner history coverage is sufficient for HTF structural classification.',
      candidatePromotionBoundary: 'htf_context_required_for_failed_plan_reversal',
    };
  }

  return {
    status: 'data_limited',
    requiredTimeframes: required,
    insufficientTimeframes: insufficient,
    summary: `HTF history is data-limited for ${insufficient.join(', ')} after cache, bridge, and segmented bridge repair; failed-plan reversal and HTF promotion must treat this as context only, not structural confirmation. The scanner cannot invent missing NinjaTrader bars.`,
    candidatePromotionBoundary: 'htf_context_required_for_failed_plan_reversal',
  };
}

export function evaluatePreMarketDataReadinessBackfillGate(args: {
  coverage: ScannerHistoryCoverageRecord[] | undefined;
  completedFiveMinuteBarAssurance: ScannerCompletedFiveMinuteBarAssuranceStatus;
  preloadError?: string | null;
}): ScannerPreMarketDataReadinessBackfillGateReport {
  const coverage = args.coverage || [];
  const insufficientTimeframes = TIMEFRAMES.filter((timeframe) => {
    const record = coverage.find((item) => item.timeframe === timeframe);
    return !record?.sufficient;
  });
  const completedFiveMinuteReady = args.completedFiveMinuteBarAssurance.status === 'ready';
  const recoverySteps = [
    ...(args.completedFiveMinuteBarAssurance.recoverySteps || []),
    'Keep NinjaTrader connected to the data provider with the active contract loaded.',
    'Run the candle recorder/backfill so Supabase market_bars has current 5M/15M/1H/2H/4H OHLC.',
    'If coverage is still incomplete, refresh the NinjaTrader chart/history request and restart the scanner after bars load.',
  ];
  const preloadError = args.preloadError ? ` Preload error: ${args.preloadError}.` : '';
  const coverageSummary = coverage.length
    ? coverage.map(summarizeScannerHistoryCoverage).join(' | ')
    : 'history coverage was not evaluated';
  const ready = completedFiveMinuteReady && insufficientTimeframes.length === 0 && !args.preloadError;
  const sourceSummary = [
    args.completedFiveMinuteBarAssurance.sourceSummary || args.completedFiveMinuteBarAssurance.message,
    coverageSummary,
  ].filter(Boolean).join(' | ');

  return {
    status: ready ? 'ready' : 'data_not_ready',
    requiredTimeframes: [...TIMEFRAMES],
    insufficientTimeframes,
    completedFiveMinuteReady,
    completedFiveMinuteMessage: args.completedFiveMinuteBarAssurance.message,
    sourceSummary: `${sourceSummary}${preloadError}`,
    recoverySteps: ready ? [] : [...new Set(recoverySteps)],
    canEnterTradePlanningMode: ready,
    boundary: 'data_readiness_only_not_trade_approval',
  };
}

function summarizePreMarketDataReadinessBackfillGate(report: ScannerPreMarketDataReadinessBackfillGateReport): string {
  if (report.status === 'ready') {
    return `Pre-Market Data Readiness + Backfill Gate ready: completed 5M is current and 30-day 5M/15M/1H/2H/4H context is sufficient. Boundary=${report.boundary}.`;
  }
  const missing = report.insufficientTimeframes.length ? report.insufficientTimeframes.join(', ') : 'none';
  return `Pre-Market Data Readiness + Backfill Gate DATA_NOT_READY: completed5m=${report.completedFiveMinuteReady ? 'ready' : 'blocked'}, insufficient=${missing}. Real cache/bridge backfill was attempted where available; trade-planning mode is blocked until real OHLC is ready. Boundary=${report.boundary}.`;
}

function shouldRunPreMarketDataReadinessGate(config: ScannerConfig, window: ReturnType<typeof resolveScannerWindow>): boolean {
  if (!config.preMarketDataGate || !config.scanWindows) return false;
  return window.allowsDeskPlan || window.session === 'premarket';
}

async function runPreMarketDataReadinessBackfillGate(args: {
  config: ScannerConfig;
  tradeDate: string;
  window: ReturnType<typeof resolveScannerWindow>;
  completedFiveMinuteBarAssurance: ScannerCompletedFiveMinuteBarAssuranceStatus;
  completed5m?: NinjaBridgeBar | null;
}): Promise<{
  report: ScannerPreMarketDataReadinessBackfillGateReport;
  lookLeft: Awaited<ReturnType<typeof fetchLookLeftContext>> | null;
}> {
  let lookLeft: Awaited<ReturnType<typeof fetchLookLeftContext>> | null = null;
  let preloadError: string | null = null;
  try {
    lookLeft = await fetchLookLeftContext(args.config, args.tradeDate, mappingSessionForWindow(args.window), args.completed5m?.time || null);
  } catch (error) {
    preloadError = formatError(error);
    console.warn(`[scanner-data] Pre-Market Data Readiness + Backfill Gate preload failed: ${preloadError}`);
  }
  const report = evaluatePreMarketDataReadinessBackfillGate({
    coverage: lookLeft?.coverage || [],
    completedFiveMinuteBarAssurance: args.completedFiveMinuteBarAssurance,
    preloadError,
  });
  const line = summarizePreMarketDataReadinessBackfillGate(report);
  if (report.status === 'ready') {
    console.log(`[scanner-data] ${line}`);
  } else {
    console.warn(`[scanner-data] ${line}`);
    console.warn(`[scanner-data] source: ${report.sourceSummary}`);
    if (report.recoverySteps.length) {
      console.warn(`[scanner-data] recovery: ${report.recoverySteps.join(' | ')}`);
    }
  }
  return { report, lookLeft };
}

function attachScannerHistoryCoverage(
  chartContext: Partial<ChartContext> | undefined,
  coverage: ScannerHistoryCoverageRecord[],
): Partial<ChartContext> | undefined {
  if (!chartContext || !coverage.length) return chartContext;
  return {
    ...chartContext,
    scannerHistoryCoverage: coverage.map((record) => ({
      timeframe: record.timeframe,
      requiredLookbackDays: record.requiredLookbackDays,
      requestedFrom: record.requestedFrom,
      requestedTo: record.requestedTo,
      barsLoaded: record.barsLoaded,
      rangeStart: record.rangeStart,
      rangeEnd: record.rangeEnd,
      source: record.source,
      sufficient: record.sufficient,
      warning: record.warning,
      dataLimitation: record.dataLimitation,
    })),
  };
}

async function verifyScannerAuditWrite(args: {
  file: string;
  expectedSource: string;
  expectedPlanVersionId?: string;
  expectedReportType?: string;
}): Promise<void> {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(await fs.readFile(args.file, 'utf8')) as Record<string, unknown>;
  } catch (error) {
    throw new Error(`Scanner audit write verification failed for ${args.file}: ${formatError(error)}`);
  }
  if (parsed.source !== args.expectedSource && parsed.reportType !== args.expectedReportType) {
    throw new Error(`Scanner audit write verification failed for ${args.file}: expected ${args.expectedSource}, found ${String(parsed.source || parsed.reportType || 'unknown')}.`);
  }
  if (args.expectedPlanVersionId && parsed.planVersionId !== args.expectedPlanVersionId) {
    throw new Error(`Scanner audit write verification failed for ${args.file}: expected plan ${args.expectedPlanVersionId}, found ${String(parsed.planVersionId || 'missing')}.`);
  }
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
  visibilityMetadata?: ScannerVisibilityMetadata;
  candidateLifecycleTrace?: ScannerCandidateLifecycleTrace;
  deskState?: DeskState;
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
  const visibilityMetadata = args.visibilityMetadata || classifyScannerVisibility({
    state: args.state,
    candidate: args.candidate,
    alertDecision: { shouldSend: true, reason: args.alertReason },
    canExecute: Boolean(args.normalized.canExecute),
    staleReason: args.staleReason,
  });
  const candidateLifecycleTrace = args.candidateLifecycleTrace || buildCandidateLifecycleTrace({
    candidates: args.normalized.setupCandidates || [],
    selectedCandidate: args.candidate,
    state: args.state,
    alertDecision: { shouldSend: true, reason: args.alertReason },
    canExecute: Boolean(args.normalized.canExecute),
    staleReason: args.staleReason,
  });
  const deskState = args.deskState || buildDeskState({
    state: args.state,
    candidate: args.candidate,
    visibilityMetadata,
    candidateLifecycleTrace,
    targetCascade: args.targetCascade,
    canExecute: Boolean(args.normalized.canExecute),
  });
  const auditPayload = repairDuplicateAuditTargets({
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
    visibility: visibilityMetadata,
    candidateLifecycleTrace,
    deskState,
    historyCoverage: args.historyCoverage || [],
    historyCoverageSummary: (args.historyCoverage || []).map(summarizeScannerHistoryCoverage),
    twoHourCoverage: twoHourCoverageDiagnostic(args.historyCoverage),
    htfHistoryCoverage: htfHistoryCoverageReadiness(args.historyCoverage),
    targetCascade: args.targetCascade,
    alertReason: args.alertReason,
    attachments: {
      chartMarkup: args.chartMarkup,
      priceLevelMap: args.levelMap,
      ...(args.chartMarkup && args.levelMap ? buildDiscordTradePlanVisualProvenance(args.planVersionId) : {}),
    },
  }).value;
  await fs.writeFile(file, JSON.stringify(auditPayload, null, 2));
  await verifyScannerAuditWrite({
    file,
    expectedSource: 'live-scanner',
    expectedPlanVersionId: args.planVersionId,
  });
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
  await verifyScannerAuditWrite({
    file,
    expectedSource: 'live-scanner-watchlist',
  });
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
  return repairDuplicateAuditTargets({
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
          candidateState: candidate.candidateState || null,
          failedPlanReversal: candidate.failedPlanReversal || null,
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
      candidateState: item.candidateState || null,
      failedPlanReversal: item.failedPlanReversal || null,
    })),
  }).value;
}

function summarizeFailedPlanReversalForTape(chartContext: unknown, candidate: SetupCandidate | null) {
  const context = candidate?.failedPlanReversal || asRecord(chartContext)?.failedPlanReversal || null;
  if (!context) {
    return {
      present: false,
      state: null,
      status: 'not_present',
      createsCandidate: false,
      approvesExecution: false,
    };
  }
  const record = asRecord(context);
  const timeframeConfirmations = asArray(record?.timeframeConfirmations)
    .map((item) => {
      const value = asRecord(item);
      return {
        timeframe: stringField(value, ['timeframe']) || null,
        direction: stringField(value, ['direction']) || null,
        status: stringField(value, ['status']) || null,
        evidence: asArray(value?.evidence).filter((entry): entry is string => typeof entry === 'string'),
      };
    })
    .filter((item) => item.timeframe || item.direction || item.status || item.evidence.length);
  return {
    present: true,
    state: stringField(record, ['decisionState']) || candidate?.candidateState || null,
    originalPlanDirection: stringField(record, ['originalPlanDirection']) || null,
    oppositeDirection: stringField(record, ['oppositeDirection']) || candidate?.direction || null,
    failedDecisionLevel: record?.failedDecisionLevel ?? null,
    htfStackStatus: stringField(record, ['htfStackStatus']) || null,
    timeframeConfirmations,
    fiveMinuteTriggerStatus: stringField(record, ['fiveMinuteTriggerStatus']) || null,
    staleOrNoFreshEntry: Boolean(record?.staleOrNoFreshEntry),
    blockers: asArray(record?.blockers),
    createsCandidate: Boolean(record?.createsCandidate),
    approvesExecution: false,
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
  visibilityMetadata?: ScannerVisibilityMetadata;
  candidateLifecycleTrace?: ScannerCandidateLifecycleTrace;
  targetCascade?: TargetCascadeResult | null;
  deskState?: DeskState;
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
  const visibilityMetadata = args.visibilityMetadata || classifyScannerVisibility({
    state: args.state,
    candidate: args.candidate,
    alertDecision: args.alertDecision,
    canExecute: Boolean(args.normalized.canExecute),
    staleReason: args.staleReason,
  });
  const candidateLifecycleTrace = args.candidateLifecycleTrace || buildCandidateLifecycleTrace({
    candidates: args.normalized.setupCandidates || [],
    selectedCandidate: args.candidate,
    state: args.state,
    alertDecision: args.alertDecision,
    canExecute: Boolean(args.normalized.canExecute),
    staleReason: args.staleReason,
  });
  const deskState = args.deskState || buildDeskState({
    state: args.state,
    candidate: args.candidate,
    visibilityMetadata,
    candidateLifecycleTrace,
    targetCascade: args.targetCascade,
    htfLiquidityDrawState: (asRecord(args.chartContext)?.htfLiquidityDrawState || null) as SetupCandidate['htfLiquidityDrawState'] | null,
    canExecute: Boolean(args.normalized.canExecute),
  });
  const event = {
    recordedAt: new Date().toISOString(),
    mode: args.dryRun ? 'dry_run' : 'live',
    time: args.completed5m?.time || null,
    completed5m: args.completed5m,
    currentPrice: args.currentPrice,
    facts: summarizeScannerEventTapeFacts(args.chartContext, args.completed5m),
    failedPlanReversal: summarizeFailedPlanReversalForTape(args.chartContext, args.candidate),
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
    visibility: visibilityMetadata,
    candidateLifecycleTrace,
    deskState,
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
    twoHourCoverage: twoHourCoverageDiagnostic(args.historyCoverage),
    htfHistoryCoverage: htfHistoryCoverageReadiness(args.historyCoverage),
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
  const tapePayload = repairDuplicateAuditTargets({
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
  }).value;
  await fs.writeFile(file, JSON.stringify(tapePayload, null, 2));
  await verifyScannerAuditWrite({
    file,
    expectedSource: 'scanner_decision_event_tape',
    expectedReportType: 'scanner_decision_event_tape',
  });
  return file;
}

function mappingSessionForWindow(window: ReturnType<typeof resolveScannerWindow>): LiveSession {
  if (window.session === 'lunch') return 'lunch';
  if (window.session === 'afternoon') return 'lunch';
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

export async function fetchSegmentedBridgeHistoryRepair(args: {
  config: ScannerConfig;
  timeframe: MarketBarTimeframe;
  from: string;
  to: string;
  limit: number;
  chunkDays?: number;
}): Promise<NinjaBridgeBar[]> {
  const windows = buildSegmentedHistoryRepairWindows(args.from, args.to, args.chunkDays ?? 5);
  const bars: NinjaBridgeBar[] = [];
  for (const window of windows) {
    try {
      const historical = await getNinjaHistoricalBars({
        instrument: args.config.bridgeInstrument,
        timeframe: args.timeframe,
        from: window.from,
        to: window.to,
        limit: args.limit,
        baseUrl: args.config.bridgeUrl,
      });
      if (historical.ok && historical.bars?.length) {
        bars.push(...historical.bars);
      } else {
        console.warn(`[scanner-history] ${args.timeframe}: segmented bridge repair returned no bars for ${window.from} to ${window.to}: ${historical.error || 'unknown error'}`);
      }
    } catch (error) {
      console.warn(`[scanner-history] ${args.timeframe}: segmented bridge repair failed for ${window.from} to ${window.to}: ${formatError(error)}`);
    }
  }
  return mergeBars([], bars);
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

  let bars = mergeBars(repaired, cached);
  if (!barsCoverRequestedLookback(bars, args.from, args.to, args.timeframe)) {
    const segmented = await fetchSegmentedBridgeHistoryRepair({
      config: args.config,
      timeframe: args.timeframe,
      from: args.from,
      to: args.to,
      limit: args.limit,
    });
    if (segmented.length) {
      repaired = mergeBars(segmented, repaired);
      bars = mergeBars(repaired, cached);
      if (marketConfig) {
        try {
          await upsertMarketBars({
            bars: segmented,
            instrument: args.config.instrument,
            bridgeInstrument: args.config.bridgeInstrument,
            timeframe: args.timeframe,
            config: marketConfig,
          });
        } catch (error) {
          console.warn(`[scanner-history] ${args.timeframe}: segmented self-healed bars loaded but cache upsert failed: ${formatError(error)}`);
        }
      }
    }
  }
  const sorted = mergeBars([], bars);
  const verification = verifyMarketDataWindow({
    bars: sorted,
    timeframe: args.timeframe,
    requestedFrom: args.from,
    requestedTo: args.to,
    requiredLookbackDays: SCANNER_REQUIRED_HISTORY_LOOKBACK_DAYS,
    minimumBars: SCANNER_HISTORY_MIN_BARS[args.timeframe],
    source: marketDataSourceFromCounts(cached.length, repaired.length),
    cacheBars: cached.length,
    bridgeRepairBars: repaired.length,
    bridgeInstrument: args.config.bridgeInstrument,
  });
  const coverage: ScannerHistoryCoverageRecord = {
    ...verification,
    requiredLookbackDays: SCANNER_REQUIRED_HISTORY_LOOKBACK_DAYS,
  };
  if (!coverage.sufficient) {
    await persistMarketDataGapEventWithFallback({
      marketConfig,
      logPrefix: `[scanner-history] ${args.timeframe}`,
      record: toMarketDataGapEventRecord({
        userId: marketConfig?.userId || '00000000-0000-0000-0000-000000000000',
        instrument: args.config.instrument,
        bridgeInstrument: args.config.bridgeInstrument,
        timeframe: args.timeframe,
        requestedFrom: args.from,
        requestedTo: args.to,
        rangeStart: coverage.rangeStart,
        rangeEnd: coverage.rangeEnd,
        barsLoaded: coverage.barsLoaded,
        cacheBars: coverage.cacheBars,
        bridgeRepairBars: coverage.bridgeRepairBars,
        source: coverage.source,
        dataLimitationMessage: coverage.dataLimitation?.message || coverage.warning,
        operatorAction: coverage.dataLimitation?.operatorAction || null,
        metadata: {
          source: 'nt_scanner_market_data_ingestion',
          canInventMissingBars: false,
          htfPromotionAllowed: false,
          invalidBars: coverage.invalidBars || 0,
          duplicateTimestamps: coverage.duplicateTimestamps || 0,
        },
      }),
    });
  }
  return { bars: sorted, coverage };
}

export async function fetchLookLeftBars(config: ScannerConfig, tradeDate: string, session: LiveSession): Promise<Record<MarketBarTimeframe, NinjaBridgeBar[]>> {
  const result = await fetchLookLeftContext(config, tradeDate, session);
  return result.bars;
}

async function fetchLookLeftContext(config: ScannerConfig, tradeDate: string, session: LiveSession, asOf?: string | Date | null): Promise<{
  bars: Record<MarketBarTimeframe, NinjaBridgeBar[]>;
  coverage: ScannerHistoryCoverageRecord[];
}> {
  const marketConfig = loadMarketDataConfig();
  const plan = buildScannerHistoryPreloadPlan(tradeDate, session, asOf);
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
  return mergeMarketDataBars(primary, fallback);
}

function scannerStateMatchesSession(record: ScannerAlertDeliveryRecord, args: {
  tradeDate: string;
  session: LiveSession;
  instrument: Instrument;
}): boolean {
  return record.tradeDate === args.tradeDate &&
    record.session === args.session &&
    record.instrument === args.instrument;
}

function appOwnedFailedDecisionEventFromDelivery(
  record: ScannerAlertDeliveryRecord,
  completed5m: NinjaBridgeBar,
): FailedBreakEventFact | null {
  const originalDirection = record.candidate.direction === 'LONG' || record.candidate.direction === 'SHORT'
    ? record.candidate.direction
    : null;
  const decisionLevel = record.candidate.entry;
  if (!originalDirection || typeof decisionLevel !== 'number' || !Number.isFinite(decisionLevel)) return null;
  const failedLong = originalDirection === 'LONG' && completed5m.close < decisionLevel;
  const failedShort = originalDirection === 'SHORT' && completed5m.close > decisionLevel;
  if (!failedLong && !failedShort) return null;
  const oppositeDirection = originalDirection === 'LONG' ? 'SHORT' : 'LONG';
  const crossedText = originalDirection === 'LONG' ? 'below' : 'above';
  return {
    direction: oppositeDirection,
    failedLevel: decisionLevel,
    levelLabel: `app-owned failed plan decision/reclaim level (${record.planVersionId})`,
    sweptExtreme: oppositeDirection === 'SHORT' ? completed5m.low : completed5m.high,
    timestamp: completed5m.time,
    candleIndex: null,
    confidence: 'High',
    evidence: [
      `App-owned ${originalDirection} plan ${record.planVersionId} failed its decision/reclaim level.`,
      `Completed 5M close ${completed5m.close} crossed ${crossedText} ${decisionLevel}.`,
      'Failed-plan reversal review only; generic failed-break events remain ignored unless app-owned provenance is present.',
    ].join(' '),
  };
}

export function appOwnedFailedDecisionEventFromCandidate(
  candidate: SetupCandidate | null | undefined,
  completed5m: NinjaBridgeBar,
): FailedBreakEventFact | null {
  if (!candidate || candidate.pathway === 'failed_plan_reversal') return null;
  if (candidate.executionStatus !== 'Executable') return null;
  const originalDirection = candidate.direction === 'LONG' || candidate.direction === 'SHORT'
    ? candidate.direction
    : null;
  const decisionLevel = candidate.entry;
  if (!originalDirection || typeof decisionLevel !== 'number' || !Number.isFinite(decisionLevel)) return null;
  const failedLong = originalDirection === 'LONG' && completed5m.close < decisionLevel;
  const failedShort = originalDirection === 'SHORT' && completed5m.close > decisionLevel;
  if (!failedLong && !failedShort) return null;
  const oppositeDirection = originalDirection === 'LONG' ? 'SHORT' : 'LONG';
  const crossedText = originalDirection === 'LONG' ? 'below' : 'above';
  return {
    direction: oppositeDirection,
    failedLevel: decisionLevel,
    levelLabel: `app-owned failed plan decision/reclaim level (current scanner cycle)`,
    sweptExtreme: oppositeDirection === 'SHORT' ? completed5m.low : completed5m.high,
    timestamp: completed5m.time,
    candleIndex: null,
    confidence: 'High',
    evidence: [
      `Current app-owned ${originalDirection} ${candidate.setupType} plan failed its decision/reclaim level before alert selection completed.`,
      `Completed 5M close ${completed5m.close} crossed ${crossedText} ${decisionLevel}.`,
      'Same-cycle failed-plan reversal review only; this does not approve execution.',
    ].join(' '),
  };
}

export function appOwnedFailedPlanEventsFromScannerState(args: {
  state: ScannerStateFile;
  tradeDate: string;
  session: LiveSession;
  instrument: Instrument;
  completed5m: NinjaBridgeBar;
}): FailedBreakEventFact[] {
  return Object.values(args.state.alertDeliveries || {})
    .filter((record) => scannerStateMatchesSession(record, args))
    .filter((record) => record.state === 'Approved' || record.state === 'Executable')
    .map((record) => appOwnedFailedDecisionEventFromDelivery(record, args.completed5m))
    .filter((event): event is FailedBreakEventFact => Boolean(event));
}

export async function appOwnedFailedPlanEventsFromScannerAudits(args: {
  auditDir?: string;
  tradeDate: string;
  session: LiveSession;
  instrument: Instrument;
  completed5m: NinjaBridgeBar;
}): Promise<FailedBreakEventFact[]> {
  const auditDir = args.auditDir || DISCORD_AUDIT_DIR;
  let entries: string[] = [];
  try {
    entries = await fs.readdir(auditDir);
  } catch {
    return [];
  }

  const events: FailedBreakEventFact[] = [];
  for (const name of entries) {
    if (!name.endsWith('.json') || !name.startsWith(`scanner-${args.session}-${args.tradeDate}-${args.instrument}-`)) continue;
    let audit: any;
    try {
      audit = JSON.parse(await fs.readFile(path.join(auditDir, name), 'utf8'));
    } catch {
      continue;
    }
    if (audit?.source !== 'live-scanner') continue;
    if (audit.tradeDate !== args.tradeDate || audit.session !== args.session || audit.instrument !== args.instrument) continue;
    if (audit.state !== 'Approved' && audit.state !== 'Executable') continue;
    const candidate = candidateFromAudit(audit);
    if (!candidate) continue;
    const record: ScannerAlertDeliveryRecord = {
      alertKey: scannerAlertKey({
        tradeDate: audit.tradeDate,
        instrument: audit.instrument,
        session: audit.session,
        candidate,
        state: audit.state,
      }),
      planVersionId: typeof audit.planVersionId === 'string' ? audit.planVersionId : path.basename(name, '.json'),
      instrument: args.instrument,
      tradeDate: args.tradeDate,
      session: args.session,
      state: audit.state,
      confidence: typeof audit.confidence?.score === 'number' ? audit.confidence.score : 0,
      candidate: candidateDeliverySnapshot(candidate),
      deliveryStatus: 'sent',
      webhookSource: null,
      httpStatus: null,
      discordMessageId: null,
      error: null,
      attemptedAt: typeof audit.createdAt === 'string' ? audit.createdAt : new Date(0).toISOString(),
      sentAt: typeof audit.createdAt === 'string' ? audit.createdAt : null,
      auditLogPath: path.join(auditDir, name),
      stale: false,
      retryEligible: false,
    };
    const event = appOwnedFailedDecisionEventFromDelivery(record, args.completed5m);
    if (event) events.push({
      ...event,
      evidence: `${event.evidence} Source recovered from durable live scanner audit ${name}.`,
    });
  }
  return events;
}

function dedupeFailedPlanEvents(events: FailedBreakEventFact[]): FailedBreakEventFact[] {
  const byKey = new Map<string, FailedBreakEventFact>();
  for (const event of events) {
    byKey.set(`${event.direction}:${event.failedLevel ?? 'unknown'}:${event.levelLabel || ''}`, event);
  }
  return [...byKey.values()];
}

export function attachFailedPlanReversalContextFromScannerState(args: {
  chartContext: Partial<ChartContext> | null | undefined;
  failedPlanEvents: FailedBreakEventFact[];
}): {
  chartContext: Partial<ChartContext> | null | undefined;
  eventCount: number;
  failedPlanReversal: FailedPlanReversalContext | null;
} {
  if (!args.chartContext || !args.failedPlanEvents.length) {
    return {
      chartContext: args.chartContext,
      eventCount: 0,
      failedPlanReversal: args.chartContext?.failedPlanReversal || null,
    };
  }

  const notes = [
    ...(args.chartContext.setupReadyFacts?.notes || []),
    `Scanner added ${args.failedPlanEvents.length} app-owned failed decision/reclaim level event(s) from prior alert delivery state.`,
  ];
  const chartContext: Partial<ChartContext> = {
    ...args.chartContext,
    failedBreakEvents: [
      ...(args.chartContext.failedBreakEvents || []),
      ...args.failedPlanEvents,
    ],
    setupReadyFacts: {
      ...(args.chartContext.setupReadyFacts || {}),
      notes,
    },
  };
  const failedPlanReversal =
    chartContext.failedPlanReversal ||
    buildFailedPlanReversalContextFromChartContext(chartContext as ChartContext);

  return {
    chartContext: failedPlanReversal ? { ...chartContext, failedPlanReversal } : chartContext,
    eventCount: args.failedPlanEvents.length,
    failedPlanReversal,
  };
}

async function analysisFromBars(args: {
  config: ScannerConfig;
  session: LiveSession;
  tradeDate: string;
  bars: Record<MarketBarTimeframe, NinjaBridgeBar[]>;
  htfBars5m?: NinjaBridgeBar[];
  asOf?: Date;
}): Promise<AnalysisResult> {
  const baseChartContext = buildNinjaChartContext({
    bars5m: args.bars['5m'],
    htfBars5m: args.htfBars5m,
    bars15m: args.bars['15m'],
    bars60m: args.bars['60m'],
    bars120m: args.bars['120m'],
    bars240m: args.bars['240m'],
    sessionType: args.session,
    instrument: args.config.instrument,
    tradeDate: args.tradeDate,
    barTimestampMode: args.config.barTimestampMode,
    barTimeZone: args.config.barTimeZone,
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
    const completed5m = latestCompletedBar(args.liveBars['5m'] || [], 5, new Date(), args.config.barTimestampMode, args.config.barTimeZone);
    const lookLeft = await fetchLookLeftContext(args.config, args.tradeDate, session, completed5m?.time || null);
    const bars = {
      '5m': mergeBars(args.liveBars['5m'], lookLeft.bars['5m']),
      '15m': mergeBars(args.liveBars['15m'], lookLeft.bars['15m']),
      '60m': mergeBars(args.liveBars['60m'], lookLeft.bars['60m']),
      '120m': mergeBars(args.liveBars['120m'], lookLeft.bars['120m']),
      '240m': mergeBars(args.liveBars['240m'], lookLeft.bars['240m']),
    };
    const analysis = await analysisFromBars({ config: args.config, session, tradeDate: args.tradeDate, bars });
    const objectives = analysis.structuredChartContext?.targetObjectives?.length || 0;
    const htfCoverage = htfHistoryCoverageReadiness(lookLeft.coverage);
    args.state.lastMarketMapRefreshBySession[key] = new Date().toISOString();
    return `market map refreshed (${session}; ${MARKET_MAPPING_COVERAGE.join(', ')}; ${objectives} target objectives; HTF coverage ${htfCoverage.status}; ${htfCoverage.summary}; history ${lookLeft.coverage.map(summarizeScannerHistoryCoverage).join(' | ')}).`;
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
  currentPrice?: number | null;
  windowLabel: string;
  planVersionId: string;
  attachments: CompactDiscordAttachmentState;
  deskState?: DeskState | null;
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
    currentPrice: args.currentPrice,
    deskState: args.deskState,
    components: args.deskState?.discordAction === 'post_watch'
      ? undefined
      : buildOutcomeComponents({
          planVersionId: args.planVersionId,
          sessionType: args.session,
          tradeDate: args.tradeDate,
          instrument: args.config.instrument,
          direction: args.candidate?.direction,
        }),
  });
}

export function shouldPersistScannerAlertToRag(deskState: Pick<DeskState, 'discordAction'> | null | undefined): boolean {
  return deskState?.discordAction !== 'post_watch';
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

function isFiniteTradePrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function deskPlayPlanningCandidate(args: {
  deskState: DeskState;
  normalized?: ReturnType<typeof buildAppTradePlan> | null;
}): SetupCandidate | null {
  const direction = args.deskState.primaryDeskPlay.direction;
  if (direction !== 'LONG' && direction !== 'SHORT') return null;
  const candidates = args.normalized?.setupCandidates || [];
  const selected = candidates.find((candidate) =>
    candidate.direction === direction &&
    isFiniteTradePrice(candidate.entry) &&
    isFiniteTradePrice(candidate.stop),
  );
  return selected || null;
}

function deskPlayPlanningLevels(args: {
  deskState: DeskState;
  normalized?: ReturnType<typeof buildAppTradePlan> | null;
}): Pick<SetupCandidate, 'entry' | 'stop' | 'target1' | 'target2' | 'riskPoints'> {
  const direction = args.deskState.primaryDeskPlay.direction;
  if (direction !== 'LONG' && direction !== 'SHORT') {
    return { entry: null, stop: null, target1: null, target2: null, riskPoints: null };
  }
  const candidate = deskPlayPlanningCandidate(args);
  const entry = isFiniteTradePrice(args.normalized?.entry)
    ? args.normalized.entry
    : candidate?.entry ?? null;
  const stop = isFiniteTradePrice(args.normalized?.stop)
    ? args.normalized.stop
    : candidate?.stop ?? null;
  const computed = targetsFromEntryStop(direction, entry, stop);
  if (
    !isFiniteTradePrice(entry) ||
    !isFiniteTradePrice(stop) ||
    !isFiniteTradePrice(computed.target1) ||
    !isFiniteTradePrice(computed.target2)
  ) {
    return { entry: null, stop: null, target1: null, target2: null, riskPoints: null };
  }
  return {
    entry,
    stop,
    target1: computed.target1,
    target2: computed.target2,
    riskPoints: computed.riskPoints,
  };
}

function deskPlayBiasQualityScore(bias: DeskPlayDirectionalBias): number | null {
  const raw = typeof bias.lineConfidence?.score === 'number' && Number.isFinite(bias.lineConfidence.score)
    ? bias.lineConfidence.score
    : typeof bias.decisionQualityScore === 'number' && Number.isFinite(bias.decisionQualityScore)
    ? bias.decisionQualityScore
    : typeof bias.modelConfidenceScore === 'number' && Number.isFinite(bias.modelConfidenceScore)
    ? bias.modelConfidenceScore
    : typeof bias.rankScore === 'number' && Number.isFinite(bias.rankScore)
    ? bias.rankScore
    : null;
  return raw === null ? null : Math.max(0, Math.min(100, Math.round(raw)));
}

function deskPlayBiasQualityLabel(bias: DeskPlayDirectionalBias, score: number | null): 'high' | 'medium' | 'low' | 'unavailable' {
  if (bias.lineConfidence?.label) return bias.lineConfidence.label;
  if (score === null) return 'unavailable';
  if (score >= 75) return 'high';
  if (score >= 55) return 'medium';
  return 'low';
}

function deskPlaySideQualityScorecard(
  longBias: DeskPlayDirectionalBias,
  shortBias: DeskPlayDirectionalBias,
): DecisionQualityScoreItem[] {
  return [longBias, shortBias].map((bias) => {
    const score = deskPlayBiasQualityScore(bias);
    const label = deskPlayBiasQualityLabel(bias, score);
    const safeScore = score ?? 0;
    return {
      label: `${bias.direction} Quality`,
      score: safeScore,
      max: 100,
      status: label === 'high' ? 'strong' : label === 'medium' ? 'partial' : label === 'low' ? 'weak' : 'blocked',
      note: `${label}. ${bias.lineConfidence?.reason || bias.reason || 'Scanner-owned Desk Play side confidence.'}`,
    };
  });
}

export function candidateForDeskPlayContextChart(
  deskState: DeskState,
  normalized?: ReturnType<typeof buildAppTradePlan> | null,
): SetupCandidate | null {
  const play = deskState.primaryDeskPlay;
  if (!play.discordEligible || (play.direction !== 'LONG' && play.direction !== 'SHORT')) return null;
  const primaryBias = play.direction === 'LONG' ? play.longBias : play.shortBias;
  const planningLevels = deskPlayPlanningLevels({ deskState, normalized });
  const hasPlanningLevels = isFiniteTradePrice(planningLevels.entry) &&
    isFiniteTradePrice(planningLevels.stop) &&
    isFiniteTradePrice(planningLevels.target1) &&
    isFiniteTradePrice(planningLevels.target2);
  const blockers = Array.from(new Set([
    ...primaryBias.blockers,
    'canExecute=false',
    hasPlanningLevels
      ? 'Desk Play chart shows review-only app-owned planning levels.'
      : 'Protected 5M structure stop not confirmed; planning levels unavailable.',
    'No execution approval is attached to this image.',
  ]));
  return {
    setupType: primaryBias.setupType || SetupType.NoSetup,
    scenarioLabel: hasPlanningLevels
      ? `${play.direction} Desk Play - Review Planning Levels`
      : `${play.direction} Desk Play Context - Watch Only`,
    direction: play.direction,
    detectedStatus: SetupCandidateStatus.Conditional,
    confidence: 'Low',
    priority: 0,
    entry: planningLevels.entry,
    stop: planningLevels.stop,
    target1: planningLevels.target1,
    target2: planningLevels.target2,
    riskPoints: planningLevels.riskPoints,
    invalidation: play.invalidation || deskState.invalidation || null,
    decisionQualityScore: primaryBias.decisionQualityScore ?? primaryBias.rankScore ?? null,
    decisionQualityScorecard: deskPlaySideQualityScorecard(play.longBias, play.shortBias),
    decisionQualityRecommendation: hasPlanningLevels
      ? 'Review planning levels only: targets are app-computed from entry to protected structure stop; canExecute remains false.'
      : 'Desk Play context only: wait for completed 5M proof and protected structure stop.',
    rankScore: primaryBias.rankScore ?? null,
    evidence: [
      play.summary,
      primaryBias.reason,
      play.countertrendWarning,
      ...play.notes,
    ].filter((value): value is string => Boolean(value)),
    missingEvidence: blockers,
    missingLevels: [],
    executionStatus: ExecutionStatus.Conditional,
    blockReason: NoTradeReason.EntryTriggerPending,
    requiredTrigger: play.nextTrigger || deskState.nextTrigger || primaryBias.nextTrigger || null,
    nextAction: play.noChase || 'No chase. Wait for completed 5M proof and app-owned gates.',
    reducedRiskPlan: null,
    activeRuleset: {
      htfLineInSand: {
        applied: true,
        status: 'not_applicable',
        required: 'completed_5m_or_15m_close_beyond_htf_line',
        appliesToAllModels: true,
        affectsExecution: false,
        direction: play.direction,
        lineInSand: play.lineInSand,
        lineReason: 'Desk Play line in the sand',
        requiredClose: play.nextTrigger || primaryBias.nextTrigger || null,
        obstacleType: null,
        obstacleSource: null,
        evidence: [
          `Line in the sand: ${typeof play.lineInSand === 'number' ? play.lineInSand.toFixed(2) : 'N/A'}`,
          play.summary,
        ].filter((value): value is string => Boolean(value)),
        blockers,
      },
    },
  };
}

export async function upsertScannerDiscordAlertRagRecord(args: {
  planVersionId: string;
  session: LiveSession;
  tradeDate: string;
  instrument: Instrument;
  analysis: AnalysisResult;
  normalized: ReturnType<typeof buildAppTradePlan>;
  candidate: SetupCandidate | null;
  visibilityMetadata?: ScannerVisibilityMetadata | null;
  candidateLifecycleTrace?: ScannerCandidateLifecycleTrace | null;
  deskState?: DeskState | null;
  confidence: number;
}): Promise<void> {
  const { config, missing } = resolveDiscordRagPersistenceConfig();
  if (!config) {
    console.warn(`Scanner Discord alert RAG pending save skipped. Set ${missing.join(', ')} to let Discord buttons update RAG and lock the card after save.`);
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
    session_type: args.session,
    trade_date: args.tradeDate,
    day_of_week: getDayOfWeek(args.tradeDate),
    instrument: args.instrument,
    trade_result: 'pending',
    outcome: null,
    source: 'discord_alert',
    analysis_mode: 'live',
    setup_quality_score: 0.5,
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
      visibility: args.visibilityMetadata || null,
      candidateLifecycleTrace: args.candidateLifecycleTrace || null,
      deskState: args.deskState || null,
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

  await upsertDiscordAlertRagPayload({
    config,
    planVersionId: args.planVersionId,
    payload,
    errorLabel: 'Scanner Discord alert RAG',
  });
}

async function attachDiscordMessageReceiptToRagRecord(args: {
  planVersionId: string;
  discordMessageId: string | null;
  webhookSource: ScannerWebhookEnvKey | 'dry_run' | 'discord_disabled' | null;
}): Promise<void> {
  if (!args.discordMessageId) return;
  const { config } = resolveDiscordRagPersistenceConfig();
  if (!config) return;
  await attachDiscordMessageReceiptToRagPayload({
    config,
    planVersionId: args.planVersionId,
    discordMessageId: args.discordMessageId,
    webhookSource: args.webhookSource,
    warningLabel: 'Scanner Discord message receipt',
  });
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

function deskPlanRefreshPrice(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : 'none';
}

function deskPlanRefreshBiasFields(bias: DeskPlayDirectionalBias) {
  return {
    line: bias.lineInSand,
    entry: null,
    stop: null,
    target1: null,
    target2: null,
  };
}

function deskPlanRefreshLifecycleFields(item: DeskState['bestLongPlan'] | DeskState['bestShortPlan'] | DeskState['selectedCandidate']) {
  return {
    line: item?.lineInSand ?? null,
    entry: item?.entry ?? null,
    stop: item?.stop ?? null,
    target1: item?.target1 ?? null,
    target2: item?.target2 ?? null,
  };
}

export function scannerDeskPlanRefreshKey(args: {
  tradeDate: string;
  instrument: Instrument;
  session: string;
  deskState: DeskState;
  latestCompleted5m?: string | null;
}): string {
  const play = args.deskState.primaryDeskPlay;
  const longBiasFields = deskPlanRefreshBiasFields(play.longBias);
  const shortBiasFields = deskPlanRefreshBiasFields(play.shortBias);
  const longLifecycleFields = deskPlanRefreshLifecycleFields(args.deskState.bestLongPlan);
  const shortLifecycleFields = deskPlanRefreshLifecycleFields(args.deskState.bestShortPlan);
  const long = {
    ...longLifecycleFields,
    line: longLifecycleFields.line ?? longBiasFields.line,
  };
  const short = {
    ...shortLifecycleFields,
    line: shortLifecycleFields.line ?? shortBiasFields.line,
  };
  const protected5m = play.htfProtectedStructureMap.rows.find((row) => row.timeframe === '5M') || null;
  const parts = [
    args.tradeDate,
    args.instrument,
    args.session,
    'DESK_PLAN_REFRESH',
    args.latestCompleted5m || 'no-completed-5m',
    args.deskState.activeCampaign?.id || 'no-campaign',
    play.direction,
    `line=${deskPlanRefreshPrice(play.lineInSand)}`,
    `long=${play.longBias.state}:${deskPlanRefreshPrice(long.line)}:${deskPlanRefreshPrice(long.entry)}:${deskPlanRefreshPrice(long.stop)}:${deskPlanRefreshPrice(long.target1)}:${deskPlanRefreshPrice(long.target2)}`,
    `short=${play.shortBias.state}:${deskPlanRefreshPrice(short.line)}:${deskPlanRefreshPrice(short.entry)}:${deskPlanRefreshPrice(short.stop)}:${deskPlanRefreshPrice(short.target1)}:${deskPlanRefreshPrice(short.target2)}`,
    `reaction=${deskPlanRefreshPrice(play.targetReactionLevel)}`,
    `runner=${deskPlanRefreshPrice(play.htfObjectiveLadder.runner?.price)}`,
    `m5=${protected5m?.bias || 'none'}:${deskPlanRefreshPrice(protected5m?.protectedStructure)}:${deskPlanRefreshPrice(protected5m?.confirmationLine)}`,
  ];
  return parts.join(':');
}

function scannerDeskPlanRefreshRecord(args: {
  key: string;
  tradeDate: string;
  instrument: Instrument;
  session: string;
  deskState: DeskState;
  latestCompleted5m?: string | null;
  sentAt: string;
}): ScannerDeskPlanRefreshLedgerRecord {
  const play = args.deskState.primaryDeskPlay;
  const primaryLifecycle = play.direction === 'LONG'
    ? args.deskState.bestLongPlan
    : play.direction === 'SHORT'
    ? args.deskState.bestShortPlan
    : args.deskState.selectedCandidate || args.deskState.bestLongPlan || args.deskState.bestShortPlan;
  return {
    fingerprint: args.key,
    tradeDate: args.tradeDate,
    instrument: args.instrument,
    session: args.session,
    activeCampaignId: args.deskState.activeCampaign?.id || null,
    direction: play.direction,
    latestCompleted5m: args.latestCompleted5m || null,
    lineInSand: play.lineInSand,
    longLine: play.longBias.lineInSand,
    shortLine: play.shortBias.lineInSand,
    entry: primaryLifecycle?.entry ?? null,
    stop: primaryLifecycle?.stop ?? null,
    target1: primaryLifecycle?.target1 ?? null,
    target2: primaryLifecycle?.target2 ?? null,
    targetReactionLevel: play.targetReactionLevel,
    sentAt: args.sentAt,
  };
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
  visibilityMetadata?: ScannerVisibilityMetadata;
  candidateLifecycleTrace?: ScannerCandidateLifecycleTrace;
  deskState?: DeskState;
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
  const visibilityMetadata = args.visibilityMetadata || classifyScannerVisibility({
    state: args.state,
    candidate: args.candidate,
    alertDecision: { shouldSend: true, reason: args.alertReason },
    canExecute: Boolean(args.normalized.canExecute),
    staleReason: args.staleReason,
  });
  const candidateLifecycleTrace = args.candidateLifecycleTrace || buildCandidateLifecycleTrace({
    candidates: args.normalized.setupCandidates || [],
    selectedCandidate: args.candidate,
    state: args.state,
    alertDecision: { shouldSend: true, reason: args.alertReason },
    canExecute: Boolean(args.normalized.canExecute),
    staleReason: args.staleReason,
  });
  const deskState = args.deskState || buildDeskState({
    state: args.state,
    candidate: args.candidate,
    visibilityMetadata,
    candidateLifecycleTrace,
    targetCascade: args.targetCascade,
    htfLiquidityDrawState: args.chartContext?.htfLiquidityDrawState || null,
    canExecute: Boolean(args.normalized.canExecute),
  });
  const visualCandidate = deskState.discordAction === 'post_watch'
    ? null
    : candidateForNormalizedVisualAuthority(args.candidate, args.normalized);
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
    visibilityMetadata,
    candidateLifecycleTrace,
    deskState,
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
    candidate: deskState.discordAction === 'post_watch' ? args.candidate : visualCandidate,
    normalized: args.normalized,
    currentPrice: args.currentPrice,
    windowLabel: args.windowLabel,
    planVersionId: args.planVersionId,
    attachments: {
      chartPlan: Boolean(chartMarkup),
      priceLevelMap: Boolean(levelMap),
      auditLogPath,
    },
    deskState,
  });
  validateDiscordPayload(payload, files);
  return { payload, files, chartMarkup, levelMap, auditLogPath };
}

export async function prepareLiveScannerDeskPlayAlertArtifacts(args: {
  session: LiveSession;
  tradeDate: string;
  config: Pick<ScannerConfig, 'instrument'>;
  state: ScannerState;
  confidence: ScannerConfidenceBreakdown;
  normalized: ReturnType<typeof buildAppTradePlan>;
  chartContext: AnalysisResult['structuredChartContext'] | null | undefined;
  currentPrice: number | null;
  windowLabel: string;
  planVersionId: string;
  deskState: DeskState;
  decisionTapePath: string;
  outputDir?: string;
}): Promise<{
  payload: DiscordWebhookPayload;
  files: string[];
  chartMarkup: string | null;
}> {
  const contextCandidate = candidateForDeskPlayContextChart(args.deskState, args.normalized);
  const play = args.deskState.primaryDeskPlay;
  const chartMarkup = contextCandidate
    ? await renderChartMarkup({
        chartContext: args.chartContext || null,
        candidate: contextCandidate,
        instrument: args.config.instrument,
        tradeDate: args.tradeDate,
        sessionLabel: args.session,
        renderMode: 'desk_play_context',
        contextLine: play.lineInSand,
        contextLabel: 'Line in the sand',
        outputDir: args.outputDir,
        filePrefix: `scanner-desk-play-${args.session}-${args.tradeDate}-${args.config.instrument}`,
      })
    : null;
  const files = [chartMarkup].filter((file): file is string => Boolean(file));
  const normalizedForPayload = contextCandidate
    ? {
        ...args.normalized,
        entry: contextCandidate.entry ?? args.normalized.entry ?? null,
        stop: contextCandidate.stop ?? args.normalized.stop ?? null,
        t1: contextCandidate.target1 ?? args.normalized.t1 ?? null,
        t2: contextCandidate.target2 ?? args.normalized.t2 ?? null,
        riskPoints: contextCandidate.riskPoints ?? args.normalized.riskPoints ?? null,
      }
    : args.normalized;
  const payload = buildDiscordPayload({
    session: args.session,
    tradeDate: args.tradeDate,
    config: args.config,
    state: args.state,
    confidence: args.confidence,
    candidate: contextCandidate,
    normalized: normalizedForPayload,
    currentPrice: args.currentPrice,
    windowLabel: args.windowLabel,
    planVersionId: args.planVersionId,
    attachments: {
      chartPlan: Boolean(chartMarkup),
      priceLevelMap: false,
      auditLogPath: args.decisionTapePath,
    },
    deskState: args.deskState,
  });
  validateDiscordPayload(payload, files);
  return { payload, files, chartMarkup };
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

function scannerDiscordMessageCleanupEnabled(config: ScannerConfig): boolean {
  return config.discordMessageCleanupEnabled !== false && (config.discordMessageTtlMinutes ?? 15) > 0;
}

function scannerDiscordMessageTtlMs(config: ScannerConfig): number {
  return Math.max(0, (config.discordMessageTtlMinutes ?? 15) * 60_000);
}

export function scannerDiscordWebhookUrlForPost(webhookUrl: string, components: unknown[] | undefined, forceWait: boolean): string {
  const base = discordWebhookUrlForPayload(webhookUrl, components);
  if (!forceWait) return base;
  const url = new URL(base);
  url.searchParams.set('wait', 'true');
  return url.toString();
}

export function scannerDiscordWebhookDeleteUrl(webhookUrl: string, messageId: string): string {
  const url = new URL(webhookUrl);
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/messages/${encodeURIComponent(messageId)}`;
  url.search = '';
  url.hash = '';
  return url.toString();
}

export function recordScannerDiscordCleanupMessage(args: {
  state: ScannerStateFile;
  config: ScannerConfig;
  receipt: ScannerDiscordPostReceipt;
  kind: ScannerDiscordCleanupKind;
  key: string;
  now?: Date;
}): ScannerDiscordCleanupRecord | null {
  if (!scannerDiscordMessageCleanupEnabled(args.config)) return null;
  if (!scannerDiscordCleanupKindIsEphemeral(args.kind)) return null;
  if (args.receipt.deliveryStatus !== 'sent' || !args.receipt.discordMessageId) return null;
  const now = args.now || new Date();
  const postedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + scannerDiscordMessageTtlMs(args.config)).toISOString();
  const key = `${args.kind}:${args.key}:${args.receipt.discordMessageId}`;
  const record: ScannerDiscordCleanupRecord = {
    key,
    messageId: args.receipt.discordMessageId,
    kind: args.kind,
    webhookSource: args.receipt.webhookSource === 'dry_run' || args.receipt.webhookSource === 'discord_disabled'
      ? null
      : args.receipt.webhookSource,
    postedAt,
    expiresAt,
    deletedAt: null,
    deleteStatus: 'pending',
    lastError: null,
  };
  args.state.discordCleanupMessages[key] = record;
  return record;
}

export async function cleanupExpiredScannerDiscordMessages(args: {
  config: ScannerConfig;
  state: ScannerStateFile;
  now?: Date;
  fetchImpl?: FetchLike;
}): Promise<{ checked: number; deleted: number; failed: number; skipped: number }> {
  const now = args.now || new Date();
  const fetchImpl = args.fetchImpl || fetch;
  const records = Object.values(args.state.discordCleanupMessages || {});
  const webhook = resolveScannerDiscordWebhookUrl();
  let checked = 0;
  let deleted = 0;
  let failed = 0;
  let skipped = 0;

  if (!scannerDiscordMessageCleanupEnabled(args.config)) return { checked, deleted, failed, skipped };

  for (const record of records) {
    if (record.deleteStatus !== 'pending') continue;
    if (Date.parse(record.expiresAt) > now.getTime()) continue;
    checked += 1;
    if (!scannerDiscordCleanupKindIsEphemeral(record.kind)) {
      args.state.discordCleanupMessages[record.key] = {
        ...record,
        deleteStatus: 'skipped',
        deletedAt: now.toISOString(),
        lastError: 'protected_message_kind_not_ephemeral',
      };
      skipped += 1;
      continue;
    }
    if (args.config.dryRun || !args.config.discordEnabled || !webhook.url) {
      args.state.discordCleanupMessages[record.key] = {
        ...record,
        deleteStatus: 'skipped',
        deletedAt: now.toISOString(),
        lastError: args.config.dryRun ? 'dry_run' : !args.config.discordEnabled ? 'discord_disabled' : 'scanner webhook not configured',
      };
      skipped += 1;
      continue;
    }
    try {
      const response = await fetchImpl(scannerDiscordWebhookDeleteUrl(webhook.url, record.messageId), { method: 'DELETE' });
      if (!response.ok && response.status !== 404) {
        throw new Error(`Discord message delete failed (${response.status}): ${await response.text()}`);
      }
      args.state.discordCleanupMessages[record.key] = {
        ...record,
        deleteStatus: 'deleted',
        deletedAt: now.toISOString(),
        lastError: null,
      };
      deleted += 1;
    } catch (error) {
      args.state.discordCleanupMessages[record.key] = {
        ...record,
        deleteStatus: 'failed',
        lastError: sanitizedError(error),
      };
      failed += 1;
    }
  }
  return { checked, deleted, failed, skipped };
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
  const url = scannerDiscordWebhookUrlForPost(webhook.url, payload.components, scannerDiscordMessageCleanupEnabled(config));
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
    const receipt = await postDiscord(payload, args.config);
    recordScannerDiscordCleanupMessage({
      state: args.state,
      config: args.config,
      receipt,
      kind: 'health',
      key: `health:${currentStatus}`,
    });
    args.state.lastHealthStatus = currentStatus;
    args.state.lastHealthAlertSentAt = new Date().toISOString();
    console.log(`[scanner-health] Health alert status change: ${previousStatus || 'none'} -> ${currentStatus}`);
  } catch (error) {
    console.warn(`[scanner-health] Discord health alert failed: ${formatError(error)}`);
  }
}

export function scannerDataQualityNoticeKey(args: {
  tradeDate: string;
  session: LiveSession | 'market_mapping';
  instrument: Instrument;
  reason: string;
  latestCompleted5mTime?: string | null;
  expectedCompleted5mTime?: string | null;
}): string {
  return [
    args.tradeDate,
    args.instrument,
    args.session,
    'data-quality',
    args.latestCompleted5mTime || 'missing-latest-5m',
    args.expectedCompleted5mTime || 'unknown-expected-5m',
    args.reason.replace(/\s+/g, ' ').slice(0, 120),
  ].join('|');
}

export function buildScannerDataQualityNoticePayload(args: {
  tradeDate: string;
  session: LiveSession | 'market_mapping';
  config: ScannerConfig;
  windowLabel: string;
  currentPrice: number | null;
  completed5m: NinjaBridgeBar | null;
  completedFiveMinuteBarAssurance: ScannerCompletedFiveMinuteBarAssuranceStatus;
  reason: string;
  manualRun: boolean;
}): DiscordWebhookPayload {
  const sessionLabel = args.session === 'market_mapping'
    ? 'Market Mapping'
    : args.session === 'morning'
      ? 'Morning'
      : 'Lunch';
  const latest = args.completedFiveMinuteBarAssurance.latestCompletedTime || args.completed5m?.time || null;
  const expected = args.completedFiveMinuteBarAssurance.expectedCompletedTime || null;
  const recovery = (args.completedFiveMinuteBarAssurance.recoverySteps || []).slice(0, 3);
  return {
    username: 'Quant Desk',
    content: `# Quant Desk Scanner Data-Quality Notice - ${sessionLabel}\nNo trade alert was posted. This is an operational data issue, not a no-trade setup conclusion.`,
    embeds: [
      {
        title: `Scanner Data-Quality Blocker - ${sessionLabel}`,
        description: 'The scanner kept Market Mapping context-only and did not create a trade plan because current completed 5M evidence was not usable.',
        color: 0xd50000,
        fields: [
          {
            name: 'Run Context',
            value: clip([
              `Trade date: ${args.tradeDate}`,
              `Window: ${args.windowLabel}`,
              `Manual one-cycle run: ${args.manualRun ? 'yes' : 'no'}`,
              `Instrument: ${args.config.instrument}`,
              `Bridge instrument: ${args.config.bridgeInstrument}`,
            ].join('\n')),
            inline: false,
          },
          {
            name: '5M Data Status',
            value: clip([
              `Current price: ${money(args.currentPrice)}`,
              `Latest completed 5M: ${latest || 'N/A'}`,
              `Expected completed 5M near: ${expected || 'N/A'}`,
              `Reason: ${args.reason}`,
            ].join('\n')),
            inline: false,
          },
          {
            name: 'Desk Boundary',
            value: 'No entries, stops, targets, approvals, or outcome buttons were created. Fix the live bridge/candle feed, then rerun the scanner.',
            inline: false,
          },
          {
            name: 'Recovery',
            value: clip(recovery.length ? recovery.map((step, index) => `${index + 1}. ${step}`).join('\n') : 'Refresh NinjaTrader/bridge and wait for the next completed 5M bar.'),
            inline: false,
          },
        ],
        footer: { text: 'Quant Desk - Data-quality blocker - Market Mapping remains context only' },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

export function shouldSendScannerDataQualityNoticeForWindow(window: ReturnType<typeof resolveScannerWindow>): boolean {
  return window.allowsDeskPlan && window.allowsMarketMapping;
}

async function sendScannerDataQualityNoticeIfNeeded(args: {
  config: ScannerConfig;
  state: ScannerStateFile;
  scannerWindow: ReturnType<typeof resolveScannerWindow>;
  tradeDate: string;
  session: LiveSession | 'market_mapping';
  windowLabel: string;
  currentPrice: number | null;
  completed5m: NinjaBridgeBar | null;
  completedFiveMinuteBarAssurance: ScannerCompletedFiveMinuteBarAssuranceStatus;
  reason: string;
  manualRun: boolean;
}): Promise<void> {
  if (!shouldSendScannerDataQualityNoticeForWindow(args.scannerWindow)) {
    console.log(`[scanner-data] Data-quality notice skipped because scanner desk-plan window is inactive: ${args.scannerWindow.label}`);
    return;
  }

  const noticeKey = scannerDataQualityNoticeKey({
    tradeDate: args.tradeDate,
    session: args.session,
    instrument: args.config.instrument,
    reason: args.reason,
    latestCompleted5mTime: args.completedFiveMinuteBarAssurance.latestCompletedTime || args.completed5m?.time || null,
    expectedCompleted5mTime: args.completedFiveMinuteBarAssurance.expectedCompletedTime || null,
  });
  if (args.state.dataQualityNoticeSent[noticeKey]) return;

  if (!args.config.discordEnabled) {
    args.state.dataQualityNoticeSent[noticeKey] = new Date().toISOString();
    console.log(`[scanner-data] Discord data-quality notice skipped because Discord is disabled: ${noticeKey}`);
    return;
  }

  const webhook = resolveScannerDiscordWebhookUrl();
  if (!args.config.dryRun && !webhook.url) {
    console.warn(`[scanner-data] Discord data-quality notice skipped because scanner Discord webhook is not configured: ${noticeKey}`);
    return;
  }

  const payload = buildScannerDataQualityNoticePayload(args);
  try {
    const receipt = await postDiscord(payload, args.config);
    recordScannerDiscordCleanupMessage({
      state: args.state,
      config: args.config,
      receipt,
      kind: 'data_quality',
      key: noticeKey,
    });
    args.state.dataQualityNoticeSent[noticeKey] = new Date().toISOString();
    console.log(`[scanner-data] Sent scanner data-quality notice: ${noticeKey}`);
  } catch (error) {
    console.warn(`[scanner-data] Discord data-quality notice failed: ${formatError(error)}`);
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
  const activeDeskPlanWindow = '09:15-16:00 ET';
  const fullSchedule = [
    '⏸️ Before 09:15 ET: scanner health only; execution paused',
    `🔎 ${TRADE_RULES.executionWindows.morningExecution.startET}-${TRADE_RULES.executionWindows.morningExecution.endET} ET: Morning execution scan`,
    `🍽️ ${TRADE_RULES.executionWindows.middayTrapReversal.startET}-${TRADE_RULES.executionWindows.middayTrapReversal.endET} ET: Lunch/PM execution scan`,
    '⏸️ After 16:00 ET: scanner health only; execution paused',
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
              `⏰ Active execution/desk-plan time: ${activeDeskPlanWindow}`,
              `✅ Execution scan window: ${windowRange}`,
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

  const receipt = await postDiscord(payload, args.config);
  recordScannerDiscordCleanupMessage({
    state: args.state,
    config: args.config,
    receipt,
    kind: 'window_start',
    key,
  });
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

function floorToTimeframe(date: Date, timeframeMinutes: number): Date {
  const intervalMs = timeframeMinutes * 60_000;
  return new Date(Math.floor(date.getTime() / intervalMs) * intervalMs);
}

export function evaluateCompletedFiveMinuteBarAssuranceGate(args: {
  completed5m: NinjaBridgeBar | null;
  now: Date;
  barFreshness: ReturnType<typeof assessBridgeBarStaleness>;
  liveBars5m?: NinjaBridgeBar[] | null;
  historyCoverage?: ScannerHistoryCoverageRecord[] | null;
  bridgeInstrument?: string | null;
  maxStaleBarMinutes: number;
}): ScannerCompletedFiveMinuteBarAssuranceStatus {
  const expectedCompletedTime = floorToTimeframe(args.now, 5).toISOString();
  const liveCount = args.liveBars5m?.length || 0;
  const coverage5m = (args.historyCoverage || []).find((item) => item.timeframe === '5m') || null;
  const sourceSummary = [
    `live 5M bars=${liveCount}`,
    coverage5m ? `history 5M=${coverage5m.barsLoaded} from ${coverage5m.source}` : 'history 5M=not evaluated',
    `bridge instrument=${args.bridgeInstrument || 'unknown'}`,
  ].join('; ');
  const recoverySteps = [
    'Confirm NinjaTrader is connected to the data provider and the active contract chart is updating.',
    'Confirm the chart Data Series has enough days loaded and CME US Index Futures ETH trading hours selected.',
    'Restart or refresh the NinjaTrader bridge/candle recorder, then wait for the next completed 5M bar.',
    'Run the market-bars backfill/recorder if Supabase market_bars is missing recent 5M candles.',
  ];

  if (!args.completed5m) {
    return {
      status: 'blocked',
      message: `Completed 5M Bar Assurance Gate blocked: no completed 5M bar was available. Expected latest completed close near ${expectedCompletedTime}. ${sourceSummary}.`,
      latestCompletedTime: null,
      expectedCompletedTime,
      sourceSummary,
      recoverySteps,
    };
  }

  if (args.barFreshness.stale) {
    return {
      status: 'blocked',
      message: `Completed 5M Bar Assurance Gate blocked: ${args.barFreshness.reason || 'latest completed 5M bar is stale'}. ${sourceSummary}.`,
      latestCompletedTime: args.completed5m.time,
      expectedCompletedTime,
      sourceSummary,
      recoverySteps,
    };
  }

  return {
    status: 'ready',
    message: `Completed 5M Bar Assurance Gate ready: latest completed 5M bar ${args.completed5m.time} is usable. ${sourceSummary}.`,
    latestCompletedTime: args.completed5m.time,
    expectedCompletedTime,
    sourceSummary,
    recoverySteps: [],
  };
}

export function buildCompletedFiveMinuteGapEventRecord(args: {
  userId: string;
  instrument: Instrument;
  bridgeInstrument: string;
  requestedFrom: string;
  requestedTo: string;
  liveBars: NinjaBridgeBar[];
  cachedBars: NinjaBridgeBar[];
  repairBars: NinjaBridgeBar[];
  finalBars: NinjaBridgeBar[];
  staleReason: string | null;
  attempts: string[];
}): MarketDataGapEventRecord {
  const sorted = mergeBars([], args.finalBars);
  return toMarketDataGapEventRecord({
    userId: args.userId,
    instrument: args.instrument,
    bridgeInstrument: args.bridgeInstrument,
    timeframe: '5m',
    requestedFrom: args.requestedFrom,
    requestedTo: args.requestedTo,
    rangeStart: sorted[0]?.time || null,
    rangeEnd: sorted[sorted.length - 1]?.time || null,
    barsLoaded: sorted.length,
    cacheBars: args.cachedBars.length,
    bridgeRepairBars: args.repairBars.length,
    source: marketDataSourceFromCounts(args.cachedBars.length, args.repairBars.length),
    dataLimitationMessage: `Completed 5M Bar Assurance Gate remained blocked after live bridge, market_bars, and NinjaTrader historical repair. The scanner cannot invent missing completed 5M candles. ${args.staleReason || 'Latest completed 5M bar is unavailable or stale.'}`,
    operatorAction: `Load/refresh ${args.bridgeInstrument} 5M history in NinjaTrader, run npm run nt:backfill for ${args.requestedFrom} to ${args.requestedTo}, then restart or rerun the scanner.`,
    metadata: {
      source: 'nt_scanner_completed_5m_assurance',
      canInventMissingBars: false,
      tradePlanningAllowed: false,
      liveBars: args.liveBars.length,
      cacheBars: args.cachedBars.length,
      bridgeRepairBars: args.repairBars.length,
      attempts: args.attempts,
    },
  });
}

async function resolveCompletedFiveMinuteWithSelfHealing(args: {
  config: ScannerConfig;
  now: Date;
  liveBars5m: NinjaBridgeBar[];
}): Promise<{
  bars5m: NinjaBridgeBar[];
  completed5m: NinjaBridgeBar | null;
  freshness: ReturnType<typeof assessBridgeBarStaleness>;
  attempts: string[];
  selfHealed: boolean;
}> {
  const attempts: string[] = [];
  const liveCompleted = latestCompletedBar(args.liveBars5m, 5, args.now, args.config.barTimestampMode, args.config.barTimeZone);
  const liveFreshness = assessBridgeBarStaleness({
    latestBar: liveCompleted,
    timeframeMinutes: 5,
    now: args.now,
    maxStaleBarMinutes: args.config.maxStaleBarMinutes,
    timestampMode: args.config.barTimestampMode,
    timeZoneMode: args.config.barTimeZone,
  });
  attempts.push(liveFreshness.stale
    ? `live_bridge=blocked (${liveFreshness.reason || 'stale or missing'})`
    : `live_bridge=ready (${liveCompleted?.time || 'N/A'})`);
  if (!liveFreshness.stale) {
    return {
      bars5m: args.liveBars5m,
      completed5m: liveCompleted,
      freshness: liveFreshness,
      attempts,
      selfHealed: false,
    };
  }

  const window = recentHistoricalWindow('5m', 600);
  const marketConfig = loadMarketDataConfig();
  let cachedBars: NinjaBridgeBar[] = [];
  if (marketConfig) {
    try {
      cachedBars = await fetchCachedMarketBars({
        instrument: args.config.bridgeInstrument,
        timeframe: '5m',
        from: window.from,
        to: window.to,
        config: marketConfig,
        limit: 600,
      });
      const cachedCompleted = latestCompletedBar(cachedBars, 5, args.now, args.config.barTimestampMode, args.config.barTimeZone);
      const cachedFreshness = assessBridgeBarStaleness({
        latestBar: cachedCompleted,
        timeframeMinutes: 5,
        now: args.now,
        maxStaleBarMinutes: args.config.maxStaleBarMinutes,
        timestampMode: args.config.barTimestampMode,
        timeZoneMode: args.config.barTimeZone,
      });
      attempts.push(cachedFreshness.stale
        ? `market_bars=blocked (${cachedFreshness.reason || 'stale or missing'})`
        : `market_bars=ready (${cachedCompleted?.time || 'N/A'})`);
      if (!cachedFreshness.stale) {
        return {
          bars5m: mergeBars(args.liveBars5m, cachedBars),
          completed5m: cachedCompleted,
          freshness: cachedFreshness,
          attempts,
          selfHealed: true,
        };
      }
    } catch (error) {
      attempts.push(`market_bars=error (${formatError(error)})`);
    }
  } else {
    attempts.push('market_bars=skipped (Supabase market_bars config unavailable)');
  }

  let repairedBars: NinjaBridgeBar[] = [];
  try {
    const historical = await getNinjaHistoricalBars({
      instrument: args.config.bridgeInstrument,
      timeframe: '5m',
      from: window.from,
      to: window.to,
      limit: 600,
      baseUrl: args.config.bridgeUrl,
    });
    repairedBars = historical.ok ? historical.bars || [] : [];
    if (!repairedBars.length) {
      attempts.push(`historical_bridge=blocked (${historical.error || 'no bars returned'})`);
    } else {
      attempts.push(`historical_bridge=loaded (${repairedBars.length} bars)`);
      if (marketConfig) {
        try {
          await upsertMarketBars({
            bars: repairedBars,
            instrument: args.config.instrument,
            bridgeInstrument: args.config.bridgeInstrument,
            timeframe: '5m',
            config: marketConfig,
          });
          attempts.push('market_bars_upsert=ok');
        } catch (error) {
          attempts.push(`market_bars_upsert=error (${formatError(error)})`);
        }
      }
    }
  } catch (error) {
    attempts.push(`historical_bridge=error (${formatError(error)})`);
  }

  const healedBars = mergeBars(repairedBars, mergeBars(args.liveBars5m, cachedBars));
  const healedCompleted = latestCompletedBar(healedBars, 5, args.now, args.config.barTimestampMode, args.config.barTimeZone);
  const healedFreshness = assessBridgeBarStaleness({
    latestBar: healedCompleted,
    timeframeMinutes: 5,
    now: args.now,
    maxStaleBarMinutes: args.config.maxStaleBarMinutes,
    timestampMode: args.config.barTimestampMode,
    timeZoneMode: args.config.barTimeZone,
  });
  attempts.push(healedFreshness.stale
    ? `self_healing_result=blocked (${healedFreshness.reason || 'stale or missing'})`
    : `self_healing_result=ready (${healedCompleted?.time || 'N/A'})`);

  if (healedFreshness.stale) {
    const persisted = await persistMarketDataGapEventWithFallback({
      marketConfig,
      logPrefix: '[scanner-data] completed 5M blocker',
      record: buildCompletedFiveMinuteGapEventRecord({
        userId: marketConfig?.userId || '00000000-0000-0000-0000-000000000000',
        instrument: args.config.instrument,
        bridgeInstrument: args.config.bridgeInstrument,
        requestedFrom: window.from,
        requestedTo: window.to,
        liveBars: args.liveBars5m,
        cachedBars,
        repairBars: repairedBars,
        finalBars: healedBars,
        staleReason: healedFreshness.reason || null,
        attempts,
      }),
    });
    attempts.push(persisted.source === 'supabase'
      ? 'market_data_gap_events=recorded_completed_5m_blocker'
      : `market_data_gap_events=local_fallback (${persisted.detail})`);
  }

  return {
    bars5m: healedBars,
    completed5m: healedCompleted,
    freshness: healedFreshness,
    attempts,
    selfHealed: !healedFreshness.stale && (cachedBars.length > 0 || repairedBars.length > 0),
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
  const cleanup = await cleanupExpiredScannerDiscordMessages({ config, state, now });
  if (cleanup.checked > 0) {
    console.log(`[scanner-discord] Message cleanup checked=${cleanup.checked} deleted=${cleanup.deleted} skipped=${cleanup.skipped} failed=${cleanup.failed}.`);
  }
  const marketDataConfigForGapSync = loadMarketDataConfig();
  if (marketDataConfigForGapSync) {
    const sync = await syncLocalMarketDataGapEventsToSupabase({ marketConfig: marketDataConfigForGapSync });
    if (sync.attempted > 0) {
      const level = sync.failed > 0 ? console.warn : console.log;
      level(`[scanner-data] Local market-data gap ledger sync: attempted=${sync.attempted}, synced=${sync.synced}, failed=${sync.failed}, ledger=${sync.path}`);
    }
  }

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
    const completed5mAssurance = evaluateCompletedFiveMinuteBarAssuranceGate({
      completed5m: null,
      now,
      barFreshness: {
        stale: true,
        latestTime: null,
        ageMinutes: null,
        maxAllowedMinutes: config.maxStaleBarMinutes,
        reason: 'Latest completed 5M bar unavailable because bridge health failed.',
      },
      liveBars5m: [],
      bridgeInstrument: config.bridgeInstrument,
      maxStaleBarMinutes: config.maxStaleBarMinutes,
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
        geminiAdvisoryFallbackEnabled: config.geminiAdvisoryFallbackEnabled,
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
      completedFiveMinuteBarAssurance: completed5mAssurance,
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
    await sendScannerDataQualityNoticeIfNeeded({
      config,
      state,
      scannerWindow: window,
      tradeDate,
      session: window.session === 'lunch' ? 'lunch' : window.session === 'morning' ? 'morning' : 'market_mapping',
      windowLabel: window.label,
      currentPrice: null,
      completed5m: null,
      completedFiveMinuteBarAssurance: completed5mAssurance,
      reason: healthReport.blockingReasons[0] || completed5mAssurance.message,
      manualRun: config.once,
    });
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

  const [snapshot, positions, fetchedLiveBars] = await Promise.all([
    getNinjaBridgeSnapshot(config.bridgeInstrument, config.bridgeUrl).catch(() => null),
    getNinjaBridgePositions(config.account, config.bridgeUrl).catch(() => null),
    fetchLiveBars(config),
  ]);

  const completed5mRecovery = await resolveCompletedFiveMinuteWithSelfHealing({
    config,
    now,
    liveBars5m: fetchedLiveBars['5m'] || [],
  });
  const liveBars = {
    ...fetchedLiveBars,
    '5m': completed5mRecovery.bars5m,
  };
  const completed5m = completed5mRecovery.completed5m;
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
  const bridgeFreshness = completed5mRecovery.freshness;
  let completed5mAssurance = evaluateCompletedFiveMinuteBarAssuranceGate({
    completed5m,
    now,
    barFreshness: bridgeFreshness,
    liveBars5m: liveBars['5m'] || [],
    bridgeInstrument: config.bridgeInstrument,
    maxStaleBarMinutes: config.maxStaleBarMinutes,
  });
  if (completed5mRecovery.attempts.length) {
    console.log(`[scanner-data] Completed 5M self-healing attempts: ${completed5mRecovery.attempts.join(' | ')}`);
  }
  if (completed5mRecovery.selfHealed) {
    console.log(`[scanner-data] Completed 5M bar self-healed from cache/repair: ${completed5m?.time || 'N/A'}`);
  }

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
      geminiAdvisoryFallbackEnabled: config.geminiAdvisoryFallbackEnabled,
      maxStaleBarMinutes: config.maxStaleBarMinutes,
    },
    bridgeHealth,
    bridgeReachable: healthOk,
    latestCompleted5mBar: completed5m,
    barStaleness: bridgeFreshness,
    discordWebhookConfigured: Boolean(resolveScannerDiscordWebhookUrl().url),
    marketMapStatus: liveMarketMapStatus(liveBars),
    completedFiveMinuteBarAssurance: completed5mAssurance,
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
    if (completed5mAssurance.status === 'blocked') {
      await sendScannerDataQualityNoticeIfNeeded({
        config,
        state,
        scannerWindow: window,
        tradeDate,
        session: window.session === 'lunch' ? 'lunch' : window.session === 'morning' ? 'morning' : 'market_mapping',
        windowLabel: window.label,
        currentPrice,
        completed5m,
        completedFiveMinuteBarAssurance: completed5mAssurance,
        reason: healthReport.blockingReasons[0] || completed5mAssurance.message || 'Scanner health blocked trade/watchlist alerts.',
        manualRun: config.once,
      });
    }
    console.log(`[scanner] NoData: ${healthReport.blockingReasons.join(' | ')}`);
    await writeState(state);
    return;
  }

  if (bridgeFreshness.stale) {
    await sendScannerDataQualityNoticeIfNeeded({
      config,
      state,
      scannerWindow: window,
      tradeDate,
      session: window.session === 'lunch' ? 'lunch' : window.session === 'morning' ? 'morning' : 'market_mapping',
      windowLabel: window.label,
      currentPrice,
      completed5m,
      completedFiveMinuteBarAssurance: completed5mAssurance,
      reason: bridgeFreshness.reason || completed5mAssurance.message || 'Latest completed 5M candle is stale.',
      manualRun: config.once,
    });
    await writeState(state);
    console.log(`[scanner] NoData: ${bridgeFreshness.reason}`);
    return;
  }

  let preloadedLookLeft: Awaited<ReturnType<typeof fetchLookLeftContext>> | null = null;
  if (shouldRunPreMarketDataReadinessGate(config, window)) {
    const gateResult = await runPreMarketDataReadinessBackfillGate({
      config,
      tradeDate,
      window,
      completedFiveMinuteBarAssurance: completed5mAssurance,
      completed5m,
    });
    preloadedLookLeft = gateResult.lookLeft;
    if (!gateResult.report.canEnterTradePlanningMode && window.allowsTradePlan) {
      console.warn('[scanner-data] Setup scan blocked by Pre-Market Data Readiness + Backfill Gate. This is a data-quality blocker, not a no-setup conclusion.');
      await writeState(state);
      return;
    }
  }

  if (!window.allowsDeskPlan || !config.scanWindows) {
    const mappingState = scannerContextState(window);
    const mappingLabel = config.scanWindows ? scannerContextLogLabel(window) : 'Market Mapping Mode';
    if (!window.allowsMarketMapping) {
      console.log(
        `[scanner] ${mappingLabel}: ${mappingState}, market map refresh paused outside ${MARKET_MAPPING_WINDOW.startHour}:${String(MARKET_MAPPING_WINDOW.startMinute).padStart(2, '0')}-${MARKET_MAPPING_WINDOW.endHour}:${String(MARKET_MAPPING_WINDOW.endMinute).padStart(2, '0')} ET | current ${money(currentPrice)} | completed 5M ${completed5m?.time || 'N/A'} | positions ${positionText}`,
      );
      await writeState(state);
      return;
    }
    const mapStatus = await refreshMarketMapContext({ config, state, tradeDate, window, liveBars });
    console.log(`[scanner] ${mappingLabel}: ${mappingState}, context updated only | current ${money(currentPrice)} | completed 5M ${completed5m?.time || 'N/A'} | positions ${positionText} | ${mapStatus}`);
    await writeState(state);
    return;
  }

  const session = mappingSessionForWindow(window);
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

  const lookLeft = preloadedLookLeft || (await fetchLookLeftContext(config, tradeDate, session, completed5m.time).catch((error) => {
    console.warn(`[scanner] 30-day scanner history preload unavailable: ${formatError(error)}`);
    return null;
  }));
  const historyCoverage = lookLeft?.coverage || [];
  completed5mAssurance = evaluateCompletedFiveMinuteBarAssuranceGate({
    completed5m,
    now,
    barFreshness: bridgeFreshness,
    liveBars5m: liveBars['5m'] || [],
    historyCoverage,
    bridgeInstrument: config.bridgeInstrument,
    maxStaleBarMinutes: config.maxStaleBarMinutes,
  });
  if (completed5mAssurance.status === 'blocked') {
    console.warn(`[scanner-data] ${completed5mAssurance.message}`);
    if (completed5mAssurance.recoverySteps?.length) {
      console.warn(`[scanner-data] recovery: ${completed5mAssurance.recoverySteps.join(' | ')}`);
    }
    await sendScannerDataQualityNoticeIfNeeded({
      config,
      state,
      scannerWindow: window,
      tradeDate,
      session,
      windowLabel: window.label,
      currentPrice,
      completed5m,
      completedFiveMinuteBarAssurance: completed5mAssurance,
      reason: completed5mAssurance.message,
      manualRun: config.once,
    });
    await writeState(state);
    return;
  }
  const twoHourWarning = twoHourCurrentRunWarning(historyCoverage);
  const htfCoverage = htfHistoryCoverageReadiness(historyCoverage);
  if (twoHourWarning) console.warn(`[scanner-history] ${twoHourWarning}`);
  if (htfCoverage.status !== 'sufficient') console.warn(`[scanner-history] ${htfCoverage.summary}`);
  const historyWarnings = [
    ...historyCoverage.flatMap((item) => item.warning ? [item.warning] : []),
    ...(twoHourWarning ? [twoHourWarning] : []),
    ...(htfCoverage.status !== 'sufficient' ? [htfCoverage.summary] : []),
  ];
  const repairedExecutionBars5m = lookLeft
    ? repairMarketDataBarsWithinBaseRange(liveBars['5m'], lookLeft.bars['5m'])
    : liveBars['5m'];
  const htfBars5m = lookLeft
    ? mergeBars(repairedExecutionBars5m, lookLeft.bars['5m'])
    : repairedExecutionBars5m;
  const bars = lookLeft
    ? {
        '5m': repairedExecutionBars5m.length ? repairedExecutionBars5m : lookLeft.bars['5m'],
        '15m': mergeBars(liveBars['15m'], lookLeft.bars['15m']),
        '60m': mergeBars(liveBars['60m'], lookLeft.bars['60m']),
        '120m': mergeBars(liveBars['120m'], lookLeft.bars['120m']),
        '240m': mergeBars(liveBars['240m'], lookLeft.bars['240m']),
    }
    : liveBars;
  const macroAsOf = completed5m ? parseBridgeTime(completed5m.time, config.barTimeZone) || new Date() : new Date();
  const analysis = await analysisFromBars({ config, session, tradeDate, bars, htfBars5m, asOf: macroAsOf });
  analysis.structuredChartContext = attachScannerHistoryCoverage(analysis.structuredChartContext, historyCoverage);
  const appOwnedFailedPlanEventsFromState = appOwnedFailedPlanEventsFromScannerState({
    state,
    tradeDate,
    session,
    instrument: config.instrument,
    completed5m,
  });
  const appOwnedFailedPlanEventsFromAudits = await appOwnedFailedPlanEventsFromScannerAudits({
    tradeDate,
    session,
    instrument: config.instrument,
    completed5m,
  });
  const appOwnedFailedPlanEvents = dedupeFailedPlanEvents([
    ...appOwnedFailedPlanEventsFromState,
    ...appOwnedFailedPlanEventsFromAudits,
  ]);
  if (appOwnedFailedPlanEventsFromAudits.length && !appOwnedFailedPlanEventsFromState.length) {
    console.warn(
      `[scanner-failed-plan-reversal] Recovered ${appOwnedFailedPlanEventsFromAudits.length} app-owned failed-plan event(s) from durable scanner audits because delivery state had none.`,
    );
  }
  const failedPlanReversalIntegration = attachFailedPlanReversalContextFromScannerState({
    chartContext: analysis.structuredChartContext,
    failedPlanEvents: appOwnedFailedPlanEvents,
  });
  analysis.structuredChartContext = failedPlanReversalIntegration.chartContext || undefined;
  if (failedPlanReversalIntegration.failedPlanReversal) {
    const context = failedPlanReversalIntegration.failedPlanReversal;
    console.log(
      `[scanner-failed-plan-reversal] ${context.decisionState}: failed ${context.originalPlanDirection} level ${context.failedDecisionLevel ?? 'unknown'} -> ${context.oppositeDirection}; htf=${context.htfStackStatus}; 5m=${context.fiveMinuteTriggerStatus}; createsCandidate=${context.createsCandidate ? 'yes' : 'no'}; executionAuthority=no.`,
    );
  }
  let normalized = buildAppTradePlan(analysis, { sessionType: session, instrument: config.instrument, windowStatusOverride: 'active' });
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
  let initialSelection = selectScannerPlan({
    normalized,
    currentPrice,
    latestCompletedBar: completed5m,
    guards: scannerGuards,
  });
  let initialCandidate = initialSelection.candidate;
  const sameCycleFailedPlanEvent = appOwnedFailedDecisionEventFromCandidate(initialCandidate, completed5m);
  if (sameCycleFailedPlanEvent) {
    const sameCycleIntegration = attachFailedPlanReversalContextFromScannerState({
      chartContext: analysis.structuredChartContext,
      failedPlanEvents: [sameCycleFailedPlanEvent],
    });
    analysis.structuredChartContext = sameCycleIntegration.chartContext || undefined;
    if (sameCycleIntegration.failedPlanReversal) {
      const context = sameCycleIntegration.failedPlanReversal;
      console.warn(
        `[scanner-failed-plan-reversal] Same-cycle failed app-owned plan detected: ${context.decisionState}: failed ${context.originalPlanDirection} level ${context.failedDecisionLevel ?? 'unknown'} -> ${context.oppositeDirection}; htf=${context.htfStackStatus}; 5m=${context.fiveMinuteTriggerStatus}; createsCandidate=${context.createsCandidate ? 'yes' : 'no'}; executionAuthority=no.`,
      );
      normalized = buildAppTradePlan(analysis, { sessionType: session, instrument: config.instrument, windowStatusOverride: 'active' });
      initialSelection = selectScannerPlan({
        normalized,
        currentPrice,
        latestCompletedBar: completed5m,
        guards: scannerGuards,
      });
      initialCandidate = initialSelection.candidate;
    }
  }
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
    latestCompletedBar: completed5m,
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
          recordScannerDiscordCleanupMessage({
            state,
            config,
            receipt,
            kind: 'watchlist',
            key: watchlistKey,
          });
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
  const planVersionId = createPlanVersionId(session, tradeDate);
  let alertDecision = shouldSendScannerAlert({
    state: stateForAlert,
    confidence: confidence.score,
    window,
    candidate,
    thresholds: config.thresholds,
    stale: stale.stale,
    duplicate: Boolean(existing),
    stateImproved: false,
  });
  const durableLedgerConfig = loadScannerActiveCampaignLedgerConfig();
  let activeCampaignClaim: ScannerActiveCampaignClaimResult = {
    source: 'none',
    claimed: true,
    shouldSuppress: false,
    campaignId: null,
    reason: null,
    durableAvailable: Boolean(durableLedgerConfig),
  };
  if (alertDecision.shouldSend && scannerActiveCampaignKey(candidate)) {
    try {
      activeCampaignClaim = await claimDurableActiveCampaignScannerAlert({
        config: durableLedgerConfig,
        candidate,
        tradeDate,
        instrument: config.instrument,
        session,
        state: stateForAlert,
        confidence: confidence.score,
        alertKey,
        planVersionId,
      });
    } catch (error) {
      activeCampaignClaim = {
        source: 'blocked',
        claimed: false,
        shouldSuppress: true,
        campaignId: scannerActiveCampaignKey(candidate),
        reason: `ActiveCampaign alert blocked: durable Supabase ledger is unavailable (${sanitizedError(error)}). No local-only campaign de-dup fallback is allowed.`,
        durableAvailable: false,
      };
      console.warn(`[scanner] ${activeCampaignClaim.reason}`);
    }
    if (activeCampaignClaim.shouldSuppress) {
      alertDecision = {
        shouldSend: false,
        reason: activeCampaignClaim.reason || 'ActiveCampaign duplicate suppressed by durable ledger.',
      };
    }
  }
  const visibilityMetadata = classifyScannerVisibility({
    state: stateForAlert,
    candidate,
    window,
    alertDecision,
    canExecute: Boolean(normalized.canExecute),
    staleReason: stale.reason,
  });
  const candidateLifecycleTrace = buildCandidateLifecycleTrace({
    candidates: normalized.setupCandidates || [],
    selectedCandidate: candidate,
    state: stateForAlert,
    window,
    alertDecision,
    canExecute: Boolean(normalized.canExecute),
    staleReason: stale.reason,
  });
  const deskState = buildDeskState({
    state: stateForAlert,
    candidate,
    visibilityMetadata,
    candidateLifecycleTrace,
    targetCascade,
    htfLiquidityDrawState: analysis.structuredChartContext?.htfLiquidityDrawState || null,
    canExecute: Boolean(normalized.canExecute),
  });
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
    visibilityMetadata,
    candidateLifecycleTrace,
    targetCascade,
    deskState,
    planVersionId,
    dryRun: config.dryRun,
    historyCoverage,
  });

  console.log(`[scanner] ${session} ${completed5m.time}: ${stateForAlert} confidence ${confidence.score}/100 | ${sameCompletedCandle ? 'same completed 5M, refreshed live plan | ' : ''}${alertDecision.reason} | decision tape=${decisionTapePath}`);
  state.lastCompleted5mBySession[sessionKey] = completed5m.time;

  if (!alertDecision.shouldSend && window.allowsDiscordAlert && deskState.primaryDeskPlay.discordEligible) {
    const deskPlayKey = scannerDeskPlanRefreshKey({
      tradeDate,
      instrument: config.instrument,
      session: window.session,
      deskState,
      latestCompleted5m: completed5m.time,
    });
    if (!state.deskPlanRefreshSent[deskPlayKey]) {
      const deskPlayPlanVersionId = `${planVersionId}-DESK-PLAY`;
      try {
        const deskPlayArtifacts = await prepareLiveScannerDeskPlayAlertArtifacts({
          session,
          tradeDate,
          config,
          state: stateForAlert,
          confidence,
          normalized,
          chartContext: analysis.structuredChartContext || null,
          currentPrice,
          windowLabel: window.label,
          planVersionId: deskPlayPlanVersionId,
          deskState,
          decisionTapePath,
        });
        if (shouldPersistScannerAlertToRag(deskState)) {
          try {
            await upsertScannerDiscordAlertRagRecord({
              planVersionId: deskPlayPlanVersionId,
              session,
              tradeDate,
              instrument: config.instrument,
              analysis,
              normalized,
              candidate: candidateForDeskPlayContextChart(deskState, normalized) || candidate,
              visibilityMetadata,
              candidateLifecycleTrace,
              deskState,
              confidence: confidence.score,
            });
          } catch (error) {
            console.warn(`Scanner Desk Play RAG pending save failed safely: ${sanitizedError(error)}`);
          }
        }
        const receipt = await postDiscord(deskPlayArtifacts.payload, config, deskPlayArtifacts.files);
        if (receipt.deliveryStatus === 'sent') {
          const sentAt = new Date().toISOString();
          recordScannerDiscordCleanupMessage({
            state,
            config,
            receipt,
            kind: 'desk_play',
            key: deskPlayKey,
          });
          state.deskPlanRefreshSent[deskPlayKey] = scannerDeskPlanRefreshRecord({
            key: deskPlayKey,
            tradeDate,
            instrument: config.instrument,
            session: window.session,
            deskState,
            latestCompleted5m: completed5m.time,
            sentAt,
          });
          state.deskPlaySent[deskPlayKey] = {
            direction: deskState.primaryDeskPlay.direction,
            lineInSand: deskState.primaryDeskPlay.lineInSand,
            sentAt,
          };
          state.sent[deskPlayKey] = { state: stateForAlert, confidence: confidence.score, sentAt };
          console.log(`[scanner] Sent Desk Play update: ${deskPlayKey}`);
        } else {
          console.log(`[scanner] Desk Play update skipped (${receipt.webhookSource || 'unknown'}): ${deskPlayKey}`);
        }
      } catch (error) {
        console.warn(`[scanner] Desk Play delivery failed safely; scanner will continue evaluating trade alerts: ${sanitizedError(error)}`);
      }
    } else {
      console.log(`[scanner] Desk Plan refresh already sent for ${deskPlayKey}.`);
    }
  }

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
      visibilityMetadata,
      candidateLifecycleTrace,
      deskState,
    });
    if (shouldPersistScannerAlertToRag(deskState)) {
      try {
        await upsertScannerDiscordAlertRagRecord({
          planVersionId,
          session,
          tradeDate,
          instrument: config.instrument,
          analysis,
          normalized,
          candidate,
          visibilityMetadata,
          candidateLifecycleTrace,
          deskState,
          confidence: confidence.score,
        });
      } catch (error) {
        console.warn(`Scanner Discord alert RAG pending save failed safely: ${sanitizedError(error)}`);
      }
    } else {
      console.log(`[scanner-rag] Watch-only alert skipped trade RAG pending save: ${planVersionId}`);
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
        recordScannerDiscordCleanupMessage({
          state,
          config,
          receipt,
          kind: 'trade_alert',
          key: alertKey,
        });
        state.sent[alertKey] = { state: stateForAlert, confidence: confidence.score, sentAt };
        recordActiveCampaignScannerAlertSent({
          activeCampaignSent: state.activeCampaignSent,
          candidate,
          tradeDate,
          state: stateForAlert,
          confidence: confidence.score,
          alertKey,
          sentAt,
        });
        await markDurableActiveCampaignScannerAlertSent({
          config: activeCampaignClaim.source === 'supabase' ? durableLedgerConfig : null,
          campaignId: activeCampaignClaim.campaignId,
        }).catch((ledgerError) => {
          console.warn(`[scanner-delivery] ActiveCampaign durable sent marker failed safely after Discord send: ${sanitizedError(ledgerError)}`);
        });
        if (shouldPersistScannerAlertToRag(deskState)) {
          await attachDiscordMessageReceiptToRagRecord({
            planVersionId,
            discordMessageId: receipt.discordMessageId,
            webhookSource: receipt.webhookSource,
          });
        }
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
        await releaseDurableActiveCampaignScannerAlertClaim({
          config: activeCampaignClaim.source === 'supabase' ? durableLedgerConfig : null,
          campaignId: activeCampaignClaim.campaignId,
          deliveryStatus: 'skipped',
          reason: `Discord delivery skipped: ${receipt.webhookSource || 'unknown'}.`,
        }).catch((ledgerError) => {
          console.warn(`[scanner-delivery] ActiveCampaign durable skipped release failed safely: ${sanitizedError(ledgerError)}`);
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
      await releaseDurableActiveCampaignScannerAlertClaim({
        config: activeCampaignClaim.source === 'supabase' ? durableLedgerConfig : null,
        campaignId: activeCampaignClaim.campaignId,
        deliveryStatus: 'failed',
        reason: sanitizedError(error),
      }).catch((releaseError) => {
        console.warn(`[scanner-delivery] ActiveCampaign durable claim release failed safely: ${sanitizedError(releaseError)}`);
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
  if (hasArg('preflight-active-campaign-ledger')) {
    const readiness = await verifyScannerActiveCampaignLedgerReady({
      config: loadScannerActiveCampaignLedgerConfig(),
    });
    console.log(`[scanner-preflight] ${readiness.message}`);
    if (!readiness.ready) process.exitCode = 1;
    return;
  }
  if (config.discordEnabled && !config.dryRun && config.scanWindows) {
    const readiness = await verifyScannerActiveCampaignLedgerReady({
      config: loadScannerActiveCampaignLedgerConfig(),
    });
    if (!readiness.ready) {
      throw new Error(`${readiness.message} ActiveCampaign trade-plan alerts require durable one-trade-per-campaign de-duplication before Discord posting mode can start.`);
    }
    console.log(`[scanner-preflight] ${readiness.message}`);
  }
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
