import React, { useState } from 'react';
import { SessionState } from '../types';
import DataHealthPanel from './DataHealthPanel';

export default function Settings({ 
  session, 
  onUpdate
}: { 
  session: SessionState, 
  onUpdate: (updates: Partial<SessionState>) => void
}) {
  const [theme, setTheme] = useState('DARK'); // Dummy state for visual

  return (
    <div className="space-y-6 fade-up">
      <header className="page-header">
        <div>
          <h1>Admin Settings</h1>
          <p>DISCORD · SCANNER · SUPABASE · UI PREFERENCES</p>
        </div>
      </header>

      <DataHealthPanel />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-base flex flex-col">
           <div className="card-header border-none">
              <span>UI Preferences</span>
           </div>
           
           <div className="space-y-6 flex-1 px-4 pb-4">
              <div className="gap-2 flex flex-col">
                 <label className="text-[10px] font-mono text-[var(--txt2)] uppercase">Color Theme</label>
                 <select 
                   value={theme}
                   onChange={e => setTheme(e.target.value)}
                   className="w-full bg-[var(--bg)] border border-[var(--b1)] p-2 text-[12px] font-mono focus:outline-none"
                 >
                    <option value="DARK">Dark Mode (Strict)</option>
                    <option value="LIGHT" disabled>Light Mode (Unavailable)</option>
                 </select>
              </div>
           </div>
        </div>

        <div className="card-base flex flex-col">
           <div className="card-header border-none">
              <span>Discord + Scanner Configuration</span>
           </div>

           <div className="space-y-6 flex-1 px-4 pb-4">
              <SettingLine label="Discord webhook" value="Configured in local .env / Cloudflare variables" />
              <SettingLine label="Discord outcome endpoint" value="Configured by DISCORD_OUTCOME_BASE_URL" />
              <SettingLine label="Scanner command" value="npm run nt:scanner" />
              <SettingLine label="Market cache recorder" value="npm run nt:candle-recorder" />
              <SettingLine label="Bridge authority" value="Read-only NinjaTrader OHLC facts" />
              <div className="border border-[var(--orange)]/30 bg-[var(--orange)]/10 p-3 text-[10px] font-mono text-[var(--orange)]">
                Trading controls were removed from the UI direction. Risk parameters and execution gates are controlled by the deterministic scanner and configuration files, then published through Discord.
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function SettingLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--b1)] bg-[var(--bg)] p-3 font-mono">
      <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--txt3)]">{label}</div>
      <div className="text-[11px] text-[var(--txt)] mt-1">{value}</div>
    </div>
  );
}
