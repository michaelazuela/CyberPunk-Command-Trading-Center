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
import {
  getHumanReviewLabelMetadata,
  isFormalModelCandidateReviewLabel,
} from '../../src/lib/humanReviewLabels';

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
  writeRangeArtifact?: boolean;
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

export interface ModelCandidateResearchRecommendation {
  status:
    | 'do_not_advance'
    | 'keep_collecting_evidence'
    | 'watchlist_candidate'
    | 'candidate_review_recommended'
    | 'reject_or_deprioritize';
  recommendationText: string;
  gateResults: {
    sampleCountGate: 'pass' | 'fail';
    humanApprovalRateGate: 'pass' | 'fail' | 'not_applicable';
    missingDataGate: 'pass' | 'fail';
    adverseFirstGate: 'pass' | 'fail';
    chartEvidenceGate: 'pass' | 'fail' | 'partial';
    agentAssessmentGate: 'pass' | 'fail' | 'partial';
    pnlSupportSignal: 'supportive' | 'partial' | 'adverse_or_mixed' | 'unavailable' | 'not_meaningful_low_sample_count';
  };
  reasons: string[];
  humanFinalDecisionRequired: true;
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
  modelCandidateResearchRecommendation: ModelCandidateResearchRecommendation;
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
    humanReviewedSamplesFound: number;
    reviewedFilesFound: number;
    reviewedFilesRead: number;
    ignoredReviewedSamples: number;
    conceptsReviewed: number;
    candidateReviewRecommendedConcepts: number;
  };
  entries: ModelCandidateLedgerEntry[];
  conceptSummaries: ModelCandidateConceptSummary[];
  estimatedGrossContractPnlSummary?: EstimatedGrossContractPnlSummary;
  reviewedArtifactDiagnostics: ReviewedArtifactDiagnostics;
  warnings: string[];
  outputPaths: {
    jsonPath: string;
    markdownPath: string;
    rangeJsonPath?: string;
    rangeMarkdownPath?: string;
    watchlistJsonPath?: string;
    watchlistMarkdownPath?: string;
    rangeWatchlistJsonPath?: string;
    rangeWatchlistMarkdownPath?: string;
    backtestHandoffJsonPath?: string;
    backtestHandoffMarkdownPath?: string;
    rangeBacktestHandoffJsonPath?: string;
    rangeBacktestHandoffMarkdownPath?: string;
  };
}

export interface PreCandidateWatchlistSample {
  sampleId: string;
  reviewedFile?: string;
  concept: string;
  label: string;
  labelDisplayName?: string;
  labelCategory?: string;
  countsTowardCandidateGates?: boolean;
  agentAssessmentStatus?: string;
  chartEvidenceStatus?: string;
  chartPngPath?: string;
  chartReportPath?: string;
  estimatedGrossContractPnl?: EstimatedGrossContractPnl;
  nextHumanAction:
    | 'keep_advisory'
    | 'review_chart'
    | 'collect_more_samples'
    | 'decide_candidate_label'
    | 'reject_or_deprioritize';
}

export interface PreCandidateWatchlistReport {
  reportType: 'pre_candidate_watchlist';
  symbol: string;
  from: string;
  to: string;
  generatedAt: string;
  boundary: 'research_only_not_execution_authority';
  summary: {
    humanReviewedSamples: number;
    formalLedgerEligibleSamples: number;
    watchlistSamples: number;
    advisoryOnlySamples: number;
    rejectedOrDeprioritizedSamples: number;
    samplesWithAgentAssessment: number;
    samplesWithChartEvidence: number;
    samplesWithEstimatedGrossContractPnl: number;
  };
  concepts: Array<{
    concept: string;
    conceptTitle?: string;
    watchlistSampleCount: number;
    labels: Record<string, number>;
    agentAssessmentSummary: {
      agreesWithHuman: number;
      partiallyAgreesWithHuman: number;
      disagreesWithHuman: number;
      unclearInsufficientEvidence: number;
    };
    chartEvidenceSummary: {
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
      avgMfeDollars?: number;
      avgMaeDollars?: number;
      status: 'available' | 'partial' | 'unavailable' | 'unavailable_unknown_contract';
    };
    watchlistRecommendation: {
      status:
        | 'keep_advisory'
        | 'collect_more_evidence'
        | 'needs_more_chart_evidence'
        | 'ready_for_human_candidate_label_review'
        | 'reject_or_deprioritize';
      reason: string[];
      boundary: 'research_only_not_execution_authority';
    };
    samples: PreCandidateWatchlistSample[];
  }>;
  ignoredFormalLedgerReason: string;
  outputPaths: {
    jsonPath: string;
    markdownPath: string;
    rangeJsonPath?: string;
    rangeMarkdownPath?: string;
  };
}

export interface ModelCandidateBacktestHandoff {
  reportType: 'model_candidate_backtest_handoff';
  symbol: string;
  from: string;
  to: string;
  generatedAt: string;
  boundary: 'research_only_not_execution_authority';
  summary: {
    conceptCount: number;
    candidateReviewRecommendedCount: number;
    watchlistCount: number;
    keepCollectingEvidenceCount: number;
    doNotAdvanceCount: number;
    rejectedOrDeprioritizedCount: number;
  };
  concepts: Array<{
    concept: string;
    conceptTitle?: string;
    researchRecommendation: {
      status: ModelCandidateResearchRecommendation['status'];
      recommendationText: string;
      humanFinalDecisionRequired: true;
      boundary: 'research_only_not_execution_authority';
    };
    gateResults: ModelCandidateResearchRecommendation['gateResults'];
    evidenceSummary: {
      reviewedSamples: number;
      formalLedgerEligibleSamples: number;
      humanApprovedCount: number;
      humanNotApprovedCount: number;
      humanApprovalRate?: number;
      agentAssessmentSummary: ModelCandidateAdvisoryEvidence['agentAssessmentSummary'];
      chartEvidenceSummary: ModelCandidateAdvisoryEvidence['reviewEvidenceSummary'];
      estimatedGrossContractPnlSummary?: ModelCandidateAdvisoryEvidence['estimatedGrossContractPnlSummary'];
      adverseFirstContradictionCount: number;
      missingDataWarningCount: number;
    };
    contextSamples: Array<{
      sampleId: string;
      reviewedFile?: string;
      humanLabel: string;
      agentAssessmentStatus?: string;
      chartReportPath?: string;
      chartPngPath?: string;
      estimatedGrossContractPnl?: EstimatedGrossContractPnl;
      outcomeSummary?: ModelCandidateLedgerEntry['outcomeMathSummary'];
    }>;
    watchlistSamples?: Array<{
      sampleId: string;
      label: string;
      reason?: string[];
      nextHumanAction?: string;
    }>;
    backtestReadiness: {
      status:
        | 'ready_for_formal_backtest_review'
        | 'not_ready_collect_more_evidence'
        | 'watchlist_only'
        | 'blocked_by_missing_evidence'
        | 'reject_or_deprioritize';
      reasons: string[];
      requiredBacktestDefinitions: {
        entryModel: 'defined' | 'missing';
        exitModel: 'defined' | 'missing';
        stopModel: 'defined' | 'missing';
        targetModel: 'defined' | 'missing';
        fillAssumption: 'defined' | 'missing';
        commissionAssumption: 'defined' | 'missing';
        slippageAssumption: 'defined' | 'missing';
        positionSizing: 'defined' | 'missing';
        sessionFilter: 'defined' | 'missing';
      };
      nextHumanAction:
        | 'approve_formal_backtest_design'
        | 'define_backtest_assumptions'
        | 'collect_more_reviewed_samples'
        | 'resolve_missing_chart_evidence'
        | 'resolve_adverse_contradictions'
        | 'keep_on_watchlist'
        | 'reject_or_deprioritize';
    };
  }>;
  outputPaths: {
    jsonPath: string;
    markdownPath: string;
    rangeJsonPath?: string;
    rangeMarkdownPath?: string;
  };
}

export interface IgnoredReviewedSampleDiagnostic {
  sampleId: string;
  date: string | null;
  concept: string | null;
  humanInspectionLabel: string | null;
  reasons: string[];
}

export interface ReviewedFileDiagnostic {
  filePath: string;
  fileName: string;
  status: 'read' | 'ignored_wrong_symbol' | 'ignored_not_review_pack' | 'malformed';
  instrument: string | null;
  sampleCount: number;
  acceptedModelCandidateSamples: number;
  humanReviewedSamples: number;
  ignoredSamples: IgnoredReviewedSampleDiagnostic[];
  notes: string[];
}

export interface ReviewedArtifactDiagnostics {
  reviewedFilesFound: number;
  reviewedFilesRead: number;
  reviewedFilesMalformed: number;
  reviewedFilesWrongSymbol: number;
  reviewedSamplesScanned: number;
  humanReviewedSamplesFound: number;
  acceptedModelCandidateSamples: number;
  ignoredReviewedSamples: number;
  ignoredSamplesByReason: Record<string, number>;
  files: ReviewedFileDiagnostic[];
  note: string;
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
    writeRangeArtifact: !hasFlag(args, '--no-write-range-artifact') || hasFlag(args, '--write-range-artifact'),
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
  if (!isFormalModelCandidateReviewLabel(label)) return null;
  if (label === APPROVED_LABEL) return 'human_approved_for_candidate_review';
  if (label === NOT_APPROVED_LABEL) return 'human_not_approved_for_candidate_review';
  return null;
}

function hasHumanReview(sample: ResearchReviewSample): boolean {
  return Boolean(sample.humanInspectionLabel || sample.finalReviewLabel || sample.humanReviewedAt);
}

function addIgnoredReason(map: Record<string, number>, reason: string): void {
  map[reason] = (map[reason] || 0) + 1;
}

function ignoredSampleDiagnostic(sample: ResearchReviewSample, reasons: string[]): IgnoredReviewedSampleDiagnostic {
  return {
    sampleId: sample.sampleId,
    date: sample.date || null,
    concept: sample.concept || null,
    humanInspectionLabel: sample.humanInspectionLabel || null,
    reasons,
  };
}

function emptyReviewedArtifactDiagnostics(): ReviewedArtifactDiagnostics {
  return {
    reviewedFilesFound: 0,
    reviewedFilesRead: 0,
    reviewedFilesMalformed: 0,
    reviewedFilesWrongSymbol: 0,
    reviewedSamplesScanned: 0,
    humanReviewedSamplesFound: 0,
    acceptedModelCandidateSamples: 0,
    ignoredReviewedSamples: 0,
    ignoredSamplesByReason: {},
    files: [],
    note: 'No reviewed artifacts were found. Generated review packs are ignored by git; regenerate local artifacts before expecting historical ledger coverage.',
  };
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

function recommendationTextFor(status: ModelCandidateResearchRecommendation['status']): string {
  if (status === 'candidate_review_recommended') return 'Move to formal model-candidate review/backtest. Human final decision required.';
  if (status === 'keep_collecting_evidence') return 'Keep collecting evidence.';
  if (status === 'watchlist_candidate') return 'Watchlist candidate.';
  if (status === 'reject_or_deprioritize') return 'Reject or deprioritize.';
  return 'Do not advance.';
}

export function buildModelCandidateResearchRecommendation(args: {
  evidence: ModelCandidateAdvisoryEvidence;
  interpretation: ModelCandidateAdvisoryInterpretation;
  thresholds: ModelCandidateLedgerOptions['thresholds'];
}): ModelCandidateResearchRecommendation {
  const { evidence, interpretation, thresholds } = args;
  const reasons = [...interpretation.reasons];
  const sampleCountGate: ModelCandidateResearchRecommendation['gateResults']['sampleCountGate'] = evidence.sampleCount >= ADVISORY_MINIMUM_REVIEWED_SAMPLES ? 'pass' : 'fail';
  const humanApprovalRateGate: ModelCandidateResearchRecommendation['gateResults']['humanApprovalRateGate'] = evidence.humanApprovalRate === undefined
    ? 'not_applicable'
    : evidence.humanApprovalRate >= thresholds.minimumApprovalRate
      ? 'pass'
      : 'fail';
  const missingDataGate: ModelCandidateResearchRecommendation['gateResults']['missingDataGate'] = evidence.missingDataWarningCount === 0 ? 'pass' : 'fail';
  const adverseFirstGate: ModelCandidateResearchRecommendation['gateResults']['adverseFirstGate'] = evidence.adverseFirstContradictionCount === 0 ? 'pass' : 'fail';
  const chartEvidenceGate: ModelCandidateResearchRecommendation['gateResults']['chartEvidenceGate'] = interpretation.chartEvidenceSignal === 'sufficient'
    ? 'pass'
    : interpretation.chartEvidenceSignal === 'partial'
      ? 'partial'
      : 'fail';
  const agentAssessmentGate: ModelCandidateResearchRecommendation['gateResults']['agentAssessmentGate'] = interpretation.agentAssessmentSignal === 'negative'
    ? 'fail'
    : interpretation.agentAssessmentSignal === 'unclear' || interpretation.agentAssessmentSignal === 'insufficient'
      ? 'partial'
      : 'pass';
  const pnlSupportSignal: ModelCandidateResearchRecommendation['gateResults']['pnlSupportSignal'] =
    interpretation.pnlSignal === 'supportive_after_core_gates'
      ? 'supportive'
      : interpretation.pnlSignal === 'partial_not_decisive'
        ? 'partial'
        : interpretation.pnlSignal;

  if (sampleCountGate === 'fail' && !reasons.some((reason) => reason.includes('sample count'))) reasons.push(`Reviewed sample count is below the ${ADVISORY_MINIMUM_REVIEWED_SAMPLES}-sample minimum threshold.`);
  if (humanApprovalRateGate === 'fail' && !reasons.some((reason) => reason.includes('approval rate'))) reasons.push(`Human approval rate is below the ${Math.round(thresholds.minimumApprovalRate * 100)}% threshold.`);
  if (missingDataGate === 'fail' && !reasons.some((reason) => reason.includes('Missing-data'))) reasons.push('Resolve missing-data warnings before formal model-candidate review/backtest.');
  if (adverseFirstGate === 'fail' && !reasons.some((reason) => reason.includes('Adverse-first'))) reasons.push('Resolve adverse-first contradictions before formal model-candidate review/backtest.');
  if (chartEvidenceGate === 'fail') reasons.push('Missing or unknown chart/report evidence blocks formal model-candidate review/backtest.');
  if (chartEvidenceGate === 'partial') reasons.push('Partial chart/report evidence should be completed before formal model-candidate review/backtest.');
  if (agentAssessmentGate === 'fail') reasons.push('Materially negative agent assessments block formal model-candidate review/backtest.');
  if (agentAssessmentGate === 'partial') reasons.push('Unclear or insufficient agent assessments should be resolved before formal model-candidate review/backtest.');
  if (pnlSupportSignal === 'adverse_or_mixed') reasons.push('Estimated gross contract P/L evidence is adverse or mixed and should be resolved before formal model-candidate review/backtest.');
  if (pnlSupportSignal === 'partial') reasons.push('Estimated gross contract P/L is partial and is not treated as a profit result.');
  if (pnlSupportSignal === 'not_meaningful_low_sample_count') reasons.push('Estimated gross contract P/L is not meaningful while the reviewed sample count is below the minimum threshold.');

  const coreGatesPass = (
    sampleCountGate === 'pass' &&
    humanApprovalRateGate === 'pass' &&
    missingDataGate === 'pass' &&
    adverseFirstGate === 'pass' &&
    chartEvidenceGate === 'pass' &&
    agentAssessmentGate === 'pass'
  );
  const pnlMateriallyAdverse = pnlSupportSignal === 'adverse_or_mixed';
  let status: ModelCandidateResearchRecommendation['status'];
  if (sampleCountGate === 'fail') status = 'keep_collecting_evidence';
  else if (humanApprovalRateGate === 'fail') status = evidence.humanApprovalRate !== undefined && evidence.humanApprovalRate < 0.35 ? 'reject_or_deprioritize' : 'do_not_advance';
  else if (missingDataGate === 'fail' || chartEvidenceGate !== 'pass' || agentAssessmentGate === 'partial') status = 'do_not_advance';
  else if (adverseFirstGate === 'fail') status = 'watchlist_candidate';
  else if (agentAssessmentGate === 'fail') status = 'reject_or_deprioritize';
  else if (coreGatesPass && pnlMateriallyAdverse) status = 'watchlist_candidate';
  else if (coreGatesPass) status = 'candidate_review_recommended';
  else status = interpretation.advisoryStatus === 'reject_or_deprioritize' ? 'reject_or_deprioritize' : 'watchlist_candidate';

  if (status === 'candidate_review_recommended') reasons.push('Move to formal model-candidate review/backtest. Human final decision required.');

  return {
    status,
    recommendationText: recommendationTextFor(status),
    gateResults: {
      sampleCountGate,
      humanApprovalRateGate,
      missingDataGate,
      adverseFirstGate,
      chartEvidenceGate,
      agentAssessmentGate,
      pnlSupportSignal,
    },
    reasons: [...new Set(reasons)],
    humanFinalDecisionRequired: true,
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
    const modelCandidateResearchRecommendation = buildModelCandidateResearchRecommendation({
      evidence: modelCandidateAdvisoryEvidence,
      interpretation: modelCandidateAdvisoryInterpretation,
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
      modelCandidateResearchRecommendation,
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
    ? `${pnl.rootSymbol}; samples with P/L ${pnl.sampleCountWithPnl}; missing ${pnl.sampleCountMissingPnl}; avg hypothetical ${formatLedgerDollars(pnl.avgHypotheticalOutcomeDollars)}; avg MFE ${formatLedgerDollars(pnl.avgMfeDollars)}; avg MAE ${formatLedgerDollars(pnl.avgMaeDollars)}; status ${pnl.status}; context research/audit evidence only`
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

function renderResearchRecommendationMarkdown(recommendation: ModelCandidateResearchRecommendation): string[] {
  return [
    'Model-Candidate Research Recommendation:',
    `- Status: ${recommendation.status}`,
    `- Recommendation: ${recommendation.recommendationText}`,
    '- Gate Results:',
    `  - Sample Count: ${recommendation.gateResults.sampleCountGate}`,
    `  - Human Approval Rate: ${recommendation.gateResults.humanApprovalRateGate}`,
    `  - Missing Data: ${recommendation.gateResults.missingDataGate}`,
    `  - Adverse-First: ${recommendation.gateResults.adverseFirstGate}`,
    `  - Chart Evidence: ${recommendation.gateResults.chartEvidenceGate}`,
    `  - Agent Assessment: ${recommendation.gateResults.agentAssessmentGate}`,
    `  - P/L Support: ${recommendation.gateResults.pnlSupportSignal}`,
    '- Reasons:',
    ...(recommendation.reasons.length ? recommendation.reasons.map((reason) => `  - ${reason}`) : ['  - None recorded.']),
    `- Human Final Decision Required: ${recommendation.humanFinalDecisionRequired ? 'Yes' : 'No'}`,
    `- Boundary: ${recommendation.boundary}`,
  ];
}

function renderReviewedArtifactDiagnosticsMarkdown(diagnostics: ReviewedArtifactDiagnostics): string[] {
  return [
    '## Reviewed Artifact Diagnostics',
    `- Reviewed files found: ${diagnostics.reviewedFilesFound}`,
    `- Reviewed files read: ${diagnostics.reviewedFilesRead}`,
    `- Malformed reviewed files: ${diagnostics.reviewedFilesMalformed}`,
    `- Wrong-symbol reviewed files: ${diagnostics.reviewedFilesWrongSymbol}`,
    `- Reviewed samples scanned: ${diagnostics.reviewedSamplesScanned}`,
    `- Human-reviewed samples found: ${diagnostics.humanReviewedSamplesFound}`,
    `- Ledger-eligible model-candidate samples: ${diagnostics.acceptedModelCandidateSamples}`,
    `- Ignored reviewed samples: ${diagnostics.ignoredReviewedSamples}`,
    `- Note: ${diagnostics.note}`,
    '',
    '### Ignored Reasons',
    ...(Object.keys(diagnostics.ignoredSamplesByReason).length
      ? Object.entries(diagnostics.ignoredSamplesByReason).sort().map(([reason, count]) => `- ${reason}: ${count}`)
      : ['- none']),
    '',
    '### Reviewed Files Read',
    ...(diagnostics.files.length
      ? diagnostics.files.map((file) => [
        `- ${file.fileName}: status=${file.status}; instrument=${file.instrument || 'unknown'}; samples=${file.sampleCount}; humanReviewed=${file.humanReviewedSamples}; accepted=${file.acceptedModelCandidateSamples}; ignored=${file.ignoredSamples.length}`,
        ...(file.notes.length ? file.notes.map((note) => `  - Note: ${note}`) : []),
        ...(file.ignoredSamples.length ? file.ignoredSamples.map((sample) => `  - Ignored ${sample.sampleId} (${sample.date || 'date unknown'}; ${sample.humanInspectionLabel || 'no label'}): ${sample.reasons.join(', ')}`) : []),
      ].join('\n'))
      : ['- none']),
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

export function assertNoExecutableLedgerFields(ledger: unknown): void {
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
  diagnostics: ReviewedArtifactDiagnostics;
}> {
  const files = await listFiles(options.reviewPackDir, (name) => /^research-sample-review-.*\.reviewed\.json$/i.test(name));
  const entries: ModelCandidateLedgerEntry[] = [];
  let ignoredLegacyReviewedSamples = 0;
  const seen = new Set<string>();
  const diagnostics = emptyReviewedArtifactDiagnostics();
  diagnostics.reviewedFilesFound = files.length;
  if (!files.length) warnings.push(`No reviewed research sample packs found in ${path.resolve(options.reviewPackDir)}. Generated review packs may be ignored locally and must be regenerated for historical coverage.`);
  for (const file of files) {
    const fileDiagnostic: ReviewedFileDiagnostic = {
      filePath: file,
      fileName: path.basename(file),
      status: 'read',
      instrument: null,
      sampleCount: 0,
      acceptedModelCandidateSamples: 0,
      humanReviewedSamples: 0,
      ignoredSamples: [],
      notes: [],
    };
    try {
      const parsed = await readJsonFile<unknown>(file);
      if (!isReviewPack(parsed)) {
        fileDiagnostic.status = 'ignored_not_review_pack';
        fileDiagnostic.notes.push('File did not match the research_sample_review_pack schema.');
        diagnostics.files.push(fileDiagnostic);
        continue;
      }
      fileDiagnostic.instrument = parsed.instrument;
      fileDiagnostic.sampleCount = parsed.samples.length;
      diagnostics.reviewedSamplesScanned += parsed.samples.length;
      if (parsed.instrument !== options.symbol) {
        fileDiagnostic.status = 'ignored_wrong_symbol';
        fileDiagnostic.notes.push(`Pack instrument ${parsed.instrument} did not match requested symbol ${options.symbol}.`);
        diagnostics.reviewedFilesWrongSymbol += 1;
        diagnostics.files.push(fileDiagnostic);
        continue;
      }
      diagnostics.reviewedFilesRead += 1;
      for (const sample of parsed.samples) {
        const ignoredReasons: string[] = [];
        const inRange = inDateRange(sample.date, options.from, options.to);
        const humanReviewed = hasHumanReview(sample);
        if (!inRange) {
          if (humanReviewed) {
            ignoredReasons.push('outside_date_range');
            fileDiagnostic.ignoredSamples.push(ignoredSampleDiagnostic(sample, ignoredReasons));
            addIgnoredReason(diagnostics.ignoredSamplesByReason, 'outside_date_range');
          }
          continue;
        }
        if (!humanReviewed) continue;
        diagnostics.humanReviewedSamplesFound += 1;
        fileDiagnostic.humanReviewedSamples += 1;
        if (!sample.humanInspectionLabel) ignoredReasons.push('missing_reviewed_label');
        const status = ledgerStatus(sample.humanInspectionLabel);
        if (sample.humanInspectionLabel && !status) {
          ignoredReasons.push('unsupported_model_candidate_label');
          ignoredReasons.push('legacy_reviewed_format');
          ignoredLegacyReviewedSamples += 1;
        }
        if (!sample.agentAssessment) ignoredReasons.push('no_agentAssessment');
        if (!sample.reviewEvidence) ignoredReasons.push('no_reviewEvidence');
        if (!sample.reviewEvidence?.chartPngPath && !sample.reviewEvidence?.chartReportPath) ignoredReasons.push('missing_chart_report_evidence');
        if (!sample.estimatedGrossContractPnl) ignoredReasons.push('no_estimatedGrossContractPnl');
        if (ignoredReasons.length && !status) {
          fileDiagnostic.ignoredSamples.push(ignoredSampleDiagnostic(sample, ignoredReasons));
          for (const reason of ignoredReasons) addIgnoredReason(diagnostics.ignoredSamplesByReason, reason);
          continue;
        }
        if (!status) {
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
        fileDiagnostic.acceptedModelCandidateSamples += 1;
        diagnostics.acceptedModelCandidateSamples += 1;
      }
      diagnostics.files.push(fileDiagnostic);
    } catch (error) {
      diagnostics.reviewedFilesMalformed += 1;
      fileDiagnostic.status = 'malformed';
      fileDiagnostic.notes.push(error instanceof Error ? error.message : String(error));
      diagnostics.files.push(fileDiagnostic);
      warnings.push(`Reviewed pack skipped: ${file}; ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  diagnostics.ignoredReviewedSamples = diagnostics.files.reduce((total, file) => total + file.ignoredSamples.length, 0);
  diagnostics.note = files.length
    ? 'Reviewed artifact diagnostics explain the difference between all human-reviewed samples and model-candidate ledger-eligible samples.'
    : diagnostics.note;
  return { entries: entries.sort((left, right) => `${left.date} ${left.time || ''} ${left.sampleId}`.localeCompare(`${right.date} ${right.time || ''} ${right.sampleId}`)), ignoredLegacyReviewedSamples, diagnostics };
}

function sampleReviewLabel(sample: ResearchReviewSample): string {
  return sample.humanInspectionLabel || sample.finalReviewLabel || 'human_reviewed_unlabeled';
}

function agentAssessmentSummaryForSamples(samples: ResearchReviewSample[]): PreCandidateWatchlistReport['concepts'][number]['agentAssessmentSummary'] {
  return {
    agreesWithHuman: samples.filter((sample) => sample.agentAssessment?.status === 'agrees_with_human').length,
    partiallyAgreesWithHuman: samples.filter((sample) => sample.agentAssessment?.status === 'partially_agrees_with_human').length,
    disagreesWithHuman: samples.filter((sample) => sample.agentAssessment?.status === 'disagrees_with_human').length,
    unclearInsufficientEvidence: samples.filter((sample) => sample.agentAssessment?.status === 'unclear_insufficient_evidence' || !sample.agentAssessment).length,
  };
}

function reviewEvidenceSummaryForSamples(samples: ResearchReviewSample[]): PreCandidateWatchlistReport['concepts'][number]['chartEvidenceSummary'] {
  return {
    samplesWithChartEvidence: samples.filter((sample) => sample.reviewEvidence?.chartAvailable || sample.reviewEvidence?.chartPngPath || sample.reviewEvidence?.chartReportPath).length,
    samplesWithExactPngPath: samples.filter((sample) => Boolean(sample.reviewEvidence?.chartPngPath)).length,
    samplesWithExactReportPath: samples.filter((sample) => Boolean(sample.reviewEvidence?.chartReportPath)).length,
    samplesMissingCharts: samples.filter((sample) =>
      sample.reviewEvidence?.evidenceStatus === 'chart_missing' ||
      (
        sample.reviewEvidence?.chartAvailable === false &&
        sample.reviewEvidence.evidenceStatus !== 'chart_withheld' &&
        sample.reviewEvidence.evidenceStatus !== 'chart_unknown'
      )
    ).length,
    samplesWithUnknownCharts: samples.filter((sample) => !sample.reviewEvidence || sample.reviewEvidence.evidenceStatus === 'chart_unknown').length,
    samplesWithWithheldCharts: samples.filter((sample) => sample.reviewEvidence?.chartWithheld || sample.reviewEvidence?.evidenceStatus === 'chart_withheld').length,
  };
}

function summarizeWatchlistEstimatedGrossContractPnl(samples: ResearchReviewSample[], symbol: Instrument): PreCandidateWatchlistReport['concepts'][number]['estimatedGrossContractPnlSummary'] {
  const pnlRows = samples
    .map((sample) => coerceEstimatedGrossContractPnl(sample.estimatedGrossContractPnl))
    .filter((pnl): pnl is EstimatedGrossContractPnl => Boolean(pnl));
  if (!pnlRows.length) {
    return {
      rootSymbol: FUTURES_CONTRACT_METADATA[symbol].rootSymbol,
      sampleCountWithPnl: 0,
      sampleCountMissingPnl: samples.length,
      status: 'unavailable',
    };
  }
  const knownRows = pnlRows.filter((pnl) => pnl.rootSymbol !== 'UNKNOWN');
  if (!knownRows.length) {
    return {
      rootSymbol: 'UNKNOWN',
      sampleCountWithPnl: 0,
      sampleCountMissingPnl: samples.length,
      status: 'unavailable_unknown_contract',
    };
  }
  const hypothetical = knownRows.map((pnl) => pnl.hypotheticalOutcomeDollars).filter(finite);
  const mfe = knownRows.map((pnl) => pnl.mfeDollars).filter(finite);
  const mae = knownRows.map((pnl) => pnl.maeDollars).filter(finite);
  const sampleCountWithPnl = knownRows.filter((pnl) =>
    finite(pnl.hypotheticalOutcomeDollars) ||
    finite(pnl.mfeDollars) ||
    finite(pnl.maeDollars)
  ).length;
  const allSamplesHaveHypothetical = samples.length > 0 && hypothetical.length === samples.length;
  return {
    rootSymbol: knownRows[0]?.rootSymbol || FUTURES_CONTRACT_METADATA[symbol].rootSymbol,
    sampleCountWithPnl,
    sampleCountMissingPnl: Math.max(0, samples.length - sampleCountWithPnl),
    ...(avg(hypothetical) !== undefined ? { avgHypotheticalOutcomeDollars: avg(hypothetical) } : {}),
    ...(avg(mfe) !== undefined ? { avgMfeDollars: avg(mfe) } : {}),
    ...(avg(mae) !== undefined ? { avgMaeDollars: avg(mae) } : {}),
    status: sampleCountWithPnl === 0
      ? 'unavailable'
      : allSamplesHaveHypothetical
        ? 'available'
        : 'partial',
  };
}

function nextHumanActionForWatchlistSample(sample: ResearchReviewSample): PreCandidateWatchlistSample['nextHumanAction'] {
  const label = sampleReviewLabel(sample);
  const metadata = getHumanReviewLabelMetadata(label);
  const evidenceStatus = sample.reviewEvidence?.evidenceStatus;
  if (
    !sample.reviewEvidence ||
    evidenceStatus === 'chart_missing' ||
    evidenceStatus === 'chart_unknown' ||
    evidenceStatus === 'chart_withheld' ||
    (!sample.reviewEvidence.chartPngPath && !sample.reviewEvidence.chartReportPath)
  ) return 'review_chart';
  if (metadata.suggestedNextAction === 'decide_formal_candidate_label') return 'decide_candidate_label';
  if (metadata.category === 'reject_or_deprioritize') return 'reject_or_deprioritize';
  if (metadata.suggestedNextAction === 'continue_observing') return 'keep_advisory';
  if (metadata.suggestedNextAction === 'add_context_or_collect_more_samples') return 'collect_more_samples';
  return 'collect_more_samples';
}

function buildWatchlistRecommendation(args: {
  samples: ResearchReviewSample[];
  labels: Record<string, number>;
  agentAssessmentSummary: PreCandidateWatchlistReport['concepts'][number]['agentAssessmentSummary'];
  chartEvidenceSummary: PreCandidateWatchlistReport['concepts'][number]['chartEvidenceSummary'];
}): PreCandidateWatchlistReport['concepts'][number]['watchlistRecommendation'] {
  const { samples, labels, agentAssessmentSummary, chartEvidenceSummary } = args;
  const reasons: string[] = [];
  let status: PreCandidateWatchlistReport['concepts'][number]['watchlistRecommendation']['status'] = 'collect_more_evidence';

  if (chartEvidenceSummary.samplesMissingCharts > 0 || chartEvidenceSummary.samplesWithUnknownCharts > 0 || chartEvidenceSummary.samplesWithWithheldCharts > 0) {
    status = 'needs_more_chart_evidence';
    reasons.push('Chart/report evidence is missing, unknown, or withheld for at least one watchlist sample.');
  } else if (Object.keys(labels).some((label) => getHumanReviewLabelMetadata(label).suggestedNextAction === 'decide_formal_candidate_label')) {
    status = 'ready_for_human_candidate_label_review';
    reasons.push('Human label suggests candidate interest, but it is not one of the two formal model-candidate ledger labels.');
  } else if (Object.keys(labels).every((label) => getHumanReviewLabelMetadata(label).suggestedNextAction === 'continue_observing')) {
    status = 'keep_advisory';
    reasons.push('Human labels currently keep this concept advisory-only.');
  } else if (Object.keys(labels).some((label) => getHumanReviewLabelMetadata(label).category === 'reject_or_deprioritize')) {
    status = 'reject_or_deprioritize';
    reasons.push('Human label suggests rejection or deprioritization.');
  }

  if (agentAssessmentSummary.disagreesWithHuman > 0) reasons.push('Agent assessment disagrees with the human review on at least one sample; collect more evidence before any formal label change.');
  if (agentAssessmentSummary.unclearInsufficientEvidence > 0) reasons.push('Agent assessment is unclear or insufficient for at least one sample.');
  if (samples.some((sample) => coerceEstimatedGrossContractPnl(sample.estimatedGrossContractPnl))) {
    reasons.push('Estimated gross contract P/L is included as research context only and does not move samples into the formal ledger.');
  }
  if (!reasons.length) reasons.push('Keep collecting evidence before any formal model-candidate label decision.');

  return {
    status,
    reason: [...new Set(reasons)],
    boundary: 'research_only_not_execution_authority',
  };
}

async function buildPreCandidateWatchlistReport(options: ModelCandidateLedgerOptions, generatedAt: string, paths: ModelCandidateReviewLedger['outputPaths']): Promise<PreCandidateWatchlistReport> {
  const files = await listFiles(options.reviewPackDir, (name) => /^research-sample-review-.*\.reviewed\.json$/i.test(name));
  const watchlistSamples: Array<{ sample: ResearchReviewSample; reviewedFile: string }> = [];
  let humanReviewedSamples = 0;
  let formalLedgerEligibleSamples = 0;
  for (const file of files) {
    try {
      const parsed = await readJsonFile<unknown>(file);
      if (!isReviewPack(parsed) || parsed.instrument !== options.symbol) continue;
      for (const sample of parsed.samples) {
        if (!inDateRange(sample.date, options.from, options.to) || !hasHumanReview(sample)) continue;
        humanReviewedSamples += 1;
        if (ledgerStatus(sample.humanInspectionLabel)) {
          formalLedgerEligibleSamples += 1;
          continue;
        }
        watchlistSamples.push({ sample, reviewedFile: file });
      }
    } catch {
      continue;
    }
  }

  const byConcept = new Map<string, Array<{ sample: ResearchReviewSample; reviewedFile: string }>>();
  for (const row of watchlistSamples) {
    const list = byConcept.get(row.sample.concept) || [];
    list.push(row);
    byConcept.set(row.sample.concept, list);
  }

  const concepts: PreCandidateWatchlistReport['concepts'] = [...byConcept.entries()].map(([concept, rows]) => {
    const samples = rows.map((row) => row.sample);
    const labels: Record<string, number> = {};
    for (const sample of samples) increment(labels, sampleReviewLabel(sample));
    const agentAssessmentSummary = agentAssessmentSummaryForSamples(samples);
    const chartEvidenceSummary = reviewEvidenceSummaryForSamples(samples);
    const estimatedGrossContractPnlSummary = summarizeWatchlistEstimatedGrossContractPnl(samples, options.symbol);
    return {
      concept,
      conceptTitle: samples[0]?.conceptTitle || concept,
      watchlistSampleCount: samples.length,
      labels,
      agentAssessmentSummary,
      chartEvidenceSummary,
      estimatedGrossContractPnlSummary,
      watchlistRecommendation: buildWatchlistRecommendation({ samples, labels, agentAssessmentSummary, chartEvidenceSummary }),
      samples: rows.map(({ sample, reviewedFile }) => {
        const pnl = coerceEstimatedGrossContractPnl(sample.estimatedGrossContractPnl);
        const label = sampleReviewLabel(sample);
        const labelMetadata = getHumanReviewLabelMetadata(label);
        return {
          sampleId: sample.sampleId,
          reviewedFile,
          concept: sample.concept,
          label,
          labelDisplayName: labelMetadata.displayName,
          labelCategory: labelMetadata.category,
          countsTowardCandidateGates: labelMetadata.countsTowardCandidateGates,
          agentAssessmentStatus: sample.agentAssessment?.status,
          chartEvidenceStatus: sample.reviewEvidence?.evidenceStatus,
          chartPngPath: sample.reviewEvidence?.chartPngPath,
          chartReportPath: sample.reviewEvidence?.chartReportPath,
          ...(pnl ? { estimatedGrossContractPnl: pnl } : {}),
          nextHumanAction: nextHumanActionForWatchlistSample(sample),
        };
      }),
    };
  }).sort((left, right) => right.watchlistSampleCount - left.watchlistSampleCount || left.concept.localeCompare(right.concept));

  const report: PreCandidateWatchlistReport = {
    reportType: 'pre_candidate_watchlist',
    symbol: options.symbol,
    from: options.from,
    to: options.to,
    generatedAt,
    boundary: 'research_only_not_execution_authority',
    summary: {
      humanReviewedSamples,
      formalLedgerEligibleSamples,
      watchlistSamples: watchlistSamples.length,
      advisoryOnlySamples: watchlistSamples.filter(({ sample }) => getHumanReviewLabelMetadata(sampleReviewLabel(sample)).category === 'advisory').length,
      rejectedOrDeprioritizedSamples: watchlistSamples.filter(({ sample }) => getHumanReviewLabelMetadata(sampleReviewLabel(sample)).category === 'reject_or_deprioritize').length,
      samplesWithAgentAssessment: watchlistSamples.filter(({ sample }) => Boolean(sample.agentAssessment)).length,
      samplesWithChartEvidence: watchlistSamples.filter(({ sample }) => sample.reviewEvidence?.chartAvailable || sample.reviewEvidence?.chartPngPath || sample.reviewEvidence?.chartReportPath).length,
      samplesWithEstimatedGrossContractPnl: watchlistSamples.filter(({ sample }) => Boolean(coerceEstimatedGrossContractPnl(sample.estimatedGrossContractPnl))).length,
    },
    concepts,
    ignoredFormalLedgerReason: 'Watchlist/advisory samples are human-reviewed but do not use approved_for_future_model_candidate_review or not_approved_for_future_model_candidate_review. Only those two formal model-candidate labels count toward formal gates. Advisory/watchlist labels do not count unless a human later applies a formal model-candidate label.',
    outputPaths: {
      jsonPath: paths.watchlistJsonPath || path.join(path.resolve(options.outDir), 'model-candidate-watchlist.json'),
      markdownPath: paths.watchlistMarkdownPath || path.join(path.resolve(options.outDir), 'model-candidate-watchlist.md'),
      ...(paths.rangeWatchlistJsonPath && paths.rangeWatchlistMarkdownPath ? {
        rangeJsonPath: paths.rangeWatchlistJsonPath,
        rangeMarkdownPath: paths.rangeWatchlistMarkdownPath,
      } : {}),
    },
  };
  assertNoExecutableLedgerFields(report);
  return report;
}

export function renderModelCandidateLedgerMarkdown(ledger: ModelCandidateReviewLedger): string {
  const pnl = ledger.estimatedGrossContractPnlSummary || summarizeEstimatedGrossContractPnl(ledger.entries, ledger.symbol);
  return [
    `# Model Candidate Review Ledger - ${ledger.symbol}`,
    '',
    `Date range: ${ledger.from} to ${ledger.to}`,
    `Generated at: ${ledger.generatedAt}`,
    `Fixed/current JSON: ${ledger.outputPaths.jsonPath}`,
    `Fixed/current Markdown: ${ledger.outputPaths.markdownPath}`,
    ...(ledger.outputPaths.rangeJsonPath && ledger.outputPaths.rangeMarkdownPath ? [
      `Range-stamped JSON: ${ledger.outputPaths.rangeJsonPath}`,
      `Range-stamped Markdown: ${ledger.outputPaths.rangeMarkdownPath}`,
    ] : ['Range-stamped output: not written for this run']),
    '',
    SAFETY_MESSAGE,
    FINAL_DECISION_MESSAGE,
    '',
    '## Summary',
    `- Reviewed samples found: ${ledger.summary.reviewedSamplesFound}`,
    `- Human-reviewed samples found: ${ledger.summary.humanReviewedSamplesFound}`,
    `- Reviewed files found: ${ledger.summary.reviewedFilesFound}`,
    `- Reviewed files read: ${ledger.summary.reviewedFilesRead}`,
    `- Ignored reviewed samples: ${ledger.summary.ignoredReviewedSamples}`,
    `- Human approved: ${ledger.summary.approvedCount}`,
    `- Human not approved: ${ledger.summary.notApprovedCount}`,
    `- Ignored legacy reviewed samples: ${ledger.summary.ignoredLegacyReviewedSamples}`,
    `- Concepts reviewed: ${ledger.summary.conceptsReviewed}`,
    `- Candidate review recommended concepts: ${ledger.summary.candidateReviewRecommendedConcepts}`,
    `- Minimum reviewed samples: ${ledger.thresholds.minimumReviewedSamples}`,
    `- Minimum approval rate: ${Math.round(ledger.thresholds.minimumApprovalRate * 100)}%`,
    '- Formal ledger labels: approved_for_future_model_candidate_review; not_approved_for_future_model_candidate_review',
    '- Advisory/watchlist labels are excluded from formal gates and tracked separately in the Pre-Candidate Watchlist Report.',
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
        '',
        ...renderResearchRecommendationMarkdown(summary.modelCandidateResearchRecommendation),
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
    '',
    ...renderReviewedArtifactDiagnosticsMarkdown(ledger.reviewedArtifactDiagnostics),
  ].join('\n');
}

function formatWatchlistPnl(summary: PreCandidateWatchlistReport['concepts'][number]['estimatedGrossContractPnlSummary']): string {
  if (!summary) return 'Not recorded';
  return [
    summary.rootSymbol,
    `samples with P/L ${summary.sampleCountWithPnl}`,
    `missing ${summary.sampleCountMissingPnl}`,
    `avg hypothetical ${formatLedgerDollars(summary.avgHypotheticalOutcomeDollars)}`,
    `avg MFE ${formatLedgerDollars(summary.avgMfeDollars)}`,
    `avg MAE ${formatLedgerDollars(summary.avgMaeDollars)}`,
    `status ${summary.status}`,
    'research-only context',
  ].join('; ');
}

function samplePnlCell(pnl: EstimatedGrossContractPnl | undefined): string {
  if (!pnl || pnl.rootSymbol === 'UNKNOWN') return 'Not recorded';
  if (finite(pnl.hypotheticalOutcomeDollars)) return `${pnl.rootSymbol} ${formatLedgerDollars(pnl.hypotheticalOutcomeDollars)}`;
  if (finite(pnl.mfeDollars) || finite(pnl.maeDollars)) return `${pnl.rootSymbol} partial; MFE ${formatLedgerDollars(pnl.mfeDollars)}; MAE ${formatLedgerDollars(pnl.maeDollars)}`;
  return `${pnl.rootSymbol} ${pnl.status}`;
}

function missingBacktestDefinitions(): ModelCandidateBacktestHandoff['concepts'][number]['backtestReadiness']['requiredBacktestDefinitions'] {
  return {
    entryModel: 'missing',
    exitModel: 'missing',
    stopModel: 'missing',
    targetModel: 'missing',
    fillAssumption: 'missing',
    commissionAssumption: 'missing',
    slippageAssumption: 'missing',
    positionSizing: 'missing',
    sessionFilter: 'missing',
  };
}

function determineBacktestReadiness(args: {
  recommendation: ModelCandidateResearchRecommendation;
  evidence: ModelCandidateAdvisoryEvidence;
  watchlistOnly: boolean;
}): ModelCandidateBacktestHandoff['concepts'][number]['backtestReadiness'] {
  const { recommendation, evidence, watchlistOnly } = args;
  const definitions = missingBacktestDefinitions();
  const reasons: string[] = [];

  if (watchlistOnly) {
    reasons.push('Concept is currently watchlist/advisory only and does not have formal model-candidate ledger evidence.');
    reasons.push('A human must apply a formal model-candidate label before this can move toward formal backtest review.');
    return {
      status: 'watchlist_only',
      reasons,
      requiredBacktestDefinitions: definitions,
      nextHumanAction: 'keep_on_watchlist',
    };
  }

  if (recommendation.status === 'reject_or_deprioritize') {
    reasons.push('Research recommendation is reject or deprioritize.');
    return {
      status: 'reject_or_deprioritize',
      reasons,
      requiredBacktestDefinitions: definitions,
      nextHumanAction: 'reject_or_deprioritize',
    };
  }

  const chart = evidence.reviewEvidenceSummary;
  const hasChartBlock = chart.samplesMissingCharts > 0 || chart.samplesWithUnknownCharts > 0 || chart.samplesWithWithheldCharts > 0 || recommendation.gateResults.chartEvidenceGate === 'fail';
  if (hasChartBlock) {
    reasons.push('Chart/report evidence is missing, unknown, or withheld.');
    reasons.push('Resolve chart/report evidence before formal backtest review.');
    return {
      status: 'blocked_by_missing_evidence',
      reasons: [...new Set([...reasons, ...recommendation.reasons])],
      requiredBacktestDefinitions: definitions,
      nextHumanAction: 'resolve_missing_chart_evidence',
    };
  }

  if (evidence.adverseFirstContradictionCount > 0 || recommendation.gateResults.adverseFirstGate === 'fail') {
    reasons.push('Adverse-first contradictions must be resolved before formal backtest review.');
    return {
      status: 'not_ready_collect_more_evidence',
      reasons: [...new Set([...reasons, ...recommendation.reasons])],
      requiredBacktestDefinitions: definitions,
      nextHumanAction: 'resolve_adverse_contradictions',
    };
  }

  if (evidence.missingDataWarningCount > 0 || recommendation.gateResults.missingDataGate === 'fail') {
    reasons.push('Missing-data warnings must be resolved before formal backtest review.');
    return {
      status: 'blocked_by_missing_evidence',
      reasons: [...new Set([...reasons, ...recommendation.reasons])],
      requiredBacktestDefinitions: definitions,
      nextHumanAction: 'define_backtest_assumptions',
    };
  }

  if (recommendation.gateResults.sampleCountGate === 'fail') {
    reasons.push('Reviewed sample count is below the minimum formal evidence threshold.');
    return {
      status: 'not_ready_collect_more_evidence',
      reasons: [...new Set([...reasons, ...recommendation.reasons])],
      requiredBacktestDefinitions: definitions,
      nextHumanAction: 'collect_more_reviewed_samples',
    };
  }

  if (recommendation.status === 'candidate_review_recommended') {
    reasons.push('Formal model-candidate recommendation gates have passed.');
    reasons.push('Required true-backtest assumptions still need human definition before a true backtest can be run.');
    return {
      status: 'ready_for_formal_backtest_review',
      reasons: [...new Set([...reasons, ...recommendation.reasons])],
      requiredBacktestDefinitions: definitions,
      nextHumanAction: 'define_backtest_assumptions',
    };
  }

  reasons.push('Research recommendation has not reached formal backtest review readiness.');
  return {
    status: 'not_ready_collect_more_evidence',
    reasons: [...new Set([...reasons, ...recommendation.reasons])],
    requiredBacktestDefinitions: definitions,
    nextHumanAction: recommendation.status === 'watchlist_candidate' ? 'keep_on_watchlist' : 'collect_more_reviewed_samples',
  };
}

function buildBacktestHandoffConceptFromSummary(
  summary: ModelCandidateConceptSummary,
  entries: ModelCandidateLedgerEntry[],
): ModelCandidateBacktestHandoff['concepts'][number] {
  const evidence = summary.modelCandidateAdvisoryEvidence;
  const recommendation = summary.modelCandidateResearchRecommendation;
  return {
    concept: summary.concept,
    conceptTitle: summary.conceptTitle,
    researchRecommendation: {
      status: recommendation.status,
      recommendationText: recommendation.recommendationText,
      humanFinalDecisionRequired: true,
      boundary: 'research_only_not_execution_authority',
    },
    gateResults: recommendation.gateResults,
    evidenceSummary: {
      reviewedSamples: summary.totalSamplesReviewed,
      formalLedgerEligibleSamples: summary.totalSamplesReviewed,
      humanApprovedCount: summary.humanApprovedCount,
      humanNotApprovedCount: summary.humanNotApprovedCount,
      ...(summary.approvalRate === null ? {} : { humanApprovalRate: summary.approvalRate }),
      agentAssessmentSummary: evidence.agentAssessmentSummary,
      chartEvidenceSummary: evidence.reviewEvidenceSummary,
      estimatedGrossContractPnlSummary: evidence.estimatedGrossContractPnlSummary,
      adverseFirstContradictionCount: evidence.adverseFirstContradictionCount,
      missingDataWarningCount: evidence.missingDataWarningCount,
    },
    contextSamples: entries.map((entry) => ({
      sampleId: entry.sampleId,
      reviewedFile: entry.reviewedOutputPath,
      humanLabel: entry.humanApprovalState,
      ...(entry.agentAssessmentStatus ? { agentAssessmentStatus: entry.agentAssessmentStatus } : {}),
      ...(entry.reviewEvidence?.chartReportPath ? { chartReportPath: entry.reviewEvidence.chartReportPath } : {}),
      ...(entry.reviewEvidence?.chartPngPath || entry.chartArtifactPath ? { chartPngPath: entry.reviewEvidence?.chartPngPath || entry.chartArtifactPath || undefined } : {}),
      ...(entry.estimatedGrossContractPnl ? { estimatedGrossContractPnl: entry.estimatedGrossContractPnl } : {}),
      outcomeSummary: entry.outcomeMathSummary,
    })),
    backtestReadiness: determineBacktestReadiness({
      recommendation,
      evidence,
      watchlistOnly: false,
    }),
  };
}

function buildBacktestHandoffConceptFromWatchlist(
  concept: PreCandidateWatchlistReport['concepts'][number],
): ModelCandidateBacktestHandoff['concepts'][number] {
  const evidence: ModelCandidateAdvisoryEvidence = {
    sampleCount: 0,
    humanApprovedCount: 0,
    humanNotApprovedCount: 0,
    agentAssessmentSummary: concept.agentAssessmentSummary,
    reviewEvidenceSummary: concept.chartEvidenceSummary,
    estimatedGrossContractPnlSummary: concept.estimatedGrossContractPnlSummary,
    missingDataWarningCount: 0,
    adverseFirstContradictionCount: 0,
    boundary: 'research_only_not_execution_authority',
  };
  const recommendation: ModelCandidateResearchRecommendation = {
    status: 'watchlist_candidate',
    recommendationText: 'Watchlist candidate.',
    gateResults: {
      sampleCountGate: 'fail',
      humanApprovalRateGate: 'not_applicable',
      missingDataGate: 'pass',
      adverseFirstGate: 'pass',
      chartEvidenceGate: concept.chartEvidenceSummary.samplesMissingCharts > 0 || concept.chartEvidenceSummary.samplesWithUnknownCharts > 0 || concept.chartEvidenceSummary.samplesWithWithheldCharts > 0 ? 'fail' : 'partial',
      agentAssessmentGate: concept.agentAssessmentSummary.disagreesWithHuman > 0 ? 'partial' : 'pass',
      pnlSupportSignal: concept.estimatedGrossContractPnlSummary?.status === 'partial' ? 'partial' : concept.estimatedGrossContractPnlSummary ? 'supportive' : 'unavailable',
    },
    reasons: [
      'Concept is present only in the pre-candidate watchlist.',
      'Watchlist/advisory labels do not count toward formal model-candidate gates.',
    ],
    humanFinalDecisionRequired: true,
    boundary: 'research_only_not_execution_authority',
  };
  return {
    concept: concept.concept,
    conceptTitle: concept.conceptTitle,
    researchRecommendation: {
      status: recommendation.status,
      recommendationText: recommendation.recommendationText,
      humanFinalDecisionRequired: true,
      boundary: 'research_only_not_execution_authority',
    },
    gateResults: recommendation.gateResults,
    evidenceSummary: {
      reviewedSamples: 0,
      formalLedgerEligibleSamples: 0,
      humanApprovedCount: 0,
      humanNotApprovedCount: 0,
      agentAssessmentSummary: concept.agentAssessmentSummary,
      chartEvidenceSummary: concept.chartEvidenceSummary,
      estimatedGrossContractPnlSummary: concept.estimatedGrossContractPnlSummary,
      adverseFirstContradictionCount: 0,
      missingDataWarningCount: 0,
    },
    contextSamples: [],
    watchlistSamples: concept.samples.map((sample) => ({
      sampleId: sample.sampleId,
      label: sample.label,
      reason: concept.watchlistRecommendation.reason,
      nextHumanAction: sample.nextHumanAction,
    })),
    backtestReadiness: determineBacktestReadiness({
      recommendation,
      evidence,
      watchlistOnly: true,
    }),
  };
}

export function buildModelCandidateBacktestHandoff(
  ledger: ModelCandidateReviewLedger,
  watchlist: PreCandidateWatchlistReport,
): ModelCandidateBacktestHandoff {
  const entriesByConcept = new Map<string, ModelCandidateLedgerEntry[]>();
  for (const entry of ledger.entries) {
    const list = entriesByConcept.get(entry.concept) || [];
    list.push(entry);
    entriesByConcept.set(entry.concept, list);
  }
  const concepts = ledger.conceptSummaries.map((summary) =>
    buildBacktestHandoffConceptFromSummary(summary, entriesByConcept.get(summary.concept) || []));
  const formalConcepts = new Set(concepts.map((concept) => concept.concept));
  for (const watchlistConcept of watchlist.concepts) {
    if (!formalConcepts.has(watchlistConcept.concept)) {
      concepts.push(buildBacktestHandoffConceptFromWatchlist(watchlistConcept));
    }
  }
  const report: ModelCandidateBacktestHandoff = {
    reportType: 'model_candidate_backtest_handoff',
    symbol: ledger.symbol,
    from: ledger.from,
    to: ledger.to,
    generatedAt: ledger.generatedAt,
    boundary: 'research_only_not_execution_authority',
    summary: {
      conceptCount: concepts.length,
      candidateReviewRecommendedCount: concepts.filter((concept) => concept.researchRecommendation.status === 'candidate_review_recommended').length,
      watchlistCount: concepts.filter((concept) => concept.backtestReadiness.status === 'watchlist_only' || concept.researchRecommendation.status === 'watchlist_candidate').length,
      keepCollectingEvidenceCount: concepts.filter((concept) => concept.researchRecommendation.status === 'keep_collecting_evidence').length,
      doNotAdvanceCount: concepts.filter((concept) => concept.researchRecommendation.status === 'do_not_advance').length,
      rejectedOrDeprioritizedCount: concepts.filter((concept) => concept.researchRecommendation.status === 'reject_or_deprioritize').length,
    },
    concepts: concepts.sort((left, right) => {
      const rank = (status: ModelCandidateBacktestHandoff['concepts'][number]['backtestReadiness']['status']) => ({
        ready_for_formal_backtest_review: 0,
        not_ready_collect_more_evidence: 1,
        blocked_by_missing_evidence: 2,
        watchlist_only: 3,
        reject_or_deprioritize: 4,
      })[status];
      return rank(left.backtestReadiness.status) - rank(right.backtestReadiness.status) || left.concept.localeCompare(right.concept);
    }),
    outputPaths: {
      jsonPath: ledger.outputPaths.backtestHandoffJsonPath || path.join(path.dirname(ledger.outputPaths.jsonPath), 'model-candidate-backtest-handoff.json'),
      markdownPath: ledger.outputPaths.backtestHandoffMarkdownPath || path.join(path.dirname(ledger.outputPaths.markdownPath), 'model-candidate-backtest-handoff.md'),
      ...(ledger.outputPaths.rangeBacktestHandoffJsonPath && ledger.outputPaths.rangeBacktestHandoffMarkdownPath ? {
        rangeJsonPath: ledger.outputPaths.rangeBacktestHandoffJsonPath,
        rangeMarkdownPath: ledger.outputPaths.rangeBacktestHandoffMarkdownPath,
      } : {}),
    },
  };
  assertNoExecutableLedgerFields(report);
  return report;
}

function formatJsonSummary(value: unknown): string {
  return JSON.stringify(value);
}

function renderBacktestDefinitions(definitions: ModelCandidateBacktestHandoff['concepts'][number]['backtestReadiness']['requiredBacktestDefinitions']): string[] {
  const rows = [
    ['Entry Model', definitions.entryModel],
    ['Exit Model', definitions.exitModel],
    ['Stop Model', definitions.stopModel],
    ['Target Model', definitions.targetModel],
    ['Fill Assumption', definitions.fillAssumption],
    ['Commission Assumption', definitions.commissionAssumption],
    ['Slippage Assumption', definitions.slippageAssumption],
    ['Position Sizing', definitions.positionSizing],
    ['Session Filter', definitions.sessionFilter],
  ];
  return [
    '| Definition | Status |',
    '|---|---|',
    ...rows.map(([definition, status]) => `| ${definition} | ${status} |`),
  ];
}

export function renderModelCandidateBacktestHandoffMarkdown(report: ModelCandidateBacktestHandoff): string {
  return [
    '# Model-Candidate Backtest Handoff',
    '',
    `Symbol: ${report.symbol}`,
    `Date range: ${report.from} to ${report.to}`,
    `Generated at: ${report.generatedAt}`,
    `Boundary: ${report.boundary}`,
    '',
    'This report is a research-only handoff package. It does not approve models for live use, does not approve trading, and does not activate execution.',
    '',
    '## Summary',
    `- Concepts reviewed: ${report.summary.conceptCount}`,
    `- Ready for formal backtest review: ${report.concepts.filter((concept) => concept.backtestReadiness.status === 'ready_for_formal_backtest_review').length}`,
    `- Watchlist only: ${report.concepts.filter((concept) => concept.backtestReadiness.status === 'watchlist_only').length}`,
    `- Keep collecting evidence: ${report.summary.keepCollectingEvidenceCount}`,
    `- Do not advance: ${report.summary.doNotAdvanceCount}`,
    `- Reject/deprioritize: ${report.summary.rejectedOrDeprioritizedCount}`,
    '',
    ...report.concepts.map((concept) => [
      `## Concept: ${concept.conceptTitle || concept.concept}`,
      '',
      '### Research Recommendation',
      `- Status: ${concept.researchRecommendation.status}`,
      `- Recommendation: ${concept.researchRecommendation.recommendationText}`,
      `- Human Final Decision Required: ${concept.researchRecommendation.humanFinalDecisionRequired ? 'Yes' : 'No'}`,
      `- Boundary: ${concept.researchRecommendation.boundary}`,
      '',
      '### Gate Results',
      `- Sample Count: ${concept.gateResults.sampleCountGate}`,
      `- Human Approval Rate: ${concept.gateResults.humanApprovalRateGate}`,
      `- Missing Data: ${concept.gateResults.missingDataGate}`,
      `- Adverse-First: ${concept.gateResults.adverseFirstGate}`,
      `- Chart Evidence: ${concept.gateResults.chartEvidenceGate}`,
      `- Agent Assessment: ${concept.gateResults.agentAssessmentGate}`,
      `- P/L Support: ${concept.gateResults.pnlSupportSignal}`,
      '',
      '### Evidence Summary',
      `- Reviewed Samples: ${concept.evidenceSummary.reviewedSamples}`,
      `- Formal Ledger-Eligible Samples: ${concept.evidenceSummary.formalLedgerEligibleSamples}`,
      `- Human Approved: ${concept.evidenceSummary.humanApprovedCount}`,
      `- Human Not Approved: ${concept.evidenceSummary.humanNotApprovedCount}`,
      `- Human Approval Rate: ${formatApprovalRate(concept.evidenceSummary.humanApprovalRate ?? null)}`,
      `- Agent Assessment Summary: ${formatJsonSummary(concept.evidenceSummary.agentAssessmentSummary)}`,
      `- Chart/Report Evidence: ${formatJsonSummary(concept.evidenceSummary.chartEvidenceSummary)}`,
      `- Estimated Gross Contract P/L: ${formatWatchlistPnl(concept.evidenceSummary.estimatedGrossContractPnlSummary)}`,
      `- Missing Data Warnings: ${concept.evidenceSummary.missingDataWarningCount}`,
      `- Adverse-First Contradictions: ${concept.evidenceSummary.adverseFirstContradictionCount}`,
      '',
      '### Backtest Readiness',
      `- Status: ${concept.backtestReadiness.status}`,
      '- Reasons:',
      ...(concept.backtestReadiness.reasons.length ? concept.backtestReadiness.reasons.map((reason) => `  - ${reason}`) : ['  - None recorded.']),
      `- Next Human Action: ${concept.backtestReadiness.nextHumanAction}`,
      '',
      '### Required Backtest Definitions',
      ...renderBacktestDefinitions(concept.backtestReadiness.requiredBacktestDefinitions),
      '',
      '### Context Samples',
      '| Sample ID | Human Label | Agent Assessment | Chart Report | Estimated Gross P/L |',
      '|---|---|---|---|---|',
      ...(concept.contextSamples.length
        ? concept.contextSamples.map((sample) => `| ${sample.sampleId} | ${sample.humanLabel} | ${sample.agentAssessmentStatus || 'Not recorded'} | ${sample.chartReportPath || 'Not recorded'} | ${samplePnlCell(sample.estimatedGrossContractPnl)} |`)
        : ['| Not recorded | Not recorded | Not recorded | Not recorded | Not recorded |']),
      ...(concept.watchlistSamples?.length ? [
        '',
        '### Watchlist Samples',
        '| Sample ID | Label | Next Human Action |',
        '|---|---|---|',
        ...concept.watchlistSamples.map((sample) => `| ${sample.sampleId} | ${sample.label} | ${sample.nextHumanAction || 'Not recorded'} |`),
      ] : []),
    ].join('\n')),
  ].join('\n');
}

export function renderPreCandidateWatchlistMarkdown(report: PreCandidateWatchlistReport): string {
  return [
    '# Pre-Candidate Watchlist Report',
    '',
    `Symbol: ${report.symbol}`,
    `Date range: ${report.from} to ${report.to}`,
    `Generated at: ${report.generatedAt}`,
    `Boundary: ${report.boundary}`,
    '',
    'This report tracks human-reviewed samples that are not yet formal model-candidate ledger entries. These samples do not count toward candidate-review gates unless a human later applies a formal model-candidate label.',
    '',
    '## Summary',
    `- Human-reviewed samples: ${report.summary.humanReviewedSamples}`,
    `- Formal ledger-eligible samples: ${report.summary.formalLedgerEligibleSamples}`,
    `- Watchlist/advisory samples: ${report.summary.watchlistSamples}`,
    `- Advisory-only samples: ${report.summary.advisoryOnlySamples}`,
    `- Rejected/deprioritized samples: ${report.summary.rejectedOrDeprioritizedSamples}`,
    `- Samples with agent assessment: ${report.summary.samplesWithAgentAssessment}`,
    `- Samples with chart evidence: ${report.summary.samplesWithChartEvidence}`,
    `- Samples with estimated gross contract P/L: ${report.summary.samplesWithEstimatedGrossContractPnl}`,
    `- Formal ledger reason: ${report.ignoredFormalLedgerReason}`,
    '',
    '## Concepts',
    ...(report.concepts.length
      ? report.concepts.map((concept) => [
        `### ${concept.conceptTitle || concept.concept}`,
        `- Concept: ${concept.concept}`,
        `- Watchlist Samples: ${concept.watchlistSampleCount}`,
        `- Labels: ${Object.entries(concept.labels).sort().map(([label, count]) => {
          const metadata = getHumanReviewLabelMetadata(label);
          return `${label}=${count} (${metadata.category}; gates=${metadata.countsTowardCandidateGates ? 'yes' : 'no'}; next=${metadata.suggestedNextAction})`;
        }).join('; ') || 'none'}`,
        `- Agent Assessment Summary: agrees=${concept.agentAssessmentSummary.agreesWithHuman}; partial=${concept.agentAssessmentSummary.partiallyAgreesWithHuman}; disagrees=${concept.agentAssessmentSummary.disagreesWithHuman}; unclear=${concept.agentAssessmentSummary.unclearInsufficientEvidence}`,
        `- Chart/Report Evidence: chart evidence=${concept.chartEvidenceSummary.samplesWithChartEvidence}; exact PNG=${concept.chartEvidenceSummary.samplesWithExactPngPath}; exact report=${concept.chartEvidenceSummary.samplesWithExactReportPath}; missing=${concept.chartEvidenceSummary.samplesMissingCharts}; unknown=${concept.chartEvidenceSummary.samplesWithUnknownCharts}; withheld=${concept.chartEvidenceSummary.samplesWithWithheldCharts}`,
        `- Estimated Gross Contract P/L: ${formatWatchlistPnl(concept.estimatedGrossContractPnlSummary)}`,
        `- Watchlist Recommendation: ${concept.watchlistRecommendation.status}`,
        '- Reason:',
        ...(concept.watchlistRecommendation.reason.length ? concept.watchlistRecommendation.reason.map((reason) => `  - ${reason}`) : ['  - None recorded.']),
        `- Boundary: ${concept.watchlistRecommendation.boundary}`,
        '',
        '## Samples',
        '| Sample ID | Label | Category | Counts Toward Gates | Agent Assessment | Chart Evidence | Estimated Gross P/L | Next Human Action |',
        '|---|---|---|---|---|---|---|---|',
        ...concept.samples.map((sample) => `| ${sample.sampleId} | ${sample.labelDisplayName || sample.label} (${sample.label}) | ${sample.labelCategory || 'unknown'} | ${sample.countsTowardCandidateGates ? 'Yes' : 'No'} | ${sample.agentAssessmentStatus || 'Not recorded'} | ${sample.chartEvidenceStatus || 'Not recorded'} | ${samplePnlCell(sample.estimatedGrossContractPnl)} | ${sample.nextHumanAction} |`),
      ].join('\n'))
      : ['- No pre-candidate watchlist samples found for this range.']),
  ].join('\n');
}

function outputPaths(options: Pick<ModelCandidateLedgerOptions, 'outDir' | 'symbol' | 'from' | 'to' | 'writeRangeArtifact'>): ModelCandidateReviewLedger['outputPaths'] {
  const dir = path.resolve(options.outDir);
  const rangeBase = `model-candidate-review-ledger-${options.symbol}-${options.from}-to-${options.to}`;
  const watchlistRangeBase = `model-candidate-watchlist-${options.symbol}-${options.from}-to-${options.to}`;
  const backtestHandoffRangeBase = `model-candidate-backtest-handoff-${options.symbol}-${options.from}-to-${options.to}`;
  const rangePaths = options.writeRangeArtifact !== false
    ? {
      rangeJsonPath: path.join(dir, `${rangeBase}.json`),
      rangeMarkdownPath: path.join(dir, `${rangeBase}.md`),
      rangeWatchlistJsonPath: path.join(dir, `${watchlistRangeBase}.json`),
      rangeWatchlistMarkdownPath: path.join(dir, `${watchlistRangeBase}.md`),
      rangeBacktestHandoffJsonPath: path.join(dir, `${backtestHandoffRangeBase}.json`),
      rangeBacktestHandoffMarkdownPath: path.join(dir, `${backtestHandoffRangeBase}.md`),
    }
    : {};
  return {
    jsonPath: path.join(dir, 'model-candidate-review-ledger.json'),
    markdownPath: path.join(dir, 'model-candidate-review-ledger.md'),
    watchlistJsonPath: path.join(dir, 'model-candidate-watchlist.json'),
    watchlistMarkdownPath: path.join(dir, 'model-candidate-watchlist.md'),
    backtestHandoffJsonPath: path.join(dir, 'model-candidate-backtest-handoff.json'),
    backtestHandoffMarkdownPath: path.join(dir, 'model-candidate-backtest-handoff.md'),
    ...rangePaths,
  };
}

export async function buildModelCandidateReviewLedger(options: ModelCandidateLedgerOptions): Promise<ModelCandidateReviewLedger> {
  const warnings: string[] = [];
  const outcomes = await loadOutcomeMap(path.resolve(options.outcomeReportDir), options.symbol, options.from, options.to, warnings);
  const chartFiles = await loadChartFiles(path.resolve(options.chartDir));
  const { entries, ignoredLegacyReviewedSamples, diagnostics } = await loadReviewedEntries(options, outcomes, chartFiles, warnings);
  const conceptSummaries = summarizeConcepts(entries, options.thresholds, options.symbol);
  const estimatedGrossContractPnlSummary = summarizeEstimatedGrossContractPnl(entries, options.symbol);
  const paths = outputPaths(options);
  const generatedAt = new Date().toISOString();
  const ledger: ModelCandidateReviewLedger = {
    reportType: 'model_candidate_review_ledger',
    generatedAt,
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
      humanReviewedSamplesFound: diagnostics.humanReviewedSamplesFound,
      reviewedFilesFound: diagnostics.reviewedFilesFound,
      reviewedFilesRead: diagnostics.reviewedFilesRead,
      ignoredReviewedSamples: diagnostics.ignoredReviewedSamples,
      conceptsReviewed: conceptSummaries.length,
      candidateReviewRecommendedConcepts: conceptSummaries.filter((summary) => summary.candidateReadinessStatus === 'candidate_review_recommended').length,
    },
    entries,
    conceptSummaries,
    estimatedGrossContractPnlSummary,
    reviewedArtifactDiagnostics: diagnostics,
    warnings,
    outputPaths: paths,
  };
  assertNoExecutableLedgerFields(ledger);
  const watchlist = await buildPreCandidateWatchlistReport(options, generatedAt, paths);
  const handoff = buildModelCandidateBacktestHandoff(ledger, watchlist);
  mkdirSync(path.dirname(paths.jsonPath), { recursive: true });
  writeFileSync(paths.jsonPath, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
  writeFileSync(paths.markdownPath, `${renderModelCandidateLedgerMarkdown(ledger)}\n`, 'utf8');
  if (paths.watchlistJsonPath && paths.watchlistMarkdownPath) {
    writeFileSync(paths.watchlistJsonPath, `${JSON.stringify(watchlist, null, 2)}\n`, 'utf8');
    writeFileSync(paths.watchlistMarkdownPath, `${renderPreCandidateWatchlistMarkdown(watchlist)}\n`, 'utf8');
  }
  if (paths.backtestHandoffJsonPath && paths.backtestHandoffMarkdownPath) {
    writeFileSync(paths.backtestHandoffJsonPath, `${JSON.stringify(handoff, null, 2)}\n`, 'utf8');
    writeFileSync(paths.backtestHandoffMarkdownPath, `${renderModelCandidateBacktestHandoffMarkdown(handoff)}\n`, 'utf8');
  }
  if (paths.rangeJsonPath && paths.rangeMarkdownPath) {
    writeFileSync(paths.rangeJsonPath, `${JSON.stringify({ ...ledger, outputPaths: paths }, null, 2)}\n`, 'utf8');
    writeFileSync(paths.rangeMarkdownPath, `${renderModelCandidateLedgerMarkdown(ledger)}\n`, 'utf8');
  }
  if (paths.rangeWatchlistJsonPath && paths.rangeWatchlistMarkdownPath) {
    writeFileSync(paths.rangeWatchlistJsonPath, `${JSON.stringify({ ...watchlist, outputPaths: watchlist.outputPaths }, null, 2)}\n`, 'utf8');
    writeFileSync(paths.rangeWatchlistMarkdownPath, `${renderPreCandidateWatchlistMarkdown(watchlist)}\n`, 'utf8');
  }
  if (paths.rangeBacktestHandoffJsonPath && paths.rangeBacktestHandoffMarkdownPath) {
    writeFileSync(paths.rangeBacktestHandoffJsonPath, `${JSON.stringify({ ...handoff, outputPaths: handoff.outputPaths }, null, 2)}\n`, 'utf8');
    writeFileSync(paths.rangeBacktestHandoffMarkdownPath, `${renderModelCandidateBacktestHandoffMarkdown(handoff)}\n`, 'utf8');
  }
  return ledger;
}

function renderPretty(ledger: ModelCandidateReviewLedger): string {
  return [
    '[MODEL CANDIDATE REVIEW LEDGER]',
    `Date range: ${ledger.from} to ${ledger.to}`,
    `Symbol: ${ledger.symbol}`,
    `Ledger JSON: ${ledger.outputPaths.jsonPath}`,
    `Ledger Markdown: ${ledger.outputPaths.markdownPath}`,
    ...(ledger.outputPaths.watchlistJsonPath && ledger.outputPaths.watchlistMarkdownPath ? [
      `Watchlist JSON: ${ledger.outputPaths.watchlistJsonPath}`,
      `Watchlist Markdown: ${ledger.outputPaths.watchlistMarkdownPath}`,
    ] : []),
    ...(ledger.outputPaths.rangeJsonPath && ledger.outputPaths.rangeMarkdownPath ? [
      `Range JSON: ${ledger.outputPaths.rangeJsonPath}`,
      `Range Markdown: ${ledger.outputPaths.rangeMarkdownPath}`,
    ] : []),
    ...(ledger.outputPaths.rangeWatchlistJsonPath && ledger.outputPaths.rangeWatchlistMarkdownPath ? [
      `Range Watchlist JSON: ${ledger.outputPaths.rangeWatchlistJsonPath}`,
      `Range Watchlist Markdown: ${ledger.outputPaths.rangeWatchlistMarkdownPath}`,
    ] : []),
    ...(ledger.outputPaths.backtestHandoffJsonPath && ledger.outputPaths.backtestHandoffMarkdownPath ? [
      `Backtest handoff JSON: ${ledger.outputPaths.backtestHandoffJsonPath}`,
      `Backtest handoff Markdown: ${ledger.outputPaths.backtestHandoffMarkdownPath}`,
    ] : []),
    ...(ledger.outputPaths.rangeBacktestHandoffJsonPath && ledger.outputPaths.rangeBacktestHandoffMarkdownPath ? [
      `Range Backtest handoff JSON: ${ledger.outputPaths.rangeBacktestHandoffJsonPath}`,
      `Range Backtest handoff Markdown: ${ledger.outputPaths.rangeBacktestHandoffMarkdownPath}`,
    ] : []),
    `Reviewed samples found: ${ledger.summary.reviewedSamplesFound}`,
    `Human-reviewed samples found: ${ledger.summary.humanReviewedSamplesFound}`,
    `Reviewed files read: ${ledger.summary.reviewedFilesRead}/${ledger.summary.reviewedFilesFound}`,
    `Ignored reviewed samples: ${ledger.summary.ignoredReviewedSamples}`,
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
