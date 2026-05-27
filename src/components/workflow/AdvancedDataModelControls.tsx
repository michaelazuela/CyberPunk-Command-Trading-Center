import React from 'react';

interface AdvancedDataModelControlsProps {
  children: React.ReactNode;
}

export default function AdvancedDataModelControls({ children }: AdvancedDataModelControlsProps) {
  return (
    <details className="border border-[var(--b1)] bg-[var(--bg)] p-3">
      <summary className="cursor-pointer select-none text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--txt)]">
        Advanced data/model controls
      </summary>
      <div className="mt-2 text-[10px] text-[var(--txt3)]">
        Bridge, provider, cache, and diagnostic controls for troubleshooting. Leave collapsed during normal live review.
      </div>
      {children}
    </details>
  );
}
