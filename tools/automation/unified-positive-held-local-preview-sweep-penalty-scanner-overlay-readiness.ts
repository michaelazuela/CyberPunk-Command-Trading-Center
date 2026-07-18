import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveScannerDryRunReplayReport } from './unified-positive-scanner-dry-run-replay';
import type {
  UnifiedPositiveHeldLocalPreviewSweepPenaltyGuardedReplayReport,
} from './unified-positive-held-local-preview-sweep-penalty-guarded-replay';

export interface UnifiedPositiveHeldLocalPreviewSweepPenaltyScannerOverlayReadinessReport {
  reportType: 'unified_positive_held_local_preview_sweep_penalty_scanner_overlay_readiness';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: {
    readOnly: true;
    localOnly: true;
    researchOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    runsSetupScanner: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRiskRules: false;
    changesBridgeBehavior: false;
    changesDiscordPosting: false;
    changesAppRuntime: false;
  };
  source: {
    reportDir: string;
    sweepPenaltyGuardedReplayPath: string | null;
    scannerDryRunReplayPath: string | null;
  };
  assumptions: {
    readinessOnly: true;
    noOverlayInstalled: true;
    noLiveScannerRun: true;
    noLiveFilterInstalled: true;
    noRankPenaltyInstalled: true;
    noCanExecuteChange: true;
    livePromotionAllowed: false;
  };
  summary: {
    guardedReplayStatus: string | null;
    scannerDryRunStatus: string | null;
    validSweepLeadRows: number;
    invalidStopSweepPenaltyRows: number;
    validSweepLeadRowsPenalized: number;
    guardedChangedSlates: number;
    guardedTopSelectionDeltaOneMesPl: number | null;
    scannerDryRunRows: number;
    scannerZeroLivePublishBehaviorChangeRows: number;
    scannerBlockedRows: number;
    recommendedAction: 'ready_for_fresh_research_scanner_overlay_dry_run' | 'keep_research_only' | 'reject_overlay_for_now';
    livePromotionAllowedRows: 0;
  };
  blockers: string[];
  recommendations: string[];
  markdown: string;
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

function authority(): UnifiedPositiveHeldLocalPreviewSweepPenaltyScannerOverlayReadinessReport['authority'] {
  return {
    readOnly: true,
    localOnly: true,
    researchOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    runsSetupScanner: false,
    changesScannerBehavior: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    changesRiskRules: false,
    changesBridgeBehavior: false,
    changesDiscordPosting: false,
    changesAppRuntime: false,
  };
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewSweepPenaltyScannerOverlayReadinessReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Sweep Penalty Scanner Overlay Readiness',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only readiness gate. It does not install overlays, post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Guarded replay status: ${report.summary.guardedReplayStatus ?? '-'}.`,
    `- Scanner dry-run status: ${report.summary.scannerDryRunStatus ?? '-'}.`,
    `- Valid Sweep lead rows: ${report.summary.validSweepLeadRows}.`,
    `- Invalid-stop Sweep penalty rows: ${report.summary.invalidStopSweepPenaltyRows}.`,
    `- Valid Sweep lead rows penalized: ${report.summary.validSweepLeadRowsPenalized}.`,
    `- Guarded changed slates: ${report.summary.guardedChangedSlates}.`,
    `- Guarded top-selection delta: ${report.summary.guardedTopSelectionDeltaOneMesPl ?? '-'}.`,
    `- Scanner dry-run rows: ${report.summary.scannerDryRunRows}.`,
    `- Scanner zero-live-publish rows: ${report.summary.scannerZeroLivePublishBehaviorChangeRows}.`,
    `- Scanner blocked rows: ${report.summary.scannerBlockedRows}.`,
    `- Recommended action: ${report.summary.recommendedAction}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewSweepPenaltyScannerOverlayReadinessReport(args: {
  reportDir: string;
  sweepPenaltyGuardedReplayPath: string | null;
  sweepPenaltyGuardedReplayReport: UnifiedPositiveHeldLocalPreviewSweepPenaltyGuardedReplayReport | null;
  scannerDryRunReplayPath: string | null;
  scannerDryRunReplayReport: UnifiedPositiveScannerDryRunReplayReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewSweepPenaltyScannerOverlayReadinessReport {
  const guarded = args.sweepPenaltyGuardedReplayReport;
  const scanner = args.scannerDryRunReplayReport;
  const blockers = [
    !args.sweepPenaltyGuardedReplayPath ? 'missing Sweep penalty guarded replay path' : null,
    !guarded ? 'missing Sweep penalty guarded replay report' : null,
    guarded && guarded.status !== 'pass' ? `Sweep penalty guarded replay status ${guarded.status}` : null,
    guarded && guarded.summary.validSweepLeadRowsPenalized !== 0 ? 'valid Sweep lead rows were penalized' : null,
    guarded && guarded.summary.changedSlates !== guarded.summary.changedFromInvalidStopSweepSlates ? 'not every changed slate starts from invalid-stop Sweep' : null,
    guarded && guarded.summary.changedSlates !== guarded.summary.changedToValidSweepOrAlternateSlates ? 'not every changed slate lands on valid Sweep lead or alternate model' : null,
    !args.scannerDryRunReplayPath ? 'missing scanner dry-run replay path' : null,
    !scanner ? 'missing scanner dry-run replay report' : null,
    scanner && scanner.status !== 'pass' ? `scanner dry-run replay status ${scanner.status}` : null,
    scanner && scanner.summary.blockedRows !== 0 ? 'scanner dry-run has blocked rows' : null,
    scanner && scanner.summary.pairedDryRunRows !== scanner.summary.zeroLivePublishBehaviorChangeRows ? 'scanner dry-run would change live publish behavior' : null,
  ].filter((item): item is string => Boolean(item));
  const ready = !blockers.length && (guarded?.summary.topSelectionDeltaOneMesPl ?? 0) >= 0 && (guarded?.summary.changedSlates ?? 0) > 0;
  const base: Omit<UnifiedPositiveHeldLocalPreviewSweepPenaltyScannerOverlayReadinessReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_sweep_penalty_scanner_overlay_readiness',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      sweepPenaltyGuardedReplayPath: args.sweepPenaltyGuardedReplayPath,
      scannerDryRunReplayPath: args.scannerDryRunReplayPath,
    },
    assumptions: {
      readinessOnly: true,
      noOverlayInstalled: true,
      noLiveScannerRun: true,
      noLiveFilterInstalled: true,
      noRankPenaltyInstalled: true,
      noCanExecuteChange: true,
      livePromotionAllowed: false,
    },
    summary: {
      guardedReplayStatus: guarded?.status || null,
      scannerDryRunStatus: scanner?.status || null,
      validSweepLeadRows: guarded?.summary.validSweepLeadRows || 0,
      invalidStopSweepPenaltyRows: guarded?.summary.invalidStopSweepPenaltyRows || 0,
      validSweepLeadRowsPenalized: guarded?.summary.validSweepLeadRowsPenalized || 0,
      guardedChangedSlates: guarded?.summary.changedSlates || 0,
      guardedTopSelectionDeltaOneMesPl: guarded?.summary.topSelectionDeltaOneMesPl || null,
      scannerDryRunRows: scanner?.summary.pairedDryRunRows || 0,
      scannerZeroLivePublishBehaviorChangeRows: scanner?.summary.zeroLivePublishBehaviorChangeRows || 0,
      scannerBlockedRows: scanner?.summary.blockedRows || 0,
      recommendedAction: blockers.length ? 'reject_overlay_for_now' : ready ? 'ready_for_fresh_research_scanner_overlay_dry_run' : 'keep_research_only',
      livePromotionAllowedRows: 0,
    },
    blockers,
    recommendations: blockers.length
      ? ['Do not run a scanner overlay dry-run until readiness blockers are cleared.']
      : ready
        ? [
          'Proceed to a fresh research scanner overlay dry-run with the invalid-stop Sweep penalty disabled from all live-facing paths.',
          'Do not change live ranking, canExecute, Discord, Supabase, bridge, entry, stop, target, risk, or model availability.',
        ]
        : ['Keep this research-only and gather more scanner dry-run proof before any overlay experiment.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewSweepPenaltyScannerOverlayReadinessReport(
  report: UnifiedPositiveHeldLocalPreviewSweepPenaltyScannerOverlayReadinessReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-sweep-penalty-scanner-overlay-readiness-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewSweepPenaltyScannerOverlayReadinessCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const sweepPenaltyGuardedReplayPath = readFlag(args, '--sweep-penalty-guarded-replay') || latestMatchingFile(outDir, /^unified-positive-held-local-preview-sweep-penalty-guarded-replay-\d+\.json$/);
  const scannerDryRunReplayPath = readFlag(args, '--scanner-dry-run-replay') || latestMatchingFile(outDir, /^unified-positive-scanner-dry-run-replay-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewSweepPenaltyScannerOverlayReadinessReport({
    reportDir: outDir,
    sweepPenaltyGuardedReplayPath,
    sweepPenaltyGuardedReplayReport: sweepPenaltyGuardedReplayPath && fs.existsSync(sweepPenaltyGuardedReplayPath) ? readJson<UnifiedPositiveHeldLocalPreviewSweepPenaltyGuardedReplayReport>(sweepPenaltyGuardedReplayPath) : null,
    scannerDryRunReplayPath,
    scannerDryRunReplayReport: scannerDryRunReplayPath && fs.existsSync(scannerDryRunReplayPath) ? readJson<UnifiedPositiveScannerDryRunReplayReport>(scannerDryRunReplayPath) : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewSweepPenaltyScannerOverlayReadinessReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runUnifiedPositiveHeldLocalPreviewSweepPenaltyScannerOverlayReadinessCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
