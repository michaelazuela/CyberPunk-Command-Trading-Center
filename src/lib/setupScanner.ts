import {
  AnalysisResult,
  ChartContext,
  ExecutionStatus,
  NoTradeReason,
  SetupCandidate,
  SetupCandidateStatus,
  SetupCandidateProofSelectionSignal,
  SetupType,
} from '../types';
import { getAllowedSetupRegistry } from '../config/setupRegistry';
import { TRADE_RULES } from '../config/tradeRules';
import { detectDrivePullbackContinuation } from './forensicModels/drivePullbackContinuation';
import { detectFailedBreakoutReversal } from './forensicModels/failedBreakoutReversal';
import { detectLiquidityRaidReclaimReversal } from './forensicModels/liquidityRaidReclaimReversal';
import { detectRaidFailureDisplacementReversal } from './forensicModels/raidFailureDisplacementReversal';
import { detectStructureShiftContinuation } from './forensicModels/structureShiftContinuation';

export const HTF_MSS_CANDIDATE_CONFIDENCE_THRESHOLD = 0;

interface ZoneOverlap {
  valid: boolean;
  low: number | null;
  high: number | null;
}

export interface SetupScannerInput {
  sessionType: 'morning' | 'lunch' | 'evening' | 'replay_morning' | 'replay_lunch';
  result?: AnalysisResult | null;
  chartContext?: ChartContext | null;
  contextText?: string;
}

export interface SetupScanResult {
  candidates: SetupCandidate[];
  bestExecutableCandidate: SetupCandidate | null;
  bestConditionalCandidate: SetupCandidate | null;
}

export interface CompletedFiveMinuteProofSelectionSignalRef {
  candidateKey: string;
  direction: 'LONG' | 'SHORT';
  sessionType: SetupScannerInput['sessionType'];
  setupType: SetupType;
  completedBarTime: string;
}

export function computeZoneOverlap(aLow: unknown, aHigh: unknown, bLow: unknown, bHigh: unknown): ZoneOverlap {
  if (
    typeof aLow !== 'number' ||
    typeof aHigh !== 'number' ||
    typeof bLow !== 'number' ||
    typeof bHigh !== 'number' ||
    !Number.isFinite(aLow) ||
    !Number.isFinite(aHigh) ||
    !Number.isFinite(bLow) ||
    !Number.isFinite(bHigh)
  ) {
    return { valid: false, low: null, high: null };
  }
  const low = Math.max(Math.min(aLow, aHigh), Math.min(bLow, bHigh));
  const high = Math.min(Math.max(aLow, aHigh), Math.max(bLow, bHigh));
  return low <= high ? { valid: true, low, high } : { valid: false, low: null, high: null };
}

export function applyCandidateGeometryValidation(candidate: SetupCandidate): SetupCandidate {
  if (candidate.direction !== 'LONG' && candidate.direction !== 'SHORT') return candidate;
  if (typeof candidate.entry !== 'number' || typeof candidate.stop !== 'number') return candidate;
  const invalid = candidate.direction === 'LONG'
    ? candidate.stop >= candidate.entry
    : candidate.stop <= candidate.entry;
  if (!invalid) return candidate;
  return {
    ...candidate,
    executionStatus: ExecutionStatus.Blocked,
    blockReason: NoTradeReason.InvalidStopLocation,
    missingEvidence: [
      ...candidate.missingEvidence,
      'Blank-slate scanner blocked invalid entry-to-stop geometry.',
    ],
  };
}

export function buildCompletedFiveMinuteProofSelectionSignals(
  _refs: CompletedFiveMinuteProofSelectionSignalRef[] = []
): Record<string, SetupCandidateProofSelectionSignal> {
  return {};
}

type InstalledModelDetection = {
  modelId:
    | 'liquidity_raid_reclaim_reversal'
    | 'raid_failure_displacement_reversal'
    | 'drive_pullback_continuation'
    | 'structure_shift_continuation'
    | 'failed_breakout_reversal';
  detected: boolean;
  direction: 'LONG' | 'SHORT' | null;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  riskPoints: number | null;
  proofTime: string | null;
  htfContext: 'support' | 'caution' | 'conflict' | 'unknown';
  evidence: string[];
  missingEvidence: string[];
};

const SETUP_TYPE_BY_MODEL_ID: Record<InstalledModelDetection['modelId'], SetupType> = {
  liquidity_raid_reclaim_reversal: SetupType.LiquidityRaidReclaimReversal,
  raid_failure_displacement_reversal: SetupType.RaidFailureDisplacementReversal,
  drive_pullback_continuation: SetupType.DrivePullbackContinuation,
  structure_shift_continuation: SetupType.StructureShiftContinuation,
  failed_breakout_reversal: SetupType.FailedBreakoutReversal,
};

function isValidPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function hasDirectionallyValidStop(
  direction: 'LONG' | 'SHORT',
  entry: number | null | undefined,
  stop: number | null | undefined
): boolean {
  if (!isValidPrice(entry) || !isValidPrice(stop)) return false;
  return direction === 'LONG' ? stop < entry : stop > entry;
}

function candidateFromDetection(
  detection: InstalledModelDetection,
  chartContext: ChartContext,
  priority: number
): SetupCandidate | null {
  if (!detection.detected || (detection.direction !== 'LONG' && detection.direction !== 'SHORT')) return null;
  const stopIsDirectionallyValid = hasDirectionallyValidStop(detection.direction, detection.entry, detection.stop);
  const rTargets = {
    target1: detection.target1,
    target2: detection.target2,
  };
  const target1 = stopIsDirectionallyValid ? rTargets.target1 : null;
  const target2 = stopIsDirectionallyValid ? rTargets.target2 : null;
  if (
    !isValidPrice(detection.entry) ||
    !isValidPrice(detection.stop) ||
    !isValidPrice(target1) ||
    !isValidPrice(target2) ||
    !isValidPrice(detection.riskPoints) ||
    !detection.proofTime
  ) {
    return null;
  }
  const setupType = SETUP_TYPE_BY_MODEL_ID[detection.modelId];
  const registryEntry = getAllowedSetupRegistry(chartContext.sessionType).find((entry) => entry.setupType === setupType);
  if (!registryEntry) return null;

  const riskTooWide = detection.riskPoints > TRADE_RULES.maxRiskPoints;
  const missingEvidence = [
    ...detection.missingEvidence,
    ...(riskTooWide ? [`Risk ${detection.riskPoints.toFixed(2)} exceeds standard ${TRADE_RULES.maxRiskPoints.toFixed(2)}.`] : []),
  ];

  return applyCandidateGeometryValidation({
    setupType,
    scenarioLabel: registryEntry.label,
    direction: detection.direction,
    detectedStatus: riskTooWide ? SetupCandidateStatus.Conditional : SetupCandidateStatus.Detected,
    confidence: detection.htfContext === 'support' ? 'High' : detection.htfContext === 'conflict' ? 'Medium' : 'High',
    priority,
    entry: detection.entry,
    stop: detection.stop,
    target1,
    target2,
    riskPoints: detection.riskPoints,
    riskAdvisoryStatus: riskTooWide ? 'RISK_ABOVE_STANDARD_LIMIT' : 'RISK_WITHIN_STANDARD_LIMIT',
    riskPolicy: riskTooWide ? 'STRUCTURAL_RISK_ACKNOWLEDGED' : 'STANDARD_RISK',
    invalidation: detection.direction === 'LONG'
      ? `Invalid below protected 5M structure stop ${detection.stop}.`
      : `Invalid above protected 5M structure stop ${detection.stop}.`,
    entryClarity: 90,
    stopClarity: 90,
    targetClarity: 90,
    rankScore: priority,
    evidence: [
      ...detection.evidence,
      `Scanner-installed model: ${registryEntry.label}.`,
      `HTF context: ${detection.htfContext}; HTF is map/support/caution only, 5M proof remains execution authority.`,
    ],
    missingEvidence,
    executionStatus: ExecutionStatus.Conditional,
    blockReason: riskTooWide ? NoTradeReason.RiskTooWide : null,
    requiredTrigger: registryEntry.defaultRequiredTrigger,
    nextAction: riskTooWide
      ? 'Review only: model proof exists, but risk is above the standard cap. Do not execute unless a tighter protected 5M plan forms.'
      : 'Approved model proof exists. Use as a conditional desk plan; existing execution, Discord, and risk gates still apply.',
    reducedRiskPlan: null,
    humanReview: {
      status: 'HumanReviewReady',
      canExecute: false,
      requiresTraderConfirmation: true,
      discordTradePlanEligible: true,
      reason: 'Five-model scanner detection installed; execution approval remains controlled by existing deterministic gates.',
    },
  });
}

export function rankSetupCandidate(candidate: SetupCandidate): number {
  const registryPriority = getAllowedSetupRegistry('morning').find((entry) => entry.setupType === candidate.setupType)?.priority;
  return registryPriority ?? candidate.priority ?? (candidate.setupType === SetupType.NoSetup ? 0 : -1);
}

export function scanSetupCandidates(input: SetupScannerInput): SetupScanResult {
  const chartContext = input.chartContext;
  if (!chartContext) {
    return {
      candidates: [],
      bestExecutableCandidate: null,
      bestConditionalCandidate: null,
    };
  }
  const detections: InstalledModelDetection[] = [
    detectRaidFailureDisplacementReversal(chartContext),
    detectLiquidityRaidReclaimReversal(chartContext),
    detectFailedBreakoutReversal(chartContext),
    detectStructureShiftContinuation(chartContext),
    detectDrivePullbackContinuation(chartContext),
  ];
  const priorityByType = new Map(getAllowedSetupRegistry(input.sessionType).map((entry) => [entry.setupType, entry.priority]));
  const candidates = detections
    .map((detection) => candidateFromDetection(
      detection,
      chartContext,
      priorityByType.get(SETUP_TYPE_BY_MODEL_ID[detection.modelId]) ?? 0
    ))
    .filter((candidate): candidate is SetupCandidate => Boolean(candidate))
    .sort((a, b) => rankSetupCandidate(b) - rankSetupCandidate(a));
  const selectedCandidates = candidates.slice(0, 1);
  return {
    candidates: selectedCandidates,
    bestExecutableCandidate: null,
    bestConditionalCandidate: selectedCandidates.find((candidate) => candidate.executionStatus === ExecutionStatus.Conditional) || null,
  };
}

export function getScannedSetupTypes(): SetupType[] {
  return [
    SetupType.RaidFailureDisplacementReversal,
    SetupType.LiquidityRaidReclaimReversal,
    SetupType.FailedBreakoutReversal,
    SetupType.StructureShiftContinuation,
    SetupType.DrivePullbackContinuation,
  ];
}
