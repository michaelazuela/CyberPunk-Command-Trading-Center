import { ExecutionStatus, SetupCandidate, SetupCandidateStatus, SetupType } from '../types';
import { candidateHasConcretePlan, scenarioScore } from './scenarioSelection';

export const COLLISION_WAIT_MESSAGE =
  'Both LONG and SHORT evidence are active. Wait for completed 5M proof, protected-structure stop, and clean target room before promoting a desk plan.';

export type CollisionArbitrationState =
  | 'no_collision'
  | 'collision_wait'
  | 'single_side_ready'
  | 'both_sides_ready';

export interface CollisionArbitrationResult {
  state: CollisionArbitrationState;
  hasCollision: boolean;
  message: string | null;
  allowedDirection: 'LONG' | 'SHORT' | null;
  selectedCandidate: SetupCandidate | null;
  longClusterCount: number;
  shortClusterCount: number;
  readyLongCount: number;
  readyShortCount: number;
  supportingContextCandidates: SetupCandidate[];
  reasons: string[];
}

const MODEL_PRIORITY: Partial<Record<SetupType, number>> = {
  [SetupType.IntradayMssMicroContinuation]: 700,
  [SetupType.StructureShiftContinuation]: 600,
  [SetupType.LiquidityRaidReclaimReversal]: 500,
  [SetupType.RaidFailureDisplacementReversal]: 400,
  [SetupType.DrivePullbackContinuation]: 300,
  [SetupType.FailedBreakoutReversal]: 200,
};


function isValidPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function textFor(candidate: SetupCandidate): string {
  return [
    candidate.scenarioLabel,
    candidate.requiredTrigger,
    candidate.nextAction,
    candidate.invalidation,
    candidate.decisionQualityHardBlocker,
    candidate.targetRoom?.targetRoomReason,
    ...(candidate.evidence || []),
    ...(candidate.missingEvidence || []),
  ].filter(Boolean).join(' ').toLowerCase();
}

export function isDirectionalCollisionCandidate(candidate: SetupCandidate): boolean {
  if (candidate.direction !== 'LONG' && candidate.direction !== 'SHORT') return false;
  if (candidate.detectedStatus === SetupCandidateStatus.NotDetected || candidate.detectedStatus === SetupCandidateStatus.Invalid) {
    return false;
  }
  return (
    candidate.executionStatus === ExecutionStatus.Executable ||
    candidate.executionStatus === ExecutionStatus.Conditional ||
    candidate.executionStatus === ExecutionStatus.Blocked ||
    candidate.detectedStatus === SetupCandidateStatus.Possible ||
    candidate.detectedStatus === SetupCandidateStatus.Detected ||
    candidate.confidence === 'High' ||
    candidate.confidence === 'Medium' ||
    candidateHasConcretePlan(candidate)
  );
}

export function hasFullCollisionProof(candidate: SetupCandidate): boolean {
  if (candidate.direction !== 'LONG' && candidate.direction !== 'SHORT') return false;
  if (candidate.executionStatus !== ExecutionStatus.Executable) return false;
  if (candidate.blockReason || candidate.decisionQualityHardBlocker) return false;
  if (candidate.targetRoom?.targetRoomStatus === 'blocked_before_t1') return false;
  if (!candidateHasConcretePlan(candidate)) return false;
  if (!isValidPrice(candidate.entry) || !isValidPrice(candidate.stop) || !isValidPrice(candidate.target1) || !isValidPrice(candidate.target2)) {
    return false;
  }
  if (candidate.direction === 'LONG' && candidate.stop >= candidate.entry) return false;
  if (candidate.direction === 'SHORT' && candidate.stop <= candidate.entry) return false;

  const text = textFor(candidate);
  if (/(no chase|stale|missing trigger|entry trigger missing|pending trigger|wait for completed|no entry\/stop|not executable)/i.test(text)) {
    return false;
  }
  const timeframeMss = candidate.activeRuleset?.timeframeMss;
  if (timeframeMss?.applied && timeframeMss.status !== 'passed') return false;

  return true;
}

function completedProofStrength(candidate: SetupCandidate): number {
  const text = textFor(candidate);
  let score = 0;
  if (candidate.executionStatus === ExecutionStatus.Executable) score += 160;
  if (text.includes('completed 5m')) score += 38;
  if (text.includes('proof')) score += 24;
  if (text.includes('retest') || text.includes('hold')) score += 18;
  if (text.includes('protected 5m')) score += 22;
  if (candidate.activeRuleset?.timeframeMss?.status === 'passed') score += 20;
  return score;
}

function protectedStopStrength(candidate: SetupCandidate): number {
  const text = textFor(candidate);
  let score = 0;
  if (isValidPrice(candidate.stop)) score += 35;
  if (text.includes('protected 5m')) score += 28;
  if (text.includes('structure stop') || text.includes('swing')) score += 18;
  if (candidate.riskAdvisoryStatus === 'RISK_WITHIN_STANDARD_LIMIT') score += 12;
  if (candidate.riskAdvisoryStatus === 'RISK_EXTENDED_STRUCTURAL') score += 4;
  return score;
}

function targetRoomStrength(candidate: SetupCandidate): number {
  let score = 0;
  if (isValidPrice(candidate.target1)) score += 20;
  if (isValidPrice(candidate.target2)) score += 20;
  if (candidate.targetRoom?.targetRoomStatus && candidate.targetRoom.targetRoomStatus !== 'blocked_before_t1') score += 18;
  if (candidate.targetObjectivePlan) score += 8;
  return score;
}

function modelPriority(candidate: SetupCandidate): number {
  return MODEL_PRIORITY[candidate.setupType] ?? 0;
}

function arbitrationScore(candidate: SetupCandidate): number {
  return (
    completedProofStrength(candidate) +
    protectedStopStrength(candidate) +
    targetRoomStrength(candidate) +
    modelPriority(candidate) +
    scenarioScore(candidate)
  );
}

function bestReady(candidates: SetupCandidate[]): SetupCandidate | null {
  return [...candidates].sort((a, b) => arbitrationScore(b) - arbitrationScore(a))[0] || null;
}

export function applyCollisionFirstArbitration(candidates: SetupCandidate[] | undefined | null): CollisionArbitrationResult {
  const cluster = (candidates || []).filter(isDirectionalCollisionCandidate);
  const longCluster = cluster.filter((candidate) => candidate.direction === 'LONG');
  const shortCluster = cluster.filter((candidate) => candidate.direction === 'SHORT');
  const hasCollision = longCluster.length > 0 && shortCluster.length > 0;
  const base = {
    hasCollision,
    longClusterCount: longCluster.length,
    shortClusterCount: shortCluster.length,
    readyLongCount: 0,
    readyShortCount: 0,
    supportingContextCandidates: [] as SetupCandidate[],
  };

  if (!hasCollision) {
    return {
      ...base,
      state: 'no_collision',
      message: null,
      allowedDirection: null,
      selectedCandidate: null,
      reasons: ['No same-window long/short candidate collision detected.'],
    };
  }

  const readyLong = longCluster.filter(hasFullCollisionProof);
  const readyShort = shortCluster.filter(hasFullCollisionProof);
  const readyLongBest = bestReady(readyLong);
  const readyShortBest = bestReady(readyShort);
  const counts = {
    ...base,
    readyLongCount: readyLong.length,
    readyShortCount: readyShort.length,
  };

  if (!readyLongBest && !readyShortBest) {
    return {
      ...counts,
      state: 'collision_wait',
      message: COLLISION_WAIT_MESSAGE,
      allowedDirection: null,
      selectedCandidate: null,
      supportingContextCandidates: cluster,
      reasons: ['Collision exists, but neither side has the full completed 5M proof contract.'],
    };
  }

  if (readyLongBest && !readyShortBest) {
    return {
      ...counts,
      state: 'single_side_ready',
      message: null,
      allowedDirection: 'LONG',
      selectedCandidate: readyLongBest,
      supportingContextCandidates: shortCluster,
      reasons: ['Collision exists; only LONG has completed 5M proof, protected stop, and target room.'],
    };
  }

  if (!readyLongBest && readyShortBest) {
    return {
      ...counts,
      state: 'single_side_ready',
      message: null,
      allowedDirection: 'SHORT',
      selectedCandidate: readyShortBest,
      supportingContextCandidates: longCluster,
      reasons: ['Collision exists; only SHORT has completed 5M proof, protected stop, and target room.'],
    };
  }

  return {
    ...counts,
    state: 'collision_wait',
    message: COLLISION_WAIT_MESSAGE,
    allowedDirection: null,
    selectedCandidate: null,
    supportingContextCandidates: cluster,
    reasons: ['Collision exists and both sides have completed proof; require a fresh separation/retest instead of forced promotion.'],
  };
}
