/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DayType = 'LONG' | 'SHORT' | 'WAIT' | 'NO TRADE';

export type SessionStatus = 'PRE-MARKET' | 'OBSERVATION' | 'ENTRY' | 'CLOSED';

export enum TradeDecisionStatus {
  ApprovedTrade = 'ApprovedTrade',
  ConditionalTrade = 'ConditionalTrade',
  NoTrade = 'NoTrade',
  Wait = 'Wait',
  InvalidScreenshot = 'InvalidScreenshot',
  OutsideRules = 'OutsideRules',
}

export enum BiasDirection {
  Bullish = 'Bullish',
  Bearish = 'Bearish',
  Neutral = 'Neutral',
  NoBias = 'NoBias',
}

export enum SetupType {
  NoSetup = 'NoSetup',
}

export enum NoTradeReason {
  InvalidScreenshot = 'InvalidScreenshot',
  OutsideTimeWindow = 'OutsideTimeWindow',
  MissingInstrument = 'MissingInstrument',
  MissingRequiredContext = 'MissingRequiredContext',
  MissingKeyLevels = 'MissingKeyLevels',
  NoClearBias = 'NoClearBias',
  NoApprovedSetup = 'NoApprovedSetup',
  EntryTriggerMissing = 'EntryTriggerMissing',
  EntryTriggerPending = 'EntryTriggerPending',
  InvalidStopLocation = 'InvalidStopLocation',
  RiskTooWide = 'RiskTooWide',
  TargetsUnavailable = 'TargetsUnavailable',
  KillSwitchActive = 'KillSwitchActive',
  ConflictingStructure = 'ConflictingStructure',
  ConflictingRagHistory = 'ConflictingRagHistory',
  ChasingExtendedMove = 'ChasingExtendedMove',
  LowConfidence = 'LowConfidence',
}

export enum RiskStatus {
  Approved = 'Approved',
  Warning = 'Warning',
  Blocked = 'Blocked',
  Unknown = 'Unknown',
}

export type RiskAdvisoryStatus =
  | 'RISK_WITHIN_STANDARD_LIMIT'
  | 'RISK_ABOVE_STANDARD_LIMIT'
  | 'RISK_EXTENDED_STRUCTURAL'
  | 'RISK_INVALID_OR_UNDEFINED';

export type RiskPolicy = 'STANDARD_RISK' | 'STRUCTURAL_RISK_ACKNOWLEDGED';

export type ExtractedRiskStatus = 'WithinLimit' | 'Warning' | 'RiskTooWide' | 'Unknown';

export enum SetupCandidateStatus {
  Detected = 'Detected',
  Possible = 'Possible',
  NotDetected = 'NotDetected',
  Blocked = 'Blocked',
  Conditional = 'Conditional',
  Invalid = 'Invalid',
}

export enum ExecutionStatus {
  Executable = 'Executable',
  Conditional = 'Conditional',
  Blocked = 'Blocked',
  NotDetected = 'NotDetected',
  Invalid = 'Invalid',
}

export enum TradeDecisionStep {
  ConfirmSessionAndInstrument = 'ConfirmSessionAndInstrument',
  ConfirmScreenshotUsability = 'ConfirmScreenshotUsability',
  IdentifyMarketContext = 'IdentifyMarketContext',
  IdentifyKeyLevels = 'IdentifyKeyLevels',
  DetermineBias = 'DetermineBias',
  CheckApprovedTimeWindow = 'CheckApprovedTimeWindow',
  IdentifySetupType = 'IdentifySetupType',
  ValidateEntryTrigger = 'ValidateEntryTrigger',
  ValidateStopLocation = 'ValidateStopLocation',
  ValidateRiskLimit = 'ValidateRiskLimit',
  DetermineTargetModel = 'DetermineTargetModel',
  DefineInvalidation = 'DefineInvalidation',
  DecideTradeOrNoTrade = 'DecideTradeOrNoTrade',
  GenerateFinalTradePlan = 'GenerateFinalTradePlan',
  SaveJournalReadyRecord = 'SaveJournalReadyRecord',
}

export interface KeyLevels {
  midnightOpen?: number | null;
  currentPrice?: number | null;
  rthOpen?: number | null;
  openingRangeHigh?: number | null;
  openingRangeLow?: number | null;
  initialBalanceHigh?: number | null;
  initialBalanceLow?: number | null;
  ethHigh?: number | null;
  ethLow?: number | null;
  asianHigh?: number | null;
  asianLow?: number | null;
  londonHigh?: number | null;
  londonLow?: number | null;
  nyPremarketHigh?: number | null;
  nyPremarketLow?: number | null;
  previousDayHigh?: number | null;
  previousDayLow?: number | null;
  priorDayHigh?: number | null;
  priorDayLow?: number | null;
  overnightHigh?: number | null;
  overnightLow?: number | null;
  nearestSupport?: number | null;
  nearestResistance?: number | null;
  activeSwingHigh?: number | null;
  activeSwingLow?: number | null;
  triggerCandleHigh?: number | null;
  triggerCandleLow?: number | null;
  morningHigh?: number | null;
  morningLow?: number | null;
  morningHighSweep?: number | null;
  morningLowSweep?: number | null;
}

export type SessionSegmentName =
  | 'previous_rth'
  | 'prior_eth'
  | 'three_day_rth'
  | 'three_day_eth'
  | 'weekly_rth'
  | 'weekly_eth'
  | 'monthly_rth'
  | 'monthly_eth'
  | 'asian'
  | 'london'
  | 'ny_premarket'
  | 'rth_morning'
  | 'lunch'
  | 'full_context'
  | 'current_window';

export type StructuralLevelType =
  | 'high'
  | 'low'
  | 'support'
  | 'resistance'
  | 'imbalance_zone'
  | 'imbalance_midpoint'
  | 'displacement_origin'
  | 'midnight_open'
  | 'rth_open'
  | 'round_number'
  | 'swing'
  | 'liquidity_pool'
  | 'gap'
  | 'unknown';

export interface StructuralLevel {
  label: string;
  price: number;
  type: StructuralLevelType;
  source: SessionSegmentName | 'manual' | 'screenshot' | 'ninjatrader' | 'app';
  directionRelevance: 'LONG' | 'SHORT' | 'BOTH';
  confidence: ReadConfidence;
  touches?: number;
  timestamp?: string | null;
  evidence?: string;
  strengthScore?: number;
  strengthLabel?: 'High' | 'Medium' | 'Low';
  contextRuleTags?: string[];
  contextNote?: string;
}

export interface SessionLevelRelationship {
  id: string;
  label: string;
  bias: 'LONG' | 'SHORT' | 'BOTH' | 'NEUTRAL';
  scoreImpact: number;
  evidence: string;
}

export interface SessionLevelContext {
  levels: StructuralLevel[];
  relationships: SessionLevelRelationship[];
  strongestLongLevels: StructuralLevel[];
  strongestShortLevels: StructuralLevel[];
  levelsToWatch: StructuralLevel[];
  notes: string[];
}

export interface SessionStats {
  name: SessionSegmentName;
  label: string;
  barCount: number;
  high: number | null;
  low: number | null;
  open: number | null;
  close: number | null;
  midpoint: number | null;
  rangePoints: number | null;
  trend: 'bullish' | 'bearish' | 'balanced' | 'unknown';
}

export interface SessionImbalanceZone {
  id: string;
  session: SessionSegmentName;
  label: string;
  direction: 'LONG' | 'SHORT';
  upper: number;
  lower: number;
  midpoint: number;
  originPrice?: number | null;
  confidence: ReadConfidence;
  displacementScore: number;
  evidence: string;
}

export interface SessionStory {
  segments: SessionStats[];
  displacementZones: SessionImbalanceZone[];
  relationships: SessionLevelRelationship[];
  bias: 'LONG' | 'SHORT' | 'BALANCED' | 'WAIT';
  summary: string;
  targetLevels: StructuralLevel[];
  notes: string[];
}

export interface TargetObjective {
  label: string;
  price: number;
  direction: 'LONG' | 'SHORT';
  source: StructuralLevel['source'];
  type: StructuralLevelType;
  confidence: ReadConfidence;
  score: number;
  distancePoints?: number | null;
  rMultiple?: number | null;
  reason: string;
}

export interface TargetObjectivePlan {
  selectedT1?: TargetObjective | null;
  selectedT2?: TargetObjective | null;
  nearestObstacleTarget?: TargetObjective | null;
  obstacleTarget1?: TargetObjective | null;
  nearestLiquidityTarget?: TargetObjective | null;
  liquidityTarget1?: TargetObjective | null;
  liquidityTarget2?: TargetObjective | null;
  liquidityRunnerTarget?: TargetObjective | null;
  runnerTarget?: TargetObjective | null;
  targetManagementInstruction?: string | null;
  liquidityMapSummary?: string | null;
  targetPathWarning?: string | null;
  targetQuality: 'clear_path' | 'target_blocked' | 'no_liquidity_map';
  objectives: TargetObjective[];
  notes: string[];
  targetModel: 'actual_r_with_structural_context' | 'fixed_r_with_structural_context';
}

export type ReadConfidence = 'High' | 'Medium' | 'Low' | 'Unreadable';
export type TrendState = 'bullish' | 'bearish' | 'neutral' | 'range' | 'chop' | 'unknown';
export type CandleDirection = 'bullish' | 'bearish' | 'doji' | 'unknown';
export type PriceDirection = 'LONG' | 'SHORT' | 'NO TRADE';
export type SwingType = 'high' | 'low';
export type LevelRole = 'support' | 'resistance' | 'liquidity' | 'magnet' | 'invalidation' | 'unknown';

export interface ExtractedLevelFact {
  label: string;
  price: number | null;
  role: LevelRole;
  source: 'ocr' | 'manual' | 'inferred' | 'unknown';
  confidence: ReadConfidence;
  evidence?: string;
}

export interface ChartCandleFact {
  index: number;
  timestamp?: string | null;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
  direction: CandleDirection;
  bodyQuality?: 'small' | 'normal' | 'large' | 'unknown';
  upperWickQuality?: 'none' | 'small' | 'large' | 'unknown';
  lowerWickQuality?: 'none' | 'small' | 'large' | 'unknown';
  isExpansion?: boolean;
  isRejection?: boolean;
  isBreather?: boolean;
  isReclaim?: boolean;
  confidence: ReadConfidence;
}

export interface SwingPointFact {
  type: SwingType;
  price: number | null;
  timestamp?: string | null;
  candleIndex?: number | null;
  label?: string;
  confidence: ReadConfidence;
}

export interface FvgZoneFact {
  direction: Exclude<PriceDirection, 'NO TRADE'>;
  upper: number | null;
  lower: number | null;
  midpoint?: number | null;
  formedAt?: string | null;
  formedCandleIndex?: number | null;
  filledPercent?: number | null;
  inverted?: boolean;
  reclaimed?: boolean;
  reclaimTimestamp?: string | null;
  impulseQualified?: boolean;
  impulseBodyRatio?: number | null;
  impulseRangeRatio?: number | null;
  confidence: ReadConfidence;
}

export interface BreakerZoneFact {
  direction: Exclude<PriceDirection, 'NO TRADE'>;
  upper: number | null;
  lower: number | null;
  midpoint?: number | null;
  formedAt?: string | null;
  source?: 'ohlc' | 'ninjatrader' | 'screenshot' | 'manual' | 'app';
  confidence: ReadConfidence;
  evidence?: string;
}

export interface LiquidityEventFact {
  type: 'sweep' | 'reclaim' | 'equal_highs' | 'equal_lows' | 'pdh_sweep' | 'pdl_sweep' | 'unknown';
  direction: PriceDirection;
  level: number | null;
  sweptLevelLabel?: string;
  reclaimed: boolean;
  timestamp?: string | null;
  confidence: ReadConfidence;
  evidence?: string;
}

export interface ReclaimEventFact {
  direction: Exclude<PriceDirection, 'NO TRADE'>;
  reclaimedLevel: number | null;
  levelLabel?: string;
  timestamp?: string | null;
  candleIndex?: number | null;
  confidence: ReadConfidence;
  evidence?: string;
}

export interface FailedBreakEventFact {
  direction: Exclude<PriceDirection, 'NO TRADE'>;
  failedLevel: number | null;
  levelLabel?: string;
  sweptExtreme?: number | null;
  timestamp?: string | null;
  candleIndex?: number | null;
  confidence: ReadConfidence;
  evidence?: string;
}

export interface DisplacementCandleFact {
  direction: Exclude<PriceDirection, 'NO TRADE'>;
  candleIndex: number;
  timestamp?: string | null;
  session?: SessionSegmentName | null;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
  bodyPoints?: number | null;
  rangePoints?: number | null;
  bodyToRange?: number | null;
  closeLocation?: 'top_quarter' | 'bottom_quarter' | 'middle' | 'unknown';
  displacementScore?: number;
  quality?: 'possible' | 'confirmed' | 'high_quality';
  leavesImbalance?: boolean;
  breaksStructure?: boolean;
  confidence: ReadConfidence;
  evidence?: string;
}

export interface SetupReadyFacts {
  pullbackIntoFvg?: boolean;
  fvgReclaimed?: boolean;
  breakOfStructure?: boolean;
  sweepThenReclaim?: boolean;
  notes?: string[];
}

export interface TimeframeFactSet {
  timeframe: '4h' | '2h' | '1h' | '15m' | '5m';
  role: 'macro_context' | 'session_structure' | 'liquidity_map' | 'execution';
  barCount: number;
  high: number | null;
  low: number | null;
  open: number | null;
  close: number | null;
  midpoint: number | null;
  rangePoints: number | null;
  trend: 'bullish' | 'bearish' | 'balanced' | 'unknown';
  candles: ChartCandleFact[];
  fvgZones: FvgZoneFact[];
  fullWindowCandles?: ChartCandleFact[];
  fullWindowFvgZones?: FvgZoneFact[];
  liquiditySweeps: LiquidityEventFact[];
  reclaimEvents: ReclaimEventFact[];
  failedBreakEvents: FailedBreakEventFact[];
  displacementCandles: DisplacementCandleFact[];
  structuralLevels: StructuralLevel[];
  confidence: ReadConfidence;
  notes: string[];
}

export interface MultiTimeframeAlignment {
  macroBias: 'LONG' | 'SHORT' | 'NEUTRAL' | 'UNKNOWN';
  sessionBias: 'LONG' | 'SHORT' | 'NEUTRAL' | 'UNKNOWN';
  liquidityBias: 'LONG' | 'SHORT' | 'NEUTRAL' | 'UNKNOWN';
  executionBias: 'LONG' | 'SHORT' | 'NEUTRAL' | 'UNKNOWN';
  alignedDirection: 'LONG' | 'SHORT' | 'NEUTRAL' | 'CONFLICTED' | 'UNKNOWN';
  conflicts: string[];
  notes: string[];
}

export interface MultiTimeframeContext {
  source: 'ninjatrader_bridge';
  authority: 'ohlc_facts_only';
  fourHour: TimeframeFactSet;
  twoHour?: TimeframeFactSet;
  oneHour: TimeframeFactSet;
  fifteenMinute: TimeframeFactSet;
  fiveMinute: TimeframeFactSet;
  alignment: MultiTimeframeAlignment;
  targetMap: {
    nearestUpsideLiquidity?: StructuralLevel | null;
    majorUpsideLiquidity?: StructuralLevel | null;
    nearestDownsideLiquidity?: StructuralLevel | null;
    majorDownsideLiquidity?: StructuralLevel | null;
    levelsToWatch: StructuralLevel[];
  };
  rules: {
    higherTimeframesApproveTrades: false;
    fiveMinuteExecutionRequired: true;
    aiMayOverwriteOhlcFacts: false;
  };
  notes: string[];
}

export type MssEvidenceTimeframe = '5M' | '15M' | '60M' | '120M' | '240M';
export type MssEvidenceDirection = 'bullish' | 'bearish' | 'neutral' | 'unknown';
export type MssEvidenceStatus =
  | 'confirmed_mss'
  | 'displacement_without_mss'
  | 'pending_incomplete_bar'
  | 'no_mss'
  | 'insufficient_data'
  | 'unknown';
export type CompletedBarStatus = 'completed' | 'incomplete' | 'unknown';
export type BridgeBarTimestampMode = 'open' | 'close';
export type BridgeBarTimeZoneMode = 'eastern' | 'central' | 'pacific' | 'local';

export interface TimeframeMssEvidence {
  timeframe: MssEvidenceTimeframe;
  direction: MssEvidenceDirection;
  status: MssEvidenceStatus;
  displacementQuality: {
    present: boolean;
    direction: Exclude<MssEvidenceDirection, 'neutral' | 'unknown'> | null;
    score: number;
    bodyToRange: number | null;
    closeLocation: number | null;
    rangeExpansion: number | null;
  };
  breaksStructure: boolean;
  structureBreak?: {
    type: 'mss' | 'bos_continuation' | 'none' | 'insufficient_swings';
    brokenLevel: number | null;
    brokenSwingTimestamp: string | null;
    priorStructureDirection: MssEvidenceDirection;
    closeThroughPoints: number | null;
    wickOnlyBreak: boolean;
  };
  evidenceTimestamp: string | null;
  completedBarStatus: CompletedBarStatus;
  barTimestampMode: BridgeBarTimestampMode;
  barTimeZone: BridgeBarTimeZoneMode;
  source: 'ninjatrader_ohlc';
  blockers: string[];
  confidence: number;
}

export interface MultiTimeframeMssEvidenceLayer {
  source: 'ninjatrader_ohlc';
  authority: 'ohlc_facts_only';
  boundary: 'evidence_only_not_approval_or_execution_authority';
  timeframes: Record<MssEvidenceTimeframe, TimeframeMssEvidence>;
  notes: string[];
  approvesExecution: false;
  changesTradeLogic: false;
}

export interface GapContextFact {
  gapPresent: boolean;
  direction: 'gap_up' | 'gap_down' | 'none' | 'unknown';
  priorClose?: number | null;
  openPrice?: number | null;
  gapSizePoints?: number | null;
  fillTarget?: number | null;
  fillAttempted?: boolean;
  confidence: ReadConfidence;
}

export interface CompressionRangeFact {
  present: boolean;
  high?: number | null;
  low?: number | null;
  barsCount?: number | null;
  breakoutDirection?: PriceDirection;
  confidence: ReadConfidence;
}

export interface MarketStructureFacts {
  trend: TrendState;
  higherHigh: boolean;
  higherLow: boolean;
  lowerHigh: boolean;
  lowerLow: boolean;
  marketStructureShift: boolean;
  chopRangeCondition: boolean;
  compressionCondition?: boolean;
  expansionCondition?: boolean;
}

export interface HigherTimeframeThesis {
  direction: PriceDirection;
  confidence: 'High' | 'Medium' | 'Low';
  sourceTimeframes: string[];
  reason: string;
  invalidationLevel?: number | null;
  drawOnLiquidity?: number | null;
  drawOnLiquidityLabel?: string | null;
}

export interface StructureQualityContext {
  direction: PriceDirection;
  structureEvent: 'major_bos' | 'minor_bos' | 'choch' | 'none';
  structureTimeframe?: '240m' | '60m' | '15m' | '5m' | 'mixed';
  executionTimeframeConfirmed?: boolean;
  inducementSwept: boolean;
  validPullbackConfirmed: boolean;
  structureBreakConfirmedByClose?: boolean;
  wickOnlyBreak?: boolean;
  oldInducementStale: boolean;
  newInducementRequired: boolean;
  noChaseRequired: boolean;
  inducementFresh?: boolean;
  inducementAgeBars?: number | null;
  chochAtMeaningfulLocation?: boolean;
  chochLocationType?:
    | 'prior_rth'
    | 'prior_eth'
    | 'weekly_monthly'
    | 'session_extreme'
    | 'fvg'
    | 'breaker'
    | 'liquidity_pool'
    | 'midrange'
    | 'unknown';
  conflictsWithHigherTimeframeThesis?: boolean;
  reasons: string[];
  missingReasons: string[];
}

export interface DealingRangeQuality {
  rangeHigh: number | null;
  rangeLow: number | null;
  midpoint: number | null;
  currentPrice: number | null;
  location: 'premium' | 'discount' | 'equilibrium' | 'unknown';
  rangeSource?: '240m' | '60m' | '15m' | '5m' | 'session' | 'manual' | 'unknown';
  confidence: 'High' | 'Medium' | 'Low';
  reason?: string;
}

export interface NewsMacroCaution {
  active: boolean;
  eventLabel?: string | null;
  minutesUntil?: number | null;
  minutesAfter?: number | null;
  confirmedAfterRelease?: boolean;
  reason?: string | null;
}

export interface CandleFacts {
  lastClosedCandleDirection: CandleDirection;
  expansionCandlePresent: boolean;
  rejectionWickPresent: boolean;
  breatherCandlePresent: boolean;
  reclaimCandlePresent: boolean;
  pullbackPresent: boolean;
  closeAboveKeyLevel?: boolean;
  closeBelowKeyLevel?: boolean;
}

export interface StructuredSetupEvidence {
  detected: boolean;
  possible?: boolean;
  direction?: 'LONG' | 'SHORT' | 'NO TRADE' | null;
  entry?: number | null;
  stop?: number | null;
  invalidation?: string | null;
  requiredTrigger?: string | null;
  triggerState?: 'TRIGGERED' | 'PENDING_TRIGGER' | 'NO_TRIGGER' | null;
  confidence?: 'High' | 'Medium' | 'Low' | null;
  evidence?: string[];
  missingEvidence?: string[];
  sourceFacts?: string[];
  levelRefs?: string[];
  candleRefs?: number[];
  confidenceReason?: string | null;
}

export interface StructuredSetupEvidenceMap {
  liquiditySweep?: StructuredSetupEvidence;
  fairValueGap?: StructuredSetupEvidence;
  imbalancePullback?: StructuredSetupEvidence;
  orderBlockRetest?: StructuredSetupEvidence;
  momentumRunaway?: StructuredSetupEvidence;
  compressionBreakout?: StructuredSetupEvidence;
  openingGapFill?: StructuredSetupEvidence;
  previousDayHighLowSweep?: StructuredSetupEvidence;
  equalHighsEqualLows?: StructuredSetupEvidence;
  breakerBlock?: StructuredSetupEvidence;
  mitigationBlock?: StructuredSetupEvidence;
  marketStructureShift?: StructuredSetupEvidence;
  openingOrderBlock?: StructuredSetupEvidence;
  initialBalanceExtension?: StructuredSetupEvidence;
  algoKillZone?: StructuredSetupEvidence;
  momentumPullbackBreatherReclaim?: StructuredSetupEvidence;
  momentumPullback?: StructuredSetupEvidence;
  morningFailedHighLiquidityRejection?: StructuredSetupEvidence;
  morningReclaimLong?: StructuredSetupEvidence;
  openingRangeContinuation?: StructuredSetupEvidence;
  lunchFailedHighReversal?: StructuredSetupEvidence;
  lunchFailedLowReversal?: StructuredSetupEvidence;
  lunchCompressionBreakout?: StructuredSetupEvidence;
  lunchFailedContinuation?: StructuredSetupEvidence;
  lunchRangeReclaim?: StructuredSetupEvidence;
}

export interface MorningWindowContext {
  complete: boolean;
  source?: 'morning_analysis' | 'morning_5m_context' | 'manual' | 'gemini_ocr' | 'unknown';
  morningHigh?: number | null;
  morningLow?: number | null;
  initialBalanceHigh?: number | null;
  initialBalanceLow?: number | null;
  openingDriveDirection?: 'bullish' | 'bearish' | 'range' | 'unknown';
  morningTrend?: 'bullish_extension' | 'bearish_extension' | 'compression_range' | 'failed_continuation' | 'unknown';
  morningHighSwept?: boolean;
  morningLowSwept?: boolean;
  failedHoldAboveMorningHigh?: boolean;
  failedHoldBelowMorningLow?: boolean;
  rangeReclaimed?: boolean;
  evidence?: string[];
  missingEvidence?: string[];
  confidence?: 'High' | 'Medium' | 'Low' | null;
}

export interface ChartExtractionWarnings {
  screenshotUnclear?: boolean;
  priceLabelsUnreadable?: boolean;
  timeframeUnverified?: boolean;
  levelsUnclear?: boolean;
  manualEntryStopRequired?: boolean;
  messages?: string[];
}

export interface ChartContext {
  sessionType: 'morning' | 'lunch' | 'evening' | 'replay_morning' | 'replay_lunch';
  instrument: 'MES' | 'MNQ';
  tradeDate: string;
  timeframe: '1m' | '5m' | '15m' | '60m' | string;
  screenshotRole?: ScreenshotRole;
  chartTimestamp?: string | null;
  screenshotTimestamp?: string | null;
  screenshotTimezone?: AISettings['screenshotTimezone'];
  screenshotUsability: 'usable' | 'warning' | 'unusable';
  screenshotWarning?: string | null;
  keyLevels: KeyLevels;
  structuralLevels?: StructuralLevel[];
  targetObjectives?: TargetObjective[];
  extractedLevels?: ExtractedLevelFact[];
  candles?: ChartCandleFact[];
  oneMinuteCandles?: ChartCandleFact[];
  swings?: SwingPointFact[];
  fvgZones?: FvgZoneFact[];
  breakerZones?: BreakerZoneFact[];
  liquidityEvents?: LiquidityEventFact[];
  liquiditySweeps?: LiquidityEventFact[];
  reclaimEvents?: ReclaimEventFact[];
  failedBreakEvents?: FailedBreakEventFact[];
  displacementCandles?: DisplacementCandleFact[];
  setupReadyFacts?: SetupReadyFacts;
  sessionLevelContext?: SessionLevelContext;
  sessionStory?: SessionStory;
  multiTimeframeContext?: MultiTimeframeContext;
  timeframeMssEvidence?: MultiTimeframeMssEvidenceLayer;
  htfLiquidityDrawState?: HtfLiquidityDrawCandidateState;
  higherTimeframeThesis?: HigherTimeframeThesis;
  structureQualityContext?: StructureQualityContext;
  dealingRangeQuality?: DealingRangeQuality;
  newsMacroCaution?: NewsMacroCaution;
  gapContext?: GapContextFact;
  compressionRange?: CompressionRangeFact;
  marketStructure?: MarketStructureFacts;
  candleFacts?: CandleFacts;
  setupEvidence?: StructuredSetupEvidenceMap;
  morningWindowContext?: MorningWindowContext;
  proposedEntry?: number | null;
  proposedStop?: number | null;
  riskPoints?: number | null;
  riskStatus?: ExtractedRiskStatus;
  scannerHistoryCoverage?: ScannerHistoryCoverageFact[];
  entryConfirmed?: boolean;
  stopConfirmed?: boolean;
  requiresManualConfirmation?: boolean;
  screenshotQuality?: ReadConfidence;
  levelReadConfidence?: ReadConfidence;
  candleReadConfidence?: ReadConfidence;
  structureReadConfidence?: ReadConfidence;
  setupReadConfidence?: ReadConfidence;
  riskReadConfidence?: ReadConfidence;
  entryStopConfidence?: ReadConfidence;
  extractionWarnings?: ChartExtractionWarnings;
  marketContext: string;
  ocrText?: string | null;
}

export type TradingPlanCandidateState =
  | 'HTF_DRAW_DETECTED'
  | 'NO_MODEL_CONTEXT_DEVELOPING'
  | 'MSS_TRIGGER_PENDING'
  | 'MSS_TRIGGER_CONFIRMED'
  | 'MSS_HOLD_TRIGGER_PENDING'
  | 'MSS_HOLD_CONFIRMED'
  | 'MSS_CONTINUATION_RETEST_PENDING'
  | 'OPENING_OBSERVATION_ARMED'
  | 'AFTER_LUNCH_DRIVE_ARMED'
  | 'HUMAN_REVIEW_READY'
  | 'OPPOSITE_SIDE_RETEST_PENDING'
  | 'OPPOSITE_SIDE_TRIGGER_CONFIRMED'
  | 'NO_FRESH_ENTRY'
  | 'REVERSAL_DELIVERY_PLAN_CANDIDATE'
  | 'QUALIFIED_CONDITIONAL'
  | 'EXECUTABLE'
  | 'NO_QUALIFIED_STATE';

export type ActiveCampaignDirection = 'LONG' | 'SHORT' | 'NO TRADE';
export type ActiveCampaignStatus =
  | 'active'
  | 'watch'
  | 'blocked'
  | 'data_limited'
  | 'not_applicable';
export type ActiveCampaignHtfRelationship =
  | 'support'
  | 'caution'
  | 'conflict'
  | 'data_limited'
  | 'none';

export interface ActiveCampaignEvidenceLayer {
  layer:
    | '15M_5M_MSS_CAMPAIGN'
    | 'HTF_MSS_DISPLACEMENT_SUPPORT'
    | 'HTF_FAILED_AUCTION_REJECTION'
    | 'HTF_OBSTACLE_TARGET_MAP'
    | '5M_FVG_EXECUTION_TRIGGER'
    | '5M_MSS_CLOSE_THROUGH_RETEST_TRIGGER';
  status: 'confirmed' | 'present' | 'pending' | 'caution' | 'conflict' | 'data_limited' | 'missing';
  direction: ActiveCampaignDirection;
  evidence: string[];
  blockers: string[];
}

export interface ActiveCampaign {
  id: string;
  source: 'app_owned_structured_ohlc';
  authority: 'campaign_context_only_not_execution_authority';
  status: ActiveCampaignStatus;
  direction: ActiveCampaignDirection;
  primaryTrigger: '15M_5M_MSS' | 'HTF_DIRECTIONAL_CAMPAIGN' | 'NONE';
  executionTimeframe: '5M';
  htfRelationship: ActiveCampaignHtfRelationship;
  confidenceAdjustment: number;
  evidenceLayers: ActiveCampaignEvidenceLayer[];
  htfContextAlignmentTimeframes: Array<'60M' | '120M' | '240M'>;
  htfConflictTimeframes: Array<'60M' | '120M' | '240M'>;
  obstacleMap: {
    lineInSand: number | null;
    reason: string | null;
    role: 'management_obstacle' | 'extension_gate' | 'none';
    caution: string | null;
  };
  deDuplication: {
    oneTradePerCampaignRecommended: true;
    enforced: boolean;
    resetPolicy: 'trade_date_direction_campaign';
  };
  notes: string[];
}

export interface ScannerHistoryCoverageFact {
  timeframe: '5m' | '15m' | '60m' | '120m' | '240m';
  requiredLookbackDays: number;
  requestedFrom: string;
  requestedTo: string;
  barsLoaded: number;
  rangeStart: string | null;
  rangeEnd: string | null;
  source: string;
  sufficient: boolean;
  warning: string | null;
  dataLimitation?: {
    status: 'none' | 'bridge_or_cache_incomplete';
    message: string | null;
    retryPolicy: 'cache_then_single_bridge_then_segmented_bridge';
    canInventMissingBars: false;
    htfPromotionAllowed: boolean;
    operatorAction?: string;
  };
}

export interface TimeframeMssCandidateState {
  timeframe: '4H' | '2H' | '1H' | '15M' | '5M';
  direction: 'bullish' | 'bearish' | 'neutral' | 'unknown';
  status:
    | 'potential_mss'
    | 'confirmed'
    | 'failed'
    | 'pending_confirm'
    | 'not_confirmed'
    | 'conflicting'
    | 'unknown';
  lifecycleState:
    | 'no_mss'
    | 'potential_mss'
    | 'mss_trigger_pending'
    | 'confirmed_mss'
    | 'post_mss_digestion'
    | 'failed_mss'
    | 'opposite_mss_confirmed'
    | 'conflicting_mss'
    | 'unknown';
  evidence: string[];
  invalidationLevel?: number;
  confirmationLevel?: number;
  externalLiquidityTarget?: string;
  confidence: number;
}

export type HtfContextSufficiencyStatus = 'sufficient' | 'data_limited' | 'missing' | 'unknown';
export type HtfClassificationReliability = 'structural' | 'data_limited' | 'estimated' | 'unknown';

export interface TimeframeContextCoverage {
  timeframe: '4H' | '2H' | '1H' | '15M' | '5M';
  barsLoaded: number;
  rangeStart?: string;
  rangeEnd?: string;
  minimumExpectedDescription: string;
  minimumSatisfied: boolean;
  status: HtfContextSufficiencyStatus;
  blocker?: string;
}

export interface HtfContextSufficiency {
  overallStatus: HtfContextSufficiencyStatus;
  timeframeCoverage: TimeframeContextCoverage[];
  dataLimited: boolean;
  blockers: string[];
  notes: string[];
}

export interface HtfLiquidityDrawCandidateState {
  source: 'ninjatrader_ohlc';
  authority: 'ohlc_facts_only';
  boundary: 'context_only_not_execution_authority' | 'candidate_creation_only_not_execution_authority';
  drawDirection?: 'buy_side' | 'sell_side' | 'none' | 'unknown';
  planDirection?: 'LONG' | 'SHORT' | 'NONE';
  macroContext: 'bullish' | 'bearish' | 'neutral' | 'unknown' | 'conflicting';
  raidState?: 'sell_side_raid' | 'buy_side_raid' | 'none' | 'unknown';
  liquidityRaidState: 'sell_side_raid' | 'buy_side_raid' | 'none' | 'unknown';
  reclaimStatus?: 'confirmed' | 'potential_mss' | 'pending_confirm' | 'not_confirmed' | 'unknown';
  externalLiquidityTarget?: string;
  classification:
    | 'HTF_DRAW_DETECTED'
    | 'NO_MODEL_CONTEXT_DEVELOPING'
    | 'MSS_TRIGGER_PENDING'
    | 'MSS_TRIGGER_CONFIRMED'
    | 'MSS_HOLD_TRIGGER_PENDING'
    | 'MSS_HOLD_CONFIRMED'
    | 'REVERSAL_DELIVERY_PLAN_CANDIDATE'
    | 'QUALIFIED_CONDITIONAL'
    | 'EXECUTABLE'
    | 'NO_QUALIFIED_STATE'
    | 'FAILED_MSS'
    | 'POST_MSS_DIGESTION'
    | 'CONFLICTING_MSS';
  timeframeStates: TimeframeMssCandidateState[];
  timeframeStack?: TimeframeMssCandidateState[];
  fiveMinuteState: TimeframeMssCandidateState;
  fiveMinuteMssTriggerConfirmed?: boolean;
  fiveMinuteMssConfirmationType?: 'swing_break_with_displacement' | 'reclaim_then_break' | 'unknown';
  postShiftState?: 'post_mss_digestion' | 'retest_pending' | 'continuation_pending' | 'opposite_mss_confirmed' | 'unknown';
  fifteenMinuteConfirmationStatus?: 'confirmed' | 'potential_mss' | 'pending_confirm' | 'not_confirmed' | 'unknown';
  activeScanWindow?: 'MORNING_SETUP_SCAN' | 'LUNCH_PM_SETUP_SCAN' | 'EVENING_SETUP_SCAN' | 'OUTSIDE_SETUP_SCAN';
  htfDrawContinuationPending: boolean;
  htfContextSufficiency?: HtfContextSufficiency;
  htfContextDataLimited?: boolean;
  timeframeCoverage?: TimeframeContextCoverage[];
  classificationReliability?: HtfClassificationReliability;
  classificationReason?: string;
  confidence: number;
  notes: string[];
  blockers: string[];
  createsTradingPlanCandidate: boolean;
  approvesExecution: false;
}

export interface BiasAssessment {
  bias: BiasDirection;
  confidence: 'High' | 'Medium' | 'Low';
  reasoning: string;
  evidence: string[];
}

export interface SetupAssessment {
  setupType: SetupType;
  status: TradeDecisionStatus;
  confidence: 'High' | 'Medium' | 'Low';
  entryTrigger: string | null;
  invalidation: string;
  reasoning: string;
  noTradeReason?: NoTradeReason | null;
  decisionQualityScore?: number | null;
  decisionQualityRecommendation?: string | null;
  decisionQualityScorecard?: DecisionQualityScoreItem[];
}

export interface DecisionQualityScoreItem {
  label: string;
  score: number;
  max: number;
  status: 'strong' | 'partial' | 'weak' | 'blocked';
  note: string;
}

export interface RiskAssessment {
  status: RiskStatus;
  advisoryStatus?: RiskAdvisoryStatus;
  riskPolicy?: RiskPolicy;
  entry: number | null;
  stop: number | null;
  riskPoints: number | null;
  maxRiskPoints: number;
  riskPercent?: number | null;
  contracts?: number | null;
  reasoning: string;
}

export interface ReducedRiskPlan {
  direction: 'LONG' | 'SHORT' | 'NO TRADE';
  entry: number | null;
  stop: number | null;
  target1?: number | null;
  target2?: number | null;
  requiredTrigger: string | null;
  invalidation: string | null;
  reasoning: string;
}

export interface TacticalZoneBounds {
  sourceOfTruth: 'ohlc_fvg_zone' | 'ohlc_imbalance_zone' | 'ohlc_retest_zone' | 'scanner_structured_zone';
  direction: 'LONG' | 'SHORT';
  lower: number;
  upper: number;
  midpoint?: number | null;
  label: string;
  sourceTimeframe: '5M' | '15M' | '60M' | '120M' | '240M' | 'unknown';
  formedAt?: string | null;
  formedCandleIndex?: number | null;
  confidence?: ReadConfidence;
  evidence: string;
}

export type MissingLevelKey =
  | 'triggerCandleHigh'
  | 'triggerCandleLow'
  | 'activeSwingHigh'
  | 'activeSwingLow'
  | 'nearestResistance'
  | 'nearestSupport'
  | 'failedHigh'
  | 'failedLow'
  | 'reclaimLevel'
  | 'breakdownLevel'
  | 'morningHigh'
  | 'morningLow'
  | 'sweepHigh'
  | 'sweepLow'
  | 'compressionHigh'
  | 'compressionLow'
  | 'openingRangeHigh'
  | 'openingRangeLow'
  | 'imbalanceZone'
  | 'displacementOrigin'
  | 'entry'
  | 'stop'
  | 'invalidation';

export interface MissingLevelRequirement {
  key: MissingLevelKey;
  label: string;
  reason: string;
  source: '5m_execution' | '15m_context' | 'morning_context' | 'manual_or_cleaner_screenshot';
  requiredFor: 'entry' | 'stop' | 'trigger' | 'target' | 'invalidation' | 'context';
}

export type TargetRoomStatus =
  | 'clean_t1_t2'
  | 'clean_t1_t2_obstructed'
  | 'blocked_before_t1'
  | 'missing_levels'
  | 'stale_or_invalidated';

export interface TargetRoomAssessment {
  targetRoomStatus: TargetRoomStatus;
  t1Available: boolean;
  t2Available: boolean;
  cleanPathToT1: boolean;
  obstacleBeforeT1: boolean;
  t2ExtensionAvailable: boolean;
  t2ExtensionObstructed: boolean;
  targetRoomReason: string;
}

export interface OneMinuteExecutionRefinement {
  status: 'available' | 'unavailable';
  source: 'ninjatrader_ohlc_1m';
  authority: 'entry_stop_refinement_only_after_5m_setup';
  direction: 'LONG' | 'SHORT';
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  riskPoints: number | null;
  protectedSwing: number | null;
  completedBarTime: string | null;
  trigger: string;
  invalidation: string | null;
  evidence: string[];
  blockers: string[];
  boundary: {
    createsSetup: false;
    overridesFiveMinuteDirection: false;
    approvesExecution: false;
    changesCanExecute: false;
  };
}

export interface SetupCandidateProofSelectionSignal {
  metadataSource: 'scanner_owned_completed_5m_proof_group';
  status: 'same_completed_5m_proof_collision' | 'not_applicable';
  selectorDecision: 'keep_later_sweep_proof' | 'prefer_replacement' | 'not_applicable';
  completedBarTime: string | null;
  groupKey: string;
  groupSize: number;
  competingSetupTypes: SetupType[];
  changesCanExecute: false;
  changesEntryStopTargets: false;
  changesRiskRules: false;
  usesOutcomeData: false;
  usesResearchLabels: false;
  usesGeminiAdvisoryText: false;
  usesLiveBridgeReadsInsideRanker: false;
  scannerVisibleInstallAllowed: false;
}

export interface SetupCandidateOvernightRaidDryRunSignal {
  metadataSource: 'scanner_owned_overnight_raid_displacement_context';
  status: 'eligible_dry_run_review' | 'blocked' | 'not_applicable';
  laneId:
    | 'overnight_high_raid_bearish_displacement_openingdrive_short'
    | 'overnight_low_raid_bullish_displacement_openingdrive_long';
  overnightLevel: number | null;
  raidTime: string | null;
  displacementTime: string | null;
  displacementScore: number | null;
  blockers: string[];
  changesCanExecute: false;
  changesEntryStopTargets: false;
  changesRiskRules: false;
  changesRanking: false;
  publishesDiscord: false;
  writesSupabase: false;
  usesOutcomeData: false;
  usesResearchLabels: false;
  usesGeminiAdvisoryText: false;
  usesLiveBridgeReadsInsideRanker: false;
  scannerVisibleInstallAllowed: false;
}

export interface SetupCandidate {
  setupType: SetupType;
  scenarioLabel?: string | null;
  candidateState?: TradingPlanCandidateState;
  pathway?: 'primary_setup_scanner' | 'opening_drive_fvg_continuation' | 'after_lunch_drive_fvg_continuation' | 'intraday_mss_micro_continuation';
  activeCampaign?: ActiveCampaign;
  htfLiquidityDrawState?: HtfLiquidityDrawCandidateState;
  tacticalZone?: TacticalZoneBounds | null;
  humanReview?: {
    status: 'OpeningObservationArmed' | 'AfterLunchDriveArmed' | 'HumanReviewReady';
    canExecute: false;
    requiresTraderConfirmation: true;
    discordTradePlanEligible: boolean;
    reason: string;
  };
  activeRuleset?: {
    timeframeMss?: {
      applied: boolean;
      status: 'passed' | 'blocked' | 'not_applicable' | 'missing_evidence_layer';
      required: 'aligned_confirmed_5m_mss';
      appliesToAllModels: true;
      affectsExecution: boolean;
      evidence: string[];
      blockers: string[];
    };
    htfLineInSand?: {
      applied: boolean;
      status: 'passed' | 'blocked' | 'not_applicable' | 'missing_context';
      required: 'completed_5m_or_15m_close_beyond_htf_line';
      appliesToAllModels: true;
      affectsExecution: boolean;
      direction: 'LONG' | 'SHORT' | 'NO TRADE';
      lineInSand: number | null;
      lineReason: string | null;
      requiredClose: string | null;
      obstacleType: StructuralLevelType | null;
      obstacleSource: StructuralLevel['source'] | null;
      evidence: string[];
      blockers: string[];
    };
  };
  direction: 'LONG' | 'SHORT' | 'NO TRADE';
  detectedStatus: SetupCandidateStatus;
  confidence: 'High' | 'Medium' | 'Low';
  priority: number;
  entry?: number | null;
  stop?: number | null;
  target1?: number | null;
  target2?: number | null;
  target1Reason?: string | null;
  target2Reason?: string | null;
  targetRoom?: TargetRoomAssessment | null;
  targetObjectivePlan?: TargetObjectivePlan | null;
  riskPoints?: number | null;
  riskAdvisoryStatus?: RiskAdvisoryStatus;
  riskPolicy?: RiskPolicy;
  modelConfidenceScore?: number | null;
  invalidation?: string | null;
  entryClarity?: number;
  stopClarity?: number;
  targetClarity?: number;
  proximityScore?: number;
  levelContextScore?: number;
  levelContextSummary?: string;
  decisionQualityScore?: number;
  decisionQualityRecommendation?: string;
  decisionQualityScorecard?: DecisionQualityScoreItem[];
  decisionQualityHardBlocker?: string | null;
  executionRefinement1m?: OneMinuteExecutionRefinement | null;
  proofSelectionSignal?: SetupCandidateProofSelectionSignal | null;
  overnightRaidDryRunSignal?: SetupCandidateOvernightRaidDryRunSignal | null;
  rankingOverlays?: Array<{
    name: 'openingdrive_combined_clean_pocket_preference' | string;
    scoreAdjustment: number;
    reason: string;
    evidence: string[];
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRiskRules: false;
    usesOutcomeData: false;
    usesDateBucket: false;
  }>;
  rankScore?: number;
  evidence: string[];
  missingEvidence: string[];
  missingLevels?: MissingLevelRequirement[];
  executionStatus: ExecutionStatus;
  blockReason: NoTradeReason | null;
  requiredTrigger: string | null;
  nextAction: string;
  reducedRiskPlan: ReducedRiskPlan | null;
}

export interface FinalOpportunitySelection {
  bestExecutableCandidate: SetupCandidate | null;
  bestConditionalCandidate: SetupCandidate | null;
  blockedCandidates?: SetupCandidate[];
  finalDecision: TradeDecisionStatus;
  noTradeReason: NoTradeReason | null;
}

export interface FinalTradePlan {
  status: TradeDecisionStatus;
  direction: 'LONG' | 'SHORT' | 'NO TRADE';
  setupType: SetupType;
  entry: number | null;
  stop: number | null;
  target: number | null;
  target1?: number | null;
  target2?: number | null;
  invalidation: string;
  risk: RiskAssessment;
  confidence: 'High' | 'Medium' | 'Low';
  reasoning: string;
  noTradeReason?: NoTradeReason | null;
  executionRefinement1m?: OneMinuteExecutionRefinement | null;
}

export type EarlyMoveReviewStatus = 'already_triggered_no_fresh_entry';

export interface EarlyMoveReview {
  status: EarlyMoveReviewStatus;
  direction: 'LONG' | 'SHORT';
  moveStart: number;
  moveExtreme: number;
  triggerArea: number | null;
  currentPrice: number | null;
  movePoints: number;
  freshEntryAvailable: false;
  summary: string;
  reason: string;
  action: string;
  journalSuggestion: string;
  approvalBoundary: {
    approvesTrade: false;
    changesEntry: false;
    changesStop: false;
    changesTargets: false;
    changesRisk: false;
  };
}

export interface MorningPlan extends FinalTradePlan {
  sessionType: 'morning' | 'replay_morning';
  requiredScreenshotRange: string;
  biasAssessment: BiasAssessment;
  setupAssessment: SetupAssessment;
}

export interface TradeDecision {
  status: TradeDecisionStatus;
  step: TradeDecisionStep;
  chartContext: ChartContext;
  biasAssessment: BiasAssessment;
  setupAssessment: SetupAssessment;
  setupCandidates?: SetupCandidate[];
  opportunitySelection?: FinalOpportunitySelection;
  earlyMoveReview?: EarlyMoveReview | null;
  riskAssessment: RiskAssessment;
  finalTradePlan: FinalTradePlan;
  noTradeReason?: NoTradeReason | null;
  journalReady: boolean;
}

export interface Trade {
  id: string;
  userId?: string; // Optional for local legacy records, required for Supabase rows
  instrument?: string; // e.g. "MES" | "MNQ"
  date: string;
  direction: 'LONG' | 'SHORT';
  dayType: DayType;
  entryPrice: number;
  exitPrice?: number;
  stopPrice: number;
  targetPrice: number;
  contracts: number;
  pnl?: number;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED' | 'EXECUTED' | 'MISSED' | 'SUCCESSFUL' | 'FAILED';
  exitReason?: 'TARGET' | 'STOP' | 'HARD EXIT' | 'MANUAL';
  manualOutcome?: 'SUCCESS' | 'FAILED';
  notes?: string;
  timestamp: number;
  screenshotUrl?: string;
  analysisType?: string;
  analysisMode?: string;
  source?: string;
  sessionType?: string;
  analysisConfidence?: number;
  analysisReasoning?: string;
  setupTags?: string[];
  outcomeLabel?: string;
  setupId?: string;
  pnlTicks?: number;
  pnlDollars?: number;

  proof_screenshot_url?: string | null;
  gemini_verdict?: 'CONFIRMED' | 'DISPUTED' | 'UNCLEAR' | null;
  gemini_confidence?: 'High' | 'Medium' | 'Low' | null;
  gemini_evidence?: string[] | null;
  gemini_notes?: string | null;
  gemini_dispute_reason?: string | null;
  proof_reviewed_at?: string | null;

  createdAt?: any;
  updatedAt?: any;
}

export interface AISettings {
  customInstructions?: string;
  temperature: number;
  tickIndex?: number;
  vixLevel?: number;
  liquidityReferenceLevels?: {
    high: number;
    low: number;
  };
  screenshotTimezone?: 'EST' | 'PST' | 'CST' | 'MST';
  morningTimeZone?: 'EST' | 'PST';
  lunchTimeZone?: 'EST' | 'PST';
  ragEnabled?: boolean;
}

export interface ProposedRule {
  id: string;
  rule: string;
  reasoning: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  timestamp: number;
  imageUrls?: string[];
}

export interface AgentReport {
  agentName: string;
  findings: string;
  ruleCitation?: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
}

export interface SessionLog {
  timestamp: string;
  instrument: string;
  final_bias: string;
  confidence: number;
  key_structural_level: string;
  recalibration_status: string;
}

export type ScreenshotRole = "5m_execution" | "15m_eth_context" | "trade_proof" | "lunch_execution";
export type AnalysisType = "morning" | "lunch" | "replay_lab/morning" | "replay_lab/lunch" | string;

export interface AnalysisScreenshotMeta {
  url?: string;
  storagePath?: string;
  role: ScreenshotRole;
  timeframe: "5m" | "15m";
  session?: "RTH" | "ETH";
  windowStart?: string;
  windowEnd?: string;
}

export interface ETHContextReview {
  available: boolean;
  status: "detected" | "missing" | "unclear";
  ethHigh?: number | null;
  ethLow?: number | null;
  asianHigh?: number | null;
  asianLow?: number | null;
  londonHigh?: number | null;
  londonLow?: number | null;
  nyPremarketHigh?: number | null;
  nyPremarketLow?: number | null;
  rthOpenRelationToEth?: "above_eth_high" | "below_eth_low" | "inside_eth_range" | "at_eth_high" | "at_eth_low" | "unknown";
  rthOpenRelationToMidnight?: "above" | "below" | "at" | "unknown";
  checklist: {
    ethHighVisible: "detected" | "missing" | "unclear" | "manually_confirmed";
    ethLowVisible: "detected" | "missing" | "unclear" | "manually_confirmed";
    asianHighVisible: "detected" | "missing" | "unclear" | "manually_confirmed";
    asianLowVisible: "detected" | "missing" | "unclear" | "manually_confirmed";
    londonHighVisible: "detected" | "missing" | "unclear" | "manually_confirmed";
    londonLowVisible: "detected" | "missing" | "unclear" | "manually_confirmed";
    midnightOpenConfirmed: "detected" | "missing" | "unclear" | "manually_confirmed";
    nyPremarketHighVisible: "detected" | "missing" | "unclear" | "manually_confirmed";
    nyPremarketLowVisible: "detected" | "missing" | "unclear" | "manually_confirmed";
    rthOpenVisible: "detected" | "missing" | "unclear" | "manually_confirmed";
    executionWindowValid: "detected" | "missing" | "unclear" | "manually_confirmed";
    ethContextWindowValid: "detected" | "missing" | "unclear" | "manually_confirmed";
  };
  planImpact?: string;
  confidenceAdjustment?: "increase" | "decrease" | "neutral";
  confidenceAdjustmentReason?: string;
}

export interface TradePlan {
  bias: "LONG" | "SHORT" | "NO TRADE";
  setupName: string;
  entry?: number | null;
  stop?: number | null;
  target?: number | null;
  invalidation: string;
  confidence: number;
  goNoGo: "GO" | "NO-GO" | "WAIT";
  reasoningSummary: string;
}

export interface ExecutionReview5m {
  structure930To1010: string;
  initialBalanceBehavior: string;
  openingCandleRead: string;
  sweepReclaim: string;
  mssChoch: string;
  entryQuality: string;
  stopPlacement: string;
  targetQuality: string;
}

export interface AfternoonTestPlan {
  morningBiasCarryover: "LONG" | "SHORT" | "NEUTRAL";
  lunchExpectation: "CONTINUATION" | "REVERSAL" | "NO TRADE" | "WAIT";
  keyMorningLevels: string[];
  ethLevelsStillRelevant: string[];
  midnightOpenRelevance: string;
  lunchTrapLevel?: number | null;
  afternoonInvalidationLevel?: number | null;
  confidence: number;
  priorityScore?: number;
  plan: string;
}

export interface AnalysisResult {
  dayType: DayType;
  reasoning: string;
  confidence: number;
  checks: {
    label: string;
    passed: boolean;
  }[];
  suggestedEntry?: number;
  suggestedStop?: number;
  suggestedTarget?: number;
  suggestedTarget15R?: number;
  suggestedTarget20R?: number;
  sweepAndReclaim?: string;
  is1055Reversal?: boolean;
  rejectionStrength?: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  levelCheck?: string;
  structureStatus?: string;
  agentReports?: AgentReport[];
  sessionLog?: SessionLog;
  monteCarloPaths?: number[][];
  tags?: string[];
  
  // Midnight Open Options
  midnightOpenSource?: "manual" | "gemini_ocr" | "undetected";
  midnightOpenOverride?: number | null;
  midnightOpenPrice?: number | null;
  midnightOpenVisible?: boolean;
  rthVsMidnight?: "above" | "below" | "at" | "unknown";
  retraceProbability?: number | null;
  midnightOpenNote?: string;
  isTargetToday?: boolean;
  midnightOpenInstrument?: string;
  midnightOpenConfirmedAt?: string;
  midnightOpenDate?: string;
  midnightOpenStatus?: "confirmed" | "stale" | "missing" | "ocr_unconfirmed";
  distanceFromMidnightPoints?: number;
  distanceFromMidnightTicks?: number;
  midnightRole?: "SUPPORT" | "RESISTANCE" | "MAGNET" | "NEUTRAL" | "UNCONFIRMED";
  midnightInteraction?: "ABOVE_AND_HOLDING" | "BELOW_AND_HOLDING" | "RECLAIMED" | "REJECTED" | "CHOPPING_AROUND" | "UNCONFIRMED";
  midnightPlanImpact?: string;
  midnightConfidenceAdjustment?: "increase" | "decrease" | "neutral";
  midnightConfidenceReason?: string;

  // New RAG / Pipeline specific fields
  current_rule_analysis?: {
    summary: string;
    setup_detected: string;
    rule_category: string;
    entry: number | null;
    stop: number | null;
    target_1: number | null;
    target_2: number | null;
    trigger_state?: "TRIGGERED" | "PENDING_TRIGGER" | "NO_TRIGGER";
    entry_trigger?: string | null;
    no_trade_reason: string | null;
    base_confidence: "High" | "Medium" | "Low";
  };
  rag_learning_context?: {
    rag_search_attempted: boolean;
    rag_records_found: number;
    live_records_found: number;
    replay_records_found: number;
    historical_win_count: number;
    historical_loss_count: number;
    historical_scratch_count: number;
    historical_no_trade_count: number;
    average_pnl_ticks: number;
    historical_support_rating: "SUPPORTS PLAN" | "CONFLICTS WITH PLAN" | "NEUTRAL" | "INSUFFICIENT DATA";
    confidence_adjustment: "Increased" | "Reduced" | "Unchanged";
    explanation: string;
  };
  final_trade_plan?: {
    decision: "LONG" | "SHORT" | "NO TRADE";
    entry: number | null;
    stop: number | null;
    target_1: number | null;
    target_2: number | null;
    risk_reward: string | null;
    trigger_state?: "TRIGGERED" | "PENDING_TRIGGER" | "NO_TRIGGER";
    entry_trigger?: string | null;
    final_confidence: "High" | "Medium" | "Low";
    why_this_plan: string;
    what_would_invalidate: string;
  };
  candidate_trade_plans?: CandidateTradePlan[];
  best_trade_plan?: BestTradePlan;
  trade_management_plan?: TradeManagementPlan;
  agent_learning_used?: boolean;

  // OCR Timing
  ocrTimestampStatus?: "valid" | "too_early" | "too_late" | "unreadable" | "weekend";
  ocrTimestampDelta?: number;

  // RAG and Priority
  priorityResult?: PriorityResult;
  similarSetups?: SimilarSetup[];
  agentLearningSummary?: AgentLearningSummary;
  ragContextUsed?: boolean;
  historicalContextUsed?: boolean;
  planVersionId?: string;
  setupSignature?: string;

  structuredChartContext?: Partial<ChartContext>;
  tradePlan?: TradePlan;
  executionReview5m?: ExecutionReview5m;
  ethContextReview?: ETHContextReview;
  afternoonTestPlan?: AfternoonTestPlan;
  screenshots?: AnalysisScreenshotMeta[];

  step4_RiskAudit?: {
    riskAmount: number;
    riskPercent: number;
    status: 'GO' | 'NO-GO' | 'WARNING';
    auditLog: string;
    monteCarloForecast: string;
    probabilitySuccess: number;
  };
  midnightAnalysis?: {
    level: number;
    band: [number, number];
    interactions: {
      timestamp: string;
      price: number;
      type: 'WICK_REJECTION' | 'PIERCE' | 'CLOSE_BEYOND';
      session: 'ETH' | 'RTH_OPEN' | 'RTH_LATER';
    }[];
    role: 'SUPPORT' | 'RESISTANCE' | 'NEUTRAL';
    wickVetoCandidate: boolean;
    vetoCount: number;
    justification: string;
    proposals: {
      option: 'A' | 'B' | 'C';
      title: string;
      description: string;
      pros: string[];
      cons: string[];
      recommendation: string;
    }[];
  };
}

export interface CandidateTradePlan {
  id?: string;
  rank?: number;
  setup_name: string;
  rule_category?: string;
  direction: "LONG" | "SHORT" | "NO TRADE";
  entry: number | null;
  stop: number | null;
  target_1: number | null;
  target_2: number | null;
  trigger_state?: "TRIGGERED" | "PENDING_TRIGGER" | "NO_TRIGGER";
  entry_trigger?: string | null;
  confidence: "High" | "Medium" | "Low";
  priority_score?: number | null;
  invalidation: string;
  why_this_plan: string;
  rag_support?: "SUPPORTS PLAN" | "CONFLICTS WITH PLAN" | "NEUTRAL" | "INSUFFICIENT DATA";
  selected?: boolean;
  rejection_reason?: string | null;
}

export interface BestTradePlan {
  selected_candidate_id?: string;
  decision: "LONG" | "SHORT" | "NO TRADE";
  entry: number | null;
  stop: number | null;
  target_1: number | null;
  target_2: number | null;
  trigger_state?: "TRIGGERED" | "PENDING_TRIGGER" | "NO_TRIGGER";
  entry_trigger?: string | null;
  final_confidence: "High" | "Medium" | "Low";
  priority_score?: number | null;
  why_it_won: string;
  rejected_alternatives: {
    setup_name: string;
    rejection_reason: string;
  }[];
  rag_support?: "SUPPORTS PLAN" | "CONFLICTS WITH PLAN" | "NEUTRAL" | "INSUFFICIENT DATA";
  what_would_invalidate: string;
}

export interface TradeManagementPlan {
  management_style: "T1_FIRST" | "RUNNER" | "SCALP_ONLY" | "NO_MANAGEMENT";
  primary_success_target: "T1" | "T2" | "STRUCTURE_BASED";
  move_stop_to_breakeven_at: number | null;
  trail_stop_after_t1: number | null;
  partial_exit_at_t1: boolean;
  runner_rules: string;
  failure_warning: string;
  if_price_reaches_1r: string;
  if_price_reaches_t1: string;
  if_price_reverses_before_t1: string;
  if_two_bar_failure_appears: string;
  outcome_labels: {
    stopped_out: string;
    t1_hit: string;
    t2_hit: string;
    partial_then_stop: string;
    near_t1_then_reversed: string;
  };
  management_reasoning: string;
}

export interface SessionState {
  date: string;
  dailyInstrument?: "MES" | "MNQ";
  dayType?: DayType;
  trades: Trade[];
  accountEquity: number;
  riskPercent: number;
  killSwitches: {
    losses: number;
    fills: number;
  };
  aiSettings?: AISettings;
  analysisResult?: AnalysisResult;
  lunchAnalysisResult?: AnalysisResult;
  replayMorningResult?: AnalysisResult;
  replayLunchResult?: AnalysisResult;
  morningScreenshot?: string;
  morningEthScreenshot?: string;
  lunchScreenshot?: string;
}

export interface AppState {
  currentSession: SessionState;
  history: Trade[];
  customRules: ProposedRule[];
}

export interface RAGSaveContext {
  analysis_mode?: string;
  source?: string;
  sessionType: "morning" | "lunch";
  workflowMode?: "morning" | "lunch" | "replay" | string;
  sessionMode?: "morning" | "lunch" | string;
  ampm?: "AM" | "PM" | string | null;
  chartTimezone?: "EST" | "PST" | string | null;
  instrument: "MES" | "MNQ";
  tradeDate: string;
  dayOfWeek: string;
  midnightOpenPrice?: number | null;
  midnightOpenInstrument?: string | null;
  midnightOpenSource?: "manual" | "gemini_ocr" | "undetected" | string | null;
  midnightOpenConfirmedAt?: string | null;
  midnightOpenDate?: string | null;
  midnightOpenStatus?: "confirmed" | "stale" | "missing" | "ocr_unconfirmed" | string | null;
  distanceFromMidnightPoints?: number | null;
  distanceFromMidnightTicks?: number | null;
  midnightRole?: "SUPPORT" | "RESISTANCE" | "MAGNET" | "NEUTRAL" | "UNCONFIRMED" | string | null;
  midnightInteraction?: "ABOVE_AND_HOLDING" | "BELOW_AND_HOLDING" | "RECLAIMED" | "REJECTED" | "CHOPPING_AROUND" | "UNCONFIRMED" | string | null;
  midnightPlanImpact?: string | null;
  midnightConfidenceAdjustment?: "increase" | "decrease" | "neutral" | string | null;
  midnightConfidenceReason?: string | null;

  rthVsMidnight?: "above" | "below" | "at" | "unknown" | string;
  retraceProbability?: number | null;
  ibHigh?: number | null;
  ibLow?: number | null;
  ibPosition?: string;
  entryPrice?: number | null;
  exitPrice?: number | null;
  stopPrice?: number | null;
  t1?: number | null;
  t2?: number | null;
  riskPoints?: number | null;
  riskRewardT1?: string | null;
  riskRewardT2?: string | null;
  planSource?: string | null;
  whyThisPlan?: string | null;
  invalidation?: string | null;
  pnlTicks?: number | null;
  pnlDollars?: number | null;
  contracts?: number;
  accountEquity?: number | null;
  riskPercent?: number | null;
  riskBudgetDollars?: number | null;
  geminiConfidence?: "High" | "Medium" | "Low";
  geminiVerdict?: "CONFIRMED" | "DISPUTED" | "UNCLEAR" | null;
  geminiAnalysisJson?: Record<string, unknown> | any;
  ocrText?: string;
  screenshotUrl?: string; // Legacy, optional
  proofScreenshotUrl?: string;
  proofSubmitted?: boolean;
  tradeConfirmed?: boolean;
  tradeTaken?: boolean;
  outcome?: string | null;
  ruleVersion?: string | null;
  workflowTimestamp?: string | null;
  screenshots?: Record<string, any> | null;
  chartContext?: Record<string, any> | Partial<ChartContext> | null;
  setupCandidates?: SetupCandidate[] | any[] | null;
  selectedSetup?: Record<string, any> | null;
  finalTradePlan?: Record<string, any> | null;
  setupId?: string;
  tradeId?: string;
  tradeResult?: "win" | "loss" | "scratch" | "pending" | "no_trade" | "missed_trade" | string;
  notes?: string;

  // New Timeframe-Aware and Context Fields
  execution_5m_screenshot_url?: string | null;
  execution_5m_storage_path?: string | null;
  execution_timeframe?: string | null;
  eth_15m_context_screenshot_url?: string | null;
  eth_15m_context_storage_path?: string | null;
  context_timeframe?: string | null;
  context_session?: string | null;
  eth_context_available?: boolean;
  eth_context_status?: string | null;
  eth_high?: number | null;
  eth_low?: number | null;
  asian_high?: number | null;
  asian_low?: number | null;
  london_high?: number | null;
  london_low?: number | null;
  ny_premarket_high?: number | null;
  ny_premarket_low?: number | null;
  rth_open_relation_to_eth?: string | null;
  rth_open_relation_to_midnight?: string | null;
  
  // JSON review blocks
  trade_plan_json?: Record<string, any> | null;
  execution_review_json?: Record<string, any> | null;
  eth_context_review_json?: Record<string, any> | null;
  afternoon_test_plan_json?: Record<string, any> | null;
  midnight_open_review_json?: Record<string, any> | null;

  // Generic metadata
  window_start?: string;
  window_end?: string;
  window_timezone?: string;
  required_screenshot_range?: string;
  planVersionId?: string | null;
  setupSignature?: string | null;
  saveReceiptJson?: Record<string, any> | null;
}

export interface RAGQuery {
  sessionType: string;
  instrument: string;
  dayOfWeek: string;
  rthVsMidnight?: string;
  ibPosition?: string;
  midnightOpenPrice?: number;
  additionalContext?: string;
}

export interface SimilarSetup {
  id: string;
  source?: string;
  analysisMode?: string;
  tradeDate: string;
  dayOfWeek: string;
  sessionType: "morning" | "lunch" | string;
  instrument: "MES" | "MNQ" | string;
  similarity: number;
  rthVsMidnight?: string;
  ibPosition?: string;
  geminiConfidence?: string;
  setupQualityScore?: number;
  tradeResult: "win" | "loss" | "scratch" | "pending" | string;
  pnlTicks?: number | null;
  pnlDollars?: number | null;
  contracts?: number | null;
  entryPrice?: number | null;
  exitPrice?: number | null;
  stopPrice?: number | null;
  target1Price?: number | null;
  target2Price?: number | null;
  riskPoints?: number | null;
  planSource?: string | null;
  screenshotUrl?: string | null;
  proofScreenshotUrl?: string | null;
  geminiVerdict?: "CONFIRMED" | "DISPUTED" | "UNCLEAR" | null;
  embeddingText: string;
  
  // Midnight Open attributes
  midnightOpenPrice?: number;
  midnightOpenInstrument?: string;
  midnightOpenSource?: "manual" | "gemini_ocr" | "undetected" | string;
  midnightOpenConfirmedAt?: string;
  midnightOpenDate?: string;
  midnightOpenStatus?: "confirmed" | "stale" | "missing" | "ocr_unconfirmed" | string;
  distanceFromMidnightPoints?: number;
  distanceFromMidnightTicks?: number;
  midnightRole?: "SUPPORT" | "RESISTANCE" | "MAGNET" | "NEUTRAL" | "UNCONFIRMED" | string;
  midnightInteraction?: "ABOVE_AND_HOLDING" | "BELOW_AND_HOLDING" | "RECLAIMED" | "REJECTED" | "CHOPPING_AROUND" | "UNCONFIRMED" | string;
  midnightPlanImpact?: string;
  midnightConfidenceAdjustment?: "increase" | "decrease" | "neutral" | string;
  midnightConfidenceReason?: string;
}

export interface AgentLearningSummary {
  setupCount: number;
  completedCount: number;
  winCount: number;
  lossCount: number;
  scratchCount: number;
  pendingCount: number;
  winRate: number | null;
  avgPnlTicks: number | null;
  avgPnlDollars: number | null;
  bestMatch?: SimilarSetup;
  strongestLesson: string;
  riskWarning?: string;
  confidenceAdjustment: "increase" | "decrease" | "neutral";
  confidenceAdjustmentReason: string;
  
  // Midnight Open section
  midnightSetupCount: number;
  midnightCompletedCount: number;
  midnightWinRate: number | null;
  midnightAvgPnlTicks: number | null;
  midnightAvgPnlDollars: number | null;
  midnightBestMatch?: SimilarSetup;
  midnightPatternLearned: string;
  midnightRiskWarning?: string;
}

export interface PriorityScoreContext {
  instrument?: string;
  dayOfWeek: string;
  rthVsMidnight?: string;
  retraceProbability?: number;
  ibPosition?: string;
  ocrTimestampDelta?: number;
  sessionType: "morning" | "lunch";
  geminiConfidence?: string;
  similarSetups?: SimilarSetup[];
  agentLearningSummary?: AgentLearningSummary;
  midnightOpenStatus?: string;
}

export interface PriorityResult {
  score: number;
  label: "HIGH PRIORITY" | "MEDIUM PRIORITY" | "LOW PRIORITY" | "SKIP";
  color: string;
  breakdown: Record<string, number>;
  historicalWinRate?: number;
  historicalAvgPnl?: number;
  similarSetupCount: number;
  missingMidnightReason?: string;
}
