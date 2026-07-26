import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  buildFiveModelScannerVisibilityAdapterModel,
} from '../../src/lib/fiveModelScannerVisibilityAdapter';
import type { FiveModelScannerVisibilityContractReport } from '../../src/lib/fiveModelScannerVisibilityGate';

type ReportStatus = 'pass' | 'blocked';

interface AdapterProofReport {
  reportType: 'five_model_scanner_visibility_adapter_proof';
  generatedAt: string;
  status: ReportStatus;
  authority: {
    localOnly: true;
    readsSavedVisibilityContractOnly: true;
    writesDiagnosticArtifactsOnly: true;
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
    visibilityContractPath: string;
  };
  summary: {
    defaultAdapterStatus: 'disabled' | 'ready' | 'blocked';
    defaultScannerVisibleNow: boolean;
    defaultSurfaceRows: number;
    explicitAdapterStatus: 'disabled' | 'ready' | 'blocked';
    explicitScannerVisibleNow: boolean;
    explicitSurfaceRows: number;
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
    tradingLogicChangedRows: number;
    canExecuteChangedRows: number;
    automatedOrderRows: number;
    wordingViolationRows: number;
    blockedRows: number;
    recommendation: 'ready_for_local_scanner_surface_smoke' | 'hold_for_five_model_adapter_fix';
  };
  blockers: string[];
  markdown: string;
}

interface CliOptions {
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

function buildMarkdown(report: Omit<AdapterProofReport, 'markdown'>): string {
  return [
    '# Five Model Scanner Visibility Adapter Proof',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local saved-contract adapter proof only. It evaluates the default-off adapter and the explicitly allowed adapter surface from the saved five-model visibility contract. It does not install runtime behavior, expose production scanner rows, post Discord, write Supabase, read live Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Summary',
    `- Default adapter status: ${report.summary.defaultAdapterStatus}.`,
    `- Default scanner visible now: ${report.summary.defaultScannerVisibleNow}.`,
    `- Default surface rows: ${report.summary.defaultSurfaceRows}.`,
    `- Explicit adapter status: ${report.summary.explicitAdapterStatus}.`,
    `- Explicit scanner visible now: ${report.summary.explicitScannerVisibleNow}.`,
    `- Explicit surface rows: ${report.summary.explicitSurfaceRows}.`,
    `- Approved Desk Plan rows: ${report.summary.approvedDeskPlanRows}.`,
    `- Forming Desk Read rows: ${report.summary.formingDeskReadRows}.`,
    `- Morning rows: ${report.summary.morningRows}.`,
    `- Lunch rows: ${report.summary.lunchRows}.`,
    `- Evening rows: ${report.summary.eveningRows}.`,
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
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildFiveModelScannerVisibilityAdapterProofReport(args: {
  visibilityContractPath: string;
  visibilityContract: FiveModelScannerVisibilityContractReport;
}, generatedAt = new Date().toISOString()): AdapterProofReport {
  const defaultAdapter = buildFiveModelScannerVisibilityAdapterModel({
    explicitProductionApproval: false,
    contract: args.visibilityContract,
  });
  const explicitAdapter = buildFiveModelScannerVisibilityAdapterModel({
    explicitProductionApproval: true,
    contract: args.visibilityContract,
  });
  const rows = explicitAdapter.surface.rows;
  const blockers = [
    defaultAdapter.status === 'disabled' ? null : 'Default adapter did not stay disabled.',
    defaultAdapter.scannerVisibleNow === false ? null : 'Default adapter exposed scanner rows.',
    defaultAdapter.surface.rows.length === 0 ? null : 'Default adapter returned surface rows.',
    explicitAdapter.status === 'ready' ? null : 'Explicit adapter did not become ready.',
    explicitAdapter.scannerVisibleNow ? null : 'Explicit adapter did not mark scanner visibility ready.',
    rows.length === args.visibilityContract.summary.candidateRows ? null : 'Explicit adapter row count does not match contract.',
    explicitAdapter.publishDiscord === false ? null : 'Explicit adapter would post Discord.',
    explicitAdapter.writesSupabase === false ? null : 'Explicit adapter would write Supabase.',
    explicitAdapter.readsLiveSupabase === false ? null : 'Explicit adapter would read live Supabase.',
    explicitAdapter.readsLiveBridge === false ? null : 'Explicit adapter would read live bridge.',
    explicitAdapter.canExecute === false ? null : 'Explicit adapter has canExecute=true.',
    explicitAdapter.changesTradingLogic === false ? null : 'Explicit adapter changes trading logic.',
    explicitAdapter.changesCanExecute === false ? null : 'Explicit adapter changes canExecute.',
    explicitAdapter.noAutomatedOrders ? null : 'Explicit adapter allows automated orders.',
    explicitAdapter.surface.summary.discordPostRows === 0 ? null : 'Surface has Discord-post rows.',
    explicitAdapter.surface.summary.supabaseWriteRows === 0 ? null : 'Surface has Supabase-write rows.',
    explicitAdapter.surface.summary.liveBridgeReadRows === 0 ? null : 'Surface has live bridge read rows.',
    explicitAdapter.surface.summary.canExecuteTrueRows === 0 ? null : 'Surface has canExecute=true rows.',
    explicitAdapter.surface.summary.wordingViolationRows === 0 ? null : 'Surface has blocked wording rows.',
    ...explicitAdapter.blockers,
  ].filter((item): item is string => Boolean(item));
  const status: ReportStatus = blockers.length ? 'blocked' : 'pass';
  const report: Omit<AdapterProofReport, 'markdown'> = {
    reportType: 'five_model_scanner_visibility_adapter_proof',
    generatedAt,
    status,
    authority: {
      localOnly: true,
      readsSavedVisibilityContractOnly: true,
      writesDiagnosticArtifactsOnly: true,
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
      visibilityContractPath: args.visibilityContractPath,
    },
    summary: {
      defaultAdapterStatus: defaultAdapter.status,
      defaultScannerVisibleNow: defaultAdapter.scannerVisibleNow,
      defaultSurfaceRows: defaultAdapter.surface.rows.length,
      explicitAdapterStatus: explicitAdapter.status,
      explicitScannerVisibleNow: explicitAdapter.scannerVisibleNow,
      explicitSurfaceRows: rows.length,
      approvedDeskPlanRows: rows.filter((row) => row.stateLabel === 'Approved Desk Plan').length,
      formingDeskReadRows: rows.filter((row) => row.stateLabel === 'Forming Desk Read').length,
      morningRows: rows.filter((row) => row.session === 'morning').length,
      lunchRows: rows.filter((row) => row.session === 'lunch').length,
      eveningRows: rows.filter((row) => row.session === 'evening').length,
      discordPostRows: explicitAdapter.publishDiscord ? 1 : 0,
      supabaseWriteRows: explicitAdapter.writesSupabase ? 1 : 0,
      liveSupabaseReadRows: explicitAdapter.readsLiveSupabase ? 1 : 0,
      liveBridgeReadRows: explicitAdapter.readsLiveBridge ? 1 : 0,
      canExecuteTrueRows: explicitAdapter.canExecute ? 1 : 0,
      tradingLogicChangedRows: explicitAdapter.changesTradingLogic ? 1 : 0,
      canExecuteChangedRows: explicitAdapter.changesCanExecute || explicitAdapter.canExecuteChanged ? 1 : 0,
      automatedOrderRows: explicitAdapter.noAutomatedOrders ? 0 : 1,
      wordingViolationRows: explicitAdapter.surface.summary.wordingViolationRows,
      blockedRows: blockers.length,
      recommendation: status === 'pass'
        ? 'ready_for_local_scanner_surface_smoke'
        : 'hold_for_five_model_adapter_fix',
    },
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeFiveModelScannerVisibilityAdapterProofReport(
  report: AdapterProofReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `five-model-scanner-visibility-adapter-proof-${stamp}.json`);
  const markdownPath = path.join(outDir, `five-model-scanner-visibility-adapter-proof-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const outDir = path.resolve(options.outDir);
  const visibilityContractPath = path.resolve(options.visibilityContractPath ||
    latestReportByType(outDir, 'five_model_guarded_scanner_visibility_contract') ||
    '');
  if (!fs.existsSync(visibilityContractPath)) throw new Error(`Missing five-model visibility contract artifact: ${visibilityContractPath}`);
  const report = buildFiveModelScannerVisibilityAdapterProofReport({
    visibilityContractPath,
    visibilityContract: readJson<FiveModelScannerVisibilityContractReport>(visibilityContractPath),
  });
  const written = writeFiveModelScannerVisibilityAdapterProofReport(report, outDir);
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
