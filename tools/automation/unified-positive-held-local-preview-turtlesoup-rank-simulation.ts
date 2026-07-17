import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewTurtleSoupRankPenaltyValidationReport,
} from './unified-positive-held-local-preview-turtlesoup-rank-penalty-validation';
import type {
  UnifiedPositiveHeldLocalPreviewTurtleSoupReplayPackageReport,
} from './unified-positive-held-local-preview-turtlesoup-replay-package';

type PackageRow = UnifiedPositiveHeldLocalPreviewTurtleSoupReplayPackageReport['rows'][number];
type SimulationRecommendation =
  | 'continue_research_rank_penalty_with_false_winner_review'
  | 'review_note_only'
  | 'reject_rank_penalty';

interface SimulationRow {
  rowId: string;
  tradeDate: string;
  session: string;
  direction: string;
  group: PackageRow['group'];
  outcomeBucket: PackageRow['outcomeBucket'];
  resolvedOneMesPl: number | null;
  slateId: string;
  scoreBefore: number;
  scoreAfter: number;
  rankBefore: number;
  rankAfter: number;
  wasSlateTopBefore: boolean;
  isSlateTopAfter: boolean;
  demotedByPenalty: boolean;
  falseWinnerDemotion: boolean;
  notes: string[];
}

interface SlateSummary {
  slateId: string;
  tradeDate: string;
  session: string;
  rows: number;
  topBeforeRowId: string | null;
  topBeforeGroup: PackageRow['group'] | null;
  topBeforeOneMesPl: number | null;
  topAfterRowId: string | null;
  topAfterGroup: PackageRow['group'] | null;
  topAfterOneMesPl: number | null;
  topChanged: boolean;
  blockedTopBefore: boolean;
  blockedTopAfter: boolean;
}

export interface UnifiedPositiveHeldLocalPreviewTurtleSoupRankSimulationReport {
  reportType: 'unified_positive_held_local_preview_turtlesoup_rank_simulation';
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
    turtleSoupReplayPackagePath: string | null;
    turtleSoupRankPenaltyValidationPath: string | null;
  };
  assumptions: {
    simulationIsResearchOnly: true;
    noRankPenaltyInstalled: true;
    noHardBlockInstalled: true;
    noModelRemoved: true;
    sameDateSessionSlateOnly: true;
    usesOutcomeForEvaluationNotScoring: true;
    livePromotionAllowed: false;
  };
  scoring: {
    blockedProtectedStopPenaltyPoints: number;
    baselineDoesNotUseOutcome: true;
  };
  summary: {
    packageRows: number;
    simulatedRows: number;
    slates: number;
    penalizedRows: number;
    topChangedSlates: number;
    blockedTopBeforeSlates: number;
    blockedTopAfterSlates: number;
    topBeforeOneMesPl: number | null;
    topAfterOneMesPl: number | null;
    topSelectionDeltaOneMesPl: number | null;
    falseWinnerDemotions: number;
    hardBlockFalseRejectWinners: number;
    recommendation: SimulationRecommendation;
    livePromotionAllowedRows: 0;
  };
  rows: SimulationRow[];
  slates: SlateSummary[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const BLOCKED_PROTECTED_STOP_PENALTY_POINTS = 25;

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  const matches = fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
}

function authority(): UnifiedPositiveHeldLocalPreviewTurtleSoupRankSimulationReport['authority'] {
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

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function scoreBefore(row: PackageRow): number {
  return 70 +
    (row.selectedMatchesReviewedModel ? 8 : 0) +
    (row.modelCandidateHasFullPlanLevels ? 4 : 0) +
    (row.entryTriggerPendingEvidence ? 2 : 0) +
    (row.modelCandidateExecutionStatus === 'Conditional' ? 3 : 0) -
    row.scorecardWeakCount * 4;
}

function scoreAfter(row: PackageRow): number {
  const penalty = row.group === 'blocked_protected_stop' ? BLOCKED_PROTECTED_STOP_PENALTY_POINTS : 0;
  return scoreBefore(row) - penalty;
}

function compareRows(
  a: { row: PackageRow; scoreBefore: number; scoreAfter: number },
  b: { row: PackageRow; scoreBefore: number; scoreAfter: number },
  key: 'scoreBefore' | 'scoreAfter',
): number {
  return b[key] - a[key] || (b.row.resolvedOneMesPl ?? 0) - (a.row.resolvedOneMesPl ?? 0) || a.row.rowId.localeCompare(b.row.rowId);
}

function groupBySlate(rows: PackageRow[]): Map<string, PackageRow[]> {
  const groups = new Map<string, PackageRow[]>();
  for (const row of rows) {
    const slateId = `${row.tradeDate}|${row.session}`;
    groups.set(slateId, [...(groups.get(slateId) || []), row]);
  }
  return groups;
}

function buildSimulation(rows: PackageRow[]): { rows: SimulationRow[]; slates: SlateSummary[] } {
  const simulationRows: SimulationRow[] = [];
  const slates: SlateSummary[] = [];
  for (const [slateId, slateRows] of groupBySlate(rows)) {
    const baseRows = slateRows.map((row) => ({
      row,
      scoreBefore: scoreBefore(row),
      scoreAfter: scoreAfter(row),
    }));
    const beforeRanked = [...baseRows].sort((a, b) => compareRows(a, b, 'scoreBefore'));
    const afterRanked = [...baseRows].sort((a, b) => compareRows(a, b, 'scoreAfter'));
    const beforeRanks = new Map(beforeRanked.map((item, index) => [item.row.rowId, index + 1]));
    const afterRanks = new Map(afterRanked.map((item, index) => [item.row.rowId, index + 1]));
    const topBefore = beforeRanked[0]?.row || null;
    const topAfter = afterRanked[0]?.row || null;
    for (const item of baseRows) {
      const rankBefore = beforeRanks.get(item.row.rowId) ?? 0;
      const rankAfter = afterRanks.get(item.row.rowId) ?? 0;
      const demotedByPenalty = item.row.group === 'blocked_protected_stop' && rankAfter > rankBefore;
      simulationRows.push({
        rowId: item.row.rowId,
        tradeDate: item.row.tradeDate,
        session: item.row.session,
        direction: item.row.direction,
        group: item.row.group,
        outcomeBucket: item.row.outcomeBucket,
        resolvedOneMesPl: item.row.resolvedOneMesPl,
        slateId,
        scoreBefore: item.scoreBefore,
        scoreAfter: item.scoreAfter,
        rankBefore,
        rankAfter,
        wasSlateTopBefore: topBefore?.rowId === item.row.rowId,
        isSlateTopAfter: topAfter?.rowId === item.row.rowId,
        demotedByPenalty,
        falseWinnerDemotion: demotedByPenalty && item.row.outcomeBucket === 'winner',
        notes: item.row.group === 'blocked_protected_stop'
          ? [
            'Hypothetical research penalty applied to blocked protected-stop TurtleSoup state only.',
            'This is not a hard block and does not remove the row from review visibility.',
          ]
          : ['No TurtleSoup blocked protected-stop penalty applied.'],
      });
    }
    slates.push({
      slateId,
      tradeDate: slateRows[0]?.tradeDate || 'unknown',
      session: slateRows[0]?.session || 'unknown',
      rows: slateRows.length,
      topBeforeRowId: topBefore?.rowId || null,
      topBeforeGroup: topBefore?.group || null,
      topBeforeOneMesPl: topBefore?.resolvedOneMesPl ?? null,
      topAfterRowId: topAfter?.rowId || null,
      topAfterGroup: topAfter?.group || null,
      topAfterOneMesPl: topAfter?.resolvedOneMesPl ?? null,
      topChanged: topBefore?.rowId !== topAfter?.rowId,
      blockedTopBefore: topBefore?.group === 'blocked_protected_stop',
      blockedTopAfter: topAfter?.group === 'blocked_protected_stop',
    });
  }
  return {
    rows: simulationRows.sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.session.localeCompare(b.session) || a.rankAfter - b.rankAfter),
    slates: slates.sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.session.localeCompare(b.session)),
  };
}

function recommendation(args: {
  topSelectionDeltaOneMesPl: number | null;
  blockedTopAfterSlates: number;
  falseWinnerDemotions: number;
  penalizedRows: number;
}): SimulationRecommendation {
  if ((args.topSelectionDeltaOneMesPl ?? 0) > 0 && args.falseWinnerDemotions > 0 && args.blockedTopAfterSlates < args.penalizedRows) {
    return 'continue_research_rank_penalty_with_false_winner_review';
  }
  if ((args.topSelectionDeltaOneMesPl ?? 0) >= 0) return 'review_note_only';
  return 'reject_rank_penalty';
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewTurtleSoupRankSimulationReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview TurtleSoup Rank Simulation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only same-date/session rank simulation. It does not install rank penalties, hard blocks, model removals, Discord posts, Supabase writes, live bridge reads, setupScanner changes, canExecute changes, or entry/stop/target/risk changes.',
    '',
    '## Summary',
    `- Package rows: ${report.summary.packageRows}.`,
    `- Simulated rows: ${report.summary.simulatedRows}.`,
    `- Slates: ${report.summary.slates}.`,
    `- Penalized rows: ${report.summary.penalizedRows}.`,
    `- Top changed slates: ${report.summary.topChangedSlates}.`,
    `- Blocked top before/after: ${report.summary.blockedTopBeforeSlates}/${report.summary.blockedTopAfterSlates}.`,
    `- Top selection P/L before/after: ${report.summary.topBeforeOneMesPl ?? '-'}/${report.summary.topAfterOneMesPl ?? '-'}.`,
    `- Top selection delta: ${report.summary.topSelectionDeltaOneMesPl ?? '-'}.`,
    `- False winner demotions: ${report.summary.falseWinnerDemotions}.`,
    `- Hard-block false-reject winners from validation: ${report.summary.hardBlockFalseRejectWinners}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Changed Slates',
    '| Slate | Rows | Top Before | Group Before | P/L Before | Top After | Group After | P/L After |',
    '|---|---:|---|---|---:|---|---|---:|',
    ...report.slates.filter((row) => row.topChanged).map((row) => `| ${escapeTable(row.slateId)} | ${row.rows} | ${escapeTable(row.topBeforeRowId ?? '-')} | ${row.topBeforeGroup ?? '-'} | ${row.topBeforeOneMesPl ?? '-'} | ${escapeTable(row.topAfterRowId ?? '-')} | ${row.topAfterGroup ?? '-'} | ${row.topAfterOneMesPl ?? '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewTurtleSoupRankSimulationReport(args: {
  reportDir: string;
  turtleSoupReplayPackagePath: string | null;
  turtleSoupReplayPackageReport: UnifiedPositiveHeldLocalPreviewTurtleSoupReplayPackageReport | null;
  turtleSoupRankPenaltyValidationPath: string | null;
  turtleSoupRankPenaltyValidationReport: UnifiedPositiveHeldLocalPreviewTurtleSoupRankPenaltyValidationReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewTurtleSoupRankSimulationReport {
  const packageRows = args.turtleSoupReplayPackageReport?.rows || [];
  const { rows, slates } = buildSimulation(packageRows);
  const penalizedRows = rows.filter((row) => row.group === 'blocked_protected_stop');
  const topBeforeOneMesPl = sum(slates.map((row) => row.topBeforeOneMesPl));
  const topAfterOneMesPl = sum(slates.map((row) => row.topAfterOneMesPl));
  const topSelectionDeltaOneMesPl = topBeforeOneMesPl === null || topAfterOneMesPl === null ? null : round(topAfterOneMesPl - topBeforeOneMesPl);
  const falseWinnerDemotions = rows.filter((row) => row.falseWinnerDemotion).length;
  const hardBlockFalseRejectWinners = args.turtleSoupRankPenaltyValidationReport?.summary.falseRejectWinnerRows ?? 0;
  const blockers = [
    !args.turtleSoupReplayPackagePath ? 'missing TurtleSoup replay package path' : null,
    !args.turtleSoupReplayPackageReport ? 'missing TurtleSoup replay package report' : null,
    args.turtleSoupReplayPackageReport && args.turtleSoupReplayPackageReport.status !== 'pass' ? `TurtleSoup replay package status ${args.turtleSoupReplayPackageReport.status}` : null,
    !args.turtleSoupRankPenaltyValidationPath ? 'missing TurtleSoup rank penalty validation path' : null,
    !args.turtleSoupRankPenaltyValidationReport ? 'missing TurtleSoup rank penalty validation report' : null,
    args.turtleSoupRankPenaltyValidationReport && args.turtleSoupRankPenaltyValidationReport.status !== 'pass' ? `TurtleSoup rank penalty validation status ${args.turtleSoupRankPenaltyValidationReport.status}` : null,
    packageRows.length === 0 ? 'no TurtleSoup package rows found' : null,
  ].filter((item): item is string => Boolean(item));
  const rec = recommendation({
    topSelectionDeltaOneMesPl,
    blockedTopAfterSlates: slates.filter((row) => row.blockedTopAfter).length,
    falseWinnerDemotions,
    penalizedRows: penalizedRows.length,
  });
  const base: Omit<UnifiedPositiveHeldLocalPreviewTurtleSoupRankSimulationReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_turtlesoup_rank_simulation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      turtleSoupReplayPackagePath: args.turtleSoupReplayPackagePath,
      turtleSoupRankPenaltyValidationPath: args.turtleSoupRankPenaltyValidationPath,
    },
    assumptions: {
      simulationIsResearchOnly: true,
      noRankPenaltyInstalled: true,
      noHardBlockInstalled: true,
      noModelRemoved: true,
      sameDateSessionSlateOnly: true,
      usesOutcomeForEvaluationNotScoring: true,
      livePromotionAllowed: false,
    },
    scoring: {
      blockedProtectedStopPenaltyPoints: BLOCKED_PROTECTED_STOP_PENALTY_POINTS,
      baselineDoesNotUseOutcome: true,
    },
    summary: {
      packageRows: packageRows.length,
      simulatedRows: rows.length,
      slates: slates.length,
      penalizedRows: penalizedRows.length,
      topChangedSlates: slates.filter((row) => row.topChanged).length,
      blockedTopBeforeSlates: slates.filter((row) => row.blockedTopBefore).length,
      blockedTopAfterSlates: slates.filter((row) => row.blockedTopAfter).length,
      topBeforeOneMesPl,
      topAfterOneMesPl,
      topSelectionDeltaOneMesPl,
      falseWinnerDemotions,
      hardBlockFalseRejectWinners,
      recommendation: rec,
      livePromotionAllowedRows: 0,
    },
    rows,
    slates,
    blockers,
    recommendations: blockers.length
      ? ['Do not use rank simulation until the replay package and rank validation are present and passing.']
      : rec === 'continue_research_rank_penalty_with_false_winner_review'
        ? [
          'Continue rank-penalty research only, with explicit false-winner review visibility.',
          'Do not hard-block TurtleSoup and do not install live scanner-visible behavior yet.',
        ]
        : rec === 'review_note_only'
          ? ['Use a review-note concept before any rank penalty; simulated top-selection improvement is not strong enough.']
          : ['Reject rank penalty for now; same-slate simulation worsened top-selection outcome.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewTurtleSoupRankSimulationReport(
  report: UnifiedPositiveHeldLocalPreviewTurtleSoupRankSimulationReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-turtlesoup-rank-simulation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewTurtleSoupRankSimulationCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const turtleSoupReplayPackagePath = readFlag(args, '--turtlesoup-replay-package') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-turtlesoup-replay-package-\d+\.json$/);
  const turtleSoupRankPenaltyValidationPath = readFlag(args, '--turtlesoup-rank-penalty-validation') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-turtlesoup-rank-penalty-validation-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewTurtleSoupRankSimulationReport({
    reportDir: outDir,
    turtleSoupReplayPackagePath,
    turtleSoupReplayPackageReport: turtleSoupReplayPackagePath && fs.existsSync(turtleSoupReplayPackagePath)
      ? JSON.parse(fs.readFileSync(turtleSoupReplayPackagePath, 'utf8')) as UnifiedPositiveHeldLocalPreviewTurtleSoupReplayPackageReport
      : null,
    turtleSoupRankPenaltyValidationPath,
    turtleSoupRankPenaltyValidationReport: turtleSoupRankPenaltyValidationPath && fs.existsSync(turtleSoupRankPenaltyValidationPath)
      ? JSON.parse(fs.readFileSync(turtleSoupRankPenaltyValidationPath, 'utf8')) as UnifiedPositiveHeldLocalPreviewTurtleSoupRankPenaltyValidationReport
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewTurtleSoupRankSimulationReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewTurtleSoupRankSimulationCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
