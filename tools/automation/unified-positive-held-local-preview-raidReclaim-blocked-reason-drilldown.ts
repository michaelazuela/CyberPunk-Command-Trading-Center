import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewraidReclaimRankSimulationReport,
} from './unified-positive-held-local-preview-raidReclaim-rank-simulation';
import type {
  UnifiedPositiveHeldLocalPreviewraidReclaimReplayPackageReport,
} from './unified-positive-held-local-preview-raidReclaim-replay-package';

type PackageRow = UnifiedPositiveHeldLocalPreviewraidReclaimReplayPackageReport['rows'][number];

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

export interface UnifiedPositiveHeldLocalPreviewraidReclaimBlockedReasonDrilldownReport {
  reportType: 'unified_positive_held_local_preview_raidReclaim_blocked_reason_drilldown';
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
    raidReclaimReplayPackagePath: string | null;
    raidReclaimRankSimulationPath: string | null;
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

function authority(): UnifiedPositiveHeldLocalPreviewraidReclaimBlockedReasonDrilldownReport['authority'] {
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
      reviewNoteCandidate: reason === 'missing_full_plan_levels',
    };
  }).sort((a, b) => Number(b.reviewNoteCandidate) - Number(a.reviewNoteCandidate) || (a.oneMesPl ?? 0) - (b.oneMesPl ?? 0));
}

function recommendedAction(args: {
  clusters: ReasonCluster[];
  blockedRows: number;
  rankPenaltyRejectedByPriorSimulation: boolean;
}): UnifiedPositiveHeldLocalPreviewraidReclaimBlockedReasonDrilldownReport['summary']['recommendedAction'] {
  if (!args.blockedRows) return 'no_action';
  if (args.rankPenaltyRejectedByPriorSimulation && args.clusters.some((cluster) => cluster.reviewNoteCandidate)) {
    return 'draft_review_note_wording_only';
  }
  return 'manual_case_review_only';
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewraidReclaimBlockedReasonDrilldownReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview raidReclaim Blocked Reason Drilldown',
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

export function buildUnifiedPositiveHeldLocalPreviewraidReclaimBlockedReasonDrilldownReport(args: {
  reportDir: string;
  raidReclaimReplayPackagePath: string | null;
  raidReclaimReplayPackageReport: UnifiedPositiveHeldLocalPreviewraidReclaimReplayPackageReport | null;
  raidReclaimRankSimulationPath: string | null;
  raidReclaimRankSimulationReport: UnifiedPositiveHeldLocalPreviewraidReclaimRankSimulationReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewraidReclaimBlockedReasonDrilldownReport {
  const packageRows = args.raidReclaimReplayPackageReport?.rows || [];
  const blockedRows = packageRows.filter((row) => row.group === 'blocked_protected_stop');
  const blockedSummary = summarize(blockedRows);
  const clusters = buildClusters(blockedRows);
  const rankPenaltyRejectedByPriorSimulation = args.raidReclaimRankSimulationReport?.summary.recommendation === 'reject_rank_penalty';
  const action = recommendedAction({
    clusters,
    blockedRows: blockedRows.length,
    rankPenaltyRejectedByPriorSimulation,
  });
  const blockers = [
    !args.raidReclaimReplayPackagePath ? 'missing raidReclaim replay package path' : null,
    !args.raidReclaimReplayPackageReport ? 'missing raidReclaim replay package report' : null,
    args.raidReclaimReplayPackageReport && args.raidReclaimReplayPackageReport.status !== 'pass' ? `raidReclaim replay package status ${args.raidReclaimReplayPackageReport.status}` : null,
    !args.raidReclaimRankSimulationPath ? 'missing raidReclaim rank simulation path' : null,
    !args.raidReclaimRankSimulationReport ? 'missing raidReclaim rank simulation report' : null,
    args.raidReclaimRankSimulationReport && args.raidReclaimRankSimulationReport.status !== 'pass' ? `raidReclaim rank simulation status ${args.raidReclaimRankSimulationReport.status}` : null,
    packageRows.length === 0 ? 'no raidReclaim package rows found' : null,
  ].filter((item): item is string => Boolean(item));
  const sampleReviewNote = action === 'draft_review_note_wording_only'
    ? 'raidReclaim remains valid, but this candidate is review-only because the protected-stop/plan proof is incomplete or blocked; require fresh completed 5M entry and protected-stop confirmation before treating it as actionable.'
    : null;
  const base: Omit<UnifiedPositiveHeldLocalPreviewraidReclaimBlockedReasonDrilldownReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_raidReclaim_blocked_reason_drilldown',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      raidReclaimReplayPackagePath: args.raidReclaimReplayPackagePath,
      raidReclaimRankSimulationPath: args.raidReclaimRankSimulationPath,
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
      ? ['Do not use blocked reason drilldown until the raidReclaim package and rank simulation are present and passing.']
      : action === 'draft_review_note_wording_only'
        ? [
          'Draft review-note wording only; do not install a rank penalty or hard block.',
          'Keep raidReclaim enabled and keep blocked protected-stop winners visible for manual review.',
        ]
        : action === 'manual_case_review_only'
          ? ['Use manual case review only; evidence is not clean enough for reusable note wording.']
          : ['No action needed.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewraidReclaimBlockedReasonDrilldownReport(
  report: UnifiedPositiveHeldLocalPreviewraidReclaimBlockedReasonDrilldownReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-raidReclaim-blocked-reason-drilldown-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewraidReclaimBlockedReasonDrilldownCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const raidReclaimReplayPackagePath = readFlag(args, '--raidReclaim-replay-package') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-raidReclaim-replay-package-\d+\.json$/);
  const raidReclaimRankSimulationPath = readFlag(args, '--raidReclaim-rank-simulation') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-raidReclaim-rank-simulation-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewraidReclaimBlockedReasonDrilldownReport({
    reportDir: outDir,
    raidReclaimReplayPackagePath,
    raidReclaimReplayPackageReport: raidReclaimReplayPackagePath && fs.existsSync(raidReclaimReplayPackagePath)
      ? JSON.parse(fs.readFileSync(raidReclaimReplayPackagePath, 'utf8')) as UnifiedPositiveHeldLocalPreviewraidReclaimReplayPackageReport
      : null,
    raidReclaimRankSimulationPath,
    raidReclaimRankSimulationReport: raidReclaimRankSimulationPath && fs.existsSync(raidReclaimRankSimulationPath)
      ? JSON.parse(fs.readFileSync(raidReclaimRankSimulationPath, 'utf8')) as UnifiedPositiveHeldLocalPreviewraidReclaimRankSimulationReport
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewraidReclaimBlockedReasonDrilldownReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewraidReclaimBlockedReasonDrilldownCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
