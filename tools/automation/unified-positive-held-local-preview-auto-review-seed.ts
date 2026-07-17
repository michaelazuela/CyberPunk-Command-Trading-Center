import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewReviewChecklistReport } from './unified-positive-held-local-preview-review-checklist';
import type { UnifiedPositiveHeldLocalPreviewNoteTemplateRow } from './unified-positive-held-local-preview-note-template';

type AutoReviewDisposition = 'candidate_for_later_research' | 'needs_more_chart_evidence' | 'keep_review_only';

interface AutoReviewedNoteRow extends Omit<UnifiedPositiveHeldLocalPreviewNoteTemplateRow, 'reviewerNote' | 'suggestedDisposition'> {
  reviewerNote: string;
  suggestedDisposition: AutoReviewDisposition;
}

export interface UnifiedPositiveHeldLocalPreviewAutoReviewSeedReport {
  reportType: 'unified_positive_held_local_preview_auto_review_seed';
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
    editableTemplatePath: string | null;
  };
  summary: {
    checklistRows: number;
    templateRows: number;
    autoReviewedRows: number;
    candidateForLaterResearchRows: number;
    needsMoreChartEvidenceRows: number;
    keepReviewOnlyRows: number;
  };
  rows: Array<{
    ticketId: string;
    setupType: string;
    direction: string;
    suggestedDisposition: AutoReviewDisposition;
    reviewerNote: string;
    reason: string;
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

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  const matches = fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
}

function authority(): UnifiedPositiveHeldLocalPreviewAutoReviewSeedReport['authority'] {
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

function normalizeTemplateRows(raw: unknown): UnifiedPositiveHeldLocalPreviewNoteTemplateRow[] {
  if (!raw || typeof raw !== 'object') return [];
  const rows = (raw as { rows?: unknown }).rows;
  return Array.isArray(rows) ? rows as UnifiedPositiveHeldLocalPreviewNoteTemplateRow[] : [];
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewAutoReviewSeedReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Auto Review Seed',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only auto review seed. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change app runtime behavior, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Checklist path: ${report.source.checklistPath || '-'}.`,
    `- Editable template path: ${report.source.editableTemplatePath || '-'}.`,
    `- Checklist rows: ${report.summary.checklistRows}.`,
    `- Template rows: ${report.summary.templateRows}.`,
    `- Auto-reviewed rows: ${report.summary.autoReviewedRows}.`,
    `- Candidate-for-later-research rows: ${report.summary.candidateForLaterResearchRows}.`,
    `- Needs-more-chart-evidence rows: ${report.summary.needsMoreChartEvidenceRows}.`,
    `- Keep-review-only rows: ${report.summary.keepReviewOnlyRows}.`,
    '',
    '## Rows',
    '| Ticket | Setup | Side | Disposition | Reason |',
    '|---|---|---|---|---|',
    ...report.rows.map((row) => `| ${escapeTable(row.ticketId)} | ${escapeTable(row.setupType)} | ${row.direction} | ${row.suggestedDisposition} | ${escapeTable(row.reason)} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

function dispositionForRow(args: {
  templateRow: UnifiedPositiveHeldLocalPreviewNoteTemplateRow;
  checklistRow: UnifiedPositiveHeldLocalPreviewReviewChecklistReport['rows'][number] | undefined;
}): { disposition: AutoReviewDisposition; reason: string } {
  const { templateRow, checklistRow } = args;
  if (!checklistRow) {
    return { disposition: 'needs_more_chart_evidence', reason: 'No matching checklist row was found for this local preview row.' };
  }
  const safeForReplayQueue = checklistRow.visibleInHiddenTab === true
    && checklistRow.reviewOnly === true
    && checklistRow.canExecute === false
    && checklistRow.postable === false
    && checklistRow.publishDiscord === false
    && checklistRow.writesSupabase === false
    && templateRow.visibleInHiddenTab === true
    && templateRow.reviewOnly === true;
  if (safeForReplayQueue) {
    return {
      disposition: 'candidate_for_later_research',
      reason: 'Local artifact chain confirms the row is visible, review-only, canExecute=false, Discord-disabled, Supabase-disabled, and safe to queue for read-only replay research.',
    };
  }
  if (templateRow.visibleInHiddenTab !== true || checklistRow.visibleInHiddenTab !== true) {
    return { disposition: 'needs_more_chart_evidence', reason: 'The preview row is not confirmed visible in the hidden local review surface.' };
  }
  return { disposition: 'keep_review_only', reason: 'The row did not satisfy every local replay-queue boundary and remains review-only.' };
}

export function buildUnifiedPositiveHeldLocalPreviewAutoReviewSeedReport(args: {
  checklistPath: string | null;
  checklistReport: UnifiedPositiveHeldLocalPreviewReviewChecklistReport | null;
  editableTemplatePath: string | null;
  editableTemplate: unknown;
}, generatedAt = new Date().toISOString()): { report: UnifiedPositiveHeldLocalPreviewAutoReviewSeedReport; editableRows: AutoReviewedNoteRow[] } {
  const templateRows = normalizeTemplateRows(args.editableTemplate);
  const checklistRowsByTicket = new Map((args.checklistReport?.rows || []).map((row) => [row.ticketId, row]));
  const rows = templateRows.map((templateRow) => {
    const checklistRow = checklistRowsByTicket.get(templateRow.ticketId);
    const decision = dispositionForRow({ templateRow, checklistRow });
    return {
      ticketId: templateRow.ticketId,
      setupType: templateRow.setupType,
      direction: templateRow.direction,
      suggestedDisposition: decision.disposition,
      reviewerNote: decision.reason,
      reason: decision.reason,
    };
  });
  const editableRows: AutoReviewedNoteRow[] = templateRows.map((templateRow) => {
    const row = rows.find((item) => item.ticketId === templateRow.ticketId);
    return {
      ...templateRow,
      reviewerNote: row?.reviewerNote || 'Auto review seed could not map this row; keep review-only until evidence is repaired.',
      suggestedDisposition: row?.suggestedDisposition || 'keep_review_only',
    };
  });
  const blockers = [
    !args.checklistPath ? 'missing review checklist path' : null,
    !args.checklistReport ? 'missing review checklist report' : null,
    args.checklistReport && args.checklistReport.status !== 'pass' ? `review checklist status ${args.checklistReport.status}` : null,
    !args.editableTemplatePath ? 'missing editable template path' : null,
    templateRows.length === 0 ? 'no editable note rows found' : null,
    args.checklistReport && templateRows.length !== args.checklistReport.rows.length ? `template rows ${templateRows.length} did not match checklist rows ${args.checklistReport.rows.length}` : null,
    ...editableRows.flatMap((row) => [
      !row.reviewerNote.trim() ? `${row.ticketId} reviewerNote is empty` : null,
      !row.allowedDispositions.includes(row.suggestedDisposition) ? `${row.ticketId} disposition ${row.suggestedDisposition} is not allowed` : null,
      !String(row.boundaryReminder || '').includes('Does not approve execution') ? `${row.ticketId} boundary reminder missing no-execution language` : null,
      !String(row.boundaryReminder || '').includes('write Supabase') ? `${row.ticketId} boundary reminder missing no-Supabase-write language` : null,
      !String(row.boundaryReminder || '').includes('post Discord') ? `${row.ticketId} boundary reminder missing no-Discord-post language` : null,
    ]),
  ].filter((item): item is string => Boolean(item));

  const count = (disposition: AutoReviewDisposition) => rows.filter((row) => row.suggestedDisposition === disposition).length;
  const base: Omit<UnifiedPositiveHeldLocalPreviewAutoReviewSeedReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_auto_review_seed',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      checklistPath: args.checklistPath,
      editableTemplatePath: args.editableTemplatePath,
    },
    summary: {
      checklistRows: args.checklistReport?.rows.length || 0,
      templateRows: templateRows.length,
      autoReviewedRows: editableRows.length,
      candidateForLaterResearchRows: count('candidate_for_later_research'),
      needsMoreChartEvidenceRows: count('needs_more_chart_evidence'),
      keepReviewOnlyRows: count('keep_review_only'),
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not feed auto-reviewed notes into the validator until every blocker is resolved.']
      : ['Feed the auto-reviewed editable notes into note validation, then rerun rollup, decision summary, and handoff to queue read-only replay research rows.'],
  };
  return { report: { ...base, markdown: buildMarkdown(base) }, editableRows };
}

export function writeUnifiedPositiveHeldLocalPreviewAutoReviewSeedReport(
  report: UnifiedPositiveHeldLocalPreviewAutoReviewSeedReport,
  editableRows: AutoReviewedNoteRow[],
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string; editableNotesPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-auto-review-seed-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  const editableNotesPath = path.join(outDir, `${base}.auto-reviewed.editable.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  fs.writeFileSync(editableNotesPath, `${JSON.stringify({ rows: editableRows }, null, 2)}\n`, 'utf8');
  return { jsonPath, markdownPath, editableNotesPath };
}

export function runUnifiedPositiveHeldLocalPreviewAutoReviewSeedCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const checklistPath = readFlag(args, '--checklist') || latestMatchingFile(outDir, /^unified-positive-held-local-preview-review-checklist-\d+\.json$/);
  const editableTemplatePath = readFlag(args, '--notes') || latestMatchingFile(outDir, /^unified-positive-held-local-preview-note-template-\d+\.editable\.json$/);
  const checklistReport = checklistPath && fs.existsSync(checklistPath)
    ? JSON.parse(fs.readFileSync(checklistPath, 'utf8')) as UnifiedPositiveHeldLocalPreviewReviewChecklistReport
    : null;
  const editableTemplate = editableTemplatePath && fs.existsSync(editableTemplatePath)
    ? JSON.parse(fs.readFileSync(editableTemplatePath, 'utf8')) as unknown
    : null;
  const { report, editableRows } = buildUnifiedPositiveHeldLocalPreviewAutoReviewSeedReport({
    checklistPath,
    checklistReport,
    editableTemplatePath,
    editableTemplate,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewAutoReviewSeedReport(report, editableRows, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
    console.log(`Auto-reviewed notes: ${paths.editableNotesPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runUnifiedPositiveHeldLocalPreviewAutoReviewSeedCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
