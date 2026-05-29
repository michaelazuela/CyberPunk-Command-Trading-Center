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
  reviewed: false;
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
  'insufficient_context',
];

const LABEL_TEXT: Record<ResearchReviewButtonLabel, string> = {
  keep_advisory: 'Keep Advisory',
  reject: 'Reject',
  possible_model1_mapping_review: 'Model 1 Review',
  possible_turtle_soup_mapping_review: 'Turtle Soup Review',
  human_rule_review_queue: 'Human Rule Review Queue',
  insufficient_context: 'Insufficient Context',
};

const BUTTON_STYLE: Record<ResearchReviewButtonLabel, 1 | 2 | 3 | 4> = {
  keep_advisory: 2,
  reject: 4,
  possible_model1_mapping_review: 1,
  possible_turtle_soup_mapping_review: 1,
  human_rule_review_queue: 3,
  insufficient_context: 2,
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
    outcome.candidateId === sample.sampleId ||
    (outcome.concept === sample.concept && outcome.date === sample.date && outcome.time === sample.time)
  ) || null;
}

export function buildResearchReviewCustomId(packHash: string, sampleId: string, label: ResearchReviewButtonLabel): string {
  const compactSampleId = sampleId.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 42);
  const customId = `research_review|${packHash}|${compactSampleId}|${label}`;
  if (customId.length > 100) throw new Error(`Research review custom_id is too long for Discord: ${customId.length}`);
  return customId;
}

export function buildResearchReviewComponents(packHash: string, sampleId: string): ResearchDiscordActionRow[] {
  const buttons = RESEARCH_REVIEW_LABELS.map((label): ResearchDiscordButton => ({
    type: 2,
    style: BUTTON_STYLE[label],
    label: LABEL_TEXT[label],
    custom_id: buildResearchReviewCustomId(packHash, sampleId, label),
  }));
  return [
    { type: 1, components: buttons.slice(0, 5) },
    { type: 1, components: buttons.slice(5) },
  ];
}

function outcomeLines(outcome: ResearchCandidateOutcome | null): string[] {
  if (!outcome) return ['Outcome math: not attached'];
  return [
    'Outcome math:',
    `- Max favorable excursion: ${outcome.maxFavorableExcursionPoints ?? 'n/a'}`,
    `- Max adverse excursion: ${outcome.maxAdverseExcursionPoints ?? 'n/a'}`,
    `- thresholdOneTouched: ${outcome.thresholdOneTouched ?? 'n/a'}`,
    `- thresholdTwoTouched: ${outcome.thresholdTwoTouched ?? 'n/a'}`,
    `- adverseThresholdTouched: ${outcome.adverseThresholdTouched ?? 'n/a'}`,
    `- firstMeaningfulMove: ${outcome.firstMeaningfulMove}`,
    `- outcomeClassification: ${outcome.outcomeClassification}`,
  ];
}

export function buildResearchReviewMessagePayload(sample: ResearchReviewSample, packHash: string, outcome: ResearchCandidateOutcome | null): ResearchDiscordMessagePayload {
  assertSampleBoundary(sample);
  const content = [
    `[RESEARCH SAMPLE REVIEW] ${sample.sampleId}`,
    `Concept: ${sample.conceptTitle}`,
    `Date/time: ${sample.date} ${sample.time || 'time pending'}`,
    `Direction/window: ${sample.direction} / ${sample.window || 'unspecified'}`,
    `Classification: ${sample.classification}`,
    `Summary: ${clip(sample.summary, 280)}`,
    `Why advisory-only: ${clip(sample.whyAdvisoryOnly, 280)}`,
    `Agent label: ${sample.agentInspectionLabel}`,
    `Agent confidence: ${sample.agentConfidence}`,
    `Agent reason: ${clip(sample.agentReason, 280)}`,
    `Agent concerns: ${clip(sample.agentConcerns.join(' | '), 280)}`,
    ...outcomeLines(outcome),
    '',
    'Research-only. This does not approve execution.',
  ].join('\n');
  const payload: ResearchDiscordMessagePayload = {
    content: content.length <= 1900 ? content : `${content.slice(0, 1840).trim()}\nFull sample context remains in the local review pack.\nResearch-only. This does not approve execution.`,
    components: buildResearchReviewComponents(packHash, sample.sampleId),
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
  const pending = input.reviewPack.samples.filter((sample) => sample.humanInspectionLabel === null);
  const selected = pending.slice(0, Math.max(0, input.limit ?? pending.length));
  const items = selected.map((sample) => {
    const outcome = outcomeForSample(sample, input.outcomeReport);
    return {
      sample,
      outcome,
      payload: buildResearchReviewMessagePayload(sample, packHash, outcome),
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
}): ResearchDiscordReviewStateEntry {
  return {
    packHash: args.packHash,
    reviewPackPath: args.reviewPackPath,
    sampleId: args.sampleId,
    discordMessageId: args.discordMessageId,
    discordChannelId: args.discordChannelId,
    postedAt: args.postedAt || new Date().toISOString(),
    labelOptions: RESEARCH_REVIEW_LABELS,
    advisoryOnly: true,
    reviewed: false,
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
