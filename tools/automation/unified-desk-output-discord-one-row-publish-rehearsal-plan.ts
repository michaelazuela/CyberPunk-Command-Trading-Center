import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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
}

interface DiscordPublishGateDecisionAuditReport {
  reportType: 'unified_desk_output_discord_publish_gate_decision_audit';
  generatedAt: string;
  status: 'pass' | 'blocked';
  authority: {
    localOnly: true;
    readsSavedDiscordFormatterDryRunOnly: true;
    evaluatesPublishGateOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    automatedOrders: false;
  };
  source: {
    discordFormatterDryRunPath: string;
    discordFormatterDryRunGeneratedAt: string;
  };
  summary: {
    publishGateEvaluated: true;
    productionApprovalPresent: false;
    sourceRows: number;
    formattedPayloads: number;
    approvedDeskPlanPayloads: number;
    formingDeskReadPayloads: number;
    shouldPostRows: number;
    publishDiscordRows: number;
    realPostAllowedRows: number;
    webhookCallRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    wordingViolationRows: number;
    blockedRows: number;
    missingApprovalRequirements: number;
    recommendation: 'ready_for_explicit_discord_publish_approval' | 'hold_for_discord_publish_gate_fix';
  };
  missingApprovalRequirements: string[];
  blockers: string[];
}

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
  source: {
    discordPublishGateAuditPath: string;
    discordFormatterDryRunPath: string;
    discordPublishGateAuditGeneratedAt: string;
    discordFormatterDryRunGeneratedAt: string;
  };
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
  launchRequirements: string[];
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  gatePath: string | null;
  formatterPath: string | null;
  outDir: string;
  json: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');

const LAUNCH_REQUIREMENTS = [
  'User must explicitly approve exactly one production Discord publish rehearsal.',
  'Webhook target and channel must be verified without printing or committing secrets.',
  'Only one selected payload may be sent for the rehearsal.',
  'Idempotency key must be attached to the send attempt.',
  'Post-send readback must verify the created Discord message.',
  'Rollback/retraction instructions must be ready before sending.',
  'Discord posting must remain disabled by default after the rehearsal.',
  'No Supabase write, live bridge read, canExecute change, trading-rule change, or automated order may be included.',
];

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function parseArgs(args = process.argv.slice(2)): CliOptions {
  return {
    gatePath: readFlag(args, '--gate'),
    formatterPath: readFlag(args, '--formatter'),
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

function buildIdempotencyKey(payloadId: string): string {
  return `unified-desk-output:discord-one-row-rehearsal:${payloadId}`;
}

function selectRehearsalCandidate(formatter: DiscordFormatterDryRunReport): DiscordDryRunPayload | null {
  return formatter.samplePayloads.find((payload) => /^\[APPROVED DESK PLAN\]/.test(payload.content)) ||
    formatter.samplePayloads[0] ||
    null;
}

function buildMarkdown(report: Omit<DiscordOneRowPublishRehearsalPlanReport, 'markdown'>): string {
  return [
    '# Unified Desk Output Discord One-Row Publish Rehearsal Plan',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: disabled local rehearsal plan only. It selects one saved dry-run payload and defines the production send checklist, while real Discord posts, webhook calls, Supabase writes, live bridge reads, canExecute changes, trading-rule changes, and automated orders remain off.',
    '',
    '## Summary',
    `- Publish gate passed: ${report.summary.publishGatePassed}.`,
    `- Formatter passed: ${report.summary.formatterPassed}.`,
    `- One-row cap: ${report.summary.oneRowCap}.`,
    `- Candidate selected rows: ${report.summary.candidateSelectedRows}.`,
    `- Production send enabled: ${report.summary.productionSendEnabled}.`,
    `- Explicit approval present: ${report.summary.explicitApprovalPresent}.`,
    `- Webhook target verified: ${report.summary.webhookTargetVerified}.`,
    `- shouldPost rows: ${report.summary.shouldPostRows}.`,
    `- publishDiscord rows: ${report.summary.publishDiscordRows}.`,
    `- Real-post-allowed rows: ${report.summary.realPostAllowedRows}.`,
    `- Webhook-call rows: ${report.summary.webhookCallRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-Supabase-read rows: ${report.summary.liveSupabaseReadRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Blocked rows: ${report.summary.blockedRows}.`,
    `- Launch requirements: ${report.summary.launchRequirements}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Rehearsal Candidate',
    report.rehearsalCandidate
      ? [
          `- ID: ${report.rehearsalCandidate.id}`,
          `- Idempotency key: ${report.rehearsalCandidate.idempotencyKey}`,
          `- Route: ${report.rehearsalCandidate.route}`,
          '```text',
          report.rehearsalCandidate.payloadPreview,
          '```',
        ].join('\n')
      : '- None.',
    '',
    '## Launch Requirements',
    ...report.launchRequirements.map((requirement) => `- ${requirement}`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildUnifiedDeskOutputDiscordOneRowPublishRehearsalPlanReport(args: {
  gatePath: string;
  gateReport: DiscordPublishGateDecisionAuditReport;
  formatterPath: string;
  formatterReport: DiscordFormatterDryRunReport;
}, generatedAt = new Date().toISOString()): DiscordOneRowPublishRehearsalPlanReport {
  const candidate = selectRehearsalCandidate(args.formatterReport);
  const blockers = [
    args.gateReport.reportType === 'unified_desk_output_discord_publish_gate_decision_audit'
      ? null
      : 'Source gate report is not Unified Desk Output Discord publish-gate decision audit.',
    args.gateReport.status === 'pass' ? null : `Discord publish-gate audit status is ${args.gateReport.status}.`,
    args.gateReport.authority.postsDiscord === false ? null : 'Discord publish-gate audit posts Discord.',
    args.gateReport.authority.writesSupabase === false ? null : 'Discord publish-gate audit writes Supabase.',
    args.gateReport.authority.readsLiveSupabase === false ? null : 'Discord publish-gate audit reads live Supabase.',
    args.gateReport.authority.readsLiveBridge === false ? null : 'Discord publish-gate audit reads live bridge.',
    args.gateReport.authority.changesTradingLogic === false ? null : 'Discord publish-gate audit changes trading logic.',
    args.gateReport.authority.changesCanExecute === false ? null : 'Discord publish-gate audit changes canExecute.',
    args.gateReport.authority.automatedOrders === false ? null : 'Discord publish-gate audit allows automated orders.',
    args.gateReport.summary.recommendation === 'ready_for_explicit_discord_publish_approval'
      ? null
      : `Discord publish-gate audit recommendation is ${args.gateReport.summary.recommendation}.`,
    args.gateReport.summary.realPostAllowedRows === 0 ? null : 'Discord publish-gate audit allows real posts.',
    args.formatterReport.reportType === 'unified_desk_output_discord_formatter_dry_run'
      ? null
      : 'Source formatter report is not Unified Desk Output Discord formatter dry-run.',
    args.formatterReport.status === 'pass' ? null : `Discord formatter dry-run status is ${args.formatterReport.status}.`,
    args.formatterReport.summary.recommendation === 'ready_for_discord_publish_gate_decision'
      ? null
      : `Discord formatter dry-run recommendation is ${args.formatterReport.summary.recommendation}.`,
    args.formatterReport.summary.shouldPostRows === 0 ? null : 'Discord formatter dry-run has shouldPost rows.',
    args.formatterReport.summary.publishDiscordRows === 0 ? null : 'Discord formatter dry-run has publishDiscord rows.',
    args.formatterReport.summary.webhookCallRows === 0 ? null : 'Discord formatter dry-run has webhook-call rows.',
    args.formatterReport.summary.supabaseWriteRows === 0 ? null : 'Discord formatter dry-run has Supabase-write rows.',
    args.formatterReport.summary.liveSupabaseReadRows === 0 ? null : 'Discord formatter dry-run has live-Supabase-read rows.',
    args.formatterReport.summary.liveBridgeReadRows === 0 ? null : 'Discord formatter dry-run has live-bridge-read rows.',
    args.formatterReport.summary.canExecuteTrueRows === 0 ? null : 'Discord formatter dry-run has canExecute=true rows.',
    candidate ? null : 'No dry-run payload is available for one-row rehearsal planning.',
    ...args.gateReport.blockers,
    ...args.formatterReport.blockers,
  ].filter((item): item is string => Boolean(item));
  const rehearsalCandidate = candidate
    ? {
        id: candidate.id,
        idempotencyKey: buildIdempotencyKey(candidate.id),
        route: 'production_discord_trade_plan_webhook' as const,
        payloadPreview: candidate.content,
        productionSendEnabled: false as const,
        explicitApprovalPresent: false as const,
        webhookTargetVerified: false as const,
        shouldPost: false as const,
        publishDiscord: false as const,
        webhookCalls: 0 as const,
        canExecute: false as const,
      }
    : null;
  const report: Omit<DiscordOneRowPublishRehearsalPlanReport, 'markdown'> = {
    reportType: 'unified_desk_output_discord_one_row_publish_rehearsal_plan',
    generatedAt,
    status: blockers.length ? 'blocked' : 'pass',
    authority: {
      localOnly: true,
      readsSavedDiscordPublishGateAuditOnly: true,
      readsSavedDiscordFormatterDryRunOnly: true,
      createsDisabledPublishPlanOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      automatedOrders: false,
    },
    source: {
      discordPublishGateAuditPath: args.gatePath,
      discordFormatterDryRunPath: args.formatterPath,
      discordPublishGateAuditGeneratedAt: args.gateReport.generatedAt,
      discordFormatterDryRunGeneratedAt: args.formatterReport.generatedAt,
    },
    rehearsalCandidate,
    summary: {
      publishGatePassed: args.gateReport.status === 'pass',
      formatterPassed: args.formatterReport.status === 'pass',
      oneRowCap: true,
      candidateSelectedRows: rehearsalCandidate ? 1 : 0,
      productionSendEnabled: false,
      explicitApprovalPresent: false,
      webhookTargetVerified: false,
      shouldPostRows: 0,
      publishDiscordRows: 0,
      realPostAllowedRows: 0,
      webhookCallRows: 0,
      supabaseWriteRows: 0,
      liveSupabaseReadRows: 0,
      liveBridgeReadRows: 0,
      canExecuteTrueRows: 0,
      blockedRows: blockers.length,
      launchRequirements: LAUNCH_REQUIREMENTS.length,
      recommendation: blockers.length
        ? 'hold_for_one_row_publish_rehearsal_fix'
        : 'ready_for_explicit_one_row_discord_publish_approval',
    },
    launchRequirements: LAUNCH_REQUIREMENTS,
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeUnifiedDeskOutputDiscordOneRowPublishRehearsalPlanReport(
  report: DiscordOneRowPublishRehearsalPlanReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-desk-output-discord-one-row-publish-rehearsal-plan-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-desk-output-discord-one-row-publish-rehearsal-plan-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const gatePath = path.resolve(options.gatePath ||
    latestMatchingFile(DEFAULT_REPORT_DIR, /^unified-desk-output-discord-publish-gate-decision-audit-\d+\.json$/) ||
    '');
  if (!fs.existsSync(gatePath)) throw new Error('Missing Unified Desk Output Discord publish-gate audit path.');
  const gateReport = readJson<DiscordPublishGateDecisionAuditReport>(gatePath);
  const formatterPath = path.resolve(options.formatterPath || gateReport.source.discordFormatterDryRunPath);
  if (!fs.existsSync(formatterPath)) throw new Error('Missing Unified Desk Output Discord formatter dry-run report path.');
  const report = buildUnifiedDeskOutputDiscordOneRowPublishRehearsalPlanReport({
    gatePath,
    gateReport,
    formatterPath,
    formatterReport: readJson<DiscordFormatterDryRunReport>(formatterPath),
  });
  const written = writeUnifiedDeskOutputDiscordOneRowPublishRehearsalPlanReport(report, path.resolve(options.outDir));
  if (options.json) {
    console.log(JSON.stringify({
      ...written,
      status: report.status,
      summary: report.summary,
      rehearsalCandidate: report.rehearsalCandidate && {
        id: report.rehearsalCandidate.id,
        idempotencyKey: report.rehearsalCandidate.idempotencyKey,
        productionSendEnabled: report.rehearsalCandidate.productionSendEnabled,
        webhookCalls: report.rehearsalCandidate.webhookCalls,
      },
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
