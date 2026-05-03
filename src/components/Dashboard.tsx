import React from 'react';
import { SessionState, Trade } from '../types';
import { SYSTEM_RULES } from '../constants';
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

    </div>
  );
}
