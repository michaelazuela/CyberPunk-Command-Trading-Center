import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewReviewChecklistReport } from './unified-positive-held-local-preview-review-checklist';
import type { UnifiedPositiveHeldLocalPreviewNoteIngestValidatorReport } from './unified-positive-held-local-preview-note-ingest-validator';

export interface UnifiedPositiveHeldLocalPreviewReviewRollupReport {
  reportType: 'unified_positive_held_local_preview_review_rollup';
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
    noteValidationPath: string | null;
  };
  summary: {
    checklistRows: number;
    validNoteRows: number;
    reviewedRows: number;
    unreviewedRows: number;
    reviewOnlyRows: number;
    candidateForLaterResearchRows: number;
    rejectedRows: number;
  };
  rows: Array<{
    ticketId: string;
    setupType: string;
    direction: string;
    visibleInHiddenTab: boolean;
    noteDisposition: string;
    noteValid: boolean;
    reviewOnly: true;
    livePromotionAllowed: false;
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

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  const matches = fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
}

function authority(): UnifiedPositiveHeldLocalPreviewReviewRollupReport['authority'] {
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

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewReviewRollupReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Review Rollup',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only review rollup. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change app runtime behavior, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Checklist path: ${report.source.checklistPath || '-'}.`,
    `- Note validation path: ${report.source.noteValidationPath || '-'}.`,
    `- Checklist rows: ${report.summary.checklistRows}.`,
    `- Valid note rows: ${report.summary.validNoteRows}.`,
    `- Reviewed rows: ${report.summary.reviewedRows}.`,
    `- Unreviewed rows: ${report.summary.unreviewedRows}.`,
    `- Review-only rows: ${report.summary.reviewOnlyRows}.`,
    `- Candidate-for-later-research rows: ${report.summary.candidateForLaterResearchRows}.`,
    `- Rejected rows: ${report.summary.rejectedRows}.`,
    '',
    '## Rows',
    '| Ticket | Setup | Side | Visible | Note Disposition | Note Valid | Boundary |',
    '|---|---|---|---|---|---|---|',
    ...report.rows.map((row) => `| ${escapeTable(row.ticketId)} | ${escapeTable(row.setupType)} | ${row.direction} | ${row.visibleInHiddenTab ? 'yes' : 'no'} | ${escapeTable(row.noteDisposition)} | ${row.noteValid ? 'yes' : 'no'} | ${escapeTable(row.boundary)} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewReviewRollupReport(args: {
  checklistPath: string | null;
  checklistReport: UnifiedPositiveHeldLocalPreviewReviewChecklistReport | null;
  noteValidationPath: string | null;
  noteValidationReport: UnifiedPositiveHeldLocalPreviewNoteIngestValidatorReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewReviewRollupReport {
  const notesByTicket = new Map((args.noteValidationReport?.rows || []).map((row) => [row.ticketId, row]));
  const rows = (args.checklistReport?.rows || []).map((row) => {
    const note = notesByTicket.get(row.ticketId);
    return {
      ticketId: row.ticketId,
      setupType: row.setupType,
      direction: row.direction,
      visibleInHiddenTab: row.visibleInHiddenTab,
      noteDisposition: String(note?.suggestedDisposition || 'missing_note_validation'),
      noteValid: note?.valid === true,
      reviewOnly: true as const,
      livePromotionAllowed: false as const,
      boundary: 'Research summary only. No live promotion, no canExecute change, no Discord post, no Supabase write, no scanner behavior change.',
    };
  });
  const blockers = [
    !args.checklistPath ? 'missing review checklist path' : null,
    !args.checklistReport ? 'missing review checklist report' : null,
    args.checklistReport && args.checklistReport.status !== 'pass' ? `review checklist status ${args.checklistReport.status}` : null,
    !args.noteValidationPath ? 'missing note validation path' : null,
    !args.noteValidationReport ? 'missing note validation report' : null,
    args.noteValidationReport && args.noteValidationReport.status !== 'pass' ? `note validation status ${args.noteValidationReport.status}` : null,
    rows.length === 0 ? 'no rollup rows found' : null,
    ...rows.flatMap((row) => [
      !row.visibleInHiddenTab ? `${row.ticketId} is not visible in hidden tab` : null,
      !row.noteValid ? `${row.ticketId} note validation is not valid` : null,
      row.livePromotionAllowed !== false ? `${row.ticketId} livePromotionAllowed is not false` : null,
    ]),
  ].filter((item): item is string => Boolean(item));

  const base: Omit<UnifiedPositiveHeldLocalPreviewReviewRollupReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_review_rollup',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      checklistPath: args.checklistPath,
      noteValidationPath: args.noteValidationPath,
    },
    summary: {
      checklistRows: args.checklistReport?.rows.length || 0,
      validNoteRows: args.noteValidationReport?.summary.validRows || 0,
      reviewedRows: args.noteValidationReport?.summary.reviewedRows || 0,
      unreviewedRows: args.noteValidationReport?.summary.unreviewedRows || 0,
      reviewOnlyRows: rows.filter((row) => row.reviewOnly === true).length,
      candidateForLaterResearchRows: rows.filter((row) => row.noteDisposition === 'candidate_for_later_research').length,
      rejectedRows: rows.filter((row) => row.noteDisposition === 'reject_preview').length,
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not use the preview review rollup until checklist and note validation both pass.']
      : ['Rollup is ready as local research context only; any model promotion or live behavior change still requires separate replay evidence and approval.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewReviewRollupReport(
  report: UnifiedPositiveHeldLocalPreviewReviewRollupReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-review-rollup-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewReviewRollupCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const checklistPath = readFlag(args, '--checklist') || latestMatchingFile(outDir, /^unified-positive-held-local-preview-review-checklist-\d+\.json$/);
  const noteValidationPath = readFlag(args, '--note-validation') || latestMatchingFile(outDir, /^unified-positive-held-local-preview-note-ingest-validator-\d+\.json$/);
  const checklistReport = checklistPath && fs.existsSync(checklistPath)
    ? JSON.parse(fs.readFileSync(checklistPath, 'utf8')) as UnifiedPositiveHeldLocalPreviewReviewChecklistReport
    : null;
  const noteValidationReport = noteValidationPath && fs.existsSync(noteValidationPath)
    ? JSON.parse(fs.readFileSync(noteValidationPath, 'utf8')) as UnifiedPositiveHeldLocalPreviewNoteIngestValidatorReport
    : null;
  const report = buildUnifiedPositiveHeldLocalPreviewReviewRollupReport({
    checklistPath,
    checklistReport,
    noteValidationPath,
    noteValidationReport,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewReviewRollupReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewReviewRollupCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
