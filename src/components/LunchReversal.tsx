import React, { useState, useCallback, useEffect } from 'react';
import { Upload, Terminal, Crosshair, Activity, ShieldAlert, Zap, Loader2, CloudUpload, CheckCircle2, PlayCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { analyzeChart } from '../lib/gemini';
import { SessionState, AnalysisResult, Trade } from '../types';
import { auth } from '../lib/firebase';
import { uploadScreenshotAndSaveSetup } from '../lib/cloudStorage';
import { addTrade } from '../lib/firestoreService';
import MonteCarloSection from './MonteCarloSection';

export default function LunchReversal({ session, onUpdate }: { 
  session: SessionState, 
  onUpdate: (updates: Partial<SessionState>) => void 
}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [lastImage, setLastImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executedTradeId, setExecutedTradeId] = useState<string | null>(null);
  
  const [logs, setLogs] = useState<string[]>([
    "SYSTEM READY: GROWTH MANDATE ACTIVE.",
    "ANTI-FLIP PROTOCOL: LOCKED.",
    "2-BAR CONFIRMATION: ENFORCED.",
    "AWAITING 10:45-11:15 CHART DATA..."
  ]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toISOString().split('T')[1].split('.')[0]}] ${msg}`]);
  };

  const processImage = useCallback(async (base64String: string) => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    addLog("CHART DETECTED. INITIATING LUNCH HUNTER SPECIALIST...");
    
    try {
      setLastImage(base64String);
      
      // Force strict settings for this module
      const baseInstructions = "PURE PRICE ACTION MANDATE: Focus EXCLUSIVELY on 5-min candlestick H/L/C. Ignore indicators/volume. Anchor levels are 09:30 IB High/Low. Identify Villain Sweep (wick > IB High, close < IB High) or Liquidity Hunt (wick < IB Low, close > IB Low). Enforce 2-Bar Guard for bias changes.";
      const activeTz = session.aiSettings?.lunchTimeZone || session.aiSettings?.screenshotTimezone || 'EST';
      const tzString = `\n\nScreenshot Timezone: ${activeTz}`;
      
      const strictSettings = {
        temperature: 0.0,
        customInstructions: baseInstructions + tzString
      };

      addLog("EXTRACTING OHLC DATA...");
      addLog("EVALUATING SWEEP & RECLAIM CONDITIONS...");
      
      const analysis = await analyzeChart(base64String, strictSettings, session.accountEquity, session.analysisResult);
      
      setResult(analysis);
      onUpdate({ lunchScreenshot: base64String });
      addLog(`ANALYSIS COMPLETE. BIAS: ${analysis.dayType}`);
      if (analysis.sessionLog) {
        addLog(`R/R POTENTIAL: VERIFIED.`);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to analyze chart. Please try again.');
      addLog("ERROR: ANALYSIS FAILED.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [session.accountEquity, session.analysisResult]);

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

  const handleExecuteTrade = async () => {
    if (!result || !auth.currentUser) return;
    
    setIsExecuting(true);
    addLog("EXECUTING LUNCH REVERSAL TRADE...");
    try {
      const isShort = result.dayType?.includes('SHORT') || result.dayType === 'DISTRIBUTION';
      
      let screenshotUrl = '';
      if (lastImage) {
        const uploadResult = await uploadScreenshotAndSaveSetup(auth.currentUser.uid, lastImage, result, 'lunch');
        if (uploadResult) {
          screenshotUrl = uploadResult.url;
          addLog("LUNCH SCREENSHOT LINKED TO TRADE.");
        }
      }

      const trade: Omit<Trade, 'id'> = {
        date: new Date().toISOString().split('T')[0],
        direction: isShort ? 'SHORT' : 'LONG',
        dayType: result.dayType,
        entryPrice: result.suggestedEntry || 0,
        stopPrice: result.suggestedStop || 0,
        targetPrice: result.suggestedTarget || 0,
        contracts: 1, 
        status: 'EXECUTED',
        timestamp: Date.now(),
        screenshotUrl,
      };

      const tradeId = await addTrade(trade);
      if (tradeId) {
        setExecutedTradeId(tradeId);
        addLog(`TRADE EXECUTED SUCCESSFULLY. ID: ${tradeId.slice(0, 8)}...`);
      }
    } catch (e) {
      console.error(e);
      addLog("ERROR: TRADE EXECUTION FAILED.");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSaveToCloud = async () => {
    if (!result || !lastImage) return;
    
    onUpdate({ 
      dayType: result.dayType,
      analysisResult: result
    });

    const user = auth.currentUser;
    if (session.aiSettings?.ragEnabled && user) {
      setIsUploading(true);
      addLog("INITIATING CLOUD UPLOAD FOR RAG DB...");
      try {
        const uploadResult = await uploadScreenshotAndSaveSetup(user.uid, lastImage, result, 'lunch');
        if (uploadResult) {
          setUploadSuccess(true);
          addLog("CLOUD UPLOAD SUCCESSFUL. SETUP INDEXED.");
          setTimeout(() => setUploadSuccess(false), 3000);
        }
      } catch (e) {
        console.error("Failed to upload screenshot to cloud", e);
        addLog("ERROR: CLOUD UPLOAD FAILED.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  // Cyberpunk Orange Theme overrides for this specific component
  const orangeTheme = {
    bg: "bg-black",
    text: "text-orange-500",
    border: "border-orange-600/50",
    accent: "text-orange-600",
    glow: "shadow-[0_0_15px_rgba(234,88,12,0.3)]",
    panel: "bg-orange-950/20"
  };

  return (
    <div className={cn("min-h-[80vh] font-mono p-6 space-y-6", orangeTheme.bg, orangeTheme.text)}>
      
      {/* Header */}
      <header className={cn("border-b pb-4 flex items-center justify-between", orangeTheme.border)}>
        <div>
          <h1 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
            <Zap className="w-6 h-6 text-orange-600 animate-pulse" />
            Lunch Reversal Module v2.1
          </h1>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-xs opacity-70 tracking-widest text-orange-500/80 uppercase">
              | {session.aiSettings?.lunchTimeZone || 'EST'} Analysis Window | Strict Technical Mode |
            </p>
            <div className="flex border border-orange-600/30 bg-orange-950/20 p-0.5">
              <button 
                onClick={() => onUpdate({ aiSettings: { ...(session.aiSettings || {}), lunchTimeZone: 'EST', temperature: session.aiSettings?.temperature ?? 0.1 } })}
                className={cn(
                  "px-2 py-0.5 text-[8px] font-mono transition-colors",
                  (session.aiSettings?.lunchTimeZone || 'EST') === 'EST' ? "bg-orange-600 text-black font-bold" : "text-orange-600/50"
                )}
              >
                EST
              </button>
              <button 
                onClick={() => onUpdate({ aiSettings: { ...(session.aiSettings || {}), lunchTimeZone: 'PST', temperature: session.aiSettings?.temperature ?? 0.1 } })}
                className={cn(
                  "px-2 py-0.5 text-[8px] font-mono transition-colors",
                  session.aiSettings?.lunchTimeZone === 'PST' ? "bg-orange-600 text-black font-bold" : "text-orange-600/50"
                )}
              >
                PST
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 border border-orange-600/30 bg-orange-600/10 text-xs">
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-ping" />
          SYSTEM ACTIVE
        </div>
      </header>

      {/* Projection Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <RibbonItem label="Level Check" value={result?.levelCheck || 'PENDING'} />
        <RibbonItem label="Structure" value={result?.structureStatus || 'PENDING'} />
        <RibbonItem label="R/R Potential" value={result ? '> 2.5:1 (Pure Price)' : 'CALCULATING'} />
        <RibbonItem label="Recal Status" value="LOCKED" highlight />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Upload & Chart */}
        <div className="lg:col-span-2 space-y-6">
          {!result && !isAnalyzing && (
            <div className={cn(
              "border-2 border-dashed p-12 flex flex-col items-center justify-center text-center transition-colors hover:bg-orange-900/10 cursor-pointer",
              orangeTheme.border, orangeTheme.panel
            )}>
              <label className="cursor-pointer w-full h-full flex flex-col items-center">
                <Crosshair className="w-12 h-12 mb-4 text-orange-600 opacity-80" />
                <h3 className="text-lg font-bold uppercase tracking-widest mb-2">Initialize 10:55 Scan</h3>
                <p className="text-xs opacity-60 max-w-xs">Paste or upload a 10:45-11:15 5-minute chart for Dual-Bias Reversal Analysis.</p>
                <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
              </label>
            </div>
          )}

          {isAnalyzing && (
            <div className={cn("h-[400px] flex flex-col items-center justify-center border", orangeTheme.border, orangeTheme.panel, orangeTheme.glow)}>
              <Loader2 className="w-16 h-16 animate-spin text-orange-600 mb-6" />
              <p className="text-sm uppercase tracking-[0.2em] animate-pulse">Processing Neural Matrix...</p>
            </div>
          )}

          {result && lastImage && !isAnalyzing && (
            <div className={cn("border p-2 relative group flex justify-center bg-black/40", orangeTheme.border, orangeTheme.panel)}>
              <img src={lastImage} alt="Analyzed Chart" className="w-full max-h-[400px] object-contain opacity-90" />
              <div className="absolute top-4 left-4 bg-black/80 border border-orange-600/50 px-3 py-1 text-xs backdrop-blur-sm">
                TARGET ACQUIRED: {result.dayType}
              </div>
            </div>
          )}

          {result?.suggestedEntry && (
            <div className="mt-6">
              <MonteCarloSection 
                startPrice={result.suggestedEntry}
                stopPrice={result.suggestedStop}
                targetPrice={result.suggestedTarget20R || result.suggestedTarget}
                targetPrice15R={result.suggestedTarget15R}
              />
            </div>
          )}
        </div>

        {/* Right Column: Output Window */}
        <div className="space-y-6">
          <div className={cn("border h-full flex flex-col", orangeTheme.border, orangeTheme.panel)}>
            <div className={cn("border-b p-2 text-xs uppercase tracking-widest flex items-center gap-2 bg-orange-950/40", orangeTheme.border)}>
              <Terminal className="w-4 h-4" />
              Specialist Execution Log
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-2 text-[10px] leading-relaxed">
              {logs.map((log, i) => (
                <div key={i} className={log.includes('ERROR') ? 'text-red-500' : log.includes('COMPLETE') ? 'text-orange-400 font-bold' : 'opacity-80'}>
                  {log}
                </div>
              ))}
              {isAnalyzing && (
                <div className="animate-pulse opacity-50">_</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Execution Block */}
      {result && !isAnalyzing && (
        <div className={cn("border p-6", orangeTheme.border, orangeTheme.panel, orangeTheme.glow)}>
          <h3 className="text-sm uppercase tracking-widest mb-6 border-b border-orange-600/30 pb-2">Execution Parameters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-[10px] opacity-50 uppercase tracking-widest mb-1">Entry Trigger</p>
              <p className="text-2xl font-black">{result.suggestedEntry || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] opacity-50 uppercase tracking-widest mb-1">Invalidation (Stop)</p>
              <p className="text-2xl font-black text-red-500">{result.suggestedStop || 'N/A'}</p>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] opacity-50 uppercase tracking-widest mb-1">Target 1.5R</p>
                <p className="text-2xl font-black text-green-500">
                  {result.suggestedTarget15R || (result.suggestedEntry && result.suggestedStop ? (result.suggestedEntry > result.suggestedStop ? result.suggestedEntry + (Math.abs(result.suggestedEntry - result.suggestedStop) * 1.5) : result.suggestedEntry - (Math.abs(result.suggestedEntry - result.suggestedStop) * 1.5)) : 'N/A')}
                </p>
              </div>
              <div>
                <p className="text-[10px] opacity-50 uppercase tracking-widest mb-1">Target 2.0R</p>
                <p className="text-2xl font-black text-green-400">
                  {result.suggestedTarget20R || result.suggestedTarget || 'N/A'}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-orange-600/30 text-xs leading-relaxed opacity-90 mb-6">
            <span className="font-bold text-orange-400">REASONING:</span> {result.reasoning}
          </div>

          <div className="flex flex-col gap-3">
            <div className="space-y-2 border border-orange-600/50 bg-orange-950/20 p-4 mb-2 shadow-[0_0_10px_rgba(234,88,12,0.1)] relative overflow-hidden group">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-600"></div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={session.aiSettings?.ragEnabled || false}
                  onChange={e => onUpdate({ aiSettings: { ...(session.aiSettings || {}), temperature: session.aiSettings?.temperature ?? 0.1, ragEnabled: e.target.checked } })}
                  className="w-4 h-4 mt-0.5 accent-orange-600 border-none bg-black"
                />
                <div className="flex-1 space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-widest flex items-center gap-2 text-orange-500">
                    <CloudUpload className="w-4 h-4 text-orange-600 group-hover:animate-bounce" />
                    Enable RAG Storage (Save Analysis to Cloud)
                  </span>
                  <p className="text-[9px] text-orange-500/70 italic leading-relaxed pt-1">
                    Securely upload your screenshot to Firebase and index this setup in your personal vault for continual AI learning.
                  </p>
                </div>
              </label>
            </div>

            <button 
              onClick={handleExecuteTrade} 
              disabled={isExecuting || !!executedTradeId}
              className={cn(
                "w-full font-bold py-4 text-sm transition-all flex items-center justify-center gap-2",
                result.dayType?.includes('SHORT') || result.dayType === 'DISTRIBUTION' ? "bg-red-900/40 text-red-500 border border-red-500/50 hover:bg-red-800/50" : "bg-green-900/40 text-green-500 border border-green-500/50 hover:bg-green-800/50",
                (isExecuting || !!executedTradeId) && "opacity-50 cursor-not-allowed"
              )}
            >
              {isExecuting ? <Loader2 className="w-5 h-5 animate-spin" /> : executedTradeId ? <CheckCircle2 className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
              {executedTradeId ? "TRADE EXECUTED" : "EXECUTE REVERSAL TRADE"}
            </button>
            <button 
              onClick={handleSaveToCloud} 
              disabled={isUploading}
              className="w-full bg-orange-600 hover:bg-orange-500 text-black font-bold py-4 text-sm transition-colors flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Uploading to RAG Vault...</>
              ) : uploadSuccess ? (
                <><CheckCircle2 className="w-5 h-5" /> Saved Successfully!</>
              ) : session.aiSettings?.ragEnabled ? (
                <><CloudUpload className="w-5 h-5" /> Confirm, Lock & Save to Cloud</>
              ) : (
                "Confirm & Lock Setup"
              )}
            </button>
            <button 
              onClick={() => { setResult(null); setLastImage(null); }} 
              className="w-full border border-orange-600/50 hover:bg-orange-600/10 text-orange-500 py-3 text-xs transition-colors" 
              disabled={isUploading}
            >
              Clear & Restart Scan
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

function RibbonItem({ label, value, highlight }: { label: string, value: string, highlight?: boolean }) {
  return (
    <div className="border border-orange-600/30 bg-orange-950/20 p-3 flex flex-col justify-center">
      <span className="text-[9px] uppercase tracking-widest opacity-50 mb-1">{label}</span>
      <span className={cn("text-sm font-bold tracking-wider", highlight ? "text-orange-400" : "text-orange-500")}>
        {value}
      </span>
    </div>
  );
}
