import React from 'react';
import { SessionState } from '../types';
import { SYSTEM_RULES } from '../constants';
import { cn } from '../lib/utils';
import MonteCarloSection from './MonteCarloSection';
import { TIME_WINDOWS, getWindowStatus, formatWindow } from '../config/timeWindows';
import { buildAppTradePlan } from '../lib/planEngine';
import {  
  TrendingUp, 
  Target,
  Shield,
  Activity
} from 'lucide-react';

export default function Dashboard({ 
  session,
  onUpdateSession
}: { 
  session: SessionState;
  onUpdateSession: (s: SessionState) => void;
}) {
  const dashboardPlan = session.analysisResult
    ? buildAppTradePlan(session.analysisResult, { sessionType: 'morning', instrument: session.dailyInstrument || 'MES' })
    : null;
  const openTrades = session.trades.filter(t => t.status === 'OPEN');
  const closedTrades = session.trades.filter(t => t.status === 'CLOSED' || t.status === 'FAILED' || t.status === 'SUCCESSFUL');
  const totalPnl = session.trades.filter(t => t.status !== 'OPEN').reduce((acc, t) => acc + (t.pnl || 0), 0);

  const formatCurrency = (val: number) => {
    return `${val >= 0 ? '+' : ''}$${Math.abs(val).toFixed(2)}`;
  };

  const isTimeForLunch = getWindowStatus('lunch') === 'active' || new Date().getHours() >= TIME_WINDOWS.lunch.openHour;
  
  const currentPhase = isTimeForLunch ? formatWindow('lunch') : formatWindow('morning');

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
            {dashboardPlan?.canExecute ? 'ACTIVE' : '—'}
          </span>
          <span className="kpi-sub">{dashboardPlan?.canExecute ? `Entry at ${dashboardPlan.entry}` : 'Awaiting app rule engine'}</span>
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
          {session.analysisResult?.midnightOpenPrice && (
            <div className="mt-2 text-[10px] text-[var(--cyan)] border-t border-[var(--b2)] pt-1">
              NY MIDNIGHT: <span className="font-bold">{session.analysisResult.midnightOpenPrice}</span>
            </div>
          )}
        </div>
      </div>

      {/* Daily Instrument Selector */}
      <div className="card-base flex flex-col p-4 border border-[var(--b2)] bg-[var(--b0)]">
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <div>
             <h3 className="text-[12px] font-mono font-bold text-[var(--txt)] tracking-widest uppercase mb-1">
               Daily Instrument
             </h3>
             <p className="text-[10px] text-[var(--txt2)]">
               Select the futures contract for today. OCR may read labels, but this selection is the source of truth.
             </p>
           </div>
           <div className="flex gap-2">
             <button
               onClick={() => onUpdateSession({ ...session, dailyInstrument: 'MES' })}
               className={cn("px-4 py-2 text-[12px] font-mono font-bold border", session.dailyInstrument === 'MES' ? "bg-[var(--orange)] border-[var(--orange)] text-[#111]" : "bg-transparent border-[var(--b2)] text-[var(--txt2)]")}
             >
               MES
             </button>
             <button
               onClick={() => onUpdateSession({ ...session, dailyInstrument: 'MNQ' })}
               className={cn("px-4 py-2 text-[12px] font-mono font-bold border", session.dailyInstrument === 'MNQ' ? "bg-[var(--blue)] border-[var(--blue)] text-[#111]" : "bg-transparent border-[var(--b2)] text-[var(--txt2)]")}
             >
               MNQ
             </button>
           </div>
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
          
          {(() => {
            if (!session.analysisResult) {
              return (
                <div className="empty-state flex-1">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                  <h3>NO ANALYSIS LOADED</h3>
                  <p>Complete a Morning Analysis to populate entry, stop, and target values here.</p>
                </div>
              );
            }
            const plan = dashboardPlan;
            if (!plan) return null;
            return (
              <div className="flex-1 flex flex-col justify-center">
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <p className="kpi-label flex items-center gap-1"><Target className="w-3 h-3" /> Entry</p>
                    <p className="kpi-value text-[var(--txt)]">{plan.entry || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="kpi-label flex items-center gap-1"><Shield className="w-3 h-3" /> Stop</p>
                    <p className="kpi-value text-[var(--red)]">{plan.stop || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="kpi-label flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Target</p>
                    <p className="kpi-value text-[var(--green)]">{plan.t1 || 'N/A'}</p>
                  </div>
                </div>
              </div>
            );
          })()}
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
                  startPrice={dashboardPlan?.entry || 0}
                  stopPrice={dashboardPlan?.stop || 0}
                  targetPrice={dashboardPlan?.t2 || dashboardPlan?.t1 || 0}
                  targetPrice15R={dashboardPlan?.t1 || 0}
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
