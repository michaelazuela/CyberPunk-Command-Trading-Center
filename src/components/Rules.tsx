/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BookOpen, Shield, Clock, AlertTriangle, Sparkles, Check, X, Calculator, Target } from 'lucide-react';
import { ProposedRule } from '../types';
import { cn } from '../lib/utils';

export default function Rules({ customRules = [], onUpdateRule }: { 
  customRules: ProposedRule[],
  onUpdateRule: (id: string, status: ProposedRule['status']) => void
}) {
  const pendingRules = (customRules || []).filter(r => r.status === 'PENDING');
  const approvedRules = (customRules || []).filter(r => r.status === 'APPROVED');

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold tracking-tight">System Rules</h2>
        <p className="text-sm text-stone-500 font-mono uppercase">The MES/MNQ Complete Trading Framework</p>
      </header>

      {pendingRules.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-sm font-mono uppercase flex items-center gap-2 text-accent">
            <Sparkles className="w-4 h-4" />
            Proposed Rule Refinements
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {pendingRules.map(rule => (
              <div key={rule.id} className="card p-6 border-accent/30 bg-accent/5">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1">
                    <p className="text-sm font-bold">{rule.rule}</p>
                    <p className="text-xs text-stone-500 italic">"{rule.reasoning}"</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onUpdateRule(rule.id, 'APPROVED')}
                      className="p-2 bg-green-600 text-white hover:bg-green-700 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onUpdateRule(rule.id, 'REJECTED')}
                      className="p-2 bg-red-600 text-white hover:bg-red-700 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {approvedRules.length > 0 && (
          <section className="card p-6 space-y-4 border-accent/20">
            <h3 className="text-sm font-mono uppercase flex items-center gap-2 border-b border-line pb-2 text-accent">
              <Sparkles className="w-4 h-4" />
              Custom Strategy Refinements
            </h3>
            <div className="space-y-4">
              {approvedRules.map(rule => (
                <div key={rule.id} className="space-y-1">
                  <p className="text-xs font-bold flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full mt-1.5 shrink-0" />
                    {rule.rule}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
        <section className="card p-6 space-y-4">
          <h3 className="text-sm font-mono uppercase flex items-center gap-2 border-b border-line pb-2">
            <Clock className="w-4 h-4" />
            Session Windows
          </h3>
          <div className="space-y-3 text-xs">
            <RuleRow label="Observation" value="09:30 - 10:15 EDT" />
            <RuleRow label="Entry Window" value="10:15 - 11:15 EDT" />
            <RuleRow label="Hard Exit" value="12:30 EDT" />
            <p className="text-[10px] text-stone-500 italic mt-2">No entries permitted after 11:15 AM. All positions must be flat by 12:30 PM.</p>
          </div>
        </section>

        <section className="card p-6 space-y-4">
          <h3 className="text-sm font-mono uppercase flex items-center gap-2 border-b border-line pb-2">
            <Shield className="w-4 h-4" />
            Risk Management
          </h3>
          <div className="space-y-3 text-xs">
            <RuleRow label="Max Risk" value="2% of Account Equity" />
            <RuleRow label="Max Position" value="9 Contracts Total" />
            <RuleRow label="Stop Type 1" value="Max 6 Points" />
            <RuleRow label="Stop Type 2" value="Max 8 Points" />
          </div>
        </section>

        <section className="card p-6 space-y-4">
          <h3 className="text-sm font-mono uppercase flex items-center gap-2 border-b border-line pb-2">
            <AlertTriangle className="w-4 h-4" />
            Kill Switches
          </h3>
          <div className="space-y-3 text-xs">
            <RuleRow label="Daily Loss Limit" value="2 Losing Trades" />
            <RuleRow label="Order Limit" value="50 Total Fills" />
            <RuleRow label="Time Limit" value="Past 11:15 AM" />
            <RuleRow label="Discipline" value="No Revenge Trading" />
          </div>
        </section>

        <section className="card p-6 space-y-4">
          <h3 className="text-sm font-mono uppercase flex items-center gap-2 border-b border-line pb-2">
            <BookOpen className="w-4 h-4" />
            Confirmation Bar
          </h3>
          <div className="space-y-2 text-[10px] font-mono uppercase">
            <p className="font-bold text-orange-600 mt-2">Opening Order Block (Risk Mitigation):</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Range: 9:30 - 9:35 combined high/low</li>
              <li>Entry: 61.8% retracement (Golden Ratio)</li>
              <li>Stop: Just outside the block extreme</li>
              <li>Trigger: When risk to 9:30 extreme {'>'} 15 pts</li>
            </ul>
            <p className="font-bold text-blue-600 mt-2">Momentum Entry (Runaway):</p>
            <ul className="list-disc pl-4 space-y-1 mb-4">
              <li>3+ bars with minimal overlap</li>
              <li>Entry on break of prior candle low/high</li>
              <li>Stop at prior candle high/low</li>
            </ul>
            <p className="font-bold text-green-600">Long Confirmation:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Green bar closing ABOVE prior close</li>
              <li>Lower wick present (rejection)</li>
              <li>Body &gt; 50% of total range</li>
            </ul>
            <p className="font-bold text-red-600 mt-2">Short Confirmation:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Red bar closing BELOW prior close</li>
              <li>Upper wick present (rejection)</li>
              <li>Body &gt; 50% of total range</li>
            </ul>
          </div>
        </section>
        <section className="card p-6 border-l-4 border-l-amber-500">
          <h3 className="text-sm font-mono uppercase opacity-50 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Trend Exhaustion & Time Rules
          </h3>
          <div className="space-y-4 text-sm leading-relaxed">
            <div className="p-3 bg-amber-500/5 border border-amber-500/20">
              <p className="font-bold text-amber-600">The 10:15 Pivot:</p>
              <p className="opacity-80">If the market fails to make a new High/Low at 10:15 after a 45-minute trend, it is entering "Distribution". Exit or move stops to tight trail.</p>
            </div>
            <div className="p-3 bg-stone-50 dark:bg-stone-800 border border-line">
              <p className="font-bold">10:30 Risk Management:</p>
              <ul className="list-disc pl-4 space-y-1 opacity-80">
                <li>If trade is active at 10:30: Move stop to Breakeven.</li>
                <li>If price has moved 50% to target: Move stop to 10:00 HL/LH.</li>
                <li>Reason: Liquidity shifts and "M/W" patterns often form at this hour.</li>
              </ul>
            </div>
          </div>
        </section>
        <section className="card p-6 border-l-4 border-l-accent">
          <h3 className="text-sm font-mono uppercase opacity-50 mb-4 flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Confidence Calculation (Weighted Formula)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-mono">
            <div className="space-y-2">
              <p className="font-bold uppercase border-b border-line pb-1">Positive Weights (+)</p>
              <div className="flex justify-between"><span>Base Setup (Type 1/2)</span><span className="text-green-500">+60%</span></div>
              <div className="flex justify-between"><span>Liquidity Sweep (Wick)</span><span className="text-green-500">+10%</span></div>
              <div className="flex justify-between"><span>Reclaim of 9:30 Open</span><span className="text-green-500">+10%</span></div>
              <div className="flex justify-between"><span>Confirmation Close</span><span className="text-green-500">+15%</span></div>
              <div className="flex justify-between"><span>Staircase Structure</span><span className="text-green-500">+5%</span></div>
              <p className="text-[10px] italic opacity-50 mt-2">* Max Potential capped at 95%</p>
            </div>
            <div className="space-y-2">
              <p className="font-bold uppercase border-b border-line pb-1 text-red-500">Deductions (-)</p>
              <div className="flex justify-between"><span>Risk Penalty (&gt;15 pts)</span><span className="text-red-500">-15%</span></div>
              <div className="flex justify-between"><span>Overlap Penalty (&gt;80%)</span><span className="text-red-500">-20%</span></div>
              <div className="flex justify-between"><span>Exhaustion (&gt;30 pts)</span><span className="text-red-500">-15%</span></div>
              <div className="flex justify-between"><span>10:15 Distribution (M/W)</span><span className="text-red-500">-30%</span></div>
            </div>
          </div>
        </section>
        <section className="card p-6 border-l-4 border-l-blue-500">
          <h3 className="text-sm font-mono uppercase opacity-50 mb-4 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Sweep & Reclaim Mechanics
          </h3>
          <div className="space-y-4 text-sm leading-relaxed">
            <div className="p-3 bg-blue-500/5 border border-blue-500/20">
              <p className="font-bold text-blue-600">The Liquidity Sweep:</p>
              <p className="opacity-80">Price breaches the 9:30 extreme (High or Low) with a wick only. This "traps" breakout traders and hits stops.</p>
            </div>
            <div className="p-3 bg-stone-50 dark:bg-stone-800 border border-line">
              <p className="font-bold">The Reclaim Trigger:</p>
              <ul className="list-disc pl-4 space-y-1 opacity-80">
                <li>Price must close back inside the 9:30 range within 2 bars.</li>
                <li>High Conviction: A 5-minute candle closes above/below the 9:30 extreme after the sweep.</li>
                <li>Late Morning (10:45-11:00): A sweep of a local low followed by a close near the 9:30 open is a "Lunch Reversal" signal.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="card p-6 border-l-4 border-l-orange-500">
          <h3 className="text-sm font-mono uppercase opacity-50 mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Order Block (Risk Mitigation)
          </h3>
          <div className="space-y-4 text-sm leading-relaxed">
            <div className="p-3 bg-orange-500/5 border border-orange-500/20">
              <p className="font-bold text-orange-600">The 61.8% Golden Ratio:</p>
              <p className="opacity-80">Used when the stop distance to the 9:30 extreme is {'>'} 15 points. Instead of chasing, we wait for a deeper discount.</p>
            </div>
            <div className="p-3 bg-stone-50 dark:bg-stone-800 border border-line">
              <p className="font-bold">Execution Rules:</p>
              <ul className="list-disc pl-4 space-y-1 opacity-80">
                <li>Entry: Limit order at the 61.8% retracement of the 9:30-9:35 range.</li>
                <li>Stop: Placed just outside the 9:35 bar or the 50% level of the block.</li>
                <li>Benefit: Dramatically improves Reward-to-Risk (R:R) on high-volatility mornings.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function RuleRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-center border-b border-stone-100 dark:border-stone-800 pb-1">
      <span className="font-mono opacity-50">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
