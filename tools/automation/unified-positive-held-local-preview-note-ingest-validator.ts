import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewNoteTemplateRow } from './unified-positive-held-local-preview-note-template';

type AllowedDisposition = UnifiedPositiveHeldLocalPreviewNoteTemplateRow['allowedDispositions'][number] | 'unreviewed';

export interface UnifiedPositiveHeldLocalPreviewNoteIngestValidatorReport {
  reportType: 'unified_positive_held_local_preview_note_ingest_validator';
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
    editableTemplatePath: string | null;
  };
  summary: {
    rowsLoaded: number;
    validRows: number;
    reviewedRows: number;
    unreviewedRows: number;
    rejectedRows: number;
  };
  rows: Array<{
    ticketId: string;
    setupType: string;
    direction: string;
    suggestedDisposition: AllowedDisposition | string;
    reviewerNotePresent: boolean;
    valid: boolean;
    findings: string[];
  }>;
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const ALLOWED_DISPOSITIONS = new Set<AllowedDisposition>([
  'unreviewed',
  'keep_review_only',
  'needs_more_chart_evidence',
  'reject_preview',
  'candidate_for_later_research',
]);

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestEditableTemplatePath(reportDir: string): string | null {
  if (!fs.existsSync(reportDir)) return null;
  const matches = fs.readdirSync(reportDir)
    .filter((name) => /^unified-positive-held-local-preview-note-template-\d+\.editable\.json$/.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
}

function authority(): UnifiedPositiveHeldLocalPreviewNoteIngestValidatorReport['authority'] {
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

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewNoteIngestValidatorReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Note Ingest Validator',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only note validator. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change app runtime behavior, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Editable template path: ${report.source.editableTemplatePath || '-'}.`,
    `- Rows loaded: ${report.summary.rowsLoaded}.`,
    `- Valid rows: ${report.summary.validRows}.`,
    `- Reviewed rows: ${report.summary.reviewedRows}.`,
    `- Unreviewed rows: ${report.summary.unreviewedRows}.`,
    `- Rejected rows: ${report.summary.rejectedRows}.`,
    '',
    '## Rows',
    '| Ticket | Setup | Side | Disposition | Note | Valid | Findings |',
    '|---|---|---|---|---|---|---|',
    ...report.rows.map((row) => `| ${escapeTable(row.ticketId)} | ${escapeTable(row.setupType)} | ${row.direction} | ${escapeTable(String(row.suggestedDisposition))} | ${row.reviewerNotePresent ? 'yes' : 'no'} | ${row.valid ? 'yes' : 'no'} | ${escapeTable(row.findings.join('; ') || '-')} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

function normalizeRows(raw: unknown): UnifiedPositiveHeldLocalPreviewNoteTemplateRow[] {
  if (!raw || typeof raw !== 'object') return [];
  const rows = (raw as { rows?: unknown }).rows;
  return Array.isArray(rows) ? rows as UnifiedPositiveHeldLocalPreviewNoteTemplateRow[] : [];
}

export function buildUnifiedPositiveHeldLocalPreviewNoteIngestValidatorReport(args: {
  editableTemplatePath: string | null;
  editableTemplate: unknown;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewNoteIngestValidatorReport {
  const rows = normalizeRows(args.editableTemplate);
  const validationRows = rows.map((row) => {
    const disposition = row.suggestedDisposition as AllowedDisposition | string;
    const reviewerNote = typeof row.reviewerNote === 'string' ? row.reviewerNote.trim() : '';
    const findings = [
      !row.ticketId ? 'missing ticketId' : null,
      !row.setupType ? 'missing setupType' : null,
      row.visibleInHiddenTab !== true ? 'visibleInHiddenTab is not true' : null,
      row.reviewOnly !== true ? 'reviewOnly is not true' : null,
      !ALLOWED_DISPOSITIONS.has(disposition as AllowedDisposition) ? `unsupported disposition ${String(disposition)}` : null,
      disposition !== 'unreviewed' && !reviewerNote ? 'reviewed disposition requires reviewerNote' : null,
      !String(row.boundaryReminder || '').includes('Does not approve execution') ? 'boundary reminder missing no-execution language' : null,
      !String(row.boundaryReminder || '').includes('write Supabase') ? 'boundary reminder missing no-Supabase-write language' : null,
      !String(row.boundaryReminder || '').includes('post Discord') ? 'boundary reminder missing no-Discord-post language' : null,
    ].filter((item): item is string => Boolean(item));
    return {
      ticketId: String(row.ticketId || ''),
      setupType: String(row.setupType || ''),
      direction: String(row.direction || ''),
      suggestedDisposition: disposition,
      reviewerNotePresent: Boolean(reviewerNote),
      valid: findings.length === 0,
      findings,
    };
  });
  const blockers = [
    !args.editableTemplatePath ? 'missing editable template path' : null,
    validationRows.length === 0 ? 'no editable note rows found' : null,
    ...validationRows.flatMap((row) => row.findings.map((finding) => `${row.ticketId || 'unknown ticket'}: ${finding}`)),
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewNoteIngestValidatorReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_note_ingest_validator',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      editableTemplatePath: args.editableTemplatePath,
    },
    summary: {
      rowsLoaded: validationRows.length,
      validRows: validationRows.filter((row) => row.valid).length,
      reviewedRows: validationRows.filter((row) => row.suggestedDisposition !== 'unreviewed').length,
      unreviewedRows: validationRows.filter((row) => row.suggestedDisposition === 'unreviewed').length,
      rejectedRows: validationRows.filter((row) => !row.valid).length,
    },
    rows: validationRows,
    blockers,
    recommendations: blockers.length
      ? ['Do not aggregate local preview notes until all rows validate and boundaries remain intact.']
      : ['Local preview notes validate as local-only diagnostic material; any promotion still needs a separate approved research phase.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewNoteIngestValidatorReport(
  report: UnifiedPositiveHeldLocalPreviewNoteIngestValidatorReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-note-ingest-validator-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewNoteIngestValidatorCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const editableTemplatePath = readFlag(args, '--notes') || latestEditableTemplatePath(outDir);
  const editableTemplate = editableTemplatePath && fs.existsSync(editableTemplatePath)
    ? JSON.parse(fs.readFileSync(editableTemplatePath, 'utf8')) as unknown
    : null;
  const report = buildUnifiedPositiveHeldLocalPreviewNoteIngestValidatorReport({
    editableTemplatePath,
    editableTemplate,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewNoteIngestValidatorReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewNoteIngestValidatorCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
