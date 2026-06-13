import { TRADE_RULES } from '../config/tradeRules';
import { isMarketMappingWindowByEtMinutes } from '../config/timeWindows';
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
  allowsMarketMapping: boolean;
  allowsDeskPlan: boolean;
  nextWindowLabel: string | null;
}

export const MARKET_MAPPING_LABEL = 'Market Mapping Mode';
export const MARKET_MAPPING_OFF_HOURS_LABEL = 'Market Mapping Off Hours';

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
  requiredTrigger: string | null;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  riskPoints: number | null;
  invalidation: string | null;
  lineInSand: number | null;
  lineInSandReason: string | null;
  targetReactionLevel: number | null;
  targetReactionLabel: string | null;
  targetReactionReason: string | null;
  levelTransition: DeskLevelTransitionMap | null;
  htfConflict: boolean;
  htfSupported: boolean;
  countertrend: boolean;
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
export type DeskStatePromotionStage =
  | 'market_mapping'
  | 'watch'
  | 'conditional'
  | 'human_review_ready'
  | 'posted_plan'
  | 'no_trade';

export interface DeskStatePromotionPath {
  sourceOfTruth: 'scanner_desk_state_promotion_path';
  currentStage: DeskStatePromotionStage;
  nextStage: DeskStatePromotionStage | null;
  promotionTrigger: string | null;
  missingProof: string[];
  canPromoteNow: false;
  notes: string[];
}

export type DeskPlayDirection = 'LONG' | 'SHORT' | 'WAIT';
export type DeskPlayBiasState = 'primary' | 'secondary' | 'countertrend_review' | 'blocked' | 'not_present';

export interface DeskPlayLineConfidence {
  sourceOfTruth: 'scanner_lifecycle_line_confidence';
  score: number | null;
  label: 'high' | 'medium' | 'low' | 'unavailable';
  reason: string;
  approvalBoundary: {
    changesTradeApprovals: false;
    changesCanExecute: false;
  };
}

export interface DeskPlayHtfReactionContext {
  sourceOfTruth: 'scanner_htf_reaction_context';
  reactionLevel: number | null;
  reactionLabel: string | null;
  reactionReason: string | null;
  sourceTimeframes: string[];
  strength: 'major' | 'strong' | 'moderate' | 'tactical' | 'unknown';
  whyItMayReact: string;
  approvalBoundary: {
    changesTradeApprovals: false;
    changesCanExecute: false;
  };
}

export interface DeskPlayDirectionalBias {
  direction: 'LONG' | 'SHORT';
  state: DeskPlayBiasState;
  candidateKey: string | null;
  setupType: SetupType | null;
  scenarioLabel: string | null;
  rankScore: number | null;
  decisionQualityScore: number | null;
  modelConfidenceScore: number | null;
  lineInSand: number | null;
  lineConfidence: DeskPlayLineConfidence;
  htfReactionContext: DeskPlayHtfReactionContext;
  nextTrigger: string | null;
  invalidation: string | null;
  reason: string;
  blockers: string[];
}

export interface DeskLevelTransitionMap {
  sourceOfTruth: 'scanner_level_transition_map';
  targetReactionLevel: number | null;
  targetReactionLabel: string | null;
  targetReactionReason: string | null;
  longAbove: number | null;
  shortBelow: number | null;
  profitProtectionInstruction: string;
  targetManagementInstruction: string;
  nextStructureInstruction: string;
  approvalBoundary: {
    changesTradeApprovals: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
  };
}

export type DeskHtfObjectiveKind = 'reaction' | 'next_draw' | 'runner' | 'extension';

export interface DeskHtfObjective {
  sourceOfTruth: 'scanner_htf_objective_ladder';
  kind: DeskHtfObjectiveKind;
  label: string;
  price: number;
  source: TargetObjective['source'] | 'scanner_reaction';
  rMultiple: number | null;
  instruction: string;
}

export interface DeskHtfObjectiveLadder {
  sourceOfTruth: 'scanner_htf_objective_ladder';
  direction: DeskPlayDirection;
  appTarget1: number | null;
  appTarget2: number | null;
  reaction: DeskHtfObjective | null;
  nextDraw: DeskHtfObjective | null;
  runner: DeskHtfObjective | null;
  extension: DeskHtfObjective | null;
  objectives: DeskHtfObjective[];
  managementInstruction: string;
  approvalBoundary: {
    changesTradeApprovals: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
  };
}

export interface DeskHtfProtectedStructureRow {
  sourceOfTruth: 'scanner_htf_protected_structure_map';
  timeframe: '4H' | '2H' | '1H' | '15M' | '5M';
  bias: 'BULL' | 'BEAR' | 'NEUTRAL' | 'CONFLICT' | 'UNKNOWN';
  currentBias: 'BULL' | 'BEAR' | 'RANGE' | 'UNKNOWN';
  biasChangeLine: number | null;
  biasChangeConfirmation: string | null;
  protectedStructure: number | null;
  confirmationLine: number | null;
  target: number | null;
  targetLabel: string | null;
  confidence: number | null;
  status: string;
  note: string;
}

export interface DeskHtfProtectedStructureMap {
  sourceOfTruth: 'scanner_htf_protected_structure_map';
  rows: DeskHtfProtectedStructureRow[];
  reliability: 'structural' | 'data_limited' | 'estimated' | 'unknown';
  summary: string;
  approvalBoundary: {
    changesTradeApprovals: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
  };
}

export interface PrimaryDeskPlay {
  sourceOfTruth: 'scanner_primary_desk_play';
  direction: DeskPlayDirection;
  title: string;
  summary: string;
  lineInSand: number | null;
  longAbove: number | null;
  shortBelow: number | null;
  targetReactionLevel: number | null;
  targetReactionLabel: string | null;
  targetReactionReason: string | null;
  levelTransition: DeskLevelTransitionMap | null;
  htfObjectiveLadder: DeskHtfObjectiveLadder;
  htfProtectedStructureMap: DeskHtfProtectedStructureMap;
  nextTrigger: string | null;
  invalidation: string | null;
  noChase: string;
  longBias: DeskPlayDirectionalBias;
  shortBias: DeskPlayDirectionalBias;
  htfConflict: boolean;
  countertrendWarning: string | null;
  discordEligible: boolean;
  approvalBoundary: {
    changesTradeApprovals: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
  };
  notes: string[];
}

export interface DeskState {
  sourceOfTruth: 'scanner_desk_state';
  marketMode: DeskStateMarketMode;
  activeCampaign: SetupCandidate['activeCampaign'] | null;
  bestLongPlan: ScannerCandidateLifecycleTraceItem | null;
  bestShortPlan: ScannerCandidateLifecycleTraceItem | null;
  selectedCandidate: ScannerCandidateLifecycleTraceItem | null;
  primaryDeskPlay: PrimaryDeskPlay;
  lineInSand: number | null;
  nextTrigger: string | null;
  invalidation: string | null;
  visibilityMode: ScannerVisibilityMode;
  discordAction: ScannerDiscordAction;
  suppressionReason: string | null;
  htfContextStatus: DeskStateHtfContextStatus;
  dataQualityStatus: DeskStateDataQualityStatus;
  canExecute: boolean;
  promotion: DeskStatePromotionPath;
  visibilityMetadata: ScannerVisibilityMetadata;
  candidateLifecycleTrace: ScannerCandidateLifecycleTrace;
  notes: string[];
}

export interface DeskStateReplayValidation {
  sourceOfTruth: 'scanner_desk_state_replay_validation';
  cycleCount: number;
  watchAppearedBeforePlan: boolean;
  promotionPathObserved: boolean;
  noChasePreserved: boolean;
  singleSourceOfTruthPresent: boolean;
  discordRagUiAligned: boolean;
  findings: string[];
  authority: {
    replayValidationApprovesTrade: false;
    replayValidationChangesRules: false;
    replayValidationChangesCanExecute: false;
  };
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
    weekday: 'short',
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
    weekday: value('weekday'),
  };
}

function isEtWeekend(date: Date): boolean {
  const weekday = etParts(date).weekday;
  return weekday === 'Sat' || weekday === 'Sun';
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
  const isWeekend = isEtWeekend(date);
  const allowsMarketMapping = !isWeekend && isMarketMappingWindowByEtMinutes(minutes);

  if (isWeekend) {
    return {
      session: 'outside',
      label: 'Market Closed - Weekend',
      quality: 'outside',
      enabled: false,
      allowsTradePlan: false,
      allowsDiscordAlert: false,
      allowsMarketMapping: false,
      allowsDeskPlan: false,
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
      allowsMarketMapping,
      allowsDeskPlan: allowsMarketMapping,
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
      allowsMarketMapping,
      allowsDeskPlan: allowsMarketMapping,
      nextWindowLabel: null,
    };
  }

  void afternoonEnabled;

  return {
    session: 'outside',
    label: 'Outside Approved Execution Window',
    quality: 'outside',
    enabled: false,
    allowsTradePlan: false,
    allowsDiscordAlert: false,
    allowsMarketMapping,
    allowsDeskPlan: allowsMarketMapping,
    nextWindowLabel:
      minutes < minutesFromClock(windows.morningExecution.startET)
        ? windows.morningExecution.label
        : minutes < minutesFromClock(windows.middayTrapReversal.startET)
          ? windows.middayTrapReversal.label
          : null,
  };
}

export function scannerContextLogLabel(window: ScannerWindowState): string {
  if (!window.allowsMarketMapping) return MARKET_MAPPING_OFF_HOURS_LABEL;
  return window.quality === 'observe_only' ? window.label : MARKET_MAPPING_LABEL;
}

export function scannerContextState(window: ScannerWindowState): ScannerState {
  if (window.allowsDeskPlan) return 'MapReady';
  return window.allowsMarketMapping ? 'MarketMapping' : 'NoData';
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
  timestampMode: BridgeTimestampMode = 'open',
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
  const timestampMode = args.timestampMode || 'open';
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
    activeModel: Boolean(candidate && (args.window ? args.window.allowsDeskPlan : true)),
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
    entry.setupType === SetupType.AfterLunchDriveFvgContinuation ||
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

function numericOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function candidateTargetReactionObjective(candidate: SetupCandidate): TargetObjective | null {
  const plan = candidate.targetObjectivePlan;
  if (!plan) return null;
  return (
    plan.nearestObstacleTarget ||
    plan.obstacleTarget1 ||
    plan.nearestLiquidityTarget ||
    plan.liquidityTarget1 ||
    plan.selectedT1 ||
    null
  );
}

function buildLevelTransitionMap(args: {
  targetReaction: TargetObjective | null;
  longAbove: number | null;
  shortBelow: number | null;
}): DeskLevelTransitionMap | null {
  const hasReaction = Boolean(args.targetReaction);
  const hasNextStructure = args.longAbove !== null || args.shortBelow !== null;
  if (!hasReaction && !hasNextStructure) return null;
  const nextLines = [
    args.longAbove !== null ? `LONG above ${args.longAbove.toFixed(2)}` : null,
    args.shortBelow !== null ? `SHORT below ${args.shortBelow.toFixed(2)}` : null,
  ].filter(Boolean).join(' / ');
  return {
    sourceOfTruth: 'scanner_level_transition_map',
    targetReactionLevel: args.targetReaction?.price ?? null,
    targetReactionLabel: args.targetReaction?.label ?? null,
    targetReactionReason: args.targetReaction?.reason ?? null,
    longAbove: args.longAbove,
    shortBelow: args.shortBelow,
    profitProtectionInstruction: args.targetReaction
      ? `Treat ${args.targetReaction.label} ${args.targetReaction.price.toFixed(2)} as the target/reaction decision area. Secure profits or reduce continuation assumptions there until completed 5M proof appears.`
      : 'No target/reaction level is mapped for this cycle; do not invent a profit-taking or reversal area.',
    targetManagementInstruction: args.targetReaction
      ? 'Management: take T1 seriously; cap expectation at T2 into HTF/session structure unless completed 5M acceptance clears it. Reversal risk is live.'
      : 'Management: app T1/T2 remain tactical only; no HTF/session reaction cap is mapped for this cycle.',
    nextStructureInstruction: nextLines
      ? `After a protected completed 5M market-structure shift, use ${nextLines} as the next line-in-the-sand map.`
      : 'No next 5M shift line is mapped yet; wait for protected structure before planning the opposite side.',
    approvalBoundary: {
      changesTradeApprovals: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
    },
  };
}

function objectivePriceKey(price: number): string {
  return price.toFixed(2);
}

function objectiveInstruction(kind: DeskHtfObjectiveKind, objective: TargetObjective | null): string {
  if (kind === 'reaction') return 'Reaction zone: take T1/T2 seriously and protect if 5M rejects.';
  if (kind === 'next_draw') return 'Next draw after app targets; runner only if completed 5M acceptance continues.';
  if (kind === 'runner') return 'Runner objective; trail only after T2 clears with completed 5M acceptance.';
  if (kind === 'extension') return 'Stretch objective; do not plan for it unless structure keeps delivering beyond the runner.';
  return objective?.reason || 'Scanner-owned target-management objective.';
}

function htfObjectiveFromTarget(kind: DeskHtfObjectiveKind, objective: TargetObjective | null): DeskHtfObjective | null {
  if (!objective || numericOrNull(objective.price) === null) return null;
  return {
    sourceOfTruth: 'scanner_htf_objective_ladder',
    kind,
    label: objective.label,
    price: objective.price,
    source: objective.source || 'scanner_reaction',
    rMultiple: numericOrNull(objective.rMultiple),
    instruction: objectiveInstruction(kind, objective),
  };
}

function htfObjectiveFromProtectedStructureRow(
  direction: Exclude<SetupCandidate['direction'], 'NO TRADE'>,
  row: DeskHtfProtectedStructureRow,
): TargetObjective | null {
  if (directionForCurrentHtfBias(row.currentBias) !== direction) return null;
  if (numericOrNull(row.target) === null) return null;
  return {
    label: row.targetLabel || `${row.timeframe} aligned bias target`,
    price: row.target,
    direction,
    source: 'ninjatrader',
    type: 'liquidity_pool',
    confidence: row.confidence !== null && row.confidence >= 70 ? 'High' : row.confidence !== null && row.confidence >= 50 ? 'Medium' : 'Low',
    score: row.confidence ?? 50,
    distancePoints: null,
    rMultiple: null,
    reason: `${row.timeframe} current bias is ${row.currentBias}; target supports the cleanest resolved timeframe bias.`,
  };
}

function firstDirectionalObjective(
  direction: 'LONG' | 'SHORT',
  base: number | null,
  objectives: Array<TargetObjective | null | undefined>,
): TargetObjective | null {
  for (const objective of objectives) {
    if (!objective) continue;
    if (base === null || (direction === 'LONG' ? objective.price > base + 0.01 : objective.price < base - 0.01)) {
      return objective;
    }
  }
  return null;
}

function buildHtfObjectiveLadder(args: {
  direction: DeskPlayDirection;
  candidate: SetupCandidate | null;
  primaryLifecycleItem?: ScannerCandidateLifecycleTraceItem | null;
  targetReaction: TargetObjective | null;
  htfProtectedStructureMap?: DeskHtfProtectedStructureMap | null;
}): DeskHtfObjectiveLadder {
  const candidateDirection = args.direction === 'LONG' || args.direction === 'SHORT'
    ? args.direction
    : args.candidate?.direction === 'LONG' || args.candidate?.direction === 'SHORT'
    ? args.candidate.direction
    : null;
  const plan = args.candidate?.direction === candidateDirection ? args.candidate?.targetObjectivePlan || null : null;
  const htfBiasTargets = candidateDirection
    ? (args.htfProtectedStructureMap?.rows || [])
        .map((row) => htfObjectiveFromProtectedStructureRow(candidateDirection, row))
        .filter((objective): objective is TargetObjective => Boolean(objective))
    : [];
  const appTarget1 = numericOrNull(args.primaryLifecycleItem?.target1) ??
    (args.candidate?.direction === candidateDirection ? numericOrNull(args.candidate?.target1) : null) ??
    numericOrNull(plan?.selectedT1?.price);
  const appTarget2 = numericOrNull(args.primaryLifecycleItem?.target2) ??
    (args.candidate?.direction === candidateDirection ? numericOrNull(args.candidate?.target2) : null) ??
    numericOrNull(plan?.selectedT2?.price);
  const reaction = htfObjectiveFromTarget('reaction', args.targetReaction);
  const nextDraw = candidateDirection
    ? htfObjectiveFromTarget('next_draw', firstDirectionalObjective(candidateDirection, appTarget2, [
        plan?.nearestLiquidityTarget,
        plan?.liquidityTarget1,
        plan?.liquidityTarget2,
        plan?.liquidityRunnerTarget,
        plan?.runnerTarget,
        ...htfBiasTargets,
      ]))
    : null;
  const runner = candidateDirection
    ? htfObjectiveFromTarget('runner', firstDirectionalObjective(candidateDirection, nextDraw?.price ?? appTarget2, [
        plan?.liquidityTarget2,
        plan?.liquidityRunnerTarget,
        plan?.runnerTarget,
        ...htfBiasTargets,
      ]))
    : null;
  const extension = candidateDirection
    ? htfObjectiveFromTarget('extension', firstDirectionalObjective(candidateDirection, runner?.price ?? nextDraw?.price ?? appTarget2, [
        plan?.liquidityRunnerTarget,
        plan?.runnerTarget,
        ...htfBiasTargets,
      ]))
    : null;
  const seen = new Set<string>();
  const objectives = [reaction, nextDraw, runner, extension].filter((objective): objective is DeskHtfObjective => {
    if (!objective) return false;
    const key = `${objective.kind}:${objectivePriceKey(objective.price)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const managementInstruction = objectives.length
    ? 'App T1/T2 remain tactical. Use the HTF ladder for management only: protect at reaction zones; hold runners only after completed 5M acceptance beyond T2.'
    : 'No HTF objective ladder is mapped this cycle. App T1/T2 remain the only visible tactical targets.';
  return {
    sourceOfTruth: 'scanner_htf_objective_ladder',
    direction: args.direction,
    appTarget1,
    appTarget2,
    reaction,
    nextDraw,
    runner,
    extension,
    objectives,
    managementInstruction,
    approvalBoundary: {
      changesTradeApprovals: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
    },
  };
}

function targetFromExternalLiquidityTarget(value: string | null | undefined): { price: number | null; label: string | null } {
  if (!value) return { price: null, label: null };
  return {
    price: priceFromText(value),
    label: value,
  };
}

function biasFromTimeframeDirection(
  direction: string | null | undefined,
  status: string | null | undefined,
): DeskHtfProtectedStructureRow['bias'] {
  if (status === 'conflicting') return 'CONFLICT';
  if (direction === 'bullish') return 'BULL';
  if (direction === 'bearish') return 'BEAR';
  if (direction === 'neutral') return 'NEUTRAL';
  return 'UNKNOWN';
}

function protectedStructureFromTimeframeState(state: NonNullable<SetupCandidate['htfLiquidityDrawState']>['timeframeStates'][number]): number | null {
  const explicit = numericOrNull(state.invalidationLevel);
  if (explicit !== null) return explicit;
  const text = (state.evidence || []).join(' ');
  const sweptOrReclaimed = text.match(/\b(?:at|level)\s+(\d{4,5}(?:\.\d{1,2})?)\b/i);
  return sweptOrReclaimed ? numericOrNull(Number(sweptOrReclaimed[1])) : null;
}

function confirmationLineFromTimeframeState(state: NonNullable<SetupCandidate['htfLiquidityDrawState']>['timeframeStates'][number]): number | null {
  const explicit = numericOrNull(state.confirmationLevel);
  if (explicit !== null) return explicit;
  const text = (state.evidence || []).join(' ');
  const swingBreak = text.match(/\b(?:above|below)\s+prior\s+5M\s+swing\s+(?:high|low)\s+(\d{4,5}(?:\.\d{1,2})?)\b/i);
  return swingBreak ? numericOrNull(Number(swingBreak[1])) : null;
}

function currentBiasFromProtectedStructure(args: {
  rowBias: DeskHtfProtectedStructureRow['bias'];
  protectedStructure: number | null;
  confirmationLine: number | null;
  currentPrice?: number | null;
}): Pick<DeskHtfProtectedStructureRow, 'currentBias' | 'biasChangeLine' | 'biasChangeConfirmation'> {
  const currentPrice = numericOrNull(args.currentPrice);
  const protectedStructure = numericOrNull(args.protectedStructure);
  const confirmationLine = numericOrNull(args.confirmationLine);
  const bullishChange = {
    currentBias: 'BEAR' as const,
    biasChangeLine: confirmationLine ?? protectedStructure,
    biasChangeConfirmation: 'completed close+hold above',
  };
  const bearishChange = {
    currentBias: 'BULL' as const,
    biasChangeLine: protectedStructure ?? confirmationLine,
    biasChangeConfirmation: 'completed close+hold below',
  };

  if (currentPrice === null) {
    return {
      currentBias: 'UNKNOWN',
      biasChangeLine: confirmationLine ?? protectedStructure,
      biasChangeConfirmation: 'current price unavailable',
    };
  }

  if (args.rowBias === 'BULL') {
    return protectedStructure !== null && currentPrice < protectedStructure
      ? {
          currentBias: 'BEAR',
          biasChangeLine: protectedStructure,
          biasChangeConfirmation: 'completed close+hold above',
        }
      : bearishChange;
  }
  if (args.rowBias === 'BEAR') {
    return protectedStructure !== null && currentPrice > protectedStructure ? bearishChange : bullishChange;
  }
  if (protectedStructure !== null && currentPrice <= protectedStructure) return bullishChange;
  if (confirmationLine !== null && currentPrice >= confirmationLine) return bearishChange;
  if (protectedStructure !== null && confirmationLine !== null) {
    return {
      currentBias: 'RANGE',
      biasChangeLine: confirmationLine,
      biasChangeConfirmation: 'BULL above / BEAR below on completed close+hold',
    };
  }
  return {
    currentBias: 'UNKNOWN',
    biasChangeLine: confirmationLine ?? protectedStructure,
    biasChangeConfirmation: 'protected and confirmation lines incomplete',
  };
}

function timeframeStructureNote(row: DeskHtfProtectedStructureRow): string {
  const protectedText = row.protectedStructure !== null ? `protected ${row.protectedStructure.toFixed(2)}` : 'protected level not mapped';
  const confirmText = row.confirmationLine !== null ? `confirm ${row.confirmationLine.toFixed(2)}` : 'confirmation line not mapped';
  const targetText = row.target !== null ? `target ${row.target.toFixed(2)}` : 'target not mapped';
  const currentBiasText = row.currentBias !== 'UNKNOWN'
    ? `current ${row.currentBias}; changes at ${row.biasChangeLine !== null ? row.biasChangeLine.toFixed(2) : 'N/A'} by ${row.biasChangeConfirmation || 'completed confirmation'}`
    : 'current bias not resolved';
  return `${currentBiasText}; ${protectedText}; ${confirmText}; ${targetText}`;
}

function buildHtfProtectedStructureMap(
  candidate: SetupCandidate | null,
  fallbackHtfState?: SetupCandidate['htfLiquidityDrawState'] | null,
  currentPrice?: number | null,
): DeskHtfProtectedStructureMap {
  const htfState = candidate?.htfLiquidityDrawState || fallbackHtfState || null;
  const timeframeStates = htfState?.timeframeStack?.length
    ? htfState.timeframeStack
    : htfState?.timeframeStates || [];
  const rows = timeframeStates.map((state): DeskHtfProtectedStructureRow => {
    const target = targetFromExternalLiquidityTarget(state.externalLiquidityTarget);
    const row: DeskHtfProtectedStructureRow = {
      sourceOfTruth: 'scanner_htf_protected_structure_map',
      timeframe: state.timeframe,
      bias: biasFromTimeframeDirection(state.direction, state.status),
      currentBias: 'UNKNOWN',
      biasChangeLine: null,
      biasChangeConfirmation: null,
      protectedStructure: protectedStructureFromTimeframeState(state),
      confirmationLine: confirmationLineFromTimeframeState(state),
      target: target.price,
      targetLabel: target.label,
      confidence: numericOrNull(state.confidence),
      status: state.lifecycleState || state.status || 'unknown',
      note: '',
    };
    const currentBias = currentBiasFromProtectedStructure({
      rowBias: row.bias,
      protectedStructure: row.protectedStructure,
      confirmationLine: row.confirmationLine,
      currentPrice,
    });
    return {
      ...row,
      ...currentBias,
      note: timeframeStructureNote({ ...row, ...currentBias }),
    };
  });
  const reliability = htfState?.classificationReliability || 'unknown';
  return {
    sourceOfTruth: 'scanner_htf_protected_structure_map',
    rows,
    reliability,
    summary: rows.length
      ? 'HTF protected structure rows are scanner-owned context only; 5M execution gates still control approval.'
      : 'No scanner-owned HTF protected structure map is available for this cycle.',
    approvalBoundary: {
      changesTradeApprovals: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
    },
  };
}

function candidateHasHtfConflict(candidate: SetupCandidate | null | undefined): boolean {
  if (!candidate) return false;
  const confirmedIntradayCampaign = candidateHasConfirmedIntradayMssCampaign(candidate);
  const text = [
    ...(candidate.missingEvidence || []),
    ...(
      confirmedIntradayCampaign
        ? (candidate.evidence || []).filter((item) => !/htf caution.*opposing completed|opposing completed.*reported for human review/i.test(item))
        : (candidate.evidence || [])
    ),
    candidate.blockReason,
    candidate.activeRuleset?.timeframeMss?.status,
    ...(candidate.activeRuleset?.timeframeMss?.blockers || []),
  ].filter(Boolean).join(' ');
  return /opposing.*htf|htf.*conflict|higher-timeframe.*not aligned|opposing completed.*mss|countertrend/i.test(text);
}

function textHasHtfCautionOnlyNoSupport(text: string): boolean {
  return /no completed (?:60m\/120m\/240m|htf).*mss support|htf is caution\/context only/i.test(text);
}

function candidateHasConfirmedIntradayMssCampaign(candidate: SetupCandidate | null | undefined): boolean {
  if (!candidate?.activeCampaign) return false;
  if (candidate.activeCampaign.primaryTrigger !== '15M_5M_MSS') return false;
  return candidate.activeCampaign.evidenceLayers.some((layer) =>
    layer.layer === '15M_5M_MSS_CAMPAIGN' &&
    layer.status === 'confirmed' &&
    layer.direction === candidate.direction
  );
}

function textHasConfirmedIntradayMssCampaign(text: string): boolean {
  return /15m.*5m.*mss|5m.*15m.*mss|aligned completed 15m and 5m|15m\/5m.*campaign/i.test(text);
}

function candidateHasHtfSupport(candidate: SetupCandidate | null | undefined): boolean {
  if (!candidate) return false;
  if (candidateHasConfirmedIntradayMssCampaign(candidate)) return true;
  const text = [
    ...(candidate.evidence || []),
    ...(candidate.missingEvidence || []),
    ...(candidate.activeRuleset?.timeframeMss?.evidence || []),
    ...(candidate.activeRuleset?.timeframeMss?.blockers || []),
    candidate.activeCampaign?.htfRelationship === 'caution' ? 'HTF is caution/context only.' : null,
    candidate.activeCampaign?.htfRelationship === 'support' ? 'active campaign HTF support' : null,
  ].filter(Boolean).join(' ');
  if (textHasHtfCautionOnlyNoSupport(text)) return false;
  if ((candidate.activeCampaign?.htfSupportTimeframes || []).length > 0) return true;
  return /htf mss support in campaign direction|active campaign htf support|active timeframe mss context aligned on|higher-timeframe bias aligned|higher-timeframe (?:structure|bias|mss).*supports|(?:15m|60m|120m|240m|1h|2h|4h).*htf support/i.test(text);
}

function lifecycleItemHasHtfConflict(item: ScannerCandidateLifecycleTraceItem | null | undefined): boolean {
  if (!item) return false;
  const text = [
    ...item.missingEvidence,
    ...item.missingLevels,
    item.blockReason,
    item.lineInSandReason,
  ].filter(Boolean).join(' ');
  return item.htfConflict || /opposing.*htf|htf.*conflict|higher-timeframe.*not aligned|opposing completed.*mss|countertrend/i.test(text);
}

function lifecycleItemHasHtfSupport(item: ScannerCandidateLifecycleTraceItem | null | undefined): boolean {
  if (!item) return false;
  const text = [
    ...item.missingEvidence,
    ...item.missingLevels,
    item.blockReason,
    item.lineInSandReason,
    item.nextTrigger,
    item.requiredTrigger,
    item.targetReactionReason,
  ].filter(Boolean).join(' ');
  if (item.htfSupported && textHasConfirmedIntradayMssCampaign(text)) return true;
  if (textHasHtfCautionOnlyNoSupport(text)) return false;
  if (item.htfSupported) return true;
  return /htf mss support in campaign direction|active campaign htf support|active timeframe mss context aligned on|higher-timeframe bias aligned|higher-timeframe (?:structure|bias|mss).*supports|(?:15m|60m|120m|240m|1h|2h|4h).*htf support/i.test(text);
}

function opposingHtfStructureLabel(direction: SetupCandidate['direction']): string {
  if (direction === 'SHORT') return 'bullish HTF/session structure';
  if (direction === 'LONG') return 'bearish HTF/session structure';
  return 'opposing HTF/session structure';
}

function htfReactionAreaLabelForLifecycleItem(item: ScannerCandidateLifecycleTraceItem): string {
  return typeof item.lineInSand === 'number' && Number.isFinite(item.lineInSand)
    ? `the HTF/session reaction line ${item.lineInSand.toFixed(2)}`
    : 'the HTF/session reaction area';
}

function htfManagementWarningForLifecycleItem(item: ScannerCandidateLifecycleTraceItem | null | undefined): string | null {
  if (!item || (item.direction !== 'LONG' && item.direction !== 'SHORT') || !lifecycleItemHasHtfConflict(item)) {
    return null;
  }
  return `${item.direction} is pressing into ${opposingHtfStructureLabel(item.direction)}. Treat T1/T2 as management, stop pressing at ${htfReactionAreaLabelForLifecycleItem(item)}, and wait for a protected completed 5M line-in-the-sand shift before continuing or reversing.`;
}

function htfSupportWarningForLifecycleItem(item: ScannerCandidateLifecycleTraceItem | null | undefined): string | null {
  if (!item || (item.direction !== 'LONG' && item.direction !== 'SHORT') || lifecycleItemHasHtfConflict(item) || lifecycleItemHasHtfSupport(item)) {
    return null;
  }
  return `${item.direction} evidence is review-only because completed HTF support is not confirmed. Keep both sides mapped; do not headline this as the active play until HTF support or completed 5M reversal proof changes the map.`;
}

function lifecycleItemScore(item: ScannerCandidateLifecycleTraceItem | null | undefined): number {
  if (!item) return Number.NEGATIVE_INFINITY;
  let score = item.rankScore ?? item.decisionQualityScore ?? item.modelConfidenceScore ?? item.priority;
  if (lifecycleItemHasHtfConflict(item)) score -= 12;
  if (!lifecycleItemHasHtfSupport(item)) score -= 8;
  if (/Outside active setup scan window/i.test(item.missingEvidence.join(' '))) score -= 6;
  if (/Minimum 2\.0R unavailable|TargetsUnavailable/i.test(item.missingEvidence.join(' '))) score -= 4;
  return score;
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
    const targetReaction = candidateTargetReactionObjective(candidate);
    const lineInSand = candidate.activeRuleset?.htfLineInSand?.lineInSand ?? null;
    const levelTransition = buildLevelTransitionMap({
      targetReaction,
      longAbove: candidate.direction === 'LONG' ? lineInSand : null,
      shortBelow: candidate.direction === 'SHORT' ? lineInSand : null,
    });
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
      requiredTrigger: candidate.requiredTrigger || null,
      entry: numericOrNull(candidate.entry),
      stop: numericOrNull(candidate.stop),
      target1: numericOrNull(candidate.target1),
      target2: numericOrNull(candidate.target2),
      riskPoints: numericOrNull(candidate.riskPoints),
      invalidation: candidate.invalidation || null,
      lineInSand,
      lineInSandReason: candidate.activeRuleset?.htfLineInSand?.lineReason ?? null,
      targetReactionLevel: targetReaction?.price ?? null,
      targetReactionLabel: targetReaction?.label ?? null,
      targetReactionReason: targetReaction?.reason ?? null,
      levelTransition,
      htfConflict: candidateHasHtfConflict(candidate),
      htfSupported: candidateHasHtfSupport(candidate),
      countertrend: candidateHasHtfConflict(candidate),
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

function htfContextStatusForDeskState(
  candidate: SetupCandidate | null,
  fallbackHtfState?: SetupCandidate['htfLiquidityDrawState'] | null,
): DeskStateHtfContextStatus {
  const htfState = candidate?.htfLiquidityDrawState || fallbackHtfState || null;
  if (!htfState && !candidate?.activeRuleset?.htfLineInSand) return 'not_applicable';
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

function promotionStageFromDeskState(args: {
  marketMode: DeskStateMarketMode;
  visibilityMode: ScannerVisibilityMode;
  canExecute: boolean;
}): DeskStatePromotionStage {
  if (args.canExecute && args.visibilityMode === 'POST_PLAN') return 'posted_plan';
  if (args.marketMode === 'market_mapping') return 'market_mapping';
  if (args.visibilityMode === 'POST_WATCH') return 'watch';
  if (args.visibilityMode === 'POST_CONDITIONAL') return 'conditional';
  if (args.visibilityMode === 'POST_REVIEW' || args.marketMode === 'human_review_ready') return 'human_review_ready';
  if (args.visibilityMode === 'NO_TRADE_WITH_REASON' || args.visibilityMode === 'HOLD_WITH_REASON' || args.visibilityMode === 'DATA_QUALITY_BLOCKER') return 'no_trade';
  return 'no_trade';
}

function nextPromotionStage(stage: DeskStatePromotionStage): DeskStatePromotionStage | null {
  if (stage === 'watch') return 'conditional';
  if (stage === 'conditional') return 'human_review_ready';
  if (stage === 'human_review_ready') return 'posted_plan';
  return null;
}

function buildDeskStatePromotionPath(args: {
  marketMode: DeskStateMarketMode;
  visibilityMetadata: ScannerVisibilityMetadata;
  candidateLifecycleTrace: ScannerCandidateLifecycleTrace;
  candidate: SetupCandidate | null;
  canExecute: boolean;
}): DeskStatePromotionPath {
  const currentStage = promotionStageFromDeskState({
    marketMode: args.marketMode,
    visibilityMode: args.visibilityMetadata.visibilityMode,
    canExecute: args.canExecute,
  });
  const nextStage = nextPromotionStage(currentStage);
  const missingProof = Array.from(new Set([
    ...args.candidateLifecycleTrace.missingProofSummary,
    ...(args.candidate?.missingEvidence || []),
    ...(args.candidate?.entry == null ? ['App-owned entry trigger not confirmed.'] : []),
    ...(args.candidate?.stop == null ? ['Protected 5M structure stop not confirmed.'] : []),
    ...(args.candidate?.target1 == null || args.candidate?.target2 == null ? ['App T1/T2 unavailable until entry and protected stop are proven.'] : []),
  ]));
  const promotionTrigger =
    args.visibilityMetadata.nextTrigger ||
    args.candidateLifecycleTrace.nextTrigger ||
    args.candidate?.requiredTrigger ||
    args.candidate?.nextAction ||
    null;

  return {
    sourceOfTruth: 'scanner_desk_state_promotion_path',
    currentStage,
    nextStage,
    promotionTrigger,
    missingProof,
    canPromoteNow: false,
    notes: [
      'Promotion path is descriptive only; the existing scanner, trade decision pipeline, and canExecute gates remain the only approval path.',
      'Watch-to-plan continuity requires completed 5M proof, protected structure stop, target room, invalidation, and normal app-owned gates.',
    ],
  };
}

function directionLabel(direction: DeskPlayDirection): string {
  if (direction === 'LONG') return 'LONG';
  if (direction === 'SHORT') return 'SHORT';
  return 'WAIT';
}

function priceFromText(text: string | null | undefined): number | null {
  if (!text) return null;
  const matches = [...text.matchAll(/\b(\d{4,5}(?:\.\d{1,2})?)\b/g)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value));
  return matches[0] ?? null;
}

function lineFromDirectionalTrigger(
  direction: SetupCandidate['direction'],
  text: string | null | undefined,
): number | null {
  if (!text || (direction !== 'LONG' && direction !== 'SHORT')) return null;
  const range = text.match(/\b(\d{4,5}(?:\.\d{1,2})?)\s*-\s*(\d{4,5}(?:\.\d{1,2})?)\b/);
  if (range) {
    const first = Number(range[1]);
    const second = Number(range[2]);
    if (Number.isFinite(first) && Number.isFinite(second)) {
      return direction === 'LONG' ? Math.max(first, second) : Math.min(first, second);
    }
  }
  return priceFromText(text);
}

function lineForLifecycleItem(item: ScannerCandidateLifecycleTraceItem | null): number | null {
  if (!item) return null;
  return item.lineInSand ??
    lineFromDirectionalTrigger(item.direction, item.nextTrigger) ??
    lineFromDirectionalTrigger(item.direction, item.requiredTrigger) ??
    item.entry ??
    null;
}

function confidenceLabel(score: number | null): DeskPlayLineConfidence['label'] {
  if (score === null) return 'unavailable';
  if (score >= 75) return 'high';
  if (score >= 55) return 'medium';
  return 'low';
}

function buildLineConfidence(item: ScannerCandidateLifecycleTraceItem | null): DeskPlayLineConfidence {
  const rawScore = item
    ? item.decisionQualityScore ??
      item.modelConfidenceScore ??
      item.rankScore ??
      null
    : null;
  const score = rawScore !== null ? Math.max(0, Math.min(100, Math.round(rawScore))) : null;
  const line = lineForLifecycleItem(item);
  const label = confidenceLabel(score);
  const reason = !item
    ? 'No scanner-owned candidate is present for this side.'
    : line === null
    ? 'Scanner has not mapped a line in the sand for this side.'
    : item.htfConflict || lifecycleItemHasHtfConflict(item)
    ? 'Structured evidence exists, but opposing HTF/MSS context keeps this line review-only.'
    : item.hasFullPlanLevels
    ? 'Line is backed by scanner-owned setup evidence and app-owned planning levels.'
    : 'Line is mapped from scanner-owned trigger/structure evidence, but full entry/stop/target proof is still incomplete.';
  return {
    sourceOfTruth: 'scanner_lifecycle_line_confidence',
    score,
    label,
    reason,
    approvalBoundary: {
      changesTradeApprovals: false,
      changesCanExecute: false,
    },
  };
}

function uniqueTimeframesFromText(text: string): string[] {
  const normalized = text.toUpperCase();
  const found: string[] = [];
  const add = (label: string, patterns: RegExp[]) => {
    if (patterns.some((pattern) => pattern.test(normalized)) && !found.includes(label)) found.push(label);
  };
  add('15M', [/\b15M\b/, /\b15\s*MIN\b/, /\bSESSION\b/, /\bLONDON\b/, /\bASIAN\b/, /\bRTH\b/, /\bETH\b/]);
  add('60M', [/\b60M\b/, /\b1H\b/, /\b60\s*MIN\b/]);
  add('120M', [/\b120M\b/, /\b2H\b/, /\b120\s*MIN\b/]);
  add('240M', [/\b240M\b/, /\b4H\b/, /\b240\s*MIN\b/]);
  return found;
}

function reactionStrengthFromTimeframes(timeframes: string[]): DeskPlayHtfReactionContext['strength'] {
  if (timeframes.includes('240M')) return 'major';
  if (timeframes.includes('120M') || timeframes.includes('60M')) return 'strong';
  if (timeframes.includes('15M')) return 'moderate';
  return 'unknown';
}

function buildHtfReactionContext(item: ScannerCandidateLifecycleTraceItem | null): DeskPlayHtfReactionContext {
  const evidenceText = item
    ? [
        item.lineInSandReason,
        item.targetReactionLabel,
        item.targetReactionReason,
        item.scenarioLabel,
        item.requiredTrigger,
        item.nextTrigger,
        item.blockReason,
        ...item.missingEvidence,
        ...item.missingLevels,
      ].filter(Boolean).join(' ')
    : '';
  const sourceTimeframes = uniqueTimeframesFromText(evidenceText);
  const strength = reactionStrengthFromTimeframes(sourceTimeframes);
  const reactionLevel = item?.targetReactionLevel ?? item?.lineInSand ?? null;
  const reactionLabel = item?.targetReactionLabel || item?.lineInSandReason || null;
  const reactionReason = item?.targetReactionReason || item?.lineInSandReason || null;
  const whyItMayReact = reactionReason ||
    (reactionLabel ? `${reactionLabel} is mapped from scanner-owned HTF/session structure.` : null) ||
    (sourceTimeframes.length ? `${sourceTimeframes.join('/')} structure is active in the scanner evidence.` : null) ||
    'No higher-timeframe reaction context is mapped for this side yet.';
  return {
    sourceOfTruth: 'scanner_htf_reaction_context',
    reactionLevel,
    reactionLabel,
    reactionReason,
    sourceTimeframes,
    strength: reactionLevel !== null ? strength : 'unknown',
    whyItMayReact,
    approvalBoundary: {
      changesTradeApprovals: false,
      changesCanExecute: false,
    },
  };
}

function directionForCurrentHtfBias(bias: DeskHtfProtectedStructureRow['currentBias']): Exclude<SetupCandidate['direction'], 'NO TRADE'> | null {
  if (bias === 'BULL') return 'LONG';
  if (bias === 'BEAR') return 'SHORT';
  return null;
}

function protectedStructureSupportDirection(map: DeskHtfProtectedStructureMap): Exclude<SetupCandidate['direction'], 'NO TRADE'> | null {
  if (map.reliability === 'data_limited') return null;
  const fifteenMinute = map.rows.find((row) => row.timeframe === '15M');
  const fiveMinute = map.rows.find((row) => row.timeframe === '5M');
  const fifteenDirection = fifteenMinute ? directionForCurrentHtfBias(fifteenMinute.currentBias) : null;
  const fiveDirection = fiveMinute ? directionForCurrentHtfBias(fiveMinute.currentBias) : null;
  return fifteenDirection && fifteenDirection === fiveDirection ? fifteenDirection : null;
}

function lifecycleItemHasProtectedStructureSupport(
  item: ScannerCandidateLifecycleTraceItem | null | undefined,
  map: DeskHtfProtectedStructureMap,
): boolean {
  if (!item || item.direction === 'NO TRADE') return false;
  return protectedStructureSupportDirection(map) === item.direction;
}

function biasStateForLifecycleItem(
  item: ScannerCandidateLifecycleTraceItem | null,
  primaryDirection: DeskPlayDirection,
  htfProtectedStructureMap: DeskHtfProtectedStructureMap,
): DeskPlayBiasState {
  if (!item) return 'not_present';
  if (item.executionStatus === ExecutionStatus.Blocked) return 'blocked';
  if ((item.countertrend || lifecycleItemHasHtfConflict(item)) && !lifecycleItemHasProtectedStructureSupport(item, htfProtectedStructureMap)) return 'countertrend_review';
  if (item.direction === primaryDirection) return 'primary';
  return 'secondary';
}

function biasReasonForLifecycleItem(item: ScannerCandidateLifecycleTraceItem | null, state: DeskPlayBiasState): string {
  if (!item) return 'No scanner-owned candidate for this side.';
  if (state === 'countertrend_review') return 'Structured evidence exists, but opposing HTF/MSS context makes this a review-only countertrend idea until fresh completed 5M proof confirms.';
  if (state === 'blocked') return item.blockReason || 'Candidate is blocked by existing scanner gates.';
  if (state === 'primary') return item.nextTrigger || item.requiredTrigger || item.scenarioLabel || 'This side is the primary scanner-owned desk play.';
  return item.nextTrigger || item.requiredTrigger || item.scenarioLabel || 'Secondary scenario remains visible for line-in-the-sand planning.';
}

function buildDirectionalBias(
  direction: 'LONG' | 'SHORT',
  item: ScannerCandidateLifecycleTraceItem | null,
  primaryDirection: DeskPlayDirection,
  htfProtectedStructureMap: DeskHtfProtectedStructureMap,
): DeskPlayDirectionalBias {
  const state = biasStateForLifecycleItem(item, primaryDirection, htfProtectedStructureMap);
  return {
    direction,
    state,
    candidateKey: item?.candidateKey || null,
    setupType: item?.setupType || null,
    scenarioLabel: item?.scenarioLabel || null,
    rankScore: item?.rankScore ?? null,
    decisionQualityScore: item?.decisionQualityScore ?? null,
    modelConfidenceScore: item?.modelConfidenceScore ?? null,
    lineInSand: lineForLifecycleItem(item),
    lineConfidence: buildLineConfidence(item),
    htfReactionContext: buildHtfReactionContext(item),
    nextTrigger: item?.nextTrigger || item?.requiredTrigger || null,
    invalidation: item?.invalidation || null,
    reason: biasReasonForLifecycleItem(item, state),
    blockers: item ? Array.from(new Set([
      item.blockReason,
      ...item.missingEvidence,
      ...item.missingLevels,
    ].filter((value): value is string => Boolean(value)))).slice(0, 8) : [],
  };
}

function lifecycleItemPrimaryEligible(
  item: ScannerCandidateLifecycleTraceItem | null,
  htfProtectedStructureMap: DeskHtfProtectedStructureMap,
): boolean {
  if (!item) return false;
  if (lifecycleItemHasProtectedStructureSupport(item, htfProtectedStructureMap)) return true;
  return lifecycleItemHasHtfSupport(item) && !lifecycleItemHasHtfConflict(item);
}

function selectPrimaryDeskPlayDirection(
  trace: ScannerCandidateLifecycleTrace,
  htfProtectedStructureMap: DeskHtfProtectedStructureMap,
): DeskPlayDirection {
  const long = trace.bestLongPlan;
  const short = trace.bestShortPlan;
  if (!long && !short) return 'WAIT';
  if (long && !short) return lifecycleItemPrimaryEligible(long, htfProtectedStructureMap) ? 'LONG' : 'WAIT';
  if (short && !long) return lifecycleItemPrimaryEligible(short, htfProtectedStructureMap) ? 'SHORT' : 'WAIT';
  const longPrimaryEligible = lifecycleItemPrimaryEligible(long, htfProtectedStructureMap);
  const shortPrimaryEligible = lifecycleItemPrimaryEligible(short, htfProtectedStructureMap);
  if (longPrimaryEligible && !shortPrimaryEligible) return 'LONG';
  if (shortPrimaryEligible && !longPrimaryEligible) return 'SHORT';
  if (!longPrimaryEligible && !shortPrimaryEligible) return 'WAIT';
  const longScore = lifecycleItemScore(long);
  const shortScore = lifecycleItemScore(short);
  return longScore >= shortScore ? 'LONG' : 'SHORT';
}

function buildPrimaryDeskPlay(args: {
  candidate: SetupCandidate | null;
  visibilityMetadata: ScannerVisibilityMetadata;
  candidateLifecycleTrace: ScannerCandidateLifecycleTrace;
  targetCascade?: TargetCascadeResult | null;
  htfLiquidityDrawState?: SetupCandidate['htfLiquidityDrawState'] | null;
  currentPrice?: number | null;
  canExecute: boolean;
}): PrimaryDeskPlay {
  const htfProtectedStructureMap = buildHtfProtectedStructureMap(args.candidate, args.htfLiquidityDrawState, args.currentPrice);
  const primaryDirection = selectPrimaryDeskPlayDirection(args.candidateLifecycleTrace, htfProtectedStructureMap);
  const longBias = buildDirectionalBias('LONG', args.candidateLifecycleTrace.bestLongPlan, primaryDirection, htfProtectedStructureMap);
  const shortBias = buildDirectionalBias('SHORT', args.candidateLifecycleTrace.bestShortPlan, primaryDirection, htfProtectedStructureMap);
  const primaryBias = primaryDirection === 'LONG' ? longBias : primaryDirection === 'SHORT' ? shortBias : null;
  const oppositeBias = primaryDirection === 'LONG' ? shortBias : primaryDirection === 'SHORT' ? longBias : null;
  const primaryLifecycleItem = primaryDirection === 'LONG'
    ? args.candidateLifecycleTrace.bestLongPlan
    : primaryDirection === 'SHORT'
    ? args.candidateLifecycleTrace.bestShortPlan
    : null;
  const oppositeLifecycleItem = primaryDirection === 'LONG'
    ? args.candidateLifecycleTrace.bestShortPlan
    : primaryDirection === 'SHORT'
    ? args.candidateLifecycleTrace.bestLongPlan
    : null;
  const selectedLifecycleItem = args.candidateLifecycleTrace.selectedCandidate;
  const deskMapLifecycleItem = primaryLifecycleItem ||
    selectedLifecycleItem ||
    args.candidateLifecycleTrace.highestRankedCandidate;
  const selectedLine = primaryBias?.lineInSand ??
    selectedLifecycleItem?.lineInSand ??
    args.candidate?.activeRuleset?.htfLineInSand?.lineInSand ??
    null;
  const htfConflict = lifecycleItemHasHtfConflict(args.candidateLifecycleTrace.bestLongPlan) ||
    lifecycleItemHasHtfConflict(args.candidateLifecycleTrace.bestShortPlan);
  const countertrendWarning = htfManagementWarningForLifecycleItem(primaryLifecycleItem) ||
    htfManagementWarningForLifecycleItem(selectedLifecycleItem) ||
    htfSupportWarningForLifecycleItem(selectedLifecycleItem) ||
    htfManagementWarningForLifecycleItem(oppositeLifecycleItem) ||
    (oppositeBias?.state === 'countertrend_review'
    ? `${oppositeBias.direction} evidence is counter-HTF/review-only until completed 5M confirmation proves the reversal path.`
    : null);
  const title = primaryDirection === 'WAIT'
    ? 'WAIT - desk play not confirmed'
    : `${directionLabel(primaryDirection)} desk play`;
  const summary = primaryBias
    ? `${directionLabel(primaryDirection)} remains primary while its line/trigger holds. Opposite side stays visible as ${oppositeBias?.state || 'not_present'}.`
    : selectedLifecycleItem?.direction && !lifecycleItemHasHtfSupport(selectedLifecycleItem)
    ? `No HTF-supported directional play is confirmed. ${selectedLifecycleItem.direction} evidence stays review-only until completed HTF support or protected 5M reversal proof changes the map.`
    : countertrendWarning && selectedLifecycleItem?.direction
    ? `No HTF-supported directional play is confirmed. ${selectedLifecycleItem.direction} evidence is review-only against opposing HTF/session structure until protected 5M proof changes the map.`
    : 'No HTF-supported directional play is confirmed from scanner-owned lifecycle state.';
  const targetReactionLevel = deskMapLifecycleItem && deskMapLifecycleItem.direction !== 'NO TRADE'
    ? deskMapLifecycleItem.targetReactionLevel ??
      args.targetCascade?.activeTarget?.price ??
      null
    : null;
  const targetReactionLabel = deskMapLifecycleItem && deskMapLifecycleItem.direction !== 'NO TRADE'
    ? deskMapLifecycleItem.targetReactionLabel ??
      args.targetCascade?.activeTarget?.label ??
      null
    : null;
  const targetReactionReason = deskMapLifecycleItem && deskMapLifecycleItem.direction !== 'NO TRADE'
    ? deskMapLifecycleItem.targetReactionReason ??
      args.targetCascade?.activeTarget?.reason ??
      args.targetCascade?.reason ??
      null
    : null;
  const targetReaction = targetReactionLevel !== null
    ? {
        price: targetReactionLevel,
        label: targetReactionLabel || 'HTF/session reaction level',
        reason: targetReactionReason || 'HTF/session target/reaction level from scanner-owned target context.',
      } as TargetObjective
    : null;
  const levelTransition = buildLevelTransitionMap({
    targetReaction,
    longAbove: longBias.lineInSand,
    shortBelow: shortBias.lineInSand,
  });
  const htfObjectiveLadder = buildHtfObjectiveLadder({
    direction: primaryDirection,
    candidate: args.candidate,
    primaryLifecycleItem,
    targetReaction,
    htfProtectedStructureMap,
  });
  const nextTrigger = primaryBias?.nextTrigger ||
    args.visibilityMetadata.nextTrigger ||
    args.candidateLifecycleTrace.nextTrigger ||
    null;
  const invalidation = primaryBias?.invalidation || args.candidate?.invalidation || null;
  const waitWithStructuredEvidence = primaryDirection === 'WAIT' && Boolean(selectedLifecycleItem);
  const discordEligible = Boolean(
    !args.canExecute &&
    (
      (
        primaryBias &&
        primaryDirection !== 'WAIT' &&
        (primaryBias.nextTrigger || primaryBias.lineInSand || primaryBias.reason)
      ) ||
      waitWithStructuredEvidence
    )
  );

  return {
    sourceOfTruth: 'scanner_primary_desk_play',
    direction: primaryDirection,
    title,
    summary,
    lineInSand: selectedLine,
    longAbove: longBias.lineInSand,
    shortBelow: shortBias.lineInSand,
    targetReactionLevel,
    targetReactionLabel,
    targetReactionReason,
    levelTransition,
    htfObjectiveLadder,
    htfProtectedStructureMap,
    nextTrigger,
    invalidation,
    noChase: 'No chase. Wait for completed 5M proof, retest/hold, protected structure, and normal app-owned gates.',
    longBias,
    shortBias,
    htfConflict,
    countertrendWarning,
    discordEligible,
    approvalBoundary: {
      changesTradeApprovals: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
    },
    notes: [
      'Primary Desk Play is scanner-owned visibility metadata only.',
      'It reports long and short bias without selecting, approving, suppressing, or reranking executable trade candidates.',
    ],
  };
}

export function buildDeskState(args: {
  state: ScannerState;
  candidate?: SetupCandidate | null;
  visibilityMetadata: ScannerVisibilityMetadata;
  candidateLifecycleTrace: ScannerCandidateLifecycleTrace;
  targetCascade?: TargetCascadeResult | null;
  htfLiquidityDrawState?: SetupCandidate['htfLiquidityDrawState'] | null;
  currentPrice?: number | null;
  canExecute?: boolean;
}): DeskState {
  const candidate = args.candidate || null;
  const marketMode = marketModeFromDeskVisibility({
    state: args.state,
    visibilityMode: args.visibilityMetadata.visibilityMode,
  });
  const promotion = buildDeskStatePromotionPath({
    marketMode,
    visibilityMetadata: args.visibilityMetadata,
    candidateLifecycleTrace: args.candidateLifecycleTrace,
    candidate,
    canExecute: Boolean(args.canExecute),
  });
  const primaryDeskPlay = buildPrimaryDeskPlay({
    candidate,
    visibilityMetadata: args.visibilityMetadata,
    candidateLifecycleTrace: args.candidateLifecycleTrace,
    targetCascade: args.targetCascade,
    htfLiquidityDrawState: args.htfLiquidityDrawState,
    currentPrice: args.currentPrice,
    canExecute: Boolean(args.canExecute),
  });
  return {
    sourceOfTruth: 'scanner_desk_state',
    marketMode,
    activeCampaign: candidate?.activeCampaign || null,
    bestLongPlan: args.candidateLifecycleTrace.bestLongPlan,
    bestShortPlan: args.candidateLifecycleTrace.bestShortPlan,
    selectedCandidate: args.candidateLifecycleTrace.selectedCandidate,
    primaryDeskPlay,
    lineInSand: candidate?.activeRuleset?.htfLineInSand?.lineInSand ?? primaryDeskPlay.lineInSand,
    nextTrigger: args.visibilityMetadata.nextTrigger || primaryDeskPlay.nextTrigger || args.candidateLifecycleTrace.nextTrigger,
    invalidation: candidate?.invalidation || primaryDeskPlay.invalidation,
    visibilityMode: args.visibilityMetadata.visibilityMode,
    discordAction: args.visibilityMetadata.discordAction,
    suppressionReason: args.visibilityMetadata.suppressionReason,
    htfContextStatus: htfContextStatusForDeskState(candidate, args.htfLiquidityDrawState),
    dataQualityStatus: dataQualityStatusForDeskState({
      visibilityMetadata: args.visibilityMetadata,
      candidateLifecycleTrace: args.candidateLifecycleTrace,
    }),
    canExecute: Boolean(args.canExecute),
    promotion,
    visibilityMetadata: args.visibilityMetadata,
    candidateLifecycleTrace: args.candidateLifecycleTrace,
    notes: [
      'DeskState is the scanner-owned visibility snapshot for Discord, RAG, and UI consumers.',
      'DeskState does not change trade approvals, entry, stop, target, risk, model definitions, or canExecute.',
    ],
  };
}

export function validateDeskStateReplayPath(deskStates: DeskState[]): DeskStateReplayValidation {
  const states = [...deskStates];
  const watchIndex = states.findIndex((state) => state.promotion.currentStage === 'watch' || state.visibilityMode === 'POST_WATCH');
  const planIndex = states.findIndex((state) =>
    state.promotion.currentStage === 'conditional' ||
    state.promotion.currentStage === 'human_review_ready' ||
    state.promotion.currentStage === 'posted_plan' ||
    state.visibilityMode === 'POST_CONDITIONAL' ||
    state.visibilityMode === 'POST_REVIEW' ||
    state.visibilityMode === 'POST_PLAN'
  );
  const watchAppearedBeforePlan = watchIndex >= 0 && planIndex >= 0 && watchIndex < planIndex;
  const promotionPathObserved = states.some((state) => state.promotion.currentStage === 'watch' && state.promotion.nextStage === 'conditional') &&
    states.some((state) => state.promotion.currentStage === 'conditional' || state.promotion.currentStage === 'human_review_ready' || state.promotion.currentStage === 'posted_plan');
  const hasDeskStateCycles = states.length > 0;
  const noChasePreserved = hasDeskStateCycles && states.every((state) => {
    const text = [
      state.nextTrigger,
      state.promotion.promotionTrigger,
      ...state.promotion.missingProof,
      ...state.promotion.notes,
      ...state.notes,
    ].filter(Boolean).join(' ');
    return state.canExecute || /no chase|completed 5m|protected/i.test(text);
  });
  const singleSourceOfTruthPresent = hasDeskStateCycles && states.every((state) =>
    state.sourceOfTruth === 'scanner_desk_state' &&
    state.visibilityMetadata?.sourceOfTruth === 'scanner_desk_state_visibility_metadata' &&
    state.candidateLifecycleTrace?.sourceOfTruth === 'scanner_candidate_lifecycle_trace' &&
    state.promotion?.sourceOfTruth === 'scanner_desk_state_promotion_path'
  );
  const discordRagUiAligned = hasDeskStateCycles && states.every((state) =>
    state.visibilityMode === state.visibilityMetadata.visibilityMode &&
    state.discordAction === state.visibilityMetadata.discordAction &&
    state.canExecute === state.visibilityMetadata.authority.canExecute
  );
  const findings = [
    watchAppearedBeforePlan
      ? 'Watch state appeared before a plan/review state.'
      : 'Replay did not observe a watch state before plan/review state.',
    promotionPathObserved
      ? 'Watch-to-plan promotion path was observable in DeskState snapshots.'
      : 'Replay did not observe a continuous watch-to-plan promotion path.',
    noChasePreserved
      ? 'No-chase/completed-5M/protected-structure language was preserved in non-executable states.'
      : 'At least one non-executable DeskState lacked no-chase, completed-5M, or protected-structure language.',
    singleSourceOfTruthPresent
      ? 'DeskState, visibility metadata, lifecycle trace, and promotion path all carried scanner-owned source-of-truth markers.'
      : 'One or more DeskState snapshots were missing scanner-owned source-of-truth markers.',
    discordRagUiAligned
      ? 'DeskState mirrors visibility mode, Discord action, and canExecute for downstream consumers.'
      : 'DeskState and visibility metadata diverged on visibility mode, Discord action, or canExecute.',
  ];

  return {
    sourceOfTruth: 'scanner_desk_state_replay_validation',
    cycleCount: states.length,
    watchAppearedBeforePlan,
    promotionPathObserved,
    noChasePreserved,
    singleSourceOfTruthPresent,
    discordRagUiAligned,
    findings,
    authority: {
      replayValidationApprovesTrade: false,
      replayValidationChangesRules: false,
      replayValidationChangesCanExecute: false,
    },
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
  const sessionWeight = window.session === 'morning' || window.session === 'premarket'
    ? SESSION_TIME_WEIGHTS.morning
    : window.session === 'lunch'
      ? SESSION_TIME_WEIGHTS.lunch
      : window.session === 'afternoon'
        ? SESSION_TIME_WEIGHTS.afternoon
        : window.allowsDeskPlan
          ? SESSION_TIME_WEIGHTS.lunch
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

  if (!window.allowsDeskPlan || sessionWeight === 0) {
    const hardBlocker = 'outside active Quant Desk scanner window';
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
        note: 'The scanner is outside the 9:15 AM-4:00 PM ET desk-plan window.',
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
  if (args.state === 'Watching') {
    return args.candidate && args.confidence >= thresholds.conditional
      ? { shouldSend: true, reason: 'Scanner watch qualified for Discord: structured evidence is forming. Watch only; no execution approval.' }
      : { shouldSend: false, reason: 'Watching is logged locally until structured evidence reaches watch alert quality.' };
  }
  if (args.state === 'MapReady' || args.state === 'MarketMapping' || args.state === 'NoData') {
    return { shouldSend: false, reason: `${args.state} is logged locally but not sent to Discord by default.` };
  }
  if (args.state === 'TriggerPending') {
    return args.candidate && args.confidence >= thresholds.conditional
      ? { shouldSend: true, reason: 'TriggerPending watch qualified for Discord: completed 5M proof is still pending. Watch only; no execution approval.' }
      : { shouldSend: false, reason: 'TriggerPending is logged locally as developing context until watch alert quality is met.' };
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
