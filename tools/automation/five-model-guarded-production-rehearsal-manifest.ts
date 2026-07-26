import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

type ReportStatus = 'pass' | 'blocked';

interface SurfacePreviewReport {
  reportType?: string;
  status?: ReportStatus;
  summary?: Record<string, unknown>;
  surface?: {
    rows?: Array<{
      cardId: string;
      date: string;
      session: 'morning' | 'lunch' | 'evening';
      stateLabel: 'Approved Desk Plan' | 'Forming Desk Read';
      model: string;
      direction: 'LONG' | 'SHORT';
      levelLine: string;
      proofLine: string;
      publishDiscord: false;
      writesSupabase: false;
      readsLiveBridge: false;
      canExecute: false;
    }>;
  };
  blockers?: string[];
}

interface ManifestRow {
  manifestRowId: string;
  sourceCardId: string;
  date: string;
  session: 'morning' | 'lunch' | 'evening';
  stateLabel: 'Approved Desk Plan' | 'Forming Desk Read';
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
  reportType: 'five_model_guarded_production_rehearsal_manifest';
  generatedAt: string;
  status: ReportStatus;
  authority: {
    localOnly: true;
    readsSavedSurfacePreviewOnly: true;
    writesDiagnosticArtifactsOnly: true;
    rehearsalManifestOnly: true;
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
    surfacePreviewPath: string;
  };
  rehearsal: {
    manifestId: string;
    idempotencySeed: string;
    rollbackPlan: 'disable_five_model_scanner_visibility_gate_and_revert_to_previous_scanner_surface';
    requiredNextApproval: 'explicit_guarded_production_rehearsal_execution';
    allowedNextAction: 'one_local_production_rehearsal_execution_dry_run';
    disallowedWithoutSeparateApproval: string[];
  };
  summary: {
    sourceSurfaceRows: number;
    manifestRows: number;
    approvedDeskPlanRows: number;
    formingDeskReadRows: number;
    morningRows: number;
    lunchRows: number;
    eveningRows: number;
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
    recommendation: 'ready_for_guarded_production_rehearsal_execution_dry_run' | 'hold_for_five_model_rehearsal_manifest_fix';
  };
  manifestRows: ManifestRow[];
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  surfacePreviewPath: string | null;
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
    surfacePreviewPath: readFlag(args, '--surface-preview'),
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

function manifestRow(row: NonNullable<SurfacePreviewReport['surface']>['rows'][number]): ManifestRow {
  return {
    manifestRowId: `five-model-production-rehearsal|${hash(row.cardId)}`,
    sourceCardId: row.cardId,
    date: row.date,
    session: row.session,
    stateLabel: row.stateLabel,
    model: row.model,
    direction: row.direction,
    levelLine: row.levelLine,
    proofLine: row.proofLine,
    productionScannerVisibilityRehearsalOnly: true,
    scannerVisibilityMayBeEnabledOnlyBySeparateGate: true,
    discordRequiresSeparateApproval: true,
    supabaseRequiresSeparateApproval: true,
    bridgeReadsRemainDisabled: true,
    canExecuteRemainsUnchanged: true,
    automatedOrdersRemainDisabled: true,
  };
}

function buildMarkdown(report: Omit<ManifestReport, 'markdown'>): string {
  return [
    '# Five Model Guarded Production Rehearsal Manifest',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local rehearsal manifest only. It reads the saved local scanner surface preview and writes diagnostics. It does not install runtime behavior, expose production scanner rows, post Discord, write Supabase, read live Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Rehearsal',
    `- Manifest id: ${report.rehearsal.manifestId}.`,
    `- Idempotency seed: ${report.rehearsal.idempotencySeed}.`,
    `- Required next approval: ${report.rehearsal.requiredNextApproval}.`,
    `- Rollback plan: ${report.rehearsal.rollbackPlan}.`,
    '',
    '## Summary',
    `- Source surface rows: ${report.summary.sourceSurfaceRows}.`,
    `- Manifest rows: ${report.summary.manifestRows}.`,
    `- Approved Desk Plan rows: ${report.summary.approvedDeskPlanRows}.`,
    `- Forming Desk Read rows: ${report.summary.formingDeskReadRows}.`,
    `- Morning rows: ${report.summary.morningRows}.`,
    `- Lunch rows: ${report.summary.lunchRows}.`,
    `- Evening rows: ${report.summary.eveningRows}.`,
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
    '## Manifest Rows',
    '| Date | Session | State | Model | Direction | Levels | Proof |',
    '|---|---|---|---|---|---|---|',
    ...report.manifestRows.slice(0, 40).map((row) => `| ${row.date} | ${row.session} | ${row.stateLabel} | ${row.model} | ${row.direction} | ${row.levelLine} | ${row.proofLine} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildFiveModelGuardedProductionRehearsalManifestReport(args: {
  surfacePreviewPath: string;
  surfacePreview: SurfacePreviewReport;
}, generatedAt = new Date().toISOString()): ManifestReport {
  const rows = args.surfacePreview.surface?.rows || [];
  const manifestRows = rows.map(manifestRow);
  const idempotencySeed = hash(`${args.surfacePreviewPath}|${manifestRows.map((row) => row.manifestRowId).join('|')}`);
  const blockers = [
    args.surfacePreview.reportType === 'five_model_local_scanner_visibility_surface_preview' ? null : 'Surface preview report type is invalid.',
    args.surfacePreview.status === 'pass' ? null : 'Surface preview is not pass.',
    rows.length === numberValue(args.surfacePreview.summary?.surfaceRows) ? null : 'Surface rows do not match surface preview summary.',
    rows.length > 0 ? null : 'No surface rows are available for rehearsal manifest.',
    numberValue(args.surfacePreview.summary?.productionScannerVisibleNowRows) === 0 ? null : 'Surface preview has production scanner-visible rows.',
    numberValue(args.surfacePreview.summary?.discordPostRows) === 0 ? null : 'Surface preview has Discord-post rows.',
    numberValue(args.surfacePreview.summary?.supabaseWriteRows) === 0 ? null : 'Surface preview has Supabase-write rows.',
    numberValue(args.surfacePreview.summary?.liveSupabaseReadRows) === 0 ? null : 'Surface preview has live Supabase read rows.',
    numberValue(args.surfacePreview.summary?.liveBridgeReadRows) === 0 ? null : 'Surface preview has live bridge read rows.',
    numberValue(args.surfacePreview.summary?.canExecuteTrueRows) === 0 ? null : 'Surface preview has canExecute=true rows.',
    numberValue(args.surfacePreview.summary?.tradingLogicChangedRows) === 0 ? null : 'Surface preview changed trading logic.',
    numberValue(args.surfacePreview.summary?.canExecuteChangedRows) === 0 ? null : 'Surface preview changed canExecute.',
    numberValue(args.surfacePreview.summary?.automatedOrderRows) === 0 ? null : 'Surface preview has automated-order rows.',
    ...rows.flatMap((row) => [
      row.publishDiscord === false ? null : `${row.cardId} would post Discord.`,
      row.writesSupabase === false ? null : `${row.cardId} would write Supabase.`,
      row.readsLiveBridge === false ? null : `${row.cardId} would read live bridge.`,
      row.canExecute === false ? null : `${row.cardId} has canExecute=true.`,
    ]),
    ...(args.surfacePreview.blockers || []),
  ].filter((item): item is string => Boolean(item));
  const visibleRows = blockers.length ? [] : manifestRows;
  const status: ReportStatus = blockers.length ? 'blocked' : 'pass';
  const report: Omit<ManifestReport, 'markdown'> = {
    reportType: 'five_model_guarded_production_rehearsal_manifest',
    generatedAt,
    status,
    authority: {
      localOnly: true,
      readsSavedSurfacePreviewOnly: true,
      writesDiagnosticArtifactsOnly: true,
      rehearsalManifestOnly: true,
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
      surfacePreviewPath: args.surfacePreviewPath,
    },
    rehearsal: {
      manifestId: `five-model-rehearsal-${idempotencySeed}`,
      idempotencySeed,
      rollbackPlan: 'disable_five_model_scanner_visibility_gate_and_revert_to_previous_scanner_surface',
      requiredNextApproval: 'explicit_guarded_production_rehearsal_execution',
      allowedNextAction: 'one_local_production_rehearsal_execution_dry_run',
      disallowedWithoutSeparateApproval: [
        'Discord posting',
        'Supabase writes',
        'live bridge reads',
        'canExecute changes',
        'automated execution',
      ],
    },
    summary: {
      sourceSurfaceRows: rows.length,
      manifestRows: visibleRows.length,
      approvedDeskPlanRows: visibleRows.filter((row) => row.stateLabel === 'Approved Desk Plan').length,
      formingDeskReadRows: visibleRows.filter((row) => row.stateLabel === 'Forming Desk Read').length,
      morningRows: visibleRows.filter((row) => row.session === 'morning').length,
      lunchRows: visibleRows.filter((row) => row.session === 'lunch').length,
      eveningRows: visibleRows.filter((row) => row.session === 'evening').length,
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
        ? 'ready_for_guarded_production_rehearsal_execution_dry_run'
        : 'hold_for_five_model_rehearsal_manifest_fix',
    },
    manifestRows: visibleRows,
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeFiveModelGuardedProductionRehearsalManifestReport(
  report: ManifestReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `five-model-guarded-production-rehearsal-manifest-${stamp}.json`);
  const markdownPath = path.join(outDir, `five-model-guarded-production-rehearsal-manifest-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const outDir = path.resolve(options.outDir);
  const surfacePreviewPath = path.resolve(options.surfacePreviewPath ||
    latestReportByType(outDir, 'five_model_local_scanner_visibility_surface_preview') ||
    '');
  if (!fs.existsSync(surfacePreviewPath)) throw new Error(`Missing five-model local scanner surface preview artifact: ${surfacePreviewPath}`);
  const report = buildFiveModelGuardedProductionRehearsalManifestReport({
    surfacePreviewPath,
    surfacePreview: readJson<SurfacePreviewReport>(surfacePreviewPath),
  });
  const written = writeFiveModelGuardedProductionRehearsalManifestReport(report, outDir);
  if (options.json) {
    console.log(JSON.stringify({
      ...written,
      status: report.status,
      summary: report.summary,
      rehearsal: report.rehearsal,
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
