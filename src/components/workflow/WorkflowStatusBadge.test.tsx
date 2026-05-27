import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import WorkflowStatusBadge, { type WorkflowStepTone } from './WorkflowStatusBadge';

describe('WorkflowStatusBadge', () => {
  it('renders label and value text', () => {
    render(<WorkflowStatusBadge label="Instrument:" value="MES" tone="complete" />);

    expect(screen.getByText('Instrument:')).toBeTruthy();
    expect(screen.getByText('MES')).toBeTruthy();
  });

  it('supports each workflow tone variant without crashing', () => {
    const tones: WorkflowStepTone[] = ['pending', 'ready', 'active', 'complete', 'blocked'];

    for (const tone of tones) {
      const { unmount } = render(<WorkflowStatusBadge label={`Tone ${tone}`} tone={tone} />);
      expect(screen.getByText(`Tone ${tone}`)).toBeTruthy();
      unmount();
    }
  });

  it('uses the default tone when none is supplied', () => {
    render(<WorkflowStatusBadge label="Morning / AM" />);

    expect(screen.getByText('Morning / AM')).toBeTruthy();
  });
});
