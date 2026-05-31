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
  postResearchDiscordReviewMessage,
  publishResearchDiscordReview,
  type ResearchDiscordPublishResult,
} from './research-discord-review';
import { DEFAULT_PRICE_ACTION_REVIEW_CARD_DIR } from './price-action-review-card-renderer';
import { resolveActiveBridgeInstrument, type ActiveBridgeInstrumentResolution } from './research-price-action-bars';
import { writeLatestReviewPackManifest } from './research-review-pack-manifest';
import {
  generateResearchReviewChartReport,
  type ResearchReviewChartReport,
} from './research-review-chart-report';
import {
  PRICE_ACTION_REVIEW_LABELS,
  type ResearchDiscordMessagePayload,
  type ResearchDiscordReviewState,
  type ResearchDiscordReviewStateEntry,
} from '../../src/agents/researchDiscordReviewQueueAgent';
import type { ResearchHumanInspectionLabel, ResearchSampleReviewPack } from '../../src/agents/researchSampleReviewAgent';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

type Instrument = 'MES' | 'MNQ';

export interface ResearchDiscordReviewPostOptions {
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
  chartOutDir: string;
  statePath: string;
  limit: number;
  withPriceActionCards: boolean;
  postSummaryCharts: boolean;
}

export interface WorkflowResult {
  from: string;
  to: string;
  symbol: Instrument;
  researchReportPath: string;
  reviewPackPath: string;
  reviewedOutputPath: string;
  outcomeReportPath: string;
  statePath: string;
  samplesAvailable: number;
  samplesSelected: number;
  recommendationCounts: Record<string, number>;
  cardsPosted: number;
  skippedDuplicates: number;
  remainingBacklog: number;
  dryRun: boolean;
  discordChannelId: string | null;
  publishResult: ResearchDiscordPublishResult;
  chartReport: ResearchReviewChartReport;
  chartArtifactDir: string;
  summaryMessagePosted: boolean;
  chartArtifactsUploaded: boolean;
  chartUploadFailure: string | null;
  summaryPostSkippedReason: string | null;
  activeContract: ActiveBridgeInstrumentResolution | null;
  cardsAttached: number;
  cardsWithheld: number;
  textOnlyPosts: number;
  invalidOverlays: number;
  uploadFailures: number;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_RESEARCH_REPORT_DIR = path.join(__dirname, 'research-reports');
const DEFAULT_REVIEW_PACK_DIR = path.join(__dirname, 'research-review-packs');
const DEFAULT_OUTCOME_REPORT_DIR = path.join(__dirname, 'research-outcome-reports');
const DEFAULT_CHART_REPORT_DIR = path.join(__dirname, 'research-review-charts');
const DEFAULT_STATE_PATH = path.join(DEFAULT_REVIEW_PACK_DIR, 'discord-review-state.json');

const RECOMMENDATION_TEXT: Record<ResearchHumanInspectionLabel, string> = {
  keep_advisory: 'Keep Advisory',
  reject: 'Reject',
  possible_model1_mapping_review: 'Queue for Model 1 Review',
  possible_turtle_soup_mapping_review: 'Queue for Turtle Soup Review',
  human_rule_review_queue: 'Human Rule Review Queue',
  new_model_candidate_review: 'New Model Candidate Review',
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
    chartOutDir: readFlag(args, '--chart-out') || DEFAULT_CHART_REPORT_DIR,
    statePath: readFlag(args, '--state-path') || process.env.RESEARCH_REVIEW_STATE_PATH || DEFAULT_STATE_PATH,
    limit: numberFlag(args, '--limit', 30),
    withPriceActionCards: hasFlag(args, '--with-price-action-cards'),
    postSummaryCharts: hasFlag(args, '--post-summary-charts'),
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

function compactList(values: Array<{ name: string; count: number }>, limit = 5): string {
  if (!values.length) return 'none';
  return values.slice(0, limit).map((row) => `${row.name.slice(0, 56)}: ${row.count}`).join('; ');
}

function compactPath(file: string): string {
  return path.basename(file);
}

function researchQualityLabelBreakdown(chartReport: ResearchReviewChartReport): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const row of chartReport.visualization.researchQualityScoreBySample) {
    const label = row.researchQualityLabel && row.researchQualityLabel !== 'Not provided'
      ? row.researchQualityLabel
      : row.researchQualityScore === null
        ? 'Unavailable'
        : 'Provided';
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([name, count]) => ({ name, count }));
}

export function selectDiscordChartAttachments(chartReport: ResearchReviewChartReport): string[] {
  const data = chartReport.visualization;
  return [
    ...(data.summary.averageResearchQualityScore === null ? [] : [chartReport.chartPaths.riskScoreBySample]),
    chartReport.chartPaths.countByBlockReason,
    chartReport.chartPaths.countBySetupType,
    chartReport.chartPaths.executableVsNonExecutable,
    chartReport.chartPaths.reviewedSamplesByDate,
  ];
}

export function buildSummaryPayload(result: {
  from: string;
  to: string;
  symbol: Instrument;
  reviewPackPath: string;
  manifestPath: string;
  chartReport: ResearchReviewChartReport;
  uploadFailure?: string | null;
}): ResearchDiscordMessagePayload {
  const data = result.chartReport.visualization;
  const chartArtifactDir = path.dirname(result.chartReport.summaryMarkdownPath);
  const warningLines = data.warnings.length
    ? [`- ${data.warnings.length} data completeness warning(s); see chart summary JSON/MD.`]
    : ['- none'];
  const uploadWarning = result.uploadFailure
    ? [`Chart upload warning: ${result.uploadFailure.slice(0, 180)}`]
    : [];
  return {
    content: [
      `[RESEARCH REVIEW SUMMARY] ${result.symbol} ${result.from} to ${result.to}`,
      'Primary workflow: CLI -> review pack -> latest manifest -> local chart artifacts -> Discord review attachments.',
      '',
      `Total reviewed samples: ${data.summary.totalReviewedSamples}`,
      `Executable vs non-executable count: ${data.summary.executableCount} / ${data.summary.nonExecutableCount}`,
      `Most common block reason: ${data.summary.mostCommonBlockReason}`,
      `Average Research Quality Score: ${data.summary.averageResearchQualityScore === null ? 'Not provided' : data.summary.averageResearchQualityScore}`,
      `Research Quality Score labels: ${compactList(researchQualityLabelBreakdown(result.chartReport))}`,
      `Count by setup type: ${compactList(data.countBySetupType)}`,
      `Count by block reason: ${compactList(data.countByBlockReason)}`,
      '',
      'Local chart artifacts written:',
      `- ${compactPath(result.chartReport.chartPaths.riskScoreBySample)}`,
      `- ${compactPath(result.chartReport.chartPaths.countByBlockReason)}`,
      `- ${compactPath(result.chartReport.chartPaths.countBySetupType)}`,
      `- ${compactPath(result.chartReport.chartPaths.executableVsNonExecutable)}`,
      `- ${compactPath(result.chartReport.chartPaths.reviewedSamplesByDate)}`,
      '',
      `Review pack: ${compactPath(result.reviewPackPath)}`,
      `Latest manifest: ${compactPath(result.manifestPath)}`,
      `Local chart artifact folder: ${compactPath(chartArtifactDir)}`,
      `Chart summary: ${compactPath(result.chartReport.summaryMarkdownPath)}`,
      '',
      'Warnings:',
      ...warningLines,
      ...uploadWarning,
      '',
      'Research Review Only. This does not approve execution, change rules, or create trades.',
    ].join('\n'),
    components: [],
    allowed_mentions: { parse: [] },
  };
}

export function shouldPostResearchReviewSummaryCharts(options: Pick<ResearchDiscordReviewPostOptions, 'withPriceActionCards' | 'postSummaryCharts'>): boolean {
  return !options.withPriceActionCards || options.postSummaryCharts;
}

export function isDuplicateForReviewMode(entry: ResearchDiscordReviewStateEntry, withPriceActionCards: boolean): boolean {
  if (!withPriceActionCards) return true;
  const labels = new Set(entry.labelOptions || []);
  return labels.size === PRICE_ACTION_REVIEW_LABELS.length && PRICE_ACTION_REVIEW_LABELS.every((label) => labels.has(label));
}

export async function postResearchReviewSummaryWithChartArtifacts(args: {
  channelId: string;
  token: string;
  from: string;
  to: string;
  symbol: Instrument;
  reviewPackPath: string;
  manifestPath: string;
  chartReport: ResearchReviewChartReport;
}): Promise<{ messagePosted: boolean; chartArtifactsUploaded: boolean; chartUploadFailure: string | null }> {
  const summaryPayload = buildSummaryPayload(args);
  const chartAttachments = selectDiscordChartAttachments(args.chartReport);
  try {
    await postResearchDiscordReviewMessage(args.channelId, args.token, summaryPayload, chartAttachments);
    return {
      messagePosted: true,
      chartArtifactsUploaded: chartAttachments.length > 0,
      chartUploadFailure: null,
    };
  } catch (error) {
    const chartUploadFailure = error instanceof Error ? error.message : String(error);
    console.warn(`Research review chart upload failed; posting text summary only: ${chartUploadFailure}`);
    await postResearchDiscordReviewMessage(args.channelId, args.token, buildSummaryPayload({
      ...args,
      uploadFailure: chartUploadFailure,
    }));
    return {
      messagePosted: true,
      chartArtifactsUploaded: false,
      chartUploadFailure,
    };
  }
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
  writeLatestReviewPackManifest({
    reviewPackPath,
    pack: reviewPack,
    sourceAgent: 'researchDiscordReviewPostWorkflow',
  });
  const manifestPath = path.join(path.dirname(reviewPackPath), 'latest-review-pack.json');

  const outcomeInput = extractOutcomeInputFromSource(researchReportPath, backfillReport, options.symbol);
  const outcomeReport = runResearchOutcomeMath(outcomeInput);
  const outcomeBase = path.join(path.resolve(options.outcomeOutDir), `research-outcome-math-${options.symbol}-${outcomeReport.generatedAt.slice(0, 10)}`);
  const outcomeReportPath = `${outcomeBase}.json`;
  writeJson(outcomeReportPath, outcomeReport);
  writeText(`${outcomeBase}.md`, outcomeReport.markdown);

  const chartReport = await generateResearchReviewChartReport({
    reviewPack,
    reviewPackPath,
    outDir: options.chartOutDir,
    from: options.from,
    to: options.to,
    instrument: options.symbol,
  });

  const state = await readDiscordReviewState(options.statePath);
  const postedSampleIds = new Set((state.entries || [])
    .filter((entry) => isDuplicateForReviewMode(entry, options.withPriceActionCards))
    .map((entry) => entry.sampleId));
  const skipSampleIds = options.force ? [] : reviewPack.samples.filter((sample) => postedSampleIds.has(sample.sampleId)).map((sample) => sample.sampleId);
  const activeContract = options.withPriceActionCards
    ? await resolveActiveBridgeInstrument({ bridgeUrl: process.env.NINJATRADER_BRIDGE_URL || 'http://127.0.0.1:8765' })
    : null;
  let summaryMessagePosted = false;
  let chartArtifactsUploaded = false;
  let chartUploadFailure: string | null = null;
  const postSummaryCharts = shouldPostResearchReviewSummaryCharts(options);
  const summaryPostSkippedReason = postSummaryCharts
    ? null
    : 'Skipped because --with-price-action-cards is active. Use --post-summary-charts to also post the summary chart report.';
  if (!options.dryRun) {
    const channelId = process.env.RESEARCH_REVIEW_DISCORD_CHANNEL_ID;
    const token = process.env.RESEARCH_REVIEW_DISCORD_BOT_TOKEN;
    if (!channelId || !token) {
      throw new Error('Missing Discord research review configuration: RESEARCH_REVIEW_DISCORD_BOT_TOKEN, RESEARCH_REVIEW_DISCORD_CHANNEL_ID. Use --dry-run to inspect payloads without posting.');
    }
    if (postSummaryCharts) {
      const summaryPost = await postResearchReviewSummaryWithChartArtifacts({
        channelId,
        token,
        from: options.from,
        to: options.to,
        symbol: options.symbol,
        reviewPackPath,
        manifestPath,
        chartReport,
      });
      summaryMessagePosted = summaryPost.messagePosted;
      chartArtifactsUploaded = summaryPost.chartArtifactsUploaded;
      chartUploadFailure = summaryPost.chartUploadFailure;
    }
  }

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
    withPriceActionCards: options.withPriceActionCards,
    priceActionCards: options.withPriceActionCards && activeContract ? {
      enabled: true,
      symbol: options.symbol,
      bridgeInstrument: activeContract.instrument,
      bridgeUrl: activeContract.bridgeUrl,
      outputDir: DEFAULT_PRICE_ACTION_REVIEW_CARD_DIR,
      dateRange: { from: options.from, to: options.to },
      chartReportPath: chartReport.summaryMarkdownPath,
      sourceReviewCard: 'Discord PriceActionReviewCard post',
      contractResolution: activeContract,
    } : undefined,
  });
  const cardsAttached = publishResult.priceActionCards.filter((card) => card.attached).length;
  const cardsWithheld = publishResult.priceActionCards.filter((card) => card.chartWithheld).length;
  const textOnlyPosts = publishResult.priceActionCards.filter((card) => card.postedTextOnly).length;
  const invalidOverlays = publishResult.priceActionCards.filter((card) => card.directionConsistency === 'fail').length;

  return {
    from: options.from,
    to: options.to,
    symbol: options.symbol,
    researchReportPath,
    reviewPackPath,
    reviewedOutputPath: reviewedOutputPath(reviewPackPath),
    outcomeReportPath,
    statePath: path.resolve(options.statePath),
    samplesAvailable: reviewPack.samples.length,
    samplesSelected: publishResult.samplesSelected,
    recommendationCounts: recommendationCounts(reviewPack),
    cardsPosted: publishResult.messagesPosted,
    skippedDuplicates: skipSampleIds.length,
    remainingBacklog: Math.max(0, publishResult.pendingSamplesFound - publishResult.samplesSelected),
    dryRun: options.dryRun,
    discordChannelId: publishResult.channelId,
    publishResult,
    chartReport,
    chartArtifactDir: path.dirname(chartReport.summaryMarkdownPath),
    summaryMessagePosted,
    chartArtifactsUploaded,
    chartUploadFailure,
    summaryPostSkippedReason,
    activeContract,
    cardsAttached,
    cardsWithheld,
    textOnlyPosts,
    invalidOverlays,
    uploadFailures: chartUploadFailure ? 1 : 0,
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
    `Latest manifest path: ${path.join(path.dirname(result.reviewPackPath), 'latest-review-pack.json')}`,
    `Chart summary path: ${result.chartReport.summaryMarkdownPath}`,
    `Local chart artifact folder: ${result.chartArtifactDir}`,
    `PriceActionReviewCard enabled: ${result.publishResult.priceActionCards.length ? 'true' : result.activeContract ? 'true' : 'false'}`,
    `Resolved active contract: ${result.activeContract?.instrument || 'not requested'}`,
    `Contract source: ${result.activeContract?.source || 'not requested'}`,
    ...(result.activeContract?.warnings || []).map((warning) => `Contract warning: ${warning}`),
    'PriceActionReviewCard PNGs:',
    ...(result.publishResult.priceActionCards.length
      ? result.publishResult.priceActionCards.map((card) => `- ${card.sampleId}: ${card.pngPath || 'unavailable'}; attached=${card.attached}; withheld=${card.chartWithheld ? 'true' : 'false'}; visualQuality=${card.visualQuality || 'unknown'}; source=${card.dataSource}; warnings=${card.warnings.length}`)
      : ['- none']),
    `Research Quality Score average: ${result.chartReport.visualization.summary.averageResearchQualityScore === null ? 'Not provided' : result.chartReport.visualization.summary.averageResearchQualityScore}`,
    `Research Quality Score labels: ${compactList(researchQualityLabelBreakdown(result.chartReport))}`,
    `Samples available: ${result.samplesAvailable}`,
    'Local chart artifacts:',
    ...Object.entries(result.chartReport.chartPaths).map(([label, file]) => `- ${label}: ${file}`),
    'Local SVG audit artifacts:',
    ...Object.entries(result.chartReport.svgChartPaths).map(([label, file]) => `- ${label}: ${file}`),
    `Samples selected: ${result.samplesSelected}`,
    'Agent recommendations summary:',
    ...Object.entries(result.recommendationCounts).map(([label, count]) => `- ${label}: ${count}`),
    `Cards posted: ${result.cardsPosted}`,
    `Cards attached: ${result.cardsAttached}`,
    `Cards withheld: ${result.cardsWithheld}`,
    `Text-only posts: ${result.textOnlyPosts}`,
    `Invalid overlays: ${result.invalidOverlays}`,
    `Upload failures: ${result.uploadFailures}`,
    `Summary message posted: ${result.summaryMessagePosted ? 'true' : 'false'}`,
    `Summary post skipped reason: ${result.summaryPostSkippedReason || 'none'}`,
    `Chart artifacts uploaded: ${result.chartArtifactsUploaded ? 'true' : 'false'}`,
    `Chart upload failure: ${result.chartUploadFailure || 'none'}`,
    `Cards skipped as duplicates: ${result.skippedDuplicates}`,
    `Remaining backlog after this run: ${result.remainingBacklog}`,
    `Discord channel ID: ${result.discordChannelId || 'not configured'}`,
    `State file path: ${result.statePath}`,
    `Dry run: ${result.dryRun ? 'true' : 'false'}`,
    '',
    result.publishResult.priceActionCards.length || result.activeContract
      ? 'Primary research-review workflow: CLI output -> review pack -> latest-review-pack manifest -> local artifacts -> Discord per-sample PriceActionReviewCard PNG posts.'
      : 'Primary research-review workflow: CLI output -> review pack -> latest-review-pack manifest -> local chart/report artifacts -> Discord review summary with chart attachments.',
    'Research Review Only. This does not approve execution, change rules, or create trades.',
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
