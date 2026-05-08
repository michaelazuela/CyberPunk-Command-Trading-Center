import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, XCircle, Brain, Target, Shield, CheckCircle2 } from 'lucide-react';
import { SessionState, Trade, AnalysisResult } from '../types';
import { cn, getImageFromClipboard, formatReplayRange } from '../lib/utils';
import { analyzeChart, preCheckChartInfo, type OCRResult } from '../lib/gemini';
import { uploadScreenshot } from '../lib/cloudStorage';
import { supabase } from '../lib/supabase';
import TradeProofPanel from './TradeProofPanel';
import { TimezoneToggle } from './TimezoneToggle';
import { normalizeTradePlan } from '../lib/tradePlan';
import FinalTradePlanCard from './FinalTradePlanCard';

type ReplayPasteTarget = 'morning_eth_context' | 'morning_5m_execution' | 'lunch_5m_execution' | null;
type ReplayOutcome = 'win' | 'loss' | 'scratch' | 'no_trade' | 'missed_trade';

interface UploadedImage {
  dataUrl: string;
  ocrResult?: OCRResult | null;
  storagePath?: string;
}

export default function ReplayLab({
  session,
  onAddTrade,
  isActive
}: {
  session: SessionState;
  onAddTrade?: (trade: Omit<Trade, 'id' | 'timestamp'>) => void;
  isActive?: boolean;
}) {
  const [tradeDate, setTradeDate] = useState<string>('');
  const [instrument, setInstrument] = useState<"MES" | "MNQ">(session.dailyInstrument || "MES");
  const [contracts, setContracts] = useState<number>(1);
  const [midnightOpen, setMidnightOpen] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  const [activePasteTarget, setActivePasteTarget] = useState<ReplayPasteTarget>(null);
  
  // Morning State
  const [morningEthImg, setMorningEthImg] = useState<UploadedImage | null>(null);
  const [morningExecImg, setMorningExecImg] = useState<UploadedImage | null>(null);
  const [isAnalyzingMorning, setIsAnalyzingMorning] = useState(false);
  const [morningResult, setMorningResult] = useState<AnalysisResult | null>(null);
  const [morningSetupId, setMorningSetupId] = useState<string | null>(null);
  const [morningError, setMorningError] = useState<string | null>(null);
  const [morningSaveStatus, setMorningSaveStatus] = useState<string | null>(null);
  const [morningOutcome, setMorningOutcome] = useState<ReplayOutcome | null>(null);
  const [morningReviewTimezone, setMorningReviewTimezone] = useState<'EST' | 'PST'>('EST');

  // Lunch State
  const [lunchExecImg, setLunchExecImg] = useState<UploadedImage | null>(null);
  const [isAnalyzingLunch, setIsAnalyzingLunch] = useState(false);
  const [lunchResult, setLunchResult] = useState<AnalysisResult | null>(null);
  const [lunchSetupId, setLunchSetupId] = useState<string | null>(null);
  const [lunchError, setLunchError] = useState<string | null>(null);
  const [lunchSaveStatus, setLunchSaveStatus] = useState<string | null>(null);
  const [lunchOutcome, setLunchOutcome] = useState<ReplayOutcome | null>(null);
  const [lunchReviewTimezone, setLunchReviewTimezone] = useState<'EST' | 'PST'>('EST');

  const [proofFlow, setProofFlow] = useState<{ active: boolean; outcome?: 'SUCCESS' | 'FAILED'; sessionType?: 'morning' | 'lunch' }>({ active: false });
  const [savingOutcome, setSavingOutcome] = useState<{ sessionType: 'morning' | 'lunch'; outcome: ReplayOutcome } | null>(null);

  const normalizedMorningPlan = morningResult ? normalizeTradePlan(morningResult, instrument) : null;
  const normalizedLunchPlan = lunchResult ? normalizeTradePlan(lunchResult, instrument) : null;

  const handleGlobalClick = useCallback((e: MouseEvent) => {
    // Determine target based on what user clicked
    const target = e.target as HTMLElement;
    if (target.closest('.morning-eth-slot')) setActivePasteTarget('morning_eth_context');
    else if (target.closest('.morning-exec-slot')) setActivePasteTarget('morning_5m_execution');
    else if (target.closest('.lunch-exec-slot')) setActivePasteTarget('lunch_5m_execution');
    else if (target.closest('.morning-panel')) setActivePasteTarget('morning_5m_execution');
    else if (target.closest('.lunch-panel')) setActivePasteTarget('lunch_5m_execution');
    else setActivePasteTarget(null);
  }, []);

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    if (e.defaultPrevented || proofFlow.active) return;
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || (activeElement as HTMLElement).isContentEditable)) {
      return;
    }
    
    // Choose destination based on active target or default to morning if empty
    let insertTarget = activePasteTarget;
    if (!insertTarget) {
      if (!morningExecImg) insertTarget = 'morning_5m_execution';
      else insertTarget = 'lunch_5m_execution';
    }

    try {
      const imageData = await getImageFromClipboard(e);
      if (imageData) {
        e.preventDefault();
        e.stopPropagation();
        processImage(imageData, insertTarget);
      }
    } catch (err) {
      console.error(err);
    }
  }, [activePasteTarget, proofFlow.active, morningExecImg]);

  useEffect(() => {
    if (!isActive) return;
    window.addEventListener('click', handleGlobalClick, { capture: true });
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('click', handleGlobalClick, { capture: true });
      window.removeEventListener('paste', handlePaste);
    };
  }, [handleGlobalClick, handlePaste, isActive]);

  const resetReplayLab = () => {
    setTradeDate('');
    setInstrument(session.dailyInstrument || "MES");
    setContracts(1);
    setMidnightOpen('');
    setNotes('');
    setActivePasteTarget(null);
    setMorningEthImg(null);
    setMorningExecImg(null);
    setIsAnalyzingMorning(false);
    setMorningResult(null);
    setMorningSetupId(null);
    setMorningError(null);
    setMorningSaveStatus(null);
    setMorningOutcome(null);
    setLunchExecImg(null);
    setIsAnalyzingLunch(false);
    setLunchResult(null);
    setLunchSetupId(null);
    setLunchError(null);
    setLunchSaveStatus(null);
    setLunchOutcome(null);
    setProofFlow({ active: false });
    setSavingOutcome(null);
  };

  const processImage = async (dataUrl: string, target: ReplayPasteTarget) => {
    // Auto OCR
    const newImg: UploadedImage = { dataUrl };
    if (target === 'morning_eth_context') setMorningEthImg(newImg);
    if (target === 'morning_5m_execution') setMorningExecImg(newImg);
    if (target === 'lunch_5m_execution') setLunchExecImg(newImg);

    try {
      const ocr = await preCheckChartInfo(dataUrl);
      if (ocr) {
        // Find Midnight Open from ETH
        if (target === 'morning_eth_context' && ocr.lastTimestamp?.includes('18:00') && ocr.currentPrice) {
          setMidnightOpen(ocr.currentPrice.toString());
        }
        if (target === 'morning_eth_context') setMorningEthImg({ dataUrl, ocrResult: ocr });
        if (target === 'morning_5m_execution') setMorningExecImg({ dataUrl, ocrResult: ocr });
        if (target === 'lunch_5m_execution') setLunchExecImg({ dataUrl, ocrResult: ocr });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: ReplayPasteTarget) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) processImage(evt.target.result as string, target);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const runMorningAnalysis = async () => {
    if (!tradeDate || !instrument || !morningExecImg) {
      setMorningError("Required: Trade Date, Instrument, and 5m Morning Execution");
      return;
    }
    setMorningError(null);
    setMorningSaveStatus(null);
    setIsAnalyzingMorning(true);
    setMorningResult(null);

    try {
      const imgPayload = morningEthImg ? { exec: morningExecImg.dataUrl, eth: morningEthImg.dataUrl } : morningExecImg.dataUrl;
      const analysisRaw = await analyzeChart(imgPayload, session.aiSettings, session.accountEquity, undefined, [], 'morning_replay', undefined, midnightOpen || undefined, instrument);
      const analysis = analysisRaw as AnalysisResult;
      const analysisPlan = normalizeTradePlan(analysis, instrument);
      
      setMorningResult(analysis);
      
      // Save Setup to Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMorningError("Login required: Replay setup was analyzed, but it was not saved to Supabase.");
      } else {
         let ethStoragePath, execStoragePath;
         if (morningEthImg) {
           const ethUpload = await uploadScreenshot(user.id, tradeDate, 'replay_lab/morning', '15m_eth_context', morningEthImg.dataUrl);
           ethStoragePath = ethUpload.storagePath;
           setMorningEthImg({ ...morningEthImg, storagePath: ethStoragePath });
         }
         const execUpload = await uploadScreenshot(user.id, tradeDate, 'replay_lab/morning', '5m_execution', morningExecImg.dataUrl);
         execStoragePath = execUpload.storagePath;
         setMorningExecImg({ ...morningExecImg, storagePath: execStoragePath });
         
         const setupData: Record<string, any> = {
           user_id: user.id,
           analysis_mode: 'historical_replay',
           source: 'replay_lab',
           session_type: 'morning',
           instrument: instrument,
           trade_date: tradeDate,
           day_type: analysis.dayType,
           reasoning: analysis.reasoning,
           confidence: analysis.confidence,
           image_url: execStoragePath,
           eth_context_screenshot_url: ethStoragePath,
           execution_screenshot_url: execStoragePath,
           trade_plan_json: {
             best_trade_plan: analysis.best_trade_plan || null,
             final_trade_plan: analysis.final_trade_plan || null,
             candidate_trade_plans: analysis.candidate_trade_plans || [],
             trade_management_plan: analysis.trade_management_plan || null,
             normalized_plan: analysisPlan,
             legacy_trade_plan: analysis.tradePlan || null,
           },
           normalized_plan_json: analysisPlan,
           plan_source: analysisPlan.source,
           suggested_entry: analysisPlan.entry || 0,
           suggested_stop: analysisPlan.stop || 0,
           suggested_target: analysisPlan.t1 || 0,
           t1_price: analysisPlan.t1,
           t2_price: analysisPlan.t2,
           risk_points: analysisPlan.riskPoints,
           midnight_open_price: analysis.midnightOpenPrice,
           midnight_open_source: analysis.midnightOpenSource || (midnightOpen ? 'manual' : undefined),
           rth_vs_midnight: analysis.rthVsMidnight,
           retrace_probability: analysis.retraceProbability,
           execution_review_json: analysis.executionReview5m || null,
           eth_context_review_json: analysis.ethContextReview || null,
           midnight_open_review_json: analysis.midnightAnalysis || null,
           replay_status: 'pending'
         };
         Object.keys(setupData).forEach(key => setupData[key] === undefined && delete setupData[key]);

        const { data: docData, error: dbError } = await supabase.from('setups').insert([setupData]).select('id').single();
        if (dbError || !docData?.id) {
          throw new Error(`Supabase setup save failed: ${dbError?.message || 'No setup ID returned.'}`);
        }
        setMorningSetupId(docData.id);
        setMorningSaveStatus(`Replay setup saved. Setup ID: ${docData.id}`);
      }
    } catch (err: any) {
      setMorningError(err.message || 'Morning analysis failed');
    } finally {
      setIsAnalyzingMorning(false);
    }
  };

  const runLunchAnalysis = async () => {
    if (!tradeDate || !instrument || !lunchExecImg) {
      setLunchError("Required: Trade Date, Instrument, and 5m Lunch Execution");
      return;
    }
    setLunchError(null);
    setLunchSaveStatus(null);
    setIsAnalyzingLunch(true);
    setLunchResult(null);

    try {
      const imgPayload = lunchExecImg.dataUrl;
      const previousAnalysis = morningResult ? {
        tradePlan: morningResult.tradePlan,
        midnightOpenPrice: morningResult.midnightOpenPrice,
        ethContextReview: morningResult.ethContextReview,
        reasoning: morningResult.reasoning
      } : undefined;
      
      const analysisRaw = await analyzeChart(imgPayload, session.aiSettings, session.accountEquity, previousAnalysis, [], 'lunch_replay', undefined, midnightOpen || morningResult?.midnightOpenPrice?.toString() || undefined, instrument);
      const analysis = analysisRaw as AnalysisResult;
      const analysisPlan = normalizeTradePlan(analysis, instrument);
      
      setLunchResult(analysis);
      
      // Save Setup to Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLunchError("Login required: Replay setup was analyzed, but it was not saved to Supabase.");
      } else {
         const execUpload = await uploadScreenshot(user.id, tradeDate, 'replay_lab/lunch', '5m_execution', lunchExecImg.dataUrl);
         const execStoragePath = execUpload.storagePath;
         setLunchExecImg({ ...lunchExecImg, storagePath: execStoragePath });
         
         const setupData: Record<string, any> = {
           user_id: user.id,
           analysis_mode: 'historical_replay',
           source: 'replay_lab',
           session_type: 'lunch',
           instrument: instrument,
           trade_date: tradeDate,
           day_type: analysis.dayType,
           reasoning: analysis.reasoning,
           confidence: analysis.confidence,
           image_url: execStoragePath,
           execution_screenshot_url: execStoragePath,
           trade_plan_json: {
             best_trade_plan: analysis.best_trade_plan || null,
             final_trade_plan: analysis.final_trade_plan || null,
             candidate_trade_plans: analysis.candidate_trade_plans || [],
             trade_management_plan: analysis.trade_management_plan || null,
             normalized_plan: analysisPlan,
             legacy_trade_plan: analysis.tradePlan || null,
           },
           normalized_plan_json: analysisPlan,
           plan_source: analysisPlan.source,
           suggested_entry: analysisPlan.entry || 0,
           suggested_stop: analysisPlan.stop || 0,
           suggested_target: analysisPlan.t1 || 0,
           t1_price: analysisPlan.t1,
           t2_price: analysisPlan.t2,
           risk_points: analysisPlan.riskPoints,
           midnight_open_price: analysis.midnightOpenPrice || morningResult?.midnightOpenPrice,
           midnight_open_source: analysis.midnightOpenSource || (midnightOpen ? 'manual' : undefined),
           rth_vs_midnight: analysis.rthVsMidnight,
           retrace_probability: analysis.retraceProbability,
           execution_review_json: analysis.executionReview5m || null,
           afternoon_test_plan_json: analysis.afternoonTestPlan || null,
           midnight_open_review_json: analysis.midnightAnalysis || null,
           morning_context_setup_id: morningSetupId || undefined,
           replay_status: 'pending'
         };
         Object.keys(setupData).forEach(key => setupData[key] === undefined && delete setupData[key]);

        const { data: docData, error: dbError } = await supabase.from('setups').insert([setupData]).select('id').single();
        if (dbError || !docData?.id) {
          throw new Error(`Supabase setup save failed: ${dbError?.message || 'No setup ID returned.'}`);
        }
        setLunchSetupId(docData.id);
        setLunchSaveStatus(`Replay setup saved. Setup ID: ${docData.id}`);
      }
    } catch (err: any) {
      setLunchError(err.message || 'Lunch analysis failed');
    } finally {
      setIsAnalyzingLunch(false);
    }
  };

  const ensureReplaySetupId = async (
    sessionType: 'morning' | 'lunch',
    userId: string,
    result: AnalysisResult,
    normalizedPlan: ReturnType<typeof normalizeTradePlan> | null
  ) => {
    const currentSetupId = sessionType === 'morning' ? morningSetupId : lunchSetupId;
    if (currentSetupId) return currentSetupId;

    const setSessionSetupId = sessionType === 'morning' ? setMorningSetupId : setLunchSetupId;
    const execImg = sessionType === 'morning' ? morningExecImg : lunchExecImg;
    const setupData: Record<string, any> = {
      user_id: userId,
      analysis_mode: 'historical_replay',
      source: 'replay_lab',
      session_type: sessionType,
      instrument,
      trade_date: tradeDate,
      day_type: result.dayType,
      reasoning: result.reasoning,
      confidence: result.confidence,
      image_url: execImg?.storagePath || execImg?.dataUrl,
      eth_context_screenshot_url: sessionType === 'morning' ? morningEthImg?.storagePath : undefined,
      execution_screenshot_url: execImg?.storagePath,
      trade_plan_json: {
        best_trade_plan: result.best_trade_plan || null,
        final_trade_plan: result.final_trade_plan || null,
        candidate_trade_plans: result.candidate_trade_plans || [],
        trade_management_plan: result.trade_management_plan || null,
        normalized_plan: normalizedPlan,
        legacy_trade_plan: result.tradePlan || null,
      },
      normalized_plan_json: normalizedPlan,
      plan_source: normalizedPlan?.source,
      suggested_entry: normalizedPlan?.entry ?? 0,
      suggested_stop: normalizedPlan?.stop ?? 0,
      suggested_target: normalizedPlan?.t1 ?? 0,
      t1_price: normalizedPlan?.t1,
      t2_price: normalizedPlan?.t2,
      risk_points: normalizedPlan?.riskPoints,
      midnight_open_price: result.midnightOpenPrice ?? (midnightOpen ? Number(midnightOpen) : null),
      midnight_open_source: result.midnightOpenSource || (midnightOpen ? 'manual' : undefined),
      rth_vs_midnight: result.rthVsMidnight,
      retrace_probability: result.retraceProbability,
      execution_review_json: result.executionReview5m || null,
      eth_context_review_json: sessionType === 'morning' ? result.ethContextReview || null : undefined,
      afternoon_test_plan_json: sessionType === 'lunch' ? result.afternoonTestPlan || null : undefined,
      midnight_open_review_json: result.midnightAnalysis || null,
      morning_context_setup_id: sessionType === 'lunch' ? morningSetupId || undefined : undefined,
      replay_status: 'pending',
      contracts
    };
    Object.keys(setupData).forEach(key => setupData[key] === undefined && delete setupData[key]);

    const { data, error } = await supabase
      .from('setups')
      .insert([setupData])
      .select('id')
      .single();

    if (error || !data?.id) {
      throw new Error(`Replay setup recovery failed: ${error?.message || 'No setup ID returned.'}`);
    }

    setSessionSetupId(data.id);
    return data.id as string;
  };

  const saveTradeOutcome = async (sessionType: 'morning' | 'lunch', outcome: ReplayOutcome) => {
    const result = sessionType === 'morning' ? morningResult : lunchResult;
    const setSessionError = sessionType === 'morning' ? setMorningError : setLunchError;
    const setSessionStatus = sessionType === 'morning' ? setMorningSaveStatus : setLunchSaveStatus;

    setSessionError(null);
    setSessionStatus(`Saving ${outcome.replace(/_/g, ' ').toUpperCase()} to Supabase + RAG...`);
    setSavingOutcome({ sessionType, outcome });

    if (!result) {
      setSessionError("No replay analysis result found. Run the replay analysis before marking an outcome.");
      setSessionStatus(null);
      setSavingOutcome(null);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSessionError("Login required: outcome was not saved to Supabase or RAG.");
        setSessionStatus(null);
        return;
      }

      // Map to RAG Save schema
      const ragStatus = ['win', 'loss', 'scratch', 'no_trade', 'missed_trade'].includes(outcome) ? outcome : 'pending';
      const manualOutcome = outcome === 'win' || outcome === 'scratch' ? 'SUCCESS' : 'FAILED';
      const tradeStatus = (outcome === 'no_trade' || outcome === 'missed_trade') ? 'MISSED' : outcome === 'scratch' ? 'CLOSED' : outcome === 'win' ? 'SUCCESSFUL' : 'FAILED';
      const normalizedPlan = sessionType === 'morning' ? normalizedMorningPlan : normalizedLunchPlan;
      const requiresExecutablePlan = outcome === 'win' || outcome === 'loss' || outcome === 'scratch';

      if (requiresExecutablePlan && (!normalizedPlan?.canExecute || normalizedPlan.entry === null || normalizedPlan.stop === null || normalizedPlan.t1 === null || normalizedPlan.t2 === null)) {
        console.warn("[Replay Lab] Outcome not saved: executable outcomes require ENTRY, STOP, T1, and T2.");
        setSessionError("Executable outcomes require ENTRY, STOP, T1, and T2. Mark No Trade or Missed Trade if no executable plan was produced.");
        return;
      }

      const resolvedSetupId = await ensureReplaySetupId(sessionType, user.id, result, normalizedPlan);

      const { data: updatedSetup, error: setupUpdateError } = await supabase
        .from('setups')
        .update({
          outcome,
          replay_status: 'verified',
          contracts
        })
        .eq('id', resolvedSetupId)
        .select('id,outcome,replay_status')
        .single();

      if (setupUpdateError || !updatedSetup?.id) {
        throw new Error(`Supabase outcome update failed: ${setupUpdateError?.message || 'No updated setup row returned.'}`);
      }

      const entryPrice = normalizedPlan?.entry ?? null;
      const stopPrice = normalizedPlan?.stop ?? null;
      const targetPrice = normalizedPlan?.t1 ?? null;

      const tradeData: Omit<Trade, 'id'> = {
        date: tradeDate,
        instrument: instrument,
        direction: normalizedPlan?.decision === 'LONG' || normalizedPlan?.decision === 'SHORT' ? normalizedPlan.decision : result.dayType?.includes('SHORT') ? 'SHORT' : 'LONG',
        dayType: result.dayType || 'NO TRADE',
        entryPrice: entryPrice ?? 0,
        stopPrice: stopPrice ?? 0,
        targetPrice: targetPrice ?? 0,
        contracts: contracts,
        status: tradeStatus,
        manualOutcome: manualOutcome,
        analysisMode: 'historical_replay',
        source: 'replay_lab',
        sessionType: sessionType,
        setupId: resolvedSetupId,
        timestamp: Date.now()
      };
      
      if (onAddTrade && requiresExecutablePlan) {
        try {
          await Promise.resolve(onAddTrade(tradeData as any));
        } catch (tradeHistoryError) {
          console.warn("[Replay Lab] Trade history save failed, continuing with RAG outcome save:", tradeHistoryError);
        }
      }

      const { saveToRAG } = await import('../lib/rag');
      await saveToRAG({
         setupId: resolvedSetupId,
         analysis_mode: 'historical_replay',
         source: 'replay_lab',
         sessionType,
         instrument,
         tradeDate,
         dayOfWeek: new Date(tradeDate).toLocaleDateString('en-US', { weekday: 'long' }),
         midnightOpenPrice: result.midnightOpenPrice,
         midnightOpenInstrument: instrument,
         retraceProbability: result.retraceProbability,
         ibPosition: undefined,
         geminiConfidence: result.confidence as any,
         geminiAnalysisJson: result,
         geminiVerdict: null,
         tradeResult: ragStatus,
         contracts,
         entryPrice: normalizedPlan?.entry, // Estimate or actual
         stopPrice: normalizedPlan?.stop,
         t1: normalizedPlan?.t1,
         t2: normalizedPlan?.t2,
         riskPoints: normalizedPlan?.riskPoints,
         riskRewardT1: normalizedPlan?.riskRewardT1,
         riskRewardT2: normalizedPlan?.riskRewardT2,
         planSource: normalizedPlan?.source,
         whyThisPlan: normalizedPlan?.whyThisPlan,
         invalidation: normalizedPlan?.invalidation,
         notes: `${notes ? notes + '\n' : ''}Replay Plan (${normalizedPlan?.source || 'missing'})\nRisk: ${normalizedPlan?.riskPoints || 'N/A'}\nT1: ${normalizedPlan?.t1 || 'N/A'}\nT2: ${normalizedPlan?.t2 || 'N/A'}\nWhy: ${normalizedPlan?.whyThisPlan || 'N/A'}\nInvalidation: ${normalizedPlan?.invalidation || 'N/A'}`,
         ocrText: JSON.stringify({ ...(sessionType === 'morning' ? morningExecImg?.ocrResult : lunchExecImg?.ocrResult) }),
         execution_5m_storage_path: sessionType === 'morning' ? morningExecImg?.storagePath : lunchExecImg?.storagePath,
         eth_15m_context_storage_path: sessionType === 'morning' ? morningEthImg?.storagePath : undefined,
         execution_timeframe: '5m',
         context_timeframe: sessionType === 'morning' && morningEthImg ? '15m' : undefined,
         context_session: sessionType === 'morning' && morningEthImg ? 'ETH' : undefined,
         eth_context_available: sessionType === 'morning' ? !!morningEthImg : false,
         window_start: sessionType === 'lunch' ? "11:50" : undefined,
         window_end: sessionType === 'lunch' ? "13:00" : undefined,
         window_timezone: sessionType === 'lunch' ? "America/New_York" : undefined,
         required_screenshot_range: sessionType === 'lunch' ? "11:50 AM ET → 1:00 PM ET" : undefined,
      });

      const { data: ragRow, error: ragVerifyError } = await supabase
        .from('trade_embeddings')
        .select('id,setup_id,trade_result')
        .eq('setup_id', resolvedSetupId)
        .maybeSingle();

      if (ragVerifyError || !ragRow?.id) {
        throw new Error(`RAG verification failed: ${ragVerifyError?.message || 'No trade_embeddings row found for setup ID.'}`);
      }

      if (ragRow.trade_result !== ragStatus) {
        throw new Error(`RAG verification mismatch: expected ${ragStatus}, received ${ragRow.trade_result || 'empty'}.`);
      }

      if (sessionType === 'morning') setMorningOutcome(outcome);
      else setLunchOutcome(outcome);
      setSessionStatus(`Saved to Supabase + RAG ✓ Setup ID: ${resolvedSetupId} · RAG ID: ${ragRow.id} · Result: ${outcome.toUpperCase()}`);

      if (requiresExecutablePlan) {
        setProofFlow({ active: true, outcome: manualOutcome, sessionType });
      } else {
        setProofFlow({ active: false });
      }
      
    } catch (err: any) {
      console.error(err);
      setSessionError(err.message || "Outcome save failed.");
      setSessionStatus(null);
    } finally {
      setSavingOutcome(null);
    }
  };

  const handleProofSave = async (manualOutcome: 'SUCCESS' | 'FAILED', proofData?: Partial<Trade>) => {
    const sessionType = proofFlow.sessionType;
    if (!sessionType) return;
    
    // Merge proof data (PnL etc) into setup / history
    const setupId = sessionType === 'morning' ? morningSetupId : lunchSetupId;
    if (setupId && proofData) {
      await supabase.from('setups').update({
        pnl_ticks: proofData.pnlTicks,
        pnl_dollars: proofData.pnlDollars,
        proof_screenshot_url: proofData.proof_screenshot_url
      }).eq('id', setupId);

      // Re-embed to capture PNL and trade outcome
      const { updateRAGWithTradeResult } = await import('../lib/rag');
      // The manual outcome from ProofCapture is 'SUCCESS' or 'FAILED' or 'SCRATCH'
      // We need to infer the original RAG status based on what was passed to proof:
      const outcomeFromButton = proofFlow.outcome === 'SUCCESS' ? 'win' : proofFlow.outcome === 'FAILED' ? 'loss' : 'scratch';
      
      await updateRAGWithTradeResult(
         setupId,
         outcomeFromButton,
         proofData.pnlTicks,
         proofData.pnlDollars,
         undefined,
         undefined,
         undefined,
         proofData.proof_screenshot_url
      );
    }
    
    setProofFlow({ active: false });
  };

  return (
    <div className="flex flex-col h-full fade-in">
      {/* Top Header */}
      <div className="flex items-center gap-4 mb-6 sticky top-0 bg-[var(--bg)]/90 backdrop-blur z-10 py-4 border-b border-[var(--b2)]">
        <h1 className="text-xl font-bold tracking-tight text-[var(--txt)] flex-1">REPLAY LAB</h1>
        <button onClick={resetReplayLab} className="qd-btn-ghost text-[10px]">
          Reset Replay
        </button>
        <div className="flex bg-[var(--b1)] p-1 rounded-sm gap-1 text-[10px]">
          <span className="px-2 py-1 bg-[var(--b2)] text-[var(--txt)]">Historical Training Mode</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-[var(--b0)] border border-[var(--b2)] p-4 rounded-sm mb-6 shadow-sm font-mono text-[11px]">
        <div className="flex flex-col gap-2">
           <label className="text-[var(--txt2)] uppercase tracking-widest font-bold">Trading Date *</label>
           <input type="date" value={tradeDate} onChange={e => setTradeDate(e.target.value)} className="bg-[var(--bg)] border border-[var(--b2)] text-[var(--txt)] p-2" />
        </div>
        <div className="flex flex-col gap-2">
           <label className="text-[var(--txt2)] uppercase tracking-widest font-bold">Instrument *</label>
           <div className="flex gap-2">
             <button onClick={() => setInstrument('MES')} className={cn("flex-1 p-2 border", instrument === 'MES' ? "bg-[var(--orange)] border-[var(--orange)] text-black font-bold" : "border-[var(--b2)]")}>MES</button>
             <button onClick={() => setInstrument('MNQ')} className={cn("flex-1 p-2 border", instrument === 'MNQ' ? "bg-[var(--blue)] border-[var(--blue)] text-black font-bold" : "border-[var(--b2)]")}>MNQ</button>
           </div>
        </div>
        <div className="flex flex-col gap-2">
           <label className="text-[var(--txt2)] uppercase tracking-widest font-bold">Midnight Open Price</label>
           <input type="text" placeholder="Auto-detect or manual" value={midnightOpen} onChange={e => setMidnightOpen(e.target.value)} className="bg-[var(--bg)] border border-[var(--b2)] text-[var(--txt)] p-2" />
        </div>
        <div className="flex flex-col gap-2">
           <label className="text-[var(--txt2)] uppercase tracking-widest font-bold">Contracts</label>
           <input type="number" min="1" value={contracts} onChange={e => setContracts(parseInt(e.target.value)||1)} className="bg-[var(--bg)] border border-[var(--b2)] text-[var(--txt)] p-2" />
        </div>
        <div className="col-span-1 lg:col-span-2">
           <p className="text-[10px] text-[var(--txt3)] flex items-start gap-2 bg-[var(--orange)]/10 border border-[var(--orange)]/20 p-2 text-[var(--orange)]">
             <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />
             Historical replay uses the Trading Date you enter here, not today's upload timestamp. Modifying rules/plans here updates RAG learning for future live analysis.
           </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="command-tile">
          <span>Morning Review</span>
          <strong>15M ETH + 5M Execution</strong>
        </div>
        <div className="command-tile">
          <span>Lunch Review</span>
          <strong>{formatReplayRange('lunch_5m_execution', lunchReviewTimezone)}</strong>
        </div>
        <div className="command-tile">
          <span>Learning Mode</span>
          <strong>Save Outcomes to RAG</strong>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
         {/* MORNING PANEL */}
         <div className="flex-1 flex flex-col gap-4 p-4 bg-[var(--b0)] border border-[var(--b2)] morning-panel">
            <div className="flex justify-between items-center border-b border-[var(--b2)] pb-2">
              <h2 className="text-[14px] font-mono font-bold text-[var(--txt)]">MORNING REVIEW</h2>
              <TimezoneToggle 
                selectedTimezone={morningReviewTimezone} 
                onChange={setMorningReviewTimezone} 
              />
            </div>
            
            {!morningResult && (
              <>
                <UploadBox target="morning_eth_context" label="15m ETH Context" img={morningEthImg} onUpload={handleFileUpload} onClear={() => setMorningEthImg(null)} hintText={`Paste or upload 15M chart: ${formatReplayRange('morning_eth_context', morningReviewTimezone)}`} />
                <UploadBox target="morning_5m_execution" label="5m Morning Execution" img={morningExecImg} onUpload={handleFileUpload} onClear={() => setMorningExecImg(null)} isRequired hintText={`Paste or upload 5M chart: ${formatReplayRange('morning_5m_execution', morningReviewTimezone)}`} />
                
                {morningError && <div className="text-[var(--red)] text-[10px] bg-[var(--red)]/10 p-2">{morningError}</div>}
                {morningSaveStatus && <div className="text-[var(--green)] text-[10px] bg-[var(--green)]/10 p-2 border border-[var(--green)]/20">{morningSaveStatus}</div>}
                
                <button 
                  onClick={runMorningAnalysis} 
                  disabled={isAnalyzingMorning}
                  className="qd-btn-primary mt-2 flex justify-center py-3"
                >
                  {isAnalyzingMorning ? "Running Historical Replay..." : "Run Morning Review Analysis"}
                </button>
              </>
            )}

            {morningResult && (
               <div className="flex flex-col gap-4 font-mono">
                 <div className="bg-[var(--bg)] p-4 border border-[var(--b2)] rounded shadow-sm text-[12px]">
                   <h3 className="text-[10px] text-[var(--txt2)] font-bold mb-2">Morning Bias: <span className={morningResult.dayType?.includes('LONG') ? 'text-[var(--green)]' : 'text-[var(--red)]'}>{morningResult.dayType}</span></h3>
                   <div className="text-[11px] leading-relaxed mb-4">{morningResult.reasoning}</div>
                   
                   {normalizedMorningPlan && (
                     <div className="mt-4">
                       <FinalTradePlanCard plan={normalizedMorningPlan} agentLearningUsed={morningResult.agent_learning_used} />
                     </div>
                   )}
                 </div>

                 {!morningOutcome && !proofFlow.active && (
                   <div className="flex flex-col gap-2 mt-4">
                     <h3 className="text-[10px] text-[var(--txt2)] font-bold">Mark Historical Outcome</h3>
                     {morningError && (
                       <div className="text-[10px] p-2 bg-[var(--red)]/10 text-[var(--red)] border border-[var(--red)]/20">
                         {morningError}
                       </div>
                     )}
                     <div className="flex flex-wrap gap-2">
                        <button type="button" disabled={savingOutcome?.sessionType === 'morning'} onClick={() => saveTradeOutcome('morning', 'win')} className="qd-btn-secondary bg-[var(--green)]/20 text-[var(--green)] disabled:opacity-50">Win</button>
                        <button type="button" disabled={savingOutcome?.sessionType === 'morning'} onClick={() => saveTradeOutcome('morning', 'loss')} className="qd-btn-secondary bg-[var(--red)]/20 text-[var(--red)] disabled:opacity-50">Loss</button>
                        <button type="button" disabled={savingOutcome?.sessionType === 'morning'} onClick={() => saveTradeOutcome('morning', 'scratch')} className="qd-btn-secondary disabled:opacity-50">Scratch</button>
                        <button type="button" disabled={savingOutcome?.sessionType === 'morning'} onClick={() => saveTradeOutcome('morning', 'no_trade')} className="qd-btn-secondary disabled:opacity-50">No Trade</button>
                        <button type="button" disabled={savingOutcome?.sessionType === 'morning'} onClick={() => saveTradeOutcome('morning', 'missed_trade')} className="qd-btn-secondary disabled:opacity-50">Missed Trade</button>
                     </div>
                   </div>
                 )}

                 {proofFlow.active && proofFlow.sessionType === 'morning' && (
                    <TradeProofPanel 
                      manualOutcome={proofFlow.outcome!} 
                      executionQuantity={contracts} 
                      modelConfig={session.aiSettings} 
                      dailyInstrument={instrument}
                      tradePlan={normalizedMorningPlan}
                      onSaveTrade={handleProofSave} 
                      onCancel={() => setProofFlow({ active: false })}
                    />
                 )}
                 {morningOutcome && !proofFlow.active && (
                    <div className="text-[10px] p-2 bg-[var(--green)]/10 text-[var(--green)] flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Outcome logged: {morningOutcome.toUpperCase()}
                    </div>
                 )}
                 {morningSaveStatus && (
                    <div className="text-[10px] p-2 bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20">
                      {morningSaveStatus}
                    </div>
                 )}
                 <button onClick={() => {setMorningResult(null); setMorningOutcome(null); setMorningSetupId(null); setMorningSaveStatus(null); setMorningError(null);}} className="text-[10px] self-start text-[var(--txt3)] mt-2">← Start Over</button>
               </div>
            )}
         </div>

         {/* LUNCH PANEL */}
         <div className="flex-1 flex flex-col gap-4 p-4 bg-[var(--b0)] border border-[var(--b2)] lunch-panel">
            <div className="flex justify-between items-center border-b border-[var(--b2)] pb-2 mb-2">
               <h2 className="text-[14px] font-mono font-bold text-[var(--txt)] text-right">LUNCH REVERSAL REVIEW</h2>
               <TimezoneToggle 
                 selectedTimezone={lunchReviewTimezone} 
                 onChange={setLunchReviewTimezone} 
               />
            </div>
            
            {!lunchResult && (
              <>
                <UploadBox target="lunch_5m_execution" label="5m Lunch Execution" img={lunchExecImg} onUpload={handleFileUpload} onClear={() => setLunchExecImg(null)} isRequired hintText={`Paste or upload 5M chart: ${formatReplayRange('lunch_5m_execution', lunchReviewTimezone)}`} />
                <div className="text-[9px] text-[var(--txt3)] mt-1 mb-2">Required range: {formatReplayRange('lunch_5m_execution', lunchReviewTimezone)}</div>
                <div className="text-[10px] text-[var(--txt2)] mt-2 border border-[var(--b2)] p-2">
                   Use the primary 5-minute execution chart for Lunch Reversal Review. This review should use Morning Review, ETH context, Midnight Open, and RAG history when available.
                </div>
                
                {morningResult && (
                   <div className="text-[10px] text-[var(--green)] bg-[var(--green)]/10 p-2 mt-2">
                     + Includes Morning Analysis Context constraints
                   </div>
                )}
                
                {lunchError && <div className="text-[var(--red)] text-[10px] bg-[var(--red)]/10 p-2">{lunchError}</div>}
                {lunchSaveStatus && <div className="text-[var(--green)] text-[10px] bg-[var(--green)]/10 p-2 border border-[var(--green)]/20">{lunchSaveStatus}</div>}
                
                <button 
                  onClick={runLunchAnalysis} 
                  disabled={isAnalyzingLunch}
                  className="qd-btn-primary mt-2 flex justify-center py-3"
                >
                  {isAnalyzingLunch ? "Running Historical Replay..." : "Run Lunch Review Analysis"}
                </button>
              </>
            )}

            {lunchResult && (
               <div className="flex flex-col gap-4 font-mono">
                 <div className="bg-[var(--bg)] p-4 border border-[var(--b2)] rounded shadow-sm text-[12px]">
                   <h3 className="text-[10px] text-[var(--txt2)] font-bold mb-2">Lunch Bias: <span className={lunchResult.dayType?.includes('LONG') ? 'text-[var(--green)]' : 'text-[var(--red)]'}>{lunchResult.dayType}</span></h3>
                   <div className="text-[11px] leading-relaxed mb-4">{lunchResult.reasoning}</div>
                   
                   {normalizedLunchPlan && (
                     <div className="mt-4">
                       <FinalTradePlanCard plan={normalizedLunchPlan} agentLearningUsed={lunchResult.agent_learning_used} />
                     </div>
                   )}
                 </div>

                 {!lunchOutcome && !proofFlow.active && (
                   <div className="flex flex-col gap-2 mt-4">
                     <h3 className="text-[10px] text-[var(--txt2)] font-bold">Mark Historical Outcome</h3>
                     {lunchError && (
                       <div className="text-[10px] p-2 bg-[var(--red)]/10 text-[var(--red)] border border-[var(--red)]/20">
                         {lunchError}
                       </div>
                     )}
                     <div className="flex flex-wrap gap-2">
                        <button type="button" disabled={savingOutcome?.sessionType === 'lunch'} onClick={() => saveTradeOutcome('lunch', 'win')} className="qd-btn-secondary bg-[var(--green)]/20 text-[var(--green)] disabled:opacity-50">Win</button>
                        <button type="button" disabled={savingOutcome?.sessionType === 'lunch'} onClick={() => saveTradeOutcome('lunch', 'loss')} className="qd-btn-secondary bg-[var(--red)]/20 text-[var(--red)] disabled:opacity-50">Loss</button>
                        <button type="button" disabled={savingOutcome?.sessionType === 'lunch'} onClick={() => saveTradeOutcome('lunch', 'scratch')} className="qd-btn-secondary disabled:opacity-50">Scratch</button>
                        <button type="button" disabled={savingOutcome?.sessionType === 'lunch'} onClick={() => saveTradeOutcome('lunch', 'no_trade')} className="qd-btn-secondary disabled:opacity-50">No Trade</button>
                        <button type="button" disabled={savingOutcome?.sessionType === 'lunch'} onClick={() => saveTradeOutcome('lunch', 'missed_trade')} className="qd-btn-secondary disabled:opacity-50">Missed Trade</button>
                     </div>
                   </div>
                 )}

                 {proofFlow.active && proofFlow.sessionType === 'lunch' && (
                    <TradeProofPanel 
                      manualOutcome={proofFlow.outcome!} 
                      executionQuantity={contracts} 
                      modelConfig={session.aiSettings} 
                      dailyInstrument={instrument}
                      tradePlan={normalizedLunchPlan}
                      onSaveTrade={handleProofSave} 
                      onCancel={() => setProofFlow({ active: false })}
                    />
                 )}
                 {lunchOutcome && !proofFlow.active && (
                    <div className="text-[10px] p-2 bg-[var(--green)]/10 text-[var(--green)] flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Outcome logged: {lunchOutcome.toUpperCase()}
                    </div>
                 )}
                 {lunchSaveStatus && (
                    <div className="text-[10px] p-2 bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20">
                      {lunchSaveStatus}
                    </div>
                 )}
                 <button onClick={() => {setLunchResult(null); setLunchOutcome(null); setLunchSetupId(null); setLunchSaveStatus(null); setLunchError(null);}} className="text-[10px] self-start text-[var(--txt3)] mt-2">← Start Over</button>
               </div>
            )}
         </div>
      </div>
    </div>
  );
}

function UploadBox({ target, label, img, onUpload, onClear, isRequired=false, hintText }: any) {
   const cls = target.replace(/_/, '-').replace(/_context/, '-slot');
   return (
     <div className={cn("p-4 border-2 border-[var(--b2)] relative flex flex-col justify-center items-center bg-[var(--bg)] min-h-[140px] group", cls, !img ? "border-dashed" : "border-solid border-[var(--orange)]")}>
        <div className="absolute top-2 left-2 text-[9px] font-mono bg-[var(--b2)] px-1 rounded uppercase flex items-center gap-1">
          {label} {isRequired && <span className="text-[var(--orange)]">*</span>}
        </div>
        
        {!img && (
          <div className="flex flex-col items-center mt-4 text-[var(--txt3)] gap-2">
             <Upload className="w-6 h-6" />
             <p className="text-[10px] text-center max-w-[200px]">
               {hintText || 'Click here to paste or upload'}
             </p>
             <label className="cursor-pointer text-[10px] bg-[var(--b1)] px-3 py-1 mt-2 text-[var(--txt)] border border-[var(--b2)] hover:bg-[var(--b2)]">
               Select File
               <input type="file" className="hidden" accept="image/*" onChange={e => onUpload(e, target)} />
             </label>
          </div>
        )}

        {img && (
          <div className="flex flex-col items-center mt-4">
             <img src={img.dataUrl} className="max-h-[80px] object-cover border border-[var(--b2)]" alt={label} />
             <button onClick={onClear} className="absolute top-2 right-2 text-[var(--txt3)] hover:text-[var(--red)]"><XCircle className="w-4 h-4" /></button>
             {img.ocrResult && (
                <div className="text-[9px] mt-2 text-[var(--green)] flex items-center gap-1"><Brain className="w-3 h-3"/> OCR complete {img.ocrResult.ticker && `[${img.ocrResult.ticker}]`}</div>
             )}
          </div>
        )}
     </div>
   );
}
