import type {
  HistoricalResearchBackfillReport,
  HistoricalResearchConceptReport,
  ResearchCandidateEvent,
  ResearchBackfillConceptId,
  ResearchBackfillConceptSelector,
  ResearchBackfillDirection,
} from './historicalResearchBackfillAgent';
import type { EstimatedGrossContractPnl } from '../lib/futuresContractMetadata';

export type ResearchSampleInspectionLabel =
  | 'keep_advisory'
  | 'possible_model1_mapping_review'
  | 'possible_turtle_soup_mapping_review'
  | 'insufficient_context'
  | 'reject';

export type ResearchHumanInspectionLabel =
  | ResearchSampleInspectionLabel
  | 'human_rule_review_queue'
  | 'new_model_candidate_review'
  | 'approved_for_future_model_candidate_review'
  | 'not_approved_for_future_model_candidate_review';

export type ResearchSampleConfidence = 'low' | 'medium' | 'high';
export type ResearchQualityScoreLabel = 'Strong' | 'Moderate' | 'Weak' | 'Incomplete' | 'Unavailable';
export type AgentHumanInputAssessmentStatus =
  | 'agrees_with_human'
  | 'partially_agrees_with_human'
  | 'disagrees_with_human'
  | 'unclear_insufficient_evidence';
export type AgentHumanInputQuality =
  | 'reasonable'
  | 'too_aggressive'
  | 'too_conservative'
  | 'missed_risk'
  | 'missed_context'
  | 'needs_more_evidence'
  | 'invalid_or_inconsistent';
export type AgentHumanResearchUsefulness =
  | 'useful'
  | 'questionable'
  | 'invalid'
  | 'needs_chart'
  | 'needs_more_context';

export interface ResearchQualityScore {
  score: number | null;
  label: ResearchQualityScoreLabel;
  reasons: string[];
  source: 'existing-approved-score' | 'research-only-score';
  researchOnly: true;
}

export interface AgentHumanInputAssessment {
  status: AgentHumanInputAssessmentStatus;
  humanInputQuality: AgentHumanInputQuality;
  researchUsefulness: AgentHumanResearchUsefulness;
  reason: string;
  evidenceChecked: string[];
  chartReportReference: string | null;
  chartEvidenceAvailable: boolean | null;
  boundary: 'research_only_not_execution_authority';
  assessedAt: string;
}

export interface ResearchReviewEvidence {
  chartAvailable: boolean;
  chartWithheld: boolean;
  chartPngPath?: string;
  chartSvgPath?: string;
  chartReportPath?: string;
  sourceReviewCard?: string;
  evidenceStatus: 'chart_available' | 'chart_withheld' | 'chart_missing' | 'chart_unknown';
}

export interface ResearchSampleReviewSourceReport {
  path: string;
  report: HistoricalResearchBackfillReport;
}

export interface ResearchSampleReviewInput {
  instrument: string;
  concept: ResearchBackfillConceptSelector;
  sampleSize: number;
  sourceReports: ResearchSampleReviewSourceReport[];
  generatedAt?: string;
}

export interface ResearchReviewSample {
  sampleId: string;
  date: string;
  time: string | null;
  concept: ResearchBackfillConceptId;
  conceptTitle: string;
  direction: ResearchBackfillDirection;
  window: string | null;
  classification: 'model1_overlap' | 'turtle_soup_overlap' | 'advisory_only';
  advisoryOnly: true;
  summary: string;
  whyAdvisoryOnly: string;
  model1Overlap: boolean;
  turtleSoupOverlap: boolean;
  researchDetectorReason: string;
  warningFailureReason: string;
  dataQualityNotes: string[];
  sampleSourceReportPath: string;
  researchQualityScore?: ResearchQualityScore;
  agentInspectionLabel: ResearchSampleInspectionLabel;
  agentConfidence: ResearchSampleConfidence;
  agentReason: string;
  agentEvidence: string[];
  agentConcerns: string[];
  agentRecommendedNextStep: 'continue_tracking' | 'human_review_only' | 'reject_sample' | 'collect_more_context';
  agentApprovalBoundary: {
    agentApprovesTrade: false;
    agentChangesRules: false;
    agentCreatesEntry: false;
    agentCreatesTargets: false;
    agentPromotesModel: false;
  };
  humanInspectionLabel: ResearchHumanInspectionLabel | null;
  humanConfidence: ResearchSampleConfidence | null;
  humanReason: string | null;
  humanNotes: string | null;
  humanReviewedAt: string | null;
  humanReviewer: string | null;
  agentHumanAgreement: boolean | null;
  disagreementReason: string | null;
  reviewEvidence?: ResearchReviewEvidence | null;
  agentAssessment?: AgentHumanInputAssessment | null;
  estimatedGrossContractPnl?: EstimatedGrossContractPnl | null;
  finalReviewLabel: ResearchHumanInspectionLabel | null;
  finalReviewNotes: string | null;
}

export interface ResearchSampleConceptSummary {
  concept: ResearchBackfillConceptId;
  title: string;
  sourceReports: number;
  availableSamples: number;
  selectedSamples: number;
  classificationCounts: {
    advisoryOnly: number;
    model1Overlap: number;
    turtleSoupOverlap: number;
  };
  directionCounts: Record<string, number>;
  windowCounts: Record<string, number>;
  commonReasons: string[];
}

export interface ResearchSampleReviewPack {
  reportType: 'research_sample_review_pack';
  generatedAt: string;
  instrument: string;
  concept: ResearchBackfillConceptSelector;
  requestedSampleSize: number;
  selectedSampleCount: number;
  sourceReportPaths: string[];
  sampleSourceMode: 'full_candidate_events' | 'preview_sample_events';
  executiveSummary: string[];
  conceptSummaries: ResearchSampleConceptSummary[];
  sampleSelectionMethod: string[];
  samples: ResearchReviewSample[];
  possibleExistingModelMappingReview: string[];
  advisoryOnlyFindings: string[];
  humanReviewQuestions: string[];
  doNotChangeYetItems: string[];
  approvalBoundary: {
    sampleReviewApprovesTrade: false;
    sampleReviewChangesRules: false;
    sampleReviewCreatesEntry: false;
    sampleReviewCreatesTargets: false;
    sampleReviewPromotesModel: false;
    sampleReviewWritesRagMemory: false;
  };
  markdown: string;
}

const CONCEPT_ORDER: ResearchBackfillConceptId[] = [
  'time_window_liquidity_delivery',
  'false_run_liquidity_fade',
  'amd_range_model',
  'final_hour_liquidity_draw',
];

const CONCEPT_TITLES: Record<ResearchBackfillConceptId, string> = {
  time_window_liquidity_delivery: 'Time-Window Liquidity Delivery',
  false_run_liquidity_fade: 'False-Run Liquidity Fade Near Highs',
  amd_range_model: 'Accumulation-Manipulation-Distribution Range Model',
  final_hour_liquidity_draw: 'Final-Hour Liquidity Draw',
};

interface CandidateSample {
  sourcePath: string;
  report: HistoricalResearchBackfillReport;
  conceptReport: HistoricalResearchConceptReport;
  event: HistoricalResearchConceptReport['sampleEvents'][number] | ResearchCandidateEvent;
  sourceMode: 'full_candidate_events' | 'preview_sample_events';
}

function selectedConcepts(concept: ResearchBackfillConceptSelector): ResearchBackfillConceptId[] {
  return concept === 'all' ? CONCEPT_ORDER : [concept];
}

function keyFor(candidate: CandidateSample): string {
  const event = candidate.event;
  return [
    candidate.conceptReport.conceptId,
    event.date,
    event.time || '',
    event.direction,
    event.window || '',
    event.classification,
    event.summary,
  ].join('|');
}

function pushCount(map: Record<string, number>, key: string | null | undefined): void {
  const normalized = key && key.trim() ? key : 'unspecified';
  map[normalized] = (map[normalized] || 0) + 1;
}

function topValues(values: string[], limit = 5): string[] {
  const counts = new Map<string, number>();
  for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([value, count]) => `${value} (${count})`);
}

function reasonFor(candidate: CandidateSample): string {
  if ('detectorReason' in candidate.event) return candidate.event.detectorReason;
  return candidate.conceptReport.commonReasons[0] || 'Research sample remains advisory until a human review compares it against approved 6K gates.';
}

function dataQualityNotes(candidate: CandidateSample): string[] {
  if ('dataQualityNotes' in candidate.event) return [...candidate.event.dataQualityNotes];
  const notes: string[] = [];
  if (!candidate.event.time) notes.push('Sample time is missing in the source report.');
  if (!candidate.event.window) notes.push('Sample window is missing in the source report.');
  for (const gap of candidate.conceptReport.dataGaps) notes.push(gap);
  if (!notes.length) notes.push('Source report provided date, time/window, direction, classification, and summary.');
  return notes;
}

function inspectCandidate(candidate: CandidateSample): Pick<
  ResearchReviewSample,
  'agentInspectionLabel' | 'agentConfidence' | 'agentReason' | 'agentEvidence' | 'agentConcerns' | 'agentRecommendedNextStep'
> {
  const event = candidate.event;
  const reason = reasonFor(candidate);
  const evidence = [
    `${event.date} ${event.time || 'time unavailable'} ${event.direction}`,
    event.window ? `Window: ${event.window}` : 'Window unavailable',
    event.summary,
    `Source classification: ${event.classification}`,
  ];
  const concerns = [
    'Agent inspection is research-only and cannot approve execution.',
    reason,
  ];

  if (!event.date || !event.summary || !event.time) {
    return {
      agentInspectionLabel: 'insufficient_context',
      agentConfidence: 'low',
      agentReason: 'The source sample is missing enough timestamp or summary context for a strong mapping review.',
      agentEvidence: evidence,
      agentConcerns: concerns,
      agentRecommendedNextStep: 'collect_more_context',
    };
  }

  if (event.classification === 'model1_overlap') {
    return {
      agentInspectionLabel: 'possible_model1_mapping_review',
      agentConfidence: 'medium',
      agentReason: 'The source report marked possible Model 1 overlap, so this should be reviewed by a human against the existing approved Model 1 gates.',
      agentEvidence: evidence,
      agentConcerns: [...concerns, 'Possible mapping is not an approval and does not change Model 1 gates.'],
      agentRecommendedNextStep: 'human_review_only',
    };
  }

  if (event.classification === 'turtle_soup_overlap') {
    return {
      agentInspectionLabel: 'possible_turtle_soup_mapping_review',
      agentConfidence: 'medium',
      agentReason: 'The source report marked possible Turtle Soup overlap, so this needs human review against true sweep, reclaim, risk, session, and target-room gates.',
      agentEvidence: evidence,
      agentConcerns: [...concerns, 'Possible mapping is not an approval and does not change Turtle Soup gates.'],
      agentRecommendedNextStep: 'human_review_only',
    };
  }

  if (/no meaningful|not worth|stop tracking/i.test(reason)) {
    return {
      agentInspectionLabel: 'reject',
      agentConfidence: 'medium',
      agentReason: 'The detector reason suggests the sample does not show enough meaningful research structure to keep in the review queue.',
      agentEvidence: evidence,
      agentConcerns: concerns,
      agentRecommendedNextStep: 'reject_sample',
    };
  }

  return {
    agentInspectionLabel: 'keep_advisory',
    agentConfidence: reason ? 'high' : 'medium',
    agentReason: 'The sample has research structure, but no approved Model 1 or Turtle Soup mapping was confirmed by the source report.',
    agentEvidence: evidence,
    agentConcerns: concerns,
    agentRecommendedNextStep: 'continue_tracking',
  };
}

function researchQualityLabel(score: number | null, incomplete: boolean): ResearchQualityScoreLabel {
  if (score === null) return incomplete ? 'Incomplete' : 'Unavailable';
  if (score >= 80) return 'Strong';
  if (score >= 65) return 'Moderate';
  if (score >= 45) return 'Weak';
  return 'Incomplete';
}

export function computeResearchQualityScore(input: {
  date?: string | null;
  time?: string | null;
  direction?: ResearchBackfillDirection | string | null;
  window?: string | null;
  summary?: string | null;
  classification?: 'model1_overlap' | 'turtle_soup_overlap' | 'advisory_only' | string | null;
  model1Overlap?: boolean;
  turtleSoupOverlap?: boolean;
  dataQualityNotes?: string[];
  agentInspectionLabel?: ResearchSampleInspectionLabel | string | null;
  agentConfidence?: ResearchSampleConfidence | string | null;
  researchDetectorReason?: string | null;
  warningFailureReason?: string | null;
}): ResearchQualityScore {
  const reasons: string[] = [];
  const missing: string[] = [];
  if (!input.date) missing.push('date');
  if (!input.time) missing.push('time');
  if (!input.direction || input.direction === 'NO TRADE') missing.push('direction');
  if (!input.summary) missing.push('summary');
  if (missing.length) {
    return {
      score: null,
      label: 'Incomplete',
      reasons: [`Research quality score unavailable because required review field(s) are missing: ${missing.join(', ')}.`],
      source: 'research-only-score',
      researchOnly: true,
    };
  }

  let score = 50;
  reasons.push('Research-only score uses review-pack metadata only; it does not evaluate execution.');

  if (input.window) {
    score += 8;
    reasons.push('Timestamp and review window are present.');
  } else {
    score -= 10;
    reasons.push('Review window is missing.');
  }

  const confidence = input.agentConfidence;
  if (confidence === 'high') {
    score += 12;
    reasons.push('Agent confidence is high.');
  } else if (confidence === 'medium') {
    score += 6;
    reasons.push('Agent confidence is medium.');
  } else {
    score -= 8;
    reasons.push('Agent confidence is low or unavailable.');
  }

  if (input.classification === 'model1_overlap' || input.classification === 'turtle_soup_overlap') {
    score += 8;
    reasons.push('Source classification flagged possible existing-model mapping review.');
  } else if (input.classification === 'advisory_only') {
    score += 4;
    reasons.push('Source classification is advisory-only and preserved for review.');
  } else {
    score -= 8;
    reasons.push('Source classification is missing or unrecognized.');
  }

  if (input.model1Overlap || input.turtleSoupOverlap) {
    score += 6;
    reasons.push('Possible existing-model overlap is marked for human review only.');
  }

  if (input.agentInspectionLabel === 'reject') {
    score -= 22;
    reasons.push('Agent inspection recommends rejecting the sample from research tracking.');
  } else if (input.agentInspectionLabel === 'insufficient_context') {
    score -= 18;
    reasons.push('Agent inspection says context is insufficient.');
  } else if (input.agentInspectionLabel === 'possible_model1_mapping_review' || input.agentInspectionLabel === 'possible_turtle_soup_mapping_review') {
    score += 6;
    reasons.push('Agent inspection queues the sample for human-only mapping review.');
  } else if (input.agentInspectionLabel === 'keep_advisory') {
    score += 4;
    reasons.push('Agent inspection recommends keeping the sample advisory.');
  }

  const notes = input.dataQualityNotes || [];
  const seriousQualityNotes = notes.filter((note) => /missing|unavailable|failed|malformed|invalid|only \d+/i.test(note));
  if (seriousQualityNotes.length) {
    score -= Math.min(18, seriousQualityNotes.length * 6);
    reasons.push(`${seriousQualityNotes.length} data quality note(s) limit research confidence.`);
  }

  const reasonText = `${input.researchDetectorReason || ''} ${input.warningFailureReason || ''}`;
  if (/not worth|no meaningful|stop tracking/i.test(reasonText)) {
    score -= 20;
    reasons.push('Detector reason suggests the sample may not be worth continued research tracking.');
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score: finalScore,
    label: researchQualityLabel(finalScore, false),
    reasons,
    source: 'research-only-score',
    researchOnly: true,
  };
}

function buildReviewSample(candidate: CandidateSample, index: number): ResearchReviewSample {
  const event = candidate.event;
  const model1Overlap = event.classification === 'model1_overlap' || ('possibleModel1Overlap' in event && event.possibleModel1Overlap);
  const turtleSoupOverlap = event.classification === 'turtle_soup_overlap' || ('possibleTurtleSoupOverlap' in event && event.possibleTurtleSoupOverlap);
  const inspection = inspectCandidate(candidate);
  const reason = reasonFor(candidate);
  const dataNotes = dataQualityNotes(candidate);
  const researchQualityScore = computeResearchQualityScore({
    date: event.date,
    time: event.time,
    direction: event.direction,
    window: event.window || null,
    summary: event.summary,
    classification: event.classification,
    model1Overlap,
    turtleSoupOverlap,
    dataQualityNotes: dataNotes,
    researchDetectorReason: reason,
    warningFailureReason: reason,
    agentInspectionLabel: inspection.agentInspectionLabel,
    agentConfidence: inspection.agentConfidence,
  });
  return {
    sampleId: `${candidate.conceptReport.conceptId}-${String(index + 1).padStart(3, '0')}`,
    date: event.date,
    time: event.time,
    concept: candidate.conceptReport.conceptId,
    conceptTitle: candidate.conceptReport.title,
    direction: event.direction,
    window: event.window || null,
    classification: event.classification,
    advisoryOnly: true,
    summary: event.summary,
    whyAdvisoryOnly: event.classification === 'advisory_only'
      ? reason
      : 'Source report marked possible approved-model overlap; human review is still required before any rule discussion.',
    model1Overlap,
    turtleSoupOverlap,
    researchDetectorReason: reason,
    warningFailureReason: reason,
    dataQualityNotes: dataNotes,
    sampleSourceReportPath: candidate.sourcePath,
    researchQualityScore,
    ...inspection,
    agentApprovalBoundary: {
      agentApprovesTrade: false,
      agentChangesRules: false,
      agentCreatesEntry: false,
      agentCreatesTargets: false,
      agentPromotesModel: false,
    },
    humanInspectionLabel: null,
    humanConfidence: null,
    humanReason: null,
    humanNotes: null,
    humanReviewedAt: null,
    humanReviewer: null,
    agentHumanAgreement: null,
    disagreementReason: null,
    reviewEvidence: null,
    agentAssessment: null,
    finalReviewLabel: null,
    finalReviewNotes: null,
  };
}

function collectCandidates(input: ResearchSampleReviewInput): CandidateSample[] {
  const concepts = new Set(selectedConcepts(input.concept));
  const candidates: CandidateSample[] = [];
  for (const source of input.sourceReports) {
    if (source.report.instrument !== input.instrument) continue;
    const conceptReportsById = new Map(source.report.conceptReports.map((conceptReport) => [conceptReport.conceptId, conceptReport]));
    if (source.report.fullCandidateEvents?.length) {
      for (const event of source.report.fullCandidateEvents) {
        if (!concepts.has(event.concept)) continue;
        const conceptReport = conceptReportsById.get(event.concept);
        if (!conceptReport) continue;
        candidates.push({ sourcePath: source.path, report: source.report, conceptReport, event, sourceMode: 'full_candidate_events' });
      }
      continue;
    }
    for (const conceptReport of source.report.conceptReports) {
      if (!concepts.has(conceptReport.conceptId)) continue;
      for (const event of conceptReport.sampleEvents) {
        candidates.push({ sourcePath: source.path, report: source.report, conceptReport, event, sourceMode: 'preview_sample_events' });
      }
    }
  }
  const conceptsWithFullCandidates = new Set(
    candidates
      .filter((candidate) => candidate.sourceMode === 'full_candidate_events')
      .map((candidate) => candidate.conceptReport.conceptId),
  );
  const preferredCandidates = candidates.filter((candidate) =>
    candidate.sourceMode === 'full_candidate_events' || !conceptsWithFullCandidates.has(candidate.conceptReport.conceptId)
  );
  const byKey = new Map<string, CandidateSample>();
  for (const candidate of preferredCandidates) if (!byKey.has(keyFor(candidate))) byKey.set(keyFor(candidate), candidate);
  return [...byKey.values()].sort((a, b) => {
    const dateCompare = a.event.date.localeCompare(b.event.date);
    if (dateCompare) return dateCompare;
    return (a.event.time || '').localeCompare(b.event.time || '');
  });
}

function diversityScore(candidate: CandidateSample, selected: CandidateSample[]): number {
  const event = candidate.event;
  let score = 0;
  if (!selected.some((item) => item.event.direction === event.direction)) score += 4;
  if (!selected.some((item) => item.event.window === event.window)) score += 3;
  if (!selected.some((item) => item.event.classification === event.classification)) score += 3;
  if (!selected.some((item) => item.event.date.slice(0, 7) === event.date.slice(0, 7))) score += 2;
  if (!selected.some((item) => reasonFor(item) === reasonFor(candidate))) score += 2;
  return score;
}

function selectRepresentativeSamples(candidates: CandidateSample[], sampleSize: number): CandidateSample[] {
  const target = Math.max(0, sampleSize);
  if (candidates.length <= target) return [...candidates];
  const selected: CandidateSample[] = [];
  const remaining = [...candidates];

  while (selected.length < target && remaining.length) {
    const strideIndex = selected.length === 0
      ? 0
      : Math.min(remaining.length - 1, Math.floor((selected.length * candidates.length) / target));
    let bestIndex = strideIndex;
    let bestScore = -1;
    remaining.forEach((candidate, index) => {
      const spreadPenalty = Math.abs(index - strideIndex) / Math.max(1, remaining.length);
      const score = diversityScore(candidate, selected) - spreadPenalty;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    selected.push(remaining.splice(bestIndex, 1)[0]);
  }

  return selected.sort((a, b) => {
    const conceptCompare = CONCEPT_ORDER.indexOf(a.conceptReport.conceptId) - CONCEPT_ORDER.indexOf(b.conceptReport.conceptId);
    if (conceptCompare) return conceptCompare;
    const dateCompare = a.event.date.localeCompare(b.event.date);
    if (dateCompare) return dateCompare;
    return (a.event.time || '').localeCompare(b.event.time || '');
  });
}

function summarizeConcept(concept: ResearchBackfillConceptId, candidates: CandidateSample[], samples: ResearchReviewSample[]): ResearchSampleConceptSummary {
  const conceptCandidates = candidates.filter((candidate) => candidate.conceptReport.conceptId === concept);
  const selected = samples.filter((sample) => sample.concept === concept);
  const directionCounts: Record<string, number> = {};
  const windowCounts: Record<string, number> = {};
  for (const sample of selected) {
    pushCount(directionCounts, sample.direction);
    pushCount(windowCounts, sample.window);
  }
  return {
    concept,
    title: conceptCandidates[0]?.conceptReport.title || CONCEPT_TITLES[concept],
    sourceReports: new Set(conceptCandidates.map((candidate) => candidate.sourcePath)).size,
    availableSamples: conceptCandidates.length,
    selectedSamples: selected.length,
    classificationCounts: {
      advisoryOnly: selected.filter((sample) => sample.classification === 'advisory_only').length,
      model1Overlap: selected.filter((sample) => sample.classification === 'model1_overlap').length,
      turtleSoupOverlap: selected.filter((sample) => sample.classification === 'turtle_soup_overlap').length,
    },
    directionCounts,
    windowCounts,
    commonReasons: topValues(selected.map((sample) => sample.warningFailureReason)),
  };
}

function renderSample(sample: ResearchReviewSample): string {
  const researchQuality = sample.researchQualityScore;
  return [
    `### Sample ${sample.sampleId}`,
    `- Date/time: ${sample.date} ${sample.time || 'pending'}`,
    `- Concept: ${sample.conceptTitle}`,
    `- Direction/window: ${sample.direction} / ${sample.window || 'unspecified'}`,
    `- Classification: ${sample.classification}`,
    `- Why advisory-only: ${sample.whyAdvisoryOnly}`,
    `- Model 1 overlap: ${sample.model1Overlap ? 'yes' : 'no'}`,
    `- Turtle Soup overlap: ${sample.turtleSoupOverlap ? 'yes' : 'no'}`,
    `- Agent inspection: ${sample.agentInspectionLabel}`,
    `- Agent confidence: ${sample.agentConfidence}`,
    `- Agent reason: ${sample.agentReason}`,
    `- Research Quality Score: ${!researchQuality ? 'Unavailable' : researchQuality.score === null ? researchQuality.label : `${researchQuality.score}/100 (${researchQuality.label})`}`,
    `- Human review:`,
    `  - Label: pending`,
    `  - Notes: pending`,
  ].join('\n');
}

export function renderResearchSampleReviewMarkdown(pack: Omit<ResearchSampleReviewPack, 'markdown'>): string {
  return [
    `# Research Sample Review Pack - ${pack.instrument}`,
    '',
    '## 1. Executive Summary',
    ...pack.executiveSummary.map((line) => `- ${line}`),
    '',
    '## 2. Concept Summary',
    ...pack.conceptSummaries.map((summary) => [
      `- ${summary.title}: ${summary.selectedSamples}/${summary.availableSamples} selected`,
      `  - Advisory-only: ${summary.classificationCounts.advisoryOnly}`,
      `  - Model 1 mapping review: ${summary.classificationCounts.model1Overlap}`,
      `  - Turtle Soup mapping review: ${summary.classificationCounts.turtleSoupOverlap}`,
    ].join('\n')),
    '',
    '## 3. Sample Selection Method',
    ...pack.sampleSelectionMethod.map((line) => `- ${line}`),
    '',
    '## 4. Representative Samples',
    ...pack.samples.map(renderSample),
    '',
    '## 5. Agent Inspection Results',
    ...pack.samples.map((sample) => `- ${sample.sampleId}: ${sample.agentInspectionLabel} (${sample.agentConfidence}) - ${sample.agentReason}`),
    '',
    '## 6. Human Review Fields To Complete',
    '- humanInspectionLabel',
    '- humanConfidence',
    '- humanReason',
    '- humanNotes',
    '- humanReviewedAt',
    '- humanReviewer',
    '- Supported label note: new_model_candidate_review means a distinct research pattern may deserve human-only future model design discussion; not execution approval.',
    '',
    '## 7. Possible Existing-Model Mapping Review',
    ...(pack.possibleExistingModelMappingReview.length ? pack.possibleExistingModelMappingReview.map((line) => `- ${line}`) : ['- none']),
    '',
    '## 8. Advisory-Only Findings',
    ...(pack.advisoryOnlyFindings.length ? pack.advisoryOnlyFindings.map((line) => `- ${line}`) : ['- none']),
    '',
    '## 9. Human Review Questions',
    ...pack.humanReviewQuestions.map((line) => `- ${line}`),
    '',
    '## 10. Do-Not-Change-Yet Items',
    '- Agent inspection does not approve trades.',
    ...pack.doNotChangeYetItems.map((line) => `- ${line}`),
    '',
    '## 11. Approval Boundary',
    ...Object.entries(pack.approvalBoundary).map(([key, value]) => `- ${key}: ${String(value)}`),
  ].join('\n');
}

export function createResearchSampleReviewPack(input: ResearchSampleReviewInput): ResearchSampleReviewPack {
  const allCandidates = collectCandidates(input);
  const selectedCandidates = selectRepresentativeSamples(allCandidates, input.sampleSize);
  const samples = selectedCandidates.map(buildReviewSample);
  const sampleSourceMode = selectedCandidates.some((candidate) => candidate.sourceMode === 'full_candidate_events')
    ? 'full_candidate_events'
    : 'preview_sample_events';
  const concepts = selectedConcepts(input.concept);
  const conceptSummaries = concepts.map((concept) => summarizeConcept(concept, allCandidates, samples));
  const possibleMappings = samples
    .filter((sample) => sample.agentInspectionLabel === 'possible_model1_mapping_review' || sample.agentInspectionLabel === 'possible_turtle_soup_mapping_review')
    .map((sample) => `${sample.sampleId}: ${sample.agentInspectionLabel}; human review required before any rule discussion.`);
  const packWithoutMarkdown: Omit<ResearchSampleReviewPack, 'markdown'> = {
    reportType: 'research_sample_review_pack',
    generatedAt: input.generatedAt || new Date().toISOString(),
    instrument: input.instrument,
    concept: input.concept,
    requestedSampleSize: input.sampleSize,
    selectedSampleCount: samples.length,
    sourceReportPaths: [...new Set(input.sourceReports.map((source) => source.path))].sort(),
    sampleSourceMode,
    executiveSummary: [
      `Selected ${samples.length} representative sample(s) from ${allCandidates.length} available sample event(s).`,
      sampleSourceMode === 'full_candidate_events'
        ? 'Sample review used full candidate events from research backfill reports.'
        : 'Sample review used preview sample events only because full candidate events were not available.',
      'Agent inspection is research-only and does not approve trades.',
      'Human review is required before any model or rule discussion.',
    ],
    conceptSummaries,
    sampleSelectionMethod: [
      sampleSourceMode === 'full_candidate_events'
        ? 'Samples are selected from persisted full candidate events when available.'
        : 'Samples are selected from saved preview sample events because full candidate events are unavailable.',
      'Selection prioritizes date spread, direction diversity, window diversity, classification diversity, warning/failure reason diversity, advisory-only status, and possible existing-model mapping indicators.',
      'If source reports only store preview samples, the review pack cannot recover unsaved candidate details.',
    ],
    samples,
    possibleExistingModelMappingReview: possibleMappings,
    advisoryOnlyFindings: samples
      .filter((sample) => sample.classification === 'advisory_only')
      .map((sample) => `${sample.sampleId}: remains advisory-only; ${sample.warningFailureReason}`),
    humanReviewQuestions: [
      'Does the sample actually satisfy current approved Model 1 gates?',
      'Does the sample actually satisfy current Turtle Soup sweep, reclaim, risk, session, and target-room gates?',
      'Is the detector reason meaningful enough to continue collecting this concept?',
      'Should the sample remain advisory-only, be rejected, or be queued for human rule review?',
    ],
    doNotChangeYetItems: [
      'Do not change trading rules from this review pack.',
      'Do not add executable research models.',
      'Do not add entries, stops, targets, alerts, outcome buttons, or RAG writes.',
      'Do not use agent inspection to approve trades.',
    ],
    approvalBoundary: {
      sampleReviewApprovesTrade: false,
      sampleReviewChangesRules: false,
      sampleReviewCreatesEntry: false,
      sampleReviewCreatesTargets: false,
      sampleReviewPromotesModel: false,
      sampleReviewWritesRagMemory: false,
    },
  };
  return {
    ...packWithoutMarkdown,
    markdown: renderResearchSampleReviewMarkdown(packWithoutMarkdown),
  };
}
