import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewSourceProofFilterReport,
  UnifiedPositiveHeldLocalPreviewSourceProofFilterRow,
} from './unified-positive-held-local-preview-source-proof-filter';
import type { UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport } from './unified-positive-held-local-preview-ohlc-outcome';

type RankBucket = 'source_proof_ranked_research' | 'broad_non_strict_rejected';

export interface UnifiedPositiveHeldLocalPreviewRankOverlayRow {
  rank: number | null;
  rowId: string;
  setupType: string;
  tradeDate: string | null;
  session: string | null;
  direction: string | null;
  bucket: RankBucket;
  outcomeOneMesPl: number | null;
  riskPoints: number | null;
  maximumFavorableExcursion: number | null;
  maximumAdverseExcursion: number | null;
  resolvedR: number | null;
  sourceProofAccepted: boolean;
  rankScore: number | null;
  scoreBreakdown: {
    sourceProof: number;
    outcome: number;
    mfeMae: number;
    riskQuality: number;
  };
  notes: string[];
}

export interface UnifiedPositiveHeldLocalPreviewRankOverlayReport {
  reportType: 'unified_positive_held_local_preview_rank_overlay';
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
    sourceProofFilterPath: string | null;
    ohlcOutcomePath: string | null;
  };
  supabaseBookmark: {
    rlsautotest: {
      bookmarked: true;
      recommendedPhase: 'later_supabase_rls_audit';
      reason: string;
      actionNow: 'none';
      readsSupabase: false;
      writesSupabase: false;
      installsPackage: false;
    };
  };
  summary: {
    evaluatedRows: number;
    rankedRows: number;
    rejectedRows: number;
    topRankedRowId: string | null;
    topRankedSetupType: string | null;
    rankedOneMesPl: number | null;
    rejectedOneMesPl: number | null;
    removeModelRecommendations: 0;
    broadenLiveBehaviorRecommendations: 0;
    changeCanExecuteRecommendations: 0;
    livePromotionAllowedRows: 0;
  };
  rows: UnifiedPositiveHeldLocalPreviewRankOverlayRow[];
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

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  const matches = fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function authority(): UnifiedPositiveHeldLocalPreviewRankOverlayReport['authority'] {
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function outcomeByTicket(report: UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport | null): Map<string, UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport['rows'][number]> {
  return new Map((report?.rows || []).map((row) => [row.ticketId, row]));
}

function scoreAccepted(row: UnifiedPositiveHeldLocalPreviewSourceProofFilterRow, outcome: UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport['rows'][number] | undefined): UnifiedPositiveHeldLocalPreviewRankOverlayRow['scoreBreakdown'] {
  const pl = row.outcomeOneMesPl ?? 0;
  const risk = outcome?.riskPoints ?? null;
  const mfe = outcome?.maximumFavorableExcursion ?? null;
  const mae = outcome?.maximumAdverseExcursion ?? null;
  const sourceProof = 60;
  const outcomeScore = clamp(pl / 5, 0, 25);
  const mfeMae = mfe === null || mae === null
    ? 0
    : clamp((mfe - mae) / 4, -10, 10);
  const riskQuality = risk === null
    ? 0
    : risk <= 10
      ? 5
      : risk <= 20
        ? 2.5
        : 0;
  return {
    sourceProof,
    outcome: round(outcomeScore),
    mfeMae: round(mfeMae),
    riskQuality,
  };
}

function buildRankRow(
  row: UnifiedPositiveHeldLocalPreviewSourceProofFilterRow,
  outcome: UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport['rows'][number] | undefined,
): Omit<UnifiedPositiveHeldLocalPreviewRankOverlayRow, 'rank'> {
  const accepted = row.decision === 'accepted_for_research_validation';
  const breakdown = accepted
    ? scoreAccepted(row, outcome)
    : { sourceProof: 0, outcome: 0, mfeMae: 0, riskQuality: 0 };
  const rankScore = accepted
    ? round(breakdown.sourceProof + breakdown.outcome + breakdown.mfeMae + breakdown.riskQuality)
    : null;
  return {
    rowId: row.rowId,
    setupType: row.setupType,
    tradeDate: row.tradeDate,
    session: row.session,
    direction: row.direction,
    bucket: accepted ? 'source_proof_ranked_research' : 'broad_non_strict_rejected',
    outcomeOneMesPl: row.outcomeOneMesPl,
    riskPoints: outcome?.riskPoints ?? null,
    maximumFavorableExcursion: outcome?.maximumFavorableExcursion ?? null,
    maximumAdverseExcursion: outcome?.maximumAdverseExcursion ?? null,
    resolvedR: outcome?.resolvedR ?? null,
    sourceProofAccepted: accepted,
    rankScore,
    scoreBreakdown: breakdown,
    notes: accepted
      ? ['Source/proof accepted for research ranking only.', 'Not live promotion and not canExecute evidence.']
      : ['Rejected by source/proof filter before research ranking.', ...row.rejectionReasons],
  };
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewRankOverlayReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Rank Overlay',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only research rank overlay. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Supabase Bookmark',
    `- rlsautotest: bookmarked=${report.supabaseBookmark.rlsautotest.bookmarked}; phase=${report.supabaseBookmark.rlsautotest.recommendedPhase}; action now=${report.supabaseBookmark.rlsautotest.actionNow}.`,
    '',
    '## Summary',
    `- Evaluated rows: ${report.summary.evaluatedRows}.`,
    `- Ranked rows: ${report.summary.rankedRows}.`,
    `- Rejected rows: ${report.summary.rejectedRows}.`,
    `- Top ranked row: ${report.summary.topRankedRowId ?? '-'}.`,
    `- Ranked one-MES P/L: ${report.summary.rankedOneMesPl ?? 'not available'}.`,
    `- Rejected one-MES P/L: ${report.summary.rejectedOneMesPl ?? 'not available'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Rows',
    '| Rank | Row | Bucket | Setup | Date | Session | Side | P/L | Risk | MFE | MAE | Score | Notes |',
    '|---:|---|---|---|---|---|---|---:|---:|---:|---:|---:|---|',
    ...report.rows.map((row) => `| ${row.rank ?? '-'} | ${escapeTable(row.rowId)} | ${row.bucket} | ${row.setupType} | ${row.tradeDate ?? '-'} | ${row.session ?? '-'} | ${row.direction ?? '-'} | ${row.outcomeOneMesPl ?? '-'} | ${row.riskPoints ?? '-'} | ${row.maximumFavorableExcursion ?? '-'} | ${row.maximumAdverseExcursion ?? '-'} | ${row.rankScore ?? '-'} | ${escapeTable(row.notes.join('; '))} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewRankOverlayReport(args: {
  sourceProofFilterPath: string | null;
  sourceProofFilterReport: UnifiedPositiveHeldLocalPreviewSourceProofFilterReport | null;
  ohlcOutcomePath: string | null;
  ohlcOutcomeReport: UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewRankOverlayReport {
  const outcomeRows = outcomeByTicket(args.ohlcOutcomeReport);
  const rawRows = (args.sourceProofFilterReport?.rows || []).map((row) => buildRankRow(row, outcomeRows.get(row.rowId)));
  const sorted = [...rawRows].sort((a, b) => {
    if (a.rankScore === null && b.rankScore === null) return a.rowId.localeCompare(b.rowId);
    if (a.rankScore === null) return 1;
    if (b.rankScore === null) return -1;
    return b.rankScore - a.rankScore || (b.outcomeOneMesPl ?? 0) - (a.outcomeOneMesPl ?? 0);
  });
  const rows = sorted.map((row, index) => ({
    rank: row.rankScore === null ? null : index + 1,
    ...row,
  }));
  const rankedRows = rows.filter((row) => row.bucket === 'source_proof_ranked_research');
  const rejectedRows = rows.filter((row) => row.bucket === 'broad_non_strict_rejected');
  const blockers = [
    !args.sourceProofFilterPath ? 'missing source/proof filter path' : null,
    !args.sourceProofFilterReport ? 'missing source/proof filter report' : null,
    args.sourceProofFilterReport && args.sourceProofFilterReport.status !== 'pass' ? `source/proof filter status ${args.sourceProofFilterReport.status}` : null,
    !args.ohlcOutcomePath ? 'missing OHLC outcome path' : null,
    !args.ohlcOutcomeReport ? 'missing OHLC outcome report' : null,
    args.ohlcOutcomeReport && args.ohlcOutcomeReport.status !== 'pass' ? `OHLC outcome status ${args.ohlcOutcomeReport.status}` : null,
    rows.length === 0 ? 'no rows available for rank overlay' : null,
    rankedRows.length !== (args.sourceProofFilterReport?.summary.acceptedRows ?? rankedRows.length) ? 'ranked row count does not match accepted source/proof rows' : null,
    rejectedRows.length !== (args.sourceProofFilterReport?.summary.rejectedRows ?? rejectedRows.length) ? 'rejected row count does not match rejected source/proof rows' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewRankOverlayReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_rank_overlay',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      sourceProofFilterPath: args.sourceProofFilterPath,
      ohlcOutcomePath: args.ohlcOutcomePath,
    },
    supabaseBookmark: {
      rlsautotest: {
        bookmarked: true,
        recommendedPhase: 'later_supabase_rls_audit',
        reason: 'Potentially useful to generate pgTAP-style RLS tests for journal/RAG/review tables after the research/ranking pipeline stabilizes.',
        actionNow: 'none',
        readsSupabase: false,
        writesSupabase: false,
        installsPackage: false,
      },
    },
    summary: {
      evaluatedRows: rows.length,
      rankedRows: rankedRows.length,
      rejectedRows: rejectedRows.length,
      topRankedRowId: rankedRows[0]?.rowId || null,
      topRankedSetupType: rankedRows[0]?.setupType || null,
      rankedOneMesPl: sum(rankedRows.map((row) => row.outcomeOneMesPl)),
      rejectedOneMesPl: sum(rejectedRows.map((row) => row.outcomeOneMesPl)),
      removeModelRecommendations: 0,
      broadenLiveBehaviorRecommendations: 0,
      changeCanExecuteRecommendations: 0,
      livePromotionAllowedRows: 0,
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not use this rank overlay until source/proof and OHLC outcome artifacts load cleanly.']
      : [
        'Use this overlay as research-only ordering for reviewed candidates.',
        'Do not wire this score into live scanner ranking, Discord posting, Supabase writes, or canExecute.',
        'Bookmark rlsautotest for a later Supabase RLS audit phase; take no package or database action now.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewRankOverlayReport(
  report: UnifiedPositiveHeldLocalPreviewRankOverlayReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-rank-overlay-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewRankOverlayCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const sourceProofFilterPath = readFlag(args, '--source-proof-filter') || latestMatchingFile(outDir, /^unified-positive-held-local-preview-source-proof-filter-\d+\.json$/);
  const ohlcOutcomePath = readFlag(args, '--ohlc-outcome') || latestMatchingFile(outDir, /^unified-positive-held-local-preview-ohlc-outcome-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewRankOverlayReport({
    sourceProofFilterPath,
    sourceProofFilterReport: sourceProofFilterPath && fs.existsSync(sourceProofFilterPath)
      ? JSON.parse(fs.readFileSync(sourceProofFilterPath, 'utf8')) as UnifiedPositiveHeldLocalPreviewSourceProofFilterReport
      : null,
    ohlcOutcomePath,
    ohlcOutcomeReport: ohlcOutcomePath && fs.existsSync(ohlcOutcomePath)
      ? JSON.parse(fs.readFileSync(ohlcOutcomePath, 'utf8')) as UnifiedPositiveHeldLocalPreviewOhlcOutcomeReport
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewRankOverlayReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewRankOverlayCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
