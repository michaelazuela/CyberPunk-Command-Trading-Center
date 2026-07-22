import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  buildUnifiedDeskOutputDisabledScannerRuntimePreview,
  type UnifiedDeskOutputDisabledE2ERuntimeValidationReport,
  type UnifiedDeskOutputDisabledScannerRuntimePreview,
} from '../../src/lib/unifiedDeskOutputDisabledScannerRuntime';

interface DisabledScannerRuntimeWiringReport {
  reportType: 'unified_desk_output_disabled_scanner_runtime_wiring';
  generatedAt: string;
  status: 'pass' | 'blocked';
  authority: {
    localOnly: true;
    readsSavedDisabledE2EReportOnly: true;
    writesDiagnosticArtifactsOnly: true;
    defaultDisabled: true;
    runtimeGateEnabled: false;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    canExecute: false;
    automatedOrders: false;
  };
  source: {
    disabledE2EReportPath: string;
  };
  summary: {
    defaultStatus: 'disabled' | 'ready' | 'blocked';
    localPreviewStatus: 'disabled' | 'ready' | 'blocked';
    defaultScannerPreviewRows: number;
    localScannerPreviewRows: number;
    morningRows: number;
    lunchRows: number;
    runtimeGateEnabled: false;
    scannerRuntimeChangedRows: number;
    discordPostRows: number;
    supabaseWriteRows: number;
    liveSupabaseReadRows: number;
    liveBridgeReadRows: number;
    canExecuteTrueRows: number;
    canExecuteChangedRows: number;
    tradingLogicChangedRows: number;
    automatedOrderRows: number;
    blockedRows: number;
    recommendation: 'ready_for_local_scanner_runtime_consumer_probe' | 'hold_for_disabled_scanner_runtime_wiring_fix';
  };
  defaultPreview: UnifiedDeskOutputDisabledScannerRuntimePreview;
  localPreview: UnifiedDeskOutputDisabledScannerRuntimePreview;
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  disabledE2EReportPath: string | null;
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
    disabledE2EReportPath: readFlag(args, '--disabled-e2e-report'),
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

function buildMarkdown(report: Omit<DisabledScannerRuntimeWiringReport, 'markdown'>): string {
  return [
    '# Unified Desk Output Disabled Scanner Runtime Wiring',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local disabled scanner-runtime wiring proof only. It reads the saved disabled E2E runtime validation report and builds the scanner callable preview model in default-off and explicit-local-preview modes. It does not post Discord, write Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Summary',
    `- Default status: ${report.summary.defaultStatus}.`,
    `- Local preview status: ${report.summary.localPreviewStatus}.`,
    `- Default scanner preview rows: ${report.summary.defaultScannerPreviewRows}.`,
    `- Local scanner preview rows: ${report.summary.localScannerPreviewRows}.`,
    `- Morning rows: ${report.summary.morningRows}.`,
    `- Lunch rows: ${report.summary.lunchRows}.`,
    `- Runtime gate enabled: ${report.summary.runtimeGateEnabled}.`,
    `- Scanner-runtime changed rows: ${report.summary.scannerRuntimeChangedRows}.`,
    `- Discord-post rows: ${report.summary.discordPostRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- canExecute changed rows: ${report.summary.canExecuteChangedRows}.`,
    `- Trading-logic changed rows: ${report.summary.tradingLogicChangedRows}.`,
    `- Automated-order rows: ${report.summary.automatedOrderRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Local Preview Rows',
    '| Session | Model | Direction | Proof ET | Entry | Stop | T1 | T2 |',
    '|---|---|---|---:|---:|---:|---:|---:|',
    ...report.localPreview.rows.map((row) => `| ${row.session} | ${row.model} | ${row.direction} | ${row.proofLine.replace('Completed 5M proof: ', '').replace(' ET.', '')} | ${row.levelLine.split(' | ')[0].replace('Entry ', '')} | ${row.levelLine.split(' | ')[1].replace('Stop ', '')} | ${row.levelLine.split(' | ')[2].replace('T1 ', '')} | ${row.levelLine.split(' | ')[3].replace('T2 ', '')} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildUnifiedDeskOutputDisabledScannerRuntimeWiringReport(args: {
  disabledE2EReportPath: string;
  disabledE2EReport: UnifiedDeskOutputDisabledE2ERuntimeValidationReport | null;
}, generatedAt = new Date().toISOString()): DisabledScannerRuntimeWiringReport {
  const defaultPreview = buildUnifiedDeskOutputDisabledScannerRuntimePreview({
    explicitLocalPreviewFlag: false,
    localHost: true,
    report: args.disabledE2EReport,
  });
  const localPreview = buildUnifiedDeskOutputDisabledScannerRuntimePreview({
    explicitLocalPreviewFlag: true,
    localHost: true,
    report: args.disabledE2EReport,
  });
  const blockers = [
    defaultPreview.status === 'disabled' ? null : `Default scanner runtime status is ${defaultPreview.status}.`,
    defaultPreview.summary.scannerPreviewRows === 0 ? null : 'Default scanner runtime produced preview rows.',
    localPreview.status === 'ready' ? null : `Explicit local scanner preview status is ${localPreview.status}.`,
    localPreview.summary.scannerPreviewRows === 2 ? null : 'Explicit local scanner preview did not produce exactly two rows.',
    localPreview.summary.morningRows === 1 ? null : 'Explicit local scanner preview did not produce exactly one morning row.',
    localPreview.summary.lunchRows === 1 ? null : 'Explicit local scanner preview did not produce exactly one lunch row.',
    ...localPreview.blockers,
  ].filter((item): item is string => Boolean(item));
  const report: Omit<DisabledScannerRuntimeWiringReport, 'markdown'> = {
    reportType: 'unified_desk_output_disabled_scanner_runtime_wiring',
    generatedAt,
    status: blockers.length ? 'blocked' : 'pass',
    authority: {
      localOnly: true,
      readsSavedDisabledE2EReportOnly: true,
      writesDiagnosticArtifactsOnly: true,
      defaultDisabled: true,
      runtimeGateEnabled: false,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesScannerBehavior: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      canExecute: false,
      automatedOrders: false,
    },
    source: {
      disabledE2EReportPath: args.disabledE2EReportPath,
    },
    summary: {
      defaultStatus: defaultPreview.status,
      localPreviewStatus: localPreview.status,
      defaultScannerPreviewRows: defaultPreview.summary.scannerPreviewRows,
      localScannerPreviewRows: localPreview.summary.scannerPreviewRows,
      morningRows: localPreview.summary.morningRows,
      lunchRows: localPreview.summary.lunchRows,
      runtimeGateEnabled: false,
      scannerRuntimeChangedRows: 0,
      discordPostRows: 0,
      supabaseWriteRows: 0,
      liveSupabaseReadRows: 0,
      liveBridgeReadRows: 0,
      canExecuteTrueRows: 0,
      canExecuteChangedRows: 0,
      tradingLogicChangedRows: 0,
      automatedOrderRows: 0,
      blockedRows: blockers.length,
      recommendation: blockers.length ? 'hold_for_disabled_scanner_runtime_wiring_fix' : 'ready_for_local_scanner_runtime_consumer_probe',
    },
    defaultPreview,
    localPreview,
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeUnifiedDeskOutputDisabledScannerRuntimeWiringReport(
  report: DisabledScannerRuntimeWiringReport,
  outDir: string,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-desk-output-disabled-scanner-runtime-wiring-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-desk-output-disabled-scanner-runtime-wiring-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const outDir = path.resolve(options.outDir);
  const disabledE2EReportPath = path.resolve(options.disabledE2EReportPath ||
    latestMatchingFile(outDir, /^unified-desk-output-disabled-e2e-runtime-validation-\d+\.json$/) ||
    '');
  if (!fs.existsSync(disabledE2EReportPath)) throw new Error('Missing Unified Desk Output disabled E2E runtime validation report path.');
  const report = buildUnifiedDeskOutputDisabledScannerRuntimeWiringReport({
    disabledE2EReportPath,
    disabledE2EReport: readJson<UnifiedDeskOutputDisabledE2ERuntimeValidationReport>(disabledE2EReportPath),
  });
  const written = writeUnifiedDeskOutputDisabledScannerRuntimeWiringReport(report, outDir);
  if (options.json) {
    console.log(JSON.stringify({
      ...written,
      status: report.status,
      summary: report.summary,
      localPreviewRows: report.localPreview.rows,
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
