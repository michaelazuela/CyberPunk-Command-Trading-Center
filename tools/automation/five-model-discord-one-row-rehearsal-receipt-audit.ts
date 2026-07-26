import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type ReportStatus = 'pass' | 'blocked';

interface ManifestReport {
  reportType?: string;
  status?: string;
  selectedCandidate?: {
    candidateId: string;
    sourceCardId: string;
    idempotencyKey: string;
    payloadPreview?: {
      content?: string;
    };
  } | null;
  summary?: Record<string, unknown>;
  blockers?: string[];
}

interface ReceiptReport {
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
    manifestMatched?: boolean;
    oneRowCap?: boolean;
    candidateMatched?: boolean;
    idempotencyKeyMatched?: boolean;
    duplicateProductionReceiptFound?: boolean;
    productionSendArmed?: boolean;
  };
  summary?: Record<string, unknown>;
  receipt?: {
    discordMessageId?: string | null;
    webhookWaitReadback?: boolean;
    idempotencyKey?: string | null;
    payloadCopiedFromManifest?: boolean;
    secretValuesPrinted?: false;
  };
  blockers?: string[];
}

interface FiveModelDiscordOneRowRehearsalReceiptAuditReport {
  reportType: 'five_model_discord_one_row_rehearsal_receipt_audit';
  generatedAt: string;
  status: ReportStatus;
  authority: {
    localOnly: true;
    readsManifestOnly: true;
    readsReceiptOnly: true;
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
    receiptPath: string;
  };
  verifiedReceipt: {
    candidateId: string | null;
    sourceCardId: string | null;
    idempotencyKey: string | null;
    discordMessageIdPresent: boolean;
    payloadPreviewCompared: boolean;
  };
  summary: {
    manifestPassed: boolean;
    receiptAccepted: boolean;
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
    duplicateReceiptRows: number;
    blockedRows: number;
    recommendation: 'ready_for_guarded_live_lane_closeout' | 'hold_for_five_model_rehearsal_receipt_fix';
  };
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  manifestPath: string | null;
  receiptPath: string | null;
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
    receiptPath: readFlag(args, '--receipt'),
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

function normalizeContent(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function buildMarkdown(report: Omit<FiveModelDiscordOneRowRehearsalReceiptAuditReport, 'markdown'>): string {
  return [
    '# Five Model Discord One-Row Rehearsal Receipt Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local receipt audit only. It reads the saved one-row manifest and production receipt, then writes diagnostics. It does not call Discord, write Supabase, read live Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Verified Receipt',
    `- Candidate: ${report.verifiedReceipt.candidateId || 'none'}.`,
    `- Source card: ${report.verifiedReceipt.sourceCardId || 'none'}.`,
    `- Idempotency key: ${report.verifiedReceipt.idempotencyKey || 'none'}.`,
    `- Discord message id present: ${report.verifiedReceipt.discordMessageIdPresent}.`,
    `- Payload preview compared: ${report.verifiedReceipt.payloadPreviewCompared}.`,
    '',
    '## Summary',
    `- Manifest passed: ${report.summary.manifestPassed}.`,
    `- Receipt accepted: ${report.summary.receiptAccepted}.`,
    `- Candidate selected rows: ${report.summary.candidateSelectedRows}.`,
    `- Payload selected rows: ${report.summary.payloadSelectedRows}.`,
    `- Discord-post rows: ${report.summary.discordPostRows}.`,
    `- Webhook-call rows: ${report.summary.webhookCallRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Trading-logic changed rows: ${report.summary.tradingLogicChangedRows}.`,
    `- Duplicate receipt rows: ${report.summary.duplicateReceiptRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildFiveModelDiscordOneRowRehearsalReceiptAuditReport(args: {
  manifestPath: string;
  manifest: ManifestReport;
  receiptPath: string;
  receipt: ReceiptReport;
}, generatedAt = new Date().toISOString()): FiveModelDiscordOneRowRehearsalReceiptAuditReport {
  const candidate = args.manifest.selectedCandidate || null;
  const manifestPayload = normalizeContent(candidate?.payloadPreview?.content);
  const receiptMessagePresent = typeof args.receipt.receipt?.discordMessageId === 'string' &&
    args.receipt.receipt.discordMessageId.trim().length > 0;
  const payloadCopied = args.receipt.receipt?.payloadCopiedFromManifest === true;
  const payloadCompared = payloadCopied && manifestPayload.length > 0;
  const blockers = [
    args.manifest.reportType === 'five_model_discord_one_row_rehearsal_manifest' ? null : 'Manifest report type is invalid.',
    args.manifest.status === 'pass' ? null : `Manifest status is ${args.manifest.status || '<missing>'}.`,
    numberValue(args.manifest.summary?.candidateSelectedRows) === 1 ? null : 'Manifest does not select exactly one candidate.',
    numberValue(args.manifest.summary?.payloadSelectedRows) === 1 ? null : 'Manifest does not select exactly one payload.',
    candidate ? null : 'Manifest selected candidate is missing.',
    args.receipt.reportType === 'five_model_discord_one_row_production_rehearsal_receipt' ? null : 'Receipt report type is invalid.',
    args.receipt.status === 'pass' ? null : `Receipt status is ${args.receipt.status || '<missing>'}.`,
    args.receipt.source?.manifestPath === args.manifestPath ? null : 'Receipt manifest path does not match audited manifest.',
    args.receipt.request?.candidateId === candidate?.candidateId ? null : 'Receipt candidate id does not match manifest.',
    args.receipt.request?.idempotencyKey === candidate?.idempotencyKey ? null : 'Receipt request idempotency key does not match manifest.',
    args.receipt.receipt?.idempotencyKey === candidate?.idempotencyKey ? null : 'Receipt idempotency key does not match manifest.',
    args.receipt.request?.explicitApprovalFlagPresent === true ? null : 'Receipt lacks explicit approval flag.',
    args.receipt.request?.explicitApprovalPhrasePresent === true ? null : 'Receipt lacks explicit approval phrase.',
    args.receipt.request?.executeProductionWebhook === true ? null : 'Receipt was not run with production webhook execution.',
    args.receipt.contract?.oneRowCap === true ? null : 'Receipt does not preserve one-row cap.',
    args.receipt.contract?.candidateMatched === true ? null : 'Receipt candidate did not match manifest.',
    args.receipt.contract?.idempotencyKeyMatched === true ? null : 'Receipt idempotency key did not match manifest.',
    args.receipt.contract?.duplicateProductionReceiptFound === false ? null : 'Receipt reported duplicate idempotency state.',
    args.receipt.contract?.productionSendArmed === true ? null : 'Receipt production send was not armed.',
    numberValue(args.receipt.summary?.candidateSelectedRows) === 1 ? null : 'Receipt does not select exactly one candidate.',
    numberValue(args.receipt.summary?.payloadSelectedRows) === 1 ? null : 'Receipt does not select exactly one payload.',
    numberValue(args.receipt.summary?.discordPostRows) === 1 ? null : 'Receipt does not prove exactly one Discord-post row.',
    numberValue(args.receipt.summary?.webhookCallRows) === 1 ? null : 'Receipt does not prove exactly one webhook call.',
    numberValue(args.receipt.summary?.supabaseWriteRows) === 0 ? null : 'Receipt has Supabase-write rows.',
    numberValue(args.receipt.summary?.liveSupabaseReadRows) === 0 ? null : 'Receipt has live Supabase read rows.',
    numberValue(args.receipt.summary?.liveBridgeReadRows) === 0 ? null : 'Receipt has live bridge read rows.',
    numberValue(args.receipt.summary?.canExecuteTrueRows) === 0 ? null : 'Receipt has canExecute=true rows.',
    numberValue(args.receipt.summary?.canExecuteChangedRows) === 0 ? null : 'Receipt changed canExecute.',
    numberValue(args.receipt.summary?.tradingLogicChangedRows) === 0 ? null : 'Receipt changed trading logic.',
    numberValue(args.receipt.summary?.automatedOrderRows) === 0 ? null : 'Receipt has automated-order rows.',
    receiptMessagePresent ? null : 'Receipt has no Discord message id.',
    args.receipt.receipt?.webhookWaitReadback === true ? null : 'Receipt did not use webhook wait readback.',
    payloadCompared ? null : 'Receipt did not preserve payload-from-manifest proof.',
    args.receipt.receipt?.secretValuesPrinted === false ? null : 'Receipt may have printed secret values.',
    ...(args.manifest.blockers || []),
    ...(args.receipt.blockers || []),
  ].filter((item): item is string => Boolean(item));
  const status: ReportStatus = blockers.length ? 'blocked' : 'pass';
  const report: Omit<FiveModelDiscordOneRowRehearsalReceiptAuditReport, 'markdown'> = {
    reportType: 'five_model_discord_one_row_rehearsal_receipt_audit',
    generatedAt,
    status,
    authority: {
      localOnly: true,
      readsManifestOnly: true,
      readsReceiptOnly: true,
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
      receiptPath: args.receiptPath,
    },
    verifiedReceipt: {
      candidateId: candidate?.candidateId || null,
      sourceCardId: candidate?.sourceCardId || null,
      idempotencyKey: candidate?.idempotencyKey || null,
      discordMessageIdPresent: receiptMessagePresent,
      payloadPreviewCompared: payloadCompared,
    },
    summary: {
      manifestPassed: args.manifest.status === 'pass',
      receiptAccepted: status === 'pass',
      candidateSelectedRows: status === 'pass' ? 1 : 0,
      payloadSelectedRows: status === 'pass' ? 1 : 0,
      discordPostRows: status === 'pass' ? 1 : 0,
      webhookCallRows: 0,
      supabaseWriteRows: 0,
      liveSupabaseReadRows: 0,
      liveBridgeReadRows: 0,
      canExecuteTrueRows: 0,
      canExecuteChangedRows: 0,
      tradingLogicChangedRows: 0,
      automatedOrderRows: 0,
      duplicateReceiptRows: args.receipt.contract?.duplicateProductionReceiptFound ? 1 : 0,
      blockedRows: blockers.length,
      recommendation: status === 'pass'
        ? 'ready_for_guarded_live_lane_closeout'
        : 'hold_for_five_model_rehearsal_receipt_fix',
    },
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeFiveModelDiscordOneRowRehearsalReceiptAuditReport(
  report: FiveModelDiscordOneRowRehearsalReceiptAuditReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `five-model-discord-one-row-rehearsal-receipt-audit-${stamp}.json`);
  const markdownPath = path.join(outDir, `five-model-discord-one-row-rehearsal-receipt-audit-${stamp}.md`);
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
  const receiptPath = path.resolve(options.receiptPath ||
    latestReportByType(outDir, 'five_model_discord_one_row_production_rehearsal_receipt') ||
    '');
  for (const filePath of [manifestPath, receiptPath]) {
    if (!fs.existsSync(filePath)) throw new Error(`Missing five-model receipt-audit source artifact: ${filePath}`);
  }
  const report = buildFiveModelDiscordOneRowRehearsalReceiptAuditReport({
    manifestPath,
    manifest: readJson<ManifestReport>(manifestPath),
    receiptPath,
    receipt: readJson<ReceiptReport>(receiptPath),
  });
  const written = writeFiveModelDiscordOneRowRehearsalReceiptAuditReport(report, outDir);
  if (options.json) {
    console.log(JSON.stringify({
      ...written,
      status: report.status,
      summary: report.summary,
      verifiedReceipt: report.verifiedReceipt,
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
