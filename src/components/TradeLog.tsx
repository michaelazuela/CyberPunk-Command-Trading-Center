/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Trade, AppState, ProposedRule } from '../types';
import { TrendingUp, TrendingDown, Clock, Target, ShieldAlert, Sparkles, Loader2, Check, Plus, X, Trash2, ExternalLink, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { cn } from '../lib/utils';
import { generateStrategyInsights } from '../lib/gemini';
import { SYSTEM_RULES } from '../constants';
import { updateTradeStatus } from '../lib/firestoreService';

export default function TradeLog({ trades, appState, onProposeRule, onAddTrade, onDeleteTrade }: { 
  trades: Trade[], 
  appState: AppState,
  onProposeRule: (rule: ProposedRule) => void,
  onAddTrade: (trade: Trade) => void,
  onDeleteTrade?: (id: string) => void
}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insight, setInsight] = useState<{ rule: string, reasoning: string } | null>(null);
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [showScreenshots, setShowScreenshots] = useState(true);

  const handleUpdateStatus = async (tradeId: string, status: Trade['status'], pnl?: number) => {
    try {
      await updateTradeStatus(tradeId, status, { pnl });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const result = await generateStrategyInsights(trades, JSON.stringify(SYSTEM_RULES));
      setInsight(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const approveRule = () => {
    if (insight) {
      onProposeRule({
        id: Math.random().toString(36).substr(2, 9),
        rule: insight.rule,
        reasoning: insight.reasoning,
        status: 'PENDING',
        timestamp: Date.now()
      });
      setInsight(null);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-ink">Trade Log</h2>
          <p className="text-sm text-stone-500 font-mono uppercase">Historical Performance & Cloud Synchronization</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowScreenshots(!showScreenshots)}
            className="btn-outline flex items-center gap-2"
          >
            {showScreenshots ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showScreenshots ? 'Hide Visuals' : 'Show Visuals'}
          </button>
          <button 
            onClick={() => setIsAddingManual(true)}
            className="btn-outline flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Manual Entry
          </button>
          <button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing || trades.length < 3}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 relative group"
          >
            {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Analyze Strategy
            {trades.length < 3 && (
              <div className="absolute bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-ink text-bg text-[10px] font-mono rounded shadow-xl z-50">
                Need at least 3 trades to generate AI insights.
              </div>
            )}
          </button>
        </div>
      </header>

      {isAddingManual && (
        <ManualTradeForm 
          onCancel={() => setIsAddingManual(false)}
          onConfirm={(trade) => {
            onAddTrade(trade);
            setIsAddingManual(false);
          }}
        />
      )}

      {insight && (
        <div className="card p-6 border-accent/30 bg-accent/5 animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-sm font-bold flex items-center gap-2 text-accent">
              <Sparkles className="w-4 h-4" />
              Proposed Rule Refinement
            </h3>
            <div className="flex gap-2">
              <button onClick={approveRule} className="btn-primary py-1 px-3 text-[10px] flex items-center gap-1">
                <Check className="w-3 h-3" /> Approve for Review
              </button>
              <button onClick={() => setInsight(null)} className="btn-outline py-1 px-3 text-[10px]">Dismiss</button>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-bold">{insight.rule}</p>
            <p className="text-xs text-stone-500 italic leading-relaxed">"{insight.reasoning}"</p>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="technical-grid grid-cols-[80px_1fr_100px_100px_100px_220px]">
          <div className="col-header">Type</div>
          <div className="col-header">Details</div>
          <div className="col-header">Entry</div>
          <div className="col-header">Exit</div>
          <div className="col-header">P&L</div>
          <div className="col-header">Status & Execution</div>

          {(!trades || trades.length === 0) ? (
            <div className="grid-cell col-span-6 py-12 text-center text-stone-400 font-mono text-xs italic">
              No trades recorded yet.
            </div>
          ) : (
            trades.map(trade => (
              <div key={trade.id} className="data-row grid-cols-[80px_1fr_100px_100px_100px_220px]">
                <div className="grid-cell flex flex-col items-center justify-center gap-1">
                  {trade.direction === 'LONG' ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                  <span className="text-[8px] font-mono opacity-50">{trade.date}</span>
                </div>
                <div className="grid-cell">
                  <div className="flex items-start gap-3">
                    {showScreenshots && trade.screenshotUrl && (
                      <div className="w-16 h-10 bg-stone-100 rounded border border-line overflow-hidden flex-shrink-0 cursor-pointer relative group" onClick={() => window.open(trade.screenshotUrl, '_blank')}>
                        <img src={trade.screenshotUrl} alt="Trade Snapshot" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <ExternalLink className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold">{trade.direction} {trade.contracts}x MES</p>
                      <p className="text-[10px] font-mono opacity-50 uppercase">{trade.dayType}</p>
                      {trade.notes && (
                        <p className="text-[9px] text-accent italic mt-1 border-t border-line/50 pt-1">
                          Note: {trade.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid-cell font-mono text-xs">{trade.entryPrice}</div>
                <div className="grid-cell font-mono text-xs">{trade.exitPrice || '-'}</div>
                <div className={cn(
                  "grid-cell font-mono text-xs font-bold",
                  trade.pnl && trade.pnl >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {trade.pnl ? `${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}` : '-'}
                </div>
                <div className="grid-cell flex flex-col gap-2">
                  <div className="flex flex-wrap gap-1">
                    <StatusBtn 
                      active={trade.status === 'EXECUTED' || trade.status === 'OPEN'} 
                      label="Exec" 
                      color="blue" 
                      onClick={() => handleUpdateStatus(trade.id!, 'EXECUTED')} 
                    />
                    <StatusBtn 
                      active={trade.status === 'MISSED'} 
                      label="Missed" 
                      color="stone" 
                      onClick={() => handleUpdateStatus(trade.id!, 'MISSED')} 
                    />
                    <StatusBtn 
                      active={trade.status === 'SUCCESSFUL'} 
                      label="Win" 
                      color="green" 
                      onClick={() => {
                        const winPnl = 2.0 * Math.abs(trade.entryPrice - trade.stopPrice) * 5 * trade.contracts;
                        handleUpdateStatus(trade.id!, 'SUCCESSFUL', winPnl);
                      }} 
                    />
                    <StatusBtn 
                      active={trade.status === 'FAILED'} 
                      label="Loss" 
                      color="red" 
                      onClick={() => {
                        const lossPnl = -1.0 * Math.abs(trade.entryPrice - trade.stopPrice) * 5 * trade.contracts;
                        handleUpdateStatus(trade.id!, 'FAILED', lossPnl);
                      }} 
                    />
                    {onDeleteTrade && (
                      <button 
                        onClick={() => onDeleteTrade(trade.id!)}
                        className="p-1 hover:bg-red-50 text-stone-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <span className={cn(
                    "status-badge text-[8px] py-0.5",
                    trade.status === 'OPEN' || trade.status === 'EXECUTED' ? "text-blue-600 border-blue-600" : 
                    trade.status === 'SUCCESSFUL' ? "text-green-600 border-green-600" : 
                    trade.status === 'FAILED' ? "text-red-600 border-red-600" : 
                    "text-stone-400 border-stone-300 dark:border-stone-800"
                  )}>
                    {trade.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard 
          label="Win Rate" 
          value={`${(((trades || []).filter(t => t.pnl && t.pnl > 0).length / ((trades || []).filter(t => t.status === 'CLOSED').length || 1)) * 100).toFixed(1)}%`}
          icon={<Target className="w-4 h-4" />}
        />
        <SummaryCard 
          label="Avg Expectancy" 
          value={`$${((trades || []).reduce((acc, t) => acc + (t.pnl || 0), 0) / ((trades || []).filter(t => t.status === 'CLOSED').length || 1)).toFixed(2)}`}
          icon={<Clock className="w-4 h-4" />}
        />
        <SummaryCard 
          label="Total Fills" 
          value={(trades || []).length.toString()}
          icon={<ShieldAlert className="w-4 h-4" />}
        />
      </div>
    </div>
  );
}

function StatusBtn({ active, label, color, onClick }: { active: boolean, label: string, color: string, onClick: () => void }) {
  const colors: Record<string, string> = {
    blue: active ? "bg-blue-600 text-white" : "border-blue-600/30 text-blue-600 hover:bg-blue-50",
    green: active ? "bg-green-600 text-white" : "border-green-600/30 text-green-600 hover:bg-green-50",
    red: active ? "bg-red-600 text-white" : "border-red-600/30 text-red-600 hover:bg-red-50",
    stone: active ? "bg-stone-600 text-white" : "border-stone-600/30 text-stone-600 hover:bg-stone-50"
  };

  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-2 py-0.5 text-[8px] font-mono border uppercase transition-colors rounded-sm",
        colors[color] || colors.stone
      )}
    >
      {label}
    </button>
  );
}

function SummaryCard({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="card p-4 flex justify-between items-center">
      <div>
        <p className="text-[10px] font-mono uppercase opacity-50">{label}</p>
        <p className="text-xl font-bold tracking-tight">{value}</p>
      </div>
      <div className="opacity-20">{icon}</div>
    </div>
  );
}

function ManualTradeForm({ onCancel, onConfirm }: { onCancel: () => void, onConfirm: (trade: Trade) => void }) {
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG');
  const [contracts, setContracts] = useState(1);
  const [dayType, setDayType] = useState('TYPE 1 LONG');
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [pnl, setPnl] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trade: Trade = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      direction,
      contracts,
      dayType,
      entryPrice: parseFloat(entryPrice),
      exitPrice: parseFloat(exitPrice),
      stopPrice: 0, // Manual entry doesn't strictly need stop/target for history
      targetPrice: 0,
      pnl: parseFloat(pnl),
      status: 'CLOSED',
      exitReason: 'MANUAL',
      notes,
      timestamp: Date.now()
    };
    onConfirm(trade);
  };

  return (
    <div className="card p-6 border-accent/20 bg-accent/5 animate-in slide-in-from-top-4 duration-300">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
          <Plus className="w-4 h-4 text-accent" />
          Manual Historical Entry
        </h3>
        <button onClick={onCancel} className="p-1 hover:bg-stone-200 dark:hover:bg-stone-800 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase opacity-50">Direction</label>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setDirection('LONG')}
                className={cn(
                  "flex-1 py-1 px-3 border text-[10px] uppercase font-mono",
                  direction === 'LONG' ? "bg-green-600 border-green-600 text-white" : "border-line"
                )}
              >Long</button>
              <button 
                type="button"
                onClick={() => setDirection('SHORT')}
                className={cn(
                  "flex-1 py-1 px-3 border text-[10px] uppercase font-mono",
                  direction === 'SHORT' ? "bg-red-600 border-red-600 text-white" : "border-line"
                )}
              >Short</button>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase opacity-50">Contracts</label>
            <input 
              type="number" 
              value={contracts} 
              onChange={e => setContracts(parseInt(e.target.value))}
              className="w-full bg-bg border border-line p-2 font-mono text-xs focus:outline-none focus:border-accent"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase opacity-50">Day Type</label>
            <select 
              value={dayType} 
              onChange={e => setDayType(e.target.value)}
              className="w-full bg-bg border border-line p-2 font-mono text-xs focus:outline-none focus:border-accent"
            >
              <option>TYPE 1 LONG</option>
              <option>TYPE 2 LONG</option>
              <option>TYPE 1 SHORT</option>
              <option>TYPE 2 SHORT</option>
              <option>DISTRIBUTION</option>
              <option>LUNCH REVERSAL</option>
              <option>NO TRADE</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase opacity-50">Entry Price</label>
            <input 
              type="number" 
              step="0.25"
              value={entryPrice} 
              onChange={e => setEntryPrice(e.target.value)}
              className="w-full bg-bg border border-line p-2 font-mono text-xs focus:outline-none focus:border-accent"
              placeholder="0.00"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase opacity-50">Exit Price</label>
            <input 
              type="number" 
              step="0.25"
              value={exitPrice} 
              onChange={e => setExitPrice(e.target.value)}
              className="w-full bg-bg border border-line p-2 font-mono text-xs focus:outline-none focus:border-accent"
              placeholder="0.00"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase opacity-50">Total P&L ($)</label>
            <input 
              type="number" 
              step="0.01"
              value={pnl} 
              onChange={e => setPnl(e.target.value)}
              className="w-full bg-bg border border-line p-2 font-mono text-xs focus:outline-none focus:border-accent"
              placeholder="e.g. 93.75"
              required
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase opacity-50">Notes</label>
            <textarea 
              value={notes} 
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-bg border border-line p-2 font-mono text-xs focus:outline-none focus:border-accent h-[115px]"
              placeholder="Trade details, hard exit notes, etc."
            />
          </div>
          <button type="submit" className="btn-primary w-full py-2 text-[10px] uppercase tracking-widest">
            Add to History
          </button>
        </div>
      </form>
    </div>
  );
}
