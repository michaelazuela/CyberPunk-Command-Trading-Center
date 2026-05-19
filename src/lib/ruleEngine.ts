import { AnalysisResult } from '../types';
import { SYSTEM_RULES } from '../constants';

export type AppRuleSessionType = 'morning' | 'lunch' | 'replay_morning' | 'replay_lunch';
type TradeDecision = 'LONG' | 'SHORT' | 'NO TRADE';
type TriggerState = 'TRIGGERED' | 'PENDING_TRIGGER' | 'NO_TRIGGER';

type Confidence = 'High' | 'Medium' | 'Low';

export type AppRuleSetup =
  | 'LIQUIDITY_SWEEP'
  | 'MOMENTUM_RUNAWAY'
  | 'FVG_IMBALANCE'
  | 'INITIAL_BALANCE_EXTENSION'
  | 'OPENING_ORDER_BLOCK'
  | 'ORDER_BLOCK_618'
  | 'EQUAL_HIGHS_LOWS'
  | 'PREVIOUS_DAY_SWEEP'
  | 'COMPRESSION_BREAKOUT'
  | 'GAP_FILL'
  | 'BREAKER_BLOCK'
  | 'MITIGATION_BLOCK'
  | 'NO_TRADE';

export interface AppRuleCandidate {
  setupName: string;
  canonicalSetup: AppRuleSetup;
  ruleCategory: string;
  decision: TradeDecision;
  entry: number | null;
  stop: number | null;
  confidence: Confidence;
  whyThisPlan: string;
  invalidation: string;
  triggerState: TriggerState;
  entryTrigger: string | null;
  priorityScore: number | null;
  rank: number | null;
  ragSupport?: string;
  rejectionReason?: string | null;
  appOwned: true;
}

export interface RuleEngineContext {
  sessionType: AppRuleSessionType;
  instrument?: 'MES' | 'MNQ';
}

const SETUP_PRIORITY: Record<AppRuleSetup, number> = {
  LIQUIDITY_SWEEP: 100,
  MOMENTUM_RUNAWAY: 88,
  FVG_IMBALANCE: 82,
  INITIAL_BALANCE_EXTENSION: 78,
  OPENING_ORDER_BLOCK: 72,
  ORDER_BLOCK_618: 70,
  EQUAL_HIGHS_LOWS: 68,
  PREVIOUS_DAY_SWEEP: 66,
  COMPRESSION_BREAKOUT: 58,
  GAP_FILL: 52,
  BREAKER_BLOCK: 46,
  MITIGATION_BLOCK: 42,
  NO_TRADE: 0,
};

function parsePrice(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isValidPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function calculateRisk(entry: number, stop: number): number {
  return Math.abs(entry - stop);
}

function calculateTargets(decision: TradeDecision, entry: number | null, stop: number | null): { t1: number | null; t2: number | null } {
  if (decision === 'NO TRADE' || !isValidPrice(entry) || !isValidPrice(stop)) return { t1: null, t2: null };
  const risk = calculateRisk(entry, stop);
  const t1 = decision === 'LONG' ? entry + risk * 1.5 : entry - risk * 1.5;
  const t2 = decision === 'LONG' ? entry + risk * 2.0 : entry - risk * 2.0;
  return {
    t1: Math.round(t1 / 0.25) * 0.25,
    t2: Math.round(t2 / 0.25) * 0.25,
  };
}

function normalizeConfidence(value: unknown, fallback: Confidence = 'Low'): Confidence {
  if (value === 'High' || value === 'Medium' || value === 'Low') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'high') return 'High';
    if (lower === 'medium') return 'Medium';
    if (lower === 'low') return 'Low';
  }
  if (typeof value === 'number') {
    if (value >= 0.75) return 'High';
    if (value >= 0.45) return 'Medium';
  }
  return fallback;
}

function inferDecisionFromText(text: string): TradeDecision {
  const upper = text.toUpperCase();
  if (upper.includes('NO TRADE')) return 'NO TRADE';
  if (upper.includes('SHORT') || upper.includes('BEARISH') || upper.includes('SELL')) return 'SHORT';
  if (upper.includes('LONG') || upper.includes('BULLISH') || upper.includes('BUY')) return 'LONG';
  return 'NO TRADE';
}

function normalizeTriggerState(value: unknown, decision: TradeDecision, entry: number | null, stop: number | null, reason: string): TriggerState {
  if (value === 'TRIGGERED' || value === 'PENDING_TRIGGER' || value === 'NO_TRIGGER') return value;
  if (decision === 'NO TRADE') return 'NO_TRIGGER';
  const text = reason.toUpperCase();
  if (text.includes('WAIT') || text.includes('PENDING') || text.includes('BREAK')) return 'PENDING_TRIGGER';
  return isValidPrice(entry) && isValidPrice(stop) ? 'TRIGGERED' : 'NO_TRIGGER';
}

function canonicalizeSetup(...parts: Array<unknown>): AppRuleSetup {
  const text = parts.filter(Boolean).join(' ').toUpperCase();
  if (!text || text.includes('NO TRADE')) return 'NO_TRADE';
  if (text.includes('LIQUIDITY') || text.includes('SWEEP') || text.includes('HUNT') || text.includes('RECLAIM')) return 'LIQUIDITY_SWEEP';
  if (text.includes('MOMENTUM') || text.includes('RUNAWAY') || text.includes('BREATHER') || text.includes('STAIRCASE')) return 'MOMENTUM_RUNAWAY';
  if (text.includes('FVG') || text.includes('FAIR VALUE') || text.includes('IMBALANCE')) return 'FVG_IMBALANCE';
  if (text.includes('INITIAL BALANCE') || text.includes('IB EXTENSION') || text.includes('IB HIGH') || text.includes('IB LOW')) return 'INITIAL_BALANCE_EXTENSION';
  if (text.includes('OPENING ORDER BLOCK') || text.includes('CONFIRMATION BAR')) return 'OPENING_ORDER_BLOCK';
  if (text.includes('61.8') || text.includes('GOLDEN') || text.includes('ORDER BLOCK')) return 'ORDER_BLOCK_618';
  if (text.includes('EQUAL HIGH') || text.includes('EQUAL LOW') || text.includes('EQH') || text.includes('EQL')) return 'EQUAL_HIGHS_LOWS';
  if (text.includes('PDH') || text.includes('PDL') || text.includes('PREVIOUS DAY')) return 'PREVIOUS_DAY_SWEEP';
  if (text.includes('COMPRESSION') || text.includes('COIL') || text.includes('SPRING')) return 'COMPRESSION_BREAKOUT';
  if (text.includes('GAP FILL') || text.includes('OPENING GAP')) return 'GAP_FILL';
  if (text.includes('BREAKER')) return 'BREAKER_BLOCK';
  if (text.includes('MITIGATION')) return 'MITIGATION_BLOCK';
  return 'NO_TRADE';
}

function toDisplaySetup(setup: AppRuleSetup, fallback?: string): string {
  if (setup !== 'NO_TRADE') {
    return setup
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .replace('Fvg', 'FVG')
      .replace('Ib', 'IB');
  }
  return fallback || 'No Trade';
}

function sessionAllowsCandidate(sessionType: AppRuleSessionType, setup: AppRuleSetup): boolean {
  const liveSession = sessionType === 'lunch' || sessionType === 'replay_lunch' ? 'lunch' : 'morning';
  if (liveSession === 'lunch') {
    return setup !== 'OPENING_ORDER_BLOCK' && setup !== 'GAP_FILL';
  }
  return true;
}

function riskGate(candidate: Pick<AppRuleCandidate, 'decision' | 'entry' | 'stop'>): string | null {
  if (candidate.decision !== 'LONG' && candidate.decision !== 'SHORT') return 'No directional trade decision.';
  if (!isValidPrice(candidate.entry) || !isValidPrice(candidate.stop)) return 'Missing measurable ENTRY or STOP.';
  const risk = calculateRisk(candidate.entry, candidate.stop);
  if (risk > SYSTEM_RULES.FIXED_STOP_RISK_POINTS) {
    return `Actual structure risk must be ${SYSTEM_RULES.FIXED_STOP_RISK_POINTS} points or less. Current app risk is ${risk.toFixed(2)} points.`;
  }
  return null;
}

function scoreCandidate(candidate: AppRuleCandidate, context: RuleEngineContext): number {
  const riskIssue = riskGate(candidate);
  if (riskIssue) return -500;
  const confidence = candidate.confidence === 'High' ? 25 : candidate.confidence === 'Medium' ? 14 : 5;
  const setup = SETUP_PRIORITY[candidate.canonicalSetup] || 0;
  const riskScore = 18;
  const triggerScore = candidate.triggerState === 'TRIGGERED' ? 10 : candidate.triggerState === 'PENDING_TRIGGER' ? 6 : -20;
  const priority = typeof candidate.priorityScore === 'number' ? Math.max(0, Math.min(candidate.priorityScore, 1)) * 12 : 0;
  const rank = candidate.rank ? Math.max(0, 7 - candidate.rank) : 0;
  const session = sessionAllowsCandidate(context.sessionType, candidate.canonicalSetup) ? 8 : -80;
  const rag =
    candidate.ragSupport === 'SUPPORTS PLAN' ? 6 :
    candidate.ragSupport === 'CONFLICTS WITH PLAN' ? -12 :
    0;

  return setup + confidence + riskScore + triggerScore + priority + rank + session + rag;
}

function makeNoTrade(reason: string, setupName = 'No Trade'): AppRuleCandidate {
  return {
    setupName,
    canonicalSetup: 'NO_TRADE',
    ruleCategory: 'APP NO-TRADE GATE',
    decision: 'NO TRADE',
    entry: null,
    stop: null,
    confidence: 'Low',
    whyThisPlan: reason,
    invalidation: reason,
    triggerState: 'NO_TRIGGER',
    entryTrigger: null,
    priorityScore: null,
    rank: null,
    rejectionReason: reason,
    appOwned: true,
  };
}

export function buildAppRuleCandidate(result: AnalysisResult | null | undefined, context: RuleEngineContext): AppRuleCandidate {
  if (!result) return makeNoTrade('No analysis result was available for the app rule engine.');

  const observations: AppRuleCandidate[] = [];
  const addObservation = (candidate: AppRuleCandidate) => {
    const issue = riskGate(candidate);
    const sessionIssue = sessionAllowsCandidate(context.sessionType, candidate.canonicalSetup)
      ? null
      : `${candidate.setupName} is not allowed in ${context.sessionType}.`;
    observations.push({
      ...candidate,
      rejectionReason: issue || sessionIssue || candidate.rejectionReason || null,
    });
  };

  if (result.current_rule_analysis) {
    const rule = result.current_rule_analysis;
    const setup = canonicalizeSetup(rule.setup_detected, rule.rule_category, rule.summary, result.dayType);
    const entry = parsePrice(rule.entry);
    const stop = parsePrice(rule.stop);
    const decision = inferDecisionFromText([rule.setup_detected, rule.rule_category, rule.summary, result.dayType].join(' '));
    addObservation({
      setupName: toDisplaySetup(setup, rule.setup_detected),
      canonicalSetup: setup,
      ruleCategory: rule.rule_category || 'APP RULE ENGINE',
      decision,
      entry,
      stop,
      confidence: normalizeConfidence(rule.base_confidence, normalizeConfidence(result.confidence)),
      whyThisPlan: rule.summary || rule.no_trade_reason || 'Structured chart facts were reviewed by the app rule engine.',
      invalidation: rule.no_trade_reason || result.levelCheck || result.structureStatus || 'Invalid if price violates the protected stop before entry confirmation.',
      triggerState: normalizeTriggerState(rule.trigger_state, decision, entry, stop, rule.summary || ''),
      entryTrigger: rule.entry_trigger || null,
      priorityScore: result.priorityResult?.score ?? null,
      rank: null,
      ragSupport: result.rag_learning_context?.historical_support_rating,
      rejectionReason: rule.no_trade_reason,
      appOwned: true,
    });
  }

  if (Array.isArray(result.candidate_trade_plans)) {
    result.candidate_trade_plans.forEach((candidate, index) => {
      const setup = canonicalizeSetup(candidate.setup_name, candidate.rule_category, candidate.why_this_plan);
      const entry = parsePrice(candidate.entry);
      const stop = parsePrice(candidate.stop);
      addObservation({
        setupName: toDisplaySetup(setup, candidate.setup_name),
        canonicalSetup: setup,
        ruleCategory: candidate.rule_category || 'APP CANDIDATE REVIEW',
        decision: candidate.direction || 'NO TRADE',
        entry,
        stop,
        confidence: normalizeConfidence(candidate.confidence),
        whyThisPlan: candidate.why_this_plan || 'Candidate was reviewed by the app rule engine.',
        invalidation: candidate.invalidation || 'No invalidation was provided by chart extraction.',
        triggerState: normalizeTriggerState(candidate.trigger_state, candidate.direction || 'NO TRADE', entry, stop, candidate.why_this_plan || ''),
        entryTrigger: candidate.entry_trigger || null,
        priorityScore: candidate.priority_score ?? result.priorityResult?.score ?? null,
        rank: candidate.rank ?? index + 1,
        ragSupport: candidate.rag_support,
        rejectionReason: candidate.rejection_reason,
        appOwned: true,
      });
    });
  }

  if (result.final_trade_plan) {
    const plan = result.final_trade_plan;
    const setup = canonicalizeSetup(plan.why_this_plan, result.dayType, result.current_rule_analysis?.setup_detected);
    const entry = parsePrice(plan.entry);
    const stop = parsePrice(plan.stop);
    addObservation({
      setupName: toDisplaySetup(setup, result.current_rule_analysis?.setup_detected || 'Final Trade Plan'),
      canonicalSetup: setup,
      ruleCategory: 'APP FINAL PLAN REVIEW',
      decision: plan.decision || 'NO TRADE',
      entry,
      stop,
      confidence: normalizeConfidence(plan.final_confidence),
      whyThisPlan: plan.why_this_plan || 'Final observed plan was reviewed by the app rule engine.',
      invalidation: plan.what_would_invalidate || 'No invalidation was provided by chart extraction.',
      triggerState: normalizeTriggerState(plan.trigger_state, plan.decision || 'NO TRADE', entry, stop, plan.why_this_plan || ''),
      entryTrigger: plan.entry_trigger || null,
      priorityScore: result.priorityResult?.score ?? null,
      rank: 2,
      ragSupport: result.rag_learning_context?.historical_support_rating,
      appOwned: true,
    });
  }

  const executable = observations
    .filter((candidate) => !riskGate(candidate) && sessionAllowsCandidate(context.sessionType, candidate.canonicalSetup))
    .sort((a, b) => scoreCandidate(b, context) - scoreCandidate(a, context))[0];

  if (!executable) {
    const noTradeReason =
      observations.find((candidate) => candidate.rejectionReason)?.rejectionReason ||
      result.current_rule_analysis?.no_trade_reason ||
      'No app-approved setup survived the rule, risk, and session gates.';
    return makeNoTrade(noTradeReason);
  }

  const targets = calculateTargets(executable.decision, executable.entry, executable.stop);
  if (!isValidPrice(targets.t1) || !isValidPrice(targets.t2)) {
    return makeNoTrade('The app could not compute valid T1/T2 from ENTRY and STOP.');
  }

  return executable;
}
