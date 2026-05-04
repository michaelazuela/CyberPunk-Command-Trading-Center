import React, { useState, useEffect, useCallback } from 'react';
import { Upload, XCircle, Settings2, Sliders, ChevronDown, ChevronUp, Brain, Sparkles, Target, Shield, Zap, Moon, CheckCircle2, CloudUpload, Cpu } from 'lucide-react';
import { SessionState, AnalysisResult, ProposedRule, Trade, AISettings } from '../types';
import { analyzeChart, preCheckChartInfo, type OCRResult } from '../lib/gemini';
import { uploadScreenshotAndSaveSetup } from '../lib/cloudStorage';
import { supabase } from '../lib/supabase';
import { addTrade } from '../lib/firestoreService';
import MonteCarloSection from './MonteCarloSection';
import MidnightAnalysisView from './MidnightAnalysisView';
import { cn, getImageFromClipboard } from '../lib/utils';
import AgentAnimation from './AgentAnimation';
import AgentMatrix from './AgentMatrix';
import AnalysisProgress, { ProgressStep, StepStatus } from './AnalysisProgress';
import ModelConfigPanel from './ModelConfigPanel';
import ApiCostPanel from './ApiCostPanel';
import { loadModelConfig, saveModelConfig, ModelConfig, getModelForRoute } from '../lib/modelRouter';
import { TIME_WINDOWS, getWindowStatus, formatWindow, minutesUntilOpen, minutesUntilClose, formatNYTimeStr } from '../config/timeWindows';

import TradeProofPanel from './TradeProofPanel';

export default function Analysis({ session, customRules = [], onUpdate, onAddTrade }: { 
  session: SessionState, 
  customRules?: ProposedRule[],
  onUpdate: (updates: Partial<SessionState>) => void,
  onAddTrade?: (trade: Omit<Trade, 'id' | 'timestamp'>) => void 
}) {
  const [proofFlow, setProofFlow] = useState<{ active: boolean, outcome?: 'SUCCESS' | 'FAILED' }>({ active: false });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPreChecking, setIsPreChecking] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [lastImage, setLastImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showChainOfThought, setShowChainOfThought] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [localSettings, setLocalSettings] = useState<AISettings>(session.aiSettings || { temperature: 0.1, customInstructions: '' });

  const [midnightOpenOverrideStr, setMidnightOpenOverrideStr] = useState<string>('');
  const [useManualMidnightOpen, setUseManualMidnightOpen] = useState(false);

  const [windowStatus, setWindowStatus] = useState<"active"|"too_early"|"too_late"|"weekend">("active");
  const [timeStr, setTimeStr] = useState("");
  
  useEffect(() => {
    const updateTime = () => {
      setWindowStatus(getWindowStatus('morning'));
      setTimeStr(formatNYTimeStr());
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const [modelConfig, setModelConfig] = useState<ModelConfig>(loadModelConfig());

  const handleConfigChange = (newConfig: ModelConfig) => {
    setModelConfig(newConfig);
    saveModelConfig(newConfig);
  };

  const [executionQuantity, setExecutionQuantity] = useState(1);
  const [executionDirection, setExecutionDirection] = useState<'LONG'|'SHORT'>('LONG');
  const [isSavingTrade, setIsSavingTrade] = useState(false);
  const [tradeSavedMessage, setTradeSavedMessage] = useState<string|null>(null);
  const [setupId, setSetupId] = useState<string|null>(null);

  useEffect(() => {
    if (result) {
       if (result.dayType?.includes('LONG')) setExecutionDirection('LONG');
       else if (result.dayType?.includes('SHORT')) setExecutionDirection('SHORT');
    }
  }, [result]);

  const handleSaveTrade = async (manualOutcome?: 'SUCCESS' | 'FAILED', proofData?: Partial<Trade>) => {
    if (!onAddTrade || !result) return;
    setIsSavingTrade(true);
    setTradeSavedMessage(null);
    try {
      const status = manualOutcome === 'SUCCESS' ? 'SUCCESSFUL' : manualOutcome === 'FAILED' ? 'FAILED' : 'OPEN';
      const tradeData: Omit<Trade, 'id' | 'timestamp'> = {
        date: new Date().toISOString().split('T')[0],
        direction: executionDirection,
        dayType: result.dayType,
        entryPrice: result.suggestedEntry || 0,
        stopPrice: result.suggestedStop || 0,
        targetPrice: result.suggestedTarget || 0,
        contracts: executionQuantity,
        status,
        manualOutcome,
        notes: `From Morning analysis.\nReasoning: ${result.reasoning}`,
        screenshotUrl: lastImage || undefined,
        analysisType: 'morning',
        analysisConfidence: result.confidence,
        analysisReasoning: result.reasoning,
        setupTags: result.tags || [],
        outcomeLabel: manualOutcome,
        setupId: setupId || undefined,
        ...proofData // Inject proof data if available
      };
      
      await onAddTrade(tradeData);

      if (setupId && manualOutcome) {
         try {
           const { updateRAGWithTradeResult } = await import('../lib/rag');
           await updateRAGWithTradeResult(
             setupId,
             manualOutcome === 'SUCCESS' ? 'win' : 'loss',
             proofData?.pnlTicks || undefined,
             proofData?.pnlDollars || undefined,
             result.suggestedEntry, // or actual entry
             undefined, // actual exit
             proofData?.gemini_verdict as any || undefined,
             proofData?.proof_screenshot_url || undefined
           );
         } catch (e) {
           console.error("[RAG] Error updating trade result", e);
         }
      }

      setTradeSavedMessage(proofData ? "Trade and proof saved ✓" : "Trade saved to history.");
      setProofFlow({ active: false });
      setTimeout(() => setTradeSavedMessage(null), 3000);
    } catch(err) {
      console.error(err);
      setTradeSavedMessage("Error saving trade");
      setTimeout(() => setTradeSavedMessage(null), 3000);
    } finally {
      setIsSavingTrade(false);
    }
  };

  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [progressStart, setProgressStart] = useState<number | null>(null);

  const updateStep = useCallback((id: string, status: StepStatus, errorMessage?: string) => {
    setProgressSteps(prev => prev.map(s => s.id === id ? { ...s, status, errorMessage } : s));
  }, []);

  const initProgress = useCallback(() => {
    setProgressSteps([
      { id: 'received', label: 'Image received', status: 'complete' },
      { id: 'prep', label: 'Preparing screenshot', status: 'active' },
      { id: 'extract', label: 'Extracting chart metadata', status: 'pending' },
      { id: 'confirm', label: 'Waiting for confirmation', status: 'pending' },
      { id: 'send', label: 'Sending chart to Gemini', status: 'pending' },
      { id: 'strategy', label: 'Running strategy analysis', status: 'pending' },
      { id: 'risk', label: 'Running risk audit', status: 'pending' },
      { id: 'save', label: 'Saving setup to Supabase', status: 'pending' },
      { id: 'complete', label: 'Complete', status: 'pending' }
    ]);
    setProgressStart(Date.now());
  }, []);

  const processImage = useCallback(async (base64String: string) => {
    if (isPreChecking || isAnalyzing) return;
    setIsPreChecking(true);
    setError(null);
    setResult(null);
    setOcrResult(null);
    setPendingImage(base64String);
    initProgress();
    
    try {
      updateStep('prep', 'complete');
      updateStep('extract', 'active');
      const ocrModel = getModelForRoute("ocr", modelConfig);
      const ocr = await preCheckChartInfo(base64String, "ocr", ocrModel);
      ocr.timezone = session.aiSettings?.morningTimeZone || session.aiSettings?.screenshotTimezone || 'EST';
      setOcrResult(ocr);
      updateStep('extract', 'complete');
      updateStep('confirm', 'active');
    } catch (err: any) {
      console.error("OCR Pre-check failed:", err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Missing Gemini API key') || msg.includes('API key not valid')) {
         setError(msg);
      }
      updateStep('extract', 'warning', `OCR failed: ${msg}. You can continue analysis if desired.`);
      updateStep('confirm', 'active');
    } finally {
      setIsPreChecking(false);
    }
  }, [session.aiSettings, isPreChecking, isAnalyzing, initProgress, updateStep, modelConfig]);

  const startFullAnalysis = useCallback(async (isDeepReviewParam?: boolean | React.MouseEvent) => {
    const isDeepReview = isDeepReviewParam === true;
    const imgSource = isDeepReview ? lastImage : pendingImage;
    if (!imgSource) return;
    
    if (import.meta.env.DEV) console.log('[Analysis] Starting full analysis, isDeepReview:', isDeepReview);

    // reset steps if deep review
    if (isDeepReview) {
       initProgress();
    }
    
    setIsAnalyzing(true);
    setError(null);
    
    if (!isDeepReview) {
      updateStep('confirm', 'complete');
    }
    
    try {
      if (!isDeepReview) {
         setLastImage(pendingImage);
      }
      
      const routeName = isDeepReview ? "deep_review" : "morning";
      const modelToUse = getModelForRoute(routeName, modelConfig);
      
      if (import.meta.env.DEV) {
        console.log(`[GEMINI DEBUG] Starting API call`);
        console.log(`[GEMINI DEBUG] Model: ${modelToUse}`);
      }

      // Compression step
      updateStep('send', 'active');
      setProgressSteps(prev => prev.map(s => s.id === 'send' ? { ...s, label: 'Compressing image' } : s));
      
      let imgToSend = imgSource;
      try {
        if (import.meta.env.DEV) console.log(`[GEMINI DEBUG] Image size before compression: ${Math.round(imgSource.length / 1024)} KB`);
        imgToSend = await import('../lib/cloudStorage').then(m => m.compressImage(imgSource, 1280, 0.7));
        if (import.meta.env.DEV) console.log(`[GEMINI DEBUG] Image size after compression: ${Math.round(imgToSend.length / 1024)} KB`);
      } catch (err) {
        console.warn("Failed to compress image, using original", err);
      }

      const approvedRulesText = (customRules || []).filter(r => r.status === 'APPROVED').map(r => `- ${r.rule}`).join('\n');
      const ocrOverrideText = (!isDeepReview && ocrResult) ? `\n[OPERATOR OVERRIDE DATA]\nTicker: ${ocrResult.ticker || 'N/A'}\nTimeframe: ${ocrResult.timeframe || 'N/A'}\nCurrent Price: ${ocrResult.currentPrice || 'N/A'}\nTimestamp: ${ocrResult.lastTimestamp || 'N/A'}\nScreenshot Timezone: ${ocrResult.timezone || 'EST'}\n` : '';
      const analysisSettings = {
        ...localSettings,
        customInstructions: `${localSettings.customInstructions}\n${ocrOverrideText}\nAPPROVED STRATEGY REFINEMENTS:\n${approvedRulesText}`.trim()
      };
      
      let analysis: any = null;
      let attempt = 0;
      const maxAttempts = 3;
      let lastGeminiError: any = null;
      const globalStartTime = Date.now();

      while (attempt < maxAttempts) {
        attempt++;
        if (import.meta.env.DEV) {
          console.log(`[GEMINI DEBUG] Timeout: 120000ms`);
          console.log(`[GEMINI DEBUG] Attempt: ${attempt}/${maxAttempts}`);
        }
        
        setProgressSteps(prev => prev.map(s => s.id === 'send' ? { ...s, label: attempt > 1 ? `Sending chart to Gemini (attempt ${attempt}/${maxAttempts})` : 'Sending chart to Gemini' } : s));
        
        try {
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('TIMEOUT')), 120000);
          });
          
          const geminiPromise = analyzeChart(imgToSend, analysisSettings, session.accountEquity, session.analysisResult, undefined, routeName, modelToUse, useManualMidnightOpen ? midnightOpenOverrideStr : undefined);
          
          analysis = await Promise.race([geminiPromise, timeoutPromise]);
          const elapsed = ((Date.now() - globalStartTime) / 1000).toFixed(1);
          if (import.meta.env.DEV) console.log(`[GEMINI DEBUG] Response received in ${elapsed}s`);
          
          lastGeminiError = null;
          break; // success
        } catch (err: any) {
          const errMsg = err.message || String(err);
          const elapsed = ((Date.now() - globalStartTime) / 1000).toFixed(1);
          if (import.meta.env.DEV) console.log(`[GEMINI DEBUG] Attempt ${attempt} failed after ${elapsed}s: ${errMsg}`);
          
          lastGeminiError = err;
          // check for retryable errors
          if (errMsg.includes('429') || errMsg.includes('503') || errMsg.includes('TIMEOUT') || errMsg.includes('fetch failed')) {
            if (attempt < maxAttempts) {
              const delay = attempt === 1 ? 2000 : attempt === 2 ? 5000 : 10000;
              await new Promise(r => setTimeout(r, delay));
              continue;
            }
          }
          break; // break immediately on other errors or if out of attempts
        }
      }

      if (lastGeminiError) {
        const errMsg = lastGeminiError.message || String(lastGeminiError);
        const elapsed = ((Date.now() - globalStartTime) / 1000).toFixed(1);
        
        let finalErrorText = `Analysis timed out after ${maxAttempts} attempts. Possible causes: large image, slow Gemini response, or rate limiting. Failed after ${elapsed}s.`;
        if (errMsg.includes('429')) {
          finalErrorText = 'Rate limited by Gemini API. Please wait before retrying.';
        } else if (!errMsg.includes('TIMEOUT')) {
          finalErrorText = `API Error: ${errMsg}`;
        }
        
        throw new Error(finalErrorText);
      }

      updateStep('send', 'complete');
      updateStep('strategy', 'complete');
      updateStep('risk', 'complete');
      updateStep('save', 'active');

      const { computePriorityScore } = await import('../lib/priorityScore');
      const priorityContext = {
        instrument: 'MES', // Default
        dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
        rthVsMidnight: analysis.rthVsMidnight,
        retraceProbability: analysis.retraceProbability || undefined,
        ibPosition: undefined, // Need more OCR context for exact IB pos
        ocrTimestampDelta: analysis.ocrTimestampDelta,
        sessionType: 'morning' as const,
        geminiConfidence: analysis.confidence,
        similarSetups: analysis.similarSetups
      };
      analysis.priorityResult = computePriorityScore(priorityContext);

      setResult(analysis);
      
      try {
        if (import.meta.env.DEV) console.log('[Analysis] Supabase save started');
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser?.id) {
           const setupData = await import('../lib/cloudStorage').then(m => m.uploadScreenshotAndSaveSetup(authUser.id, imgToSend, analysis, 'morning', ocrResult)); 
           if (import.meta.env.DEV) console.log('[Analysis] Supabase save complete');
           if (setupData?.id) setSetupId(setupData.id);
           updateStep('save', 'complete');

           // Call RAG save
           const { saveToRAG } = await import('../lib/rag');
           await saveToRAG({
             sessionType: 'morning',
             instrument: 'MES',
             tradeDate: new Date().toLocaleDateString('en-US'),
             dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
             midnightOpenPrice: analysis.midnightOpenPrice,
             rthVsMidnight: analysis.rthVsMidnight,
             retraceProbability: analysis.retraceProbability,
             geminiConfidence: analysis.confidence,
             geminiAnalysisJson: analysis,
             ocrText: ocrResult?.text,
             screenshotUrl: setupData?.url,
             setupId: setupData?.id,
             tradeResult: 'pending',
             midnightOpenSource: analysis.midnightOpenSource
           });
        } else {
           if (import.meta.env.DEV) console.log('[Analysis] User not authenticated, skipping save');
           updateStep('save', 'warning', 'Analysis complete. Cloud save skipped: user not authenticated.');
        }
      } catch (saveErr: any) {
        console.error('[Analysis] Supabase save error:', saveErr);
        updateStep('save', 'warning', 'Analysis complete, cloud save failed: ' + (saveErr.message || String(saveErr)));
      }
      
      updateStep('complete', 'complete');
      onUpdate({ morningScreenshot: imgSource, analysisResult: analysis, dayType: analysis.dayType });
      
      if (!isDeepReview) {
         setPendingImage(null);
         setOcrResult(null);
      }
    } catch (err: any) {
      console.error('[Analysis] Gemini error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      updateStep('send', 'error', msg);
      updateStep('strategy', 'warning', 'Skipped');
      updateStep('risk', 'warning', 'Skipped');
      updateStep('save', 'warning', 'Skipped');
      updateStep('complete', 'warning', 'Halted');
    } finally {
      setIsAnalyzing(false);
    }
  }, [pendingImage, lastImage, localSettings, session.accountEquity, session.analysisResult, customRules, ocrResult, onUpdate, updateStep, modelConfig, initProgress]);

  const handleImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => processImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            const blob = await item.getType(type);
            const file = new File([blob], "paste.png", { type });
            handleImageFile(file);
            return;
          }
        }
      }
      setError("No image found in clipboard");
    } catch {
      setError("Use Ctrl+V / Cmd+V to paste directly");
    }
  };

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    // Ignore paste if user is typing in an input or textarea
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || (activeElement as HTMLElement).isContentEditable)) {
      return;
    }

    try {
      const imageData = await getImageFromClipboard(e);
      if (imageData) {
        processImage(imageData);
      }
    } catch (error) {
      console.error('Paste screenshot failed:', error);
      setError(error instanceof Error ? error.message : 'Could not paste screenshot.');
    }
  }, [processImage]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const saveSettings = () => {
    onUpdate({ aiSettings: localSettings });
    setShowSettings(false);
  };

  return (
    <div className="space-y-6 fade-up">
      {windowStatus === 'active' && (
        <div className="border border-[var(--orange)] bg-[var(--orange)]/10 text-[var(--orange)] p-3 text-[11px] font-mono flex flex-col gap-1 rounded-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--orange)] inline-block"></span>
            <strong>MORNING WINDOW ACTIVE • Closes in {minutesUntilClose('morning')} min</strong>
          </div>
          <span className="text-[10px] opacity-80">Upload 5-min chart: 9:30 open → 10:10 candle close. Include midnight open level (horizontal line on NinjaTrader chart).</span>
        </div>
      )}
      {windowStatus === 'too_early' && (
        <div className="border border-[var(--b2)] bg-[var(--b0)] text-[var(--txt2)] p-3 text-[11px] font-mono flex flex-col gap-1 rounded-sm">
          <strong>⏳ MORNING WINDOW OPENS IN {minutesUntilOpen('morning')} min</strong>
          <span className="text-[10px]">Upload your 5-min chart after 9:30 AM. Current time: {timeStr}</span>
        </div>
      )}
      {windowStatus === 'too_late' && (
        <div className="border border-[var(--rd-b)] bg-[var(--rd-d)] text-[var(--red)]/80 p-3 text-[11px] font-mono flex flex-col gap-1 rounded-sm">
          <strong>✕ MORNING WINDOW CLOSED</strong>
          <span className="text-[10px]">Next: Lunch Reversal opens at {TIME_WINDOWS.lunch.openHour > 12 ? TIME_WINDOWS.lunch.openHour - 12 : TIME_WINDOWS.lunch.openHour}:{TIME_WINDOWS.lunch.openMinute} PM ET</span>
        </div>
      )}
      {windowStatus === 'weekend' && (
        <div className="border border-[var(--b2)] bg-[var(--b0)] text-[var(--txt2)] p-3 text-[11px] font-mono rounded-sm">
          <strong>○ MARKET CLOSED • Next session: Monday 9:30 AM ET</strong>
        </div>
      )}

      <header className="page-header">
        <div>
          <h1>Morning Analysis</h1>
          <p>9:30–10:10 AM CHART REVIEW · STRICT TECHNICAL MODE</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[var(--s2)] p-0.5 border border-[var(--b1)] rounded-sm">
            <button 
              onClick={() => onUpdate({ aiSettings: { ...(session.aiSettings || { temperature: 0.1 }), morningTimeZone: 'EST' } })}
              className={cn("px-2 py-0.5 text-[9px] font-mono transition-colors", (session.aiSettings?.morningTimeZone || 'EST') === 'EST' ? "bg-[var(--b2)] text-[var(--txt)] font-bold" : "text-[var(--txt2)]")}
            >EST</button>
            <button 
              onClick={() => onUpdate({ aiSettings: { ...(session.aiSettings || { temperature: 0.1 }), morningTimeZone: 'PST' } })}
              className={cn("px-2 py-0.5 text-[9px] font-mono transition-colors", session.aiSettings?.morningTimeZone === 'PST' ? "bg-[var(--b2)] text-[var(--txt)] font-bold" : "text-[var(--txt2)]")}
            >PST</button>
          </div>
          <button onClick={() => setShowSettings(!showSettings)} className={cn("p-1.5 border border-[var(--b1)] transition-colors text-[var(--txt2)] hover:text-[var(--txt)] rounded-sm", showSettings && "bg-[var(--txt)] text-[var(--bg)]")}>
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      <ApiCostPanel route="morning" />
      <ModelConfigPanel route="morning" config={modelConfig} onChange={handleConfigChange} />

      {showSettings && (
        <div className="card-base fade-up">
           <div className="card-header border-b border-[var(--b0)] pb-2 mb-4">
              <span className="flex items-center gap-2"><Sliders className="w-3 h-3" /> AI Model Parameters</span>
           </div>
           <div className="space-y-4">
             {/* Settings Fields - Kept simpler for brevity, matching previous functionality */}
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase text-[var(--txt2)]">Temperature: <span className="text-[var(--orange)]">{localSettings.temperature}</span></label>
                  <input type="range" min="0" max="1" step="0.1" value={localSettings.temperature} onChange={e => setLocalSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))} className="w-full accent-[var(--orange)]" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase text-[var(--txt2)]">VIX Level</label>
                  <input type="number" step="0.1" value={localSettings.vixLevel || ''} onChange={e => setLocalSettings(prev => ({ ...prev, vixLevel: parseFloat(e.target.value) || undefined }))} className="w-full bg-[var(--bg)] border border-[var(--b1)] p-2 font-mono text-[10px]" />
                </div>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase text-[var(--txt2)]">Custom Instructions</label>
                <textarea value={localSettings.customInstructions} onChange={e => setLocalSettings(prev => ({ ...prev, customInstructions: e.target.value }))} className="w-full bg-[var(--bg)] border border-[var(--b1)] p-2 font-mono text-[10px] h-20" />
             </div>
             <div className="flex gap-4 pt-2">
               <button onClick={saveSettings} className="qd-btn-primary">Save Parameters</button>
               <button onClick={() => setShowSettings(false)} className="qd-btn-ghost">Cancel</button>
             </div>
           </div>
        </div>
      )}

      {error && (
        <div className="border border-[var(--rd-b)] bg-[var(--rd-d)] text-[var(--red)] p-4 text-[10px] font-mono flex items-center gap-2 fade-up">
          <XCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {(isPreChecking || isAnalyzing || pendingImage) && progressSteps.length > 0 && (
         <AnalysisProgress steps={progressSteps} startTime={progressStart} className="mb-6 fade-up" />
      )}

      {!result && !isAnalyzing && !isPreChecking && !pendingImage && (
        <div className="space-y-6 fade-up">
          {/* Full-width upload zone */}
          <div className="upload-zone">
            <Upload className="w-6 h-6 text-[var(--txt3)] mb-4 upload-icon transition-colors" />
            <h3 className="text-[12px] font-mono font-bold text-[var(--orange)] uppercase tracking-widest mb-1">Initialize Analysis</h3>
            <p className="text-[9px] text-[var(--txt2)] mb-6">Select a chart screenshot or paste from clipboard.</p>
            <div className="flex gap-4 mb-6">
              <label className="qd-btn-primary cursor-pointer">
                Select File
                <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
              </label>
              <button className="qd-btn-ghost" onClick={handlePasteFromClipboard}>Paste Screenshot</button>
            </div>
            
            <div className="w-full max-w-sm mt-4 p-4 border border-[var(--b2)] bg-[var(--b0)] rounded text-left">
              <label className="text-[10px] font-mono text-[var(--txt2)] uppercase block mb-3" title="The 12:00 AM ET candle open price shown as a horizontal line on your NinjaTrader chart">
                Midnight Open Level (optional)
              </label>
              <div className="flex flex-col gap-2 text-[11px] font-mono">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={!useManualMidnightOpen} onChange={() => setUseManualMidnightOpen(false)} className="accent-[var(--orange)]" />
                  <span className={!useManualMidnightOpen ? 'text-[var(--orange)] font-bold' : 'text-[var(--txt2)]'}>Auto (let Gemini read from chart)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={useManualMidnightOpen} onChange={() => setUseManualMidnightOpen(true)} className="accent-[var(--orange)]" />
                  <span className={useManualMidnightOpen ? 'text-[var(--orange)] font-bold' : 'text-[var(--txt2)]'}>Manual entry:</span>
                  {useManualMidnightOpen && (
                    <input 
                      type="text" 
                      placeholder="e.g. 5821.25" 
                      value={midnightOpenOverrideStr} 
                      onChange={e => setMidnightOpenOverrideStr(e.target.value)}
                      className="ml-2 w-24 bg-[var(--bg)] border border-[var(--b2)] px-2 py-0.5 rounded text-[10px]"
                    />
                  )}
                </label>
              </div>
              <p className="text-[9px] text-[var(--txt3)] mt-3 leading-tight">If Gemini misreads the level, enter the correct price here. The manual value overrides the OCR-detected value.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card-base flex flex-col">
              <div className="card-header text-[var(--orange)]">
                <span>Classification Rules</span>
              </div>
              <div className="space-y-[1px] bg-[var(--b0)]">
                <div className="bg-[var(--s1)] p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="qd-badge qd-badge-green">TYPE 1</span>
                    <span className="font-mono text-[10px] text-[var(--txt)]">Large Green 9:30 + HH/HL</span>
                  </div>
                  <p className="text-[9px] text-[var(--orange)] mb-1 pl-1 border-l-2 border-[var(--orange)] ml-1">› Sweep & Reclaim: wick below 9:30 low + reclaim</p>
                  <p className="text-[9px] text-[var(--txt2)] pl-1 border-l-2 border-transparent ml-1">› High confidence: 5M close above 9:30 high</p>
                </div>
                <div className="bg-[var(--s1)] p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="qd-badge qd-badge-orange">TYPE 2</span>
                    <span className="font-mono text-[10px] text-[var(--txt)]">Doji 9:30 + Large Green 9:35</span>
                  </div>
                </div>
                <div className="bg-[var(--s1)] p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="qd-badge qd-badge-red">TYPE 3</span>
                    <span className="font-mono text-[10px] text-[var(--txt)]">Large Red 9:30 + LH/LL</span>
                  </div>
                  <p className="text-[9px] text-[var(--red)] mb-1 pl-1 border-l-2 border-[var(--red)] ml-1">› Sweep & Reclaim: wick above 9:30 high + reclaim</p>
                  <p className="text-[9px] text-[var(--txt2)] pl-1 border-l-2 border-transparent ml-1">› High confidence: 5M close below 9:30 low</p>
                </div>
                <div className="bg-[var(--s1)] p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="qd-badge qd-badge-amber">TYPE 4</span>
                    <span className="font-mono text-[10px] text-[var(--txt)]">Gap up + Immediate rejection</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-base flex flex-col">
              <div className="card-header">
                <span>Targeting Algorithms</span>
                <span className="qd-badge qd-badge-orange">V1.2</span>
              </div>
              <div className="flex-1 flex flex-col justify-center gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[var(--txt2)]">Standard Setup</span>
                  <span className="text-[10px] font-mono text-[var(--txt)]">2.0R FIXED</span>
                </div>
                <div className="flex items-center justify-between border-t border-[var(--b0)] pt-3">
                  <span className="text-[10px] font-mono text-[var(--txt2)]">High Vol. (Stop&gt;15pts)</span>
                  <span className="text-[10px] font-mono text-[var(--orange)]">1.5R CONSERVATIVE</span>
                </div>
                <div className="flex items-center justify-between border-t border-[var(--b0)] pt-3">
                  <span className="text-[10px] font-mono text-[var(--txt2)]">Sweep & Reclaim</span>
                  <span className="text-[10px] font-mono text-[var(--green)]">9:30 EXTREME (T1)</span>
                </div>
                <div className="flex items-center justify-between border-t border-[var(--b0)] pt-3">
                  <span className="text-[10px] font-mono text-[var(--txt2)]">High Risk Setup</span>
                  <span className="text-[10px] font-mono text-[var(--amber)]">ORDER BLOCK (61.8%)</span>
                </div>
              </div>
              <p className="text-[9px] italic text-[var(--txt2)] mt-6 pt-4 border-t border-[var(--b0)]">
                AI adjusts targets based on R/R dynamics
              </p>
            </div>
          </div>
        </div>
      )}

      {/* OCR/Analysis Running/Results UI ... */}
      {!isPreChecking && pendingImage && ocrResult && !isAnalyzing && !result && (
        <div className="card-base fade-up">
           {/* OCR Verification UI */}
           <div className="card-header">
              <span>OCR Verification</span>
           </div>
           <div className="grid grid-cols-2 gap-4 mb-4">
              <input value={ocrResult.ticker || ''} onChange={(e) => setOcrResult({ ...ocrResult, ticker: e.target.value })} className="bg-[var(--bg)] border border-[var(--b1)] p-2 font-mono text-[10px]" placeholder="Ticker" />
              <input value={ocrResult.currentPrice || ''} onChange={(e) => setOcrResult({ ...ocrResult, currentPrice: parseFloat(e.target.value) || undefined })} type="number" className="bg-[var(--bg)] border border-[var(--b1)] p-2 font-mono text-[10px]" placeholder="Price" />
           </div>
           <div className="flex gap-4">
              <button onClick={startFullAnalysis} className="qd-btn-primary">Confirm & Analyze</button>
              <button onClick={() => { setPendingImage(null); setOcrResult(null); }} className="qd-btn-ghost">Cancel</button>
           </div>
        </div>
      )}

      {isAnalyzing && pendingImage && (
        <div className="card-base flex justify-center p-2 bg-[#000] fade-up mt-4">
           <img src={pendingImage} alt="Analysis Progress" className="max-h-[400px] object-contain opacity-70" referrerPolicy="no-referrer" />
        </div>
      )}

      {result && !isAnalyzing && (
        <div className="space-y-6 fade-up">
          {/* Add result render matching the new styles (simplified for context length) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card-base flex flex-col items-center justify-center py-12">
               <span className="text-[10px] font-mono uppercase text-[var(--txt2)] mb-2">DAY TYPE CLASSIFICATION</span>
               <span className={cn("text-3xl font-black italic tracking-tighter uppercase mb-4", result.dayType?.includes('LONG') ? "text-[var(--green)]" : result.dayType?.includes('SHORT') ? "text-[var(--red)]" : "text-[var(--amber)]")}>
                 {result.dayType}
               </span>
               <span className="qd-badge qd-badge-orange">CONFIDENCE: {(result.confidence * 100).toFixed(0)}%</span>
            </div>
            
            <div className="card-base flex flex-col justify-center gap-4">
              <div className="flex justify-between items-center bg-[var(--s2)] p-4 border border-[var(--b1)]">
                 <span className="text-[10px] font-mono text-[var(--txt2)] uppercase">ENTRY SIGNAL</span>
                 <span className="text-[16px] font-mono font-bold text-[var(--txt)]">{result.suggestedEntry}</span>
              </div>
              <div className="flex justify-between items-center bg-[var(--s2)] p-4 border border-[var(--b1)]">
                 <span className="text-[10px] font-mono text-[var(--txt2)] uppercase">STOP LOSS</span>
                 <span className="text-[16px] font-mono font-bold text-[var(--red)]">{result.suggestedStop}</span>
              </div>
              <div className="flex justify-between items-center bg-[var(--s2)] p-4 border border-[var(--b1)]">
                 <span className="text-[10px] font-mono text-[var(--txt2)] uppercase">TARGET (2R)</span>
                 <span className="text-[16px] font-mono font-bold text-[var(--green)]">{result.suggestedTarget20R || result.suggestedTarget}</span>
              </div>
            </div>
          </div>
          
          {result.priorityResult && (
            <div className="card-base flex flex-col p-4 mb-4" style={{ borderColor: result.priorityResult.color }}>
              <div className="flex justify-between items-center mb-3">
                <span className="text-[12px] font-mono font-bold uppercase" style={{ color: result.priorityResult.color }}>
                  SETUP PRIORITY SCORE
                </span>
                <span className="text-[14px] font-mono font-bold" style={{ color: result.priorityResult.color }}>
                  {result.priorityResult.score.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="qd-badge" style={{ backgroundColor: result.priorityResult.color + '20', color: result.priorityResult.color, border: 'none' }}>
                  {result.priorityResult.label}
                </span>
              </div>
              <div className="text-[10px] text-[var(--txt2)] mt-2 font-mono flex flex-col gap-1">
                <div className="flex justify-between"><span>Midnight Open:</span><span>{(result.priorityResult.breakdown.midnight * 4).toFixed(2)} / 1.0</span></div>
                <div className="flex justify-between"><span>Initial Balance:</span><span>{(result.priorityResult.breakdown.initialBalance * 5).toFixed(2)} / 1.0</span></div>
                <div className="flex justify-between"><span>Session Timing:</span><span>{(result.priorityResult.breakdown.timing * 6.66).toFixed(2)} / 1.0</span></div>
                <div className="flex justify-between"><span>Confidence:</span><span>{(result.priorityResult.breakdown.confidence * 4).toFixed(2)} / 1.0</span></div>
                {result.priorityResult.breakdown.historical !== undefined && (
                  <div className="flex justify-between text-[var(--blue)]"><span>Historical Perf:</span><span>{(result.priorityResult.breakdown.historical * 6.66).toFixed(2)} / 1.0</span></div>
                )}
              </div>
            </div>
          )}

          {/* RAG Context Display */}
          <div className="card-base flex flex-col p-4 mb-4 border border-[var(--b2)]">
            <h3 className="text-[11px] font-mono font-bold text-[var(--txt)] mb-3">HISTORICAL RAG CONTEXT</h3>
            {result.similarSetups && result.similarSetups.length > 0 ? (
              <div className="flex flex-col gap-3">
                <p className="text-[10px] text-[var(--txt2)]">Found {result.similarSetups.length} similar past setups:</p>
                {result.similarSetups.map((setup: any, idx: number) => (
                  <div key={setup.id} className="bg-[var(--bg)] p-2 rounded border border-[var(--b1)] flex flex-col gap-1">
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-[var(--txt)] font-bold">Setup {idx + 1} ({Math.round(setup.similarity * 100)}% match)</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] ${setup.tradeResult === 'win' ? 'bg-[var(--green)]/10 text-[var(--green)]' : setup.tradeResult === 'loss' ? 'bg-[var(--red)]/10 text-[var(--red)]' : 'bg-[var(--b2)] text-[var(--txt2)]'}`}>
                        {(setup.tradeResult || 'PENDING').toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[9px] text-[var(--txt2)] flex justify-between">
                      <span>{setup.tradeDate} - {setup.sessionType}</span>
                      <span>PnL: {setup.pnlTicks || 0} ticks</span>
                    </div>
                    <div className="text-[9px] text-[var(--txt3)] truncate">
                      Midnight: {setup.rthVsMidnight || 'unknown'} | IB: {setup.ibPosition || 'unknown'}
                    </div>
                  </div>
                ))}
                {result.priorityResult?.historicalWinRate !== undefined && (
                  <div className="mt-2 p-2 bg-[var(--blue)]/10 border border-[var(--blue)]/30 text-[var(--blue)] text-[10px] font-mono rounded">
                    <strong>Pattern Insight:</strong> {Math.round(result.priorityResult.historicalWinRate * 100)}% historical win rate. Avg PnL: {result.priorityResult.historicalAvgPnl?.toFixed(1)} ticks.
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[10px] text-[var(--txt2)] italic leading-relaxed">
                No similar past setups found. Your trade history will improve future recommendations.
              </p>
            )}
          </div>

          <MidnightAnalysisView analysis={result.midnightAnalysis} />


          {lastImage && (
            <div className="card-base flex justify-center p-2 bg-[#000]">
              <img src={lastImage} alt="Analysis" className="max-h-[400px] object-contain opacity-90" referrerPolicy="no-referrer" />
            </div>
          )}
          <div className="flex justify-end gap-4 mt-8">
            <button
              onClick={() => startFullAnalysis(true)}
              className="qd-btn-primary flex items-center gap-2"
            >
              <Cpu className="w-4 h-4" />
              Run Deep Pro Review
            </button>
          </div>

          {/* Trade Execution Panel */}
          {onAddTrade && (
             <div className="card-base mt-8">
               <div className="card-header border-b border-[var(--b1)] pb-2 mb-4">
                 <span>Trade Execution</span>
               </div>
               {tradeSavedMessage && (
                 <div className="mb-4 text-[12px] font-mono text-[var(--cyan)]">{tradeSavedMessage}</div>
               )}
               <div className="flex flex-wrap items-end gap-4">
                 <div>
                   <label className="block text-[10px] text-[var(--txt2)] uppercase font-mono mb-1">Contracts</label>
                   <input 
                     type="number" 
                     min="1" 
                     value={executionQuantity} 
                     onChange={(e) => setExecutionQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                     className="bg-[var(--b0)] border border-[var(--b1)] p-2 w-20 text-[var(--txt)] text-[14px] font-mono rounded-none focus:border-[var(--orange)] focus:outline-none"
                   />
                 </div>
                 {(!result.dayType?.includes('LONG') && !result.dayType?.includes('SHORT')) && (
                   <div>
                     <label className="block text-[10px] text-[var(--txt2)] uppercase font-mono mb-1">Direction</label>
                     <select 
                       value={executionDirection} 
                       onChange={(e) => setExecutionDirection(e.target.value as 'LONG'|'SHORT')}
                       className="bg-[var(--b0)] border border-[var(--b1)] p-2 w-24 text-[var(--txt)] text-[14px] font-mono rounded-none focus:border-[var(--orange)] focus:outline-none"
                     >
                       <option value="LONG">LONG</option>
                       <option value="SHORT">SHORT</option>
                     </select>
                   </div>
                 )}
                 <button
                   onClick={() => handleSaveTrade()}
                   disabled={isSavingTrade}
                   className="qd-btn-primary flex items-center gap-2 h-[38px]"
                 >
                   {isSavingTrade ? 'Saving...' : 'Execute Trade'}
                 </button>
                 <button
                   onClick={() => setProofFlow({ active: true, outcome: 'SUCCESS' })}
                   disabled={isSavingTrade}
                   className={cn(
                     "qd-btn-ghost hover:bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/30 flex items-center gap-2 h-[38px]",
                     proofFlow.active && proofFlow.outcome === 'SUCCESS' ? "bg-[var(--green)]/20 shadow-[0_0_10px_var(--green)]" : ""
                   )}
                 >
                   Successful
                 </button>
                 <button
                   onClick={() => setProofFlow({ active: true, outcome: 'FAILED' })}
                   disabled={isSavingTrade}
                   className={cn(
                     "qd-btn-ghost hover:bg-[var(--red)]/10 text-[var(--red)] border border-[var(--red)]/30 flex items-center gap-2 h-[38px]",
                     proofFlow.active && proofFlow.outcome === 'FAILED' ? "bg-[var(--red)]/20 shadow-[0_0_10px_var(--red)]" : ""
                   )}
                 >
                   Failed
                 </button>
               </div>

               {proofFlow.active && proofFlow.outcome && (
                 <TradeProofPanel 
                   manualOutcome={proofFlow.outcome} 
                   executionQuantity={executionQuantity} 
                   onSaveTrade={handleSaveTrade}
                   onCancel={() => setProofFlow({ active: false })}
                   modelConfig={modelConfig}
                 />
               )}
             </div>
          )}
        </div>
      )}
    </div>
  );
}
