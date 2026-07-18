import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewIntakeTriageReport } from './unified-positive-held-local-preview-intake-triage';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport,
} from './unified-positive-held-local-preview-replay-package-source-proof-timing';
import type {
  UnifiedPositiveHeldLocalPreviewSweepPenaltyFullSlateSelectionComparisonReport,
} from './unified-positive-held-local-preview-sweep-penalty-full-slate-selection-comparison';

type IntakeRow = UnifiedPositiveHeldLocalPreviewIntakeTriageReport['rows'][number];
type TimingRow = UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport['rows'][number];
type SlateRow = UnifiedPositiveHeldLocalPreviewSweepPenaltyFullSlateSelectionComparisonReport['slates'][number];

interface DrilldownIntakeRow {
  intakeId: string;
  setupType: string;
  direction: string;
  executionStatus: string;
  detectedStatus: string;
  blockReason: string;
  firstSeenTime: string;
  lastSeenTime: string;
  occurrences: number;
  riskPoints: number | null;
  riskQuality: string;
  modelPriority: number | null;
  proofPriority: number | null;
  occurrencePriority: number | null;
  triageScore: number | null;
  triageDecision: string;
  proofState: string;
  replayPackageSelected: boolean;
  validReviewCandidate: boolean;
  validCandidateHeldForLater: boolean;
}

interface BlockedTopSlateDrilldownRow {
  slateId: string;
  tradeDate: string;
  session: string;
  installedTopTicketId: string;
  installedTopSetupType: string;
  installedTopScore: number | null;
  intakeRows: number;
  replayPackageRows: number;
  validReviewIntakeRows: number;
  validReviewRowsHeldForLater: number;
  selectedReplayRows: string[];
  heldValidReviewRows: string[];
  rootCause:
    | 'valid_candidate_held_out_by_triage_selection'
    | 'no_valid_candidate_in_intake'
    | 'missing_intake_or_timing_context';
  recommendation: string;
  intake: DrilldownIntakeRow[];
}

export interface UnifiedPositiveHeldLocalPreviewBlockedTopSlateDrilldownReport {
  reportType: 'unified_positive_held_local_preview_blocked_top_slate_drilldown';
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
    fullSlateSelectionComparisonPath: string | null;
    intakeTriagePath: string | null;
    sourceProofTimingPath: string | null;
  };
  summary: {
    blockedTopSlates: number;
    drilldownRows: number;
    validCandidateHeldOutSlates: number;
    noValidCandidateSlates: number;
    missingContextSlates: number;
    livePromotionAllowedRows: 0;
    recommendation:
      | 'fix_replay_package_triage_selection_research_only'
      | 'mine_more_intake_context_before_fix'
      | 'reject_blocked_top_slate_drilldown';
  };
  rows: BlockedTopSlateDrilldownRow[];
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
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): UnifiedPositiveHeldLocalPreviewBlockedTopSlateDrilldownReport['authority'] {
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

function numberOrNull(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function slateIdOf(row: Pick<IntakeRow | TimingRow, 'tradeDate' | 'session'>): string {
  return `${row.tradeDate}|${row.session}`;
}

function isValidReviewIntake(row: IntakeRow): boolean {
  return row.executionStatus === 'Conditional' &&
    row.blockReason === 'EntryTriggerPending' &&
    row.proofState === 'scanner_held_complete';
}

function buildRows(args: {
  fullSlateSlates: SlateRow[];
  intakeRows: IntakeRow[];
  timingRows: TimingRow[];
}): BlockedTopSlateDrilldownRow[] {
  const intakeBySlate = new Map<string, IntakeRow[]>();
  const timingBySlate = new Map<string, TimingRow[]>();
  for (const row of args.intakeRows) {
    const key = slateIdOf(row);
    intakeBySlate.set(key, [...(intakeBySlate.get(key) || []), row]);
  }
  for (const row of args.timingRows) {
    const key = slateIdOf(row);
    timingBySlate.set(key, [...(timingBySlate.get(key) || []), row]);
  }
  return args.fullSlateSlates
    .filter((slate) => slate.installedTopInvalidStopSweep)
    .map((slate) => {
      const intake = intakeBySlate.get(slate.slateId) || [];
      const timing = timingBySlate.get(slate.slateId) || [];
      const selectedIds = new Set(timing.map((row) => row.ticketId));
      const validHeld = intake.filter((row) => isValidReviewIntake(row) && !selectedIds.has(row.intakeId));
      const rootCause = intake.length === 0 || timing.length === 0
        ? 'missing_intake_or_timing_context'
        : validHeld.length > 0
          ? 'valid_candidate_held_out_by_triage_selection'
          : 'no_valid_candidate_in_intake';
      return {
        slateId: slate.slateId,
        tradeDate: slate.tradeDate,
        session: slate.session,
        installedTopTicketId: slate.installedTopTicketId || 'unknown',
        installedTopSetupType: slate.installedTopSetupType || 'unknown',
        installedTopScore: slate.installedTopScore,
        intakeRows: intake.length,
        replayPackageRows: timing.length,
        validReviewIntakeRows: intake.filter(isValidReviewIntake).length,
        validReviewRowsHeldForLater: validHeld.length,
        selectedReplayRows: timing.map((row) => row.ticketId).sort(),
        heldValidReviewRows: validHeld.map((row) => row.intakeId).sort(),
        rootCause,
        recommendation: rootCause === 'valid_candidate_held_out_by_triage_selection'
          ? 'Adjust research replay-package triage to include at least one valid Conditional/EntryTriggerPending alternative when a slate top row is blocked by InvalidStopLocation.'
          : rootCause === 'no_valid_candidate_in_intake'
            ? 'Mine upstream scanner generation/proof extraction; no valid deterministic candidate reached intake for this blocked-top slate.'
            : 'Regenerate or locate matching intake and source/proof timing context before changing selection logic.',
        intake: intake.map((row) => ({
          intakeId: row.intakeId,
          setupType: row.setupType,
          direction: row.direction,
          executionStatus: row.executionStatus,
          detectedStatus: row.detectedStatus,
          blockReason: row.blockReason,
          firstSeenTime: row.firstSeenTime,
          lastSeenTime: row.lastSeenTime,
          occurrences: row.occurrences,
          riskPoints: numberOrNull(row.riskPoints),
          riskQuality: stringValue(row.riskQuality, 'unknown'),
          modelPriority: numberOrNull(row.modelPriority),
          proofPriority: numberOrNull(row.proofPriority),
          occurrencePriority: numberOrNull(row.occurrencePriority),
          triageScore: numberOrNull(row.triageScore),
          triageDecision: row.triageDecision,
          proofState: row.proofState,
          replayPackageSelected: selectedIds.has(row.intakeId),
          validReviewCandidate: isValidReviewIntake(row),
          validCandidateHeldForLater: isValidReviewIntake(row) && !selectedIds.has(row.intakeId),
        })).sort((a, b) => (b.triageScore ?? 0) - (a.triageScore ?? 0) || a.intakeId.localeCompare(b.intakeId)),
      } satisfies BlockedTopSlateDrilldownRow;
    }).sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.session.localeCompare(b.session));
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewBlockedTopSlateDrilldownReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Blocked Top Slate Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only blocked-top slate drilldown. It reads saved diagnostic reports only and does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Blocked top slates: ${report.summary.blockedTopSlates}.`,
    `- Drilldown rows: ${report.summary.drilldownRows}.`,
    `- Valid candidate held-out slates: ${report.summary.validCandidateHeldOutSlates}.`,
    `- No-valid-candidate slates: ${report.summary.noValidCandidateSlates}.`,
    `- Missing-context slates: ${report.summary.missingContextSlates}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Rows',
    ...report.rows.map((row) => [
      `- ${row.slateId}: ${row.rootCause}.`,
      `  Top: ${row.installedTopTicketId} (${row.installedTopSetupType}, score ${row.installedTopScore ?? '-'}).`,
      `  Intake/replay rows: ${row.intakeRows}/${row.replayPackageRows}. Held valid review rows: ${row.heldValidReviewRows.join(', ') || 'none'}.`,
    ].join('\n')),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewBlockedTopSlateDrilldownReport(args: {
  reportDir: string;
  fullSlateSelectionComparisonPath: string | null;
  fullSlateSelectionComparisonReport: UnifiedPositiveHeldLocalPreviewSweepPenaltyFullSlateSelectionComparisonReport | null;
  intakeTriagePath: string | null;
  intakeTriageReport: UnifiedPositiveHeldLocalPreviewIntakeTriageReport | null;
  sourceProofTimingPath: string | null;
  sourceProofTimingReport: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewBlockedTopSlateDrilldownReport {
  const rows = buildRows({
    fullSlateSlates: args.fullSlateSelectionComparisonReport?.slates || [],
    intakeRows: args.intakeTriageReport?.rows || [],
    timingRows: args.sourceProofTimingReport?.rows || [],
  });
  const validHeld = rows.filter((row) => row.rootCause === 'valid_candidate_held_out_by_triage_selection').length;
  const noValid = rows.filter((row) => row.rootCause === 'no_valid_candidate_in_intake').length;
  const missing = rows.filter((row) => row.rootCause === 'missing_intake_or_timing_context').length;
  const blockers = [
    !args.fullSlateSelectionComparisonPath ? 'missing full-slate selection comparison path' : null,
    !args.fullSlateSelectionComparisonReport ? 'missing full-slate selection comparison report' : null,
    args.fullSlateSelectionComparisonReport && args.fullSlateSelectionComparisonReport.status !== 'pass'
      ? `full-slate selection comparison status ${args.fullSlateSelectionComparisonReport.status}`
      : null,
    !args.intakeTriagePath ? 'missing intake triage path' : null,
    !args.intakeTriageReport ? 'missing intake triage report' : null,
    !args.sourceProofTimingPath ? 'missing source/proof timing path' : null,
    !args.sourceProofTimingReport ? 'missing source/proof timing report' : null,
    rows.length === 0 ? 'no blocked top slates found for drilldown' : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation = blockers.length
    ? 'reject_blocked_top_slate_drilldown'
    : validHeld > 0
      ? 'fix_replay_package_triage_selection_research_only'
      : 'mine_more_intake_context_before_fix';
  const base: Omit<UnifiedPositiveHeldLocalPreviewBlockedTopSlateDrilldownReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_blocked_top_slate_drilldown',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      fullSlateSelectionComparisonPath: args.fullSlateSelectionComparisonPath,
      intakeTriagePath: args.intakeTriagePath,
      sourceProofTimingPath: args.sourceProofTimingPath,
    },
    summary: {
      blockedTopSlates: rows.length,
      drilldownRows: rows.length,
      validCandidateHeldOutSlates: validHeld,
      noValidCandidateSlates: noValid,
      missingContextSlates: missing,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not change replay package triage until blocked-top slate drilldown sources load cleanly.']
      : recommendation === 'fix_replay_package_triage_selection_research_only'
        ? [
          'Install a research-only replay-package triage fix that includes one valid Conditional/EntryTriggerPending alternative when the selected top row is blocked by InvalidStopLocation.',
          'Do not change scanner-visible behavior, canExecute, Discord, Supabase, bridge, entry, stop, target, risk, or model availability.',
        ]
        : [
          'Mine upstream scanner/proof generation for the blocked-top slates before changing triage selection.',
          'Keep invalid-stop rank penalty research-only until valid alternatives are reliably present in the replay package.',
        ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewBlockedTopSlateDrilldownReport(
  report: UnifiedPositiveHeldLocalPreviewBlockedTopSlateDrilldownReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-blocked-top-slate-drilldown-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewBlockedTopSlateDrilldownCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const fullSlateSelectionComparisonPath = readFlag(args, '--full-slate-selection-comparison') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-sweep-penalty-full-slate-selection-comparison-\d+\.json$/);
  const intakeTriagePath = readFlag(args, '--intake-triage') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-intake-triage-\d+\.json$/);
  const sourceProofTimingPath = readFlag(args, '--source-proof-timing') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-replay-package-source-proof-timing-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewBlockedTopSlateDrilldownReport({
    reportDir: outDir,
    fullSlateSelectionComparisonPath,
    fullSlateSelectionComparisonReport: fullSlateSelectionComparisonPath && fs.existsSync(fullSlateSelectionComparisonPath)
      ? readJson<UnifiedPositiveHeldLocalPreviewSweepPenaltyFullSlateSelectionComparisonReport>(fullSlateSelectionComparisonPath)
      : null,
    intakeTriagePath,
    intakeTriageReport: intakeTriagePath && fs.existsSync(intakeTriagePath)
      ? readJson<UnifiedPositiveHeldLocalPreviewIntakeTriageReport>(intakeTriagePath)
      : null,
    sourceProofTimingPath,
    sourceProofTimingReport: sourceProofTimingPath && fs.existsSync(sourceProofTimingPath)
      ? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport>(sourceProofTimingPath)
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewBlockedTopSlateDrilldownReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewBlockedTopSlateDrilldownCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
