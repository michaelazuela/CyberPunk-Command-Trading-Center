import React, { useEffect, useState } from 'react';
import { getCostMetrics, setManualBalance, clearCostsToday, clearAllCosts } from '../lib/apiCost';
import { formatModelLabel } from '../lib/modelRouter';
import { cn } from '../lib/utils';
import { BadgeDollarSign, AlertTriangle, RefreshCcw } from 'lucide-react';

export default function ApiCostPanel({ route }: { route?: string }) {
  const [metrics, setMetrics] = useState(getCostMetrics(route));
  const [balanceInput, setBalanceInput] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const newMetrics = getCostMetrics(route);
      setMetrics(newMetrics);
      if (newMetrics.manualBalance !== null && balanceInput === '') {
        setBalanceInput(newMetrics.manualBalance.toFixed(2));
      }
    };
    update();
    window.addEventListener('mnq_api_cost_update', update);
    return () => window.removeEventListener('mnq_api_cost_update', update);
  }, [route]);

  const handleSaveBalance = () => {
    if (!balanceInput.trim()) {
      setManualBalance(null);
    } else {
      const val = parseFloat(balanceInput);
      if (!isNaN(val)) {
        setManualBalance(val);
      }
    }
  };

  const handleClearBalance = () => {
    setBalanceInput('');
    setManualBalance(null);
  };

  const handleResetToday = () => {
    if (confirm("Are you sure you want to clear all local API cost events for today?")) {
      clearCostsToday();
    }
  };

  const handleResetAll = () => {
    if (confirm("Are you sure you want to clear ALL local API cost tracking events?")) {
      clearAllCosts();
    }
  };

  const { todayCost, monthCost, sessions, estimatedRemaining, lastModel, hasUnconfiguredPricing } = metrics;
  
  const formatCost = (val: number) => `$${val.toFixed(4)}`;
  const hasLowBalance = estimatedRemaining !== null && estimatedRemaining < 5.00;

  return (
    <div className="card-base mb-6 fade-up">
      <div className="card-header border-b border-[var(--b1)] pb-2 mb-4 flex justify-between items-center">
        <span className="flex items-center gap-2">
          <BadgeDollarSign className="w-4 h-4 text-[var(--green)]" />
          API Cost Tracking
        </span>
        <div className="flex gap-2">
          <button onClick={handleResetToday} className="text-[10px] bg-[var(--b1)] hover:bg-[var(--b2)] px-2 py-1 rounded-sm text-[var(--txt2)] transition-colors flex items-center gap-1" title="Reset Today's Local Cost Events">
             <RefreshCcw className="w-3 h-3" /> Today
          </button>
          <button onClick={handleResetAll} className="text-[10px] bg-[var(--b1)] hover:bg-[var(--b2)] px-2 py-1 rounded-sm text-[var(--txt2)] transition-colors flex items-center gap-1" title="Reset All Local Cost Events">
             <RefreshCcw className="w-3 h-3" /> All
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
        <div>
           <span className="block text-[10px] text-[var(--txt2)] uppercase font-mono mb-1">Today's Estimated Cost</span>
           <span className="text-[14px] font-mono font-bold text-[var(--txt)]">
             {formatCost(todayCost)}
           </span>
        </div>
        
        <div>
           <span className="block text-[10px] text-[var(--txt2)] uppercase font-mono mb-1">Month-To-Date Estimate</span>
           <span className="text-[14px] font-mono font-bold text-[var(--txt)]">
             {formatCost(monthCost)}
           </span>
        </div>

        <div>
           <span className="block text-[10px] text-[var(--txt2)] uppercase font-mono mb-1">Google API Balance</span>
           <div className="flex items-center gap-2">
             <span className="text-[var(--txt2)]">$</span>
             <input 
               type="number" 
               className="bg-[var(--b0)] border border-[var(--b2)] w-20 px-2 py-1 text-[12px] font-mono rounded-sm outline-none focus:border-[var(--green)]" 
               placeholder="25.00"
               value={balanceInput}
               onChange={(e) => setBalanceInput(e.target.value)}
               onBlur={handleSaveBalance}
             />
             {metrics.manualBalance !== null && (
               <button onClick={handleClearBalance} className="text-[10px] text-[var(--txt3)] hover:text-[var(--red)] uppercase">Clear</button>
             )}
           </div>
        </div>

        <div>
           <span className="block text-[10px] text-[var(--txt2)] uppercase font-mono mb-1">Estimated Remaining</span>
           <span className={cn("text-[14px] font-mono font-bold", hasLowBalance ? "text-[var(--red)]" : "text-[var(--green)]")}>
             {estimatedRemaining !== null ? `$${estimatedRemaining.toFixed(2)}` : "--"}
           </span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-6 pb-2 border-b border-[var(--b1)] mb-4">
        {lastModel && (
          <div>
            <span className="block text-[10px] text-[var(--txt2)] uppercase font-mono mb-1">Last Used Model</span>
            <span className={cn("text-[11px] font-mono font-bold px-2 py-0.5 rounded border", lastModel.includes('flash') ? "text-[var(--cyan)] border-[var(--cyan)]/30 bg-[var(--cyan)]/10" : "text-[var(--amber)] border-[var(--amber)]/30 bg-[var(--amber)]/10")}>
              {formatModelLabel(lastModel)}
            </span>
          </div>
        )}
        
        <div className="flex-1">
           <span className="block text-[10px] text-[var(--txt2)] uppercase font-mono mb-1">Session Breakdown (MTD)</span>
           <div className="flex flex-wrap gap-x-4 gap-y-1">
             <div className="text-[10px] font-mono"><span className="text-[var(--txt3)]">Morning:</span> {formatCost(sessions.morning)}</div>
             <div className="text-[10px] font-mono"><span className="text-[var(--txt3)]">Lunch:</span> {formatCost(sessions.lunch)}</div>
             <div className="text-[10px] font-mono"><span className="text-[var(--txt3)]">Replay Lab:</span> {formatCost(sessions.replay_lab)}</div>
             <div className="text-[10px] font-mono"><span className="text-[var(--txt3)]">Proof Review:</span> {formatCost(sessions.proof_review)}</div>
           </div>
        </div>
      </div>

      <div className="space-y-1">
        {hasUnconfiguredPricing && (
          <p className="text-[10px] text-[var(--amber)] flex items-center gap-1 bg-[var(--amber)]/10 p-1 rounded-sm">
            <AlertTriangle className="w-3 h-3" /> Pricing not configured for some models. Estimates may be $0.
          </p>
        )}
        <p className="text-[9px] text-[var(--txt3)]">
          Manual balance. Google billing may update with delay. Estimates are based on app-recorded token usage. Check Google AI Studio or Google Cloud Billing for official balance.
        </p>
      </div>
    </div>
  );
}
