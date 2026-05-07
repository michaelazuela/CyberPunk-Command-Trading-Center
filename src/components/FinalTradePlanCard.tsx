import React from 'react';
import { CheckCircle2, Shield, Target, TrendingUp } from 'lucide-react';
import { NormalizedTradePlan } from '../lib/tradePlan';
import { cn } from '../lib/utils';

interface FinalTradePlanCardProps {
  plan: NormalizedTradePlan;
  title?: string;
  agentLearningUsed?: boolean;
}

export default function FinalTradePlanCard({ plan, title = "3. FINAL TRADE PLAN", agentLearningUsed }: FinalTradePlanCardProps) {
  let sourceBadge = "MISSING";
  switch (plan.source) {
    case "final_trade_plan": sourceBadge = "FINAL PLAN"; break;
    case "tradePlan": sourceBadge = "STRUCTURED TRADE PLAN"; break;
    case "legacy": sourceBadge = "LEGACY FALLBACK"; break;
    case "manual": sourceBadge = "MANUAL"; break;
    case "missing": sourceBadge = "MISSING"; break;
  }

  return (
    <div className="card-base flex flex-col p-4 border border-[var(--green)]/30 bg-[var(--green)]/5 mt-4">
      <h3 className="text-[11px] font-mono font-bold text-[var(--txt)] flex items-center gap-2 mb-4">
        <CheckCircle2 size={14} className="text-[var(--green)]" />
        {title}
        <span className="qd-badge ml-auto opacity-70">
          {sourceBadge}
        </span>
        {agentLearningUsed !== undefined && (
          <span className="qd-badge opacity-70 ml-2">
            {agentLearningUsed ? "HISTORY CALIBRATED" : "SCREENSHOT + RULES ONLY"}
          </span>
        )}
      </h3>

      {!plan.canExecute ? (
        <div className="flex flex-col items-center justify-center p-6 mb-4 border border-dashed border-[var(--red)]/40 bg-[var(--red)]/5 text-center">
          <span className="text-lg font-black tracking-tighter uppercase mb-2 text-[var(--red)]">
            NO VALID TRADE PLAN GENERATED
          </span>
          <span className="text-[11px] text-[var(--txt2)]">
            Execution disabled until ENTRY, STOP, T1, and T2 are available.
          </span>
          {plan.decision === "NO TRADE" && (
            <span className="mt-4 text-[13px] text-[var(--amber)] italic max-w-[80%]">
              {plan.whyThisPlan}
            </span>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center justify-center py-6 mb-4 border border-[var(--b1)] bg-[var(--bg)]">
            <span className={cn(
              "text-3xl font-black italic tracking-tighter uppercase mb-2",
              plan.decision === 'LONG' ? "text-[var(--green)]" : "text-[var(--red)]"
            )}>
              {plan.decision}
            </span>
            <span className="qd-badge qd-badge-orange">CONFIDENCE: {plan.finalConfidence.toUpperCase()}</span>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="bg-[var(--bg)] p-2 text-center border border-[var(--b1)]">
              <div className="text-[9px] font-mono text-[var(--txt2)] flex justify-center gap-1 items-center"><Target size={10} /> ENTRY</div>
              <div className="text-[14px] font-mono text-[var(--txt)] mt-1">{plan.entry}</div>
            </div>
            <div className="bg-[var(--bg)] p-2 text-center border border-[var(--b1)]">
              <div className="text-[9px] font-mono text-[var(--txt2)] flex justify-center gap-1 items-center"><Shield size={10} /> STOP</div>
              <div className="text-[14px] font-mono text-[var(--red)] mt-1">{plan.stop}</div>
              {plan.riskPoints && (
                <div className="text-[8px] text-[var(--txt3)] mt-1">RISK: {plan.riskPoints}</div>
              )}
            </div>
            <div className="bg-[var(--bg)] p-2 text-center border border-[var(--b1)]">
              <div className="text-[9px] font-mono text-[var(--txt2)] flex justify-center gap-1 items-center"><TrendingUp size={10} /> T1</div>
              <div className="text-[14px] font-mono text-[var(--green)] mt-1">{plan.t1}</div>
              {plan.riskRewardT1 && (
                <div className="text-[8px] text-[var(--txt3)] mt-1">{plan.riskRewardT1}</div>
              )}
            </div>
            <div className="bg-[var(--bg)] p-2 text-center border border-[var(--b1)]">
              <div className="text-[9px] font-mono text-[var(--txt2)] flex justify-center gap-1 items-center"><TrendingUp size={10} /> T2</div>
              <div className="text-[14px] font-mono text-[var(--green)] mt-1">{plan.t2}</div>
              {plan.riskRewardT2 && (
                <div className="text-[8px] text-[var(--txt3)] mt-1">{plan.riskRewardT2}</div>
              )}
            </div>
          </div>
        </>
      )}

      <div className="bg-[var(--s2)] p-3 rounded border border-[var(--b1)] flex flex-col gap-2 mt-2">
        <div className="text-[11px] text-[var(--txt)] whitespace-pre-wrap">
          <strong className="text-[var(--green)]">Why this plan:</strong> {plan.whyThisPlan}
        </div>
        <div className="text-[11px] text-[var(--red)] border-t border-[var(--red)]/20 pt-2 mt-2 whitespace-pre-wrap">
          <strong className="text-[var(--red)]">Invalidation:</strong> {plan.invalidation}
        </div>
      </div>
    </div>
  );
}
