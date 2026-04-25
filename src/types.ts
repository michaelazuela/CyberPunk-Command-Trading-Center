/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DayType = 'TYPE 1 LONG' | 'TYPE 2 LONG' | 'TYPE 1 SHORT' | 'TYPE 2 SHORT' | 'LUNCH REVERSAL' | 'DISTRIBUTION' | 'NO TRADE';

export type SessionStatus = 'PRE-MARKET' | 'OBSERVATION' | 'ENTRY' | 'CLOSED';

export interface Trade {
  id: string;
  date: string;
  direction: 'LONG' | 'SHORT';
  dayType: DayType;
  entryPrice: number;
  exitPrice?: number;
  stopPrice: number;
  targetPrice: number;
  contracts: number;
  pnl?: number;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
  exitReason?: 'TARGET' | 'STOP' | 'HARD EXIT' | 'MANUAL';
  manualOutcome?: 'SUCCESS' | 'FAILED';
  notes?: string;
  timestamp: number;
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
  confidence: string;
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
  sweepAndReclaim?: string;
  is1055Reversal?: boolean;
  rejectionStrength?: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  levelCheck?: string;
  structureStatus?: string;
  agentReports?: AgentReport[];
  sessionLog?: SessionLog;
  monteCarloPaths?: number[][];
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
