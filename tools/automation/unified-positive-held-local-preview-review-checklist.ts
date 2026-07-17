import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildHeldLocalPreviewUiModel,
  type HeldLocalPreviewUiIndexReport,
} from '../../src/lib/heldLocalPreviewUiAdapter';
import type { UnifiedPositiveHeldLocalPreviewReadinessAuditReport } from './unified-positive-held-local-preview-readiness-audit';

export interface UnifiedPositiveHeldLocalPreviewReviewChecklistRow {
  ticketId: string;
  setupType: string;
  direction: string;
  visibleInHiddenTab: boolean;
  reviewOnly: true;
  canExecute: false;
  postable: false;
  publishDiscord: false;
  shouldPost: false;
  shouldDispatch: false;
  writesSupabase: false;
  reviewOnlyReasons: string[];
}

export interface UnifiedPositiveHeldLocalPreviewReviewChecklistReport {
  reportType: 'unified_positive_held_local_preview_review_checklist';
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
    bundlePath: string | null;
    readinessAuditPath: string | null;
    readinessScreenshotPath: string | null;
  };
  summary: {
    bundleItems: number;
    visibleRows: number;
    reviewOnlyRows: number;
    canExecuteFalseRows: number;
    postableFalseRows: number;
    publishDiscordFalseRows: number;
    writesSupabaseFalseRows: number;
  };
  rows: UnifiedPositiveHeldLocalPreviewReviewChecklistRow[];
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

function authority(): UnifiedPositiveHeldLocalPreviewReviewChecklistReport['authority'] {
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

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewReviewChecklistReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Review Checklist',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only review checklist. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change app runtime behavior, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Bundle path: ${report.source.bundlePath || '-'}.`,
    `- Readiness audit path: ${report.source.readinessAuditPath || '-'}.`,
    `- Readiness screenshot path: ${report.source.readinessScreenshotPath || '-'}.`,
    `- Bundle items: ${report.summary.bundleItems}.`,
    `- Visible rows: ${report.summary.visibleRows}.`,
    `- Review-only rows: ${report.summary.reviewOnlyRows}.`,
    `- canExecute=false rows: ${report.summary.canExecuteFalseRows}.`,
    `- postable=false rows: ${report.summary.postableFalseRows}.`,
    `- publishDiscord=false rows: ${report.summary.publishDiscordFalseRows}.`,
    `- writesSupabase=false rows: ${report.summary.writesSupabaseFalseRows}.`,
    '',
    '## Checklist',
    '| Ticket | Setup | Side | Visible | Review Only Reasons |',
    '|---|---|---|---|---|',
    ...report.rows.map((row) => `| ${escapeTable(row.ticketId)} | ${escapeTable(row.setupType)} | ${row.direction} | ${row.visibleInHiddenTab ? 'yes' : 'no'} | ${escapeTable(row.reviewOnlyReasons.join('; '))} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewReviewChecklistReport(args: {
  bundlePath: string | null;
  bundleReport: HeldLocalPreviewUiIndexReport | null;
  readinessAuditPath?: string | null;
  readinessAudit?: UnifiedPositiveHeldLocalPreviewReadinessAuditReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewReviewChecklistReport {
  const model = buildHeldLocalPreviewUiModel({
    enabled: true,
    localHost: true,
    report: args.bundleReport,
  });
  const readyTicketIds = new Set(model.items.map((item) => item.ticketId));
  const rows: UnifiedPositiveHeldLocalPreviewReviewChecklistRow[] = (args.bundleReport?.items || []).map((item) => ({
    ticketId: item.ticketId,
    setupType: item.setupType,
    direction: item.direction,
    visibleInHiddenTab: readyTicketIds.has(item.ticketId),
    reviewOnly: true,
    canExecute: false,
    postable: false,
    publishDiscord: false,
    shouldPost: false,
    shouldDispatch: false,
    writesSupabase: false,
    reviewOnlyReasons: [
      'Hidden localhost preview only.',
      'Human-review only; no automated order authority.',
      'canExecute remains false.',
      'Discord posting remains disabled.',
      'Supabase writing remains disabled.',
      '5M execution authority and deterministic live gates are unchanged.',
    ],
  }));

  const blockers = [
    !args.bundlePath ? 'missing embedded bundle path' : null,
    ...model.blockers,
    args.readinessAudit && args.readinessAudit.status !== 'pass' ? `readiness audit status ${args.readinessAudit.status}` : null,
    args.readinessAudit && args.readinessAudit.summary.renderedCards !== rows.length ? `readiness rendered cards ${args.readinessAudit.summary.renderedCards} did not match checklist rows ${rows.length}` : null,
    rows.length === 0 ? 'no held-local preview rows found' : null,
    ...rows.flatMap((row) => [
      !row.visibleInHiddenTab ? `${row.ticketId} is not visible in hidden tab model` : null,
      row.canExecute !== false ? `${row.ticketId} canExecute is not false` : null,
      row.postable !== false ? `${row.ticketId} postable is not false` : null,
      row.publishDiscord !== false ? `${row.ticketId} publishDiscord is not false` : null,
      row.writesSupabase !== false ? `${row.ticketId} writesSupabase is not false` : null,
    ]),
  ].filter((item): item is string => Boolean(item));

  const base: Omit<UnifiedPositiveHeldLocalPreviewReviewChecklistReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_review_checklist',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      bundlePath: args.bundlePath,
      readinessAuditPath: args.readinessAuditPath || null,
      readinessScreenshotPath: args.readinessAudit?.source.screenshotPath || null,
    },
    summary: {
      bundleItems: args.bundleReport?.items.length || 0,
      visibleRows: rows.filter((row) => row.visibleInHiddenTab).length,
      reviewOnlyRows: rows.filter((row) => row.reviewOnly === true).length,
      canExecuteFalseRows: rows.filter((row) => row.canExecute === false).length,
      postableFalseRows: rows.filter((row) => row.postable === false).length,
      publishDiscordFalseRows: rows.filter((row) => row.publishDiscord === false).length,
      writesSupabaseFalseRows: rows.filter((row) => row.writesSupabase === false).length,
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not broaden held-local preview review until every checklist row is visible and review-only boundaries are intact.']
      : ['Held-local preview cases are visible and remain review-only; next phase can add human review notes without changing live scanner behavior.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewReviewChecklistReport(
  report: UnifiedPositiveHeldLocalPreviewReviewChecklistReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-review-checklist-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewReviewChecklistCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const bundlePath = readFlag(args, '--bundle') || latestMatchingFile(outDir, /^unified-positive-held-local-preview-localstorage-loader-\d+\.bundle\.json$/);
  const readinessAuditPath = readFlag(args, '--readiness') || latestMatchingFile(outDir, /^unified-positive-held-local-preview-readiness-audit-\d+\.json$/);
  const bundleReport = bundlePath && fs.existsSync(bundlePath)
    ? JSON.parse(fs.readFileSync(bundlePath, 'utf8')) as HeldLocalPreviewUiIndexReport
    : null;
  const readinessAudit = readinessAuditPath && fs.existsSync(readinessAuditPath)
    ? JSON.parse(fs.readFileSync(readinessAuditPath, 'utf8')) as UnifiedPositiveHeldLocalPreviewReadinessAuditReport
    : null;
  const report = buildUnifiedPositiveHeldLocalPreviewReviewChecklistReport({
    bundlePath,
    bundleReport,
    readinessAuditPath,
    readinessAudit,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewReviewChecklistReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewReviewChecklistCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
