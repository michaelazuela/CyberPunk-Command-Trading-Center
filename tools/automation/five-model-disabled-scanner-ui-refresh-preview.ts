import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { UnifiedDeskOutputScannerSurfaceRow } from '../../src/lib/unifiedDeskOutputScannerSurface';

type ReportStatus = 'pass' | 'blocked';

interface ConsumerProbeReport {
  reportType?: string;
  status?: ReportStatus;
  summary?: Record<string, unknown>;
  consumedRows?: UnifiedDeskOutputScannerSurfaceRow[];
  blockers?: string[];
}

interface FiveModelDisabledScannerUiRefreshPreviewReport {
  reportType: 'five_model_disabled_scanner_ui_refresh_preview';
  generatedAt: string;
  status: ReportStatus;
  authority: {
    localOnly: true;
    readsSavedConsumerProbeOnly: true;
    writesDiagnosticArtifactsOnly: true;
    defaultDisabled: true;
    runtimeGateEnabled: false;
    refreshesScannerUiOnly: true;
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
    consumerProbePath: string;
  };
  summary: {
    scannerUiRefreshAllowed: boolean;
    defaultDisabled: boolean;
    localPreviewStatus: string;
    uiRows: number;
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
    recommendation: 'ready_for_disabled_scanner_ui_adapter_preview' | 'hold_for_five_model_ui_refresh_fix';
  };
  uiRows: Array<{
    cardId: string;
    date: string;
    session: 'morning' | 'lunch' | 'evening';
    stateLabel: 'Approved Desk Plan' | 'Forming Desk Read';
    model: string;
    direction: 'LONG' | 'SHORT';
    levelLine: string;
    proofLine: string;
    authorityLine: string;
  }>;
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  consumerProbePath: string | null;
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
    consumerProbePath: readFlag(args, '--consumer-probe'),
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
        return readJson<ConsumerProbeReport>(filePath).reportType === reportType;
      } catch {
        return false;
      }
    }) || null;
}

function numberValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function toUiRows(rows: UnifiedDeskOutputScannerSurfaceRow[]): FiveModelDisabledScannerUiRefreshPreviewReport['uiRows'] {
  return rows.map((row) => ({
    cardId: row.cardId,
    date: row.date,
    session: row.session,
    stateLabel: row.stateLabel,
    model: row.model,
    direction: row.direction,
    levelLine: row.levelLine,
    proofLine: row.proofLine,
    authorityLine: row.authorityLine,
  }));
}

function buildMarkdown(report: Omit<FiveModelDisabledScannerUiRefreshPreviewReport, 'markdown'>): string {
  return [
    '# Five Model Disabled Scanner UI Refresh Preview',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: disabled local scanner UI refresh preview only. It reads the saved five-model consumer probe and writes diagnostics. It does not enable runtime behavior, post Discord, write Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Summary',
    `- Scanner UI refresh allowed: ${report.summary.scannerUiRefreshAllowed}.`,
    `- Default disabled: ${report.summary.defaultDisabled}.`,
    `- Local preview status: ${report.summary.localPreviewStatus}.`,
    `- UI rows: ${report.summary.uiRows}.`,
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

export function buildFiveModelDisabledScannerUiRefreshPreviewReport(args: {
  consumerProbePath: string;
  consumerProbe: ConsumerProbeReport;
}, generatedAt = new Date().toISOString()): FiveModelDisabledScannerUiRefreshPreviewReport {
  const rows = args.consumerProbe.consumedRows || [];
  const expectedRows = numberValue(args.consumerProbe.summary?.consumedRows);
  const blockers = [
    args.consumerProbe.reportType === 'five_model_local_scanner_consumer_probe' ? null : 'Consumer probe report type is invalid.',
    args.consumerProbe.status === 'pass' ? null : 'Consumer probe is not pass.',
    args.consumerProbe.summary?.defaultStatus === 'disabled' ? null : 'Consumer probe default status is not disabled.',
    args.consumerProbe.summary?.localPreviewStatus === 'ready' ? null : 'Consumer probe local preview is not ready.',
    rows.length === expectedRows ? null : `UI rows ${rows.length} do not match consumer rows ${expectedRows}.`,
    rows.length > 0 ? null : 'No rows are available for scanner UI refresh preview.',
    rows.filter((row) => row.publishDiscord).length === 0 ? null : 'UI refresh rows would post Discord.',
    rows.filter((row) => row.writesSupabase).length === 0 ? null : 'UI refresh rows would write Supabase.',
    rows.filter((row) => row.readsLiveBridge).length === 0 ? null : 'UI refresh rows would read live bridge.',
    rows.filter((row) => row.canExecute).length === 0 ? null : 'UI refresh rows include canExecute=true.',
    numberValue(args.consumerProbe.summary?.scannerRuntimeChangedRows) === 0 ? null : 'Consumer probe changed scanner runtime.',
    numberValue(args.consumerProbe.summary?.tradingLogicChangedRows) === 0 ? null : 'Consumer probe changed trading logic.',
    numberValue(args.consumerProbe.summary?.automatedOrderRows) === 0 ? null : 'Consumer probe includes automated orders.',
    ...(args.consumerProbe.blockers || []),
  ].filter((item): item is string => Boolean(item));
  const status: ReportStatus = blockers.length ? 'blocked' : 'pass';
  const uiRows = blockers.length ? [] : toUiRows(rows);
  const report: Omit<FiveModelDisabledScannerUiRefreshPreviewReport, 'markdown'> = {
    reportType: 'five_model_disabled_scanner_ui_refresh_preview',
    generatedAt,
    status,
    authority: {
      localOnly: true,
      readsSavedConsumerProbeOnly: true,
      writesDiagnosticArtifactsOnly: true,
      defaultDisabled: true,
      runtimeGateEnabled: false,
      refreshesScannerUiOnly: true,
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
      consumerProbePath: args.consumerProbePath,
    },
    summary: {
      scannerUiRefreshAllowed: blockers.length === 0,
      defaultDisabled: true,
      localPreviewStatus: String(args.consumerProbe.summary?.localPreviewStatus || '<missing>'),
      uiRows: uiRows.length,
      approvedDeskPlanRows: uiRows.filter((row) => row.stateLabel === 'Approved Desk Plan').length,
      formingDeskReadRows: uiRows.filter((row) => row.stateLabel === 'Forming Desk Read').length,
      morningRows: uiRows.filter((row) => row.session === 'morning').length,
      lunchRows: uiRows.filter((row) => row.session === 'lunch').length,
      eveningRows: uiRows.filter((row) => row.session === 'evening').length,
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
        ? 'ready_for_disabled_scanner_ui_adapter_preview'
        : 'hold_for_five_model_ui_refresh_fix',
    },
    uiRows,
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeFiveModelDisabledScannerUiRefreshPreviewReport(
  report: FiveModelDisabledScannerUiRefreshPreviewReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `five-model-disabled-scanner-ui-refresh-preview-${stamp}.json`);
  const markdownPath = path.join(outDir, `five-model-disabled-scanner-ui-refresh-preview-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const outDir = path.resolve(options.outDir);
  const consumerProbePath = path.resolve(options.consumerProbePath ||
    latestReportByType(outDir, 'five_model_local_scanner_consumer_probe') ||
    '');
  if (!fs.existsSync(consumerProbePath)) throw new Error(`Missing five-model consumer probe artifact: ${consumerProbePath}`);
  const report = buildFiveModelDisabledScannerUiRefreshPreviewReport({
    consumerProbePath,
    consumerProbe: readJson<ConsumerProbeReport>(consumerProbePath),
  });
  const written = writeFiveModelDisabledScannerUiRefreshPreviewReport(report, outDir);
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
