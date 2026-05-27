import React from 'react';
import { cn } from '../../lib/utils';

export type ScreenshotStatusTone = 'neutral' | 'checking' | 'complete' | 'warning' | 'error';

export interface ScreenshotStatusItem {
  label: string;
  tone: ScreenshotStatusTone;
}

const SCREENSHOT_STATUS_CLASSES: Record<ScreenshotStatusTone, string> = {
  neutral: 'border-[var(--b2)] bg-[var(--b1)]/30 text-[var(--txt3)]',
  checking: 'border-[var(--blue)]/30 bg-[var(--blue)]/10 text-[var(--blue)]',
  complete: 'border-[var(--green)]/30 bg-[var(--green)]/10 text-[var(--green)]',
  warning: 'border-[var(--orange)]/30 bg-[var(--orange)]/10 text-[var(--orange)]',
  error: 'border-[var(--red)]/30 bg-[var(--red)]/10 text-[var(--red)]',
};

interface ScreenshotPrecheckStatusProps {
  items: ScreenshotStatusItem[];
}

export default function ScreenshotPrecheckStatus({ items }: ScreenshotPrecheckStatusProps) {
  if (!items.length) return null;

  return (
    <div className="mt-3 flex w-full flex-col gap-1 font-mono">
      {items.map(item => (
        <div key={item.label} className={cn('border px-2 py-1 text-[9px] uppercase tracking-[0.1em]', SCREENSHOT_STATUS_CLASSES[item.tone])}>
          Status: {item.label}
        </div>
      ))}
    </div>
  );
}
