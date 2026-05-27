import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import WorkflowStatusStrip, { type WorkflowStep } from './WorkflowStatusStrip';

const STEPS: WorkflowStep[] = [
  { label: 'Screenshot staged', value: 'Staged', tone: 'complete' },
  { label: 'Analyze', value: 'Ready to analyze', tone: 'ready' },
  { label: 'Decision', value: 'Awaiting decision', tone: 'pending' },
  { label: 'Outcome/Proof', value: 'Not started', tone: 'pending' },
  { label: 'Journal/RAG', value: 'Pending', tone: 'active' },
];

describe('WorkflowStatusStrip', () => {
  it('renders all workflow steps and status labels', () => {
    render(<WorkflowStatusStrip title="Morning / AM" steps={STEPS} />);

    expect(screen.getByText('Morning / AM')).toBeTruthy();
    for (const step of STEPS) {
      expect(screen.getByText(step.label)).toBeTruthy();
      expect(screen.getByText(step.value)).toBeTruthy();
    }
  });
});
