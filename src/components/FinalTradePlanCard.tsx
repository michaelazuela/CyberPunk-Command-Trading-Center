import React from 'react';
import { NormalizedTradePlan } from '../lib/tradePlan';
import { Target, AlertTriangle, Shield, Brain } from 'lucide-react';
import { cn } from '../lib/utils';

export default function FinalTradePlanCard({ 
  plan, 
  agentLearningUsed,
  title = "FINAL TRADE PLAN"
}: { 
  plan: NormalizedTradePlan; 
  agentLearningUsed?: boolean;
  title?: string;
}) {
  if (plan.source === "missing") {
    return (
      <div className="card-base flex flex-col mb-4">
        <div className="card-header border-b border-[var(--b1)] pb-2 mb-4">
          <span className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[var(--txt2)]" />
            {title}
          </span>
        </div>
        <div className="bg-[var(--rd-d)] border border-[var(--rd-b)] p-4 rounded-sm text-center flex flex-col items-center">
          <AlertTriangle className="w-8 h-8 text-[var(--red)] mx-auto mb-2" />
          <h3 className="text-[12px] font-mono font-bold text-[var(--red)] mb-1 uppercase">NO VALID TRADE PLAN GENERATED</h3>
          <p className="text-[10px] text-[var(--red)]/80 max-w-[400px] mx-auto leading-relaxed">
            No executable trade plan was returned by the analysis. Review the chart, run Deep Pro Review, or upload a clearer screenshot.
          </p>
        </div>
      </div>
    );
  }

  const isNoTrade = plan.decision === "NO TRADE" || (!plan.canExecute && plan.decision !== "LONG" && plan.decision !== "SHORT");
  const themeColor = isNoTrade ? 'var(--txt2)' : (plan.decision === "LONG" ? 'var(--green)' : 'var(--red)');
  const themeClass = isNoTrade ? 'text-[var(--txt2)]' : (plan.decision === "LONG" ? 'text-[var(--green)]' : 'text-[var(--red)]');
  
  const sourceLabel = plan.source === "final_trade_plan" ? "FINAL PLAN" : 
                      plan.source === "tradePlan" ? "STRUCTURED TRADE PLAN" : 
                      "LEGACY FALLBACK";

  return (
    <div className="bg-[var(--b0)] border border-[var(--b2)] p-4 relative mb-4">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--b2)]">
        <span className="text-[12px] font-mono font-bold text-[var(--txt)] tracking-widest flex items-center gap-2 uppercase">
          <img src="/assets/AILogo.svg" alt="AI" className="w-3 h-3 invert opacity-50" />
          {title}
        </span>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[8px] font-mono text-[var(--txt3)] uppercase mb-0.5">SOURCE</span>
            <span className="text-[9px] font-mono text-[var(--txt2)] bg-[var(--b1)] px-1">{sourceLabel}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[8px] font-mono text-[var(--txt3)] uppercase mb-0.5">CONFIDENCE</span>
            <span className={cn("text-[9px] font-mono px-1", 
                plan.finalConfidence === 'High' ? 'text-[var(--green)] bg-[var(--green)]/10' : 
                plan.finalConfidence === 'Medium' ? 'text-[var(--amber)] bg-[var(--amber)]/10' : 
                'text-[var(--txt2)] bg-[var(--b1)]'
            )}>
              {plan.finalConfidence.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left side: Decision & Prices */}
        <div className="auto mb-4 md:mb-0 min-w-[200px]">
          <div className="mb-4">
            <span className="text-[10px] font-mono text-[var(--txt3)] uppercase block mb-1">DECISION</span>
            <div className={cn("text-[20px] font-bold font-mono tracking-wider flex items-center gap-2 uppercase", themeClass)}>
              {plan.decision === "NO TRADE" ? <Shield className="w-5 h-5" /> : (plan.decision === "LONG" ? <Target className="w-5 h-5" /> : <Target className="w-5 h-5 rotate-180" />)}
              {plan.decision}
            </div>
          </div>

          {!isNoTrade && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[var(--b1)] border border-[var(--b2)] p-2 rounded-sm relative">
                 <span className="text-[9px] font-mono text-[var(--txt3)] uppercase block mb-1">ENTRY</span>
                 <span className={cn("text-[14px] font-mono", themeClass)}>{plan.entry !== null ? plan.entry : '--'}</span>
              </div>
              <div className="bg-[var(--red)]/5 border border-[var(--red)]/20 p-2 rounded-sm relative">
                 <span className="text-[9px] font-mono text-[var(--red)]/70 uppercase block mb-1">STOP</span>
                 <span className="text-[14px] font-mono text-[var(--red)]">{plan.stop !== null ? plan.stop : '--'}</span>
              </div>
              <div className="bg-[var(--cyan)]/5 border border-[var(--cyan)]/20 p-2 rounded-sm relative">
                 <span className="text-[9px] font-mono text-[var(--cyan)]/70 uppercase block mb-1">T1</span>
                 <span className="text-[14px] font-mono text-[var(--cyan)]">{plan.t1 !== null ? plan.t1 : '--'}</span>
              </div>
              <div className="bg-[var(--green)]/5 border border-[var(--green)]/20 p-2 rounded-sm relative">
                 <span className="text-[9px] font-mono text-[var(--green)]/70 uppercase block mb-1">T2</span>
                 <span className="text-[14px] font-mono text-[var(--green)]">{plan.t2 !== null ? plan.t2 : '--'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right side: Rationale */}
        <div className="flex-1 border-t md:border-t-0 md:border-l border-[var(--b2)] pt-4 md:pt-0 md:pl-6 flex flex-col gap-4">
          <div>
            <span className="text-[10px] font-mono text-[var(--txt2)] uppercase block mb-1">Why This Plan</span>
            <p className="text-[12px] text-[var(--txt)] leading-relaxed">
              {plan.whyThisPlan}
            </p>
          </div>
          <div className="bg-[var(--rd-d)] border-l-2 border-[var(--red)] p-3">
            <span className="text-[10px] font-mono text-[var(--red)] uppercase block mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Invalidation
            </span>
            <p className="text-[11px] text-[var(--red)]/90 leading-relaxed font-mono">
              {plan.invalidation}
            </p>
          </div>
          {plan.riskReward && (
             <div className="flex gap-4 border-t border-[var(--b2)] pt-3 text-[11px] font-mono text-[var(--txt2)]">
               <span>Risk/Reward: <span className="text-[var(--txt)]">{plan.riskReward}</span></span>
             </div>
          )}
        </div>
      </div>
      {agentLearningUsed && (
        <div className="absolute -top-3 right-4 bg-[var(--green)] text-[var(--bg)] text-[9px] font-mono px-2 py-0.5 rounded flex items-center gap-1 font-bold">
          <Brain className="w-3 h-3" />
          AGENT LEARNING APPLIED
        </div>
      )}
    </div>
  );
}
