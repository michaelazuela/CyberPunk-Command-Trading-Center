import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { UnifiedDeskOutputScannerSurfaceModel } from '../../src/lib/unifiedDeskOutputScannerSurface';
import type { UnifiedDeskOutputLocalScannerConsumerProbe } from '../../src/lib/unifiedDeskOutputLocalScannerConsumerProbe';

interface ConsumerProbeReport {
  reportType: 'unified_desk_output_local_scanner_consumer_probe_report';
  status: 'pass' | 'blocked';
  authority: {
    localOnly: true;
    readsSavedScannerArtifactsOnly: true;
    readsSavedDisabledE2EReportOnly: true;
    writesDiagnosticArtifactsOnly: true;
    defaultDisabled: true;
    runtimeGateEnabled: false;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesNormalScannerOutput: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    canExecute: false;
    automatedOrders: false;
  };
  summary: {
    defaultStatus: 'disabled' | 'ready' | 'blocked';
    localPreviewStatus: 'disabled' | 'ready' | 'blocked';
    defaultScannerPreviewRows: number;
    localScannerPreviewRows: number;
    morningRows: number;
    lunchRows: number;
    normalScannerEventsRead: number;
    normalShouldPostRowsPreserved: number;
    normalCanExecuteTrueRowsPreserved: number;
    normalDiscordSendRowsPreserved: number;
    runtimeGateEnabled: false;
    scannerRuntimeChangedRows: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    canExecuteChangedRows: number;
    tradingLogicChangedRows: number;
    automatedOrderRows: number;
    blockedRows: number;
    recommendation: 'ready_for_disabled_local_scanner_preview_render' | 'hold_for_local_scanner_consumer_probe_fix';
  };
  defaultProbe: UnifiedDeskOutputLocalScannerConsumerProbe;
  localProbe: UnifiedDeskOutputLocalScannerConsumerProbe;
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

interface RenderProofReport {
  reportType: 'unified_desk_output_disabled_local_scanner_preview_render_install_proof';
  generatedAt: string;
  status: 'pass' | 'blocked';
  authority: {
    localOnly: true;
    readsSavedConsumerProbeOnly: true;
    writesDiagnosticArtifactsOnly: true;
    producesHiddenPreviewImportPayload: true;
    defaultDisabled: true;
    runtimeGateEnabled: false;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesNormalScannerOutput: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    canExecute: false;
    automatedOrders: false;
  };
  source: {
    consumerProbePath: string;
    consumerProbeStatus: 'pass' | 'blocked';
  };
  artifacts: {
    scannerSurfaceSmokeImportPayloadJsonPath: string | null;
  };
  summary: {
    defaultStatus: 'disabled' | 'ready' | 'blocked';
    localPreviewStatus: 'disabled' | 'ready' | 'blocked';
    defaultScannerPreviewRows: number;
    renderedRows: number;
    approvedDeskPlanRows: number;
    formingDeskReadRows: number;
    morningRows: number;
    lunchRows: number;
    hiddenPreviewImportReady: boolean;
    normalScannerEventsRead: number;
    normalShouldPostRowsPreserved: number;
    normalCanExecuteTrueRowsPreserved: number;
    normalDiscordSendRowsPreserved: number;
    runtimeGateEnabled: false;
    scannerRuntimeChangedRows: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    canExecuteChangedRows: number;
    tradingLogicChangedRows: number;
    automatedOrderRows: number;
    blockedRows: number;
    recommendation: 'ready_for_hidden_local_preview_import' | 'hold_for_disabled_local_scanner_preview_render_fix';
  };
  scannerSurfaceSmokeImportPayload: ScannerSurfaceSmokePayload | null;
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
const BLOCKED_WORDING = /human[- ]review|no chase|no-trade|no trade|missed/i;

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

function rowText(row: UnifiedDeskOutputScannerSurfaceModel['rows'][number]): string {
  return [
    row.headline,
    ...row.bodyLines,
    row.levelLine,
    row.riskLine,
    row.proofLine,
    row.invalidationLine,
    row.authorityLine,
  ].join(' ');
}

function scannerSurfaceSmokePayloadFromConsumerProbe(
  consumerProbe: ConsumerProbeReport,
): ScannerSurfaceSmokePayload {
  const rows = consumerProbe.localProbe.preview.rows;
  const wordingViolationRows = rows.filter((row) => BLOCKED_WORDING.test(rowText(row))).length;
  const rowBlockers = [
    rows.length === 2 ? null : 'Scanner surface import payload must contain exactly two rows.',
    rows.filter((row) => row.session === 'morning').length === 1 ? null : 'Scanner surface import payload must contain one morning row.',
    rows.filter((row) => row.session === 'lunch').length === 1 ? null : 'Scanner surface import payload must contain one lunch row.',
    rows.every((row) => row.scannerVisibleNow) ? null : 'Scanner surface import payload contains a non-visible row.',
    rows.every((row) => row.publishDiscord === false) ? null : 'Scanner surface import payload would publish Discord.',
    rows.every((row) => row.writesSupabase === false) ? null : 'Scanner surface import payload would write Supabase.',
    rows.every((row) => row.readsLiveBridge === false) ? null : 'Scanner surface import payload would read live bridge.',
    rows.every((row) => row.canExecute === false) ? null : 'Scanner surface import payload has canExecute=true.',
    wordingViolationRows === 0 ? null : 'Scanner surface import payload has blocked wording.',
  ].filter((item): item is string => Boolean(item));
  const surface: UnifiedDeskOutputScannerSurfaceModel = {
    status: rowBlockers.length ? 'blocked' : 'ready',
    sourceOfTruth: 'scanner_surface_unified_desk_output_consumer',
    localScannerOnly: true,
    rows: rowBlockers.length ? [] : rows,
    summary: {
      rows: rowBlockers.length ? 0 : rows.length,
      approvedDeskPlans: rowBlockers.length ? 0 : rows.filter((row) => row.state === 'APPROVED_DESK_PLAN').length,
      formingDeskReads: rowBlockers.length ? 0 : rows.filter((row) => row.state === 'FORMING_DESK_READ').length,
      discordPostRows: rows.filter((row) => row.publishDiscord).length,
      supabaseWriteRows: rows.filter((row) => row.writesSupabase).length,
      liveBridgeReadRows: rows.filter((row) => row.readsLiveBridge).length,
      canExecuteTrueRows: rows.filter((row) => row.canExecute).length,
      wordingViolationRows,
    },
    blockers: rowBlockers,
  };
  return {
    reportType: 'unified_desk_output_scanner_surface_smoke',
    status: rowBlockers.length ? 'blocked' : 'pass',
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
      blockedRows: rowBlockers.length,
    },
    surface,
    blockers: rowBlockers,
  };
}

function buildMarkdown(report: Omit<RenderProofReport, 'markdown'>): string {
  return [
    '# Unified Desk Output Disabled Local Scanner Preview Render Install Proof',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local render/install proof only. It reads the saved local scanner consumer probe, produces a scanner-surface-smoke-compatible hidden preview import payload, and does not post Discord, write Supabase, read live bridge data, change normal scanner output, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Summary',
    `- Default status: ${report.summary.defaultStatus}.`,
    `- Local preview status: ${report.summary.localPreviewStatus}.`,
    `- Default scanner preview rows: ${report.summary.defaultScannerPreviewRows}.`,
    `- Rendered rows: ${report.summary.renderedRows}.`,
    `- Approved Desk Plans: ${report.summary.approvedDeskPlanRows}.`,
    `- Forming Desk Reads: ${report.summary.formingDeskReadRows}.`,
    `- Morning rows: ${report.summary.morningRows}.`,
    `- Lunch rows: ${report.summary.lunchRows}.`,
    `- Hidden preview import ready: ${report.summary.hiddenPreviewImportReady}.`,
    `- Normal scanner events read: ${report.summary.normalScannerEventsRead}.`,
    `- Normal shouldPost rows preserved: ${report.summary.normalShouldPostRowsPreserved}.`,
    `- Normal canExecute=true rows preserved: ${report.summary.normalCanExecuteTrueRowsPreserved}.`,
    `- Normal Discord-send rows preserved: ${report.summary.normalDiscordSendRowsPreserved}.`,
    `- Runtime gate enabled: ${report.summary.runtimeGateEnabled}.`,
    `- Scanner-runtime changed rows: ${report.summary.scannerRuntimeChangedRows}.`,
    `- Discord-post rows: ${report.summary.discordPostRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- canExecute changed rows: ${report.summary.canExecuteChangedRows}.`,
    `- Trading-logic changed rows: ${report.summary.tradingLogicChangedRows}.`,
    `- Automated-order rows: ${report.summary.automatedOrderRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Preview Rows',
    '| Session | Model | Direction | Proof ET | Levels |',
    '|---|---|---|---:|---|',
    ...(report.scannerSurfaceSmokeImportPayload?.surface.rows || []).map((row) => `| ${row.session} | ${row.model} | ${row.direction} | ${row.proofLine.replace('Completed 5M proof: ', '').replace(' ET.', '')} | ${row.levelLine} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildUnifiedDeskOutputDisabledLocalScannerPreviewRenderProofReport(args: {
  consumerProbePath: string;
  consumerProbeReport: ConsumerProbeReport;
  scannerSurfaceSmokeImportPayloadJsonPath?: string | null;
}, generatedAt = new Date().toISOString()): RenderProofReport {
  const importPayload = scannerSurfaceSmokePayloadFromConsumerProbe(args.consumerProbeReport);
  const blockers = [
    args.consumerProbeReport.reportType === 'unified_desk_output_local_scanner_consumer_probe_report' ? null : 'Source report is not local scanner consumer probe report.',
    args.consumerProbeReport.status === 'pass' ? null : `Consumer probe status is ${args.consumerProbeReport.status}.`,
    args.consumerProbeReport.authority.localOnly ? null : 'Consumer probe is not local-only.',
    args.consumerProbeReport.authority.defaultDisabled ? null : 'Consumer probe default is not disabled.',
    args.consumerProbeReport.authority.runtimeGateEnabled === false ? null : 'Consumer probe has runtime gate enabled.',
    args.consumerProbeReport.authority.postsDiscord === false ? null : 'Consumer probe posts Discord.',
    args.consumerProbeReport.authority.writesSupabase === false ? null : 'Consumer probe writes Supabase.',
    args.consumerProbeReport.authority.readsLiveSupabase === false ? null : 'Consumer probe reads live Supabase.',
    args.consumerProbeReport.authority.readsLiveBridge === false ? null : 'Consumer probe reads live bridge.',
    args.consumerProbeReport.authority.changesNormalScannerOutput === false ? null : 'Consumer probe changes normal scanner output.',
    args.consumerProbeReport.authority.changesTradingLogic === false ? null : 'Consumer probe changes trading logic.',
    args.consumerProbeReport.authority.changesCanExecute === false ? null : 'Consumer probe changes canExecute.',
    args.consumerProbeReport.authority.automatedOrders === false ? null : 'Consumer probe allows automated orders.',
    args.consumerProbeReport.summary.defaultStatus === 'disabled' ? null : `Consumer probe default status is ${args.consumerProbeReport.summary.defaultStatus}.`,
    args.consumerProbeReport.summary.localPreviewStatus === 'ready' ? null : `Consumer probe local preview status is ${args.consumerProbeReport.summary.localPreviewStatus}.`,
    args.consumerProbeReport.summary.defaultScannerPreviewRows === 0 ? null : 'Consumer probe default produced scanner preview rows.',
    args.consumerProbeReport.summary.localScannerPreviewRows === 2 ? null : 'Consumer probe local preview did not produce exactly two rows.',
    args.consumerProbeReport.summary.morningRows === 1 ? null : 'Consumer probe did not produce one morning row.',
    args.consumerProbeReport.summary.lunchRows === 1 ? null : 'Consumer probe did not produce one lunch row.',
    args.consumerProbeReport.summary.discordPostRows === 0 ? null : 'Consumer probe has Discord-post rows.',
    args.consumerProbeReport.summary.supabaseWriteRows === 0 ? null : 'Consumer probe has Supabase-write rows.',
    args.consumerProbeReport.summary.liveSupabaseReadRows === 0 ? null : 'Consumer probe has live-Supabase-read rows.',
    args.consumerProbeReport.summary.liveBridgeReadRows === 0 ? null : 'Consumer probe has live-bridge-read rows.',
    args.consumerProbeReport.summary.canExecuteTrueRows === 0 ? null : 'Consumer probe has canExecute=true rows.',
    args.consumerProbeReport.summary.canExecuteChangedRows === 0 ? null : 'Consumer probe changed canExecute.',
    args.consumerProbeReport.summary.tradingLogicChangedRows === 0 ? null : 'Consumer probe changed trading logic.',
    args.consumerProbeReport.summary.automatedOrderRows === 0 ? null : 'Consumer probe has automated-order rows.',
    args.consumerProbeReport.summary.blockedRows === 0 ? null : 'Consumer probe has blocked rows.',
    importPayload.status === 'pass' ? null : 'Scanner surface smoke import payload is blocked.',
    importPayload.summary.renderedRows === 2 ? null : 'Scanner surface smoke import payload did not render exactly two rows.',
    importPayload.summary.approvedDeskPlanRows === 2 ? null : 'Scanner surface smoke import payload did not render two Approved Desk Plans.',
    importPayload.summary.formingDeskReadRows === 0 ? null : 'Scanner surface smoke import payload has unexpected Forming Desk Read rows.',
    importPayload.summary.discordPostRows === 0 ? null : 'Scanner surface smoke import payload has Discord-post rows.',
    importPayload.summary.supabaseWriteRows === 0 ? null : 'Scanner surface smoke import payload has Supabase-write rows.',
    importPayload.summary.liveBridgeReadRows === 0 ? null : 'Scanner surface smoke import payload has live-bridge-read rows.',
    importPayload.summary.canExecuteTrueRows === 0 ? null : 'Scanner surface smoke import payload has canExecute=true rows.',
    importPayload.summary.wordingViolationRows === 0 ? null : 'Scanner surface smoke import payload has wording violations.',
    ...args.consumerProbeReport.blockers,
    ...importPayload.blockers,
  ].filter((item): item is string => Boolean(item));
  const report: Omit<RenderProofReport, 'markdown'> = {
    reportType: 'unified_desk_output_disabled_local_scanner_preview_render_install_proof',
    generatedAt,
    status: blockers.length ? 'blocked' : 'pass',
    authority: {
      localOnly: true,
      readsSavedConsumerProbeOnly: true,
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
      consumerProbePath: args.consumerProbePath,
      consumerProbeStatus: args.consumerProbeReport.status,
    },
    artifacts: {
      scannerSurfaceSmokeImportPayloadJsonPath: args.scannerSurfaceSmokeImportPayloadJsonPath || null,
    },
    summary: {
      defaultStatus: args.consumerProbeReport.summary.defaultStatus,
      localPreviewStatus: args.consumerProbeReport.summary.localPreviewStatus,
      defaultScannerPreviewRows: args.consumerProbeReport.summary.defaultScannerPreviewRows,
      renderedRows: importPayload.summary.renderedRows,
      approvedDeskPlanRows: importPayload.summary.approvedDeskPlanRows,
      formingDeskReadRows: importPayload.summary.formingDeskReadRows,
      morningRows: args.consumerProbeReport.summary.morningRows,
      lunchRows: args.consumerProbeReport.summary.lunchRows,
      hiddenPreviewImportReady: blockers.length === 0,
      normalScannerEventsRead: args.consumerProbeReport.summary.normalScannerEventsRead,
      normalShouldPostRowsPreserved: args.consumerProbeReport.summary.normalShouldPostRowsPreserved,
      normalCanExecuteTrueRowsPreserved: args.consumerProbeReport.summary.normalCanExecuteTrueRowsPreserved,
      normalDiscordSendRowsPreserved: args.consumerProbeReport.summary.normalDiscordSendRowsPreserved,
      runtimeGateEnabled: false,
      scannerRuntimeChangedRows: 0,
      discordPostRows: 0,
      supabaseWriteRows: 0,
      liveSupabaseReadRows: 0,
      liveBridgeReadRows: 0,
      canExecuteTrueRows: 0,
      canExecuteChangedRows: 0,
      tradingLogicChangedRows: 0,
      automatedOrderRows: 0,
      blockedRows: blockers.length,
      recommendation: blockers.length ? 'hold_for_disabled_local_scanner_preview_render_fix' : 'ready_for_hidden_local_preview_import',
    },
    scannerSurfaceSmokeImportPayload: importPayload,
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeUnifiedDeskOutputDisabledLocalScannerPreviewRenderProofReport(
  report: RenderProofReport,
  outDir: string,
): { jsonPath: string; markdownPath: string; scannerSurfaceSmokeImportPayloadJsonPath: string | null } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-desk-output-disabled-local-scanner-preview-render-proof-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-desk-output-disabled-local-scanner-preview-render-proof-${stamp}.md`);
  const scannerSurfaceSmokeImportPayloadJsonPath = report.scannerSurfaceSmokeImportPayload
    ? path.join(outDir, `unified-desk-output-disabled-local-scanner-preview-import-payload-${stamp}.json`)
    : null;
  const reportWithArtifact = {
    ...report,
    artifacts: {
      ...report.artifacts,
      scannerSurfaceSmokeImportPayloadJsonPath,
    },
  };
  const finalReport = { ...reportWithArtifact, markdown: buildMarkdown(reportWithArtifact) };
  fs.writeFileSync(jsonPath, `${JSON.stringify(finalReport, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${finalReport.markdown}\n`);
  if (scannerSurfaceSmokeImportPayloadJsonPath && report.scannerSurfaceSmokeImportPayload) {
    fs.writeFileSync(scannerSurfaceSmokeImportPayloadJsonPath, `${JSON.stringify(report.scannerSurfaceSmokeImportPayload, null, 2)}\n`);
  }
  return { jsonPath, markdownPath, scannerSurfaceSmokeImportPayloadJsonPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const outDir = path.resolve(options.outDir);
  const consumerProbePath = path.resolve(options.consumerProbePath ||
    latestMatchingFile(outDir, /^unified-desk-output-local-scanner-consumer-probe-\d+\.json$/) ||
    '');
  if (!fs.existsSync(consumerProbePath)) throw new Error('Missing Unified Desk Output local scanner consumer probe path.');
  const report = buildUnifiedDeskOutputDisabledLocalScannerPreviewRenderProofReport({
    consumerProbePath,
    consumerProbeReport: readJson<ConsumerProbeReport>(consumerProbePath),
  });
  const written = writeUnifiedDeskOutputDisabledLocalScannerPreviewRenderProofReport(report, outDir);
  if (options.json) {
    const finalReport = readJson<RenderProofReport>(written.jsonPath);
    console.log(JSON.stringify({
      ...written,
      status: finalReport.status,
      summary: finalReport.summary,
      previewRows: finalReport.scannerSurfaceSmokeImportPayload?.surface.rows || [],
      blockers: finalReport.blockers.slice(0, 20),
    }, null, 2));
  } else {
    const finalReport = readJson<RenderProofReport>(written.jsonPath);
    console.log(finalReport.markdown);
    console.log(`\nJSON: ${written.jsonPath}`);
    console.log(`Markdown: ${written.markdownPath}`);
    if (written.scannerSurfaceSmokeImportPayloadJsonPath) {
      console.log(`Import payload: ${written.scannerSurfaceSmokeImportPayloadJsonPath}`);
    }
  }
  process.exitCode = report.status === 'pass' ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
