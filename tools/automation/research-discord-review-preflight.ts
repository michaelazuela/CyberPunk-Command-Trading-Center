import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getNinjaBridgeHealth, type NinjaBridgeHealth } from '../../src/lib/ninjaTraderBridge';
import {
  assertNoExecutableResearchDiscordFields,
  type ResearchDiscordMessagePayload,
} from '../../src/agents/researchDiscordReviewQueueAgent';
import {
  parseResearchDiscordReviewPostArgs,
  runResearchDiscordReviewPostWorkflow,
  type ResearchDiscordReviewPostOptions,
  type WorkflowResult,
} from './research-discord-review-post';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

type PreflightStatus = 'PREFLIGHT PASS' | 'PREFLIGHT WARN' | 'PREFLIGHT FAIL';

export interface ResearchDiscordReviewPreflightOptions extends ResearchDiscordReviewPostOptions {
  rawFrom: string;
  rawTo: string;
  bridgeUrl: string;
}

interface FileFingerprint {
  exists: boolean;
  size: number;
  modifiedMs: number;
}

export interface ResearchDiscordReviewPreflightDependencies {
  runWorkflow?: typeof runResearchDiscordReviewPostWorkflow;
  getBridgeHealth?: typeof getNinjaBridgeHealth;
  env?: Record<string, string | undefined>;
  fingerprintFile?: (file: string) => Promise<FileFingerprint | null>;
}

export interface ResearchDiscordReviewSamplePreflight {
  sampleId: string;
  cardPng: string | null;
  cardAttachable: boolean;
  visualQuality: string;
  directionConsistency: string;
  candleRangeCoveragePct: number | null;
  labelCollisionRisk: string;
  xAxis5m: boolean;
  yAxis5m: boolean;
  xAxis15m: boolean;
  yAxis15m: boolean;
  overlayLevelsAttempted: number;
  warnings: string[];
  chartWithheldReason: string | null;
}

export interface ResearchDiscordReviewPreflightReport {
  status: PreflightStatus;
  failures: string[];
  warnings: string[];
  options: ResearchDiscordReviewPreflightOptions;
  bridgeHealth: {
    reachable: boolean;
    readOnly: boolean | 'unknown';
    defaultInstrument: string | null;
    error: string | null;
  };
  workflow: WorkflowResult;
  selectedSampleIds: string[];
  sampleChecks: ResearchDiscordReviewSamplePreflight[];
  discordPreview: {
    pass: boolean;
    pngOnly: boolean;
    buttons: string;
    summaryPostSkipped: boolean;
    researchOnlyFooter: boolean;
    conciseReviewText: boolean;
    noExecutablePayloadKeys: boolean;
  };
  discordConfig: {
    botTokenConfigured: boolean;
    channelConfigured: boolean;
  };
  attachmentFilesReadable: boolean;
  missingAttachmentFiles: string[];
  stateChanged: boolean;
  nextLiveCommand: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_BRIDGE_URL = 'http://127.0.0.1:8765';
const OLD_PRICE_ACTION_BUTTONS = new Set([
  'Keep Advisory',
  'Reject',
  'Model 1 Review',
  'Turtle Soup Review',
  'Human Rule Review Queue',
  'New Model Candidate',
  'Insufficient Context',
]);
const REQUIRED_PRICE_ACTION_TEXT = [
  '[PRICE ACTION REVIEW]',
  'Hypothetical Overlay:',
  'Entry:',
  'Stop Loss:',
  'T1:',
  'T2:',
  'Would it have worked?:',
  'Research-only. This does not approve execution, change rules, or create trades.',
];

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

async function fingerprintFile(file: string): Promise<FileFingerprint | null> {
  try {
    const stats = await fs.stat(file);
    return { exists: true, size: stats.size, modifiedMs: stats.mtimeMs };
  } catch {
    return null;
  }
}

function sameFingerprint(left: FileFingerprint | null, right: FileFingerprint | null): boolean {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return left.exists === right.exists && left.size === right.size && left.modifiedMs === right.modifiedMs;
}

export function parseResearchDiscordReviewPreflightArgs(rawArgs = process.argv.slice(2)): ResearchDiscordReviewPreflightOptions {
  const postArgs = [...rawArgs];
  if (!hasFlag(postArgs, '--with-price-action-cards')) postArgs.push('--with-price-action-cards');
  if (!hasFlag(postArgs, '--dry-run')) postArgs.push('--dry-run');
  const parsed = parseResearchDiscordReviewPostArgs(postArgs);
  return {
    ...parsed,
    dryRun: true,
    withPriceActionCards: true,
    rawFrom: readFlag(rawArgs, '--from') || '2026-01-01',
    rawTo: readFlag(rawArgs, '--to') || 'today',
    bridgeUrl: readFlag(rawArgs, '--bridge-url') || process.env.NINJATRADER_BRIDGE_URL || DEFAULT_BRIDGE_URL,
  };
}

async function readBridgeHealth(
  bridgeUrl: string,
  getBridgeHealth: typeof getNinjaBridgeHealth,
): Promise<ResearchDiscordReviewPreflightReport['bridgeHealth']> {
  try {
    const health = await getBridgeHealth(bridgeUrl) as NinjaBridgeHealth;
    return {
      reachable: health.ok !== false,
      readOnly: typeof health.readOnly === 'boolean' ? health.readOnly : 'unknown',
      defaultInstrument: health.defaultInstrument || null,
      error: health.error || null,
    };
  } catch (error) {
    return {
      reachable: false,
      readOnly: 'unknown',
      defaultInstrument: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function buttonLabels(payload: ResearchDiscordMessagePayload): string[] {
  return (payload.components || []).flatMap((row) => row.components.map((button) => button.label));
}

function payloadHasExpectedButtons(payload: ResearchDiscordMessagePayload): boolean {
  const labels = buttonLabels(payload);
  return labels.length === 2 && labels[0] === 'Approved' && labels[1] === 'Not Approved';
}

function payloadHasOldButtons(payload: ResearchDiscordMessagePayload): boolean {
  return buttonLabels(payload).some((label) => OLD_PRICE_ACTION_BUTTONS.has(label));
}

function payloadHasConciseReviewText(payload: ResearchDiscordMessagePayload): boolean {
  return REQUIRED_PRICE_ACTION_TEXT.every((required) => payload.content.includes(required));
}

async function fileReadable(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function evaluateAttachmentFiles(files: string[]): Promise<{ readable: boolean; missing: string[] }> {
  const missing: string[] = [];
  for (const file of files) {
    if (!(await fileReadable(file))) missing.push(file);
  }
  return { readable: missing.length === 0, missing };
}

function evaluateDiscordPayloads(payloads: ResearchDiscordMessagePayload[]): ResearchDiscordReviewPreflightReport['discordPreview'] {
  let noExecutablePayloadKeys = true;
  try {
    assertNoExecutableResearchDiscordFields(payloads);
  } catch {
    noExecutablePayloadKeys = false;
  }
  const expectedButtons = payloads.every(payloadHasExpectedButtons);
  const oldButtonsAbsent = payloads.every((payload) => !payloadHasOldButtons(payload));
  const researchOnlyFooter = payloads.every((payload) => payload.content.includes('Research-only. This does not approve execution, change rules, or create trades.'));
  const conciseReviewText = payloads.every(payloadHasConciseReviewText);
  return {
    pass: expectedButtons && oldButtonsAbsent && researchOnlyFooter && conciseReviewText && noExecutablePayloadKeys,
    pngOnly: true,
    buttons: expectedButtons && oldButtonsAbsent ? 'Approved / Not Approved' : 'invalid',
    summaryPostSkipped: true,
    researchOnlyFooter,
    conciseReviewText,
    noExecutablePayloadKeys,
  };
}

function buildSampleChecks(workflow: WorkflowResult): ResearchDiscordReviewSamplePreflight[] {
  return workflow.publishResult.priceActionCards.map((card) => ({
    sampleId: card.sampleId,
    cardPng: card.pngPath,
    cardAttachable: card.cardAttachable === true && card.attached === true,
    visualQuality: card.visualQuality || 'unknown',
    directionConsistency: card.directionConsistency || 'unknown',
    candleRangeCoveragePct: typeof card.candleRangeCoveragePct === 'number' ? card.candleRangeCoveragePct : null,
    labelCollisionRisk: card.labelCollisionRisk || 'unknown',
    xAxis5m: card.mainChart?.xAxisLabelsRendered === true,
    yAxis5m: card.mainChart?.yAxisLabelsRendered === true,
    xAxis15m: card.contextChart?.xAxisLabelsRendered === true,
    yAxis15m: card.contextChart?.yAxisLabelsRendered === true,
    overlayLevelsAttempted: card.mainChart?.overlayLevelsAttempted || 0,
    warnings: card.warnings,
    chartWithheldReason: card.chartWithheldReason || null,
  }));
}

function selectedSampleIds(workflow: WorkflowResult): string[] {
  const fromCards = workflow.publishResult.priceActionCards.map((card) => card.sampleId);
  if (fromCards.length) return fromCards;
  return workflow.publishResult.payloads.map((payload) => {
    const match = payload.content.match(/\[PRICE ACTION REVIEW\]\s+([^\n]+)/);
    return match?.[1]?.trim() || 'unknown-sample';
  });
}

function buildNextLiveCommand(options: ResearchDiscordReviewPreflightOptions): string {
  return [
    'npm run research:discord-review:post --',
    `--from ${options.rawFrom}`,
    `--to ${options.rawTo}`,
    `--symbol ${options.symbol}`,
    '--with-price-action-cards',
    `--limit ${options.limit}`,
    '--pretty',
  ].join(' ');
}

export async function buildResearchDiscordReviewPreflightReport(
  options: ResearchDiscordReviewPreflightOptions,
  dependencies: ResearchDiscordReviewPreflightDependencies = {},
): Promise<ResearchDiscordReviewPreflightReport> {
  const env = dependencies.env || process.env;
  const readFingerprint = dependencies.fingerprintFile || fingerprintFile;
  const runWorkflow = dependencies.runWorkflow || runResearchDiscordReviewPostWorkflow;
  const getBridgeHealth = dependencies.getBridgeHealth || getNinjaBridgeHealth;
  const beforeState = await readFingerprint(options.statePath);
  const bridgeHealth = await readBridgeHealth(options.bridgeUrl, getBridgeHealth);
  const workflow = await runWorkflow({
    ...options,
    dryRun: true,
    withPriceActionCards: true,
  });
  const afterState = await readFingerprint(options.statePath);
  const stateChanged = !sameFingerprint(beforeState, afterState);
  const sampleChecks = buildSampleChecks(workflow);
  const selected = selectedSampleIds(workflow);
  const discordPreview = evaluateDiscordPayloads(workflow.publishResult.payloads);
  discordPreview.summaryPostSkipped = workflow.summaryMessagePosted === false && Boolean(workflow.summaryPostSkippedReason);
  const attachmentPaths = workflow.publishResult.priceActionCards
    .filter((card) => card.attached && card.pngPath)
    .map((card) => card.pngPath as string);
  const attachmentReadiness = await evaluateAttachmentFiles(attachmentPaths);
  const discordConfig = {
    botTokenConfigured: Boolean(env.RESEARCH_REVIEW_DISCORD_BOT_TOKEN),
    channelConfigured: Boolean(env.RESEARCH_REVIEW_DISCORD_CHANNEL_ID),
  };

  const failures: string[] = [];
  const warnings: string[] = [];
  if (!workflow.samplesSelected && workflow.remainingBacklog > 0) failures.push('Selected samples could not be resolved.');
  if (attachmentPaths.some((file) => path.extname(file).toLowerCase() === '.svg')) {
    failures.push('Discord payload preview includes an SVG attachment.');
  }
  discordPreview.pngOnly = attachmentPaths.every((file) => path.extname(file).toLowerCase() === '.png');
  if (!discordPreview.pngOnly) failures.push('Discord payload preview is not PNG-only.');
  if (discordPreview.buttons !== 'Approved / Not Approved') failures.push('Discord payload preview does not use Approved / Not Approved buttons only.');
  if (!discordPreview.summaryPostSkipped) failures.push('Summary chart post would not be skipped by default.');
  if (!discordPreview.researchOnlyFooter) failures.push('Discord payload preview is missing research-only footer text.');
  if (!discordPreview.conciseReviewText) failures.push('Discord payload preview is missing concise review fields.');
  if (!discordPreview.noExecutablePayloadKeys) failures.push('Discord payload preview contains prohibited executable payload keys.');
  if (!attachmentReadiness.readable) failures.push('One or more attachment files are missing or unreadable.');
  if (!discordConfig.botTokenConfigured) failures.push('Discord bot token is not configured for live posting readiness.');
  if (!discordConfig.channelConfigured) failures.push('Discord channel is not configured for live posting readiness.');
  if (stateChanged) failures.push('Preflight changed the Discord review state file.');

  for (const sample of sampleChecks) {
    const attached = workflow.publishResult.priceActionCards.find((card) => card.sampleId === sample.sampleId)?.attached === true;
    if (attached && (!sample.xAxis5m || !sample.yAxis5m || !sample.xAxis15m || !sample.yAxis15m)) {
      failures.push(`${sample.sampleId}: attached card is missing axis metadata.`);
    }
    if (attached && (sample.visualQuality === 'fail' || sample.cardAttachable === false)) {
      failures.push(`${sample.sampleId}: visually failed card would still be attached.`);
    }
    if (sample.chartWithheldReason) warnings.push(`${sample.sampleId}: ${sample.chartWithheldReason}`);
  }

  if (!bridgeHealth.reachable) {
    const missingCards = workflow.publishResult.priceActionCards.filter((card) => card.dataSource === 'missing');
    if (missingCards.length) {
      failures.push(`Bridge unavailable and cache/history is insufficient for ${missingCards.length} selected sample(s).`);
    } else {
      warnings.push('Bridge unavailable; selected samples appear to be satisfied by cached/local data.');
    }
  }
  if (workflow.activeContract?.source === 'fallback') warnings.push('Active contract fallback was used instead of bridge-health.');
  if (!workflow.samplesSelected && workflow.remainingBacklog === 0) warnings.push('No samples remain in backlog.');

  const status: PreflightStatus = failures.length ? 'PREFLIGHT FAIL' : warnings.length ? 'PREFLIGHT WARN' : 'PREFLIGHT PASS';
  return {
    status,
    failures,
    warnings,
    options,
    bridgeHealth,
    workflow,
    selectedSampleIds: selected,
    sampleChecks,
    discordPreview,
    discordConfig,
    attachmentFilesReadable: attachmentReadiness.readable,
    missingAttachmentFiles: attachmentReadiness.missing,
    stateChanged,
    nextLiveCommand: buildNextLiveCommand(options),
  };
}

export function renderResearchDiscordReviewPreflightReport(report: ResearchDiscordReviewPreflightReport): string {
  const lines = [
    'Quant Desk Historical Review Preflight',
    '',
    `Date range: ${report.workflow.from} to ${report.workflow.to}`,
    `Symbol: ${report.workflow.symbol}`,
    `Limit: ${report.options.limit}`,
    `Contract: ${report.workflow.activeContract?.instrument || 'not resolved'}`,
    `Contract source: ${report.workflow.activeContract?.source || 'not resolved'}`,
    `Bridge URL: ${report.workflow.activeContract?.bridgeUrl || report.options.bridgeUrl}`,
    `Bridge reachable: ${report.bridgeHealth.reachable ? 'yes' : 'no'}`,
    `Bridge readOnly: ${String(report.bridgeHealth.readOnly)}`,
    `Default instrument: ${report.bridgeHealth.defaultInstrument || 'not provided'}`,
    ...(report.bridgeHealth.error ? [`Bridge warning: ${report.bridgeHealth.error}`] : []),
    '',
    `Review pack: ${report.workflow.reviewPackPath}`,
    `Reviewed output: ${report.workflow.reviewedOutputPath}`,
    `Total samples available: ${report.workflow.samplesAvailable}`,
    `Already posted: ${report.workflow.skippedDuplicates}`,
    `Selected this batch: ${report.workflow.samplesSelected}`,
    `Remaining backlog after this batch: ${report.workflow.remainingBacklog}`,
    'Selected next batch:',
    ...(report.selectedSampleIds.length
      ? report.selectedSampleIds.map((sampleId, index) => `${index + 1}. ${sampleId}`)
      : ['none']),
    '',
    'Sample checks:',
    ...(report.sampleChecks.length
      ? report.sampleChecks.map((sample) => `- ${sample.sampleId}: ${[
          sample.cardAttachable ? 'attachable PNG' : 'text-only',
          `axes=${sample.xAxis5m && sample.yAxis5m && sample.xAxis15m && sample.yAxis15m ? 'pass' : 'not attachable or fail'}`,
          `quality=${sample.visualQuality}`,
          `direction=${sample.directionConsistency}`,
          `coverage=${sample.candleRangeCoveragePct === null ? 'n/a' : `${sample.candleRangeCoveragePct.toFixed(1)}%`}`,
          `labelCollision=${sample.labelCollisionRisk}`,
          sample.chartWithheldReason ? `withheld=${sample.chartWithheldReason}` : null,
        ].filter(Boolean).join('; ')}`)
      : ['- none']),
    '',
    'Discord preview:',
    `Summary post skipped: ${report.discordPreview.summaryPostSkipped ? 'yes' : 'no'}`,
    `PNG only: ${report.discordPreview.pngOnly ? 'pass' : 'fail'}`,
    `Buttons: ${report.discordPreview.buttons}`,
    `Research-only footer: ${report.discordPreview.researchOnlyFooter ? 'yes' : 'no'}`,
    `Concise review text: ${report.discordPreview.conciseReviewText ? 'yes' : 'no'}`,
    `Executable payload keys: ${report.discordPreview.noExecutablePayloadKeys ? 'none' : 'found'}`,
    '',
    'Discord config:',
    `Bot token configured: ${report.discordConfig.botTokenConfigured ? 'yes' : 'no'}`,
    `Channel configured: ${report.discordConfig.channelConfigured ? 'yes' : 'no'}`,
    `Attachment files readable: ${report.attachmentFilesReadable ? 'yes' : 'no'}`,
    ...(report.missingAttachmentFiles.length ? ['Missing attachment files:', ...report.missingAttachmentFiles.map((file) => `- ${file}`)] : []),
    `State changed during preflight: ${report.stateChanged ? 'yes' : 'no'}`,
    '',
    'Warnings:',
    ...(report.warnings.length ? report.warnings.map((warning) => `- ${warning}`) : ['- none']),
    'Failures:',
    ...(report.failures.length ? report.failures.map((failure) => `- ${failure}`) : ['- none']),
    '',
    report.status,
    '',
    `Next live command: ${report.nextLiveCommand}`,
    '',
    'Research-only. This does not approve execution, change rules, or create trades.',
  ];
  return lines.join('\n');
}

export async function runResearchDiscordReviewPreflightCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseResearchDiscordReviewPreflightArgs(rawArgs);
  const report = await buildResearchDiscordReviewPreflightReport(options);
  if (options.json) console.log(JSON.stringify(report, null, 2));
  if (options.pretty) console.log(renderResearchDiscordReviewPreflightReport(report));
  if (report.status === 'PREFLIGHT FAIL') process.exitCode = 1;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tools/automation/research-discord-review-preflight.ts')) {
  runResearchDiscordReviewPreflightCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
