import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { AnalysisResult, ProposedRule, SessionState, SetupCandidate, Trade } from '../types';
import { analyzeChart } from '../lib/gemini';
import { uploadScreenshot } from '../lib/cloudStorage';
import { supabase } from '../lib/supabase';
import { cn, formatReplayRange, getImageFromClipboard } from '../lib/utils';
import { buildAppTradePlan } from '../lib/planEngine';
import FinalTradePlanCard from './FinalTradePlanCard';
import { TimezoneToggle } from './TimezoneToggle';
import TradeProofPanel from './TradeProofPanel';
import ScreenshotUploadPanel, { type UploadedWorkflowImage } from './workflow/ScreenshotUploadPanel';
import TradeConfirmationPanel, { type WorkflowOutcomeOption } from './workflow/TradeConfirmationPanel';
import WorkflowResetButton from './workflow/WorkflowResetButton';
import { buildSaveReceipt, createPlanVersionId, createSetupSignature } from '../lib/planMetadata';

type SessionPasteTarget = 'morning_eth_context' | 'morning_5m_execution' | 'lunch_5m_execution' | null;
type SessionOutcome = 'win' | 'loss' | 'scratch' | 'no_trade' | 'missed_trade';
type OutcomePlanChoice = 'main' | `candidate:${number}`;
type UploadedImage = UploadedWorkflowImage;

const SESSION_OUTCOMES: Array<WorkflowOutcomeOption<SessionOutcome>> = [
  {
    value: 'win',
    label: 'Win',
    hint: 'T1/T2 reached',
    className: 'border-[var(--green)]/40 bg-[var(--green)]/10 text-[var(--green)] hover:bg-[var(--green)]/20',
  },
  {
    value: 'loss',
    label: 'Loss',
    hint: 'Stop hit',
    className: 'border-[var(--red)]/40 bg-[var(--red)]/10 text-[var(--red)] hover:bg-[var(--red)]/20',
  },
  {
    value: 'scratch',
    label: 'Scratch',
    hint: 'Break even',
    className: 'border-[var(--txt3)]/40 bg-[var(--b1)] text-[var(--txt)] hover:border-[var(--txt2)]',
  },
  {
    value: 'no_trade',
    label: 'No Trade',
    hint: 'No valid entry',
    className: 'border-[var(--yellow)]/40 bg-[var(--yellow)]/10 text-[var(--yellow)] hover:bg-[var(--yellow)]/20',
  },
  {
    value: 'missed_trade',
    label: 'Missed',
    hint: 'Setup skipped',
    className: 'border-[var(--orange)]/40 bg-[var(--orange)]/10 text-[var(--orange)] hover:bg-[var(--orange)]/20',
  },
];

function todayLocalDate(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function outcomeToRag(outcome: SessionOutcome): string {
  if (outcome === 'win') return 'win';
  if (outcome === 'loss') return 'loss';
  if (outcome === 'scratch') return 'scratch';
  if (outcome === 'no_trade') return 'no_trade';
  return 'missed_trade';
}

function isTradeTakenOutcome(outcome: SessionOutcome): boolean {
  return outcome === 'win' || outcome === 'loss' || outcome === 'scratch';
}

function formatCandidateName(candidate: SetupCandidate): string {
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

function buildRuleRefinementText(customRules: ProposedRule[]): string {
  const approvedRules = customRules
    .filter(rule => rule.status === 'APPROVED')
    .map(rule => `- ${rule.rule}: ${rule.reasoning}`);

  if (!approvedRules.length) return '';
  return `APPROVED STRATEGY REFINEMENTS:\n${approvedRules.join('\n')}`;
}

function trimInstruction(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function mergeCustomInstructions(base: unknown, additions: Array<unknown>): string {
  return [base, ...additions]
    .map(trimInstruction)
    .filter(Boolean)
    .join('\n\n');
}

function OutcomePlanSelector({
  plan,
  value,
  onChange,
  getOptions,
}: {
  plan: ReturnType<typeof buildAppTradePlan> | null;
  value: OutcomePlanChoice;
  onChange: (value: OutcomePlanChoice) => void;
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
            Select the exact plan you actually traded before marking Win/Loss/Scratch. RAG will learn from this plan, not just the main card.
          </p>
        </div>
        <span className="qd-badge border-[var(--orange)]/30 text-[var(--orange)]">Outcome Plan</span>
      </div>

      <div className="grid gap-2">
        {options.map(option => {
          const optionPlan = option.plan;
          const isSelected = option.key === selected.key;
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
                    {option.candidate ? 'Setup-scan / conditional candidate selected by user.' : 'Primary normalized app plan.'}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1 text-right text-[9px] md:min-w-[320px]">
                  <span className="border border-[var(--b1)] px-2 py-1 text-[var(--txt2)]">E {optionPlan?.entry ?? 'N/A'}</span>
                  <span className="border border-[var(--b1)] px-2 py-1 text-[var(--red)]">S {optionPlan?.stop ?? 'N/A'}</span>
                  <span className="border border-[var(--b1)] px-2 py-1 text-[var(--green)]">T1 {optionPlan?.t1 ?? 'N/A'}</span>
                  <span className="border border-[var(--b1)] px-2 py-1 text-[var(--green)]">T2 {optionPlan?.t2 ?? 'N/A'}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function SessionLab({
  session,
  customRules = [],
  onUpdate,
  onAddTrade,
  isActive,
}: {
  session: SessionState;
  customRules?: ProposedRule[];
  onUpdate: (updates: Partial<SessionState>) => void;
  onAddTrade?: (trade: Omit<Trade, 'id' | 'timestamp'>) => void;
  isActive?: boolean;
}) {
  const [tradeDate, setTradeDate] = useState(todayLocalDate());
  const [instrument, setInstrument] = useState<'MES' | 'MNQ'>(session.dailyInstrument || 'MES');
  const [contracts, setContracts] = useState(1);
  const [midnightOpen, setMidnightOpen] = useState('');
  const [activePasteTarget, setActivePasteTarget] = useState<SessionPasteTarget>(null);

  const [morningTimezone, setMorningTimezone] = useState<'EST' | 'PST'>(session.aiSettings?.morningTimeZone || 'EST');
  const [lunchTimezone, setLunchTimezone] = useState<'EST' | 'PST'>(session.aiSettings?.lunchTimeZone || 'EST');

  const [morningEthImg, setMorningEthImg] = useState<UploadedImage | null>(null);
  const [morningExecImg, setMorningExecImg] = useState<UploadedImage | null>(null);
  const [lunchExecImg, setLunchExecImg] = useState<UploadedImage | null>(null);

  const [isAnalyzingMorning, setIsAnalyzingMorning] = useState(false);
  const [isAnalyzingLunch, setIsAnalyzingLunch] = useState(false);
  const [morningResult, setMorningResult] = useState<AnalysisResult | null>(session.analysisResult || null);
  const [lunchResult, setLunchResult] = useState<AnalysisResult | null>(session.lunchAnalysisResult || null);
  const [morningSetupId, setMorningSetupId] = useState<string | null>(null);
  const [lunchSetupId, setLunchSetupId] = useState<string | null>(null);
  const [morningError, setMorningError] = useState<string | null>(null);
  const [lunchError, setLunchError] = useState<string | null>(null);
  const [morningSaveStatus, setMorningSaveStatus] = useState<string | null>(null);
  const [lunchSaveStatus, setLunchSaveStatus] = useState<string | null>(null);
  const [morningOutcome, setMorningOutcome] = useState<SessionOutcome | null>(null);
  const [lunchOutcome, setLunchOutcome] = useState<SessionOutcome | null>(null);
  const [savingOutcome, setSavingOutcome] = useState<{ sessionType: 'morning' | 'lunch'; outcome: SessionOutcome } | null>(null);
  const [proofFlow, setProofFlow] = useState<{ active: boolean; outcome?: 'SUCCESS' | 'FAILED'; sessionType?: 'morning' | 'lunch' }>({ active: false });
  const [morningOutcomePlanChoice, setMorningOutcomePlanChoice] = useState<OutcomePlanChoice>('main');
  const [lunchOutcomePlanChoice, setLunchOutcomePlanChoice] = useState<OutcomePlanChoice>('main');
  const [morningTradeTaken, setMorningTradeTaken] = useState<boolean | null>(null);
  const [lunchTradeTaken, setLunchTradeTaken] = useState<boolean | null>(null);

  const normalizedMorningPlan = morningResult ? buildAppTradePlan(morningResult, { sessionType: 'morning', instrument }) : null;
  const normalizedLunchPlan = lunchResult ? buildAppTradePlan(lunchResult, { sessionType: 'lunch', instrument }) : null;
  const approvedRuleRefinements = buildRuleRefinementText(customRules);

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
        plan: buildPlanFromCandidate(plan, candidate, ' User selected this candidate for outcome/RAG learning.'),
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
    onUpdate({
      dailyInstrument: instrument,
      aiSettings: {
        ...(session.aiSettings || { temperature: 0 }),
        morningTimeZone: morningTimezone,
        lunchTimeZone: lunchTimezone,
      },
    });
  }, [instrument, morningTimezone, lunchTimezone]);

  const readinessItems = [
    { label: 'Trading Date', value: tradeDate, ready: Boolean(tradeDate) },
    { label: 'Instrument', value: instrument, ready: true },
    { label: 'Contracts', value: String(contracts), ready: contracts > 0 },
    { label: 'Midnight Open', value: midnightOpen ? 'SET' : 'OPTIONAL', ready: Boolean(midnightOpen) },
    { label: 'Morning 15M', value: morningEthImg ? 'ATTACHED' : 'OPTIONAL', ready: Boolean(morningEthImg) },
    { label: 'Morning 5M', value: morningExecImg || morningResult ? 'READY' : 'REQUIRED', ready: Boolean(morningExecImg || morningResult) },
    { label: 'Lunch 5M', value: lunchExecImg || lunchResult ? 'READY' : 'OPTIONAL', ready: Boolean(lunchExecImg || lunchResult) },
    { label: 'RAG Save', value: morningSaveStatus || lunchSaveStatus ? 'ACTIVE' : 'ON ANALYSIS', ready: true },
  ];

  const processImage = (dataUrl: string, target: SessionPasteTarget) => {
    if (target === 'morning_eth_context') setMorningEthImg({ dataUrl });
    if (target === 'morning_5m_execution') setMorningExecImg({ dataUrl });
    if (target === 'lunch_5m_execution') setLunchExecImg({ dataUrl });
  };

  const handlePaste = useCallback(async (event: ClipboardEvent) => {
    if (event.defaultPrevented || proofFlow.active) return;
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || (activeElement as HTMLElement).isContentEditable)) return;

    let target = activePasteTarget;
    if (!target) {
      if (!morningExecImg) target = 'morning_5m_execution';
      else target = 'lunch_5m_execution';
    }

    const imageData = await getImageFromClipboard(event);
    if (imageData) {
      event.preventDefault();
      processImage(imageData, target);
    }
  }, [activePasteTarget, morningExecImg, proofFlow.active]);

  useEffect(() => {
    if (!isActive) return;
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste, isActive]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, target: SessionPasteTarget) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) processImage(evt.target.result as string, target);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const resetMorning = () => {
    setTradeDate(todayLocalDate());
    setMorningEthImg(null);
    setMorningExecImg(null);
    setMorningResult(null);
    setMorningSetupId(null);
    setMorningError(null);
    setMorningSaveStatus(null);
    setMorningOutcome(null);
    setMorningOutcomePlanChoice('main');
    setMorningTradeTaken(null);
    setProofFlow(current => current.sessionType === 'morning' ? { active: false } : current);
    onUpdate({ analysisResult: undefined, morningScreenshot: undefined, morningEthScreenshot: undefined, dayType: undefined });
  };

  const resetLunch = () => {
    setTradeDate(todayLocalDate());
    setLunchExecImg(null);
    setLunchResult(null);
    setLunchSetupId(null);
    setLunchError(null);
    setLunchSaveStatus(null);
    setLunchOutcome(null);
    setLunchOutcomePlanChoice('main');
    setLunchTradeTaken(null);
    setProofFlow(current => current.sessionType === 'lunch' ? { active: false } : current);
    onUpdate({ lunchAnalysisResult: undefined, lunchScreenshot: undefined });
  };

  const saveSetupAndRag = async (sessionType: 'morning' | 'lunch', analysis: AnalysisResult, imageUrl: string, ethImageUrl?: string | null, morning5mContext?: string | null) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { setupId: null, ragId: null, status: 'Login required: analysis completed but was not saved to Supabase.' };

    const plan = buildAppTradePlan(analysis, { sessionType, instrument });
    const planVersionId = createPlanVersionId(sessionType, tradeDate);
    const setupSignature = createSetupSignature({ sessionType, instrument, tradeDate, plan });
    const chartTimezone = sessionType === 'morning' ? morningTimezone : lunchTimezone;
    const requiredScreenshotRange = sessionType === 'morning'
      ? formatReplayRange('morning_5m_execution', morningTimezone)
      : formatReplayRange('lunch_5m_execution', lunchTimezone);
    analysis.planVersionId = planVersionId;
    analysis.setupSignature = setupSignature;

    const setupData: Record<string, any> = {
      user_id: user.id,
      analysis_mode: 'live',
      source: 'session_lab',
      session_type: sessionType,
      instrument,
      trade_date: tradeDate,
      day_type: analysis.dayType,
      reasoning: analysis.reasoning,
      confidence: analysis.confidence,
      image_url: imageUrl,
      execution_screenshot_url: imageUrl,
      eth_context_screenshot_url: ethImageUrl || undefined,
      normalized_plan_json: plan,
      plan_source: plan.source,
      suggested_entry: plan.entry || 0,
      suggested_stop: plan.stop || 0,
      suggested_target: plan.t1 || 0,
      t1_price: plan.t1,
      t2_price: plan.t2,
      risk_points: plan.riskPoints,
      midnight_open_price: analysis.midnightOpenPrice || (midnightOpen ? Number(midnightOpen) : null),
      midnight_open_source: analysis.midnightOpenSource || (midnightOpen ? 'manual' : undefined),
      rth_vs_midnight: analysis.rthVsMidnight,
      retrace_probability: analysis.retraceProbability,
      execution_review_json: analysis.executionReview5m || null,
      eth_context_review_json: sessionType === 'morning' ? analysis.ethContextReview || null : session.analysisResult?.ethContextReview || null,
      afternoon_test_plan_json: sessionType === 'lunch' ? analysis.afternoonTestPlan || null : null,
      midnight_open_review_json: analysis.midnightAnalysis || null,
      trade_plan_json: {
        best_trade_plan: analysis.best_trade_plan || null,
        final_trade_plan: analysis.final_trade_plan || null,
        candidate_trade_plans: analysis.candidate_trade_plans || [],
        trade_management_plan: analysis.trade_management_plan || null,
        normalized_plan: plan,
        plan_version_id: planVersionId,
        setup_signature: setupSignature,
        chart_timezone: chartTimezone,
        required_screenshot_range: requiredScreenshotRange,
        morning_context: sessionType === 'lunch' ? {
          morning_5m_available: Boolean(morning5mContext || session.morningScreenshot),
          morning_15m_eth_available: Boolean(ethImageUrl || session.morningEthScreenshot),
          morning_analysis_available: Boolean(session.analysisResult),
          morning_day_type: session.analysisResult?.dayType || null,
          morning_eth_context_review: session.analysisResult?.ethContextReview || null,
          morning_structured_chart_context: session.analysisResult?.structuredChartContext || null,
        } : null,
      },
    };
    Object.keys(setupData).forEach(key => setupData[key] === undefined && delete setupData[key]);

    const { data: setupRow, error: setupError } = await supabase.from('setups').insert([setupData]).select('id').single();
    if (setupError || !setupRow?.id) throw new Error(`Supabase setup save failed: ${setupError?.message || 'No setup ID returned.'}`);

    const { saveToRAG } = await import('../lib/rag');
    const ragResult = await saveToRAG({
      sessionType,
      workflowMode: sessionType,
      sessionMode: sessionType,
      ampm: sessionType === 'morning' ? 'AM' : 'PM',
      chartTimezone,
      instrument,
      tradeDate,
      dayOfWeek: new Date(`${tradeDate}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' }),
      setupId: setupRow.id,
      midnightOpenPrice: analysis.midnightOpenPrice || (midnightOpen ? Number(midnightOpen) : null),
      midnightOpenSource: analysis.midnightOpenSource || (midnightOpen ? 'manual' : undefined),
      rthVsMidnight: analysis.rthVsMidnight,
      retraceProbability: analysis.retraceProbability,
      geminiConfidence: analysis.confidence as any,
      geminiAnalysisJson: analysis,
      tradeResult: 'pending',
      outcome: 'pending',
      proofSubmitted: false,
      tradeConfirmed: false,
      tradeTaken: false,
      ruleVersion: planVersionId,
      workflowTimestamp: new Date().toISOString(),
      screenshots: {
        execution5m: imageUrl,
        eth15mContext: ethImageUrl || session.morningEthScreenshot || null,
        morning5mContext: morning5mContext || (sessionType === 'lunch' ? session.morningScreenshot : null),
        proof: null,
      },
      chartContext: analysis.structuredChartContext || null,
      setupCandidates: (analysis as any).tradeDecision?.setupCandidates || analysis.candidate_trade_plans || [],
      selectedSetup: analysis.best_trade_plan || null,
      finalTradePlan: plan,
      contracts,
      entryPrice: plan.entry,
      stopPrice: plan.stop,
      t1: plan.t1,
      t2: plan.t2,
      riskPoints: plan.riskPoints,
      riskRewardT1: plan.riskRewardT1,
      riskRewardT2: plan.riskRewardT2,
      planSource: plan.source,
      whyThisPlan: plan.whyThisPlan,
      invalidation: plan.invalidation,
      execution_5m_screenshot_url: imageUrl,
      eth_15m_context_screenshot_url: ethImageUrl || session.morningEthScreenshot || null,
      context_timeframe: ethImageUrl || session.morningEthScreenshot ? '15m' : null,
      context_session: ethImageUrl || session.morningEthScreenshot ? 'ETH' : null,
      eth_context_available: Boolean(ethImageUrl || session.morningEthScreenshot || analysis.ethContextReview),
      eth_context_review_json: sessionType === 'morning' ? analysis.ethContextReview || null : session.analysisResult?.ethContextReview || null,
      execution_review_json: analysis.executionReview5m || null,
      afternoon_test_plan_json: analysis.afternoonTestPlan || null,
      midnight_open_review_json: analysis.midnightAnalysis || null,
      required_screenshot_range: requiredScreenshotRange,
      trade_plan_json: setupData.trade_plan_json,
    });

    const receipt = buildSaveReceipt({
      planVersionId,
      setupId: setupRow.id,
      ragId: ragResult.id || null,
      screenshotPath: imageUrl,
      embeddingStatus: ragResult.success ? (ragResult.usedFallback ? 'pending' : 'saved') : 'failed',
      note: ragResult.success ? undefined : ragResult.error,
    });

    return {
      setupId: setupRow.id as string,
      ragId: ragResult.id || null,
      status: `Saved to Supabase + RAG ✓ Plan ${receipt.planVersionId} · Setup ${setupRow.id.slice(0, 8)}${ragResult.id ? ` · RAG ${ragResult.id.slice(0, 8)}` : ''}`,
    };
  };

  const runMorningAnalysis = async () => {
    if (!morningExecImg) {
      setMorningError('Required: 5M Morning Execution screenshot.');
      return;
    }
    setIsAnalyzingMorning(true);
    setMorningError(null);
    setMorningSaveStatus('Running Morning analysis...');

    try {
      const payload = morningEthImg ? { exec: morningExecImg.dataUrl, eth: morningEthImg.dataUrl } : morningExecImg.dataUrl;
      const morningSettings = {
        ...(session.aiSettings || { temperature: 0 }),
        customInstructions: mergeCustomInstructions(session.aiSettings?.customInstructions, [
          approvedRuleRefinements,
          'THIS IS THE MORNING ANALYSIS SETUP. The 15M ETH image is context only. The 5M image is the execution chart. Final trade approval belongs to the app-owned plan engine and trade decision pipeline.',
        ]),
      };
      const analysis = await analyzeChart(payload, morningSettings, session.accountEquity, undefined, undefined, 'morning', undefined, midnightOpen || undefined, instrument) as AnalysisResult;

      let execUrl = morningExecImg.dataUrl;
      let ethUrl: string | null = morningEthImg?.dataUrl || null;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const execUpload = await uploadScreenshot(user.id, tradeDate, 'session_lab/morning', '5m_execution', morningExecImg.dataUrl);
        execUrl = execUpload.url;
        setMorningExecImg({ ...morningExecImg, storagePath: execUpload.storagePath });
        if (morningEthImg) {
          const ethUpload = await uploadScreenshot(user.id, tradeDate, 'session_lab/morning', '15m_eth_context', morningEthImg.dataUrl);
          ethUrl = ethUpload.url;
          setMorningEthImg({ ...morningEthImg, storagePath: ethUpload.storagePath });
        }
      }

      const save = await saveSetupAndRag('morning', analysis, execUrl, ethUrl);
      setMorningSetupId(save.setupId);
      setMorningSaveStatus(save.status);
      setMorningResult(analysis);
      onUpdate({ analysisResult: analysis, morningScreenshot: morningExecImg.dataUrl, morningEthScreenshot: morningEthImg?.dataUrl, dayType: analysis.dayType });
    } catch (error: any) {
      setMorningError(error.message || 'Morning analysis failed.');
      setMorningSaveStatus(null);
    } finally {
      setIsAnalyzingMorning(false);
    }
  };

  const runLunchAnalysis = async () => {
    if (!lunchExecImg) {
      setLunchError('Required: 5M Lunch Execution screenshot.');
      return;
    }
    setIsAnalyzingLunch(true);
    setLunchError(null);
    setLunchSaveStatus('Running Lunch analysis...');

    try {
      const payload = (morningEthImg || morningExecImg || session.morningEthScreenshot || session.morningScreenshot)
        ? {
          exec: lunchExecImg.dataUrl,
          eth: morningEthImg?.dataUrl || session.morningEthScreenshot,
          morningExec: morningExecImg?.dataUrl || session.morningScreenshot,
        }
        : lunchExecImg.dataUrl;
      const previousAnalysis = morningResult || session.analysisResult ? {
        appOwnedPlan: buildAppTradePlan((morningResult || session.analysisResult)!, { sessionType: 'morning', instrument }),
        midnightOpenPrice: (morningResult || session.analysisResult)?.midnightOpenPrice,
        ethContextReview: (morningResult || session.analysisResult)?.ethContextReview,
        structuredChartContext: (morningResult || session.analysisResult)?.structuredChartContext,
        reasoning: (morningResult || session.analysisResult)?.reasoning,
        morningContextImagesAvailable: {
          eth15m: Boolean(morningEthImg || session.morningEthScreenshot),
          execution5m: Boolean(morningExecImg || session.morningScreenshot),
        },
      } : undefined;

      const lunchSettings = {
        ...(session.aiSettings || { temperature: 0 }),
        customInstructions: mergeCustomInstructions(session.aiSettings?.customInstructions, [
          approvedRuleRefinements,
          'THIS IS THE LUNCH REVERSAL SETUP. Only treat Morning 15M ETH and Morning 5M images as context. The Lunch 5M image is the execution chart. Prefer Lunch Failed High/Low Reversal, Compression Breakout, Failed Continuation, and Range Reclaim mechanics.',
        ]),
      };
      const analysis = await analyzeChart(payload, lunchSettings, session.accountEquity, previousAnalysis, undefined, 'lunch', undefined, midnightOpen || (morningResult || session.analysisResult)?.midnightOpenPrice?.toString(), instrument) as AnalysisResult;

      let execUrl = lunchExecImg.dataUrl;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const execUpload = await uploadScreenshot(user.id, tradeDate, 'session_lab/lunch', '5m_execution', lunchExecImg.dataUrl);
        execUrl = execUpload.url;
        setLunchExecImg({ ...lunchExecImg, storagePath: execUpload.storagePath });
      }

      const save = await saveSetupAndRag('lunch', analysis, execUrl, morningEthImg?.dataUrl || session.morningEthScreenshot || null, morningExecImg?.dataUrl || session.morningScreenshot || null);
      setLunchSetupId(save.setupId);
      setLunchSaveStatus(save.status);
      setLunchResult(analysis);
      onUpdate({ lunchAnalysisResult: analysis, lunchScreenshot: lunchExecImg.dataUrl });
    } catch (error: any) {
      setLunchError(error.message || 'Lunch analysis failed.');
      setLunchSaveStatus(null);
    } finally {
      setIsAnalyzingLunch(false);
    }
  };

  const saveTradeOutcome = async (sessionType: 'morning' | 'lunch', outcome: SessionOutcome) => {
    const result = sessionType === 'morning' ? morningResult : lunchResult;
    const plan = sessionType === 'morning' ? normalizedMorningPlan : normalizedLunchPlan;
    const selectedOutcomePlan = getSelectedOutcomePlan(sessionType);
    const actualPlan = selectedOutcomePlan.plan || plan;
    const selectedCandidate = selectedOutcomePlan.candidate;
    const tradeTaken = sessionType === 'morning' ? morningTradeTaken : lunchTradeTaken;
    const setupId = sessionType === 'morning' ? morningSetupId : lunchSetupId;
    const setError = sessionType === 'morning' ? setMorningError : setLunchError;
    const setStatus = sessionType === 'morning' ? setMorningSaveStatus : setLunchSaveStatus;
    const setOutcome = sessionType === 'morning' ? setMorningOutcome : setLunchOutcome;
    if (!result) return;

    const executableOutcome = isTradeTakenOutcome(outcome);
    if (tradeTaken === null) {
      setError('Select Trade Taken: Yes or No before marking the outcome.');
      return;
    }
    if (tradeTaken !== executableOutcome) {
      setError(tradeTaken
        ? 'Trade Taken is Yes, so choose Win, Loss, or Scratch.'
        : 'Trade Taken is No, so choose No Trade or Missed.');
      return;
    }
    if (executableOutcome && (!actualPlan || actualPlan.entry === null || actualPlan.stop === null || actualPlan.t1 === null || actualPlan.t2 === null)) {
      setError('Trade-taken outcomes require a selected plan with ENTRY, STOP, T1, and T2. Select a conditional plan or use No Trade / Missed.');
      return;
    }

    setSavingOutcome({ sessionType, outcome });
    setError(null);
    setStatus(`Saving ${outcome.replace(/_/g, ' ').toUpperCase()} to Supabase + RAG...`);

    try {
      if (setupId) {
        await supabase.from('setups').update({ outcome, replay_status: 'verified', contracts }).eq('id', setupId);
        const { saveToRAG } = await import('../lib/rag');
        await saveToRAG({
          setupId,
          sessionType,
          workflowMode: sessionType,
          sessionMode: sessionType,
          ampm: sessionType === 'morning' ? 'AM' : 'PM',
          chartTimezone: sessionType === 'morning' ? morningTimezone : lunchTimezone,
          instrument,
          tradeDate,
          dayOfWeek: new Date(`${tradeDate}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' }),
          geminiConfidence: result.confidence as any,
          geminiAnalysisJson: result,
          tradeResult: outcomeToRag(outcome),
          outcome,
          proofSubmitted: false,
          tradeConfirmed: true,
          tradeTaken: executableOutcome,
          ruleVersion: result.planVersionId || null,
          workflowTimestamp: new Date().toISOString(),
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
          planSource: selectedCandidate ? 'user_selected_setup_candidate' : actualPlan?.source,
          whyThisPlan: actualPlan?.whyThisPlan,
          invalidation: actualPlan?.invalidation,
          notes: `Trade Taken: ${tradeTaken ? 'yes' : 'no'}\nOutcome plan: ${selectedOutcomePlan.label}\n${selectedCandidate ? 'User selected a conditional/setup-scan candidate instead of the main plan.' : 'User selected the main app plan.'}`,
          trade_plan_json: {
            selected_outcome_plan_key: selectedOutcomePlan.key,
            selected_outcome_plan_label: selectedOutcomePlan.label,
            selected_outcome_candidate: selectedCandidate,
            selected_outcome_plan: actualPlan,
            normalized_plan: plan,
          },
        });
      }

      if (onAddTrade && executableOutcome && actualPlan) {
        await Promise.resolve(onAddTrade({
          date: tradeDate,
          instrument,
          direction: actualPlan.decision === 'LONG' || actualPlan.decision === 'SHORT' ? actualPlan.decision : 'LONG',
          dayType: result.dayType,
          entryPrice: actualPlan.entry || 0,
          stopPrice: actualPlan.stop || 0,
          targetPrice: actualPlan.t1 || 0,
          contracts,
          status: outcome === 'win' ? 'SUCCESSFUL' : outcome === 'loss' ? 'FAILED' : 'CLOSED',
          manualOutcome: outcome === 'loss' ? 'FAILED' : 'SUCCESS',
          analysisMode: 'live',
          source: 'session_lab',
          sessionType,
          setupId: setupId || undefined,
        } as any));
      }

      setOutcome(outcome);
      setStatus(`Saved to Supabase + RAG ✓ Result: ${outcome.toUpperCase()} · Plan: ${selectedOutcomePlan.label}`);
      if (executableOutcome) setProofFlow({ active: true, outcome: outcome === 'loss' ? 'FAILED' : 'SUCCESS', sessionType });
    } catch (error: any) {
      setError(error.message || 'Outcome save failed.');
      setStatus(null);
    } finally {
      setSavingOutcome(null);
    }
  };

  const handleProofSave = async (_manualOutcome: 'SUCCESS' | 'FAILED', proofData?: Partial<Trade>) => {
    const setupId = proofFlow.sessionType === 'morning' ? morningSetupId : lunchSetupId;
    if (setupId && proofData) {
      await supabase.from('setups').update({
        pnl_ticks: proofData.pnlTicks,
        pnl_dollars: proofData.pnlDollars,
        proof_screenshot_url: proofData.proof_screenshot_url,
      }).eq('id', setupId);
      const { updateRAGWithTradeResult } = await import('../lib/rag');
      await updateRAGWithTradeResult(
        setupId,
        proofFlow.outcome === 'FAILED' ? 'loss' : 'win',
        proofData.pnlTicks,
        proofData.pnlDollars,
        undefined,
        undefined,
        proofData.gemini_verdict as any,
        proofData.proof_screenshot_url
      );
    }
    setProofFlow({ active: false });
  };

  return (
    <div className="flex flex-col h-full fade-in">
      <div className="flex items-center gap-4 mb-6 sticky top-0 bg-[var(--bg)]/90 backdrop-blur z-10 py-4 border-b border-[var(--b2)]">
        <h1 className="text-xl font-bold tracking-tight text-[var(--txt)] flex-1">SESSION LAB</h1>
        <span className="qd-badge">LIVE DECISION SUPPORT</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-[var(--b0)] border border-[var(--b2)] p-4 rounded-sm mb-6 shadow-sm font-mono text-[11px]">
        <div className="flex flex-col gap-2">
          <label className="text-[var(--txt2)] uppercase tracking-widest font-bold">Trading Date *</label>
          <input type="date" value={tradeDate} onChange={event => setTradeDate(event.target.value)} className="bg-[var(--bg)] border border-[var(--b2)] text-[var(--txt)] p-2" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[var(--txt2)] uppercase tracking-widest font-bold">Instrument *</label>
          <div className="flex gap-2">
            <button onClick={() => setInstrument('MES')} className={cn('flex-1 p-2 border', instrument === 'MES' ? 'bg-[var(--orange)] border-[var(--orange)] text-black font-bold' : 'border-[var(--b2)]')}>MES</button>
            <button onClick={() => setInstrument('MNQ')} className={cn('flex-1 p-2 border', instrument === 'MNQ' ? 'bg-[var(--blue)] border-[var(--blue)] text-black font-bold' : 'border-[var(--b2)]')}>MNQ</button>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[var(--txt2)] uppercase tracking-widest font-bold">Midnight Open Price</label>
          <input type="text" placeholder="Auto-detect or manual" value={midnightOpen} onChange={event => setMidnightOpen(event.target.value)} className="bg-[var(--bg)] border border-[var(--b2)] text-[var(--txt)] p-2" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[var(--txt2)] uppercase tracking-widest font-bold">Contracts</label>
          <input type="number" min="1" value={contracts} onChange={event => setContracts(parseInt(event.target.value) || 1)} className="bg-[var(--bg)] border border-[var(--b2)] text-[var(--txt)] p-2" />
        </div>
        <div className="col-span-1 lg:col-span-2">
          <p className="text-[10px] flex items-start gap-2 bg-[var(--green)]/10 border border-[var(--green)]/20 p-2 text-[var(--green)]">
            <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />
            Session Lab defaults to today's browser date. Uploading or pasting screenshots only stages them. Analysis runs only when you click the Morning or Lunch analysis button.
          </p>
        </div>
      </div>

      <div className="card-base p-4 mb-6">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--txt3)]">Session Readiness</div>
            <div className="text-[12px] text-[var(--txt2)] mt-1">Morning and Lunch share the shell, but use separate screenshots, analysis state, proof flow, and RAG records.</div>
          </div>
          <span className="qd-badge">APP-OWNED DECISION</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {readinessItems.map(item => (
            <div key={item.label} className={cn('border p-3 font-mono', item.ready ? 'border-[var(--green)]/25 bg-[var(--green)]/5' : 'border-[var(--orange)]/25 bg-[var(--orange)]/5')}>
              <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--txt3)]">{item.label}</div>
              <div className={cn('text-[11px] mt-1 font-bold', item.ready ? 'text-[var(--green)]' : 'text-[var(--orange)]')}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 flex flex-col gap-4 p-4 bg-[var(--b0)] border border-[var(--b2)] morning-panel">
          <div className="flex justify-between items-center border-b border-[var(--b2)] pb-2">
            <h2 className="text-[14px] font-mono font-bold text-[var(--txt)]">MORNING REVIEW</h2>
            <div className="flex items-center gap-2">
              <TimezoneToggle selectedTimezone={morningTimezone} onChange={setMorningTimezone} />
              <WorkflowResetButton onClick={resetMorning}>Reset Morning</WorkflowResetButton>
            </div>
          </div>

          {!morningResult && (
            <>
              <ScreenshotUploadPanel target="morning_eth_context" label="15m ETH Context" img={morningEthImg} onUpload={handleFileUpload} onClear={() => setMorningEthImg(null)} onActivate={setActivePasteTarget} hintText={`Context only: ${formatReplayRange('morning_eth_context', morningTimezone)}`} />
              <ScreenshotUploadPanel target="morning_5m_execution" label="5m Morning Execution" img={morningExecImg} onUpload={handleFileUpload} onClear={() => setMorningExecImg(null)} onActivate={setActivePasteTarget} isRequired hintText={`Execution chart: ${formatReplayRange('morning_5m_execution', morningTimezone)}`} />
              {morningError && <div className="text-[var(--red)] text-[10px] bg-[var(--red)]/10 p-2">{morningError}</div>}
              {morningSaveStatus && <div className="text-[var(--green)] text-[10px] bg-[var(--green)]/10 p-2 border border-[var(--green)]/20">{morningSaveStatus}</div>}
              <button onClick={runMorningAnalysis} disabled={isAnalyzingMorning} className="qd-btn-primary mt-2 flex justify-center py-3">
                {isAnalyzingMorning ? 'Running Morning Analysis...' : 'Run Morning Analysis'}
              </button>
            </>
          )}

          {morningResult && (
            <div className="flex flex-col gap-4 font-mono">
              <div className="bg-[var(--bg)] p-4 border border-[var(--b2)] text-[12px]">
                <h3 className="text-[10px] text-[var(--txt2)] font-bold mb-2">Morning Bias: <span className="text-[var(--green)]">{morningResult.dayType}</span></h3>
                <div className="text-[11px] leading-relaxed mb-4">{morningResult.reasoning}</div>
                {normalizedMorningPlan && <FinalTradePlanCard plan={normalizedMorningPlan} agentLearningUsed={morningResult.agent_learning_used} planVersionId={morningResult.planVersionId} />}
              </div>
              {!morningOutcome && !proofFlow.active && (
                <>
                  <OutcomePlanSelector
                    plan={normalizedMorningPlan}
                    value={morningOutcomePlanChoice}
                    onChange={setMorningOutcomePlanChoice}
                    getOptions={getOutcomePlanOptions}
                  />
                  <TradeConfirmationPanel
                    options={SESSION_OUTCOMES}
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
              {proofFlow.active && proofFlow.sessionType === 'morning' && <TradeProofPanel manualOutcome={proofFlow.outcome!} executionQuantity={contracts} modelConfig={session.aiSettings} dailyInstrument={instrument} tradePlan={getSelectedOutcomePlan('morning').plan} onSaveTrade={handleProofSave} onCancel={() => setProofFlow({ active: false })} />}
              {morningOutcome && <div className="text-[10px] p-2 bg-[var(--green)]/10 text-[var(--green)]">Outcome logged: {morningOutcome.toUpperCase()}</div>}
              {morningSaveStatus && <div className="text-[10px] p-2 bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20">{morningSaveStatus}</div>}
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col gap-4 p-4 bg-[var(--b0)] border border-[var(--b2)] lunch-panel">
          <div className="flex justify-between items-center border-b border-[var(--b2)] pb-2">
            <h2 className="text-[14px] font-mono font-bold text-[var(--txt)]">LUNCH REVIEW</h2>
            <div className="flex items-center gap-2">
              <TimezoneToggle selectedTimezone={lunchTimezone} onChange={setLunchTimezone} />
              <WorkflowResetButton onClick={resetLunch}>Reset Lunch</WorkflowResetButton>
            </div>
          </div>

          {!lunchResult && (
            <>
              <ScreenshotUploadPanel target="lunch_5m_execution" label="5m Lunch Execution" img={lunchExecImg} onUpload={handleFileUpload} onClear={() => setLunchExecImg(null)} onActivate={setActivePasteTarget} isRequired hintText={`Execution chart: ${formatReplayRange('lunch_5m_execution', lunchTimezone)}`} />
              <div className="text-[10px] text-[var(--txt2)] border border-[var(--b2)] p-2">
                Lunch uses Morning 15M ETH and Morning 5M context when available, but the Lunch 5M chart remains the execution chart.
              </div>
              {morningResult || session.analysisResult ? <div className="text-[10px] text-[var(--green)] bg-[var(--green)]/10 p-2">+ Morning context available for Lunch plan</div> : <div className="text-[10px] text-[var(--orange)] bg-[var(--orange)]/10 p-2">Morning context not available yet. Lunch can still run from its own 5M chart.</div>}
              {lunchError && <div className="text-[var(--red)] text-[10px] bg-[var(--red)]/10 p-2">{lunchError}</div>}
              {lunchSaveStatus && <div className="text-[var(--green)] text-[10px] bg-[var(--green)]/10 p-2 border border-[var(--green)]/20">{lunchSaveStatus}</div>}
              <button onClick={runLunchAnalysis} disabled={isAnalyzingLunch} className="qd-btn-primary mt-2 flex justify-center py-3">
                {isAnalyzingLunch ? 'Running Lunch Analysis...' : 'Run Lunch Review Analysis'}
              </button>
            </>
          )}

          {lunchResult && (
            <div className="flex flex-col gap-4 font-mono">
              <div className="bg-[var(--bg)] p-4 border border-[var(--b2)] text-[12px]">
                <h3 className="text-[10px] text-[var(--txt2)] font-bold mb-2">Lunch Bias: <span className="text-[var(--orange)]">{lunchResult.dayType}</span></h3>
                <div className="text-[11px] leading-relaxed mb-4">{lunchResult.reasoning}</div>
                {normalizedLunchPlan && <FinalTradePlanCard plan={normalizedLunchPlan} agentLearningUsed={lunchResult.agent_learning_used} planVersionId={lunchResult.planVersionId} />}
              </div>
              {!lunchOutcome && !proofFlow.active && (
                <>
                  <OutcomePlanSelector
                    plan={normalizedLunchPlan}
                    value={lunchOutcomePlanChoice}
                    onChange={setLunchOutcomePlanChoice}
                    getOptions={getOutcomePlanOptions}
                  />
                  <TradeConfirmationPanel
                    options={SESSION_OUTCOMES}
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
              {proofFlow.active && proofFlow.sessionType === 'lunch' && <TradeProofPanel manualOutcome={proofFlow.outcome!} executionQuantity={contracts} modelConfig={session.aiSettings} dailyInstrument={instrument} tradePlan={getSelectedOutcomePlan('lunch').plan} onSaveTrade={handleProofSave} onCancel={() => setProofFlow({ active: false })} />}
              {lunchOutcome && <div className="text-[10px] p-2 bg-[var(--green)]/10 text-[var(--green)]">Outcome logged: {lunchOutcome.toUpperCase()}</div>}
              {lunchSaveStatus && <div className="text-[10px] p-2 bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20">{lunchSaveStatus}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
