import fs from 'node:fs';
import path from 'node:path';
import {
  applyHumanReviewToPack,
  assertNoExecutableReviewFields,
  isHumanReviewLabel,
  renderHumanReviewMarkdown,
  type HumanReviewLabel,
} from './researchHumanReviewCaptureAgent';
import type {
  ResearchDiscordActionRow,
  ResearchDiscordReviewState,
  ResearchDiscordReviewStateEntry,
} from './researchDiscordReviewQueueAgent';
import { emptyResearchDiscordReviewState } from './researchDiscordReviewQueueAgent';
import type { ResearchReviewSample, ResearchSampleReviewPack } from './researchSampleReviewAgent';

export interface ResearchDiscordReviewCustomId {
  namespace: 'research_review';
  packHash: string;
  sampleId: string;
  label: HumanReviewLabel;
}

export interface ResearchDiscordInteractionUser {
  id: string;
  username?: string | null;
}

export interface ResearchDiscordInteractionContext {
  customId: string;
  statePath: string;
  user: ResearchDiscordInteractionUser;
  channelId: string | null;
  messageId: string | null;
  allowedUserIds?: string[];
  reviewedAt?: string;
  messageContent?: string | null;
  messageComponents?: ResearchDiscordActionRow[];
}

export interface ResearchDiscordInteractionResult {
  ok: boolean;
  status: 'reviewed' | 'already_reviewed' | 'rejected';
  sampleId: string | null;
  selectedLabel: HumanReviewLabel | null;
  reviewedPackPath: string | null;
  reviewedMarkdownPath: string | null;
  responseContent: string;
  ephemeral: true;
  updatedState?: ResearchDiscordReviewState;
  messageUpdate?: {
    content: string;
    components?: ResearchDiscordActionRow[];
  };
}

const PROHIBITED_EXECUTABLE_KEYS = new Set([
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
  'orderInstruction',
  'tradeAlerts',
  'tradeAlert',
  'alerts',
  'outcomeButtons',
  'ragPayload',
  'journalPayload',
]);

export function parseResearchDiscordReviewCustomId(customId: string): ResearchDiscordReviewCustomId {
  const parts = customId.split('|');
  if (parts.length !== 4 || parts[0] !== 'research_review') {
    throw new Error('Unsupported Discord research review custom_id namespace.');
  }
  const [, packHash, sampleId, label] = parts;
  if (!packHash || !sampleId) throw new Error('Discord research review custom_id is missing packHash or sampleId.');
  if (!isHumanReviewLabel(label)) throw new Error(`Unsupported Discord research review label: ${label}`);
  return {
    namespace: 'research_review',
    packHash,
    sampleId,
    label,
  };
}

function readJsonFile<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch (error) {
    const missing = typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'ENOENT';
    if (missing) return fallback;
    throw error;
  }
}

function writeJsonFile(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function isResearchSampleReviewPack(value: unknown): value is ResearchSampleReviewPack {
  return Boolean(
    value &&
    typeof value === 'object' &&
    (value as ResearchSampleReviewPack).reportType === 'research_sample_review_pack' &&
    Array.isArray((value as ResearchSampleReviewPack).samples),
  );
}

function loadReviewPack(file: string): ResearchSampleReviewPack {
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
  if (!isResearchSampleReviewPack(parsed)) throw new Error(`Review pack is not valid: ${file}`);
  return parsed;
}

function reviewedPaths(reviewPackPath: string): { jsonFile: string; markdownFile: string } {
  const parsed = path.parse(path.resolve(reviewPackPath));
  const ext = parsed.ext || '.json';
  const jsonFile = path.join(parsed.dir, `${parsed.name}.reviewed${ext}`);
  return {
    jsonFile,
    markdownFile: jsonFile.replace(/\.json$/i, '.md'),
  };
}

function activeReviewPackCandidates(primaryReviewPackPath: string): string[] {
  const resolved = path.resolve(primaryReviewPackPath);
  const parsed = path.parse(resolved);
  const candidates = [resolved];
  if (/\.reviewed$/i.test(parsed.name)) {
    candidates.push(path.join(parsed.dir, `${parsed.name.replace(/\.reviewed$/i, '')}${parsed.ext || '.json'}`));
  } else {
    candidates.push(path.join(parsed.dir, `${parsed.name}.reviewed${parsed.ext || '.json'}`));
  }
  try {
    const activePacks = fs.readdirSync(parsed.dir)
      .filter((name) => /^research-sample-review-.*\.json$/i.test(name))
      .map((name) => path.join(parsed.dir, name));
    candidates.push(...activePacks);
  } catch {
    // Missing folders are handled by the normal candidate load path.
  }
  return [...new Set(candidates)];
}

function resolveReviewPackForSample(reviewPackPath: string, sampleId: string): {
  reviewPackPath: string;
  pack: ResearchSampleReviewPack;
  sample: ResearchReviewSample;
} | null {
  for (const candidatePath of activeReviewPackCandidates(reviewPackPath)) {
    if (!fs.existsSync(candidatePath)) continue;
    const pack = loadReviewPack(candidatePath);
    assertPackBoundaryAllowsLegacyAdvisoryOnly(pack);
    const sample = pack.samples.find((item) => item.sampleId === sampleId);
    console.info(`[research-discord-interactions] lookup pack=${candidatePath}; sampleId=${sampleId}; found=${sample ? 'yes' : 'no'}`);
    if (sample) return { reviewPackPath: candidatePath, pack, sample };
  }
  return null;
}

function findStateEntry(
  state: ResearchDiscordReviewState,
  customId: ResearchDiscordReviewCustomId,
): ResearchDiscordReviewStateEntry | null {
  return state.entries.find((entry) =>
    entry.packHash === customId.packHash &&
    (entry.sampleId === customId.sampleId || entry.sampleId.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 42) === customId.sampleId)
  ) || null;
}

function allowedUserIdsFromInput(ids: string[] | undefined): Set<string> {
  return new Set((ids || []).map((id) => id.trim()).filter(Boolean));
}

export function validateResearchDiscordInteractionUser(userId: string, allowedUserIds?: string[]): void {
  const allowed = allowedUserIdsFromInput(allowedUserIds);
  if (allowed.size > 0 && !allowed.has(userId)) {
    throw new Error('Discord user is not authorized for research review interactions.');
  }
}

export function researchOnlySafetyFailureResponse(): string {
  return 'Review rejected: sample failed research-only safety validation. No review was written.\nResearch-only. This does not approve execution.';
}

function assertResearchPackBoundary(pack: ResearchSampleReviewPack): void {
  if (
    pack.approvalBoundary.sampleReviewApprovesTrade !== false ||
    pack.approvalBoundary.sampleReviewChangesRules !== false ||
    pack.approvalBoundary.sampleReviewCreatesEntry !== false ||
    pack.approvalBoundary.sampleReviewCreatesTargets !== false ||
    pack.approvalBoundary.sampleReviewPromotesModel !== false ||
    pack.approvalBoundary.sampleReviewWritesRagMemory !== false
  ) {
    throw new Error('Review pack approval boundary is not research-only.');
  }
}

function assertResearchOnlySampleBoundary(sample: ResearchReviewSample): void {
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
    throw new Error(`Sample ${sample.sampleId} does not preserve the research-only boundary.`);
  }
}

function assertPackBoundaryAllowsLegacyAdvisoryOnly(pack: ResearchSampleReviewPack): void {
  assertNoExecutableReviewFields(pack);
  assertNoExecutableDiscordInteractionFields(pack.samples);
  assertResearchPackBoundary(pack);
  for (const sample of pack.samples) assertResearchOnlySampleBoundary(sample);
}

function prohibitedPaths(value: unknown, pathName = 'value'): string[] {
  if (!value || typeof value !== 'object') return [];
  const paths: string[] = [];
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const next = `${pathName}.${key}`;
    if (PROHIBITED_EXECUTABLE_KEYS.has(key)) paths.push(next);
    if (key === 'executionApproved' && child !== false) paths.push(next);
    paths.push(...prohibitedPaths(child, next));
  }
  return paths;
}

export function assertNoExecutableDiscordInteractionFields(value: unknown): void {
  const paths = prohibitedPaths(value);
  if (paths.length) throw new Error(`Research Discord interaction contains prohibited executable field(s): ${paths.join(', ')}`);
}

function reviewerName(user: ResearchDiscordInteractionUser): string {
  return user.username?.trim() || user.id;
}

function reviewNotes(input: ResearchDiscordInteractionContext, label: HumanReviewLabel): string {
  return [
    `Discord user ID: ${input.user.id}`,
    `Discord username: ${input.user.username || 'unavailable'}`,
    `Discord channel ID: ${input.channelId || 'unavailable'}`,
    `Discord message ID: ${input.messageId || 'unavailable'}`,
    `Selected label: ${label}`,
    'Advisory-only confirmation: reviewed sample remains research-only and does not approve execution.',
  ].join('\n');
}

function disabledComponents(components: ResearchDiscordActionRow[] | undefined): ResearchDiscordActionRow[] | undefined {
  if (!components) return undefined;
  return components.map((row) => ({
    ...row,
    components: row.components.map((button) => ({ ...button, disabled: true } as typeof button & { disabled: true })),
  }));
}

function response(sampleId: string | null, label: HumanReviewLabel | null, reviewedPath: string | null, status: ResearchDiscordInteractionResult['status'], reason?: string): string {
  if (status === 'reviewed') {
    return [
      `Sample reviewed: ${sampleId}`,
      `Selected label: ${label}`,
      `Reviewed output: ${reviewedPath}`,
      'Research-only. This does not approve execution.',
    ].join('\n');
  }
  if (status === 'already_reviewed') {
    return [
      `Sample already reviewed: ${sampleId}`,
      `Selected label: ${label}`,
      `Reviewed output: ${reviewedPath}`,
      'Research-only. This does not approve execution.',
    ].join('\n');
  }
  return [
    `Research review interaction rejected: ${reason || 'request could not be applied safely'}`,
    'Research-only. This does not approve execution.',
  ].join('\n');
}

function rejected(reason: string): ResearchDiscordInteractionResult {
  return {
    ok: false,
    status: 'rejected',
    sampleId: null,
    selectedLabel: null,
    reviewedPackPath: null,
    reviewedMarkdownPath: null,
    responseContent: response(null, null, null, 'rejected', reason),
    ephemeral: true,
  };
}

function rejectedSampleNotFound(sampleId: string): ResearchDiscordInteractionResult {
  return rejected(`Sample not found in active review pack JSON: ${sampleId}. No review was written.`);
}

function rejectedSafety(): ResearchDiscordInteractionResult {
  return {
    ok: false,
    status: 'rejected',
    sampleId: null,
    selectedLabel: null,
    reviewedPackPath: null,
    reviewedMarkdownPath: null,
    responseContent: researchOnlySafetyFailureResponse(),
    ephemeral: true,
  };
}

export function handleResearchDiscordReviewInteraction(input: ResearchDiscordInteractionContext): ResearchDiscordInteractionResult {
  try {
    return handleResearchDiscordReviewInteractionUnsafe(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[research-discord-interactions] safe rejection: ${message}`);
    if (/research-only|prohibited executable|executionApproved|canExecute|approval boundary|advisoryOnly|invalid agent approval boundary/i.test(message)) {
      return rejectedSafety();
    }
    return rejected('Unexpected research review interaction error. No review was written.');
  }
}

function handleResearchDiscordReviewInteractionUnsafe(input: ResearchDiscordInteractionContext): ResearchDiscordInteractionResult {
  let customId: ResearchDiscordReviewCustomId;
  try {
    customId = parseResearchDiscordReviewCustomId(input.customId);
    validateResearchDiscordInteractionUser(input.user.id, input.allowedUserIds);
  } catch (error) {
    return rejected(error instanceof Error ? error.message : String(error));
  }
  console.info(`[research-discord-interactions] customId=${customId.namespace}|${customId.packHash}|${customId.sampleId}|${customId.label}; action=${customId.label}; sampleId=${customId.sampleId}`);

  const statePath = path.resolve(input.statePath);
  const state = readJsonFile<ResearchDiscordReviewState>(statePath, emptyResearchDiscordReviewState());
  const entry = findStateEntry(state, customId);
  if (!entry) {
    console.warn(`[research-discord-interactions] rejection=no_state_mapping; sampleId=${customId.sampleId}`);
    return rejected('No local state mapping was found for this packHash and sampleId.');
  }

  if (entry.reviewed) {
    if (entry.reviewedBy === input.user.id && entry.selectedLabel === customId.label) {
      return {
        ok: true,
        status: 'already_reviewed',
        sampleId: entry.sampleId,
        selectedLabel: customId.label,
        reviewedPackPath: entry.reviewedPackPath || null,
        reviewedMarkdownPath: entry.reviewedPackPath ? entry.reviewedPackPath.replace(/\.json$/i, '.md') : null,
        responseContent: response(entry.sampleId, customId.label, entry.reviewedPackPath || null, 'already_reviewed'),
        ephemeral: true,
        updatedState: state,
      };
    }
    return rejected('Sample was already reviewed through Discord. Use CLI/manual override for changes.');
  }

  const resolved = resolveReviewPackForSample(entry.reviewPackPath, entry.sampleId);
  if (!resolved) {
    console.warn(`[research-discord-interactions] rejection=sample_not_found; sampleId=${entry.sampleId}; reviewPackPath=${path.resolve(entry.reviewPackPath)}`);
    return rejectedSampleNotFound(entry.sampleId);
  }
  const { reviewPackPath, pack, sample } = resolved;
  assertResearchOnlySampleBoundary(sample);

  if (customId.label === 'possible_model1_mapping_review' && sample.classification !== 'model1_overlap' && sample.model1Overlap !== true) {
    console.warn(`[research-discord-interactions] rejection=insufficient_model1_context; sampleId=${entry.sampleId}; reviewPackPath=${reviewPackPath}`);
    return rejected('Insufficient Context: this sample does not include Model 1 mapping context. No review was written.');
  }
  if (customId.label === 'possible_turtle_soup_mapping_review' && sample.classification !== 'turtle_soup_overlap' && sample.turtleSoupOverlap !== true) {
    console.warn(`[research-discord-interactions] rejection=insufficient_turtle_soup_context; sampleId=${entry.sampleId}; reviewPackPath=${reviewPackPath}`);
    return rejected('Insufficient Context: this sample does not include Turtle Soup mapping context. No review was written.');
  }

  const reviewedAt = input.reviewedAt || new Date().toISOString();
  const result = applyHumanReviewToPack({
    reviewPack: pack,
    sampleId: entry.sampleId,
    label: customId.label,
    confidence: 'medium',
    reviewer: reviewerName(input.user),
    reason: 'Selected in Discord research review queue.',
    notes: reviewNotes(input, customId.label),
    reviewedAt,
  });
  assertPackBoundaryAllowsLegacyAdvisoryOnly(result.updatedPack);
  assertNoExecutableDiscordInteractionFields(result.updatedPack.samples);

  const files = reviewedPaths(reviewPackPath);
  fs.mkdirSync(path.dirname(files.jsonFile), { recursive: true });
  fs.writeFileSync(files.jsonFile, `${JSON.stringify(result.updatedPack, null, 2)}\n`, 'utf8');
  fs.writeFileSync(files.markdownFile, `${renderHumanReviewMarkdown(result.updatedPack)}\n`, 'utf8');

  const updatedEntries = state.entries.map((item) =>
    item === entry
      ? {
        ...item,
        reviewed: true,
        reviewedAt,
        reviewedBy: input.user.id,
        selectedLabel: customId.label,
        reviewedPackPath: files.jsonFile,
      }
      : item
  );
  const updatedState: ResearchDiscordReviewState = {
    reportType: 'research_discord_review_state',
    updatedAt: reviewedAt,
    entries: updatedEntries,
  };
  writeJsonFile(statePath, updatedState);
  assertNoExecutableDiscordInteractionFields(updatedState);

  const reviewer = reviewerName(input.user);
  const reviewLine = `Reviewed: ${customId.label} by ${reviewer}\nResearch-only. This does not approve execution.`;
  const baseContent = input.messageContent?.trim();
  const messageUpdate = {
    content: baseContent ? `${baseContent}\n\n${reviewLine}` : reviewLine,
    components: disabledComponents(input.messageComponents),
  };

  return {
    ok: true,
    status: 'reviewed',
    sampleId: entry.sampleId,
    selectedLabel: customId.label,
    reviewedPackPath: files.jsonFile,
    reviewedMarkdownPath: files.markdownFile,
    responseContent: response(entry.sampleId, customId.label, files.jsonFile, 'reviewed'),
    ephemeral: true,
    updatedState,
    messageUpdate,
  };
}
