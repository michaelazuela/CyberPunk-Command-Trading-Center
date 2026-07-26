import fs from 'node:fs';
import path from 'node:path';
import type { UnifiedDeskOutputScannerSurfaceModel } from '../../src/lib/unifiedDeskOutputScannerSurface';

interface Args {
  surfaceAdapterJson: string;
  json: boolean;
}

interface SurfaceAdapterReport {
  reportType: 'five_model_scanner_surface_adapter_preview';
  status: 'pass' | 'blocked';
  summary: {
    localPreviewRequested: boolean;
    renderedRows: number;
    approvedDeskPlanRows: number;
    formingDeskReadRows: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    wordingViolationRows: number;
    blockedRows: number;
  };
  surface: UnifiedDeskOutputScannerSurfaceModel;
  blockers: string[];
}

interface ScannerSurfaceSmokePayload {
  reportType: 'unified_desk_output_scanner_surface_smoke';
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
  };
  surface: UnifiedDeskOutputScannerSurfaceModel;
  blockers: string[];
}

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] || null;
}

function parseArgs(argv = process.argv.slice(2)): Args {
  const surfaceAdapterJson = readFlag(argv, '--surface-adapter-json');
  if (!surfaceAdapterJson) throw new Error('--surface-adapter-json is required');
  return {
    surfaceAdapterJson,
    json: argv.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function scannerSurfaceSmokePayload(report: SurfaceAdapterReport): ScannerSurfaceSmokePayload {
  const blockers = [
    report.reportType === 'five_model_scanner_surface_adapter_preview' ? null : 'Source report is not five-model scanner surface adapter preview.',
    report.status === 'pass' ? null : 'Source surface adapter report is blocked.',
    report.summary.localPreviewRequested ? null : 'Source surface adapter was not run with explicit local preview.',
    report.surface.status === 'ready' ? null : 'Source scanner surface is not ready.',
    report.summary.discordPostRows === 0 ? null : 'Source surface contains Discord-post rows.',
    report.summary.supabaseWriteRows === 0 ? null : 'Source surface contains Supabase-write rows.',
    report.summary.liveBridgeReadRows === 0 ? null : 'Source surface contains live bridge read rows.',
    report.summary.canExecuteTrueRows === 0 ? null : 'Source surface contains canExecute=true rows.',
    report.summary.wordingViolationRows === 0 ? null : 'Source surface contains blocked wording rows.',
    report.summary.blockedRows === 0 ? null : 'Source surface contains blocked rows.',
    ...report.blockers,
    ...report.surface.blockers,
  ].filter((item): item is string => Boolean(item));

  return {
    reportType: 'unified_desk_output_scanner_surface_smoke',
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
    summary: {
      renderedRows: blockers.length ? 0 : report.summary.renderedRows,
      approvedDeskPlanRows: blockers.length ? 0 : report.summary.approvedDeskPlanRows,
      formingDeskReadRows: blockers.length ? 0 : report.summary.formingDeskReadRows,
      discordPostRows: report.summary.discordPostRows,
      supabaseWriteRows: report.summary.supabaseWriteRows,
      liveBridgeReadRows: report.summary.liveBridgeReadRows,
      canExecuteTrueRows: report.summary.canExecuteTrueRows,
      wordingViolationRows: report.summary.wordingViolationRows,
      blockedRows: blockers.length,
    },
    surface: blockers.length ? { ...report.surface, rows: [], blockers } : report.surface,
    blockers,
  };
}

function markdown(report: {
  status: 'pass' | 'blocked';
  summary: {
    hiddenPreviewImportReady: boolean;
    renderedRows: number;
    approvedDeskPlanRows: number;
    formingDeskReadRows: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    blockedRows: number;
  };
  blockers: string[];
}): string {
  return [
    '# Five Model Hidden Preview Import Render Proof',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: hidden local preview import payload only. It reads the saved five-model surface adapter output and writes diagnostic artifacts. It does not post Discord, write Supabase, read live bridge data, change scanner runtime behavior, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Summary',
    `- Hidden preview import ready: ${report.summary.hiddenPreviewImportReady}.`,
    `- Rendered rows: ${report.summary.renderedRows}.`,
    `- Approved Desk Plan rows: ${report.summary.approvedDeskPlanRows}.`,
    `- Forming Desk Read rows: ${report.summary.formingDeskReadRows}.`,
    `- Discord-post rows: ${report.summary.discordPostRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Blocked rows: ${report.summary.blockedRows}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildFiveModelHiddenPreviewImportRenderProof(args: {
  surfaceAdapterJson: string;
  surfaceAdapterReport: SurfaceAdapterReport;
}, generatedAt = new Date().toISOString()) {
  const payload = scannerSurfaceSmokePayload(args.surfaceAdapterReport);
  const blockers = [
    payload.status === 'pass' ? null : 'Scanner surface smoke import payload is blocked.',
    payload.summary.renderedRows > 0 ? null : 'Scanner surface smoke import payload has no rendered rows.',
    payload.summary.discordPostRows === 0 ? null : 'Scanner surface smoke payload contains Discord-post rows.',
    payload.summary.supabaseWriteRows === 0 ? null : 'Scanner surface smoke payload contains Supabase-write rows.',
    payload.summary.liveBridgeReadRows === 0 ? null : 'Scanner surface smoke payload contains live bridge read rows.',
    payload.summary.canExecuteTrueRows === 0 ? null : 'Scanner surface smoke payload contains canExecute=true rows.',
    ...payload.blockers,
  ].filter((item): item is string => Boolean(item));
  const report = {
    reportType: 'unified_desk_output_disabled_local_scanner_preview_render_install_proof',
    generatedAt,
    status: blockers.length ? 'blocked' as const : 'pass' as const,
    authority: {
      localOnly: true,
      readsSavedSurfaceAdapterOnly: true,
      writesDiagnosticArtifactsOnly: true,
      producesHiddenPreviewImportPayload: true,
      defaultDisabled: true,
      runtimeGateEnabled: false,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesNormalScannerOutput: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      canExecute: false,
      automatedOrders: false,
    },
    source: {
      surfaceAdapterJson: args.surfaceAdapterJson,
      surfaceAdapterStatus: args.surfaceAdapterReport.status,
    },
    summary: {
      hiddenPreviewImportReady: blockers.length === 0,
      renderedRows: payload.summary.renderedRows,
      approvedDeskPlanRows: payload.summary.approvedDeskPlanRows,
      formingDeskReadRows: payload.summary.formingDeskReadRows,
      discordPostRows: payload.summary.discordPostRows,
      supabaseWriteRows: payload.summary.supabaseWriteRows,
      liveBridgeReadRows: payload.summary.liveBridgeReadRows,
      canExecuteTrueRows: payload.summary.canExecuteTrueRows,
      wordingViolationRows: payload.summary.wordingViolationRows,
      blockedRows: blockers.length,
      recommendation: blockers.length ? 'hold_for_hidden_preview_import_fix' : 'ready_for_hidden_local_preview_browser_verification',
    },
    scannerSurfaceSmokeImportPayload: blockers.length ? null : payload,
    blockers,
  };
  return {
    ...report,
    markdown: markdown(report),
  };
}

function writeReport(report: ReturnType<typeof buildFiveModelHiddenPreviewImportRenderProof>): { jsonPath: string; markdownPath: string } {
  const outDir = path.resolve('tools/automation/diagnostic-reports');
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `five-model-hidden-preview-import-render-proof-${stamp}.json`);
  const markdownPath = path.join(outDir, `five-model-hidden-preview-import-render-proof-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

if (process.argv[1] && path.basename(process.argv[1]) === 'five-model-hidden-preview-import-render-proof.ts') {
  const args = parseArgs();
  const surfaceAdapterReport = readJson<SurfaceAdapterReport>(args.surfaceAdapterJson);
  const report = buildFiveModelHiddenPreviewImportRenderProof({
    surfaceAdapterJson: args.surfaceAdapterJson,
    surfaceAdapterReport,
  });
  const written = writeReport(report);
  console.log(JSON.stringify({ ...written, status: report.status, summary: report.summary, blockers: report.blockers.slice(0, 20) }, null, 2));
}
