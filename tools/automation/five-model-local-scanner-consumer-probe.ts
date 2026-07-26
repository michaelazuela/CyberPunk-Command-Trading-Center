import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { UnifiedDeskOutputScannerSurfaceRow } from '../../src/lib/unifiedDeskOutputScannerSurface';

type ReportStatus = 'pass' | 'blocked';

interface RuntimePreviewReport {
  reportType?: string;
  status?: ReportStatus;
  summary?: Record<string, unknown>;
  defaultPreview?: {
    status?: string;
    rows?: UnifiedDeskOutputScannerSurfaceRow[];
    summary?: Record<string, unknown>;
  };
  localPreview?: {
    status?: string;
    rows?: UnifiedDeskOutputScannerSurfaceRow[];
    summary?: Record<string, unknown>;
    blockers?: string[];
  };
  blockers?: string[];
}

interface FiveModelLocalScannerConsumerProbeReport {
  reportType: 'five_model_local_scanner_consumer_probe';
  generatedAt: string;
  status: ReportStatus;
  authority: {
    localOnly: true;
    readsSavedRuntimePreviewOnly: true;
    writesDiagnosticArtifactsOnly: true;
    defaultDisabled: true;
    runtimeGateEnabled: false;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    canExecute: false;
    automatedOrders: false;
  };
  source: {
    runtimePreviewPath: string;
  };
  summary: {
    defaultStatus: string;
    localPreviewStatus: string;
    defaultScannerPreviewRows: number;
    consumedRows: number;
    approvedDeskPlanRows: number;
    formingDeskReadRows: number;
    morningRows: number;
    lunchRows: number;
    eveningRows: number;
    runtimeGateEnabled: false;
    scannerRuntimeChangedRows: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    tradingLogicChangedRows: number;
    automatedOrderRows: number;
    blockedRows: number;
    recommendation: 'ready_for_disabled_scanner_ui_refresh_preview' | 'hold_for_five_model_consumer_probe_fix';
  };
  consumedRows: UnifiedDeskOutputScannerSurfaceRow[];
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  runtimePreviewPath: string | null;
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
    runtimePreviewPath: readFlag(args, '--runtime-preview'),
    outDir: readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function latestReportByType(reportDir: string, reportType: string): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
    .find((filePath) => {
      try {
        return readJson<RuntimePreviewReport>(filePath).reportType === reportType;
      } catch {
        return false;
      }
    }) || null;
}

function numberValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function buildMarkdown(report: Omit<FiveModelLocalScannerConsumerProbeReport, 'markdown'>): string {
  return [
    '# Five Model Local Scanner Consumer Probe',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local scanner consumer probe only. It reads the saved five-model disabled runtime preview and writes diagnostics. It does not enable runtime behavior, post Discord, write Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Summary',
    `- Default status: ${report.summary.defaultStatus}.`,
    `- Local preview status: ${report.summary.localPreviewStatus}.`,
    `- Default scanner preview rows: ${report.summary.defaultScannerPreviewRows}.`,
    `- Consumed rows: ${report.summary.consumedRows}.`,
    `- Approved Desk Plan rows: ${report.summary.approvedDeskPlanRows}.`,
    `- Forming Desk Read rows: ${report.summary.formingDeskReadRows}.`,
    `- Morning rows: ${report.summary.morningRows}.`,
    `- Lunch rows: ${report.summary.lunchRows}.`,
    `- Evening rows: ${report.summary.eveningRows}.`,
    `- Runtime gate enabled: ${report.summary.runtimeGateEnabled}.`,
    `- Scanner-runtime changed rows: ${report.summary.scannerRuntimeChangedRows}.`,
    `- Discord-post rows: ${report.summary.discordPostRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Trading-logic changed rows: ${report.summary.tradingLogicChangedRows}.`,
    `- Automated-order rows: ${report.summary.automatedOrderRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildFiveModelLocalScannerConsumerProbeReport(args: {
  runtimePreviewPath: string;
  runtimePreview: RuntimePreviewReport;
}, generatedAt = new Date().toISOString()): FiveModelLocalScannerConsumerProbeReport {
  const rows = args.runtimePreview.localPreview?.rows || [];
  const defaultRows = args.runtimePreview.defaultPreview?.rows || [];
  const summaryRows = numberValue(args.runtimePreview.summary?.localScannerPreviewRows);
  const blockers = [
    args.runtimePreview.reportType === 'five_model_disabled_scanner_runtime_wiring_preview' ? null : 'Runtime preview report type is invalid.',
    args.runtimePreview.status === 'pass' ? null : 'Runtime preview report is not pass.',
    args.runtimePreview.defaultPreview?.status === 'disabled' ? null : 'Default runtime preview is not disabled.',
    defaultRows.length === 0 ? null : 'Default runtime preview exposed rows.',
    args.runtimePreview.localPreview?.status === 'ready' ? null : 'Local runtime preview is not ready.',
    rows.length === summaryRows ? null : `Consumer rows ${rows.length} do not match runtime preview rows ${summaryRows}.`,
    rows.length > 0 ? null : 'Consumer probe has no rows.',
    rows.filter((row) => row.publishDiscord).length === 0 ? null : 'Consumer rows would post Discord.',
    rows.filter((row) => row.writesSupabase).length === 0 ? null : 'Consumer rows would write Supabase.',
    rows.filter((row) => row.readsLiveBridge).length === 0 ? null : 'Consumer rows would read live bridge.',
    rows.filter((row) => row.canExecute).length === 0 ? null : 'Consumer rows include canExecute=true.',
    ...(args.runtimePreview.blockers || []),
    ...(args.runtimePreview.localPreview?.blockers || []),
  ].filter((item): item is string => Boolean(item));
  const status: ReportStatus = blockers.length ? 'blocked' : 'pass';
  const report: Omit<FiveModelLocalScannerConsumerProbeReport, 'markdown'> = {
    reportType: 'five_model_local_scanner_consumer_probe',
    generatedAt,
    status,
    authority: {
      localOnly: true,
      readsSavedRuntimePreviewOnly: true,
      writesDiagnosticArtifactsOnly: true,
      defaultDisabled: true,
      runtimeGateEnabled: false,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesScannerBehavior: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      canExecute: false,
      automatedOrders: false,
    },
    source: {
      runtimePreviewPath: args.runtimePreviewPath,
    },
    summary: {
      defaultStatus: String(args.runtimePreview.defaultPreview?.status || '<missing>'),
      localPreviewStatus: String(args.runtimePreview.localPreview?.status || '<missing>'),
      defaultScannerPreviewRows: defaultRows.length,
      consumedRows: blockers.length ? 0 : rows.length,
      approvedDeskPlanRows: blockers.length ? 0 : rows.filter((row) => row.state === 'APPROVED_DESK_PLAN').length,
      formingDeskReadRows: blockers.length ? 0 : rows.filter((row) => row.state === 'FORMING_DESK_READ').length,
      morningRows: blockers.length ? 0 : rows.filter((row) => row.session === 'morning').length,
      lunchRows: blockers.length ? 0 : rows.filter((row) => row.session === 'lunch').length,
      eveningRows: blockers.length ? 0 : rows.filter((row) => row.session === 'evening').length,
      runtimeGateEnabled: false,
      scannerRuntimeChangedRows: 0,
      discordPostRows: rows.filter((row) => row.publishDiscord).length,
      supabaseWriteRows: rows.filter((row) => row.writesSupabase).length,
      liveBridgeReadRows: rows.filter((row) => row.readsLiveBridge).length,
      canExecuteTrueRows: rows.filter((row) => row.canExecute).length,
      tradingLogicChangedRows: 0,
      automatedOrderRows: 0,
      blockedRows: blockers.length,
      recommendation: status === 'pass'
        ? 'ready_for_disabled_scanner_ui_refresh_preview'
        : 'hold_for_five_model_consumer_probe_fix',
    },
    consumedRows: blockers.length ? [] : rows,
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeFiveModelLocalScannerConsumerProbeReport(
  report: FiveModelLocalScannerConsumerProbeReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `five-model-local-scanner-consumer-probe-${stamp}.json`);
  const markdownPath = path.join(outDir, `five-model-local-scanner-consumer-probe-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const outDir = path.resolve(options.outDir);
  const runtimePreviewPath = path.resolve(options.runtimePreviewPath ||
    latestReportByType(outDir, 'five_model_disabled_scanner_runtime_wiring_preview') ||
    '');
  if (!fs.existsSync(runtimePreviewPath)) throw new Error(`Missing five-model runtime preview artifact: ${runtimePreviewPath}`);
  const report = buildFiveModelLocalScannerConsumerProbeReport({
    runtimePreviewPath,
    runtimePreview: readJson<RuntimePreviewReport>(runtimePreviewPath),
  });
  const written = writeFiveModelLocalScannerConsumerProbeReport(report, outDir);
  if (options.json) {
    console.log(JSON.stringify({
      ...written,
      status: report.status,
      summary: report.summary,
      blockers: report.blockers.slice(0, 20),
    }, null, 2));
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
