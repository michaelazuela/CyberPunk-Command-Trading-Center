import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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
  markdown: string;
}

interface CliOptions {
  formatterPath: string | null;
  outDir: string;
  json: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');

const REQUIRED_APPROVALS = [
  'Explicit production Discord publish approval is required before any real post.',
  'Production webhook and channel target must be configured and verified without exposing secrets.',
  'One-row/session cap must be preserved for controlled publish testing.',
  'Discord idempotency key must be defined before any send path can run.',
  'Post-send readback must prove the exact expected message was created.',
  'Rollback/retraction plan must be documented before production posting.',
  'Dry-run payload route must map to the approved production Discord route.',
  'Production send remains blocked in this audit.',
];

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function parseArgs(args = process.argv.slice(2)): CliOptions {
  return {
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

function buildMarkdown(report: Omit<DiscordPublishGateDecisionAuditReport, 'markdown'>): string {
  return [
    '# Unified Desk Output Discord Publish-Gate Decision Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local saved-report audit only. It evaluates whether the Discord dry-run is clean enough to ask for explicit production publish approval, while keeping real Discord posts, Supabase writes, live bridge reads, canExecute changes, trading-rule changes, and automated orders off.',
    '',
    '## Summary',
    `- Publish gate evaluated: ${report.summary.publishGateEvaluated}.`,
    `- Production approval present: ${report.summary.productionApprovalPresent}.`,
    `- Source rows: ${report.summary.sourceRows}.`,
    `- Formatted payloads: ${report.summary.formattedPayloads}.`,
    `- Approved Desk Plan payloads: ${report.summary.approvedDeskPlanPayloads}.`,
    `- Forming Desk Read payloads: ${report.summary.formingDeskReadPayloads}.`,
    `- shouldPost rows: ${report.summary.shouldPostRows}.`,
    `- publishDiscord rows: ${report.summary.publishDiscordRows}.`,
    `- Real-post-allowed rows: ${report.summary.realPostAllowedRows}.`,
    `- Webhook-call rows: ${report.summary.webhookCallRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-Supabase-read rows: ${report.summary.liveSupabaseReadRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Wording violation rows: ${report.summary.wordingViolationRows}.`,
    `- Blocked rows: ${report.summary.blockedRows}.`,
    `- Missing approval requirements: ${report.summary.missingApprovalRequirements}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Missing Approval Requirements',
    ...report.missingApprovalRequirements.map((requirement) => `- ${requirement}`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildUnifiedDeskOutputDiscordPublishGateDecisionAuditReport(args: {
  formatterPath: string;
  formatterReport: DiscordFormatterDryRunReport;
}, generatedAt = new Date().toISOString()): DiscordPublishGateDecisionAuditReport {
  const formatter = args.formatterReport;
  const blockers = [
    formatter.reportType === 'unified_desk_output_discord_formatter_dry_run'
      ? null
      : 'Source report is not Unified Desk Output Discord formatter dry-run.',
    formatter.status === 'pass' ? null : `Discord formatter dry-run status is ${formatter.status}.`,
    formatter.authority.localOnly ? null : 'Discord formatter dry-run is not local-only.',
    formatter.authority.dryRunOnly ? null : 'Discord formatter dry-run is not dry-run-only.',
    formatter.authority.formatsDiscordPayloadsOnly ? null : 'Discord formatter dry-run does more than format payloads.',
    formatter.authority.postsDiscord === false ? null : 'Discord formatter dry-run posts Discord.',
    formatter.authority.writesSupabase === false ? null : 'Discord formatter dry-run writes Supabase.',
    formatter.authority.readsLiveSupabase === false ? null : 'Discord formatter dry-run reads live Supabase.',
    formatter.authority.readsLiveBridge === false ? null : 'Discord formatter dry-run reads live bridge.',
    formatter.authority.changesTradingLogic === false ? null : 'Discord formatter dry-run changes trading logic.',
    formatter.authority.changesCanExecute === false ? null : 'Discord formatter dry-run changes canExecute.',
    formatter.authority.automatedOrders === false ? null : 'Discord formatter dry-run allows automated orders.',
    formatter.summary.sourceRows > 0 ? null : 'Discord formatter dry-run has no source rows.',
    formatter.summary.formattedPayloads > 0 ? null : 'Discord formatter dry-run has no formatted payloads.',
    formatter.summary.formattedPayloads === formatter.summary.sourceRows
      ? null
      : 'Discord formatter dry-run payload count does not match source rows.',
    formatter.summary.shouldPostRows === 0 ? null : 'Discord formatter dry-run has shouldPost rows.',
    formatter.summary.publishDiscordRows === 0 ? null : 'Discord formatter dry-run has publishDiscord rows.',
    formatter.summary.webhookCallRows === 0 ? null : 'Discord formatter dry-run has webhook-call rows.',
    formatter.summary.supabaseWriteRows === 0 ? null : 'Discord formatter dry-run has Supabase-write rows.',
    formatter.summary.liveSupabaseReadRows === 0 ? null : 'Discord formatter dry-run has live-Supabase-read rows.',
    formatter.summary.liveBridgeReadRows === 0 ? null : 'Discord formatter dry-run has live-bridge-read rows.',
    formatter.summary.canExecuteTrueRows === 0 ? null : 'Discord formatter dry-run has canExecute=true rows.',
    formatter.summary.wordingViolationRows === 0 ? null : 'Discord formatter dry-run has wording violations.',
    formatter.summary.blockedRows === 0 ? null : 'Discord formatter dry-run has blocked rows.',
    formatter.summary.recommendation === 'ready_for_discord_publish_gate_decision'
      ? null
      : `Discord formatter dry-run recommendation is ${formatter.summary.recommendation}.`,
    ...formatter.blockers,
  ].filter((item): item is string => Boolean(item));
  const summary: DiscordPublishGateDecisionAuditReport['summary'] = {
    publishGateEvaluated: true,
    productionApprovalPresent: false,
    sourceRows: formatter.summary.sourceRows,
    formattedPayloads: formatter.summary.formattedPayloads,
    approvedDeskPlanPayloads: formatter.summary.approvedDeskPlanPayloads,
    formingDeskReadPayloads: formatter.summary.formingDeskReadPayloads,
    shouldPostRows: formatter.summary.shouldPostRows,
    publishDiscordRows: formatter.summary.publishDiscordRows,
    realPostAllowedRows: 0,
    webhookCallRows: formatter.summary.webhookCallRows,
    supabaseWriteRows: formatter.summary.supabaseWriteRows,
    liveSupabaseReadRows: formatter.summary.liveSupabaseReadRows,
    liveBridgeReadRows: formatter.summary.liveBridgeReadRows,
    canExecuteTrueRows: formatter.summary.canExecuteTrueRows,
    wordingViolationRows: formatter.summary.wordingViolationRows,
    blockedRows: blockers.length,
    missingApprovalRequirements: REQUIRED_APPROVALS.length,
    recommendation: blockers.length ? 'hold_for_discord_publish_gate_fix' : 'ready_for_explicit_discord_publish_approval',
  };
  const report: Omit<DiscordPublishGateDecisionAuditReport, 'markdown'> = {
    reportType: 'unified_desk_output_discord_publish_gate_decision_audit',
    generatedAt,
    status: blockers.length ? 'blocked' : 'pass',
    authority: {
      localOnly: true,
      readsSavedDiscordFormatterDryRunOnly: true,
      evaluatesPublishGateOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      automatedOrders: false,
    },
    source: {
      discordFormatterDryRunPath: args.formatterPath,
      discordFormatterDryRunGeneratedAt: formatter.generatedAt,
    },
    summary,
    missingApprovalRequirements: REQUIRED_APPROVALS,
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeUnifiedDeskOutputDiscordPublishGateDecisionAuditReport(
  report: DiscordPublishGateDecisionAuditReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-desk-output-discord-publish-gate-decision-audit-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-desk-output-discord-publish-gate-decision-audit-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const formatterPath = path.resolve(options.formatterPath ||
    latestMatchingFile(DEFAULT_REPORT_DIR, /^unified-desk-output-discord-formatter-dry-run-\d+\.json$/) ||
    '');
  if (!fs.existsSync(formatterPath)) throw new Error('Missing Unified Desk Output Discord formatter dry-run report path.');
  const report = buildUnifiedDeskOutputDiscordPublishGateDecisionAuditReport({
    formatterPath,
    formatterReport: readJson<DiscordFormatterDryRunReport>(formatterPath),
  });
  const written = writeUnifiedDeskOutputDiscordPublishGateDecisionAuditReport(report, path.resolve(options.outDir));
  if (options.json) {
    console.log(JSON.stringify({
      ...written,
      status: report.status,
      summary: report.summary,
      missingApprovalRequirements: report.missingApprovalRequirements,
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
