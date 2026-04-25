/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Upload, Loader2, CheckCircle2, XCircle, Clipboard, Settings2, Sliders, ShieldCheck, Eye, Brain, Sparkles, Target, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { SessionState, AnalysisResult, DayType, AISettings, ProposedRule } from '../types';
import { analyzeChart, preCheckChartInfo, type OCRResult } from '../lib/gemini';
import { cn } from '../lib/utils';
import AgentAnimation from './AgentAnimation';
import AgentMatrix from './AgentMatrix';
import MonteCarloSection from './MonteCarloSection';

export default function Analysis({ session, customRules = [], onUpdate }: { 
  session: SessionState, 
  customRules?: ProposedRule[],
  onUpdate: (updates: Partial<SessionState>) => void 
}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPreChecking, setIsPreChecking] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [lastImage, setLastImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showChainOfThought, setShowChainOfThought] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [localSettings, setLocalSettings] = useState<AISettings>(session.aiSettings || { temperature: 0.1, customInstructions: '' });

  // Simulate agent steps during analysis
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAnalyzing) {
      setCurrentStep(0);
      interval = setInterval(() => {
        setCurrentStep(prev => (prev < 2 ? prev + 1 : prev));
      }, 2000);
    } else {
      setCurrentStep(0);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const processImage = useCallback(async (base64String: string) => {
    setIsPreChecking(true);
    setError(null);
    setResult(null);
    setOcrResult(null);
    setPendingImage(base64String);

    try {
      const ocr = await preCheckChartInfo(base64String);
      ocr.timezone = session.aiSettings?.screenshotTimezone || 'EST';
      setOcrResult(ocr);
    } catch (err) {
      console.error("OCR Pre-check failed:", err);
      // Fallback or ignore
    } finally {
      setIsPreChecking(false);
    }
  }, []);

  const startFullAnalysis = useCallback(async () => {
    if (!pendingImage) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      setLastImage(pendingImage);
      
      const approvedRulesText = (customRules || [])
        .filter(r => r.status === 'APPROVED')
        .map(r => `- ${r.rule}`)
        .join('\n');

      const ocrOverrideText = ocrResult ? `
[OPERATOR OVERRIDE DATA]
Ticker: ${ocrResult.ticker || 'N/A'}
Timeframe: ${ocrResult.timeframe || 'N/A'}
Current Price: ${ocrResult.currentPrice || 'N/A'}
Timestamp: ${ocrResult.lastTimestamp || 'N/A'}
Screenshot Timezone: ${ocrResult.timezone || 'EST (Default)'}
` : '';

      const analysisSettings = {
        ...localSettings,
        customInstructions: `${localSettings.customInstructions}\n${ocrOverrideText}\nAPPROVED STRATEGY REFINEMENTS:\n${approvedRulesText}`.trim()
      };

      const analysis = await analyzeChart(pendingImage, analysisSettings, session.accountEquity, session.analysisResult);
      setResult(analysis);
      onUpdate({ morningScreenshot: pendingImage });
      setPendingImage(null);
      setOcrResult(null);
    } catch (err) {
      console.error(err);
      setError('Failed to analyze chart. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [pendingImage, localSettings, session.accountEquity, session.analysisResult, customRules]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      processImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (!blob) continue;

        const reader = new FileReader();
        reader.onloadend = () => {
          processImage(reader.result as string);
        };
        reader.readAsDataURL(blob);
        break;
      }
    }
  }, [processImage]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  const confirmDayType = () => {
    if (result) {
      onUpdate({ 
        dayType: result.dayType,
        analysisResult: result
      });
    }
  };

  const saveSettings = () => {
    onUpdate({ aiSettings: localSettings });
    setShowSettings(false);
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Morning Analysis</h2>
          <p className="text-sm text-stone-500 font-mono uppercase">10:10 AM EDT Chart Review</p>
        </div>
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className={cn(
            "p-2 border border-line transition-colors",
            showSettings ? "bg-ink text-bg" : "hover:bg-stone-100 dark:hover:bg-stone-800"
          )}
        >
          <Settings2 className="w-5 h-5" />
        </button>
      </header>

      {showSettings && (
        <div className="card p-6 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="text-sm font-mono uppercase flex items-center gap-2 border-b border-line pb-2">
            <Sliders className="w-4 h-4" />
            AI Model Parameters
          </h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase opacity-50 flex justify-between">
                Temperature
                <span className="font-bold text-accent">{localSettings.temperature}</span>
              </label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1"
                value={localSettings.temperature} 
                onChange={e => setLocalSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                className="w-full accent-accent"
              />
              <p className="text-[10px] text-stone-500 italic">Lower values are more deterministic, higher values more creative.</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase opacity-50">Custom Instructions</label>
              <textarea 
                value={localSettings.customInstructions}
                onChange={e => setLocalSettings(prev => ({ ...prev, customInstructions: e.target.value }))}
                placeholder="e.g. Pay special attention to the volume spikes at 9:35..."
                className="w-full bg-stone-50 dark:bg-stone-900 border border-line p-3 font-mono text-xs min-h-[100px] focus:outline-none focus:border-accent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-line pt-4">
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase opacity-50 flex justify-between">
                  NYSE TICK
                  <span className="font-bold text-accent">{localSettings.tickIndex || 'N/A'}</span>
                </label>
                <input 
                  type="number"
                  value={localSettings.tickIndex || ''}
                  onChange={e => setLocalSettings(prev => ({ ...prev, tickIndex: parseInt(e.target.value) || undefined }))}
                  placeholder="e.g. +850"
                  className="w-full bg-stone-50 dark:bg-stone-900 border border-line p-2 font-mono text-xs focus:outline-none focus:border-accent"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase opacity-50 flex justify-between">
                  VIX Level
                  <span className="font-bold text-accent">{localSettings.vixLevel || 'N/A'}</span>
                </label>
                <input 
                  type="number"
                  step="0.1"
                  value={localSettings.vixLevel || ''}
                  onChange={e => setLocalSettings(prev => ({ ...prev, vixLevel: parseFloat(e.target.value) || undefined }))}
                  placeholder="e.g. 15.4"
                  className="w-full bg-stone-50 dark:bg-stone-900 border border-line p-2 font-mono text-xs focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-line pt-4">
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase opacity-50">HTF Villain High</label>
                <input 
                  type="number"
                  value={localSettings.villainLevels?.high || ''}
                  onChange={e => setLocalSettings(prev => ({ 
                    ...prev, 
                    villainLevels: { ...prev.villainLevels!, high: parseFloat(e.target.value) || 0 } 
                  }))}
                  placeholder="1H/4H Resistance"
                  className="w-full bg-stone-50 dark:bg-stone-900 border border-line p-2 font-mono text-xs focus:outline-none focus:border-accent"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase opacity-50">HTF Villain Low</label>
                <input 
                  type="number"
                  value={localSettings.villainLevels?.low || ''}
                  onChange={e => setLocalSettings(prev => ({ 
                    ...prev, 
                    villainLevels: { ...prev.villainLevels!, low: parseFloat(e.target.value) || 0 } 
                  }))}
                  placeholder="1H/4H Support"
                  className="w-full bg-stone-50 dark:bg-stone-900 border border-line p-2 font-mono text-xs focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="space-y-2 border-t border-line pt-4">
              <label className="text-[10px] font-mono uppercase opacity-50">Chart Timezone</label>
              <select 
                className="w-full bg-stone-50 dark:bg-stone-900 border border-line p-2 font-mono text-xs focus:outline-none focus:border-accent"
                value={localSettings.screenshotTimezone || 'EST'}
                onChange={e => setLocalSettings(prev => ({ ...prev, screenshotTimezone: e.target.value as any }))}
              >
                <option value="EST">EST (New York)</option>
                <option value="CST">CST (Chicago)</option>
                <option value="MST">MST (Denver)</option>
                <option value="PST">PST (Los Angeles)</option>
              </select>
              <p className="text-[9px] text-stone-500 font-mono mt-1">This will be passed to the AI so it evaluates key levels based on proper market times.</p>
            </div>

            <div className="flex gap-4">
              <button onClick={saveSettings} className="btn-primary flex-1">Save AI Parameters</button>
              <button onClick={() => setShowSettings(false)} className="btn-outline">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* HUD Row: The Big Picture */}
        {result && !isAnalyzing && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="md:col-span-2 card p-6 flex justify-between items-center bg-ink text-bg border-none shadow-xl relative overflow-hidden group">
              {/* Subtle background pulse for result */}
              <div className={cn(
                "absolute inset-0 opacity-10 transition-opacity duration-1000",
                result.dayType?.includes('LONG') || result.dayType === 'LUNCH REVERSAL' ? "bg-green-500 animate-pulse" :
                result.dayType?.includes('SHORT') || result.dayType === 'DISTRIBUTION' ? "bg-red-500 animate-pulse" :
                "bg-amber-500"
              )} />
              
              <div className="relative z-10">
                <p className="text-[10px] font-mono uppercase opacity-50 mb-1 tracking-widest">Market Classification</p>
                <h3 className={cn(
                  "text-4xl font-black tracking-tighter uppercase drop-shadow-sm",
                  result.dayType?.includes('LONG') || result.dayType === 'LUNCH REVERSAL' ? "text-green-400" :
                  result.dayType?.includes('SHORT') || result.dayType === 'DISTRIBUTION' ? "text-red-400" :
                  "text-amber-400"
                )}>{result.dayType}</h3>
              </div>
              <div className="relative z-10 text-right flex flex-col items-end">
                <p className="text-[10px] font-mono uppercase opacity-50 mb-1 tracking-widest">AI Confidence</p>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-24 bg-stone-900 rounded-full overflow-hidden border border-stone-800">
                    <div 
                      className={cn(
                        "h-full transition-all duration-1000",
                        (result.confidence * 100) > 80 ? "bg-green-500" :
                        (result.confidence * 100) > 50 ? "bg-amber-500" :
                        "bg-red-500"
                      )}
                      style={{ width: `${Math.min(100, Math.max(0, result.confidence * 100))}%` }}
                    />
                  </div>
                  <p className="text-4xl font-black font-mono leading-none">
                    {typeof result.confidence === 'number' && !isNaN(result.confidence) 
                      ? (result.confidence * 100).toFixed(0) 
                      : '0'}%
                  </p>
                </div>
              </div>
            </div>
            
            <div className="card p-6 flex flex-col justify-center items-center border-accent/20 bg-accent/5 backdrop-blur-sm">
              <p className="text-[10px] font-mono uppercase opacity-50 mb-2 tracking-widest">Rejection Strength</p>
              <div className="flex items-center gap-3">
                <Zap className={cn(
                  "w-8 h-8",
                  result.rejectionStrength === 'EXTREME' ? "text-red-500 animate-pulse" :
                  result.rejectionStrength === 'HIGH' ? "text-amber-500" :
                  "text-stone-400"
                )} />
                <span className={cn(
                  "text-2xl font-black uppercase tracking-tighter",
                  result.rejectionStrength === 'EXTREME' ? "text-red-500" :
                  result.rejectionStrength === 'HIGH' ? "text-amber-500" :
                  ""
                )}>
                  {result.rejectionStrength || 'LOW'}
                </span>
              </div>
            </div>

            <div className="card p-6 flex flex-col justify-center items-center border-line bg-stone-50 dark:bg-stone-900/50">
              <p className="text-[10px] font-mono uppercase opacity-50 mb-2 tracking-widest">Session Status</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                <span className="font-bold uppercase tracking-tight text-sm">Live Analysis</span>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Visuals & Logic */}
          <div className="lg:col-span-8 space-y-6">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-600 text-xs font-mono flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <XCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {!result && !isAnalyzing && !isPreChecking && !pendingImage && (
              <div className="card p-12 text-center border-dashed border-2 border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/20">
                <div className="max-w-sm mx-auto space-y-6">
                  <div className="w-20 h-20 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <Upload className="w-10 h-10 text-stone-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Initialize Analysis</h3>
                    <p className="text-sm text-stone-500">Paste (Ctrl+V) or upload a screenshot of your chart (9:30 AM - 10:10 AM EDT).</p>
                  </div>
                  <div className="flex justify-center gap-4">
                    <label className="btn-primary px-8 py-3 cursor-pointer shadow-lg shadow-accent/20">
                      Select File
                      <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
                    </label>
                  </div>
                  <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest">Direct Paste Supported from NinjaTrader / TradingView</p>
                </div>
              </div>
            )}

            {isPreChecking && (
              <div className="card h-[400px] flex flex-col items-center justify-center p-8 relative overflow-hidden bg-stone-50 dark:bg-stone-900 border-2 border-line">
                <div className="relative z-10 w-full max-w-lg space-y-6 text-center">
                  <Loader2 className="w-12 h-12 text-accent animate-spin mx-auto" />
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold tracking-[0.2em] uppercase">
                      Automated OCR Pre-Check
                    </h2>
                    <p className="text-xs font-mono uppercase opacity-60">Scanning image for chart metadata...</p>
                  </div>
                </div>
              </div>
            )}

            {!isPreChecking && pendingImage && ocrResult && (
              <div className="card border-2 border-line overflow-hidden">
                <div className="bg-stone-100 dark:bg-stone-900 border-b border-line p-4">
                  <h3 className="font-bold tracking-tight uppercase flex items-center gap-2">
                    <Eye className="w-5 h-5 text-accent" />
                    OCR Verification
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">Please verify the extracted metadata before proceeding with full analysis.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase opacity-50">Ticker</label>
                      <input 
                        className="w-full bg-stone-50 dark:bg-stone-900 border border-line p-2 font-mono text-xs focus:outline-none focus:border-accent"
                        value={ocrResult.ticker || ''}
                        onChange={(e) => setOcrResult({ ...ocrResult, ticker: e.target.value })}
                        placeholder="N/A"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase opacity-50">Timeframe</label>
                      <input 
                        className="w-full bg-stone-50 dark:bg-stone-900 border border-line p-2 font-mono text-xs focus:outline-none focus:border-accent"
                        value={ocrResult.timeframe || ''}
                        onChange={(e) => setOcrResult({ ...ocrResult, timeframe: e.target.value })}
                        placeholder="N/A"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase opacity-50">Current Price</label>
                      <input 
                        type="number"
                        step="0.25"
                        className="w-full bg-stone-50 dark:bg-stone-900 border border-line p-2 font-mono text-xs focus:outline-none focus:border-accent"
                        value={ocrResult.currentPrice || ''}
                        onChange={(e) => setOcrResult({ ...ocrResult, currentPrice: parseFloat(e.target.value) || undefined })}
                        placeholder="N/A"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase opacity-50">Timestamp</label>
                      <input 
                        className="w-full bg-stone-50 dark:bg-stone-900 border border-line p-2 font-mono text-xs focus:outline-none focus:border-accent"
                        value={ocrResult.lastTimestamp || ''}
                        onChange={(e) => setOcrResult({ ...ocrResult, lastTimestamp: e.target.value })}
                        placeholder="N/A"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase opacity-50">Timezone</label>
                      <select 
                        className="w-full bg-stone-50 dark:bg-stone-900 border border-line p-2 font-mono text-xs focus:outline-none focus:border-accent"
                        value={ocrResult.timezone || 'EST'}
                        onChange={(e) => setOcrResult({ ...ocrResult, timezone: e.target.value })}
                      >
                        <option value="EST">EST</option>
                        <option value="CST">CST</option>
                        <option value="MST">MST</option>
                        <option value="PST">PST</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-stone-50 dark:bg-stone-900/50 p-4 border-t border-line flex gap-4">
                  <button onClick={startFullAnalysis} className="btn-primary flex-1">
                    Confirm & Analyze
                  </button>
                  <button onClick={() => { setPendingImage(null); setOcrResult(null); }} className="btn-outline">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {isAnalyzing && (
              <div className="card h-[400px] flex flex-col items-center justify-center p-8 relative overflow-hidden bg-black border-2 border-line">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,243,255,0.05)_0%,_transparent_70%)]" />
                
                <div className="relative z-10 w-full max-w-lg space-y-6 text-center">
                  <div className="relative inline-block">
                    <Loader2 className="w-16 h-16 text-accent animate-spin mx-auto relative z-10" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-xl font-black tracking-[0.3em] uppercase text-ink">
                      Ultra-Lean Execution
                    </h2>
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-ink/60">Bypassing Reasoning Layers...</p>
                  </div>
                </div>
              </div>
            )}

            {result && !isAnalyzing && (
              <>
                {lastImage && (
                  <div className="card overflow-hidden border-line relative group shadow-2xl">
                    <img 
                      src={lastImage} 
                      alt="Analyzed Chart" 
                      className="w-full h-auto object-cover opacity-95 group-hover:opacity-100 transition-opacity duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 left-4 px-4 py-1.5 bg-ink/90 text-bg text-[10px] font-mono uppercase tracking-widest backdrop-blur-md border border-white/10 shadow-xl">
                      Reference Chart: 09:30 - 11:00
                    </div>
                  </div>
                )}

                {/* Reasoning & Intelligence Stack */}
                <div className="space-y-4">
                  <div className="card p-6 space-y-4 bg-stone-50 dark:bg-stone-900/30 border-line">
                    <button 
                      onClick={() => setShowReasoning(!showReasoning)}
                      className="w-full flex justify-between items-center text-[10px] font-mono uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity"
                    >
                      <span className="flex items-center gap-2">
                        <Brain className="w-4 h-4 text-accent" />
                        Strategic Reasoning
                      </span>
                      {showReasoning ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    
                    {showReasoning && (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <pre className="text-sm leading-relaxed font-mono text-stone-800 dark:text-stone-200 border-l-4 border-accent pl-6 py-2 bg-stone-100 dark:bg-stone-900 overflow-x-auto whitespace-pre-wrap">
                          {result.reasoning}
                        </pre>
                      </div>
                    )}
                  </div>

                  {result.agentReports && (
                    <div className="card overflow-hidden border-line bg-stone-50 dark:bg-stone-900/30">
                      <button 
                        onClick={() => setShowChainOfThought(!showChainOfThought)}
                        className="w-full flex justify-between items-center p-6 hover:bg-stone-100 dark:hover:bg-stone-900/50 transition-colors"
                      >
                        <span className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest opacity-60">
                          <Sparkles className="w-4 h-4 text-accent" />
                          Multi-Agent Intelligence Matrix
                        </span>
                        {showChainOfThought ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      
                      {showChainOfThought && (
                        <div className="p-6 pt-0 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                          {/* Workflow Visualizer */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="card p-4 bg-black/5 dark:bg-white/5 border-dashed border border-stone-300 dark:border-stone-700">
                              <h4 className="text-[9px] font-mono uppercase opacity-40 mb-4 tracking-widest">Agent Workflow Visualization</h4>
                              <AgentAnimation 
                                isAnalyzing={isAnalyzing} 
                                reports={result?.agentReports} 
                                currentStep={currentStep} 
                              />
                            </div>
                            <div className="h-64">
                              <AgentMatrix 
                                isAnalyzing={isAnalyzing} 
                                currentStep={currentStep} 
                              />
                            </div>
                          </div>

                          {/* Detailed Reports */}
                          <div className="grid grid-cols-1 gap-3">
                            {result.agentReports?.map((report, i) => (
                              <div key={i} className={cn(
                                "p-4 border-l-2 text-xs font-mono leading-relaxed shadow-sm",
                                report.status === 'SUCCESS' ? "border-green-500 bg-green-500/5" : 
                                report.status === 'WARNING' ? "border-amber-500 bg-amber-500/5" : 
                                "border-red-500 bg-red-500/5"
                              )}>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-bold uppercase tracking-wider opacity-60">{report.agentName}</span>
                                  <div className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    report.status === 'SUCCESS' ? "bg-green-500" : 
                                    report.status === 'WARNING' ? "bg-amber-500" : 
                                    "bg-red-500"
                                  )} />
                                </div>
                                <p className="opacity-90 whitespace-pre-wrap">{report.findings}</p>
                                {report.ruleCitation && (
                                  <p className="mt-2 text-[10px] text-accent/80 flex items-center gap-1 before:content-[''] before:block before:w-3 before:h-px before:bg-accent/30">
                                    <span className="font-bold uppercase">Citing Rule:</span> {report.ruleCitation}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {result.suggestedEntry && (
                  <MonteCarloSection 
                    startPrice={result.suggestedEntry}
                    stopPrice={result.suggestedStop}
                    targetPrice={result.suggestedTarget}
                  />
                )}
              </>
            )}
          </div>

          {/* Right Column: Execution & Documentation */}
          <div className="lg:col-span-4 space-y-6">
            {result && !isAnalyzing && (
              <>
                {/* The Trade Ticket */}
                {result.suggestedEntry && (
                  <div className="relative group">
                    {(() => {
                      const isShort = result.dayType?.includes('SHORT') || result.dayType === 'DISTRIBUTION';
                      const themeClass = isShort ? "text-red-500 border-red-500/30" : "text-green-500 border-green-500/30";
                      const bgClass = isShort ? "bg-red-500" : "bg-green-500";
                      const glowClass = isShort ? "from-red-500 to-rose-900" : "from-green-500 to-emerald-900";
                      
                      return (
                        <>
                          <div className={cn(
                            "absolute -inset-0.5 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 animate-pulse bg-gradient-to-r",
                            glowClass
                          )}></div>
                          
                          <div className={cn(
                            "relative card overflow-hidden bg-black shadow-2xl min-h-[480px] flex flex-col",
                            themeClass,
                            isShort ? "shadow-red-500/10" : "shadow-green-500/10"
                          )}>
                            {/* Card Header */}
                            <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 border-b border-white/5 px-4 py-3 flex justify-between items-center relative overflow-hidden">
                              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 pointer-events-none" style={{ backgroundSize: '100% 2px, 3px 100%' }}></div>
                              
                              <div className="flex flex-col relative z-10">
                                <span className="text-[7px] font-mono uppercase tracking-[0.3em] opacity-50">Authentication: {new Date().toLocaleTimeString()}</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={cn("text-[10px] font-black italic tracking-tighter text-bg px-2 py-0.5 rounded-sm uppercase", bgClass)}>
                                    {result.dayType}
                                  </span>
                                  <span className="text-[8px] font-mono opacity-30">#{(Math.random() * 1000).toFixed(0).padStart(4, '0')}</span>
                                </div>
                              </div>
                            </div>

                            {/* Card Body */}
                            <div className="flex-1 p-6 relative overflow-hidden flex flex-col justify-between">
                              <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ 
                                backgroundImage: `linear-gradient(${isShort ? '#ef4444' : '#00ff41'} 1px, transparent 1px), linear-gradient(90deg, ${isShort ? '#ef4444' : '#00ff41'} 1px, transparent 1px)`,
                                backgroundSize: '30px 30px'
                              }}></div>

                              <div className="relative z-10 space-y-8">
                                <div className="flex justify-between items-start">
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-mono uppercase opacity-50 tracking-widest">Position Type</p>
                                    <p className="text-3xl font-black tracking-[0.2em] italic">{isShort ? 'SHORT' : 'LONG'}</p>
                                  </div>
                                  <div className={cn("w-14 h-14 border-2 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.5)]", isShort ? "border-red-500/30 bg-red-500/10" : "border-green-500/30 bg-green-500/10")}>
                                    <Target className="w-8 h-8 animate-pulse" />
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <p className="text-[10px] font-mono uppercase opacity-50 tracking-widest">Entry Trigger</p>
                                  <p className="text-5xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] break-all">
                                    {result.suggestedEntry}
                                  </p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 py-6 border-y border-white/10">
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-mono uppercase opacity-50 tracking-widest">Stop Loss</p>
                                    <p className="text-xl font-bold text-red-500 font-mono tracking-tighter">{result.suggestedStop}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-mono uppercase opacity-50 tracking-widest">Target (2.0R)</p>
                                    <p className={cn("text-xl font-bold font-mono tracking-tighter", isShort ? "text-red-400" : "text-green-400")}>{result.suggestedTarget}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Card Footer */}
                              <div className="relative z-10 mt-8">
                                <div className="grid grid-cols-3 gap-1.5">
                                  <div className="bg-white/5 p-2 rounded border border-white/10 text-center backdrop-blur-sm flex flex-col justify-center min-h-[50px]">
                                    <p className="text-[6px] opacity-40 uppercase tracking-widest mb-1">Confidence</p>
                                    <p className="text-xs font-black">{(result.confidence * 100).toFixed(0)}%</p>
                                  </div>
                                  <div className="bg-white/5 p-2 rounded border border-white/10 text-center backdrop-blur-sm flex flex-col justify-center min-h-[50px]">
                                    <p className="text-[6px] opacity-40 uppercase tracking-widest mb-1">Rejection</p>
                                    <p className="text-[10px] font-black leading-tight">{result.rejectionStrength}</p>
                                  </div>
                                  <div className="bg-white/5 p-2 rounded border border-white/10 text-center backdrop-blur-sm flex flex-col justify-center min-h-[50px]">
                                    <p className="text-[6px] opacity-40 uppercase tracking-widest mb-1">Risk Unit</p>
                                    <p className="text-xs font-black">1.2%</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <button 
                              onClick={() => {
                                const text = `PLAN: ${result.dayType}\nENTRY: ${result.suggestedEntry}\nSTOP: ${result.suggestedStop}\nTARGET: ${result.suggestedTarget}`;
                                navigator.clipboard.writeText(text);
                              }}
                              className={cn("w-full py-4 text-black font-black text-xs uppercase tracking-[0.3em] transition-colors", bgClass, isShort ? "hover:bg-red-400" : "hover:bg-green-400")}
                            >
                              Copy Trade Plan
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Pre-Flight Checklist */}
                <div className="card p-6 space-y-4 border-line bg-stone-50 dark:bg-stone-900/30">
                  <p className="text-[10px] font-mono uppercase tracking-widest opacity-50 border-b border-line pb-2">Pre-Flight Checklist</p>
                  <div className="space-y-3">
                    {result.checks?.map((check, i) => (
                      <div key={i} className="flex items-start gap-3 text-xs font-mono">
                        {check.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                        )}
                        <span className={cn(
                          "leading-tight",
                          check.passed ? 'text-ink' : 'text-stone-400'
                        )}>{check.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Session Log for Database Ingestion */}
                {result.sessionLog && (
                  <div className="card p-4 space-y-3 border-accent/30 bg-accent/5 font-mono text-[10px]">
                    <div className="flex justify-between items-center border-b border-accent/20 pb-2">
                      <span className="uppercase tracking-widest opacity-50">Session Log (JSON)</span>
                      <button 
                        onClick={() => navigator.clipboard.writeText(JSON.stringify(result.sessionLog, null, 2))}
                        className="text-accent hover:text-white transition-colors flex items-center gap-1"
                      >
                        <Clipboard className="w-3 h-3" />
                        COPY
                      </button>
                    </div>
                    <pre className="overflow-x-auto text-accent/80 whitespace-pre-wrap">
                      {JSON.stringify(result.sessionLog, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-3">
                  <button onClick={confirmDayType} className="btn-primary w-full py-4 text-sm shadow-lg shadow-accent/20">
                    Confirm & Lock Day Type
                  </button>
                  <button onClick={() => { setResult(null); setLastImage(null); }} className="btn-outline w-full py-3 text-xs">
                    Clear & Restart Analysis
                  </button>
                </div>
              </>
            )}

            {/* Static Reference Cards */}
            <div className="space-y-4">
              <div className="card p-6 space-y-4 bg-stone-50 dark:bg-stone-900/30 border-line">
                <h4 className="text-[10px] font-mono uppercase tracking-widest opacity-50 border-b border-line pb-2">Analysis Tips</h4>
                <ul className="space-y-3 text-[10px] font-mono uppercase leading-relaxed">
                  <li className="flex gap-3">
                    <span className="text-accent font-bold">01.</span>
                    <span className="opacity-70">Ensure 9:30 AM open is clearly visible.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-accent font-bold">02.</span>
                    <span className="opacity-70">The AI looks for the "Staircase" pattern (HH/HL).</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-accent font-bold">03.</span>
                    <span className="opacity-70">Type 2 setups require a small 9:30 bar.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Reference Section: Rules & Algorithms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-line">
          <section className="card p-6 bg-stone-50 dark:bg-stone-900/20">
            <h3 className="text-[10px] font-mono uppercase tracking-widest mb-6 opacity-50">Classification Rules</h3>
            <div className="space-y-6 text-xs">
              <div className="space-y-3">
                <RuleItem type="LONG" label="TYPE 1" desc="Large green 9:30 bar + HH/HL staircase." />
                <div className="ml-16 space-y-1 opacity-60">
                  <p className="text-[9px] font-mono text-accent uppercase tracking-tighter">Sweep & Reclaim: Wick below 9:30 low + reclaim.</p>
                  <p className="text-[8px] font-mono italic">High Confidence: 5m CLOSE above 9:30 High.</p>
                </div>
              </div>
              <RuleItem type="LONG" label="TYPE 2" desc="Doji 9:30 + Large green 9:35." />
              <div className="space-y-3">
                <RuleItem type="SHORT" label="TYPE 1" desc="Large red 9:30/9:35 + LH/LL staircase." />
                <div className="ml-16 space-y-1 opacity-60">
                  <p className="text-[9px] font-mono text-accent uppercase tracking-tighter">Sweep & Reclaim: Wick above 9:30 high + reclaim.</p>
                  <p className="text-[8px] font-mono italic">High Confidence: 5m CLOSE below 9:30 Low.</p>
                </div>
              </div>
              <RuleItem type="SHORT" label="TYPE 2" desc="Gap up + immediate rejection." />
            </div>
          </section>

          <section className="card p-6 border-accent/20 bg-accent/5">
            <h3 className="text-[10px] font-mono uppercase tracking-widest mb-6 text-accent flex items-center gap-2">
              <Target className="w-4 h-4" />
              Targeting Algorithms (v1.2)
            </h3>
            <div className="space-y-4 text-[10px] font-mono uppercase">
              <div className="flex justify-between border-b border-accent/10 pb-2">
                <span className="opacity-60">Standard Setup</span>
                <span className="font-bold">2.0R Fixed</span>
              </div>
              <div className="flex justify-between border-b border-accent/10 pb-2">
                <span className="opacity-60">High Volatility (Stop {'>'} 15pts)</span>
                <span className="font-bold text-accent">1.5R Conservative</span>
              </div>
              <div className="flex justify-between border-b border-accent/10 pb-2">
                <span className="opacity-60">Sweep & Reclaim</span>
                <span className="font-bold text-accent">9:30 Extreme (T1)</span>
              </div>
              <div className="flex justify-between border-b border-accent/10 pb-2">
                <span className="opacity-60">High Risk Setup</span>
                <span className="font-bold text-accent">Order Block (61.8% Golden Ratio)</span>
              </div>
              <p className="text-[9px] italic opacity-50 leading-relaxed normal-case pt-2">
                * The AI automatically adjusts targets based on the risk-to-reward dynamics of the specific setup to maximize expectancy.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function RuleItem({ type, label, desc }: { type: 'LONG' | 'SHORT', label: string, desc: string }) {
  return (
    <div className="flex gap-4 items-start">
      <span className={cn(
        "px-2 py-0.5 font-mono text-[10px] border",
        type === 'LONG' ? "border-green-500 text-green-600" : "border-red-500 text-red-600"
      )}>
        {label}
      </span>
      <p className="text-stone-600 dark:text-stone-400">{desc}</p>
    </div>
  );
}
