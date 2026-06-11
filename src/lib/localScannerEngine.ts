import { TRADE_RULES } from '../config/tradeRules';
import { SETUP_REGISTRY, type SetupRegistryEntry, type SetupRole, type SetupSession } from '../config/setupRegistry';
import { ExecutionStatus, NoTradeReason, SetupCandidate, SetupType, TargetObjective, TradeDecisionStatus } from '../types';
import type { NinjaBridgeBar } from './ninjaTraderBridge';

export type ScannerState =
  | 'NoData'
  | 'MarketMapping'
  | 'MapReady'
  | 'Watching'
  | 'TriggerPending'
  | 'Conditional'
  | 'Executable'
  | 'Approved'
  | 'Blocked'
  | 'Missed'
  | 'NoTrade';

export type ScannerWindowQuality = 'observe_only' | 'approved' | 'strict' | 'disabled' | 'outside';
export type ScannerSession = 'premarket' | 'morning' | 'lunch' | 'afternoon' | 'outside';
export type BridgeTimestampMode = 'open' | 'close';
export type BridgeTimeZoneMode = 'eastern' | 'central' | 'pacific' | 'local';

export interface ScannerWindowState {
  session: ScannerSession;
  label: string;
  quality: ScannerWindowQuality;
  enabled: boolean;
  allowsTradePlan: boolean;
  allowsDiscordAlert: boolean;
  nextWindowLabel: string | null;
}

export const MARKET_MAPPING_LABEL = 'Market Mapping Mode';

export const MARKET_MAPPING_COVERAGE = [
  'ETH high/low',
  'Asian high/low',
  'London high/low',
  'NY premarket high/low',
  'prior day/week/month levels',
  '15M / 60M / 240M liquidity',
  'target cascade',
] as const;

export interface ScannerThresholds {
  conditional: number;
  executable: number;
  educationalBlocked: number;
}

export interface ScannerRiskGuards {
  maxChaseDistancePoints: number;
  maxChaseDistanceR: number;
  staleSetupMaxCandles: number;
  targetAlreadySweptLookbackCandles: number;
  allowRetestOnlyEntries: boolean;
}

export interface ScannerConfidenceBreakdown {
  score: number;
  qualifiedReasons: string[];
  missingReasons: string[];
  recommendation?: string;
  scorecard?: Array<{
    label: string;
    score: number;
    max: number;
    status: 'strong' | 'partial' | 'weak' | 'blocked';
    note: string;
  }>;
  hardBlocker?: string | null;
}

export interface StaleChaseResult {
  state: ScannerState;
  stale: boolean;
  reason: string | null;
}

export interface BridgeBarStalenessResult {
  stale: boolean;
  latestTime: string | null;
  ageMinutes: number | null;
  maxAllowedMinutes: number;
  reason: string | null;
}

export interface TargetCascadeResult {
  activeTarget: TargetObjective | null;
  activeTimeframe: string | null;
  sweptTargets: TargetObjective[];
  promotedTarget: TargetObjective | null;
  path: string[];
  targetRoomPoor: boolean;
  reason: string;
}

export interface ScannerAlertDecision {
  shouldSend: boolean;
  reason: string;
}

export type ScannerVisibilityMode =
  | 'POST_PLAN'
  | 'POST_WATCH'
  | 'POST_CONDITIONAL'
  | 'POST_REVIEW'
  | 'HOLD_WITH_REASON'
  | 'NO_TRADE_WITH_REASON'
  | 'DATA_QUALITY_BLOCKER';

export type ScannerDiscordAction =
  | 'post_plan'
  | 'post_watch'
  | 'post_conditional'
  | 'post_review'
  | 'hold'
  | 'no_trade';

export interface ScannerAuthorityMetadata {
  registeredModel: boolean;
  activeModel: boolean;
  watchEligible: boolean;
  planEligible: boolean;
  discordEligible: boolean;
  executionEligible: boolean;
  humanReviewOnly: boolean;
  canExecute: boolean;
}

export interface ScannerVisibilityMetadata {
  visibilityMode: ScannerVisibilityMode;
  discordAction: ScannerDiscordAction;
  suppressionReason: string | null;
  nextTrigger: string | null;
  dataQualityBlocker: string | null;
  holdWithReason: string | null;
  noTradeWithReason: string | null;
  hasMeaningfulStructuredEvidence: boolean;
  sourceOfTruth: 'scanner_desk_state_visibility_metadata';
  authority: ScannerAuthorityMetadata;
  notes: string[];
}

export interface TradeDecisionMapAuditEntry {
  setupType: SetupType;
  modelName: string;
  role: SetupRole;
  parentModelFamily: string | null;
  sessionWindows: SetupSession[];
  requiredEvidence: string[];
  rankWeight: number;
  watchEligible: boolean;
  planEligible: boolean;
  discordEligible: boolean;
  executionEligible: boolean;
  humanReviewOnly: boolean;
  canExecuteRelationship: string;
  knownSuppressionPaths: string[];
}

export interface TradeDecisionMapAudit {
  sourceOfTruth: 'setup_registry_trade_decision_map_audit';
  generatedFrom: 'SETUP_REGISTRY';
  tradingLogicChanged: false;
  entries: TradeDecisionMapAuditEntry[];
  notes: string[];
}

export interface ScannerCandidateLifecycleTraceItem {
  candidateKey: string;
  setupType: SetupType;
  scenarioLabel: string | null;
  direction: SetupCandidate['direction'];
  detectedStatus: SetupCandidate['detectedStatus'];
  executionStatus: SetupCandidate['executionStatus'];
  candidateState: SetupCandidate['candidateState'] | null;
  rankScore: number | null;
  priority: number;
  decisionQualityScore: number | null;
  modelConfidenceScore: number | null;
  visibilityMode: ScannerVisibilityMode;
  blockReason: string | null;
  missingEvidence: string[];
  missingLevels: string[];
  nextTrigger: string | null;
  hasFullPlanLevels: boolean;
  selected: boolean;
  filteredOutReason: string | null;
}

export interface ScannerCandidateLifecycleTrace {
  sourceOfTruth: 'scanner_candidate_lifecycle_trace';
  candidateCount: number;
  createdCandidates: ScannerCandidateLifecycleTraceItem[];
  highestRankedCandidate: ScannerCandidateLifecycleTraceItem | null;
  bestLongPlan: ScannerCandidateLifecycleTraceItem | null;
  bestShortPlan: ScannerCandidateLifecycleTraceItem | null;
  selectedCandidateKey: string | null;
  selectedCandidate: ScannerCandidateLifecycleTraceItem | null;
  filteredOutCandidates: ScannerCandidateLifecycleTraceItem[];
  discordDecision: ScannerAlertDecision;
  missingProofSummary: string[];
  nextTrigger: string | null;
  notes: string[];
}

export type DeskStateMarketMode =
  | 'market_mapping'
  | 'watching'
  | 'conditional'
  | 'human_review_ready'
  | 'no_trade';

export type DeskStateHtfContextStatus = 'sufficient' | 'partial' | 'insufficient' | 'not_applicable';
export type DeskStateDataQualityStatus = 'ok' | 'partial' | 'data_limited';

export interface DeskState {
  sourceOfTruth: 'scanner_desk_state';
  marketMode: DeskStateMarketMode;
  activeCampaign: SetupCandidate['activeCampaign'] | null;
  bestLongPlan: ScannerCandidateLifecycleTraceItem | null;
  bestShortPlan: ScannerCandidateLifecycleTraceItem | null;
  selectedCandidate: ScannerCandidateLifecycleTraceItem | null;
  lineInSand: number | null;
  nextTrigger: string | null;
  invalidation: string | null;
  visibilityMode: ScannerVisibilityMode;
  discordAction: ScannerDiscordAction;
  suppressionReason: string | null;
  htfContextStatus: DeskStateHtfContextStatus;
  dataQualityStatus: DeskStateDataQualityStatus;
  canExecute: boolean;
  visibilityMetadata: ScannerVisibilityMetadata;
  candidateLifecycleTrace: ScannerCandidateLifecycleTrace;
  notes: string[];
}

export { selectScannerPlan } from '../agents/scannerPlanSelectionAgent';
export type { ScannerPlanSelection } from '../agents/scannerPlanSelectionAgent';

const DEFAULT_THRESHOLDS: ScannerThresholds = TRADE_RULES.discordAlertThresholds;

export type ScannerAlertQualityTier =
  | 'high_quality'
  | 'qualified_strong_conditional'
  | 'watchlist_conditional'
  | 'do_not_publish';

export interface ScannerAlertQuality {
  tier: ScannerAlertQualityTier;
  label: string;
  minScore: number;
  publishTradePlan: boolean;
}

export function scannerAlertQualityFromScore(score: number): ScannerAlertQuality {
  if (score >= 89) {
    return {
      tier: 'high_quality',
      label: 'High-Quality Trade Plan',
      minScore: 89,
      publishTradePlan: true,
    };
  }
  if (score >= 80) {
    return {
      tier: 'qualified_strong_conditional',
      label: 'Qualified / Strong Conditional Plan',
      minScore: 80,
      publishTradePlan: true,
    };
  }
  if (score >= 65) {
    return {
      tier: 'watchlist_conditional',
      label: 'Watchlist / Conditional Plan',
      minScore: 65,
      publishTradePlan: true,
    };
  }
  return {
    tier: 'do_not_publish',
    label: 'Do Not Publish Trade Plan',
    minScore: 0,
    publishTradePlan: false,
  };
}

export const DEFAULT_SCANNER_RISK_GUARDS: ScannerRiskGuards = {
  maxChaseDistancePoints: 3,
  maxChaseDistanceR: 0.5,
  staleSetupMaxCandles: 3,
  targetAlreadySweptLookbackCandles: 8,
  allowRetestOnlyEntries: true,
};

function etParts(date: Date) {
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
    hour: Number(value('hour')),
    minute: Number(value('minute')),
  };
}

function minutesFromClock(clock: string): number {
  const [hour, minute] = clock.split(':').map(Number);
  return hour * 60 + minute;
}

export function toEtMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  let hour = Number(parts.find(p => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find(p => p.type === 'minute')?.value ?? '0');

  // Defensive guard: some environments can format midnight as 24:00.
  if (hour === 24) hour = 0;

  return hour * 60 + minute;
}

function etClockMinutes(date: Date): number {
  return toEtMinutes(date);
}

function isBetween(value: number, start: string, end: string): boolean {
  return value >= minutesFromClock(start) && value < minutesFromClock(end);
}

export function getScannerTradeDate(date = new Date()): string {
  const parts = etParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function resolveScannerWindow(date = new Date(), afternoonEnabled = false): ScannerWindowState {
  const minutes = etClockMinutes(date);
  const windows = TRADE_RULES.executionWindows;

  if (isBetween(minutes, windows.openingObservation.startET, windows.openingObservation.endET)) {
    return {
      session: 'premarket',
      label: windows.openingObservation.label,
      quality: 'observe_only',
      enabled: windows.openingObservation.enabled,
      allowsTradePlan: false,
      allowsDiscordAlert: false,
      nextWindowLabel: windows.morningExecution.label,
    };
  }

  if (isBetween(minutes, windows.morningExecution.startET, windows.morningExecution.endET)) {
    return {
      session: 'morning',
      label: windows.morningExecution.label,
      quality: 'approved',
      enabled: windows.morningExecution.enabled,
      allowsTradePlan: windows.morningExecution.enabled,
      allowsDiscordAlert: windows.morningExecution.enabled,
      nextWindowLabel: windows.middayTrapReversal.label,
    };
  }

  if (isBetween(minutes, windows.middayTrapReversal.startET, windows.middayTrapReversal.endET)) {
    return {
      session: 'lunch',
      label: windows.middayTrapReversal.label,
      quality: 'strict',
      enabled: windows.middayTrapReversal.enabled,
      allowsTradePlan: windows.middayTrapReversal.enabled,
      allowsDiscordAlert: windows.middayTrapReversal.enabled,
      nextWindowLabel: afternoonEnabled ? windows.afternoonExecution.label : null,
    };
  }

  const afternoonActive = isBetween(minutes, windows.afternoonExecution.startET, windows.afternoonExecution.endET);
  if (afternoonActive) {
    return {
      session: 'afternoon',
      label: windows.afternoonExecution.label,
      quality: windows.afternoonExecution.enabled && afternoonEnabled ? 'approved' : 'disabled',
      enabled: windows.afternoonExecution.enabled && afternoonEnabled,
      allowsTradePlan: windows.afternoonExecution.enabled && afternoonEnabled,
      allowsDiscordAlert: windows.afternoonExecution.enabled && afternoonEnabled,
      nextWindowLabel: null,
    };
  }

  return {
    session: 'outside',
    label: 'Outside Approved Execution Window',
    quality: 'outside',
    enabled: false,
    allowsTradePlan: false,
    allowsDiscordAlert: false,
    nextWindowLabel:
      minutes < minutesFromClock(windows.openingObservation.startET)
        ? windows.openingObservation.label
        : minutes < minutesFromClock(windows.morningExecution.startET)
          ? windows.morningExecution.label
          : minutes < minutesFromClock(windows.middayTrapReversal.startET)
            ? windows.middayTrapReversal.label
            : null,
  };
}

export function scannerContextLogLabel(window: ScannerWindowState): string {
  return window.quality === 'observe_only' ? window.label : MARKET_MAPPING_LABEL;
}

export function scannerContextState(window: ScannerWindowState): ScannerState {
  return window.allowsTradePlan ? 'MapReady' : 'MarketMapping';
}

const BRIDGE_TIME_ZONES: Record<Exclude<BridgeTimeZoneMode, 'local'>, string> = {
  eastern: 'America/New_York',
  central: 'America/Chicago',
  pacific: 'America/Los_Angeles',
};

function timeZoneOffsetMinutes(timeZone: string, date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const zonedAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );
  return (zonedAsUtc - date.getTime()) / 60_000;
}

function parseWallClockInTimeZone(value: string, timeZone: string): Date | null {
  const cleaned = value.replace(/\.\d+/, '');
  const match = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second = '0'] = match;
  const wallAsUtc = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)));
  const offset = timeZoneOffsetMinutes(timeZone, wallAsUtc);
  const date = new Date(wallAsUtc.getTime() - offset * 60_000);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseBridgeTime(value: string, timeZoneMode: BridgeTimeZoneMode = 'eastern'): Date | null {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  if (!trimmed.includes('Z') && !/[+-]\d\d:\d\d$/.test(trimmed)) {
    if (timeZoneMode === 'local') {
      const localDate = new Date(trimmed.replace(/\.\d+/, ''));
      return Number.isNaN(localDate.getTime()) ? null : localDate;
    }
    return parseWallClockInTimeZone(trimmed, BRIDGE_TIME_ZONES[timeZoneMode]);
  }
  const normalized = trimmed;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function completedAtMs(bar: NinjaBridgeBar, timeframeMinutes: number, timestampMode: BridgeTimestampMode, timeZoneMode: BridgeTimeZoneMode): number | null {
  const parsed = parseBridgeTime(bar.time, timeZoneMode);
  if (!parsed) return null;
  return timestampMode === 'close'
    ? parsed.getTime()
    : parsed.getTime() + timeframeMinutes * 60_000;
}

export function latestCompletedBar(
  bars: NinjaBridgeBar[],
  timeframeMinutes: number,
  now = new Date(),
  timestampMode: BridgeTimestampMode = 'close',
  timeZoneMode: BridgeTimeZoneMode = 'eastern'
): NinjaBridgeBar | null {
  const completed = bars.filter((bar) => {
    const completedAt = completedAtMs(bar, timeframeMinutes, timestampMode, timeZoneMode);
    if (completedAt === null) return true;
    return completedAt <= now.getTime();
  });
  return completed[completed.length - 1] || null;
}

export function assessBridgeBarStaleness(args: {
  latestBar: NinjaBridgeBar | null;
  timeframeMinutes: number;
  now?: Date;
  maxStaleBarMinutes?: number;
  timestampMode?: BridgeTimestampMode;
  timeZoneMode?: BridgeTimeZoneMode;
}): BridgeBarStalenessResult {
  const now = args.now || new Date();
  const maxAllowedMinutes = args.maxStaleBarMinutes ?? 10;
  const timestampMode = args.timestampMode || 'close';
  const timeZoneMode = args.timeZoneMode || 'eastern';
  if (!args.latestBar) {
    return {
      stale: true,
      latestTime: null,
      ageMinutes: null,
      maxAllowedMinutes,
      reason: 'No completed 5M candle returned from NinjaTrader. Confirm NinjaTrader is open, connected, and the MES chart is receiving current data.',
    };
  }

  const completedAt = completedAtMs(args.latestBar, args.timeframeMinutes, timestampMode, timeZoneMode);
  if (completedAt === null) {
    return {
      stale: true,
      latestTime: args.latestBar.time,
      ageMinutes: null,
      maxAllowedMinutes,
      reason: `Latest NinjaTrader candle time could not be parsed (${args.latestBar.time}). Restart Quant Desk Live after NinjaTrader is current.`,
    };
  }

  const ageMinutes = Math.max(0, (now.getTime() - completedAt) / 60_000);
  if (ageMinutes > maxAllowedMinutes) {
    return {
      stale: true,
      latestTime: args.latestBar.time,
      ageMinutes,
      maxAllowedMinutes,
      reason: `NinjaTrader bridge is reachable, but latest completed ${args.timeframeMinutes}M candle is stale (${args.latestBar.time}, ${ageMinutes.toFixed(1)} minutes old, timezone=${timeZoneMode}). Start/refresh NinjaTrader first, confirm live data, then restart Quant Desk Live.`,
    };
  }

  return {
    stale: false,
    latestTime: args.latestBar.time,
    ageMinutes,
    maxAllowedMinutes,
    reason: null,
  };
}

function isValidPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function hasFullPlanLevels(candidate: SetupCandidate | null | undefined): boolean {
  return Boolean(
    candidate &&
    isValidPrice(candidate.entry) &&
    isValidPrice(candidate.stop) &&
    isValidPrice(candidate.target1) &&
    isValidPrice(candidate.target2)
  );
}

function hasMeaningfulStructuredEvidence(candidate: SetupCandidate | null | undefined): boolean {
  if (!candidate) return false;
  return Boolean(
    candidate.evidence?.length ||
    candidate.missingEvidence?.length ||
    candidate.requiredTrigger ||
    candidate.nextAction ||
    candidate.activeCampaign ||
    candidate.htfLiquidityDrawState ||
    candidate.failedPlanReversal ||
    candidate.activeRuleset?.timeframeMss ||
    candidate.activeRuleset?.htfLineInSand
  );
}

function candidateNextTrigger(candidate: SetupCandidate | null | undefined): string | null {
  if (!candidate) return null;
  return candidate.requiredTrigger || candidate.nextAction || candidate.activeRuleset?.htfLineInSand?.requiredClose || null;
}

function dataQualityReasonForCandidate(candidate: SetupCandidate | null | undefined, explicitReason?: string | null): string | null {
  if (explicitReason) return explicitReason;
  const htfState = candidate?.htfLiquidityDrawState;
  if (htfState?.classificationReliability === 'data_limited' || htfState?.htfContextDataLimited) {
    return htfState.htfContextSufficiency?.blockers?.[0] ||
      htfState.classificationReason ||
      'Structured HTF context is data-limited; HTF may be context only, not candidate-promotion evidence.';
  }
  const coverageWarning = candidate?.missingEvidence?.find((item) => /data-limited|data limited|30-day|context gate|missing.*ohlc/i.test(item));
  return coverageWarning || null;
}

export function buildScannerAuthorityMetadata(args: {
  candidate?: SetupCandidate | null;
  window?: ScannerWindowState | null;
  canExecute?: boolean;
  discordEligible?: boolean;
}): ScannerAuthorityMetadata {
  const candidate = args.candidate || null;
  const directional = candidate?.direction === 'LONG' || candidate?.direction === 'SHORT';
  const fullPlan = hasFullPlanLevels(candidate);
  const executionEligible = Boolean(
    directional &&
    candidate?.executionStatus === ExecutionStatus.Executable &&
    !candidate.blockReason
  );
  return {
    registeredModel: Boolean(candidate?.setupType),
    activeModel: Boolean(candidate && (args.window ? args.window.allowsTradePlan : true)),
    watchEligible: Boolean(directional && hasMeaningfulStructuredEvidence(candidate)),
    planEligible: Boolean(directional && fullPlan),
    discordEligible: Boolean(args.discordEligible ?? false),
    executionEligible,
    humanReviewOnly: Boolean(candidate?.humanReview || (candidate && !executionEligible)),
    canExecute: Boolean(args.canExecute),
  };
}

export function classifyScannerVisibility(args: {
  state: ScannerState;
  candidate?: SetupCandidate | null;
  window?: ScannerWindowState | null;
  alertDecision?: ScannerAlertDecision | null;
  canExecute?: boolean;
  staleReason?: string | null;
  dataQualityBlocker?: string | null;
}): ScannerVisibilityMetadata {
  const candidate = args.candidate || null;
  const structuredEvidence = hasMeaningfulStructuredEvidence(candidate);
  const dataQualityBlocker = dataQualityReasonForCandidate(candidate, args.dataQualityBlocker);
  const nextTrigger = candidateNextTrigger(candidate);
  const suppressionReason = args.alertDecision && !args.alertDecision.shouldSend ? args.alertDecision.reason : null;
  const state = args.state;
  let visibilityMode: ScannerVisibilityMode;
  let discordAction: ScannerDiscordAction;
  let holdWithReason: string | null = null;
  let noTradeWithReason: string | null = null;

  if (dataQualityBlocker && structuredEvidence) {
    visibilityMode = 'DATA_QUALITY_BLOCKER';
    discordAction = 'hold';
    holdWithReason = dataQualityBlocker;
  } else if ((state === 'Approved' || state === 'Executable') && args.canExecute) {
    visibilityMode = 'POST_PLAN';
    discordAction = 'post_plan';
  } else if (state === 'Approved' || state === 'Executable') {
    visibilityMode = 'POST_REVIEW';
    discordAction = 'post_review';
    holdWithReason = 'Candidate is structurally visible, but normalized canExecute is false.';
  } else if (state === 'Conditional') {
    visibilityMode = candidate?.humanReview ? 'POST_REVIEW' : hasFullPlanLevels(candidate) ? 'POST_CONDITIONAL' : 'POST_WATCH';
    discordAction = candidate?.humanReview ? 'post_review' : hasFullPlanLevels(candidate) ? 'post_conditional' : 'post_watch';
  } else if (state === 'TriggerPending' || state === 'Watching') {
    visibilityMode = 'POST_WATCH';
    discordAction = 'post_watch';
  } else if (state === 'Blocked' || state === 'Missed') {
    visibilityMode = 'HOLD_WITH_REASON';
    discordAction = 'hold';
    holdWithReason = args.staleReason || candidate?.blockReason || nextTrigger || 'Execution is blocked; structured evidence remains visible for review.';
  } else if (state === 'NoTrade') {
    visibilityMode = 'NO_TRADE_WITH_REASON';
    discordAction = 'no_trade';
    noTradeWithReason = candidate?.blockReason || suppressionReason || 'No active app-owned setup candidate.';
  } else {
    visibilityMode = structuredEvidence ? 'HOLD_WITH_REASON' : 'NO_TRADE_WITH_REASON';
    discordAction = structuredEvidence ? 'hold' : 'no_trade';
    holdWithReason = structuredEvidence ? nextTrigger || suppressionReason || 'Structured evidence is logged, but no alert action is selected.' : null;
    noTradeWithReason = structuredEvidence ? null : suppressionReason || 'No active structured setup evidence.';
  }

  return {
    visibilityMode,
    discordAction,
    suppressionReason,
    nextTrigger,
    dataQualityBlocker: dataQualityBlocker || null,
    holdWithReason,
    noTradeWithReason,
    hasMeaningfulStructuredEvidence: structuredEvidence,
    sourceOfTruth: 'scanner_desk_state_visibility_metadata',
    authority: buildScannerAuthorityMetadata({
      candidate,
      window: args.window,
      canExecute: args.canExecute,
      discordEligible: Boolean(args.alertDecision?.shouldSend),
    }),
    notes: [
      'Visibility metadata is diagnostic and formatting context only; it does not approve trades or change canExecute.',
      'Agents, Discord, RAG, and UI may summarize this metadata but must not invent, suppress, or rerank app-owned candidates.',
    ],
  };
}

function registryEntryHumanReviewOnly(entry: SetupRegistryEntry): boolean {
  return (
    entry.setupType === SetupType.OpeningDriveFvgContinuation ||
    entry.setupType === SetupType.IntradayMssMicroContinuation
  );
}

function suppressionPathsForRegistryEntry(entry: SetupRegistryEntry): string[] {
  const paths = [
    'Outside canonical Morning/Lunch setup-scan windows.',
    'Missing required structured evidence from the setup scanner.',
    'Missing completed 5M trigger, protected structure stop, invalidation, target room, or risk proof.',
    'Stale/chase guard marks the setup missed or blocked.',
    'Durable ActiveCampaign ledger suppresses duplicate Discord alerts.',
    'Discord quality threshold or duplicate alert policy suppresses posting while decision tape keeps the state.',
    'Structured HTF context below the 30-day sufficiency requirement becomes data-quality visibility, not structural confirmation.',
  ];

  if (entry.role === 'supporting_evidence') {
    paths.unshift('Supporting-evidence registry role contributes facts/reasons/scoring only and does not create the active candidate by itself.');
  }
  if (entry.role === 'deprecated') {
    paths.unshift('Deprecated registry role is excluded from active scanner, Discord alert, and trade-decision authority.');
  }
  if (registryEntryHumanReviewOnly(entry)) {
    paths.unshift('Human-review-only model metadata keeps canExecute false unless another deterministic app-owned path already allows execution.');
  }

  return paths;
}

function canExecuteRelationshipForRegistryEntry(entry: SetupRegistryEntry): string {
  if (entry.role === 'deprecated') {
    return 'Deprecated registry entry; canExecute must remain false unless a current app-owned primary model separately creates an executable plan.';
  }
  if (entry.role === 'supporting_evidence') {
    return 'Supporting evidence can improve context/scoring only; canExecute is decided by the app-owned active candidate pipeline.';
  }
  if (registryEntryHumanReviewOnly(entry)) {
    return 'Human-review-only primary model; current metadata expects canExecute=false and trader confirmation before action.';
  }
  return 'Primary model can be execution-eligible only after deterministic app-owned session, 5M trigger, stop, target, risk, invalidation, and canExecute gates pass.';
}

export function buildTradeDecisionMapAudit(entries: SetupRegistryEntry[] = SETUP_REGISTRY): TradeDecisionMapAudit {
  return {
    sourceOfTruth: 'setup_registry_trade_decision_map_audit',
    generatedFrom: 'SETUP_REGISTRY',
    tradingLogicChanged: false,
    entries: entries.map((entry) => {
      const primary = entry.role === 'primary_model';
      const humanReviewOnly = registryEntryHumanReviewOnly(entry);
      return {
        setupType: entry.setupType,
        modelName: entry.label,
        role: entry.role,
        parentModelFamily: entry.parentModelFamily || null,
        sessionWindows: [...entry.allowedSessions],
        requiredEvidence: [...entry.requiredEvidence],
        rankWeight: entry.priority,
        watchEligible: primary || entry.role === 'supporting_evidence',
        planEligible: primary,
        discordEligible: primary,
        executionEligible: primary && !humanReviewOnly,
        humanReviewOnly,
        canExecuteRelationship: canExecuteRelationshipForRegistryEntry(entry),
        knownSuppressionPaths: suppressionPathsForRegistryEntry(entry),
      };
    }),
    notes: [
      'Phase 9A audit is inventory metadata only; it does not approve, reject, rank, or suppress trades.',
      'Rank weight mirrors the setup registry priority so drift is visible without changing scanner scoring.',
      'Execution eligibility describes current authority boundaries; actual execution remains controlled by normalized canExecute.',
    ],
  };
}

function scannerCandidateKey(candidate: SetupCandidate): string {
  return [
    candidate.setupType,
    candidate.direction,
    candidate.scenarioLabel || 'scenario',
    candidate.candidateState || candidate.executionStatus,
  ].join('|');
}

function scannerStateForLifecycleCandidate(candidate: SetupCandidate): ScannerState {
  if (candidate.executionStatus === ExecutionStatus.Executable) return 'Executable';
  if (candidate.executionStatus === ExecutionStatus.Conditional) return 'Conditional';
  if (candidate.executionStatus === ExecutionStatus.Blocked) return 'Blocked';
  return candidate.direction === 'NO TRADE' ? 'NoTrade' : 'Watching';
}

function missingLevelLabels(candidate: SetupCandidate): string[] {
  return (candidate.missingLevels || []).map((item) => item.label || item.key);
}

function filteredOutReasonForLifecycle(args: {
  candidate: SetupCandidate;
  selectedKey: string | null;
  staleReason?: string | null;
}): string | null {
  const key = scannerCandidateKey(args.candidate);
  if (args.selectedKey && key === args.selectedKey) return null;
  if (args.candidate.blockReason) return String(args.candidate.blockReason);
  if (args.staleReason) return args.staleReason;
  if (args.candidate.direction === 'NO TRADE') return 'Candidate direction is NO TRADE.';
  if (args.candidate.executionStatus === ExecutionStatus.Blocked) return 'Candidate execution status is blocked.';
  if (!hasFullPlanLevels(args.candidate)) return 'Candidate is missing full entry, stop, T1, or T2 plan levels.';
  if (args.selectedKey) return 'Another candidate was selected by the existing scanner selection path.';
  return 'No selected candidate for this scanner cycle.';
}

export function buildCandidateLifecycleTrace(args: {
  candidates?: SetupCandidate[] | null;
  selectedCandidate?: SetupCandidate | null;
  state: ScannerState;
  window?: ScannerWindowState | null;
  alertDecision: ScannerAlertDecision;
  canExecute?: boolean;
  staleReason?: string | null;
  dataQualityBlocker?: string | null;
}): ScannerCandidateLifecycleTrace {
  const candidates = [...(args.candidates || [])];
  const selectedKey = args.selectedCandidate ? scannerCandidateKey(args.selectedCandidate) : null;
  const items = candidates.map((candidate): ScannerCandidateLifecycleTraceItem => {
    const candidateState = selectedKey && scannerCandidateKey(candidate) === selectedKey
      ? args.state
      : scannerStateForLifecycleCandidate(candidate);
    const visibility = classifyScannerVisibility({
      state: candidateState,
      candidate,
      window: args.window,
      alertDecision: selectedKey && scannerCandidateKey(candidate) === selectedKey
        ? args.alertDecision
        : { shouldSend: false, reason: 'Candidate was not selected by the existing scanner selection path.' },
      canExecute: selectedKey && scannerCandidateKey(candidate) === selectedKey ? Boolean(args.canExecute) : false,
      staleReason: args.staleReason,
      dataQualityBlocker: args.dataQualityBlocker,
    });
    const selected = Boolean(selectedKey && scannerCandidateKey(candidate) === selectedKey);
    return {
      candidateKey: scannerCandidateKey(candidate),
      setupType: candidate.setupType,
      scenarioLabel: candidate.scenarioLabel || null,
      direction: candidate.direction,
      detectedStatus: candidate.detectedStatus,
      executionStatus: candidate.executionStatus,
      candidateState: candidate.candidateState || null,
      rankScore: candidate.rankScore ?? null,
      priority: candidate.priority,
      decisionQualityScore: candidate.decisionQualityScore ?? null,
      modelConfidenceScore: candidate.modelConfidenceScore ?? null,
      visibilityMode: visibility.visibilityMode,
      blockReason: candidate.blockReason ? String(candidate.blockReason) : null,
      missingEvidence: [...(candidate.missingEvidence || [])],
      missingLevels: missingLevelLabels(candidate),
      nextTrigger: candidateNextTrigger(candidate),
      hasFullPlanLevels: hasFullPlanLevels(candidate),
      selected,
      filteredOutReason: selected ? null : filteredOutReasonForLifecycle({ candidate, selectedKey, staleReason: args.staleReason }),
    };
  });
  const sorted = [...items].sort((a, b) => {
    const rankA = a.rankScore ?? a.decisionQualityScore ?? a.modelConfidenceScore ?? a.priority;
    const rankB = b.rankScore ?? b.decisionQualityScore ?? b.modelConfidenceScore ?? b.priority;
    return rankB - rankA;
  });
  const bestLongPlan = sorted.find((item) => item.direction === 'LONG') || null;
  const bestShortPlan = sorted.find((item) => item.direction === 'SHORT') || null;
  const selectedCandidate = selectedKey
    ? items.find((item) => item.candidateKey === selectedKey) || null
    : null;
  const missingProofSummary = Array.from(new Set(items.flatMap((item) => [
    ...item.missingEvidence,
    ...item.missingLevels,
    item.blockReason,
  ].filter((value): value is string => Boolean(value)))));

  return {
    sourceOfTruth: 'scanner_candidate_lifecycle_trace',
    candidateCount: items.length,
    createdCandidates: items,
    highestRankedCandidate: sorted[0] || null,
    bestLongPlan,
    bestShortPlan,
    selectedCandidateKey: selectedKey,
    selectedCandidate,
    filteredOutCandidates: items.filter((item) => !item.selected),
    discordDecision: args.alertDecision,
    missingProofSummary,
    nextTrigger: selectedCandidate?.nextTrigger || sorted.find((item) => item.nextTrigger)?.nextTrigger || null,
    notes: [
      'Lifecycle trace reports the existing scanner cycle only; it does not rerank, suppress, or approve candidates.',
      'Discord post/suppress reason is copied from the existing alert decision so formatter paths can explain quiet outcomes.',
    ],
  };
}

function marketModeFromDeskVisibility(args: {
  state: ScannerState;
  visibilityMode: ScannerVisibilityMode;
}): DeskStateMarketMode {
  if (args.state === 'MarketMapping' || args.state === 'MapReady' || args.state === 'NoData') return 'market_mapping';
  if (args.visibilityMode === 'POST_WATCH' || args.state === 'Watching' || args.state === 'TriggerPending') return 'watching';
  if (args.visibilityMode === 'POST_CONDITIONAL' || args.state === 'Conditional') return 'conditional';
  if (args.visibilityMode === 'POST_PLAN' || args.visibilityMode === 'POST_REVIEW' || args.state === 'Approved' || args.state === 'Executable') {
    return 'human_review_ready';
  }
  return 'no_trade';
}

function htfContextStatusForDeskState(candidate: SetupCandidate | null): DeskStateHtfContextStatus {
  if (!candidate?.htfLiquidityDrawState && !candidate?.activeRuleset?.htfLineInSand) return 'not_applicable';
  const htfState = candidate.htfLiquidityDrawState;
  if (htfState?.classificationReliability === 'data_limited' || htfState?.htfContextDataLimited) return 'insufficient';
  const sufficiency = htfState?.htfContextSufficiency?.overallStatus;
  if (sufficiency === 'sufficient') return 'sufficient';
  if (sufficiency === 'data_limited' || sufficiency === 'missing') return 'insufficient';
  return 'partial';
}

function dataQualityStatusForDeskState(args: {
  visibilityMetadata: ScannerVisibilityMetadata;
  candidateLifecycleTrace: ScannerCandidateLifecycleTrace;
}): DeskStateDataQualityStatus {
  if (args.visibilityMetadata.dataQualityBlocker) return 'data_limited';
  if (args.candidateLifecycleTrace.missingProofSummary.length > 0) return 'partial';
  return 'ok';
}

export function buildDeskState(args: {
  state: ScannerState;
  candidate?: SetupCandidate | null;
  visibilityMetadata: ScannerVisibilityMetadata;
  candidateLifecycleTrace: ScannerCandidateLifecycleTrace;
  canExecute?: boolean;
}): DeskState {
  const candidate = args.candidate || null;
  return {
    sourceOfTruth: 'scanner_desk_state',
    marketMode: marketModeFromDeskVisibility({
      state: args.state,
      visibilityMode: args.visibilityMetadata.visibilityMode,
    }),
    activeCampaign: candidate?.activeCampaign || null,
    bestLongPlan: args.candidateLifecycleTrace.bestLongPlan,
    bestShortPlan: args.candidateLifecycleTrace.bestShortPlan,
    selectedCandidate: args.candidateLifecycleTrace.selectedCandidate,
    lineInSand: candidate?.activeRuleset?.htfLineInSand?.lineInSand ?? null,
    nextTrigger: args.visibilityMetadata.nextTrigger || args.candidateLifecycleTrace.nextTrigger,
    invalidation: candidate?.invalidation || null,
    visibilityMode: args.visibilityMetadata.visibilityMode,
    discordAction: args.visibilityMetadata.discordAction,
    suppressionReason: args.visibilityMetadata.suppressionReason,
    htfContextStatus: htfContextStatusForDeskState(candidate),
    dataQualityStatus: dataQualityStatusForDeskState({
      visibilityMetadata: args.visibilityMetadata,
      candidateLifecycleTrace: args.candidateLifecycleTrace,
    }),
    canExecute: Boolean(args.canExecute),
    visibilityMetadata: args.visibilityMetadata,
    candidateLifecycleTrace: args.candidateLifecycleTrace,
    notes: [
      'DeskState is the scanner-owned visibility snapshot for Discord, RAG, and UI consumers.',
      'DeskState does not change trade approvals, entry, stop, target, risk, model definitions, or canExecute.',
    ],
  };
}

function directionSign(direction: SetupCandidate['direction']): number {
  return direction === 'LONG' ? 1 : direction === 'SHORT' ? -1 : 0;
}

const ICT_RULE_WEIGHTS = {
  LIQUIDITY_SWEEP: 25,
  RECLAIM_AFTER_SWEEP: 15,
  WICK_REJECTION_SUPPORT: 10,
  TURTLE_SOUP_REVERSAL: 20,
  DISPLACEMENT_CONFIRMED: 20,
  MARKET_STRUCTURE_SHIFT: 20,
  FVG_OR_IMBALANCE_ENTRY: 15,
  PREMIUM_DISCOUNT_ALIGNMENT: 15,
  HTF_BIAS_ALIGNED: 10,
  EXECUTION_READY: 10,
} as const;

const SESSION_TIME_WEIGHTS = {
  morning: 1.0,
  afternoon: 0.85,
  lunch: 0.85,
  outside: 0.0,
} as const;

const ICT_SCORE_THRESHOLDS = {
  NO_TRADE: 0,
  WATCHLIST: 45,
  CONDITIONAL: 65,
  QUALIFIED: 80,
} as const;

function clampScore(value: number, max: number): number {
  return Math.max(0, Math.min(max, Math.round(value)));
}

function scoreStatus(score: number, max: number): 'strong' | 'partial' | 'weak' | 'blocked' {
  if (score <= 0) return 'blocked';
  const ratio = max > 0 ? score / max : 0;
  if (ratio >= 0.8) return 'strong';
  if (ratio >= 0.45) return 'partial';
  return 'weak';
}

function recommendationForScore(score: number, hardBlocker?: string | null): string {
  if (hardBlocker) return `No trade: ${hardBlocker}`;
  if (score >= ICT_SCORE_THRESHOLDS.QUALIFIED) return 'Qualified only if the 5M trigger, structure stop, actual risk, and target room remain confirmed.';
  if (score >= ICT_SCORE_THRESHOLDS.CONDITIONAL) return 'Conditional: good map, but wait for the missing confirmation before execution.';
  if (score >= ICT_SCORE_THRESHOLDS.WATCHLIST) return 'Watchlist: monitor the level, but do not execute until the active model and deterministic risk gate complete.';
  return 'No trade: score is below the desk threshold or required evidence is missing.';
}

function isIctHardDisqualified(candidate: SetupCandidate): boolean {
  return Boolean(ictHardDisqualifierReason(candidate));
}

function isIntradayMssMicroContinuationWatch(candidate: SetupCandidate | null | undefined): boolean {
  if (!candidate) return false;
  return (
    candidate.setupType === SetupType.IntradayMssMicroContinuation &&
    candidate.candidateState === 'MSS_CONTINUATION_RETEST_PENDING' &&
    candidate.executionStatus === ExecutionStatus.Conditional &&
    candidate.humanReview?.canExecute === false &&
    candidate.humanReview.requiresTraderConfirmation === true &&
    typeof candidate.activeRuleset?.htfLineInSand?.lineInSand === 'number' &&
    Number.isFinite(candidate.activeRuleset.htfLineInSand.lineInSand) &&
    candidate.activeRuleset.htfLineInSand.lineInSand > 0
  );
}

function ictHardDisqualifierReason(candidate: SetupCandidate): string | null {
  const blockReason = (candidate.blockReason ?? '').toLowerCase();

  if (blockReason.includes('chop')) return 'Chop/consolidation no-trade';
  if (blockReason.includes('consolidation')) return 'Chop/consolidation no-trade';
  if (blockReason.includes('overlap')) return 'Chop/consolidation no-trade';
  if (blockReason.includes('no displacement')) return 'No confirmed displacement';
  if (blockReason.includes('expired')) return 'ICT setup expired: stale/chase guard active';
  if (blockReason.includes('chase')) return 'ICT setup expired: stale/chase guard active';
  if (blockReason.includes('stale')) return 'ICT setup expired: stale/chase guard active';
  if (blockReason.includes('outside session')) return 'Outside approved session';

  const risk = candidate.riskPoints;

  const reward =
    typeof candidate.target1 === 'number' && typeof candidate.entry === 'number'
      ? Math.abs(candidate.target1 - candidate.entry)
      : null;

  if (
    typeof risk === 'number' &&
    risk > 0 &&
    typeof reward === 'number' &&
    reward / risk < 2.0
  ) {
    return 'Minimum 2.0R unavailable';
  }

  return null;
}

function extractIctSignals(candidate: SetupCandidate) {
  const setupType = (candidate.setupType ?? '').toLowerCase();
  const scenario = [
    candidate.scenarioLabel,
    ...(candidate.evidence ?? []),
    ...(candidate.missingEvidence ?? []),
    candidate.nextAction,
    candidate.reducedRiskPlan,
  ].filter(Boolean).join(' ').toLowerCase();
  const trigger = (candidate.requiredTrigger ?? '').toLowerCase();
  const blockReason = (candidate.blockReason ?? '').toLowerCase();

  return {
    hasLiquiditySweep:
      setupType.includes('sweep') ||
      scenario.includes('liquidity sweep') ||
      scenario.includes('buy-side sweep') ||
      scenario.includes('sell-side sweep') ||
      scenario.includes('buyside sweep') ||
      scenario.includes('sellside sweep') ||
      scenario.includes('raid'),

    hasReclaimAfterSweep:
      scenario.includes('reclaim') ||
      trigger.includes('reclaim') ||
      scenario.includes('sweep and reclaim') ||
      scenario.includes('sweep-reclaim'),

    hasWickRejectionSupport:
      scenario.includes('wick rejection') ||
      scenario.includes('rejection wick') ||
      scenario.includes('long lower wick') ||
      scenario.includes('long upper wick') ||
      scenario.includes('closed back above swept low') ||
      scenario.includes('closed back below swept high'),

    hasTurtleSoupReversal:
      scenario.includes('turtle soup') ||
      setupType.includes('turtle soup') ||
      scenario.includes('failed breakout') ||
      scenario.includes('failed breakdown') ||
      scenario.includes('liquidity raid reversal'),

    hasDisplacement:
      scenario.includes('displacement') ||
      scenario.includes('impulse') ||
      scenario.includes('strong move') ||
      trigger.includes('displacement'),

    hasMarketStructureShift:
      scenario.includes('mss') ||
      scenario.includes('market structure shift') ||
      scenario.includes('shift in structure') ||
      trigger.includes('mss'),

    hasFvgOrImbalanceEntry:
      setupType.includes('fvg') ||
      setupType.includes('fair value gap') ||
      setupType.includes('imbalance') ||
      scenario.includes('fvg') ||
      scenario.includes('fair value gap') ||
      scenario.includes('imbalance') ||
      scenario.includes('breaker/fvg confluence') ||
      scenario.includes('overlap zone'),

    hasPremiumDiscountAlignment:
      scenario.includes('discount') ||
      scenario.includes('premium') ||
      scenario.includes('equilibrium') ||
      scenario.includes('pd array') ||
      scenario.includes('dealing range'),

    isStaleOrChasing:
      blockReason.includes('chase') ||
      blockReason.includes('stale') ||
      blockReason.includes('expired'),

    isCountertrendAgainstBigPicture:
      scenario.includes('countertrend') ||
      scenario.includes('do not fight big-picture structure') ||
      scenario.includes('big-picture structure is bullish') ||
      scenario.includes('big-picture structure is bearish'),
  };
}

export function scoreScannerCandidate(
  candidate: SetupCandidate | null,
  window: ReturnType<typeof resolveScannerWindow>,
  currentPrice: number | null,
  higherTimeframeAligned: boolean,
  currentEtMinutes: number = toEtMinutes(new Date()),
): ScannerConfidenceBreakdown {
  void currentEtMinutes;
  const qualifiedReasons: string[] = [];
  const missingReasons: string[] = [];
  let score = 0;
  const currentPriceAvailable = isValidPrice(currentPrice);
  const sessionWeight = window.session === 'morning'
    ? SESSION_TIME_WEIGHTS.morning
    : window.session === 'lunch'
      ? SESSION_TIME_WEIGHTS.lunch
      : window.session === 'afternoon'
        ? SESSION_TIME_WEIGHTS.afternoon
        : SESSION_TIME_WEIGHTS.outside;

  const add = (condition: boolean, points: number, good: string, missing: string) => {
    if (condition) {
      score += points;
      qualifiedReasons.push(good);
    } else {
      missingReasons.push(missing);
    }
  };

  if (!candidate) {
    const hardBlocker = 'no ICT candidate/reference level';
    return {
      score: ICT_SCORE_THRESHOLDS.NO_TRADE,
      qualifiedReasons,
      missingReasons: [hardBlocker],
      hardBlocker,
      recommendation: recommendationForScore(ICT_SCORE_THRESHOLDS.NO_TRADE, hardBlocker),
      scorecard: [{
        label: 'Registered model',
        score: 0,
        max: 25,
        status: 'blocked',
        note: 'No registered primary Model 1 or Turtle Soup candidate was available.',
      }],
    };
  }

  if (!window.allowsTradePlan || sessionWeight === 0) {
    const hardBlocker = 'outside approved ICT execution session';
    return {
      score: ICT_SCORE_THRESHOLDS.NO_TRADE,
      qualifiedReasons,
      missingReasons: [hardBlocker],
      hardBlocker,
      recommendation: recommendationForScore(ICT_SCORE_THRESHOLDS.NO_TRADE, hardBlocker),
      scorecard: [{
        label: 'Time window',
        score: 0,
        max: 10,
        status: 'blocked',
        note: 'The scanner is outside the approved morning/lunch execution window.',
      }],
    };
  }

  const hardDisqualifierReason = ictHardDisqualifierReason(candidate);
  if (hardDisqualifierReason) {
    return {
      score: ICT_SCORE_THRESHOLDS.NO_TRADE,
      qualifiedReasons,
      missingReasons: [hardDisqualifierReason],
      hardBlocker: hardDisqualifierReason,
      recommendation: recommendationForScore(ICT_SCORE_THRESHOLDS.NO_TRADE, hardDisqualifierReason),
      scorecard: [{
        label: 'Hard blocker',
        score: 0,
        max: 25,
        status: 'blocked',
        note: hardDisqualifierReason,
      }],
    };
  }

  const signals = extractIctSignals(candidate);
  const wickOnly =
    signals.hasWickRejectionSupport &&
    !signals.hasReclaimAfterSweep &&
    !signals.hasDisplacement &&
    !signals.hasMarketStructureShift &&
    !signals.hasFvgOrImbalanceEntry &&
    !signals.hasTurtleSoupReversal &&
    !higherTimeframeAligned;

  if (wickOnly) {
    const hardBlocker = 'Wick rejection support is not enough without reclaim, displacement, market structure shift, FVG, Turtle Soup, or higher-timeframe alignment';
    return {
      score: ICT_SCORE_THRESHOLDS.NO_TRADE,
      qualifiedReasons: [],
      missingReasons: [hardBlocker],
      hardBlocker,
      recommendation: recommendationForScore(ICT_SCORE_THRESHOLDS.NO_TRADE, hardBlocker),
      scorecard: [{
        label: 'Model evidence',
        score: 0,
        max: 25,
        status: 'blocked',
        note: 'Wick-only rejection is supporting evidence, not a standalone trade.',
      }],
    };
  }

  if (!currentPriceAvailable) missingReasons.push('current price unavailable for proximity check');
  add(signals.hasLiquiditySweep, ICT_RULE_WEIGHTS.LIQUIDITY_SWEEP, 'Liquidity sweep confirmed', 'No confirmed liquidity sweep');
  add(signals.hasReclaimAfterSweep, ICT_RULE_WEIGHTS.RECLAIM_AFTER_SWEEP, 'Reclaim after sweep confirmed', 'No confirmed liquidity sweep');
  add(signals.hasWickRejectionSupport, ICT_RULE_WEIGHTS.WICK_REJECTION_SUPPORT, 'Wick rejection support', 'Wick rejection support missing');
  add(signals.hasTurtleSoupReversal, ICT_RULE_WEIGHTS.TURTLE_SOUP_REVERSAL, 'Turtle Soup reversal', 'No confirmed liquidity sweep');
  add(signals.hasDisplacement, ICT_RULE_WEIGHTS.DISPLACEMENT_CONFIRMED, 'Displacement confirmed', 'No confirmed displacement');
  add(signals.hasMarketStructureShift, ICT_RULE_WEIGHTS.MARKET_STRUCTURE_SHIFT, 'Market structure shift confirmed', 'No confirmed market structure shift');
  add(signals.hasFvgOrImbalanceEntry, ICT_RULE_WEIGHTS.FVG_OR_IMBALANCE_ENTRY, 'Fair value gap / imbalance entry model', 'No fair value gap / imbalance entry model');
  add(signals.hasPremiumDiscountAlignment, ICT_RULE_WEIGHTS.PREMIUM_DISCOUNT_ALIGNMENT, 'Premium/discount alignment', 'Premium/discount alignment missing');
  add(higherTimeframeAligned, ICT_RULE_WEIGHTS.HTF_BIAS_ALIGNED, 'Higher-timeframe bias aligned', 'Higher-timeframe bias not aligned');
  add(
    candidate.executionStatus === ExecutionStatus.Executable || candidate.executionStatus === ExecutionStatus.Conditional,
    ICT_RULE_WEIGHTS.EXECUTION_READY,
    'Entry, stop, and target available',
    'Entry, stop, and target unavailable'
  );

  if (signals.isStaleOrChasing) missingReasons.push('ICT setup expired: stale/chase guard active');
  if (signals.isCountertrendAgainstBigPicture) {
    missingReasons.push('Countertrend setup requires immediate failure confirmation; do not fight big-picture structure');
  }

  const structureWeight = signals.isCountertrendAgainstBigPicture ? 0.6 : 1;
  const weightedScore = score * sessionWeight * structureWeight;
  const finalScore = Math.max(0, Math.min(100, Math.round(weightedScore)));
  const modelCompletion = clampScore(
    (signals.hasLiquiditySweep ? 6 : 0) +
    (signals.hasReclaimAfterSweep ? 6 : 0) +
    (signals.hasTurtleSoupReversal || signals.hasFvgOrImbalanceEntry || isIntradayMssMicroContinuationWatch(candidate) ? 7 : 0) +
    (signals.hasDisplacement || signals.hasMarketStructureShift ? 6 : 0) +
    (isIntradayMssMicroContinuationWatch(candidate) ? 6 : 0),
    25
  );
  const executionQuality = clampScore(
    (candidate.requiredTrigger ? 6 : 0) +
    (isValidPrice(candidate.entry) ? 5 : 0) +
    (isValidPrice(candidate.stop) ? 5 : 0) +
    (candidate.executionStatus === ExecutionStatus.Executable || candidate.executionStatus === ExecutionStatus.Conditional ? 4 : 0),
    20
  );
  const liquidityQuality = clampScore(
    (signals.hasLiquiditySweep ? 5 : 0) +
    (signals.hasPremiumDiscountAlignment ? 3 : 0) +
    (candidate.levelContextScore ? Math.min(7, Math.round(candidate.levelContextScore / 2)) : 0),
    15
  );
  const htfQuality = clampScore(
    (higherTimeframeAligned ? 10 : 0) +
    (signals.isCountertrendAgainstBigPicture ? -5 : 3),
    15
  );
  const riskTargetQuality = clampScore(
    (isValidPrice(candidate.stop) ? 5 : 0) +
    (isValidPrice(candidate.target1) ? 5 : 0) +
    (isValidPrice(candidate.target2) ? 5 : 0) +
    (!signals.isStaleOrChasing ? 5 : 0),
    20
  );
  const sessionQuality = clampScore(
    (sessionWeight >= 1 ? 5 : sessionWeight > 0 ? 3 : 0) -
    (signals.isStaleOrChasing ? 3 : 0),
    5
  );

  return {
    score: finalScore,
    qualifiedReasons,
    missingReasons,
    hardBlocker: null,
    recommendation: recommendationForScore(finalScore),
    scorecard: [
      {
        label: 'Active model completion',
        score: modelCompletion,
        max: 25,
        status: scoreStatus(modelCompletion, 25),
        note: isIntradayMssMicroContinuationWatch(candidate)
          ? 'Intraday MSS Micro Continuation watch is active from aligned 15M/5M MSS and a named line in the sand.'
          : signals.hasTurtleSoupReversal
            ? 'Turtle Soup evidence is present.'
            : signals.hasFvgOrImbalanceEntry
              ? 'Model 1 FVG/imbalance evidence is present.'
              : 'Active model is still missing required evidence.',
      },
      {
        label: '5M execution quality',
        score: executionQuality,
        max: 20,
        status: scoreStatus(executionQuality, 20),
        note: '5M trigger, entry, stop, and executable/conditional readiness.',
      },
      {
        label: '15M/session liquidity map',
        score: liquidityQuality,
        max: 15,
        status: scoreStatus(liquidityQuality, 15),
        note: candidate.levelContextSummary || 'Session liquidity context is limited.',
      },
      {
        label: '60M/240M structure alignment',
        score: htfQuality,
        max: 15,
        status: scoreStatus(htfQuality, 15),
        note: higherTimeframeAligned ? 'Higher-timeframe bias aligned.' : 'Higher-timeframe bias is not aligned or not confirmed.',
      },
      {
        label: 'Risk and target room',
        score: riskTargetQuality,
        max: 20,
        status: scoreStatus(riskTargetQuality, 20),
        note: 'Structure stop, T1/T2 availability, and no stale/chase condition.',
      },
      {
        label: 'Time window / session quality',
        score: sessionQuality,
        max: 5,
        status: scoreStatus(sessionQuality, 5),
        note: window.session === 'morning' ? 'Morning execution window has full weight.' : window.session === 'lunch' ? 'Lunch window uses stricter quality weight.' : 'Session quality is reduced.',
      },
    ],
  };
}

export function applyStaleChaseGuard(args: {
  candidate: SetupCandidate | null;
  currentPrice?: number | null;
  guards?: Partial<ScannerRiskGuards>;
}): StaleChaseResult {
  const candidate = args.candidate;
  const currentPrice = args.currentPrice;
  const guards = { ...DEFAULT_SCANNER_RISK_GUARDS, ...(args.guards || {}) };
  if (!candidate || !isValidPrice(currentPrice) || !isValidPrice(candidate.entry) || candidate.direction === 'NO TRADE') {
    return { state: candidate ? 'Conditional' : 'NoTrade', stale: false, reason: null };
  }
  const sign = directionSign(candidate.direction);
  const movedPastEntry = (currentPrice - candidate.entry) * sign;
  const risk = isValidPrice(candidate.riskPoints) ? candidate.riskPoints : isValidPrice(candidate.stop) ? Math.abs(candidate.entry - candidate.stop) : null;
  const maxRDistance = risk ? risk * guards.maxChaseDistanceR : Number.POSITIVE_INFINITY;
  const chaseDistance = Math.min(guards.maxChaseDistancePoints, maxRDistance);

  if (isValidPrice(candidate.target1)) {
    const reachedT1 =
      candidate.direction === 'LONG'
        ? currentPrice >= candidate.target1
        : currentPrice <= candidate.target1;
    if (reachedT1) {
      return {
        state: 'Missed',
        stale: true,
        reason: 'T1 was already reached before alert generation. Move occurred without preferred retest. No chase entry.',
      };
    }

    const distanceToEntry = Math.abs(currentPrice - candidate.entry);
    const distanceToT1 = Math.abs(candidate.target1 - currentPrice);
    if (distanceToT1 < distanceToEntry) {
      return {
        state: 'Missed',
        stale: true,
        reason: 'Current price is closer to T1 than the preferred entry zone. Move occurred without preferred retest. No chase entry.',
      };
    }
  }

  if (guards.allowRetestOnlyEntries && movedPastEntry > chaseDistance) {
    return {
      state: 'Missed',
      stale: true,
      reason: 'Preferred entry was missed. Do not chase. Waiting for new retest or next setup.',
    };
  }

  return { state: 'Conditional', stale: false, reason: null };
}

function timeframeRank(source: TargetObjective['source']): number {
  if (source === 'ninjatrader' || source === 'app') return 4;
  if (source === 'full_context' || source === 'prior_eth' || source === 'previous_rth') return 4;
  if (source === 'three_day_rth' || source === 'three_day_eth' || source === 'weekly_rth' || source === 'weekly_eth' || source === 'monthly_rth' || source === 'monthly_eth') return 4;
  if (source === 'asian' || source === 'london' || source === 'ny_premarket') return 3;
  if (source === 'rth_morning' || source === 'lunch') return 2;
  return 1;
}

function hasTargetBeenSwept(target: TargetObjective, bars: NinjaBridgeBar[], direction: SetupCandidate['direction']): boolean {
  if (direction === 'LONG') return bars.some((bar) => bar.high >= target.price);
  if (direction === 'SHORT') return bars.some((bar) => bar.low <= target.price);
  return false;
}

export function buildTargetCascade(args: {
  candidate: SetupCandidate | null;
  objectives?: TargetObjective[];
  recentBars?: NinjaBridgeBar[];
  lookbackCandles?: number;
}): TargetCascadeResult {
  const candidate = args.candidate;
  const objectives = (args.objectives || candidate?.targetObjectivePlan?.objectives || [])
    .filter((objective) => candidate?.direction === objective.direction)
    .sort((a, b) => {
      const rankDiff = timeframeRank(a.source) - timeframeRank(b.source);
      if (rankDiff !== 0) return rankDiff;
      const distanceA = a.distancePoints ?? Number.POSITIVE_INFINITY;
      const distanceB = b.distancePoints ?? Number.POSITIVE_INFINITY;
      if (distanceA !== distanceB) return distanceA - distanceB;
      return b.score - a.score;
    });
  const recentBars = (args.recentBars || []).slice(-(args.lookbackCandles || DEFAULT_SCANNER_RISK_GUARDS.targetAlreadySweptLookbackCandles));

  if (!candidate || !objectives.length) {
    return {
      activeTarget: null,
      activeTimeframe: null,
      sweptTargets: [],
      promotedTarget: null,
      path: ['No directional target map available.'],
      targetRoomPoor: true,
      reason: 'No valid target exists with acceptable reward/risk.',
    };
  }

  const sweptTargets: TargetObjective[] = [];
  const path: string[] = [];
  let activeTarget: TargetObjective | null = null;

  for (const objective of objectives) {
    if (hasTargetBeenSwept(objective, recentBars, candidate.direction)) {
      sweptTargets.push(objective);
      path.push(`${objective.label} at ${objective.price} already swept; promoting next objective.`);
      continue;
    }
    activeTarget = objective;
    path.push(`${objective.label} at ${objective.price} selected as active target.`);
    break;
  }

  if (!activeTarget) {
    return {
      activeTarget: null,
      activeTimeframe: null,
      sweptTargets,
      promotedTarget: null,
      path,
      targetRoomPoor: true,
      reason: 'All mapped objectives in this direction were already swept.',
    };
  }

  const targetRoomPoor = Boolean(activeTarget.rMultiple !== null && activeTarget.rMultiple !== undefined && activeTarget.rMultiple < 1);
  return {
    activeTarget,
    activeTimeframe: String(activeTarget.source),
    sweptTargets,
    promotedTarget: sweptTargets.length ? activeTarget : null,
    path,
    targetRoomPoor,
    reason: targetRoomPoor
      ? 'Promoted target is too close to justify actual risk.'
      : `Target cascade selected ${activeTarget.label} from ${activeTarget.source}.`,
  };
}

export function scannerStateFromDecision(args: {
  decisionStatus?: TradeDecisionStatus | null;
  candidate?: SetupCandidate | null;
  stale?: StaleChaseResult | null;
  targetCascade?: TargetCascadeResult | null;
}): ScannerState {
  if (args.stale?.stale) return 'Missed';
  if (args.targetCascade?.targetRoomPoor) return 'Blocked';
  if (args.decisionStatus === TradeDecisionStatus.ApprovedTrade) return 'Approved';
  if (args.decisionStatus === TradeDecisionStatus.ConditionalTrade) return 'Conditional';
  if (args.decisionStatus === TradeDecisionStatus.Wait) return args.candidate ? 'Conditional' : 'Watching';
  if (args.decisionStatus === TradeDecisionStatus.NoTrade) return args.candidate ? 'Blocked' : 'NoTrade';
  if (args.decisionStatus === TradeDecisionStatus.OutsideRules) return 'MarketMapping';
  return args.candidate ? 'Watching' : 'MapReady';
}

export function shouldSendScannerAlert(args: {
  state: ScannerState;
  confidence: number;
  window: ScannerWindowState;
  candidate?: SetupCandidate | null;
  thresholds?: Partial<ScannerThresholds>;
  stale?: boolean;
  duplicate?: boolean;
  stateImproved?: boolean;
}): ScannerAlertDecision {
  const thresholds = { ...DEFAULT_THRESHOLDS, ...(args.thresholds || {}) };
  if (!args.window.allowsDiscordAlert) {
    return { shouldSend: false, reason: 'Outside approved alert window. Context updated only.' };
  }
  if (args.duplicate && !args.stateImproved) {
    return { shouldSend: false, reason: 'Duplicate alert suppressed for same setup/reference/direction/state.' };
  }
  if (args.state === 'Watching' || args.state === 'MapReady' || args.state === 'MarketMapping' || args.state === 'NoData') {
    return { shouldSend: false, reason: `${args.state} is logged locally but not sent to Discord by default.` };
  }
  if (args.state === 'TriggerPending') {
    return { shouldSend: false, reason: 'TriggerPending is logged locally as developing context; no executable alert is published until the app-owned candidate gates pass.' };
  }
  if (args.state === 'Missed') {
    return args.confidence >= thresholds.educationalBlocked
      ? { shouldSend: true, reason: 'Missed preferred retest qualifies for RAG/journal learning alert.' }
      : { shouldSend: false, reason: 'Missed setup below educational alert threshold.' };
  }
  if (args.state === 'Blocked') {
    const educational =
      args.candidate?.blockReason === NoTradeReason.RiskTooWide ||
      args.candidate?.blockReason === NoTradeReason.TargetsUnavailable ||
      args.stale;
    return educational && args.confidence >= thresholds.educationalBlocked
      ? { shouldSend: true, reason: 'Educational blocked setup qualified for one Discord alert.' }
      : { shouldSend: false, reason: 'Blocked setup did not meet educational Discord threshold.' };
  }
  if (args.state === 'Conditional') {
    if (isIntradayMssMicroContinuationWatch(args.candidate) && (args.candidate?.modelConfidenceScore ?? args.confidence) >= 56) {
      return { shouldSend: true, reason: 'Intraday MSS Micro Continuation watch qualified for Discord: aligned 15M/5M MSS plus named line in the sand. Human review only; no chase.' };
    }
    return args.confidence >= thresholds.conditional
      ? { shouldSend: true, reason: `${scannerAlertQualityFromScore(args.confidence).label} qualified for Discord.` }
      : { shouldSend: false, reason: 'Conditional plan below 65 score threshold; trade plan not published.' };
  }
  if (args.state === 'Executable' || args.state === 'Approved') {
    return args.confidence >= thresholds.executable
      ? { shouldSend: true, reason: `${scannerAlertQualityFromScore(args.confidence).label} qualified for Discord.` }
      : { shouldSend: false, reason: 'Executable/approved plan below 80 score threshold.' };
  }
  return { shouldSend: false, reason: 'No actionable scanner alert.' };
}

export function scannerAlertKey(args: {
  tradeDate: string;
  instrument: string;
  session: ScannerSession;
  candidate?: SetupCandidate | null;
  state: ScannerState;
}): string {
  const candidate = args.candidate;
  const reference =
    candidate?.entry ||
    candidate?.stop ||
    candidate?.requiredTrigger ||
    'no-reference';
  return [
    args.tradeDate,
    args.instrument,
    args.session,
    candidate?.direction || 'NONE',
    candidate?.setupType || 'NoSetup',
    reference,
    args.state,
  ].join('|');
}
