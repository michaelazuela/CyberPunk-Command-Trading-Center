import React, { useState, useEffect, useCallback } from 'react';
import { SessionState, Trade, AnalysisResult, AISettings } from '../types';
import { Clock, Upload, XCircle, Settings2, Cpu } from 'lucide-react';
import { analyzeChart, preCheckChartInfo, type OCRResult } from '../lib/gemini';
import { cn, getImageFromClipboard } from '../lib/utils';
import AnalysisProgress, { ProgressStep, StepStatus } from './AnalysisProgress';
import { uploadScreenshotAndSaveSetup } from '../lib/cloudStorage';
import { supabase } from '../lib/supabase';
import ModelConfigPanel from './ModelConfigPanel';
import ApiCostPanel from './ApiCostPanel';
import { loadModelConfig, saveModelConfig, ModelConfig, getModelForRoute } from '../lib/modelRouter';

export default function LunchReversal({ 
  session, 
  onUpdate,
  onAddTrade
}: { 
  session: SessionState,
  onUpdate: (updates: Partial<SessionState>) => void,
  onAddTrade?: (trade: Omit<Trade, 'id' | 'timestamp'>) => void
}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPreChecking, setIsPreChecking] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [lastImage, setLastImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [modelConfig, setModelConfig] = useState<ModelConfig>(loadModelConfig());

  const handleConfigChange = (newConfig: ModelConfig) => {
    setModelConfig(newConfig);
    saveModelConfig(newConfig);
  };

  const [executionQuantity, setExecutionQuantity] = useState(1);
  const [executionDirection, setExecutionDirection] = useState<'LONG'|'SHORT'>('LONG');
  const [isSavingTrade, setIsSavingTrade] = useState(false);
  const [tradeSavedMessage, setTradeSavedMessage] = useState<string|null>(null);

  useEffect(() => {
    if (result) {
       if (result.dayType?.includes('LONG')) setExecutionDirection('LONG');
       else if (result.dayType?.includes('SHORT')) setExecutionDirection('SHORT');
    }
  }, [result]);

  const handleSaveTrade = async (manualOutcome?: 'SUCCESS' | 'FAILED') => {
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
        notes: `From Lunch Reversal analysis.\nReasoning: ${result.reasoning}`,
        screenshotUrl: lastImage || undefined,
        analysisType: 'lunch',
        analysisConfidence: result.confidence,
        analysisReasoning: result.reasoning,
        setupTags: result.tags || [],
        outcomeLabel: manualOutcome
      };
      
      await onAddTrade(tradeData);
      setTradeSavedMessage("Trade saved to history.");
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
      { id: 'extract', label: 'Extracting lunch chart context', status: 'pending' },
      { id: 'confirm', label: 'Waiting for confirmation', status: 'pending' },
      { id: 'send', label: 'Sending chart to Gemini', status: 'pending' },
      { id: 'strategy', label: 'Running lunch reversal analysis', status: 'pending' },
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
      ocr.timezone = session.aiSettings?.screenshotTimezone || session.aiSettings?.morningTimeZone || 'EST';
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

    if (isDeepReview) {
       initProgress();
    }
    
    setIsAnalyzing(true);
    setError(null);
    
    if (!isDeepReview) {
      updateStep('confirm', 'complete');
    }
    updateStep('send', 'active');
    
    // Add timeout watchdog
    let timeoutFired = false;
    let subStepInterval: ReturnType<typeof setInterval> | undefined;

    const timeoutId = setTimeout(() => {
      timeoutFired = true;
      console.error('[Analysis] Timeout waiting for Gemini');
      updateStep('send', 'error', 'Analysis timed out. Please retry.');
      if (typeof setError === 'function') {
        setError('Analysis timed out. Please retry.');
      }
      setIsAnalyzing(false);
    }, 90000);

    try {
      if (!isDeepReview) {
        setLastImage(pendingImage);
      }
      if (import.meta.env.DEV) console.log('[Analysis] Gemini request started');
      const ocrOverrideText = (!isDeepReview && ocrResult) ? `\n[OPERATOR OVERRIDE DATA]\nTicker: ${ocrResult.ticker || 'N/A'}\nTimeframe: ${ocrResult.timeframe || 'N/A'}\nCurrent Price: ${ocrResult.currentPrice || 'N/A'}\nTimestamp: ${ocrResult.lastTimestamp || 'N/A'}\nScreenshot Timezone: ${ocrResult.timezone || 'EST'}\n` : '';
      
      const analysisSettings = {
        ...(session.aiSettings || { temperature: 0.1, customInstructions: '' }),
        customInstructions: `${session.aiSettings?.customInstructions || ''}\n${ocrOverrideText}\nTHIS IS THE LUNCH REVERSAL SETUP. Focus on 12:00-13:00 EST Trap Conditions. Evaluate false breakouts and morning boundaries.`.trim()
      };
      
      subStepInterval = setInterval(() => {
        setProgressSteps(prev => {
          const sendStep = prev.find(s => s.id === 'send');
          const stratStep = prev.find(s => s.id === 'strategy');
          if (sendStep?.status === 'active') {
             return prev.map(s => s.id === 'send' ? {...s, status:'complete'} : s.id === 'strategy' ? {...s, status:'active'} : s);
          } else if (stratStep?.status === 'active') {
             return prev.map(s => s.id === 'strategy' ? {...s, status:'complete'} : s.id === 'risk' ? {...s, status:'active'} : s);
          }
          return prev;
        });
      }, 5000);

      const routeName = isDeepReview ? "deep_review" : "lunch";
      const modelToUse = getModelForRoute(routeName, modelConfig);
      const analysis = await analyzeChart(imgSource, analysisSettings, session.accountEquity, session.analysisResult, undefined, routeName, modelToUse);
      clearInterval(subStepInterval);
      
      if (timeoutFired) return;
      clearTimeout(timeoutId);
      
      if (import.meta.env.DEV) console.log('[Analysis] Gemini response received', analysis);

      updateStep('send', 'complete');
      updateStep('strategy', 'complete');
      updateStep('risk', 'complete');
      updateStep('save', 'active');
      setResult(analysis);
      
      try {
        if (import.meta.env.DEV) console.log('[Analysis] Supabase save started');
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser?.id) {
           await uploadScreenshotAndSaveSetup(authUser.id, imgSource, analysis, 'lunch', ocrResult); 
           if (import.meta.env.DEV) console.log('[Analysis] Supabase save complete');
           updateStep('save', 'complete');
        } else {
           if (import.meta.env.DEV) console.log('[Analysis] User not authenticated, skipping save');
           updateStep('save', 'warning', 'Please log in again to save to cloud history.');
           setError('Analysis complete, cloud save failed: Please log in again to save to cloud history.');
        }
      } catch (saveErr: any) {
        console.error('[Analysis] Supabase save error:', saveErr);
        updateStep('save', 'warning', 'Analysis complete, cloud save failed: ' + (saveErr.message || String(saveErr)));
        setError('Analysis complete, cloud save failed: ' + (saveErr.message || String(saveErr)));
      }
      
      updateStep('complete', 'complete');
      
      if (!isDeepReview) {
        setPendingImage(null);
        setOcrResult(null);
      }
    } catch (err: any) {
      clearInterval(subStepInterval);
      if (timeoutFired) return;
      clearTimeout(timeoutId);
      console.error('[Analysis] Gemini error:', err);
      setError('Failed to analyze chart. Please try again.');
      updateStep('send', 'error', err instanceof Error ? err.message : String(err));
      // if send failed, make sure risk, save, etc don't hang
      updateStep('strategy', 'warning', 'Skipped');
      updateStep('risk', 'warning', 'Skipped');
      updateStep('save', 'warning', 'Skipped');
      updateStep('complete', 'warning', 'Halted');
    } finally {
      if (!timeoutFired) setIsAnalyzing(false);
    }
  }, [pendingImage, lastImage, session.aiSettings, session.accountEquity, session.analysisResult, ocrResult, updateStep, modelConfig, initProgress]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => processImage(reader.result as string);
    reader.readAsDataURL(file);
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

  return (
    <div className="space-y-6 fade-up">
      <header className="page-header">
        <div>
          <h1>Lunch Reversal</h1>
          <p>12:00-13:00 EST TRAP CONDITIONS</p>
        </div>
      </header>

      <ApiCostPanel route="lunch" />
      <ModelConfigPanel route="lunch" config={modelConfig} onChange={handleConfigChange} />

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
            <div className="flex gap-4">
              <label className="qd-btn-primary cursor-pointer">
                Select File
                <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
              </label>
              <button className="qd-btn-ghost" onClick={() => {}}>Paste (Ctrl+V)</button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card-base flex flex-col min-h-[300px]">
              <div className="card-header">
                <span>Live Analysis</span>
              </div>
              <div className="empty-state flex-1">
                <Clock className="w-8 h-8 opacity-40 mb-4" />
                <h3>AWAITING 12:00 BAR</h3>
                <p>Lunch reversal module activates during the noon chop zone to look for false breakout traps.</p>
              </div>
            </div>

            <div className="card-base flex flex-col">
              <div className="card-header">
                <span>Requirements</span>
              </div>
              <div className="space-y-[1px] bg-[var(--b0)] flex-1">
                <div className="bg-[var(--s1)] p-4 flex flex-col gap-2">
                  <span className="font-mono text-[11px] font-bold text-[var(--txt)]">Lunch Reversal Setup</span>
                  <p className="text-[10px] text-[var(--txt2)] border-l-2 border-[var(--b2)] pl-2">Morning structure dictates the trap direction. Reversal only valid against the prevailing trend.</p>
                </div>
                <div className="bg-[var(--s1)] p-4 flex flex-col gap-2">
                  <span className="font-mono text-[11px] font-bold text-[var(--txt)]">Minimum Volatility</span>
                  <p className="text-[10px] text-[var(--txt2)] border-l-2 border-[var(--b2)] pl-2">Initial morning move must be &gt; 40 points to create sufficient exhaustion.</p>
                </div>
                <div className="bg-[var(--s1)] p-4 flex flex-col gap-2">
                  <span className="font-mono text-[11px] font-bold text-[var(--txt)]">The Trap</span>
                  <p className="text-[10px] text-[var(--txt2)] border-l-2 border-[var(--b2)] pl-2">12:00-13:00 must create a false breakout trap above/below the morning boundary.</p>
                </div>
                <div className="bg-[var(--s1)] p-4 flex flex-col gap-2">
                  <span className="font-mono text-[11px] font-bold text-[var(--txt)]">Execution Trigger</span>
                  <p className="text-[10px] text-[var(--txt2)] border-l-2 border-[var(--orange)] pl-2 text-[var(--orange)]">Entry on the reclaim of the 12:00 boundary with 5M close confirmation.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isPreChecking && pendingImage && ocrResult && !isAnalyzing && !result && (
        <div className="card-base fade-up">
           <div className="card-header">
              <span>OCR Verification</span>
           </div>
           <div className="grid grid-cols-2 gap-4 mb-4">
              <input value={ocrResult.ticker || ''} onChange={(e) => setOcrResult({ ...ocrResult, ticker: e.target.value })} className="bg-[var(--bg)] border border-[var(--b1)] p-2 font-mono text-[10px]" placeholder="Ticker" />
              <input value={ocrResult.currentPrice || ''} onChange={(e) => setOcrResult({ ...ocrResult, currentPrice: parseFloat(e.target.value) || undefined })} type="number" className="bg-[var(--bg)] border border-[var(--b1)] p-2 font-mono text-[10px]" placeholder="Price" />
           </div>
           <div className="flex gap-4">
              <button 
                type="button"
                onClick={() => startFullAnalysis(false)} 
                className="qd-btn-primary"
                disabled={isAnalyzing}
              >
                {isAnalyzing ? 'Analyzing...' : 'Confirm & Analyze'}
              </button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card-base flex flex-col items-center justify-center py-12">
               <span className="text-[10px] font-mono uppercase text-[var(--txt2)] mb-2">LUNCH REVERSAL SETUP</span>
               <span className={cn("text-3xl font-black italic tracking-tighter uppercase mb-4", result.dayType?.includes('LONG') ? "text-[var(--green)]" : result.dayType?.includes('SHORT') ? "text-[var(--red)]" : "text-[var(--amber)]")}>
                 {result.dayType || 'TRAP RECOGNIZED'}
               </span>
               <span className="qd-badge qd-badge-orange">CONFIDENCE: {(result.confidence * 100).toFixed(0)}%</span>
            </div>
            
            <div className="card-base flex flex-col justify-center gap-4">
              <div className="flex justify-between items-center bg-[var(--s2)] p-4 border border-[var(--b1)]">
                 <span className="text-[10px] font-mono text-[var(--txt2)] uppercase">TRAP ENTRY</span>
                 <span className="text-[16px] font-mono font-bold text-[var(--txt)]">{result.suggestedEntry}</span>
              </div>
              <div className="flex justify-between items-center bg-[var(--s2)] p-4 border border-[var(--b1)]">
                 <span className="text-[10px] font-mono text-[var(--txt2)] uppercase">STOP LOSS</span>
                 <span className="text-[16px] font-mono font-bold text-[var(--red)]">{result.suggestedStop}</span>
              </div>
              <div className="flex justify-between items-center bg-[var(--s2)] p-4 border border-[var(--b1)]">
                 <span className="text-[10px] font-mono text-[var(--txt2)] uppercase">TARGET RECLAIM</span>
                 <span className="text-[16px] font-mono font-bold text-[var(--green)]">{result.suggestedTarget20R || result.suggestedTarget}</span>
              </div>
            </div>
          </div>
          {lastImage && (
            <div className="card-base flex justify-center p-2 bg-[#000]">
              <img src={lastImage} alt="Analysis" className="max-h-[400px] object-contain opacity-90" referrerPolicy="no-referrer" />
            </div>
          )}
          <div className="flex justify-end gap-4 mt-8">
            <button
              type="button"
              onClick={() => startFullAnalysis(true)}
              className="qd-btn-primary flex items-center gap-2"
              disabled={isAnalyzing}
            >
              <Cpu className="w-4 h-4" />
              {isAnalyzing ? 'Running...' : 'Run Deep Pro Review'}
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
                   onClick={() => handleSaveTrade('SUCCESS')}
                   disabled={isSavingTrade}
                   className="qd-btn-ghost hover:bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/30 flex items-center gap-2 h-[38px]"
                 >
                   Successful
                 </button>
                 <button
                   onClick={() => handleSaveTrade('FAILED')}
                   disabled={isSavingTrade}
                   className="qd-btn-ghost hover:bg-[var(--red)]/10 text-[var(--red)] border border-[var(--red)]/30 flex items-center gap-2 h-[38px]"
                 >
                   Failed
                 </button>
               </div>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
