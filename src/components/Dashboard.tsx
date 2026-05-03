import React from 'react';
import { SessionState, Trade } from '../types';
import { SYSTEM_RULES, DAY_TYPE_DESCRIPTIONS } from '../constants';
import { cn } from '../lib/utils';
import MonteCarloSection from './MonteCarloSection';
import MidnightAnalysisView from './MidnightAnalysisView';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Target,
  Shield,
  Zap,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  Moon,
  Clock,
  Activity
} from 'lucide-react';

export default function Dashboard({ 
  session, 
  onUpdateTrade 
}: { 
  session: SessionState,
  onUpdateTrade: (id: string, updates: Partial<Trade>) => void
}) {
  const openTrades = session.trades.filter(t => t.status === 'OPEN');
  const closedTrades = session.trades.filter(t => t.status === 'CLOSED' || t.status === 'FAILED' || t.status === 'SUCCESSFUL');
  const totalPnl = session.trades.filter(t => t.status !== 'OPEN').reduce((acc, t) => acc + (t.pnl || 0), 0);

  const formatCurrency = (val: number) => {
    return `${val >= 0 ? '+' : ''}$${Math.abs(val).toFixed(2)}`;
  };

  const isTimeForLunch = 
    new Date().getHours() === 10 && new Date().getMinutes() >= 45 ||
    new Date().getHours() > 10;
  
  const currentPhase = isTimeForLunch ? '10:45-11:15' : '9:30-10:00 window';

  const killSwitchCount = `${session.killSwitches.losses}/${SYSTEM_RULES.KILL_SWITCH_LOSSES}`;
  const isLossKillSwitch = session.killSwitches.losses >= SYSTEM_RULES.KILL_SWITCH_LOSSES;
  const isFillKillSwitch = session.killSwitches.fills >= SYSTEM_RULES.KILL_SWITCH_FILLS;

  return (
    <div className="space-y-6 fade-up">
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>MES/MNQ PULLBACK STRATEGY · SESSION OVERVIEW</p>
        </div>
        <div className="qd-badge qd-badge-green px-3">
          ● SYSTEM ACTIVE
        </div>
      </header>

      {/* KPI Strip */}
      <div className="kpi-strip rounded-sm overflow-hidden">
        <div className="kpi-cell flex-1 kpi-featured">
          <span className="kpi-label">Session P&L</span>
          <span className={cn(
            "kpi-value",
            totalPnl > 0 ? "text-[var(--green)]" : totalPnl < 0 ? "text-[var(--red)]" : "text-[var(--txt)]"
          )}>
            {formatCurrency(totalPnl)}
          </span>
          <span className="kpi-sub">
            {closedTrades.length} fills · {openTrades.length} open
          </span>
        </div>
        <div className="kpi-cell flex-1">
          <span className="kpi-label">Entry Signal</span>
          <span className="kpi-value text-[var(--orange)]">
            {session.analysisResult?.suggestedEntry ? 'ACTIVE' : '—'}
          </span>
          <span className="kpi-sub">{session.analysisResult?.suggestedEntry ? `Entry at ${session.analysisResult.suggestedEntry}` : 'Awaiting analysis'}</span>
        </div>
        <div className="kpi-cell flex-1">
          <span className="kpi-label">Kill Switches</span>
          <span className={cn("kpi-value", isLossKillSwitch || isFillKillSwitch ? "text-[var(--red)]" : "text-[var(--txt)]")}>
            {session.killSwitches.losses} / {SYSTEM_RULES.KILL_SWITCH_LOSSES}
          </span>
          <span className="kpi-sub">{isLossKillSwitch || isFillKillSwitch ? 'Triggers active' : 'No triggers active'}</span>
        </div>
        <div className="kpi-cell flex-1">
          <span className="kpi-label">Session Phase</span>
          <span className="kpi-value uppercase">Observation</span>
          <span className="kpi-sub">{currentPhase}</span>
        </div>
      </div>

      {/* 2 Col Body */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Morning Analysis Summary */}
        <div className="card-base flex flex-col min-h-[240px]">
          <div className="card-header">
             <span>Morning Analysis Summary</span>
             {session.analysisResult && (
               <span className="qd-badge qd-badge-orange">{(session.analysisResult.confidence * 100).toFixed(0)}% CONFIDENCE</span>
             )}
          </div>
          
          {!session.analysisResult ? (
            <div className="empty-state flex-1">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
              <h3>NO ANALYSIS LOADED</h3>
              <p>Complete a Morning Analysis to populate entry, stop, and target values here.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center">
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-1">
                  <p className="kpi-label flex items-center gap-1"><Target className="w-3 h-3" /> Entry</p>
                  <p className="kpi-value text-[var(--txt)]">{session.analysisResult.suggestedEntry || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="kpi-label flex items-center gap-1"><Shield className="w-3 h-3" /> Stop</p>
                  <p className="kpi-value text-[var(--red)]">{session.analysisResult.suggestedStop || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="kpi-label flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Target</p>
                  <p className="kpi-value text-[var(--green)]">{session.analysisResult.suggestedTarget || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Probabilistic Prediction Engine */}
        <div className="card-base flex flex-col min-h-[240px]">
          <div className="card-header">
             <span>Probabilistic Prediction Engine</span>
             {session.analysisResult ? <span className="qd-badge qd-badge-amber">CALCULATING</span> : null}
          </div>
          
          {session.analysisResult ? (
             <div className="flex-1 -mx-[18px] -mb-[16px]">
               <MonteCarloSection 
                  startPrice={session.analysisResult.suggestedEntry}
                  stopPrice={session.analysisResult.suggestedStop}
                  targetPrice={session.analysisResult.suggestedTarget20R || session.analysisResult.suggestedTarget}
                  targetPrice15R={session.analysisResult.suggestedTarget15R}
               />
             </div>
          ) : (
            <div className="empty-state flex-1">
              <Activity className="w-6 h-6 mb-4 opacity-50" />
              <h3>AWAITING ANALYSIS</h3>
              <p>Prediction engine will activate once entry parameters are defined.</p>
            </div>
          )}
        </div>
      </div>

      {/* 3 Col Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-base flex flex-col">
          <div className="card-header">
            <span>Day Type</span>
            {!session.dayType && <span className="qd-badge qd-badge-muted">PENDING</span>}
          </div>
          {session.dayType ? (
            <div className="flex-1 flex flex-col justify-center text-center py-6">
              <h3 className="font-mono font-bold text-[14px] text-[var(--txt)] uppercase mb-2">{session.dayType}</h3>
              <p className="text-[9px] text-[var(--txt2)] lowercase first-letter:uppercase">{DAY_TYPE_DESCRIPTIONS[session.dayType]}</p>
            </div>
          ) : (
            <div className="empty-state flex-1 py-6">
              <h3>NOT CLASSIFIED</h3>
              <p>Run Morning Analysis to classify today's session type.</p>
            </div>
          )}
        </div>

        <div className="card-base flex flex-col justify-between">
          <div className="card-header border-none mb-0 pb-0">
            <span>Kill Switches</span>
            <button className="qd-badge qd-badge-green hover:opacity-80">CLEAR</button>
          </div>
          <div className="mt-4 space-y-[1px] bg-[var(--b0)]">
             <div className="bg-[var(--s1)] flex justify-between items-center py-2 px-1">
               <span className="text-[10px] text-[var(--txt)]">Daily Loss Limit</span>
               <span className={cn("qd-badge", isLossKillSwitch ? "qd-badge-red" : "qd-badge-muted")}>
                 {isLossKillSwitch ? "TRIGGERED" : "STANDBY"}
               </span>
             </div>
             <div className="bg-[var(--s1)] flex justify-between items-center py-2 px-1">
               <span className="text-[10px] text-[var(--txt)]">Order Limit (3 max)</span>
               <span className={cn("qd-badge", isFillKillSwitch ? "qd-badge-red" : "qd-badge-green")}>
                 {session.killSwitches.fills} / {SYSTEM_RULES.KILL_SWITCH_FILLS}
               </span>
             </div>
             <div className="bg-[var(--s1)] flex justify-between items-center py-2 px-1">
               <span className="text-[10px] text-[var(--txt)]">Time Limit Reached</span>
               <span className="qd-badge qd-badge-muted">STANDBY</span>
             </div>
          </div>
        </div>

        <div className="card-base flex flex-col">
          <div className="card-header">
            <span>Active Trades</span>
            <span className="qd-badge qd-badge-muted">{openTrades.length} OPEN</span>
          </div>
          {openTrades.length > 0 ? (
            <div className="flex-1 flex flex-col gap-2 mt-2">
              {openTrades.map(trade => (
                <div key={trade.id} className="flex justify-between items-center p-3 border border-[var(--b1)] bg-[var(--s2)]">
                  <div className="flex items-center gap-2">
                     <span className={trade.direction === 'LONG' ? "text-[var(--green)]" : "text-[var(--red)]"}>
                       {trade.direction === 'LONG' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                     </span>
                     <span className="font-mono text-[10px] font-bold">{trade.direction}</span>
                  </div>
                  <span className="font-mono text-[10px]">{trade.entryPrice}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state flex-1 py-6">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
              <h3>NO ACTIVE TRADES</h3>
              <p>Awaiting valid pullback confirmation bar.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
