import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readRuntimeJson } from '../runtimeJson';
import type { FiveModelProductionScannerSurfaceActivation } from '../../src/lib/fiveModelProductionScannerSurface';
import type { UnifiedDeskOutputScannerSurfaceRow } from '../../src/lib/unifiedDeskOutputScannerSurface';

type ReportStatus = 'pass' | 'blocked';

interface FiveModelDiscordDryRunPreviewPayload {
  username: 'Quant Desk';
  content: string;
  embeds: Array<{
    title: string;
    description: string;
    color: number;
    fields: Array<{ name: string; value: string; inline: boolean }>;
    footer: { text: string };
  }>;
}

interface FiveModelDiscordDryRunPreviewReport {
  reportType: 'five_model_discord_dry_run_preview';
  generatedAt: string;
  status: ReportStatus;
  authority: {
    localOnly: true;
    readsRuntimeSurfaceOnly: true;
    writesDiagnosticArtifactsOnly: true;
    dryRunOnly: true;
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
    runtimeSurfacePath: string;
  };
  summary: {
    sourceRows: number;
    previewPayloads: number;
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
    recommendation: 'ready_for_visual_or_text_signoff' | 'hold_for_five_model_discord_preview_fix';
  };
  payloads: FiveModelDiscordDryRunPreviewPayload[];
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  runtimeSurfacePath: string;
  outDir: string;
  json: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_RUNTIME_SURFACE = path.join(__dirname, '.five-model-production-scanner-surface.json');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function parseArgs(args = process.argv.slice(2)): CliOptions {
  return {
    runtimeSurfacePath: readFlag(args, '--runtime-surface') || DEFAULT_RUNTIME_SURFACE,
    outDir: readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR,
    json: args.includes('--json'),
  };
}

function compact(value: string, max = 900): string {
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 3)}...`;
}

function payloadForRow(row: UnifiedDeskOutputScannerSurfaceRow): FiveModelDiscordDryRunPreviewPayload {
  return {
    username: 'Quant Desk',
    content: `[DRY RUN] ${row.headline}`,
    embeds: [{
      title: row.headline,
      description: compact(row.bodyLines.join('\n')),
      color: row.direction === 'LONG' ? 0x22c55e : 0xef4444,
      fields: [
        { name: 'Levels', value: compact(row.levelLine, 250), inline: false },
        { name: 'Risk', value: compact(row.riskLine, 250), inline: false },
        { name: 'Proof', value: compact(row.proofLine, 250), inline: true },
        { name: 'Invalidation', value: compact(row.invalidationLine, 250), inline: false },
        { name: 'Authority', value: 'Decision support only. Discord send is forced off in this preview.', inline: false },
      ],
      footer: { text: 'Dry run only - no webhook call - no automated orders' },
    }],
  };
}

function buildMarkdown(report: Omit<FiveModelDiscordDryRunPreviewReport, 'markdown'>): string {
  return [
    '# Five Model Discord Dry-Run Preview',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: dry-run Discord text preview only. It reads the tracked five-model runtime scanner surface and writes diagnostics. It does not call a webhook, write Supabase, read live Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Summary',
    `- Source rows: ${report.summary.sourceRows}.`,
    `- Preview payloads: ${report.summary.previewPayloads}.`,
    `- Approved Desk Plan rows: ${report.summary.approvedDeskPlanRows}.`,
    `- Forming Desk Read rows: ${report.summary.formingDeskReadRows}.`,
    `- Morning rows: ${report.summary.morningRows}.`,
    `- Lunch rows: ${report.summary.lunchRows}.`,
    `- Evening rows: ${report.summary.eveningRows}.`,
    `- Discord-post rows: ${report.summary.discordPostRows}.`,
    `- Webhook-call rows: ${report.summary.webhookCallRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Trading-logic changed rows: ${report.summary.tradingLogicChangedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Payload Preview',
    ...report.payloads.slice(0, 12).map((payload, index) => `${index + 1}. ${payload.content}`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildFiveModelDiscordDryRunPreviewReport(args: {
  runtimeSurfacePath: string;
  runtimeSurface: FiveModelProductionScannerSurfaceActivation | null;
  runtimeError?: string | null;
}, generatedAt = new Date().toISOString()): FiveModelDiscordDryRunPreviewReport {
  const surface = args.runtimeSurface;
  const rows = surface?.rows || [];
  const payloads = rows.map(payloadForRow);
  const blockers = [
    args.runtimeError ? `Runtime read error: ${args.runtimeError}` : null,
    surface ? null : 'Runtime surface is missing.',
    surface?.reportType === 'five_model_production_scanner_surface_activation' ? null : 'Runtime surface type is invalid.',
    surface?.status === 'active' ? null : `Runtime surface status is ${surface?.status || '<missing>'}.`,
    surface?.authority.scannerVisibleNow ? null : 'Runtime surface is not scanner-visible.',
    surface?.authority.postsDiscord === false ? null : 'Runtime surface posts Discord.',
    surface?.authority.writesSupabase === false ? null : 'Runtime surface writes Supabase.',
    surface?.authority.readsLiveSupabase === false ? null : 'Runtime surface reads live Supabase.',
    surface?.authority.readsLiveBridge === false ? null : 'Runtime surface reads live bridge.',
    surface?.authority.changesScannerBehavior === false ? null : 'Runtime surface changes scanner behavior.',
    surface?.authority.changesTradingLogic === false ? null : 'Runtime surface changes trading logic.',
    surface?.authority.changesCanExecute === false ? null : 'Runtime surface changes canExecute.',
    surface?.authority.canExecute === false ? null : 'Runtime surface has canExecute=true.',
    surface?.authority.automatedOrders === false ? null : 'Runtime surface allows automated orders.',
    rows.length === 18 ? null : `Expected 18 five-model rows and found ${rows.length}.`,
    rows.every((row) => !row.publishDiscord) ? null : 'Preview source rows would post Discord.',
    rows.every((row) => !row.writesSupabase) ? null : 'Preview source rows would write Supabase.',
    rows.every((row) => !row.readsLiveBridge) ? null : 'Preview source rows would read live bridge.',
    rows.every((row) => !row.canExecute) ? null : 'Preview source rows include canExecute=true.',
    payloads.length === rows.length ? null : 'Preview payload count does not match source row count.',
    ...(surface?.blockers || []),
  ].filter((item): item is string => Boolean(item));
  const status: ReportStatus = blockers.length ? 'blocked' : 'pass';
  const report: Omit<FiveModelDiscordDryRunPreviewReport, 'markdown'> = {
    reportType: 'five_model_discord_dry_run_preview',
    generatedAt,
    status,
    authority: {
      localOnly: true,
      readsRuntimeSurfaceOnly: true,
      writesDiagnosticArtifactsOnly: true,
      dryRunOnly: true,
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
    source: { runtimeSurfacePath: args.runtimeSurfacePath },
    summary: {
      sourceRows: status === 'pass' ? rows.length : 0,
      previewPayloads: status === 'pass' ? payloads.length : 0,
      approvedDeskPlanRows: status === 'pass' ? rows.filter((row) => row.state === 'APPROVED_DESK_PLAN').length : 0,
      formingDeskReadRows: status === 'pass' ? rows.filter((row) => row.state === 'FORMING_DESK_READ').length : 0,
      morningRows: status === 'pass' ? rows.filter((row) => row.session === 'morning').length : 0,
      lunchRows: status === 'pass' ? rows.filter((row) => row.session === 'lunch').length : 0,
      eveningRows: status === 'pass' ? rows.filter((row) => row.session === 'evening').length : 0,
      discordPostRows: 0,
      webhookCallRows: 0,
      supabaseWriteRows: 0,
      liveSupabaseReadRows: 0,
      liveBridgeReadRows: 0,
      canExecuteTrueRows: rows.filter((row) => row.canExecute).length,
      canExecuteChangedRows: 0,
      tradingLogicChangedRows: 0,
      automatedOrderRows: 0,
      blockedRows: blockers.length,
      recommendation: status === 'pass' ? 'ready_for_visual_or_text_signoff' : 'hold_for_five_model_discord_preview_fix',
    },
    payloads: status === 'pass' ? payloads : [],
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeFiveModelDiscordDryRunPreviewReport(
  report: FiveModelDiscordDryRunPreviewReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `five-model-discord-dry-run-preview-${stamp}.json`);
  const markdownPath = path.join(outDir, `five-model-discord-dry-run-preview-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const runtimeSurfacePath = path.resolve(options.runtimeSurfacePath);
  const read = await readRuntimeJson<FiveModelProductionScannerSurfaceActivation>(runtimeSurfacePath);
  const report = buildFiveModelDiscordDryRunPreviewReport({
    runtimeSurfacePath,
    runtimeSurface: read.value,
    runtimeError: read.error,
  });
  const written = writeFiveModelDiscordDryRunPreviewReport(report, path.resolve(options.outDir));
  if (options.json) {
    console.log(JSON.stringify({
      ...written,
      status: report.status,
      summary: report.summary,
      firstPayload: report.payloads[0] || null,
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
