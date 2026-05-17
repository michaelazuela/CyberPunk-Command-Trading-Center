import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { SessionState, Trade, AnalysisResult, SetupCandidate } from '../types';
import { cn, getImageFromClipboard, formatReplayRange } from '../lib/utils';
import { analyzeChart, preCheckChartInfo } from '../lib/gemini';
import { uploadScreenshot } from '../lib/cloudStorage';
import { supabase } from '../lib/supabase';
import TradeProofPanel from './TradeProofPanel';
import { TimezoneToggle } from './TimezoneToggle';
import { buildAppTradePlan } from '../lib/planEngine';
import FinalTradePlanCard from './FinalTradePlanCard';
import { buildSaveReceipt, createPlanVersionId, createSetupSignature } from '../lib/planMetadata';
import ScreenshotUploadPanel, { type UploadedWorkflowImage } from './workflow/ScreenshotUploadPanel';
import TradeConfirmationPanel, { type WorkflowOutcomeOption } from './workflow/TradeConfirmationPanel';
import WorkflowResetButton from './workflow/WorkflowResetButton';
import { computeRiskSizing, formatDollars } from '../lib/riskSizing';
import {
  buildNinjaChartContext,
  getNinjaHistoricalBars,
  type NinjaBridgeBar,
} from '../lib/ninjaTraderBridge';

type ReplayPasteTarget = 'morning_eth_context' | 'morning_5m_execution' | 'lunch_5m_execution' | null;
type ReplayOutcome = 'win' | 'loss' | 'scratch' | 'no_trade' | 'missed_trade';
type OutcomePlanChoice = 'main' | `candidate:${number}`;

const REPLAY_OUTCOMES: Array<WorkflowOutcomeOption<ReplayOutcome>> = [
  {
    value: 'win',
    label: 'Win',
    hint: 'Target reached',
    className: 'border-[var(--green)]/40 bg-[var(--green)]/10 text-[var(--green)] hover:bg-[var(--green)]/20'
  },
  {
    value: 'loss',
    label: 'Loss',
    hint: 'Stop hit',
    className: 'border-[var(--red)]/40 bg-[var(--red)]/10 text-[var(--red)] hover:bg-[var(--red)]/20'
  },
  {
    value: 'scratch',
    label: 'Scratch',
    hint: 'Break even',
    className: 'border-[var(--txt3)]/40 bg-[var(--b1)] text-[var(--txt)] hover:border-[var(--txt2)]'
  },
  {
    value: 'no_trade',
    label: 'No Trade',
    hint: 'No valid entry',
    className: 'border-[var(--yellow)]/40 bg-[var(--yellow)]/10 text-[var(--yellow)] hover:bg-[var(--yellow)]/20'
  },
  {
    value: 'missed_trade',
    label: 'Missed',
    hint: 'Setup skipped',
    className: 'border-[var(--orange)]/40 bg-[var(--orange)]/10 text-[var(--orange)] hover:bg-[var(--orange)]/20'
  },
];

type UploadedImage = UploadedWorkflowImage;

const HISTORICAL_DATA_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

function toBridgeInstrument(instrument: 'MES' | 'MNQ'): string {
  return instrument === 'MNQ' ? 'MNQ 06-26' : 'MES 06-26';
}

function replayOffset(timezone: 'EST' | 'PST'): string {
  return timezone === 'PST' ? '-07:00' : '-04:00';
}

function replayDateTime(tradeDate: string, time: string, timezone: 'EST' | 'PST'): string {
  return `${tradeDate}T${time}:00${replayOffset(timezone)}`;
}

function previousCalendarDate(tradeDate: string): string {
  const date = new Date(`${tradeDate}T12:00:00`);
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

function mergeHistoricalContextIntoAnalysis(
  analysis: AnalysisResult,
  historicalContext: Partial<AnalysisResult['structuredChartContext']> | null,
  summary: string
): AnalysisResult {
  if (!historicalContext) return analysis;
  const existing = analysis.structuredChartContext || {};
  const ohlcAuthoritySummary = `${summary} Historical OHLC fields from NinjaTrader are factual and take precedence over AI visual extraction.`;
  return {
    ...analysis,
    reasoning: `${analysis.reasoning || ''}\n\n[NINJATRADER HISTORICAL OHLC] ${ohlcAuthoritySummary}`.trim(),
    structuredChartContext: {
      ...existing,
      ...historicalContext,
      keyLevels: {
        ...(existing.keyLevels || {}),
        ...(historicalContext.keyLevels || {}),
      },
      extractedLevels: historicalContext.extractedLevels || existing.extractedLevels,
      candles: historicalContext.candles || existing.candles,
      swings: historicalContext.swings || existing.swings,
      fvgZones: historicalContext.fvgZones || existing.fvgZones,
      liquidityEvents: historicalContext.liquidityEvents || existing.liquidityEvents,
      liquiditySweeps: historicalContext.liquiditySweeps || existing.liquiditySweeps,
      reclaimEvents: historicalContext.reclaimEvents || existing.reclaimEvents,
      failedBreakEvents: historicalContext.failedBreakEvents || existing.failedBreakEvents,
      displacementCandles: historicalContext.displacementCandles || existing.displacementCandles,
      setupReadyFacts: historicalContext.setupReadyFacts || existing.setupReadyFacts,
      structuralLevels: historicalContext.structuralLevels || existing.structuralLevels,
      sessionLevelContext: historicalContext.sessionLevelContext || existing.sessionLevelContext,
      sessionStory: historicalContext.sessionStory || existing.sessionStory,
      targetObjectives: historicalContext.targetObjectives || existing.targetObjectives,
      marketStructure: historicalContext.marketStructure || existing.marketStructure,
      candleFacts: historicalContext.candleFacts || existing.candleFacts,
      marketContext: historicalContext.marketContext || existing.marketContext,
      ocrText: historicalContext.ocrText || existing.ocrText,
      extractionWarnings: historicalContext.extractionWarnings || existing.extractionWarnings,
    },
  };
}

function outcomeToRag(outcome: ReplayOutcome): string {
  if (outcome === 'win') return 'win';
  if (outcome === 'loss') return 'loss';
  if (outcome === 'scratch') return 'scratch';
  if (outcome === 'no_trade') return 'no_trade';
  return 'missed_trade';
}

function isTradeTakenOutcome(outcome: ReplayOutcome): boolean {
  return outcome === 'win' || outcome === 'loss' || outcome === 'scratch';
}

function formatCandidateName(candidate: SetupCandidate): string {
  if (candidate.scenarioLabel) return candidate.scenarioLabel;
  return String(candidate.setupType || 'Setup').replace(/([a-z])([A-Z])/g, '$1 $2');
}

function candidateHasPlanLevels(candidate: SetupCandidate): boolean {
  return candidate.direction !== 'NO TRADE' &&
    candidate.entry != null &&
    candidate.stop != null &&
    candidate.target1 != null &&
    candidate.target2 != null;
}

function buildPlanFromCandidate(basePlan: ReturnType<typeof buildAppTradePlan> | null, candidate: SetupCandidate | null, labelSuffix = '') {
  if (!basePlan || !candidate || !candidateHasPlanLevels(candidate)) return basePlan;
  return {
    ...basePlan,
    decision: candidate.direction,
    entry: candidate.entry ?? null,
    stop: candidate.stop ?? null,
    t1: candidate.target1 ?? null,
    t2: candidate.target2 ?? null,
    riskPoints: candidate.riskPoints ?? (candidate.entry != null && candidate.stop != null ? Math.abs(candidate.entry - candidate.stop) : null),
    riskRewardT1: '1.5R' as const,
    riskRewardT2: '2.0R' as const,
    canExecute: basePlan.canExecute && candidate.executionStatus === 'Executable',
    setupName: formatCandidateName(candidate),
    source: 'app_rule_engine' as const,
    whyThisPlan: `${candidate.nextAction || candidate.evidence?.[0] || basePlan.whyThisPlan}${labelSuffix}`,
    invalidation: candidate.invalidation || basePlan.invalidation,
    triggerState: candidate.executionStatus === 'Executable' ? 'TRIGGERED' as const : 'PENDING_TRIGGER' as const,
    entryTrigger: candidate.requiredTrigger || basePlan.entryTrigger || null,
  };
}

function OutcomePlanSelector({
  plan,
  value,
  onChange,
  getOptions,
  accountEquity,
  riskPercent,
  contracts,
  instrument,
}: {
  plan: ReturnType<typeof buildAppTradePlan> | null;
  value: OutcomePlanChoice;
  onChange: (value: OutcomePlanChoice) => void;
  accountEquity: number;
  riskPercent: number;
  contracts: number;
  instrument: 'MES' | 'MNQ';
  getOptions: (plan: ReturnType<typeof buildAppTradePlan> | null) => Array<{
    key: OutcomePlanChoice;
    label: string;
    candidate: SetupCandidate | null;
    plan: ReturnType<typeof buildAppTradePlan> | null;
  }>;
}) {
  if (!plan) return null;
  const options = getOptions(plan);
  const selected = options.find(option => option.key === value) || options[0];

  return (
    <div className="mt-4 border border-[var(--b2)] bg-[var(--bg)] p-3 font-mono">
      <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--txt)]">Trade Taken</h3>
          <p className="mt-1 text-[9px] text-[var(--txt3)]">
            Select the exact replay plan you actually traded before marking Win/Loss/Scratch. RAG will learn from this plan, not just the main card.
          </p>
        </div>
        <span className="qd-badge border-[var(--orange)]/30 text-[var(--orange)]">Outcome Plan</span>
      </div>

      <div className="grid gap-2">
        {options.map(option => {
          const optionPlan = option.plan;
          const isSelected = option.key === selected.key;
          const sizing = computeRiskSizing({
            accountEquity,
            riskPercent,
            contracts,
            instrument,
            riskPoints: optionPlan?.riskPoints,
          });
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onChange(option.key)}
              className={cn(
                'border px-3 py-2 text-left transition-colors',
                isSelected ? 'border-[var(--orange)] bg-[var(--orange)]/10' : 'border-[var(--b2)] bg-[var(--s1)] hover:border-[var(--orange)]/40'
              )}
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--txt)]">{option.label}</div>
                  <div className="mt-1 text-[9px] text-[var(--txt3)]">
                    {option.candidate ? 'Setup-scan / conditional replay candidate selected by user.' : 'Primary normalized app plan.'}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1 text-right text-[9px] md:min-w-[320px]">
                  <span className="border border-[var(--b1)] px-2 py-1 text-[var(--txt2)]">E {optionPlan?.entry ?? 'N/A'}</span>
                  <span className="border border-[var(--b1)] px-2 py-1 text-[var(--red)]">S {optionPlan?.stop ?? 'N/A'}</span>
                  <span className="border border-[var(--b1)] px-2 py-1 text-[var(--green)]">T1 {optionPlan?.t1 ?? 'N/A'}</span>
                  <span className="border border-[var(--b1)] px-2 py-1 text-[var(--green)]">T2 {optionPlan?.t2 ?? 'N/A'}</span>
                </div>
              </div>
              <div className="mt-2 grid gap-1 text-[9px] text-[var(--txt3)] md:grid-cols-4">
                <span>Budget {formatDollars(sizing.riskBudgetDollars)}</span>
                <span>Plan risk {formatDollars(sizing.riskPerContractDollars)}</span>
                <span>{contracts} contract(s) {formatDollars(sizing.totalRiskDollars)}</span>
                <span className={sizing.withinBudget === false ? 'text-[var(--red)]' : 'text-[var(--green)]'}>
                  {sizing.withinBudget === null ? 'Risk TBD' : sizing.withinBudget ? `Within budget · Max ${sizing.maxContractsByBudget}` : `Over budget · Max ${sizing.maxContractsByBudget}`}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ReplayLab({
  session,
  onAddTrade,
  onUpdate,
  isActive
}: {
  session: SessionState;
  onAddTrade?: (trade: Omit<Trade, 'id' | 'timestamp'>) => void;
  onUpdate?: (updates: Partial<SessionState>) => void;
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
  const [morningOutcomePlanChoice, setMorningOutcomePlanChoice] = useState<OutcomePlanChoice>('main');
  const [lunchOutcomePlanChoice, setLunchOutcomePlanChoice] = useState<OutcomePlanChoice>('main');
  const [morningTradeTaken, setMorningTradeTaken] = useState<boolean | null>(null);
  const [lunchTradeTaken, setLunchTradeTaken] = useState<boolean | null>(null);
  const [historicalMorning5mBars, setHistoricalMorning5mBars] = useState<NinjaBridgeBar[]>([]);
  const [historicalMorning15mBars, setHistoricalMorning15mBars] = useState<NinjaBridgeBar[]>([]);
  const [historicalMorning60mBars, setHistoricalMorning60mBars] = useState<NinjaBridgeBar[]>([]);
  const [historicalMorning240mBars, setHistoricalMorning240mBars] = useState<NinjaBridgeBar[]>([]);
  const [historicalLunch5mBars, setHistoricalLunch5mBars] = useState<NinjaBridgeBar[]>([]);
  const [historicalLunch60mBars, setHistoricalLunch60mBars] = useState<NinjaBridgeBar[]>([]);
  const [historicalLunch240mBars, setHistoricalLunch240mBars] = useState<NinjaBridgeBar[]>([]);
  const [historicalFetchStatus, setHistoricalFetchStatus] = useState<string | null>(null);
  const [historicalFetchError, setHistoricalFetchError] = useState<string | null>(null);
  const [isFetchingHistorical, setIsFetchingHistorical] = useState(false);

  const normalizedMorningPlan = morningResult ? buildAppTradePlan(morningResult, { sessionType: 'replay_morning', instrument }) : null;
  const normalizedLunchPlan = lunchResult ? buildAppTradePlan(lunchResult, { sessionType: 'replay_lunch', instrument }) : null;

  const getOutcomePlanOptions = (plan: typeof normalizedMorningPlan) => {
    const candidates = (plan?.setupCandidates || [])
      .filter(candidateHasPlanLevels)
      .slice(0, 8);
    return [
      { key: 'main' as OutcomePlanChoice, label: 'Main App Plan', candidate: null, plan },
      ...candidates.map((candidate, index) => ({
        key: `candidate:${index}` as OutcomePlanChoice,
        label: `${formatCandidateName(candidate)} ${candidate.direction}`,
        candidate,
        plan: buildPlanFromCandidate(plan, candidate, ' User selected this replay candidate for outcome/RAG learning.'),
      })),
    ];
  };

  const getSelectedOutcomePlan = (sessionType: 'morning' | 'lunch') => {
    const basePlan = sessionType === 'morning' ? normalizedMorningPlan : normalizedLunchPlan;
    const choice = sessionType === 'morning' ? morningOutcomePlanChoice : lunchOutcomePlanChoice;
    const options = getOutcomePlanOptions(basePlan);
    return options.find(option => option.key === choice) || options[0];
  };

  useEffect(() => {
    if (!morningResult && session.replayMorningResult) {
      setMorningResult(session.replayMorningResult);
    }
    if (!lunchResult && session.replayLunchResult) {
      setLunchResult(session.replayLunchResult);
    }
  }, [lunchResult, morningResult, session.replayLunchResult, session.replayMorningResult]);

  const replayReadinessItems = [
    { label: 'Trading Date', value: tradeDate || 'REQUIRED', ready: Boolean(tradeDate) },
    { label: 'Instrument', value: instrument, ready: true },
    { label: 'Midnight Open', value: midnightOpen ? 'SET' : 'OPTIONAL', ready: Boolean(midnightOpen) },
    { label: 'Morning ETH', value: morningEthImg ? 'ATTACHED' : 'OPTIONAL', ready: Boolean(morningEthImg) },
    { label: 'Morning 5M', value: morningExecImg ? 'READY' : 'REQUIRED', ready: Boolean(morningExecImg || morningResult) },
    { label: 'Lunch 5M', value: lunchExecImg ? 'READY' : 'OPTIONAL', ready: Boolean(lunchExecImg || lunchResult) },
    { label: 'Plan Engine', value: 'APP-OWNED', ready: true },
    { label: 'RAG Save', value: morningSaveStatus || lunchSaveStatus ? 'ACTIVE' : 'ON OUTCOME', ready: true },
  ];

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
    setMorningOutcomePlanChoice('main');
    setMorningTradeTaken(null);
    setHistoricalMorning5mBars([]);
    setHistoricalMorning15mBars([]);
    setLunchExecImg(null);
    setIsAnalyzingLunch(false);
    setLunchResult(null);
    setLunchSetupId(null);
    setLunchError(null);
    setLunchSaveStatus(null);
    setLunchOutcome(null);
    setLunchOutcomePlanChoice('main');
    setLunchTradeTaken(null);
    setHistoricalLunch5mBars([]);
    setHistoricalFetchStatus(null);
    setHistoricalFetchError(null);
    setIsFetchingHistorical(false);
    setProofFlow({ active: false });
    setSavingOutcome(null);
    onUpdate?.({ replayMorningResult: undefined, replayLunchResult: undefined });
  };

  const confirmReplayDuplicate = async (userId: string, sessionType: 'morning' | 'lunch', setupSignature?: string | null) => {
    try {
      const { data: existingSetups } = await supabase
        .from('setups')
        .select('id, created_at, outcome, replay_status')
        .eq('user_id', userId)
        .eq('trade_date', tradeDate)
        .eq('instrument', instrument)
        .eq('session_type', sessionType)
        .limit(3);

      let query = supabase
        .from('trade_embeddings')
        .select('id, trade_date, session_type, instrument, trade_result, setup_signature')
        .eq('user_id', userId)
        .eq('trade_date', tradeDate)
        .eq('instrument', instrument)
        .eq('session_type', sessionType)
        .limit(3);

      if (setupSignature) query = query.eq('setup_signature', setupSignature);

      const { data, error } = await query;
      const hasRagDuplicate = !error && data && data.length > 0;
      const hasSetupDuplicate = existingSetups && existingSetups.length > 0;
      if (!hasRagDuplicate && !hasSetupDuplicate) return true;

      return window.confirm(
        `This looks like an existing ${sessionType} replay record for ${instrument} on ${tradeDate}. Save duplicate anyway?`
      );
    } catch {
      return true;
    }
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
    const hasHistoricalMorning = historicalMorning5mBars.length > 0;
    if (!tradeDate || !instrument || (!morningExecImg && !hasHistoricalMorning)) {
      setMorningError("Required: Trade Date, Instrument, and either 5m Morning Execution screenshot or NinjaTrader historical 5M bars.");
      return;
    }
    setMorningError(null);
    setMorningSaveStatus(null);
    setIsAnalyzingMorning(true);
    setMorningResult(null);

    try {
      const execImage = morningExecImg?.dataUrl || HISTORICAL_DATA_IMAGE;
      const ethImage = morningEthImg?.dataUrl || (historicalMorning15mBars.length ? HISTORICAL_DATA_IMAGE : undefined);
      const imgPayload = ethImage ? { exec: execImage, eth: ethImage } : execImage;
      const historicalSummary = hasHistoricalMorning
        ? `Replay imported from NinjaTrader: ${historicalMorning5mBars.length} x 5M bars and ${historicalMorning15mBars.length} x 15M bars for ${tradeDate}.`
        : '';
      const historicalContextInput = hasHistoricalMorning ? {
        ninjaTraderHistoricalReplay: true,
        source: 'ninjatrader_historical_request',
        tradeDate,
        instrument,
        bars5m: historicalMorning5mBars,
        bars15m: historicalMorning15mBars,
        instruction: 'Use these OHLC bars as factual replay context. Do not use future bars beyond the requested replay window.'
      } : undefined;
      const analysisRaw = await analyzeChart(imgPayload, session.aiSettings, session.accountEquity, historicalContextInput, [], 'morning_replay', undefined, midnightOpen || undefined, instrument, session.riskPercent);
      const historicalContext = hasHistoricalMorning ? buildNinjaChartContext({
        bars5m: historicalMorning5mBars,
        bars15m: historicalMorning15mBars,
        bars60m: historicalMorning60mBars,
        bars240m: historicalMorning240mBars,
        sessionType: 'replay_morning',
        instrument,
        tradeDate,
        midnightOpen: midnightOpen ? Number(midnightOpen) : null,
      }) : null;
      const analysis = mergeHistoricalContextIntoAnalysis(analysisRaw as AnalysisResult, historicalContext, historicalSummary);
      const analysisPlan = buildAppTradePlan(analysis, { sessionType: 'replay_morning', instrument });
      const planVersionId = createPlanVersionId('replay_morning', tradeDate);
      const setupSignature = createSetupSignature({ sessionType: 'replay_morning', instrument, tradeDate, plan: analysisPlan });
      const analysisRiskSizing = computeRiskSizing({
        accountEquity: session.accountEquity,
        riskPercent: session.riskPercent,
        riskPoints: analysisPlan.riskPoints,
        contracts,
        instrument,
      });
      analysis.planVersionId = planVersionId;
      analysis.setupSignature = setupSignature;
      
      setMorningResult(analysis);
      onUpdate?.({ replayMorningResult: analysis });
      
      // Save Setup to Supabase
      const { data: { user } } = await supabase.auth.getUser();
         if (!user) {
        setMorningError("Login required: Replay setup was analyzed, but it was not saved to Supabase.");
      } else {
         const duplicateOk = await confirmReplayDuplicate(user.id, 'morning', setupSignature);
         if (!duplicateOk) {
           setMorningSaveStatus('Duplicate replay save canceled by user.');
           return;
         }
         let ethStoragePath, execStoragePath;
         if (morningEthImg || historicalMorning15mBars.length) {
           const ethUpload = await uploadScreenshot(user.id, tradeDate, 'replay_lab/morning', '15m_eth_context', morningEthImg?.dataUrl || HISTORICAL_DATA_IMAGE);
           ethStoragePath = ethUpload.storagePath;
           if (morningEthImg) setMorningEthImg({ ...morningEthImg, storagePath: ethStoragePath });
         }
         const execUpload = await uploadScreenshot(user.id, tradeDate, 'replay_lab/morning', '5m_execution', execImage);
         execStoragePath = execUpload.storagePath;
         if (morningExecImg) setMorningExecImg({ ...morningExecImg, storagePath: execStoragePath });
         
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
             plan_version_id: planVersionId,
             setup_signature: setupSignature,
             risk_sizing: analysisRiskSizing,
             legacy_trade_plan: analysis.tradePlan || null,
             ninja_historical_context: {
               morning_5m_bars: historicalMorning5mBars.length,
               morning_15m_bars: historicalMorning15mBars.length,
             },
             morning_context: {
               morning_5m_available: Boolean(morningExecImg || historicalMorning5mBars.length),
               morning_15m_eth_available: Boolean(morningEthImg || historicalMorning15mBars.length),
               ninja_historical_5m_bars: historicalMorning5mBars.length,
               ninja_historical_15m_bars: historicalMorning15mBars.length,
               morning_analysis_available: Boolean(morningResult),
               morning_day_type: morningResult?.dayType || null,
               morning_eth_context_review: morningResult?.ethContextReview || null,
               morning_structured_chart_context: morningResult?.structuredChartContext || null,
             },
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
        setMorningSaveStatus(`Replay setup saved. Plan ${planVersionId} · Setup ID: ${docData.id}`);
      }
    } catch (err: any) {
      setMorningError(err.message || 'Morning analysis failed');
    } finally {
      setIsAnalyzingMorning(false);
    }
  };

  const runLunchAnalysis = async () => {
    const hasHistoricalLunch = historicalLunch5mBars.length > 0;
    if (!tradeDate || !instrument || (!lunchExecImg && !hasHistoricalLunch)) {
      setLunchError("Required: Trade Date, Instrument, and either 5m Lunch Execution screenshot or NinjaTrader historical 5M bars.");
      return;
    }
    setLunchError(null);
    setLunchSaveStatus(null);
    setIsAnalyzingLunch(true);
    setLunchResult(null);

    try {
      const execImage = lunchExecImg?.dataUrl || HISTORICAL_DATA_IMAGE;
      const morningEthImage = morningEthImg?.dataUrl || (historicalMorning15mBars.length ? HISTORICAL_DATA_IMAGE : undefined);
      const morningExecImage = morningExecImg?.dataUrl || (historicalMorning5mBars.length ? HISTORICAL_DATA_IMAGE : undefined);
      const imgPayload = (morningEthImage || morningExecImage)
        ? { exec: execImage, eth: morningEthImage, morningExec: morningExecImage }
        : execImage;
      const previousAnalysis = morningResult ? {
        tradePlan: morningResult.tradePlan,
        normalizedPlan: normalizedMorningPlan,
        midnightOpenPrice: morningResult.midnightOpenPrice,
        ethContextReview: morningResult.ethContextReview,
        structuredChartContext: morningResult.structuredChartContext,
        morningContextImagesAvailable: {
          eth15m: Boolean(morningEthImg),
          execution5m: Boolean(morningExecImg),
        },
        reasoning: morningResult.reasoning
      } : hasHistoricalLunch ? {
        ninjaTraderHistoricalReplay: true,
        source: 'ninjatrader_historical_request',
        tradeDate,
        instrument,
        bars5m: historicalLunch5mBars,
        morningBars5m: historicalMorning5mBars,
        morningBars15m: historicalMorning15mBars,
        instruction: 'Use these OHLC bars as factual lunch replay context. Do not use future bars beyond the requested replay window.'
      } : undefined;
      
      const analysisRaw = await analyzeChart(imgPayload, session.aiSettings, session.accountEquity, previousAnalysis, [], 'lunch_replay', undefined, midnightOpen || morningResult?.midnightOpenPrice?.toString() || undefined, instrument, session.riskPercent);
      const historicalSummary = hasHistoricalLunch
        ? `Replay imported from NinjaTrader: ${historicalLunch5mBars.length} x Lunch 5M bars for ${tradeDate}. Morning historical context bars: ${historicalMorning5mBars.length} x 5M, ${historicalMorning15mBars.length} x 15M.`
        : '';
      const historicalContext = hasHistoricalLunch ? buildNinjaChartContext({
        bars5m: historicalLunch5mBars,
        bars15m: historicalMorning15mBars,
        bars60m: historicalLunch60mBars.length ? historicalLunch60mBars : historicalMorning60mBars,
        bars240m: historicalLunch240mBars.length ? historicalLunch240mBars : historicalMorning240mBars,
        sessionType: 'replay_lunch',
        instrument,
        tradeDate,
        midnightOpen: midnightOpen ? Number(midnightOpen) : morningResult?.midnightOpenPrice ?? null,
      }) : null;
      const analysis = mergeHistoricalContextIntoAnalysis(analysisRaw as AnalysisResult, historicalContext, historicalSummary);
      const analysisPlan = buildAppTradePlan(analysis, { sessionType: 'replay_lunch', instrument });
      const planVersionId = createPlanVersionId('replay_lunch', tradeDate);
      const setupSignature = createSetupSignature({ sessionType: 'replay_lunch', instrument, tradeDate, plan: analysisPlan });
      const analysisRiskSizing = computeRiskSizing({
        accountEquity: session.accountEquity,
        riskPercent: session.riskPercent,
        riskPoints: analysisPlan.riskPoints,
        contracts,
        instrument,
      });
      analysis.planVersionId = planVersionId;
      analysis.setupSignature = setupSignature;
      
      setLunchResult(analysis);
      onUpdate?.({ replayLunchResult: analysis });
      
      // Save Setup to Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLunchError("Login required: Replay setup was analyzed, but it was not saved to Supabase.");
      } else {
         const duplicateOk = await confirmReplayDuplicate(user.id, 'lunch', setupSignature);
         if (!duplicateOk) {
           setLunchSaveStatus('Duplicate replay save canceled by user.');
           return;
         }
         const execUpload = await uploadScreenshot(user.id, tradeDate, 'replay_lab/lunch', '5m_execution', execImage);
         const execStoragePath = execUpload.storagePath;
         if (lunchExecImg) setLunchExecImg({ ...lunchExecImg, storagePath: execStoragePath });
         
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
             plan_version_id: planVersionId,
             setup_signature: setupSignature,
             risk_sizing: analysisRiskSizing,
             legacy_trade_plan: analysis.tradePlan || null,
             ninja_historical_context: {
               lunch_5m_bars: historicalLunch5mBars.length,
               morning_5m_bars: historicalMorning5mBars.length,
               morning_15m_bars: historicalMorning15mBars.length,
             },
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
           eth_context_available: Boolean(morningEthImg || morningResult?.ethContextReview),
           eth_context_review_json: morningResult?.ethContextReview || null,
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
        setLunchSaveStatus(`Replay setup saved. Plan ${planVersionId} · Setup ID: ${docData.id}`);
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
    normalizedPlan: ReturnType<typeof buildAppTradePlan> | null
  ) => {
    const currentSetupId = sessionType === 'morning' ? morningSetupId : lunchSetupId;
    if (currentSetupId) return currentSetupId;

    const setSessionSetupId = sessionType === 'morning' ? setMorningSetupId : setLunchSetupId;
    const execImg = sessionType === 'morning' ? morningExecImg : lunchExecImg;
    const chartTimezone = sessionType === 'morning' ? morningReviewTimezone : lunchReviewTimezone;
    const requiredScreenshotRange = formatReplayRange(sessionType === 'morning' ? 'morning_5m_execution' : 'lunch_5m_execution', chartTimezone);
    const setupRiskSizing = computeRiskSizing({
      accountEquity: session.accountEquity,
      riskPercent: session.riskPercent,
      riskPoints: normalizedPlan?.riskPoints,
      contracts,
      instrument,
    });
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
        plan_version_id: result.planVersionId || null,
        setup_signature: result.setupSignature || null,
        legacy_trade_plan: result.tradePlan || null,
        chart_timezone: chartTimezone,
        required_screenshot_range: requiredScreenshotRange,
        risk_sizing: setupRiskSizing,
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

  const fetchHistoricalReplayData = async (sessionType: 'morning' | 'lunch') => {
    if (!tradeDate) {
      setHistoricalFetchError('Enter a Trading Date before fetching NinjaTrader historical data.');
      return;
    }

    setHistoricalFetchError(null);
    setHistoricalFetchStatus(null);
    setIsFetchingHistorical(true);

    try {
      const bridgeInstrument = toBridgeInstrument(instrument);
      if (sessionType === 'morning') {
        const priorDate = previousCalendarDate(tradeDate);
        const [bars240m, bars60m, bars15m, bars5m] = await Promise.all([
          getNinjaHistoricalBars({
            instrument: bridgeInstrument,
            timeframe: '240m',
            from: replayDateTime(priorDate, '18:00', morningReviewTimezone),
            to: replayDateTime(tradeDate, '10:00', morningReviewTimezone),
          }),
          getNinjaHistoricalBars({
            instrument: bridgeInstrument,
            timeframe: '60m',
            from: replayDateTime(priorDate, '18:00', morningReviewTimezone),
            to: replayDateTime(tradeDate, '10:00', morningReviewTimezone),
          }),
          getNinjaHistoricalBars({
            instrument: bridgeInstrument,
            timeframe: '15m',
            from: replayDateTime(priorDate, '18:00', morningReviewTimezone),
            to: replayDateTime(tradeDate, '10:00', morningReviewTimezone),
          }),
          getNinjaHistoricalBars({
            instrument: bridgeInstrument,
            timeframe: '5m',
            from: replayDateTime(tradeDate, '09:30', morningReviewTimezone),
            to: replayDateTime(tradeDate, '10:10', morningReviewTimezone),
          }),
        ]);

        if (!bars5m.ok || !bars5m.bars?.length) {
          throw new Error(bars5m.error || 'No Morning 5M historical bars returned from NinjaTrader.');
        }

        setHistoricalMorning240mBars(bars240m.bars || []);
        setHistoricalMorning60mBars(bars60m.bars || []);
        setHistoricalMorning15mBars(bars15m.bars || []);
        setHistoricalMorning5mBars(bars5m.bars || []);
        if (!morningExecImg) setMorningExecImg({ dataUrl: HISTORICAL_DATA_IMAGE });
        if (!morningEthImg && bars15m.bars?.length) setMorningEthImg({ dataUrl: HISTORICAL_DATA_IMAGE });
        setHistoricalFetchStatus(`Imported Morning historical OHLC from NinjaTrader: ${bars5m.bars.length} x 5M execution bars, ${(bars15m.bars || []).length} x 15M, ${(bars60m.bars || []).length} x 1H, ${(bars240m.bars || []).length} x 4H context bars.`);
      } else {
        const priorDate = previousCalendarDate(tradeDate);
        const [bars240m, bars60m, bars15m, bars5m] = await Promise.all([
          getNinjaHistoricalBars({
            instrument: bridgeInstrument,
            timeframe: '240m',
            from: replayDateTime(priorDate, '18:00', lunchReviewTimezone),
            to: replayDateTime(tradeDate, '13:00', lunchReviewTimezone),
          }),
          getNinjaHistoricalBars({
            instrument: bridgeInstrument,
            timeframe: '60m',
            from: replayDateTime(priorDate, '18:00', lunchReviewTimezone),
            to: replayDateTime(tradeDate, '13:00', lunchReviewTimezone),
          }),
          getNinjaHistoricalBars({
            instrument: bridgeInstrument,
            timeframe: '15m',
            from: replayDateTime(priorDate, '18:00', lunchReviewTimezone),
            to: replayDateTime(tradeDate, '13:00', lunchReviewTimezone),
          }),
          getNinjaHistoricalBars({
            instrument: bridgeInstrument,
            timeframe: '5m',
            from: replayDateTime(tradeDate, '11:50', lunchReviewTimezone),
            to: replayDateTime(tradeDate, '13:00', lunchReviewTimezone),
          }),
        ]);

        if (!bars5m.ok || !bars5m.bars?.length) {
          throw new Error(bars5m.error || 'No Lunch 5M historical bars returned from NinjaTrader.');
        }

        setHistoricalLunch5mBars(bars5m.bars || []);
        setHistoricalLunch240mBars(bars240m.bars || []);
        setHistoricalLunch60mBars(bars60m.bars || []);
        if (!historicalMorning240mBars.length && bars240m.bars?.length) setHistoricalMorning240mBars(bars240m.bars || []);
        if (!historicalMorning60mBars.length && bars60m.bars?.length) setHistoricalMorning60mBars(bars60m.bars || []);
        if (!historicalMorning15mBars.length && bars15m.bars?.length) setHistoricalMorning15mBars(bars15m.bars || []);
        if (!lunchExecImg) setLunchExecImg({ dataUrl: HISTORICAL_DATA_IMAGE });
        setHistoricalFetchStatus(`Imported Lunch historical OHLC from NinjaTrader: ${bars5m.bars.length} x 5M lunch bars, ${(bars15m.bars || []).length} x 15M, ${(bars60m.bars || []).length} x 1H, ${(bars240m.bars || []).length} x 4H context bars through 1:00 PM.`);
      }
    } catch (error) {
      setHistoricalFetchError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsFetchingHistorical(false);
    }
  };

  const saveTradeOutcome = async (sessionType: 'morning' | 'lunch', outcome: ReplayOutcome) => {
    const result = sessionType === 'morning' ? morningResult : lunchResult;
    const setSessionError = sessionType === 'morning' ? setMorningError : setLunchError;
    const setSessionStatus = sessionType === 'morning' ? setMorningSaveStatus : setLunchSaveStatus;
    const normalizedPlan = sessionType === 'morning' ? normalizedMorningPlan : normalizedLunchPlan;
    const selectedOutcomePlan = getSelectedOutcomePlan(sessionType);
    const actualPlan = selectedOutcomePlan.plan || normalizedPlan;
    const selectedCandidate = selectedOutcomePlan.candidate;
    const tradeTaken = sessionType === 'morning' ? morningTradeTaken : lunchTradeTaken;
    const requiresExecutablePlan = isTradeTakenOutcome(outcome);

    setSessionError(null);
    setSessionStatus(null);

    if (!result) {
      setSessionError("No replay analysis result found. Run the replay analysis before marking an outcome.");
      return;
    }

    if (tradeTaken === null) {
      setSessionError('Select Trade Taken: Yes or No before marking the outcome.');
      return;
    }

    if (tradeTaken !== requiresExecutablePlan) {
      setSessionError(tradeTaken
        ? 'Trade Taken is Yes, so choose Win, Loss, or Scratch.'
        : 'Trade Taken is No, so choose No Trade or Missed.');
      return;
    }

    if (requiresExecutablePlan && (!actualPlan || actualPlan.entry === null || actualPlan.stop === null || actualPlan.t1 === null || actualPlan.t2 === null)) {
      console.warn("[Replay Lab] Outcome not saved: trade-taken outcomes require a selected replay plan with ENTRY, STOP, T1, and T2.");
      setSessionError("Trade-taken outcomes require a selected plan with ENTRY, STOP, T1, and T2. Select a conditional plan or use No Trade / Missed.");
      return;
    }

    setSessionStatus(`Saving ${outcome.replace(/_/g, ' ').toUpperCase()} to Supabase + RAG...`);
    setSavingOutcome({ sessionType, outcome });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSessionError("Login required: outcome was not saved to Supabase or RAG.");
        setSessionStatus(null);
        return;
      }

      // Map to RAG Save schema
      const ragStatus = outcomeToRag(outcome);
      const manualOutcome = outcome === 'win' || outcome === 'scratch' ? 'SUCCESS' : 'FAILED';
      const tradeStatus = (outcome === 'no_trade' || outcome === 'missed_trade') ? 'MISSED' : outcome === 'scratch' ? 'CLOSED' : outcome === 'win' ? 'SUCCESSFUL' : 'FAILED';

      const resolvedSetupId = await ensureReplaySetupId(sessionType, user.id, result, normalizedPlan);
      const selectedRiskSizing = computeRiskSizing({
        accountEquity: session.accountEquity,
        riskPercent: session.riskPercent,
        riskPoints: actualPlan?.riskPoints,
        contracts,
        instrument,
      });

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

      const entryPrice = actualPlan?.entry ?? null;
      const stopPrice = actualPlan?.stop ?? null;
      const targetPrice = actualPlan?.t1 ?? null;

      const tradeData: Omit<Trade, 'id'> = {
        date: tradeDate,
        instrument: instrument,
        direction: actualPlan?.decision === 'LONG' || actualPlan?.decision === 'SHORT' ? actualPlan.decision : result.dayType?.includes('SHORT') ? 'SHORT' : 'LONG',
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
      const chartTimezone = sessionType === 'morning' ? morningReviewTimezone : lunchReviewTimezone;
      const requiredScreenshotRange = formatReplayRange(sessionType === 'morning' ? 'morning_5m_execution' : 'lunch_5m_execution', chartTimezone);
      const ragSaveResult = await saveToRAG({
         setupId: resolvedSetupId,
         analysis_mode: 'historical_replay',
         source: 'replay_lab',
         workflowMode: sessionType === 'morning' ? 'replay_morning' : 'replay_lunch',
         sessionMode: sessionType,
         ampm: sessionType === 'morning' ? 'AM' : 'PM',
         chartTimezone,
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
         outcome: outcome,
         proofSubmitted: false,
         tradeConfirmed: true,
         tradeTaken,
         ruleVersion: result.planVersionId || null,
         workflowTimestamp: new Date().toISOString(),
         screenshots: {
           execution5m: sessionType === 'morning' ? morningExecImg?.storagePath || morningExecImg?.dataUrl : lunchExecImg?.storagePath || lunchExecImg?.dataUrl,
           eth15mContext: morningEthImg?.storagePath || morningEthImg?.dataUrl || null,
           morning5mContext: sessionType === 'lunch' ? morningExecImg?.storagePath || morningExecImg?.dataUrl || null : null,
           proof: null,
         },
         chartContext: result.structuredChartContext || null,
         setupCandidates: (result as any).tradeDecision?.setupCandidates || result.candidate_trade_plans || [],
         selectedSetup: selectedCandidate || result.best_trade_plan || null,
         finalTradePlan: actualPlan || null,
         contracts,
         entryPrice: actualPlan?.entry,
         stopPrice: actualPlan?.stop,
         t1: actualPlan?.t1,
         t2: actualPlan?.t2,
         riskPoints: actualPlan?.riskPoints,
         accountEquity: session.accountEquity,
         riskPercent: session.riskPercent,
         riskBudgetDollars: selectedRiskSizing.riskBudgetDollars,
         riskRewardT1: actualPlan?.riskRewardT1,
         riskRewardT2: actualPlan?.riskRewardT2,
         planSource: selectedCandidate ? 'user_selected_replay_candidate' : actualPlan?.source,
         whyThisPlan: actualPlan?.whyThisPlan,
         invalidation: actualPlan?.invalidation,
         notes: `${notes ? notes + '\n' : ''}Trade Taken: ${tradeTaken ? 'yes' : 'no'}\nOutcome plan: ${selectedOutcomePlan.label}\nRisk sizing: ${selectedRiskSizing.summary}\n${selectedCandidate ? 'User selected a conditional/setup-scan replay candidate instead of the main plan.' : 'User selected the main replay app plan.'}\nReplay Plan (${actualPlan?.source || 'missing'})\nRisk: ${actualPlan?.riskPoints || 'N/A'}\nT1: ${actualPlan?.t1 || 'N/A'}\nT2: ${actualPlan?.t2 || 'N/A'}\nWhy: ${actualPlan?.whyThisPlan || 'N/A'}\nInvalidation: ${actualPlan?.invalidation || 'N/A'}`,
         ocrText: JSON.stringify({ ...(sessionType === 'morning' ? morningExecImg?.ocrResult : lunchExecImg?.ocrResult) }),
         execution_5m_storage_path: sessionType === 'morning' ? morningExecImg?.storagePath : lunchExecImg?.storagePath,
         eth_15m_context_storage_path: morningEthImg?.storagePath,
         execution_timeframe: '5m',
         context_timeframe: morningEthImg ? '15m' : undefined,
         context_session: morningEthImg ? 'ETH' : undefined,
         eth_context_available: Boolean(morningEthImg || result.ethContextReview),
         window_start: sessionType === 'lunch' ? "11:50" : undefined,
         window_end: sessionType === 'lunch' ? "13:00" : undefined,
         window_timezone: "America/New_York",
         required_screenshot_range: requiredScreenshotRange,
         planVersionId: result.planVersionId || null,
         setupSignature: result.setupSignature || null,
         trade_plan_json: {
           best_trade_plan: result.best_trade_plan || null,
           final_trade_plan: result.final_trade_plan || null,
           candidate_trade_plans: result.candidate_trade_plans || [],
           trade_management_plan: result.trade_management_plan || null,
           selected_outcome_plan_key: selectedOutcomePlan.key,
           selected_outcome_plan_label: selectedOutcomePlan.label,
           selected_outcome_candidate: selectedCandidate,
           selected_outcome_plan: actualPlan,
           selected_outcome_risk_sizing: selectedRiskSizing,
           account_equity: session.accountEquity,
           risk_percent: session.riskPercent,
           normalized_plan: normalizedPlan,
           plan_version_id: result.planVersionId || null,
           setup_signature: result.setupSignature || null,
           legacy_trade_plan: result.tradePlan || null,
           chart_timezone: chartTimezone,
           required_screenshot_range: requiredScreenshotRange,
           morning_context: sessionType === 'lunch' ? {
             morning_5m_available: Boolean(morningExecImg),
             morning_15m_eth_available: Boolean(morningEthImg),
             morning_analysis_available: Boolean(morningResult),
             morning_day_type: morningResult?.dayType || null,
             morning_eth_context_review: morningResult?.ethContextReview || null,
             morning_structured_chart_context: morningResult?.structuredChartContext || null,
           } : null,
         },
      });

      if (!ragSaveResult.success) {
        throw new Error(`RAG save failed: ${ragSaveResult.error || 'Unknown Supabase error.'}`);
      }

      const ragQuery = supabase
        .from('trade_embeddings')
        .select('id,setup_id,trade_result');

      const { data: ragRow, error: ragVerifyError } = ragSaveResult.id
        ? await ragQuery.eq('id', ragSaveResult.id).single()
        : await ragQuery.eq('setup_id', resolvedSetupId).maybeSingle();

      if (ragVerifyError || !ragRow?.id) {
        throw new Error(`RAG verification failed: ${ragVerifyError?.message || 'No trade_embeddings row found for setup ID.'}`);
      }

      if (ragRow.trade_result !== ragStatus) {
        throw new Error(`RAG verification mismatch: expected ${ragStatus}, received ${ragRow.trade_result || 'empty'}.`);
      }

      if (sessionType === 'morning') setMorningOutcome(outcome);
      else setLunchOutcome(outcome);
      const receipt = buildSaveReceipt({
        planVersionId: result.planVersionId || createPlanVersionId(sessionType === 'morning' ? 'replay_morning' : 'replay_lunch', tradeDate),
        setupId: resolvedSetupId,
        ragId: ragRow.id,
        screenshotPath: sessionType === 'morning' ? morningExecImg?.storagePath : lunchExecImg?.storagePath,
        outcome,
        embeddingStatus: ragSaveResult.usedFallback ? 'pending' : 'saved',
        note: ragSaveResult.usedFallback ? 'Core RAG fallback used because optional schema columns are not live yet.' : undefined,
      });
      setSessionStatus(`Saved to Supabase + RAG ✓ Plan ${receipt.planVersionId} · Setup ${resolvedSetupId.slice(0, 8)} · RAG ${ragRow.id.slice(0, 8)} · Result: ${outcome.toUpperCase()} · Outcome Plan: ${selectedOutcomePlan.label} · Embedding ${receipt.embeddingStatus}${receipt.note ? ` · ${receipt.note}` : ''}`);

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
        <WorkflowResetButton onClick={resetReplayLab}>
          Reset Replay
        </WorkflowResetButton>
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

      <div className="card-base p-4 mb-6">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--txt3)]">Replay Readiness</div>
            <div className="text-[12px] text-[var(--txt2)] mt-1">Build historical examples without changing live rules. Outcome buttons write the lesson into Supabase and RAG.</div>
          </div>
          <span className="qd-badge">HISTORICAL TRAINING</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {replayReadinessItems.map((item) => (
            <div key={item.label} className={cn('border p-3 font-mono', item.ready ? 'border-[var(--green)]/25 bg-[var(--green)]/5' : 'border-[var(--orange)]/25 bg-[var(--orange)]/5')}>
              <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--txt3)]">{item.label}</div>
              <div className={cn('text-[11px] mt-1 font-bold', item.ready ? 'text-[var(--green)]' : 'text-[var(--orange)]')}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card-base p-4 mb-6 font-mono">
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--txt)]">NinjaTrader Historical Import</div>
            <div className="mt-1 text-[10px] text-[var(--txt3)]">
              Pulls read-only OHLC bars for the entered Trading Date. Screenshots become optional backup; Replay Lab saves the imported bar context into the setup/RAG lesson.
            </div>
          </div>
          <span className="qd-badge border-[var(--green)]/30 text-[var(--green)]">READ ONLY</span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => void fetchHistoricalReplayData('morning')}
            disabled={isFetchingHistorical || !tradeDate}
            className="border border-[var(--b2)] bg-[var(--s1)] p-3 text-left transition-colors hover:border-[var(--orange)]/50 disabled:opacity-50"
          >
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--txt)]">Fetch Morning Historical Data</div>
            <div className="mt-1 text-[9px] text-[var(--txt3)]">15M: midnight to 10:00 · 5M: 9:30 to 10:10</div>
            <div className="mt-2 text-[10px] text-[var(--green)]">
              {historicalMorning5mBars.length ? `${historicalMorning5mBars.length} 5M · ${historicalMorning15mBars.length} 15M · ${historicalMorning60mBars.length} 1H · ${historicalMorning240mBars.length} 4H bars imported` : 'Not imported yet'}
            </div>
          </button>
          <button
            type="button"
            onClick={() => void fetchHistoricalReplayData('lunch')}
            disabled={isFetchingHistorical || !tradeDate}
            className="border border-[var(--b2)] bg-[var(--s1)] p-3 text-left transition-colors hover:border-[var(--orange)]/50 disabled:opacity-50"
          >
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--txt)]">Fetch Lunch Historical Data</div>
            <div className="mt-1 text-[9px] text-[var(--txt3)]">5M: 11:50 to 1:00 · morning context used when imported</div>
            <div className="mt-2 text-[10px] text-[var(--green)]">
              {historicalLunch5mBars.length ? `${historicalLunch5mBars.length} lunch 5M · ${historicalLunch60mBars.length} 1H · ${historicalLunch240mBars.length} 4H bars imported` : 'Not imported yet'}
            </div>
          </button>
        </div>
        {historicalFetchStatus && (
          <div className="mt-3 border border-[var(--green)]/25 bg-[var(--green)]/10 p-2 text-[10px] text-[var(--green)]">{historicalFetchStatus}</div>
        )}
        {historicalFetchError && (
          <div className="mt-3 border border-[var(--red)]/25 bg-[var(--red)]/10 p-2 text-[10px] text-[var(--red)]">{historicalFetchError}</div>
        )}
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
                <ScreenshotUploadPanel target="morning_eth_context" label="15m ETH Context" img={morningEthImg} onUpload={handleFileUpload} onClear={() => setMorningEthImg(null)} hintText={`Paste or upload 15M chart: ${formatReplayRange('morning_eth_context', morningReviewTimezone)}`} />
                <ScreenshotUploadPanel target="morning_5m_execution" label="5m Morning Execution" img={morningExecImg} onUpload={handleFileUpload} onClear={() => setMorningExecImg(null)} isRequired hintText={`Paste or upload 5M chart: ${formatReplayRange('morning_5m_execution', morningReviewTimezone)}`} />
                
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
                      <FinalTradePlanCard plan={normalizedMorningPlan} agentLearningUsed={morningResult.agent_learning_used} planVersionId={morningResult.planVersionId} />
                     </div>
                   )}
                 </div>

                 {!morningOutcome && !proofFlow.active && (
                   <>
                     <OutcomePlanSelector
                       plan={normalizedMorningPlan}
                     value={morningOutcomePlanChoice}
                     onChange={setMorningOutcomePlanChoice}
                     getOptions={getOutcomePlanOptions}
                     accountEquity={session.accountEquity}
                     riskPercent={session.riskPercent}
                     contracts={contracts}
                     instrument={instrument}
                   />
                     <TradeConfirmationPanel
                       options={REPLAY_OUTCOMES}
                       disabled={savingOutcome?.sessionType === 'morning'}
                       saving={savingOutcome?.sessionType === 'morning'}
                       error={morningError}
                       tradeTaken={morningTradeTaken}
                       onTradeTakenChange={setMorningTradeTaken}
                       isTradeTakenOutcome={isTradeTakenOutcome}
                       onSelect={(outcome) => saveTradeOutcome('morning', outcome)}
                     />
                   </>
                 )}

                 {proofFlow.active && proofFlow.sessionType === 'morning' && (
                    <TradeProofPanel 
                      manualOutcome={proofFlow.outcome!} 
                      executionQuantity={contracts} 
                      modelConfig={session.aiSettings} 
                      dailyInstrument={instrument}
                      tradePlan={getSelectedOutcomePlan('morning').plan}
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
                 <button onClick={() => {setMorningResult(null); setMorningOutcome(null); setMorningSetupId(null); setMorningSaveStatus(null); setMorningError(null); setMorningOutcomePlanChoice('main'); setMorningTradeTaken(null);}} className="text-[10px] self-start text-[var(--txt3)] mt-2">← Start Over</button>
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
                <ScreenshotUploadPanel target="lunch_5m_execution" label="5m Lunch Execution" img={lunchExecImg} onUpload={handleFileUpload} onClear={() => setLunchExecImg(null)} isRequired hintText={`Paste or upload 5M chart: ${formatReplayRange('lunch_5m_execution', lunchReviewTimezone)}`} />
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
                      <FinalTradePlanCard plan={normalizedLunchPlan} agentLearningUsed={lunchResult.agent_learning_used} planVersionId={lunchResult.planVersionId} />
                     </div>
                   )}
                 </div>

                 {!lunchOutcome && !proofFlow.active && (
                   <>
                     <OutcomePlanSelector
                       plan={normalizedLunchPlan}
                     value={lunchOutcomePlanChoice}
                     onChange={setLunchOutcomePlanChoice}
                     getOptions={getOutcomePlanOptions}
                     accountEquity={session.accountEquity}
                     riskPercent={session.riskPercent}
                     contracts={contracts}
                     instrument={instrument}
                   />
                     <TradeConfirmationPanel
                       options={REPLAY_OUTCOMES}
                       disabled={savingOutcome?.sessionType === 'lunch'}
                       saving={savingOutcome?.sessionType === 'lunch'}
                       error={lunchError}
                       tradeTaken={lunchTradeTaken}
                       onTradeTakenChange={setLunchTradeTaken}
                       isTradeTakenOutcome={isTradeTakenOutcome}
                       onSelect={(outcome) => saveTradeOutcome('lunch', outcome)}
                     />
                   </>
                 )}

                 {proofFlow.active && proofFlow.sessionType === 'lunch' && (
                    <TradeProofPanel 
                      manualOutcome={proofFlow.outcome!} 
                      executionQuantity={contracts} 
                      modelConfig={session.aiSettings} 
                      dailyInstrument={instrument}
                      tradePlan={getSelectedOutcomePlan('lunch').plan}
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
                 <button onClick={() => {setLunchResult(null); setLunchOutcome(null); setLunchSetupId(null); setLunchSaveStatus(null); setLunchError(null); setLunchOutcomePlanChoice('main'); setLunchTradeTaken(null);}} className="text-[10px] self-start text-[var(--txt3)] mt-2">← Start Over</button>
               </div>
            )}
         </div>
      </div>
    </div>
  );
}
