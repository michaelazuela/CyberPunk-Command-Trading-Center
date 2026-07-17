import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalTicketAdapterReport } from './unified-positive-held-local-ticket-adapter';
import type { UnifiedPositiveHeldLocalPreviewFilterDifferenceReport } from './unified-positive-held-local-preview-filter-difference';
import type { UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport } from './unified-positive-held-local-preview-ohlc-outcome';

type TargetSetupType = 'TurtleSoup' | 'SweepMssFvgRetrace';
type FilterDecision = 'accepted_for_research_validation' | 'rejected_by_source_proof_filter';

interface FormalReplayTrade {
  date?: string;
  session?: string;
  source?: string;
  direction?: string;
  setupType?: string;
  state?: string;
  trigger?: string;
  entry?: number;
  stop?: number;
  oneMesGross?: number;
}

export interface UnifiedPositiveHeldLocalPreviewSourceProofFilterRow {
  rowId: string;
  sourceBucket: 'formal_dominant_review_loser' | 'reviewed_held_local_winner';
  setupType: TargetSetupType;
  tradeDate: string | null;
  session: string | null;
  direction: string | null;
  source: string | null;
  outcomeOneMesPl: number | null;
  scannerOwnedHeldLocalArtifact: boolean;
  completedFiveMinuteRetestReentryProof: boolean;
  artifactCanExecuteFalse: boolean;
  artifactPublishDiscordFalse: boolean;
  artifactShouldPostFalse: boolean;
  decision: FilterDecision;
  rejectionReasons: string[];
}

export interface UnifiedPositiveHeldLocalPreviewSourceProofFilterReport {
  reportType: 'unified_positive_held_local_preview_source_proof_filter';
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
    heldLocalAdapterPath: string | null;
    filterDifferencePath: string | null;
  };
  filterCriteria: {
    targetSetupTypes: TargetSetupType[];
    requiresScannerOwnedHeldLocalArtifact: true;
    requiresCompletedFiveMinuteRetestReentryProof: true;
    requiresCanExecuteFalseForResearch: true;
    requiresPublishDiscordFalseForResearch: true;
    requiresShouldPostFalseForResearch: true;
    livePromotionAllowed: false;
  };
  summary: {
    evaluatedRows: number;
    acceptedRows: number;
    rejectedRows: number;
    acceptedReviewedWinners: number;
    rejectedFormalLosers: number;
    acceptedFormalLosers: number;
    rejectedReviewedWinners: number;
    acceptedOneMesPl: number | null;
    rejectedOneMesPl: number | null;
    leakThroughLosingRows: number;
    falseRejectReviewedWinningRows: number;
    removeModelRecommendations: 0;
    broadenLiveBehaviorRecommendations: 0;
    changeCanExecuteRecommendations: 0;
    livePromotionAllowedRows: 0;
  };
  rows: UnifiedPositiveHeldLocalPreviewSourceProofFilterRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const TARGET_MODELS: TargetSetupType[] = ['TurtleSoup', 'SweepMssFvgRetrace'];

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

function hasCompletedRetestProof(text: unknown): boolean {
  if (typeof text !== 'string') return false;
  const normalized = text.toLowerCase();
  return normalized.includes('completed_5m_retest_reentry') ||
    (normalized.includes('completed 5m') && normalized.includes('retest') && normalized.includes('reentry'));
}

function isTargetSetup(value: unknown): value is TargetSetupType {
  return value === 'TurtleSoup' || value === 'SweepMssFvgRetrace';
}

function authority(): UnifiedPositiveHeldLocalPreviewSourceProofFilterReport['authority'] {
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

function rejectionReasons(args: {
  scannerOwnedHeldLocalArtifact: boolean;
  completedFiveMinuteRetestReentryProof: boolean;
  artifactCanExecuteFalse: boolean;
  artifactPublishDiscordFalse: boolean;
  artifactShouldPostFalse: boolean;
}): string[] {
  return [
    !args.scannerOwnedHeldLocalArtifact ? 'missing scanner-owned held-local artifact' : null,
    !args.completedFiveMinuteRetestReentryProof ? 'missing completed 5M retest/re-entry proof' : null,
    !args.artifactCanExecuteFalse ? 'artifact canExecute is not false' : null,
    !args.artifactPublishDiscordFalse ? 'artifact publishDiscord is not false' : null,
    !args.artifactShouldPostFalse ? 'artifact shouldPost is not false' : null,
  ].filter((item): item is string => Boolean(item));
}

function decisionFor(reasons: string[]): FilterDecision {
  return reasons.length ? 'rejected_by_source_proof_filter' : 'accepted_for_research_validation';
}

function buildFormalRows(formalReplayReport: Record<string, unknown> | null): UnifiedPositiveHeldLocalPreviewSourceProofFilterRow[] {
  return dominantReviewTrades(formalReplayReport)
    .filter((trade) => isTargetSetup(trade.setupType) && typeof trade.oneMesGross === 'number' && trade.oneMesGross < 0)
    .map((trade, index) => {
      const reasons = rejectionReasons({
        scannerOwnedHeldLocalArtifact: false,
        completedFiveMinuteRetestReentryProof: hasCompletedRetestProof(trade.trigger),
        artifactCanExecuteFalse: false,
        artifactPublishDiscordFalse: false,
        artifactShouldPostFalse: false,
      });
      return {
        rowId: `formal-${trade.date || 'unknown'}-${trade.session || 'unknown'}-${trade.setupType}-${index}`,
        sourceBucket: 'formal_dominant_review_loser',
        setupType: trade.setupType as TargetSetupType,
        tradeDate: trade.date || null,
        session: trade.session || null,
        direction: trade.direction || null,
        source: trade.source || null,
        outcomeOneMesPl: numberOrNull(trade.oneMesGross),
        scannerOwnedHeldLocalArtifact: false,
        completedFiveMinuteRetestReentryProof: hasCompletedRetestProof(trade.trigger),
        artifactCanExecuteFalse: false,
        artifactPublishDiscordFalse: false,
        artifactShouldPostFalse: false,
        decision: decisionFor(reasons),
        rejectionReasons: reasons,
      };
    });
}

function buildReviewedRows(
  ohlcOutcomeReport: UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport | null,
  heldLocalAdapterReport: UnifiedPositiveHeldLocalTicketAdapterReport | null,
): UnifiedPositiveHeldLocalPreviewSourceProofFilterRow[] {
  const adapterByTicket = new Map((heldLocalAdapterReport?.rows || []).map((row) => [row.ticketId, row]));
  return (ohlcOutcomeReport?.rows || [])
    .filter((row) => isTargetSetup(row.setupType) && typeof row.resolvedOneMesPl === 'number' && row.resolvedOneMesPl > 0)
    .map((row) => {
      const adapter = adapterByTicket.get(row.ticketId);
      const artifact = adapter?.artifact;
      const trigger = artifact?.deskTicket.triggerCondition || artifact?.deskPublishDecision.triggerCondition || '';
      const flags = {
        scannerOwnedHeldLocalArtifact: adapter?.adapterStatus === 'held_local_artifact_created' && Boolean(artifact),
        completedFiveMinuteRetestReentryProof: hasCompletedRetestProof(trigger),
        artifactCanExecuteFalse: artifact?.canExecute === false,
        artifactPublishDiscordFalse: artifact?.publishDiscord === false,
        artifactShouldPostFalse: artifact?.deskPublishDecision.shouldPost === false,
      };
      const reasons = rejectionReasons(flags);
      return {
        rowId: row.ticketId,
        sourceBucket: 'reviewed_held_local_winner',
        setupType: row.setupType as TargetSetupType,
        tradeDate: row.tradeDate,
        session: row.session,
        direction: row.direction,
        source: row.barsSource,
        outcomeOneMesPl: row.resolvedOneMesPl,
        ...flags,
        decision: decisionFor(reasons),
        rejectionReasons: reasons,
      };
    });
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewSourceProofFilterReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Source/Proof Filter',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only source/proof validation. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Evaluated rows: ${report.summary.evaluatedRows}.`,
    `- Accepted rows: ${report.summary.acceptedRows}.`,
    `- Rejected rows: ${report.summary.rejectedRows}.`,
    `- Accepted reviewed winners: ${report.summary.acceptedReviewedWinners}.`,
    `- Rejected formal losers: ${report.summary.rejectedFormalLosers}.`,
    `- Accepted formal losers: ${report.summary.acceptedFormalLosers}.`,
    `- Rejected reviewed winners: ${report.summary.rejectedReviewedWinners}.`,
    `- Accepted one-MES P/L: ${report.summary.acceptedOneMesPl ?? 'not available'}.`,
    `- Rejected one-MES P/L: ${report.summary.rejectedOneMesPl ?? 'not available'}.`,
    `- Leak-through losing rows: ${report.summary.leakThroughLosingRows}.`,
    `- False-reject reviewed winning rows: ${report.summary.falseRejectReviewedWinningRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Rows',
    '| Row | Bucket | Setup | Date | Session | Side | P/L | Artifact | Proof | Decision | Rejections |',
    '|---|---|---|---|---|---|---:|---|---|---|---|',
    ...report.rows.map((row) => `| ${escapeTable(row.rowId)} | ${row.sourceBucket} | ${row.setupType} | ${row.tradeDate ?? '-'} | ${row.session ?? '-'} | ${row.direction ?? '-'} | ${row.outcomeOneMesPl ?? '-'} | ${row.scannerOwnedHeldLocalArtifact} | ${row.completedFiveMinuteRetestReentryProof} | ${row.decision} | ${escapeTable(row.rejectionReasons.join(', ') || '-')} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewSourceProofFilterReport(args: {
  formalReplayPath: string | null;
  formalReplayReport: Record<string, unknown> | null;
  ohlcOutcomePath: string | null;
  ohlcOutcomeReport: UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport | null;
  heldLocalAdapterPath: string | null;
  heldLocalAdapterReport: UnifiedPositiveHeldLocalTicketAdapterReport | null;
  filterDifferencePath: string | null;
  filterDifferenceReport: UnifiedPositiveHeldLocalPreviewFilterDifferenceReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewSourceProofFilterReport {
  const rows = [
    ...buildFormalRows(args.formalReplayReport),
    ...buildReviewedRows(args.ohlcOutcomeReport, args.heldLocalAdapterReport),
  ];
  const accepted = rows.filter((row) => row.decision === 'accepted_for_research_validation');
  const rejected = rows.filter((row) => row.decision === 'rejected_by_source_proof_filter');
  const blockers = [
    !args.formalReplayPath ? 'missing formal replay path' : null,
    !args.formalReplayReport ? 'missing formal replay report' : null,
    !args.ohlcOutcomePath ? 'missing OHLC outcome path' : null,
    !args.ohlcOutcomeReport ? 'missing OHLC outcome report' : null,
    args.ohlcOutcomeReport && args.ohlcOutcomeReport.status !== 'pass' ? `OHLC outcome status ${args.ohlcOutcomeReport.status}` : null,
    !args.heldLocalAdapterPath ? 'missing held-local adapter path' : null,
    !args.heldLocalAdapterReport ? 'missing held-local adapter report' : null,
    !args.filterDifferencePath ? 'missing filter-difference path' : null,
    !args.filterDifferenceReport ? 'missing filter-difference report' : null,
    args.filterDifferenceReport && args.filterDifferenceReport.status !== 'pass' ? `filter-difference status ${args.filterDifferenceReport.status}` : null,
    rows.length === 0 ? 'no rows evaluated' : null,
    accepted.some((row) => row.sourceBucket === 'formal_dominant_review_loser') ? 'source/proof filter accepted at least one formal losing row' : null,
    rejected.some((row) => row.sourceBucket === 'reviewed_held_local_winner') ? 'source/proof filter rejected at least one reviewed held-local winner' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewSourceProofFilterReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_source_proof_filter',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      formalReplayPath: args.formalReplayPath,
      ohlcOutcomePath: args.ohlcOutcomePath,
      heldLocalAdapterPath: args.heldLocalAdapterPath,
      filterDifferencePath: args.filterDifferencePath,
    },
    filterCriteria: {
      targetSetupTypes: TARGET_MODELS,
      requiresScannerOwnedHeldLocalArtifact: true,
      requiresCompletedFiveMinuteRetestReentryProof: true,
      requiresCanExecuteFalseForResearch: true,
      requiresPublishDiscordFalseForResearch: true,
      requiresShouldPostFalseForResearch: true,
      livePromotionAllowed: false,
    },
    summary: {
      evaluatedRows: rows.length,
      acceptedRows: accepted.length,
      rejectedRows: rejected.length,
      acceptedReviewedWinners: accepted.filter((row) => row.sourceBucket === 'reviewed_held_local_winner').length,
      rejectedFormalLosers: rejected.filter((row) => row.sourceBucket === 'formal_dominant_review_loser').length,
      acceptedFormalLosers: accepted.filter((row) => row.sourceBucket === 'formal_dominant_review_loser').length,
      rejectedReviewedWinners: rejected.filter((row) => row.sourceBucket === 'reviewed_held_local_winner').length,
      acceptedOneMesPl: sum(accepted.map((row) => row.outcomeOneMesPl)),
      rejectedOneMesPl: sum(rejected.map((row) => row.outcomeOneMesPl)),
      leakThroughLosingRows: accepted.filter((row) => row.sourceBucket === 'formal_dominant_review_loser').length,
      falseRejectReviewedWinningRows: rejected.filter((row) => row.sourceBucket === 'reviewed_held_local_winner').length,
      removeModelRecommendations: 0,
      broadenLiveBehaviorRecommendations: 0,
      changeCanExecuteRecommendations: 0,
      livePromotionAllowedRows: 0,
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not implement source/proof filtering until the validation accepts reviewed winners and rejects broad formal losers with no leak-through.']
      : [
        'Source/proof filter validation passed for this research set.',
        'Keep TurtleSoup and SweepMssFvgRetrace; do not broaden either model or change canExecute.',
        'Next narrow phase can add a research-only rank overlay that uses this validated source/proof tag without touching live behavior.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewSourceProofFilterReport(
  report: UnifiedPositiveHeldLocalPreviewSourceProofFilterReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-source-proof-filter-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewSourceProofFilterCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const formalReplayPath = readFlag(args, '--formal-replay') || latestMatchingFile(outDir, /^formal-replay-research-MES-2026-06-01-to-2026-07-02-\d+\.json$/);
  const ohlcOutcomePath = readFlag(args, '--ohlc-outcome') || latestMatchingFile(outDir, /^unified-positive-held-local-preview-ohlc-outcome-\d+\.json$/);
  const heldLocalAdapterPath = readFlag(args, '--held-local-adapter') || latestMatchingFile(outDir, /^unified-positive-held-local-ticket-adapter-\d+\.json$/);
  const filterDifferencePath = readFlag(args, '--filter-difference') || latestMatchingFile(outDir, /^unified-positive-held-local-preview-filter-difference-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewSourceProofFilterReport({
    formalReplayPath,
    formalReplayReport: formalReplayPath && fs.existsSync(formalReplayPath)
      ? JSON.parse(fs.readFileSync(formalReplayPath, 'utf8')) as Record<string, unknown>
      : null,
    ohlcOutcomePath,
    ohlcOutcomeReport: ohlcOutcomePath && fs.existsSync(ohlcOutcomePath)
      ? JSON.parse(fs.readFileSync(ohlcOutcomePath, 'utf8')) as UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport
      : null,
    heldLocalAdapterPath,
    heldLocalAdapterReport: heldLocalAdapterPath && fs.existsSync(heldLocalAdapterPath)
      ? JSON.parse(fs.readFileSync(heldLocalAdapterPath, 'utf8')) as UnifiedPositiveHeldLocalTicketAdapterReport
      : null,
    filterDifferencePath,
    filterDifferenceReport: filterDifferencePath && fs.existsSync(filterDifferencePath)
      ? JSON.parse(fs.readFileSync(filterDifferencePath, 'utf8')) as UnifiedPositiveHeldLocalPreviewFilterDifferenceReport
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewSourceProofFilterReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewSourceProofFilterCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
