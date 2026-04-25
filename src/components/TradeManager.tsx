/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { 
  Plus, 
  ShieldCheck, 
  Calculator, 
  Target, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  X,
  Clock
} from 'lucide-react';
import { SessionState, Trade, DayType } from '../types';
import { SYSTEM_RULES } from '../constants';
import { cn } from '../lib/utils';

export default function TradeManager({ session, onAddTrade, onUpdateTrade }: { 
  session: SessionState, 
  onAddTrade: (trade: Trade) => void,
  onUpdateTrade: (id: string, updates: Partial<Trade>) => void
}) {
  const [isAdding, setIsAdding] = useState(false);
  const activeTrades = (session.trades || []).filter(t => t.status === 'OPEN');

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Trade Manager</h2>
          <p className="text-sm text-stone-500 font-mono uppercase">Active Positions & Entry Checklist</p>
        </div>
        {!isAdding && activeTrades.length === 0 && (
          <button onClick={() => setIsAdding(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Trade Setup
          </button>
        )}
      </header>

      {isAdding && (
        <TradeSetupForm 
          session={session} 
          onCancel={() => setIsAdding(false)} 
          onConfirm={(trade) => {
            onAddTrade(trade);
            setIsAdding(false);
          }} 
        />
      )}

      <div className="space-y-6">
        {activeTrades.length === 0 && !isAdding && (
          <div className="bg-white border border-line p-12 text-center">
            <Calculator className="w-12 h-12 text-stone-200 mx-auto mb-4" />
            <p className="text-sm font-bold">No active trades</p>
            <p className="text-xs text-stone-500 mt-1">Wait for a valid pullback/rally confirmation bar.</p>
          </div>
        )}

        {activeTrades.map(trade => (
          <ActiveTradeCard 
            key={trade.id} 
            trade={trade} 
            onClose={(pnl, reason, notes) => onUpdateTrade(trade.id, { 
              status: 'CLOSED', 
              pnl, 
              exitPrice: trade.entryPrice + (pnl / (trade.contracts * 5)) * (trade.direction === 'LONG' ? 1 : -1), 
              exitReason: reason,
              notes
            })} 
          />
        ))}
      </div>
    </div>
  );
}

function TradeSetupForm({ session, onCancel, onConfirm }: { 
  session: SessionState, 
  onCancel: () => void, 
  onConfirm: (trade: Trade) => void 
}) {
  const [entryPrice, setEntryPrice] = useState<number>(session.analysisResult?.suggestedEntry || 0);
  const [stopPrice, setStopPrice] = useState<number>(session.analysisResult?.suggestedStop || 0);
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>(session.dayType?.includes('LONG') ? 'LONG' : 'SHORT');

  const stopDistance = Math.abs(entryPrice - stopPrice);
  const riskPerContract = stopDistance * 5; // MES is $5/pt
  const maxRisk = session.accountEquity * session.riskPercent;
  const maxContracts = Math.min(SYSTEM_RULES.MAX_POSITION, Math.floor(maxRisk / riskPerContract));
  const [contracts, setContracts] = useState<number>(Math.min(3, maxContracts));

  const targetDistance = stopDistance * 2; // Default 2R
  const targetPrice = direction === 'LONG' ? entryPrice + targetDistance : entryPrice - targetDistance;

  const handleConfirm = () => {
    const trade: Trade = {
      id: Math.random().toString(36).substr(2, 9),
      date: session.date,
      direction,
      dayType: session.dayType!,
      entryPrice,
      stopPrice,
      targetPrice,
      contracts,
      status: 'OPEN',
      timestamp: Date.now()
    };
    onConfirm(trade);
  };

  return (
    <div className="card p-8 space-y-8 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Calculator className="w-5 h-5 text-accent" />
          Position Sizing & Parameters
        </h3>
        <button onClick={onCancel} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase opacity-50">Direction</label>
            <div className="flex gap-2">
              <button 
                onClick={() => setDirection('LONG')}
                className={cn(
                  "flex-1 py-2 border font-mono text-xs uppercase transition-all",
                  direction === 'LONG' ? "bg-green-600 border-green-600 text-white" : "border-line hover:bg-stone-50 dark:hover:bg-stone-800"
                )}
              >
                Long
              </button>
              <button 
                onClick={() => setDirection('SHORT')}
                className={cn(
                  "flex-1 py-2 border font-mono text-xs uppercase transition-all",
                  direction === 'SHORT' ? "bg-red-600 border-red-600 text-white" : "border-line hover:bg-stone-50 dark:hover:bg-stone-800"
                )}
              >
                Short
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase opacity-50">Entry Price</label>
              <input 
                type="number" 
                step="0.25"
                value={entryPrice || ''} 
                onChange={e => setEntryPrice(parseFloat(e.target.value))}
                className="w-full bg-stone-50 dark:bg-stone-900 border border-line p-2 font-mono text-sm focus:outline-none focus:border-accent"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase opacity-50">Stop Price</label>
              <input 
                type="number" 
                step="0.25"
                value={stopPrice || ''} 
                onChange={e => setStopPrice(parseFloat(e.target.value))}
                className="w-full bg-stone-50 dark:bg-stone-900 border border-line p-2 font-mono text-sm focus:outline-none focus:border-accent"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase opacity-50">Contracts (Max: {maxContracts})</label>
            <input 
              type="range" 
              min="1" 
              max={maxContracts || 1} 
              value={contracts} 
              onChange={e => setContracts(parseInt(e.target.value))}
              className="w-full accent-accent"
            />
            <div className="flex justify-between font-mono text-[10px] opacity-50">
              <span>1</span>
              <span className="font-bold text-accent">{contracts}</span>
              <span>{maxContracts}</span>
            </div>
          </div>
        </div>

        <div className="bg-stone-50 dark:bg-stone-900 border border-line p-6 space-y-4">
          <h4 className="text-[10px] font-mono uppercase opacity-50 border-b border-line pb-2">Trade Summary</h4>
          <div className="space-y-3">
            <SummaryItem label="Stop Distance" value={`${stopDistance.toFixed(2)} pts`} />
            <SummaryItem label="Risk/Contract" value={`$${riskPerContract.toFixed(2)}`} />
            <SummaryItem label="Total Risk" value={`$${(riskPerContract * contracts).toFixed(2)}`} highlight={riskPerContract * contracts > maxRisk} />
            <SummaryItem label="Target Price" value={targetPrice.toFixed(2)} />
            <SummaryItem label="R-Multiple" value="2.00R" />
          </div>
          
          {stopDistance > (session.dayType?.includes('TYPE 1') ? SYSTEM_RULES.MAX_STOP_TYPE_1 : SYSTEM_RULES.MAX_STOP_TYPE_2) && (
            <div className="flex gap-2 text-red-600 bg-red-50 dark:bg-red-950/20 p-2 border border-red-200 dark:border-red-900 text-[10px] font-mono uppercase">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Stop exceeds system max ({session.dayType?.includes('TYPE 1') ? SYSTEM_RULES.MAX_STOP_TYPE_1 : SYSTEM_RULES.MAX_STOP_TYPE_2} pts)
            </div>
          )}
        </div>
      </div>

      <div className="pt-6 border-t border-line flex gap-4">
        <button 
          onClick={handleConfirm} 
          disabled={!entryPrice || !stopPrice || stopDistance === 0 || contracts > maxContracts}
          className="btn-primary flex-1 disabled:opacity-30"
        >
          Execute Trade
        </button>
        <button onClick={onCancel} className="btn-outline">
          Cancel
        </button>
      </div>
    </div>
  );
}

function ActiveTradeCard({ trade, onClose }: { 
  trade: Trade, 
  onClose: (pnl: number, reason: Exclude<Trade['exitReason'], undefined>, notes?: string) => void,
  key?: string | number
}) {
  const [currentPrice, setCurrentPrice] = useState(trade.entryPrice);
  const [notes, setNotes] = useState('');
  const pnl = (currentPrice - trade.entryPrice) * trade.contracts * 5 * (trade.direction === 'LONG' ? 1 : -1);

  return (
    <div className="card p-6 animate-in zoom-in-95 duration-200">
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 flex items-center justify-center border",
            trade.direction === 'LONG' ? "border-green-500 text-green-600 bg-green-50 dark:bg-green-950/20" : "border-red-500 text-red-600 bg-red-50 dark:bg-red-950/20"
          )}>
            {trade.direction === 'LONG' ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
          </div>
          <div>
            <h4 className="text-lg font-bold tracking-tight">{trade.direction} {trade.contracts}x MES</h4>
            <p className="text-[10px] font-mono opacity-50 uppercase">Entry: {trade.entryPrice} | Stop: {trade.stopPrice} | Target: {trade.targetPrice}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={cn("text-2xl font-mono font-bold", pnl >= 0 ? "text-green-600" : "text-red-600")}>
            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
          </p>
          <p className="text-[10px] font-mono opacity-50 uppercase">Open P&L</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="space-y-2">
          <label className="text-[10px] font-mono uppercase opacity-50">Current Price</label>
          <input 
            type="number" 
            step="0.25"
            value={currentPrice} 
            onChange={e => setCurrentPrice(parseFloat(e.target.value))}
            className="w-full bg-stone-50 dark:bg-stone-900 border border-line p-2 font-mono text-sm focus:outline-none focus:border-accent"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-mono uppercase opacity-50">Trade Notes (Lessons Learned)</label>
          <input 
            type="text" 
            value={notes} 
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Lowered target due to hard exit..."
            className="w-full bg-stone-50 dark:bg-stone-900 border border-line p-2 font-mono text-sm focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex items-end justify-end gap-2">
          <button onClick={() => onClose(pnl, 'TARGET', notes)} className="btn-outline text-[10px] py-1 px-3 border-green-600 text-green-600 hover:bg-green-600 hover:text-white">Target</button>
          <button onClick={() => onClose(pnl, 'STOP', notes)} className="btn-outline text-[10px] py-1 px-3 border-red-600 text-red-600 hover:bg-red-600 hover:text-white">Stop</button>
          <button onClick={() => onClose(pnl, 'MANUAL', notes)} className="btn-primary text-[10px] py-1 px-3">Exit Market</button>
        </div>
      </div>

      <div className="flex gap-4 text-[10px] font-mono uppercase opacity-50 border-t border-stone-100 dark:border-stone-800 pt-4">
        <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Stop Protected</span>
        <span className="flex items-center gap-1"><Target className="w-3 h-3" /> Target Active</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Hard Exit: 12:30 EDT</span>
      </div>
    </div>
  );
}

function SummaryItem({ label, value, highlight }: { label: string, value: string | number, highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center text-xs font-mono">
      <span className="opacity-50 uppercase">{label}</span>
      <span className={cn("font-bold", highlight && "text-red-600")}>{value}</span>
    </div>
  );
}
