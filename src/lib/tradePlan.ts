import { AnalysisResult, FinalOpportunitySelection, NoTradeReason, SessionLevelContext, SetupCandidate, TradeDecisionStatus } from '../types';
import { SYSTEM_RULES } from '../constants';
import { getWindowStatus } from '../config/timeWindows';
import { PipelineSessionType, runTradeDecisionPipeline, TradeDecisionStepResult } from './tradeDecisionPipeline';

export type TradeDecision = "LONG" | "SHORT" | "NO TRADE";
export type TriggerState = "TRIGGERED" | "PENDING_TRIGGER" | "NO_TRIGGER";

export type TradePlanSource =
  | "app_rule_engine"
  | "best_trade_plan"
  | "candidate_trade_plan"
  | "final_trade_plan"
  | "current_rule_analysis"
  | "tradePlan"
  | "legacy"
  | "manual"
  | "missing";

export interface NormalizedTradePlan {
  decision: TradeDecision;
  entry: number | null;
  stop: number | null;
  t1: number | null;
  t2: number | null;
  riskPoints: number | null;
  riskRewardT1: "1.5R" | null;
  riskRewardT2: "2.0R" | null;
  finalConfidence: "High" | "Medium" | "Low";
  whyThisPlan: string;
  invalidation: string;
  source: TradePlanSource;
  canExecute: boolean;
  setupName?: string;
  priorityScore?: number | null;
  rank?: number | null;
  whyItWon?: string;
  ragSupport?: string;
  tradeManagement?: AnalysisResult['trade_management_plan'];
  triggerState?: TriggerState;
  entryTrigger?: string | null;
  decisionStatus?: TradeDecisionStatus;
  noTradeReason?: NoTradeReason | null;
  decisionAuditTrail?: TradeDecisionStepResult[];
  setupCandidates?: SetupCandidate[];
  opportunitySelection?: FinalOpportunitySelection;
  sessionLevelContext?: SessionLevelContext;
  consistencyWarnings?: string[];
  rejectedAlternatives?: {
    setupName: string;
    rejectionReason: string;
  }[];
}

export function isValidPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function parsePrice(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function confidenceFromNumber(value?: number): "High" | "Medium" | "Low" {
  return (value || 0) >= 0.75 ? "High" : ((value || 0) >= 0.45 ? "Medium" : "Low");
}

function normalizeConfidence(value: unknown, fallback: "High" | "Medium" | "Low" = "Low"): "High" | "Medium" | "Low" {
  if (value === "High" || value === "Medium" || value === "Low") return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === "high") return "High";
    if (lower === "medium") return "Medium";
    if (lower === "low") return "Low";
  }
  return fallback;
}

function confidenceScore(value: "High" | "Medium" | "Low"): number {
  if (value === "High") return 30;
  if (value === "Medium") return 18;
  return 8;
}

function ragSupportScore(value: unknown): number {
  if (value === "SUPPORTS PLAN") return 10;
  if (value === "CONFLICTS WITH PLAN") return -15;
  if (value === "NEUTRAL") return 0;
  return -2;
}

function priorityScoreValue(value: unknown): number {
  const parsed = parsePrice(value);
  if (parsed === null) return 0;
  return Math.max(0, Math.min(parsed, 1)) * 35;
}

function normalizeTriggerState(value: unknown, candidate: { decision: TradeDecision; entry: number | null; stop: number | null; whyThisPlan?: string }): TriggerState {
  if (value === "TRIGGERED" || value === "PENDING_TRIGGER" || value === "NO_TRIGGER") return value;
  if (candidate.decision === "NO TRADE") return "NO_TRIGGER";
  const text = `${candidate.whyThisPlan || ""}`.toUpperCase();
  if (text.includes("PENDING") || text.includes("WAIT") || text.includes("BREAK") || text.includes("TRIGGER")) {
    return "PENDING_TRIGGER";
  }
  if (isValidPrice(candidate.entry) && isValidPrice(candidate.stop)) return "TRIGGERED";
  return "NO_TRIGGER";
}

function inferDecisionFromText(text: string): TradeDecision {
  const upper = text.toUpperCase();
  if (upper.includes("NO TRADE")) return "NO TRADE";
  if (upper.includes("SHORT") || upper.includes("BEARISH") || upper.includes("SELL")) return "SHORT";
  if (upper.includes("LONG") || upper.includes("BULLISH") || upper.includes("BUY")) return "LONG";
  return "NO TRADE";
}

export function inferDecision(result: AnalysisResult): TradeDecision {
  if (result.final_trade_plan && (result.final_trade_plan.decision === "LONG" || result.final_trade_plan.decision === "SHORT")) {
    return result.final_trade_plan.decision;
  }
  if (result.tradePlan && result.tradePlan.bias) {
    if (result.tradePlan.bias === "LONG" || result.tradePlan.bias === "SHORT" || result.tradePlan.bias === "NO TRADE") {
      return result.tradePlan.bias;
    }
  }
  if (result.current_rule_analysis) {
    const textDecision = inferDecisionFromText([
      result.current_rule_analysis.setup_detected,
      result.current_rule_analysis.rule_category,
      result.current_rule_analysis.summary
    ].filter(Boolean).join(" "));
    if (textDecision === "LONG" || textDecision === "SHORT") return textDecision;
  }
  if (typeof result.dayType === 'string') {
    if (result.dayType.includes("LONG")) return "LONG";
    if (result.dayType.includes("SHORT")) return "SHORT";
  }
  return "NO TRADE";
}

export function calculateRisk(entry: number, stop: number): number {
  return Math.abs(entry - stop);
}

export function calculateTargets(decision: TradeDecision, entry: number | null, stop: number | null, instrument?: "MES" | "MNQ"): { t1: number | null, t2: number | null } {
  if (decision === "NO TRADE" || !isValidPrice(entry) || !isValidPrice(stop)) {
    return { t1: null, t2: null };
  }
  const risk = calculateRisk(entry, stop);
  let t1: number, t2: number;
  if (decision === "LONG") {
    t1 = entry + risk * 1.5;
    t2 = entry + risk * 2.0;
  } else {
    t1 = entry - risk * 1.5;
    t2 = entry - risk * 2.0;
  }
  return {
    t1: roundToTick(t1, instrument),
    t2: roundToTick(t2, instrument)
  };
}

export function roundToTick(price: number, instrument?: "MES" | "MNQ"): number {
  const tickSize = 0.25;
  return Math.round(price / tickSize) * tickSize;
}

export function normalizeTradePlan(
  result: AnalysisResult | null | undefined,
  instrument?: "MES" | "MNQ",
  sessionType: PipelineSessionType = 'morning',
  windowStatusOverride?: ReturnType<typeof getWindowStatus>
): NormalizedTradePlan {
  const pipeline = runTradeDecisionPipeline({ result, instrument, sessionType, windowStatusOverride });
  const defaultPlan: NormalizedTradePlan = {
    decision: "NO TRADE",
    entry: null,
    stop: null,
    t1: null,
    t2: null,
    riskPoints: null,
    riskRewardT1: null,
    riskRewardT2: null,
    finalConfidence: "Low",
    whyThisPlan: "No valid executable trade plan was generated.",
    invalidation: "Do not execute until entry and stop are defined.",
    source: "missing",
    canExecute: false,
    decisionStatus: pipeline.status,
    noTradeReason: pipeline.noTradeReason,
    decisionAuditTrail: pipeline.auditTrail,
    setupCandidates: pipeline.setupCandidates || [],
    opportunitySelection: pipeline.opportunitySelection,
    sessionLevelContext: pipeline.chartContext.sessionLevelContext,
    rejectedAlternatives: []
  };

  if (!result) return defaultPlan;

  type Candidate = {
    source: TradePlanSource;
    setupName: string;
    decision: TradeDecision;
    entry: number | null;
    stop: number | null;
    rawT1?: number | null;
    rawT2?: number | null;
    confidence: "High" | "Medium" | "Low";
    whyThisPlan: string;
    invalidation: string;
    priorityScore?: number | null;
    rank?: number | null;
    selected?: boolean;
    appOwned?: boolean;
    ragSupport?: string;
    rejectionReason?: string | null;
    triggerState?: TriggerState;
    entryTrigger?: string | null;
  };

  const candidates: Candidate[] = [];
  const addCandidate = (candidate: Candidate) => {
    candidates.push(candidate);
  };

  const appRuleCandidate = pipeline.finalTradePlan;
  addCandidate({
    setupName: appRuleCandidate.setupType,
    entry: appRuleCandidate.entry,
    stop: appRuleCandidate.stop,
    source: "app_rule_engine",
    decision: appRuleCandidate.direction,
    confidence: appRuleCandidate.confidence,
    whyThisPlan: appRuleCandidate.reasoning,
    invalidation: appRuleCandidate.invalidation,
    priorityScore: null,
    rank: 1,
    selected: appRuleCandidate.status === TradeDecisionStatus.ApprovedTrade || appRuleCandidate.status === TradeDecisionStatus.ConditionalTrade,
    appOwned: true,
    rejectionReason: appRuleCandidate.noTradeReason || null,
    triggerState: appRuleCandidate.status === TradeDecisionStatus.ConditionalTrade ? "PENDING_TRIGGER" : appRuleCandidate.status === TradeDecisionStatus.ApprovedTrade ? "TRIGGERED" : "NO_TRIGGER",
    entryTrigger: pipeline.setupAssessment.entryTrigger
  });

  if (result.candidate_trade_plans && Array.isArray(result.candidate_trade_plans)) {
    result.candidate_trade_plans.forEach((candidate, index) => {
      addCandidate({
        setupName: candidate.setup_name || `Candidate ${index + 1}`,
        entry: parsePrice(candidate.entry),
        stop: parsePrice(candidate.stop),
        rawT1: parsePrice(candidate.target_1),
        rawT2: parsePrice(candidate.target_2),
        source: "candidate_trade_plan",
        decision: candidate.direction || "NO TRADE",
        confidence: normalizeConfidence(candidate.confidence),
        whyThisPlan: candidate.why_this_plan || "Candidate plan returned by App Plan Engine.",
        invalidation: candidate.invalidation || "No invalidation provided.",
        priorityScore: candidate.priority_score ?? null,
        rank: candidate.rank ?? index + 1,
        selected: !!candidate.selected,
        appOwned: false,
        ragSupport: candidate.rag_support,
        rejectionReason: candidate.rejection_reason,
        triggerState: normalizeTriggerState(candidate.trigger_state, {
          decision: candidate.direction || "NO TRADE",
          entry: parsePrice(candidate.entry),
          stop: parsePrice(candidate.stop),
          whyThisPlan: candidate.why_this_plan
        }),
        entryTrigger: candidate.entry_trigger || null
      });
    });
  }

  if (result.best_trade_plan) {
    const selectedCandidate = result.candidate_trade_plans?.find((candidate) =>
      candidate.id === result.best_trade_plan?.selected_candidate_id || candidate.selected
    );
    addCandidate({
      setupName: selectedCandidate?.setup_name || "App Plan Engine",
      entry: parsePrice(result.best_trade_plan.entry),
      stop: parsePrice(result.best_trade_plan.stop),
      rawT1: parsePrice(result.best_trade_plan.target_1),
      rawT2: parsePrice(result.best_trade_plan.target_2),
      source: "best_trade_plan",
      decision: result.best_trade_plan.decision || "NO TRADE",
      confidence: normalizeConfidence(result.best_trade_plan.final_confidence),
      whyThisPlan: result.best_trade_plan.why_it_won || "App Plan Engine chose this setup.",
      invalidation: result.best_trade_plan.what_would_invalidate || "No invalidation provided.",
      priorityScore: result.best_trade_plan.priority_score ?? null,
      rank: 1,
      selected: true,
      appOwned: false,
      ragSupport: result.best_trade_plan.rag_support,
      triggerState: normalizeTriggerState(result.best_trade_plan.trigger_state, {
        decision: result.best_trade_plan.decision || "NO TRADE",
        entry: parsePrice(result.best_trade_plan.entry),
        stop: parsePrice(result.best_trade_plan.stop),
        whyThisPlan: result.best_trade_plan.why_it_won
      }),
      entryTrigger: result.best_trade_plan.entry_trigger || selectedCandidate?.entry_trigger || null
    });
  }

  if (result.final_trade_plan) {
    addCandidate({
      setupName: "Final Trade Plan",
      entry: parsePrice(result.final_trade_plan.entry),
      stop: parsePrice(result.final_trade_plan.stop),
      rawT1: parsePrice(result.final_trade_plan.target_1),
      rawT2: parsePrice(result.final_trade_plan.target_2),
      source: "final_trade_plan",
      decision: result.final_trade_plan.decision || "NO TRADE",
      confidence: normalizeConfidence(result.final_trade_plan.final_confidence),
      whyThisPlan: result.final_trade_plan.why_this_plan || "No reasoning provided.",
      invalidation: result.final_trade_plan.what_would_invalidate || "No invalidation provided.",
      appOwned: false,
      triggerState: normalizeTriggerState(result.final_trade_plan.trigger_state, {
        decision: result.final_trade_plan.decision || "NO TRADE",
        entry: parsePrice(result.final_trade_plan.entry),
        stop: parsePrice(result.final_trade_plan.stop),
        whyThisPlan: result.final_trade_plan.why_this_plan
      }),
      entryTrigger: result.final_trade_plan.entry_trigger || null
    });
  }

  if (result.current_rule_analysis && !result.current_rule_analysis.no_trade_reason) {
    const currentDecision = inferDecisionFromText([
      result.current_rule_analysis.setup_detected,
      result.current_rule_analysis.rule_category,
      result.current_rule_analysis.summary,
      result.dayType
    ].filter(Boolean).join(" "));
    addCandidate({
      setupName: result.current_rule_analysis.setup_detected || "Current Rule Analysis",
      entry: parsePrice(result.current_rule_analysis.entry),
      stop: parsePrice(result.current_rule_analysis.stop),
      rawT1: parsePrice(result.current_rule_analysis.target_1),
      source: "current_rule_analysis",
      decision: currentDecision,
      confidence: normalizeConfidence(result.current_rule_analysis.base_confidence, confidenceFromNumber(result.confidence)),
      whyThisPlan: result.current_rule_analysis.summary || result.reasoning || "Current rule analysis produced executable levels.",
      invalidation: result.current_rule_analysis.no_trade_reason || result.levelCheck || result.structureStatus || "Invalid if price violates the defined stop before entry confirmation.",
      appOwned: false,
      triggerState: normalizeTriggerState(result.current_rule_analysis.trigger_state, {
        decision: currentDecision,
        entry: parsePrice(result.current_rule_analysis.entry),
        stop: parsePrice(result.current_rule_analysis.stop),
        whyThisPlan: result.current_rule_analysis.summary
      }),
      entryTrigger: result.current_rule_analysis.entry_trigger || null
    });
  }

  if (result.tradePlan) {
    addCandidate({
      setupName: result.tradePlan.setupName || "Structured Trade Plan",
      entry: parsePrice(result.tradePlan.entry),
      stop: parsePrice(result.tradePlan.stop),
      rawT1: parsePrice(result.tradePlan.target),
      source: "tradePlan",
      decision: result.tradePlan.bias || "NO TRADE",
      confidence: confidenceFromNumber(result.tradePlan.confidence),
      whyThisPlan: result.tradePlan.reasoningSummary || "No reasoning provided.",
      invalidation: result.tradePlan.invalidation || "No invalidation provided.",
      appOwned: false
    });
  }

  if (result.suggestedEntry || result.suggestedStop) {
    addCandidate({
      setupName: "Legacy Suggested Levels",
      entry: parsePrice(result.suggestedEntry),
      stop: parsePrice(result.suggestedStop),
      rawT1: parsePrice(result.suggestedTarget),
      source: "legacy",
      decision: inferDecision(result),
      confidence: confidenceFromNumber(result.confidence),
      whyThisPlan: result.reasoning || "No reasoning provided.",
      invalidation: result.levelCheck || result.structureStatus || "No invalidation provided.",
      appOwned: false
    });
  }

  const isExecutable = (candidate: Candidate) => {
    const targets = calculateTargets(candidate.decision, candidate.entry, candidate.stop, instrument);
    const risk = (isValidPrice(candidate.entry) && isValidPrice(candidate.stop))
      ? calculateRisk(candidate.entry, candidate.stop)
      : null;
    return (candidate.decision === "LONG" || candidate.decision === "SHORT") &&
      isValidPrice(candidate.entry) &&
      isValidPrice(candidate.stop) &&
      risk !== null &&
      risk <= SYSTEM_RULES.MAX_STOP_TYPE_2 &&
      isValidPrice(targets.t1) &&
      isValidPrice(targets.t2);
  };

  const scoreCandidate = (candidate: Candidate) => {
    if (!isExecutable(candidate)) return -100;
    const risk = calculateRisk(candidate.entry as number, candidate.stop as number);
    const sourceScore =
      candidate.source === "app_rule_engine" ? 40 :
      candidate.source === "current_rule_analysis" ? 30 :
      candidate.source === "manual" ? 25 :
      0;
    const riskScore = risk <= 8 ? 10 : risk <= 15 ? 2 : -12;
    const rankScore = candidate.rank ? Math.max(0, 8 - candidate.rank) : 0;
    return sourceScore +
      confidenceScore(candidate.confidence) +
      priorityScoreValue(candidate.priorityScore) +
      ragSupportScore(candidate.ragSupport) +
      riskScore +
      rankScore;
  };

  const appOwnedCandidates = candidates.filter(candidate => candidate.appOwned || candidate.source === "app_rule_engine" || candidate.source === "manual");
  const advisoryCandidates = candidates.filter(candidate => !appOwnedCandidates.includes(candidate));

  const executableCandidate = [...appOwnedCandidates]
    .filter(isExecutable)
    .sort((a, b) => scoreCandidate(b) - scoreCandidate(a))[0];

  if (!executableCandidate) {
    const noTradeReason =
      result.current_rule_analysis?.no_trade_reason ||
      (advisoryCandidates.some(isExecutable)
        ? "Advisory trade levels were returned, but the app-owned rule engine did not confirm an executable setup."
        : null) ||
      defaultPlan.whyThisPlan;
    return {
      ...defaultPlan,
      decision: "NO TRADE",
      whyThisPlan: pipeline.finalTradePlan.reasoning || noTradeReason,
      invalidation: result.current_rule_analysis?.no_trade_reason || defaultPlan.invalidation,
      setupCandidates: pipeline.setupCandidates || [],
      opportunitySelection: pipeline.opportunitySelection,
      sessionLevelContext: pipeline.chartContext.sessionLevelContext,
      consistencyWarnings: advisoryCandidates.some(isExecutable)
        ? ["Advisory trade-plan fields are not executable. Execution stays disabled until the app-owned rule engine confirms ENTRY and STOP."]
        : []
    };
  }

  const { decision, entry, stop, source, confidence, whyThisPlan, invalidation, entryTrigger } = executableCandidate;
  const targets = calculateTargets(decision, entry, stop, instrument);
  const riskPoints = (isValidPrice(entry) && isValidPrice(stop)) ? calculateRisk(entry, stop) : null;
  const pipelineAllowsExecution =
    pipeline.status === TradeDecisionStatus.ApprovedTrade ||
    pipeline.status === TradeDecisionStatus.ConditionalTrade;
  const canExecute = pipelineAllowsExecution &&
    (decision === "LONG" || decision === "SHORT") &&
    isValidPrice(entry) &&
    isValidPrice(stop) &&
    isValidPrice(targets.t1) &&
    isValidPrice(targets.t2);
  const consistencyWarnings: string[] = [];
  if (advisoryCandidates.length > 0) {
    consistencyWarnings.push("Advisory candidate fields were ignored for execution. The executable plan was selected by the app-owned rule engine.");
  }
  if (isValidPrice(executableCandidate.rawT1) && isValidPrice(targets.t1) && Math.abs(executableCandidate.rawT1 - targets.t1) >= 0.25) {
    consistencyWarnings.push(`Raw advisory T1 ${executableCandidate.rawT1} was replaced with app-computed T1 ${targets.t1} using fixed 1.5R.`);
  }
  if (isValidPrice(executableCandidate.rawT2) && isValidPrice(targets.t2) && Math.abs(executableCandidate.rawT2 - targets.t2) >= 0.25) {
    consistencyWarnings.push(`Raw advisory T2 ${executableCandidate.rawT2} was replaced with app-computed T2 ${targets.t2} using fixed 2.0R.`);
  }

  return {
    decision: decision === "LONG" || decision === "SHORT" ? decision : "NO TRADE",
    entry,
    stop,
    t1: targets.t1,
    t2: targets.t2,
    riskPoints,
    riskRewardT1: targets.t1 !== null ? "1.5R" : null,
    riskRewardT2: targets.t2 !== null ? "2.0R" : null,
    finalConfidence: confidence,
    whyThisPlan,
    invalidation,
    source: canExecute ? source : "missing",
    canExecute,
    decisionStatus: pipeline.status,
    noTradeReason: pipeline.noTradeReason,
    decisionAuditTrail: pipeline.auditTrail,
    setupCandidates: pipeline.setupCandidates || [],
    opportunitySelection: pipeline.opportunitySelection,
    sessionLevelContext: pipeline.chartContext.sessionLevelContext,
    setupName: executableCandidate.setupName,
    priorityScore: executableCandidate.priorityScore ?? null,
    rank: executableCandidate.rank ?? null,
    whyItWon: result.best_trade_plan?.why_it_won,
    ragSupport: executableCandidate.ragSupport,
    tradeManagement: result.trade_management_plan,
    triggerState: executableCandidate.triggerState ?? normalizeTriggerState(undefined, executableCandidate),
    entryTrigger: entryTrigger ?? null,
    consistencyWarnings,
    rejectedAlternatives: candidates
      .filter((candidate) => {
        if (candidate === executableCandidate) return false;
        if (candidate.selected && executableCandidate.source === "best_trade_plan") return false;
        if (candidate.setupName === executableCandidate.setupName && candidate.entry === executableCandidate.entry && candidate.stop === executableCandidate.stop) return false;
        return true;
      })
      .map((candidate) => ({
        setupName: candidate.setupName,
        rejectionReason: candidate.rejectionReason ||
          result.best_trade_plan?.rejected_alternatives?.find((alt) => alt.setup_name === candidate.setupName)?.rejection_reason ||
          (!candidate.appOwned && isExecutable(candidate)
            ? "Advisory only: executable plans must be confirmed by the app-owned rule engine."
            : isExecutable(candidate) ? "Lower ranked than selected app-owned plan." : "Rejected because ENTRY, STOP, T1, or T2 was missing or invalid.")
      }))
  };
}
