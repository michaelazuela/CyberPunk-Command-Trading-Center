import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildHistoricalResearchBackfillInput,
  parseResearchBackfillArgs,
} from './research-backfill';
import { runHistoricalResearchBackfill } from '../../src/agents/historicalResearchBackfillAgent';
import { createResearchSampleReviewPack } from '../../src/agents/researchSampleReviewAgent';
import {
  extractOutcomeInputFromSource,
  runResearchOutcomeMath,
} from '../../src/agents/researchOutcomeMathAgent';
import { buildPriceActionReviewCardModel } from '../../src/agents/priceActionReviewCardAgent';
import {
  DEFAULT_PRICE_ACTION_REVIEW_CARD_DIR,
  renderPriceActionReviewCardWithMetadata,
  type PriceActionReviewCardRenderMetadata,
} from './price-action-review-card-renderer';
import {
  resolveActiveBridgeInstrument,
  resolveResearchPriceActionBars,
} from './research-price-action-bars';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

type Instrument = 'MES' | 'MNQ';

interface ValidateOptions {
  sampleId: string | null;
  from: string;
  to: string;
  symbol: Instrument;
  pretty: boolean;
  json: boolean;
  sampleSize: number;
  bridgeUrl: string;
  outputDir: string;
}

interface ValidateResult {
  sampleId: string;
  from: string;
  to: string;
  symbol: Instrument;
  contract: string;
  contractSource: string;
  dataSource: string;
  outputPath: string;
  renderedPng: boolean;
  renderedSvg: false;
  mainChart: PriceActionReviewCardRenderMetadata['mainChart'];
  contextChart: PriceActionReviewCardRenderMetadata['contextChart'];
  overlayLevelsAttempted: number;
  overlayLevelsRendered: number;
  warnings: string[];
  researchOnly: true;
  executionApproved: false;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function dateFlag(value: string | null, flag: string): string {
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
  if (!Number.isFinite(parsed) || parsed < 1) throw new Error(`${flag} must be a positive integer.`);
  return parsed;
}

export function parsePriceActionReviewCardValidateArgs(args = process.argv.slice(2)): ValidateOptions {
  return {
    sampleId: readFlag(args, '--sample-id'),
    from: dateFlag(readFlag(args, '--from') || '2026-01-01', '--from'),
    to: dateFlag(readFlag(args, '--to') || 'today', '--to'),
    symbol: parseInstrument(readFlag(args, '--symbol') || readFlag(args, '--instrument')),
    pretty: hasFlag(args, '--pretty') || !hasFlag(args, '--json'),
    json: hasFlag(args, '--json'),
    sampleSize: numberFlag(args, '--sample-size', 30),
    bridgeUrl: readFlag(args, '--bridge-url') || process.env.NINJATRADER_BRIDGE_URL || 'http://127.0.0.1:8765',
    outputDir: readFlag(args, '--output-dir') || path.join(DEFAULT_PRICE_ACTION_REVIEW_CARD_DIR, 'validation'),
  };
}

function safeFilePart(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 120) || 'sample';
}

export async function validatePriceActionReviewCardAxes(options: ValidateOptions): Promise<ValidateResult> {
  const backfillArgs = [
    '--from', options.from,
    '--to', options.to,
    '--instrument', options.symbol,
    '--pretty',
  ];
  const backfillOptions = parseResearchBackfillArgs(backfillArgs);
  const backfillInput = await buildHistoricalResearchBackfillInput(backfillOptions);
  const backfillReport = runHistoricalResearchBackfill(backfillInput);
  const reviewPack = createResearchSampleReviewPack({
    instrument: options.symbol,
    concept: 'all',
    sampleSize: options.sampleSize,
    sourceReports: [{ path: `validation-${options.symbol}-${options.from}-to-${options.to}.json`, report: backfillReport }],
  });
  const sample = options.sampleId
    ? reviewPack.samples.find((candidate) => candidate.sampleId === options.sampleId)
    : reviewPack.samples[0];
  if (!sample) throw new Error(`Review sample not found for validation: ${options.sampleId || 'first available sample'}`);

  const outcomeInput = extractOutcomeInputFromSource(`validation-${options.symbol}-${options.from}-to-${options.to}.json`, backfillReport, options.symbol);
  const outcomeReport = runResearchOutcomeMath(outcomeInput);
  const outcome = outcomeReport.candidateOutcomes.find((candidate) =>
    candidate.candidateId === sample.sampleId ||
    (candidate.concept === sample.concept && candidate.date === sample.date && candidate.time === sample.time)
  ) || null;

  const contractResolution = await resolveActiveBridgeInstrument({ bridgeUrl: options.bridgeUrl });
  const bars = await resolveResearchPriceActionBars(sample, {
    symbol: options.symbol,
    bridgeInstrument: contractResolution.instrument,
    bridgeUrl: contractResolution.bridgeUrl,
  });
  const model = buildPriceActionReviewCardModel({
    sample,
    overlay: outcome?.hypotheticalOutcomeOverlay || null,
    bars5m: bars.bars5m,
    bars15m: bars.bars15m,
    symbol: options.symbol,
    contract: bars.resolvedContract,
    dateRange: { from: options.from, to: options.to },
  });
  const renderResult = await renderPriceActionReviewCardWithMetadata({
    model,
    outputDir: options.outputDir,
    filePrefix: [
      'price-action-review-card-axis-validation',
      safeFilePart(options.symbol),
      `${safeFilePart(options.from)}-to-${safeFilePart(options.to)}`,
      safeFilePart(sample.sampleId),
    ].join('-'),
  });

  return {
    sampleId: sample.sampleId,
    from: options.from,
    to: options.to,
    symbol: options.symbol,
    contract: bars.resolvedContract,
    contractSource: contractResolution.source,
    dataSource: bars.dataSource,
    outputPath: renderResult.outputPath,
    renderedPng: renderResult.renderedPng,
    renderedSvg: false,
    mainChart: renderResult.mainChart,
    contextChart: renderResult.contextChart,
    overlayLevelsAttempted: renderResult.mainChart.overlayLevelsAttempted,
    overlayLevelsRendered: renderResult.mainChart.overlayLevelsRendered,
    warnings: [...contractResolution.warnings, ...bars.warnings, ...renderResult.warnings],
    researchOnly: true,
    executionApproved: false,
  };
}

function renderResult(result: ValidateResult): string {
  return [
    '[PRICE ACTION REVIEW CARD AXIS VALIDATION]',
    `Date range: ${result.from} to ${result.to}`,
    `Symbol: ${result.symbol}`,
    `Sample ID: ${result.sampleId}`,
    `Resolved contract: ${result.contract}`,
    `Contract source: ${result.contractSource}`,
    `Bar data source: ${result.dataSource}`,
    `PNG path: ${result.outputPath}`,
    `Rendered PNG: ${result.renderedPng ? 'yes' : 'no'}`,
    `Rendered SVG: ${result.renderedSvg ? 'yes' : 'no'}`,
    `5M chart: bars=${result.mainChart.barsRendered}; xAxis=${result.mainChart.xAxisLabelsRendered ? 'yes' : 'no'}; yAxis=${result.mainChart.yAxisLabelsRendered ? 'yes' : 'no'}; time=${result.mainChart.timeRange ? `${result.mainChart.timeRange.from} to ${result.mainChart.timeRange.to}` : 'unavailable'}; price=${result.mainChart.priceRange ? `${result.mainChart.priceRange.min.toFixed(2)} to ${result.mainChart.priceRange.max.toFixed(2)}` : 'unavailable'}`,
    `15M context: bars=${result.contextChart.barsRendered}; xAxis=${result.contextChart.xAxisLabelsRendered ? 'yes' : 'no'}; yAxis=${result.contextChart.yAxisLabelsRendered ? 'yes' : 'no'}; time=${result.contextChart.timeRange ? `${result.contextChart.timeRange.from} to ${result.contextChart.timeRange.to}` : 'unavailable'}; price=${result.contextChart.priceRange ? `${result.contextChart.priceRange.min.toFixed(2)} to ${result.contextChart.priceRange.max.toFixed(2)}` : 'unavailable'}`,
    `Overlay levels: attempted=${result.overlayLevelsAttempted}; rendered=${result.overlayLevelsRendered}`,
    'Warnings:',
    ...(result.warnings.length ? result.warnings.map((warning) => `- ${warning}`) : ['- none']),
    '',
    'Research-only. This does not approve execution, change rules, or create trades.',
  ].join('\n');
}

export async function runPriceActionReviewCardValidateCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parsePriceActionReviewCardValidateArgs(rawArgs);
  const result = await validatePriceActionReviewCardAxes(options);
  if (options.json) console.log(JSON.stringify(result, null, 2));
  if (options.pretty) console.log(renderResult(result));
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tools/automation/price-action-review-card-validate.ts')) {
  runPriceActionReviewCardValidateCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
