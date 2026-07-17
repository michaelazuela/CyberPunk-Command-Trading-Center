import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewReviewChecklistReport,
  UnifiedPositiveHeldLocalPreviewReviewChecklistRow,
} from './unified-positive-held-local-preview-review-checklist';

export interface UnifiedPositiveHeldLocalPreviewNoteTemplateRow {
  ticketId: string;
  setupType: string;
  direction: string;
  visibleInHiddenTab: boolean;
  reviewOnly: true;
  reviewerNote: '';
  suggestedDisposition: 'unreviewed';
  allowedDispositions: Array<'keep_review_only' | 'needs_more_chart_evidence' | 'reject_preview' | 'candidate_for_later_research'>;
  boundaryReminder: string;
}

export interface UnifiedPositiveHeldLocalPreviewNoteTemplateReport {
  reportType: 'unified_positive_held_local_preview_note_template';
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
    checklistPath: string | null;
  };
  summary: {
    checklistRows: number;
    noteRows: number;
    unreviewedRows: number;
    reviewOnlyRows: number;
  };
  rows: UnifiedPositiveHeldLocalPreviewNoteTemplateRow[];
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

function latestChecklistPath(reportDir: string): string | null {
  if (!fs.existsSync(reportDir)) return null;
  const matches = fs.readdirSync(reportDir)
    .filter((name) => /^unified-positive-held-local-preview-review-checklist-\d+\.json$/.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
}

function authority(): UnifiedPositiveHeldLocalPreviewNoteTemplateReport['authority'] {
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

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function rowFromChecklist(row: UnifiedPositiveHeldLocalPreviewReviewChecklistRow): UnifiedPositiveHeldLocalPreviewNoteTemplateRow {
  return {
    ticketId: row.ticketId,
    setupType: row.setupType,
    direction: row.direction,
    visibleInHiddenTab: row.visibleInHiddenTab,
    reviewOnly: true,
    reviewerNote: '',
    suggestedDisposition: 'unreviewed',
    allowedDispositions: [
      'keep_review_only',
      'needs_more_chart_evidence',
      'reject_preview',
      'candidate_for_later_research',
    ],
    boundaryReminder: 'Local note only. Does not approve execution, change canExecute, post Discord, write Supabase, or change scanner behavior.',
  };
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewNoteTemplateReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Note Template',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only note template. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change app runtime behavior, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Checklist path: ${report.source.checklistPath || '-'}.`,
    `- Checklist rows: ${report.summary.checklistRows}.`,
    `- Note rows: ${report.summary.noteRows}.`,
    `- Unreviewed rows: ${report.summary.unreviewedRows}.`,
    `- Review-only rows: ${report.summary.reviewOnlyRows}.`,
    '',
    '## Note Rows',
    '| Ticket | Setup | Side | Disposition | Reviewer Note | Boundary |',
    '|---|---|---|---|---|---|',
    ...report.rows.map((row) => `| ${escapeTable(row.ticketId)} | ${escapeTable(row.setupType)} | ${row.direction} | ${row.suggestedDisposition} | ${escapeTable(row.reviewerNote || '<blank>')} | ${escapeTable(row.boundaryReminder)} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewNoteTemplateReport(args: {
  checklistPath: string | null;
  checklistReport: UnifiedPositiveHeldLocalPreviewReviewChecklistReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewNoteTemplateReport {
  const checklistRows = args.checklistReport?.rows || [];
  const rows = checklistRows.map(rowFromChecklist);
  const blockers = [
    !args.checklistPath ? 'missing review checklist path' : null,
    !args.checklistReport ? 'missing review checklist report' : null,
    args.checklistReport && args.checklistReport.status !== 'pass' ? `review checklist status ${args.checklistReport.status}` : null,
    rows.length === 0 ? 'no checklist rows available for note template' : null,
    ...rows.flatMap((row) => [
      !row.visibleInHiddenTab ? `${row.ticketId} is not visible in hidden tab` : null,
      row.reviewOnly !== true ? `${row.ticketId} reviewOnly is not true` : null,
      row.suggestedDisposition !== 'unreviewed' ? `${row.ticketId} suggestedDisposition is not unreviewed` : null,
    ]),
  ].filter((item): item is string => Boolean(item));

  const base: Omit<UnifiedPositiveHeldLocalPreviewNoteTemplateReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_note_template',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      checklistPath: args.checklistPath,
    },
    summary: {
      checklistRows: checklistRows.length,
      noteRows: rows.length,
      unreviewedRows: rows.filter((row) => row.suggestedDisposition === 'unreviewed').length,
      reviewOnlyRows: rows.filter((row) => row.reviewOnly === true).length,
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not use the note template until the review checklist passes and every row is visible in the hidden local tab.']
      : ['Use this ignored local template for manual notes only; keep any promotion or live behavior decision in a separate approved phase.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewNoteTemplateReport(
  report: UnifiedPositiveHeldLocalPreviewNoteTemplateReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string; editableTemplatePath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-note-template-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  const editableTemplatePath = path.join(outDir, `${base}.editable.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  fs.writeFileSync(editableTemplatePath, `${JSON.stringify({ rows: report.rows }, null, 2)}\n`, 'utf8');
  return { jsonPath, markdownPath, editableTemplatePath };
}

export function runUnifiedPositiveHeldLocalPreviewNoteTemplateCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const checklistPath = readFlag(args, '--checklist') || latestChecklistPath(outDir);
  const checklistReport = checklistPath && fs.existsSync(checklistPath)
    ? JSON.parse(fs.readFileSync(checklistPath, 'utf8')) as UnifiedPositiveHeldLocalPreviewReviewChecklistReport
    : null;
  const report = buildUnifiedPositiveHeldLocalPreviewNoteTemplateReport({
    checklistPath,
    checklistReport,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewNoteTemplateReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
    console.log(`Editable template: ${paths.editableTemplatePath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runUnifiedPositiveHeldLocalPreviewNoteTemplateCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
