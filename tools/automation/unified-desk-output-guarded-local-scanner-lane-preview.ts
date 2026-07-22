import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  buildUnifiedDeskOutputGuardedScannerLanePreview,
  type UnifiedDeskOutputGuardedLaneContractInput,
  type UnifiedDeskOutputSelectionPolicyOrder,
} from '../../src/lib/unifiedDeskOutputGuardedScannerLane';
import type { UnifiedDeskOutputVisibilityReadinessReport } from '../../src/lib/unifiedDeskOutputScannerVisibilityAdapter';

interface CliOptions {
  guardedLaneAuditPath: string | null;
  readinessAuditPath: string | null;
  selectionPolicyOrder: UnifiedDeskOutputSelectionPolicyOrder;
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
  const selectionPolicyOrder = readFlag(args, '--selection-policy') || 'latest_completed_5m_proof_per_session';
  if (selectionPolicyOrder !== 'latest_completed_5m_proof_per_session' &&
    selectionPolicyOrder !== 'proven_lane_priority_then_latest_proof') {
    throw new Error(`Unsupported selection policy: ${selectionPolicyOrder}`);
  }
  return {
    guardedLaneAuditPath: readFlag(args, '--guarded-lane-audit'),
    readinessAuditPath: readFlag(args, '--readiness-audit'),
    selectionPolicyOrder,
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

function buildMarkdown(report: ReturnType<typeof buildUnifiedDeskOutputGuardedScannerLanePreview>): string {
  return [
    '# Unified Desk Output Guarded Local Scanner Lane Preview',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: disabled local scanner-lane preview only. It reads saved artifacts, selects one Approved Desk Plan per session, renders the scanner surface, and does not post Discord, write Supabase, read live bridge data, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Summary',
    `- Source candidates: ${report.summary.sourceCandidates}.`,
    `- Eligible Approved Desk Plan rows: ${report.summary.eligibleApprovedDeskPlanRows}.`,
    `- Selected rows: ${report.summary.selectedRows}.`,
    `- Morning rows: ${report.summary.morningRows}.`,
    `- Lunch rows: ${report.summary.lunchRows}.`,
    `- Suppressed rows: ${report.summary.suppressedRows}.`,
    `- Surface rows: ${report.summary.surfaceRows}.`,
    `- Discord-post rows: ${report.summary.discordPostRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-Supabase-read rows: ${report.summary.liveSupabaseReadRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- canExecute changed rows: ${report.summary.canExecuteChangedRows}.`,
    `- Trading-logic changed rows: ${report.summary.tradingLogicChangedRows}.`,
    `- Runtime install allowed: ${report.summary.runtimeInstallAllowed}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Selected Candidates',
    '| Date | Session | Model | Direction | Proof ET | Entry | Stop | T1 | T2 |',
    '|---|---|---|---|---:|---:|---:|---:|---:|',
    ...report.selectedCandidates.map((candidate) => `| ${candidate.date} | ${candidate.session} | ${candidate.model} | ${candidate.direction} | ${candidate.proofTime.slice(11, 16)} | ${candidate.entry} | ${candidate.stop} | ${candidate.target1} | ${candidate.target2} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function writeUnifiedDeskOutputGuardedLocalScannerLanePreview(
  report: ReturnType<typeof buildUnifiedDeskOutputGuardedScannerLanePreview>,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const reportWithMarkdown = { ...report, markdown: buildMarkdown(report) };
  const jsonPath = path.join(outDir, `unified-desk-output-guarded-local-scanner-lane-preview-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-desk-output-guarded-local-scanner-lane-preview-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(reportWithMarkdown, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${reportWithMarkdown.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const guardedLaneAuditPath = path.resolve(options.guardedLaneAuditPath ||
    latestMatchingFile(DEFAULT_REPORT_DIR, /^unified-desk-output-discord-guarded-live-lane-install-audit-\d+\.json$/) ||
    '');
  if (!fs.existsSync(guardedLaneAuditPath)) throw new Error('Missing Unified Desk Output guarded live-lane install audit path.');
  const readinessAuditPath = path.resolve(options.readinessAuditPath ||
    latestMatchingFile(DEFAULT_REPORT_DIR, /^unified-desk-output-live-gate-readiness-audit-\d+\.json$/) ||
    '');
  if (!fs.existsSync(readinessAuditPath)) throw new Error('Missing Unified Desk Output live-gate readiness audit path.');
  const report = buildUnifiedDeskOutputGuardedScannerLanePreview({
    guardedLaneContract: readJson<UnifiedDeskOutputGuardedLaneContractInput>(guardedLaneAuditPath),
    readinessReport: readJson<UnifiedDeskOutputVisibilityReadinessReport>(readinessAuditPath),
    selectionPolicyOrder: options.selectionPolicyOrder,
  });
  const written = writeUnifiedDeskOutputGuardedLocalScannerLanePreview(report, path.resolve(options.outDir));
  if (options.json) {
    console.log(JSON.stringify({
      ...written,
      status: report.status,
      summary: report.summary,
      selectedCandidates: report.selectedCandidates.map((candidate) => ({
        cardId: candidate.cardId,
        date: candidate.date,
        session: candidate.session,
        model: candidate.model,
        direction: candidate.direction,
        proofTime: candidate.proofTime,
        entry: candidate.entry,
        stop: candidate.stop,
        target1: candidate.target1,
        target2: candidate.target2,
      })),
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
