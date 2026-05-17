import React, { useState } from 'react';
import { ProposedRule, SessionState } from '../types';
import { cn } from '../lib/utils';
import { AlertCircle } from 'lucide-react';

type Setup = {
  id: string;
  category: string;
  headline: string;
  shortExplanation: string;
  conditions: string[];
  entryRules: string[];
  stop: string;
  target: string;
  window: "MORNING" | "LUNCH" | "BOTH";
  timeframe: "5-min primary" | "1-min refinement" | "Both";
  invalidation: string;
  confluence: string;
  extension?: {
    category: string; // The concept name from gap analysis
    headline: string;
    details: string;
  };
  rank: number;
  frequency: "High" | "Medium" | "Low";
  clarity: "High" | "Medium" | "Low";
  avgRR: string;
};

const SYSTEM_RULES: Setup[] = [
  {
    id: 'setup-1',
    category: 'Order Block',
    headline: 'The 61.8% Golden Ratio',
    shortExplanation: 'Used when the 9:30 impulse is extended. Instead of chasing, we wait for a deeper discount and a clean fixed-risk trigger.',
    conditions: ['Extended opening impulse', 'Clear impulse leg established', 'A 5-point fixed-risk trigger can be defined'],
    entryRules: ['Limit order at the 61.8% retracement of the 9:30-9:35 range impulse'],
    stop: 'Just outside the 9:35 bar or the block\'s 50% level',
    target: 'Next major liquidity pool or new high/low of day',
    window: 'MORNING',
    timeframe: '5-min primary',
    invalidation: 'Close beyond the origin of the impulse.',
    confluence: 'Lines up with structural S/R.',
    extension: {
      category: 'Premium / Discount Zones',
      headline: 'Equilibrium Modeling',
      details: 'Extension incorporates 50% equilibrium model across session range, overnight range, prior day range, and 9:30-9:35 opening range to establish strictly Premium or Discount pricing areas.'
    },
    rank: 1,
    frequency: 'High',
    clarity: 'High',
    avgRR: '1:3+'
  },
  {
    id: 'setup-2',
    category: 'Confirmation Bar',
    headline: 'Opening Order Block',
    shortExplanation: 'Triggered at the 9:30-9:35 block extremes when confirmation allows a fixed 5-point risk model.',
    conditions: ['Test of the 9:30-9:35 range extremes'],
    entryRules: ['Wait for a confirmation bar exactly at the 9:30-9:35 block extreme'],
    stop: 'Just outside the block extreme',
    target: 'Opposite side of opening range expansion',
    window: 'MORNING',
    timeframe: '5-min primary',
    invalidation: 'Solid 5-min close completely through the opening block.',
    confluence: 'Rejection wicks confirm lack of penetration.',
    rank: 6,
    frequency: 'Medium',
    clarity: 'High',
    avgRR: '1:2'
  },
  {
    id: 'setup-3',
    category: 'Trend Exhaustion',
    headline: 'Momentum Entry (Runaway)',
    shortExplanation: 'Valid when observing 3+ bars with minimal overlap. Continuation model.',
    conditions: ['3+ consecutive strong directional bars', 'Minimal wick overlap between bars'],
    entryRules: ['Enter on the micro-pullback break of prior candle low/high'],
    stop: 'At prior candle high/low',
    target: 'Macro liquidity target',
    window: 'BOTH',
    timeframe: 'Both',
    invalidation: 'Deep engulfing close strongly against the momentum.',
    confluence: 'Macro trend alignment.',
    rank: 3,
    frequency: 'High',
    clarity: 'Medium',
    avgRR: '1:1.5'
  },
  {
    id: 'setup-4',
    category: 'Trap Mechanics',
    headline: 'The Liquidity Sweep',
    shortExplanation: 'Price breaches the 9:30 extreme (High or Low) with a wick only, trapping breakout traders.',
    conditions: ['Price sweeps a major high/low extreme', 'Closes back inside within 2 bars'],
    entryRules: ['Enter when price reclaims the broken level'],
    stop: 'Just outside the sweep wick',
    target: 'Opposite side of the structural range',
    window: 'BOTH',
    timeframe: '5-min primary',
    invalidation: 'A 5-min candle closes convincingly above/below the extreme after the sweep.',
    confluence: 'Late morning sweeps strongly signal Lunch Reversals.',
    rank: 2,
    frequency: 'High',
    clarity: 'High',
    avgRR: '1:3'
  },
  {
    id: 'setup-5',
    category: 'Imbalance',
    headline: 'Fair Value Gap (FVG)',
    shortExplanation: 'A 3-candle sequence where the wicks of candle 1 and 3 do not overlap. Price gravitates to rebalance the inefficiency.',
    conditions: ['Clear displacement leaving an FVG gap', 'First presented FVG after 9:30 open is strongest'],
    entryRules: ['Enter when price retraces into the FVG'],
    stop: 'Below/above the FVG extreme or structural swing',
    target: 'Next opposing liquidity pool',
    window: 'BOTH',
    timeframe: 'Both',
    invalidation: 'Body closure completely through/beyond the FVG (becomes inversion FVG).',
    confluence: 'FVG aligns perfectly with prior structure or equilibrium midpoint.',
    rank: 4,
    frequency: 'High',
    clarity: 'High',
    avgRR: '1:2.5'
  },
  {
    id: 'setup-6',
    category: 'Structure',
    headline: 'Market Structure Shift (MSS) / ChoCH',
    shortExplanation: 'ChoCH is the first minor pivot break. MSS is a confirmed candle close beyond a major swing point.',
    conditions: ['Prior clear trend exists', 'Price breaks a structural pivot (wick for ChoCH, body for MSS)'],
    entryRules: ['Wait for the shift, then enter on the subsequent pullback to an FVG or Order Block'],
    stop: 'Beyond the newly formed swing extreme',
    target: 'Opposing structural liquidity',
    window: 'BOTH',
    timeframe: 'Both',
    invalidation: 'Failure to hold the newly formed structural leg (immediate V-shape reversal).',
    confluence: 'Occurs immediately after a liquidity sweep.',
    rank: 5,
    frequency: 'Medium',
    clarity: 'Medium',
    avgRR: '1:3'
  },
  {
    id: 'setup-7',
    category: 'Liquidity Pools',
    headline: 'Equal Highs / Equal Lows (EQH/EQL)',
    shortExplanation: 'Retail views double tops/bottoms as resistance/support. We view them as buy-side/sell-side liquidity magnets.',
    conditions: ['Two or more relatively equal highs/lows formed in the session'],
    entryRules: ['Target them for take-profits, OR enter a reversal after they are cleanly swept and reclaimed'],
    stop: 'Above/below the sweep wick',
    target: 'Opposite session liquidity pool',
    window: 'BOTH',
    timeframe: '5-min primary',
    invalidation: 'Price consolidates beyond the EQH/EQL instead of immediately rejecting it.',
    confluence: 'Aligns closely with Time-Based Algo Kill Zones.',
    rank: 7,
    frequency: 'Medium',
    clarity: 'High',
    avgRR: '1:4'
  },
  {
    id: 'setup-8',
    category: 'Mitigation & Structure',
    headline: 'Breaker Block',
    shortExplanation: 'A violated order block (failed S/R) that flips to act as support/resistance after strong displacement.',
    conditions: ['Price forcefully breaks through an established order block', 'Displacement leaves an FVG in its wake'],
    entryRules: ['Enter on the first return/test back to the violated order block'],
    stop: 'Below/above the breaker block\'s midpoint',
    target: 'Next major structural swing',
    window: 'BOTH',
    timeframe: 'Both',
    invalidation: 'Close fully back through the breaker block.',
    confluence: 'Aligns with an FVG in the same price zone.',
    rank: 12,
    frequency: 'Low',
    clarity: 'Medium',
    avgRR: '1:2'
  },
  {
    id: 'setup-9',
    category: 'Macro Liquidity',
    headline: 'Previous Day High / Low Sweeps',
    shortExplanation: 'Price attacks the prior day high or low seeking deep historical liquidity, then forcefully reverses.',
    conditions: ['Price approaches PDH or PDL', 'A sweep occurs (wick breaches level)'],
    entryRules: ['Enter on the reclaim: candle closes back inside the PDH/PDL level'],
    stop: 'Beyond the sweep candle\'s physical wick',
    target: 'Equilibrium (50%) of the prior day\'s range',
    window: 'MORNING',
    timeframe: '5-min primary',
    invalidation: 'A full 5-min candle body closes and holds continuously outside the PDH/PDL.',
    confluence: 'Happens frequently inside the first 30 minutes of the RTH open.',
    rank: 9,
    frequency: 'Medium',
    clarity: 'High',
    avgRR: '1:3'
  },
  {
    id: 'setup-10',
    category: 'Volatility Expansion',
    headline: 'Consolidation Compression Breakout',
    shortExplanation: '3+ tight ranging inside-bars create a spring/coil effect, leading to explosive range expansion.',
    conditions: ['3+ tight ranging bars', 'Clear build-up of inside structure (no directional momentum yet)'],
    entryRules: ['Enter on the breakout of the outer boundary of the compression zone'],
    stop: 'Below/above the compression block extreme',
    target: '1:2 RR or next immediate structure pool',
    window: 'MORNING',
    timeframe: '1-min refinement',
    invalidation: 'False breakout immediately re-enters and closes inside the compression block.',
    confluence: 'Usually precedes macroeconomic data drops or occurs just after session open resets.',
    rank: 10,
    frequency: 'Medium',
    clarity: 'Medium',
    avgRR: '1:2'
  },
  {
    id: 'setup-11',
    category: 'Session Structure',
    headline: 'Initial Balance (IB) Extension',
    shortExplanation: 'Trading the breakout/retest of the first 30 minutes of regular trading hours, or fading its false breaks.',
    conditions: ['9:30-10:00 AM ET high and low are fully established'],
    entryRules: ['Enter on IB high/low break and retest, OR fade an IB false breakout'],
    stop: 'Back inside the IB (for breakout) or outside the false break wick (for fade)',
    target: 'IB Extension algorithmic levels (1.5x / 2.0x)',
    window: 'MORNING',
    timeframe: '5-min primary',
    invalidation: 'Breakout fails to hold the retest and bleeds back into the range.',
    confluence: 'Correlates directly with Opening Gap Fill strategies.',
    rank: 8,
    frequency: 'Medium',
    clarity: 'High',
    avgRR: '1:2.5'
  },
  {
    id: 'setup-12',
    category: 'Opening Range',
    headline: 'Opening Gap Fill',
    shortExplanation: 'Trading the gap between RTH open and prior day close. Anticipating a fill or a violent "gap and go".',
    conditions: ['Visible gap between today\'s open and yesterday\'s close'],
    entryRules: ['Fade the open toward the gap fill if weakness shows, or enter continuation if gap fails to fill quickly'],
    stop: 'Outside the opening 5-min candle extreme',
    target: 'Prior day close (the gap fill level)',
    window: 'MORNING',
    timeframe: '5-min primary',
    invalidation: 'Trend forms immediately away from the gap with no pullback ("Gap and Go").',
    confluence: 'Often sweeps PDH/PDL in the process of setting the trap.',
    rank: 11,
    frequency: 'Medium',
    clarity: 'Medium',
    avgRR: '1:1.5'
  },
  {
    id: 'setup-13',
    category: 'Time Mechanics',
    headline: 'Algo Kill Zones',
    shortExplanation: 'Specific time windows where algorithmic liquidity sweeps and reversals reliably occur.',
    conditions: ['Time hits specific liquidity periods (e.g. 9:50-10:10, 11:50-12:10)'],
    entryRules: ['Wait for a sweep into a liquidity pool exactly during the window, enter the reversal'],
    stop: 'Outside the sweep execution extreme',
    target: 'Session equilibrium (50%) or opposing liquidity',
    window: 'BOTH',
    timeframe: '1-min refinement',
    invalidation: 'Trend behavior ignores the time window entirely.',
    confluence: 'Pairs exclusively with EQH/EQL or established FVG sweeps.',
    rank: 13,
    frequency: 'High',
    clarity: 'High',
    avgRR: '1:3'
  },
  {
    id: 'setup-14',
    category: 'Mitigation & Structure',
    headline: 'Mitigation Block',
    shortExplanation: 'A lower high/higher low that failed to take liquidity before breaking structure. Price returns later to mitigate.',
    conditions: ['Price fails to sweep a high/low, then reverses and breaks local structure'],
    entryRules: ['Enter when price returns to the specific candle that caused the structural break'],
    stop: 'Beyond the mitigation block extreme',
    target: 'Recent structural low/high that was established',
    window: 'BOTH',
    timeframe: 'Both',
    invalidation: 'Close completely through the mitigation block.',
    confluence: 'Usually forms inside a larger timeframe macro FVG.',
    rank: 14,
    frequency: 'Low',
    clarity: 'Medium',
    avgRR: '1:2'
  }
];

export default function Rules({ customRules = [], onUpdateRule, onProposeRule }: { 
  customRules?: ProposedRule[],
  currentSession?: SessionState,
  onUpdateRule: (id: string, status: ProposedRule['status']) => void,
  onProposeRule: (rule: ProposedRule) => void
}) {
  return (
    <div className="space-y-6 fade-up">
      <header className="page-header border-b border-[var(--b0)] pb-4">
        <div>
          <h1>System Rules</h1>
          <p>PURE PRICE ACTION / SMC CORE ARCHITECTURE</p>
        </div>
      </header>

      {/* Midnight Open Reference Notice */}
      <div className="bg-[var(--cyan)]/10 border border-[var(--cyan)]/30 text-[var(--cyan)] p-4 rounded text-[11px] font-mono flex items-start gap-3 mb-6">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          <strong>Midnight Open (12:00 AM ET) — Primary ICT Daily Bias Anchor</strong>
          <p className="mt-1 opacity-80">
            ES: 58% retrace prob (above) / 69% (below). Best day: Thursday.<br/>
            NQ: 57% retrace prob (above) / 63% (below). Tuesday: up to 73% (below).<br/>
            Draw as a horizontal line on NinjaTrader chart before screenshotting.
          </p>
        </div>
      </div>

      {/* SMT Divergence Omission Notice */}
      <div className="bg-[var(--cyan)]/10 border border-[var(--cyan)]/30 text-[var(--cyan)] p-4 rounded text-[11px] font-mono flex items-start gap-3">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          <strong>OMITTED: SMT Divergence</strong>
          <p className="mt-1 opacity-80">
            SMT Divergence (ES vs NQ analysis) is officially omitted from the core ruleset. The codebase and screenshot flow currently evaluate a single instrument per analysis lifecycle. SMT requires simultaneous ES/NQ tick-level evaluation.
          </p>
        </div>
      </div>

      {/* Grid of Setups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {SYSTEM_RULES.sort((a,b) => a.rank - b.rank).map((setup) => (
          <div key={setup.id} className="card-base flex flex-col p-0 overflow-hidden">
            <div className="card-header border-b border-[var(--b1)] p-4 flex justify-between items-center bg-[var(--b0)]/50">
              <span className="font-mono text-[11px] text-[var(--txt2)]">{setup.category}</span>
              <div className="flex gap-2">
                {setup.window === 'MORNING' && <span className="qd-badge bg-[var(--cyan)]/20 text-[var(--cyan)] border-[var(--cyan)]/30">MORNING</span>}
                {setup.window === 'LUNCH' && <span className="qd-badge bg-[var(--amber)]/20 text-[var(--amber)] border-[var(--amber)]/30">LUNCH</span>}
                {setup.window === 'BOTH' && <span className="qd-badge bg-[var(--green)]/20 text-[var(--green)] border-[var(--green)]/30">BOTH</span>}
              </div>
            </div>
            
            <div className="p-4 flex-1 flex flex-col">
              <div className="mb-4">
                <div className="text-[var(--orange)] font-bold text-[14px] mb-1">{setup.headline}</div>
                <div className="text-[11px] text-[var(--txt2)]">{setup.shortExplanation}</div>
              </div>

              <div className="space-y-3 text-[10px] bg-[var(--b0)]/30 p-3 rounded border border-[var(--b1)] flex-1">
                <div>
                  <strong className="text-[var(--txt1)] block mb-1">Conditions:</strong>
                  <ul className="list-disc pl-4 text-[var(--txt3)] space-y-0.5">
                    {setup.conditions.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
                <div>
                  <strong className="text-[var(--txt1)] block mb-1">Entry:</strong>
                  <ul className="list-disc pl-4 text-[var(--txt3)] space-y-0.5">
                    {setup.entryRules.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[var(--b1)]">
                   <div>
                     <strong className="text-[var(--txt1)] block mb-0.5">Stop:</strong>
                     <span className="text-[var(--txt3)]">{setup.stop}</span>
                   </div>
                   <div>
                     <strong className="text-[var(--txt1)] block mb-0.5">Target:</strong>
                     <span className="text-[var(--txt3)]">{setup.target}</span>
                   </div>
                </div>
              </div>

              {setup.extension && (
                <div className="mt-4 p-3 border-l-2 border-[var(--orange)] bg-[var(--orange)]/5">
                  <div className="text-[10px] font-bold text-[var(--orange)] uppercase mb-1">EXTENSION: {setup.extension.category}</div>
                  <div className="text-[11px] text-[var(--txt1)] font-bold">{setup.extension.headline}</div>
                  <div className="text-[10px] text-[var(--txt2)] mt-1">{setup.extension.details}</div>
                </div>
              )}
              
              <div className="mt-4 flex flex-wrap gap-2 text-[9px] font-mono text-[var(--txt3)]">
                 <span className="border border-[var(--b2)] px-1.5 py-0.5 rounded bg-[var(--b0)]">TF: {setup.timeframe}</span>
                 <span className="border border-[var(--b2)] px-1.5 py-0.5 rounded bg-[var(--b0)]">Risk: {setup.invalidation}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Master Ranking Table */}
      <div className="card-base mt-8 overflow-x-auto">
        <div className="card-header border-b border-[var(--b1)] pb-3 mb-2">
          <span>Master Strategy Ranking Table</span>
        </div>
        <table className="w-full text-left min-w-[700px]">
          <thead>
            <tr className="border-b border-[var(--b1)] text-[10px] uppercase text-[var(--txt2)] bg-[var(--b0)]/50">
              <th className="p-3 font-medium">Rank</th>
              <th className="p-3 font-medium">Category</th>
              <th className="p-3 font-medium">Setup Name</th>
              <th className="p-3 font-medium text-center">Window</th>
              <th className="p-3 font-medium text-center">Frequency</th>
              <th className="p-3 font-medium text-center">Avg R:R</th>
              <th className="p-3 font-medium text-center">Clarity</th>
            </tr>
          </thead>
          <tbody>
            {SYSTEM_RULES.sort((a,b) => a.rank - b.rank).map((setup) => (
              <tr key={setup.id} className="border-b border-[var(--b0)]/50 hover:bg-[var(--b0)]/60 text-[11px] font-mono text-[var(--txt1)] transition-colors">
                <td className="p-3 text-[var(--orange)] font-bold text-[12px]">#{setup.rank}</td>
                <td className="p-3 text-[var(--txt2)]">{setup.category}</td>
                <td className="p-3 font-bold">{setup.headline}</td>
                <td className="p-3 text-center">
                   {setup.window === 'MORNING' && <span className="qd-badge bg-[var(--cyan)]/20 text-[var(--cyan)] border-[var(--cyan)]/30">MORNING</span>}
                   {setup.window === 'LUNCH' && <span className="qd-badge bg-[var(--amber)]/20 text-[var(--amber)] border-[var(--amber)]/30">LUNCH</span>}
                   {setup.window === 'BOTH' && <span className="qd-badge bg-[var(--green)]/20 text-[var(--green)] border-[var(--green)]/30">BOTH</span>}
                </td>
                <td className="p-3 text-center">
                   <span className={cn(
                     "px-2 py-0.5 rounded-full text-[9px]",
                     setup.frequency === 'High' ? "text-[var(--green)]" : setup.frequency === 'Medium' ? "text-[var(--cyan)]" : "text-[var(--txt3)]"
                   )}>{setup.frequency}</span>
                </td>
                <td className="p-3 text-center">{setup.avgRR}</td>
                <td className="p-3 text-center">
                   <span className={cn(
                     "px-2 py-0.5 rounded-full text-[9px]",
                     setup.clarity === 'High' ? "text-[var(--green)]" : setup.clarity === 'Medium' ? "text-[var(--amber)]" : "text-[var(--red)]"
                   )}>{setup.clarity}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
