export type PriceActionReviewDirection = 'LONG' | 'SHORT' | 'NO TRADE' | string;

export interface PriceActionReviewBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface PriceActionReviewSampleLike {
  sampleId?: string | null;
  date?: string | null;
  time?: string | null;
  concept?: string | null;
  conceptTitle?: string | null;
  direction?: PriceActionReviewDirection | null;
  window?: string | null;
  agentInspectionLabel?: string | null;
  agentConfidence?: string | null;
  agentReason?: string | null;
  advisoryOnly?: boolean;
}

export interface PriceActionHypotheticalOverlayLike {
  hypotheticalReferencePrice?: number | null;
  hypotheticalInvalidationReference?: number | null;
  hypotheticalThresholdOne?: number | null;
  hypotheticalThresholdTwo?: number | null;
  firstResolvedEvent?: string | null;
  hypotheticalOutcomeLabel?: string | null;
  advisoryOnly?: boolean;
  executionApproved?: boolean;
}

export interface PriceActionResearchDerivedOverlayLike {
  hypotheticalEntryLabel?: string | number | null;
  hypotheticalStopLossLabel?: string | number | null;
  hypotheticalTargetLabel?: string | number | null;
  hypotheticalTakeProfitLabel?: string | number | null;
  hypotheticalT1Label?: string | number | null;
  hypotheticalT2Label?: string | number | null;
}

export interface PriceActionReviewCardInput {
  sample: PriceActionReviewSampleLike;
  overlay?: PriceActionHypotheticalOverlayLike | null;
  researchDerivedOverlay?: PriceActionResearchDerivedOverlayLike | null;
  ictDerivedOverlay?: PriceActionResearchDerivedOverlayLike | null;
  bars5m: PriceActionReviewBar[];
  bars15m: PriceActionReviewBar[];
  symbol: string;
  contract: string;
  dateRange?: { from: string; to: string } | null;
  approvedDisplay?: string | null;
  hypotheticalExecuteStatus?: 'Yes' | 'No' | 'Unavailable' | string | null;
  hypotheticalTradeAlertStatus?: 'Yes' | 'No' | 'Unavailable' | string | null;
}

export interface PriceActionReviewCardModel {
  cardType: 'PriceActionReviewCard';
  researchOnly: true;
  advisoryOnly: true;
  executionApproved: false;
  headerText: 'Hypothetical Research Overlay — Not an approved live trade';
  footerText: 'Research-only. This does not approve execution, change rules, or create trades.';
  sampleId: string;
  symbol: string;
  contract: string;
  dateTimeLabel: string;
  conceptLabel: string;
  directionWindowLabel: string;
  agentRecommendationLabel: string;
  approvedDisplay: string;
  hypotheticalEntryLabel: string;
  hypotheticalStopLossLabel: string;
  hypotheticalTargetLabel: string;
  hypotheticalTakeProfitLabel: string;
  hypotheticalT1Label: string;
  hypotheticalT2Label: string;
  hypotheticalExecuteStatus: string;
  hypotheticalTradeAlertStatus: string;
  hypotheticalBuySellDisplay: string;
  outcomeLabel: string;
  firstResolvedEventLabel: string;
  bars5m: PriceActionReviewBar[];
  bars15m: PriceActionReviewBar[];
  warnings: string[];
  notes: string[];
}

const HEADER_TEXT = 'Hypothetical Research Overlay — Not an approved live trade' as const;
const FOOTER_TEXT = 'Research-only. This does not approve execution, change rules, or create trades.' as const;
const UNAVAILABLE = 'Unavailable';

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function formatPrice(value: unknown): string {
  return isFiniteNumber(value) ? value.toFixed(2) : UNAVAILABLE;
}

function displayValue(value: string | number | null | undefined): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (isFiniteNumber(value)) return value.toFixed(2);
  return UNAVAILABLE;
}

function normalizeDirection(value: PriceActionReviewDirection | null | undefined): 'LONG' | 'SHORT' | 'UNKNOWN' {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'LONG') return 'LONG';
  if (normalized === 'SHORT') return 'SHORT';
  return 'UNKNOWN';
}

function recommendationFor(label: string | null | undefined): string {
  const normalized = String(label || '').trim();
  const text: Record<string, string> = {
    keep_advisory: 'Recommended: Keep Advisory',
    reject: 'Recommended: Reject',
    historical_mapping_review: 'Recommended: Queue for no installed model path Review',
    historical_reversal_mapping_review: 'Recommended: Queue for no installed model path Review',
    human_rule_review_queue: 'Recommended: Human Rule Review Queue',
    new_model_candidate_review: 'Recommended: New Model Candidate Review',
    insufficient_context: 'Recommended: Insufficient Context',
  };
  return text[normalized] || (normalized ? `Recommended: ${normalized.replace(/_/g, ' ')}` : 'Recommended: Keep Advisory');
}

function validBars(bars: PriceActionReviewBar[]): PriceActionReviewBar[] {
  return [...(bars || [])]
    .filter((bar) =>
      typeof bar.time === 'string' &&
      isFiniteNumber(bar.open) &&
      isFiniteNumber(bar.high) &&
      isFiniteNumber(bar.low) &&
      isFiniteNumber(bar.close) &&
      bar.high >= Math.max(bar.open, bar.close) &&
      bar.low <= Math.min(bar.open, bar.close)
    )
    .sort((left, right) => left.time.localeCompare(right.time));
}

function lastContextBars(bars: PriceActionReviewBar[], maxBars: number): PriceActionReviewBar[] {
  return validBars(bars).slice(-Math.max(1, maxBars));
}

function hasCompleteResearchDerivedOverlay(overlay?: PriceActionResearchDerivedOverlayLike | null): overlay is Required<PriceActionResearchDerivedOverlayLike> {
  if (!overlay) return false;
  return [
    overlay.hypotheticalEntryLabel,
    overlay.hypotheticalStopLossLabel,
    overlay.hypotheticalTargetLabel,
    overlay.hypotheticalTakeProfitLabel,
    overlay.hypotheticalT1Label,
    overlay.hypotheticalT2Label,
  ].every((value) => displayValue(value) !== UNAVAILABLE);
}

export function buildPriceActionReviewCardModel(input: PriceActionReviewCardInput): PriceActionReviewCardModel {
  const warnings: string[] = [];
  const notes = [
    'Research-only visual artifact. Visible price labels are hypothetical overlay labels, not executable instructions.',
    'Renderer consumes normalized bars supplied by the research-review workflow.',
  ];
  const sample = input.sample || {};
  const overlay = input.overlay || {};
  const direction = normalizeDirection(sample.direction);

  if ((sample as { advisoryOnly?: boolean }).advisoryOnly === false || overlay.executionApproved === true) {
    warnings.push('Input did not preserve an explicit research-only boundary; rendered model forces advisory-only and executionApproved=false.');
  }

  let hypotheticalEntryLabel: string;
  let hypotheticalStopLossLabel: string;
  let hypotheticalTargetLabel: string;
  let hypotheticalTakeProfitLabel: string;
  let hypotheticalT1Label: string;
  let hypotheticalT2Label: string;

  const researchDerivedOverlay = input.researchDerivedOverlay || input.ictDerivedOverlay;
  if (hasCompleteResearchDerivedOverlay(researchDerivedOverlay)) {
    hypotheticalEntryLabel = displayValue(researchDerivedOverlay.hypotheticalEntryLabel);
    hypotheticalStopLossLabel = displayValue(researchDerivedOverlay.hypotheticalStopLossLabel);
    hypotheticalTargetLabel = displayValue(researchDerivedOverlay.hypotheticalTargetLabel);
    hypotheticalTakeProfitLabel = displayValue(researchDerivedOverlay.hypotheticalTakeProfitLabel);
    hypotheticalT1Label = displayValue(researchDerivedOverlay.hypotheticalT1Label);
    hypotheticalT2Label = displayValue(researchDerivedOverlay.hypotheticalT2Label);
  } else {
    warnings.push('Research-derived overlay fields were not fully available; used research-only hypothetical overlay fallback mapping.');
    hypotheticalEntryLabel = formatPrice(overlay.hypotheticalReferencePrice);
    hypotheticalStopLossLabel = formatPrice(overlay.hypotheticalInvalidationReference);
    hypotheticalTargetLabel = formatPrice(overlay.hypotheticalThresholdOne);
    hypotheticalTakeProfitLabel = formatPrice(overlay.hypotheticalThresholdTwo);
    hypotheticalT1Label = formatPrice(overlay.hypotheticalThresholdOne);
    hypotheticalT2Label = formatPrice(overlay.hypotheticalThresholdTwo);
  }

  const missingFallbacks = [
    ['Entry', hypotheticalEntryLabel],
    ['Stop Loss', hypotheticalStopLossLabel],
    ['Target', hypotheticalTargetLabel],
    ['Take Profit', hypotheticalTakeProfitLabel],
    ['T1', hypotheticalT1Label],
    ['T2', hypotheticalT2Label],
  ]
    .filter(([, value]) => value === UNAVAILABLE)
    .map(([label]) => label);
  if (missingFallbacks.length) warnings.push(`Unavailable hypothetical display field(s): ${missingFallbacks.join(', ')}.`);

  const bars5m = lastContextBars(input.bars5m, 6);
  const bars15m = lastContextBars(input.bars15m, 2);
  if (!bars5m.length) warnings.push('No valid provided 5-minute bars were available for the main chart.');
  if (!bars15m.length) warnings.push('No valid provided 15-minute bars were available for the context inset.');
  if (direction === 'UNKNOWN') warnings.push('Sample direction is missing or not LONG/SHORT; Buy/Sell display is unavailable.');

  const date = sample.date || input.dateRange?.from || UNAVAILABLE;
  const time = sample.time || 'time unavailable';

  return {
    cardType: 'PriceActionReviewCard',
    researchOnly: true,
    advisoryOnly: true,
    executionApproved: false,
    headerText: HEADER_TEXT,
    footerText: FOOTER_TEXT,
    sampleId: sample.sampleId || 'sample-unavailable',
    symbol: input.symbol,
    contract: input.contract,
    dateTimeLabel: `${date} ${time}`,
    conceptLabel: sample.conceptTitle || sample.concept || UNAVAILABLE,
    directionWindowLabel: `${direction === 'UNKNOWN' ? UNAVAILABLE : direction} / ${sample.window || 'Window unavailable'}`,
    agentRecommendationLabel: recommendationFor(sample.agentInspectionLabel),
    approvedDisplay: input.approvedDisplay || 'Pending Human Review',
    hypotheticalEntryLabel,
    hypotheticalStopLossLabel,
    hypotheticalTargetLabel,
    hypotheticalTakeProfitLabel,
    hypotheticalT1Label,
    hypotheticalT2Label,
    hypotheticalExecuteStatus: input.hypotheticalExecuteStatus || 'No',
    hypotheticalTradeAlertStatus: input.hypotheticalTradeAlertStatus || 'No',
    hypotheticalBuySellDisplay: direction === 'LONG' ? 'Buy' : direction === 'SHORT' ? 'Sell' : UNAVAILABLE,
    outcomeLabel: overlay.hypotheticalOutcomeLabel || UNAVAILABLE,
    firstResolvedEventLabel: overlay.firstResolvedEvent || UNAVAILABLE,
    bars5m,
    bars15m,
    warnings,
    notes,
  };
}
