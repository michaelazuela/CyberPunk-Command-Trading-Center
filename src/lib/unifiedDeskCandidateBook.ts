import { SetupCandidate, SetupType } from '../types';

export type UnifiedDeskCandidateState =
  | 'executable'
  | 'human_review'
  | 'watch'
  | 'no_chase'
  | 'blocked'
  | 'no_trade';

export type UnifiedTradingModelCandidateState =
  | 'execution_ready'
  | 'review_ticket'
  | 'ranked_candidate'
  | 'blocked_missing_5m_proof'
  | 'blocked_missing_plan_geometry'
  | 'blocked_no_fill'
  | 'blocked'
  | 'no_trade';

export type UnifiedDeskCandidateFamily = 'other';

export interface UnifiedDeskCandidateBookInput {
  candidates: SetupCandidate[];
  sessionType: 'morning' | 'lunch' | 'evening' | 'replay_morning' | 'replay_lunch' | 'replay_evening';
  completedBarTime?: string | null;
  canExecuteByCandidateKey?: Record<string, boolean>;
}

export interface UnifiedDeskCandidateCollisionMetadata {
  metadataSource: 'blank_slate_no_collision_ranking';
  groupKey: string;
  groupSize: number;
  proofOrder: null;
  proofAgeMinutes: null;
  competingCandidateKeys: string[];
  replacementCandidateKey: null;
  selectorCandidate: 'none';
  selectorEligible: false;
  selectorDecision: 'keep_later_sweep_proof' | 'prefer_replacement' | 'not_applicable';
  liveInstallAllowed: false;
  scannerVisibleChangeAllowed: false;
}

export interface UnifiedDeskCandidateBookItem {
  candidateKey: string;
  setupType: SetupType;
  family: UnifiedDeskCandidateFamily;
  direction: SetupCandidate['direction'];
  state: UnifiedDeskCandidateState;
  tradingModelState: UnifiedTradingModelCandidateState;
  rank: number;
  score: number;
  confidenceScore: number;
  confidenceSource: 'model_confidence_score' | 'decision_quality_score' | 'rank_score' | 'priority' | 'neutral_fallback';
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
  htfContextAlignment: 'context' | 'conflicting' | 'neutral' | 'data_limited';
  fiveMinuteProofStatus: 'confirmed' | 'partial' | 'missing';
  advisoryScoringExcluded: true;
  blockers: string[];
  nextProofRequired: string[];
  sourceCandidate: SetupCandidate;
  approvalBoundary: UnifiedDeskCandidateBook['approvalBoundary'];
  collisionMetadata: UnifiedDeskCandidateCollisionMetadata;
}

export interface UnifiedDeskCandidateBook {
  sourceOfTruth: 'unified_desk_candidate_book_audit';
  primaryDeskIdea: UnifiedDeskCandidateBookItem | null;
  candidates: UnifiedDeskCandidateBookItem[];
  stateCounts: Record<UnifiedDeskCandidateState, number>;
  tradingModelStateCounts: Record<UnifiedTradingModelCandidateState, number>;
  scoringPolicy: {
    sourceOfConfidence: 'blank_slate_no_model_evidence';
    excludesGeminiAdvisory: true;
    excludesAdvisoryNarrative: true;
    canExecuteRole: 'disabled_blank_slate';
  };
  approvalBoundary: {
    auditOnly: true;
    changesTradeApprovals: true;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRiskRules: false;
    changesBridgeBehavior: false;
    postsDiscord: false;
    writesSupabase: false;
  };
  notes: string[];
}

function blankStateCounts(): Record<UnifiedDeskCandidateState, number> {
  return {
    executable: 0,
    human_review: 0,
    watch: 0,
    no_chase: 0,
    blocked: 0,
    no_trade: 0,
  };
}

function blankTradingModelStateCounts(): Record<UnifiedTradingModelCandidateState, number> {
  return {
    execution_ready: 0,
    review_ticket: 0,
    ranked_candidate: 0,
    blocked_missing_5m_proof: 0,
    blocked_missing_plan_geometry: 0,
    blocked_no_fill: 0,
    blocked: 0,
    no_trade: 0,
  };
}

export function buildUnifiedDeskCandidateKey(_candidate: SetupCandidate, index: number): string {
  return `blank-slate-no-model|${index}`;
}

export function buildUnifiedDeskCandidateBook(input: UnifiedDeskCandidateBookInput): UnifiedDeskCandidateBook {
  const approvalBoundary: UnifiedDeskCandidateBook['approvalBoundary'] = {
    auditOnly: true,
    changesTradeApprovals: true,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    changesRiskRules: false,
    changesBridgeBehavior: false,
    postsDiscord: false,
    writesSupabase: false,
  };
  const stateCounts = blankStateCounts();
  const tradingModelStateCounts = blankTradingModelStateCounts();
  const candidates = input.candidates.map((candidate, index) => {
    stateCounts.blocked += 1;
    tradingModelStateCounts.blocked += 1;
    return {
      candidateKey: buildUnifiedDeskCandidateKey(candidate, index),
      setupType: SetupType.NoSetup,
      family: 'other',
      direction: candidate.direction,
      state: 'blocked',
      tradingModelState: 'blocked',
      rank: index + 1,
      score: 0,
      confidenceScore: 0,
      confidenceSource: 'neutral_fallback',
      freshnessScore: 0,
      htfScore: 0,
      fiveMinuteProofScore: 0,
      riskScore: 0,
      targetRoomScore: 0,
      canExecute: false,
      humanReviewOnly: true,
      entry: null,
      stop: null,
      target1: null,
      target2: null,
      riskPoints: null,
      htfContextAlignment: 'neutral',
      fiveMinuteProofStatus: 'missing',
      advisoryScoringExcluded: true,
      blockers: ['Blank-slate mode: no trading models are installed.'],
      nextProofRequired: ['Install a newly approved model definition before ranking or promotion can resume.'],
      sourceCandidate: candidate,
      approvalBoundary,
      collisionMetadata: {
        metadataSource: 'blank_slate_no_collision_ranking',
        groupKey: 'blank-slate',
        groupSize: 0,
        proofOrder: null,
        proofAgeMinutes: null,
        competingCandidateKeys: [],
        replacementCandidateKey: null,
        selectorCandidate: 'none',
        selectorEligible: false,
        selectorDecision: 'not_applicable',
        liveInstallAllowed: false,
        scannerVisibleChangeAllowed: false,
      },
    } satisfies UnifiedDeskCandidateBookItem;
  });

  return {
    sourceOfTruth: 'unified_desk_candidate_book_audit',
    primaryDeskIdea: null,
    candidates,
    stateCounts,
    tradingModelStateCounts,
    scoringPolicy: {
      sourceOfConfidence: 'blank_slate_no_model_evidence',
      excludesGeminiAdvisory: true,
      excludesAdvisoryNarrative: true,
      canExecuteRole: 'disabled_blank_slate',
    },
    approvalBoundary,
    notes: [
      'Blank-slate mode is active: no trading model candidates are ranked or promoted.',
      'Context notes and collision ranking are disabled until new approved model definitions are installed.',
      'Discord, Supabase, bridge behavior, entry, stop, target, and risk math are not touched by this audit adapter.',
    ],
  };
}
