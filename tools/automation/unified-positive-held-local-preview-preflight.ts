import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewRenderedCard,
  UnifiedPositiveHeldLocalPreviewRendererReport,
} from './unified-positive-held-local-preview-renderer';

export interface UnifiedPositiveHeldLocalPreviewPreflightFinding {
  ticketId: string;
  setupType: string;
  direction: string;
  reason: string;
  evidence: string;
}

export interface UnifiedPositiveHeldLocalPreviewPreflightRow {
  ticketId: string;
  sourceSnapshotId: string;
  setupType: string;
  direction: string;
  status: 'preflight_pass' | 'preflight_fail';
  contentLength: number;
  maxLineLength: number;
  findings: UnifiedPositiveHeldLocalPreviewPreflightFinding[];
}

export interface UnifiedPositiveHeldLocalPreviewPreflightReport {
  reportType: 'unified_positive_held_local_preview_preflight';
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
  };
  source: {
    rendererPath: string | null;
  };
  limits: {
    maxContentChars: number;
    maxLineChars: number;
    maxFooterChars: number;
  };
  summary: {
    rendererRowsLoaded: number;
    rowsPassed: number;
    rowsFailed: number;
    missingFieldFindings: number;
    oversizedContentFindings: number;
    oversizedLineFindings: number;
    boundaryFindings: number;
    forbiddenSignalFindings: number;
  };
  rows: UnifiedPositiveHeldLocalPreviewPreflightRow[];
  findings: UnifiedPositiveHeldLocalPreviewPreflightFinding[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_LIMITS = {
  maxContentChars: 1900,
  maxLineChars: 260,
  maxFooterChars: 180,
};

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function readNumberFlag(args: string[], flag: string, fallback: number): number {
  const raw = readFlag(args, flag);
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`Invalid positive number for ${flag}: ${raw}`);
  return parsed;
}

function authority(): UnifiedPositiveHeldLocalPreviewPreflightReport['authority'] {
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
  };
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function maxLineLength(text: string): number {
  return text.split(/\r?\n/).reduce((max, line) => Math.max(max, line.length), 0);
}

function finding(
  card: UnifiedPositiveHeldLocalPreviewRenderedCard,
  reason: string,
  evidence: string,
): UnifiedPositiveHeldLocalPreviewPreflightFinding {
  return {
    ticketId: card.ticketId,
    setupType: card.setupType,
    direction: card.direction,
    reason,
    evidence,
  };
}

function hasRequiredLabels(content: string): boolean {
  return ['What:', 'Where:', 'When:', 'Why:', 'Invalidation:', 'Line:', 'Entry:', 'Stop:', 'T1:', 'T2:'].every((label) => content.includes(label));
}

function findingsForCard(
  card: UnifiedPositiveHeldLocalPreviewRenderedCard | null,
  rendererStatus: UnifiedPositiveHeldLocalPreviewRendererReport['status'],
  limits: UnifiedPositiveHeldLocalPreviewPreflightReport['limits'],
  rowMeta: { ticketId: string; setupType: string; direction: string },
): UnifiedPositiveHeldLocalPreviewPreflightFinding[] {
  if (!card) {
    return [{
      ticketId: rowMeta.ticketId,
      setupType: rowMeta.setupType,
      direction: rowMeta.direction,
      reason: 'missing_rendered_card',
      evidence: 'renderer row did not include a rendered card',
    }];
  }
  const findings: UnifiedPositiveHeldLocalPreviewPreflightFinding[] = [];
  if (rendererStatus !== 'pass') findings.push(finding(card, 'renderer_status_not_pass', rendererStatus));
  if (!card.content.trim()) findings.push(finding(card, 'missing_content', 'content is empty'));
  if (!card.footer.trim()) findings.push(finding(card, 'missing_footer', 'footer is empty'));
  if (!hasRequiredLabels(card.content)) findings.push(finding(card, 'missing_required_card_fields', card.content));
  if (card.content.length > limits.maxContentChars) {
    findings.push(finding(card, 'oversized_content', `${card.content.length} > ${limits.maxContentChars}`));
  }
  const longestLine = maxLineLength(card.content);
  if (longestLine > limits.maxLineChars) {
    findings.push(finding(card, 'oversized_line', `${longestLine} > ${limits.maxLineChars}`));
  }
  if (card.footer.length > limits.maxFooterChars) {
    findings.push(finding(card, 'oversized_footer', `${card.footer.length} > ${limits.maxFooterChars}`));
  }
  if (
    card.postable !== false ||
    card.shouldPost !== false ||
    card.canExecute !== false ||
    card.publishDiscord !== false ||
    card.shouldDispatch !== false ||
    card.writesSupabase !== false
  ) {
    findings.push(finding(card, 'forbidden_dispatch_or_execution_signal', JSON.stringify({
      postable: card.postable,
      shouldPost: card.shouldPost,
      canExecute: card.canExecute,
      publishDiscord: card.publishDiscord,
      shouldDispatch: card.shouldDispatch,
      writesSupabase: card.writesSupabase,
    })));
  }
  if (!/Human-review only/i.test(card.content)) findings.push(finding(card, 'missing_human_review_boundary', card.content));
  if (!/No automated order/i.test(card.content)) findings.push(finding(card, 'missing_no_automated_orders_boundary', card.content));
  if (!/not posted to Discord/i.test(card.content)) findings.push(finding(card, 'missing_no_discord_post_boundary', card.content));
  if (!/not written to Supabase/i.test(card.content)) findings.push(finding(card, 'missing_no_supabase_write_boundary', card.content));
  if (/canExecute\s*[:=]\s*true/i.test(card.content) || /shouldPost\s*[:=]\s*true/i.test(card.content) || /publishDiscord\s*[:=]\s*true/i.test(card.content)) {
    findings.push(finding(card, 'forbidden_true_flag_text', card.content));
  }
  if (/below\/above|above\/below/i.test(card.content)) findings.push(finding(card, 'generic_below_above_wording', card.content));
  return findings;
}

function rowForRenderedCard(
  row: UnifiedPositiveHeldLocalPreviewRendererReport['rows'][number],
  rendererStatus: UnifiedPositiveHeldLocalPreviewRendererReport['status'],
  limits: UnifiedPositiveHeldLocalPreviewPreflightReport['limits'],
): UnifiedPositiveHeldLocalPreviewPreflightRow {
  const findings = findingsForCard(row.renderedCard, rendererStatus, limits, row);
  return {
    ticketId: row.ticketId,
    sourceSnapshotId: row.sourceSnapshotId,
    setupType: row.setupType,
    direction: row.direction,
    status: findings.length ? 'preflight_fail' : 'preflight_pass',
    contentLength: row.renderedCard?.content.length || 0,
    maxLineLength: row.renderedCard ? maxLineLength(row.renderedCard.content) : 0,
    findings,
  };
}

function countFindings(findings: UnifiedPositiveHeldLocalPreviewPreflightFinding[], reasons: string[]): number {
  return findings.filter((finding) => reasons.includes(finding.reason)).length;
}

function buildRecommendations(report: Omit<UnifiedPositiveHeldLocalPreviewPreflightReport, 'recommendations' | 'markdown'>): string[] {
  if (report.status === 'fail') {
    return [
      'Do not move held-local preview cards to visual rendering or UI exposure until every text preflight finding is cleared.',
    ];
  }
  return [
    'Held-local preview card text is within local preflight limits and preserves no-post/no-execute boundaries.',
    'Next narrow phase can render a local visual artifact for QA without posting to Discord or writing Supabase.',
  ];
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewPreflightReport, 'markdown'>): string {
  const lines = [
    '# Unified Positive Held-Local Preview Preflight',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only text preflight. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Renderer rows loaded: ${report.summary.rendererRowsLoaded}.`,
    `- Rows passed: ${report.summary.rowsPassed}.`,
    `- Rows failed: ${report.summary.rowsFailed}.`,
    `- Missing field findings: ${report.summary.missingFieldFindings}.`,
    `- Oversized content findings: ${report.summary.oversizedContentFindings}.`,
    `- Oversized line findings: ${report.summary.oversizedLineFindings}.`,
    `- Boundary findings: ${report.summary.boundaryFindings}.`,
    `- Forbidden signal findings: ${report.summary.forbiddenSignalFindings}.`,
    '',
    '## Rows',
    '| Ticket | Setup | Side | Status | Content chars | Max line chars | Findings |',
    '|---|---|---|---|---:|---:|---|',
    ...report.rows.map((row) => `| ${row.ticketId} | ${row.setupType} | ${row.direction} | ${row.status} | ${row.contentLength} | ${row.maxLineLength} | ${escapeTable(row.findings.map((finding) => finding.reason).join(', ') || '-')} |`),
  ];
  if (report.findings.length) {
    lines.push('', '## Findings');
    for (const item of report.findings) lines.push(`- ${item.ticketId}: ${item.reason} (${escapeTable(item.evidence)})`);
  }
  lines.push('', '## Recommendations', ...report.recommendations.map((item) => `- ${item}`));
  return lines.join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewPreflightReport(args: {
  rendererReport: UnifiedPositiveHeldLocalPreviewRendererReport;
  rendererPath?: string | null;
  limits?: Partial<UnifiedPositiveHeldLocalPreviewPreflightReport['limits']>;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewPreflightReport {
  const limits = { ...DEFAULT_LIMITS, ...(args.limits || {}) };
  const rows = args.rendererReport.rows.map((row) => rowForRenderedCard(row, args.rendererReport.status, limits));
  const findings = rows.flatMap((row) => row.findings);
  const reportBase: Omit<UnifiedPositiveHeldLocalPreviewPreflightReport, 'recommendations' | 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_preflight',
    generatedAt,
    status: findings.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      rendererPath: args.rendererPath || null,
    },
    limits,
    summary: {
      rendererRowsLoaded: args.rendererReport.rows.length,
      rowsPassed: rows.filter((row) => row.status === 'preflight_pass').length,
      rowsFailed: rows.filter((row) => row.status === 'preflight_fail').length,
      missingFieldFindings: countFindings(findings, ['missing_rendered_card', 'missing_content', 'missing_footer', 'missing_required_card_fields']),
      oversizedContentFindings: countFindings(findings, ['oversized_content', 'oversized_footer']),
      oversizedLineFindings: countFindings(findings, ['oversized_line']),
      boundaryFindings: countFindings(findings, [
        'missing_human_review_boundary',
        'missing_no_automated_orders_boundary',
        'missing_no_discord_post_boundary',
        'missing_no_supabase_write_boundary',
        'generic_below_above_wording',
      ]),
      forbiddenSignalFindings: countFindings(findings, ['forbidden_dispatch_or_execution_signal', 'forbidden_true_flag_text']),
    },
    rows,
    findings,
  };
  const recommendations = buildRecommendations(reportBase);
  const withoutMarkdown = { ...reportBase, recommendations };
  return { ...withoutMarkdown, markdown: buildMarkdown(withoutMarkdown) };
}

export function writeUnifiedPositiveHeldLocalPreviewPreflightReport(
  report: UnifiedPositiveHeldLocalPreviewPreflightReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-preflight-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export async function runUnifiedPositiveHeldLocalPreviewPreflightCli(args = process.argv.slice(2)): Promise<void> {
  const rendererPath = readFlag(args, '--renderer');
  if (!rendererPath) throw new Error('Missing required --renderer path.');
  const outDir = readFlag(args, '--out-dir') || DEFAULT_OUT_DIR;
  const rendererReport = JSON.parse(fs.readFileSync(rendererPath, 'utf8')) as UnifiedPositiveHeldLocalPreviewRendererReport;
  const report = buildUnifiedPositiveHeldLocalPreviewPreflightReport({
    rendererReport,
    rendererPath,
    limits: {
      maxContentChars: readNumberFlag(args, '--max-content-chars', DEFAULT_LIMITS.maxContentChars),
      maxLineChars: readNumberFlag(args, '--max-line-chars', DEFAULT_LIMITS.maxLineChars),
      maxFooterChars: readNumberFlag(args, '--max-footer-chars', DEFAULT_LIMITS.maxFooterChars),
    },
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewPreflightReport(report, outDir);
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
  runUnifiedPositiveHeldLocalPreviewPreflightCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
