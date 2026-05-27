import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TradeConfirmationPanel, { type WorkflowOutcomeOption } from './TradeConfirmationPanel';

type Outcome = 'win' | 'loss' | 'scratch' | 'no_trade' | 'missed_trade';

const OPTIONS: Array<WorkflowOutcomeOption<Outcome>> = [
  { value: 'win', label: 'Win', hint: 'T1/T2 reached', className: 'win-class' },
  { value: 'loss', label: 'Loss', hint: 'Stop hit', className: 'loss-class' },
  { value: 'scratch', label: 'Scratch', hint: 'Break even', className: 'scratch-class' },
  { value: 'no_trade', label: 'No Trade', hint: 'No valid entry', className: 'no-trade-class' },
  { value: 'missed_trade', label: 'Missed', hint: 'Setup skipped', className: 'missed-class' },
];

const isTradeTakenOutcome = (outcome: Outcome) => ['win', 'loss', 'scratch'].includes(outcome);

describe('TradeConfirmationPanel', () => {
  it('renders the outcome prompt, trade taken choice, and outcome options', () => {
    render(
      <TradeConfirmationPanel
        options={OPTIONS}
        tradeTaken={null}
        onTradeTakenChange={vi.fn()}
        isTradeTakenOutcome={isTradeTakenOutcome}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText('Mark Outcome')).toBeTruthy();
    expect(screen.getByText('Trade Taken')).toBeTruthy();
    expect(screen.getByText('Yes')).toBeTruthy();
    expect(screen.getByText('No')).toBeTruthy();
    for (const option of OPTIONS) {
      expect(screen.getByText(option.label)).toBeTruthy();
      expect(screen.getByText(option.hint)).toBeTruthy();
    }
  });

  it('calls trade taken callback for yes and no choices', () => {
    const onTradeTakenChange = vi.fn();
    render(
      <TradeConfirmationPanel
        options={OPTIONS}
        tradeTaken={null}
        onTradeTakenChange={onTradeTakenChange}
        isTradeTakenOutcome={isTradeTakenOutcome}
        onSelect={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Yes'));
    fireEvent.click(screen.getByText('No'));

    expect(onTradeTakenChange).toHaveBeenCalledWith(true);
    expect(onTradeTakenChange).toHaveBeenCalledWith(false);
  });

  it('allows no-trade outcomes when trade was not taken and blocks trade-taken outcomes', () => {
    const onSelect = vi.fn();
    render(
      <TradeConfirmationPanel
        options={OPTIONS}
        tradeTaken={false}
        onTradeTakenChange={vi.fn()}
        isTradeTakenOutcome={isTradeTakenOutcome}
        onSelect={onSelect}
      />
    );

    const winButton = screen.getByText('Win').closest('button');
    const noTradeButton = screen.getByText('No Trade').closest('button');

    expect(winButton?.disabled).toBe(true);
    expect(noTradeButton?.disabled).toBe(false);

    fireEvent.click(noTradeButton!);
    expect(onSelect).toHaveBeenCalledWith('no_trade');
  });

  it('allows trade-taken outcomes when trade was taken and blocks no-trade outcomes', () => {
    const onSelect = vi.fn();
    render(
      <TradeConfirmationPanel
        options={OPTIONS}
        tradeTaken={true}
        onTradeTakenChange={vi.fn()}
        isTradeTakenOutcome={isTradeTakenOutcome}
        onSelect={onSelect}
      />
    );

    const winButton = screen.getByText('Win').closest('button');
    const missedButton = screen.getByText('Missed').closest('button');

    expect(winButton?.disabled).toBe(false);
    expect(missedButton?.disabled).toBe(true);

    fireEvent.click(winButton!);
    expect(onSelect).toHaveBeenCalledWith('win');
  });

  it('shows saving and error states without changing callbacks', () => {
    render(
      <TradeConfirmationPanel
        options={OPTIONS}
        saving
        error="Outcome save failed."
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText('Saving...')).toBeTruthy();
    expect(screen.getByText('Outcome save failed.')).toBeTruthy();
  });
});
