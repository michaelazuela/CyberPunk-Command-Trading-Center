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
  const [equity, setEquity] = useState(session.accountEquity || 100000);
  const [risk, setRisk] = useState((session.riskPercent || 0.02) * 100);
  const [theme, setTheme] = useState('DARK'); // Dummy state for visual

  const handleSave = () => {
    onUpdate({ 
      accountEquity: equity, 
      riskPercent: risk / 100
    });
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset the current session?')) {
      onUpdate({
        dayType: undefined,
        trades: [],
        killSwitches: { losses: 0, fills: 0 }
      });
    }
  };

  return (
    <div className="space-y-6 fade-up">
      <header className="page-header">
        <div>
          <h1>Settings</h1>
          <p>PREFERENCES & SYSTEM INTEGRATION</p>
        </div>
      </header>

      <DataHealthPanel />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: UI Preferences */}
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

        {/* Right: System Configuration */}
        <div className="card-base flex flex-col">
           <div className="card-header border-none">
              <span>System Configuration</span>
           </div>

           <div className="space-y-6 flex-1 px-4 pb-4">
              <div className="gap-2 flex flex-col">
                 <label className="text-[10px] font-mono text-[var(--txt2)] uppercase">Account Equity</label>
                 <input 
                   type="number" 
                   value={equity} 
                   onChange={e => setEquity(parseFloat(e.target.value))}
                   className="w-full bg-[var(--bg)] border border-[var(--b1)] p-2 text-[12px] font-mono focus:outline-none"
                 />
              </div>

              <div className="gap-2 flex flex-col">
                 <label className="text-[10px] font-mono text-[var(--txt2)] uppercase">Risk Per Trade (%)</label>
                 <input 
                   type="number" 
                   value={risk} 
                   onChange={e => setRisk(parseFloat(e.target.value))}
                   className="w-full bg-[var(--bg)] border border-[var(--b1)] p-2 text-[12px] font-mono focus:outline-none"
                 />
              </div>

              <div className="flex gap-4 pt-4 border-t border-[var(--b0)]">
                 <button onClick={handleSave} className="qd-btn-primary flex-1">SAVE CONFIG</button>
                 <button onClick={handleReset} className="qd-btn-ghost-red flex-1 text-[var(--red)] border-[var(--red)] border">RESET SESSION</button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
