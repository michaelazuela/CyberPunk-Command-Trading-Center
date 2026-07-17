import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalTicketAdapterReport } from './unified-positive-held-local-ticket-adapter';
import {
  buildUnifiedPositiveHeldLocalInspectionSurfaceReport,
  writeUnifiedPositiveHeldLocalInspectionSurfaceReport,
  type UnifiedPositiveHeldLocalInspectionSurfaceReport,
} from './unified-positive-held-local-inspection-surface';
import {
  buildUnifiedPositiveScannerDryRunReplayReport,
  writeUnifiedPositiveScannerDryRunReplayReport,
  type UnifiedPositiveScannerDryRunReplayReport,
} from './unified-positive-scanner-dry-run-replay';

export interface UnifiedPositiveGuardedScannerReplayReport {
  reportType: 'unified_positive_guarded_scanner_replay';
  generatedAt: string;
  status: 'pass' | 'blocked';
  authority: {
    readOnly: true;
    localOnly: true;
    researchOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    runsLiveSetupScanner: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRiskRules: false;
    changesBridgeBehavior: false;
    changesDiscordPosting: false;
  };
  source: {
    heldLocalAdapterPath: string | null;
  };
  output: {
    dryRunReplayJsonPath: string | null;
    dryRunReplayMarkdownPath: string | null;
    inspectionJsonPath: string | null;
    inspectionMarkdownPath: string | null;
  };
  summary: {
    explicitGuardEnabled: boolean;
    dryRunReplayStatus: UnifiedPositiveScannerDryRunReplayReport['status'] | null;
    inspectionStatus: UnifiedPositiveHeldLocalInspectionSurfaceReport['status'] | null;
    heldLocalTickets: number;
    zeroLivePublishBehaviorChangeRows: number;
    inspectableTickets: number;
    blockedRows: number;
  };
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function authority(): UnifiedPositiveGuardedScannerReplayReport['authority'] {
  return {
    readOnly: true,
    localOnly: true,
    researchOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    runsLiveSetupScanner: false,
    changesScannerBehavior: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    changesRiskRules: false,
    changesBridgeBehavior: false,
    changesDiscordPosting: false,
  };
}

function buildMarkdown(report: Omit<UnifiedPositiveGuardedScannerReplayReport, 'markdown'>): string {
  const lines = [
    '# Unified Positive Guarded Scanner Replay',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only replay wiring. It does not post Discord, write Supabase, read live bridge data, run the live setup scanner, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Explicit guard enabled: ${report.summary.explicitGuardEnabled}.`,
    `- Dry-run replay status: ${report.summary.dryRunReplayStatus ?? 'not_run'}.`,
    `- Inspection status: ${report.summary.inspectionStatus ?? 'not_run'}.`,
    `- Held-local tickets: ${report.summary.heldLocalTickets}.`,
    `- Zero live publish behavior change rows: ${report.summary.zeroLivePublishBehaviorChangeRows}.`,
    `- Inspectable tickets: ${report.summary.inspectableTickets}.`,
    `- Blocked rows: ${report.summary.blockedRows}.`,
    '',
    '## Output',
    `- Dry-run replay JSON: ${report.output.dryRunReplayJsonPath ?? 'not_written'}.`,
    `- Dry-run replay Markdown: ${report.output.dryRunReplayMarkdownPath ?? 'not_written'}.`,
    `- Inspection JSON: ${report.output.inspectionJsonPath ?? 'not_written'}.`,
    `- Inspection Markdown: ${report.output.inspectionMarkdownPath ?? 'not_written'}.`,
  ];
  if (report.blockers.length) {
    lines.push('', '## Blockers', ...report.blockers.map((item) => `- ${item}`));
  }
  lines.push('', '## Recommendations', ...report.recommendations.map((item) => `- ${item}`));
  return lines.join('\n');
}

function recommendations(status: UnifiedPositiveGuardedScannerReplayReport['status']): string[] {
  if (status === 'blocked') {
    return [
      'Do not expose held-local tickets beyond local replay inspection until blockers are cleared.',
    ];
  }
  return [
    'Use this command as the guarded local replay lane for held-local ticket inspection.',
    'Production Discord/Supabase publishing remains disabled and still requires a separate approval gate.',
  ];
}

export function buildUnifiedPositiveGuardedScannerReplayReport(args: {
  heldLocalAdapter: UnifiedPositiveHeldLocalTicketAdapterReport;
  heldLocalAdapterPath?: string | null;
  outDir?: string;
  explicitGuardEnabled: boolean;
}, generatedAt = new Date().toISOString()): UnifiedPositiveGuardedScannerReplayReport {
  const blockers = args.explicitGuardEnabled ? [] : ['Missing required --enable-held-local-inspection guard flag.'];
  let dryRunReplay: UnifiedPositiveScannerDryRunReplayReport | null = null;
  let inspection: UnifiedPositiveHeldLocalInspectionSurfaceReport | null = null;
  let dryRunPaths: { jsonPath: string; markdownPath: string } | null = null;
  let inspectionPaths: { jsonPath: string; markdownPath: string } | null = null;

  if (args.explicitGuardEnabled) {
    dryRunReplay = buildUnifiedPositiveScannerDryRunReplayReport({
      heldLocalAdapter: args.heldLocalAdapter,
      heldLocalAdapterPath: args.heldLocalAdapterPath || null,
    }, generatedAt);
    dryRunPaths = writeUnifiedPositiveScannerDryRunReplayReport(dryRunReplay, args.outDir || DEFAULT_OUT_DIR);
    inspection = buildUnifiedPositiveHeldLocalInspectionSurfaceReport({
      heldLocalAdapter: args.heldLocalAdapter,
      dryRunReplay,
      heldLocalAdapterPath: args.heldLocalAdapterPath || null,
      dryRunReplayPath: dryRunPaths.jsonPath,
    }, generatedAt);
    inspectionPaths = writeUnifiedPositiveHeldLocalInspectionSurfaceReport(inspection, args.outDir || DEFAULT_OUT_DIR);
    if (dryRunReplay.status !== 'pass') blockers.push(`dry-run replay status ${dryRunReplay.status}`);
    if (inspection.status !== 'pass') blockers.push(`inspection status ${inspection.status}`);
  }

  const status: UnifiedPositiveGuardedScannerReplayReport['status'] = blockers.length ? 'blocked' : 'pass';
  const reportBase: Omit<UnifiedPositiveGuardedScannerReplayReport, 'recommendations' | 'markdown'> = {
    reportType: 'unified_positive_guarded_scanner_replay',
    generatedAt,
    status,
    authority: authority(),
    source: {
      heldLocalAdapterPath: args.heldLocalAdapterPath || null,
    },
    output: {
      dryRunReplayJsonPath: dryRunPaths?.jsonPath || null,
      dryRunReplayMarkdownPath: dryRunPaths?.markdownPath || null,
      inspectionJsonPath: inspectionPaths?.jsonPath || null,
      inspectionMarkdownPath: inspectionPaths?.markdownPath || null,
    },
    summary: {
      explicitGuardEnabled: args.explicitGuardEnabled,
      dryRunReplayStatus: dryRunReplay?.status || null,
      inspectionStatus: inspection?.status || null,
      heldLocalTickets: args.heldLocalAdapter.summary.heldLocalArtifactsCreated,
      zeroLivePublishBehaviorChangeRows: dryRunReplay?.summary.zeroLivePublishBehaviorChangeRows || 0,
      inspectableTickets: inspection?.summary.inspectableTickets || 0,
      blockedRows: (dryRunReplay?.summary.blockedRows || 0) + (inspection?.summary.blockedRows || 0),
    },
    blockers,
  };
  const reportRecommendations = recommendations(status);
  const withoutMarkdown = { ...reportBase, recommendations: reportRecommendations };
  return { ...withoutMarkdown, markdown: buildMarkdown(withoutMarkdown) };
}

export function writeUnifiedPositiveGuardedScannerReplayReport(
  report: UnifiedPositiveGuardedScannerReplayReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-guarded-scanner-replay-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export async function runUnifiedPositiveGuardedScannerReplayCli(args = process.argv.slice(2)): Promise<void> {
  const heldLocalAdapterPath = readFlag(args, '--held-local-adapter');
  if (!heldLocalAdapterPath) throw new Error('Missing required --held-local-adapter path.');
  const outDir = readFlag(args, '--out-dir') || DEFAULT_OUT_DIR;
  const heldLocalAdapter = JSON.parse(fs.readFileSync(heldLocalAdapterPath, 'utf8')) as UnifiedPositiveHeldLocalTicketAdapterReport;
  const report = buildUnifiedPositiveGuardedScannerReplayReport({
    heldLocalAdapter,
    heldLocalAdapterPath,
    outDir,
    explicitGuardEnabled: hasFlag(args, '--enable-held-local-inspection'),
  });
  const paths = writeUnifiedPositiveGuardedScannerReplayReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, output: report.output }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runUnifiedPositiveGuardedScannerReplayCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
