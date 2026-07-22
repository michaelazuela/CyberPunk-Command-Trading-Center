import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

interface DiscordOneRowPublishRehearsalPlanReport {
  reportType: 'unified_desk_output_discord_one_row_publish_rehearsal_plan';
  generatedAt: string;
  status: 'pass' | 'blocked';
  authority: {
    localOnly: true;
    readsSavedDiscordPublishGateAuditOnly: true;
    readsSavedDiscordFormatterDryRunOnly: true;
    createsDisabledPublishPlanOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    automatedOrders: false;
  };
  rehearsalCandidate: {
    id: string;
    idempotencyKey: string;
    route: 'production_discord_trade_plan_webhook';
    productionSendEnabled: false;
    explicitApprovalPresent: false;
    webhookTargetVerified: false;
    shouldPost: false;
    publishDiscord: false;
    webhookCalls: 0;
    canExecute: false;
  } | null;
  summary: {
    publishGatePassed: boolean;
    formatterPassed: boolean;
    oneRowCap: true;
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
    launchRequirements: number;
    recommendation: 'ready_for_explicit_one_row_discord_publish_approval' | 'hold_for_one_row_publish_rehearsal_fix';
  };
  blockers: string[];
}

interface EnvPresence {
  name: 'DISCORD_WEBHOOK_URL';
  documentedInEnvExample: boolean;
  presentInEnvLocal: boolean;
  presentInProcessEnv: boolean;
  nonEmpty: boolean;
  shapeLooksLikeDiscordWebhook: boolean;
  valuePrinted: false;
}

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
  target: EnvPresence;
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
  markdown: string;
}

interface CliOptions {
  rehearsalPath: string | null;
  envExamplePath: string;
  envLocalPath: string;
  outDir: string;
  json: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function parseArgs(args = process.argv.slice(2)): CliOptions {
  return {
    rehearsalPath: readFlag(args, '--rehearsal'),
    envExamplePath: readFlag(args, '--env-example') || path.join(PROJECT_ROOT, '.env.example'),
    envLocalPath: readFlag(args, '--env-local') || path.join(PROJECT_ROOT, '.env.local'),
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

function parseEnvFile(filePath: string): Map<string, string> {
  const values = new Map<string, string>();
  if (!fs.existsSync(filePath)) return values;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
    if (!match) continue;
    const rawValue = match[2].trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');
    values.set(match[1], value);
  }
  return values;
}

function looksLikeDiscordWebhook(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      (url.hostname === 'discord.com' || url.hostname === 'discordapp.com') &&
      /^\/api\/webhooks\/[^/]+\/[^/]+/.test(url.pathname);
  } catch {
    return false;
  }
}

function buildEnvPresence(envExamplePath: string, envLocalPath: string): EnvPresence {
  const exampleValues = parseEnvFile(envExamplePath);
  const localValues = parseEnvFile(envLocalPath);
  const localValue = localValues.get('DISCORD_WEBHOOK_URL') || '';
  const processValue = process.env.DISCORD_WEBHOOK_URL || '';
  const selectedValue = localValue || processValue;
  return {
    name: 'DISCORD_WEBHOOK_URL',
    documentedInEnvExample: exampleValues.has('DISCORD_WEBHOOK_URL'),
    presentInEnvLocal: localValues.has('DISCORD_WEBHOOK_URL'),
    presentInProcessEnv: Boolean(process.env.DISCORD_WEBHOOK_URL),
    nonEmpty: selectedValue.trim().length > 0,
    shapeLooksLikeDiscordWebhook: selectedValue.trim().length > 0 && looksLikeDiscordWebhook(selectedValue.trim()),
    valuePrinted: false,
  };
}

function buildMarkdown(report: Omit<DiscordWebhookTargetPresenceAuditReport, 'markdown'>): string {
  return [
    '# Unified Desk Output Discord Webhook Target Presence Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local configuration-name audit only. It checks whether the production Discord webhook variable is documented and locally present without printing secret values or making a network call.',
    '',
    '## Summary',
    `- Rehearsal plan passed: ${report.summary.rehearsalPlanPassed}.`,
    `- Candidate selected rows: ${report.summary.candidateSelectedRows}.`,
    `- Production send enabled: ${report.summary.productionSendEnabled}.`,
    `- Explicit approval present: ${report.summary.explicitApprovalPresent}.`,
    `- Webhook target configured: ${report.summary.webhookTargetConfigured}.`,
    `- Webhook target shape valid: ${report.summary.webhookTargetShapeValid}.`,
    `- Webhook target verified by network: ${report.summary.webhookTargetVerifiedByNetwork}.`,
    `- Secret values printed: ${report.summary.secretValuesPrinted}.`,
    `- shouldPost rows: ${report.summary.shouldPostRows}.`,
    `- publishDiscord rows: ${report.summary.publishDiscordRows}.`,
    `- Real-post-allowed rows: ${report.summary.realPostAllowedRows}.`,
    `- Webhook-call rows: ${report.summary.webhookCallRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-Supabase-read rows: ${report.summary.liveSupabaseReadRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Readiness blockers: ${report.summary.readinessBlockers}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Target',
    `- Name: ${report.target.name}`,
    `- Documented in .env.example: ${report.target.documentedInEnvExample}`,
    `- Present in .env.local: ${report.target.presentInEnvLocal}`,
    `- Present in process env: ${report.target.presentInProcessEnv}`,
    `- Non-empty: ${report.target.nonEmpty}`,
    `- Discord webhook shape: ${report.target.shapeLooksLikeDiscordWebhook}`,
    `- Value printed: ${report.target.valuePrinted}`,
    '',
    '## Readiness Blockers',
    ...(report.readinessBlockers.length ? report.readinessBlockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildUnifiedDeskOutputDiscordWebhookTargetPresenceAuditReport(args: {
  rehearsalPath: string;
  rehearsalReport: DiscordOneRowPublishRehearsalPlanReport;
  envExamplePath: string;
  envLocalPath: string;
}, generatedAt = new Date().toISOString()): DiscordWebhookTargetPresenceAuditReport {
  const target = buildEnvPresence(args.envExamplePath, args.envLocalPath);
  const readinessBlockers = [
    args.rehearsalReport.reportType === 'unified_desk_output_discord_one_row_publish_rehearsal_plan'
      ? null
      : 'Source report is not Unified Desk Output Discord one-row publish rehearsal plan.',
    args.rehearsalReport.status === 'pass' ? null : `One-row publish rehearsal plan status is ${args.rehearsalReport.status}.`,
    args.rehearsalReport.authority.postsDiscord === false ? null : 'One-row rehearsal plan posts Discord.',
    args.rehearsalReport.authority.writesSupabase === false ? null : 'One-row rehearsal plan writes Supabase.',
    args.rehearsalReport.authority.readsLiveSupabase === false ? null : 'One-row rehearsal plan reads live Supabase.',
    args.rehearsalReport.authority.readsLiveBridge === false ? null : 'One-row rehearsal plan reads live bridge.',
    args.rehearsalReport.authority.changesTradingLogic === false ? null : 'One-row rehearsal plan changes trading logic.',
    args.rehearsalReport.authority.changesCanExecute === false ? null : 'One-row rehearsal plan changes canExecute.',
    args.rehearsalReport.authority.automatedOrders === false ? null : 'One-row rehearsal plan allows automated orders.',
    args.rehearsalReport.summary.productionSendEnabled === false ? null : 'One-row rehearsal plan enables production send.',
    args.rehearsalReport.summary.realPostAllowedRows === 0 ? null : 'One-row rehearsal plan allows real posts.',
    args.rehearsalReport.summary.webhookCallRows === 0 ? null : 'One-row rehearsal plan has webhook-call rows.',
    args.rehearsalReport.summary.supabaseWriteRows === 0 ? null : 'One-row rehearsal plan has Supabase-write rows.',
    args.rehearsalReport.summary.liveBridgeReadRows === 0 ? null : 'One-row rehearsal plan has live-bridge-read rows.',
    args.rehearsalReport.summary.canExecuteTrueRows === 0 ? null : 'One-row rehearsal plan has canExecute=true rows.',
    args.rehearsalReport.summary.candidateSelectedRows === 1 ? null : 'One-row rehearsal plan did not select exactly one candidate.',
    target.documentedInEnvExample ? null : 'DISCORD_WEBHOOK_URL is not documented in .env.example.',
    target.presentInEnvLocal || target.presentInProcessEnv ? null : 'DISCORD_WEBHOOK_URL is not present in .env.local or process env.',
    target.nonEmpty ? null : 'DISCORD_WEBHOOK_URL is empty.',
    target.shapeLooksLikeDiscordWebhook ? null : 'DISCORD_WEBHOOK_URL does not match the expected Discord webhook URL shape.',
    ...args.rehearsalReport.blockers,
  ].filter((item): item is string => Boolean(item));
  const report: Omit<DiscordWebhookTargetPresenceAuditReport, 'markdown'> = {
    reportType: 'unified_desk_output_discord_webhook_target_presence_audit',
    generatedAt,
    status: 'pass',
    authority: {
      localOnly: true,
      readsSavedOneRowRehearsalPlanOnly: true,
      readsLocalEnvNamesOnly: true,
      printsSecretValues: false,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      automatedOrders: false,
    },
    source: {
      oneRowRehearsalPlanPath: args.rehearsalPath,
      envExamplePath: args.envExamplePath,
      envLocalPath: args.envLocalPath,
    },
    target,
    summary: {
      rehearsalPlanPassed: args.rehearsalReport.status === 'pass',
      candidateSelectedRows: args.rehearsalReport.summary.candidateSelectedRows,
      productionSendEnabled: false,
      explicitApprovalPresent: false,
      webhookTargetConfigured: target.nonEmpty,
      webhookTargetShapeValid: target.shapeLooksLikeDiscordWebhook,
      webhookTargetVerifiedByNetwork: false,
      secretValuesPrinted: false,
      shouldPostRows: 0,
      publishDiscordRows: 0,
      realPostAllowedRows: 0,
      webhookCallRows: 0,
      supabaseWriteRows: 0,
      liveSupabaseReadRows: 0,
      liveBridgeReadRows: 0,
      canExecuteTrueRows: 0,
      readinessBlockers: readinessBlockers.length,
      recommendation: readinessBlockers.length
        ? 'hold_for_webhook_target_configuration'
        : 'ready_for_explicit_one_row_discord_publish_approval',
    },
    readinessBlockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeUnifiedDeskOutputDiscordWebhookTargetPresenceAuditReport(
  report: DiscordWebhookTargetPresenceAuditReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-desk-output-discord-webhook-target-presence-audit-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-desk-output-discord-webhook-target-presence-audit-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const rehearsalPath = path.resolve(options.rehearsalPath ||
    latestMatchingFile(DEFAULT_REPORT_DIR, /^unified-desk-output-discord-one-row-publish-rehearsal-plan-\d+\.json$/) ||
    '');
  if (!fs.existsSync(rehearsalPath)) throw new Error('Missing Unified Desk Output Discord one-row rehearsal plan path.');
  const report = buildUnifiedDeskOutputDiscordWebhookTargetPresenceAuditReport({
    rehearsalPath,
    rehearsalReport: readJson<DiscordOneRowPublishRehearsalPlanReport>(rehearsalPath),
    envExamplePath: path.resolve(options.envExamplePath),
    envLocalPath: path.resolve(options.envLocalPath),
  });
  const written = writeUnifiedDeskOutputDiscordWebhookTargetPresenceAuditReport(report, path.resolve(options.outDir));
  if (options.json) {
    console.log(JSON.stringify({
      ...written,
      status: report.status,
      summary: report.summary,
      target: report.target,
      readinessBlockers: report.readinessBlockers,
    }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nJSON: ${written.jsonPath}`);
    console.log(`Markdown: ${written.markdownPath}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
