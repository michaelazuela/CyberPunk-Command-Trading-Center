import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactPackageReport,
} from './unified-positive-held-local-preview-sweep-penalty-fresh-scanner-artifact-package';

type ArtifactRow = UnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactPackageReport['rows'][number];

interface SelectionRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  candidateBookState: string | null;
  baselineScore: number | null;
  installedScore: number | null;
  baselineRank: number;
  installedRank: number;
  validSweepLead: boolean;
  invalidStopSweepPenaltyCandidate: boolean;
  installedPenaltyExpected: boolean;
  deskTicketState: 'ACTIVE_REVIEW' | 'BLOCKED_REVIEW';
  shouldPost: false;
  publishDiscord: false;
  canExecute: false;
  preservesEntryStopTargetRisk: boolean;
  livePromotionAllowed: false;
}

interface SlateSelection {
  slateId: string;
  tradeDate: string;
  session: string;
  rows: number;
  baselineTopTicketId: string | null;
  baselineTopState: string | null;
  baselineTopScore: number | null;
  baselineTopValidSweepLead: boolean | null;
  baselineTopInvalidStop: boolean | null;
  installedTopTicketId: string | null;
  installedTopState: string | null;
  installedTopScore: number | null;
  installedTopValidSweepLead: boolean | null;
  installedTopInvalidStop: boolean | null;
  topChanged: boolean;
  changedFromInvalidStopToValidSweepLead: boolean;
  changedFromValidSweepLeadToInvalidStop: boolean;
}

export interface UnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactSelectionComparisonReport {
  reportType: 'unified_positive_held_local_preview_sweep_penalty_fresh_scanner_artifact_selection_comparison';
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
    freshScannerArtifactPackagePath: string | null;
  };
  scoring: {
    reconstructedInvalidStopPenaltyPoints: 18;
    baselineReconstruction: 'installedScorePlusPenaltyForInvalidStopSweepRows';
    installedScoreAuthority: 'freshScannerArtifactPackageInstalledScore';
  };
  summary: {
    freshArtifactRows: number;
    selectionRows: number;
    slates: number;
    changedSlates: number;
    changedFromInvalidStopToValidSweepLeadSlates: number;
    changedFromValidSweepLeadToInvalidStopSlates: number;
    invalidStopBaselineTopSlates: number;
    invalidStopInstalledTopSlates: number;
    validSweepLeadBaselineTopSlates: number;
    validSweepLeadInstalledTopSlates: number;
    installedPenaltyRows: number;
    validSweepLeadRowsPenalized: number;
    shouldPostFalseRows: number;
    publishDiscordFalseRows: number;
    canExecuteFalseRows: number;
    entryStopTargetRiskPreservedRows: number;
    livePromotionAllowedRows: 0;
    recommendation:
      | 'fresh_artifact_selection_comparison_supports_installed_penalty'
      | 'fresh_artifact_selection_comparison_neutral_keep_research_only'
      | 'reject_fresh_artifact_selection_comparison';
  };
  slates: SlateSelection[];
  rows: SelectionRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const PENALTY_POINTS = 18;

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

function authority(): UnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactSelectionComparisonReport['authority'] {
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

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function compareScoreRows(a: SelectionRow, b: SelectionRow, scoreKey: 'baselineScore' | 'installedScore'): number {
  const aScore = a[scoreKey] ?? Number.NEGATIVE_INFINITY;
  const bScore = b[scoreKey] ?? Number.NEGATIVE_INFINITY;
  return bScore - aScore ||
    Number(b.validSweepLead) - Number(a.validSweepLead) ||
    Number(a.invalidStopSweepPenaltyCandidate) - Number(b.invalidStopSweepPenaltyCandidate) ||
    a.ticketId.localeCompare(b.ticketId);
}

function groupBySlate(rows: SelectionRow[]): Map<string, SelectionRow[]> {
  const groups = new Map<string, SelectionRow[]>();
  for (const row of rows) {
    const key = `${row.tradeDate}|${row.session}`;
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  return groups;
}

function toSelectionRow(row: ArtifactRow): SelectionRow {
  const baselineScore = row.installedScore === null
    ? null
    : round(row.installedScore + (row.invalidStopSweepPenaltyCandidate && row.installedPenaltyExpected ? PENALTY_POINTS : 0));
  return {
    ticketId: row.ticketId,
    tradeDate: row.tradeDate,
    session: row.session,
    setupType: row.setupType,
    direction: row.direction,
    candidateBookState: row.candidateBookState,
    baselineScore,
    installedScore: row.installedScore,
    baselineRank: 0,
    installedRank: 0,
    validSweepLead: row.validSweepLead,
    invalidStopSweepPenaltyCandidate: row.invalidStopSweepPenaltyCandidate,
    installedPenaltyExpected: row.installedPenaltyExpected,
    deskTicketState: row.scannerArtifact.deskTicketState,
    shouldPost: row.scannerArtifact.shouldPost,
    publishDiscord: row.scannerArtifact.publishDiscord,
    canExecute: row.scannerArtifact.canExecute,
    preservesEntryStopTargetRisk: row.scannerArtifact.preservesEntryStopTargetRisk,
    livePromotionAllowed: false,
  };
}

function buildSelection(rows: SelectionRow[]): { rows: SelectionRow[]; slates: SlateSelection[] } {
  const rankedRows: SelectionRow[] = [];
  const slates: SlateSelection[] = [];
  for (const [slateId, slateRows] of groupBySlate(rows)) {
    const baseline = [...slateRows].sort((a, b) => compareScoreRows(a, b, 'baselineScore'));
    const installed = [...slateRows].sort((a, b) => compareScoreRows(a, b, 'installedScore'));
    const baselineRanks = new Map(baseline.map((row, index) => [row.ticketId, index + 1]));
    const installedRanks = new Map(installed.map((row, index) => [row.ticketId, index + 1]));
    const baselineTop = baseline[0] || null;
    const installedTop = installed[0] || null;
    for (const row of slateRows) {
      rankedRows.push({
        ...row,
        baselineRank: baselineRanks.get(row.ticketId) ?? 0,
        installedRank: installedRanks.get(row.ticketId) ?? 0,
      });
    }
    slates.push({
      slateId,
      tradeDate: slateRows[0]?.tradeDate || 'unknown',
      session: slateRows[0]?.session || 'unknown',
      rows: slateRows.length,
      baselineTopTicketId: baselineTop?.ticketId || null,
      baselineTopState: baselineTop?.deskTicketState || null,
      baselineTopScore: baselineTop?.baselineScore ?? null,
      baselineTopValidSweepLead: baselineTop?.validSweepLead ?? null,
      baselineTopInvalidStop: baselineTop?.invalidStopSweepPenaltyCandidate ?? null,
      installedTopTicketId: installedTop?.ticketId || null,
      installedTopState: installedTop?.deskTicketState || null,
      installedTopScore: installedTop?.installedScore ?? null,
      installedTopValidSweepLead: installedTop?.validSweepLead ?? null,
      installedTopInvalidStop: installedTop?.invalidStopSweepPenaltyCandidate ?? null,
      topChanged: baselineTop?.ticketId !== installedTop?.ticketId,
      changedFromInvalidStopToValidSweepLead: Boolean(
        baselineTop?.invalidStopSweepPenaltyCandidate && installedTop?.validSweepLead
      ),
      changedFromValidSweepLeadToInvalidStop: Boolean(
        baselineTop?.validSweepLead && installedTop?.invalidStopSweepPenaltyCandidate
      ),
    });
  }
  return {
    rows: rankedRows.sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.session.localeCompare(b.session) || a.installedRank - b.installedRank),
    slates: slates.sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.session.localeCompare(b.session)),
  };
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactSelectionComparisonReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Sweep Penalty Fresh Scanner Artifact Selection Comparison',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only selection comparison from the fresh scanner-artifact package. It reconstructs before/after ranking only and does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Fresh artifact rows: ${report.summary.freshArtifactRows}.`,
    `- Selection rows: ${report.summary.selectionRows}.`,
    `- Slates: ${report.summary.slates}.`,
    `- Changed slates: ${report.summary.changedSlates}.`,
    `- Changed invalid-stop -> valid Sweep lead slates: ${report.summary.changedFromInvalidStopToValidSweepLeadSlates}.`,
    `- Changed valid Sweep lead -> invalid-stop slates: ${report.summary.changedFromValidSweepLeadToInvalidStopSlates}.`,
    `- Invalid-stop baseline top slates: ${report.summary.invalidStopBaselineTopSlates}.`,
    `- Invalid-stop installed top slates: ${report.summary.invalidStopInstalledTopSlates}.`,
    `- Valid Sweep lead baseline top slates: ${report.summary.validSweepLeadBaselineTopSlates}.`,
    `- Valid Sweep lead installed top slates: ${report.summary.validSweepLeadInstalledTopSlates}.`,
    `- Installed penalty rows: ${report.summary.installedPenaltyRows}.`,
    `- Valid Sweep lead rows penalized: ${report.summary.validSweepLeadRowsPenalized}.`,
    `- shouldPost=false rows: ${report.summary.shouldPostFalseRows}.`,
    `- publishDiscord=false rows: ${report.summary.publishDiscordFalseRows}.`,
    `- canExecute=false rows: ${report.summary.canExecuteFalseRows}.`,
    `- Entry/stop/target/risk preserved rows: ${report.summary.entryStopTargetRiskPreservedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Changed Slates',
    '| Slate | Rows | Baseline Top | Baseline State | Baseline Score | Installed Top | Installed State | Installed Score |',
    '|---|---:|---|---|---:|---|---|---:|',
    ...report.slates.filter((row) => row.topChanged).map((row) => `| ${escapeTable(row.slateId)} | ${row.rows} | ${escapeTable(row.baselineTopTicketId ?? '-')} | ${escapeTable(row.baselineTopState ?? '-')} | ${row.baselineTopScore ?? '-'} | ${escapeTable(row.installedTopTicketId ?? '-')} | ${escapeTable(row.installedTopState ?? '-')} | ${row.installedTopScore ?? '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactSelectionComparisonReport(args: {
  reportDir: string;
  freshScannerArtifactPackagePath: string | null;
  freshScannerArtifactPackageReport: UnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactPackageReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactSelectionComparisonReport {
  const artifactRows = args.freshScannerArtifactPackageReport?.rows || [];
  const selection = buildSelection(artifactRows.map(toSelectionRow));
  const changedSlates = selection.slates.filter((row) => row.topChanged).length;
  const changedFromInvalidStopToValid = selection.slates.filter((row) => row.changedFromInvalidStopToValidSweepLead).length;
  const changedFromValidToInvalidStop = selection.slates.filter((row) => row.changedFromValidSweepLeadToInvalidStop).length;
  const validSweepLeadRowsPenalized = selection.rows.filter((row) => row.validSweepLead && row.installedPenaltyExpected).length;
  const blockers = [
    !args.freshScannerArtifactPackagePath ? 'missing fresh scanner-artifact package path' : null,
    !args.freshScannerArtifactPackageReport ? 'missing fresh scanner-artifact package report' : null,
    args.freshScannerArtifactPackageReport && args.freshScannerArtifactPackageReport.status !== 'pass'
      ? `fresh scanner-artifact package status ${args.freshScannerArtifactPackageReport.status}`
      : null,
    artifactRows.length === 0 ? 'no fresh scanner artifacts found' : null,
    selection.rows.some((row) => row.setupType !== 'NoInstalledSetup') ? 'non-Sweep row entered Sweep selection comparison' : null,
    selection.rows.some((row) => row.shouldPost !== false) ? 'one or more rows would post scanner output' : null,
    selection.rows.some((row) => row.publishDiscord !== false) ? 'one or more rows would publish Discord output' : null,
    selection.rows.some((row) => row.canExecute !== false) ? 'one or more rows changed canExecute away from false' : null,
    selection.rows.some((row) => !row.preservesEntryStopTargetRisk) ? 'one or more rows did not preserve entry/stop/target/risk' : null,
    validSweepLeadRowsPenalized !== 0 ? 'valid Sweep lead rows were penalized' : null,
    changedFromValidToInvalidStop !== 0 ? 'selection changed from valid Sweep lead to invalid-stop Sweep' : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation = blockers.length
    ? 'reject_fresh_artifact_selection_comparison'
    : changedFromInvalidStopToValid > 0
      ? 'fresh_artifact_selection_comparison_supports_installed_penalty'
      : 'fresh_artifact_selection_comparison_neutral_keep_research_only';
  const base: Omit<UnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactSelectionComparisonReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_sweep_penalty_fresh_scanner_artifact_selection_comparison',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      freshScannerArtifactPackagePath: args.freshScannerArtifactPackagePath,
    },
    scoring: {
      reconstructedInvalidStopPenaltyPoints: PENALTY_POINTS,
      baselineReconstruction: 'installedScorePlusPenaltyForInvalidStopSweepRows',
      installedScoreAuthority: 'freshScannerArtifactPackageInstalledScore',
    },
    summary: {
      freshArtifactRows: artifactRows.length,
      selectionRows: selection.rows.length,
      slates: selection.slates.length,
      changedSlates,
      changedFromInvalidStopToValidSweepLeadSlates: changedFromInvalidStopToValid,
      changedFromValidSweepLeadToInvalidStopSlates: changedFromValidToInvalidStop,
      invalidStopBaselineTopSlates: selection.slates.filter((row) => row.baselineTopInvalidStop).length,
      invalidStopInstalledTopSlates: selection.slates.filter((row) => row.installedTopInvalidStop).length,
      validSweepLeadBaselineTopSlates: selection.slates.filter((row) => row.baselineTopValidSweepLead).length,
      validSweepLeadInstalledTopSlates: selection.slates.filter((row) => row.installedTopValidSweepLead).length,
      installedPenaltyRows: selection.rows.filter((row) => row.installedPenaltyExpected).length,
      validSweepLeadRowsPenalized,
      shouldPostFalseRows: selection.rows.filter((row) => row.shouldPost === false).length,
      publishDiscordFalseRows: selection.rows.filter((row) => row.publishDiscord === false).length,
      canExecuteFalseRows: selection.rows.filter((row) => row.canExecute === false).length,
      entryStopTargetRiskPreservedRows: selection.rows.filter((row) => row.preservesEntryStopTargetRisk).length,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    slates: selection.slates,
    rows: selection.rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not use the fresh scanner-artifact selection comparison until blockers are cleared.']
      : recommendation === 'fresh_artifact_selection_comparison_supports_installed_penalty'
        ? [
          'The installed invalid-stop Sweep penalty improves local Sweep artifact selection where it matters: invalid-stop top rows lose to valid Conditional/EntryTriggerPending Sweep leads.',
          'Next phase may compare this local selection against full model-family slates before any scanner-visible behavior is changed.',
        ]
        : [
          'Keep the installed invalid-stop Sweep penalty research-only for scanner selection because this package did not change the local top artifact.',
          'Next phase should broaden the local slate beyond Sweep-only rows before any scanner-visible behavior is changed.',
        ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactSelectionComparisonReport(
  report: UnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactSelectionComparisonReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-sweep-penalty-fresh-scanner-artifact-selection-comparison-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactSelectionComparisonCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const freshScannerArtifactPackagePath = readFlag(args, '--fresh-scanner-artifact-package') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-sweep-penalty-fresh-scanner-artifact-package-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactSelectionComparisonReport({
    reportDir: outDir,
    freshScannerArtifactPackagePath,
    freshScannerArtifactPackageReport: freshScannerArtifactPackagePath && fs.existsSync(freshScannerArtifactPackagePath)
      ? readJson<UnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactPackageReport>(freshScannerArtifactPackagePath)
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactSelectionComparisonReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerArtifactSelectionComparisonCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
