import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

type ReportStatus = 'pass' | 'blocked';
type SessionName = 'morning' | 'lunch' | 'evening';
type StateName = 'APPROVED_DESK_PLAN' | 'FORMING_DESK_READ';

interface SourceReport {
  reportType?: string;
  status?: string;
  summary?: Record<string, unknown>;
  blockers?: string[];
}

interface DiscordPreviewPayload {
  username: string;
  content: string;
  embeds?: unknown[];
}

interface DiscordPreviewReport extends SourceReport {
  payloads?: DiscordPreviewPayload[];
}

interface RuntimeSurfaceRow {
  cardId: string;
  date: string;
  session: SessionName;
  state: StateName;
  stateLabel: 'Approved Desk Plan' | 'Forming Desk Read';
  model: string;
  direction: 'LONG' | 'SHORT';
  headline: string;
  levelLine: string;
  riskLine: string;
  proofLine: string;
  invalidationLine: string;
  publishDiscord: false;
  writesSupabase: false;
  readsLiveBridge: false;
  canExecute: false;
}

interface RuntimeSurfaceReport extends SourceReport {
  rows?: RuntimeSurfaceRow[];
}

interface FiveModelDiscordOneRowRehearsalManifestReport {
  reportType: 'five_model_discord_one_row_rehearsal_manifest';
  generatedAt: string;
  status: ReportStatus;
  authority: {
    localOnly: true;
    readsLaunchChecklistOnly: true;
    readsDiscordPreviewOnly: true;
    readsRuntimeSurfaceOnly: true;
    writesDiagnosticArtifactsOnly: true;
    selectsOnePayloadOnly: true;
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
    launchChecklistPath: string;
    discordPreviewPath: string;
    runtimeSurfacePath: string;
  };
  selectedCandidate: {
    candidateId: string;
    sourceCardId: string;
    payloadIndex: number;
    date: string;
    session: SessionName;
    state: 'APPROVED_DESK_PLAN';
    model: string;
    direction: 'LONG' | 'SHORT';
    headline: string;
    levelLine: string;
    riskLine: string;
    proofLine: string;
    invalidationLine: string;
    idempotencyKey: string;
    approvalPhrase: 'I approve exactly one five-model Discord production rehearsal for the manifest candidate and idempotency key.';
    productionWebhookEnabledNow: false;
    payloadPreview: DiscordPreviewPayload;
  } | null;
  summary: {
    launchChecklistReady: boolean;
    runtimeSurfaceRows: number;
    discordPreviewPayloads: number;
    approvedDeskPlanRows: number;
    formingDeskReadRows: number;
    candidateSelectedRows: number;
    payloadSelectedRows: number;
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
    recommendation: 'ready_for_exactly_one_five_model_discord_rehearsal_approval' | 'hold_for_five_model_one_row_manifest_fix';
  };
  nextApprovalCommand: string | null;
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  launchChecklistPath: string | null;
  discordPreviewPath: string | null;
  runtimeSurfacePath: string;
  outDir: string;
  json: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_RUNTIME_SURFACE = path.join(__dirname, '.five-model-production-scanner-surface.json');
const APPROVAL_PHRASE = 'I approve exactly one five-model Discord production rehearsal for the manifest candidate and idempotency key.' as const;

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function parseArgs(args = process.argv.slice(2)): CliOptions {
  return {
    launchChecklistPath: readFlag(args, '--launch-checklist'),
    discordPreviewPath: readFlag(args, '--discord-preview'),
    runtimeSurfacePath: readFlag(args, '--runtime-surface') || DEFAULT_RUNTIME_SURFACE,
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

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function countSideEffects(report: SourceReport, key: string): number {
  return numberValue(report.summary?.[key]);
}

function sideEffectBlockers(label: string, report: SourceReport): string[] {
  return [
    countSideEffects(report, 'discordPostRows') === 0 ? null : `${label} has Discord-post rows.`,
    countSideEffects(report, 'webhookCallRows') === 0 ? null : `${label} has webhook-call rows.`,
    countSideEffects(report, 'supabaseWriteRows') === 0 ? null : `${label} has Supabase-write rows.`,
    countSideEffects(report, 'liveSupabaseReadRows') === 0 ? null : `${label} has live Supabase read rows.`,
    countSideEffects(report, 'liveBridgeReadRows') === 0 ? null : `${label} has live bridge read rows.`,
    countSideEffects(report, 'canExecuteTrueRows') === 0 ? null : `${label} has canExecute=true rows.`,
    countSideEffects(report, 'canExecuteChangedRows') === 0 ? null : `${label} changed canExecute.`,
    countSideEffects(report, 'tradingLogicChangedRows') === 0 ? null : `${label} changed trading logic.`,
    countSideEffects(report, 'automatedOrderRows') === 0 ? null : `${label} has automated-order rows.`,
    ...(report.blockers || []),
  ].filter((item): item is string => Boolean(item));
}

function buildMarkdown(report: Omit<FiveModelDiscordOneRowRehearsalManifestReport, 'markdown'>): string {
  return [
    '# Five Model Discord One-Row Rehearsal Manifest',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local one-row Discord rehearsal manifest only. It reads the launch checklist, the Discord dry-run preview, and the tracked runtime surface. It writes diagnostics only. It does not call a webhook, write Supabase, read live Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Selected Candidate',
    report.selectedCandidate
      ? `- Candidate: ${report.selectedCandidate.candidateId}`
      : '- Candidate: none.',
    report.selectedCandidate
      ? `- Source card: ${report.selectedCandidate.sourceCardId}`
      : '- Source card: none.',
    report.selectedCandidate
      ? `- Payload index: ${report.selectedCandidate.payloadIndex}.`
      : '- Payload index: none.',
    report.selectedCandidate
      ? `- ${report.selectedCandidate.date} ${report.selectedCandidate.session} ${report.selectedCandidate.direction} ${report.selectedCandidate.model}.`
      : '- No row selected.',
    report.selectedCandidate
      ? `- Idempotency key: ${report.selectedCandidate.idempotencyKey}`
      : '- Idempotency key: none.',
    report.selectedCandidate
      ? `- Required approval phrase: ${report.selectedCandidate.approvalPhrase}`
      : '- Required approval phrase: unavailable.',
    '',
    '## Summary',
    `- Launch checklist ready: ${report.summary.launchChecklistReady}.`,
    `- Runtime surface rows: ${report.summary.runtimeSurfaceRows}.`,
    `- Discord preview payloads: ${report.summary.discordPreviewPayloads}.`,
    `- Approved Desk Plan rows: ${report.summary.approvedDeskPlanRows}.`,
    `- Forming Desk Read rows: ${report.summary.formingDeskReadRows}.`,
    `- Candidate selected rows: ${report.summary.candidateSelectedRows}.`,
    `- Payload selected rows: ${report.summary.payloadSelectedRows}.`,
    `- Discord-post rows: ${report.summary.discordPostRows}.`,
    `- Webhook-call rows: ${report.summary.webhookCallRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Trading-logic changed rows: ${report.summary.tradingLogicChangedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Next Command',
    report.nextApprovalCommand || 'No command is available while blocked.',
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildFiveModelDiscordOneRowRehearsalManifestReport(args: {
  launchChecklistPath: string;
  launchChecklist: SourceReport;
  discordPreviewPath: string;
  discordPreview: DiscordPreviewReport;
  runtimeSurfacePath: string;
  runtimeSurface: RuntimeSurfaceReport;
}, generatedAt = new Date().toISOString()): FiveModelDiscordOneRowRehearsalManifestReport {
  const rows = args.runtimeSurface.rows || [];
  const payloads = args.discordPreview.payloads || [];
  const approvedRows = rows.filter((row) => row.state === 'APPROVED_DESK_PLAN');
  const selectedRow = approvedRows[0] || null;
  const payloadIndex = selectedRow ? rows.indexOf(selectedRow) : -1;
  const selectedPayload = payloadIndex >= 0 ? payloads[payloadIndex] || null : null;
  const launchReady = args.launchChecklist.reportType === 'five_model_launch_checklist' &&
    args.launchChecklist.status === 'pass' &&
    args.launchChecklist.summary?.recommendation === 'ready_for_explicit_discord_rehearsal_decision';
  const payloadMatches = Boolean(selectedRow && selectedPayload?.content.includes(selectedRow.headline));
  const blockers = [
    launchReady ? null : 'Launch checklist is not ready for explicit Discord rehearsal decision.',
    args.discordPreview.reportType === 'five_model_discord_dry_run_preview' ? null : 'Discord preview report type is invalid.',
    args.discordPreview.status === 'pass' ? null : `Discord preview status is ${args.discordPreview.status || '<missing>'}.`,
    args.runtimeSurface.reportType === 'five_model_production_scanner_surface_activation' ? null : 'Runtime surface report type is invalid.',
    args.runtimeSurface.status === 'active' ? null : `Runtime surface status is ${args.runtimeSurface.status || '<missing>'}.`,
    rows.length === numberValue(args.runtimeSurface.summary?.selectedRows) ? null : 'Runtime surface rows do not match summary.',
    payloads.length === numberValue(args.discordPreview.summary?.previewPayloads) ? null : 'Discord preview payloads do not match summary.',
    rows.length === payloads.length ? null : 'Runtime surface row count does not match Discord preview payload count.',
    rows.length === 18 ? null : `Expected 18 runtime surface rows and found ${rows.length}.`,
    approvedRows.length === 5 ? null : `Expected 5 Approved Desk Plan rows and found ${approvedRows.length}.`,
    selectedRow ? null : 'No Approved Desk Plan row is available for one-row rehearsal.',
    selectedPayload ? null : 'No matching Discord preview payload is available for selected row.',
    payloadMatches ? null : 'Selected Discord preview payload does not match selected row headline.',
    selectedRow?.publishDiscord === false ? null : 'Selected row would post Discord.',
    selectedRow?.writesSupabase === false ? null : 'Selected row would write Supabase.',
    selectedRow?.readsLiveBridge === false ? null : 'Selected row would read live bridge.',
    selectedRow?.canExecute === false ? null : 'Selected row has canExecute=true.',
    ...sideEffectBlockers('Launch checklist', args.launchChecklist),
    ...sideEffectBlockers('Discord preview', args.discordPreview),
    ...sideEffectBlockers('Runtime surface', args.runtimeSurface),
  ].filter((item): item is string => Boolean(item));
  const status: ReportStatus = blockers.length ? 'blocked' : 'pass';
  const candidateId = selectedRow ? `five-model-discord-rehearsal|${hash(selectedRow.cardId)}` : '';
  const idempotencyKey = selectedRow && selectedPayload
    ? `five-model-discord-production-rehearsal:${hash(`${candidateId}|${selectedPayload.content}|${generatedAt.slice(0, 10)}`)}`
    : '';
  const selectedCandidate = status === 'pass' && selectedRow && selectedPayload
    ? {
        candidateId,
        sourceCardId: selectedRow.cardId,
        payloadIndex,
        date: selectedRow.date,
        session: selectedRow.session,
        state: 'APPROVED_DESK_PLAN' as const,
        model: selectedRow.model,
        direction: selectedRow.direction,
        headline: selectedRow.headline,
        levelLine: selectedRow.levelLine,
        riskLine: selectedRow.riskLine,
        proofLine: selectedRow.proofLine,
        invalidationLine: selectedRow.invalidationLine,
        idempotencyKey,
        approvalPhrase: APPROVAL_PHRASE,
        productionWebhookEnabledNow: false as const,
        payloadPreview: selectedPayload,
      }
    : null;
  const nextApprovalCommand = selectedCandidate
    ? `npx tsx tools/automation/five-model-discord-one-row-production-rehearsal.ts --manifest <this-manifest.json> --candidate-id "${selectedCandidate.candidateId}" --idempotency-key "${selectedCandidate.idempotencyKey}" --approval-phrase "${APPROVAL_PHRASE}" --i-approve-one-five-model-discord-post`
    : null;
  const report: Omit<FiveModelDiscordOneRowRehearsalManifestReport, 'markdown'> = {
    reportType: 'five_model_discord_one_row_rehearsal_manifest',
    generatedAt,
    status,
    authority: {
      localOnly: true,
      readsLaunchChecklistOnly: true,
      readsDiscordPreviewOnly: true,
      readsRuntimeSurfaceOnly: true,
      writesDiagnosticArtifactsOnly: true,
      selectsOnePayloadOnly: true,
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
      launchChecklistPath: args.launchChecklistPath,
      discordPreviewPath: args.discordPreviewPath,
      runtimeSurfacePath: args.runtimeSurfacePath,
    },
    selectedCandidate,
    summary: {
      launchChecklistReady: launchReady,
      runtimeSurfaceRows: status === 'pass' ? rows.length : 0,
      discordPreviewPayloads: status === 'pass' ? payloads.length : 0,
      approvedDeskPlanRows: status === 'pass' ? approvedRows.length : 0,
      formingDeskReadRows: status === 'pass' ? rows.filter((row) => row.state === 'FORMING_DESK_READ').length : 0,
      candidateSelectedRows: selectedCandidate ? 1 : 0,
      payloadSelectedRows: selectedCandidate ? 1 : 0,
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
      recommendation: status === 'pass'
        ? 'ready_for_exactly_one_five_model_discord_rehearsal_approval'
        : 'hold_for_five_model_one_row_manifest_fix',
    },
    nextApprovalCommand,
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeFiveModelDiscordOneRowRehearsalManifestReport(
  report: FiveModelDiscordOneRowRehearsalManifestReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `five-model-discord-one-row-rehearsal-manifest-${stamp}.json`);
  const markdownPath = path.join(outDir, `five-model-discord-one-row-rehearsal-manifest-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const outDir = path.resolve(options.outDir);
  const launchChecklistPath = path.resolve(options.launchChecklistPath ||
    latestReportByType(outDir, 'five_model_launch_checklist') ||
    '');
  const discordPreviewPath = path.resolve(options.discordPreviewPath ||
    latestReportByType(outDir, 'five_model_discord_dry_run_preview') ||
    '');
  const runtimeSurfacePath = path.resolve(options.runtimeSurfacePath);
  for (const filePath of [launchChecklistPath, discordPreviewPath, runtimeSurfacePath]) {
    if (!fs.existsSync(filePath)) throw new Error(`Missing five-model Discord one-row manifest source artifact: ${filePath}`);
  }
  const report = buildFiveModelDiscordOneRowRehearsalManifestReport({
    launchChecklistPath,
    launchChecklist: readJson<SourceReport>(launchChecklistPath),
    discordPreviewPath,
    discordPreview: readJson<DiscordPreviewReport>(discordPreviewPath),
    runtimeSurfacePath,
    runtimeSurface: readJson<RuntimeSurfaceReport>(runtimeSurfacePath),
  });
  const written = writeFiveModelDiscordOneRowRehearsalManifestReport(report, outDir);
  if (options.json) {
    console.log(JSON.stringify({
      ...written,
      status: report.status,
      summary: report.summary,
      selectedCandidate: report.selectedCandidate
        ? {
            candidateId: report.selectedCandidate.candidateId,
            sourceCardId: report.selectedCandidate.sourceCardId,
            payloadIndex: report.selectedCandidate.payloadIndex,
            idempotencyKey: report.selectedCandidate.idempotencyKey,
            approvalPhrase: report.selectedCandidate.approvalPhrase,
            content: report.selectedCandidate.payloadPreview.content,
          }
        : null,
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
