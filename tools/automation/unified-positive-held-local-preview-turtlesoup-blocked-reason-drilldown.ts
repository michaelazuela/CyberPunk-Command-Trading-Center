import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewTurtleSoupRankSimulationReport,
} from './unified-positive-held-local-preview-turtlesoup-rank-simulation';
import type {
  UnifiedPositiveHeldLocalPreviewTurtleSoupReplayPackageReport,
} from './unified-positive-held-local-preview-turtlesoup-replay-package';

type PackageRow = UnifiedPositiveHeldLocalPreviewTurtleSoupReplayPackageReport['rows'][number];

interface ReasonCluster {
  clusterId: string;
  reason: string;
  session: string;
  direction: string;
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  oneMesPl: number | null;
  reviewNoteCandidate: boolean;
}

export interface UnifiedPositiveHeldLocalPreviewTurtleSoupBlockedReasonDrilldownReport {
  reportType: 'unified_positive_held_local_preview_turtlesoup_blocked_reason_drilldown';
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
    turtleSoupRankSimulationPath: string | null;
  };
  assumptions: {
    drilldownIsResearchOnly: true;
    noRankPenaltyInstalled: true;
    noReviewNoteInstalled: true;
    noHardBlockInstalled: true;
    noModelRemoved: true;
    livePromotionAllowed: false;
  };
  summary: {
    packageRows: number;
    blockedRows: number;
    blockedWinners: number;
    blockedLosses: number;
    blockedUnresolved: number;
    blockedOneMesPl: number | null;
    clusters: number;
    reviewNoteCandidateClusters: number;
    rankPenaltyRejectedByPriorSimulation: boolean;
    recommendedAction: 'draft_review_note_wording_only' | 'manual_case_review_only' | 'no_action';
    livePromotionAllowedRows: 0;
  };
  clusters: ReasonCluster[];
  sampleReviewNote: string | null;
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
  const matches = fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
}

function authority(): UnifiedPositiveHeldLocalPreviewTurtleSoupBlockedReasonDrilldownReport['authority'] {
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

function summarize(rows: PackageRow[]): Pick<ReasonCluster, 'rows' | 'winners' | 'losses' | 'unresolved' | 'oneMesPl'> {
  return {
    rows: rows.length,
    winners: rows.filter((row) => row.outcomeBucket === 'winner').length,
    losses: rows.filter((row) => row.outcomeBucket === 'loss').length,
    unresolved: rows.filter((row) => row.outcomeBucket === 'unresolved').length,
    oneMesPl: sum(rows.map((row) => row.resolvedOneMesPl)),
  };
}

function primaryReason(row: PackageRow): string {
  if (row.modelCandidateHasFullPlanLevels !== true) return 'missing_full_plan_levels';
  if (!row.entryTriggerPendingEvidence) return 'no_entry_trigger_pending_evidence';
  if (row.scorecardWeakCount >= 2) return 'multiple_scorecard_weak_points';
  return 'blocked_protected_stop_state';
}

function buildClusters(rows: PackageRow[]): ReasonCluster[] {
  const groups = new Map<string, PackageRow[]>();
  for (const row of rows) {
    const reason = primaryReason(row);
    const key = `${reason}|${row.session}|${row.direction}`;
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  return [...groups.entries()].map(([key, groupRows]) => {
    const [reason, session, direction] = key.split('|');
    const summary = summarize(groupRows);
    return {
      clusterId: key,
      reason,
      session,
      direction,
      ...summary,
      reviewNoteCandidate: summary.losses > summary.winners * 2 && (summary.oneMesPl ?? 0) < 0,
    };
  }).sort((a, b) => Number(b.reviewNoteCandidate) - Number(a.reviewNoteCandidate) || (a.oneMesPl ?? 0) - (b.oneMesPl ?? 0));
}

function recommendedAction(args: {
  clusters: ReasonCluster[];
  blockedRows: number;
  rankPenaltyRejectedByPriorSimulation: boolean;
}): UnifiedPositiveHeldLocalPreviewTurtleSoupBlockedReasonDrilldownReport['summary']['recommendedAction'] {
  if (!args.blockedRows) return 'no_action';
  if (args.rankPenaltyRejectedByPriorSimulation && args.clusters.some((cluster) => cluster.reviewNoteCandidate)) {
    return 'draft_review_note_wording_only';
  }
  return 'manual_case_review_only';
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewTurtleSoupBlockedReasonDrilldownReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview TurtleSoup Blocked Reason Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only reason drilldown. It does not install rank penalties, review notes, hard blocks, model removals, Discord posts, Supabase writes, live bridge reads, setupScanner changes, canExecute changes, or entry/stop/target/risk changes.',
    '',
    '## Summary',
    `- Package rows: ${report.summary.packageRows}.`,
    `- Blocked rows: ${report.summary.blockedRows} (${report.summary.blockedWinners}/${report.summary.blockedLosses}/${report.summary.blockedUnresolved}), P/L ${report.summary.blockedOneMesPl ?? '-'}.`,
    `- Clusters: ${report.summary.clusters}.`,
    `- Review-note candidate clusters: ${report.summary.reviewNoteCandidateClusters}.`,
    `- Rank penalty rejected by prior simulation: ${report.summary.rankPenaltyRejectedByPriorSimulation}.`,
    `- Recommended action: ${report.summary.recommendedAction}.`,
    '',
    '## Clusters',
    '| Reason | Session | Side | Rows | W/L/U | P/L | Review Note Candidate |',
    '|---|---|---|---:|---|---:|---|',
    ...report.clusters.map((row) => `| ${escapeTable(row.reason)} | ${row.session} | ${row.direction} | ${row.rows} | ${row.winners}/${row.losses}/${row.unresolved} | ${row.oneMesPl ?? '-'} | ${row.reviewNoteCandidate} |`),
    '',
    '## Sample Review Note',
    report.sampleReviewNote ? `- ${report.sampleReviewNote}` : '- None.',
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewTurtleSoupBlockedReasonDrilldownReport(args: {
  reportDir: string;
  turtleSoupReplayPackagePath: string | null;
  turtleSoupReplayPackageReport: UnifiedPositiveHeldLocalPreviewTurtleSoupReplayPackageReport | null;
  turtleSoupRankSimulationPath: string | null;
  turtleSoupRankSimulationReport: UnifiedPositiveHeldLocalPreviewTurtleSoupRankSimulationReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewTurtleSoupBlockedReasonDrilldownReport {
  const packageRows = args.turtleSoupReplayPackageReport?.rows || [];
  const blockedRows = packageRows.filter((row) => row.group === 'blocked_protected_stop');
  const blockedSummary = summarize(blockedRows);
  const clusters = buildClusters(blockedRows);
  const rankPenaltyRejectedByPriorSimulation = args.turtleSoupRankSimulationReport?.summary.recommendation === 'reject_rank_penalty';
  const action = recommendedAction({
    clusters,
    blockedRows: blockedRows.length,
    rankPenaltyRejectedByPriorSimulation,
  });
  const blockers = [
    !args.turtleSoupReplayPackagePath ? 'missing TurtleSoup replay package path' : null,
    !args.turtleSoupReplayPackageReport ? 'missing TurtleSoup replay package report' : null,
    args.turtleSoupReplayPackageReport && args.turtleSoupReplayPackageReport.status !== 'pass' ? `TurtleSoup replay package status ${args.turtleSoupReplayPackageReport.status}` : null,
    !args.turtleSoupRankSimulationPath ? 'missing TurtleSoup rank simulation path' : null,
    !args.turtleSoupRankSimulationReport ? 'missing TurtleSoup rank simulation report' : null,
    args.turtleSoupRankSimulationReport && args.turtleSoupRankSimulationReport.status !== 'pass' ? `TurtleSoup rank simulation status ${args.turtleSoupRankSimulationReport.status}` : null,
    packageRows.length === 0 ? 'no TurtleSoup package rows found' : null,
  ].filter((item): item is string => Boolean(item));
  const sampleReviewNote = action === 'draft_review_note_wording_only'
    ? 'TurtleSoup remains valid, but this candidate is review-only because the protected-stop/plan proof is incomplete or blocked; require fresh completed 5M entry and protected-stop confirmation before treating it as actionable.'
    : null;
  const base: Omit<UnifiedPositiveHeldLocalPreviewTurtleSoupBlockedReasonDrilldownReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_turtlesoup_blocked_reason_drilldown',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      turtleSoupReplayPackagePath: args.turtleSoupReplayPackagePath,
      turtleSoupRankSimulationPath: args.turtleSoupRankSimulationPath,
    },
    assumptions: {
      drilldownIsResearchOnly: true,
      noRankPenaltyInstalled: true,
      noReviewNoteInstalled: true,
      noHardBlockInstalled: true,
      noModelRemoved: true,
      livePromotionAllowed: false,
    },
    summary: {
      packageRows: packageRows.length,
      blockedRows: blockedSummary.rows,
      blockedWinners: blockedSummary.winners,
      blockedLosses: blockedSummary.losses,
      blockedUnresolved: blockedSummary.unresolved,
      blockedOneMesPl: blockedSummary.oneMesPl,
      clusters: clusters.length,
      reviewNoteCandidateClusters: clusters.filter((cluster) => cluster.reviewNoteCandidate).length,
      rankPenaltyRejectedByPriorSimulation,
      recommendedAction: action,
      livePromotionAllowedRows: 0,
    },
    clusters,
    sampleReviewNote,
    blockers,
    recommendations: blockers.length
      ? ['Do not use blocked reason drilldown until the TurtleSoup package and rank simulation are present and passing.']
      : action === 'draft_review_note_wording_only'
        ? [
          'Draft review-note wording only; do not install a rank penalty or hard block.',
          'Keep TurtleSoup enabled and keep blocked protected-stop winners visible for manual review.',
        ]
        : action === 'manual_case_review_only'
          ? ['Use manual case review only; evidence is not clean enough for reusable note wording.']
          : ['No action needed.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewTurtleSoupBlockedReasonDrilldownReport(
  report: UnifiedPositiveHeldLocalPreviewTurtleSoupBlockedReasonDrilldownReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-turtlesoup-blocked-reason-drilldown-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewTurtleSoupBlockedReasonDrilldownCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const turtleSoupReplayPackagePath = readFlag(args, '--turtlesoup-replay-package') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-turtlesoup-replay-package-\d+\.json$/);
  const turtleSoupRankSimulationPath = readFlag(args, '--turtlesoup-rank-simulation') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-turtlesoup-rank-simulation-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewTurtleSoupBlockedReasonDrilldownReport({
    reportDir: outDir,
    turtleSoupReplayPackagePath,
    turtleSoupReplayPackageReport: turtleSoupReplayPackagePath && fs.existsSync(turtleSoupReplayPackagePath)
      ? JSON.parse(fs.readFileSync(turtleSoupReplayPackagePath, 'utf8')) as UnifiedPositiveHeldLocalPreviewTurtleSoupReplayPackageReport
      : null,
    turtleSoupRankSimulationPath,
    turtleSoupRankSimulationReport: turtleSoupRankSimulationPath && fs.existsSync(turtleSoupRankSimulationPath)
      ? JSON.parse(fs.readFileSync(turtleSoupRankSimulationPath, 'utf8')) as UnifiedPositiveHeldLocalPreviewTurtleSoupRankSimulationReport
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewTurtleSoupBlockedReasonDrilldownReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewTurtleSoupBlockedReasonDrilldownCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
