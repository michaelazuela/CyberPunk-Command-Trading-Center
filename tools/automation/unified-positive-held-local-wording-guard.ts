import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalInspectionSurfaceReport } from './unified-positive-held-local-inspection-surface';

export interface UnifiedPositiveHeldLocalWordingGuardFinding {
  ticketId: string;
  setupType: string;
  direction: string;
  reason: string;
  evidence: string;
}

export interface UnifiedPositiveHeldLocalWordingGuardReport {
  reportType: 'unified_positive_held_local_wording_guard';
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
    inspectionSurfacePath: string | null;
  };
  summary: {
    rowsChecked: number;
    rowsPassed: number;
    rowsFailed: number;
    genericInvalidationFindings: number;
    missingSideSpecificFindings: number;
  };
  findings: UnifiedPositiveHeldLocalWordingGuardFinding[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function authority(): UnifiedPositiveHeldLocalWordingGuardReport['authority'] {
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

function expectedSidePhrase(direction: string, stop: number | null | undefined): string | null {
  if (!Number.isFinite(stop)) return null;
  const stopText = Number(stop).toFixed(2);
  if (direction === 'LONG') return `Invalid if price trades below the protected 5M stop line at ${stopText}.`;
  if (direction === 'SHORT') return `Invalid if price trades above the protected 5M stop line at ${stopText}.`;
  return null;
}

function findingsForRow(row: UnifiedPositiveHeldLocalInspectionSurfaceReport['rows'][number]): UnifiedPositiveHeldLocalWordingGuardFinding[] {
  const text = row.heldLocalTicket?.invalidationText || row.deskText?.invalidation || '';
  const findings: UnifiedPositiveHeldLocalWordingGuardFinding[] = [];
  if (/below\/above|above\/below/i.test(text)) {
    findings.push({
      ticketId: row.ticketId,
      setupType: row.setupType,
      direction: row.direction,
      reason: 'generic_below_above_invalidation_wording',
      evidence: text,
    });
  }
  const expected = expectedSidePhrase(row.direction, row.heldLocalTicket?.stop);
  if (!expected || !text.includes(expected)) {
    findings.push({
      ticketId: row.ticketId,
      setupType: row.setupType,
      direction: row.direction,
      reason: 'missing_side_specific_invalidation_wording',
      evidence: text || 'missing invalidation text',
    });
  }
  if (!/No automated order authority is granted\./.test(text)) {
    findings.push({
      ticketId: row.ticketId,
      setupType: row.setupType,
      direction: row.direction,
      reason: 'missing_no_automated_order_boundary',
      evidence: text || 'missing invalidation text',
    });
  }
  return findings;
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalWordingGuardReport, 'markdown'>): string {
  const lines = [
    '# Unified Positive Held-Local Wording Guard',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only wording guard. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Rows checked: ${report.summary.rowsChecked}.`,
    `- Rows passed: ${report.summary.rowsPassed}.`,
    `- Rows failed: ${report.summary.rowsFailed}.`,
    `- Generic invalidation findings: ${report.summary.genericInvalidationFindings}.`,
    `- Missing side-specific findings: ${report.summary.missingSideSpecificFindings}.`,
  ];
  if (report.findings.length) {
    lines.push('', '## Findings');
    for (const finding of report.findings) {
      lines.push(`- ${finding.ticketId}: ${finding.reason} (${finding.evidence})`);
    }
  }
  lines.push('', '## Recommendations', ...report.recommendations.map((item) => `- ${item}`));
  return lines.join('\n');
}

function recommendations(status: UnifiedPositiveHeldLocalWordingGuardReport['status']): string[] {
  if (status === 'fail') {
    return [
      'Do not expose held-local review tickets to UI or Discord preview until wording findings are cleared.',
    ];
  }
  return [
    'Held-local review ticket invalidation wording is side-specific and safe for a future local preview surface.',
    'Production Discord/Supabase publishing remains disabled until a separate approval gate.',
  ];
}

export function buildUnifiedPositiveHeldLocalWordingGuardReport(args: {
  inspectionSurface: UnifiedPositiveHeldLocalInspectionSurfaceReport;
  inspectionSurfacePath?: string | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalWordingGuardReport {
  const findings = args.inspectionSurface.rows.flatMap(findingsForRow);
  const failedTicketIds = new Set(findings.map((finding) => finding.ticketId));
  const status: UnifiedPositiveHeldLocalWordingGuardReport['status'] = findings.length ? 'fail' : 'pass';
  const reportBase: Omit<UnifiedPositiveHeldLocalWordingGuardReport, 'recommendations' | 'markdown'> = {
    reportType: 'unified_positive_held_local_wording_guard',
    generatedAt,
    status,
    authority: authority(),
    source: {
      inspectionSurfacePath: args.inspectionSurfacePath || null,
    },
    summary: {
      rowsChecked: args.inspectionSurface.rows.length,
      rowsPassed: args.inspectionSurface.rows.length - failedTicketIds.size,
      rowsFailed: failedTicketIds.size,
      genericInvalidationFindings: findings.filter((finding) => finding.reason === 'generic_below_above_invalidation_wording').length,
      missingSideSpecificFindings: findings.filter((finding) => finding.reason === 'missing_side_specific_invalidation_wording').length,
    },
    findings,
  };
  const reportRecommendations = recommendations(status);
  const withoutMarkdown = { ...reportBase, recommendations: reportRecommendations };
  return { ...withoutMarkdown, markdown: buildMarkdown(withoutMarkdown) };
}

export function writeUnifiedPositiveHeldLocalWordingGuardReport(
  report: UnifiedPositiveHeldLocalWordingGuardReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-wording-guard-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export async function runUnifiedPositiveHeldLocalWordingGuardCli(args = process.argv.slice(2)): Promise<void> {
  const inspectionSurfacePath = readFlag(args, '--inspection-surface');
  if (!inspectionSurfacePath) throw new Error('Missing required --inspection-surface path.');
  const outDir = readFlag(args, '--out-dir') || DEFAULT_OUT_DIR;
  const inspectionSurface = JSON.parse(fs.readFileSync(inspectionSurfacePath, 'utf8')) as UnifiedPositiveHeldLocalInspectionSurfaceReport;
  const report = buildUnifiedPositiveHeldLocalWordingGuardReport({ inspectionSurface, inspectionSurfacePath });
  const paths = writeUnifiedPositiveHeldLocalWordingGuardReport(report, outDir);
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
  runUnifiedPositiveHeldLocalWordingGuardCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
