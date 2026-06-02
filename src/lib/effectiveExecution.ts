import { TradeDecisionStatus } from '../types';

export interface EffectiveExecutionInput {
  canExecute?: boolean | null;
  decisionStatus?: TradeDecisionStatus | string | null;
  status?: TradeDecisionStatus | string | null;
}

export function getEffectiveCanExecute(input: EffectiveExecutionInput | null | undefined): boolean {
  if (!input) return false;
  const status = input.decisionStatus ?? input.status;
  return status === TradeDecisionStatus.ApprovedTrade && input.canExecute === true;
}

export function isEffectivelyExecutable(input: EffectiveExecutionInput | null | undefined): boolean {
  return getEffectiveCanExecute(input);
}
