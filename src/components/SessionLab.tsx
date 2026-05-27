import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { AnalysisResult, ProposedRule, SessionState, SetupCandidate, Trade } from '../types';
import { analyzeChart, preCheckChartInfo } from '../lib/gemini';
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
import { applyWorkflowSpeedMode, loadModelConfig, saveModelConfig, type ModelConfig } from '../lib/modelRouter';
import { computeRiskSizing, formatDollars } from '../lib/riskSizing';
import { candidateHasConcretePlan, selectBestTwoScenarios } from '../lib/scenarioSelection';
import {
  buildNinjaChartContext,
  describeNinjaBridgeError,
  getNinjaBridgeAccounts,
  getNinjaBridgeBars,
  getNinjaBridgeHealth,
  getNinjaBridgePositions,
  getNinjaBridgeSnapshot,
  type NinjaBridgeBar,
  type NinjaBridgeHealth,
  type NinjaBridgePosition,
  type NinjaBridgeSnapshot,
} from '../lib/ninjaTraderBridge';
import {
  fetchMarketBarsFromCache,
  upsertMarketBarsToCache,
  type MarketBarTimeframe,
} from '../lib/marketDataStore';

type SessionPasteTarget = 'morning_eth_context' | 'morning_5m_execution' | 'lunch_5m_execution' | null;
type SessionOutcome = 'win' | 'loss' | 'scratch' | 'no_trade' | 'missed_trade';
type OutcomePlanChoice = 'main' | `candidate:${number}`;
type UploadedImage = UploadedWorkflowImage;
type WorkflowStepTone = 'pending' | 'ready' | 'active' | 'complete' | 'blocked';

interface WorkflowStep {
  label: string;
  value: string;
  tone: WorkflowStepTone;
}

interface NinjaBridgeState {
  connected: boolean;
  loading: boolean;
  health: NinjaBridgeHealth | null;
  accounts: string[];
  snapshot: NinjaBridgeSnapshot | null;
  bars5m: NinjaBridgeBar[];
  bars15m: NinjaBridgeBar[];
  bars60m: NinjaBridgeBar[];
  bars240m: NinjaBridgeBar[];
  positions: NinjaBridgePosition[];
  marketDataSource: 'market_bars' | 'bridge_fallback' | 'mixed' | 'none';
  marketDataMessage: string | null;
  updatedAt: string | null;
  error: string | null;
}

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

const WORKFLOW_STEP_TONE_CLASSES: Record<WorkflowStepTone, string> = {
  pending: 'border-[var(--b2)] bg-[var(--bg)] text-[var(--txt3)]',
  ready: 'border-[var(--orange)]/30 bg-[var(--orange)]/10 text-[var(--orange)]',
  active: 'border-[var(--blue)]/30 bg-[var(--blue)]/10 text-[var(--blue)]',
  complete: 'border-[var(--green)]/30 bg-[var(--green)]/10 text-[var(--green)]',
  blocked: 'border-[var(--red)]/30 bg-[var(--red)]/10 text-[var(--red)]',
};

function SessionChip({ label, value, tone = 'pending' }: { label: string; value?: string; tone?: WorkflowStepTone }) {
  return (
    <span className={cn('inline-flex items-center gap-1 border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em]', WORKFLOW_STEP_TONE_CLASSES[tone])}>
      <span className="text-[var(--txt3)]">{label}</span>
      {value && <span className="font-bold text-[var(--txt)]">{value}</span>}
    </span>
  );
}

function WorkflowStrip({ title, steps }: { title: string; steps: WorkflowStep[] }) {
  return (
    <div className="border border-[var(--b1)] bg-[var(--bg)] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--txt)]">{title}</div>
      </div>
      <div className="flex flex-wrap items-stretch gap-2">
        {steps.map((step, index) => (
          <React.Fragment key={step.label}>
            <div className={cn('min-w-[132px] flex-1 border px-2.5 py-2 font-mono', WORKFLOW_STEP_TONE_CLASSES[step.tone])}>
              <div className="text-[9px] uppercase tracking-[0.14em] opacity-80">{step.label}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em]">{step.value}</div>
            </div>
            {index < steps.length - 1 && (
              <div className="hidden items-center text-[var(--txt3)] lg:flex">-&gt;</div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function todayLocalDate(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function previousCalendarDate(tradeDate: string): string {
  const date = new Date(`${tradeDate}T12:00:00`);
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

function etDateTime(tradeDate: string, time: string): string {
  return `${tradeDate}T${time}:00`;
}

function barTimeKey(value: string): string {
  return value
    .replace(/Z$/, '')
    .replace(/[+-]\d{2}:\d{2}$/, '')
    .slice(0, 19);
}

function filterBarsByEtWindow(bars: NinjaBridgeBar[], from: string, to: string): NinjaBridgeBar[] {
  const start = barTimeKey(from);
  const end = barTimeKey(to);
  return bars.filter(bar => {
    const key = barTimeKey(bar.time);
    return key >= start && key <= end;
  });
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
  if (candidate.scenarioLabel) return candidate.scenarioLabel;
  return String(candidate.setupType || 'Setup').replace(/([a-z])([A-Z])/g, '$1 $2');
}

function candidateHasPlanLevels(candidate: SetupCandidate): boolean {
  return candidateHasConcretePlan(candidate);
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

function formatBridgePrice(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : 'N/A';
}

function summarizeBridgeBar(bar: NinjaBridgeBar | null | undefined): string {
  if (!bar) return 'No bar';
  return `${new Date(bar.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} O ${formatBridgePrice(bar.open)} H ${formatBridgePrice(bar.high)} L ${formatBridgePrice(bar.low)} C ${formatBridgePrice(bar.close)}`;
}

function mergeBridgeContextIntoAnalysis(
  analysis: AnalysisResult,
  bridgeContext: Partial<AnalysisResult['structuredChartContext']> | null,
  bridgeSummary: string
): AnalysisResult {
  if (!bridgeContext) return analysis;
  const existing = analysis.structuredChartContext || {};
  const ohlcAuthoritySummary = `${bridgeSummary} OHLC fields from NinjaTrader are factual and take precedence over AI visual extraction.`;
  return {
    ...analysis,
    reasoning: `${analysis.reasoning || ''}\n\n[NINJATRADER BRIDGE] ${ohlcAuthoritySummary}`.trim(),
    structuredChartContext: {
      ...existing,
      ...bridgeContext,
      keyLevels: {
        ...(existing.keyLevels || {}),
        ...(bridgeContext.keyLevels || {}),
      },
      extractedLevels: bridgeContext.extractedLevels || existing.extractedLevels,
      candles: bridgeContext.candles || existing.candles,
      swings: bridgeContext.swings || existing.swings,
      fvgZones: bridgeContext.fvgZones || existing.fvgZones,
      liquidityEvents: bridgeContext.liquidityEvents || existing.liquidityEvents,
      liquiditySweeps: bridgeContext.liquiditySweeps || existing.liquiditySweeps,
      reclaimEvents: bridgeContext.reclaimEvents || existing.reclaimEvents,
      failedBreakEvents: bridgeContext.failedBreakEvents || existing.failedBreakEvents,
      displacementCandles: bridgeContext.displacementCandles || existing.displacementCandles,
      setupReadyFacts: bridgeContext.setupReadyFacts || existing.setupReadyFacts,
      structuralLevels: bridgeContext.structuralLevels || existing.structuralLevels,
      sessionLevelContext: bridgeContext.sessionLevelContext || existing.sessionLevelContext,
      sessionStory: bridgeContext.sessionStory || existing.sessionStory,
      targetObjectives: bridgeContext.targetObjectives || existing.targetObjectives,
      marketStructure: bridgeContext.marketStructure || existing.marketStructure,
      candleFacts: bridgeContext.candleFacts || existing.candleFacts,
      marketContext: bridgeContext.marketContext || existing.marketContext,
      ocrText: bridgeContext.ocrText || existing.ocrText,
      extractionWarnings: bridgeContext.extractionWarnings || existing.extractionWarnings,
    },
    agentReports: [
      ...(analysis.agentReports || []),
      {
        agentName: 'NinjaTrader Bridge',
        findings: bridgeSummary,
        status: 'SUCCESS' as const,
      },
    ],
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
            Select the exact plan you actually traded before marking Win/Loss/Scratch. RAG will learn from this plan, not just the main card.
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
  const [modelConfig, setModelConfig] = useState<ModelConfig>(loadModelConfig());
  const [bridgeInstrument, setBridgeInstrument] = useState('MES 06-26');
  const [bridgeAccount, setBridgeAccount] = useState('Sim101');
  const [bridge, setBridge] = useState<NinjaBridgeState>({
    connected: false,
    loading: false,
    health: null,
    accounts: [],
    snapshot: null,
    bars5m: [],
    bars15m: [],
    bars60m: [],
    bars240m: [],
    positions: [],
    marketDataSource: 'none',
    marketDataMessage: null,
    updatedAt: null,
    error: null,
  });

  const normalizedMorningPlan = morningResult ? buildAppTradePlan(morningResult, { sessionType: 'morning', instrument }) : null;
  const normalizedLunchPlan = lunchResult ? buildAppTradePlan(lunchResult, { sessionType: 'lunch', instrument }) : null;
  const approvedRuleRefinements = buildRuleRefinementText(customRules);

  const updateProviderMode = (providerMode: ModelConfig['providerMode']) => {
    const nextConfig = { ...modelConfig, providerMode };
    setModelConfig(nextConfig);
    saveModelConfig(nextConfig);
  };

  const updateSpeedMode = (workflowSpeedMode: ModelConfig['workflowSpeedMode']) => {
    const nextConfig = applyWorkflowSpeedMode(modelConfig, workflowSpeedMode);
    setModelConfig(nextConfig);
    saveModelConfig(nextConfig);
  };

  const getOutcomePlanOptions = (plan: typeof normalizedMorningPlan) => {
    const candidates = selectBestTwoScenarios(plan?.setupCandidates || [])
      .filter(candidateHasPlanLevels);
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

  const buildBridgeAnalysisContext = (sessionType: 'morning' | 'lunch') => {
    if (!bridge.connected || !bridge.bars5m.length) return { structuredContext: null, summary: 'NinjaTrader bridge not connected.' };
    const executionWindow = sessionType === 'morning'
      ? { from: etDateTime(tradeDate, '09:30'), to: etDateTime(tradeDate, '11:15') }
      : { from: etDateTime(tradeDate, '11:50'), to: etDateTime(tradeDate, '13:00') };
    const executionBars5m = filterBarsByEtWindow(bridge.bars5m, executionWindow.from, executionWindow.to);
    const structuredContext = buildNinjaChartContext({
      bars5m: executionBars5m.length ? executionBars5m : bridge.bars5m,
      bars15m: bridge.bars15m,
      bars60m: bridge.bars60m,
      bars240m: bridge.bars240m,
      sessionType,
      instrument,
      tradeDate,
      midnightOpen: midnightOpen ? Number(midnightOpen) : null,
    });
    const latest5m = bridge.bars5m[bridge.bars5m.length - 1];
    const latest15m = bridge.bars15m[bridge.bars15m.length - 1];
    const latest60m = bridge.bars60m[bridge.bars60m.length - 1];
    const latest240m = bridge.bars240m[bridge.bars240m.length - 1];
    const summary = [
      `${bridgeInstrument} ${sessionType} OHLC loaded through ${bridge.marketDataSource === 'market_bars' ? 'Supabase market_bars cache' : bridge.marketDataSource === 'mixed' ? 'Supabase market_bars cache with bridge fallback' : 'NinjaTrader bridge fallback'}.`,
      `4H/1H/15M define context and liquidity targets; 5M remains execution authority.`,
      `${sessionType === 'morning' ? 'Morning' : 'Lunch / PM'} 5M execution window bars: ${(executionBars5m.length ? executionBars5m : bridge.bars5m).length}.`,
      `Latest 4H: ${summarizeBridgeBar(latest240m)}.`,
      `Latest 1H: ${summarizeBridgeBar(latest60m)}.`,
      `Latest 5M: ${summarizeBridgeBar(latest5m)}.`,
      `Latest 15M: ${summarizeBridgeBar(latest15m)}.`,
      `Snapshot: price ${formatBridgePrice(bridge.snapshot?.currentPrice)}, session H/L ${formatBridgePrice(bridge.snapshot?.sessionHigh)} / ${formatBridgePrice(bridge.snapshot?.sessionLow)}.`,
      `Selected account ${bridgeAccount}; positions ${bridge.positions.length}.`,
    ].join(' ');
    return { structuredContext, summary };
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

  const refreshNinjaBridge = useCallback(async () => {
    setBridge(current => ({ ...current, loading: true }));
    try {
      const health = await getNinjaBridgeHealth();
      const nextInstrument = bridgeInstrument || health.defaultInstrument || (instrument === 'MNQ' ? 'MNQ 06-26' : 'MES 06-26');
      if (!bridgeInstrument && health.defaultInstrument) setBridgeInstrument(health.defaultInstrument);
      const priorDate = previousCalendarDate(tradeDate);
      const contextFrom = etDateTime(priorDate, '18:00');
      const contextTo = etDateTime(tradeDate, '13:00');
      const executionFrom = etDateTime(tradeDate, '09:30');
      const executionTo = etDateTime(tradeDate, '13:00');
      const fetchBars = async (timeframe: MarketBarTimeframe, from: string, to: string, liveLimit: number) => {
        const cached = await fetchMarketBarsFromCache({ bridgeInstrument: nextInstrument, timeframe, from, to });
        if (cached.bars.length) return { bars: cached.bars, source: 'market_bars' as const, error: cached.error };
        const live = await getNinjaBridgeBars(nextInstrument, timeframe, liveLimit);
        const liveBars = live.bars || [];
        if (liveBars.length) {
          void upsertMarketBarsToCache({
            instrument,
            bridgeInstrument: nextInstrument,
            timeframe,
            bars: liveBars,
            metadata: { workflow: 'session_lab_live_fallback' },
          });
        }
        return { bars: liveBars, source: 'bridge_fallback' as const, error: cached.error || live.error };
      };

      const [accounts, snapshot, bars5m, bars15m, bars60m, bars240m, positions] = await Promise.all([
        getNinjaBridgeAccounts(),
        getNinjaBridgeSnapshot(nextInstrument),
        fetchBars('5m', executionFrom, executionTo, 120),
        fetchBars('15m', contextFrom, contextTo, 120),
        fetchBars('60m', contextFrom, contextTo, 120),
        fetchBars('240m', contextFrom, contextTo, 120),
        getNinjaBridgePositions(bridgeAccount),
      ]);
      if (accounts.accounts?.length && !accounts.accounts.includes(bridgeAccount)) {
        setBridgeAccount(accounts.preferred?.find(account => accounts.accounts.includes(account)) || accounts.accounts[0]);
      }
      const barSources = [bars5m.source, bars15m.source, bars60m.source, bars240m.source];
      const marketDataSource = barSources.every(source => source === 'market_bars')
        ? 'market_bars'
        : barSources.some(source => source === 'market_bars')
          ? 'mixed'
          : 'bridge_fallback';
      setBridge({
        connected: true,
        loading: false,
        health,
        accounts: accounts.accounts || [],
        snapshot,
        bars5m: bars5m.bars,
        bars15m: bars15m.bars,
        bars60m: bars60m.bars,
        bars240m: bars240m.bars,
        positions: positions.positions || [],
        marketDataSource,
        marketDataMessage: `market_bars ${bars5m.bars.length}/${bars15m.bars.length}/${bars60m.bars.length}/${bars240m.bars.length} bars for 5M/15M/1H/4H. ${marketDataSource === 'bridge_fallback' ? 'Cache empty; using bridge fallback and repairing cache.' : 'Cache is feeding the analysis workflow.'}`,
        updatedAt: new Date().toISOString(),
        error: null,
      });
    } catch (error) {
      setBridge(current => ({
        ...current,
        connected: false,
        loading: false,
        marketDataSource: 'none',
        error: describeNinjaBridgeError(error),
        updatedAt: new Date().toISOString(),
      }));
    }
  }, [bridgeAccount, bridgeInstrument, instrument, tradeDate]);

  useEffect(() => {
    if (!isActive) return;
    void refreshNinjaBridge();
    const timer = window.setInterval(() => void refreshNinjaBridge(), 30_000);
    return () => window.clearInterval(timer);
  }, [isActive, refreshNinjaBridge]);

  const readinessItems = [
    { label: 'Trading Date', value: tradeDate, ready: Boolean(tradeDate) },
    { label: 'Instrument', value: instrument, ready: true },
    { label: 'Contracts', value: String(contracts), ready: contracts > 0 },
    { label: 'Midnight Open', value: midnightOpen ? 'SET' : 'OPTIONAL', ready: Boolean(midnightOpen) },
    { label: 'Morning 15M', value: morningEthImg ? 'ATTACHED' : 'OPTIONAL', ready: Boolean(morningEthImg) },
    { label: 'Morning 5M', value: morningExecImg || morningResult ? 'READY' : 'REQUIRED', ready: Boolean(morningExecImg || morningResult) },
    { label: 'Lunch / PM 5M', value: lunchExecImg || lunchResult ? 'READY' : 'OPTIONAL', ready: Boolean(lunchExecImg || lunchResult) },
    { label: 'NinjaTrader', value: bridge.connected ? 'CONNECTED' : 'OPTIONAL', ready: bridge.connected },
    { label: 'RAG Save', value: morningSaveStatus || lunchSaveStatus ? 'ACTIVE' : 'ON ANALYSIS', ready: true },
  ];

  const setStagedImage = (target: SessionPasteTarget, image: UploadedImage) => {
    if (target === 'morning_eth_context') setMorningEthImg(image);
    if (target === 'morning_5m_execution') setMorningExecImg(image);
    if (target === 'lunch_5m_execution') setLunchExecImg(image);
  };

  const handleGlobalClick = useCallback((event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest('.morning-eth-slot')) setActivePasteTarget('morning_eth_context');
    else if (target.closest('.morning-exec-slot')) setActivePasteTarget('morning_5m_execution');
    else if (target.closest('.lunch-exec-slot')) setActivePasteTarget('lunch_5m_execution');
    else if (target.closest('.morning-panel')) setActivePasteTarget('morning_5m_execution');
    else if (target.closest('.lunch-panel')) setActivePasteTarget('lunch_5m_execution');
    else setActivePasteTarget(null);
  }, []);

  const processImage = async (dataUrl: string, target: SessionPasteTarget) => {
    if (!target) return;
    setStagedImage(target, { dataUrl });

    try {
      const ocr = await preCheckChartInfo(dataUrl);
      if (ocr) {
        setStagedImage(target, { dataUrl, ocrResult: ocr });
      }
    } catch (error) {
      console.warn('[SessionLab] OCR precheck failed; screenshot remains staged for manual analysis.', error);
    }
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
      void processImage(imageData, target);
    }
  }, [activePasteTarget, morningExecImg, proofFlow.active]);

  useEffect(() => {
    if (!isActive) return;
    window.addEventListener('click', handleGlobalClick, { capture: true });
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('click', handleGlobalClick, { capture: true });
      window.removeEventListener('paste', handlePaste);
    };
  }, [handleGlobalClick, handlePaste, isActive]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, target: SessionPasteTarget) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) void processImage(evt.target.result as string, target);
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
    const planRiskSizing = computeRiskSizing({
      accountEquity: session.accountEquity,
      riskPercent: session.riskPercent,
      riskPoints: plan.riskPoints,
      contracts,
      instrument,
    });
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
        risk_sizing: planRiskSizing,
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
      accountEquity: session.accountEquity,
      riskPercent: session.riskPercent,
      riskBudgetDollars: planRiskSizing.riskBudgetDollars,
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

  const persistMorningAnalysis = async (analysis: AnalysisResult, execImage: UploadedImage, ethImage: UploadedImage | null) => {
    try {
      setMorningSaveStatus('Analysis ready. Saving Morning setup to Supabase + RAG in the background...');
      let execUrl = execImage.dataUrl;
      let ethUrl: string | null = ethImage?.dataUrl || null;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const execUpload = await uploadScreenshot(user.id, tradeDate, 'session_lab/morning', '5m_execution', execImage.dataUrl);
        execUrl = execUpload.url;
        setMorningExecImg(current => current?.dataUrl === execImage.dataUrl ? { ...current, storagePath: execUpload.storagePath } : current);
        if (ethImage) {
          const ethUpload = await uploadScreenshot(user.id, tradeDate, 'session_lab/morning', '15m_eth_context', ethImage.dataUrl);
          ethUrl = ethUpload.url;
          setMorningEthImg(current => current?.dataUrl === ethImage.dataUrl ? { ...current, storagePath: ethUpload.storagePath } : current);
        }
      }

      const save = await saveSetupAndRag('morning', analysis, execUrl, ethUrl);
      setMorningSetupId(save.setupId);
      setMorningSaveStatus(save.status);
    } catch (error: any) {
      setMorningSaveStatus(`Analysis displayed, but background save failed: ${error.message || 'Unknown save error.'}`);
    }
  };

  const persistLunchAnalysis = async (analysis: AnalysisResult, execImage: UploadedImage, ethContextUrl: string | null, morning5mContextUrl: string | null) => {
    try {
      setLunchSaveStatus('Analysis ready. Saving Lunch / PM setup to Supabase + RAG in the background...');
      let execUrl = execImage.dataUrl;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const execUpload = await uploadScreenshot(user.id, tradeDate, 'session_lab/lunch', '5m_execution', execImage.dataUrl);
        execUrl = execUpload.url;
        setLunchExecImg(current => current?.dataUrl === execImage.dataUrl ? { ...current, storagePath: execUpload.storagePath } : current);
      }

      const save = await saveSetupAndRag('lunch', analysis, execUrl, ethContextUrl, morning5mContextUrl);
      setLunchSetupId(save.setupId);
      setLunchSaveStatus(save.status);
    } catch (error: any) {
      setLunchSaveStatus(`Analysis displayed, but background save failed: ${error.message || 'Unknown save error.'}`);
    }
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
      const bridgeContext = buildBridgeAnalysisContext('morning');
      const payload = morningEthImg ? { exec: morningExecImg.dataUrl, eth: morningEthImg.dataUrl } : morningExecImg.dataUrl;
      const morningSettings = {
        ...(session.aiSettings || { temperature: 0 }),
        customInstructions: mergeCustomInstructions(session.aiSettings?.customInstructions, [
          approvedRuleRefinements,
          'THIS IS THE MORNING ANALYSIS SETUP. The 15M ETH image is context only. The 5M image is the execution chart. Final trade approval belongs to the app-owned plan engine and trade decision pipeline.',
          bridge.connected ? `NINJATRADER LIVE OHLC CONTEXT: ${bridgeContext.summary} Use this as structured market data support. Screenshots remain visual context; final approval still belongs to the app-owned pipeline.` : '',
        ]),
      };
      const rawAnalysis = await analyzeChart(payload, morningSettings, session.accountEquity, undefined, undefined, 'morning', undefined, midnightOpen || undefined, instrument, session.riskPercent) as AnalysisResult;
      const analysis = mergeBridgeContextIntoAnalysis(rawAnalysis, bridgeContext.structuredContext, bridgeContext.summary);

      setMorningResult(analysis);
      onUpdate({ analysisResult: analysis, morningScreenshot: morningExecImg.dataUrl, morningEthScreenshot: morningEthImg?.dataUrl, dayType: analysis.dayType });
      void persistMorningAnalysis(analysis, morningExecImg, morningEthImg);
    } catch (error: any) {
      setMorningError(error.message || 'Morning analysis failed.');
      setMorningSaveStatus(null);
    } finally {
      setIsAnalyzingMorning(false);
    }
  };

  const runLunchAnalysis = async () => {
    if (!lunchExecImg) {
      setLunchError('Required: 5M Lunch / PM Execution screenshot.');
      return;
    }
    setIsAnalyzingLunch(true);
    setLunchError(null);
    setLunchSaveStatus('Running Lunch / PM analysis...');

    try {
      const bridgeContext = buildBridgeAnalysisContext('lunch');
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
          'THIS IS THE LUNCH / PM REVIEW WORKFLOW. Treat Morning 15M ETH and Morning 5M images as context only. The Lunch / PM 5M image is the execution chart. Extract structured facts only; final trade approval belongs to the app-owned plan engine and trade decision pipeline.',
          bridge.connected ? `NINJATRADER LIVE OHLC CONTEXT: ${bridgeContext.summary} Use this as structured market data support. Morning context can help frame Lunch / PM review, but Lunch / PM 5M remains execution authority. Final approval still belongs to the app-owned pipeline.` : '',
        ]),
      };
      const rawAnalysis = await analyzeChart(payload, lunchSettings, session.accountEquity, previousAnalysis, undefined, 'lunch', undefined, midnightOpen || (morningResult || session.analysisResult)?.midnightOpenPrice?.toString(), instrument, session.riskPercent) as AnalysisResult;
      const analysis = mergeBridgeContextIntoAnalysis(rawAnalysis, bridgeContext.structuredContext, bridgeContext.summary);

      setLunchResult(analysis);
      onUpdate({ lunchAnalysisResult: analysis, lunchScreenshot: lunchExecImg.dataUrl });
      void persistLunchAnalysis(
        analysis,
        lunchExecImg,
        morningEthImg?.dataUrl || session.morningEthScreenshot || null,
        morningExecImg?.dataUrl || session.morningScreenshot || null
      );
    } catch (error: any) {
      setLunchError(error.message || 'Lunch / PM analysis failed.');
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
    if (!setupId) {
      setError('The analysis is still saving in the background. Wait for the Supabase + RAG saved message before marking the outcome.');
      return;
    }

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
        const selectedRiskSizing = computeRiskSizing({
          accountEquity: session.accountEquity,
          riskPercent: session.riskPercent,
          riskPoints: actualPlan?.riskPoints,
          contracts,
          instrument,
        });
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
          accountEquity: session.accountEquity,
          riskPercent: session.riskPercent,
          riskBudgetDollars: selectedRiskSizing.riskBudgetDollars,
          planSource: selectedCandidate ? 'user_selected_setup_candidate' : actualPlan?.source,
          whyThisPlan: actualPlan?.whyThisPlan,
          invalidation: actualPlan?.invalidation,
          notes: `Trade Taken: ${tradeTaken ? 'yes' : 'no'}\nOutcome plan: ${selectedOutcomePlan.label}\nRisk sizing: ${selectedRiskSizing.summary}\n${selectedCandidate ? 'User selected a conditional/setup-scan candidate instead of the main plan.' : 'User selected the main app plan.'}`,
          trade_plan_json: {
            selected_outcome_plan_key: selectedOutcomePlan.key,
            selected_outcome_plan_label: selectedOutcomePlan.label,
            selected_outcome_candidate: selectedCandidate,
            selected_outcome_plan: actualPlan,
            selected_outcome_risk_sizing: selectedRiskSizing,
            account_equity: session.accountEquity,
            risk_percent: session.riskPercent,
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

  const morningReadyToAnalyze = Boolean(morningExecImg) && !morningResult;
  const lunchReadyToAnalyze = Boolean(lunchExecImg) && !lunchResult;
  const morningStatus = morningResult ? 'Result ready' : morningReadyToAnalyze ? 'Ready to analyze' : 'Waiting for 5M screenshot';
  const lunchStatus = lunchResult ? 'Result ready' : lunchReadyToAnalyze ? 'Ready to analyze' : 'Waiting for Lunch / PM 5M screenshot';
  const journalStatusFor = (result: AnalysisResult | null, saveStatus: string | null): WorkflowStep => {
    if (!result) return { label: 'Journal/RAG', value: 'Not started', tone: 'pending' };
    if (saveStatus?.startsWith('Running')) return { label: 'Journal/RAG', value: 'Pending', tone: 'active' };
    if (saveStatus?.startsWith('Saved to Supabase + RAG')) return { label: 'Journal/RAG', value: 'Saved', tone: 'complete' };
    if (saveStatus?.includes('failed') || saveStatus?.includes('Login required')) return { label: 'Journal/RAG', value: 'Pending', tone: 'ready' };
    return { label: 'Journal/RAG', value: 'Pending', tone: 'ready' };
  };
  const outcomeStatusFor = (sessionType: 'morning' | 'lunch', result: AnalysisResult | null, outcome: SessionOutcome | null): WorkflowStep => {
    if (!result) return { label: 'Outcome/Proof', value: 'Not started', tone: 'pending' };
    if (proofFlow.active && proofFlow.sessionType === sessionType) return { label: 'Outcome/Proof', value: 'Proof pending', tone: 'active' };
    if (outcome) return { label: 'Outcome/Proof', value: 'Complete', tone: 'complete' };
    return { label: 'Outcome/Proof', value: 'Outcome pending', tone: 'ready' };
  };
  const workflowStepsFor = (sessionType: 'morning' | 'lunch'): WorkflowStep[] => {
    const isMorning = sessionType === 'morning';
    const executionImage = isMorning ? morningExecImg : lunchExecImg;
    const result = isMorning ? morningResult : lunchResult;
    const isAnalyzing = isMorning ? isAnalyzingMorning : isAnalyzingLunch;
    const outcome = isMorning ? morningOutcome : lunchOutcome;
    const saveStatus = isMorning ? morningSaveStatus : lunchSaveStatus;
    const staged = Boolean(executionImage || result);

    return [
      {
        label: 'Screenshot staged',
        value: staged ? 'Staged' : 'Awaiting screenshot',
        tone: staged ? 'complete' : 'pending',
      },
      {
        label: 'Analyze',
        value: result ? 'Complete' : isAnalyzing ? 'Analysis running' : staged ? 'Ready to analyze' : 'Blocked',
        tone: result ? 'complete' : isAnalyzing ? 'active' : staged ? 'ready' : 'blocked',
      },
      {
        label: 'Decision',
        value: result ? 'Decision ready' : isAnalyzing ? 'Analysis running' : 'Awaiting decision',
        tone: result ? 'complete' : isAnalyzing ? 'active' : 'pending',
      },
      outcomeStatusFor(sessionType, result, outcome),
      journalStatusFor(result, saveStatus),
    ];
  };
  const morningWorkflowSteps = workflowStepsFor('morning');
  const lunchWorkflowSteps = workflowStepsFor('lunch');
  const morningRequirements = [
    { label: '15M ETH context', value: morningEthImg ? 'Attached' : 'Optional context only', ready: Boolean(morningEthImg) },
    { label: '5M execution chart', value: morningExecImg ? 'Preview staged' : 'Required before analysis', ready: Boolean(morningExecImg) },
    { label: 'Analysis', value: morningResult ? 'Complete' : 'Waiting for explicit Analyze click.', ready: Boolean(morningResult) },
  ];
  const lunchRequirements = [
    { label: 'Morning context', value: morningResult || session.analysisResult ? 'Available' : 'Optional; Lunch / PM can run without it', ready: Boolean(morningResult || session.analysisResult) },
    { label: 'Lunch / PM 5M execution chart', value: lunchExecImg ? 'Preview staged' : 'Required before analysis', ready: Boolean(lunchExecImg) },
    { label: 'Analysis', value: lunchResult ? 'Complete' : 'Waiting for explicit Analyze click.', ready: Boolean(lunchResult) },
  ];

  return (
    <div className="flex flex-col h-full fade-in">
      <div className="flex items-center gap-4 mb-6 sticky top-0 bg-[var(--bg)]/90 backdrop-blur z-10 py-4 border-b border-[var(--b2)]">
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight text-[var(--txt)]">TRADING WORKFLOW</h1>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--txt3)]">
            Screenshot-driven review. Nothing runs until an explicit Analyze button is clicked.
          </div>
        </div>
        <span className="qd-badge">DECISION SUPPORT ONLY</span>
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
            Trading Workflow defaults to today's browser date. Uploading or pasting screenshots only stages them. Analysis runs only when you click the explicit Morning or Lunch / PM analysis button.
          </p>
        </div>
      </div>

      <div className="card-base p-4 mb-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <SessionChip label="Morning / AM" tone={morningResult ? 'complete' : morningReadyToAnalyze ? 'ready' : 'pending'} />
          <SessionChip label="Lunch / PM Review" tone={lunchResult ? 'complete' : lunchReadyToAnalyze ? 'ready' : 'pending'} />
          <SessionChip label="Trade Date:" value={tradeDate} />
          <SessionChip label="Instrument:" value={instrument} />
          <SessionChip label="Bridge:" value={bridge.connected ? 'Connected' : 'Disconnected'} tone={bridge.connected ? 'complete' : 'ready'} />
          <SessionChip label="OHLC:" value={bridge.bars5m.length ? 'Available' : 'Unavailable'} tone={bridge.bars5m.length ? 'complete' : 'ready'} />
        </div>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <WorkflowStrip title="Morning / AM" steps={morningWorkflowSteps} />
          <WorkflowStrip title="Lunch / PM Review" steps={lunchWorkflowSteps} />
        </div>
      </div>

      <div className="card-base p-4 mb-6 font-mono">
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--txt)]">Data / Model Status</div>
            <div className="mt-1 text-[10px] text-[var(--txt3)]">
              Live review stays focused on screenshot staging, analysis, decision, and outcome. Advanced controls are available below when needed.
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('qd-badge', bridge.connected ? 'border-[var(--green)]/30 text-[var(--green)]' : 'border-[var(--orange)]/30 text-[var(--orange)]')}>
              {bridge.connected ? 'Connected' : 'Disconnected'}
            </span>
            <span className="qd-badge opacity-80">{bridgeInstrument}</span>
            <span className={cn('qd-badge', bridge.bars5m.length ? 'border-[var(--green)]/30 text-[var(--green)]' : 'border-[var(--orange)]/30 text-[var(--orange)]')}>
              {bridge.bars5m.length ? 'OHLC available' : 'OHLC unavailable'}
            </span>
            <span className="qd-badge opacity-80">{modelConfig.workflowSpeedMode}</span>
            <button type="button" onClick={() => void refreshNinjaBridge()} className="qd-btn-ghost px-3 py-1 text-[10px]" disabled={bridge.loading}>
              {bridge.loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        <details className="border border-[var(--b1)] bg-[var(--bg)] p-3">
          <summary className="cursor-pointer select-none text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--txt)]">
            Advanced data/model controls
          </summary>
          <div className="mt-2 text-[10px] text-[var(--txt3)]">
            Bridge, provider, cache, and diagnostic controls for troubleshooting. Leave collapsed during normal live review.
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-4">
            <div className="border border-[var(--b2)] bg-[var(--bg)] p-3">
              <label className="text-[9px] uppercase tracking-[0.16em] text-[var(--txt3)]">Bridge Instrument</label>
              <input
                value={bridgeInstrument}
                onChange={event => setBridgeInstrument(event.target.value)}
                onBlur={() => void refreshNinjaBridge()}
                className="mt-2 w-full border border-[var(--b2)] bg-[var(--s1)] p-2 text-[11px] text-[var(--txt)]"
                placeholder="MES 06-26"
              />
            </div>
            <div className="border border-[var(--b2)] bg-[var(--bg)] p-3">
              <label className="text-[9px] uppercase tracking-[0.16em] text-[var(--txt3)]">Account</label>
              <select
                value={bridgeAccount}
                onChange={event => setBridgeAccount(event.target.value)}
                className="mt-2 w-full border border-[var(--b2)] bg-[var(--s1)] p-2 text-[11px] text-[var(--txt)]"
              >
                {(bridge.accounts.length ? bridge.accounts : ['Sim101', '206257']).map(account => <option key={account} value={account}>{account}</option>)}
              </select>
            </div>
            <div className="border border-[var(--b2)] bg-[var(--bg)] p-3">
              <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--txt3)]">Latest 5M Candle</div>
              <div className="mt-2 text-[10px] text-[var(--txt)]">{summarizeBridgeBar(bridge.bars5m[bridge.bars5m.length - 1])}</div>
              <div className="mt-1 text-[9px] text-[var(--txt3)]">{bridge.bars5m.length} cached bars</div>
            </div>
            <div className="border border-[var(--b2)] bg-[var(--bg)] p-3">
              <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--txt3)]">Latest 15M Candle</div>
              <div className="mt-2 text-[10px] text-[var(--txt)]">{summarizeBridgeBar(bridge.bars15m[bridge.bars15m.length - 1])}</div>
              <div className="mt-1 text-[9px] text-[var(--txt3)]">{bridge.bars15m.length} cached bars</div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 text-[10px] md:grid-cols-5">
            <div className="border border-[var(--b1)] bg-[var(--s1)] p-2">
              <span className="text-[var(--txt3)]">4H Macro: </span>
              <span className="text-[var(--txt)]">{bridge.bars240m.length ? `${bridge.bars240m.length} bars` : 'N/A'}</span>
            </div>
            <div className="border border-[var(--b1)] bg-[var(--s1)] p-2">
              <span className="text-[var(--txt3)]">1H Session: </span>
              <span className="text-[var(--txt)]">{bridge.bars60m.length ? `${bridge.bars60m.length} bars` : 'N/A'}</span>
            </div>
            <div className="border border-[var(--b1)] bg-[var(--s1)] p-2">
              <span className="text-[var(--txt3)]">NinjaTrader: </span>
              <span className="text-[var(--txt)]">{bridge.health?.ninjaTraderVersion || 'N/A'}</span>
            </div>
            <div className="border border-[var(--b1)] bg-[var(--s1)] p-2">
              <span className="text-[var(--txt3)]">Market Store: </span>
              <span className="text-[var(--txt)]">
                {bridge.marketDataSource === 'market_bars' ? 'market_bars cache' : bridge.marketDataSource === 'mixed' ? 'cache + bridge' : bridge.marketDataSource === 'bridge_fallback' ? 'bridge fallback' : 'N/A'}
              </span>
            </div>
            <div className="border border-[var(--b1)] bg-[var(--s1)] p-2">
              <span className="text-[var(--txt3)]">Current / H / L: </span>
              <span className="text-[var(--txt)]">{formatBridgePrice(bridge.snapshot?.currentPrice)} / {formatBridgePrice(bridge.snapshot?.sessionHigh)} / {formatBridgePrice(bridge.snapshot?.sessionLow)}</span>
            </div>
            <div className="border border-[var(--b1)] bg-[var(--s1)] p-2">
              <span className="text-[var(--txt3)]">Positions: </span>
              <span className="text-[var(--txt)]">{bridge.positions.length ? bridge.positions.map(position => `${position.instrument} ${position.marketPosition} ${position.quantity}`).join(', ') : 'Flat / none returned'}</span>
            </div>
          </div>

          {bridge.marketDataMessage && (
            <div className="mt-3 border border-[var(--green)]/20 bg-[var(--green)]/5 p-2 text-[10px] text-[var(--txt2)]">
              Data path: NinjaTrader Bridge to market_bars Supabase cache to session structure / targets to setup scanner to ranking to trade decision pipeline to UI / Discord / RAG. {bridge.marketDataMessage}
            </div>
          )}

          {bridge.error && (
            <div className="mt-3 border border-[var(--orange)]/30 bg-[var(--orange)]/10 p-2 text-[10px] text-[var(--orange)]">
              Bridge unavailable: {bridge.error}. Open NinjaTrader and keep the AddOn compiled/running, or continue with screenshot-only analysis.
            </div>
          )}

          <div className="mt-3 border border-[var(--b1)] bg-[var(--bg)] p-3 font-mono">
            <div className="mb-3">
              <div className="mb-2 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--txt3)]">Workflow Speed</div>
                  <div className="text-[10px] text-[var(--txt2)]">Fast for live trading. Audit for slower cross-checks and replay review.</div>
                </div>
                <span className="qd-badge">{modelConfig.workflowSpeedMode}</span>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                {[
                  { value: 'fast', label: 'Fast', note: 'Gemini Flash first. OpenAI fallback if Gemini times out.' },
                  { value: 'balanced', label: 'Balanced', note: 'Gemini Flash with OpenAI fallback.' },
                  { value: 'audit', label: 'Audit', note: 'Gemini Pro + OpenAI validation.' },
                ].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateSpeedMode(option.value as ModelConfig['workflowSpeedMode'])}
                    className={cn(
                      'border px-3 py-2 text-left transition-colors',
                      modelConfig.workflowSpeedMode === option.value
                        ? 'border-[var(--orange)] bg-[var(--orange)]/10 text-[var(--orange)]'
                        : 'border-[var(--b2)] bg-transparent text-[var(--txt2)] hover:border-[var(--txt2)] hover:text-[var(--txt)]'
                    )}
                  >
                    <span className="block text-[10px] font-bold uppercase tracking-[0.12em]">{option.label}</span>
                    <span className="block text-[9px] text-[var(--txt3)]">{option.note}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-2 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-[9px] uppercase tracking-[0.16em] text-[var(--txt3)]">Extraction Provider</div>
                <div className="text-[10px] text-[var(--txt2)]">Advanced data/model control. Leave unchanged during live review unless troubleshooting.</div>
              </div>
              <span className="qd-badge">{modelConfig.providerMode.replace(/_/g, ' ')}</span>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {[
                { value: 'gemini_only', label: 'Gemini Only', note: 'Primary extractor only.' },
                { value: 'gemini_openai_validation', label: 'Gemini + OpenAI Validation', note: 'OpenAI cross-checks levels.' },
                { value: 'openai_fallback', label: 'OpenAI Fallback', note: 'Facts-only fallback if Gemini fails.' },
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateProviderMode(option.value as ModelConfig['providerMode'])}
                  className={cn(
                    'border px-3 py-2 text-left transition-colors',
                    modelConfig.providerMode === option.value
                      ? 'border-[var(--orange)] bg-[var(--orange)]/10 text-[var(--orange)]'
                      : 'border-[var(--b2)] bg-transparent text-[var(--txt2)] hover:border-[var(--txt2)] hover:text-[var(--txt)]'
                  )}
                >
                  <span className="block text-[10px] font-bold uppercase tracking-[0.12em]">{option.label}</span>
                  <span className="block text-[9px] text-[var(--txt3)]">{option.note}</span>
                </button>
              ))}
            </div>
          </div>
        </details>
      </div>

      <div className="card-base p-4 mb-6">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--txt3)]">Session Readiness</div>
            <div className="text-[12px] text-[var(--txt2)] mt-1">Morning and Lunch / PM are separate workflows with separate screenshots, analysis state, proof flow, and RAG records.</div>
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
          <div className="flex flex-col gap-3 border-b border-[var(--b2)] pb-3">
            <div className="flex justify-between items-start gap-3">
              <div>
                <h2 className="text-[14px] font-mono font-bold text-[var(--txt)]">MORNING REVIEW</h2>
                <div className="mt-1 text-[10px] text-[var(--txt3)]">
                  AM workflow only. 15M ETH is context; 5M is the execution chart.
                </div>
              </div>
              <span className={cn('qd-badge', morningReadyToAnalyze || morningResult ? 'border-[var(--green)]/30 text-[var(--green)]' : 'border-[var(--orange)]/30 text-[var(--orange)]')}>
                {morningStatus}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <TimezoneToggle selectedTimezone={morningTimezone} onChange={setMorningTimezone} />
              <WorkflowResetButton onClick={resetMorning}>Reset Morning</WorkflowResetButton>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              {morningRequirements.map(item => (
                <div key={item.label} className={cn('border p-2 font-mono', item.ready ? 'border-[var(--green)]/25 bg-[var(--green)]/5' : 'border-[var(--orange)]/25 bg-[var(--orange)]/5')}>
                  <div className="text-[9px] uppercase tracking-[0.14em] text-[var(--txt3)]">{item.label}</div>
                  <div className={cn('mt-1 text-[10px] font-bold', item.ready ? 'text-[var(--green)]' : 'text-[var(--orange)]')}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {!morningResult && (
            <>
              <ScreenshotUploadPanel target="morning_eth_context" label="15m ETH Context" img={morningEthImg} onUpload={handleFileUpload} onClear={() => setMorningEthImg(null)} onActivate={setActivePasteTarget} hintText={`Context only. Paste/upload range: ${formatReplayRange('morning_eth_context', morningTimezone)}`} />
              <ScreenshotUploadPanel target="morning_5m_execution" label="5m Morning Execution" img={morningExecImg} onUpload={handleFileUpload} onClear={() => setMorningExecImg(null)} onActivate={setActivePasteTarget} isRequired hintText={`Required execution chart. Paste/upload range: ${formatReplayRange('morning_5m_execution', morningTimezone)}`} />
              <div className="border border-[var(--b2)] bg-[var(--bg)] p-2 text-[10px] text-[var(--txt2)]">
                Preview must be visible above before analysis. Pasting or uploading only stages the screenshot; it does not start the analyzer.
              </div>
              {morningError && <div className="text-[var(--red)] text-[10px] bg-[var(--red)]/10 p-2">{morningError}</div>}
              {morningSaveStatus && <div className="text-[var(--green)] text-[10px] bg-[var(--green)]/10 p-2 border border-[var(--green)]/20">{morningSaveStatus}</div>}
              <button onClick={runMorningAnalysis} disabled={isAnalyzingMorning} className="qd-btn-primary mt-2 flex justify-center py-3">
                {isAnalyzingMorning ? 'Analyzing Morning 5M...' : 'Analyze Morning 5M'}
              </button>
            </>
          )}

          {morningResult && (
            <div className="flex flex-col gap-4 font-mono">
              <div className="bg-[var(--bg)] p-4 border border-[var(--b2)] text-[12px]">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-[10px] text-[var(--txt2)] font-bold">Morning Result</h3>
                  <span className="qd-badge border-[var(--green)]/30 text-[var(--green)]">AM only</span>
                </div>
                <div className="mb-3 grid gap-2 md:grid-cols-3">
                  <div className="border border-[var(--b1)] bg-[var(--s1)] p-2">
                    <div className="text-[9px] uppercase tracking-[0.14em] text-[var(--txt3)]">Bias / Read</div>
                    <div className="mt-1 text-[11px] font-bold text-[var(--green)]">{morningResult.dayType || 'Pending'}</div>
                  </div>
                  <div className="border border-[var(--b1)] bg-[var(--s1)] p-2">
                    <div className="text-[9px] uppercase tracking-[0.14em] text-[var(--txt3)]">Setup / Model</div>
                    <div className="mt-1 text-[11px] font-bold text-[var(--txt)]">{normalizedMorningPlan?.setupName || 'No executable setup'}</div>
                  </div>
                  <div className="border border-[var(--b1)] bg-[var(--s1)] p-2">
                    <div className="text-[9px] uppercase tracking-[0.14em] text-[var(--txt3)]">Decision</div>
                    <div className={cn('mt-1 text-[11px] font-bold', normalizedMorningPlan?.canExecute ? 'text-[var(--green)]' : 'text-[var(--orange)]')}>
                      {normalizedMorningPlan?.decisionLabel || normalizedMorningPlan?.decision || 'Wait / No Trade'}
                    </div>
                  </div>
                </div>
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
                    accountEquity={session.accountEquity}
                    riskPercent={session.riskPercent}
                    contracts={contracts}
                    instrument={instrument}
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
          <div className="flex flex-col gap-3 border-b border-[var(--b2)] pb-3">
            <div className="flex justify-between items-start gap-3">
              <div>
                <h2 className="text-[14px] font-mono font-bold text-[var(--txt)]">LUNCH / PM REVIEW</h2>
                <div className="mt-1 text-[10px] text-[var(--txt3)]">
                  Lunch / PM workflow. Morning context can frame the read; Lunch / PM 5M remains execution authority.
                </div>
              </div>
              <span className={cn('qd-badge', lunchReadyToAnalyze || lunchResult ? 'border-[var(--green)]/30 text-[var(--green)]' : 'border-[var(--orange)]/30 text-[var(--orange)]')}>
                {lunchStatus}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <TimezoneToggle selectedTimezone={lunchTimezone} onChange={setLunchTimezone} />
              <WorkflowResetButton onClick={resetLunch}>Reset Lunch / PM</WorkflowResetButton>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              {lunchRequirements.map(item => (
                <div key={item.label} className={cn('border p-2 font-mono', item.ready ? 'border-[var(--green)]/25 bg-[var(--green)]/5' : 'border-[var(--orange)]/25 bg-[var(--orange)]/5')}>
                  <div className="text-[9px] uppercase tracking-[0.14em] text-[var(--txt3)]">{item.label}</div>
                  <div className={cn('mt-1 text-[10px] font-bold', item.ready ? 'text-[var(--green)]' : 'text-[var(--orange)]')}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {!lunchResult && (
            <>
              <ScreenshotUploadPanel target="lunch_5m_execution" label="5M Lunch / PM Execution" img={lunchExecImg} onUpload={handleFileUpload} onClear={() => setLunchExecImg(null)} onActivate={setActivePasteTarget} isRequired hintText={`Required execution chart. Paste/upload range: ${formatReplayRange('lunch_5m_execution', lunchTimezone)}`} />
              <div className="text-[10px] text-[var(--txt2)] border border-[var(--b2)] p-2">
                Lunch / PM uses Morning 15M ETH and Morning 5M context when available, but the Lunch / PM 5M chart remains the execution chart.
              </div>
              <div className="border border-[var(--b2)] bg-[var(--bg)] p-2 text-[10px] text-[var(--txt2)]">
                Preview must be visible above before analysis. Upload/paste is staging only; Lunch / PM analysis starts only from this button.
              </div>
              {morningResult || session.analysisResult ? <div className="text-[10px] text-[var(--green)] bg-[var(--green)]/10 p-2">+ Morning context available for Lunch / PM review</div> : <div className="text-[10px] text-[var(--orange)] bg-[var(--orange)]/10 p-2">Morning context not available yet. Lunch / PM can still run from its own 5M chart.</div>}
              {lunchError && <div className="text-[var(--red)] text-[10px] bg-[var(--red)]/10 p-2">{lunchError}</div>}
              {lunchSaveStatus && <div className="text-[var(--green)] text-[10px] bg-[var(--green)]/10 p-2 border border-[var(--green)]/20">{lunchSaveStatus}</div>}
              <button onClick={runLunchAnalysis} disabled={isAnalyzingLunch} className="qd-btn-primary mt-2 flex justify-center py-3">
                {isAnalyzingLunch ? 'Analyzing Lunch / PM 5M...' : 'Analyze Lunch / PM 5M'}
              </button>
            </>
          )}

          {lunchResult && (
            <div className="flex flex-col gap-4 font-mono">
              <div className="bg-[var(--bg)] p-4 border border-[var(--b2)] text-[12px]">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-[10px] text-[var(--txt2)] font-bold">Lunch / PM Result</h3>
                  <span className="qd-badge border-[var(--orange)]/30 text-[var(--orange)]">Lunch / PM only</span>
                </div>
                <div className="mb-3 grid gap-2 md:grid-cols-3">
                  <div className="border border-[var(--b1)] bg-[var(--s1)] p-2">
                    <div className="text-[9px] uppercase tracking-[0.14em] text-[var(--txt3)]">Bias / Read</div>
                    <div className="mt-1 text-[11px] font-bold text-[var(--orange)]">{lunchResult.dayType || 'Pending'}</div>
                  </div>
                  <div className="border border-[var(--b1)] bg-[var(--s1)] p-2">
                    <div className="text-[9px] uppercase tracking-[0.14em] text-[var(--txt3)]">Setup / Model</div>
                    <div className="mt-1 text-[11px] font-bold text-[var(--txt)]">{normalizedLunchPlan?.setupName || 'No executable setup'}</div>
                  </div>
                  <div className="border border-[var(--b1)] bg-[var(--s1)] p-2">
                    <div className="text-[9px] uppercase tracking-[0.14em] text-[var(--txt3)]">Decision</div>
                    <div className={cn('mt-1 text-[11px] font-bold', normalizedLunchPlan?.canExecute ? 'text-[var(--green)]' : 'text-[var(--orange)]')}>
                      {normalizedLunchPlan?.decisionLabel || normalizedLunchPlan?.decision || 'Wait / No Trade'}
                    </div>
                  </div>
                </div>
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
                    accountEquity={session.accountEquity}
                    riskPercent={session.riskPercent}
                    contracts={contracts}
                    instrument={instrument}
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
