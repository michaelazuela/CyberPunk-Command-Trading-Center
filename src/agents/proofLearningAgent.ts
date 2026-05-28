import type { RAGSaveContext } from '../types';

export interface ProofLearningInput {
  context: RAGSaveContext;
  proofSubmitted?: boolean;
  proofScreenshotUrl?: string | null;
  notes?: string | null;
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
  return 'Proof and outcome learning updates journal/RAG records only. It does not approve trades, place orders, or override deterministic risk rules.';
}
