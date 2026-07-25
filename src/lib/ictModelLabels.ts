import { SetupType, type SetupCandidate } from '../types';

export type IctModelLabel =
  | 'Raid Reclaim Reversal'
  | 'Sweep -> MSS -> FVG Retrace'
  | 'Opening Drive FVG Continuation'
  | 'After-Lunch Drive FVG Continuation'
  | 'Intraday MSS Micro Continuation'
  | 'ICT setup';

export function normalizeIctModelLabel(setupType?: SetupType | string | null): IctModelLabel {
  if (setupType === SetupType.RaidReclaimReversal) return 'Raid Reclaim Reversal';
  if (setupType === SetupType.SweepMssFvgRetrace) return 'Sweep -> MSS -> FVG Retrace';
  if (setupType === SetupType.OpeningDriveFvgContinuation) return 'Opening Drive FVG Continuation';
  if (setupType === SetupType.AfterLunchDriveFvgContinuation) return 'After-Lunch Drive FVG Continuation';
  if (setupType === SetupType.IntradayMssMicroContinuation) return 'Intraday MSS Micro Continuation';
  return 'ICT setup';
}

export function normalizeCandidateIctModelLabel(candidate?: SetupCandidate | null): IctModelLabel {
  return normalizeIctModelLabel(candidate?.setupType);
}
