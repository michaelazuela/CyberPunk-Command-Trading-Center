import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type ReportStatus = 'pass' | 'blocked';

interface DiscordPreviewPayload {
  username: string;
  content: string;
  embeds?: unknown[];
}

interface FiveModelOneRowManifest {
  reportType?: string;
  status?: string;
  selectedCandidate?: {
    candidateId: string;
    sourceCardId: string;
    idempotencyKey: string;
    approvalPhrase: string;
    productionWebhookEnabledNow: false;
    payloadPreview: DiscordPreviewPayload;
  } | null;
  summary?: Record<string, unknown>;
  blockers?: string[];
}

interface FiveModelDiscordOneRowProductionRehearsalReport {
  reportType: 'five_model_discord_one_row_production_rehearsal_disabled_sender' | 'five_model_discord_one_row_production_rehearsal_receipt';
  generatedAt: string;
  status: ReportStatus;
  authority: {
    localOnly: boolean;
    readsManifestOnly: true;
    validatesOneRowSenderContract: true;
    productionSendArmed: boolean;
    postsDiscord: boolean;
    webhookCalls: 0 | 1;
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
  };
  request: {
    candidateId: string | null;
    idempotencyKey: string | null;
    explicitApprovalFlagPresent: boolean;
    explicitApprovalPhrasePresent: boolean;
    executeProductionWebhook: boolean;
  };
  contract: {
    manifestMatched: boolean;
    oneRowCap: true;
    candidateMatched: boolean;
    idempotencyKeyMatched: boolean;
    duplicateProductionReceiptFound: boolean;
    route: 'five_model_production_discord_trade_plan_webhook';
    productionSendArmed: boolean;
    productionSendBlockedReason: 'disabled_sender_contract_only' | 'preflight_blocked' | null;
  };
  summary: {
    manifestPassed: boolean;
    candidateSelectedRows: number;
    payloadSelectedRows: number;
    explicitApprovalFlagPresent: boolean;
    explicitApprovalPhrasePresent: boolean;
    productionSendArmed: boolean;
    discordPostRows: 0 | 1;
    webhookCallRows: 0 | 1;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    canExecuteChangedRows: number;
    tradingLogicChangedRows: number;
    automatedOrderRows: number;
    blockedRows: number;
    recommendation: 'ready_for_exactly_one_five_model_production_discord_execution' | 'hold_for_five_model_production_rehearsal_sender_fix';
  };
  receipt: {
    discordMessageId: string | null;
    webhookWaitReadback: boolean;
    idempotencyKey: string | null;
    payloadCopiedFromManifest: boolean;
    secretValuesPrinted: false;
  };
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  manifestPath: string | null;
  candidateId: string | null;
  idempotencyKey: string | null;
  approvalFlag: boolean;
  approvalPhrase: string | null;
  executeProductionWebhook: boolean;
  outDir: string;
  json: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const APPROVAL_PHRASE = 'I approve exactly one five-model Discord production rehearsal for the manifest candidate and idempotency key.';
const WEBHOOK_ENV_KEYS = ['QUANT_DESK_SCANNER_WEBHOOK_URL', 'SCANNER_DISCORD_WEBHOOK_URL', 'DISCORD_WEBHOOK_URL'] as const;

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function parseArgs(args = process.argv.slice(2)): CliOptions {
  return {
    manifestPath: readFlag(args, '--manifest'),
    candidateId: readFlag(args, '--candidate-id'),
    idempotencyKey: readFlag(args, '--idempotency-key'),
    approvalFlag: args.includes('--i-approve-one-five-model-discord-post'),
    approvalPhrase: readFlag(args, '--approval-phrase'),
    executeProductionWebhook: args.includes('--execute-production-webhook'),
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

function parseEnvFile(filePath: string): Map<string, string> {
  const values = new Map<string, string>();
  if (!fs.existsSync(filePath)) return values;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
    if (!match) continue;
    values.set(match[1], match[2].trim().replace(/^['"]|['"]$/g, ''));
  }
  return values;
}

function loadScannerWebhookUrl(): string {
  const envLocal = parseEnvFile(path.resolve(__dirname, '..', '..', '.env.local'));
  for (const key of WEBHOOK_ENV_KEYS) {
    const value = process.env[key] || envLocal.get(key) || '';
    if (value) return value;
  }
  throw new Error('Scanner Discord webhook is not configured.');
}

function priorReceiptExists(outDir: string, idempotencyKey: string | null): boolean {
  if (!idempotencyKey || !fs.existsSync(outDir)) return false;
  return fs.readdirSync(outDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => path.join(outDir, name))
    .some((filePath) => {
      try {
        const report = readJson<FiveModelDiscordOneRowProductionRehearsalReport>(filePath);
        return report.reportType === 'five_model_discord_one_row_production_rehearsal_receipt' &&
          report.receipt?.idempotencyKey === idempotencyKey &&
          report.summary?.webhookCallRows === 1;
      } catch {
        return false;
      }
    });
}

async function postOneDiscordWebhook(webhookUrl: string, payload: DiscordPreviewPayload): Promise<string | null> {
  const url = new URL(webhookUrl);
  url.searchParams.set('wait', 'true');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      allowed_mentions: { parse: [] },
    }),
  });
  if (!response.ok) throw new Error(`Discord webhook failed (${response.status}).`);
  const body = await response.text();
  if (!body.trim()) return null;
  const parsed = JSON.parse(body) as { id?: unknown };
  return typeof parsed.id === 'string' ? parsed.id : null;
}

function buildMarkdown(report: Omit<FiveModelDiscordOneRowProductionRehearsalReport, 'markdown'>): string {
  const receipt = report.reportType === 'five_model_discord_one_row_production_rehearsal_receipt';
  return [
    receipt
      ? '# Five Model Discord One-Row Production Rehearsal Receipt'
      : '# Five Model Discord One-Row Production Rehearsal Disabled Sender',
    '',
    `Status: ${report.status}`,
    '',
    receipt
      ? 'Authority: approved one-row five-model Discord production rehearsal receipt. It records exactly one webhook call and no Supabase writes, live bridge reads, canExecute changes, trading-rule changes, or automated orders.'
      : 'Authority: disabled sender contract only. It validates the manifest, candidate id, idempotency key, and approval inputs. It does not call a webhook unless --execute-production-webhook is separately supplied.',
    '',
    '## Summary',
    `- Manifest passed: ${report.summary.manifestPassed}.`,
    `- Candidate selected rows: ${report.summary.candidateSelectedRows}.`,
    `- Payload selected rows: ${report.summary.payloadSelectedRows}.`,
    `- Explicit approval flag present: ${report.summary.explicitApprovalFlagPresent}.`,
    `- Explicit approval phrase present: ${report.summary.explicitApprovalPhrasePresent}.`,
    `- Duplicate production receipt found: ${report.contract.duplicateProductionReceiptFound}.`,
    `- Production send armed: ${report.summary.productionSendArmed}.`,
    `- Discord-post rows: ${report.summary.discordPostRows}.`,
    `- Webhook-call rows: ${report.summary.webhookCallRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Trading-logic changed rows: ${report.summary.tradingLogicChangedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    `- Discord message id present: ${Boolean(report.receipt.discordMessageId)}.`,
    `- Secret values printed: ${report.receipt.secretValuesPrinted}.`,
    '',
    '## Contract',
    `- One-row cap: ${report.contract.oneRowCap}.`,
    `- Route: ${report.contract.route}.`,
    `- Production send blocked reason: ${report.contract.productionSendBlockedReason || 'none'}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildFiveModelDiscordOneRowProductionRehearsalReport(args: {
  manifestPath: string;
  manifest: FiveModelOneRowManifest;
  candidateId: string | null;
  idempotencyKey: string | null;
  explicitApprovalFlagPresent: boolean;
  approvalPhrase: string | null;
  executeProductionWebhook: boolean;
  duplicateProductionReceiptFound?: boolean;
  discordMessageId?: string | null;
}, generatedAt = new Date().toISOString()): FiveModelDiscordOneRowProductionRehearsalReport {
  const candidate = args.manifest.selectedCandidate || null;
  const candidateMatched = Boolean(candidate && args.candidateId === candidate.candidateId);
  const idempotencyKeyMatched = Boolean(candidate && args.idempotencyKey === candidate.idempotencyKey);
  const explicitApprovalPhrasePresent = args.approvalPhrase === APPROVAL_PHRASE &&
    candidate?.approvalPhrase === APPROVAL_PHRASE;
  const duplicateProductionReceiptFound = Boolean(args.duplicateProductionReceiptFound);
  const blockers = [
    args.manifest.reportType === 'five_model_discord_one_row_rehearsal_manifest' ? null : 'Manifest report type is invalid.',
    args.manifest.status === 'pass' ? null : `Manifest status is ${args.manifest.status || '<missing>'}.`,
    args.manifest.summary?.recommendation === 'ready_for_exactly_one_five_model_discord_rehearsal_approval'
      ? null
      : 'Manifest is not ready for one-row five-model Discord rehearsal approval.',
    numberValue(args.manifest.summary?.candidateSelectedRows) === 1 ? null : 'Manifest does not select exactly one candidate.',
    numberValue(args.manifest.summary?.payloadSelectedRows) === 1 ? null : 'Manifest does not select exactly one payload.',
    numberValue(args.manifest.summary?.discordPostRows) === 0 ? null : 'Manifest has Discord-post rows.',
    numberValue(args.manifest.summary?.webhookCallRows) === 0 ? null : 'Manifest has webhook-call rows.',
    numberValue(args.manifest.summary?.supabaseWriteRows) === 0 ? null : 'Manifest has Supabase-write rows.',
    numberValue(args.manifest.summary?.liveSupabaseReadRows) === 0 ? null : 'Manifest has live Supabase read rows.',
    numberValue(args.manifest.summary?.liveBridgeReadRows) === 0 ? null : 'Manifest has live bridge read rows.',
    numberValue(args.manifest.summary?.canExecuteTrueRows) === 0 ? null : 'Manifest has canExecute=true rows.',
    numberValue(args.manifest.summary?.canExecuteChangedRows) === 0 ? null : 'Manifest changed canExecute.',
    numberValue(args.manifest.summary?.tradingLogicChangedRows) === 0 ? null : 'Manifest changed trading logic.',
    numberValue(args.manifest.summary?.automatedOrderRows) === 0 ? null : 'Manifest has automated-order rows.',
    candidate ? null : 'Manifest has no selected candidate.',
    candidate?.productionWebhookEnabledNow === false ? null : 'Manifest already enables production webhook.',
    candidate?.payloadPreview ? null : 'Manifest selected candidate has no payload preview.',
    candidateMatched ? null : 'Requested candidate id does not match manifest.',
    idempotencyKeyMatched ? null : 'Requested idempotency key does not match manifest.',
    args.explicitApprovalFlagPresent ? null : 'Explicit approval flag is missing.',
    explicitApprovalPhrasePresent ? null : 'Explicit approval phrase is missing or does not match.',
    duplicateProductionReceiptFound ? 'A production receipt already exists for this idempotency key.' : null,
    ...(args.manifest.blockers || []),
  ].filter((item): item is string => Boolean(item));
  const productionSendArmed = args.executeProductionWebhook && blockers.length === 0;
  const report: Omit<FiveModelDiscordOneRowProductionRehearsalReport, 'markdown'> = {
    reportType: productionSendArmed
      ? 'five_model_discord_one_row_production_rehearsal_receipt'
      : 'five_model_discord_one_row_production_rehearsal_disabled_sender',
    generatedAt,
    status: blockers.length ? 'blocked' : 'pass',
    authority: {
      localOnly: !productionSendArmed,
      readsManifestOnly: true,
      validatesOneRowSenderContract: true,
      productionSendArmed,
      postsDiscord: productionSendArmed,
      webhookCalls: productionSendArmed ? 1 : 0,
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
    source: { manifestPath: args.manifestPath },
    request: {
      candidateId: args.candidateId,
      idempotencyKey: args.idempotencyKey,
      explicitApprovalFlagPresent: args.explicitApprovalFlagPresent,
      explicitApprovalPhrasePresent,
      executeProductionWebhook: args.executeProductionWebhook,
    },
    contract: {
      manifestMatched: blockers.length === 0,
      oneRowCap: true,
      candidateMatched,
      idempotencyKeyMatched,
      duplicateProductionReceiptFound,
      route: 'five_model_production_discord_trade_plan_webhook',
      productionSendArmed,
      productionSendBlockedReason: productionSendArmed
        ? null
        : blockers.length
          ? 'preflight_blocked'
          : 'disabled_sender_contract_only',
    },
    summary: {
      manifestPassed: args.manifest.status === 'pass',
      candidateSelectedRows: blockers.length ? 0 : 1,
      payloadSelectedRows: blockers.length ? 0 : 1,
      explicitApprovalFlagPresent: args.explicitApprovalFlagPresent,
      explicitApprovalPhrasePresent,
      productionSendArmed,
      discordPostRows: productionSendArmed ? 1 : 0,
      webhookCallRows: productionSendArmed ? 1 : 0,
      supabaseWriteRows: 0,
      liveSupabaseReadRows: 0,
      liveBridgeReadRows: 0,
      canExecuteTrueRows: 0,
      canExecuteChangedRows: 0,
      tradingLogicChangedRows: 0,
      automatedOrderRows: 0,
      blockedRows: blockers.length,
      recommendation: blockers.length
        ? 'hold_for_five_model_production_rehearsal_sender_fix'
        : 'ready_for_exactly_one_five_model_production_discord_execution',
    },
    receipt: {
      discordMessageId: args.discordMessageId || null,
      webhookWaitReadback: productionSendArmed,
      idempotencyKey: candidate?.idempotencyKey || null,
      payloadCopiedFromManifest: Boolean(candidate?.payloadPreview),
      secretValuesPrinted: false,
    },
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeFiveModelDiscordOneRowProductionRehearsalReport(
  report: FiveModelDiscordOneRowProductionRehearsalReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const prefix = report.reportType === 'five_model_discord_one_row_production_rehearsal_receipt'
    ? 'five-model-discord-one-row-production-rehearsal-receipt'
    : 'five-model-discord-one-row-production-rehearsal-disabled-sender';
  const jsonPath = path.join(outDir, `${prefix}-${stamp}.json`);
  const markdownPath = path.join(outDir, `${prefix}-${stamp}.md`);
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
  if (!fs.existsSync(manifestPath)) throw new Error(`Missing five-model Discord one-row rehearsal manifest: ${manifestPath}`);
  const manifest = readJson<FiveModelOneRowManifest>(manifestPath);
  const duplicateFound = priorReceiptExists(outDir, options.idempotencyKey);
  let discordMessageId: string | null = null;
  if (options.executeProductionWebhook) {
    const preflight = buildFiveModelDiscordOneRowProductionRehearsalReport({
      manifestPath,
      manifest,
      candidateId: options.candidateId,
      idempotencyKey: options.idempotencyKey,
      explicitApprovalFlagPresent: options.approvalFlag,
      approvalPhrase: options.approvalPhrase,
      executeProductionWebhook: false,
      duplicateProductionReceiptFound: duplicateFound,
    });
    if (preflight.status !== 'pass') {
      throw new Error(`Five-model Discord production rehearsal blocked by preflight: ${preflight.blockers.join('; ')}`);
    }
    const payload = manifest.selectedCandidate?.payloadPreview;
    if (!payload) throw new Error('Five-model Discord production rehearsal blocked: payload preview is missing.');
    discordMessageId = await postOneDiscordWebhook(loadScannerWebhookUrl(), payload);
    if (!discordMessageId) throw new Error('Discord webhook did not return a message id.');
  }
  const report = buildFiveModelDiscordOneRowProductionRehearsalReport({
    manifestPath,
    manifest,
    candidateId: options.candidateId,
    idempotencyKey: options.idempotencyKey,
    explicitApprovalFlagPresent: options.approvalFlag,
    approvalPhrase: options.approvalPhrase,
    executeProductionWebhook: options.executeProductionWebhook,
    duplicateProductionReceiptFound: duplicateFound,
    discordMessageId,
  });
  const written = writeFiveModelDiscordOneRowProductionRehearsalReport(report, outDir);
  if (options.json) {
    console.log(JSON.stringify({
      ...written,
      status: report.status,
      summary: report.summary,
      contract: report.contract,
      receipt: report.receipt,
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
