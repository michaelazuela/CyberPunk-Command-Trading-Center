import { useState } from 'react';
import { Activity, History, ShieldCheck } from 'lucide-react';
import type { ProposedRule, SessionState, Trade } from '../types';
import Analysis from './Analysis';
import LunchReversal from './LunchReversal';
import WorkflowModeToggle, { type WorkflowModeOption } from './workflow/WorkflowModeToggle';

type SessionLabMode = 'morning' | 'lunch';

const SESSION_LAB_MODES: Array<WorkflowModeOption<SessionLabMode>> = [
  {
    value: 'morning',
    label: 'Morning Analysis',
    description: 'Live 5M execution workflow with 15M ETH context into the morning decision pipeline.',
  },
  {
    value: 'lunch',
    label: 'Lunch Reversal',
    description: 'Live 5M lunch workflow for failed continuation, sweep, compression, and reversal planning.',
  },
];

export default function SessionLab({
  session,
  customRules = [],
  onUpdate,
  onAddTrade,
  isActive,
}: {
  session: SessionState;
  customRules?: ProposedRule[];
  onUpdate: (updates: Partial<SessionState>) => void;
  onAddTrade?: (trade: Omit<Trade, 'id' | 'timestamp'>) => void;
  isActive?: boolean;
}) {
  const [mode, setMode] = useState<SessionLabMode>('morning');

  return (
    <div className="flex flex-col gap-6 fade-in">
      <section className="card-base p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--txt3)]">Live Workflow</div>
            <h1 className="text-[20px] font-bold text-[var(--txt)] mt-1">Session Lab</h1>
            <p className="text-[12px] text-[var(--txt2)] mt-2 max-w-3xl">
              Morning and Lunch share the same workflow shell, but each mode keeps its own screenshots,
              analysis state, proof flow, trade confirmation, RAG save path, and rule configuration.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 font-mono text-[10px]">
            <div className="border border-[var(--b2)] bg-[var(--bg)] p-3">
              <Activity className="w-3 h-3 text-[var(--orange)] mb-2" />
              <div className="uppercase tracking-[0.16em] text-[var(--txt3)]">Mode</div>
              <div className="text-[var(--txt)] font-bold mt-1">{mode === 'morning' ? 'Morning' : 'Lunch'}</div>
            </div>
            <div className="border border-[var(--b2)] bg-[var(--bg)] p-3">
              <ShieldCheck className="w-3 h-3 text-[var(--green)] mb-2" />
              <div className="uppercase tracking-[0.16em] text-[var(--txt3)]">Decision</div>
              <div className="text-[var(--txt)] font-bold mt-1">App-Owned</div>
            </div>
            <div className="border border-[var(--b2)] bg-[var(--bg)] p-3">
              <History className="w-3 h-3 text-[var(--blue)] mb-2" />
              <div className="uppercase tracking-[0.16em] text-[var(--txt3)]">RAG</div>
              <div className="text-[var(--txt)] font-bold mt-1">Per Mode</div>
            </div>
          </div>
        </div>

        <WorkflowModeToggle value={mode} options={SESSION_LAB_MODES} onChange={setMode} />
      </section>

      <div className={mode === 'morning' ? 'block' : 'hidden'}>
        <Analysis
          session={session}
          customRules={customRules}
          onUpdate={onUpdate}
          onAddTrade={onAddTrade}
          isActive={Boolean(isActive && mode === 'morning')}
        />
      </div>

      <div className={mode === 'lunch' ? 'block' : 'hidden'}>
        <LunchReversal
          session={session}
          onUpdate={onUpdate}
          onAddTrade={onAddTrade}
          isActive={Boolean(isActive && mode === 'lunch')}
        />
      </div>
    </div>
  );
}
