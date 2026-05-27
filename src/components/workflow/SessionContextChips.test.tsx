import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SessionContextChips, { type SessionContextChip } from './SessionContextChips';

describe('SessionContextChips', () => {
  it('renders required session and context chips', () => {
    const chips: SessionContextChip[] = [
      { label: 'Morning / AM', tone: 'ready' },
      { label: 'Lunch / PM Review', tone: 'pending' },
      { label: 'Trade Date:', value: '2026-05-26' },
      { label: 'Instrument:', value: 'MES' },
      { label: 'Bridge:', value: 'Connected', tone: 'complete' },
      { label: 'OHLC:', value: 'Available', tone: 'complete' },
    ];

    render(<SessionContextChips chips={chips} />);

    expect(screen.getByText('Morning / AM')).toBeTruthy();
    expect(screen.getByText('Lunch / PM Review')).toBeTruthy();
    expect(screen.getByText('Trade Date:')).toBeTruthy();
    expect(screen.getByText('2026-05-26')).toBeTruthy();
    expect(screen.getByText('Instrument:')).toBeTruthy();
    expect(screen.getByText('MES')).toBeTruthy();
    expect(screen.getByText('Bridge:')).toBeTruthy();
    expect(screen.getByText('Connected')).toBeTruthy();
    expect(screen.getByText('OHLC:')).toBeTruthy();
    expect(screen.getByText('Available')).toBeTruthy();
  });

  it('handles missing optional chips gracefully', () => {
    render(<SessionContextChips chips={[
      { label: 'Morning / AM' },
      { label: 'Lunch / PM Review' },
      { label: 'Trade Date:', value: '2026-05-26' },
      { label: 'Instrument:', value: 'MES' },
    ]} />);

    expect(screen.getByText('Morning / AM')).toBeTruthy();
    expect(screen.getByText('Lunch / PM Review')).toBeTruthy();
    expect(screen.queryByText('Bridge:')).toBeNull();
    expect(screen.queryByText('OHLC:')).toBeNull();
  });
});
