import React from 'react';
import { CheckCircle2, Route, Shield, Target, TrendingUp } from 'lucide-react';
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
    case "app_rule_engine": sourceBadge = "APP RULE ENGINE"; break;
    case "best_trade_plan": sourceBadge = "GEMINI ADVISORY"; break;
    case "candidate_trade_plan": sourceBadge = "GEMINI ADVISORY"; break;
    case "final_trade_plan": sourceBadge = "GEMINI ADVISORY"; break;
    case "current_rule_analysis": sourceBadge = "RULE ANALYSIS"; break;
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
            {plan.setupName && (
              <span className="qd-badge qd-badge-orange mb-2">
                {plan.rank ? `RANK #${plan.rank}` : "SELECTED"} · {plan.setupName}
              </span>
            )}
            <span className={cn(
              "text-3xl font-black italic tracking-tighter uppercase mb-2",
              plan.decision === 'LONG' ? "text-[var(--green)]" : "text-[var(--red)]"
            )}>
              {plan.decision}
            </span>
            <div className="flex gap-2 flex-wrap justify-center">
              <span className="qd-badge qd-badge-orange">CONFIDENCE: {plan.finalConfidence.toUpperCase()}</span>
              {plan.priorityScore !== null && plan.priorityScore !== undefined && (
                <span className="qd-badge opacity-80">PRIORITY: {plan.priorityScore}</span>
              )}
              {plan.ragSupport && (
                <span className="qd-badge opacity-80">RAG: {plan.ragSupport}</span>
              )}
              {plan.triggerState === "PENDING_TRIGGER" && (
                <span className="qd-badge qd-badge-orange">PENDING TRIGGER</span>
              )}
            </div>
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
          <strong className="text-[var(--green)]">Why this plan:</strong> {plan.whyItWon || plan.whyThisPlan}
        </div>
        {plan.entryTrigger && (
          <div className="text-[11px] text-[var(--amber)] border-t border-[var(--amber)]/20 pt-2 mt-2 whitespace-pre-wrap">
            <strong>Entry trigger:</strong> {plan.entryTrigger}
          </div>
        )}
        <div className="text-[11px] text-[var(--red)] border-t border-[var(--red)]/20 pt-2 mt-2 whitespace-pre-wrap">
          <strong className="text-[var(--red)]">Invalidation:</strong> {plan.invalidation}
        </div>
        {plan.consistencyWarnings && plan.consistencyWarnings.length > 0 && (
          <div className="text-[10px] text-[var(--amber)] border-t border-[var(--amber)]/20 pt-2 mt-2">
            <strong>Plan Consistency Checker:</strong>
            <div className="mt-2 grid gap-1">
              {plan.consistencyWarnings.map((warning, idx) => (
                <div key={`${warning}-${idx}`}>- {warning}</div>
              ))}
            </div>
          </div>
        )}
        {plan.rejectedAlternatives && plan.rejectedAlternatives.length > 0 && (
          <div className="text-[10px] text-[var(--txt2)] border-t border-[var(--b1)] pt-2 mt-2">
            <strong className="text-[var(--amber)]">Rejected alternatives:</strong>
            <div className="mt-2 grid gap-1">
              {plan.rejectedAlternatives.slice(0, 4).map((alt, idx) => (
                <div key={`${alt.setupName}-${idx}`} className="flex gap-2">
                  <span className="text-[var(--txt3)]">{idx + 1}.</span>
                  <span>
                    <span className="text-[var(--txt)]">{alt.setupName}</span>
                    {" — "}
                    {alt.rejectionReason}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {plan.tradeManagement && (
          <div className="text-[10px] text-[var(--txt2)] border-t border-[var(--b1)] pt-2 mt-2">
            <strong className="text-[var(--green)] flex items-center gap-1">
              <Route size={11} /> Trade Management Agent:
            </strong>
            <div className="mt-2 grid gap-1">
              <div><span className="text-[var(--txt)]">Style:</span> {plan.tradeManagement.management_style} · Primary success: {plan.tradeManagement.primary_success_target}</div>
              {plan.tradeManagement.move_stop_to_breakeven_at !== null && (
                <div><span className="text-[var(--txt)]">Move stop to B/E at:</span> {plan.tradeManagement.move_stop_to_breakeven_at}</div>
              )}
              {plan.tradeManagement.trail_stop_after_t1 !== null && (
                <div><span className="text-[var(--txt)]">Trail after T1:</span> {plan.tradeManagement.trail_stop_after_t1}</div>
              )}
              <div><span className="text-[var(--txt)]">At 1R:</span> {plan.tradeManagement.if_price_reaches_1r}</div>
              <div><span className="text-[var(--txt)]">At T1:</span> {plan.tradeManagement.if_price_reaches_t1}</div>
              <div><span className="text-[var(--txt)]">Failure warning:</span> {plan.tradeManagement.failure_warning}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
