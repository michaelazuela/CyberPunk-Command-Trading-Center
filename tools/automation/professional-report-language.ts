import { SetupType, type SetupCandidate } from '../../src/types';

export type ProfessionalModelLabel =
  | 'Liquidity Sweep -> Structure Shift -> Imbalance Pullback'
  | 'Failed Breakout Reversal'
  | 'Failed Plan Reversal'
  | 'Trade setup';

export const PROFESSIONAL_MODEL_ONE_LABEL: ProfessionalModelLabel =
  'Liquidity Sweep -> Structure Shift -> Imbalance Pullback';
export const PROFESSIONAL_MODEL_TWO_LABEL: ProfessionalModelLabel = 'Failed Breakout Reversal';
export const PROFESSIONAL_FALLBACK_LABEL: ProfessionalModelLabel = 'Trade setup';

export function professionalModelLabel(setupType?: SetupType | string | null): ProfessionalModelLabel {
  if (setupType === SetupType.SweepMssFvgRetrace) return PROFESSIONAL_MODEL_ONE_LABEL;
  if (setupType === SetupType.TurtleSoup) return PROFESSIONAL_MODEL_TWO_LABEL;
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
    .replace(/\bMSS\b/g, 'structure shift');
}
