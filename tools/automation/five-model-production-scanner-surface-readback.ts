import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readRuntimeJson } from '../runtimeJson';
import type { FiveModelProductionScannerSurfaceActivation } from '../../src/lib/fiveModelProductionScannerSurface';

type ReportStatus = 'pass' | 'blocked';

interface FiveModelProductionScannerSurfaceReadbackReport {
  reportType: 'five_model_production_scanner_surface_readback';
  generatedAt: string;
  status: ReportStatus;
  authority: {
    localOnly: true;
    readsRuntimeSurfaceOnly: true;
    writesDiagnosticArtifactsOnly: true;
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
    runtimeSurfacePath: string;
    runtimeReadSource: string;
  };
  summary: {
    selectedRows: number;
    approvedDeskPlanRows: number;
    formingDeskReadRows: number;
    morningRows: number;
    lunchRows: number;
    eveningRows: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    canExecuteChangedRows: number;
    tradingLogicChangedRows: number;
    automatedOrderRows: number;
    blockedRows: number;
    recommendation: 'ready_for_scanner_consumer_file_wiring' | 'hold_for_five_model_surface_readback_fix';
  };
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  runtimeSurfacePath: string;
  outDir: string;
  json: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_RUNTIME_SURFACE = path.join(__dirname, '.five-model-production-scanner-surface.json');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function parseArgs(args = process.argv.slice(2)): CliOptions {
  return {
    runtimeSurfacePath: readFlag(args, '--runtime-surface') || DEFAULT_RUNTIME_SURFACE,
    outDir: readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR,
    json: args.includes('--json'),
  };
}

function buildMarkdown(report: Omit<FiveModelProductionScannerSurfaceReadbackReport, 'markdown'>): string {
  return [
    '# Five Model Production Scanner Surface Readback',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local readback only. It reads the tracked five-model runtime scanner surface and writes diagnostics. It does not post Discord, write Supabase, read live Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Summary',
    `- Runtime read source: ${report.source.runtimeReadSource}.`,
    `- Selected rows: ${report.summary.selectedRows}.`,
    `- Approved Desk Plan rows: ${report.summary.approvedDeskPlanRows}.`,
    `- Forming Desk Read rows: ${report.summary.formingDeskReadRows}.`,
    `- Morning rows: ${report.summary.morningRows}.`,
    `- Lunch rows: ${report.summary.lunchRows}.`,
    `- Evening rows: ${report.summary.eveningRows}.`,
    `- Discord-post rows: ${report.summary.discordPostRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Trading-logic changed rows: ${report.summary.tradingLogicChangedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildFiveModelProductionScannerSurfaceReadbackReport(args: {
  runtimeSurfacePath: string;
  runtimeSurface: FiveModelProductionScannerSurfaceActivation | null;
  runtimeReadSource: string;
  runtimeError: string | null;
  runtimeValidationError: string | null;
}, generatedAt = new Date().toISOString()): FiveModelProductionScannerSurfaceReadbackReport {
  const surface = args.runtimeSurface;
  const rows = surface?.rows || [];
  const blockers = [
    args.runtimeError ? `Runtime read error: ${args.runtimeError}` : null,
    args.runtimeValidationError ? `Runtime validation error: ${args.runtimeValidationError}` : null,
    surface ? null : 'Runtime surface is missing.',
    surface?.reportType === 'five_model_production_scanner_surface_activation' ? null : 'Runtime surface type is invalid.',
    surface?.status === 'active' ? null : `Runtime surface status is ${surface?.status || '<missing>'}.`,
    surface?.authority.scannerVisibleNow === true ? null : 'Runtime surface is not scanner-visible.',
    surface?.authority.postsDiscord === false ? null : 'Runtime surface posts Discord.',
    surface?.authority.writesSupabase === false ? null : 'Runtime surface writes Supabase.',
    surface?.authority.readsLiveSupabase === false ? null : 'Runtime surface reads live Supabase.',
    surface?.authority.readsLiveBridge === false ? null : 'Runtime surface reads live bridge.',
    surface?.authority.changesScannerBehavior === false ? null : 'Runtime surface changes scanner behavior.',
    surface?.authority.changesTradingLogic === false ? null : 'Runtime surface changes trading logic.',
    surface?.authority.changesCanExecute === false ? null : 'Runtime surface changes canExecute.',
    surface?.authority.canExecute === false ? null : 'Runtime surface has canExecute=true.',
    surface?.authority.automatedOrders === false ? null : 'Runtime surface allows automated orders.',
    surface?.summary.selectedRows === rows.length ? null : 'Runtime summary selected rows do not match row count.',
    rows.length === 18 ? null : `Runtime readback expected 18 rows and found ${rows.length}.`,
    surface?.summary.approvedDeskPlanRows === 5 ? null : 'Runtime readback expected 5 Approved Desk Plan rows.',
    surface?.summary.formingDeskReadRows === 13 ? null : 'Runtime readback expected 13 Forming Desk Read rows.',
    surface?.summary.morningRows === 10 ? null : 'Runtime readback expected 10 morning rows.',
    surface?.summary.lunchRows === 8 ? null : 'Runtime readback expected 8 lunch rows.',
    surface?.summary.eveningRows === 0 ? null : 'Runtime readback expected 0 evening rows.',
    surface?.summary.discordPostRows === 0 ? null : 'Runtime surface has Discord-post rows.',
    surface?.summary.supabaseWriteRows === 0 ? null : 'Runtime surface has Supabase-write rows.',
    surface?.summary.liveSupabaseReadRows === 0 ? null : 'Runtime surface has live Supabase read rows.',
    surface?.summary.liveBridgeReadRows === 0 ? null : 'Runtime surface has live bridge read rows.',
    surface?.summary.canExecuteTrueRows === 0 ? null : 'Runtime surface has canExecute=true rows.',
    surface?.summary.canExecuteChangedRows === 0 ? null : 'Runtime surface changed canExecute.',
    surface?.summary.tradingLogicChangedRows === 0 ? null : 'Runtime surface changed trading logic.',
    surface?.summary.automatedOrderRows === 0 ? null : 'Runtime surface has automated-order rows.',
    rows.some((row) => row.publishDiscord) ? 'Runtime readback rows would post Discord.' : null,
    rows.some((row) => row.writesSupabase) ? 'Runtime readback rows would write Supabase.' : null,
    rows.some((row) => row.readsLiveBridge) ? 'Runtime readback rows would read live bridge.' : null,
    rows.some((row) => row.canExecute) ? 'Runtime readback rows include canExecute=true.' : null,
    ...(surface?.blockers || []),
  ].filter((item): item is string => Boolean(item));
  const status: ReportStatus = blockers.length ? 'blocked' : 'pass';
  const report: Omit<FiveModelProductionScannerSurfaceReadbackReport, 'markdown'> = {
    reportType: 'five_model_production_scanner_surface_readback',
    generatedAt,
    status,
    authority: {
      localOnly: true,
      readsRuntimeSurfaceOnly: true,
      writesDiagnosticArtifactsOnly: true,
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
      runtimeSurfacePath: args.runtimeSurfacePath,
      runtimeReadSource: args.runtimeReadSource,
    },
    summary: {
      selectedRows: status === 'pass' ? rows.length : 0,
      approvedDeskPlanRows: status === 'pass' ? rows.filter((row) => row.state === 'APPROVED_DESK_PLAN').length : 0,
      formingDeskReadRows: status === 'pass' ? rows.filter((row) => row.state === 'FORMING_DESK_READ').length : 0,
      morningRows: status === 'pass' ? rows.filter((row) => row.session === 'morning').length : 0,
      lunchRows: status === 'pass' ? rows.filter((row) => row.session === 'lunch').length : 0,
      eveningRows: status === 'pass' ? rows.filter((row) => row.session === 'evening').length : 0,
      discordPostRows: rows.filter((row) => row.publishDiscord).length,
      supabaseWriteRows: rows.filter((row) => row.writesSupabase).length,
      liveSupabaseReadRows: surface?.summary.liveSupabaseReadRows || 0,
      liveBridgeReadRows: rows.filter((row) => row.readsLiveBridge).length,
      canExecuteTrueRows: rows.filter((row) => row.canExecute).length,
      canExecuteChangedRows: surface?.summary.canExecuteChangedRows || 0,
      tradingLogicChangedRows: surface?.summary.tradingLogicChangedRows || 0,
      automatedOrderRows: surface?.summary.automatedOrderRows || 0,
      blockedRows: blockers.length,
      recommendation: status === 'pass'
        ? 'ready_for_scanner_consumer_file_wiring'
        : 'hold_for_five_model_surface_readback_fix',
    },
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeFiveModelProductionScannerSurfaceReadbackReport(
  report: FiveModelProductionScannerSurfaceReadbackReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `five-model-production-scanner-surface-readback-${stamp}.json`);
  const markdownPath = path.join(outDir, `five-model-production-scanner-surface-readback-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const runtimeSurfacePath = path.resolve(options.runtimeSurfacePath);
  const read = await readRuntimeJson<FiveModelProductionScannerSurfaceActivation>(runtimeSurfacePath);
  const report = buildFiveModelProductionScannerSurfaceReadbackReport({
    runtimeSurfacePath,
    runtimeSurface: read.value,
    runtimeReadSource: read.source,
    runtimeError: read.error,
    runtimeValidationError: read.validationError,
  });
  const written = writeFiveModelProductionScannerSurfaceReadbackReport(report, path.resolve(options.outDir));
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
