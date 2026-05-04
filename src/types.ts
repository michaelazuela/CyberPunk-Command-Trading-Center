/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DayType = 'TYPE 1 LONG' | 'TYPE 2 LONG' | 'TYPE 1 SHORT' | 'TYPE 2 SHORT' | 'LUNCH REVERSAL' | 'DISTRIBUTION' | 'NO TRADE';

export type SessionStatus = 'PRE-MARKET' | 'OBSERVATION' | 'ENTRY' | 'CLOSED';

export interface Trade {
  id: string;
  userId?: string; // Optional for legacy, required for Firestore
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
  rthVsMidnight?: "above" | "below" | "at";
  retraceProbability?: number | null;
  midnightOpenNote?: string;
  isTargetToday?: boolean;

  // OCR Timing
  ocrTimestampStatus?: "valid" | "too_early" | "too_late" | "unreadable" | "weekend";
  ocrTimestampDelta?: number;

  // RAG and Priority
  priorityResult?: PriorityResult;
  similarSetups?: SimilarSetup[];
  ragContextUsed?: boolean;
  historicalContextUsed?: boolean;

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

export interface SessionState {
  date: string;
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
  sessionType: "morning" | "lunch";
  instrument: "MES" | "MNQ";
  tradeDate: string;
  dayOfWeek: string;
  midnightOpenPrice?: number | null;
  rthVsMidnight?: "above" | "below" | "at";
  retraceProbability?: number | null;
  ibHigh?: number | null;
  ibLow?: number | null;
  ibPosition?: string;
  entryPrice?: number | null;
  exitPrice?: number | null;
  pnlTicks?: number | null;
  pnlDollars?: number | null;
  contracts?: number;
  geminiConfidence?: "High" | "Medium" | "Low";
  geminiVerdict?: "CONFIRMED" | "DISPUTED" | "UNCLEAR" | null;
  geminiAnalysisJson?: Record<string, unknown>;
  ocrText?: string;
  screenshotUrl?: string;
  proofScreenshotUrl?: string;
  setupId?: string;
  tradeId?: string;
  tradeResult?: "win" | "loss" | "scratch" | "pending";
  midnightOpenSource?: "manual" | "gemini_ocr" | "undetected";
  notes?: string;
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
  tradeDate: string;
  dayOfWeek: string;
  similarity: number;
  sessionType: string;
  instrument: string;
  rthVsMidnight?: string;
  ibPosition?: string;
  geminiConfidence?: string;
  setupQualityScore?: number;
  tradeResult?: string;
  pnlTicks?: number;
  embeddingText: string;
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
}

export interface PriorityResult {
  score: number;
  label: "HIGH PRIORITY" | "MEDIUM PRIORITY" | "LOW PRIORITY" | "SKIP";
  color: string;
  breakdown: Record<string, number>;
  historicalWinRate?: number;
  historicalAvgPnl?: number;
  similarSetupCount: number;
}
