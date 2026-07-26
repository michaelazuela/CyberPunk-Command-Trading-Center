import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewIntakeTriageReport } from './unified-positive-held-local-preview-intake-triage';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport,
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow,
} from './unified-positive-held-local-preview-replay-package-source-proof-timing';
import type {
  UnifiedPositiveHeldLocalPreviewSweepNonmatchingPenaltyValidationReport,
} from './unified-positive-held-local-preview-sweep-nonmatching-penalty-validation';

type TimingRow = UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow;
type IntakeRow = UnifiedPositiveHeldLocalPreviewIntakeTriageReport['rows'][number];

interface JoinedRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  outcomeBucket: TimingRow['outcomeBucket'];
  resolvedOneMesPl: number | null;
  riskPoints: number;
  proofToEntryMinutes: number | null;
  entryHitTime: string | null;
  modelPriority: number | null;
  proofPriority: number | null;
  executionStatus: string;
  blockReason: string;
  intakeFound: boolean;
  validSweepLead: boolean;
  invalidStopSweepPenaltyCandidate: boolean;
}

interface GuardedRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  outcomeBucket: TimingRow['outcomeBucket'];
  resolvedOneMesPl: number | null;
  baselineScore: number;
  guardedScore: number;
  baselineRank: number;
  guardedRank: number;
  validSweepLead: boolean;
  invalidStopSweepPenaltyCandidate: boolean;
  penaltyApplied: boolean;
  scannerVisibleEligible: false;
}

interface GuardedSlate {
  slateId: string;
  tradeDate: string;
  session: string;
  rows: number;
  baselineTopTicketId: string | null;
  baselineTopSetupType: string | null;
  baselineTopOneMesPl: number | null;
  guardedTopTicketId: string | null;
  guardedTopSetupType: string | null;
  guardedTopOneMesPl: number | null;
  topChanged: boolean;
  deltaOneMesPl: number | null;
  changedFromInvalidStopSweep: boolean;
  changedToValidSweepOrAlternate: boolean;
}

export interface UnifiedPositiveHeldLocalPreviewSweepPenaltyGuardedReplayReport {
  reportType: 'unified_positive_held_local_preview_sweep_penalty_guarded_replay';
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
    penaltyValidationPath: string | null;
  };
  assumptions: {
    dryRunOnly: true;
    usesOutcomeForEvaluationNotScoring: true;
    invalidStopSweepPenaltyOnly: true;
    validSweepLeadRowsProtected: true;
    strongerAlternateTicketsProtected: true;
    noLiveFilterInstalled: true;
    noRankPenaltyInstalled: true;
    noCanExecuteChange: true;
    livePromotionAllowed: false;
  };
  scoring: {
    invalidStopSweepPenaltyPoints: number;
    baselineDoesNotUseOutcome: true;
  };
  summary: {
    sourceRows: number;
    joinedRows: number;
    sweepRows: number;
    validSweepLeadRows: number;
    invalidStopSweepPenaltyRows: number;
    validSweepLeadRowsPenalized: number;
    slates: number;
    changedSlates: number;
    changedFromInvalidStopSweepSlates: number;
    changedToValidSweepOrAlternateSlates: number;
    baselineTopOneMesPl: number | null;
    guardedTopOneMesPl: number | null;
    topSelectionDeltaOneMesPl: number | null;
    recommendedAction: 'research_penalty_ready_for_fresh_scanner_dry_run' | 'keep_research_only' | 'reject_penalty_for_now';
    livePromotionAllowedRows: 0;
  };
  slates: GuardedSlate[];
  rows: GuardedRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const SWEEP_SETUP = 'NoInstalledSetup';
const PENALTY_POINTS = 18;

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

function authority(): UnifiedPositiveHeldLocalPreviewSweepPenaltyGuardedReplayReport['authority'] {
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

function numberOrNull(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function validSweepLead(row: { setupType: string; executionStatus: string; blockReason: string }): boolean {
  return row.setupType === SWEEP_SETUP && row.executionStatus === 'Conditional' && row.blockReason === 'EntryTriggerPending';
}

function invalidStopSweepPenaltyCandidate(row: { setupType: string; executionStatus: string; blockReason: string }): boolean {
  return row.setupType === SWEEP_SETUP && row.executionStatus === 'Blocked' && row.blockReason === 'InvalidStopLocation';
}

function joinRows(timingRows: TimingRow[], intakeRows: IntakeRow[]): JoinedRow[] {
  const intakeById = new Map<string, IntakeRow>(intakeRows.map((row) => [row.intakeId, row]));
  return timingRows.map((row) => {
    const intake = intakeById.get(row.ticketId);
    const joined = {
      ticketId: row.ticketId,
      tradeDate: row.tradeDate,
      session: row.session,
      setupType: row.setupType,
      direction: row.direction,
      outcomeBucket: row.outcomeBucket,
      resolvedOneMesPl: row.resolvedOneMesPl,
      riskPoints: row.riskPoints,
      proofToEntryMinutes: row.proofToEntryMinutes,
      entryHitTime: row.entryHitTime,
      modelPriority: numberOrNull(intake?.modelPriority),
      proofPriority: numberOrNull(intake?.proofPriority),
      executionStatus: stringValue(intake?.executionStatus, 'execution_unknown'),
      blockReason: stringValue(intake?.blockReason, 'block_none'),
      intakeFound: Boolean(intake),
      validSweepLead: false,
      invalidStopSweepPenaltyCandidate: false,
    };
    return {
      ...joined,
      validSweepLead: validSweepLead(joined),
      invalidStopSweepPenaltyCandidate: invalidStopSweepPenaltyCandidate(joined),
    };
  });
}

function baselineScore(row: JoinedRow): number {
  const model = row.modelPriority ?? 50;
  const proof = row.proofPriority ?? 45;
  const risk = row.riskPoints <= 8 ? 10 : row.riskPoints <= 12 ? 6 : row.riskPoints <= 16 ? 2 : 0;
  const fill = row.entryHitTime ? 3 : 0;
  const timing = row.proofToEntryMinutes === null ? 0 : row.proofToEntryMinutes <= 15 ? 4 : row.proofToEntryMinutes <= 30 ? 1 : -3;
  return round(model + (proof * 0.45) + risk + fill + timing);
}

function guardedScore(row: JoinedRow): number {
  return round(baselineScore(row) - (row.invalidStopSweepPenaltyCandidate ? PENALTY_POINTS : 0));
}

function compareRows(a: { row: JoinedRow; score: number }, b: { row: JoinedRow; score: number }): number {
  return b.score - a.score || a.row.tradeDate.localeCompare(b.row.tradeDate) || a.row.ticketId.localeCompare(b.row.ticketId);
}

function groupBySlate(rows: JoinedRow[]): Map<string, JoinedRow[]> {
  const groups = new Map<string, JoinedRow[]>();
  for (const row of rows) {
    const key = `${row.tradeDate}|${row.session}`;
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  return groups;
}

function buildSimulation(rows: JoinedRow[]): { rows: GuardedRow[]; slates: GuardedSlate[] } {
  const reportRows: GuardedRow[] = [];
  const slates: GuardedSlate[] = [];
  for (const [slateId, slateRows] of groupBySlate(rows)) {
    const baseline = slateRows.map((row) => ({ row, score: baselineScore(row) })).sort(compareRows);
    const guarded = slateRows.map((row) => ({ row, score: guardedScore(row) })).sort(compareRows);
    const baselineRanks = new Map(baseline.map((item, index) => [item.row.ticketId, index + 1]));
    const guardedRanks = new Map(guarded.map((item, index) => [item.row.ticketId, index + 1]));
    const baselineTop = baseline[0]?.row || null;
    const guardedTop = guarded[0]?.row || null;
    for (const row of slateRows) {
      reportRows.push({
        ticketId: row.ticketId,
        tradeDate: row.tradeDate,
        session: row.session,
        setupType: row.setupType,
        direction: row.direction,
        outcomeBucket: row.outcomeBucket,
        resolvedOneMesPl: row.resolvedOneMesPl,
        baselineScore: baselineScore(row),
        guardedScore: guardedScore(row),
        baselineRank: baselineRanks.get(row.ticketId) ?? 0,
        guardedRank: guardedRanks.get(row.ticketId) ?? 0,
        validSweepLead: row.validSweepLead,
        invalidStopSweepPenaltyCandidate: row.invalidStopSweepPenaltyCandidate,
        penaltyApplied: row.invalidStopSweepPenaltyCandidate,
        scannerVisibleEligible: false,
      });
    }
    const baselinePl = baselineTop?.resolvedOneMesPl ?? null;
    const guardedPl = guardedTop?.resolvedOneMesPl ?? null;
    slates.push({
      slateId,
      tradeDate: slateRows[0]?.tradeDate || 'unknown',
      session: slateRows[0]?.session || 'unknown',
      rows: slateRows.length,
      baselineTopTicketId: baselineTop?.ticketId || null,
      baselineTopSetupType: baselineTop?.setupType || null,
      baselineTopOneMesPl: baselinePl,
      guardedTopTicketId: guardedTop?.ticketId || null,
      guardedTopSetupType: guardedTop?.setupType || null,
      guardedTopOneMesPl: guardedPl,
      topChanged: baselineTop?.ticketId !== guardedTop?.ticketId,
      deltaOneMesPl: baselinePl === null || guardedPl === null ? null : round(guardedPl - baselinePl),
      changedFromInvalidStopSweep: Boolean(baselineTop?.invalidStopSweepPenaltyCandidate && baselineTop?.ticketId !== guardedTop?.ticketId),
      changedToValidSweepOrAlternate: Boolean(guardedTop && (guardedTop.validSweepLead || guardedTop.setupType !== SWEEP_SETUP)),
    });
  }
  return {
    rows: reportRows.sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.session.localeCompare(b.session) || a.guardedRank - b.guardedRank),
    slates: slates.sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.session.localeCompare(b.session)),
  };
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewSweepPenaltyGuardedReplayReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Sweep Penalty Guarded Replay',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only guarded replay. It does not install penalties or filters, post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Source rows: ${report.summary.sourceRows}.`,
    `- Valid Sweep lead rows: ${report.summary.validSweepLeadRows}.`,
    `- Invalid-stop Sweep penalty rows: ${report.summary.invalidStopSweepPenaltyRows}.`,
    `- Valid Sweep lead rows penalized: ${report.summary.validSweepLeadRowsPenalized}.`,
    `- Changed slates: ${report.summary.changedSlates}.`,
    `- Top selection P/L baseline/guarded: ${report.summary.baselineTopOneMesPl ?? '-'} / ${report.summary.guardedTopOneMesPl ?? '-'}.`,
    `- Top selection delta: ${report.summary.topSelectionDeltaOneMesPl ?? '-'}.`,
    `- Recommended action: ${report.summary.recommendedAction}.`,
    '',
    '## Changed Slates',
    '| Slate | Baseline Top | Baseline Model | Baseline P/L | Guarded Top | Guarded Model | Guarded P/L | Delta | From Invalid-Stop Sweep | To Lead/Alternate |',
    '|---|---|---|---:|---|---|---:|---:|---|---|',
    ...report.slates.filter((row) => row.topChanged).map((row) => `| ${escapeTable(row.slateId)} | ${escapeTable(row.baselineTopTicketId ?? '-')} | ${escapeTable(row.baselineTopSetupType ?? '-')} | ${row.baselineTopOneMesPl ?? '-'} | ${escapeTable(row.guardedTopTicketId ?? '-')} | ${escapeTable(row.guardedTopSetupType ?? '-')} | ${row.guardedTopOneMesPl ?? '-'} | ${row.deltaOneMesPl ?? '-'} | ${row.changedFromInvalidStopSweep} | ${row.changedToValidSweepOrAlternate} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewSweepPenaltyGuardedReplayReport(args: {
  reportDir: string;
  sourceProofTimingPath: string | null;
  sourceProofTimingReport: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport | null;
  intakeTriagePath: string | null;
  intakeTriageReport: UnifiedPositiveHeldLocalPreviewIntakeTriageReport | null;
  penaltyValidationPath: string | null;
  penaltyValidationReport: UnifiedPositiveHeldLocalPreviewSweepNonmatchingPenaltyValidationReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewSweepPenaltyGuardedReplayReport {
  const timingRows = args.sourceProofTimingReport?.rows || [];
  const intakeRows = args.intakeTriageReport?.rows || [];
  const joinedRows = joinRows(timingRows, intakeRows);
  const simulation = buildSimulation(joinedRows);
  const validLeadPenalized = simulation.rows.filter((row) => row.validSweepLead && row.penaltyApplied).length;
  const changed = simulation.slates.filter((row) => row.topChanged);
  const baselineTopOneMesPl = sum(simulation.slates.map((row) => row.baselineTopOneMesPl));
  const guardedTopOneMesPl = sum(simulation.slates.map((row) => row.guardedTopOneMesPl));
  const delta = baselineTopOneMesPl === null || guardedTopOneMesPl === null ? null : round(guardedTopOneMesPl - baselineTopOneMesPl);
  const blockers = [
    !args.sourceProofTimingPath ? 'missing source/proof timing path' : null,
    !args.sourceProofTimingReport ? 'missing source/proof timing report' : null,
    args.sourceProofTimingReport && args.sourceProofTimingReport.status !== 'pass' ? `source/proof timing status ${args.sourceProofTimingReport.status}` : null,
    !args.intakeTriagePath ? 'missing intake triage path' : null,
    !args.intakeTriageReport ? 'missing intake triage report' : null,
    !args.penaltyValidationPath ? 'missing penalty validation path' : null,
    !args.penaltyValidationReport ? 'missing penalty validation report' : null,
    args.penaltyValidationReport && args.penaltyValidationReport.status !== 'pass' ? `penalty validation status ${args.penaltyValidationReport.status}` : null,
    args.penaltyValidationReport && args.penaltyValidationReport.summary.recommendedAction !== 'validate_invalid_stop_penalty_research_only' ? `penalty validation action ${args.penaltyValidationReport.summary.recommendedAction}` : null,
    timingRows.length === 0 ? 'no source/proof timing rows found' : null,
    joinedRows.some((row) => !row.intakeFound) ? 'one or more rows did not join to intake triage' : null,
    validLeadPenalized > 0 ? 'valid Conditional/EntryTriggerPending Sweep lead row was penalized' : null,
    changed.some((row) => !row.changedFromInvalidStopSweep) ? 'one or more changed slates did not start from an invalid-stop Sweep row' : null,
    changed.some((row) => !row.changedToValidSweepOrAlternate) ? 'one or more changed slates did not land on a valid Sweep lead or alternate model' : null,
  ].filter((item): item is string => Boolean(item));
  const rec = blockers.length
    ? 'reject_penalty_for_now'
    : (delta ?? 0) >= 0 && changed.length > 0
      ? 'research_penalty_ready_for_fresh_scanner_dry_run'
      : 'keep_research_only';
  const base: Omit<UnifiedPositiveHeldLocalPreviewSweepPenaltyGuardedReplayReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_sweep_penalty_guarded_replay',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      sourceProofTimingPath: args.sourceProofTimingPath,
      intakeTriagePath: args.intakeTriagePath,
      penaltyValidationPath: args.penaltyValidationPath,
    },
    assumptions: {
      dryRunOnly: true,
      usesOutcomeForEvaluationNotScoring: true,
      invalidStopSweepPenaltyOnly: true,
      validSweepLeadRowsProtected: true,
      strongerAlternateTicketsProtected: true,
      noLiveFilterInstalled: true,
      noRankPenaltyInstalled: true,
      noCanExecuteChange: true,
      livePromotionAllowed: false,
    },
    scoring: {
      invalidStopSweepPenaltyPoints: PENALTY_POINTS,
      baselineDoesNotUseOutcome: true,
    },
    summary: {
      sourceRows: timingRows.length,
      joinedRows: joinedRows.length,
      sweepRows: joinedRows.filter((row) => row.setupType === SWEEP_SETUP).length,
      validSweepLeadRows: joinedRows.filter((row) => row.validSweepLead).length,
      invalidStopSweepPenaltyRows: joinedRows.filter((row) => row.invalidStopSweepPenaltyCandidate).length,
      validSweepLeadRowsPenalized: validLeadPenalized,
      slates: simulation.slates.length,
      changedSlates: changed.length,
      changedFromInvalidStopSweepSlates: changed.filter((row) => row.changedFromInvalidStopSweep).length,
      changedToValidSweepOrAlternateSlates: changed.filter((row) => row.changedToValidSweepOrAlternate).length,
      baselineTopOneMesPl,
      guardedTopOneMesPl,
      topSelectionDeltaOneMesPl: delta,
      recommendedAction: rec,
      livePromotionAllowedRows: 0,
    },
    slates: simulation.slates,
    rows: simulation.rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not use this guarded replay until all guard blockers are cleared.']
      : rec === 'research_penalty_ready_for_fresh_scanner_dry_run'
        ? [
          'Carry the invalid-stop Sweep penalty into a fresh research scanner dry-run only.',
          'Do not install live ranking, canExecute, Discord, Supabase, bridge, entry, stop, target, risk, or model-availability changes.',
        ]
        : ['Keep the invalid-stop Sweep penalty research-only until a fresh scanner dry-run adds stronger proof.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewSweepPenaltyGuardedReplayReport(
  report: UnifiedPositiveHeldLocalPreviewSweepPenaltyGuardedReplayReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-sweep-penalty-guarded-replay-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewSweepPenaltyGuardedReplayCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const sourceProofTimingPath = readFlag(args, '--source-proof-timing') || latestMatchingFile(outDir, /^unified-positive-held-local-preview-replay-package-source-proof-timing-\d+\.json$/);
  const intakeTriagePath = readFlag(args, '--intake-triage') || latestMatchingFile(outDir, /^unified-positive-held-local-preview-intake-triage-\d+\.json$/);
  const penaltyValidationPath = readFlag(args, '--penalty-validation') || latestMatchingFile(outDir, /^unified-positive-held-local-preview-sweep-nonmatching-penalty-validation-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewSweepPenaltyGuardedReplayReport({
    reportDir: outDir,
    sourceProofTimingPath,
    sourceProofTimingReport: sourceProofTimingPath && fs.existsSync(sourceProofTimingPath) ? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport>(sourceProofTimingPath) : null,
    intakeTriagePath,
    intakeTriageReport: intakeTriagePath && fs.existsSync(intakeTriagePath) ? readJson<UnifiedPositiveHeldLocalPreviewIntakeTriageReport>(intakeTriagePath) : null,
    penaltyValidationPath,
    penaltyValidationReport: penaltyValidationPath && fs.existsSync(penaltyValidationPath) ? readJson<UnifiedPositiveHeldLocalPreviewSweepNonmatchingPenaltyValidationReport>(penaltyValidationPath) : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewSweepPenaltyGuardedReplayReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewSweepPenaltyGuardedReplayCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
