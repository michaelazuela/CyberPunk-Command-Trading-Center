import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ScreenshotPrecheckStatus, { type ScreenshotStatusItem } from './ScreenshotPrecheckStatus';

const STATUS_ITEMS: ScreenshotStatusItem[] = [
  { label: 'Awaiting screenshot', tone: 'neutral' },
  { label: 'Screenshot staged — analysis has not run yet.', tone: 'complete' },
  { label: 'Checking chart metadata...', tone: 'checking' },
  { label: 'OCR complete', tone: 'complete' },
  { label: 'OCR unavailable — screenshot still staged.', tone: 'warning' },
  { label: 'Chart metadata check complete', tone: 'complete' },
  { label: 'Chart metadata check unavailable — screenshot still staged.', tone: 'warning' },
  { label: 'Analysis running', tone: 'checking' },
  { label: 'Analysis complete', tone: 'complete' },
  { label: 'Analysis error: fixture failure', tone: 'error' },
];

describe('ScreenshotPrecheckStatus', () => {
  it('renders each screenshot and precheck status label', () => {
    render(<ScreenshotPrecheckStatus items={STATUS_ITEMS} />);

    for (const item of STATUS_ITEMS) {
      expect(screen.getByText(`Status: ${item.label}`)).toBeTruthy();
    }
  });

  it('renders nothing when no status items are provided', () => {
    const { container } = render(<ScreenshotPrecheckStatus items={[]} />);
    expect(container.textContent).toBe('');
  });
});
