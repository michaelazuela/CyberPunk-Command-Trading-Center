import React from 'react';
import { AnalysisResult, SessionState } from '../types';
import { SYSTEM_RULES } from '../constants';
import { cn } from '../lib/utils';
import MonteCarloSection from './MonteCarloSection';
import ApiCostPanel from './ApiCostPanel';
import { TIME_WINDOWS, getWindowStatus, formatWindow, formatNYTimeStr } from '../config/timeWindows';
import { buildAppTradePlan, AppPlanSessionType } from '../lib/planEngine';
import { NormalizedTradePlan } from '../lib/tradePlan';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock3,
  Database,
  FileCheck2,
  History,
  Target,
  Zap
} from 'lucide-react';

type PlanSummary = {
  label: string;
  result?: AnalysisResult | null;
  sessionType: AppPlanSessionType;
  plan: NormalizedTradePlan | null;
};

export default function Dashboard({
  session,
  onUpdateSession,
  isAuthenticated = false
}: {
  session: SessionState;
  onUpdateSession: (s: Partial<SessionState>) => void;
  isAuthenticated?: boolean;
}) {
  const instrument = session.dailyInstrument || 'MES';
  const morningPlan = session.analysisResult
    ? buildAppTradePlan(session.analysisResult, { sessionType: 'morning', instrument })
    : null;
  const lunchPlan = session.lunchAnalysisResult
    ? buildAppTradePlan(session.lunchAnalysisResult, { sessionType: 'lunch', instrument })
    : null;
  const replayMorningPlan = session.replayMorningResult
    ? buildAppTradePlan(session.replayMorningResult, { sessionType: 'replay_morning', instrument })
    : null;
  const replayLunchPlan = session.replayLunchResult
    ? buildAppTradePlan(session.replayLunchResult, { sessionType: 'replay_lunch', instrument })
    : null;

  const plans: PlanSummary[] = [
    { label: 'Morning', result: session.analysisResult, sessionType: 'morning', plan: morningPlan },
    { label: 'Lunch', result: session.lunchAnalysisResult, sessionType: 'lunch', plan: lunchPlan },
    { label: 'Replay Morning', result: session.replayMorningResult, sessionType: 'replay_morning', plan: replayMorningPlan },
    { label: 'Replay Lunch', result: session.replayLunchResult, sessionType: 'replay_lunch', plan: replayLunchPlan },
  ];

  const openTrades = session.trades.filter(t => t.status === 'OPEN' || t.status === 'EXECUTED');
  const closedTrades = session.trades.filter(t => t.status !== 'OPEN' && t.status !== 'EXECUTED');
  const totalPnl = closedTrades.reduce((acc, t) => acc + (t.pnl || t.pnlDollars || 0), 0);
  const proofCount = session.trades.filter(t => !!t.proof_screenshot_url).length;

  const morningStatus = getWindowStatus('morning');
  const lunchStatus = getWindowStatus('lunch');
  const activePlan = lunchPlan?.canExecute ? lunchPlan : morningPlan;
  const latestResult = session.lunchAnalysisResult || session.analysisResult || session.replayLunchResult || session.replayMorningResult;
  const latestLearning = latestResult?.agentLearningSummary;
  const ragContext = latestResult?.rag_learning_context;
  const similarCount = latestLearning?.setupCount ?? ragContext?.rag_records_found ?? latestResult?.similarSetups?.length ?? 0;
  const completedCount = latestLearning?.completedCount ?? (
    (ragContext?.historical_win_count || 0) +
    (ragContext?.historical_loss_count || 0) +
    (ragContext?.historical_scratch_count || 0) +
    (ragContext?.historical_no_trade_count || 0)
  );
  const winRate = latestLearning?.winRate ?? (
    completedCount > 0 && ragContext
      ? Math.round(((ragContext.historical_win_count || 0) / completedCount) * 100)
      : null
  );

  const isLossKillSwitch = session.killSwitches.losses >= SYSTEM_RULES.KILL_SWITCH_LOSSES;
  const isFillKillSwitch = session.killSwitches.fills >= SYSTEM_RULES.KILL_SWITCH_FILLS;
  const killSwitchActive = isLossKillSwitch || isFillKillSwitch;

  const formatCurrency = (val: number) => `${val >= 0 ? '+' : '-'}$${Math.abs(val).toFixed(2)}`;

  return (
    <div className="space-y-6 fade-up">
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>MES/MNQ COMMAND CENTER · APP-OWNED TRADE PLAN STATUS</p>
        </div>
        <div className={cn("qd-badge px-3", killSwitchActive ? "qd-badge-red" : "qd-badge-green")}>
          {killSwitchActive ? 'KILL SWITCH ACTIVE' : 'SYSTEM READY'}
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4">
        <div className="kpi-strip rounded-sm overflow-hidden">
          <KpiCell
            label="Session P&L"
            value={formatCurrency(totalPnl)}
            sub={`${closedTrades.length} closed · ${openTrades.length} open`}
            valueClass={totalPnl > 0 ? "text-[var(--green)]" : totalPnl < 0 ? "text-[var(--red)]" : "text-[var(--txt)]"}
            featured
          />
          <KpiCell
            label="Best Active Plan"
            value={activePlan?.canExecute ? activePlan.decision : 'WAIT'}
            sub={activePlan?.canExecute ? `${activePlan.setupName || 'Setup'} · ${activePlan.source}` : 'No executable app plan'}
            valueClass={activePlan?.canExecute ? "text-[var(--orange)]" : "text-[var(--txt2)]"}
          />
          <KpiCell
            label="Kill Switches"
            value={`${session.killSwitches.losses}/${SYSTEM_RULES.KILL_SWITCH_LOSSES}`}
            sub={`Fills ${session.killSwitches.fills}/${SYSTEM_RULES.KILL_SWITCH_FILLS}`}
            valueClass={killSwitchActive ? "text-[var(--red)]" : "text-[var(--txt)]"}
          />
          <KpiCell
            label="RAG Learning"
            value={similarCount > 0 ? `${similarCount} SETUPS` : 'EMPTY'}
            sub={winRate !== null ? `${winRate}% historical win rate` : 'Builds from live + replay saves'}
            valueClass={similarCount > 0 ? "text-[var(--green)]" : "text-[var(--amber)]"}
          />
        </div>

        <div className="card-base p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--txt3)]">Daily Instrument</div>
              <div className="text-[11px] text-[var(--txt2)]">Manual source of truth</div>
            </div>
            <div className="flex gap-2">
              {(['MES', 'MNQ'] as const).map(symbol => (
                <button
                  key={symbol}
                  onClick={() => onUpdateSession({ dailyInstrument: symbol })}
                  className={cn(
                    "h-8 min-w-[56px] border px-3 text-[11px] font-mono font-bold transition-colors",
                    instrument === symbol
                      ? "bg-[var(--orange)] border-[var(--orange)] text-black"
                      : "bg-[var(--b0)] border-[var(--b1)] text-[var(--txt2)] hover:text-[var(--txt)]"
                  )}
                >
                  {symbol}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatusTile
          icon={<CheckCircle2 size={15} />}
          label="Auth / Cloud"
          value={isAuthenticated ? 'AUTH ON' : 'AUTH OFF'}
          sub={isAuthenticated ? 'Cloud saves enabled' : 'Login required for Supabase/RAG saves'}
          tone={isAuthenticated ? 'green' : 'amber'}
        />
        <StatusTile
          icon={<Database size={15} />}
          label="Supabase / RAG"
          value={similarCount > 0 ? 'LEARNING' : 'WAITING'}
          sub={similarCount > 0 ? `${completedCount} completed historical outcomes` : 'Save replay/live outcomes to grow memory'}
          tone={similarCount > 0 ? 'green' : 'amber'}
        />
        <StatusTile
          icon={<FileCheck2 size={15} />}
          label="Proof Records"
          value={`${proofCount}`}
          sub="Trade proof screenshots attached this session"
          tone={proofCount > 0 ? 'green' : 'muted'}
        />
        <StatusTile
          icon={<Clock3 size={15} />}
          label="New York Time"
          value={formatNYTimeStr()}
          sub={`Morning ${windowLabel(morningStatus)} · Lunch ${windowLabel(lunchStatus)}`}
          tone={morningStatus === 'active' || lunchStatus === 'active' ? 'green' : 'muted'}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <WindowCard
          title="Morning Window"
          status={morningStatus}
          range={formatWindow('morning')}
          required={TIME_WINDOWS.morning.bestChart}
          checklist={TIME_WINDOWS.morning.chartMustInclude}
        />
        <WindowCard
          title="Lunch Reversal Window"
          status={lunchStatus}
          range={formatWindow('lunch')}
          required={TIME_WINDOWS.lunch.bestChart}
          checklist={TIME_WINDOWS.lunch.chartMustInclude}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <PlanCard summary={plans[0]} />
        <PlanCard summary={plans[1]} />
        <PlanCard summary={plans[2]} compact />
        <PlanCard summary={plans[3]} compact />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-4">
        <div className="card-base min-h-[300px]">
          <div className="card-header">
            <span className="flex items-center gap-2"><Activity size={14} /> Probabilistic Engine</span>
            {activePlan?.canExecute ? <span className="qd-badge qd-badge-amber">ACTIVE PLAN</span> : <span className="qd-badge qd-badge-muted">WAITING</span>}
          </div>
          {activePlan?.canExecute ? (
            <div className="-mx-[18px] -mb-[16px]">
              <MonteCarloSection
                startPrice={activePlan.entry || 0}
                stopPrice={activePlan.stop || 0}
                targetPrice={activePlan.t2 || activePlan.t1 || 0}
                targetPrice15R={activePlan.t1 || 0}
              />
            </div>
          ) : (
            <div className="empty-state min-h-[240px]">
              <BarChart3 className="w-6 h-6 mb-4 opacity-50" />
              <h3>NO EXECUTABLE PLAN</h3>
              <p>Simulation starts when the app rule engine has ENTRY, STOP, T1, and T2.</p>
            </div>
          )}
        </div>

        <div className="card-base">
          <div className="card-header">
            <span className="flex items-center gap-2"><History size={14} /> Agent Learning Snapshot</span>
            <span className="qd-badge qd-badge-muted">RAG</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Similar Setups" value={String(similarCount)} />
            <Metric label="Completed" value={String(completedCount)} />
            <Metric label="Win Rate" value={winRate !== null ? `${winRate}%` : '—'} tone={winRate !== null && winRate >= 50 ? 'green' : 'txt'} />
            <Metric label="Avg PnL" value={latestLearning?.avgPnlTicks !== null && latestLearning?.avgPnlTicks !== undefined ? `${latestLearning.avgPnlTicks} ticks` : '—'} />
          </div>
          <div className="mt-4 border-t border-[var(--b1)] pt-3 text-[11px] text-[var(--txt2)] leading-relaxed">
            {latestLearning?.strongestLesson || ragContext?.explanation || 'No learning summary yet. Run replay outcomes and save proof to build the historical baseline.'}
          </div>
          {latestResult?.midnightOpenPrice && (
            <div className="mt-4 border border-[var(--b1)] bg-[var(--b0)] p-3">
              <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--txt3)]">Midnight Open</div>
              <div className="text-[15px] font-mono font-bold text-[var(--cyan)]">{latestResult.midnightOpenPrice}</div>
              <div className="text-[10px] text-[var(--txt2)]">{latestResult.midnightPlanImpact || latestResult.midnightOpenNote || 'Stored as RAG context for future plans.'}</div>
            </div>
          )}
        </div>
      </div>

      <ApiCostPanel />
    </div>
  );
}

function KpiCell({ label, value, sub, valueClass, featured }: { label: string; value: string; sub: string; valueClass?: string; featured?: boolean }) {
  return (
    <div className={cn("kpi-cell flex-1", featured && "kpi-featured")}>
      <span className="kpi-label">{label}</span>
      <span className={cn("kpi-value", valueClass)}>{value}</span>
      <span className="kpi-sub">{sub}</span>
    </div>
  );
}

function StatusTile({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub: string; tone: 'green' | 'amber' | 'red' | 'muted' }) {
  const toneClass = tone === 'green' ? 'text-[var(--green)]' : tone === 'amber' ? 'text-[var(--amber)]' : tone === 'red' ? 'text-[var(--red)]' : 'text-[var(--txt2)]';
  return (
    <div className="card-base min-h-[108px] flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-[0.16em] text-[var(--txt3)]">{label}</span>
        <span className={toneClass}>{icon}</span>
      </div>
      <div>
        <div className={cn("text-[17px] font-mono font-black uppercase", toneClass)}>{value}</div>
        <div className="text-[10px] text-[var(--txt2)]">{sub}</div>
      </div>
    </div>
  );
}

function WindowCard({ title, status, range, required, checklist }: { title: string; status: string; range: string; required: string; checklist: readonly string[] }) {
  return (
    <div className="card-base">
      <div className="card-header">
        <span className="flex items-center gap-2"><Clock3 size={14} /> {title}</span>
        <span className={cn("qd-badge", status === 'active' ? 'qd-badge-green' : status === 'weekend' ? 'qd-badge-muted' : 'qd-badge-amber')}>
          {windowLabel(status)}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-[160px_1fr]">
        <Metric label="Window" value={range} />
        <div className="border border-[var(--b1)] bg-[var(--b0)] p-3">
          <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--txt3)] mb-1">Required Screenshot</div>
          <div className="text-[12px] text-[var(--txt)] font-bold">{required}</div>
          <div className="mt-2 grid gap-1">
            {checklist.map(item => (
              <div key={item} className="text-[10px] text-[var(--txt2)] flex gap-2">
                <span className="text-[var(--orange)]">•</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanCard({ summary, compact = false }: { summary: PlanSummary; compact?: boolean }) {
  const { label, result, plan } = summary;
  const hasResult = !!result;
  return (
    <div className="card-base">
      <div className="card-header">
        <span className="flex items-center gap-2"><Zap size={14} /> {label} Plan</span>
        <span className={cn("qd-badge", plan?.canExecute ? "qd-badge-green" : hasResult ? "qd-badge-amber" : "qd-badge-muted")}>
          {plan?.canExecute ? 'EXECUTABLE' : hasResult ? 'WAIT' : 'NO DATA'}
        </span>
      </div>
      {!hasResult || !plan ? (
        <div className="empty-state min-h-[140px]">
          <Target className="w-5 h-5 mb-3 opacity-50" />
          <h3>{compact ? 'NO REPLAY RESULT' : 'NO ANALYSIS RESULT'}</h3>
          <p>{compact ? 'Run Replay Lab to populate this card.' : `Run ${label} analysis to populate this card.`}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="qd-badge qd-badge-orange">{plan.setupName || 'Plan'}</span>
            <span className={cn("qd-badge", plan.decision === 'LONG' ? 'qd-badge-green' : plan.decision === 'SHORT' ? 'qd-badge-red' : 'qd-badge-muted')}>
              {plan.decision}
            </span>
            <span className="qd-badge qd-badge-muted">{plan.source === 'app_rule_engine' ? 'APP RULE ENGINE' : plan.source.toUpperCase()}</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <Metric label="Entry" value={formatNumber(plan.entry)} />
            <Metric label="Stop" value={formatNumber(plan.stop)} tone="red" />
            <Metric label="T1" value={formatNumber(plan.t1)} tone="green" />
            <Metric label="T2" value={formatNumber(plan.t2)} tone="green" />
          </div>
          <div className="text-[10px] text-[var(--txt2)] border-t border-[var(--b1)] pt-2">
            {plan.canExecute ? `Risk ${plan.riskPoints ?? '—'} · T1 1.5R · T2 2.0R` : plan.whyThisPlan}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, tone = 'txt' }: { label: string; value: string; tone?: 'txt' | 'green' | 'red' }) {
  const toneClass = tone === 'green' ? 'text-[var(--green)]' : tone === 'red' ? 'text-[var(--red)]' : 'text-[var(--txt)]';
  return (
    <div className="border border-[var(--b1)] bg-[var(--bg)] p-2">
      <div className="text-[8px] uppercase tracking-[0.16em] text-[var(--txt3)]">{label}</div>
      <div className={cn("text-[12px] font-mono font-bold", toneClass)}>{value}</div>
    </div>
  );
}

function formatNumber(value: number | null | undefined) {
  return value === null || value === undefined ? '—' : String(value);
}

function windowLabel(status: string) {
  if (status === 'active') return 'ACTIVE';
  if (status === 'too_early') return 'NOT OPEN';
  if (status === 'too_late') return 'CLOSED';
  return 'MARKET CLOSED';
}
