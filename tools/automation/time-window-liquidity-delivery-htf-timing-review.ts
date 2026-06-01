import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertNoExecutableLedgerFields } from './model-candidate-ledger';

type AuditWindowCode = 'AM' | 'PM' | 'LONDON';
type SupportedTimeframe = '1m' | '5m' | '15m' | '30m' | '60m' | '1h' | '240m' | '4h' | 'daily' | 'session';
type TimingReviewLabel =
  | 'window_confirmed_prior_htf_draw'
  | 'window_continued_prior_htf_draw'
  | 'window_failed_prior_htf_draw'
  | 'window_conflicted_with_prior_htf_draw'
  | 'not_useful_for_timing'
  | 'needs_visual_review';
type ExecutionWindowAlignment = 'aligned' | 'conflicting' | 'neutral' | 'unclear';

interface CliOptions {
  symbol: string;
  from: string;
  to: string;
  sourceReviewSetPath: string;
  outDir: string;
  reviewedPath: string | null;
  sampleId: string | null;
  label: TimingReviewLabel | null;
  reviewer: string | null;
  notes: string | null;
  pretty: boolean;
  json: boolean;
}

interface ReviewSafetyFields {
  activatesModel: false;
  approvesExecution: false;
  createsTrade: false;
  changesScanner: false;
  changesBridge: false;
  changesRules: false;
  changesReadiness: false;
}

interface HtfQualityCandidate {
  sampleId: string;
  candidateId: string;
  date: string;
  symbol: string;
  windowStudied: AuditWindowCode;
  windowLabel: string;
  executionTimeframe: '5m';
  executionTimeframeRole: 'execution_only';
  discoveredHigherTimeframes: SupportedTimeframe[];
  htfDrawType: string | null;
  htfDrawLevel: number | null;
  htfDrawStillValidDuringWindow: boolean | null;
  htfDrawReachedBeforeWindow: boolean | null;
  deliveryOccurredDuringWindow: boolean;
  deliveryOccurredAfterWindow: boolean;
  executionWindowAlignment: ExecutionWindowAlignment;
  executionWindowConflictsWithHtfDraw: boolean;
  drawConflictCount: number;
  dominantDrawSource: 'candle_derived' | 'session_derived' | 'mixed' | 'unknown';
  dominantDrawTimeframe: SupportedTimeframe | null;
  htfDrawQualityScore: number;
  htfDrawQualityLabel: string;
  htfDrawQualityReasons: string[];
  qualityAdjustedTwldPriority: string;
  boundary: 'research_only_not_execution_authority';
  researchOnly: true;
}

interface HtfQualityReviewSet {
  reportType: 'time_window_liquidity_delivery_htf_quality_review_set';
  generatedAt: string;
  symbol: string;
  from: string;
  to: string;
  boundary: 'research_only_not_execution_authority';
  researchOnlyWarning: string;
  topAmStrongOrMedium: HtfQualityCandidate[];
  topPmStrongOrMedium: HtfQualityCandidate[];
  conflictingAboveThreshold: HtfQualityCandidate[];
  broadHtfPresentDowngraded: HtfQualityCandidate[];
  recommendedHumanReviewSet: Array<{
    sampleId: string;
    windowStudied: AuditWindowCode | 'UNKNOWN';
    reason: string;
    htfDrawQualityScore: number | null;
    htfDrawQualityLabel: string | null;
  }>;
  outputPaths?: {
    jsonPath: string;
    markdownPath: string;
  };
}

interface HtfQualityReport {
  reportType: 'time_window_liquidity_delivery_htf_quality_report';
  symbol: string;
  from: string;
  to: string;
  windowStudied: AuditWindowCode;
  candidates: HtfQualityCandidate[];
}

interface TimingReviewSample {
  sampleId: string;
  symbol: string;
  date: string;
  window: AuditWindowCode;
  nyTimeWindow: string;
  htfDrawQualityScore: number;
  htfDrawQualityLabel: string;
  dominantDrawSource: HtfQualityCandidate['dominantDrawSource'];
  dominantDrawTimeframe: SupportedTimeframe | null;
  drawAlreadyTaggedBeforeWindow: boolean | 'unknown';
  drawStillValidDuringWindow: boolean | 'unknown';
  deliveryDuringWindow: boolean;
  deliveryAfterWindow: boolean;
  executionWindowAlignment: ExecutionWindowAlignment;
  conflictCount: number;
  qualityReasons: string[];
  suggestedTimingLabel: TimingReviewLabel;
  suggestedTimingReason: string;
  sourceQualityPriority: string;
  sourceCandidateId: string;
  boundary: 'research_only_not_execution_authority';
}

interface TimingReviewPack {
  reportType: 'time_window_liquidity_delivery_htf_timing_review_pack';
  generatedAt: string;
  symbol: string;
  from: string;
  to: string;
  sourceHtfQualityReviewSetPath: string;
  boundary: 'research_only_not_execution_authority';
  researchOnlyWarning: string;
  executionTimeframeRule: '5m_execution_only';
  drawContextRule: 'coded_timeframes_above_5m_are_draw_context';
  supportedLabels: TimingReviewLabel[];
  labelDefinitions: Record<TimingReviewLabel, string>;
  suggestedLabelSummary: Record<TimingReviewLabel, number>;
  samples: TimingReviewSample[];
  outputPaths: {
    jsonPath: string;
    markdownPath: string;
  };
}

interface TimingReviewHistoryRecord {
  label: TimingReviewLabel;
  reviewer: string;
  reviewedAt: string;
  notes: string | null;
}

interface ReviewedTimingSample extends TimingReviewSample {
  finalTimingLabel: TimingReviewLabel | null;
  reviewer: string | null;
  reviewedAt: string | null;
  reviewerNotes: string | null;
  reviewHistory: TimingReviewHistoryRecord[];
  safety: ReviewSafetyFields;
}

interface TimingReviewSummary {
  totalSamples: number;
  reviewedSamples: number;
  unreviewedSamples: number;
  suggestedLabelCounts: Record<TimingReviewLabel, number>;
  finalLabelCounts: Record<TimingReviewLabel, number>;
}

interface ReviewedTimingReport {
  reportType: 'time_window_liquidity_delivery_htf_timing_review';
  generatedAt: string;
  symbol: string;
  from: string;
  to: string;
  sourceTimingReviewPackPath: string;
  sourceHtfQualityReviewSetPath: string;
  boundary: 'research_only_not_execution_authority';
  researchOnlyWarning: string;
  executionTimeframeRule: '5m_execution_only';
  drawContextRule: 'coded_timeframes_above_5m_are_draw_context';
  supportedLabels: TimingReviewLabel[];
  labelDefinitions: Record<TimingReviewLabel, string>;
  safety: ReviewSafetyFields;
  summary: TimingReviewSummary;
  samples: ReviewedTimingSample[];
  outputPaths: {
    jsonPath: string;
    markdownPath: string;
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'time-window-liquidity-delivery', 'htf-timing-review');
const DEFAULT_QUALITY_DIR = path.join(__dirname, 'time-window-liquidity-delivery', 'htf-quality');
const RESEARCH_BOUNDARY = 'research_only_not_execution_authority' as const;
const REVIEW_WARNING =
  'Research-only HTF draw timing review. This timing review does not approve trades and does not create execution authority.';
export const TWLD_HTF_TIMING_REVIEW_LABELS: TimingReviewLabel[] = [
  'window_confirmed_prior_htf_draw',
  'window_continued_prior_htf_draw',
  'window_failed_prior_htf_draw',
  'window_conflicted_with_prior_htf_draw',
  'not_useful_for_timing',
  'needs_visual_review',
];
const LABEL_DEFINITIONS: Record<TimingReviewLabel, string> = {
  window_confirmed_prior_htf_draw: 'HTF draw was known before the window and the TWLD window helped confirm delivery.',
  window_continued_prior_htf_draw: 'Delivery was already in progress and the window continued it.',
  window_failed_prior_htf_draw: 'HTF draw existed, but the window failed to deliver.',
  window_conflicted_with_prior_htf_draw: 'Execution-window behavior conflicted with the HTF draw.',
  not_useful_for_timing: 'HTF draw existed, but the window added no useful timing information.',
  needs_visual_review: 'Data fields are insufficient; chart review is needed.',
};
const SAFETY_FIELDS: ReviewSafetyFields = {
  activatesModel: false,
  approvesExecution: false,
  createsTrade: false,
  changesScanner: false,
  changesBridge: false,
  changesRules: false,
  changesReadiness: false,
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

function parseLabel(value: string | null): TimingReviewLabel | null {
  if (!value) return null;
  if (!TWLD_HTF_TIMING_REVIEW_LABELS.includes(value as TimingReviewLabel)) throw new Error(`Unknown HTF timing review label: ${value}`);
  return value as TimingReviewLabel;
}

function defaultQualityReviewSetPath(symbol: string, from: string, to: string): string {
  return path.join(DEFAULT_QUALITY_DIR, `time-window-liquidity-delivery-HTF-quality-review-set-${symbol}-${from}-to-${to}.json`);
}

function packPaths(options: Pick<CliOptions, 'outDir' | 'symbol' | 'from' | 'to'>) {
  const base = path.join(options.outDir, `time-window-liquidity-delivery-HTF-timing-review-pack-${options.symbol}-${options.from}-to-${options.to}`);
  return { jsonPath: `${base}.json`, markdownPath: `${base}.md` };
}

function reviewedPaths(options: Pick<CliOptions, 'outDir' | 'symbol' | 'from' | 'to' | 'reviewedPath'>) {
  if (options.reviewedPath) {
    const resolved = path.resolve(options.reviewedPath);
    const base = resolved.endsWith('.json') ? resolved.slice(0, -'.json'.length) : resolved;
    return { jsonPath: `${base}.json`, markdownPath: `${base}.md` };
  }
  const base = path.join(options.outDir, `time-window-liquidity-delivery-HTF-timing-review-pack-${options.symbol}-${options.from}-to-${options.to}.reviewed`);
  return { jsonPath: `${base}.json`, markdownPath: `${base}.md` };
}

export function parseTimeWindowLiquidityDeliveryHtfTimingReviewArgs(args = process.argv.slice(2)): CliOptions {
  const symbol = (readFlag(args, '--symbol') || 'MES').toUpperCase();
  const from = requireDate(readFlag(args, '--from') || '2018-01-01', '--from');
  const to = requireDate(readFlag(args, '--to') || '2026-05-31', '--to');
  const sampleId = readFlag(args, '--sample');
  const label = parseLabel(readFlag(args, '--label'));
  if ((sampleId && !label) || (!sampleId && label)) throw new Error('--sample and --label must be provided together.');
  return {
    symbol,
    from,
    to,
    sourceReviewSetPath: readFlag(args, '--review-set') || defaultQualityReviewSetPath(symbol, from, to),
    outDir: readFlag(args, '--out') || DEFAULT_OUT_DIR,
    reviewedPath: readFlag(args, '--reviewed'),
    sampleId,
    label,
    reviewer: readFlag(args, '--reviewer'),
    notes: readFlag(args, '--notes'),
    pretty: hasFlag(args, '--pretty') || !hasFlag(args, '--json'),
    json: hasFlag(args, '--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

function uniqueBySampleId(candidates: HtfQualityCandidate[]): HtfQualityCandidate[] {
  const seen = new Set<string>();
  const result: HtfQualityCandidate[] = [];
  for (const candidate of candidates) {
    if (seen.has(candidate.sampleId)) continue;
    seen.add(candidate.sampleId);
    result.push(candidate);
  }
  return result;
}

function allQualityCandidates(reviewSet: HtfQualityReviewSet): HtfQualityCandidate[] {
  return uniqueBySampleId([
    ...reviewSet.topAmStrongOrMedium,
    ...reviewSet.topPmStrongOrMedium,
    ...reviewSet.conflictingAboveThreshold,
    ...reviewSet.broadHtfPresentDowngraded,
  ]);
}

function siblingQualityReportPath(sourceReviewSetPath: string, symbol: string, window: AuditWindowCode, from: string, to: string): string {
  return path.join(path.dirname(sourceReviewSetPath), `time-window-liquidity-delivery-HTF-quality-${symbol}-${window}-${from}-to-${to}.json`);
}

function loadSiblingQualityCandidates(sourceReviewSetPath: string, symbol: string, from: string, to: string): HtfQualityCandidate[] {
  const candidates: HtfQualityCandidate[] = [];
  for (const window of ['AM', 'PM'] as AuditWindowCode[]) {
    const filePath = siblingQualityReportPath(sourceReviewSetPath, symbol, window, from, to);
    if (!existsSync(filePath)) continue;
    const report = readJson<HtfQualityReport>(filePath);
    if (report.reportType !== 'time_window_liquidity_delivery_htf_quality_report') continue;
    if (report.symbol !== symbol || report.from !== from || report.to !== to) continue;
    candidates.push(...report.candidates);
  }
  return uniqueBySampleId(candidates);
}

function emptyLabelCounts(): Record<TimingReviewLabel, number> {
  return Object.fromEntries(TWLD_HTF_TIMING_REVIEW_LABELS.map((label) => [label, 0])) as Record<TimingReviewLabel, number>;
}

function boolUnknown(value: boolean | null | undefined): boolean | 'unknown' {
  if (typeof value === 'boolean') return value;
  return 'unknown';
}

export function suggestTimingLabel(candidate: Pick<
  HtfQualityCandidate,
  | 'deliveryOccurredDuringWindow'
  | 'deliveryOccurredAfterWindow'
  | 'executionWindowAlignment'
  | 'executionWindowConflictsWithHtfDraw'
  | 'drawConflictCount'
  | 'qualityAdjustedTwldPriority'
  | 'htfDrawReachedBeforeWindow'
  | 'htfDrawStillValidDuringWindow'
>): { label: TimingReviewLabel; reason: string } {
  if (candidate.executionWindowAlignment === 'unclear') {
    return { label: 'needs_visual_review', reason: 'Execution-window alignment is unclear.' };
  }
  if (candidate.executionWindowConflictsWithHtfDraw || candidate.executionWindowAlignment === 'conflicting') {
    return { label: 'window_conflicted_with_prior_htf_draw', reason: 'Execution-window behavior conflicted with the prior HTF draw.' };
  }
  if (candidate.deliveryOccurredDuringWindow && candidate.executionWindowAlignment === 'aligned') {
    return { label: 'window_confirmed_prior_htf_draw', reason: 'Delivery occurred during the window and alignment was supportive.' };
  }
  if (candidate.deliveryOccurredAfterWindow && (candidate.executionWindowAlignment === 'aligned' || candidate.executionWindowAlignment === 'neutral')) {
    return { label: 'window_continued_prior_htf_draw', reason: 'Delivery occurred after the window with neutral/supportive alignment.' };
  }
  if (candidate.qualityAdjustedTwldPriority === 'quality_priority_3_conflicting_or_failed_delivery') {
    return { label: 'window_failed_prior_htf_draw', reason: 'Quality priority indicates failed delivery or conflict.' };
  }
  if (candidate.htfDrawReachedBeforeWindow === true && !candidate.deliveryOccurredDuringWindow && !candidate.deliveryOccurredAfterWindow) {
    return { label: 'not_useful_for_timing', reason: 'Draw was already tagged and the window did not add delivery value.' };
  }
  if (candidate.htfDrawReachedBeforeWindow === true && candidate.htfDrawStillValidDuringWindow === false) {
    return { label: 'not_useful_for_timing', reason: 'Draw existed before the window but was already stale by the timing window.' };
  }
  return { label: 'needs_visual_review', reason: 'Fields are insufficient or mixed; chart review is needed.' };
}

function toTimingReviewSample(candidate: HtfQualityCandidate): TimingReviewSample {
  const suggested = suggestTimingLabel(candidate);
  return {
    sampleId: candidate.sampleId,
    symbol: candidate.symbol,
    date: candidate.date,
    window: candidate.windowStudied,
    nyTimeWindow: candidate.windowLabel,
    htfDrawQualityScore: candidate.htfDrawQualityScore,
    htfDrawQualityLabel: candidate.htfDrawQualityLabel,
    dominantDrawSource: candidate.dominantDrawSource,
    dominantDrawTimeframe: candidate.dominantDrawTimeframe,
    drawAlreadyTaggedBeforeWindow: boolUnknown(candidate.htfDrawReachedBeforeWindow),
    drawStillValidDuringWindow: boolUnknown(candidate.htfDrawStillValidDuringWindow),
    deliveryDuringWindow: candidate.deliveryOccurredDuringWindow,
    deliveryAfterWindow: candidate.deliveryOccurredAfterWindow,
    executionWindowAlignment: candidate.executionWindowAlignment,
    conflictCount: candidate.drawConflictCount,
    qualityReasons: candidate.htfDrawQualityReasons,
    suggestedTimingLabel: suggested.label,
    suggestedTimingReason: suggested.reason,
    sourceQualityPriority: candidate.qualityAdjustedTwldPriority,
    sourceCandidateId: candidate.candidateId,
    boundary: RESEARCH_BOUNDARY,
  };
}

function summarizeSuggested(samples: TimingReviewSample[]): Record<TimingReviewLabel, number> {
  const counts = emptyLabelCounts();
  for (const sample of samples) counts[sample.suggestedTimingLabel] += 1;
  return counts;
}

function summarizeReviewed(samples: ReviewedTimingSample[]): TimingReviewSummary {
  const suggestedLabelCounts = emptyLabelCounts();
  const finalLabelCounts = emptyLabelCounts();
  for (const sample of samples) {
    suggestedLabelCounts[sample.suggestedTimingLabel] += 1;
    if (sample.finalTimingLabel) finalLabelCounts[sample.finalTimingLabel] += 1;
  }
  const reviewedSamples = samples.filter((sample) => Boolean(sample.finalTimingLabel)).length;
  return {
    totalSamples: samples.length,
    reviewedSamples,
    unreviewedSamples: samples.length - reviewedSamples,
    suggestedLabelCounts,
    finalLabelCounts,
  };
}

export function buildHtfTimingReviewPack(options: Pick<CliOptions, 'symbol' | 'from' | 'to' | 'sourceReviewSetPath' | 'outDir'>): TimingReviewPack {
  const sourcePath = path.resolve(options.sourceReviewSetPath);
  if (!existsSync(sourcePath)) throw new Error(`HTF-quality review set not found: ${sourcePath}`);
  const reviewSet = readJson<HtfQualityReviewSet>(sourcePath);
  if (reviewSet.reportType !== 'time_window_liquidity_delivery_htf_quality_review_set') throw new Error(`Source file is not an HTF-quality review set: ${sourcePath}`);
  if (reviewSet.symbol !== options.symbol || reviewSet.from !== options.from || reviewSet.to !== options.to) {
    throw new Error(`HTF-quality review set does not match requested ${options.symbol} ${options.from} to ${options.to}.`);
  }
  const candidateMap = new Map([
    ...loadSiblingQualityCandidates(sourcePath, options.symbol, options.from, options.to).map((candidate) => [candidate.sampleId, candidate] as const),
    ...allQualityCandidates(reviewSet).map((candidate) => [candidate.sampleId, candidate] as const),
  ]);
  const samples = reviewSet.recommendedHumanReviewSet.map((item) => {
    const candidate = candidateMap.get(item.sampleId);
    if (!candidate) throw new Error(`Recommended sample ${item.sampleId} was not found in HTF-quality candidate sections.`);
    return toTimingReviewSample(candidate);
  });
  const report: TimingReviewPack = {
    reportType: 'time_window_liquidity_delivery_htf_timing_review_pack',
    generatedAt: new Date().toISOString(),
    symbol: options.symbol,
    from: options.from,
    to: options.to,
    sourceHtfQualityReviewSetPath: sourcePath,
    boundary: RESEARCH_BOUNDARY,
    researchOnlyWarning: REVIEW_WARNING,
    executionTimeframeRule: '5m_execution_only',
    drawContextRule: 'coded_timeframes_above_5m_are_draw_context',
    supportedLabels: TWLD_HTF_TIMING_REVIEW_LABELS,
    labelDefinitions: LABEL_DEFINITIONS,
    suggestedLabelSummary: summarizeSuggested(samples),
    samples,
    outputPaths: packPaths(options),
  };
  assertNoExecutableLedgerFields(report);
  return report;
}

function reviewedSampleFromPack(sample: TimingReviewSample, existing?: ReviewedTimingSample): ReviewedTimingSample {
  return {
    ...sample,
    finalTimingLabel: existing?.finalTimingLabel || null,
    reviewer: existing?.reviewer || null,
    reviewedAt: existing?.reviewedAt || null,
    reviewerNotes: existing?.reviewerNotes || null,
    reviewHistory: existing?.reviewHistory || [],
    safety: SAFETY_FIELDS,
  };
}

export function buildReviewedTimingReport(pack: TimingReviewPack, options: CliOptions): ReviewedTimingReport {
  const paths = reviewedPaths(options);
  const existing = existsSync(paths.jsonPath) ? readJson<ReviewedTimingReport>(paths.jsonPath) : null;
  const existingById = new Map((existing?.samples || []).map((sample) => [sample.sampleId, sample]));
  const samples = pack.samples.map((sample) => reviewedSampleFromPack(sample, existingById.get(sample.sampleId)));
  if (options.sampleId && options.label) {
    const sample = samples.find((item) => item.sampleId === options.sampleId);
    if (!sample) throw new Error(`Unknown HTF timing review sample ID: ${options.sampleId}`);
    const record: TimingReviewHistoryRecord = {
      label: options.label,
      reviewer: options.reviewer || 'human',
      reviewedAt: new Date().toISOString(),
      notes: options.notes || null,
    };
    sample.finalTimingLabel = record.label;
    sample.reviewer = record.reviewer;
    sample.reviewedAt = record.reviewedAt;
    sample.reviewerNotes = record.notes;
    sample.reviewHistory = [...sample.reviewHistory, record];
  }
  const report: ReviewedTimingReport = {
    reportType: 'time_window_liquidity_delivery_htf_timing_review',
    generatedAt: new Date().toISOString(),
    symbol: pack.symbol,
    from: pack.from,
    to: pack.to,
    sourceTimingReviewPackPath: pack.outputPaths.jsonPath,
    sourceHtfQualityReviewSetPath: pack.sourceHtfQualityReviewSetPath,
    boundary: RESEARCH_BOUNDARY,
    researchOnlyWarning: REVIEW_WARNING,
    executionTimeframeRule: '5m_execution_only',
    drawContextRule: 'coded_timeframes_above_5m_are_draw_context',
    supportedLabels: TWLD_HTF_TIMING_REVIEW_LABELS,
    labelDefinitions: LABEL_DEFINITIONS,
    safety: SAFETY_FIELDS,
    summary: summarizeReviewed(samples),
    samples,
    outputPaths: paths,
  };
  assertNoExecutableLedgerFields(report);
  return report;
}

function title(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

function yesNo(value: boolean): string {
  return value ? 'Yes' : 'No';
}

function sampleRow(sample: TimingReviewSample | ReviewedTimingSample): string {
  const reviewed = 'finalTimingLabel' in sample ? sample.finalTimingLabel || 'unreviewed' : 'not applied';
  return `| ${sample.sampleId} | ${sample.date} | ${sample.window} | ${sample.nyTimeWindow} | ${sample.htfDrawQualityScore} | ${sample.htfDrawQualityLabel} | ${sample.executionWindowAlignment} | ${yesNo(sample.deliveryDuringWindow)} | ${yesNo(sample.deliveryAfterWindow)} | ${sample.suggestedTimingLabel} | ${reviewed} |`;
}

function renderLabelDefinitions(): string[] {
  return TWLD_HTF_TIMING_REVIEW_LABELS.map((label) => `- ${label}: ${LABEL_DEFINITIONS[label]}`);
}

export function renderHtfTimingReviewPackMarkdown(report: TimingReviewPack): string {
  return [
    `# Time-Window Liquidity Delivery HTF Timing Review Pack - ${report.symbol}`,
    '',
    report.researchOnlyWarning,
    'This timing review does not approve trades and does not create execution authority.',
    '5M is execution-only. All coded HTFs above 5M are draw-context sources.',
    '',
    `Source HTF-quality review set: ${report.sourceHtfQualityReviewSetPath}`,
    `Date range: ${report.from} to ${report.to}`,
    `Boundary: ${report.boundary}`,
    '',
    '## Label Definitions',
    ...renderLabelDefinitions(),
    '',
    '## Suggested Label Summary',
    ...TWLD_HTF_TIMING_REVIEW_LABELS.map((label) => `- ${label}: ${report.suggestedLabelSummary[label]}`),
    '',
    '## Review Progress Summary',
    `- Total Samples: ${report.samples.length}`,
    '- Reviewed Samples: 0',
    `- Unreviewed Samples: ${report.samples.length}`,
    '',
    '## Sample Table',
    '| Sample ID | Date | Window | NY Time Window | HTF Score | HTF Label | Alignment | Delivery During | Delivery After | Suggested Timing Label | Final Timing Label |',
    '|---|---:|---|---|---:|---|---|---|---|---|---|',
    ...report.samples.map(sampleRow),
    '',
    'Research-only. Suggested labels are not final labels until a human applies them sample-by-sample.',
  ].join('\n');
}

export function renderReviewedHtfTimingReviewMarkdown(report: ReviewedTimingReport): string {
  return [
    `# Time-Window Liquidity Delivery HTF Timing Review - ${report.symbol}`,
    '',
    report.researchOnlyWarning,
    'This timing review does not approve trades and does not create execution authority.',
    '5M is execution-only. All coded HTFs above 5M are draw-context sources.',
    '',
    `Source pack: ${report.sourceTimingReviewPackPath}`,
    `Source HTF-quality review set: ${report.sourceHtfQualityReviewSetPath}`,
    `Date range: ${report.from} to ${report.to}`,
    `Boundary: ${report.boundary}`,
    '',
    '## Safety',
    `- Activates Model: ${yesNo(report.safety.activatesModel)}`,
    `- Approves Execution: ${yesNo(report.safety.approvesExecution)}`,
    `- Creates Trade: ${yesNo(report.safety.createsTrade)}`,
    `- Changes Scanner: ${yesNo(report.safety.changesScanner)}`,
    `- Changes Bridge: ${yesNo(report.safety.changesBridge)}`,
    `- Changes Rules: ${yesNo(report.safety.changesRules)}`,
    `- Changes Readiness: ${yesNo(report.safety.changesReadiness)}`,
    '',
    '## Label Definitions',
    ...renderLabelDefinitions(),
    '',
    '## Review Progress Summary',
    `- Total Samples: ${report.summary.totalSamples}`,
    `- Reviewed Samples: ${report.summary.reviewedSamples}`,
    `- Unreviewed Samples: ${report.summary.unreviewedSamples}`,
    '',
    '## Suggested Label Summary',
    ...TWLD_HTF_TIMING_REVIEW_LABELS.map((label) => `- ${label}: ${report.summary.suggestedLabelCounts[label]}`),
    '',
    '## Final Label Summary',
    ...TWLD_HTF_TIMING_REVIEW_LABELS.map((label) => `- ${label}: ${report.summary.finalLabelCounts[label]}`),
    '',
    '## Samples',
    '| Sample ID | Date | Window | NY Time Window | HTF Score | HTF Label | Alignment | Delivery During | Delivery After | Suggested Timing Label | Final Timing Label |',
    '|---|---:|---|---|---:|---|---|---|---|---|---|',
    ...report.samples.map(sampleRow),
    '',
    '## Reviewed Groups',
    ...TWLD_HTF_TIMING_REVIEW_LABELS.flatMap((label) => {
      const samples = report.samples.filter((sample) => sample.finalTimingLabel === label);
      return [`### ${title(label)}`, samples.length ? samples.map((sample) => `- ${sample.sampleId}: ${sample.reviewerNotes || ''}`).join('\n') : '_No samples reviewed with this label._', ''];
    }),
    'Research-only. Human timing labels do not approve trades, models, scanner output, bridge behavior, or execution.',
  ].join('\n');
}

export function writeHtfTimingReviewPack(report: TimingReviewPack): void {
  mkdirSync(path.dirname(report.outputPaths.jsonPath), { recursive: true });
  writeFileSync(report.outputPaths.jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(report.outputPaths.markdownPath, `${renderHtfTimingReviewPackMarkdown(report)}\n`, 'utf8');
}

export function writeReviewedHtfTimingReview(report: ReviewedTimingReport): void {
  mkdirSync(path.dirname(report.outputPaths.jsonPath), { recursive: true });
  writeFileSync(report.outputPaths.jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(report.outputPaths.markdownPath, `${renderReviewedHtfTimingReviewMarkdown(report)}\n`, 'utf8');
}

export async function runTimeWindowLiquidityDeliveryHtfTimingReview(options: CliOptions): Promise<{
  pack: TimingReviewPack;
  reviewed: ReviewedTimingReport;
}> {
  const pack = buildHtfTimingReviewPack(options);
  writeHtfTimingReviewPack(pack);
  const reviewed = buildReviewedTimingReport(pack, options);
  writeReviewedHtfTimingReview(reviewed);
  return { pack, reviewed };
}

export async function runTimeWindowLiquidityDeliveryHtfTimingReviewCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseTimeWindowLiquidityDeliveryHtfTimingReviewArgs(rawArgs);
  const result = await runTimeWindowLiquidityDeliveryHtfTimingReview(options);
  if (options.json) console.log(JSON.stringify(result, null, 2));
  if (options.pretty) {
    console.log([
      '[TIME-WINDOW LIQUIDITY DELIVERY HTF TIMING REVIEW]',
      `Symbol: ${result.pack.symbol}`,
      `Date range: ${result.pack.from} to ${result.pack.to}`,
      `Source review set: ${result.pack.sourceHtfQualityReviewSetPath}`,
      `Pack JSON: ${result.pack.outputPaths.jsonPath}`,
      `Pack Markdown: ${result.pack.outputPaths.markdownPath}`,
      `Reviewed JSON: ${result.reviewed.outputPaths.jsonPath}`,
      `Reviewed Markdown: ${result.reviewed.outputPaths.markdownPath}`,
      `Total samples: ${result.reviewed.summary.totalSamples}`,
      `Reviewed: ${result.reviewed.summary.reviewedSamples}`,
      `Unreviewed: ${result.reviewed.summary.unreviewedSamples}`,
      ...TWLD_HTF_TIMING_REVIEW_LABELS.map((label) => `${label}: ${result.reviewed.summary.finalLabelCounts[label]}`),
      'This timing review does not approve trades and does not create execution authority.',
    ].join('\n'));
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tools/automation/time-window-liquidity-delivery-htf-timing-review.ts')) {
  runTimeWindowLiquidityDeliveryHtfTimingReviewCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
