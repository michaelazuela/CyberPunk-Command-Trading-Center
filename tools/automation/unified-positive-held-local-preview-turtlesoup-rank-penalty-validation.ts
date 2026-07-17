import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewTurtleSoupActionProbeReport,
} from './unified-positive-held-local-preview-turtlesoup-action-probe';
import type {
  UnifiedPositiveHeldLocalPreviewTurtleSoupReplayPackageReport,
} from './unified-positive-held-local-preview-turtlesoup-replay-package';

type PackageRow = UnifiedPositiveHeldLocalPreviewTurtleSoupReplayPackageReport['rows'][number];

interface SegmentSummary {
  segmentId: string;
  group: PackageRow['group'];
  dimension: 'session' | 'direction' | 'selected_match' | 'weak_count';
  value: string;
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  oneMesPl: number | null;
}

export interface UnifiedPositiveHeldLocalPreviewTurtleSoupRankPenaltyValidationReport {
  reportType: 'unified_positive_held_local_preview_turtlesoup_rank_penalty_validation';
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
    turtleSoupActionProbePath: string | null;
  };
  assumptions: {
    validationIsResearchOnly: true;
    validatesRankPenaltyNotHardBlock: true;
    falseRejectWinnersMustRemainVisible: true;
    noRankPenaltyInstalled: true;
    noModelRemoved: true;
    livePromotionAllowed: false;
  };
  summary: {
    packageRows: number;
    affectedRows: number;
    affectedWinners: number;
    affectedLosses: number;
    affectedUnresolved: number;
    affectedOneMesPl: number | null;
    preservedRows: number;
    preservedWinners: number;
    preservedLosses: number;
    preservedUnresolved: number;
    preservedOneMesPl: number | null;
    falseRejectWinnerRows: number;
    segmentSummaries: number;
    recommendation: 'validate_research_rank_penalty_only' | 'review_note_only' | 'reject_penalty';
    livePromotionAllowedRows: 0;
  };
  segments: SegmentSummary[];
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

function authority(): UnifiedPositiveHeldLocalPreviewTurtleSoupRankPenaltyValidationReport['authority'] {
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

function summarize(rows: PackageRow[]): Pick<SegmentSummary, 'rows' | 'winners' | 'losses' | 'unresolved' | 'oneMesPl'> {
  return {
    rows: rows.length,
    winners: rows.filter((row) => row.outcomeBucket === 'winner').length,
    losses: rows.filter((row) => row.outcomeBucket === 'loss').length,
    unresolved: rows.filter((row) => row.outcomeBucket === 'unresolved').length,
    oneMesPl: sum(rows.map((row) => row.resolvedOneMesPl)),
  };
}

function segment(rows: PackageRow[], dimension: SegmentSummary['dimension'], valueFor: (row: PackageRow) => string): SegmentSummary[] {
  const groups = new Map<string, PackageRow[]>();
  for (const row of rows) {
    const value = valueFor(row);
    const key = `${row.group}|${value}`;
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  return [...groups.entries()].map(([key, groupRows]) => {
    const [group, value] = key.split('|') as [PackageRow['group'], string];
    return {
      segmentId: `${dimension}|${group}|${value}`,
      group,
      dimension,
      value,
      ...summarize(groupRows),
    };
  });
}

function buildSegments(rows: PackageRow[]): SegmentSummary[] {
  return [
    ...segment(rows, 'session', (row) => row.session),
    ...segment(rows, 'direction', (row) => row.direction),
    ...segment(rows, 'selected_match', (row) => String(row.selectedMatchesReviewedModel)),
    ...segment(rows, 'weak_count', (row) => String(row.scorecardWeakCount)),
  ].sort((a, b) => a.dimension.localeCompare(b.dimension) || a.group.localeCompare(b.group) || a.value.localeCompare(b.value));
}

function recommendation(args: {
  affectedWinners: number;
  affectedLosses: number;
  affectedOneMesPl: number | null;
  preservedOneMesPl: number | null;
}): UnifiedPositiveHeldLocalPreviewTurtleSoupRankPenaltyValidationReport['summary']['recommendation'] {
  if (args.affectedWinners > 0 && args.affectedLosses >= args.affectedWinners * 3 && (args.affectedOneMesPl ?? 0) < 0 && (args.preservedOneMesPl ?? 0) > 0) {
    return 'validate_research_rank_penalty_only';
  }
  if ((args.affectedOneMesPl ?? 0) < 0) return 'review_note_only';
  return 'reject_penalty';
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewTurtleSoupRankPenaltyValidationReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview TurtleSoup Rank Penalty Validation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only validation for a possible rank penalty only. It does not install rank penalties, hard blocks, model removals, Discord posts, Supabase writes, live bridge reads, canExecute changes, or entry/stop/target/risk changes.',
    '',
    '## Summary',
    `- Package rows: ${report.summary.packageRows}.`,
    `- Affected blocked protected-stop rows: ${report.summary.affectedRows} (${report.summary.affectedWinners}/${report.summary.affectedLosses}/${report.summary.affectedUnresolved}), P/L ${report.summary.affectedOneMesPl ?? '-'}.`,
    `- Preserved clean TurtleSoup rows: ${report.summary.preservedRows} (${report.summary.preservedWinners}/${report.summary.preservedLosses}/${report.summary.preservedUnresolved}), P/L ${report.summary.preservedOneMesPl ?? '-'}.`,
    `- False-reject winner rows if hard-blocked: ${report.summary.falseRejectWinnerRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Segments',
    '| Segment | Group | Value | Rows | W/L/U | P/L |',
    '|---|---|---|---:|---|---:|',
    ...report.segments.map((row) => `| ${row.dimension} | ${escapeTable(row.group)} | ${escapeTable(row.value)} | ${row.rows} | ${row.winners}/${row.losses}/${row.unresolved} | ${row.oneMesPl ?? '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewTurtleSoupRankPenaltyValidationReport(args: {
  reportDir: string;
  turtleSoupReplayPackagePath: string | null;
  turtleSoupReplayPackageReport: UnifiedPositiveHeldLocalPreviewTurtleSoupReplayPackageReport | null;
  turtleSoupActionProbePath: string | null;
  turtleSoupActionProbeReport: UnifiedPositiveHeldLocalPreviewTurtleSoupActionProbeReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewTurtleSoupRankPenaltyValidationReport {
  const rows = args.turtleSoupReplayPackageReport?.rows || [];
  const affected = rows.filter((row) => row.group === 'blocked_protected_stop');
  const preserved = rows.filter((row) => row.group === 'conditional_protected_stop_clean');
  const affectedSummary = summarize(affected);
  const preservedSummary = summarize(preserved);
  const segments = buildSegments(rows);
  const blockers = [
    !args.turtleSoupReplayPackagePath ? 'missing TurtleSoup replay package path' : null,
    !args.turtleSoupReplayPackageReport ? 'missing TurtleSoup replay package report' : null,
    args.turtleSoupReplayPackageReport && args.turtleSoupReplayPackageReport.status !== 'pass' ? `TurtleSoup replay package status ${args.turtleSoupReplayPackageReport.status}` : null,
    !args.turtleSoupActionProbePath ? 'missing TurtleSoup action probe path' : null,
    !args.turtleSoupActionProbeReport ? 'missing TurtleSoup action probe report' : null,
    args.turtleSoupActionProbeReport && args.turtleSoupActionProbeReport.status !== 'pass' ? `TurtleSoup action probe status ${args.turtleSoupActionProbeReport.status}` : null,
    rows.length === 0 ? 'no TurtleSoup package rows found' : null,
  ].filter((item): item is string => Boolean(item));
  const rec = recommendation({
    affectedWinners: affectedSummary.winners,
    affectedLosses: affectedSummary.losses,
    affectedOneMesPl: affectedSummary.oneMesPl,
    preservedOneMesPl: preservedSummary.oneMesPl,
  });
  const base: Omit<UnifiedPositiveHeldLocalPreviewTurtleSoupRankPenaltyValidationReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_turtlesoup_rank_penalty_validation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      turtleSoupReplayPackagePath: args.turtleSoupReplayPackagePath,
      turtleSoupActionProbePath: args.turtleSoupActionProbePath,
    },
    assumptions: {
      validationIsResearchOnly: true,
      validatesRankPenaltyNotHardBlock: true,
      falseRejectWinnersMustRemainVisible: true,
      noRankPenaltyInstalled: true,
      noModelRemoved: true,
      livePromotionAllowed: false,
    },
    summary: {
      packageRows: rows.length,
      affectedRows: affectedSummary.rows,
      affectedWinners: affectedSummary.winners,
      affectedLosses: affectedSummary.losses,
      affectedUnresolved: affectedSummary.unresolved,
      affectedOneMesPl: affectedSummary.oneMesPl,
      preservedRows: preservedSummary.rows,
      preservedWinners: preservedSummary.winners,
      preservedLosses: preservedSummary.losses,
      preservedUnresolved: preservedSummary.unresolved,
      preservedOneMesPl: preservedSummary.oneMesPl,
      falseRejectWinnerRows: affectedSummary.winners,
      segmentSummaries: segments.length,
      recommendation: rec,
      livePromotionAllowedRows: 0,
    },
    segments,
    blockers,
    recommendations: blockers.length
      ? ['Do not use rank-penalty validation until the package and action probe are present and passing.']
      : rec === 'validate_research_rank_penalty_only'
        ? [
          'Advance to a research-only rank-penalty simulation; do not install live scanner-visible behavior yet.',
          'Do not hard-block TurtleSoup: affected bucket still contains winners.',
        ]
        : rec === 'review_note_only'
          ? ['Use a human-review caution note concept only; evidence is not strong enough for rank penalty.']
          : ['Reject rank penalty for now.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewTurtleSoupRankPenaltyValidationReport(
  report: UnifiedPositiveHeldLocalPreviewTurtleSoupRankPenaltyValidationReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-turtlesoup-rank-penalty-validation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewTurtleSoupRankPenaltyValidationCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const turtleSoupReplayPackagePath = readFlag(args, '--turtlesoup-replay-package') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-turtlesoup-replay-package-\d+\.json$/);
  const turtleSoupActionProbePath = readFlag(args, '--turtlesoup-action-probe') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-turtlesoup-action-probe-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewTurtleSoupRankPenaltyValidationReport({
    reportDir: outDir,
    turtleSoupReplayPackagePath,
    turtleSoupReplayPackageReport: turtleSoupReplayPackagePath && fs.existsSync(turtleSoupReplayPackagePath)
      ? JSON.parse(fs.readFileSync(turtleSoupReplayPackagePath, 'utf8')) as UnifiedPositiveHeldLocalPreviewTurtleSoupReplayPackageReport
      : null,
    turtleSoupActionProbePath,
    turtleSoupActionProbeReport: turtleSoupActionProbePath && fs.existsSync(turtleSoupActionProbePath)
      ? JSON.parse(fs.readFileSync(turtleSoupActionProbePath, 'utf8')) as UnifiedPositiveHeldLocalPreviewTurtleSoupActionProbeReport
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewTurtleSoupRankPenaltyValidationReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewTurtleSoupRankPenaltyValidationCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
