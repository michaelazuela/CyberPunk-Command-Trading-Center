import fs from 'node:fs';
import path from 'node:path';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  buildUnifiedDeskOutputHiddenPreviewLocalVerificationReport,
  writeUnifiedDeskOutputHiddenPreviewLocalVerificationReport,
} from './unified-desk-output-hidden-preview-local-verification';
import type {
  UnifiedDeskOutputScannerSurfaceModel,
  UnifiedDeskOutputScannerSurfaceRow,
} from '../../src/lib/unifiedDeskOutputScannerSurface';

type ReportStatus = 'pass' | 'blocked';
type DeskSession = 'morning' | 'lunch' | 'evening';
type DeskStateLabel = 'Approved Desk Plan' | 'Forming Desk Read';
type Direction = 'LONG' | 'SHORT';

interface AdapterRow {
  adapterId: string;
  sourceCardId: string;
  date: string;
  session: DeskSession;
  stateLabel: DeskStateLabel;
  model: string;
  direction: Direction;
  display: {
    headline: string;
    levelLine: string;
    proofLine: string;
    authorityLine: string;
  };
  runtimeGateEnabled: false;
  productionGoLiveApproved: false;
  scannerRuntimeWired: false;
  scannerVisibleNow: false;
  publishDiscord: false;
  writesSupabase: false;
  readsLiveSupabase: false;
  readsLiveBridge: false;
  changesTradingLogic: false;
  changesCanExecute: false;
  canExecute: false;
  automatedOrders: false;
}

interface AdapterPreviewReport {
  reportType?: string;
  status?: ReportStatus;
  summary?: Record<string, unknown>;
  adapterRows?: AdapterRow[];
  blockers?: string[];
}

interface BrowserAdapterPreviewReport {
  reportType: 'five_model_disabled_scanner_ui_browser_adapter_preview';
  generatedAt: string;
  status: ReportStatus;
  authority: {
    localOnly: true;
    startsLocalViteOnly: boolean;
    readsSavedUiAdapterOnly: true;
    writesDiagnosticArtifactsOnly: true;
    importsHiddenPreviewPayloadOnly: true;
    defaultDisabled: true;
    runtimeGateEnabled: false;
    productionGoLiveApproved: false;
    scannerRuntimeWired: false;
    scannerVisibleNow: false;
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
    uiAdapterPreviewPath: string;
    hiddenRenderProofPath: string;
    hiddenPreviewVerificationPath: string | null;
    screenshotPath: string | null;
  };
  summary: {
    sourceAdapterRows: number;
    hiddenPreviewRows: number;
    previewReady: boolean;
    importReady: boolean;
    renderedRows: number;
    approvedDeskPlanRows: number;
    formingDeskReadRows: number;
    morningRows: number;
    lunchRows: number;
    eveningRows: number;
    runtimeGateEnabled: false;
    productionGoLiveApproved: false;
    scannerRuntimeWiredRows: number;
    productionScannerVisibleRows: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    tradingLogicChangedRows: number;
    automatedOrderRows: number;
    blockedRows: number;
    recommendation: 'ready_for_guarded_scanner_visibility_contract' | 'hold_for_five_model_browser_adapter_fix';
  };
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  uiAdapterPath: string | null;
  outDir: string;
  url: string | null;
  port: number;
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
    uiAdapterPath: readFlag(args, '--ui-adapter'),
    outDir: readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR,
    url: readFlag(args, '--url'),
    port: Number(readFlag(args, '--port') || 4178),
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
        return readJson<AdapterPreviewReport>(filePath).reportType === reportType;
      } catch {
        return false;
      }
    }) || null;
}

function numberValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function stateValue(label: DeskStateLabel): UnifiedDeskOutputScannerSurfaceRow['state'] {
  return label === 'Approved Desk Plan' ? 'APPROVED_DESK_PLAN' : 'FORMING_DESK_READ';
}

function surfaceRow(row: AdapterRow): UnifiedDeskOutputScannerSurfaceRow {
  return {
    cardId: row.adapterId,
    date: row.date,
    session: row.session,
    state: stateValue(row.stateLabel),
    stateLabel: row.stateLabel,
    model: row.model,
    direction: row.direction,
    headline: row.display.headline,
    bodyLines: [
      `${row.model} ${row.direction} desk output.`,
      'Hidden local preview render proof only; production scanner visibility remains disabled.',
    ],
    levelLine: row.display.levelLine,
    riskLine: 'Risk uses the scanner-owned entry/stop line from the saved adapter artifact.',
    proofLine: row.display.proofLine,
    invalidationLine: 'Invalidation remains the saved protected 5M stop line from the adapter artifact.',
    authorityLine: row.display.authorityLine,
    scannerVisibleNow: true,
    publishDiscord: false,
    writesSupabase: false,
    readsLiveBridge: false,
    canExecute: false,
  };
}

function blockedWording(row: UnifiedDeskOutputScannerSurfaceRow): boolean {
  return [
    row.headline,
    ...row.bodyLines,
    row.levelLine,
    row.riskLine,
    row.proofLine,
    row.invalidationLine,
    row.authorityLine,
  ].some((value) => /human[- ]review|no chase|missed|no[- ]trade/i.test(value));
}

function scannerSurfaceSmokePayload(rows: UnifiedDeskOutputScannerSurfaceRow[]) {
  const wordingViolationRows = rows.filter(blockedWording).length;
  const surface: UnifiedDeskOutputScannerSurfaceModel = {
    status: wordingViolationRows ? 'blocked' : 'ready',
    sourceOfTruth: 'scanner_surface_unified_desk_output_consumer',
    localScannerOnly: true,
    rows: wordingViolationRows ? [] : rows,
    summary: {
      rows: wordingViolationRows ? 0 : rows.length,
      approvedDeskPlans: wordingViolationRows ? 0 : rows.filter((row) => row.state === 'APPROVED_DESK_PLAN').length,
      formingDeskReads: wordingViolationRows ? 0 : rows.filter((row) => row.state === 'FORMING_DESK_READ').length,
      discordPostRows: rows.filter((row) => row.publishDiscord).length,
      supabaseWriteRows: rows.filter((row) => row.writesSupabase).length,
      liveBridgeReadRows: rows.filter((row) => row.readsLiveBridge).length,
      canExecuteTrueRows: rows.filter((row) => row.canExecute).length,
      wordingViolationRows,
    },
    blockers: wordingViolationRows ? ['Hidden preview surface rows contain blocked status wording.'] : [],
  };
  return {
    reportType: 'unified_desk_output_scanner_surface_smoke',
    status: surface.status === 'ready' ? 'pass' as const : 'blocked' as const,
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
      renderedRows: surface.summary.rows,
      approvedDeskPlanRows: surface.summary.approvedDeskPlans,
      formingDeskReadRows: surface.summary.formingDeskReads,
      discordPostRows: surface.summary.discordPostRows,
      supabaseWriteRows: surface.summary.supabaseWriteRows,
      liveBridgeReadRows: surface.summary.liveBridgeReadRows,
      canExecuteTrueRows: surface.summary.canExecuteTrueRows,
      wordingViolationRows: surface.summary.wordingViolationRows,
      blockedRows: surface.blockers.length,
    },
    surface,
    blockers: surface.blockers,
  };
}

export function buildFiveModelDisabledScannerUiAdapterRenderProof(args: {
  uiAdapterPreviewPath: string;
  uiAdapterPreview: AdapterPreviewReport;
}, generatedAt = new Date().toISOString()) {
  const adapterRows = args.uiAdapterPreview.adapterRows || [];
  const surfaceRows = adapterRows.map(surfaceRow);
  const payload = scannerSurfaceSmokePayload(surfaceRows);
  const blockers = [
    args.uiAdapterPreview.reportType === 'five_model_disabled_scanner_ui_adapter_preview' ? null : 'UI adapter report type is invalid.',
    args.uiAdapterPreview.status === 'pass' ? null : 'UI adapter report is not pass.',
    adapterRows.length === numberValue(args.uiAdapterPreview.summary?.adaptedRows) ? null : 'UI adapter row count does not match its summary.',
    adapterRows.length > 0 ? null : 'UI adapter has no rows.',
    numberValue(args.uiAdapterPreview.summary?.runtimeGateEnabled) === 0 ? null : 'UI adapter runtime gate is enabled.',
    numberValue(args.uiAdapterPreview.summary?.productionGoLiveApproved) === 0 ? null : 'UI adapter has production go-live approved.',
    numberValue(args.uiAdapterPreview.summary?.scannerRuntimeWiredRows) === 0 ? null : 'UI adapter has scanner runtime wired rows.',
    numberValue(args.uiAdapterPreview.summary?.scannerVisibleRows) === 0 ? null : 'UI adapter has production scanner-visible rows.',
    numberValue(args.uiAdapterPreview.summary?.discordPostRows) === 0 ? null : 'UI adapter has Discord-post rows.',
    numberValue(args.uiAdapterPreview.summary?.supabaseWriteRows) === 0 ? null : 'UI adapter has Supabase-write rows.',
    numberValue(args.uiAdapterPreview.summary?.liveSupabaseReadRows) === 0 ? null : 'UI adapter has live Supabase read rows.',
    numberValue(args.uiAdapterPreview.summary?.liveBridgeReadRows) === 0 ? null : 'UI adapter has live bridge read rows.',
    numberValue(args.uiAdapterPreview.summary?.canExecuteTrueRows) === 0 ? null : 'UI adapter has canExecute=true rows.',
    numberValue(args.uiAdapterPreview.summary?.tradingLogicChangedRows) === 0 ? null : 'UI adapter changed trading logic.',
    numberValue(args.uiAdapterPreview.summary?.automatedOrderRows) === 0 ? null : 'UI adapter has automated-order rows.',
    payload.status === 'pass' ? null : 'Hidden preview scanner-surface payload is blocked.',
    ...payload.blockers,
    ...(args.uiAdapterPreview.blockers || []),
  ].filter((item): item is string => Boolean(item));

  return {
    reportType: 'unified_desk_output_disabled_local_scanner_preview_render_install_proof' as const,
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
      surfaceAdapterJson: args.uiAdapterPreviewPath,
      surfaceAdapterStatus: args.uiAdapterPreview.status,
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
      tradingLogicChangedRows: 0,
      automatedOrderRows: 0,
      blockedRows: blockers.length,
      recommendation: blockers.length ? 'hold_for_hidden_preview_import_fix' : 'ready_for_hidden_local_preview_browser_verification',
    },
    scannerSurfaceSmokeImportPayload: blockers.length ? null : payload,
    blockers,
    markdown: [
      '# Five Model Disabled Scanner UI Browser Adapter Render Proof',
      '',
      `Status: ${blockers.length ? 'blocked' : 'pass'}`,
      '',
      'Authority: hidden local preview import payload only. It reads the saved five-model UI adapter output and writes diagnostic artifacts. It does not expose production scanner rows, post Discord, write Supabase, read live bridge data, change scanner runtime behavior, change trading logic, change canExecute, or place/manage orders.',
      '',
      '## Summary',
      `- Hidden preview import ready: ${blockers.length === 0}.`,
      `- Rendered rows: ${payload.summary.renderedRows}.`,
      `- Approved Desk Plan rows: ${payload.summary.approvedDeskPlanRows}.`,
      `- Forming Desk Read rows: ${payload.summary.formingDeskReadRows}.`,
      `- Discord-post rows: ${payload.summary.discordPostRows}.`,
      `- Supabase-write rows: ${payload.summary.supabaseWriteRows}.`,
      `- Live-bridge-read rows: ${payload.summary.liveBridgeReadRows}.`,
      `- canExecute true rows: ${payload.summary.canExecuteTrueRows}.`,
      '',
      '## Blockers',
      ...(blockers.length ? blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    ].join('\n'),
  };
}

function buildMarkdown(report: Omit<BrowserAdapterPreviewReport, 'markdown'>): string {
  return [
    '# Five Model Disabled Scanner UI Browser Adapter Preview',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: disabled local browser adapter preview only. It starts local Vite when needed, imports the generated hidden-preview payload, and writes diagnostics. It does not enable runtime behavior, expose production scanner rows, post Discord, write Supabase, read live Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Summary',
    `- Source adapter rows: ${report.summary.sourceAdapterRows}.`,
    `- Hidden preview rows: ${report.summary.hiddenPreviewRows}.`,
    `- Preview ready: ${report.summary.previewReady}.`,
    `- Import ready: ${report.summary.importReady}.`,
    `- Rendered rows: ${report.summary.renderedRows}.`,
    `- Approved Desk Plan rows: ${report.summary.approvedDeskPlanRows}.`,
    `- Forming Desk Read rows: ${report.summary.formingDeskReadRows}.`,
    `- Morning rows: ${report.summary.morningRows}.`,
    `- Lunch rows: ${report.summary.lunchRows}.`,
    `- Evening rows: ${report.summary.eveningRows}.`,
    `- Runtime gate enabled: ${report.summary.runtimeGateEnabled}.`,
    `- Production go-live approved: ${report.summary.productionGoLiveApproved}.`,
    `- Scanner-runtime wired rows: ${report.summary.scannerRuntimeWiredRows}.`,
    `- Production scanner-visible rows: ${report.summary.productionScannerVisibleRows}.`,
    `- Discord-post rows: ${report.summary.discordPostRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-Supabase-read rows: ${report.summary.liveSupabaseReadRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Trading-logic changed rows: ${report.summary.tradingLogicChangedRows}.`,
    `- Automated-order rows: ${report.summary.automatedOrderRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Source',
    `- UI adapter preview: ${report.source.uiAdapterPreviewPath}.`,
    `- Hidden render proof: ${report.source.hiddenRenderProofPath}.`,
    report.source.hiddenPreviewVerificationPath ? `- Hidden browser verification: ${report.source.hiddenPreviewVerificationPath}.` : '- Hidden browser verification: none.',
    report.source.screenshotPath ? `- Screenshot: ${report.source.screenshotPath}.` : '- Screenshot: none.',
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

function writeRenderProof(report: ReturnType<typeof buildFiveModelDisabledScannerUiAdapterRenderProof>, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, `five-model-disabled-scanner-ui-browser-adapter-render-proof-${Date.now()}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  return jsonPath;
}

function waitForServer(url: string, timeoutMs = 45000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          resolve();
          return;
        }
      } catch {
        // Keep polling until timeout.
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Timed out waiting for local Vite server at ${url}.`));
        return;
      }
      setTimeout(poll, 500);
    };
    poll();
  });
}

function startVite(port: number): ChildProcessWithoutNullStreams {
  const viteBin = path.resolve(__dirname, '../../node_modules/vite/bin/vite.js');
  return spawn(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', String(port)], {
    cwd: path.resolve(__dirname, '../..'),
    stdio: 'pipe',
  });
}

function stopProcessTree(processToStop: ChildProcessWithoutNullStreams): Promise<void> {
  if (!processToStop.pid || processToStop.killed) return Promise.resolve();
  if (process.platform !== 'win32') {
    processToStop.kill();
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const killer = spawn('taskkill', ['/PID', String(processToStop.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    killer.once('exit', () => resolve());
    killer.once('error', () => {
      processToStop.kill();
      resolve();
    });
  });
}

export async function buildFiveModelDisabledScannerUiBrowserAdapterPreviewReport(args: {
  uiAdapterPreviewPath: string;
  uiAdapterPreview: AdapterPreviewReport;
  url: string;
  outDir: string;
  startedLocalVite: boolean;
}, generatedAt = new Date().toISOString()): Promise<BrowserAdapterPreviewReport> {
  const renderProof = buildFiveModelDisabledScannerUiAdapterRenderProof({
    uiAdapterPreviewPath: args.uiAdapterPreviewPath,
    uiAdapterPreview: args.uiAdapterPreview,
  }, generatedAt);
  const hiddenRenderProofPath = writeRenderProof(renderProof, args.outDir);
  const hiddenVerification = await buildUnifiedDeskOutputHiddenPreviewLocalVerificationReport({
    url: args.url,
    renderProofPath: hiddenRenderProofPath,
    outDir: args.outDir,
    startedLocalVite: args.startedLocalVite,
  }, generatedAt);
  const hiddenWritten = writeUnifiedDeskOutputHiddenPreviewLocalVerificationReport(hiddenVerification, args.outDir);
  const adapterRows = args.uiAdapterPreview.adapterRows || [];
  const blockers = [
    renderProof.status === 'pass' ? null : 'Generated hidden render proof is blocked.',
    hiddenVerification.status === 'pass' ? null : 'Hidden browser verification is blocked.',
    hiddenVerification.summary.renderedRows === adapterRows.length ? null : 'Hidden browser rendered row count does not match adapter rows.',
    hiddenVerification.summary.discordPostRows === 0 ? null : 'Hidden browser verification has Discord-post rows.',
    hiddenVerification.summary.supabaseWriteRows === 0 ? null : 'Hidden browser verification has Supabase-write rows.',
    hiddenVerification.summary.liveBridgeReadRows === 0 ? null : 'Hidden browser verification has live bridge read rows.',
    hiddenVerification.summary.canExecuteTrueRows === 0 ? null : 'Hidden browser verification has canExecute=true rows.',
    hiddenVerification.summary.tradingLogicChangedRows === 0 ? null : 'Hidden browser verification changed trading logic.',
    hiddenVerification.summary.automatedOrderRows === 0 ? null : 'Hidden browser verification has automated orders.',
    ...renderProof.blockers,
    ...hiddenVerification.blockers,
  ].filter((item): item is string => Boolean(item));
  const status: ReportStatus = blockers.length ? 'blocked' : 'pass';
  const report: Omit<BrowserAdapterPreviewReport, 'markdown'> = {
    reportType: 'five_model_disabled_scanner_ui_browser_adapter_preview',
    generatedAt,
    status,
    authority: {
      localOnly: true,
      startsLocalViteOnly: args.startedLocalVite,
      readsSavedUiAdapterOnly: true,
      writesDiagnosticArtifactsOnly: true,
      importsHiddenPreviewPayloadOnly: true,
      defaultDisabled: true,
      runtimeGateEnabled: false,
      productionGoLiveApproved: false,
      scannerRuntimeWired: false,
      scannerVisibleNow: false,
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
      uiAdapterPreviewPath: args.uiAdapterPreviewPath,
      hiddenRenderProofPath,
      hiddenPreviewVerificationPath: hiddenWritten.jsonPath,
      screenshotPath: hiddenVerification.artifacts.screenshotPath,
    },
    summary: {
      sourceAdapterRows: adapterRows.length,
      hiddenPreviewRows: numberValue(renderProof.summary.renderedRows),
      previewReady: hiddenVerification.summary.previewReady,
      importReady: hiddenVerification.summary.importReady,
      renderedRows: hiddenVerification.summary.renderedRows,
      approvedDeskPlanRows: hiddenVerification.summary.approvedDeskPlanRows,
      formingDeskReadRows: numberValue(renderProof.summary.formingDeskReadRows),
      morningRows: adapterRows.filter((row) => row.session === 'morning').length,
      lunchRows: adapterRows.filter((row) => row.session === 'lunch').length,
      eveningRows: adapterRows.filter((row) => row.session === 'evening').length,
      runtimeGateEnabled: false,
      productionGoLiveApproved: false,
      scannerRuntimeWiredRows: adapterRows.filter((row) => row.scannerRuntimeWired).length,
      productionScannerVisibleRows: adapterRows.filter((row) => row.scannerVisibleNow).length,
      discordPostRows: adapterRows.filter((row) => row.publishDiscord).length,
      supabaseWriteRows: adapterRows.filter((row) => row.writesSupabase).length,
      liveSupabaseReadRows: adapterRows.filter((row) => row.readsLiveSupabase).length,
      liveBridgeReadRows: adapterRows.filter((row) => row.readsLiveBridge).length,
      canExecuteTrueRows: adapterRows.filter((row) => row.canExecute).length,
      tradingLogicChangedRows: adapterRows.filter((row) => row.changesTradingLogic).length,
      automatedOrderRows: adapterRows.filter((row) => row.automatedOrders).length,
      blockedRows: blockers.length,
      recommendation: status === 'pass'
        ? 'ready_for_guarded_scanner_visibility_contract'
        : 'hold_for_five_model_browser_adapter_fix',
    },
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeFiveModelDisabledScannerUiBrowserAdapterPreviewReport(
  report: BrowserAdapterPreviewReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `five-model-disabled-scanner-ui-browser-adapter-preview-${stamp}.json`);
  const markdownPath = path.join(outDir, `five-model-disabled-scanner-ui-browser-adapter-preview-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const outDir = path.resolve(options.outDir);
  const uiAdapterPath = path.resolve(options.uiAdapterPath ||
    latestReportByType(outDir, 'five_model_disabled_scanner_ui_adapter_preview') ||
    '');
  if (!fs.existsSync(uiAdapterPath)) throw new Error(`Missing five-model UI adapter artifact: ${uiAdapterPath}`);
  let server: ChildProcessWithoutNullStreams | null = null;
  const startedLocalVite = !options.url;
  const url = options.url || `http://127.0.0.1:${options.port}/?unifiedDeskOutputPreview=1`;
  try {
    if (startedLocalVite) {
      server = startVite(options.port);
      await waitForServer(`http://127.0.0.1:${options.port}/`);
    }
    const report = await buildFiveModelDisabledScannerUiBrowserAdapterPreviewReport({
      uiAdapterPreviewPath: uiAdapterPath,
      uiAdapterPreview: readJson<AdapterPreviewReport>(uiAdapterPath),
      url,
      outDir,
      startedLocalVite,
    });
    const written = writeFiveModelDisabledScannerUiBrowserAdapterPreviewReport(report, outDir);
    if (options.json) {
      console.log(JSON.stringify({
        ...written,
        status: report.status,
        summary: report.summary,
        source: report.source,
        blockers: report.blockers.slice(0, 20),
      }, null, 2));
    } else {
      console.log(report.markdown);
      console.log(`\nJSON: ${written.jsonPath}`);
      console.log(`Markdown: ${written.markdownPath}`);
    }
    process.exitCode = report.status === 'pass' ? 0 : 1;
  } finally {
    if (server) await stopProcessTree(server);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
