import React from 'react';
import { SessionState, Trade } from '../types';
import { Clock } from 'lucide-react';

export default function LunchReversal({ 
  session, 
  onUpdate 
}: { 
  session: SessionState,
  onUpdate: (updates: Partial<SessionState>) => void
}) {
  return (
    <div className="space-y-6 fade-up">
      <header className="page-header">
        <div>
          <h1>Lunch Reversal</h1>
          <p>12:00-13:00 EST TRAP CONDITIONS</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-base flex flex-col min-h-[300px]">
          <div className="card-header">
            <span>Live Analysis</span>
          </div>
          <div className="empty-state flex-1">
            <Clock className="w-8 h-8 opacity-40 mb-4" />
            <h3>AWAITING 12:00 BAR</h3>
            <p>Lunch reversal module activates during the noon chop zone to look for false breakout traps.</p>
          </div>
        </div>

        <div className="card-base flex flex-col">
          <div className="card-header">
            <span>Requirements</span>
          </div>
          <div className="space-y-[1px] bg-[var(--b0)] flex-1">
            <div className="bg-[var(--s1)] p-4 flex flex-col gap-2">
               <span className="font-mono text-[11px] font-bold text-[var(--txt)]">Lunch Reversal Setup</span>
               <p className="text-[10px] text-[var(--txt2)] border-l-2 border-[var(--b2)] pl-2">Morning structure dictates the trap direction. Reversal only valid against the prevailing trend.</p>
            </div>
            <div className="bg-[var(--s1)] p-4 flex flex-col gap-2">
               <span className="font-mono text-[11px] font-bold text-[var(--txt)]">Minimum Volatility</span>
               <p className="text-[10px] text-[var(--txt2)] border-l-2 border-[var(--b2)] pl-2">Initial morning move must be &gt; 40 points to create sufficient exhaustion.</p>
            </div>
            <div className="bg-[var(--s1)] p-4 flex flex-col gap-2">
               <span className="font-mono text-[11px] font-bold text-[var(--txt)]">The Trap</span>
               <p className="text-[10px] text-[var(--txt2)] border-l-2 border-[var(--b2)] pl-2">12:00-13:00 must create a false breakout trap above/below the morning boundary.</p>
            </div>
            <div className="bg-[var(--s1)] p-4 flex flex-col gap-2">
               <span className="font-mono text-[11px] font-bold text-[var(--txt)]">Execution Trigger</span>
               <p className="text-[10px] text-[var(--txt2)] border-l-2 border-[var(--orange)] pl-2 text-[var(--orange)]">Entry on the reclaim of the 12:00 boundary with 5M close confirmation.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
