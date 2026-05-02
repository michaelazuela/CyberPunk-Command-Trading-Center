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
