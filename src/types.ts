/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DayType = 'TYPE 1 LONG' | 'TYPE 2 LONG' | 'TYPE 1 SHORT' | 'TYPE 2 SHORT' | 'LUNCH REVERSAL' | 'DISTRIBUTION' | 'NO TRADE';

export type SessionStatus = 'PRE-MARKET' | 'OBSERVATION' | 'ENTRY' | 'CLOSED';

export interface Trade {
  id: string;
  userId?: string; // Optional for legacy, required for Firestore
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
  villainLevels?: {
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
  morningScreenshot?: string;
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
  geminiConfidence?: "High" | "Medium" | "Low";
  geminiVerdict?: "CONFIRMED" | "DISPUTED" | "UNCLEAR" | null;
  geminiAnalysisJson?: Record<string, unknown> | any;
  ocrText?: string;
  screenshotUrl?: string; // Legacy, optional
  proofScreenshotUrl?: string;
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
