import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { UnifiedDeskOutputScannerSurfaceModel } from '../../src/lib/unifiedDeskOutputScannerSurface';

type ReportStatus = 'pass' | 'blocked';

interface SourceReport {
  reportType?: string;
  status?: ReportStatus;
  summary?: Record<string, unknown>;
  scannerSurfaceSmokeImportPayload?: {
    reportType?: string;
    status?: ReportStatus;
    surface?: UnifiedDeskOutputScannerSurfaceModel;
    summary?: Record<string, unknown>;
    blockers?: string[];
  } | null;
  blockers?: string[];
}

interface RuntimePreview {
  status: 'disabled' | 'ready' | 'blocked';
  explicitLocalPreview: boolean;
  runtimeGateEnabled: false;
  rows: UnifiedDeskOutputScannerSurfaceModel['rows'];
  summary: {
    scannerPreviewRows: number;
    approvedDeskPlanRows: number;
    formingDeskReadRows: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    tradingLogicChangedRows: number;
    automatedOrderRows: number;
  };
  blockers: string[];
}

interface FiveModelDisabledRuntimeWiringPreviewReport {
  reportType: 'five_model_disabled_scanner_runtime_wiring_preview';
  generatedAt: string;
  status: ReportStatus;
  authority: {
    localOnly: true;
    readsSavedFiveModelArtifactsOnly: true;
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
    readinessPath: string;
    hiddenImportProofPath: string;
  };
  summary: {
    readinessPassed: boolean;
    defaultStatus: 'disabled' | 'ready' | 'blocked';
    localPreviewStatus: 'disabled' | 'ready' | 'blocked';
    defaultScannerPreviewRows: number;
    localScannerPreviewRows: number;
    approvedDeskPlanRows: number;
    formingDeskReadRows: number;
    runtimeGateEnabled: false;
    scannerRuntimeChangedRows: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    tradingLogicChangedRows: number;
    automatedOrderRows: number;
    blockedRows: number;
    recommendation: 'ready_for_local_scanner_consumer_probe' | 'hold_for_five_model_runtime_wiring_fix';
  };
  defaultPreview: RuntimePreview;
  localPreview: RuntimePreview;
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  readinessPath: string | null;
  hiddenImportProofPath: string | null;
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
    readinessPath: readFlag(args, '--readiness'),
    hiddenImportProofPath: readFlag(args, '--hidden-import-proof'),
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
        return readJson<SourceReport>(filePath).reportType === reportType;
      } catch {
        return false;
      }
    }) || null;
}

function numberValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function emptyPreview(): RuntimePreview {
  return {
    status: 'disabled',
    explicitLocalPreview: false,
    runtimeGateEnabled: false,
    rows: [],
    summary: {
      scannerPreviewRows: 0,
      approvedDeskPlanRows: 0,
      formingDeskReadRows: 0,
      discordPostRows: 0,
      supabaseWriteRows: 0,
      liveBridgeReadRows: 0,
      canExecuteTrueRows: 0,
      tradingLogicChangedRows: 0,
      automatedOrderRows: 0,
    },
    blockers: [],
  };
}

function localPreview(surface: UnifiedDeskOutputScannerSurfaceModel | null, sourceBlockers: string[]): RuntimePreview {
  const rows = surface?.rows || [];
  const blockers = [
    surface?.status === 'ready' ? null : 'Five-model scanner surface is not ready.',
    ...sourceBlockers,
  ].filter((item): item is string => Boolean(item));
  return {
    status: blockers.length ? 'blocked' : 'ready',
    explicitLocalPreview: true,
    runtimeGateEnabled: false,
    rows: blockers.length ? [] : rows,
    summary: {
      scannerPreviewRows: blockers.length ? 0 : rows.length,
      approvedDeskPlanRows: blockers.length ? 0 : rows.filter((row) => row.state === 'APPROVED_DESK_PLAN').length,
      formingDeskReadRows: blockers.length ? 0 : rows.filter((row) => row.state === 'FORMING_DESK_READ').length,
      discordPostRows: rows.filter((row) => row.publishDiscord).length,
      supabaseWriteRows: rows.filter((row) => row.writesSupabase).length,
      liveBridgeReadRows: rows.filter((row) => row.readsLiveBridge).length,
      canExecuteTrueRows: rows.filter((row) => row.canExecute).length,
      tradingLogicChangedRows: 0,
      automatedOrderRows: 0,
    },
    blockers,
  };
}

function buildMarkdown(report: Omit<FiveModelDisabledRuntimeWiringPreviewReport, 'markdown'>): string {
  return [
    '# Five Model Disabled Scanner Runtime Wiring Preview',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: disabled local scanner-runtime wiring preview only. It reads saved five-model artifacts and writes diagnostics. It does not enable runtime behavior, post Discord, write Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Summary',
    `- Readiness passed: ${report.summary.readinessPassed}.`,
    `- Default status: ${report.summary.defaultStatus}.`,
    `- Local preview status: ${report.summary.localPreviewStatus}.`,
    `- Default scanner preview rows: ${report.summary.defaultScannerPreviewRows}.`,
    `- Local scanner preview rows: ${report.summary.localScannerPreviewRows}.`,
    `- Approved Desk Plan rows: ${report.summary.approvedDeskPlanRows}.`,
    `- Forming Desk Read rows: ${report.summary.formingDeskReadRows}.`,
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

export function buildFiveModelDisabledScannerRuntimeWiringPreviewReport(args: {
  readinessPath: string;
  readiness: SourceReport;
  hiddenImportProofPath: string;
  hiddenImportProof: SourceReport;
}, generatedAt = new Date().toISOString()): FiveModelDisabledRuntimeWiringPreviewReport {
  const importPayload = args.hiddenImportProof.scannerSurfaceSmokeImportPayload;
  const surface = importPayload?.surface || null;
  const defaultPreview = emptyPreview();
  const explicitPreview = localPreview(surface, [
    ...(args.readiness.blockers || []),
    ...(args.hiddenImportProof.blockers || []),
    ...(importPayload?.blockers || []),
  ]);
  const blockers = [
    args.readiness.reportType === 'five_model_final_local_readiness_checklist' ? null : 'Readiness report type is not five-model final local readiness checklist.',
    args.readiness.status === 'pass' ? null : 'Readiness report is not pass.',
    args.hiddenImportProof.reportType === 'unified_desk_output_disabled_local_scanner_preview_render_install_proof' ? null : 'Hidden import proof report type is invalid.',
    args.hiddenImportProof.status === 'pass' ? null : 'Hidden import proof is not pass.',
    args.hiddenImportProof.summary?.hiddenPreviewImportReady === true ? null : 'Hidden import proof is not import-ready.',
    importPayload?.reportType === 'unified_desk_output_scanner_surface_smoke' ? null : 'Hidden import proof has no scanner surface smoke payload.',
    defaultPreview.summary.scannerPreviewRows === 0 ? null : 'Default disabled runtime preview produced rows.',
    explicitPreview.status === 'ready' ? null : `Explicit local runtime preview status is ${explicitPreview.status}.`,
    explicitPreview.summary.scannerPreviewRows === numberValue(args.readiness.summary?.renderedRows) ? null : 'Explicit local runtime preview row count does not match readiness rendered rows.',
    explicitPreview.summary.approvedDeskPlanRows === numberValue(args.readiness.summary?.approvedDeskPlanRows) ? null : 'Explicit local runtime preview Approved Desk Plan count does not match readiness.',
    explicitPreview.summary.formingDeskReadRows === numberValue(args.readiness.summary?.formingDeskReadRows) ? null : 'Explicit local runtime preview Forming Desk Read count does not match readiness.',
    explicitPreview.summary.discordPostRows === 0 ? null : 'Explicit local runtime preview would post Discord.',
    explicitPreview.summary.supabaseWriteRows === 0 ? null : 'Explicit local runtime preview would write Supabase.',
    explicitPreview.summary.liveBridgeReadRows === 0 ? null : 'Explicit local runtime preview would read live bridge.',
    explicitPreview.summary.canExecuteTrueRows === 0 ? null : 'Explicit local runtime preview has canExecute=true rows.',
    ...explicitPreview.blockers,
  ].filter((item): item is string => Boolean(item));
  const status: ReportStatus = blockers.length ? 'blocked' : 'pass';
  const report: Omit<FiveModelDisabledRuntimeWiringPreviewReport, 'markdown'> = {
    reportType: 'five_model_disabled_scanner_runtime_wiring_preview',
    generatedAt,
    status,
    authority: {
      localOnly: true,
      readsSavedFiveModelArtifactsOnly: true,
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
      readinessPath: args.readinessPath,
      hiddenImportProofPath: args.hiddenImportProofPath,
    },
    summary: {
      readinessPassed: args.readiness.status === 'pass',
      defaultStatus: defaultPreview.status,
      localPreviewStatus: explicitPreview.status,
      defaultScannerPreviewRows: defaultPreview.summary.scannerPreviewRows,
      localScannerPreviewRows: explicitPreview.summary.scannerPreviewRows,
      approvedDeskPlanRows: explicitPreview.summary.approvedDeskPlanRows,
      formingDeskReadRows: explicitPreview.summary.formingDeskReadRows,
      runtimeGateEnabled: false,
      scannerRuntimeChangedRows: 0,
      discordPostRows: explicitPreview.summary.discordPostRows,
      supabaseWriteRows: explicitPreview.summary.supabaseWriteRows,
      liveBridgeReadRows: explicitPreview.summary.liveBridgeReadRows,
      canExecuteTrueRows: explicitPreview.summary.canExecuteTrueRows,
      tradingLogicChangedRows: 0,
      automatedOrderRows: 0,
      blockedRows: blockers.length,
      recommendation: status === 'pass'
        ? 'ready_for_local_scanner_consumer_probe'
        : 'hold_for_five_model_runtime_wiring_fix',
    },
    defaultPreview,
    localPreview: explicitPreview,
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeFiveModelDisabledScannerRuntimeWiringPreviewReport(
  report: FiveModelDisabledRuntimeWiringPreviewReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `five-model-disabled-scanner-runtime-wiring-preview-${stamp}.json`);
  const markdownPath = path.join(outDir, `five-model-disabled-scanner-runtime-wiring-preview-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const outDir = path.resolve(options.outDir);
  const readinessPath = path.resolve(options.readinessPath ||
    latestReportByType(outDir, 'five_model_final_local_readiness_checklist') ||
    '');
  const hiddenImportProofPath = path.resolve(options.hiddenImportProofPath ||
    latestReportByType(outDir, 'unified_desk_output_disabled_local_scanner_preview_render_install_proof') ||
    '');
  for (const filePath of [readinessPath, hiddenImportProofPath]) {
    if (!fs.existsSync(filePath)) throw new Error(`Missing five-model runtime wiring source artifact: ${filePath}`);
  }
  const report = buildFiveModelDisabledScannerRuntimeWiringPreviewReport({
    readinessPath,
    readiness: readJson<SourceReport>(readinessPath),
    hiddenImportProofPath,
    hiddenImportProof: readJson<SourceReport>(hiddenImportProofPath),
  });
  const written = writeFiveModelDisabledScannerRuntimeWiringPreviewReport(report, outDir);
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
