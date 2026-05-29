import type {
  ResearchHumanInspectionLabel,
  ResearchReviewSample,
  ResearchSampleConfidence,
  ResearchSampleReviewPack,
} from './researchSampleReviewAgent';

export type HumanReviewLabel = ResearchHumanInspectionLabel;
export type HumanReviewConfidence = ResearchSampleConfidence;

export interface HumanReviewCaptureInput {
  reviewPack: ResearchSampleReviewPack;
  sampleId: string;
  label: HumanReviewLabel;
  confidence: HumanReviewConfidence;
  reviewer: string;
  notes?: string | null;
  reason?: string | null;
  reviewedAt?: string;
}

export interface HumanReviewCaptureResult {
  updatedPack: ResearchSampleReviewPack;
  sample: ResearchReviewSample;
}

export interface HumanReviewProgressSummary {
  totalSamples: number;
  reviewedSamples: number;
  pendingSamples: number;
  agreementCount: number;
  disagreementCount: number;
  labelCounts: Record<string, number>;
  advisoryOnlyConfirmed: boolean;
}

const PROHIBITED_EXECUTABLE_FIELDS = new Set([
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
  'executionApproved',
  'orderInstructions',
  'alerts',
  'outcomeButtons',
  'ragPayload',
  'journalPayload',
]);

const HUMAN_LABELS: HumanReviewLabel[] = [
  'keep_advisory',
  'reject',
  'possible_model1_mapping_review',
  'possible_turtle_soup_mapping_review',
  'human_rule_review_queue',
  'new_model_candidate_review',
  'insufficient_context',
];

const HUMAN_CONFIDENCE: HumanReviewConfidence[] = ['low', 'medium', 'high'];

export function isHumanReviewLabel(value: string): value is HumanReviewLabel {
  return HUMAN_LABELS.includes(value as HumanReviewLabel);
}

export function isHumanReviewConfidence(value: string): value is HumanReviewConfidence {
  return HUMAN_CONFIDENCE.includes(value as HumanReviewConfidence);
}

function clonePack(pack: ResearchSampleReviewPack): ResearchSampleReviewPack {
  return JSON.parse(JSON.stringify(pack)) as ResearchSampleReviewPack;
}

function prohibitedFieldPaths(value: unknown, path = 'reviewPack'): string[] {
  if (!value || typeof value !== 'object') return [];
  const paths: string[] = [];
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const nextPath = `${path}.${key}`;
    if (PROHIBITED_EXECUTABLE_FIELDS.has(key)) paths.push(nextPath);
    paths.push(...prohibitedFieldPaths(child, nextPath));
  }
  return paths;
}

export function assertNoExecutableReviewFields(pack: ResearchSampleReviewPack): void {
  const paths = prohibitedFieldPaths(pack.samples, 'reviewPack.samples');
  if (paths.length) {
    throw new Error(`Human review pack contains prohibited executable field(s): ${paths.join(', ')}`);
  }
}

function assertAgentBoundary(sample: ResearchReviewSample): void {
  const boundary = sample.agentApprovalBoundary;
  if (
    !boundary ||
    boundary.agentApprovesTrade !== false ||
    boundary.agentChangesRules !== false ||
    boundary.agentCreatesEntry !== false ||
    boundary.agentCreatesTargets !== false ||
    boundary.agentPromotesModel !== false
  ) {
    throw new Error(`Sample ${sample.sampleId} has an invalid agent approval boundary.`);
  }
}

function normalizeSampleSafety(sample: ResearchReviewSample): ResearchReviewSample {
  assertAgentBoundary(sample);
  return {
    ...sample,
    advisoryOnly: true,
  };
}

function disagreementReason(agentLabel: string | null, humanLabel: string | null): string | null {
  if (!agentLabel || !humanLabel || agentLabel === humanLabel) return null;
  return `Agent labeled this sample "${agentLabel}", while human review labeled it "${humanLabel}". Human review controls the final research label, but this remains advisory-only and does not approve execution.`;
}

function finalNotes(agentLabel: string | null, humanLabel: string, agreement: boolean | null): string {
  const agreementText = agreement === true ? 'labels agree' : agreement === false ? 'labels differ' : 'agreement is pending';
  return `Agent label: ${agentLabel || 'missing'}; human label: ${humanLabel}; ${agreementText}. Research-only review: no execution approval, no rule change, and no model promotion.`;
}

export function applyHumanReviewToPack(input: HumanReviewCaptureInput): HumanReviewCaptureResult {
  if (!isHumanReviewLabel(input.label)) throw new Error(`Unsupported human review label: ${input.label}`);
  if (!isHumanReviewConfidence(input.confidence)) throw new Error(`Unsupported human confidence: ${input.confidence}`);
  if (!input.reviewer.trim()) throw new Error('--reviewer is required.');
  assertNoExecutableReviewFields(input.reviewPack);

  const updatedPack = clonePack(input.reviewPack);
  const sampleIndex = updatedPack.samples.findIndex((sample) => sample.sampleId === input.sampleId);
  if (sampleIndex < 0) throw new Error(`Sample not found: ${input.sampleId}`);

  const current = normalizeSampleSafety(updatedPack.samples[sampleIndex]);
  const agentHumanAgreement = current.agentInspectionLabel ? current.agentInspectionLabel === input.label : null;
  const updatedSample: ResearchReviewSample = {
    ...current,
    humanInspectionLabel: input.label,
    humanConfidence: input.confidence,
    humanReason: input.reason || input.notes || null,
    humanNotes: input.notes || null,
    humanReviewedAt: input.reviewedAt || new Date().toISOString(),
    humanReviewer: input.reviewer,
    agentHumanAgreement,
    disagreementReason: disagreementReason(current.agentInspectionLabel, input.label),
    finalReviewLabel: input.label,
    finalReviewNotes: finalNotes(current.agentInspectionLabel, input.label, agentHumanAgreement),
  };

  updatedPack.samples = updatedPack.samples.map((sample, index) =>
    index === sampleIndex ? updatedSample : normalizeSampleSafety(sample)
  );
  updatedPack.markdown = renderHumanReviewMarkdown(updatedPack);
  assertNoExecutableReviewFields(updatedPack);
  return { updatedPack, sample: updatedSample };
}

export function listPendingHumanReviewSamples(pack: ResearchSampleReviewPack): ResearchReviewSample[] {
  assertNoExecutableReviewFields(pack);
  return pack.samples.filter((sample) => sample.humanInspectionLabel === null);
}

export function summarizeHumanReviewProgress(pack: ResearchSampleReviewPack): HumanReviewProgressSummary {
  assertNoExecutableReviewFields(pack);
  const reviewed = pack.samples.filter((sample) => sample.humanInspectionLabel !== null);
  const labelCounts: Record<string, number> = {};
  for (const sample of reviewed) {
    const label = sample.humanInspectionLabel || 'pending';
    labelCounts[label] = (labelCounts[label] || 0) + 1;
  }
  return {
    totalSamples: pack.samples.length,
    reviewedSamples: reviewed.length,
    pendingSamples: pack.samples.length - reviewed.length,
    agreementCount: reviewed.filter((sample) => sample.agentHumanAgreement === true).length,
    disagreementCount: reviewed.filter((sample) => sample.agentHumanAgreement === false).length,
    labelCounts,
    advisoryOnlyConfirmed: pack.samples.every((sample) => sample.advisoryOnly === true && sample.agentApprovalBoundary.agentApprovesTrade === false),
  };
}

function renderReviewedSample(sample: ResearchReviewSample): string {
  return [
    `### ${sample.sampleId}`,
    `- Date/time: ${sample.date} ${sample.time || 'pending'}`,
    `- Concept: ${sample.conceptTitle}`,
    `- Agent label: ${sample.agentInspectionLabel}`,
    `- Human label: ${sample.humanInspectionLabel || 'pending'}`,
    `- Agreement: ${sample.agentHumanAgreement === null ? 'pending' : String(sample.agentHumanAgreement)}`,
    `- Final review label: ${sample.finalReviewLabel || 'pending'}`,
    `- Notes: ${sample.humanNotes || 'pending'}`,
  ].join('\n');
}

export function renderHumanReviewMarkdown(pack: ResearchSampleReviewPack): string {
  const summary = summarizeHumanReviewProgress(pack);
  const reviewed = pack.samples.filter((sample) => sample.humanInspectionLabel !== null);
  const pending = pack.samples.filter((sample) => sample.humanInspectionLabel === null);
  const disagreements = reviewed.filter((sample) => sample.agentHumanAgreement === false);
  return [
    `# Human Research Review - ${pack.instrument}`,
    '',
    '## 1. Executive Summary',
    `- Total samples: ${summary.totalSamples}`,
    `- Reviewed samples: ${summary.reviewedSamples}`,
    `- Pending samples: ${summary.pendingSamples}`,
    '- Research-only. Human review does not approve trades, change rules, or promote models.',
    '',
    '## 2. Human Review Progress',
    `- Agreement count: ${summary.agreementCount}`,
    `- Disagreement count: ${summary.disagreementCount}`,
    `- Advisory-only confirmed: ${summary.advisoryOnlyConfirmed}`,
    '',
    '## 3. Agent/Human Agreement Summary',
    ...(Object.keys(summary.labelCounts).length
      ? Object.entries(summary.labelCounts).map(([label, count]) => `- ${label}: ${count}`)
      : ['- No human labels captured yet.']),
    '',
    '## 4. Reviewed Samples',
    ...(reviewed.length ? reviewed.map(renderReviewedSample) : ['- none']),
    '',
    '## 5. Pending Samples',
    ...(pending.length ? pending.map((sample) => `- ${sample.sampleId}: ${sample.conceptTitle} ${sample.date} ${sample.time || ''}`) : ['- none']),
    '',
    '## 6. Disagreements',
    ...(disagreements.length
      ? disagreements.map((sample) => `- ${sample.sampleId}: ${sample.disagreementReason}`)
      : ['- none']),
    '',
    '## 7. Advisory-Only Boundary',
    '- Reviewed samples remain advisory-only.',
    '- No entries, stops, targets, alerts, outcome buttons, RAG writes, or execution approval are created.',
    '',
    '## 8. Do-Not-Change-Yet Items',
    '- Do not change Model 1 or Turtle Soup gates from this review pack.',
    '- Do not promote research concepts into executable models.',
    '- Human review may queue future discussion only.',
  ].join('\n');
}
