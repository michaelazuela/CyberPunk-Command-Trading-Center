import { SetupType, type SetupCandidate } from '../types';

export type IctModelLabel =
  | 'Sweep -> MSS -> FVG Retrace'
  | 'Turtle Soup Reversal'
  | 'ICT setup';

export function normalizeIctModelLabel(setupType?: SetupType | string | null): IctModelLabel {
  if (setupType === SetupType.SweepMssFvgRetrace) return 'Sweep -> MSS -> FVG Retrace';
  if (setupType === SetupType.TurtleSoup) return 'Turtle Soup Reversal';
  return 'ICT setup';
}

export function normalizeCandidateIctModelLabel(candidate?: SetupCandidate | null): IctModelLabel {
  return normalizeIctModelLabel(candidate?.setupType);
}
