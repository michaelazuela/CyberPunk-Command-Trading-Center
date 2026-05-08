import React, { useState, useEffect, useCallback } from 'react';
import { Upload, XCircle, Settings2, Sliders, ChevronDown, ChevronUp, Brain, Sparkles, Target, Shield, Zap, Moon, CheckCircle2, CloudUpload, Cpu, TrendingUp, TrendingDown, Camera, AlertTriangle } from 'lucide-react';
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
import { TimezoneToggle } from './TimezoneToggle';
import ModelConfigPanel from './ModelConfigPanel';
import ApiCostPanel from './ApiCostPanel';
import { loadModelConfig, saveModelConfig, ModelConfig, getModelForRoute } from '../lib/modelRouter';
import { TIME_WINDOWS, getWindowStatus, formatWindow, minutesUntilOpen, minutesUntilClose, formatNYTimeStr } from '../config/timeWindows';
import TradeProofPanel from './TradeProofPanel';
import { normalizeTradePlan } from '../lib/tradePlan';
import FinalTradePlanCard from './FinalTradePlanCard';

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
  const [pendingEthImage, setPendingEthImage] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [lastImage, setLastImage] = useState<string | null>(null);
  const [lastEthImage, setLastEthImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showChainOfThought, setShowChainOfThought] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const [localSettings, setLocalSettings] = useState<AISettings>(session.aiSettings || { temperature: 0, customInstructions: '' });

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

  const normalizedPlan = result ? normalizeTradePlan(result, session.dailyInstrument || 'MES') : null;

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
    if (normalizedPlan && normalizedPlan.decision !== "NO TRADE") {
       if (normalizedPlan.decision === 'LONG') setExecutionDirection('LONG');
       else if (normalizedPlan.decision === 'SHORT') setExecutionDirection('SHORT');
    }
  }, [normalizedPlan]);

  const handleSaveTrade = async (manualOutcome?: 'SUCCESS' | 'FAILED', proofData?: Partial<Trade>) => {
    if (!onAddTrade || !result || !normalizedPlan) return;
    if (!normalizedPlan.canExecute || normalizedPlan.entry === null || normalizedPlan.stop === null || normalizedPlan.t1 === null || normalizedPlan.t2 === null) {
      setTradeSavedMessage("Trade not saved: ENTRY, STOP, T1, and T2 are required.");
      setProofFlow({ active: false });
      return;
    }
    setIsSavingTrade(true);
    setTradeSavedMessage(null);
    try {
      const status = manualOutcome === 'SUCCESS' ? 'SUCCESSFUL' : manualOutcome === 'FAILED' ? 'FAILED' : 'OPEN';
      const tradeData: Omit<Trade, 'id' | 'timestamp'> = {
        date: new Date().toISOString().split('T')[0],
        instrument: session.dailyInstrument || 'MES',
        direction: normalizedPlan.decision === "LONG" || normalizedPlan.decision === "SHORT" ? normalizedPlan.decision as "LONG"|"SHORT" : executionDirection,
        dayType: result.dayType,
        entryPrice: normalizedPlan.entry,
        stopPrice: normalizedPlan.stop,
        targetPrice: normalizedPlan.t1,
        contracts: executionQuantity,
        status,
        manualOutcome,
        notes: `Morning Plan (${normalizedPlan.source})\nRisk: ${normalizedPlan.riskPoints || 'N/A'}\nT1: ${normalizedPlan.t1 || 'N/A'} (1.5R)\nT2: ${normalizedPlan.t2 || 'N/A'} (2.0R)\nWhy: ${normalizedPlan.whyThisPlan}\nInvalidation: ${normalizedPlan.invalidation}`,
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
             normalizedPlan.entry,
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

  const processExecImage = useCallback(async (base64String: string) => {
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

  const processEthImage = useCallback((base64String: string) => {
    setPendingEthImage(base64String);
  }, []);

  const handleImageFile = (file: File, type: 'exec' | 'eth') => {
    const reader = new FileReader();
    reader.onloadend = () => {
       if (type === 'exec') processExecImage(reader.result as string);
       else processEthImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'exec' | 'eth') => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file, type);
  };

  const handlePasteFromClipboard = async (type: 'exec' | 'eth') => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        for (const clipboardType of item.types) {
          if (clipboardType.startsWith("image/")) {
            const blob = await item.getType(clipboardType);
            const file = new File([blob], "paste.png", { type: clipboardType });
            handleImageFile(file, type);
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
    // If proof flow is active or event default prevented by proof panel, don't hijack it
    if (proofFlow.active || e.defaultPrevented) return;

    // Ignore paste if user is typing in an input or textarea
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || (activeElement as HTMLElement).isContentEditable)) {
      return;
    }

    try {
      const imageData = await getImageFromClipboard(e);
      if (imageData) {
        // Assume default paste is exec
        processExecImage(imageData);
      }
    } catch (error) {
      console.error('Paste screenshot failed:', error);
      setError(error instanceof Error ? error.message : 'Could not paste screenshot.');
    }
  }, [processExecImage, proofFlow.active]);

  const startFullAnalysis = useCallback(async (isDeepReviewParam?: boolean | React.MouseEvent) => {
    const isDeepReview = isDeepReviewParam === true;
    const imgSource = isDeepReview ? lastImage : pendingImage;
    const ethSource = isDeepReview ? lastEthImage : pendingEthImage;
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
         setLastEthImage(pendingEthImage);
      }
      
      const routeName = isDeepReview ? "deep_review" : "morning";
      const modelToUse = getModelForRoute(routeName, modelConfig);
      
      if (import.meta.env.DEV) {
        console.log(`[GEMINI DEBUG] Starting API call`);
        console.log(`[GEMINI DEBUG] Model: ${modelToUse}`);
      }

      // Compression step
      updateStep('send', 'active');
      setProgressSteps(prev => prev.map(s => s.id === 'send' ? { ...s, label: 'Compressing image(s)' } : s));
      
      let imgToSend: any = imgSource;
      try {
        if (import.meta.env.DEV) console.log(`[GEMINI DEBUG] Image size before compression: ${Math.round(imgSource.length / 1024)} KB`);
        const compressedExec = await import('../lib/cloudStorage').then(m => m.compressImage(imgSource, 1280, 0.7));
        if (import.meta.env.DEV) console.log(`[GEMINI DEBUG] Exec Image size after compression: ${Math.round(compressedExec.length / 1024)} KB`);
        
        let compressedEth;
        if (ethSource) {
           compressedEth = await import('../lib/cloudStorage').then(m => m.compressImage(ethSource, 1280, 0.7));
           if (import.meta.env.DEV) console.log(`[GEMINI DEBUG] ETH Image size after compression: ${Math.round(compressedEth.length / 1024)} KB`);
        }

        if (compressedEth) {
           imgToSend = { exec: compressedExec, eth: compressedEth };
        } else {
           imgToSend = { exec: compressedExec };
        }
      } catch (err) {
        console.warn("Failed to compress image, using original", err);
        if (ethSource) {
           imgToSend = { exec: imgSource, eth: ethSource };
        } else {
           imgToSend = imgSource;
        }
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
          
          const geminiPromise = analyzeChart(imgToSend, analysisSettings, session.accountEquity, session.analysisResult, undefined, routeName, modelToUse, useManualMidnightOpen ? midnightOpenOverrideStr : undefined, session.dailyInstrument);
          
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
        instrument: session.dailyInstrument || 'MES', // Default
        dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
        rthVsMidnight: analysis.rthVsMidnight,
        retraceProbability: analysis.retraceProbability || undefined,
        ibPosition: undefined, // Need more OCR context for exact IB pos
        ocrTimestampDelta: analysis.ocrTimestampDelta,
        sessionType: 'morning' as const,
        geminiConfidence: analysis.confidence,
        similarSetups: analysis.similarSetups,
        agentLearningSummary: analysis.agentLearningSummary,
        midnightOpenStatus: analysis.midnightOpenStatus
      };
      analysis.priorityResult = computePriorityScore(priorityContext);
      const analysisPlan = normalizeTradePlan(analysis, session.dailyInstrument || 'MES');

      setResult(analysis);
      
      try {
        if (import.meta.env.DEV) console.log('[Analysis] Supabase save started');
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser?.id) {
           const { uploadScreenshot } = await import('../lib/cloudStorage');
           const todayStr = new Date().toISOString().split('T')[0];
           
           let execImgBase64 = imgSource;
           let ethImgBase64 = ethSource;

           // Upload 5m exec
           const execUpload = await uploadScreenshot(authUser.id, todayStr, 'morning', '5m_execution', execImgBase64);
           
           let ethUpload;
           if (ethImgBase64) {
             ethUpload = await uploadScreenshot(authUser.id, todayStr, 'morning', '15m_eth_context', ethImgBase64);
           }

           // Create setup record 
           const setupData: Record<string, any> = {
             user_id: authUser.id,
             day_type: analysis.dayType,
             instrument: session.dailyInstrument || 'MES',
             reasoning: analysis.reasoning,
             confidence: analysis.confidence,
             image_url: execUpload.storagePath,
             tags: analysis.tags || [],
             suggested_entry: analysisPlan.entry || 0,
             suggested_stop: analysisPlan.stop || 0,
             suggested_target: analysisPlan.t1 || 0,
             normalized_plan_json: analysisPlan,
             plan_source: analysisPlan.source,
             t1_price: analysisPlan.t1,
             t2_price: analysisPlan.t2,
             risk_points: analysisPlan.riskPoints,
             
             // Midnight Open Options
             midnight_open_source: analysis.midnightOpenSource,
             midnight_open_override: analysis.midnightOpenOverride,
             midnight_open_price: analysis.midnightOpenPrice,
             midnight_open_visible: analysis.midnightOpenVisible,
             rth_vs_midnight: analysis.rthVsMidnight,
             retrace_probability: analysis.retraceProbability,
             midnight_open_note: analysis.midnightOpenNote,
             is_target_today: analysis.isTargetToday,

             // OCR Timing
             ocr_timestamp_status: analysis.ocrTimestampStatus,
             ocr_timestamp_delta: analysis.ocrTimestampDelta,

             // New Context Fields
             execution_5m_screenshot_url: execUpload.url,
             execution_5m_storage_path: execUpload.storagePath,
             execution_timeframe: '5m',
             
             ...(ethUpload ? {
               eth_15m_context_screenshot_url: ethUpload.url,
               eth_15m_context_storage_path: ethUpload.storagePath,
               context_timeframe: '15m',
               context_session: 'ETH',
               eth_context_available: true,
             } : {
                 eth_context_available: false,
             }),
             
             eth_context_status: analysis.ethContextReview?.status || null,
             eth_high: analysis.ethContextReview?.ethHigh || null,
             eth_low: analysis.ethContextReview?.ethLow || null,
             asian_high: analysis.ethContextReview?.asianHigh || null,
             asian_low: analysis.ethContextReview?.asianLow || null,
             london_high: analysis.ethContextReview?.londonHigh || null,
             london_low: analysis.ethContextReview?.londonLow || null,
             ny_premarket_high: analysis.ethContextReview?.nyPremarketHigh || null,
             ny_premarket_low: analysis.ethContextReview?.nyPremarketLow || null,
             rth_open_relation_to_eth: analysis.ethContextReview?.rthOpenRelationToEth || null,
             rth_open_relation_to_midnight: analysis.ethContextReview?.rthOpenRelationToMidnight || null,
             
             trade_plan_json: analysis.final_trade_plan || analysis.tradePlan || null,
             execution_review_json: analysis.executionReview5m || null,
             eth_context_review_json: analysis.ethContextReview || null,
             midnight_open_review_json: analysis.midnightAnalysis || null,
           };

           if (ocrResult) {
             setupData.ocr_text = ocrResult;
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
             sessionType: 'morning',
             instrument: session.dailyInstrument || 'MES',
             tradeDate: new Date().toLocaleDateString('en-US'),
             dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
             midnightOpenPrice: analysis.midnightOpenPrice,
             midnightOpenInstrument: analysis.midnightOpenInstrument,
             midnightOpenSource: analysis.midnightOpenSource,
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
             entryPrice: analysisPlan.entry,
             stopPrice: analysisPlan.stop,
             t1: analysisPlan.t1,
             t2: analysisPlan.t2,
             riskPoints: analysisPlan.riskPoints,
             riskRewardT1: analysisPlan.riskRewardT1,
             riskRewardT2: analysisPlan.riskRewardT2,
             planSource: analysisPlan.source,
             whyThisPlan: analysisPlan.whyThisPlan,
             invalidation: analysisPlan.invalidation,

             execution_5m_screenshot_url: execUpload.url,
             execution_5m_storage_path: execUpload.storagePath,
             execution_timeframe: '5m',
             eth_15m_context_screenshot_url: ethUpload?.url || null,
             eth_15m_context_storage_path: ethUpload?.storagePath || null,
             context_timeframe: ethUpload ? '15m' : null,
             context_session: ethUpload ? 'ETH' : null,
             eth_context_available: !!ethUpload,
             eth_context_status: analysis.ethContextReview?.status || null,
             eth_high: analysis.ethContextReview?.ethHigh || null,
             eth_low: analysis.ethContextReview?.ethLow || null,
             asian_high: analysis.ethContextReview?.asianHigh || null,
             asian_low: analysis.ethContextReview?.asianLow || null,
             london_high: analysis.ethContextReview?.londonHigh || null,
             london_low: analysis.ethContextReview?.londonLow || null,
             ny_premarket_high: analysis.ethContextReview?.nyPremarketHigh || null,
             ny_premarket_low: analysis.ethContextReview?.nyPremarketLow || null,
             rth_open_relation_to_eth: analysis.ethContextReview?.rthOpenRelationToEth || null,
             rth_open_relation_to_midnight: analysis.ethContextReview?.rthOpenRelationToMidnight || null,
             trade_plan_json: analysis.final_trade_plan || analysis.tradePlan || null,
             execution_review_json: analysis.executionReview5m || null,
             eth_context_review_json: analysis.ethContextReview || null,
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
      onUpdate({ morningScreenshot: imgSource, analysisResult: analysis, dayType: analysis.dayType });
      
      if (!isDeepReview) {
         setPendingImage(null);
         setPendingEthImage(null);
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
  }, [pendingImage, pendingEthImage, lastImage, lastEthImage, localSettings, session.accountEquity, session.analysisResult, customRules, ocrResult, onUpdate, updateStep, modelConfig, initProgress]);

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
          <span className="text-[10px]">Next: Lunch Reversal opens at {TIME_WINDOWS.lunch.openHour >= 12 ? (TIME_WINDOWS.lunch.openHour > 12 ? TIME_WINDOWS.lunch.openHour - 12 : 12) : TIME_WINDOWS.lunch.openHour}:{TIME_WINDOWS.lunch.openMinute.toString().padStart(2, '0')} {TIME_WINDOWS.lunch.openHour >= 12 ? 'PM' : 'AM'} ET</span>
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
        <TimezoneToggle 
          selectedTimezone={session.aiSettings?.morningTimeZone || 'EST'}
          onChange={(tz) => onUpdate({ aiSettings: { ...(session.aiSettings || { temperature: 0 }), morningTimeZone: tz } })}
          showSettings={showSettings}
          onToggleSettings={() => setShowSettings(!showSettings)}
          hasSettingsIcon={true}
        />
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
          <div className="flex flex-col gap-2 mb-4">
            <div className="text-[12px] font-mono tracking-widest uppercase">
               Daily Instrument: <strong className={session.dailyInstrument === 'MNQ' ? "text-[var(--blue)]" : "text-[var(--orange)]"}>{session.dailyInstrument || "MES"}</strong>
            </div>
            {ocrResult?.ticker && ocrResult.ticker !== (session.dailyInstrument || "MES") && (
              <div className="text-[10px] text-[var(--orange)] mt-1 bg-[var(--orange)]/10 border border-[var(--orange)]/20 p-2 rounded">
                 OCR saw {ocrResult.ticker}, but Daily Instrument is {session.dailyInstrument || "MES"}. Using {session.dailyInstrument || "MES"} as source of truth.
              </div>
            )}
          </div>
          {/* Side-by-side upload zone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="upload-zone flex flex-col items-center justify-center p-6 h-full">
              <Upload className="w-6 h-6 text-[var(--txt3)] mb-4 upload-icon transition-colors" />
              <h3 className="text-[12px] font-mono font-bold text-[var(--orange)] uppercase tracking-widest mb-1">
                Required — 5M Execution
              </h3>
              <p className="text-[9px] text-[var(--txt2)] mb-6 text-center max-w-[200px]">
                Screenshot from 9:30 open to 10:10 close.
              </p>
              
              <div className="flex gap-4 w-full max-w-[240px]">
                <label className="qd-btn-primary cursor-pointer flex-1 text-center whitespace-nowrap">
                  Select
                  <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'exec')} accept="image/*" />
                </label>
                <button className="qd-btn-ghost flex-1 whitespace-nowrap" onClick={() => handlePasteFromClipboard('exec')}>Paste</button>
              </div>
            </div>

            <div className="upload-zone flex flex-col items-center justify-center p-6 h-full border-dashed border-[var(--b2)] relative">
              <h3 className="text-[12px] font-mono font-bold text-[var(--txt)] uppercase tracking-widest mb-1 flex items-center gap-2">
                <span className="text-[9px] bg-[var(--b2)] text-[var(--txt)] px-1 py-0.5 rounded uppercase">Optional</span>
                15M ETH Context
              </h3>
              <p className="text-[9px] text-[var(--txt2)] mb-6 text-center max-w-[200px]">
                8:00 PM to 9:45 AM context chart. Recommended.
              </p>
              
              {!pendingEthImage ? (
                <div className="flex gap-4 w-full max-w-[240px]">
                  <label className="qd-btn-secondary cursor-pointer flex-1 text-center whitespace-nowrap !bg-[var(--b1)] !text-[var(--txt2)]">
                    Select
                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'eth')} accept="image/*" />
                  </label>
                  <button className="qd-btn-ghost flex-1 whitespace-nowrap opacity-60" onClick={() => handlePasteFromClipboard('eth')}>Paste</button>
                </div>
              ) : (
                <div className="relative group w-full max-w-[240px]">
                   <img src={pendingEthImage} alt="ETH Context" className="w-full h-24 object-cover rounded border border-[var(--b2)] opacity-80" />
                   <button onClick={() => setPendingEthImage(null)} className="absolute top-1 right-1 bg-[var(--bg)] text-[var(--txt)] rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow">
                     <XCircle className="w-4 h-4" />
                   </button>
                   <div className="mt-2 text-center text-[10px] text-[var(--green)] flex flex-col gap-1 items-center font-mono">
                     <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> ETH Context Attached</span>
                   </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="w-full max-w-sm mt-0 p-4 border border-[var(--b2)] bg-[var(--b0)] rounded text-left mb-6 mx-auto">
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
          {/* New Rule Pipeline UI */}
          
          {/* 1. CURRENT RULE ANALYSIS */}
          {result.current_rule_analysis && (
            <div className="card-base flex flex-col p-4 border border-[var(--b2)] bg-[var(--s2)]">
              <h3 className="text-[11px] font-mono font-bold text-[var(--txt)] flex items-center gap-2 mb-4">
                <Target size={14} className="text-[var(--amber)]" />
                1. CURRENT RULE ANALYSIS
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-[var(--txt3)] font-mono uppercase">Setup Detected</span>
                  <span className="text-[12px] font-bold text-[var(--txt)]">{result.current_rule_analysis.setup_detected}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-[var(--txt3)] font-mono uppercase">Rule Category</span>
                  <span className="text-[12px] font-mono text-[var(--blue)]">{result.current_rule_analysis.rule_category}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-[var(--txt3)] font-mono uppercase">Base Confidence</span>
                  <span className="text-[12px] font-bold text-[var(--txt)]">{result.current_rule_analysis.base_confidence}</span>
                </div>
                {result.current_rule_analysis.no_trade_reason && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-[var(--txt3)] font-mono uppercase">No Trade Reason</span>
                    <span className="text-[12px] text-[var(--red)]">{result.current_rule_analysis.no_trade_reason}</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[var(--bg)] p-2 text-center border border-[var(--b1)]">
                  <div className="text-[9px] font-mono text-[var(--txt2)]">ENTRY</div>
                  <div className="text-[14px] font-mono text-[var(--txt)]">{result.current_rule_analysis.entry || '—'}</div>
                </div>
                <div className="bg-[var(--bg)] p-2 text-center border border-[var(--b1)]">
                  <div className="text-[9px] font-mono text-[var(--txt2)]">STOP</div>
                  <div className="text-[14px] font-mono text-[var(--red)]">{result.current_rule_analysis.stop || '—'}</div>
                </div>
                <div className="bg-[var(--bg)] p-2 text-center border border-[var(--b1)]">
                  <div className="text-[9px] font-mono text-[var(--txt2)]">TARGET 1</div>
                  <div className="text-[14px] font-mono text-[var(--green)]">{result.current_rule_analysis.target_1 || '—'}</div>
                </div>
              </div>
            </div>
          )}

          {/* 2. AGENT LEARNING CONTEXT */}
          {result.rag_learning_context && (
            <div className="card-base flex flex-col p-4 border border-[var(--blue)]/30 bg-[var(--blue)]/5">
              <h3 className="text-[11px] font-mono font-bold text-[var(--txt)] flex items-center gap-2 mb-4">
                <Cpu size={14} className="text-[var(--blue)]" />
                2. AGENT LEARNING CONTEXT
              </h3>
              
              {!result.rag_learning_context.rag_search_attempted ? (
                <div className="text-[12px] text-[var(--txt2)] italic">Agent learning unavailable. Plan built from current screenshot and rules only.</div>
              ) : result.rag_learning_context.rag_records_found === 0 ? (
                <div className="text-[12px] text-[var(--txt2)] italic">No similar Replay/RAG records found yet. Plan built from current screenshot and rules only.</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-[var(--txt3)] font-mono uppercase">RAG Searched</span>
                      <span className="text-[12px] font-bold text-[var(--green)]">YES</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-[var(--txt3)] font-mono uppercase">Records Found</span>
                      <span className="text-[12px] font-mono text-[var(--txt)] text-left">{result.rag_learning_context.rag_records_found} Total ({result.rag_learning_context.live_records_found} Live, {result.rag_learning_context.replay_records_found} Replay)</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-[var(--txt3)] font-mono uppercase">Similar Outcomes</span>
                      <span className="text-[12px] font-mono text-[var(--txt)]"><span className="text-[var(--green)]">{result.rag_learning_context.historical_win_count}W</span> / <span className="text-[var(--red)]">{result.rag_learning_context.historical_loss_count}L</span> / {result.rag_learning_context.historical_scratch_count}S</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-[var(--txt3)] font-mono uppercase">Avg PnL</span>
                      <span className="text-[12px] font-bold text-[var(--txt)]">{result.rag_learning_context.average_pnl_ticks > 0 ? '+' : ''}{result.rag_learning_context.average_pnl_ticks} ticks</span>
                    </div>
                  </div>
                  
                  <div className="bg-[var(--bg)] p-3 rounded border border-[var(--b1)] flex flex-col gap-2">
                    <div className="text-[10px] font-mono grid grid-cols-2 gap-4 mb-2">
                      <div>
                        <span className="text-[var(--txt3)] uppercase">Support Rating:</span>{' '}
                        <span className={result.rag_learning_context.historical_support_rating === 'SUPPORTS PLAN' ? 'text-[var(--green)] font-bold' : result.rag_learning_context.historical_support_rating === 'CONFLICTS WITH PLAN' ? 'text-[var(--red)] font-bold' : 'text-[var(--amber)]'}>{result.rag_learning_context.historical_support_rating}</span>
                      </div>
                      <div>
                        <span className="text-[var(--txt3)] uppercase">Confidence Adj:</span>{' '}
                        <span className={result.rag_learning_context.confidence_adjustment === 'Increased' ? 'text-[var(--green)]' : result.rag_learning_context.confidence_adjustment === 'Reduced' ? 'text-[var(--red)]' : 'text-[var(--txt)]'}>{result.rag_learning_context.confidence_adjustment}</span>
                      </div>
                    </div>
                    <div className="text-[11px] text-[var(--txt)] border-t border-[var(--b1)] pt-2">
                      {result.rag_learning_context.explanation}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 3. FINAL TRADE PLAN */}
          {normalizedPlan && (
            <FinalTradePlanCard
              plan={normalizedPlan}
              agentLearningUsed={result.agent_learning_used}
            />
          )}

          {/* Legacy Components Container */}
          <div className="mt-8 pt-8 border-t border-[var(--b1)] opacity-70">
            <div className="text-[10px] text-[var(--txt3)] font-mono uppercase mb-4">Internal Diagnositcs & Legacy Data</div>
          
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
                 {(!normalizedPlan?.canExecute && normalizedPlan?.decision !== "LONG" && normalizedPlan?.decision !== "SHORT") && (
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
                 <div className="flex flex-col gap-1">
                   <button
                     onClick={() => handleSaveTrade()}
                     disabled={isSavingTrade || !normalizedPlan?.canExecute}
                     className="qd-btn-primary flex items-center justify-center gap-2 h-[38px] min-w-[140px]"
                   >
                     {isSavingTrade ? 'Saving...' : 'Execute Trade'}
                   </button>
                   {!normalizedPlan?.canExecute && <span className="text-[9px] text-[var(--txt3)] w-[140px] leading-tight text-center">Need valid plan</span>}
                 </div>
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
                  dailyInstrument={session.dailyInstrument}
                  tradePlan={normalizedPlan}
                />
              )}
             </div>
          )}
          </div>
        </div>
      )}
    </div>
  );
}
