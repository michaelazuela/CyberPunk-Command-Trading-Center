import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type ReportStatus = 'pass' | 'blocked';
type DeskSession = 'morning' | 'lunch' | 'evening';
type DeskStateLabel = 'Approved Desk Plan' | 'Forming Desk Read';
type Direction = 'LONG' | 'SHORT';

interface RefreshUiRow {
  cardId: string;
  date: string;
  session: DeskSession;
  stateLabel: DeskStateLabel;
  model: string;
  direction: Direction;
  levelLine: string;
  proofLine: string;
  authorityLine: string;
}

interface RefreshPreviewReport {
  reportType?: string;
  status?: ReportStatus;
  authority?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  uiRows?: RefreshUiRow[];
  blockers?: string[];
}

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
  localOnly: true;
  runtimeGateEnabled: false;
  productionGoLiveApproved: false;
  scannerRuntimeWired: false;
  scannerVisibleNow: false;
  publishDiscord: false;
  writesSupabase: false;
  readsLiveSupabase: false;
  readsLiveBridge: false;
  changesScannerBehavior: false;
  changesTradingLogic: false;
  changesCanExecute: false;
  canExecute: false;
  automatedOrders: false;
}

interface FiveModelDisabledScannerUiAdapterPreviewReport {
  reportType: 'five_model_disabled_scanner_ui_adapter_preview';
  generatedAt: string;
  status: ReportStatus;
  authority: {
    localOnly: true;
    readsSavedUiRefreshOnly: true;
    writesDiagnosticArtifactsOnly: true;
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
    uiRefreshPreviewPath: string;
  };
  summary: {
    sourceUiRows: number;
    adaptedRows: number;
    approvedDeskPlanRows: number;
    formingDeskReadRows: number;
    morningRows: number;
    lunchRows: number;
    eveningRows: number;
    runtimeGateEnabled: false;
    productionGoLiveApproved: false;
    scannerRuntimeWiredRows: number;
    scannerVisibleRows: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    tradingLogicChangedRows: number;
    automatedOrderRows: number;
    blockedRows: number;
    recommendation: 'ready_for_disabled_scanner_ui_browser_adapter_preview' | 'hold_for_five_model_ui_adapter_fix';
  };
  adapterRows: AdapterRow[];
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  uiRefreshPath: string | null;
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
    uiRefreshPath: readFlag(args, '--ui-refresh'),
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
        return readJson<RefreshPreviewReport>(filePath).reportType === reportType;
      } catch {
        return false;
      }
    }) || null;
}

function numberValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function booleanValue(value: unknown): boolean {
  return typeof value === 'boolean' ? value : false;
}

function hasBlockedWording(row: AdapterRow): boolean {
  return Object.values(row.display).some((value) => /human[- ]review|no chase|missed|no[- ]trade/i.test(value));
}

function toAdapterRows(rows: RefreshUiRow[]): AdapterRow[] {
  return rows.map((row) => ({
    adapterId: `five-model-ui-adapter|${row.cardId}`,
    sourceCardId: row.cardId,
    date: row.date,
    session: row.session,
    stateLabel: row.stateLabel,
    model: row.model,
    direction: row.direction,
    display: {
      headline: `${row.stateLabel} | ${row.session.toUpperCase()} | ${row.direction} | ${row.model}`,
      levelLine: row.levelLine,
      proofLine: row.proofLine,
      authorityLine: row.authorityLine,
    },
    localOnly: true,
    runtimeGateEnabled: false,
    productionGoLiveApproved: false,
    scannerRuntimeWired: false,
    scannerVisibleNow: false,
    publishDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    changesScannerBehavior: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    canExecute: false,
    automatedOrders: false,
  }));
}

function buildMarkdown(report: Omit<FiveModelDisabledScannerUiAdapterPreviewReport, 'markdown'>): string {
  return [
    '# Five Model Disabled Scanner UI Adapter Preview',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: disabled local scanner UI adapter preview only. It reads the saved five-model UI refresh artifact and writes diagnostics. It does not enable runtime behavior, expose scanner-visible rows, post Discord, write Supabase, read live Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Summary',
    `- Source UI rows: ${report.summary.sourceUiRows}.`,
    `- Adapted rows: ${report.summary.adaptedRows}.`,
    `- Approved Desk Plan rows: ${report.summary.approvedDeskPlanRows}.`,
    `- Forming Desk Read rows: ${report.summary.formingDeskReadRows}.`,
    `- Morning rows: ${report.summary.morningRows}.`,
    `- Lunch rows: ${report.summary.lunchRows}.`,
    `- Evening rows: ${report.summary.eveningRows}.`,
    `- Runtime gate enabled: ${report.summary.runtimeGateEnabled}.`,
    `- Production go-live approved: ${report.summary.productionGoLiveApproved}.`,
    `- Scanner-runtime wired rows: ${report.summary.scannerRuntimeWiredRows}.`,
    `- Scanner-visible rows: ${report.summary.scannerVisibleRows}.`,
    `- Discord-post rows: ${report.summary.discordPostRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-Supabase-read rows: ${report.summary.liveSupabaseReadRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Trading-logic changed rows: ${report.summary.tradingLogicChangedRows}.`,
    `- Automated-order rows: ${report.summary.automatedOrderRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Adapter Rows',
    '| Date | Session | State | Model | Direction | Scanner Visible | Discord | Supabase |',
    '|---|---|---|---|---|---|---|---|',
    ...report.adapterRows.slice(0, 40).map((row) => `| ${row.date} | ${row.session} | ${row.stateLabel} | ${row.model} | ${row.direction} | ${row.scannerVisibleNow} | ${row.publishDiscord} | ${row.writesSupabase} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildFiveModelDisabledScannerUiAdapterPreviewReport(args: {
  uiRefreshPreviewPath: string;
  uiRefreshPreview: RefreshPreviewReport;
}, generatedAt = new Date().toISOString()): FiveModelDisabledScannerUiAdapterPreviewReport {
  const sourceRows = args.uiRefreshPreview.uiRows || [];
  const expectedRows = numberValue(args.uiRefreshPreview.summary?.uiRows);
  const adapterRows = toAdapterRows(sourceRows);
  const blockers = [
    args.uiRefreshPreview.reportType === 'five_model_disabled_scanner_ui_refresh_preview' ? null : 'UI refresh report type is invalid.',
    args.uiRefreshPreview.status === 'pass' ? null : 'UI refresh report is not pass.',
    booleanValue(args.uiRefreshPreview.summary?.scannerUiRefreshAllowed) ? null : 'Scanner UI refresh was not allowed.',
    booleanValue(args.uiRefreshPreview.summary?.defaultDisabled) ? null : 'UI refresh default-disabled flag is not true.',
    args.uiRefreshPreview.summary?.localPreviewStatus === 'ready' ? null : 'UI refresh local preview is not ready.',
    sourceRows.length === expectedRows ? null : `Adapter source rows ${sourceRows.length} do not match reported UI rows ${expectedRows}.`,
    sourceRows.length > 0 ? null : 'No UI rows are available to adapt.',
    numberValue(args.uiRefreshPreview.summary?.runtimeGateEnabled) === 0 ? null : 'UI refresh runtime gate is enabled.',
    numberValue(args.uiRefreshPreview.summary?.scannerRuntimeChangedRows) === 0 ? null : 'UI refresh changed scanner runtime.',
    numberValue(args.uiRefreshPreview.summary?.discordPostRows) === 0 ? null : 'UI refresh has Discord post rows.',
    numberValue(args.uiRefreshPreview.summary?.supabaseWriteRows) === 0 ? null : 'UI refresh has Supabase write rows.',
    numberValue(args.uiRefreshPreview.summary?.liveBridgeReadRows) === 0 ? null : 'UI refresh has live bridge read rows.',
    numberValue(args.uiRefreshPreview.summary?.canExecuteTrueRows) === 0 ? null : 'UI refresh has canExecute=true rows.',
    numberValue(args.uiRefreshPreview.summary?.tradingLogicChangedRows) === 0 ? null : 'UI refresh changed trading logic.',
    numberValue(args.uiRefreshPreview.summary?.automatedOrderRows) === 0 ? null : 'UI refresh includes automated orders.',
    adapterRows.filter((row) => row.scannerRuntimeWired).length === 0 ? null : 'Adapter rows would wire scanner runtime.',
    adapterRows.filter((row) => row.scannerVisibleNow).length === 0 ? null : 'Adapter rows would expose scanner-visible output.',
    adapterRows.filter((row) => row.publishDiscord).length === 0 ? null : 'Adapter rows would post Discord.',
    adapterRows.filter((row) => row.writesSupabase).length === 0 ? null : 'Adapter rows would write Supabase.',
    adapterRows.filter((row) => row.readsLiveSupabase).length === 0 ? null : 'Adapter rows would read live Supabase.',
    adapterRows.filter((row) => row.readsLiveBridge).length === 0 ? null : 'Adapter rows would read live bridge.',
    adapterRows.filter((row) => row.canExecute).length === 0 ? null : 'Adapter rows include canExecute=true.',
    adapterRows.filter((row) => row.changesTradingLogic).length === 0 ? null : 'Adapter rows would change trading logic.',
    adapterRows.filter((row) => row.automatedOrders).length === 0 ? null : 'Adapter rows include automated orders.',
    adapterRows.filter(hasBlockedWording).length === 0 ? null : 'Adapter display text contains blocked status wording.',
    ...(args.uiRefreshPreview.blockers || []),
  ].filter((item): item is string => Boolean(item));
  const status: ReportStatus = blockers.length ? 'blocked' : 'pass';
  const visibleRows = blockers.length ? [] : adapterRows;
  const report: Omit<FiveModelDisabledScannerUiAdapterPreviewReport, 'markdown'> = {
    reportType: 'five_model_disabled_scanner_ui_adapter_preview',
    generatedAt,
    status,
    authority: {
      localOnly: true,
      readsSavedUiRefreshOnly: true,
      writesDiagnosticArtifactsOnly: true,
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
      uiRefreshPreviewPath: args.uiRefreshPreviewPath,
    },
    summary: {
      sourceUiRows: sourceRows.length,
      adaptedRows: visibleRows.length,
      approvedDeskPlanRows: visibleRows.filter((row) => row.stateLabel === 'Approved Desk Plan').length,
      formingDeskReadRows: visibleRows.filter((row) => row.stateLabel === 'Forming Desk Read').length,
      morningRows: visibleRows.filter((row) => row.session === 'morning').length,
      lunchRows: visibleRows.filter((row) => row.session === 'lunch').length,
      eveningRows: visibleRows.filter((row) => row.session === 'evening').length,
      runtimeGateEnabled: false,
      productionGoLiveApproved: false,
      scannerRuntimeWiredRows: visibleRows.filter((row) => row.scannerRuntimeWired).length,
      scannerVisibleRows: visibleRows.filter((row) => row.scannerVisibleNow).length,
      discordPostRows: visibleRows.filter((row) => row.publishDiscord).length,
      supabaseWriteRows: visibleRows.filter((row) => row.writesSupabase).length,
      liveSupabaseReadRows: visibleRows.filter((row) => row.readsLiveSupabase).length,
      liveBridgeReadRows: visibleRows.filter((row) => row.readsLiveBridge).length,
      canExecuteTrueRows: visibleRows.filter((row) => row.canExecute).length,
      tradingLogicChangedRows: visibleRows.filter((row) => row.changesTradingLogic).length,
      automatedOrderRows: visibleRows.filter((row) => row.automatedOrders).length,
      blockedRows: blockers.length,
      recommendation: status === 'pass'
        ? 'ready_for_disabled_scanner_ui_browser_adapter_preview'
        : 'hold_for_five_model_ui_adapter_fix',
    },
    adapterRows: visibleRows,
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeFiveModelDisabledScannerUiAdapterPreviewReport(
  report: FiveModelDisabledScannerUiAdapterPreviewReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `five-model-disabled-scanner-ui-adapter-preview-${stamp}.json`);
  const markdownPath = path.join(outDir, `five-model-disabled-scanner-ui-adapter-preview-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const outDir = path.resolve(options.outDir);
  const uiRefreshPath = path.resolve(options.uiRefreshPath ||
    latestReportByType(outDir, 'five_model_disabled_scanner_ui_refresh_preview') ||
    '');
  if (!fs.existsSync(uiRefreshPath)) throw new Error(`Missing five-model UI refresh artifact: ${uiRefreshPath}`);
  const report = buildFiveModelDisabledScannerUiAdapterPreviewReport({
    uiRefreshPreviewPath: uiRefreshPath,
    uiRefreshPreview: readJson<RefreshPreviewReport>(uiRefreshPath),
  });
  const written = writeFiveModelDisabledScannerUiAdapterPreviewReport(report, outDir);
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
