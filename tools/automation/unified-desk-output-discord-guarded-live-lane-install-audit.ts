import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  buildUnifiedDeskOutputDiscordGuardedLiveLaneContract,
  type UnifiedDeskOutputDiscordPostReceiptAuditInput,
} from '../../src/lib/unifiedDeskOutputDiscordGuardedLiveLane';

interface CliOptions {
  auditPath: string | null;
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
    auditPath: readFlag(args, '--audit'),
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

function buildMarkdown(report: ReturnType<typeof buildUnifiedDeskOutputDiscordGuardedLiveLaneContract>): string {
  return [
    '# Unified Desk Output Discord Guarded Live Lane Install Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: disabled-by-default lane contract only. It does not post Discord, write Supabase, read NinjaTrader, change canExecute, or alter trading rules.',
    '',
    '## Lane Contract',
    `- Enabled by default: ${report.lane.enabledByDefault}.`,
    `- Scanner-owned only: ${report.lane.scannerOwnedOnly}.`,
    `- Allowed desk states: ${report.lane.allowedDeskStates.join(', ')}.`,
    `- Sessions: ${report.lane.sessions.join(', ')}.`,
    `- Max posts per session: ${report.lane.maxPostsPerSession}.`,
    `- Requires fresh manifest: ${report.lane.requiresFreshManifest}.`,
    `- Requires fresh idempotency key: ${report.lane.requiresFreshIdempotencyKey}.`,
    `- Refuses duplicate idempotency key: ${report.lane.refusesDuplicateIdempotencyKey}.`,
    `- Requires explicit approval for production send: ${report.lane.requiresExplicitApprovalForProductionSend}.`,
    '',
    '## Summary',
    `- Post-receipt audit accepted: ${report.summary.postReceiptAuditAccepted}.`,
    `- Webhook-call rows now: ${report.summary.webhookCallRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function writeUnifiedDeskOutputDiscordGuardedLiveLaneInstallAudit(
  report: ReturnType<typeof buildUnifiedDeskOutputDiscordGuardedLiveLaneContract>,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const reportWithMarkdown = { ...report, markdown: buildMarkdown(report) };
  const jsonPath = path.join(outDir, `unified-desk-output-discord-guarded-live-lane-install-audit-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-desk-output-discord-guarded-live-lane-install-audit-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(reportWithMarkdown, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${reportWithMarkdown.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const auditPath = path.resolve(options.auditPath ||
    latestMatchingFile(DEFAULT_REPORT_DIR, /^unified-desk-output-discord-post-receipt-audit-\d+\.json$/) ||
    '');
  if (!fs.existsSync(auditPath)) throw new Error('Missing Unified Desk Output Discord post-receipt audit path.');
  const report = buildUnifiedDeskOutputDiscordGuardedLiveLaneContract(
    readJson<UnifiedDeskOutputDiscordPostReceiptAuditInput>(auditPath),
  );
  const written = writeUnifiedDeskOutputDiscordGuardedLiveLaneInstallAudit(report, path.resolve(options.outDir));
  if (options.json) {
    console.log(JSON.stringify({
      ...written,
      status: report.status,
      lane: report.lane,
      summary: report.summary,
      blockers: report.blockers.slice(0, 20),
    }, null, 2));
  } else {
    console.log(buildMarkdown(report));
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
