import React from 'react';
import { cn } from '../../lib/utils';
import { WORKFLOW_STEP_TONE_CLASSES, type WorkflowStepTone } from './WorkflowStatusBadge';

export interface WorkflowStep {
  label: string;
  value: string;
  tone: WorkflowStepTone;
}

interface WorkflowStatusStripProps {
  title: string;
  steps: WorkflowStep[];
}

export default function WorkflowStatusStrip({ title, steps }: WorkflowStatusStripProps) {
  return (
    <div className="border border-[var(--b1)] bg-[var(--bg)] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--txt)]">{title}</div>
      </div>
      <div className="flex flex-wrap items-stretch gap-2">
        {steps.map((step, index) => (
          <React.Fragment key={step.label}>
            <div className={cn('min-w-[132px] flex-1 border px-2.5 py-2 font-mono', WORKFLOW_STEP_TONE_CLASSES[step.tone])}>
              <div className="text-[9px] uppercase tracking-[0.14em] opacity-80">{step.label}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em]">{step.value}</div>
            </div>
            {index < steps.length - 1 && (
              <div className="hidden items-center text-[var(--txt3)] lg:flex">-&gt;</div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
