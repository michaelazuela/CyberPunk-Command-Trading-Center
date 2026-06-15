import { NormalizedTradePlan } from './tradePlan';

export type PlanSessionKey = 'morning' | 'lunch' | 'evening' | 'replay_morning' | 'replay_lunch';

export interface PlanSaveReceipt {
  planVersionId: string;
  setupId?: string | null;
  ragId?: string | null;
  screenshotPath?: string | null;
  proofPath?: string | null;
  outcome?: string | null;
  embeddingStatus: 'saved' | 'pending' | 'failed' | 'skipped';
  savedAt: string;
  note?: string;
}

export interface ConfidenceBreakdown {
  rule: number;
  structure: number;
  risk: number;
  rag: number;
  timeWindow: number;
}

function compactDate(value?: string | null) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

function hashText(value: string) {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(36).toUpperCase().padStart(6, '0').slice(0, 8);
}

export function createPlanVersionId(sessionType: PlanSessionKey, tradeDate?: string | null) {
  const prefix = sessionType.toUpperCase().replace('_', '-');
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(8, 14);
  return `${prefix}-${compactDate(tradeDate)}-${stamp}`;
}

export function createSetupSignature(args: {
  sessionType: PlanSessionKey | 'morning' | 'lunch';
  instrument?: string | null;
  tradeDate?: string | null;
  plan?: Pick<NormalizedTradePlan, 'entry' | 'stop' | 't1' | 't2' | 'decision' | 'setupName'> | null;
  screenshotPath?: string | null;
}) {
  const plan = args.plan;
  const raw = [
    args.sessionType,
    args.instrument || 'MES',
    compactDate(args.tradeDate),
    plan?.decision || 'NO_TRADE',
    plan?.setupName || 'UNKNOWN',
    plan?.entry ?? 'NA',
    plan?.stop ?? 'NA',
    plan?.t1 ?? 'NA',
    plan?.t2 ?? 'NA',
    args.screenshotPath || 'NO_SCREENSHOT',
  ].join('|');
  return hashText(raw);
}

export function buildConfidenceBreakdown(args: {
  plan: NormalizedTradePlan;
  windowValid?: boolean;
  agentLearningUsed?: boolean;
  killSwitchClear?: boolean;
}): ConfidenceBreakdown {
  const confidence = args.plan.finalConfidence.toLowerCase();
  const rule = confidence === 'high' ? 100 : confidence === 'medium' ? 65 : 30;
  const structure = args.plan.triggerState === 'TRIGGERED' ? 100 : args.plan.triggerState === 'PENDING_TRIGGER' ? 55 : args.plan.canExecute ? 75 : 25;
  const risk = args.plan.riskPoints === null ? 25 : args.plan.riskPoints === 5 ? 100 : 20;
  const rag = args.agentLearningUsed === true ? 85 : args.agentLearningUsed === false ? 45 : 35;
  const timeWindow = args.windowValid === false ? 25 : 100;
  const killSwitchPenalty = args.killSwitchClear === false ? 25 : 0;

  return {
    rule,
    structure,
    risk: Math.max(0, risk - killSwitchPenalty),
    rag,
    timeWindow,
  };
}

export function buildSaveReceipt(args: Omit<PlanSaveReceipt, 'savedAt'>): PlanSaveReceipt {
  return {
    ...args,
    savedAt: new Date().toISOString(),
  };
}
