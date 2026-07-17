import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewReviewRollupReport } from './unified-positive-held-local-preview-review-rollup';

export type UnifiedPositiveHeldLocalPreviewDecisionAction =
  | 'hold_for_manual_review'
  | 'keep_local_review_only'
  | 'request_more_chart_evidence'
  | 'exclude_from_research_queue'
  | 'queue_for_replay_research';

export interface UnifiedPositiveHeldLocalPreviewDecisionSummaryReport {
  reportType: 'unified_positive_held_local_preview_decision_summary';
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
    rollupPath: string | null;
  };
  summary: {
    rollupRows: number;
    holdForManualReviewRows: number;
    keepLocalReviewOnlyRows: number;
    requestMoreChartEvidenceRows: number;
    excludedFromResearchQueueRows: number;
    queuedForReplayResearchRows: number;
    livePromotionAllowedRows: number;
  };
  rows: Array<{
    ticketId: string;
    setupType: string;
    direction: string;
    noteDisposition: string;
    decisionAction: UnifiedPositiveHeldLocalPreviewDecisionAction;
    researchOnly: true;
    livePromotionAllowed: false;
    nextStep: string;
    boundary: string;
  }>;
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

function latestRollupPath(reportDir: string): string | null {
  if (!fs.existsSync(reportDir)) return null;
  const matches = fs.readdirSync(reportDir)
    .filter((name) => /^unified-positive-held-local-preview-review-rollup-\d+\.json$/.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
}

function authority(): UnifiedPositiveHeldLocalPreviewDecisionSummaryReport['authority'] {
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

function decisionActionForDisposition(disposition: string): UnifiedPositiveHeldLocalPreviewDecisionAction {
  switch (disposition) {
    case 'keep_review_only':
      return 'keep_local_review_only';
    case 'needs_more_chart_evidence':
      return 'request_more_chart_evidence';
    case 'reject_preview':
      return 'exclude_from_research_queue';
    case 'candidate_for_later_research':
      return 'queue_for_replay_research';
    case 'unreviewed':
    default:
      return 'hold_for_manual_review';
  }
}

function nextStepForAction(action: UnifiedPositiveHeldLocalPreviewDecisionAction): string {
  switch (action) {
    case 'keep_local_review_only':
      return 'Keep the case visible only as local review context; do not promote it to replay or live behavior.';
    case 'request_more_chart_evidence':
      return 'Collect a separate chart-evidence pack before considering replay research.';
    case 'exclude_from_research_queue':
      return 'Exclude the preview case from the next research queue unless new evidence is added.';
    case 'queue_for_replay_research':
      return 'Queue for a separate read-only replay research run; this does not approve scanner-visible behavior.';
    case 'hold_for_manual_review':
    default:
      return 'Hold until a reviewer records a supported local disposition.';
  }
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewDecisionSummaryReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Decision Summary',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only decision summary. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change app runtime behavior, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Rollup path: ${report.source.rollupPath || '-'}.`,
    `- Rollup rows: ${report.summary.rollupRows}.`,
    `- Hold for manual review: ${report.summary.holdForManualReviewRows}.`,
    `- Keep local review only: ${report.summary.keepLocalReviewOnlyRows}.`,
    `- Request more chart evidence: ${report.summary.requestMoreChartEvidenceRows}.`,
    `- Excluded from research queue: ${report.summary.excludedFromResearchQueueRows}.`,
    `- Queued for replay research: ${report.summary.queuedForReplayResearchRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Rows',
    '| Ticket | Setup | Side | Disposition | Decision Action | Next Step | Boundary |',
    '|---|---|---|---|---|---|---|',
    ...report.rows.map((row) => `| ${escapeTable(row.ticketId)} | ${escapeTable(row.setupType)} | ${row.direction} | ${escapeTable(row.noteDisposition)} | ${row.decisionAction} | ${escapeTable(row.nextStep)} | ${escapeTable(row.boundary)} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewDecisionSummaryReport(args: {
  rollupPath: string | null;
  rollupReport: UnifiedPositiveHeldLocalPreviewReviewRollupReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewDecisionSummaryReport {
  const rollupRows = args.rollupReport?.rows || [];
  const rows = rollupRows.map((row) => {
    const decisionAction = decisionActionForDisposition(row.noteDisposition);
    return {
      ticketId: row.ticketId,
      setupType: row.setupType,
      direction: row.direction,
      noteDisposition: row.noteDisposition,
      decisionAction,
      researchOnly: true as const,
      livePromotionAllowed: false as const,
      nextStep: nextStepForAction(decisionAction),
      boundary: 'Research decision only. No live promotion, no canExecute change, no Discord post, no Supabase write, no scanner behavior change.',
    };
  });
  const blockers = [
    !args.rollupPath ? 'missing review rollup path' : null,
    !args.rollupReport ? 'missing review rollup report' : null,
    args.rollupReport && args.rollupReport.status !== 'pass' ? `review rollup status ${args.rollupReport.status}` : null,
    rows.length === 0 ? 'no decision-summary rows found' : null,
    ...rollupRows.flatMap((row) => [
      row.reviewOnly !== true ? `${row.ticketId} rollup reviewOnly is not true` : null,
      row.livePromotionAllowed !== false ? `${row.ticketId} rollup livePromotionAllowed is not false` : null,
      row.noteValid !== true ? `${row.ticketId} rollup note validation is not true` : null,
    ]),
    ...rows.flatMap((row) => [
      row.researchOnly !== true ? `${row.ticketId} researchOnly is not true` : null,
      row.livePromotionAllowed !== false ? `${row.ticketId} decision livePromotionAllowed is not false` : null,
    ]),
  ].filter((item): item is string => Boolean(item));

  const count = (action: UnifiedPositiveHeldLocalPreviewDecisionAction) => rows.filter((row) => row.decisionAction === action).length;
  const base: Omit<UnifiedPositiveHeldLocalPreviewDecisionSummaryReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_decision_summary',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      rollupPath: args.rollupPath,
    },
    summary: {
      rollupRows: rollupRows.length,
      holdForManualReviewRows: count('hold_for_manual_review'),
      keepLocalReviewOnlyRows: count('keep_local_review_only'),
      requestMoreChartEvidenceRows: count('request_more_chart_evidence'),
      excludedFromResearchQueueRows: count('exclude_from_research_queue'),
      queuedForReplayResearchRows: count('queue_for_replay_research'),
      livePromotionAllowedRows: rows.filter((row) => row.livePromotionAllowed !== false).length,
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not use the decision summary until the rollup passes and every row remains research-only.']
      : ['Use this as local research triage only; queued replay research still needs a separate read-only replay run and approval before any scanner-visible change.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewDecisionSummaryReport(
  report: UnifiedPositiveHeldLocalPreviewDecisionSummaryReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-decision-summary-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewDecisionSummaryCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const rollupPath = readFlag(args, '--rollup') || latestRollupPath(outDir);
  const rollupReport = rollupPath && fs.existsSync(rollupPath)
    ? JSON.parse(fs.readFileSync(rollupPath, 'utf8')) as UnifiedPositiveHeldLocalPreviewReviewRollupReport
    : null;
  const report = buildUnifiedPositiveHeldLocalPreviewDecisionSummaryReport({
    rollupPath,
    rollupReport,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewDecisionSummaryReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewDecisionSummaryCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
