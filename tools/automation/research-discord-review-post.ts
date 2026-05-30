import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildHistoricalResearchBackfillInput,
  parseResearchBackfillArgs,
} from './research-backfill';
import { createResearchSampleReviewPack } from '../../src/agents/researchSampleReviewAgent';
import { runHistoricalResearchBackfill } from '../../src/agents/historicalResearchBackfillAgent';
import {
  extractOutcomeInputFromSource,
  runResearchOutcomeMath,
} from '../../src/agents/researchOutcomeMathAgent';
import {
  publishResearchDiscordReview,
  type ResearchDiscordPublishResult,
} from './research-discord-review';
import type { ResearchDiscordReviewState } from '../../src/agents/researchDiscordReviewQueueAgent';
import type { ResearchHumanInspectionLabel, ResearchSampleReviewPack } from '../../src/agents/researchSampleReviewAgent';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

type Instrument = 'MES' | 'MNQ';

interface ResearchDiscordReviewPostOptions {
  from: string;
  to: string;
  symbol: Instrument;
  force: boolean;
  dryRun: boolean;
  pretty: boolean;
  json: boolean;
  sampleSize: number;
  backfillOutDir: string;
  reviewPackOutDir: string;
  outcomeOutDir: string;
  statePath: string;
  limit: number;
}

interface WorkflowResult {
  from: string;
  to: string;
  symbol: Instrument;
  researchReportPath: string;
  reviewPackPath: string;
  reviewedOutputPath: string;
  outcomeReportPath: string;
  statePath: string;
  samplesSelected: number;
  recommendationCounts: Record<string, number>;
  cardsPosted: number;
  skippedDuplicates: number;
  dryRun: boolean;
  discordChannelId: string | null;
  publishResult: ResearchDiscordPublishResult;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_RESEARCH_REPORT_DIR = path.join(__dirname, 'research-reports');
const DEFAULT_REVIEW_PACK_DIR = path.join(__dirname, 'research-review-packs');
const DEFAULT_OUTCOME_REPORT_DIR = path.join(__dirname, 'research-outcome-reports');
const DEFAULT_STATE_PATH = path.join(DEFAULT_REVIEW_PACK_DIR, 'discord-review-state.json');

const RECOMMENDATION_TEXT: Record<ResearchHumanInspectionLabel, string> = {
  keep_advisory: 'Keep Advisory',
  reject: 'Reject',
  possible_model1_mapping_review: 'Queue for Model 1 Review',
  possible_turtle_soup_mapping_review: 'Queue for Turtle Soup Review',
  human_rule_review_queue: 'Human Rule Review Queue',
  new_model_candidate_review: 'New Model Candidate Review',
  insufficient_context: 'Insufficient Context',
};

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

function todayLocal(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function requireDate(value: string | null, flag: string): string {
  if (value === 'today' || value === 'auto') return todayLocal();
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${flag} must use YYYY-MM-DD or today.`);
  return value;
}

function parseInstrument(value: string | null): Instrument {
  const symbol = (value || 'MES').toUpperCase();
  if (symbol !== 'MES' && symbol !== 'MNQ') throw new Error('--symbol must be MES or MNQ.');
  return symbol;
}

function numberFlag(args: string[], flag: string, fallback: number): number {
  const value = readFlag(args, flag);
  if (value === null) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${flag} must be a non-negative integer.`);
  return parsed;
}

export function parseResearchDiscordReviewPostArgs(args = process.argv.slice(2)): ResearchDiscordReviewPostOptions {
  return {
    from: requireDate(readFlag(args, '--from') || '2026-01-01', '--from'),
    to: requireDate(readFlag(args, '--to') || 'today', '--to'),
    symbol: parseInstrument(readFlag(args, '--symbol') || readFlag(args, '--instrument')),
    force: hasFlag(args, '--force'),
    dryRun: hasFlag(args, '--dry-run'),
    pretty: hasFlag(args, '--pretty') || !hasFlag(args, '--json'),
    json: hasFlag(args, '--json'),
    sampleSize: numberFlag(args, '--sample-size', 30),
    backfillOutDir: readFlag(args, '--research-out') || DEFAULT_RESEARCH_REPORT_DIR,
    reviewPackOutDir: readFlag(args, '--review-out') || DEFAULT_REVIEW_PACK_DIR,
    outcomeOutDir: readFlag(args, '--outcome-out') || DEFAULT_OUTCOME_REPORT_DIR,
    statePath: readFlag(args, '--state-path') || process.env.RESEARCH_REVIEW_STATE_PATH || DEFAULT_STATE_PATH,
    limit: numberFlag(args, '--limit', 30),
  };
}

function writeJson(file: string, value: unknown): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(file: string, value: string): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${value}\n`, 'utf8');
}

async function readDiscordReviewState(file: string): Promise<ResearchDiscordReviewState> {
  try {
    const parsed = JSON.parse(await fs.readFile(file, 'utf8')) as ResearchDiscordReviewState;
    if (parsed.reportType === 'research_discord_review_state' && Array.isArray(parsed.entries)) return parsed;
  } catch {
    // Missing state means no duplicates are known yet.
  }
  return { reportType: 'research_discord_review_state', updatedAt: new Date().toISOString(), entries: [] };
}

function recommendationCounts(pack: ResearchSampleReviewPack): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const sample of pack.samples) {
    const label = RECOMMENDATION_TEXT[sample.agentInspectionLabel] || sample.agentInspectionLabel;
    counts[label] = (counts[label] || 0) + 1;
  }
  return counts;
}

function reviewedOutputPath(reviewPackPath: string): string {
  return reviewPackPath.replace(/\.json$/i, '.reviewed.json');
}

export async function runResearchDiscordReviewPostWorkflow(options: ResearchDiscordReviewPostOptions): Promise<WorkflowResult> {
  const backfillArgs = [
    '--from', options.from,
    '--to', options.to,
    '--instrument', options.symbol,
    '--out', options.backfillOutDir,
    '--pretty',
  ];
  const backfillOptions = parseResearchBackfillArgs(backfillArgs);
  const backfillInput = await buildHistoricalResearchBackfillInput(backfillOptions);
  const backfillReport = runHistoricalResearchBackfill(backfillInput);
  const backfillBase = path.join(path.resolve(options.backfillOutDir), `research-backfill-${options.symbol}-${options.from}-to-${options.to}`);
  const researchReportPath = `${backfillBase}.json`;
  writeJson(researchReportPath, backfillReport);
  writeText(`${backfillBase}.md`, backfillReport.markdown);

  const reviewPack = createResearchSampleReviewPack({
    instrument: options.symbol,
    concept: 'all',
    sampleSize: options.sampleSize,
    sourceReports: [{ path: researchReportPath, report: backfillReport }],
  });
  const reviewBase = path.join(path.resolve(options.reviewPackOutDir), `research-sample-review-${options.symbol}-all-${reviewPack.generatedAt.slice(0, 10)}`);
  const reviewPackPath = `${reviewBase}.json`;
  writeJson(reviewPackPath, reviewPack);
  writeText(`${reviewBase}.md`, reviewPack.markdown);

  const outcomeInput = extractOutcomeInputFromSource(researchReportPath, backfillReport, options.symbol);
  const outcomeReport = runResearchOutcomeMath(outcomeInput);
  const outcomeBase = path.join(path.resolve(options.outcomeOutDir), `research-outcome-math-${options.symbol}-${outcomeReport.generatedAt.slice(0, 10)}`);
  const outcomeReportPath = `${outcomeBase}.json`;
  writeJson(outcomeReportPath, outcomeReport);
  writeText(`${outcomeBase}.md`, outcomeReport.markdown);

  const state = await readDiscordReviewState(options.statePath);
  const postedSampleIds = new Set((state.entries || []).map((entry) => entry.sampleId));
  const skipSampleIds = options.force ? [] : reviewPack.samples.filter((sample) => postedSampleIds.has(sample.sampleId)).map((sample) => sample.sampleId);
  const publishResult = await publishResearchDiscordReview({
    reviewPack: reviewPackPath,
    outcomeReport: outcomeReportPath,
    publishPending: true,
    state: false,
    limit: options.limit,
    dryRun: options.dryRun,
    writeDryRunState: false,
    statePath: options.statePath,
    pretty: true,
    json: false,
    skipSampleIds,
  });

  return {
    from: options.from,
    to: options.to,
    symbol: options.symbol,
    researchReportPath,
    reviewPackPath,
    reviewedOutputPath: reviewedOutputPath(reviewPackPath),
    outcomeReportPath,
    statePath: path.resolve(options.statePath),
    samplesSelected: publishResult.samplesSelected,
    recommendationCounts: recommendationCounts(reviewPack),
    cardsPosted: publishResult.messagesPosted,
    skippedDuplicates: skipSampleIds.length,
    dryRun: options.dryRun,
    discordChannelId: publishResult.channelId,
    publishResult,
  };
}

function renderResult(result: WorkflowResult): string {
  return [
    '[RESEARCH DISCORD REVIEW POST]',
    `Date range: ${result.from} to ${result.to}`,
    `Symbol: ${result.symbol}`,
    `Research report path: ${result.researchReportPath}`,
    `Review pack path: ${result.reviewPackPath}`,
    `Reviewed output path: ${result.reviewedOutputPath}`,
    `Outcome report path: ${result.outcomeReportPath}`,
    `Samples selected: ${result.samplesSelected}`,
    'Agent recommendations summary:',
    ...Object.entries(result.recommendationCounts).map(([label, count]) => `- ${label}: ${count}`),
    `Cards posted: ${result.cardsPosted}`,
    `Cards skipped as duplicates: ${result.skippedDuplicates}`,
    `Discord channel ID: ${result.discordChannelId || 'not configured'}`,
    `State file path: ${result.statePath}`,
    `Dry run: ${result.dryRun ? 'true' : 'false'}`,
    '',
    'Research-only. This does not approve execution, change rules, or create trades.',
  ].join('\n');
}

export async function runResearchDiscordReviewPostCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseResearchDiscordReviewPostArgs(rawArgs);
  const result = await runResearchDiscordReviewPostWorkflow(options);
  if (options.json) console.log(JSON.stringify(result, null, 2));
  if (options.pretty) console.log(renderResult(result));
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tools/automation/research-discord-review-post.ts')) {
  runResearchDiscordReviewPostCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
