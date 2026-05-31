export type HumanReviewLabelCategory =
  | 'advisory'
  | 'watchlist'
  | 'formal_candidate'
  | 'reject_or_deprioritize'
  | 'unknown';

export type HumanReviewSuggestedNextAction =
  | 'continue_observing'
  | 'generate_or_review_chart_evidence'
  | 'add_context_or_collect_more_samples'
  | 'decide_formal_candidate_label'
  | 'include_in_formal_candidate_ledger'
  | 'record_not_approved_formal_candidate_sample'
  | 'reject_or_deprioritize'
  | 'manual_review_required';

export interface HumanReviewLabelMetadata {
  label: string;
  displayName: string;
  category: HumanReviewLabelCategory;
  formalLedgerEligible: boolean;
  countsTowardCandidateGates: boolean;
  meaning: string;
  doesNotMean: string[];
  suggestedNextAction: HumanReviewSuggestedNextAction;
  boundary: 'research_only_not_execution_authority';
}

const DOES_NOT_APPROVE = [
  'live model approval',
  'trade approval',
  'execution authorization',
  'model activation',
];

export const HUMAN_REVIEW_LABEL_METADATA: Record<string, HumanReviewLabelMetadata> = {
  keep_advisory: {
    label: 'keep_advisory',
    displayName: 'Keep Advisory',
    category: 'advisory',
    formalLedgerEligible: false,
    countsTowardCandidateGates: false,
    meaning: 'Keep this as advisory research only.',
    doesNotMean: DOES_NOT_APPROVE,
    suggestedNextAction: 'continue_observing',
    boundary: 'research_only_not_execution_authority',
  },
  needs_more_chart_evidence: {
    label: 'needs_more_chart_evidence',
    displayName: 'Need Chart Evidence',
    category: 'watchlist',
    formalLedgerEligible: false,
    countsTowardCandidateGates: false,
    meaning: 'Human needs clearer chart/report evidence before deciding.',
    doesNotMean: DOES_NOT_APPROVE,
    suggestedNextAction: 'generate_or_review_chart_evidence',
    boundary: 'research_only_not_execution_authority',
  },
  needs_more_context: {
    label: 'needs_more_context',
    displayName: 'Need More Context',
    category: 'watchlist',
    formalLedgerEligible: false,
    countsTowardCandidateGates: false,
    meaning: 'Human needs more context, notes, sample data, or outcome explanation.',
    doesNotMean: DOES_NOT_APPROVE,
    suggestedNextAction: 'add_context_or_collect_more_samples',
    boundary: 'research_only_not_execution_authority',
  },
  new_model_candidate_review: {
    label: 'new_model_candidate_review',
    displayName: 'Candidate Label Review',
    category: 'watchlist',
    formalLedgerEligible: false,
    countsTowardCandidateGates: false,
    meaning: 'This may be worth reviewing for possible formal candidate labeling later.',
    doesNotMean: DOES_NOT_APPROVE,
    suggestedNextAction: 'decide_formal_candidate_label',
    boundary: 'research_only_not_execution_authority',
  },
  approved_for_future_model_candidate_review: {
    label: 'approved_for_future_model_candidate_review',
    displayName: 'Approve for Candidate Review',
    category: 'formal_candidate',
    formalLedgerEligible: true,
    countsTowardCandidateGates: true,
    meaning: 'Human approves this reviewed sample as evidence for future formal model-candidate review/backtest.',
    doesNotMean: DOES_NOT_APPROVE,
    suggestedNextAction: 'include_in_formal_candidate_ledger',
    boundary: 'research_only_not_execution_authority',
  },
  not_approved_for_future_model_candidate_review: {
    label: 'not_approved_for_future_model_candidate_review',
    displayName: 'Not Approved for Candidate Review',
    category: 'formal_candidate',
    formalLedgerEligible: true,
    countsTowardCandidateGates: true,
    meaning: 'Human does not approve this sample as evidence for future formal model-candidate review/backtest.',
    doesNotMean: ['a live trade decision', 'execution authorization', 'model activation'],
    suggestedNextAction: 'record_not_approved_formal_candidate_sample',
    boundary: 'research_only_not_execution_authority',
  },
  reject_or_deprioritize: {
    label: 'reject_or_deprioritize',
    displayName: 'Reject/Deprioritize',
    category: 'reject_or_deprioritize',
    formalLedgerEligible: false,
    countsTowardCandidateGates: false,
    meaning: 'Human wants this sample/concept deprioritized or rejected for now.',
    doesNotMean: DOES_NOT_APPROVE,
    suggestedNextAction: 'reject_or_deprioritize',
    boundary: 'research_only_not_execution_authority',
  },
  reject: {
    label: 'reject',
    displayName: 'Reject/Deprioritize',
    category: 'reject_or_deprioritize',
    formalLedgerEligible: false,
    countsTowardCandidateGates: false,
    meaning: 'Legacy label: human wants this sample/concept deprioritized or rejected for now.',
    doesNotMean: DOES_NOT_APPROVE,
    suggestedNextAction: 'reject_or_deprioritize',
    boundary: 'research_only_not_execution_authority',
  },
  insufficient_context: {
    label: 'insufficient_context',
    displayName: 'Need More Context',
    category: 'watchlist',
    formalLedgerEligible: false,
    countsTowardCandidateGates: false,
    meaning: 'Legacy label: human needs more context before deciding.',
    doesNotMean: DOES_NOT_APPROVE,
    suggestedNextAction: 'add_context_or_collect_more_samples',
    boundary: 'research_only_not_execution_authority',
  },
  possible_model1_mapping_review: {
    label: 'possible_model1_mapping_review',
    displayName: 'Model 1 Mapping Review',
    category: 'watchlist',
    formalLedgerEligible: false,
    countsTowardCandidateGates: false,
    meaning: 'Legacy label: queue for human-only mapping review against current Model 1 gates.',
    doesNotMean: DOES_NOT_APPROVE,
    suggestedNextAction: 'add_context_or_collect_more_samples',
    boundary: 'research_only_not_execution_authority',
  },
  possible_turtle_soup_mapping_review: {
    label: 'possible_turtle_soup_mapping_review',
    displayName: 'Turtle Soup Mapping Review',
    category: 'watchlist',
    formalLedgerEligible: false,
    countsTowardCandidateGates: false,
    meaning: 'Legacy label: queue for human-only mapping review against current Turtle Soup gates.',
    doesNotMean: DOES_NOT_APPROVE,
    suggestedNextAction: 'add_context_or_collect_more_samples',
    boundary: 'research_only_not_execution_authority',
  },
  human_rule_review_queue: {
    label: 'human_rule_review_queue',
    displayName: 'Human Rule Review Queue',
    category: 'watchlist',
    formalLedgerEligible: false,
    countsTowardCandidateGates: false,
    meaning: 'Legacy label: queue for human-only rule discussion.',
    doesNotMean: DOES_NOT_APPROVE,
    suggestedNextAction: 'add_context_or_collect_more_samples',
    boundary: 'research_only_not_execution_authority',
  },
};

export const SUPPORTED_HUMAN_REVIEW_LABELS = Object.keys(HUMAN_REVIEW_LABEL_METADATA);

export const FORMAL_MODEL_CANDIDATE_LABELS = SUPPORTED_HUMAN_REVIEW_LABELS.filter(
  (label) => HUMAN_REVIEW_LABEL_METADATA[label].formalLedgerEligible,
);

export function getHumanReviewLabelMetadata(label: string | null | undefined): HumanReviewLabelMetadata {
  const normalized = label || 'unknown';
  return HUMAN_REVIEW_LABEL_METADATA[normalized] || {
    label: normalized,
    displayName: normalized === 'unknown' ? 'Unknown Label' : normalized,
    category: 'unknown',
    formalLedgerEligible: false,
    countsTowardCandidateGates: false,
    meaning: 'Label metadata is not recognized; manual review is required before this can affect any formal research workflow.',
    doesNotMean: DOES_NOT_APPROVE,
    suggestedNextAction: 'manual_review_required',
    boundary: 'research_only_not_execution_authority',
  };
}

export function isFormalModelCandidateReviewLabel(label: string | null | undefined): boolean {
  return getHumanReviewLabelMetadata(label).formalLedgerEligible;
}

export function countsTowardFormalCandidateGates(label: string | null | undefined): boolean {
  return getHumanReviewLabelMetadata(label).countsTowardCandidateGates;
}
