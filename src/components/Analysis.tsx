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

export default function Analysis({ session, customRules = [], onUpdate, onAddTrade }: { 
  session: SessionState, 
  customRules?: ProposedRule[],
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
  const [showSettings, setShowSettings] = useState(false);
  const [showChainOfThought, setShowChainOfThought] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [localSettings, setLocalSettings] = useState<AISettings>(session.aiSettings || { temperature: 0.1, customInstructions: '' });

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
        notes: `From Morning analysis.\nReasoning: ${result.reasoning}`,
        screenshotUrl: lastImage || undefined,
        analysisType: 'morning',
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

  const startFullAnalysis = useCallback(async (isDeepReview = false) => {
    const imgSource = isDeepReview ? lastImage : pendingImage;
    if (!imgSource) return;
    
    // reset steps if deep review
    if (isDeepReview) {
       initProgress();
    }
    
    setIsAnalyzing(true);
    setError(null);
    
    if (!isDeepReview) {
      updateStep('confirm', 'complete');
    }
    updateStep('send', 'active');
    try {
      if (!isDeepReview) {
         setLastImage(pendingImage);
      }
      const approvedRulesText = (customRules || []).filter(r => r.status === 'APPROVED').map(r => `- ${r.rule}`).join('\n');
      const ocrOverrideText = (!isDeepReview && ocrResult) ? `\n[OPERATOR OVERRIDE DATA]\nTicker: ${ocrResult.ticker || 'N/A'}\nTimeframe: ${ocrResult.timeframe || 'N/A'}\nCurrent Price: ${ocrResult.currentPrice || 'N/A'}\nTimestamp: ${ocrResult.lastTimestamp || 'N/A'}\nScreenshot Timezone: ${ocrResult.timezone || 'EST'}\n` : '';
      const analysisSettings = {
        ...localSettings,
        customInstructions: `${localSettings.customInstructions}\n${ocrOverrideText}\nAPPROVED STRATEGY REFINEMENTS:\n${approvedRulesText}`.trim()
      };
      
      const subStepInterval = setInterval(() => {
        setProgressSteps(prev => {
          const sendStep = prev.find(s => s.id === 'send');
          const stratStep = prev.find(s => s.id === 'strategy');
          const riskStep = prev.find(s => s.id === 'risk');
          
          if (sendStep?.status === 'active') {
             return prev.map(s => s.id === 'send' ? {...s, status:'complete'} : s.id === 'strategy' ? {...s, status:'active'} : s);
          } else if (stratStep?.status === 'active') {
             return prev.map(s => s.id === 'strategy' ? {...s, status:'complete'} : s.id === 'risk' ? {...s, status:'active'} : s);
          }
          return prev;
        });
      }, 5000);

      const routeName = isDeepReview ? "deep_review" : "morning";
      const modelToUse = getModelForRoute(routeName, modelConfig);
      const analysis = await analyzeChart(imgSource, analysisSettings, session.accountEquity, session.analysisResult, undefined, routeName, modelToUse);
      clearInterval(subStepInterval);
      
      updateStep('send', 'complete');
      updateStep('strategy', 'complete');
      updateStep('risk', 'complete');
      updateStep('save', 'active');
      setResult(analysis);
      
      try {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (authSession?.user?.id) {
           await uploadScreenshotAndSaveSetup(authSession.user.id, imgSource, analysis, 'morning', ocrResult); 
           updateStep('save', 'complete');
        } else {
           updateStep('save', 'warning', 'User not authenticated. Setup was not saved to cloud.');
           setError('Analysis complete, cloud save failed: User not authenticated.');
        }
      } catch (saveErr: any) {
        console.error('Supabase save error:', saveErr);
        updateStep('save', 'warning', 'Analysis complete, cloud save failed: ' + (saveErr.message || String(saveErr)));
        setError('Analysis complete, cloud save failed: ' + (saveErr.message || String(saveErr)));
      }
      
      updateStep('complete', 'complete');
      onUpdate({ morningScreenshot: imgSource, analysisResult: analysis, dayType: analysis.dayType });
      
      if (!isDeepReview) {
         setPendingImage(null);
         setOcrResult(null);
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to analyze chart. Please try again.');
      updateStep('send', 'error', err instanceof Error ? err.message : String(err));
      // if send failed, make sure risk, save, etc don't hang
      updateStep('strategy', 'warning', 'Skipped');
      updateStep('risk', 'warning', 'Skipped');
      updateStep('save', 'warning', 'Skipped');
      updateStep('complete', 'warning', 'Halted');
    } finally {
      setIsAnalyzing(false);
    }
  }, [pendingImage, lastImage, localSettings, session.accountEquity, session.analysisResult, customRules, ocrResult, onUpdate, updateStep, modelConfig, initProgress]);

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

  const saveSettings = () => {
    onUpdate({ aiSettings: localSettings });
    setShowSettings(false);
  };

  return (
    <div className="space-y-6 fade-up">
      <header className="page-header">
        <div>
          <h1>Morning Analysis</h1>
          <p>9:30 CHART REVIEW · STRICT TECHNICAL MODE</p>
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
            <div className="flex gap-4">
              <label className="qd-btn-primary cursor-pointer">
                Select File
                <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
              </label>
              <button className="qd-btn-ghost" onClick={() => {}}>Paste (Ctrl+V)</button>
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
