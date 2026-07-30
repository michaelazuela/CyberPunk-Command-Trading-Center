import dotenv from 'dotenv';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readRuntimeJson, writeRuntimeJsonAtomic } from '../runtimeJson';
import { buildAppTradePlan } from '../../src/lib/planEngine';
import { getEffectiveCanExecute } from '../../src/lib/effectiveExecution';
import { createPlanVersionId } from '../../src/lib/planMetadata';
import { buildTradeJournalRecord } from '../../src/lib/tradeJournal';
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
  buildDeskPublishDecision,
  buildDeskState,
  buildTargetCascade,
  buildTradeDecisionMapAudit,
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
  type DeskPublishDecision,
  type ScannerState,
  type ScannerThresholds,
  type ScannerVisibilityMetadata,
  type TargetCascadeResult,
  type TradeDecisionMapAudit,
} from '../../src/lib/localScannerEngine';
import {
  evaluateLiveDiscordPostEligibility,
  type LiveDiscordEligibilityReport,
} from '../../src/lib/liveDiscordPostEligibility';
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
  TradeDecisionStatus,
  type AnalysisResult,
  type ChartContext,
  type DecisionQualityScoreItem,
  type FailedBreakEventFact,
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
  type MarketBarsUpsertResult,
  type MarketBarTimeframe,
} from './market-data-store';
import {
  barsMatchRequestedTimeframe,
  isSundayEveningHtfReopenLagCovered,
  latestOpenTimestampCoverageToleranceMs,
  marketDataSourceFromCounts,
  mergeMarketDataBars,
  repairMarketDataBarsWithinBaseRange,
  verifyMarketDataWindow,
  type MarketDataWindowVerification,
  type MarketDataWindowSource,
} from './market-data-ingestion';
import { applyNewsMacroCaution, loadMacroCalendarConfig } from './macro-calendar';
import { renderChartMarkup, renderPriceLevelMap, renderReversalWatchChart } from './chart-markup-renderer';
import { buildDiscordTradePlanVisualProvenance } from './discord-visual-contract';
import {
  buildCanonicalTraderTicket,
  compactDiscordSummary,
  flattenDiscordPayloadText,
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
  buildWatchFeedbackComponents,
  discordWebhookUrlForPayload,
  loadCanonicalDiscordOutcomeSecretFromEnvLocal,
} from './discord-outcome-buttons';
import {
  PROFESSIONAL_MODEL_ONE_LABEL,
  PROFESSIONAL_MODEL_TWO_LABEL,
  professionalizeReportText,
} from './professional-report-language';
import {
  buildRolloverAwareContractLegs,
  resolveCurrentBridgeInstrument,
  type BridgeContractLeg,
  type BridgeInstrumentResolution,
} from './bridge-instrument-resolver';
import { readCliArgValue } from './cli-args';
import { etDateTime } from './et-time';
import { readQuantDeskMaintenanceStatus } from './quant-desk-maintenance';
import { isGeminiAdvisoryFallbackEnabled } from '../../src/config/geminiFallback';
import {
  isUnifiedDeskOutputApprovedProductionModel,
  type UnifiedDeskOutputProductionScannerSurfaceActivation,
} from '../../src/lib/unifiedDeskOutputProductionScannerSurface';
import {
  APPROVED_DESK_MODEL_DEFINITIONS,
} from '../../src/config/approvedDeskModels';
import type { FiveModelProductionScannerSurfaceActivation } from '../../src/lib/fiveModelProductionScannerSurface';
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
  verboseDiscordPayloadLog?: boolean;
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
  liveDiscordPolicyConfirmed?: boolean;
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
  endOfDayMarketRecapSent: Record<string, ScannerEndOfDayMarketRecapLedgerRecord>;
  liveHoldNoticeSent: Record<string, string>;
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
export type ScannerDiscordCleanupKind = 'trade_alert' | 'desk_play' | 'reversal_watch' | 'session_htf_desk_map' | 'end_of_day_market_recap' | 'watchlist' | 'window_start' | 'health' | 'data_quality' | 'live_hold_notice';
export type ScannerDiscordDeliverySource = ScannerDiscordWebhookEnvKey | 'dry_run' | 'discord_disabled' | 'phase11_boundary' | null;

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
  'live_hold_notice',
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
  publicActionFingerprint?: string | null;
  publicActionComplete?: boolean;
}

export interface ScannerDeskPlanRefreshLedgerRecord {
  fingerprint: string;
  tradeDate: string;
  instrument: Instrument;
  session: string;
  activeCampaignId: string | null;
  setupType?: string | null;
  scenarioLabel?: string | null;
  direction: string;
  latestCompleted5m: string | null;
  lineInSand: number | null;
  activeTacticalLine: number | null;
  activeTacticalZoneLow?: number | null;
  activeTacticalZoneHigh?: number | null;
  activeTacticalZoneState?: string | null;
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
  materialCadenceFingerprint?: string | null;
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
  materialCadenceFingerprint?: string | null;
  sentAt: string;
}

export interface ScannerMorningHtfDeskMapLedgerRecord {
  fingerprint: string;
  tradeDate: string;
  instrument: Instrument;
  session: LiveSession | string;
  primary: string;
  latestCompleted5m: string | null;
  keyBattleArea: string;
  sentAt: string;
}

export interface ScannerEndOfDayMarketRecapLedgerRecord {
  fingerprint: string;
  tradeDate: string;
  instrument: Instrument;
  latestCompleted5m: string | null;
  rthRange: string;
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

const SCANNER_DESK_PLAY_PUBLIC_REFRESH_MINUTES = 20;

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
  contextTimeframes: string[];
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

export interface ScannerSniperTriggerWatchMetadata {
  label: 'Line-in-the-Sand Sniper Watch';
  eligible: boolean;
  status: 'research_only_discretionary';
  direction: 'LONG' | 'SHORT' | null;
  lineInSand: number | null;
  referenceEntry: number | null;
  referenceStop: number | null;
  referenceTarget1: number | null;
  referenceTarget2: number | null;
  oneMinuteTimingRule: string;
  fiveMinuteConfirmationRule: string;
  reason: string;
  approvalBoundary: {
    changesTradeApprovals: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRiskRules: false;
    createsNewModel: false;
    oneMinuteApprovesExecution: false;
  };
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
  referenceEntry: number | null;
  referenceStop: number | null;
  referenceTarget1: number | null;
  referenceTarget2: number | null;
  referenceReason: string | null;
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
  webhookSource: ScannerDiscordDeliverySource;
  httpStatus: number | null;
  discordMessageId: string | null;
  error: string | null;
  attemptedAt: string;
  sentAt: string | null;
  auditLogPath: string | null;
  stale: boolean;
  retryEligible: boolean;
}

export interface ScannerDiscordCampaignTransitionReview {
  blocksOppositeDirection: boolean;
  reason: string | null;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_FILE = path.join(__dirname, '.nt-scanner-state.json');
const DISCORD_AUDIT_DIR = path.join(__dirname, 'discord-audit');
const MARKET_DATA_GAP_FALLBACK_LEDGER = path.join(__dirname, '.market-data-gap-events.json');
const UNIFIED_DESK_OUTPUT_PRODUCTION_SURFACE_FILE = path.join(__dirname, '.unified-desk-output-production-scanner-surface.json');
const UNIFIED_DESK_OUTPUT_PRODUCTION_READBACK_FILE = path.join(__dirname, 'diagnostic-reports', 'unified-desk-output-production-scanner-readback.json');
const FIVE_MODEL_PRODUCTION_SURFACE_FILE = path.join(__dirname, '.five-model-production-scanner-surface.json');
const FIVE_MODEL_PRODUCTION_READBACK_FILE = path.join(__dirname, 'diagnostic-reports', 'five-model-production-scanner-readback.json');
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
const SCANNER_NEAR_DUPLICATE_TRADE_ALERT_WINDOW_MS = 5 * 60 * 1000;
const SCANNER_NEAR_DUPLICATE_TRADE_ALERT_ENTRY_DRIFT_POINTS = 2;

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
  fiveMinuteAggregationRepairBars?: number;
  contractLegs?: string[];
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
  candidatePromotionBoundary: 'htf_context_required_for_raid_reclaim_reversal';
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

function scannerImplicitCampaignKey(candidate: SetupCandidate | null | undefined, session?: string | null): string | null {
  const direction = candidate?.direction === 'LONG' || candidate?.direction === 'SHORT'
    ? candidate.direction
    : null;
  const setupType = typeof candidate?.setupType === 'string' && candidate.setupType.trim()
    ? candidate.setupType.trim()
    : null;
  if (!direction || !setupType) return null;
  if (
    !isFiniteTradePrice(candidate?.entry) ||
    !isFiniteTradePrice(candidate?.stop) ||
    !isFiniteTradePrice(candidate?.target1) ||
    !isFiniteTradePrice(candidate?.target2)
  ) {
    return null;
  }
  const sessionKey = typeof session === 'string' && session.trim() ? session.trim() : 'session_unknown';
  return `implicit-session-campaign:${sessionKey}:${setupType}:${direction}`;
}

export function scannerActiveCampaignKeyForTradeDate(
  candidate: SetupCandidate | null | undefined,
  tradeDate: string,
  session?: string | null,
): string | null {
  const campaignId = scannerActiveCampaignKey(candidate) || scannerImplicitCampaignKey(candidate, session);
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

function activeCampaignPublicActionFingerprint(candidate?: SetupCandidate | null): string | null {
  const direction = candidate?.direction === 'LONG' || candidate?.direction === 'SHORT'
    ? candidate.direction
    : null;
  if (!direction) return null;
  const entry = isFiniteTradePrice(candidate?.entry) ? roundToTradeTick(candidate.entry) : null;
  const stop = isFiniteTradePrice(candidate?.stop) ? roundToTradeTick(candidate.stop) : null;
  const target1 = isFiniteTradePrice(candidate?.target1) ? roundToTradeTick(candidate.target1) : null;
  const target2 = isFiniteTradePrice(candidate?.target2) ? roundToTradeTick(candidate.target2) : null;
  if (entry === null || stop === null || target1 === null || target2 === null) return null;
  const line = isFiniteTradePrice(candidate?.activeCampaign?.obstacleMap?.lineInSand)
    ? roundToTradeTick(candidate.activeCampaign.obstacleMap.lineInSand)
    : null;
  return [
    direction,
    candidate?.setupType || 'UNKNOWN_SETUP',
    candidate?.executionStatus || 'UNKNOWN_STATUS',
    line === null ? 'line:N/A' : `line:${line.toFixed(2)}`,
    `entry:${entry.toFixed(2)}`,
    `stop:${stop.toFixed(2)}`,
    `t1:${target1.toFixed(2)}`,
    `t2:${target2.toFixed(2)}`,
  ].join('|');
}

function activeCampaignMaterialUpdateAllowed(args: {
  candidate?: SetupCandidate | null;
  previousFingerprint?: string | null;
  campaignId?: string | null;
}): boolean {
  if (args.campaignId?.includes(':implicit-session-campaign:')) return false;
  const currentFingerprint = activeCampaignPublicActionFingerprint(args.candidate);
  return Boolean(currentFingerprint && args.previousFingerprint && currentFingerprint !== args.previousFingerprint);
}

export function shouldSuppressActiveCampaignScannerAlert(args: {
  activeCampaignSent?: Record<string, ScannerActiveCampaignLedgerRecord>;
  candidate?: SetupCandidate | null;
  tradeDate?: string;
  session?: string | null;
}): {
  shouldSuppress: boolean;
  campaignId: string | null;
  reason: string | null;
  record: ScannerActiveCampaignLedgerRecord | null;
} {
  const campaignId = args.tradeDate
    ? scannerActiveCampaignKeyForTradeDate(args.candidate, args.tradeDate, args.session)
    : scannerActiveCampaignKey(args.candidate);
  if (!campaignId) {
    return { shouldSuppress: false, campaignId: null, reason: null, record: null };
  }
  const record = args.activeCampaignSent?.[campaignId] || null;
  if (!record) {
    return { shouldSuppress: false, campaignId, reason: null, record: null };
  }
  if (activeCampaignMaterialUpdateAllowed({
    candidate: args.candidate,
    previousFingerprint: record.publicActionFingerprint || null,
    campaignId,
  })) {
    return {
      shouldSuppress: false,
      campaignId,
      record,
      reason: `ActiveCampaign material update allowed for ${campaignId}: new complete entry/stop/T1/T2 differs from prior public action.`,
    };
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
  session?: string | null;
  state: ScannerState;
  confidence: number;
  alertKey: string;
  sentAt?: string;
}): void {
  const campaignId = scannerActiveCampaignKeyForTradeDate(args.candidate, args.tradeDate, args.session);
  if (!campaignId) return;
  const sentAt = args.sentAt || new Date().toISOString();
  const previous = args.activeCampaignSent[campaignId];
  const publicActionFingerprint = activeCampaignPublicActionFingerprint(args.candidate);
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
    publicActionFingerprint,
    publicActionComplete: Boolean(publicActionFingerprint),
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

const ACTIVE_CAMPAIGN_PENDING_CLAIM_STALE_MS = 10 * 60 * 1000;

function timestampMs(value: unknown): number | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isStalePendingActiveCampaignClaim(existing: any, nowMs = Date.now()): boolean {
  const status = typeof existing?.delivery_status === 'string' ? existing.delivery_status : 'pending';
  if (status !== 'pending') return false;
  if (timestampMs(existing?.first_sent_at) !== null) return false;
  const claimedAt = timestampMs(existing?.first_claimed_at)
    ?? timestampMs(existing?.created_at)
    ?? timestampMs(existing?.updated_at);
  if (claimedAt === null) return false;
  return nowMs - claimedAt >= ACTIVE_CAMPAIGN_PENDING_CLAIM_STALE_MS;
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
  const publicActionFingerprint = activeCampaignPublicActionFingerprint(args.candidate);
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
      publicActionFingerprint,
      publicActionComplete: Boolean(publicActionFingerprint),
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
  const campaignId = scannerActiveCampaignKeyForTradeDate(args.candidate, args.tradeDate, args.session);
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
  const existingMetadata = existing?.metadata && typeof existing.metadata === 'object' ? existing.metadata : {};
  const previousPublicActionFingerprint = typeof existingMetadata.publicActionFingerprint === 'string'
    ? existingMetadata.publicActionFingerprint
    : null;
  const currentPublicActionFingerprint = activeCampaignPublicActionFingerprint(args.candidate);
  if (
    status === 'sent' &&
    !campaignId.includes(':implicit-session-campaign:') &&
    currentPublicActionFingerprint &&
    previousPublicActionFingerprint &&
    currentPublicActionFingerprint !== previousPublicActionFingerprint
  ) {
    await patchScannerActiveCampaignLedger({
      config: args.config,
      campaignId,
      fetchImpl,
      patch: {
        ...row,
        delivery_status: 'pending',
        first_claimed_at: new Date().toISOString(),
        metadata: {
          ...existingMetadata,
          ...(row.metadata && typeof row.metadata === 'object' ? row.metadata : {}),
          priorPublicActionFingerprint: previousPublicActionFingerprint,
          campaignUpdateReason: 'material_public_action_update',
          campaignUpdateFromAlertKey: existing?.alert_key || null,
          campaignUpdateFromPlanVersionId: existing?.plan_version_id || null,
        },
      },
    });
    return {
      source: 'supabase',
      claimed: true,
      shouldSuppress: false,
      campaignId,
      reason: `ActiveCampaign durable ledger accepted material campaign update for ${campaignId}: new complete entry/stop/T1/T2 differs from prior public action.`,
      durableAvailable: true,
    };
  }
  if (status === 'failed' || status === 'skipped' || status === 'released' || isStalePendingActiveCampaignClaim(existing)) {
    await patchScannerActiveCampaignLedger({
      config: args.config,
      campaignId,
      fetchImpl,
      patch: {
        ...row,
        delivery_status: 'pending',
        first_claimed_at: new Date().toISOString(),
        metadata: {
          ...existingMetadata,
          ...(row.metadata && typeof row.metadata === 'object' ? row.metadata : {}),
          reclaimedFromDeliveryStatus: status,
          reclaimedReason: status === 'pending'
            ? 'stale_pending_without_first_sent_at'
            : `prior_${status}_delivery`,
        },
      },
    });
    return {
      source: 'supabase',
      claimed: true,
      shouldSuppress: false,
      campaignId,
      reason: status === 'pending'
        ? `ActiveCampaign durable ledger reclaimed ${campaignId} after stale pending claim with no sent timestamp.`
        : `ActiveCampaign durable ledger reclaimed ${campaignId} after prior ${status} delivery.`,
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
  webhookSource: ScannerDiscordDeliverySource;
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
  args: { reason: string; webhookSource: 'dry_run' | 'discord_disabled' | 'phase11_boundary' },
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
  return readCliArgValue(process.argv, name);
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
    '  --verbose-discord-payload-log true  Print full dry-run Discord JSON payloads. Defaults to compact operator lines.',
    '  --live-discord-policy-confirmed  Confirms Phase 11A dry-scan/replay checklist before live scanner trade/DeskState posts.',
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
  const liveDiscordPolicyConfirmed = hasArg('live-discord-policy-confirmed') || boolEnv('QUANT_DESK_LIVE_DISCORD_POLICY_CONFIRMED', false);
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
    verboseDiscordPayloadLog: boolArg('verbose-discord-payload-log', boolEnv('SCANNER_VERBOSE_DISCORD_PAYLOAD_LOG', false)),
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
    liveDiscordPolicyConfirmed,
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
    endOfDayMarketRecapSent: {},
    liveHoldNoticeSent: {},
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
  const result = await readRuntimeJson<Partial<ScannerStateFile>>(STATE_FILE);
  const parsed = result.value;
  if (parsed) {
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
        endOfDayMarketRecapSent: parsed.endOfDayMarketRecapSent || {},
        liveHoldNoticeSent: parsed.liveHoldNoticeSent || {},
        windowStartSent: parsed.windowStartSent || {},
        dataQualityNoticeSent: parsed.dataQualityNoticeSent || {},
        discordCleanupMessages: parsed.discordCleanupMessages || {},
        lastCompleted5mBySession: parsed.lastCompleted5mBySession || {},
        lastMarketMapRefreshBySession: parsed.lastMarketMapRefreshBySession || {},
        lastHealthStatus: parsed.lastHealthStatus || null,
        lastHealthAlertSentAt: parsed.lastHealthAlertSentAt || null,
      },
      health: {
        status: 'ok',
        message: result.source === 'backup'
          ? 'Scanner state file recovered from last-known-good backup.'
          : 'Scanner state file is readable.',
      },
    };
  }
  return {
    state: emptyScannerState(),
    health: {
      status: result.source === 'missing' ? 'missing_initialized' : 'corrupt',
      message: result.source === 'missing'
        ? 'Scanner state file was missing and initialized safely.'
        : `Scanner state file could not be read; using an empty in-memory state for this cycle: ${result.error || 'invalid JSON'}`,
    },
  };
}

async function readState(): Promise<ScannerStateFile> {
  return (await readStateWithHealth()).state;
}

async function writeState(state: ScannerStateFile): Promise<void> {
  await writeRuntimeJsonAtomic(STATE_FILE, state);
}

function unifiedDeskOutputProductionSurfaceBlockers(
  surface: UnifiedDeskOutputProductionScannerSurfaceActivation | null,
): string[] {
  if (!surface) return ['Unified Desk Output production scanner surface is not active.'];
  const eveningRows = surface.summary.eveningRows ?? 0;
  return [
    surface.reportType === 'unified_desk_output_production_scanner_surface_activation' ? null : 'Unified Desk Output production surface has invalid report type.',
    surface.status === 'active' ? null : `Unified Desk Output production surface status is ${surface.status}.`,
    surface.approval.explicitProductionApproval ? null : 'Unified Desk Output production surface lacks explicit production approval.',
    surface.approval.discordPostingRemainsGuarded ? null : 'Unified Desk Output production surface does not preserve Discord guard.',
    surface.approval.changesTradingLogic === false ? null : 'Unified Desk Output production surface changes trading logic.',
    surface.approval.changesCanExecute === false ? null : 'Unified Desk Output production surface changes canExecute.',
    surface.approval.changesEntryStopTargets === false ? null : 'Unified Desk Output production surface changes entry/stop/targets.',
    surface.approval.automatedOrders === false ? null : 'Unified Desk Output production surface allows automated orders.',
    surface.authority.scannerVisibleNow ? null : 'Unified Desk Output production surface is not scanner-visible.',
    surface.authority.postsDiscord === false ? null : 'Unified Desk Output production surface posts Discord.',
    surface.authority.writesSupabase === false ? null : 'Unified Desk Output production surface writes Supabase.',
    surface.authority.readsLiveSupabase === false ? null : 'Unified Desk Output production surface reads live Supabase.',
    surface.authority.readsLiveBridge === false ? null : 'Unified Desk Output production surface reads live bridge.',
    surface.authority.changesTradingLogic === false ? null : 'Unified Desk Output production surface changes trading logic authority.',
    surface.authority.changesCanExecute === false ? null : 'Unified Desk Output production surface changes canExecute authority.',
    surface.authority.canExecute === false ? null : 'Unified Desk Output production surface has canExecute=true.',
    surface.authority.automatedOrders === false ? null : 'Unified Desk Output production surface allows automated orders authority.',
    surface.summary.selectedRows === surface.rows.length ? null : 'Unified Desk Output production surface selected row count does not match rows.',
    surface.summary.selectedRows >= 2 && surface.summary.selectedRows <= 3 ? null : 'Unified Desk Output production surface must expose two or three rows.',
    surface.summary.morningRows === 1 ? null : 'Unified Desk Output production surface does not expose exactly one morning row.',
    surface.summary.lunchRows === 1 ? null : 'Unified Desk Output production surface does not expose exactly one lunch row.',
    eveningRows <= 1 ? null : 'Unified Desk Output production surface exposes more than one evening row.',
    surface.summary.approvedDeskPlanRows === surface.summary.selectedRows ? null : 'Unified Desk Output production surface Approved Desk Plan count does not match selected rows.',
    surface.summary.discordPostRows === 0 ? null : 'Unified Desk Output production surface has Discord post rows.',
    surface.summary.supabaseWriteRows === 0 ? null : 'Unified Desk Output production surface has Supabase write rows.',
    surface.summary.liveSupabaseReadRows === 0 ? null : 'Unified Desk Output production surface has live Supabase read rows.',
    surface.summary.liveBridgeReadRows === 0 ? null : 'Unified Desk Output production surface has live bridge read rows.',
    surface.summary.canExecuteChangedRows === 0 ? null : 'Unified Desk Output production surface changed canExecute.',
    surface.summary.tradingLogicChangedRows === 0 ? null : 'Unified Desk Output production surface changed trading logic.',
    surface.summary.automatedOrderRows === 0 ? null : 'Unified Desk Output production surface has automated order rows.',
    surface.summary.blockedRows === 0 ? null : 'Unified Desk Output production surface has blocked rows.',
    surface.rows.length >= 2 && surface.rows.length <= 3 ? null : 'Unified Desk Output production surface row array must contain two or three rows.',
    surface.rows.every((row) => isUnifiedDeskOutputApprovedProductionModel(row.model)) ? null : 'Unified Desk Output production surface includes a non-approved production model.',
    ...surface.blockers,
  ].filter((item): item is string => Boolean(item));
}

export async function readUnifiedDeskOutputProductionScannerSurface(
  filePath = UNIFIED_DESK_OUTPUT_PRODUCTION_SURFACE_FILE,
): Promise<UnifiedDeskOutputProductionScannerSurfaceActivation | null> {
  try {
    const surface = (await readRuntimeJson<UnifiedDeskOutputProductionScannerSurfaceActivation>(filePath)).value;
    const blockers = unifiedDeskOutputProductionSurfaceBlockers(surface);
    return blockers.length ? null : surface;
  } catch {
    return null;
  }
}

export function unifiedDeskOutputProductionScannerSummaryLine(
  surface: UnifiedDeskOutputProductionScannerSurfaceActivation | null,
): string {
  if (!surface) return 'unified-desk-output=unavailable';
  const rows = surface.rows
    .map((row) => `${row.session}:${row.model}:${row.direction}:${row.proofLine.replace('Completed 5M proof: ', '').replace(' ET.', '')}`)
    .join(' | ');
  return `[scanner] Unified Desk Output production surface active: rows=${surface.summary.selectedRows} ${rows} | Discord guarded, canExecute audit-only, no automated orders.`;
}

export async function writeUnifiedDeskOutputProductionScannerReadback(args: {
  tradeDate: string;
  instrument: Instrument;
  session: LiveSession;
  completed5mTime: string | null;
  surface: UnifiedDeskOutputProductionScannerSurfaceActivation | null;
  filePath?: string;
}): Promise<string> {
  const filePath = args.filePath || UNIFIED_DESK_OUTPUT_PRODUCTION_READBACK_FILE;
  const blockers = unifiedDeskOutputProductionSurfaceBlockers(args.surface);
  const payload = {
    reportType: 'unified_desk_output_production_scanner_readback',
    generatedAt: new Date().toISOString(),
    status: blockers.length ? 'blocked' : 'pass',
    tradeDate: args.tradeDate,
    instrument: args.instrument,
    scannerSession: args.session,
    completed5mTime: args.completed5mTime,
    authority: {
      scannerVisibleNow: blockers.length === 0,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveBridge: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      canExecute: false,
      automatedOrders: false,
    },
    summary: {
      selectedRows: blockers.length || !args.surface ? 0 : args.surface.summary.selectedRows,
      morningRows: blockers.length || !args.surface ? 0 : args.surface.summary.morningRows,
      lunchRows: blockers.length || !args.surface ? 0 : args.surface.summary.lunchRows,
      eveningRows: blockers.length || !args.surface ? 0 : (args.surface.summary.eveningRows ?? 0),
      approvedDeskPlanRows: blockers.length || !args.surface ? 0 : args.surface.summary.approvedDeskPlanRows,
      discordPostRows: 0,
      supabaseWriteRows: 0,
      liveBridgeReadRows: 0,
      canExecuteTrueRows: 0,
      tradingLogicChangedRows: 0,
      automatedOrderRows: 0,
      blockedRows: blockers.length,
    },
    rows: blockers.length || !args.surface ? [] : args.surface.rows,
    blockers,
  };
  await writeRuntimeJsonAtomic(filePath, payload);
  return filePath;
}

const FIVE_MODEL_APPROVED_DISPLAY_NAMES = new Set(APPROVED_DESK_MODEL_DEFINITIONS.map((model) => model.displayName));
const APPROVED_MODEL_SURFACE_LABEL = `${APPROVED_DESK_MODEL_DEFINITIONS.length}-model production surface`;

function fiveModelProductionSurfaceBlockers(
  surface: FiveModelProductionScannerSurfaceActivation | null,
): string[] {
  if (!surface) return ['Five-model production scanner surface is not active.'];
  return [
    surface.reportType === 'five_model_production_scanner_surface_activation' ? null : 'Five-model production surface has invalid report type.',
    surface.status === 'active' ? null : `Five-model production surface status is ${surface.status}.`,
    surface.approval.explicitProductionApproval ? null : 'Five-model production surface lacks explicit production approval.',
    surface.approval.discordPostingRemainsGuarded ? null : 'Five-model production surface does not preserve Discord guard.',
    surface.approval.changesTradingLogic === false ? null : 'Five-model production surface changes trading logic.',
    surface.approval.changesCanExecute === false ? null : 'Five-model production surface changes canExecute.',
    surface.approval.changesEntryStopTargets === false ? null : 'Five-model production surface changes entry/stop/targets.',
    surface.approval.automatedOrders === false ? null : 'Five-model production surface allows automated orders.',
    surface.authority.scannerVisibleNow ? null : 'Five-model production surface is not scanner-visible.',
    surface.authority.localRuntimeSurfaceOnly ? null : 'Five-model production surface is not local-runtime-surface-only.',
    surface.authority.postsDiscord === false ? null : 'Five-model production surface posts Discord.',
    surface.authority.writesSupabase === false ? null : 'Five-model production surface writes Supabase.',
    surface.authority.readsLiveSupabase === false ? null : 'Five-model production surface reads live Supabase.',
    surface.authority.readsLiveBridge === false ? null : 'Five-model production surface reads live bridge.',
    surface.authority.changesScannerBehavior === false ? null : 'Five-model production surface changes scanner behavior.',
    surface.authority.changesTradingLogic === false ? null : 'Five-model production surface changes trading logic authority.',
    surface.authority.changesCanExecute === false ? null : 'Five-model production surface changes canExecute authority.',
    surface.authority.canExecute === false ? null : 'Five-model production surface has canExecute=true.',
    surface.authority.automatedOrders === false ? null : 'Five-model production surface allows automated orders authority.',
    surface.summary.selectedRows === surface.rows.length ? null : 'Five-model production surface selected row count does not match rows.',
    surface.summary.selectedRows === surface.summary.morningRows + surface.summary.lunchRows + surface.summary.eveningRows
      ? null
      : 'Five-model production surface session row counts do not add up to selected rows.',
    surface.summary.approvedDeskPlanRows === 5 ? null : 'Five-model production surface must expose exactly 5 Approved Desk Plan rows.',
    surface.summary.formingDeskReadRows === surface.summary.selectedRows - surface.summary.approvedDeskPlanRows
      ? null
      : 'Five-model production surface Forming Desk Read count does not match selected rows.',
    surface.summary.morningRows === 10 ? null : 'Five-model production surface must expose exactly 10 morning rows.',
    surface.summary.lunchRows === 8 ? null : 'Five-model production surface must expose exactly 8 lunch rows.',
    surface.summary.eveningRows <= 1 ? null : 'Five-model production surface may expose at most one evening row in this activation.',
    surface.summary.discordPostRows === 0 ? null : 'Five-model production surface has Discord post rows.',
    surface.summary.supabaseWriteRows === 0 ? null : 'Five-model production surface has Supabase write rows.',
    surface.summary.liveSupabaseReadRows === 0 ? null : 'Five-model production surface has live Supabase read rows.',
    surface.summary.liveBridgeReadRows === 0 ? null : 'Five-model production surface has live bridge read rows.',
    surface.summary.canExecuteTrueRows === 0 ? null : 'Five-model production surface has canExecute=true rows.',
    surface.summary.canExecuteChangedRows === 0 ? null : 'Five-model production surface changed canExecute.',
    surface.summary.tradingLogicChangedRows === 0 ? null : 'Five-model production surface changed trading logic.',
    surface.summary.automatedOrderRows === 0 ? null : 'Five-model production surface has automated order rows.',
    surface.summary.blockedRows === 0 ? null : 'Five-model production surface has blocked rows.',
    surface.rows.every((row) => FIVE_MODEL_APPROVED_DISPLAY_NAMES.has(row.model))
      ? null
      : `${APPROVED_MODEL_SURFACE_LABEL} includes a model outside the approved ${APPROVED_DESK_MODEL_DEFINITIONS.length}-model registry.`,
    surface.rows.every((row) => !row.publishDiscord) ? null : 'Five-model production surface rows would post Discord.',
    surface.rows.every((row) => !row.writesSupabase) ? null : 'Five-model production surface rows would write Supabase.',
    surface.rows.every((row) => !row.readsLiveBridge) ? null : 'Five-model production surface rows would read live bridge.',
    surface.rows.every((row) => !row.canExecute) ? null : 'Five-model production surface rows include canExecute=true.',
    ...surface.blockers,
  ].filter((item): item is string => Boolean(item));
}

export async function readFiveModelProductionScannerSurface(
  filePath = FIVE_MODEL_PRODUCTION_SURFACE_FILE,
): Promise<FiveModelProductionScannerSurfaceActivation | null> {
  try {
    const surface = (await readRuntimeJson<FiveModelProductionScannerSurfaceActivation>(filePath)).value;
    const blockers = fiveModelProductionSurfaceBlockers(surface);
    return blockers.length ? null : surface;
  } catch {
    return null;
  }
}

export function fiveModelProductionScannerSummaryLine(
  surface: FiveModelProductionScannerSurfaceActivation | null,
): string {
  if (!surface) return 'five-model-output=unavailable';
  const models = [...new Set(surface.rows.map((row) => row.model))].join(', ');
  return `[scanner] ${APPROVED_MODEL_SURFACE_LABEL} active: rows=${surface.summary.selectedRows} approved=${surface.summary.approvedDeskPlanRows} forming=${surface.summary.formingDeskReadRows} models=${models} | Discord guarded, canExecute audit-only, no automated orders.`;
}

export async function writeFiveModelProductionScannerReadback(args: {
  tradeDate: string;
  instrument: Instrument;
  session: LiveSession;
  completed5mTime: string | null;
  surface: FiveModelProductionScannerSurfaceActivation | null;
  filePath?: string;
}): Promise<string> {
  const filePath = args.filePath || FIVE_MODEL_PRODUCTION_READBACK_FILE;
  const blockers = fiveModelProductionSurfaceBlockers(args.surface);
  const payload = {
    reportType: 'five_model_production_scanner_readback',
    generatedAt: new Date().toISOString(),
    status: blockers.length ? 'blocked' : 'pass',
    tradeDate: args.tradeDate,
    instrument: args.instrument,
    scannerSession: args.session,
    completed5mTime: args.completed5mTime,
    authority: {
      scannerVisibleNow: blockers.length === 0,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveBridge: false,
      changesScannerBehavior: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      canExecute: false,
      automatedOrders: false,
    },
    summary: {
      selectedRows: blockers.length || !args.surface ? 0 : args.surface.summary.selectedRows,
      morningRows: blockers.length || !args.surface ? 0 : args.surface.summary.morningRows,
      lunchRows: blockers.length || !args.surface ? 0 : args.surface.summary.lunchRows,
      eveningRows: blockers.length || !args.surface ? 0 : args.surface.summary.eveningRows,
      approvedDeskPlanRows: blockers.length || !args.surface ? 0 : args.surface.summary.approvedDeskPlanRows,
      formingDeskReadRows: blockers.length || !args.surface ? 0 : args.surface.summary.formingDeskReadRows,
      discordPostRows: 0,
      supabaseWriteRows: 0,
      liveBridgeReadRows: 0,
      canExecuteTrueRows: 0,
      tradingLogicChangedRows: 0,
      automatedOrderRows: 0,
      blockedRows: blockers.length,
    },
    rows: blockers.length || !args.surface ? [] : args.surface.rows,
    blockers,
  };
  await writeRuntimeJsonAtomic(filePath, payload);
  return filePath;
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
  const parsed = (await readRuntimeJson<unknown>(ledgerPath)).value;
  records = Array.isArray(parsed) ? parsed.filter((item): item is LocalMarketDataGapEventRecord => Boolean(item && typeof item === 'object')) : [];
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
  await writeRuntimeJsonAtomic(ledgerPath, records);
  return { path: ledgerPath, key, records: records.length };
}

export async function syncLocalMarketDataGapEventsToSupabase(args: {
  marketConfig: MarketDataConfig;
  ledgerPath?: string;
  upsert?: typeof upsertMarketDataGapEvent;
}): Promise<{ path: string; attempted: number; synced: number; failed: number }> {
  const ledgerPath = args.ledgerPath || MARKET_DATA_GAP_FALLBACK_LEDGER;
  let records: LocalMarketDataGapEventRecord[] = [];
  const parsed = (await readRuntimeJson<unknown>(ledgerPath)).value;
  if (!parsed) {
    return { path: ledgerPath, attempted: 0, synced: 0, failed: 0 };
  }
  records = Array.isArray(parsed) ? parsed.filter((item): item is LocalMarketDataGapEventRecord => Boolean(item && typeof item === 'object')) : [];

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
    await writeRuntimeJsonAtomic(ledgerPath, records);
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
      audit = (await readRuntimeJson(auditFile)).value;
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

const scannerCacheUpsertSkipWarnings = new Set<string>();

export function scannerMarketBarsUpsertSkipAuditLine(args: {
  label: string;
  timeframe: MarketBarTimeframe;
  result: MarketBarsUpsertResult;
}): string | null {
  if (!args.result.skipped) return null;
  const integrity = args.result.integrity;
  return [
    `[${args.label}] ${args.timeframe}: market_bars upsert skipped`,
    `reason=${args.result.skipReason}`,
    `rows=${integrity.rows}`,
    `invalidAlignmentRows=${integrity.invalidAlignmentRows}`,
    `invalidShortIntervalRows=${integrity.invalidShortIntervalRows}`,
    `observedIntervals=${JSON.stringify(integrity.observedIntervalMinutes)}`,
  ].join(' | ');
}

function warnScannerMarketBarsUpsertSkippedOnce(args: {
  label: string;
  timeframe: MarketBarTimeframe;
  result: MarketBarsUpsertResult;
}): void {
  const line = scannerMarketBarsUpsertSkipAuditLine(args);
  if (!line) return;
  const key = `${args.label}:${args.timeframe}:${args.result.skipReason}:${JSON.stringify(args.result.integrity.observedIntervalMinutes)}:${args.result.integrity.invalidAlignmentRows}:${args.result.integrity.invalidShortIntervalRows}`;
  if (scannerCacheUpsertSkipWarnings.has(key)) return;
  scannerCacheUpsertSkipWarnings.add(key);
  console.warn(line);
}

function money(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : 'N/A';
}

function compactScannerLogText(value: string | null | undefined, maxLength = 160): string {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return 'none';
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
}

export type ScannerOperatorDeliveryReasonCode =
  | 'POST_READY'
  | 'HELD_DUPLICATE'
  | 'HELD_STALE_NO_CHASE'
  | 'HELD_DATA_LIMITED'
  | 'HELD_MISSING_5M_PROOF'
  | 'HELD_REVIEW_ONLY'
  | 'HELD_LOCAL';

export type ScannerDeskOutputStatus =
  | 'approved_plan'
  | 'forming'
  | 'no_trade'
  | 'duplicate'
  | 'held';

export interface ScannerDeskOutputContract {
  sourceOfTruth: 'scanner_desk_output_contract';
  pipeline: 'select_candidate_approve_hold_publish';
  status: ScannerDeskOutputStatus;
  publishToDiscord: boolean;
  reason: string;
  operatorCode: ScannerOperatorDeliveryReasonCode;
  session: LiveSession;
  tradeDate: string;
  instrument: Instrument;
  state: ScannerState;
  model: string | null;
  direction: SetupCandidate['direction'] | DeskPublishDecision['direction'] | null;
  entry: number | null;
  stop: number | null;
  t1: number | null;
  t2: number | null;
  canExecute: boolean;
  hasCompletePlan: boolean;
  campaignId: string | null;
  gates: {
    selectedCandidate: boolean;
    alertApproved: boolean;
    publishDecisionApproved: boolean;
    completePlan: boolean;
    duplicateBlocked: boolean;
    dataQualityBlocked: boolean;
    reviewOnly: boolean;
  };
  authority: {
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesDiscordPolicy: false;
  };
}

export function normalizeScannerOperatorDeliveryReason(decision: ScannerAlertDecision): {
  code: ScannerOperatorDeliveryReasonCode;
  reason: string;
} {
  const raw = String(decision.reason || '').replace(/\s+/g, ' ').trim();
  const lower = raw.toLowerCase();
  if (decision.shouldSend) {
    return {
      code: 'POST_READY',
      reason: raw || 'POST_READY: eligible scanner alert.',
    };
  }
  if (/duplicate|already sent|durable ledger|one-trade-per-campaign|activecampaign duplicate/i.test(raw)) {
    return {
      code: 'HELD_DUPLICATE',
      reason: 'HELD_DUPLICATE: existing Discord/campaign record already covers this setup.',
    };
  }
  if (/stale|missed|no chase|already_triggered|no_fresh_entry|state=missed|zone_failed_completed_5m|already reached|passed t1|active tactical zone/i.test(raw)) {
    return {
      code: 'HELD_STALE_NO_CHASE',
      reason: 'HELD_STALE_NO_CHASE: no fresh entry; wait for new completed 5M proof.',
    };
  }
  if (/data-limited|data limited|htf\/data context insufficient|htf context insufficient|readiness gate is data-limited|pre-market data readiness/i.test(raw)) {
    return {
      code: 'HELD_DATA_LIMITED',
      reason: 'HELD_DATA_LIMITED: HTF/data context is insufficient; review-map only.',
    };
  }
  if (/missing proof|missing_proof|review_only_missing_proof|entrytriggerpending|triggerpending|waiting for completed 5m|completed 5m proof|pullback_or_new_5m_structure/i.test(raw)) {
    return {
      code: 'HELD_MISSING_5M_PROOF',
      reason: 'HELD_MISSING_5M_PROOF: waiting for completed 5M trigger/retest proof.',
    };
  }
  if (/canexecute=false|review only|not execution approval|htf\/protected structure conflict|conflicts with deskstate|conflicts with active htf fvg routing|readiness=not_aligned|readiness=blocked/i.test(lower)) {
    return {
      code: 'HELD_REVIEW_ONLY',
      reason: 'HELD_REVIEW_ONLY: review only; execution gate is not clean.',
    };
  }
  return {
    code: 'HELD_LOCAL',
    reason: raw ? `HELD_LOCAL: ${compactScannerLogText(raw, 140)}` : 'HELD_LOCAL: not eligible for trade-card delivery.',
  };
}

function withNormalizedScannerOperatorDeliveryReason(decision: ScannerAlertDecision): ScannerAlertDecision {
  const normalized = normalizeScannerOperatorDeliveryReason(decision);
  return normalized.reason === decision.reason ? decision : { ...decision, reason: normalized.reason };
}

function scannerDeskOutputStatus(args: {
  alertDecision: ScannerAlertDecision;
  publishDecision: DeskPublishDecision | null | undefined;
  candidate: SetupCandidate | null;
  operatorCode: ScannerOperatorDeliveryReasonCode;
}): ScannerDeskOutputStatus {
  if (args.alertDecision.shouldSend) return 'approved_plan';
  if (args.operatorCode === 'HELD_DUPLICATE') return 'duplicate';
  if (args.operatorCode === 'HELD_MISSING_5M_PROOF' || args.publishDecision?.action === 'POST_WATCH') return 'forming';
  if (!args.candidate || args.publishDecision?.direction === 'WAIT') return 'no_trade';
  return 'held';
}

export function buildScannerDeskOutputContract(args: {
  session: LiveSession;
  tradeDate: string;
  instrument: Instrument;
  state: ScannerState;
  candidate: SetupCandidate | null;
  alertDecision: ScannerAlertDecision;
  publishDecision: DeskPublishDecision | null | undefined;
  campaignId?: string | null;
}): ScannerDeskOutputContract {
  const normalizedReason = normalizeScannerOperatorDeliveryReason(args.alertDecision);
  const publishDecision = args.publishDecision || null;
  return {
    sourceOfTruth: 'scanner_desk_output_contract',
    pipeline: 'select_candidate_approve_hold_publish',
    status: scannerDeskOutputStatus({
      alertDecision: args.alertDecision,
      publishDecision,
      candidate: args.candidate,
      operatorCode: normalizedReason.code,
    }),
    publishToDiscord: args.alertDecision.shouldSend,
    reason: normalizedReason.reason,
    operatorCode: normalizedReason.code,
    session: args.session,
    tradeDate: args.tradeDate,
    instrument: args.instrument,
    state: args.state,
    model: args.candidate?.setupType || publishDecision?.setupType || null,
    direction: args.candidate?.direction || publishDecision?.direction || null,
    entry: publishDecision?.entry ?? args.candidate?.entry ?? null,
    stop: publishDecision?.stop ?? args.candidate?.stop ?? null,
    t1: publishDecision?.t1 ?? args.candidate?.target1 ?? null,
    t2: publishDecision?.t2 ?? args.candidate?.target2 ?? null,
    canExecute: Boolean(publishDecision?.canExecute),
    hasCompletePlan: Boolean(publishDecision?.hasCompletePlan),
    campaignId: args.campaignId || null,
    gates: {
      selectedCandidate: Boolean(args.candidate),
      alertApproved: args.alertDecision.shouldSend,
      publishDecisionApproved: Boolean(publishDecision?.shouldPost),
      completePlan: Boolean(publishDecision?.hasCompletePlan),
      duplicateBlocked: normalizedReason.code === 'HELD_DUPLICATE',
      dataQualityBlocked: normalizedReason.code === 'HELD_DATA_LIMITED',
      reviewOnly: normalizedReason.code === 'HELD_REVIEW_ONLY',
    },
    authority: {
      changesTradingLogic: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      changesDiscordPolicy: false,
    },
  };
}

function scannerAuditFileLabel(filePath: string | null | undefined): string {
  return filePath ? path.basename(filePath) : 'N/A';
}

function scannerCandidateLabel(candidate: SetupCandidate | null, deskState: DeskState): string {
  const side = candidate?.direction || deskState.primaryDeskPlay?.direction || 'WAIT';
  const setup = candidate?.setupType || deskState.selectedCandidate?.setupType || 'DeskState';
  return `${side} ${setup}`;
}

export function scannerCycleSummaryLine(args: {
  session: LiveSession;
  completed5m: NinjaBridgeBar;
  currentPrice: number;
  candidate: SetupCandidate | null;
  deskState: DeskState;
  scannerDeskOutput?: ScannerDeskOutputContract | null;
  stateForAlert: ScannerState;
  confidence: ScannerConfidenceBreakdown;
  sameCompletedCandle: boolean;
  alertDecision: ScannerAlertDecision;
  decisionTapePath: string;
}): string {
  const ticket = buildCanonicalTraderTicket({
    candidate: args.candidate,
    deskState: args.deskState,
    currentPrice: args.currentPrice,
    suppressLevels: args.stateForAlert === 'Missed',
    suppressReason: 'Scanner state is missed/no-chase; prior levels are management/history only.',
  });
  const delivery = args.alertDecision.shouldSend ? 'send' : 'local';
  const output = args.scannerDeskOutput ? `output ${args.scannerDeskOutput.status}` : `output ${delivery}`;
  const refresh = args.sameCompletedCandle ? 'refresh | ' : '';
  return [
    `[scanner] ${args.session} ${args.completed5m.time}: ${args.stateForAlert} ${args.confidence.score}/100`,
    scannerCandidateLabel(args.candidate, args.deskState),
    output,
    `current ${money(args.currentPrice)}`,
    `line ${money(ticket.lineInSand)}`,
    `entry ${money(ticket.levels?.entry)}`,
    `stop ${money(ticket.levels?.stop)}`,
    `T1 ${money(ticket.levels?.target1)}`,
    `T2 ${money(ticket.levels?.target2)}`,
    `levels ${ticket.levelsStatus}`,
    `${refresh}${delivery}: ${compactScannerLogText(args.alertDecision.reason)}`,
    `audit=${scannerAuditFileLabel(args.decisionTapePath)}`,
  ].join(' | ');
}

export function scannerSuppressionSummaryLine(args: {
  label: string;
  category: string;
  reason: string;
  previousFingerprint?: string | null;
}): string {
  const previous = args.previousFingerprint ? ` | previous=${compactScannerLogText(args.previousFingerprint, 90)}` : '';
  return `[scanner] ${args.label} suppressed (${args.category}): ${compactScannerLogText(args.reason, 180)}${previous}`;
}

export function scannerDiscordDryRunSummaryLine(args: {
  payload: DiscordWebhookPayload;
  files: string[];
  source: 'dry_run' | 'discord_disabled';
}): string {
  const text = flattenDiscordPayloadText(args.payload);
  const title = args.payload.embeds[0]?.title || args.payload.content || 'Discord payload';
  const components = args.payload.components?.length || 0;
  const fileLabels = args.files.length ? args.files.map((file) => path.basename(file)).join(',') : 'none';
  return [
    '[scanner-discord]',
    `held source=${args.source}`,
    `title="${compactScannerLogText(title, 58)}"`,
    `text=${text.length}`,
    `files=${args.files.length}:${fileLabels}`,
    `components=${components}`,
    'set SCANNER_VERBOSE_DISCORD_PAYLOAD_LOG=true for full dry-run JSON',
  ].join(' | ');
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

export function scannerHistoryContractLegs(config: ScannerConfig, from: string, to: string): BridgeContractLeg[] {
  return buildRolloverAwareContractLegs({
    appInstrument: config.instrument,
    bridgeInstrument: config.bridgeInstrument,
    fromDate: ymdInEt(from),
    toDate: ymdInEt(to),
  });
}

function scannerHistoryLegWindow(leg: BridgeContractLeg, requestedFrom: string, requestedTo: string): { from: string; to: string } {
  const requestedFromDate = ymdInEt(requestedFrom);
  const requestedToDate = ymdInEt(requestedTo);
  return {
    from: leg.fromDate === requestedFromDate ? requestedFrom : etDateTime(leg.fromDate, '00:00'),
    to: leg.toDate === requestedToDate ? requestedTo : etDateTime(leg.toDate, '23:59'),
  };
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
  const fromDate = calendarDateBefore(tradeDate, SCANNER_REQUIRED_HISTORY_LOOKBACK_DAYS - 1);
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
  const latestCompletedToleranceMs = latestOpenTimestampCoverageToleranceMs(timeframe);
  const startCoverageToleranceMs = 24 * 60 * 60_000;
  const latestBarTime = sorted[sorted.length - 1]?.time;
  const sundayEveningHtfReopenLagCovered =
    isSundayEveningHtfReopenLagCovered(timeframe, latestBarTime, requestedTo);
  const latestCoverageSatisfied =
    last >= to - latestCompletedToleranceMs ||
    sundayEveningHtfReopenLagCovered;
  const spanCoverageSatisfied =
    loadedSpanDays >= requiredSpanDays ||
    (sundayEveningHtfReopenLagCovered && loadedSpanDays >= requiredSpanDays - 3);
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
  const aggregated = record.fiveMinuteAggregationRepairBars ? `, 5m-aggregated=${record.fiveMinuteAggregationRepairBars}` : '';
  const legs = record.contractLegs?.length ? `, legs=${record.contractLegs.join(' + ')}` : '';
  const limitation = record.dataLimitation?.message ? `, data-limit=${record.dataLimitation.message}` : '';
  return `${record.timeframe}: ${status}, ${record.barsLoaded} bars, ${record.rangeStart || 'N/A'} to ${record.rangeEnd || 'N/A'}, source=${record.source}${healed}${aggregated}${legs}${limitation}`;
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
      candidatePromotionBoundary: 'htf_context_required_for_raid_reclaim_reversal',
    };
  }

  const insufficient = required.filter((timeframe) => !coverage.find((item) => item.timeframe === timeframe && item.sufficient));
  if (!insufficient.length) {
    return {
      status: 'sufficient',
      requiredTimeframes: required,
      insufficientTimeframes: [],
      summary: '15M, 1H, 2H, and 4H scanner history coverage is sufficient for HTF structural classification.',
      candidatePromotionBoundary: 'htf_context_required_for_raid_reclaim_reversal',
    };
  }

  return {
    status: 'data_limited',
    requiredTimeframes: required,
    insufficientTimeframes: insufficient,
    summary: `HTF history is data-limited for ${insufficient.join(', ')} after cache, bridge, and segmented bridge repair; failed-plan reversal and HTF promotion must treat this as context only, not structural confirmation. The scanner cannot invent missing NinjaTrader bars.`,
    candidatePromotionBoundary: 'htf_context_required_for_raid_reclaim_reversal',
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
    parsed = (await readRuntimeJson<Record<string, unknown>>(args.file)).value || {};
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
  chartContext?: Partial<ChartContext> | null;
  visibilityMetadata?: ScannerVisibilityMetadata;
  candidateLifecycleTrace?: ScannerCandidateLifecycleTrace;
  tradeDecisionMapAudit?: TradeDecisionMapAudit;
  deskState?: DeskState;
  publishDecision?: DeskPublishDecision | null;
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
  const tradeDecisionMapAudit = args.tradeDecisionMapAudit || buildTradeDecisionMapAudit();
  const baseDeskState = args.deskState || buildDeskState({
    state: args.state,
    candidate: args.candidate,
    visibilityMetadata,
    candidateLifecycleTrace,
    targetCascade: args.targetCascade,
    chartContext: args.chartContext || null,
    currentPrice: args.currentPrice,
    canExecute: Boolean(args.normalized.canExecute),
  });
  const deskState = withScannerReviewMapPresentation({
    deskState: baseDeskState,
    candidate: args.candidate,
    normalized: args.normalized,
  });
  const publishDecision = args.publishDecision || buildDeskPublishDecision({
    deskState,
    currentPrice: args.currentPrice,
    completed5mTime: args.completed5m?.time || null,
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
    tradeDecisionMapAudit,
    deskState,
    deskPublishDecision: publishDecision,
    counterStructureConditional: deskState.primaryDeskPlay.counterStructureConditional || null,
    mtfPrimarySideArbitration: deskState.primaryDeskPlay.mtfPrimarySideArbitration || null,
    htfTargetToLinePromotion: deskState.primaryDeskPlay.htfTargetToLinePromotion || null,
    historyCoverage: args.historyCoverage || [],
    historyCoverageSummary: (args.historyCoverage || []).map(summarizeScannerHistoryCoverage),
    twoHourCoverage: twoHourCoverageDiagnostic(args.historyCoverage),
    htfHistoryCoverage: htfHistoryCoverageReadiness(args.historyCoverage),
    targetCascade: args.targetCascade,
    alertReason: args.alertReason,
    publishDecision,
    attachments: {
      chartMarkup: args.chartMarkup,
      priceLevelMap: args.levelMap,
      ...(args.chartMarkup && args.levelMap ? buildDiscordTradePlanVisualProvenance(args.planVersionId) : {}),
    },
    deliveryOutcome: {
      status: 'pending_final_delivery',
      reason: 'Discord artifact built; final delivery outcome has not been recorded yet.',
      recordedAt: new Date().toISOString(),
    },
  }).value;
  await writeRuntimeJsonAtomic(file, auditPayload);
  await verifyScannerAuditWrite({
    file,
    expectedSource: 'live-scanner',
    expectedPlanVersionId: args.planVersionId,
  });
  return file;
}

export interface ScannerDiscordFinalDeliveryOutcome {
  status: 'sent' | 'hard_suppressed' | 'duplicate_blocked' | 'delivery_failed';
  reason: string;
  recordedAt?: string;
  discordMessageId?: string | null;
  httpStatus?: number | null;
  webhookSource?: string | null;
  priorPlanVersionId?: string | null;
  priorDiscordMessageId?: string | null;
}

const SCANNER_FINAL_DELIVERY_OUTCOME_STALE_MS = 2 * 60 * 1000;
const SCANNER_FINAL_DELIVERY_TERMINAL_STATUSES = new Set<ScannerDiscordFinalDeliveryOutcome['status']>([
  'sent',
  'hard_suppressed',
  'duplicate_blocked',
  'delivery_failed',
]);

export function validateScannerDiscordFinalDeliveryOutcome(args: {
  audit: Record<string, any> | null | undefined;
  requireTerminalForEligible?: boolean;
}): { ok: true; status: ScannerDiscordFinalDeliveryOutcome['status']; reason: string } | { ok: false; reason: string } {
  const audit = args.audit || {};
  const outcome = audit.deliveryOutcome || {};
  const status = typeof outcome.status === 'string' ? outcome.status : null;
  const reason = typeof outcome.reason === 'string' ? outcome.reason : '';
  const visibility = audit.visibility || {};
  const lifecycle = audit.candidateLifecycleTrace || {};
  const discord = audit.discord || {};
  const eligible = visibility?.authority?.discordEligible === true ||
    visibility?.discordAction === 'post_review' ||
    lifecycle?.discordDecision?.shouldSend === true ||
    lifecycle?.alertDecision?.shouldSend === true ||
    discord?.shouldSend === true;

  if (!status) {
    if (args.requireTerminalForEligible && eligible) return { ok: false, reason: 'Discord-eligible scanner artifact has no deliveryOutcome.status.' };
    return { ok: false, reason: 'Scanner artifact has no deliveryOutcome.status.' };
  }
  if (!SCANNER_FINAL_DELIVERY_TERMINAL_STATUSES.has(status as ScannerDiscordFinalDeliveryOutcome['status'])) {
    if (args.requireTerminalForEligible && eligible) {
      return { ok: false, reason: `Discord-eligible scanner artifact has non-terminal deliveryOutcome.status=${status}.` };
    }
    return { ok: false, reason: `Scanner artifact has non-terminal deliveryOutcome.status=${status}.` };
  }
  if (!reason.trim()) return { ok: false, reason: `Scanner artifact deliveryOutcome.status=${status} is missing a reason.` };
  if (status === 'sent' && !outcome.discordMessageId) return { ok: false, reason: 'Sent scanner artifact is missing deliveryOutcome.discordMessageId.' };
  return { ok: true, status: status as ScannerDiscordFinalDeliveryOutcome['status'], reason };
}

export async function writeScannerDiscordFinalDeliveryOutcomeAuditLog(args: {
  auditLogPath: string | null | undefined;
  outcome: ScannerDiscordFinalDeliveryOutcome;
}): Promise<boolean> {
  if (!args.auditLogPath) return false;
  let parsed: Record<string, unknown>;
  try {
    parsed = (await readRuntimeJson<Record<string, unknown>>(args.auditLogPath)).value || {};
  } catch {
    return false;
  }
  const outcome = {
    ...args.outcome,
    recordedAt: args.outcome.recordedAt || new Date().toISOString(),
  };
  await writeRuntimeJsonAtomic(args.auditLogPath, {
    ...parsed,
    updatedAt: new Date().toISOString(),
    deliveryOutcome: outcome,
  });
  return true;
}

export async function writeScannerDiscordFinalDeliveryOutcomeFromReceipt(args: {
  auditLogPath: string | null | undefined;
  artifactLabel: string;
  receipt: ScannerDiscordPostReceipt;
}): Promise<boolean> {
  if (args.receipt.deliveryStatus === 'sent') {
    return writeScannerDiscordFinalDeliveryOutcomeAuditLog({
      auditLogPath: args.auditLogPath,
      outcome: {
        status: 'sent',
        reason: `${args.artifactLabel} delivered to Discord.`,
        discordMessageId: args.receipt.discordMessageId,
        httpStatus: args.receipt.httpStatus,
        webhookSource: args.receipt.webhookSource,
      },
    });
  }

  return writeScannerDiscordFinalDeliveryOutcomeAuditLog({
    auditLogPath: args.auditLogPath,
    outcome: {
      status: 'hard_suppressed',
      reason: `${args.artifactLabel} delivery skipped: ${args.receipt.webhookSource || 'unknown'}.`,
      discordMessageId: args.receipt.discordMessageId,
      httpStatus: args.receipt.httpStatus,
      webhookSource: args.receipt.webhookSource,
    },
  });
}

export async function writeScannerDiscordFinalDeliveryFailureOutcome(args: {
  auditLogPath: string | null | undefined;
  artifactLabel: string;
  error: unknown;
}): Promise<boolean> {
  const httpStatus = args.error instanceof ScannerDiscordPostError ? args.error.httpStatus : null;
  const webhookSource = args.error instanceof ScannerDiscordPostError ? args.error.webhookSource : null;
  return writeScannerDiscordFinalDeliveryOutcomeAuditLog({
    auditLogPath: args.auditLogPath,
    outcome: {
      status: 'delivery_failed',
      reason: `${args.artifactLabel} delivery failed: ${sanitizedError(args.error)}`,
      httpStatus,
      webhookSource,
    },
  });
}

export async function recoverStalePendingScannerFinalDeliveryOutcomes(args: {
  auditDir?: string;
  tradeDate?: string;
  instrument?: Instrument;
  now?: Date;
  staleMs?: number;
} = {}): Promise<{ checked: number; recovered: number; failed: number }> {
  const auditDir = args.auditDir || DISCORD_AUDIT_DIR;
  const nowMs = (args.now || new Date()).getTime();
  const staleMs = args.staleMs ?? SCANNER_FINAL_DELIVERY_OUTCOME_STALE_MS;
  let entries: string[] = [];
  try {
    entries = await fs.readdir(auditDir);
  } catch {
    return { checked: 0, recovered: 0, failed: 0 };
  }
  let checked = 0;
  let recovered = 0;
  let failed = 0;
  for (const entry of entries) {
    if (!entry.startsWith('scanner-') || !entry.endsWith('.json')) continue;
    const file = path.join(auditDir, entry);
    let audit: any;
    try {
      audit = (await readRuntimeJson<Record<string, unknown>>(file)).value || {};
    } catch {
      continue;
    }
    if (args.tradeDate && audit.tradeDate !== args.tradeDate) continue;
    if (args.instrument && audit.instrument !== args.instrument) continue;
    const status = typeof audit?.deliveryOutcome?.status === 'string' ? audit.deliveryOutcome.status : null;
    if (status !== 'pending_final_delivery') continue;
    checked += 1;
    const recordedAt = typeof audit?.deliveryOutcome?.recordedAt === 'string'
      ? Date.parse(audit.deliveryOutcome.recordedAt)
      : NaN;
    if (Number.isFinite(recordedAt) && nowMs - recordedAt < staleMs) continue;
    const ok = await writeScannerDiscordFinalDeliveryOutcomeAuditLog({
      auditLogPath: file,
      outcome: {
        status: 'delivery_failed',
        reason: 'Recovered stale pending final delivery outcome: scanner artifact had no terminal sent/suppressed/failed outcome within the accountability window.',
        webhookSource: null,
        discordMessageId: null,
        httpStatus: null,
      },
    });
    if (ok) recovered += 1;
    else failed += 1;
  }
  return { checked, recovered, failed };
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
  await writeRuntimeJsonAtomic(file, {
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
  await writeRuntimeJsonAtomic(file, {
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
  });
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

  return {
    displacement: {
      direction:
        stringField(latestDisplacement, ['direction', 'bias']) ||
        stringField(asRecord(latestDisplacement?.candle), ['direction']) ||
        null,
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
    })),
  }).value;
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
  tradeDecisionMapAudit?: TradeDecisionMapAudit;
  targetCascade?: TargetCascadeResult | null;
  deskState?: DeskState;
  publishDecision?: DeskPublishDecision | null;
  scannerDeskOutput?: ScannerDeskOutputContract | null;
  completed5mLatency?: ScannerCompletedFiveMinuteLatencySentinel | null;
  missedMoveReentryWatch?: ScannerMissedMoveReentryWatch | null;
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
    existing = (await readRuntimeJson<Record<string, unknown>>(file)).value;
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
  const tradeDecisionMapAudit = args.tradeDecisionMapAudit || buildTradeDecisionMapAudit();
  const baseDeskState = args.deskState || buildDeskState({
    state: args.state,
    candidate: args.candidate,
    visibilityMetadata,
    candidateLifecycleTrace,
    targetCascade: args.targetCascade,
    htfLiquidityDrawState: (asRecord(args.chartContext)?.htfLiquidityDrawState || null) as SetupCandidate['htfLiquidityDrawState'] | null,
    chartContext: args.chartContext as Partial<ChartContext> | null,
    currentPrice: args.currentPrice,
    canExecute: Boolean(args.normalized.canExecute),
  });
  const deskState = withScannerReviewMapPresentation({
    deskState: baseDeskState,
    candidate: args.candidate,
    normalized: args.normalized,
  });
  const publishDecision = args.publishDecision || buildDeskPublishDecision({
    deskState,
    currentPrice: args.currentPrice,
    completed5mTime: args.completed5m?.time || null,
  });
  const scannerDeskOutput = args.scannerDeskOutput || buildScannerDeskOutputContract({
    session: args.session,
    tradeDate: args.tradeDate,
    instrument: args.instrument,
    state: args.state,
    candidate: args.candidate,
    alertDecision: args.alertDecision,
    publishDecision,
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
    completed5mLatency: args.completed5mLatency || null,
    missedMoveReentryWatch: args.missedMoveReentryWatch || null,
    scannerState: args.state,
    visibility: visibilityMetadata,
    candidateLifecycleTrace,
    tradeDecisionMapAudit,
    deskState,
    deskPublishDecision: publishDecision,
    scannerDeskOutput,
    counterStructureConditional: deskState.primaryDeskPlay.counterStructureConditional || null,
    mtfPrimarySideArbitration: deskState.primaryDeskPlay.mtfPrimarySideArbitration || null,
    htfTargetToLinePromotion: deskState.primaryDeskPlay.htfTargetToLinePromotion || null,
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
      publishDecision,
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
  await writeRuntimeJsonAtomic(file, tapePayload);
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

async function fetchOneMinuteRefinementBars(config: ScannerConfig, limit = 120): Promise<NinjaBridgeBar[]> {
  try {
    const response = await getNinjaBridgeBars(config.bridgeInstrument, '1m', limit, config.bridgeUrl);
    return response.ok ? response.bars || [] : [];
  } catch (error) {
    console.warn(`[scanner-bridge] 1m refinement bars unavailable; 5M execution remains authority: ${formatError(error)}`);
    return [];
  }
}

export async function fetchSegmentedBridgeHistoryRepair(args: {
  config: ScannerConfig;
  timeframe: MarketBarTimeframe;
  from: string;
  to: string;
  limit: number;
  chunkDays?: number;
  contractLegs?: BridgeContractLeg[];
}): Promise<NinjaBridgeBar[]> {
  const bars: NinjaBridgeBar[] = [];
  const contractLegs = args.contractLegs?.length ? args.contractLegs : scannerHistoryContractLegs(args.config, args.from, args.to);
  for (const leg of contractLegs) {
    const legWindow = scannerHistoryLegWindow(leg, args.from, args.to);
    const windows = buildSegmentedHistoryRepairWindows(legWindow.from, legWindow.to, args.chunkDays ?? 5);
    for (const window of windows) {
      try {
        const historical = await getNinjaHistoricalBars({
          instrument: leg.bridgeInstrument,
          timeframe: args.timeframe,
          from: window.from,
          to: window.to,
          limit: args.limit,
          baseUrl: args.config.bridgeUrl,
        });
        if (historical.ok && historical.bars?.length) {
          bars.push(...historical.bars);
        } else {
          console.warn(`[scanner-history] ${args.timeframe}: segmented bridge repair returned no ${leg.bridgeInstrument} bars for ${window.from} to ${window.to}: ${historical.error || 'unknown error'}`);
        }
      } catch (error) {
        console.warn(`[scanner-history] ${args.timeframe}: segmented bridge repair failed for ${leg.bridgeInstrument} ${window.from} to ${window.to}: ${formatError(error)}`);
      }
    }
  }
  return mergeBars([], bars);
}

function scannerHistoryRepairBarsForTimeframe(
  timeframe: MarketBarTimeframe,
  bars: NinjaBridgeBar[],
  source: string,
): NinjaBridgeBar[] {
  if (!bars.length) return [];
  if (barsMatchRequestedTimeframe(bars, timeframe)) return bars;
  console.warn(`[scanner-history] ${timeframe}: ${source} returned bars that do not match requested timeframe spacing; ignoring repair bars to avoid poisoning HTF context.`);
  return [];
}

function completedHtfAggregateBars(bars: NinjaBridgeBar[], timeframe: MarketBarTimeframe, requestedTo: string): NinjaBridgeBar[] {
  if (timeframe === '5m') return bars;
  const requestedToMs = barTimeMs(requestedTo);
  if (requestedToMs === null) return bars;
  const timeframeMs = timeframeMinutes(timeframe) * 60_000;
  return bars.filter((bar) => {
    const openMs = barTimeMs(bar.time);
    return openMs !== null && openMs + timeframeMs <= requestedToMs;
  });
}

function scannerBarsWithinWindow(bars: NinjaBridgeBar[], from: string, to: string): NinjaBridgeBar[] {
  const fromMs = barTimeMs(from);
  const toMs = barTimeMs(to);
  if (fromMs === null || toMs === null) return [];
  return bars.filter((bar) => {
    const time = barTimeMs(bar.time);
    return time !== null && time >= fromMs && time <= toMs;
  });
}

export function verifiedFiveMinuteAggregationRepair(args: {
  timeframe: MarketBarTimeframe;
  bars: NinjaBridgeBar[];
  requestedFrom: string;
  requestedTo: string;
  bridgeInstrument: string;
}): { bars: NinjaBridgeBar[]; verification: MarketDataWindowVerification } | null {
  if (args.timeframe === '5m' || !args.bars.length) return null;
  const verification = verifyMarketDataWindow({
    bars: args.bars,
    timeframe: args.timeframe,
    requestedFrom: args.requestedFrom,
    requestedTo: args.requestedTo,
    requiredLookbackDays: SCANNER_REQUIRED_HISTORY_LOOKBACK_DAYS,
    minimumBars: SCANNER_HISTORY_MIN_BARS[args.timeframe],
    source: 'market_bars_bridge_repair',
    cacheBars: 0,
    bridgeRepairBars: args.bars.length,
    bridgeInstrument: args.bridgeInstrument,
  });
  if (!verification.sufficient) return null;
  return { bars: mergeBars([], args.bars), verification };
}

export function scannerHistoryNeedsFiveMinuteAggregationRepair(args: {
  timeframe: MarketBarTimeframe;
  bars: NinjaBridgeBar[];
  requestedFrom: string;
  requestedTo: string;
  bridgeInstrument: string;
}): boolean {
  if (args.timeframe === '5m') return false;
  const verification = verifyMarketDataWindow({
    bars: args.bars,
    timeframe: args.timeframe,
    requestedFrom: args.requestedFrom,
    requestedTo: args.requestedTo,
    requiredLookbackDays: SCANNER_REQUIRED_HISTORY_LOOKBACK_DAYS,
    minimumBars: SCANNER_HISTORY_MIN_BARS[args.timeframe],
    source: 'market_bars_bridge_repair',
    cacheBars: 0,
    bridgeRepairBars: args.bars.length,
    bridgeInstrument: args.bridgeInstrument,
  });
  return !verification.sufficient;
}

function targetTimeframeBucketStartEt(value: string, timeframe: MarketBarTimeframe): string | null {
  const normalized = normalizeCandleTimeEt(value);
  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  if (!match) return null;
  const minutes = timeframeMinutes(timeframe);
  const minuteOfDay = Number(match[2]) * 60 + Number(match[3]);
  const bucketMinute = Math.floor(minuteOfDay / minutes) * minutes;
  return `${match[1]}T${String(Math.floor(bucketMinute / 60)).padStart(2, '0')}:${String(bucketMinute % 60).padStart(2, '0')}:00`;
}

export function aggregateScannerFiveMinuteBarsToTimeframe(
  bars: NinjaBridgeBar[],
  targetTimeframe: MarketBarTimeframe,
): NinjaBridgeBar[] {
  const sorted = mergeBars([], bars);
  if (targetTimeframe === '5m') return sorted;
  const buckets = new Map<string, NinjaBridgeBar[]>();
  for (const bar of sorted) {
    const bucket = targetTimeframeBucketStartEt(bar.time, targetTimeframe);
    if (!bucket) continue;
    const list = buckets.get(bucket) || [];
    list.push(bar);
    buckets.set(bucket, list);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, bucketBars]) => {
      const ordered = mergeBars([], bucketBars);
      return {
        time,
        open: ordered[0].open,
        high: Math.max(...ordered.map((bar) => bar.high)),
        low: Math.min(...ordered.map((bar) => bar.low)),
        close: ordered[ordered.length - 1].close,
        volume: ordered.reduce((sum, bar) => sum + (Number(bar.volume) || 0), 0),
      };
    });
}

async function fetchFiveMinuteBarsForHtfAggregation(args: {
  config: ScannerConfig;
  from: string;
  to: string;
  limit: number;
  marketConfig: MarketDataConfig | null;
  contractLegs?: BridgeContractLeg[];
}): Promise<NinjaBridgeBar[]> {
  const contractLegs = args.contractLegs?.length ? args.contractLegs : scannerHistoryContractLegs(args.config, args.from, args.to);
  let cached5m: NinjaBridgeBar[] = [];
  if (args.marketConfig) {
    const chunks: NinjaBridgeBar[][] = [];
    for (const leg of contractLegs) {
      const legWindow = scannerHistoryLegWindow(leg, args.from, args.to);
      try {
        chunks.push(await fetchCachedMarketBars({
          instrument: leg.bridgeInstrument,
          timeframe: '5m',
          from: legWindow.from,
          to: legWindow.to,
          config: args.marketConfig,
          limit: args.limit,
        }));
      } catch (error) {
        console.warn(`[scanner-history] 5m: market_bars preload for HTF aggregation failed for ${leg.bridgeInstrument}, attempting bridge repair: ${formatError(error)}`);
      }
    }
    cached5m = mergeBars([], chunks.flat());
  }
  const cacheSufficient = barsCoverRequestedLookback(cached5m, args.from, args.to, '5m');
  if (cacheSufficient) return cached5m;

  try {
    const bridgeChunks: NinjaBridgeBar[][] = [];
    for (const leg of contractLegs) {
      const legWindow = scannerHistoryLegWindow(leg, args.from, args.to);
      const historical = await getNinjaHistoricalBars({
        instrument: leg.bridgeInstrument,
        timeframe: '5m',
        from: legWindow.from,
        to: legWindow.to,
        limit: args.limit,
        baseUrl: args.config.bridgeUrl,
      });
      bridgeChunks.push(historical.ok ? historical.bars || [] : []);
      if (!historical.ok) {
        console.warn(`[scanner-history] 5m: bridge repair for HTF aggregation returned no ${leg.bridgeInstrument} bars for ${legWindow.from} to ${legWindow.to}: ${historical.error || 'unknown error'}`);
      }
    }
    const repair5m = scannerHistoryRepairBarsForTimeframe(
      '5m',
      bridgeChunks.flat(),
      '5m bridge repair for HTF aggregation',
    );
    if (!repair5m.length) {
      console.warn(`[scanner-history] 5m: bridge repair for HTF aggregation returned no usable bars for ${args.from} to ${args.to}.`);
      return cached5m;
    }
    if (args.marketConfig) {
      for (const leg of contractLegs) {
        const legWindow = scannerHistoryLegWindow(leg, args.from, args.to);
        const legBars = scannerBarsWithinWindow(repair5m, legWindow.from, legWindow.to);
        if (!legBars.length) continue;
        try {
          const upsertResult = await upsertMarketBars({
            bars: legBars,
            instrument: args.config.instrument,
            bridgeInstrument: leg.bridgeInstrument,
            timeframe: '5m',
            config: args.marketConfig,
          });
          warnScannerMarketBarsUpsertSkippedOnce({ label: 'scanner-history', timeframe: '5m', result: upsertResult });
        } catch (error) {
          console.warn(`[scanner-history] 5m: HTF aggregation repair bars loaded but ${leg.bridgeInstrument} cache upsert failed: ${formatError(error)}`);
        }
      }
    }
    return mergeBars(repair5m, cached5m);
  } catch (error) {
    console.warn(`[scanner-history] 5m: bridge repair for HTF aggregation failed: ${formatError(error)}`);
    return cached5m;
  }
}

async function fetchLiveBars(config: ScannerConfig): Promise<Record<MarketBarTimeframe, NinjaBridgeBar[]>> {
  const entries = await Promise.all(TIMEFRAMES.map(async (timeframe) => {
    const bars = await fetchFreshBridgeBars(config, timeframe, 220);
    if (!bars.length) return [timeframe, []] as const;
    const marketConfig = loadMarketDataConfig();
    if (marketConfig) {
      try {
        const upsertResult = await upsertMarketBars({
          bars,
          instrument: config.instrument,
          bridgeInstrument: config.bridgeInstrument,
          timeframe,
          config: marketConfig,
        });
        warnScannerMarketBarsUpsertSkippedOnce({ label: 'scanner-cache', timeframe, result: upsertResult });
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
  const contractLegs = scannerHistoryContractLegs(args.config, args.from, args.to);
  const contractLegSummary = contractLegs.map((leg) => `${leg.bridgeInstrument}:${leg.fromDate}->${leg.toDate}`);
  let cached: NinjaBridgeBar[] = [];
  if (marketConfig) {
    const chunks: NinjaBridgeBar[][] = [];
    for (const leg of contractLegs) {
      const legWindow = scannerHistoryLegWindow(leg, args.from, args.to);
      try {
        chunks.push(await fetchCachedMarketBars({
          instrument: leg.bridgeInstrument,
          timeframe: args.timeframe,
          from: legWindow.from,
          to: legWindow.to,
          config: marketConfig,
          limit: args.limit,
        }));
      } catch (error) {
        console.warn(`[scanner-history] ${args.timeframe}: market_bars preload failed for ${leg.bridgeInstrument}, attempting bridge self-heal: ${formatError(error)}`);
      }
    }
    cached = mergeBars([], chunks.flat());
  }

  let repaired: NinjaBridgeBar[] = [];
  let fiveMinuteAggregationRepairBars = 0;
  const cacheSufficient = barsCoverRequestedLookback(cached, args.from, args.to, args.timeframe);
  if (!cacheSufficient) {
    const bridgeChunks: NinjaBridgeBar[][] = [];
    for (const leg of contractLegs) {
      const legWindow = scannerHistoryLegWindow(leg, args.from, args.to);
      try {
        const historical = await getNinjaHistoricalBars({
          instrument: leg.bridgeInstrument,
          timeframe: args.timeframe,
          from: legWindow.from,
          to: legWindow.to,
          limit: args.limit,
          baseUrl: args.config.bridgeUrl,
        });
        if (historical.ok && historical.bars?.length) {
          bridgeChunks.push(historical.bars);
        } else {
          console.warn(`[scanner-history] ${args.timeframe}: bridge self-heal returned no ${leg.bridgeInstrument} bars for ${legWindow.from} to ${legWindow.to}: ${historical.error || 'unknown error'}`);
        }
      } catch (error) {
        console.warn(`[scanner-history] ${args.timeframe}: bridge self-heal failed for ${leg.bridgeInstrument}: ${formatError(error)}`);
      }
    }
    repaired = scannerHistoryRepairBarsForTimeframe(
      args.timeframe,
      bridgeChunks.flat(),
      'bridge self-heal',
    );
    if (!repaired.length) {
      console.warn(`[scanner-history] ${args.timeframe}: bridge self-heal returned no usable bars for ${args.from} to ${args.to}.`);
    } else if (marketConfig) {
      for (const leg of contractLegs) {
        const legWindow = scannerHistoryLegWindow(leg, args.from, args.to);
        const legBars = scannerBarsWithinWindow(repaired, legWindow.from, legWindow.to);
        if (!legBars.length) continue;
        try {
          const upsertResult = await upsertMarketBars({
            bars: legBars,
            instrument: args.config.instrument,
            bridgeInstrument: leg.bridgeInstrument,
            timeframe: args.timeframe,
            config: marketConfig,
          });
          warnScannerMarketBarsUpsertSkippedOnce({ label: 'scanner-history', timeframe: args.timeframe, result: upsertResult });
        } catch (error) {
          console.warn(`[scanner-history] ${args.timeframe}: self-healed ${leg.bridgeInstrument} bars loaded but cache upsert failed: ${formatError(error)}`);
        }
      }
    }
  }

  let bars = mergeBars(repaired, cached);
  if (!barsCoverRequestedLookback(bars, args.from, args.to, args.timeframe)) {
    const segmented = scannerHistoryRepairBarsForTimeframe(
      args.timeframe,
      await fetchSegmentedBridgeHistoryRepair({
        config: args.config,
        timeframe: args.timeframe,
        from: args.from,
        to: args.to,
        limit: args.limit,
        contractLegs,
      }),
      'segmented bridge repair',
    );
    if (segmented.length) {
      repaired = mergeBars(segmented, repaired);
      bars = mergeBars(repaired, cached);
      if (marketConfig) {
        for (const leg of contractLegs) {
          const legWindow = scannerHistoryLegWindow(leg, args.from, args.to);
          const legBars = scannerBarsWithinWindow(segmented, legWindow.from, legWindow.to);
          if (!legBars.length) continue;
          try {
            const upsertResult = await upsertMarketBars({
              bars: legBars,
              instrument: args.config.instrument,
              bridgeInstrument: leg.bridgeInstrument,
              timeframe: args.timeframe,
              config: marketConfig,
            });
            warnScannerMarketBarsUpsertSkippedOnce({ label: 'scanner-history', timeframe: args.timeframe, result: upsertResult });
          } catch (error) {
            console.warn(`[scanner-history] ${args.timeframe}: segmented self-healed ${leg.bridgeInstrument} bars loaded but cache upsert failed: ${formatError(error)}`);
          }
        }
      }
    }
  }
  if (scannerHistoryNeedsFiveMinuteAggregationRepair({
    timeframe: args.timeframe,
    bars,
    requestedFrom: args.from,
    requestedTo: args.to,
    bridgeInstrument: args.config.bridgeInstrument,
  })) {
    const sourceFiveMinuteBars = await fetchFiveMinuteBarsForHtfAggregation({
      config: args.config,
      from: args.from,
      to: args.to,
      limit: args.limit,
      marketConfig,
      contractLegs,
    });
    const rebuilt = scannerHistoryRepairBarsForTimeframe(
      args.timeframe,
      completedHtfAggregateBars(
        aggregateScannerFiveMinuteBarsToTimeframe(sourceFiveMinuteBars, args.timeframe),
        args.timeframe,
        args.to,
      ),
      'trusted 5M OHLC aggregation repair',
    );
    if (rebuilt.length) {
      fiveMinuteAggregationRepairBars = rebuilt.length;
      const verifiedRebuild = verifiedFiveMinuteAggregationRepair({
        timeframe: args.timeframe,
        bars: rebuilt,
        requestedFrom: args.from,
        requestedTo: args.to,
        bridgeInstrument: args.config.bridgeInstrument,
      });
      if (verifiedRebuild) {
        repaired = verifiedRebuild.bars;
        bars = verifiedRebuild.bars;
        console.log(`[scanner-history] ${args.timeframe}: rebuilt ${rebuilt.length} bars from trusted 5M OHLC and accepted them as sufficient HTF history after native HTF repair remained incomplete.`);
      } else {
        repaired = mergeBars(rebuilt, repaired);
        bars = mergeBars(repaired, cached);
        console.log(`[scanner-history] ${args.timeframe}: rebuilt ${rebuilt.length} bars from trusted 5M OHLC after native HTF repair remained incomplete.`);
      }
      if (marketConfig) {
        for (const leg of contractLegs) {
          const legWindow = scannerHistoryLegWindow(leg, args.from, args.to);
          const legBars = scannerBarsWithinWindow(rebuilt, legWindow.from, legWindow.to);
          if (!legBars.length) continue;
          try {
            const upsertResult = await upsertMarketBars({
              bars: legBars,
              instrument: args.config.instrument,
              bridgeInstrument: leg.bridgeInstrument,
              timeframe: args.timeframe,
              config: marketConfig,
            });
            warnScannerMarketBarsUpsertSkippedOnce({ label: 'scanner-history', timeframe: args.timeframe, result: upsertResult });
          } catch (error) {
            console.warn(`[scanner-history] ${args.timeframe}: 5M-derived self-healed ${leg.bridgeInstrument} bars loaded but cache upsert failed: ${formatError(error)}`);
          }
        }
      }
    } else {
      console.warn(`[scanner-history] ${args.timeframe}: trusted 5M OHLC aggregation repair did not produce usable ${args.timeframe} bars.`);
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
    bridgeInstrument: contractLegSummary.join(', '),
  });
  const coverage: ScannerHistoryCoverageRecord = {
    ...verification,
    fiveMinuteAggregationRepairBars,
    requiredLookbackDays: SCANNER_REQUIRED_HISTORY_LOOKBACK_DAYS,
    contractLegs: contractLegSummary,
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
          fiveMinuteAggregationRepairBars,
          contractLegs: contractLegSummary,
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
  if (!candidate) return null;
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
      audit = (await readRuntimeJson(path.join(auditDir, name))).value;
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

async function analysisFromBars(args: {
  config: ScannerConfig;
  session: LiveSession;
  tradeDate: string;
  bars: Record<MarketBarTimeframe, NinjaBridgeBar[]>;
  bars1m?: NinjaBridgeBar[];
  htfBars5m?: NinjaBridgeBar[];
  asOf?: Date;
}): Promise<AnalysisResult> {
  const baseChartContext = buildNinjaChartContext({
    bars1m: args.bars1m,
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
  candidate?: SetupCandidate | null;
  normalized?: ReturnType<typeof buildAppTradePlan> | null;
}): SetupCandidate | null {
  const direction = args.deskState.primaryDeskPlay.direction;
  if (direction !== 'LONG' && direction !== 'SHORT') return null;
  if (
    args.candidate?.direction === direction &&
    isFiniteTradePrice(args.candidate.entry) &&
    isFiniteTradePrice(args.candidate.stop)
  ) {
    return args.candidate;
  }
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
  candidate?: SetupCandidate | null;
  normalized?: ReturnType<typeof buildAppTradePlan> | null;
}): Pick<SetupCandidate, 'entry' | 'stop' | 'target1' | 'target2' | 'riskPoints'> {
  const direction = args.deskState.primaryDeskPlay.direction;
  if (direction !== 'LONG' && direction !== 'SHORT') {
    return { entry: null, stop: null, target1: null, target2: null, riskPoints: null };
  }
  const freshBest = args.deskState.primaryDeskPlay.freshReentryCandidates?.approvalStatus === 'approved_discord_conditional_display' &&
    args.deskState.primaryDeskPlay.freshReentryCandidates.bestCandidate?.status === 'ready_for_owner_review' &&
    args.deskState.primaryDeskPlay.freshReentryCandidates.bestCandidate.direction === direction
    ? args.deskState.primaryDeskPlay.freshReentryCandidates.bestCandidate
    : null;
  const freshLevels = validDeskPlayPlanningLevels(
    direction,
    freshBest?.entry,
    freshBest?.stop,
    false,
  );
  if (freshLevels) return freshLevels;
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
  currentPrice?: number | null,
  selectedCandidate?: SetupCandidate | null,
): SetupCandidate | null {
  const play = deskState.primaryDeskPlay;
  if (!play.discordEligible || (play.direction !== 'LONG' && play.direction !== 'SHORT')) return null;
  const primaryBias = play.direction === 'LONG' ? play.longBias : play.shortBias;
  const planningLevels = deskPlayPlanningLevels({ deskState, normalized, candidate: selectedCandidate });
  const lineInSand = deskPlayLineForDirection(deskState, play.direction) ?? play.lineInSand;
  const arming = scannerDeskPlayFallbackArmingState({
    direction: play.direction,
    line: lineInSand,
    currentPrice: currentPrice ?? null,
    canExecute: deskState.canExecute,
  });
  const hasPlanningLevels = arming.armed &&
    isFiniteTradePrice(planningLevels.entry) &&
    isFiniteTradePrice(planningLevels.stop) &&
    isFiniteTradePrice(planningLevels.target1) &&
    isFiniteTradePrice(planningLevels.target2);
  const blockers = Array.from(new Set([
    ...primaryBias.blockers,
    'canExecute=false',
    hasPlanningLevels
      ? 'Desk Play chart shows review-only app-owned planning levels.'
      : arming.reason || 'Protected 5M structure stop not confirmed; planning levels unavailable.',
    ...(play.counterStructureConditional?.counterStructureConditional
      ? ['Review Only - counter-structure conditional; not execution approval.']
      : []),
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
    entry: hasPlanningLevels ? planningLevels.entry : null,
    stop: hasPlanningLevels ? planningLevels.stop : null,
    target1: hasPlanningLevels ? planningLevels.target1 : null,
    target2: hasPlanningLevels ? planningLevels.target2 : null,
    riskPoints: hasPlanningLevels ? planningLevels.riskPoints : null,
    invalidation: play.invalidation || deskState.invalidation || null,
    decisionQualityScore: primaryBias.decisionQualityScore ?? primaryBias.rankScore ?? null,
    decisionQualityScorecard: deskPlaySideQualityScorecard(play.longBias, play.shortBias),
    decisionQualityRecommendation: hasPlanningLevels
      ? 'Review planning levels only: targets are app-computed from entry to protected structure stop; canExecute remains false.'
      : arming.reason || 'Desk Play context only: wait for completed 5M proof and protected structure stop.',
    rankScore: primaryBias.rankScore ?? null,
    evidence: [
      play.summary,
      primaryBias.reason,
      play.countertrendWarning,
      play.counterStructureConditional?.counterStructureConditional
        ? `Counter-structure conditional map: ${play.counterStructureConditional.lowerTimeframeStateSummary}; ${play.counterStructureConditional.requiredTrigger}`
        : null,
      ...play.notes,
    ].filter((value): value is string => Boolean(value)),
    missingEvidence: blockers,
    missingLevels: [],
    executionStatus: ExecutionStatus.Conditional,
    blockReason: NoTradeReason.EntryTriggerPending,
    requiredTrigger: play.nextTrigger || deskState.nextTrigger || primaryBias.nextTrigger || null,
    nextAction: arming.reason || play.noChase || 'No chase. Wait for completed 5M proof and app-owned gates.',
    reducedRiskPlan: null,
    activeRuleset: {
      htfLineInSand: {
        applied: true,
        status: 'not_applicable',
        required: 'completed_5m_or_15m_close_beyond_htf_line',
        appliesToAllModels: true,
        affectsExecution: false,
        direction: play.direction,
        lineInSand,
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

export function candidateForDeskPublishDecisionChart(
  publishDecision: DeskPublishDecision | null | undefined,
  fallback?: SetupCandidate | null,
): SetupCandidate | null {
  if (
    !publishDecision?.shouldPost ||
    !publishDecision.hasCompletePlan ||
    (publishDecision.direction !== 'LONG' && publishDecision.direction !== 'SHORT') ||
    !isFiniteTradePrice(publishDecision.entry) ||
    !isFiniteTradePrice(publishDecision.stop) ||
    !isFiniteTradePrice(publishDecision.t1) ||
    !isFiniteTradePrice(publishDecision.t2)
  ) {
    return null;
  }
  const riskPoints = Math.abs(roundToTradeTick(publishDecision.entry) - roundToTradeTick(publishDecision.stop));
  return {
    ...(fallback || {}),
    setupType: publishDecision.setupType || fallback?.setupType || SetupType.NoSetup,
    scenarioLabel: fallback?.scenarioLabel || `${publishDecision.direction} Canonical Desk Ticket`,
    direction: publishDecision.direction,
    detectedStatus: fallback?.detectedStatus || SetupCandidateStatus.Conditional,
    confidence: fallback?.confidence || 'High',
    priority: fallback?.priority ?? 0,
    entry: roundToTradeTick(publishDecision.entry),
    stop: roundToTradeTick(publishDecision.stop),
    target1: roundToTradeTick(publishDecision.t1),
    target2: roundToTradeTick(publishDecision.t2),
    riskPoints,
    invalidation: publishDecision.invalidationText || fallback?.invalidation || null,
    decisionQualityScore: fallback?.decisionQualityScore ?? null,
    decisionQualityScorecard: fallback?.decisionQualityScorecard || [],
    decisionQualityRecommendation: publishDecision.discordReason || fallback?.decisionQualityRecommendation || null,
    rankScore: fallback?.rankScore ?? null,
    evidence: [
      ...(fallback?.evidence || []),
      'Display-only chart candidate rebuilt from scanner-owned DeskPublishDecision.',
    ],
    missingEvidence: fallback?.missingEvidence || [],
    missingLevels: [],
    executionStatus: fallback?.executionStatus || ExecutionStatus.Conditional,
    blockReason: fallback?.blockReason ?? NoTradeReason.EntryTriggerPending,
    requiredTrigger: publishDecision.triggerCondition || fallback?.requiredTrigger || null,
    nextAction: publishDecision.triggerCondition || fallback?.nextAction || null,
    reducedRiskPlan: fallback?.reducedRiskPlan || null,
  } as SetupCandidate;
}

export function scannerSniperTriggerWatchMetadata(args: {
  deskState?: DeskState | null;
  normalized: ReturnType<typeof buildAppTradePlan>;
  candidate: SetupCandidate | null;
}): ScannerSniperTriggerWatchMetadata {
  const direction = args.deskState?.primaryDeskPlay.direction === 'LONG' || args.deskState?.primaryDeskPlay.direction === 'SHORT'
    ? args.deskState.primaryDeskPlay.direction
    : args.candidate?.direction === 'LONG' || args.candidate?.direction === 'SHORT'
      ? args.candidate.direction
      : null;
  const lineInSand = direction && args.deskState
    ? deskPlayLineForDirection(args.deskState, direction)
    : null;
  const referenceEntry = isFiniteTradePrice(args.normalized.entry)
    ? roundToTradeTick(args.normalized.entry)
    : isFiniteTradePrice(args.candidate?.entry)
      ? roundToTradeTick(args.candidate.entry)
      : lineInSand;
  const referenceStop = isFiniteTradePrice(args.normalized.stop)
    ? roundToTradeTick(args.normalized.stop)
    : isFiniteTradePrice(args.candidate?.stop)
      ? roundToTradeTick(args.candidate.stop)
      : null;
  const referenceTarget1 = isFiniteTradePrice(args.normalized.t1)
    ? roundToTradeTick(args.normalized.t1)
    : isFiniteTradePrice(args.candidate?.target1)
      ? roundToTradeTick(args.candidate.target1)
      : null;
  const referenceTarget2 = isFiniteTradePrice(args.normalized.t2)
    ? roundToTradeTick(args.normalized.t2)
    : isFiniteTradePrice(args.candidate?.target2)
      ? roundToTradeTick(args.candidate.target2)
      : null;
  const hasReferenceLevels = Boolean(
    direction &&
    isFiniteTradePrice(referenceEntry) &&
    isFiniteTradePrice(referenceStop) &&
    isFiniteTradePrice(referenceTarget1) &&
    isFiniteTradePrice(referenceTarget2)
  );
  const executable = getEffectiveCanExecute(args.normalized) || args.deskState?.canExecute === true;
  const eligible = hasReferenceLevels && !executable;
  const through = direction === 'SHORT' ? 'below' : 'above';
  return {
    label: 'Line-in-the-Sand Sniper Watch',
    eligible,
    status: 'research_only_discretionary',
    direction,
    lineInSand: isFiniteTradePrice(lineInSand) ? roundToTradeTick(lineInSand) : referenceEntry,
    referenceEntry: isFiniteTradePrice(referenceEntry) ? referenceEntry : null,
    referenceStop: isFiniteTradePrice(referenceStop) ? referenceStop : null,
    referenceTarget1: isFiniteTradePrice(referenceTarget1) ? referenceTarget1 : null,
    referenceTarget2: isFiniteTradePrice(referenceTarget2) ? referenceTarget2 : null,
    oneMinuteTimingRule: direction
      ? `Optional trader timing only: 1M body close ${through} the line may be logged for research, but it never approves execution.`
      : 'Optional trader timing only: 1M evidence may be logged for research, but it never approves execution.',
    fiveMinuteConfirmationRule: direction
      ? `Required before discretionary action review: completed 5M body close/hold ${through} the same line.`
      : 'Required before discretionary action review: completed 5M body close/hold through the same line.',
    reason: eligible
      ? 'Non-executable scanner plan has complete tactical levels and may be studied as a discretionary line-in-the-sand sniper watch.'
      : executable
        ? 'Executable scanner plans use the normal app-owned trade path, not the sniper-watch research tag.'
        : 'Sniper-watch research tag unavailable because direction or complete tactical levels are missing.',
    approvalBoundary: {
      changesTradeApprovals: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      changesRiskRules: false,
      createsNewModel: false,
      oneMinuteApprovesExecution: false,
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
  tradeDecisionMapAudit?: TradeDecisionMapAudit | null;
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
  const tradeDecisionMapAudit = args.tradeDecisionMapAudit || buildTradeDecisionMapAudit();
  const sniperTriggerWatch = scannerSniperTriggerWatchMetadata({
    deskState: args.deskState,
    normalized: args.normalized,
    candidate: args.candidate,
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
      sniperTriggerWatch.eligible
        ? `Research tag: ${sniperTriggerWatch.label}. 1M timing is discretionary only; completed 5M close/hold remains required.`
        : null,
      'Outcome buttons record trader-confirmed review only; no automated orders are placed.',
    ].filter(Boolean).join(' '),
    trade_plan_json: {
      planVersionId: args.planVersionId,
      discordOutcomeButtons: true,
      journalRecord,
      normalizedPlan: args.normalized,
      setupCandidates: args.candidate ? [args.candidate] : [],
      visibility: args.visibilityMetadata || null,
      candidateLifecycleTrace: args.candidateLifecycleTrace || null,
      tradeDecisionMapAudit,
      deskState: args.deskState || null,
      sniperTriggerWatch,
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

export async function upsertScannerReversalWatchRagRecord(args: {
  planVersionId: string;
  session: LiveSession;
  tradeDate: string;
  instrument: Instrument;
  lines: ScannerReversalWatchLines;
  state: ScannerReversalWatchStateResult;
  currentPrice: number | null;
  chartMarkup: string | null;
  decisionTapePath: string;
  latestCompleted5m: string | null;
}): Promise<void> {
  const { config, missing } = resolveDiscordRagPersistenceConfig();
  if (!config) {
    console.warn(`Scanner Reversal Watch RAG/research seed skipped. Set ${missing.join(', ')} to let watch feedback buttons update RAG and research.`);
    return;
  }

  const direction = args.lines.watchDirection === 'LONG' || args.lines.watchDirection === 'SHORT'
    ? args.lines.watchDirection
    : null;
  const referenceRiskPoints = isFiniteTradePrice(args.lines.referenceEntry) && isFiniteTradePrice(args.lines.referenceStop)
    ? Math.abs(args.lines.referenceEntry - args.lines.referenceStop)
    : null;
  const embeddingText = [
    `Tactical Reversal Watch pending trader feedback for ${args.session} ${args.instrument} on ${args.tradeDate}.`,
    `Watch direction: ${direction || 'N/A'}; state at post: ${args.state.state}.`,
    `Line in the Sand: ${args.lines.triggerLine ?? 'N/A'}; invalid: ${args.lines.invalidLine ?? 'N/A'}; no chase: ${args.lines.noChaseLine ?? 'N/A'}.`,
    'Feedback buttons record learning and research evidence only. They do not approve execution, change canExecute, or place orders.',
  ].join(' ');

  const payload = {
    session_type: args.session,
    trade_date: args.tradeDate,
    day_of_week: getDayOfWeek(args.tradeDate),
    instrument: args.instrument,
    trade_result: 'pending',
    outcome: 'watch_feedback_pending',
    source: 'discord_reversal_watch',
    analysis_mode: 'live',
    setup_quality_score: 0.5,
    entry_price: args.lines.referenceEntry ?? args.lines.triggerLine ?? null,
    stop_price: args.lines.referenceStop ?? args.lines.invalidLine ?? null,
    target_1_price: args.lines.referenceTarget1 ?? null,
    target_2_price: args.lines.referenceTarget2 ?? null,
    risk_points: referenceRiskPoints,
    embedding_text: embeddingText,
    trade_plan_json: {
      planVersionId: args.planVersionId,
      discordWatchFeedbackButtons: true,
      watchType: 'tactical_reversal_watch',
      researchTrack: 'tactical_reversal_watch',
      researchOutcomeFeedback: {
        status: 'pending',
        source: 'discord_watch_feedback_button',
        researchUseOnly: true,
        feedbackCode: null,
        feedbackLabel: null,
      },
      reversalWatch: {
        tradeDate: args.tradeDate,
        session: args.session,
        instrument: args.instrument,
        latestCompleted5m: args.latestCompleted5m,
        currentPrice: args.currentPrice,
        state: args.state,
        lines: args.lines,
        chartMarkup: args.chartMarkup,
        decisionTapePath: args.decisionTapePath,
      },
      journalRecord: {
        dateTime: new Date().toISOString(),
        instrument: args.instrument,
        session: args.session,
        modelType: 'Tactical Reversal Watch',
        setupTags: ['tactical_reversal_watch', 'watch_only', 'research_feedback_pending'],
        direction,
        plannedR: null,
        outcome: 'pending',
        discordAlertId: args.planVersionId,
        notes: 'Tactical Reversal Watch posted. Awaiting trader feedback button for learning/research only.',
      },
      approvalBoundary: {
        discordWatchFeedbackApprovesTrade: false,
        researchFeedbackChangesCanExecute: false,
        buttonClickPlacesOrder: false,
        changesEntryStopTargets: false,
        changesRiskRules: false,
      },
    },
    notes: 'Tactical Reversal Watch posted. Awaiting trader feedback button for learning/research only.',
  };

  await upsertDiscordAlertRagPayload({
    config,
    planVersionId: args.planVersionId,
    payload,
    errorLabel: 'Scanner Reversal Watch RAG/research seed',
  });
}

async function attachDiscordMessageReceiptToRagRecord(args: {
  planVersionId: string;
  discordMessageId: string | null;
  webhookSource: ScannerDiscordDeliverySource;
}): Promise<boolean> {
  if (!args.discordMessageId) return false;
  const { config } = resolveDiscordRagPersistenceConfig();
  if (!config) return false;
  try {
    return await attachDiscordMessageReceiptToRagPayload({
      config,
      planVersionId: args.planVersionId,
      discordMessageId: args.discordMessageId,
      webhookSource: realDiscordWebhookSource(args.webhookSource),
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
    SetupType.NoSetup,
    SetupType.NoSetup,
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

function tacticalCampaignHtfFvgTimeframes(item: ScannerCandidateLifecycleTraceItem | null): string[] {
  if (!item || item.direction === 'NO TRADE' || item.setupType !== SetupType.NoSetup) return [];
  const text = [
    item.scenarioLabel,
    item.candidateState,
    item.nextTrigger,
    item.requiredTrigger,
    item.lineInSandReason,
    item.targetReactionReason,
    item.blockReason,
    item.filteredOutReason,
    ...(Array.isArray(item.missingEvidence) ? item.missingEvidence : []),
    ...(Array.isArray(item.missingLevels) ? item.missingLevels : []),
  ].filter(Boolean).join(' ').toUpperCase();
  if (!/\b(FVG|FAIR VALUE GAP|PARENT FVG|HTF)\b/.test(text)) return [];
  const timeframes = [
    /\b15M\b|\b15\s*MIN/.test(text) ? '15M' : null,
    /\b60M\b|\b1H\b|\b60\s*MIN/.test(text) ? '60M' : null,
    /\b120M\b|\b2H\b|\b120\s*MIN/.test(text) ? '120M' : null,
    /\b240M\b|\b4H\b|\b240\s*MIN/.test(text) ? '240M' : null,
  ].filter((value): value is string => Boolean(value));
  return Array.from(new Set(timeframes.length ? timeframes : ['HTF_FVG']));
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
    contextTimeframes: [] as string[],
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
    return {
      ...base,
      reason: 'HTF campaign promotion blocked because scanner context is data-limited or insufficient; review-map tactical levels only.',
    };
  }
  if (primaryBias && primaryBias.state !== 'primary') {
    return { ...base, reason: `${direction} is ${primaryBias.state}, not the primary tactical desk side.` };
  }

  const rows = play.htfProtectedStructureMap?.rows || [];
  const contextTimeframes = rows
    .filter((row) => (row.timeframe === '4H' || row.timeframe === '2H' || row.timeframe === '1H') && htfRowSupportsDirection(row, direction))
    .map((row) => row.timeframe);
  const protectedFiveMinuteAligned = rows.some((row) => row.timeframe === '5M' && htfRowSupportsDirection(row, direction));
  const lifecycleFiveMinuteAligned = lifecycleItemShowsFiveMinuteTacticalShift(scannerDeskPlayPrimaryLifecycle(args.deskState), direction);
  const htfFvgTimeframes = tacticalCampaignHtfFvgTimeframes(scannerDeskPlayPrimaryLifecycle(args.deskState));
  const executionTimeframeAligned = protectedFiveMinuteAligned || lifecycleFiveMinuteAligned;
  const campaignMap = {
    ...base,
    contextTimeframes: Array.from(new Set([...contextTimeframes, ...htfFvgTimeframes])),
    executionTimeframeAligned,
    executionEvidenceSource: protectedFiveMinuteAligned
      ? 'protected_structure_5m' as const
      : lifecycleFiveMinuteAligned
        ? 'candidate_lifecycle_5m' as const
        : null,
  };
  if (!campaignMap.contextTimeframes.length) {
    return { ...campaignMap, reason: `${direction} tactical campaign watch blocked because no aligned 1H/2H/4H protected-structure row is present.` };
  }
  if (!executionTimeframeAligned) {
    return { ...campaignMap, reason: `${direction} tactical campaign watch blocked because 5M protected-structure row is not aligned.` };
  }

  return {
    ...campaignMap,
    eligible: true,
    reason: `${direction} tactical campaign watch eligible from ${campaignMap.contextTimeframes.join('/')} support plus ${campaignMap.executionEvidenceSource === 'candidate_lifecycle_5m' ? 'app-owned 5M candidate lifecycle evidence' : 'aligned completed 5M structure'}. Execution remains blocked until app-owned canExecute is true.`,
  };
}

function scannerOppositeDirection(direction: ScannerReversalWatchDirection): ScannerReversalWatchDirection {
  return direction === 'LONG' ? 'SHORT' : 'LONG';
}

function roundNullableTradePrice(value: unknown): number | null {
  return isFiniteTradePrice(value) ? roundToTradeTick(value) : null;
}

function assertScannerDeskPublishArtifactAgreement(args: {
  publishDecision?: DeskPublishDecision | null;
  deskState: DeskState;
  contextCandidate: SetupCandidate | null;
  contextLine?: number | null;
}): void {
  const publishDecision = args.publishDecision;
  if (!publishDecision?.shouldPost || !publishDecision.hasCompletePlan) return;
  const expectedDirection = publishDecision.direction;
  if (expectedDirection !== 'LONG' && expectedDirection !== 'SHORT') {
    throw new Error('DeskPublishDecision artifact agreement failed: publishable decision must have LONG or SHORT direction.');
  }
  const ticket = args.deskState.deskTicket;
  const mismatches: string[] = [];
  const samePrice = (a: unknown, b: unknown): boolean => roundNullableTradePrice(a) === roundNullableTradePrice(b);
  if (ticket.primaryDirection !== expectedDirection) mismatches.push(`ticket direction ${ticket.primaryDirection} != ${expectedDirection}`);
  if (!samePrice(ticket.entry, publishDecision.entry)) mismatches.push(`ticket entry ${ticket.entry} != ${publishDecision.entry}`);
  if (!samePrice(ticket.stop, publishDecision.stop)) mismatches.push(`ticket stop ${ticket.stop} != ${publishDecision.stop}`);
  if (!samePrice(ticket.t1, publishDecision.t1)) mismatches.push(`ticket T1 ${ticket.t1} != ${publishDecision.t1}`);
  if (!samePrice(ticket.t2, publishDecision.t2)) mismatches.push(`ticket T2 ${ticket.t2} != ${publishDecision.t2}`);
  if (!samePrice(ticket.lineInSand, publishDecision.lineInSand)) mismatches.push(`ticket line ${ticket.lineInSand} != ${publishDecision.lineInSand}`);
  if (!samePrice(args.contextLine, publishDecision.lineInSand)) mismatches.push(`chart context line ${args.contextLine} != ${publishDecision.lineInSand}`);
  const candidate = args.contextCandidate;
  if (!candidate) {
    mismatches.push('chart candidate missing');
  } else {
    if (candidate.direction !== expectedDirection) mismatches.push(`chart direction ${candidate.direction} != ${expectedDirection}`);
    if (!samePrice(candidate.entry, publishDecision.entry)) mismatches.push(`chart entry ${candidate.entry} != ${publishDecision.entry}`);
    if (!samePrice(candidate.stop, publishDecision.stop)) mismatches.push(`chart stop ${candidate.stop} != ${publishDecision.stop}`);
    if (!samePrice(candidate.target1, publishDecision.t1)) mismatches.push(`chart T1 ${candidate.target1} != ${publishDecision.t1}`);
    if (!samePrice(candidate.target2, publishDecision.t2)) mismatches.push(`chart T2 ${candidate.target2} != ${publishDecision.t2}`);
  }
  if (mismatches.length > 0) {
    throw new Error(`DeskPublishDecision artifact agreement failed: ${mismatches.join('; ')}`);
  }
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
    referenceEntry: null,
    referenceStop: null,
    referenceTarget1: null,
    referenceTarget2: null,
    referenceReason: null,
    reason,
    sourceFields,
    approvalBoundary,
  });

  if (!exhaustedSide || !watchDirection) return empty('No active LONG/SHORT campaign is available for reversal-watch line building.');
  if (args.deskState.canExecute) return empty('Executable plans use the trade-alert path; reversal-watch lines stay review metadata only.');

  const exhausted = scannerLifecycleForDirection(args.deskState, exhaustedSide);
  const watch = scannerLifecycleForDirection(args.deskState, watchDirection);
  const activeZone = play.activeTacticalZone;
  const completedClose = roundNullableTradePrice(args.completed5m?.close);
  const activeZoneFailed = Boolean(
    activeZone?.direction === exhaustedSide &&
    completedClose !== null &&
    (
      exhaustedSide === 'LONG'
        ? roundNullableTradePrice(activeZone.lower) !== null && completedClose < (roundNullableTradePrice(activeZone.lower) as number)
        : roundNullableTradePrice(activeZone.upper) !== null && completedClose > (roundNullableTradePrice(activeZone.upper) as number)
    )
  );
  if (activeZoneFailed && activeZone) {
    const failedZoneLow = roundNullableTradePrice(activeZone.lower);
    const failedZoneHigh = roundNullableTradePrice(activeZone.upper);
    const triggerLine = roundNullableTradePrice(activeZone.anchorLine) ??
      (watchDirection === 'SHORT' ? failedZoneLow : failedZoneHigh);
    const invalidLine = watchDirection === 'SHORT' ? failedZoneHigh : failedZoneLow;
    const noChaseLine = triggerLine === null
      ? null
      : watchDirection === 'SHORT'
        ? roundNullableTradePrice(watch?.target1) ?? roundNullableTradePrice(play.targetReactionLevel) ?? roundNullableTradePrice(triggerLine - 8)
        : roundNullableTradePrice(watch?.target1) ?? roundNullableTradePrice(play.targetReactionLevel) ?? roundNullableTradePrice(triggerLine + 8);
    const referenceEntry = roundNullableTradePrice(watch?.entry);
    const referenceStop = roundNullableTradePrice(watch?.stop);
    const referenceTarget1 = roundNullableTradePrice(watch?.target1);
    const referenceTarget2 = roundNullableTradePrice(watch?.target2);
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
      reactionZoneLow: failedZoneLow,
      reactionZoneHigh: failedZoneHigh,
      reactionLabel: `${exhaustedSide} active tactical zone failed`,
      triggerLine,
      strongerTriggerLine: roundNullableTradePrice(watch?.lineInSand),
      invalidLine,
      noChaseLine,
      reclaimRule: triggerLine === null ? null : reversalWatchRuleText(watchDirection, 'reclaim', triggerLine),
      retestRule: triggerLine === null ? null : reversalWatchRuleText(watchDirection, 'retest', triggerLine),
      invalidationRule: invalidLine === null ? null : reversalWatchRuleText(watchDirection, 'invalid', invalidLine),
      noChaseRule: noChaseLine === null ? null : reversalWatchRuleText(watchDirection, 'no_chase', noChaseLine),
      referenceEntry,
      referenceStop,
      referenceTarget1,
      referenceTarget2,
      referenceReason: [referenceEntry, referenceStop, referenceTarget1, referenceTarget2].some((value) => value !== null)
        ? 'tactical levels only from the existing opposite-side lifecycle. Reversal Watch does not approve execution; canExecute and normal app-owned gates still control.'
        : 'transition watch only. No opposite-side entry/stop/T1/T2 package is created until the scanner sees fresh completed 5M proof.',
      reason: missing.length
        ? `${exhaustedSide} active tactical zone failed by completed 5M close ${completedClose?.toFixed(2) || 'unknown'}, but ${missing.join(', ')} is missing.`
        : `${exhaustedSide} active tactical zone failed by completed 5M close ${completedClose?.toFixed(2) || 'unknown'}; ${watchDirection} transition watch is active below/above ${triggerLine?.toFixed(2) || 'the mapped line'}. Human review only; wait for completed 5M retest/hold before a full plan.`,
      sourceFields: Array.from(new Set([
        'primaryDeskPlay.activeTacticalZone',
        'completed5m.close',
        triggerLine !== null ? 'activeTacticalZone.anchorLine' : null,
        referenceEntry !== null || referenceStop !== null ? 'opposite-side lifecycle tactical levels' : null,
      ].filter((value): value is string => Boolean(value)))),
      approvalBoundary,
    };
  }
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
  const referenceEntry = roundNullableTradePrice(watch?.entry);
  const referenceStop = roundNullableTradePrice(watch?.stop);
  const referenceTarget1 = roundNullableTradePrice(watch?.target1);
  const referenceTarget2 = roundNullableTradePrice(watch?.target2);
  const referenceReason = [referenceEntry, referenceStop, referenceTarget1, referenceTarget2].some((value) => value !== null)
    ? 'tactical levels only from the existing opposite-side lifecycle. Reversal Watch does not approve execution; canExecute and normal app-owned gates still control.'
    : null;
  if (referenceReason) sourceFields.push('opposite-side lifecycle tactical levels');

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
    referenceEntry,
    referenceStop,
    referenceTarget1,
    referenceTarget2,
    referenceReason,
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
  if (play.activeTacticalZone?.standDown) return play.activeTacticalZone.standDown;
  if (play.activeTacticalLine?.standDown) return play.activeTacticalLine.standDown;
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

type ScannerCounterStructureConditional = NonNullable<DeskState['primaryDeskPlay']['counterStructureConditional']>;
type ScannerMtfPrimarySideArbitration = NonNullable<DeskState['primaryDeskPlay']['mtfPrimarySideArbitration']>;
type ScannerHtfTargetToLinePromotion = NonNullable<DeskState['primaryDeskPlay']['htfTargetToLinePromotion']>;

function scannerProtectedStructureRowSummary(
  row: DeskState['primaryDeskPlay']['htfProtectedStructureMap']['rows'][number],
): string {
  const current = row.currentBias || row.bias || 'UNKNOWN';
  return `${row.timeframe} ${current}`;
}

function scannerMtfRowSide(value: string | null | undefined): ScannerMtfPrimarySideArbitration['mtfPrimarySide'] {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'BULL' || normalized === 'BULLISH' || normalized === 'LONG') return 'LONG';
  if (normalized === 'BEAR' || normalized === 'BEARISH' || normalized === 'SHORT') return 'SHORT';
  if (normalized === 'DATA_LIMITED' || normalized === 'INSUFFICIENT') return 'DATA_LIMITED';
  return 'WAIT';
}

function scannerMtfConsensusSide(
  rows: DeskState['primaryDeskPlay']['htfProtectedStructureMap']['rows'],
): ScannerMtfPrimarySideArbitration['mtfPrimarySide'] {
  let longCount = 0;
  let shortCount = 0;
  let dataLimitedCount = 0;
  for (const row of rows) {
    const side = scannerMtfRowSide(row.currentBias || row.bias || row.status || null);
    if (side === 'LONG') longCount += 1;
    if (side === 'SHORT') shortCount += 1;
    if (side === 'DATA_LIMITED') dataLimitedCount += 1;
  }
  if (dataLimitedCount > 0 && longCount === 0 && shortCount === 0) return 'DATA_LIMITED';
  if (longCount > shortCount) return 'LONG';
  if (shortCount > longCount) return 'SHORT';
  return 'WAIT';
}

function scannerMtfProofToPromote(args: {
  direction: 'LONG' | 'SHORT';
  deskState: DeskState;
}): string {
  const play = args.deskState.primaryDeskPlay;
  const zone = play.activeTacticalZone?.direction === args.direction ? play.activeTacticalZone : null;
  const line = play.activeTacticalLine?.direction === args.direction && isFiniteTradePrice(play.activeTacticalLine.activeLine)
    ? play.activeTacticalLine.activeLine
    : args.direction === 'LONG'
      ? play.longAbove ?? play.lineInSand ?? args.deskState.lineInSand
      : play.shortBelow ?? play.lineInSand ?? args.deskState.lineInSand;
  if (zone?.nextTrigger) return zone.nextTrigger;
  if (play.nextTrigger) return play.nextTrigger;
  if (args.deskState.nextTrigger) return args.deskState.nextTrigger;
  if (isFiniteTradePrice(zone?.lower) && isFiniteTradePrice(zone?.upper)) {
    const zoneText = `${zone!.lower!.toFixed(2)}-${zone!.upper!.toFixed(2)}`;
    return args.direction === 'SHORT'
      ? `Completed 5M failure/rejection below ${zoneText} required before SHORT can become primary.`
      : `Completed 5M reclaim/hold above ${zoneText} required before LONG can become primary.`;
  }
  return args.direction === 'SHORT'
    ? `Completed 5M rejection/failure below ${isFiniteTradePrice(line) ? line!.toFixed(2) : 'the active line'} required before SHORT can become primary.`
    : `Completed 5M reclaim/hold above ${isFiniteTradePrice(line) ? line!.toFixed(2) : 'the active line'} required before LONG can become primary.`;
}

export function buildScannerMtfPrimarySideArbitration(args: {
  deskState: DeskState;
  candidate?: SetupCandidate | null;
  normalized?: ReturnType<typeof buildAppTradePlan> | null;
}): ScannerMtfPrimarySideArbitration {
  const play = args.deskState.primaryDeskPlay;
  const rows = play.htfProtectedStructureMap.rows || [];
  const candidateDirection = args.candidate?.direction === 'LONG' || args.candidate?.direction === 'SHORT'
    ? args.candidate.direction
    : play.direction === 'LONG' || play.direction === 'SHORT'
      ? play.direction
      : 'WAIT';
  const htfRows = rows.filter((row) => ['4H', '2H', '1H'].includes(row.timeframe));
  const lowerRows = rows.filter((row) => ['1H', '15M', '5M'].includes(row.timeframe));
  const mtfHtfSide = scannerMtfConsensusSide(htfRows);
  const mtfLowerTimeframeSide = scannerMtfConsensusSide(lowerRows);
  const dataLimited = args.deskState.htfContextStatus === 'insufficient' ||
    args.deskState.dataQualityStatus === 'data_limited' ||
    play.htfProtectedStructureMap.reliability === 'data_limited' ||
    mtfHtfSide === 'DATA_LIMITED' ||
    mtfLowerTimeframeSide === 'DATA_LIMITED';
  const mtfPrimarySide = dataLimited
    ? 'DATA_LIMITED'
    : mtfLowerTimeframeSide === 'LONG' || mtfLowerTimeframeSide === 'SHORT'
      ? mtfLowerTimeframeSide
      : mtfHtfSide === 'LONG' || mtfHtfSide === 'SHORT'
        ? mtfHtfSide
        : play.direction;
  const candidateIsDirectional = candidateDirection === 'LONG' || candidateDirection === 'SHORT';
  const candidateOpposesPrimary = candidateIsDirectional &&
    (mtfPrimarySide === 'LONG' || mtfPrimarySide === 'SHORT') &&
    candidateDirection !== mtfPrimarySide;
  const htfOpposesLower = (mtfHtfSide === 'LONG' || mtfHtfSide === 'SHORT') &&
    (mtfLowerTimeframeSide === 'LONG' || mtfLowerTimeframeSide === 'SHORT') &&
    mtfHtfSide !== mtfLowerTimeframeSide;
  const mtfArbitrationStatus: ScannerMtfPrimarySideArbitration['mtfArbitrationStatus'] = dataLimited
    ? 'data_limited'
    : mtfPrimarySide !== 'LONG' && mtfPrimarySide !== 'SHORT'
      ? 'wait'
      : candidateOpposesPrimary
        ? 'counter_structure'
        : htfOpposesLower || mtfHtfSide === 'WAIT' || mtfLowerTimeframeSide === 'WAIT'
          ? 'mixed'
          : 'aligned';
  const candidateRole: ScannerMtfPrimarySideArbitration['candidateRole'] =
    mtfArbitrationStatus === 'counter_structure'
      ? 'failure_scenario'
      : mtfArbitrationStatus === 'data_limited' || mtfArbitrationStatus === 'wait'
        ? 'stand_down'
        : candidateIsDirectional && candidateDirection === mtfPrimarySide
          ? 'primary_plan'
          : 'review_only';
  const requiredProofToPromote = candidateIsDirectional
    ? scannerMtfProofToPromote({ direction: candidateDirection, deskState: args.deskState })
    : 'Completed 5M proof is required before any candidate can become primary.';
  const standDownCondition = scannerDeskPlayStandDownInstruction(args.deskState) ||
    'Stand down if completed 5M proof is missing or the active tactical line fails.';
  const arbitrationReason = dataLimited
    ? 'MTF arbitration is data-limited; HTF is context only and cannot confirm a primary side.'
    : candidateOpposesPrimary
      ? `${candidateDirection} candidate opposes the ${mtfPrimarySide} primary map from 1H/15M/5M structure; it is a failure scenario until completed 5M proof promotes it.`
      : mtfArbitrationStatus === 'mixed'
        ? `${mtfPrimarySide} is the primary review-map side from deterministic MTF arbitration, with HTF/LTF conflict shown as context.`
        : `${mtfPrimarySide} is the deterministic primary map side from the wired 240m/120m/60m/15m/5m structure.`;
  return {
    sourceOfTruth: 'scanner_mtf_primary_side_arbitration',
    mtfPrimarySide,
    mtfHtfSide,
    mtfLowerTimeframeSide,
    mtfArbitrationStatus,
    candidateRole,
    candidateDirection,
    arbitrationReason,
    requiredProofToPromote,
    standDownCondition,
    timeframeRows: rows.map((row) => {
      const rawBias = row.currentBias || row.bias || row.status || null;
      return {
        timeframe: row.timeframe,
        side: scannerMtfRowSide(rawBias),
        rawBias,
      };
    }),
    approvalBoundary: {
      changesTradeApprovals: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      changesRiskRules: false,
      changesRanking: false,
      changesModelDefinitions: false,
      changesBarCloseHandling: false,
    },
  };
}

function scannerCounterStructureBiasMatches(direction: 'LONG' | 'SHORT', value: string | null | undefined): boolean {
  const normalized = String(value || '').toUpperCase();
  return direction === 'LONG' ? normalized === 'BULL' : normalized === 'BEAR';
}

export function buildScannerCounterStructureConditional(args: {
  deskState: DeskState;
  candidate?: SetupCandidate | null;
  normalized?: ReturnType<typeof buildAppTradePlan> | null;
}): ScannerCounterStructureConditional | null {
  const play = args.deskState.primaryDeskPlay;
  const direction = args.candidate?.direction === 'LONG' || args.candidate?.direction === 'SHORT'
    ? args.candidate.direction
    : play.direction === 'LONG' || play.direction === 'SHORT'
      ? play.direction
      : null;
  if (!direction || args.deskState.canExecute || args.normalized?.canExecute) return null;
  if (!['post_conditional', 'post_review'].includes(args.deskState.discordAction)) return null;
  const selectedBias = direction === 'LONG' ? play.longBias : play.shortBias;
  const quality = args.candidate?.decisionQualityScore ??
    args.candidate?.modelConfidenceScore ??
    selectedBias.decisionQualityScore ??
    selectedBias.modelConfidenceScore ??
    selectedBias.rankScore ??
    null;
  if (typeof quality !== 'number' || quality < HIGH_QUALITY_CONDITIONAL_REVIEW_MIN_SCORE) return null;
  const rows = play.htfProtectedStructureMap.rows || [];
  const lowerRows = rows.filter((row) => ['1H', '15M', '5M'].includes(row.timeframe));
  if (!lowerRows.length) return null;
  const lowerAligned = lowerRows.every((row) => scannerCounterStructureBiasMatches(direction, row.currentBias));
  if (lowerAligned && !play.htfConflict && !play.countertrendWarning) return null;
  const htfRows = rows.filter((row) => ['4H', '2H'].includes(row.timeframe));
  const activeZone = play.activeTacticalZone?.direction === direction ? play.activeTacticalZone : null;
  const activeLine = play.activeTacticalLine?.direction === direction && isFiniteTradePrice(play.activeTacticalLine.activeLine)
    ? play.activeTacticalLine.activeLine
    : direction === 'LONG'
      ? play.longAbove ?? play.lineInSand
      : play.shortBelow ?? play.lineInSand;
  const zoneText = activeZone && isFiniteTradePrice(activeZone.lower) && isFiniteTradePrice(activeZone.upper)
    ? `${activeZone.lower.toFixed(2)}-${activeZone.upper.toFixed(2)}`
    : isFiniteTradePrice(activeLine)
      ? activeLine.toFixed(2)
      : 'the active tactical line';
  const requiredTrigger = activeZone?.nextTrigger ||
    play.nextTrigger ||
    selectedBias.nextTrigger ||
    args.candidate?.requiredTrigger ||
    args.candidate?.nextAction ||
    (direction === 'SHORT'
      ? `SHORT only if completed 5M rejects/holds below ${zoneText}.`
      : `LONG only if completed 5M reclaims/holds above ${zoneText}.`);
  const standDown = activeZone?.standDown ||
    scannerDeskPlayStandDownInstruction(args.deskState) ||
    (direction === 'SHORT'
      ? `Stand down if completed 5M accepts above ${zoneText}.`
      : `Stand down if completed 5M accepts below ${zoneText}.`);
  const htfBackdropSummary = htfRows.length
    ? htfRows.map(scannerProtectedStructureRowSummary).join(' / ')
    : play.htfProtectedStructureMap.summary || 'HTF backdrop available as context only';
  const lowerTimeframeStateSummary = lowerRows.map(scannerProtectedStructureRowSummary).join(' / ');
  return {
    sourceOfTruth: 'scanner_counter_structure_conditional_clarity',
    counterStructureConditional: true,
    candidateDirection: direction,
    htfBackdropSummary,
    lowerTimeframeStateSummary,
    whyShown: [
      `${direction} map is shown because structured evidence and candidate quality are high enough for review-only visibility.`,
      'Lower-timeframe structure is mixed, range, or opposed, so this is conditional context rather than an immediate trade call.',
    ].join(' '),
    requiredTrigger,
    standDown,
    approvalBoundary: {
      changesTradeApprovals: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      changesRiskRules: false,
      changesRanking: false,
      changesModelDefinitions: false,
      changesBarCloseHandling: false,
    },
  };
}

function withScannerCounterStructureConditional(args: {
  deskState: DeskState;
  candidate?: SetupCandidate | null;
  normalized?: ReturnType<typeof buildAppTradePlan> | null;
}): DeskState {
  const counterStructureConditional = buildScannerCounterStructureConditional(args);
  if (!counterStructureConditional) return args.deskState;
  return {
    ...args.deskState,
    primaryDeskPlay: {
      ...args.deskState.primaryDeskPlay,
      counterStructureConditional,
      notes: Array.from(new Set([
        ...args.deskState.primaryDeskPlay.notes,
        'Counter-structure conditional clarity applied for Discord review-only presentation.',
      ])),
    },
    notes: Array.from(new Set([
      ...args.deskState.notes,
      'Counter-structure conditional clarity is presentation-only and does not affect canExecute.',
    ])),
  };
}

function withScannerMtfPrimarySideArbitration(args: {
  deskState: DeskState;
  candidate?: SetupCandidate | null;
  normalized?: ReturnType<typeof buildAppTradePlan> | null;
}): DeskState {
  const mtfPrimarySideArbitration = buildScannerMtfPrimarySideArbitration(args);
  return {
    ...args.deskState,
    primaryDeskPlay: {
      ...args.deskState.primaryDeskPlay,
      mtfPrimarySideArbitration,
      notes: Array.from(new Set([
        ...args.deskState.primaryDeskPlay.notes,
        'MTF primary-side arbitration applied for Discord/DeskState presentation only.',
      ])),
    },
    notes: Array.from(new Set([
      ...args.deskState.notes,
      'MTF primary-side arbitration is presentation-only and does not affect canExecute.',
    ])),
  };
}

function withScannerPresentationArbitration(args: {
  deskState: DeskState;
  candidate?: SetupCandidate | null;
  normalized?: ReturnType<typeof buildAppTradePlan> | null;
}): DeskState {
  const counterDeskState = withScannerCounterStructureConditional(args);
  return withScannerMtfPrimarySideArbitration({
    ...args,
    deskState: counterDeskState,
  });
}

function scannerNextHtfLineFromProtectedRows(args: {
  deskState: DeskState;
  direction: 'LONG' | 'SHORT';
  reaction: number;
}): number | null {
  const candidates = (args.deskState.primaryDeskPlay.htfProtectedStructureMap.rows || [])
    .flatMap((row) => [row.target, row.confirmationLine, row.biasChangeLine])
    .filter((value): value is number => isFiniteTradePrice(value))
    .filter((value) => args.direction === 'LONG'
      ? value > args.reaction + 0.0001
      : value < args.reaction - 0.0001)
    .sort((a, b) => args.direction === 'LONG' ? a - b : b - a);
  return candidates[0] ?? null;
}

export function buildScannerHtfTargetToLinePromotion(args: {
  deskState: DeskState;
  candidate?: SetupCandidate | null;
  normalized?: ReturnType<typeof buildAppTradePlan> | null;
}): ScannerHtfTargetToLinePromotion | null {
  const play = args.deskState.primaryDeskPlay;
  const direction = args.candidate?.direction === 'LONG' || args.candidate?.direction === 'SHORT'
    ? args.candidate.direction
    : play.direction === 'LONG' || play.direction === 'SHORT'
      ? play.direction
      : null;
  if (!direction) return null;
  const transition = play.levelTransition || null;
  const reaction = isFiniteTradePrice(transition?.targetReactionLevel)
    ? transition!.targetReactionLevel!
    : isFiniteTradePrice(play.targetReactionLevel)
      ? play.targetReactionLevel!
      : isFiniteTradePrice(play.htfFvgReactionRouting?.lineInSand)
        ? play.htfFvgReactionRouting!.lineInSand!
        : null;
  if (!isFiniteTradePrice(reaction)) return null;
  const mainLineInSand = isFiniteTradePrice(play.activeTacticalLine?.activeLine)
    ? play.activeTacticalLine.activeLine
    : isFiniteTradePrice(play.lineInSand)
      ? play.lineInSand
      : direction === 'LONG' && isFiniteTradePrice(play.longAbove)
        ? play.longAbove
        : direction === 'SHORT' && isFiniteTradePrice(play.shortBelow)
          ? play.shortBelow
          : null;
  const transitionNext = direction === 'LONG'
    ? transition?.longAbove ?? play.longAbove
    : transition?.shortBelow ?? play.shortBelow;
  const nextHtfLine = isFiniteTradePrice(transitionNext) &&
    (direction === 'LONG' ? transitionNext! > reaction + 0.0001 : transitionNext! < reaction - 0.0001)
    ? transitionNext!
    : scannerNextHtfLineFromProtectedRows({ deskState: args.deskState, direction, reaction });
  if (!isFiniteTradePrice(nextHtfLine)) return null;
  const acceptWord = direction === 'LONG' ? 'above' : 'below';
  const failWord = direction === 'LONG' ? 'below' : 'above';
  const opposite = direction === 'LONG' ? 'SHORT' : 'LONG';
  const primaryMapSide = play.mtfPrimarySideArbitration?.mtfPrimarySide || play.direction;
  const appTargetsComplete = [args.normalized?.entry, args.normalized?.stop, args.normalized?.t1, args.normalized?.t2]
    .every((value) => isFiniteTradePrice(value));
  return {
    sourceOfTruth: 'scanner_htf_target_to_line_promotion',
    direction,
    primaryMapSide,
    currentReactionLine: reaction,
    currentReactionLabel: transition?.targetReactionLabel || play.targetReactionLabel || play.htfFvgReactionRouting?.lineLabel || 'HTF/session reaction',
    mainLineInSand,
    nextHtfLine,
    nextHtfLineLabel: direction === 'LONG' ? 'next higher HTF/session line' : 'next lower HTF/session line',
    acceptanceRule: `Completed 5M/15M acceptance ${acceptWord} ${reaction.toFixed(2)} promotes ${nextHtfLine.toFixed(2)} as the next HTF line.`,
    failureRule: `Failure/rejection ${failWord} ${reaction.toFixed(2)} keeps ${opposite} failure context active.`,
    standDownCondition: scannerDeskPlayStandDownInstruction(args.deskState) ||
      (direction === 'LONG'
        ? `Stand down if completed 5M accepts below ${reaction.toFixed(2)}.`
        : `Stand down if completed 5M accepts above ${reaction.toFixed(2)}.`),
    noChase: transition?.targetManagementInstruction || play.noChase || 'No chase; wait for fresh completed 5M/15M proof.',
    appTargetsComplete,
    reviewOnly: true,
    approvalBoundary: {
      changesTradeApprovals: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      changesRiskRules: false,
      changesRanking: false,
      changesModelDefinitions: false,
      changesBarCloseHandling: false,
    },
  };
}

function withScannerHtfTargetToLinePromotion(args: {
  deskState: DeskState;
  candidate?: SetupCandidate | null;
  normalized?: ReturnType<typeof buildAppTradePlan> | null;
}): DeskState {
  const htfTargetToLinePromotion = buildScannerHtfTargetToLinePromotion(args);
  if (!htfTargetToLinePromotion) return args.deskState;
  return {
    ...args.deskState,
    primaryDeskPlay: {
      ...args.deskState.primaryDeskPlay,
      htfTargetToLinePromotion,
      notes: Array.from(new Set([
        ...args.deskState.primaryDeskPlay.notes,
        'HTF target-to-line promotion applied for Discord review-map presentation only.',
      ])),
    },
    notes: Array.from(new Set([
      ...args.deskState.notes,
      'HTF target-to-line promotion is presentation-only and does not affect app targets or canExecute.',
    ])),
  };
}

function withScannerReviewMapPresentation(args: {
  deskState: DeskState;
  candidate?: SetupCandidate | null;
  normalized?: ReturnType<typeof buildAppTradePlan> | null;
}): DeskState {
  const arbitratedDeskState = withScannerPresentationArbitration(args);
  return withScannerHtfTargetToLinePromotion({
    ...args,
    deskState: arbitratedDeskState,
  });
}

function scannerDeskPlayMainPlayFingerprint(args: {
  record: Omit<ScannerDeskPlanRefreshLedgerRecord, 'mainPlayFingerprint'>;
}): string {
  const record = args.record;
  return [
    record.activeCampaignId || 'no-campaign',
    record.direction,
    deskPlanRefreshPrice(record.lineInSand),
    deskPlanRefreshPrice(record.activeTacticalLine),
    deskPlanRefreshPrice(record.activeTacticalZoneLow),
    deskPlanRefreshPrice(record.activeTacticalZoneHigh),
    normalizeDeskPlayInstructionText(record.activeTacticalZoneState),
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

function scannerDeskPlayMaterialCadenceFingerprint(args: {
  deskState: DeskState;
  tacticalCampaignMap: ScannerTacticalCampaignMap;
}): string {
  const deskState = args.deskState;
  const play = deskState.primaryDeskPlay;
  const primaryBias = scannerDeskPlayPrimaryBias(deskState);
  const primaryLifecycle = scannerDeskPlayPrimaryLifecycle(deskState);
  const protectedRows = play.htfProtectedStructureMap.rows
    .map((row) => [
      row.timeframe,
      row.currentBias || row.bias || 'UNKNOWN',
      deskPlanRefreshPrice(roundNullableTradePrice(row.confirmationLine) ?? roundNullableTradePrice(row.biasChangeLine) ?? null),
    ].join('='))
    .sort()
    .join(',');
  return [
    `direction=${play.direction}`,
    `primaryBias=${primaryBias?.state || 'none'}`,
    `readiness=${primaryBias?.tradeReadiness?.status || 'none'}`,
    `visibility=${deskState.visibilityMode || 'unknown'}`,
    `discordAction=${deskState.discordAction || 'unknown'}`,
    `htfContext=${deskState.htfContextStatus || 'unknown'}`,
    `dataQuality=${deskState.dataQualityStatus || 'unknown'}`,
    `candidateState=${primaryLifecycle?.candidateState || 'none'}`,
    `candidateDirection=${primaryLifecycle?.direction || 'none'}`,
    `activeLine=${deskPlanRefreshPrice(play.activeTacticalLine?.activeLine ?? null)}`,
    `activeLineMigrated=${play.activeTacticalLine?.migrated ? 'yes' : 'no'}`,
    `activeZoneLow=${deskPlanRefreshPrice(play.activeTacticalZone?.lower ?? null)}`,
    `activeZoneHigh=${deskPlanRefreshPrice(play.activeTacticalZone?.upper ?? null)}`,
    `activeZoneState=${normalizeDeskPlayInstructionText(play.activeTacticalZone?.state || null) || 'none'}`,
    `activeZoneTrigger=${normalizeDeskPlayInstructionText(play.activeTacticalZone?.nextTrigger || null) || 'none'}`,
    `nextTrigger=${normalizeDeskPlayInstructionText(play.nextTrigger || deskState.nextTrigger || primaryLifecycle?.nextTrigger || primaryLifecycle?.requiredTrigger || null) || 'none'}`,
    `invalidation=${normalizeDeskPlayInstructionText(play.invalidation || deskState.invalidation || primaryLifecycle?.invalidation || null) || 'none'}`,
    `standDown=${normalizeDeskPlayInstructionText(scannerDeskPlayStandDownInstruction(deskState)) || 'none'}`,
    `tacticalEligible=${args.tacticalCampaignMap.eligible ? 'yes' : 'no'}`,
    `tacticalSide=${args.tacticalCampaignMap.direction || 'none'}`,
    `tacticalHtf=${args.tacticalCampaignMap.contextTimeframes.slice().sort().join(',') || 'none'}`,
    `tacticalM5=${args.tacticalCampaignMap.executionTimeframeAligned ? 'aligned' : 'not_aligned'}`,
    `tacticalM5Source=${args.tacticalCampaignMap.executionEvidenceSource || 'none'}`,
    `protectedRows=${protectedRows || 'none'}`,
  ].join('|');
}

function scannerTacticalCampaignFingerprint(map: ScannerTacticalCampaignMap): string | null {
  if (!map.direction) return null;
  return [
    `eligible=${map.eligible ? 'yes' : 'no'}`,
    `side=${map.direction}`,
    `htf=${map.contextTimeframes.join(',') || 'none'}`,
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
  const primaryLifecycle = play.direction === 'LONG'
    ? args.deskState.bestLongPlan
    : play.direction === 'SHORT'
    ? args.deskState.bestShortPlan
    : args.deskState.selectedCandidate || args.deskState.bestLongPlan || args.deskState.bestShortPlan;
  const primaryBias = scannerDeskPlayPrimaryBias(args.deskState);
  const activeCampaignId = normalizeActiveCampaignIdForTradeDate(args.deskState.activeCampaign?.id, args.tradeDate);
  const parts = [
    args.tradeDate,
    args.instrument,
    args.session,
    'DESK_PLAN_REFRESH',
    activeCampaignId || 'no-campaign',
    play.direction,
    `model=${primaryLifecycle?.setupType ?? 'no-setup'}`,
    `scenario=${normalizeDeskPlayInstructionText(primaryLifecycle?.scenarioLabel) || 'no-scenario'}`,
    `line=${deskPlanRefreshPrice(play.lineInSand)}`,
    `activeLine=${deskPlanRefreshPrice(play.activeTacticalLine?.activeLine ?? null)}`,
    `entry=${deskPlanRefreshPrice(primaryLifecycle?.entry ?? null)}`,
    `stop=${deskPlanRefreshPrice(primaryLifecycle?.stop ?? null)}`,
    `t1=${deskPlanRefreshPrice(primaryLifecycle?.target1 ?? null)}`,
    `t2=${deskPlanRefreshPrice(primaryLifecycle?.target2 ?? null)}`,
    `readiness=${normalizeDeskPlayInstructionText(primaryBias?.tradeReadiness?.status || null) || 'none'}`,
    `trigger=${normalizeDeskPlayInstructionText(play.nextTrigger || args.deskState.nextTrigger || primaryLifecycle?.nextTrigger || primaryLifecycle?.requiredTrigger || null) || 'none'}`,
    `invalid=${normalizeDeskPlayInstructionText(play.invalidation || args.deskState.invalidation || primaryLifecycle?.invalidation || null) || 'none'}`,
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
  const tacticalCampaignMap = scannerTacticalCampaignMapFromDeskState({ deskState: args.deskState });
  const recordWithoutFingerprint = {
    fingerprint: args.key,
    tradeDate: args.tradeDate,
    instrument: args.instrument,
    session: args.session,
    activeCampaignId,
    setupType: primaryLifecycle?.setupType ?? null,
    scenarioLabel: primaryLifecycle?.scenarioLabel ?? null,
    direction: play.direction,
    latestCompleted5m: args.latestCompleted5m || null,
    lineInSand: play.lineInSand,
    activeTacticalLine: play.activeTacticalLine?.activeLine ?? null,
    activeTacticalZoneLow: play.activeTacticalZone?.lower ?? null,
    activeTacticalZoneHigh: play.activeTacticalZone?.upper ?? null,
    activeTacticalZoneState: play.activeTacticalZone?.state ?? null,
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
    tacticalCampaignFingerprint: scannerTacticalCampaignFingerprint(tacticalCampaignMap),
    materialCadenceFingerprint: scannerDeskPlayMaterialCadenceFingerprint({
      deskState: args.deskState,
      tacticalCampaignMap,
    }),
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
  session?: string;
}): string {
  return `${args.tradeDate}:${args.instrument}:${args.session || 'morning'}:SESSION_HTF_DESK_MAP`;
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

function scannerHtfDeskMapDisplayDirection(play: DeskState['primaryDeskPlay']): 'LONG' | 'SHORT' | 'WAIT' {
  const direction = play.direction === 'LONG' || play.direction === 'SHORT' ? play.direction : 'WAIT';
  if (direction === 'WAIT') return 'WAIT';
  const readiness = direction === 'LONG'
    ? play.longBias.tradeReadiness?.status
    : play.shortBias.tradeReadiness?.status;
  return readiness === 'not_aligned' ? 'WAIT' : direction;
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
  const displayDirection = scannerHtfDeskMapDisplayDirection(play);
  const rowParts = play.htfProtectedStructureMap.rows.map((row) => [
    row.timeframe,
    row.currentBias || row.bias || 'UNKNOWN',
    deskPlanRefreshPrice(scannerHtfRowLine(row)),
  ].join('='));
  return [
    `primary=${displayDirection}`,
    `keyBattle=${args.keyBattleArea}`,
    `htf=${rowParts.join(',')}`,
    `context=${args.deskState.htfContextStatus || 'unknown'}:${args.deskState.dataQualityStatus || 'unknown'}`,
  ].join('|');
}

function scannerMorningHtfDeskMapRecord(args: {
  tradeDate: string;
  instrument: Instrument;
  session?: LiveSession | string;
  deskState: DeskState;
  latestCompleted5m?: string | null;
  sentAt: string;
}): ScannerMorningHtfDeskMapLedgerRecord {
  const keyBattleArea = scannerMorningHtfDeskMapKeyBattleArea(args.deskState);
  return {
    fingerprint: scannerMorningHtfDeskMapFingerprint({ deskState: args.deskState, keyBattleArea }),
    tradeDate: args.tradeDate,
    instrument: args.instrument,
    session: args.session || 'morning',
    primary: scannerHtfDeskMapDisplayDirection(args.deskState.primaryDeskPlay),
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
  if (!args.completed5m) return false;
  const parsed = parseBridgeTime(args.completed5m.time, args.barTimeZone);
  if (!parsed) return false;
  const minutes = toEtMinutes(parsed);
  const inSessionMapOpen = args.session === 'morning'
    ? minutes >= 9 * 60 + 20 && minutes <= 10 * 60
    : args.session === 'lunch'
      ? minutes >= 12 * 60 + 5 && minutes <= 12 * 60 + 45
      : args.session === 'evening'
        ? minutes >= 18 * 60 + 50 && minutes <= 19 * 60 + 30
        : false;
  if (!inSessionMapOpen) return false;
  return !args.sent[scannerMorningHtfDeskMapKey({ tradeDate: args.tradeDate, instrument: args.instrument, session: args.session })];
}

export function scannerHtfDeskMapDataStatusLabel(deskState: DeskState): string {
  const htfStatus = deskState.htfContextStatus || 'unknown';
  const dataStatus = deskState.dataQualityStatus || 'unknown';
  if (htfStatus === 'sufficient') {
    if (dataStatus === 'ok' || String(dataStatus) === 'ready' || String(dataStatus) === 'sufficient') return 'HTF sufficient';
    if (dataStatus === 'partial') return 'HTF sufficient / data partial outside map';
    if (dataStatus === 'data_limited') return 'HTF data-limited';
  }
  return `HTF ${htfStatus} / data ${dataStatus}`;
}

export function scannerHtfDeskMapDeferReasonForCanonicalPlan(
  publishDecision: DeskPublishDecision | null | undefined,
): string | null {
  if (!publishDecision?.shouldPost || !publishDecision.hasCompletePlan) return null;
  if (
    publishDecision.action !== 'POST_PLAN' &&
    publishDecision.action !== 'POST_REVIEW' &&
    publishDecision.action !== 'POST_CONDITIONAL'
  ) {
    return null;
  }
  return 'HTF map deferred because the scanner-owned DeskPublishDecision has a complete public ticket; publish the canonical ticket instead of a map-only artifact.';
}

function scannerEndOfDayMarketRecapKey(args: {
  tradeDate: string;
  instrument: Instrument;
}): string {
  return `${args.tradeDate}:${args.instrument}:end_of_day_market_recap`;
}

function scannerEndOfDayMarketRecapWindowOpen(now: Date): boolean {
  const minutes = toEtMinutes(now);
  return minutes >= 16 * 60 + 5 && minutes < 18 * 60 + 45;
}

function latestCompletedFiveMinuteIsRthCloseReady(completed5m: NinjaBridgeBar | null, barTimeZone: BridgeTimeZoneMode): boolean {
  if (!completed5m) return false;
  const parsed = parseBridgeTime(completed5m.time, barTimeZone);
  if (!parsed) return false;
  const minutes = toEtMinutes(parsed);
  return minutes >= 15 * 60 + 55 && minutes <= 16 * 60 + 5;
}

export function shouldSendScannerEndOfDayMarketRecap(args: {
  tradeDate: string;
  instrument: Instrument;
  now: Date;
  completed5m: NinjaBridgeBar | null;
  barTimeZone: BridgeTimeZoneMode;
  sent: Record<string, ScannerEndOfDayMarketRecapLedgerRecord>;
}): boolean {
  if (!scannerEndOfDayMarketRecapWindowOpen(args.now)) return false;
  if (!latestCompletedFiveMinuteIsRthCloseReady(args.completed5m, args.barTimeZone)) return false;
  return !args.sent[scannerEndOfDayMarketRecapKey({ tradeDate: args.tradeDate, instrument: args.instrument })];
}

function scannerRthBarsForTradeDate(args: {
  bars5m: NinjaBridgeBar[];
  tradeDate: string;
  barTimeZone: BridgeTimeZoneMode;
}): NinjaBridgeBar[] {
  return args.bars5m
    .filter((bar) => {
      if (bridgeBarEtDate(bar, args.barTimeZone) !== args.tradeDate) return false;
      const parsed = parseBridgeTime(bar.time, args.barTimeZone);
      if (!parsed) return false;
      const minutes = toEtMinutes(parsed);
      return minutes >= 9 * 60 + 15 && minutes <= 15 * 60 + 55;
    })
    .sort((a, b) => (parseBridgeTime(a.time, args.barTimeZone)?.getTime() || 0) - (parseBridgeTime(b.time, args.barTimeZone)?.getTime() || 0));
}

function scannerRangeSummary(bars: NinjaBridgeBar[]): {
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  rangePoints: number | null;
  direction: 'up' | 'down' | 'flat' | 'unknown';
  mainExpansionLeg: string;
  rthRange: string;
} {
  if (!bars.length) {
    return {
      open: null,
      high: null,
      low: null,
      close: null,
      rangePoints: null,
      direction: 'unknown',
      mainExpansionLeg: 'RTH range unavailable from completed 5M bars.',
      rthRange: 'N/A',
    };
  }
  const open = bars[0].open;
  const close = bars[bars.length - 1].close;
  const high = Math.max(...bars.map((bar) => bar.high));
  const low = Math.min(...bars.map((bar) => bar.low));
  const rangePoints = high - low;
  const direction = close > open ? 'up' : close < open ? 'down' : 'flat';
  return {
    open,
    high,
    low,
    close,
    rangePoints,
    direction,
    mainExpansionLeg: `${direction.toUpperCase()} session: open ${open.toFixed(2)} -> close ${close.toFixed(2)}; high ${high.toFixed(2)}, low ${low.toFixed(2)}, range ${rangePoints.toFixed(2)} pts.`,
    rthRange: `${low.toFixed(2)}-${high.toFixed(2)}`,
  };
}

function scannerDecisionTapePath(tradeDate: string, instrument: Instrument, session: LiveSession): string {
  return path.join(DISCORD_AUDIT_DIR, `scanner-decision-tape-${tradeDate}-${instrument}-${session}.json`);
}

async function readScannerDecisionTapeEvents(args: {
  tradeDate: string;
  instrument: Instrument;
  sessions?: LiveSession[];
  auditDir?: string;
}): Promise<Array<Record<string, unknown>>> {
  const sessions = args.sessions || ['morning', 'lunch'];
  const events: Array<Record<string, unknown>> = [];
  for (const session of sessions) {
    const file = args.auditDir
      ? path.join(args.auditDir, `scanner-decision-tape-${args.tradeDate}-${args.instrument}-${session}.json`)
      : scannerDecisionTapePath(args.tradeDate, args.instrument, session);
    try {
      const parsed = (await readRuntimeJson<Record<string, unknown>>(file)).value || {};
      const tapeEvents = asRecord(parsed.events) || {};
      events.push(...Object.values(tapeEvents).map((event) => asRecord(event)).filter((event): event is Record<string, unknown> => Boolean(event)));
    } catch {
      // Missing decision tapes are common early in development or after a restart; recap will report what is unavailable.
    }
  }
  return events.sort((a, b) => {
    const aTime = Date.parse(String(a.time || a.recordedAt || ''));
    const bTime = Date.parse(String(b.time || b.recordedAt || ''));
    return (Number.isFinite(aTime) ? aTime : 0) - (Number.isFinite(bTime) ? bTime : 0);
  });
}

function scannerEventDeskState(event: Record<string, unknown>): DeskState | null {
  return (asRecord(event.deskState) as unknown as DeskState | null) || null;
}

function scannerEventReversalWatch(event: Record<string, unknown>): Record<string, unknown> | null {
  return asRecord(event.reversalWatch) || null;
}

function scannerEventPlan(event: Record<string, unknown>): Record<string, unknown> | null {
  return asRecord(event.plan) || null;
}

function scannerEventTime(event: Record<string, unknown>): string {
  return String(event.time || event.recordedAt || 'N/A');
}

function firstScannerEventWithSide(events: Array<Record<string, unknown>>, side: 'LONG' | 'SHORT'): Record<string, unknown> | null {
  return events.find((event) => scannerEventDeskState(event)?.primaryDeskPlay?.direction === side) || null;
}

function firstExecutableScannerEvent(events: Array<Record<string, unknown>>): Record<string, unknown> | null {
  return events.find((event) => {
    const plan = scannerEventPlan(event);
    return plan?.canExecute === true || String(plan?.decisionStatus || '').toLowerCase().includes('approved');
  }) || null;
}

function firstValidatedReversalWatchEvent(events: Array<Record<string, unknown>>): Record<string, unknown> | null {
  return events.find((event) => {
    const state = asRecord(scannerEventReversalWatch(event)?.state);
    return state?.state === 'direction_validated';
  }) || null;
}

function latestNoChaseLine(events: Array<Record<string, unknown>>): string {
  const reversed = [...events].reverse();
  for (const event of reversed) {
    const lines = asRecord(scannerEventReversalWatch(event)?.lines);
    const value = Number(lines?.noChaseLine);
    if (Number.isFinite(value)) return value.toFixed(2);
  }
  return 'N/A';
}

function scannerDeskStateKeyBattleArea(deskState: DeskState | null): string {
  return deskState ? scannerMorningHtfDeskMapKeyBattleArea(deskState) : 'N/A';
}

function scannerOpeningHtfRead(deskState: DeskState | null): string {
  const rows = deskState?.primaryDeskPlay?.htfProtectedStructureMap?.rows || [];
  if (!rows.length) return 'HTF rows unavailable from decision tape.';
  return ['4H', '2H', '1H', '15M', '5M']
    .map((timeframe) => rows.find((row) => row.timeframe === timeframe))
    .filter((row): row is DeskState['primaryDeskPlay']['htfProtectedStructureMap']['rows'][number] => Boolean(row))
    .map((row) => `${scannerHtfBiasEmoji(row.currentBias || row.bias)} ${row.timeframe} ${String(row.currentBias || row.bias || 'UNKNOWN').toUpperCase()}`)
    .join(', ');
}

function scannerKeyBattleOutcome(args: {
  range: ReturnType<typeof scannerRangeSummary>;
  keyBattleArea: string;
}): string {
  const match = args.keyBattleArea.match(/(\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?))?/);
  if (!match || args.range.close === null) return 'Key battle area unavailable from opening map.';
  const low = Number(match[1]);
  const high = Number(match[2] || match[1]);
  if (!Number.isFinite(low) || !Number.isFinite(high)) return 'Key battle area unavailable from opening map.';
  if (args.range.close > high) return `Closed above ${args.keyBattleArea}; bulls controlled the final location.`;
  if (args.range.close < low) return `Closed below ${args.keyBattleArea}; bears controlled the final location.`;
  return `Closed inside ${args.keyBattleArea}; battle area remained unresolved at RTH close.`;
}

export async function buildScannerEndOfDayMarketRecapPayload(args: {
  tradeDate: string;
  instrument: Instrument;
  bars5m: NinjaBridgeBar[];
  completed5m: NinjaBridgeBar | null;
  currentPrice: number | null;
  barTimeZone: BridgeTimeZoneMode;
  auditDir?: string;
}): Promise<{ payload: DiscordWebhookPayload; record: ScannerEndOfDayMarketRecapLedgerRecord }> {
  const events = await readScannerDecisionTapeEvents({
    tradeDate: args.tradeDate,
    instrument: args.instrument,
    sessions: ['morning', 'lunch'],
    auditDir: args.auditDir,
  });
  const rthBars = scannerRthBarsForTradeDate({
    bars5m: args.bars5m,
    tradeDate: args.tradeDate,
    barTimeZone: args.barTimeZone,
  });
  const range = scannerRangeSummary(rthBars);
  const openingDeskState = scannerEventDeskState(events[0] || {}) || null;
  const openingPrimary = openingDeskState?.primaryDeskPlay?.direction || 'WAIT';
  const keyBattleArea = scannerDeskStateKeyBattleArea(openingDeskState);
  const executableEvent = firstExecutableScannerEvent(events);
  const validatedReversal = firstValidatedReversalWatchEvent(events);
  const bestEvent = executableEvent || validatedReversal;
  const bestEventPlan = bestEvent ? scannerEventPlan(bestEvent) : null;
  const bestDirection = String(bestEventPlan?.decision || scannerEventDeskState(bestEvent || {})?.primaryDeskPlay?.direction || 'N/A').toUpperCase();
  const longEvent = firstScannerEventWithSide(events, 'LONG');
  const shortEvent = firstScannerEventWithSide(events, 'SHORT');
  const bottomLine = bestEvent
    ? `Best recorded clean side was ${bestDirection} after scanner-owned evidence at ${scannerEventTime(bestEvent)}. Recap only; not a trade alert.`
    : 'No clean app-approved trade was recorded in the recap data. WAIT / no-trade remains a valid desk outcome.';
  const description = [
    `Opening Desk Map:`,
    `Primary: ${scannerPrimaryDeskEmoji(openingPrimary)}`,
    `Key battle area: ${keyBattleArea}`,
    `HTF read: ${scannerOpeningHtfRead(openingDeskState)}`,
    '',
    `What Price Did:`,
    `- Reclaimed/failed/rejected key battle area: ${scannerKeyBattleOutcome({ range, keyBattleArea })}`,
    `- Main expansion leg: ${range.mainExpansionLeg}`,
    `- Best clean 5M trigger: ${bestEvent ? `${bestDirection} evidence at ${scannerEventTime(bestEvent)}` : 'None recorded as app-approved in decision tape.'}`,
    `- No-chase zone: ${latestNoChaseLine(events)}`,
    '',
    `Desk Read Review:`,
    `- Morning ${openingPrimary} was ${openingPrimary === 'WAIT' ? 'the opening map state' : 'the opening primary side'}; review against the closing location above.`,
    `- LONG side became valid when: ${longEvent ? scannerEventTime(longEvent) : 'No primary LONG desk event recorded.'}`,
    `- SHORT side became valid when: ${shortEvent ? scannerEventTime(shortEvent) : 'No primary SHORT desk event recorded.'}`,
    `- Missed/avoided trade lesson: use completed 5M proof, invalidation, and no-chase boundaries before acting.`,
    '',
    `Execution Boundary:`,
    `No automated orders. Recap is review/learning only.`,
    '',
    `Bottom Line:`,
    bottomLine,
  ].join('\n');
  const payload: DiscordWebhookPayload = {
    username: 'Quant Desk',
    content: `📘 ${args.instrument} End-of-Day Market Recap - ${args.tradeDate}`,
    embeds: [{
      title: `${args.instrument} End-of-Day Market Recap - ${args.tradeDate}`,
      color: 0x38bdf8,
      description,
      fields: [],
      footer: { text: 'Quant Desk • End-of-day learning recap • Not execution approval' },
      timestamp: new Date().toISOString(),
    }],
  };
  const fingerprint = [
    args.tradeDate,
    args.instrument,
    `latest=${args.completed5m?.time || 'none'}`,
    `range=${range.rthRange}`,
    `events=${events.length}`,
    `bottom=${bottomLine}`,
  ].join('|');
  return {
    payload,
    record: {
      fingerprint,
      tradeDate: args.tradeDate,
      instrument: args.instrument,
      latestCompleted5m: args.completed5m?.time || null,
      rthRange: range.rthRange,
      sentAt: new Date().toISOString(),
    },
  };
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

export function scannerDeskPlayCanonicalPreDeliveryHold(
  publishDecision: DeskPublishDecision | null | undefined,
  alertDecision?: ScannerAlertDecision | null,
): ScannerDeskPlayDiscordSuppressionDecision | null {
  if (publishDecision && !publishDecision.shouldPost) {
    return scannerDeskPlaySuppressionBlocked(
      publishDecision.action === 'DATA_QUALITY_BLOCKER' ? 'stale_data' : 'low_quality_map',
      publishDecision.discordReason || 'Desk Play kept local because the canonical DeskPublishDecision did not approve public posting.',
    );
  }
  if (alertDecision && !alertDecision.shouldSend) {
    const operatorReason = normalizeScannerOperatorDeliveryReason(alertDecision);
    if (operatorReason.code === 'HELD_STALE_NO_CHASE') {
      return scannerDeskPlaySuppressionBlocked('missed_no_chase', operatorReason.reason);
    }
    if (operatorReason.code === 'HELD_MISSING_5M_PROOF') {
      return scannerDeskPlaySuppressionBlocked('low_quality_map', operatorReason.reason);
    }
    if (operatorReason.code === 'HELD_DATA_LIMITED') {
      return scannerDeskPlaySuppressionBlocked('stale_data', operatorReason.reason);
    }
  }
  return null;
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

function scannerDeskPlanPublicLevelDriftPoints(
  previous: ScannerDeskPlanRefreshLedgerRecord,
  current: ScannerDeskPlanRefreshLedgerRecord,
): number {
  const pairs: Array<[number | null, number | null]> = [
    [previous.lineInSand, current.lineInSand],
    [previous.activeTacticalLine, current.activeTacticalLine],
    [previous.activeTacticalZoneLow ?? null, current.activeTacticalZoneLow ?? null],
    [previous.activeTacticalZoneHigh ?? null, current.activeTacticalZoneHigh ?? null],
    [previous.longLine, current.longLine],
    [previous.shortLine, current.shortLine],
    [previous.entry, current.entry],
    [previous.stop, current.stop],
    [previous.target1, current.target1],
    [previous.target2, current.target2],
    [previous.targetReactionLevel, current.targetReactionLevel],
  ];
  return pairs.reduce((max, [a, b]) => {
    if (a === null && b === null) return max;
    if (a === null || b === null) return Number.POSITIVE_INFINITY;
    return Math.max(max, Math.abs(a - b));
  }, 0);
}

function normalizeDeskPlanMaterialCadenceFingerprint(value: string | null | undefined): string | null {
  if (!value) return null;
  return value
    .split('|')
    .filter((part) => ![
      'activeZoneLow=none',
      'activeZoneHigh=none',
      'activeZoneState=none',
      'activeZoneTrigger=none',
    ].includes(part))
    .join('|');
}

function scannerDeskPlanRefreshMateriallyMatches(
  previous: ScannerDeskPlanRefreshLedgerRecord,
  current: ScannerDeskPlanRefreshLedgerRecord,
): boolean {
  if (previous.materialCadenceFingerprint && current.materialCadenceFingerprint) {
    return normalizeDeskPlanMaterialCadenceFingerprint(previous.materialCadenceFingerprint) ===
      normalizeDeskPlanMaterialCadenceFingerprint(current.materialCadenceFingerprint);
  }
  if (previous.mainPlayFingerprint || current.mainPlayFingerprint) {
    return previous.mainPlayFingerprint === current.mainPlayFingerprint &&
      (previous.tacticalCampaignFingerprint || null) === (current.tacticalCampaignFingerprint || null);
  }
  return previous.activeCampaignId === current.activeCampaignId &&
    previous.direction === current.direction &&
    priceMateriallyEqual(previous.lineInSand, current.lineInSand) &&
    priceMateriallyEqual(previous.activeTacticalLine, current.activeTacticalLine) &&
    priceMateriallyEqual(previous.activeTacticalZoneLow ?? null, current.activeTacticalZoneLow ?? null) &&
    priceMateriallyEqual(previous.activeTacticalZoneHigh ?? null, current.activeTacticalZoneHigh ?? null) &&
    normalizeDeskPlayInstructionText(previous.activeTacticalZoneState) === normalizeDeskPlayInstructionText(current.activeTacticalZoneState) &&
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

function minutesBetweenIso(startIso: string | null | undefined, end: Date): number | null {
  if (!startIso) return null;
  const startMs = new Date(startIso).getTime();
  const endMs = end.getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  return (endMs - startMs) / 60000;
}

function scannerDeskPlayReadinessIsActionable(value: string | null | undefined): boolean {
  const normalized = normalizeDeskPlayInstructionText(value);
  return [
    'execution_candidate',
    'human_review_ready',
    'structure_break_confirmed',
    'triggered',
    'ready',
  ].includes(normalized);
}

function scannerDeskPlanRefreshHasCompletePricedPlan(record: ScannerDeskPlanRefreshLedgerRecord): boolean {
  return isFiniteTradePrice(record.entry) &&
    isFiniteTradePrice(record.stop) &&
    isFiniteTradePrice(record.target1) &&
    isFiniteTradePrice(record.target2);
}

function scannerDeskPlayPublicActionFingerprint(record: ScannerDeskPlanRefreshLedgerRecord): string {
  return [
    record.activeCampaignId || 'no-campaign',
    record.setupType || 'no-setup',
    normalizeDeskPlayInstructionText(record.scenarioLabel) || 'no-scenario',
    record.direction,
    `line=${deskPlanRefreshPrice(record.lineInSand)}`,
    `tactical=${deskPlanRefreshPrice(record.activeTacticalLine)}`,
    `zone=${deskPlanRefreshPrice(record.activeTacticalZoneLow ?? null)}-${deskPlanRefreshPrice(record.activeTacticalZoneHigh ?? null)}`,
    `entry=${deskPlanRefreshPrice(record.entry)}`,
    `stop=${deskPlanRefreshPrice(record.stop)}`,
    `t1=${deskPlanRefreshPrice(record.target1)}`,
    `t2=${deskPlanRefreshPrice(record.target2)}`,
    `reaction=${deskPlanRefreshPrice(record.targetReactionLevel)}`,
    `readiness=${normalizeDeskPlayInstructionText(record.readiness) || 'none'}`,
  ].join('|');
}

function scannerDeskPlanRefreshIsNoCampaign(record: ScannerDeskPlanRefreshLedgerRecord): boolean {
  return !record.activeCampaignId || record.activeCampaignId === 'no-campaign';
}

function scannerDeskPlanRefreshMaterialChangeReason(
  previous: ScannerDeskPlanRefreshLedgerRecord,
  current: ScannerDeskPlanRefreshLedgerRecord,
): string | null {
  if (previous.direction !== current.direction) return 'direction changed';
  if ((previous.setupType || null) !== (current.setupType || null)) return 'model changed';
  if (normalizeDeskPlayInstructionText(previous.scenarioLabel) !== normalizeDeskPlayInstructionText(current.scenarioLabel)) return 'model scenario changed';
  if (!priceMateriallyEqual(previous.entry, current.entry)) return 'entry changed';
  if (!priceMateriallyEqual(previous.stop, current.stop)) return 'stop changed';
  if (!priceMateriallyEqual(previous.target1, current.target1)) return 'T1 changed';
  if (!priceMateriallyEqual(previous.target2, current.target2)) return 'T2 changed';
  if (normalizeDeskPlayInstructionText(previous.readiness) !== normalizeDeskPlayInstructionText(current.readiness)) return 'approval/readiness state changed';
  if (!priceMateriallyEqual(previous.lineInSand, current.lineInSand)) return 'line in the sand changed';
  if (!priceMateriallyEqual(previous.activeTacticalLine, current.activeTacticalLine)) return 'active tactical line changed';
  if (!priceMateriallyEqual(previous.activeTacticalZoneLow ?? null, current.activeTacticalZoneLow ?? null)) return 'active tactical zone changed';
  if (!priceMateriallyEqual(previous.activeTacticalZoneHigh ?? null, current.activeTacticalZoneHigh ?? null)) return 'active tactical zone changed';
  if (normalizeDeskPlayInstructionText(previous.nextTrigger) !== normalizeDeskPlayInstructionText(current.nextTrigger)) return 'trigger instruction changed';
  if (normalizeDeskPlayInstructionText(previous.invalidation) !== normalizeDeskPlayInstructionText(current.invalidation)) return 'invalidation changed';
  if (normalizeDeskPlayInstructionText(previous.standDown) !== normalizeDeskPlayInstructionText(current.standDown)) return 'stand-down instruction changed';
  return null;
}

export function scannerDeskPlanSameSideRefreshHoldReason(args: {
  previous: ScannerDeskPlanRefreshLedgerRecord | null;
  current: ScannerDeskPlanRefreshLedgerRecord;
  now?: Date;
}): string | null {
  const previous = args.previous;
  if (!previous) return null;
  if (previous.direction !== args.current.direction) return null;
  const materialChange = scannerDeskPlanRefreshMaterialChangeReason(previous, args.current);
  if (materialChange) return null;
  const elapsedMinutes = minutesBetweenIso(previous.sentAt, args.now || new Date());
  const elapsed = elapsedMinutes === null ? 'unknown' : `${elapsedMinutes.toFixed(1)} minutes`;
  const campaignText = scannerDeskPlanRefreshIsNoCampaign(previous) && scannerDeskPlanRefreshIsNoCampaign(args.current)
    ? 'no-campaign POST_REVIEW'
    : 'scanner-owned';
  return `Desk Play kept local: latest ${campaignText} ${args.current.direction} card for this session already published the same model, entry, stop, targets, approval/readiness state, trigger, and invalidation. Only the candle timestamp/session refresh changed (${elapsed} since prior post).`;
}

export function scannerNoCampaignPostReviewDeskPlayHoldReason(args: {
  activeCampaignId?: string | null;
  discordAction?: string | null;
  visibilityMode?: string | null;
}): string | null {
  const isPostReview = args.discordAction === 'post_review' || args.visibilityMode === 'POST_REVIEW';
  if (args.activeCampaignId || !isPostReview) return null;
  return 'Desk Play kept local: no active scanner campaign is attached to this POST_REVIEW trade-plan card. Production Discord only accepts scanner-owned approved trade-plan cards, not no-campaign review refreshes or session-map artifacts.';
}

function scannerDeskPlayPublicCadenceHoldReason(args: {
  previous: ScannerDeskPlanRefreshLedgerRecord | null;
  current: ScannerDeskPlanRefreshLedgerRecord;
  now: Date;
  highQualityReviewCandidate: SetupCandidate | null;
  tacticalCampaignMap: ScannerTacticalCampaignMap;
  htfFvgReviewMapReason: string | null;
  targetToLinePromotionReason: string | null;
}): string | null {
  const previous = args.previous;
  if (!previous) return null;
  const elapsedMinutes = minutesBetweenIso(previous.sentAt, args.now);
  if (elapsedMinutes === null || elapsedMinutes < 0 || elapsedMinutes >= SCANNER_DESK_PLAY_PUBLIC_REFRESH_MINUTES) return null;

  const currentReadiness = normalizeDeskPlayInstructionText(args.current.readiness);
  const previousReadiness = normalizeDeskPlayInstructionText(previous.readiness);
  const directionChanged = previous.direction !== args.current.direction;
  const publicLevelDriftPoints = scannerDeskPlanPublicLevelDriftPoints(previous, args.current);
  const publicActionChanged = scannerDeskPlayPublicActionFingerprint(previous) !==
    scannerDeskPlayPublicActionFingerprint(args.current);

  const readinessImproved = previousReadiness !== currentReadiness &&
    scannerDeskPlayReadinessIsActionable(currentReadiness) &&
    !scannerDeskPlayReadinessIsActionable(previousReadiness);
  const promotionalMap =
    Boolean(args.highQualityReviewCandidate) ||
    args.tacticalCampaignMap.eligible ||
    Boolean(args.htfFvgReviewMapReason) ||
    Boolean(args.targetToLinePromotionReason);
  const publicInstructionChanged =
    normalizeDeskPlayInstructionText(previous.activeTacticalZoneState) !== normalizeDeskPlayInstructionText(args.current.activeTacticalZoneState) ||
    normalizeDeskPlayInstructionText(previous.nextTrigger) !== normalizeDeskPlayInstructionText(args.current.nextTrigger) ||
    normalizeDeskPlayInstructionText(previous.invalidation) !== normalizeDeskPlayInstructionText(args.current.invalidation) ||
    normalizeDeskPlayInstructionText(previous.standDown) !== normalizeDeskPlayInstructionText(args.current.standDown);
  const actionableInstructionChange = publicInstructionChanged &&
    scannerDeskPlayReadinessIsActionable(currentReadiness) &&
    scannerDeskPlanRefreshHasCompletePricedPlan(args.current);
  const completePlanChanged = scannerDeskPlanRefreshHasCompletePricedPlan(args.current) &&
    publicActionChanged &&
    Number.isFinite(publicLevelDriftPoints) &&
    publicLevelDriftPoints >= 1;
  if (!directionChanged && !readinessImproved && !actionableInstructionChange && !completePlanChanged) {
    const driftText = Number.isFinite(publicLevelDriftPoints)
      ? `${publicLevelDriftPoints.toFixed(2)} pts`
      : 'new/missing priced levels';
    return `Desk Play kept local by public cadence guard: latest Desk Play was posted ${elapsedMinutes.toFixed(1)} minutes ago, and this ${args.current.direction} update is still the same-side public trader action (${driftText} level drift). Tactical/high-quality/HTF refresh labels, same-side line shifts, and non-actionable instruction changes do not create another Discord post until the cadence expires, direction changes, or an actionable complete-level ticket appears. Full bar-by-bar evidence remains in audit JSON.`;
  }
  if (promotionalMap && (readinessImproved || actionableInstructionChange || completePlanChanged || directionChanged)) return null;
  if (previous.activeCampaignId !== args.current.activeCampaignId) return null;
  if (readinessImproved) return null;
  if (directionChanged && currentReadiness !== 'not_aligned' && currentReadiness !== 'missed_no_chase') return null;

  return `Desk Play kept local by public cadence guard: latest Desk Play was posted ${elapsedMinutes.toFixed(1)} minutes ago, and this update is an internal review-map drift (${previous.direction}->${args.current.direction}, readiness ${previousReadiness || 'none'}->${currentReadiness || 'none'}) without a fresh high-quality plan, HTF/FVG promotion, target-to-line promotion, or tactical campaign upgrade. Full bar-by-bar evidence remains in audit JSON.`;
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

function latestSameSideDeskPlanRefreshRecord(args: {
  sent: Record<string, ScannerDeskPlanRefreshLedgerRecord>;
  tradeDate: string;
  instrument: Instrument;
  session: string;
  direction: string;
}): ScannerDeskPlanRefreshLedgerRecord | null {
  return Object.values(args.sent)
    .filter((record) =>
      record.tradeDate === args.tradeDate &&
      record.instrument === args.instrument &&
      record.session === args.session &&
      record.direction === args.direction
    )
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())[0] || null;
}

function scannerDeskPlayStaleLevelReason(args: {
  deskState: DeskState;
  currentPrice: number | null;
  referenceLevels?: Pick<SetupCandidate, 'entry' | 'stop' | 'target1' | 'target2' | 'riskPoints'> | null;
}): string | null {
  const currentPrice = args.currentPrice;
  if (typeof currentPrice !== 'number' || !Number.isFinite(currentPrice)) return null;
  const direction = args.deskState.primaryDeskPlay.direction;
  if (direction !== 'LONG' && direction !== 'SHORT') return null;
  const primary = scannerDeskPlayPrimaryLifecycle(args.deskState);
  const activeZone = args.deskState.primaryDeskPlay.activeTacticalZone || null;
  const line = args.deskState.primaryDeskPlay.activeTacticalLine?.activeLine ??
    args.deskState.primaryDeskPlay.lineInSand ??
    primary?.lineInSand ??
    null;
  const stop = primary?.stop ?? args.referenceLevels?.stop ?? null;
  const target1 = primary?.target1 ?? args.referenceLevels?.target1 ?? null;
  const target2 = primary?.target2 ?? args.referenceLevels?.target2 ?? null;
  const reaction = args.deskState.primaryDeskPlay.targetReactionLevel ?? primary?.targetReactionLevel ?? null;
  const buffer = 0.25;
  const zoneLower = typeof activeZone?.lower === 'number' && Number.isFinite(activeZone.lower) ? activeZone.lower : null;
  const zoneUpper = typeof activeZone?.upper === 'number' && Number.isFinite(activeZone.upper) ? activeZone.upper : null;
  const insideActiveZone = activeZone?.direction === direction &&
    zoneLower !== null &&
    zoneUpper !== null &&
    currentPrice >= zoneLower - buffer &&
    currentPrice <= zoneUpper + buffer;
  const activeZoneLabel = zoneLower !== null && zoneUpper !== null
    ? `${zoneLower.toFixed(2)}-${zoneUpper.toFixed(2)}`
    : null;

  if (direction === 'LONG') {
    if (typeof stop === 'number' && currentPrice <= stop + buffer) return `LONG review map invalidated: current price ${currentPrice.toFixed(2)} is at/below protected stop ${stop.toFixed(2)}.`;
    if (activeZone?.direction === 'LONG' && zoneLower !== null && currentPrice < zoneLower - buffer) {
      return `LONG review map invalidated: current price ${currentPrice.toFixed(2)} is below active tactical zone ${activeZoneLabel || 'N/A'}.`;
    }
    if (!insideActiveZone && typeof line === 'number' && currentPrice < line - buffer) return `LONG review map invalidated: current price ${currentPrice.toFixed(2)} is back below active tactical line ${line.toFixed(2)}.`;
    if (activeZone?.direction === 'LONG' &&
      zoneUpper !== null &&
      activeZone.state === 'moved_away' &&
      currentPrice > zoneUpper + buffer
    ) {
      return `LONG review map kept local: current price ${currentPrice.toFixed(2)} already moved away from active tactical zone ${activeZoneLabel || 'N/A'}.`;
    }
    if (typeof target2 === 'number' && currentPrice >= target2 - buffer) return `LONG review map kept local: current price ${currentPrice.toFixed(2)} already reached/passed T2 ${target2.toFixed(2)}.`;
    if (typeof target1 === 'number' && currentPrice >= target1 - buffer) return `LONG review map kept local: current price ${currentPrice.toFixed(2)} already reached/passed T1 ${target1.toFixed(2)}.`;
    if (typeof reaction === 'number' && currentPrice >= reaction - buffer) return `LONG review map kept local: current price ${currentPrice.toFixed(2)} already reached/passed reaction level ${reaction.toFixed(2)}.`;
  } else {
    if (typeof stop === 'number' && currentPrice >= stop - buffer) return `SHORT review map invalidated: current price ${currentPrice.toFixed(2)} is at/above protected stop ${stop.toFixed(2)}.`;
    if (activeZone?.direction === 'SHORT' && zoneUpper !== null && currentPrice > zoneUpper + buffer) {
      return `SHORT review map invalidated: current price ${currentPrice.toFixed(2)} is above active tactical zone ${activeZoneLabel || 'N/A'}.`;
    }
    if (!insideActiveZone && typeof line === 'number' && currentPrice > line + buffer) return `SHORT review map invalidated: current price ${currentPrice.toFixed(2)} is back above active tactical line ${line.toFixed(2)}.`;
    if (activeZone?.direction === 'SHORT' &&
      zoneLower !== null &&
      activeZone.state === 'moved_away' &&
      currentPrice < zoneLower - buffer
    ) {
      return `SHORT review map kept local: current price ${currentPrice.toFixed(2)} already moved away from active tactical zone ${activeZoneLabel || 'N/A'}.`;
    }
    if (typeof target2 === 'number' && currentPrice <= target2 + buffer) return `SHORT review map kept local: current price ${currentPrice.toFixed(2)} already reached/passed T2 ${target2.toFixed(2)}.`;
    if (typeof target1 === 'number' && currentPrice <= target1 + buffer) return `SHORT review map kept local: current price ${currentPrice.toFixed(2)} already reached/passed T1 ${target1.toFixed(2)}.`;
    if (typeof reaction === 'number' && currentPrice <= reaction + buffer) return `SHORT review map kept local: current price ${currentPrice.toFixed(2)} already reached/passed reaction level ${reaction.toFixed(2)}.`;
  }
  return null;
}

const HIGH_QUALITY_CONDITIONAL_REVIEW_MIN_SCORE = 85;

function scannerTargetToLinePromotionReviewReason(args: {
  deskState: DeskState;
  normalized?: ReturnType<typeof buildAppTradePlan> | null;
  currentPrice: number | null;
  latestCompleted5m?: string | null;
  hasReferenceLevels: boolean;
  highQualityReviewCandidate?: SetupCandidate | null;
}): string | null {
  if (args.deskState.canExecute) return null;
  if (!args.latestCompleted5m) return null;
  if (args.deskState.dataQualityStatus === 'data_limited' || args.deskState.htfContextStatus === 'insufficient') return null;
  const play = args.deskState.primaryDeskPlay;
  const candidateDirection = args.highQualityReviewCandidate?.direction === 'LONG' || args.highQualityReviewCandidate?.direction === 'SHORT'
    ? args.highQualityReviewCandidate.direction
    : null;
  const playDirection = play.direction === 'LONG' || play.direction === 'SHORT' ? play.direction : null;
  const direction = candidateDirection || playDirection;
  if (direction !== 'LONG' && direction !== 'SHORT') return null;

  const primaryBias = direction === 'LONG' ? play.longBias : play.shortBias;
  const score = args.highQualityReviewCandidate?.decisionQualityScore ??
    args.highQualityReviewCandidate?.modelConfidenceScore ??
    primaryBias?.decisionQualityScore ??
    primaryBias?.lineConfidence?.score ??
    null;
  if (typeof score !== 'number' || !Number.isFinite(score) || score < HIGH_QUALITY_CONDITIONAL_REVIEW_MIN_SCORE) return null;

  const transition = play.levelTransition || null;
  const reaction = roundNullableTradePrice(transition?.targetReactionLevel) ??
    roundNullableTradePrice(play.targetReactionLevel);
  if (reaction === null) return null;
  const activeLine = roundNullableTradePrice(play.lineInSand) ??
    roundNullableTradePrice(primaryBias?.lineInSand);
  if (
    activeLine !== null &&
    (direction === 'LONG' ? reaction < activeLine - 0.25 : reaction > activeLine + 0.25)
  ) {
    return null;
  }

  const transitionLine = direction === 'LONG'
    ? roundNullableTradePrice(transition?.longAbove) ?? roundNullableTradePrice(play.longAbove)
    : roundNullableTradePrice(transition?.shortBelow) ?? roundNullableTradePrice(play.shortBelow);
  const rows = play.htfProtectedStructureMap?.rows || [];
  const rowLine = rows
    .flatMap((row) => [
      roundNullableTradePrice(row.confirmationLine),
      roundNullableTradePrice(row.biasChangeLine),
      roundNullableTradePrice(row.protectedStructure),
      roundNullableTradePrice(row.target),
    ])
    .filter((line): line is number => line !== null)
    .filter((line) => direction === 'LONG' ? line > reaction + 0.25 : line < reaction - 0.25)
    .sort((a, b) => direction === 'LONG' ? a - b : b - a)[0] ?? null;
  const nextLine = transitionLine !== null &&
    (direction === 'LONG' ? transitionLine > reaction + 0.25 : transitionLine < reaction - 0.25)
    ? transitionLine
    : rowLine;
  if (nextLine === null) return null;

  const current = roundNullableTradePrice(args.currentPrice);
  const currentContext = current === null
    ? 'current price N/A'
    : `current ${current.toFixed(2)}`;
  const acceptance = direction === 'LONG'
    ? `completed 5M/15M acceptance above ${reaction.toFixed(2)} promotes next HTF/session line ${nextLine.toFixed(2)}`
    : `completed 5M/15M acceptance below ${reaction.toFixed(2)} promotes next HTF/session line ${nextLine.toFixed(2)}`;
  const failure = direction === 'LONG'
    ? `failure/rejection below ${reaction.toFixed(2)} keeps SHORT/opposing context active`
    : `failure/rejection above ${reaction.toFixed(2)} keeps LONG/opposing context active`;
  const levelText = args.hasReferenceLevels
    ? 'app-owned entry/stop/T1/T2 are complete'
    : 'entry/stop/T1/T2 remain pending fresh app-owned 5M proof';

  return `${direction} target-to-line review map is eligible for Discord as REVIEW ONLY / NOT EXECUTION APPROVAL: decision line/reaction ${reaction.toFixed(2)}; ${acceptance}; ${failure}; ${currentContext}; ${levelText}; no chase at the reaction line; canExecute remains false.`;
}

function highQualityConditionalReviewCandidate(args: {
  normalized?: ReturnType<typeof buildAppTradePlan> | null;
  direction?: 'LONG' | 'SHORT' | 'WAIT' | string | null;
}): SetupCandidate | null {
  if (
    args.normalized?.decisionStatus === TradeDecisionStatus.NoTrade ||
    args.normalized?.decisionStatus === TradeDecisionStatus.OutsideRules
  ) return null;
  const preferredDirection = args.direction === 'LONG' || args.direction === 'SHORT' ? args.direction : null;
  return (args.normalized?.setupCandidates || [])
    .filter((candidate) => candidate.direction === 'LONG' || candidate.direction === 'SHORT')
    .filter((candidate) => !preferredDirection || candidate.direction === preferredDirection)
    .filter((candidate) => !candidate.decisionQualityHardBlocker)
    .filter((candidate) => candidate.targetRoom?.targetRoomStatus !== 'blocked_before_t1')
    .filter((candidate) =>
      candidate.executionStatus === ExecutionStatus.Conditional &&
      candidate.blockReason === NoTradeReason.EntryTriggerPending &&
      isFiniteTradePrice(candidate.entry) &&
      isFiniteTradePrice(candidate.stop) &&
      isFiniteTradePrice(candidate.target1) &&
      isFiniteTradePrice(candidate.target2)
    )
    .filter((candidate) => {
      const score = candidate.decisionQualityScore ?? candidate.modelConfidenceScore ?? null;
      return typeof score === 'number' && Number.isFinite(score) && score >= HIGH_QUALITY_CONDITIONAL_REVIEW_MIN_SCORE;
    })
    .sort((a, b) => {
      const aScore = a.decisionQualityScore ?? a.modelConfidenceScore ?? 0;
      const bScore = b.decisionQualityScore ?? b.modelConfidenceScore ?? 0;
      return bScore - aScore;
    })[0] || null;
}

function highQualityConditionalReviewStaleReason(candidate: SetupCandidate | null, currentPrice: number | null): string | null {
  if (!candidate || !isFiniteTradePrice(currentPrice)) return null;
  const buffer = 0.25;
  if (candidate.direction === 'LONG') {
    if (isFiniteTradePrice(candidate.stop) && currentPrice <= candidate.stop + buffer) {
      return `LONG high-quality review map invalidated: current price ${currentPrice.toFixed(2)} is at/below stop ${candidate.stop.toFixed(2)}.`;
    }
    if (isFiniteTradePrice(candidate.target1) && currentPrice >= candidate.target1 - buffer) {
      return `LONG high-quality review map kept local: current price ${currentPrice.toFixed(2)} already reached/passed T1 ${candidate.target1.toFixed(2)}.`;
    }
  }
  if (candidate.direction === 'SHORT') {
    if (isFiniteTradePrice(candidate.stop) && currentPrice >= candidate.stop - buffer) {
      return `SHORT high-quality review map invalidated: current price ${currentPrice.toFixed(2)} is at/above stop ${candidate.stop.toFixed(2)}.`;
    }
    if (isFiniteTradePrice(candidate.target1) && currentPrice <= candidate.target1 + buffer) {
      return `SHORT high-quality review map kept local: current price ${currentPrice.toFixed(2)} already reached/passed T1 ${candidate.target1.toFixed(2)}.`;
    }
  }
  return null;
}

function scannerHtfFvgReviewMapReason(args: {
  deskState: DeskState;
  normalized?: ReturnType<typeof buildAppTradePlan> | null;
  currentPrice: number | null;
}): string | null {
  if (args.deskState.canExecute) return null;
  if (args.deskState.dataQualityStatus === 'data_limited' || args.deskState.htfContextStatus === 'insufficient') return null;
  const play = args.deskState.primaryDeskPlay;
  const direction = play.direction === 'LONG' || play.direction === 'SHORT' ? play.direction : null;
  if (!direction) return null;
  const bias = scannerDeskPlayPrimaryBias(args.deskState);
  const score = bias?.decisionQualityScore ?? bias?.lineConfidence?.score ?? bias?.modelConfidenceScore ?? null;
  const referenceLevels = deskPlayPlanningLevels({ deskState: args.deskState, normalized: args.normalized });
  const hasReferenceLevels = isFiniteTradePrice(referenceLevels.entry) &&
    isFiniteTradePrice(referenceLevels.stop) &&
    isFiniteTradePrice(referenceLevels.target1) &&
    isFiniteTradePrice(referenceLevels.target2);

  const routed = play.htfFvgReactionRouting?.status === 'routed_active_reaction' &&
    play.htfFvgReactionRouting.direction === direction;
  if (!routed && (typeof score !== 'number' || !Number.isFinite(score) || score < HIGH_QUALITY_CONDITIONAL_REVIEW_MIN_SCORE)) return null;
  const cascadeParent = play.htfFvgCascade?.direction === direction && play.htfFvgCascade.parentZone;
  const memoryParent = play.htfFvgReactionMemory?.activeReaction?.direction === direction
    ? play.htfFvgReactionMemory.activeReaction
    : null;
  const parent = cascadeParent || memoryParent || null;
  if (!routed && !parent) return null;
  if (!parent || !isFiniteTradePrice(parent.lower) || !isFiniteTradePrice(parent.upper)) return null;

  const activeZone = play.activeTacticalZone;
  const currentInsideTacticalZone = activeZone?.direction === direction &&
    isFiniteTradePrice(args.currentPrice) &&
    isFiniteTradePrice(activeZone.lower) &&
    isFiniteTradePrice(activeZone.upper) &&
    args.currentPrice >= activeZone.lower &&
    args.currentPrice <= activeZone.upper;
  const currentInsideParentZone = isFiniteTradePrice(args.currentPrice) &&
    args.currentPrice >= parent.lower &&
    args.currentPrice <= parent.upper;
  const priceContext = currentInsideParentZone
    ? 'current price is inside the HTF parent zone'
    : currentInsideTacticalZone
      ? 'current price is inside the active tactical zone after HTF reaction'
      : 'current price is outside the parent zone; stale/no-chase guards still apply';
  const parentLabel = `${parent.timeframe || 'HTF'} parent FVG ${parent.lower.toFixed(2)}-${parent.upper.toFixed(2)}`;
  const childLabel = activeZone?.direction === direction && isFiniteTradePrice(activeZone.lower) && isFiniteTradePrice(activeZone.upper)
    ? `; tactical zone ${activeZone.lower.toFixed(2)}-${activeZone.upper.toFixed(2)}`
    : '';
  const line = roundNullableTradePrice(play.htfFvgReactionRouting?.lineInSand) ??
    roundNullableTradePrice(deskPlayLineForDirection(args.deskState, direction)) ??
    roundNullableTradePrice(play.lineInSand);
  const lineText = line === null
    ? `${direction} decision line pending`
    : `${direction === 'SHORT' ? 'SHORT BELOW' : 'LONG ABOVE'} ${line.toFixed(2)}`;
  const trigger = play.htfFvgReactionRouting?.reason ||
    play.activeTacticalZone?.nextTrigger ||
    play.nextTrigger ||
    (direction === 'SHORT'
      ? `completed 5M acceptance/rejection below ${line === null ? 'the defended boundary' : line.toFixed(2)}`
      : `completed 5M acceptance/reclaim above ${line === null ? 'the defended boundary' : line.toFixed(2)}`);
  const standDown = play.htfFvgReactionRouting?.standDown ||
    scannerDeskPlayStandDownInstruction(args.deskState) ||
    (direction === 'SHORT'
      ? `Stand down if completed 5M accepts back above the defended zone.`
      : `Stand down if completed 5M accepts back below the defended zone.`);
  const levelText = hasReferenceLevels
    ? 'complete app-owned entry/stop/T1/T2 are present'
    : 'app-owned entry/stop/T1/T2 are pending fresh 5M structure; no stale/generated levels may be shown';
  const scoreText = typeof score === 'number' && Number.isFinite(score)
    ? `decision quality is ${score}`
    : 'defended HTF FVG routing is active';
  return `${direction} high-quality HTF/FVG review map is eligible; Defended HTF FVG reclaim-to-line map: ${parentLabel}${childLabel}; Decision line: ${lineText}; Acceptance ${direction === 'SHORT' ? 'below' : 'above'} that line is the next trigger; required proof: ${trigger}; stand down: ${standDown}; ${scoreText}; ${priceContext}; ${levelText}. Discord remains review-only. Review only / Not execution approval. 5M still controls execution; canExecute remains false until normal app-owned gates pass.`;
}

function scannerEarlyLineInSandWatchReason(args: {
  deskState: DeskState;
  currentPrice: number | null;
  latestCompleted5m?: string | null;
  hasReferenceLevels: boolean;
}): string | null {
  if (args.deskState.canExecute) return null;
  if (!args.latestCompleted5m) return null;
  const play = args.deskState.primaryDeskPlay;
  const direction = play.direction === 'LONG' || play.direction === 'SHORT' ? play.direction : null;
  if (!direction) return null;
  const primaryBias = scannerDeskPlayPrimaryBias(args.deskState);
  const line = roundNullableTradePrice(play.activeTacticalLine?.activeLine) ??
    roundNullableTradePrice(deskPlayLineForDirection(args.deskState, direction)) ??
    roundNullableTradePrice(primaryBias?.lineInSand) ??
    roundNullableTradePrice(play.lineInSand);
  if (line === null) return null;

  const triggerWord = direction === 'SHORT' ? 'SHORT BELOW' : 'LONG ABOVE';
  const currentText = roundNullableTradePrice(args.currentPrice);
  const htfStatus = args.deskState.htfContextStatus || 'unknown';
  const dataStatus = args.deskState.dataQualityStatus || 'unknown';
  const readiness = primaryBias?.tradeReadiness?.status || 'watch';
  const proof = play.activeTacticalZone?.nextTrigger ||
    play.activeTacticalLine?.nextTrigger ||
    play.nextTrigger ||
    args.deskState.nextTrigger ||
    (direction === 'SHORT'
      ? `completed 5M acceptance below ${line.toFixed(2)}.`
      : `completed 5M acceptance above ${line.toFixed(2)}.`);
  const standDown = scannerDeskPlayStandDownInstruction(args.deskState) ||
    (direction === 'SHORT'
      ? `Stand down if price accepts above ${line.toFixed(2)}.`
      : `Stand down if price accepts below ${line.toFixed(2)}.`);
  const levels = args.hasReferenceLevels
    ? 'complete app-owned entry/stop/T1/T2 are present; stale/no-chase text still controls if price is away from the zone'
    : 'entry/stop/T1/T2 are pending fresh 5M proof and protected-structure target math';
  return `${direction} early line-in-sand watch is eligible for Discord as WATCH ONLY / NOT EXECUTION APPROVAL: ${triggerWord} ${line.toFixed(2)}; current ${currentText === null ? 'N/A' : currentText.toFixed(2)}; readiness ${readiness}; HTF context ${htfStatus}; data ${dataStatus}; ${levels}; required completed 5M proof: ${proof}; stand down: ${standDown}; no automated orders; canExecute remains false.`;
}

function scannerLineCrossNoChaseTransitionReason(args: {
  deskState: DeskState;
  completed5m?: NinjaBridgeBar | null;
  currentPrice: number | null;
  staleReason?: string | null;
}): string | null {
  if (args.deskState.canExecute) return null;
  if (args.deskState.dataQualityStatus === 'data_limited' || args.deskState.htfContextStatus === 'insufficient') return null;
  if (!/already|stale|missed|no chase|passed|invalidated|reached/i.test(args.staleReason || '')) return null;

  const play = args.deskState.primaryDeskPlay;
  const direction = play.direction === 'LONG' || play.direction === 'SHORT' ? play.direction : null;
  if (!direction) return null;
  const line = roundNullableTradePrice(play.activeTacticalLine?.activeLine) ??
    roundNullableTradePrice(play.activeTacticalZone?.anchorLine) ??
    roundNullableTradePrice(deskPlayLineForDirection(args.deskState, direction)) ??
    roundNullableTradePrice(play.lineInSand);
  const completedClose = roundNullableTradePrice(args.completed5m?.close);
  if (line === null || completedClose === null) return null;

  const crossed = direction === 'LONG'
    ? completedClose >= line + 0.25
    : completedClose <= line - 0.25;
  if (!crossed) return null;

  const current = roundNullableTradePrice(args.currentPrice);
  const opposite = scannerOppositeDirection(direction);
  const nextProof = direction === 'LONG'
    ? `wait for completed 5M retest/hold above ${line.toFixed(2)} or fresh higher protected-structure break`
    : `wait for completed 5M retest/rejection below ${line.toFixed(2)} or fresh lower protected-structure break`;
  const failureText = direction === 'LONG'
    ? `LONG line crossed above ${line.toFixed(2)}`
    : `SHORT line crossed below ${line.toFixed(2)}`;
  return `${direction} line-cross transition update is eligible for Discord as REVIEW ONLY / NOT EXECUTION APPROVAL: ${failureText} by completed 5M close ${completedClose.toFixed(2)}; current ${current === null ? 'N/A' : current.toFixed(2)}; fresh entry is missed/no-chase, so no entry/stop/T1/T2 execution ticket is promoted; ${nextProof}. Opposite ${opposite} remains secondary until a completed 5M reclaim invalidates the line-cross state. canExecute remains false.`;
}

export function evaluateScannerDeskPlayDiscordSuppression(args: {
  tradeDate: string;
  instrument: Instrument;
  session: string;
  deskPlayKey: string;
  deskState: DeskState;
  publishDecision?: DeskPublishDecision | null;
  normalized?: ReturnType<typeof buildAppTradePlan> | null;
  deskPlanRefreshSent: Record<string, ScannerDeskPlanRefreshLedgerRecord>;
  currentPrice: number | null;
  latestCompleted5m?: string | null;
  completed5m?: NinjaBridgeBar | null;
  staleReason?: string | null;
  now?: Date;
}): ScannerDeskPlayDiscordSuppressionDecision {
  if (args.deskState.canExecute) {
    return scannerDeskPlaySuppressionBlocked('low_quality_map', 'Desk Play refresh suppressed because executable approval should use the trade-alert path, not review-map Discord refresh.');
  }
  const play = args.deskState.primaryDeskPlay;
  const activeCampaignId = normalizeActiveCampaignIdForTradeDate(args.deskState.activeCampaign?.id, args.tradeDate);
  const noCampaignPostReviewHoldReason = scannerNoCampaignPostReviewDeskPlayHoldReason({
    activeCampaignId,
    discordAction: args.deskState.discordAction,
    visibilityMode: args.deskState.visibilityMode,
  });
  if (noCampaignPostReviewHoldReason) {
    return scannerDeskPlaySuppressionBlocked('low_quality_map', noCampaignPostReviewHoldReason);
  }
  if (args.publishDecision?.shouldPost && args.publishDecision.hasCompletePlan) {
    return scannerDeskPlaySuppressionPost(args.publishDecision.discordReason);
  }
  const hasCanonicalPublishDecision = Boolean(args.publishDecision);
  if (hasCanonicalPublishDecision) {
    return scannerDeskPlaySuppressionBlocked(
      args.publishDecision?.action === 'DATA_QUALITY_BLOCKER' ? 'stale_data' : 'low_quality_map',
      args.publishDecision?.discordReason || 'Desk Play kept local because the canonical DeskPublishDecision did not approve public posting.',
    );
  }
  const referenceLevels = deskPlayPlanningLevels({
    deskState: args.deskState,
    normalized: args.normalized,
  });
  const hasReferenceLevels = isFiniteTradePrice(referenceLevels.entry) &&
    isFiniteTradePrice(referenceLevels.stop) &&
    isFiniteTradePrice(referenceLevels.target1) &&
    isFiniteTradePrice(referenceLevels.target2);
  const freshReentryBest = play.freshReentryCandidates?.approvalStatus === 'approved_discord_conditional_display' &&
    play.freshReentryCandidates.bestCandidate?.status === 'ready_for_owner_review' &&
    play.freshReentryCandidates.bestCandidate.direction === play.direction
    ? play.freshReentryCandidates.bestCandidate
    : null;
  const highQualityReviewCandidate = highQualityConditionalReviewCandidate({
    normalized: args.normalized,
    direction: play.direction,
  }) || highQualityConditionalReviewCandidate({ normalized: args.normalized });
  if (!hasReferenceLevels && !highQualityReviewCandidate) {
    return scannerDeskPlaySuppressionBlocked(
      'low_quality_map',
      'Desk Play kept local because the public ticket does not have complete app-owned entry, stop, T1, and T2. Line-in-sand/watch context remains in audit JSON only.',
    );
  }
  const targetToLinePromotionReason = scannerTargetToLinePromotionReviewReason({
    deskState: args.deskState,
    normalized: args.normalized,
    currentPrice: args.currentPrice,
    latestCompleted5m: args.latestCompleted5m,
    hasReferenceLevels,
    highQualityReviewCandidate,
  });
  if (args.staleReason && /already|stale|missed|no chase|passed|invalidated|reached/i.test(args.staleReason) && !freshReentryBest) {
    const lineCrossNoChaseTransitionReason = scannerLineCrossNoChaseTransitionReason({
      deskState: args.deskState,
      completed5m: args.completed5m,
      currentPrice: args.currentPrice,
      staleReason: args.staleReason,
    });
    if (lineCrossNoChaseTransitionReason) {
      return scannerDeskPlaySuppressionPost(lineCrossNoChaseTransitionReason);
    }
    const reactionOnlyNoChase = /reaction level|target\/reaction|decision line/i.test(args.staleReason) &&
      !/invalidated|protected stop|active tactical zone|active tactical line|t1|t2|stale/i.test(args.staleReason);
    if (reactionOnlyNoChase && targetToLinePromotionReason) {
      return scannerDeskPlaySuppressionPost(targetToLinePromotionReason);
    }
    return scannerDeskPlaySuppressionBlocked('missed_no_chase', `Desk Play kept local because the selected setup is missed/no-chase: ${args.staleReason}`);
  }
  const highQualityReviewStaleReason = highQualityConditionalReviewStaleReason(highQualityReviewCandidate, args.currentPrice);
  if (highQualityReviewStaleReason) {
    return scannerDeskPlaySuppressionBlocked('passed_or_invalidated_levels', highQualityReviewStaleReason);
  }
  if (play.direction === 'WAIT') {
    if (highQualityReviewCandidate) {
      const reviewScore = highQualityReviewCandidate.decisionQualityScore ?? highQualityReviewCandidate.modelConfidenceScore ?? null;
      return scannerDeskPlaySuppressionPost(
        `${highQualityReviewCandidate.direction} high-confidence conditional trade plan is eligible: app-owned entry/stop/T1/T2 are present, decision quality is ${reviewScore}, and execution arms only after the named completed 5M condition.`,
      );
    }
    return scannerDeskPlaySuppressionBlocked('low_quality_map', 'Desk Play suppressed because no single primary side is confirmed; keep as internal watch/review only.');
  }
  const primaryBias = scannerDeskPlayPrimaryBias(args.deskState);
  const readiness = primaryBias?.tradeReadiness?.status || null;
  const tacticalCampaignMap = scannerTacticalCampaignMapFromDeskState({ deskState: args.deskState, normalized: args.normalized });
  const htfFvgReviewMapReason = scannerHtfFvgReviewMapReason({
    deskState: args.deskState,
    normalized: args.normalized,
    currentPrice: args.currentPrice,
  });
  const staleLevelReason = scannerDeskPlayStaleLevelReason({
    deskState: args.deskState,
    currentPrice: args.currentPrice,
    referenceLevels,
  });
  if (staleLevelReason) {
    const reactionOnlyNoChase = /reaction level|target\/reaction|decision line/i.test(staleLevelReason) &&
      !/invalidated|protected stop|active tactical zone|active tactical line|t1|t2|stale/i.test(staleLevelReason);
    if (reactionOnlyNoChase && targetToLinePromotionReason) {
      return scannerDeskPlaySuppressionPost(targetToLinePromotionReason);
    }
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
  const previousSameSideRecord = latestSameSideDeskPlanRefreshRecord({
    sent: args.deskPlanRefreshSent,
    tradeDate: args.tradeDate,
    instrument: args.instrument,
    session: args.session,
    direction: currentRecord.direction,
  });
  if (previousRecord && scannerDeskPlanRefreshMateriallyMatches(previousRecord, currentRecord)) {
    return scannerDeskPlaySuppressionBlocked(
      'duplicate_refresh',
      'Desk Play suppressed because primary side, readiness, HTF context/conflict, action state, and protected-structure map are unchanged from the latest posted Desk Play.',
      previousRecord.materialCadenceFingerprint || previousRecord.fingerprint,
    );
  }
  const sameSideHoldReason = scannerDeskPlanSameSideRefreshHoldReason({
    previous: previousSameSideRecord,
    current: currentRecord,
    now: args.now || new Date(),
  });
  if (sameSideHoldReason) {
    return scannerDeskPlaySuppressionBlocked(
      'duplicate_refresh',
      sameSideHoldReason,
      previousSameSideRecord?.materialCadenceFingerprint || previousSameSideRecord?.fingerprint || null,
    );
  }
  const publicCadenceHoldReason = scannerDeskPlayPublicCadenceHoldReason({
    previous: previousRecord,
    current: currentRecord,
    now: args.now || new Date(),
    highQualityReviewCandidate,
    tacticalCampaignMap,
    htfFvgReviewMapReason,
    targetToLinePromotionReason,
  });
  if (publicCadenceHoldReason) {
    return scannerDeskPlaySuppressionBlocked(
      'duplicate_refresh',
      publicCadenceHoldReason,
      previousRecord?.materialCadenceFingerprint || previousRecord?.fingerprint || null,
    );
  }
  if (readiness === 'data_limited' && hasReferenceLevels) {
    return scannerDeskPlaySuppressionPost(
      `Desk Play reference map is eligible for Discord as review-only because ${play.direction} readiness is data-limited, completed 5M is ready, and app-owned reference entry/stop/T1/T2 are available; HTF promotion remains blocked.`,
    );
  }
  if (htfFvgReviewMapReason) {
    return scannerDeskPlaySuppressionPost(htfFvgReviewMapReason);
  }
  if (targetToLinePromotionReason) {
    return scannerDeskPlaySuppressionPost(targetToLinePromotionReason);
  }
  if (readiness === 'not_aligned' && tacticalCampaignMap.eligible) {
    return scannerDeskPlaySuppressionBlocked(
      'low_quality_map',
      `Desk Play kept local because ${play.direction} tactical campaign is not aligned with protected 5M structure yet: ${tacticalCampaignMap.reason}. Publish only after a completed 5M transition, HTF FVG reaction route, target-to-line transition, or complete high-quality conditional candidate qualifies it.`,
    );
  }
  const earlyLineInSandWatchReason = scannerEarlyLineInSandWatchReason({
    deskState: args.deskState,
    currentPrice: args.currentPrice,
    latestCompleted5m: args.latestCompleted5m,
    hasReferenceLevels,
  });
  if (earlyLineInSandWatchReason) {
    return scannerDeskPlaySuppressionPost(earlyLineInSandWatchReason);
  }
  if (args.deskState.dataQualityStatus === 'data_limited') {
    if (!hasReferenceLevels) {
      return scannerDeskPlaySuppressionBlocked('stale_data', 'Desk Play suppressed because scanner DeskState is data-limited and no complete app-owned tactical levels or scanner-owned early watch line are available.');
    }
  }
  if (args.deskState.htfContextStatus === 'insufficient') {
    if (!hasReferenceLevels) {
      return scannerDeskPlaySuppressionBlocked('low_quality_map', 'Desk Play suppressed because HTF context is insufficient and no complete app-owned tactical levels or scanner-owned early watch line are available.');
    }
  }
  if (primaryBias && primaryBias.state !== 'primary') {
    return scannerDeskPlaySuppressionBlocked('low_quality_map', `Desk Play suppressed because ${play.direction} is ${primaryBias.state}, not the primary actionable desk side.`);
  }
  if (readiness === 'data_limited' || readiness === 'blocked' || readiness === 'missed_no_chase') {
    return scannerDeskPlaySuppressionBlocked('low_quality_map', `Desk Play suppressed because ${play.direction} readiness is ${readiness}.`);
  }
  if (readiness === 'not_aligned' && !tacticalCampaignMap.eligible && !highQualityReviewCandidate && !htfFvgReviewMapReason) {
    return scannerDeskPlaySuppressionBlocked('low_quality_map', `Desk Play suppressed because ${play.direction} readiness is ${readiness}: ${tacticalCampaignMap.reason}`);
  }
  const dataLimitedReview = args.deskState.dataQualityStatus === 'data_limited' || args.deskState.htfContextStatus === 'insufficient';
  return scannerDeskPlaySuppressionPost(dataLimitedReview
    ? 'Desk Play reference map is eligible for Discord as review-only because completed 5M is ready and app-owned reference entry/stop/T1/T2 are available; HTF promotion remains blocked.'
    : tacticalCampaignMap.eligible
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

function scannerReversalWatchMaterialCadenceFingerprint(args: {
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
    `reclaim=${state.reclaimConfirmed ? 'yes' : 'no'}`,
    `retest=${state.retestHoldConfirmed ? 'yes' : 'no'}`,
    `barsSinceReclaim=${state.barsSinceReclaim ?? 'none'}`,
  ].join('|');
}

function scannerReversalWatchIsActiveZoneFailureTransition(lines: ScannerReversalWatchLines): boolean {
  return /active tactical zone failed/i.test(`${lines.reactionLabel || ''} ${lines.reason || ''}`);
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
    materialCadenceFingerprint: scannerReversalWatchMaterialCadenceFingerprint({
      lines: args.lines,
      state: args.state,
    }),
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
  const activeZoneFailureTransition = scannerReversalWatchIsActiveZoneFailureTransition(args.lines);
  if (
    (args.state.state === 'invalidated' || args.state.state === 'no_chase' || args.state.state === 'stalled') &&
    previous?.state !== 'watch_active' &&
    previous?.state !== 'direction_validated' &&
    !(activeZoneFailureTransition && args.state.state === 'no_chase')
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
  const previousMaterial = previous?.materialCadenceFingerprint || null;
  const currentMaterial = current.materialCadenceFingerprint || null;
  if (previous?.fingerprint === current.fingerprint || (previousMaterial && previousMaterial === currentMaterial)) {
    return scannerReversalWatchSuppressionBlocked(
      'duplicate_refresh',
      'Reversal watch suppressed because side, action state, reclaim, and retest status are unchanged.',
      previousMaterial || previous.fingerprint,
    );
  }
  return scannerReversalWatchSuppressionPost(
    activeZoneFailureTransition
      ? `${args.state.reason} Campaign transition alert: ${args.lines.reason}`
      : args.state.reason,
  );
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
  tradeDecisionMapAudit?: TradeDecisionMapAudit;
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
  const tradeDecisionMapAudit = args.tradeDecisionMapAudit || buildTradeDecisionMapAudit();
  const baseDeskState = args.deskState || buildDeskState({
    state: args.state,
    candidate: args.candidate,
    visibilityMetadata,
    candidateLifecycleTrace,
    targetCascade: args.targetCascade,
    htfLiquidityDrawState: args.chartContext?.htfLiquidityDrawState || null,
    chartContext: args.chartContext || null,
    currentPrice: args.currentPrice,
    canExecute: Boolean(args.normalized.canExecute),
  });
  const deskState = withScannerReviewMapPresentation({
    deskState: baseDeskState,
    candidate: args.candidate,
    normalized: args.normalized,
  });
  const visualCandidateBase = deskState.discordAction === 'post_watch'
    ? null
    : candidateForNormalizedVisualAuthority(args.candidate, args.normalized);
  const counterStructureWarning = deskState.primaryDeskPlay.counterStructureConditional
    ? `Counter-structure conditional map: ${deskState.primaryDeskPlay.counterStructureConditional.lowerTimeframeStateSummary}; ${deskState.primaryDeskPlay.counterStructureConditional.requiredTrigger}`
    : null;
  const visualCandidate = visualCandidateBase && counterStructureWarning
    ? {
        ...visualCandidateBase,
        evidence: Array.from(new Set([...(visualCandidateBase.evidence || []), counterStructureWarning])),
        missingEvidence: Array.from(new Set([
          ...(visualCandidateBase.missingEvidence || []),
          'Review Only - counter-structure conditional; not execution approval.',
        ])),
      }
    : visualCandidateBase;
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
    chartContext: args.chartContext || null,
    visibilityMetadata,
    candidateLifecycleTrace,
    tradeDecisionMapAudit,
    deskState,
    publishDecision: buildDeskPublishDecision({
      deskState,
      currentPrice: args.currentPrice,
      completed5mTime: args.completed5m?.time || null,
    }),
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
  candidate?: SetupCandidate | null;
  chartContext: AnalysisResult['structuredChartContext'] | null | undefined;
  currentPrice: number | null;
  windowLabel: string;
  planVersionId: string;
  deskState: DeskState;
  publishDecision?: DeskPublishDecision | null;
  decisionTapePath: string;
  outputDir?: string;
}): Promise<{
  payload: DiscordWebhookPayload;
  files: string[];
  chartMarkup: string | null;
  levelMap: string | null;
}> {
  const publishCandidate = args.publishDecision?.displaySource === 'selected_candidate'
    ? (args.normalized.setupCandidates || []).find((candidate) =>
        candidate.direction === args.publishDecision?.direction &&
        candidate.setupType === args.publishDecision?.setupType &&
        roundNullableTradePrice(candidate.entry) === roundNullableTradePrice(args.publishDecision?.entry) &&
        roundNullableTradePrice(candidate.stop) === roundNullableTradePrice(args.publishDecision?.stop) &&
        roundNullableTradePrice(candidate.target1) === roundNullableTradePrice(args.publishDecision?.t1) &&
        roundNullableTradePrice(candidate.target2) === roundNullableTradePrice(args.publishDecision?.t2)
      ) || null
    : null;
  const canonicalChartCandidate = publishCandidate ||
    candidateForDeskPublishDecisionChart(args.publishDecision, args.candidate || null);
  const publishDeskState = args.publishDecision?.shouldPost && args.publishDecision.direction !== 'WAIT'
    ? {
        ...args.deskState,
        deskTicket: {
          ...args.deskState.deskTicket,
          primaryDirection: args.publishDecision.direction,
          lineInSand: args.publishDecision.lineInSand,
          triggerCondition: args.publishDecision.triggerCondition || args.deskState.deskTicket.triggerCondition,
          entry: args.publishDecision.entry,
          stop: args.publishDecision.stop,
          t1: args.publishDecision.t1,
          t2: args.publishDecision.t2,
          invalidation: args.publishDecision.invalidation,
          invalidationText: args.publishDecision.invalidationText || args.deskState.deskTicket.invalidationText,
          sourceCandidateKey: args.publishDecision.candidateKey,
        },
        primaryDeskPlay: {
          ...args.deskState.primaryDeskPlay,
          direction: args.publishDecision.direction,
          lineInSand: args.publishDecision.lineInSand,
          longAbove: args.publishDecision.direction === 'LONG' ? args.publishDecision.lineInSand : args.deskState.primaryDeskPlay.longAbove,
          shortBelow: args.publishDecision.direction === 'SHORT' ? args.publishDecision.lineInSand : args.deskState.primaryDeskPlay.shortBelow,
          nextTrigger: args.publishDecision.triggerCondition || args.deskState.primaryDeskPlay.nextTrigger,
          activeTacticalLine: {
            ...args.deskState.primaryDeskPlay.activeTacticalLine,
            direction: args.publishDecision.direction,
            originalLine: args.publishDecision.lineInSand,
            activeLine: args.publishDecision.lineInSand,
            migrated: false,
            reason: 'Canonical DeskPublishDecision line in the sand.',
            nextTrigger: args.publishDecision.triggerCondition || args.deskState.primaryDeskPlay.activeTacticalLine.nextTrigger,
            standDown: args.publishDecision.invalidationText || args.deskState.primaryDeskPlay.activeTacticalLine.standDown,
          },
        },
      }
    : args.deskState;
  const deskState = withScannerReviewMapPresentation({
    deskState: publishDeskState,
    candidate: canonicalChartCandidate || candidateForDeskPlayContextChart(publishDeskState, args.normalized, args.currentPrice, args.candidate),
    normalized: args.normalized,
  });
  const contextCandidate = canonicalChartCandidate || candidateForDeskPlayContextChart(deskState, args.normalized, args.currentPrice, args.candidate);
  const play = deskState.primaryDeskPlay;
  const canonicalChartLine = args.publishDecision?.shouldPost && args.publishDecision.direction !== 'WAIT';
  const chartContextLine = args.publishDecision?.shouldPost && args.publishDecision.direction !== 'WAIT'
    ? args.publishDecision.lineInSand
    : play.activeTacticalLine?.activeLine ?? play.lineInSand;
  assertScannerDeskPublishArtifactAgreement({
    publishDecision: args.publishDecision,
    deskState,
    contextCandidate,
    contextLine: chartContextLine,
  });
  const chartMarkup = contextCandidate
    ? await renderChartMarkup({
        chartContext: args.chartContext || null,
        candidate: contextCandidate,
        instrument: args.config.instrument,
        tradeDate: args.tradeDate,
        sessionLabel: args.session,
        renderMode: 'desk_play_context',
        contextLine: chartContextLine,
        contextLabel: !canonicalChartLine && play.activeTacticalLine?.migrated ? 'Active tactical line' : 'Line in the sand',
        outputDir: args.outputDir,
        filePrefix: `scanner-desk-play-${args.session}-${args.tradeDate}-${args.config.instrument}`,
      })
    : null;
  const levelMap = contextCandidate
    ? await renderPriceLevelMap({
        chartContext: args.chartContext || null,
        candidate: contextCandidate,
        instrument: args.config.instrument,
        tradeDate: args.tradeDate,
        sessionLabel: args.session,
        outputDir: args.outputDir,
        filePrefix: `scanner-desk-play-${args.session}-${args.tradeDate}-${args.config.instrument}`,
      })
    : null;
  const files = [chartMarkup, levelMap].filter((file): file is string => Boolean(file));
  const normalizedForPayload = contextCandidate
    ? {
        ...args.normalized,
        decision: contextCandidate.direction,
        entry: contextCandidate.entry ?? null,
        stop: contextCandidate.stop ?? null,
        t1: contextCandidate.target1 ?? null,
        t2: contextCandidate.target2 ?? null,
        riskPoints: contextCandidate.riskPoints ?? null,
      }
    : args.normalized;
  let payload = buildDiscordPayload({
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
      priceLevelMap: Boolean(levelMap),
      auditLogPath: args.decisionTapePath,
    },
    deskState,
  });
  payload = scannerDeskPlayLiveCompactFallbackPayload({
    session: args.session,
    tradeDate: args.tradeDate,
    instrument: args.config.instrument,
    deskState,
    candidate: contextCandidate,
    normalized: normalizedForPayload,
    currentPrice: args.currentPrice,
    originalPayload: payload,
  });
  validateDiscordPayload(payload, files);
  return { payload, files, chartMarkup, levelMap };
}

function scannerDiscordLine(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : 'N/A';
}

function scannerDeskPlayBattleLine(args: {
  deskState: DeskState;
  side: 'LONG' | 'SHORT';
}): number | null {
  const play = args.deskState.primaryDeskPlay;
  const transition = play.levelTransition;
  const transitionLine = args.side === 'LONG' ? transition?.longAbove : transition?.shortBelow;
  if (isFiniteTradePrice(transitionLine)) return transitionLine;
  const directionalLine = args.side === 'LONG' ? play.longAbove : play.shortBelow;
  if (isFiniteTradePrice(directionalLine)) return directionalLine;
  const oppositeActiveLine = play.activeTacticalLine?.direction !== args.side &&
    isFiniteTradePrice(play.activeTacticalLine?.activeLine)
    ? play.activeTacticalLine!.activeLine!
    : null;
  if (oppositeActiveLine !== null) return oppositeActiveLine;
  const sameActiveLine = play.activeTacticalLine?.direction === args.side &&
    isFiniteTradePrice(play.activeTacticalLine?.activeLine)
    ? play.activeTacticalLine!.activeLine!
    : null;
  if (sameActiveLine !== null) return sameActiveLine;
  const biasLine = args.side === 'LONG' ? play.longBias.lineInSand : play.shortBias.lineInSand;
  return isFiniteTradePrice(biasLine) ? biasLine : null;
}

function scannerDeskPlanFromLifecycle(args: {
  deskState: DeskState;
  side: 'LONG' | 'SHORT';
}): {
  entry: number | null;
  stop: number | null;
  t1: number | null;
  t2: number | null;
  risk: number | null;
  trigger: string | null;
  invalidation: string | null;
} {
  const plan = args.side === 'LONG' ? args.deskState.bestLongPlan : args.deskState.bestShortPlan;
  const selected = args.deskState.selectedCandidate?.direction === args.side ? args.deskState.selectedCandidate : null;
  const source = plan?.direction === args.side ? plan : selected;
  if (!source) return { entry: null, stop: null, t1: null, t2: null, risk: null, trigger: null, invalidation: null };
  const entry = isFiniteTradePrice(source.entry) ? source.entry : null;
  const stop = isFiniteTradePrice(source.stop) ? source.stop : null;
  const appTargets = targetsFromEntryStop(args.side, entry, stop);
  const t1 = isFiniteTradePrice(source.target1) ? source.target1 : appTargets.target1;
  const t2 = isFiniteTradePrice(source.target2) ? source.target2 : appTargets.target2;
  const risk = isFiniteTradePrice(source.riskPoints) ? source.riskPoints : appTargets.riskPoints;
  const sideValid = args.side === 'LONG'
    ? entry !== null && stop !== null && stop < entry
    : entry !== null && stop !== null && stop > entry;
  const targetsValid = args.side === 'LONG'
    ? t1 !== null && t2 !== null && entry !== null && t1 > entry && t2 > t1
    : t1 !== null && t2 !== null && entry !== null && t1 < entry && t2 < t1;
  return {
    entry: sideValid ? entry : null,
    stop: sideValid ? stop : null,
    t1: sideValid && targetsValid ? t1 : null,
    t2: sideValid && targetsValid ? t2 : null,
    risk: sideValid && risk !== null ? risk : null,
    trigger: source.requiredTrigger || source.nextTrigger || null,
    invalidation: source.invalidation || null,
  };
}

function scannerDeskPlayBattleBranchLine(args: {
  deskState: DeskState;
  side: 'LONG' | 'SHORT';
  line: number | null;
}): string[] {
  if (!isFiniteTradePrice(args.line)) return [];
  const plan = scannerDeskPlanFromLifecycle(args);
  const sideWord = args.side === 'LONG' ? 'above' : 'below';
  const trigger = plan.trigger ||
    `Completed 5M close + hold/retest ${sideWord} ${scannerDiscordLine(args.line)}.`;
  const swingLabel = args.side === 'LONG' ? 'swing low' : 'swing high';
  return [
    `${args.side} ${args.side === 'LONG' ? 'ABOVE' : 'BELOW'} ${scannerDiscordLine(args.line)}: ${clip(trigger, 110)}`,
    plan.entry !== null && plan.stop !== null
      ? `Entry ${scannerDiscordLine(plan.entry)} | Stop ${scannerDiscordLine(plan.stop)} (5M ${swingLabel} ${scannerDiscordLine(plan.stop)}) | Risk ${scannerDiscordLine(plan.risk)} pts`
      : `Entry 5M close ${sideWord} ${scannerDiscordLine(args.line)} | WATCH ONLY: no priced stop; 5M ${swingLabel} unconfirmed.`,
    plan.t1 !== null && plan.t2 !== null
      ? `T1 ${scannerDiscordLine(plan.t1)} | T2 ${scannerDiscordLine(plan.t2)}`
      : 'T1/T2: use nearest mapped decision zones until a priced stop confirms.',
  ];
}

function scannerDeskPlayFallbackArmingState(args: {
  direction: 'LONG' | 'SHORT' | 'WAIT';
  line: number | null;
  currentPrice: number | null;
  canExecute: boolean;
}): { armed: boolean; headline: string; reason: string | null } {
  if (args.direction !== 'LONG' && args.direction !== 'SHORT') {
    return { armed: false, headline: 'WAIT', reason: null };
  }
  if (args.canExecute || !isFiniteTradePrice(args.line) || !isFiniteTradePrice(args.currentPrice)) {
    return { armed: true, headline: `${args.direction} REVIEW`, reason: null };
  }
  const buffer = TRADE_RULES.targetModel.tickSize;
  if (args.direction === 'SHORT' && args.currentPrice > args.line + buffer) {
    return {
      armed: false,
      headline: `WAIT / SHORT BELOW ${scannerDiscordLine(args.line)}`,
      reason: `No short plan yet. Current ${scannerDiscordLine(args.currentPrice)} is above the line ${scannerDiscordLine(args.line)}; short requires a completed 5M close below ${scannerDiscordLine(args.line)}.`,
    };
  }
  if (args.direction === 'LONG' && args.currentPrice < args.line - buffer) {
    return {
      armed: false,
      headline: `WAIT / LONG ABOVE ${scannerDiscordLine(args.line)}`,
      reason: `No long plan yet. Current ${scannerDiscordLine(args.currentPrice)} is below the line ${scannerDiscordLine(args.line)}; long requires a completed 5M close above ${scannerDiscordLine(args.line)}.`,
    };
  }
  return { armed: true, headline: `${args.direction} REVIEW`, reason: null };
}

function scannerDeskPlayBattleZoneText(longLine: number | null, shortLine: number | null): string | null {
  if (!isFiniteTradePrice(longLine) || !isFiniteTradePrice(shortLine)) return null;
  const lower = Math.min(longLine, shortLine);
  const upper = Math.max(longLine, shortLine);
  if (priceMateriallyEqual(lower, upper)) return scannerDiscordLine(lower);
  return `${scannerDiscordLine(lower)}-${scannerDiscordLine(upper)}`;
}

function scannerDeskPlayLiveCompactFallbackPayload(args: {
  session: LiveSession;
  tradeDate: string;
  instrument: Instrument;
  deskState: DeskState;
  candidate: SetupCandidate | null;
  normalized: ReturnType<typeof buildAppTradePlan>;
  currentPrice: number | null;
  originalPayload: DiscordWebhookPayload;
}): DiscordWebhookPayload {
  const play = args.deskState.primaryDeskPlay;
  const candidateDirection = args.candidate?.direction === 'LONG' || args.candidate?.direction === 'SHORT'
    ? args.candidate.direction
    : null;
  const direction = play.direction === 'LONG' || play.direction === 'SHORT'
    ? play.direction
    : candidateDirection || 'WAIT';
  const line = play.activeTacticalZone?.direction === direction && typeof play.activeTacticalZone.lower === 'number'
    ? play.activeTacticalZone.lower
    : play.activeTacticalLine?.activeLine ?? play.lineInSand ?? args.deskState.lineInSand ?? args.candidate?.entry ?? null;
  const longBattleLine = scannerDeskPlayBattleLine({ deskState: args.deskState, side: 'LONG' });
  const shortBattleLine = scannerDeskPlayBattleLine({ deskState: args.deskState, side: 'SHORT' });
  const battleZoneText = scannerDeskPlayBattleZoneText(longBattleLine, shortBattleLine);
  const activeLine = play.activeTacticalLine?.direction === direction && isFiniteTradePrice(play.activeTacticalLine.activeLine)
    ? play.activeTacticalLine.activeLine
    : null;
  const migratedLineLeftBehind = (
    (direction === 'LONG' || direction === 'SHORT') &&
    Boolean(play.activeTacticalLine?.migrated) &&
    isFiniteTradePrice(activeLine) &&
    isFiniteTradePrice(args.currentPrice) &&
    (
      direction === 'SHORT'
        ? args.currentPrice < activeLine - TRADE_RULES.targetModel.tickSize * 4
        : args.currentPrice > activeLine + TRADE_RULES.targetModel.tickSize * 4
    )
  );
  const baseArming = scannerDeskPlayFallbackArmingState({
    direction,
    line,
    currentPrice: args.currentPrice,
    canExecute: args.deskState.canExecute,
  });
  const arming = migratedLineLeftBehind
    ? {
      armed: false,
      headline: `WAIT / ${direction} NO CHASE`,
      reason: `Prior ${direction} line ${scannerDiscordLine(activeLine)} is already left behind; no fresh entry unless price retests/holds ${direction === 'SHORT' ? 'below' : 'above'} it or confirms through the nearby battle line.`,
    }
    : baseArming;
  const entry = arming.armed ? args.candidate?.entry ?? args.normalized.entry ?? null : null;
  const stop = arming.armed ? args.candidate?.stop ?? args.normalized.stop ?? null : null;
  const t1 = arming.armed ? args.candidate?.target1 ?? args.normalized.t1 ?? null : null;
  const t2 = arming.armed ? args.candidate?.target2 ?? args.normalized.t2 ?? null : null;
  const invalidation = args.candidate?.invalidation || play.invalidation || args.deskState.invalidation || 'Invalidation pending protected 5M structure.';
  const noChase = play.activeTacticalZone?.noChase || play.noChase || 'No chase; wait for a fresh completed 5M trigger/retest.';
  const sessionTitle = args.session === 'lunch' ? 'PM' : args.session.toUpperCase();
  const content = `🟠 [${sessionTitle} DESK PLAY] ${args.instrument} - ${arming.headline} | ${args.tradeDate}`;
  const hasPlanLevels = entry !== null && stop !== null && t1 !== null && t2 !== null;
  const t1Reached = hasPlanLevels && args.currentPrice !== null
    ? direction === 'LONG'
      ? args.currentPrice >= t1
      : direction === 'SHORT'
        ? args.currentPrice <= t1
        : false
    : false;
  const directionRule = migratedLineLeftBehind && battleZoneText
    ? `WAIT / battle zone ${battleZoneText}`
    : direction === 'SHORT'
    ? `SHORT below ${scannerDiscordLine(line)}`
    : direction === 'LONG'
      ? `LONG above ${scannerDiscordLine(line)}`
      : `WAIT around ${scannerDiscordLine(line)}`;
  const triggerRule = migratedLineLeftBehind && battleZoneText
    ? `completed 5M close outside ${battleZoneText}`
    : direction === 'SHORT'
    ? `5M close below ${scannerDiscordLine(line)}`
    : direction === 'LONG'
      ? `5M close above ${scannerDiscordLine(line)}`
      : 'wait for one completed 5M side to confirm';
  const displayLine = migratedLineLeftBehind && battleZoneText
    ? battleZoneText
    : scannerDiscordLine(line);
  const planLine = hasPlanLevels
    ? [
      'Trade Plan:',
      `Entry: ${scannerDiscordLine(entry)}`,
      `Stop: ${scannerDiscordLine(stop)} | Protected 5M swing: ${scannerDiscordLine(stop)} (${direction === 'LONG' ? 'swing low' : 'swing high'})`,
      `T1: ${scannerDiscordLine(t1)} | T2: ${scannerDiscordLine(t2)}`,
    ].join('\n')
    : [
      'WATCH ONLY:',
      `Entry: ${triggerRule}`,
      `Stop: no priced stop yet`,
      `Protected 5M swing: not confirmed`,
      `T1/T2: use mapped zones until priced stop confirms`,
    ].join('\n');
  const statusLine = t1Reached
    ? `No fresh entry: current already reached/passed T1 ${scannerDiscordLine(t1)}.`
    : `Status: review only; ${clip(noChase, 70)}`;
  const battlePlanLines = [
    'Battle Plan:',
    `Current ${scannerDiscordLine(args.currentPrice)} | no chase between lines.`,
    ...scannerDeskPlayBattleBranchLine({ deskState: args.deskState, side: 'LONG', line: longBattleLine }),
    ...scannerDeskPlayBattleBranchLine({ deskState: args.deskState, side: 'SHORT', line: shortBattleLine }),
  ];
  const cleanInvalidation = String(invalidation || '')
    .replace(/^invalid(?:ation)?\s*:\s*/i, '')
    .replace(/^invalid\s+if\s+/i, '')
    .trim() || 'protected 5M invalidation pending.';
  const priorLineNote = migratedLineLeftBehind
    ? `Prior ${direction} line: ${scannerDiscordLine(activeLine)} already left; no chase. Fresh ${direction.toLowerCase()} needs retest/hold ${direction === 'SHORT' ? 'below' : 'above'} it or nearby battle-line confirmation.`
    : null;
  const description = [
    `Primary: ${directionRule} | Current ${scannerDiscordLine(args.currentPrice)}`,
    `HTF: ${args.deskState.htfContextStatus || 'unknown'} / ${play.htfProtectedStructureMap?.reliability || 'unknown'}`,
    `Line in the Sand: ${displayLine}`,
    `Trigger: ${triggerRule}`,
    ...(priorLineNote ? [priorLineNote] : []),
    ...battlePlanLines,
    planLine,
    `Invalid: ${clip(cleanInvalidation, 82)}`,
    `Opposite Scenario: stand down if completed 5M proof invalidates the active side.`,
    statusLine,
    'No automated orders.',
  ].join('\n');
  return {
    username: args.originalPayload.username || 'Quant Desk',
    content,
    embeds: [
      {
        title: `${args.instrument} Current Desk Plan`,
        description: professionalizeReportText(description),
        color: direction === 'LONG' ? 0x00a86b : direction === 'SHORT' ? 0xff6d00 : 0xffa000,
        fields: [],
        footer: { text: 'Quant Desk • Compact live DeskState play • Not execution approval' },
        timestamp: new Date().toISOString(),
      },
    ],
    ...(args.originalPayload.components?.length ? { components: args.originalPayload.components } : {}),
  };
}

export function buildScannerMorningHtfDeskMapPayload(args: {
  tradeDate: string;
  instrument: Instrument;
  session?: LiveSession | string;
  deskState: DeskState;
  completed5m: NinjaBridgeBar | null;
  currentPrice: number | null;
}): DiscordWebhookPayload {
  const play = args.deskState.primaryDeskPlay;
  const displayDirection = scannerHtfDeskMapDisplayDirection(play);
  const primary = scannerPrimaryDeskEmoji(displayDirection);
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
  const dataStatusLabel = scannerHtfDeskMapDataStatusLabel(args.deskState);
  const primaryReason = displayDirection === 'WAIT'
    ? 'No single primary side is active. Wait for completed 5M proof and clean map alignment.'
    : `${displayDirection} is the current desk map side, but execution still requires app-owned 5M trigger, stop, risk, target room, model, session, and canExecute gates.`;
  const tacticalMeaning = [
    `Macro read: ${htfStatus === 'sufficient' ? `HTF context is sufficient for map reading${dataQuality === 'partial' ? '; separate data-quality status is partial, so this remains map-only.' : '.'}` : `HTF context status is ${htfStatus}; treat as context only if data-limited.`}`,
    `Long: ${longReadiness}.`,
    `Short: ${shortReadiness}.`,
    `Execution: no Discord map approves a trade; 5M remains execution authority.`,
  ].join('\n');
  const bottomLine = displayDirection === 'WAIT'
    ? `Wait. Key battle area is ${keyBattleArea}. A completed close+hold through the tactical line improves one side; failure/rejection keeps the opposite side on review until the scanner-owned 5M gate confirms.`
    : `${displayDirection} map is active around ${scannerDiscordLine(play.lineInSand)}. Do not chase; wait for completed 5M confirmation and app-owned canExecute.`;
  const sessionLabel = args.session === 'evening'
    ? 'Evening'
    : args.session === 'lunch'
      ? 'Lunch/PM'
      : 'Morning';

  return {
    username: 'Quant Desk',
    content: `📊 ${args.instrument} ${sessionLabel} HTF Desk Map - ${args.tradeDate}`,
    embeds: [{
      title: `${args.instrument} ${sessionLabel} High Timeframe Desk Map - ${args.tradeDate}`,
      color: displayDirection === 'LONG' ? 0x22c55e : displayDirection === 'SHORT' ? 0xef4444 : 0xf97316,
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
      footer: { text: `Quant Desk • ${sessionLabel} HTF map only • ${dataStatusLabel} • Not execution approval` },
      timestamp: new Date().toISOString(),
    }],
  };
}

export async function prepareScannerMorningHtfDeskMapArtifacts(args: {
  tradeDate: string;
  instrument: Instrument;
  session: LiveSession;
  deskState: DeskState;
  normalized: ReturnType<typeof buildAppTradePlan>;
  chartContext: AnalysisResult['structuredChartContext'] | null | undefined;
  completed5m: NinjaBridgeBar | null;
  currentPrice: number | null;
  outputDir?: string;
}): Promise<{
  payload: DiscordWebhookPayload;
  files: string[];
  chartMarkup: string | null;
  levelMap: string | null;
}> {
  const payload = buildScannerMorningHtfDeskMapPayload({
    tradeDate: args.tradeDate,
    instrument: args.instrument,
    session: args.session,
    deskState: args.deskState,
    completed5m: args.completed5m,
    currentPrice: args.currentPrice,
  });
  const deskState = withScannerReviewMapPresentation({
    deskState: args.deskState,
    candidate: candidateForDeskPlayContextChart(args.deskState, args.normalized, args.currentPrice),
    normalized: args.normalized,
  });
  const play = deskState.primaryDeskPlay;
  const displayDirection = scannerHtfDeskMapDisplayDirection(play);
  const contextCandidate = displayDirection === 'WAIT'
    ? null
    : candidateForDeskPlayContextChart(deskState, args.normalized, args.currentPrice);
  const contextLine = play.activeTacticalLine?.activeLine ?? play.lineInSand;
  const chartMarkup = contextCandidate
    ? await renderChartMarkup({
        chartContext: args.chartContext || null,
        candidate: contextCandidate,
        instrument: args.instrument,
        tradeDate: args.tradeDate,
        sessionLabel: args.session,
        renderMode: 'desk_play_context',
        contextLine,
        contextLabel: play.activeTacticalLine?.migrated ? 'Active tactical line' : 'Line in the sand',
        outputDir: args.outputDir,
        filePrefix: `scanner-htf-desk-map-${args.session}-${args.tradeDate}-${args.instrument}`,
      })
    : null;
  const levelMap = contextCandidate
    ? await renderPriceLevelMap({
        chartContext: args.chartContext || null,
        candidate: contextCandidate,
        instrument: args.instrument,
        tradeDate: args.tradeDate,
        sessionLabel: args.session,
        outputDir: args.outputDir,
        filePrefix: `scanner-htf-desk-map-${args.session}-${args.tradeDate}-${args.instrument}`,
      })
    : null;
  const files = [chartMarkup, levelMap].filter((file): file is string => Boolean(file));
  validateDiscordPayload(payload, files);
  return { payload, files, chartMarkup, levelMap };
}

function compactScannerDiscordText(value: string | null | undefined, max = 260): string {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return 'N/A';
  return text.length <= max ? text : `${text.slice(0, max - 3)}...`;
}

function scannerReversalWatchDirectionEmoji(direction: string | null | undefined): string {
  if (direction === 'LONG') return '🐂';
  if (direction === 'SHORT') return '🐻';
  return '🛑';
}

function scannerReversalWatchStatusLabel(state: ScannerReversalWatchStateResult['state']): string {
  if (state === 'direction_validated') return '✅ Direction Validated';
  if (state === 'watch_active') return '👀 Watch Active';
  if (state === 'invalidated') return '🛑 Invalidated';
  if (state === 'no_chase') return '🚫 No Chase';
  return '⚠️ Forming';
}

function buildScannerReversalWatchDiscordPayload(args: {
  planVersionId: string;
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
  const status = scannerReversalWatchStatusLabel(args.state.state);
  const directionEmoji = scannerReversalWatchDirectionEmoji(direction);
  const exhaustedEmoji = scannerReversalWatchDirectionEmoji(exhausted);
  const activeZoneFailureTransition = scannerReversalWatchIsActiveZoneFailureTransition(args.lines);
  const invalidLabel = direction === 'LONG' ? 'Invalid Below' : direction === 'SHORT' ? 'Invalid Above' : 'Invalid At';
  const noChaseLabel = direction === 'LONG' ? 'No Chase Above' : direction === 'SHORT' ? 'No Chase Below' : 'No Chase At';
  const title = activeZoneFailureTransition
    ? `🔁 ${args.instrument} Campaign Transition Watch`
    : `🎯 ${args.instrument} Tactical Reversal Watch`;
  const sessionLabel = args.session === 'morning' ? 'Morning' : args.session === 'evening' ? 'Evening' : 'Lunch';
  const content = activeZoneFailureTransition
    ? `# 🔁 ${args.instrument} Campaign Transition Watch - ${sessionLabel}`
    : `# 🎯 ${args.instrument} Tactical Reversal Watch - ${sessionLabel}`;
  return {
    username: 'Quant Desk',
    content,
    embeds: [{
      title,
      color: args.state.state === 'direction_validated' ? 0x22c55e : args.state.state === 'watch_active' ? 0x38bdf8 : args.state.state === 'invalidated' ? 0xef4444 : 0xf97316,
      description: [
        activeZoneFailureTransition
          ? `${exhaustedEmoji} ${exhausted} structure failed / ${directionEmoji} ${direction} transition watch`
          : `${exhaustedEmoji} Primary: ${exhausted} campaign exhaustion / ${directionEmoji} ${direction} reversal watch`,
        '⚠️ Execution: NOT APPROVED - 5M watch map only.',
        `📌 Status: ${status}`,
        `📍 Reaction Zone: ${reaction}`,
        `${directionEmoji} ${directionLineLabel}: ${scannerDiscordLine(args.lines.triggerLine)}`,
        `🛑 ${invalidLabel}: ${scannerDiscordLine(args.lines.invalidLine)}`,
        `🚫 ${noChaseLabel}: ${scannerDiscordLine(args.lines.noChaseLine)}`,
        `💵 Current: ${scannerDiscordLine(args.currentPrice)}`,
      ].join('\n'),
      fields: [
        {
          name: '🕯️ 5M Trigger Rule',
          value: compactScannerDiscordText(args.lines.reclaimRule),
          inline: false,
        },
        {
          name: '🔁 Retest / Hold Rule',
          value: compactScannerDiscordText(args.lines.retestRule),
          inline: false,
        },
        {
          name: '📋 Watch Plan Levels (Reference Only)',
          value: compactScannerDiscordText([
            `🧭 Line in the Sand: ${directionEmoji} ${directionLineLabel} ${scannerDiscordLine(args.lines.triggerLine)}`,
            `📍 Entry ref: ${scannerDiscordLine(args.lines.referenceEntry)} | 🛑 Stop ref: ${scannerDiscordLine(args.lines.referenceStop)}`,
            `🎯 T1 ${scannerDiscordLine(args.lines.referenceTarget1)} | 🎯 T2 ${scannerDiscordLine(args.lines.referenceTarget2)}`,
            '⚠️ Reference only - no execution approval.',
            '🔬 1M may refine; completed 5M close/hold required.',
            `🧾 Blocker: ${args.lines.referenceReason || 'No executable app-owned tactical levels; normal canExecute gates still control.'}`,
          ].join('\n'), 460),
          inline: false,
        },
        {
          name: '🧾 Bottom Line',
          value: compactScannerDiscordText(`${args.state.reason} No canExecute change; app-owned 5M trigger, stop, risk, targets, model, and session gates control.`, 180),
          inline: false,
        },
      ],
      footer: { text: 'Quant Desk • Tactical Reversal Watch • Not execution approval' },
      timestamp: new Date().toISOString(),
    }],
    components: buildWatchFeedbackComponents({
      planVersionId: args.planVersionId,
      sessionType: args.session,
      tradeDate: args.tradeDate,
      instrument: args.instrument,
      watchDirection: args.lines.watchDirection,
      watchState: args.state.state,
    }),
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
  planVersionId: string;
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
    planVersionId: args.planVersionId,
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

export interface ScannerDiscordPostReceipt {
  deliveryStatus: 'sent' | 'skipped';
  webhookSource: ScannerDiscordDeliverySource;
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

function realDiscordWebhookSource(source: ScannerDiscordDeliverySource): ScannerDiscordWebhookEnvKey | null {
  if (source === 'dry_run' || source === 'discord_disabled' || source === 'phase11_boundary') return null;
  return source;
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

export function buildScannerLiveDiscordSendBoundaryReport(args: {
  postKind?: ScannerDiscordCleanupKind;
  config: Pick<ScannerConfig, 'dryRun' | 'liveDiscordPolicyConfirmed'>;
  healthReport: ScannerHealthReport;
  bridgeConnected: boolean;
  bridgeInstrumentResolved: boolean;
  completedFiveMinuteFresh: boolean;
  htfContextPresent: boolean;
  deskState: DeskState | null;
  decisionTapePath: string | null;
  auditPath: string | null;
  discordPayloadValidated: boolean;
  webhookConfigured: boolean;
  unifiedDeskOutputProductionSurfaceActive?: boolean;
}): LiveDiscordEligibilityReport {
  const highConfidenceConditionalOverride = scannerDeskStateHasHighConfidenceConditionalPlan(args.deskState);
  const scannerOwnedFreshMapOverride = scannerDeskStateHasFreshLiveDiscordMap(args.deskState);
  const rolloutConfirmed = Boolean(args.config.liveDiscordPolicyConfirmed) || highConfidenceConditionalOverride || scannerOwnedFreshMapOverride;
  const report = evaluateLiveDiscordPostEligibility({
    postKind: args.postKind || 'trade_alert',
    scannerHealth: args.healthReport,
    bridgeConnected: args.bridgeConnected,
    bridgeInstrumentResolved: args.bridgeInstrumentResolved,
    completedFiveMinuteFresh: args.completedFiveMinuteFresh,
    htfContextPresent: args.htfContextPresent,
    deskState: args.deskState,
    decisionTapeWritable: Boolean(args.decisionTapePath),
    auditPath: args.auditPath,
    discordPayloadValidated: args.discordPayloadValidated,
    discordPayloadHasVisibilityMetadata: args.deskState?.visibilityMetadata?.sourceOfTruth === 'scanner_desk_state_visibility_metadata',
    discordWebhookConfigured: args.webhookConfigured,
    dryRun: args.config.dryRun,
    freshDryScanObserved: rolloutConfirmed,
    diagnosticReplayPassed: rolloutConfirmed,
  });
  const postKind = args.postKind || 'trade_alert';
  if (
    args.unifiedDeskOutputProductionSurfaceActive &&
    (postKind === 'trade_alert' || postKind === 'desk_play')
  ) {
    if (scannerDeskStateHasApprovedUnifiedDeskOutputProductionPlan(args.deskState)) {
      return {
        ...report,
        notes: [
          ...report.notes,
          'Unified Desk Output production surface is active; approved scanner-owned model plan is allowed through the normal guarded Discord eligibility path.',
        ],
      };
    }
    const blocker = 'Unified Desk Output production surface is active; legacy scanner trade-plan Discord posts are production-suppressed. Only Unified Desk Output Approved Desk Plan rows may reach the production trade-plan lane.';
    return {
      ...report,
      eligible: false,
      blockers: [...report.blockers, blocker],
      notes: [
        ...report.notes,
        'Legacy scanner candidates remain local/audit-only while Unified Desk Output controls production trade-plan visibility.',
      ],
    };
  }
  return report;
}

function scannerLifecycleItemHasFullPlanLevels(item: DeskState['selectedCandidate']): boolean {
  return Boolean(
    item &&
    isFiniteTradePrice(item.entry) &&
    isFiniteTradePrice(item.stop) &&
    isFiniteTradePrice(item.target1) &&
    isFiniteTradePrice(item.target2)
  );
}

function scannerDeskStateHasApprovedUnifiedDeskOutputProductionPlan(deskState: DeskState | null): boolean {
  const item = deskState?.selectedCandidate;
  return Boolean(
    item &&
    isUnifiedDeskOutputApprovedProductionModel(item.setupType) &&
    scannerLifecycleItemHasFullPlanLevels(item) &&
    item.executionStatus !== ExecutionStatus.Blocked &&
    !item.filteredOutReason
  );
}

function scannerLifecycleItemQualityScore(item: DeskState['selectedCandidate']): number | null {
  const score = item?.decisionQualityScore ?? item?.modelConfidenceScore ?? null;
  return typeof score === 'number' && Number.isFinite(score) ? score : null;
}

function scannerDeskStateHasFreshLiveDiscordMap(deskState: DeskState | null): boolean {
  if (!deskState) return false;
  const liveReviewActions = new Set(['post_plan', 'post_review', 'post_conditional', 'post_watch']);
  const liveReviewModes = new Set(['POST_PLAN', 'POST_REVIEW', 'POST_CONDITIONAL', 'POST_WATCH']);
  if (!liveReviewModes.has(deskState.visibilityMode) || !liveReviewActions.has(deskState.discordAction)) return false;
  if (deskState.visibilityMetadata?.sourceOfTruth !== 'scanner_desk_state_visibility_metadata') return false;
  if (deskState.visibilityMetadata.visibilityMode !== deskState.visibilityMode) return false;
  if (deskState.visibilityMetadata.discordAction !== deskState.discordAction) return false;
  if (deskState.visibilityMetadata.authority?.discordEligible !== true) return false;
  if (deskState.dataQualityStatus === 'data_limited' || deskState.htfContextStatus === 'insufficient') return false;
  const suppressionText = [
    deskState.suppressionReason,
    deskState.visibilityMetadata?.suppressionReason,
    deskState.visibilityMetadata?.holdWithReason,
    deskState.visibilityMetadata?.noTradeWithReason,
    deskState.visibilityMetadata?.dataQualityBlocker,
    deskState.selectedCandidate?.filteredOutReason,
  ].filter(Boolean).join(' ');
  if (/\b(duplicate|ledger|already\s+pending|missed|no[-\s]?chase|stale|chasing|already\s+reached|target\s+already|T1\s+was\s+already\s+reached)\b/i.test(suppressionText)) {
    return false;
  }
  return true;
}

function scannerDeskStateHasHighConfidenceConditionalPlan(deskState: DeskState | null): boolean {
  if (!deskState) return false;
  if (deskState.canExecute) return false;
  const liveReviewActions = new Set(['post_conditional', 'post_review']);
  const liveReviewModes = new Set(['POST_CONDITIONAL', 'POST_REVIEW']);
  if (!liveReviewModes.has(deskState.visibilityMode) || !liveReviewActions.has(deskState.discordAction)) return false;
  if (!liveReviewModes.has(deskState.visibilityMetadata?.visibilityMode || '')) return false;
  if (!liveReviewActions.has(deskState.visibilityMetadata?.discordAction || '')) return false;
  if (deskState.visibilityMetadata?.authority?.canExecute !== false) return false;
  if (deskState.visibilityMetadata?.authority?.discordEligible !== true) return false;
  if (deskState.dataQualityStatus === 'data_limited' || deskState.htfContextStatus === 'insufficient') return false;
  const suppressionText = [
    deskState.suppressionReason,
    deskState.visibilityMetadata?.suppressionReason,
    deskState.visibilityMetadata?.holdWithReason,
    deskState.visibilityMetadata?.noTradeWithReason,
    deskState.visibilityMetadata?.dataQualityBlocker,
    deskState.selectedCandidate?.filteredOutReason,
  ].filter(Boolean).join(' ');
  if (/\b(duplicate|ledger|already\s+pending|missed|no[-\s]?chase|stale|chasing|already\s+reached|target\s+already|T1\s+was\s+already\s+reached)\b/i.test(suppressionText)) {
    return false;
  }
  const candidates = [
    deskState.selectedCandidate,
    deskState.bestLongPlan,
    deskState.bestShortPlan,
  ];
  return candidates.some((item) =>
    (item?.executionStatus === ExecutionStatus.Conditional ||
      item?.executionStatus === ExecutionStatus.Executable ||
      item?.detectedStatus === 'Conditional') &&
    (item.blockReason === NoTradeReason.EntryTriggerPending || item.blockReason === null || item.blockReason === undefined) &&
    scannerLifecycleItemHasFullPlanLevels(item) &&
    (scannerLifecycleItemQualityScore(item) ?? 0) >= HIGH_QUALITY_CONDITIONAL_REVIEW_MIN_SCORE
  );
}

function scannerLiveDiscordSendBoundarySkipReceipt(report: LiveDiscordEligibilityReport | null | undefined): ScannerDiscordPostReceipt | null {
  if (!report || report.eligible) return null;
  return {
    deliveryStatus: 'skipped',
    webhookSource: 'phase11_boundary',
    httpStatus: null,
    discordMessageId: null,
  };
}

function scannerLiveDiscordBoundaryFailedKeys(report: LiveDiscordEligibilityReport | null | undefined): string[] {
  return (report?.checks || []).filter((item) => !item.passed).map((item) => item.key);
}

export function scannerLiveDiscordHoldNoticeEligible(report: LiveDiscordEligibilityReport | null | undefined): boolean {
  if (!report || report.eligible) return false;
  const failed = scannerLiveDiscordBoundaryFailedKeys(report);
  if (!failed.length) return false;
  const blockerText = (report.blockers || []).join(' ');
  if (/\b(missed|no[-\s]?chase|stale|chasing|already\s+reached|target\s+already|T1\s+was\s+already\s+reached)\b/i.test(blockerText)) {
    return false;
  }
  const deskStateKeys = new Set(['desk_state_live_post_actionable', 'desk_state_not_operationally_suppressed']);
  return failed.every((key) => deskStateKeys.has(key));
}

function scannerDeskStateHoldReason(deskState: DeskState): string {
  const reasons = [
    deskState.suppressionReason,
    deskState.visibilityMetadata?.suppressionReason,
    deskState.visibilityMetadata?.holdWithReason,
    deskState.visibilityMetadata?.noTradeWithReason,
    deskState.visibilityMetadata?.dataQualityBlocker,
    deskState.promotion?.blockedBy?.join(' | '),
    deskState.nextTrigger ? `Trigger: ${deskState.nextTrigger}` : null,
  ].filter(Boolean);
  return reasons.length
    ? [...new Set(reasons.map((item) => String(item).trim()).filter(Boolean))].join(' | ')
    : 'Scanner held the post because DeskState is not a fresh live Discord plan.';
}

export function scannerLiveHoldNoticeKey(args: {
  tradeDate: string;
  instrument: Instrument;
  session: LiveSession;
  deskState: DeskState;
}): string {
  const play = args.deskState.primaryDeskPlay;
  return [
    args.tradeDate,
    args.instrument,
    args.session,
    'live-hold',
    args.deskState.visibilityMode || 'unknown',
    args.deskState.discordAction || 'unknown',
    play?.direction || 'WAIT',
    play?.modelRouting?.bestActiveModelName || play?.modelRouting?.bestActiveModel || 'unknown',
    args.deskState.marketMode || 'unknown',
  ].join('|');
}

function scannerLegacyLiveHoldNoticeAlreadySent(args: {
  sent: Record<string, string>;
  tradeDate: string;
  instrument: Instrument;
  session: LiveSession;
  deskState: DeskState;
}): boolean {
  const prefix = [
    args.tradeDate,
    args.instrument,
    args.session,
    'live-hold',
  ].join('|') + '|';
  return Object.keys(args.sent).some((key) => key.startsWith(prefix));
}

export function buildScannerLiveHoldNoticePayload(args: {
  tradeDate: string;
  session: LiveSession;
  config: ScannerConfig;
  windowLabel: string;
  currentPrice: number | null;
  completed5m: NinjaBridgeBar | null;
  deskState: DeskState;
  reason: string;
  boundary: LiveDiscordEligibilityReport;
  postKind: ScannerDiscordCleanupKind;
}): DiscordWebhookPayload {
  const play = args.deskState.primaryDeskPlay;
  const failedChecks = scannerLiveDiscordBoundaryFailedKeys(args.boundary);
  return {
    username: 'Quant Desk',
    content: `# Quant Desk Scanner Hold - ${args.config.instrument} ${args.session.toUpperCase()}\nNo live trade plan was posted. The scanner held the setup and logged the reason below.`,
    embeds: [
      {
        title: `Scanner Held ${play.direction === 'WAIT' ? 'Desk Plan' : `${play.direction} Plan`}`,
        description: 'This is a visibility notice only. It is not a trade approval, not an entry, and not an outcome button card.',
        color: 0xf59e0b,
        fields: [
          {
            name: 'Held Reason',
            value: clip(args.reason, 900),
            inline: false,
          },
          {
            name: 'Desk State',
            value: clip([
              `Visibility: ${args.deskState.visibilityMode}`,
              `Discord action: ${args.deskState.discordAction}`,
              `Market mode: ${args.deskState.marketMode}`,
              `canExecute: ${args.deskState.canExecute ? 'true' : 'false'}`,
              `Post kind held: ${args.postKind}`,
            ].join('\n')),
            inline: false,
          },
          {
            name: 'Line / Next Condition',
            value: clip([
              `Line in the Sand: ${money(play.lineInSand ?? args.deskState.lineInSand)}`,
              `Trigger: ${play.nextTrigger || args.deskState.nextTrigger || 'N/A'}`,
              `Invalid: ${String(play.invalidation || args.deskState.invalidation || 'N/A').replace(/^invalid(?:ation)?\s*:\s*/i, '').replace(/^invalid\s+if\s+/i, '').replace(/^invalid\s+/i, '')}`,
              `No chase: ${play.noChase || 'N/A'}`,
            ].join('\n')),
            inline: false,
          },
          {
            name: 'Run Context',
            value: clip([
              `Trade date: ${args.tradeDate}`,
              `Window: ${args.windowLabel}`,
              `Latest completed 5M: ${args.completed5m?.time || 'N/A'}`,
              `Current price: ${money(args.currentPrice)}`,
              `Boundary checks held: ${failedChecks.join(', ') || 'N/A'}`,
            ].join('\n')),
            inline: false,
          },
        ],
        footer: { text: 'Quant Desk - Scanner hold notice - no execution authority' },
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

async function sendScannerLiveHoldNoticeIfNeeded(args: {
  state: ScannerStateFile;
  config: ScannerConfig;
  tradeDate: string;
  session: LiveSession;
  windowLabel: string;
  currentPrice: number | null;
  completed5m: NinjaBridgeBar | null;
  deskState: DeskState;
  boundary: LiveDiscordEligibilityReport;
  postKind: ScannerDiscordCleanupKind;
}): Promise<void> {
  if (!scannerLiveDiscordHoldNoticeEligible(args.boundary)) return;
  const reason = scannerDeskStateHoldReason(args.deskState);
  const key = scannerLiveHoldNoticeKey({
    tradeDate: args.tradeDate,
    instrument: args.config.instrument,
    session: args.session,
    deskState: args.deskState,
  });
  if (args.state.liveHoldNoticeSent[key] || scannerLegacyLiveHoldNoticeAlreadySent({
    sent: args.state.liveHoldNoticeSent,
    tradeDate: args.tradeDate,
    instrument: args.config.instrument,
    session: args.session,
    deskState: args.deskState,
  })) {
    args.state.liveHoldNoticeSent[key] = args.state.liveHoldNoticeSent[key] || new Date().toISOString();
    console.log(`[scanner-discord] Live hold notice already posted for ${key}.`);
    return;
  }
  try {
    const payload = buildScannerLiveHoldNoticePayload({
      tradeDate: args.tradeDate,
      session: args.session,
      config: args.config,
      windowLabel: args.windowLabel,
      currentPrice: args.currentPrice,
      completed5m: args.completed5m,
      deskState: args.deskState,
      reason,
      boundary: args.boundary,
      postKind: args.postKind,
    });
    const receipt = await postDiscord(payload, args.config);
    if (receipt.deliveryStatus === 'sent') {
      const sentAt = new Date().toISOString();
      args.state.liveHoldNoticeSent[key] = sentAt;
      recordScannerDiscordCleanupMessage({
        state: args.state,
        config: args.config,
        receipt,
        kind: 'live_hold_notice',
        key,
      });
      console.log(`[scanner-discord] Sent live hold notice: ${key}`);
    }
  } catch (error) {
    console.warn(`[scanner-discord] Live hold notice failed safely; scanner will continue: ${sanitizedError(error)}`);
  }
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
    webhookSource: realDiscordWebhookSource(args.receipt.webhookSource),
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
  liveSendBoundary?: LiveDiscordEligibilityReport,
): Promise<ScannerDiscordPostReceipt> {
  validateDiscordPayload(payload, files);
  if (config.dryRun || !config.discordEnabled) {
    const source = config.dryRun ? 'dry_run' : 'discord_disabled';
    if (config.verboseDiscordPayloadLog) {
      console.log(JSON.stringify({ ...payload, chartMarkupFiles: files }, null, 2));
    } else {
      console.log(scannerDiscordDryRunSummaryLine({ payload, files, source }));
    }
    return {
      deliveryStatus: 'skipped',
      webhookSource: source,
      httpStatus: null,
      discordMessageId: null,
    };
  }
  const boundarySkipReceipt = scannerLiveDiscordSendBoundarySkipReceipt(liveSendBoundary);
  if (boundarySkipReceipt) {
    console.warn(`[scanner-discord] Phase 11B live Discord send boundary blocked scanner post: ${liveSendBoundary?.blockers.join(' | ')}`);
    return boundarySkipReceipt;
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

async function postScannerDiscordManaged(args: {
  kind: ScannerDiscordCleanupKind;
  key: string;
  payload: DiscordWebhookPayload;
  config: ScannerConfig;
  files?: string[];
  webhookOverride?: ScannerWebhookResolution;
  liveSendBoundary?: LiveDiscordEligibilityReport;
  holdNotice?: {
    state: ScannerStateFile;
    tradeDate: string;
    session: LiveSession;
    windowLabel: string;
    currentPrice: number | null;
    completed5m: NinjaBridgeBar | null;
    deskState: DeskState;
  };
}): Promise<ScannerDiscordPostReceipt> {
  const receipt = await postDiscord(
    args.payload,
    args.config,
    args.files || [],
    args.webhookOverride,
    args.liveSendBoundary,
  );
  const source = receipt.webhookSource || 'unknown';
  if (receipt.deliveryStatus === 'sent') {
    console.log(`[scanner-discord] posted kind=${args.kind} key=${args.key} source=${source} http=${receipt.httpStatus ?? 'N/A'} message=${receipt.discordMessageId || 'N/A'}`);
    return receipt;
  }
  const blockers = args.liveSendBoundary?.blockers?.length
    ? ` blockers=${args.liveSendBoundary.blockers.join(' | ')}`
    : '';
  console.log(`[scanner-discord] held kind=${args.kind} key=${args.key} source=${source} status=${receipt.deliveryStatus}${blockers}`);
  if (receipt.webhookSource === 'phase11_boundary' && args.liveSendBoundary && args.holdNotice) {
    await sendScannerLiveHoldNoticeIfNeeded({
      state: args.holdNotice.state,
      config: args.config,
      tradeDate: args.holdNotice.tradeDate,
      session: args.holdNotice.session,
      windowLabel: args.holdNotice.windowLabel,
      currentPrice: args.holdNotice.currentPrice,
      completed5m: args.holdNotice.completed5m,
      deskState: args.holdNotice.deskState,
      boundary: args.liveSendBoundary,
      postKind: args.kind,
    });
  }
  return receipt;
}

async function sendScannerHealthAlertIfNeeded(args: {
  config: ScannerConfig;
  state: ScannerStateFile;
  report: ScannerHealthReport;
}): Promise<void> {
  const previousStatus = args.state.lastHealthStatus;
  const currentStatus = args.report.status;
  args.state.lastHealthStatus = currentStatus;
  if (!shouldSendScannerHealthAlert(previousStatus, currentStatus)) return;

  if (!args.config.discordEnabled) {
    console.log(`[scanner-health] Discord health alert skipped because Discord is disabled: ${previousStatus || 'none'} -> ${currentStatus}`);
    return;
  }

  const webhook = resolveScannerDiscordWebhookUrl();
  if (!args.config.dryRun && !webhook.url) {
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

function isHighQualityConditionalPrimaryAlertCandidate(candidate?: SetupCandidate | null): boolean {
  if (candidate?.decisionQualityHardBlocker) return false;
  if (candidate?.targetRoom?.targetRoomStatus === 'blocked_before_t1') return false;
  const score = candidate?.decisionQualityScore ?? candidate?.modelConfidenceScore ?? null;
  const executionStatusEligible =
    candidate?.executionStatus === ExecutionStatus.Conditional ||
    candidate?.executionStatus === ExecutionStatus.Executable;
  const blockerEligible =
    candidate?.executionStatus === ExecutionStatus.Executable ||
    candidate?.blockReason === NoTradeReason.EntryTriggerPending ||
    candidate?.blockReason === null ||
    candidate?.blockReason === undefined;
  return Boolean(
    candidate &&
    (candidate.direction === 'LONG' || candidate.direction === 'SHORT') &&
    executionStatusEligible &&
    blockerEligible &&
    isFiniteTradePrice(candidate.entry) &&
    isFiniteTradePrice(candidate.stop) &&
    isFiniteTradePrice(candidate.target1) &&
    isFiniteTradePrice(candidate.target2) &&
    typeof score === 'number' &&
    Number.isFinite(score) &&
    score >= HIGH_QUALITY_CONDITIONAL_REVIEW_MIN_SCORE
  );
}

function completedCloseCrossedCampaignLine(args: {
  campaignDirection: 'LONG' | 'SHORT';
  lineInSand: number | null;
  completed5m?: NinjaBridgeBar | null;
}): boolean {
  if (!isFiniteTradePrice(args.lineInSand) || !isFiniteTradePrice(args.completed5m?.close)) return false;
  return args.campaignDirection === 'LONG'
    ? args.completed5m!.close < args.lineInSand!
    : args.completed5m!.close > args.lineInSand!;
}

export function evaluateScannerDiscordCampaignTransition(args: {
  candidate?: SetupCandidate | null;
  priorActiveDelivery?: ScannerAlertDeliveryRecord | null;
  completed5m?: NinjaBridgeBar | null;
}): ScannerDiscordCampaignTransitionReview {
  const candidateDirection = args.candidate?.direction === 'LONG' || args.candidate?.direction === 'SHORT'
    ? args.candidate.direction
    : null;
  const priorDirection = args.priorActiveDelivery?.candidate?.direction === 'LONG' || args.priorActiveDelivery?.candidate?.direction === 'SHORT'
    ? args.priorActiveDelivery.candidate.direction
    : null;
  if (!candidateDirection || !priorDirection || candidateDirection === priorDirection) {
    return { blocksOppositeDirection: false, reason: null };
  }
  if (args.priorActiveDelivery?.deliveryStatus !== 'sent') {
    return { blocksOppositeDirection: false, reason: null };
  }
  const priorLine = args.priorActiveDelivery.candidate.activeCampaign?.lineInSand ??
    args.priorActiveDelivery.candidate.entry ??
    null;
  const crossed = completedCloseCrossedCampaignLine({
    campaignDirection: priorDirection,
    lineInSand: priorLine,
    completed5m: args.completed5m,
  });
  if (crossed) {
    return {
      blocksOppositeDirection: false,
      reason: `${priorDirection} campaign line crossed by completed 5M close at ${args.completed5m?.close?.toFixed(2) ?? 'unknown'} through ${priorLine?.toFixed?.(2) ?? 'unknown'}; Discord may present the state transition before any ${candidateDirection} review.`,
    };
  }
  return {
    blocksOppositeDirection: true,
    reason: [
      `${priorDirection} campaign still active`,
      `candidate side ${candidateDirection} is opposite prior Discord campaign ${priorDirection}`,
      `line in the sand ${priorLine?.toFixed?.(2) ?? 'unknown'} has not been crossed by a completed 5M candle`,
      `${candidateDirection} cannot be promoted until Discord shows ${priorDirection} paused/invalidated or the scanner proves a completed line-cross transition.`,
    ].join('; '),
  };
}

export function evaluateScannerPrimaryAlertPublishingGate(args: {
  alertDecision: ScannerAlertDecision;
  deskState: DeskState;
  candidate?: SetupCandidate | null;
  confidence?: ScannerConfidenceBreakdown | null;
  normalizedCanExecute?: boolean | null;
  state: ScannerState;
  currentPrice?: number | null;
  staleReason?: string | null;
  scannerReviewStatus?: string | null;
  priorActiveDelivery?: ScannerAlertDeliveryRecord | null;
  completed5m?: NinjaBridgeBar | null;
}): ScannerAlertDecision {
  const reasons: string[] = [];
  const play = args.deskState.primaryDeskPlay;
  const candidateDirection = args.candidate?.direction || null;
  const primaryDirection = play.direction;
  const htfFvgRoutedDirection = play.htfFvgReactionRouting?.status === 'routed_active_reaction'
    ? play.htfFvgReactionRouting.direction
    : null;
  const readinessStatus = candidateReadinessStatus(args.deskState, args.candidate);
  const staleText = `${args.staleReason || ''} ${args.scannerReviewStatus || ''}`.trim();
  const confidenceHardBlocker = typeof args.confidence?.hardBlocker === 'string' && args.confidence.hardBlocker.trim()
    ? args.confidence.hardBlocker.trim()
    : null;
  const confidenceScore = typeof args.confidence?.score === 'number' && Number.isFinite(args.confidence.score)
    ? args.confidence.score
    : null;

  if (!args.normalizedCanExecute) reasons.push('canExecute=false');
  if (confidenceHardBlocker) reasons.push(`decision quality hard blocker: ${confidenceHardBlocker}`);
  if (confidenceScore !== null && confidenceScore <= 0) reasons.push(`decision quality score=${confidenceScore}`);
  if (primaryDirection === 'WAIT') reasons.push('DeskState primary=WAIT');
  if (candidateDirection && primaryDirection !== 'WAIT' && candidateDirection !== primaryDirection) {
    reasons.push(`candidate side ${candidateDirection} conflicts with DeskState ${primaryDirection}`);
  }
  if (
    candidateDirection &&
    (htfFvgRoutedDirection === 'LONG' || htfFvgRoutedDirection === 'SHORT') &&
    candidateDirection !== htfFvgRoutedDirection
  ) {
    reasons.push(`candidate side ${candidateDirection} conflicts with active HTF FVG routing ${htfFvgRoutedDirection}`);
  }
  if (readinessStatus && readinessStatus !== 'ready' && readinessStatus !== 'aligned') {
    reasons.push(`readiness=${readinessStatus}`);
  }
  if (play.htfConflict) reasons.push('HTF/protected structure conflict');
  if (args.state === 'Missed') reasons.push('state=Missed');
  if (/stale|missed|no chase|already_triggered|no_fresh_entry/i.test(staleText)) {
    reasons.push('stale/no-chase review state');
  }
  if (args.deskState.dataQualityStatus === 'data_limited' || args.deskState.htfContextStatus === 'insufficient') {
    reasons.push('HTF/data context insufficient for high-confidence review publication');
  }
  const candidateStaleReason = highQualityConditionalReviewStaleReason(args.candidate || null, args.currentPrice ?? null);
  if (candidateStaleReason) reasons.push(candidateStaleReason);
  const campaignTransition = evaluateScannerDiscordCampaignTransition({
    candidate: args.candidate,
    priorActiveDelivery: args.priorActiveDelivery,
    completed5m: args.completed5m,
  });
  if (campaignTransition.blocksOppositeDirection && campaignTransition.reason) {
    reasons.push(campaignTransition.reason);
  }
  const activeZone = play.activeTacticalZone;
  const currentPrice = args.currentPrice;
  if (
    args.candidate?.direction === 'SHORT' &&
    activeZone?.direction === 'SHORT' &&
    isFiniteTradePrice(currentPrice) &&
    isFiniteTradePrice(activeZone.upper) &&
    currentPrice > activeZone.upper
  ) {
    reasons.push(`current price ${currentPrice.toFixed(2)} is above active tactical zone ${activeZone.lower?.toFixed?.(2) || 'N/A'}-${activeZone.upper.toFixed(2)}`);
  }
  if (
    args.candidate?.direction === 'LONG' &&
    activeZone?.direction === 'LONG' &&
    isFiniteTradePrice(currentPrice) &&
    isFiniteTradePrice(activeZone.lower) &&
    currentPrice < activeZone.lower
  ) {
    reasons.push(`current price ${currentPrice.toFixed(2)} is below active tactical zone ${activeZone.lower.toFixed(2)}-${activeZone.upper?.toFixed?.(2) || 'N/A'}`);
  }

  if (!reasons.length) {
    return campaignTransition.reason
      ? { ...args.alertDecision, reason: `${args.alertDecision.reason} Campaign transition: ${campaignTransition.reason}` }
      : args.alertDecision;
  }

  if (
    isHighQualityConditionalPrimaryAlertCandidate(args.candidate) &&
    args.state !== 'Missed' &&
    !/stale|missed|no chase|already_triggered|no_fresh_entry/i.test(staleText) &&
    !candidateStaleReason &&
    !confidenceHardBlocker &&
    (confidenceScore === null || confidenceScore > 0) &&
    !campaignTransition.blocksOppositeDirection &&
    args.deskState.dataQualityStatus !== 'data_limited' &&
    args.deskState.htfContextStatus !== 'insufficient' &&
    !reasons.some((reason) => /conflicts with DeskState/i.test(reason)) &&
    !reasons.some((reason) => /conflicts with active HTF FVG routing/i.test(reason)) &&
    !reasons.some((reason) => /current price .* active tactical zone/i.test(reason))
  ) {
    const transitionText = campaignTransition.reason ? ` Campaign transition: ${campaignTransition.reason}` : '';
    return {
      shouldSend: true,
      reason: `${args.alertDecision.reason}${transitionText} Primary trade-card DeskState/readiness suppression bypassed for high-confidence conditional publication: ${Array.from(new Set(reasons)).join('; ')}. Discord publication is REVIEW ONLY / NOT EXECUTION APPROVAL; it becomes execution-approved only if the named completed 5M condition closes and the app-owned canExecute gate turns true.`,
    };
  }

  if (!args.alertDecision.shouldSend) {
    const score = args.candidate?.decisionQualityScore ?? args.candidate?.modelConfidenceScore ?? null;
    const highScoreCandidate = typeof score === 'number' &&
      Number.isFinite(score) &&
      score >= HIGH_QUALITY_CONDITIONAL_REVIEW_MIN_SCORE;
    if (!highScoreCandidate) return args.alertDecision;
    return {
      shouldSend: false,
      reason: `${args.alertDecision.reason} High-confidence review visibility check did not publish: ${Array.from(new Set(reasons)).join('; ') || 'candidate was not a fresh complete high-confidence review plan'}.`,
    };
  }

  return {
    shouldSend: false,
    reason: `Primary trade-card suppressed by DeskState/readiness gate: ${Array.from(new Set(reasons)).join('; ')}. Publish as Current Desk Plan/review map only if eligible.`,
  };
}

export function latestSentScannerTradeAlertDelivery(args: {
  deliveries: Record<string, ScannerAlertDeliveryRecord>;
  tradeDate: string;
  instrument: Instrument;
  session: LiveSession;
  excludeAlertKey?: string | null;
}): ScannerAlertDeliveryRecord | null {
  const rows = Object.entries(args.deliveries)
    .filter(([key, delivery]) =>
      key !== args.excludeAlertKey &&
      delivery.deliveryStatus === 'sent' &&
      delivery.tradeDate === args.tradeDate &&
      delivery.instrument === args.instrument &&
      delivery.session === args.session &&
      Boolean(delivery.discordMessageId) &&
      (delivery.candidate.direction === 'LONG' || delivery.candidate.direction === 'SHORT')
    )
    .map(([, delivery]) => delivery)
    .sort((a, b) => Date.parse(b.sentAt || b.attemptedAt) - Date.parse(a.sentAt || a.attemptedAt));
  return rows[0] || null;
}

export function applyScannerHardDuplicateAlertSuppression(args: {
  alertDecision: ScannerAlertDecision;
  alertKey: string;
  existing?: { state: ScannerState; confidence: number; sentAt: string } | null;
  previousDelivery?: ScannerAlertDeliveryRecord | null;
  planVersionId: string;
}): ScannerAlertDecision {
  if (!args.alertDecision.shouldSend || !args.existing) return args.alertDecision;
  const priorPlanVersionId = args.previousDelivery?.planVersionId || 'unknown';
  const priorDiscordMessageId = args.previousDelivery?.discordMessageId || 'unknown';
  return {
    shouldSend: false,
    reason: [
      args.alertDecision.reason,
      'duplicate_suppressed_hard',
      'same_candidate_lifecycle_refresh_suppressed',
      `alertKey=${args.alertKey}`,
      `priorPlanVersionId=${priorPlanVersionId}`,
      `priorDiscordMessageId=${priorDiscordMessageId}`,
      `currentPlanVersionId=${args.planVersionId}`,
      'High-confidence conditional bypass cannot override durable duplicate suppression.',
    ].join(' | '),
  };
}

export function applyScannerNearDuplicateTradeAlertCadenceSuppression(args: {
  alertDecision: ScannerAlertDecision;
  alertKey: string;
  candidate?: SetupCandidate | null;
  state: ScannerState;
  priorActiveDelivery?: ScannerAlertDeliveryRecord | null;
  planVersionId: string;
  now?: string | null;
}): ScannerAlertDecision {
  if (!args.alertDecision.shouldSend || !args.priorActiveDelivery || !args.candidate) return args.alertDecision;
  const candidateDirection = args.candidate.direction === 'LONG' || args.candidate.direction === 'SHORT'
    ? args.candidate.direction
    : null;
  const prior = args.priorActiveDelivery;
  if (!candidateDirection || prior.candidate.direction !== candidateDirection) return args.alertDecision;
  if (prior.candidate.setupType !== args.candidate.setupType) return args.alertDecision;
  if (prior.state !== args.state) return args.alertDecision;
  const priorSentAt = Date.parse(prior.sentAt || prior.attemptedAt || '');
  const currentAt = Date.parse(args.now || new Date().toISOString());
  if (!Number.isFinite(priorSentAt) || !Number.isFinite(currentAt)) return args.alertDecision;
  const elapsedMs = currentAt - priorSentAt;
  if (elapsedMs < 0 || elapsedMs > SCANNER_NEAR_DUPLICATE_TRADE_ALERT_WINDOW_MS) return args.alertDecision;
  const currentEntry = isFiniteTradePrice(args.candidate.entry) ? args.candidate.entry : null;
  const priorEntry = isFiniteTradePrice(prior.candidate.entry) ? prior.candidate.entry : null;
  if (currentEntry === null || priorEntry === null) return args.alertDecision;
  const entryDrift = Math.abs(currentEntry - priorEntry);
  if (entryDrift > SCANNER_NEAR_DUPLICATE_TRADE_ALERT_ENTRY_DRIFT_POINTS) return args.alertDecision;
  const elapsedMinutes = elapsedMs / 60_000;
  return {
    shouldSend: false,
    reason: [
      args.alertDecision.reason,
      'near_duplicate_trade_alert_cadence_suppressed',
      'same_family_nearby_entry_refresh_suppressed',
      `alertKey=${args.alertKey}`,
      `priorAlertKey=${prior.alertKey}`,
      `priorPlanVersionId=${prior.planVersionId}`,
      `priorDiscordMessageId=${prior.discordMessageId || 'unknown'}`,
      `currentPlanVersionId=${args.planVersionId}`,
      `elapsedMinutes=${elapsedMinutes.toFixed(2)}`,
      `entryDrift=${entryDrift.toFixed(2)}`,
      'Same direction/model/state trade alert posted recently with nearby entry; keep this refresh local to avoid Discord report churn.',
    ].join(' | '),
  };
}

export function applyScannerCompletedFiveMinuteZoneFailureSuppression(args: {
  alertDecision: ScannerAlertDecision;
  deskState: DeskState;
  candidate?: SetupCandidate | null;
  completed5m?: NinjaBridgeBar | null;
}): ScannerAlertDecision {
  const candidateDirection = args.candidate?.direction || null;
  const activeZone = args.deskState.primaryDeskPlay.activeTacticalZone;
  const completedClose = args.completed5m?.close;
  if (
    candidateDirection === 'SHORT' &&
    activeZone?.direction === 'SHORT' &&
    isFiniteTradePrice(completedClose) &&
    isFiniteTradePrice(activeZone.upper) &&
    completedClose > activeZone.upper
  ) {
    return {
      shouldSend: false,
      reason: [
        args.alertDecision.reason,
        'zone_failed_completed_5m',
        'action=short_trade_plan_suppressed_stand_down_or_invalidation_only',
        `direction=SHORT`,
        `completedBarTime=${args.completed5m?.time || 'unknown'}`,
        `completedClose=${completedClose.toFixed(2)}`,
        `zoneLower=${isFiniteTradePrice(activeZone.lower) ? activeZone.lower.toFixed(2) : 'unknown'}`,
        `zoneUpper=${activeZone.upper.toFixed(2)}`,
        'Completed 5M close above the active SHORT tactical zone blocks further live short trade-plan delivery.',
      ].join(' | '),
    };
  }
  if (
    candidateDirection === 'LONG' &&
    activeZone?.direction === 'LONG' &&
    isFiniteTradePrice(completedClose) &&
    isFiniteTradePrice(activeZone.lower) &&
    completedClose < activeZone.lower
  ) {
    return {
      shouldSend: false,
      reason: [
        args.alertDecision.reason,
        'zone_failed_completed_5m',
        'action=long_trade_plan_suppressed_stand_down_or_invalidation_only',
        `direction=LONG`,
        `completedBarTime=${args.completed5m?.time || 'unknown'}`,
        `completedClose=${completedClose.toFixed(2)}`,
        `zoneLower=${activeZone.lower.toFixed(2)}`,
        `zoneUpper=${isFiniteTradePrice(activeZone.upper) ? activeZone.upper.toFixed(2) : 'unknown'}`,
        'Completed 5M close below the active LONG tactical zone blocks further live long trade-plan delivery.',
      ].join(' | '),
    };
  }
  return args.alertDecision;
}

export function applyScannerTradeAlertSuppressionAfterDeskPlay(args: {
  alertDecision: ScannerAlertDecision;
  scannerDeskOutput?: ScannerDeskOutputContract | null;
  deskPlanRefreshSent: Record<string, ScannerDeskPlanRefreshLedgerRecord>;
  tradeDate: string;
  instrument: Instrument;
  session: LiveSession | string;
  planVersionId: string;
}): ScannerAlertDecision {
  const publishIntent = args.scannerDeskOutput?.publishToDiscord ?? args.alertDecision.shouldSend;
  if (!publishIntent) return args.alertDecision;
  const priorDeskPlan = latestDeskPlanRefreshRecord({
    sent: args.deskPlanRefreshSent,
    tradeDate: args.tradeDate,
    instrument: args.instrument,
    session: args.session,
  });
  if (!priorDeskPlan) return args.alertDecision;
  return {
    shouldSend: false,
    reason: [
      args.alertDecision.reason,
      'legacy_trade_alert_suppressed_after_scanner_owned_desk_play',
      `priorDeskPlanDirection=${priorDeskPlan.direction}`,
      `priorDeskPlanModel=${priorDeskPlan.setupType || 'no-setup'}`,
      `priorDeskPlanSentAt=${priorDeskPlan.sentAt}`,
      `currentPlanVersionId=${args.planVersionId}`,
      `scannerDeskOutputStatus=${args.scannerDeskOutput?.status || 'not_provided'}`,
      'Scanner-owned Desk Play already owns this session/instrument on Discord; legacy trade_alert is held local so it cannot compete with the desk card.',
    ].join(' | '),
  };
}

export function applyScannerTradeAlertSuppressionForScannerOwnedSurface(args: {
  alertDecision: ScannerAlertDecision;
  scannerDeskOutput?: ScannerDeskOutputContract | null;
  scannerOwnedSurfaceActive: boolean;
  tradeDate: string;
  instrument: Instrument;
  session: LiveSession | string;
  planVersionId: string;
}): ScannerAlertDecision {
  const publishIntent = args.scannerDeskOutput?.publishToDiscord ?? args.alertDecision.shouldSend;
  if (!publishIntent || !args.scannerOwnedSurfaceActive) return args.alertDecision;
  return {
    shouldSend: false,
    reason: [
      args.alertDecision.reason,
      'legacy_trade_alert_suppressed_by_scanner_owned_surface',
      `tradeDate=${args.tradeDate}`,
      `instrument=${args.instrument}`,
      `session=${args.session}`,
      `currentPlanVersionId=${args.planVersionId}`,
      `scannerDeskOutputStatus=${args.scannerDeskOutput?.status || 'not_provided'}`,
      'Scanner-owned five-model/Desk Play surface owns production Discord; legacy trade_alert is held local to prevent competing cards and per-candle alert churn.',
    ].join(' | '),
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
            name: '✅ Active Models',
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

export interface ScannerCompletedFiveMinuteLatencySentinel {
  sourceOfTruth: 'scanner_completed_5m_latency_sentinel';
  status: 'on_time' | 'late' | 'missing';
  latestCompletedTime: string | null;
  completedAtIso: string | null;
  observedAtIso: string;
  latencySeconds: number | null;
  warningThresholdSeconds: number;
  message: string;
  recoverySteps: string[];
  approvalBoundary: {
    changesTradeApprovals: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRiskRules: false;
    changesBridgeBehavior: false;
  };
}

function completedFiveMinuteCloseTime(args: {
  completed5m: NinjaBridgeBar;
  timestampMode: BridgeTimestampMode;
  timeZoneMode: BridgeTimeZoneMode;
}): Date | null {
  const parsed = parseBridgeTime(args.completed5m.time, args.timeZoneMode);
  if (!parsed) return null;
  return args.timestampMode === 'close'
    ? parsed
    : new Date(parsed.getTime() + 5 * 60_000);
}

export function scannerCompletedFiveMinuteLatencyWarningThresholdSeconds(pollSeconds: number | null | undefined): number {
  const normalizedPollSeconds = Number.isFinite(pollSeconds) && Number(pollSeconds) > 0
    ? Number(pollSeconds)
    : 60;
  return Math.max(300, Math.ceil(normalizedPollSeconds * 3));
}

export function evaluateScannerCompletedFiveMinuteLatencySentinel(args: {
  completed5m: NinjaBridgeBar | null;
  now: Date;
  timestampMode: BridgeTimestampMode;
  timeZoneMode: BridgeTimeZoneMode;
  warningThresholdSeconds?: number;
}): ScannerCompletedFiveMinuteLatencySentinel {
  const warningThresholdSeconds = Math.max(15, args.warningThresholdSeconds ?? 90);
  const recoverySteps = [
    'Confirm the scanner process is running continuously, not only as a delayed one-shot replay.',
    'Confirm NinjaTrader bridge 5M bars are updating immediately after each completed candle.',
    'Reduce scanner poll cadence only after bridge freshness is confirmed; do not change trading rules to compensate for late bars.',
  ];
  const boundary = {
    changesTradeApprovals: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    changesRiskRules: false,
    changesBridgeBehavior: false,
  } as const;

  if (!args.completed5m) {
    return {
      sourceOfTruth: 'scanner_completed_5m_latency_sentinel',
      status: 'missing',
      latestCompletedTime: null,
      completedAtIso: null,
      observedAtIso: args.now.toISOString(),
      latencySeconds: null,
      warningThresholdSeconds,
      message: 'Completed 5M latency sentinel missing: no completed 5M bar was available for timing review.',
      recoverySteps,
      approvalBoundary: boundary,
    };
  }

  const completedAt = completedFiveMinuteCloseTime({
    completed5m: args.completed5m,
    timestampMode: args.timestampMode,
    timeZoneMode: args.timeZoneMode,
  });
  if (!completedAt) {
    return {
      sourceOfTruth: 'scanner_completed_5m_latency_sentinel',
      status: 'missing',
      latestCompletedTime: args.completed5m.time,
      completedAtIso: null,
      observedAtIso: args.now.toISOString(),
      latencySeconds: null,
      warningThresholdSeconds,
      message: `Completed 5M latency sentinel could not parse bar time ${args.completed5m.time}.`,
      recoverySteps,
      approvalBoundary: boundary,
    };
  }

  const latencySeconds = Math.max(0, Math.round((args.now.getTime() - completedAt.getTime()) / 1000));
  const status = latencySeconds > warningThresholdSeconds ? 'late' : 'on_time';
  return {
    sourceOfTruth: 'scanner_completed_5m_latency_sentinel',
    status,
    latestCompletedTime: args.completed5m.time,
    completedAtIso: completedAt.toISOString(),
    observedAtIso: args.now.toISOString(),
    latencySeconds,
    warningThresholdSeconds,
    message: status === 'late'
      ? `Completed 5M latency sentinel late: latest completed 5M bar ${args.completed5m.time} was observed ${latencySeconds}s after completion. Fast-open moves may be stale before alert generation.`
      : `Completed 5M latency sentinel on time: latest completed 5M bar ${args.completed5m.time} was observed ${latencySeconds}s after completion.`,
    recoverySteps: status === 'late' ? recoverySteps : [],
    approvalBoundary: boundary,
  };
}

export interface ScannerMissedMoveReentryWatch {
  sourceOfTruth: 'scanner_missed_move_reentry_watch';
  status: 'not_applicable' | 'watch_retest_only';
  setupType: SetupType | null;
  direction: SetupCandidate['direction'];
  completed5mTime: string | null;
  currentPrice: number | null;
  originalEntry: number | null;
  originalStop: number | null;
  originalT1: number | null;
  originalT2: number | null;
  staleReason: string | null;
  freshEntryAvailable: false;
  tradeAlertEligible: false;
  requiredNextCondition: string | null;
  notes: string[];
  approvalBoundary: {
    watchApprovesTrade: false;
    watchChangesRules: false;
    watchCreatesEntry: false;
    watchCreatesStop: false;
    watchCreatesTargets: false;
    watchChangesCanExecute: false;
  };
}

export function buildScannerMissedMoveReentryWatch(args: {
  candidate: SetupCandidate | null;
  currentPrice: number | null;
  completed5m: NinjaBridgeBar | null;
  staleReason: string | null;
}): ScannerMissedMoveReentryWatch {
  const boundary = {
    watchApprovesTrade: false,
    watchChangesRules: false,
    watchCreatesEntry: false,
    watchCreatesStop: false,
    watchCreatesTargets: false,
    watchChangesCanExecute: false,
  } as const;
  const candidate = args.candidate;
  const reentryReason = 'Wait for a fresh completed 5M retest/rejection of the original entry/FVG zone, protected 5M structure stop, app T1/T2, target room, and normal scanner gates. No late market entry.';
  if (
    !candidate ||
    !args.staleReason ||
    candidate.direction === 'NO TRADE' ||
    !isFiniteTradePrice(candidate.entry) ||
    !isFiniteTradePrice(candidate.stop)
  ) {
    return {
      sourceOfTruth: 'scanner_missed_move_reentry_watch',
      status: 'not_applicable',
      setupType: candidate?.setupType || null,
      direction: candidate?.direction || 'NO TRADE',
      completed5mTime: args.completed5m?.time || null,
      currentPrice: args.currentPrice,
      originalEntry: isFiniteTradePrice(candidate?.entry) ? candidate.entry : null,
      originalStop: isFiniteTradePrice(candidate?.stop) ? candidate.stop : null,
      originalT1: isFiniteTradePrice(candidate?.target1) ? candidate.target1 : null,
      originalT2: isFiniteTradePrice(candidate?.target2) ? candidate.target2 : null,
      staleReason: args.staleReason,
      freshEntryAvailable: false,
      tradeAlertEligible: false,
      requiredNextCondition: null,
      notes: ['No missed-move re-entry watch was created because the selected candidate is not a stale complete directional plan.'],
      approvalBoundary: boundary,
    };
  }

  return {
    sourceOfTruth: 'scanner_missed_move_reentry_watch',
    status: 'watch_retest_only',
    setupType: candidate.setupType,
    direction: candidate.direction,
    completed5mTime: args.completed5m?.time || null,
    currentPrice: args.currentPrice,
    originalEntry: candidate.entry,
    originalStop: candidate.stop,
    originalT1: isFiniteTradePrice(candidate.target1) ? candidate.target1 : null,
    originalT2: isFiniteTradePrice(candidate.target2) ? candidate.target2 : null,
    staleReason: args.staleReason,
    freshEntryAvailable: false,
    tradeAlertEligible: false,
    requiredNextCondition: reentryReason,
    notes: [
      'Original move is missed/no-chase; this metadata does not post a trade plan.',
      'Use the original entry/FVG as a watch zone only. A new completed 5M proof cycle must rebuild the trade plan before visibility.',
    ],
    approvalBoundary: boundary,
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
          const upsertResult = await upsertMarketBars({
            bars: repairedBars,
            instrument: args.config.instrument,
            bridgeInstrument: args.config.bridgeInstrument,
            timeframe: '5m',
            config: marketConfig,
          });
          warnScannerMarketBarsUpsertSkippedOnce({ label: 'scanner-5m-assurance', timeframe: '5m', result: upsertResult });
          attempts.push(upsertResult.skipped ? `market_bars_upsert=skipped (${upsertResult.skipReason})` : 'market_bars_upsert=ok');
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

  const [snapshot, positions, fetchedLiveBars, liveBars1m] = await Promise.all([
    getNinjaBridgeSnapshot(config.bridgeInstrument, config.bridgeUrl).catch(() => null),
    getNinjaBridgePositions(config.account, config.bridgeUrl).catch(() => null),
    fetchLiveBars(config),
    fetchOneMinuteRefinementBars(config),
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
  const completed5mLatency = evaluateScannerCompletedFiveMinuteLatencySentinel({
    completed5m,
    now,
    timestampMode: config.barTimestampMode,
    timeZoneMode: config.barTimeZone,
    warningThresholdSeconds: scannerCompletedFiveMinuteLatencyWarningThresholdSeconds(config.pollSeconds),
  });
  if (completed5mRecovery.attempts.length) {
    console.log(`[scanner-data] Completed 5M self-healing attempts: ${completed5mRecovery.attempts.join(' | ')}`);
  }
  if (completed5mRecovery.selfHealed) {
    console.log(`[scanner-data] Completed 5M bar self-healed from cache/repair: ${completed5m?.time || 'N/A'}`);
  }
  if (completed5mLatency.status === 'late') {
    console.warn(`[scanner-data] ${completed5mLatency.message}`);
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
    warnings: completed5mLatency.status === 'late' ? [completed5mLatency.message] : [],
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

  if (shouldSendScannerEndOfDayMarketRecap({
    tradeDate,
    instrument: config.instrument,
    now,
    completed5m,
    barTimeZone: config.barTimeZone,
    sent: state.endOfDayMarketRecapSent,
  })) {
    const recapKey = scannerEndOfDayMarketRecapKey({ tradeDate, instrument: config.instrument });
    try {
      const recap = await buildScannerEndOfDayMarketRecapPayload({
        tradeDate,
        instrument: config.instrument,
        bars5m: liveBars['5m'] || [],
        completed5m,
        currentPrice,
        barTimeZone: config.barTimeZone,
      });
      validateDiscordPayload(recap.payload, []);
      const receipt = await postDiscord(recap.payload, config);
      if (receipt.deliveryStatus === 'sent') {
        const sentAt = new Date().toISOString();
        state.endOfDayMarketRecapSent[recapKey] = {
          ...recap.record,
          sentAt,
        };
        await writeScannerDiscordReceiptAuditLog({
          kind: 'end_of_day_market_recap',
          key: recapKey,
          planVersionId: `${tradeDate}-${config.instrument}-END-OF-DAY-RECAP`,
          tradeDate,
          instrument: config.instrument,
          session: 'lunch',
          receipt,
          postedAt: sentAt,
          cleanupRecordKey: null,
          ragReceiptAttached: false,
        });
        console.log(`[scanner] Sent End-of-Day Market Recap: ${recapKey}`);
      } else {
        console.log(`[scanner] End-of-Day Market Recap skipped (${receipt.webhookSource || 'unknown'}): ${recapKey}`);
      }
    } catch (error) {
      console.warn(`[scanner] End-of-Day Market Recap delivery failed safely; scanner will continue normal processing: ${sanitizedError(error)}`);
    }
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
  let tradePlanningDataQualityBlocker: string | null = null;
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
      if (!gateResult.report.completedFiveMinuteReady) {
        return;
      }
      tradePlanningDataQualityBlocker = `${gateSummary} ${gateResult.report.sourceSummary}`;
      console.warn('[scanner-data] Continuing with review-map evaluation only. Execution alerts remain blocked until the readiness gate is fully ready.');
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
  const analysis = await analysisFromBars({ config, session, tradeDate, bars, bars1m: liveBars1m, htfBars5m, asOf: macroAsOf });
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
    recentCompletedBars: bars['5m'],
    guards: scannerGuards,
  });
  let initialCandidate = initialSelection.candidate;
  const targetCascade = buildTargetCascade({
    candidate: initialCandidate,
    objectives: analysis.structuredChartContext?.targetObjectives,
    recentBars: bars['5m'],
    lookbackCandles: scannerGuards.targetAlreadySweptLookbackCandles,
  });
  const selection = selectScannerPlan({
    normalized,
    currentPrice,
    latestCompletedBar: completed5m,
    recentCompletedBars: bars['5m'],
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
  const missedMoveReentryWatch = buildScannerMissedMoveReentryWatch({
    candidate,
    currentPrice,
    completed5m,
    staleReason: stale.reason,
  });
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
  const previousDelivery = state.alertDeliveries[alertKey];
  const priorActiveDelivery = latestSentScannerTradeAlertDelivery({
    deliveries: state.alertDeliveries,
    tradeDate,
    instrument: config.instrument,
    session,
    excludeAlertKey: alertKey,
  });
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
  if (tradePlanningDataQualityBlocker) {
    alertDecision = {
      shouldSend: false,
      reason: 'Primary trade-card suppressed because the readiness gate is data-limited; review-map Discord output may post tactical levels only.',
    };
  }
  const durableLedgerConfig = loadScannerActiveCampaignLedgerConfig();
  let activeCampaignClaim: ScannerActiveCampaignClaimResult = {
    source: 'none',
    claimed: true,
    shouldSuppress: false,
    campaignId: null,
    reason: null,
    durableAvailable: Boolean(durableLedgerConfig),
  };
  if (alertDecision.shouldSend && scannerActiveCampaignKeyForTradeDate(candidate, tradeDate, session)) {
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
        campaignId: scannerActiveCampaignKeyForTradeDate(candidate, tradeDate, session),
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
    canExecute: Boolean(normalized.canExecute) && !tradePlanningDataQualityBlocker,
    staleReason: stale.reason,
  });
  let candidateLifecycleTrace = buildCandidateLifecycleTrace({
    candidates: normalized.setupCandidates || [],
    selectedCandidate: candidate,
    state: stateForAlert,
    window,
    alertDecision,
    canExecute: Boolean(normalized.canExecute) && !tradePlanningDataQualityBlocker,
    staleReason: stale.reason,
  });
  let deskState = buildDeskState({
    state: stateForAlert,
    candidate,
    visibilityMetadata,
    candidateLifecycleTrace,
    targetCascade,
    htfLiquidityDrawState: analysis.structuredChartContext?.htfLiquidityDrawState || null,
    chartContext: analysis.structuredChartContext || null,
    asOfCompleted5mTime: completed5m.time,
    currentPrice,
    canExecute: Boolean(normalized.canExecute) && !tradePlanningDataQualityBlocker,
  });
  if (tradePlanningDataQualityBlocker) {
    deskState = {
      ...deskState,
      htfContextStatus: 'insufficient',
      dataQualityStatus: 'data_limited',
      canExecute: false,
      suppressionReason: tradePlanningDataQualityBlocker,
      notes: [
        ...deskState.notes,
        'Pre-Market Data Readiness + Backfill Gate is data-limited. Primary trade alerts are blocked; Desk Play may show review-only tactical levels when app-owned levels exist.',
      ],
    };
  }
  const deskStateGatedAlertDecision = evaluateScannerPrimaryAlertPublishingGate({
    alertDecision,
    deskState,
    candidate,
    normalizedCanExecute: Boolean(normalized.canExecute) && !tradePlanningDataQualityBlocker,
    state: stateForAlert,
    currentPrice,
    staleReason: stale.reason,
    scannerReviewStatus: selection.reviewStatus,
    priorActiveDelivery,
    completed5m,
    confidence,
  });
  if (deskStateGatedAlertDecision.shouldSend !== alertDecision.shouldSend || deskStateGatedAlertDecision.reason !== alertDecision.reason) {
    alertDecision = deskStateGatedAlertDecision;
    visibilityMetadata = classifyScannerVisibility({
      state: stateForAlert,
      candidate,
      window,
      alertDecision,
      canExecute: Boolean(normalized.canExecute) && !tradePlanningDataQualityBlocker,
      staleReason: stale.reason,
    });
    candidateLifecycleTrace = buildCandidateLifecycleTrace({
      candidates: normalized.setupCandidates || [],
      selectedCandidate: candidate,
      state: stateForAlert,
      window,
      alertDecision,
      canExecute: Boolean(normalized.canExecute) && !tradePlanningDataQualityBlocker,
      staleReason: stale.reason,
    });
    deskState = buildDeskState({
      state: stateForAlert,
      candidate,
      visibilityMetadata,
      candidateLifecycleTrace,
      targetCascade,
      htfLiquidityDrawState: analysis.structuredChartContext?.htfLiquidityDrawState || null,
      chartContext: analysis.structuredChartContext || null,
      asOfCompleted5mTime: completed5m.time,
      currentPrice,
      canExecute: Boolean(normalized.canExecute) && !tradePlanningDataQualityBlocker,
    });
    if (tradePlanningDataQualityBlocker) {
      deskState = {
        ...deskState,
        htfContextStatus: 'insufficient',
        dataQualityStatus: 'data_limited',
        canExecute: false,
        suppressionReason: tradePlanningDataQualityBlocker,
        notes: [
          ...deskState.notes,
          'Pre-Market Data Readiness + Backfill Gate is data-limited. Primary trade alerts are blocked; Desk Play may show review-only tactical levels when app-owned levels exist.',
        ],
      };
    }
  }
  const duplicateGuardedAlertDecision = applyScannerHardDuplicateAlertSuppression({
    alertDecision,
    alertKey,
    existing,
    previousDelivery,
    planVersionId,
  });
  const cadenceGuardedAlertDecision = applyScannerNearDuplicateTradeAlertCadenceSuppression({
    alertDecision: duplicateGuardedAlertDecision,
    alertKey,
    candidate,
    state: stateForAlert,
    priorActiveDelivery,
    planVersionId,
  });
  const finalGuardedAlertDecision = applyScannerCompletedFiveMinuteZoneFailureSuppression({
    alertDecision: cadenceGuardedAlertDecision,
    deskState,
    candidate,
    completed5m,
  });
  if (finalGuardedAlertDecision.shouldSend !== alertDecision.shouldSend || finalGuardedAlertDecision.reason !== alertDecision.reason) {
    alertDecision = finalGuardedAlertDecision;
    visibilityMetadata = classifyScannerVisibility({
      state: stateForAlert,
      candidate,
      window,
      alertDecision,
      canExecute: Boolean(normalized.canExecute) && !tradePlanningDataQualityBlocker,
      staleReason: stale.reason,
    });
    candidateLifecycleTrace = buildCandidateLifecycleTrace({
      candidates: normalized.setupCandidates || [],
      selectedCandidate: candidate,
      state: stateForAlert,
      window,
      alertDecision,
      canExecute: Boolean(normalized.canExecute) && !tradePlanningDataQualityBlocker,
      staleReason: stale.reason,
    });
    deskState = buildDeskState({
      state: stateForAlert,
      candidate,
      visibilityMetadata,
      candidateLifecycleTrace,
      targetCascade,
      htfLiquidityDrawState: analysis.structuredChartContext?.htfLiquidityDrawState || null,
      chartContext: analysis.structuredChartContext || null,
      asOfCompleted5mTime: completed5m.time,
      currentPrice,
      canExecute: Boolean(normalized.canExecute) && !tradePlanningDataQualityBlocker,
    });
    if (tradePlanningDataQualityBlocker) {
      deskState = {
        ...deskState,
        htfContextStatus: 'insufficient',
        dataQualityStatus: 'data_limited',
        canExecute: false,
        suppressionReason: tradePlanningDataQualityBlocker,
        notes: [
          ...deskState.notes,
          'Pre-Market Data Readiness + Backfill Gate is data-limited. Primary trade alerts are blocked; Desk Play may show review-only tactical levels when app-owned levels exist.',
        ],
      };
    }
  }
  const operatorNormalizedAlertDecision = withNormalizedScannerOperatorDeliveryReason(alertDecision);
  if (operatorNormalizedAlertDecision.reason !== alertDecision.reason) {
    alertDecision = operatorNormalizedAlertDecision;
  }
  const deskPublishDecision = buildDeskPublishDecision({
    deskState,
    currentPrice,
    completed5mTime: completed5m.time,
  });
  const scannerDeskOutput = buildScannerDeskOutputContract({
    session,
    tradeDate,
    instrument: config.instrument,
    state: stateForAlert,
    candidate,
    alertDecision,
    publishDecision: deskPublishDecision,
    campaignId: activeCampaignClaim.campaignId,
  });
  if (!alertDecision.shouldSend && activeCampaignClaim.claimed && activeCampaignClaim.campaignId) {
    const suppressedReason = alertDecision.reason || 'Scanner alert suppressed after durable ActiveCampaign claim.';
    state.alertDeliveries[alertKey] = {
      ...createPendingScannerAlertDeliveryRecord({
        alertKey,
        planVersionId,
        instrument: config.instrument,
        tradeDate,
        session,
        state: stateForAlert,
        confidence: confidence.score,
        candidate,
        webhookSource: null,
        auditLogPath: null,
        stale: stale.stale,
      }),
      deliveryStatus: 'skipped',
      error: suppressedReason,
      retryEligible: false,
    };
    await releaseDurableActiveCampaignScannerAlertClaim({
      config: activeCampaignClaim.source === 'supabase' ? durableLedgerConfig : null,
      campaignId: activeCampaignClaim.campaignId,
      deliveryStatus: 'skipped',
      reason: `Final scanner publishing gate suppressed alert after durable claim: ${suppressedReason}`,
    }).catch((ledgerError) => {
      console.warn(`[scanner-delivery] ActiveCampaign durable suppression release failed safely: ${sanitizedError(ledgerError)}`);
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
    publishDecision: deskPublishDecision,
    scannerDeskOutput,
    completed5mLatency,
    missedMoveReentryWatch,
    planVersionId,
    dryRun: config.dryRun,
    historyCoverage,
  });
  const unifiedDeskOutputSurface = await readUnifiedDeskOutputProductionScannerSurface();
  if (unifiedDeskOutputSurface) {
    const readbackPath = await writeUnifiedDeskOutputProductionScannerReadback({
      tradeDate,
      instrument: config.instrument,
      session,
      completed5mTime: completed5m.time,
      surface: unifiedDeskOutputSurface,
    });
    console.log(`${unifiedDeskOutputProductionScannerSummaryLine(unifiedDeskOutputSurface)} readback=${readbackPath}`);
  }
  const fiveModelSurface = await readFiveModelProductionScannerSurface();
  if (fiveModelSurface) {
    const readbackPath = await writeFiveModelProductionScannerReadback({
      tradeDate,
      instrument: config.instrument,
      session,
      completed5mTime: completed5m.time,
      surface: fiveModelSurface,
    });
    console.log(`${fiveModelProductionScannerSummaryLine(fiveModelSurface)} readback=${readbackPath}`);
  }

  console.log(scannerCycleSummaryLine({
    session,
    completed5m,
    currentPrice,
    candidate,
    deskState,
    scannerDeskOutput,
    stateForAlert,
    confidence,
    sameCompletedCandle,
    alertDecision,
    decisionTapePath,
  }));
  state.lastCompleted5mBySession[sessionKey] = completed5m.time;
  const liveDiscordSendBoundary = (auditPath: string | null, postKind: ScannerDiscordCleanupKind = 'trade_alert'): LiveDiscordEligibilityReport => buildScannerLiveDiscordSendBoundaryReport({
    postKind,
    config,
    healthReport,
    bridgeConnected: healthOk,
    bridgeInstrumentResolved: Boolean(config.bridgeInstrument),
    completedFiveMinuteFresh: completed5mAssurance.status === 'ready' && !bridgeFreshness.stale,
    htfContextPresent: deskState.htfContextStatus !== 'insufficient' && deskState.dataQualityStatus !== 'data_limited',
    deskState,
    decisionTapePath,
    auditPath,
    discordPayloadValidated: true,
    webhookConfigured: Boolean(resolveScannerDiscordWebhookUrl().url),
    unifiedDeskOutputProductionSurfaceActive: Boolean(unifiedDeskOutputSurface),
  });

  const htfDeskMapDeferReason = scannerHtfDeskMapDeferReasonForCanonicalPlan(deskPublishDecision);
  if (htfDeskMapDeferReason) {
    console.log(`[scanner] ${window.label} HTF Desk Map deferred: ${compactScannerLogText(htfDeskMapDeferReason, 180)}`);
  }
  if (!htfDeskMapDeferReason && window.allowsDiscordAlert && shouldSendScannerMorningHtfDeskMap({
    tradeDate,
    instrument: config.instrument,
    session,
    completed5m,
    barTimeZone: config.barTimeZone,
    sent: state.morningHtfDeskMapSent,
  })) {
    const morningMapKey = scannerMorningHtfDeskMapKey({ tradeDate, instrument: config.instrument, session });
    try {
      const htfMapArtifacts = await prepareScannerMorningHtfDeskMapArtifacts({
        tradeDate,
        instrument: config.instrument,
        session,
        deskState,
        normalized,
        chartContext: analysis.structuredChartContext || null,
        completed5m,
        currentPrice,
      });
      const htfMapLiveBoundary = liveDiscordSendBoundary(decisionTapePath, 'session_htf_desk_map');
      const receipt = await postScannerDiscordManaged({
        kind: 'session_htf_desk_map',
        key: morningMapKey,
        payload: htfMapArtifacts.payload,
        files: htfMapArtifacts.files,
        config,
        liveSendBoundary: htfMapLiveBoundary,
      });
      if (receipt.deliveryStatus === 'sent') {
        const sentAt = new Date().toISOString();
        state.morningHtfDeskMapSent[morningMapKey] = scannerMorningHtfDeskMapRecord({
          tradeDate,
          instrument: config.instrument,
          session,
          deskState,
          latestCompleted5m: completed5m.time,
          sentAt,
        });
        await writeScannerDiscordReceiptAuditLog({
          kind: 'session_htf_desk_map',
          key: morningMapKey,
          planVersionId: `${planVersionId}-SESSION-HTF-DESK-MAP`,
          tradeDate,
          instrument: config.instrument,
          session,
          receipt,
          postedAt: sentAt,
          cleanupRecordKey: null,
          ragReceiptAttached: false,
        });
        console.log(`[scanner] Sent ${window.label} HTF Desk Map: ${morningMapKey}`);
      } else {
        console.log(`[scanner] ${window.label} HTF Desk Map skipped (${receipt.webhookSource || 'unknown'}): ${morningMapKey}`);
      }
    } catch (error) {
      console.warn(`[scanner] ${window.label} HTF Desk Map delivery failed safely; scanner will continue evaluating watch and trade alerts: ${sanitizedError(error)}`);
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
      console.log(scannerSuppressionSummaryLine({
        label: 'Reversal Watch',
        category: reversalWatchSuppression.category,
        reason: reversalWatchSuppression.reason,
        previousFingerprint: reversalWatchSuppression.previousFingerprint,
      }));
    } else if (!state.reversalWatchSent[reversalWatchKey]) {
      try {
        const reversalWatchPlanVersionId = `${planVersionId}-REVERSAL-WATCH`;
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
          planVersionId: reversalWatchPlanVersionId,
        });
        // Phase 11B guard phrase retained: liveDiscordSendBoundary(decisionTapePath)
        const reversalLiveBoundary = liveDiscordSendBoundary(decisionTapePath, 'reversal_watch');
        const receipt = await postScannerDiscordManaged({
          kind: 'reversal_watch',
          key: reversalWatchKey,
          payload: reversalArtifacts.payload,
          config,
          files: reversalArtifacts.files,
          liveSendBoundary: reversalLiveBoundary,
          holdNotice: {
            state,
            tradeDate,
            session,
            windowLabel: window.label,
            currentPrice,
            completed5m,
            deskState,
          },
        });
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
          let ragReceiptAttached = false;
          try {
            await upsertScannerReversalWatchRagRecord({
              planVersionId: reversalWatchPlanVersionId,
              session,
              tradeDate,
              instrument: config.instrument,
              lines: reversalWatchLines,
              state: reversalWatchState,
              currentPrice,
              chartMarkup: reversalArtifacts.chartMarkup,
              decisionTapePath,
              latestCompleted5m: completed5m.time,
            });
            ragReceiptAttached = await attachDiscordMessageReceiptToRagRecord({
              planVersionId: reversalWatchPlanVersionId,
              discordMessageId: receipt.discordMessageId,
              webhookSource: receipt.webhookSource,
            });
          } catch (error) {
            console.warn(`[scanner] Reversal Watch RAG/research seed skipped safely: ${sanitizedError(error)}`);
          }
          await writeScannerDiscordReceiptAuditLog({
            kind: 'reversal_watch',
            key: reversalWatchKey,
            planVersionId: reversalWatchPlanVersionId,
            tradeDate,
            instrument: config.instrument,
            session,
            receipt,
            postedAt: sentAt,
            cleanupRecordKey: null,
            ragReceiptAttached,
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

  const canonicalDeskPublishEligible = deskPublishDecision.shouldPost && !alertDecision.shouldSend;
  if (!reversalWatchPosted && !alertDecision.shouldSend && window.allowsDiscordAlert && (deskState.primaryDeskPlay.discordEligible || canonicalDeskPublishEligible)) {
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
      publishDecision: deskPublishDecision,
      deskPlanRefreshSent: state.deskPlanRefreshSent,
      normalized,
      currentPrice,
      latestCompleted5m: completed5m.time,
      completed5m,
      staleReason: stale.reason,
    });
    if (!deskPlaySuppression.shouldPost) {
      console.log(scannerSuppressionSummaryLine({
        label: 'Desk Play refresh',
        category: deskPlaySuppression.category,
        reason: deskPlaySuppression.reason,
        previousFingerprint: deskPlaySuppression.previousFingerprint,
      }));
    } else if (!state.deskPlanRefreshSent[deskPlayKey]) {
      const canonicalPreDeliveryHold = scannerDeskPlayCanonicalPreDeliveryHold(deskPublishDecision, alertDecision);
      if (canonicalPreDeliveryHold) {
        console.log(scannerSuppressionSummaryLine({
          label: 'Desk Play refresh',
          category: canonicalPreDeliveryHold.category,
          reason: canonicalPreDeliveryHold.reason,
          previousFingerprint: canonicalPreDeliveryHold.previousFingerprint,
        }));
      } else {
        const deskPlayPlanVersionId = `${planVersionId}-DESK-PLAY`;
        try {
          const deskPlayArtifacts = await prepareLiveScannerDeskPlayAlertArtifacts({
            session,
            tradeDate,
            config,
            state: stateForAlert,
            confidence,
            normalized,
            candidate,
            chartContext: analysis.structuredChartContext || null,
            currentPrice,
            windowLabel: window.label,
            planVersionId: deskPlayPlanVersionId,
            deskState,
            publishDecision: deskPublishDecision,
            decisionTapePath,
          });
        // Phase 11B guard phrase retained: liveDiscordSendBoundary(decisionTapePath)
        const deskPlayLiveBoundary = liveDiscordSendBoundary(decisionTapePath, 'desk_play');
        if (shouldPersistScannerAlertToRag(deskState) && (config.dryRun || !config.discordEnabled || deskPlayLiveBoundary.eligible)) {
          try {
            await upsertScannerDiscordAlertRagRecord({
              planVersionId: deskPlayPlanVersionId,
              session,
              tradeDate,
              instrument: config.instrument,
              analysis,
              normalized,
              candidate: candidateForDeskPlayContextChart(deskState, normalized, currentPrice, candidate) || candidate,
              visibilityMetadata,
              candidateLifecycleTrace,
              deskState,
              confidence: confidence.score,
            });
          } catch (error) {
            console.warn(`Scanner Desk Play RAG pending save failed safely: ${sanitizedError(error)}`);
          }
        }
        const receipt = await postScannerDiscordManaged({
          kind: 'desk_play',
          key: deskPlayKey,
          payload: deskPlayArtifacts.payload,
          config,
          files: deskPlayArtifacts.files,
          liveSendBoundary: deskPlayLiveBoundary,
          holdNotice: {
            state,
            tradeDate,
            session,
            windowLabel: window.label,
            currentPrice,
            completed5m,
            deskState,
          },
        });
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
      }
    } else {
      console.log(`[scanner] Desk Plan refresh already sent for ${deskPlayKey}.`);
    }
  }

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

  const scannerOwnedDeskPlayGuardedAlertDecision = applyScannerTradeAlertSuppressionAfterDeskPlay({
    alertDecision,
    scannerDeskOutput,
    deskPlanRefreshSent: state.deskPlanRefreshSent,
    tradeDate,
    instrument: config.instrument,
    session: window.session,
    planVersionId,
  });
  if (scannerOwnedDeskPlayGuardedAlertDecision.shouldSend !== alertDecision.shouldSend || scannerOwnedDeskPlayGuardedAlertDecision.reason !== alertDecision.reason) {
    alertDecision = scannerOwnedDeskPlayGuardedAlertDecision;
    console.log(scannerSuppressionSummaryLine({
      label: 'Legacy trade alert',
      category: 'duplicate_refresh',
      reason: alertDecision.reason,
    }));
  }
  const scannerOwnedSurfaceGuardedAlertDecision = applyScannerTradeAlertSuppressionForScannerOwnedSurface({
    alertDecision,
    scannerDeskOutput,
    scannerOwnedSurfaceActive: Boolean(fiveModelSurface || unifiedDeskOutputSurface),
    tradeDate,
    instrument: config.instrument,
    session: window.session,
    planVersionId,
  });
  if (scannerOwnedSurfaceGuardedAlertDecision.shouldSend !== alertDecision.shouldSend || scannerOwnedSurfaceGuardedAlertDecision.reason !== alertDecision.reason) {
    alertDecision = scannerOwnedSurfaceGuardedAlertDecision;
    console.log(scannerSuppressionSummaryLine({
      label: 'Legacy trade alert',
      category: 'duplicate_refresh',
      reason: alertDecision.reason,
    }));
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
    // Phase 11B guard phrase retained: liveDiscordSendBoundary(alertArtifacts.auditLogPath)
    const alertLiveBoundary = liveDiscordSendBoundary(alertArtifacts.auditLogPath, 'trade_alert');
    if (shouldPersistScannerAlertToRag(deskState) && (config.dryRun || !config.discordEnabled || alertLiveBoundary.eligible)) {
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
      const receipt = await postScannerDiscordManaged({
        kind: 'trade_alert',
        key: alertKey,
        payload: alertArtifacts.payload,
        config,
        files: alertArtifacts.files,
        liveSendBoundary: alertLiveBoundary,
        holdNotice: {
          state,
          tradeDate,
          session,
          windowLabel: window.label,
          currentPrice,
          completed5m,
          deskState,
        },
      });
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
          session,
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
        await writeScannerDiscordFinalDeliveryOutcomeAuditLog({
          auditLogPath: alertArtifacts.auditLogPath,
          outcome: {
            status: 'sent',
            reason: 'Discord trade/review artifact delivered.',
            discordMessageId: receipt.discordMessageId,
            httpStatus: receipt.httpStatus,
            webhookSource: receipt.webhookSource,
          },
        });
        state.alertDeliveries[alertKey] = markScannerAlertDeliverySent(pendingDelivery, {
          sentAt,
          httpStatus: receipt.httpStatus,
          webhookSource: receipt.webhookSource,
          discordMessageId: receipt.discordMessageId,
        });
      } else {
        await writeScannerDiscordFinalDeliveryOutcomeAuditLog({
          auditLogPath: alertArtifacts.auditLogPath,
          outcome: {
            status: 'hard_suppressed',
            reason: `Discord delivery skipped: ${receipt.webhookSource || 'unknown'}.`,
            discordMessageId: receipt.discordMessageId,
            httpStatus: receipt.httpStatus,
            webhookSource: receipt.webhookSource,
          },
        });
        state.alertDeliveries[alertKey] = markScannerAlertDeliverySkipped(pendingDelivery, {
          reason: `Discord delivery skipped: ${receipt.webhookSource || 'unknown'}.`,
          webhookSource: receipt.webhookSource === 'discord_disabled'
            ? 'discord_disabled'
            : receipt.webhookSource === 'phase11_boundary'
              ? 'phase11_boundary'
              : 'dry_run',
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
      await writeScannerDiscordFinalDeliveryOutcomeAuditLog({
        auditLogPath: alertArtifacts.auditLogPath,
        outcome: {
          status: 'delivery_failed',
          reason: sanitizedError(error),
          httpStatus,
          webhookSource,
        },
      });
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
  const recoveredPendingOutcomes = await recoverStalePendingScannerFinalDeliveryOutcomes({ tradeDate, instrument: config.instrument });
  if (recoveredPendingOutcomes.recovered > 0 || recoveredPendingOutcomes.failed > 0) {
    console.warn(
      `[scanner-delivery] Recovered stale pending Discord final outcomes: checked=${recoveredPendingOutcomes.checked} recovered=${recoveredPendingOutcomes.recovered} failed=${recoveredPendingOutcomes.failed}`
    );
  }
  await warnOnMissedExecutableScannerDeliveries({ state, tradeDate, instrument: config.instrument });
}

async function main() {
  if (hasArg('help')) {
    printHelp();
    return;
  }
  const startupMaintenance = readQuantDeskMaintenanceStatus();
  if (startupMaintenance.active) {
    console.log(`[scanner] maintenance lock active; scanner exiting before Discord or trade-plan delivery. ${startupMaintenance.reason}`);
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
      const maintenance = readQuantDeskMaintenanceStatus();
      if (maintenance.active) {
        console.log(`[scanner] maintenance lock active; scanner stopping before Discord or trade-plan delivery. ${maintenance.reason}`);
        return;
      }
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
