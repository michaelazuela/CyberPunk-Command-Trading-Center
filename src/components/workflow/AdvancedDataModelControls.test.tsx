import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AdvancedDataModelControls from './AdvancedDataModelControls';

describe('AdvancedDataModelControls', () => {
  it('renders collapsed by default and expands to reveal children', () => {
    const { container } = render(
      <AdvancedDataModelControls>
        <div>Bridge Instrument</div>
      </AdvancedDataModelControls>
    );

    const details = container.querySelector('details');
    expect(screen.getByText('Advanced data/model controls')).toBeTruthy();
    expect(details?.open).toBe(false);

    fireEvent.click(screen.getByText('Advanced data/model controls'));
    expect(details?.open).toBe(true);
    expect(screen.getByText('Bridge Instrument')).toBeTruthy();

    fireEvent.click(screen.getByText('Advanced data/model controls'));
    expect(details?.open).toBe(false);
  });
});
