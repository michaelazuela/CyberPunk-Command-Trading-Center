import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildModelCandidateReviewLedger,
  type ModelCandidateConceptSummary,
  type ModelCandidateLedgerOptions,
  type ModelCandidateReviewLedger,
} from './model-candidate-ledger';
import { buildModelCandidateDecisionPostPayload } from './model-candidate-decisions';
import { postResearchDiscordReviewMessage } from './research-discord-review';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

type Instrument = 'MES' | 'MNQ';

export interface ModelCandidateWeeklyBriefOptions {
  from: string;
  to: string;
  symbol: Instrument;
  dryRun: boolean;
  force: boolean;
  pretty: boolean;
  json: boolean;
  statePath: string;
  reviewPackDir: string;
  outcomeReportDir: string;
  chartDir: string;
  ledgerOutDir: string;
  thresholds: ModelCandidateLedgerOptions['thresholds'];
}

export interface ModelCandidateWeeklyBriefState {
  reportType: 'model_candidate_weekly_brief_state';
  updatedAt: string;
  postedBriefs: Record<string, {
    postedAt: string;
    messageId: string | null;
    dryRun: boolean;
    ledgerPath: string;
  }>;
}

export interface ModelCandidateWeeklyBriefResult {
  briefKey: string;
  content: string;
  ledger: ModelCandidateReviewLedger;
  posted: boolean;
  skippedReason: string | null;
  messageId: string | null;
  decisionPosts: {
    conceptKey: string;
    conceptTitle: string;
    posted: boolean;
    messageId: string | null;
    skippedReason: string | null;
  }[];
  statePath: string;
  missingDiscordConfig: string[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_LEDGER_DIR = path.join(__dirname, 'model-candidate-ledger');
const DEFAULT_STATE_PATH = path.join(DEFAULT_LEDGER_DIR, 'model-candidate-weekly-brief-state.json');
const DEFAULT_REVIEW_PACK_DIR = path.join(__dirname, 'research-review-packs');
const DEFAULT_OUTCOME_REPORT_DIR = path.join(__dirname, 'research-outcome-reports');
const DEFAULT_CHART_DIR = path.join(__dirname, 'research-review-charts', 'price-action-review-cards');
const SAFETY_FOOTER = 'Research-only. This does not approve execution, change rules, or create trades.';
const HUMAN_FINAL_DECISION = 'Human final decision required before any model promotion or implementation.';
const DESK_FINAL_DECISION = 'Desk recommendation only. Human final decision required before any model promotion, backtest task, or implementation work.';
const PROHIBITED_TEXT = /\b(activate model|trade live|add to scanner immediately|execution approved|can execute|place order|order action)\b/i;

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
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${flag} must be a non-negative number.`);
  return parsed;
}

export function parseModelCandidateWeeklyBriefArgs(args = process.argv.slice(2)): ModelCandidateWeeklyBriefOptions {
  return {
    from: requireDate(readFlag(args, '--from') || '2026-01-01', '--from'),
    to: requireDate(readFlag(args, '--to') || 'today', '--to'),
    symbol: parseInstrument(readFlag(args, '--symbol') || readFlag(args, '--instrument')),
    dryRun: hasFlag(args, '--dry-run'),
    force: hasFlag(args, '--force'),
    pretty: hasFlag(args, '--pretty') || !hasFlag(args, '--json'),
    json: hasFlag(args, '--json'),
    statePath: readFlag(args, '--state-path') || DEFAULT_STATE_PATH,
    reviewPackDir: readFlag(args, '--review-pack-dir') || DEFAULT_REVIEW_PACK_DIR,
    outcomeReportDir: readFlag(args, '--outcome-report-dir') || DEFAULT_OUTCOME_REPORT_DIR,
    chartDir: readFlag(args, '--chart-dir') || DEFAULT_CHART_DIR,
    ledgerOutDir: readFlag(args, '--ledger-out') || DEFAULT_LEDGER_DIR,
    thresholds: {
      minimumReviewedSamples: numberFlag(args, '--minimum-reviewed-samples', 10),
      minimumApprovalRate: numberFlag(args, '--minimum-approval-rate', 0.7),
    },
  };
}

function emptyState(): ModelCandidateWeeklyBriefState {
  return {
    reportType: 'model_candidate_weekly_brief_state',
    updatedAt: new Date().toISOString(),
    postedBriefs: {},
  };
}

async function readState(file: string): Promise<ModelCandidateWeeklyBriefState> {
  try {
    const parsed = JSON.parse(await fs.readFile(file, 'utf8')) as ModelCandidateWeeklyBriefState;
    if (parsed.reportType === 'model_candidate_weekly_brief_state') {
      return { ...emptyState(), ...parsed, postedBriefs: parsed.postedBriefs || {} };
    }
  } catch {
    // Missing state is normal on first run.
  }
  return emptyState();
}

async function writeState(file: string, state: ModelCandidateWeeklyBriefState): Promise<void> {
  mkdirSync(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2)}\n`, 'utf8');
}

function percent(value: number | null): string {
  return value === null ? 'n/a' : `${Math.round(value * 100)}%`;
}

function outcomeNote(summary: ModelCandidateConceptSummary): string {
  const top = Object.entries(summary.outcomeSummary).sort((left, right) => right[1] - left[1])[0];
  return top ? `${top[0]} (${top[1]})` : 'outcome data unavailable';
}

function summaryLine(summary: ModelCandidateConceptSummary): string {
  return `${summary.conceptTitle}: ${summary.humanApprovedCount}/${summary.totalSamplesReviewed} approved (${percent(summary.approvalRate)}), charts ${summary.chartAvailabilityCount}/${summary.totalSamplesReviewed}, outcome: ${outcomeNote(summary)}.`;
}

function sectionLines(summaries: ModelCandidateConceptSummary[], fallback: string, recommendation: (summary: ModelCandidateConceptSummary) => string): string[] {
  if (!summaries.length) return [`- ${fallback}`];
  return summaries.map((summary) => `- ${summaryLine(summary)} ${recommendation(summary)}`);
}

function notableLessons(ledger: ModelCandidateReviewLedger): string[] {
  if (!ledger.entries.length) {
    return ['- No new Approved / Not Approved model-candidate reviews were found this week. Continue reviewing PriceActionReviewCards to build the candidate ledger.'];
  }
  const lessons: string[] = [];
  const approved = ledger.entries.filter((entry) => entry.humanApprovalState === 'approved_for_future_model_candidate_review');
  const notApproved = ledger.entries.filter((entry) => entry.humanApprovalState === 'not_approved_for_future_model_candidate_review');
  if (approved.length) lessons.push(`- Human-approved evidence clustered around ${[...new Set(approved.map((entry) => entry.conceptTitle))].slice(0, 3).join(', ')}.`);
  if (notApproved.length) lessons.push(`- Not-approved evidence remains useful as a filter; ${notApproved.length} sample(s) should be reviewed for weak context or missing follow-through.`);
  const missingCharts = ledger.entries.filter((entry) => entry.warningState.missingChartArtifact).length;
  if (missingCharts) lessons.push(`- ${missingCharts} reviewed sample(s) need chart artifact follow-up before a cleaner desk read.`);
  return lessons.length ? lessons : ['- Reviewed evidence was collected, but no dominant lesson stood out yet.'];
}

export function renderModelCandidateWeeklyBrief(ledger: ModelCandidateReviewLedger): string {
  const ready = ledger.conceptSummaries.filter((summary) => summary.candidateReadinessStatus === 'candidate_review_recommended');
  const needsMore = ledger.conceptSummaries.filter((summary) =>
    summary.candidateReadinessStatus === 'insufficient_evidence' ||
    summary.candidateReadinessStatus === 'watchlist_candidate'
  );
  const rejected = ledger.conceptSummaries.filter((summary) => summary.candidateReadinessStatus === 'reject_or_deprioritize');
  const deskSummary = ledger.summary.reviewedSamplesFound
    ? `The desk reviewed ${ledger.summary.reviewedSamplesFound} model-candidate evidence sample(s): ${ledger.summary.approvedCount} approved and ${ledger.summary.notApprovedCount} not approved. ${ready.length ? `${ready.length} concept(s) have enough reviewed evidence for formal model-candidate backtest consideration.` : 'No concept is ready for formal candidate review yet.'}`
    : 'No new Approved / Not Approved model-candidate reviews were found this week. Continue reviewing PriceActionReviewCards to build the candidate ledger.';
  const lines = [
    `Quant Desk Weekly Research Brief`,
    `Week of ${ledger.from} to ${ledger.to}`,
    `Symbol: ${ledger.symbol}`,
    '',
    '**Desk Summary**',
    deskSummary,
    '',
    '**Model Candidate Watchlist**',
    ...sectionLines(
      ready,
      'No concept has met the conservative candidate-review threshold yet.',
      () => `Desk recommendation: Move to formal model-candidate backtest. Human final decision required.`,
    ),
    '',
    '**Needs More Evidence**',
    ...sectionLines(
      needsMore,
      'No watchlist concepts require more evidence this week.',
      () => 'Desk recommendation: Continue collecting samples.',
    ),
    '',
    '**Rejected / Deprioritized**',
    ...sectionLines(
      rejected,
      'No concept moved into reject/deprioritize status this week.',
      () => 'Desk recommendation: Reject / deprioritize unless new evidence improves the read.',
    ),
    '',
    '**Notable Price Action Lessons**',
    ...notableLessons(ledger),
    '',
    '**Human Decision Required**',
    ...(ready.length
      ? ready.map((summary) => `- ${summary.conceptTitle}: decide whether to move to formal model-candidate backtest, continue collecting samples, or hold.`)
      : ['- Continue collecting samples and reviewing PriceActionReviewCards before any model-candidate promotion discussion.']),
    '',
    DESK_FINAL_DECISION,
    SAFETY_FOOTER,
    HUMAN_FINAL_DECISION,
  ];
  const content = lines.join('\n');
  if (PROHIBITED_TEXT.test(content)) throw new Error('Model candidate weekly brief contains prohibited executable wording.');
  return content.length <= 1900
    ? content
    : `${content.slice(0, 1780).trim()}\n\n${DESK_FINAL_DECISION}\n${SAFETY_FOOTER}\n${HUMAN_FINAL_DECISION}`;
}

function missingDiscordConfig(): string[] {
  const missing: string[] = [];
  if (!process.env.RESEARCH_REVIEW_DISCORD_BOT_TOKEN) missing.push('RESEARCH_REVIEW_DISCORD_BOT_TOKEN');
  if (!process.env.RESEARCH_REVIEW_DISCORD_CHANNEL_ID) missing.push('RESEARCH_REVIEW_DISCORD_CHANNEL_ID');
  return missing;
}

function briefKey(options: ModelCandidateWeeklyBriefOptions): string {
  return `${options.symbol}|${options.from}|${options.to}`;
}

function decisionSummaries(ledger: ModelCandidateReviewLedger): ModelCandidateConceptSummary[] {
  return ledger.conceptSummaries.filter((summary) => summary.candidateReadinessStatus === 'candidate_review_recommended');
}

async function postDecisionFollowUps(ledger: ModelCandidateReviewLedger, options: ModelCandidateWeeklyBriefOptions, missing: string[]): Promise<ModelCandidateWeeklyBriefResult['decisionPosts']> {
  return Promise.all(decisionSummaries(ledger).map(async (summary) => {
    if (options.dryRun) {
      return {
        conceptKey: summary.concept,
        conceptTitle: summary.conceptTitle,
        posted: false,
        messageId: null,
        skippedReason: 'Dry-run; no Discord decision post made.',
      };
    }
    if (missing.length) {
      return {
        conceptKey: summary.concept,
        conceptTitle: summary.conceptTitle,
        posted: false,
        messageId: null,
        skippedReason: `Missing Discord configuration: ${missing.join(', ')}`,
      };
    }
    const messageId = await postResearchDiscordReviewMessage(
      process.env.RESEARCH_REVIEW_DISCORD_CHANNEL_ID as string,
      process.env.RESEARCH_REVIEW_DISCORD_BOT_TOKEN as string,
      buildModelCandidateDecisionPostPayload(ledger, summary),
    );
    return {
      conceptKey: summary.concept,
      conceptTitle: summary.conceptTitle,
      posted: true,
      messageId,
      skippedReason: null,
    };
  }));
}

export async function sendModelCandidateWeeklyBrief(options: ModelCandidateWeeklyBriefOptions): Promise<ModelCandidateWeeklyBriefResult> {
  const statePath = path.resolve(options.statePath);
  const state = await readState(statePath);
  const key = briefKey(options);
  const ledger = await buildModelCandidateReviewLedger({
    from: options.from,
    to: options.to,
    symbol: options.symbol,
    reviewPackDir: options.reviewPackDir,
    outcomeReportDir: options.outcomeReportDir,
    chartDir: options.chartDir,
    outDir: options.ledgerOutDir,
    pretty: options.pretty,
    json: options.json,
    thresholds: options.thresholds,
  });
  const content = renderModelCandidateWeeklyBrief(ledger);
  const missing = missingDiscordConfig();
  if (!options.force && state.postedBriefs[key]) {
    return {
      briefKey: key,
      content,
      ledger,
      posted: false,
      skippedReason: 'Already posted.',
      messageId: state.postedBriefs[key].messageId,
      decisionPosts: [],
      statePath,
      missingDiscordConfig: [],
    };
  }
  if (options.dryRun) {
    return {
      briefKey: key,
      content,
      ledger,
      posted: false,
      skippedReason: 'Dry-run; no Discord post made.',
      messageId: null,
      decisionPosts: await postDecisionFollowUps(ledger, options, missing),
      statePath,
      missingDiscordConfig: [],
    };
  }
  if (missing.length) {
    return {
      briefKey: key,
      content,
      ledger,
      posted: false,
      skippedReason: `Missing Discord configuration: ${missing.join(', ')}`,
      messageId: null,
      decisionPosts: await postDecisionFollowUps(ledger, options, missing),
      statePath,
      missingDiscordConfig: missing,
    };
  }
  const messageId = await postResearchDiscordReviewMessage(
    process.env.RESEARCH_REVIEW_DISCORD_CHANNEL_ID as string,
    process.env.RESEARCH_REVIEW_DISCORD_BOT_TOKEN as string,
    {
      content,
      components: [],
      allowed_mentions: { parse: [] },
    },
  );
  state.postedBriefs[key] = {
    postedAt: new Date().toISOString(),
    messageId,
    dryRun: false,
    ledgerPath: ledger.outputPaths.jsonPath,
  };
  await writeState(statePath, state);
  const decisionPosts = await postDecisionFollowUps(ledger, options, missing);
  return {
    briefKey: key,
    content,
    ledger,
    posted: true,
    skippedReason: null,
    messageId,
    decisionPosts,
    statePath,
    missingDiscordConfig: [],
  };
}

function renderPretty(result: ModelCandidateWeeklyBriefResult): string {
  return [
    '[MODEL CANDIDATE WEEKLY BRIEF]',
    `Brief key: ${result.briefKey}`,
    `Ledger JSON: ${result.ledger.outputPaths.jsonPath}`,
    `Ledger Markdown: ${result.ledger.outputPaths.markdownPath}`,
    `Posted: ${result.posted ? 'yes' : 'no'}`,
    `Skipped reason: ${result.skippedReason || 'none'}`,
    `Decision posts: ${result.decisionPosts.length}`,
    `State path: ${result.statePath}`,
    '',
    result.content,
  ].join('\n');
}

export async function runModelCandidateWeeklyBriefCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseModelCandidateWeeklyBriefArgs(rawArgs);
  const result = await sendModelCandidateWeeklyBrief(options);
  if (options.json) console.log(JSON.stringify(result, null, 2));
  if (options.pretty) console.log(renderPretty(result));
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tools/automation/model-candidate-weekly-brief.ts')) {
  runModelCandidateWeeklyBriefCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
