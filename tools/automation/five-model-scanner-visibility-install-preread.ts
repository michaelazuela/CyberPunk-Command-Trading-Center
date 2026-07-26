import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type ReportStatus = 'pass' | 'blocked';

interface ExecutionDryRunReport {
  reportType?: string;
  status?: ReportStatus;
  source?: {
    manifestId?: string;
    idempotencySeed?: string;
  };
  executionReceipt?: {
    rehearsalExecutionId?: string;
    idempotencyKey?: string;
    sideEffectsExecuted?: boolean;
    executedAction?: string;
  };
  summary?: Record<string, unknown>;
  executionRows?: Array<{
    date: string;
    session: 'morning' | 'lunch' | 'evening';
    stateLabel: 'Approved Desk Plan' | 'Forming Desk Read';
    model: string;
    direction: 'LONG' | 'SHORT';
    scannerRuntimeWired: false;
    productionScannerVisibleNow: false;
    publishDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    canExecute: false;
    tradingLogicChanged: false;
    canExecuteChanged: false;
    automatedOrder: false;
  }>;
  blockers?: string[];
}

interface InstallPrereadReport {
  reportType: 'five_model_scanner_visibility_install_preread';
  generatedAt: string;
  status: ReportStatus;
  authority: {
    localOnly: true;
    readsSavedExecutionDryRunOnly: true;
    writesDiagnosticArtifactsOnly: true;
    prereadOnly: true;
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
    executionDryRunPath: string;
    rehearsalExecutionId: string;
    idempotencyKey: string;
  };
  installMap: {
    proposedRuntimeGateOwner: 'src/lib/fiveModelScannerVisibilityGate.ts';
    proposedSurfaceShapeOwner: 'src/lib/unifiedDeskOutputScannerSurface.ts';
    proposedSavedSurfacePreviewOwner: 'tools/automation/five-model-local-scanner-visibility-surface-preview.ts';
    nextPatchAllowedScope: 'local_runtime_adapter_contract_only';
    requiredApprovalBeforeRuntimeVisibility: 'explicit_five_model_scanner_visibility_install';
    rollbackPlan: 'disable_five_model_scanner_visibility_gate_and_revert_to_previous_scanner_surface';
  };
  summary: {
    executionDryRunRows: number;
    approvedDeskPlanRows: number;
    formingDeskReadRows: number;
    morningRows: number;
    lunchRows: number;
    eveningRows: number;
    requiredOwnerFilesFound: number;
    requiredOwnerFilesMissing: number;
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
    blockedRows: number;
    recommendation: 'ready_for_local_runtime_adapter_contract' | 'hold_for_install_preread_fix';
  };
  requiredOwnerFiles: Array<{
    path: string;
    exists: boolean;
    purpose: string;
  }>;
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  executionDryRunPath: string | null;
  outDir: string;
  json: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function parseArgs(args = process.argv.slice(2)): CliOptions {
  return {
    executionDryRunPath: readFlag(args, '--execution-dry-run'),
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

function ownerFiles(): InstallPrereadReport['requiredOwnerFiles'] {
  return [
    {
      path: 'src/lib/fiveModelScannerVisibilityGate.ts',
      exists: fs.existsSync(path.join(REPO_ROOT, 'src/lib/fiveModelScannerVisibilityGate.ts')),
      purpose: 'Default-off explicit approval gate for five-model scanner visibility.',
    },
    {
      path: 'src/lib/unifiedDeskOutputScannerSurface.ts',
      exists: fs.existsSync(path.join(REPO_ROOT, 'src/lib/unifiedDeskOutputScannerSurface.ts')),
      purpose: 'Existing scanner surface row shape used by the local scanner-facing output.',
    },
    {
      path: 'tools/automation/five-model-local-scanner-visibility-surface-preview.ts',
      exists: fs.existsSync(path.join(REPO_ROOT, 'tools/automation/five-model-local-scanner-visibility-surface-preview.ts')),
      purpose: 'Saved-artifact five-model surface preview source for the future adapter contract.',
    },
  ];
}

function buildMarkdown(report: Omit<InstallPrereadReport, 'markdown'>): string {
  return [
    '# Five Model Scanner Visibility Install Preread',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local preread only. It reads the saved rehearsal execution dry run, inventories the required owner files, and writes diagnostics. It does not wire scanner runtime behavior, expose production scanner rows, post Discord, write Supabase, read live Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Install Map',
    `- Runtime gate owner: ${report.installMap.proposedRuntimeGateOwner}.`,
    `- Surface shape owner: ${report.installMap.proposedSurfaceShapeOwner}.`,
    `- Saved surface preview owner: ${report.installMap.proposedSavedSurfacePreviewOwner}.`,
    `- Next patch allowed scope: ${report.installMap.nextPatchAllowedScope}.`,
    `- Required approval before runtime visibility: ${report.installMap.requiredApprovalBeforeRuntimeVisibility}.`,
    `- Rollback plan: ${report.installMap.rollbackPlan}.`,
    '',
    '## Summary',
    `- Execution dry-run rows: ${report.summary.executionDryRunRows}.`,
    `- Approved Desk Plan rows: ${report.summary.approvedDeskPlanRows}.`,
    `- Forming Desk Read rows: ${report.summary.formingDeskReadRows}.`,
    `- Morning rows: ${report.summary.morningRows}.`,
    `- Lunch rows: ${report.summary.lunchRows}.`,
    `- Evening rows: ${report.summary.eveningRows}.`,
    `- Required owner files found: ${report.summary.requiredOwnerFilesFound}.`,
    `- Required owner files missing: ${report.summary.requiredOwnerFilesMissing}.`,
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
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Required Owner Files',
    '| File | Exists | Purpose |',
    '|---|---:|---|',
    ...report.requiredOwnerFiles.map((file) => `| ${file.path} | ${file.exists} | ${file.purpose} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildFiveModelScannerVisibilityInstallPrereadReport(args: {
  executionDryRunPath: string;
  executionDryRun: ExecutionDryRunReport;
}, generatedAt = new Date().toISOString()): InstallPrereadReport {
  const rows = args.executionDryRun.executionRows || [];
  const requiredOwnerFiles = ownerFiles();
  const blockers = [
    args.executionDryRun.reportType === 'five_model_guarded_production_rehearsal_execution_dry_run' ? null : 'Execution dry-run report type is invalid.',
    args.executionDryRun.status === 'pass' ? null : 'Execution dry run is not pass.',
    args.executionDryRun.executionReceipt?.sideEffectsExecuted === false ? null : 'Execution dry run reports side effects.',
    args.executionDryRun.executionReceipt?.executedAction === 'one_local_production_rehearsal_execution_dry_run' ? null : 'Execution dry-run action is invalid.',
    rows.length === numberValue(args.executionDryRun.summary?.executionDryRunRows) ? null : 'Execution dry-run rows do not match summary.',
    rows.length > 0 ? null : 'No execution dry-run rows are available for install preread.',
    numberValue(args.executionDryRun.summary?.scannerRuntimeWiredRows) === 0 ? null : 'Execution dry run has scanner-runtime wired rows.',
    numberValue(args.executionDryRun.summary?.productionScannerVisibleNowRows) === 0 ? null : 'Execution dry run has production scanner-visible rows.',
    numberValue(args.executionDryRun.summary?.discordPostRows) === 0 ? null : 'Execution dry run has Discord-post rows.',
    numberValue(args.executionDryRun.summary?.supabaseWriteRows) === 0 ? null : 'Execution dry run has Supabase-write rows.',
    numberValue(args.executionDryRun.summary?.liveSupabaseReadRows) === 0 ? null : 'Execution dry run has live Supabase read rows.',
    numberValue(args.executionDryRun.summary?.liveBridgeReadRows) === 0 ? null : 'Execution dry run has live bridge read rows.',
    numberValue(args.executionDryRun.summary?.canExecuteTrueRows) === 0 ? null : 'Execution dry run has canExecute=true rows.',
    numberValue(args.executionDryRun.summary?.tradingLogicChangedRows) === 0 ? null : 'Execution dry run changed trading logic.',
    numberValue(args.executionDryRun.summary?.canExecuteChangedRows) === 0 ? null : 'Execution dry run changed canExecute.',
    numberValue(args.executionDryRun.summary?.automatedOrderRows) === 0 ? null : 'Execution dry run has automated-order rows.',
    ...rows.flatMap((row) => [
      row.scannerRuntimeWired === false ? null : 'A row has scanner runtime wiring.',
      row.productionScannerVisibleNow === false ? null : 'A row is production scanner-visible now.',
      row.publishDiscord === false ? null : 'A row would post Discord.',
      row.writesSupabase === false ? null : 'A row would write Supabase.',
      row.readsLiveSupabase === false ? null : 'A row would read live Supabase.',
      row.readsLiveBridge === false ? null : 'A row would read live bridge.',
      row.canExecute === false ? null : 'A row has canExecute=true.',
      row.tradingLogicChanged === false ? null : 'A row changes trading logic.',
      row.canExecuteChanged === false ? null : 'A row changes canExecute.',
      row.automatedOrder === false ? null : 'A row allows automated orders.',
    ]),
    ...requiredOwnerFiles.filter((file) => !file.exists).map((file) => `Missing required owner file: ${file.path}.`),
    ...(args.executionDryRun.blockers || []),
  ].filter((item): item is string => Boolean(item));
  const visibleRows = blockers.length ? [] : rows;
  const status: ReportStatus = blockers.length ? 'blocked' : 'pass';
  const report: Omit<InstallPrereadReport, 'markdown'> = {
    reportType: 'five_model_scanner_visibility_install_preread',
    generatedAt,
    status,
    authority: {
      localOnly: true,
      readsSavedExecutionDryRunOnly: true,
      writesDiagnosticArtifactsOnly: true,
      prereadOnly: true,
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
      executionDryRunPath: args.executionDryRunPath,
      rehearsalExecutionId: args.executionDryRun.executionReceipt?.rehearsalExecutionId || '',
      idempotencyKey: args.executionDryRun.executionReceipt?.idempotencyKey || '',
    },
    installMap: {
      proposedRuntimeGateOwner: 'src/lib/fiveModelScannerVisibilityGate.ts',
      proposedSurfaceShapeOwner: 'src/lib/unifiedDeskOutputScannerSurface.ts',
      proposedSavedSurfacePreviewOwner: 'tools/automation/five-model-local-scanner-visibility-surface-preview.ts',
      nextPatchAllowedScope: 'local_runtime_adapter_contract_only',
      requiredApprovalBeforeRuntimeVisibility: 'explicit_five_model_scanner_visibility_install',
      rollbackPlan: 'disable_five_model_scanner_visibility_gate_and_revert_to_previous_scanner_surface',
    },
    summary: {
      executionDryRunRows: visibleRows.length,
      approvedDeskPlanRows: visibleRows.filter((row) => row.stateLabel === 'Approved Desk Plan').length,
      formingDeskReadRows: visibleRows.filter((row) => row.stateLabel === 'Forming Desk Read').length,
      morningRows: visibleRows.filter((row) => row.session === 'morning').length,
      lunchRows: visibleRows.filter((row) => row.session === 'lunch').length,
      eveningRows: visibleRows.filter((row) => row.session === 'evening').length,
      requiredOwnerFilesFound: requiredOwnerFiles.filter((file) => file.exists).length,
      requiredOwnerFilesMissing: requiredOwnerFiles.filter((file) => !file.exists).length,
      scannerRuntimeWiredRows: 0,
      productionScannerVisibleNowRows: 0,
      discordPostRows: 0,
      supabaseWriteRows: 0,
      liveSupabaseReadRows: 0,
      liveBridgeReadRows: 0,
      canExecuteTrueRows: 0,
      tradingLogicChangedRows: 0,
      canExecuteChangedRows: 0,
      automatedOrderRows: 0,
      blockedRows: blockers.length,
      recommendation: status === 'pass'
        ? 'ready_for_local_runtime_adapter_contract'
        : 'hold_for_install_preread_fix',
    },
    requiredOwnerFiles,
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeFiveModelScannerVisibilityInstallPrereadReport(
  report: InstallPrereadReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `five-model-scanner-visibility-install-preread-${stamp}.json`);
  const markdownPath = path.join(outDir, `five-model-scanner-visibility-install-preread-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const outDir = path.resolve(options.outDir);
  const executionDryRunPath = path.resolve(options.executionDryRunPath ||
    latestReportByType(outDir, 'five_model_guarded_production_rehearsal_execution_dry_run') ||
    '');
  if (!fs.existsSync(executionDryRunPath)) throw new Error(`Missing five-model rehearsal execution dry-run artifact: ${executionDryRunPath}`);
  const report = buildFiveModelScannerVisibilityInstallPrereadReport({
    executionDryRunPath,
    executionDryRun: readJson<ExecutionDryRunReport>(executionDryRunPath),
  });
  const written = writeFiveModelScannerVisibilityInstallPrereadReport(report, outDir);
  if (options.json) {
    console.log(JSON.stringify({
      ...written,
      status: report.status,
      summary: report.summary,
      installMap: report.installMap,
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
