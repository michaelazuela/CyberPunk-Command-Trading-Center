import {
  AnalysisResult,
  BiasAssessment,
  BiasDirection,
  ChartContext,
  ExecutionStatus,
  FinalOpportunitySelection,
  FinalTradePlan,
  KeyLevels,
  NoTradeReason,
  RiskAssessment,
  RiskStatus,
  SetupCandidate,
  SetupAssessment,
  SetupType,
  TradeDecision,
  TradeDecisionStatus,
  TradeDecisionStep,
} from '../types';
import { DECISION_STEPS, DECISION_STEP_LABELS } from '../config/decisionSteps';
import { TRADE_RULES } from '../config/tradeRules';
import { getWindowStatus } from '../config/timeWindows';
import { rankSetupCandidate, scanSetupCandidates } from './setupScanner';
import { buildConditionalPlans } from './conditionalPlanBuilder';

export type PipelineSessionType = ChartContext['sessionType'];
type Direction = 'LONG' | 'SHORT' | 'NO TRADE';
type StepStatus = 'pass' | 'fail' | 'warning';
type Confidence = 'High' | 'Medium' | 'Low';

export interface TradeDecisionStepResult {
  step: TradeDecisionStep;
  label: string;
  status: StepStatus;
  required: boolean;
  message: string;
  noTradeReason?: NoTradeReason;
}

export interface TradeDecisionPipelineInput {
  result: AnalysisResult | null | undefined;
  sessionType: PipelineSessionType;
  instrument?: 'MES' | 'MNQ';
  tradeDate?: string;
  screenshotUsability?: ChartContext['screenshotUsability'];
  screenshotWarning?: string | null;
  windowStatusOverride?: ReturnType<typeof getWindowStatus>;
}

export interface TradeDecisionPipelineResult extends TradeDecision {
  auditTrail: TradeDecisionStepResult[];
  target1: number | null;
  target2: number | null;
}

interface CandidateInput {
  setupType: SetupType;
  setupName: string;
  direction: Direction;
  entry: number | null;
  stop: number | null;
  confidence: Confidence;
  reasoning: string;
  invalidation: string;
  entryTrigger: string | null;
  rank?: number | null;
  priorityScore?: number | null;
  noTradeReason?: NoTradeReason | null;
}

function parsePrice(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isValidPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function roundToTick(price: number): number {
  return Math.round(price / TRADE_RULES.targetModel.tickSize) * TRADE_RULES.targetModel.tickSize;
}

function confidenceFrom(value: unknown, fallback: Confidence = 'Low'): Confidence {
  if (value === 'High' || value === 'Medium' || value === 'Low') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'high') return 'High';
    if (lower === 'medium') return 'Medium';
    if (lower === 'low') return 'Low';
  }
  if (typeof value === 'number') {
    if (value >= 0.75) return 'High';
    if (value >= 0.45) return 'Medium';
  }
  return fallback;
}

function inferDirection(text: string): Direction {
  const upper = text.toUpperCase();
  if (upper.includes('SHORT') || upper.includes('BEARISH') || upper.includes('SELL')) return 'SHORT';
  if (upper.includes('LONG') || upper.includes('BULLISH') || upper.includes('BUY')) return 'LONG';
  return 'NO TRADE';
}

function inferBias(result: AnalysisResult | null | undefined): BiasDirection {
  const text = [
    result?.dayType,
    result?.reasoning,
    result?.current_rule_analysis?.summary,
    result?.current_rule_analysis?.setup_detected,
  ].filter(Boolean).join(' ').toUpperCase();
  if (text.includes('SHORT') || text.includes('BEARISH')) return BiasDirection.Bearish;
  if (text.includes('LONG') || text.includes('BULLISH')) return BiasDirection.Bullish;
  if (text.includes('NO TRADE')) return BiasDirection.NoBias;
  return BiasDirection.Neutral;
}

function setupFromText(...parts: Array<unknown>): SetupType {
  const text = parts.filter(Boolean).join(' ').toUpperCase();
  if (!text || text.includes('NO TRADE')) return SetupType.NoSetup;
  if (text.includes('LUNCH FAILED HIGH') || text.includes('MORNING HIGH FAILURE')) return SetupType.LunchFailedHighReversal;
  if (text.includes('LUNCH FAILED LOW') || text.includes('MORNING LOW FAILURE')) return SetupType.LunchFailedLowReversal;
  if (text.includes('LUNCH COMPRESSION') || text.includes('MIDDAY COMPRESSION')) return SetupType.LunchCompressionBreakout;
  if (text.includes('LUNCH FAILED CONTINUATION') || text.includes('CONTINUATION FAILURE')) return SetupType.LunchFailedContinuation;
  if (text.includes('LUNCH RANGE RECLAIM') || text.includes('RECLAIM MORNING RANGE')) return SetupType.LunchRangeReclaim;
  if (text.includes('MORNING FAILED HIGH') || text.includes('LIQUIDITY REJECTION')) return SetupType.MorningFailedHighLiquidityRejection;
  if (text.includes('MORNING RECLAIM') || text.includes('RECLAIM LONG')) return SetupType.MorningReclaimLong;
  if (text.includes('LIQUIDITY') || text.includes('SWEEP') || text.includes('HUNT') || text.includes('RECLAIM')) return SetupType.LiquiditySweep;
  if (text.includes('MOMENTUM') || text.includes('RUNAWAY') || text.includes('BREATHER') || text.includes('STAIRCASE')) return SetupType.MomentumRunaway;
  if (text.includes('FVG') || text.includes('FAIR VALUE') || text.includes('IMBALANCE')) return SetupType.FairValueGap;
  if (text.includes('MSS') || text.includes('CHOCH') || text.includes('STRUCTURE SHIFT')) return SetupType.MarketStructureShift;
  if (text.includes('INITIAL BALANCE') || text.includes('IB EXTENSION') || text.includes('IB HIGH') || text.includes('IB LOW')) return SetupType.InitialBalanceExtension;
  if (text.includes('OPENING ORDER BLOCK') || text.includes('CONFIRMATION BAR')) return SetupType.OpeningOrderBlock;
  if (text.includes('61.8') || text.includes('GOLDEN') || text.includes('ORDER BLOCK')) return SetupType.OrderBlock618;
  if (text.includes('EQUAL HIGH') || text.includes('EQUAL LOW') || text.includes('EQH') || text.includes('EQL')) return SetupType.EqualHighsLows;
  if (text.includes('PDH') || text.includes('PDL') || text.includes('PREVIOUS DAY')) return SetupType.PreviousDaySweep;
  if (text.includes('COMPRESSION') || text.includes('COIL') || text.includes('SPRING')) return SetupType.CompressionBreakout;
  if (text.includes('GAP FILL') || text.includes('OPENING GAP')) return SetupType.OpeningGapFill;
  if (text.includes('BREAKER')) return SetupType.BreakerBlock;
  if (text.includes('MITIGATION')) return SetupType.MitigationBlock;
  if (text.includes('KILL ZONE') || text.includes('ALGO')) return SetupType.AlgoKillZone;
  return SetupType.NoSetup;
}

function buildKeyLevels(result: AnalysisResult | null | undefined): KeyLevels {
  const structured = result?.structuredChartContext?.keyLevels || {};
  return {
    ...structured,
    currentPrice: structured.currentPrice ?? parsePrice(result?.sessionLog?.key_structural_level),
    midnightOpen: structured.midnightOpen ?? result?.midnightOpenPrice ?? result?.midnightAnalysis?.level ?? null,
    rthOpen: structured.rthOpen ?? null,
    initialBalanceHigh: structured.initialBalanceHigh ?? null,
    initialBalanceLow: structured.initialBalanceLow ?? null,
    ethHigh: structured.ethHigh ?? result?.ethContextReview?.ethHigh ?? null,
    ethLow: structured.ethLow ?? result?.ethContextReview?.ethLow ?? null,
    asianHigh: structured.asianHigh ?? result?.ethContextReview?.asianHigh ?? null,
    asianLow: structured.asianLow ?? result?.ethContextReview?.asianLow ?? null,
    londonHigh: structured.londonHigh ?? result?.ethContextReview?.londonHigh ?? null,
    londonLow: structured.londonLow ?? result?.ethContextReview?.londonLow ?? null,
    nyPremarketHigh: structured.nyPremarketHigh ?? result?.ethContextReview?.nyPremarketHigh ?? null,
    nyPremarketLow: structured.nyPremarketLow ?? result?.ethContextReview?.nyPremarketLow ?? null,
    previousDayHigh: structured.previousDayHigh ?? structured.priorDayHigh ?? null,
    previousDayLow: structured.previousDayLow ?? structured.priorDayLow ?? null,
    priorDayHigh: structured.priorDayHigh ?? structured.previousDayHigh ?? null,
    priorDayLow: structured.priorDayLow ?? structured.previousDayLow ?? null,
    morningHigh: structured.morningHigh ?? null,
    morningLow: structured.morningLow ?? null,
    morningHighSweep: structured.morningHighSweep ?? null,
    morningLowSweep: structured.morningLowSweep ?? null,
  };
}

function buildChartContext(input: TradeDecisionPipelineInput): ChartContext {
  const structured = input.result?.structuredChartContext || {};
  const extractedWarnings = structured.extractionWarnings;
  const warningMessages = extractedWarnings?.messages || [];
  const structuredUsability =
    structured.screenshotQuality === 'Unreadable' || extractedWarnings?.screenshotUnclear
      ? 'unusable'
      : structured.screenshotQuality === 'Low'
        ? 'warning'
        : structured.screenshotUsability;
  return {
    sessionType: input.sessionType,
    instrument: input.instrument || 'MES',
    tradeDate: input.tradeDate || new Date().toISOString().split('T')[0],
    timeframe: structured.timeframe || '5m',
    screenshotRole: structured.screenshotRole,
    screenshotTimestamp: structured.screenshotTimestamp ?? input.result?.sessionLog?.timestamp ?? null,
    screenshotTimezone: structured.screenshotTimezone,
    screenshotUsability: input.screenshotUsability || structuredUsability || (input.result ? 'usable' : 'unusable'),
    screenshotWarning: input.screenshotWarning || structured.screenshotWarning || warningMessages[0] || null,
    keyLevels: buildKeyLevels(input.result),
    extractedLevels: structured.extractedLevels,
    candles: structured.candles,
    swings: structured.swings,
    fvgZones: structured.fvgZones,
    liquidityEvents: structured.liquidityEvents,
    gapContext: structured.gapContext,
    compressionRange: structured.compressionRange,
    marketStructure: structured.marketStructure,
    candleFacts: structured.candleFacts,
    setupEvidence: structured.setupEvidence,
    morningWindowContext: structured.morningWindowContext,
    proposedEntry: structured.proposedEntry,
    proposedStop: structured.proposedStop,
    riskPoints: structured.riskPoints,
    riskStatus: structured.riskStatus,
    entryConfirmed: structured.entryConfirmed,
    stopConfirmed: structured.stopConfirmed,
    requiresManualConfirmation: structured.requiresManualConfirmation,
    screenshotQuality: structured.screenshotQuality,
    levelReadConfidence: structured.levelReadConfidence,
    candleReadConfidence: structured.candleReadConfidence,
    structureReadConfidence: structured.structureReadConfidence,
    setupReadConfidence: structured.setupReadConfidence,
    riskReadConfidence: structured.riskReadConfidence,
    entryStopConfidence: structured.entryStopConfidence,
    extractionWarnings: structured.extractionWarnings,
    marketContext: input.result?.reasoning || input.result?.current_rule_analysis?.summary || 'No market context extracted.',
    ocrText: input.result?.agentReports?.map((report) => report.findings).join('\n') || null,
  };
}

function candidatesFromResult(result: AnalysisResult | null | undefined): CandidateInput[] {
  if (!result) return [];
  const candidates: CandidateInput[] = [];

  if (result.current_rule_analysis) {
    const rule = result.current_rule_analysis;
    const text = [rule.setup_detected, rule.rule_category, rule.summary, result.dayType].join(' ');
    candidates.push({
      setupType: setupFromText(text),
      setupName: rule.setup_detected || 'Current Rule Analysis',
      direction: inferDirection(text),
      entry: parsePrice(rule.entry),
      stop: parsePrice(rule.stop),
      confidence: confidenceFrom(rule.base_confidence, confidenceFrom(result.confidence)),
      reasoning: rule.summary || rule.no_trade_reason || 'Chart facts extracted for rule review.',
      invalidation: rule.no_trade_reason || result.levelCheck || result.structureStatus || '',
      entryTrigger: rule.entry_trigger || null,
      noTradeReason: rule.no_trade_reason ? NoTradeReason.NoApprovedSetup : null,
    });
  }

  result.candidate_trade_plans?.forEach((candidate) => {
    candidates.push({
      setupType: setupFromText(candidate.setup_name, candidate.rule_category, candidate.why_this_plan),
      setupName: candidate.setup_name || 'Candidate',
      direction: candidate.direction || 'NO TRADE',
      entry: parsePrice(candidate.entry),
      stop: parsePrice(candidate.stop),
      confidence: confidenceFrom(candidate.confidence),
      reasoning: candidate.why_this_plan || 'Candidate extracted from chart context.',
      invalidation: candidate.invalidation || '',
      entryTrigger: candidate.entry_trigger || null,
      rank: candidate.rank ?? null,
      priorityScore: candidate.priority_score ?? null,
      noTradeReason: candidate.rejection_reason ? NoTradeReason.NoApprovedSetup : null,
    });
  });

  if (result.final_trade_plan) {
    const plan = result.final_trade_plan;
    candidates.push({
      setupType: setupFromText(plan.why_this_plan, result.current_rule_analysis?.setup_detected, result.dayType),
      setupName: result.current_rule_analysis?.setup_detected || 'Final Trade Plan',
      direction: plan.decision || 'NO TRADE',
      entry: parsePrice(plan.entry),
      stop: parsePrice(plan.stop),
      confidence: confidenceFrom(plan.final_confidence),
      reasoning: plan.why_this_plan || 'Final advisory plan extracted from chart context.',
      invalidation: plan.what_would_invalidate || '',
      entryTrigger: plan.entry_trigger || null,
      rank: 2,
    });
  }

  return candidates;
}

function sessionKey(sessionType: PipelineSessionType): 'morning' | 'lunch' {
  return sessionType === 'lunch' || sessionType === 'replay_lunch' ? 'lunch' : 'morning';
}

function setupAllowed(sessionType: PipelineSessionType, setupType: SetupType): boolean {
  const key = sessionKey(sessionType);
  return (TRADE_RULES.sessions[key].allowedSetups as readonly SetupType[]).includes(setupType);
}

function riskPoints(entry: number | null, stop: number | null): number | null {
  if (!isValidPrice(entry) || !isValidPrice(stop)) return null;
  return Math.abs(entry - stop);
}

function targets(direction: Direction, entry: number | null, stop: number | null): { target1: number | null; target2: number | null; target: number | null } {
  const risk = riskPoints(entry, stop);
  if ((direction !== 'LONG' && direction !== 'SHORT') || risk === null) {
    return { target1: null, target2: null, target: null };
  }
  const sign = direction === 'LONG' ? 1 : -1;
  const target1 = roundToTick((entry as number) + sign * risk * TRADE_RULES.targetModel.t1R);
  const target2 = roundToTick((entry as number) + sign * risk * TRADE_RULES.targetModel.t2R);
  return { target1, target2, target: target1 };
}

function confidenceScore(confidence: Confidence): number {
  if (confidence === 'High') return 25;
  if (confidence === 'Medium') return 14;
  return 5;
}

function setupScore(setupType: SetupType): number {
  switch (setupType) {
    case SetupType.LiquiditySweep: return 100;
    case SetupType.MomentumRunaway: return 88;
    case SetupType.FairValueGap: return 82;
    case SetupType.InitialBalanceExtension: return 78;
    case SetupType.MarketStructureShift: return 74;
    case SetupType.OpeningOrderBlock: return 72;
    case SetupType.OrderBlock618: return 70;
    case SetupType.EqualHighsLows: return 68;
    case SetupType.PreviousDaySweep: return 66;
    case SetupType.CompressionBreakout: return 58;
    case SetupType.OpeningGapFill: return 52;
    case SetupType.BreakerBlock: return 46;
    case SetupType.MitigationBlock: return 42;
    case SetupType.AlgoKillZone: return 40;
    case SetupType.MorningFailedHighLiquidityRejection: return 89;
    case SetupType.MorningReclaimLong: return 88;
    case SetupType.LunchFailedHighReversal: return 96;
    case SetupType.LunchFailedLowReversal: return 96;
    case SetupType.LunchFailedContinuation: return 90;
    case SetupType.LunchRangeReclaim: return 86;
    case SetupType.LunchCompressionBreakout: return 78;
    default: return 0;
  }
}

function stopTiedToStructure(candidate: CandidateInput): boolean {
  if (!isValidPrice(candidate.stop)) return false;
  const text = `${candidate.invalidation} ${candidate.reasoning} ${candidate.entryTrigger || ''}`.toUpperCase();
  return [
    'LOW',
    'HIGH',
    'SWING',
    'WICK',
    'CANDLE',
    'STRUCTURE',
    'HL',
    'LH',
    'STOP',
    'RECLAIM',
    'BREATHER',
    'EXTREME',
  ].some((token) => text.includes(token));
}

function candidateBlocker(candidate: CandidateInput, sessionType: PipelineSessionType): NoTradeReason | null {
  if (candidate.direction !== 'LONG' && candidate.direction !== 'SHORT') return NoTradeReason.NoApprovedSetup;
  if (candidate.setupType === SetupType.NoSetup || !setupAllowed(sessionType, candidate.setupType)) return NoTradeReason.NoApprovedSetup;
  if (!isValidPrice(candidate.entry)) return NoTradeReason.EntryTriggerMissing;
  if (!isValidPrice(candidate.stop)) return NoTradeReason.InvalidStopLocation;
  if (!stopTiedToStructure(candidate)) return NoTradeReason.InvalidStopLocation;
  const risk = riskPoints(candidate.entry, candidate.stop);
  if (risk === null || risk <= 0) return NoTradeReason.InvalidStopLocation;
  if (risk > TRADE_RULES.maxRiskPoints) return NoTradeReason.RiskTooWide;
  const computedTargets = targets(candidate.direction, candidate.entry, candidate.stop);
  if (!isValidPrice(computedTargets.target1) || !isValidPrice(computedTargets.target2)) return NoTradeReason.TargetsUnavailable;
  if (typeof candidate.invalidation !== 'string' || candidate.invalidation.trim().length < 3) return NoTradeReason.InvalidStopLocation;
  return null;
}

function chooseCandidate(candidates: CandidateInput[], sessionType: PipelineSessionType): CandidateInput | null {
  return candidates
    .filter((candidate) => candidateBlocker(candidate, sessionType) === null)
    .sort((a, b) => {
      const riskA = riskPoints(a.entry, a.stop) || TRADE_RULES.maxRiskPoints;
      const riskB = riskPoints(b.entry, b.stop) || TRADE_RULES.maxRiskPoints;
      const scoreA = setupScore(a.setupType) + confidenceScore(a.confidence) + (a.priorityScore || 0) * 10 - riskA;
      const scoreB = setupScore(b.setupType) + confidenceScore(b.confidence) + (b.priorityScore || 0) * 10 - riskB;
      return scoreB - scoreA;
    })[0] || null;
}

function makeRiskAssessment(candidate: CandidateInput | null): RiskAssessment {
  const entry = candidate?.entry ?? null;
  const stop = candidate?.stop ?? null;
  const risk = riskPoints(entry, stop);
  const status =
    risk === null ? RiskStatus.Unknown :
    risk > TRADE_RULES.maxRiskPoints ? RiskStatus.Blocked :
    risk > TRADE_RULES.preferredRiskPoints ? RiskStatus.Warning :
    RiskStatus.Approved;

  return {
    status,
    entry,
    stop,
    riskPoints: risk,
    maxRiskPoints: TRADE_RULES.maxRiskPoints,
    reasoning: risk === null
      ? 'Risk unavailable because ENTRY or STOP is missing.'
      : `Risk is ${risk.toFixed(2)} points against max ${TRADE_RULES.maxRiskPoints}.`,
  };
}

function makeRiskAssessmentFromSetup(candidate: SetupCandidate | null): RiskAssessment {
  const entry = candidate?.entry ?? null;
  const stop = candidate?.stop ?? null;
  const risk = riskPoints(entry, stop);
  const status =
    risk === null ? RiskStatus.Unknown :
    risk > TRADE_RULES.maxRiskPoints ? RiskStatus.Blocked :
    risk > TRADE_RULES.preferredRiskPoints ? RiskStatus.Warning :
    RiskStatus.Approved;

  return {
    status,
    entry,
    stop,
    riskPoints: risk,
    maxRiskPoints: TRADE_RULES.maxRiskPoints,
    reasoning: risk === null
      ? 'Risk unavailable because ENTRY or STOP is missing.'
      : `Risk is ${risk.toFixed(2)} points against max ${TRADE_RULES.maxRiskPoints}.`,
  };
}

function makeStep(step: TradeDecisionStep, status: StepStatus, message: string, required = true, noTradeReason?: NoTradeReason): TradeDecisionStepResult {
  return {
    step,
    label: DECISION_STEP_LABELS[step],
    status,
    required,
    message,
    noTradeReason,
  };
}

function firstFailure(auditTrail: TradeDecisionStepResult[]): TradeDecisionStepResult | undefined {
  return auditTrail.find((step) => step.required && step.status === 'fail');
}

function hasDetectedOpportunity(candidate: SetupCandidate): boolean {
  return candidate.detectedStatus !== 'NotDetected' && candidate.detectedStatus !== 'Invalid';
}

function chooseDisplayCandidate(candidates: SetupCandidate[]): SetupCandidate | null {
  return candidates
    .filter(hasDetectedOpportunity)
    .sort((a, b) => rankSetupCandidate(b) - rankSetupCandidate(a))[0] || null;
}

function mergeSetupCandidates(scannerCandidates: SetupCandidate[], builderCandidates: SetupCandidate[]): SetupCandidate[] {
  const merged = [...scannerCandidates];
  builderCandidates.forEach((candidate) => {
    const duplicateIndex = merged.findIndex((existing) =>
      existing.setupType === candidate.setupType &&
      existing.direction === candidate.direction
    );

    if (duplicateIndex === -1) {
      merged.push(candidate);
      return;
    }

    const existing = merged[duplicateIndex];
    const candidateScore = rankSetupCandidate(candidate);
    const existingScore = rankSetupCandidate(existing);
    if (
      candidateScore > existingScore ||
      ((existing.entry === null || existing.entry === undefined) && candidate.entry) ||
      ((existing.stop === null || existing.stop === undefined) && candidate.stop)
    ) {
      merged[duplicateIndex] = {
        ...existing,
        ...candidate,
        evidence: Array.from(new Set([...(existing.evidence || []), ...(candidate.evidence || [])])),
        missingEvidence: Array.from(new Set([...(existing.missingEvidence || []), ...(candidate.missingEvidence || [])])),
        missingLevels: [
          ...(existing.missingLevels || []),
          ...(candidate.missingLevels || []).filter((level) =>
            !(existing.missingLevels || []).some((existingLevel) => existingLevel.key === level.key && existingLevel.requiredFor === level.requiredFor)
          ),
        ],
      };
    }
  });

  return merged.sort((a, b) => rankSetupCandidate(b) - rankSetupCandidate(a));
}

function finalStatusFromSelection(
  selectedExecutable: SetupCandidate | null,
  selectedConditional: SetupCandidate | null,
  preliminaryFailure: TradeDecisionStepResult | undefined,
  hasLowQualityScreenshot = false
): TradeDecisionStatus {
  if (preliminaryFailure?.noTradeReason === NoTradeReason.InvalidScreenshot) return TradeDecisionStatus.InvalidScreenshot;
  if (preliminaryFailure?.noTradeReason === NoTradeReason.OutsideTimeWindow) return TradeDecisionStatus.OutsideRules;
  if (preliminaryFailure) return TradeDecisionStatus.NoTrade;
  if (selectedExecutable && hasLowQualityScreenshot) return TradeDecisionStatus.Wait;
  if (selectedExecutable) return TradeDecisionStatus.ApprovedTrade;
  if (selectedConditional?.blockReason === NoTradeReason.RiskTooWide) return TradeDecisionStatus.Wait;
  if (selectedConditional) return TradeDecisionStatus.ConditionalTrade;
  return TradeDecisionStatus.NoTrade;
}

function noTradeReasonFromSelection(
  status: TradeDecisionStatus,
  selected: SetupCandidate | null,
  displayCandidate: SetupCandidate | null
): NoTradeReason | null {
  if (status === TradeDecisionStatus.ApprovedTrade || status === TradeDecisionStatus.ConditionalTrade) return null;
  if (status === TradeDecisionStatus.Wait) return selected?.blockReason || NoTradeReason.EntryTriggerPending;
  return selected?.blockReason || displayCandidate?.blockReason || NoTradeReason.NoApprovedSetup;
}

export function runTradeDecisionPipeline(input: TradeDecisionPipelineInput): TradeDecisionPipelineResult {
  const chartContext = buildChartContext(input);
  const setupScan = scanSetupCandidates({
    sessionType: input.sessionType,
    result: input.result,
    chartContext,
  });
  const setupCandidates = mergeSetupCandidates(setupScan.candidates, buildConditionalPlans(chartContext));
  const selectedExecutable = setupCandidates.find((candidate) => candidate.executionStatus === ExecutionStatus.Executable) || null;
  const selectedConditional = setupCandidates.find((candidate) => candidate.executionStatus === ExecutionStatus.Conditional) || null;
  const selectedCandidate = selectedExecutable || selectedConditional;
  const displayCandidate = selectedCandidate || chooseDisplayCandidate(setupCandidates);
  const blockedCandidates = setupCandidates.filter((candidate) => candidate.executionStatus === ExecutionStatus.Blocked);
  const bias = inferBias(input.result);
  const riskAssessment = makeRiskAssessmentFromSetup(selectedCandidate || displayCandidate);
  const computedTargets = selectedCandidate
    ? { target: selectedCandidate.target1 ?? null, target1: selectedCandidate.target1 ?? null, target2: selectedCandidate.target2 ?? null }
    : { target: null, target1: null, target2: null };
  const liveWindow = sessionKey(input.sessionType);
  const isReplay = input.sessionType === 'replay_morning' || input.sessionType === 'replay_lunch';
  const windowStatus = isReplay ? 'active' : input.windowStatusOverride || getWindowStatus(liveWindow);
  const isWindowApproved = isReplay || windowStatus === 'active';
  const hasUsableScreenshot = chartContext.screenshotUsability !== 'unusable';
  const hasLowQualityScreenshot =
    chartContext.screenshotUsability === 'warning' ||
    chartContext.screenshotUsability === 'unusable' ||
    chartContext.screenshotQuality === 'Low' ||
    chartContext.screenshotQuality === 'Unreadable' ||
    chartContext.levelReadConfidence === 'Low' ||
    chartContext.levelReadConfidence === 'Unreadable' ||
    chartContext.structureReadConfidence === 'Low' ||
    chartContext.structureReadConfidence === 'Unreadable' ||
    chartContext.riskReadConfidence === 'Low' ||
    chartContext.riskReadConfidence === 'Unreadable' ||
    chartContext.entryStopConfidence === 'Low' ||
    chartContext.entryStopConfidence === 'Unreadable' ||
    chartContext.requiresManualConfirmation === true ||
    chartContext.entryConfirmed === false ||
    chartContext.stopConfirmed === false ||
    chartContext.extractionWarnings?.screenshotUnclear === true ||
    chartContext.extractionWarnings?.levelsUnclear === true ||
    chartContext.extractionWarnings?.priceLabelsUnreadable === true ||
    chartContext.extractionWarnings?.manualEntryStopRequired === true;
  const hasInstrument = TRADE_RULES.instruments.includes(chartContext.instrument);
  const detectedCount = setupCandidates.filter(hasDetectedOpportunity).length;
  const executableCount = setupCandidates.filter((candidate) => candidate.executionStatus === ExecutionStatus.Executable).length;
  const conditionalCount = setupCandidates.filter((candidate) => candidate.executionStatus === ExecutionStatus.Conditional).length;
  const setupAssessment: SetupAssessment = {
    setupType: selectedCandidate?.setupType || displayCandidate?.setupType || SetupType.NoSetup,
    status: selectedCandidate ? TradeDecisionStatus.ConditionalTrade : TradeDecisionStatus.NoTrade,
    confidence: selectedCandidate?.confidence || displayCandidate?.confidence || 'Low',
    entryTrigger: selectedCandidate?.requiredTrigger || displayCandidate?.requiredTrigger || null,
    invalidation: selectedCandidate?.invalidation || displayCandidate?.invalidation || 'No valid invalidation defined.',
    reasoning: selectedCandidate?.nextAction || displayCandidate?.nextAction || 'No executable or conditional setup survived deterministic scan.',
    noTradeReason: selectedCandidate?.blockReason || displayCandidate?.blockReason || null,
  };
  const biasAssessment: BiasAssessment = {
    bias,
    confidence: confidenceFrom(input.result?.confidence),
    reasoning: input.result?.reasoning || input.result?.current_rule_analysis?.summary || 'Bias could not be fully established.',
    evidence: [
      input.result?.dayType,
      input.result?.current_rule_analysis?.setup_detected,
      input.result?.structureStatus,
    ].filter(Boolean) as string[],
  };

  const auditTrail: TradeDecisionStepResult[] = [
    makeStep(TradeDecisionStep.ConfirmSessionAndInstrument, hasInstrument ? 'pass' : 'fail', hasInstrument ? `${chartContext.sessionType} / ${chartContext.instrument}` : 'Missing or unsupported instrument.', true, NoTradeReason.MissingInstrument),
    makeStep(TradeDecisionStep.ConfirmScreenshotUsability, hasUsableScreenshot ? (chartContext.screenshotUsability === 'warning' ? 'warning' : 'pass') : 'fail', chartContext.screenshotWarning || `Screenshot usability: ${chartContext.screenshotUsability}.`, true, NoTradeReason.InvalidScreenshot),
    makeStep(TradeDecisionStep.IdentifyMarketContext, input.result ? 'pass' : 'fail', chartContext.marketContext, true, NoTradeReason.MissingRequiredContext),
    makeStep(TradeDecisionStep.IdentifyKeyLevels, Object.values(chartContext.keyLevels).some(isValidPrice) ? 'pass' : 'warning', 'Key levels reviewed from extracted chart context.', false, NoTradeReason.MissingKeyLevels),
    makeStep(TradeDecisionStep.DetermineBias, bias === BiasDirection.NoBias ? 'fail' : 'pass', `Bias: ${bias}.`, true, NoTradeReason.NoClearBias),
    makeStep(TradeDecisionStep.CheckApprovedTimeWindow, isWindowApproved ? 'pass' : 'fail', isReplay ? 'Replay mode uses entered trade date/session.' : `Live window status: ${windowStatus}.`, true, NoTradeReason.OutsideTimeWindow),
  ];

  const preliminaryFailure = firstFailure(auditTrail);
  const finalStatus = finalStatusFromSelection(selectedExecutable, selectedConditional, preliminaryFailure, hasLowQualityScreenshot);
  const finalNoTradeReason =
    preliminaryFailure?.noTradeReason ||
    noTradeReasonFromSelection(finalStatus, selectedCandidate, displayCandidate);
  const selectedIsExecutable = finalStatus === TradeDecisionStatus.ApprovedTrade;
  const selectedIsConditional = finalStatus === TradeDecisionStatus.ConditionalTrade || finalStatus === TradeDecisionStatus.Wait;

  auditTrail.push(
    makeStep(
      TradeDecisionStep.IdentifySetupType,
      detectedCount > 0 ? (selectedCandidate ? 'pass' : 'warning') : 'fail',
      detectedCount > 0
        ? `Setup scan complete: ${detectedCount} detected/possible, ${executableCount} executable, ${conditionalCount} conditional, ${blockedCandidates.length} blocked.`
        : 'No approved setup type was detected.',
      true,
      detectedCount > 0 ? undefined : NoTradeReason.NoApprovedSetup
    ),
    makeStep(
      TradeDecisionStep.ValidateEntryTrigger,
      selectedIsExecutable && isValidPrice(selectedCandidate?.entry) ? 'pass' : selectedIsConditional ? 'warning' : 'fail',
      selectedCandidate?.requiredTrigger || (selectedIsConditional ? 'Conditional setup requires trigger confirmation.' : 'No measurable entry trigger.'),
      true,
      selectedIsConditional ? selectedCandidate?.blockReason || NoTradeReason.EntryTriggerPending : NoTradeReason.EntryTriggerMissing
    ),
    makeStep(
      TradeDecisionStep.ValidateStopLocation,
      selectedIsExecutable && isValidPrice(selectedCandidate?.stop) && selectedCandidate?.invalidation ? 'pass' : selectedIsConditional ? 'warning' : 'fail',
      selectedCandidate?.invalidation || (selectedIsConditional ? 'Conditional setup must define stop tied to active swing structure before execution.' : 'Stop is not tied to active swing/structure.'),
      true,
      selectedIsConditional ? selectedCandidate?.blockReason || NoTradeReason.InvalidStopLocation : NoTradeReason.InvalidStopLocation
    ),
    makeStep(
      TradeDecisionStep.ValidateRiskLimit,
      selectedIsExecutable
        ? riskAssessment.status === RiskStatus.Warning ? 'warning' : 'pass'
        : selectedIsConditional ? 'warning' : 'fail',
      selectedCandidate?.blockReason === NoTradeReason.RiskTooWide
        ? 'RiskTooWide blocks execution only; setup remains available as a reduced-risk wait/conditional candidate.'
        : riskAssessment.reasoning,
      true,
      selectedCandidate?.blockReason === NoTradeReason.RiskTooWide ? NoTradeReason.RiskTooWide : undefined
    ),
    makeStep(
      TradeDecisionStep.DetermineTargetModel,
      selectedIsExecutable && isValidPrice(computedTargets.target1) && isValidPrice(computedTargets.target2) ? 'pass' : selectedIsConditional ? 'warning' : 'fail',
      'Targets use app model: T1 = 1.5R, T2 = 2.0R.',
      true,
      selectedIsConditional ? selectedCandidate?.blockReason || NoTradeReason.TargetsUnavailable : NoTradeReason.TargetsUnavailable
    ),
    makeStep(
      TradeDecisionStep.DefineInvalidation,
      selectedIsExecutable && selectedCandidate?.invalidation ? 'pass' : selectedIsConditional ? 'warning' : 'fail',
      selectedCandidate?.invalidation || (selectedIsConditional ? 'Conditional setup requires invalidation before execution.' : 'Invalidation is required.'),
      true,
      selectedIsConditional ? selectedCandidate?.blockReason || NoTradeReason.InvalidStopLocation : NoTradeReason.InvalidStopLocation
    ),
  );

  const finalPlan: FinalTradePlan = {
    status: finalStatus,
    direction: selectedCandidate?.direction || 'NO TRADE',
    setupType: selectedCandidate?.setupType || displayCandidate?.setupType || SetupType.NoSetup,
    entry: selectedIsExecutable || finalStatus === TradeDecisionStatus.ConditionalTrade ? selectedCandidate?.entry ?? null : null,
    stop: selectedIsExecutable || finalStatus === TradeDecisionStatus.ConditionalTrade ? selectedCandidate?.stop ?? null : null,
    target: selectedIsExecutable || finalStatus === TradeDecisionStatus.ConditionalTrade ? computedTargets.target : null,
    target1: selectedIsExecutable || finalStatus === TradeDecisionStatus.ConditionalTrade ? computedTargets.target1 : null,
    target2: selectedIsExecutable || finalStatus === TradeDecisionStatus.ConditionalTrade ? computedTargets.target2 : null,
    invalidation: selectedCandidate?.invalidation || preliminaryFailure?.message || 'No valid invalidation defined.',
    risk: riskAssessment,
    confidence: selectedCandidate?.confidence || displayCandidate?.confidence || 'Low',
    reasoning: selectedCandidate?.nextAction || displayCandidate?.nextAction || preliminaryFailure?.message || 'No executable or conditional opportunity.',
    noTradeReason: finalNoTradeReason,
  };

  auditTrail.push(
    makeStep(
      TradeDecisionStep.DecideTradeOrNoTrade,
      finalStatus === TradeDecisionStatus.NoTrade || finalStatus === TradeDecisionStatus.InvalidScreenshot || finalStatus === TradeDecisionStatus.OutsideRules ? 'fail' : finalStatus === TradeDecisionStatus.Wait ? 'warning' : 'pass',
      finalStatus === TradeDecisionStatus.NoTrade
        ? 'NoTrade returned only after no executable or conditional setup was available.'
        : `Decision: ${finalStatus}.`,
      true,
      finalPlan.noTradeReason || undefined
    ),
    makeStep(TradeDecisionStep.GenerateFinalTradePlan, finalPlan.status === TradeDecisionStatus.NoTrade || finalPlan.status === TradeDecisionStatus.InvalidScreenshot || finalPlan.status === TradeDecisionStatus.OutsideRules ? 'warning' : 'pass', 'Final plan generated by deterministic app pipeline.', true, finalPlan.noTradeReason || undefined),
    makeStep(TradeDecisionStep.SaveJournalReadyRecord, 'pass', 'Journal-ready payload can be saved after analysis/outcome.', false),
  );

  const opportunitySelection: FinalOpportunitySelection = {
    bestExecutableCandidate: selectedExecutable,
    bestConditionalCandidate: selectedConditional,
    blockedCandidates,
    finalDecision: finalStatus,
    noTradeReason: finalPlan.noTradeReason || null,
  };

  return {
    status: finalStatus,
    step: TradeDecisionStep.SaveJournalReadyRecord,
    chartContext,
    biasAssessment,
    setupAssessment,
    setupCandidates,
    opportunitySelection,
    riskAssessment,
    finalTradePlan: finalPlan,
    noTradeReason: finalPlan.noTradeReason,
    journalReady: true,
    auditTrail,
    target1: finalPlan.target1 ?? null,
    target2: finalPlan.target2 ?? null,
  };
}
