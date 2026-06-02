import type { RAGSaveContext } from '../types';
import {
  cloneDeskBoundary,
  DESK_AUTHORITY_MESSAGES,
  PROOF_LEARNING_APPROVAL_BOUNDARY,
} from './deskAgentBoundaries';

export type DiscordOutcomeClosure = 'win' | 'loss' | 'scratch' | 'no_trade' | 'missed_trade';
export type ProofReviewVerdict = 'CONFIRMED' | 'DISPUTED' | 'UNCLEAR' | 'SKIPPED' | string;

export interface ProofLearningInput {
  context: RAGSaveContext;
  proofSubmitted?: boolean;
  proofScreenshotUrl?: string | null;
  notes?: string | null;
}

export interface OutcomeClosureInput {
  setupId?: string | null;
  alertId?: string | null;
  planVersionId?: string | null;
  sessionType: 'morning' | 'lunch' | 'replay_morning' | 'replay_lunch';
  tradeDate: string;
  instrument: 'MES' | 'MNQ' | string;
  originalNormalizedPlan: Record<string, unknown> | null;
  selectedCandidateSnapshot: Record<string, unknown> | null;
  outcome: DiscordOutcomeClosure;
  tradeTaken: boolean;
  proofScreenshotRef?: string | null;
  proofReviewVerdict?: ProofReviewVerdict | null;
  pnlTicks?: number | null;
  pnlDollars?: number | null;
  notes?: string | null;
}

export interface OutcomeClosureRecord {
  setupId: string | null;
  alertId: string | null;
  planVersionId: string | null;
  sessionType: OutcomeClosureInput['sessionType'];
  tradeDate: string;
  instrument: string;
  originalPlanSnapshot: Record<string, unknown> | null;
  selectedCandidateSnapshot: Record<string, unknown> | null;
  outcome: DiscordOutcomeClosure;
  tradeTaken: boolean;
  proofSubmitted: boolean;
  proofScreenshotRef: string | null;
  proofReviewVerdict: ProofReviewVerdict | null;
  pnlTicks: number | null;
  pnlDollars: number | null;
  notes: string | null;
  proofPrompt: string | null;
  memorySummary: string;
  approvalBoundary: {
    proofSubmissionApprovesTrade: false;
    tradeConfirmationOverridesRiskRules: false;
    ragSaveApprovesTradeRetroactively: false;
  };
}

export const DISCORD_PROOF_PROMPT =
  'Proof optional: upload chart outcome showing Entry / Stop / T1 / T2 so RAG can verify the result.';

function cloneJson<T>(value: T): T {
  if (value === null || value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function isTradeTakenOutcome(outcome: DiscordOutcomeClosure): boolean {
  return outcome === 'win' || outcome === 'loss' || outcome === 'scratch';
}

function normalizedNotes(input: OutcomeClosureInput): string | null {
  const base = typeof input.notes === 'string' ? input.notes.trim() : '';
  const authority = [
    'Proof supports the recorded outcome when present.',
    'RAG updated for future context only.',
    DESK_AUTHORITY_MESSAGES.outcomeFutureContextOnly,
  ].join(' ');
  return [base, authority].filter(Boolean).join('\n') || null;
}

export function buildOutcomeClosureRecord(input: OutcomeClosureInput): OutcomeClosureRecord {
  const expectedTradeTaken = isTradeTakenOutcome(input.outcome);
  if (expectedTradeTaken && input.tradeTaken !== true) {
    throw new Error('Outcome closure invalid: win/loss/scratch require tradeTaken=true.');
  }
  if (!expectedTradeTaken && input.tradeTaken !== false) {
    throw new Error('Outcome closure invalid: no_trade/missed_trade require tradeTaken=false.');
  }

  const proofSubmitted = Boolean(input.proofScreenshotRef);
  return {
    setupId: input.setupId || null,
    alertId: input.alertId || null,
    planVersionId: input.planVersionId || null,
    sessionType: input.sessionType,
    tradeDate: input.tradeDate,
    instrument: input.instrument,
    originalPlanSnapshot: cloneJson(input.originalNormalizedPlan),
    selectedCandidateSnapshot: cloneJson(input.selectedCandidateSnapshot),
    outcome: input.outcome,
    tradeTaken: input.tradeTaken,
    proofSubmitted,
    proofScreenshotRef: input.proofScreenshotRef || null,
    proofReviewVerdict: input.proofReviewVerdict || (proofSubmitted ? null : 'SKIPPED'),
    pnlTicks: Number.isFinite(input.pnlTicks ?? NaN) ? Number(input.pnlTicks) : null,
    pnlDollars: Number.isFinite(input.pnlDollars ?? NaN) ? Number(input.pnlDollars) : null,
    notes: normalizedNotes(input),
    proofPrompt: expectedTradeTaken ? DISCORD_PROOF_PROMPT : null,
    memorySummary: 'Outcome saved for journal/RAG learning only. It does not approve trades, place orders, or alter future rule gates.',
    approvalBoundary: cloneDeskBoundary(PROOF_LEARNING_APPROVAL_BOUNDARY),
  };
}

export function buildProofLearningContext(input: ProofLearningInput): RAGSaveContext {
  return {
    ...input.context,
    proofSubmitted: input.proofSubmitted ?? input.context.proofSubmitted ?? Boolean(input.proofScreenshotUrl || input.context.proofScreenshotUrl),
    proofScreenshotUrl: input.proofScreenshotUrl ?? input.context.proofScreenshotUrl,
    notes: [input.context.notes, input.notes]
      .map((value) => typeof value === 'string' ? value.trim() : '')
      .filter(Boolean)
      .join('\n'),
  };
}

export function proofLearningAuthorityNote(): string {
  return DESK_AUTHORITY_MESSAGES.proofLearningOnly;
}
