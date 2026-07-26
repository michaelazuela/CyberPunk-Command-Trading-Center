import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  buildFiveModelScannerVisibilityAdapterModel,
} from '../../src/lib/fiveModelScannerVisibilityAdapter';
import type { FiveModelScannerVisibilityContractReport } from '../../src/lib/fiveModelScannerVisibilityGate';
import type { UnifiedDeskOutputScannerSurfaceModel } from '../../src/lib/unifiedDeskOutputScannerSurface';

type ReportStatus = 'pass' | 'blocked';

interface AdapterProofReport {
  reportType?: string;
  status?: ReportStatus;
  summary?: Record<string, unknown>;
  blockers?: string[];
}

interface ScannerSurfaceSmokeReport {
  reportType: 'five_model_scanner_surface_smoke';
  generatedAt: string;
  status: ReportStatus;
  authority: {
    localOnly: true;
    readsSavedAdapterProofOnly: true;
    readsSavedVisibilityContractOnly: true;
    writesDiagnosticArtifactsOnly: true;
    rendersScannerSurfaceOnly: true;
    installsRuntimeAdapter: false;
    scannerRuntimeWired: false;
    productionScannerVisibleNow: false;
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
    adapterProofPath: string;
    visibilityContractPath: string;
  };
  summary: {
    renderedRows: number;
    approvedDeskPlanRows: number;
    formingDeskReadRows: number;
    morningRows: number;
    lunchRows: number;
    eveningRows: number;
    scannerRuntimeWiredRows: number;
    productionScannerVisibleNowRows: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    tradingLogicChangedRows: number;
    canExecuteChangedRows: number;
    automatedOrderRows: number;
    wordingViolationRows: number;
    blockedRows: number;
    recommendation: 'ready_for_explicit_runtime_visibility_decision' | 'hold_for_five_model_surface_smoke_fix';
  };
  surface: UnifiedDeskOutputScannerSurfaceModel;
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  adapterProofPath: string | null;
  visibilityContractPath: string | null;
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
    adapterProofPath: readFlag(args, '--adapter-proof'),
    visibilityContractPath: readFlag(args, '--visibility-contract'),
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
        return readJson<Record<string, unknown>>(filePath).reportType === reportType;
      } catch {
        return false;
      }
    }) || null;
}

function numberValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function buildMarkdown(report: Omit<ScannerSurfaceSmokeReport, 'markdown'>): string {
  return [
    '# Five Model Scanner Surface Smoke',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local scanner surface smoke only. It reads the saved adapter proof and visibility contract, renders scanner-facing rows, and writes diagnostics. It does not wire scanner runtime behavior, expose production scanner rows, post Discord, write Supabase, read live Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Summary',
    `- Rendered rows: ${report.summary.renderedRows}.`,
    `- Approved Desk Plan rows: ${report.summary.approvedDeskPlanRows}.`,
    `- Forming Desk Read rows: ${report.summary.formingDeskReadRows}.`,
    `- Morning rows: ${report.summary.morningRows}.`,
    `- Lunch rows: ${report.summary.lunchRows}.`,
    `- Evening rows: ${report.summary.eveningRows}.`,
    `- Scanner-runtime-wired rows: ${report.summary.scannerRuntimeWiredRows}.`,
    `- Production scanner-visible-now rows: ${report.summary.productionScannerVisibleNowRows}.`,
    `- Discord-post rows: ${report.summary.discordPostRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-Supabase-read rows: ${report.summary.liveSupabaseReadRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Trading-logic changed rows: ${report.summary.tradingLogicChangedRows}.`,
    `- canExecute changed rows: ${report.summary.canExecuteChangedRows}.`,
    `- Automated-order rows: ${report.summary.automatedOrderRows}.`,
    `- Wording violation rows: ${report.summary.wordingViolationRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Rendered Rows',
    '| Date | Session | State | Model | Direction | Levels | Proof |',
    '|---|---|---|---|---|---|---|',
    ...report.surface.rows.slice(0, 40).map((row) => `| ${row.date} | ${row.session} | ${row.stateLabel} | ${row.model} | ${row.direction} | ${row.levelLine} | ${row.proofLine} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildFiveModelScannerSurfaceSmokeReport(args: {
  adapterProofPath: string;
  adapterProof: AdapterProofReport;
  visibilityContractPath: string;
  visibilityContract: FiveModelScannerVisibilityContractReport;
}, generatedAt = new Date().toISOString()): ScannerSurfaceSmokeReport {
  const adapter = buildFiveModelScannerVisibilityAdapterModel({
    explicitProductionApproval: true,
    contract: args.visibilityContract,
  });
  const surface = adapter.surface;
  const blockers = [
    args.adapterProof.reportType === 'five_model_scanner_visibility_adapter_proof' ? null : 'Adapter proof report type is invalid.',
    args.adapterProof.status === 'pass' ? null : 'Adapter proof is not pass.',
    numberValue(args.adapterProof.summary?.explicitSurfaceRows) === surface.rows.length ? null : 'Adapter proof surface rows do not match rendered rows.',
    numberValue(args.adapterProof.summary?.defaultSurfaceRows) === 0 ? null : 'Adapter proof default path exposed rows.',
    adapter.status === 'ready' ? null : 'Adapter did not render ready surface rows.',
    adapter.scannerVisibleNow ? null : 'Adapter did not mark local scanner surface ready.',
    surface.status === 'ready' ? null : 'Scanner surface is blocked.',
    surface.summary.rows === args.visibilityContract.summary.candidateRows ? null : 'Scanner surface row count does not match contract.',
    surface.summary.discordPostRows === 0 ? null : 'Scanner surface has Discord-post rows.',
    surface.summary.supabaseWriteRows === 0 ? null : 'Scanner surface has Supabase-write rows.',
    surface.summary.liveBridgeReadRows === 0 ? null : 'Scanner surface has live bridge read rows.',
    surface.summary.canExecuteTrueRows === 0 ? null : 'Scanner surface has canExecute=true rows.',
    surface.summary.wordingViolationRows === 0 ? null : 'Scanner surface has blocked wording rows.',
    ...adapter.blockers,
    ...surface.blockers,
    ...(args.adapterProof.blockers || []),
  ].filter((item): item is string => Boolean(item));
  const visibleSurface = blockers.length ? { ...surface, rows: [], summary: { ...surface.summary, rows: 0, approvedDeskPlans: 0, formingDeskReads: 0 } } : surface;
  const status: ReportStatus = blockers.length ? 'blocked' : 'pass';
  const report: Omit<ScannerSurfaceSmokeReport, 'markdown'> = {
    reportType: 'five_model_scanner_surface_smoke',
    generatedAt,
    status,
    authority: {
      localOnly: true,
      readsSavedAdapterProofOnly: true,
      readsSavedVisibilityContractOnly: true,
      writesDiagnosticArtifactsOnly: true,
      rendersScannerSurfaceOnly: true,
      installsRuntimeAdapter: false,
      scannerRuntimeWired: false,
      productionScannerVisibleNow: false,
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
      adapterProofPath: args.adapterProofPath,
      visibilityContractPath: args.visibilityContractPath,
    },
    summary: {
      renderedRows: visibleSurface.rows.length,
      approvedDeskPlanRows: visibleSurface.rows.filter((row) => row.stateLabel === 'Approved Desk Plan').length,
      formingDeskReadRows: visibleSurface.rows.filter((row) => row.stateLabel === 'Forming Desk Read').length,
      morningRows: visibleSurface.rows.filter((row) => row.session === 'morning').length,
      lunchRows: visibleSurface.rows.filter((row) => row.session === 'lunch').length,
      eveningRows: visibleSurface.rows.filter((row) => row.session === 'evening').length,
      scannerRuntimeWiredRows: 0,
      productionScannerVisibleNowRows: 0,
      discordPostRows: visibleSurface.summary.discordPostRows,
      supabaseWriteRows: visibleSurface.summary.supabaseWriteRows,
      liveSupabaseReadRows: 0,
      liveBridgeReadRows: visibleSurface.summary.liveBridgeReadRows,
      canExecuteTrueRows: visibleSurface.summary.canExecuteTrueRows,
      tradingLogicChangedRows: 0,
      canExecuteChangedRows: 0,
      automatedOrderRows: 0,
      wordingViolationRows: visibleSurface.summary.wordingViolationRows,
      blockedRows: blockers.length,
      recommendation: status === 'pass'
        ? 'ready_for_explicit_runtime_visibility_decision'
        : 'hold_for_five_model_surface_smoke_fix',
    },
    surface: visibleSurface,
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeFiveModelScannerSurfaceSmokeReport(
  report: ScannerSurfaceSmokeReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `five-model-scanner-surface-smoke-${stamp}.json`);
  const markdownPath = path.join(outDir, `five-model-scanner-surface-smoke-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const outDir = path.resolve(options.outDir);
  const adapterProofPath = path.resolve(options.adapterProofPath ||
    latestReportByType(outDir, 'five_model_scanner_visibility_adapter_proof') ||
    '');
  const visibilityContractPath = path.resolve(options.visibilityContractPath ||
    latestReportByType(outDir, 'five_model_guarded_scanner_visibility_contract') ||
    '');
  if (!fs.existsSync(adapterProofPath)) throw new Error(`Missing five-model adapter proof artifact: ${adapterProofPath}`);
  if (!fs.existsSync(visibilityContractPath)) throw new Error(`Missing five-model visibility contract artifact: ${visibilityContractPath}`);
  const report = buildFiveModelScannerSurfaceSmokeReport({
    adapterProofPath,
    adapterProof: readJson<AdapterProofReport>(adapterProofPath),
    visibilityContractPath,
    visibilityContract: readJson<FiveModelScannerVisibilityContractReport>(visibilityContractPath),
  });
  const written = writeFiveModelScannerSurfaceSmokeReport(report, outDir);
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
