import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewraidReclaimBlockedReasonDrilldownReport,
} from './unified-positive-held-local-preview-raidReclaim-blocked-reason-drilldown';

type DrilldownCluster = UnifiedPositiveHeldLocalPreviewraidReclaimBlockedReasonDrilldownReport['clusters'][number];

interface WordingRow {
  clusterId: string;
  reason: string;
  session: string;
  direction: string;
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  oneMesPl: number | null;
  noteCandidate: boolean;
  proposedNote: string;
  suppressesTicket: false;
  changesRanking: false;
  changesCanExecute: false;
  changesEntryStopTargets: false;
  livePromotionAllowed: false;
}

export interface UnifiedPositiveHeldLocalPreviewraidReclaimReviewNoteWordingProbeReport {
  reportType: 'unified_positive_held_local_preview_raidReclaim_review_note_wording_probe';
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
    blockedReasonDrilldownPath: string | null;
  };
  assumptions: {
    wordingProbeIsResearchOnly: true;
    noReviewNoteInstalled: true;
    noTicketSuppression: true;
    noRankChange: true;
    noCanExecuteChange: true;
    noModelRemoved: true;
    livePromotionAllowed: false;
  };
  summary: {
    clustersRead: number;
    noteCandidateClusters: number;
    wordingRows: number;
    suppressTicketRows: 0;
    rankingChangeRows: 0;
    canExecuteChangeRows: 0;
    entryStopTargetChangeRows: 0;
    livePromotionAllowedRows: 0;
    recommendedAction: 'keep_research_only_wording_candidate' | 'reject_wording_probe';
  };
  rows: WordingRow[];
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

function authority(): UnifiedPositiveHeldLocalPreviewraidReclaimReviewNoteWordingProbeReport['authority'] {
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

function proposedNote(cluster: DrilldownCluster): string {
  const side = cluster.direction === 'SHORT' ? 'short' : 'long';
  return `raidReclaim ${side} remains review-only: the liquidity-raid idea is visible, but this cluster lacks full plan-level proof. Require fresh completed 5M entry, protected stop, invalidation, and app targets before treating it as actionable.`;
}

function rowFromCluster(cluster: DrilldownCluster): WordingRow {
  return {
    clusterId: cluster.clusterId,
    reason: cluster.reason,
    session: cluster.session,
    direction: cluster.direction,
    rows: cluster.rows,
    winners: cluster.winners,
    losses: cluster.losses,
    unresolved: cluster.unresolved,
    oneMesPl: cluster.oneMesPl,
    noteCandidate: cluster.reviewNoteCandidate,
    proposedNote: proposedNote(cluster),
    suppressesTicket: false,
    changesRanking: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    livePromotionAllowed: false,
  };
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewraidReclaimReviewNoteWordingProbeReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview raidReclaim Review Note Wording Probe',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only wording probe. It does not install review notes, suppress tickets, alter ranking, change canExecute, post Discord, write Supabase, read live bridge data, run setupScanner, remove raidReclaim, or change entry/stop/target/risk rules.',
    '',
    '## Summary',
    `- Clusters read: ${report.summary.clustersRead}.`,
    `- Note candidate clusters: ${report.summary.noteCandidateClusters}.`,
    `- Wording rows: ${report.summary.wordingRows}.`,
    `- Suppress-ticket rows: ${report.summary.suppressTicketRows}.`,
    `- Ranking-change rows: ${report.summary.rankingChangeRows}.`,
    `- canExecute-change rows: ${report.summary.canExecuteChangeRows}.`,
    `- Entry/stop/target-change rows: ${report.summary.entryStopTargetChangeRows}.`,
    `- Recommended action: ${report.summary.recommendedAction}.`,
    '',
    '## Proposed Notes',
    '| Cluster | Session | Side | W/L/U | P/L | Note |',
    '|---|---|---|---|---:|---|',
    ...report.rows.map((row) => `| ${escapeTable(row.reason)} | ${row.session} | ${row.direction} | ${row.winners}/${row.losses}/${row.unresolved} | ${row.oneMesPl ?? '-'} | ${escapeTable(row.proposedNote)} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewraidReclaimReviewNoteWordingProbeReport(args: {
  reportDir: string;
  blockedReasonDrilldownPath: string | null;
  blockedReasonDrilldownReport: UnifiedPositiveHeldLocalPreviewraidReclaimBlockedReasonDrilldownReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewraidReclaimReviewNoteWordingProbeReport {
  const clusters = args.blockedReasonDrilldownReport?.clusters || [];
  const candidateClusters = clusters.filter((cluster) => cluster.reviewNoteCandidate && cluster.reason === 'missing_full_plan_levels');
  const rows = candidateClusters.map(rowFromCluster);
  const blockers = [
    !args.blockedReasonDrilldownPath ? 'missing raidReclaim blocked reason drilldown path' : null,
    !args.blockedReasonDrilldownReport ? 'missing raidReclaim blocked reason drilldown report' : null,
    args.blockedReasonDrilldownReport && args.blockedReasonDrilldownReport.status !== 'pass' ? `raidReclaim blocked reason drilldown status ${args.blockedReasonDrilldownReport.status}` : null,
    clusters.length === 0 ? 'no raidReclaim blocked reason clusters found' : null,
    rows.length === 0 ? 'no missing_full_plan_levels review-note candidate clusters found' : null,
    ...rows.flatMap((row) => [
      row.suppressesTicket ? `${row.clusterId} would suppress ticket` : null,
      row.changesRanking ? `${row.clusterId} would change ranking` : null,
      row.changesCanExecute ? `${row.clusterId} would change canExecute` : null,
      row.changesEntryStopTargets ? `${row.clusterId} would change entry/stop/targets` : null,
      row.livePromotionAllowed ? `${row.clusterId} allows live promotion` : null,
    ]),
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewraidReclaimReviewNoteWordingProbeReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_raidReclaim_review_note_wording_probe',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      blockedReasonDrilldownPath: args.blockedReasonDrilldownPath,
    },
    assumptions: {
      wordingProbeIsResearchOnly: true,
      noReviewNoteInstalled: true,
      noTicketSuppression: true,
      noRankChange: true,
      noCanExecuteChange: true,
      noModelRemoved: true,
      livePromotionAllowed: false,
    },
    summary: {
      clustersRead: clusters.length,
      noteCandidateClusters: candidateClusters.length,
      wordingRows: rows.length,
      suppressTicketRows: 0,
      rankingChangeRows: 0,
      canExecuteChangeRows: 0,
      entryStopTargetChangeRows: 0,
      livePromotionAllowedRows: 0,
      recommendedAction: blockers.length ? 'reject_wording_probe' : 'keep_research_only_wording_candidate',
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not use raidReclaim review-note wording until the blocked reason drilldown is present and passing.']
      : [
        'Keep this wording as a research-only candidate until a separate approved user-facing wording phase.',
        'Do not suppress raidReclaim tickets, change ranking, change canExecute, or alter entry/stop/target/risk behavior.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewraidReclaimReviewNoteWordingProbeReport(
  report: UnifiedPositiveHeldLocalPreviewraidReclaimReviewNoteWordingProbeReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-raidReclaim-review-note-wording-probe-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewraidReclaimReviewNoteWordingProbeCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const blockedReasonDrilldownPath = readFlag(args, '--blocked-reason-drilldown') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-raidReclaim-blocked-reason-drilldown-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewraidReclaimReviewNoteWordingProbeReport({
    reportDir: outDir,
    blockedReasonDrilldownPath,
    blockedReasonDrilldownReport: blockedReasonDrilldownPath && fs.existsSync(blockedReasonDrilldownPath)
      ? JSON.parse(fs.readFileSync(blockedReasonDrilldownPath, 'utf8')) as UnifiedPositiveHeldLocalPreviewraidReclaimBlockedReasonDrilldownReport
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewraidReclaimReviewNoteWordingProbeReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewraidReclaimReviewNoteWordingProbeCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
