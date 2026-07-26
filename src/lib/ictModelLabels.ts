import { SetupType, type SetupCandidate } from '../types';

export type IctModelLabel =
  | 'No model installed';

export function normalizeIctModelLabel(setupType?: SetupType | string | null): IctModelLabel {
  void setupType;
  return 'No model installed';
}

export function normalizeCandidateIctModelLabel(candidate?: SetupCandidate | null): IctModelLabel {
  return normalizeIctModelLabel(candidate?.setupType);
}
