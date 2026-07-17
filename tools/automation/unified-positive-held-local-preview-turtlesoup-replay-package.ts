import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  UnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerReport,
} from './unified-positive-held-local-preview-structured-snapshot-miner';
import type {
  UnifiedPositiveHeldLocalPreviewStructuredSnapshotValidationReport,
} from './unified-positive-held-local-preview-structured-snapshot-validation';

type SnapshotRow = UnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerReport['rows'][number];
type PackageGroup = 'conditional_protected_stop_clean' | 'blocked_protected_stop' | 'other_turtle_soup_state';

interface ReplayPackageRow {
  rowId: string;
  tradeDate: string;
  session: string;
  direction: string;
  group: PackageGroup;
  outcomeBucket: SnapshotRow['outcomeBucket'];
  resolvedOneMesPl: number | null;
  proofTime: string | null;
  eventTime: string | null;
  sourceFile: string | null;
  modelCandidateExecutionStatus: string | null;
  modelCandidateState: string | null;
  protectedStopEvidence: boolean;
  entryTriggerPendingEvidence: boolean;
  modelCandidateHasFullPlanLevels: boolean | null;
  scorecardWeakCount: number;
  selectedMatchesReviewedModel: boolean;
}

interface GroupSummary {
  group: PackageGroup;
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  oneMesPl: number | null;
  positiveDaySessions: number;
  negativeDaySessions: number;
}

interface DaySessionSummary {
  group: PackageGroup;
  tradeDate: string;
  session: string;
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  oneMesPl: number | null;
}

export interface UnifiedPositiveHeldLocalPreviewTurtleSoupReplayPackageReport {
  reportType: 'unified_positive_held_local_preview_turtlesoup_replay_package';
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
    structuredSnapshotMinerPath: string | null;
    structuredSnapshotValidationPath: string | null;
  };
  assumptions: {
    packageIsResearchOnly: true;
    usesPriorLocalSnapshotRowsOnly: true;
    noLiveReplayExecuted: true;
    noRankPenaltyInstalled: true;
    noModelRemoved: true;
    livePromotionAllowed: false;
  };
  summary: {
    sourceRows: number;
    turtleSoupRows: number;
    conditionalProtectedStopCleanRows: number;
    blockedProtectedStopRows: number;
    otherTurtleSoupStateRows: number;
    groupSummaries: number;
    daySessionSummaries: number;
    replayQuestion: 'candidate_for_broader_replay' | 'insufficient_separation';
    livePromotionAllowedRows: 0;
  };
  groups: GroupSummary[];
  daySessions: DaySessionSummary[];
  rows: ReplayPackageRow[];
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

function authority(): UnifiedPositiveHeldLocalPreviewTurtleSoupReplayPackageReport['authority'] {
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

function tradeDate(row: SnapshotRow): string {
  return /^\d{4}-\d{2}-\d{2}/.test(row.rowId) ? row.rowId.slice(0, 10) : 'unknown';
}

function groupFor(row: SnapshotRow): PackageGroup {
  if (row.modelCandidateExecutionStatus === 'Conditional' && !row.protectedStopEvidence) return 'conditional_protected_stop_clean';
  if (row.modelCandidateExecutionStatus === 'Blocked' || row.protectedStopEvidence) return 'blocked_protected_stop';
  return 'other_turtle_soup_state';
}

function toPackageRow(row: SnapshotRow): ReplayPackageRow {
  return {
    rowId: row.rowId,
    tradeDate: tradeDate(row),
    session: row.session,
    direction: row.direction,
    group: groupFor(row),
    outcomeBucket: row.outcomeBucket,
    resolvedOneMesPl: row.resolvedOneMesPl,
    proofTime: row.proofTime,
    eventTime: row.eventTime,
    sourceFile: row.sourceFile,
    modelCandidateExecutionStatus: row.modelCandidateExecutionStatus,
    modelCandidateState: row.modelCandidateState,
    protectedStopEvidence: row.protectedStopEvidence,
    entryTriggerPendingEvidence: row.entryTriggerPendingEvidence,
    modelCandidateHasFullPlanLevels: row.modelCandidateHasFullPlanLevels,
    scorecardWeakCount: row.scorecardWeakCount,
    selectedMatchesReviewedModel: row.selectedMatchesReviewedModel,
  };
}

function summarizeRows(rows: ReplayPackageRow[]): Pick<GroupSummary, 'rows' | 'winners' | 'losses' | 'unresolved' | 'oneMesPl'> {
  return {
    rows: rows.length,
    winners: rows.filter((row) => row.outcomeBucket === 'winner').length,
    losses: rows.filter((row) => row.outcomeBucket === 'loss').length,
    unresolved: rows.filter((row) => row.outcomeBucket === 'unresolved').length,
    oneMesPl: sum(rows.map((row) => row.resolvedOneMesPl)),
  };
}

function daySessionSummaries(rows: ReplayPackageRow[]): DaySessionSummary[] {
  const groups = new Map<string, ReplayPackageRow[]>();
  for (const row of rows) {
    const key = `${row.group}|${row.tradeDate}|${row.session}`;
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  return [...groups.entries()].map(([key, groupRows]) => {
    const [group, date, session] = key.split('|') as [PackageGroup, string, string];
    return {
      group,
      tradeDate: date,
      session,
      ...summarizeRows(groupRows),
    };
  }).sort((a, b) => a.group.localeCompare(b.group) || a.tradeDate.localeCompare(b.tradeDate) || a.session.localeCompare(b.session));
}

function groupSummaries(rows: ReplayPackageRow[], daySessions: DaySessionSummary[]): GroupSummary[] {
  const groups: PackageGroup[] = ['conditional_protected_stop_clean', 'blocked_protected_stop', 'other_turtle_soup_state'];
  return groups.map((group) => {
    const groupRows = rows.filter((row) => row.group === group);
    const ds = daySessions.filter((row) => row.group === group && row.oneMesPl !== null);
    return {
      group,
      ...summarizeRows(groupRows),
      positiveDaySessions: ds.filter((row) => (row.oneMesPl ?? 0) > 0).length,
      negativeDaySessions: ds.filter((row) => (row.oneMesPl ?? 0) < 0).length,
    };
  });
}

function replayQuestion(groups: GroupSummary[]): UnifiedPositiveHeldLocalPreviewTurtleSoupReplayPackageReport['summary']['replayQuestion'] {
  const clean = groups.find((group) => group.group === 'conditional_protected_stop_clean');
  const blocked = groups.find((group) => group.group === 'blocked_protected_stop');
  return clean && blocked &&
    (clean.oneMesPl ?? 0) > 0 &&
    (blocked.oneMesPl ?? 0) < 0 &&
    clean.winners > clean.losses &&
    blocked.losses > blocked.winners
    ? 'candidate_for_broader_replay'
    : 'insufficient_separation';
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewTurtleSoupReplayPackageReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview TurtleSoup Replay Package',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only TurtleSoup replay package from prior diagnostic rows. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Source rows: ${report.summary.sourceRows}.`,
    `- TurtleSoup rows: ${report.summary.turtleSoupRows}.`,
    `- Conditional/protected-stop-clean rows: ${report.summary.conditionalProtectedStopCleanRows}.`,
    `- Blocked protected-stop rows: ${report.summary.blockedProtectedStopRows}.`,
    `- Other TurtleSoup state rows: ${report.summary.otherTurtleSoupStateRows}.`,
    `- Replay question: ${report.summary.replayQuestion}.`,
    '',
    '## Groups',
    '| Group | Rows | W/L/U | P/L | Day/session +/- |',
    '|---|---:|---|---:|---|',
    ...report.groups.map((row) => `| ${escapeTable(row.group)} | ${row.rows} | ${row.winners}/${row.losses}/${row.unresolved} | ${row.oneMesPl ?? '-'} | ${row.positiveDaySessions}/${row.negativeDaySessions} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewTurtleSoupReplayPackageReport(args: {
  reportDir: string;
  structuredSnapshotMinerPath: string | null;
  structuredSnapshotMinerReport: UnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerReport | null;
  structuredSnapshotValidationPath: string | null;
  structuredSnapshotValidationReport: UnifiedPositiveHeldLocalPreviewStructuredSnapshotValidationReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewTurtleSoupReplayPackageReport {
  const sourceRows = args.structuredSnapshotMinerReport?.rows || [];
  const rows = sourceRows.filter((row) => row.setupType === 'TurtleSoup').map(toPackageRow);
  const daySessions = daySessionSummaries(rows);
  const groups = groupSummaries(rows, daySessions);
  const blockers = [
    !args.structuredSnapshotMinerPath ? 'missing structured snapshot miner path' : null,
    !args.structuredSnapshotMinerReport ? 'missing structured snapshot miner report' : null,
    args.structuredSnapshotMinerReport && args.structuredSnapshotMinerReport.status !== 'pass' ? `structured snapshot miner status ${args.structuredSnapshotMinerReport.status}` : null,
    !args.structuredSnapshotValidationPath ? 'missing structured snapshot validation path' : null,
    !args.structuredSnapshotValidationReport ? 'missing structured snapshot validation report' : null,
    args.structuredSnapshotValidationReport && args.structuredSnapshotValidationReport.status !== 'pass' ? `structured snapshot validation status ${args.structuredSnapshotValidationReport.status}` : null,
    rows.length === 0 ? 'no TurtleSoup rows found in structured snapshot miner output' : null,
  ].filter((item): item is string => Boolean(item));
  const question = replayQuestion(groups);
  const base: Omit<UnifiedPositiveHeldLocalPreviewTurtleSoupReplayPackageReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_turtlesoup_replay_package',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      structuredSnapshotMinerPath: args.structuredSnapshotMinerPath,
      structuredSnapshotValidationPath: args.structuredSnapshotValidationPath,
    },
    assumptions: {
      packageIsResearchOnly: true,
      usesPriorLocalSnapshotRowsOnly: true,
      noLiveReplayExecuted: true,
      noRankPenaltyInstalled: true,
      noModelRemoved: true,
      livePromotionAllowed: false,
    },
    summary: {
      sourceRows: sourceRows.length,
      turtleSoupRows: rows.length,
      conditionalProtectedStopCleanRows: rows.filter((row) => row.group === 'conditional_protected_stop_clean').length,
      blockedProtectedStopRows: rows.filter((row) => row.group === 'blocked_protected_stop').length,
      otherTurtleSoupStateRows: rows.filter((row) => row.group === 'other_turtle_soup_state').length,
      groupSummaries: groups.length,
      daySessionSummaries: daySessions.length,
      replayQuestion: question,
      livePromotionAllowedRows: 0,
    },
    groups,
    daySessions,
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not use this package until miner and validation reports are present and passing.']
      : question === 'candidate_for_broader_replay'
        ? [
          'Use this package for broader replay validation only; do not install a live rank penalty yet.',
          'Keep TurtleSoup enabled. The research question is blocked protected-stop state, not model removal.',
        ]
        : ['Do not advance to scanner-visible behavior; separation is not strong enough in this package.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewTurtleSoupReplayPackageReport(
  report: UnifiedPositiveHeldLocalPreviewTurtleSoupReplayPackageReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-turtlesoup-replay-package-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewTurtleSoupReplayPackageCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const structuredSnapshotMinerPath = readFlag(args, '--structured-snapshot-miner') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-structured-snapshot-miner-\d+\.json$/);
  const structuredSnapshotValidationPath = readFlag(args, '--structured-snapshot-validation') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-structured-snapshot-validation-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewTurtleSoupReplayPackageReport({
    reportDir: outDir,
    structuredSnapshotMinerPath,
    structuredSnapshotMinerReport: structuredSnapshotMinerPath && fs.existsSync(structuredSnapshotMinerPath)
      ? JSON.parse(fs.readFileSync(structuredSnapshotMinerPath, 'utf8')) as UnifiedPositiveHeldLocalPreviewStructuredSnapshotMinerReport
      : null,
    structuredSnapshotValidationPath,
    structuredSnapshotValidationReport: structuredSnapshotValidationPath && fs.existsSync(structuredSnapshotValidationPath)
      ? JSON.parse(fs.readFileSync(structuredSnapshotValidationPath, 'utf8')) as UnifiedPositiveHeldLocalPreviewStructuredSnapshotValidationReport
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewTurtleSoupReplayPackageReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewTurtleSoupReplayPackageCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
