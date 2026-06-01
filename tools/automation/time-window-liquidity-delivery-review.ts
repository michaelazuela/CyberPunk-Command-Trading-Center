import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertNoExecutableLedgerFields } from './model-candidate-ledger';

type AuditWindowCode = 'LONDON' | 'AM' | 'PM';
type CuratedBucket =
  | 'advisory_only_samples'
  | 'best_clean_draw_delivery_achieved_samples'
  | 'clean_draw_failed_delivery_samples'
  | 'model_1_overlap_samples'
  | 'turtle_soup_overlap_samples';
type HumanReviewLabel =
  | 'strong_advisory_candidate'
  | 'covered_by_model_1'
  | 'covered_by_turtle_soup'
  | 'weak_or_noisy'
  | 'needs_chart_review'
  | 'reject_time_window_standalone';
type ChartEvidenceRecommendation =
  | 'upgrade_to_strong_advisory_candidate'
  | 'keep_needs_chart_review'
  | 'downgrade_to_weak_or_noisy'
  | 'reject_time_window_standalone'
  | 'covered_by_model_1'
  | 'covered_by_turtle_soup';

interface CuratedSample {
  sampleId: string;
  date: string;
  window: string;
  nyTime: string;
  symbol: string;
  classificationBucket: CuratedBucket;
  advisoryOnly: boolean;
  suggestedReviewLabels: HumanReviewLabel[];
  chartPath: string | null;
  reportPath: string | null;
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
  boundary: 'research_only_not_execution_authority';
  researchOnlyWarning: string;
  samples: CuratedSample[];
}

interface ReviewSafetyFields {
  activatesModel: false;
  approvesExecution: false;
  createsTrade: false;
  changesScanner: false;
  changesRules: false;
}

interface ReviewedSample {
  sampleId: string;
  sourceBucket: CuratedBucket;
  window: string;
  symbol: string;
  dateTime: string;
  suggestedLabel: HumanReviewLabel | null;
  finalHumanLabel: HumanReviewLabel | null;
  reviewer: string | null;
  reviewedAt: string | null;
  reviewerNotes: string | null;
  sourceCuratedPackPath: string;
  boundary: 'research_only_not_execution_authority';
  safety: ReviewSafetyFields;
}

interface ReviewSummary {
  totalSamples: number;
  reviewedSamples: number;
  unreviewedSamples: number;
  labelCounts: Record<HumanReviewLabel, number>;
  summaryRecommendation: string[];
}

interface ChartEvidenceApplicationRecord {
  sampleId: string;
  recommendation: ChartEvidenceRecommendation;
  previousFinalHumanLabel: HumanReviewLabel | null;
  appliedFinalHumanLabel: HumanReviewLabel;
  changed: boolean;
}

interface ChartEvidenceApplicationSummary {
  appliedAt: string;
  sourceChartEvidencePath: string;
  beforeSummary: ReviewSummary;
  afterSummary: ReviewSummary;
  samplesUpdated: ChartEvidenceApplicationRecord[];
  samplesPreserved: string[];
  note: string;
  boundary: 'research_only_not_execution_authority';
}

interface ReviewedOutputPaths {
  jsonPath: string;
  markdownPath: string;
}

interface HumanReviewReport {
  reportType: 'time_window_liquidity_delivery_human_review';
  generatedAt: string;
  symbol: string;
  from: string;
  to: string;
  windowStudied: AuditWindowCode;
  sourceCuratedPackPath: string;
  boundary: 'research_only_not_execution_authority';
  researchOnlyWarning: string;
  safety: ReviewSafetyFields;
  supportedLabels: HumanReviewLabel[];
  summary: ReviewSummary;
  samples: ReviewedSample[];
  outputPaths: ReviewedOutputPaths;
  chartEvidenceApplication?: ChartEvidenceApplicationSummary;
}

interface ReviewOptions {
  symbol: string;
  from: string;
  to: string;
  window: AuditWindowCode;
  sourceCuratedPackPath: string;
  outDir: string;
  reviewedPath: string | null;
  sampleId: string | null;
  label: HumanReviewLabel | null;
  reviewer: string | null;
  notes: string | null;
  applyChartEvidence?: boolean;
  chartEvidencePath?: string | null;
  pretty: boolean;
  json: boolean;
}

interface ChartEvidenceRecord {
  sampleId: string;
  recommendation: ChartEvidenceRecommendation;
}

interface ChartEvidenceReport {
  reportType: 'time_window_liquidity_delivery_chart_evidence_pack';
  symbol: string;
  from: string;
  to: string;
  windowStudied: AuditWindowCode;
  boundary: 'research_only_not_execution_authority';
  labelFilter: 'needs_chart_review';
  records: ChartEvidenceRecord[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_TWLD_DIR = path.join(__dirname, 'time-window-liquidity-delivery');
const DEFAULT_REVIEW_PACK_DIR = path.join(DEFAULT_TWLD_DIR, 'review-packs');
const DEFAULT_REVIEWED_DIR = path.join(DEFAULT_REVIEW_PACK_DIR, 'reviewed');
const DEFAULT_CHART_EVIDENCE_DIR = path.join(DEFAULT_TWLD_DIR, 'chart-evidence');
const RESEARCH_BOUNDARY = 'research_only_not_execution_authority' as const;
const REVIEW_WARNING = 'Research-only. This human review file does not approve trades and does not create execution authority.';
export const TWLD_HUMAN_REVIEW_LABELS: HumanReviewLabel[] = [
  'strong_advisory_candidate',
  'covered_by_model_1',
  'covered_by_turtle_soup',
  'weak_or_noisy',
  'needs_chart_review',
  'reject_time_window_standalone',
];

const SAFETY_FIELDS: ReviewSafetyFields = {
  activatesModel: false,
  approvesExecution: false,
  createsTrade: false,
  changesScanner: false,
  changesRules: false,
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

function requireDate(value: string | null, flag: string): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${flag} must use YYYY-MM-DD.`);
  return value;
}

function parseWindow(value: string | null): AuditWindowCode {
  const normalized = (value || 'AM').toUpperCase();
  if (normalized !== 'AM' && normalized !== 'LONDON' && normalized !== 'PM') throw new Error('--window must be AM, LONDON, or PM.');
  return normalized;
}

function parseLabel(value: string | null): HumanReviewLabel | null {
  if (!value) return null;
  if (!TWLD_HUMAN_REVIEW_LABELS.includes(value as HumanReviewLabel)) {
    throw new Error(`Unknown TWLD human review label: ${value}`);
  }
  return value as HumanReviewLabel;
}

function defaultCuratedPackPath(symbol: string, window: AuditWindowCode, from: string, to: string): string {
  return path.join(DEFAULT_REVIEW_PACK_DIR, `time-window-liquidity-delivery-${window}-curated-review-pack-${symbol}-${from}-to-${to}.json`);
}

function defaultChartEvidencePath(symbol: string, window: AuditWindowCode, from: string, to: string): string {
  return path.join(DEFAULT_CHART_EVIDENCE_DIR, `time-window-liquidity-delivery-${window}-chart-evidence-${symbol}-${from}-to-${to}.json`);
}

function outputPaths(options: Pick<ReviewOptions, 'symbol' | 'window' | 'from' | 'to' | 'outDir' | 'reviewedPath'>): ReviewedOutputPaths {
  if (options.reviewedPath) {
    const resolved = path.resolve(options.reviewedPath);
    const base = resolved.endsWith('.json') ? resolved.slice(0, -'.json'.length) : resolved;
    return { jsonPath: `${base}.json`, markdownPath: `${base}.md` };
  }
  const base = path.join(
    path.resolve(options.outDir),
    `time-window-liquidity-delivery-${options.window}-curated-review-pack-${options.symbol}-${options.from}-to-${options.to}.reviewed`
  );
  return { jsonPath: `${base}.json`, markdownPath: `${base}.md` };
}

export function parseTimeWindowLiquidityDeliveryReviewArgs(args = process.argv.slice(2)): ReviewOptions {
  const symbol = (readFlag(args, '--symbol') || 'MES').toUpperCase();
  const window = parseWindow(readFlag(args, '--window'));
  const from = requireDate(readFlag(args, '--from') || '2018-01-01', '--from');
  const to = requireDate(readFlag(args, '--to') || '2026-05-31', '--to');
  const sampleId = readFlag(args, '--sample');
  const label = parseLabel(readFlag(args, '--label'));
  if ((sampleId && !label) || (!sampleId && label)) throw new Error('--sample and --label must be provided together.');
  return {
    symbol,
    from,
    to,
    window,
    sourceCuratedPackPath: readFlag(args, '--curated-pack') || defaultCuratedPackPath(symbol, window, from, to),
    outDir: readFlag(args, '--out') || DEFAULT_REVIEWED_DIR,
    reviewedPath: readFlag(args, '--reviewed'),
    sampleId,
    label,
    reviewer: readFlag(args, '--reviewer'),
    notes: readFlag(args, '--notes'),
    applyChartEvidence: hasFlag(args, '--apply-chart-evidence'),
    chartEvidencePath: readFlag(args, '--chart-evidence'),
    pretty: hasFlag(args, '--pretty') || !hasFlag(args, '--json'),
    json: hasFlag(args, '--json'),
  };
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

function emptyLabelCounts(): Record<HumanReviewLabel, number> {
  return Object.fromEntries(TWLD_HUMAN_REVIEW_LABELS.map((label) => [label, 0])) as Record<HumanReviewLabel, number>;
}

function createReviewedSample(sample: CuratedSample, sourceCuratedPackPath: string): ReviewedSample {
  return {
    sampleId: sample.sampleId,
    sourceBucket: sample.classificationBucket,
    window: sample.window,
    symbol: sample.symbol,
    dateTime: [sample.date, sample.nyTime].filter(Boolean).join(' '),
    suggestedLabel: sample.suggestedReviewLabels[0] || null,
    finalHumanLabel: null,
    reviewer: null,
    reviewedAt: null,
    reviewerNotes: null,
    sourceCuratedPackPath,
    boundary: RESEARCH_BOUNDARY,
    safety: { ...SAFETY_FIELDS },
  };
}

function mergeWithCuratedSamples(existing: HumanReviewReport | null, pack: CuratedReviewPack, paths: ReviewedOutputPaths, sourceCuratedPackPath: string): HumanReviewReport {
  const existingById = new Map((existing?.samples || []).map((sample) => [sample.sampleId, sample]));
  const samples = pack.samples.map((sample) => {
    const previous = existingById.get(sample.sampleId);
    return previous
      ? {
          ...createReviewedSample(sample, sourceCuratedPackPath),
          finalHumanLabel: previous.finalHumanLabel,
          reviewer: previous.reviewer,
          reviewedAt: previous.reviewedAt,
          reviewerNotes: previous.reviewerNotes,
        }
      : createReviewedSample(sample, sourceCuratedPackPath);
  });
  const report: HumanReviewReport = {
    reportType: 'time_window_liquidity_delivery_human_review',
    generatedAt: new Date().toISOString(),
    symbol: pack.symbol,
    from: pack.from,
    to: pack.to,
    windowStudied: pack.windowStudied,
    sourceCuratedPackPath,
    boundary: RESEARCH_BOUNDARY,
    researchOnlyWarning: REVIEW_WARNING,
    safety: { ...SAFETY_FIELDS },
    supportedLabels: TWLD_HUMAN_REVIEW_LABELS,
    summary: summarize(samples),
    samples,
    outputPaths: paths,
  };
  assertNoExecutableLedgerFields(report);
  return report;
}

function summarize(samples: ReviewedSample[]): ReviewSummary {
  const labelCounts = emptyLabelCounts();
  for (const sample of samples) {
    if (sample.finalHumanLabel) labelCounts[sample.finalHumanLabel] += 1;
  }
  const reviewedSamples = samples.filter((sample) => sample.finalHumanLabel).length;
  return {
    totalSamples: samples.length,
    reviewedSamples,
    unreviewedSamples: samples.length - reviewedSamples,
    labelCounts,
    summaryRecommendation: buildSummaryRecommendation(samples, labelCounts),
  };
}

function buildSummaryRecommendation(samples: ReviewedSample[], labelCounts: Record<HumanReviewLabel, number>): string[] {
  const recommendations = ['No automatic promotion is created. Review labels remain research-only.'];
  const advisoryReviewed = samples.filter((sample) => sample.sourceBucket === 'advisory_only_samples' && sample.finalHumanLabel);
  if (advisoryReviewed.length > 0) {
    const weakOrRejected = advisoryReviewed.filter((sample) => sample.finalHumanLabel === 'weak_or_noisy' || sample.finalHumanLabel === 'reject_time_window_standalone').length;
    const coveredByExisting = advisoryReviewed.filter((sample) => sample.finalHumanLabel === 'covered_by_model_1' || sample.finalHumanLabel === 'covered_by_turtle_soup').length;
    const strong = advisoryReviewed.filter((sample) => sample.finalHumanLabel === 'strong_advisory_candidate').length;
    if (weakOrRejected > advisoryReviewed.length / 2) recommendations.push('Most reviewed advisory-only samples are weak or rejected; keep AM TWLD advisory-only.');
    if (coveredByExisting > advisoryReviewed.length / 2) recommendations.push('Most reviewed advisory-only samples are covered by existing models; treat AM TWLD as context for existing models only.');
    if (strong >= 2) recommendations.push('Multiple advisory-only samples are strong; collect more examples, not promotion.');
  }
  if (labelCounts.needs_chart_review >= 5 || (labelCounts.needs_chart_review > 0 && labelCounts.needs_chart_review >= Math.ceil(samples.length / 2))) {
    recommendations.push('Many samples need chart review; generate or attach charts before deciding.');
  }
  return recommendations;
}

function labelFromChartEvidenceRecommendation(recommendation: ChartEvidenceRecommendation): HumanReviewLabel {
  if (recommendation === 'reject_time_window_standalone') return 'reject_time_window_standalone';
  if (recommendation === 'keep_needs_chart_review') return 'needs_chart_review';
  if (recommendation === 'upgrade_to_strong_advisory_candidate') return 'strong_advisory_candidate';
  if (recommendation === 'downgrade_to_weak_or_noisy') return 'weak_or_noisy';
  if (recommendation === 'covered_by_model_1') return 'covered_by_model_1';
  if (recommendation === 'covered_by_turtle_soup') return 'covered_by_turtle_soup';
  throw new Error(`Unsupported chart evidence recommendation: ${recommendation}`);
}

function isChartEvidenceRecommendation(value: string): value is ChartEvidenceRecommendation {
  return [
    'upgrade_to_strong_advisory_candidate',
    'keep_needs_chart_review',
    'downgrade_to_weak_or_noisy',
    'reject_time_window_standalone',
    'covered_by_model_1',
    'covered_by_turtle_soup',
  ].includes(value);
}

export function applyTimeWindowLiquidityDeliveryChartEvidenceLabels(
  report: HumanReviewReport,
  chartEvidencePath: string,
  appliedAt = new Date().toISOString(),
): HumanReviewReport {
  const resolvedChartEvidencePath = path.resolve(chartEvidencePath);
  if (!existsSync(resolvedChartEvidencePath)) throw new Error(`Chart evidence file not found: ${resolvedChartEvidencePath}`);
  const evidence = readJson<ChartEvidenceReport>(resolvedChartEvidencePath);
  if (evidence.reportType !== 'time_window_liquidity_delivery_chart_evidence_pack') throw new Error(`Source file is not a TWLD chart evidence pack: ${resolvedChartEvidencePath}`);
  if (evidence.symbol !== report.symbol || evidence.windowStudied !== report.windowStudied) throw new Error(`Chart evidence file does not match reviewed ${report.symbol} ${report.windowStudied}.`);
  if (evidence.labelFilter !== 'needs_chart_review') throw new Error('Chart evidence file must be filtered to needs_chart_review samples.');

  const beforeSummary = summarize(report.samples);
  const records = evidence.records.map((record) => {
    if (!isChartEvidenceRecommendation(record.recommendation)) throw new Error(`Unsupported chart evidence recommendation for ${record.sampleId}: ${record.recommendation}`);
    return record;
  });
  const evidenceIds = new Set(records.map((record) => record.sampleId));
  const samplesUpdated: ChartEvidenceApplicationRecord[] = [];

  for (const record of records) {
    const sample = report.samples.find((item) => item.sampleId === record.sampleId);
    if (!sample) throw new Error(`Chart evidence sample not found in reviewed file: ${record.sampleId}`);
    const previousFinalHumanLabel = sample.finalHumanLabel;
    const appliedFinalHumanLabel = labelFromChartEvidenceRecommendation(record.recommendation);
    sample.finalHumanLabel = appliedFinalHumanLabel;
    sample.reviewer = sample.reviewer || 'human';
    sample.reviewedAt = appliedAt;
    sample.reviewerNotes = [
      sample.reviewerNotes,
      `TWLD-5: Applied from chart-evidence recommendation ${record.recommendation} -> ${appliedFinalHumanLabel}. Research-only; no execution authority created.`,
    ].filter(Boolean).join(' ');
    samplesUpdated.push({
      sampleId: sample.sampleId,
      recommendation: record.recommendation,
      previousFinalHumanLabel,
      appliedFinalHumanLabel,
      changed: previousFinalHumanLabel !== appliedFinalHumanLabel,
    });
  }

  report.generatedAt = appliedAt;
  report.summary = summarize(report.samples);
  report.chartEvidenceApplication = {
    appliedAt,
    sourceChartEvidencePath: resolvedChartEvidencePath,
    beforeSummary,
    afterSummary: report.summary,
    samplesUpdated,
    samplesPreserved: report.samples.filter((sample) => !evidenceIds.has(sample.sampleId)).map((sample) => sample.sampleId),
    note: 'Chart-evidence recommendations were applied as research-only human review labels. This does not approve trades, models, alerts, or execution.',
    boundary: RESEARCH_BOUNDARY,
  };
  assertNoExecutableLedgerFields(report);
  return report;
}

export function buildTimeWindowLiquidityDeliveryHumanReview(options: ReviewOptions): HumanReviewReport {
  const sourceCuratedPackPath = path.resolve(options.sourceCuratedPackPath);
  if (!existsSync(sourceCuratedPackPath)) throw new Error(`Curated review pack not found: ${sourceCuratedPackPath}`);
  const pack = readJson<CuratedReviewPack>(sourceCuratedPackPath);
  if (pack.reportType !== 'time_window_liquidity_delivery_curated_review_pack') throw new Error(`Source file is not a TWLD curated review pack: ${sourceCuratedPackPath}`);
  if (pack.symbol !== options.symbol || pack.windowStudied !== options.window) throw new Error(`Curated pack does not match requested ${options.symbol} ${options.window}.`);
  const paths = outputPaths(options);
  const existing = existsSync(paths.jsonPath) ? readJson<HumanReviewReport>(paths.jsonPath) : null;
  const report = mergeWithCuratedSamples(existing, pack, paths, sourceCuratedPackPath);
  if (options.sampleId && options.label) {
    const sample = report.samples.find((item) => item.sampleId === options.sampleId);
    if (!sample) throw new Error(`Unknown TWLD sample ID: ${options.sampleId}`);
    sample.finalHumanLabel = options.label;
    sample.reviewer = options.reviewer || 'human';
    sample.reviewedAt = new Date().toISOString();
    sample.reviewerNotes = options.notes || null;
  }
  if (options.applyChartEvidence) {
    const chartEvidencePath = options.chartEvidencePath || defaultChartEvidencePath(options.symbol, options.window, options.from, options.to);
    applyTimeWindowLiquidityDeliveryChartEvidenceLabels(report, chartEvidencePath);
  }
  report.generatedAt = new Date().toISOString();
  report.summary = summarize(report.samples);
  assertNoExecutableLedgerFields(report);
  return report;
}

function title(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

function yesNo(value: boolean): string {
  return value ? 'Yes' : 'No';
}

function markdownRow(sample: ReviewedSample): string {
  return `| ${sample.sampleId} | ${sample.dateTime} | ${sample.sourceBucket} | ${sample.suggestedLabel || 'n/a'} | ${sample.finalHumanLabel || 'unreviewed'} | ${sample.reviewer || 'n/a'} | ${sample.reviewerNotes || ''} |`;
}

export function renderTimeWindowLiquidityDeliveryHumanReviewMarkdown(report: HumanReviewReport): string {
  const reviewedByLabel = TWLD_HUMAN_REVIEW_LABELS.flatMap((label) => {
    const samples = report.samples.filter((sample) => sample.finalHumanLabel === label);
    return [
      `### ${title(label)}`,
      samples.length ? '| Sample ID | Date/Time | Source Bucket | Suggested Label | Final Human Label | Reviewer | Notes |' : '_No samples reviewed with this label._',
      samples.length ? '|---|---|---|---|---|---|---|' : '',
      ...samples.map(markdownRow),
      '',
    ].filter(Boolean);
  });
  const unreviewed = report.samples.filter((sample) => !sample.finalHumanLabel);
  return [
    `# Time-Window Liquidity Delivery Human Review - ${report.symbol} ${report.windowStudied}`,
    '',
    report.researchOnlyWarning,
    'This review file does not approve trades and does not create execution authority.',
    '',
    `Source curated pack: ${report.sourceCuratedPackPath}`,
    `Date range: ${report.from} to ${report.to}`,
    `Boundary: ${report.boundary}`,
    '',
    '## Safety',
    `- Activates Model: ${yesNo(report.safety.activatesModel)}`,
    `- Approves Execution: ${yesNo(report.safety.approvesExecution)}`,
    `- Creates Trade: ${yesNo(report.safety.createsTrade)}`,
    `- Changes Scanner: ${yesNo(report.safety.changesScanner)}`,
    `- Changes Rules: ${yesNo(report.safety.changesRules)}`,
    '',
    '## Review Progress',
    `- Total Samples: ${report.summary.totalSamples}`,
    `- Reviewed Samples: ${report.summary.reviewedSamples}`,
    `- Unreviewed Samples: ${report.summary.unreviewedSamples}`,
    '',
    '## Label Counts',
    ...TWLD_HUMAN_REVIEW_LABELS.map((label) => `- ${label}: ${report.summary.labelCounts[label]}`),
    '',
    '## Summary Recommendation',
    ...report.summary.summaryRecommendation.map((recommendation) => `- ${recommendation}`),
    '',
    ...(report.chartEvidenceApplication ? [
      '## Chart Evidence Application',
      `- Source Chart Evidence: ${report.chartEvidenceApplication.sourceChartEvidencePath}`,
      `- Applied At: ${report.chartEvidenceApplication.appliedAt}`,
      `- Samples Updated: ${report.chartEvidenceApplication.samplesUpdated.length}`,
      `- Samples Preserved: ${report.chartEvidenceApplication.samplesPreserved.length}`,
      `- Note: ${report.chartEvidenceApplication.note}`,
      '- Before Label Counts:',
      ...TWLD_HUMAN_REVIEW_LABELS.map((label) => `  - ${label}: ${report.chartEvidenceApplication?.beforeSummary.labelCounts[label] ?? 0}`),
      '- After Label Counts:',
      ...TWLD_HUMAN_REVIEW_LABELS.map((label) => `  - ${label}: ${report.chartEvidenceApplication?.afterSummary.labelCounts[label] ?? 0}`),
      '- Applied Samples:',
      ...report.chartEvidenceApplication.samplesUpdated.map((sample) => `  - ${sample.sampleId}: ${sample.previousFinalHumanLabel || 'unreviewed'} -> ${sample.appliedFinalHumanLabel} (${sample.recommendation})`),
      `- Boundary: ${report.chartEvidenceApplication.boundary}`,
      '',
    ] : []),
    '## Samples Grouped By Final Human Label',
    ...reviewedByLabel,
    '## Unreviewed Samples',
    unreviewed.length ? '| Sample ID | Date/Time | Source Bucket | Suggested Label | Final Human Label | Reviewer | Notes |' : '_No unreviewed samples._',
    unreviewed.length ? '|---|---|---|---|---|---|---|' : '',
    ...unreviewed.map(markdownRow),
    '',
    'Research-only. Human labels do not approve trades, models, or execution.',
  ]
    .filter((line) => line !== '')
    .join('\n');
}

export function writeTimeWindowLiquidityDeliveryHumanReview(report: HumanReviewReport): void {
  mkdirSync(path.dirname(report.outputPaths.jsonPath), { recursive: true });
  writeFileSync(report.outputPaths.jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(report.outputPaths.markdownPath, `${renderTimeWindowLiquidityDeliveryHumanReviewMarkdown(report)}\n`, 'utf8');
}

export async function runTimeWindowLiquidityDeliveryReviewCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseTimeWindowLiquidityDeliveryReviewArgs(rawArgs);
  const report = buildTimeWindowLiquidityDeliveryHumanReview(options);
  writeTimeWindowLiquidityDeliveryHumanReview(report);
  if (options.json) console.log(JSON.stringify(report, null, 2));
  if (options.pretty) {
    console.log([
      '[TIME-WINDOW LIQUIDITY DELIVERY HUMAN REVIEW]',
      `Symbol: ${report.symbol}`,
      `Date range: ${report.from} to ${report.to}`,
      `Window: ${report.windowStudied}`,
      `Source curated pack: ${report.sourceCuratedPackPath}`,
      `JSON: ${report.outputPaths.jsonPath}`,
      `Markdown: ${report.outputPaths.markdownPath}`,
      `Reviewed: ${report.summary.reviewedSamples}`,
      `Unreviewed: ${report.summary.unreviewedSamples}`,
      ...TWLD_HUMAN_REVIEW_LABELS.map((label) => `${label}: ${report.summary.labelCounts[label]}`),
      ...(report.chartEvidenceApplication ? [
        `Chart evidence applied: ${report.chartEvidenceApplication.sourceChartEvidencePath}`,
        `Samples updated from chart evidence: ${report.chartEvidenceApplication.samplesUpdated.length}`,
        'Before label summary:',
        ...TWLD_HUMAN_REVIEW_LABELS.map((label) => `- ${label}: ${report.chartEvidenceApplication?.beforeSummary.labelCounts[label] ?? 0}`),
        'After label summary:',
        ...TWLD_HUMAN_REVIEW_LABELS.map((label) => `- ${label}: ${report.chartEvidenceApplication?.afterSummary.labelCounts[label] ?? 0}`),
      ] : []),
      'This review file does not approve trades and does not create execution authority.',
    ].join('\n'));
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tools/automation/time-window-liquidity-delivery-review.ts')) {
  runTimeWindowLiquidityDeliveryReviewCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
