import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  publishResearchDiscordReview,
  type ResearchDiscordPublishResult,
} from './research-discord-review';
import {
  sendModelCandidateWeeklyBrief,
  type ModelCandidateWeeklyBriefResult,
} from './model-candidate-weekly-brief';
import type { ResearchDiscordReviewState } from '../../src/agents/researchDiscordReviewQueueAgent';
import type { ResearchHumanInspectionLabel, ResearchSampleReviewPack } from '../../src/agents/researchSampleReviewAgent';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

type ReportKind = 'daily' | 'weekly';
type Instrument = 'MES' | 'MNQ';

interface SchedulerOptions {
  once: ReportKind | null;
  force: boolean;
  dryRun: boolean;
  pretty: boolean;
  json: boolean;
  instrument: Instrument;
  timezone: string;
  dailyTime: string;
  weeklyTime: string;
  pollSeconds: number;
  statePath: string;
  reviewStatePath: string;
  reviewPackDir: string;
  outcomeReportDir: string;
  validationReportDir: string;
  modelCandidateBriefStatePath: string;
  modelCandidateLedgerOutDir: string;
  modelCandidateChartDir: string;
  reviewPublishLimit: number;
  publishReviewOnStart: boolean;
}

interface PostedReportRecord {
  postedAt: string;
  messageId: string | null;
  dryRun: boolean;
}

interface SchedulerState {
  reportType: 'quant_desk_discord_report_state';
  updatedAt: string;
  lastRunAt: string | null;
  dailyReports: Record<string, PostedReportRecord>;
  weeklyReports: Record<string, PostedReportRecord>;
  startupReviewPublishes: Record<string, {
    checkedAt: string;
    reviewPackPath: string;
    messagesPosted: number;
    skippedAsDuplicates: number;
    dryRun: boolean;
  }>;
}

interface FileSummary {
  path: string;
  name: string;
  modifiedAt: string;
}

interface ReviewFacts {
  reportDate: string;
  weekStart: string;
  weekEnd: string;
  instrument: Instrument;
  reviewPacks: FileSummary[];
  reviewedPacks: FileSummary[];
  outcomeReports: FileSummary[];
  validationReports: FileSummary[];
  generatedSamples: number;
  postedCards: number;
  duplicateSkipped: number;
  humanReviewed: number;
  openBacklog: number;
  labelCounts: Record<ResearchHumanInspectionLabel, number>;
  conceptCounts: Record<string, number>;
  warnings: string[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_STATE_PATH = path.join(__dirname, 'discord-report-state.json');
const DEFAULT_REVIEW_STATE_PATH = path.join(__dirname, 'research-review-packs', 'discord-review-state.json');
const DEFAULT_REVIEW_PACK_DIR = path.join(__dirname, 'research-review-packs');
const DEFAULT_OUTCOME_REPORT_DIR = path.join(__dirname, 'research-outcome-reports');
const DEFAULT_VALIDATION_REPORT_DIR = path.join(__dirname, 'research-validation-reports');
const DEFAULT_MODEL_CANDIDATE_LEDGER_DIR = path.join(__dirname, 'model-candidate-ledger');
const DEFAULT_MODEL_CANDIDATE_BRIEF_STATE_PATH = path.join(DEFAULT_MODEL_CANDIDATE_LEDGER_DIR, 'model-candidate-weekly-brief-state.json');
const DEFAULT_PRICE_ACTION_CARD_DIR = path.join(__dirname, 'research-review-charts', 'price-action-review-cards');
const SAFETY_FOOTER = 'Research-only. This does not approve execution, change rules, or create trades.';

const LABEL_TEXT: Record<ResearchHumanInspectionLabel, string> = {
  keep_advisory: 'Keep Advisory',
  reject: 'Reject',
  possible_model1_mapping_review: 'Model 1 Review',
  possible_turtle_soup_mapping_review: 'Turtle Soup Review',
  human_rule_review_queue: 'Human Rule Review Queue',
  new_model_candidate_review: 'New Model Candidate',
  approved_for_future_model_candidate_review: 'Approved for Future Model-Candidate Review',
  not_approved_for_future_model_candidate_review: 'Not Approved for Future Model-Candidate Review',
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

function numberFlag(args: string[], flag: string, fallback: number): number {
  const value = readFlag(args, flag);
  if (value === null) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${flag} must be a non-negative number.`);
  return parsed;
}

function boolFlag(args: string[], flag: string, fallback: boolean): boolean {
  const value = readFlag(args, flag);
  if (value === null) return fallback;
  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
}

function instrumentFlag(args: string[]): Instrument {
  const value = (readFlag(args, '--instrument') || process.env.QUANT_DESK_REPORT_SYMBOL || 'MES').toUpperCase();
  if (value !== 'MES' && value !== 'MNQ') throw new Error('--instrument must be MES or MNQ.');
  return value;
}

function normalizeClock(value: string, label: string): string {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) throw new Error(`${label} must use HH:MM.`);
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) throw new Error(`${label} must use a valid 24-hour HH:MM.`);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function parseQuantDeskDiscordSchedulerArgs(args = process.argv.slice(2)): SchedulerOptions {
  const once = readFlag(args, '--once') as ReportKind | null;
  if (once !== null && once !== 'daily' && once !== 'weekly') throw new Error('--once must be daily or weekly.');
  return {
    once,
    force: hasFlag(args, '--force'),
    dryRun: hasFlag(args, '--dry-run'),
    pretty: hasFlag(args, '--pretty') || !hasFlag(args, '--json'),
    json: hasFlag(args, '--json'),
    instrument: instrumentFlag(args),
    timezone: readFlag(args, '--timezone') || process.env.QUANT_DESK_REPORT_TIMEZONE || 'America/Los_Angeles',
    dailyTime: normalizeClock(readFlag(args, '--daily-time') || process.env.QUANT_DESK_DAILY_CLOSE_TIME || '13:15', '--daily-time'),
    weeklyTime: normalizeClock(readFlag(args, '--weekly-time') || process.env.QUANT_DESK_WEEKLY_WRAP_TIME || '13:30', '--weekly-time'),
    pollSeconds: numberFlag(args, '--poll-seconds', Number.parseInt(process.env.QUANT_DESK_REPORT_POLL_SECONDS || '30', 10) || 30),
    statePath: readFlag(args, '--state-path') || process.env.QUANT_DESK_DISCORD_REPORT_STATE_PATH || DEFAULT_STATE_PATH,
    reviewStatePath: readFlag(args, '--review-state-path') || process.env.RESEARCH_REVIEW_STATE_PATH || DEFAULT_REVIEW_STATE_PATH,
    reviewPackDir: readFlag(args, '--review-pack-dir') || DEFAULT_REVIEW_PACK_DIR,
    outcomeReportDir: readFlag(args, '--outcome-report-dir') || DEFAULT_OUTCOME_REPORT_DIR,
    validationReportDir: readFlag(args, '--validation-report-dir') || DEFAULT_VALIDATION_REPORT_DIR,
    modelCandidateBriefStatePath: readFlag(args, '--model-candidate-brief-state-path') || DEFAULT_MODEL_CANDIDATE_BRIEF_STATE_PATH,
    modelCandidateLedgerOutDir: readFlag(args, '--model-candidate-ledger-out') || DEFAULT_MODEL_CANDIDATE_LEDGER_DIR,
    modelCandidateChartDir: readFlag(args, '--model-candidate-chart-dir') || DEFAULT_PRICE_ACTION_CARD_DIR,
    reviewPublishLimit: numberFlag(args, '--review-publish-limit', Number.parseInt(process.env.QUANT_DESK_REVIEW_PUBLISH_LIMIT || '5', 10) || 5),
    publishReviewOnStart: boolFlag(args, '--publish-review-on-start', true),
  };
}

function zonedParts(date: Date, timezone: string): { date: string; clock: string; weekday: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return {
    date: `${value('year')}-${value('month')}-${value('day')}`,
    clock: `${value('hour')}:${value('minute')}`,
    weekday: value('weekday'),
  };
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days, 12));
  return next.toISOString().slice(0, 10);
}

function weekRange(date: string): { weekStart: string; weekEnd: string; weekKey: string } {
  const base = new Date(`${date}T12:00:00Z`);
  const day = base.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const weekStart = addDays(date, mondayOffset);
  const weekEnd = addDays(weekStart, 4);
  return { weekStart, weekEnd, weekKey: `${weekStart}_${weekEnd}` };
}

function isTradingWeekday(weekday: string): boolean {
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(weekday);
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, value: unknown): Promise<void> {
  mkdirSync(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function emptyState(): SchedulerState {
  return {
    reportType: 'quant_desk_discord_report_state',
    updatedAt: new Date().toISOString(),
    lastRunAt: null,
    dailyReports: {},
    weeklyReports: {},
    startupReviewPublishes: {},
  };
}

async function readState(file: string): Promise<SchedulerState> {
  const state = await readJson<SchedulerState>(file, emptyState());
  if (state.reportType !== 'quant_desk_discord_report_state') return emptyState();
  return {
    ...emptyState(),
    ...state,
    dailyReports: state.dailyReports || {},
    weeklyReports: state.weeklyReports || {},
    startupReviewPublishes: state.startupReviewPublishes || {},
  };
}

async function writeState(file: string, state: SchedulerState): Promise<void> {
  await writeJson(file, { ...state, updatedAt: new Date().toISOString(), lastRunAt: new Date().toISOString() });
}

async function listJsonFiles(dir: string): Promise<FileSummary[]> {
  if (!existsSync(dir)) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: FileSummary[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const file = path.join(dir, entry.name);
    const stat = await fs.stat(file);
    files.push({ path: file, name: entry.name, modifiedAt: stat.mtime.toISOString() });
  }
  return files.sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt));
}

async function loadReviewPacks(dir: string, instrument: Instrument): Promise<Array<{ file: FileSummary; pack: ResearchSampleReviewPack }>> {
  const files = (await listJsonFiles(dir)).filter((file) =>
    /^research-sample-review-.*\.json$/i.test(file.name) &&
    !/\.reviewed\.json$/i.test(file.name) &&
    !/discord-review-state\.json$/i.test(file.name)
  );
  const packs: Array<{ file: FileSummary; pack: ResearchSampleReviewPack }> = [];
  for (const file of files) {
    const pack = await readJson<ResearchSampleReviewPack | null>(file.path, null);
    if (pack?.reportType === 'research_sample_review_pack' && pack.instrument.toUpperCase() === instrument) {
      packs.push({ file, pack });
    }
  }
  return packs;
}

async function latestReviewPack(dir: string, instrument: Instrument): Promise<{ file: FileSummary; pack: ResearchSampleReviewPack } | null> {
  return (await loadReviewPacks(dir, instrument))[0] || null;
}

function sameZonedDate(iso: string | undefined, date: string, timezone: string): boolean {
  if (!iso) return false;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return false;
  return zonedParts(parsed, timezone).date === date;
}

function inDateRange(value: string, start: string, end: string): boolean {
  return value >= start && value <= end;
}

function bump(map: Record<string, number>, key: string | null | undefined): void {
  const normalized = key && key.trim() ? key : 'unspecified';
  map[normalized] = (map[normalized] || 0) + 1;
}

function topCounts(map: Record<string, number>, limit = 5): string {
  const values = Object.entries(map)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([key, count]) => `${key} (${count})`);
  return values.join(', ') || 'none';
}

function labelLines(labelCounts: Record<ResearchHumanInspectionLabel, number>): string[] {
  return (Object.keys(LABEL_TEXT) as ResearchHumanInspectionLabel[]).map((label) => `- ${LABEL_TEXT[label]}: ${labelCounts[label] || 0}`);
}

export async function collectReviewFacts(options: SchedulerOptions, state: SchedulerState, reportDate: string): Promise<ReviewFacts> {
  const { weekStart, weekEnd } = weekRange(reportDate);
  const packs = await loadReviewPacks(options.reviewPackDir, options.instrument);
  const reviewedPacks = (await listJsonFiles(options.reviewPackDir)).filter((file) => /\.reviewed\.json$/i.test(file.name));
  const outcomeReports = (await listJsonFiles(options.outcomeReportDir)).filter((file) => file.name.includes(options.instrument));
  const validationReports = await listJsonFiles(options.validationReportDir);
  const reviewState = await readJson<ResearchDiscordReviewState>(options.reviewStatePath, {
    reportType: 'research_discord_review_state',
    updatedAt: new Date().toISOString(),
    entries: [],
  });
  const warnings: string[] = [];
  if (!packs.length) warnings.push('No research review pack was found.');
  if (!existsSync(options.reviewStatePath)) warnings.push('Discord review state file was not found.');

  const labelCounts = {} as Record<ResearchHumanInspectionLabel, number>;
  const conceptCounts: Record<string, number> = {};
  let generatedSamples = 0;
  let openBacklog = 0;
  for (const { pack } of packs) {
    for (const sample of pack.samples) {
      if (sample.date === reportDate) generatedSamples += 1;
      if (inDateRange(sample.date, weekStart, weekEnd)) bump(conceptCounts, sample.conceptTitle || sample.concept);
      if (sample.humanInspectionLabel === null) openBacklog += 1;
    }
  }

  const entries = Array.isArray(reviewState.entries) ? reviewState.entries : [];
  const postedCards = entries.filter((entry) => sameZonedDate(entry.postedAt, reportDate, options.timezone)).length;
  const reviewedToday = entries.filter((entry) => entry.reviewed && sameZonedDate(entry.reviewedAt, reportDate, options.timezone));
  for (const entry of reviewedToday) {
    if (entry.selectedLabel) labelCounts[entry.selectedLabel] = (labelCounts[entry.selectedLabel] || 0) + 1;
  }
  const duplicateSkipped = Object.values(state.startupReviewPublishes)
    .filter((entry) => sameZonedDate(entry.checkedAt, reportDate, options.timezone))
    .reduce((sum, entry) => sum + entry.skippedAsDuplicates, 0);

  return {
    reportDate,
    weekStart,
    weekEnd,
    instrument: options.instrument,
    reviewPacks: packs.map((item) => item.file),
    reviewedPacks,
    outcomeReports,
    validationReports,
    generatedSamples,
    postedCards,
    duplicateSkipped,
    humanReviewed: reviewedToday.length,
    openBacklog,
    labelCounts,
    conceptCounts,
    warnings,
  };
}

export function buildDailyCloseBrief(facts: ReviewFacts): string {
  return [
    `[QUANT DESK DAILY CLOSE BRIEF] ${facts.reportDate}`,
    `Symbol: ${facts.instrument}`,
    'Session coverage: RTH research review close, local review state, and generated research files.',
    `Review candidates/samples found for date: ${facts.generatedSamples}`,
    `Discord review cards posted today: ${facts.postedCards}`,
    `Skipped as duplicates: ${facts.duplicateSkipped}`,
    `Human-reviewed today: ${facts.humanReviewed}`,
    'Human labels summary:',
    ...labelLines(facts.labelCounts),
    `Key advisory concepts observed: ${topCounts(facts.conceptCounts)}`,
    `Open review backlog: ${facts.openBacklog}`,
    `Errors or missing data warnings: ${facts.warnings.join(' | ') || 'none'}`,
    'Output files written/found:',
    `- Review packs: ${facts.reviewPacks.map((file) => file.name).join(', ') || 'none'}`,
    `- Reviewed packs: ${facts.reviewedPacks.map((file) => file.name).join(', ') || 'none'}`,
    `- Outcome reports: ${facts.outcomeReports.map((file) => file.name).join(', ') || 'none'}`,
    `- Validation reports: ${facts.validationReports.map((file) => file.name).join(', ') || 'none'}`,
    '',
    facts.generatedSamples === 0 ? 'No trading-day research activity was found for this date.' : 'Research activity was found for this date.',
    SAFETY_FOOTER,
  ].join('\n');
}

export function buildWeeklyWrapBrief(facts: ReviewFacts): string {
  const rejected = facts.labelCounts.reject || 0;
  const ruleQueue = facts.labelCounts.human_rule_review_queue || 0;
  return [
    `[QUANT DESK WEEKLY WRAP-UP BRIEF] ${facts.weekStart} to ${facts.weekEnd}`,
    `Symbol: ${facts.instrument}`,
    `Total candidates/samples reviewed: ${facts.humanReviewed}`,
    `Total Discord cards posted: ${facts.postedCards}`,
    `Total human-reviewed samples: ${facts.humanReviewed}`,
    'Label distribution:',
    ...labelLines(facts.labelCounts),
    `Concepts with the most review activity: ${topCounts(facts.conceptCounts)}`,
    `Notable repeated advisory patterns: ${topCounts(facts.conceptCounts)}`,
    `Rejected sample count: ${rejected}`,
    `Human Rule Review Queue count: ${ruleQueue}`,
    'Files generated/updated:',
    `- Review packs: ${facts.reviewPacks.map((file) => file.name).join(', ') || 'none'}`,
    `- Reviewed packs: ${facts.reviewedPacks.map((file) => file.name).join(', ') || 'none'}`,
    `- Outcome reports: ${facts.outcomeReports.map((file) => file.name).join(', ') || 'none'}`,
    `- Validation reports: ${facts.validationReports.map((file) => file.name).join(', ') || 'none'}`,
    `Open review backlog count: ${facts.openBacklog}`,
    'Next-step suggestions for human review: prioritize unresolved Discord cards, inspect repeated advisory concepts, and keep any rule discussion human-only until separately approved.',
    SAFETY_FOOTER,
  ].join('\n');
}

function missingDiscordConfig(): string[] {
  const missing: string[] = [];
  if (!process.env.RESEARCH_REVIEW_DISCORD_BOT_TOKEN) missing.push('RESEARCH_REVIEW_DISCORD_BOT_TOKEN');
  if (!process.env.RESEARCH_REVIEW_DISCORD_CHANNEL_ID) missing.push('RESEARCH_REVIEW_DISCORD_CHANNEL_ID');
  return missing;
}

async function postDiscordContent(content: string, dryRun: boolean): Promise<string | null> {
  const missing = missingDiscordConfig();
  if (missing.length) {
    console.log(`Discord report skipped; missing configuration: ${missing.join(', ')}`);
    return null;
  }
  if (dryRun) {
    console.log('[dry-run] Discord report payload:');
    console.log(content);
    return null;
  }
  const channelId = process.env.RESEARCH_REVIEW_DISCORD_CHANNEL_ID as string;
  const token = process.env.RESEARCH_REVIEW_DISCORD_BOT_TOKEN as string;
  const response = await fetch(`https://discord.com/api/v10/channels/${encodeURIComponent(channelId)}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: content.length <= 1900 ? content : `${content.slice(0, 1840).trim()}\n${SAFETY_FOOTER}`,
      allowed_mentions: { parse: [] },
    }),
  });
  if (!response.ok) throw new Error(`Discord report post failed (${response.status}): ${await response.text()}`);
  const parsed = await response.json() as { id?: string };
  return parsed.id || null;
}

async function runStartupReviewPublish(options: SchedulerOptions, state: SchedulerState): Promise<ResearchDiscordPublishResult | null> {
  if (!options.publishReviewOnStart) return null;
  const latest = await latestReviewPack(options.reviewPackDir, options.instrument);
  if (!latest) {
    console.log('Startup review publishing skipped: no review pack found.');
    return null;
  }
  const reviewState = await readJson<ResearchDiscordReviewState>(options.reviewStatePath, {
    reportType: 'research_discord_review_state',
    updatedAt: new Date().toISOString(),
    entries: [],
  });
  const existingForPack = (reviewState.entries || []).filter((entry) => path.resolve(entry.reviewPackPath) === path.resolve(latest.file.path));
  const key = path.resolve(latest.file.path);
  if (existingForPack.length > 0) {
    state.startupReviewPublishes[key] = {
      checkedAt: new Date().toISOString(),
      reviewPackPath: key,
      messagesPosted: 0,
      skippedAsDuplicates: existingForPack.length,
      dryRun: options.dryRun,
    };
    console.log(`Startup review publishing skipped; ${existingForPack.length} cards already exist for latest pack.`);
    return null;
  }
  const outcome = (await listJsonFiles(options.outcomeReportDir)).find((file) => file.name.includes(options.instrument))?.path || null;
  const result = await publishResearchDiscordReview({
    reviewPack: latest.file.path,
    outcomeReport: outcome,
    publishPending: true,
    state: false,
    limit: options.reviewPublishLimit,
    dryRun: options.dryRun,
    writeDryRunState: false,
    statePath: options.reviewStatePath,
    pretty: true,
    json: false,
  });
  state.startupReviewPublishes[key] = {
    checkedAt: new Date().toISOString(),
    reviewPackPath: key,
    messagesPosted: result.messagesPosted,
    skippedAsDuplicates: 0,
    dryRun: options.dryRun,
  };
  console.log(`Startup review publishing checked latest pack; messages posted: ${result.messagesPosted}.`);
  return result;
}

export async function sendScheduledReport(kind: ReportKind, options: SchedulerOptions, force: boolean): Promise<{ sent: boolean; skippedReason: string | null; content: string; modelCandidateWeeklyBrief?: ModelCandidateWeeklyBriefResult }> {
  const state = await readState(options.statePath);
  const today = zonedParts(new Date(), options.timezone).date;
  const facts = await collectReviewFacts(options, state, today);
  const key = kind === 'daily' ? facts.reportDate : weekRange(facts.reportDate).weekKey;
  const records = kind === 'daily' ? state.dailyReports : state.weeklyReports;
  const content = kind === 'daily' ? buildDailyCloseBrief(facts) : buildWeeklyWrapBrief(facts);
  if (!force && records[key]) {
    const modelCandidateWeeklyBrief = kind === 'weekly'
      ? await sendModelCandidateWeeklyBrief({
        from: facts.weekStart,
        to: facts.weekEnd,
        symbol: options.instrument,
        dryRun: options.dryRun,
        force: false,
        pretty: options.pretty,
        json: false,
        statePath: options.modelCandidateBriefStatePath,
        reviewPackDir: options.reviewPackDir,
        outcomeReportDir: options.outcomeReportDir,
        chartDir: options.modelCandidateChartDir,
        ledgerOutDir: options.modelCandidateLedgerOutDir,
        thresholds: {
          minimumReviewedSamples: 10,
          minimumApprovalRate: 0.7,
        },
      })
      : undefined;
    return { sent: false, skippedReason: 'Already posted.', content, modelCandidateWeeklyBrief };
  }
  let messageId: string | null = null;
  try {
    messageId = await postDiscordContent(content, options.dryRun);
  } catch (error) {
    console.error(`[quant-desk-discord-scheduler] ${kind} report failed safely: ${error instanceof Error ? error.message : String(error)}`);
    return { sent: false, skippedReason: 'Discord post failed.', content };
  }
  records[key] = { postedAt: new Date().toISOString(), messageId, dryRun: options.dryRun };
  await writeState(options.statePath, state);
  const modelCandidateWeeklyBrief = kind === 'weekly'
    ? await sendModelCandidateWeeklyBrief({
      from: facts.weekStart,
      to: facts.weekEnd,
      symbol: options.instrument,
      dryRun: options.dryRun,
      force,
      pretty: options.pretty,
      json: false,
      statePath: options.modelCandidateBriefStatePath,
      reviewPackDir: options.reviewPackDir,
      outcomeReportDir: options.outcomeReportDir,
      chartDir: options.modelCandidateChartDir,
      ledgerOutDir: options.modelCandidateLedgerOutDir,
      thresholds: {
        minimumReviewedSamples: 10,
        minimumApprovalRate: 0.7,
      },
    })
    : undefined;
  return { sent: true, skippedReason: null, content, modelCandidateWeeklyBrief };
}

function nextRunLine(label: string, time: string, timezone: string): string {
  return `${label}: ${time} ${timezone}`;
}

function shouldRunDaily(now: Date, options: SchedulerOptions, state: SchedulerState): boolean {
  const parts = zonedParts(now, options.timezone);
  return isTradingWeekday(parts.weekday) && parts.clock >= options.dailyTime && !state.dailyReports[parts.date];
}

function shouldRunWeekly(now: Date, options: SchedulerOptions, state: SchedulerState): boolean {
  const parts = zonedParts(now, options.timezone);
  const key = weekRange(parts.date).weekKey;
  return parts.weekday === 'Fri' && parts.clock >= options.weeklyTime && !state.weeklyReports[key];
}

async function runLoop(options: SchedulerOptions): Promise<void> {
  const state = await readState(options.statePath);
  await runStartupReviewPublish(options, state);
  await writeState(options.statePath, state);
  console.log('[QUANT DESK DISCORD SCHEDULER]');
  console.log(`Symbol: ${options.instrument}`);
  console.log(nextRunLine('Daily close brief', options.dailyTime, options.timezone));
  console.log(nextRunLine('Weekly wrap-up brief', options.weeklyTime, options.timezone));
  console.log(nextRunLine('Model candidate weekly research brief', options.weeklyTime, options.timezone));
  console.log(`State file: ${path.resolve(options.statePath)}`);
  console.log(`Model candidate brief state file: ${path.resolve(options.modelCandidateBriefStatePath)}`);
  console.log(SAFETY_FOOTER);
  setInterval(() => {
    void (async () => {
      const current = await readState(options.statePath);
      if (shouldRunDaily(new Date(), options, current)) {
        const result = await sendScheduledReport('daily', options, false);
        console.log(result.sent ? 'Daily close brief posted.' : `Daily close brief skipped: ${result.skippedReason}`);
      }
      if (shouldRunWeekly(new Date(), options, current)) {
        const result = await sendScheduledReport('weekly', options, false);
        console.log(result.sent ? 'Weekly wrap-up brief posted.' : `Weekly wrap-up brief skipped: ${result.skippedReason}`);
      }
    })().catch((error) => {
      console.error(`[quant-desk-discord-scheduler] safe scheduler error: ${error instanceof Error ? error.message : String(error)}`);
    });
  }, Math.max(5, options.pollSeconds) * 1000);
}

export async function runQuantDeskDiscordSchedulerCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseQuantDeskDiscordSchedulerArgs(rawArgs);
  if (options.once) {
    const result = await sendScheduledReport(options.once, options, options.force);
    if (options.json) console.log(JSON.stringify(result, null, 2));
    if (options.pretty) {
      console.log(`[QUANT DESK ${options.once.toUpperCase()} REPORT]`);
      console.log(result.sent ? 'Posted: yes' : `Posted: no (${result.skippedReason})`);
      console.log(SAFETY_FOOTER);
    }
    return;
  }
  await runLoop(options);
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tools/automation/quant-desk-discord-scheduler.ts')) {
  runQuantDeskDiscordSchedulerCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
