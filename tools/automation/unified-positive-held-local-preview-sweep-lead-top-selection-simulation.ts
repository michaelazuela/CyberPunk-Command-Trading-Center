import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewIntakeTriageReport } from './unified-positive-held-local-preview-intake-triage';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport,
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow,
} from './unified-positive-held-local-preview-replay-package-source-proof-timing';

type TimingRow = UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow;
type IntakeRow = UnifiedPositiveHeldLocalPreviewIntakeTriageReport['rows'][number];
type Recommendation = 'reject_lead_for_now' | 'keep_research_only' | 'candidate_for_fresh_replay_validation';

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
  sweepLeadMatch: boolean;
}

interface SimulationRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  outcomeBucket: TimingRow['outcomeBucket'];
  resolvedOneMesPl: number | null;
  baselineScore: number;
  simulatedScore: number;
  baselineRank: number;
  simulatedRank: number;
  sweepLeadMatch: boolean;
  sweepLeadPenaltyApplied: boolean;
  scannerVisibleEligible: false;
}

interface SlateSummary {
  slateId: string;
  tradeDate: string;
  session: string;
  rows: number;
  baselineTopTicketId: string | null;
  baselineTopSetupType: string | null;
  baselineTopOneMesPl: number | null;
  simulatedTopTicketId: string | null;
  simulatedTopSetupType: string | null;
  simulatedTopOneMesPl: number | null;
  topChanged: boolean;
  deltaOneMesPl: number | null;
}

export interface UnifiedPositiveHeldLocalPreviewSweepLeadTopSelectionSimulationReport {
  reportType: 'unified_positive_held_local_preview_sweep_lead_top_selection_simulation';
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
  };
  assumptions: {
    simulationOnly: true;
    usesOutcomeForEvaluationNotScoring: true;
    sweepLeadIsExecutionStatusConditionalAndEntryTriggerPending: true;
    nonMatchingSweepRowsArePenalizedNotRemoved: true;
    noLiveFilterInstalled: true;
    noRankBoostInstalled: true;
    noCanExecuteChange: true;
    livePromotionAllowed: false;
  };
  scoring: {
    nonMatchingSweepPenaltyPoints: number;
    baselineDoesNotUseOutcome: true;
  };
  summary: {
    sourceRows: number;
    joinedRows: number;
    sweepRows: number;
    sweepLeadRows: number;
    nonMatchingSweepRows: number;
    slates: number;
    changedSlates: number;
    baselineTopOneMesPl: number | null;
    simulatedTopOneMesPl: number | null;
    topSelectionDeltaOneMesPl: number | null;
    recommendation: Recommendation;
    livePromotionAllowedRows: 0;
  };
  slates: SlateSummary[];
  rows: SimulationRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const SWEEP_SETUP = 'NoInstalledSetup';
const SWEEP_LEAD_EXECUTION_STATUS = 'Conditional';
const SWEEP_LEAD_BLOCK_REASON = 'EntryTriggerPending';
const NON_MATCHING_SWEEP_PENALTY_POINTS = 18;

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

function authority(): UnifiedPositiveHeldLocalPreviewSweepLeadTopSelectionSimulationReport['authority'] {
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

function sweepLeadMatch(row: { setupType: string; executionStatus: string; blockReason: string }): boolean {
  return row.setupType === SWEEP_SETUP &&
    row.executionStatus === SWEEP_LEAD_EXECUTION_STATUS &&
    row.blockReason === SWEEP_LEAD_BLOCK_REASON;
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
      sweepLeadMatch: false,
    };
    return { ...joined, sweepLeadMatch: sweepLeadMatch(joined) };
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

function simulatedScore(row: JoinedRow): number {
  const penalty = row.setupType === SWEEP_SETUP && !row.sweepLeadMatch ? NON_MATCHING_SWEEP_PENALTY_POINTS : 0;
  return round(baselineScore(row) - penalty);
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

function buildSimulation(rows: JoinedRow[]): { rows: SimulationRow[]; slates: SlateSummary[] } {
  const simulationRows: SimulationRow[] = [];
  const slates: SlateSummary[] = [];
  for (const [slateId, slateRows] of groupBySlate(rows)) {
    const baseline = slateRows.map((row) => ({ row, score: baselineScore(row) })).sort(compareRows);
    const simulated = slateRows.map((row) => ({ row, score: simulatedScore(row) })).sort(compareRows);
    const baselineRanks = new Map(baseline.map((item, index) => [item.row.ticketId, index + 1]));
    const simulatedRanks = new Map(simulated.map((item, index) => [item.row.ticketId, index + 1]));
    const baselineTop = baseline[0]?.row || null;
    const simulatedTop = simulated[0]?.row || null;
    for (const row of slateRows) {
      simulationRows.push({
        ticketId: row.ticketId,
        tradeDate: row.tradeDate,
        session: row.session,
        setupType: row.setupType,
        direction: row.direction,
        outcomeBucket: row.outcomeBucket,
        resolvedOneMesPl: row.resolvedOneMesPl,
        baselineScore: baselineScore(row),
        simulatedScore: simulatedScore(row),
        baselineRank: baselineRanks.get(row.ticketId) ?? 0,
        simulatedRank: simulatedRanks.get(row.ticketId) ?? 0,
        sweepLeadMatch: row.sweepLeadMatch,
        sweepLeadPenaltyApplied: row.setupType === SWEEP_SETUP && !row.sweepLeadMatch,
        scannerVisibleEligible: false,
      });
    }
    const baselinePl = baselineTop?.resolvedOneMesPl ?? null;
    const simulatedPl = simulatedTop?.resolvedOneMesPl ?? null;
    slates.push({
      slateId,
      tradeDate: slateRows[0]?.tradeDate || 'unknown',
      session: slateRows[0]?.session || 'unknown',
      rows: slateRows.length,
      baselineTopTicketId: baselineTop?.ticketId || null,
      baselineTopSetupType: baselineTop?.setupType || null,
      baselineTopOneMesPl: baselinePl,
      simulatedTopTicketId: simulatedTop?.ticketId || null,
      simulatedTopSetupType: simulatedTop?.setupType || null,
      simulatedTopOneMesPl: simulatedPl,
      topChanged: baselineTop?.ticketId !== simulatedTop?.ticketId,
      deltaOneMesPl: baselinePl === null || simulatedPl === null ? null : round(simulatedPl - baselinePl),
    });
  }
  return {
    rows: simulationRows.sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.session.localeCompare(b.session) || a.simulatedRank - b.simulatedRank),
    slates: slates.sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.session.localeCompare(b.session)),
  };
}

function recommendation(delta: number | null, changedSlates: number, sweepLeadRows: number): Recommendation {
  if (sweepLeadRows === 0) return 'reject_lead_for_now';
  if ((delta ?? 0) > 0 && changedSlates > 0) return 'candidate_for_fresh_replay_validation';
  if ((delta ?? 0) === 0) return 'keep_research_only';
  return 'reject_lead_for_now';
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewSweepLeadTopSelectionSimulationReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Sweep Lead Top-Selection Simulation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only Sweep lead top-selection simulation. It does not install filters or boosts, post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Source rows: ${report.summary.sourceRows}.`,
    `- Joined rows: ${report.summary.joinedRows}.`,
    `- Sweep rows: ${report.summary.sweepRows}.`,
    `- Sweep lead rows: ${report.summary.sweepLeadRows}.`,
    `- Nonmatching Sweep rows: ${report.summary.nonMatchingSweepRows}.`,
    `- Slates: ${report.summary.slates}.`,
    `- Changed slates: ${report.summary.changedSlates}.`,
    `- Top selection P/L baseline/simulated: ${report.summary.baselineTopOneMesPl ?? '-'} / ${report.summary.simulatedTopOneMesPl ?? '-'}.`,
    `- Top selection delta: ${report.summary.topSelectionDeltaOneMesPl ?? '-'}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Changed Slates',
    '| Slate | Rows | Baseline Top | Baseline Model | Baseline P/L | Simulated Top | Simulated Model | Simulated P/L | Delta |',
    '|---|---:|---|---|---:|---|---|---:|---:|',
    ...report.slates.filter((row) => row.topChanged).map((row) => `| ${escapeTable(row.slateId)} | ${row.rows} | ${escapeTable(row.baselineTopTicketId ?? '-')} | ${escapeTable(row.baselineTopSetupType ?? '-')} | ${row.baselineTopOneMesPl ?? '-'} | ${escapeTable(row.simulatedTopTicketId ?? '-')} | ${escapeTable(row.simulatedTopSetupType ?? '-')} | ${row.simulatedTopOneMesPl ?? '-'} | ${row.deltaOneMesPl ?? '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewSweepLeadTopSelectionSimulationReport(args: {
  reportDir: string;
  sourceProofTimingPath: string | null;
  sourceProofTimingReport: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport | null;
  intakeTriagePath: string | null;
  intakeTriageReport: UnifiedPositiveHeldLocalPreviewIntakeTriageReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewSweepLeadTopSelectionSimulationReport {
  const timingRows = args.sourceProofTimingReport?.rows || [];
  const intakeRows = args.intakeTriageReport?.rows || [];
  const joinedRows = joinRows(timingRows, intakeRows);
  const simulation = buildSimulation(joinedRows);
  const baselineTopOneMesPl = sum(simulation.slates.map((row) => row.baselineTopOneMesPl));
  const simulatedTopOneMesPl = sum(simulation.slates.map((row) => row.simulatedTopOneMesPl));
  const delta = baselineTopOneMesPl === null || simulatedTopOneMesPl === null ? null : round(simulatedTopOneMesPl - baselineTopOneMesPl);
  const blockers = [
    !args.sourceProofTimingPath ? 'missing source/proof timing path' : null,
    !args.sourceProofTimingReport ? 'missing source/proof timing report' : null,
    args.sourceProofTimingReport && args.sourceProofTimingReport.status !== 'pass' ? `source/proof timing status ${args.sourceProofTimingReport.status}` : null,
    !args.intakeTriagePath ? 'missing intake triage path' : null,
    !args.intakeTriageReport ? 'missing intake triage report' : null,
    timingRows.length === 0 ? 'no source/proof timing rows found' : null,
    joinedRows.length === 0 ? 'no joined rows found' : null,
    joinedRows.some((row) => !row.intakeFound) ? 'one or more rows did not join to intake triage' : null,
  ].filter((item): item is string => Boolean(item));
  const rec = blockers.length
    ? 'reject_lead_for_now'
    : recommendation(delta, simulation.slates.filter((row) => row.topChanged).length, joinedRows.filter((row) => row.sweepLeadMatch).length);
  const base: Omit<UnifiedPositiveHeldLocalPreviewSweepLeadTopSelectionSimulationReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_sweep_lead_top_selection_simulation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      sourceProofTimingPath: args.sourceProofTimingPath,
      intakeTriagePath: args.intakeTriagePath,
    },
    assumptions: {
      simulationOnly: true,
      usesOutcomeForEvaluationNotScoring: true,
      sweepLeadIsExecutionStatusConditionalAndEntryTriggerPending: true,
      nonMatchingSweepRowsArePenalizedNotRemoved: true,
      noLiveFilterInstalled: true,
      noRankBoostInstalled: true,
      noCanExecuteChange: true,
      livePromotionAllowed: false,
    },
    scoring: {
      nonMatchingSweepPenaltyPoints: NON_MATCHING_SWEEP_PENALTY_POINTS,
      baselineDoesNotUseOutcome: true,
    },
    summary: {
      sourceRows: timingRows.length,
      joinedRows: joinedRows.length,
      sweepRows: joinedRows.filter((row) => row.setupType === SWEEP_SETUP).length,
      sweepLeadRows: joinedRows.filter((row) => row.sweepLeadMatch).length,
      nonMatchingSweepRows: joinedRows.filter((row) => row.setupType === SWEEP_SETUP && !row.sweepLeadMatch).length,
      slates: simulation.slates.length,
      changedSlates: simulation.slates.filter((row) => row.topChanged).length,
      baselineTopOneMesPl,
      simulatedTopOneMesPl,
      topSelectionDeltaOneMesPl: delta,
      recommendation: rec,
      livePromotionAllowedRows: 0,
    },
    slates: simulation.slates,
    rows: simulation.rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not use Sweep lead top-selection simulation until source/proof timing and intake triage join cleanly.']
      : rec === 'candidate_for_fresh_replay_validation'
        ? [
          'Keep the Conditional/EntryTriggerPending Sweep lead in research and validate on a fresh replay package before any scanner-visible filter or rank change.',
          'Do not change live ranking, canExecute, Discord, Supabase, bridge, entry, stop, target, risk, or model availability from this diagnostic.',
        ]
        : rec === 'keep_research_only'
          ? [
            'Keep the Conditional/EntryTriggerPending Sweep lead in research only; top-selection impact was neutral in this package.',
            'Mine additional no-lookahead structural fields before any scanner-visible change.',
          ]
          : [
            'Reject this Sweep lead as a live-facing filter for now because same-session top selection did not improve.',
            'Continue mining richer no-lookahead structural fields before changing live ranking or candidate publication.',
          ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewSweepLeadTopSelectionSimulationReport(
  report: UnifiedPositiveHeldLocalPreviewSweepLeadTopSelectionSimulationReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-sweep-lead-top-selection-simulation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewSweepLeadTopSelectionSimulationCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const sourceProofTimingPath = readFlag(args, '--source-proof-timing') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-replay-package-source-proof-timing-\d+\.json$/);
  const intakeTriagePath = readFlag(args, '--intake-triage') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-intake-triage-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewSweepLeadTopSelectionSimulationReport({
    reportDir: outDir,
    sourceProofTimingPath,
    sourceProofTimingReport: sourceProofTimingPath && fs.existsSync(sourceProofTimingPath)
      ? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport>(sourceProofTimingPath)
      : null,
    intakeTriagePath,
    intakeTriageReport: intakeTriagePath && fs.existsSync(intakeTriagePath)
      ? readJson<UnifiedPositiveHeldLocalPreviewIntakeTriageReport>(intakeTriagePath)
      : null,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewSweepLeadTopSelectionSimulationReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewSweepLeadTopSelectionSimulationCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
