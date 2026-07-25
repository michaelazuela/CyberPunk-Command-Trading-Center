import type {
  AgentHumanInputAssessment,
  ResearchHumanInspectionLabel,
  ResearchReviewEvidence,
  ResearchReviewSample,
  ResearchSampleConfidence,
  ResearchSampleReviewPack,
} from './researchSampleReviewAgent';
import {
  calculateEstimatedGrossContractPnl,
  coerceEstimatedGrossContractPnl,
  type EstimatedGrossContractPnl,
} from '../lib/futuresContractMetadata';
import {
  getHumanReviewLabelMetadata,
  SUPPORTED_HUMAN_REVIEW_LABELS,
} from '../lib/humanReviewLabels';

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
  evidence?: {
    chartAvailable?: boolean | null;
    chartReportReference?: string | null;
    chartWithheldReason?: string | null;
    chartWithheld?: boolean | null;
    chartPngPath?: string | null;
    chartSvgPath?: string | null;
    chartReportPath?: string | null;
    sourceReviewCard?: string | null;
  };
  estimatedGrossContractPnl?: EstimatedGrossContractPnl | null;
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

const HUMAN_LABELS = SUPPORTED_HUMAN_REVIEW_LABELS as HumanReviewLabel[];

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

function sampleSymbol(sample: ResearchReviewSample): unknown {
  const record = sample as ResearchReviewSample & {
    symbol?: unknown;
    instrument?: unknown;
    contract?: unknown;
  };
  return record.symbol || record.instrument || record.contract;
}

function resolveReviewPnl(input: {
  sample: ResearchReviewSample;
  packInstrument: string;
  provided?: EstimatedGrossContractPnl | null;
}): EstimatedGrossContractPnl {
  return coerceEstimatedGrossContractPnl(input.provided) ||
    coerceEstimatedGrossContractPnl(input.sample.estimatedGrossContractPnl) ||
    calculateEstimatedGrossContractPnl({
      outcome: null,
      sampleSymbol: sampleSymbol(input.sample),
      reviewPackSymbol: input.packInstrument,
    });
}

function disagreementReason(agentLabel: string | null, humanLabel: string | null): string | null {
  if (!agentLabel || !humanLabel || agentLabel === humanLabel) return null;
  return `Agent labeled this sample "${agentLabel}", while human review labeled it "${humanLabel}". Human review controls the final research label, but this remains advisory-only and does not approve execution.`;
}

function finalNotes(agentLabel: string | null, humanLabel: string, agreement: boolean | null): string {
  const agreementText = agreement === true ? 'labels agree' : agreement === false ? 'labels differ' : 'agreement is pending';
  const metadata = getHumanReviewLabelMetadata(humanLabel);
  return `Agent label: ${agentLabel || 'missing'}; human label: ${humanLabel}; category=${metadata.category}; formalLedgerEligible=${metadata.formalLedgerEligible ? 'yes' : 'no'}; ${agreementText}. Research-only review: no execution approval, no rule change, and no model promotion.`;
}

function isHumanApprovalLabel(label: HumanReviewLabel): boolean {
  return label === 'approved_for_future_model_candidate_review';
}

function isHumanRejectionLabel(label: HumanReviewLabel): boolean {
  const metadata = getHumanReviewLabelMetadata(label);
  return label === 'not_approved_for_future_model_candidate_review' ||
    metadata.category === 'reject_or_deprioritize' ||
    metadata.suggestedNextAction === 'add_context_or_collect_more_samples';
}

function containsRiskBlocker(sample: ResearchReviewSample): boolean {
  const text = [
    sample.warningFailureReason,
    sample.whyAdvisoryOnly,
    sample.agentReason,
    sample.agentConcerns.join(' '),
    sample.dataQualityNotes.join(' '),
  ].join(' ');
  return /RiskTooWide|risk too wide|NoTrigger|no trigger|InvalidContext|invalid context|insufficient context|missing|unavailable/i.test(text);
}

function hasExactEvidencePath(evidence: ResearchReviewEvidence | null | undefined): boolean {
  return Boolean(evidence?.chartPngPath || evidence?.chartSvgPath || evidence?.chartReportPath);
}

function buildReviewEvidence(
  current: ResearchReviewSample,
  evidence: HumanReviewCaptureInput['evidence'],
): ResearchReviewEvidence {
  const currentEvidence = current.reviewEvidence || null;
  const hasNewEvidence = Boolean(
    evidence &&
    (
      evidence.chartAvailable !== undefined ||
      evidence.chartWithheld !== undefined ||
      evidence.chartPngPath ||
      evidence.chartSvgPath ||
      evidence.chartReportPath ||
      evidence.sourceReviewCard ||
      evidence.chartReportReference ||
      evidence.chartWithheldReason
    )
  );
  if (!hasNewEvidence && currentEvidence) return currentEvidence;

  const chartWithheld = evidence?.chartWithheld === true || Boolean(evidence?.chartWithheldReason);
  const chartPngPath = evidence?.chartPngPath || currentEvidence?.chartPngPath;
  const chartSvgPath = evidence?.chartSvgPath || currentEvidence?.chartSvgPath;
  const chartReportPath = evidence?.chartReportPath || evidence?.chartReportReference || currentEvidence?.chartReportPath;
  const sourceReviewCard = evidence?.sourceReviewCard || currentEvidence?.sourceReviewCard;
  const chartAvailable = chartWithheld
    ? false
    : evidence?.chartAvailable === true || Boolean(chartPngPath || chartSvgPath || chartReportPath || sourceReviewCard);
  let evidenceStatus: ResearchReviewEvidence['evidenceStatus'] = 'chart_unknown';
  if (chartWithheld) evidenceStatus = 'chart_withheld';
  else if (chartAvailable) evidenceStatus = 'chart_available';
  else if (evidence?.chartAvailable === false) evidenceStatus = 'chart_missing';

  return {
    chartAvailable,
    chartWithheld,
    ...(chartPngPath ? { chartPngPath } : {}),
    ...(chartSvgPath ? { chartSvgPath } : {}),
    ...(chartReportPath ? { chartReportPath } : {}),
    ...(sourceReviewCard ? { sourceReviewCard } : {}),
    evidenceStatus,
  };
}

export function assessHumanReviewInput(input: {
  sample: ResearchReviewSample;
  humanLabel: HumanReviewLabel;
  reviewedAt: string;
  evidence?: HumanReviewCaptureInput['evidence'];
  reviewEvidence?: ResearchReviewEvidence | null;
}): AgentHumanInputAssessment {
  const { sample, humanLabel } = input;
  const reviewEvidence = input.reviewEvidence || buildReviewEvidence(sample, input.evidence);
  const chartAvailable = reviewEvidence.evidenceStatus === 'chart_unknown' ? null : reviewEvidence.chartAvailable;
  const chartReportReference = reviewEvidence.chartReportPath || input.evidence?.chartReportReference || null;
  const exactPaths = [
    reviewEvidence.chartPngPath ? `PNG: ${reviewEvidence.chartPngPath}` : null,
    reviewEvidence.chartSvgPath ? `SVG: ${reviewEvidence.chartSvgPath}` : null,
    reviewEvidence.chartReportPath ? `Report: ${reviewEvidence.chartReportPath}` : null,
    reviewEvidence.sourceReviewCard ? `Source review card: ${reviewEvidence.sourceReviewCard}` : null,
  ].filter((value): value is string => Boolean(value));
  const riskOrContextBlocker = containsRiskBlocker(sample);
  const agentLabel = sample.agentInspectionLabel;
  const exactAgreement = agentLabel === humanLabel;
  const evidenceChecked = [
    `Original sample: ${sample.sampleId}`,
    `Setup/concept: ${sample.conceptTitle}`,
    `Direction/window: ${sample.direction} / ${sample.window || 'unspecified'}`,
    `Original research decision: ${agentLabel}`,
    `Block reason: ${sample.warningFailureReason || sample.whyAdvisoryOnly || 'none recorded'}`,
    `Risk label: ${sample.researchQualityScore?.label || 'unavailable'}`,
    chartAvailable === true
      ? `Chart/report evidence: ${exactPaths.length ? exactPaths.join(' | ') : chartReportReference || 'available but exact artifact path not recorded'}`
      : chartAvailable === false
        ? `Chart/report evidence unavailable: ${input.evidence?.chartWithheldReason || 'chart was withheld or missing'}`
        : 'Chart/report evidence unavailable in reviewed artifact',
    'Reviewed JSON',
    'Reviewed Markdown',
  ];

  if (chartAvailable !== true) {
    return {
      status: 'unclear_insufficient_evidence',
      humanInputQuality: 'needs_more_evidence',
      researchUsefulness: 'needs_chart',
      reason: 'The human decision was preserved, but the reviewed artifact does not provide enough chart/report evidence for a confident agent assessment.',
      evidenceChecked,
      chartReportReference,
      chartEvidenceAvailable: chartAvailable,
      boundary: 'research_only_not_execution_authority',
      assessedAt: input.reviewedAt,
    };
  }

  if (!hasExactEvidencePath(reviewEvidence)) {
    return {
      status: 'unclear_insufficient_evidence',
      humanInputQuality: 'needs_more_evidence',
      researchUsefulness: 'needs_more_context',
      reason: 'Chart evidence appears available, but it is not traceable to an exact artifact path, so the agent assessment remains conservative.',
      evidenceChecked,
      chartReportReference,
      chartEvidenceAvailable: chartAvailable,
      boundary: 'research_only_not_execution_authority',
      assessedAt: input.reviewedAt,
    };
  }

  if (riskOrContextBlocker && isHumanApprovalLabel(humanLabel)) {
    return {
      status: exactAgreement ? 'partially_agrees_with_human' : 'disagrees_with_human',
      humanInputQuality: /RiskTooWide|risk too wide/i.test(evidenceChecked.join(' ')) ? 'missed_risk' : 'missed_context',
      researchUsefulness: 'questionable',
      reason: 'The human input may be useful research evidence, but it appears aggressive because the original sample carried a risk/context blocker that should stay advisory.',
      evidenceChecked,
      chartReportReference,
      chartEvidenceAvailable: chartAvailable,
      boundary: 'research_only_not_execution_authority',
      assessedAt: input.reviewedAt,
    };
  }

  if (exactAgreement) {
    return {
      status: 'agrees_with_human',
      humanInputQuality: 'reasonable',
      researchUsefulness: isHumanRejectionLabel(humanLabel) ? 'questionable' : 'useful',
      reason: 'The human input is consistent with the original research label and available chart/report context.',
      evidenceChecked,
      chartReportReference,
      chartEvidenceAvailable: chartAvailable,
      boundary: 'research_only_not_execution_authority',
      assessedAt: input.reviewedAt,
    };
  }

  if (isHumanRejectionLabel(humanLabel) && sample.agentInspectionLabel === 'keep_advisory') {
    return {
      status: 'partially_agrees_with_human',
      humanInputQuality: 'too_conservative',
      researchUsefulness: 'questionable',
      reason: 'The human input is more conservative than the original research label. That is safe, but the sample may still be worth advisory tracking.',
      evidenceChecked,
      chartReportReference,
      chartEvidenceAvailable: chartAvailable,
      boundary: 'research_only_not_execution_authority',
      assessedAt: input.reviewedAt,
    };
  }

  return {
    status: 'partially_agrees_with_human',
    humanInputQuality: 'reasonable',
    researchUsefulness: isHumanApprovalLabel(humanLabel) ? 'useful' : 'questionable',
    reason: 'The human input differs from the original research label but remains plausible for research review based on the preserved sample and chart/report evidence.',
    evidenceChecked,
    chartReportReference,
    chartEvidenceAvailable: chartAvailable,
    boundary: 'research_only_not_execution_authority',
    assessedAt: input.reviewedAt,
  };
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
  const reviewedAt = input.reviewedAt || new Date().toISOString();
  const reviewEvidence = buildReviewEvidence(current, input.evidence);
  const estimatedGrossContractPnl = resolveReviewPnl({
    sample: current,
    packInstrument: updatedPack.instrument,
    provided: input.estimatedGrossContractPnl,
  });
  const updatedSample: ResearchReviewSample = {
    ...current,
    humanInspectionLabel: input.label,
    humanConfidence: input.confidence,
    humanReason: input.reason || input.notes || null,
    humanNotes: input.notes || null,
    humanReviewedAt: reviewedAt,
    humanReviewer: input.reviewer,
    agentHumanAgreement,
    disagreementReason: disagreementReason(current.agentInspectionLabel, input.label),
    reviewEvidence,
    agentAssessment: assessHumanReviewInput({
      sample: current,
      humanLabel: input.label,
      reviewedAt,
      evidence: input.evidence,
      reviewEvidence,
    }),
    estimatedGrossContractPnl,
    finalReviewLabel: input.label,
    finalReviewNotes: finalNotes(current.agentInspectionLabel, input.label, agentHumanAgreement),
  };

  updatedPack.samples = updatedPack.samples.map((sample, index) => {
    if (index === sampleIndex) return updatedSample;
    const safeSample = normalizeSampleSafety(sample);
    if (safeSample.humanInspectionLabel && !safeSample.agentAssessment) {
      const existingReviewEvidence = buildReviewEvidence(safeSample, undefined);
      return {
        ...safeSample,
        reviewEvidence: existingReviewEvidence,
        agentAssessment: assessHumanReviewInput({
          sample: safeSample,
          humanLabel: safeSample.humanInspectionLabel,
          reviewedAt: safeSample.humanReviewedAt || reviewedAt,
          reviewEvidence: existingReviewEvidence,
        }),
        estimatedGrossContractPnl: resolveReviewPnl({
          sample: safeSample,
          packInstrument: updatedPack.instrument,
          provided: safeSample.estimatedGrossContractPnl,
        }),
      };
    }
    return safeSample;
  });
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
  const assessment = sample.agentAssessment;
  const evidence = sample.reviewEvidence;
  const pnl = coerceEstimatedGrossContractPnl(sample.estimatedGrossContractPnl);
  const labelMetadata = getHumanReviewLabelMetadata(sample.humanInspectionLabel || sample.finalReviewLabel);
  return [
    `### Sample: ${sample.sampleId}`,
    '',
    'Original Research:',
    `- Setup: ${sample.conceptTitle}`,
    `- Direction: ${sample.direction}`,
    `- Decision: ${sample.agentInspectionLabel}`,
    `- Block Reason: ${sample.warningFailureReason || sample.whyAdvisoryOnly || 'none recorded'}`,
    `- Risk Label: ${sample.researchQualityScore?.label || 'unavailable'}`,
    '',
    'Human Review:',
    `- Decision: ${sample.humanInspectionLabel || 'pending'}`,
    '- Tags: none',
    `- Comment: ${sample.humanNotes || sample.humanReason || 'pending'}`,
    '',
    'Human Review Label:',
    `- Label: ${labelMetadata.label}`,
    `- Display Name: ${labelMetadata.displayName}`,
    `- Category: ${labelMetadata.category}`,
    `- Counts Toward Formal Candidate Gates: ${labelMetadata.countsTowardCandidateGates ? 'Yes' : 'No'}`,
    `- Formal Ledger Eligible: ${labelMetadata.formalLedgerEligible ? 'Yes' : 'No'}`,
    `- Meaning: ${labelMetadata.meaning}`,
    `- Does Not Mean: ${labelMetadata.doesNotMean.join('; ')}`,
    `- Suggested Next Action: ${labelMetadata.suggestedNextAction}`,
    `- Boundary: ${labelMetadata.boundary}`,
    '',
    'Agent Assessment:',
    `- Status: ${assessment?.status || 'unclear_insufficient_evidence'}`,
    `- Human Input Quality: ${assessment?.humanInputQuality || 'needs_more_evidence'}`,
    `- Research Usefulness: ${assessment?.researchUsefulness || 'needs_more_context'}`,
    `- Reason: ${assessment?.reason || 'Agent assessment unavailable for this reviewed sample.'}`,
    `- Evidence Checked: ${assessment?.evidenceChecked.join('; ') || 'none'}`,
    `- Boundary: ${assessment?.boundary || 'research_only_not_execution_authority'}`,
    '',
    'Chart/Report:',
    `- Evidence Status: ${evidence?.evidenceStatus || 'chart_unknown'}`,
    `- Chart Available: ${evidence ? String(evidence.chartAvailable) : 'Not recorded'}`,
    `- Chart Withheld: ${evidence ? String(evidence.chartWithheld) : 'Not recorded'}`,
    `- PNG: ${evidence?.chartPngPath || 'Not recorded'}`,
    `- SVG: ${evidence?.chartSvgPath || 'Not recorded'}`,
    `- Report: ${evidence?.chartReportPath || assessment?.chartReportReference || 'Not recorded'}`,
    '',
    'Estimated Gross Contract P/L, 1 Contract:',
    ...renderEstimatedGrossContractPnlLines(pnl),
    '',
    'Research Boundary:',
    '- Reviewed sample remains research-only.',
    '- Estimated gross contract P/L is not actual executed P/L, not net P/L, and not live trade approval.',
  ].join('\n');
}

function signedNumber(value: number, decimals: number): string {
  const prefix = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${prefix}${Math.abs(value).toFixed(decimals)}`;
}

function signedDollars(value: number): string {
  const prefix = value > 0 ? '+$' : value < 0 ? '-$' : '$';
  return `${prefix}${Math.abs(value).toFixed(2)}`;
}

function movementLine(label: string, points?: number, ticks?: number, dollars?: number, unavailableText = 'Not recorded'): string {
  if (points === undefined || ticks === undefined || dollars === undefined) return `- ${label}: ${unavailableText}`;
  return `- ${label}: ${signedNumber(points, 2)} pts / ${signedNumber(ticks, Number.isInteger(ticks) ? 0 : 2)} ticks / ${signedDollars(dollars)} gross`;
}

function renderEstimatedGrossContractPnlLines(pnl: EstimatedGrossContractPnl | null): string[] {
  if (!pnl) {
    return [
      '- Contract: Not recorded',
      '- Point Value: Not recorded',
      '- Tick Size: Not recorded',
      '- Tick Value: Not recorded',
      '- MFE: Not recorded',
      '- MAE: Not recorded',
      '- T1: Not recorded',
      '- T2: Not recorded',
      '- Adverse: Not recorded',
      '- First Meaningful Move: Not recorded',
      '- Hypothetical Outcome: Not available - no defined hypothetical exit model.',
      '- Status: unavailable_no_outcome_math',
      '- Note: Research-only gross estimate was not calculated for this reviewed artifact.',
    ];
  }
  return [
    `- Contract: ${pnl.rootSymbol === 'UNKNOWN' ? 'UNKNOWN' : `${pnl.rootSymbol} - ${pnl.displayName}`}`,
    `- Point Value: ${pnl.pointValue ? `$${pnl.pointValue.toFixed(2)}` : 'Not recorded'}`,
    `- Tick Size: ${pnl.tickSize || 'Not recorded'}`,
    `- Tick Value: ${pnl.tickValue ? `$${pnl.tickValue.toFixed(2)}` : 'Not recorded'}`,
    movementLine('MFE', pnl.mfePoints, pnl.mfeTicks, pnl.mfeDollars),
    movementLine('MAE', pnl.maePoints, pnl.maeTicks, pnl.maeDollars),
    movementLine('T1', pnl.t1Points, pnl.t1Ticks, pnl.t1Dollars),
    movementLine('T2', pnl.t2Points, pnl.t2Ticks, pnl.t2Dollars),
    movementLine('Adverse', pnl.adversePoints, pnl.adverseTicks, pnl.adverseDollars),
    movementLine('First Meaningful Move', pnl.firstMeaningfulMovePoints, pnl.firstMeaningfulMoveTicks, pnl.firstMeaningfulMoveDollars),
    movementLine('Hypothetical Outcome', pnl.hypotheticalOutcomePoints, pnl.hypotheticalOutcomeTicks, pnl.hypotheticalOutcomeDollars, 'Not available - no defined hypothetical exit model.'),
    `- Status: ${pnl.status}`,
    `- Note: ${pnl.note}`,
  ];
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
      ? Object.entries(summary.labelCounts).map(([label, count]) => {
        const metadata = getHumanReviewLabelMetadata(label);
        return `- ${label}: ${count}; category=${metadata.category}; formalLedgerEligible=${metadata.formalLedgerEligible ? 'yes' : 'no'}; countsTowardCandidateGates=${metadata.countsTowardCandidateGates ? 'yes' : 'no'}`;
      })
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
    '- Do not change Model 1 or Raid Reclaim Reversal gates from this review pack.',
    '- Do not promote research concepts into executable models.',
    '- Human review may queue future discussion only.',
  ].join('\n');
}
