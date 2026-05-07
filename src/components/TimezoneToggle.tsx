import React from 'react';
import { cn } from '../lib/utils';
import { Settings2 } from 'lucide-react';

export interface TimezoneToggleProps {
  selectedTimezone: 'EST' | 'PST';
  onChange: (tz: 'EST' | 'PST') => void;
  showSettings?: boolean;
  onToggleSettings?: () => void;
  hasSettingsIcon?: boolean;
}

export function TimezoneToggle({ selectedTimezone, onChange, showSettings, onToggleSettings, hasSettingsIcon = false }: TimezoneToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex bg-[var(--s2)] p-0.5 border border-[var(--b1)] rounded-sm">
        <button 
          onClick={() => onChange('EST')}
          aria-pressed={selectedTimezone === 'EST'}
          className={cn("px-2 py-0.5 text-[9px] font-mono transition-colors", selectedTimezone === 'EST' ? "bg-[var(--b2)] text-[var(--txt)] font-bold" : "text-[var(--txt2)]")}
        >EST</button>
        <button 
          onClick={() => onChange('PST')}
          aria-pressed={selectedTimezone === 'PST'}
          className={cn("px-2 py-0.5 text-[9px] font-mono transition-colors", selectedTimezone === 'PST' ? "bg-[var(--b2)] text-[var(--txt)] font-bold" : "text-[var(--txt2)]")}
        >PST</button>
      </div>
      {hasSettingsIcon && onToggleSettings && (
        <button onClick={onToggleSettings} aria-label="Settings" aria-expanded={showSettings} className={cn("p-1.5 border border-[var(--b1)] transition-colors text-[var(--txt2)] hover:text-[var(--txt)] rounded-sm", showSettings && "bg-[var(--txt)] text-[var(--bg)]")}>
          <Settings2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
