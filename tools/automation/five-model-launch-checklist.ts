import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type ReportStatus = 'pass' | 'blocked';

interface SourceReport {
  reportType?: string;
  status?: string;
  summary?: Record<string, unknown>;
  blockers?: string[];
}

interface FiveModelLaunchChecklistReport {
  reportType: 'five_model_launch_checklist';
  generatedAt: string;
  status: ReportStatus;
  authority: {
    localOnly: true;
    readsDiagnosticArtifactsOnly: true;
    writesDiagnosticArtifactsOnly: true;
    installsRuntimeBehavior: false;
    postsDiscord: false;
    webhookCalls: 0;
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
    activationPath: string;
    scannerReadbackPath: string;
    discordPreviewPath: string;
  };
  summary: {
    activationRows: number;
    scannerReadbackRows: number;
    discordPreviewPayloads: number;
    approvedDeskPlanRows: number;
    formingDeskReadRows: number;
    morningRows: number;
    lunchRows: number;
    eveningRows: number;
    discordPostRows: number;
    webhookCallRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    canExecuteChangedRows: number;
    tradingLogicChangedRows: number;
    automatedOrderRows: number;
    blockedRows: number;
    recommendation: 'ready_for_explicit_discord_rehearsal_decision' | 'hold_for_five_model_launch_checklist_fix';
  };
  launchBoundaries: string[];
  rollbackSteps: string[];
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  activationPath: string | null;
  scannerReadbackPath: string | null;
  discordPreviewPath: string | null;
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
    activationPath: readFlag(args, '--activation'),
    scannerReadbackPath: readFlag(args, '--scanner-readback'),
    discordPreviewPath: readFlag(args, '--discord-preview'),
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

function sideEffectBlockers(label: string, report: SourceReport): string[] {
  return [
    numberValue(report.summary?.discordPostRows) === 0 ? null : `${label} has Discord-post rows.`,
    numberValue(report.summary?.webhookCallRows) === 0 ? null : `${label} has webhook-call rows.`,
    numberValue(report.summary?.supabaseWriteRows) === 0 ? null : `${label} has Supabase-write rows.`,
    numberValue(report.summary?.liveSupabaseReadRows) === 0 ? null : `${label} has live Supabase read rows.`,
    numberValue(report.summary?.liveBridgeReadRows) === 0 ? null : `${label} has live bridge read rows.`,
    numberValue(report.summary?.canExecuteTrueRows) === 0 ? null : `${label} has canExecute=true rows.`,
    numberValue(report.summary?.canExecuteChangedRows) === 0 ? null : `${label} changed canExecute.`,
    numberValue(report.summary?.tradingLogicChangedRows) === 0 ? null : `${label} changed trading logic.`,
    numberValue(report.summary?.automatedOrderRows) === 0 ? null : `${label} has automated-order rows.`,
    ...(report.blockers || []),
  ].filter((item): item is string => Boolean(item));
}

function buildMarkdown(report: Omit<FiveModelLaunchChecklistReport, 'markdown'>): string {
  return [
    '# Five Model Launch Checklist',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: launch checklist only. It reads saved proof artifacts and writes diagnostics. It does not install runtime behavior, call Discord, write Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Summary',
    `- Activation rows: ${report.summary.activationRows}.`,
    `- Scanner readback rows: ${report.summary.scannerReadbackRows}.`,
    `- Discord preview payloads: ${report.summary.discordPreviewPayloads}.`,
    `- Approved Desk Plan rows: ${report.summary.approvedDeskPlanRows}.`,
    `- Forming Desk Read rows: ${report.summary.formingDeskReadRows}.`,
    `- Morning rows: ${report.summary.morningRows}.`,
    `- Lunch rows: ${report.summary.lunchRows}.`,
    `- Evening rows: ${report.summary.eveningRows}.`,
    `- Discord-post rows: ${report.summary.discordPostRows}.`,
    `- Webhook-call rows: ${report.summary.webhookCallRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Trading-logic changed rows: ${report.summary.tradingLogicChangedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Launch Boundaries',
    ...report.launchBoundaries.map((step) => `- ${step}`),
    '',
    '## Rollback',
    ...report.rollbackSteps.map((step) => `- ${step}`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildFiveModelLaunchChecklistReport(args: {
  activationPath: string;
  activation: SourceReport;
  scannerReadbackPath: string;
  scannerReadback: SourceReport;
  discordPreviewPath: string;
  discordPreview: SourceReport;
}, generatedAt = new Date().toISOString()): FiveModelLaunchChecklistReport {
  const activationRows = numberValue(args.activation.summary?.selectedRows);
  const scannerReadbackRows = numberValue(args.scannerReadback.summary?.selectedRows);
  const discordPreviewPayloads = numberValue(args.discordPreview.summary?.previewPayloads);
  const blockers = [
    args.activation.reportType === 'five_model_production_scanner_surface_activation' ? null : 'Activation report type is invalid.',
    args.activation.status === 'active' ? null : `Activation status is ${args.activation.status}.`,
    args.scannerReadback.reportType === 'five_model_production_scanner_readback' ? null : 'Scanner readback report type is invalid.',
    args.scannerReadback.status === 'pass' ? null : `Scanner readback status is ${args.scannerReadback.status}.`,
    args.discordPreview.reportType === 'five_model_discord_dry_run_preview' ? null : 'Discord preview report type is invalid.',
    args.discordPreview.status === 'pass' ? null : `Discord preview status is ${args.discordPreview.status}.`,
    activationRows === 18 ? null : `Activation expected 18 rows and found ${activationRows}.`,
    scannerReadbackRows === 18 ? null : `Scanner readback expected 18 rows and found ${scannerReadbackRows}.`,
    discordPreviewPayloads === 18 ? null : `Discord preview expected 18 payloads and found ${discordPreviewPayloads}.`,
    numberValue(args.activation.summary?.approvedDeskPlanRows) === 5 ? null : 'Activation did not prove 5 Approved Desk Plan rows.',
    numberValue(args.activation.summary?.formingDeskReadRows) === 13 ? null : 'Activation did not prove 13 Forming Desk Read rows.',
    ...sideEffectBlockers('Activation', args.activation),
    ...sideEffectBlockers('Scanner readback', args.scannerReadback),
    ...sideEffectBlockers('Discord preview', args.discordPreview),
  ].filter((item): item is string => Boolean(item));
  const status: ReportStatus = blockers.length ? 'blocked' : 'pass';
  const report: Omit<FiveModelLaunchChecklistReport, 'markdown'> = {
    reportType: 'five_model_launch_checklist',
    generatedAt,
    status,
    authority: {
      localOnly: true,
      readsDiagnosticArtifactsOnly: true,
      writesDiagnosticArtifactsOnly: true,
      installsRuntimeBehavior: false,
      postsDiscord: false,
      webhookCalls: 0,
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
      activationPath: args.activationPath,
      scannerReadbackPath: args.scannerReadbackPath,
      discordPreviewPath: args.discordPreviewPath,
    },
    summary: {
      activationRows: status === 'pass' ? activationRows : 0,
      scannerReadbackRows: status === 'pass' ? scannerReadbackRows : 0,
      discordPreviewPayloads: status === 'pass' ? discordPreviewPayloads : 0,
      approvedDeskPlanRows: status === 'pass' ? numberValue(args.activation.summary?.approvedDeskPlanRows) : 0,
      formingDeskReadRows: status === 'pass' ? numberValue(args.activation.summary?.formingDeskReadRows) : 0,
      morningRows: status === 'pass' ? numberValue(args.activation.summary?.morningRows) : 0,
      lunchRows: status === 'pass' ? numberValue(args.activation.summary?.lunchRows) : 0,
      eveningRows: status === 'pass' ? numberValue(args.activation.summary?.eveningRows) : 0,
      discordPostRows: 0,
      webhookCallRows: 0,
      supabaseWriteRows: 0,
      liveSupabaseReadRows: 0,
      liveBridgeReadRows: 0,
      canExecuteTrueRows: 0,
      canExecuteChangedRows: 0,
      tradingLogicChangedRows: 0,
      automatedOrderRows: 0,
      blockedRows: blockers.length,
      recommendation: status === 'pass' ? 'ready_for_explicit_discord_rehearsal_decision' : 'hold_for_five_model_launch_checklist_fix',
    },
    launchBoundaries: [
      'Real Discord delivery still requires a separate explicit approval and idempotency key.',
      'First live rehearsal must send at most one selected five-model payload.',
      'Supabase, bridge, entry/stop/target math, canExecute, and automated orders remain unchanged.',
    ],
    rollbackSteps: [
      'Remove or replace tools/automation/.five-model-production-scanner-surface.json.',
      'Rerun the scanner readback and confirm selectedRows=0 or surface unavailable.',
      'Do not delete model definitions or historical diagnostic artifacts during rollback.',
    ],
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeFiveModelLaunchChecklistReport(
  report: FiveModelLaunchChecklistReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `five-model-launch-checklist-${stamp}.json`);
  const markdownPath = path.join(outDir, `five-model-launch-checklist-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const outDir = path.resolve(options.outDir);
  const activationPath = path.resolve(options.activationPath ||
    latestReportByType(outDir, 'five_model_production_scanner_surface_activation') ||
    '');
  const scannerReadbackPath = path.resolve(options.scannerReadbackPath ||
    latestReportByType(outDir, 'five_model_production_scanner_readback') ||
    '');
  const discordPreviewPath = path.resolve(options.discordPreviewPath ||
    latestReportByType(outDir, 'five_model_discord_dry_run_preview') ||
    '');
  for (const filePath of [activationPath, scannerReadbackPath, discordPreviewPath]) {
    if (!fs.existsSync(filePath)) throw new Error(`Missing launch checklist source artifact: ${filePath}`);
  }
  const report = buildFiveModelLaunchChecklistReport({
    activationPath,
    activation: readJson<SourceReport>(activationPath),
    scannerReadbackPath,
    scannerReadback: readJson<SourceReport>(scannerReadbackPath),
    discordPreviewPath,
    discordPreview: readJson<SourceReport>(discordPreviewPath),
  });
  const written = writeFiveModelLaunchChecklistReport(report, outDir);
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
