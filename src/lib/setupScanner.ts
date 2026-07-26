import {
  AnalysisResult,
  ChartContext,
  ExecutionStatus,
  NoTradeReason,
  SetupCandidate,
  SetupCandidateProofSelectionSignal,
  SetupType,
} from '../types';

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

export function rankSetupCandidate(candidate: SetupCandidate): number {
  return candidate.setupType === SetupType.NoSetup ? 0 : -1;
}

export function scanSetupCandidates(_input: SetupScannerInput): SetupScanResult {
  return {
    candidates: [],
    bestExecutableCandidate: null,
    bestConditionalCandidate: null,
  };
}

export function getScannedSetupTypes(): SetupType[] {
  return [];
}
