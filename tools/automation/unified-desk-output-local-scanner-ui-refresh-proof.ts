import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

interface LocalLiveReadinessReport {
  reportType: 'unified_desk_output_local_live_readiness';
  status: 'pass' | 'blocked';
  authority: {
    localOnly: true;
    readsSavedRehearsalOnly: true;
    requiresExplicitLocalFlag: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    automatedOrders: false;
  };
  summary: {
    defaultDisabled: boolean;
    remoteBlocked: boolean;
    localPreviewAllowed: boolean;
    scannerPreviewAllowed: boolean;
    previewRows: number;
    approvedDeskPlanRows: number;
    formingDeskReadRows: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    wordingViolationRows: number;
    blockedRows: number;
    recommendation: 'ready_for_local_live_preview' | 'hold_for_local_live_gate_fix';
  };
  blockers: string[];
}

interface LocalScannerUiRefreshProofReport {
  reportType: 'unified_desk_output_local_scanner_ui_refresh_proof';
  generatedAt: string;
  status: 'pass' | 'blocked';
  authority: {
    localOnly: true;
    readsSavedLocalLiveReadinessOnly: true;
    requiresExplicitLocalFlag: true;
    refreshesScannerUiOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    automatedOrders: false;
  };
  source: {
    localLiveReadinessPath: string;
    localLiveReadinessStatus: 'pass' | 'blocked';
  };
  summary: {
    scannerUiRefreshAllowed: boolean;
    defaultDisabled: boolean;
    remoteBlocked: boolean;
    localPreviewAllowed: boolean;
    scannerPreviewAllowed: boolean;
    previewRows: number;
    approvedDeskPlanRows: number;
    formingDeskReadRows: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    wordingViolationRows: number;
    blockedRows: number;
    recommendation: 'ready_for_local_scanner_ui_refresh' | 'hold_for_local_scanner_ui_refresh_fix';
  };
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  readinessPath: string | null;
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
    readinessPath: readFlag(args, '--readiness'),
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

function buildMarkdown(report: Omit<LocalScannerUiRefreshProofReport, 'markdown'>): string {
  return [
    '# Unified Desk Output Local Scanner UI Refresh Proof',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local scanner UI refresh proof only. It reads a saved local-live readiness report and does not post Discord, write Supabase, read live Supabase, read live bridge data, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Gate Results',
    `- Scanner UI refresh allowed: ${report.summary.scannerUiRefreshAllowed}.`,
    `- Default route disabled: ${report.summary.defaultDisabled}.`,
    `- Remote/non-local route blocked: ${report.summary.remoteBlocked}.`,
    `- Local explicit-flag preview allowed: ${report.summary.localPreviewAllowed}.`,
    `- Scanner preview allowed: ${report.summary.scannerPreviewAllowed}.`,
    '',
    '## Row Counts',
    `- Preview rows: ${report.summary.previewRows}.`,
    `- Approved Desk Plans: ${report.summary.approvedDeskPlanRows}.`,
    `- Forming Desk Reads: ${report.summary.formingDeskReadRows}.`,
    `- Discord-post rows: ${report.summary.discordPostRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-Supabase-read rows: ${report.summary.liveSupabaseReadRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Wording violation rows: ${report.summary.wordingViolationRows}.`,
    `- Blocked rows: ${report.summary.blockedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Source',
    `- Local-live readiness: ${report.source.localLiveReadinessPath}.`,
    `- Local-live readiness status: ${report.source.localLiveReadinessStatus}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildUnifiedDeskOutputLocalScannerUiRefreshProofReport(args: {
  readinessPath: string;
  readinessReport: LocalLiveReadinessReport;
}, generatedAt = new Date().toISOString()): LocalScannerUiRefreshProofReport {
  const { readinessReport } = args;
  const blockers = [
    readinessReport.reportType === 'unified_desk_output_local_live_readiness'
      ? null
      : 'Source report is not local-live readiness.',
    readinessReport.status === 'pass' ? null : `Local-live readiness status is ${readinessReport.status}.`,
    readinessReport.authority.localOnly ? null : 'Local-live readiness is not local-only.',
    readinessReport.authority.requiresExplicitLocalFlag ? null : 'Local-live readiness does not require explicit local flag.',
    readinessReport.authority.postsDiscord === false ? null : 'Local-live readiness posts Discord.',
    readinessReport.authority.writesSupabase === false ? null : 'Local-live readiness writes Supabase.',
    readinessReport.authority.readsLiveSupabase === false ? null : 'Local-live readiness reads live Supabase.',
    readinessReport.authority.readsLiveBridge === false ? null : 'Local-live readiness reads live bridge.',
    readinessReport.authority.changesTradingLogic === false ? null : 'Local-live readiness changes trading logic.',
    readinessReport.authority.changesCanExecute === false ? null : 'Local-live readiness changes canExecute.',
    readinessReport.authority.automatedOrders === false ? null : 'Local-live readiness allows automated orders.',
    readinessReport.summary.defaultDisabled ? null : 'Default route is not disabled.',
    readinessReport.summary.remoteBlocked ? null : 'Remote/non-local route is not blocked.',
    readinessReport.summary.localPreviewAllowed ? null : 'Local explicit-flag preview is not allowed.',
    readinessReport.summary.scannerPreviewAllowed ? null : 'Scanner preview is not allowed.',
    readinessReport.summary.previewRows > 0 ? null : 'No preview rows are available for scanner UI refresh.',
    readinessReport.summary.approvedDeskPlanRows + readinessReport.summary.formingDeskReadRows === readinessReport.summary.previewRows
      ? null
      : 'Readiness report includes rows outside Approved Desk Plan/Forming Desk Read.',
    readinessReport.summary.discordPostRows === 0 ? null : 'Readiness report has Discord post rows.',
    readinessReport.summary.supabaseWriteRows === 0 ? null : 'Readiness report has Supabase write rows.',
    readinessReport.summary.liveSupabaseReadRows === 0 ? null : 'Readiness report has live Supabase read rows.',
    readinessReport.summary.liveBridgeReadRows === 0 ? null : 'Readiness report has live bridge read rows.',
    readinessReport.summary.canExecuteTrueRows === 0 ? null : 'Readiness report has canExecute=true rows.',
    readinessReport.summary.wordingViolationRows === 0 ? null : 'Readiness report has wording violations.',
    readinessReport.summary.blockedRows === 0 ? null : 'Readiness report has blocked rows.',
    ...readinessReport.blockers,
  ].filter((item): item is string => Boolean(item));
  const report: Omit<LocalScannerUiRefreshProofReport, 'markdown'> = {
    reportType: 'unified_desk_output_local_scanner_ui_refresh_proof',
    generatedAt,
    status: blockers.length ? 'blocked' : 'pass',
    authority: {
      localOnly: true,
      readsSavedLocalLiveReadinessOnly: true,
      requiresExplicitLocalFlag: true,
      refreshesScannerUiOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      automatedOrders: false,
    },
    source: {
      localLiveReadinessPath: args.readinessPath,
      localLiveReadinessStatus: readinessReport.status,
    },
    summary: {
      scannerUiRefreshAllowed: blockers.length === 0,
      defaultDisabled: readinessReport.summary.defaultDisabled,
      remoteBlocked: readinessReport.summary.remoteBlocked,
      localPreviewAllowed: readinessReport.summary.localPreviewAllowed,
      scannerPreviewAllowed: readinessReport.summary.scannerPreviewAllowed,
      previewRows: readinessReport.summary.previewRows,
      approvedDeskPlanRows: readinessReport.summary.approvedDeskPlanRows,
      formingDeskReadRows: readinessReport.summary.formingDeskReadRows,
      discordPostRows: readinessReport.summary.discordPostRows,
      supabaseWriteRows: readinessReport.summary.supabaseWriteRows,
      liveSupabaseReadRows: readinessReport.summary.liveSupabaseReadRows,
      liveBridgeReadRows: readinessReport.summary.liveBridgeReadRows,
      canExecuteTrueRows: readinessReport.summary.canExecuteTrueRows,
      wordingViolationRows: readinessReport.summary.wordingViolationRows,
      blockedRows: readinessReport.summary.blockedRows,
      recommendation: blockers.length ? 'hold_for_local_scanner_ui_refresh_fix' : 'ready_for_local_scanner_ui_refresh',
    },
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeUnifiedDeskOutputLocalScannerUiRefreshProofReport(report: LocalScannerUiRefreshProofReport, outDir: string): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-desk-output-local-scanner-ui-refresh-proof-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-desk-output-local-scanner-ui-refresh-proof-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const readinessPath = path.resolve(options.readinessPath ||
    latestMatchingFile(DEFAULT_REPORT_DIR, /^unified-desk-output-local-live-readiness-\d+\.json$/) ||
    '');
  if (!fs.existsSync(readinessPath)) throw new Error('Missing Unified Desk Output local-live readiness path.');
  const report = buildUnifiedDeskOutputLocalScannerUiRefreshProofReport({
    readinessPath,
    readinessReport: readJson<LocalLiveReadinessReport>(readinessPath),
  });
  const written = writeUnifiedDeskOutputLocalScannerUiRefreshProofReport(report, path.resolve(options.outDir));
  if (options.json) {
    console.log(JSON.stringify({ ...written, status: report.status, summary: report.summary, blockers: report.blockers.slice(0, 20) }, null, 2));
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
