import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

type ReportStatus = 'pass' | 'blocked';
type SessionName = 'morning' | 'lunch' | 'evening';
type StateLabel = 'Approved Desk Plan' | 'Forming Desk Read';

interface ManifestRow {
  manifestRowId: string;
  sourceCardId: string;
  date: string;
  session: SessionName;
  stateLabel: StateLabel;
  model: string;
  direction: 'LONG' | 'SHORT';
  levelLine: string;
  proofLine: string;
  productionScannerVisibilityRehearsalOnly: true;
  scannerVisibilityMayBeEnabledOnlyBySeparateGate: true;
  discordRequiresSeparateApproval: true;
  supabaseRequiresSeparateApproval: true;
  bridgeReadsRemainDisabled: true;
  canExecuteRemainsUnchanged: true;
  automatedOrdersRemainDisabled: true;
}

interface ManifestReport {
  reportType?: string;
  status?: ReportStatus;
  rehearsal?: {
    manifestId?: string;
    idempotencySeed?: string;
    rollbackPlan?: string;
    requiredNextApproval?: string;
    allowedNextAction?: string;
  };
  summary?: Record<string, unknown>;
  manifestRows?: ManifestRow[];
  blockers?: string[];
}

interface DryRunRow extends ManifestRow {
  rehearsalExecutionRowId: string;
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
}

interface DryRunReport {
  reportType: 'five_model_guarded_production_rehearsal_execution_dry_run';
  generatedAt: string;
  status: ReportStatus;
  authority: {
    localOnly: true;
    readsSavedManifestOnly: true;
    writesDiagnosticArtifactsOnly: true;
    dryRunOnly: true;
    executesSideEffects: false;
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
    manifestPath: string;
    manifestId: string;
    idempotencySeed: string;
  };
  executionReceipt: {
    rehearsalExecutionId: string;
    idempotencyKey: string;
    rollbackPlan: 'disable_five_model_scanner_visibility_gate_and_revert_to_previous_scanner_surface';
    rollbackPlanPresent: true;
    sideEffectsExecuted: false;
    requiredNextApproval: 'explicit_guarded_production_rehearsal_execution';
    executedAction: 'one_local_production_rehearsal_execution_dry_run';
  };
  summary: {
    manifestRows: number;
    executionDryRunRows: number;
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
    blockedRows: number;
    recommendation: 'ready_for_scanner_visibility_install_preread' | 'hold_for_rehearsal_execution_contract_fix';
  };
  executionRows: DryRunRow[];
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  manifestPath: string | null;
  outDir: string;
  json: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const EXPECTED_ROLLBACK_PLAN = 'disable_five_model_scanner_visibility_gate_and_revert_to_previous_scanner_surface';

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function parseArgs(args = process.argv.slice(2)): CliOptions {
  return {
    manifestPath: readFlag(args, '--manifest'),
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

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function boolFlag(value: unknown): boolean {
  return value === true;
}

function dryRunRow(row: ManifestRow, idempotencySeed: string): DryRunRow {
  return {
    ...row,
    rehearsalExecutionRowId: `five-model-rehearsal-execution|${hash(`${idempotencySeed}|${row.manifestRowId}`)}`,
    scannerRuntimeWired: false,
    productionScannerVisibleNow: false,
    publishDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    canExecute: false,
    tradingLogicChanged: false,
    canExecuteChanged: false,
    automatedOrder: false,
  };
}

function buildMarkdown(report: Omit<DryRunReport, 'markdown'>): string {
  return [
    '# Five Model Guarded Production Rehearsal Execution Dry Run',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local execution dry run only. It reads the saved rehearsal manifest and writes diagnostics. It does not wire scanner runtime behavior, expose production scanner rows, post Discord, write Supabase, read live Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Execution Receipt',
    `- Rehearsal execution id: ${report.executionReceipt.rehearsalExecutionId}.`,
    `- Idempotency key: ${report.executionReceipt.idempotencyKey}.`,
    `- Manifest id: ${report.source.manifestId}.`,
    `- Rollback plan present: ${report.executionReceipt.rollbackPlanPresent}.`,
    `- Side effects executed: ${report.executionReceipt.sideEffectsExecuted}.`,
    `- Executed action: ${report.executionReceipt.executedAction}.`,
    '',
    '## Summary',
    `- Manifest rows: ${report.summary.manifestRows}.`,
    `- Execution dry-run rows: ${report.summary.executionDryRunRows}.`,
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
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Execution Rows',
    '| Date | Session | State | Model | Direction | Levels | Proof |',
    '|---|---|---|---|---|---|---|',
    ...report.executionRows.slice(0, 40).map((row) => `| ${row.date} | ${row.session} | ${row.stateLabel} | ${row.model} | ${row.direction} | ${row.levelLine} | ${row.proofLine} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildFiveModelGuardedProductionRehearsalExecutionDryRunReport(args: {
  manifestPath: string;
  manifest: ManifestReport;
}, generatedAt = new Date().toISOString()): DryRunReport {
  const manifestRows = args.manifest.manifestRows || [];
  const idempotencySeed = args.manifest.rehearsal?.idempotencySeed || '';
  const manifestId = args.manifest.rehearsal?.manifestId || '';
  const executionRows = manifestRows.map((row) => dryRunRow(row, idempotencySeed));
  const rowBlockers = manifestRows.flatMap((row) => [
    boolFlag(row.productionScannerVisibilityRehearsalOnly) ? null : `${row.manifestRowId} is not rehearsal-only.`,
    boolFlag(row.scannerVisibilityMayBeEnabledOnlyBySeparateGate) ? null : `${row.manifestRowId} lacks scanner visibility separate gate.`,
    boolFlag(row.discordRequiresSeparateApproval) ? null : `${row.manifestRowId} lacks Discord approval gate.`,
    boolFlag(row.supabaseRequiresSeparateApproval) ? null : `${row.manifestRowId} lacks Supabase approval gate.`,
    boolFlag(row.bridgeReadsRemainDisabled) ? null : `${row.manifestRowId} does not keep bridge reads disabled.`,
    boolFlag(row.canExecuteRemainsUnchanged) ? null : `${row.manifestRowId} does not keep canExecute unchanged.`,
    boolFlag(row.automatedOrdersRemainDisabled) ? null : `${row.manifestRowId} does not keep automated orders disabled.`,
  ]);
  const blockers = [
    args.manifest.reportType === 'five_model_guarded_production_rehearsal_manifest' ? null : 'Manifest report type is invalid.',
    args.manifest.status === 'pass' ? null : 'Manifest is not pass.',
    manifestId.startsWith('five-model-rehearsal-') ? null : 'Manifest id is missing or invalid.',
    idempotencySeed.length > 0 ? null : 'Idempotency seed is missing.',
    args.manifest.rehearsal?.requiredNextApproval === 'explicit_guarded_production_rehearsal_execution' ? null : 'Required next approval is invalid.',
    args.manifest.rehearsal?.allowedNextAction === 'one_local_production_rehearsal_execution_dry_run' ? null : 'Allowed next action is invalid.',
    args.manifest.rehearsal?.rollbackPlan === EXPECTED_ROLLBACK_PLAN ? null : 'Rollback plan is missing or invalid.',
    manifestRows.length === numberValue(args.manifest.summary?.manifestRows) ? null : 'Manifest rows do not match manifest summary.',
    manifestRows.length > 0 ? null : 'No manifest rows are available for dry run.',
    numberValue(args.manifest.summary?.productionScannerVisibleNowRows) === 0 ? null : 'Manifest has production scanner-visible rows.',
    numberValue(args.manifest.summary?.discordPostRows) === 0 ? null : 'Manifest has Discord-post rows.',
    numberValue(args.manifest.summary?.supabaseWriteRows) === 0 ? null : 'Manifest has Supabase-write rows.',
    numberValue(args.manifest.summary?.liveSupabaseReadRows) === 0 ? null : 'Manifest has live Supabase read rows.',
    numberValue(args.manifest.summary?.liveBridgeReadRows) === 0 ? null : 'Manifest has live bridge read rows.',
    numberValue(args.manifest.summary?.canExecuteTrueRows) === 0 ? null : 'Manifest has canExecute=true rows.',
    numberValue(args.manifest.summary?.tradingLogicChangedRows) === 0 ? null : 'Manifest changed trading logic.',
    numberValue(args.manifest.summary?.canExecuteChangedRows) === 0 ? null : 'Manifest changed canExecute.',
    numberValue(args.manifest.summary?.automatedOrderRows) === 0 ? null : 'Manifest has automated-order rows.',
    ...rowBlockers,
    ...(args.manifest.blockers || []),
  ].filter((item): item is string => Boolean(item));
  const visibleRows = blockers.length ? [] : executionRows;
  const status: ReportStatus = blockers.length ? 'blocked' : 'pass';
  const rehearsalExecutionId = `five-model-rehearsal-execution-${hash(`${manifestId}|${idempotencySeed}|${manifestRows.length}`)}`;
  const report: Omit<DryRunReport, 'markdown'> = {
    reportType: 'five_model_guarded_production_rehearsal_execution_dry_run',
    generatedAt,
    status,
    authority: {
      localOnly: true,
      readsSavedManifestOnly: true,
      writesDiagnosticArtifactsOnly: true,
      dryRunOnly: true,
      executesSideEffects: false,
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
      manifestPath: args.manifestPath,
      manifestId,
      idempotencySeed,
    },
    executionReceipt: {
      rehearsalExecutionId,
      idempotencyKey: `five-model-rehearsal-execution-${idempotencySeed}`,
      rollbackPlan: EXPECTED_ROLLBACK_PLAN,
      rollbackPlanPresent: true,
      sideEffectsExecuted: false,
      requiredNextApproval: 'explicit_guarded_production_rehearsal_execution',
      executedAction: 'one_local_production_rehearsal_execution_dry_run',
    },
    summary: {
      manifestRows: manifestRows.length,
      executionDryRunRows: visibleRows.length,
      approvedDeskPlanRows: visibleRows.filter((row) => row.stateLabel === 'Approved Desk Plan').length,
      formingDeskReadRows: visibleRows.filter((row) => row.stateLabel === 'Forming Desk Read').length,
      morningRows: visibleRows.filter((row) => row.session === 'morning').length,
      lunchRows: visibleRows.filter((row) => row.session === 'lunch').length,
      eveningRows: visibleRows.filter((row) => row.session === 'evening').length,
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
        ? 'ready_for_scanner_visibility_install_preread'
        : 'hold_for_rehearsal_execution_contract_fix',
    },
    executionRows: visibleRows,
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeFiveModelGuardedProductionRehearsalExecutionDryRunReport(
  report: DryRunReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `five-model-guarded-production-rehearsal-execution-dry-run-${stamp}.json`);
  const markdownPath = path.join(outDir, `five-model-guarded-production-rehearsal-execution-dry-run-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const outDir = path.resolve(options.outDir);
  const manifestPath = path.resolve(options.manifestPath ||
    latestReportByType(outDir, 'five_model_guarded_production_rehearsal_manifest') ||
    '');
  if (!fs.existsSync(manifestPath)) throw new Error(`Missing five-model guarded production rehearsal manifest artifact: ${manifestPath}`);
  const report = buildFiveModelGuardedProductionRehearsalExecutionDryRunReport({
    manifestPath,
    manifest: readJson<ManifestReport>(manifestPath),
  });
  const written = writeFiveModelGuardedProductionRehearsalExecutionDryRunReport(report, outDir);
  if (options.json) {
    console.log(JSON.stringify({
      ...written,
      status: report.status,
      summary: report.summary,
      executionReceipt: report.executionReceipt,
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
