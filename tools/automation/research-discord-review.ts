import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  appendResearchDiscordReviewState,
  buildResearchDiscordReviewQueue,
  createResearchDiscordStateEntry,
  emptyResearchDiscordReviewState,
  summarizeResearchDiscordReviewState,
  type ResearchDiscordMessagePayload,
  type ResearchDiscordReviewState,
} from '../../src/agents/researchDiscordReviewQueueAgent';
import type { ResearchOutcomeMathReport } from '../../src/agents/researchOutcomeMathAgent';
import type { ResearchSampleReviewPack } from '../../src/agents/researchSampleReviewAgent';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

export interface ResearchDiscordReviewCliOptions {
  reviewPack: string | null;
  outcomeReport: string | null;
  publishPending: boolean;
  state: boolean;
  limit: number;
  dryRun: boolean;
  writeDryRunState: boolean;
  statePath: string;
  pretty: boolean;
  json: boolean;
}

export interface ResearchDiscordPublishResult {
  reviewPackPath: string;
  outcomeReportPath: string | null;
  channelId: string | null;
  pendingSamplesFound: number;
  samplesSelected: number;
  messagesPosted: number;
  dryRun: boolean;
  statePath: string;
  missingCredentials: string[];
  packHash: string;
  payloads: ResearchDiscordMessagePayload[];
  advisoryOnlyConfirmed: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_STATE_PATH = path.join(__dirname, 'research-review-packs', 'discord-review-state.json');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  return inline ? inline.slice(prefix.length) : null;
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function numberFlag(args: string[], flag: string, fallback: number): number {
  const value = readFlag(args, flag);
  if (value === null) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${flag} must be a non-negative number.`);
  return parsed;
}

export function parseResearchDiscordReviewArgs(args = process.argv.slice(2)): ResearchDiscordReviewCliOptions {
  return {
    reviewPack: readFlag(args, '--review-pack'),
    outcomeReport: readFlag(args, '--outcome-report'),
    publishPending: hasFlag(args, '--publish-pending'),
    state: hasFlag(args, '--state'),
    limit: numberFlag(args, '--limit', 30),
    dryRun: hasFlag(args, '--dry-run'),
    writeDryRunState: hasFlag(args, '--write-dry-run-state'),
    statePath: readFlag(args, '--state-path') || process.env.RESEARCH_REVIEW_STATE_PATH || DEFAULT_STATE_PATH,
    pretty: hasFlag(args, '--pretty') || !hasFlag(args, '--json'),
    json: hasFlag(args, '--json'),
  };
}

function isReviewPack(value: unknown): value is ResearchSampleReviewPack {
  return Boolean(
    value &&
    typeof value === 'object' &&
    (value as ResearchSampleReviewPack).reportType === 'research_sample_review_pack' &&
    Array.isArray((value as ResearchSampleReviewPack).samples),
  );
}

function isOutcomeReport(value: unknown): value is ResearchOutcomeMathReport {
  return Boolean(
    value &&
    typeof value === 'object' &&
    (value as ResearchOutcomeMathReport).reportType === 'research_outcome_math' &&
    Array.isArray((value as ResearchOutcomeMathReport).candidateOutcomes),
  );
}

async function loadJsonFile<T>(file: string, guard: (value: unknown) => value is T, label: string): Promise<T> {
  const resolved = path.resolve(file);
  const parsed = JSON.parse(await fs.readFile(resolved, 'utf8')) as unknown;
  if (!guard(parsed)) throw new Error(`${label} is not valid: ${resolved}`);
  return parsed;
}

async function readState(file: string): Promise<ResearchDiscordReviewState> {
  try {
    const parsed = JSON.parse(await fs.readFile(file, 'utf8')) as ResearchDiscordReviewState;
    if (parsed.reportType !== 'research_discord_review_state' || !Array.isArray(parsed.entries)) return emptyResearchDiscordReviewState();
    return parsed;
  } catch (error) {
    const missing = typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'ENOENT';
    if (missing) return emptyResearchDiscordReviewState();
    throw error;
  }
}

function writeState(file: string, state: ResearchDiscordReviewState): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function missingDiscordCredentials(): string[] {
  const missing: string[] = [];
  if (!process.env.RESEARCH_REVIEW_DISCORD_BOT_TOKEN) missing.push('RESEARCH_REVIEW_DISCORD_BOT_TOKEN');
  if (!process.env.RESEARCH_REVIEW_DISCORD_CHANNEL_ID) missing.push('RESEARCH_REVIEW_DISCORD_CHANNEL_ID');
  return missing;
}

async function postDiscordMessage(channelId: string, token: string, payload: ResearchDiscordMessagePayload): Promise<string> {
  const response = await fetch(`https://discord.com/api/v10/channels/${encodeURIComponent(channelId)}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Discord research review post failed (${response.status}): ${await response.text()}`);
  const parsed = await response.json() as { id?: string };
  if (!parsed.id) throw new Error('Discord research review post succeeded but did not return a message id.');
  return parsed.id;
}

export async function publishResearchDiscordReview(options: ResearchDiscordReviewCliOptions): Promise<ResearchDiscordPublishResult> {
  if (!options.reviewPack) throw new Error('--review-pack is required with --publish-pending.');
  const reviewPackPath = path.resolve(options.reviewPack);
  const reviewPack = await loadJsonFile(reviewPackPath, isReviewPack, 'Review pack');
  const outcomeReportPath = options.outcomeReport ? path.resolve(options.outcomeReport) : null;
  const outcomeReport = outcomeReportPath ? await loadJsonFile(outcomeReportPath, isOutcomeReport, 'Outcome report') : null;
  const queue = buildResearchDiscordReviewQueue({
    reviewPack,
    reviewPackPath,
    outcomeReport,
    limit: options.limit,
  });
  const missingCredentials = missingDiscordCredentials();
  if (!options.dryRun && missingCredentials.length) {
    throw new Error(`Missing Discord research review configuration: ${missingCredentials.join(', ')}. Use --dry-run to inspect payloads without posting.`);
  }
  const channelId = process.env.RESEARCH_REVIEW_DISCORD_CHANNEL_ID || null;
  const token = process.env.RESEARCH_REVIEW_DISCORD_BOT_TOKEN || null;
  let messagesPosted = 0;
  const stateEntries = [];
  for (const item of queue.items) {
    const messageId = options.dryRun ? null : await postDiscordMessage(channelId as string, token as string, item.payload);
    if (!options.dryRun) messagesPosted += 1;
    if (!options.dryRun || options.writeDryRunState) {
      stateEntries.push(createResearchDiscordStateEntry({
        packHash: queue.packHash,
        reviewPackPath,
        sampleId: item.sample.sampleId,
        discordMessageId: messageId,
        discordChannelId: channelId || 'dry-run',
      }));
    }
  }
  if (stateEntries.length) {
    const currentState = await readState(options.statePath);
    writeState(options.statePath, appendResearchDiscordReviewState(currentState, stateEntries));
  }
  return {
    reviewPackPath,
    outcomeReportPath,
    channelId,
    pendingSamplesFound: queue.pendingSamplesFound,
    samplesSelected: queue.selectedSamples,
    messagesPosted,
    dryRun: options.dryRun,
    statePath: path.resolve(options.statePath),
    missingCredentials,
    packHash: queue.packHash,
    payloads: queue.items.map((item) => item.payload),
    advisoryOnlyConfirmed: queue.items.every((item) => (item.sample as { advisoryOnly?: boolean }).advisoryOnly !== false),
  };
}

function renderPublish(result: ResearchDiscordPublishResult): string {
  return [
    '[RESEARCH DISCORD REVIEW PUBLISH]',
    `Review pack: ${result.reviewPackPath}`,
    `Outcome report: ${result.outcomeReportPath || 'not provided'}`,
    `Channel ID: ${result.channelId || 'not configured'}`,
    `Pending samples found: ${result.pendingSamplesFound}`,
    `Samples selected: ${result.samplesSelected}`,
    `Messages posted: ${result.messagesPosted}`,
    `Dry-run: ${result.dryRun ? 'true' : 'false'}`,
    `State path: ${result.statePath}`,
    `Pack hash: ${result.packHash}`,
    `Missing credentials: ${result.missingCredentials.length ? result.missingCredentials.join(', ') : 'none'}`,
    `Advisory-only confirmation: ${result.advisoryOnlyConfirmed ? 'yes' : 'no'}`,
    '',
    'Authority: research-only. Discord review buttons do not approve execution.',
  ].join('\n');
}

function renderState(summary: ReturnType<typeof summarizeResearchDiscordReviewState>): string {
  return [
    '[RESEARCH DISCORD REVIEW STATE]',
    `State path: ${summary.statePath}`,
    `Total posted samples: ${summary.totalPostedSamples}`,
    `Reviewed samples: ${summary.reviewedSamples}`,
    `Pending posted samples: ${summary.pendingPostedSamples}`,
    `Pack hashes found: ${summary.packHashes.join(', ') || 'none'}`,
    `Stale/missing pack warnings: ${summary.staleMissingPackWarnings.join(' | ') || 'none'}`,
    `Advisory-only confirmation: ${summary.advisoryOnlyConfirmed ? 'yes' : 'no'}`,
    '',
    'Authority: research-only. State does not approve execution.',
  ].join('\n');
}

export async function runResearchDiscordReviewCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseResearchDiscordReviewArgs(rawArgs);
  if (options.state) {
    const state = await readState(options.statePath);
    const existingPackPaths = new Set(state.entries.map((entry) => entry.reviewPackPath).filter((file) => existsSync(file)));
    const summary = summarizeResearchDiscordReviewState(path.resolve(options.statePath), state, existingPackPaths);
    if (options.json) console.log(JSON.stringify(summary, null, 2));
    if (options.pretty) console.log(renderState(summary));
    return;
  }
  if (!options.publishPending) throw new Error('Use --publish-pending or --state.');
  const result = await publishResearchDiscordReview(options);
  if (options.json) console.log(JSON.stringify(result, null, 2));
  if (options.pretty) console.log(renderPublish(result));
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tools/automation/research-discord-review.ts')) {
  runResearchDiscordReviewCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
