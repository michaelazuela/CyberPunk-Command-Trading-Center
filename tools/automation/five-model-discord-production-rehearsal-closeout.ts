import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type ReportStatus = 'pass' | 'blocked';
type CloseoutState = 'awaiting_explicit_discord_execution' | 'ready_for_final_handoff' | 'hold_for_closeout_fix';

interface ManifestReport {
  reportType?: string;
  status?: string;
  selectedCandidate?: {
    candidateId: string;
    sourceCardId: string;
    idempotencyKey: string;
    approvalPhrase: string;
  } | null;
  summary?: Record<string, unknown>;
  blockers?: string[];
}

interface DisabledSenderReport {
  reportType?: string;
  status?: string;
  source?: {
    manifestPath?: string;
  };
  request?: {
    candidateId?: string | null;
    idempotencyKey?: string | null;
    explicitApprovalFlagPresent?: boolean;
    explicitApprovalPhrasePresent?: boolean;
    executeProductionWebhook?: boolean;
  };
  contract?: {
    candidateMatched?: boolean;
    idempotencyKeyMatched?: boolean;
    duplicateProductionReceiptFound?: boolean;
    productionSendArmed?: boolean;
  };
  summary?: Record<string, unknown>;
  blockers?: string[];
}

interface ReceiptAuditReport {
  reportType?: string;
  status?: string;
  source?: {
    manifestPath?: string;
    receiptPath?: string;
  };
  verifiedReceipt?: {
    candidateId?: string | null;
    sourceCardId?: string | null;
    idempotencyKey?: string | null;
    discordMessageIdPresent?: boolean;
    payloadPreviewCompared?: boolean;
  };
  summary?: Record<string, unknown>;
  blockers?: string[];
}

interface FiveModelDiscordProductionRehearsalCloseoutReport {
  reportType: 'five_model_discord_production_rehearsal_closeout';
  generatedAt: string;
  status: ReportStatus;
  closeoutState: CloseoutState;
  authority: {
    localOnly: true;
    readsDiagnosticArtifactsOnly: true;
    writesDiagnosticArtifactsOnly: true;
    postsDiscord: false;
    webhookCalls: 0;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    printsSecretValues: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    canExecute: false;
    automatedOrders: false;
  };
  source: {
    manifestPath: string;
    disabledSenderPath: string;
    receiptAuditPath: string | null;
  };
  selectedCandidate: {
    candidateId: string | null;
    sourceCardId: string | null;
    idempotencyKey: string | null;
    approvalPhrase: string | null;
  };
  runbook: {
    approvalRequiredBeforeWebhook: boolean;
    exactApprovalPhrase: string | null;
    exactExecutionCommand: string | null;
    receiptAuditCommand: string | null;
    recoveryPath: string;
  };
  summary: {
    manifestPassed: boolean;
    disabledSenderPassed: boolean;
    receiptAuditPassed: boolean;
    candidateSelectedRows: number;
    payloadSelectedRows: number;
    productionReceiptAcceptedRows: number;
    observedReceiptDiscordPostRows: number;
    observedReceiptWebhookCallRows: number;
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
    recommendation: CloseoutState;
  };
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  manifestPath: string | null;
  disabledSenderPath: string | null;
  receiptAuditPath: string | null;
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
    manifestPath: readFlag(args, '--manifest'),
    disabledSenderPath: readFlag(args, '--disabled-sender'),
    receiptAuditPath: readFlag(args, '--receipt-audit'),
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

function commandFor(candidateId: string | null, idempotencyKey: string | null, approvalPhrase: string | null): string | null {
  if (!candidateId || !idempotencyKey || !approvalPhrase) return null;
  return [
    'npx tsx tools/automation/five-model-discord-one-row-production-rehearsal.ts',
    '--manifest <manifest.json>',
    `--candidate-id "${candidateId}"`,
    `--idempotency-key "${idempotencyKey}"`,
    `--approval-phrase "${approvalPhrase}"`,
    '--i-approve-one-five-model-discord-post',
    '--execute-production-webhook',
    '--json',
  ].join(' ');
}

function receiptAuditCommand(manifestPath: string, candidateId: string | null): string | null {
  if (!candidateId) return null;
  return [
    'npx tsx tools/automation/five-model-discord-one-row-rehearsal-receipt-audit.ts',
    `--manifest "${manifestPath}"`,
    '--receipt <production-receipt.json>',
    '--json',
  ].join(' ');
}

function buildMarkdown(report: Omit<FiveModelDiscordProductionRehearsalCloseoutReport, 'markdown'>): string {
  return [
    '# Five Model Discord Production Rehearsal Closeout',
    '',
    `Status: ${report.status}`,
    `Closeout state: ${report.closeoutState}`,
    '',
    'Authority: local closeout/runbook only. It reads saved diagnostic artifacts and writes diagnostics. It does not call Discord, write Supabase, read live Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Selected Candidate',
    `- Candidate: ${report.selectedCandidate.candidateId || 'none'}.`,
    `- Source card: ${report.selectedCandidate.sourceCardId || 'none'}.`,
    `- Idempotency key: ${report.selectedCandidate.idempotencyKey || 'none'}.`,
    '',
    '## Runbook',
    `- Approval required before webhook: ${report.runbook.approvalRequiredBeforeWebhook}.`,
    `- Exact approval phrase: ${report.runbook.exactApprovalPhrase || 'none'}.`,
    `- Execution command: ${report.runbook.exactExecutionCommand || 'none'}.`,
    `- Receipt audit command: ${report.runbook.receiptAuditCommand || 'none'}.`,
    `- Recovery path: ${report.runbook.recoveryPath}`,
    '',
    '## Summary',
    `- Manifest passed: ${report.summary.manifestPassed}.`,
    `- Disabled sender passed: ${report.summary.disabledSenderPassed}.`,
    `- Receipt audit passed: ${report.summary.receiptAuditPassed}.`,
    `- Candidate selected rows: ${report.summary.candidateSelectedRows}.`,
    `- Payload selected rows: ${report.summary.payloadSelectedRows}.`,
    `- Production receipt accepted rows: ${report.summary.productionReceiptAcceptedRows}.`,
    `- Observed receipt Discord-post rows: ${report.summary.observedReceiptDiscordPostRows}.`,
    `- Observed receipt webhook-call rows: ${report.summary.observedReceiptWebhookCallRows}.`,
    `- This closeout Discord-post rows: ${report.summary.discordPostRows}.`,
    `- This closeout webhook-call rows: ${report.summary.webhookCallRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Trading-logic changed rows: ${report.summary.tradingLogicChangedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildFiveModelDiscordProductionRehearsalCloseoutReport(args: {
  manifestPath: string;
  manifest: ManifestReport;
  disabledSenderPath: string;
  disabledSender: DisabledSenderReport;
  receiptAuditPath?: string | null;
  receiptAudit?: ReceiptAuditReport | null;
}, generatedAt = new Date().toISOString()): FiveModelDiscordProductionRehearsalCloseoutReport {
  const candidate = args.manifest.selectedCandidate || null;
  const receiptAudit = args.receiptAudit || null;
  const receiptAuditSupplied = Boolean(args.receiptAuditPath && receiptAudit);
  const receiptAuditPassed = receiptAudit?.status === 'pass' &&
    receiptAudit?.reportType === 'five_model_discord_one_row_rehearsal_receipt_audit';
  const observedReceiptDiscordPostRows = receiptAuditPassed ? numberValue(receiptAudit?.summary?.discordPostRows) : 0;
  const observedReceiptWebhookCallRows = receiptAuditPassed ? 1 : 0;
  const baseBlockers = [
    args.manifest.reportType === 'five_model_discord_one_row_rehearsal_manifest' ? null : 'Manifest report type is invalid.',
    args.manifest.status === 'pass' ? null : `Manifest status is ${args.manifest.status || '<missing>'}.`,
    numberValue(args.manifest.summary?.candidateSelectedRows) === 1 ? null : 'Manifest does not select exactly one candidate.',
    numberValue(args.manifest.summary?.payloadSelectedRows) === 1 ? null : 'Manifest does not select exactly one payload.',
    candidate ? null : 'Manifest selected candidate is missing.',
    args.disabledSender.reportType === 'five_model_discord_one_row_production_rehearsal_disabled_sender'
      ? null
      : 'Disabled sender report type is invalid.',
    args.disabledSender.status === 'pass' ? null : `Disabled sender status is ${args.disabledSender.status || '<missing>'}.`,
    args.disabledSender.source?.manifestPath === args.manifestPath ? null : 'Disabled sender manifest path does not match closeout manifest.',
    args.disabledSender.request?.candidateId === candidate?.candidateId ? null : 'Disabled sender candidate id does not match manifest.',
    args.disabledSender.request?.idempotencyKey === candidate?.idempotencyKey ? null : 'Disabled sender idempotency key does not match manifest.',
    args.disabledSender.request?.explicitApprovalFlagPresent === true ? null : 'Disabled sender lacks explicit approval flag proof.',
    args.disabledSender.request?.explicitApprovalPhrasePresent === true ? null : 'Disabled sender lacks explicit approval phrase proof.',
    args.disabledSender.request?.executeProductionWebhook === false ? null : 'Disabled sender unexpectedly requested production webhook execution.',
    args.disabledSender.contract?.candidateMatched === true ? null : 'Disabled sender candidate did not match manifest.',
    args.disabledSender.contract?.idempotencyKeyMatched === true ? null : 'Disabled sender idempotency key did not match manifest.',
    args.disabledSender.contract?.duplicateProductionReceiptFound === false ? null : 'Disabled sender reported duplicate idempotency state.',
    args.disabledSender.contract?.productionSendArmed === false ? null : 'Disabled sender armed production send.',
    numberValue(args.disabledSender.summary?.discordPostRows) === 0 ? null : 'Disabled sender has Discord-post rows.',
    numberValue(args.disabledSender.summary?.webhookCallRows) === 0 ? null : 'Disabled sender has webhook-call rows.',
    numberValue(args.disabledSender.summary?.supabaseWriteRows) === 0 ? null : 'Disabled sender has Supabase-write rows.',
    numberValue(args.disabledSender.summary?.liveSupabaseReadRows) === 0 ? null : 'Disabled sender has live Supabase read rows.',
    numberValue(args.disabledSender.summary?.liveBridgeReadRows) === 0 ? null : 'Disabled sender has live bridge read rows.',
    numberValue(args.disabledSender.summary?.canExecuteTrueRows) === 0 ? null : 'Disabled sender has canExecute=true rows.',
    numberValue(args.disabledSender.summary?.canExecuteChangedRows) === 0 ? null : 'Disabled sender changed canExecute.',
    numberValue(args.disabledSender.summary?.tradingLogicChangedRows) === 0 ? null : 'Disabled sender changed trading logic.',
    numberValue(args.disabledSender.summary?.automatedOrderRows) === 0 ? null : 'Disabled sender has automated-order rows.',
    ...(args.manifest.blockers || []),
    ...(args.disabledSender.blockers || []),
  ].filter((item): item is string => Boolean(item));
  const receiptBlockers = receiptAuditSupplied ? [
    receiptAuditPassed ? null : 'Receipt audit is not a passing five-model receipt audit.',
    receiptAudit?.source?.manifestPath === args.manifestPath ? null : 'Receipt audit manifest path does not match closeout manifest.',
    receiptAudit?.verifiedReceipt?.candidateId === candidate?.candidateId ? null : 'Receipt audit candidate id does not match manifest.',
    receiptAudit?.verifiedReceipt?.idempotencyKey === candidate?.idempotencyKey ? null : 'Receipt audit idempotency key does not match manifest.',
    receiptAudit?.summary?.receiptAccepted === true ? null : 'Receipt audit did not accept the production receipt.',
    numberValue(receiptAudit?.summary?.discordPostRows) === 1 ? null : 'Receipt audit does not prove exactly one observed Discord-post row.',
    numberValue(receiptAudit?.summary?.webhookCallRows) === 0 ? null : 'Receipt audit should not make webhook calls itself.',
    numberValue(receiptAudit?.summary?.supabaseWriteRows) === 0 ? null : 'Receipt audit has Supabase-write rows.',
    numberValue(receiptAudit?.summary?.liveSupabaseReadRows) === 0 ? null : 'Receipt audit has live Supabase read rows.',
    numberValue(receiptAudit?.summary?.liveBridgeReadRows) === 0 ? null : 'Receipt audit has live bridge read rows.',
    numberValue(receiptAudit?.summary?.canExecuteTrueRows) === 0 ? null : 'Receipt audit has canExecute=true rows.',
    numberValue(receiptAudit?.summary?.canExecuteChangedRows) === 0 ? null : 'Receipt audit changed canExecute.',
    numberValue(receiptAudit?.summary?.tradingLogicChangedRows) === 0 ? null : 'Receipt audit changed trading logic.',
    numberValue(receiptAudit?.summary?.automatedOrderRows) === 0 ? null : 'Receipt audit has automated-order rows.',
    ...(receiptAudit?.blockers || []),
  ].filter((item): item is string => Boolean(item)) : [];
  const blockers = [...baseBlockers, ...receiptBlockers];
  const closeoutState: CloseoutState = blockers.length
    ? 'hold_for_closeout_fix'
    : receiptAuditPassed
      ? 'ready_for_final_handoff'
      : 'awaiting_explicit_discord_execution';
  const status: ReportStatus = blockers.length ? 'blocked' : 'pass';
  const report: Omit<FiveModelDiscordProductionRehearsalCloseoutReport, 'markdown'> = {
    reportType: 'five_model_discord_production_rehearsal_closeout',
    generatedAt,
    status,
    closeoutState,
    authority: {
      localOnly: true,
      readsDiagnosticArtifactsOnly: true,
      writesDiagnosticArtifactsOnly: true,
      postsDiscord: false,
      webhookCalls: 0,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      printsSecretValues: false,
      changesScannerBehavior: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      canExecute: false,
      automatedOrders: false,
    },
    source: {
      manifestPath: args.manifestPath,
      disabledSenderPath: args.disabledSenderPath,
      receiptAuditPath: args.receiptAuditPath || null,
    },
    selectedCandidate: {
      candidateId: candidate?.candidateId || null,
      sourceCardId: candidate?.sourceCardId || null,
      idempotencyKey: candidate?.idempotencyKey || null,
      approvalPhrase: candidate?.approvalPhrase || null,
    },
    runbook: {
      approvalRequiredBeforeWebhook: closeoutState === 'awaiting_explicit_discord_execution',
      exactApprovalPhrase: candidate?.approvalPhrase || null,
      exactExecutionCommand: commandFor(candidate?.candidateId || null, candidate?.idempotencyKey || null, candidate?.approvalPhrase || null),
      receiptAuditCommand: receiptAuditCommand(args.manifestPath, candidate?.candidateId || null),
      recoveryPath: 'If the one-row rehearsal is not desired, leave the sender disabled and do not run the webhook command. If a production receipt already exists for the idempotency key, do not rerun it; audit the existing receipt instead.',
    },
    summary: {
      manifestPassed: args.manifest.status === 'pass',
      disabledSenderPassed: args.disabledSender.status === 'pass',
      receiptAuditPassed,
      candidateSelectedRows: blockers.length ? 0 : 1,
      payloadSelectedRows: blockers.length ? 0 : 1,
      productionReceiptAcceptedRows: receiptAuditPassed && blockers.length === 0 ? 1 : 0,
      observedReceiptDiscordPostRows,
      observedReceiptWebhookCallRows,
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
      recommendation: closeoutState,
    },
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeFiveModelDiscordProductionRehearsalCloseoutReport(
  report: FiveModelDiscordProductionRehearsalCloseoutReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `five-model-discord-production-rehearsal-closeout-${stamp}.json`);
  const markdownPath = path.join(outDir, `five-model-discord-production-rehearsal-closeout-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const outDir = path.resolve(options.outDir);
  const manifestPath = path.resolve(options.manifestPath ||
    latestReportByType(outDir, 'five_model_discord_one_row_rehearsal_manifest') ||
    '');
  const disabledSenderPath = path.resolve(options.disabledSenderPath ||
    latestReportByType(outDir, 'five_model_discord_one_row_production_rehearsal_disabled_sender') ||
    '');
  const latestReceiptAudit = latestReportByType(outDir, 'five_model_discord_one_row_rehearsal_receipt_audit');
  const receiptAuditPath = options.receiptAuditPath
    ? path.resolve(options.receiptAuditPath)
    : latestReceiptAudit
      ? path.resolve(latestReceiptAudit)
      : null;
  for (const filePath of [manifestPath, disabledSenderPath]) {
    if (!fs.existsSync(filePath)) throw new Error(`Missing five-model closeout source artifact: ${filePath}`);
  }
  const report = buildFiveModelDiscordProductionRehearsalCloseoutReport({
    manifestPath,
    manifest: readJson<ManifestReport>(manifestPath),
    disabledSenderPath,
    disabledSender: readJson<DisabledSenderReport>(disabledSenderPath),
    receiptAuditPath,
    receiptAudit: receiptAuditPath && fs.existsSync(receiptAuditPath)
      ? readJson<ReceiptAuditReport>(receiptAuditPath)
      : null,
  });
  const written = writeFiveModelDiscordProductionRehearsalCloseoutReport(report, outDir);
  if (options.json) {
    console.log(JSON.stringify({
      ...written,
      status: report.status,
      closeoutState: report.closeoutState,
      selectedCandidate: report.selectedCandidate,
      summary: report.summary,
      runbook: report.runbook,
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
