import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  buildRawOhlcScannerArtifactSweepMorningLongPreentryFieldMinerReport,
  type JoinedRow,
} from './raw-ohlc-scanner-artifact-sweep-morning-long-preentry-field-miner';

interface SlateSummary {
  slateId: string;
  rows: number;
  baselineTopTicketId: string | null;
  baselineTopOutcomeLabel: string | null;
  baselineTopOneMesPl: number | null;
  simulatedTopTicketId: string | null;
  simulatedTopOutcomeLabel: string | null;
  simulatedTopOneMesPl: number | null;
  topChanged: boolean;
  deltaOneMesPl: number | null;
}

interface SimulationRow {
  ticketId: string;
  slateId: string;
  outcomeLabel: string;
  resolvedOneMesPl: number | null;
  rankScoreBucket: string;
  htfLineInSandStatus: string;
  hasNoChaseMissingEvidence: string;
  baselineScore: number;
  simulatedScore: number;
  blockedNoChasePenaltyApplied: boolean;
  cleanNoChaseBoostApplied: boolean;
}

export interface RawOhlcScannerArtifactSweepMorningLongNoChaseRankSimulationReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_morning_long_nochase_rank_simulation';
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
    replayPackagePath: string | null;
    outcomePath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    simulationOnly: true;
    usesOutcomeForEvaluationNotScoring: true;
    rankBucketProxyOnly: true;
    noRuntimeRankingChange: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  scoring: {
    blockedNoChasePenaltyPoints: number;
    cleanNoChaseBoostPoints: number;
  };
  summary: {
    joinedRows: number;
    slates: number;
    changedSlates: number;
    baselineTopOneMesPl: number | null;
    simulatedTopOneMesPl: number | null;
    topSelectionDeltaOneMesPl: number | null;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'prepare_guarded_live_proposal' | 'keep_research_only' | 'fix_inputs';
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
const BLOCKED_NO_CHASE_PENALTY_POINTS = 80;
const CLEAN_NO_CHASE_BOOST_POINTS = 20;

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function rankBucketScore(value: string): number {
  if (value === 'lt_150') return 125;
  if (value === '150_to_199') return 175;
  if (value === '200_to_249') return 225;
  if (value === 'gte_250') return 275;
  return 100;
}

function isBlockedNoChase(row: JoinedRow): boolean {
  return row.fields.htfLineInSandStatus === 'blocked' && row.fields.hasNoChaseMissingEvidence === 'true';
}

function isCleanNoChase(row: JoinedRow): boolean {
  return row.fields.htfLineInSandStatus === 'not_applicable' && row.fields.hasNoChaseMissingEvidence === 'false';
}

function baselineScore(row: JoinedRow): number {
  return rankBucketScore(row.fields.rankScoreBucket || 'missing');
}

function simulatedScore(row: JoinedRow): number {
  return baselineScore(row)
    - (isBlockedNoChase(row) ? BLOCKED_NO_CHASE_PENALTY_POINTS : 0)
    + (isCleanNoChase(row) ? CLEAN_NO_CHASE_BOOST_POINTS : 0);
}

function compare(a: { row: JoinedRow; score: number }, b: { row: JoinedRow; score: number }): number {
  return b.score - a.score || a.row.proofTime.localeCompare(b.row.proofTime) || a.row.ticketId.localeCompare(b.row.ticketId);
}

function groupBySlate(rows: JoinedRow[]): Map<string, JoinedRow[]> {
  const groups = new Map<string, JoinedRow[]>();
  for (const row of rows) {
    const slateId = `${row.tradeDate}|${row.session}`;
    groups.set(slateId, [...(groups.get(slateId) || []), row]);
  }
  return groups;
}

function authority(): RawOhlcScannerArtifactSweepMorningLongNoChaseRankSimulationReport['authority'] {
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

function buildSimulation(rows: JoinedRow[]): { rows: SimulationRow[]; slates: SlateSummary[] } {
  const simulationRows: SimulationRow[] = [];
  const slates: SlateSummary[] = [];
  for (const [slateId, slateRows] of groupBySlate(rows)) {
    const baseline = slateRows.map((row) => ({ row, score: baselineScore(row) })).sort(compare);
    const simulated = slateRows.map((row) => ({ row, score: simulatedScore(row) })).sort(compare);
    for (const row of slateRows) {
      simulationRows.push({
        ticketId: row.ticketId,
        slateId,
        outcomeLabel: row.outcomeLabel,
        resolvedOneMesPl: row.resolvedOneMesPl,
        rankScoreBucket: row.fields.rankScoreBucket || 'missing',
        htfLineInSandStatus: row.fields.htfLineInSandStatus || 'missing',
        hasNoChaseMissingEvidence: row.fields.hasNoChaseMissingEvidence || 'missing',
        baselineScore: baselineScore(row),
        simulatedScore: simulatedScore(row),
        blockedNoChasePenaltyApplied: isBlockedNoChase(row),
        cleanNoChaseBoostApplied: isCleanNoChase(row),
      });
    }
    const baselineTop = baseline[0]?.row || null;
    const simulatedTop = simulated[0]?.row || null;
    slates.push({
      slateId,
      rows: slateRows.length,
      baselineTopTicketId: baselineTop?.ticketId || null,
      baselineTopOutcomeLabel: baselineTop?.outcomeLabel || null,
      baselineTopOneMesPl: baselineTop?.resolvedOneMesPl ?? null,
      simulatedTopTicketId: simulatedTop?.ticketId || null,
      simulatedTopOutcomeLabel: simulatedTop?.outcomeLabel || null,
      simulatedTopOneMesPl: simulatedTop?.resolvedOneMesPl ?? null,
      topChanged: Boolean(baselineTop && simulatedTop && baselineTop.ticketId !== simulatedTop.ticketId),
      deltaOneMesPl: typeof baselineTop?.resolvedOneMesPl === 'number' && typeof simulatedTop?.resolvedOneMesPl === 'number'
        ? round(simulatedTop.resolvedOneMesPl - baselineTop.resolvedOneMesPl)
        : null,
    });
  }
  return { rows: simulationRows, slates: slates.sort((a, b) => a.slateId.localeCompare(b.slateId)) };
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepMorningLongNoChaseRankSimulationReport, 'markdown'>): string {
  return [
    '# Raw OHLC Scanner Artifact Sweep Morning LONG No-Chase Rank Simulation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only research simulation. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Joined rows: ${report.summary.joinedRows}.`,
    `- Slates: ${report.summary.slates}.`,
    `- Changed slates: ${report.summary.changedSlates}.`,
    `- Baseline/simulated top one-MES P/L: ${report.summary.baselineTopOneMesPl ?? '-'} / ${report.summary.simulatedTopOneMesPl ?? '-'}.`,
    `- Top-selection delta: ${report.summary.topSelectionDeltaOneMesPl ?? '-'}.`,
    `- Runtime rank consumer allowed by this report: ${report.summary.runtimeRankConsumerAllowedByThisReport}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Slates',
    ...report.slates.map((slate) => `- ${slate.slateId}: baseline ${slate.baselineTopOutcomeLabel || '-'} ${slate.baselineTopOneMesPl ?? '-'} -> simulated ${slate.simulatedTopOutcomeLabel || '-'} ${slate.simulatedTopOneMesPl ?? '-'}; delta ${slate.deltaOneMesPl ?? '-'}.`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepMorningLongNoChaseRankSimulationReport(args: {
  reportDir?: string;
  replayPackagePath?: string | null;
  outcomePath?: string | null;
  joinedRows?: JoinedRow[];
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepMorningLongNoChaseRankSimulationReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const preentry = args.joinedRows
    ? null
    : buildRawOhlcScannerArtifactSweepMorningLongPreentryFieldMinerReport({
      reportDir,
      replayPackagePath: args.replayPackagePath,
      outcomePath: args.outcomePath,
    }, generatedAt);
  const joinedRows = args.joinedRows || preentry?.joinedRows || [];
  const simulation = buildSimulation(joinedRows);
  const baselineTopOneMesPl = sum(simulation.slates.map((slate) => slate.baselineTopOneMesPl));
  const simulatedTopOneMesPl = sum(simulation.slates.map((slate) => slate.simulatedTopOneMesPl));
  const delta = typeof baselineTopOneMesPl === 'number' && typeof simulatedTopOneMesPl === 'number'
    ? round(simulatedTopOneMesPl - baselineTopOneMesPl)
    : null;
  const blockers = [
    preentry && preentry.status !== 'pass' ? `pre-entry miner status ${preentry.status}` : null,
    joinedRows.length === 0 ? 'no joined Sweep morning LONG rows available' : null,
    simulation.slates.length === 0 ? 'no day/session slates available' : null,
  ].filter((item): item is string => Boolean(item));
  const proposalReady = !blockers.length && typeof delta === 'number' && delta > 0 && simulation.slates.some((slate) => slate.topChanged);
  const base: Omit<RawOhlcScannerArtifactSweepMorningLongNoChaseRankSimulationReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_morning_long_nochase_rank_simulation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir,
      replayPackagePath: args.replayPackagePath || preentry?.source.replayPackagePath || null,
      outcomePath: args.outcomePath || preentry?.source.outcomePath || null,
    },
    assumptions: {
      savedReportsOnly: true,
      simulationOnly: true,
      usesOutcomeForEvaluationNotScoring: true,
      rankBucketProxyOnly: true,
      noRuntimeRankingChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    scoring: {
      blockedNoChasePenaltyPoints: BLOCKED_NO_CHASE_PENALTY_POINTS,
      cleanNoChaseBoostPoints: CLEAN_NO_CHASE_BOOST_POINTS,
    },
    summary: {
      joinedRows: joinedRows.length,
      slates: simulation.slates.length,
      changedSlates: simulation.slates.filter((slate) => slate.topChanged).length,
      baselineTopOneMesPl,
      simulatedTopOneMesPl,
      topSelectionDeltaOneMesPl: delta,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length
        ? 'fix_inputs'
        : proposalReady
          ? 'prepare_guarded_live_proposal'
          : 'keep_research_only',
    },
    slates: simulation.slates,
    rows: simulation.rows,
    blockers,
    recommendations: blockers.length
      ? ['Fix joined row inputs before rank simulation.']
      : proposalReady
        ? ['Prepare a guarded live proposal next, but do not install scanner-visible behavior from this simulation alone.']
        : ['Keep the no-chase split research-only; this simulation did not prove top-selection improvement.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildRawOhlcScannerArtifactSweepMorningLongNoChaseRankSimulationReport({
    reportDir,
    replayPackagePath: readFlag(args, '--replay-package') || undefined,
    outcomePath: readFlag(args, '--outcome') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `raw-ohlc-scanner-artifact-sweep-morning-long-nochase-rank-simulation-${Date.now()}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  if (args.includes('--json')) console.log(JSON.stringify({ outPath, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  else {
    console.log(report.markdown);
    console.log(`\nReport written: ${outPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
