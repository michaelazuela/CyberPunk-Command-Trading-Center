import { createHash } from 'node:crypto';
import type { ResearchOutcomeMathReport, ResearchCandidateOutcome } from './researchOutcomeMathAgent';
import type { ResearchReviewSample, ResearchSampleReviewPack, ResearchHumanInspectionLabel } from './researchSampleReviewAgent';

export type ResearchReviewButtonLabel = ResearchHumanInspectionLabel;

export interface ResearchDiscordButton {
  type: 2;
  style: 1 | 2 | 3 | 4;
  label: string;
  custom_id: string;
}

export interface ResearchDiscordActionRow {
  type: 1;
  components: ResearchDiscordButton[];
}

export interface ResearchDiscordMessagePayload {
  content: string;
  components: ResearchDiscordActionRow[];
  allowed_mentions: { parse: [] };
}

export interface ResearchDiscordQueueItem {
  sample: ResearchReviewSample;
  outcome: ResearchCandidateOutcome | null;
  payload: ResearchDiscordMessagePayload;
}

export interface ResearchDiscordQueueInput {
  reviewPack: ResearchSampleReviewPack;
  reviewPackPath: string;
  outcomeReport?: ResearchOutcomeMathReport | null;
  limit?: number;
  skipSampleIds?: string[] | Set<string>;
  buttonMode?: 'legacy_research_review' | 'future_model_candidate_review';
}

export interface ResearchDiscordReviewStateEntry {
  packHash: string;
  reviewPackPath: string;
  sampleId: string;
  discordMessageId: string | null;
  discordChannelId: string;
  postedAt: string;
  labelOptions: ResearchReviewButtonLabel[];
  advisoryOnly: true;
  reviewed: boolean;
  reviewedAt?: string;
  reviewedBy?: string;
  selectedLabel?: ResearchReviewButtonLabel;
  reviewedPackPath?: string;
  postedTextOnly?: boolean;
  chartWithheld?: boolean;
  chartWithheldReason?: string;
}

export interface ResearchDiscordReviewState {
  reportType: 'research_discord_review_state';
  updatedAt: string;
  entries: ResearchDiscordReviewStateEntry[];
}

export interface ResearchDiscordStateSummary {
  statePath: string;
  totalPostedSamples: number;
  reviewedSamples: number;
  pendingPostedSamples: number;
  packHashes: string[];
  staleMissingPackWarnings: string[];
  advisoryOnlyConfirmed: boolean;
}

export const RESEARCH_REVIEW_LABELS: ResearchReviewButtonLabel[] = [
  'keep_advisory',
  'reject',
  'possible_model1_mapping_review',
  'possible_turtle_soup_mapping_review',
  'human_rule_review_queue',
  'new_model_candidate_review',
  'insufficient_context',
];

export const PRICE_ACTION_REVIEW_LABELS: ResearchReviewButtonLabel[] = [
  'approved_for_future_model_candidate_review',
  'not_approved_for_future_model_candidate_review',
];

const LABEL_TEXT: Record<ResearchReviewButtonLabel, string> = {
  keep_advisory: 'Keep Advisory',
  reject: 'Reject',
  possible_model1_mapping_review: 'Model 1 Review',
  possible_turtle_soup_mapping_review: 'Turtle Soup Review',
  human_rule_review_queue: 'Human Rule Review Queue',
  new_model_candidate_review: 'New Model Candidate',
  approved_for_future_model_candidate_review: 'Approved',
  not_approved_for_future_model_candidate_review: 'Not Approved',
  insufficient_context: 'Insufficient Context',
};

const BUTTON_STYLE: Record<ResearchReviewButtonLabel, 1 | 2 | 3 | 4> = {
  keep_advisory: 2,
  reject: 4,
  possible_model1_mapping_review: 1,
  possible_turtle_soup_mapping_review: 1,
  human_rule_review_queue: 3,
  new_model_candidate_review: 3,
  approved_for_future_model_candidate_review: 3,
  not_approved_for_future_model_candidate_review: 4,
  insufficient_context: 2,
};

const RECOMMENDATION_TEXT: Record<ResearchReviewButtonLabel, string> = {
  keep_advisory: 'Recommended: Keep Advisory',
  reject: 'Recommended: Reject',
  possible_model1_mapping_review: 'Recommended: Queue for Model 1 Review',
  possible_turtle_soup_mapping_review: 'Recommended: Queue for Turtle Soup Review',
  human_rule_review_queue: 'Recommended: Human Rule Review Queue',
  new_model_candidate_review: 'Recommended: New Model Candidate Review',
  approved_for_future_model_candidate_review: 'Human review: Approved for future model-candidate review',
  not_approved_for_future_model_candidate_review: 'Human review: Not approved for future model-candidate review',
  insufficient_context: 'Recommended: Insufficient Context',
};

const EXECUTION_ORIENTED_BUTTON_TEXT = /\b(approve trade|execute|take trade|valid setup|go live|greenlight|buy|sell)\b/i;
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
  'tradeAlerts',
  'ragPayload',
  'journalPayload',
]);

export function createResearchReviewPackHash(reviewPackPath: string, pack: ResearchSampleReviewPack): string {
  const stable = JSON.stringify({
    path: reviewPackPath,
    generatedAt: pack.generatedAt,
    instrument: pack.instrument,
    sampleIds: pack.samples.map((sample) => sample.sampleId),
  });
  return createHash('sha256').update(stable).digest('hex').slice(0, 10);
}

function forbiddenPaths(value: unknown, path = 'value'): string[] {
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

export function assertNoExecutableResearchDiscordFields(value: unknown): void {
  const paths = forbiddenPaths(value);
  if (paths.length) throw new Error(`Research Discord review payload contains prohibited executable field(s): ${paths.join(', ')}`);
}

function assertSampleBoundary(sample: ResearchReviewSample): void {
  const boundary = sample.agentApprovalBoundary;
  if (
    (sample as { advisoryOnly?: boolean }).advisoryOnly === false ||
    !boundary ||
    boundary.agentApprovesTrade !== false ||
    boundary.agentChangesRules !== false ||
    boundary.agentCreatesEntry !== false ||
    boundary.agentCreatesTargets !== false ||
    boundary.agentPromotesModel !== false
  ) {
    throw new Error(`Sample ${sample.sampleId} does not preserve the research-only approval boundary.`);
  }
}

function clip(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function outcomeForSample(sample: ResearchReviewSample, outcomeReport?: ResearchOutcomeMathReport | null): ResearchCandidateOutcome | null {
  if (!outcomeReport) return null;
  return outcomeReport.candidateOutcomes.find((outcome) =>
    outcome.concept === sample.concept &&
    outcome.date === sample.date &&
    outcome.time === sample.time &&
    String(outcome.direction || '').toUpperCase() === String(sample.direction || '').toUpperCase()
  ) || null;
}

export function buildResearchReviewCustomId(packHash: string, sampleId: string, label: ResearchReviewButtonLabel): string {
  const compactSampleId = sampleId.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 42);
  const customIdLabel = label === 'approved_for_future_model_candidate_review'
    ? 'approved'
    : label === 'not_approved_for_future_model_candidate_review'
      ? 'not_approved'
      : label;
  const customId = `research_review|${packHash}|${compactSampleId}|${customIdLabel}`;
  if (customId.length > 100) throw new Error(`Research review custom_id is too long for Discord: ${customId.length}`);
  return customId;
}

export function buildResearchReviewComponents(packHash: string, sampleId: string): ResearchDiscordActionRow[] {
  return buildResearchReviewComponentsForLabels(packHash, sampleId, RESEARCH_REVIEW_LABELS);
}

export function buildPriceActionReviewComponents(packHash: string, sampleId: string): ResearchDiscordActionRow[] {
  return buildResearchReviewComponentsForLabels(packHash, sampleId, PRICE_ACTION_REVIEW_LABELS);
}

function buildResearchReviewComponentsForLabels(packHash: string, sampleId: string, labels: ResearchReviewButtonLabel[]): ResearchDiscordActionRow[] {
  const buttons = labels.map((label): ResearchDiscordButton => ({
    type: 2,
    style: BUTTON_STYLE[label],
    label: LABEL_TEXT[label],
    custom_id: buildResearchReviewCustomId(packHash, sampleId, label),
  }));
  if (buttons.length <= 5) return [{ type: 1, components: buttons }];
  return [
    { type: 1, components: buttons.slice(0, 5) },
    { type: 1, components: buttons.slice(5) },
  ];
}

function outcomeLines(outcome: ResearchCandidateOutcome | null): string[] {
  if (!outcome) return ['Outcome math: not attached'];
  const overlay = outcome.hypotheticalOutcomeOverlay;
  return [
    'Outcome math:',
    `- Max favorable excursion: ${outcome.maxFavorableExcursionPoints ?? 'n/a'}`,
    `- Max adverse excursion: ${outcome.maxAdverseExcursionPoints ?? 'n/a'}`,
    `- thresholdOneTouched: ${outcome.thresholdOneTouched ?? 'n/a'}`,
    `- thresholdTwoTouched: ${outcome.thresholdTwoTouched ?? 'n/a'}`,
    `- adverseThresholdTouched: ${outcome.adverseThresholdTouched ?? 'n/a'}`,
    `- firstMeaningfulMove: ${outcome.firstMeaningfulMove}`,
    `- outcomeClassification: ${outcome.outcomeClassification}`,
    ...(overlay ? [
      '',
      'Hypothetical research overlay:',
      `Reference price: ${overlay.hypotheticalReferencePrice ?? 'n/a'}`,
      `Favorable threshold one: ${overlay.hypotheticalThresholdOne ?? 'n/a'}`,
      `Favorable threshold two: ${overlay.hypotheticalThresholdTwo ?? 'n/a'}`,
      `Adverse invalidation reference: ${overlay.hypotheticalInvalidationReference ?? 'n/a'}`,
      `First resolved event: ${overlay.firstResolvedEvent}`,
      `Hypothetical outcome: ${overlay.hypotheticalOutcomeLabel}`,
      '',
      'Research-only. These are not entries, stops, or targets. This does not approve execution.',
    ] : []),
  ];
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Unavailable';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'Unavailable';
  return String(value);
}

function reviewWorkedLabel(outcome: ResearchCandidateOutcome | null, invalidOverlay = false): 'Yes' | 'No' | 'Partial' | 'Inconclusive' | 'Invalid overlay' {
  if (invalidOverlay) return 'Invalid overlay';
  if (!outcome) return 'Inconclusive';
  const classification = outcome.outcomeClassification || '';
  const overlayOutcome = outcome.hypotheticalOutcomeOverlay?.hypotheticalOutcomeLabel || '';
  if (/insufficient|missing|inconclusive|ambiguous/i.test(`${classification} ${overlayOutcome}`)) return 'Inconclusive';
  if (outcome.thresholdTwoTouched || /threshold_two|t2|favorable_continuation/i.test(`${classification} ${overlayOutcome}`)) return 'Yes';
  if (outcome.thresholdOneTouched || /threshold_one|partial/i.test(`${classification} ${overlayOutcome}`)) return 'Partial';
  if (outcome.adverseThresholdTouched || outcome.firstMeaningfulMove === 'adverse' || /adverse|stop/i.test(`${classification} ${overlayOutcome}`)) return 'No';
  return 'Inconclusive';
}

function reviewResultLabel(outcome: ResearchCandidateOutcome | null, invalidOverlay = false): string {
  if (invalidOverlay) return 'Invalid overlay';
  if (!outcome) return 'Missing data';
  const firstEvent = outcome.hypotheticalOutcomeOverlay?.firstResolvedEvent || '';
  const classification = outcome.outcomeClassification || '';
  if (/insufficient|missing/i.test(`${firstEvent} ${classification}`)) return 'Missing data';
  if (/inconclusive|ambiguous/i.test(`${firstEvent} ${classification}`)) return 'Inconclusive';
  if (/no[_ -]?trigger/i.test(`${firstEvent} ${classification}`)) return 'No trigger';
  if (/threshold_two|t2/i.test(firstEvent) || outcome.thresholdTwoTouched) return 'T2 hit';
  if (/threshold_one|t1/i.test(firstEvent) || outcome.thresholdOneTouched) return 'T1 hit';
  if (/adverse|stop/i.test(firstEvent) || outcome.adverseThresholdTouched || outcome.firstMeaningfulMove === 'adverse') return 'Stop first';
  return 'Inconclusive';
}

function candidateEvidenceRecommendation(label: ResearchHumanInspectionLabel): string {
  if (label === 'new_model_candidate_review' || label === 'approved_for_future_model_candidate_review') {
    return 'Useful candidate evidence';
  }
  if (label === 'reject' || label === 'not_approved_for_future_model_candidate_review') {
    return 'Not useful candidate evidence';
  }
  if (label === 'insufficient_context') return 'Inconclusive';
  return 'Needs more samples';
}

export function buildPriceActionReviewMessageContent(
  sample: ResearchReviewSample,
  outcome: ResearchCandidateOutcome | null,
  contract: string | null = null,
  invalidOverlayReason: string | null = null,
): string {
  const overlay = outcome?.hypotheticalOutcomeOverlay || null;
  const agentView = clip(sample.agentReason || sample.summary || 'Research-only review sample awaiting human inspection.', 150);
  const invalidOverlay = Boolean(invalidOverlayReason);
  const content = [
    `[PRICE ACTION REVIEW] ${sample.sampleId}`,
    '',
    `Concept: ${sample.conceptTitle}`,
    `Date/Time: ${sample.date} ${sample.time || 'time pending'}`,
    `Direction: ${sample.direction}`,
    `Contract: ${contract || 'detected contract pending'}`,
    '',
    'Hypothetical Overlay:',
    `Entry: ${displayValue(overlay?.hypotheticalReferencePrice ?? outcome?.referencePrice)}`,
    `Stop Loss: ${displayValue(overlay?.hypotheticalInvalidationReference)}`,
    `T1: ${displayValue(overlay?.hypotheticalThresholdOne)}`,
    `T2: ${displayValue(overlay?.hypotheticalThresholdTwo)}`,
    '',
    'Outcome Review:',
    `Would it have worked?: ${reviewWorkedLabel(outcome, invalidOverlay)}`,
    `Result: ${reviewResultLabel(outcome, invalidOverlay)}`,
    `Agent view: ${agentView}`,
    ...(invalidOverlayReason ? [`Chart warning: ${invalidOverlayReason}`] : []),
    '',
    'Agent Recommendation:',
    candidateEvidenceRecommendation(sample.agentInspectionLabel),
    '',
    'Human Action:',
    'Approve only if this is useful evidence for future model-candidate review.',
    '',
    'Research-only. This does not approve execution, change rules, or create trades.',
  ].join('\n');
  return content.length <= 1900
    ? content
    : `${content.slice(0, 1840).trim()}\nFull sample context remains in the local review pack.\nResearch-only. This does not approve execution, change rules, or create trades.`;
}

export function buildResearchReviewMessagePayload(
  sample: ResearchReviewSample,
  packHash: string,
  outcome: ResearchCandidateOutcome | null,
  instrument = 'MES',
  buttonMode: ResearchDiscordQueueInput['buttonMode'] = 'legacy_research_review',
): ResearchDiscordMessagePayload {
  assertSampleBoundary(sample);
  const recommendation = RECOMMENDATION_TEXT[sample.agentInspectionLabel] || 'Recommended: Keep Advisory';
  const content = buttonMode === 'future_model_candidate_review' ? buildPriceActionReviewMessageContent(sample, outcome) : [
    `[RESEARCH SAMPLE REVIEW] ${sample.sampleId}`,
    `Symbol: ${instrument}`,
    `Concept: ${sample.conceptTitle}`,
    `Date/time: ${sample.date} ${sample.time || 'time pending'}`,
    `Direction/window: ${sample.direction} / ${sample.window || 'unspecified'}`,
    `Classification: ${sample.classification}`,
    `Summary: ${clip(sample.summary, 280)}`,
    `Why advisory-only: ${clip(sample.whyAdvisoryOnly, 280)}`,
    recommendation,
    `Agent label: ${sample.agentInspectionLabel}`,
    `Agent confidence: ${sample.agentConfidence}`,
    `Agent reason: ${clip(sample.agentReason, 280)}`,
    `Agent concerns: ${clip(sample.agentConcerns.join(' | '), 280)}`,
    `Suggested human action: ${recommendation.replace(/^Recommended: /, '')}`,
    `Source review path: ${clip(sample.sampleSourceReportPath, 220)}`,
    ...outcomeLines(outcome),
    '',
    'Research-only. This does not approve execution, change rules, or create trades.',
  ].join('\n');
  const payload: ResearchDiscordMessagePayload = {
    content: content.length <= 1900 ? content : `${content.slice(0, 1840).trim()}\nFull sample context remains in the local review pack.\nResearch-only. This does not approve execution, change rules, or create trades.`,
    components: buttonMode === 'future_model_candidate_review'
      ? buildPriceActionReviewComponents(packHash, sample.sampleId)
      : buildResearchReviewComponents(packHash, sample.sampleId),
    allowed_mentions: { parse: [] },
  };
  assertNoExecutableResearchDiscordFields(payload);
  if (payload.components.some((row) => row.components.some((button) => EXECUTION_ORIENTED_BUTTON_TEXT.test(button.label)))) {
    throw new Error('Research Discord review payload contains execution-oriented button wording.');
  }
  return payload;
}

export function buildResearchDiscordReviewQueue(input: ResearchDiscordQueueInput): {
  packHash: string;
  pendingSamplesFound: number;
  selectedSamples: number;
  items: ResearchDiscordQueueItem[];
} {
  assertNoExecutableResearchDiscordFields(input.reviewPack.samples);
  const packHash = createResearchReviewPackHash(input.reviewPackPath, input.reviewPack);
  const skipSampleIds = new Set(input.skipSampleIds ? [...input.skipSampleIds] : []);
  const pending = input.reviewPack.samples.filter((sample) => sample.humanInspectionLabel === null && !skipSampleIds.has(sample.sampleId));
  const selected = pending.slice(0, Math.max(0, input.limit ?? pending.length));
  const items = selected.map((sample) => {
    const outcome = outcomeForSample(sample, input.outcomeReport);
    return {
      sample,
      outcome,
      payload: buildResearchReviewMessagePayload(sample, packHash, outcome, input.reviewPack.instrument, input.buttonMode),
    };
  });
  return {
    packHash,
    pendingSamplesFound: pending.length,
    selectedSamples: selected.length,
    items,
  };
}

export function emptyResearchDiscordReviewState(): ResearchDiscordReviewState {
  return {
    reportType: 'research_discord_review_state',
    updatedAt: new Date().toISOString(),
    entries: [],
  };
}

export function appendResearchDiscordReviewState(
  state: ResearchDiscordReviewState,
  entries: ResearchDiscordReviewStateEntry[],
  updatedAt = new Date().toISOString(),
): ResearchDiscordReviewState {
  const byKey = new Map<string, ResearchDiscordReviewStateEntry>();
  for (const entry of state.entries || []) byKey.set(`${entry.packHash}|${entry.sampleId}`, entry);
  for (const entry of entries) byKey.set(`${entry.packHash}|${entry.sampleId}`, entry);
  return {
    reportType: 'research_discord_review_state',
    updatedAt,
    entries: [...byKey.values()].sort((a, b) => `${a.packHash}|${a.sampleId}`.localeCompare(`${b.packHash}|${b.sampleId}`)),
  };
}

export function createResearchDiscordStateEntry(args: {
  packHash: string;
  reviewPackPath: string;
  sampleId: string;
  discordMessageId: string | null;
  discordChannelId: string;
  postedAt?: string;
  labelOptions?: ResearchReviewButtonLabel[];
  postedTextOnly?: boolean;
  chartWithheld?: boolean;
  chartWithheldReason?: string;
}): ResearchDiscordReviewStateEntry {
  return {
    packHash: args.packHash,
    reviewPackPath: args.reviewPackPath,
    sampleId: args.sampleId,
    discordMessageId: args.discordMessageId,
    discordChannelId: args.discordChannelId,
    postedAt: args.postedAt || new Date().toISOString(),
    labelOptions: args.labelOptions || RESEARCH_REVIEW_LABELS,
    advisoryOnly: true,
    reviewed: false,
    ...(args.postedTextOnly ? { postedTextOnly: true } : {}),
    ...(args.chartWithheld ? { chartWithheld: true } : {}),
    ...(args.chartWithheldReason ? { chartWithheldReason: args.chartWithheldReason } : {}),
  };
}

export function summarizeResearchDiscordReviewState(statePath: string, state: ResearchDiscordReviewState, existingPackPaths = new Set<string>()): ResearchDiscordStateSummary {
  const entries = state.entries || [];
  const staleMissingPackWarnings = [...new Set(entries.map((entry) => entry.reviewPackPath))]
    .filter((packPath) => existingPackPaths.size > 0 && !existingPackPaths.has(packPath))
    .map((packPath) => `Review pack not found: ${packPath}`);
  return {
    statePath,
    totalPostedSamples: entries.length,
    reviewedSamples: entries.filter((entry) => entry.reviewed).length,
    pendingPostedSamples: entries.filter((entry) => !entry.reviewed).length,
    packHashes: [...new Set(entries.map((entry) => entry.packHash))].sort(),
    staleMissingPackWarnings,
    advisoryOnlyConfirmed: entries.every((entry) => entry.advisoryOnly === true),
  };
}
