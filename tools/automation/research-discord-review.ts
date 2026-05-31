import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPriceActionReviewCardModel } from '../../src/agents/priceActionReviewCardAgent';
import {
  appendResearchDiscordReviewState,
  buildPriceActionReviewMessageContent,
  buildResearchDiscordReviewQueue,
  createResearchDiscordStateEntry,
  emptyResearchDiscordReviewState,
  PRICE_ACTION_REVIEW_LABELS,
  summarizeResearchDiscordReviewState,
  type ResearchDiscordMessagePayload,
  type ResearchDiscordReviewState,
} from '../../src/agents/researchDiscordReviewQueueAgent';
import type { ResearchOutcomeMathReport } from '../../src/agents/researchOutcomeMathAgent';
import type { ResearchSampleReviewPack } from '../../src/agents/researchSampleReviewAgent';
import { renderPriceActionReviewCard, renderPriceActionReviewCardWithMetadata, type PriceActionReviewCardRenderResult } from './price-action-review-card-renderer';
import {
  resolveActiveBridgeInstrument,
  resolveResearchPriceActionBars,
  type ActiveBridgeInstrumentResolution,
  type ResearchPriceActionBarsResult,
} from './research-price-action-bars';

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
  skipSampleIds?: string[];
  withPriceActionCards?: boolean;
  priceActionCards?: ResearchDiscordPriceActionCardOptions;
}

export interface ResearchDiscordPriceActionCardResult {
  sampleId: string;
  pngPath: string | null;
  attached: boolean;
  postedTextOnly?: boolean;
  chartWithheld?: boolean;
  chartWithheldReason?: string;
  visualQuality?: PriceActionReviewCardRenderResult['visualQuality'];
  cardAttachable?: boolean;
  directionConsistency?: PriceActionReviewCardRenderResult['directionConsistency'];
  candleRangeCoveragePct?: number;
  labelCollisionRisk?: PriceActionReviewCardRenderResult['labelCollisionRisk'];
  skipped: boolean;
  warnings: string[];
  dataSource: ResearchPriceActionBarsResult['dataSource'] | 'not_requested';
  resolvedContract: string | null;
}

export interface ResearchDiscordPriceActionCardOptions {
  enabled: boolean;
  symbol: string;
  bridgeInstrument?: string;
  bridgeUrl?: string;
  outputDir?: string;
  dateRange?: { from: string; to: string } | null;
  contractResolution?: ActiveBridgeInstrumentResolution | null;
  resolveBars?: typeof resolveResearchPriceActionBars;
  renderCard?: typeof renderPriceActionReviewCard;
  renderCardWithMetadata?: typeof renderPriceActionReviewCardWithMetadata;
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
  priceActionCards: ResearchDiscordPriceActionCardResult[];
  activeContract: ActiveBridgeInstrumentResolution | null;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_STATE_PATH = path.join(__dirname, 'research-review-packs', 'discord-review-state.json');
const DISCORD_MESSAGE_LIMIT = 2000;

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
    skipSampleIds: [],
    withPriceActionCards: hasFlag(args, '--with-price-action-cards'),
  };
}

function contentTypeFor(file: string): string {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.json') return 'application/json';
  if (ext === '.md' || ext === '.txt') return 'text/plain';
  return 'application/octet-stream';
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

function onlyPngFiles(files: string[]): string[] {
  return files.filter((file) => path.extname(file).toLowerCase() === '.png');
}

export async function postResearchDiscordReviewMessage(channelId: string, token: string, payload: ResearchDiscordMessagePayload, files: string[] = []): Promise<string> {
  if ((payload.content || '').length > DISCORD_MESSAGE_LIMIT) {
    throw new Error(`Discord research review post content exceeds ${DISCORD_MESSAGE_LIMIT} characters.`);
  }
  const validFiles = files.filter(Boolean);
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const url = `https://discord.com/api/v10/channels/${encodeURIComponent(channelId)}/messages`;
    const response = validFiles.length
      ? await (async () => {
          const form = new FormData();
          form.append('payload_json', JSON.stringify(payload));
          for (const [index, file] of validFiles.entries()) {
            const bytes = await fs.readFile(file);
            form.append(`files[${index}]`, new Blob([bytes], { type: contentTypeFor(file) }), path.basename(file));
          }
          return fetch(url, {
            method: 'POST',
            headers: { Authorization: `Bot ${token}` },
            body: form,
          });
        })()
      : await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bot ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
    if (response.ok) {
      const parsed = await response.json() as { id?: string };
      if (!parsed.id) throw new Error('Discord research review post succeeded but did not return a message id.');
      return parsed.id;
    }
    const body = await response.text();
    if (response.status === 429 && attempt < 5) {
      let retryAfterMs = 1000;
      try {
        const parsed = JSON.parse(body) as { retry_after?: number };
        if (typeof parsed.retry_after === 'number' && Number.isFinite(parsed.retry_after)) {
          retryAfterMs = Math.max(250, Math.ceil(parsed.retry_after * 1000));
        }
      } catch {
        retryAfterMs = 1000;
      }
      await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
      continue;
    }
    throw new Error(`Discord research review post failed (${response.status}): ${body}`);
  }
  throw new Error('Discord research review post failed after retry attempts.');
}

function appendPriceActionWarnings(payload: ResearchDiscordMessagePayload, warnings: string[]): ResearchDiscordMessagePayload {
  if (!warnings.length) return payload;
  const warningText = [
    '',
    'Price action chart warning:',
    ...warnings.slice(0, 4).map((warning) => `- ${warning.slice(0, 180)}`),
  ].join('\n');
  const content = `${payload.content}${warningText}`;
  return {
    ...payload,
    content: content.length <= 1900
      ? content
      : `${payload.content.slice(0, 1680).trim()}\nPrice action chart warning: ${warnings[0].slice(0, 170)}\nResearch-only. This does not approve execution, change rules, or create trades.`,
  };
}

function safeFilePart(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 120) || 'sample';
}

async function resolvePriceActionCardConfig(options: ResearchDiscordReviewCliOptions): Promise<{
  config: ResearchDiscordPriceActionCardOptions | null;
  activeContract: ActiveBridgeInstrumentResolution | null;
}> {
  const requested = options.withPriceActionCards || options.priceActionCards?.enabled;
  if (!requested) return { config: null, activeContract: null };
  const base = options.priceActionCards || {
    enabled: true,
    symbol: 'MES',
  };
  const bridgeUrl = base.bridgeUrl || 'http://127.0.0.1:8765';
  const contractResolution = base.contractResolution || (base.bridgeInstrument
    ? { instrument: base.bridgeInstrument, source: 'launcher-config' as const, warnings: [], bridgeUrl }
    : await resolveActiveBridgeInstrument({ bridgeUrl }));
  return {
    config: {
      ...base,
      enabled: true,
      bridgeUrl,
      bridgeInstrument: contractResolution.instrument,
      contractResolution,
    },
    activeContract: contractResolution,
  };
}

async function buildPriceActionCardAttachment(args: {
  item: ReturnType<typeof buildResearchDiscordReviewQueue>['items'][number];
  packInstrument: string;
  cardOptions: ResearchDiscordPriceActionCardOptions;
}): Promise<{ payloadWarnings: string[]; attachmentPaths: string[]; result: ResearchDiscordPriceActionCardResult }> {
  const resolveBars = args.cardOptions.resolveBars || resolveResearchPriceActionBars;
  const renderCardWithMetadata = args.cardOptions.renderCardWithMetadata || (args.cardOptions.renderCard ? null : renderPriceActionReviewCardWithMetadata);
  const renderCard = args.cardOptions.renderCard || renderPriceActionReviewCard;
  const symbol = args.cardOptions.symbol || args.packInstrument || 'MES';
  const resolvedContract = args.cardOptions.bridgeInstrument || args.cardOptions.contractResolution?.instrument || 'MES 06-26';
  const range = args.cardOptions.dateRange;
  const baseWarnings = [...(args.cardOptions.contractResolution?.warnings || [])];
  try {
    const bars = await resolveBars(args.item.sample, {
      symbol,
      bridgeInstrument: resolvedContract,
      bridgeUrl: args.cardOptions.bridgeUrl,
    });
    const warnings = [...baseWarnings, ...bars.warnings];
    if (!bars.bars5m.length || !bars.bars15m.length) {
      const missing = 'Price action chart unavailable: missing bar data for sample window.';
      return {
        payloadWarnings: [missing, ...warnings],
        attachmentPaths: [],
        result: {
          sampleId: args.item.sample.sampleId,
          pngPath: null,
          attached: false,
          postedTextOnly: true,
          skipped: false,
          warnings: [missing, ...warnings],
          dataSource: bars.dataSource,
          resolvedContract: bars.resolvedContract,
        },
      };
    }
    const model = buildPriceActionReviewCardModel({
      sample: args.item.sample,
      overlay: args.item.outcome?.hypotheticalOutcomeOverlay || null,
      bars5m: bars.bars5m,
      bars15m: bars.bars15m,
      symbol,
      contract: bars.resolvedContract,
      dateRange: range,
    });
    const filePrefix = [
      'price-action-review-card',
      safeFilePart(symbol),
      range ? `${safeFilePart(range.from)}-to-${safeFilePart(range.to)}` : 'review',
      safeFilePart(args.item.sample.sampleId),
    ].join('-');
    const rendered = renderCardWithMetadata
      ? await renderCardWithMetadata({ model, outputDir: args.cardOptions.outputDir, filePrefix })
      : {
          outputPath: await renderCard({ model, outputDir: args.cardOptions.outputDir, filePrefix }),
          renderedPng: true,
          renderedSvg: false as const,
          visualQuality: 'pass' as const,
          cardAttachable: true,
          directionConsistency: 'unknown' as const,
          candleRangeCoveragePct: 100,
          labelCollisionRisk: 'low' as const,
          chartWithheldReason: undefined,
          warnings: model.warnings,
        };
    const pngPath = rendered.outputPath;
    if (!rendered.cardAttachable || rendered.visualQuality === 'fail') {
      const warning = rendered.chartWithheldReason || 'Price action card withheld: overlay direction is inconsistent with sample direction or overlay levels make the chart unreadable.';
      return {
        payloadWarnings: [warning, ...warnings, ...rendered.warnings],
        attachmentPaths: [],
        result: {
          sampleId: args.item.sample.sampleId,
          pngPath,
          attached: false,
          postedTextOnly: true,
          chartWithheld: true,
          chartWithheldReason: warning,
          visualQuality: rendered.visualQuality,
          cardAttachable: rendered.cardAttachable,
          directionConsistency: rendered.directionConsistency,
          candleRangeCoveragePct: rendered.candleRangeCoveragePct,
          labelCollisionRisk: rendered.labelCollisionRisk,
          skipped: false,
          warnings: [warning, ...warnings, ...rendered.warnings],
          dataSource: bars.dataSource,
          resolvedContract: bars.resolvedContract,
        },
      };
    }
    const pngAttachments = onlyPngFiles([pngPath]);
    if (!pngAttachments.length) {
      const warning = 'Price action card renderer did not return a PNG attachment path.';
      return {
        payloadWarnings: [warning, ...warnings],
        attachmentPaths: [],
        result: {
          sampleId: args.item.sample.sampleId,
          pngPath,
          attached: false,
          postedTextOnly: true,
          skipped: false,
          warnings: [warning, ...warnings],
          dataSource: bars.dataSource,
          resolvedContract: bars.resolvedContract,
        },
      };
    }
    return {
      payloadWarnings: warnings,
      attachmentPaths: pngAttachments,
      result: {
        sampleId: args.item.sample.sampleId,
        pngPath: pngAttachments[0],
        attached: true,
        postedTextOnly: false,
        chartWithheld: false,
        visualQuality: rendered.visualQuality,
        cardAttachable: rendered.cardAttachable,
        directionConsistency: rendered.directionConsistency,
        candleRangeCoveragePct: rendered.candleRangeCoveragePct,
        labelCollisionRisk: rendered.labelCollisionRisk,
        skipped: false,
        warnings: [...warnings, ...rendered.warnings],
        dataSource: bars.dataSource,
        resolvedContract: bars.resolvedContract,
      },
    };
  } catch (error) {
    const warning = `Price action chart unavailable: ${error instanceof Error ? error.message : String(error)}`;
    return {
      payloadWarnings: [warning, ...baseWarnings],
      attachmentPaths: [],
      result: {
        sampleId: args.item.sample.sampleId,
        pngPath: null,
        attached: false,
        postedTextOnly: true,
        skipped: false,
        warnings: [warning, ...baseWarnings],
        dataSource: 'missing',
        resolvedContract,
      },
    };
  }
}

export async function publishResearchDiscordReview(options: ResearchDiscordReviewCliOptions): Promise<ResearchDiscordPublishResult> {
  if (!options.reviewPack) throw new Error('--review-pack is required with --publish-pending.');
  const reviewPackPath = path.resolve(options.reviewPack);
  const reviewPack = await loadJsonFile(reviewPackPath, isReviewPack, 'Review pack');
  const outcomeReportPath = options.outcomeReport ? path.resolve(options.outcomeReport) : null;
  const outcomeReport = outcomeReportPath ? await loadJsonFile(outcomeReportPath, isOutcomeReport, 'Outcome report') : null;
  const usePriceActionReviewButtons = Boolean(options.withPriceActionCards || options.priceActionCards?.enabled);
  const queue = buildResearchDiscordReviewQueue({
    reviewPack,
    reviewPackPath,
    outcomeReport,
    limit: options.limit,
    skipSampleIds: options.skipSampleIds,
    buttonMode: usePriceActionReviewButtons ? 'future_model_candidate_review' : 'legacy_research_review',
  });
  const missingCredentials = missingDiscordCredentials();
  if (!options.dryRun && missingCredentials.length) {
    throw new Error(`Missing Discord research review configuration: ${missingCredentials.join(', ')}. Use --dry-run to inspect payloads without posting.`);
  }
  const channelId = process.env.RESEARCH_REVIEW_DISCORD_CHANNEL_ID || null;
  const token = process.env.RESEARCH_REVIEW_DISCORD_BOT_TOKEN || null;
  const priceActionConfig = await resolvePriceActionCardConfig(options);
  const priceActionCards: ResearchDiscordPriceActionCardResult[] = [];
  let messagesPosted = 0;
  const stateEntries = [];
  let currentState = (!options.dryRun || options.writeDryRunState) ? await readState(options.statePath) : null;
  for (const item of queue.items) {
    let payload = item.payload;
    let attachments: string[] = [];
    let cardResult: ResearchDiscordPriceActionCardResult | null = null;
    if (priceActionConfig.config?.enabled) {
      const card = await buildPriceActionCardAttachment({
        item,
        packInstrument: reviewPack.instrument,
        cardOptions: priceActionConfig.config,
      });
      cardResult = card.result;
      const invalidOverlayReason = cardResult.directionConsistency === 'fail'
        ? card.result.chartWithheldReason || 'Overlay direction check failed.'
        : null;
      payload = {
        ...payload,
        content: buildPriceActionReviewMessageContent(item.sample, item.outcome, card.result.resolvedContract, invalidOverlayReason),
      };
      payload = appendPriceActionWarnings(payload, card.payloadWarnings);
      attachments = onlyPngFiles(card.attachmentPaths);
      priceActionCards.push(cardResult);
    }
    item.payload = payload;
    const messageId = options.dryRun ? null : await postResearchDiscordReviewMessage(channelId as string, token as string, payload, attachments);
    if (!options.dryRun) messagesPosted += 1;
    if (!options.dryRun || options.writeDryRunState) {
      const entry = createResearchDiscordStateEntry({
        packHash: queue.packHash,
        reviewPackPath,
        sampleId: item.sample.sampleId,
        discordMessageId: messageId,
        discordChannelId: channelId || 'dry-run',
        labelOptions: usePriceActionReviewButtons ? PRICE_ACTION_REVIEW_LABELS : undefined,
        postedTextOnly: Boolean(priceActionConfig.config?.enabled && !cardResult?.attached),
        chartWithheld: Boolean(cardResult?.chartWithheld),
        chartWithheldReason: cardResult?.chartWithheldReason,
      });
      stateEntries.push(entry);
      currentState = appendResearchDiscordReviewState(currentState || emptyResearchDiscordReviewState(), [entry]);
      writeState(options.statePath, currentState);
    }
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
    priceActionCards,
    activeContract: priceActionConfig.activeContract,
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
    `Resolved active contract: ${result.activeContract?.instrument || 'not requested'}`,
    `Contract source: ${result.activeContract?.source || 'not requested'}`,
    ...(result.activeContract?.warnings || []).map((warning) => `Contract warning: ${warning}`),
    `PriceActionReviewCard PNGs: ${result.priceActionCards.length ? result.priceActionCards.map((card) => `${card.sampleId}=${card.pngPath || 'unavailable'}`).join(' | ') : 'not requested'}`,
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
