import { ExecutionStatus, NoTradeReason, SetupCandidate, SetupType } from '../types';

export type UnifiedDeskCandidateState =
  | 'executable'
  | 'human_review'
  | 'watch'
  | 'no_chase'
  | 'blocked'
  | 'no_trade';

export type UnifiedDeskCandidateFamily =
  | 'strict_primary'
  | 'htf_displacement_continuation'
  | 'opening_drive_continuation'
  | 'after_lunch_drive_continuation'
  | 'intraday_continuation'
  | 'failed_plan_reversal'
  | 'other';

export interface UnifiedDeskCandidateBookInput {
  candidates: SetupCandidate[];
  sessionType: 'morning' | 'lunch' | 'replay_morning' | 'replay_lunch';
  completedBarTime?: string | null;
  canExecuteByCandidateKey?: Record<string, boolean>;
}

export interface UnifiedDeskCandidateBookItem {
  candidateKey: string;
  setupType: SetupType;
  family: UnifiedDeskCandidateFamily;
  direction: SetupCandidate['direction'];
  state: UnifiedDeskCandidateState;
  rank: number;
  score: number;
  confidenceScore: number;
  freshnessScore: number;
  htfScore: number;
  fiveMinuteProofScore: number;
  riskScore: number;
  targetRoomScore: number;
  canExecute: boolean;
  humanReviewOnly: boolean;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  riskPoints: number | null;
  htfSupport: 'supporting' | 'conflicting' | 'neutral' | 'data_limited';
  fiveMinuteProofStatus: 'confirmed' | 'partial' | 'missing';
  blockers: string[];
  nextProofRequired: string[];
  sourceCandidate: SetupCandidate;
  approvalBoundary: UnifiedDeskCandidateBook['approvalBoundary'];
}

export interface UnifiedDeskCandidateBook {
  sourceOfTruth: 'unified_desk_candidate_book_audit';
  primaryDeskIdea: UnifiedDeskCandidateBookItem | null;
  candidates: UnifiedDeskCandidateBookItem[];
  stateCounts: Record<UnifiedDeskCandidateState, number>;
  approvalBoundary: {
    auditOnly: true;
    changesTradeApprovals: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRiskRules: false;
    changesBridgeBehavior: false;
    postsDiscord: false;
    writesSupabase: false;
  };
  notes: string[];
}

const STATE_ORDER: Record<UnifiedDeskCandidateState, number> = {
  executable: 6,
  human_review: 5,
  watch: 4,
  no_chase: 3,
  blocked: 2,
  no_trade: 1,
};

function finitePrice(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function confidenceLabelScore(candidate: SetupCandidate): number {
  if (typeof candidate.modelConfidenceScore === 'number') return candidate.modelConfidenceScore;
  if (candidate.confidence === 'High') return 85;
  if (candidate.confidence === 'Medium') return 65;
  return 40;
}

function bounded(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export function buildUnifiedDeskCandidateKey(candidate: SetupCandidate, index: number): string {
  const line = finitePrice(candidate.activeRuleset?.htfLineInSand?.lineInSand) ?? finitePrice(candidate.entry);
  return [
    candidate.setupType,
    candidate.scenarioLabel || 'base',
    candidate.direction,
    line === null ? 'no-line' : line.toFixed(2),
    index,
  ].join('|');
}

function familyForSetup(setupType: SetupType): UnifiedDeskCandidateFamily {
  if (setupType === SetupType.SweepMssFvgRetrace || setupType === SetupType.TurtleSoup) return 'strict_primary';
  if (
    setupType === SetupType.HtfDrawContinuationAfterRaid ||
    setupType === SetupType.HtfDisplacementMssContinuation ||
    setupType === SetupType.HtfDisplacementFvgContinuation
  ) return 'htf_displacement_continuation';
  if (setupType === SetupType.OpeningDriveFvgContinuation) return 'opening_drive_continuation';
  if (setupType === SetupType.AfterLunchDriveFvgContinuation) return 'after_lunch_drive_continuation';
  if (setupType === SetupType.IntradayMssMicroContinuation) return 'intraday_continuation';
  if (setupType === SetupType.FailedPlanReversal) return 'failed_plan_reversal';
  return 'other';
}

function minutesFromIso(value: string | null | undefined): number | null {
  const match = value?.match(/T(\d{2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function afterLunchWindowBlocker(input: UnifiedDeskCandidateBookInput, candidate: SetupCandidate): string | null {
  if (candidate.setupType !== SetupType.AfterLunchDriveFvgContinuation) return null;
  if (input.sessionType !== 'lunch' && input.sessionType !== 'replay_lunch') {
    return 'After-Lunch Drive FVG Continuation is isolated to lunch/replay lunch sessions.';
  }
  const minutes = minutesFromIso(input.completedBarTime);
  if (minutes === null) return null;
  const start = 12 * 60 + 30;
  const end = 13 * 60 + 30;
  return minutes >= start && minutes <= end
    ? null
    : 'After-Lunch Drive FVG Continuation requires 12:30-13:30 ET setup formation evidence.';
}

function hasFullPlanLevels(candidate: SetupCandidate): boolean {
  const entry = finitePrice(candidate.entry);
  const stop = finitePrice(candidate.stop);
  const target1 = finitePrice(candidate.target1);
  const target2 = finitePrice(candidate.target2);
  if (entry === null || stop === null || target1 === null || target2 === null) return false;
  if (candidate.direction === 'LONG') return stop < entry && entry < target1 && target1 <= target2;
  if (candidate.direction === 'SHORT') return stop > entry && entry > target1 && target1 >= target2;
  return false;
}

function candidateText(candidate: SetupCandidate): string {
  return [
    candidate.blockReason,
    candidate.requiredTrigger,
    candidate.nextAction,
    candidate.invalidation,
    candidate.decisionQualityHardBlocker,
    ...(candidate.missingEvidence || []),
    ...(candidate.evidence || []),
  ].filter(Boolean).join(' ');
}

function isNoChase(candidate: SetupCandidate): boolean {
  return /no chase|do not chase|missed|already reached|past T1|closer to T1|preferred entry was missed/i.test(candidateText(candidate));
}

function htfSupport(candidate: SetupCandidate): UnifiedDeskCandidateBookItem['htfSupport'] {
  const text = candidateText(candidate);
  if (/data[-_ ]limited|insufficient htf|HTF context insufficient/i.test(text)) return 'data_limited';
  if (candidate.activeRuleset?.htfLineInSand?.status === 'blocked' || /HTF\/protected structure conflict|conflict/i.test(text)) {
    return 'conflicting';
  }
  if (candidate.activeRuleset?.htfLineInSand?.status === 'passed' || /HTF|15M|60M|120M|240M|4H|2H|1H/i.test(text)) {
    return 'supporting';
  }
  return 'neutral';
}

function fiveMinuteProofStatus(candidate: SetupCandidate): UnifiedDeskCandidateBookItem['fiveMinuteProofStatus'] {
  const text = candidateText(candidate);
  if (candidate.activeRuleset?.timeframeMss?.status === 'passed') return 'confirmed';
  if (/completed 5M|5M MSS|5M FVG retest|5M close|protected 5M/i.test(text)) return 'partial';
  return 'missing';
}

function aggregateBlockers(candidate: SetupCandidate, explicitBlocker: string | null): string[] {
  return [
    explicitBlocker,
    candidate.decisionQualityHardBlocker,
    candidate.blockReason,
    ...(candidate.missingEvidence || []),
    ...(candidate.missingLevels || []).map((item) => item.reason),
  ].filter((item): item is string => Boolean(item));
}

function nextProofRequired(candidate: SetupCandidate, state: UnifiedDeskCandidateState): string[] {
  const proof = [
    ...(candidate.missingEvidence || []),
    candidate.requiredTrigger,
    candidate.nextAction,
  ].filter((item): item is string => Boolean(item));
  if (state === 'executable') return ['Existing deterministic canExecute gate already passed; keep audit-only boundary.'];
  if (state === 'human_review' && proof.length === 0) return ['Trader review required; canExecute remains internal.'];
  if (state === 'no_chase') return ['Wait for a fresh completed 5M retest/re-entry proof or next setup.'];
  return proof.length ? proof : ['Wait for completed 5M proof, protected stop, target room, and risk validation.'];
}

function stateForCandidate(args: {
  candidate: SetupCandidate;
  canExecute: boolean;
  blockers: string[];
  afterLunchBlocker: string | null;
}): UnifiedDeskCandidateState {
  const candidate = args.candidate;
  if (candidate.direction === 'NO TRADE') return 'no_trade';
  if (args.afterLunchBlocker) return 'blocked';
  if (isNoChase(candidate)) return 'no_chase';
  if (args.canExecute && candidate.executionStatus === ExecutionStatus.Executable && hasFullPlanLevels(candidate)) return 'executable';
  if (candidate.executionStatus === ExecutionStatus.Blocked || candidate.executionStatus === ExecutionStatus.Invalid) return 'blocked';
  if (candidate.blockReason && candidate.blockReason !== NoTradeReason.LowConfidence && candidate.blockReason !== NoTradeReason.EntryTriggerPending) {
    return hasFullPlanLevels(candidate) ? 'human_review' : 'blocked';
  }
  if (hasFullPlanLevels(candidate)) return 'human_review';
  if (candidate.executionStatus === ExecutionStatus.Conditional || candidate.executionStatus === ExecutionStatus.Executable) return 'watch';
  return args.blockers.length ? 'blocked' : 'watch';
}

function scoreForCandidate(args: {
  candidate: SetupCandidate;
  state: UnifiedDeskCandidateState;
  confidenceScore: number;
  htf: UnifiedDeskCandidateBookItem['htfSupport'];
  fiveMinute: UnifiedDeskCandidateBookItem['fiveMinuteProofStatus'];
}): Pick<UnifiedDeskCandidateBookItem, 'score' | 'freshnessScore' | 'htfScore' | 'fiveMinuteProofScore' | 'riskScore' | 'targetRoomScore'> {
  const candidate = args.candidate;
  const freshnessScore = args.state === 'no_chase' ? 20 : args.state === 'blocked' ? 35 : 80;
  const htfScore = args.htf === 'supporting' ? 80 : args.htf === 'neutral' ? 55 : args.htf === 'data_limited' ? 35 : 20;
  const fiveMinuteProofScore = args.fiveMinute === 'confirmed' ? 90 : args.fiveMinute === 'partial' ? 60 : 25;
  const riskScore = typeof candidate.riskPoints === 'number'
    ? bounded(100 - Math.max(0, candidate.riskPoints - 4) * 8)
    : hasFullPlanLevels(candidate) ? 65 : 20;
  const targetRoomScore = candidate.targetRoom?.targetRoomStatus === 'clean_t1_t2'
    ? 85
    : candidate.targetRoom?.targetRoomStatus === 'blocked_before_t1'
      ? 20
      : hasFullPlanLevels(candidate) ? 65 : 20;
  const decisionQuality = typeof candidate.decisionQualityScore === 'number' ? candidate.decisionQualityScore : args.confidenceScore;
  const base = (
    args.confidenceScore * 0.26 +
    decisionQuality * 0.18 +
    freshnessScore * 0.18 +
    htfScore * 0.14 +
    fiveMinuteProofScore * 0.14 +
    riskScore * 0.05 +
    targetRoomScore * 0.05
  );
  const stateAdjustment = args.state === 'executable'
    ? 8
    : args.state === 'human_review'
      ? 4
      : args.state === 'watch'
        ? 0
        : args.state === 'no_chase'
          ? -18
          : -28;
  return {
    score: Math.round(bounded(base + stateAdjustment) * 100) / 100,
    freshnessScore,
    htfScore,
    fiveMinuteProofScore,
    riskScore,
    targetRoomScore,
  };
}

export function buildUnifiedDeskCandidateBook(input: UnifiedDeskCandidateBookInput): UnifiedDeskCandidateBook {
  const approvalBoundary: UnifiedDeskCandidateBook['approvalBoundary'] = {
    auditOnly: true,
    changesTradeApprovals: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    changesRiskRules: false,
    changesBridgeBehavior: false,
    postsDiscord: false,
    writesSupabase: false,
  };

  const candidates = input.candidates.map((candidate, index) => {
    const key = buildUnifiedDeskCandidateKey(candidate, index);
    const canExecute = Boolean(input.canExecuteByCandidateKey?.[key]);
    const afterLunchBlocker = afterLunchWindowBlocker(input, candidate);
    const blockers = aggregateBlockers(candidate, afterLunchBlocker);
    const state = stateForCandidate({ candidate, canExecute, blockers, afterLunchBlocker });
    const htf = htfSupport(candidate);
    const fiveMinute = fiveMinuteProofStatus(candidate);
    const confidenceScore = bounded(confidenceLabelScore(candidate));
    const scores = scoreForCandidate({ candidate, state, confidenceScore, htf, fiveMinute });
    return {
      candidateKey: key,
      setupType: candidate.setupType,
      family: familyForSetup(candidate.setupType),
      direction: candidate.direction,
      state,
      rank: 0,
      confidenceScore,
      canExecute,
      humanReviewOnly: !canExecute,
      entry: finitePrice(candidate.entry),
      stop: finitePrice(candidate.stop),
      target1: finitePrice(candidate.target1),
      target2: finitePrice(candidate.target2),
      riskPoints: typeof candidate.riskPoints === 'number' ? candidate.riskPoints : null,
      htfSupport: htf,
      fiveMinuteProofStatus: fiveMinute,
      blockers,
      nextProofRequired: nextProofRequired(candidate, state),
      sourceCandidate: candidate,
      approvalBoundary,
      ...scores,
    } satisfies UnifiedDeskCandidateBookItem;
  }).sort((a, b) =>
    STATE_ORDER[b.state] - STATE_ORDER[a.state] ||
    b.score - a.score ||
    b.sourceCandidate.priority - a.sourceCandidate.priority
  ).map((item, index) => ({ ...item, rank: index + 1 }));

  const stateCounts: Record<UnifiedDeskCandidateState, number> = {
    executable: 0,
    human_review: 0,
    watch: 0,
    no_chase: 0,
    blocked: 0,
    no_trade: 0,
  };
  for (const item of candidates) stateCounts[item.state] += 1;

  return {
    sourceOfTruth: 'unified_desk_candidate_book_audit',
    primaryDeskIdea: candidates[0] || null,
    candidates,
    stateCounts,
    approvalBoundary,
    notes: [
      'Unified Desk Candidate Book is audit-only in this phase.',
      'The highest-ranked idea is the primary desk read, not automatic execution approval.',
      'canExecute remains an internal deterministic gate and is never created by this book.',
      'Discord, Supabase, bridge behavior, entry, stop, target, risk, and trading rules are unchanged.',
    ],
  };
}
