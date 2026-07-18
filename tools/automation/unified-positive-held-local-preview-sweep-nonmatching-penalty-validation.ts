import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewIntakeTriageReport } from './unified-positive-held-local-preview-intake-triage';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport,
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow,
} from './unified-positive-held-local-preview-replay-package-source-proof-timing';
import type {
  UnifiedPositiveHeldLocalPreviewSweepLeadTopSelectionSimulationReport,
} from './unified-positive-held-local-preview-sweep-lead-top-selection-simulation';

type TimingRow = UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow;
type IntakeRow = UnifiedPositiveHeldLocalPreviewIntakeTriageReport['rows'][number];

interface BucketSummary {
  bucketId: 'sweep_lead' | 'sweep_nonmatching';
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  blocked: number;
  oneMesPl: number | null;
}

interface ReasonSummary {
  executionStatus: string;
  blockReason: string;
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  blocked: number;
  oneMesPl: number | null;
  falseRejectWinnerRows: number;
}

export interface UnifiedPositiveHeldLocalPreviewSweepNonmatchingPenaltyValidationReport {
  reportType: 'unified_positive_held_local_preview_sweep_nonmatching_penalty_validation';
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
    sourceProofTimingPath: string | null;
    intakeTriagePath: string | null;
    topSelectionSimulationPath: string | null;
  };
  assumptions: {
    validationOnly: true;
    usesOutcomeForEvaluationNotScoring: true;
    sweepLeadIsConditionalEntryTriggerPending: true;
    nonmatchingRowsArePenaltyCandidatesNotRemovedModels: true;
    noLiveFilterInstalled: true;
    noRankPenaltyInstalled: true;
    noCanExecuteChange: true;
    livePromotionAllowed: false;
  };
  summary: {
    sourceRows: number;
    joinedSweepRows: number;
    sweepLeadRows: number;
    nonmatchingSweepRows: number;
    nonmatchingFalseRejectWinnerRows: number;
    nonmatchingOneMesPl: number | null;
    topSelectionDeltaOneMesPl: number | null;
    recommendedAction: 'validate_invalid_stop_penalty_research_only' | 'reject_penalty_for_now' | 'keep_research_only';
    livePromotionAllowedRows: 0;
  };
  buckets: BucketSummary[];
  reasons: ReasonSummary[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const SWEEP_SETUP = 'SweepMssFvgRetrace';

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

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): UnifiedPositiveHeldLocalPreviewSweepNonmatchingPenaltyValidationReport['authority'] {
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

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function isLead(intake: IntakeRow | undefined): boolean {
  return intake?.executionStatus === 'Conditional' && intake?.blockReason === 'EntryTriggerPending';
}

function summarizeBucket(bucketId: BucketSummary['bucketId'], rows: TimingRow[]): BucketSummary {
  return {
    bucketId,
    rows: rows.length,
    winners: rows.filter((row) => row.outcomeBucket === 'winner_t1_t2').length,
    losses: rows.filter((row) => row.outcomeBucket === 'loss_stopped_before_t1').length,
    unresolved: rows.filter((row) => row.outcomeBucket === 'unresolved').length,
    blocked: rows.filter((row) => row.outcomeBucket === 'blocked').length,
    oneMesPl: sum(rows.map((row) => row.resolvedOneMesPl)),
  };
}

function buildReasonSummaries(rows: Array<{ row: TimingRow; intake: IntakeRow | undefined }>): ReasonSummary[] {
  const grouped = new Map<string, Array<{ row: TimingRow; intake: IntakeRow | undefined }>>();
  for (const item of rows) {
    const executionStatus = stringValue(item.intake?.executionStatus, 'execution_unknown');
    const blockReason = stringValue(item.intake?.blockReason, 'block_none');
    const key = `${executionStatus}|${blockReason}`;
    grouped.set(key, [...(grouped.get(key) || []), item]);
  }
  return [...grouped.entries()].map(([key, group]) => {
    const [executionStatus, blockReason] = key.split('|');
    const timingRows = group.map((item) => item.row);
    const winners = timingRows.filter((row) => row.outcomeBucket === 'winner_t1_t2').length;
    return {
      executionStatus,
      blockReason,
      rows: timingRows.length,
      winners,
      losses: timingRows.filter((row) => row.outcomeBucket === 'loss_stopped_before_t1').length,
      unresolved: timingRows.filter((row) => row.outcomeBucket === 'unresolved').length,
      blocked: timingRows.filter((row) => row.outcomeBucket === 'blocked').length,
      oneMesPl: sum(timingRows.map((row) => row.resolvedOneMesPl)),
      falseRejectWinnerRows: winners,
    };
  }).sort((a, b) => a.falseRejectWinnerRows - b.falseRejectWinnerRows || (a.oneMesPl ?? 0) - (b.oneMesPl ?? 0));
}

function recommendedAction(args: {
  nonmatchingRows: number;
  falseRejectWinnerRows: number;
  nonmatchingLosses: number;
  nonmatchingPl: number | null;
  topSelectionDelta: number | null;
}): UnifiedPositiveHeldLocalPreviewSweepNonmatchingPenaltyValidationReport['summary']['recommendedAction'] {
  if (args.falseRejectWinnerRows > 0) return 'reject_penalty_for_now';
  if (args.nonmatchingRows >= 10 && args.nonmatchingLosses >= 3 && (args.nonmatchingPl ?? 0) < 0 && (args.topSelectionDelta ?? 0) >= 0) {
    return 'validate_invalid_stop_penalty_research_only';
  }
  return 'keep_research_only';
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewSweepNonmatchingPenaltyValidationReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Sweep Nonmatching Penalty Validation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only Sweep nonmatching penalty validation. It does not install penalties or filters, post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Source rows: ${report.summary.sourceRows}.`,
    `- Joined Sweep rows: ${report.summary.joinedSweepRows}.`,
    `- Sweep lead rows: ${report.summary.sweepLeadRows}.`,
    `- Nonmatching Sweep rows: ${report.summary.nonmatchingSweepRows}.`,
    `- Nonmatching false-reject winners: ${report.summary.nonmatchingFalseRejectWinnerRows}.`,
    `- Nonmatching P/L: ${report.summary.nonmatchingOneMesPl ?? '-'}.`,
    `- Top-selection delta: ${report.summary.topSelectionDeltaOneMesPl ?? '-'}.`,
    `- Recommended action: ${report.summary.recommendedAction}.`,
    '',
    '## Buckets',
    '| Bucket | Rows | W/L/U/B | P/L |',
    '|---|---:|---|---:|',
    ...report.buckets.map((row) => `| ${row.bucketId} | ${row.rows} | ${row.winners}/${row.losses}/${row.unresolved}/${row.blocked} | ${row.oneMesPl ?? '-'} |`),
    '',
    '## Nonmatching Reasons',
    '| Execution Status | Block Reason | Rows | W/L/U/B | P/L | False-Reject Winners |',
    '|---|---|---:|---|---:|---:|',
    ...report.reasons.map((row) => `| ${escapeTable(row.executionStatus)} | ${escapeTable(row.blockReason)} | ${row.rows} | ${row.winners}/${row.losses}/${row.unresolved}/${row.blocked} | ${row.oneMesPl ?? '-'} | ${row.falseRejectWinnerRows} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewSweepNonmatchingPenaltyValidationReport(args: {
  reportDir: string;
  sourceProofTimingPath: string | null;
  sourceProofTimingReport: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport | null;
  intakeTriagePath: string | null;
  intakeTriageReport: UnifiedPositiveHeldLocalPreviewIntakeTriageReport | null;
  topSelectionSimulationPath: string | null;
  topSelectionSimulationReport: UnifiedPositiveHeldLocalPreviewSweepLeadTopSelectionSimulationReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewSweepNonmatchingPenaltyValidationReport {
  const timingRows = args.sourceProofTimingReport?.rows || [];
  const intakeRows = args.intakeTriageReport?.rows || [];
  const intakeById = new Map<string, IntakeRow>(intakeRows.map((row) => [row.intakeId, row]));
  const joinedSweepRows = timingRows
    .filter((row) => row.setupType === SWEEP_SETUP)
    .map((row) => ({ row, intake: intakeById.get(row.ticketId) }));
  const leadRows = joinedSweepRows.filter((item) => isLead(item.intake)).map((item) => item.row);
  const nonmatching = joinedSweepRows.filter((item) => !isLead(item.intake));
  const nonmatchingRows = nonmatching.map((item) => item.row);
  const buckets = [
    summarizeBucket('sweep_lead', leadRows),
    summarizeBucket('sweep_nonmatching', nonmatchingRows),
  ];
  const reasons = buildReasonSummaries(nonmatching);
  const nonmatchingBucket = buckets.find((bucket) => bucket.bucketId === 'sweep_nonmatching') || summarizeBucket('sweep_nonmatching', []);
  const topSelectionDelta = args.topSelectionSimulationReport?.summary.topSelectionDeltaOneMesPl ?? null;
  const blockers = [
    !args.sourceProofTimingPath ? 'missing source/proof timing path' : null,
    !args.sourceProofTimingReport ? 'missing source/proof timing report' : null,
    args.sourceProofTimingReport && args.sourceProofTimingReport.status !== 'pass' ? `source/proof timing status ${args.sourceProofTimingReport.status}` : null,
    !args.intakeTriagePath ? 'missing intake triage path' : null,
    !args.intakeTriageReport ? 'missing intake triage report' : null,
    !args.topSelectionSimulationPath ? 'missing top-selection simulation path' : null,
    !args.topSelectionSimulationReport ? 'missing top-selection simulation report' : null,
    args.topSelectionSimulationReport && args.topSelectionSimulationReport.status !== 'pass' ? `top-selection simulation status ${args.topSelectionSimulationReport.status}` : null,
    timingRows.length === 0 ? 'no source/proof timing rows found' : null,
    joinedSweepRows.length === 0 ? 'no Sweep rows joined' : null,
    joinedSweepRows.some((item) => !item.intake) ? 'one or more Sweep rows did not join to intake triage' : null,
  ].filter((item): item is string => Boolean(item));
  const rec = blockers.length
    ? 'reject_penalty_for_now'
    : recommendedAction({
      nonmatchingRows: nonmatchingRows.length,
      falseRejectWinnerRows: nonmatchingBucket.winners,
      nonmatchingLosses: nonmatchingBucket.losses,
      nonmatchingPl: nonmatchingBucket.oneMesPl,
      topSelectionDelta,
    });
  const base: Omit<UnifiedPositiveHeldLocalPreviewSweepNonmatchingPenaltyValidationReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_sweep_nonmatching_penalty_validation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      sourceProofTimingPath: args.sourceProofTimingPath,
      intakeTriagePath: args.intakeTriagePath,
      topSelectionSimulationPath: args.topSelectionSimulationPath,
    },
    assumptions: {
      validationOnly: true,
      usesOutcomeForEvaluationNotScoring: true,
      sweepLeadIsConditionalEntryTriggerPending: true,
      nonmatchingRowsArePenaltyCandidatesNotRemovedModels: true,
      noLiveFilterInstalled: true,
      noRankPenaltyInstalled: true,
      noCanExecuteChange: true,
      livePromotionAllowed: false,
    },
    summary: {
      sourceRows: timingRows.length,
      joinedSweepRows: joinedSweepRows.length,
      sweepLeadRows: leadRows.length,
      nonmatchingSweepRows: nonmatchingRows.length,
      nonmatchingFalseRejectWinnerRows: nonmatchingBucket.winners,
      nonmatchingOneMesPl: nonmatchingBucket.oneMesPl,
      topSelectionDeltaOneMesPl: topSelectionDelta,
      recommendedAction: rec,
      livePromotionAllowedRows: 0,
    },
    buckets,
    reasons,
    blockers,
    recommendations: blockers.length
      ? ['Do not use Sweep nonmatching penalty validation until timing, intake, and top-selection reports load cleanly.']
      : rec === 'validate_invalid_stop_penalty_research_only'
        ? [
          'Validate Blocked/InvalidStopLocation Sweep rows as a rank-penalty candidate in research only; do not remove SweepMssFvgRetrace.',
          'This supports preventing invalid-stop Sweep rows from winning same-session ranking, not weakening valid Conditional/EntryTriggerPending Sweep rows.',
          'Do not change live ranking, canExecute, Discord, Supabase, bridge, entry, stop, target, risk, or model availability from this diagnostic.',
        ]
        : rec === 'keep_research_only'
          ? [
            'Keep this as research only; the nonmatching bucket is not strong enough for live-facing behavior.',
            'Mine richer no-lookahead structural fields before changing ranking.',
          ]
          : [
            'Reject a nonmatching-Sweep penalty for now because it would reject winners or lacks positive top-selection proof.',
            'Do not change live ranking, canExecute, Discord, Supabase, bridge, entry, stop, target, risk, or model availability.',
          ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewSweepNonmatchingPenaltyValidationReport(
  report: UnifiedPositiveHeldLocalPreviewSweepNonmatchingPenaltyValidationReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-sweep-nonmatching-penalty-validation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewSweepNonmatchingPenaltyValidationCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const sourceProofTimingPath = readFlag(args, '--source-proof-timing') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-replay-package-source-proof-timing-\d+\.json$/);
  const intakeTriagePath = readFlag(args, '--intake-triage') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-intake-triage-\d+\.json$/);
  const topSelectionSimulationPath = readFlag(args, '--top-selection-simulation') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-sweep-lead-top-selection-simulation-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewSweepNonmatchingPenaltyValidationReport({
    reportDir: outDir,
    sourceProofTimingPath,
    sourceProofTimingReport: sourceProofTimingPath && fs.existsSync(sourceProofTimingPath)
      ? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport>(sourceProofTimingPath)
      : null,
    intakeTriagePath,
    intakeTriageReport: intakeTriagePath && fs.existsSync(intakeTriagePath)
      ? readJson<UnifiedPositiveHeldLocalPreviewIntakeTriageReport>(intakeTriagePath)
      : null,
    topSelectionSimulationPath,
    topSelectionSimulationReport: topSelectionSimulationPath && fs.existsSync(topSelectionSimulationPath)
      ? readJson<UnifiedPositiveHeldLocalPreviewSweepLeadTopSelectionSimulationReport>(topSelectionSimulationPath)
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewSweepNonmatchingPenaltyValidationReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewSweepNonmatchingPenaltyValidationCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
