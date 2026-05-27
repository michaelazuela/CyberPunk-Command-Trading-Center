import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import TradeProofPanel from './TradeProofPanel';

function renderProofPanel(overrides: Partial<ComponentProps<typeof TradeProofPanel>> = {}) {
  const props: ComponentProps<typeof TradeProofPanel> = {
    manualOutcome: 'SUCCESS',
    executionQuantity: 1,
    onSaveTrade: vi.fn().mockResolvedValue(undefined),
    onCancel: vi.fn(),
    modelConfig: {},
    dailyInstrument: 'MES',
    tradePlan: {
      direction: 'LONG',
      decision: 'WAIT',
      decisionLabel: 'Wait / No Trade',
      setupName: 'Fixture Setup',
      entry: 5320,
      stop: 5316,
      t1: 5326,
      t2: 5328,
      riskPoints: 4,
      canExecute: false,
      notes: [],
    } as any,
    ...overrides,
  };

  render(<TradeProofPanel {...props} />);
  return props;
}

describe('TradeProofPanel', () => {
  it('renders the proof evidence prompt with journal wording', () => {
    renderProofPanel();

    expect(screen.getByText('Trade Proof Review')).toBeTruthy();
    expect(screen.getByText(/Optional evidence for the journal/i)).toBeTruthy();
    expect(screen.queryByText(/Replay Lab/i)).toBeNull();
    expect(screen.getByText('Required Evidence')).toBeTruthy();
    expect(screen.getByText('Best Screenshot')).toBeTruthy();
    expect(screen.getByText('RAG Use')).toBeTruthy();
  });

  it('renders upload, paste, skip, and cancel controls', () => {
    renderProofPanel();

    expect(screen.getByText('Click proof box, then Ctrl+V')).toBeTruthy();
    expect(screen.getByText('Choose Screenshot')).toBeTruthy();
    expect(screen.getByText('Paste Screenshot')).toBeTruthy();
    expect(screen.getByText('Skip - No Proof')).toBeTruthy();
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('calls cancel without touching proof persistence', () => {
    const onCancel = vi.fn();
    renderProofPanel({ onCancel });

    fireEvent.click(screen.getByText('Cancel'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls save callback when proof is skipped', async () => {
    const onSaveTrade = vi.fn().mockResolvedValue(undefined);
    renderProofPanel({ manualOutcome: 'FAILED', onSaveTrade });

    fireEvent.click(screen.getByText('Skip - No Proof'));

    await waitFor(() => {
      expect(onSaveTrade).toHaveBeenCalledWith('FAILED');
    });
  });

  it('renders trade plan context when provided', () => {
    renderProofPanel();

    expect(screen.getByText('Instrument')).toBeTruthy();
    expect(screen.getByText('Entry')).toBeTruthy();
    expect(screen.getByText('Stop')).toBeTruthy();
    expect(screen.getByText('T1')).toBeTruthy();
    expect(screen.getByText('T2')).toBeTruthy();
    expect(screen.getByText('5320')).toBeTruthy();
    expect(screen.getByText('5316')).toBeTruthy();
  });
});
