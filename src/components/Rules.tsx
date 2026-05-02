import React, { useState } from 'react';
import { ProposedRule, SessionState } from '../types';

export default function Rules({ customRules = [], onUpdateRule, onProposeRule }: { 
  customRules?: ProposedRule[],
  currentSession?: SessionState,
  onUpdateRule: (id: string, status: ProposedRule['status']) => void,
  onProposeRule: (rule: ProposedRule) => void
}) {
  return (
    <div className="space-y-6 fade-up">
      <header className="page-header">
        <div>
          <h1>System Rules</h1>
          <p>NON-NEGOTIABLE CORE ARCHITECTURE</p>
        </div>
      </header>

      {/* 2-col grid layout of "Rule Blocks" */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* The 61.8% Golden Ratio */}
        <div className="card-base flex flex-col">
          <div className="card-header border-none">
            <span>Order Block (Risk Mitigation)</span>
          </div>
          <div className="rule-block">
            <div className="rule-title">The 61.8% Golden Ratio</div>
            <div className="rule-body text-[8px] sm:text-[9px]">
               Used when the stop distance to the 9:30 extreme is &gt; 15 points. Instead of chasing, we wait for a deeper discount.
            </div>
          </div>
          <div className="p-4 bg-[var(--b0)] border border-[var(--b1)] mt-4 flex-1">
             <span className="font-mono text-[10px] font-bold block mb-2 text-[var(--txt)]">Execution Rules:</span>
             <ul className="list-disc pl-4 space-y-2 text-[9px] text-[var(--txt2)] border-l-2 border-[var(--b2)] ml-1">
               <li className="pl-2">Entry: Limit order at the 61.8% retracement of the 9:30-9:35 range.</li>
               <li className="pl-2">Stop: Placed just outside the 9:35 bar or the 50% level of the block.</li>
               <li className="pl-2">Benefit: Dramatically improves Reward-to-Risk (R:R) on high-volatility mornings.</li>
             </ul>
          </div>
        </div>

        {/* Opening Order Block */}
        <div className="card-base flex flex-col">
          <div className="card-header border-none">
            <span>Confirmation Bar</span>
          </div>
          <div className="rule-block">
            <div className="rule-title">Opening Order Block</div>
            <div className="rule-body text-[8px] sm:text-[9px]">
               Triggered when risk to 9:30 extreme is &gt; 15 pts.
            </div>
          </div>
          <div className="p-4 bg-[var(--b0)] border border-[var(--b1)] mt-4 flex-1">
             <ul className="list-disc pl-4 space-y-2 text-[9px] text-[var(--txt2)] border-l-2 border-[var(--b2)] ml-1">
               <li className="pl-2">Range: 9:30 - 9:35 combined high/low</li>
               <li className="pl-2">Entry: 61.8% retracement (Golden Ratio)</li>
               <li className="pl-2">Stop: Just outside the block extreme</li>
             </ul>
          </div>
        </div>

        {/* Momentum Entry */}
        <div className="card-base flex flex-col">
          <div className="card-header border-none">
            <span>Trend Exhaustion & Continuity</span>
          </div>
          <div className="rule-block">
             <div className="rule-title">Momentum Entry (Runaway)</div>
             <div className="rule-body text-[8px] sm:text-[9px]">
                Valid when observing 3+ bars with minimal overlap.
             </div>
          </div>
          <div className="p-4 bg-[var(--b0)] border border-[var(--b1)] mt-4 flex-1">
             <ul className="list-disc pl-4 space-y-2 text-[9px] text-[var(--txt2)] border-l-2 border-[var(--b2)] ml-1">
               <li className="pl-2">Entry: On break of prior candle low/high</li>
               <li className="pl-2">Stop: At prior candle high/low</li>
             </ul>
          </div>
        </div>

        {/* The Liquidity Sweep */}
        <div className="card-base flex flex-col">
          <div className="card-header border-none">
            <span>Trap Mechanics</span>
          </div>
          <div className="rule-block">
            <div className="rule-title">The Liquidity Sweep</div>
            <div className="rule-body text-[8px] sm:text-[9px]">
               Price breaches the 9:30 extreme (High or Low) with a wick only. This "traps" breakout traders and hits stops.
            </div>
          </div>
          <div className="p-4 bg-[var(--b0)] border border-[var(--b1)] mt-4 flex-1">
             <span className="font-mono text-[10px] font-bold block mb-2 text-[var(--txt)]">Sweep & Reclaim Mechanics:</span>
             <ul className="list-disc pl-4 space-y-2 text-[9px] text-[var(--txt2)] border-l-2 border-[var(--b2)] ml-1">
               <li className="pl-2">Price must close back inside the 9:30 range within 2 bars.</li>
               <li className="pl-2">High Conviction: A 5-minute candle closes above/below the 9:30 extreme after the sweep.</li>
               <li className="pl-2">Late Morning (10:45-11:00): A sweep of a local low followed by a close near the 9:30 open is a "Lunch Reversal" signal.</li>
             </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
