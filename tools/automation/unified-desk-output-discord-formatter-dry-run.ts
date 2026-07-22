import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { UnifiedDeskOutputScannerSurfaceModel } from '../../src/lib/unifiedDeskOutputScannerSurface';

interface LocalScannerUiRefreshProofReport {
  reportType: 'unified_desk_output_local_scanner_ui_refresh_proof';
  status: 'pass' | 'blocked';
  authority: {
    localOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    automatedOrders: false;
  };
  summary: {
    scannerUiRefreshAllowed: boolean;
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
  };
  blockers: string[];
}

interface ScannerSurfaceSmokeReport {
  reportType: 'unified_desk_output_scanner_surface_smoke';
  status: 'pass' | 'blocked';
  authority: {
    localOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    automatedOrders: false;
  };
  summary: {
    renderedRows: number;
    approvedDeskPlanRows: number;
    formingDeskReadRows: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    wordingViolationRows: number;
    blockedRows: number;
  };
  surface: UnifiedDeskOutputScannerSurfaceModel;
  blockers: string[];
}

interface DiscordDryRunPayload {
  id: string;
  content: string;
  shouldPost: false;
  publishDiscord: false;
  webhookCalls: 0;
  writesSupabase: false;
  readsLiveBridge: false;
  canExecute: false;
}

interface DiscordFormatterDryRunReport {
  reportType: 'unified_desk_output_discord_formatter_dry_run';
  generatedAt: string;
  status: 'pass' | 'blocked';
  authority: {
    localOnly: true;
    dryRunOnly: true;
    readsSavedScannerSurfaceOnly: true;
    readsSavedScannerUiProofOnly: true;
    formatsDiscordPayloadsOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    automatedOrders: false;
  };
  source: {
    scannerUiRefreshProofPath: string;
    scannerSurfaceSmokePath: string;
  };
  summary: {
    sourceRows: number;
    formattedPayloads: number;
    approvedDeskPlanPayloads: number;
    formingDeskReadPayloads: number;
    shouldPostRows: number;
    publishDiscordRows: number;
    webhookCallRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    wordingViolationRows: number;
    blockedRows: number;
    recommendation: 'ready_for_discord_publish_gate_decision' | 'hold_for_discord_formatter_fix';
  };
  samplePayloads: DiscordDryRunPayload[];
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  proofPath: string | null;
  surfacePath: string | null;
  outDir: string;
  json: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const BLOCKED_WORDING = /human[- ]review|no chase|no-trade|no trade|missed/i;

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function parseArgs(args = process.argv.slice(2)): CliOptions {
  return {
    proofPath: readFlag(args, '--proof'),
    surfacePath: readFlag(args, '--surface-smoke'),
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

function formatPayload(row: UnifiedDeskOutputScannerSurfaceModel['rows'][number]): DiscordDryRunPayload {
  const content = [
    `[${row.stateLabel.toUpperCase()}] ${row.session.toUpperCase()} ${row.direction} ${row.model}`,
    `What: ${row.bodyLines[0] || row.headline}`,
    `Why: ${row.bodyLines[1] || 'Scanner-owned setup evidence is present.'}`,
    `Where: ${row.levelLine}`,
    `Risk: ${row.riskLine}`,
    `Proof: ${row.proofLine}`,
    `Invalidation: ${row.invalidationLine}`,
    'Decision support only. No Discord post in this dry run. canExecute remains false.',
  ].join('\n');
  return {
    id: row.cardId,
    content,
    shouldPost: false,
    publishDiscord: false,
    webhookCalls: 0,
    writesSupabase: false,
    readsLiveBridge: false,
    canExecute: false,
  };
}

function buildMarkdown(report: Omit<DiscordFormatterDryRunReport, 'markdown'>): string {
  return [
    '# Unified Desk Output Discord Formatter Dry Run',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: Discord formatter dry-run only. It formats saved scanner surface rows into Discord-shaped text and does not post Discord, write Supabase, read live bridge data, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Summary',
    `- Source rows: ${report.summary.sourceRows}.`,
    `- Formatted payloads: ${report.summary.formattedPayloads}.`,
    `- Approved Desk Plan payloads: ${report.summary.approvedDeskPlanPayloads}.`,
    `- Forming Desk Read payloads: ${report.summary.formingDeskReadPayloads}.`,
    `- shouldPost rows: ${report.summary.shouldPostRows}.`,
    `- publishDiscord rows: ${report.summary.publishDiscordRows}.`,
    `- Webhook-call rows: ${report.summary.webhookCallRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-Supabase-read rows: ${report.summary.liveSupabaseReadRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Wording violation rows: ${report.summary.wordingViolationRows}.`,
    `- Blocked rows: ${report.summary.blockedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Sample Payloads',
    ...report.samplePayloads.slice(0, 5).flatMap((payload) => [
      `### ${payload.id}`,
      '```text',
      payload.content,
      '```',
    ]),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildUnifiedDeskOutputDiscordFormatterDryRunReport(args: {
  proofPath: string;
  proofReport: LocalScannerUiRefreshProofReport;
  surfacePath: string;
  surfaceReport: ScannerSurfaceSmokeReport;
}, generatedAt = new Date().toISOString()): DiscordFormatterDryRunReport {
  const rows = args.surfaceReport.surface.rows;
  const payloads = rows.map(formatPayload);
  const wordingViolationRows = payloads.filter((payload) => BLOCKED_WORDING.test(payload.content)).length;
  const blockers = [
    args.proofReport.reportType === 'unified_desk_output_local_scanner_ui_refresh_proof'
      ? null
      : 'Source proof is not local scanner UI refresh proof.',
    args.proofReport.status === 'pass' ? null : `Scanner UI refresh proof status is ${args.proofReport.status}.`,
    args.proofReport.summary.scannerUiRefreshAllowed ? null : 'Scanner UI refresh proof is not allowed.',
    args.proofReport.authority.postsDiscord === false ? null : 'Scanner UI proof posts Discord.',
    args.proofReport.authority.writesSupabase === false ? null : 'Scanner UI proof writes Supabase.',
    args.proofReport.authority.readsLiveSupabase === false ? null : 'Scanner UI proof reads live Supabase.',
    args.proofReport.authority.readsLiveBridge === false ? null : 'Scanner UI proof reads live bridge.',
    args.proofReport.authority.changesTradingLogic === false ? null : 'Scanner UI proof changes trading logic.',
    args.proofReport.authority.changesCanExecute === false ? null : 'Scanner UI proof changes canExecute.',
    args.proofReport.authority.automatedOrders === false ? null : 'Scanner UI proof allows automated orders.',
    args.surfaceReport.reportType === 'unified_desk_output_scanner_surface_smoke'
      ? null
      : 'Source surface is not scanner surface smoke.',
    args.surfaceReport.status === 'pass' ? null : `Scanner surface smoke status is ${args.surfaceReport.status}.`,
    args.surfaceReport.authority.postsDiscord === false ? null : 'Scanner surface posts Discord.',
    args.surfaceReport.authority.writesSupabase === false ? null : 'Scanner surface writes Supabase.',
    args.surfaceReport.authority.readsLiveSupabase === false ? null : 'Scanner surface reads live Supabase.',
    args.surfaceReport.authority.readsLiveBridge === false ? null : 'Scanner surface reads live bridge.',
    args.surfaceReport.authority.changesTradingLogic === false ? null : 'Scanner surface changes trading logic.',
    args.surfaceReport.authority.changesCanExecute === false ? null : 'Scanner surface changes canExecute.',
    args.surfaceReport.authority.automatedOrders === false ? null : 'Scanner surface allows automated orders.',
    args.surfaceReport.surface.status === 'ready' ? null : `Scanner surface status is ${args.surfaceReport.surface.status}.`,
    rows.length > 0 ? null : 'No scanner surface rows to format.',
    payloads.every((payload) => payload.shouldPost === false) ? null : 'A payload would post.',
    payloads.every((payload) => payload.publishDiscord === false) ? null : 'A payload has publishDiscord=true.',
    payloads.every((payload) => payload.webhookCalls === 0) ? null : 'A payload would call a webhook.',
    payloads.every((payload) => payload.writesSupabase === false) ? null : 'A payload would write Supabase.',
    payloads.every((payload) => payload.readsLiveBridge === false) ? null : 'A payload would read live bridge.',
    payloads.every((payload) => payload.canExecute === false) ? null : 'A payload has canExecute=true.',
    wordingViolationRows === 0 ? null : 'Discord dry-run payload contains blocked legacy wording.',
    ...args.proofReport.blockers,
    ...args.surfaceReport.blockers,
    ...args.surfaceReport.surface.blockers,
  ].filter((item): item is string => Boolean(item));
  const report: Omit<DiscordFormatterDryRunReport, 'markdown'> = {
    reportType: 'unified_desk_output_discord_formatter_dry_run',
    generatedAt,
    status: blockers.length ? 'blocked' : 'pass',
    authority: {
      localOnly: true,
      dryRunOnly: true,
      readsSavedScannerSurfaceOnly: true,
      readsSavedScannerUiProofOnly: true,
      formatsDiscordPayloadsOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      automatedOrders: false,
    },
    source: {
      scannerUiRefreshProofPath: args.proofPath,
      scannerSurfaceSmokePath: args.surfacePath,
    },
    summary: {
      sourceRows: rows.length,
      formattedPayloads: payloads.length,
      approvedDeskPlanPayloads: rows.filter((row) => row.state === 'APPROVED_DESK_PLAN').length,
      formingDeskReadPayloads: rows.filter((row) => row.state === 'FORMING_DESK_READ').length,
      shouldPostRows: payloads.filter((payload) => payload.shouldPost).length,
      publishDiscordRows: payloads.filter((payload) => payload.publishDiscord).length,
      webhookCallRows: payloads.filter((payload) => payload.webhookCalls > 0).length,
      supabaseWriteRows: payloads.filter((payload) => payload.writesSupabase).length,
      liveSupabaseReadRows: 0,
      liveBridgeReadRows: payloads.filter((payload) => payload.readsLiveBridge).length,
      canExecuteTrueRows: payloads.filter((payload) => payload.canExecute).length,
      wordingViolationRows,
      blockedRows: blockers.length,
      recommendation: blockers.length ? 'hold_for_discord_formatter_fix' : 'ready_for_discord_publish_gate_decision',
    },
    samplePayloads: payloads.slice(0, 20),
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeUnifiedDeskOutputDiscordFormatterDryRunReport(report: DiscordFormatterDryRunReport, outDir: string): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-desk-output-discord-formatter-dry-run-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-desk-output-discord-formatter-dry-run-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const proofPath = path.resolve(options.proofPath ||
    latestMatchingFile(DEFAULT_REPORT_DIR, /^unified-desk-output-local-scanner-ui-refresh-proof-\d+\.json$/) ||
    '');
  const surfacePath = path.resolve(options.surfacePath ||
    latestMatchingFile(DEFAULT_REPORT_DIR, /^unified-desk-output-scanner-surface-smoke-\d+\.json$/) ||
    '');
  if (!fs.existsSync(proofPath)) throw new Error('Missing Unified Desk Output local scanner UI refresh proof path.');
  if (!fs.existsSync(surfacePath)) throw new Error('Missing Unified Desk Output scanner surface smoke path.');
  const report = buildUnifiedDeskOutputDiscordFormatterDryRunReport({
    proofPath,
    proofReport: readJson<LocalScannerUiRefreshProofReport>(proofPath),
    surfacePath,
    surfaceReport: readJson<ScannerSurfaceSmokeReport>(surfacePath),
  });
  const written = writeUnifiedDeskOutputDiscordFormatterDryRunReport(report, path.resolve(options.outDir));
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
