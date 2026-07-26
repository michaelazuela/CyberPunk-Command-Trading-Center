import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveScannerDryRunReplayReport } from './unified-positive-scanner-dry-run-replay';
import type {
  UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport,
} from './unified-positive-held-local-preview-sweep-penalty-installed-score-comparison';

type ScannerRow = UnifiedPositiveScannerDryRunReplayReport['rows'][number];
type InstalledScoreRow = UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport['rows'][number];

interface ScannerArtifactComparisonRow {
  ticketId: string;
  session: string | null;
  setupType: string;
  direction: string;
  installedScoreObserved: boolean;
  installedScore: number | null;
  validSweepLead: boolean | null;
  invalidStopSweepPenaltyCandidate: boolean | null;
  installedPenaltyExpected: boolean | null;
  shouldPostChanged: false;
  publishDiscordChanged: false;
  canExecuteChanged: false;
  scannerBehaviorChanged: boolean;
  blockers: string[];
}

export interface UnifiedPositiveHeldLocalPreviewSweepPenaltyScannerArtifactComparisonReport {
  reportType: 'unified_positive_held_local_preview_sweep_penalty_scanner_artifact_comparison';
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
    scannerDryRunReplayPath: string | null;
    installedScoreComparisonPath: string | null;
  };
  summary: {
    scannerDryRunRows: number;
    installedScoreRows: number;
    joinedScannerRows: number;
    scannerRowsMissingInstalledScore: number;
    invalidStopSweepScannerRows: number;
    validSweepLeadScannerRows: number;
    scannerBehaviorChangedRows: number;
    shouldPostChangedRows: number;
    publishDiscordChangedRows: number;
    canExecuteChangedRows: number;
    scannerBlockedRows: number;
    installedInvalidStopSweepRows: number;
    installedValidSweepLeadRows: number;
    installedPenaltyRows: number;
    installedValidSweepLeadRowsPenalized: number;
    recommendation: 'scanner_artifacts_preserve_live_behavior' | 'needs_fresh_scanner_artifacts' | 'reject_scanner_artifact_path';
    livePromotionAllowedRows: 0;
  };
  rows: ScannerArtifactComparisonRow[];
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

function authority(): UnifiedPositiveHeldLocalPreviewSweepPenaltyScannerArtifactComparisonReport['authority'] {
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

function rowKey(row: Pick<ScannerRow | InstalledScoreRow, 'ticketId'>): string {
  return row.ticketId;
}

function compareRows(scannerRows: ScannerRow[], installedRows: InstalledScoreRow[]): ScannerArtifactComparisonRow[] {
  const installedByTicket = new Map(installedRows.map((row) => [rowKey(row), row]));
  return scannerRows.map((row) => {
    const installed = installedByTicket.get(rowKey(row));
    const scannerBehaviorChanged = !row.comparison.zeroLivePublishBehaviorChange ||
      !row.comparison.scannerBehaviorUnchanged ||
      row.heldLocalOutput.shouldPost !== false ||
      row.heldLocalOutput.publishDiscord !== false ||
      row.heldLocalOutput.canExecute !== false ||
      row.normalDeskOutput.shouldPost !== false ||
      row.normalDeskOutput.publishDiscord !== false ||
      row.normalDeskOutput.canExecute !== false;
    const blockers = [
      !installed ? 'scanner row missing from installed-score comparison set' : null,
      scannerBehaviorChanged ? 'scanner dry-run behavior changed or did not preserve false publish/canExecute flags' : null,
      ...(row.comparison.blockers || []),
    ].filter((item): item is string => Boolean(item));
    return {
      ticketId: row.ticketId,
      session: row.session,
      setupType: row.setupType,
      direction: row.direction,
      installedScoreObserved: Boolean(installed),
      installedScore: installed?.installedScore ?? null,
      validSweepLead: installed?.validSweepLead ?? null,
      invalidStopSweepPenaltyCandidate: installed?.invalidStopSweepPenaltyCandidate ?? null,
      installedPenaltyExpected: installed?.installedPenaltyExpected ?? null,
      shouldPostChanged: false as const,
      publishDiscordChanged: false as const,
      canExecuteChanged: false as const,
      scannerBehaviorChanged,
      blockers,
    };
  }).sort((a, b) => a.ticketId.localeCompare(b.ticketId));
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewSweepPenaltyScannerArtifactComparisonReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Sweep Penalty Scanner Artifact Comparison',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only scanner-artifact comparison. It reads saved reports only and does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Scanner dry-run rows: ${report.summary.scannerDryRunRows}.`,
    `- Installed-score rows: ${report.summary.installedScoreRows}.`,
    `- Joined scanner rows: ${report.summary.joinedScannerRows}.`,
    `- Scanner rows missing installed score: ${report.summary.scannerRowsMissingInstalledScore}.`,
    `- Invalid-stop Sweep scanner rows: ${report.summary.invalidStopSweepScannerRows}.`,
    `- Valid Sweep lead scanner rows: ${report.summary.validSweepLeadScannerRows}.`,
    `- Scanner behavior changed rows: ${report.summary.scannerBehaviorChangedRows}.`,
    `- shouldPost changed rows: ${report.summary.shouldPostChangedRows}.`,
    `- publishDiscord changed rows: ${report.summary.publishDiscordChangedRows}.`,
    `- canExecute changed rows: ${report.summary.canExecuteChangedRows}.`,
    `- Installed invalid-stop Sweep rows: ${report.summary.installedInvalidStopSweepRows}.`,
    `- Installed valid Sweep lead rows: ${report.summary.installedValidSweepLeadRows}.`,
    `- Installed penalty rows: ${report.summary.installedPenaltyRows}.`,
    `- Installed valid Sweep leads penalized: ${report.summary.installedValidSweepLeadRowsPenalized}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewSweepPenaltyScannerArtifactComparisonReport(args: {
  reportDir: string;
  scannerDryRunReplayPath: string | null;
  scannerDryRunReplayReport: UnifiedPositiveScannerDryRunReplayReport | null;
  installedScoreComparisonPath: string | null;
  installedScoreComparisonReport: UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewSweepPenaltyScannerArtifactComparisonReport {
  const scannerRows = args.scannerDryRunReplayReport?.rows || [];
  const installedRows = args.installedScoreComparisonReport?.rows || [];
  const rows = compareRows(scannerRows, installedRows);
  const scannerBehaviorChangedRows = rows.filter((row) => row.scannerBehaviorChanged).length;
  const scannerRowsMissingInstalledScore = rows.filter((row) => !row.installedScoreObserved).length;
  const installedInvalidStopSweepRows = installedRows.filter((row) => row.invalidStopSweepPenaltyCandidate).length;
  const installedValidSweepLeadRows = installedRows.filter((row) => row.validSweepLead).length;
  const installedPenaltyRows = installedRows.filter((row) => row.installedPenaltyExpected).length;
  const installedValidSweepLeadRowsPenalized = installedRows.filter((row) => row.validSweepLead && row.installedPenaltyExpected).length;
  const blockers = [
    !args.scannerDryRunReplayPath ? 'missing scanner dry-run replay path' : null,
    !args.scannerDryRunReplayReport ? 'missing scanner dry-run replay report' : null,
    args.scannerDryRunReplayReport && args.scannerDryRunReplayReport.status !== 'pass' ? `scanner dry-run replay status ${args.scannerDryRunReplayReport.status}` : null,
    !args.installedScoreComparisonPath ? 'missing installed-score comparison path' : null,
    !args.installedScoreComparisonReport ? 'missing installed-score comparison report' : null,
    args.installedScoreComparisonReport && args.installedScoreComparisonReport.status !== 'pass' ? `installed-score comparison status ${args.installedScoreComparisonReport.status}` : null,
    scannerRows.length === 0 ? 'no scanner dry-run rows' : null,
    scannerBehaviorChangedRows !== 0 ? 'one or more scanner artifact rows changed live behavior flags' : null,
    installedValidSweepLeadRowsPenalized !== 0 ? 'installed score comparison penalized valid Sweep lead rows' : null,
  ].filter((item): item is string => Boolean(item));
  const hasSweepScannerArtifactRows = rows.some((row) => row.setupType === 'NoInstalledSetup');
  const recommendation = blockers.length
    ? 'reject_scanner_artifact_path'
    : hasSweepScannerArtifactRows && scannerRowsMissingInstalledScore === 0
      ? 'scanner_artifacts_preserve_live_behavior'
      : 'needs_fresh_scanner_artifacts';
  const base: Omit<UnifiedPositiveHeldLocalPreviewSweepPenaltyScannerArtifactComparisonReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_sweep_penalty_scanner_artifact_comparison',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      scannerDryRunReplayPath: args.scannerDryRunReplayPath,
      installedScoreComparisonPath: args.installedScoreComparisonPath,
    },
    summary: {
      scannerDryRunRows: scannerRows.length,
      installedScoreRows: installedRows.length,
      joinedScannerRows: rows.filter((row) => row.installedScoreObserved).length,
      scannerRowsMissingInstalledScore,
      invalidStopSweepScannerRows: rows.filter((row) => row.invalidStopSweepPenaltyCandidate).length,
      validSweepLeadScannerRows: rows.filter((row) => row.validSweepLead).length,
      scannerBehaviorChangedRows,
      shouldPostChangedRows: 0,
      publishDiscordChangedRows: 0,
      canExecuteChangedRows: 0,
      scannerBlockedRows: args.scannerDryRunReplayReport?.summary.blockedRows || 0,
      installedInvalidStopSweepRows,
      installedValidSweepLeadRows,
      installedPenaltyRows,
      installedValidSweepLeadRowsPenalized,
      recommendation,
      livePromotionAllowedRows: 0,
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not use scanner-artifact output until blockers are cleared.']
      : recommendation === 'needs_fresh_scanner_artifacts'
        ? [
          'Existing scanner dry-run artifacts preserve live behavior but do not include Sweep rows, so run a fresh scanner-artifact package that includes Sweep candidate-book output.',
          'Keep tradeDecisionPipeline untouched and keep publishDiscord=false, shouldPost=false, canExecute=false while proving candidate selection.',
        ]
        : [
          'Scanner artifacts preserve live behavior with installed scoring coverage.',
          'Next phase can decide whether any scanner-visible review-selection change is needed; do not change Discord/Supabase/bridge behavior.',
        ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewSweepPenaltyScannerArtifactComparisonReport(
  report: UnifiedPositiveHeldLocalPreviewSweepPenaltyScannerArtifactComparisonReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-sweep-penalty-scanner-artifact-comparison-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewSweepPenaltyScannerArtifactComparisonCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const scannerDryRunReplayPath = readFlag(args, '--scanner-dry-run-replay') ||
    latestMatchingFile(outDir, /^unified-positive-scanner-dry-run-replay-\d+\.json$/);
  const installedScoreComparisonPath = readFlag(args, '--installed-score-comparison') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-sweep-penalty-installed-score-comparison-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewSweepPenaltyScannerArtifactComparisonReport({
    reportDir: outDir,
    scannerDryRunReplayPath,
    scannerDryRunReplayReport: scannerDryRunReplayPath && fs.existsSync(scannerDryRunReplayPath)
      ? readJson<UnifiedPositiveScannerDryRunReplayReport>(scannerDryRunReplayPath)
      : null,
    installedScoreComparisonPath,
    installedScoreComparisonReport: installedScoreComparisonPath && fs.existsSync(installedScoreComparisonPath)
      ? readJson<UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport>(installedScoreComparisonPath)
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewSweepPenaltyScannerArtifactComparisonReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewSweepPenaltyScannerArtifactComparisonCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
