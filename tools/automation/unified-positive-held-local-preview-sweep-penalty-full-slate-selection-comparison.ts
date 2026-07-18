import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport,
} from './unified-positive-held-local-preview-sweep-penalty-installed-score-comparison';

type InstalledScoreRow = UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport['rows'][number];

interface FullSlateSelectionRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  executionStatus: string;
  blockReason: string;
  candidateBookState: string | null;
  baselineScore: number | null;
  installedScore: number | null;
  baselineRank: number;
  installedRank: number;
  validSweepLead: boolean;
  invalidStopSweepPenaltyCandidate: boolean;
  installedPenaltyExpected: boolean;
  validReviewCandidate: boolean;
  canExecute: boolean | null;
  entryPreserved: boolean;
  stopPreserved: boolean;
  target1Preserved: boolean;
  target2Preserved: boolean;
  riskPreserved: boolean;
  livePromotionAllowed: false;
}

interface FullSlateSelection {
  slateId: string;
  tradeDate: string;
  session: string;
  rows: number;
  baselineTopTicketId: string | null;
  baselineTopSetupType: string | null;
  baselineTopState: string | null;
  baselineTopScore: number | null;
  baselineTopInvalidStopSweep: boolean | null;
  baselineTopValidReviewCandidate: boolean | null;
  installedTopTicketId: string | null;
  installedTopSetupType: string | null;
  installedTopState: string | null;
  installedTopScore: number | null;
  installedTopInvalidStopSweep: boolean | null;
  installedTopValidReviewCandidate: boolean | null;
  topChanged: boolean;
  changedFromInvalidStopSweepToValidReview: boolean;
  changedFromValidReviewToInvalidStopSweep: boolean;
}

export interface UnifiedPositiveHeldLocalPreviewSweepPenaltyFullSlateSelectionComparisonReport {
  reportType: 'unified_positive_held_local_preview_sweep_penalty_full_slate_selection_comparison';
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
  scoring: {
    reconstructedInvalidStopPenaltyPoints: 18;
    baselineReconstruction: 'installedScorePlusPenaltyForInvalidStopSweepRows';
    installedScoreAuthority: 'candidateBookInstalledScoreComparison';
  };
  summary: {
    installedScoreRows: number;
    selectionRows: number;
    slates: number;
    changedSlates: number;
    changedFromInvalidStopSweepToValidReviewSlates: number;
    changedFromValidReviewToInvalidStopSweepSlates: number;
    invalidStopSweepBaselineTopSlates: number;
    invalidStopSweepInstalledTopSlates: number;
    validReviewBaselineTopSlates: number;
    validReviewInstalledTopSlates: number;
    validSweepLeadRows: number;
    invalidStopSweepRows: number;
    installedPenaltyRows: number;
    validSweepLeadRowsPenalized: number;
    canExecuteFalseRows: number;
    entryStopTargetRiskPreservedRows: number;
    livePromotionAllowedRows: 0;
    recommendation:
      | 'full_slate_selection_supports_installed_penalty'
      | 'full_slate_selection_neutral_keep_research_only'
      | 'reject_full_slate_selection_comparison';
  };
  slates: FullSlateSelection[];
  rows: FullSlateSelectionRow[];
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

function authority(): UnifiedPositiveHeldLocalPreviewSweepPenaltyFullSlateSelectionComparisonReport['authority'] {
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

function validReviewCandidate(row: InstalledScoreRow): boolean {
  return row.canExecute === false &&
    row.candidateBookState === 'human_review' &&
    row.executionStatus === 'Conditional' &&
    row.blockReason === 'EntryTriggerPending' &&
    row.entryPreserved &&
    row.stopPreserved &&
    row.target1Preserved &&
    row.target2Preserved &&
    row.riskPreserved;
}

function toSelectionRow(row: InstalledScoreRow): FullSlateSelectionRow {
  const baselineScore = row.installedScore === null
    ? null
    : round(row.installedScore + (row.invalidStopSweepPenaltyCandidate && row.installedPenaltyExpected ? PENALTY_POINTS : 0));
  return {
    ticketId: row.ticketId,
    tradeDate: row.tradeDate,
    session: row.session,
    setupType: row.setupType,
    direction: row.direction,
    executionStatus: row.executionStatus,
    blockReason: row.blockReason,
    candidateBookState: row.candidateBookState,
    baselineScore,
    installedScore: row.installedScore,
    baselineRank: 0,
    installedRank: 0,
    validSweepLead: row.validSweepLead,
    invalidStopSweepPenaltyCandidate: row.invalidStopSweepPenaltyCandidate,
    installedPenaltyExpected: row.installedPenaltyExpected,
    validReviewCandidate: validReviewCandidate(row),
    canExecute: row.canExecute,
    entryPreserved: row.entryPreserved,
    stopPreserved: row.stopPreserved,
    target1Preserved: row.target1Preserved,
    target2Preserved: row.target2Preserved,
    riskPreserved: row.riskPreserved,
    livePromotionAllowed: false,
  };
}

function compareScoreRows(a: FullSlateSelectionRow, b: FullSlateSelectionRow, scoreKey: 'baselineScore' | 'installedScore'): number {
  const aScore = a[scoreKey] ?? Number.NEGATIVE_INFINITY;
  const bScore = b[scoreKey] ?? Number.NEGATIVE_INFINITY;
  return bScore - aScore ||
    Number(b.validReviewCandidate) - Number(a.validReviewCandidate) ||
    Number(a.invalidStopSweepPenaltyCandidate) - Number(b.invalidStopSweepPenaltyCandidate) ||
    a.ticketId.localeCompare(b.ticketId);
}

function groupBySlate(rows: FullSlateSelectionRow[]): Map<string, FullSlateSelectionRow[]> {
  const groups = new Map<string, FullSlateSelectionRow[]>();
  for (const row of rows) {
    const key = `${row.tradeDate}|${row.session}`;
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  return groups;
}

function buildSelection(rows: FullSlateSelectionRow[]): { rows: FullSlateSelectionRow[]; slates: FullSlateSelection[] } {
  const rankedRows: FullSlateSelectionRow[] = [];
  const slates: FullSlateSelection[] = [];
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
      baselineTopSetupType: baselineTop?.setupType || null,
      baselineTopState: baselineTop?.candidateBookState || null,
      baselineTopScore: baselineTop?.baselineScore ?? null,
      baselineTopInvalidStopSweep: baselineTop?.invalidStopSweepPenaltyCandidate ?? null,
      baselineTopValidReviewCandidate: baselineTop?.validReviewCandidate ?? null,
      installedTopTicketId: installedTop?.ticketId || null,
      installedTopSetupType: installedTop?.setupType || null,
      installedTopState: installedTop?.candidateBookState || null,
      installedTopScore: installedTop?.installedScore ?? null,
      installedTopInvalidStopSweep: installedTop?.invalidStopSweepPenaltyCandidate ?? null,
      installedTopValidReviewCandidate: installedTop?.validReviewCandidate ?? null,
      topChanged: baselineTop?.ticketId !== installedTop?.ticketId,
      changedFromInvalidStopSweepToValidReview: Boolean(
        baselineTop?.invalidStopSweepPenaltyCandidate && installedTop?.validReviewCandidate
      ),
      changedFromValidReviewToInvalidStopSweep: Boolean(
        baselineTop?.validReviewCandidate && installedTop?.invalidStopSweepPenaltyCandidate
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

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewSweepPenaltyFullSlateSelectionComparisonReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Sweep Penalty Full Slate Selection Comparison',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only full model-family slate comparison. It reconstructs before/after ranking from saved installed-score rows only and does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Installed-score rows: ${report.summary.installedScoreRows}.`,
    `- Selection rows: ${report.summary.selectionRows}.`,
    `- Slates: ${report.summary.slates}.`,
    `- Changed slates: ${report.summary.changedSlates}.`,
    `- Changed invalid-stop Sweep -> valid review slates: ${report.summary.changedFromInvalidStopSweepToValidReviewSlates}.`,
    `- Changed valid review -> invalid-stop Sweep slates: ${report.summary.changedFromValidReviewToInvalidStopSweepSlates}.`,
    `- Invalid-stop Sweep baseline/installed top slates: ${report.summary.invalidStopSweepBaselineTopSlates} / ${report.summary.invalidStopSweepInstalledTopSlates}.`,
    `- Valid review baseline/installed top slates: ${report.summary.validReviewBaselineTopSlates} / ${report.summary.validReviewInstalledTopSlates}.`,
    `- Valid Sweep lead rows: ${report.summary.validSweepLeadRows}.`,
    `- Invalid-stop Sweep rows: ${report.summary.invalidStopSweepRows}.`,
    `- Installed penalty rows: ${report.summary.installedPenaltyRows}.`,
    `- Valid Sweep lead rows penalized: ${report.summary.validSweepLeadRowsPenalized}.`,
    `- canExecute=false rows: ${report.summary.canExecuteFalseRows}.`,
    `- Entry/stop/target/risk preserved rows: ${report.summary.entryStopTargetRiskPreservedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Changed Slates',
    '| Slate | Rows | Baseline Top | Baseline Model | Baseline State | Baseline Score | Installed Top | Installed Model | Installed State | Installed Score |',
    '|---|---:|---|---|---|---:|---|---|---|---:|',
    ...report.slates.filter((row) => row.topChanged).map((row) => `| ${escapeTable(row.slateId)} | ${row.rows} | ${escapeTable(row.baselineTopTicketId ?? '-')} | ${escapeTable(row.baselineTopSetupType ?? '-')} | ${escapeTable(row.baselineTopState ?? '-')} | ${row.baselineTopScore ?? '-'} | ${escapeTable(row.installedTopTicketId ?? '-')} | ${escapeTable(row.installedTopSetupType ?? '-')} | ${escapeTable(row.installedTopState ?? '-')} | ${row.installedTopScore ?? '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewSweepPenaltyFullSlateSelectionComparisonReport(args: {
  reportDir: string;
  installedScoreComparisonPath: string | null;
  installedScoreComparisonReport: UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewSweepPenaltyFullSlateSelectionComparisonReport {
  const installedRows = args.installedScoreComparisonReport?.rows || [];
  const selection = buildSelection(installedRows.map(toSelectionRow));
  const changedSlates = selection.slates.filter((row) => row.topChanged).length;
  const changedFromInvalidStopToValid = selection.slates.filter((row) => row.changedFromInvalidStopSweepToValidReview).length;
  const changedFromValidToInvalidStop = selection.slates.filter((row) => row.changedFromValidReviewToInvalidStopSweep).length;
  const validSweepLeadRowsPenalized = selection.rows.filter((row) => row.validSweepLead && row.installedPenaltyExpected).length;
  const preservedRows = selection.rows.filter((row) => row.entryPreserved && row.stopPreserved && row.target1Preserved && row.target2Preserved && row.riskPreserved).length;
  const blockers = [
    !args.installedScoreComparisonPath ? 'missing installed-score comparison path' : null,
    !args.installedScoreComparisonReport ? 'missing installed-score comparison report' : null,
    args.installedScoreComparisonReport && args.installedScoreComparisonReport.status !== 'pass'
      ? `installed-score comparison status ${args.installedScoreComparisonReport.status}`
      : null,
    installedRows.length === 0 ? 'no installed-score rows found' : null,
    selection.rows.some((row) => row.canExecute !== false) ? 'one or more rows changed canExecute away from false' : null,
    preservedRows !== selection.rows.length ? 'one or more rows did not preserve entry/stop/target/risk' : null,
    validSweepLeadRowsPenalized !== 0 ? 'valid Sweep lead rows were penalized' : null,
    changedFromValidToInvalidStop !== 0 ? 'selection changed from valid review candidate to invalid-stop Sweep' : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation = blockers.length
    ? 'reject_full_slate_selection_comparison'
    : changedFromInvalidStopToValid > 0
      ? 'full_slate_selection_supports_installed_penalty'
      : 'full_slate_selection_neutral_keep_research_only';
  const base: Omit<UnifiedPositiveHeldLocalPreviewSweepPenaltyFullSlateSelectionComparisonReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_sweep_penalty_full_slate_selection_comparison',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      installedScoreComparisonPath: args.installedScoreComparisonPath,
    },
    scoring: {
      reconstructedInvalidStopPenaltyPoints: PENALTY_POINTS,
      baselineReconstruction: 'installedScorePlusPenaltyForInvalidStopSweepRows',
      installedScoreAuthority: 'candidateBookInstalledScoreComparison',
    },
    summary: {
      installedScoreRows: installedRows.length,
      selectionRows: selection.rows.length,
      slates: selection.slates.length,
      changedSlates,
      changedFromInvalidStopSweepToValidReviewSlates: changedFromInvalidStopToValid,
      changedFromValidReviewToInvalidStopSweepSlates: changedFromValidToInvalidStop,
      invalidStopSweepBaselineTopSlates: selection.slates.filter((row) => row.baselineTopInvalidStopSweep).length,
      invalidStopSweepInstalledTopSlates: selection.slates.filter((row) => row.installedTopInvalidStopSweep).length,
      validReviewBaselineTopSlates: selection.slates.filter((row) => row.baselineTopValidReviewCandidate).length,
      validReviewInstalledTopSlates: selection.slates.filter((row) => row.installedTopValidReviewCandidate).length,
      validSweepLeadRows: selection.rows.filter((row) => row.validSweepLead).length,
      invalidStopSweepRows: selection.rows.filter((row) => row.invalidStopSweepPenaltyCandidate).length,
      installedPenaltyRows: selection.rows.filter((row) => row.installedPenaltyExpected).length,
      validSweepLeadRowsPenalized,
      canExecuteFalseRows: selection.rows.filter((row) => row.canExecute === false).length,
      entryStopTargetRiskPreservedRows: preservedRows,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    slates: selection.slates,
    rows: selection.rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not use the full-slate selection comparison until blockers are cleared.']
      : recommendation === 'full_slate_selection_supports_installed_penalty'
        ? [
          'The installed invalid-stop Sweep penalty improves full model-family local ranking by moving top selection from invalid-stop Sweep rows to valid review candidates.',
          'Next phase should run outcome/P&L attribution for changed slates before any scanner-visible behavior is changed.',
        ]
        : [
          'The installed invalid-stop Sweep penalty is safe but neutral in full model-family local ranking.',
          'Next phase should stop tuning this penalty and mine the remaining blocked-top slates for a stronger separator.',
        ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewSweepPenaltyFullSlateSelectionComparisonReport(
  report: UnifiedPositiveHeldLocalPreviewSweepPenaltyFullSlateSelectionComparisonReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-sweep-penalty-full-slate-selection-comparison-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewSweepPenaltyFullSlateSelectionComparisonCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const installedScoreComparisonPath = readFlag(args, '--installed-score-comparison') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-sweep-penalty-installed-score-comparison-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewSweepPenaltyFullSlateSelectionComparisonReport({
    reportDir: outDir,
    installedScoreComparisonPath,
    installedScoreComparisonReport: installedScoreComparisonPath && fs.existsSync(installedScoreComparisonPath)
      ? readJson<UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport>(installedScoreComparisonPath)
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewSweepPenaltyFullSlateSelectionComparisonReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewSweepPenaltyFullSlateSelectionComparisonCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
