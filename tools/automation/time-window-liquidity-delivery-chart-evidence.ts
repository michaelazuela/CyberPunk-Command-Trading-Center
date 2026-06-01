import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertNoExecutableLedgerFields } from './model-candidate-ledger';

type AuditWindowCode = 'LONDON' | 'AM' | 'PM';
type HumanReviewLabel =
  | 'strong_advisory_candidate'
  | 'covered_by_model_1'
  | 'covered_by_turtle_soup'
  | 'weak_or_noisy'
  | 'needs_chart_review'
  | 'reject_time_window_standalone';
type ChartReviewRecommendation =
  | 'upgrade_to_strong_advisory_candidate'
  | 'keep_needs_chart_review'
  | 'downgrade_to_weak_or_noisy'
  | 'reject_time_window_standalone'
  | 'covered_by_model_1'
  | 'covered_by_turtle_soup';

interface ReviewedSample {
  sampleId: string;
  sourceBucket?: string;
  window: string;
  symbol: string;
  dateTime: string;
  suggestedLabel: HumanReviewLabel | null;
  finalHumanLabel: HumanReviewLabel | null;
  reviewerNotes: string | null;
  sourceCuratedPackPath: string;
  boundary: 'research_only_not_execution_authority';
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
  samples: ReviewedSample[];
}

interface CuratedSample {
  sampleId: string;
  sourceCandidateId: string;
  date: string;
  window: string;
  nyTime: string;
  symbol: string;
  drawType: string;
  drawLevel: number | null;
  fvgOrInefficiencyPresent: boolean;
  marketStructureShiftPresent: boolean;
  sweepRaidPlusReclaimPresent: boolean;
  deliveryStatus: 'achieved' | 'failed' | 'not_observed';
  modelOneOverlap: boolean;
  turtleSoupOverlap: boolean;
  advisoryOnly: boolean;
  chartPath: string | null;
  reportPath: string | null;
  inclusionReasons: string[];
  boundary: 'research_only_not_execution_authority';
}

interface CuratedReviewPack {
  reportType: 'time_window_liquidity_delivery_curated_review_pack';
  symbol: string;
  from: string;
  to: string;
  windowStudied: AuditWindowCode;
  sourceAuditPath: string;
  boundary: 'research_only_not_execution_authority';
  samples: CuratedSample[];
}

interface LiquidityReference {
  kind: string;
  price: number;
  distanceFromWindowOpen: number;
  reachedInsideWindow: boolean;
  roomAtWindowOpen: boolean;
}

interface AuditCandidate {
  candidateId: string;
  date: string;
  cleanDrawObserved?: boolean;
  expectedDeliveryHandles?: number;
  expectedDeliveryTicks?: number;
  deliveryAchieved?: boolean;
  failedDelivery?: boolean;
  fvgOrInefficiencyRepricedInsideWindow?: boolean;
  bodiesRespectedFvgOrInefficiency?: boolean;
  priceAlreadyReachedDrawBeforeSetup?: boolean;
  overlapClassification?: string;
  priorLiquidityReferences?: LiquidityReference[];
  notes?: string[];
}

interface AuditReport {
  reportType: 'time_window_liquidity_delivery_audit';
  candidates: AuditCandidate[];
}

interface ReviewSafetyFields {
  activatesModel: false;
  approvesExecution: false;
  createsTrade: false;
  changesScanner: false;
  changesRules: false;
}

interface ChartEvidenceRecord {
  sampleId: string;
  symbol: string;
  date: string;
  nyTime: string;
  window: string;
  drawType: string;
  drawLevel: number | null;
  fvgOrInefficiencyPresent: boolean;
  marketStructureShiftPresent: boolean;
  sweepRaidPlusReclaimPresent: boolean;
  deliveryStatus: string;
  advisoryOnlyReason: string;
  chartReviewReason: string;
  fvgOrInefficiencyRespected: 'yes' | 'no' | 'not_recorded';
  drawReachedBeforeWindow: 'yes' | 'no' | 'not_recorded';
  drawValidDuringWindow: 'yes' | 'no' | 'not_recorded';
  modelOneOverlap: boolean;
  turtleSoupOverlap: boolean;
  remainsAdvisoryOnly: boolean;
  sourceChartPath: string | null;
  sourceReportPath: string | null;
  generatedEvidenceReportPath: string;
  generatedPngCardPath: null;
  recommendation: ChartReviewRecommendation;
  recommendationReasons: string[];
  finalHumanLabelPreserved: HumanReviewLabel | null;
  recommendationAppliedAsFinalLabel: false;
  safety: ReviewSafetyFields;
  boundary: 'research_only_not_execution_authority';
}

interface ChartEvidenceSummary {
  needsChartReviewSamples: number;
  generatedPngCards: number;
  recommendationCounts: Record<ChartReviewRecommendation, number>;
}

interface ChartEvidenceOutputPaths {
  jsonPath: string;
  markdownPath: string;
  cardsDir: string;
}

export interface TimeWindowLiquidityDeliveryChartEvidenceReport {
  reportType: 'time_window_liquidity_delivery_chart_evidence_pack';
  generatedAt: string;
  symbol: string;
  from: string;
  to: string;
  windowStudied: AuditWindowCode;
  sourceReviewedFilePath: string;
  sourceCuratedPackPath: string;
  sourceAuditPath: string | null;
  boundary: 'research_only_not_execution_authority';
  researchOnlyWarning: string;
  explicitExecutionWarning: 'This chart evidence pack does not approve trades and does not create execution authority.';
  labelFilter: 'needs_chart_review';
  summary: ChartEvidenceSummary;
  records: ChartEvidenceRecord[];
  outputPaths: ChartEvidenceOutputPaths;
}

interface ChartEvidenceOptions {
  symbol: string;
  from: string;
  to: string;
  window: AuditWindowCode;
  reviewedPath: string;
  outDir: string;
  pretty: boolean;
  json: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_TWLD_DIR = path.join(__dirname, 'time-window-liquidity-delivery');
const DEFAULT_REVIEWED_DIR = path.join(DEFAULT_TWLD_DIR, 'review-packs', 'reviewed');
const DEFAULT_OUT_DIR = path.join(DEFAULT_TWLD_DIR, 'chart-evidence');
const RESEARCH_BOUNDARY = 'research_only_not_execution_authority' as const;
const RESEARCH_WARNING = 'Research-only. This chart evidence pack does not approve trades, does not create execution authority, and does not apply human labels.';
const EXECUTION_WARNING = 'This chart evidence pack does not approve trades and does not create execution authority.' as const;
const RECOMMENDATIONS: ChartReviewRecommendation[] = [
  'upgrade_to_strong_advisory_candidate',
  'keep_needs_chart_review',
  'downgrade_to_weak_or_noisy',
  'reject_time_window_standalone',
  'covered_by_model_1',
  'covered_by_turtle_soup',
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

function defaultReviewedPath(symbol: string, window: AuditWindowCode, from: string, to: string): string {
  return path.join(DEFAULT_REVIEWED_DIR, `time-window-liquidity-delivery-${window}-curated-review-pack-${symbol}-${from}-to-${to}.reviewed.json`);
}

export function parseTimeWindowLiquidityDeliveryChartEvidenceArgs(args = process.argv.slice(2)): ChartEvidenceOptions {
  const symbol = (readFlag(args, '--symbol') || 'MES').toUpperCase();
  const window = parseWindow(readFlag(args, '--window'));
  const from = requireDate(readFlag(args, '--from') || '2018-01-01', '--from');
  const to = requireDate(readFlag(args, '--to') || '2026-05-31', '--to');
  return {
    symbol,
    from,
    to,
    window,
    reviewedPath: readFlag(args, '--reviewed') || defaultReviewedPath(symbol, window, from, to),
    outDir: readFlag(args, '--out') || DEFAULT_OUT_DIR,
    pretty: hasFlag(args, '--pretty') || !hasFlag(args, '--json'),
    json: hasFlag(args, '--json'),
  };
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

function outputPaths(options: Pick<ChartEvidenceOptions, 'symbol' | 'window' | 'from' | 'to' | 'outDir'>): ChartEvidenceOutputPaths {
  const outDir = path.resolve(options.outDir);
  const base = path.join(outDir, `time-window-liquidity-delivery-${options.window}-chart-evidence-${options.symbol}-${options.from}-to-${options.to}`);
  return {
    jsonPath: `${base}.json`,
    markdownPath: `${base}.md`,
    cardsDir: path.join(outDir, 'cards'),
  };
}

function splitDateTime(value: string): { date: string; nyTime: string } {
  const [date, ...rest] = value.split(/\s+/);
  return { date: date || 'unknown', nyTime: rest.join(' ') || 'not_recorded' };
}

function triState(value: boolean | undefined): 'yes' | 'no' | 'not_recorded' {
  if (value === true) return 'yes';
  if (value === false) return 'no';
  return 'not_recorded';
}

function advisoryOnlyReason(sample: CuratedSample | undefined): string {
  if (!sample) return 'Curated sample details were not available; preserve needs-chart-review status until manually inspected.';
  if (sample.advisoryOnly) return 'Curated as advisory-only time-window research, not an executable model label.';
  if (sample.modelOneOverlap) return 'Curated as possible Model 1 overlap; do not duplicate Model 1 under TWLD.';
  if (sample.turtleSoupOverlap) return 'Curated as possible Turtle Soup overlap; do not duplicate Turtle Soup under TWLD.';
  return 'Curated for research review only.';
}

function recommendationFor(sample: CuratedSample | undefined, audit: AuditCandidate | undefined): { recommendation: ChartReviewRecommendation; reasons: string[] } {
  const reasons: string[] = [];
  if (!sample) {
    return {
      recommendation: 'keep_needs_chart_review',
      reasons: ['Curated sample details were unavailable; keep the sample in chart review until evidence is restored.'],
    };
  }
  if (sample.modelOneOverlap) {
    return {
      recommendation: 'covered_by_model_1',
      reasons: ['Curated evidence marks this as possible Model 1 overlap. Keep TWLD advisory-only and route through existing Model 1 review.'],
    };
  }
  if (sample.turtleSoupOverlap) {
    return {
      recommendation: 'covered_by_turtle_soup',
      reasons: ['Curated evidence marks this as possible Turtle Soup overlap. Keep TWLD advisory-only and route through existing Turtle Soup review.'],
    };
  }
  if (audit?.priceAlreadyReachedDrawBeforeSetup === true) {
    return {
      recommendation: 'reject_time_window_standalone',
      reasons: ['The draw appears to have been reached before the review window/setup, so standalone TWLD validity is weak.'],
    };
  }
  if (!sample.fvgOrInefficiencyPresent || !sample.marketStructureShiftPresent) {
    return {
      recommendation: 'downgrade_to_weak_or_noisy',
      reasons: ['The curated evidence is missing either FVG/inefficiency or MSS, so the sample should not be upgraded without chart confirmation.'],
    };
  }
  if (sample.deliveryStatus === 'achieved') {
    return {
      recommendation: 'upgrade_to_strong_advisory_candidate',
      reasons: ['Delivery was achieved with FVG/inefficiency and MSS present. This remains a research-only recommendation pending human chart confirmation.'],
    };
  }
  reasons.push('FVG/inefficiency and MSS are present, but delivery was not confirmed in the reviewed fields.');
  reasons.push('Keep this sample in chart review; do not apply a final label automatically.');
  return { recommendation: 'keep_needs_chart_review', reasons };
}

function recommendationCounts(records: ChartEvidenceRecord[]): Record<ChartReviewRecommendation, number> {
  return Object.fromEntries(RECOMMENDATIONS.map((recommendation) => [
    recommendation,
    records.filter((record) => record.recommendation === recommendation).length,
  ])) as Record<ChartReviewRecommendation, number>;
}

export function buildTimeWindowLiquidityDeliveryChartEvidenceReport(options: ChartEvidenceOptions): TimeWindowLiquidityDeliveryChartEvidenceReport {
  const sourceReviewedFilePath = path.resolve(options.reviewedPath);
  if (!existsSync(sourceReviewedFilePath)) throw new Error(`Reviewed TWLD file not found: ${sourceReviewedFilePath}`);
  const reviewed = readJson<HumanReviewReport>(sourceReviewedFilePath);
  if (reviewed.reportType !== 'time_window_liquidity_delivery_human_review') throw new Error(`Source file is not a TWLD human review file: ${sourceReviewedFilePath}`);
  if (reviewed.symbol !== options.symbol || reviewed.windowStudied !== options.window) throw new Error(`Reviewed file does not match requested ${options.symbol} ${options.window}.`);
  const sourceCuratedPackPath = path.resolve(reviewed.sourceCuratedPackPath);
  const curated = existsSync(sourceCuratedPackPath) ? readJson<CuratedReviewPack>(sourceCuratedPackPath) : null;
  const sourceAuditPath = curated?.sourceAuditPath ? path.resolve(curated.sourceAuditPath) : null;
  const audit = sourceAuditPath && existsSync(sourceAuditPath) ? readJson<AuditReport>(sourceAuditPath) : null;
  const curatedById = new Map((curated?.samples || []).map((sample) => [sample.sampleId, sample]));
  const auditById = new Map((audit?.candidates || []).map((candidate) => [candidate.candidateId, candidate]));
  const paths = outputPaths(options);
  const records: ChartEvidenceRecord[] = reviewed.samples
    .filter((sample) => sample.finalHumanLabel === 'needs_chart_review')
    .map((reviewedSample) => {
      const curatedSample = curatedById.get(reviewedSample.sampleId);
      const auditCandidate = curatedSample?.sourceCandidateId ? auditById.get(curatedSample.sourceCandidateId) : undefined;
      const { date, nyTime } = splitDateTime(reviewedSample.dateTime);
      const recommendation = recommendationFor(curatedSample, auditCandidate);
      return {
        sampleId: reviewedSample.sampleId,
        symbol: reviewedSample.symbol,
        date: curatedSample?.date || date,
        nyTime: curatedSample?.nyTime || nyTime,
        window: curatedSample?.window || reviewedSample.window,
        drawType: curatedSample?.drawType || 'not_recorded',
        drawLevel: curatedSample?.drawLevel ?? null,
        fvgOrInefficiencyPresent: curatedSample?.fvgOrInefficiencyPresent ?? false,
        marketStructureShiftPresent: curatedSample?.marketStructureShiftPresent ?? false,
        sweepRaidPlusReclaimPresent: curatedSample?.sweepRaidPlusReclaimPresent ?? false,
        deliveryStatus: curatedSample?.deliveryStatus || 'not_recorded',
        advisoryOnlyReason: advisoryOnlyReason(curatedSample),
        chartReviewReason: reviewedSample.reviewerNotes || 'Human reviewer requested chart review.',
        fvgOrInefficiencyRespected: triState(auditCandidate?.bodiesRespectedFvgOrInefficiency),
        drawReachedBeforeWindow: triState(auditCandidate?.priceAlreadyReachedDrawBeforeSetup),
        drawValidDuringWindow: triState(auditCandidate ? auditCandidate.cleanDrawObserved === true && auditCandidate.priceAlreadyReachedDrawBeforeSetup !== true : undefined),
        modelOneOverlap: curatedSample?.modelOneOverlap ?? false,
        turtleSoupOverlap: curatedSample?.turtleSoupOverlap ?? false,
        remainsAdvisoryOnly: curatedSample?.advisoryOnly ?? true,
        sourceChartPath: curatedSample?.chartPath || null,
        sourceReportPath: curatedSample?.reportPath || null,
        generatedEvidenceReportPath: paths.markdownPath,
        generatedPngCardPath: null,
        recommendation: recommendation.recommendation,
        recommendationReasons: recommendation.reasons,
        finalHumanLabelPreserved: reviewedSample.finalHumanLabel,
        recommendationAppliedAsFinalLabel: false,
        safety: { ...SAFETY_FIELDS },
        boundary: RESEARCH_BOUNDARY,
      };
    });
  const report: TimeWindowLiquidityDeliveryChartEvidenceReport = {
    reportType: 'time_window_liquidity_delivery_chart_evidence_pack',
    generatedAt: new Date().toISOString(),
    symbol: options.symbol,
    from: options.from,
    to: options.to,
    windowStudied: options.window,
    sourceReviewedFilePath,
    sourceCuratedPackPath,
    sourceAuditPath,
    boundary: RESEARCH_BOUNDARY,
    researchOnlyWarning: RESEARCH_WARNING,
    explicitExecutionWarning: EXECUTION_WARNING,
    labelFilter: 'needs_chart_review',
    summary: {
      needsChartReviewSamples: records.length,
      generatedPngCards: 0,
      recommendationCounts: recommendationCounts(records),
    },
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

function renderRecordDetails(record: ChartEvidenceRecord): string[] {
  return [
    `### ${record.sampleId}`,
    `- Symbol: ${record.symbol}`,
    `- Date: ${record.date}`,
    `- NY Time: ${record.nyTime}`,
    `- AM Window: ${record.window}`,
    `- Draw Type: ${record.drawType}`,
    `- Draw Level: ${formatDrawLevel(record.drawLevel)}`,
    `- FVG/Inefficiency Present: ${yesNo(record.fvgOrInefficiencyPresent)}`,
    `- MSS Present: ${yesNo(record.marketStructureShiftPresent)}`,
    `- Sweep/Reclaim Present: ${yesNo(record.sweepRaidPlusReclaimPresent)}`,
    `- Delivery Status: ${record.deliveryStatus}`,
    `- FVG/Inefficiency Respected: ${record.fvgOrInefficiencyRespected}`,
    `- Draw Reached Before Window: ${record.drawReachedBeforeWindow}`,
    `- Draw Valid During Window: ${record.drawValidDuringWindow}`,
    `- Model 1 Overlap: ${yesNo(record.modelOneOverlap)}`,
    `- Turtle Soup Overlap: ${yesNo(record.turtleSoupOverlap)}`,
    `- Remains Advisory-Only: ${yesNo(record.remainsAdvisoryOnly)}`,
    `- Why Chart Review Was Needed: ${record.chartReviewReason}`,
    `- Advisory-Only Reason: ${record.advisoryOnlyReason}`,
    `- Source Chart Path: ${record.sourceChartPath || 'Not recorded'}`,
    `- Source Report Path: ${record.sourceReportPath || 'Not recorded'}`,
    `- Generated Evidence Report: ${record.generatedEvidenceReportPath}`,
    `- PNG Card: Not generated`,
    `- Recommendation: ${record.recommendation}`,
    `- Recommendation Applied As Final Label: No`,
    '- Recommendation Reasons:',
    ...record.recommendationReasons.map((reason) => `  - ${reason}`),
    `- Boundary: ${record.boundary}`,
    '',
  ];
}

export function renderTimeWindowLiquidityDeliveryChartEvidenceMarkdown(report: TimeWindowLiquidityDeliveryChartEvidenceReport): string {
  return [
    `# Time-Window Liquidity Delivery AM Chart Evidence - ${report.symbol}`,
    '',
    report.researchOnlyWarning,
    report.explicitExecutionWarning,
    '',
    `Source reviewed file: ${report.sourceReviewedFilePath}`,
    `Source curated pack: ${report.sourceCuratedPackPath}`,
    `Source audit: ${report.sourceAuditPath || 'Not available'}`,
    `Date range: ${report.from} to ${report.to}`,
    `Window: ${report.windowStudied}`,
    `Boundary: ${report.boundary}`,
    '',
    '## Summary',
    `- Total needs_chart_review samples: ${report.summary.needsChartReviewSamples}`,
    `- PNG chart cards generated: ${report.summary.generatedPngCards}`,
    '',
    '## Recommendation Summary',
    ...RECOMMENDATIONS.map((recommendation) => `- ${recommendation}: ${report.summary.recommendationCounts[recommendation]}`),
    '',
    '## Chart Evidence Records',
    '| Sample ID | Date | Draw Type | Draw Level | FVG | MSS | Sweep/Reclaim | Delivery | FVG Respected | Draw Reached Before Window | Draw Valid During Window | Model 1 Overlap | Turtle Soup Overlap | Recommendation | Chart/Report Path |',
    '|---|---|---|---:|---:|---:|---:|---|---|---|---|---:|---:|---|---|',
    ...report.records.map((record) =>
      `| ${record.sampleId} | ${record.date} | ${record.drawType} | ${formatDrawLevel(record.drawLevel)} | ${yesNo(record.fvgOrInefficiencyPresent)} | ${yesNo(record.marketStructureShiftPresent)} | ${yesNo(record.sweepRaidPlusReclaimPresent)} | ${record.deliveryStatus} | ${record.fvgOrInefficiencyRespected} | ${record.drawReachedBeforeWindow} | ${record.drawValidDuringWindow} | ${yesNo(record.modelOneOverlap)} | ${yesNo(record.turtleSoupOverlap)} | ${record.recommendation} | ${record.sourceChartPath || record.sourceReportPath || record.generatedEvidenceReportPath} |`
    ),
    '',
    '## Per-Sample Notes',
    ...report.records.flatMap(renderRecordDetails),
    'Research-only. Recommendations are not final labels and do not approve trades, models, alerts, or execution.',
  ].join('\n');
}

export function writeTimeWindowLiquidityDeliveryChartEvidenceReport(report: TimeWindowLiquidityDeliveryChartEvidenceReport): void {
  mkdirSync(path.dirname(report.outputPaths.jsonPath), { recursive: true });
  mkdirSync(report.outputPaths.cardsDir, { recursive: true });
  writeFileSync(report.outputPaths.jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(report.outputPaths.markdownPath, `${renderTimeWindowLiquidityDeliveryChartEvidenceMarkdown(report)}\n`, 'utf8');
}

export async function runTimeWindowLiquidityDeliveryChartEvidenceCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseTimeWindowLiquidityDeliveryChartEvidenceArgs(rawArgs);
  const report = buildTimeWindowLiquidityDeliveryChartEvidenceReport(options);
  writeTimeWindowLiquidityDeliveryChartEvidenceReport(report);
  if (options.json) console.log(JSON.stringify(report, null, 2));
  if (options.pretty) {
    console.log([
      '[TIME-WINDOW LIQUIDITY DELIVERY CHART EVIDENCE]',
      `Symbol: ${report.symbol}`,
      `Date range: ${report.from} to ${report.to}`,
      `Window: ${report.windowStudied}`,
      `Source reviewed file: ${report.sourceReviewedFilePath}`,
      `JSON: ${report.outputPaths.jsonPath}`,
      `Markdown: ${report.outputPaths.markdownPath}`,
      `Needs chart review samples: ${report.summary.needsChartReviewSamples}`,
      `PNG chart cards generated: ${report.summary.generatedPngCards}`,
      report.explicitExecutionWarning,
    ].join('\n'));
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tools/automation/time-window-liquidity-delivery-chart-evidence.ts')) {
  runTimeWindowLiquidityDeliveryChartEvidenceCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
