import React from 'react';
import { cn } from '../../lib/utils';

export type WorkflowStepTone = 'pending' | 'ready' | 'active' | 'complete' | 'blocked';

export const WORKFLOW_STEP_TONE_CLASSES: Record<WorkflowStepTone, string> = {
  pending: 'border-[var(--b2)] bg-[var(--bg)] text-[var(--txt3)]',
  ready: 'border-[var(--orange)]/30 bg-[var(--orange)]/10 text-[var(--orange)]',
  active: 'border-[var(--blue)]/30 bg-[var(--blue)]/10 text-[var(--blue)]',
  complete: 'border-[var(--green)]/30 bg-[var(--green)]/10 text-[var(--green)]',
  blocked: 'border-[var(--red)]/30 bg-[var(--red)]/10 text-[var(--red)]',
};

interface WorkflowStatusBadgeProps {
  label: string;
  value?: string;
  tone?: WorkflowStepTone;
}

export default function WorkflowStatusBadge({ label, value, tone = 'pending' }: WorkflowStatusBadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em]', WORKFLOW_STEP_TONE_CLASSES[tone])}>
      <span className="text-[var(--txt3)]">{label}</span>
      {value && <span className="font-bold text-[var(--txt)]">{value}</span>}
    </span>
  );
}
