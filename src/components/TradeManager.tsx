import React, { useState } from 'react';
import { ShieldCheck, Target, Clock, TrendingUp, TrendingDown, XCircle } from 'lucide-react';
import { SessionState, Trade } from '../types';
import { SYSTEM_RULES } from '../constants';
import { cn } from '../lib/utils';

export default function TradeManager({ session, onAddTrade, onUpdateTrade }: { 
  session: SessionState, 
  onAddTrade: (trade: Trade) => void,
  onUpdateTrade: (id: string, updates: Partial<Trade>) => void
}) {
  const activeTrades = (session.trades || []).filter(t => t.status === 'OPEN');
  
  const [entryPrice, setEntryPrice] = useState<number>(session.analysisResult?.suggestedEntry || 0);
  const [stopPrice, setStopPrice] = useState<number>(session.analysisResult?.suggestedStop || 0);
  const [targetPrice, setTargetPrice] = useState<number>(session.analysisResult?.suggestedTarget || 0);
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>(session.dayType?.includes('LONG') ? 'LONG' : 'SHORT');

  const stopDistance = Math.abs((entryPrice || 0) - (stopPrice || 0));
  const rMultiple = stopDistance > 0 && targetPrice ? Math.abs((targetPrice - entryPrice) / stopDistance) : 0;

  const handleExecute = () => {
    if (!entryPrice || !stopPrice || !targetPrice) return;
    const trade: Trade = {
      id: Math.random().toString(36).substr(2, 9),
      date: session.date,
      direction,
      dayType: session.dayType || 'NO TRADE',
      entryPrice,
      stopPrice,
      targetPrice,
      contracts: 1, // Fixed or can be dynamic
      status: 'OPEN',
      timestamp: Date.now()
    };
    onAddTrade(trade);
  };

  const calculatePnl = (trade: Trade) => {
    // Fake P&L calculation for UI
    return (entryPrice - trade.entryPrice) * trade.contracts * 5 * (trade.direction === 'LONG' ? 1 : -1) || 0;
  };

  return (
    <div className="space-y-6 fade-up">
      <header className="page-header">
        <div>
          <h1>Trade Desk</h1>
          <p>EXECUTION & RISK MANAGEMENT</p>
        </div>
      </header>

      {/* KPI Strip */}
      <div className="kpi-strip rounded-sm overflow-hidden mb-6">
        <div className="kpi-cell flex-1">
          <span className="kpi-label">Entry</span>
          <span className="kpi-value text-[var(--txt)]">{session.analysisResult?.suggestedEntry || '—'}</span>
        </div>
        <div className="kpi-cell flex-1">
          <span className="kpi-label">Stop</span>
          <span className="kpi-value text-[var(--txt)]">{session.analysisResult?.suggestedStop || '—'}</span>
        </div>
        <div className="kpi-cell flex-1">
          <span className="kpi-label">Target</span>
          <span className="kpi-value text-[var(--txt)]">{session.analysisResult?.suggestedTarget || '—'}</span>
        </div>
        <div className="kpi-cell flex-1">
          <span className="kpi-label">R/R</span>
          <span className="kpi-value text-[var(--txt)]">{session.analysisResult ? '2.0R' : '—'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Position Entry */}
        <div className="card-base flex flex-col">
          <div className="card-header">
            <span>Position Entry</span>
          </div>

          <div className="flex gap-4 mb-4">
             <button 
               onClick={() => setDirection('LONG')}
               className={cn("flex-1 h-[60px] font-mono font-bold text-[14px] uppercase border", direction === 'LONG' ? "bg-[var(--green)] text-black border-[var(--green)]" : "bg-transparent text-[var(--txt2)] border-[var(--b1)]")}
             >
               LONG
             </button>
             <button 
               onClick={() => setDirection('SHORT')}
               className={cn("flex-1 h-[60px] font-mono font-bold text-[14px] uppercase border", direction === 'SHORT' ? "bg-[var(--red)] text-black border-[var(--red)]" : "bg-transparent text-[var(--txt2)] border-[var(--b1)]")}
             >
               SHORT
             </button>
          </div>

          <div className="flex gap-4 mb-6">
             <div className="flex-1 border-b border-[var(--b1)] pb-1">
               <label className="text-[9px] font-mono uppercase text-[var(--txt2)] block mb-1">Entry</label>
               <input 
                 type="number" 
                 value={entryPrice || ''} 
                 onChange={e => setEntryPrice(Number(e.target.value))}
                 className="w-full bg-transparent font-mono text-[16px] text-[var(--txt)] focus:outline-none" 
                 placeholder="0.00" 
               />
             </div>
             <div className="flex-1 border-b border-[var(--b1)] pb-1">
               <label className="text-[9px] font-mono uppercase text-[var(--txt2)] block mb-1">Stop</label>
               <input 
                 type="number" 
                 value={stopPrice || ''} 
                 onChange={e => setStopPrice(Number(e.target.value))}
                 className="w-full bg-transparent font-mono text-[16px] text-[var(--red)] focus:outline-none" 
                 placeholder="0.00" 
               />
             </div>
             <div className="flex-1 border-b border-[var(--b1)] pb-1">
               <label className="text-[9px] font-mono uppercase text-[var(--txt2)] block mb-1">Target</label>
               <input 
                 type="number" 
                 value={targetPrice || ''} 
                 onChange={e => setTargetPrice(Number(e.target.value))}
                 className="w-full bg-transparent font-mono text-[16px] text-[var(--green)] focus:outline-none" 
                 placeholder="0.00" 
               />
             </div>
          </div>

          <button onClick={handleExecute} className="qd-btn-primary w-full h-[40px] text-[12px]">
             EXECUTE TRADE
          </button>
        </div>

        {/* Right: Active Positions */}
        <div className="card-base flex flex-col">
          <div className="card-header">
            <span>Active Positions</span>
            {activeTrades.length > 0 && <span className="qd-badge qd-badge-orange">{activeTrades.length}</span>}
          </div>

          {activeTrades.length === 0 ? (
            <div className="empty-state flex-1">
               <Target className="w-8 h-8 opacity-40 mb-4" />
               <h3>NO ACTIVE TRADES</h3>
               <p>Select direction and parameters to execute.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto">
               <table>
                 <thead>
                   <tr>
                     <th>Dir</th>
                     <th>Entry</th>
                     <th>Tgt</th>
                     <th>Status</th>
                     <th>Action</th>
                   </tr>
                 </thead>
                 <tbody>
                   {activeTrades.map(trade => (
                     <tr key={trade.id}>
                       <td><span className={trade.direction === 'LONG' ? "text-[var(--green)]" : "text-[var(--red)]"}>{trade.direction}</span></td>
                       <td>{trade.entryPrice}</td>
                       <td>{trade.targetPrice}</td>
                       <td><span className="qd-badge qd-badge-amber">OPEN</span></td>
                       <td>
                         <button 
                           onClick={() => onUpdateTrade(trade.id, { status: 'CLOSED', pnl: calculatePnl(trade) })}
                           className="qd-btn-ghost-red h-[20px] text-[8px] px-2"
                         >
                           CLOSE
                         </button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
