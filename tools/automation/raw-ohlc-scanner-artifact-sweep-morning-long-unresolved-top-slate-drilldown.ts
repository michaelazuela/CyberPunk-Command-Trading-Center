import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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
}

interface SlateSummary {
  slateId: string;
  rows: number;
  baselineTopTicketId: string | null;
  baselineTopOutcomeLabel: string | null;
  baselineTopOneMesPl: number | null;
}

interface RankSimulationReport {
  status?: string;
  source?: {
    reportDir?: string;
    replayPackagePath?: string | null;
    outcomePath?: string | null;
  };
  rows?: SimulationRow[];
  slates?: SlateSummary[];
}

interface DrilldownRow {
  slateId: string;
  rows: number;
  baselineTopTicketId: string | null;
  baselineTopOutcomeLabel: string | null;
  unresolvedRows: number;
  resolvedWinnerRows: number;
  resolvedProblemRows: number;
  noFillRows: number;
  noTargetOrStopRows: number;
  stoppedRows: number;
  bestResolvedTicketId: string | null;
  bestResolvedOutcomeLabel: string | null;
  bestResolvedOneMesPl: number | null;
  replacementAvailable: boolean;
  failureClass: 'replacement_available' | 'all_unresolved_or_no_fill' | 'only_resolved_losses' | 'missing_rows';
}

export interface RawOhlcScannerArtifactSweepMorningLongUnresolvedTopSlateDrilldownReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_morning_long_unresolved_top_slate_drilldown';
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
    rankSimulationPath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    drilldownOnly: true;
    noRuntimeRankingChange: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: {
    slates: number;
    unresolvedTopSlates: number;
    replacementAvailableSlates: number;
    allUnresolvedOrNoFillSlates: number;
    onlyResolvedLossSlates: number;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'inspect_replacement_available_slates' | 'broaden_replay_horizon_or_outcome_source' | 'fix_inputs';
  };
  rows: DrilldownRow[];
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

function latestMatchingFile(reportDir: string, prefix: string): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => name.startsWith(prefix) && name.endsWith('.json'))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function isWinner(row: SimulationRow): boolean {
  return typeof row.resolvedOneMesPl === 'number' && row.resolvedOneMesPl > 0;
}

function isResolvedProblem(row: SimulationRow): boolean {
  return typeof row.resolvedOneMesPl === 'number' && row.resolvedOneMesPl <= 0;
}

function authority(): RawOhlcScannerArtifactSweepMorningLongUnresolvedTopSlateDrilldownReport['authority'] {
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

function failureClass(args: { rows: SimulationRow[]; bestResolved: SimulationRow | null }): DrilldownRow['failureClass'] {
  if (!args.rows.length) return 'missing_rows';
  if (args.bestResolved && (args.bestResolved.resolvedOneMesPl ?? 0) > 0) return 'replacement_available';
  if (args.bestResolved) return 'only_resolved_losses';
  return 'all_unresolved_or_no_fill';
}

function buildRows(report: RankSimulationReport | null): DrilldownRow[] {
  const rows = report?.rows || [];
  return (report?.slates || [])
    .filter((slate) => slate.baselineTopOneMesPl === null || slate.baselineTopOutcomeLabel === 'no_fill' || slate.baselineTopOutcomeLabel === 'no_target_or_stop_hit')
    .map((slate) => {
      const slateRows = rows.filter((row) => row.slateId === slate.slateId);
      const bestResolved = slateRows
        .filter((row) => typeof row.resolvedOneMesPl === 'number')
        .sort((a, b) => (b.resolvedOneMesPl || 0) - (a.resolvedOneMesPl || 0))[0] || null;
      const classification = failureClass({ rows: slateRows, bestResolved });
      return {
        slateId: slate.slateId,
        rows: slateRows.length,
        baselineTopTicketId: slate.baselineTopTicketId,
        baselineTopOutcomeLabel: slate.baselineTopOutcomeLabel,
        unresolvedRows: slateRows.filter((row) => row.resolvedOneMesPl === null).length,
        resolvedWinnerRows: slateRows.filter(isWinner).length,
        resolvedProblemRows: slateRows.filter(isResolvedProblem).length,
        noFillRows: slateRows.filter((row) => row.outcomeLabel === 'no_fill').length,
        noTargetOrStopRows: slateRows.filter((row) => row.outcomeLabel === 'no_target_or_stop_hit').length,
        stoppedRows: slateRows.filter((row) => row.outcomeLabel === 'stopped_before_t1').length,
        bestResolvedTicketId: bestResolved?.ticketId || null,
        bestResolvedOutcomeLabel: bestResolved?.outcomeLabel || null,
        bestResolvedOneMesPl: bestResolved?.resolvedOneMesPl ?? null,
        replacementAvailable: classification === 'replacement_available',
        failureClass: classification,
      };
    });
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepMorningLongUnresolvedTopSlateDrilldownReport, 'markdown'>): string {
  return [
    '# Raw OHLC Scanner Artifact Sweep Morning LONG Unresolved Top-Slate Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-report drilldown. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Slates: ${report.summary.slates}.`,
    `- Unresolved top slates: ${report.summary.unresolvedTopSlates}.`,
    `- Replacement available slates: ${report.summary.replacementAvailableSlates}.`,
    `- All unresolved/no-fill slates: ${report.summary.allUnresolvedOrNoFillSlates}.`,
    `- Only resolved-loss slates: ${report.summary.onlyResolvedLossSlates}.`,
    `- Runtime rank consumer allowed by this report: ${report.summary.runtimeRankConsumerAllowedByThisReport}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Rows',
    ...report.rows.map((row) => `- ${row.slateId}: ${row.failureClass}; unresolved ${row.unresolvedRows}, winners ${row.resolvedWinnerRows}, losses ${row.resolvedProblemRows}, best resolved ${row.bestResolvedOutcomeLabel || '-'} ${row.bestResolvedOneMesPl ?? '-'}.`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepMorningLongUnresolvedTopSlateDrilldownReport(args: {
  reportDir?: string;
  rankSimulationPath?: string | null;
  rankSimulation?: RankSimulationReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepMorningLongUnresolvedTopSlateDrilldownReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const rankSimulationPath = args.rankSimulationPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-sweep-morning-long-nochase-rank-simulation-');
  const rankSimulation = args.rankSimulation ?? readJson<RankSimulationReport>(rankSimulationPath);
  const rows = buildRows(rankSimulation);
  const blockers = [
    !rankSimulationPath && !args.rankSimulation ? 'missing rank simulation path' : null,
    !rankSimulation ? 'missing rank simulation report' : null,
    rankSimulation && rankSimulation.status !== 'pass' ? `rank simulation status ${rankSimulation.status}` : null,
    (rankSimulation?.slates || []).length === 0 ? 'rank simulation has no slates' : null,
    rows.length === 0 ? 'no unresolved/no-fill top slates found' : null,
  ].filter((item): item is string => Boolean(item));
  const replacementAvailableSlates = rows.filter((row) => row.failureClass === 'replacement_available').length;
  const allUnresolvedOrNoFillSlates = rows.filter((row) => row.failureClass === 'all_unresolved_or_no_fill').length;
  const onlyResolvedLossSlates = rows.filter((row) => row.failureClass === 'only_resolved_losses').length;
  const base: Omit<RawOhlcScannerArtifactSweepMorningLongUnresolvedTopSlateDrilldownReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_morning_long_unresolved_top_slate_drilldown',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, rankSimulationPath },
    assumptions: {
      savedReportsOnly: true,
      drilldownOnly: true,
      noRuntimeRankingChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      slates: rankSimulation?.slates?.length || 0,
      unresolvedTopSlates: rows.length,
      replacementAvailableSlates,
      allUnresolvedOrNoFillSlates,
      onlyResolvedLossSlates,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length
        ? 'fix_inputs'
        : replacementAvailableSlates
          ? 'inspect_replacement_available_slates'
          : 'broaden_replay_horizon_or_outcome_source',
    },
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Fix rank simulation input before unresolved top-slate drilldown.']
      : replacementAvailableSlates
        ? ['Inspect replacement-available slates for a supported pre-entry selector before any runtime proposal.']
        : ['The unresolved top problem is not rank replacement; broaden replay horizon/outcome source before ranking changes.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildRawOhlcScannerArtifactSweepMorningLongUnresolvedTopSlateDrilldownReport({
    reportDir,
    rankSimulationPath: readFlag(args, '--rank-simulation') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `raw-ohlc-scanner-artifact-sweep-morning-long-unresolved-top-slate-drilldown-${Date.now()}.json`);
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
