import React, { useState, useEffect, useCallback } from 'react';
import { SessionState, Trade, AnalysisResult, AISettings } from '../types';
import { Clock, Upload, XCircle, Settings2, Cpu, TrendingUp, TrendingDown, Camera, AlertTriangle, Moon } from 'lucide-react';
import { analyzeChart, preCheckChartInfo, type OCRResult } from '../lib/gemini';
import { cn, getImageFromClipboard } from '../lib/utils';
import AnalysisProgress, { ProgressStep, StepStatus } from './AnalysisProgress';
import { uploadScreenshotAndSaveSetup } from '../lib/cloudStorage';
import { supabase } from '../lib/supabase';
import ModelConfigPanel from './ModelConfigPanel';
import ApiCostPanel from './ApiCostPanel';
import { loadModelConfig, saveModelConfig, ModelConfig, getModelForRoute } from '../lib/modelRouter';
import TradeProofPanel from './TradeProofPanel';

export default function LunchReversal({ 
  session, 
  onUpdate,
  onAddTrade
}: { 
  session: SessionState,
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
        notes: `From Lunch Reversal analysis.\nReasoning: ${result.reasoning}`,
        screenshotUrl: lastImage || undefined,
        analysisType: 'lunch',
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
             result.suggestedEntry,
             undefined,
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
    
    try {
      if (!isDeepReview) {
        setLastImage(pendingImage);
      }
      
      const routeName = isDeepReview ? "deep_review" : "lunch";
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

      const ocrOverrideText = (!isDeepReview && ocrResult) ? `\n[OPERATOR OVERRIDE DATA]\nTicker: ${ocrResult.ticker || 'N/A'}\nTimeframe: ${ocrResult.timeframe || 'N/A'}\nCurrent Price: ${ocrResult.currentPrice || 'N/A'}\nTimestamp: ${ocrResult.lastTimestamp || 'N/A'}\nScreenshot Timezone: ${ocrResult.timezone || 'EST'}\n` : '';
      
      const analysisSettings = {
        ...(session.aiSettings || { temperature: 0.1, customInstructions: '' }),
        customInstructions: `${session.aiSettings?.customInstructions || ''}\n${ocrOverrideText}\nTHIS IS THE LUNCH REVERSAL SETUP. Focus on 11:50 AM-1:00 PM ET Trap Conditions. Evaluate false breakouts and morning boundaries.`.trim()
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
          
          const geminiPromise = analyzeChart(imgToSend, analysisSettings, session.accountEquity, session.analysisResult, undefined, routeName, modelToUse);
          
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
        ibPosition: undefined,
        ocrTimestampDelta: analysis.ocrTimestampDelta,
        sessionType: 'lunch' as const,
        geminiConfidence: analysis.confidence,
        similarSetups: analysis.similarSetups,
        agentLearningSummary: analysis.agentLearningSummary,
        midnightOpenStatus: analysis.midnightOpenStatus
      };
      analysis.priorityResult = computePriorityScore(priorityContext);

      setResult(analysis);
      
      try {
        if (import.meta.env.DEV) console.log('[Analysis] Supabase save started');
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser?.id) {
           const { uploadScreenshot } = await import('../lib/cloudStorage');
           const todayStr = new Date().toISOString().split('T')[0];
           
           let execImgBase64 = imgSource;
           
           // Upload 5m exec
           const execUpload = await uploadScreenshot(authUser.id, todayStr, 'lunch', '5m_execution', execImgBase64);

           const setupData: Record<string, any> = {
             userId: authUser.id,
             dayType: analysis.dayType,
             reasoning: analysis.reasoning,
             confidence: analysis.confidence,
             imageURL: execUpload.storagePath,
             tags: analysis.tags || [],
             suggestedEntry: analysis.suggestedEntry || 0,
             suggestedStop: analysis.suggestedStop || 0,
             suggestedTarget: analysis.suggestedTarget || 0,

             midnight_open_source: analysis.midnightOpenSource,
             midnight_open_price: analysis.midnightOpenPrice,
             rth_vs_midnight: analysis.rthVsMidnight,
             retrace_probability: analysis.retraceProbability,
             
             ocr_timestamp_status: analysis.ocrTimestampStatus,
             ocr_timestamp_delta: analysis.ocrTimestampDelta,

             execution_5m_screenshot_url: execUpload.url,
             execution_5m_storage_path: execUpload.storagePath,
             execution_timeframe: '5m',
             
             eth_context_available: false, // Lunch doesn't upload a new one, relying on morning
             
             trade_plan_json: analysis.tradePlan || null,
             execution_review_json: analysis.executionReview5m || null,
             afternoon_test_plan_json: analysis.afternoonTestPlan || null,
             midnight_open_review_json: analysis.midnightAnalysis || null,
           };

           if (ocrResult) {
             setupData.ocrText = JSON.stringify(ocrResult);
           }
           Object.keys(setupData).forEach(key => setupData[key] === undefined && delete setupData[key]);

           const { data: docData, error: dbError } = await supabase
              .from('setups')
              .insert([setupData])
              .select('id')
              .single();
              
           if (dbError) throw dbError;
           
           const setupId = docData.id;

           if (import.meta.env.DEV) console.log('[Analysis] Supabase save complete');
           if (setupId) setSetupId(setupId);
           updateStep('save', 'complete');

           // Call RAG save
           const { saveToRAG } = await import('../lib/rag');
           await saveToRAG({
             sessionType: 'lunch',
             instrument: 'MES',
             tradeDate: new Date().toLocaleDateString('en-US'),
             dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
             midnightOpenPrice: analysis.midnightOpenPrice,
             midnightOpenInstrument: analysis.midnightOpenInstrument,
             midnightOpenSource: "gemini_ocr",
             midnightOpenConfirmedAt: analysis.midnightOpenConfirmedAt,
             midnightOpenDate: analysis.midnightOpenDate,
             midnightOpenStatus: analysis.midnightOpenStatus,
             distanceFromMidnightPoints: analysis.distanceFromMidnightPoints,
             distanceFromMidnightTicks: analysis.distanceFromMidnightTicks,
             midnightRole: analysis.midnightRole,
             midnightInteraction: analysis.midnightInteraction,
             midnightPlanImpact: analysis.midnightPlanImpact,
             midnightConfidenceAdjustment: analysis.midnightConfidenceAdjustment,
             midnightConfidenceReason: analysis.midnightConfidenceReason,
             rthVsMidnight: analysis.rthVsMidnight,
             retraceProbability: analysis.retraceProbability,
             geminiConfidence: analysis.confidence,
             geminiAnalysisJson: analysis,
             ocrText: ocrResult?.text,
             screenshotUrl: execUpload.url,
             setupId: setupId,
             tradeResult: 'pending',

             execution_5m_screenshot_url: execUpload.url,
             execution_5m_storage_path: execUpload.storagePath,
             execution_timeframe: '5m',
             eth_context_available: false,
             trade_plan_json: analysis.tradePlan || null,
             execution_review_json: analysis.executionReview5m || null,
             afternoon_test_plan_json: analysis.afternoonTestPlan || null,
             midnight_open_review_json: analysis.midnightAnalysis || null,
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
  }, [pendingImage, lastImage, session.aiSettings, session.accountEquity, session.analysisResult, ocrResult, updateStep, modelConfig, initProgress]);

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

  return (
    <div className="space-y-6 fade-up">
      <header className="page-header">
        <div>
          <h1>Lunch Reversal</h1>
          <p>11:50 AM-1:00 PM ET TRAP CONDITIONS</p>
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
              <button className="qd-btn-ghost" onClick={handlePasteFromClipboard}>Paste Screenshot</button>
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
                  <p className="text-[10px] text-[var(--txt2)] border-l-2 border-[var(--b2)] pl-2">11:50-13:00 must create a false breakout trap above/below the morning boundary.</p>
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
          
          {result.afternoonTestPlan && (
            <div className="card-base flex flex-col p-6 mb-4 border border-[var(--orange)] bg-[#1a1410]">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[14px] font-mono font-bold text-[var(--orange)] flex items-center gap-2">
                  <TrendingUp size={16} />
                  AFTERNOON TEST PLAN
                </span>
                <span className="qd-badge !bg-[var(--b2)] !text-[var(--orange)]">
                  {result.afternoonTestPlan.lunchExpectation}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-[10px] uppercase text-[var(--txt3)] font-mono mb-2">Trap Expectations</h4>
                  <p className="text-[12px] text-[var(--txt)] text-pretty leading-relaxed">
                    {result.afternoonTestPlan.plan}
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  {result.afternoonTestPlan.lunchTrapLevel !== undefined && (
                    <div className="flex justify-between bg-[#111] p-2 border border-[var(--b2)] rounded">
                      <span className="text-[11px] text-[var(--txt2)] font-mono">Trap Focus Level</span>
                      <span className="text-[12px] font-bold text-[var(--red)] font-mono">
                        {result.afternoonTestPlan.lunchTrapLevel}
                      </span>
                    </div>
                  )}
                  {result.afternoonTestPlan.afternoonInvalidationLevel !== undefined && (
                    <div className="flex justify-between bg-[#111] p-2 border border-[var(--b2)] rounded">
                      <span className="text-[11px] text-[var(--txt2)] font-mono">Invalidation</span>
                      <span className="text-[12px] font-bold text-[var(--orange)] font-mono">
                        {result.afternoonTestPlan.afternoonInvalidationLevel}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between bg-[#111] p-2 border border-[var(--b2)] rounded">
                    <span className="text-[11px] text-[var(--txt2)] font-mono">Morning Carryover</span>
                    <span className="text-[12px] font-bold text-[var(--txt)] font-mono">
                      {result.afternoonTestPlan.morningBiasCarryover}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
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
              {result.priorityResult.missingMidnightReason && (
                <div className="mt-3 p-2 bg-[var(--orange)]/10 border border-[var(--orange)]/30 rounded text-[10px] text-[var(--orange)] font-mono flex items-start gap-1.5">
                  <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>{result.priorityResult.missingMidnightReason}</span>
                </div>
              )}
            </div>
          )}

          {/* Agent Learning Summary Component */}
          {result.agentLearningSummary && (
            <div className="card-base flex flex-col p-4 mb-4 border border-[var(--b2)]">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-[11px] font-mono font-bold text-[var(--txt)] flex items-center gap-2">
                  <Cpu size={14} className="text-[var(--blue)]" />
                  AGENT LEARNING SUMMARY
                </h3>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[9px] font-mono border",
                  result.agentLearningSummary.completedCount >= 10 ? "bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/30" :
                  result.agentLearningSummary.completedCount >= 5 ? "bg-[var(--blue)]/10 text-[var(--blue)] border-[var(--blue)]/30" :
                  result.agentLearningSummary.completedCount >= 1 ? "bg-[var(--orange)]/10 text-[var(--orange)] border-[var(--orange)]/30" :
                  "bg-[var(--b2)] text-[var(--txt2)] border-[var(--b2)]"
                )}>
                  CONFIDENCE: {
                    result.agentLearningSummary.completedCount >= 10 ? "HIGH" :
                    result.agentLearningSummary.completedCount >= 5 ? "MEDIUM" :
                    result.agentLearningSummary.completedCount >= 1 ? "LOW" :
                    "EMPTY"
                  }
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-[var(--txt3)] font-mono uppercase">Completed Outcomes</span>
                  <span className="text-[14px] font-bold text-[var(--txt)]">{result.agentLearningSummary.completedCount}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-[var(--txt3)] font-mono uppercase">Hist. Win Rate</span>
                  <span className={cn(
                    "text-[14px] font-bold flex items-center gap-1",
                    result.agentLearningSummary.winRate !== null && result.agentLearningSummary.winRate >= 0.7 ? "text-[var(--green)]" :
                    result.agentLearningSummary.winRate !== null && result.agentLearningSummary.winRate <= 0.4 ? "text-[var(--red)]" : "text-[var(--txt)]"
                  )}>
                    {result.agentLearningSummary.winRate !== null ? `${Math.round(result.agentLearningSummary.winRate * 100)}%` : "N/A"}
                    {result.agentLearningSummary.confidenceAdjustment === 'increase' && <TrendingUp size={12} />}
                    {result.agentLearningSummary.confidenceAdjustment === 'decrease' && <TrendingDown size={12} />}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-[var(--txt3)] font-mono uppercase">Average P&L</span>
                  <span className={cn(
                    "text-[12px] font-mono",
                    result.agentLearningSummary.avgPnlTicks && result.agentLearningSummary.avgPnlTicks > 0 ? "text-[var(--green)]" :
                    result.agentLearningSummary.avgPnlTicks && result.agentLearningSummary.avgPnlTicks < 0 ? "text-[var(--red)]" : "text-[var(--txt2)]"
                  )}>
                    {result.agentLearningSummary.avgPnlTicks !== null ? `${result.agentLearningSummary.avgPnlTicks.toFixed(1)} ticks` : "N/A"}
                    {result.agentLearningSummary.avgPnlDollars !== null ? ` / $${result.agentLearningSummary.avgPnlDollars}` : ""}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-[var(--txt3)] font-mono uppercase">Match Distribution</span>
                  <span className="text-[10px] text-[var(--txt2)] font-mono">
                    <span className="text-[var(--green)]">{result.agentLearningSummary.winCount}W</span> / <span className="text-[var(--red)]">{result.agentLearningSummary.lossCount}L</span> / <span className="text-[var(--txt)]">{result.agentLearningSummary.scratchCount}S</span>
                  </span>
                </div>
              </div>
              
              <div className="bg-[var(--bg)] p-3 rounded border border-[var(--b1)] flex flex-col gap-2 mb-4">
                <div className="text-[10px] text-[var(--txt)] font-mono">
                  <strong className="text-[var(--blue)]">Learned Pattern:</strong> {result.agentLearningSummary.strongestLesson}
                </div>
                {result.agentLearningSummary.riskWarning && (
                  <div className="text-[10px] text-[var(--red)] font-mono flex items-start gap-1.5 mt-1 border border-[var(--red)]/20 bg-[var(--red)]/5 p-2 rounded">
                    <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                    <span>{result.agentLearningSummary.riskWarning}</span>
                  </div>
                )}
              </div>

              {result.similarSetups && result.similarSetups.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h4 className="text-[9px] text-[var(--txt3)] font-mono uppercase mb-1">Retrieved History ({result.similarSetups.length})</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--b1)] text-[9px] text-[var(--txt3)] font-mono">
                          <th className="pb-1 font-normal opacity-70">Date</th>
                          <th className="pb-1 font-normal opacity-70">Session</th>
                          <th className="pb-1 font-normal opacity-70">Match</th>
                          <th className="pb-1 font-normal opacity-70">Result</th>
                          <th className="pb-1 font-normal opacity-70">P&L</th>
                          <th className="pb-1 font-normal opacity-70">Verdict</th>
                          <th className="pb-1 font-normal opacity-70">Link</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.similarSetups.map((setup: any, idx: number) => (
                          <tr key={setup.id} className="border-b border-[var(--b1)]/50 last:border-0 hover:bg-[var(--b1)]/20 transition-colors">
                            <td className="py-2 text-[10px] text-[var(--txt2)] whitespace-nowrap">{setup.tradeDate}</td>
                            <td className="py-2 text-[10px] text-[var(--txt)] capitalize whitespace-nowrap">{setup.sessionType}</td>
                            <td className="py-2 text-[10px] font-mono text-[var(--blue)] whitespace-nowrap">{Math.round(setup.similarity * 100)}%</td>
                            <td className="py-2 whitespace-nowrap">
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider",
                                setup.tradeResult === 'win' ? "bg-[var(--green)]/10 text-[var(--green)]" :
                                setup.tradeResult === 'loss' ? "bg-[var(--red)]/10 text-[var(--red)]" :
                                setup.tradeResult === 'scratch' ? "bg-[var(--txt)]/10 text-[var(--txt)]" :
                                "bg-[var(--orange)]/10 text-[var(--orange)]"
                              )}>
                                {(setup.tradeResult || 'PENDING').toUpperCase()}
                              </span>
                            </td>
                            <td className="py-2 text-[10px] font-mono whitespace-nowrap">
                              {setup.pnlTicks !== null && setup.pnlTicks !== undefined ? (
                                <span className={setup.pnlTicks > 0 ? "text-[var(--green)]" : setup.pnlTicks < 0 ? "text-[var(--red)]" : "text-[var(--txt)]"}>
                                  {setup.pnlTicks > 0 ? '+' : ''}{setup.pnlTicks}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="py-2 whitespace-nowrap">
                              {setup.geminiVerdict ? (
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-[8px] font-mono",
                                  setup.geminiVerdict === 'CONFIRMED' ? "text-[var(--green)] border border-[var(--green)]/30" :
                                  setup.geminiVerdict === 'DISPUTED' ? "text-[var(--red)] border border-[var(--red)]/30" :
                                  "text-[var(--orange)] border border-[var(--orange)]/30"
                                )}>
                                  {setup.geminiVerdict}
                                </span>
                              ) : (
                                <span className="text-[9px] text-[var(--txt3)] border border-[var(--b2)] rounded px-1.5 py-0.5">UNVERIFIED</span>
                              )}
                            </td>
                            <td className="py-2 whitespace-nowrap">
                              {(setup.screenshotUrl || setup.proofScreenshotUrl) ? (
                                <a href={setup.screenshotUrl || setup.proofScreenshotUrl} target="_blank" rel="noreferrer" className="text-[var(--blue)] hover:underline flex items-center justify-center opacity-70 hover:opacity-100">
                                  <Camera size={12} />
                                </a>
                              ) : (
                                <span className="text-[var(--txt3)] opacity-30 flex items-center justify-center"><Camera size={12} /></span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {!result.agentLearningSummary && (
             <div className="card-base flex flex-col p-4 mb-4 border border-[var(--b2)]">
               <h3 className="text-[11px] font-mono font-bold text-[var(--txt)] mb-2">AGENT LEARNING SUMMARY</h3>
               <p className="text-[10px] text-[var(--txt2)] italic leading-relaxed">
                 No similar past setups found. Your trade history will form the baseline for future RAG learning.
               </p>
             </div>
          )}

          {/* Midnight Open RAG Learning Component */}
          {result.agentLearningSummary?.midnightSetupCount ? (
            <div className="card-base flex flex-col p-4 mb-4 border border-[var(--blue)]/30 bg-[var(--blue)]/5">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-[11px] font-mono font-bold text-[var(--blue)] flex items-center gap-2">
                  <Moon size={14} className="text-[var(--blue)]" />
                  MIDNIGHT OPEN RAG LEARNING
                </h3>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[9px] font-mono border",
                  result.agentLearningSummary.midnightCompletedCount >= 10 ? "bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/30" :
                  result.agentLearningSummary.midnightCompletedCount >= 5 ? "bg-[var(--blue)]/10 text-[var(--blue)] border-[var(--blue)]/30" :
                  result.agentLearningSummary.midnightCompletedCount >= 1 ? "bg-[var(--orange)]/10 text-[var(--orange)] border-[var(--orange)]/30" :
                  "bg-[var(--b2)] text-[var(--txt2)] border-[var(--b2)]"
                )}>
                  CONFIDENCE: {
                    result.agentLearningSummary.midnightCompletedCount >= 10 ? "HIGH" :
                    result.agentLearningSummary.midnightCompletedCount >= 5 ? "MEDIUM" :
                    result.agentLearningSummary.midnightCompletedCount >= 1 ? "LOW" :
                    "EMPTY"
                  }
                </span>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-[var(--blue)] opacity-70 font-mono uppercase">Similar Setups</span>
                  <span className="text-[14px] font-bold text-[var(--txt)]">{result.agentLearningSummary.midnightSetupCount}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-[var(--blue)] opacity-70 font-mono uppercase">Win Rate</span>
                  <span className={cn(
                    "text-[14px] font-bold",
                    result.agentLearningSummary.midnightWinRate !== null && result.agentLearningSummary.midnightWinRate >= 0.7 ? "text-[var(--green)]" :
                    result.agentLearningSummary.midnightWinRate !== null && result.agentLearningSummary.midnightWinRate <= 0.4 ? "text-[var(--red)]" : "text-[var(--txt)]"
                  )}>
                    {result.agentLearningSummary.midnightWinRate !== null ? `${Math.round(result.agentLearningSummary.midnightWinRate * 100)}%` : "N/A"}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-[var(--blue)] opacity-70 font-mono uppercase">Avg P&L</span>
                  <span className={cn(
                    "text-[14px] font-mono",
                    result.agentLearningSummary.midnightAvgPnlTicks && result.agentLearningSummary.midnightAvgPnlTicks > 0 ? "text-[var(--green)]" :
                    result.agentLearningSummary.midnightAvgPnlTicks && result.agentLearningSummary.midnightAvgPnlTicks < 0 ? "text-[var(--red)]" : "text-[var(--txt2)]"
                  )}>
                    {result.agentLearningSummary.midnightAvgPnlTicks !== null ? `${result.agentLearningSummary.midnightAvgPnlTicks.toFixed(1)} ticks` : "N/A"}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-[var(--blue)] opacity-70 font-mono uppercase">Best Match</span>
                  {result.agentLearningSummary.midnightBestMatch ? (
                    <span className="text-[10px] text-[var(--txt)] font-mono">
                      {new Date(result.agentLearningSummary.midnightBestMatch.tradeDate || '').toLocaleDateString(undefined, {month: 'numeric', day: 'numeric'})} | <span className={
                        result.agentLearningSummary.midnightBestMatch.tradeResult === 'win' ? "text-[var(--green)]" :
                        result.agentLearningSummary.midnightBestMatch.tradeResult === 'loss' ? "text-[var(--red)]" : ""
                      }>
                        {result.agentLearningSummary.midnightBestMatch.tradeResult?.toUpperCase()}
                      </span>
                    </span>
                  ) : <span className="text-[10px] text-[var(--txt2)] font-mono">None</span>}
                </div>
              </div>
              
              <div className="bg-[var(--bg)] p-3 rounded border border-[var(--b1)] flex flex-col gap-2">
                <div className="text-[10px] text-[var(--txt)] font-mono">
                  <strong className="text-[var(--blue)]">Pattern Learned:</strong> {result.agentLearningSummary.midnightPatternLearned}
                </div>
                {result.agentLearningSummary.midnightRiskWarning && (
                  <div className="text-[10px] text-[var(--red)] font-mono flex items-start gap-1.5 mt-1 border border-[var(--red)]/20 bg-[var(--red)]/5 p-2 rounded">
                    <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                    <span>{result.agentLearningSummary.midnightRiskWarning}</span>
                  </div>
                )}
                {result.midnightConfidenceAdjustment && (
                  <div className="text-[10px] font-mono mt-1">
                      <strong className="text-[var(--txt)]">Confidence Adj:</strong> <span className={result.midnightConfidenceAdjustment === 'increase' ? "text-[var(--green)]" : result.midnightConfidenceAdjustment === 'decrease' ? "text-[var(--red)]" : "text-[var(--txt2)]"}>{result.midnightConfidenceAdjustment.toUpperCase()}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
             <div className="card-base flex flex-col p-4 mb-4 border border-[var(--blue)]/30 bg-[var(--blue)]/5">
                <h3 className="text-[11px] font-mono font-bold text-[var(--blue)] flex items-center gap-2 mb-2">
                  <Moon size={14} className="text-[var(--blue)]" />
                  MIDNIGHT OPEN RAG LEARNING
                </h3>
               <p className="text-[10px] text-[var(--txt2)] italic leading-relaxed">
                 No Midnight Open history yet. Future saved trades will teach the agent how this level affects your setups.
               </p>
             </div>
          )}
          
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
