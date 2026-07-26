import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalTicketAdapterReport } from './unified-positive-held-local-ticket-adapter';
import type { UnifiedPositiveHeldLocalPreviewModelDecisionReport } from './unified-positive-held-local-preview-model-decision';
import type { UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport } from './unified-positive-held-local-preview-ohlc-outcome';

type TargetSetupType = 'historicalReview' | 'NoInstalledSetup';

interface FormalReplayTrade {
  date?: string;
  session?: string;
  time?: string;
  source?: string;
  direction?: string;
  setupType?: string;
  state?: string;
  trigger?: string;
  entry?: number;
  stop?: number;
  confidence?: number;
  oneMesGross?: number;
  htfStatus?: string;
  dataStatus?: string;
}

interface BucketStats {
  count: number;
  grossOneMes: number | null;
  sessions: Record<string, number>;
  directions: Record<string, number>;
  sources: Record<string, number>;
  states: Record<string, number>;
  htfStatus: Record<string, number>;
  dataStatus: Record<string, number>;
  avgRiskPoints: number | null;
  avgConfidence: number | null;
  avgMfe: number | null;
  avgMae: number | null;
  completedRetestProofCount: number;
  proofTimes: string[];
}

export interface UnifiedPositiveHeldLocalPreviewFilterDifferenceRow {
  setupType: TargetSetupType;
  formalLosing: BucketStats;
  reviewedWinning: BucketStats;
  filterHypothesis: string;
  recommendation: string;
  removeModel: false;
  broadenLiveBehavior: false;
  changeCanExecute: false;
}

export interface UnifiedPositiveHeldLocalPreviewFilterDifferenceReport {
  reportType: 'unified_positive_held_local_preview_filter_difference';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: {
    readOnly: true;
    localOnly: true;
    researchOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    runsSetupScanner: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRiskRules: false;
    changesBridgeBehavior: false;
    changesDiscordPosting: false;
    changesAppRuntime: false;
  };
  source: {
    formalReplayPath: string | null;
    ohlcOutcomePath: string | null;
    modelDecisionPath: string | null;
    heldLocalAdapterPath: string | null;
  };
  summary: {
    setupTypesCompared: number;
    formalLosingRows: number;
    reviewedWinningRows: number;
    candidateFilterFindings: number;
    removeModelRecommendations: 0;
    broadenLiveBehaviorRecommendations: 0;
    changeCanExecuteRecommendations: 0;
    livePromotionAllowedRows: 0;
  };
  rows: UnifiedPositiveHeldLocalPreviewFilterDifferenceRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const TARGET_MODELS: TargetSetupType[] = ['historicalReview', 'NoInstalledSetup'];

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  const matches = fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function numberOrNull(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function avg(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0) / numeric.length) : null;
}

function counts(values: Array<string | null | undefined>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const value of values) {
    const key = value && value.trim() ? value.trim() : 'missing';
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

function riskPoints(entry: unknown, stop: unknown): number | null {
  const parsedEntry = numberOrNull(entry);
  const parsedStop = numberOrNull(stop);
  return parsedEntry === null || parsedStop === null ? null : round(Math.abs(parsedEntry - parsedStop));
}

function hasCompletedRetestProof(text: unknown): boolean {
  if (typeof text !== 'string') return false;
  const normalized = text.toLowerCase();
  return normalized.includes('completed_5m_retest_reentry') ||
    (normalized.includes('completed 5m') && normalized.includes('retest') && normalized.includes('reentry'));
}

function authority(): UnifiedPositiveHeldLocalPreviewFilterDifferenceReport['authority'] {
  return {
    readOnly: true,
    localOnly: true,
    researchOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    runsSetupScanner: false,
    changesScannerBehavior: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    changesRiskRules: false,
    changesBridgeBehavior: false,
    changesDiscordPosting: false,
    changesAppRuntime: false,
  };
}

function dominantReviewTrades(formalReplayReport: Record<string, unknown> | null): FormalReplayTrade[] {
  const variants = Array.isArray(formalReplayReport?.variants) ? formalReplayReport.variants : [];
  const dominant = variants
    .map((variant) => asRecord(variant))
    .find((variant) => variant.name === 'dominantReview') || asRecord(variants[1]);
  const trades = dominant.trades;
  return Array.isArray(trades) ? trades.map((trade) => asRecord(trade) as FormalReplayTrade) : [];
}

function formalStats(rows: FormalReplayTrade[]): BucketStats {
  return {
    count: rows.length,
    grossOneMes: sum(rows.map((row) => row.oneMesGross)),
    sessions: counts(rows.map((row) => row.session)),
    directions: counts(rows.map((row) => row.direction)),
    sources: counts(rows.map((row) => row.source)),
    states: counts(rows.map((row) => row.state)),
    htfStatus: counts(rows.map((row) => row.htfStatus)),
    dataStatus: counts(rows.map((row) => row.dataStatus)),
    avgRiskPoints: avg(rows.map((row) => riskPoints(row.entry, row.stop))),
    avgConfidence: avg(rows.map((row) => numberOrNull(row.confidence))),
    avgMfe: null,
    avgMae: null,
    completedRetestProofCount: rows.filter((row) => hasCompletedRetestProof(row.trigger)).length,
    proofTimes: [],
  };
}

function reviewedStats(
  rows: UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport['rows'],
  adapterRows: UnifiedPositiveHeldLocalTicketAdapterReport['rows'],
): BucketStats {
  const adapterByTicket = new Map(adapterRows.map((row) => [row.ticketId, row]));
  const triggerTexts = rows.map((row) => {
    const adapter = adapterByTicket.get(row.ticketId);
    return adapter?.artifact?.deskTicket.triggerCondition ||
      adapter?.artifact?.deskPublishDecision.triggerCondition ||
      '';
  });
  return {
    count: rows.length,
    grossOneMes: sum(rows.map((row) => row.resolvedOneMesPl)),
    sessions: counts(rows.map((row) => row.session)),
    directions: counts(rows.map((row) => row.direction)),
    sources: counts(rows.map((row) => row.barsSource)),
    states: counts(rows.map((row) => row.outcomeLabel)),
    htfStatus: {},
    dataStatus: {},
    avgRiskPoints: avg(rows.map((row) => row.riskPoints)),
    avgConfidence: null,
    avgMfe: avg(rows.map((row) => row.maximumFavorableExcursion)),
    avgMae: avg(rows.map((row) => row.maximumAdverseExcursion)),
    completedRetestProofCount: triggerTexts.filter((text) => hasCompletedRetestProof(text)).length,
    proofTimes: rows.map((row) => row.proofTime).filter((time): time is string => Boolean(time)),
  };
}

function buildRecommendation(setupType: TargetSetupType, formal: BucketStats, reviewed: BucketStats): Pick<UnifiedPositiveHeldLocalPreviewFilterDifferenceRow, 'filterHypothesis' | 'recommendation'> {
  const proofGap = reviewed.completedRetestProofCount > 0 && formal.completedRetestProofCount === 0;
  const sourceGap = reviewed.count > 0 && Object.keys(formal.sources).some((source) => source === 'selectedCandidate');
  if (proofGap && sourceGap) {
    return {
      filterHypothesis: `${setupType} winners came through scanner-owned held-local artifacts with completed 5M retest/re-entry proof; broad losers came through selectedCandidate/non-strict review rows without that proof artifact.`,
      recommendation: 'Keep the model. Validate a source/proof filter that requires scanner-owned held-local proof before any candidate is allowed into a higher-confidence research bucket.',
    };
  }
  if (proofGap) {
    return {
      filterHypothesis: `${setupType} reviewed winners had completed 5M retest/re-entry proof while broad losers did not show the same proof marker.`,
      recommendation: 'Keep researching the completed 5M proof requirement before changing live promotion behavior.',
    };
  }
  return {
    filterHypothesis: `${setupType} does not yet have a single isolated separator from this artifact set.`,
    recommendation: 'Do not broaden, delete, or change canExecute. Collect more reviewed rows before making a rule decision.',
  };
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewFilterDifferenceReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Filter Difference',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only filter research. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Setup types compared: ${report.summary.setupTypesCompared}.`,
    `- Formal losing rows: ${report.summary.formalLosingRows}.`,
    `- Reviewed winning rows: ${report.summary.reviewedWinningRows}.`,
    `- Candidate filter findings: ${report.summary.candidateFilterFindings}.`,
    `- Remove-model recommendations: ${report.summary.removeModelRecommendations}.`,
    `- Broaden-live-behavior recommendations: ${report.summary.broadenLiveBehaviorRecommendations}.`,
    `- Change-canExecute recommendations: ${report.summary.changeCanExecuteRecommendations}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Rows',
    '| Setup | Formal Losers | Formal P/L | Formal Source | Formal Proof | Reviewed Winners | Reviewed P/L | Reviewed Proof | Avg Risk Formal / Reviewed | Avg MFE / MAE | Recommendation |',
    '|---|---:|---:|---|---:|---:|---:|---:|---|---|---|',
    ...report.rows.map((row) => `| ${row.setupType} | ${row.formalLosing.count} | ${row.formalLosing.grossOneMes ?? '-'} | ${escapeTable(JSON.stringify(row.formalLosing.sources))} | ${row.formalLosing.completedRetestProofCount} | ${row.reviewedWinning.count} | ${row.reviewedWinning.grossOneMes ?? '-'} | ${row.reviewedWinning.completedRetestProofCount} | ${row.formalLosing.avgRiskPoints ?? '-'}/${row.reviewedWinning.avgRiskPoints ?? '-'} | ${row.reviewedWinning.avgMfe ?? '-'}/${row.reviewedWinning.avgMae ?? '-'} | ${escapeTable(row.recommendation)} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewFilterDifferenceReport(args: {
  formalReplayPath: string | null;
  formalReplayReport: Record<string, unknown> | null;
  ohlcOutcomePath: string | null;
  ohlcOutcomeReport: UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport | null;
  modelDecisionPath: string | null;
  modelDecisionReport: UnifiedPositiveHeldLocalPreviewModelDecisionReport | null;
  heldLocalAdapterPath: string | null;
  heldLocalAdapterReport: UnifiedPositiveHeldLocalTicketAdapterReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewFilterDifferenceReport {
  const formalTrades = dominantReviewTrades(args.formalReplayReport);
  const adapterRows = args.heldLocalAdapterReport?.rows || [];
  const rows = TARGET_MODELS.map((setupType) => {
    const formalLosingRows = formalTrades.filter((trade) => (
      trade.setupType === setupType &&
      typeof trade.oneMesGross === 'number' &&
      trade.oneMesGross < 0
    ));
    const reviewedWinningRows = (args.ohlcOutcomeReport?.rows || []).filter((row) => (
      row.setupType === setupType &&
      typeof row.resolvedOneMesPl === 'number' &&
      row.resolvedOneMesPl > 0
    ));
    const formal = formalStats(formalLosingRows);
    const reviewed = reviewedStats(reviewedWinningRows, adapterRows);
    return {
      setupType,
      formalLosing: formal,
      reviewedWinning: reviewed,
      ...buildRecommendation(setupType, formal, reviewed),
      removeModel: false as const,
      broadenLiveBehavior: false as const,
      changeCanExecute: false as const,
    };
  });
  const modelRows = args.modelDecisionReport?.rows || [];
  const blockers = [
    !args.formalReplayPath ? 'missing formal replay path' : null,
    !args.formalReplayReport ? 'missing formal replay report' : null,
    !args.ohlcOutcomePath ? 'missing OHLC outcome path' : null,
    !args.ohlcOutcomeReport ? 'missing OHLC outcome report' : null,
    args.ohlcOutcomeReport && args.ohlcOutcomeReport.status !== 'pass' ? `OHLC outcome status ${args.ohlcOutcomeReport.status}` : null,
    !args.modelDecisionPath ? 'missing model decision path' : null,
    !args.modelDecisionReport ? 'missing model decision report' : null,
    args.modelDecisionReport && args.modelDecisionReport.status !== 'pass' ? `model decision status ${args.modelDecisionReport.status}` : null,
    !args.heldLocalAdapterPath ? 'missing held-local adapter path' : null,
    !args.heldLocalAdapterReport ? 'missing held-local adapter report' : null,
    ...modelRows.flatMap((row) => [
      row.removeModel !== false ? `${row.setupType} prior model decision removeModel is not false` : null,
      row.broadenLiveBehavior !== false ? `${row.setupType} prior model decision broadenLiveBehavior is not false` : null,
      row.changeCanExecute !== false ? `${row.setupType} prior model decision changeCanExecute is not false` : null,
    ]),
    ...rows.flatMap((row) => [
      row.formalLosing.count === 0 ? `${row.setupType} has no formal losing rows to compare` : null,
      row.reviewedWinning.count === 0 ? `${row.setupType} has no reviewed winning rows to compare` : null,
      row.reviewedWinning.completedRetestProofCount !== row.reviewedWinning.count ? `${row.setupType} reviewed winners missing completed 5M retest/re-entry proof markers` : null,
    ]),
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewFilterDifferenceReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_filter_difference',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      formalReplayPath: args.formalReplayPath,
      ohlcOutcomePath: args.ohlcOutcomePath,
      modelDecisionPath: args.modelDecisionPath,
      heldLocalAdapterPath: args.heldLocalAdapterPath,
    },
    summary: {
      setupTypesCompared: rows.length,
      formalLosingRows: rows.reduce((total, row) => total + row.formalLosing.count, 0),
      reviewedWinningRows: rows.reduce((total, row) => total + row.reviewedWinning.count, 0),
      candidateFilterFindings: rows.filter((row) => row.reviewedWinning.completedRetestProofCount > 0 && row.formalLosing.completedRetestProofCount === 0).length,
      removeModelRecommendations: 0,
      broadenLiveBehaviorRecommendations: 0,
      changeCanExecuteRecommendations: 0,
      livePromotionAllowedRows: 0,
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not use this filter-difference report for implementation until all source artifacts load and reviewed winners carry completed 5M retest/re-entry proof.']
      : [
        'Do not remove historicalReview or NoInstalledSetup from this evidence.',
        'Do not broaden either model or change canExecute from this evidence.',
        'Next narrow fix should validate a source/proof filter: scanner-owned held-local artifact plus completed 5M retest/re-entry proof before the row enters higher-confidence research ranking.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewFilterDifferenceReport(
  report: UnifiedPositiveHeldLocalPreviewFilterDifferenceReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-filter-difference-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewFilterDifferenceCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const formalReplayPath = readFlag(args, '--formal-replay') || latestMatchingFile(outDir, /^formal-replay-research-MES-2026-06-01-to-2026-07-02-\d+\.json$/);
  const ohlcOutcomePath = readFlag(args, '--ohlc-outcome') || latestMatchingFile(outDir, /^unified-positive-held-local-preview-ohlc-outcome-\d+\.json$/);
  const modelDecisionPath = readFlag(args, '--model-decision') || latestMatchingFile(outDir, /^unified-positive-held-local-preview-model-decision-\d+\.json$/);
  const heldLocalAdapterPath = readFlag(args, '--held-local-adapter') || latestMatchingFile(outDir, /^unified-positive-held-local-ticket-adapter-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewFilterDifferenceReport({
    formalReplayPath,
    formalReplayReport: formalReplayPath && fs.existsSync(formalReplayPath)
      ? JSON.parse(fs.readFileSync(formalReplayPath, 'utf8')) as Record<string, unknown>
      : null,
    ohlcOutcomePath,
    ohlcOutcomeReport: ohlcOutcomePath && fs.existsSync(ohlcOutcomePath)
      ? JSON.parse(fs.readFileSync(ohlcOutcomePath, 'utf8')) as UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport
      : null,
    modelDecisionPath,
    modelDecisionReport: modelDecisionPath && fs.existsSync(modelDecisionPath)
      ? JSON.parse(fs.readFileSync(modelDecisionPath, 'utf8')) as UnifiedPositiveHeldLocalPreviewModelDecisionReport
      : null,
    heldLocalAdapterPath,
    heldLocalAdapterReport: heldLocalAdapterPath && fs.existsSync(heldLocalAdapterPath)
      ? JSON.parse(fs.readFileSync(heldLocalAdapterPath, 'utf8')) as UnifiedPositiveHeldLocalTicketAdapterReport
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewFilterDifferenceReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runUnifiedPositiveHeldLocalPreviewFilterDifferenceCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
