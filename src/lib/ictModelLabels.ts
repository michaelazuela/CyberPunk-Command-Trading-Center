import { SetupType, type SetupCandidate } from '../types';

export type IctModelLabel =
  | 'Sweep -> MSS -> FVG Retrace'
  | 'Turtle Soup Reversal'
  | 'HTF Draw Continuation After Raid/Reclaim'
  | 'HTF Displacement + 5M MSS Continuation'
  | 'ICT setup';

export function normalizeIctModelLabel(setupType?: SetupType | string | null): IctModelLabel {
  if (setupType === SetupType.SweepMssFvgRetrace) return 'Sweep -> MSS -> FVG Retrace';
  if (setupType === SetupType.TurtleSoup) return 'Turtle Soup Reversal';
  if (setupType === SetupType.HtfDrawContinuationAfterRaid) return 'HTF Draw Continuation After Raid/Reclaim';
  if (setupType === SetupType.HtfDisplacementMssContinuation) return 'HTF Displacement + 5M MSS Continuation';
  return 'ICT setup';
}

export function normalizeCandidateIctModelLabel(candidate?: SetupCandidate | null): IctModelLabel {
  return normalizeIctModelLabel(candidate?.setupType);
}
