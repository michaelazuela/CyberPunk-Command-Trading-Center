import React from 'react';
import WorkflowStatusBadge, { type WorkflowStepTone } from './WorkflowStatusBadge';

export interface SessionContextChip {
  label: string;
  value?: string;
  tone?: WorkflowStepTone;
}

interface SessionContextChipsProps {
  chips: SessionContextChip[];
}

export default function SessionContextChips({ chips }: SessionContextChipsProps) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {chips.map(chip => (
        <React.Fragment key={`${chip.label}-${chip.value || ''}`}>
          <WorkflowStatusBadge label={chip.label} value={chip.value} tone={chip.tone} />
        </React.Fragment>
      ))}
    </div>
  );
}
