import { AnalysisResult } from '../types';

export type TradeDecision = "LONG" | "SHORT" | "NO TRADE";

export type TradePlanSource =
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

export function normalizeTradePlan(result: AnalysisResult | null | undefined, instrument?: "MES" | "MNQ"): NormalizedTradePlan {
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
    rejectedAlternatives: []
  };

  if (!result) return defaultPlan;

  type Candidate = {
    source: TradePlanSource;
    setupName: string;
    decision: TradeDecision;
    entry: number | null;
    stop: number | null;
    confidence: "High" | "Medium" | "Low";
    whyThisPlan: string;
    invalidation: string;
    priorityScore?: number | null;
    rank?: number | null;
    selected?: boolean;
    ragSupport?: string;
    rejectionReason?: string | null;
  };

  const candidates: Candidate[] = [];
  const addCandidate = (candidate: Candidate) => {
    candidates.push(candidate);
  };

  if (result.candidate_trade_plans && Array.isArray(result.candidate_trade_plans)) {
    result.candidate_trade_plans.forEach((candidate, index) => {
      addCandidate({
        setupName: candidate.setup_name || `Candidate ${index + 1}`,
        entry: parsePrice(candidate.entry),
        stop: parsePrice(candidate.stop),
        source: "candidate_trade_plan",
        decision: candidate.direction || "NO TRADE",
        confidence: normalizeConfidence(candidate.confidence),
        whyThisPlan: candidate.why_this_plan || "Candidate plan returned by Best Plan Selector.",
        invalidation: candidate.invalidation || "No invalidation provided.",
        priorityScore: candidate.priority_score ?? null,
        rank: candidate.rank ?? index + 1,
        selected: !!candidate.selected,
        ragSupport: candidate.rag_support,
        rejectionReason: candidate.rejection_reason
      });
    });
  }

  if (result.best_trade_plan) {
    const selectedCandidate = result.candidate_trade_plans?.find((candidate) =>
      candidate.id === result.best_trade_plan?.selected_candidate_id || candidate.selected
    );
    addCandidate({
      setupName: selectedCandidate?.setup_name || "Best Plan Selector",
      entry: parsePrice(result.best_trade_plan.entry),
      stop: parsePrice(result.best_trade_plan.stop),
      source: "best_trade_plan",
      decision: result.best_trade_plan.decision || "NO TRADE",
      confidence: normalizeConfidence(result.best_trade_plan.final_confidence),
      whyThisPlan: result.best_trade_plan.why_it_won || "Best Plan Selector chose this setup.",
      invalidation: result.best_trade_plan.what_would_invalidate || "No invalidation provided.",
      priorityScore: result.best_trade_plan.priority_score ?? null,
      rank: 1,
      selected: true,
      ragSupport: result.best_trade_plan.rag_support
    });
  }

  if (result.final_trade_plan) {
    addCandidate({
      setupName: "Final Trade Plan",
      entry: parsePrice(result.final_trade_plan.entry),
      stop: parsePrice(result.final_trade_plan.stop),
      source: "final_trade_plan",
      decision: result.final_trade_plan.decision || "NO TRADE",
      confidence: normalizeConfidence(result.final_trade_plan.final_confidence),
      whyThisPlan: result.final_trade_plan.why_this_plan || "No reasoning provided.",
      invalidation: result.final_trade_plan.what_would_invalidate || "No invalidation provided."
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
      source: "current_rule_analysis",
      decision: currentDecision === "NO TRADE" ? inferDecision(result) : currentDecision,
      confidence: normalizeConfidence(result.current_rule_analysis.base_confidence, confidenceFromNumber(result.confidence)),
      whyThisPlan: result.current_rule_analysis.summary || result.reasoning || "Current rule analysis produced executable levels.",
      invalidation: result.current_rule_analysis.no_trade_reason || result.levelCheck || result.structureStatus || "Invalid if price violates the defined stop before entry confirmation."
    });
  }

  if (result.tradePlan) {
    addCandidate({
      setupName: result.tradePlan.setupName || "Structured Trade Plan",
      entry: parsePrice(result.tradePlan.entry),
      stop: parsePrice(result.tradePlan.stop),
      source: "tradePlan",
      decision: result.tradePlan.bias || "NO TRADE",
      confidence: confidenceFromNumber(result.tradePlan.confidence),
      whyThisPlan: result.tradePlan.reasoningSummary || "No reasoning provided.",
      invalidation: result.tradePlan.invalidation || "No invalidation provided."
    });
  }

  if (result.suggestedEntry || result.suggestedStop) {
    addCandidate({
      setupName: "Legacy Suggested Levels",
      entry: parsePrice(result.suggestedEntry),
      stop: parsePrice(result.suggestedStop),
      source: "legacy",
      decision: inferDecision(result),
      confidence: confidenceFromNumber(result.confidence),
      whyThisPlan: result.reasoning || "No reasoning provided.",
      invalidation: result.levelCheck || result.structureStatus || "No invalidation provided."
    });
  }

  const isExecutable = (candidate: Candidate) => {
    const targets = calculateTargets(candidate.decision, candidate.entry, candidate.stop, instrument);
    return (candidate.decision === "LONG" || candidate.decision === "SHORT") &&
      isValidPrice(candidate.entry) &&
      isValidPrice(candidate.stop) &&
      isValidPrice(targets.t1) &&
      isValidPrice(targets.t2);
  };

  const scoreCandidate = (candidate: Candidate) => {
    if (!isExecutable(candidate)) return -100;
    const risk = calculateRisk(candidate.entry as number, candidate.stop as number);
    const sourceScore =
      candidate.source === "best_trade_plan" ? 35 :
      candidate.selected ? 32 :
      candidate.source === "candidate_trade_plan" ? 25 :
      candidate.source === "final_trade_plan" ? 22 :
      candidate.source === "current_rule_analysis" ? 18 :
      candidate.source === "tradePlan" ? 12 : 5;
    const riskScore = risk <= 8 ? 10 : risk <= 15 ? 2 : -12;
    const rankScore = candidate.rank ? Math.max(0, 8 - candidate.rank) : 0;
    return sourceScore +
      confidenceScore(candidate.confidence) +
      priorityScoreValue(candidate.priorityScore) +
      ragSupportScore(candidate.ragSupport) +
      riskScore +
      rankScore;
  };

  const executableCandidate = [...candidates]
    .filter(isExecutable)
    .sort((a, b) => scoreCandidate(b) - scoreCandidate(a))[0];

  if (!executableCandidate) {
    const noTradeReason =
      result.final_trade_plan?.why_this_plan ||
      result.current_rule_analysis?.no_trade_reason ||
      defaultPlan.whyThisPlan;
    return {
      ...defaultPlan,
      decision: "NO TRADE",
      whyThisPlan: noTradeReason,
      invalidation: result.final_trade_plan?.what_would_invalidate || defaultPlan.invalidation
    };
  }

  const { decision, entry, stop, source, confidence, whyThisPlan, invalidation } = executableCandidate;
  const targets = calculateTargets(decision, entry, stop, instrument);
  const riskPoints = (isValidPrice(entry) && isValidPrice(stop)) ? calculateRisk(entry, stop) : null;
  const canExecute = (decision === "LONG" || decision === "SHORT") && isValidPrice(entry) && isValidPrice(stop) && isValidPrice(targets.t1) && isValidPrice(targets.t2);

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
    setupName: executableCandidate.setupName,
    priorityScore: executableCandidate.priorityScore ?? null,
    rank: executableCandidate.rank ?? null,
    whyItWon: result.best_trade_plan?.why_it_won,
    ragSupport: executableCandidate.ragSupport,
    tradeManagement: result.trade_management_plan,
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
          (isExecutable(candidate) ? "Lower ranked than selected plan." : "Rejected because ENTRY, STOP, T1, or T2 was missing or invalid.")
      }))
  };
}
