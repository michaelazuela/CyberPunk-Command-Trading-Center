import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type ReportStatus = 'pass' | 'blocked';

interface SourceReport {
  reportType?: string;
  status?: ReportStatus;
  summary?: Record<string, unknown>;
  authority?: Record<string, unknown>;
  source?: Record<string, unknown>;
  artifacts?: Record<string, unknown>;
  blockers?: string[];
}

interface FiveModelFinalLocalReadinessChecklistReport {
  reportType: 'five_model_final_local_readiness_checklist';
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
    hiddenImportProofPath: string;
    hiddenBrowserVerificationPath: string;
  };
  readinessChecklist: Array<{
    item: string;
    status: 'ready' | 'requires_explicit_approval' | 'blocked';
  }>;
  summary: {
    hiddenImportProofPassed: boolean;
    hiddenBrowserVerificationPassed: boolean;
    importReady: boolean;
    previewReady: boolean;
    renderedRows: number;
    approvedDeskPlanRows: number;
    formingDeskReadRows: number;
    browserRenderedRows: number;
    browserApprovedDeskPlanRows: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    tradingLogicChangedRows: number;
    automatedOrderRows: number;
    runtimeGateEnabled: false;
    productionGoLiveApproved: false;
    blockedRows: number;
    recommendation: 'ready_for_disabled_scanner_runtime_wiring_preview' | 'hold_for_five_model_readiness_fix';
  };
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  hiddenImportProofPath: string | null;
  hiddenBrowserVerificationPath: string | null;
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
    hiddenImportProofPath: readFlag(args, '--hidden-import-proof'),
    hiddenBrowserVerificationPath: readFlag(args, '--hidden-browser-verification'),
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
    validateZero(report.summary, 'tradingLogicChangedRows', label),
    validateZero(report.summary, 'automatedOrderRows', label),
    ...(report.blockers || []),
  ].filter((item): item is string => Boolean(item));
}

function buildChecklist(blockers: string[]): FiveModelFinalLocalReadinessChecklistReport['readinessChecklist'] {
  return [
    {
      item: 'Five-model hidden import proof passed with scanner-surface rows ready for local preview.',
      status: blockers.length ? 'blocked' : 'ready',
    },
    {
      item: 'Hidden local browser preview rendered the same row counts from the saved import proof.',
      status: blockers.length ? 'blocked' : 'ready',
    },
    {
      item: 'Discord, Supabase, live bridge, canExecute, trading logic, and automated orders remain off.',
      status: blockers.length ? 'blocked' : 'ready',
    },
    {
      item: 'Runtime scanner wiring and production visibility still require a separate explicit approval gate.',
      status: 'requires_explicit_approval',
    },
  ];
}

function buildMarkdown(report: Omit<FiveModelFinalLocalReadinessChecklistReport, 'markdown'>): string {
  return [
    '# Five Model Final Local Readiness Checklist',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local readiness checklist only. It reads saved five-model proof artifacts and writes diagnostics. It does not enable runtime behavior, post Discord, write Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Summary',
    `- Hidden import proof passed: ${report.summary.hiddenImportProofPassed}.`,
    `- Hidden browser verification passed: ${report.summary.hiddenBrowserVerificationPassed}.`,
    `- Import ready: ${report.summary.importReady}.`,
    `- Preview ready: ${report.summary.previewReady}.`,
    `- Rendered rows: ${report.summary.renderedRows}.`,
    `- Approved Desk Plan rows: ${report.summary.approvedDeskPlanRows}.`,
    `- Forming Desk Read rows: ${report.summary.formingDeskReadRows}.`,
    `- Browser-rendered rows: ${report.summary.browserRenderedRows}.`,
    `- Browser Approved Desk Plan rows: ${report.summary.browserApprovedDeskPlanRows}.`,
    `- Discord-post rows: ${report.summary.discordPostRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Trading-logic changed rows: ${report.summary.tradingLogicChangedRows}.`,
    `- Automated-order rows: ${report.summary.automatedOrderRows}.`,
    `- Runtime gate enabled: ${report.summary.runtimeGateEnabled}.`,
    `- Production go-live approved: ${report.summary.productionGoLiveApproved}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Readiness Checklist',
    ...report.readinessChecklist.map((item) => `- ${item.status}: ${item.item}`),
    '',
    '## Sources',
    `- Hidden import proof: ${report.source.hiddenImportProofPath}.`,
    `- Hidden browser verification: ${report.source.hiddenBrowserVerificationPath}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildFiveModelFinalLocalReadinessChecklistReport(args: {
  hiddenImportProofPath: string;
  hiddenImportProof: SourceReport;
  hiddenBrowserVerificationPath: string;
  hiddenBrowserVerification: SourceReport;
}, generatedAt = new Date().toISOString()): FiveModelFinalLocalReadinessChecklistReport {
  const importProof = args.hiddenImportProof;
  const browser = args.hiddenBrowserVerification;
  const renderedRows = numberValue(importProof.summary?.renderedRows);
  const approvedDeskPlanRows = numberValue(importProof.summary?.approvedDeskPlanRows);
  const formingDeskReadRows = numberValue(importProof.summary?.formingDeskReadRows);
  const blockers = [
    ...validateSource(importProof, 'unified_desk_output_disabled_local_scanner_preview_render_install_proof', 'Hidden import proof'),
    ...validateSource(browser, 'unified_desk_output_hidden_preview_local_verification', 'Hidden browser verification'),
    importProof.summary?.hiddenPreviewImportReady === true ? null : 'Hidden import proof is not import-ready.',
    browser.summary?.previewReady === true ? null : 'Hidden browser preview is not ready.',
    browser.summary?.importReady === true ? null : 'Hidden browser import is not ready.',
    numberValue(browser.summary?.renderedRows) === renderedRows
      ? null
      : `Browser renderedRows=${String(browser.summary?.renderedRows)} does not match import renderedRows=${renderedRows}.`,
    numberValue(browser.summary?.approvedDeskPlanRows) === approvedDeskPlanRows
      ? null
      : `Browser approvedDeskPlanRows=${String(browser.summary?.approvedDeskPlanRows)} does not match import approvedDeskPlanRows=${approvedDeskPlanRows}.`,
    renderedRows > 0 ? null : 'Five-model readiness has no rendered rows.',
    approvedDeskPlanRows > 0 ? null : 'Five-model readiness has no Approved Desk Plan rows.',
    renderedRows === approvedDeskPlanRows + formingDeskReadRows
      ? null
      : 'Rendered rows do not equal Approved Desk Plan plus Forming Desk Read rows.',
  ].filter((item): item is string => Boolean(item));

  const status: ReportStatus = blockers.length ? 'blocked' : 'pass';
  const summary = {
    hiddenImportProofPassed: importProof.status === 'pass',
    hiddenBrowserVerificationPassed: browser.status === 'pass',
    importReady: importProof.summary?.hiddenPreviewImportReady === true,
    previewReady: browser.summary?.previewReady === true,
    renderedRows,
    approvedDeskPlanRows,
    formingDeskReadRows,
    browserRenderedRows: numberValue(browser.summary?.renderedRows),
    browserApprovedDeskPlanRows: numberValue(browser.summary?.approvedDeskPlanRows),
    discordPostRows: 0,
    supabaseWriteRows: 0,
    liveBridgeReadRows: 0,
    canExecuteTrueRows: 0,
    tradingLogicChangedRows: 0,
    automatedOrderRows: 0,
    runtimeGateEnabled: false as const,
    productionGoLiveApproved: false as const,
    blockedRows: blockers.length,
    recommendation: status === 'pass'
      ? 'ready_for_disabled_scanner_runtime_wiring_preview' as const
      : 'hold_for_five_model_readiness_fix' as const,
  };
  const report: Omit<FiveModelFinalLocalReadinessChecklistReport, 'markdown'> = {
    reportType: 'five_model_final_local_readiness_checklist',
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
      hiddenImportProofPath: args.hiddenImportProofPath,
      hiddenBrowserVerificationPath: args.hiddenBrowserVerificationPath,
    },
    readinessChecklist: buildChecklist(blockers),
    summary,
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeFiveModelFinalLocalReadinessChecklistReport(
  report: FiveModelFinalLocalReadinessChecklistReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `five-model-final-local-readiness-checklist-${stamp}.json`);
  const markdownPath = path.join(outDir, `five-model-final-local-readiness-checklist-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const outDir = path.resolve(options.outDir);
  const hiddenImportProofPath = path.resolve(options.hiddenImportProofPath ||
    latestReportByType(outDir, 'unified_desk_output_disabled_local_scanner_preview_render_install_proof') ||
    '');
  const hiddenBrowserVerificationPath = path.resolve(options.hiddenBrowserVerificationPath ||
    latestReportByType(outDir, 'unified_desk_output_hidden_preview_local_verification') ||
    '');
  for (const filePath of [hiddenImportProofPath, hiddenBrowserVerificationPath]) {
    if (!fs.existsSync(filePath)) throw new Error(`Missing five-model readiness source artifact: ${filePath}`);
  }
  const report = buildFiveModelFinalLocalReadinessChecklistReport({
    hiddenImportProofPath,
    hiddenImportProof: readJson<SourceReport>(hiddenImportProofPath),
    hiddenBrowserVerificationPath,
    hiddenBrowserVerification: readJson<SourceReport>(hiddenBrowserVerificationPath),
  });
  const written = writeFiveModelFinalLocalReadinessChecklistReport(report, outDir);
  if (options.json) {
    console.log(JSON.stringify({
      ...written,
      status: report.status,
      summary: report.summary,
      readinessChecklist: report.readinessChecklist,
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
