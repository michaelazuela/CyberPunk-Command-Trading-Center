import {
  AnalysisResult,
  BiasAssessment,
  BiasDirection,
  ChartContext,
  DecisionQualityScoreItem,
  EarlyMoveReview,
  ExecutionStatus,
  FinalOpportunitySelection,
  FinalTradePlan,
  KeyLevels,
  NoTradeReason,
  RiskAssessment,
  RiskStatus,
  SetupCandidate,
  SetupCandidateStatus,
  SetupAssessment,
  SetupType,
  TradeDecision,
  TradeDecisionStatus,
  TradeDecisionStep,
} from '../types';
import { DECISION_STEPS, DECISION_STEP_LABELS } from '../config/decisionSteps';
import { targetsFromEntryStop, TRADE_RULES } from '../config/tradeRules';
import { getWindowStatus } from '../config/timeWindows';
import { rankSetupCandidate, scanSetupCandidates } from './setupScanner';
import { buildConditionalPlans } from './conditionalPlanBuilder';
import { applyTargetObjectivesToCandidates } from './targetObjectiveEngine';
import { applyLevelSanity } from './levelSanityEngine';
import { buildHtfLiquidityDrawStateFromChartContext } from './htfLiquidityDrawEngine';
import { buildFailedPlanReversalContextFromChartContext } from './failedPlanReversalEngine';

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
  const structured = result?.structuredChartContext;
  const alignedDirection = structured?.multiTimeframeContext?.alignment?.alignedDirection;
  if (alignedDirection === 'LONG') return BiasDirection.Bullish;
  if (alignedDirection === 'SHORT') return BiasDirection.Bearish;

  const sessionStoryBias = structured?.sessionStory?.bias;
  if (sessionStoryBias === 'LONG') return BiasDirection.Bullish;
  if (sessionStoryBias === 'SHORT') return BiasDirection.Bearish;

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
  if (
    text.includes('FAILED PLAN REVERSAL') ||
    text.includes('FAILED_PLAN_REVERSAL') ||
    text.includes('OPPOSITE-SIDE DECISION LEVEL') ||
    text.includes('OPPOSITE SIDE DECISION LEVEL')
  ) return SetupType.FailedPlanReversal;
  if (
    text.includes('HTF DISPLACEMENT + FVG CONTINUATION') ||
    text.includes('HTF DISPLACEMENT FVG CONTINUATION') ||
    text.includes('HTF_DISPLACEMENT_FVG_CONTINUATION')
  ) return SetupType.HtfDisplacementFvgContinuation;
  if (
    text.includes('HTF DISPLACEMENT + MSS CONTINUATION') ||
    text.includes('HTF DISPLACEMENT MSS CONTINUATION') ||
    text.includes('HTF_DISPLACEMENT_MSS_CONTINUATION')
  ) return SetupType.HtfDisplacementMssContinuation;
  if (text.includes('TURTLE SOUP') || text.includes('FAILED BREAKOUT REVERSAL') || text.includes('FAILED BREAKDOWN REVERSAL')) return SetupType.TurtleSoup;
  const hasSweepOrReclaim = text.includes('LIQUIDITY') || text.includes('SWEEP') || text.includes('RECLAIM') || text.includes('FAILED BREAKOUT') || text.includes('FAILED BREAKDOWN');
  const hasStructureOrImbalance = text.includes('MSS') || text.includes('STRUCTURE SHIFT') || text.includes('FVG') || text.includes('FAIR VALUE') || text.includes('IMBALANCE') || text.includes('DISPLACEMENT');
  if (hasSweepOrReclaim || hasStructureOrImbalance) return SetupType.SweepMssFvgRetrace;
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
  const chartContext: ChartContext = {
    sessionType: input.sessionType,
    instrument: input.instrument || 'MES',
    tradeDate: input.tradeDate || new Date().toISOString().split('T')[0],
    timeframe: structured.timeframe || '5m',
    screenshotRole: structured.screenshotRole,
    chartTimestamp: structured.chartTimestamp,
    screenshotTimestamp: structured.screenshotTimestamp ?? input.result?.sessionLog?.timestamp ?? null,
    screenshotTimezone: structured.screenshotTimezone,
    screenshotUsability: input.screenshotUsability || structuredUsability || (input.result ? 'usable' : 'unusable'),
    screenshotWarning: input.screenshotWarning || structured.screenshotWarning || warningMessages[0] || null,
    keyLevels: buildKeyLevels(input.result),
    structuralLevels: structured.structuralLevels,
    sessionLevelContext: structured.sessionLevelContext,
    sessionStory: structured.sessionStory,
    multiTimeframeContext: structured.multiTimeframeContext,
    htfLiquidityDrawState: structured.htfLiquidityDrawState,
    targetObjectives: structured.targetObjectives,
    extractedLevels: structured.extractedLevels,
    candles: structured.candles,
    swings: structured.swings,
    fvgZones: structured.fvgZones,
    liquidityEvents: structured.liquidityEvents,
    liquiditySweeps: structured.liquiditySweeps,
    reclaimEvents: structured.reclaimEvents,
    failedBreakEvents: structured.failedBreakEvents,
    displacementCandles: structured.displacementCandles,
    setupReadyFacts: structured.setupReadyFacts,
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
    marketContext: structured.marketContext || input.result?.reasoning || input.result?.current_rule_analysis?.summary || 'No market context extracted.',
    ocrText: structured.ocrText || input.result?.agentReports?.map((report) => report.findings).join('\n') || null,
  };
  const withHtfDraw: ChartContext = {
    ...chartContext,
    htfLiquidityDrawState:
      chartContext.htfLiquidityDrawState ||
      buildHtfLiquidityDrawStateFromChartContext(chartContext) ||
      undefined,
  };
  return {
    ...withHtfDraw,
    failedPlanReversal:
      withHtfDraw.failedPlanReversal ||
      buildFailedPlanReversalContextFromChartContext(withHtfDraw) ||
      undefined,
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
  const actualTargets = targetsFromEntryStop(direction, entry, stop);
  if ((direction !== 'LONG' && direction !== 'SHORT') || actualTargets.target1 === null || actualTargets.target2 === null) {
    return { target1: null, target2: null, target: null };
  }
  const target1 = actualTargets.target1;
  const target2 = actualTargets.target2;
  return { target1, target2, target: target1 };
}

function confidenceScore(confidence: Confidence): number {
  if (confidence === 'High') return 25;
  if (confidence === 'Medium') return 14;
  return 5;
}

function setupScore(setupType: SetupType): number {
  switch (setupType) {
    case SetupType.SweepMssFvgRetrace: return 100;
    case SetupType.HtfDrawContinuationAfterRaid: return 99;
    case SetupType.HtfDisplacementMssContinuation: return 99;
    case SetupType.HtfDisplacementFvgContinuation: return 97;
    case SetupType.FailedPlanReversal: return 98;
    case SetupType.TurtleSoup: return 98;
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
  const advisoryStatus =
    risk === null || risk <= 0 ? 'RISK_INVALID_OR_UNDEFINED' :
    risk > TRADE_RULES.maxRiskPoints * 2 ? 'RISK_EXTENDED_STRUCTURAL' :
    risk > TRADE_RULES.maxRiskPoints ? 'RISK_ABOVE_STANDARD_LIMIT' :
    'RISK_WITHIN_STANDARD_LIMIT';
  const status =
    risk === null ? RiskStatus.Unknown :
    risk > TRADE_RULES.maxRiskPoints ? RiskStatus.Warning :
    risk > TRADE_RULES.preferredRiskPoints ? RiskStatus.Warning :
    RiskStatus.Approved;

  return {
    status,
    advisoryStatus,
    riskPolicy: advisoryStatus === 'RISK_WITHIN_STANDARD_LIMIT' ? 'STANDARD_RISK' : 'STRUCTURAL_RISK_ACKNOWLEDGED',
    entry,
    stop,
    riskPoints: risk,
    maxRiskPoints: TRADE_RULES.maxRiskPoints,
    reasoning: risk === null
      ? 'Risk unavailable because ENTRY or STOP is missing.'
      : risk > TRADE_RULES.maxRiskPoints
        ? `Risk advisory: above standard limit. Human final decision required. Risk is ${risk.toFixed(2)} points against standard ${TRADE_RULES.maxRiskPoints}.`
        : `Risk is ${risk.toFixed(2)} points against standard ${TRADE_RULES.maxRiskPoints}.`,
  };
}

function makeRiskAssessmentFromSetup(candidate: SetupCandidate | null): RiskAssessment {
  const entry = candidate?.entry ?? null;
  const stop = candidate?.stop ?? null;
  const risk = riskPoints(entry, stop);
  const advisoryStatus = candidate?.riskAdvisoryStatus ||
    (risk === null || risk <= 0 ? 'RISK_INVALID_OR_UNDEFINED' :
    risk > TRADE_RULES.maxRiskPoints * 2 ? 'RISK_EXTENDED_STRUCTURAL' :
    risk > TRADE_RULES.maxRiskPoints ? 'RISK_ABOVE_STANDARD_LIMIT' :
    'RISK_WITHIN_STANDARD_LIMIT');
  const status =
    risk === null ? RiskStatus.Unknown :
    risk > TRADE_RULES.maxRiskPoints ? RiskStatus.Warning :
    risk > TRADE_RULES.preferredRiskPoints ? RiskStatus.Warning :
    RiskStatus.Approved;

  return {
    status,
    advisoryStatus,
    riskPolicy: candidate?.riskPolicy || (advisoryStatus === 'RISK_WITHIN_STANDARD_LIMIT' ? 'STANDARD_RISK' : 'STRUCTURAL_RISK_ACKNOWLEDGED'),
    entry,
    stop,
    riskPoints: risk,
    maxRiskPoints: TRADE_RULES.maxRiskPoints,
    reasoning: risk === null
      ? 'Risk unavailable because ENTRY or STOP is missing.'
      : risk > TRADE_RULES.maxRiskPoints
        ? `Risk advisory: above standard limit. Human final decision required. Risk is ${risk.toFixed(2)} points against standard ${TRADE_RULES.maxRiskPoints}.`
        : `Risk is ${risk.toFixed(2)} points against standard ${TRADE_RULES.maxRiskPoints}.`,
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

function hasActionablePlanLevels(candidate: SetupCandidate): boolean {
  return candidate.direction !== 'NO TRADE' && (isValidPrice(candidate.entry) || isValidPrice(candidate.stop));
}

function clampQualityScore(value: number, max: number): number {
  return Math.max(0, Math.min(max, Math.round(value)));
}

function qualityStatus(score: number, max: number): DecisionQualityScoreItem['status'] {
  if (score <= 0) return 'blocked';
  const ratio = max > 0 ? score / max : 0;
  if (ratio >= 0.8) return 'strong';
  if (ratio >= 0.45) return 'partial';
  return 'weak';
}

function qualityRecommendation(candidate: SetupCandidate, score: number, hardBlocker: string | null): string {
  if (hardBlocker) return `No trade: ${hardBlocker}`;
  if (candidate.executionStatus !== ExecutionStatus.Executable && score >= 80) {
    return 'High-quality map, but execution remains conditional until the missing 5M or structural gate confirms.';
  }
  if (score >= 80) return 'Qualified only if the 5M trigger, protected stop, visible actual risk, and target room remain confirmed.';
  if (score >= 65) return 'Conditional: good map, but wait for the missing confirmation before execution.';
  if (score >= 45) return 'Watchlist: monitor the level, but do not execute until the approved model and risk gate complete.';
  return 'No trade: score is below the desk threshold or required evidence is missing.';
}

function candidateTextIncludes(candidate: SetupCandidate, ...patterns: string[]): boolean {
  const text = [
    candidate.scenarioLabel,
    candidate.requiredTrigger,
    candidate.nextAction,
    candidate.levelContextSummary,
    candidate.invalidation,
    ...(candidate.evidence || []),
    ...(candidate.missingEvidence || []),
  ].filter(Boolean).join(' ').toLowerCase();
  return patterns.some((pattern) => text.includes(pattern.toLowerCase()));
}

function computeDecisionQuality(candidate: SetupCandidate, chartContext: ChartContext): SetupCandidate {
  const hardBlocker =
    candidate.executionStatus === ExecutionStatus.Blocked ? candidate.blockReason || NoTradeReason.NoApprovedSetup :
    candidate.blockReason === NoTradeReason.OutsideTimeWindow ? candidate.blockReason :
    null;
  const hasSweep = candidateTextIncludes(candidate, 'sweep', 'liquidity raid');
  const hasReclaim = candidateTextIncludes(candidate, 'reclaim');
  const hasDisplacement = candidateTextIncludes(candidate, 'displacement');
  const hasMss = candidateTextIncludes(candidate, 'market structure shift', 'mss');
  const hasFvg = candidateTextIncludes(candidate, 'fair value gap', 'fvg', 'imbalance');
  const hasTurtle = candidate.setupType === SetupType.TurtleSoup || candidateTextIncludes(candidate, 'turtle soup');
  const htfAligned = candidateTextIncludes(candidate, 'higher-timeframe', 'big-picture', 'structure supports') ||
    chartContext.multiTimeframeContext?.alignment?.alignedDirection === candidate.direction;
  const hasLiquidityMap =
    Boolean(candidate.targetObjectivePlan?.liquidityTarget1 || candidate.targetObjectivePlan?.nearestLiquidityTarget) ||
    Boolean((chartContext.sessionLevelContext?.levelsToWatch || []).length);
  const riskAssessment = makeRiskAssessmentFromSetup(candidate);
  const modelScore = clampQualityScore(
    (hasSweep ? 6 : 0) +
    (hasReclaim ? 6 : 0) +
    (hasTurtle || hasFvg ? 7 : 0) +
    (hasDisplacement || hasMss || hasTurtle ? 6 : 0),
    25
  );
  const executionScore = clampQualityScore(
    (candidate.requiredTrigger ? 6 : 0) +
    (isValidPrice(candidate.entry) ? 5 : 0) +
    (isValidPrice(candidate.stop) ? 5 : 0) +
    (candidate.executionStatus === ExecutionStatus.Executable || candidate.executionStatus === ExecutionStatus.Conditional ? 4 : 0),
    20
  );
  const liquidityScore = clampQualityScore(
    (hasLiquidityMap ? 7 : 0) +
    (candidate.levelContextScore ? Math.min(6, Math.round(candidate.levelContextScore / 2)) : 0) +
    (candidateTextIncludes(candidate, 'premium/discount', 'breaker', 'overlap') ? 2 : 0),
    15
  );
  const structureScore = clampQualityScore(
    (htfAligned ? 10 : 4) +
    (candidateTextIncludes(candidate, 'countertrend', 'do not fight big-picture') ? -5 : 3),
    15
  );
  const riskScore = clampQualityScore(
    (isValidPrice(candidate.stop) ? 5 : 0) +
    (isValidPrice(candidate.target1) ? 5 : 0) +
    (isValidPrice(candidate.target2) ? 5 : 0) +
    (riskAssessment.status !== RiskStatus.Unknown && !candidate.blockReason ? 5 : 0),
    20
  );
  const sessionScore = clampQualityScore(
    chartContext.newsMacroCaution?.active && !chartContext.newsMacroCaution.confirmedAfterRelease ? 2 : 5,
    5
  );
  const rawScore = modelScore + executionScore + liquidityScore + structureScore + riskScore + sessionScore;
  const score = hardBlocker ? Math.min(rawScore, 44) : rawScore;
  const scorecard: DecisionQualityScoreItem[] = [
    {
      label: 'Approved model completion',
      score: modelScore,
      max: 25,
      status: qualityStatus(modelScore, 25),
      note:
        candidate.setupType === SetupType.TurtleSoup
          ? 'Turtle Soup reversal sequence quality.'
          : candidate.setupType === SetupType.HtfDrawContinuationAfterRaid
            ? 'HTF draw continuation after raid/reclaim sequence quality.'
          : candidate.setupType === SetupType.HtfDisplacementMssContinuation
              ? 'HTF displacement + 5M MSS continuation sequence quality.'
          : candidate.setupType === SetupType.HtfDisplacementFvgContinuation
              ? 'HTF displacement + FVG continuation sequence quality.'
          : candidate.setupType === SetupType.FailedPlanReversal
              ? 'Failed plan reversal sequence quality.'
            : 'Sweep -> MSS -> FVG retrace sequence quality.',
    },
    {
      label: '5M execution quality',
      score: executionScore,
      max: 20,
      status: qualityStatus(executionScore, 20),
      note: '5M trigger, entry, stop, and executable/conditional readiness.',
    },
    {
      label: '15M/session liquidity map',
      score: liquidityScore,
      max: 15,
      status: qualityStatus(liquidityScore, 15),
      note: candidate.levelContextSummary || 'Session liquidity context is limited.',
    },
    {
      label: '60M/240M structure alignment',
      score: structureScore,
      max: 15,
      status: qualityStatus(structureScore, 15),
      note: htfAligned ? 'Higher-timeframe/big-picture context supports the idea.' : 'Higher-timeframe alignment is not confirmed.',
    },
    {
      label: 'Risk and target room',
      score: riskScore,
      max: 20,
      status: qualityStatus(riskScore, 20),
      note: 'Protected stop, T1/T2, actual risk status, and blocker status.',
    },
    {
      label: 'Time window / session quality',
      score: sessionScore,
      max: 5,
      status: qualityStatus(sessionScore, 5),
      note: chartContext.newsMacroCaution?.active ? 'Macro caution active; wait for post-release confirmation.' : 'No active macro/news caution penalty.',
    },
  ];

  return {
    ...candidate,
    decisionQualityScore: score,
    decisionQualityRecommendation: qualityRecommendation(candidate, score, hardBlocker),
    decisionQualityScorecard: scorecard,
    decisionQualityHardBlocker: hardBlocker,
  };
}

function enrichDecisionQuality(candidates: SetupCandidate[], chartContext: ChartContext): SetupCandidate[] {
  return candidates.map((candidate) => computeDecisionQuality(candidate, chartContext));
}

function qualitySort(a: SetupCandidate, b: SetupCandidate): number {
  return (b.decisionQualityScore || 0) - (a.decisionQualityScore || 0) || rankSetupCandidate(b) - rankSetupCandidate(a);
}

function chooseDisplayCandidate(candidates: SetupCandidate[]): SetupCandidate | null {
  return candidates
    .filter(hasDetectedOpportunity)
    .sort(qualitySort)[0] || null;
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

function candidateInvalidatedByCurrentPrice(candidate: SetupCandidate, chartContext: ChartContext): boolean {
  if (
    candidate.direction !== 'LONG' &&
    candidate.direction !== 'SHORT'
  ) {
    return false;
  }
  const invalidationPrice = isValidPrice(candidate.stop)
    ? candidate.stop
    : parsePrice(candidate.invalidation);
  if (!isValidPrice(invalidationPrice)) return false;

  const currentPrice = parsePrice(chartContext.keyLevels.currentPrice);
  const candles = chartContext.candles || [];
  const latestCandle = candles[candles.length - 1];
  const latestHigh = parsePrice(latestCandle?.high);
  const latestLow = parsePrice(latestCandle?.low);

  if (candidate.direction === 'LONG') {
    return (
      (currentPrice !== null && currentPrice <= invalidationPrice) ||
      (latestLow !== null && latestLow <= invalidationPrice)
    );
  }

  return (
    (currentPrice !== null && currentPrice >= invalidationPrice) ||
    (latestHigh !== null && latestHigh >= invalidationPrice)
  );
}

function blockInvalidatedCandidates(candidates: SetupCandidate[], chartContext: ChartContext): SetupCandidate[] {
  return candidates.map((candidate) => {
    if (!candidateInvalidatedByCurrentPrice(candidate, chartContext)) return candidate;

    return {
      ...candidate,
      detectedStatus: SetupCandidateStatus.Blocked,
      executionStatus: ExecutionStatus.Blocked,
      blockReason: NoTradeReason.InvalidStopLocation,
      missingEvidence: Array.from(new Set([
        ...(candidate.missingEvidence || []),
        'Candidate invalidated: current 5M price action has already traded through the structure stop/invalidation.',
      ])),
      nextAction: 'Candidate invalidated. Stand down; do not reuse this stale entry/stop plan.',
    };
  });
}

function readableCandles(chartContext: ChartContext) {
  return (chartContext.candles || [])
    .filter((candle) =>
      isValidPrice(candle.open) &&
      isValidPrice(candle.high) &&
      isValidPrice(candle.low) &&
      isValidPrice(candle.close)
    )
    .sort((a, b) => a.index - b.index);
}

function buildAlreadyTriggeredLongReview(chartContext: ChartContext): EarlyMoveReview | null {
  const candles = readableCandles(chartContext);
  if (candles.length < 4) return null;

  let bestMove: {
    startIndex: number;
    extremeIndex: number;
    moveStart: number;
    moveExtreme: number;
    movePoints: number;
  } | null = null;

  for (let startIndex = 0; startIndex < candles.length - 1; startIndex += 1) {
    const startLow = candles[startIndex].low as number;
    for (let extremeIndex = startIndex + 1; extremeIndex < candles.length; extremeIndex += 1) {
      const extremeHigh = candles[extremeIndex].high as number;
      const movePoints = roundToTick(extremeHigh - startLow);
      if (!bestMove || movePoints > bestMove.movePoints) {
        bestMove = {
          startIndex,
          extremeIndex,
          moveStart: startLow,
          moveExtreme: extremeHigh,
          movePoints,
        };
      }
    }
  }

  if (!bestMove || bestMove.movePoints < TRADE_RULES.maxRiskPoints * 2) return null;

  const impulseCandles = candles.slice(bestMove.startIndex + 1, bestMove.extremeIndex + 1);
  const hasBullishExpansion = impulseCandles.some((candle) => {
    const body = Math.abs((candle.close as number) - (candle.open as number));
    const range = (candle.high as number) - (candle.low as number);
    return candle.direction === 'bullish' && (
      candle.isExpansion ||
      candle.bodyQuality === 'large' ||
      (range > 0 && body / range >= 0.6 && body >= TRADE_RULES.maxRiskPoints)
    );
  });
  if (!hasBullishExpansion) return null;

  const currentPrice = parsePrice(chartContext.keyLevels.currentPrice) ?? (candles[candles.length - 1].close as number);
  const distanceFromBase = currentPrice !== null ? roundToTick(currentPrice - bestMove.moveStart) : bestMove.movePoints;
  const alreadyExtended = distanceFromBase >= TRADE_RULES.maxRiskPoints * 2 || bestMove.movePoints >= TRADE_RULES.maxRiskPoints * 3;
  if (!alreadyExtended) return null;

  const triggerCandle = candles[bestMove.extremeIndex];
  const triggerArea = parsePrice(triggerCandle.close) ?? bestMove.moveExtreme;

  return {
    status: 'already_triggered_no_fresh_entry',
    direction: 'LONG',
    moveStart: bestMove.moveStart,
    moveExtreme: bestMove.moveExtreme,
    triggerArea,
    currentPrice,
    movePoints: bestMove.movePoints,
    freshEntryAvailable: false,
    summary: `First move detected - long opportunity may have already triggered from approximately ${bestMove.moveStart} toward ${bestMove.moveExtreme}.`,
    reason: 'The 5M execution chart shows an early upside expansion that is already extended beyond the app risk window. This is not a fresh executable entry.',
    action: 'Move is extended into resistance/liquidity. No fresh entry unless a new pullback/retest forms and passes the app-owned rule gates.',
    journalSuggestion: `Missed move review: expansion from approximately ${bestMove.moveStart} toward ${bestMove.moveExtreme} should be journaled as a missed/early move if no alert was generated.`,
    approvalBoundary: {
      approvesTrade: false,
      changesEntry: false,
      changesStop: false,
      changesTargets: false,
      changesRisk: false,
    },
  };
}

function buildEarlyMoveReview(chartContext: ChartContext, selectedCandidate: SetupCandidate | null): EarlyMoveReview | null {
  if (sessionKey(chartContext.sessionType) !== 'morning') return null;
  const review = buildAlreadyTriggeredLongReview(chartContext);
  if (!review) return null;
  if (selectedCandidate?.direction === 'LONG' && selectedCandidate.executionStatus === ExecutionStatus.Executable) {
    return null;
  }
  return review;
}

function finalStatusFromSelection(
  selectedExecutable: SetupCandidate | null,
  selectedConditional: SetupCandidate | null,
  preliminaryFailure: TradeDecisionStepResult | undefined,
  hasLowQualityScreenshot = false,
  hasNoClearBias = false
): TradeDecisionStatus {
  if (preliminaryFailure?.noTradeReason === NoTradeReason.InvalidScreenshot) return TradeDecisionStatus.InvalidScreenshot;
  if (preliminaryFailure?.noTradeReason === NoTradeReason.OutsideTimeWindow) return TradeDecisionStatus.OutsideRules;
  if (preliminaryFailure) return TradeDecisionStatus.NoTrade;
  if (hasNoClearBias && (selectedExecutable || selectedConditional)) return TradeDecisionStatus.Wait;
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
  const chartContext = applyLevelSanity(buildChartContext(input));
  const setupScan = scanSetupCandidates({
    sessionType: input.sessionType,
    result: input.result,
    chartContext,
  });
  const setupCandidates = enrichDecisionQuality(applyTargetObjectivesToCandidates(
    blockInvalidatedCandidates(mergeSetupCandidates(setupScan.candidates, buildConditionalPlans(chartContext)), chartContext),
    chartContext.structuralLevels || []
  ), chartContext).sort(qualitySort);
  const selectedExecutable = setupCandidates.find((candidate) =>
    candidate.executionStatus === ExecutionStatus.Executable &&
    hasActionablePlanLevels(candidate)
  ) || null;
  const selectedConditional = setupCandidates.find((candidate) =>
    candidate.executionStatus === ExecutionStatus.Conditional &&
    hasActionablePlanLevels(candidate)
  ) || null;
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
  const hasNoClearBias = bias === BiasDirection.NoBias;
  const setupAssessment: SetupAssessment = {
    setupType: selectedCandidate?.setupType || displayCandidate?.setupType || SetupType.NoSetup,
    status: selectedCandidate ? TradeDecisionStatus.ConditionalTrade : TradeDecisionStatus.NoTrade,
    confidence: selectedCandidate?.confidence || displayCandidate?.confidence || 'Low',
    entryTrigger: selectedCandidate?.requiredTrigger || displayCandidate?.requiredTrigger || null,
    invalidation: selectedCandidate?.invalidation || displayCandidate?.invalidation || 'No valid invalidation defined.',
    reasoning: selectedCandidate?.nextAction || displayCandidate?.nextAction || 'No executable or conditional setup survived deterministic scan.',
    noTradeReason: selectedCandidate?.blockReason || displayCandidate?.blockReason || null,
    decisionQualityScore: selectedCandidate?.decisionQualityScore ?? displayCandidate?.decisionQualityScore ?? null,
    decisionQualityRecommendation: selectedCandidate?.decisionQualityRecommendation ?? displayCandidate?.decisionQualityRecommendation ?? null,
    decisionQualityScorecard: selectedCandidate?.decisionQualityScorecard ?? displayCandidate?.decisionQualityScorecard ?? [],
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
    makeStep(
      TradeDecisionStep.DetermineBias,
      hasNoClearBias ? (selectedCandidate ? 'warning' : 'fail') : 'pass',
      hasNoClearBias && selectedCandidate
        ? 'Bias is unresolved, so execution is blocked, but conditional planning remains visible.'
        : `Bias: ${bias}.`,
      true,
      hasNoClearBias ? NoTradeReason.NoClearBias : undefined
    ),
    makeStep(TradeDecisionStep.CheckApprovedTimeWindow, isWindowApproved ? 'pass' : 'fail', isReplay ? 'Replay mode uses entered trade date/session.' : `Live window status: ${windowStatus}.`, true, NoTradeReason.OutsideTimeWindow),
  ];

  const preliminaryFailure = firstFailure(auditTrail);
  const finalStatus = finalStatusFromSelection(selectedExecutable, selectedConditional, preliminaryFailure, hasLowQualityScreenshot, hasNoClearBias);
  const finalNoTradeReason =
    (finalStatus === TradeDecisionStatus.NoTrade || finalStatus === TradeDecisionStatus.InvalidScreenshot || finalStatus === TradeDecisionStatus.OutsideRules
      ? preliminaryFailure?.noTradeReason
      : undefined) ||
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
      riskAssessment.reasoning,
      true,
      undefined
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
  const earlyMoveReview = buildEarlyMoveReview(chartContext, selectedCandidate);

  return {
    status: finalStatus,
    step: TradeDecisionStep.SaveJournalReadyRecord,
    chartContext,
    biasAssessment,
    setupAssessment,
    setupCandidates,
    opportunitySelection,
    earlyMoveReview,
    riskAssessment,
    finalTradePlan: finalPlan,
    noTradeReason: finalPlan.noTradeReason,
    journalReady: true,
    auditTrail,
    target1: finalPlan.target1 ?? null,
    target2: finalPlan.target2 ?? null,
  };
}
