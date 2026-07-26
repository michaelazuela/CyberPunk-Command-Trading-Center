import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildUnifiedPositiveHeldLocalPreviewRankOverlayReport,
  writeUnifiedPositiveHeldLocalPreviewRankOverlayReport,
  type UnifiedPositiveHeldLocalPreviewRankOverlayReport,
} from './unified-positive-held-local-preview-rank-overlay';
import type { UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport } from './unified-positive-held-local-preview-ohlc-outcome';
import type {
  UnifiedPositiveHeldLocalPreviewSourceProofFilterReport,
  UnifiedPositiveHeldLocalPreviewSourceProofFilterRow,
} from './unified-positive-held-local-preview-source-proof-filter';

export interface UnifiedPositiveHeldLocalPreviewRankOverlayExpansionReport {
  reportType: 'unified_positive_held_local_preview_rank_overlay_expansion';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: UnifiedPositiveHeldLocalPreviewRankOverlayReport['authority'];
  source: {
    reportDir: string;
    sourceProofFilterPaths: string[];
    ohlcOutcomePaths: string[];
  };
  expansion: {
    sourceProofReportsLoaded: number;
    ohlcOutcomeReportsLoaded: number;
    duplicateRowsRemoved: number;
    newestSourceProofPath: string | null;
    newestRows: number;
    expandedRowsBeyondNewest: number;
  };
  rankOverlay: UnifiedPositiveHeldLocalPreviewRankOverlayReport;
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function matchingFiles(reportDir: string, pattern: RegExp): string[] {
  if (!fs.existsSync(reportDir)) return [];
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function mergeSourceProofReports(reports: UnifiedPositiveHeldLocalPreviewSourceProofFilterReport[]): {
  report: UnifiedPositiveHeldLocalPreviewSourceProofFilterReport | null;
  duplicateRowsRemoved: number;
} {
  if (!reports.length) return { report: null, duplicateRowsRemoved: 0 };
  const byRowId = new Map<string, UnifiedPositiveHeldLocalPreviewSourceProofFilterRow>();
  let duplicateRowsRemoved = 0;
  for (const report of reports) {
    for (const row of report.rows) {
      if (byRowId.has(row.rowId)) duplicateRowsRemoved += 1;
      else byRowId.set(row.rowId, row);
    }
  }
  const rows = [...byRowId.values()];
  const accepted = rows.filter((row) => row.decision === 'accepted_for_research_validation');
  const rejected = rows.filter((row) => row.decision === 'rejected_by_source_proof_filter');
  const template = reports[0];
  return {
    duplicateRowsRemoved,
    report: {
      ...template,
      generatedAt: new Date().toISOString(),
      source: {
        formalReplayPath: null,
        ohlcOutcomePath: null,
        heldLocalAdapterPath: null,
        filterDifferencePath: null,
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
      blockers: reports.flatMap((report) => report.blockers),
      recommendations: [
        'Merged source/proof-positive reviewed rows across all local diagnostic artifacts for research-only rank expansion.',
        'Do not wire this aggregate into live scanner ranking, Discord posting, Supabase writes, or canExecute.',
      ],
      markdown: '',
    },
  };
}

function mergeOhlcOutcomeReports(reports: UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport[]): UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport | null {
  if (!reports.length) return null;
  const byTicket = new Map<string, UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport['rows'][number]>();
  for (const report of reports) {
    for (const row of report.rows) {
      if (!byTicket.has(row.ticketId)) byTicket.set(row.ticketId, row);
    }
  }
  const rows = [...byTicket.values()];
  const template = reports[0];
  return {
    ...template,
    generatedAt: new Date().toISOString(),
    source: {
      replayQueuePath: null,
      heldLocalAdapterPath: null,
      marketBarsJsonPath: null,
      auditDir: null,
    },
    summary: {
      queuedRows: rows.length,
      resolvedRows: rows.filter((row) => row.outcomeStatus === 'resolved').length,
      unresolvedRows: rows.filter((row) => row.outcomeStatus === 'unresolved').length,
      blockedRows: rows.filter((row) => row.outcomeStatus === 'blocked').length,
      grossResolvedOneMesPl: sum(rows.map((row) => row.resolvedOneMesPl)) ?? 0,
      historicalReviewResolvedOneMesPl: sum(rows.filter((row) => row.setupType === 'historicalReview').map((row) => row.resolvedOneMesPl)) ?? 0,
      NoInstalledSetupResolvedOneMesPl: sum(rows.filter((row) => row.setupType === 'NoInstalledSetup').map((row) => row.resolvedOneMesPl)) ?? 0,
      livePromotionAllowedRows: 0,
    },
    rows,
    blockers: reports.flatMap((report) => report.blockers),
    recommendations: [
      'Merged OHLC outcomes across local diagnostic artifacts for research-only rank expansion.',
    ],
    markdown: '',
  };
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewRankOverlayExpansionReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Rank Overlay Expansion',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only research expansion. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Expansion',
    `- Source/proof reports loaded: ${report.expansion.sourceProofReportsLoaded}.`,
    `- OHLC outcome reports loaded: ${report.expansion.ohlcOutcomeReportsLoaded}.`,
    `- Duplicate rows removed: ${report.expansion.duplicateRowsRemoved}.`,
    `- Newest source/proof rows: ${report.expansion.newestRows}.`,
    `- Expanded rows beyond newest: ${report.expansion.expandedRowsBeyondNewest}.`,
    '',
    '## Rank Summary',
    `- Evaluated rows: ${report.rankOverlay.summary.evaluatedRows}.`,
    `- Ranked rows: ${report.rankOverlay.summary.rankedRows}.`,
    `- Rejected rows: ${report.rankOverlay.summary.rejectedRows}.`,
    `- Top ranked row: ${report.rankOverlay.summary.topRankedRowId ?? '-'}.`,
    `- Ranked one-MES P/L: ${report.rankOverlay.summary.rankedOneMesPl ?? 'not available'}.`,
    `- Rejected one-MES P/L: ${report.rankOverlay.summary.rejectedOneMesPl ?? 'not available'}.`,
    `- Live promotion allowed rows: ${report.rankOverlay.summary.livePromotionAllowedRows}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewRankOverlayExpansionReport(args: {
  reportDir: string;
  sourceProofFilterPaths: string[];
  sourceProofFilterReports: UnifiedPositiveHeldLocalPreviewSourceProofFilterReport[];
  ohlcOutcomePaths: string[];
  ohlcOutcomeReports: UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport[];
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewRankOverlayExpansionReport {
  const newestRows = args.sourceProofFilterReports[0]?.rows.length ?? 0;
  const mergedSource = mergeSourceProofReports(args.sourceProofFilterReports);
  const mergedOutcome = mergeOhlcOutcomeReports(args.ohlcOutcomeReports);
  const newestSourceProofPath = args.sourceProofFilterPaths[0] || null;
  const rankOverlay = buildUnifiedPositiveHeldLocalPreviewRankOverlayReport({
    sourceProofFilterPath: args.sourceProofFilterPaths.length ? `${args.sourceProofFilterPaths.length} local source/proof reports` : null,
    sourceProofFilterReport: mergedSource.report,
    ohlcOutcomePath: args.ohlcOutcomePaths.length ? `${args.ohlcOutcomePaths.length} local OHLC outcome reports` : null,
    ohlcOutcomeReport: mergedOutcome,
  }, generatedAt);
  const expandedRowsBeyondNewest = Math.max(0, rankOverlay.summary.evaluatedRows - newestRows);
  const blockers = [
    !args.sourceProofFilterPaths.length ? 'no source/proof filter reports found' : null,
    !args.ohlcOutcomePaths.length ? 'no OHLC outcome reports found' : null,
    ...args.sourceProofFilterReports.filter((report) => report.status !== 'pass').map((report) => `source/proof report status ${report.status}`),
    ...args.ohlcOutcomeReports.filter((report) => report.status !== 'pass').map((report) => `OHLC outcome report status ${report.status}`),
    ...rankOverlay.blockers,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewRankOverlayExpansionReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_rank_overlay_expansion',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: rankOverlay.authority,
    source: {
      reportDir: args.reportDir,
      sourceProofFilterPaths: args.sourceProofFilterPaths,
      ohlcOutcomePaths: args.ohlcOutcomePaths,
    },
    expansion: {
      sourceProofReportsLoaded: args.sourceProofFilterReports.length,
      ohlcOutcomeReportsLoaded: args.ohlcOutcomeReports.length,
      duplicateRowsRemoved: mergedSource.duplicateRowsRemoved,
      newestSourceProofPath,
      newestRows,
      expandedRowsBeyondNewest,
    },
    rankOverlay,
    blockers,
    recommendations: blockers.length
      ? ['Do not use the expansion overlay until all local source/proof and OHLC outcome artifacts load cleanly.']
      : [
        'Use this expansion only to prioritize the next reviewed source/proof-positive research cases.',
        'Do not wire this aggregate score into live scanner ranking, Discord posting, Supabase writes, bridge behavior, or canExecute.',
        'If expanded rows beyond newest remains zero, the next step is to generate or ingest additional reviewed source/proof-positive artifacts before changing live behavior.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewRankOverlayExpansionReport(
  report: UnifiedPositiveHeldLocalPreviewRankOverlayExpansionReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string; rankOverlayJsonPath: string; rankOverlayMarkdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-rank-overlay-expansion-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  const rankOverlayPaths = writeUnifiedPositiveHeldLocalPreviewRankOverlayReport(report.rankOverlay, outDir);
  return {
    jsonPath,
    markdownPath,
    rankOverlayJsonPath: rankOverlayPaths.jsonPath,
    rankOverlayMarkdownPath: rankOverlayPaths.markdownPath,
  };
}

export function runUnifiedPositiveHeldLocalPreviewRankOverlayExpansionCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const sourceProofFilterPaths = matchingFiles(outDir, /^unified-positive-held-local-preview-source-proof-filter-\d+\.json$/);
  const ohlcOutcomePaths = matchingFiles(outDir, /^unified-positive-held-local-preview-ohlc-outcome-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewRankOverlayExpansionReport({
    reportDir: outDir,
    sourceProofFilterPaths,
    sourceProofFilterReports: sourceProofFilterPaths.map((filePath) => readJson<UnifiedPositiveHeldLocalPreviewSourceProofFilterReport>(filePath)),
    ohlcOutcomePaths,
    ohlcOutcomeReports: ohlcOutcomePaths.map((filePath) => readJson<UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport>(filePath)),
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewRankOverlayExpansionReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({
      ...paths,
      status: report.status,
      expansion: report.expansion,
      summary: report.rankOverlay.summary,
    }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
    console.log(`Rank overlay JSON: ${paths.rankOverlayJsonPath}`);
    console.log(`Rank overlay Markdown: ${paths.rankOverlayMarkdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runUnifiedPositiveHeldLocalPreviewRankOverlayExpansionCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
