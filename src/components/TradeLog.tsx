import React, { useState } from 'react';
import { Trade, AppState, ProposedRule } from '../types';
import { Target, TrendingUp, TrendingDown, Clock, ShieldAlert, Sparkles, Loader2, Plus, Download, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { updateTradeStatus } from '../lib/firestoreService';

export default function TradeLog({ trades, appState, onAddTrade, onDeleteTrade }: { 
  trades: Trade[], 
  appState: AppState,
  onProposeRule: (rule: ProposedRule) => void, // Kept to satisfy interface
  onAddTrade: (trade: Trade) => void,
  onDeleteTrade?: (id: string) => void
}) {
  const [isAddingManual, setIsAddingManual] = useState(false);

  return (
    <div className="space-y-6 fade-up">
      <header className="page-header">
        <div>
          <h1>History</h1>
          <p>EXECUTION LOG & PERFORMANCE</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsAddingManual(true)} className="qd-btn-ghost">
            <Plus className="w-3 h-3 mr-1" /> MANUAL ENTRY
          </button>
          <button className="qd-btn-ghost">
            <Download className="w-3 h-3 mr-1" /> EXPORT LOG
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

      {/* Stats row can be optional, keeping it for value */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-base flex items-center justify-between p-4">
          <div>
            <p className="kpi-label">Win Rate</p>
            <p className="kpi-value text-[var(--txt)]">{(((trades || []).filter(t => t.pnl && t.pnl > 0).length / ((trades || []).filter(t => t.status === 'CLOSED' || t.status === 'SUCCESSFUL' || t.status === 'FAILED').length || 1)) * 100).toFixed(1)}%</p>
          </div>
          <Target className="w-4 h-4 text-[var(--txt3)]" />
        </div>
        <div className="card-base flex items-center justify-between p-4">
          <div>
            <p className="kpi-label">Avg Expectancy</p>
            <p className="kpi-value text-[var(--txt)]">${((trades || []).reduce((acc, t) => acc + (t.pnl || 0), 0) / ((trades || []).filter(t => t.status === 'CLOSED' || t.status === 'SUCCESSFUL' || t.status === 'FAILED').length || 1)).toFixed(2)}</p>
          </div>
          <Clock className="w-4 h-4 text-[var(--txt3)]" />
        </div>
        <div className="card-base flex items-center justify-between p-4">
          <div>
            <p className="kpi-label">Total Fills</p>
            <p className="kpi-value text-[var(--txt)]">{(trades || []).length}</p>
          </div>
          <ShieldAlert className="w-4 h-4 text-[var(--txt3)]" />
        </div>
      </div>

      <div className="card-base flex flex-col">
        <div className="card-header">
           <span>Execution Log</span>
        </div>
        
        {(!trades || trades.length === 0) ? (
          <div className="empty-state">
            <h3>NO TRADES RECORDED</h3>
            <p>Your history will populate automatically after executing trades.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day Type</th>
                  <th>Dir</th>
                  <th>Entry</th>
                  <th>P&L</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {trades.map(trade => (
                  <tr key={trade.id}>
                    <td>{trade.date}</td>
                    <td className="font-mono">{trade.dayType}</td>
                    <td>
                      <span className={trade.direction === 'LONG' ? "text-[var(--green)]" : "text-[var(--red)]"}>{trade.direction}</span>
                    </td>
                    <td className="font-mono">{trade.entryPrice}</td>
                    <td className="font-mono" style={{ fontWeight: 'bold' }}>
                      <span className={trade.pnl && trade.pnl >= 0 ? "text-[var(--green)]" : trade.pnl && trade.pnl < 0 ? "text-[var(--red)]" : "text-[var(--txt)]"}>
                        {trade.pnl ? `${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}` : '—'}
                      </span>
                    </td>
                    <td>
                      {trade.status === 'SUCCESSFUL' && <span className="qd-badge qd-badge-green">SUCCESS</span>}
                      {(trade.status === 'FAILED' || trade.status === 'CLOSED') && trade.pnl && trade.pnl < 0 && <span className="qd-badge qd-badge-red">STOPPED</span>}
                      {(trade.status === 'CLOSED') && trade.pnl && trade.pnl >= 0 && <span className="qd-badge qd-badge-green">CLOSED</span>}
                      {(trade.status === 'OPEN' || trade.status === 'EXECUTED') && <span className="qd-badge qd-badge-amber">OPEN</span>}
                      {trade.status === 'MISSED' && <span className="qd-badge qd-badge-muted">MISSED</span>}
                    </td>
                    <td className="w-1/3">
                      {trade.notes ? <span className="text-[9px]">{trade.notes}</span> : <span className="text-[var(--txt3)]">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Basic form adapted to fit styles without being too large
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
      stopPrice: 0, 
      targetPrice: 0,
      pnl: parseFloat(pnl),
      status: parseFloat(pnl) >= 0 ? 'SUCCESSFUL' : 'FAILED',
      exitReason: 'MANUAL',
      notes,
      timestamp: Date.now()
    };
    onConfirm(trade);
  };

  return (
    <div className="card-base fade-up">
       <div className="card-header border-b border-[var(--b0)] pb-2 mb-4">
         <span className="flex items-center gap-2"><Plus className="w-3 h-3 text-[var(--orange)]" /> Manual Trade Entry</span>
       </div>
       <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="space-y-1">
               <label className="text-[9px] font-mono uppercase text-[var(--txt2)]">Direction</label>
               <div className="flex gap-2">
                 <button type="button" onClick={() => setDirection('LONG')} className={cn("flex-1 h-[30px] font-mono text-[9px] border", direction === 'LONG' ? "bg-[var(--green)] text-black border-[var(--green)]" : "border-[var(--b1)] text-[var(--txt2)]")}>LONG</button>
                 <button type="button" onClick={() => setDirection('SHORT')} className={cn("flex-1 h-[30px] font-mono text-[9px] border", direction === 'SHORT' ? "bg-[var(--red)] text-black border-[var(--red)]" : "border-[var(--b1)] text-[var(--txt2)]")}>SHORT</button>
               </div>
            </div>
            <div className="space-y-1">
               <label className="text-[9px] font-mono uppercase text-[var(--txt2)]">Contracts</label>
               <input type="number" value={contracts} onChange={e => setContracts(parseInt(e.target.value))} className="w-full bg-[var(--bg)] border border-[var(--b1)] p-2 text-[10px] h-[30px] font-mono focus:outline-none" required />
            </div>
            <div className="space-y-1">
               <label className="text-[9px] font-mono uppercase text-[var(--txt2)]">Day Type</label>
               <select value={dayType} onChange={e => setDayType(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--b1)] p-2 text-[10px] h-[30px] font-mono focus:outline-none">
                 <option>TYPE 1 LONG</option>
                 <option>TYPE 2 LONG</option>
                 <option>TYPE 1 SHORT</option>
                 <option>TYPE 2 SHORT</option>
               </select>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
               <label className="text-[9px] font-mono uppercase text-[var(--txt2)]">Entry Price</label>
               <input type="number" step="0.25" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--b1)] p-2 text-[10px] h-[30px] font-mono focus:outline-none" required />
            </div>
            <div className="space-y-1">
               <label className="text-[9px] font-mono uppercase text-[var(--txt2)]">Exit Price</label>
               <input type="number" step="0.25" value={exitPrice} onChange={e => setExitPrice(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--b1)] p-2 text-[10px] h-[30px] font-mono focus:outline-none" required />
            </div>
            <div className="space-y-1">
               <label className="text-[9px] font-mono uppercase text-[var(--txt2)]">Total P&L ($)</label>
               <input type="number" step="0.01" value={pnl} onChange={e => setPnl(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--b1)] p-2 text-[10px] h-[30px] font-mono focus:outline-none" required />
            </div>
          </div>
          <div className="space-y-4 flex flex-col justify-between">
            <div className="space-y-1">
               <label className="text-[9px] font-mono uppercase text-[var(--txt2)]">Notes</label>
               <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--b1)] p-2 text-[10px] h-[100px] font-mono focus:outline-none" />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="qd-btn-primary flex-1">Save</button>
              <button type="button" onClick={onCancel} className="qd-btn-ghost flex-1">Cancel</button>
            </div>
          </div>
       </form>
    </div>
  );
}
