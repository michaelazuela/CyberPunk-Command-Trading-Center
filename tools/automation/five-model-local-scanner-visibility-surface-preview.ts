import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type {
  UnifiedDeskOutputScannerSurfaceModel,
  UnifiedDeskOutputScannerSurfaceRow,
} from '../../src/lib/unifiedDeskOutputScannerSurface';

type ReportStatus = 'pass' | 'blocked';

interface WiringPreviewRow {
  wiringId: string;
  contractId: string;
  date: string;
  session: 'morning' | 'lunch' | 'evening';
  stateLabel: 'Approved Desk Plan' | 'Forming Desk Read';
  model: string;
  direction: 'LONG' | 'SHORT';
  headline: string;
  levelLine: string;
  proofLine: string;
  scannerVisibleIfWiredAfterExplicitApproval: true;
  productionScannerVisibleNow: false;
  publishDiscord: false;
  writesSupabase: false;
  readsLiveSupabase: false;
  readsLiveBridge: false;
  canExecute: false;
  changesTradingLogic: false;
  changesCanExecute: false;
  automatedOrders: false;
}

interface WiringPreviewReport {
  reportType?: string;
  status?: ReportStatus;
  summary?: Record<string, unknown>;
  rows?: WiringPreviewRow[];
  blockers?: string[];
}

interface SurfacePreviewReport {
  reportType: 'five_model_local_scanner_visibility_surface_preview';
  generatedAt: string;
  status: ReportStatus;
  authority: {
    localOnly: true;
    readsSavedWiringPreviewOnly: true;
    writesDiagnosticArtifactsOnly: true;
    localScannerSurfaceOnly: true;
    installsRuntimeAdapter: false;
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
    wiringPreviewPath: string;
  };
  summary: {
    wiringPreviewRows: number;
    surfaceRows: number;
    approvedDeskPlanRows: number;
    formingDeskReadRows: number;
    morningRows: number;
    lunchRows: number;
    eveningRows: number;
    localScannerSurfaceRows: number;
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
    recommendation: 'ready_for_guarded_production_rehearsal_manifest' | 'hold_for_five_model_surface_preview_fix';
  };
  surface: UnifiedDeskOutputScannerSurfaceModel;
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  wiringPreviewPath: string | null;
  outDir: string;
  json: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const BLOCKED_WORDING = /human[- ]review|no chase|missed|no[- ]trade/i;

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function parseArgs(args = process.argv.slice(2)): CliOptions {
  return {
    wiringPreviewPath: readFlag(args, '--wiring-preview'),
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

function stateFromLabel(label: WiringPreviewRow['stateLabel']): UnifiedDeskOutputScannerSurfaceRow['state'] {
  return label === 'Approved Desk Plan' ? 'APPROVED_DESK_PLAN' : 'FORMING_DESK_READ';
}

function surfaceRow(row: WiringPreviewRow): UnifiedDeskOutputScannerSurfaceRow {
  return {
    cardId: row.wiringId,
    date: row.date,
    session: row.session,
    state: stateFromLabel(row.stateLabel),
    stateLabel: row.stateLabel,
    model: row.model,
    direction: row.direction,
    headline: row.headline,
    bodyLines: [
      `${row.session} ${row.direction.toLowerCase()} desk plan from the five-model scanner visibility wiring preview.`,
      'Local scanner surface preview only; production scanner visibility still requires the guarded rehearsal path.',
    ],
    levelLine: row.levelLine,
    riskLine: 'Risk remains from the saved scanner-owned entry/stop line.',
    proofLine: row.proofLine,
    invalidationLine: 'Invalidation remains the saved protected 5M stop line from the five-model adapter contract.',
    authorityLine: 'Decision support only. Discord/Supabase/bridge/canExecute remain off in this surface.',
    scannerVisibleNow: true,
    publishDiscord: false,
    writesSupabase: false,
    readsLiveBridge: false,
    canExecute: false,
  };
}

function rowText(row: UnifiedDeskOutputScannerSurfaceRow): string {
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

function surfaceFromRows(rows: UnifiedDeskOutputScannerSurfaceRow[]): UnifiedDeskOutputScannerSurfaceModel {
  const wordingViolationRows = rows.filter((row) => BLOCKED_WORDING.test(rowText(row))).length;
  const blockers = [
    rows.length > 0 ? null : 'Surface preview has no rows.',
    rows.every((row) => row.publishDiscord === false) ? null : 'Surface preview rows would post Discord.',
    rows.every((row) => row.writesSupabase === false) ? null : 'Surface preview rows would write Supabase.',
    rows.every((row) => row.readsLiveBridge === false) ? null : 'Surface preview rows would read live bridge.',
    rows.every((row) => row.canExecute === false) ? null : 'Surface preview rows include canExecute=true.',
    wordingViolationRows === 0 ? null : 'Surface preview rows contain blocked wording.',
  ].filter((item): item is string => Boolean(item));
  return {
    status: blockers.length ? 'blocked' : 'ready',
    sourceOfTruth: 'scanner_surface_unified_desk_output_consumer',
    localScannerOnly: true,
    rows: blockers.length ? [] : rows,
    summary: {
      rows: blockers.length ? 0 : rows.length,
      approvedDeskPlans: blockers.length ? 0 : rows.filter((row) => row.state === 'APPROVED_DESK_PLAN').length,
      formingDeskReads: blockers.length ? 0 : rows.filter((row) => row.state === 'FORMING_DESK_READ').length,
      discordPostRows: rows.filter((row) => row.publishDiscord).length,
      supabaseWriteRows: rows.filter((row) => row.writesSupabase).length,
      liveBridgeReadRows: rows.filter((row) => row.readsLiveBridge).length,
      canExecuteTrueRows: rows.filter((row) => row.canExecute).length,
      wordingViolationRows,
    },
    blockers,
  };
}

function buildMarkdown(report: Omit<SurfacePreviewReport, 'markdown'>): string {
  return [
    '# Five Model Local Scanner Visibility Surface Preview',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local scanner surface preview only. It converts the saved wiring preview rows into the scanner surface shape and writes diagnostics. It does not install runtime behavior, expose production scanner rows, post Discord, write Supabase, read live Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Summary',
    `- Wiring preview rows: ${report.summary.wiringPreviewRows}.`,
    `- Surface rows: ${report.summary.surfaceRows}.`,
    `- Approved Desk Plan rows: ${report.summary.approvedDeskPlanRows}.`,
    `- Forming Desk Read rows: ${report.summary.formingDeskReadRows}.`,
    `- Morning rows: ${report.summary.morningRows}.`,
    `- Lunch rows: ${report.summary.lunchRows}.`,
    `- Evening rows: ${report.summary.eveningRows}.`,
    `- Local scanner surface rows: ${report.summary.localScannerSurfaceRows}.`,
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
    '## Surface Rows',
    '| Date | Session | State | Model | Direction | Levels | Proof |',
    '|---|---|---|---|---|---|---|',
    ...report.surface.rows.slice(0, 40).map((row) => `| ${row.date} | ${row.session} | ${row.stateLabel} | ${row.model} | ${row.direction} | ${row.levelLine} | ${row.proofLine} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildFiveModelLocalScannerVisibilitySurfacePreviewReport(args: {
  wiringPreviewPath: string;
  wiringPreview: WiringPreviewReport;
}, generatedAt = new Date().toISOString()): SurfacePreviewReport {
  const wiringRows = args.wiringPreview.rows || [];
  const surfaceRows = wiringRows.map(surfaceRow);
  const surface = surfaceFromRows(surfaceRows);
  const blockers = [
    args.wiringPreview.reportType === 'five_model_scanner_visibility_wiring_preview' ? null : 'Wiring preview report type is invalid.',
    args.wiringPreview.status === 'pass' ? null : 'Wiring preview is not pass.',
    wiringRows.length === numberValue(args.wiringPreview.summary?.wiringPreviewRows) ? null : 'Wiring rows do not match wiring summary.',
    wiringRows.length > 0 ? null : 'No wiring rows are available for surface preview.',
    numberValue(args.wiringPreview.summary?.productionScannerVisibleNowRows) === 0 ? null : 'Wiring preview has production scanner-visible rows.',
    numberValue(args.wiringPreview.summary?.discordPostRows) === 0 ? null : 'Wiring preview has Discord-post rows.',
    numberValue(args.wiringPreview.summary?.supabaseWriteRows) === 0 ? null : 'Wiring preview has Supabase-write rows.',
    numberValue(args.wiringPreview.summary?.liveSupabaseReadRows) === 0 ? null : 'Wiring preview has live Supabase read rows.',
    numberValue(args.wiringPreview.summary?.liveBridgeReadRows) === 0 ? null : 'Wiring preview has live bridge read rows.',
    numberValue(args.wiringPreview.summary?.canExecuteTrueRows) === 0 ? null : 'Wiring preview has canExecute=true rows.',
    numberValue(args.wiringPreview.summary?.tradingLogicChangedRows) === 0 ? null : 'Wiring preview changed trading logic.',
    numberValue(args.wiringPreview.summary?.canExecuteChangedRows) === 0 ? null : 'Wiring preview changed canExecute.',
    numberValue(args.wiringPreview.summary?.automatedOrderRows) === 0 ? null : 'Wiring preview has automated-order rows.',
    surface.status === 'ready' ? null : 'Scanner surface model is blocked.',
    ...surface.blockers,
    ...(args.wiringPreview.blockers || []),
  ].filter((item): item is string => Boolean(item));
  const readySurface = blockers.length ? { ...surface, rows: [], summary: { ...surface.summary, rows: 0, approvedDeskPlans: 0, formingDeskReads: 0 } } : surface;
  const status: ReportStatus = blockers.length ? 'blocked' : 'pass';
  const report: Omit<SurfacePreviewReport, 'markdown'> = {
    reportType: 'five_model_local_scanner_visibility_surface_preview',
    generatedAt,
    status,
    authority: {
      localOnly: true,
      readsSavedWiringPreviewOnly: true,
      writesDiagnosticArtifactsOnly: true,
      localScannerSurfaceOnly: true,
      installsRuntimeAdapter: false,
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
      wiringPreviewPath: args.wiringPreviewPath,
    },
    summary: {
      wiringPreviewRows: wiringRows.length,
      surfaceRows: readySurface.summary.rows,
      approvedDeskPlanRows: readySurface.summary.approvedDeskPlans,
      formingDeskReadRows: readySurface.summary.formingDeskReads,
      morningRows: readySurface.rows.filter((row) => row.session === 'morning').length,
      lunchRows: readySurface.rows.filter((row) => row.session === 'lunch').length,
      eveningRows: readySurface.rows.filter((row) => row.session === 'evening').length,
      localScannerSurfaceRows: readySurface.rows.length,
      productionScannerVisibleNowRows: 0,
      discordPostRows: readySurface.summary.discordPostRows,
      supabaseWriteRows: readySurface.summary.supabaseWriteRows,
      liveSupabaseReadRows: 0,
      liveBridgeReadRows: readySurface.summary.liveBridgeReadRows,
      canExecuteTrueRows: readySurface.summary.canExecuteTrueRows,
      tradingLogicChangedRows: 0,
      canExecuteChangedRows: 0,
      automatedOrderRows: 0,
      wordingViolationRows: readySurface.summary.wordingViolationRows,
      blockedRows: blockers.length,
      recommendation: status === 'pass'
        ? 'ready_for_guarded_production_rehearsal_manifest'
        : 'hold_for_five_model_surface_preview_fix',
    },
    surface: readySurface,
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeFiveModelLocalScannerVisibilitySurfacePreviewReport(
  report: SurfacePreviewReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `five-model-local-scanner-visibility-surface-preview-${stamp}.json`);
  const markdownPath = path.join(outDir, `five-model-local-scanner-visibility-surface-preview-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const outDir = path.resolve(options.outDir);
  const wiringPreviewPath = path.resolve(options.wiringPreviewPath ||
    latestReportByType(outDir, 'five_model_scanner_visibility_wiring_preview') ||
    '');
  if (!fs.existsSync(wiringPreviewPath)) throw new Error(`Missing five-model scanner visibility wiring preview artifact: ${wiringPreviewPath}`);
  const report = buildFiveModelLocalScannerVisibilitySurfacePreviewReport({
    wiringPreviewPath,
    wiringPreview: readJson<WiringPreviewReport>(wiringPreviewPath),
  });
  const written = writeFiveModelLocalScannerVisibilitySurfacePreviewReport(report, outDir);
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
