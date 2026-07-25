import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertNoExecutableLedgerFields } from './model-candidate-ledger';

type AuditWindowCode = 'LONDON' | 'AM' | 'PM';
type TriageBucket =
  | 'priority_1_clean_draw_delivery'
  | 'priority_2_clean_draw_failed_delivery'
  | 'priority_3_fvg_mss_delivery'
  | 'priority_4_fvg_mss_not_observed'
  | 'priority_5_low_quality_or_noisy';

interface CuratedSample {
  sampleId: string;
  sourceCandidateId: string;
  date: string;
  window: string;
  nyTime: string;
  symbol: string;
  classificationBucket: string;
  drawType: string;
  drawLevel: number | null;
  fvgOrInefficiencyPresent: boolean;
  marketStructureShiftPresent: boolean;
  sweepRaidPlusReclaimPresent: boolean;
  deliveryStatus: 'achieved' | 'failed' | 'not_observed';
  modelOneOverlap: boolean;
  raidReclaimOverlap: boolean;
  advisoryOnly: boolean;
  suggestedReviewLabels: string[];
  chartPath: string | null;
  reportPath: string | null;
  inclusionReasons: string[];
  researchOnly: true;
  boundary: 'research_only_not_execution_authority';
}

interface CuratedReviewPack {
  reportType: 'time_window_liquidity_delivery_curated_review_pack';
  generatedAt: string;
  symbol: string;
  from: string;
  to: string;
  windowStudied: AuditWindowCode;
  sourceAuditPath: string;
  boundary: 'research_only_not_execution_authority';
  researchOnlyWarning: string;
  samples: CuratedSample[];
}

interface AuditCandidate {
  candidateId: string;
  cleanDrawObserved?: boolean;
  expectedDeliveryHandles?: number;
  expectedDeliveryTicks?: number;
  deliveryAchieved?: boolean;
  failedDelivery?: boolean;
}

interface AuditReport {
  reportType: 'time_window_liquidity_delivery_audit';
  candidates: AuditCandidate[];
}

interface TriageOptions {
  symbol: string;
  from: string;
  to: string;
  window: AuditWindowCode;
  sourceCuratedPackPath: string;
  outDir: string;
  pretty: boolean;
  json: boolean;
}

interface TriageRecord {
  sampleId: string;
  sourceCandidateId: string;
  symbol: string;
  date: string;
  window: string;
  drawType: string;
  drawLevel: number | null;
  cleanDrawObserved: boolean;
  expectedDeliveryHandles: number;
  expectedDeliveryTicks: number;
  fvgOrInefficiencyPresent: boolean;
  marketStructureShiftPresent: boolean;
  sweepRaidPlusReclaimPresent: boolean;
  deliveryStatus: string;
  qualityBucket: TriageBucket;
  qualityRank: number;
  qualityScore: number;
  suggestedReviewLabels: string[];
  recommendation: 'review_first' | 'review_later' | 'low_priority';
  recommendationReason: string;
  researchOnly: true;
  labelApplied: false;
  boundary: 'research_only_not_execution_authority';
}

interface TriageOutputPaths {
  jsonPath: string;
  markdownPath: string;
}

export interface TimeWindowLiquidityDeliveryTriageReport {
  reportType: 'time_window_liquidity_delivery_advisory_only_triage';
  generatedAt: string;
  symbol: string;
  from: string;
  to: string;
  windowStudied: AuditWindowCode;
  sourceCuratedPackPath: string;
  sourceAuditPath: string | null;
  boundary: 'research_only_not_execution_authority';
  researchOnlyWarning: string;
  explicitExecutionWarning: 'This triage report does not apply labels, approve trades, or create execution authority.';
  labelOptionsForLaterReview: string[];
  summary: {
    advisoryOnlySamples: number;
    recommendedFirstReviewSubsetCount: number;
    bucketCounts: Record<TriageBucket, number>;
  };
  recommendedFirstReviewSubset: TriageRecord[];
  records: TriageRecord[];
  outputPaths: TriageOutputPaths;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_TWLD_DIR = path.join(__dirname, 'time-window-liquidity-delivery');
const DEFAULT_REVIEW_PACK_DIR = path.join(DEFAULT_TWLD_DIR, 'review-packs');
const DEFAULT_TRIAGE_DIR = path.join(DEFAULT_REVIEW_PACK_DIR, 'triage');
const RESEARCH_BOUNDARY = 'research_only_not_execution_authority' as const;
const RESEARCH_WARNING = 'Research-only. This triage report ranks advisory-only review samples and does not apply labels.';
const EXECUTION_WARNING = 'This triage report does not apply labels, approve trades, or create execution authority.' as const;
const BUCKETS: TriageBucket[] = [
  'priority_1_clean_draw_delivery',
  'priority_2_clean_draw_failed_delivery',
  'priority_3_fvg_mss_delivery',
  'priority_4_fvg_mss_not_observed',
  'priority_5_low_quality_or_noisy',
];
const LABEL_OPTIONS = [
  'strong_advisory_candidate',
  'covered_by_model_1',
  'covered_by_RAID_RECLAIM',
  'weak_or_noisy',
  'needs_chart_review',
  'reject_time_window_standalone',
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

function requireDate(value: string | null, flag: string): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${flag} must use YYYY-MM-DD.`);
  return value;
}

function parseWindow(value: string | null): AuditWindowCode {
  const normalized = (value || 'PM').toUpperCase();
  if (normalized !== 'AM' && normalized !== 'LONDON' && normalized !== 'PM') throw new Error('--window must be AM, LONDON, or PM.');
  return normalized;
}

function defaultCuratedPackPath(symbol: string, window: AuditWindowCode, from: string, to: string): string {
  return path.join(DEFAULT_REVIEW_PACK_DIR, `time-window-liquidity-delivery-${window}-curated-review-pack-${symbol}-${from}-to-${to}.json`);
}

export function parseTimeWindowLiquidityDeliveryTriageArgs(args = process.argv.slice(2)): TriageOptions {
  const symbol = (readFlag(args, '--symbol') || 'MES').toUpperCase();
  const window = parseWindow(readFlag(args, '--window'));
  const from = requireDate(readFlag(args, '--from') || '2018-01-01', '--from');
  const to = requireDate(readFlag(args, '--to') || '2026-05-31', '--to');
  return {
    symbol,
    from,
    to,
    window,
    sourceCuratedPackPath: readFlag(args, '--curated-pack') || defaultCuratedPackPath(symbol, window, from, to),
    outDir: readFlag(args, '--out') || DEFAULT_TRIAGE_DIR,
    pretty: hasFlag(args, '--pretty') || !hasFlag(args, '--json'),
    json: hasFlag(args, '--json'),
  };
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

function readOptionalJson<T>(file: string | null): T | null {
  if (!file || !existsSync(file)) return null;
  return readJson<T>(file);
}

function outputPaths(options: Pick<TriageOptions, 'symbol' | 'window' | 'from' | 'to' | 'outDir'>): TriageOutputPaths {
  const base = path.join(
    path.resolve(options.outDir),
    `time-window-liquidity-delivery-${options.window}-advisory-only-triage-${options.symbol}-${options.from}-to-${options.to}`,
  );
  return { jsonPath: `${base}.json`, markdownPath: `${base}.md` };
}

function drawImportance(drawType: string): number {
  if (/previous_day_(high|low)/i.test(drawType)) return 50;
  if (/previous_week_(high|low)/i.test(drawType)) return 45;
  if (/previous_session_(high|low)/i.test(drawType)) return 35;
  if (/opening_range_(high|low)/i.test(drawType)) return 25;
  if (/equal_(highs|lows)/i.test(drawType)) return 20;
  return 5;
}

function qualityBucket(sample: CuratedSample, audit: AuditCandidate | undefined): TriageBucket {
  const cleanDraw = audit?.cleanDrawObserved === true;
  const deliveryAchieved = audit?.deliveryAchieved === true || sample.deliveryStatus === 'achieved';
  const failedDelivery = audit?.failedDelivery === true || sample.deliveryStatus === 'failed';
  if (cleanDraw && deliveryAchieved) return 'priority_1_clean_draw_delivery';
  if (cleanDraw && failedDelivery) return 'priority_2_clean_draw_failed_delivery';
  if (!cleanDraw && sample.fvgOrInefficiencyPresent && sample.marketStructureShiftPresent && deliveryAchieved) return 'priority_3_fvg_mss_delivery';
  if (sample.fvgOrInefficiencyPresent && sample.marketStructureShiftPresent) return 'priority_4_fvg_mss_not_observed';
  return 'priority_5_low_quality_or_noisy';
}

function qualityScore(sample: CuratedSample, audit: AuditCandidate | undefined, bucket: TriageBucket): number {
  const cleanDraw = audit?.cleanDrawObserved === true;
  const deliveryAchieved = audit?.deliveryAchieved === true || sample.deliveryStatus === 'achieved';
  const failedDelivery = audit?.failedDelivery === true || sample.deliveryStatus === 'failed';
  return [
    BUCKETS.length - BUCKETS.indexOf(bucket),
    cleanDraw ? 1000 : 0,
    deliveryAchieved ? 700 : 0,
    failedDelivery ? 400 : 0,
    sample.fvgOrInefficiencyPresent ? 200 : 0,
    sample.marketStructureShiftPresent ? 175 : 0,
    sample.sweepRaidPlusReclaimPresent ? 125 : 0,
    Number(audit?.expectedDeliveryHandles || 0),
    drawImportance(sample.drawType),
  ].reduce((sum, value) => sum + value, 0);
}

function recommendationFor(bucket: TriageBucket): TriageRecord['recommendation'] {
  if (bucket === 'priority_1_clean_draw_delivery' || bucket === 'priority_2_clean_draw_failed_delivery' || bucket === 'priority_3_fvg_mss_delivery') return 'review_first';
  if (bucket === 'priority_4_fvg_mss_not_observed') return 'review_later';
  return 'low_priority';
}

function reasonFor(record: Pick<TriageRecord, 'qualityBucket' | 'cleanDrawObserved' | 'deliveryStatus' | 'fvgOrInefficiencyPresent' | 'marketStructureShiftPresent'>): string {
  if (record.qualityBucket === 'priority_1_clean_draw_delivery') return 'Clean draw and delivery achieved; review first as the highest-quality PM advisory-only evidence.';
  if (record.qualityBucket === 'priority_2_clean_draw_failed_delivery') return 'Clean draw but delivery failed; review early to understand PM failure mode.';
  if (record.qualityBucket === 'priority_3_fvg_mss_delivery') return 'FVG/inefficiency plus MSS and delivery achieved without a clean draw; useful secondary review candidate.';
  if (record.qualityBucket === 'priority_4_fvg_mss_not_observed') return 'FVG/inefficiency plus MSS is present, but delivery was not achieved; review later if more examples are needed.';
  return 'No clean draw and weak/noisy context; exclude from the first review subset by default.';
}

function bucketCounts(records: TriageRecord[]): Record<TriageBucket, number> {
  return Object.fromEntries(BUCKETS.map((bucket) => [bucket, records.filter((record) => record.qualityBucket === bucket).length])) as Record<TriageBucket, number>;
}

export function buildTimeWindowLiquidityDeliveryTriageReport(options: TriageOptions): TimeWindowLiquidityDeliveryTriageReport {
  const sourceCuratedPackPath = path.resolve(options.sourceCuratedPackPath);
  if (!existsSync(sourceCuratedPackPath)) throw new Error(`Curated review pack not found: ${sourceCuratedPackPath}`);
  const pack = readJson<CuratedReviewPack>(sourceCuratedPackPath);
  if (pack.reportType !== 'time_window_liquidity_delivery_curated_review_pack') throw new Error(`Source file is not a TWLD curated review pack: ${sourceCuratedPackPath}`);
  if (pack.symbol !== options.symbol || pack.windowStudied !== options.window) throw new Error(`Curated pack does not match requested ${options.symbol} ${options.window}.`);
  const sourceAuditPath = pack.sourceAuditPath ? path.resolve(pack.sourceAuditPath) : null;
  const audit = readOptionalJson<AuditReport>(sourceAuditPath);
  const auditById = new Map((audit?.candidates || []).map((candidate) => [candidate.candidateId, candidate]));
  const records = pack.samples
    .filter((sample) => sample.classificationBucket === 'advisory_only_samples')
    .map((sample) => {
      const auditCandidate = auditById.get(sample.sourceCandidateId);
      const bucket = qualityBucket(sample, auditCandidate);
      return {
        sampleId: sample.sampleId,
        sourceCandidateId: sample.sourceCandidateId,
        symbol: sample.symbol,
        date: sample.date,
        window: sample.window,
        drawType: sample.drawType,
        drawLevel: sample.drawLevel,
        cleanDrawObserved: auditCandidate?.cleanDrawObserved === true,
        expectedDeliveryHandles: Number(auditCandidate?.expectedDeliveryHandles || 0),
        expectedDeliveryTicks: Number(auditCandidate?.expectedDeliveryTicks || 0),
        fvgOrInefficiencyPresent: sample.fvgOrInefficiencyPresent,
        marketStructureShiftPresent: sample.marketStructureShiftPresent,
        sweepRaidPlusReclaimPresent: sample.sweepRaidPlusReclaimPresent,
        deliveryStatus: sample.deliveryStatus,
        qualityBucket: bucket,
        qualityRank: 0,
        qualityScore: qualityScore(sample, auditCandidate, bucket),
        suggestedReviewLabels: sample.suggestedReviewLabels,
        recommendation: recommendationFor(bucket),
        recommendationReason: '',
        researchOnly: true,
        labelApplied: false,
        boundary: RESEARCH_BOUNDARY,
      } satisfies TriageRecord;
    })
    .sort((a, b) =>
      BUCKETS.indexOf(a.qualityBucket) - BUCKETS.indexOf(b.qualityBucket) ||
      b.qualityScore - a.qualityScore ||
      a.date.localeCompare(b.date)
    )
    .map((record, index) => ({
      ...record,
      qualityRank: index + 1,
      recommendationReason: reasonFor(record),
    }));
  const recommendedFirstReviewSubset = records.filter((record) =>
    record.qualityBucket === 'priority_1_clean_draw_delivery' ||
    record.qualityBucket === 'priority_2_clean_draw_failed_delivery' ||
    (record.qualityBucket === 'priority_3_fvg_mss_delivery' &&
      records.filter((candidate) => candidate.qualityBucket === 'priority_3_fvg_mss_delivery' && candidate.qualityRank <= record.qualityRank).length <= 10)
  );
  const paths = outputPaths(options);
  const report: TimeWindowLiquidityDeliveryTriageReport = {
    reportType: 'time_window_liquidity_delivery_advisory_only_triage',
    generatedAt: new Date().toISOString(),
    symbol: options.symbol,
    from: options.from,
    to: options.to,
    windowStudied: options.window,
    sourceCuratedPackPath,
    sourceAuditPath,
    boundary: RESEARCH_BOUNDARY,
    researchOnlyWarning: RESEARCH_WARNING,
    explicitExecutionWarning: EXECUTION_WARNING,
    labelOptionsForLaterReview: LABEL_OPTIONS,
    summary: {
      advisoryOnlySamples: records.length,
      recommendedFirstReviewSubsetCount: recommendedFirstReviewSubset.length,
      bucketCounts: bucketCounts(records),
    },
    recommendedFirstReviewSubset,
    records,
    outputPaths: paths,
  };
  assertNoExecutableLedgerFields(report);
  return report;
}

function yesNo(value: boolean): string {
  return value ? 'Yes' : 'No';
}

function formatDrawLevel(value: number | null): string {
  return value === null ? 'Not recorded' : value.toFixed(2);
}

function renderRow(record: TriageRecord): string {
  return `| ${record.qualityRank} | ${record.sampleId} | ${record.date} | ${record.qualityBucket} | ${record.drawType} | ${formatDrawLevel(record.drawLevel)} | ${yesNo(record.cleanDrawObserved)} | ${record.deliveryStatus} | ${yesNo(record.fvgOrInefficiencyPresent)} | ${yesNo(record.marketStructureShiftPresent)} | ${yesNo(record.sweepRaidPlusReclaimPresent)} | ${record.expectedDeliveryHandles.toFixed(2)} | ${record.recommendation} |`;
}

export function renderTimeWindowLiquidityDeliveryTriageMarkdown(report: TimeWindowLiquidityDeliveryTriageReport): string {
  return [
    `# Time-Window Liquidity Delivery ${report.windowStudied} Advisory-Only Quality Triage - ${report.symbol}`,
    '',
    report.researchOnlyWarning,
    report.explicitExecutionWarning,
    '',
    `Source PM curated pack: ${report.sourceCuratedPackPath}`,
    `Source audit: ${report.sourceAuditPath || 'Not available'}`,
    `Date range: ${report.from} to ${report.to}`,
    `Window: ${report.windowStudied}`,
    `Boundary: ${report.boundary}`,
    '',
    '## Summary',
    `- Total advisory-only samples: ${report.summary.advisoryOnlySamples}`,
    `- Recommended first review subset: ${report.summary.recommendedFirstReviewSubsetCount}`,
    '',
    '## Bucket Counts',
    ...BUCKETS.map((bucket) => `- ${bucket}: ${report.summary.bucketCounts[bucket]}`),
    '',
    '## Recommended First Review Subset',
    '| Rank | Sample ID | Date | Bucket | Draw Type | Draw Level | Clean Draw | Delivery | FVG | MSS | Sweep/Reclaim | Expected Delivery Handles | Recommendation |',
    '|---:|---|---|---|---|---:|---:|---|---:|---:|---:|---:|---|',
    ...report.recommendedFirstReviewSubset.map(renderRow),
    report.recommendedFirstReviewSubset.length ? '' : '_No first-review samples selected._',
    '',
    '## Top Review Candidates',
    '| Rank | Sample ID | Date | Bucket | Draw Type | Draw Level | Clean Draw | Delivery | FVG | MSS | Sweep/Reclaim | Expected Delivery Handles | Recommendation |',
    '|---:|---|---|---|---|---:|---:|---|---:|---:|---:|---:|---|',
    ...report.records.slice(0, 20).map(renderRow),
    '',
    '## All Advisory-Only Samples By Bucket',
    ...BUCKETS.flatMap((bucket) => {
      const rows = report.records.filter((record) => record.qualityBucket === bucket);
      return [
        `### ${bucket}`,
        rows.length ? '| Rank | Sample ID | Date | Bucket | Draw Type | Draw Level | Clean Draw | Delivery | FVG | MSS | Sweep/Reclaim | Expected Delivery Handles | Recommendation |' : '_No samples in this bucket._',
        rows.length ? '|---:|---|---|---|---|---:|---:|---|---:|---:|---:|---:|---|' : '',
        ...rows.map(renderRow),
        '',
      ].filter(Boolean);
    }),
    '## Label Options For Later Review',
    ...report.labelOptionsForLaterReview.map((label) => `- ${label}`),
    '',
    'Research-only. This triage report does not apply labels, approve trades, approve models, create alerts, or create execution authority.',
  ].join('\n');
}

export function writeTimeWindowLiquidityDeliveryTriageReport(report: TimeWindowLiquidityDeliveryTriageReport): void {
  mkdirSync(path.dirname(report.outputPaths.jsonPath), { recursive: true });
  writeFileSync(report.outputPaths.jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(report.outputPaths.markdownPath, `${renderTimeWindowLiquidityDeliveryTriageMarkdown(report)}\n`, 'utf8');
}

export async function runTimeWindowLiquidityDeliveryTriageCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseTimeWindowLiquidityDeliveryTriageArgs(rawArgs);
  const report = buildTimeWindowLiquidityDeliveryTriageReport(options);
  writeTimeWindowLiquidityDeliveryTriageReport(report);
  if (options.json) console.log(JSON.stringify(report, null, 2));
  if (options.pretty) {
    console.log([
      '[TIME-WINDOW LIQUIDITY DELIVERY ADVISORY-ONLY TRIAGE]',
      `Symbol: ${report.symbol}`,
      `Date range: ${report.from} to ${report.to}`,
      `Window: ${report.windowStudied}`,
      `Source curated pack: ${report.sourceCuratedPackPath}`,
      `JSON: ${report.outputPaths.jsonPath}`,
      `Markdown: ${report.outputPaths.markdownPath}`,
      `Advisory-only samples: ${report.summary.advisoryOnlySamples}`,
      ...BUCKETS.map((bucket) => `${bucket}: ${report.summary.bucketCounts[bucket]}`),
      `Recommended first review subset: ${report.summary.recommendedFirstReviewSubsetCount}`,
      report.explicitExecutionWarning,
    ].join('\n'));
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tools/automation/time-window-liquidity-delivery-triage.ts')) {
  runTimeWindowLiquidityDeliveryTriageCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
