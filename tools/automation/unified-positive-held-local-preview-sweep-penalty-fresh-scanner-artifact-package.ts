import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport,
} from './unified-positive-held-local-preview-sweep-penalty-installed-score-comparison';

type InstalledScoreRow = UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport['rows'][number];

interface FreshScannerArtifactRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  candidateBookState: string | null;
  installedScore: number | null;
  validSweepLead: boolean;
  invalidStopSweepPenaltyCandidate: boolean;
  installedPenaltyExpected: boolean;
  scannerArtifact: {
    sourceOfTruth: 'scanner_owned_fresh_candidate_book_artifact';
    deskTicketState: 'ACTIVE_REVIEW' | 'BLOCKED_REVIEW';
    reviewOnly: true;
    shouldPost: false;
    publishDiscord: false;
    canExecute: false;
    preservesEntryStopTargetRisk: boolean;
  };
  blockers: string[];
}

export interface UnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactPackageReport {
  reportType: 'unified_positive_held_local_preview_sweep_penalty_fresh_scanner_artifact_package';
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
    installedScoreComparisonPath: string | null;
  };
  summary: {
    installedScoreRows: number;
    freshArtifactRows: number;
    sweepArtifactRows: number;
    validSweepLeadArtifactRows: number;
    invalidStopSweepArtifactRows: number;
    installedPenaltyArtifactRows: number;
    validSweepLeadRowsPenalized: number;
    shouldPostFalseRows: number;
    publishDiscordFalseRows: number;
    canExecuteFalseRows: number;
    entryStopTargetRiskPreservedRows: number;
    blockedRows: number;
    recommendation: 'fresh_scanner_artifacts_ready_for_selection_comparison' | 'reject_fresh_scanner_artifacts';
    livePromotionAllowedRows: 0;
  };
  rows: FreshScannerArtifactRow[];
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

function authority(): UnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactPackageReport['authority'] {
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

function rowFromInstalled(row: InstalledScoreRow): FreshScannerArtifactRow {
  const preservesEntryStopTargetRisk = row.entryPreserved &&
    row.stopPreserved &&
    row.target1Preserved &&
    row.target2Preserved &&
    row.riskPreserved;
  const blockers = [
    row.canExecute !== false ? 'installed score row canExecute is not false' : null,
    !preservesEntryStopTargetRisk ? 'installed score row did not preserve entry/stop/target/risk' : null,
    row.validSweepLead && row.installedPenaltyExpected ? 'valid Sweep lead row was penalized' : null,
  ].filter((item): item is string => Boolean(item));
  return {
    ticketId: row.ticketId,
    tradeDate: row.tradeDate,
    session: row.session,
    setupType: row.setupType,
    direction: row.direction,
    candidateBookState: row.candidateBookState,
    installedScore: row.installedScore,
    validSweepLead: row.validSweepLead,
    invalidStopSweepPenaltyCandidate: row.invalidStopSweepPenaltyCandidate,
    installedPenaltyExpected: row.installedPenaltyExpected,
    scannerArtifact: {
      sourceOfTruth: 'scanner_owned_fresh_candidate_book_artifact',
      deskTicketState: row.invalidStopSweepPenaltyCandidate ? 'BLOCKED_REVIEW' : 'ACTIVE_REVIEW',
      reviewOnly: true,
      shouldPost: false,
      publishDiscord: false,
      canExecute: false,
      preservesEntryStopTargetRisk,
    },
    blockers,
  };
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactPackageReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Sweep Penalty Fresh Scanner Artifact Package',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only fresh scanner-artifact package. It creates saved diagnostic artifacts only and does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Installed-score rows: ${report.summary.installedScoreRows}.`,
    `- Fresh artifact rows: ${report.summary.freshArtifactRows}.`,
    `- Sweep artifact rows: ${report.summary.sweepArtifactRows}.`,
    `- Valid Sweep lead artifact rows: ${report.summary.validSweepLeadArtifactRows}.`,
    `- Invalid-stop Sweep artifact rows: ${report.summary.invalidStopSweepArtifactRows}.`,
    `- Installed penalty artifact rows: ${report.summary.installedPenaltyArtifactRows}.`,
    `- Valid Sweep lead rows penalized: ${report.summary.validSweepLeadRowsPenalized}.`,
    `- shouldPost=false rows: ${report.summary.shouldPostFalseRows}.`,
    `- publishDiscord=false rows: ${report.summary.publishDiscordFalseRows}.`,
    `- canExecute=false rows: ${report.summary.canExecuteFalseRows}.`,
    `- Entry/stop/target/risk preserved rows: ${report.summary.entryStopTargetRiskPreservedRows}.`,
    `- Blocked rows: ${report.summary.blockedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactPackageReport(args: {
  reportDir: string;
  installedScoreComparisonPath: string | null;
  installedScoreComparisonReport: UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactPackageReport {
  const installedRows = args.installedScoreComparisonReport?.rows || [];
  const rows = installedRows
    .filter((row) => row.setupType === 'NoInstalledSetup')
    .map(rowFromInstalled)
    .sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.session.localeCompare(b.session) || a.ticketId.localeCompare(b.ticketId));
  const blockers = [
    !args.installedScoreComparisonPath ? 'missing installed-score comparison path' : null,
    !args.installedScoreComparisonReport ? 'missing installed-score comparison report' : null,
    args.installedScoreComparisonReport && args.installedScoreComparisonReport.status !== 'pass'
      ? `installed-score comparison status ${args.installedScoreComparisonReport.status}`
      : null,
    rows.length === 0 ? 'no Sweep rows available for fresh scanner artifacts' : null,
    rows.filter((row) => row.validSweepLead).length === 0 ? 'no valid Sweep lead rows in fresh scanner artifacts' : null,
    rows.filter((row) => row.invalidStopSweepPenaltyCandidate).length === 0 ? 'no invalid-stop Sweep rows in fresh scanner artifacts' : null,
    ...rows.flatMap((row) => row.blockers.map((blocker) => `${row.ticketId}: ${blocker}`)),
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactPackageReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_sweep_penalty_fresh_scanner_artifact_package',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      installedScoreComparisonPath: args.installedScoreComparisonPath,
    },
    summary: {
      installedScoreRows: installedRows.length,
      freshArtifactRows: rows.length,
      sweepArtifactRows: rows.filter((row) => row.setupType === 'NoInstalledSetup').length,
      validSweepLeadArtifactRows: rows.filter((row) => row.validSweepLead).length,
      invalidStopSweepArtifactRows: rows.filter((row) => row.invalidStopSweepPenaltyCandidate).length,
      installedPenaltyArtifactRows: rows.filter((row) => row.installedPenaltyExpected).length,
      validSweepLeadRowsPenalized: rows.filter((row) => row.validSweepLead && row.installedPenaltyExpected).length,
      shouldPostFalseRows: rows.filter((row) => row.scannerArtifact.shouldPost === false).length,
      publishDiscordFalseRows: rows.filter((row) => row.scannerArtifact.publishDiscord === false).length,
      canExecuteFalseRows: rows.filter((row) => row.scannerArtifact.canExecute === false).length,
      entryStopTargetRiskPreservedRows: rows.filter((row) => row.scannerArtifact.preservesEntryStopTargetRisk).length,
      blockedRows: rows.filter((row) => row.blockers.length > 0).length,
      recommendation: blockers.length ? 'reject_fresh_scanner_artifacts' : 'fresh_scanner_artifacts_ready_for_selection_comparison',
      livePromotionAllowedRows: 0,
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not use the fresh scanner-artifact package until blockers are cleared.']
      : [
        'Use this fresh local package for scanner selection comparison only.',
        'Keep shouldPost=false, publishDiscord=false, canExecute=false, and tradeDecisionPipeline untouched.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactPackageReport(
  report: UnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactPackageReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-sweep-penalty-fresh-scanner-artifact-package-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactPackageCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const installedScoreComparisonPath = readFlag(args, '--installed-score-comparison') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-sweep-penalty-installed-score-comparison-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactPackageReport({
    reportDir: outDir,
    installedScoreComparisonPath,
    installedScoreComparisonReport: installedScoreComparisonPath && fs.existsSync(installedScoreComparisonPath)
      ? readJson<UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport>(installedScoreComparisonPath)
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactPackageReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactPackageCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
