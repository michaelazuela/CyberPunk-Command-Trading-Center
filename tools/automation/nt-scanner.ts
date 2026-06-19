import dotenv from 'dotenv';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAppTradePlan } from '../../src/lib/planEngine';
import { getEffectiveCanExecute } from '../../src/lib/effectiveExecution';
import { createPlanVersionId } from '../../src/lib/planMetadata';
import { buildTradeJournalRecord } from '../../src/lib/tradeJournal';
import { buildFailedPlanReversalContextFromChartContext } from '../../src/lib/failedPlanReversalEngine';
import { summarizeActiveTimeframeMssRuleset, type ActiveTimeframeMssRulesetAudit } from '../../src/lib/activeTimeframeMssRulesetAudit';
import { roundToTradeTick, targetsFromEntryStop, TRADE_RULES } from '../../src/config/tradeRules';
import { EVENING_MARKET_MAPPING_WINDOW, MARKET_MAPPING_WINDOW } from '../../src/config/timeWindows';
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
  type ScannerCandidateLifecycleTraceItem,
  type ScannerCandidateLifecycleTrace,
  type ScannerAlertDecision,
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
  isSundayEveningFourHourReopenLagCovered,
  marketDataSourceFromCounts,
  mergeMarketDataBars,
  repairMarketDataBarsWithinBaseRange,
  verifyMarketDataWindow,
  type MarketDataWindowSource,
} from './market-data-ingestion';
import { applyNewsMacroCaution, loadMacroCalendarConfig } from './macro-calendar';
import { renderChartMarkup, renderPriceLevelMap, renderReversalWatchChart } from './chart-markup-renderer';
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
import { resolveCurrentBridgeInstrument, type BridgeInstrumentResolution } from './bridge-instrument-resolver';
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
type LiveSession = 'morning' | 'lunch' | 'evening';
type ScannerSetupSession = 'morning' | 'lunch';
const ACTIVE_MARKET_MAPPING_WINDOWS_TEXT =
  `${MARKET_MAPPING_WINDOW.startHour}:${String(MARKET_MAPPING_WINDOW.startMinute).padStart(2, '0')}-${MARKET_MAPPING_WINDOW.endHour}:${String(MARKET_MAPPING_WINDOW.endMinute).padStart(2, '0')} ET and ` +
  `${EVENING_MARKET_MAPPING_WINDOW.startHour}:${String(EVENING_MARKET_MAPPING_WINDOW.startMinute).padStart(2, '0')}-${EVENING_MARKET_MAPPING_WINDOW.endHour}:${String(EVENING_MARKET_MAPPING_WINDOW.endMinute).padStart(2, '0')} ET`;

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
  reversalWatchSent: Record<string, ScannerReversalWatchLedgerRecord>;
  morningHtfDeskMapSent: Record<string, ScannerMorningHtfDeskMapLedgerRecord>;
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
export type ScannerDiscordCleanupKind = 'trade_alert' | 'desk_play' | 'reversal_watch' | 'morning_htf_desk_map' | 'watchlist' | 'window_start' | 'health' | 'data_quality';

export interface ScannerDiscordCleanupRecord {
  key: string;
  messageId: string;
  kind: ScannerDiscordCleanupKind;
  webhookSource: ScannerDiscordWebhookEnvKey | null;
  postedAt: string;
  expiresAt: string;
  deletedAt: string | null;
  deleteStatus: 'pending' | 'deleted' | 'failed' | 'skipped' | 'replaced' | 'superseded';
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

function scannerDiscordCleanupKindIsTracked(kind: ScannerDiscordCleanupKind): boolean {
  return scannerDiscordCleanupKindIsEphemeral(kind) || kind === 'desk_play';
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
  nextTrigger: string | null;
  invalidation: string | null;
  standDown: string | null;
  readiness: string | null;
  tacticalCampaignFingerprint?: string | null;
  mainPlayFingerprint: string;
  sentAt: string;
}

export interface ScannerReversalWatchLedgerRecord {
  fingerprint: string;
  tradeDate: string;
  instrument: Instrument;
  session: string;
  exhaustedSide: ScannerReversalWatchDirection | null;
  watchDirection: ScannerReversalWatchDirection | null;
  state: ScannerReversalWatchState;
  latestCompleted5m: string | null;
  reactionZoneLow: number | null;
  reactionZoneHigh: number | null;
  triggerLine: number | null;
  strongerTriggerLine: number | null;
  invalidLine: number | null;
  noChaseLine: number | null;
  reclaimConfirmed: boolean;
  retestHoldConfirmed: boolean;
  barsSinceReclaim: number | null;
  sentAt: string;
}

export interface ScannerMorningHtfDeskMapLedgerRecord {
  fingerprint: string;
  tradeDate: string;
  instrument: Instrument;
  session: 'morning';
  primary: string;
  latestCompleted5m: string | null;
  keyBattleArea: string;
  sentAt: string;
}

export type ScannerReversalWatchDiscordSuppressionCategory =
  | 'post'
  | 'not_ready'
  | 'forming'
  | 'stale_data'
  | 'duplicate_refresh';

export interface ScannerReversalWatchDiscordSuppressionDecision {
  shouldPost: boolean;
  category: ScannerReversalWatchDiscordSuppressionCategory;
  reason: string;
  previousFingerprint: string | null;
  changesTradingLogic: false;
  changesCanExecute: false;
}

export type ScannerDeskPlayDiscordSuppressionCategory =
  | 'post'
  | 'stale_data'
  | 'missed_no_chase'
  | 'low_quality_map'
  | 'tactical_campaign_watch'
  | 'passed_or_invalidated_levels'
  | 'duplicate_refresh';

export interface ScannerDeskPlayDiscordSuppressionDecision {
  shouldPost: boolean;
  category: ScannerDeskPlayDiscordSuppressionCategory;
  reason: string;
  previousFingerprint: string | null;
  changesTradingLogic: false;
  changesCanExecute: false;
}

export interface ScannerTacticalCampaignMap {
  eligible: boolean;
  direction: 'LONG' | 'SHORT' | null;
  supportingTimeframes: string[];
  executionTimeframeAligned: boolean;
  readiness: string | null;
  lineInSand: number | null;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  nextTrigger: string | null;
  executionEvidenceSource: 'protected_structure_5m' | 'candidate_lifecycle_5m' | null;
  reason: string;
  changesTradingLogic: false;
  changesCanExecute: false;
}

export type ScannerReversalWatchDirection = 'LONG' | 'SHORT';
export type ScannerReversalWatchState =
  | 'unavailable'
  | 'forming'
  | 'watch_active'
  | 'direction_validated'
  | 'stalled'
  | 'invalidated'
  | 'no_chase';

export interface ScannerReversalWatchLines {
  sourceOfTruth: 'scanner_campaign_exhaustion_reversal_watch_lines';
  eligible: boolean;
  exhaustedSide: ScannerReversalWatchDirection | null;
  watchDirection: ScannerReversalWatchDirection | null;
  reactionZoneLow: number | null;
  reactionZoneHigh: number | null;
  reactionLabel: string | null;
  triggerLine: number | null;
  strongerTriggerLine: number | null;
  invalidLine: number | null;
  noChaseLine: number | null;
  reclaimRule: string | null;
  retestRule: string | null;
  invalidationRule: string | null;
  noChaseRule: string | null;
  reason: string;
  sourceFields: string[];
  approvalBoundary: {
    changesTradeApprovals: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRiskRules: false;
    createsNewModel: false;
  };
}

export interface ScannerReversalWatchStateResult {
  sourceOfTruth: 'scanner_campaign_exhaustion_reversal_watch_state';
  state: ScannerReversalWatchState;
  watchDirection: ScannerReversalWatchDirection | null;
  completed5mTime: string | null;
  reclaimConfirmed: boolean;
  retestHoldConfirmed: boolean;
  barsSinceReclaim: number | null;
  reason: string;
  approvalBoundary: {
    changesTradeApprovals: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRiskRules: false;
  };
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
  webhookSource: ScannerDiscordWebhookEnvKey | 'dry_run' | 'discord_disabled' | null;
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
const SCANNER_OPERATIONAL_WEBHOOK_ENV_KEYS = ['SUPERVISOR_DISCORD_WEBHOOK_URL', 'QUANT_DESK_HEALTH_WEBHOOK_URL'] as const;

type ScannerWebhookEnvKey = typeof SCANNER_WEBHOOK_ENV_KEYS[number];
type ScannerOperationalWebhookEnvKey = typeof SCANNER_OPERATIONAL_WEBHOOK_ENV_KEYS[number];
type ScannerDiscordWebhookEnvKey = ScannerWebhookEnvKey | ScannerOperationalWebhookEnvKey;

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
  source: ScannerDiscordWebhookEnvKey | null;
  usingGenericFallback: boolean;
}

function readEnvWithWindowsUserFallback(key: string, env: NodeJS.ProcessEnv = process.env): string {
  const processValue = env[key]?.trim();
  if (processValue) return processValue;
  if (env !== process.env || process.platform !== 'win32') return '';
  try {
    const escapedKey = key.replace(/'/g, "''");
    return execFileSync('powershell.exe', [
      '-NoProfile',
      '-Command',
      `[Environment]::GetEnvironmentVariable('${escapedKey}', 'User')`,
    ], {
      encoding: 'utf8',
      timeout: 2_000,
      windowsHide: true,
    }).trim();
  } catch {
    return '';
  }
}

export function resolveScannerDiscordWebhookUrl(env: NodeJS.ProcessEnv = process.env): ScannerWebhookResolution {
  for (const key of SCANNER_WEBHOOK_ENV_KEYS) {
    const url = readEnvWithWindowsUserFallback(key, env);
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

export function resolveScannerOperationalDiscordWebhookUrl(env: NodeJS.ProcessEnv = process.env): ScannerWebhookResolution {
  for (const key of SCANNER_OPERATIONAL_WEBHOOK_ENV_KEYS) {
    const url = readEnvWithWindowsUserFallback(key, env);
    if (url) {
      return {
        url,
        source: key,
        usingGenericFallback: false,
      };
    }
  }
  return { url: null, source: null, usingGenericFallback: false };
}

function resolveScannerDiscordWebhookUrlBySource(source: ScannerDiscordWebhookEnvKey | null): ScannerWebhookResolution {
  if (source === 'SUPERVISOR_DISCORD_WEBHOOK_URL' || source === 'QUANT_DESK_HEALTH_WEBHOOK_URL') {
    const url = readEnvWithWindowsUserFallback(source);
    return { url: url || null, source, usingGenericFallback: false };
  }
  return resolveScannerDiscordWebhookUrl();
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

export function scannerActiveCampaignKeyForTradeDate(candidate: SetupCandidate | null | undefined, tradeDate: string): string | null {
  const campaignId = scannerActiveCampaignKey(candidate);
  return normalizeActiveCampaignIdForTradeDate(campaignId, tradeDate);
}

export function shouldLogBridgeInstrumentResolution(resolution: BridgeInstrumentResolution, configuredBridgeInstrument: string): boolean {
  if (resolution.warning) return true;
  if (resolution.source === 'front-month-rollover') return false;
  return resolution.instrument !== configuredBridgeInstrument;
}

function normalizeActiveCampaignIdForTradeDate(campaignId: string | null | undefined, tradeDate: string): string | null {
  const normalizedTradeDate = typeof tradeDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(tradeDate.trim())
    ? tradeDate.trim()
    : null;
  if (!campaignId || !normalizedTradeDate) return campaignId;
  const parts = campaignId.split(':');
  if (parts.length >= 3 && /^\d{4}-\d{2}-\d{2}$/.test(parts[0] || '')) {
    return [normalizedTradeDate, ...parts.slice(1)].join(':');
  }
  return `${normalizedTradeDate}:${campaignId}`;
}

export function shouldSuppressActiveCampaignScannerAlert(args: {
  activeCampaignSent?: Record<string, ScannerActiveCampaignLedgerRecord>;
  candidate?: SetupCandidate | null;
  tradeDate?: string;
}): {
  shouldSuppress: boolean;
  campaignId: string | null;
  reason: string | null;
  record: ScannerActiveCampaignLedgerRecord | null;
} {
  const campaignId = args.tradeDate
    ? scannerActiveCampaignKeyForTradeDate(args.candidate, args.tradeDate)
    : scannerActiveCampaignKey(args.candidate);
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
  const campaignId = scannerActiveCampaignKeyForTradeDate(args.candidate, args.tradeDate);
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
  const campaignId = scannerActiveCampaignKeyForTradeDate(args.candidate, args.tradeDate);
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
  webhookSource: ScannerDiscordWebhookEnvKey | 'dry_run' | 'discord_disabled' | null;
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

export function normalizeScannerBarTimestampMode(raw: string | null | undefined): BridgeTimestampMode {
  const value = (raw || '').trim().toLowerCase();
  if (value === 'close') return 'close';
  return 'open';
}

function printHelp() {
  console.log([
    'Quant Desk local deterministic NinjaTrader scanner',
    '',
    'Usage:',
    '  npm run nt:scanner',
    '  npm run nt:scanner -- --once --dry-run',
    '  npm run nt:scanner -- --instrument MES --bridge-instrument MES',
    '  npm run nt:scanner -- --dry-run',
    '',
    'Options:',
    '  --once                         Run one poll cycle and exit.',
    '  --dry-run                      Print/log alert payloads instead of posting to Discord.',
    '  --instrument MES|MNQ           Logical app instrument, defaults to MES.',
    '  --bridge-instrument "MES" NinjaTrader symbol root or contract. Omitted/root/stale same-root contracts resolve from bridge /health or front-month rollover.',
    '  --bridge-url URL               Defaults to http://127.0.0.1:8765.',
    '  --poll-seconds 60              Poll cadence, minimum 15 seconds for continuous mode.',
    '  --discord false                Disable Discord sends but keep scanner logs.',
    '  --scan-windows false           Disable trade-plan scans; context/health only.',
    '  --afternoon true               Enable optional afternoon window.',
    '  --max-stale-bar-minutes 10     Refuse live scans when latest completed 5M bar is older than this.',
    '  --market-map-refresh-seconds 300 Refresh durable look-left map while outside trade windows.',
    '  --pre-market-data-gate true    Preload/repair 30-day 5M/15M/1H/2H/4H context before setup scans.',
    '  --macro-calendar false         Disable high-impact macro calendar caution.',
    '  --bar-timestamp-mode open      NinjaTrader bridge bars are treated as bar-open times by default; use close only for close-timestamped feeds.',
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
  const timestampMode = normalizeScannerBarTimestampMode(argValue('bar-timestamp-mode') || process.env.NINJATRADER_BAR_TIMESTAMP_MODE);
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
    barTimestampMode: timestampMode,
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
    reversalWatchSent: {},
    morningHtfDeskMapSent: {},
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
        reversalWatchSent: parsed.reversalWatchSent || {},
        morningHtfDeskMapSent: parsed.morningHtfDeskMapSent || {},
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
  const sessionClose = etDateTime(tradeDate, session === 'morning' ? '12:00' : session === 'evening' ? '22:15' : '16:00');
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
  const loadedSpanDays = (last - first + timeframeMinutes(timeframe) * 60_000) / (24 * 60 * 60 * 1000);
  const requiredSpanDays = Math.max(0, SCANNER_REQUIRED_HISTORY_LOOKBACK_DAYS - 1);
  const latestCompletedToleranceMs = (timeframeMinutes(timeframe) + 30) * 60_000;
  const startCoverageToleranceMs = 24 * 60 * 60_000;
  const latestBarTime = sorted[sorted.length - 1]?.time;
  const sundayEveningFourHourReopenLagCovered =
    isSundayEveningFourHourReopenLagCovered(timeframe, latestBarTime, requestedTo);
  const latestCoverageSatisfied =
    last >= to - latestCompletedToleranceMs ||
    sundayEveningFourHourReopenLagCovered;
  const spanCoverageSatisfied =
    loadedSpanDays >= requiredSpanDays ||
    (sundayEveningFourHourReopenLagCovered && loadedSpanDays >= requiredSpanDays - 3);
  return (
    sorted.length >= SCANNER_HISTORY_MIN_BARS[timeframe] &&
    first <= from + startCoverageToleranceMs &&
    spanCoverageSatisfied &&
    latestCoverageSatisfied
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
    currentPrice: args.currentPrice,
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

export async function writeScannerDiscordReceiptAuditLog(args: {
  kind: ScannerDiscordCleanupKind;
  key: string;
  planVersionId: string;
  tradeDate: string;
  instrument: Instrument;
  session: LiveSession;
  receipt: ScannerDiscordPostReceipt;
  postedAt: string;
  cleanupRecordKey?: string | null;
  ragReceiptAttached?: boolean;
  auditDir?: string;
}): Promise<string | null> {
  if (args.receipt.deliveryStatus !== 'sent' || !args.receipt.discordMessageId) return null;
  const auditDir = args.auditDir || DISCORD_AUDIT_DIR;
  await fs.mkdir(auditDir, { recursive: true });
  const safePlanVersionId = args.planVersionId.replace(/[^a-zA-Z0-9._-]/g, '-');
  const file = path.join(auditDir, `discord-receipt-${safePlanVersionId}.json`);
  await fs.writeFile(file, JSON.stringify({
    createdAt: new Date().toISOString(),
    source: 'live-scanner-discord-receipt',
    kind: args.kind,
    key: args.key,
    planVersionId: args.planVersionId,
    tradeDate: args.tradeDate,
    instrument: args.instrument,
    session: args.session,
    discordMessage: {
      messageId: args.receipt.discordMessageId,
      webhookSource: args.receipt.webhookSource,
      httpStatus: args.receipt.httpStatus,
      postedAt: args.postedAt,
      cleanupRecordKey: args.cleanupRecordKey || null,
      ragReceiptAttached: Boolean(args.ragReceiptAttached),
    },
    recoveryUse: {
      mayBackfillRagDiscordMessageId: true,
      mayApproveTrade: false,
      mayChangeTradePlan: false,
      mayPlaceOrder: false,
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

function scannerCompletedBarsFromChartContext(chartContext: unknown): NinjaBridgeBar[] {
  return asArray(asRecord(chartContext)?.candles)
    .map((raw) => {
      const record = asRecord(raw);
      const time = typeof record?.time === 'string'
        ? record.time
        : typeof record?.timestamp === 'string'
          ? record.timestamp
          : null;
      const open = record?.open;
      const high = record?.high;
      const low = record?.low;
      const close = record?.close;
      if (
        !time ||
        typeof open !== 'number' ||
        typeof high !== 'number' ||
        typeof low !== 'number' ||
        typeof close !== 'number'
      ) {
        return null;
      }
      return {
        time,
        open,
        high,
        low,
        close,
        volume: typeof record.volume === 'number' ? record.volume : undefined,
      } as NinjaBridgeBar;
    })
    .filter((bar): bar is NinjaBridgeBar => Boolean(bar));
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
    currentPrice: args.currentPrice,
    canExecute: Boolean(args.normalized.canExecute),
  });
  const reversalWatchLines = buildScannerReversalWatchLines({
    deskState,
    completed5m: args.completed5m,
    currentPrice: args.currentPrice,
  });
  const reversalWatchState = classifyScannerReversalWatchState({
    lines: reversalWatchLines,
    completed5m: args.completed5m,
    completed5mHistory: scannerCompletedBarsFromChartContext(args.chartContext),
    currentPrice: args.currentPrice,
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
    reversalWatch: {
      lines: reversalWatchLines,
      state: reversalWatchState,
    },
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
  if (window.session === 'evening') return 'evening';
  if (window.session === 'afternoon') return 'lunch';
  if (window.nextWindowLabel?.toLowerCase().includes('midday')) return 'lunch';
  return 'morning';
}

function setupSessionForLiveSession(session: LiveSession): ScannerSetupSession {
  return session === 'morning' ? 'morning' : 'lunch';
}

function noticeSessionForWindow(window: ReturnType<typeof resolveScannerWindow>): LiveSession | 'market_mapping' {
  if (window.session === 'morning' || window.session === 'lunch' || window.session === 'evening') return window.session;
  return 'market_mapping';
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
    sessionType: setupSessionForLiveSession(args.session),
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

function deskPlayFiveMinuteProtectedStructure(deskState: DeskState): number | null {
  const rows = deskState.primaryDeskPlay.htfProtectedStructureMap?.rows;
  if (!Array.isArray(rows)) return null;
  const row = rows.find((item) => String(item.timeframe || '').toUpperCase() === '5M');
  return isFiniteTradePrice(row?.protectedStructure) ? roundToTradeTick(row.protectedStructure) : null;
}

function deskPlayLineForDirection(deskState: DeskState, direction: 'LONG' | 'SHORT'): number | null {
  const play = deskState.primaryDeskPlay;
  const directionalLine = direction === 'LONG' ? play.longAbove : play.shortBelow;
  if (isFiniteTradePrice(directionalLine)) return roundToTradeTick(directionalLine);
  const biasLine = direction === 'LONG' ? play.longBias.lineInSand : play.shortBias.lineInSand;
  if (isFiniteTradePrice(biasLine)) return roundToTradeTick(biasLine);
  return isFiniteTradePrice(play.lineInSand) ? roundToTradeTick(play.lineInSand) : null;
}

function validDeskPlayPlanningLevels(
  direction: 'LONG' | 'SHORT',
  entryValue: number | null | undefined,
  stopValue: number | null | undefined,
  enforceRiskCap: boolean,
): Pick<SetupCandidate, 'entry' | 'stop' | 'target1' | 'target2' | 'riskPoints'> | null {
  const entry = isFiniteTradePrice(entryValue) ? roundToTradeTick(entryValue) : null;
  const stop = isFiniteTradePrice(stopValue) ? roundToTradeTick(stopValue) : null;
  const computed = targetsFromEntryStop(direction, entry, stop);
  const sideIsValid = direction === 'LONG'
    ? isFiniteTradePrice(entry) && isFiniteTradePrice(stop) && stop < entry
    : isFiniteTradePrice(entry) && isFiniteTradePrice(stop) && stop > entry;
  if (
    !isFiniteTradePrice(entry) ||
    !isFiniteTradePrice(stop) ||
    !isFiniteTradePrice(computed.target1) ||
    !isFiniteTradePrice(computed.target2) ||
    !isFiniteTradePrice(computed.riskPoints) ||
    (enforceRiskCap && computed.riskPoints > TRADE_RULES.maxRiskPoints) ||
    !sideIsValid
  ) {
    return null;
  }
  return {
    entry,
    stop,
    target1: computed.target1,
    target2: computed.target2,
    riskPoints: computed.riskPoints,
  };
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
  const normalizedLevels = validDeskPlayPlanningLevels(direction, entry, stop, false);
  if (normalizedLevels) return normalizedLevels;
  const reviewLevels = validDeskPlayPlanningLevels(
    direction,
    deskPlayLineForDirection(args.deskState, direction),
    deskPlayFiveMinuteProtectedStructure(args.deskState),
    true,
  );
  return reviewLevels || { entry: null, stop: null, target1: null, target2: null, riskPoints: null };
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
    outcome: 'no_trade',
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
  webhookSource: ScannerDiscordWebhookEnvKey | 'dry_run' | 'discord_disabled' | null;
}): Promise<boolean> {
  if (!args.discordMessageId) return false;
  const { config } = resolveDiscordRagPersistenceConfig();
  if (!config) return false;
  try {
    return await attachDiscordMessageReceiptToRagPayload({
      config,
      planVersionId: args.planVersionId,
      discordMessageId: args.discordMessageId,
      webhookSource: args.webhookSource,
      warningLabel: 'Scanner Discord message receipt',
    });
  } catch (error) {
    console.warn(`Scanner Discord message receipt update skipped safely: ${sanitizedError(error)}`);
    return false;
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

function deskPlanRefreshPrice(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : 'none';
}

function normalizeDeskPlayInstructionText(value: string | null | undefined): string {
  return (value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function scannerDeskPlayPrimaryBias(deskState: DeskState): DeskPlayDirectionalBias | null {
  const direction = deskState.primaryDeskPlay.direction;
  if (direction === 'LONG') return deskState.primaryDeskPlay.longBias;
  if (direction === 'SHORT') return deskState.primaryDeskPlay.shortBias;
  return null;
}

function htfRowSupportsDirection(
  row: DeskState['primaryDeskPlay']['htfProtectedStructureMap']['rows'][number],
  direction: 'LONG' | 'SHORT',
): boolean {
  const expected = direction === 'LONG' ? 'BULL' : 'BEAR';
  return row.currentBias === expected || row.bias === expected;
}

function lifecycleItemShowsFiveMinuteTacticalShift(
  item: ScannerCandidateLifecycleTraceItem | null,
  direction: 'LONG' | 'SHORT',
): boolean {
  if (!item || item.direction !== direction) return false;
  const setupTypes = new Set<SetupType>([
    SetupType.HtfDisplacementMssContinuation,
    SetupType.HtfDisplacementFvgContinuation,
    SetupType.IntradayMssMicroContinuation,
    SetupType.TurtleSoup,
  ]);
  if (!setupTypes.has(item.setupType)) return false;
  const proofText = [
    item.candidateState,
    item.nextTrigger,
    item.requiredTrigger,
    item.lineInSandReason,
    ...item.missingEvidence,
  ].filter(Boolean).join(' ');
  return /5M|MSS|displacement|retest|rejection|close-through|close below|close above|sweep|reclaim/i.test(proofText);
}

export function scannerTacticalCampaignMapFromDeskState(args: {
  deskState: DeskState;
  normalized?: ReturnType<typeof buildAppTradePlan> | null;
}): ScannerTacticalCampaignMap {
  const play = args.deskState.primaryDeskPlay;
  const direction = play.direction === 'LONG' || play.direction === 'SHORT' ? play.direction : null;
  const primaryBias = scannerDeskPlayPrimaryBias(args.deskState);
  const planningLevels = deskPlayPlanningLevels({ deskState: args.deskState, normalized: args.normalized });
  const base = {
    eligible: false,
    direction,
    supportingTimeframes: [] as string[],
    executionTimeframeAligned: false,
    readiness: primaryBias?.tradeReadiness?.status || null,
    lineInSand: play.lineInSand,
    entry: planningLevels.entry ?? null,
    stop: planningLevels.stop ?? null,
    target1: planningLevels.target1 ?? null,
    target2: planningLevels.target2 ?? null,
    nextTrigger: play.nextTrigger || args.deskState.nextTrigger || primaryBias?.nextTrigger || null,
    executionEvidenceSource: null as ScannerTacticalCampaignMap['executionEvidenceSource'],
    changesTradingLogic: false as const,
    changesCanExecute: false as const,
  };

  if (!direction) {
    return { ...base, reason: 'No primary LONG/SHORT DeskState campaign is active.' };
  }
  if (args.deskState.canExecute) {
    return { ...base, reason: 'Executable plans use the trade-alert path, not the tactical campaign watch path.' };
  }
  if (args.deskState.dataQualityStatus === 'data_limited' || args.deskState.htfContextStatus === 'insufficient') {
    return { ...base, reason: 'HTF campaign watch blocked because scanner context is data-limited or insufficient.' };
  }
  if (primaryBias && primaryBias.state !== 'primary') {
    return { ...base, reason: `${direction} is ${primaryBias.state}, not the primary tactical desk side.` };
  }

  const rows = play.htfProtectedStructureMap?.rows || [];
  const supportingTimeframes = rows
    .filter((row) => (row.timeframe === '4H' || row.timeframe === '2H' || row.timeframe === '1H') && htfRowSupportsDirection(row, direction))
    .map((row) => row.timeframe);
  const protectedFiveMinuteAligned = rows.some((row) => row.timeframe === '5M' && htfRowSupportsDirection(row, direction));
  const lifecycleFiveMinuteAligned = lifecycleItemShowsFiveMinuteTacticalShift(scannerDeskPlayPrimaryLifecycle(args.deskState), direction);
  const executionTimeframeAligned = protectedFiveMinuteAligned || lifecycleFiveMinuteAligned;
  const campaignMap = {
    ...base,
    supportingTimeframes: Array.from(new Set(supportingTimeframes)),
    executionTimeframeAligned,
    executionEvidenceSource: protectedFiveMinuteAligned
      ? 'protected_structure_5m' as const
      : lifecycleFiveMinuteAligned
        ? 'candidate_lifecycle_5m' as const
        : null,
  };
  if (!campaignMap.supportingTimeframes.length) {
    return { ...campaignMap, reason: `${direction} tactical campaign watch blocked because no aligned 1H/2H/4H protected-structure row is present.` };
  }
  if (!executionTimeframeAligned) {
    return { ...campaignMap, reason: `${direction} tactical campaign watch blocked because 5M protected-structure row is not aligned.` };
  }

  return {
    ...campaignMap,
    eligible: true,
    reason: `${direction} tactical campaign watch eligible from ${campaignMap.supportingTimeframes.join('/')} support plus ${campaignMap.executionEvidenceSource === 'candidate_lifecycle_5m' ? 'app-owned 5M candidate lifecycle evidence' : 'aligned completed 5M structure'}. Execution remains blocked until app-owned canExecute is true.`,
  };
}

function scannerOppositeDirection(direction: ScannerReversalWatchDirection): ScannerReversalWatchDirection {
  return direction === 'LONG' ? 'SHORT' : 'LONG';
}

function roundNullableTradePrice(value: unknown): number | null {
  return isFiniteTradePrice(value) ? roundToTradeTick(value) : null;
}

function scannerLifecycleForDirection(
  deskState: DeskState,
  direction: ScannerReversalWatchDirection,
): ScannerCandidateLifecycleTraceItem | null {
  return direction === 'LONG' ? deskState.bestLongPlan : deskState.bestShortPlan;
}

function scannerFiveMinuteProtectedLine(
  deskState: DeskState,
  direction: ScannerReversalWatchDirection,
): number | null {
  const row = (deskState.primaryDeskPlay.htfProtectedStructureMap?.rows || [])
    .find((item) => item.timeframe === '5M' && htfRowSupportsDirection(item, direction));
  return roundNullableTradePrice(row?.protectedStructure);
}

function reversalWatchRuleText(
  direction: ScannerReversalWatchDirection,
  kind: 'reclaim' | 'retest' | 'invalid' | 'no_chase',
  line: number,
): string {
  const price = line.toFixed(2);
  if (direction === 'LONG') {
    if (kind === 'reclaim') return `Completed 5M candle body close above ${price}. Wicks do not confirm reclaim.`;
    if (kind === 'retest') return `Later completed 5M retest/hold close above ${price}.`;
    if (kind === 'invalid') return `Completed 5M close below ${price} invalidates the long reversal watch.`;
    return `No chase above ${price}; wait for a fresh pullback/retest instead.`;
  }
  if (kind === 'reclaim') return `Completed 5M candle body close below ${price}. Wicks do not confirm reclaim.`;
  if (kind === 'retest') return `Later completed 5M retest/hold close below ${price}.`;
  if (kind === 'invalid') return `Completed 5M close above ${price} invalidates the short reversal watch.`;
  return `No chase below ${price}; wait for a fresh pullback/retest instead.`;
}

function scannerReversalWatchBoundary() {
  return {
    changesTradeApprovals: false as const,
    changesCanExecute: false as const,
    changesEntryStopTargets: false as const,
    changesRiskRules: false as const,
  };
}

export function buildScannerReversalWatchLines(args: {
  deskState: DeskState;
  completed5m?: NinjaBridgeBar | null;
  currentPrice?: number | null;
}): ScannerReversalWatchLines {
  const approvalBoundary = {
    ...scannerReversalWatchBoundary(),
    createsNewModel: false as const,
  };
  const play = args.deskState.primaryDeskPlay;
  const exhaustedSide = play.direction === 'LONG' || play.direction === 'SHORT' ? play.direction : null;
  const watchDirection = exhaustedSide ? scannerOppositeDirection(exhaustedSide) : null;
  const sourceFields: string[] = [];
  const empty = (reason: string): ScannerReversalWatchLines => ({
    sourceOfTruth: 'scanner_campaign_exhaustion_reversal_watch_lines',
    eligible: false,
    exhaustedSide,
    watchDirection,
    reactionZoneLow: null,
    reactionZoneHigh: null,
    reactionLabel: null,
    triggerLine: null,
    strongerTriggerLine: null,
    invalidLine: null,
    noChaseLine: null,
    reclaimRule: null,
    retestRule: null,
    invalidationRule: null,
    noChaseRule: null,
    reason,
    sourceFields,
    approvalBoundary,
  });

  if (!exhaustedSide || !watchDirection) return empty('No active LONG/SHORT campaign is available for reversal-watch line building.');
  if (args.deskState.canExecute) return empty('Executable plans use the trade-alert path; reversal-watch lines stay review metadata only.');

  const exhausted = scannerLifecycleForDirection(args.deskState, exhaustedSide);
  const watch = scannerLifecycleForDirection(args.deskState, watchDirection);
  const reactionCandidates = [
    roundNullableTradePrice(exhausted?.targetReactionLevel),
    roundNullableTradePrice(args.deskState.primaryDeskPlay.targetReactionLevel),
    roundNullableTradePrice(exhausted?.target1),
    roundNullableTradePrice(exhausted?.target2),
  ].filter((value): value is number => value !== null);
  const reactionZoneLow = reactionCandidates.length ? Math.min(...reactionCandidates) : null;
  const reactionZoneHigh = reactionCandidates.length ? Math.max(...reactionCandidates) : null;
  if (reactionZoneLow === null || reactionZoneHigh === null) return empty('No app-owned target/reaction zone is available for campaign exhaustion.');
  sourceFields.push('exhausted.targetReactionLevel/target1/target2');

  const barLow = roundNullableTradePrice(args.completed5m?.low);
  const barHigh = roundNullableTradePrice(args.completed5m?.high);
  const currentPrice = roundNullableTradePrice(args.currentPrice);
  const reactionTouched = exhaustedSide === 'SHORT'
    ? [barLow, currentPrice].some((value) => value !== null && value <= reactionZoneHigh + 0.25)
    : [barHigh, currentPrice].some((value) => value !== null && value >= reactionZoneLow - 0.25);
  if (!reactionTouched) {
    return {
      ...empty(`The ${exhaustedSide} campaign has not reached its mapped target/reaction zone yet.`),
      reactionZoneLow,
      reactionZoneHigh,
      reactionLabel: exhausted?.targetReactionLabel || play.targetReactionLabel || null,
      sourceFields,
    };
  }

  const triggerLine = watchDirection === 'LONG'
    ? roundNullableTradePrice(play.longAbove) ?? roundNullableTradePrice(play.longBias.lineInSand) ?? roundNullableTradePrice(watch?.lineInSand)
    : roundNullableTradePrice(play.shortBelow) ?? roundNullableTradePrice(play.shortBias.lineInSand) ?? roundNullableTradePrice(watch?.lineInSand);
  const strongerTriggerLine = roundNullableTradePrice(watch?.lineInSand);
  const invalidLine = scannerFiveMinuteProtectedLine(args.deskState, watchDirection) ??
    roundNullableTradePrice(watch?.stop) ??
    (watchDirection === 'LONG' ? reactionZoneLow : reactionZoneHigh);
  const noChaseLine = roundNullableTradePrice(watch?.target1) ??
    roundNullableTradePrice(watch?.targetReactionLevel) ??
    (watchDirection === 'LONG' ? roundNullableTradePrice(play.lineInSand) : roundNullableTradePrice(play.lineInSand));

  if (triggerLine !== null) sourceFields.push(watchDirection === 'LONG' ? 'primaryDeskPlay.longAbove/longBias.lineInSand' : 'primaryDeskPlay.shortBelow/shortBias.lineInSand');
  if (invalidLine !== null) sourceFields.push('5M protectedStructure or watch.stop or reaction zone');
  if (noChaseLine !== null) sourceFields.push('watch.target1/targetReactionLevel or primary line');

  const missing = [
    triggerLine === null ? 'trigger line' : null,
    invalidLine === null ? 'invalidation line' : null,
    noChaseLine === null ? 'no-chase line' : null,
  ].filter((value): value is string => Boolean(value));

  return {
    sourceOfTruth: 'scanner_campaign_exhaustion_reversal_watch_lines',
    eligible: missing.length === 0,
    exhaustedSide,
    watchDirection,
    reactionZoneLow,
    reactionZoneHigh,
    reactionLabel: exhausted?.targetReactionLabel || play.targetReactionLabel || null,
    triggerLine,
    strongerTriggerLine,
    invalidLine,
    noChaseLine,
    reclaimRule: triggerLine === null ? null : reversalWatchRuleText(watchDirection, 'reclaim', triggerLine),
    retestRule: triggerLine === null ? null : reversalWatchRuleText(watchDirection, 'retest', triggerLine),
    invalidationRule: invalidLine === null ? null : reversalWatchRuleText(watchDirection, 'invalid', invalidLine),
    noChaseRule: noChaseLine === null ? null : reversalWatchRuleText(watchDirection, 'no_chase', noChaseLine),
    reason: missing.length
      ? `Campaign exhaustion reaction was found, but ${missing.join(', ')} is missing.`
      : `${exhaustedSide} campaign reached mapped reaction zone ${reactionZoneLow.toFixed(2)}-${reactionZoneHigh.toFixed(2)}; ${watchDirection} reversal watch lines are available. Reclaim requires a completed 5M body close, not a wick.`,
    sourceFields: Array.from(new Set(sourceFields)),
    approvalBoundary,
  };
}

function scannerBarClosesThroughLine(
  direction: ScannerReversalWatchDirection,
  bar: NinjaBridgeBar,
  line: number,
): boolean {
  return direction === 'LONG' ? bar.close > line : bar.close < line;
}

function scannerBarRetestsAndHoldsLine(
  direction: ScannerReversalWatchDirection,
  bar: NinjaBridgeBar,
  line: number,
): boolean {
  return direction === 'LONG'
    ? bar.low <= line + 0.25 && bar.close > line
    : bar.high >= line - 0.25 && bar.close < line;
}

export function classifyScannerReversalWatchState(args: {
  lines: ScannerReversalWatchLines;
  completed5m?: NinjaBridgeBar | null;
  completed5mHistory?: NinjaBridgeBar[];
  currentPrice?: number | null;
}): ScannerReversalWatchStateResult {
  const approvalBoundary = scannerReversalWatchBoundary();
  const line = args.lines.triggerLine;
  const direction = args.lines.watchDirection;
  const completed = args.completed5m || null;
  const unavailable = (reason: string): ScannerReversalWatchStateResult => ({
    sourceOfTruth: 'scanner_campaign_exhaustion_reversal_watch_state',
    state: 'unavailable',
    watchDirection: direction,
    completed5mTime: completed?.time || null,
    reclaimConfirmed: false,
    retestHoldConfirmed: false,
    barsSinceReclaim: null,
    reason,
    approvalBoundary,
  });
  if (!args.lines.eligible || !direction || line === null) return unavailable(args.lines.reason);
  if (!completed) return unavailable('No completed 5M bar is available for reversal-watch state classification.');

  const close = completed.close;
  const currentPrice = roundNullableTradePrice(args.currentPrice);
  const invalid = args.lines.invalidLine;
  const noChase = args.lines.noChaseLine;
  if (invalid !== null && (direction === 'LONG' ? close < invalid : close > invalid)) {
    return {
      ...unavailable(`Completed 5M close ${close.toFixed(2)} invalidated the ${direction} reversal watch at ${invalid.toFixed(2)}.`),
      state: 'invalidated',
    };
  }
  if (noChase !== null && [close, currentPrice].some((value) => value !== null && (direction === 'LONG' ? value >= noChase : value <= noChase))) {
    return {
      ...unavailable(`${direction} reversal watch is no-chase at/through ${noChase.toFixed(2)}.`),
      state: 'no_chase',
    };
  }

  const history = (args.completed5mHistory || [])
    .filter((bar) => typeof bar?.close === 'number')
    .concat(args.completed5mHistory?.some((bar) => bar.time === completed.time) ? [] : [completed]);
  const reclaimIndex = history.findIndex((bar) => scannerBarClosesThroughLine(direction, bar, line));
  const reclaimConfirmed = reclaimIndex >= 0 && scannerBarClosesThroughLine(direction, completed, line);
  if (!reclaimConfirmed) {
    return {
      ...unavailable(`Waiting for completed 5M body close ${direction === 'LONG' ? 'above' : 'below'} ${line.toFixed(2)}.`),
      state: 'forming',
    };
  }

  const barsSinceReclaim = Math.max(0, history.length - 1 - reclaimIndex);
  const retestHoldConfirmed = reclaimIndex >= 0 && history
    .slice(reclaimIndex + 1)
    .some((bar) => scannerBarRetestsAndHoldsLine(direction, bar, line));
  if (retestHoldConfirmed) {
    return {
      ...unavailable(`${direction} reversal watch direction validated: completed 5M reclaim and later retest/hold close confirmed at ${line.toFixed(2)}.`),
      state: 'direction_validated',
      reclaimConfirmed: true,
      retestHoldConfirmed: true,
      barsSinceReclaim,
    };
  }
  if (barsSinceReclaim >= 3) {
    return {
      ...unavailable(`${direction} reversal watch stalled: three completed 5M bars passed after reclaim without a retest/hold validation.`),
      state: 'stalled',
      reclaimConfirmed: true,
      barsSinceReclaim,
    };
  }
  return {
    ...unavailable(`${direction} reversal watch active: completed 5M reclaim close confirmed; waiting for later retest/hold close.`),
    state: 'watch_active',
    reclaimConfirmed: true,
    barsSinceReclaim,
  };
}

function scannerDeskPlayStandDownInstruction(deskState: DeskState): string | null {
  const play = deskState.primaryDeskPlay;
  const primaryBias = scannerDeskPlayPrimaryBias(deskState);
  if (play.direction !== 'LONG' && play.direction !== 'SHORT') return 'Stand down until one primary side is confirmed by scanner-owned DeskState.';
  if (deskState.dataQualityStatus === 'data_limited') return 'Stand down until data quality recovers.';
  if (deskState.htfContextStatus === 'insufficient') return 'Stand down until HTF context is sufficient.';
  if (primaryBias?.tradeReadiness?.status === 'missed_no_chase') return 'Stand down; the move is missed/no-chase until a fresh completed 5M setup forms.';
  if (primaryBias?.tradeReadiness?.status === 'blocked') return primaryBias.tradeReadiness.reason || 'Stand down while the primary side is blocked.';
  if (play.invalidation) return play.invalidation;
  if (deskState.invalidation) return deskState.invalidation;
  const line = play.lineInSand ?? primaryBias?.lineInSand ?? null;
  if (typeof line === 'number') {
    return play.direction === 'LONG'
      ? `Stand down if price accepts below ${line.toFixed(2)}.`
      : `Stand down if price accepts above ${line.toFixed(2)}.`;
  }
  return 'Stand down if the primary side loses completed 5M proof or canExecute remains false.';
}

function scannerDeskPlayMainPlayFingerprint(args: {
  record: Omit<ScannerDeskPlanRefreshLedgerRecord, 'mainPlayFingerprint'>;
}): string {
  const record = args.record;
  return [
    record.activeCampaignId || 'no-campaign',
    record.direction,
    deskPlanRefreshPrice(record.lineInSand),
    deskPlanRefreshPrice(record.longLine),
    deskPlanRefreshPrice(record.shortLine),
    deskPlanRefreshPrice(record.entry),
    deskPlanRefreshPrice(record.stop),
    deskPlanRefreshPrice(record.target1),
    deskPlanRefreshPrice(record.target2),
    deskPlanRefreshPrice(record.targetReactionLevel),
    normalizeDeskPlayInstructionText(record.nextTrigger),
    normalizeDeskPlayInstructionText(record.invalidation),
    normalizeDeskPlayInstructionText(record.standDown),
    normalizeDeskPlayInstructionText(record.readiness),
  ].join('|');
}

function scannerTacticalCampaignFingerprint(map: ScannerTacticalCampaignMap): string | null {
  if (!map.direction) return null;
  return [
    `eligible=${map.eligible ? 'yes' : 'no'}`,
    `side=${map.direction}`,
    `htf=${map.supportingTimeframes.join(',') || 'none'}`,
    `m5=${map.executionTimeframeAligned ? 'aligned' : 'not_aligned'}`,
    `m5source=${map.executionEvidenceSource || 'none'}`,
    `readiness=${normalizeDeskPlayInstructionText(map.readiness) || 'none'}`,
    `line=${deskPlanRefreshPrice(map.lineInSand)}`,
    `entry=${deskPlanRefreshPrice(map.entry)}`,
    `stop=${deskPlanRefreshPrice(map.stop)}`,
    `t1=${deskPlanRefreshPrice(map.target1)}`,
    `t2=${deskPlanRefreshPrice(map.target2)}`,
    `trigger=${normalizeDeskPlayInstructionText(map.nextTrigger) || 'none'}`,
  ].join('|');
}

export function scannerDeskPlanRefreshKey(args: {
  tradeDate: string;
  instrument: Instrument;
  session: string;
  deskState: DeskState;
  latestCompleted5m?: string | null;
}): string {
  const play = args.deskState.primaryDeskPlay;
  const protected5m = play.htfProtectedStructureMap.rows.find((row) => row.timeframe === '5M') || null;
  const activeCampaignId = normalizeActiveCampaignIdForTradeDate(args.deskState.activeCampaign?.id, args.tradeDate);
  const parts = [
    args.tradeDate,
    args.instrument,
    args.session,
    'DESK_PLAN_REFRESH',
    args.latestCompleted5m || 'no-completed-5m',
    activeCampaignId || 'no-campaign',
    play.direction,
    `visibility=${args.deskState.visibilityMode || 'unknown'}:${args.deskState.discordAction || 'unknown'}`,
    `quality=${args.deskState.htfContextStatus || 'unknown'}:${args.deskState.dataQualityStatus || 'unknown'}`,
    `long=${play.longBias.state}`,
    `short=${play.shortBias.state}`,
    `m5=${protected5m?.bias || 'none'}`,
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
  const activeCampaignId = normalizeActiveCampaignIdForTradeDate(args.deskState.activeCampaign?.id, args.tradeDate);
  const primaryBias = scannerDeskPlayPrimaryBias(args.deskState);
  const recordWithoutFingerprint = {
    fingerprint: args.key,
    tradeDate: args.tradeDate,
    instrument: args.instrument,
    session: args.session,
    activeCampaignId,
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
    nextTrigger: play.nextTrigger || args.deskState.nextTrigger || primaryLifecycle?.nextTrigger || primaryLifecycle?.requiredTrigger || null,
    invalidation: play.invalidation || args.deskState.invalidation || primaryLifecycle?.invalidation || null,
    standDown: scannerDeskPlayStandDownInstruction(args.deskState),
    readiness: primaryBias?.tradeReadiness?.status || null,
    tacticalCampaignFingerprint: scannerTacticalCampaignFingerprint(scannerTacticalCampaignMapFromDeskState({ deskState: args.deskState })),
    sentAt: args.sentAt,
  };
  return {
    ...recordWithoutFingerprint,
    mainPlayFingerprint: scannerDeskPlayMainPlayFingerprint({ record: recordWithoutFingerprint }),
  };
}

function scannerMorningHtfDeskMapKey(args: {
  tradeDate: string;
  instrument: Instrument;
}): string {
  return `${args.tradeDate}:${args.instrument}:morning:MORNING_HTF_DESK_MAP`;
}

function scannerHtfBiasEmoji(bias: string | null | undefined): string {
  const normalized = String(bias || '').toUpperCase();
  if (normalized === 'BULL') return '🐂';
  if (normalized === 'BEAR') return '🐻';
  if (normalized === 'RANGE') return '⚖️';
  return '▫️';
}

function scannerPrimaryDeskEmoji(primary: string | null | undefined): string {
  const normalized = String(primary || '').toUpperCase();
  if (normalized === 'LONG') return '🐂 LONG';
  if (normalized === 'SHORT') return '🐻 SHORT';
  return '🛑 WAIT';
}

function scannerHtfRowChangeSide(
  row: DeskState['primaryDeskPlay']['htfProtectedStructureMap']['rows'][number],
): string {
  const bias = String(row.currentBias || row.bias || '').toUpperCase();
  if (bias === 'BULL') return 'below';
  if (bias === 'BEAR') return 'above';
  return 'around';
}

function scannerHtfRowLine(
  row: DeskState['primaryDeskPlay']['htfProtectedStructureMap']['rows'][number],
): number | null {
  return roundNullableTradePrice(row.biasChangeLine) ??
    roundNullableTradePrice(row.confirmationLine) ??
    roundNullableTradePrice(row.protectedStructure);
}

function scannerHtfStructureLine(
  row: DeskState['primaryDeskPlay']['htfProtectedStructureMap']['rows'][number],
): string {
  const bias = String(row.currentBias || row.bias || 'UNKNOWN').toUpperCase();
  const line = scannerHtfRowLine(row);
  const confirmation = row.biasChangeConfirmation || 'completed close+hold';
  if (line === null) return `${scannerHtfBiasEmoji(bias)} ${row.timeframe}: ${bias} | change line unavailable`;
  return `${scannerHtfBiasEmoji(bias)} ${row.timeframe}: ${bias} | flips ${scannerHtfRowChangeSide(row)} ${line.toFixed(2)} on ${confirmation}`;
}

function scannerMorningHtfDeskMapKeyBattleArea(deskState: DeskState): string {
  const play = deskState.primaryDeskPlay;
  const fifteenMinute = play.htfProtectedStructureMap.rows.find((row) => row.timeframe === '15M') || null;
  const tactical = [
    roundNullableTradePrice(play.lineInSand),
    roundNullableTradePrice(play.longAbove),
    roundNullableTradePrice(play.shortBelow),
    fifteenMinute ? scannerHtfRowLine(fifteenMinute) : null,
  ].filter((value): value is number => value !== null);
  const unique = Array.from(new Set(tactical.map((value) => value.toFixed(2)))).map(Number);
  if (!unique.length) return 'N/A';
  if (unique.length === 1) return unique[0].toFixed(2);
  const low = Math.min(...unique);
  const high = Math.max(...unique);
  return `${low.toFixed(2)}-${high.toFixed(2)}`;
}

function scannerMorningHtfDeskMapFingerprint(args: {
  deskState: DeskState;
  keyBattleArea: string;
}): string {
  const play = args.deskState.primaryDeskPlay;
  const rowParts = play.htfProtectedStructureMap.rows.map((row) => [
    row.timeframe,
    row.currentBias || row.bias || 'UNKNOWN',
    deskPlanRefreshPrice(scannerHtfRowLine(row)),
  ].join('='));
  return [
    `primary=${play.direction}`,
    `keyBattle=${args.keyBattleArea}`,
    `htf=${rowParts.join(',')}`,
    `context=${args.deskState.htfContextStatus || 'unknown'}:${args.deskState.dataQualityStatus || 'unknown'}`,
  ].join('|');
}

function scannerMorningHtfDeskMapRecord(args: {
  tradeDate: string;
  instrument: Instrument;
  deskState: DeskState;
  latestCompleted5m?: string | null;
  sentAt: string;
}): ScannerMorningHtfDeskMapLedgerRecord {
  const keyBattleArea = scannerMorningHtfDeskMapKeyBattleArea(args.deskState);
  return {
    fingerprint: scannerMorningHtfDeskMapFingerprint({ deskState: args.deskState, keyBattleArea }),
    tradeDate: args.tradeDate,
    instrument: args.instrument,
    session: 'morning',
    primary: args.deskState.primaryDeskPlay.direction,
    latestCompleted5m: args.latestCompleted5m || null,
    keyBattleArea,
    sentAt: args.sentAt,
  };
}

export function shouldSendScannerMorningHtfDeskMap(args: {
  tradeDate: string;
  instrument: Instrument;
  session: LiveSession;
  completed5m: NinjaBridgeBar | null;
  barTimeZone: BridgeTimeZoneMode;
  sent: Record<string, ScannerMorningHtfDeskMapLedgerRecord>;
}): boolean {
  if (args.session !== 'morning') return false;
  if (!args.completed5m) return false;
  const parsed = parseBridgeTime(args.completed5m.time, args.barTimeZone);
  if (!parsed) return false;
  const minutes = toEtMinutes(parsed);
  if (minutes < 9 * 60 + 20 || minutes > 10 * 60) return false;
  return !args.sent[scannerMorningHtfDeskMapKey({ tradeDate: args.tradeDate, instrument: args.instrument })];
}

function scannerDeskPlaySuppressionPost(
  reason = 'Desk Play refresh is eligible for Discord.',
): ScannerDeskPlayDiscordSuppressionDecision {
  return {
    shouldPost: true,
    category: 'post',
    reason,
    previousFingerprint: null,
    changesTradingLogic: false,
    changesCanExecute: false,
  };
}

function scannerDeskPlaySuppressionBlocked(
  category: Exclude<ScannerDeskPlayDiscordSuppressionCategory, 'post'>,
  reason: string,
  previousFingerprint: string | null = null,
): ScannerDeskPlayDiscordSuppressionDecision {
  return {
    shouldPost: false,
    category,
    reason,
    previousFingerprint,
    changesTradingLogic: false,
    changesCanExecute: false,
  };
}

function scannerDeskPlayPrimaryLifecycle(deskState: DeskState): ScannerCandidateLifecycleTraceItem | null {
  const direction = deskState.primaryDeskPlay.direction;
  if (direction === 'LONG') return deskState.bestLongPlan;
  if (direction === 'SHORT') return deskState.bestShortPlan;
  return deskState.selectedCandidate;
}

function priceMateriallyEqual(a: number | null, b: number | null, tolerance = 0.01): boolean {
  if (a === null || b === null) return a === b;
  return Math.abs(a - b) <= tolerance;
}

function scannerDeskPlanRefreshMateriallyMatches(
  previous: ScannerDeskPlanRefreshLedgerRecord,
  current: ScannerDeskPlanRefreshLedgerRecord,
): boolean {
  if (previous.mainPlayFingerprint || current.mainPlayFingerprint) {
    return previous.mainPlayFingerprint === current.mainPlayFingerprint &&
      (previous.tacticalCampaignFingerprint || null) === (current.tacticalCampaignFingerprint || null);
  }
  return previous.activeCampaignId === current.activeCampaignId &&
    previous.direction === current.direction &&
    priceMateriallyEqual(previous.lineInSand, current.lineInSand) &&
    priceMateriallyEqual(previous.longLine, current.longLine) &&
    priceMateriallyEqual(previous.shortLine, current.shortLine) &&
    priceMateriallyEqual(previous.entry, current.entry) &&
    priceMateriallyEqual(previous.stop, current.stop) &&
    priceMateriallyEqual(previous.target1, current.target1) &&
    priceMateriallyEqual(previous.target2, current.target2) &&
    priceMateriallyEqual(previous.targetReactionLevel, current.targetReactionLevel) &&
    normalizeDeskPlayInstructionText(previous.nextTrigger) === normalizeDeskPlayInstructionText(current.nextTrigger) &&
    normalizeDeskPlayInstructionText(previous.invalidation) === normalizeDeskPlayInstructionText(current.invalidation) &&
    normalizeDeskPlayInstructionText(previous.standDown) === normalizeDeskPlayInstructionText(current.standDown) &&
    normalizeDeskPlayInstructionText(previous.readiness) === normalizeDeskPlayInstructionText(current.readiness);
}

function latestDeskPlanRefreshRecord(args: {
  sent: Record<string, ScannerDeskPlanRefreshLedgerRecord>;
  tradeDate: string;
  instrument: Instrument;
  session: string;
}): ScannerDeskPlanRefreshLedgerRecord | null {
  return Object.values(args.sent)
    .filter((record) =>
      record.tradeDate === args.tradeDate &&
      record.instrument === args.instrument &&
      record.session === args.session
    )
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())[0] || null;
}

function scannerDeskPlayStaleLevelReason(args: {
  deskState: DeskState;
  currentPrice: number | null;
}): string | null {
  const currentPrice = args.currentPrice;
  if (typeof currentPrice !== 'number' || !Number.isFinite(currentPrice)) return null;
  const direction = args.deskState.primaryDeskPlay.direction;
  if (direction !== 'LONG' && direction !== 'SHORT') return null;
  const primary = scannerDeskPlayPrimaryLifecycle(args.deskState);
  const line = args.deskState.primaryDeskPlay.lineInSand ?? primary?.lineInSand ?? null;
  const stop = primary?.stop ?? null;
  const target1 = primary?.target1 ?? null;
  const target2 = primary?.target2 ?? null;
  const reaction = args.deskState.primaryDeskPlay.targetReactionLevel ?? primary?.targetReactionLevel ?? null;
  const buffer = 0.25;

  if (direction === 'LONG') {
    if (typeof stop === 'number' && currentPrice <= stop + buffer) return `LONG review map invalidated: current price ${currentPrice.toFixed(2)} is at/below protected stop ${stop.toFixed(2)}.`;
    if (typeof line === 'number' && currentPrice < line - buffer) return `LONG review map invalidated: current price ${currentPrice.toFixed(2)} is back below line in the sand ${line.toFixed(2)}.`;
    if (typeof target2 === 'number' && currentPrice >= target2 - buffer) return `LONG review map kept local: current price ${currentPrice.toFixed(2)} already reached/passed T2 ${target2.toFixed(2)}.`;
    if (typeof target1 === 'number' && currentPrice >= target1 - buffer) return `LONG review map kept local: current price ${currentPrice.toFixed(2)} already reached/passed T1 ${target1.toFixed(2)}.`;
    if (typeof reaction === 'number' && currentPrice >= reaction - buffer) return `LONG review map kept local: current price ${currentPrice.toFixed(2)} already reached/passed reaction level ${reaction.toFixed(2)}.`;
  } else {
    if (typeof stop === 'number' && currentPrice >= stop - buffer) return `SHORT review map invalidated: current price ${currentPrice.toFixed(2)} is at/above protected stop ${stop.toFixed(2)}.`;
    if (typeof line === 'number' && currentPrice > line + buffer) return `SHORT review map invalidated: current price ${currentPrice.toFixed(2)} is back above line in the sand ${line.toFixed(2)}.`;
    if (typeof target2 === 'number' && currentPrice <= target2 + buffer) return `SHORT review map kept local: current price ${currentPrice.toFixed(2)} already reached/passed T2 ${target2.toFixed(2)}.`;
    if (typeof target1 === 'number' && currentPrice <= target1 + buffer) return `SHORT review map kept local: current price ${currentPrice.toFixed(2)} already reached/passed T1 ${target1.toFixed(2)}.`;
    if (typeof reaction === 'number' && currentPrice <= reaction + buffer) return `SHORT review map kept local: current price ${currentPrice.toFixed(2)} already reached/passed reaction level ${reaction.toFixed(2)}.`;
  }
  return null;
}

export function evaluateScannerDeskPlayDiscordSuppression(args: {
  tradeDate: string;
  instrument: Instrument;
  session: string;
  deskPlayKey: string;
  deskState: DeskState;
  deskPlanRefreshSent: Record<string, ScannerDeskPlanRefreshLedgerRecord>;
  currentPrice: number | null;
  latestCompleted5m?: string | null;
  staleReason?: string | null;
  now?: Date;
}): ScannerDeskPlayDiscordSuppressionDecision {
  if (args.staleReason && /already|stale|missed|no chase|passed|invalidated|reached/i.test(args.staleReason)) {
    return scannerDeskPlaySuppressionBlocked('missed_no_chase', `Desk Play kept local because the selected setup is missed/no-chase: ${args.staleReason}`);
  }
  if (args.deskState.canExecute) {
    return scannerDeskPlaySuppressionBlocked('low_quality_map', 'Desk Play refresh suppressed because executable approval should use the trade-alert path, not review-map Discord refresh.');
  }
  if (args.deskState.dataQualityStatus === 'data_limited') {
    return scannerDeskPlaySuppressionBlocked('stale_data', 'Desk Play suppressed because scanner DeskState is data-limited.');
  }
  if (args.deskState.htfContextStatus === 'insufficient') {
    return scannerDeskPlaySuppressionBlocked('low_quality_map', 'Desk Play suppressed because HTF context is insufficient for a trader-facing map.');
  }
  const play = args.deskState.primaryDeskPlay;
  if (play.direction === 'WAIT') {
    return scannerDeskPlaySuppressionBlocked('low_quality_map', 'Desk Play suppressed because no single primary side is confirmed; keep as internal watch/review only.');
  }
  const primaryBias = scannerDeskPlayPrimaryBias(args.deskState);
  const readiness = primaryBias?.tradeReadiness?.status || null;
  const tacticalCampaignMap = scannerTacticalCampaignMapFromDeskState({ deskState: args.deskState });
  if (primaryBias && primaryBias.state !== 'primary') {
    return scannerDeskPlaySuppressionBlocked('low_quality_map', `Desk Play suppressed because ${play.direction} is ${primaryBias.state}, not the primary actionable desk side.`);
  }
  if (readiness === 'data_limited' || readiness === 'blocked' || readiness === 'missed_no_chase') {
    return scannerDeskPlaySuppressionBlocked('low_quality_map', `Desk Play suppressed because ${play.direction} readiness is ${readiness}.`);
  }
  if (readiness === 'not_aligned' && !tacticalCampaignMap.eligible) {
    return scannerDeskPlaySuppressionBlocked('low_quality_map', `Desk Play suppressed because ${play.direction} readiness is ${readiness}: ${tacticalCampaignMap.reason}`);
  }
  const staleLevelReason = scannerDeskPlayStaleLevelReason({
    deskState: args.deskState,
    currentPrice: args.currentPrice,
  });
  if (staleLevelReason) {
    return scannerDeskPlaySuppressionBlocked('passed_or_invalidated_levels', staleLevelReason);
  }

  const currentRecord = scannerDeskPlanRefreshRecord({
    key: args.deskPlayKey,
    tradeDate: args.tradeDate,
    instrument: args.instrument,
    session: args.session,
    deskState: args.deskState,
    latestCompleted5m: args.latestCompleted5m,
    sentAt: (args.now || new Date()).toISOString(),
  });
  const previousRecord = latestDeskPlanRefreshRecord({
    sent: args.deskPlanRefreshSent,
    tradeDate: args.tradeDate,
    instrument: args.instrument,
    session: args.session,
  });
  if (previousRecord && scannerDeskPlanRefreshMateriallyMatches(previousRecord, currentRecord)) {
    return scannerDeskPlaySuppressionBlocked(
      'duplicate_refresh',
      'Desk Play suppressed because primary side, campaign, line, entry, stop, targets, and reaction level are unchanged from the latest posted Desk Play.',
      previousRecord.fingerprint,
    );
  }

  return scannerDeskPlaySuppressionPost(tacticalCampaignMap.eligible
    ? `Tactical campaign watch is eligible for Discord: ${tacticalCampaignMap.reason}`
    : 'Desk Play refresh is eligible for Discord.');
}

function scannerReversalWatchSuppressionPost(
  reason = 'Reversal watch is eligible for Discord.',
): ScannerReversalWatchDiscordSuppressionDecision {
  return {
    shouldPost: true,
    category: 'post',
    reason,
    previousFingerprint: null,
    changesTradingLogic: false,
    changesCanExecute: false,
  };
}

function scannerReversalWatchSuppressionBlocked(
  category: Exclude<ScannerReversalWatchDiscordSuppressionCategory, 'post'>,
  reason: string,
  previousFingerprint: string | null = null,
): ScannerReversalWatchDiscordSuppressionDecision {
  return {
    shouldPost: false,
    category,
    reason,
    previousFingerprint,
    changesTradingLogic: false,
    changesCanExecute: false,
  };
}

export function scannerReversalWatchKey(args: {
  tradeDate: string;
  instrument: Instrument;
  session: string;
  latestCompleted5m?: string | null;
  lines: ScannerReversalWatchLines;
  state: ScannerReversalWatchStateResult;
}): string {
  return [
    args.tradeDate,
    args.instrument,
    args.session,
    'REVERSAL_WATCH',
    args.latestCompleted5m || 'no-completed-5m',
    args.lines.exhaustedSide || 'no-exhausted-side',
    args.lines.watchDirection || 'no-watch-side',
    args.state.state,
  ].join(':');
}

function scannerReversalWatchFingerprint(args: {
  lines: ScannerReversalWatchLines;
  state: ScannerReversalWatchStateResult;
}): string {
  const lines = args.lines;
  const state = args.state;
  return [
    `eligible=${lines.eligible ? 'yes' : 'no'}`,
    `exhausted=${lines.exhaustedSide || 'none'}`,
    `watch=${lines.watchDirection || 'none'}`,
    `state=${state.state}`,
    `reaction=${deskPlanRefreshPrice(lines.reactionZoneLow)}-${deskPlanRefreshPrice(lines.reactionZoneHigh)}`,
    `trigger=${deskPlanRefreshPrice(lines.triggerLine)}`,
    `stronger=${deskPlanRefreshPrice(lines.strongerTriggerLine)}`,
    `invalid=${deskPlanRefreshPrice(lines.invalidLine)}`,
    `noChase=${deskPlanRefreshPrice(lines.noChaseLine)}`,
    `reclaim=${state.reclaimConfirmed ? 'yes' : 'no'}`,
    `retest=${state.retestHoldConfirmed ? 'yes' : 'no'}`,
  ].join('|');
}

export function scannerReversalWatchRecord(args: {
  tradeDate: string;
  instrument: Instrument;
  session: string;
  latestCompleted5m?: string | null;
  lines: ScannerReversalWatchLines;
  state: ScannerReversalWatchStateResult;
  sentAt: string;
}): ScannerReversalWatchLedgerRecord {
  return {
    fingerprint: scannerReversalWatchFingerprint({ lines: args.lines, state: args.state }),
    tradeDate: args.tradeDate,
    instrument: args.instrument,
    session: args.session,
    exhaustedSide: args.lines.exhaustedSide,
    watchDirection: args.lines.watchDirection,
    state: args.state.state,
    latestCompleted5m: args.latestCompleted5m || null,
    reactionZoneLow: args.lines.reactionZoneLow,
    reactionZoneHigh: args.lines.reactionZoneHigh,
    triggerLine: args.lines.triggerLine,
    strongerTriggerLine: args.lines.strongerTriggerLine,
    invalidLine: args.lines.invalidLine,
    noChaseLine: args.lines.noChaseLine,
    reclaimConfirmed: args.state.reclaimConfirmed,
    retestHoldConfirmed: args.state.retestHoldConfirmed,
    barsSinceReclaim: args.state.barsSinceReclaim,
    sentAt: args.sentAt,
  };
}

function latestReversalWatchRecord(args: {
  sent: Record<string, ScannerReversalWatchLedgerRecord>;
  tradeDate: string;
  instrument: Instrument;
  session: string;
  watchDirection: ScannerReversalWatchDirection | null;
}): ScannerReversalWatchLedgerRecord | null {
  return Object.values(args.sent || {})
    .filter((record) =>
      record.tradeDate === args.tradeDate &&
      record.instrument === args.instrument &&
      record.session === args.session &&
      record.watchDirection === args.watchDirection
    )
    .sort((a, b) => {
      const sentDelta = new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime();
      if (sentDelta !== 0) return sentDelta;
      return String(b.latestCompleted5m || '').localeCompare(String(a.latestCompleted5m || ''));
    })[0] || null;
}

export function evaluateScannerReversalWatchDiscordSuppression(args: {
  tradeDate: string;
  instrument: Instrument;
  session: string;
  latestCompleted5m?: string | null;
  lines: ScannerReversalWatchLines;
  state: ScannerReversalWatchStateResult;
  reversalWatchSent: Record<string, ScannerReversalWatchLedgerRecord>;
  staleReason?: string | null;
  now?: Date;
}): ScannerReversalWatchDiscordSuppressionDecision {
  if (args.staleReason && /stale|missing|invalid|data/i.test(args.staleReason)) {
    return scannerReversalWatchSuppressionBlocked('stale_data', `Reversal watch kept local because scanner data is not clean: ${args.staleReason}`);
  }
  if (!args.lines.eligible || !args.lines.watchDirection) {
    return scannerReversalWatchSuppressionBlocked('not_ready', `Reversal watch kept local: ${args.lines.reason}`);
  }
  if (args.state.state === 'unavailable') {
    return scannerReversalWatchSuppressionBlocked('not_ready', `Reversal watch kept local: ${args.state.reason}`);
  }
  if (args.state.state === 'forming') {
    return scannerReversalWatchSuppressionBlocked('forming', args.state.reason);
  }
  const previous = latestReversalWatchRecord({
    sent: args.reversalWatchSent,
    tradeDate: args.tradeDate,
    instrument: args.instrument,
    session: args.session,
    watchDirection: args.lines.watchDirection,
  });
  if (
    (args.state.state === 'invalidated' || args.state.state === 'no_chase' || args.state.state === 'stalled') &&
    previous?.state !== 'watch_active' &&
    previous?.state !== 'direction_validated'
  ) {
    return scannerReversalWatchSuppressionBlocked(
      'not_ready',
      `${args.state.state.replace(/_/g, ' ')} kept local because no active ${args.lines.watchDirection} reversal watch was previously posted.`,
      previous?.fingerprint || null,
    );
  }
  const current = scannerReversalWatchRecord({
    tradeDate: args.tradeDate,
    instrument: args.instrument,
    session: args.session,
    latestCompleted5m: args.latestCompleted5m,
    lines: args.lines,
    state: args.state,
    sentAt: (args.now || new Date()).toISOString(),
  });
  if (previous?.fingerprint === current.fingerprint) {
    return scannerReversalWatchSuppressionBlocked(
      'duplicate_refresh',
      'Reversal watch suppressed because side, state, trigger, invalidation, no-chase, and reaction zone are unchanged.',
      previous.fingerprint,
    );
  }
  return scannerReversalWatchSuppressionPost(args.state.reason);
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
    currentPrice: args.currentPrice,
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

function scannerDiscordLine(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : 'N/A';
}

export function buildScannerMorningHtfDeskMapPayload(args: {
  tradeDate: string;
  instrument: Instrument;
  deskState: DeskState;
  completed5m: NinjaBridgeBar | null;
  currentPrice: number | null;
}): DiscordWebhookPayload {
  const play = args.deskState.primaryDeskPlay;
  const primary = scannerPrimaryDeskEmoji(play.direction);
  const keyBattleArea = scannerMorningHtfDeskMapKeyBattleArea(args.deskState);
  const htfRows = play.htfProtectedStructureMap.rows
    .filter((row) => ['4H', '2H', '1H', '15M', '5M'].includes(row.timeframe))
    .sort((a, b) => {
      const order = ['4H', '2H', '1H', '15M', '5M'];
      return order.indexOf(a.timeframe) - order.indexOf(b.timeframe);
    });
  const longReadiness = play.longBias.tradeReadiness?.status || 'review';
  const shortReadiness = play.shortBias.tradeReadiness?.status || 'review';
  const htfStatus = args.deskState.htfContextStatus || 'unknown';
  const dataQuality = args.deskState.dataQualityStatus || 'unknown';
  const primaryReason = play.direction === 'WAIT'
    ? 'No single primary side is active. Wait for completed 5M proof and clean map alignment.'
    : `${play.direction} is the current desk map side, but execution still requires app-owned 5M trigger, stop, risk, target room, model, session, and canExecute gates.`;
  const tacticalMeaning = [
    `Macro read: ${htfStatus === 'sufficient' ? 'HTF context is sufficient for map reading.' : `HTF context status is ${htfStatus}; treat as context only if data-limited.`}`,
    `Long: ${longReadiness}.`,
    `Short: ${shortReadiness}.`,
    `Execution: no Discord map approves a trade; 5M remains execution authority.`,
  ].join('\n');
  const bottomLine = play.direction === 'WAIT'
    ? `Wait. Key battle area is ${keyBattleArea}. A completed close+hold through the tactical line improves one side; failure/rejection keeps the opposite side on review until the scanner-owned 5M gate confirms.`
    : `${play.direction} map is active around ${scannerDiscordLine(play.lineInSand)}. Do not chase; wait for completed 5M confirmation and app-owned canExecute.`;

  return {
    username: 'Quant Desk',
    content: `📊 ${args.instrument} Morning HTF Desk Map - ${args.tradeDate}`,
    embeds: [{
      title: `${args.instrument} Morning High Timeframe Desk Map - ${args.tradeDate}`,
      color: play.direction === 'LONG' ? 0x22c55e : play.direction === 'SHORT' ? 0xef4444 : 0xf97316,
      description: [
        `Primary: ${primary}`,
        `Current: ${scannerDiscordLine(args.currentPrice)}`,
        `Latest completed 5M: ${args.completed5m?.time || 'N/A'}`,
        `Key battle area: ${keyBattleArea}`,
        `Reason: ${primaryReason}`,
      ].join('\n'),
      fields: [
        {
          name: 'HTF Structure',
          value: htfRows.length ? htfRows.map(scannerHtfStructureLine).join('\n') : 'No scanner-owned HTF rows are available.',
          inline: false,
        },
        {
          name: 'Desk Read',
          value: tacticalMeaning,
          inline: false,
        },
        {
          name: 'Bottom Line',
          value: bottomLine,
          inline: false,
        },
      ],
      footer: { text: `Quant Desk • Morning HTF map only • Data ${dataQuality} • Not execution approval` },
      timestamp: new Date().toISOString(),
    }],
  };
}

function compactScannerDiscordText(value: string | null | undefined, max = 260): string {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return 'N/A';
  return text.length <= max ? text : `${text.slice(0, max - 3)}...`;
}

function buildScannerReversalWatchDiscordPayload(args: {
  tradeDate: string;
  instrument: Instrument;
  session: LiveSession;
  windowLabel: string;
  lines: ScannerReversalWatchLines;
  state: ScannerReversalWatchStateResult;
  currentPrice: number | null;
  chartMarkup: string | null;
  decisionTapePath: string;
}): DiscordWebhookPayload {
  const direction = args.lines.watchDirection || 'WAIT';
  const exhausted = args.lines.exhaustedSide || 'UNKNOWN';
  const reaction = args.lines.reactionZoneLow !== null && args.lines.reactionZoneHigh !== null
    ? `${scannerDiscordLine(args.lines.reactionZoneLow)}-${scannerDiscordLine(args.lines.reactionZoneHigh)}`
    : 'N/A';
  const directionLineLabel = direction === 'SHORT' ? 'SHORT BELOW' : direction === 'LONG' ? 'LONG ABOVE' : 'WATCH LINE';
  const status = args.state.state.replace(/_/g, ' ').toUpperCase();
  const title = `${args.instrument} Tactical Reversal Watch`;
  const content = `[${args.session.toUpperCase()} REVERSAL WATCH] ${args.instrument} - ${exhausted} EXHAUSTING / ${direction} WATCH | ${args.tradeDate}`;
  return {
    username: 'Quant Desk',
    content,
    embeds: [{
      title,
      color: args.state.state === 'direction_validated' ? 0x22c55e : args.state.state === 'watch_active' ? 0x38bdf8 : args.state.state === 'invalidated' ? 0xef4444 : 0xf97316,
      description: [
        `Primary: ${exhausted} campaign exhaustion / ${direction} reversal watch`,
        'Execution: NOT APPROVED - this is a completed 5M watch map only.',
        `Status: ${status}`,
        `Reaction zone: ${reaction}`,
        `${directionLineLabel}: ${scannerDiscordLine(args.lines.triggerLine)}`,
        `Invalid ${direction === 'LONG' ? 'below' : direction === 'SHORT' ? 'above' : 'at'}: ${scannerDiscordLine(args.lines.invalidLine)}`,
        `No chase ${direction === 'LONG' ? 'above' : direction === 'SHORT' ? 'below' : 'at'}: ${scannerDiscordLine(args.lines.noChaseLine)}`,
        `Current: ${scannerDiscordLine(args.currentPrice)}`,
      ].join('\n'),
      fields: [
        {
          name: '5M Trigger Rule',
          value: compactScannerDiscordText(args.lines.reclaimRule),
          inline: false,
        },
        {
          name: 'Retest / Hold Rule',
          value: compactScannerDiscordText(args.lines.retestRule),
          inline: false,
        },
        {
          name: 'Bottom Line',
          value: compactScannerDiscordText(`${args.state.reason} This does not change canExecute; app-owned 5M trigger, stop, risk, target room, model, and session gates still control execution approval.`),
          inline: false,
        },
        {
          name: 'Attachments',
          value: [
            args.chartMarkup ? 'Chart: attached tactical watch map.' : 'Chart: unavailable; using text map only.',
            args.decisionTapePath ? `Decision tape: ${args.decisionTapePath}` : 'Decision tape: N/A',
          ].join('\n'),
          inline: false,
        },
      ],
      footer: { text: 'Quant Desk • Tactical Reversal Watch • Not execution approval' },
      timestamp: new Date().toISOString(),
    }],
  };
}

export async function prepareLiveScannerReversalWatchAlertArtifacts(args: {
  session: LiveSession;
  tradeDate: string;
  config: Pick<ScannerConfig, 'instrument'>;
  chartContext: AnalysisResult['structuredChartContext'] | null | undefined;
  currentPrice: number | null;
  windowLabel: string;
  lines: ScannerReversalWatchLines;
  state: ScannerReversalWatchStateResult;
  decisionTapePath: string;
  outputDir?: string;
}): Promise<{
  payload: DiscordWebhookPayload;
  files: string[];
  chartMarkup: string | null;
}> {
  const chartMarkup = await renderReversalWatchChart({
    chartContext: args.chartContext || null,
    instrument: args.config.instrument,
    tradeDate: args.tradeDate,
    sessionLabel: args.session,
    currentPrice: args.currentPrice,
    lines: args.lines,
    state: args.state,
    outputDir: args.outputDir,
    filePrefix: `scanner-reversal-watch-${args.session}-${args.tradeDate}-${args.config.instrument}`,
  });
  const files = [chartMarkup].filter((file): file is string => Boolean(file));
  const payload = buildScannerReversalWatchDiscordPayload({
    tradeDate: args.tradeDate,
    instrument: args.config.instrument,
    session: args.session,
    windowLabel: args.windowLabel,
    lines: args.lines,
    state: args.state,
    currentPrice: args.currentPrice,
    chartMarkup,
    decisionTapePath: args.decisionTapePath,
  });
  validateDiscordPayload(payload, files);
  return { payload, files, chartMarkup };
}

interface ScannerDiscordPostReceipt {
  deliveryStatus: 'sent' | 'skipped';
  webhookSource: ScannerDiscordWebhookEnvKey | 'dry_run' | 'discord_disabled' | null;
  httpStatus: number | null;
  discordMessageId: string | null;
}

class ScannerDiscordPostError extends Error {
  httpStatus: number | null;
  webhookSource: ScannerDiscordWebhookEnvKey | null;

  constructor(message: string, args: { httpStatus?: number | null; webhookSource?: ScannerDiscordWebhookEnvKey | null } = {}) {
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
  if (!scannerDiscordCleanupKindIsTracked(args.kind)) return null;
  if (args.receipt.deliveryStatus !== 'sent' || !args.receipt.discordMessageId) return null;
  const now = args.now || new Date();
  const postedAt = now.toISOString();
  const expiresAt = scannerDiscordCleanupKindIsEphemeral(args.kind)
    ? new Date(now.getTime() + scannerDiscordMessageTtlMs(args.config)).toISOString()
    : '9999-12-31T23:59:59.999Z';
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

function scannerCurrentDeskPlanReplacementScope(deskPlanKey: string): string {
  const parts = deskPlanKey.split(':');
  return parts.length >= 2 ? parts.slice(0, 2).join(':') : deskPlanKey;
}

async function deleteScannerDiscordCleanupRecord(args: {
  config: ScannerConfig;
  record: ScannerDiscordCleanupRecord;
  state: ScannerStateFile;
  now: Date;
  replacedBy?: string | null;
  fetchImpl?: FetchLike;
}): Promise<'deleted' | 'skipped' | 'failed'> {
  const fetchImpl = args.fetchImpl || fetch;
  const webhook = resolveScannerDiscordWebhookUrlBySource(args.record.webhookSource);
  if (args.config.dryRun || !args.config.discordEnabled || !webhook.url) {
    args.state.discordCleanupMessages[args.record.key] = {
      ...args.record,
      deleteStatus: 'skipped',
      deletedAt: args.now.toISOString(),
      lastError: args.config.dryRun ? 'dry_run' : !args.config.discordEnabled ? 'discord_disabled' : 'scanner webhook not configured',
    };
    return 'skipped';
  }
  try {
    const response = await fetchImpl(scannerDiscordWebhookDeleteUrl(webhook.url, args.record.messageId), { method: 'DELETE' });
    if (!response.ok && response.status !== 404) {
      throw new Error(`Discord message delete failed (${response.status}): ${await response.text()}`);
    }
    args.state.discordCleanupMessages[args.record.key] = {
      ...args.record,
      deleteStatus: args.replacedBy ? 'replaced' : 'deleted',
      deletedAt: args.now.toISOString(),
      lastError: args.replacedBy ? `replaced_by:${args.replacedBy}` : null,
    };
    return 'deleted';
  } catch (error) {
    args.state.discordCleanupMessages[args.record.key] = {
      ...args.record,
      deleteStatus: 'failed',
      lastError: sanitizedError(error),
    };
    return 'failed';
  }
}

export async function replacePriorScannerDiscordCurrentDeskPlans(args: {
  config: ScannerConfig;
  state: ScannerStateFile;
  currentDeskPlanKey: string;
  now?: Date;
  fetchImpl?: FetchLike;
}): Promise<{ checked: number; deleted: number; failed: number; skipped: number; superseded: number }> {
  const now = args.now || new Date();
  const currentScope = scannerCurrentDeskPlanReplacementScope(args.currentDeskPlanKey);
  let checked = 0;
  let deleted = 0;
  let failed = 0;
  let skipped = 0;
  let superseded = 0;
  for (const record of Object.values(args.state.discordCleanupMessages || {})) {
    if (record.kind !== 'desk_play' || record.deleteStatus !== 'pending') continue;
    const recordKeyWithoutKindAndMessage = record.key
      .replace(/^desk_play:/, '')
      .replace(new RegExp(`:${record.messageId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '');
    const recordScope = scannerCurrentDeskPlanReplacementScope(recordKeyWithoutKindAndMessage);
    if (recordScope !== currentScope || recordKeyWithoutKindAndMessage === args.currentDeskPlanKey) continue;
    checked += 1;
    args.state.discordCleanupMessages[record.key] = {
      ...record,
      deleteStatus: 'superseded',
      deletedAt: null,
      lastError: `superseded_by:${args.currentDeskPlanKey};message_retained_for_outcome_lock`,
    };
    superseded += 1;
  }
  return { checked, deleted, failed, skipped, superseded };
}

export async function cleanupRecoveredScannerOperationalDiscordMessages(args: {
  config: ScannerConfig;
  state: ScannerStateFile;
  kinds?: ScannerDiscordCleanupKind[];
  now?: Date;
  fetchImpl?: FetchLike;
}): Promise<{ checked: number; deleted: number; failed: number; skipped: number }> {
  const now = args.now || new Date();
  const recoverableKinds = new Set(args.kinds || ['health', 'data_quality', 'window_start']);
  let checked = 0;
  let deleted = 0;
  let failed = 0;
  let skipped = 0;
  for (const record of Object.values(args.state.discordCleanupMessages || {})) {
    if (record.deleteStatus !== 'pending') continue;
    if (!recoverableKinds.has(record.kind)) continue;
    if (!scannerDiscordCleanupKindIsEphemeral(record.kind)) continue;
    checked += 1;
    const result = await deleteScannerDiscordCleanupRecord({
      config: args.config,
      state: args.state,
      record,
      now,
      fetchImpl: args.fetchImpl,
    });
    if (result === 'deleted') deleted += 1;
    else if (result === 'failed') failed += 1;
    else skipped += 1;
  }
  return { checked, deleted, failed, skipped };
}

export async function replacePriorScannerDiscordOperationalMessages(args: {
  config: ScannerConfig;
  state: ScannerStateFile;
  kind: ScannerDiscordCleanupKind;
  currentKey: string;
  now?: Date;
  fetchImpl?: FetchLike;
}): Promise<{ checked: number; deleted: number; failed: number; skipped: number }> {
  const now = args.now || new Date();
  if (!scannerDiscordCleanupKindIsEphemeral(args.kind)) return { checked: 0, deleted: 0, failed: 0, skipped: 0 };
  let checked = 0;
  let deleted = 0;
  let failed = 0;
  let skipped = 0;
  for (const record of Object.values(args.state.discordCleanupMessages || {})) {
    if (record.kind !== args.kind || record.deleteStatus !== 'pending') continue;
    const recordKeyWithoutKindAndMessage = record.key
      .replace(new RegExp(`^${args.kind}:`), '')
      .replace(new RegExp(`:${record.messageId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '');
    if (recordKeyWithoutKindAndMessage === args.currentKey) continue;
    checked += 1;
    const result = await deleteScannerDiscordCleanupRecord({
      config: args.config,
      state: args.state,
      record,
      now,
      replacedBy: args.currentKey,
      fetchImpl: args.fetchImpl,
    });
    if (result === 'deleted') deleted += 1;
    else if (result === 'failed') failed += 1;
    else skipped += 1;
  }
  return { checked, deleted, failed, skipped };
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
    const result = await deleteScannerDiscordCleanupRecord({
      config: args.config,
      state: args.state,
      record,
      now,
      fetchImpl,
    });
    if (result === 'deleted') {
      deleted += 1;
    } else if (result === 'failed') {
      failed += 1;
    } else {
      skipped += 1;
    }
  }
  return { checked, deleted, failed, skipped };
}

async function postDiscord(
  payload: DiscordWebhookPayload,
  config: ScannerConfig,
  files: string[] = [],
  webhookOverride?: ScannerWebhookResolution,
): Promise<ScannerDiscordPostReceipt> {
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
  const webhook = webhookOverride || resolveScannerDiscordWebhookUrl();
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
    if (currentStatus === 'READY') {
      const recoveryCleanup = await cleanupRecoveredScannerOperationalDiscordMessages({
        state: args.state,
        config: args.config,
        kinds: ['health', 'data_quality', 'window_start'],
      });
      if (recoveryCleanup.checked > 0) {
        console.log(`[scanner-health] Purged recovered operational Discord notices: deleted=${recoveryCleanup.deleted} failed=${recoveryCleanup.failed} skipped=${recoveryCleanup.skipped}`);
      }
    }
    const healthKey = `health:${currentStatus}`;
    const replaceResult = await replacePriorScannerDiscordOperationalMessages({
      state: args.state,
      config: args.config,
      kind: 'health',
      currentKey: healthKey,
    });
    if (replaceResult.checked > 0) {
      console.log(`[scanner-health] Replaced prior scanner health Discord notices: deleted=${replaceResult.deleted} failed=${replaceResult.failed} skipped=${replaceResult.skipped}`);
    }
    recordScannerDiscordCleanupMessage({
      state: args.state,
      config: args.config,
      receipt,
      kind: 'health',
      key: healthKey,
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
      : args.session === 'lunch'
        ? 'Lunch'
        : 'Evening';
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

function candidateReadinessStatus(deskState: DeskState, candidate?: SetupCandidate | null): string | null {
  const direction = candidate?.direction;
  const play = deskState.primaryDeskPlay;
  const bias = direction === 'LONG'
    ? play.longBias
    : direction === 'SHORT'
      ? play.shortBias
      : null;
  const readiness = bias && typeof bias === 'object' && 'tradeReadiness' in bias
    ? (bias as { tradeReadiness?: { status?: string | null } | null }).tradeReadiness
    : null;
  return readiness?.status || null;
}

export function evaluateScannerPrimaryAlertPublishingGate(args: {
  alertDecision: ScannerAlertDecision;
  deskState: DeskState;
  candidate?: SetupCandidate | null;
  normalizedCanExecute?: boolean | null;
  state: ScannerState;
  staleReason?: string | null;
  scannerReviewStatus?: string | null;
}): ScannerAlertDecision {
  if (!args.alertDecision.shouldSend) return args.alertDecision;

  const reasons: string[] = [];
  const play = args.deskState.primaryDeskPlay;
  const candidateDirection = args.candidate?.direction || null;
  const primaryDirection = play.direction;
  const readinessStatus = candidateReadinessStatus(args.deskState, args.candidate);
  const staleText = `${args.staleReason || ''} ${args.scannerReviewStatus || ''}`.trim();

  if (!args.normalizedCanExecute) reasons.push('canExecute=false');
  if (primaryDirection === 'WAIT') reasons.push('DeskState primary=WAIT');
  if (candidateDirection && primaryDirection !== 'WAIT' && candidateDirection !== primaryDirection) {
    reasons.push(`candidate side ${candidateDirection} conflicts with DeskState ${primaryDirection}`);
  }
  if (readinessStatus && readinessStatus !== 'ready' && readinessStatus !== 'aligned') {
    reasons.push(`readiness=${readinessStatus}`);
  }
  if (play.htfConflict) reasons.push('HTF/protected structure conflict');
  if (args.state === 'Missed') reasons.push('state=Missed');
  if (/stale|missed|no chase|already_triggered|no_fresh_entry/i.test(staleText)) {
    reasons.push('stale/no-chase review state');
  }

  if (!reasons.length) return args.alertDecision;

  return {
    shouldSend: false,
    reason: `Primary trade-card suppressed by DeskState/readiness gate: ${Array.from(new Set(reasons)).join('; ')}. Publish as Current Desk Plan/review map only if eligible.`,
  };
}

export function shouldSuppressScannerDataQualityNoticeForReason(args: {
  session: LiveSession | 'market_mapping';
  reason: string;
}): boolean {
  const reason = args.reason.replace(/\s+/g, ' ').trim();
  if (args.session !== 'evening') return false;
  if (!/DATA_NOT_READY: completed5m=ready\b/i.test(reason)) return false;
  const insufficientMatch = reason.match(/\binsufficient=([0-9a-z,\s]+?)(?:\.|\s+Real\b|\s+Boundary\b|$)/i);
  if (!insufficientMatch) return false;
  const insufficientTimeframes = insufficientMatch[1]
    .split(',')
    .map((timeframe) => timeframe.trim().toLowerCase())
    .filter(Boolean);
  return insufficientTimeframes.length > 0 &&
    insufficientTimeframes.every((timeframe) => timeframe === '15m' || timeframe === '60m' || timeframe === '120m' || timeframe === '240m');
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
  if (shouldSuppressScannerDataQualityNoticeForReason({ session: args.session, reason: args.reason })) {
    console.log(`[scanner-data] Data-quality notice kept local because evening HTF-only readiness is not a trader-facing Discord blocker while completed 5M is ready: ${args.reason}`);
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

  const webhook = resolveScannerOperationalDiscordWebhookUrl();
  if (!args.config.dryRun && !webhook.url) {
    console.warn(`[scanner-data] Discord data-quality notice skipped because scanner-health Discord webhook is not configured: ${noticeKey}`);
    return;
  }

  const payload = buildScannerDataQualityNoticePayload(args);
  try {
    const receipt = await postDiscord(payload, args.config, [], webhook);
    const replaceResult = await replacePriorScannerDiscordOperationalMessages({
      state: args.state,
      config: args.config,
      kind: 'data_quality',
      currentKey: noticeKey,
    });
    if (replaceResult.checked > 0) {
      console.log(`[scanner-data] Replaced prior scanner data-quality Discord notices: deleted=${replaceResult.deleted} failed=${replaceResult.failed} skipped=${replaceResult.skipped}`);
    }
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
  const sessionLabel = args.session === 'morning' ? 'Morning' : args.session === 'evening' ? 'Evening' : 'Lunch';
  const windowRange = args.session === 'morning'
    ? `${TRADE_RULES.executionWindows.morningExecution.startET}-${TRADE_RULES.executionWindows.morningExecution.endET} ET`
    : args.session === 'evening'
      ? `${TRADE_RULES.executionWindows.eveningExecution.startET}-${TRADE_RULES.executionWindows.eveningExecution.endET} ET`
    : `${TRADE_RULES.executionWindows.middayTrapReversal.startET}-${TRADE_RULES.executionWindows.middayTrapReversal.endET} ET`;
  const activeDeskPlanWindow = '09:15-16:00 ET and 18:45-22:15 ET';
  const fullSchedule = [
    '⏸️ Before 09:15 ET: scanner health only; execution paused',
    `🔎 ${TRADE_RULES.executionWindows.morningExecution.startET}-${TRADE_RULES.executionWindows.morningExecution.endET} ET: Morning execution scan`,
    `🍽️ ${TRADE_RULES.executionWindows.middayTrapReversal.startET}-${TRADE_RULES.executionWindows.middayTrapReversal.endET} ET: Lunch/PM execution scan`,
    `🌙 ${TRADE_RULES.executionWindows.eveningExecution.startET}-${TRADE_RULES.executionWindows.eveningExecution.endET} ET: Evening execution scan`,
    '⏸️ Outside those windows: scanner health only; execution paused',
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
  const replaceResult = await replacePriorScannerDiscordOperationalMessages({
    state: args.state,
    config: args.config,
    kind: 'window_start',
    currentKey: key,
  });
  if (replaceResult.checked > 0) {
    console.log(`[scanner] Replaced prior scanner window-start Discord notices: deleted=${replaceResult.deleted} failed=${replaceResult.failed} skipped=${replaceResult.skipped}`);
  }
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
      session: noticeSessionForWindow(window),
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
  if (shouldLogBridgeInstrumentResolution(instrumentResolution, config.bridgeInstrument)) {
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
        session: noticeSessionForWindow(window),
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
      session: noticeSessionForWindow(window),
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

  if (!window.allowsDeskPlan || !config.scanWindows) {
    const mappingState = scannerContextState(window);
    const mappingLabel = config.scanWindows ? scannerContextLogLabel(window) : 'Market Mapping Mode';
    if (!window.allowsMarketMapping) {
      console.log(
        `[scanner] ${mappingLabel}: ${mappingState}, market map refresh paused outside ${ACTIVE_MARKET_MAPPING_WINDOWS_TEXT} | current ${money(currentPrice)} | completed 5M ${completed5m?.time || 'N/A'} | positions ${positionText}`,
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
      const gateSummary = summarizePreMarketDataReadinessBackfillGate(gateResult.report);
      console.warn('[scanner-data] Setup scan blocked by Pre-Market Data Readiness + Backfill Gate. This is a data-quality blocker, not a no-setup conclusion.');
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
        reason: `${gateSummary} ${gateResult.report.sourceSummary}`,
        manualRun: config.once,
      });
      await writeState(state);
      return;
    }
  }

  const sameCompletedCandle = state.lastCompleted5mBySession[sessionKey] === completed5m.time;

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
  const setupSession = setupSessionForLiveSession(session);
  let normalized = buildAppTradePlan(analysis, { sessionType: setupSession, instrument: config.instrument, windowStatusOverride: 'active' });
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
      normalized = buildAppTradePlan(analysis, { sessionType: setupSession, instrument: config.instrument, windowStatusOverride: 'active' });
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
        campaignId: scannerActiveCampaignKeyForTradeDate(candidate, tradeDate),
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
  let visibilityMetadata = classifyScannerVisibility({
    state: stateForAlert,
    candidate,
    window,
    alertDecision,
    canExecute: Boolean(normalized.canExecute),
    staleReason: stale.reason,
  });
  let candidateLifecycleTrace = buildCandidateLifecycleTrace({
    candidates: normalized.setupCandidates || [],
    selectedCandidate: candidate,
    state: stateForAlert,
    window,
    alertDecision,
    canExecute: Boolean(normalized.canExecute),
    staleReason: stale.reason,
  });
  let deskState = buildDeskState({
    state: stateForAlert,
    candidate,
    visibilityMetadata,
    candidateLifecycleTrace,
    targetCascade,
    htfLiquidityDrawState: analysis.structuredChartContext?.htfLiquidityDrawState || null,
    currentPrice,
    canExecute: Boolean(normalized.canExecute),
  });
  const deskStateGatedAlertDecision = evaluateScannerPrimaryAlertPublishingGate({
    alertDecision,
    deskState,
    candidate,
    normalizedCanExecute: Boolean(normalized.canExecute),
    state: stateForAlert,
    staleReason: stale.reason,
    scannerReviewStatus: selection.reviewStatus,
  });
  if (deskStateGatedAlertDecision.shouldSend !== alertDecision.shouldSend || deskStateGatedAlertDecision.reason !== alertDecision.reason) {
    alertDecision = deskStateGatedAlertDecision;
    visibilityMetadata = classifyScannerVisibility({
      state: stateForAlert,
      candidate,
      window,
      alertDecision,
      canExecute: Boolean(normalized.canExecute),
      staleReason: stale.reason,
    });
    candidateLifecycleTrace = buildCandidateLifecycleTrace({
      candidates: normalized.setupCandidates || [],
      selectedCandidate: candidate,
      state: stateForAlert,
      window,
      alertDecision,
      canExecute: Boolean(normalized.canExecute),
      staleReason: stale.reason,
    });
    deskState = buildDeskState({
      state: stateForAlert,
      candidate,
      visibilityMetadata,
      candidateLifecycleTrace,
      targetCascade,
      htfLiquidityDrawState: analysis.structuredChartContext?.htfLiquidityDrawState || null,
      currentPrice,
      canExecute: Boolean(normalized.canExecute),
    });
  }
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

  if (window.allowsDiscordAlert && shouldSendScannerMorningHtfDeskMap({
    tradeDate,
    instrument: config.instrument,
    session,
    completed5m,
    barTimeZone: config.barTimeZone,
    sent: state.morningHtfDeskMapSent,
  })) {
    const morningMapKey = scannerMorningHtfDeskMapKey({ tradeDate, instrument: config.instrument });
    try {
      const payload = buildScannerMorningHtfDeskMapPayload({
        tradeDate,
        instrument: config.instrument,
        deskState,
        completed5m,
        currentPrice,
      });
      const receipt = await postDiscord(payload, config);
      if (receipt.deliveryStatus === 'sent') {
        const sentAt = new Date().toISOString();
        state.morningHtfDeskMapSent[morningMapKey] = scannerMorningHtfDeskMapRecord({
          tradeDate,
          instrument: config.instrument,
          deskState,
          latestCompleted5m: completed5m.time,
          sentAt,
        });
        await writeScannerDiscordReceiptAuditLog({
          kind: 'morning_htf_desk_map',
          key: morningMapKey,
          planVersionId: `${planVersionId}-MORNING-HTF-DESK-MAP`,
          tradeDate,
          instrument: config.instrument,
          session,
          receipt,
          postedAt: sentAt,
          cleanupRecordKey: null,
          ragReceiptAttached: false,
        });
        console.log(`[scanner] Sent Morning HTF Desk Map: ${morningMapKey}`);
      } else {
        console.log(`[scanner] Morning HTF Desk Map skipped (${receipt.webhookSource || 'unknown'}): ${morningMapKey}`);
      }
    } catch (error) {
      console.warn(`[scanner] Morning HTF Desk Map delivery failed safely; scanner will continue evaluating watch and trade alerts: ${sanitizedError(error)}`);
    }
  }

  let reversalWatchPosted = false;
  if (!alertDecision.shouldSend && window.allowsDiscordAlert) {
    const reversalWatchLines = buildScannerReversalWatchLines({
      deskState,
      completed5m,
      currentPrice,
    });
    const reversalWatchState = classifyScannerReversalWatchState({
      lines: reversalWatchLines,
      completed5m,
      completed5mHistory: scannerCompletedBarsFromChartContext(analysis.structuredChartContext || null),
      currentPrice,
    });
    const reversalWatchKey = scannerReversalWatchKey({
      tradeDate,
      instrument: config.instrument,
      session: window.session,
      latestCompleted5m: completed5m.time,
      lines: reversalWatchLines,
      state: reversalWatchState,
    });
    const reversalWatchSuppression = evaluateScannerReversalWatchDiscordSuppression({
      tradeDate,
      instrument: config.instrument,
      session: window.session,
      latestCompleted5m: completed5m.time,
      lines: reversalWatchLines,
      state: reversalWatchState,
      reversalWatchSent: state.reversalWatchSent,
      staleReason: stale.reason,
    });
    if (!reversalWatchSuppression.shouldPost) {
      console.log(`[scanner] Reversal watch suppressed (${reversalWatchSuppression.category}): ${reversalWatchSuppression.reason}${reversalWatchSuppression.previousFingerprint ? ` | previous=${reversalWatchSuppression.previousFingerprint}` : ''}`);
    } else if (!state.reversalWatchSent[reversalWatchKey]) {
      try {
        const reversalArtifacts = await prepareLiveScannerReversalWatchAlertArtifacts({
          session,
          tradeDate,
          config,
          chartContext: analysis.structuredChartContext || null,
          currentPrice,
          windowLabel: window.label,
          lines: reversalWatchLines,
          state: reversalWatchState,
          decisionTapePath,
        });
        const receipt = await postDiscord(reversalArtifacts.payload, config, reversalArtifacts.files);
        if (receipt.deliveryStatus === 'sent') {
          const sentAt = new Date().toISOString();
          state.reversalWatchSent[reversalWatchKey] = scannerReversalWatchRecord({
            tradeDate,
            instrument: config.instrument,
            session: window.session,
            latestCompleted5m: completed5m.time,
            lines: reversalWatchLines,
            state: reversalWatchState,
            sentAt,
          });
          state.sent[reversalWatchKey] = { state: stateForAlert, confidence: confidence.score, sentAt };
          await writeScannerDiscordReceiptAuditLog({
            kind: 'reversal_watch',
            key: reversalWatchKey,
            planVersionId: `${planVersionId}-REVERSAL-WATCH`,
            tradeDate,
            instrument: config.instrument,
            session,
            receipt,
            postedAt: sentAt,
            cleanupRecordKey: null,
            ragReceiptAttached: false,
          });
          reversalWatchPosted = true;
          console.log(`[scanner] Sent Reversal Watch update: ${reversalWatchKey}`);
        } else {
          console.log(`[scanner] Reversal Watch update skipped (${receipt.webhookSource || 'unknown'}): ${reversalWatchKey}`);
        }
      } catch (error) {
        console.warn(`[scanner] Reversal Watch delivery failed safely; scanner will continue evaluating Desk Play/trade alerts: ${sanitizedError(error)}`);
      }
    } else {
      console.log(`[scanner] Reversal Watch already sent for ${reversalWatchKey}.`);
    }
  }

  if (!reversalWatchPosted && !alertDecision.shouldSend && window.allowsDiscordAlert && deskState.primaryDeskPlay.discordEligible) {
    const deskPlayKey = scannerDeskPlanRefreshKey({
      tradeDate,
      instrument: config.instrument,
      session: window.session,
      deskState,
      latestCompleted5m: completed5m.time,
    });
    const deskPlaySuppression = evaluateScannerDeskPlayDiscordSuppression({
      tradeDate,
      instrument: config.instrument,
      session: window.session,
      deskPlayKey,
      deskState,
      deskPlanRefreshSent: state.deskPlanRefreshSent,
      currentPrice,
      latestCompleted5m: completed5m.time,
      staleReason: stale.reason,
    });
    if (!deskPlaySuppression.shouldPost) {
      console.log(`[scanner] Desk Play refresh suppressed (${deskPlaySuppression.category}): ${deskPlaySuppression.reason}${deskPlaySuppression.previousFingerprint ? ` | previous=${deskPlaySuppression.previousFingerprint}` : ''}`);
    } else if (!state.deskPlanRefreshSent[deskPlayKey]) {
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
          const replaceResult = await replacePriorScannerDiscordCurrentDeskPlans({
            state,
            config,
            currentDeskPlanKey: deskPlayKey,
            now: new Date(sentAt),
          });
          if (replaceResult.checked > 0) {
            console.log(`[scanner] Superseded prior current Desk Plan messages without deleting Discord cards: superseded=${replaceResult.superseded} deleted=${replaceResult.deleted} failed=${replaceResult.failed} skipped=${replaceResult.skipped}`);
          }
          const recoveredOperational = await cleanupRecoveredScannerOperationalDiscordMessages({
            state,
            config,
            kinds: ['health', 'data_quality', 'window_start'],
            now: new Date(sentAt),
          });
          if (recoveredOperational.checked > 0) {
            console.log(`[scanner] Purged recovered operational Discord notices after Desk Plan send: deleted=${recoveredOperational.deleted} failed=${recoveredOperational.failed} skipped=${recoveredOperational.skipped}`);
          }
          const cleanupRecord = recordScannerDiscordCleanupMessage({
            state,
            config,
            receipt,
            kind: 'desk_play',
            key: deskPlayKey,
          });
          let ragReceiptAttached = false;
          if (shouldPersistScannerAlertToRag(deskState)) {
            ragReceiptAttached = await attachDiscordMessageReceiptToRagRecord({
              planVersionId: deskPlayPlanVersionId,
              discordMessageId: receipt.discordMessageId,
              webhookSource: receipt.webhookSource,
            });
          }
          await writeScannerDiscordReceiptAuditLog({
            kind: 'desk_play',
            key: deskPlayKey,
            planVersionId: deskPlayPlanVersionId,
            tradeDate,
            instrument: config.instrument,
            session,
            receipt,
            postedAt: sentAt,
            cleanupRecordKey: cleanupRecord?.key || null,
            ragReceiptAttached,
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
        const recoveredOperational = await cleanupRecoveredScannerOperationalDiscordMessages({
          state,
          config,
          kinds: ['health', 'data_quality', 'window_start'],
          now: new Date(sentAt),
        });
        if (recoveredOperational.checked > 0) {
          console.log(`[scanner] Purged recovered operational Discord notices after trade alert send: deleted=${recoveredOperational.deleted} failed=${recoveredOperational.failed} skipped=${recoveredOperational.skipped}`);
        }
        const cleanupRecord = recordScannerDiscordCleanupMessage({
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
        let ragReceiptAttached = false;
        if (shouldPersistScannerAlertToRag(deskState)) {
          ragReceiptAttached = await attachDiscordMessageReceiptToRagRecord({
            planVersionId,
            discordMessageId: receipt.discordMessageId,
            webhookSource: receipt.webhookSource,
          });
        }
        await writeScannerDiscordReceiptAuditLog({
          kind: 'trade_alert',
          key: alertKey,
          planVersionId,
          tradeDate,
          instrument: config.instrument,
          session,
          receipt,
          postedAt: sentAt,
          cleanupRecordKey: cleanupRecord?.key || null,
          ragReceiptAttached,
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
