import React from 'react';
import { AlertTriangle, CheckCircle2, CircleX, Route, Shield, Target, TrendingUp } from 'lucide-react';
import { NormalizedTradePlan } from '../lib/tradePlan';
import { cn } from '../lib/utils';
import { buildConfidenceBreakdown } from '../lib/planMetadata';
import { TradeDecisionStatus } from '../types';

interface FinalTradePlanCardProps {
  plan: NormalizedTradePlan;
  title?: string;
  agentLearningUsed?: boolean;
  windowValid?: boolean;
  killSwitchClear?: boolean;
  planVersionId?: string;
}

function inferNoTradeBlockers(plan: NormalizedTradePlan): string[] {
  const text = `${plan.whyThisPlan || ''} ${plan.invalidation || ''}`.toLowerCase();
  const blockers: string[] = [];

  if (text.includes('wait') || text.includes('break') || text.includes('trigger') || text.includes('pullback') || text.includes('candle')) {
    blockers.push('Waiting for candle break or confirmed trigger');
  }
  if (text.includes('risk') || text.includes('stop') || text.includes('wide')) {
    blockers.push('Risk or stop placement is not acceptable yet');
  }
  if (text.includes('outside') || text.includes('window') || text.includes('time')) {
    blockers.push('Outside the preferred trading window');
  }
  if (text.includes('midnight')) {
    blockers.push('Midnight Open context is missing or unresolved');
  }
  if (text.includes('conflict') || text.includes('rag') || text.includes('history')) {
    blockers.push('Historical/RAG context conflicts or is insufficient');
  }
  if (text.includes('structure') || text.includes('clean') || text.includes('no valid')) {
    blockers.push('No clean executable market structure');
  }
  if (plan.entry === null || plan.stop === null) {
    blockers.push('ENTRY and STOP are not both defined by the app-owned rule engine');
  }

  return Array.from(new Set(blockers.length > 0 ? blockers : ['No executable setup passed the app-owned rule checks']));
}

function ValidityRow({ label, ready, detail }: { key?: React.Key; label: string; ready: boolean; detail: string }) {
  return (
    <div className={cn(
      'border p-2 font-mono',
      ready ? 'border-[var(--green)]/25 bg-[var(--green)]/5' : 'border-[var(--orange)]/25 bg-[var(--orange)]/5'
    )}>
      <div className="flex items-center gap-2">
        {ready ? <CheckCircle2 className="w-3 h-3 text-[var(--green)]" /> : <AlertTriangle className="w-3 h-3 text-[var(--orange)]" />}
        <span className="text-[9px] uppercase tracking-[0.14em] text-[var(--txt2)]">{label}</span>
      </div>
      <div className={cn('mt-1 text-[10px]', ready ? 'text-[var(--green)]' : 'text-[var(--orange)]')}>{detail}</div>
    </div>
  );
}

function formatDecisionStatus(status?: TradeDecisionStatus): string {
  switch (status) {
    case TradeDecisionStatus.ApprovedTrade: return 'Approved Trade';
    case TradeDecisionStatus.ConditionalTrade: return 'Conditional Trade';
    case TradeDecisionStatus.NoTrade: return 'No Trade';
    case TradeDecisionStatus.Wait: return 'Wait';
    case TradeDecisionStatus.InvalidScreenshot: return 'Invalid Screenshot';
    case TradeDecisionStatus.OutsideRules: return 'Outside Rules';
    default: return 'Pipeline Pending';
  }
}

function DecisionStepAudit({ plan }: { plan: NormalizedTradePlan }) {
  const steps = plan.decisionAuditTrail || [];
  if (steps.length === 0) return null;

  return (
    <div className="mb-4 border border-[var(--b1)] bg-[var(--s2)] p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--txt2)]">
          Deterministic Decision Steps
        </div>
        <span className={cn(
          'qd-badge',
          plan.decisionStatus === TradeDecisionStatus.ApprovedTrade || plan.decisionStatus === TradeDecisionStatus.ConditionalTrade
            ? 'text-[var(--green)] border-[var(--green)]/30'
            : plan.decisionStatus === TradeDecisionStatus.NoTrade || plan.decisionStatus === TradeDecisionStatus.Wait
              ? 'text-[var(--orange)] border-[var(--orange)]/30'
              : 'text-[var(--red)] border-[var(--red)]/30'
        )}>
          {formatDecisionStatus(plan.decisionStatus)}
        </span>
      </div>
      <div className="grid gap-1.5">
        {steps.map((step, index) => {
          const isFail = step.status === 'fail';
          const isWarning = step.status === 'warning';
          return (
            <div
              key={`${step.step}-${index}`}
              className={cn(
                'grid grid-cols-[28px_150px_1fr] gap-2 border px-2 py-2 font-mono text-[10px]',
                isFail
                  ? 'border-[var(--red)]/30 bg-[var(--red)]/5'
                  : isWarning
                    ? 'border-[var(--orange)]/30 bg-[var(--orange)]/5'
                    : 'border-[var(--green)]/20 bg-[var(--green)]/5'
              )}
            >
              <div className={cn(
                'flex items-center justify-center font-bold',
                isFail ? 'text-[var(--red)]' : isWarning ? 'text-[var(--orange)]' : 'text-[var(--green)]'
              )}>
                {index + 1}
              </div>
              <div className="flex items-center gap-2 uppercase tracking-[0.12em] text-[var(--txt2)]">
                {isFail ? <CircleX className="h-3 w-3 text-[var(--red)]" /> : isWarning ? <AlertTriangle className="h-3 w-3 text-[var(--orange)]" /> : <CheckCircle2 className="h-3 w-3 text-[var(--green)]" />}
                {step.status}
              </div>
              <div>
                <div className="text-[var(--txt)]">{step.label}</div>
                <div className={cn('mt-1 leading-relaxed', isFail ? 'text-[var(--red)]' : isWarning ? 'text-[var(--orange)]' : 'text-[var(--txt2)]')}>
                  {step.message}
                </div>
                {step.noTradeReason && (
                  <div className="mt-1 text-[var(--txt3)]">Reason: {step.noTradeReason}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function FinalTradePlanCard({
  plan,
  title = "3. FINAL TRADE PLAN",
  agentLearningUsed,
  windowValid = true,
  killSwitchClear = true,
  planVersionId
}: FinalTradePlanCardProps) {
  let sourceBadge = "MISSING";
  switch (plan.source) {
    case "app_rule_engine": sourceBadge = "APP RULE ENGINE"; break;
    case "best_trade_plan": sourceBadge = "ADVISORY ONLY"; break;
    case "candidate_trade_plan": sourceBadge = "ADVISORY ONLY"; break;
    case "final_trade_plan": sourceBadge = "ADVISORY ONLY"; break;
    case "current_rule_analysis": sourceBadge = "RULE ANALYSIS"; break;
    case "tradePlan": sourceBadge = "STRUCTURED TRADE PLAN"; break;
    case "legacy": sourceBadge = "LEGACY FALLBACK"; break;
    case "manual": sourceBadge = "MANUAL"; break;
    case "missing": sourceBadge = "MISSING"; break;
  }

  const riskUnderMax = plan.riskPoints !== null && plan.riskPoints <= 15;
  const validityChecks = [
    { label: 'Entry', ready: plan.entry !== null, detail: plan.entry !== null ? String(plan.entry) : 'Missing' },
    { label: 'Stop', ready: plan.stop !== null, detail: plan.stop !== null ? String(plan.stop) : 'Missing' },
    { label: 'T1/T2', ready: plan.t1 !== null && plan.t2 !== null, detail: plan.t1 !== null && plan.t2 !== null ? 'App computed' : 'Missing' },
    { label: 'Risk', ready: riskUnderMax, detail: plan.riskPoints !== null ? `${plan.riskPoints} pts` : 'Missing' },
    { label: 'Window', ready: windowValid, detail: windowValid ? 'Valid' : 'Check time' },
    { label: 'RAG', ready: agentLearningUsed !== undefined, detail: agentLearningUsed ? 'Used' : agentLearningUsed === false ? 'Checked empty' : 'Unknown' },
    { label: 'Kill Switch', ready: killSwitchClear, detail: killSwitchClear ? 'Clear' : 'Active' },
  ];
  const blockers = inferNoTradeBlockers(plan);
  const confidenceBreakdown = buildConfidenceBreakdown({ plan, windowValid, agentLearningUsed, killSwitchClear });
  const confidenceRows = [
    { label: 'Rule', value: confidenceBreakdown.rule },
    { label: 'Structure', value: confidenceBreakdown.structure },
    { label: 'Risk', value: confidenceBreakdown.risk },
    { label: 'RAG', value: confidenceBreakdown.rag },
    { label: 'Time', value: confidenceBreakdown.timeWindow },
  ];
  const decisionStatusLabel = formatDecisionStatus(plan.decisionStatus);

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
        {planVersionId && (
          <span className="qd-badge opacity-70 ml-2">
            ID: {planVersionId}
          </span>
        )}
      </h3>

      <DecisionStepAudit plan={plan} />

      {!plan.canExecute ? (
        <div className="mb-4 border border-dashed border-[var(--orange)]/40 bg-[var(--orange)]/5 p-4">
          <div className="flex items-center gap-2 text-[var(--orange)] font-mono uppercase tracking-[0.14em] text-[12px] font-bold">
            <AlertTriangle className="w-4 h-4" />
            {decisionStatusLabel}
          </div>
          <div className="mt-2 text-[11px] text-[var(--txt2)]">
            No-trade and wait states are valid completed outcomes. Execution remains disabled unless the deterministic pipeline returns Approved Trade or Conditional Trade.
          </div>
          {plan.noTradeReason && (
            <div className="mt-3 inline-flex border border-[var(--orange)]/30 bg-[var(--bg)] px-2 py-1 text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--orange)]">
              Gate: {plan.noTradeReason}
            </div>
          )}
          <div className="mt-4 grid gap-2">
            {blockers.map((blocker) => (
              <div key={blocker} className="border border-[var(--orange)]/20 bg-[var(--bg)] p-2 text-[10px] font-mono text-[var(--orange)]">
                {blocker}
              </div>
            ))}
          </div>
          <div className="mt-4 text-[11px] text-[var(--amber)] italic">
            {plan.whyThisPlan}
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4 border border-[var(--b1)] bg-[var(--s2)] p-3">
            <div className="mb-3 text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--txt2)]">Plan Validity Checklist</div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {validityChecks.map((check) => (
                <ValidityRow key={check.label} label={check.label} ready={check.ready} detail={check.detail} />
              ))}
            </div>
          </div>

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

          <div className="mb-4 border border-[var(--green)]/20 bg-[var(--green)]/5 px-3 py-2 text-[10px] font-mono text-[var(--txt2)]">
            <span className="text-[var(--green)] font-bold">APP-OWNED LEVELS:</span>{' '}
            executable ENTRY / STOP come from the rule engine; T1 is 1.5R and T2 is 2.0R from normalized risk.
          </div>

          <div className="mb-4 border border-[var(--b1)] bg-[var(--s2)] p-3">
            <div className="mb-3 text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--txt2)]">Confidence Reason Breakdown</div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {confidenceRows.map((row) => (
                <div key={row.label} className="border border-[var(--b2)] bg-[var(--bg)] p-2 font-mono">
                  <div className="text-[9px] uppercase tracking-[0.14em] text-[var(--txt3)]">{row.label}</div>
                  <div className={cn('text-[14px] mt-1 font-bold', row.value >= 75 ? 'text-[var(--green)]' : row.value >= 50 ? 'text-[var(--orange)]' : 'text-[var(--red)]')}>{row.value}%</div>
                </div>
              ))}
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
