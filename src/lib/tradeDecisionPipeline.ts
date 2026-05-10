import {
  AnalysisResult,
  BiasAssessment,
  BiasDirection,
  ChartContext,
  FinalTradePlan,
  KeyLevels,
  NoTradeReason,
  RiskAssessment,
  RiskStatus,
  SetupAssessment,
  SetupType,
  TradeDecision,
  TradeDecisionStatus,
  TradeDecisionStep,
} from '../types';
import { DECISION_STEPS, DECISION_STEP_LABELS } from '../config/decisionSteps';
import { TRADE_RULES } from '../config/tradeRules';
import { getWindowStatus } from '../config/timeWindows';

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
  return {
    midnightOpen: result?.midnightOpenPrice ?? result?.midnightAnalysis?.level ?? null,
    initialBalanceHigh: result?.midnightAnalysis?.band?.[1] ?? null,
    initialBalanceLow: result?.midnightAnalysis?.band?.[0] ?? null,
    ethHigh: result?.ethContextReview?.ethHigh ?? null,
    ethLow: result?.ethContextReview?.ethLow ?? null,
    asianHigh: result?.ethContextReview?.asianHigh ?? null,
    asianLow: result?.ethContextReview?.asianLow ?? null,
    londonHigh: result?.ethContextReview?.londonHigh ?? null,
    londonLow: result?.ethContextReview?.londonLow ?? null,
    nyPremarketHigh: result?.ethContextReview?.nyPremarketHigh ?? null,
    nyPremarketLow: result?.ethContextReview?.nyPremarketLow ?? null,
  };
}

function buildChartContext(input: TradeDecisionPipelineInput): ChartContext {
  return {
    sessionType: input.sessionType,
    instrument: input.instrument || 'MES',
    tradeDate: input.tradeDate || new Date().toISOString().split('T')[0],
    timeframe: '5m',
    screenshotTimestamp: input.result?.sessionLog?.timestamp ?? null,
    screenshotUsability: input.screenshotUsability || (input.result ? 'usable' : 'unusable'),
    screenshotWarning: input.screenshotWarning || null,
    keyLevels: buildKeyLevels(input.result),
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
  if (!candidate.invalidation || candidate.invalidation.trim().length < 3) return NoTradeReason.InvalidStopLocation;
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

export function runTradeDecisionPipeline(input: TradeDecisionPipelineInput): TradeDecisionPipelineResult {
  const chartContext = buildChartContext(input);
  const candidates = candidatesFromResult(input.result);
  const selectedCandidate = chooseCandidate(candidates, input.sessionType);
  const fallbackCandidate = selectedCandidate || candidates[0] || null;
  const blocker = selectedCandidate ? null : (fallbackCandidate ? candidateBlocker(fallbackCandidate, input.sessionType) : NoTradeReason.NoApprovedSetup);
  const bias = inferBias(input.result);
  const riskAssessment = makeRiskAssessment(selectedCandidate || fallbackCandidate);
  const computedTargets = selectedCandidate ? targets(selectedCandidate.direction, selectedCandidate.entry, selectedCandidate.stop) : { target: null, target1: null, target2: null };
  const liveWindow = sessionKey(input.sessionType);
  const isReplay = input.sessionType === 'replay_morning' || input.sessionType === 'replay_lunch';
  const windowStatus = isReplay ? 'active' : input.windowStatusOverride || getWindowStatus(liveWindow);
  const isWindowApproved = isReplay || windowStatus === 'active';
  const hasUsableScreenshot = chartContext.screenshotUsability !== 'unusable';
  const hasInstrument = TRADE_RULES.instruments.includes(chartContext.instrument);
  const setupAssessment: SetupAssessment = {
    setupType: selectedCandidate?.setupType || fallbackCandidate?.setupType || SetupType.NoSetup,
    status: selectedCandidate ? TradeDecisionStatus.ConditionalTrade : TradeDecisionStatus.NoTrade,
    confidence: selectedCandidate?.confidence || fallbackCandidate?.confidence || 'Low',
    entryTrigger: selectedCandidate?.entryTrigger || fallbackCandidate?.entryTrigger || null,
    invalidation: selectedCandidate?.invalidation || fallbackCandidate?.invalidation || 'No valid invalidation defined.',
    reasoning: selectedCandidate?.reasoning || fallbackCandidate?.reasoning || 'No approved setup survived deterministic gates.',
    noTradeReason: blocker,
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
    makeStep(TradeDecisionStep.IdentifySetupType, selectedCandidate ? 'pass' : 'fail', selectedCandidate ? `Setup: ${selectedCandidate.setupName}.` : 'No approved setup type survived gates.', true, blocker || NoTradeReason.NoApprovedSetup),
    makeStep(TradeDecisionStep.ValidateEntryTrigger, isValidPrice(selectedCandidate?.entry) ? (selectedCandidate?.entryTrigger ? 'pass' : 'warning') : 'fail', selectedCandidate?.entryTrigger || 'No measurable entry trigger.', true, NoTradeReason.EntryTriggerMissing),
    makeStep(TradeDecisionStep.ValidateStopLocation, selectedCandidate && stopTiedToStructure(selectedCandidate) ? 'pass' : 'fail', selectedCandidate?.invalidation || 'Stop is not tied to active swing/structure.', true, NoTradeReason.InvalidStopLocation),
    makeStep(TradeDecisionStep.ValidateRiskLimit, riskAssessment.status === RiskStatus.Blocked || riskAssessment.status === RiskStatus.Unknown ? 'fail' : riskAssessment.status === RiskStatus.Warning ? 'warning' : 'pass', riskAssessment.reasoning, true, riskAssessment.status === RiskStatus.Blocked ? NoTradeReason.RiskTooWide : undefined),
    makeStep(TradeDecisionStep.DetermineTargetModel, isValidPrice(computedTargets.target1) && isValidPrice(computedTargets.target2) ? 'pass' : 'fail', 'Targets use app model: T1 = 1.5R, T2 = 2.0R.', true, NoTradeReason.TargetsUnavailable),
    makeStep(TradeDecisionStep.DefineInvalidation, selectedCandidate?.invalidation ? 'pass' : 'fail', selectedCandidate?.invalidation || 'Invalidation is required.', true, NoTradeReason.InvalidStopLocation),
  ];

  const failure = firstFailure(auditTrail);
  const finalStatus =
    failure?.noTradeReason === NoTradeReason.InvalidScreenshot ? TradeDecisionStatus.InvalidScreenshot :
    failure?.noTradeReason === NoTradeReason.OutsideTimeWindow ? TradeDecisionStatus.OutsideRules :
    failure?.noTradeReason === NoTradeReason.EntryTriggerPending ? TradeDecisionStatus.Wait :
    failure ? TradeDecisionStatus.NoTrade :
    selectedCandidate?.entryTrigger ? TradeDecisionStatus.ConditionalTrade :
    TradeDecisionStatus.ApprovedTrade;

  const finalPlan: FinalTradePlan = {
    status: finalStatus,
    direction: selectedCandidate?.direction || 'NO TRADE',
    setupType: selectedCandidate?.setupType || SetupType.NoSetup,
    entry: finalStatus === TradeDecisionStatus.ApprovedTrade || finalStatus === TradeDecisionStatus.ConditionalTrade ? selectedCandidate?.entry ?? null : null,
    stop: finalStatus === TradeDecisionStatus.ApprovedTrade || finalStatus === TradeDecisionStatus.ConditionalTrade ? selectedCandidate?.stop ?? null : null,
    target: finalStatus === TradeDecisionStatus.ApprovedTrade || finalStatus === TradeDecisionStatus.ConditionalTrade ? computedTargets.target : null,
    target1: finalStatus === TradeDecisionStatus.ApprovedTrade || finalStatus === TradeDecisionStatus.ConditionalTrade ? computedTargets.target1 : null,
    target2: finalStatus === TradeDecisionStatus.ApprovedTrade || finalStatus === TradeDecisionStatus.ConditionalTrade ? computedTargets.target2 : null,
    invalidation: selectedCandidate?.invalidation || failure?.message || 'No valid invalidation defined.',
    risk: riskAssessment,
    confidence: selectedCandidate?.confidence || 'Low',
    reasoning: selectedCandidate?.reasoning || failure?.message || 'No approved trade.',
    noTradeReason: failure?.noTradeReason || blocker || null,
  };

  auditTrail.push(
    makeStep(TradeDecisionStep.DecideTradeOrNoTrade, failure ? 'fail' : 'pass', failure ? `Decision blocked: ${failure.message}` : `Decision: ${finalStatus}.`, true, failure?.noTradeReason),
    makeStep(TradeDecisionStep.GenerateFinalTradePlan, finalPlan.status === TradeDecisionStatus.NoTrade || finalPlan.status === TradeDecisionStatus.InvalidScreenshot || finalPlan.status === TradeDecisionStatus.OutsideRules ? 'warning' : 'pass', 'Final plan generated by deterministic app pipeline.', true, finalPlan.noTradeReason || undefined),
    makeStep(TradeDecisionStep.SaveJournalReadyRecord, 'pass', 'Journal-ready payload can be saved after analysis/outcome.', false),
  );

  return {
    status: finalStatus,
    step: TradeDecisionStep.SaveJournalReadyRecord,
    chartContext,
    biasAssessment,
    setupAssessment,
    riskAssessment,
    finalTradePlan: finalPlan,
    noTradeReason: finalPlan.noTradeReason,
    journalReady: true,
    auditTrail,
    target1: finalPlan.target1 ?? null,
    target2: finalPlan.target2 ?? null,
  };
}
