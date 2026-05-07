import { AnalysisResult } from '../types';

export type TradeDecision = "LONG" | "SHORT" | "NO TRADE";

export type TradePlanSource =
  | "final_trade_plan"
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
}

export function isValidPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function inferDecision(result: AnalysisResult): TradeDecision {
  if (result.final_trade_plan && result.final_trade_plan.decision) return result.final_trade_plan.decision;
  if (result.tradePlan && result.tradePlan.bias) {
    if (result.tradePlan.bias === "LONG" || result.tradePlan.bias === "SHORT" || result.tradePlan.bias === "NO TRADE") {
      return result.tradePlan.bias;
    }
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
    canExecute: false
  };

  if (!result) return defaultPlan;

  let entry: number | null = null;
  let stop: number | null = null;
  let source: TradePlanSource = "missing";
  let confidence: "High" | "Medium" | "Low" = "Low";
  let whyThisPlan = defaultPlan.whyThisPlan;
  let invalidation = defaultPlan.invalidation;

  if (result.final_trade_plan) {
    entry = result.final_trade_plan.entry ?? null;
    stop = result.final_trade_plan.stop ?? null;
    source = "final_trade_plan";
    confidence = result.final_trade_plan.final_confidence || "Low";
    whyThisPlan = result.final_trade_plan.why_this_plan || "No reasoning provided.";
    invalidation = result.final_trade_plan.what_would_invalidate || "No invalidation provided.";
  } else if (result.tradePlan) {
    entry = typeof result.tradePlan.entry === 'string' ? parseFloat(result.tradePlan.entry) : result.tradePlan.entry || null;
    stop = typeof result.tradePlan.stop === 'string' ? parseFloat(result.tradePlan.stop) : result.tradePlan.stop || null;
    source = "tradePlan";
    confidence = (result.tradePlan.confidence || 0) >= 0.75 ? "High" : ((result.tradePlan.confidence || 0) >= 0.45 ? "Medium" : "Low");
    whyThisPlan = result.tradePlan.reasoningSummary || "No reasoning provided.";
    invalidation = result.tradePlan.invalidation || "No invalidation provided.";
  } else if (result.suggestedEntry || result.suggestedStop) {
    entry = result.suggestedEntry || null;
    stop = result.suggestedStop || null;
    source = "legacy";
    confidence = (result.confidence || 0) >= 0.75 ? "High" : ((result.confidence || 0) >= 0.45 ? "Medium" : "Low");
    whyThisPlan = result.reasoning || "No reasoning provided.";
    invalidation = result.levelCheck || result.structureStatus || "No invalidation provided.";
  }

  const decision = inferDecision(result);
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
    canExecute
  };
}
