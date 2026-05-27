import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SessionLab from './SessionLab';
import type { SessionState } from '../types';

function buildSession(): SessionState {
  return {
    date: '2026-05-26',
    dailyInstrument: 'MES',
    trades: [],
    accountEquity: 5000,
    riskPercent: 0.02,
    killSwitches: {
      losses: 0,
      fills: 0,
    },
    aiSettings: {
      customInstructions: '',
      temperature: 0.2,
      morningTimeZone: 'EST',
      lunchTimeZone: 'EST',
      ragEnabled: true,
    },
  };
}

describe('SessionLab shell', () => {
  it('renders the Trading Workflow shell with workflow components wired together', () => {
    const { container } = render(
      <SessionLab
        session={buildSession()}
        customRules={[]}
        onUpdate={vi.fn()}
        isActive={false}
      />
    );

    expect(screen.getByText('TRADING WORKFLOW')).toBeTruthy();

    for (const label of ['Screenshot staged', 'Analyze', 'Decision', 'Outcome/Proof', 'Journal/RAG']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }

    expect(screen.getAllByText('Morning / AM').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lunch / PM Review').length).toBeGreaterThan(0);
    expect(screen.getByText('Trade Date:')).toBeTruthy();
    expect(screen.getByText('Instrument:')).toBeTruthy();

    expect(screen.getByText('MORNING REVIEW')).toBeTruthy();
    expect(screen.getByText('LUNCH / PM REVIEW')).toBeTruthy();
    expect(screen.getByText(/5m Morning Execution/i)).toBeTruthy();
    expect(screen.getByText(/5M Lunch \/ PM Execution/i)).toBeTruthy();
    expect(screen.getAllByText('Status: Awaiting screenshot').length).toBeGreaterThanOrEqual(2);

    const details = container.querySelector('details');
    expect(screen.getByText('Advanced data/model controls')).toBeTruthy();
    expect(details?.open).toBe(false);

    fireEvent.click(screen.getByText('Advanced data/model controls'));
    expect(details?.open).toBe(true);
    expect(screen.getByText('Bridge Instrument')).toBeTruthy();
    expect(screen.getByText('Workflow Speed')).toBeTruthy();
    expect(screen.getByText('Extraction Provider')).toBeTruthy();
  });
});
