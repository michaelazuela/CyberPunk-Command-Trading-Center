import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewTurtleSoupReplayPackageReport,
} from './unified-positive-held-local-preview-turtlesoup-replay-package';

type PackageRow = UnifiedPositiveHeldLocalPreviewTurtleSoupReplayPackageReport['rows'][number];
type ActionDecision = 'rank_penalty_candidate' | 'review_note_candidate' | 'reject_for_now';

interface ActionProbeRow {
  actionId: string;
  description: string;
  affectedRows: number;
  preservedRows: number;
  affectedWinners: number;
  affectedLosses: number;
  affectedUnresolved: number;
  preservedWinners: number;
  preservedLosses: number;
  preservedUnresolved: number;
  affectedOneMesPl: number | null;
  preservedOneMesPl: number | null;
  affectedPositiveDaySessions: number;
  affectedNegativeDaySessions: number;
  preservedPositiveDaySessions: number;
  preservedNegativeDaySessions: number;
  decision: ActionDecision;
  recommendation: string;
}

export interface UnifiedPositiveHeldLocalPreviewTurtleSoupActionProbeReport {
  reportType: 'unified_positive_held_local_preview_turtlesoup_action_probe';
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
  };
  assumptions: {
    probesAreResearchOnly: true;
    noRankPenaltyInstalled: true;
    noReviewNoteInstalled: true;
    noModelRemoved: true;
    livePromotionAllowed: false;
  };
  summary: {
    packageRows: number;
    probesEvaluated: number;
    rankPenaltyCandidates: number;
    reviewNoteCandidates: number;
    rejectedProbes: number;
    livePromotionAllowedRows: 0;
  };
  rows: ActionProbeRow[];
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

function authority(): UnifiedPositiveHeldLocalPreviewTurtleSoupActionProbeReport['authority'] {
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

function summarizeDaySession(rows: PackageRow[]): { positive: number; negative: number } {
  const groups = new Map<string, PackageRow[]>();
  for (const row of rows) {
    const key = `${row.tradeDate}|${row.session}`;
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  const totals = [...groups.values()].map((group) => sum(group.map((row) => row.resolvedOneMesPl))).filter((value): value is number => value !== null);
  return {
    positive: totals.filter((value) => value > 0).length,
    negative: totals.filter((value) => value < 0).length,
  };
}

function buildProbe(actionId: string, description: string, affected: PackageRow[], preserved: PackageRow[]): ActionProbeRow {
  const affectedWinners = affected.filter((row) => row.outcomeBucket === 'winner').length;
  const affectedLosses = affected.filter((row) => row.outcomeBucket === 'loss').length;
  const preservedWinners = preserved.filter((row) => row.outcomeBucket === 'winner').length;
  const preservedLosses = preserved.filter((row) => row.outcomeBucket === 'loss').length;
  const affectedOneMesPl = sum(affected.map((row) => row.resolvedOneMesPl));
  const preservedOneMesPl = sum(preserved.map((row) => row.resolvedOneMesPl));
  const affectedDs = summarizeDaySession(affected);
  const preservedDs = summarizeDaySession(preserved);
  const decision: ActionDecision = affectedLosses > affectedWinners * 3 &&
    (affectedOneMesPl ?? 0) < 0 &&
    (preservedOneMesPl ?? 0) > 0 &&
    affectedDs.negative > affectedDs.positive * 3
    ? 'rank_penalty_candidate'
    : affectedLosses > affectedWinners && (affectedOneMesPl ?? 0) < 0
      ? 'review_note_candidate'
      : 'reject_for_now';
  return {
    actionId,
    description,
    affectedRows: affected.length,
    preservedRows: preserved.length,
    affectedWinners,
    affectedLosses,
    affectedUnresolved: affected.filter((row) => row.outcomeBucket === 'unresolved').length,
    preservedWinners,
    preservedLosses,
    preservedUnresolved: preserved.filter((row) => row.outcomeBucket === 'unresolved').length,
    affectedOneMesPl,
    preservedOneMesPl,
    affectedPositiveDaySessions: affectedDs.positive,
    affectedNegativeDaySessions: affectedDs.negative,
    preservedPositiveDaySessions: preservedDs.positive,
    preservedNegativeDaySessions: preservedDs.negative,
    decision,
    recommendation: decision === 'rank_penalty_candidate'
      ? 'Candidate for research-only rank penalty validation. Do not install live behavior until replay-expanded.'
      : decision === 'review_note_candidate'
        ? 'Candidate for human-review caution note only. Do not rank-suppress from current evidence.'
        : 'Reject for now; the affected bucket is not negative enough.',
  };
}

function buildProbes(rows: PackageRow[]): ActionProbeRow[] {
  const blocked = rows.filter((row) => row.group === 'blocked_protected_stop');
  const clean = rows.filter((row) => row.group === 'conditional_protected_stop_clean');
  return [
    buildProbe(
      'blocked_protected_stop_rank_penalty',
      'Treat blocked protected-stop TurtleSoup state as a possible rank penalty while preserving clean Conditional TurtleSoup.',
      blocked,
      clean,
    ),
    buildProbe(
      'blocked_protected_stop_review_note',
      'Treat blocked protected-stop TurtleSoup state as a human-review caution note while preserving model eligibility.',
      blocked,
      clean,
    ),
  ];
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewTurtleSoupActionProbeReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview TurtleSoup Action Probe',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only action probe. It does not install rank penalties, review notes, model removals, Discord posts, Supabase writes, live bridge reads, canExecute changes, or entry/stop/target/risk changes.',
    '',
    '## Summary',
    `- Package rows: ${report.summary.packageRows}.`,
    `- Probes evaluated: ${report.summary.probesEvaluated}.`,
    `- Rank penalty candidates: ${report.summary.rankPenaltyCandidates}.`,
    `- Review note candidates: ${report.summary.reviewNoteCandidates}.`,
    `- Rejected probes: ${report.summary.rejectedProbes}.`,
    '',
    '## Probes',
    '| Decision | Action | Affected W/L/U | Preserved W/L/U | Affected P/L | Preserved P/L | Affected +/- sessions | Preserved +/- sessions |',
    '|---|---|---|---|---:|---:|---|---|',
    ...report.rows.map((row) => `| ${row.decision} | ${escapeTable(row.actionId)} | ${row.affectedWinners}/${row.affectedLosses}/${row.affectedUnresolved} | ${row.preservedWinners}/${row.preservedLosses}/${row.preservedUnresolved} | ${row.affectedOneMesPl ?? '-'} | ${row.preservedOneMesPl ?? '-'} | ${row.affectedPositiveDaySessions}/${row.affectedNegativeDaySessions} | ${row.preservedPositiveDaySessions}/${row.preservedNegativeDaySessions} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewTurtleSoupActionProbeReport(args: {
  reportDir: string;
  turtleSoupReplayPackagePath: string | null;
  turtleSoupReplayPackageReport: UnifiedPositiveHeldLocalPreviewTurtleSoupReplayPackageReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewTurtleSoupActionProbeReport {
  const rows = args.turtleSoupReplayPackageReport?.rows || [];
  const probes = buildProbes(rows);
  const blockers = [
    !args.turtleSoupReplayPackagePath ? 'missing TurtleSoup replay package path' : null,
    !args.turtleSoupReplayPackageReport ? 'missing TurtleSoup replay package report' : null,
    args.turtleSoupReplayPackageReport && args.turtleSoupReplayPackageReport.status !== 'pass' ? `TurtleSoup replay package status ${args.turtleSoupReplayPackageReport.status}` : null,
    rows.length === 0 ? 'no TurtleSoup replay package rows found' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewTurtleSoupActionProbeReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_turtlesoup_action_probe',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      turtleSoupReplayPackagePath: args.turtleSoupReplayPackagePath,
    },
    assumptions: {
      probesAreResearchOnly: true,
      noRankPenaltyInstalled: true,
      noReviewNoteInstalled: true,
      noModelRemoved: true,
      livePromotionAllowed: false,
    },
    summary: {
      packageRows: rows.length,
      probesEvaluated: probes.length,
      rankPenaltyCandidates: probes.filter((row) => row.decision === 'rank_penalty_candidate').length,
      reviewNoteCandidates: probes.filter((row) => row.decision === 'review_note_candidate').length,
      rejectedProbes: probes.filter((row) => row.decision === 'reject_for_now').length,
      livePromotionAllowedRows: 0,
    },
    rows: probes,
    blockers,
    recommendations: blockers.length
      ? ['Do not use action probes until the TurtleSoup replay package is present and passing.']
      : probes.some((row) => row.decision === 'rank_penalty_candidate')
        ? [
          'Next step is replay-expanded rank-penalty validation only; do not install scanner-visible rank changes yet.',
          'Keep TurtleSoup enabled. The candidate action targets blocked protected-stop state only.',
        ]
        : ['Current evidence supports caution-note review before any rank penalty.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewTurtleSoupActionProbeReport(
  report: UnifiedPositiveHeldLocalPreviewTurtleSoupActionProbeReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-turtlesoup-action-probe-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewTurtleSoupActionProbeCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const turtleSoupReplayPackagePath = readFlag(args, '--turtlesoup-replay-package') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-turtlesoup-replay-package-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewTurtleSoupActionProbeReport({
    reportDir: outDir,
    turtleSoupReplayPackagePath,
    turtleSoupReplayPackageReport: turtleSoupReplayPackagePath && fs.existsSync(turtleSoupReplayPackagePath)
      ? JSON.parse(fs.readFileSync(turtleSoupReplayPackagePath, 'utf8')) as UnifiedPositiveHeldLocalPreviewTurtleSoupReplayPackageReport
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewTurtleSoupActionProbeReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewTurtleSoupActionProbeCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
