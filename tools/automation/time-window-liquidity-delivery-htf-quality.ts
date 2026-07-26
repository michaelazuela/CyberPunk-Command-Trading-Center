import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertNoExecutableLedgerFields } from './model-candidate-ledger';

type AuditWindowCode = 'AM' | 'PM' | 'LONDON';
type SupportedTimeframe =
  | '1m'
  | '5m'
  | '15m'
  | '30m'
  | '60m'
  | '1h'
  | '240m'
  | '4h'
  | 'daily'
  | 'session';
type HtfDrawQualityLabel = 'strong' | 'medium' | 'weak' | 'conflicting' | 'none' | 'unclear';
type ExecutionWindowAlignment = 'aligned' | 'conflicting' | 'neutral' | 'unclear';
type QualityAdjustedTwldPriority =
  | 'quality_priority_1_strong_htf_draw_delivery'
  | 'quality_priority_2_strong_or_medium_htf_draw_needs_review'
  | 'quality_priority_3_conflicting_or_failed_delivery'
  | 'quality_priority_4_weak_context_only'
  | 'quality_priority_5_no_actionable_htf_draw';

interface CliOptions {
  symbol: string;
  from: string;
  to: string;
  windows: AuditWindowCode[];
  htfFirstDir: string;
  outDir: string;
  pretty: boolean;
  json: boolean;
}

interface TimeframeDiscovery {
  codedSupportedTimeframes: SupportedTimeframe[];
  discoveredHigherTimeframes: SupportedTimeframe[];
  cachedMarketBarTimeframes: SupportedTimeframe[];
  bridgeOnlyTimeframes: SupportedTimeframe[];
  diagnosticOnlyTimeframes: SupportedTimeframe[];
  chartContextTimeframes: SupportedTimeframe[];
  sessionDerivedTimeframes: SupportedTimeframe[];
  executionTimeframe: '5m';
  executionTimeframeRole: 'execution_only';
  notes: string[];
}

interface DrawReference {
  kind: string;
  timeframe: SupportedTimeframe;
  price: number;
  reachedInsideWindow: boolean;
  reachedBeforeWindow: boolean;
  stillValidDuringWindow: boolean;
  distanceFromWindowOpen: number;
  source: 'candle_derived' | 'session_derived';
}

interface HtfFirstCandidate {
  candidateId: string;
  date: string;
  symbol: string;
  windowStudied: AuditWindowCode;
  windowLabel: string;
  executionTimeframe: '5m';
  executionTimeframeRole: 'execution_only';
  discoveredHigherTimeframes: SupportedTimeframe[];
  availableDrawContextTimeframes: SupportedTimeframe[];
  primaryDrawContextTimeframes: SupportedTimeframe[];
  primaryDrawTimeframe: SupportedTimeframe | null;
  drawSourceTimeframes: SupportedTimeframe[];
  htfDrawContextPresent: boolean;
  htfDrawContextStatus: 'present' | 'missing' | 'conflicting' | 'unclear';
  htfDrawType: string | null;
  htfDrawLevel: number | null;
  htfDrawStillValidDuringWindow: boolean | null;
  htfDrawReachedBeforeWindow: boolean | null;
  executionWindowSupportsHtfDraw: boolean;
  executionWindowConflictsWithHtfDraw: boolean;
  deliveryOccurredDuringWindow: boolean;
  deliveryOccurredAfterWindow: boolean;
  twldContextClassification: string;
  htfFirstBucket: string;
  fvgOrInefficiencyPresent: boolean;
  marketStructureShiftPresent: boolean;
  sweepRaidPlusReclaimPresent: boolean;
  modelOneOverlapPossible: boolean;
  historicalReversalOverlapPossible: boolean;
  drawReferences: DrawReference[];
  notes: string[];
  researchOnly: true;
  boundary: 'research_only_not_execution_authority';
}

interface HtfFirstAuditReport {
  reportType: 'time_window_liquidity_delivery_htf_first_audit';
  generatedAt: string;
  symbol: string;
  from: string;
  to: string;
  windowStudied: AuditWindowCode;
  boundary: 'research_only_not_execution_authority';
  researchOnlyWarning: string;
  timeframeDiscovery: TimeframeDiscovery;
  summary: {
    candidateCount: number;
    htfDrawPresentCount: number;
    htfDrawMissingCount: number;
    deliveryDuringWindowCount: number;
    deliveryAfterWindowCount: number;
    executionConflictCount: number;
    bucketCounts: Record<string, number>;
  };
  candidates: HtfFirstCandidate[];
  outputPaths: {
    jsonPath: string;
    markdownPath: string;
  };
}

interface ReconsiderationReport {
  reportType: 'time_window_liquidity_delivery_htf_first_reconsideration';
  generatedAt: string;
  symbol: string;
  from: string;
  to: string;
  boundary: 'research_only_not_execution_authority';
  researchOnlyWarning: string;
  timeframeDiscovery: TimeframeDiscovery;
  priorAmLabelsThatMayNeedReconsideration: Array<{
    sampleId: string;
    finalHumanLabel: string | null;
    htfFirstBucket: string | null;
    reason: string;
  }>;
  priorPmTriageSamplesThatMayNeedReconsideration: Array<{
    sampleId: string;
    priorBucket: string | null;
    htfFirstBucket: string | null;
    reason: string;
  }>;
  recommendedNextHumanReviewSet: string[];
  previousAmConclusion: 'stand' | 'soften' | 'reopen';
}

export interface HtfQualityCandidate extends Omit<HtfFirstCandidate, 'drawReferences'> {
  sampleId: string;
  sourceHtfFirstBucket: string;
  sourceHtfFirstReasons: string[];
  drawReferences: DrawReference[];
  htfDrawQualityScore: number;
  htfDrawQualityLabel: HtfDrawQualityLabel;
  htfDrawQualityReasons: string[];
  activeHtfDraw: boolean;
  activeHtfDrawTimeframes: SupportedTimeframe[];
  dominantDrawSource: 'candle_derived' | 'session_derived' | 'mixed' | 'unknown';
  dominantDrawTimeframe: SupportedTimeframe | null;
  drawDistancePoints: number | null;
  drawDistanceTicks: number | null;
  drawReachableWithinWindow: boolean | 'unknown';
  drawAlreadyTaggedBeforeWindow: boolean | 'unknown';
  drawConfluenceCount: number;
  drawConflictCount: number;
  executionWindowAlignment: ExecutionWindowAlignment;
  qualityAdjustedTwldPriority: QualityAdjustedTwldPriority;
}

export interface HtfQualityReport {
  reportType: 'time_window_liquidity_delivery_htf_quality_report';
  generatedAt: string;
  symbol: string;
  from: string;
  to: string;
  windowStudied: AuditWindowCode;
  boundary: 'research_only_not_execution_authority';
  researchOnlyWarning: string;
  sourceHtfFirstPath: string;
  sourceHtfFirstMarkdownPath: string;
  timeframeDiscovery: TimeframeDiscovery;
  summary: {
    candidateCount: number;
    qualityLabelCounts: Record<HtfDrawQualityLabel, number>;
    qualityPriorityCounts: Record<QualityAdjustedTwldPriority, number>;
    activeHtfDrawCount: number;
    broadHtfPresentDowngradedCount: number;
    conflictingCount: number;
    noActionableHtfDrawCount: number;
    averageQualityScore: number;
  };
  candidates: HtfQualityCandidate[];
  outputPaths: {
    jsonPath: string;
    markdownPath: string;
  };
}

export interface HtfQualityReviewSet {
  reportType: 'time_window_liquidity_delivery_htf_quality_review_set';
  generatedAt: string;
  symbol: string;
  from: string;
  to: string;
  boundary: 'research_only_not_execution_authority';
  researchOnlyWarning: string;
  sourceReconsiderationPath: string;
  topAmStrongOrMedium: HtfQualityCandidate[];
  topPmStrongOrMedium: HtfQualityCandidate[];
  conflictingAboveThreshold: HtfQualityCandidate[];
  broadHtfPresentDowngraded: HtfQualityCandidate[];
  priorLabelsThatMayNeedReconsideration: Array<{
    sampleId: string;
    windowStudied: AuditWindowCode;
    priorLabelOrBucket: string | null;
    htfDrawQualityScore: number | null;
    htfDrawQualityLabel: HtfDrawQualityLabel | null;
    qualityAdjustedTwldPriority: QualityAdjustedTwldPriority | null;
    reason: string;
  }>;
  recommendedHumanReviewSet: Array<{
    sampleId: string;
    windowStudied: AuditWindowCode | 'UNKNOWN';
    reason: string;
    htfDrawQualityScore: number | null;
    htfDrawQualityLabel: HtfDrawQualityLabel | null;
  }>;
  outputPaths: {
    jsonPath: string;
    markdownPath: string;
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_HTF_FIRST_DIR = path.join(__dirname, 'time-window-liquidity-delivery', 'htf-first');
const DEFAULT_OUT_DIR = path.join(__dirname, 'time-window-liquidity-delivery', 'htf-quality');
const RESEARCH_BOUNDARY = 'research_only_not_execution_authority' as const;
const RESEARCH_WARNING =
  'Research-only HTF draw quality report. This quality report does not approve trades and does not create execution authority.';
const TICK_SIZE = 0.25;
const QUALITY_PRIORITIES: QualityAdjustedTwldPriority[] = [
  'quality_priority_1_strong_htf_draw_delivery',
  'quality_priority_2_strong_or_medium_htf_draw_needs_review',
  'quality_priority_3_conflicting_or_failed_delivery',
  'quality_priority_4_weak_context_only',
  'quality_priority_5_no_actionable_htf_draw',
];
const QUALITY_LABELS: HtfDrawQualityLabel[] = ['strong', 'medium', 'weak', 'conflicting', 'none', 'unclear'];

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

function parseWindow(value: string): AuditWindowCode {
  const normalized = value.toUpperCase();
  if (normalized !== 'AM' && normalized !== 'PM' && normalized !== 'LONDON') throw new Error('--windows must contain AM, PM, or LONDON.');
  return normalized;
}

export function parseTimeWindowLiquidityDeliveryHtfQualityArgs(args = process.argv.slice(2)): CliOptions {
  const symbol = (readFlag(args, '--symbol') || 'MES').toUpperCase();
  if (symbol !== 'MES') throw new Error('TWLD HTF quality research currently supports --symbol MES only.');
  return {
    symbol,
    from: requireDate(readFlag(args, '--from') || '2018-01-01', '--from'),
    to: requireDate(readFlag(args, '--to') || '2026-05-31', '--to'),
    windows: (readFlag(args, '--windows') || 'AM,PM').split(',').map((value) => parseWindow(value.trim())).filter(Boolean),
    htfFirstDir: readFlag(args, '--htf-first-dir') || DEFAULT_HTF_FIRST_DIR,
    outDir: readFlag(args, '--out') || DEFAULT_OUT_DIR,
    pretty: hasFlag(args, '--pretty') || !hasFlag(args, '--json'),
    json: hasFlag(args, '--json'),
  };
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function readJson<T>(filePath: string): T {
  if (!existsSync(filePath)) throw new Error(`Missing required HTF-first artifact: ${filePath}`);
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

function htfFirstAuditPath(options: Pick<CliOptions, 'htfFirstDir' | 'symbol' | 'from' | 'to'>, window: AuditWindowCode): string {
  return path.join(options.htfFirstDir, `time-window-liquidity-delivery-HTF-first-audit-${options.symbol}-${window}-${options.from}-to-${options.to}.json`);
}

function htfFirstReconsiderationPath(options: Pick<CliOptions, 'htfFirstDir' | 'symbol' | 'from' | 'to'>): string {
  return path.join(options.htfFirstDir, `time-window-liquidity-delivery-HTF-first-reconsideration-${options.symbol}-${options.from}-to-${options.to}.json`);
}

function qualityReportPaths(options: Pick<CliOptions, 'outDir' | 'symbol' | 'from' | 'to'>, window: AuditWindowCode) {
  const base = path.join(options.outDir, `time-window-liquidity-delivery-HTF-quality-${options.symbol}-${window}-${options.from}-to-${options.to}`);
  return {
    jsonPath: `${base}.json`,
    markdownPath: `${base}.md`,
  };
}

function qualityReviewSetPaths(options: Pick<CliOptions, 'outDir' | 'symbol' | 'from' | 'to'>) {
  const base = path.join(options.outDir, `time-window-liquidity-delivery-HTF-quality-review-set-${options.symbol}-${options.from}-to-${options.to}`);
  return {
    jsonPath: `${base}.json`,
    markdownPath: `${base}.md`,
  };
}

function sampleId(candidateId: string): string {
  return `advisory_only_samples-${candidateId}`;
}

function timeframeWeight(timeframe: SupportedTimeframe): number {
  if (timeframe === '240m' || timeframe === '4h') return 18;
  if (timeframe === '60m' || timeframe === '1h') return 15;
  if (timeframe === '15m') return 12;
  if (timeframe === 'daily') return 10;
  if (timeframe === 'session') return 8;
  if (timeframe === '30m') return 6;
  return 0;
}

function normalizeTimeframe(timeframe: SupportedTimeframe): SupportedTimeframe {
  if (timeframe === '1h') return '60m';
  if (timeframe === '4h') return '240m';
  return timeframe;
}

function dominantDrawSource(candidate: HtfFirstCandidate): HtfQualityCandidate['dominantDrawSource'] {
  const refs = candidate.drawReferences.filter((ref) => ref.timeframe === candidate.primaryDrawTimeframe);
  const sources = unique((refs.length ? refs : candidate.drawReferences).map((ref) => ref.source));
  if (!sources.length) return 'unknown';
  if (sources.length > 1) return 'mixed';
  return sources[0];
}

function nearestDistance(candidate: HtfFirstCandidate): number | null {
  const distances = candidate.drawReferences
    .map((ref) => Math.abs(ref.distanceFromWindowOpen))
    .filter((value) => Number.isFinite(value));
  if (!distances.length) return null;
  return Math.min(...distances);
}

function countConflicts(candidate: HtfFirstCandidate, drawDistancePoints: number | null, broadOnly: boolean): number {
  let count = 0;
  if (candidate.executionWindowConflictsWithHtfDraw || candidate.htfDrawContextStatus === 'conflicting') count += 1;
  if (candidate.htfDrawReachedBeforeWindow === true) count += 1;
  if (drawDistancePoints !== null && drawDistancePoints > 30) count += 1;
  if (broadOnly) count += 1;
  if (!candidate.htfDrawStillValidDuringWindow && !candidate.deliveryOccurredDuringWindow) count += 1;
  return count;
}

export function scoreHtfDrawQuality(candidate: HtfFirstCandidate): HtfQualityCandidate {
  const normalizedTimeframes = unique(candidate.drawSourceTimeframes.map(normalizeTimeframe));
  const activeHtfDrawTimeframes = normalizedTimeframes.filter((timeframe) => timeframe !== '5m' && timeframe !== '1m');
  const drawConfluenceCount = activeHtfDrawTimeframes.length;
  const drawDistancePoints = nearestDistance(candidate);
  const drawDistanceTicks = drawDistancePoints === null ? null : round(drawDistancePoints / TICK_SIZE, 2);
  const broadOnly = candidate.htfDrawContextPresent && activeHtfDrawTimeframes.length > 0 && activeHtfDrawTimeframes.every((timeframe) => timeframe === 'daily' || timeframe === 'session');
  const drawConflictCount = countConflicts(candidate, drawDistancePoints, broadOnly);
  const reasons: string[] = [];

  let score = 0;
  if (candidate.htfDrawContextPresent) {
    score += 25;
    reasons.push('HTF draw context is present above the 5M execution chart.');
  } else {
    reasons.push('No active higher-timeframe draw context was present in the HTF-first source report.');
  }

  for (const timeframe of activeHtfDrawTimeframes) score += timeframeWeight(timeframe);
  if (drawConfluenceCount >= 3) {
    score += 12;
    reasons.push(`Draw context has ${drawConfluenceCount} timeframe/source confluence points.`);
  } else if (drawConfluenceCount >= 2) {
    score += 7;
    reasons.push('Draw context has multi-timeframe/source confluence.');
  } else if (drawConfluenceCount === 1) {
    score += 2;
    reasons.push('Draw context is single-source and needs human chart review.');
  }

  if (candidate.deliveryOccurredDuringWindow) {
    score += 20;
    reasons.push('Delivery occurred inside the studied time window.');
  } else if (candidate.deliveryOccurredAfterWindow) {
    score += 7;
    reasons.push('Delivery occurred after the studied time window, so timing is weaker.');
  } else {
    score -= 8;
    reasons.push('Delivery was not observed in or after the studied window.');
  }

  if (candidate.executionWindowSupportsHtfDraw) {
    score += 10;
    reasons.push('Execution-window facts aligned with the HTF draw.');
  }
  if (candidate.fvgOrInefficiencyPresent) score += 4;
  if (candidate.marketStructureShiftPresent) score += 4;
  if (candidate.sweepRaidPlusReclaimPresent) score += 4;

  if (candidate.executionWindowConflictsWithHtfDraw || candidate.htfDrawContextStatus === 'conflicting') {
    score -= 35;
    reasons.push('Execution-window facts conflicted with the HTF draw.');
  }
  if (candidate.htfDrawReachedBeforeWindow === true) {
    score -= 18;
    reasons.push('Primary draw was already tagged before the studied window.');
  }
  if (candidate.htfDrawStillValidDuringWindow === false && !candidate.deliveryOccurredDuringWindow) {
    score -= 10;
    reasons.push('Primary draw was not still valid during the window and delivery did not occur inside the window.');
  }
  if (candidate.htfDrawReachedBeforeWindow === true && candidate.htfDrawStillValidDuringWindow === false) {
    score = Math.min(score, candidate.deliveryOccurredDuringWindow ? 45 : 30);
    reasons.push('HTF draw was present but not active: it was already tagged before the window and marked not still valid during the window.');
  }
  if (drawDistancePoints !== null && drawDistancePoints <= 10) {
    score += 8;
    reasons.push('Draw was within 10 points of the window open.');
  } else if (drawDistancePoints !== null && drawDistancePoints > 30) {
    score -= 18;
    reasons.push('Draw was more than 30 points from the window open, so reachability is weaker.');
  }
  if (broadOnly) {
    score -= 22;
    reasons.push('HTF context was broad session/daily context only; downgraded for lacking candle-derived confluence.');
  }

  score = round(clamp(score, 0, 100), 2);
  let label: HtfDrawQualityLabel = 'unclear';
  if (!candidate.htfDrawContextPresent || !activeHtfDrawTimeframes.length) label = 'none';
  else if (candidate.executionWindowConflictsWithHtfDraw || candidate.htfDrawContextStatus === 'conflicting') label = 'conflicting';
  else if (score >= 75) label = 'strong';
  else if (score >= 55) label = 'medium';
  else if (score >= 25) label = 'weak';

  const drawReachableWithinWindow = drawDistancePoints === null ? 'unknown' : drawDistancePoints <= 30;
  const drawAlreadyTaggedBeforeWindow = candidate.htfDrawReachedBeforeWindow === null ? 'unknown' : candidate.htfDrawReachedBeforeWindow;
  const executionWindowAlignment: ExecutionWindowAlignment = candidate.executionWindowConflictsWithHtfDraw
    ? 'conflicting'
    : candidate.executionWindowSupportsHtfDraw
      ? 'aligned'
      : candidate.htfDrawContextStatus === 'unclear'
        ? 'unclear'
        : 'neutral';
  const activeHtfDraw = (label === 'strong' || label === 'medium') && drawAlreadyTaggedBeforeWindow !== true;
  let qualityAdjustedTwldPriority: QualityAdjustedTwldPriority = 'quality_priority_5_no_actionable_htf_draw';
  if (label === 'strong' && candidate.deliveryOccurredDuringWindow) qualityAdjustedTwldPriority = 'quality_priority_1_strong_htf_draw_delivery';
  else if (label === 'strong' || label === 'medium') qualityAdjustedTwldPriority = 'quality_priority_2_strong_or_medium_htf_draw_needs_review';
  else if (label === 'conflicting' || (candidate.htfDrawContextPresent && !candidate.deliveryOccurredDuringWindow && candidate.executionWindowConflictsWithHtfDraw)) {
    qualityAdjustedTwldPriority = 'quality_priority_3_conflicting_or_failed_delivery';
  } else if (label === 'weak') {
    qualityAdjustedTwldPriority = 'quality_priority_4_weak_context_only';
  }

  return {
    ...candidate,
    sampleId: sampleId(candidate.candidateId),
    sourceHtfFirstBucket: candidate.htfFirstBucket,
    sourceHtfFirstReasons: candidate.notes || [],
    htfDrawQualityScore: score,
    htfDrawQualityLabel: label,
    htfDrawQualityReasons: unique(reasons),
    activeHtfDraw,
    activeHtfDrawTimeframes,
    dominantDrawSource: dominantDrawSource(candidate),
    dominantDrawTimeframe: candidate.primaryDrawTimeframe,
    drawDistancePoints: drawDistancePoints === null ? null : round(drawDistancePoints, 2),
    drawDistanceTicks,
    drawReachableWithinWindow,
    drawAlreadyTaggedBeforeWindow,
    drawConfluenceCount,
    drawConflictCount,
    executionWindowAlignment,
    qualityAdjustedTwldPriority,
  };
}

function emptyLabelCounts(): Record<HtfDrawQualityLabel, number> {
  return Object.fromEntries(QUALITY_LABELS.map((label) => [label, 0])) as Record<HtfDrawQualityLabel, number>;
}

function emptyPriorityCounts(): Record<QualityAdjustedTwldPriority, number> {
  return Object.fromEntries(QUALITY_PRIORITIES.map((priority) => [priority, 0])) as Record<QualityAdjustedTwldPriority, number>;
}

export function buildHtfQualityReport(args: {
  audit: HtfFirstAuditReport;
  sourceHtfFirstPath: string;
  options: Pick<CliOptions, 'symbol' | 'from' | 'to' | 'outDir'>;
}): HtfQualityReport {
  const candidates = args.audit.candidates.map(scoreHtfDrawQuality);
  const qualityLabelCounts = emptyLabelCounts();
  const qualityPriorityCounts = emptyPriorityCounts();
  for (const candidate of candidates) {
    qualityLabelCounts[candidate.htfDrawQualityLabel] += 1;
    qualityPriorityCounts[candidate.qualityAdjustedTwldPriority] += 1;
  }
  const broadHtfPresentDowngradedCount = candidates.filter((candidate) =>
    candidate.htfDrawContextPresent &&
    (candidate.qualityAdjustedTwldPriority === 'quality_priority_4_weak_context_only' ||
      candidate.qualityAdjustedTwldPriority === 'quality_priority_5_no_actionable_htf_draw')
  ).length;
  const averageQualityScore = candidates.length ? round(candidates.reduce((sum, candidate) => sum + candidate.htfDrawQualityScore, 0) / candidates.length, 2) : 0;
  const report: HtfQualityReport = {
    reportType: 'time_window_liquidity_delivery_htf_quality_report',
    generatedAt: new Date().toISOString(),
    symbol: args.options.symbol,
    from: args.options.from,
    to: args.options.to,
    windowStudied: args.audit.windowStudied,
    boundary: RESEARCH_BOUNDARY,
    researchOnlyWarning: RESEARCH_WARNING,
    sourceHtfFirstPath: args.sourceHtfFirstPath,
    sourceHtfFirstMarkdownPath: args.sourceHtfFirstPath.replace(/\.json$/i, '.md'),
    timeframeDiscovery: args.audit.timeframeDiscovery,
    summary: {
      candidateCount: candidates.length,
      qualityLabelCounts,
      qualityPriorityCounts,
      activeHtfDrawCount: candidates.filter((candidate) => candidate.activeHtfDraw).length,
      broadHtfPresentDowngradedCount,
      conflictingCount: candidates.filter((candidate) => candidate.htfDrawQualityLabel === 'conflicting').length,
      noActionableHtfDrawCount: candidates.filter((candidate) => candidate.qualityAdjustedTwldPriority === 'quality_priority_5_no_actionable_htf_draw').length,
      averageQualityScore,
    },
    candidates,
    outputPaths: qualityReportPaths(args.options, args.audit.windowStudied),
  };
  assertNoExecutableLedgerFields(report);
  return report;
}

function candidateBySampleId(reports: HtfQualityReport[]): Map<string, HtfQualityCandidate> {
  const map = new Map<string, HtfQualityCandidate>();
  for (const report of reports) {
    for (const candidate of report.candidates) map.set(candidate.sampleId, candidate);
  }
  return map;
}

function byQualityThenDate(a: HtfQualityCandidate, b: HtfQualityCandidate): number {
  return b.htfDrawQualityScore - a.htfDrawQualityScore || a.date.localeCompare(b.date);
}

export function buildHtfQualityReviewSet(args: {
  reports: HtfQualityReport[];
  reconsideration: ReconsiderationReport;
  sourceReconsiderationPath: string;
  options: Pick<CliOptions, 'symbol' | 'from' | 'to' | 'outDir'>;
}): HtfQualityReviewSet {
  const byId = candidateBySampleId(args.reports);
  const strongOrMedium = (candidate: HtfQualityCandidate) => candidate.htfDrawQualityLabel === 'strong' || candidate.htfDrawQualityLabel === 'medium';
  const amCandidates = args.reports.find((report) => report.windowStudied === 'AM')?.candidates || [];
  const pmCandidates = args.reports.find((report) => report.windowStudied === 'PM')?.candidates || [];
  const topAmStrongOrMedium = amCandidates.filter(strongOrMedium).sort(byQualityThenDate).slice(0, 10);
  const topPmStrongOrMedium = pmCandidates.filter(strongOrMedium).sort(byQualityThenDate).slice(0, 10);
  const allCandidates = args.reports.flatMap((report) => report.candidates);
  const conflictingAboveThreshold = allCandidates
    .filter((candidate) => candidate.htfDrawQualityLabel === 'conflicting' && candidate.htfDrawQualityScore >= 25)
    .sort(byQualityThenDate)
    .slice(0, 20);
  const broadHtfPresentDowngraded = allCandidates
    .filter((candidate) =>
      candidate.htfDrawContextPresent &&
      (candidate.qualityAdjustedTwldPriority === 'quality_priority_4_weak_context_only' ||
        candidate.qualityAdjustedTwldPriority === 'quality_priority_5_no_actionable_htf_draw')
    )
    .sort(byQualityThenDate)
    .slice(0, 50);
  const priorLabelsThatMayNeedReconsideration = [
    ...args.reconsideration.priorAmLabelsThatMayNeedReconsideration.map((item) => {
      const candidate = byId.get(item.sampleId);
      return {
        sampleId: item.sampleId,
        windowStudied: 'AM' as AuditWindowCode,
        priorLabelOrBucket: item.finalHumanLabel,
        htfDrawQualityScore: candidate?.htfDrawQualityScore ?? null,
        htfDrawQualityLabel: candidate?.htfDrawQualityLabel ?? null,
        qualityAdjustedTwldPriority: candidate?.qualityAdjustedTwldPriority ?? null,
        reason: item.reason,
      };
    }),
    ...args.reconsideration.priorPmTriageSamplesThatMayNeedReconsideration.map((item) => {
      const candidate = byId.get(item.sampleId);
      return {
        sampleId: item.sampleId,
        windowStudied: 'PM' as AuditWindowCode,
        priorLabelOrBucket: item.priorBucket,
        htfDrawQualityScore: candidate?.htfDrawQualityScore ?? null,
        htfDrawQualityLabel: candidate?.htfDrawQualityLabel ?? null,
        qualityAdjustedTwldPriority: candidate?.qualityAdjustedTwldPriority ?? null,
        reason: item.reason,
      };
    }),
  ];
  const recommendedHumanReviewSet = unique([
    ...topAmStrongOrMedium.map((candidate) => candidate.sampleId),
    ...topPmStrongOrMedium.map((candidate) => candidate.sampleId),
    ...conflictingAboveThreshold.slice(0, 10).map((candidate) => candidate.sampleId),
    ...args.reconsideration.recommendedNextHumanReviewSet,
  ]).map((id) => {
    const candidate = byId.get(id);
    const windowStudied: AuditWindowCode | 'UNKNOWN' = candidate?.windowStudied || 'UNKNOWN';
    return {
      sampleId: id,
      windowStudied,
      reason: candidate
        ? `Quality ${candidate.htfDrawQualityLabel}; ${candidate.qualityAdjustedTwldPriority}; score ${candidate.htfDrawQualityScore}.`
        : 'Included by the HTF-first reconsideration report but not found in loaded quality candidates.',
      htfDrawQualityScore: candidate?.htfDrawQualityScore ?? null,
      htfDrawQualityLabel: candidate?.htfDrawQualityLabel ?? null,
    };
  });
  const reviewSet: HtfQualityReviewSet = {
    reportType: 'time_window_liquidity_delivery_htf_quality_review_set',
    generatedAt: new Date().toISOString(),
    symbol: args.options.symbol,
    from: args.options.from,
    to: args.options.to,
    boundary: RESEARCH_BOUNDARY,
    researchOnlyWarning: RESEARCH_WARNING,
    sourceReconsiderationPath: args.sourceReconsiderationPath,
    topAmStrongOrMedium,
    topPmStrongOrMedium,
    conflictingAboveThreshold,
    broadHtfPresentDowngraded,
    priorLabelsThatMayNeedReconsideration,
    recommendedHumanReviewSet,
    outputPaths: qualityReviewSetPaths(args.options),
  };
  assertNoExecutableLedgerFields(reviewSet);
  return reviewSet;
}

function renderSummaryCountMap(map: Record<string, number>): string {
  return Object.entries(map).map(([key, value]) => `- ${key}: ${value}`).join('\n');
}

function renderCandidateRows(candidates: HtfQualityCandidate[]): string[] {
  if (!candidates.length) return ['_None._'];
  return [
    '| Sample ID | Date | Score | Label | Priority | Draw | Timeframes | Distance | Reasons |',
    '|---|---:|---:|---|---|---|---|---:|---|',
    ...candidates.map((candidate) =>
      `| ${candidate.sampleId} | ${candidate.date} | ${candidate.htfDrawQualityScore} | ${candidate.htfDrawQualityLabel} | ${candidate.qualityAdjustedTwldPriority} | ${candidate.htfDrawType || 'n/a'} ${candidate.htfDrawLevel ?? ''} | ${candidate.activeHtfDrawTimeframes.join(', ') || 'n/a'} | ${candidate.drawDistancePoints ?? 'unknown'} | ${candidate.htfDrawQualityReasons.slice(0, 3).join(' ')} |`
    ),
  ];
}

function renderQualityMarkdown(report: HtfQualityReport): string {
  return [
    `# Time-Window Liquidity Delivery HTF Draw Quality - ${report.symbol} ${report.windowStudied}`,
    '',
    report.researchOnlyWarning,
    'This quality report does not approve trades and does not create execution authority.',
    'Research-only. Existing human labels are not changed by this report.',
    '',
    `Date range: ${report.from} to ${report.to}`,
    `Boundary: ${report.boundary}`,
    `Source HTF-first JSON: ${report.sourceHtfFirstPath}`,
    '',
    '## Summary',
    `- Candidates scored: ${report.summary.candidateCount}`,
    `- Active HTF draw count: ${report.summary.activeHtfDrawCount}`,
    `- Broad HTF-present downgraded count: ${report.summary.broadHtfPresentDowngradedCount}`,
    `- Conflicting count: ${report.summary.conflictingCount}`,
    `- No-actionable HTF draw count: ${report.summary.noActionableHtfDrawCount}`,
    `- Average quality score: ${report.summary.averageQualityScore}`,
    '',
    '## Quality Labels',
    renderSummaryCountMap(report.summary.qualityLabelCounts),
    '',
    '## Quality Priorities',
    renderSummaryCountMap(report.summary.qualityPriorityCounts),
    '',
    '## Top Quality Samples',
    ...renderCandidateRows(report.candidates.filter((candidate) => candidate.htfDrawQualityLabel === 'strong' || candidate.htfDrawQualityLabel === 'medium').sort(byQualityThenDate).slice(0, 25)),
    '',
    '## Broad HTF-Present Downgraded Samples',
    ...renderCandidateRows(report.candidates.filter((candidate) =>
      candidate.htfDrawContextPresent &&
      (candidate.qualityAdjustedTwldPriority === 'quality_priority_4_weak_context_only' ||
        candidate.qualityAdjustedTwldPriority === 'quality_priority_5_no_actionable_htf_draw')
    ).sort(byQualityThenDate).slice(0, 25)),
    '',
    'No trades, entries, stops, targets, alerts, outcome buttons, scanner changes, bridge changes, or live execution behavior are created by this report.',
  ].join('\n');
}

function renderReviewSetMarkdown(report: HtfQualityReviewSet): string {
  return [
    `# Time-Window Liquidity Delivery HTF Quality Review Set - ${report.symbol}`,
    '',
    report.researchOnlyWarning,
    'This quality report does not approve trades and does not create execution authority.',
    'Research-only. Existing human labels are not changed by this report.',
    '',
    `Date range: ${report.from} to ${report.to}`,
    `Boundary: ${report.boundary}`,
    `Source reconsideration JSON: ${report.sourceReconsiderationPath}`,
    '',
    '## Top AM Strong/Medium',
    ...renderCandidateRows(report.topAmStrongOrMedium),
    '',
    '## Top PM Strong/Medium',
    ...renderCandidateRows(report.topPmStrongOrMedium),
    '',
    '## Conflicting Above Threshold',
    ...renderCandidateRows(report.conflictingAboveThreshold),
    '',
    '## Broad HTF-Present Downgraded',
    ...renderCandidateRows(report.broadHtfPresentDowngraded),
    '',
    '## Prior Labels That May Need Reconsideration',
    report.priorLabelsThatMayNeedReconsideration.length ? '| Sample ID | Window | Prior Label/Bucket | Quality | Priority | Reason |' : '_None._',
    report.priorLabelsThatMayNeedReconsideration.length ? '|---|---|---|---|---|---|' : '',
    ...report.priorLabelsThatMayNeedReconsideration.map((item) =>
      `| ${item.sampleId} | ${item.windowStudied} | ${item.priorLabelOrBucket || 'n/a'} | ${item.htfDrawQualityLabel || 'n/a'} ${item.htfDrawQualityScore ?? ''} | ${item.qualityAdjustedTwldPriority || 'n/a'} | ${item.reason} |`
    ),
    '',
    '## Recommended Human Review Set',
    report.recommendedHumanReviewSet.length ? '| Sample ID | Window | Quality | Reason |' : '_None._',
    report.recommendedHumanReviewSet.length ? '|---|---|---|---|' : '',
    ...report.recommendedHumanReviewSet.map((item) =>
      `| ${item.sampleId} | ${item.windowStudied} | ${item.htfDrawQualityLabel || 'n/a'} ${item.htfDrawQualityScore ?? ''} | ${item.reason} |`
    ),
    '',
    'No trades, entries, stops, targets, alerts, outcome buttons, scanner changes, bridge changes, or live execution behavior are created by this report.',
  ].filter((line) => line !== '').join('\n');
}

function writeReport(report: HtfQualityReport | HtfQualityReviewSet, markdown: string): void {
  mkdirSync(path.dirname(report.outputPaths.jsonPath), { recursive: true });
  writeFileSync(report.outputPaths.jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(report.outputPaths.markdownPath, `${markdown}\n`, 'utf8');
}

export async function runTimeWindowLiquidityDeliveryHtfQuality(options: CliOptions): Promise<{
  reports: HtfQualityReport[];
  reviewSet: HtfQualityReviewSet;
}> {
  const reports = options.windows.map((window) => {
    const sourcePath = htfFirstAuditPath(options, window);
    const audit = readJson<HtfFirstAuditReport>(sourcePath);
    if (audit.symbol !== options.symbol || audit.from !== options.from || audit.to !== options.to || audit.windowStudied !== window) {
      throw new Error(`HTF-first audit metadata mismatch for ${sourcePath}.`);
    }
    return buildHtfQualityReport({ audit, sourceHtfFirstPath: sourcePath, options });
  });
  for (const report of reports) writeReport(report, renderQualityMarkdown(report));
  const reconsiderationPath = htfFirstReconsiderationPath(options);
  const reconsideration = readJson<ReconsiderationReport>(reconsiderationPath);
  const reviewSet = buildHtfQualityReviewSet({ reports, reconsideration, sourceReconsiderationPath: reconsiderationPath, options });
  writeReport(reviewSet, renderReviewSetMarkdown(reviewSet));
  return { reports, reviewSet };
}

export async function runTimeWindowLiquidityDeliveryHtfQualityCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseTimeWindowLiquidityDeliveryHtfQualityArgs(rawArgs);
  const result = await runTimeWindowLiquidityDeliveryHtfQuality(options);
  if (options.json) console.log(JSON.stringify(result, null, 2));
  if (options.pretty) {
    console.log([
      '[TIME-WINDOW LIQUIDITY DELIVERY HTF QUALITY]',
      `Symbol: ${options.symbol}`,
      `Date range: ${options.from} to ${options.to}`,
      `Windows: ${options.windows.join(', ')}`,
      ...result.reports.map((report) =>
        `${report.windowStudied}: candidates=${report.summary.candidateCount}; strong=${report.summary.qualityLabelCounts.strong}; medium=${report.summary.qualityLabelCounts.medium}; weak=${report.summary.qualityLabelCounts.weak}; conflicting=${report.summary.qualityLabelCounts.conflicting}; no-actionable=${report.summary.noActionableHtfDrawCount}`
      ),
      `Review set JSON: ${result.reviewSet.outputPaths.jsonPath}`,
      `Review set Markdown: ${result.reviewSet.outputPaths.markdownPath}`,
      'Research-only. No labels, trades, entries, stops, targets, alerts, or execution authority are created.',
    ].join('\n'));
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tools/automation/time-window-liquidity-delivery-htf-quality.ts')) {
  runTimeWindowLiquidityDeliveryHtfQualityCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
