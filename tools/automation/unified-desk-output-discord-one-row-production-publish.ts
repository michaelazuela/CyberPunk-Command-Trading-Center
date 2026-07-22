import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

interface DiscordFinalLaunchManifestReport {
  reportType: 'unified_desk_output_discord_final_launch_manifest';
  generatedAt: string;
  status: 'pass' | 'blocked';
  authority: {
    localOnly: true;
    readsSavedWebhookTargetAuditOnly: true;
    readsSavedOneRowRehearsalPlanOnly: true;
    writesLaunchManifestOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    printsSecretValues: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    automatedOrders: false;
  };
  source: {
    webhookTargetAuditPath: string;
    oneRowRehearsalPlanPath: string;
    webhookTargetAuditGeneratedAt: string;
    oneRowRehearsalPlanGeneratedAt: string;
  };
  launchContract: {
    commandExistsNow: false;
    proposedCommand: string;
    explicitApprovalPhrase: 'I approve exactly one Unified Desk Output Discord production publish rehearsal.';
    candidateId: string | null;
    idempotencyKey: string | null;
    route: 'production_discord_trade_plan_webhook';
    oneRowCap: true;
    productionSendEnabledNow: false;
  };
  summary: {
    webhookTargetReady: boolean;
    rehearsalPlanReady: boolean;
    candidateSelectedRows: number;
    commandExistsNow: false;
    productionSendEnabledNow: false;
    explicitApprovalPresent: false;
    shouldPostRows: number;
    publishDiscordRows: number;
    realPostAllowedRows: number;
    webhookCallRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    readbackSteps: number;
    rollbackSteps: number;
    blockedRows: number;
    recommendation: 'ready_to_install_disabled_one_row_sender' | 'hold_for_final_launch_manifest_fix';
  };
  readbackSteps: string[];
  rollbackSteps: string[];
  blockers: string[];
}

interface DisabledSenderReceipt {
  reportType: 'unified_desk_output_discord_one_row_production_publish_disabled_sender';
  generatedAt: string;
  status: 'pass' | 'blocked';
  authority: {
    localOnly: true;
    readsSavedFinalLaunchManifestOnly: true;
    validatesOneRowSenderContractOnly: true;
    productionSendArmed: false;
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
    finalLaunchManifestPath: string;
    finalLaunchManifestGeneratedAt: string;
  };
  request: {
    candidateId: string | null;
    idempotencyKey: string | null;
    explicitApprovalFlagPresent: boolean;
    explicitApprovalPhrasePresent: boolean;
  };
  contract: {
    manifestMatched: boolean;
    oneRowCap: boolean;
    route: 'production_discord_trade_plan_webhook';
    commandExistsNow: true;
    productionSendArmed: false;
    productionSendBlockedReason: 'disabled_sender_contract_only';
  };
  summary: {
    manifestPassed: boolean;
    candidateMatched: boolean;
    idempotencyKeyMatched: boolean;
    explicitApprovalFlagPresent: boolean;
    explicitApprovalPhrasePresent: boolean;
    productionSendArmed: false;
    shouldPostRows: number;
    publishDiscordRows: number;
    realPostAllowedRows: number;
    webhookCallRows: 0;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    blockedRows: number;
    recommendation: 'ready_for_final_explicit_one_row_production_execution' | 'hold_for_disabled_sender_contract_fix';
  };
  readbackSteps: string[];
  rollbackSteps: string[];
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  manifestPath: string | null;
  candidateId: string | null;
  idempotencyKey: string | null;
  approvalFlag: boolean;
  approvalPhrase: string | null;
  outDir: string;
  json: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const APPROVAL_PHRASE = 'I approve exactly one Unified Desk Output Discord production publish rehearsal.';

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
    approvalFlag: args.includes('--i-approve-one-discord-post'),
    approvalPhrase: readFlag(args, '--approval-phrase'),
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

function buildMarkdown(report: Omit<DisabledSenderReceipt, 'markdown'>): string {
  return [
    '# Unified Desk Output Discord One-Row Production Publish Disabled Sender',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: disabled sender contract only. It validates the manifest, candidate id, idempotency key, and approval inputs, but productionSendArmed remains false and no Discord webhook is called.',
    '',
    '## Summary',
    `- Manifest passed: ${report.summary.manifestPassed}.`,
    `- Candidate matched: ${report.summary.candidateMatched}.`,
    `- Idempotency key matched: ${report.summary.idempotencyKeyMatched}.`,
    `- Explicit approval flag present: ${report.summary.explicitApprovalFlagPresent}.`,
    `- Explicit approval phrase present: ${report.summary.explicitApprovalPhrasePresent}.`,
    `- Production send armed: ${report.summary.productionSendArmed}.`,
    `- shouldPost rows: ${report.summary.shouldPostRows}.`,
    `- publishDiscord rows: ${report.summary.publishDiscordRows}.`,
    `- Real-post-allowed rows: ${report.summary.realPostAllowedRows}.`,
    `- Webhook-call rows: ${report.summary.webhookCallRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-Supabase-read rows: ${report.summary.liveSupabaseReadRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Blocked rows: ${report.summary.blockedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Contract',
    `- Route: ${report.contract.route}`,
    `- Command exists now: ${report.contract.commandExistsNow}`,
    `- Production send blocked reason: ${report.contract.productionSendBlockedReason}`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildUnifiedDeskOutputDiscordOneRowProductionPublishDisabledSenderReport(args: {
  manifestPath: string;
  manifestReport: DiscordFinalLaunchManifestReport;
  candidateId: string | null;
  idempotencyKey: string | null;
  explicitApprovalFlagPresent: boolean;
  approvalPhrase: string | null;
}, generatedAt = new Date().toISOString()): DisabledSenderReceipt {
  const manifest = args.manifestReport;
  const candidateMatched = Boolean(args.candidateId && args.candidateId === manifest.launchContract.candidateId);
  const idempotencyKeyMatched = Boolean(args.idempotencyKey && args.idempotencyKey === manifest.launchContract.idempotencyKey);
  const explicitApprovalPhrasePresent = args.approvalPhrase === APPROVAL_PHRASE;
  const blockers = [
    manifest.reportType === 'unified_desk_output_discord_final_launch_manifest'
      ? null
      : 'Source report is not Unified Desk Output Discord final launch manifest.',
    manifest.status === 'pass' ? null : `Final launch manifest status is ${manifest.status}.`,
    manifest.summary.recommendation === 'ready_to_install_disabled_one_row_sender'
      ? null
      : `Final launch manifest recommendation is ${manifest.summary.recommendation}.`,
    manifest.authority.postsDiscord === false ? null : 'Final launch manifest posts Discord.',
    manifest.authority.writesSupabase === false ? null : 'Final launch manifest writes Supabase.',
    manifest.authority.readsLiveSupabase === false ? null : 'Final launch manifest reads live Supabase.',
    manifest.authority.readsLiveBridge === false ? null : 'Final launch manifest reads live bridge.',
    manifest.authority.changesTradingLogic === false ? null : 'Final launch manifest changes trading logic.',
    manifest.authority.changesCanExecute === false ? null : 'Final launch manifest changes canExecute.',
    manifest.authority.automatedOrders === false ? null : 'Final launch manifest allows automated orders.',
    manifest.summary.webhookTargetReady ? null : 'Webhook target is not ready in final launch manifest.',
    manifest.summary.rehearsalPlanReady ? null : 'One-row rehearsal plan is not ready in final launch manifest.',
    manifest.summary.candidateSelectedRows === 1 ? null : 'Final launch manifest does not select exactly one candidate.',
    manifest.summary.webhookCallRows === 0 ? null : 'Final launch manifest has webhook-call rows.',
    manifest.summary.realPostAllowedRows === 0 ? null : 'Final launch manifest allows real posts.',
    manifest.summary.supabaseWriteRows === 0 ? null : 'Final launch manifest has Supabase-write rows.',
    manifest.summary.liveBridgeReadRows === 0 ? null : 'Final launch manifest has live-bridge-read rows.',
    manifest.summary.canExecuteTrueRows === 0 ? null : 'Final launch manifest has canExecute=true rows.',
    candidateMatched ? null : 'Requested candidate id does not match final launch manifest.',
    idempotencyKeyMatched ? null : 'Requested idempotency key does not match final launch manifest.',
    args.explicitApprovalFlagPresent ? null : 'Explicit approval flag is missing.',
    explicitApprovalPhrasePresent ? null : 'Explicit approval phrase is missing or does not match.',
    ...manifest.blockers,
  ].filter((item): item is string => Boolean(item));
  const report: Omit<DisabledSenderReceipt, 'markdown'> = {
    reportType: 'unified_desk_output_discord_one_row_production_publish_disabled_sender',
    generatedAt,
    status: blockers.length ? 'blocked' : 'pass',
    authority: {
      localOnly: true,
      readsSavedFinalLaunchManifestOnly: true,
      validatesOneRowSenderContractOnly: true,
      productionSendArmed: false,
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
      finalLaunchManifestPath: args.manifestPath,
      finalLaunchManifestGeneratedAt: manifest.generatedAt,
    },
    request: {
      candidateId: args.candidateId,
      idempotencyKey: args.idempotencyKey,
      explicitApprovalFlagPresent: args.explicitApprovalFlagPresent,
      explicitApprovalPhrasePresent,
    },
    contract: {
      manifestMatched: blockers.length === 0,
      oneRowCap: true,
      route: 'production_discord_trade_plan_webhook',
      commandExistsNow: true,
      productionSendArmed: false,
      productionSendBlockedReason: 'disabled_sender_contract_only',
    },
    summary: {
      manifestPassed: manifest.status === 'pass',
      candidateMatched,
      idempotencyKeyMatched,
      explicitApprovalFlagPresent: args.explicitApprovalFlagPresent,
      explicitApprovalPhrasePresent,
      productionSendArmed: false,
      shouldPostRows: 0,
      publishDiscordRows: 0,
      realPostAllowedRows: 0,
      webhookCallRows: 0,
      supabaseWriteRows: 0,
      liveSupabaseReadRows: 0,
      liveBridgeReadRows: 0,
      canExecuteTrueRows: 0,
      blockedRows: blockers.length,
      recommendation: blockers.length
        ? 'hold_for_disabled_sender_contract_fix'
        : 'ready_for_final_explicit_one_row_production_execution',
    },
    readbackSteps: manifest.readbackSteps,
    rollbackSteps: manifest.rollbackSteps,
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeUnifiedDeskOutputDiscordOneRowProductionPublishDisabledSenderReport(
  report: DisabledSenderReceipt,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-desk-output-discord-one-row-production-publish-disabled-sender-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-desk-output-discord-one-row-production-publish-disabled-sender-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const manifestPath = path.resolve(options.manifestPath ||
    latestMatchingFile(DEFAULT_REPORT_DIR, /^unified-desk-output-discord-final-launch-manifest-\d+\.json$/) ||
    '');
  if (!fs.existsSync(manifestPath)) throw new Error('Missing Unified Desk Output Discord final launch manifest path.');
  const manifestReport = readJson<DiscordFinalLaunchManifestReport>(manifestPath);
  const report = buildUnifiedDeskOutputDiscordOneRowProductionPublishDisabledSenderReport({
    manifestPath,
    manifestReport,
    candidateId: options.candidateId,
    idempotencyKey: options.idempotencyKey,
    explicitApprovalFlagPresent: options.approvalFlag,
    approvalPhrase: options.approvalPhrase,
  });
  const written = writeUnifiedDeskOutputDiscordOneRowProductionPublishDisabledSenderReport(report, path.resolve(options.outDir));
  if (options.json) {
    console.log(JSON.stringify({
      ...written,
      status: report.status,
      summary: report.summary,
      contract: report.contract,
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
