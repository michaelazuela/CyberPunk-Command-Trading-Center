import React from 'react';
import { AnalysisResult } from '../types';
import { Moon, ShieldAlert, Activity, CheckCircle2, AlertTriangle, XCircle, BarChart2 } from 'lucide-react';
import { cn } from '../lib/utils';

export default function MidnightAnalysisView({ analysis }: { analysis: AnalysisResult['midnightAnalysis'] }) {
  if (!analysis) return null;

  const roleColors = {
    SUPPORT: 'text-green-400 bg-green-400/10',
    RESISTANCE: 'text-red-400 bg-red-400/10',
    NEUTRAL: 'text-gray-400 bg-gray-400/10'
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Stat */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[var(--s1)] border border-[var(--b1)] p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Moon className="w-4 h-4 text-accent" />
            <span className="text-xs font-mono text-gray-500 uppercase">Midnight Level</span>
          </div>
          <p className="text-xl font-mono text-white">{analysis.level.toFixed(2)}</p>
          <p className="text-[10px] font-mono text-gray-500 mt-1">
            Band: {analysis.band[0].toFixed(2)} - {analysis.band[1].toFixed(2)}
          </p>
        </div>

        <div className="bg-[var(--s1)] border border-[var(--b1)] p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-accent" />
            <span className="text-xs font-mono text-gray-500 uppercase">Session Role</span>
          </div>
          <div className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase", roleColors[analysis.role])}>
            {analysis.role}
          </div>
          <p className="text-[10px] font-mono text-gray-500 mt-1">Classification based on RTH price action</p>
        </div>

        <div className="bg-[var(--s1)] border border-[var(--b1)] p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-4 h-4 text-[var(--accent)]" />
            <span className="text-xs font-mono text-gray-500 uppercase">Wick Filter Veto</span>
          </div>
          <div className="flex items-center gap-2">
            <p className={cn("text-xl font-mono", analysis.wickVetoCandidate ? 'text-red-400' : 'text-green-400')}>
              {analysis.wickVetoCandidate ? 'TRIGGERED' : 'CLEAR'}
            </p>
            <span className="text-[10px] font-mono text-gray-500">({analysis.vetoCount} rejections)</span>
          </div>
          <p className="text-[10px] font-mono text-gray-500 mt-1">
            {analysis.wickVetoCandidate ? '3+ wicks rejected the band without closing beyond.' : 'No rejection cluster detected.'}
          </p>
        </div>
      </div>

      {/* Logic Breakdown */}
      <div className="bg-black border border-[var(--b1)] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[var(--b1)] bg-[var(--s1)] flex items-center justify-between">
          <h3 className="text-sm font-mono uppercase tracking-widest italic flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-accent" />
            Midnight Interaction Log
          </h3>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {analysis.interactions.map((interaction, i) => (
              <div key={i} className="flex items-center gap-4 py-2 border-b border-white/5 last:border-0">
                <span className="text-[10px] font-mono text-gray-500 w-16">{interaction.timestamp}</span>
                <span className="text-[10px] font-mono text-gray-400 uppercase w-20">{interaction.session}</span>
                <span className={cn(
                  "text-[10px] font-bold uppercase px-2 py-0.5 rounded",
                  interaction.type === 'WICK_REJECTION' ? 'bg-orange-500/10 text-orange-500' :
                  interaction.type === 'CLOSE_BEYOND' ? 'bg-red-500/10 text-red-500' : 'bg-[var(--accent)]/10 text-[var(--accent)]'
                )}>
                  {interaction.type.replace('_', ' ')}
                </span>
                <span className="text-[10px] font-mono text-gray-300 ml-auto">{interaction.price.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-accent/5 border border-accent/20 rounded-lg">
            <p className="text-xs text-gray-400 italic leading-relaxed">
              {analysis.justification}
            </p>
          </div>
        </div>
      </div>

      {/* Proposals Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-mono uppercase tracking-widest italic">Adoption Evaluation</h3>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {analysis.proposals.map((proposal) => (
            <div key={proposal.option} className={cn(
              "p-5 rounded-xl border transition-all duration-300",
              proposal.recommendation.includes('RECOMMENDED') 
                ? 'bg-accent/10 border-accent shadow-[0_0_20px_rgba(var(--accent-rgb),0.1)]' 
                : 'bg-[var(--s1)] border-[var(--b1)] opacity-80 hover:opacity-100'
            )}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-bold font-mono text-accent">Option {proposal.option}</span>
                {proposal.option === 'B' ? (
                  <span className="text-[10px] font-mono font-bold bg-green-600 text-white px-2 py-0.5 rounded uppercase flex items-center gap-1 shadow-[0_0_10px_rgba(22,163,74,0.4)]">
                    <ShieldAlert className="w-3 h-3" />
                    Active Playbook Rule
                  </span>
                ) : (
                  proposal.recommendation.includes('RECOMMENDED') && (
                    <span className="text-[10px] font-mono font-bold bg-accent text-white px-2 py-0.5 rounded uppercase">
                      SYSTEM CHOICE
                    </span>
                  )
                )}
              </div>
              
              <h4 className="text-sm font-bold text-white mb-2">{proposal.title}</h4>
              <p className="text-xs text-gray-400 mb-4 leading-relaxed">{proposal.description}</p>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    <span className="text-[10px] font-mono uppercase text-gray-400">Pros</span>
                  </div>
                  <ul className="space-y-1">
                    {proposal.pros.map((pro, i) => (
                      <li key={i} className="text-[10px] text-gray-500 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-green-500">
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-3 h-3 text-red-500" />
                    <span className="text-[10px] font-mono uppercase text-gray-400">Cons</span>
                  </div>
                  <ul className="space-y-1">
                    {proposal.cons.map((con, i) => (
                      <li key={i} className="text-[10px] text-gray-500 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-red-500">
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5">
                <p className="text-[10px] text-gray-400 italic leading-relaxed">
                  {proposal.recommendation}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
