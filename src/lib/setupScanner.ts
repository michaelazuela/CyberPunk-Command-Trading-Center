import {
  AnalysisResult,
  ChartContext,
  ExecutionStatus,
  NoTradeReason,
  SetupCandidate,
  SetupCandidateStatus,
  SetupType,
  TradingPlanCandidateState,
} from '../types';
import { targetsFromEntryStop, TRADE_RULES } from '../config/tradeRules';
import {
  getPrimarySetupRegistry,
  SetupRegistryEntry,
  SetupSession,
} from '../config/setupRegistry';
import { describeHtfLiquidityDrawStateForDisplay, describeTimeframeMssStateForDisplay } from './htfLiquidityDrawEngine';

type Direction = SetupCandidate['direction'];
type Confidence = SetupCandidate['confidence'];
type ReadConfidence = Exclude<ChartContext['levelReadConfidence'], undefined>;

export const HTF_MSS_CANDIDATE_CONFIDENCE_THRESHOLD = 70;

interface ZoneOverlap {
  valid: boolean;
  low: number | null;
  high: number | null;
}

interface BreakerFvgOverlapConfluence {
  breakerFvgOverlap: boolean;
  overlapZone: ZoneOverlap;
  entryInside: boolean;
  reason: string;
}

interface ExtractedPlanFacts {
  text: string;
  direction: Direction;
  entry: number | null;
  stop: number | null;
  invalidation: string | null;
  requiredTrigger: string | null;
  triggerState: string | null;
  confidence: Confidence | null;
}

interface ModelOneValidation {
  detected: boolean;
  possible: boolean;
  direction: Direction;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  risk: number | null;
  invalidation: string | null;
  requiredTrigger: string | null;
  confidence: Confidence;
  evidence: string[];
  missingEvidence: string[];
  hasPendingTrigger: boolean;
}

type TurtleSoupValidation = ModelOneValidation;

interface EstablishedSweepLevelResult {
  established: boolean;
  reason: string | null;
  missingReason: string | null;
}

interface CandidateQualityContext {
  evidence: string[];
  missingEvidence: string[];
  score: number;
  forceConditional: boolean;
}

export interface SetupScannerInput {
  sessionType: SetupSession;
  result?: AnalysisResult | null;
  chartContext?: ChartContext | null;
  contextText?: string;
}

export interface SetupScanResult {
  candidates: SetupCandidate[];
  bestExecutableCandidate: SetupCandidate | null;
  bestConditionalCandidate: SetupCandidate | null;
}

function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) return value.map(normalizeText).join(' ');
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).map(normalizeText).join(' ');
  return '';
}

function buildSearchText(input: SetupScannerInput): string {
  const result = input.result;
  return [
    input.contextText,
    result?.dayType,
    result?.reasoning,
    result?.levelCheck,
    result?.structureStatus,
    normalizeText(result?.current_rule_analysis),
    normalizeText(result?.candidate_trade_plans),
    normalizeText(result?.best_trade_plan),
    normalizeText(result?.final_trade_plan),
    normalizeText(result?.tradePlan),
    normalizeText(result?.tags),
    normalizeText(result?.checks),
  ].filter(Boolean).join(' ').toUpperCase();
}

function hasAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword.toUpperCase()));
}

function inferDirection(text: string): Direction {
  if (text.includes('NO TRADE')) return 'NO TRADE';
  const longScore = [' LONG', 'BULLISH', 'BUY', 'SUPPORT', 'RECLAIM'].filter((token) => text.includes(token)).length;
  const shortScore = [' SHORT', 'BEARISH', 'SELL', 'RESISTANCE', 'REJECT'].filter((token) => text.includes(token)).length;
  if (longScore > shortScore) return 'LONG';
  if (shortScore > longScore) return 'SHORT';
  return 'NO TRADE';
}

function parsePrice(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

function roundToTick(price: number): number {
  return Math.round(price / TRADE_RULES.targetModel.tickSize) * TRADE_RULES.targetModel.tickSize;
}

function confidenceFrom(value: unknown): Confidence | null {
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
    return 'Low';
  }
  return null;
}

function confidenceForStatus(status: SetupCandidateStatus): SetupCandidate['confidence'] {
  if (status === SetupCandidateStatus.Detected || status === SetupCandidateStatus.Blocked) return 'High';
  if (status === SetupCandidateStatus.Possible || status === SetupCandidateStatus.Conditional) return 'Medium';
  return 'Low';
}

function isReadableConfidence(confidence: ReadConfidence | null | undefined): boolean {
  return confidence === 'High' || confidence === 'Medium';
}

function hasStructuredChartFacts(chartContext?: ChartContext | null): boolean {
  if (!chartContext) return false;
  return Boolean(
    chartContext.setupEvidence ||
    chartContext.candleFacts ||
    chartContext.marketStructure ||
    chartContext.candles?.length ||
    chartContext.swings?.length ||
    chartContext.fvgZones?.length ||
    chartContext.liquidityEvents?.length ||
    chartContext.liquiditySweeps?.length ||
    chartContext.reclaimEvents?.length ||
    chartContext.failedBreakEvents?.length ||
    chartContext.displacementCandles?.length ||
    chartContext.setupReadyFacts ||
    chartContext.multiTimeframeContext ||
    chartContext.extractedLevels?.length ||
    chartContext.gapContext ||
    chartContext.compressionRange ||
    chartContext.levelReadConfidence ||
    chartContext.candleReadConfidence ||
    chartContext.structureReadConfidence ||
    chartContext.setupReadConfidence ||
    chartContext.entryStopConfidence
  );
}

function extractPlanFacts(result: AnalysisResult | null | undefined): ExtractedPlanFacts[] {
  if (!result) return [];
  const facts: ExtractedPlanFacts[] = [];
  const pushFact = (source: Record<string, unknown> | null | undefined, fallbackText: string) => {
    if (!source) return;
    const text = normalizeText(source) || fallbackText;
    const upperText = text.toUpperCase();
    facts.push({
      text: upperText,
      direction: inferDirection(upperText),
      entry: parsePrice(source.entry),
      stop: parsePrice(source.stop),
      invalidation: typeof source.invalidation === 'string'
        ? source.invalidation
        : typeof source.what_would_invalidate === 'string'
          ? source.what_would_invalidate
          : result.levelCheck || result.structureStatus || null,
      requiredTrigger: typeof source.entry_trigger === 'string'
        ? source.entry_trigger
        : typeof source.required_trigger === 'string'
          ? source.required_trigger
          : null,
      triggerState: typeof source.trigger_state === 'string' ? source.trigger_state : null,
      confidence: confidenceFrom(source.confidence ?? source.base_confidence ?? source.final_confidence ?? result.confidence),
    });
  };

  pushFact(result.current_rule_analysis as Record<string, unknown> | undefined, 'Current rule analysis');
  pushFact(result.best_trade_plan as unknown as Record<string, unknown> | undefined, 'Best trade plan');
  pushFact(result.final_trade_plan as Record<string, unknown> | undefined, 'Final trade plan');
  pushFact(result.tradePlan as unknown as Record<string, unknown> | undefined, 'Legacy trade plan');
  result.candidate_trade_plans?.forEach((plan) => pushFact(plan as unknown as Record<string, unknown>, 'Candidate trade plan'));

  return facts;
}

function findRelevantFacts(entry: SetupRegistryEntry, facts: ExtractedPlanFacts[], text: string): ExtractedPlanFacts[] {
  const keywords = [...entry.detectionKeywords, ...entry.possibleKeywords, ...entry.aliases].map((keyword) => keyword.toUpperCase());
  const relevant = facts.filter((fact) => keywords.some((keyword) => fact.text.includes(keyword)));
  if (relevant.length > 0) return relevant;
  if (hasAny(text, [...entry.detectionKeywords, ...entry.aliases, ...entry.possibleKeywords])) {
    return facts;
  }
  return [];
}

function evidenceKeyForSetup(setupType: SetupType): keyof NonNullable<ChartContext['setupEvidence']> | null {
  switch (setupType) {
    case SetupType.SweepMssFvgRetrace: return 'liquiditySweep';
    case SetupType.OrderBlock618: return 'orderBlockRetest';
    case SetupType.LiquiditySweep: return 'liquiditySweep';
    case SetupType.TurtleSoup: return 'liquiditySweep';
    case SetupType.MomentumRunaway: return 'momentumRunaway';
    case SetupType.FairValueGap: return 'fairValueGap';
    case SetupType.FvgImbalancePullback: return 'imbalancePullback';
    case SetupType.MarketStructureShift: return 'marketStructureShift';
    case SetupType.OpeningOrderBlock: return 'openingOrderBlock';
    case SetupType.EqualHighsLows: return 'equalHighsEqualLows';
    case SetupType.InitialBalanceExtension: return 'initialBalanceExtension';
    case SetupType.PreviousDaySweep: return 'previousDayHighLowSweep';
    case SetupType.CompressionBreakout: return 'compressionBreakout';
    case SetupType.OpeningGapFill: return 'openingGapFill';
    case SetupType.BreakerBlock: return 'breakerBlock';
    case SetupType.AlgoKillZone: return 'algoKillZone';
    case SetupType.MitigationBlock: return 'mitigationBlock';
    case SetupType.MomentumPullbackBreatherReclaim: return 'momentumPullbackBreatherReclaim';
    case SetupType.MorningFailedHighLiquidityRejection: return 'morningFailedHighLiquidityRejection';
    case SetupType.MorningReclaimLong: return 'morningReclaimLong';
    case SetupType.MorningOpeningRangeContinuation: return 'openingRangeContinuation';
    case SetupType.LunchFailedHighReversal: return 'lunchFailedHighReversal';
    case SetupType.LunchFailedLowReversal: return 'lunchFailedLowReversal';
    case SetupType.LunchCompressionBreakout: return 'lunchCompressionBreakout';
    case SetupType.LunchFailedContinuation: return 'lunchFailedContinuation';
    case SetupType.LunchRangeReclaim: return 'lunchRangeReclaim';
    default: return null;
  }
}

function supportingEvidenceNotes(chartContext?: ChartContext | null): string[] {
  if (!chartContext) return [];
  const notes: string[] = [];
  if ([...(chartContext.liquidityEvents || []), ...(chartContext.liquiditySweeps || [])].some((event) => event.type === 'sweep' && isReadableConfidence(event.confidence))) {
    notes.push('Supporting evidence: liquidity sweep fact present.');
  }
  if ([...(chartContext.liquidityEvents || []), ...(chartContext.liquiditySweeps || [])].some((event) => event.reclaimed && isReadableConfidence(event.confidence))) {
    notes.push('Supporting evidence: reclaim after sweep fact present.');
  }
  if (chartContext.fvgZones?.some((zone) => isReadableConfidence(zone.confidence))) {
    notes.push('Supporting evidence: imbalance zone fact present.');
  }
  if (chartContext.marketStructure?.marketStructureShift || chartContext.setupReadyFacts?.breakOfStructure) {
    notes.push('Supporting evidence: market structure shift fact present.');
  }
  if (chartContext.liquidityEvents?.some((event) => (event.type === 'equal_highs' || event.type === 'equal_lows') && isReadableConfidence(event.confidence))) {
    notes.push('Supporting evidence: resting liquidity pool fact present.');
  }
  if (chartContext.liquidityEvents?.some((event) => (event.type === 'pdh_sweep' || event.type === 'pdl_sweep') && isReadableConfidence(event.confidence))) {
    notes.push('Supporting evidence: previous day sweep fact present.');
  }
  return notes;
}

function isLunchSubtype(setupType: SetupType): boolean {
  return setupType === SetupType.LunchFailedHighReversal ||
    setupType === SetupType.LunchFailedLowReversal ||
    setupType === SetupType.LunchCompressionBreakout ||
    setupType === SetupType.LunchFailedContinuation ||
    setupType === SetupType.LunchRangeReclaim;
}

function isLunchSession(sessionType: SetupSession): boolean {
  return sessionType === 'lunch' || sessionType === 'replay_lunch';
}

function isMorningOrLunchSession(sessionType?: ChartContext['sessionType'] | SetupSession | null): boolean {
  return sessionType === 'morning' ||
    sessionType === 'replay_morning' ||
    sessionType === 'lunch' ||
    sessionType === 'replay_lunch';
}

function isInsideApprovedSetupScanWindow(chartContext?: ChartContext | null): boolean {
  if (!chartContext || !isMorningOrLunchSession(chartContext.sessionType)) return false;
  const minutes = latestChartMinutes(chartContext);
  if (minutes === null) return false;
  if (chartContext.sessionType === 'morning' || chartContext.sessionType === 'replay_morning') {
    return minutes >= 10 * 60 && minutes < 12 * 60;
  }
  if (chartContext.sessionType === 'lunch' || chartContext.sessionType === 'replay_lunch') {
    return minutes >= 12 * 60 && minutes < 15 * 60 + 30;
  }
  return false;
}

function bigPictureStructureForDirection(chartContext: ChartContext | null | undefined, direction: Direction): {
  bias: 'LONG' | 'SHORT' | null;
  countertrend: boolean;
  evidence: string | null;
  missingEvidence: string | null;
} {
  const alignedDirection = chartContext?.multiTimeframeContext?.alignment?.alignedDirection;
  if (
    !isMorningOrLunchSession(chartContext?.sessionType) ||
    (direction !== 'LONG' && direction !== 'SHORT') ||
    (alignedDirection !== 'LONG' && alignedDirection !== 'SHORT')
  ) {
    return { bias: null, countertrend: false, evidence: null, missingEvidence: null };
  }

  const structure = alignedDirection === 'LONG' ? 'bullish' : 'bearish';
  const evidence = `Big-picture structure is ${structure}`;
  return {
    bias: alignedDirection,
    countertrend: alignedDirection !== direction,
    evidence,
    missingEvidence: alignedDirection !== direction
      ? 'Countertrend setup requires immediate failure confirmation; do not fight big-picture structure'
      : null,
  };
}

function latestChartMinutes(chartContext?: ChartContext | null): number | null {
  const explicit = minutesFromTimestamp(chartContext?.chartTimestamp || chartContext?.screenshotTimestamp);
  if (explicit !== null) return explicit;
  const candles = chartContext?.candles || [];
  return minutesFromTimestamp(candles[candles.length - 1]?.timestamp);
}

function timeWindowQualityContext(chartContext?: ChartContext | null): CandidateQualityContext {
  const minutes = latestChartMinutes(chartContext);
  const sessionType = chartContext?.sessionType;
  if (minutes === null || !isMorningOrLunchSession(sessionType)) {
    return { evidence: [], missingEvidence: [], score: 0, forceConditional: false };
  }

  if (sessionType === 'morning' || sessionType === 'replay_morning') {
    if (minutes >= 9 * 60 + 30 && minutes < 10 * 60) {
      return {
        evidence: ['Opening observation window'],
        missingEvidence: ['Opening observation window; wait for confirmed post-open structure'],
        score: -4,
        forceConditional: false,
      };
    }
    if (minutes >= 10 * 60 && minutes < 12 * 60) {
      return { evidence: ['Active window: Morning setup scan, 10:00-12:00 ET'], missingEvidence: [], score: 8, forceConditional: false };
    }
  }

  if (sessionType === 'lunch' || sessionType === 'replay_lunch') {
    if (minutes >= 12 * 60 && minutes < 15 * 60 + 30) {
      return { evidence: ['Active window: Lunch/PM setup scan, 12:00-15:30 ET'], missingEvidence: [], score: 6, forceConditional: false };
    }
  }

  return { evidence: [], missingEvidence: ['Outside active setup scan window'], score: -20, forceConditional: false };
}

function liquidityDrawContext(chartContext: ChartContext | null | undefined, direction: Direction): CandidateQualityContext {
  if (!chartContext || (direction !== 'LONG' && direction !== 'SHORT')) {
    return { evidence: [], missingEvidence: [], score: 0, forceConditional: false };
  }
  const opposingTarget = (chartContext.targetObjectives || []).some((target) =>
    target.direction === direction &&
    (target.type === 'liquidity_pool' || target.type === 'high' || target.type === 'low') &&
    isReadableConfidence(target.confidence)
  );
  const directionalLevel = [
    ...(chartContext.structuralLevels || []),
    ...(chartContext.sessionLevelContext?.levels || []),
  ].some((level) =>
    isReadableConfidence(level.confidence) &&
    (level.type === 'liquidity_pool' || level.type === 'high' || level.type === 'low' || level.type === 'swing') &&
    (level.directionRelevance === direction || level.directionRelevance === 'BOTH')
  );

  const keyLevels = chartContext.keyLevels || {};
  const keyLevelDraw = direction === 'LONG'
    ? Boolean(keyLevels.previousDayHigh || keyLevels.priorDayHigh || keyLevels.overnightHigh || keyLevels.asianHigh || keyLevels.londonHigh || keyLevels.nyPremarketHigh || keyLevels.activeSwingHigh)
    : Boolean(keyLevels.previousDayLow || keyLevels.priorDayLow || keyLevels.overnightLow || keyLevels.asianLow || keyLevels.londonLow || keyLevels.nyPremarketLow || keyLevels.activeSwingLow);

  if (opposingTarget || directionalLevel || keyLevelDraw) {
    return { evidence: ['Draw on opposing liquidity identified'], missingEvidence: [], score: 6, forceConditional: false };
  }
  return { evidence: [], missingEvidence: ['No clear draw on liquidity'], score: -6, forceConditional: false };
}

function sweepFirstContext(validation: ModelOneValidation | null): CandidateQualityContext {
  if (!validation) return { evidence: [], missingEvidence: [], score: 0, forceConditional: false };
  const hasSweep = validation.evidence.some((item) =>
    item === 'Liquidity sweep confirmed' ||
    item === 'Liquidity raid confirmed' ||
    item.includes('Sweep below') ||
    item.includes('Sweep above')
  );
  const hasReclaim = validation.evidence.includes('Reclaim after sweep confirmed');
  if (hasSweep && hasReclaim) {
    return { evidence: ['Sweep-first sequence confirmed'], missingEvidence: [], score: 5, forceConditional: false };
  }
  if (hasSweep && !hasReclaim) {
    return { evidence: [], missingEvidence: ['Do not enter on sweep candle; reclaim confirmation required'], score: -10, forceConditional: true };
  }
  return { evidence: [], missingEvidence: [], score: 0, forceConditional: false };
}

function higherTimeframeThesisContext(chartContext: ChartContext | null | undefined, direction: Direction): CandidateQualityContext {
  if (!chartContext || (direction !== 'LONG' && direction !== 'SHORT')) {
    return { evidence: [], missingEvidence: [], score: 0, forceConditional: false };
  }
  const explicit = chartContext.higherTimeframeThesis;
  const thesisDirection = explicit?.direction && explicit.direction !== 'NO TRADE'
    ? explicit.direction
    : chartContext.multiTimeframeContext?.alignment?.alignedDirection || 'NO TRADE';
  if (thesisDirection !== 'LONG' && thesisDirection !== 'SHORT') {
    return {
      evidence: [],
      missingEvidence: ['Higher-timeframe thesis unclear; no-trade or conditional only'],
      score: -8,
      forceConditional: false,
    };
  }
  const aligned = thesisDirection === direction;
  const thesisText = thesisDirection === 'LONG' ? 'bullish' : 'bearish';
  const confidenceBonus = explicit?.confidence === 'High' ? 8 : explicit?.confidence === 'Medium' ? 5 : 3;
  return {
    evidence: [`Higher-timeframe thesis is ${thesisText}`],
    missingEvidence: aligned ? [] : ['Structure signal conflicts with higher-timeframe thesis'],
    score: aligned ? confidenceBonus : -14,
    forceConditional: !aligned,
  };
}

function meaningfulChochLocation(chartContext: ChartContext | null | undefined): boolean {
  if (!chartContext) return false;
  if (chartContext.structureQualityContext?.chochAtMeaningfulLocation) return true;
  const locationType = chartContext.structureQualityContext?.chochLocationType;
  if (locationType && locationType !== 'midrange' && locationType !== 'unknown') return true;
  const hasStrongLevel = [
    ...(chartContext.structuralLevels || []),
    ...(chartContext.sessionLevelContext?.levels || []),
  ].some((level) =>
    isReadableConfidence(level.confidence) &&
    (level.strengthLabel === 'High' || (level.strengthScore || 0) >= 60) &&
    (level.source !== 'current_window' || level.type === 'liquidity_pool')
  );
  return Boolean(
    hasStrongLevel ||
    (chartContext.fvgZones || []).some((zone) => isReadableConfidence(zone.confidence)) ||
    (chartContext.breakerZones || []).some((zone) => isReadableConfidence(zone.confidence))
  );
}

function inferredStructureQualityContext(
  chartContext: ChartContext | null | undefined,
  direction: Direction,
  validation: ModelOneValidation | null,
) {
  if (!chartContext || (direction !== 'LONG' && direction !== 'SHORT')) return null;
  if (chartContext.structureQualityContext) return chartContext.structureQualityContext;

  const hasBos = Boolean(chartContext.setupReadyFacts?.breakOfStructure || chartContext.marketStructure?.marketStructureShift);
  if (!hasBos) return null;

  const hasInducementSweep = Boolean(
    validation?.evidence.some((item) =>
      item === 'Liquidity sweep confirmed' ||
      item === 'Liquidity raid confirmed' ||
      item.includes('Sweep below') ||
      item.includes('Sweep above')
    ) ||
    chartContext.setupReadyFacts?.sweepThenReclaim ||
    (chartContext.liquidityEvents || []).some((event) => event.type === 'sweep' && event.direction === direction && isReadableConfidence(event.confidence))
  );
  const closeConfirmed = Boolean(
    chartContext.candleFacts?.closeAboveKeyLevel && direction === 'LONG' ||
    chartContext.candleFacts?.closeBelowKeyLevel && direction === 'SHORT' ||
    chartContext.setupReadyFacts?.breakOfStructure
  );
  const validPullback = Boolean(
    hasInducementSweep &&
    closeConfirmed &&
    (chartContext.candleFacts?.pullbackPresent || chartContext.setupReadyFacts?.pullbackIntoFvg || chartContext.setupReadyFacts?.fvgReclaimed)
  );
  return {
    direction,
    structureEvent: hasInducementSweep && closeConfirmed ? 'major_bos' : 'minor_bos',
    structureTimeframe: 'mixed',
    executionTimeframeConfirmed: closeConfirmed,
    inducementSwept: hasInducementSweep,
    validPullbackConfirmed: validPullback,
    structureBreakConfirmedByClose: closeConfirmed,
    wickOnlyBreak: !closeConfirmed,
    oldInducementStale: !hasInducementSweep,
    newInducementRequired: !hasInducementSweep,
    noChaseRequired: !hasInducementSweep,
    inducementFresh: hasInducementSweep,
    inducementAgeBars: null,
    chochAtMeaningfulLocation: false,
    chochLocationType: 'unknown',
    conflictsWithHigherTimeframeThesis: false,
    reasons: [],
    missingReasons: [],
  } as const;
}

function structureQualityContext(
  chartContext: ChartContext | null | undefined,
  direction: Direction,
  validation: ModelOneValidation | null,
): CandidateQualityContext {
  const structure = inferredStructureQualityContext(chartContext, direction, validation);
  if (!structure) return { evidence: [], missingEvidence: [], score: 0, forceConditional: false };

  const evidence = [...(structure.reasons || [])];
  const missingEvidence = [...(structure.missingReasons || [])];
  let score = 0;
  let forceConditional = false;

  if (structure.structureBreakConfirmedByClose) {
    evidence.push('Structure break confirmed by candle close');
  } else if (structure.wickOnlyBreak) {
    missingEvidence.push('Wick-only break is not structure confirmation');
    score -= 12;
    forceConditional = true;
  }

  if (structure.structureEvent === 'major_bos' && structure.inducementSwept) {
    evidence.push('Major BOS confirmed after inducement sweep');
    evidence.push('Liquidity engineered before structure break');
    evidence.push('Structure supports continuation');
    score += 12;
  }

  if (structure.structureEvent === 'minor_bos' || (!structure.inducementSwept && structure.newInducementRequired)) {
    missingEvidence.push('Minor BOS only');
    missingEvidence.push('Inducement was not swept before structure break');
    missingEvidence.push('Wait for new inducement sweep');
    missingEvidence.push('Do not chase BOS candle');
    missingEvidence.push('A break of structure confirms direction only after liquidity has been engineered. If inducement was not swept, treat the break as minor and wait for the new inducement.');
    if (structure.oldInducementStale) missingEvidence.push('Original inducement is stale');
    score -= 22;
    forceConditional = true;
  }

  if (structure.validPullbackConfirmed) {
    evidence.push('Valid pullback confirmed');
    evidence.push('Pullback grab occurred');
    evidence.push('Closing break confirmed');
    score += 7;
  } else if (structure.inducementSwept && !structure.structureBreakConfirmedByClose) {
    missingEvidence.push('Pullback grab occurred; closing break required');
    score -= 8;
    forceConditional = true;
  }

  if (structure.structureEvent === 'choch') {
    if (structure.chochAtMeaningfulLocation || meaningfulChochLocation(chartContext)) {
      evidence.push('CHOCH at meaningful higher-timeframe level');
      score += 5;
    } else {
      missingEvidence.push('Random CHOCH location; do not flip bias yet');
      score -= 10;
      forceConditional = true;
    }
  }

  if (structure.conflictsWithHigherTimeframeThesis) {
    missingEvidence.push('Structure signal conflicts with higher-timeframe thesis');
    score -= 12;
    forceConditional = true;
  }

  return {
    evidence,
    missingEvidence,
    score,
    forceConditional,
  };
}

function reversalLogicIsStrong(validation: ModelOneValidation | null): boolean {
  if (!validation) return false;
  return validation.evidence.includes('Liquidity raid confirmed') &&
    validation.evidence.includes('Failed continuation confirmed') &&
    validation.evidence.includes('Reclaim after sweep confirmed');
}

function dealingRangeContext(
  chartContext: ChartContext | null | undefined,
  direction: Direction,
  validation: ModelOneValidation | null,
): CandidateQualityContext {
  if (!chartContext || (direction !== 'LONG' && direction !== 'SHORT')) {
    return { evidence: [], missingEvidence: [], score: 0, forceConditional: false };
  }
  const explicit = chartContext.dealingRangeQuality;
  const currentPrice = explicit?.currentPrice ?? parsePrice(chartContext.keyLevels.currentPrice);
  const rangeHigh = explicit?.rangeHigh ??
    parsePrice(chartContext.keyLevels.activeSwingHigh) ??
    parsePrice(chartContext.keyLevels.priorDayHigh) ??
    parsePrice(chartContext.keyLevels.overnightHigh);
  const rangeLow = explicit?.rangeLow ??
    parsePrice(chartContext.keyLevels.activeSwingLow) ??
    parsePrice(chartContext.keyLevels.priorDayLow) ??
    parsePrice(chartContext.keyLevels.overnightLow);
  const midpoint = explicit?.midpoint ?? (rangeHigh !== null && rangeLow !== null ? (rangeHigh + rangeLow) / 2 : null);
  const location = explicit?.location && explicit.location !== 'unknown'
    ? explicit.location
    : currentPrice !== null && midpoint !== null
      ? Math.abs(currentPrice - midpoint) <= TRADE_RULES.targetModel.tickSize * 2
        ? 'equilibrium'
        : currentPrice > midpoint ? 'premium' : 'discount'
      : 'unknown';

  if (location === 'unknown') return { evidence: [], missingEvidence: [], score: 0, forceConditional: false };

  const strongReversal = reversalLogicIsStrong(validation);
  if (direction === 'LONG' && location === 'discount') {
    return { evidence: ['Premium/discount alignment'], missingEvidence: [], score: 7, forceConditional: false };
  }
  if (direction === 'SHORT' && location === 'premium') {
    return { evidence: ['Premium/discount alignment'], missingEvidence: [], score: 7, forceConditional: false };
  }
  if ((direction === 'LONG' && location === 'premium') || (direction === 'SHORT' && location === 'discount')) {
    return strongReversal
      ? {
          evidence: ['Premium/discount conflict accepted only because reversal logic is strong'],
          missingEvidence: [],
          score: -2,
          forceConditional: false,
        }
      : {
          evidence: [],
          missingEvidence: [direction === 'LONG'
            ? 'Avoid longs in premium unless reversal logic is strong'
            : 'Avoid shorts in discount unless reversal logic is strong'],
          score: -14,
          forceConditional: true,
        };
  }

  return {
    evidence: ['Price near dealing range equilibrium; require cleaner confirmation'],
    missingEvidence: [],
    score: -3,
    forceConditional: false,
  };
}

function targetBeforeEntryContext(
  chartContext: ChartContext | null | undefined,
  direction: Direction,
  entry: number | null,
  risk: number | null,
): CandidateQualityContext {
  if (!chartContext || (direction !== 'LONG' && direction !== 'SHORT') || entry === null || risk === null || risk <= 0) {
    return { evidence: [], missingEvidence: [], score: 0, forceConditional: false };
  }
  const oneR = direction === 'LONG' ? entry + risk : entry - risk;
  const obstacle = (chartContext.targetObjectives || [])
    .filter((target) =>
      isReadableConfidence(target.confidence) &&
      target.type !== 'liquidity_pool' &&
      target.type !== 'high' &&
      target.type !== 'low' &&
      (direction === 'LONG'
        ? target.price > entry && target.price < oneR
        : target.price < entry && target.price > oneR)
    )
    .sort((a, b) => Math.abs(a.price - entry) - Math.abs(b.price - entry))[0];

  if (obstacle) {
    return {
      evidence: [],
      missingEvidence: [`Nearest obstacle sits before 1R at ${roundToTick(obstacle.price)}`],
      score: -24,
      forceConditional: true,
    };
  }

  return { evidence: ['No major obstacle before 1R'], missingEvidence: [], score: 5, forceConditional: false };
}

function displacementQualityContext(
  chartContext: ChartContext | null | undefined,
  direction: Direction,
): CandidateQualityContext {
  if (!chartContext || (direction !== 'LONG' && direction !== 'SHORT')) {
    return { evidence: [], missingEvidence: [], score: 0, forceConditional: false };
  }
  const displacement = (chartContext.displacementCandles || [])
    .filter((candle) => candle.direction === direction && isReadableConfidence(candle.confidence))
    .sort((a, b) => (b.displacementScore || 0) - (a.displacementScore || 0))[0];
  if (!displacement) return { evidence: [], missingEvidence: ['Displacement quality unavailable'], score: 0, forceConditional: false };

  const closeAtExtreme = direction === 'LONG'
    ? displacement.closeLocation === 'top_quarter'
    : displacement.closeLocation === 'bottom_quarter';
  const bodyQuality = (displacement.bodyToRange || 0) >= 0.6 || (displacement.displacementScore || 0) >= 75;
  const leavesFvg = Boolean(displacement.leavesImbalance);
  const breaksStructure = Boolean(displacement.breaksStructure);

  if ((displacement.quality === 'high_quality' || (bodyQuality && closeAtExtreme && leavesFvg && breaksStructure))) {
    return { evidence: ['Tier A displacement confirmed'], missingEvidence: [], score: 9, forceConditional: false };
  }
  if (displacement.quality === 'confirmed' || (bodyQuality && (closeAtExtreme || leavesFvg || breaksStructure))) {
    return { evidence: ['Tier B displacement confirmed'], missingEvidence: [], score: 5, forceConditional: false };
  }
  return {
    evidence: [],
    missingEvidence: ['Weak displacement quality; body, close location, or FVG left behind is insufficient'],
    score: -8,
    forceConditional: false,
  };
}

function sessionNarrativeContext(
  chartContext: ChartContext | null | undefined,
  direction: Direction,
): CandidateQualityContext {
  if (!chartContext || (direction !== 'LONG' && direction !== 'SHORT')) {
    return { evidence: [], missingEvidence: [], score: 0, forceConditional: false };
  }
  if (chartContext.marketStructure?.chopRangeCondition || chartContext.marketStructure?.compressionCondition || chartContext.sessionStory?.bias === 'WAIT' || chartContext.sessionStory?.bias === 'BALANCED') {
    return {
      evidence: ['Session narrative: chop'],
      missingEvidence: ['Chop/consolidation no-trade'],
      score: -25,
      forceConditional: true,
    };
  }

  const bias = chartContext.sessionStory?.bias;
  const directionalBias = bias === 'LONG' || bias === 'SHORT' ? bias : null;
  const expansion = Boolean(chartContext.marketStructure?.expansionCondition || (chartContext.displacementCandles || []).length);
  const retracement = Boolean(chartContext.candleFacts?.pullbackPresent || chartContext.setupReadyFacts?.pullbackIntoFvg || chartContext.setupReadyFacts?.fvgReclaimed);
  const reversal = Boolean((chartContext.failedBreakEvents || []).some((event) => event.direction === direction && isReadableConfidence(event.confidence)));

  if (reversal) {
    return { evidence: ['Session narrative: reversal'], missingEvidence: [], score: 5, forceConditional: false };
  }
  if (retracement) {
    return { evidence: ['Session narrative: retracement'], missingEvidence: [], score: 5, forceConditional: false };
  }
  if (expansion && (!directionalBias || directionalBias === direction)) {
    return { evidence: ['Session narrative: expansion'], missingEvidence: [], score: 4, forceConditional: false };
  }
  if (directionalBias && directionalBias !== direction) {
    return {
      evidence: [],
      missingEvidence: ['Session narrative conflicts with candidate direction'],
      score: -10,
      forceConditional: true,
    };
  }
  return { evidence: [], missingEvidence: [], score: 0, forceConditional: false };
}

function newsMacroCautionContext(chartContext: ChartContext | null | undefined): CandidateQualityContext {
  const caution = chartContext?.newsMacroCaution;
  if (!caution?.active) return { evidence: [], missingEvidence: [], score: 0, forceConditional: false };
  if (caution.confirmedAfterRelease) {
    return {
      evidence: ['High-impact news volatility already confirmed by post-release structure'],
      missingEvidence: [],
      score: -2,
      forceConditional: false,
    };
  }
  return {
    evidence: [],
    missingEvidence: [`High-impact news caution window${caution.eventLabel ? `: ${caution.eventLabel}` : ''}`],
    score: -20,
    forceConditional: true,
  };
}

function candidateQualityContext(
  chartContext: ChartContext | null | undefined,
  direction: Direction,
  validation: ModelOneValidation | null,
  entry: number | null,
  risk: number | null,
  includeMissing: boolean,
): CandidateQualityContext {
  const parts = [
    higherTimeframeThesisContext(chartContext, direction),
    timeWindowQualityContext(chartContext),
    liquidityDrawContext(chartContext, direction),
    sweepFirstContext(validation),
    structureQualityContext(chartContext, direction, validation),
    dealingRangeContext(chartContext, direction, validation),
    targetBeforeEntryContext(chartContext, direction, entry, risk),
    displacementQualityContext(chartContext, direction),
    sessionNarrativeContext(chartContext, direction),
    newsMacroCautionContext(chartContext),
  ];
  return {
    evidence: parts.flatMap((part) => part.evidence),
    missingEvidence: includeMissing ? parts.flatMap((part) => part.missingEvidence) : [],
    score: parts.reduce((sum, part) => sum + part.score, 0),
    forceConditional: parts.some((part) => part.forceConditional),
  };
}

function hasCompletedMorningWindowContext(chartContext?: ChartContext | null): boolean {
  if (!chartContext) return false;
  const morningContext = chartContext.morningWindowContext;
  const levels = chartContext.keyLevels;
  return Boolean(
    (morningContext?.complete && (morningContext.morningHigh || levels.morningHigh) && (morningContext.morningLow || levels.morningLow)) ||
    (levels.morningHigh && levels.morningLow && (morningContext?.confidence === 'High' || morningContext?.confidence === 'Medium'))
  );
}

function setupEvidenceFromContext(entry: SetupRegistryEntry, chartContext?: ChartContext | null) {
  const key = evidenceKeyForSetup(entry.setupType);
  if (!key) return null;
  if (entry.setupType === SetupType.MomentumPullbackBreatherReclaim) {
    return chartContext?.setupEvidence?.momentumPullbackBreatherReclaim || chartContext?.setupEvidence?.momentumPullback || null;
  }
  return chartContext?.setupEvidence?.[key] || null;
}

function levelsRequireManualConfirmation(chartContext?: ChartContext | null): boolean {
  if (!chartContext) return false;
  return (
    chartContext.screenshotUsability === 'warning' ||
    chartContext.screenshotUsability === 'unusable' ||
    chartContext.screenshotQuality === 'Low' ||
    chartContext.screenshotQuality === 'Unreadable' ||
    chartContext.levelReadConfidence === 'Low' ||
    chartContext.levelReadConfidence === 'Unreadable' ||
    chartContext.riskReadConfidence === 'Low' ||
    chartContext.riskReadConfidence === 'Unreadable' ||
    chartContext.entryStopConfidence === 'Low' ||
    chartContext.entryStopConfidence === 'Unreadable' ||
    chartContext.requiresManualConfirmation === true ||
    chartContext.entryConfirmed === false ||
    chartContext.stopConfirmed === false ||
    chartContext.extractionWarnings?.levelsUnclear === true ||
    chartContext.extractionWarnings?.priceLabelsUnreadable === true ||
    chartContext.extractionWarnings?.manualEntryStopRequired === true
  );
}

function candleFactSummary(chartContext: ChartContext) {
  const candles = chartContext.candles || [];
  return {
    expansion: Boolean(chartContext.candleFacts?.expansionCandlePresent || candles.some((candle) => candle.isExpansion && isReadableConfidence(candle.confidence))),
    rejection: Boolean(chartContext.candleFacts?.rejectionWickPresent || candles.some((candle) => candle.isRejection && isReadableConfidence(candle.confidence))),
    breather: Boolean(chartContext.candleFacts?.breatherCandlePresent || candles.some((candle) => candle.isBreather && isReadableConfidence(candle.confidence))),
    reclaim: Boolean(chartContext.candleFacts?.reclaimCandlePresent || candles.some((candle) => candle.isReclaim && isReadableConfidence(candle.confidence))),
    pullback: Boolean(chartContext.candleFacts?.pullbackPresent || candles.some((candle) => candle.direction !== 'unknown' && candle.bodyQuality === 'small' && isReadableConfidence(candle.confidence))),
    closeAboveKeyLevel: Boolean(chartContext.candleFacts?.closeAboveKeyLevel),
    closeBelowKeyLevel: Boolean(chartContext.candleFacts?.closeBelowKeyLevel),
  };
}

function candleBody(candle: NonNullable<ChartContext['candles']>[number]): number | null {
  const enriched = candle as typeof candle & { bodyPoints?: number | null };
  if (typeof enriched.bodyPoints === 'number' && Number.isFinite(enriched.bodyPoints)) return Math.abs(enriched.bodyPoints);
  if (typeof candle.open === 'number' && typeof candle.close === 'number') return Math.abs(candle.close - candle.open);
  return null;
}

function candleRange(candle: NonNullable<ChartContext['candles']>[number]): number | null {
  const enriched = candle as typeof candle & { rangePoints?: number | null };
  if (typeof enriched.rangePoints === 'number' && Number.isFinite(enriched.rangePoints)) return Math.abs(enriched.rangePoints);
  if (typeof candle.high === 'number' && typeof candle.low === 'number') return Math.abs(candle.high - candle.low);
  return null;
}

function impulseQualifiedFromRatios(bodyRatio?: number | null, rangeRatio?: number | null): boolean {
  const minBody = TRADE_RULES.executionParameters.fvgImpulseBodyRatio;
  const minRange = TRADE_RULES.executionParameters.fvgImpulseRangeRatio;
  return (
    (typeof bodyRatio === 'number' && Number.isFinite(bodyRatio) && bodyRatio >= minBody) ||
    (typeof rangeRatio === 'number' && Number.isFinite(rangeRatio) && rangeRatio >= minRange)
  );
}

function deriveImpulseQualifiedFvgs(chartContext: ChartContext): NonNullable<ChartContext['fvgZones']> {
  const candles = (chartContext.candles || [])
    .filter((candle) =>
      typeof candle.index === 'number' &&
      typeof candle.high === 'number' &&
      typeof candle.low === 'number' &&
      typeof candle.open === 'number' &&
      typeof candle.close === 'number'
    )
    .sort((a, b) => a.index - b.index);
  if (candles.length < 3) return [];

  const derived: NonNullable<ChartContext['fvgZones']> = [];
  for (let index = 2; index < candles.length; index += 1) {
    const current = candles[index];
    const twoBack = candles[index - 2];
    const recent = candles.slice(Math.max(0, index - 6), index);
    const bodies = recent.map(candleBody).filter((value): value is number => value !== null && value > 0);
    const ranges = recent.map(candleRange).filter((value): value is number => value !== null && value > 0);
    const currentBody = candleBody(current);
    const currentRange = candleRange(current);
    const averageBody = bodies.length ? bodies.reduce((sum, value) => sum + value, 0) / bodies.length : null;
    const averageRange = ranges.length ? ranges.reduce((sum, value) => sum + value, 0) / ranges.length : null;
    const bodyRatio = currentBody && averageBody ? currentBody / averageBody : null;
    const rangeRatio = currentRange && averageRange ? currentRange / averageRange : null;
    if (!impulseQualifiedFromRatios(bodyRatio, rangeRatio)) continue;

    if ((current.low as number) > (twoBack.high as number)) {
      const lower = twoBack.high as number;
      const upper = current.low as number;
      derived.push({
        direction: 'LONG',
        lower,
        upper,
        midpoint: roundToTick((lower + upper) / 2),
        formedAt: current.timestamp,
        formedCandleIndex: current.index,
        impulseQualified: true,
        impulseBodyRatio: bodyRatio,
        impulseRangeRatio: rangeRatio,
        confidence: isReadableConfidence(current.confidence) ? current.confidence : 'Medium',
      });
    }

    if ((current.high as number) < (twoBack.low as number)) {
      const lower = current.high as number;
      const upper = twoBack.low as number;
      derived.push({
        direction: 'SHORT',
        lower,
        upper,
        midpoint: roundToTick((lower + upper) / 2),
        formedAt: current.timestamp,
        formedCandleIndex: current.index,
        impulseQualified: true,
        impulseBodyRatio: bodyRatio,
        impulseRangeRatio: rangeRatio,
        confidence: isReadableConfidence(current.confidence) ? current.confidence : 'Medium',
      });
    }
  }
  return derived;
}

function modelOneFvgZones(chartContext: ChartContext): NonNullable<ChartContext['fvgZones']> {
  const explicit = (chartContext.fvgZones || []).filter((zone) => {
    if (!isReadableConfidence(zone.confidence) || zone.impulseQualified === false) return false;
    if (!Number.isFinite(zone.lower) || !Number.isFinite(zone.upper)) return false;
    if (zone.impulseQualified === true) return true;
    if (impulseQualifiedFromRatios(zone.impulseBodyRatio, zone.impulseRangeRatio)) return true;
    return false;
  });
  return [...explicit, ...deriveImpulseQualifiedFvgs(chartContext)];
}

function priceInsideZone(price: number | null, zone: NonNullable<ChartContext['fvgZones']>[number] | null | undefined): boolean {
  if (price === null || !zone || !Number.isFinite(zone.lower) || !Number.isFinite(zone.upper)) return false;
  const lower = Math.min(zone.lower as number, zone.upper as number);
  const upper = Math.max(zone.lower as number, zone.upper as number);
  return price >= lower && price <= upper;
}

function priceInsideBounds(price: number | null, low: number | null, high: number | null): boolean {
  if (price === null || low === null || high === null) return false;
  return price >= Math.min(low, high) && price <= Math.max(low, high);
}

export function computeZoneOverlap(aLow: unknown, aHigh: unknown, bLow: unknown, bHigh: unknown): ZoneOverlap {
  const bounds = [aLow, aHigh, bLow, bHigh].map((value) => typeof value === 'number' ? value : Number.NaN);
  if (!bounds.every(Number.isFinite)) return { valid: false, low: null, high: null };
  const [firstLow, firstHigh, secondLow, secondHigh] = bounds;
  const overlapLow = Math.max(Math.min(firstLow, firstHigh), Math.min(secondLow, secondHigh));
  const overlapHigh = Math.min(Math.max(firstLow, firstHigh), Math.max(secondLow, secondHigh));
  const validOverlap = Number.isFinite(overlapLow) && Number.isFinite(overlapHigh) && overlapLow < overlapHigh;
  return validOverlap
    ? { valid: true, low: roundToTick(overlapLow), high: roundToTick(overlapHigh) }
    : { valid: false, low: null, high: null };
}

function breakerFvgOverlapConfluence(
  chartContext: ChartContext,
  direction: Direction,
  entry: number | null,
  fvgZones: NonNullable<ChartContext['fvgZones']> = (chartContext.fvgZones || []).filter((zone) => isReadableConfidence(zone.confidence) && zone.impulseQualified !== false)
): BreakerFvgOverlapConfluence | null {
  if (direction !== 'LONG' && direction !== 'SHORT') return null;
  const breakerZones = chartContext.breakerZones || [];
  for (const breaker of breakerZones) {
    if (breaker.direction !== direction || !isReadableConfidence(breaker.confidence)) continue;
    for (const fvg of fvgZones) {
      if (fvg.direction !== direction || !isReadableConfidence(fvg.confidence)) continue;
      const overlap = computeZoneOverlap(breaker.lower, breaker.upper, fvg.lower, fvg.upper);
      if (!overlap.valid) continue;
      return {
        breakerFvgOverlap: true,
        overlapZone: overlap,
        entryInside: priceInsideBounds(entry, overlap.low, overlap.high),
        reason: 'Breaker + FVG overlap confluence',
      };
    }
  }
  return null;
}

function candleTouchesFvg(candle: NonNullable<ChartContext['candles']>[number], zone: NonNullable<ChartContext['fvgZones']>[number]): boolean {
  if (!Number.isFinite(candle.high) || !Number.isFinite(candle.low) || !Number.isFinite(zone.lower) || !Number.isFinite(zone.upper)) return false;
  const lower = Math.min(zone.lower as number, zone.upper as number);
  const upper = Math.max(zone.lower as number, zone.upper as number);
  return (candle.low as number) <= upper && (candle.high as number) >= lower;
}

function opposingLiquidityTarget(chartContext: ChartContext, direction: Direction, entry: number, minimumTarget: number): number | null {
  if (direction !== 'LONG' && direction !== 'SHORT') return null;
  const objectives = (chartContext.targetObjectives || [])
    .filter((target) =>
      target.direction === direction &&
      target.type !== 'imbalance_zone' &&
      target.type !== 'gap' &&
      Number.isFinite(target.price)
    )
    .map((target) => target.price);
  const structural = (chartContext.structuralLevels || [])
    .filter((level) =>
      Number.isFinite(level.price) &&
      (level.type === 'high' || level.type === 'low' || level.type === 'swing' || level.type === 'liquidity_pool')
    )
    .map((level) => level.price);
  const candidates = [...objectives, ...structural]
    .filter((price): price is number => typeof price === 'number' && Number.isFinite(price))
    .filter((price) => direction === 'LONG' ? price >= minimumTarget && price > entry : price <= minimumTarget && price < entry)
    .sort((a, b) => direction === 'LONG' ? a - b : b - a);
  return candidates[0] ?? null;
}

function validateModelOne(chartContext?: ChartContext | null, manualLevelConfirmation = false): ModelOneValidation | null {
  if (!chartContext) return null;
  const candles = chartContext.candles || [];
  const liquidityEvents = [...(chartContext.liquidityEvents || []), ...(chartContext.liquiditySweeps || [])];
  const sweeps = liquidityEvents.filter((event) =>
    event.type === 'sweep' &&
    event.reclaimed &&
    isReadableConfidence(event.confidence) &&
    event.direction !== 'NO TRADE' &&
    Number.isFinite(event.level)
  );
  const reclaimEvents = chartContext.reclaimEvents || [];
  const displacementCandles = (chartContext.displacementCandles || []).filter((candle) =>
    isReadableConfidence(candle.confidence) &&
    (candle.quality === 'confirmed' || candle.quality === 'high_quality' || (candle.leavesImbalance && candle.breaksStructure)) &&
    candle.leavesImbalance !== false &&
    candle.breaksStructure !== false &&
    (
      typeof candle.displacementScore !== 'number' ||
      candle.displacementScore >= TRADE_RULES.executionParameters.displacementScoreThreshold ||
      candle.quality === 'confirmed' ||
      candle.quality === 'high_quality'
    )
  );
  const fvgZones = modelOneFvgZones(chartContext);
  const setupEvidence = chartContext.setupEvidence?.liquiditySweep;
  const evidence: string[] = [];
  const missingEvidence: string[] = [];

  if (!sweeps.length) missingEvidence.push('Liquidity sweep');
  const fallbackDirection = chartContext.candleFacts?.lastClosedCandleDirection === 'bearish' ? 'SHORT' : chartContext.candleFacts?.lastClosedCandleDirection === 'bullish' ? 'LONG' : 'NO TRADE';

  const sweep = sweeps[0];
  const direction = sweep?.direction || setupEvidence?.direction || fallbackDirection;
  if (direction !== 'LONG' && direction !== 'SHORT') {
    return {
      detected: false,
      possible: false,
      direction: 'NO TRADE',
      entry: null,
      stop: null,
      target1: null,
      target2: null,
      risk: null,
      invalidation: null,
      requiredTrigger: 'Wait for sweep, reclaim, displacement, market structure shift, and FVG retrace.',
      confidence: 'Low',
      evidence,
      missingEvidence: missingEvidence.length ? missingEvidence : ['Directional sweep'],
      hasPendingTrigger: true,
    };
  }

  const hasSweep = Boolean(sweep);
  const hasReclaim = Boolean(
    sweep?.reclaimed ||
    chartContext.setupReadyFacts?.sweepThenReclaim ||
    reclaimEvents.some((event) => event.direction === direction && isReadableConfidence(event.confidence))
  );
  const displacement = displacementCandles.find((candle) => candle.direction === direction);
  const hasDisplacement = Boolean(displacement || chartContext.candleFacts?.expansionCandlePresent && chartContext.marketStructure?.expansionCondition);
  const hasMss = Boolean(
    chartContext.marketStructure?.marketStructureShift ||
    chartContext.setupReadyFacts?.breakOfStructure ||
    displacement?.breaksStructure
  );
  const fvg = fvgZones.find((zone) => zone.direction === direction);
  const hasFvg = Boolean(fvg);
  const breakerFvgConfluence = breakerFvgOverlapConfluence(chartContext, direction, parsePrice(setupEvidence?.entry) ?? parsePrice(chartContext.proposedEntry), fvgZones);
  const formedIndex = typeof fvg?.formedCandleIndex === 'number' ? fvg.formedCandleIndex : -1;
  const retraceIntoFvg = Boolean(
    fvg &&
    (
      chartContext.setupReadyFacts?.pullbackIntoFvg ||
      chartContext.setupReadyFacts?.fvgReclaimed ||
      candles.some((candle) => candle.index > formedIndex && candleTouchesFvg(candle, fvg))
    )
  );

  if (hasSweep) evidence.push('Liquidity sweep confirmed');
  else missingEvidence.push('Liquidity sweep');
  if (hasReclaim) evidence.push('Reclaim after sweep confirmed');
  else missingEvidence.push('Reclaim after sweep');
  if (hasDisplacement) evidence.push('Displacement confirmed');
  else missingEvidence.push('Displacement');
  if (hasMss) evidence.push('Market structure shift confirmed');
  else missingEvidence.push('Market structure shift');
  if (hasFvg) evidence.push('Fair value gap / imbalance entry model');
  else missingEvidence.push('Fair value gap / imbalance');
  if (retraceIntoFvg) evidence.push('Retrace into FVG confirmed');
  else missingEvidence.push('Retrace into FVG');

  const zoneEntry = fvg && Number.isFinite(fvg.midpoint)
    ? roundToTick(fvg.midpoint as number)
    : fvg && Number.isFinite(fvg.lower) && Number.isFinite(fvg.upper)
      ? roundToTick(((fvg.lower as number) + (fvg.upper as number)) / 2)
      : null;
  const extractedEntry = parsePrice(setupEvidence?.entry) ?? parsePrice(chartContext.proposedEntry);
  const entry = manualLevelConfirmation
    ? null
    : extractedEntry !== null
      ? priceInsideZone(extractedEntry, fvg) || breakerFvgConfluence?.entryInside ? extractedEntry : null
      : zoneEntry;
  if (!manualLevelConfirmation && entry !== null && fvg && (priceInsideZone(entry, fvg) || breakerFvgConfluence?.entryInside)) {
    evidence.push('Entry inside FVG or valid confluence zone');
    if (breakerFvgConfluence?.entryInside) {
      evidence.push('Breaker + FVG overlap confluence');
      evidence.push('Entry inside breaker/FVG overlap');
      evidence.push('FVG retrace supported by breaker overlap');
    }
  } else {
    missingEvidence.push('Entry inside FVG or valid confluence zone');
  }

  const failedBreak = (chartContext.failedBreakEvents || []).find((event) => event.direction === direction && Number.isFinite(event.sweptExtreme));
  const sweepCandle = sweep?.timestamp ? candles.find((candle) => candle.timestamp === sweep.timestamp) : null;
  const sweepExtreme = direction === 'LONG'
    ? parsePrice(failedBreak?.sweptExtreme) ?? parsePrice(sweepCandle?.low) ?? parsePrice(chartContext.keyLevels.activeSwingLow) ?? parsePrice(sweep?.level)
    : parsePrice(failedBreak?.sweptExtreme) ?? parsePrice(sweepCandle?.high) ?? parsePrice(chartContext.keyLevels.activeSwingHigh) ?? parsePrice(sweep?.level);
  const stop = manualLevelConfirmation || sweepExtreme === null
    ? null
    : direction === 'LONG'
      ? roundToTick(sweepExtreme - TRADE_RULES.targetModel.tickSize)
      : roundToTick(sweepExtreme + TRADE_RULES.targetModel.tickSize);
  if (stop !== null && sweepExtreme !== null && (direction === 'LONG' ? stop < sweepExtreme : stop > sweepExtreme)) {
    evidence.push('Stop beyond sweep extreme');
  } else {
    missingEvidence.push('Stop beyond sweep extreme');
  }

  const actualRisk = riskPoints(entry, stop);
  const rTargets = targetsFromEntryStop(direction, entry, stop);
  const minimumTarget = entry !== null && actualRisk !== null
    ? direction === 'LONG'
      ? entry + actualRisk * 2
      : entry - actualRisk * 2
    : null;
  const hasExplicitTargetMap = Boolean((chartContext.targetObjectives || []).length || (chartContext.structuralLevels || []).length);
  const liquidityTarget = entry !== null && minimumTarget !== null
    ? opposingLiquidityTarget(chartContext, direction, entry, minimumTarget)
    : null;
  const target2 = liquidityTarget ?? (hasExplicitTargetMap ? null : rTargets.target2);
  const target1 = rTargets.target1;
  const rewardToTarget = entry !== null && target2 !== null ? Math.abs(target2 - entry) : null;
  const hasTwoR = actualRisk !== null && rewardToTarget !== null && actualRisk > 0 && rewardToTarget / actualRisk >= 2;
  if (hasTwoR) evidence.push('Minimum 2.0R available');
  else missingEvidence.push('Minimum 2.0R available');
  if (target2 !== null) evidence.push(liquidityTarget !== null ? 'Targeting opposing liquidity' : 'Targeting valid R-based objective');
  else missingEvidence.push('Targeting opposing liquidity');

  const fullSequence = hasSweep && hasReclaim && hasDisplacement && hasMss && hasFvg && retraceIntoFvg && entry !== null && stop !== null && target2 !== null && hasTwoR;
  const partialCount = [hasSweep, hasReclaim, hasDisplacement, hasMss, hasFvg, retraceIntoFvg].filter(Boolean).length;
  const possible = !fullSequence && partialCount >= 2;

  return {
    detected: fullSequence,
    possible,
    direction,
    entry,
    stop,
    target1,
    target2,
    risk: actualRisk,
    invalidation: stop !== null
      ? direction === 'LONG'
        ? `Invalid if price trades below the sweep low structure stop near ${stop}.`
        : `Invalid if price trades above the sweep high structure stop near ${stop}.`
      : null,
    requiredTrigger: direction === 'LONG'
      ? 'Retrace into the bullish FVG after sell-side sweep, reclaim, displacement, and market structure shift.'
      : 'Retrace into the bearish FVG after buy-side sweep, reclaim, displacement, and market structure shift.',
    confidence: fullSequence ? 'High' : possible ? 'Medium' : 'Low',
    evidence,
    missingEvidence: Array.from(new Set(missingEvidence)),
    hasPendingTrigger: !fullSequence,
  };
}

function sweepExtremeForDirection(
  chartContext: ChartContext,
  direction: Direction,
  sweep: NonNullable<ChartContext['liquidityEvents']>[number],
): number | null {
  const candles = chartContext.candles || [];
  const failedBreak = (chartContext.failedBreakEvents || []).find((event) =>
    event.direction === direction &&
    isReadableConfidence(event.confidence) &&
    Number.isFinite(event.sweptExtreme)
  );
  const sweepCandle = sweep.timestamp ? candles.find((candle) => candle.timestamp === sweep.timestamp) : null;
  return direction === 'LONG'
    ? parsePrice(failedBreak?.sweptExtreme) ?? parsePrice(sweepCandle?.low) ?? parsePrice(chartContext.keyLevels.activeSwingLow) ?? parsePrice(sweep.level)
    : parsePrice(failedBreak?.sweptExtreme) ?? parsePrice(sweepCandle?.high) ?? parsePrice(chartContext.keyLevels.activeSwingHigh) ?? parsePrice(sweep.level);
}

function minutesFromTimestamp(value?: string | null): number | null {
  if (!value) return null;
  const match = String(value).match(/T?(\d{2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null;
}

function levelMatches(a: number | null, b: number | null, tolerance = TRADE_RULES.targetModel.tickSize * 2): boolean {
  return a !== null && b !== null && Math.abs(a - b) <= tolerance;
}

function establishedSweepLevel(
  chartContext: ChartContext,
  direction: Direction,
  sweep: NonNullable<ChartContext['liquidityEvents']>[number] | undefined,
): EstablishedSweepLevelResult {
  const level = parsePrice(sweep?.level);
  const label = normalizeText(sweep?.sweptLevelLabel).toUpperCase();
  const evidence = normalizeText(sweep?.evidence).toUpperCase();
  const text = `${label} ${evidence}`;
  const strongLabel = hasAny(text, [
    'PRIOR',
    'PREVIOUS',
    'SESSION',
    'RTH',
    'ETH',
    'ASIAN',
    'LONDON',
    'NY PREMARKET',
    'OVERNIGHT',
    'WEEK',
    'MONTH',
    'SWING',
    'EQUAL HIGH',
    'EQUAL LOW',
    'BUY-SIDE',
    'SELL-SIDE',
  ]);

  if (strongLabel) {
    return {
      established: true,
      reason: 'Established liquidity level confirmed',
      missingReason: null,
    };
  }

  const strongSources = new Set([
    'previous_rth',
    'prior_eth',
    'three_day_rth',
    'three_day_eth',
    'weekly_rth',
    'weekly_eth',
    'monthly_rth',
    'monthly_eth',
    'asian',
    'london',
    'ny_premarket',
    'rth_morning',
    'lunch',
    'full_context',
  ]);
  const levels = [
    ...(chartContext.structuralLevels || []),
    ...(chartContext.sessionLevelContext?.levels || []),
  ];
  const matchingLevel = levels.find((item) => {
    const directional =
      item.directionRelevance === 'BOTH' ||
      item.directionRelevance === direction ||
      (direction === 'LONG' && (item.type === 'low' || item.type === 'support' || item.type === 'liquidity_pool' || item.type === 'swing')) ||
      (direction === 'SHORT' && (item.type === 'high' || item.type === 'resistance' || item.type === 'liquidity_pool' || item.type === 'swing'));
    return directional &&
      levelMatches(level, parsePrice(item.price)) &&
      isReadableConfidence(item.confidence) &&
      (strongSources.has(item.source) || item.strengthLabel === 'High' || (item.strengthScore || 0) >= 60);
  });
  if (matchingLevel) {
    return {
      established: true,
      reason: 'Established liquidity level confirmed',
      missingReason: null,
    };
  }

  const candles = chartContext.candles || [];
  const sweepIndex = sweep?.timestamp
    ? candles.findIndex((candle) => candle.timestamp === sweep.timestamp)
    : -1;
  if (sweepIndex >= 4 || (sweepIndex >= 0 && candles.length - 1 - sweepIndex >= 4)) {
    return {
      established: true,
      reason: 'Established liquidity level confirmed',
      missingReason: null,
    };
  }

  const sweepMinutes = minutesFromTimestamp(sweep?.timestamp);
  const chartMinutes = minutesFromTimestamp(chartContext.chartTimestamp || chartContext.screenshotTimestamp);
  if (sweepMinutes !== null && chartMinutes !== null && chartMinutes - sweepMinutes >= 20) {
    return {
      established: true,
      reason: 'Established liquidity level confirmed',
      missingReason: null,
    };
  }

  return {
    established: false,
    reason: null,
    missingReason: 'Turtle Soup requires an established prior swing or session liquidity level',
  };
}

function validateTurtleSoup(chartContext?: ChartContext | null, manualLevelConfirmation = false): TurtleSoupValidation | null {
  if (!chartContext) return null;
  const liquidityEvents = [...(chartContext.liquidityEvents || []), ...(chartContext.liquiditySweeps || [])];
  const sweeps = liquidityEvents.filter((event) =>
    event.type === 'sweep' &&
    isReadableConfidence(event.confidence) &&
    event.direction !== 'NO TRADE' &&
    Number.isFinite(event.level)
  );
  const evidence: string[] = ['Turtle Soup reversal'];
  const missingEvidence: string[] = [];

  const sweep = sweeps[0];
  const direction = sweep?.direction || chartContext.setupEvidence?.liquiditySweep?.direction || 'NO TRADE';
  if (direction !== 'LONG' && direction !== 'SHORT') {
    return {
      detected: false,
      possible: false,
      direction: 'NO TRADE',
      entry: null,
      stop: null,
      target1: null,
      target2: null,
      risk: null,
      invalidation: null,
      requiredTrigger: 'Wait for a liquidity raid, reclaim after sweep, valid entry, structure stop, and 2.0R target room.',
      confidence: 'Low',
      evidence: [],
      missingEvidence: ['Wick-only rejection is not enough without a meaningful liquidity raid'],
      hasPendingTrigger: true,
    };
  }

  const hasSweep = Boolean(sweep);
  if (hasSweep) {
    evidence.push('Liquidity raid confirmed');
    evidence.push(direction === 'LONG'
      ? 'Sweep below sell-side liquidity confirmed'
      : 'Sweep above buy-side liquidity confirmed');
  } else {
    missingEvidence.push('Wick-only rejection is not enough without a meaningful liquidity raid');
  }

  const establishedLevel = establishedSweepLevel(chartContext, direction, sweep);
  if (establishedLevel.reason) evidence.push(establishedLevel.reason);
  if (establishedLevel.missingReason) missingEvidence.push(establishedLevel.missingReason);

  const reclaimEvents = chartContext.reclaimEvents || [];
  const level = parsePrice(sweep?.level);
  const hasReclaim = Boolean(
    sweep?.reclaimed ||
    chartContext.setupReadyFacts?.sweepThenReclaim ||
    reclaimEvents.some((event) => event.direction === direction && isReadableConfidence(event.confidence)) ||
    (direction === 'LONG' ? chartContext.candleFacts?.closeAboveKeyLevel : chartContext.candleFacts?.closeBelowKeyLevel)
  );
  if (hasReclaim) evidence.push('Reclaim after sweep confirmed');
  else missingEvidence.push('Reclaim confirmation missing');

  const failedBreak = (chartContext.failedBreakEvents || []).find((event) =>
    event.direction === direction &&
    isReadableConfidence(event.confidence) &&
    Number.isFinite(event.failedLevel)
  );
  const hasFailedContinuation = Boolean(
    failedBreak ||
    hasReclaim ||
    chartContext.candleFacts?.rejectionWickPresent
  );
  if (hasFailedContinuation) evidence.push('Failed continuation confirmed');
  else missingEvidence.push('Failed continuation confirmed');

  const optionalDisplacement = (chartContext.displacementCandles || []).find((candle) =>
    candle.direction === direction && isReadableConfidence(candle.confidence)
  );
  if (optionalDisplacement || chartContext.candleFacts?.expansionCandlePresent) evidence.push('Displacement confirmed');
  if (chartContext.marketStructure?.marketStructureShift || chartContext.setupReadyFacts?.breakOfStructure) evidence.push('Market structure shift confirmed');
  if ((chartContext.fvgZones || []).some((zone) => zone.direction === direction && isReadableConfidence(zone.confidence))) {
    evidence.push('Fair value gap / imbalance entry model');
  }

  const extractedEntry = parsePrice(chartContext.setupEvidence?.liquiditySweep?.entry) ?? parsePrice(chartContext.proposedEntry);
  const breakerFvgConfluence = breakerFvgOverlapConfluence(chartContext, direction, extractedEntry);
  if (breakerFvgConfluence?.breakerFvgOverlap) {
    evidence.push('Breaker + FVG overlap confluence');
    if (breakerFvgConfluence.entryInside) evidence.push('Entry inside breaker/FVG overlap');
  }
  const entryIsAfterReclaim = extractedEntry !== null && level !== null
    ? direction === 'LONG'
      ? extractedEntry > level
      : extractedEntry < level
    : false;
  const entry = manualLevelConfirmation ? null : entryIsAfterReclaim ? extractedEntry : null;
  if (entry !== null) evidence.push('Reclaim after sweep confirmed');
  else missingEvidence.push('Valid entry after reclaim or retrace');

  const sweepExtreme = sweep ? sweepExtremeForDirection(chartContext, direction, sweep) : null;
  const explicitStop = parsePrice(chartContext.setupEvidence?.liquiditySweep?.stop) ?? parsePrice(chartContext.proposedStop);
  const explicitStopIsValid = explicitStop !== null && sweepExtreme !== null
    ? direction === 'LONG'
      ? explicitStop < sweepExtreme
      : explicitStop > sweepExtreme
    : false;
  const computedStop = sweepExtreme === null
    ? null
    : direction === 'LONG'
      ? roundToTick(sweepExtreme - TRADE_RULES.targetModel.tickSize)
      : roundToTick(sweepExtreme + TRADE_RULES.targetModel.tickSize);
  const stop = manualLevelConfirmation || sweepExtreme === null
    ? null
    : explicitStop !== null
      ? explicitStopIsValid ? explicitStop : null
      : computedStop;
  if (stop !== null && sweepExtreme !== null && (direction === 'LONG' ? stop < sweepExtreme : stop > sweepExtreme)) {
    evidence.push('Stop beyond sweep wick');
  } else {
    missingEvidence.push('Stop beyond sweep wick');
  }

  const actualRisk = riskPoints(entry, stop);
  const rTargets = targetsFromEntryStop(direction, entry, stop);
  const minimumTarget = entry !== null && actualRisk !== null
    ? direction === 'LONG'
      ? entry + actualRisk * 2
      : entry - actualRisk * 2
    : null;
  const hasExplicitTargetMap = Boolean((chartContext.targetObjectives || []).length || (chartContext.structuralLevels || []).length);
  const liquidityTarget = entry !== null && minimumTarget !== null
    ? opposingLiquidityTarget(chartContext, direction, entry, minimumTarget)
    : null;
  const target2 = liquidityTarget ?? (hasExplicitTargetMap ? null : rTargets.target2);
  const target1 = rTargets.target1;
  const rewardToTarget = entry !== null && target2 !== null ? Math.abs(target2 - entry) : null;
  const hasTwoR = actualRisk !== null && rewardToTarget !== null && actualRisk > 0 && rewardToTarget / actualRisk >= 2;
  if (target2 !== null) evidence.push(liquidityTarget !== null ? 'Targeting opposing liquidity' : 'Targeting valid R-based objective');
  else missingEvidence.push('Targeting opposing liquidity');
  if (hasTwoR) evidence.push('Minimum 2.0R available');
  else missingEvidence.push('Minimum 2.0R unavailable');

  const bigPicture = bigPictureStructureForDirection(chartContext, direction);
  if (bigPicture.evidence) evidence.push(bigPicture.evidence);
  if (bigPicture.missingEvidence) missingEvidence.push(bigPicture.missingEvidence);

  const fullSequence =
    hasSweep &&
    establishedLevel.established &&
    hasReclaim &&
    hasFailedContinuation &&
    entry !== null &&
    stop !== null &&
    target2 !== null &&
    hasTwoR &&
    !bigPicture.countertrend;
  const possible = !fullSequence && hasSweep && establishedLevel.established;

  return {
    detected: fullSequence,
    possible,
    direction,
    entry,
    stop,
    target1,
    target2,
    risk: actualRisk,
    invalidation: stop !== null
      ? direction === 'LONG'
        ? `Invalid if price trades below the sweep wick structure stop near ${stop}.`
        : `Invalid if price trades above the sweep wick structure stop near ${stop}.`
      : null,
    requiredTrigger: direction === 'LONG'
      ? bigPicture.countertrend
        ? 'Countertrend bullish Turtle Soup requires immediate reclaim failure against the bearish big-picture structure, then fresh 5M confirmation. Do not fight big-picture structure.'
        : 'Bullish Turtle Soup requires an established sell-side liquidity raid, reclaim above the swept low, valid entry after reclaim or retrace, and stop beyond the sweep wick.'
      : bigPicture.countertrend
        ? 'Countertrend bearish Turtle Soup requires immediate reclaim failure against the bullish big-picture structure, then fresh 5M confirmation. Do not fight big-picture structure.'
        : 'Bearish Turtle Soup requires an established buy-side liquidity raid, reclaim below the swept high, valid entry after reclaim or retrace, and stop beyond the sweep wick.',
    confidence: breakerFvgConfluence?.entryInside && (fullSequence || possible)
      ? fullSequence ? 'High' : 'Medium'
      : fullSequence ? 'High' : possible ? 'Medium' : 'Low',
    evidence: Array.from(new Set(evidence)),
    missingEvidence: Array.from(new Set(missingEvidence)),
    hasPendingTrigger: !fullSequence,
  };
}

function levelContextScoreForDirection(chartContext: ChartContext | null | undefined, direction: Direction): { score: number; summary: string } {
  if (!chartContext?.sessionLevelContext || (direction !== 'LONG' && direction !== 'SHORT')) {
    const mtf = chartContext?.multiTimeframeContext;
    if (!mtf || (direction !== 'LONG' && direction !== 'SHORT')) {
      return { score: 0, summary: 'No session level context score available.' };
    }
    const aligned = mtf.alignment.alignedDirection === direction;
    const conflicted = mtf.alignment.conflicts.length > 0;
    return {
      score: aligned ? 14 : conflicted ? -6 : 4,
      summary: `Multi-timeframe OHLC context: 4H=${mtf.alignment.macroBias}, 1H=${mtf.alignment.sessionBias}, 15M=${mtf.alignment.liquidityBias}, 5M=${mtf.alignment.executionBias}.`,
    };
  }
  const levels = direction === 'LONG'
    ? chartContext.sessionLevelContext.strongestLongLevels
    : chartContext.sessionLevelContext.strongestShortLevels;
  const best = levels[0];
  if (!best) {
    const mtf = chartContext.multiTimeframeContext;
    if (mtf) {
      const aligned = mtf.alignment.alignedDirection === direction;
      const conflicted = mtf.alignment.conflicts.length > 0;
      return {
        score: aligned ? 14 : conflicted ? -6 : 4,
        summary: `Multi-timeframe OHLC context: 4H=${mtf.alignment.macroBias}, 1H=${mtf.alignment.sessionBias}, 15M=${mtf.alignment.liquidityBias}, 5M=${mtf.alignment.executionBias}.`,
      };
    }
    return { score: 0, summary: 'No directional session level context found.' };
  }
  return {
    score: Math.min(Math.round((best.strengthScore || 0) / 5), 20),
    summary: `${best.label} ${best.price} is a ${direction === 'LONG' ? 'long-side' : 'short-side'} reaction zone to watch for reclaim, rejection, or target management.`,
  };
}

function structuredDirectionForSetup(entry: SetupRegistryEntry, chartContext?: ChartContext | null): Direction | null {
  if (!chartContext) return null;
  const evidence = setupEvidenceFromContext(entry, chartContext);
  if (evidence?.direction && evidence.direction !== 'NO TRADE') return evidence.direction;

  if (entry.setupType === SetupType.SweepMssFvgRetrace) {
    const sweepDirection = [...(chartContext.liquidityEvents || []), ...(chartContext.liquiditySweeps || [])]
      .find((event) => event.type === 'sweep' && event.reclaimed && isReadableConfidence(event.confidence))?.direction;
    const fvgDirection = chartContext.fvgZones?.find((zone) => isReadableConfidence(zone.confidence))?.direction;
    if (sweepDirection && sweepDirection !== 'NO TRADE') return sweepDirection;
    if (fvgDirection) return fvgDirection;
  }

  if (entry.setupType === SetupType.TurtleSoup) {
    const turtleSoupDirection = validateTurtleSoup(chartContext)?.direction;
    if (turtleSoupDirection && turtleSoupDirection !== 'NO TRADE') return turtleSoupDirection;
  }

  const readableFvg = chartContext.fvgZones?.find((zone) => isReadableConfidence(zone.confidence));
  if (
    (entry.setupType === SetupType.FairValueGap || entry.setupType === SetupType.FvgImbalancePullback) &&
    readableFvg?.direction
  ) {
    return readableFvg.direction;
  }

  const readableLiquidity = chartContext.liquidityEvents?.find((event) =>
    isReadableConfidence(event.confidence) &&
    event.direction !== 'NO TRADE' &&
    (
      entry.setupType === SetupType.LiquiditySweep ||
      entry.setupType === SetupType.EqualHighsLows ||
      entry.setupType === SetupType.PreviousDaySweep
    )
  );
  if (readableLiquidity?.direction && readableLiquidity.direction !== 'NO TRADE') return readableLiquidity.direction;

  if (entry.setupType === SetupType.MomentumRunaway || entry.setupType === SetupType.MomentumPullbackBreatherReclaim) {
    if (chartContext.marketStructure?.trend === 'bullish') return 'LONG';
    if (chartContext.marketStructure?.trend === 'bearish') return 'SHORT';
  }

  if (entry.setupType === SetupType.OpeningGapFill && chartContext.gapContext?.gapPresent && isReadableConfidence(chartContext.gapContext.confidence)) {
    if (chartContext.gapContext.direction === 'gap_down') return 'LONG';
    if (chartContext.gapContext.direction === 'gap_up') return 'SHORT';
  }

  if (entry.setupType === SetupType.CompressionBreakout && chartContext.compressionRange?.breakoutDirection && chartContext.compressionRange.breakoutDirection !== 'NO TRADE') {
    return chartContext.compressionRange.breakoutDirection;
  }

  if (entry.setupType === SetupType.LunchFailedHighReversal) return 'SHORT';
  if (entry.setupType === SetupType.LunchFailedLowReversal) return 'LONG';
  if (entry.setupType === SetupType.MorningFailedHighLiquidityRejection) return 'SHORT';
  if (entry.setupType === SetupType.MorningReclaimLong) return 'LONG';
  if (entry.setupType === SetupType.LunchCompressionBreakout && chartContext.compressionRange?.breakoutDirection && chartContext.compressionRange.breakoutDirection !== 'NO TRADE') {
    return chartContext.compressionRange.breakoutDirection;
  }
  if (entry.setupType === SetupType.LunchFailedContinuation) {
    if (chartContext.morningWindowContext?.morningTrend === 'bullish_extension') return 'SHORT';
    if (chartContext.morningWindowContext?.morningTrend === 'bearish_extension') return 'LONG';
  }
  if (entry.setupType === SetupType.LunchRangeReclaim) {
    if (chartContext.candleFacts?.closeAboveKeyLevel) return 'LONG';
    if (chartContext.candleFacts?.closeBelowKeyLevel) return 'SHORT';
  }

  return null;
}

function structuredContextSupportsSetup(entry: SetupRegistryEntry, chartContext?: ChartContext | null): boolean {
  if (!chartContext) return false;
  const structure = chartContext.marketStructure;
  const levels = chartContext.keyLevels;
  const candles = candleFactSummary(chartContext);
  const swings = chartContext.swings || [];
  const fvgZones = chartContext.fvgZones || [];
  const liquidityEvents = [...(chartContext.liquidityEvents || []), ...(chartContext.liquiditySweeps || [])];
  const gapContext = chartContext.gapContext;
  const compressionRange = chartContext.compressionRange;
  const hasReadableFvg = fvgZones.some((zone) => isReadableConfidence(zone.confidence));
  const hasReadableSwing = swings.some((swing) => swing.price !== null && isReadableConfidence(swing.confidence));
  const hasSweep = liquidityEvents.some((event) => event.type === 'sweep' && isReadableConfidence(event.confidence));
  const hasReclaim = liquidityEvents.some((event) => event.reclaimed && isReadableConfidence(event.confidence));
  const hasEqualLiquidity = liquidityEvents.some((event) =>
    (event.type === 'equal_highs' || event.type === 'equal_lows') &&
    isReadableConfidence(event.confidence)
  );
  const hasPreviousDaySweep = liquidityEvents.some((event) =>
    (event.type === 'pdh_sweep' || event.type === 'pdl_sweep') &&
    isReadableConfidence(event.confidence)
  );
  const hasMorningContext = hasCompletedMorningWindowContext(chartContext);
  const morningContext = chartContext.morningWindowContext;
  const sweptMorningHigh = Boolean(morningContext?.morningHighSwept || liquidityEvents.some((event) =>
    event.type === 'sweep' &&
    isReadableConfidence(event.confidence) &&
    event.sweptLevelLabel?.toLowerCase().includes('morning high')
  ));
  const sweptMorningLow = Boolean(morningContext?.morningLowSwept || liquidityEvents.some((event) =>
    event.type === 'sweep' &&
    isReadableConfidence(event.confidence) &&
    event.sweptLevelLabel?.toLowerCase().includes('morning low')
  ));

  switch (entry.setupType) {
    case SetupType.SweepMssFvgRetrace:
      return Boolean(validateModelOne(chartContext)?.possible || validateModelOne(chartContext)?.detected);
    case SetupType.MomentumRunaway:
      return Boolean((candles.expansion || structure?.expansionCondition) && (structure?.trend === 'bullish' || structure?.trend === 'bearish'));
    case SetupType.MomentumPullbackBreatherReclaim:
      return Boolean(candles.breather || (candles.pullback && candles.reclaim));
    case SetupType.LiquiditySweep:
      return Boolean(hasSweep && (hasReclaim || (candles.rejection && (candles.reclaim || candles.closeAboveKeyLevel || candles.closeBelowKeyLevel))));
    case SetupType.TurtleSoup:
      return Boolean(validateTurtleSoup(chartContext)?.possible || validateTurtleSoup(chartContext)?.detected);
    case SetupType.MarketStructureShift:
      return Boolean(structure?.marketStructureShift);
    case SetupType.EqualHighsLows:
      return Boolean(hasEqualLiquidity || hasReadableSwing || candles.rejection);
    case SetupType.InitialBalanceExtension:
      return Boolean(levels.initialBalanceHigh && levels.initialBalanceLow && levels.currentPrice);
    case SetupType.PreviousDaySweep:
      return Boolean(hasPreviousDaySweep || ((levels.priorDayHigh || levels.previousDayHigh || levels.priorDayLow || levels.previousDayLow) && candles.rejection));
    case SetupType.CompressionBreakout:
      return Boolean((compressionRange?.present && isReadableConfidence(compressionRange.confidence)) || ((structure?.chopRangeCondition || structure?.compressionCondition) && (candles.expansion || structure?.expansionCondition)));
    case SetupType.OpeningGapFill:
      return Boolean((gapContext?.gapPresent && isReadableConfidence(gapContext.confidence)) || (levels.rthOpen && (levels.nearestSupport || levels.nearestResistance)));
    case SetupType.FvgImbalancePullback:
      return Boolean(hasReadableFvg && (candles.pullback || chartContext.setupReadyFacts?.pullbackIntoFvg || chartContext.setupReadyFacts?.fvgReclaimed));
    case SetupType.FairValueGap:
      return hasReadableFvg;
    case SetupType.OrderBlock618:
    case SetupType.OpeningOrderBlock:
    case SetupType.BreakerBlock:
    case SetupType.MitigationBlock:
    case SetupType.AlgoKillZone:
      return false;
    case SetupType.MorningFailedHighLiquidityRejection:
      return Boolean((candles.rejection || hasSweep) && (levels.nearestResistance || levels.activeSwingHigh || levels.openingRangeHigh));
    case SetupType.MorningReclaimLong:
      return Boolean((candles.reclaim || candles.closeAboveKeyLevel) && (levels.nearestResistance || levels.activeSwingHigh || levels.triggerCandleHigh));
    case SetupType.MorningOpeningRangeContinuation:
      return Boolean(levels.openingRangeHigh && levels.openingRangeLow && (candles.expansion || structure?.expansionCondition || candles.reclaim || candles.closeAboveKeyLevel || candles.closeBelowKeyLevel));
    case SetupType.LunchFailedHighReversal:
      return Boolean(hasMorningContext && (sweptMorningHigh || morningContext?.failedHoldAboveMorningHigh) && (candles.closeBelowKeyLevel || candles.rejection || candles.reclaim));
    case SetupType.LunchFailedLowReversal:
      return Boolean(hasMorningContext && (sweptMorningLow || morningContext?.failedHoldBelowMorningLow) && (candles.closeAboveKeyLevel || candles.rejection || candles.reclaim));
    case SetupType.LunchCompressionBreakout:
      return Boolean(hasMorningContext && ((compressionRange?.present && isReadableConfidence(compressionRange.confidence)) || structure?.compressionCondition || structure?.chopRangeCondition));
    case SetupType.LunchFailedContinuation:
      return Boolean(hasMorningContext && (morningContext?.morningTrend === 'bullish_extension' || morningContext?.morningTrend === 'bearish_extension') && (structure?.marketStructureShift || candles.rejection || candles.closeAboveKeyLevel || candles.closeBelowKeyLevel));
    case SetupType.LunchRangeReclaim:
      return Boolean(hasMorningContext && (morningContext?.rangeReclaimed || hasReclaim || chartContext.setupReadyFacts?.fvgReclaimed || chartContext.setupReadyFacts?.sweepThenReclaim || candles.reclaim || candles.closeAboveKeyLevel || candles.closeBelowKeyLevel));
    default:
      return false;
  }
}

function structuredContextDetectsSetup(entry: SetupRegistryEntry, chartContext?: ChartContext | null): boolean {
  if (!chartContext) return false;
  const structure = chartContext.marketStructure;
  const candles = candleFactSummary(chartContext);
  const fvgZones = chartContext.fvgZones || [];
  const liquidityEvents = [...(chartContext.liquidityEvents || []), ...(chartContext.liquiditySweeps || [])];
  const hasReadableFvg = fvgZones.some((zone) => isReadableConfidence(zone.confidence));
  const hasSweep = liquidityEvents.some((event) => event.type === 'sweep' && isReadableConfidence(event.confidence));
  const hasReclaim = liquidityEvents.some((event) => event.reclaimed && isReadableConfidence(event.confidence));
  const hasMorningContext = hasCompletedMorningWindowContext(chartContext);
  const morningContext = chartContext.morningWindowContext;
  const sweptMorningHigh = Boolean(morningContext?.morningHighSwept || liquidityEvents.some((event) =>
    event.type === 'sweep' &&
    isReadableConfidence(event.confidence) &&
    event.sweptLevelLabel?.toLowerCase().includes('morning high')
  ));
  const sweptMorningLow = Boolean(morningContext?.morningLowSwept || liquidityEvents.some((event) =>
    event.type === 'sweep' &&
    isReadableConfidence(event.confidence) &&
    event.sweptLevelLabel?.toLowerCase().includes('morning low')
  ));

  switch (entry.setupType) {
    case SetupType.SweepMssFvgRetrace:
      return Boolean(validateModelOne(chartContext)?.detected);
    case SetupType.MomentumRunaway:
      return Boolean((candles.expansion || structure?.expansionCondition) && (structure?.trend === 'bullish' || structure?.trend === 'bearish'));
    case SetupType.LiquiditySweep:
      return Boolean(hasSweep && hasReclaim);
    case SetupType.TurtleSoup:
      return Boolean(validateTurtleSoup(chartContext)?.detected);
    case SetupType.FairValueGap:
      return hasReadableFvg;
    case SetupType.FvgImbalancePullback:
      return Boolean(hasReadableFvg && (candles.pullback || chartContext.setupReadyFacts?.pullbackIntoFvg || chartContext.setupReadyFacts?.fvgReclaimed));
    case SetupType.MorningFailedHighLiquidityRejection:
      return Boolean(candles.rejection && (chartContext.keyLevels.nearestSupport || chartContext.keyLevels.activeSwingLow));
    case SetupType.MorningReclaimLong:
      return Boolean((candles.reclaim || candles.closeAboveKeyLevel) && (chartContext.keyLevels.nearestResistance || chartContext.keyLevels.triggerCandleHigh));
    case SetupType.MorningOpeningRangeContinuation:
      return Boolean(chartContext.keyLevels.openingRangeHigh && chartContext.keyLevels.openingRangeLow && (candles.expansion || chartContext.marketStructure?.expansionCondition));
    case SetupType.LunchFailedHighReversal:
      return Boolean(hasMorningContext && sweptMorningHigh && (morningContext?.failedHoldAboveMorningHigh || candles.closeBelowKeyLevel));
    case SetupType.LunchFailedLowReversal:
      return Boolean(hasMorningContext && sweptMorningLow && (morningContext?.failedHoldBelowMorningLow || candles.closeAboveKeyLevel));
    case SetupType.LunchCompressionBreakout:
      return Boolean(hasMorningContext && chartContext.compressionRange?.present && isReadableConfidence(chartContext.compressionRange.confidence) && chartContext.compressionRange.breakoutDirection !== 'NO TRADE');
    case SetupType.LunchFailedContinuation:
      return Boolean(hasMorningContext && (morningContext?.morningTrend === 'bullish_extension' || morningContext?.morningTrend === 'bearish_extension') && chartContext.marketStructure?.marketStructureShift);
    case SetupType.LunchRangeReclaim:
      return Boolean(hasMorningContext && (morningContext?.rangeReclaimed || hasReclaim || chartContext.setupReadyFacts?.fvgReclaimed || chartContext.setupReadyFacts?.sweepThenReclaim));
    default:
      return false;
  }
}

function riskPoints(entry: number | null, stop: number | null): number | null {
  if (!entry || !stop) return null;
  return Math.abs(entry - stop);
}

function computedTargets(direction: Direction, entry: number | null, stop: number | null): { target1: number | null; target2: number | null } {
  const actualTargets = targetsFromEntryStop(direction, entry, stop);
  if (actualTargets.target1 === null || actualTargets.target2 === null) return { target1: null, target2: null };
  return actualTargets;
}

function executionStatusFor(
  status: SetupCandidateStatus,
  direction: Direction,
  risk: number | null,
  hasEntry: boolean,
  hasStop: boolean,
  hasTarget: boolean,
  hasInvalidation: boolean,
  hasPendingTrigger: boolean,
  priority: number,
  confidence: Confidence
): { executionStatus: ExecutionStatus; blockReason: NoTradeReason | null } {
  if (status === SetupCandidateStatus.NotDetected) {
    return { executionStatus: ExecutionStatus.NotDetected, blockReason: null };
  }
  if (status === SetupCandidateStatus.Invalid) {
    return { executionStatus: ExecutionStatus.Invalid, blockReason: NoTradeReason.NoApprovedSetup };
  }
  if (direction === 'NO TRADE') {
    return { executionStatus: ExecutionStatus.Conditional, blockReason: NoTradeReason.EntryTriggerPending };
  }
  if (risk !== null && risk > TRADE_RULES.maxRiskPoints) {
    const highQuality = priority >= 80 || confidence === 'High';
    return {
      executionStatus: highQuality ? ExecutionStatus.Conditional : ExecutionStatus.Blocked,
      blockReason: NoTradeReason.RiskTooWide,
    };
  }
  if (!hasEntry) return { executionStatus: ExecutionStatus.Conditional, blockReason: NoTradeReason.EntryTriggerMissing };
  if (!hasStop || risk === null || risk <= 0) return { executionStatus: ExecutionStatus.Conditional, blockReason: NoTradeReason.InvalidStopLocation };
  if (!hasTarget) return { executionStatus: ExecutionStatus.Conditional, blockReason: NoTradeReason.TargetsUnavailable };
  if (!hasInvalidation) return { executionStatus: ExecutionStatus.Conditional, blockReason: NoTradeReason.InvalidStopLocation };
  if (hasPendingTrigger) return { executionStatus: ExecutionStatus.Conditional, blockReason: NoTradeReason.EntryTriggerPending };
  if (status === SetupCandidateStatus.Possible || status === SetupCandidateStatus.Conditional) {
    return { executionStatus: ExecutionStatus.Conditional, blockReason: NoTradeReason.EntryTriggerPending };
  }
  return { executionStatus: ExecutionStatus.Executable, blockReason: null };
}

function candidateForEntry(entry: SetupRegistryEntry, input: SetupScannerInput, text: string): SetupCandidate {
  const allowed = entry.allowedSessions.includes(input.sessionType);
  const missingMorningWindowContext = isLunchSubtype(entry.setupType) && (!isLunchSession(input.sessionType) || !hasCompletedMorningWindowContext(input.chartContext));
  const structuredFactsPresent = hasStructuredChartFacts(input.chartContext);
  const allowNarrativeFallback = !structuredFactsPresent;
  const structuredEvidence = setupEvidenceFromContext(entry, input.chartContext);
  const manualLevelConfirmation = levelsRequireManualConfirmation(input.chartContext);
  const modelOneValidation = entry.setupType === SetupType.SweepMssFvgRetrace
    ? validateModelOne(input.chartContext, manualLevelConfirmation)
    : null;
  const turtleSoupValidation = entry.setupType === SetupType.TurtleSoup
    ? validateTurtleSoup(input.chartContext, manualLevelConfirmation)
    : null;
  const primaryValidation = modelOneValidation || turtleSoupValidation;
  const bigPicture = bigPictureStructureForDirection(input.chartContext, primaryValidation?.direction || 'NO TRADE');
  const facts = allowNarrativeFallback ? findRelevantFacts(entry, extractPlanFacts(input.result), text) : [];
  const bestFact = facts.find((fact) => fact.entry !== null && fact.stop !== null) || facts[0] || null;
  const structuredDetected = !missingMorningWindowContext && Boolean(
    primaryValidation ? primaryValidation.detected : structuredEvidence?.detected || structuredContextDetectsSetup(entry, input.chartContext)
  );
  const structuredPossible = !missingMorningWindowContext && Boolean(
    primaryValidation
      ? primaryValidation.possible
      : structuredEvidence?.possible || (!structuredDetected && structuredContextSupportsSetup(entry, input.chartContext))
  );
  const narrativeDetected = !isLunchSubtype(entry.setupType) && allowNarrativeFallback && hasAny(text, [...entry.detectionKeywords, ...entry.aliases]);
  const narrativePossible = !isLunchSubtype(entry.setupType) && allowNarrativeFallback && hasAny(text, entry.possibleKeywords);
  const detected = structuredDetected || narrativeDetected;
  const possible = !detected && (structuredPossible || narrativePossible);
  const structuredDirection = structuredDirectionForSetup(entry, input.chartContext);
  const direction = structuredDirection && structuredDirection !== 'NO TRADE'
    ? structuredDirection
    : bestFact?.direction && bestFact.direction !== 'NO TRADE'
    ? bestFact.direction
    : detected || possible ? inferDirection(text) : 'NO TRADE';
  const entryPrice = manualLevelConfirmation ? null : primaryValidation ? primaryValidation.entry : parsePrice(structuredEvidence?.entry) ?? parsePrice(input.chartContext?.proposedEntry) ?? bestFact?.entry ?? null;
  const extractedStopPrice = manualLevelConfirmation ? null : primaryValidation ? primaryValidation.stop : parsePrice(structuredEvidence?.stop) ?? parsePrice(input.chartContext?.proposedStop) ?? bestFact?.stop ?? null;
  const stopPrice = manualLevelConfirmation ? null : extractedStopPrice;
  const extractedRisk = parsePrice(input.chartContext?.riskPoints);
  const risk =
    primaryValidation?.risk ??
    riskPoints(entryPrice, stopPrice) ??
    extractedRisk ??
    (input.chartContext?.riskStatus === 'RiskTooWide' ? TRADE_RULES.maxRiskPoints + TRADE_RULES.targetModel.tickSize : null);
  const targets = primaryValidation
    ? { target1: primaryValidation.target1, target2: primaryValidation.target2 }
    : computedTargets(direction, entryPrice, stopPrice);
  const invalidation = primaryValidation?.invalidation ?? structuredEvidence?.invalidation ?? (allowNarrativeFallback ? bestFact?.invalidation : null) ?? null;
  const confidence = primaryValidation?.confidence || structuredEvidence?.confidence || bestFact?.confidence || confidenceForStatus(detected ? SetupCandidateStatus.Detected : possible ? SetupCandidateStatus.Possible : SetupCandidateStatus.NotDetected);
  const levelContext = levelContextScoreForDirection(input.chartContext, direction);
  const qualityContext = candidateQualityContext(input.chartContext, direction, primaryValidation, entryPrice, risk, detected || possible);

  const detectedStatus =
    !allowed ? SetupCandidateStatus.Invalid :
    detected ? SetupCandidateStatus.Detected :
    possible ? SetupCandidateStatus.Possible :
    SetupCandidateStatus.NotDetected;

  const execution = executionStatusFor(
    detectedStatus,
    direction,
    risk,
    entryPrice !== null,
    stopPrice !== null,
    targets.target1 !== null && targets.target2 !== null,
    Boolean(typeof invalidation === 'string' && invalidation.trim().length >= 3),
    Boolean(primaryValidation?.hasPendingTrigger || (structuredEvidence?.triggerState || bestFact?.triggerState)?.toUpperCase().includes('PENDING')),
    entry.priority,
    confidence
  );
  const executionAfterBigPicture = bigPicture.countertrend && execution.executionStatus === ExecutionStatus.Executable
    ? { executionStatus: ExecutionStatus.Conditional, blockReason: NoTradeReason.EntryTriggerPending }
    : execution;
  const executionAfterStructureQuality = qualityContext.forceConditional && executionAfterBigPicture.executionStatus === ExecutionStatus.Executable
    ? { executionStatus: ExecutionStatus.Conditional, blockReason: NoTradeReason.EntryTriggerPending }
    : executionAfterBigPicture;
  const visibleStatus =
    bigPicture.countertrend && detectedStatus === SetupCandidateStatus.Detected
      ? SetupCandidateStatus.Possible
      : qualityContext.forceConditional && detectedStatus === SetupCandidateStatus.Detected
      ? SetupCandidateStatus.Possible
      : executionAfterStructureQuality.blockReason === NoTradeReason.RiskTooWide && detectedStatus === SetupCandidateStatus.Detected
      ? SetupCandidateStatus.Detected
      : detectedStatus;

  return {
    setupType: entry.setupType,
    direction,
    detectedStatus: visibleStatus,
    confidence,
    priority: entry.priority,
    entry: entryPrice,
    stop: stopPrice,
    target1: targets.target1,
    target2: targets.target2,
    riskPoints: risk,
    invalidation,
    entryClarity: entryPrice !== null ? 1 : detected || possible ? 0.45 : 0,
    stopClarity: stopPrice !== null ? 1 : detected || possible ? 0.35 : 0,
    targetClarity: targets.target1 !== null && targets.target2 !== null ? 1 : 0,
    proximityScore: detected ? 0.75 : possible ? 0.55 : 0,
    levelContextScore: levelContext.score + qualityContext.score,
    levelContextSummary: qualityContext.evidence.length
      ? `${levelContext.summary} ${qualityContext.evidence.join('. ')}.`
      : levelContext.summary,
    evidence: Array.from(new Set([
      ...(primaryValidation?.evidence?.length ? primaryValidation.evidence : structuredEvidence?.evidence?.length ? structuredEvidence.evidence : detected || possible ? entry.requiredEvidence : []),
      ...(bigPicture.evidence ? [bigPicture.evidence] : []),
      ...(detected || possible ? qualityContext.evidence : []),
      ...(detected || possible ? supportingEvidenceNotes(input.chartContext) : []),
    ])),
    missingEvidence: missingMorningWindowContext
      ? ['Completed Morning window context is required before this Lunch subtype can activate.']
      : manualLevelConfirmation
      ? Array.from(new Set([
          ...(primaryValidation?.missingEvidence || structuredEvidence?.missingEvidence || []),
          ...(bigPicture.missingEvidence ? [bigPicture.missingEvidence] : []),
          ...qualityContext.missingEvidence,
          'Exact entry/stop levels require manual confirmation.',
        ]))
      : Array.from(new Set([
          ...(primaryValidation?.missingEvidence?.length ? primaryValidation.missingEvidence : structuredEvidence?.missingEvidence?.length ? structuredEvidence.missingEvidence : detected ? [] : entry.requiredEvidence),
          ...(bigPicture.missingEvidence ? [bigPicture.missingEvidence] : []),
          ...qualityContext.missingEvidence,
        ])),
    executionStatus: executionAfterStructureQuality.executionStatus,
    blockReason: executionAfterStructureQuality.blockReason,
    requiredTrigger: primaryValidation?.requiredTrigger || structuredEvidence?.requiredTrigger || bestFact?.requiredTrigger || (detected || possible ? entry.defaultRequiredTrigger : null),
    nextAction:
      missingMorningWindowContext
        ? 'Load or complete Morning 15M/5M context first. Lunch subtypes cannot activate from the Lunch chart alone.'
        : bigPicture.countertrend
        ? 'Countertrend conditional only. Requires immediate reclaim failure and fresh 5M confirmation. Do not fight big-picture structure.'
        : qualityContext.forceConditional
        ? 'Structure quality is conditional. Wait for engineered liquidity, new inducement sweep, or a clean post-sweep retest. Do not chase the BOS candle.'
        : executionAfterStructureQuality.blockReason === NoTradeReason.RiskTooWide
        ? 'Execution blocked by actual risk. Preserve the setup and wait for a cleaner retest with a structure stop inside the allowed risk limit.'
        : entry.defaultNextAction,
    reducedRiskPlan:
      executionAfterStructureQuality.blockReason === NoTradeReason.RiskTooWide
        ? {
            direction,
            entry: null,
            stop: null,
            requiredTrigger: entry.defaultRequiredTrigger,
            invalidation: 'Reduced-risk plan must define a stop tied to active swing structure.',
            reasoning: 'Original setup is detected, but current entry-to-stop distance is too wide.',
        }
        : null,
  };
}

function notDetectedHtfDrawCandidate(entry: SetupRegistryEntry): SetupCandidate {
  return {
    setupType: entry.setupType,
    scenarioLabel: entry.label,
    candidateState: 'NO_QUALIFIED_STATE',
    pathway: 'htf_liquidity_draw_mss',
    direction: 'NO TRADE',
    detectedStatus: SetupCandidateStatus.NotDetected,
    confidence: 'Low',
    priority: entry.priority,
    entry: null,
    stop: null,
    target1: null,
    target2: null,
    riskPoints: null,
    invalidation: null,
    entryClarity: 0,
    stopClarity: 0,
    targetClarity: 0,
    proximityScore: 0,
    levelContextScore: 0,
    levelContextSummary: 'HTF liquidity draw model requires structured 4H/1H/15M/5M OHLC-derived state.',
    evidence: [],
    missingEvidence: entry.requiredEvidence,
    executionStatus: ExecutionStatus.NotDetected,
    blockReason: null,
    requiredTrigger: null,
    nextAction: 'No HTF draw continuation candidate. Wait for structured HTF draw, raid/reclaim, confirmed 5M MSS, and deterministic app gates.',
    reducedRiskPlan: null,
  };
}

function htfDirectionToPlanDirection(direction: string | null | undefined): Direction {
  if (direction === 'bullish') return 'LONG';
  if (direction === 'bearish') return 'SHORT';
  return 'NO TRADE';
}

function htfStateForTimeframe(chartContext: ChartContext, timeframe: '4H' | '1H' | '15M' | '5M') {
  return chartContext.htfLiquidityDrawState?.timeframeStates.find((state) => state.timeframe === timeframe) ||
    (timeframe === '5M' ? chartContext.htfLiquidityDrawState?.fiveMinuteState : undefined);
}

function htfMssConfirmationTypeValid(fiveMinuteEvidence: string[]): boolean {
  const text = fiveMinuteEvidence.join(' ').toLowerCase();
  return text.includes('confirmed close') &&
    (text.includes('swing high') || text.includes('swing low')) &&
    text.includes('displacement');
}

function htfMacroSupportsDirection(chartContext: ChartContext, direction: Direction): boolean {
  const state = chartContext.htfLiquidityDrawState;
  if (!state || direction === 'NO TRADE') return false;
  if (state.macroContext === 'conflicting') return false;
  if (state.macroContext === 'neutral' || state.macroContext === 'unknown') return true;
  return htfDirectionToPlanDirection(state.macroContext) === direction;
}

function fifteenMinuteSupportsCandidate(chartContext: ChartContext, direction: Direction): boolean {
  const fifteen = htfStateForTimeframe(chartContext, '15M');
  if (!fifteen || direction === 'NO TRADE') return false;
  if (fifteen.direction !== 'neutral' && fifteen.direction !== 'unknown' && htfDirectionToPlanDirection(fifteen.direction) !== direction) {
    return false;
  }
  return fifteen.status === 'confirmed' || fifteen.status === 'potential_mss' || fifteen.status === 'pending_confirm';
}

function htfExternalTargetLabel(chartContext: ChartContext, direction: Direction): string | null {
  if (direction !== 'LONG' && direction !== 'SHORT') return null;
  const directionalTimeframeTarget = chartContext.htfLiquidityDrawState?.timeframeStates.find((state) =>
    htfDirectionToPlanDirection(state.direction) === direction &&
    typeof state.externalLiquidityTarget === 'string' &&
    state.externalLiquidityTarget.trim().length > 0
  )?.externalLiquidityTarget;
  if (directionalTimeframeTarget) return directionalTimeframeTarget;
  const objective = (chartContext.targetObjectives || []).find((target) =>
    target.direction === direction &&
    target.type !== 'imbalance_zone' &&
    target.type !== 'gap' &&
    isReadableConfidence(target.confidence)
  );
  if (objective) return `${objective.label} ${objective.price}`;
  const keyLevels = chartContext.keyLevels || {};
  if (direction === 'LONG') {
    if (keyLevels.previousDayHigh || keyLevels.priorDayHigh) return 'prior RTH high / previous day high';
    if (keyLevels.overnightHigh) return 'full ETH high';
    if (keyLevels.londonHigh) return 'London high';
    if (keyLevels.activeSwingHigh) return 'active swing high';
  } else {
    if (keyLevels.previousDayLow || keyLevels.priorDayLow) return 'prior RTH low / previous day low';
    if (keyLevels.overnightLow) return 'full ETH low';
    if (keyLevels.londonLow) return 'London low';
    if (keyLevels.activeSwingLow) return 'active swing low';
  }
  return null;
}

function candidateStateForHtfCandidate(args: {
  risk: number | null;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  invalidation: string | null;
  riskStatus?: ChartContext['riskStatus'];
}): TradingPlanCandidateState {
  const riskTooWide = args.riskStatus === 'RiskTooWide' || (args.risk !== null && args.risk > TRADE_RULES.maxRiskPoints);
  if (!riskTooWide && args.entry !== null && args.stop !== null && args.target1 !== null && args.target2 !== null && args.invalidation) {
    return 'EXECUTABLE';
  }
  return 'REVERSAL_DELIVERY_PLAN_CANDIDATE';
}

function buildHtfLiquidityDrawCandidate(input: SetupScannerInput): SetupCandidate | null {
  const chartContext = input.chartContext;
  const state = chartContext?.htfLiquidityDrawState;
  if (!chartContext || !state) return null;
  const fiveMinute = state.fiveMinuteState;
  const direction = htfDirectionToPlanDirection(fiveMinute.direction);
  const fifteenMinute = htfStateForTimeframe(chartContext, '15M');
  const targetLabel = htfExternalTargetLabel(chartContext, direction);
  const macroSupported = htfMacroSupportsDirection(chartContext, direction);
  const fifteenSupports = fifteenMinuteSupportsCandidate(chartContext, direction);
  const fiveMinuteConfirmed = fiveMinute.status === 'confirmed' &&
    (fiveMinute.lifecycleState === 'confirmed_mss' || fiveMinute.lifecycleState === 'post_mss_digestion') &&
    htfMssConfirmationTypeValid(fiveMinute.evidence || []);
  const confidence = Math.max(state.confidence || 0, fiveMinute.confidence || 0);

  if (
    !isInsideApprovedSetupScanWindow(chartContext) ||
    direction === 'NO TRADE' ||
    !fiveMinuteConfirmed ||
    !macroSupported ||
    !fifteenSupports ||
    !targetLabel ||
    confidence < HTF_MSS_CANDIDATE_CONFIDENCE_THRESHOLD
  ) {
    return null;
  }

  const entry = parsePrice(chartContext.proposedEntry);
  const stop = parsePrice(chartContext.proposedStop);
  const risk = riskPoints(entry, stop) ?? parsePrice(chartContext.riskPoints) ??
    (chartContext.riskStatus === 'RiskTooWide' ? TRADE_RULES.maxRiskPoints + TRADE_RULES.targetModel.tickSize : null);
  const computed = computedTargets(direction, entry, stop);
  const target2 = computed.target2;
  const target1 = computed.target1;
  const invalidation = stop !== null
    ? direction === 'LONG'
      ? `Invalid if price trades below the sell-side raid/reclaim structure stop near ${stop}.`
      : `Invalid if price trades above the buy-side raid/reclaim structure stop near ${stop}.`
    : null;
  const riskTooWide = chartContext.riskStatus === 'RiskTooWide' || (risk !== null && risk > TRADE_RULES.maxRiskPoints);
  const candidateState = candidateStateForHtfCandidate({
    risk,
    entry,
    stop,
    target1,
    target2,
    invalidation,
    riskStatus: chartContext.riskStatus,
  });
  const raidLabel = direction === 'LONG' ? 'sell-side raid + bullish 5M MSS' : 'buy-side raid + bearish 5M MSS';
  const scannerPathwayState = candidateState === 'EXECUTABLE'
    ? 'scanner candidate fields complete; final deterministic pipeline gates still required'
    : candidateState;

  return {
    setupType: SetupType.HtfDrawContinuationAfterRaid,
    scenarioLabel: 'HTF Draw Continuation After Raid/Reclaim',
    candidateState,
    pathway: 'htf_liquidity_draw_mss',
    htfLiquidityDrawState: {
      ...state,
      boundary: 'candidate_creation_only_not_execution_authority',
      createsTradingPlanCandidate: true,
      approvesExecution: false,
    },
    direction,
    detectedStatus: candidateState === 'EXECUTABLE' ? SetupCandidateStatus.Detected : SetupCandidateStatus.Conditional,
    confidence: confidence >= 82 ? 'High' : 'Medium',
    priority: 96,
    entry,
    stop,
    target1,
    target2,
    riskPoints: risk,
    invalidation,
    entryClarity: entry !== null ? 0.85 : 0.25,
    stopClarity: stop !== null ? 0.85 : 0.25,
    targetClarity: target2 !== null ? 0.85 : 0.35,
    proximityScore: 0.82,
    levelContextScore: 18,
    levelContextSummary: `HTF liquidity draw pathway aligned: ${raidLabel}; external target: ${targetLabel}.`,
    evidence: Array.from(new Set([
      describeHtfLiquidityDrawStateForDisplay(state),
      describeTimeframeMssStateForDisplay(fifteenMinute || state.fiveMinuteState),
      describeTimeframeMssStateForDisplay(fiveMinute),
      'HTF liquidity draw detected',
      `15M raid/reclaim support status: ${fifteenMinute?.status || 'unknown'}`,
      '5M MSS trigger confirmed',
      '5M swing break/reclaim confirmed with displacement',
      `External liquidity target exists: ${targetLabel}`,
      'Execution still requires deterministic entry, stop, target, risk, and final pipeline gates.',
      `Pathway state: ${scannerPathwayState}`,
      ...(fiveMinute.evidence || []),
    ])),
    missingEvidence: Array.from(new Set([
      ...(entry === null ? ['Clean retest or defined reclaim entry'] : []),
      ...(stop === null ? ['Structure stop tied to raid/reclaim extreme'] : []),
      ...(target2 === null ? ['External liquidity target price / valid target room'] : []),
      ...(riskTooWide ? ['RiskTooWide remains a hard execution block'] : []),
    ])),
    executionStatus: candidateState === 'EXECUTABLE' ? ExecutionStatus.Executable : ExecutionStatus.Conditional,
    blockReason: riskTooWide ? NoTradeReason.RiskTooWide : null,
    requiredTrigger: direction === 'LONG'
      ? 'Long only after sell-side raid, reclaim, confirmed bullish 5M MSS with displacement, then clean retest or defined reclaim trigger.'
      : 'Short only after buy-side raid, reclaim, confirmed bearish 5M MSS with displacement, then clean retest or defined reclaim trigger.',
    nextAction: riskTooWide
      ? 'HTF/MSS reversal-delivery candidate is present, but RiskTooWide blocks execution. Wait for a cleaner retest with protected structure inside max risk.'
      : 'HTF/MSS candidate has scanner levels and direction. Execution still requires final app-owned entry, stop, target, risk, invalidation, session, screenshot-quality, and canExecute gates.',
    reducedRiskPlan: riskTooWide
      ? {
          direction,
          entry: null,
          stop: null,
          target1: null,
          target2: null,
          requiredTrigger: 'Clean retest after confirmed 5M MSS that tightens risk inside the allowed limit.',
          invalidation: 'Reduced-risk plan must define a protected structure stop beyond the raid/reclaim extreme.',
          reasoning: 'HTF/MSS pathway is valid, but current entry-to-stop distance is too wide.',
        }
      : null,
  };
}

export function rankSetupCandidate(candidate: SetupCandidate): number {
  const executionScore =
    candidate.executionStatus === ExecutionStatus.Executable ? 100 :
    candidate.executionStatus === ExecutionStatus.Conditional ? 70 :
    candidate.executionStatus === ExecutionStatus.Blocked ? 15 :
    0;
  const confidenceScore =
    candidate.confidence === 'High' ? 20 :
    candidate.confidence === 'Medium' ? 10 :
    0;
  const riskQuality =
    candidate.riskPoints === null || candidate.riskPoints === undefined ? 0 :
    candidate.riskPoints <= TRADE_RULES.preferredRiskPoints ? 20 :
    candidate.riskPoints <= TRADE_RULES.maxRiskPoints ? 10 :
    -20;
  const clarityScore =
    ((candidate.entryClarity || 0) + (candidate.stopClarity || 0) + (candidate.targetClarity || 0)) * 10;
  const confluenceBonus =
    (candidate.setupType === SetupType.SweepMssFvgRetrace || candidate.setupType === SetupType.TurtleSoup) &&
    candidate.evidence.includes('Breaker + FVG overlap confluence')
      ? 3
      : 0;
  const htfReversalDeliveryBonus = candidate.pathway === 'htf_liquidity_draw_mss' ? 24 : 0;
  const countertrendPenalty = candidate.missingEvidence.includes('Countertrend setup requires immediate failure confirmation; do not fight big-picture structure')
    ? -60
    : 0;
  const score =
    executionScore +
    confidenceScore +
    candidate.priority +
    riskQuality +
    clarityScore +
    (candidate.levelContextScore || 0) +
    (candidate.proximityScore || 0) * 10 +
    confluenceBonus +
    htfReversalDeliveryBonus +
    countertrendPenalty;
  candidate.rankScore = score;
  return score;
}

export function scanSetupCandidates(input: SetupScannerInput): SetupScanResult {
  const text = buildSearchText(input);
  const htfCandidate = buildHtfLiquidityDrawCandidate(input);
  const candidates = [
    ...getPrimarySetupRegistry(input.sessionType)
      .map((entry) =>
        entry.setupType === SetupType.HtfDrawContinuationAfterRaid && htfCandidate
          ? htfCandidate
          : entry.setupType === SetupType.HtfDrawContinuationAfterRaid
          ? notDetectedHtfDrawCandidate(entry)
          : candidateForEntry(entry, input, text)
      ),
  ]
    .sort((a, b) => rankSetupCandidate(b) - rankSetupCandidate(a));

  const bestExecutableCandidate = candidates.find((candidate) => candidate.executionStatus === ExecutionStatus.Executable) || null;
  const bestConditionalCandidate = candidates.find((candidate) => candidate.executionStatus === ExecutionStatus.Conditional) || null;

  return {
    candidates,
    bestExecutableCandidate,
    bestConditionalCandidate,
  };
}

export function getScannedSetupTypes(): SetupType[] {
  return getPrimarySetupRegistry('morning').map((entry) => entry.setupType);
}
