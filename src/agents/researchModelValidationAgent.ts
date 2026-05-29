import type { ResearchOutcomeMathReport } from './researchOutcomeMathAgent';
import type { ResearchSampleReviewPack, ResearchHumanInspectionLabel } from './researchSampleReviewAgent';

export type ResearchValidationLabel =
  | 'continue_research'
  | 'reject_research'
  | 'needs_more_human_review'
  | 'needs_more_outcome_data'
  | 'human_model_design_discussion_only';

export type ResearchValidationConfidence = 'low' | 'medium' | 'high';

export interface ResearchValidationCriteria {
  minimumEvaluatedCandidates: number;
  minimumReviewedSamples: number;
  maximumAdverseThresholdTouchRateForDiscussion: number;
  minimumThresholdTwoTouchRateForDiscussion: number;
  maximumAgentHumanDisagreementRate: number;
  maximumInsufficientDataRate: number;
}

export interface ResearchConceptReviewMetrics {
  reviewedSamples: number;
  pendingSamples: number;
  agreementRate: number | null;
  disagreementRate: number | null;
  humanLabelCounts: Record<string, number>;
}

export interface ResearchConceptValidation {
  concept: string;
  researchValidationLabel: ResearchValidationLabel;
  confidence: ResearchValidationConfidence;
  rationale: string;
  supportingEvidence: string[];
  concerns: string[];
  requiredBeforeNextPhase: string[];
  outcomeMetrics: {
    totalCandidates: number;
    evaluatedCandidates: number;
    insufficientDataCandidates: number;
    thresholdOneTouchRate: number | null;
    thresholdTwoTouchRate: number | null;
    adverseThresholdTouchRate: number | null;
    favorableFirstRate: number | null;
    adverseFirstRate: number | null;
    medianMfePoints: number | null;
    medianMaePoints: number | null;
  };
  humanReviewMetrics?: ResearchConceptReviewMetrics;
  advisoryOnly: true;
}

export interface ResearchModelValidationReport {
  reportType: 'research_model_validation';
  generatedAt: string;
  advisoryOnly: true;
  executionApproved: false;
  outcomeReportPath: string;
  reviewPackPath?: string;
  summary: {
    conceptsReviewed: number;
    continueResearchCount: number;
    rejectResearchCount: number;
    needsMoreHumanReviewCount: number;
    needsMoreOutcomeDataCount: number;
    humanModelDesignDiscussionOnlyCount: number;
  };
  conceptValidations: ResearchConceptValidation[];
  markdown: string;
  approvalBoundary: {
    validationApprovesTrade: false;
    validationChangesRules: false;
    validationCreatesEntry: false;
    validationCreatesTargets: false;
    validationPromotesModel: false;
  };
}

export interface ResearchModelValidationInput {
  outcomeReport: ResearchOutcomeMathReport;
  outcomeReportPath: string;
  reviewPack?: ResearchSampleReviewPack | null;
  reviewPackPath?: string;
  generatedAt?: string;
  criteria?: Partial<ResearchValidationCriteria>;
}

export const DEFAULT_RESEARCH_VALIDATION_CRITERIA: ResearchValidationCriteria = {
  minimumEvaluatedCandidates: 30,
  minimumReviewedSamples: 10,
  maximumAdverseThresholdTouchRateForDiscussion: 0.35,
  minimumThresholdTwoTouchRateForDiscussion: 0.60,
  maximumAgentHumanDisagreementRate: 0.30,
  maximumInsufficientDataRate: 0.20,
};

const FORBIDDEN_EXECUTABLE_KEYS = new Set([
  'entry',
  'stop',
  'stopLoss',
  'target',
  'targets',
  'T1',
  'T2',
  't1',
  't2',
  'riskReward',
  'canExecute',
  'orderInstructions',
  'alerts',
  'outcomeButtons',
  'ragPayload',
  'journalPayload',
]);

function normalizeCriteria(input?: Partial<ResearchValidationCriteria>): ResearchValidationCriteria {
  return {
    ...DEFAULT_RESEARCH_VALIDATION_CRITERIA,
    ...Object.fromEntries(
      Object.entries(input || {}).filter(([, value]) => typeof value === 'number' && Number.isFinite(value) && value >= 0)
    ),
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function rate(numerator: number, denominator: number): number | null {
  return denominator > 0 ? round(numerator / denominator) : null;
}

function countSummary(validations: ResearchConceptValidation[]): ResearchModelValidationReport['summary'] {
  return {
    conceptsReviewed: validations.length,
    continueResearchCount: validations.filter((item) => item.researchValidationLabel === 'continue_research').length,
    rejectResearchCount: validations.filter((item) => item.researchValidationLabel === 'reject_research').length,
    needsMoreHumanReviewCount: validations.filter((item) => item.researchValidationLabel === 'needs_more_human_review').length,
    needsMoreOutcomeDataCount: validations.filter((item) => item.researchValidationLabel === 'needs_more_outcome_data').length,
    humanModelDesignDiscussionOnlyCount: validations.filter((item) => item.researchValidationLabel === 'human_model_design_discussion_only').length,
  };
}

function reviewMetricsByConcept(pack: ResearchSampleReviewPack | null | undefined): Map<string, ResearchConceptReviewMetrics> {
  const map = new Map<string, ResearchConceptReviewMetrics>();
  if (!pack) return map;
  const concepts = [...new Set(pack.samples.map((sample) => sample.concept))];
  for (const concept of concepts) {
    const samples = pack.samples.filter((sample) => sample.concept === concept);
    const reviewed = samples.filter((sample) => sample.humanInspectionLabel !== null || sample.finalReviewLabel !== null);
    const humanLabelCounts: Record<string, number> = {};
    for (const sample of reviewed) {
      const label = sample.finalReviewLabel || sample.humanInspectionLabel || 'pending';
      humanLabelCounts[label] = (humanLabelCounts[label] || 0) + 1;
    }
    const agreementCount = reviewed.filter((sample) => sample.agentHumanAgreement === true).length;
    const disagreementCount = reviewed.filter((sample) => sample.agentHumanAgreement === false).length;
    map.set(concept, {
      reviewedSamples: reviewed.length,
      pendingSamples: samples.length - reviewed.length,
      agreementRate: rate(agreementCount, reviewed.length),
      disagreementRate: rate(disagreementCount, reviewed.length),
      humanLabelCounts,
    });
  }
  return map;
}

function dataQualityNotesForConcept(outcomeReport: ResearchOutcomeMathReport, concept: string): string[] {
  return [...new Set(
    outcomeReport.candidateOutcomes
      .filter((outcome) => outcome.concept === concept)
      .flatMap((outcome) => outcome.dataQualityNotes)
  )];
}

function labelCount(metrics: ResearchConceptReviewMetrics | undefined, label: ResearchHumanInspectionLabel): number {
  return metrics?.humanLabelCounts[label] || 0;
}

function validationForConcept(
  outcomeReport: ResearchOutcomeMathReport,
  conceptSummary: ResearchOutcomeMathReport['conceptSummaries'][number],
  humanMetrics: ResearchConceptReviewMetrics | undefined,
  criteria: ResearchValidationCriteria,
): ResearchConceptValidation {
  const insufficient = Math.max(0, conceptSummary.totalCandidates - conceptSummary.evaluatedCandidates);
  const insufficientRate = rate(insufficient, conceptSummary.totalCandidates) ?? 0;
  const thresholdTwo = conceptSummary.thresholdTwoTouchRate;
  const adverse = conceptSummary.adverseThresholdTouchRate;
  const favorableFirst = conceptSummary.favorableFirstRate;
  const adverseFirst = conceptSummary.adverseFirstRate;
  const dataQualityNotes = dataQualityNotesForConcept(outcomeReport, conceptSummary.concept);
  const outcomeMetrics = {
    totalCandidates: conceptSummary.totalCandidates,
    evaluatedCandidates: conceptSummary.evaluatedCandidates,
    insufficientDataCandidates: insufficient,
    thresholdOneTouchRate: conceptSummary.thresholdOneTouchRate,
    thresholdTwoTouchRate: thresholdTwo,
    adverseThresholdTouchRate: adverse,
    favorableFirstRate: favorableFirst,
    adverseFirstRate: adverseFirst,
    medianMfePoints: conceptSummary.medianMfePoints,
    medianMaePoints: conceptSummary.medianMaePoints,
  };

  const supportingEvidence = [
    `Evaluated candidates: ${conceptSummary.evaluatedCandidates}/${conceptSummary.totalCandidates}.`,
    `Threshold-two touch rate: ${thresholdTwo ?? 'n/a'}.`,
    `Adverse threshold touch rate: ${adverse ?? 'n/a'}.`,
    `Median MFE/MAE: ${conceptSummary.medianMfePoints ?? 'n/a'} / ${conceptSummary.medianMaePoints ?? 'n/a'}.`,
  ];
  const concerns: string[] = [
    'High threshold-touch rates alone do not validate a research concept.',
    'This assessment is advisory-only and cannot approve execution.',
  ];
  const requiredBeforeNextPhase = [
    'Complete human review of representative samples.',
    'Confirm agent-vs-human agreement remains acceptable.',
    'Confirm adverse behavior remains manageable across additional data.',
    'Keep any future model-design discussion human-only.',
  ];

  let label: ResearchValidationLabel = 'continue_research';
  let confidence: ResearchValidationConfidence = 'medium';
  let rationale = 'Outcome math is worth continued research, but the concept is not ready for human-only model-design discussion.';

  const missingOutcomeMetrics = thresholdTwo === null || adverse === null || favorableFirst === null || adverseFirst === null;
  const lowSample = conceptSummary.evaluatedCandidates < criteria.minimumEvaluatedCandidates;
  const insufficientData = insufficientRate > criteria.maximumInsufficientDataRate;
  if (lowSample || insufficientData || missingOutcomeMetrics) {
    label = 'needs_more_outcome_data';
    confidence = lowSample ? 'high' : 'medium';
    rationale = lowSample
      ? `Only ${conceptSummary.evaluatedCandidates} evaluated candidate(s); minimum for validation review is ${criteria.minimumEvaluatedCandidates}.`
      : 'Outcome metrics are incomplete or insufficient-data rate is too high.';
    concerns.push('Outcome data is not deep enough for validation beyond research tracking.');
  } else {
    const humanReviewed = humanMetrics?.reviewedSamples || 0;
    const disagreementRate = humanMetrics?.disagreementRate ?? null;
    const pending = humanMetrics?.pendingSamples || 0;
    const rejected = labelCount(humanMetrics, 'reject');
    const insufficientContext = labelCount(humanMetrics, 'insufficient_context');
    const humanRuleQueue = labelCount(humanMetrics, 'human_rule_review_queue');
    const rejectedRate = rate(rejected, humanReviewed) ?? 0;
    const insufficientContextRate = rate(insufficientContext, humanReviewed) ?? 0;
    const outcomeWeak =
      (thresholdTwo !== null && thresholdTwo < 0.25) ||
      (adverse !== null && adverse >= 0.75) ||
      (favorableFirst !== null && favorableFirst < 0.35);
    const outcomePromising =
      thresholdTwo !== null &&
      adverse !== null &&
      thresholdTwo >= criteria.minimumThresholdTwoTouchRateForDiscussion &&
      adverse <= criteria.maximumAdverseThresholdTouchRateForDiscussion;

    if (outcomeWeak || rejectedRate >= 0.5 || insufficientContextRate >= 0.5) {
      label = 'reject_research';
      confidence = outcomeWeak ? 'medium' : 'high';
      rationale = outcomeWeak
        ? 'Outcome math is weak or adverse behavior dominates, so this concept should be rejected from near-term study.'
        : 'Human review rejected or found insufficient context in most reviewed samples.';
      concerns.push('Research value is weak under the current evidence set.');
    } else if (!humanMetrics || humanReviewed < criteria.minimumReviewedSamples || pending > humanReviewed) {
      label = outcomePromising ? 'continue_research' : 'needs_more_human_review';
      confidence = humanReviewed === 0 ? 'low' : 'medium';
      rationale = outcomePromising
        ? 'Outcome math is promising enough to continue research, but human review is not deep enough for model-design discussion.'
        : 'Human review coverage is not sufficient to interpret this concept beyond advisory research.';
      concerns.push(`Human review coverage is ${humanReviewed}/${criteria.minimumReviewedSamples} minimum reviewed samples.`);
    } else if (disagreementRate !== null && disagreementRate > criteria.maximumAgentHumanDisagreementRate) {
      label = 'needs_more_human_review';
      confidence = 'medium';
      rationale = 'Agent-vs-human disagreement is too high for a stable research interpretation.';
      concerns.push(`Disagreement rate ${disagreementRate} exceeds ${criteria.maximumAgentHumanDisagreementRate}.`);
    } else if (outcomePromising && humanRuleQueue > 0) {
      label = 'human_model_design_discussion_only';
      confidence = 'medium';
      rationale = 'Outcome math is promising and enough human-reviewed samples exist for human-only model-design discussion.';
      supportingEvidence.push(`${humanRuleQueue} human-reviewed sample(s) were queued for future rule discussion.`);
      concerns.push('Human model-design discussion is not execution approval.');
    } else {
      label = 'continue_research';
      confidence = outcomePromising ? 'medium' : 'low';
      rationale = outcomePromising
        ? 'Outcome math is promising, but human review did not yet justify human-only model-design discussion.'
        : 'Outcome math is mixed; continue collecting and reviewing before any future phase.';
    }
  }

  if (adverse !== null && adverse > criteria.maximumAdverseThresholdTouchRateForDiscussion) {
    concerns.push(`Adverse threshold touch rate ${adverse} exceeds the discussion ceiling ${criteria.maximumAdverseThresholdTouchRateForDiscussion}.`);
  }
  if (dataQualityNotes.length) concerns.push(`Data quality notes present: ${dataQualityNotes.slice(0, 3).join(' | ')}`);

  return {
    concept: conceptSummary.concept,
    researchValidationLabel: label,
    confidence,
    rationale,
    supportingEvidence,
    concerns,
    requiredBeforeNextPhase,
    outcomeMetrics,
    ...(humanMetrics ? { humanReviewMetrics: humanMetrics } : {}),
    advisoryOnly: true,
  };
}

function renderConcept(validation: ResearchConceptValidation): string {
  return [
    `### ${validation.concept}`,
    `- Label: ${validation.researchValidationLabel}`,
    `- Confidence: ${validation.confidence}`,
    `- Rationale: ${validation.rationale}`,
    `- Outcome: evaluated=${validation.outcomeMetrics.evaluatedCandidates}/${validation.outcomeMetrics.totalCandidates}; thresholdTwo=${validation.outcomeMetrics.thresholdTwoTouchRate ?? 'n/a'}; adverse=${validation.outcomeMetrics.adverseThresholdTouchRate ?? 'n/a'}`,
    validation.humanReviewMetrics
      ? `- Human review: reviewed=${validation.humanReviewMetrics.reviewedSamples}; pending=${validation.humanReviewMetrics.pendingSamples}; agreement=${validation.humanReviewMetrics.agreementRate ?? 'n/a'}; disagreement=${validation.humanReviewMetrics.disagreementRate ?? 'n/a'}`
      : '- Human review: not provided',
    '- Concerns:',
    ...validation.concerns.map((concern) => `  - ${concern}`),
    '- Required before next phase:',
    ...validation.requiredBeforeNextPhase.map((item) => `  - ${item}`),
  ].join('\n');
}

export function renderResearchModelValidationMarkdown(report: Omit<ResearchModelValidationReport, 'markdown'>): string {
  return [
    '# Research Model Validation',
    '',
    '## 1. Executive Summary',
    `- Concepts reviewed: ${report.summary.conceptsReviewed}`,
    `- Continue research: ${report.summary.continueResearchCount}`,
    `- Reject research: ${report.summary.rejectResearchCount}`,
    `- Needs more human review: ${report.summary.needsMoreHumanReviewCount}`,
    `- Needs more outcome data: ${report.summary.needsMoreOutcomeDataCount}`,
    `- Human model-design discussion only: ${report.summary.humanModelDesignDiscussionOnlyCount}`,
    '',
    '## 2. Research-Only Boundary',
    '- This is research-only.',
    '- Validation does not approve trades.',
    '- Validation does not create executable models.',
    '- Human model-design discussion is not execution approval.',
    '- No trading logic changed and no executable changes are made.',
    '',
    '## 3. Input Reports',
    `- Outcome report: ${report.outcomeReportPath}`,
    `- Review pack: ${report.reviewPackPath || 'not provided'}`,
    '',
    '## 4. Validation Criteria',
    `- minimumEvaluatedCandidates: ${DEFAULT_RESEARCH_VALIDATION_CRITERIA.minimumEvaluatedCandidates}`,
    `- minimumReviewedSamples: ${DEFAULT_RESEARCH_VALIDATION_CRITERIA.minimumReviewedSamples}`,
    `- maximumAdverseThresholdTouchRateForDiscussion: ${DEFAULT_RESEARCH_VALIDATION_CRITERIA.maximumAdverseThresholdTouchRateForDiscussion}`,
    `- minimumThresholdTwoTouchRateForDiscussion: ${DEFAULT_RESEARCH_VALIDATION_CRITERIA.minimumThresholdTwoTouchRateForDiscussion}`,
    `- maximumAgentHumanDisagreementRate: ${DEFAULT_RESEARCH_VALIDATION_CRITERIA.maximumAgentHumanDisagreementRate}`,
    `- maximumInsufficientDataRate: ${DEFAULT_RESEARCH_VALIDATION_CRITERIA.maximumInsufficientDataRate}`,
    '',
    '## 5. Overall Validation Summary',
    ...report.conceptValidations.map((validation) => `- ${validation.concept}: ${validation.researchValidationLabel} (${validation.confidence})`),
    '',
    '## 6. Concept Validation Results',
    ...report.conceptValidations.map(renderConcept),
    '',
    '## 7. Human Review Alignment',
    ...(report.conceptValidations.some((validation) => validation.humanReviewMetrics)
      ? report.conceptValidations.map((validation) => `- ${validation.concept}: reviewed=${validation.humanReviewMetrics?.reviewedSamples ?? 0}; agreement=${validation.humanReviewMetrics?.agreementRate ?? 'n/a'}; disagreement=${validation.humanReviewMetrics?.disagreementRate ?? 'n/a'}`)
      : ['- No reviewed pack was provided.']),
    '',
    '## 8. Outcome Math Findings',
    ...report.conceptValidations.map((validation) => `- ${validation.concept}: thresholdTwo=${validation.outcomeMetrics.thresholdTwoTouchRate ?? 'n/a'}; adverse=${validation.outcomeMetrics.adverseThresholdTouchRate ?? 'n/a'}; medianMFE=${validation.outcomeMetrics.medianMfePoints ?? 'n/a'}; medianMAE=${validation.outcomeMetrics.medianMaePoints ?? 'n/a'}`),
    '',
    '## 9. Required Before Next Phase',
    '- Human review must remain separate from execution approval.',
    '- Any future model-design discussion must be human-only and separately approved.',
    '- Continue collecting outcome data and review samples before any rule discussion.',
    '',
    '## 10. Do-Not-Change-Yet Items',
    '- Do not change Model 1 or Turtle Soup gates.',
    '- Do not promote research concepts.',
    '- Do not add entries, stops, targets, alerts, outcome buttons, or RAG writes.',
    '',
    '## 11. Approval Boundary',
    ...Object.entries(report.approvalBoundary).map(([key, value]) => `- ${key}: ${String(value)}`),
  ].join('\n');
}

function forbiddenPaths(value: unknown, path = 'report'): string[] {
  if (!value || typeof value !== 'object') return [];
  const paths: string[] = [];
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const next = `${path}.${key}`;
    if (FORBIDDEN_EXECUTABLE_KEYS.has(key)) paths.push(next);
    if (key === 'executionApproved' && child !== false) paths.push(next);
    paths.push(...forbiddenPaths(child, next));
  }
  return paths;
}

export function assertNoExecutableValidationFields(value: unknown): void {
  const paths = forbiddenPaths(value);
  if (paths.length) throw new Error(`Research model validation contains prohibited executable field(s): ${paths.join(', ')}`);
}

export function runResearchModelValidation(input: ResearchModelValidationInput): ResearchModelValidationReport {
  const criteria = normalizeCriteria(input.criteria);
  const humanMetrics = reviewMetricsByConcept(input.reviewPack);
  const conceptValidations = input.outcomeReport.conceptSummaries.map((conceptSummary) =>
    validationForConcept(input.outcomeReport, conceptSummary, humanMetrics.get(conceptSummary.concept), criteria)
  );
  const reportWithoutMarkdown: Omit<ResearchModelValidationReport, 'markdown'> = {
    reportType: 'research_model_validation',
    generatedAt: input.generatedAt || new Date().toISOString(),
    advisoryOnly: true,
    executionApproved: false,
    outcomeReportPath: input.outcomeReportPath,
    ...(input.reviewPackPath ? { reviewPackPath: input.reviewPackPath } : {}),
    summary: countSummary(conceptValidations),
    conceptValidations,
    approvalBoundary: {
      validationApprovesTrade: false,
      validationChangesRules: false,
      validationCreatesEntry: false,
      validationCreatesTargets: false,
      validationPromotesModel: false,
    },
  };
  assertNoExecutableValidationFields(reportWithoutMarkdown);
  return {
    ...reportWithoutMarkdown,
    markdown: renderResearchModelValidationMarkdown(reportWithoutMarkdown),
  };
}
