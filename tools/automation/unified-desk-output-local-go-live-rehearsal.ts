import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  buildUnifiedDeskOutputScannerSurfacePreviewModel,
  type UnifiedDeskOutputScannerSurfaceSmokeReport,
} from '../../src/lib/unifiedDeskOutputScannerSurfacePreviewAdapter';

interface LocalGoLiveRehearsalReport {
  reportType: 'unified_desk_output_local_go_live_rehearsal';
  generatedAt: string;
  status: 'pass' | 'blocked';
  authority: {
    localOnly: true;
    hiddenPreviewFlagRequired: true;
    readsSavedSurfaceSmokeOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    automatedOrders: false;
  };
  source: {
    surfaceSmokePath: string;
    surfaceSmokeStatus: 'pass' | 'blocked';
  };
  summary: {
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
    recommendation: 'ready_for_local_scanner_rehearsal_only' | 'hold_for_preview_contract_fix';
  };
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  surfaceSmokePath: string | null;
  outDir: string;
  json: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const BLOCKED_WORDING = /human[- ]review|no chase|no-trade|no trade|missed/i;

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function parseArgs(args = process.argv.slice(2)): CliOptions {
  return {
    surfaceSmokePath: readFlag(args, '--surface-smoke'),
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

function rowText(row: ReturnType<typeof buildUnifiedDeskOutputScannerSurfacePreviewModel>['rows'][number]): string {
  return [
    row.headline,
    ...row.bodyLines,
    row.levelLine,
    row.riskLine,
    row.proofLine,
    row.invalidationLine,
    row.authorityLine,
  ].join(' ');
}

function buildMarkdown(report: Omit<LocalGoLiveRehearsalReport, 'markdown'>): string {
  return [
    '# Unified Desk Output Local Go-Live Rehearsal',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local hidden-preview rehearsal only. It reads a saved scanner surface smoke report and does not post Discord, write Supabase, read live Supabase, read live bridge data, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Summary',
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
    `- Surface smoke: ${report.source.surfaceSmokePath}.`,
    `- Surface smoke status: ${report.source.surfaceSmokeStatus}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildUnifiedDeskOutputLocalGoLiveRehearsalReport(args: {
  surfaceSmokePath: string;
  surfaceSmokeReport: UnifiedDeskOutputScannerSurfaceSmokeReport;
}, generatedAt = new Date().toISOString()): LocalGoLiveRehearsalReport {
  const preview = buildUnifiedDeskOutputScannerSurfacePreviewModel({
    enabled: true,
    localHost: true,
    report: args.surfaceSmokeReport,
  });
  const wordingViolationRows = preview.rows.filter((row) => BLOCKED_WORDING.test(rowText(row))).length;
  const blockers = [
    args.surfaceSmokeReport.reportType === 'unified_desk_output_scanner_surface_smoke'
      ? null
      : 'Source report is not scanner surface smoke.',
    args.surfaceSmokeReport.status === 'pass' ? null : `Surface smoke status is ${args.surfaceSmokeReport.status}.`,
    preview.status === 'ready' ? null : `Local preview adapter status is ${preview.status}.`,
    preview.localOnly ? null : 'Preview is not local-only.',
    preview.publishDiscord === false ? null : 'Preview would post Discord.',
    preview.writesSupabase === false ? null : 'Preview would write Supabase.',
    preview.readsLiveSupabase === false ? null : 'Preview would read live Supabase.',
    preview.readsLiveBridge === false ? null : 'Preview would read live bridge.',
    preview.changesTradingLogic === false ? null : 'Preview changes trading logic.',
    preview.changesCanExecute === false ? null : 'Preview changes canExecute.',
    preview.canExecute === false ? null : 'Preview has canExecute=true.',
    preview.rows.length > 0 ? null : 'Preview has no rows to rehearse.',
    wordingViolationRows === 0 ? null : 'Preview contains blocked legacy wording.',
    ...preview.blockers,
  ].filter((item): item is string => Boolean(item));
  const approvedDeskPlanRows = preview.rows.filter((row) => row.state === 'APPROVED_DESK_PLAN').length;
  const formingDeskReadRows = preview.rows.filter((row) => row.state === 'FORMING_DESK_READ').length;
  const report: Omit<LocalGoLiveRehearsalReport, 'markdown'> = {
    reportType: 'unified_desk_output_local_go_live_rehearsal',
    generatedAt,
    status: blockers.length ? 'blocked' : 'pass',
    authority: {
      localOnly: true,
      hiddenPreviewFlagRequired: true,
      readsSavedSurfaceSmokeOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      automatedOrders: false,
    },
    source: {
      surfaceSmokePath: args.surfaceSmokePath,
      surfaceSmokeStatus: args.surfaceSmokeReport.status,
    },
    summary: {
      previewRows: preview.rows.length,
      approvedDeskPlanRows,
      formingDeskReadRows,
      discordPostRows: preview.publishDiscord ? preview.rows.length : 0,
      supabaseWriteRows: preview.writesSupabase ? preview.rows.length : 0,
      liveSupabaseReadRows: preview.readsLiveSupabase ? preview.rows.length : 0,
      liveBridgeReadRows: preview.readsLiveBridge ? preview.rows.length : 0,
      canExecuteTrueRows: preview.canExecute ? preview.rows.length : 0,
      wordingViolationRows,
      blockedRows: blockers.length,
      recommendation: blockers.length ? 'hold_for_preview_contract_fix' : 'ready_for_local_scanner_rehearsal_only',
    },
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeUnifiedDeskOutputLocalGoLiveRehearsalReport(report: LocalGoLiveRehearsalReport, outDir: string): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-desk-output-local-go-live-rehearsal-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-desk-output-local-go-live-rehearsal-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const surfaceSmokePath = path.resolve(options.surfaceSmokePath ||
    latestMatchingFile(DEFAULT_REPORT_DIR, /^unified-desk-output-scanner-surface-smoke-\d+\.json$/) ||
    '');
  if (!fs.existsSync(surfaceSmokePath)) throw new Error('Missing Unified Desk Output scanner surface smoke path.');
  const report = buildUnifiedDeskOutputLocalGoLiveRehearsalReport({
    surfaceSmokePath,
    surfaceSmokeReport: readJson<UnifiedDeskOutputScannerSurfaceSmokeReport>(surfaceSmokePath),
  });
  const written = writeUnifiedDeskOutputLocalGoLiveRehearsalReport(report, path.resolve(options.outDir));
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
