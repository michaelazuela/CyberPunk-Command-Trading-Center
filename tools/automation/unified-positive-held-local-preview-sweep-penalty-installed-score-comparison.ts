import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ExecutionStatus, NoTradeReason, SetupCandidate, SetupCandidateStatus, SetupType } from '../../src/types';
import {
  buildUnifiedDeskCandidateBook,
  type UnifiedDeskCandidateBookItem,
} from '../../src/lib/unifiedDeskCandidateBook';
import type { UnifiedPositiveHeldLocalPreviewIntakeTriageReport } from './unified-positive-held-local-preview-intake-triage';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport,
} from './unified-positive-held-local-preview-replay-package-source-proof-timing';
import type {
  UnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerOverlayDryRunReport,
} from './unified-positive-held-local-preview-sweep-penalty-fresh-scanner-overlay-dry-run';

type TimingRow = UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport['rows'][number];
type IntakeRow = UnifiedPositiveHeldLocalPreviewIntakeTriageReport['rows'][number];

interface ComparisonRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  executionStatus: string;
  blockReason: string;
  installedScore: number | null;
  candidateBookState: UnifiedDeskCandidateBookItem['state'] | null;
  validSweepLead: boolean;
  invalidStopSweepPenaltyCandidate: boolean;
  installedPenaltyExpected: boolean;
  canExecute: boolean | null;
  entryPreserved: boolean;
  stopPreserved: boolean;
  target1Preserved: boolean;
  target2Preserved: boolean;
  riskPreserved: boolean;
}

export interface UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport {
  reportType: 'unified_positive_held_local_preview_sweep_penalty_installed_score_comparison';
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
    freshScannerOverlayDryRunPath: string | null;
  };
  summary: {
    sourceRows: number;
    joinedRows: number;
    candidateBookRows: number;
    sweepRows: number;
    validSweepLeadRows: number;
    invalidStopSweepPenaltyRows: number;
    installedPenaltyRows: number;
    validSweepLeadRowsPenalized: number;
    canExecuteTrueRows: number;
    entryStopTargetRiskDriftRows: number;
    overlayTopSelectionDeltaOneMesPl: number | null;
    overlayMatchesExpectedRows: boolean;
    recommendation:
      | 'installed_score_path_matches_research_overlay'
      | 'keep_research_only'
      | 'reject_installed_score_path'
      | 'blank_slate_no_installed_penalty_path';
    livePromotionAllowedRows: 0;
  };
  rows: ComparisonRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const SWEEP_SETUP = 'NoInstalledSetup';
const BLANK_SLATE_MODE = Object.values(SetupType).length === 1 && Object.values(SetupType)[0] === SetupType.NoSetup;

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

function authority(): UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport['authority'] {
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
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function setupTypeFrom(value: string): SetupType {
  return (Object.values(SetupType) as string[]).includes(value) ? value as SetupType : SetupType.NoSetup;
}

function executionStatusFrom(value: string): ExecutionStatus {
  return (Object.values(ExecutionStatus) as string[]).includes(value) ? value as ExecutionStatus : ExecutionStatus.Conditional;
}

function noTradeReasonFrom(value: string): NoTradeReason | null {
  return (Object.values(NoTradeReason) as string[]).includes(value) ? value as NoTradeReason : null;
}

function validSweepLead(row: { setupType: string; executionStatus: string; blockReason: string }): boolean {
  if (BLANK_SLATE_MODE) return false;
  return row.setupType === SWEEP_SETUP && row.executionStatus === 'Conditional' && row.blockReason === 'EntryTriggerPending';
}

function invalidStopSweepPenaltyCandidate(row: { setupType: string; executionStatus: string; blockReason: string }): boolean {
  if (BLANK_SLATE_MODE) return false;
  return row.setupType === SWEEP_SETUP && row.executionStatus === 'Blocked' && row.blockReason === 'InvalidStopLocation';
}

function candidateFrom(row: TimingRow, intake: IntakeRow | undefined): SetupCandidate {
  const executionStatus = stringValue(intake?.executionStatus, 'Conditional');
  const blockReason = stringValue(intake?.blockReason, 'block_none');
  return {
    setupType: setupTypeFrom(row.setupType),
    scenarioLabel: row.ticketId,
    direction: row.direction === 'SHORT' ? 'SHORT' : row.direction === 'LONG' ? 'LONG' : 'NO TRADE',
    detectedStatus: SetupCandidateStatus.Conditional,
    confidence: 'Medium',
    priority: numberOrNull(intake?.modelPriority) ?? 50,
    entry: numberOrNull(intake?.entry),
    stop: numberOrNull(intake?.stop),
    target1: numberOrNull(intake?.target1),
    target2: numberOrNull(intake?.target2),
    riskPoints: numberOrNull(intake?.riskPoints) ?? row.riskPoints,
    modelConfidenceScore: numberOrNull(intake?.modelPriority) ?? null,
    decisionQualityScore: numberOrNull(intake?.triageScore) ?? numberOrNull(intake?.proofPriority) ?? null,
    evidence: [
      row.proofTime ? `Completed 5M proof reference ${row.proofTime}.` : 'Replay proof reference unavailable.',
      `Source/proof outcome bucket: ${row.outcomeBucket}.`,
    ],
    missingEvidence: noTradeReasonFrom(blockReason) ? [blockReason] : [],
    executionStatus: executionStatusFrom(executionStatus),
    blockReason: noTradeReasonFrom(blockReason),
    requiredTrigger: blockReason === 'EntryTriggerPending' ? 'Wait for completed 5M retest/re-entry proof.' : null,
    nextAction: 'Installed-score comparison only; no live execution authority.',
    reducedRiskPlan: null,
  };
}

function compareRows(args: {
  timingRows: TimingRow[];
  intakeRows: IntakeRow[];
}): ComparisonRow[] {
  const intakeById = new Map<string, IntakeRow>(args.intakeRows.map((row) => [row.intakeId, row]));
  return args.timingRows.map((row) => {
    const intake = intakeById.get(row.ticketId);
    const candidate = candidateFrom(row, intake);
    const book = buildUnifiedDeskCandidateBook({
      sessionType: row.session === 'lunch' ? 'replay_lunch' : row.session === 'evening' ? 'replay_evening' : 'replay_morning',
      candidates: [candidate],
    });
    const item = book.primaryDeskIdea;
    const executionStatus = stringValue(intake?.executionStatus, stringValue(candidate.executionStatus, 'Conditional'));
    const blockReason = stringValue(intake?.blockReason, candidate.blockReason || 'block_none');
    const base = {
      ticketId: row.ticketId,
      tradeDate: row.tradeDate,
      session: row.session,
      setupType: row.setupType,
      direction: row.direction,
      executionStatus,
      blockReason,
      installedScore: item?.score ?? null,
      candidateBookState: item?.state ?? null,
      validSweepLead: validSweepLead({ setupType: row.setupType, executionStatus, blockReason }),
      invalidStopSweepPenaltyCandidate: invalidStopSweepPenaltyCandidate({ setupType: row.setupType, executionStatus, blockReason }),
      canExecute: item?.canExecute ?? false,
      entryPreserved: BLANK_SLATE_MODE || (item?.entry ?? null) === (numberOrNull(intake?.entry) ?? null),
      stopPreserved: BLANK_SLATE_MODE || (item?.stop ?? null) === (numberOrNull(intake?.stop) ?? null),
      target1Preserved: BLANK_SLATE_MODE || (item?.target1 ?? null) === (numberOrNull(intake?.target1) ?? null),
      target2Preserved: BLANK_SLATE_MODE || (item?.target2 ?? null) === (numberOrNull(intake?.target2) ?? null),
      riskPreserved: BLANK_SLATE_MODE || (item?.riskPoints ?? null) === (numberOrNull(intake?.riskPoints) ?? row.riskPoints ?? null),
    };
    return {
      ...base,
      installedPenaltyExpected: base.invalidStopSweepPenaltyCandidate,
    } satisfies ComparisonRow;
  }).sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.session.localeCompare(b.session) || a.ticketId.localeCompare(b.ticketId));
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Sweep Penalty Installed Score Comparison',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only installed-score comparison. It reads saved reports and calls the installed candidate-book scoring path only. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Source rows: ${report.summary.sourceRows}.`,
    `- Candidate-book rows: ${report.summary.candidateBookRows}.`,
    `- Sweep rows: ${report.summary.sweepRows}.`,
    `- Valid Sweep lead rows: ${report.summary.validSweepLeadRows}.`,
    `- Invalid-stop Sweep rows: ${report.summary.invalidStopSweepPenaltyRows}.`,
    `- Installed penalty rows: ${report.summary.installedPenaltyRows}.`,
    `- Valid Sweep lead rows penalized: ${report.summary.validSweepLeadRowsPenalized}.`,
    `- canExecute=true rows: ${report.summary.canExecuteTrueRows}.`,
    `- Entry/stop/target/risk drift rows: ${report.summary.entryStopTargetRiskDriftRows}.`,
    `- Overlay top-selection delta: ${report.summary.overlayTopSelectionDeltaOneMesPl ?? '-'}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport(args: {
  reportDir: string;
  sourceProofTimingPath: string | null;
  sourceProofTimingReport: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport | null;
  intakeTriagePath: string | null;
  intakeTriageReport: UnifiedPositiveHeldLocalPreviewIntakeTriageReport | null;
  freshScannerOverlayDryRunPath: string | null;
  freshScannerOverlayDryRunReport: UnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerOverlayDryRunReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport {
  const timingRows = args.sourceProofTimingReport?.rows || [];
  const intakeRows = args.intakeTriageReport?.rows || [];
  const rows = compareRows({ timingRows, intakeRows });
  const validSweepLeadRows = rows.filter((row) => row.validSweepLead).length;
  const invalidStopSweepPenaltyRows = rows.filter((row) => row.invalidStopSweepPenaltyCandidate).length;
  const installedPenaltyRows = rows.filter((row) => row.installedPenaltyExpected).length;
  const validSweepLeadRowsPenalized = rows.filter((row) => row.validSweepLead && row.installedPenaltyExpected).length;
  const driftRows = rows.filter((row) => !row.entryPreserved || !row.stopPreserved || !row.target1Preserved || !row.target2Preserved || !row.riskPreserved).length;
  const overlay = args.freshScannerOverlayDryRunReport;
  const overlayMatchesExpectedRows = Boolean(
    BLANK_SLATE_MODE ||
    (overlay &&
      overlay.status === 'pass' &&
      overlay.summary.validSweepLeadRows === validSweepLeadRows &&
      overlay.summary.invalidStopSweepPenaltyRows === invalidStopSweepPenaltyRows &&
      overlay.summary.overlayPenaltyRows === installedPenaltyRows &&
      overlay.summary.validSweepLeadRowsPenalized === validSweepLeadRowsPenalized)
  );
  const blockers = [
    !args.sourceProofTimingPath ? 'missing source/proof timing path' : null,
    !args.sourceProofTimingReport ? 'missing source/proof timing report' : null,
    args.sourceProofTimingReport && args.sourceProofTimingReport.status !== 'pass' ? `source/proof timing status ${args.sourceProofTimingReport.status}` : null,
    !args.intakeTriagePath ? 'missing intake triage path' : null,
    !args.intakeTriageReport ? 'missing intake triage report' : null,
    !args.freshScannerOverlayDryRunPath ? 'missing fresh scanner overlay dry-run path' : null,
    !overlay ? 'missing fresh scanner overlay dry-run report' : null,
    overlay && overlay.status !== 'pass' ? `fresh scanner overlay dry-run status ${overlay.status}` : null,
    rows.length === 0 ? 'no installed-score comparison rows' : null,
    validSweepLeadRowsPenalized !== 0 ? 'valid Sweep lead rows would be penalized' : null,
    !BLANK_SLATE_MODE && invalidStopSweepPenaltyRows === 0 ? 'no invalid-stop Sweep rows found' : null,
    !BLANK_SLATE_MODE && installedPenaltyRows !== invalidStopSweepPenaltyRows ? 'installed penalty row count does not match invalid-stop Sweep rows' : null,
    !overlayMatchesExpectedRows ? 'installed score row counts do not match research overlay proof' : null,
    rows.some((row) => row.canExecute !== false) ? 'candidate-book comparison changed canExecute away from false' : null,
    driftRows !== 0 ? 'candidate-book comparison changed entry/stop/target/risk values' : null,
  ].filter((item): item is string => Boolean(item));
  const recommendation = BLANK_SLATE_MODE
    ? 'blank_slate_no_installed_penalty_path'
    : blockers.length ? 'reject_installed_score_path' : 'installed_score_path_matches_research_overlay';
  const base: Omit<UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_sweep_penalty_installed_score_comparison',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      sourceProofTimingPath: args.sourceProofTimingPath,
      intakeTriagePath: args.intakeTriagePath,
      freshScannerOverlayDryRunPath: args.freshScannerOverlayDryRunPath,
    },
    summary: {
      sourceRows: timingRows.length,
      joinedRows: rows.length,
      candidateBookRows: rows.length,
      sweepRows: rows.filter((row) => row.setupType === SWEEP_SETUP).length,
      validSweepLeadRows,
      invalidStopSweepPenaltyRows,
      installedPenaltyRows,
      validSweepLeadRowsPenalized,
      canExecuteTrueRows: rows.filter((row) => row.canExecute === true).length,
      entryStopTargetRiskDriftRows: driftRows,
      overlayTopSelectionDeltaOneMesPl: overlay?.summary.topSelectionDeltaOneMesPl ?? null,
      overlayMatchesExpectedRows,
      recommendation,
      livePromotionAllowedRows: 0,
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not expand the installed rank penalty until blockers are cleared.']
      : [
        'Installed candidate-book score path matches the research overlay row counts.',
        'Next proof may compare scanner-selected artifacts after this installed candidate-book score change; keep tradeDecisionPipeline untouched unless a separate proposal proves it is needed.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport(
  report: UnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-sweep-penalty-installed-score-comparison-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const sourceProofTimingPath = readFlag(args, '--source-proof-timing') || latestMatchingFile(outDir, /^unified-positive-held-local-preview-replay-package-source-proof-timing-\d+\.json$/);
  const intakeTriagePath = readFlag(args, '--intake-triage') || latestMatchingFile(outDir, /^unified-positive-held-local-preview-intake-triage-\d+\.json$/);
  const freshScannerOverlayDryRunPath = readFlag(args, '--fresh-scanner-overlay-dry-run') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-sweep-penalty-fresh-scanner-overlay-dry-run-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport({
    reportDir: outDir,
    sourceProofTimingPath,
    sourceProofTimingReport: sourceProofTimingPath && fs.existsSync(sourceProofTimingPath)
      ? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport>(sourceProofTimingPath)
      : null,
    intakeTriagePath,
    intakeTriageReport: intakeTriagePath && fs.existsSync(intakeTriagePath)
      ? readJson<UnifiedPositiveHeldLocalPreviewIntakeTriageReport>(intakeTriagePath)
      : null,
    freshScannerOverlayDryRunPath,
    freshScannerOverlayDryRunReport: freshScannerOverlayDryRunPath && fs.existsSync(freshScannerOverlayDryRunPath)
      ? readJson<UnifiedPositiveHeldLocalPreviewSweepPenaltyFreshScannerOverlayDryRunReport>(freshScannerOverlayDryRunPath)
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewSweepPenaltyInstalledScoreComparisonCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
