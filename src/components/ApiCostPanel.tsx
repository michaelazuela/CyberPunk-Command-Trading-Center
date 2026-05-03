import React, { useEffect, useState } from 'react';
import { getApiCosts, getTotalCostToday, getLastUsedModel } from '../lib/apiCost';
import { formatModelLabel } from '../lib/modelRouter';
import { cn } from '../lib/utils';
import { BadgeDollarSign } from 'lucide-react';

export default function ApiCostPanel({ route }: { route?: string }) {
  const [cost, setCost] = useState(0);
  const [lastModel, setLastModel] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      setCost(getTotalCostToday(route));
      setLastModel(getLastUsedModel(route));
    };
    update();
    window.addEventListener('mnq_api_cost_update', update);
    return () => window.removeEventListener('mnq_api_cost_update', update);
  }, [route]);

  return (
    <div className="card-base mb-6 fade-up">
      <div className="card-header border-b border-[var(--b1)] pb-2 mb-4">
        <span className="flex items-center gap-2">
          <BadgeDollarSign className="w-4 h-4 text-[var(--green)]" />
          API Cost Tracking
        </span>
      </div>
      <div className="flex items-center gap-6">
        <div>
           <span className="block text-[10px] text-[var(--txt2)] uppercase font-mono mb-1">Today's Estimated Cost</span>
           <span className={cn("text-[14px] font-mono font-bold", cost > 0.5 ? "text-[var(--red)]" : "text-[var(--green)]")}>
             ${cost.toFixed(4)}
           </span>
        </div>
        
        {lastModel && (
          <div>
            <span className="block text-[10px] text-[var(--txt2)] uppercase font-mono mb-1">Last Used Model</span>
            <span className={cn("text-[12px] font-mono font-bold px-2 py-0.5 rounded border", lastModel.includes('flash') ? "text-[var(--cyan)] border-[var(--cyan)]/30 bg-[var(--cyan)]/10" : "text-[var(--amber)] border-[var(--amber)]/30 bg-[var(--amber)]/10")}>
              {formatModelLabel(lastModel)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
