import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

interface DiscordWebhookTargetPresenceAuditReport {
  reportType: 'unified_desk_output_discord_webhook_target_presence_audit';
  generatedAt: string;
  status: 'pass';
  authority: {
    localOnly: true;
    readsSavedOneRowRehearsalPlanOnly: true;
    readsLocalEnvNamesOnly: true;
    printsSecretValues: false;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    automatedOrders: false;
  };
  source: {
    oneRowRehearsalPlanPath: string;
    envExamplePath: string;
    envLocalPath: string;
  };
  summary: {
    rehearsalPlanPassed: boolean;
    candidateSelectedRows: number;
    productionSendEnabled: false;
    explicitApprovalPresent: false;
    webhookTargetConfigured: boolean;
    webhookTargetShapeValid: boolean;
    webhookTargetVerifiedByNetwork: false;
    secretValuesPrinted: false;
    shouldPostRows: number;
    publishDiscordRows: number;
    realPostAllowedRows: number;
    webhookCallRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    readinessBlockers: number;
    recommendation: 'ready_for_explicit_one_row_discord_publish_approval' | 'hold_for_webhook_target_configuration';
  };
  readinessBlockers: string[];
}

interface DiscordOneRowPublishRehearsalPlanReport {
  reportType: 'unified_desk_output_discord_one_row_publish_rehearsal_plan';
  generatedAt: string;
  status: 'pass' | 'blocked';
  rehearsalCandidate: {
    id: string;
    idempotencyKey: string;
    route: 'production_discord_trade_plan_webhook';
    payloadPreview: string;
    productionSendEnabled: false;
    explicitApprovalPresent: false;
    webhookTargetVerified: false;
    shouldPost: false;
    publishDiscord: false;
    webhookCalls: 0;
    canExecute: false;
  } | null;
  summary: {
    candidateSelectedRows: number;
    productionSendEnabled: false;
    explicitApprovalPresent: false;
    webhookTargetVerified: false;
    shouldPostRows: number;
    publishDiscordRows: number;
    realPostAllowedRows: number;
    webhookCallRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    blockedRows: number;
    recommendation: 'ready_for_explicit_one_row_discord_publish_approval' | 'hold_for_one_row_publish_rehearsal_fix';
  };
  blockers: string[];
}

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
  markdown: string;
}

interface CliOptions {
  targetAuditPath: string | null;
  rehearsalPath: string | null;
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
    targetAuditPath: readFlag(args, '--target-audit'),
    rehearsalPath: readFlag(args, '--rehearsal'),
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

function buildProposedCommand(candidateId: string | null, idempotencyKey: string | null): string {
  return [
    'npx tsx tools/automation/unified-desk-output-discord-one-row-production-publish.ts',
    '--manifest <final-launch-manifest-json>',
    candidateId ? `--candidate-id "${candidateId}"` : '--candidate-id <candidate-id>',
    idempotencyKey ? `--idempotency-key "${idempotencyKey}"` : '--idempotency-key <idempotency-key>',
    '--i-approve-one-discord-post',
  ].join(' ');
}

function buildReadbackSteps(candidateId: string | null, idempotencyKey: string | null): string[] {
  return [
    'Confirm the sender returns one Discord message receipt with a non-empty message id.',
    'Confirm the receipt candidate id matches the manifest candidate id.',
    'Confirm the receipt idempotency key matches the manifest idempotency key.',
    'Confirm exactly one webhook call was attempted and exactly one message was created.',
    'Confirm no Supabase write, live bridge read, canExecute change, trading-rule change, or automated order occurred.',
    'Confirm the posted message content matches the approved dry-run payload text.',
    'Confirm the channel is the intended production trade-plan channel.',
    `Manifest candidate id: ${candidateId || '<none>'}.`,
    `Manifest idempotency key: ${idempotencyKey || '<none>'}.`,
  ];
}

function buildRollbackSteps(): string[] {
  return [
    'Do not rerun the production sender with the same idempotency key.',
    'Disable the one-row production sender flag or remove the explicit approval flag from the command.',
    'If the message is wrong, delete or retract only the single posted Discord message.',
    'Return to the disabled formatter dry-run before any second production attempt.',
    'Preserve the failed/success receipt artifact for audit review.',
  ];
}

function buildMarkdown(report: Omit<DiscordFinalLaunchManifestReport, 'markdown'>): string {
  return [
    '# Unified Desk Output Discord Final Launch Manifest',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: no-network launch manifest only. It names the proposed one-row production sender contract, readback checks, and rollback steps. It does not install or run a sender and does not post Discord.',
    '',
    '## Summary',
    `- Webhook target ready: ${report.summary.webhookTargetReady}.`,
    `- Rehearsal plan ready: ${report.summary.rehearsalPlanReady}.`,
    `- Candidate selected rows: ${report.summary.candidateSelectedRows}.`,
    `- Command exists now: ${report.summary.commandExistsNow}.`,
    `- Production send enabled now: ${report.summary.productionSendEnabledNow}.`,
    `- Explicit approval present: ${report.summary.explicitApprovalPresent}.`,
    `- shouldPost rows: ${report.summary.shouldPostRows}.`,
    `- publishDiscord rows: ${report.summary.publishDiscordRows}.`,
    `- Real-post-allowed rows: ${report.summary.realPostAllowedRows}.`,
    `- Webhook-call rows: ${report.summary.webhookCallRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-Supabase-read rows: ${report.summary.liveSupabaseReadRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Readback steps: ${report.summary.readbackSteps}.`,
    `- Rollback steps: ${report.summary.rollbackSteps}.`,
    `- Blocked rows: ${report.summary.blockedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Proposed Command',
    '```powershell',
    report.launchContract.proposedCommand,
    '```',
    '',
    '## Approval Phrase',
    report.launchContract.explicitApprovalPhrase,
    '',
    '## Readback Steps',
    ...report.readbackSteps.map((step) => `- ${step}`),
    '',
    '## Rollback Steps',
    ...report.rollbackSteps.map((step) => `- ${step}`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildUnifiedDeskOutputDiscordFinalLaunchManifestReport(args: {
  targetAuditPath: string;
  targetAuditReport: DiscordWebhookTargetPresenceAuditReport;
  rehearsalPath: string;
  rehearsalReport: DiscordOneRowPublishRehearsalPlanReport;
}, generatedAt = new Date().toISOString()): DiscordFinalLaunchManifestReport {
  const candidateId = args.rehearsalReport.rehearsalCandidate?.id || null;
  const idempotencyKey = args.rehearsalReport.rehearsalCandidate?.idempotencyKey || null;
  const blockers = [
    args.targetAuditReport.reportType === 'unified_desk_output_discord_webhook_target_presence_audit'
      ? null
      : 'Source target audit is not Unified Desk Output Discord webhook target presence audit.',
    args.targetAuditReport.status === 'pass' ? null : `Webhook target audit status is ${args.targetAuditReport.status}.`,
    args.targetAuditReport.summary.recommendation === 'ready_for_explicit_one_row_discord_publish_approval'
      ? null
      : `Webhook target audit recommendation is ${args.targetAuditReport.summary.recommendation}.`,
    args.targetAuditReport.summary.webhookTargetConfigured ? null : 'Webhook target is not configured.',
    args.targetAuditReport.summary.webhookTargetShapeValid ? null : 'Webhook target shape is not valid.',
    args.targetAuditReport.summary.secretValuesPrinted === false ? null : 'Webhook target audit printed secret values.',
    args.targetAuditReport.summary.webhookCallRows === 0 ? null : 'Webhook target audit has webhook-call rows.',
    args.targetAuditReport.summary.realPostAllowedRows === 0 ? null : 'Webhook target audit allows real posts.',
    args.targetAuditReport.summary.supabaseWriteRows === 0 ? null : 'Webhook target audit has Supabase-write rows.',
    args.targetAuditReport.summary.liveBridgeReadRows === 0 ? null : 'Webhook target audit has live-bridge-read rows.',
    args.targetAuditReport.summary.canExecuteTrueRows === 0 ? null : 'Webhook target audit has canExecute=true rows.',
    args.rehearsalReport.reportType === 'unified_desk_output_discord_one_row_publish_rehearsal_plan'
      ? null
      : 'Source rehearsal report is not Unified Desk Output Discord one-row publish rehearsal plan.',
    args.rehearsalReport.status === 'pass' ? null : `One-row rehearsal plan status is ${args.rehearsalReport.status}.`,
    args.rehearsalReport.summary.recommendation === 'ready_for_explicit_one_row_discord_publish_approval'
      ? null
      : `One-row rehearsal plan recommendation is ${args.rehearsalReport.summary.recommendation}.`,
    args.rehearsalReport.summary.candidateSelectedRows === 1 ? null : 'One-row rehearsal plan did not select exactly one candidate.',
    args.rehearsalReport.summary.webhookCallRows === 0 ? null : 'One-row rehearsal plan has webhook-call rows.',
    args.rehearsalReport.summary.realPostAllowedRows === 0 ? null : 'One-row rehearsal plan allows real posts.',
    args.rehearsalReport.summary.supabaseWriteRows === 0 ? null : 'One-row rehearsal plan has Supabase-write rows.',
    args.rehearsalReport.summary.liveBridgeReadRows === 0 ? null : 'One-row rehearsal plan has live-bridge-read rows.',
    args.rehearsalReport.summary.canExecuteTrueRows === 0 ? null : 'One-row rehearsal plan has canExecute=true rows.',
    candidateId ? null : 'No rehearsal candidate id is available.',
    idempotencyKey ? null : 'No rehearsal idempotency key is available.',
    ...args.targetAuditReport.readinessBlockers,
    ...args.rehearsalReport.blockers,
  ].filter((item): item is string => Boolean(item));
  const readbackSteps = buildReadbackSteps(candidateId, idempotencyKey);
  const rollbackSteps = buildRollbackSteps();
  const report: Omit<DiscordFinalLaunchManifestReport, 'markdown'> = {
    reportType: 'unified_desk_output_discord_final_launch_manifest',
    generatedAt,
    status: blockers.length ? 'blocked' : 'pass',
    authority: {
      localOnly: true,
      readsSavedWebhookTargetAuditOnly: true,
      readsSavedOneRowRehearsalPlanOnly: true,
      writesLaunchManifestOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      printsSecretValues: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      automatedOrders: false,
    },
    source: {
      webhookTargetAuditPath: args.targetAuditPath,
      oneRowRehearsalPlanPath: args.rehearsalPath,
      webhookTargetAuditGeneratedAt: args.targetAuditReport.generatedAt,
      oneRowRehearsalPlanGeneratedAt: args.rehearsalReport.generatedAt,
    },
    launchContract: {
      commandExistsNow: false,
      proposedCommand: buildProposedCommand(candidateId, idempotencyKey),
      explicitApprovalPhrase: 'I approve exactly one Unified Desk Output Discord production publish rehearsal.',
      candidateId,
      idempotencyKey,
      route: 'production_discord_trade_plan_webhook',
      oneRowCap: true,
      productionSendEnabledNow: false,
    },
    summary: {
      webhookTargetReady: args.targetAuditReport.summary.recommendation === 'ready_for_explicit_one_row_discord_publish_approval',
      rehearsalPlanReady: args.rehearsalReport.summary.recommendation === 'ready_for_explicit_one_row_discord_publish_approval',
      candidateSelectedRows: args.rehearsalReport.summary.candidateSelectedRows,
      commandExistsNow: false,
      productionSendEnabledNow: false,
      explicitApprovalPresent: false,
      shouldPostRows: 0,
      publishDiscordRows: 0,
      realPostAllowedRows: 0,
      webhookCallRows: 0,
      supabaseWriteRows: 0,
      liveSupabaseReadRows: 0,
      liveBridgeReadRows: 0,
      canExecuteTrueRows: 0,
      readbackSteps: readbackSteps.length,
      rollbackSteps: rollbackSteps.length,
      blockedRows: blockers.length,
      recommendation: blockers.length ? 'hold_for_final_launch_manifest_fix' : 'ready_to_install_disabled_one_row_sender',
    },
    readbackSteps,
    rollbackSteps,
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeUnifiedDeskOutputDiscordFinalLaunchManifestReport(
  report: DiscordFinalLaunchManifestReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-desk-output-discord-final-launch-manifest-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-desk-output-discord-final-launch-manifest-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const targetAuditPath = path.resolve(options.targetAuditPath ||
    latestMatchingFile(DEFAULT_REPORT_DIR, /^unified-desk-output-discord-webhook-target-presence-audit-\d+\.json$/) ||
    '');
  if (!fs.existsSync(targetAuditPath)) throw new Error('Missing Unified Desk Output Discord webhook target audit path.');
  const targetAuditReport = readJson<DiscordWebhookTargetPresenceAuditReport>(targetAuditPath);
  const rehearsalPath = path.resolve(options.rehearsalPath || targetAuditReport.source.oneRowRehearsalPlanPath);
  if (!fs.existsSync(rehearsalPath)) throw new Error('Missing Unified Desk Output Discord one-row rehearsal plan path.');
  const report = buildUnifiedDeskOutputDiscordFinalLaunchManifestReport({
    targetAuditPath,
    targetAuditReport,
    rehearsalPath,
    rehearsalReport: readJson<DiscordOneRowPublishRehearsalPlanReport>(rehearsalPath),
  });
  const written = writeUnifiedDeskOutputDiscordFinalLaunchManifestReport(report, path.resolve(options.outDir));
  if (options.json) {
    console.log(JSON.stringify({
      ...written,
      status: report.status,
      summary: report.summary,
      launchContract: report.launchContract,
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
