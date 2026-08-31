import { TRADE_RULES } from '../config/tradeRules';
import {
  CME_EQUITY_INDEX_REOPEN_MINUTES_ET,
  CONTINUOUS_HIGH_CONFIDENCE_REVIEW_WINDOW,
  isCmeEquityIndexMarketClosedEt,
  isContinuousHighConfidenceReviewWindowByEtMinutes,
  isMarketMappingWindowByEtMinutes,
} from '../config/timeWindows';
import { SETUP_REGISTRY, type ParentModelFamily, type SetupRegistryEntry, type SetupRole, type SetupSession } from '../config/setupRegistry';
import { ChartContext, ExecutionStatus, FvgZoneFact, NoTradeReason, SetupCandidate, SetupType, TacticalZoneBounds, TargetObjective, TimeframeFactSet, TradeDecisionStatus } from '../types';
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
export type ScannerSession = 'premarket' | 'morning' | 'lunch' | 'evening' | 'afternoon' | 'outside';
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
export const CONTINUOUS_REVIEW_MONITOR_LABEL = CONTINUOUS_HIGH_CONFIDENCE_REVIEW_WINDOW.label;

export const MARKET_MAPPING_COVERAGE = [
  'ETH high/low',
  'Asian high/low',
  'London high/low',
  'NY premarket high/low',
  'prior day/week/month levels',
  '15M / 60M / 240M liquidity',
  'target cascade',
] as const;

const HIGH_QUALITY_CONDITIONAL_REVIEW_MIN_SCORE = 85;

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
  tacticalZone: TacticalZoneBounds | null;
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

export type DeskStatePromotionReadiness =
  | 'market_mapping_only'
  | 'watch_waiting_for_completed_5m'
  | 'conditional_waiting_for_review_proof'
  | 'human_review_ready_waiting_for_existing_plan_gate'
  | 'posted_plan_existing_gate_only'
  | 'blocked_or_no_trade';

export interface DeskStatePromotionPath {
  sourceOfTruth: 'scanner_desk_state_promotion_path';
  currentStage: DeskStatePromotionStage;
  nextStage: DeskStatePromotionStage | null;
  promotionReadiness: DeskStatePromotionReadiness;
  promotionTrigger: string | null;
  requiredProof: string[];
  missingProof: string[];
  blockedBy: string[];
  canPromoteNow: false;
  approvalBoundary: {
    changesTradeApprovals: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRiskRules: false;
    changesBridgeBehavior: false;
  };
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

export interface DeskPlayApprovedModelFit {
  sourceOfTruth: 'scanner_protected_structure_model_fit';
  setupType: SetupType | null;
  modelName: string | null;
  parentModelFamily: ParentModelFamily | null;
  fitScore: number;
  status: 'best_fit' | 'candidate_missing' | 'not_aligned' | 'data_limited';
  reason: string;
  missingProof: string[];
  approvalBoundary: {
    changesTradeApprovals: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    createsNewModel: false;
  };
}

export interface DeskPlayExecutableConsideration {
  sourceOfTruth: 'scanner_executable_consideration_gate_metadata';
  direction: 'LONG' | 'SHORT';
  status: 'ready_for_existing_can_execute_gate' | 'review_only_missing_proof' | 'not_aligned' | 'data_limited';
  selectedRegisteredModel: SetupType | null;
  /**
   * @deprecated Use selectedRegisteredModel. Kept for stored audit compatibility.
   */
  selectedApprovedModel: SetupType | null;
  canExecuteNow: false;
  gateSummary: string;
  missingGates: string[];
  approvalBoundary: {
    changesTradeApprovals: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRiskRules: false;
  };
}

export interface DeskPlayTradeReadiness {
  sourceOfTruth: 'scanner_trade_readiness_routing';
  direction: 'LONG' | 'SHORT';
  status:
    | 'execution_candidate'
    | 'wait_for_pullback_or_new_5m_structure'
    | 'missed_no_chase'
    | 'review_only_missing_proof'
    | 'not_aligned'
    | 'data_limited'
    | 'blocked';
  label: string;
  action: string;
  reason: string;
  missingProof: string[];
  approvalBoundary: {
    changesTradeApprovals: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRiskRules: false;
    createsNewModel: false;
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
  modelFit: DeskPlayApprovedModelFit;
  executableConsideration: DeskPlayExecutableConsideration;
  tradeReadiness: DeskPlayTradeReadiness;
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

export type DeskFvgDecisionZoneState =
  | 'watch'
  | 'holding'
  | 'accepted_through'
  | 'retest_required'
  | 'unknown';

export interface DeskFvgDecisionZone {
  sourceOfTruth: 'scanner_htf_fvg_decision_zone';
  direction: Exclude<SetupCandidate['direction'], 'NO TRADE'>;
  lineInSand: number;
  zoneLabel: string;
  zoneSource: 'active_ruleset_htf_line_in_sand';
  sourceTimeframe: '15M' | '60M' | '120M' | '240M' | 'unknown';
  state: DeskFvgDecisionZoneState;
  whyItMatters: string;
  holdCondition: string;
  foldCondition: string;
  managementInstruction: string;
  noChase: string;
  approvalBoundary: {
    changesTradeApprovals: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
  };
}

export interface DeskHtfFvgParentZone {
  sourceOfTruth: 'scanner_htf_fvg_parent_zone';
  direction: Exclude<SetupCandidate['direction'], 'NO TRADE'>;
  timeframe: '15M' | '60M' | '120M' | '240M';
  lower: number;
  upper: number;
  midpoint: number | null;
  label: string;
  state: DeskActiveTacticalZoneState;
  evidence: string;
}

export interface DeskHtfFvgChildExecutionZone {
  sourceOfTruth: 'scanner_htf_fvg_child_execution_zone';
  direction: Exclude<SetupCandidate['direction'], 'NO TRADE'>;
  timeframe: '5M';
  source: 'native_5m_fvg' | 'parent_htf_zone_with_5m_trigger';
  lower: number | null;
  upper: number | null;
  anchorLine: number | null;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  triggerNeeded: string;
}

export interface DeskHtfFvgCascade {
  sourceOfTruth: 'scanner_htf_fvg_cascade_parent_zone_routing';
  direction: Exclude<SetupCandidate['direction'], 'NO TRADE'>;
  parentZone: DeskHtfFvgParentZone | null;
  childExecutionZone: DeskHtfFvgChildExecutionZone | null;
  routingSummary: string;
  standDown: string;
  approvalBoundary: {
    changesTradeApprovals: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRiskRules: false;
    createsNewModel: false;
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

export interface DeskTrendConfirmation {
  sourceOfTruth: 'scanner_protected_structure_trend_confirmation';
  direction: DeskPlayDirection;
  status: 'aligned' | 'not_aligned' | 'data_limited' | 'unavailable';
  supportingTimeframes: Array<'15M' | '5M'>;
  lineInSand: number | null;
  confirmation: string;
  summary: string;
  approvalBoundary: {
    changesTradeApprovals: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
  };
}

export interface DeskActiveTacticalLine {
  sourceOfTruth: 'scanner_active_tactical_line';
  direction: DeskPlayDirection;
  originalLine: number | null;
  activeLine: number | null;
  migrated: boolean;
  supportingTimeframes: Array<'15M' | '5M'>;
  reason: string;
  nextTrigger: string;
  standDown: string;
  approvalBoundary: {
    changesTradeApprovals: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
  };
}

export type DeskActiveTacticalZoneState =
  | 'waiting_retest'
  | 'in_zone'
  | 'holding'
  | 'accepted_through'
  | 'moved_away'
  | 'unknown';

export interface DeskActiveTacticalZone {
  sourceOfTruth: 'scanner_active_tactical_zone';
  direction: DeskPlayDirection;
  lower: number | null;
  upper: number | null;
  anchorLine: number | null;
  migratedFromLine: number | null;
  migrated: boolean;
  zoneLabel: string;
  sourceTimeframe: '5M' | '15M' | '60M' | '120M' | '240M' | 'unknown';
  state: DeskActiveTacticalZoneState;
  reason: string;
  nextTrigger: string;
  standDown: string;
  noChase: string;
  approvalBoundary: {
    changesTradeApprovals: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
  };
}

export type DeskRetainedBossZoneState = 'alive' | 'defended' | 'invalidated' | 'unknown';
export type DeskFinalBossMssZoneState =
  | 'active_control'
  | 'defended'
  | 'pierced'
  | 'reclaimed'
  | 'flipped_reaction'
  | 'expired';
export type DeskRetainedBossZoneRole = 'final_boss_zone' | 'active_mss_protected_boss_zone' | 'final_boss_mss_zone';

export interface DeskRetainedBossZone {
  sourceOfTruth: 'scanner_retained_boss_zone_ledger';
  direction: Exclude<SetupCandidate['direction'], 'NO TRADE'>;
  role: DeskRetainedBossZoneRole;
  lower: number;
  upper: number;
  midpoint: number;
  lineInSand: number;
  sourceTimeframe: '15M';
  formedAt: string | null;
  formedCandleIndex: number | null;
  confidence: FvgZoneFact['confidence'];
  state: DeskRetainedBossZoneState;
  stateReason: string;
  use: string;
  holdCondition: string;
  invalidation: string;
  approvalBoundary: {
    changesTradeApprovals: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
  };
}

export interface DeskFinalBossMssZone {
  sourceOfTruth: 'scanner_final_boss_mss_zone_lifecycle';
  direction: Exclude<SetupCandidate['direction'], 'NO TRADE'>;
  role: 'final_boss_mss_zone';
  lower: number;
  upper: number;
  midpoint: number;
  mssLine: number;
  lineInSand: number;
  sourceTimeframe: '15M';
  formedAt: string | null;
  formedCandleIndex: number | null;
  mssBreakAt: string | null;
  mssBreakCandleIndex: number | null;
  state: DeskFinalBossMssZoneState;
  stateReason: string;
  ageTradingDays: number | null;
  expiresAfterTradingDays: 3;
  flipDirection: Exclude<SetupCandidate['direction'], 'NO TRADE'> | null;
  use: string;
  invalidation: string;
  approvalBoundary: {
    changesTradeApprovals: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
  };
}

export interface DeskRetainedBossZoneLedger {
  sourceOfTruth: 'scanner_retained_boss_zone_ledger';
  bullBoss: DeskRetainedBossZone | null;
  bearBoss: DeskRetainedBossZone | null;
  activeMssProtectedBossZone: DeskRetainedBossZone | null;
  finalBossMssZones: {
    bull: DeskFinalBossMssZone[];
    bear: DeskFinalBossMssZone[];
    primaryBull: DeskFinalBossMssZone | null;
    primaryBear: DeskFinalBossMssZone | null;
  };
  zones: DeskRetainedBossZone[];
  summary: string;
  approvalBoundary: {
    changesTradeApprovals: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    createsNewModel: false;
  };
}

export interface PrimaryDeskPlay {
  sourceOfTruth: 'scanner_primary_desk_play';
  direction: DeskPlayDirection;
  trendConfirmation: DeskTrendConfirmation;
  activeTacticalLine: DeskActiveTacticalLine;
  activeTacticalZone?: DeskActiveTacticalZone | null;
  modelRouting: {
    sourceOfTruth: 'scanner_protected_structure_model_routing';
    primaryDirection: DeskPlayDirection;
    bestActiveModel: SetupType | null;
    bestActiveModelName: string | null;
    /**
     * @deprecated Use bestActiveModel. Kept for stored audit compatibility.
     */
    bestApprovedModel: SetupType | null;
    /**
     * @deprecated Use bestActiveModelName. Kept for stored audit compatibility.
     */
    bestApprovedModelName: string | null;
    longModelFit: DeskPlayApprovedModelFit;
    shortModelFit: DeskPlayApprovedModelFit;
    executableConsideration: DeskPlayExecutableConsideration | null;
    routingSummary: string;
    approvalBoundary: {
      changesTradeApprovals: false;
      changesCanExecute: false;
      changesEntryStopTargets: false;
      createsNewModel: false;
    };
  };
  title: string;
  summary: string;
  lineInSand: number | null;
  longAbove: number | null;
  shortBelow: number | null;
  targetReactionLevel: number | null;
  targetReactionLabel: string | null;
  targetReactionReason: string | null;
  levelTransition: DeskLevelTransitionMap | null;
  fvgDecisionZone?: DeskFvgDecisionZone | null;
  retainedBossZones?: DeskRetainedBossZoneLedger;
  activeMssProtectedBossZone?: DeskRetainedBossZone | null;
  htfFvgCascade?: DeskHtfFvgCascade | null;
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
  watchToPlanPromotionProofed: boolean;
  canExecuteBoundaryPreserved: boolean;
  noChasePreserved: boolean;
  singleSourceOfTruthPresent: boolean;
  discordRagUiAligned: boolean;
  promotionBoundary: {
    changesTradeApprovals: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRiskRules: false;
    changesBridgeBehavior: false;
  };
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

function isCmeMarketClosed(date: Date, minutes = etClockMinutes(date)): boolean {
  const weekday = etParts(date).weekday;
  return isCmeEquityIndexMarketClosedEt(weekday, minutes);
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
  const isMarketClosed = isCmeMarketClosed(date, minutes);
  const allowsReviewMonitor = !isMarketClosed && isContinuousHighConfidenceReviewWindowByEtMinutes(minutes);
  const allowsMarketMapping = !isMarketClosed && (isMarketMappingWindowByEtMinutes(minutes) || allowsReviewMonitor);

  if (isMarketClosed) {
    const parts = etParts(date);
    const isDailyMaintenance = parts.weekday !== 'Sat' && parts.weekday !== 'Sun' && minutes >= 17 * 60 && minutes < 18 * 60;
    return {
      session: 'outside',
      label: isDailyMaintenance ? 'Market Closed - CME Maintenance' : 'Market Closed - Weekend',
      quality: 'outside',
      enabled: false,
      allowsTradePlan: false,
      allowsDiscordAlert: false,
      allowsMarketMapping: false,
      allowsDeskPlan: false,
      nextWindowLabel:
        parts.weekday === 'Sun' && minutes < CME_EQUITY_INDEX_REOPEN_MINUTES_ET
          ? CONTINUOUS_REVIEW_MONITOR_LABEL
          : isDailyMaintenance
            ? CONTINUOUS_REVIEW_MONITOR_LABEL
            : null,
    };
  }

  if (isBetween(minutes, windows.morningExecution.startET, windows.morningExecution.endET)) {
    return {
      session: 'morning',
      label: CONTINUOUS_REVIEW_MONITOR_LABEL,
      quality: 'approved',
      enabled: windows.morningExecution.enabled,
      allowsTradePlan: windows.morningExecution.enabled,
      allowsDiscordAlert: windows.morningExecution.enabled,
      allowsMarketMapping,
      allowsDeskPlan: allowsMarketMapping,
      nextWindowLabel: null,
    };
  }

  if (isBetween(minutes, windows.middayTrapReversal.startET, windows.middayTrapReversal.endET)) {
    return {
      session: 'lunch',
      label: CONTINUOUS_REVIEW_MONITOR_LABEL,
      quality: 'strict',
      enabled: windows.middayTrapReversal.enabled,
      allowsTradePlan: windows.middayTrapReversal.enabled,
      allowsDiscordAlert: windows.middayTrapReversal.enabled,
      allowsMarketMapping,
      allowsDeskPlan: allowsMarketMapping,
      nextWindowLabel: null,
    };
  }

  if (isBetween(minutes, windows.eveningExecution.startET, windows.eveningExecution.endET)) {
    return {
      session: 'evening',
      label: CONTINUOUS_REVIEW_MONITOR_LABEL,
      quality: 'approved',
      enabled: windows.eveningExecution.enabled,
      allowsTradePlan: windows.eveningExecution.enabled,
      allowsDiscordAlert: windows.eveningExecution.enabled,
      allowsMarketMapping,
      allowsDeskPlan: allowsMarketMapping,
      nextWindowLabel: null,
    };
  }

  void afternoonEnabled;

  return {
    session:
      minutes >= minutesFromClock(windows.middayTrapReversal.endET) && minutes < 17 * 60
        ? 'afternoon'
        : 'premarket',
    label: CONTINUOUS_REVIEW_MONITOR_LABEL,
    quality: 'observe_only',
    enabled: allowsReviewMonitor,
    allowsTradePlan: allowsReviewMonitor,
    allowsDiscordAlert: allowsReviewMonitor,
    allowsMarketMapping,
    allowsDeskPlan: allowsReviewMonitor,
    nextWindowLabel: null,
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

function candidateDecisionQuality(candidate: SetupCandidate | null | undefined): number | null {
  const raw = candidate?.decisionQualityScore ?? candidate?.modelConfidenceScore ?? null;
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

function isHighQualityConditionalReviewCandidate(candidate: SetupCandidate | null | undefined): boolean {
  if (candidate?.blockReason === NoTradeReason.EntryTriggerPending) {
    return false;
  }
  const score = candidateDecisionQuality(candidate);
  const executionStatusEligible =
    candidate?.executionStatus === ExecutionStatus.Conditional ||
    candidate?.executionStatus === ExecutionStatus.Executable;
  const blockerEligible = !candidate?.blockReason;
  return Boolean(
    candidate &&
    (candidate.direction === 'LONG' || candidate.direction === 'SHORT') &&
    executionStatusEligible &&
    blockerEligible &&
    hasFullPlanLevels(candidate) &&
    hasMeaningfulStructuredEvidence(candidate) &&
    score !== null &&
    score >= HIGH_QUALITY_CONDITIONAL_REVIEW_MIN_SCORE &&
    !candidateHasHtfConflict(candidate)
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
  } else if (state === 'TriggerPending') {
    visibilityMode = 'NO_TRADE_WITH_REASON';
    discordAction = 'no_trade';
    noTradeWithReason = 'TriggerPending is internal readback only; Discord requires approved completed 5M proof before any trade plan can publish.';
  } else if (state === 'Watching') {
    visibilityMode = isHighQualityConditionalReviewCandidate(candidate) ? 'POST_CONDITIONAL' : 'POST_WATCH';
    discordAction = isHighQualityConditionalReviewCandidate(candidate) ? 'post_conditional' : 'post_watch';
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

function registryEntryFvgDecisionSupport(entry: SetupRegistryEntry): boolean {
  return entry.parentModelFamily === 'FVG_TRADING_SYSTEM_V1' && entry.role === 'primary_model';
}

function suppressionPathsForRegistryEntry(entry: SetupRegistryEntry): string[] {
  const paths = [
    'Futures weekend closure or scanner service offline.',
    'Missing required structured evidence from the setup scanner.',
    'Missing completed 5M trigger, protected structure stop, invalidation, target room, or risk proof.',
    'Stale/chase guard marks the setup missed or blocked.',
    'Durable ActiveCampaign ledger suppresses duplicate Discord alerts.',
    'Discord quality threshold or duplicate alert policy suppresses posting while decision tape keeps the state.',
    'Structured HTF context below the 30-day sufficiency requirement becomes data-quality visibility, not structural confirmation.',
  ];

  if (registryEntryFvgDecisionSupport(entry)) {
    paths.unshift('FVG Trading System v1 is decision-support only; no automated orders are authorized.');
  } else {
    paths.unshift('Legacy/non-FVG model metadata is not eligible for active scanner runtime promotion.');
  }

  return paths;
}

function canExecuteRelationshipForRegistryEntry(entry: SetupRegistryEntry): string {
  if (registryEntryFvgDecisionSupport(entry)) {
    return 'FVG Trading System v1 can publish decision-support only after HTF/15M story, valid same-direction 15M parent FVG or battle zone, completed 5M confirmation, protected 5M structure stop, target/obstacle path, risk, invalidation, and session gates pass. No automated orders are authorized.';
  }
  return 'Legacy/non-FVG model metadata is not eligible for active scanner runtime promotion.';
}

export function buildTradeDecisionMapAudit(entries: SetupRegistryEntry[] = SETUP_REGISTRY): TradeDecisionMapAudit {
  return {
    sourceOfTruth: 'setup_registry_trade_decision_map_audit',
    generatedFrom: 'SETUP_REGISTRY',
    tradingLogicChanged: false,
    entries: entries.map((entry) => {
      const primary = entry.role === 'primary_model';
      const fvgDecisionSupport = primary && registryEntryFvgDecisionSupport(entry);
      return {
        setupType: entry.setupType,
        modelName: entry.label,
        role: entry.role,
        parentModelFamily: entry.parentModelFamily || null,
        sessionWindows: [...entry.allowedSessions],
        requiredEvidence: [...entry.requiredEvidence],
        rankWeight: entry.priority,
        watchEligible: fvgDecisionSupport,
        planEligible: fvgDecisionSupport,
        discordEligible: fvgDecisionSupport,
        executionEligible: fvgDecisionSupport,
        humanReviewOnly: entry.setupType !== SetupType.FvgTradingSystemV1,
        canExecuteRelationship: canExecuteRelationshipForRegistryEntry(entry),
        knownSuppressionPaths: suppressionPathsForRegistryEntry(entry),
      };
    }),
    notes: [
      'Phase 9A audit is inventory metadata only; it does not approve, reject, rank, or suppress trades.',
      'Rank weight mirrors the setup registry priority so drift is visible without changing scanner scoring.',
      'Execution eligibility describes decision-support publish authority only; automated orders remain unauthorized and actual publish approval remains controlled by normalized canExecute.',
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

function fvgDecisionZoneTimeframe(reason: string | null | undefined): DeskFvgDecisionZone['sourceTimeframe'] {
  const text = String(reason || '').toUpperCase();
  if (/\b240M\b|\b4H\b/.test(text)) return '240M';
  if (/\b120M\b|\b2H\b/.test(text)) return '120M';
  if (/\b60M\b|\b1H\b/.test(text)) return '60M';
  if (/\b15M\b/.test(text)) return '15M';
  return 'unknown';
}

function fvgDecisionZoneState(args: {
  direction: Exclude<SetupCandidate['direction'], 'NO TRADE'>;
  lineInSand: number;
  currentPrice?: number | null;
  ruleStatus: NonNullable<NonNullable<SetupCandidate['activeRuleset']>['htfLineInSand']>['status'];
}): DeskFvgDecisionZoneState {
  const price = numericOrNull(args.currentPrice);
  if (price === null) return 'unknown';
  if (args.direction === 'LONG') {
    if (price >= args.lineInSand) return args.ruleStatus === 'passed' ? 'holding' : 'retest_required';
    return 'accepted_through';
  }
  if (price <= args.lineInSand) return args.ruleStatus === 'passed' ? 'holding' : 'retest_required';
  return 'accepted_through';
}

function buildFvgDecisionZone(
  candidate: SetupCandidate | null,
  currentPrice?: number | null,
): DeskFvgDecisionZone | null {
  const rule = candidate?.activeRuleset?.htfLineInSand;
  if (!rule || candidate?.direction !== 'LONG' && candidate?.direction !== 'SHORT') return null;
  if (numericOrNull(rule.lineInSand) === null) return null;
  const reasonText = `${rule.lineReason || ''} ${rule.requiredClose || ''} ${rule.obstacleType || ''}`;
  const isFvgLine = rule.obstacleType === 'imbalance_zone' || /FVG|fair value gap|imbalance/i.test(reasonText);
  if (!isFvgLine) return null;
  const direction = candidate.direction;
  const lineInSand = rule.lineInSand as number;
  const sourceTimeframe = fvgDecisionZoneTimeframe(rule.lineReason || rule.requiredClose);
  const zoneLabel = sourceTimeframe === 'unknown'
    ? 'FVG / imbalance decision zone'
    : `${sourceTimeframe} FVG / imbalance decision zone`;
  const holdCondition = direction === 'LONG'
    ? `Long context needs completed 5M hold/reclaim above ${lineInSand.toFixed(2)}.`
    : `Short context needs completed 5M hold/rejection below ${lineInSand.toFixed(2)}.`;
  const foldCondition = direction === 'LONG'
    ? `Fold: completed acceptance below ${lineInSand.toFixed(2)} turns this FVG into resistance/short management context.`
    : `Fold: completed acceptance above ${lineInSand.toFixed(2)} turns this FVG into support/long management context.`;
  return {
    sourceOfTruth: 'scanner_htf_fvg_decision_zone',
    direction,
    lineInSand,
    zoneLabel,
    zoneSource: 'active_ruleset_htf_line_in_sand',
    sourceTimeframe,
    state: fvgDecisionZoneState({
      direction,
      lineInSand,
      currentPrice,
      ruleStatus: rule.status,
    }),
    whyItMatters: rule.lineReason || `${zoneLabel} selected by the scanner as the active line in the sand.`,
    holdCondition,
    foldCondition,
    managementInstruction: 'FVG is a reaction/management zone only. It can frame the story, obstacle, target, hold, or fold condition, but it does not approve execution without completed 5M proof and normal canExecute gates.',
    noChase: 'No chase inside or beyond the FVG. Wait for completed 5M close/hold/retest proof.',
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

function lifecycleItemIsHighQualityConditionalReview(item: ScannerCandidateLifecycleTraceItem | null | undefined): boolean {
  if (!item) return false;
  const score = item.decisionQualityScore ?? item.modelConfidenceScore ?? null;
  return Boolean(
    (item.direction === 'LONG' || item.direction === 'SHORT') &&
    item.executionStatus === ExecutionStatus.Conditional &&
    item.blockReason === NoTradeReason.EntryTriggerPending &&
    item.hasFullPlanLevels &&
    typeof score === 'number' &&
    Number.isFinite(score) &&
    score >= HIGH_QUALITY_CONDITIONAL_REVIEW_MIN_SCORE &&
    !lifecycleItemHasHtfConflict(item) &&
    (item.tacticalZone || item.nextTrigger || item.requiredTrigger)
  );
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
      tacticalZone: candidate.tacticalZone ?? null,
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
  if (args.state === 'TriggerPending') return 'no_trade';
  if (args.visibilityMode === 'POST_WATCH' || args.state === 'Watching') return 'watching';
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

function promotionReadinessFromStage(stage: DeskStatePromotionStage): DeskStatePromotionReadiness {
  if (stage === 'market_mapping') return 'market_mapping_only';
  if (stage === 'watch') return 'watch_waiting_for_completed_5m';
  if (stage === 'conditional') return 'conditional_waiting_for_review_proof';
  if (stage === 'human_review_ready') return 'human_review_ready_waiting_for_existing_plan_gate';
  if (stage === 'posted_plan') return 'posted_plan_existing_gate_only';
  return 'blocked_or_no_trade';
}

function requiredPromotionProofForStage(stage: DeskStatePromotionStage): string[] {
  if (stage === 'watch') {
    return [
      'Completed 5M trigger or retest proof.',
      'Protected 5M structure stop.',
      'App-owned target room and invalidation proof.',
      'No-chase check when price is extended.',
    ];
  }
  if (stage === 'conditional') {
    return [
      'Confirmed entry, protected stop, T1, and T2 from the app-owned pipeline.',
      'Completed 5M hold/retest proof before human-review plan promotion.',
      'Normal session, risk, model, invalidation, and canExecute gates remain unchanged.',
    ];
  }
  if (stage === 'human_review_ready') {
    return [
      'Existing trade decision pipeline must approve any posted plan.',
      'canExecute remains false unless the existing deterministic gates already allowed it.',
    ];
  }
  if (stage === 'posted_plan') {
    return [
      'Posted plan must already have passed existing app-owned execution approval.',
    ];
  }
  return [
    'Meaningful structured evidence must remain visible as watch, conditional, review, hold, no-trade, or data-quality blocker.',
  ];
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
  const requiredProof = requiredPromotionProofForStage(currentStage);
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
    promotionReadiness: promotionReadinessFromStage(currentStage),
    promotionTrigger,
    requiredProof,
    missingProof,
    blockedBy: missingProof.length > 0 ? missingProof : requiredProof,
    canPromoteNow: false,
    approvalBoundary: {
      changesTradeApprovals: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      changesRiskRules: false,
      changesBridgeBehavior: false,
    },
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

function primaryRegistryEntryForSetup(setupType: SetupType | null | undefined): SetupRegistryEntry | null {
  if (!setupType) return null;
  return SETUP_REGISTRY.find((entry) => entry.setupType === setupType && entry.role === 'primary_model') || null;
}

function fvgProtectedStructureFallbackEntry(direction: 'LONG' | 'SHORT', map: DeskHtfProtectedStructureMap): SetupRegistryEntry | null {
  if (protectedStructureSupportDirection(map) !== direction) return null;
  return SETUP_REGISTRY.find((entry) => entry.setupType === SetupType.FvgTradingSystemV1 && entry.role === 'primary_model') || null;
}

function existingModelFitMissingProof(item: ScannerCandidateLifecycleTraceItem | null): string[] {
  if (!item) return ['No scanner-owned lifecycle candidate exists for this side.'];
  const missing = [
    ...item.missingEvidence,
    ...item.missingLevels,
    item.blockReason,
  ].filter((value): value is string => Boolean(value));
  if (!item.hasFullPlanLevels) missing.push('Entry, protected 5M stop, T1, or T2 is missing.');
  if (item.executionStatus !== ExecutionStatus.Executable) missing.push('Existing scanner execution status is not executable.');
  if (!item.nextTrigger && !item.requiredTrigger) missing.push('Completed 5M trigger/retest proof is not mapped.');
  return Array.from(new Set(missing));
}

function buildApprovedModelFit(args: {
  direction: 'LONG' | 'SHORT';
  item: ScannerCandidateLifecycleTraceItem | null;
  htfProtectedStructureMap: DeskHtfProtectedStructureMap;
}): DeskPlayApprovedModelFit {
  const boundary = {
    changesTradeApprovals: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    createsNewModel: false,
  } as const;
  if (args.htfProtectedStructureMap.reliability === 'data_limited') {
    return {
      sourceOfTruth: 'scanner_protected_structure_model_fit',
      setupType: null,
      modelName: null,
      parentModelFamily: null,
      fitScore: 0,
      status: 'data_limited',
      reason: 'HTF protected-structure context is data-limited; model routing remains review-only.',
      missingProof: ['HTF protected-structure context is data-limited.'],
      approvalBoundary: boundary,
    };
  }

  const protectedDirection = protectedStructureSupportDirection(args.htfProtectedStructureMap);
  const aligned = protectedDirection === args.direction;
  if (!aligned) {
    return {
      sourceOfTruth: 'scanner_protected_structure_model_fit',
      setupType: null,
      modelName: null,
      parentModelFamily: null,
      fitScore: 0,
      status: 'not_aligned',
      reason: `${args.direction} is not supported by aligned protected 15M+5M structure this cycle.`,
      missingProof: ['15M and 5M protected structure are not aligned for this side.'],
      approvalBoundary: boundary,
    };
  }

  const existingEntry = primaryRegistryEntryForSetup(args.item?.setupType || null);
  const fallbackEntry = fvgProtectedStructureFallbackEntry(args.direction, args.htfProtectedStructureMap);
  const entry = existingEntry || fallbackEntry;
  if (!entry) {
    return {
      sourceOfTruth: 'scanner_protected_structure_model_fit',
      setupType: null,
      modelName: null,
      parentModelFamily: null,
      fitScore: 0,
      status: 'candidate_missing',
      reason: 'Protected structure is aligned, but no approved primary model route is available.',
      missingProof: ['No approved primary model route matched the protected-structure context.'],
      approvalBoundary: boundary,
    };
  }

  const baseScore = args.item
    ? lifecycleItemScore(args.item)
    : entry.priority;
  const fitScore = Math.max(0, Math.min(100, Math.round(baseScore + (existingEntry ? 8 : 2))));
  const modelSource = existingEntry
    ? 'existing scanner candidate'
    : 'protected HTF/15M+5M alignment routed to FVG Trading System v1 decision-support model';
  return {
    sourceOfTruth: 'scanner_protected_structure_model_fit',
    setupType: entry.setupType,
    modelName: entry.label,
    parentModelFamily: entry.parentModelFamily || null,
    fitScore,
    status: 'best_fit',
    reason: `${args.direction} protected-structure alignment selects ${entry.label} from ${modelSource}.`,
    missingProof: existingModelFitMissingProof(args.item),
    approvalBoundary: boundary,
  };
}

function buildExecutableConsideration(args: {
  direction: 'LONG' | 'SHORT';
  item: ScannerCandidateLifecycleTraceItem | null;
  modelFit: DeskPlayApprovedModelFit;
}): DeskPlayExecutableConsideration {
  const boundary = {
    changesTradeApprovals: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    changesRiskRules: false,
  } as const;
  if (args.modelFit.status === 'data_limited') {
    return {
      sourceOfTruth: 'scanner_executable_consideration_gate_metadata',
      direction: args.direction,
      status: 'data_limited',
      selectedRegisteredModel: null,
      selectedApprovedModel: null,
      canExecuteNow: false,
      gateSummary: 'Data-limited HTF context prevents executable consideration.',
      missingGates: args.modelFit.missingProof,
      approvalBoundary: boundary,
    };
  }
  if (args.modelFit.status !== 'best_fit') {
    return {
      sourceOfTruth: 'scanner_executable_consideration_gate_metadata',
      direction: args.direction,
      status: 'not_aligned',
      selectedRegisteredModel: args.modelFit.setupType,
      selectedApprovedModel: args.modelFit.setupType,
      canExecuteNow: false,
      gateSummary: 'Protected structure does not route this side into an active execution-eligible model.',
      missingGates: args.modelFit.missingProof,
      approvalBoundary: boundary,
    };
  }
  const missingGates = existingModelFitMissingProof(args.item);
  const ready = Boolean(args.item && args.item.executionStatus === ExecutionStatus.Executable && args.item.hasFullPlanLevels && missingGates.length === 0);
  return {
    sourceOfTruth: 'scanner_executable_consideration_gate_metadata',
    direction: args.direction,
    status: ready ? 'ready_for_existing_can_execute_gate' : 'review_only_missing_proof',
    selectedRegisteredModel: args.modelFit.setupType,
    selectedApprovedModel: args.modelFit.setupType,
    canExecuteNow: false,
    gateSummary: ready
      ? 'Active model fit is structurally complete; existing canExecute gate remains the only executor.'
      : 'Active model fit is visible, but normal 5M execution gates still need proof.',
    missingGates,
    approvalBoundary: boundary,
  };
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

function buildProtectedStructureTrendConfirmation(map: DeskHtfProtectedStructureMap): DeskTrendConfirmation {
  const baseBoundary = {
    changesTradeApprovals: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
  } as const;
  if (map.reliability === 'data_limited') {
    return {
      sourceOfTruth: 'scanner_protected_structure_trend_confirmation',
      direction: 'WAIT',
      status: 'data_limited',
      supportingTimeframes: [],
      lineInSand: null,
      confirmation: 'HTF context is data-limited; protected structure cannot promote a desk direction.',
      summary: 'Trend confirmation unavailable: HTF protected-structure context is data-limited.',
      approvalBoundary: baseBoundary,
    };
  }
  const fifteenMinute = map.rows.find((row) => row.timeframe === '15M');
  const fiveMinute = map.rows.find((row) => row.timeframe === '5M');
  const direction = protectedStructureSupportDirection(map);
  if (!fifteenMinute || !fiveMinute) {
    return {
      sourceOfTruth: 'scanner_protected_structure_trend_confirmation',
      direction: 'WAIT',
      status: 'unavailable',
      supportingTimeframes: [],
      lineInSand: null,
      confirmation: '15M and 5M protected structure rows are both required.',
      summary: 'Trend confirmation unavailable: missing 15M or 5M protected-structure row.',
      approvalBoundary: baseBoundary,
    };
  }
  if (!direction) {
    return {
      sourceOfTruth: 'scanner_protected_structure_trend_confirmation',
      direction: 'WAIT',
      status: 'not_aligned',
      supportingTimeframes: [],
      lineInSand: null,
      confirmation: '15M and 5M protected structure are not aligned.',
      summary: 'Trend confirmation: WAIT until 15M and 5M protected structure align.',
      approvalBoundary: baseBoundary,
    };
  }
  const lineInSand = direction === 'LONG'
    ? Math.min(
        ...[fifteenMinute.biasChangeLine, fiveMinute.biasChangeLine]
          .filter((value): value is number => typeof value === 'number' && Number.isFinite(value)),
      )
    : Math.max(
        ...[fifteenMinute.biasChangeLine, fiveMinute.biasChangeLine]
          .filter((value): value is number => typeof value === 'number' && Number.isFinite(value)),
      );
  const resolvedLine = Number.isFinite(lineInSand) ? lineInSand : null;
  const changeText = direction === 'LONG'
    ? `changes BEAR below ${resolvedLine !== null ? resolvedLine.toFixed(2) : 'protected structure'}`
    : `changes BULL above ${resolvedLine !== null ? resolvedLine.toFixed(2) : 'protected structure'}`;
  return {
    sourceOfTruth: 'scanner_protected_structure_trend_confirmation',
    direction,
    status: 'aligned',
    supportingTimeframes: ['15M', '5M'],
    lineInSand: resolvedLine,
    confirmation: `15M and 5M protected structure are ${direction === 'LONG' ? 'BULL' : 'BEAR'} now; ${changeText} on completed close+hold.`,
    summary: `Desk Direction: ${direction}. Trend confirmation: 15M+5M protected structure aligned; ${changeText}.`,
    approvalBoundary: baseBoundary,
  };
}

function tacticalLineDirectionMatches(row: DeskHtfProtectedStructureRow, direction: 'LONG' | 'SHORT'): boolean {
  const expected = direction === 'LONG' ? 'BULL' : 'BEAR';
  return row.currentBias === expected || row.bias === expected;
}

function buildActiveTacticalLine(args: {
  direction: DeskPlayDirection;
  originalLine: number | null;
  htfProtectedStructureMap: DeskHtfProtectedStructureMap;
}): DeskActiveTacticalLine {
  const boundary = {
    changesTradeApprovals: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
  } as const;
  if (args.direction !== 'LONG' && args.direction !== 'SHORT') {
    return {
      sourceOfTruth: 'scanner_active_tactical_line',
      direction: 'WAIT',
      originalLine: args.originalLine,
      activeLine: args.originalLine,
      migrated: false,
      supportingTimeframes: [],
      reason: 'No primary side is active, so no tactical line migration is available.',
      nextTrigger: 'Wait for 15M+5M structure alignment and completed 5M proof.',
      standDown: 'Stand down until one primary side is active.',
      approvalBoundary: boundary,
    };
  }

  const tacticalDirection: 'LONG' | 'SHORT' = args.direction;
  const rows = args.htfProtectedStructureMap.rows
    .filter((row): row is DeskHtfProtectedStructureRow & { timeframe: '15M' | '5M' } =>
      (row.timeframe === '15M' || row.timeframe === '5M') &&
      tacticalLineDirectionMatches(row, tacticalDirection) &&
      typeof row.confirmationLine === 'number' &&
      Number.isFinite(row.confirmationLine)
    );
  const activeLine = rows.length
    ? tacticalDirection === 'LONG'
      ? Math.max(...rows.map((row) => row.confirmationLine as number))
      : Math.min(...rows.map((row) => row.confirmationLine as number))
    : args.originalLine;
  const migrated = typeof activeLine === 'number' &&
    typeof args.originalLine === 'number' &&
    Number.isFinite(activeLine) &&
    Number.isFinite(args.originalLine) &&
    Math.abs(activeLine - args.originalLine) >= 0.25;
  const supportingTimeframes = rows.map((row) => row.timeframe);
  const lineText = typeof activeLine === 'number' && Number.isFinite(activeLine) ? activeLine.toFixed(2) : 'N/A';
  const originalText = typeof args.originalLine === 'number' && Number.isFinite(args.originalLine) ? args.originalLine.toFixed(2) : 'N/A';
  const directionWord = args.direction === 'LONG' ? 'above' : 'below';
  const standDownWord = args.direction === 'LONG' ? 'below' : 'above';
  const structureText = supportingTimeframes.length ? supportingTimeframes.join('+') : 'current 5M/15M';

  return {
    sourceOfTruth: 'scanner_active_tactical_line',
    direction: args.direction,
    originalLine: args.originalLine,
    activeLine: typeof activeLine === 'number' && Number.isFinite(activeLine) ? activeLine : null,
    migrated,
    supportingTimeframes,
    reason: migrated
      ? `Active line migrated ${originalText} -> ${lineText} via ${structureText} structure.`
      : `Active line remains ${lineText}; no stronger ${structureText} line has replaced it.`,
    nextTrigger: `Active line ${lineText}: completed 5M hold/retest ${directionWord} required before fresh execution consideration.`,
    standDown: `Fresh ${args.direction} stand down on completed 5M acceptance ${standDownWord} ${lineText}.`,
    approvalBoundary: boundary,
  };
}

function extractFirstPriceRange(text: string | null | undefined): { lower: number; upper: number } | null {
  const source = String(text || '');
  const match = source.match(/(?:from|zone|area|between)?\s*(\d{3,5}(?:\.\d+)?)\s*(?:-|to|through)\s*(\d{3,5}(?:\.\d+)?)/i);
  if (!match) return null;
  const first = Number(match[1]);
  const second = Number(match[2]);
  if (!Number.isFinite(first) || !Number.isFinite(second)) return null;
  return {
    lower: Math.min(first, second),
    upper: Math.max(first, second),
  };
}

function activeTacticalZoneState(args: {
  direction: 'LONG' | 'SHORT';
  lower: number;
  upper: number;
  currentPrice?: number | null;
}): DeskActiveTacticalZoneState {
  const price = numericOrNull(args.currentPrice);
  if (price === null) return 'unknown';
  const noChaseDistance = 8;
  if (price >= args.lower && price <= args.upper) return 'in_zone';
  if (args.direction === 'LONG') {
    if (price > args.upper + noChaseDistance) return 'moved_away';
    if (price > args.upper) return 'holding';
    return 'waiting_retest';
  }
  if (price < args.lower - noChaseDistance) return 'moved_away';
  if (price < args.lower) return 'holding';
  return 'waiting_retest';
}

function buildActiveTacticalZone(args: {
  direction: DeskPlayDirection;
  activeLine: DeskActiveTacticalLine;
  tacticalZone?: TacticalZoneBounds | null;
  fvgDecisionZone: DeskFvgDecisionZone | null;
  nextTrigger: string | null;
  currentPrice?: number | null;
}): DeskActiveTacticalZone | null {
  if (args.direction !== 'LONG' && args.direction !== 'SHORT') return null;
  const structuredZone = args.tacticalZone?.direction === args.direction &&
    numericOrNull(args.tacticalZone.lower) !== null &&
    numericOrNull(args.tacticalZone.upper) !== null
    ? args.tacticalZone
    : null;
  const range = structuredZone
    ? {
        lower: Math.min(structuredZone.lower, structuredZone.upper),
        upper: Math.max(structuredZone.lower, structuredZone.upper),
      }
    : extractFirstPriceRange(args.nextTrigger);
  const fvgLine = args.fvgDecisionZone?.direction === args.direction
    ? numericOrNull(args.fvgDecisionZone.lineInSand)
    : null;
  const activeLine = numericOrNull(args.activeLine.activeLine);
  const lower = range?.lower ?? fvgLine ?? null;
  const upper = range?.upper ?? fvgLine ?? null;
  if (lower === null || upper === null) return null;

  const direction = args.direction;
  const sourceTimeframe = structuredZone
    ? structuredZone.sourceTimeframe
    : range
    ? '5M'
    : args.fvgDecisionZone?.sourceTimeframe || 'unknown';
  const zoneLabel = structuredZone
    ? structuredZone.label
    : range
    ? `${sourceTimeframe} tactical pullback / retest zone`
    : args.fvgDecisionZone?.zoneLabel || 'Tactical decision zone';
  const state = activeTacticalZoneState({
    direction,
    lower,
    upper,
    currentPrice: args.currentPrice,
  });
  const zoneText = lower === upper ? lower.toFixed(2) : `${lower.toFixed(2)}-${upper.toFixed(2)}`;
  const lineText = activeLine !== null ? activeLine.toFixed(2) : 'N/A';
  const triggerWord = direction === 'LONG' ? 'hold/reclaim above' : 'hold/reject below';
  const standDownWord = direction === 'LONG' ? 'below' : 'above';
  const migrated = activeLine !== null && (Math.abs(lower - activeLine) >= 0.25 || Math.abs(upper - activeLine) >= 0.25);

  return {
    sourceOfTruth: 'scanner_active_tactical_zone',
    direction,
    lower,
    upper,
    anchorLine: activeLine,
    migratedFromLine: activeLine,
    migrated,
    zoneLabel,
    sourceTimeframe,
    state,
    reason: structuredZone
      ? `${structuredZone.evidence} Fresh tactical decision area is ${zoneText}.`
      : migrated
      ? `Fresh tactical decision area migrated from active line ${lineText} to ${zoneText} from scanner-owned trigger/zone context.`
      : `Fresh tactical decision area is anchored at ${zoneText}.`,
    nextTrigger: `Active tactical zone ${zoneText}: completed 5M ${triggerWord} the zone required before fresh execution consideration.`,
    standDown: `Fresh ${direction} stand down on completed 5M acceptance ${standDownWord} ${direction === 'LONG' ? lower.toFixed(2) : upper.toFixed(2)}.`,
    noChase: `No chase away from ${zoneText}. If price has already expanded beyond the zone, treat as management-only until a fresh completed 5M setup forms.`,
    approvalBoundary: {
      changesTradeApprovals: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
    },
  };
}

function timeframeIsHtfFvgParent(timeframe: TacticalZoneBounds['sourceTimeframe'] | null | undefined): timeframe is DeskHtfFvgParentZone['timeframe'] {
  return timeframe === '15M' || timeframe === '60M' || timeframe === '120M' || timeframe === '240M';
}

function htfParentZoneFromTacticalZone(args: {
  direction: DeskPlayDirection;
  tacticalZone?: TacticalZoneBounds | null;
  currentPrice?: number | null;
}): DeskHtfFvgParentZone | null {
  if (args.direction !== 'LONG' && args.direction !== 'SHORT') return null;
  const zone = args.tacticalZone;
  if (!zone || zone.direction !== args.direction || !timeframeIsHtfFvgParent(zone.sourceTimeframe)) return null;
  const lower = numericOrNull(zone.lower);
  const upper = numericOrNull(zone.upper);
  if (lower === null || upper === null) return null;
  const low = Math.min(lower, upper);
  const high = Math.max(lower, upper);
  return {
    sourceOfTruth: 'scanner_htf_fvg_parent_zone',
    direction: args.direction,
    timeframe: zone.sourceTimeframe,
    lower: low,
    upper: high,
    midpoint: numericOrNull(zone.midpoint),
    label: zone.label,
    state: activeTacticalZoneState({
      direction: args.direction,
      lower: low,
      upper: high,
      currentPrice: args.currentPrice,
    }),
    evidence: zone.evidence,
  };
}

function htfFvgTimeframeLabel(timeframe: TimeframeFactSet['timeframe']): DeskHtfFvgParentZone['timeframe'] | null {
  if (timeframe === '15m') return '15M';
  if (timeframe === '1h') return '60M';
  if (timeframe === '2h') return '120M';
  if (timeframe === '4h') return '240M';
  return null;
}

function htfFvgTimeframePriority(timeframe: DeskHtfFvgParentZone['timeframe']): number {
  if (timeframe === '15M') return 0;
  if (timeframe === '60M') return 1;
  if (timeframe === '120M') return 2;
  return 3;
}

function htfParentZoneFromFvgFact(args: {
  direction?: 'LONG' | 'SHORT' | null;
  timeframe: TimeframeFactSet['timeframe'];
  zone: FvgZoneFact;
  currentPrice?: number | null;
}): DeskHtfFvgParentZone | null {
  const timeframe = htfFvgTimeframeLabel(args.timeframe);
  if (!timeframe) return null;
  if (args.zone.direction !== 'LONG' && args.zone.direction !== 'SHORT') return null;
  if (args.direction && args.zone.direction !== args.direction) return null;
  const lower = numericOrNull(args.zone.lower);
  const upper = numericOrNull(args.zone.upper);
  if (lower === null || upper === null) return null;
  if (typeof args.zone.filledPercent === 'number' && args.zone.filledPercent >= 100 && !args.zone.reclaimed) return null;
  const low = Math.min(lower, upper);
  const high = Math.max(lower, upper);
  const direction = args.zone.direction;
  const midpoint = numericOrNull(args.zone.midpoint) ?? (low + high) / 2;
  return {
    sourceOfTruth: 'scanner_htf_fvg_parent_zone',
    direction,
    timeframe,
    lower: low,
    upper: high,
    midpoint,
    label: `${timeframe} ${direction === 'LONG' ? 'bullish' : 'bearish'} FVG parent zone`,
    state: activeTacticalZoneState({
      direction,
      lower: low,
      upper: high,
      currentPrice: args.currentPrice,
    }),
    evidence: `${timeframe} ${direction === 'LONG' ? 'bullish' : 'bearish'} FVG from structured OHLC facts${args.zone.formedAt ? ` formed ${args.zone.formedAt}` : ''}.`,
  };
}

function priceFromCandle(value: unknown): number | null {
  return numericOrNull(value);
}

function completedCandleClose(candle: unknown): number | null {
  const record = candle && typeof candle === 'object' ? candle as Record<string, unknown> : null;
  return record ? priceFromCandle(record.close) : null;
}

function completedCandleOpen(candle: unknown): number | null {
  const record = candle && typeof candle === 'object' ? candle as Record<string, unknown> : null;
  return record ? priceFromCandle(record.open) : null;
}

function completedCandleLow(candle: unknown): number | null {
  const record = candle && typeof candle === 'object' ? candle as Record<string, unknown> : null;
  return record ? priceFromCandle(record.low) : null;
}

function completedCandleHigh(candle: unknown): number | null {
  const record = candle && typeof candle === 'object' ? candle as Record<string, unknown> : null;
  return record ? priceFromCandle(record.high) : null;
}

function latestCompletedCloseForBossLedger(chartContext?: Partial<ChartContext> | null): number | null {
  const fiveMinute = chartContext?.multiTimeframeContext?.fiveMinute.candles || [];
  const rootCandles = chartContext?.candles || [];
  const fifteenMinute = chartContext?.multiTimeframeContext?.fifteenMinute.candles || [];
  const candidates = [fiveMinute, rootCandles, fifteenMinute]
    .flat()
    .map((candle, fallbackIndex) => ({
      close: completedCandleClose(candle),
      timestamp: completedCandleTimestamp(candle),
      index: completedCandleIndex(candle) ?? fallbackIndex,
    }))
    .filter((item): item is { close: number; timestamp: string | null; index: number } => item.close !== null);
  if (!candidates.length) return null;
  return candidates
    .sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : Number.NaN;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : Number.NaN;
      if (Number.isFinite(aTime) && Number.isFinite(bTime)) return bTime - aTime;
      return b.index - a.index;
    })[0]?.close ?? null;
}

function completedCandleTimestamp(candle: unknown): string | null {
  const record = candle && typeof candle === 'object' ? candle as Record<string, unknown> : null;
  const value = record?.timestamp;
  return typeof value === 'string' && value.trim() ? value : null;
}

function completedCandleIndex(candle: unknown): number | null {
  const record = candle && typeof candle === 'object' ? candle as Record<string, unknown> : null;
  const value = record?.index;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function roundBossZonePrice(value: number): number {
  return Math.round(value * 4) / 4;
}

function bossZoneRecentTradingDates(candles: unknown[]): Set<string> | null {
  const dates = candles
    .map(completedCandleTimestamp)
    .filter((value): value is string => Boolean(value))
    .map((value) => value.slice(0, 10))
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value));
  if (!dates.length) return null;
  return new Set([...new Set(dates)].sort().slice(-3));
}

function deriveFifteenMinuteBossZonesFromCandles(chartContext?: Partial<ChartContext> | null): FvgZoneFact[] {
  const candles = [...(chartContext?.multiTimeframeContext?.fifteenMinute.candles || [])]
    .filter((candle) =>
      completedCandleHigh(candle) !== null &&
      completedCandleLow(candle) !== null
    )
    .sort((a, b) => {
      const aIndex = completedCandleIndex(a);
      const bIndex = completedCandleIndex(b);
      if (aIndex !== null && bIndex !== null) return aIndex - bIndex;
      const aTime = completedCandleTimestamp(a);
      const bTime = completedCandleTimestamp(b);
      return (aTime ? new Date(aTime).getTime() : 0) - (bTime ? new Date(bTime).getTime() : 0);
    });
  if (candles.length < 3) return [];

  const recentTradingDates = bossZoneRecentTradingDates(candles);
  const derived: FvgZoneFact[] = [];
  for (let index = 2; index < candles.length; index += 1) {
    const current = candles[index];
    const twoBack = candles[index - 2];
    const formedAt = completedCandleTimestamp(current);
    if (recentTradingDates && formedAt && !recentTradingDates.has(formedAt.slice(0, 10))) continue;

    const currentHigh = completedCandleHigh(current);
    const currentLow = completedCandleLow(current);
    const twoBackHigh = completedCandleHigh(twoBack);
    const twoBackLow = completedCandleLow(twoBack);
    if (currentHigh === null || currentLow === null || twoBackHigh === null || twoBackLow === null) continue;

    if (currentLow > twoBackHigh) {
      const lower = roundBossZonePrice(twoBackHigh);
      const upper = roundBossZonePrice(currentLow);
      derived.push({
        direction: 'LONG',
        lower,
        upper,
        midpoint: roundBossZonePrice((lower + upper) / 2),
        formedAt,
        formedCandleIndex: completedCandleIndex(current),
        impulseQualified: true,
        confidence: 'High',
      });
    }

    if (currentHigh < twoBackLow) {
      const lower = roundBossZonePrice(currentHigh);
      const upper = roundBossZonePrice(twoBackLow);
      derived.push({
        direction: 'SHORT',
        lower,
        upper,
        midpoint: roundBossZonePrice((lower + upper) / 2),
        formedAt,
        formedCandleIndex: completedCandleIndex(current),
        impulseQualified: true,
        confidence: 'High',
      });
    }
  }
  return derived;
}

function fifteenMinuteBossZoneFacts(chartContext?: Partial<ChartContext> | null): Array<{
  zone: FvgZoneFact;
  lower: number;
  upper: number;
  midpoint: number;
}> {
  const zones = [
    ...(chartContext?.multiTimeframeContext?.fifteenMinute.fvgZones || []),
    ...deriveFifteenMinuteBossZonesFromCandles(chartContext),
  ];
  const seen = new Set<string>();
  return zones
    .filter((zone) =>
      (zone.direction === 'LONG' || zone.direction === 'SHORT') &&
      numericOrNull(zone.lower) !== null &&
      numericOrNull(zone.upper) !== null &&
      zone.impulseQualified !== false
    )
    .map((zone) => {
      const lower = numericOrNull(zone.lower) as number;
      const upper = numericOrNull(zone.upper) as number;
      const low = Math.min(lower, upper);
      const high = Math.max(lower, upper);
      return {
        zone,
        lower: low,
        upper: high,
        midpoint: numericOrNull(zone.midpoint) ?? (low + high) / 2,
      };
    })
    .filter((item) => {
      const key = `${item.zone.direction}:${item.lower.toFixed(2)}:${item.upper.toFixed(2)}:${item.zone.formedAt || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function selectRetainedBossZone(
  zones: ReturnType<typeof fifteenMinuteBossZoneFacts>,
  direction: Exclude<SetupCandidate['direction'], 'NO TRADE'>,
) {
  const directional = zones.filter((item) => item.zone.direction === direction);
  if (!directional.length) return null;
  return [...directional].sort((a, b) => direction === 'LONG'
    ? a.lower - b.lower || a.upper - b.upper
    : b.upper - a.upper || b.lower - a.lower
  )[0] || null;
}

function bossZoneFormedAtMs(item: ReturnType<typeof fifteenMinuteBossZoneFacts>[number]): number {
  const formedAt = item.zone.formedAt;
  if (!formedAt) return 0;
  const value = new Date(formedAt).getTime();
  return Number.isFinite(value) ? value : 0;
}

function sortedFifteenMinuteCandles(chartContext?: Partial<ChartContext> | null): unknown[] {
  return [...(chartContext?.multiTimeframeContext?.fifteenMinute.candles || [])]
    .filter((candle) =>
      completedCandleHigh(candle) !== null &&
      completedCandleLow(candle) !== null &&
      completedCandleClose(candle) !== null
    )
    .sort((a, b) => {
      const aIndex = completedCandleIndex(a);
      const bIndex = completedCandleIndex(b);
      if (aIndex !== null && bIndex !== null) return aIndex - bIndex;
      const aTime = completedCandleTimestamp(a);
      const bTime = completedCandleTimestamp(b);
      return (aTime ? new Date(aTime).getTime() : 0) - (bTime ? new Date(bTime).getTime() : 0);
    });
}

function bossZoneHasFifteenMinuteMssProtection(
  item: ReturnType<typeof fifteenMinuteBossZoneFacts>[number],
  chartContext?: Partial<ChartContext> | null,
): boolean {
  const candles = sortedFifteenMinuteCandles(chartContext);
  if (candles.length < 4) return false;
  const formedAt = item.zone.formedAt || null;
  const formedIndex = typeof item.zone.formedCandleIndex === 'number' ? item.zone.formedCandleIndex : null;
  let startIndex = formedAt
    ? candles.findIndex((candle) => completedCandleTimestamp(candle) === formedAt)
    : -1;
  if (startIndex < 0 && formedIndex !== null) {
    startIndex = candles.findIndex((candle) => completedCandleIndex(candle) === formedIndex);
  }
  if (startIndex < 1) return false;

  const protectionWindow = candles.slice(startIndex, Math.min(candles.length, startIndex + 4));
  for (let index = 0; index < protectionWindow.length; index += 1) {
    const absoluteIndex = startIndex + index;
    const prior = candles.slice(Math.max(0, absoluteIndex - 8), absoluteIndex);
    if (prior.length < 2) continue;
    const close = completedCandleClose(protectionWindow[index]);
    if (close === null) continue;
    const priorHighs = prior.map(completedCandleHigh).filter((value): value is number => value !== null);
    const priorLows = prior.map(completedCandleLow).filter((value): value is number => value !== null);
    if (item.zone.direction === 'LONG' && priorHighs.length && close > Math.max(...priorHighs)) return true;
    if (item.zone.direction === 'SHORT' && priorLows.length && close < Math.min(...priorLows)) return true;
  }
  return false;
}

function candleBodyPoints(candle: unknown): number | null {
  const open = completedCandleOpen(candle);
  const close = completedCandleClose(candle);
  return open === null || close === null ? null : Math.abs(close - open);
}

function candleRangePoints(candle: unknown): number | null {
  const high = completedCandleHigh(candle);
  const low = completedCandleLow(candle);
  return high === null || low === null ? null : Math.abs(high - low);
}

function candleDirectionForBossMss(candle: unknown): Exclude<SetupCandidate['direction'], 'NO TRADE'> | null {
  const open = completedCandleOpen(candle);
  const close = completedCandleClose(candle);
  if (open === null || close === null || open === close) return null;
  return close > open ? 'LONG' : 'SHORT';
}

function bossMssTradingDayAge(formedAt: string | null, latestAt: string | null): number | null {
  if (!formedAt || !latestAt) return null;
  const formedDate = formedAt.slice(0, 10);
  const latestDate = latestAt.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(formedDate) || !/^\d{4}-\d{2}-\d{2}$/.test(latestDate)) return null;
  const formed = new Date(`${formedDate}T00:00:00Z`).getTime();
  const latest = new Date(`${latestDate}T00:00:00Z`).getTime();
  if (!Number.isFinite(formed) || !Number.isFinite(latest)) return null;
  return Math.max(0, Math.floor((latest - formed) / 86_400_000) + 1);
}

function isFifteenMinuteDisplacementBreak(args: {
  candles: unknown[];
  index: number;
  direction: Exclude<SetupCandidate['direction'], 'NO TRADE'>;
}): boolean {
  const candle = args.candles[args.index];
  const close = completedCandleClose(candle);
  const range = candleRangePoints(candle);
  const body = candleBodyPoints(candle);
  if (close === null || range === null || body === null || range <= 0) return false;
  if (candleDirectionForBossMss(candle) !== args.direction) return false;
  const prior = args.candles.slice(Math.max(0, args.index - 8), args.index);
  if (prior.length < 3) return false;
  const priorHighs = prior.map(completedCandleHigh).filter((value): value is number => value !== null);
  const priorLows = prior.map(completedCandleLow).filter((value): value is number => value !== null);
  const priorRanges = prior.map(candleRangePoints).filter((value): value is number => value !== null && value > 0);
  const avgPriorRange = priorRanges.length
    ? priorRanges.reduce((sum, value) => sum + value, 0) / priorRanges.length
    : 0;
  const bodyQuality = body / range >= 0.45;
  const rangeQuality = !avgPriorRange || range >= avgPriorRange * 0.8;
  if (!bodyQuality || !rangeQuality) return false;
  if (args.direction === 'LONG') return priorHighs.length > 0 && close > Math.max(...priorHighs);
  return priorLows.length > 0 && close < Math.min(...priorLows);
}

function controlZoneFromPreBreakCandles(args: {
  candles: unknown[];
  breakIndex: number;
  direction: Exclude<SetupCandidate['direction'], 'NO TRADE'>;
}): { lower: number; upper: number; formedAt: string | null; formedCandleIndex: number | null } | null {
  const prior = args.candles.slice(Math.max(0, args.breakIndex - 8), args.breakIndex);
  if (prior.length < 3) return null;
  const opposite = args.direction === 'LONG' ? 'SHORT' : 'LONG';
  const cluster: unknown[] = [];
  let lastTimeMs = completedCandleTimestamp(args.candles[args.breakIndex])
    ? new Date(completedCandleTimestamp(args.candles[args.breakIndex]) as string).getTime()
    : Number.NaN;
  for (const candle of [...prior].reverse()) {
    const candleTime = completedCandleTimestamp(candle);
    const candleTimeMs = candleTime ? new Date(candleTime).getTime() : Number.NaN;
    if (
      Number.isFinite(lastTimeMs) &&
      Number.isFinite(candleTimeMs) &&
      Math.abs(lastTimeMs - candleTimeMs) > 45 * 60 * 1000
    ) {
      break;
    }
    lastTimeMs = candleTimeMs;
    const direction = candleDirectionForBossMss(candle);
    const high = completedCandleHigh(candle);
    const low = completedCandleLow(candle);
    if (direction !== null && high !== null && low !== null && (direction === opposite || direction === args.direction)) {
      cluster.unshift(candle);
    }
    if (cluster.length >= 6) break;
  }
  const eligibleCluster = cluster
    .filter((candle) => {
      const direction = candleDirectionForBossMss(candle);
      const high = completedCandleHigh(candle);
      const low = completedCandleLow(candle);
      return direction !== null && high !== null && low !== null && (direction === opposite || direction === args.direction);
    });
  if (eligibleCluster.length < 2) return null;
  const highs = eligibleCluster.map(completedCandleHigh).filter((value): value is number => value !== null);
  const lows = eligibleCluster.map(completedCandleLow).filter((value): value is number => value !== null);
  if (!highs.length || !lows.length) return null;
  const lower = roundBossZonePrice(Math.min(...lows));
  const upper = roundBossZonePrice(Math.max(...highs));
  if (upper <= lower) return null;
  const first = eligibleCluster[0];
  return {
    lower,
    upper,
    formedAt: completedCandleTimestamp(first),
    formedCandleIndex: completedCandleIndex(first),
  };
}

function explicitZoneForMssBreak(args: {
  zones: ReturnType<typeof fifteenMinuteBossZoneFacts>;
  breakCandle: unknown;
  breakTimeMs: number;
  direction: Exclude<SetupCandidate['direction'], 'NO TRADE'>;
}): { lower: number; upper: number; formedAt: string | null; formedCandleIndex: number | null } | null {
  const breakHigh = completedCandleHigh(args.breakCandle);
  const breakLow = completedCandleLow(args.breakCandle);
  const candidates = args.zones
    .filter((item) => item.zone.direction === args.direction)
    .filter((item) => bossZoneFormedAtMs(item) <= args.breakTimeMs)
    .filter((item) => {
      if (breakHigh === null || breakLow === null) return true;
      return breakHigh >= item.lower && breakLow <= item.upper;
    })
    .sort((a, b) => bossZoneFormedAtMs(b) - bossZoneFormedAtMs(a));
  const selected = candidates[0];
  return selected
    ? {
        lower: selected.lower,
        upper: selected.upper,
        formedAt: selected.zone.formedAt ?? null,
        formedCandleIndex: typeof selected.zone.formedCandleIndex === 'number' ? selected.zone.formedCandleIndex : null,
      }
    : null;
}

function finalBossMssZoneState(args: {
  direction: Exclude<SetupCandidate['direction'], 'NO TRADE'>;
  lower: number;
  upper: number;
  candles: unknown[];
  breakIndex: number;
  latestTimestamp: string | null;
  formedAt: string | null;
}): Pick<DeskFinalBossMssZone, 'state' | 'stateReason' | 'ageTradingDays' | 'flipDirection'> {
  const ageTradingDays = bossMssTradingDayAge(args.formedAt, args.latestTimestamp);
  if (ageTradingDays !== null && ageTradingDays > 3) {
    return {
      state: 'expired',
      stateReason: `Zone is older than the 3 trading-day final-boss retention rule (${ageTradingDays} trading days).`,
      ageTradingDays,
      flipDirection: null,
    };
  }
  const afterBreak = args.candles.slice(args.breakIndex + 1);
  let touched = false;
  let pierced = false;
  let defended = false;
  let reclaimed = false;
  for (const candle of afterBreak) {
    const high = completedCandleHigh(candle);
    const low = completedCandleLow(candle);
    const close = completedCandleClose(candle);
    if (high === null || low === null || close === null) continue;
    const overlaps = high >= args.lower && low <= args.upper;
    if (overlaps) touched = true;
    if (args.direction === 'LONG') {
      if (low < args.lower && close >= args.lower) pierced = true;
      if (overlaps && close >= args.lower) defended = true;
      if (close < args.lower) reclaimed = true;
    } else {
      if (high > args.upper && close <= args.upper) pierced = true;
      if (overlaps && close <= args.upper) defended = true;
      if (close > args.upper) reclaimed = true;
    }
  }
  if (reclaimed) {
    const flipDirection = args.direction === 'LONG' ? 'SHORT' : 'LONG';
    return {
      state: 'flipped_reaction',
      stateReason: `Completed 15M acceptance through the ${args.direction === 'LONG' ? 'bull' : 'bear'} final boss zone. Keep as ${flipDirection.toLowerCase()} reaction context until replacement or expiry.`,
      ageTradingDays,
      flipDirection,
    };
  }
  if (pierced) {
    return {
      state: 'pierced',
      stateReason: 'Price pierced the final boss zone but completed candles closed back on the defended side.',
      ageTradingDays,
      flipDirection: null,
    };
  }
  if (defended) {
    return {
      state: 'defended',
      stateReason: 'Price returned into the final boss zone and completed candles defended the original control side.',
      ageTradingDays,
      flipDirection: null,
    };
  }
  return {
    state: touched ? 'defended' : 'active_control',
    stateReason: touched
      ? 'Price touched the final boss zone without completed acceptance through it.'
      : 'Final boss zone remains the origin/control area for the completed 15M structure shift.',
    ageTradingDays,
    flipDirection: null,
  };
}

function buildFinalBossMssZones(args: {
  zones: ReturnType<typeof fifteenMinuteBossZoneFacts>;
  chartContext?: Partial<ChartContext> | null;
}): { bull: DeskFinalBossMssZone[]; bear: DeskFinalBossMssZone[]; primaryBull: DeskFinalBossMssZone | null; primaryBear: DeskFinalBossMssZone | null } {
  const candles = sortedFifteenMinuteCandles(args.chartContext);
  if (candles.length < 6) return { bull: [], bear: [], primaryBull: null, primaryBear: null };
  const latestTimestamp = completedCandleTimestamp(candles[candles.length - 1]);
  const built: DeskFinalBossMssZone[] = [];
  for (let index = 3; index < candles.length; index += 1) {
    for (const direction of ['LONG', 'SHORT'] as const) {
      if (!isFifteenMinuteDisplacementBreak({ candles, index, direction })) continue;
      const breakCandle = candles[index];
      const breakTime = completedCandleTimestamp(breakCandle);
      const breakTimeMs = breakTime ? new Date(breakTime).getTime() : 0;
      const explicit = explicitZoneForMssBreak({ zones: args.zones, breakCandle, breakTimeMs, direction });
      const preBreakControl = controlZoneFromPreBreakCandles({ candles, breakIndex: index, direction });
      const explicitWidth = explicit ? explicit.upper - explicit.lower : 0;
      const controlWidth = preBreakControl ? preBreakControl.upper - preBreakControl.lower : 0;
      const control = preBreakControl && (!explicit || controlWidth >= explicitWidth * 1.5)
        ? preBreakControl
        : explicit;
      if (!control) continue;
      const prior = candles.slice(Math.max(0, index - 8), index);
      const priorHighs = prior.map(completedCandleHigh).filter((value): value is number => value !== null);
      const priorLows = prior.map(completedCandleLow).filter((value): value is number => value !== null);
      const mssLine = direction === 'LONG'
        ? roundBossZonePrice(Math.max(...priorHighs))
        : roundBossZonePrice(Math.min(...priorLows));
      const state = finalBossMssZoneState({
        direction,
        lower: control.lower,
        upper: control.upper,
        candles,
        breakIndex: index,
        latestTimestamp,
        formedAt: control.formedAt,
      });
      built.push({
        sourceOfTruth: 'scanner_final_boss_mss_zone_lifecycle',
        direction,
        role: 'final_boss_mss_zone',
        lower: control.lower,
        upper: control.upper,
        midpoint: roundBossZonePrice((control.lower + control.upper) / 2),
        mssLine,
        lineInSand: mssLine,
        sourceTimeframe: '15M',
        formedAt: control.formedAt,
        formedCandleIndex: control.formedCandleIndex,
        mssBreakAt: breakTime,
        mssBreakCandleIndex: completedCandleIndex(breakCandle),
        state: state.state,
        stateReason: state.stateReason,
        ageTradingDays: state.ageTradingDays,
        expiresAfterTradingDays: 3,
        flipDirection: state.flipDirection,
        use: direction === 'LONG'
          ? 'Bull final boss zone produced the 15M structure shift higher; pullbacks into it are support/reaction context unless completed candles accept below it.'
          : 'Bear final boss zone produced the 15M structure shift lower; rallies into it are resistance/reaction context unless completed candles accept above it.',
        invalidation: direction === 'LONG'
          ? `Bull final boss control fails on completed 15M acceptance below ${control.lower.toFixed(2)}; after reclaim it becomes reaction context.`
          : `Bear final boss control fails on completed 15M acceptance above ${control.upper.toFixed(2)}; after reclaim it becomes reaction context.`,
        approvalBoundary: {
          changesTradeApprovals: false,
          changesCanExecute: false,
          changesEntryStopTargets: false,
        },
      });
    }
  }
  const bySide = (direction: Exclude<SetupCandidate['direction'], 'NO TRADE'>) => built
    .filter((zone) => zone.direction === direction && zone.state !== 'expired')
    .sort((a, b) => {
      const aFlipped = a.state === 'flipped_reaction' ? 1 : 0;
      const bFlipped = b.state === 'flipped_reaction' ? 1 : 0;
      if (aFlipped !== bFlipped) return aFlipped - bFlipped;
      return (b.mssBreakAt ? new Date(b.mssBreakAt).getTime() : 0) - (a.mssBreakAt ? new Date(a.mssBreakAt).getTime() : 0);
    })
    .slice(0, 2);
  const bull = bySide('LONG');
  const bear = bySide('SHORT');
  return {
    bull,
    bear,
    primaryBull: bull[0] || null,
    primaryBear: bear[0] || null,
  };
}

function retainedBossZoneState(args: {
  direction: Exclude<SetupCandidate['direction'], 'NO TRADE'>;
  lower: number;
  upper: number;
  latestClose: number | null;
  chartContext?: Partial<ChartContext> | null;
}): { state: DeskRetainedBossZoneState; reason: string } {
  const candles = [
    ...(args.chartContext?.multiTimeframeContext?.fiveMinute.candles || []),
    ...(args.chartContext?.candles || []),
    ...(args.chartContext?.multiTimeframeContext?.fifteenMinute.candles || []),
  ];
  const touchedAndHeld = candles.some((candle) => {
    const high = completedCandleHigh(candle);
    const low = completedCandleLow(candle);
    const close = completedCandleClose(candle);
    if (high === null || low === null || close === null) return false;
    const touched = high >= args.lower && low <= args.upper;
    if (!touched) return false;
    return args.direction === 'LONG' ? close >= args.lower : close <= args.upper;
  });
  const close = args.latestClose;
  if (close === null) {
    return {
      state: touchedAndHeld ? 'defended' : 'unknown',
      reason: touchedAndHeld
        ? 'A completed candle touched the zone and closed back on the defended side; scanner reference price is unavailable.'
        : 'Scanner reference price is unavailable, so boss-zone state is context only.',
    };
  }
  if (args.direction === 'LONG' && close < args.lower) {
    return {
      state: 'invalidated',
      reason: `Scanner reference price ${close.toFixed(2)} is below the bull boss zone floor ${args.lower.toFixed(2)}.`,
    };
  }
  if (args.direction === 'SHORT' && close > args.upper) {
    return {
      state: 'invalidated',
      reason: `Scanner reference price ${close.toFixed(2)} is above the bear boss zone ceiling ${args.upper.toFixed(2)}.`,
    };
  }
  if (touchedAndHeld) {
    return {
      state: 'defended',
      reason: 'A completed candle touched the zone and closed back on the defended side; wick-through is treated as defense, not failure.',
    };
  }
  return {
    state: 'alive',
    reason: 'Zone remains alive because no completed close accepted through it.',
  };
}

function buildRetainedBossZone(args: {
  item: NonNullable<ReturnType<typeof selectRetainedBossZone>>;
  latestClose: number | null;
  chartContext?: Partial<ChartContext> | null;
  role?: DeskRetainedBossZoneRole;
}): DeskRetainedBossZone {
  const direction = args.item.zone.direction;
  const role = args.role || 'final_boss_zone';
  const state = retainedBossZoneState({
    direction,
    lower: args.item.lower,
    upper: args.item.upper,
    latestClose: args.latestClose,
    chartContext: args.chartContext,
  });
  const label = role === 'active_mss_protected_boss_zone'
    ? direction === 'LONG'
      ? 'Active MSS-Protected Bull Boss Support'
      : 'Active MSS-Protected Bear Boss Resistance'
    : direction === 'LONG'
      ? 'Bull Final Boss Support'
      : 'Bear Final Boss Resistance';
  return {
    sourceOfTruth: 'scanner_retained_boss_zone_ledger',
    direction,
    role,
    lower: args.item.lower,
    upper: args.item.upper,
    midpoint: args.item.midpoint,
    lineInSand: direction === 'LONG' ? args.item.lower : args.item.upper,
    sourceTimeframe: '15M',
    formedAt: args.item.zone.formedAt ?? null,
    formedCandleIndex: typeof args.item.zone.formedCandleIndex === 'number' ? args.item.zone.formedCandleIndex : null,
    confidence: args.item.zone.confidence,
    state: state.state,
    stateReason: state.reason,
    use: direction === 'LONG'
      ? `${label}: watch as downside support/reaction context if price pulls back or holds above it.`
      : `${label}: watch as upside resistance/reaction context if price rallies into it or fails to reclaim it.`,
    holdCondition: direction === 'LONG'
      ? `Bull zone holds while completed candles defend ${args.item.lower.toFixed(2)}-${args.item.upper.toFixed(2)} and close back above the zone floor.`
      : `Bear zone holds while completed candles defend ${args.item.lower.toFixed(2)}-${args.item.upper.toFixed(2)} and close back below the zone ceiling.`,
    invalidation: direction === 'LONG'
      ? `Invalidated only by completed acceptance below ${args.item.lower.toFixed(2)}. Wick-through alone is defense if it closes back above.`
      : `Invalidated only by completed acceptance above ${args.item.upper.toFixed(2)}. Wick-through alone is defense if it closes back below.`,
    approvalBoundary: {
      changesTradeApprovals: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
    },
  };
}

function selectActiveMssProtectedBossZone(args: {
  zones: ReturnType<typeof fifteenMinuteBossZoneFacts>;
  latestClose: number | null;
  chartContext?: Partial<ChartContext> | null;
}): DeskRetainedBossZone | null {
  const candidates = args.zones
    .map((item) => ({
      item,
      state: retainedBossZoneState({
        direction: item.zone.direction,
        lower: item.lower,
        upper: item.upper,
        latestClose: args.latestClose,
        chartContext: args.chartContext,
      }),
    }))
    .filter(({ item, state }) => {
      if (state.state === 'invalidated') return false;
      if (!bossZoneHasFifteenMinuteMssProtection(item, args.chartContext)) return false;
      if (args.latestClose === null) return state.state === 'defended';
      if (item.zone.direction === 'LONG') return args.latestClose >= item.lower;
      return args.latestClose <= item.upper;
    });
  if (!candidates.length) return null;
  const selected = candidates
    .sort((a, b) => {
      const aDefended = a.state.state === 'defended' ? 0 : 1;
      const bDefended = b.state.state === 'defended' ? 0 : 1;
      if (aDefended !== bDefended) return aDefended - bDefended;
      const timeDiff = bossZoneFormedAtMs(b.item) - bossZoneFormedAtMs(a.item);
      if (timeDiff !== 0) return timeDiff;
      const aDistance = args.latestClose === null ? 0 : priceDistanceFromZone({ lower: a.item.lower, upper: a.item.upper } as DeskHtfFvgParentZone, args.latestClose);
      const bDistance = args.latestClose === null ? 0 : priceDistanceFromZone({ lower: b.item.lower, upper: b.item.upper } as DeskHtfFvgParentZone, args.latestClose);
      return aDistance - bDistance;
    })[0];
  return selected
    ? buildRetainedBossZone({
        item: selected.item,
        latestClose: args.latestClose,
        chartContext: args.chartContext,
        role: 'active_mss_protected_boss_zone',
      })
    : null;
}

function buildRetainedBossZoneLedger(args: {
  chartContext?: Partial<ChartContext> | null;
  currentPrice?: number | null;
}): DeskRetainedBossZoneLedger {
  const facts = fifteenMinuteBossZoneFacts(args.chartContext);
  const latestClose = numericOrNull(args.currentPrice) ?? latestCompletedCloseForBossLedger(args.chartContext);
  const bull = selectRetainedBossZone(facts, 'LONG');
  const bear = selectRetainedBossZone(facts, 'SHORT');
  const activeMssProtectedBossZone = selectActiveMssProtectedBossZone({
    zones: facts,
    latestClose,
    chartContext: args.chartContext,
  });
  const finalBossMssZones = buildFinalBossMssZones({
    zones: facts,
    chartContext: args.chartContext,
  });
  const zones = [bull, bear]
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map((item) => buildRetainedBossZone({ item, latestClose, chartContext: args.chartContext }));
  const activeZones = zones.filter((zone) => zone.state !== 'invalidated');
  const activeFinalBossMssCount = finalBossMssZones.bull.length + finalBossMssZones.bear.length;
  const bullBoss = zones.find((zone) => zone.direction === 'LONG') || null;
  const bearBoss = zones.find((zone) => zone.direction === 'SHORT') || null;
  return {
    sourceOfTruth: 'scanner_retained_boss_zone_ledger',
    bullBoss,
    bearBoss,
    activeMssProtectedBossZone,
    finalBossMssZones,
    zones,
    summary: activeZones.length
      ? `Retained ${activeZones.length} final-boss FVG zone(s) and ${activeFinalBossMssCount} final-boss MSS lifecycle zone(s) from 15M OHLC. They remain map context until completed-candle invalidation, flip, replacement, or 3 trading-day expiry.`
      : 'No retained 15M final-boss FVG zones are active from structured OHLC.',
    approvalBoundary: {
      changesTradeApprovals: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      createsNewModel: false,
    },
  };
}

function htfFvgParentZonesFromChartContext(args: {
  chartContext?: Partial<ChartContext> | null;
  direction?: 'LONG' | 'SHORT' | null;
  currentPrice?: number | null;
}): DeskHtfFvgParentZone[] {
  const mtf = args.chartContext?.multiTimeframeContext;
  if (!mtf) return [];
  const sets = [
    mtf.fifteenMinute,
    mtf.oneHour,
    mtf.twoHour,
    mtf.fourHour,
  ].filter((set): set is TimeframeFactSet => Boolean(set));
  return sets.flatMap((set) =>
    (set.fvgZones || [])
      .map((zone) => htfParentZoneFromFvgFact({
        direction: args.direction,
        timeframe: set.timeframe,
        zone,
        currentPrice: args.currentPrice,
      }))
      .filter((zone): zone is DeskHtfFvgParentZone => Boolean(zone))
  );
}

function priceDistanceFromZone(zone: DeskHtfFvgParentZone, price: number | null): number {
  if (price === null) return 9999;
  if (price >= zone.lower && price <= zone.upper) return 0;
  return Math.min(Math.abs(price - zone.lower), Math.abs(price - zone.upper));
}

function selectActiveHtfFvgParentZone(args: {
  chartContext?: Partial<ChartContext> | null;
  direction?: 'LONG' | 'SHORT' | null;
  currentPrice?: number | null;
  lineInSand?: number | null;
}): DeskHtfFvgParentZone | null {
  const currentPrice = numericOrNull(args.currentPrice);
  const lineInSand = numericOrNull(args.lineInSand);
  const zones = htfFvgParentZonesFromChartContext({
    chartContext: args.chartContext,
    direction: args.direction,
    currentPrice,
  });
  if (!zones.length) return null;
  return zones
    .map((zone) => {
      const priceDistance = priceDistanceFromZone(zone, currentPrice);
      const lineDistance = lineInSand === null ? 0 : priceDistanceFromZone(zone, lineInSand);
      const stateScore = zone.state === 'in_zone'
        ? -6
        : zone.state === 'holding' || zone.state === 'waiting_retest'
        ? 0
        : zone.state === 'moved_away'
        ? 12
        : 4;
      return {
        zone,
        score: (priceDistance * 2) + lineDistance + htfFvgTimeframePriority(zone.timeframe) + stateScore,
      };
    })
    .sort((a, b) => a.score - b.score || htfFvgTimeframePriority(a.zone.timeframe) - htfFvgTimeframePriority(b.zone.timeframe))[0]?.zone || null;
}

function buildHtfFvgCascade(args: {
  direction: DeskPlayDirection;
  activeTacticalZone?: DeskActiveTacticalZone | null;
  tacticalZone?: TacticalZoneBounds | null;
  primaryLifecycleItem?: ScannerCandidateLifecycleTraceItem | null;
  longLifecycleItem?: ScannerCandidateLifecycleTraceItem | null;
  shortLifecycleItem?: ScannerCandidateLifecycleTraceItem | null;
  candidate?: SetupCandidate | null;
  nextTrigger: string | null;
  currentPrice?: number | null;
  lineInSand?: number | null;
  chartContext?: Partial<ChartContext> | null;
}): DeskHtfFvgCascade | null {
  const requestedDirection = args.direction === 'LONG' || args.direction === 'SHORT' ? args.direction : null;
  const tacticalParentZone = requestedDirection
    ? htfParentZoneFromTacticalZone({
        direction: requestedDirection,
        tacticalZone: args.tacticalZone,
        currentPrice: args.currentPrice,
      })
    : null;
  const chartParentZone = tacticalParentZone ? null : selectActiveHtfFvgParentZone({
    chartContext: args.chartContext,
    direction: requestedDirection,
    currentPrice: args.currentPrice,
    lineInSand: args.lineInSand,
  });
  const parentZone = tacticalParentZone || chartParentZone;
  const direction = requestedDirection || parentZone?.direction || null;
  if (direction !== 'LONG' && direction !== 'SHORT') return null;
  const nativeFiveMinuteZone = args.activeTacticalZone?.direction === direction &&
    args.activeTacticalZone.sourceTimeframe === '5M'
    ? args.activeTacticalZone
    : null;
  if (!parentZone && !nativeFiveMinuteZone) return null;

  const childSource = nativeFiveMinuteZone ? 'native_5m_fvg' as const : 'parent_htf_zone_with_5m_trigger' as const;
  const childLower = nativeFiveMinuteZone?.lower ?? parentZone?.lower ?? null;
  const childUpper = nativeFiveMinuteZone?.upper ?? parentZone?.upper ?? null;
  const triggerNeeded = nativeFiveMinuteZone?.nextTrigger ||
    args.nextTrigger ||
    (parentZone
      ? `Use ${parentZone.timeframe} parent FVG ${parentZone.lower.toFixed(2)}-${parentZone.upper.toFixed(2)} as the map; wait for completed 5M MSS/reclaim/hold ${direction === 'LONG' ? 'above' : 'below'} the active line or inside/around that zone.`
      : 'Wait for completed 5M proof inside the active parent zone.');
  const lifecycleItem = args.primaryLifecycleItem ||
    (direction === 'LONG' ? args.longLifecycleItem : args.shortLifecycleItem) ||
    null;
  const candidateMatchesDirection = args.candidate?.direction === direction;
  const entry = numericOrNull(lifecycleItem?.entry) ?? (candidateMatchesDirection ? numericOrNull(args.candidate?.entry) : null);
  const stop = numericOrNull(lifecycleItem?.stop) ?? (candidateMatchesDirection ? numericOrNull(args.candidate?.stop) : null);
  const target1 = numericOrNull(lifecycleItem?.target1) ?? (candidateMatchesDirection ? numericOrNull(args.candidate?.target1) : null);
  const target2 = numericOrNull(lifecycleItem?.target2) ?? (candidateMatchesDirection ? numericOrNull(args.candidate?.target2) : null);
  const childExecutionZone: DeskHtfFvgChildExecutionZone = {
    sourceOfTruth: 'scanner_htf_fvg_child_execution_zone',
    direction,
    timeframe: '5M',
    source: childSource,
    lower: childLower,
    upper: childUpper,
    anchorLine: nativeFiveMinuteZone?.anchorLine ?? parentZone?.midpoint ?? null,
    entry,
    stop,
    target1,
    target2,
    triggerNeeded,
  };
  const parentText = parentZone
    ? `${parentZone.timeframe} parent FVG ${parentZone.lower.toFixed(2)}-${parentZone.upper.toFixed(2)}`
    : 'native 5M FVG';
  const childText = childSource === 'native_5m_fvg'
    ? `native 5M zone ${childLower !== null && childUpper !== null ? `${childLower.toFixed(2)}-${childUpper.toFixed(2)}` : 'mapped'}`
    : 'parent HTF zone with completed 5M trigger';
  const standDown = parentZone
    ? direction === 'LONG'
      ? `Stand down on completed 5M acceptance below parent zone ${parentZone.lower.toFixed(2)}.`
      : `Stand down on completed 5M acceptance above parent zone ${parentZone.upper.toFixed(2)}.`
    : nativeFiveMinuteZone?.standDown || 'Stand down if the active 5M zone fails on completed candle proof.';
  return {
    sourceOfTruth: 'scanner_htf_fvg_cascade_parent_zone_routing',
    direction,
    parentZone,
    childExecutionZone,
    routingSummary: `HTF-first routing: ${parentText} frames the map; ${childText} supplies the 5M execution route. Execution still requires app-owned 5M trigger, protected stop, risk, target room, model, session, and canExecute gates.`,
    standDown,
    approvalBoundary: {
      changesTradeApprovals: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      changesRiskRules: false,
      createsNewModel: false,
    },
  };
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

function lifecycleItemReadinessText(item: ScannerCandidateLifecycleTraceItem | null): string {
  if (!item) return '';
  return [
    item.blockReason,
    item.nextTrigger,
    item.requiredTrigger,
    item.filteredOutReason,
    item.lineInSandReason,
    item.targetReactionReason,
    ...item.missingEvidence,
    ...item.missingLevels,
  ].filter(Boolean).join(' ').toLowerCase();
}

function buildTradeReadiness(args: {
  direction: 'LONG' | 'SHORT';
  item: ScannerCandidateLifecycleTraceItem | null;
  modelFit: DeskPlayApprovedModelFit;
  executableConsideration: DeskPlayExecutableConsideration;
}): DeskPlayTradeReadiness {
  const boundary = {
    changesTradeApprovals: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    changesRiskRules: false,
    createsNewModel: false,
  } as const;
  const base = {
    sourceOfTruth: 'scanner_trade_readiness_routing' as const,
    direction: args.direction,
    approvalBoundary: boundary,
  };
  if (args.modelFit.status === 'data_limited' || args.executableConsideration.status === 'data_limited') {
    return {
      ...base,
      status: 'data_limited',
      label: 'DATA LIMITED',
      action: 'Repair HTF context before treating this as structure-confirmed.',
      reason: 'HTF protected-structure context is data-limited.',
      missingProof: args.executableConsideration.missingGates.length ? args.executableConsideration.missingGates : args.modelFit.missingProof,
    };
  }
  if (args.modelFit.status !== 'best_fit' || args.executableConsideration.status === 'not_aligned') {
    return {
      ...base,
      status: 'not_aligned',
      label: 'NOT ALIGNED',
      action: 'Keep visible as review/context only.',
      reason: args.modelFit.reason || 'This side is not routed into the aligned protected-structure model.',
      missingProof: args.modelFit.missingProof,
    };
  }
  if (args.item?.executionStatus === ExecutionStatus.Blocked) {
    return {
      ...base,
      status: 'blocked',
      label: 'BLOCKED',
      action: 'Do not treat as executable; keep the blocker visible.',
      reason: args.item.blockReason || 'Candidate is blocked by existing scanner gates.',
      missingProof: args.executableConsideration.missingGates,
    };
  }
  const readinessText = lifecycleItemReadinessText(args.item);
  const missedNoChase = /\b(missed|do not chase|no chase|chase|stale|already reached|left too fast|move occurred without preferred retest|preferred entry was missed)\b/i.test(readinessText);
  const needsBetterEntry = /\b(better pullback|new protected 5m|new 5m|new retest|pullback|retest|wide protected stop|fragile|no fresh entry|preferred retest)\b/i.test(readinessText);
  if (missedNoChase) {
    return {
      ...base,
      status: 'missed_no_chase',
      label: 'MISSED / NO CHASE',
      action: 'Wait for a fresh pullback, retest, or new protected 5M MSS structure.',
      reason: 'Existing scanner evidence marks chase or stale-entry risk.',
      missingProof: args.executableConsideration.missingGates,
    };
  }
  if (needsBetterEntry) {
    return {
      ...base,
      status: 'wait_for_pullback_or_new_5m_structure',
      label: 'WAIT FOR BETTER ENTRY',
      action: 'Wait for pullback/retest or new protected 5M MSS before execution consideration.',
      reason: 'Approved model route exists, but the current route still needs better entry quality or fresh 5M proof.',
      missingProof: args.executableConsideration.missingGates,
    };
  }
  if (args.executableConsideration.status === 'ready_for_existing_can_execute_gate') {
    return {
      ...base,
      status: 'execution_candidate',
      label: 'EXECUTION CANDIDATE',
      action: 'Hand to the existing canExecute gate; this layer does not approve execution.',
      reason: 'Approved model route has complete scanner-owned levels and proof metadata.',
      missingProof: [],
    };
  }
  return {
    ...base,
    status: 'review_only_missing_proof',
    label: 'REVIEW ONLY',
    action: 'Wait for completed 5M trigger/retest plus normal app-owned gates.',
    reason: args.executableConsideration.gateSummary,
    missingProof: args.executableConsideration.missingGates,
  };
}

function buildDirectionalBias(
  direction: 'LONG' | 'SHORT',
  item: ScannerCandidateLifecycleTraceItem | null,
  primaryDirection: DeskPlayDirection,
  htfProtectedStructureMap: DeskHtfProtectedStructureMap,
  modelFit: DeskPlayApprovedModelFit,
  executableConsideration: DeskPlayExecutableConsideration,
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
    modelFit,
    executableConsideration,
    tradeReadiness: buildTradeReadiness({
      direction,
      item,
      modelFit,
      executableConsideration,
    }),
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

function buildDeskPlayModelRouting(args: {
  primaryDirection: DeskPlayDirection;
  longModelFit: DeskPlayApprovedModelFit;
  shortModelFit: DeskPlayApprovedModelFit;
  longExecutableConsideration: DeskPlayExecutableConsideration;
  shortExecutableConsideration: DeskPlayExecutableConsideration;
}): PrimaryDeskPlay['modelRouting'] {
  const primaryFit = args.primaryDirection === 'LONG'
    ? args.longModelFit
    : args.primaryDirection === 'SHORT'
    ? args.shortModelFit
    : null;
  const executableConsideration = args.primaryDirection === 'LONG'
    ? args.longExecutableConsideration
    : args.primaryDirection === 'SHORT'
    ? args.shortExecutableConsideration
    : null;
  const routingSummary = primaryFit?.status === 'best_fit'
    ? `${args.primaryDirection} routes to active model ${primaryFit.modelName}; execution still requires normal canExecute gates.`
    : args.primaryDirection === 'WAIT'
    ? 'No protected-structure side is routed into an active primary model as the active desk direction.'
    : `${args.primaryDirection} has no execution-eligible active model route this cycle.`;
  return {
    sourceOfTruth: 'scanner_protected_structure_model_routing',
    primaryDirection: args.primaryDirection,
    bestActiveModel: primaryFit?.setupType || null,
    bestActiveModelName: primaryFit?.modelName || null,
    bestApprovedModel: primaryFit?.setupType || null,
    bestApprovedModelName: primaryFit?.modelName || null,
    longModelFit: args.longModelFit,
    shortModelFit: args.shortModelFit,
    executableConsideration,
    routingSummary,
    approvalBoundary: {
      changesTradeApprovals: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      createsNewModel: false,
    },
  };
}

function lifecycleItemPrimaryEligible(
  item: ScannerCandidateLifecycleTraceItem | null,
  htfProtectedStructureMap: DeskHtfProtectedStructureMap,
): boolean {
  if (!item) return false;
  if (lifecycleItemHasProtectedStructureSupport(item, htfProtectedStructureMap)) return true;
  if (lifecycleItemIsHighQualityConditionalReview(item)) return true;
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
  chartContext?: Partial<ChartContext> | null;
}): PrimaryDeskPlay {
  const htfProtectedStructureMap = buildHtfProtectedStructureMap(args.candidate, args.htfLiquidityDrawState, args.currentPrice);
  const trendConfirmation = buildProtectedStructureTrendConfirmation(htfProtectedStructureMap);
  const primaryDirection = selectPrimaryDeskPlayDirection(args.candidateLifecycleTrace, htfProtectedStructureMap);
  const longModelFit = buildApprovedModelFit({
    direction: 'LONG',
    item: args.candidateLifecycleTrace.bestLongPlan,
    htfProtectedStructureMap,
  });
  const shortModelFit = buildApprovedModelFit({
    direction: 'SHORT',
    item: args.candidateLifecycleTrace.bestShortPlan,
    htfProtectedStructureMap,
  });
  const longExecutableConsideration = buildExecutableConsideration({
    direction: 'LONG',
    item: args.candidateLifecycleTrace.bestLongPlan,
    modelFit: longModelFit,
  });
  const shortExecutableConsideration = buildExecutableConsideration({
    direction: 'SHORT',
    item: args.candidateLifecycleTrace.bestShortPlan,
    modelFit: shortModelFit,
  });
  const modelRouting = buildDeskPlayModelRouting({
    primaryDirection,
    longModelFit,
    shortModelFit,
    longExecutableConsideration,
    shortExecutableConsideration,
  });
  const longBias = buildDirectionalBias('LONG', args.candidateLifecycleTrace.bestLongPlan, primaryDirection, htfProtectedStructureMap, longModelFit, longExecutableConsideration);
  const shortBias = buildDirectionalBias('SHORT', args.candidateLifecycleTrace.bestShortPlan, primaryDirection, htfProtectedStructureMap, shortModelFit, shortExecutableConsideration);
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
  const nextTrigger = primaryBias?.nextTrigger ||
    args.visibilityMetadata.nextTrigger ||
    args.candidateLifecycleTrace.nextTrigger ||
    null;
  const activeTacticalLine = buildActiveTacticalLine({
    direction: primaryDirection,
    originalLine: selectedLine,
    htfProtectedStructureMap,
  });
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
    ? trendConfirmation.status === 'aligned' && trendConfirmation.direction === primaryDirection
      ? `${trendConfirmation.summary} Opposite side stays visible as ${oppositeBias?.state || 'not_present'}.`
      : `${directionLabel(primaryDirection)} remains primary while its line/trigger holds. Opposite side stays visible as ${oppositeBias?.state || 'not_present'}.`
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
  const fvgDecisionZone = buildFvgDecisionZone(args.candidate, args.currentPrice);
  const retainedBossZones = buildRetainedBossZoneLedger({
    chartContext: args.chartContext,
    currentPrice: args.currentPrice,
  });
  const activeMssProtectedBossZone = retainedBossZones.activeMssProtectedBossZone;
  const activeTacticalZoneSource = primaryLifecycleItem?.tacticalZone || selectedLifecycleItem?.tacticalZone || args.candidate?.tacticalZone || null;
  const activeTacticalZone = buildActiveTacticalZone({
    direction: primaryDirection,
    activeLine: activeTacticalLine,
    tacticalZone: activeTacticalZoneSource,
    fvgDecisionZone,
    nextTrigger,
    currentPrice: args.currentPrice,
  });
  const htfFvgCascade = buildHtfFvgCascade({
    direction: primaryDirection,
    activeTacticalZone,
    tacticalZone: activeTacticalZoneSource,
    primaryLifecycleItem,
    longLifecycleItem: args.candidateLifecycleTrace.bestLongPlan,
    shortLifecycleItem: args.candidateLifecycleTrace.bestShortPlan,
    candidate: args.candidate,
    nextTrigger,
    currentPrice: args.currentPrice,
    lineInSand: activeTacticalLine.activeLine ?? selectedLine,
    chartContext: args.chartContext,
  });
  const htfObjectiveLadder = buildHtfObjectiveLadder({
    direction: primaryDirection,
    candidate: args.candidate,
    primaryLifecycleItem,
    targetReaction,
    htfProtectedStructureMap,
  });
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
    trendConfirmation,
    activeTacticalLine,
    activeTacticalZone,
    modelRouting,
    title,
    summary,
    lineInSand: selectedLine,
    longAbove: longBias.lineInSand,
    shortBelow: shortBias.lineInSand,
    targetReactionLevel,
    targetReactionLabel,
    targetReactionReason,
    levelTransition,
    fvgDecisionZone,
    retainedBossZones,
    activeMssProtectedBossZone,
    htfFvgCascade,
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
      'Retained boss zones keep bull and bear 15M final-boss FVG context visible until completed-candle invalidation.',
      'Active MSS-protected boss zone reports the most recent defended 15M FVG battle line as context only.',
    ],
  };
}

function candidateCanSurfaceInDeskState(args: {
  state: ScannerState;
  candidate: SetupCandidate | null;
}): boolean {
  if (!args.candidate) return false;
  if (args.state === 'TriggerPending') return false;
  if (args.candidate.blockReason) return false;
  if (args.candidate.executionStatus === ExecutionStatus.Blocked) return false;
  return true;
}

function visibleCandidateLifecycleTrace(
  trace: ScannerCandidateLifecycleTrace,
  candidate: SetupCandidate | null,
): ScannerCandidateLifecycleTrace {
  if (candidate) return trace;
  return {
    ...trace,
    bestLongPlan: null,
    bestShortPlan: null,
    selectedCandidateKey: null,
    selectedCandidate: null,
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
  chartContext?: Partial<ChartContext> | null;
}): DeskState {
  const rawCandidate = args.candidate || null;
  const candidate = candidateCanSurfaceInDeskState({ state: args.state, candidate: rawCandidate }) ? rawCandidate : null;
  const candidateLifecycleTrace = visibleCandidateLifecycleTrace(args.candidateLifecycleTrace, candidate);
  const canExecute = Boolean(args.canExecute) && Boolean(candidate);
  const marketMode = marketModeFromDeskVisibility({
    state: args.state,
    visibilityMode: args.visibilityMetadata.visibilityMode,
  });
  const promotion = buildDeskStatePromotionPath({
    marketMode,
    visibilityMetadata: args.visibilityMetadata,
    candidateLifecycleTrace,
    candidate,
    canExecute,
  });
  const primaryDeskPlay = buildPrimaryDeskPlay({
    candidate,
    visibilityMetadata: args.visibilityMetadata,
    candidateLifecycleTrace,
    targetCascade: args.targetCascade,
    htfLiquidityDrawState: args.htfLiquidityDrawState,
    currentPrice: args.currentPrice,
    canExecute,
    chartContext: args.chartContext,
  });
  return {
    sourceOfTruth: 'scanner_desk_state',
    marketMode,
    activeCampaign: candidate?.activeCampaign || null,
    bestLongPlan: candidateLifecycleTrace.bestLongPlan,
    bestShortPlan: candidateLifecycleTrace.bestShortPlan,
    selectedCandidate: candidateLifecycleTrace.selectedCandidate,
    primaryDeskPlay,
    lineInSand: candidate?.activeRuleset?.htfLineInSand?.lineInSand ?? primaryDeskPlay.lineInSand,
    nextTrigger: args.visibilityMetadata.nextTrigger || primaryDeskPlay.nextTrigger || candidateLifecycleTrace.nextTrigger,
    invalidation: candidate?.invalidation || primaryDeskPlay.invalidation,
    visibilityMode: args.visibilityMetadata.visibilityMode,
    discordAction: args.visibilityMetadata.discordAction,
    suppressionReason: args.visibilityMetadata.suppressionReason,
    htfContextStatus: htfContextStatusForDeskState(candidate, args.htfLiquidityDrawState),
    dataQualityStatus: dataQualityStatusForDeskState({
      visibilityMetadata: args.visibilityMetadata,
      candidateLifecycleTrace,
    }),
    canExecute,
    promotion,
    visibilityMetadata: args.visibilityMetadata,
    candidateLifecycleTrace,
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
  const watchToPlanPromotionProofed = hasDeskStateCycles && states.every((state) =>
    Array.isArray(state.promotion.requiredProof) &&
    state.promotion.requiredProof.length > 0 &&
    Array.isArray(state.promotion.blockedBy) &&
    state.promotion.blockedBy.length > 0 &&
    state.promotion.canPromoteNow === false
  );
  const canExecuteBoundaryPreserved = hasDeskStateCycles && states.every((state) =>
    state.canExecute === state.visibilityMetadata.authority.canExecute &&
    state.promotion.approvalBoundary?.changesTradeApprovals === false &&
    state.promotion.approvalBoundary?.changesCanExecute === false &&
    state.promotion.approvalBoundary?.changesEntryStopTargets === false &&
    state.promotion.approvalBoundary?.changesRiskRules === false &&
    state.promotion.approvalBoundary?.changesBridgeBehavior === false
  );
  const noChasePreserved = hasDeskStateCycles && states.every((state) => {
    const text = [
      state.nextTrigger,
      state.promotion.promotionTrigger,
      ...state.promotion.requiredProof,
      ...state.promotion.blockedBy,
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
    watchToPlanPromotionProofed
      ? 'Promotion snapshots carried required proof, blocker metadata, and canPromoteNow=false.'
      : 'One or more promotion snapshots lacked proof/blocker metadata or changed canPromoteNow.',
    canExecuteBoundaryPreserved
      ? 'Promotion metadata preserved canExecute and no-approval-change boundaries across replay snapshots.'
      : 'Promotion metadata diverged from canExecute or approval-boundary constraints.',
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
    watchToPlanPromotionProofed,
    canExecuteBoundaryPreserved,
    noChasePreserved,
    singleSourceOfTruthPresent,
    discordRagUiAligned,
    promotionBoundary: {
      changesTradeApprovals: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      changesRiskRules: false,
      changesBridgeBehavior: false,
    },
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

const FVG_RUNTIME_SIGNAL_WEIGHTS = {
  LIQUIDITY_SWEEP: 25,
  RECLAIM_AFTER_SWEEP: 15,
  WICK_REJECTION_SUPPORT: 10,
  FVG_FAILURE_REVERSAL: 20,
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

const FVG_RUNTIME_SCORE_THRESHOLDS = {
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
  if (score >= FVG_RUNTIME_SCORE_THRESHOLDS.QUALIFIED) return 'Qualified only if the FVG Trading System v1 story, 5M confirmation, structure stop, actual risk, and target room remain confirmed.';
  if (score >= FVG_RUNTIME_SCORE_THRESHOLDS.CONDITIONAL) return 'Conditional: good FVG map, but wait for the missing confirmation before execution.';
  if (score >= FVG_RUNTIME_SCORE_THRESHOLDS.WATCHLIST) return 'Watchlist: monitor the FVG battle zone, but do not execute until the active FVG model and deterministic risk gate complete.';
  return 'No trade: score is below the desk threshold or required evidence is missing.';
}

function isFvgTradingSystemSupportWatch(candidate: SetupCandidate | null | undefined): boolean {
  if (!candidate) return false;
  const hasDecisionArea =
    (typeof candidate.activeRuleset?.htfLineInSand?.lineInSand === 'number' &&
      Number.isFinite(candidate.activeRuleset.htfLineInSand.lineInSand) &&
      candidate.activeRuleset.htfLineInSand.lineInSand > 0) ||
    (typeof candidate.entry === 'number' && Number.isFinite(candidate.entry) && candidate.entry > 0);

  return (
    candidate.setupType === SetupType.FvgTradingSystemV1 &&
    candidate.executionStatus === ExecutionStatus.Conditional &&
    candidate.humanReview?.canExecute === false &&
    candidate.humanReview.requiresTraderConfirmation === true &&
    hasDecisionArea
  );
}

function fvgRuntimeHardDisqualifierReason(candidate: SetupCandidate): string | null {
  const blockReason = (candidate.blockReason ?? '').toLowerCase();

  if (blockReason.includes('chop')) return 'Chop/consolidation no-trade';
  if (blockReason.includes('consolidation')) return 'Chop/consolidation no-trade';
  if (blockReason.includes('overlap')) return 'Chop/consolidation no-trade';
  if (blockReason.includes('no displacement')) return 'No confirmed displacement';
  if (blockReason.includes('expired')) return 'FVG runtime setup expired: stale/chase guard active';
  if (blockReason.includes('chase')) return 'FVG runtime setup expired: stale/chase guard active';
  if (blockReason.includes('stale')) return 'FVG runtime setup expired: stale/chase guard active';
  if (blockReason.includes('outside session')) return 'Outside approved session';

  const risk = candidate.riskPoints;

  const reward =
    typeof candidate.target2 === 'number' && typeof candidate.entry === 'number'
      ? Math.abs(candidate.target2 - candidate.entry)
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

function extractFvgRuntimeSignals(candidate: SetupCandidate) {
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

    hasFvgFailureReversal:
      scenario.includes('fvg failure') ||
      scenario.includes('failed fvg') ||
      setupType.includes('fvg failure') ||
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
    : window.session === 'lunch' || window.session === 'evening'
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
    const hardBlocker = 'no FVG Trading System v1 candidate/reference level';
    return {
      score: FVG_RUNTIME_SCORE_THRESHOLDS.NO_TRADE,
      qualifiedReasons,
      missingReasons: [hardBlocker],
      hardBlocker,
      recommendation: recommendationForScore(FVG_RUNTIME_SCORE_THRESHOLDS.NO_TRADE, hardBlocker),
      scorecard: [{
        label: 'Registered model',
        score: 0,
        max: 25,
        status: 'blocked',
        note: 'No registered FVG Trading System v1 candidate was available.',
      }],
    };
  }

  if (!window.allowsDeskPlan || sessionWeight === 0) {
    const hardBlocker = 'futures market closed or scanner review monitor disabled';
    return {
      score: FVG_RUNTIME_SCORE_THRESHOLDS.NO_TRADE,
      qualifiedReasons,
      missingReasons: [hardBlocker],
      hardBlocker,
      recommendation: recommendationForScore(FVG_RUNTIME_SCORE_THRESHOLDS.NO_TRADE, hardBlocker),
      scorecard: [{
        label: 'Time window',
        score: 0,
        max: 10,
        status: 'blocked',
        note: 'The scanner only pauses review-plan evaluation during futures weekend closure or when the review monitor is disabled.',
      }],
    };
  }

  const hardDisqualifierReason = fvgRuntimeHardDisqualifierReason(candidate);
  if (hardDisqualifierReason) {
    return {
      score: FVG_RUNTIME_SCORE_THRESHOLDS.NO_TRADE,
      qualifiedReasons,
      missingReasons: [hardDisqualifierReason],
      hardBlocker: hardDisqualifierReason,
      recommendation: recommendationForScore(FVG_RUNTIME_SCORE_THRESHOLDS.NO_TRADE, hardDisqualifierReason),
      scorecard: [{
        label: 'Hard blocker',
        score: 0,
        max: 25,
        status: 'blocked',
        note: hardDisqualifierReason,
      }],
    };
  }

  const signals = extractFvgRuntimeSignals(candidate);
  const wickOnly =
    signals.hasWickRejectionSupport &&
    !signals.hasReclaimAfterSweep &&
    !signals.hasDisplacement &&
    !signals.hasMarketStructureShift &&
    !signals.hasFvgOrImbalanceEntry &&
    !signals.hasFvgFailureReversal &&
    !higherTimeframeAligned;

  if (wickOnly) {
    const hardBlocker = 'Wick rejection support is not enough without a valid FVG Trading System v1 parent story, completed 5M confirmation, protected stop, and target path';
    return {
      score: FVG_RUNTIME_SCORE_THRESHOLDS.NO_TRADE,
      qualifiedReasons: [],
      missingReasons: [hardBlocker],
      hardBlocker,
      recommendation: recommendationForScore(FVG_RUNTIME_SCORE_THRESHOLDS.NO_TRADE, hardBlocker),
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
  add(signals.hasLiquiditySweep, FVG_RUNTIME_SIGNAL_WEIGHTS.LIQUIDITY_SWEEP, 'Liquidity sweep confirmed', 'No confirmed liquidity sweep');
  add(signals.hasReclaimAfterSweep, FVG_RUNTIME_SIGNAL_WEIGHTS.RECLAIM_AFTER_SWEEP, 'Reclaim after sweep confirmed', 'No confirmed liquidity sweep');
  add(signals.hasWickRejectionSupport, FVG_RUNTIME_SIGNAL_WEIGHTS.WICK_REJECTION_SUPPORT, 'Wick rejection support', 'Wick rejection support missing');
  add(signals.hasFvgFailureReversal, FVG_RUNTIME_SIGNAL_WEIGHTS.FVG_FAILURE_REVERSAL, 'FVG failure/reversal evidence', 'No confirmed FVG failure/reversal evidence');
  add(signals.hasDisplacement, FVG_RUNTIME_SIGNAL_WEIGHTS.DISPLACEMENT_CONFIRMED, 'Displacement confirmed', 'No confirmed displacement');
  add(signals.hasMarketStructureShift, FVG_RUNTIME_SIGNAL_WEIGHTS.MARKET_STRUCTURE_SHIFT, 'Market structure shift confirmed', 'No confirmed market structure shift');
  add(signals.hasFvgOrImbalanceEntry, FVG_RUNTIME_SIGNAL_WEIGHTS.FVG_OR_IMBALANCE_ENTRY, 'Fair value gap / imbalance entry model', 'No fair value gap / imbalance entry model');
  add(signals.hasPremiumDiscountAlignment, FVG_RUNTIME_SIGNAL_WEIGHTS.PREMIUM_DISCOUNT_ALIGNMENT, 'Premium/discount alignment', 'Premium/discount alignment missing');
  add(higherTimeframeAligned, FVG_RUNTIME_SIGNAL_WEIGHTS.HTF_BIAS_ALIGNED, 'Higher-timeframe bias aligned', 'Higher-timeframe bias not aligned');
  add(
    candidate.executionStatus === ExecutionStatus.Executable || candidate.executionStatus === ExecutionStatus.Conditional,
    FVG_RUNTIME_SIGNAL_WEIGHTS.EXECUTION_READY,
    'Entry, stop, and target available',
    'Entry, stop, and target unavailable'
  );

  if (signals.isStaleOrChasing) missingReasons.push('FVG runtime setup expired: stale/chase guard active');
  if (signals.isCountertrendAgainstBigPicture) {
    missingReasons.push('Countertrend setup requires immediate failure confirmation; do not fight big-picture structure');
  }

  const structureWeight = signals.isCountertrendAgainstBigPicture ? 0.6 : 1;
  const weightedScore = score * sessionWeight * structureWeight;
  const finalScore = Math.max(0, Math.min(100, Math.round(weightedScore)));
  const modelCompletion = clampScore(
    (signals.hasLiquiditySweep ? 6 : 0) +
    (signals.hasReclaimAfterSweep ? 6 : 0) +
    (signals.hasFvgFailureReversal || signals.hasFvgOrImbalanceEntry || isFvgTradingSystemSupportWatch(candidate) ? 7 : 0) +
    (signals.hasDisplacement || signals.hasMarketStructureShift ? 6 : 0) +
    (isFvgTradingSystemSupportWatch(candidate) ? 6 : 0),
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
        note: isFvgTradingSystemSupportWatch(candidate)
          ? 'FVG Trading System v1 support watch is active from aligned HTF/15M story, 5M confirmation, and a named decision area.'
          : signals.hasFvgFailureReversal
            ? 'FVG failure/reversal evidence is present.'
            : signals.hasFvgOrImbalanceEntry
              ? 'FVG parent/entry imbalance evidence is present.'
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
    return { shouldSend: false, reason: 'Futures market closed or Discord review monitor disabled. Context updated locally only.' };
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
    return {
      shouldSend: false,
      reason: 'TriggerPending is internal readback only; Discord requires an approved plan with completed 5M proof.',
    };
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
    if (isFvgTradingSystemSupportWatch(args.candidate) && (args.candidate?.modelConfidenceScore ?? args.confidence) >= 56) {
      return { shouldSend: true, reason: 'FVG Trading System v1 support watch qualified for Discord: aligned HTF/15M story plus completed 5M confirmation. Decision support only; no automated orders.' };
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
