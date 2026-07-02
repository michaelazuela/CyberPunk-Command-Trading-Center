import { SetupType, type SetupCandidate } from '../../src/types';

export type ProfessionalModelLabel =
  | 'Liquidity Sweep -> Structure Shift -> Imbalance Pullback'
  | 'Failed Breakout Reversal'
  | 'Drive FVG Continuation'
  | 'Intraday Structure-Shift Micro Continuation'
  | 'Failed Plan Reversal'
  | 'Trade setup';

export const PROFESSIONAL_MODEL_ONE_LABEL: ProfessionalModelLabel =
  'Liquidity Sweep -> Structure Shift -> Imbalance Pullback';
export const PROFESSIONAL_MODEL_TWO_LABEL: ProfessionalModelLabel = 'Failed Breakout Reversal';
export const PROFESSIONAL_FALLBACK_LABEL: ProfessionalModelLabel = 'Trade setup';

export function professionalModelLabel(setupType?: SetupType | string | null): ProfessionalModelLabel {
  if (setupType === SetupType.SweepMssFvgRetrace) return PROFESSIONAL_MODEL_ONE_LABEL;
  if (setupType === SetupType.TurtleSoup) return PROFESSIONAL_MODEL_TWO_LABEL;
  if (setupType === SetupType.OpeningDriveFvgContinuation || setupType === SetupType.AfterLunchDriveFvgContinuation) return 'Drive FVG Continuation';
  if (setupType === SetupType.IntradayMssMicroContinuation) return 'Intraday Structure-Shift Micro Continuation';
  if (setupType === SetupType.FailedPlanReversal) return 'Failed Plan Reversal';
  return PROFESSIONAL_FALLBACK_LABEL;
}

export function professionalCandidateModelLabel(candidate?: SetupCandidate | null): ProfessionalModelLabel {
  return professionalModelLabel(candidate?.setupType);
}

export function professionalizeReportText(value?: string | null): string {
  return String(value || '')
    .replace(/Sweep\s*->\s*MSS\s*->\s*FVG\s*Retrace/gi, PROFESSIONAL_MODEL_ONE_LABEL)
    .replace(/ICT\s+setup/gi, PROFESSIONAL_FALLBACK_LABEL)
    .replace(/\bICT\b/gi, 'institutional')
    .replace(/Turtle\s+Soup\s+Reversal/gi, PROFESSIONAL_MODEL_TWO_LABEL)
    .replace(/Turtle\s+Soup/gi, PROFESSIONAL_MODEL_TWO_LABEL)
    .replace(/Breaker\s*\+\s*FVG/gi, 'Failed-breakout zone + imbalance')
    .replace(/Breaker\/FVG/gi, 'Failed-breakout/imbalance')
    .replace(/Entry inside breaker\/FVG overlap/gi, 'Entry inside failed-breakout/imbalance overlap')
    .replace(/FVG retrace supported by breaker overlap/gi, 'Imbalance pullback supported by failed-breakout overlap')
    .replace(/Retrace into FVG/gi, 'Pullback into imbalance')
    .replace(/FVG retrace/gi, 'imbalance pullback')
    .replace(/FVG Pullback/gi, 'Imbalance Pullback')
    .replace(/Fair value gap/gi, 'Price imbalance')
    .replace(/fair value gap/gi, 'price imbalance')
    .replace(/\bFVG\b/g, 'imbalance')
    .replace(/imbalance Decision Zone/g, 'FVG Decision Zone')
    .replace(/HTF imbalance Cascade/g, 'HTF FVG Cascade')
    .replace(/HTF imbalance Reaction Memory/g, 'HTF FVG Reaction Memory')
    .replace(/HTF imbalance proof/g, 'HTF FVG proof')
    .replace(/Parent imbalance:/g, 'Parent FVG:')
    .replace(/parent imbalance/g, 'parent FVG')
    .replace(/native 5M imbalance/g, 'native 5M FVG')
    .replace(/Price imbalance \/ imbalance decision zone/g, 'FVG / imbalance decision zone')
    .replace(/imbalance \/ imbalance decision zone/g, 'FVG / imbalance decision zone')
    .replace(/imbalance is a reaction\/management zone only/g, 'FVG is a reaction/management zone only')
    .replace(/this imbalance into/g, 'this FVG into')
    .replace(/beyond the imbalance/g, 'beyond the FVG')
    .replace(/\bMSS\b/g, 'structure shift');
}
