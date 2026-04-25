/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SessionState } from '../types';
import { Settings as SettingsIcon, Save, RefreshCw, Type } from 'lucide-react';
import { useState } from 'react';

export default function Settings({ 
  session, 
  onUpdate,
  fontSize,
  onFontSizeChange
}: { 
  session: SessionState, 
  onUpdate: (updates: Partial<SessionState>) => void,
  fontSize: number,
  onFontSizeChange: (size: number) => void
}) {
  const [equity, setEquity] = useState(session.accountEquity);
  const [risk, setRisk] = useState(session.riskPercent * 100);

  const handleSave = () => {
    onUpdate({ 
      accountEquity: equity, 
      riskPercent: risk / 100 
    });
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset the current session? This will clear all trades and day classification.')) {
      onUpdate({
        dayType: undefined,
        trades: [],
        killSwitches: { losses: 0, fills: 0 }
      });
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-sm text-stone-500 font-mono uppercase">System Configuration & Account Parameters</p>
      </header>

      <div className="card p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-sm font-mono uppercase border-b border-line pb-2 flex items-center gap-2">
              <SettingsIcon className="w-4 h-4" />
              Account Parameters
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase opacity-50">Account Equity ($)</label>
                <input 
                  type="number" 
                  value={equity} 
                  onChange={e => setEquity(parseFloat(e.target.value))}
                  className="w-full bg-stone-50 dark:bg-stone-900 border border-line p-2 font-mono text-sm focus:outline-none focus:border-accent"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase opacity-50">Risk Per Trade (%)</label>
                <input 
                  type="number" 
                  value={risk} 
                  onChange={e => setRisk(parseFloat(e.target.value))}
                  className="w-full bg-stone-50 dark:bg-stone-900 border border-line p-2 font-mono text-sm focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-mono uppercase border-b border-line pb-2 flex items-center gap-2">
              <Type className="w-4 h-4" />
              Accessibility
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-mono uppercase opacity-50">Base Font Size ({fontSize}px)</label>
                  <span className="text-[10px] font-mono text-accent">Recommended: 18px - 24px</span>
                </div>
                <input 
                  type="range" 
                  min="14" 
                  max="32" 
                  step="1"
                  value={fontSize} 
                  onChange={e => onFontSizeChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-stone-200 dark:bg-stone-800 rounded-lg appearance-none cursor-pointer accent-accent"
                />
                <div className="flex justify-between text-[8px] font-mono opacity-30 uppercase">
                  <span>Small</span>
                  <span>Normal</span>
                  <span>Large</span>
                  <span>Extra Large</span>
                </div>
              </div>
              <p className="text-xs text-stone-500 leading-relaxed italic">
                Adjust the slider to increase the readability of all system components, logs, and analysis results.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-sm font-mono uppercase border-b border-line pb-2 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Session Control
            </h3>
            <div className="space-y-4">
              <p className="text-xs text-stone-500 leading-relaxed">
                Resetting the session will clear the current day's classification and all trade records. 
                Use this at the start of a new trading day.
              </p>
              <button onClick={handleReset} className="btn-outline w-full text-red-600 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/20">
                Reset Current Session
              </button>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-line">
          <button onClick={handleSave} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save Configuration
          </button>
        </div>
      </div>

      <section className="bg-stone-100 dark:bg-stone-900 border border-line p-6">
        <h3 className="text-[10px] font-mono uppercase opacity-50 mb-4">System Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px] font-mono uppercase">
          <div>
            <p className="opacity-50">Version</p>
            <p className="font-bold">1.0.0-PROD</p>
          </div>
          <div>
            <p className="opacity-50">Engine</p>
            <p className="font-bold">Gemini 3 Flash</p>
          </div>
          <div>
            <p className="opacity-50">Strategy</p>
            <p className="font-bold">MES/MNQ Pullback</p>
          </div>
          <div>
            <p className="opacity-50">Last Update</p>
            <p className="font-bold">Apr 11, 2026</p>
          </div>
        </div>
      </section>
    </div>
  );
}
