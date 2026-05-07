import { AnalysisResult } from '../types';

export interface NormalizedTradePlan {
  decision: "LONG" | "SHORT" | "NO TRADE";
  entry: number | null;
  stop: number | null;
  t1: number | null;
  t2: number | null;
  riskReward: string | null;
  finalConfidence: "High" | "Medium" | "Low";
  whyThisPlan: string;
  invalidation: string;
  source: "final_trade_plan" | "tradePlan" | "legacy" | "missing";
  canExecute: boolean;
}

export function normalizeTradePlan(result: AnalysisResult | null | undefined): NormalizedTradePlan {
  const defaultPlan: NormalizedTradePlan = {
    decision: "NO TRADE",
    entry: null,
    stop: null,
    t1: null,
    t2: null,
    riskReward: null,
    finalConfidence: "Low",
    whyThisPlan: "No valid trade plan was returned by the analysis.",
    invalidation: "No execution should be taken until a valid plan is generated.",
    source: "missing",
    canExecute: false
  };

  if (!result) return defaultPlan;

  if (result.final_trade_plan) {
    const ftp = result.final_trade_plan;
    return checkCanExecute({
      decision: ftp.decision as any || "NO TRADE",
      entry: ftp.entry || null,
      stop: ftp.stop || null,
      t1: ftp.target_1 || null,
      t2: ftp.target_2 || null,
      riskReward: ftp.risk_reward || null,
      finalConfidence: ftp.final_confidence || "Low",
      whyThisPlan: ftp.why_this_plan || "No reasoning provided.",
      invalidation: ftp.what_would_invalidate || "No invalidation criteria provided.",
      source: "final_trade_plan",
      canExecute: false
    });
  }

  if (result.tradePlan) {
    const tp = result.tradePlan;
    const entry = typeof tp.entry === 'string' ? parseFloat(tp.entry) : tp.entry || null;
    const stop = typeof tp.stop === 'string' ? parseFloat(tp.stop) : tp.stop || null;
    let t1 = typeof tp.target === 'string' ? parseFloat(tp.target) : tp.target || null;
    let t2 = null;
    if (entry !== null && stop !== null && typeof entry === 'number' && typeof stop === 'number' && !isNaN(entry) && !isNaN(stop)) {
      const risk = Math.abs(entry - stop);
      if (risk > 0) {
        t2 = entry > stop ? entry + (risk * 2) : entry - (risk * 2);
      }
    }
    
    return checkCanExecute({
      decision: tp.bias as any || "NO TRADE",
      entry,
      stop,
      t1,
      t2,
      riskReward: null,
      finalConfidence: (tp.confidence || 0) >= 0.75 ? "High" : ((tp.confidence || 0) >= 0.45 ? "Medium" : "Low"),
      whyThisPlan: tp.reasoningSummary || "No reasoning provided.",
      invalidation: tp.invalidation || "No invalidation criteria provided.",
      source: "tradePlan",
      canExecute: false
    });
  }

  // Legacy fallback
  let decision: "LONG" | "SHORT" | "NO TRADE" = "NO TRADE";
  if (result.dayType?.includes("LONG")) decision = "LONG";
  else if (result.dayType?.includes("SHORT")) decision = "SHORT";

  if (result.suggestedEntry || result.suggestedStop || result.suggestedTarget || result.suggestedTarget15R) {
    return checkCanExecute({
      decision,
      entry: result.suggestedEntry || null,
      stop: result.suggestedStop || null,
      t1: result.suggestedTarget15R || result.suggestedTarget || null,
      t2: result.suggestedTarget20R || result.suggestedTarget || null,
      riskReward: null,
      finalConfidence: (result.confidence || 0) >= 0.75 ? "High" : ((result.confidence || 0) >= 0.45 ? "Medium" : "Low"),
      whyThisPlan: result.reasoning || "No reasoning provided.",
      invalidation: result.levelCheck || (result as any).structureStatus || "Invalidation not provided.",
      source: "legacy",
      canExecute: false
    });
  }

  return defaultPlan;
}

function checkCanExecute(plan: NormalizedTradePlan): NormalizedTradePlan {
  const isValidNumber = (n: any) => typeof n === 'number' && !isNaN(n) && n > 0;
  plan.canExecute = 
    (plan.decision === "LONG" || plan.decision === "SHORT") &&
    isValidNumber(plan.entry) &&
    isValidNumber(plan.stop) &&
    isValidNumber(plan.t1);
  return plan;
}
