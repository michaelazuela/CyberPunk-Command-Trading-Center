/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Trade, AppState, ProposedRule } from '../types';
import { TrendingUp, TrendingDown, Clock, Target, ShieldAlert, Sparkles, Loader2, Check, Plus, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { generateStrategyInsights } from '../lib/gemini';
import { SYSTEM_RULES } from '../constants';

export default function TradeLog({ trades, appState, onProposeRule, onAddTrade }: { 
  trades: Trade[], 
  appState: AppState,
  onProposeRule: (rule: ProposedRule) => void,
  onAddTrade: (trade: Trade) => void
}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insight, setInsight] = useState<{ rule: string, reasoning: string } | null>(null);
  const [isAddingManual, setIsAddingManual] = useState(false);

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
          <h2 className="text-3xl font-bold tracking-tight">Trade Log</h2>
          <p className="text-sm text-stone-500 font-mono uppercase">Historical Performance & Review</p>
        </div>
        <div className="flex gap-3">
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
        <div className="technical-grid grid-cols-[80px_1fr_100px_100px_100px_120px]">
          <div className="col-header">Type</div>
          <div className="col-header">Details</div>
          <div className="col-header">Entry</div>
          <div className="col-header">Exit</div>
          <div className="col-header">P&L</div>
          <div className="col-header">Status</div>

          {(!trades || trades.length === 0) ? (
            <div className="grid-cell col-span-6 py-12 text-center text-stone-400 font-mono text-xs italic">
              No trades recorded yet.
            </div>
          ) : (
            trades.map(trade => (
              <div key={trade.id} className="data-row grid-cols-[80px_1fr_100px_100px_100px_120px]">
                <div className="grid-cell flex items-center justify-center">
                  {trade.direction === 'LONG' ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <div className="grid-cell">
                  <p className="text-xs font-bold">{trade.direction} {trade.contracts}x MES</p>
                  <p className="text-[10px] font-mono opacity-50 uppercase">{trade.dayType}</p>
                  {trade.notes && (
                    <p className="text-[9px] text-accent italic mt-1 border-t border-line/50 pt-1">
                      Note: {trade.notes}
                    </p>
                  )}
                </div>
                <div className="grid-cell font-mono text-xs">{trade.entryPrice}</div>
                <div className="grid-cell font-mono text-xs">{trade.exitPrice || '-'}</div>
                <div className={cn(
                  "grid-cell font-mono text-xs font-bold",
                  trade.pnl && trade.pnl >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {trade.pnl ? `${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}` : '-'}
                </div>
                <div className="grid-cell flex items-center gap-2">
                  <span className={cn(
                    "status-badge",
                    trade.status === 'OPEN' ? "text-blue-600 border-blue-600" : 
                    trade.status === 'CLOSED' ? "text-stone-600 border-stone-600 dark:text-stone-400 dark:border-stone-700" : 
                    "text-stone-400 border-stone-300 dark:border-stone-800"
                  )}>
                    {trade.status}
                  </span>
                  {trade.exitReason && (
                    <span className="text-[8px] font-mono opacity-50 uppercase">{trade.exitReason}</span>
                  )}
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
