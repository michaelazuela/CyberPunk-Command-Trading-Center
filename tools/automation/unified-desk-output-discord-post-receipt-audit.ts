import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

interface ProductionPublishReceipt {
  reportType: 'unified_desk_output_discord_one_row_production_publish_receipt' | string;
  generatedAt: string;
  status: 'pass' | 'blocked' | string;
  authority: {
    postsDiscord: boolean;
    webhookCalls: number;
    writesSupabase: boolean;
    readsLiveSupabase: boolean;
    readsLiveBridge: boolean;
    printsSecretValues: boolean;
    changesTradingLogic: boolean;
    changesCanExecute: boolean;
    automatedOrders: boolean;
  };
  source: {
    finalLaunchManifestPath: string;
    finalLaunchManifestGeneratedAt: string;
  };
  request: {
    candidateId: string | null;
    idempotencyKey: string | null;
    explicitApprovalFlagPresent: boolean;
    explicitApprovalPhrasePresent: boolean;
  };
  summary: {
    manifestPassed: boolean;
    candidateMatched: boolean;
    idempotencyKeyMatched: boolean;
    explicitApprovalFlagPresent: boolean;
    explicitApprovalPhrasePresent: boolean;
    productionSendArmed: boolean;
    publishDiscordRows: number;
    realPostAllowedRows: number;
    webhookCallRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    blockedRows: number;
  };
  receipt: {
    discordMessageId: string | null;
    webhookWaitReadback: boolean;
    payloadMatchedManifestCandidate: boolean;
    secretValuesPrinted: false;
  };
  blockers: string[];
}

interface FinalLaunchManifest {
  reportType: 'unified_desk_output_discord_final_launch_manifest' | string;
  generatedAt: string;
  status: 'pass' | 'blocked' | string;
  source: {
    oneRowRehearsalPlanPath: string;
  };
  launchContract: {
    candidateId: string | null;
    idempotencyKey: string | null;
    oneRowCap: boolean;
    productionSendEnabledNow: boolean;
  };
}

interface OneRowRehearsalPlan {
  reportType: 'unified_desk_output_discord_one_row_publish_rehearsal_plan' | string;
  generatedAt: string;
  status: 'pass' | 'blocked' | string;
  rehearsalCandidate: {
    id: string;
    idempotencyKey: string;
    payloadPreview: string;
    publishDiscord: boolean;
    webhookCalls: number;
    canExecute: boolean;
  } | null;
}

export interface UnifiedDeskOutputDiscordPostReceiptAuditReport {
  reportType: 'unified_desk_output_discord_post_receipt_audit';
  generatedAt: string;
  status: 'pass' | 'blocked';
  authority: {
    localOnly: true;
    readsSavedProductionReceiptOnly: true;
    readsSavedFinalLaunchManifestOnly: true;
    readsSavedOneRowRehearsalPlanOnly: true;
    postsDiscord: false;
    webhookCalls: 0;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    printsSecretValues: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    automatedOrders: false;
  };
  source: {
    productionReceiptPath: string;
    productionReceiptGeneratedAt: string;
    finalLaunchManifestPath: string;
    finalLaunchManifestGeneratedAt: string;
    oneRowRehearsalPlanPath: string;
    oneRowRehearsalPlanGeneratedAt: string;
  };
  summary: {
    receiptAccepted: boolean;
    discordMessageIdPresent: boolean;
    webhookWaitReadback: boolean;
    publishDiscordRows: number;
    realPostAllowedRows: number;
    webhookCallRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    payloadMatchedManifestCandidate: boolean;
    payloadPreviewCompared: boolean;
    manifestCandidateMatched: boolean;
    manifestIdempotencyKeyMatched: boolean;
    rehearsalCandidateMatched: boolean;
    rehearsalPayloadPresent: boolean;
    blockedRows: number;
    recommendation: 'one_row_discord_rehearsal_accepted' | 'hold_for_receipt_audit_fix';
  };
  blockers: string[];
  markdown: string;
}

interface CliOptions {
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
    receiptPath: readFlag(args, '--receipt'),
    outDir: readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR,
    json: args.includes('--json'),
  };
}

function latestProductionReceipt(reportDir: string): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => /^unified-desk-output-discord-one-row-production-publish.*-\d+\.json$/.test(name))
    .map((name) => path.join(reportDir, name))
    .filter((filePath) => {
      try {
        const report = readJson<ProductionPublishReceipt>(filePath);
        return report.reportType === 'unified_desk_output_discord_one_row_production_publish_receipt';
      } catch {
        return false;
      }
    })
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function buildMarkdown(report: Omit<UnifiedDeskOutputDiscordPostReceiptAuditReport, 'markdown'>): string {
  return [
    '# Unified Desk Output Discord Post-Receipt Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local saved-artifact audit only. It does not call Discord, Supabase, NinjaTrader, or any live service.',
    '',
    '## Summary',
    `- Receipt accepted: ${report.summary.receiptAccepted}.`,
    `- Discord message id present: ${report.summary.discordMessageIdPresent}.`,
    `- Webhook wait readback: ${report.summary.webhookWaitReadback}.`,
    `- publishDiscord rows: ${report.summary.publishDiscordRows}.`,
    `- Real-post-allowed rows: ${report.summary.realPostAllowedRows}.`,
    `- Webhook-call rows: ${report.summary.webhookCallRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-Supabase-read rows: ${report.summary.liveSupabaseReadRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Payload matched manifest candidate: ${report.summary.payloadMatchedManifestCandidate}.`,
    `- Payload preview compared: ${report.summary.payloadPreviewCompared}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildUnifiedDeskOutputDiscordPostReceiptAuditReport(args: {
  receiptPath: string;
  receipt: ProductionPublishReceipt;
  manifestPath: string;
  manifest: FinalLaunchManifest;
  rehearsalPath: string;
  rehearsal: OneRowRehearsalPlan;
}, generatedAt = new Date().toISOString()): UnifiedDeskOutputDiscordPostReceiptAuditReport {
  const manifestCandidateMatched = args.receipt.request.candidateId === args.manifest.launchContract.candidateId;
  const manifestIdempotencyKeyMatched = args.receipt.request.idempotencyKey === args.manifest.launchContract.idempotencyKey;
  const rehearsalCandidateMatched = Boolean(
    args.rehearsal.rehearsalCandidate &&
      args.receipt.request.candidateId === args.rehearsal.rehearsalCandidate.id &&
      args.receipt.request.idempotencyKey === args.rehearsal.rehearsalCandidate.idempotencyKey,
  );
  const rehearsalPayloadPresent = Boolean(args.rehearsal.rehearsalCandidate?.payloadPreview.trim());
  const payloadPreviewCompared = manifestCandidateMatched && rehearsalCandidateMatched && rehearsalPayloadPresent;
  const blockers = [
    args.receipt.reportType === 'unified_desk_output_discord_one_row_production_publish_receipt'
      ? null
      : 'Source report is not a production publish receipt.',
    args.receipt.status === 'pass' ? null : `Production receipt status is ${args.receipt.status}.`,
    args.receipt.receipt.discordMessageId ? null : 'Production receipt has no Discord message id.',
    args.receipt.receipt.webhookWaitReadback ? null : 'Production receipt did not use webhook wait readback.',
    args.receipt.summary.publishDiscordRows === 1 ? null : 'Production receipt did not record exactly one publishDiscord row.',
    args.receipt.summary.realPostAllowedRows === 1 ? null : 'Production receipt did not record exactly one real-post-allowed row.',
    args.receipt.summary.webhookCallRows === 1 ? null : 'Production receipt did not record exactly one webhook call.',
    args.receipt.summary.supabaseWriteRows === 0 ? null : 'Production receipt recorded Supabase writes.',
    args.receipt.summary.liveSupabaseReadRows === 0 ? null : 'Production receipt recorded live Supabase reads.',
    args.receipt.summary.liveBridgeReadRows === 0 ? null : 'Production receipt recorded live bridge reads.',
    args.receipt.summary.canExecuteTrueRows === 0 ? null : 'Production receipt recorded canExecute=true rows.',
    args.receipt.authority.writesSupabase === false ? null : 'Production receipt authority writes Supabase.',
    args.receipt.authority.readsLiveSupabase === false ? null : 'Production receipt authority reads live Supabase.',
    args.receipt.authority.readsLiveBridge === false ? null : 'Production receipt authority reads live bridge.',
    args.receipt.authority.changesTradingLogic === false ? null : 'Production receipt authority changes trading logic.',
    args.receipt.authority.changesCanExecute === false ? null : 'Production receipt authority changes canExecute.',
    args.receipt.authority.automatedOrders === false ? null : 'Production receipt authority allows automated orders.',
    args.receipt.receipt.secretValuesPrinted === false ? null : 'Production receipt printed secret values.',
    args.manifest.reportType === 'unified_desk_output_discord_final_launch_manifest'
      ? null
      : 'Source manifest is not a final launch manifest.',
    args.manifest.status === 'pass' ? null : `Final launch manifest status is ${args.manifest.status}.`,
    args.manifest.launchContract.oneRowCap === true ? null : 'Final launch manifest did not preserve one-row cap.',
    args.manifest.launchContract.productionSendEnabledNow === false ? null : 'Final launch manifest enabled production sending by default.',
    manifestCandidateMatched ? null : 'Receipt candidate id does not match manifest.',
    manifestIdempotencyKeyMatched ? null : 'Receipt idempotency key does not match manifest.',
    args.rehearsal.reportType === 'unified_desk_output_discord_one_row_publish_rehearsal_plan'
      ? null
      : 'Source rehearsal is not a one-row publish rehearsal plan.',
    args.rehearsal.status === 'pass' ? null : `One-row rehearsal status is ${args.rehearsal.status}.`,
    rehearsalCandidateMatched ? null : 'Receipt candidate/idempotency does not match rehearsal candidate.',
    rehearsalPayloadPresent ? null : 'One-row rehearsal payload preview is missing.',
    args.rehearsal.rehearsalCandidate?.publishDiscord === false ? null : 'One-row rehearsal candidate was not disabled for Discord publishing.',
    args.rehearsal.rehearsalCandidate?.webhookCalls === 0 ? null : 'One-row rehearsal candidate recorded webhook calls.',
    args.rehearsal.rehearsalCandidate?.canExecute === false ? null : 'One-row rehearsal candidate had canExecute=true.',
    ...args.receipt.blockers,
  ].filter((item): item is string => Boolean(item));
  const report: Omit<UnifiedDeskOutputDiscordPostReceiptAuditReport, 'markdown'> = {
    reportType: 'unified_desk_output_discord_post_receipt_audit',
    generatedAt,
    status: blockers.length ? 'blocked' : 'pass',
    authority: {
      localOnly: true,
      readsSavedProductionReceiptOnly: true,
      readsSavedFinalLaunchManifestOnly: true,
      readsSavedOneRowRehearsalPlanOnly: true,
      postsDiscord: false,
      webhookCalls: 0,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      printsSecretValues: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      automatedOrders: false,
    },
    source: {
      productionReceiptPath: args.receiptPath,
      productionReceiptGeneratedAt: args.receipt.generatedAt,
      finalLaunchManifestPath: args.manifestPath,
      finalLaunchManifestGeneratedAt: args.manifest.generatedAt,
      oneRowRehearsalPlanPath: args.rehearsalPath,
      oneRowRehearsalPlanGeneratedAt: args.rehearsal.generatedAt,
    },
    summary: {
      receiptAccepted: blockers.length === 0,
      discordMessageIdPresent: Boolean(args.receipt.receipt.discordMessageId),
      webhookWaitReadback: args.receipt.receipt.webhookWaitReadback,
      publishDiscordRows: args.receipt.summary.publishDiscordRows,
      realPostAllowedRows: args.receipt.summary.realPostAllowedRows,
      webhookCallRows: args.receipt.summary.webhookCallRows,
      supabaseWriteRows: args.receipt.summary.supabaseWriteRows,
      liveSupabaseReadRows: args.receipt.summary.liveSupabaseReadRows,
      liveBridgeReadRows: args.receipt.summary.liveBridgeReadRows,
      canExecuteTrueRows: args.receipt.summary.canExecuteTrueRows,
      payloadMatchedManifestCandidate: args.receipt.receipt.payloadMatchedManifestCandidate && manifestCandidateMatched,
      payloadPreviewCompared,
      manifestCandidateMatched,
      manifestIdempotencyKeyMatched,
      rehearsalCandidateMatched,
      rehearsalPayloadPresent,
      blockedRows: blockers.length,
      recommendation: blockers.length ? 'hold_for_receipt_audit_fix' : 'one_row_discord_rehearsal_accepted',
    },
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeUnifiedDeskOutputDiscordPostReceiptAuditReport(
  report: UnifiedDeskOutputDiscordPostReceiptAuditReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-desk-output-discord-post-receipt-audit-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-desk-output-discord-post-receipt-audit-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const receiptPath = path.resolve(options.receiptPath || latestProductionReceipt(DEFAULT_REPORT_DIR) || '');
  if (!fs.existsSync(receiptPath)) throw new Error('Missing Unified Desk Output Discord production receipt path.');
  const receipt = readJson<ProductionPublishReceipt>(receiptPath);
  const manifestPath = path.resolve(receipt.source.finalLaunchManifestPath);
  if (!fs.existsSync(manifestPath)) throw new Error('Missing Unified Desk Output Discord final launch manifest path.');
  const manifest = readJson<FinalLaunchManifest>(manifestPath);
  const rehearsalPath = path.resolve(manifest.source.oneRowRehearsalPlanPath);
  if (!fs.existsSync(rehearsalPath)) throw new Error('Missing Unified Desk Output Discord one-row rehearsal plan path.');
  const report = buildUnifiedDeskOutputDiscordPostReceiptAuditReport({
    receiptPath,
    receipt,
    manifestPath,
    manifest,
    rehearsalPath,
    rehearsal: readJson<OneRowRehearsalPlan>(rehearsalPath),
  });
  const written = writeUnifiedDeskOutputDiscordPostReceiptAuditReport(report, path.resolve(options.outDir));
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
