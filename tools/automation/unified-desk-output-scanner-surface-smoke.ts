import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  buildUnifiedDeskOutputScannerSurfaceModel,
  type UnifiedDeskOutputScannerSurfaceModel,
} from '../../src/lib/unifiedDeskOutputScannerSurface';
import type { UnifiedDeskOutputScannerVisibilityModel } from '../../src/lib/unifiedDeskOutputScannerVisibilityAdapter';

interface ScannerVisibilityInstallAuditReport {
  reportType: 'unified_desk_output_scanner_visibility_install_audit';
  status: 'pass' | 'blocked';
  model: UnifiedDeskOutputScannerVisibilityModel;
}

interface ScannerSurfaceSmokeReport {
  reportType: 'unified_desk_output_scanner_surface_smoke';
  generatedAt: string;
  status: 'pass' | 'blocked';
  authority: {
    localOnly: true;
    readsSavedInstallAuditOnly: true;
    rendersScannerSurfaceOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    automatedOrders: false;
  };
  source: {
    installAuditPath: string;
    installAuditStatus: 'pass' | 'blocked';
  };
  summary: {
    renderedRows: number;
    approvedDeskPlanRows: number;
    formingDeskReadRows: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    wordingViolationRows: number;
    blockedRows: number;
    recommendation: 'surface_ready_for_local_display_consumer' | 'hold_for_surface_contract_fix';
  };
  surface: UnifiedDeskOutputScannerSurfaceModel;
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  installAuditPath: string | null;
  outDir: string;
  json: boolean;
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

function parseArgs(args = process.argv.slice(2)): CliOptions {
  return {
    installAuditPath: readFlag(args, '--install-audit'),
    outDir: readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR,
    json: args.includes('--json'),
  };
}

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function buildMarkdown(report: Omit<ScannerSurfaceSmokeReport, 'markdown'>): string {
  return [
    '# Unified Desk Output Scanner Surface Smoke',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local scanner surface render smoke only. It reads the saved install audit, renders scanner-facing rows, and does not post Discord, write Supabase, read live bridge data, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Summary',
    `- Rendered rows: ${report.summary.renderedRows}.`,
    `- Approved Desk Plans: ${report.summary.approvedDeskPlanRows}.`,
    `- Forming Desk Reads: ${report.summary.formingDeskReadRows}.`,
    `- Discord-post rows: ${report.summary.discordPostRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Wording violation rows: ${report.summary.wordingViolationRows}.`,
    `- Blocked rows: ${report.summary.blockedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Sample Rendered Rows',
    '| Date | Session | State | Model | Direction | Level Line | Proof |',
    '|---|---|---|---|---|---|---|',
    ...report.surface.rows.slice(0, 40).map((row) => `| ${row.date} | ${row.session} | ${row.stateLabel} | ${row.model} | ${row.direction} | ${row.levelLine} | ${row.proofLine} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildUnifiedDeskOutputScannerSurfaceSmokeReport(args: {
  installAuditPath: string;
  installAuditReport: ScannerVisibilityInstallAuditReport;
}, generatedAt = new Date().toISOString()): ScannerSurfaceSmokeReport {
  const surface = buildUnifiedDeskOutputScannerSurfaceModel(args.installAuditReport.model);
  const blockers = [
    args.installAuditReport.reportType === 'unified_desk_output_scanner_visibility_install_audit'
      ? null
      : 'Source report is not the scanner visibility install audit.',
    args.installAuditReport.status === 'pass' ? null : 'Scanner visibility install audit is blocked.',
    ...surface.blockers,
  ].filter((item): item is string => Boolean(item));
  const report: Omit<ScannerSurfaceSmokeReport, 'markdown'> = {
    reportType: 'unified_desk_output_scanner_surface_smoke',
    generatedAt,
    status: blockers.length ? 'blocked' : 'pass',
    authority: {
      localOnly: true,
      readsSavedInstallAuditOnly: true,
      rendersScannerSurfaceOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      automatedOrders: false,
    },
    source: {
      installAuditPath: args.installAuditPath,
      installAuditStatus: args.installAuditReport.status,
    },
    summary: {
      renderedRows: surface.summary.rows,
      approvedDeskPlanRows: surface.summary.approvedDeskPlans,
      formingDeskReadRows: surface.summary.formingDeskReads,
      discordPostRows: surface.summary.discordPostRows,
      supabaseWriteRows: surface.summary.supabaseWriteRows,
      liveBridgeReadRows: surface.summary.liveBridgeReadRows,
      canExecuteTrueRows: surface.summary.canExecuteTrueRows,
      wordingViolationRows: surface.summary.wordingViolationRows,
      blockedRows: blockers.length,
      recommendation: blockers.length ? 'hold_for_surface_contract_fix' : 'surface_ready_for_local_display_consumer',
    },
    surface,
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeUnifiedDeskOutputScannerSurfaceSmokeReport(report: ScannerSurfaceSmokeReport, outDir: string): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-desk-output-scanner-surface-smoke-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-desk-output-scanner-surface-smoke-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const installAuditPath = path.resolve(options.installAuditPath ||
    latestMatchingFile(DEFAULT_REPORT_DIR, /^unified-desk-output-scanner-visibility-install-audit-\d+\.json$/) ||
    '');
  if (!fs.existsSync(installAuditPath)) throw new Error('Missing Unified Desk Output scanner visibility install audit path.');
  const report = buildUnifiedDeskOutputScannerSurfaceSmokeReport({
    installAuditPath,
    installAuditReport: readJson<ScannerVisibilityInstallAuditReport>(installAuditPath),
  });
  const written = writeUnifiedDeskOutputScannerSurfaceSmokeReport(report, path.resolve(options.outDir));
  if (options.json) {
    console.log(JSON.stringify({ ...written, status: report.status, summary: report.summary, blockers: report.blockers.slice(0, 20) }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nJSON: ${written.jsonPath}`);
    console.log(`Markdown: ${written.markdownPath}`);
  }
  process.exitCode = report.status === 'pass' ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
