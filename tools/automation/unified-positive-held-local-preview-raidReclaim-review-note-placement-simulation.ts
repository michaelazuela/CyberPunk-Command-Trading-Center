import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewraidReclaimReviewNoteWordingProbeReport,
} from './unified-positive-held-local-preview-raidReclaim-review-note-wording-probe';

type WordingRow = UnifiedPositiveHeldLocalPreviewraidReclaimReviewNoteWordingProbeReport['rows'][number];

interface PlacementRow {
  clusterId: string;
  placement: 'held_local_preview_notes';
  originalOrdinal: number;
  simulatedOrdinal: number;
  reason: string;
  session: string;
  direction: string;
  proposedNote: string;
  ticketVisibleBefore: true;
  ticketVisibleAfter: true;
  orderPreserved: boolean;
  suppressesTicket: false;
  changesRanking: false;
  changesCanExecute: false;
  changesEntryStopTargets: false;
  changesDiscordPosting: false;
  writesSupabase: false;
}

export interface UnifiedPositiveHeldLocalPreviewraidReclaimReviewNotePlacementSimulationReport {
  reportType: 'unified_positive_held_local_preview_raidReclaim_review_note_placement_simulation';
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
    reportDir: string;
    reviewNoteWordingProbePath: string | null;
  };
  assumptions: {
    placementSimulationIsResearchOnly: true;
    noPreviewUiChange: true;
    noReviewNoteInstalled: true;
    noTicketSuppression: true;
    noOrderChange: true;
    noRankChange: true;
    noCanExecuteChange: true;
    livePromotionAllowed: false;
  };
  summary: {
    wordingRowsRead: number;
    placementRows: number;
    visibleBeforeRows: number;
    visibleAfterRows: number;
    orderPreservedRows: number;
    suppressTicketRows: 0;
    rankingChangeRows: 0;
    canExecuteChangeRows: 0;
    entryStopTargetChangeRows: 0;
    discordPostingChangeRows: 0;
    supabaseWriteRows: 0;
    livePromotionAllowedRows: 0;
    recommendedAction: 'keep_research_only_placement_candidate' | 'reject_placement_simulation';
  };
  rows: PlacementRow[];
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

function authority(): UnifiedPositiveHeldLocalPreviewraidReclaimReviewNotePlacementSimulationReport['authority'] {
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

function placementRow(row: WordingRow, index: number): PlacementRow {
  const ordinal = index + 1;
  return {
    clusterId: row.clusterId,
    placement: 'held_local_preview_notes',
    originalOrdinal: ordinal,
    simulatedOrdinal: ordinal,
    reason: row.reason,
    session: row.session,
    direction: row.direction,
    proposedNote: row.proposedNote,
    ticketVisibleBefore: true,
    ticketVisibleAfter: true,
    orderPreserved: true,
    suppressesTicket: false,
    changesRanking: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    changesDiscordPosting: false,
    writesSupabase: false,
  };
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewraidReclaimReviewNotePlacementSimulationReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview raidReclaim Review Note Placement Simulation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only placement simulation. It does not change UI, install review notes, suppress tickets, alter ranking, change canExecute, post Discord, write Supabase, run setupScanner, or change entry/stop/target/risk rules.',
    '',
    '## Summary',
    `- Wording rows read: ${report.summary.wordingRowsRead}.`,
    `- Placement rows: ${report.summary.placementRows}.`,
    `- Visible before/after: ${report.summary.visibleBeforeRows}/${report.summary.visibleAfterRows}.`,
    `- Order-preserved rows: ${report.summary.orderPreservedRows}.`,
    `- Suppress-ticket rows: ${report.summary.suppressTicketRows}.`,
    `- Ranking-change rows: ${report.summary.rankingChangeRows}.`,
    `- canExecute-change rows: ${report.summary.canExecuteChangeRows}.`,
    `- Recommended action: ${report.summary.recommendedAction}.`,
    '',
    '## Placement Rows',
    '| Ordinal | Placement | Session | Side | Reason | Note |',
    '|---:|---|---|---|---|---|',
    ...report.rows.map((row) => `| ${row.simulatedOrdinal} | ${row.placement} | ${row.session} | ${row.direction} | ${escapeTable(row.reason)} | ${escapeTable(row.proposedNote)} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewraidReclaimReviewNotePlacementSimulationReport(args: {
  reportDir: string;
  reviewNoteWordingProbePath: string | null;
  reviewNoteWordingProbeReport: UnifiedPositiveHeldLocalPreviewraidReclaimReviewNoteWordingProbeReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewraidReclaimReviewNotePlacementSimulationReport {
  const wordingRows = args.reviewNoteWordingProbeReport?.rows || [];
  const rows = wordingRows.map(placementRow);
  const blockers = [
    !args.reviewNoteWordingProbePath ? 'missing raidReclaim review-note wording probe path' : null,
    !args.reviewNoteWordingProbeReport ? 'missing raidReclaim review-note wording probe report' : null,
    args.reviewNoteWordingProbeReport && args.reviewNoteWordingProbeReport.status !== 'pass' ? `raidReclaim review-note wording probe status ${args.reviewNoteWordingProbeReport.status}` : null,
    wordingRows.length === 0 ? 'no raidReclaim review-note wording rows found' : null,
    rows.some((row) => row.originalOrdinal !== row.simulatedOrdinal) ? 'placement simulation changed row order' : null,
    rows.some((row) => !row.ticketVisibleAfter) ? 'placement simulation hid at least one ticket' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewraidReclaimReviewNotePlacementSimulationReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_raidReclaim_review_note_placement_simulation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      reviewNoteWordingProbePath: args.reviewNoteWordingProbePath,
    },
    assumptions: {
      placementSimulationIsResearchOnly: true,
      noPreviewUiChange: true,
      noReviewNoteInstalled: true,
      noTicketSuppression: true,
      noOrderChange: true,
      noRankChange: true,
      noCanExecuteChange: true,
      livePromotionAllowed: false,
    },
    summary: {
      wordingRowsRead: wordingRows.length,
      placementRows: rows.length,
      visibleBeforeRows: rows.filter((row) => row.ticketVisibleBefore).length,
      visibleAfterRows: rows.filter((row) => row.ticketVisibleAfter).length,
      orderPreservedRows: rows.filter((row) => row.orderPreserved).length,
      suppressTicketRows: 0,
      rankingChangeRows: 0,
      canExecuteChangeRows: 0,
      entryStopTargetChangeRows: 0,
      discordPostingChangeRows: 0,
      supabaseWriteRows: 0,
      livePromotionAllowedRows: 0,
      recommendedAction: blockers.length ? 'reject_placement_simulation' : 'keep_research_only_placement_candidate',
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not use placement simulation until wording probe is present and passing.']
      : [
        'Keep placement as a research-only candidate until a separate approved UI wording phase.',
        'Placement belongs in held-local preview notes only; do not wire into ranking, canExecute, Discord, Supabase, or scanner behavior.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewraidReclaimReviewNotePlacementSimulationReport(
  report: UnifiedPositiveHeldLocalPreviewraidReclaimReviewNotePlacementSimulationReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-raidReclaim-review-note-placement-simulation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewraidReclaimReviewNotePlacementSimulationCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const reviewNoteWordingProbePath = readFlag(args, '--review-note-wording-probe') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-raidReclaim-review-note-wording-probe-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewraidReclaimReviewNotePlacementSimulationReport({
    reportDir: outDir,
    reviewNoteWordingProbePath,
    reviewNoteWordingProbeReport: reviewNoteWordingProbePath && fs.existsSync(reviewNoteWordingProbePath)
      ? JSON.parse(fs.readFileSync(reviewNoteWordingProbePath, 'utf8')) as UnifiedPositiveHeldLocalPreviewraidReclaimReviewNoteWordingProbeReport
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewraidReclaimReviewNotePlacementSimulationReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewraidReclaimReviewNotePlacementSimulationCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
