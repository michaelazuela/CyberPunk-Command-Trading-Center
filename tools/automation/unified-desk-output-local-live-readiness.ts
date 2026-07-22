import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  evaluateUnifiedDeskOutputRuntimeGate,
  type UnifiedDeskOutputLocalGoLiveRehearsalGateReport,
} from '../../src/lib/unifiedDeskOutputRuntimeGate';

interface LocalLiveReadinessReport {
  reportType: 'unified_desk_output_local_live_readiness';
  generatedAt: string;
  status: 'pass' | 'blocked';
  authority: {
    localOnly: true;
    readsSavedRehearsalOnly: true;
    requiresExplicitLocalFlag: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    automatedOrders: false;
  };
  source: {
    rehearsalPath: string;
    rehearsalStatus: 'pass' | 'blocked';
  };
  summary: {
    defaultDisabled: boolean;
    remoteBlocked: boolean;
    localPreviewAllowed: boolean;
    scannerPreviewAllowed: boolean;
    previewRows: number;
    approvedDeskPlanRows: number;
    formingDeskReadRows: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    wordingViolationRows: number;
    blockedRows: number;
    recommendation: 'ready_for_local_live_preview' | 'hold_for_local_live_gate_fix';
  };
  blockers: string[];
  markdown: string;
}

interface CliOptions {
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

function buildMarkdown(report: Omit<LocalLiveReadinessReport, 'markdown'>): string {
  return [
    '# Unified Desk Output Local Live Readiness',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local live preview readiness only. It reads a saved rehearsal report and does not post Discord, write Supabase, read live Supabase, read live bridge data, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Gate Results',
    `- Default route disabled: ${report.summary.defaultDisabled}.`,
    `- Remote/non-local route blocked: ${report.summary.remoteBlocked}.`,
    `- Local explicit-flag preview allowed: ${report.summary.localPreviewAllowed}.`,
    `- Scanner preview allowed: ${report.summary.scannerPreviewAllowed}.`,
    '',
    '## Row Counts',
    `- Preview rows: ${report.summary.previewRows}.`,
    `- Approved Desk Plans: ${report.summary.approvedDeskPlanRows}.`,
    `- Forming Desk Reads: ${report.summary.formingDeskReadRows}.`,
    `- Discord-post rows: ${report.summary.discordPostRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-Supabase-read rows: ${report.summary.liveSupabaseReadRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Wording violation rows: ${report.summary.wordingViolationRows}.`,
    `- Blocked rows: ${report.summary.blockedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Source',
    `- Rehearsal: ${report.source.rehearsalPath}.`,
    `- Rehearsal status: ${report.source.rehearsalStatus}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildUnifiedDeskOutputLocalLiveReadinessReport(args: {
  rehearsalPath: string;
  rehearsalReport: UnifiedDeskOutputLocalGoLiveRehearsalGateReport;
}, generatedAt = new Date().toISOString()): LocalLiveReadinessReport {
  const defaultGate = evaluateUnifiedDeskOutputRuntimeGate({
    explicitLocalFlag: false,
    localHost: true,
    rehearsal: args.rehearsalReport,
  });
  const remoteGate = evaluateUnifiedDeskOutputRuntimeGate({
    explicitLocalFlag: true,
    localHost: false,
    rehearsal: args.rehearsalReport,
  });
  const localGate = evaluateUnifiedDeskOutputRuntimeGate({
    explicitLocalFlag: true,
    localHost: true,
    rehearsal: args.rehearsalReport,
  });

  const blockers = [
    args.rehearsalReport.reportType === 'unified_desk_output_local_go_live_rehearsal'
      ? null
      : 'Source report is not local go-live rehearsal.',
    args.rehearsalReport.status === 'pass' ? null : `Local go-live rehearsal status is ${args.rehearsalReport.status}.`,
    defaultGate.status === 'disabled' && !defaultGate.scannerPreviewAllowed
      ? null
      : 'Default local-live route is not disabled.',
    remoteGate.status === 'blocked' && !remoteGate.scannerPreviewAllowed
      ? null
      : 'Remote/non-local runtime gate is not blocked.',
    localGate.status === 'local_preview_allowed' && localGate.scannerPreviewAllowed
      ? null
      : 'Local explicit-flag runtime gate is not allowed.',
    localGate.publishDiscord === false ? null : 'Local runtime gate would post Discord.',
    localGate.writesSupabase === false ? null : 'Local runtime gate would write Supabase.',
    localGate.readsLiveSupabase === false ? null : 'Local runtime gate would read live Supabase.',
    localGate.readsLiveBridge === false ? null : 'Local runtime gate would read live bridge.',
    localGate.canExecute === false ? null : 'Local runtime gate has canExecute=true.',
    localGate.changesTradingLogic === false ? null : 'Local runtime gate changes trading logic.',
    localGate.changesCanExecute === false ? null : 'Local runtime gate changes canExecute.',
    localGate.automatedOrders === false ? null : 'Local runtime gate allows automated orders.',
    ...localGate.blockers,
  ].filter((item): item is string => Boolean(item));
  const { summary } = args.rehearsalReport;
  const report: Omit<LocalLiveReadinessReport, 'markdown'> = {
    reportType: 'unified_desk_output_local_live_readiness',
    generatedAt,
    status: blockers.length ? 'blocked' : 'pass',
    authority: {
      localOnly: true,
      readsSavedRehearsalOnly: true,
      requiresExplicitLocalFlag: true,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      automatedOrders: false,
    },
    source: {
      rehearsalPath: args.rehearsalPath,
      rehearsalStatus: args.rehearsalReport.status,
    },
    summary: {
      defaultDisabled: defaultGate.status === 'disabled' && !defaultGate.scannerPreviewAllowed,
      remoteBlocked: remoteGate.status === 'blocked' && !remoteGate.scannerPreviewAllowed,
      localPreviewAllowed: localGate.status === 'local_preview_allowed',
      scannerPreviewAllowed: localGate.scannerPreviewAllowed,
      previewRows: summary.previewRows,
      approvedDeskPlanRows: summary.approvedDeskPlanRows,
      formingDeskReadRows: summary.formingDeskReadRows,
      discordPostRows: summary.discordPostRows,
      supabaseWriteRows: summary.supabaseWriteRows,
      liveSupabaseReadRows: summary.liveSupabaseReadRows,
      liveBridgeReadRows: summary.liveBridgeReadRows,
      canExecuteTrueRows: summary.canExecuteTrueRows,
      wordingViolationRows: summary.wordingViolationRows,
      blockedRows: summary.blockedRows,
      recommendation: blockers.length ? 'hold_for_local_live_gate_fix' : 'ready_for_local_live_preview',
    },
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeUnifiedDeskOutputLocalLiveReadinessReport(report: LocalLiveReadinessReport, outDir: string): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-desk-output-local-live-readiness-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-desk-output-local-live-readiness-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const rehearsalPath = path.resolve(options.rehearsalPath ||
    latestMatchingFile(DEFAULT_REPORT_DIR, /^unified-desk-output-local-go-live-rehearsal-\d+\.json$/) ||
    '');
  if (!fs.existsSync(rehearsalPath)) throw new Error('Missing Unified Desk Output local go-live rehearsal path.');
  const report = buildUnifiedDeskOutputLocalLiveReadinessReport({
    rehearsalPath,
    rehearsalReport: readJson<UnifiedDeskOutputLocalGoLiveRehearsalGateReport>(rehearsalPath),
  });
  const written = writeUnifiedDeskOutputLocalLiveReadinessReport(report, path.resolve(options.outDir));
  if (options.json) {
    console.log(JSON.stringify({ ...written, status: report.status, summary: report.summary, blockers: report.blockers.slice(0, 20) }, null, 2));
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
