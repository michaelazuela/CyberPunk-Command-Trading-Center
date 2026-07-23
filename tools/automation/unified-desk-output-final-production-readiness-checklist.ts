import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type ReportStatus = 'pass' | 'blocked';

interface SourceReport {
  reportType?: string;
  status?: ReportStatus;
  summary?: Record<string, unknown>;
  authority?: Record<string, unknown>;
  runtimeGateContract?: Record<string, unknown>;
  source?: Record<string, unknown>;
  selectedCandidates?: unknown[];
  artifacts?: Record<string, unknown>;
  blockers?: string[];
}

interface FinalProductionReadinessChecklistReport {
  reportType: 'unified_desk_output_final_production_readiness_checklist';
  generatedAt: string;
  status: ReportStatus;
  authority: {
    localOnly: true;
    readsSavedArtifactsOnly: true;
    writesReadinessChecklistOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    enablesRuntimeGate: false;
    productionGoLiveApproved: false;
    automatedOrders: false;
  };
  source: {
    currentLiveReadinessManifestPath: string;
    disabledRuntimeGateReceiptPath: string;
    disabledE2eRuntimeValidationPath: string;
    hiddenPreviewLocalVerificationPath: string;
  };
  productionGateChecklist: Array<{
    item: string;
    status: 'ready' | 'requires_explicit_approval' | 'blocked';
  }>;
  summary: {
    currentLiveReadinessManifestPassed: boolean;
    disabledRuntimeGateReceiptPassed: boolean;
    disabledE2eRuntimeValidationPassed: boolean;
    hiddenPreviewLocalVerificationPassed: boolean;
    selectedRows: number;
    morningRows: number;
    lunchRows: number;
    approvedDeskPlanRows: number;
    browserRenderedRows: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    canExecuteChangedRows: number;
    tradingLogicChangedRows: number;
    automatedOrderRows: number;
    runtimeGateEnabled: boolean;
    productionGoLiveApproved: false;
    blockedRows: number;
    recommendation: 'ready_for_explicit_production_go_live_approval' | 'hold_for_final_readiness_fix';
  };
  selectedCandidates: unknown[];
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  currentLiveReadinessManifestPath: string | null;
  disabledRuntimeGateReceiptPath: string | null;
  disabledE2eRuntimeValidationPath: string | null;
  hiddenPreviewLocalVerificationPath: string | null;
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
    currentLiveReadinessManifestPath: readFlag(args, '--current-live-readiness-manifest'),
    disabledRuntimeGateReceiptPath: readFlag(args, '--disabled-runtime-gate-receipt'),
    disabledE2eRuntimeValidationPath: readFlag(args, '--disabled-e2e-runtime-validation'),
    hiddenPreviewLocalVerificationPath: readFlag(args, '--hidden-preview-local-verification'),
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

function booleanValue(value: unknown): boolean {
  return value === true;
}

function validateZero(summary: Record<string, unknown> | undefined, key: string, label: string): string | null {
  return numberValue(summary?.[key]) === 0 ? null : `${label} has ${key}=${String(summary?.[key])}.`;
}

function validateSource(report: SourceReport, expectedType: string, label: string): string[] {
  return [
    report.reportType === expectedType ? null : `${label} report type is ${report.reportType || '<missing>'}.`,
    report.status === 'pass' ? null : `${label} status is ${report.status || '<missing>'}.`,
    validateZero(report.summary, 'discordPostRows', label),
    validateZero(report.summary, 'supabaseWriteRows', label),
    validateZero(report.summary, 'liveBridgeReadRows', label),
    validateZero(report.summary, 'canExecuteTrueRows', label),
    validateZero(report.summary, 'canExecuteChangedRows', label),
    validateZero(report.summary, 'tradingLogicChangedRows', label),
    validateZero(report.summary, 'automatedOrderRows', label),
    ...(report.blockers || []),
  ].filter((item): item is string => Boolean(item));
}

function buildChecklist(blockers: string[]): FinalProductionReadinessChecklistReport['productionGateChecklist'] {
  return [
    {
      item: 'Saved current live-readiness manifest passes with one morning and one lunch row.',
      status: blockers.length ? 'blocked' : 'ready',
    },
    {
      item: 'Disabled runtime gate receipt proves runtime gate is still off by default.',
      status: blockers.length ? 'blocked' : 'ready',
    },
    {
      item: 'Disabled E2E runtime validation recomputes the chain from saved scanner artifacts.',
      status: blockers.length ? 'blocked' : 'ready',
    },
    {
      item: 'Hidden local browser preview renders the two selected Approved Desk Plan rows.',
      status: blockers.length ? 'blocked' : 'ready',
    },
    {
      item: 'Production enablement requires a separate explicit approval gate before scanner visibility or Discord posting changes.',
      status: 'requires_explicit_approval',
    },
  ];
}

function buildMarkdown(report: Omit<FinalProductionReadinessChecklistReport, 'markdown'>): string {
  return [
    '# Unified Desk Output Final Production Readiness Checklist',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local readiness checklist only. It reads saved artifacts and writes this checklist. It does not enable runtime behavior, post Discord, write Supabase, read live bridge data, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Summary',
    `- Current live-readiness manifest passed: ${report.summary.currentLiveReadinessManifestPassed}.`,
    `- Disabled runtime-gate receipt passed: ${report.summary.disabledRuntimeGateReceiptPassed}.`,
    `- Disabled E2E runtime validation passed: ${report.summary.disabledE2eRuntimeValidationPassed}.`,
    `- Hidden preview local verification passed: ${report.summary.hiddenPreviewLocalVerificationPassed}.`,
    `- Selected rows: ${report.summary.selectedRows}.`,
    `- Morning rows: ${report.summary.morningRows}.`,
    `- Lunch rows: ${report.summary.lunchRows}.`,
    `- Browser-rendered rows: ${report.summary.browserRenderedRows}.`,
    `- Approved Desk Plan rows: ${report.summary.approvedDeskPlanRows}.`,
    `- Discord-post rows: ${report.summary.discordPostRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Trading-logic changed rows: ${report.summary.tradingLogicChangedRows}.`,
    `- Runtime gate enabled: ${report.summary.runtimeGateEnabled}.`,
    `- Production go-live approved: ${report.summary.productionGoLiveApproved}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Production Gate Checklist',
    ...report.productionGateChecklist.map((item) => `- ${item.status}: ${item.item}`),
    '',
    '## Sources',
    `- Current live-readiness manifest: ${report.source.currentLiveReadinessManifestPath}.`,
    `- Disabled runtime-gate receipt: ${report.source.disabledRuntimeGateReceiptPath}.`,
    `- Disabled E2E runtime validation: ${report.source.disabledE2eRuntimeValidationPath}.`,
    `- Hidden preview local verification: ${report.source.hiddenPreviewLocalVerificationPath}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildUnifiedDeskOutputFinalProductionReadinessChecklistReport(args: {
  currentLiveReadinessManifestPath: string;
  currentLiveReadinessManifest: SourceReport;
  disabledRuntimeGateReceiptPath: string;
  disabledRuntimeGateReceipt: SourceReport;
  disabledE2eRuntimeValidationPath: string;
  disabledE2eRuntimeValidation: SourceReport;
  hiddenPreviewLocalVerificationPath: string;
  hiddenPreviewLocalVerification: SourceReport;
}, generatedAt = new Date().toISOString()): FinalProductionReadinessChecklistReport {
  const current = args.currentLiveReadinessManifest;
  const receipt = args.disabledRuntimeGateReceipt;
  const e2e = args.disabledE2eRuntimeValidation;
  const preview = args.hiddenPreviewLocalVerification;

  const blockers = [
    ...validateSource(current, 'unified_desk_output_current_live_readiness_manifest', 'Current live-readiness manifest'),
    ...validateSource(receipt, 'unified_desk_output_runtime_gate_manifest_disabled_receipt', 'Disabled runtime-gate receipt'),
    ...validateSource(e2e, 'unified_desk_output_disabled_e2e_runtime_validation', 'Disabled E2E runtime validation'),
    ...validateSource(preview, 'unified_desk_output_hidden_preview_local_verification', 'Hidden preview local verification'),
    current.summary?.selectedRows === 2 ? null : 'Current manifest did not select exactly two rows.',
    current.summary?.morningRows === 1 ? null : 'Current manifest did not select exactly one morning row.',
    current.summary?.lunchRows === 1 ? null : 'Current manifest did not select exactly one lunch row.',
    preview.summary?.approvedDeskPlanRows === 2 ? null : 'Hidden preview did not render exactly two Approved Desk Plan rows.',
    preview.summary?.renderedRows === 2 ? null : 'Hidden preview did not render exactly two rows.',
    booleanValue(receipt.summary?.runtimeGateEnabled) ? 'Disabled runtime-gate receipt has runtimeGateEnabled=true.' : null,
    booleanValue(e2e.summary?.runtimeGateEnabled) ? 'Disabled E2E runtime validation has runtimeGateEnabled=true.' : null,
    booleanValue(current.summary?.runtimeInstallAllowed) ? 'Current manifest allows runtime install.' : null,
    booleanValue(current.summary?.explicitApprovalPresent) ? 'Current manifest claims explicit approval is already present.' : null,
  ].filter((item): item is string => Boolean(item));

  const status: ReportStatus = blockers.length ? 'blocked' : 'pass';
  const summary = {
    currentLiveReadinessManifestPassed: current.status === 'pass',
    disabledRuntimeGateReceiptPassed: receipt.status === 'pass',
    disabledE2eRuntimeValidationPassed: e2e.status === 'pass',
    hiddenPreviewLocalVerificationPassed: preview.status === 'pass',
    selectedRows: numberValue(current.summary?.selectedRows),
    morningRows: numberValue(current.summary?.morningRows),
    lunchRows: numberValue(current.summary?.lunchRows),
    approvedDeskPlanRows: numberValue(preview.summary?.approvedDeskPlanRows),
    browserRenderedRows: numberValue(preview.summary?.renderedRows),
    discordPostRows: 0,
    supabaseWriteRows: 0,
    liveSupabaseReadRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    canExecuteChangedRows: 0,
    tradingLogicChangedRows: 0,
    automatedOrderRows: 0,
    runtimeGateEnabled: false,
    productionGoLiveApproved: false as const,
    blockedRows: blockers.length,
    recommendation: status === 'pass'
      ? 'ready_for_explicit_production_go_live_approval' as const
      : 'hold_for_final_readiness_fix' as const,
  };
  const report: Omit<FinalProductionReadinessChecklistReport, 'markdown'> = {
    reportType: 'unified_desk_output_final_production_readiness_checklist',
    generatedAt,
    status,
    authority: {
      localOnly: true,
      readsSavedArtifactsOnly: true,
      writesReadinessChecklistOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesScannerBehavior: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      enablesRuntimeGate: false,
      productionGoLiveApproved: false,
      automatedOrders: false,
    },
    source: {
      currentLiveReadinessManifestPath: args.currentLiveReadinessManifestPath,
      disabledRuntimeGateReceiptPath: args.disabledRuntimeGateReceiptPath,
      disabledE2eRuntimeValidationPath: args.disabledE2eRuntimeValidationPath,
      hiddenPreviewLocalVerificationPath: args.hiddenPreviewLocalVerificationPath,
    },
    productionGateChecklist: buildChecklist(blockers),
    summary,
    selectedCandidates: current.selectedCandidates || [],
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeUnifiedDeskOutputFinalProductionReadinessChecklistReport(
  report: FinalProductionReadinessChecklistReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-desk-output-final-production-readiness-checklist-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-desk-output-final-production-readiness-checklist-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const outDir = path.resolve(options.outDir);
  const currentPath = path.resolve(options.currentLiveReadinessManifestPath ||
    latestReportByType(outDir, 'unified_desk_output_current_live_readiness_manifest') ||
    '');
  const receiptPath = path.resolve(options.disabledRuntimeGateReceiptPath ||
    latestReportByType(outDir, 'unified_desk_output_runtime_gate_manifest_disabled_receipt') ||
    '');
  const e2ePath = path.resolve(options.disabledE2eRuntimeValidationPath ||
    latestReportByType(outDir, 'unified_desk_output_disabled_e2e_runtime_validation') ||
    '');
  const previewPath = path.resolve(options.hiddenPreviewLocalVerificationPath ||
    latestReportByType(outDir, 'unified_desk_output_hidden_preview_local_verification') ||
    '');
  for (const filePath of [currentPath, receiptPath, e2ePath, previewPath]) {
    if (!fs.existsSync(filePath)) throw new Error(`Missing readiness source artifact: ${filePath}`);
  }
  const report = buildUnifiedDeskOutputFinalProductionReadinessChecklistReport({
    currentLiveReadinessManifestPath: currentPath,
    currentLiveReadinessManifest: readJson<SourceReport>(currentPath),
    disabledRuntimeGateReceiptPath: receiptPath,
    disabledRuntimeGateReceipt: readJson<SourceReport>(receiptPath),
    disabledE2eRuntimeValidationPath: e2ePath,
    disabledE2eRuntimeValidation: readJson<SourceReport>(e2ePath),
    hiddenPreviewLocalVerificationPath: previewPath,
    hiddenPreviewLocalVerification: readJson<SourceReport>(previewPath),
  });
  const written = writeUnifiedDeskOutputFinalProductionReadinessChecklistReport(report, outDir);
  if (options.json) {
    console.log(JSON.stringify({
      ...written,
      status: report.status,
      summary: report.summary,
      productionGateChecklist: report.productionGateChecklist,
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
