import {
  AnalysisResult,
  ExecutionStatus,
  NoTradeReason,
  SetupCandidate,
  SetupCandidateStatus,
  SetupType,
} from '../types';
import { TRADE_RULES } from '../config/tradeRules';
import { SETUP_REGISTRY, SetupRegistryEntry, SetupSession } from '../config/setupRegistry';

type Direction = SetupCandidate['direction'];
type Confidence = SetupCandidate['confidence'];

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

export interface SetupScannerInput {
  sessionType: SetupSession;
  result?: AnalysisResult | null;
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

function riskPoints(entry: number | null, stop: number | null): number | null {
  if (!entry || !stop) return null;
  return Math.abs(entry - stop);
}

function computedTargets(direction: Direction, entry: number | null, stop: number | null): { target1: number | null; target2: number | null } {
  const risk = riskPoints(entry, stop);
  if ((direction !== 'LONG' && direction !== 'SHORT') || risk === null) return { target1: null, target2: null };
  const sign = direction === 'LONG' ? 1 : -1;
  return {
    target1: roundToTick(entry + sign * risk * TRADE_RULES.targetModel.t1R),
    target2: roundToTick(entry + sign * risk * TRADE_RULES.targetModel.t2R),
  };
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
  const facts = findRelevantFacts(entry, extractPlanFacts(input.result), text);
  const bestFact = facts.find((fact) => fact.entry !== null && fact.stop !== null) || facts[0] || null;
  const detected = hasAny(text, [...entry.detectionKeywords, ...entry.aliases]);
  const possible = !detected && hasAny(text, entry.possibleKeywords);
  const direction = bestFact?.direction && bestFact.direction !== 'NO TRADE'
    ? bestFact.direction
    : detected || possible ? inferDirection(text) : 'NO TRADE';
  const entryPrice = bestFact?.entry ?? null;
  const stopPrice = bestFact?.stop ?? null;
  const risk = riskPoints(entryPrice, stopPrice);
  const targets = computedTargets(direction, entryPrice, stopPrice);
  const invalidation = bestFact?.invalidation ?? null;
  const confidence = bestFact?.confidence || confidenceForStatus(detected ? SetupCandidateStatus.Detected : possible ? SetupCandidateStatus.Possible : SetupCandidateStatus.NotDetected);

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
    Boolean(invalidation && invalidation.trim().length >= 3),
    Boolean(bestFact?.triggerState && bestFact.triggerState.toUpperCase().includes('PENDING')),
    entry.priority,
    confidence
  );
  const visibleStatus =
    execution.blockReason === NoTradeReason.RiskTooWide && detectedStatus === SetupCandidateStatus.Detected
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
    evidence: detected || possible ? entry.requiredEvidence : [],
    missingEvidence: detected ? [] : entry.requiredEvidence,
    executionStatus: execution.executionStatus,
    blockReason: execution.blockReason,
    requiredTrigger: bestFact?.requiredTrigger || (detected || possible ? entry.defaultRequiredTrigger : null),
    nextAction:
      execution.blockReason === NoTradeReason.RiskTooWide
        ? 'Execution blocked by risk. Preserve setup and wait for a reduced-risk trigger.'
        : entry.defaultNextAction,
    reducedRiskPlan:
      execution.blockReason === NoTradeReason.RiskTooWide
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
  const score =
    executionScore +
    confidenceScore +
    candidate.priority +
    riskQuality +
    clarityScore +
    (candidate.proximityScore || 0) * 10;
  candidate.rankScore = score;
  return score;
}

export function scanSetupCandidates(input: SetupScannerInput): SetupScanResult {
  const text = buildSearchText(input);
  const candidates = SETUP_REGISTRY
    .map((entry) => candidateForEntry(entry, input, text))
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
  return SETUP_REGISTRY.map((entry) => entry.setupType);
}
