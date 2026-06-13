import { TradeDecisionStatus } from '../../src/types';

export type ReplayEffectiveExecutionStatus =
  | 'EXECUTABLE_APPROVED'
  | 'REVIEW_ONLY_CANEXECUTE_FALSE'
  | 'NOT_EXECUTABLE';

export interface ReplayExecutionSummaryInput {
  status?: string | null;
  canExecute?: boolean | null;
  normalizedCanExecuteRaw?: boolean | null;
}

export function buildReplayExecutionSummary(input: ReplayExecutionSummaryInput) {
  const rawStatus = input.status || 'Unknown';
  const canExecute = input.canExecute === true;
  const approvedButNotExecutable = rawStatus === TradeDecisionStatus.ApprovedTrade && !canExecute;
  const effectiveExecutionStatus: ReplayEffectiveExecutionStatus = canExecute
    ? 'EXECUTABLE_APPROVED'
    : approvedButNotExecutable
      ? 'REVIEW_ONLY_CANEXECUTE_FALSE'
      : 'NOT_EXECUTABLE';

  return {
    rawStatus,
    canExecute,
    normalizedCanExecuteRaw: input.normalizedCanExecuteRaw ?? null,
    effectiveExecutionStatus,
    displayStatus: canExecute
      ? `${rawStatus} + canExecute=true`
      : approvedButNotExecutable
        ? 'Review only - raw ApprovedTrade but canExecute=false'
        : rawStatus,
    explanation: canExecute
      ? 'Execution-ready only because raw status is approved and effective canExecute is true.'
      : approvedButNotExecutable
        ? 'Raw pipeline status reached ApprovedTrade, but effective execution remains disabled because canExecute=false.'
        : 'Not execution-ready.',
  };
}

export function shouldRetainReplaySample(args: {
  currentLength: number;
  maxSamples: number;
  verboseRows: boolean;
}): boolean {
  if (args.verboseRows) return true;
  const boundedMax = Math.max(0, Math.floor(args.maxSamples));
  return args.currentLength < boundedMax;
}
