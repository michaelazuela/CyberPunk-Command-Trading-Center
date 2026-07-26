import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertNoExecutableLedgerFields } from './model-candidate-ledger';

type AuditWindowCode = 'LONDON' | 'AM' | 'PM';
type OverlapClassification =
  | 'model_1_overlap_possible'
  | 'HISTORICAL_REVERSAL_overlap_possible'
  | 'advisory_only_time_window_research';
type CuratedBucket =
  | 'advisory_only_samples'
  | 'best_clean_draw_delivery_achieved_samples'
  | 'clean_draw_failed_delivery_samples'
  | 'model_1_overlap_samples'
  | 'HISTORICAL_REVERSAL_overlap_samples';
type SuggestedReviewLabel =
  | 'strong_advisory_candidate'
  | 'covered_by_model_1'
  | 'covered_by_uninstalled_context'
  | 'weak_or_noisy'
  | 'needs_chart_review'
  | 'reject_time_window_standalone';

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
  symbol: string;
  windowId: string;
  windowLabel: string;
  cleanDrawObserved: boolean;
  expectedDeliveryHandles: number;
  expectedDeliveryTicks: number;
  deliveryAchieved: boolean;
  failedDelivery: boolean;
  fvgOrInefficiencyFormedInsideWindow: boolean;
  marketStructureShiftPresent: boolean;
  sweepRaidPlusReclaimPresent: boolean;
  overlapClassification: OverlapClassification;
  priorLiquidityReferences: LiquidityReference[];
  notes: string[];
  boundary: 'research_only_not_execution_authority';
}

interface AuditReport {
  reportType: 'time_window_liquidity_delivery_audit';
  symbol: string;
  from: string;
  to: string;
  windowStudied: AuditWindowCode;
  windowDefinition: { displayName: string };
  boundary: 'research_only_not_execution_authority';
  researchOnlyWarning: string;
  summary: Record<string, number>;
  candidates: AuditCandidate[];
}

interface CuratedSample {
  sampleId: string;
  sourceCandidateId: string;
  date: string;
  window: string;
  nyTime: string;
  symbol: string;
  classificationBucket: CuratedBucket;
  drawType: string;
  drawLevel: number | null;
  fvgOrInefficiencyPresent: boolean;
  marketStructureShiftPresent: boolean;
  sweepRaidPlusReclaimPresent: boolean;
  deliveryStatus: 'achieved' | 'failed' | 'not_observed';
  modelOneOverlap: boolean;
  historicalReversalOverlap: boolean;
  advisoryOnly: boolean;
  suggestedReviewLabels: SuggestedReviewLabel[];
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
  reviewLabelsAreSuggestionsOnly: true;
  suggestedReviewLabels: SuggestedReviewLabel[];
  bucketSummary: Record<CuratedBucket, number>;
  allAdvisoryOnlySamplesIncluded: boolean;
  selectionLogic: string[];
  amVsPmComparison?: {
    amAuditPath: string | null;
    pmAuditPath: string;
    amReviewedPath: string | null;
    amCandidates: number | null;
    pmCandidates: number;
    amCleanDraws: number | null;
    pmCleanDraws: number;
    amAdvisoryOnly: number | null;
    pmAdvisoryOnly: number;
    amModelOneOverlap: number | null;
    pmModelOneOverlap: number;
    amhistoricalReversalOverlap: number | null;
    pmhistoricalReversalOverlap: number;
    amRejectionPosture: string;
    comparisonRead: 'pm_more_promising' | 'pm_less_promising' | 'too_early_to_tell';
    note: string;
  };
  samples: CuratedSample[];
  humanReviewInstructions: string[];
  outputPaths: {
    jsonPath: string;
    markdownPath: string;
  };
}

interface CurateOptions {
  symbol: string;
  from: string;
  to: string;
  window: AuditWindowCode;
  sourceAuditPath: string;
  outDir: string;
  pretty: boolean;
  json: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'time-window-liquidity-delivery');
const DEFAULT_OUT_DIR = path.join(DEFAULT_AUDIT_DIR, 'review-packs');
const BUCKET_ORDER: CuratedBucket[] = [
  'advisory_only_samples',
  'best_clean_draw_delivery_achieved_samples',
  'clean_draw_failed_delivery_samples',
  'model_1_overlap_samples',
  'HISTORICAL_REVERSAL_overlap_samples',
];
const SUGGESTED_LABELS: SuggestedReviewLabel[] = [
  'strong_advisory_candidate',
  'covered_by_model_1',
  'covered_by_uninstalled_context',
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
  const normalized = (value || 'AM').toUpperCase();
  if (normalized !== 'AM' && normalized !== 'LONDON' && normalized !== 'PM') throw new Error('--window must be AM, LONDON, or PM.');
  return normalized;
}

function defaultAuditPath(symbol: string, window: AuditWindowCode): string {
  return path.join(DEFAULT_AUDIT_DIR, `time-window-liquidity-delivery-audit-${symbol}-${window}.json`);
}

export function parseTimeWindowLiquidityDeliveryCurateArgs(args = process.argv.slice(2)): CurateOptions {
  const symbol = (readFlag(args, '--symbol') || 'MES').toUpperCase();
  const window = parseWindow(readFlag(args, '--window'));
  return {
    symbol,
    from: requireDate(readFlag(args, '--from') || '2018-01-01', '--from'),
    to: requireDate(readFlag(args, '--to') || '2026-05-31', '--to'),
    window,
    sourceAuditPath: readFlag(args, '--audit') || defaultAuditPath(symbol, window),
    outDir: readFlag(args, '--out') || DEFAULT_OUT_DIR,
    pretty: hasFlag(args, '--pretty') || !hasFlag(args, '--json'),
    json: hasFlag(args, '--json'),
  };
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

function bestDraw(candidate: AuditCandidate): LiquidityReference | null {
  const clean = candidate.priorLiquidityReferences
    .filter((reference) => reference.roomAtWindowOpen)
    .sort((a, b) => Number(b.reachedInsideWindow) - Number(a.reachedInsideWindow) || b.distanceFromWindowOpen - a.distanceFromWindowOpen);
  return clean[0] || null;
}

function deliveryStatus(candidate: AuditCandidate): CuratedSample['deliveryStatus'] {
  if (candidate.deliveryAchieved) return 'achieved';
  if (candidate.failedDelivery) return 'failed';
  return 'not_observed';
}

function score(candidate: AuditCandidate): number {
  return [
    candidate.cleanDrawObserved ? 1000 : 0,
    candidate.deliveryAchieved ? 500 : 0,
    candidate.fvgOrInefficiencyFormedInsideWindow ? 200 : 0,
    candidate.marketStructureShiftPresent ? 150 : 0,
    candidate.sweepRaidPlusReclaimPresent ? 100 : 0,
    candidate.expectedDeliveryHandles,
  ].reduce((sum, value) => sum + value, 0);
}

function sortPreferred(candidates: AuditCandidate[]): AuditCandidate[] {
  return [...candidates].sort((a, b) => score(b) - score(a) || a.date.localeCompare(b.date));
}

function labelsFor(bucket: CuratedBucket, candidate: AuditCandidate): SuggestedReviewLabel[] {
  if (bucket === 'model_1_overlap_samples') return ['covered_by_model_1', 'needs_chart_review'];
  if (bucket === 'HISTORICAL_REVERSAL_overlap_samples') return ['covered_by_uninstalled_context', 'needs_chart_review'];
  if (bucket === 'clean_draw_failed_delivery_samples') return ['weak_or_noisy', 'needs_chart_review'];
  if (bucket === 'advisory_only_samples') return ['strong_advisory_candidate', 'needs_chart_review', 'reject_time_window_standalone'];
  if (candidate.cleanDrawObserved && candidate.deliveryAchieved) return ['strong_advisory_candidate', 'needs_chart_review'];
  return ['needs_chart_review'];
}

function inclusionReasons(bucket: CuratedBucket, candidate: AuditCandidate): string[] {
  const reasons = [`Selected for ${bucket.replace(/_/g, ' ')}.`];
  if (candidate.overlapClassification === 'advisory_only_time_window_research') reasons.push('Advisory-only classification may show behavior not already covered by no installed model path.');
  if (candidate.cleanDrawObserved) reasons.push('Clean draw observed.');
  if (candidate.deliveryAchieved) reasons.push('Delivery achieved.');
  if (candidate.failedDelivery) reasons.push('Failed delivery included to reduce survivorship bias.');
  if (candidate.fvgOrInefficiencyFormedInsideWindow) reasons.push('FVG/inefficiency present.');
  if (candidate.marketStructureShiftPresent) reasons.push('Market structure shift present.');
  if (candidate.sweepRaidPlusReclaimPresent) reasons.push('Sweep/raid plus reclaim present.');
  if (candidate.overlapClassification === 'model_1_overlap_possible') reasons.push('no installed model path overlap is advisory only and must be reviewed through existing no installed model path rules.');
  if (candidate.overlapClassification === 'HISTORICAL_REVERSAL_overlap_possible') reasons.push('no installed model path overlap is advisory only and must be reviewed through existing no installed model path rules.');
  return reasons;
}

function sampleFrom(bucket: CuratedBucket, candidate: AuditCandidate): CuratedSample {
  const draw = bestDraw(candidate);
  return {
    sampleId: `${bucket}-${candidate.candidateId}`,
    sourceCandidateId: candidate.candidateId,
    date: candidate.date,
    window: candidate.windowLabel,
    nyTime: candidate.windowLabel.replace(/^.*?(\d{1,2}:\d{2}-\d{1,2}:\d{2}).*$/, '$1'),
    symbol: candidate.symbol,
    classificationBucket: bucket,
    drawType: draw?.kind || 'not_available',
    drawLevel: draw?.price ?? null,
    fvgOrInefficiencyPresent: candidate.fvgOrInefficiencyFormedInsideWindow,
    marketStructureShiftPresent: candidate.marketStructureShiftPresent,
    sweepRaidPlusReclaimPresent: candidate.sweepRaidPlusReclaimPresent,
    deliveryStatus: deliveryStatus(candidate),
    modelOneOverlap: candidate.overlapClassification === 'model_1_overlap_possible',
    historicalReversalOverlap: candidate.overlapClassification === 'HISTORICAL_REVERSAL_overlap_possible',
    advisoryOnly: candidate.overlapClassification === 'advisory_only_time_window_research',
    suggestedReviewLabels: labelsFor(bucket, candidate),
    chartPath: null,
    reportPath: null,
    inclusionReasons: inclusionReasons(bucket, candidate),
    researchOnly: true,
    boundary: 'research_only_not_execution_authority',
  };
}

function outputPaths(options: CurateOptions): CuratedReviewPack['outputPaths'] {
  const base = path.join(path.resolve(options.outDir), `time-window-liquidity-delivery-${options.window}-curated-review-pack-${options.symbol}-${options.from}-to-${options.to}`);
  return { jsonPath: `${base}.json`, markdownPath: `${base}.md` };
}

function defaultReviewedPath(symbol: string, window: AuditWindowCode, from: string, to: string): string {
  return path.join(DEFAULT_AUDIT_DIR, 'review-packs', 'reviewed', `time-window-liquidity-delivery-${window}-curated-review-pack-${symbol}-${from}-to-${to}.reviewed.json`);
}

function readOptionalJson<T>(file: string): T | null {
  if (!existsSync(file)) return null;
  return readJson<T>(file);
}

function buildAmVsPmComparison(options: CurateOptions, audit: AuditReport): CuratedReviewPack['amVsPmComparison'] | undefined {
  if (options.window !== 'PM') return undefined;
  const pmAuditPath = path.resolve(options.sourceAuditPath);
  const amAuditPath = path.join(path.dirname(pmAuditPath), `time-window-liquidity-delivery-audit-${options.symbol}-AM.json`);
  const amAudit = readOptionalJson<AuditReport>(amAuditPath);
  const amReviewedPath = defaultReviewedPath(options.symbol, 'AM', options.from, options.to);
  const amReviewed = readOptionalJson<{ summary?: { labelCounts?: Record<string, number> } }>(amReviewedPath);
  const amRejects = amReviewed?.summary?.labelCounts?.reject_time_window_standalone ?? null;
  const amNeedsChart = amReviewed?.summary?.labelCounts?.needs_chart_review ?? null;
  const amStrong = amReviewed?.summary?.labelCounts?.strong_advisory_candidate ?? null;
  const amRejectionPosture = amReviewed
    ? `After TWLD-5, AM remains research-only/advisory-only: strong=${amStrong ?? 0}, needs_chart_review=${amNeedsChart ?? 0}, rejected_standalone=${amRejects ?? 0}.`
    : 'AM reviewed labels were not available for comparison.';
  return {
    amAuditPath: amAudit ? amAuditPath : null,
    pmAuditPath,
    amReviewedPath: amReviewed ? amReviewedPath : null,
    amCandidates: amAudit?.summary.candidateCount ?? null,
    pmCandidates: audit.summary.candidateCount,
    amCleanDraws: amAudit?.summary.cleanDrawCount ?? null,
    pmCleanDraws: audit.summary.cleanDrawCount,
    amAdvisoryOnly: amAudit?.summary.advisoryOnlyCount ?? null,
    pmAdvisoryOnly: audit.summary.advisoryOnlyCount,
    amModelOneOverlap: amAudit?.summary.modelOneOverlapCount ?? null,
    pmModelOneOverlap: audit.summary.modelOneOverlapCount,
    amhistoricalReversalOverlap: amAudit?.summary.historicalReversalOverlapCount ?? null,
    pmhistoricalReversalOverlap: audit.summary.historicalReversalOverlapCount,
    amRejectionPosture,
    comparisonRead: 'too_early_to_tell',
    note: 'PM has separate research evidence, but no promotion decision is made. PM requires human review before any standalone interpretation.',
  };
}

export function buildTimeWindowLiquidityDeliveryCuratedReviewPack(options: CurateOptions): CuratedReviewPack {
  if (!existsSync(options.sourceAuditPath)) throw new Error(`Source audit JSON not found: ${options.sourceAuditPath}`);
  const audit = readJson<AuditReport>(options.sourceAuditPath);
  if (audit.reportType !== 'time_window_liquidity_delivery_audit') throw new Error(`Source audit is not a TWLD audit: ${options.sourceAuditPath}`);
  if (audit.symbol !== options.symbol || audit.windowStudied !== options.window) {
    throw new Error(`Source audit does not match requested ${options.symbol} ${options.window}.`);
  }
  const buckets: Record<CuratedBucket, AuditCandidate[]> = {
    advisory_only_samples: audit.candidates.filter((candidate) => candidate.overlapClassification === 'advisory_only_time_window_research'),
    best_clean_draw_delivery_achieved_samples: sortPreferred(audit.candidates.filter((candidate) => candidate.cleanDrawObserved && candidate.deliveryAchieved)).slice(0, 10),
    clean_draw_failed_delivery_samples: sortPreferred(audit.candidates.filter((candidate) => candidate.cleanDrawObserved && candidate.failedDelivery)).slice(0, 10),
    model_1_overlap_samples: sortPreferred(audit.candidates.filter((candidate) => candidate.overlapClassification === 'model_1_overlap_possible')).slice(0, 10),
    HISTORICAL_REVERSAL_overlap_samples: sortPreferred(audit.candidates.filter((candidate) => candidate.overlapClassification === 'HISTORICAL_REVERSAL_overlap_possible')).slice(0, 10),
  };
  const samples = BUCKET_ORDER.flatMap((bucket) => buckets[bucket].map((candidate) => sampleFrom(bucket, candidate)));
  const paths = outputPaths(options);
  const pack: CuratedReviewPack = {
    reportType: 'time_window_liquidity_delivery_curated_review_pack',
    generatedAt: new Date().toISOString(),
    symbol: options.symbol,
    from: options.from,
    to: options.to,
    windowStudied: options.window,
    sourceAuditPath: path.resolve(options.sourceAuditPath),
    boundary: 'research_only_not_execution_authority',
    researchOnlyWarning: 'Research-only. This curated review pack does not approve trades and does not create execution authority.',
    reviewLabelsAreSuggestionsOnly: true,
    suggestedReviewLabels: SUGGESTED_LABELS,
    bucketSummary: Object.fromEntries(BUCKET_ORDER.map((bucket) => [bucket, buckets[bucket].length])) as Record<CuratedBucket, number>,
    allAdvisoryOnlySamplesIncluded: buckets.advisory_only_samples.length === audit.summary.advisoryOnlyCount,
    selectionLogic: [
      `Include all advisory-only ${options.window} samples.`,
      'Select up to 10 clean-draw delivery-achieved samples, preferring FVG/inefficiency, MSS, historical reversal pattern, and larger expected delivery distance.',
      'Select up to 10 clean-draw failed-delivery samples for failure-mode review.',
      'Select up to 10 no installed model path overlap samples, preferring clean draw and delivery achieved.',
      'Select up to 10 no installed model path overlap samples, preferring clean draw and delivery achieved.',
      'Suggested labels are not final labels and do not change readiness, model approval, scanner behavior, or execution authority.',
    ],
    samples,
    humanReviewInstructions: [
      'Review charts before applying any final human label.',
      'Use covered_by_model_1 only if the sample should remain under existing no installed model path review.',
      'Use covered_by_uninstalled_context only if the sample should remain under existing no installed model path review.',
      'Use strong_advisory_candidate only for research discussion, not execution approval.',
      'Reject time-window standalone behavior when the evidence is noisy or already covered by installed models.',
    ],
    outputPaths: paths,
    amVsPmComparison: buildAmVsPmComparison(options, audit),
  };
  assertNoExecutableLedgerFields(pack);
  return pack;
}

function yesNo(value: boolean): string {
  return value ? 'Yes' : 'No';
}

function bucketTitle(bucket: CuratedBucket): string {
  return bucket.replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

export function renderTimeWindowLiquidityDeliveryCuratedMarkdown(pack: CuratedReviewPack): string {
  return [
    `# Time-Window Liquidity Delivery AM Curated Review Pack - ${pack.symbol}`,
    '',
    pack.researchOnlyWarning,
    'This curated review pack does not approve trades and does not create execution authority.',
    '',
    `Source audit: ${pack.sourceAuditPath}`,
    `Date range: ${pack.from} to ${pack.to}`,
    `Window: ${pack.windowStudied}`,
    `Boundary: ${pack.boundary}`,
    '',
    '## Bucket Summary',
    ...BUCKET_ORDER.map((bucket) => `- ${bucketTitle(bucket)}: ${pack.bucketSummary[bucket]}`),
    `- All advisory-only samples included: ${yesNo(pack.allAdvisoryOnlySamplesIncluded)}`,
    '',
    '## Why Each Bucket Matters',
    '- Advisory-only samples may reveal behavior not covered by no installed models.',
    '- Clean-draw delivery-achieved samples show the strongest research examples.',
    '- Clean-draw failed-delivery samples protect against survivorship bias.',
    '- no installed model path overlap samples test whether the AM window improves context without creating a new model.',
    '- no installed model path overlap samples test whether the AM window improves historical reversal pattern context without creating a new model.',
    '',
    '## Human Review Instructions',
    ...pack.humanReviewInstructions.map((instruction) => `- ${instruction}`),
    '',
    ...(pack.amVsPmComparison ? [
      '## AM vs PM Comparison',
      `- AM candidates: ${pack.amVsPmComparison.amCandidates ?? 'not available'}`,
      `- PM candidates: ${pack.amVsPmComparison.pmCandidates}`,
      `- AM clean draws: ${pack.amVsPmComparison.amCleanDraws ?? 'not available'}`,
      `- PM clean draws: ${pack.amVsPmComparison.pmCleanDraws}`,
      `- AM advisory-only count: ${pack.amVsPmComparison.amAdvisoryOnly ?? 'not available'}`,
      `- PM advisory-only count: ${pack.amVsPmComparison.pmAdvisoryOnly}`,
      `- AM no installed model path overlap: ${pack.amVsPmComparison.amModelOneOverlap ?? 'not available'}`,
      `- PM no installed model path overlap: ${pack.amVsPmComparison.pmModelOneOverlap}`,
      `- AM no installed model path overlap: ${pack.amVsPmComparison.amhistoricalReversalOverlap ?? 'not available'}`,
      `- PM no installed model path overlap: ${pack.amVsPmComparison.pmhistoricalReversalOverlap}`,
      `- AM rejection posture: ${pack.amVsPmComparison.amRejectionPosture}`,
      `- Comparison read: ${pack.amVsPmComparison.comparisonRead}`,
      `- Note: ${pack.amVsPmComparison.note}`,
      '- No promotion decision is made by this comparison.',
      '',
    ] : []),
    ...BUCKET_ORDER.flatMap((bucket) => {
      const rows = pack.samples.filter((sample) => sample.classificationBucket === bucket);
      return [
        `## ${bucketTitle(bucket)}`,
        '| Sample ID | Date | Draw | FVG | MSS | Sweep/Reclaim | Delivery | Suggested Labels | Inclusion Reasons |',
        '|---|---|---|---:|---:|---:|---|---|---|',
        ...rows.map((sample) =>
          `| ${sample.sampleId} | ${sample.date} | ${sample.drawType} ${sample.drawLevel ?? 'n/a'} | ${yesNo(sample.fvgOrInefficiencyPresent)} | ${yesNo(sample.marketStructureShiftPresent)} | ${yesNo(sample.sweepRaidPlusReclaimPresent)} | ${sample.deliveryStatus} | ${sample.suggestedReviewLabels.join(', ')} | ${sample.inclusionReasons.join(' ')} |`
        ),
        rows.length ? '' : '_No samples selected._',
        '',
      ];
    }),
    'Research-only. Suggested labels are not final labels and do not approve trades, models, alerts, or execution.',
  ].join('\n');
}

export function writeTimeWindowLiquidityDeliveryCuratedReviewPack(pack: CuratedReviewPack): void {
  mkdirSync(path.dirname(pack.outputPaths.jsonPath), { recursive: true });
  writeFileSync(pack.outputPaths.jsonPath, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
  writeFileSync(pack.outputPaths.markdownPath, `${renderTimeWindowLiquidityDeliveryCuratedMarkdown(pack)}\n`, 'utf8');
}

export async function runTimeWindowLiquidityDeliveryCurateCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseTimeWindowLiquidityDeliveryCurateArgs(rawArgs);
  const pack = buildTimeWindowLiquidityDeliveryCuratedReviewPack(options);
  writeTimeWindowLiquidityDeliveryCuratedReviewPack(pack);
  if (options.json) console.log(JSON.stringify(pack, null, 2));
  if (options.pretty) {
    console.log([
      '[TIME-WINDOW LIQUIDITY DELIVERY CURATED REVIEW PACK]',
      `Symbol: ${pack.symbol}`,
      `Date range: ${pack.from} to ${pack.to}`,
      `Window: ${pack.windowStudied}`,
      `Source audit: ${pack.sourceAuditPath}`,
      `JSON: ${pack.outputPaths.jsonPath}`,
      `Markdown: ${pack.outputPaths.markdownPath}`,
      ...BUCKET_ORDER.map((bucket) => `${bucketTitle(bucket)}: ${pack.bucketSummary[bucket]}`),
      `All advisory-only samples included: ${yesNo(pack.allAdvisoryOnlySamplesIncluded)}`,
      'Research-only. This curated review pack does not approve trades and does not create execution authority.',
    ].join('\n'));
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tools/automation/time-window-liquidity-delivery-curate.ts')) {
  runTimeWindowLiquidityDeliveryCurateCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
