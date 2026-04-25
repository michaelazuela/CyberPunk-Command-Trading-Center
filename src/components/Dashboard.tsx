/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SessionState, Trade } from '../types';
import { SYSTEM_RULES, DAY_TYPE_DESCRIPTIONS } from '../constants';
import { cn } from '../lib/utils';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  Activity,
  Target,
  Shield,
  Zap,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';

export default function Dashboard({ 
  session, 
  onUpdateTrade 
}: { 
  session: SessionState,
  onUpdateTrade: (id: string, updates: Partial<Trade>) => void
}) {
  const openTrades = session.trades.filter(t => t.status === 'OPEN');
  const closedTrades = session.trades.filter(t => t.status === 'CLOSED');
  const totalPnl = closedTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Session Dashboard</h2>
          <p className="text-sm text-stone-500 font-mono uppercase">{session.date}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-mono opacity-50 uppercase">Total P&L</p>
          <p className={`text-2xl font-mono font-bold ${totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString()}
          </p>
        </div>
      </header>

      {/* Analysis Summary */}
      {session.analysisResult && (
        <section className="card p-6 border-accent/20 bg-accent/5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-mono uppercase flex items-center gap-2 text-accent">
              <Zap className="w-4 h-4" />
              Morning Analysis Summary
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-accent text-white rounded-full">
              {(session.analysisResult.confidence * 100).toFixed(0)}% Confidence
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-[10px] font-mono opacity-50 uppercase flex items-center gap-1">
                <Target className="w-3 h-3" /> Entry
              </p>
              <p className="text-lg font-bold">{session.analysisResult.suggestedEntry || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-mono opacity-50 uppercase flex items-center gap-1">
                <Shield className="w-3 h-3" /> Stop
              </p>
              <p className="text-lg font-bold text-red-500">{session.analysisResult.suggestedStop || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-mono opacity-50 uppercase flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Target
              </p>
              <p className="text-lg font-bold text-green-500">{session.analysisResult.suggestedTarget || 'N/A'}</p>
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          label="Day Type" 
          value={session.dayType || 'NOT CLASSIFIED'} 
          subValue={session.dayType ? DAY_TYPE_DESCRIPTIONS[session.dayType] : 'Upload chart to begin'}
          icon={<Activity className="w-5 h-5" />}
        />
        <StatCard 
          label="Kill Switches" 
          value={`${session.killSwitches.losses}/${SYSTEM_RULES.KILL_SWITCH_LOSSES} Losses`} 
          subValue={`${session.killSwitches.fills}/${SYSTEM_RULES.KILL_SWITCH_FILLS} Fills`}
          icon={<AlertCircle className="w-5 h-5" />}
          alert={session.killSwitches.losses >= SYSTEM_RULES.KILL_SWITCH_LOSSES}
        />
        <StatCard 
          label="Active Trades" 
          value={openTrades.length.toString()} 
          subValue={openTrades.length > 0 ? 'Monitoring entry/exit' : 'No active positions'}
          icon={<Clock className="w-5 h-5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="card p-6">
          <h3 className="text-sm font-mono uppercase mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            System Status
          </h3>
          <div className="space-y-4">
            <StatusItem label="Observation Window" status="PASSED" time="09:30 - 10:15" />
            <StatusItem label="Entry Window" status="ACTIVE" time="10:15 - 11:15" />
            <StatusItem label="Hard Exit" status="PENDING" time="12:30" />
          </div>
        </section>

        <section className="card p-6">
          <h3 className="text-sm font-mono uppercase mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Trade Outcomes
          </h3>
          {session.trades.length === 0 ? (
            <p className="text-xs text-stone-400 font-mono italic">No trades recorded for this session.</p>
          ) : (
            <div className="space-y-4">
              {session.trades?.map(trade => (
                <div key={trade.id} className="space-y-2 border-b border-stone-100 dark:border-stone-800 pb-3">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <div className="flex items-center gap-2">
                      {trade.direction === 'LONG' ? <TrendingUp className="w-3 h-3 text-green-600" /> : <TrendingDown className="w-3 h-3 text-red-600" />}
                      <span className="font-bold">{trade.direction} @ {trade.entryPrice}</span>
                    </div>
                    <span className={trade.status === 'OPEN' ? 'text-blue-600' : (trade.pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {trade.status === 'OPEN' ? 'OPEN' : `${(trade.pnl || 0) >= 0 ? '+' : ''}$${trade.pnl}`}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <p className="text-[10px] font-mono uppercase opacity-50">Log Outcome:</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => onUpdateTrade(trade.id, { manualOutcome: 'SUCCESS' })}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono transition-colors",
                          trade.manualOutcome === 'SUCCESS' 
                            ? "bg-green-600 text-white" 
                            : "bg-stone-100 dark:bg-stone-800 text-stone-500 hover:bg-green-100 dark:hover:bg-green-900/20"
                        )}
                      >
                        <ThumbsUp className="w-3 h-3" /> SUCCESS
                      </button>
                      <button 
                        onClick={() => onUpdateTrade(trade.id, { manualOutcome: 'FAILED' })}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono transition-colors",
                          trade.manualOutcome === 'FAILED' 
                            ? "bg-red-600 text-white" 
                            : "bg-stone-100 dark:bg-stone-800 text-stone-500 hover:bg-red-100 dark:hover:bg-red-900/20"
                        )}
                      >
                        <ThumbsDown className="w-3 h-3" /> FAILED
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value, subValue, icon, alert }: { 
  label: string, 
  value: string, 
  subValue: string, 
  icon: React.ReactNode,
  alert?: boolean
}) {
  return (
    <div className={cn(
      "card p-6",
      alert && "border-red-500 bg-red-50 dark:bg-red-950/20"
    )}>
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-mono uppercase opacity-50">{label}</span>
        <div className={alert ? 'text-red-500' : 'opacity-30'}>{icon}</div>
      </div>
      <p className="text-xl font-bold tracking-tight mb-1">{value}</p>
      <p className="text-[10px] text-stone-500 leading-relaxed">{subValue}</p>
    </div>
  );
}

function StatusItem({ label, status, time }: { label: string, status: string, time: string }) {
  return (
    <div className="flex justify-between items-center border-b border-stone-100 dark:border-stone-800 pb-2">
      <div>
        <p className="text-xs font-bold">{label}</p>
        <p className="text-[10px] font-mono opacity-50">{time}</p>
      </div>
      <span className={`text-[10px] font-mono px-2 py-1 border ${
        status === 'PASSED' ? 'border-green-500 text-green-600' : 
        status === 'ACTIVE' ? 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950/20' : 
        'border-stone-300 text-stone-400'
      }`}>
        {status}
      </span>
    </div>
  );
}
