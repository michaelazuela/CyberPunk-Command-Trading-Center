import fs from 'node:fs/promises';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ResearchOutcomeMathReport, ResearchCandidateOutcome } from '../../src/agents/researchOutcomeMathAgent';
import type {
  AgentHumanInputAssessmentStatus,
  ResearchHumanInspectionLabel,
  ResearchReviewEvidence,
  ResearchReviewSample,
  ResearchSampleReviewPack,
} from '../../src/agents/researchSampleReviewAgent';
import {
  calculateEstimatedGrossContractPnl,
  coerceEstimatedGrossContractPnl,
  FUTURES_CONTRACT_METADATA,
  type EstimatedGrossContractPnl,
  type FuturesRootSymbol,
} from '../../src/lib/futuresContractMetadata';

type Instrument = Exclude<FuturesRootSymbol, 'UNKNOWN'>;

export type ModelCandidateLedgerEntryStatus =
  | 'research_sample'
  | 'human_approved_for_candidate_review'
  | 'human_not_approved_for_candidate_review'
  | 'candidate_watchlist'
  | 'needs_more_samples'
  | 'insufficient_evidence';

export type ModelCandidateReadinessStatus =
  | 'insufficient_evidence'
  | 'watchlist_candidate'
  | 'candidate_review_recommended'
  | 'reject_or_deprioritize';

export interface ModelCandidateLedgerOptions {
  from: string;
  to: string;
  symbol: Instrument;
  reviewPackDir: string;
  outcomeReportDir: string;
  chartDir: string;
  outDir: string;
  pretty: boolean;
  json: boolean;
  thresholds: {
    minimumReviewedSamples: number;
    minimumApprovalRate: number;
  };
}

export interface ModelCandidateLedgerEntry {
  sampleId: string;
  concept: string;
  conceptTitle: string;
  symbol: Instrument;
  contract: string | null;
  date: string;
  time: string | null;
  direction: string;
  window: string | null;
  agentRecommendation: string;
  humanApprovalState: 'approved_for_future_model_candidate_review' | 'not_approved_for_future_model_candidate_review';
  ledgerStatus: ModelCandidateLedgerEntryStatus;
  humanReason: string | null;
  humanNotes: string | null;
  chartArtifactPath: string | null;
  outcomeMathSummary: {
    outcomeClassification: string | null;
    firstMeaningfulMove: string | null;
    favorableThresholdOneTouched: boolean | null;
    favorableThresholdTwoTouched: boolean | null;
    adverseThresholdTouched: boolean | null;
    hypotheticalOutcomeLabel: string | null;
  };
  estimatedGrossContractPnl?: EstimatedGrossContractPnl;
  agentAssessmentStatus?: AgentHumanInputAssessmentStatus | null;
  reviewEvidence?: ResearchReviewEvidence | null;
  warningState: {
    warnings: string[];
    missingChartArtifact: boolean;
    missingOutcomeMath: boolean;
  };
  sourceReviewPackPath: string;
  reviewedOutputPath: string;
  reviewedAt: string | null;
  researchOnlyBoundary: {
    advisoryOnly: true;
    approvesExecution: false;
    changesRules: false;
    createsOrders: false;
    writesRag: false;
    writesJournal: false;
  };
}

export interface EstimatedGrossContractPnlSummary {
  rootSymbol: FuturesRootSymbol;
  displayName: string;
  contracts: 1;
  pointValue: number;
  tickSize: number;
  tickValue: number;
  currency: 'USD';
  sampleCountWithPnl: number;
  sampleCountMissingPnl: number;
  totalHypotheticalOutcomeDollars?: number;
  avgHypotheticalOutcomeDollars?: number;
  bestHypotheticalOutcomeDollars?: number;
  worstHypotheticalOutcomeDollars?: number;
  avgMfeDollars?: number;
  avgMaeDollars?: number;
  status: 'available' | 'partial' | 'unavailable' | 'unavailable_unknown_contract';
  note: string;
}

export interface ModelCandidateAdvisoryEvidence {
  sampleCount: number;
  humanApprovedCount: number;
  humanNotApprovedCount: number;
  humanApprovalRate?: number;
  agentAssessmentSummary: {
    agreesWithHuman: number;
    partiallyAgreesWithHuman: number;
    disagreesWithHuman: number;
    unclearInsufficientEvidence: number;
  };
  reviewEvidenceSummary: {
    samplesWithChartEvidence: number;
    samplesWithExactPngPath: number;
    samplesWithExactReportPath: number;
    samplesMissingCharts: number;
    samplesWithUnknownCharts: number;
    samplesWithWithheldCharts: number;
  };
  estimatedGrossContractPnlSummary?: {
    rootSymbol: FuturesRootSymbol;
    sampleCountWithPnl: number;
    sampleCountMissingPnl: number;
    avgHypotheticalOutcomeDollars?: number;
    totalHypotheticalOutcomeDollars?: number;
    bestHypotheticalOutcomeDollars?: number;
    worstHypotheticalOutcomeDollars?: number;
    avgMfeDollars?: number;
    avgMaeDollars?: number;
    status: 'available' | 'partial' | 'unavailable' | 'unavailable_unknown_contract';
  };
  missingDataWarningCount: number;
  adverseFirstContradictionCount: number;
  boundary: 'research_only_not_execution_authority';
}

export interface ModelCandidateAdvisoryInterpretation {
  advisoryStatus:
    | 'do_not_advance'
    | 'keep_collecting_evidence'
    | 'watchlist_candidate'
    | 'candidate_review_recommended'
    | 'reject_or_deprioritize';
  evidenceBase: 'too_small' | 'developing' | 'sufficient_for_review';
  humanReviewSignal: 'supportive' | 'mixed' | 'not_supportive' | 'insufficient';
  agentAssessmentSignal: 'supportive' | 'mixed' | 'negative' | 'unclear' | 'insufficient';
  chartEvidenceSignal: 'sufficient' | 'partial' | 'missing_or_unknown';
  pnlSignal:
    | 'supportive_after_core_gates'
    | 'partial_not_decisive'
    | 'adverse_or_mixed'
    | 'unavailable'
    | 'not_meaningful_low_sample_count';
  nextAction:
    | 'collect_more_reviewed_samples'
    | 'resolve_missing_evidence'
    | 'resolve_adverse_contradictions'
    | 'continue_watchlist'
    | 'move_to_formal_model_candidate_backtest_human_final_decision_required'
    | 'reject_or_deprioritize';
  reasons: string[];
  boundary: 'research_only_not_execution_authority';
}

export interface ModelCandidateConceptSummary {
  concept: string;
  conceptTitle: string;
  totalSamplesReviewed: number;
  humanApprovedCount: number;
  humanNotApprovedCount: number;
  approvalRate: number | null;
  agentRecommendationDistribution: Record<string, number>;
  directionDistribution: Record<string, number>;
  timeWindowDistribution: Record<string, number>;
  outcomeSummary: Record<string, number>;
  chartAvailabilityCount: number;
  missingDataWarningsCount: number;
  candidateReadinessStatus: ModelCandidateReadinessStatus;
  deskRecommendation: string;
  modelCandidateAdvisoryEvidence: ModelCandidateAdvisoryEvidence;
  modelCandidateAdvisoryInterpretation: ModelCandidateAdvisoryInterpretation;
}

export interface ModelCandidateReviewLedger {
  reportType: 'model_candidate_review_ledger';
  generatedAt: string;
  from: string;
  to: string;
  symbol: Instrument;
  advisoryOnly: true;
  safety: {
    researchOnly: true;
    approvesExecution: false;
    changesRules: false;
    createsTrades: false;
    writesRag: false;
    writesJournal: false;
    message: 'Research-only. This does not approve execution, change rules, or create trades.';
  };
  thresholds: {
    minimumReviewedSamples: number;
    minimumApprovalRate: number;
  };
  summary: {
    reviewedSamplesFound: number;
    approvedCount: number;
    notApprovedCount: number;
    ignoredLegacyReviewedSamples: number;
    conceptsReviewed: number;
    candidateReviewRecommendedConcepts: number;
  };
  entries: ModelCandidateLedgerEntry[];
  conceptSummaries: ModelCandidateConceptSummary[];
  estimatedGrossContractPnlSummary?: EstimatedGrossContractPnlSummary;
  warnings: string[];
  outputPaths: {
    jsonPath: string;
    markdownPath: string;
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REVIEW_PACK_DIR = path.join(__dirname, 'research-review-packs');
const DEFAULT_OUTCOME_REPORT_DIR = path.join(__dirname, 'research-outcome-reports');
const DEFAULT_CHART_DIR = path.join(__dirname, 'research-review-charts', 'price-action-review-cards');
const DEFAULT_OUT_DIR = path.join(__dirname, 'model-candidate-ledger');
const SAFETY_MESSAGE = 'Research-only. This does not approve execution, change rules, or create trades.' as const;
const FINAL_DECISION_MESSAGE = 'Human final decision required before any model promotion or implementation.';
const ADVISORY_MINIMUM_REVIEWED_SAMPLES = 10;
const APPROVED_LABEL = 'approved_for_future_model_candidate_review' as const;
const NOT_APPROVED_LABEL = 'not_approved_for_future_model_candidate_review' as const;
const PROHIBITED_LEDGER_KEYS = new Set([
  'entry',
  'stop',
  'stopLoss',
  'target',
  'targets',
  'T1',
  'T2',
  't1',
  't2',
  'riskReward',
  'canExecute',
  'executionApproved',
  'orderInstructions',
  'orderInstruction',
  'tradeAlerts',
  'tradeAlert',
  'alerts',
  'ragPayload',
  'journalPayload',
]);

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
  if (symbol !== 'MES' && symbol !== 'MNQ' && symbol !== 'ES' && symbol !== 'NQ') throw new Error('--symbol must be MES, MNQ, ES, or NQ.');
  return symbol;
}

function numberFlag(args: string[], flag: string, fallback: number): number {
  const value = readFlag(args, flag);
  if (value === null) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${flag} must be a non-negative number.`);
  return parsed;
}

export function parseModelCandidateLedgerArgs(args = process.argv.slice(2)): ModelCandidateLedgerOptions {
  return {
    from: requireDate(readFlag(args, '--from') || '2026-01-01', '--from'),
    to: requireDate(readFlag(args, '--to') || 'today', '--to'),
    symbol: parseInstrument(readFlag(args, '--symbol') || readFlag(args, '--instrument')),
    reviewPackDir: readFlag(args, '--review-pack-dir') || DEFAULT_REVIEW_PACK_DIR,
    outcomeReportDir: readFlag(args, '--outcome-report-dir') || DEFAULT_OUTCOME_REPORT_DIR,
    chartDir: readFlag(args, '--chart-dir') || DEFAULT_CHART_DIR,
    outDir: readFlag(args, '--out') || DEFAULT_OUT_DIR,
    pretty: hasFlag(args, '--pretty') || !hasFlag(args, '--json'),
    json: hasFlag(args, '--json'),
    thresholds: {
      minimumReviewedSamples: numberFlag(args, '--minimum-reviewed-samples', 10),
      minimumApprovalRate: numberFlag(args, '--minimum-approval-rate', 0.7),
    },
  };
}

async function readJsonFile<T>(file: string): Promise<T> {
  return JSON.parse(await fs.readFile(file, 'utf8')) as T;
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

async function listFiles(dir: string, predicate: (name: string) => boolean): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && predicate(entry.name))
      .map((entry) => path.join(dir, entry.name))
      .sort();
  } catch {
    return [];
  }
}

function inDateRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

function originalReviewPackPath(reviewedPath: string): string {
  return reviewedPath.replace(/\.reviewed\.json$/i, '.json');
}

function increment(map: Record<string, number>, key: string | null | undefined): void {
  const normalized = key && key.trim() ? key : 'unspecified';
  map[normalized] = (map[normalized] || 0) + 1;
}

function candidateKey(sample: ResearchReviewSample): string {
  return `${sample.sampleId}|${sample.date}|${sample.time || ''}|${sample.concept}`;
}

function outcomeKey(outcome: ResearchCandidateOutcome): string {
  return `${outcome.candidateId}|${outcome.date}|${outcome.time || ''}|${outcome.concept}`;
}

function outcomeForSample(sample: ResearchReviewSample, outcomes: Map<string, ResearchCandidateOutcome>): ResearchCandidateOutcome | null {
  return outcomes.get(candidateKey(sample)) ||
    [...outcomes.values()].find((outcome) =>
      outcome.candidateId === sample.sampleId ||
      (outcome.concept === sample.concept && outcome.date === sample.date && outcome.time === sample.time)
    ) ||
    null;
}

function agentRecommendation(sample: ResearchReviewSample): string {
  return sample.agentInspectionLabel;
}

function chartPathForSample(sample: ResearchReviewSample, chartFiles: string[]): string | null {
  const exact = chartFiles.find((file) => path.basename(file).includes(sample.sampleId));
  return exact || null;
}

function contractFromChartPath(file: string | null): string | null {
  if (!file) return null;
  const name = path.basename(file);
  const match = name.match(/price-action-review-card-([A-Z]+)-/);
  return match ? match[1] : null;
}

function sampleSymbol(sample: ResearchReviewSample): unknown {
  const record = sample as ResearchReviewSample & {
    symbol?: unknown;
    instrument?: unknown;
    contract?: unknown;
  };
  return record.symbol || record.instrument || record.contract;
}

function ledgerStatus(label: ResearchHumanInspectionLabel | null): ModelCandidateLedgerEntryStatus | null {
  if (label === APPROVED_LABEL) return 'human_approved_for_candidate_review';
  if (label === NOT_APPROVED_LABEL) return 'human_not_approved_for_candidate_review';
  return null;
}

function researchOnlyBoundary(sample: ResearchReviewSample): ModelCandidateLedgerEntry['researchOnlyBoundary'] {
  const boundary = sample.agentApprovalBoundary;
  if (
    (sample as { advisoryOnly?: boolean }).advisoryOnly === false ||
    !boundary ||
    boundary.agentApprovesTrade !== false ||
    boundary.agentChangesRules !== false ||
    boundary.agentCreatesEntry !== false ||
    boundary.agentCreatesTargets !== false ||
    boundary.agentPromotesModel !== false
  ) {
    throw new Error(`Sample ${sample.sampleId} does not preserve the research-only boundary.`);
  }
  return {
    advisoryOnly: true,
    approvesExecution: false,
    changesRules: false,
    createsOrders: false,
    writesRag: false,
    writesJournal: false,
  };
}

function entryForSample(args: {
  sample: ResearchReviewSample;
  reviewPackPath: string;
  reviewedOutputPath: string;
  outcome: ResearchCandidateOutcome | null;
  chartPath: string | null;
  symbol: Instrument;
}): ModelCandidateLedgerEntry {
  const warnings = [
    ...args.sample.dataQualityNotes,
    ...(args.outcome?.dataQualityNotes || []),
  ].filter(Boolean);
  if (!args.chartPath) warnings.push('PriceActionReviewCard PNG artifact not found for reviewed sample.');
  if (!args.outcome) warnings.push('Outcome math not found for reviewed sample.');
  const estimatedGrossContractPnl = coerceEstimatedGrossContractPnl(args.sample.estimatedGrossContractPnl) ||
    calculateEstimatedGrossContractPnl({
      outcome: args.outcome,
      sampleSymbol: sampleSymbol(args.sample),
      reviewPackSymbol: args.symbol,
      ledgerSymbol: args.symbol,
    });
  return {
    sampleId: args.sample.sampleId,
    concept: args.sample.concept,
    conceptTitle: args.sample.conceptTitle,
    symbol: args.symbol,
    contract: contractFromChartPath(args.chartPath),
    date: args.sample.date,
    time: args.sample.time,
    direction: args.sample.direction,
    window: args.sample.window,
    agentRecommendation: agentRecommendation(args.sample),
    humanApprovalState: args.sample.humanInspectionLabel as ModelCandidateLedgerEntry['humanApprovalState'],
    ledgerStatus: ledgerStatus(args.sample.humanInspectionLabel) || 'research_sample',
    humanReason: args.sample.humanReason,
    humanNotes: args.sample.humanNotes,
    chartArtifactPath: args.chartPath,
    outcomeMathSummary: {
      outcomeClassification: args.outcome?.outcomeClassification || null,
      firstMeaningfulMove: args.outcome?.firstMeaningfulMove || null,
      favorableThresholdOneTouched: args.outcome?.thresholdOneTouched ?? null,
      favorableThresholdTwoTouched: args.outcome?.thresholdTwoTouched ?? null,
      adverseThresholdTouched: args.outcome?.adverseThresholdTouched ?? null,
      hypotheticalOutcomeLabel: args.outcome?.hypotheticalOutcomeOverlay?.hypotheticalOutcomeLabel || null,
    },
    estimatedGrossContractPnl,
    agentAssessmentStatus: args.sample.agentAssessment?.status || null,
    reviewEvidence: args.sample.reviewEvidence || null,
    warningState: {
      warnings,
      missingChartArtifact: !args.chartPath,
      missingOutcomeMath: !args.outcome,
    },
    sourceReviewPackPath: args.reviewPackPath,
    reviewedOutputPath: args.reviewedOutputPath,
    reviewedAt: args.sample.humanReviewedAt,
    researchOnlyBoundary: researchOnlyBoundary(args.sample),
  };
}

function readinessFor(args: {
  total: number;
  approvalRate: number | null;
  missingDataWarningsCount: number;
  adverseFirstCount: number;
  thresholds: ModelCandidateLedgerOptions['thresholds'];
}): ModelCandidateReadinessStatus {
  if (args.total < args.thresholds.minimumReviewedSamples) return 'insufficient_evidence';
  if (args.approvalRate !== null && args.approvalRate < 0.35) return 'reject_or_deprioritize';
  if (args.approvalRate !== null && args.approvalRate >= args.thresholds.minimumApprovalRate && args.missingDataWarningsCount === 0 && args.adverseFirstCount === 0) {
    return 'candidate_review_recommended';
  }
  return 'watchlist_candidate';
}

function advisoryPnlSummary(summary: EstimatedGrossContractPnlSummary): ModelCandidateAdvisoryEvidence['estimatedGrossContractPnlSummary'] {
  return {
    rootSymbol: summary.rootSymbol,
    sampleCountWithPnl: summary.sampleCountWithPnl,
    sampleCountMissingPnl: summary.sampleCountMissingPnl,
    ...(finite(summary.avgHypotheticalOutcomeDollars) ? { avgHypotheticalOutcomeDollars: summary.avgHypotheticalOutcomeDollars } : {}),
    ...(finite(summary.totalHypotheticalOutcomeDollars) ? { totalHypotheticalOutcomeDollars: summary.totalHypotheticalOutcomeDollars } : {}),
    ...(finite(summary.bestHypotheticalOutcomeDollars) ? { bestHypotheticalOutcomeDollars: summary.bestHypotheticalOutcomeDollars } : {}),
    ...(finite(summary.worstHypotheticalOutcomeDollars) ? { worstHypotheticalOutcomeDollars: summary.worstHypotheticalOutcomeDollars } : {}),
    ...(finite(summary.avgMfeDollars) ? { avgMfeDollars: summary.avgMfeDollars } : {}),
    ...(finite(summary.avgMaeDollars) ? { avgMaeDollars: summary.avgMaeDollars } : {}),
    status: summary.status,
  };
}

function summarizeModelCandidateAdvisoryEvidence(args: {
  rows: ModelCandidateLedgerEntry[];
  approved: number;
  notApproved: number;
  approvalRate: number | null;
  missingDataWarningsCount: number;
  adverseFirstCount: number;
  symbol: Instrument;
}): ModelCandidateAdvisoryEvidence {
  const agentAssessmentSummary = {
    agreesWithHuman: 0,
    partiallyAgreesWithHuman: 0,
    disagreesWithHuman: 0,
    unclearInsufficientEvidence: 0,
  };
  const reviewEvidenceSummary = {
    samplesWithChartEvidence: 0,
    samplesWithExactPngPath: 0,
    samplesWithExactReportPath: 0,
    samplesMissingCharts: 0,
    samplesWithUnknownCharts: 0,
    samplesWithWithheldCharts: 0,
  };

  for (const row of args.rows) {
    if (row.agentAssessmentStatus === 'agrees_with_human') agentAssessmentSummary.agreesWithHuman += 1;
    else if (row.agentAssessmentStatus === 'partially_agrees_with_human') agentAssessmentSummary.partiallyAgreesWithHuman += 1;
    else if (row.agentAssessmentStatus === 'disagrees_with_human') agentAssessmentSummary.disagreesWithHuman += 1;
    else agentAssessmentSummary.unclearInsufficientEvidence += 1;

    const evidence = row.reviewEvidence;
    const evidenceStatus = evidence?.evidenceStatus;
    if (evidence?.chartAvailable || row.chartArtifactPath) reviewEvidenceSummary.samplesWithChartEvidence += 1;
    if (evidence?.chartPngPath || row.chartArtifactPath) reviewEvidenceSummary.samplesWithExactPngPath += 1;
    if (evidence?.chartReportPath) reviewEvidenceSummary.samplesWithExactReportPath += 1;
    if (evidenceStatus === 'chart_missing' || (!evidenceStatus && row.warningState.missingChartArtifact)) reviewEvidenceSummary.samplesMissingCharts += 1;
    if (evidenceStatus === 'chart_unknown') reviewEvidenceSummary.samplesWithUnknownCharts += 1;
    if (evidence?.chartWithheld || evidenceStatus === 'chart_withheld') reviewEvidenceSummary.samplesWithWithheldCharts += 1;
  }

  return {
    sampleCount: args.rows.length,
    humanApprovedCount: args.approved,
    humanNotApprovedCount: args.notApproved,
    ...(args.approvalRate === null ? {} : { humanApprovalRate: args.approvalRate }),
    agentAssessmentSummary,
    reviewEvidenceSummary,
    estimatedGrossContractPnlSummary: advisoryPnlSummary(summarizeEstimatedGrossContractPnl(args.rows, args.symbol)),
    missingDataWarningCount: args.missingDataWarningsCount,
    adverseFirstContradictionCount: args.adverseFirstCount,
    boundary: 'research_only_not_execution_authority',
  };
}

export function interpretModelCandidateAdvisoryEvidence(args: {
  evidence: ModelCandidateAdvisoryEvidence;
  candidateReadinessStatus: ModelCandidateReadinessStatus;
  thresholds: ModelCandidateLedgerOptions['thresholds'];
}): ModelCandidateAdvisoryInterpretation {
  const { evidence, candidateReadinessStatus, thresholds } = args;
  const reasons: string[] = [];
  const approvalRate = evidence.humanApprovalRate;
  const minimumApprovalRate = thresholds.minimumApprovalRate;
  const belowCoreSampleGate = evidence.sampleCount < ADVISORY_MINIMUM_REVIEWED_SAMPLES;
  const evidenceBase: ModelCandidateAdvisoryInterpretation['evidenceBase'] = belowCoreSampleGate
    ? 'too_small'
    : evidence.sampleCount < Math.max(ADVISORY_MINIMUM_REVIEWED_SAMPLES, thresholds.minimumReviewedSamples)
      ? 'developing'
      : 'sufficient_for_review';

  const humanReviewSignal: ModelCandidateAdvisoryInterpretation['humanReviewSignal'] = approvalRate === undefined
    ? 'insufficient'
    : approvalRate >= minimumApprovalRate
      ? 'supportive'
      : approvalRate >= 0.35
        ? 'mixed'
        : 'not_supportive';

  const agent = evidence.agentAssessmentSummary;
  const assessedCount = agent.agreesWithHuman + agent.partiallyAgreesWithHuman + agent.disagreesWithHuman;
  const supportiveAgentCount = agent.agreesWithHuman + agent.partiallyAgreesWithHuman;
  const agentAssessmentSignal: ModelCandidateAdvisoryInterpretation['agentAssessmentSignal'] = assessedCount === 0
    ? agent.unclearInsufficientEvidence > 0 ? 'unclear' : 'insufficient'
    : agent.disagreesWithHuman > supportiveAgentCount
      ? 'negative'
      : agent.disagreesWithHuman > 0
        ? 'mixed'
        : 'supportive';

  const review = evidence.reviewEvidenceSummary;
  const chartProblemCount = review.samplesMissingCharts + review.samplesWithUnknownCharts + review.samplesWithWithheldCharts;
  const chartEvidenceSignal: ModelCandidateAdvisoryInterpretation['chartEvidenceSignal'] = chartProblemCount > 0 || review.samplesWithChartEvidence === 0
    ? 'missing_or_unknown'
    : review.samplesWithChartEvidence >= evidence.sampleCount && review.samplesWithExactReportPath >= evidence.sampleCount
      ? 'sufficient'
      : 'partial';

  const pnl = evidence.estimatedGrossContractPnlSummary;
  const hasHypothetical = finite(pnl?.avgHypotheticalOutcomeDollars);
  const pnlSignal: ModelCandidateAdvisoryInterpretation['pnlSignal'] = belowCoreSampleGate
    ? 'not_meaningful_low_sample_count'
    : !pnl || pnl.status === 'unavailable' || pnl.status === 'unavailable_unknown_contract'
      ? 'unavailable'
      : pnl.status === 'partial' || !hasHypothetical
        ? 'partial_not_decisive'
        : (pnl.avgHypotheticalOutcomeDollars as number) <= 0 ||
            (finite(pnl.worstHypotheticalOutcomeDollars) && pnl.worstHypotheticalOutcomeDollars < 0)
          ? 'adverse_or_mixed'
          : 'supportive_after_core_gates';

  if (belowCoreSampleGate) reasons.push(`Reviewed sample count is below the ${ADVISORY_MINIMUM_REVIEWED_SAMPLES}-sample evidence gate.`);
  if (belowCoreSampleGate) reasons.push('Estimated gross contract P/L is not meaningful until the core evidence base is large enough.');
  if (humanReviewSignal === 'mixed') reasons.push(`Human approval rate is below the ${Math.round(minimumApprovalRate * 100)}% review gate.`);
  if (humanReviewSignal === 'not_supportive') reasons.push('Human review signal is not supportive.');
  if (agentAssessmentSignal === 'mixed') reasons.push('Agent assessments are mixed and should be reviewed beside the human notes and chart evidence.');
  if (agentAssessmentSignal === 'negative') reasons.push('Agent assessments are negative relative to the human review signal.');
  if (agentAssessmentSignal === 'unclear' || agentAssessmentSignal === 'insufficient') reasons.push('Agent assessment evidence is unclear or insufficient.');
  if (evidence.missingDataWarningCount > 0) reasons.push('Missing-data warnings must be resolved before formal model-candidate review.');
  if (evidence.adverseFirstContradictionCount > 0) reasons.push('Adverse-first contradictions must be resolved before formal model-candidate review.');
  if (chartEvidenceSignal === 'missing_or_unknown') reasons.push('Chart/report evidence is missing, withheld, or unknown.');
  if (chartEvidenceSignal === 'partial') reasons.push('Chart/report evidence is partial and should be completed where available.');
  if (pnlSignal === 'partial_not_decisive') reasons.push('Estimated gross contract P/L is partial and not decisive because a defined hypothetical outcome is not available for every reviewed sample.');
  if (pnlSignal === 'partial_not_decisive' && pnl && finite(pnl.avgMfeDollars) && !hasHypothetical) reasons.push('MFE-only evidence is excursion context, not a completed outcome translation.');
  if (pnlSignal === 'adverse_or_mixed') reasons.push('Estimated gross contract P/L is adverse or mixed and should be treated as a caution.');
  if (pnlSignal === 'unavailable') reasons.push('Estimated gross contract P/L is unavailable for this concept.');

  const blocksCandidateReview = (
    belowCoreSampleGate ||
    humanReviewSignal !== 'supportive' ||
    evidence.missingDataWarningCount > 0 ||
    evidence.adverseFirstContradictionCount > 0 ||
    chartEvidenceSignal !== 'sufficient'
  );

  let advisoryStatus: ModelCandidateAdvisoryInterpretation['advisoryStatus'];
  let nextAction: ModelCandidateAdvisoryInterpretation['nextAction'];
  if (candidateReadinessStatus === 'reject_or_deprioritize') {
    advisoryStatus = 'reject_or_deprioritize';
    nextAction = 'reject_or_deprioritize';
    if (!reasons.length) reasons.push('Existing readiness status is reject or deprioritize.');
  } else if (belowCoreSampleGate) {
    advisoryStatus = 'keep_collecting_evidence';
    nextAction = 'collect_more_reviewed_samples';
  } else if (evidence.missingDataWarningCount > 0 || chartEvidenceSignal !== 'sufficient') {
    advisoryStatus = 'do_not_advance';
    nextAction = 'resolve_missing_evidence';
  } else if (evidence.adverseFirstContradictionCount > 0) {
    advisoryStatus = 'do_not_advance';
    nextAction = 'resolve_adverse_contradictions';
  } else if (candidateReadinessStatus === 'candidate_review_recommended' && !blocksCandidateReview) {
    advisoryStatus = 'candidate_review_recommended';
    nextAction = 'move_to_formal_model_candidate_backtest_human_final_decision_required';
    reasons.push('Move to formal model-candidate review/backtest. Human final decision required.');
  } else {
    advisoryStatus = 'watchlist_candidate';
    nextAction = humanReviewSignal === 'supportive' ? 'continue_watchlist' : 'collect_more_reviewed_samples';
    if (!reasons.length) reasons.push('Keep collecting evidence.');
  }

  return {
    advisoryStatus,
    evidenceBase,
    humanReviewSignal,
    agentAssessmentSignal,
    chartEvidenceSignal,
    pnlSignal,
    nextAction,
    reasons,
    boundary: 'research_only_not_execution_authority',
  };
}

function summarizeConcepts(entries: ModelCandidateLedgerEntry[], thresholds: ModelCandidateLedgerOptions['thresholds'], symbol: Instrument): ModelCandidateConceptSummary[] {
  const byConcept = new Map<string, ModelCandidateLedgerEntry[]>();
  for (const entry of entries) {
    const list = byConcept.get(entry.concept) || [];
    list.push(entry);
    byConcept.set(entry.concept, list);
  }
  return [...byConcept.entries()].map(([concept, rows]) => {
    const approved = rows.filter((row) => row.humanApprovalState === APPROVED_LABEL).length;
    const notApproved = rows.filter((row) => row.humanApprovalState === NOT_APPROVED_LABEL).length;
    const total = rows.length;
    const approvalRate = total ? approved / total : null;
    const agentRecommendationDistribution: Record<string, number> = {};
    const directionDistribution: Record<string, number> = {};
    const timeWindowDistribution: Record<string, number> = {};
    const outcomeSummary: Record<string, number> = {};
    for (const row of rows) {
      increment(agentRecommendationDistribution, row.agentRecommendation);
      increment(directionDistribution, row.direction);
      increment(timeWindowDistribution, row.window);
      increment(outcomeSummary, row.outcomeMathSummary.hypotheticalOutcomeLabel || row.outcomeMathSummary.outcomeClassification || 'outcome_unavailable');
    }
    const missingDataWarningsCount = rows.reduce((totalWarnings, row) => totalWarnings + row.warningState.warnings.length, 0);
    const adverseFirstCount = rows.filter((row) =>
      row.outcomeMathSummary.firstMeaningfulMove === 'adverse' ||
      row.outcomeMathSummary.hypotheticalOutcomeLabel === 'adverse_failure'
    ).length;
    const candidateReadinessStatus = readinessFor({
      total,
      approvalRate,
      missingDataWarningsCount,
      adverseFirstCount,
      thresholds,
    });
    const deskRecommendation = candidateReadinessStatus === 'candidate_review_recommended'
      ? `Desk recommendation: candidate review recommended. ${FINAL_DECISION_MESSAGE}`
      : `Desk recommendation: ${candidateReadinessStatus.replace(/_/g, ' ')}. ${FINAL_DECISION_MESSAGE}`;
    const modelCandidateAdvisoryEvidence = summarizeModelCandidateAdvisoryEvidence({
      rows,
      approved,
      notApproved,
      approvalRate,
      missingDataWarningsCount,
      adverseFirstCount,
      symbol,
    });
    const modelCandidateAdvisoryInterpretation = interpretModelCandidateAdvisoryEvidence({
      evidence: modelCandidateAdvisoryEvidence,
      candidateReadinessStatus,
      thresholds,
    });
    return {
      concept,
      conceptTitle: rows[0]?.conceptTitle || concept,
      totalSamplesReviewed: total,
      humanApprovedCount: approved,
      humanNotApprovedCount: notApproved,
      approvalRate,
      agentRecommendationDistribution,
      directionDistribution,
      timeWindowDistribution,
      outcomeSummary,
      chartAvailabilityCount: rows.filter((row) => Boolean(row.chartArtifactPath)).length,
      missingDataWarningsCount,
      candidateReadinessStatus,
      deskRecommendation,
      modelCandidateAdvisoryEvidence,
      modelCandidateAdvisoryInterpretation,
    };
  }).sort((left, right) => right.totalSamplesReviewed - left.totalSamplesReviewed || left.concept.localeCompare(right.concept));
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function avg(values: number[]): number | undefined {
  return values.length ? round(values.reduce((total, value) => total + value, 0) / values.length) : undefined;
}

function summarizeEstimatedGrossContractPnl(entries: ModelCandidateLedgerEntry[], symbol: Instrument): EstimatedGrossContractPnlSummary {
  const metadata = FUTURES_CONTRACT_METADATA[symbol];
  const withAnyPnl = entries.filter((entry) => {
    const pnl = entry.estimatedGrossContractPnl;
    return Boolean(pnl && pnl.rootSymbol !== 'UNKNOWN' && (
      finite(pnl.hypotheticalOutcomeDollars) ||
      finite(pnl.mfeDollars) ||
      finite(pnl.maeDollars)
    ));
  });
  const hypothetical = withAnyPnl
    .map((entry) => entry.estimatedGrossContractPnl?.hypotheticalOutcomeDollars)
    .filter(finite);
  const mfe = withAnyPnl
    .map((entry) => entry.estimatedGrossContractPnl?.mfeDollars)
    .filter(finite);
  const mae = withAnyPnl
    .map((entry) => entry.estimatedGrossContractPnl?.maeDollars)
    .filter(finite);
  const sampleCountWithPnl = withAnyPnl.length;
  const sampleCountMissingPnl = Math.max(0, entries.length - sampleCountWithPnl);
  const allSamplesHaveHypothetical = entries.length > 0 && hypothetical.length === entries.length;
  const partial = sampleCountWithPnl > 0 && !allSamplesHaveHypothetical;
  const status: EstimatedGrossContractPnlSummary['status'] = entries.length === 0 || sampleCountWithPnl === 0
    ? 'unavailable'
    : partial
      ? 'partial'
      : 'available';
  const note = status === 'partial'
    ? 'P/L summary is partial because MFE/MAE exists, but no defined hypothetical outcome model was available for all samples.'
    : 'Research-only gross estimate. Not executed performance. Excludes commissions, slippage, spread, fills, partial fills, taxes, fees, and live execution effects.';
  return {
    rootSymbol: metadata.rootSymbol,
    displayName: metadata.displayName,
    contracts: 1,
    pointValue: metadata.pointValue,
    tickSize: metadata.tickSize,
    tickValue: metadata.tickValue,
    currency: metadata.currency,
    sampleCountWithPnl,
    sampleCountMissingPnl,
    ...(hypothetical.length ? {
      totalHypotheticalOutcomeDollars: round(hypothetical.reduce((total, value) => total + value, 0)),
      avgHypotheticalOutcomeDollars: avg(hypothetical),
      bestHypotheticalOutcomeDollars: round(Math.max(...hypothetical)),
      worstHypotheticalOutcomeDollars: round(Math.min(...hypothetical)),
    } : {}),
    ...(avg(mfe) !== undefined ? { avgMfeDollars: avg(mfe) } : {}),
    ...(avg(mae) !== undefined ? { avgMaeDollars: avg(mae) } : {}),
    status,
    note,
  };
}

function formatLedgerDollars(value: number | undefined): string {
  if (!finite(value)) return 'Not recorded';
  const prefix = value > 0 ? '+$' : value < 0 ? '-$' : '$';
  return `${prefix}${Math.abs(value).toFixed(2)} gross`;
}

function formatApprovalRate(value: number | null | undefined): string {
  return value === null || value === undefined ? 'n/a' : `${Math.round(value * 100)}%`;
}

function renderAdvisoryEvidenceMarkdown(evidence: ModelCandidateAdvisoryEvidence): string[] {
  const agent = evidence.agentAssessmentSummary;
  const review = evidence.reviewEvidenceSummary;
  const pnl = evidence.estimatedGrossContractPnlSummary;
  const pnlSummary = pnl
    ? `${pnl.rootSymbol}; samples with P/L ${pnl.sampleCountWithPnl}; missing ${pnl.sampleCountMissingPnl}; avg hypothetical ${formatLedgerDollars(pnl.avgHypotheticalOutcomeDollars)}; avg MFE ${formatLedgerDollars(pnl.avgMfeDollars)}; avg MAE ${formatLedgerDollars(pnl.avgMaeDollars)}; status ${pnl.status}; supporting research/audit evidence only`
    : 'Not recorded';
  return [
    'Model-Candidate Advisory Evidence:',
    `- Reviewed Samples: ${evidence.sampleCount}`,
    `- Human Approved: ${evidence.humanApprovedCount}`,
    `- Human Not Approved: ${evidence.humanNotApprovedCount}`,
    `- Human Approval Rate: ${formatApprovalRate(evidence.humanApprovalRate)}`,
    `- Agent Assessment Summary: agrees=${agent.agreesWithHuman}; partial=${agent.partiallyAgreesWithHuman}; disagrees=${agent.disagreesWithHuman}; unclear=${agent.unclearInsufficientEvidence}`,
    `- Chart/Report Evidence: chart evidence=${review.samplesWithChartEvidence}; exact PNG=${review.samplesWithExactPngPath}; exact report=${review.samplesWithExactReportPath}; missing=${review.samplesMissingCharts}; unknown=${review.samplesWithUnknownCharts}; withheld=${review.samplesWithWithheldCharts}`,
    `- Estimated Gross Contract P/L Summary: ${pnlSummary}`,
    `- Missing Data Warnings: ${evidence.missingDataWarningCount}`,
    `- Adverse-First Contradictions: ${evidence.adverseFirstContradictionCount}`,
    `- Boundary: ${evidence.boundary}`,
  ];
}

function renderAdvisoryInterpretationMarkdown(interpretation: ModelCandidateAdvisoryInterpretation): string[] {
  return [
    'Model-Candidate Advisory Interpretation:',
    `- Advisory Status: ${interpretation.advisoryStatus}`,
    `- Evidence Base: ${interpretation.evidenceBase}`,
    `- Human Review Signal: ${interpretation.humanReviewSignal}`,
    `- Agent Assessment Signal: ${interpretation.agentAssessmentSignal}`,
    `- Chart Evidence Signal: ${interpretation.chartEvidenceSignal}`,
    `- P/L Signal: ${interpretation.pnlSignal}`,
    `- Next Action: ${interpretation.nextAction}`,
    '- Reasons:',
    ...(interpretation.reasons.length ? interpretation.reasons.map((reason) => `  - ${reason}`) : ['  - None recorded.']),
    `- Boundary: ${interpretation.boundary}`,
  ];
}

function prohibitedPaths(value: unknown, pathName = 'ledger'): string[] {
  if (!value || typeof value !== 'object') return [];
  const paths: string[] = [];
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const next = `${pathName}.${key}`;
    if (PROHIBITED_LEDGER_KEYS.has(key)) paths.push(next);
    paths.push(...prohibitedPaths(child, next));
  }
  return paths;
}

export function assertNoExecutableLedgerFields(ledger: ModelCandidateReviewLedger): void {
  const paths = prohibitedPaths(ledger);
  if (paths.length) throw new Error(`Model candidate ledger contains prohibited executable field(s): ${paths.join(', ')}`);
}

async function loadOutcomeMap(outcomeReportDir: string, symbol: Instrument, from: string, to: string, warnings: string[]): Promise<Map<string, ResearchCandidateOutcome>> {
  const files = await listFiles(outcomeReportDir, (name) => /^research-outcome-math-.*\.json$/i.test(name));
  const outcomes = new Map<string, ResearchCandidateOutcome>();
  for (const file of files) {
    try {
      const parsed = await readJsonFile<unknown>(file);
      if (!isOutcomeReport(parsed) || parsed.instrument !== symbol) continue;
      for (const outcome of parsed.candidateOutcomes) {
        if (!inDateRange(outcome.date, from, to)) continue;
        outcomes.set(outcomeKey(outcome), outcome);
      }
    } catch (error) {
      warnings.push(`Outcome report skipped: ${file}; ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return outcomes;
}

async function loadChartFiles(chartDir: string): Promise<string[]> {
  return listFiles(chartDir, (name) => /^price-action-review-card-.*\.png$/i.test(name));
}

async function loadReviewedEntries(options: ModelCandidateLedgerOptions, outcomes: Map<string, ResearchCandidateOutcome>, chartFiles: string[], warnings: string[]): Promise<{
  entries: ModelCandidateLedgerEntry[];
  ignoredLegacyReviewedSamples: number;
}> {
  const files = await listFiles(options.reviewPackDir, (name) => /^research-sample-review-.*\.reviewed\.json$/i.test(name));
  const entries: ModelCandidateLedgerEntry[] = [];
  let ignoredLegacyReviewedSamples = 0;
  const seen = new Set<string>();
  for (const file of files) {
    try {
      const parsed = await readJsonFile<unknown>(file);
      if (!isReviewPack(parsed) || parsed.instrument !== options.symbol) continue;
      for (const sample of parsed.samples) {
        if (!inDateRange(sample.date, options.from, options.to)) continue;
        const status = ledgerStatus(sample.humanInspectionLabel);
        if (!status) {
          if (sample.humanInspectionLabel) ignoredLegacyReviewedSamples += 1;
          continue;
        }
        const dedupeKey = `${sample.sampleId}|${sample.humanReviewedAt || ''}|${file}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        const outcome = outcomeForSample(sample, outcomes);
        const chartPath = chartPathForSample(sample, chartFiles);
        entries.push(entryForSample({
          sample,
          reviewPackPath: originalReviewPackPath(file),
          reviewedOutputPath: file,
          outcome,
          chartPath,
          symbol: options.symbol,
        }));
      }
    } catch (error) {
      warnings.push(`Reviewed pack skipped: ${file}; ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { entries: entries.sort((left, right) => `${left.date} ${left.time || ''} ${left.sampleId}`.localeCompare(`${right.date} ${right.time || ''} ${right.sampleId}`)), ignoredLegacyReviewedSamples };
}

export function renderModelCandidateLedgerMarkdown(ledger: ModelCandidateReviewLedger): string {
  const pnl = ledger.estimatedGrossContractPnlSummary || summarizeEstimatedGrossContractPnl(ledger.entries, ledger.symbol);
  return [
    `# Model Candidate Review Ledger - ${ledger.symbol}`,
    '',
    `Date range: ${ledger.from} to ${ledger.to}`,
    '',
    SAFETY_MESSAGE,
    FINAL_DECISION_MESSAGE,
    '',
    '## Summary',
    `- Reviewed samples found: ${ledger.summary.reviewedSamplesFound}`,
    `- Human approved: ${ledger.summary.approvedCount}`,
    `- Human not approved: ${ledger.summary.notApprovedCount}`,
    `- Ignored legacy reviewed samples: ${ledger.summary.ignoredLegacyReviewedSamples}`,
    `- Concepts reviewed: ${ledger.summary.conceptsReviewed}`,
    `- Candidate review recommended concepts: ${ledger.summary.candidateReviewRecommendedConcepts}`,
    `- Minimum reviewed samples: ${ledger.thresholds.minimumReviewedSamples}`,
    `- Minimum approval rate: ${Math.round(ledger.thresholds.minimumApprovalRate * 100)}%`,
    '',
    '## Estimated Gross Contract P/L Summary, 1 Contract',
    `- Contract: ${pnl.rootSymbol === 'UNKNOWN' ? 'UNKNOWN' : `${pnl.rootSymbol} - ${pnl.displayName}`}`,
    `- Point Value: ${pnl.pointValue ? `$${pnl.pointValue.toFixed(2)}` : 'Not recorded'}`,
    `- Tick Size: ${pnl.tickSize || 'Not recorded'}`,
    `- Tick Value: ${pnl.tickValue ? `$${pnl.tickValue.toFixed(2)}` : 'Not recorded'}`,
    `- Samples with P/L: ${pnl.sampleCountWithPnl}`,
    `- Samples missing P/L: ${pnl.sampleCountMissingPnl}`,
    `- Avg Hypothetical Outcome: ${formatLedgerDollars(pnl.avgHypotheticalOutcomeDollars)}`,
    `- Best Hypothetical Outcome: ${formatLedgerDollars(pnl.bestHypotheticalOutcomeDollars)}`,
    `- Worst Hypothetical Outcome: ${formatLedgerDollars(pnl.worstHypotheticalOutcomeDollars)}`,
    `- Avg MFE: ${formatLedgerDollars(pnl.avgMfeDollars)}`,
    `- Avg MAE: ${formatLedgerDollars(pnl.avgMaeDollars)}`,
    `- Status: ${pnl.status}`,
    `- Note: ${pnl.note}`,
    '',
    '## Concept Summary',
    ...(ledger.conceptSummaries.length
      ? ledger.conceptSummaries.map((summary) => [
        `### ${summary.conceptTitle}`,
        `- Concept: ${summary.concept}`,
        `- Reviewed: ${summary.totalSamplesReviewed}`,
        `- Approved / Not approved: ${summary.humanApprovedCount} / ${summary.humanNotApprovedCount}`,
        `- Approval rate: ${formatApprovalRate(summary.approvalRate)}`,
        `- Chart artifacts available: ${summary.chartAvailabilityCount}`,
        `- Missing-data warnings: ${summary.missingDataWarningsCount}`,
        `- Candidate readiness: ${summary.candidateReadinessStatus}`,
        `- ${summary.deskRecommendation}`,
        '',
        ...renderAdvisoryEvidenceMarkdown(summary.modelCandidateAdvisoryEvidence),
        '',
        ...renderAdvisoryInterpretationMarkdown(summary.modelCandidateAdvisoryInterpretation),
      ].join('\n'))
      : ['- No approved/not-approved PriceActionReviewCard reviews found for this range.']),
    '',
    '## Reviewed Evidence',
    ...(ledger.entries.length
      ? ledger.entries.map((entry) => [
        `- ${entry.sampleId}: ${entry.humanApprovalState}; ${entry.conceptTitle}; ${entry.date} ${entry.time || 'time unavailable'}; chart=${entry.chartArtifactPath ? path.basename(entry.chartArtifactPath) : 'missing'}; outcome=${entry.outcomeMathSummary.hypotheticalOutcomeLabel || entry.outcomeMathSummary.outcomeClassification || 'missing'}`,
      ].join('\n'))
      : ['- none']),
    '',
    '## Warnings',
    ...(ledger.warnings.length ? ledger.warnings.map((warning) => `- ${warning}`) : ['- none']),
  ].join('\n');
}

function outputPaths(outDir: string): { jsonPath: string; markdownPath: string } {
  const dir = path.resolve(outDir);
  return {
    jsonPath: path.join(dir, 'model-candidate-review-ledger.json'),
    markdownPath: path.join(dir, 'model-candidate-review-ledger.md'),
  };
}

export async function buildModelCandidateReviewLedger(options: ModelCandidateLedgerOptions): Promise<ModelCandidateReviewLedger> {
  const warnings: string[] = [];
  const outcomes = await loadOutcomeMap(path.resolve(options.outcomeReportDir), options.symbol, options.from, options.to, warnings);
  const chartFiles = await loadChartFiles(path.resolve(options.chartDir));
  const { entries, ignoredLegacyReviewedSamples } = await loadReviewedEntries(options, outcomes, chartFiles, warnings);
  const conceptSummaries = summarizeConcepts(entries, options.thresholds, options.symbol);
  const estimatedGrossContractPnlSummary = summarizeEstimatedGrossContractPnl(entries, options.symbol);
  const paths = outputPaths(options.outDir);
  const ledger: ModelCandidateReviewLedger = {
    reportType: 'model_candidate_review_ledger',
    generatedAt: new Date().toISOString(),
    from: options.from,
    to: options.to,
    symbol: options.symbol,
    advisoryOnly: true,
    safety: {
      researchOnly: true,
      approvesExecution: false,
      changesRules: false,
      createsTrades: false,
      writesRag: false,
      writesJournal: false,
      message: SAFETY_MESSAGE,
    },
    thresholds: options.thresholds,
    summary: {
      reviewedSamplesFound: entries.length,
      approvedCount: entries.filter((entry) => entry.humanApprovalState === APPROVED_LABEL).length,
      notApprovedCount: entries.filter((entry) => entry.humanApprovalState === NOT_APPROVED_LABEL).length,
      ignoredLegacyReviewedSamples,
      conceptsReviewed: conceptSummaries.length,
      candidateReviewRecommendedConcepts: conceptSummaries.filter((summary) => summary.candidateReadinessStatus === 'candidate_review_recommended').length,
    },
    entries,
    conceptSummaries,
    estimatedGrossContractPnlSummary,
    warnings,
    outputPaths: paths,
  };
  assertNoExecutableLedgerFields(ledger);
  mkdirSync(path.dirname(paths.jsonPath), { recursive: true });
  writeFileSync(paths.jsonPath, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
  writeFileSync(paths.markdownPath, `${renderModelCandidateLedgerMarkdown(ledger)}\n`, 'utf8');
  return ledger;
}

function renderPretty(ledger: ModelCandidateReviewLedger): string {
  return [
    '[MODEL CANDIDATE REVIEW LEDGER]',
    `Date range: ${ledger.from} to ${ledger.to}`,
    `Symbol: ${ledger.symbol}`,
    `Ledger JSON: ${ledger.outputPaths.jsonPath}`,
    `Ledger Markdown: ${ledger.outputPaths.markdownPath}`,
    `Reviewed samples found: ${ledger.summary.reviewedSamplesFound}`,
    `Human approved: ${ledger.summary.approvedCount}`,
    `Human not approved: ${ledger.summary.notApprovedCount}`,
    `Ignored legacy reviewed samples: ${ledger.summary.ignoredLegacyReviewedSamples}`,
    `Concepts reviewed: ${ledger.summary.conceptsReviewed}`,
    `Candidate review recommended concepts: ${ledger.summary.candidateReviewRecommendedConcepts}`,
    `Estimated gross contract P/L status: ${(ledger.estimatedGrossContractPnlSummary || summarizeEstimatedGrossContractPnl(ledger.entries, ledger.symbol)).status}`,
    `Estimated gross contract P/L samples: with=${(ledger.estimatedGrossContractPnlSummary || summarizeEstimatedGrossContractPnl(ledger.entries, ledger.symbol)).sampleCountWithPnl}; missing=${(ledger.estimatedGrossContractPnlSummary || summarizeEstimatedGrossContractPnl(ledger.entries, ledger.symbol)).sampleCountMissingPnl}`,
    'Concept-level summary:',
    ...(ledger.conceptSummaries.length
      ? ledger.conceptSummaries.map((summary) => `- ${summary.concept}: reviewed=${summary.totalSamplesReviewed}; approved=${summary.humanApprovedCount}; notApproved=${summary.humanNotApprovedCount}; approvalRate=${summary.approvalRate === null ? 'n/a' : Math.round(summary.approvalRate * 100)}%; readiness=${summary.candidateReadinessStatus}`)
      : ['- none']),
    `Warnings: ${ledger.warnings.length ? ledger.warnings.join(' | ') : 'none'}`,
    '',
    SAFETY_MESSAGE,
    FINAL_DECISION_MESSAGE,
  ].join('\n');
}

export async function runModelCandidateLedgerCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseModelCandidateLedgerArgs(rawArgs);
  const ledger = await buildModelCandidateReviewLedger(options);
  if (options.json) console.log(JSON.stringify(ledger, null, 2));
  if (options.pretty) console.log(renderPretty(ledger));
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tools/automation/model-candidate-ledger.ts')) {
  runModelCandidateLedgerCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
