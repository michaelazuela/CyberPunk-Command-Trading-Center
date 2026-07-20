import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  buildRawOhlcScannerArtifactSweepMorningLongPreentryFieldMinerReport,
  type JoinedRow,
} from './raw-ohlc-scanner-artifact-sweep-morning-long-preentry-field-miner';
import { buildRawOhlcScannerArtifactSweepMorningLongNoChaseSplitValidationReport } from './raw-ohlc-scanner-artifact-sweep-morning-long-nochase-split-validation';
import { buildRawOhlcScannerArtifactSweepMorningLongNoChaseRankSimulationReport } from './raw-ohlc-scanner-artifact-sweep-morning-long-nochase-rank-simulation';

interface FullDayComparisonRow {
  ticketId: string;
  fullDayOutcomeLabel: string;
  fullDayOneMesPl: number | null;
}

interface FullDayComparisonReport {
  status?: string;
  source?: {
    replayPackagePath?: string | null;
    baselineOutcomePath?: string | null;
  };
  rows?: FullDayComparisonRow[];
}

interface UnresolvedDrilldownRow {
  ticketId: string;
  causeClass: string;
  rankResearchAction: string;
}

interface UnresolvedDrilldownReport {
  status?: string;
  rows?: UnresolvedDrilldownRow[];
}

interface OverlaySummary {
  joinedRows: number;
  fullDayResolvedRows: number;
  fullDayUnresolvedRows: number;
  weakFollowThroughRows: number;
  nearT1ReviewRows: number;
  noFillRows: number;
  rowsMissingFullDayOutcome: number;
}

export interface RawOhlcScannerArtifactSweepMorningLongFullDayNoChaseRerunReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_morning_long_full_day_nochase_rerun';
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
    fullDayComparisonPath: string | null;
    unresolvedDrilldownPath: string | null;
    replayPackagePath: string | null;
    baselineOutcomePath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    overlaysFullDayOutcomeLabelsOnly: true;
    usesPreentryScannerFieldsOnlyForScoring: true;
    unresolvedClassUsedForResearchNotesOnly: true;
    noRuntimeRankingChange: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: OverlaySummary & {
    splitRecommendation: string;
    rankRecommendation: string;
    changedSlates: number;
    baselineTopOneMesPl: number | null;
    simulatedTopOneMesPl: number | null;
    topSelectionDeltaOneMesPl: number | null;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'keep_research_only' | 'inspect_inputs' | 'prepare_next_guarded_validation';
  };
  splitValidation: ReturnType<typeof buildRawOhlcScannerArtifactSweepMorningLongNoChaseSplitValidationReport>;
  rankSimulation: ReturnType<typeof buildRawOhlcScannerArtifactSweepMorningLongNoChaseRankSimulationReport>;
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

function authority(): RawOhlcScannerArtifactSweepMorningLongFullDayNoChaseRerunReport['authority'] {
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

function overlayFullDayOutcomes(args: {
  joinedRows: JoinedRow[];
  fullDayComparison: FullDayComparisonReport | null;
  unresolvedDrilldown: UnresolvedDrilldownReport | null;
}): { rows: JoinedRow[]; summary: OverlaySummary } {
  const fullDayByTicket = new Map((args.fullDayComparison?.rows || []).map((row) => [row.ticketId, row]));
  const unresolvedByTicket = new Map((args.unresolvedDrilldown?.rows || []).map((row) => [row.ticketId, row]));
  let rowsMissingFullDayOutcome = 0;
  const rows = args.joinedRows.map((row) => {
    const fullDay = fullDayByTicket.get(row.ticketId);
    const unresolved = unresolvedByTicket.get(row.ticketId);
    if (!fullDay) rowsMissingFullDayOutcome += 1;
    const resolvedOneMesPl = fullDay ? fullDay.fullDayOneMesPl : row.resolvedOneMesPl;
    const outcomeStatus = typeof resolvedOneMesPl === 'number' ? 'resolved' : 'unresolved';
    const outcomeLabel = fullDay?.fullDayOutcomeLabel || row.outcomeLabel;
    return {
      ...row,
      outcomeStatus,
      outcomeLabel,
      resolvedOneMesPl,
      fields: {
        ...row.fields,
        fullDayOutcomeSource: fullDay ? 'full_day_scanner_artifact' : 'missing_full_day_overlay',
        fullDayUnresolvedCause: unresolved?.causeClass || (typeof resolvedOneMesPl === 'number' ? 'resolved' : 'unclassified_unresolved'),
        fullDayRankResearchAction: unresolved?.rankResearchAction || (typeof resolvedOneMesPl === 'number' ? 'resolved_training_candidate' : 'inspect_inputs'),
      },
    } satisfies JoinedRow;
  });
  const summary: OverlaySummary = {
    joinedRows: rows.length,
    fullDayResolvedRows: rows.filter((row) => row.outcomeStatus === 'resolved').length,
    fullDayUnresolvedRows: rows.filter((row) => row.outcomeStatus !== 'resolved').length,
    weakFollowThroughRows: rows.filter((row) => row.fields.fullDayUnresolvedCause === 'weak_follow_through').length,
    nearT1ReviewRows: rows.filter((row) => row.fields.fullDayUnresolvedCause === 'near_t1_unresolved').length,
    noFillRows: rows.filter((row) => row.outcomeLabel === 'no_fill').length,
    rowsMissingFullDayOutcome,
  };
  return { rows, summary };
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepMorningLongFullDayNoChaseRerunReport, 'markdown'>): string {
  return [
    '# Raw OHLC Scanner Artifact Sweep Morning LONG Full-Day No-Chase Rerun',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-report rerun. It overlays full-day outcome labels onto existing pre-entry scanner rows and reruns research diagnostics only. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Joined rows: ${report.summary.joinedRows}.`,
    `- Full-day resolved/unresolved rows: ${report.summary.fullDayResolvedRows} / ${report.summary.fullDayUnresolvedRows}.`,
    `- Weak-follow-through / near-T1 review / no-fill rows: ${report.summary.weakFollowThroughRows} / ${report.summary.nearT1ReviewRows} / ${report.summary.noFillRows}.`,
    `- Changed slates: ${report.summary.changedSlates}.`,
    `- Baseline/simulated top one-MES P/L: ${report.summary.baselineTopOneMesPl ?? '-'} / ${report.summary.simulatedTopOneMesPl ?? '-'}.`,
    `- Top-selection delta: ${report.summary.topSelectionDeltaOneMesPl ?? '-'}.`,
    `- Split/rank recommendations: ${report.summary.splitRecommendation} / ${report.summary.rankRecommendation}.`,
    `- Runtime rank consumer allowed by this report: ${report.summary.runtimeRankConsumerAllowedByThisReport}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepMorningLongFullDayNoChaseRerunReport(args: {
  reportDir?: string;
  fullDayComparisonPath?: string | null;
  unresolvedDrilldownPath?: string | null;
  replayPackagePath?: string | null;
  baselineOutcomePath?: string | null;
  joinedRows?: JoinedRow[];
  fullDayComparison?: FullDayComparisonReport | null;
  unresolvedDrilldown?: UnresolvedDrilldownReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepMorningLongFullDayNoChaseRerunReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const fullDayComparisonPath = args.fullDayComparisonPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-sweep-morning-long-full-day-outcome-comparison-');
  const unresolvedDrilldownPath = args.unresolvedDrilldownPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-sweep-morning-long-full-day-unresolved-drilldown-');
  const fullDayComparison = args.fullDayComparison ?? readJson<FullDayComparisonReport>(fullDayComparisonPath);
  const unresolvedDrilldown = args.unresolvedDrilldown ?? readJson<UnresolvedDrilldownReport>(unresolvedDrilldownPath);
  const replayPackagePath = args.replayPackagePath ?? fullDayComparison?.source?.replayPackagePath ?? null;
  const baselineOutcomePath = args.baselineOutcomePath ?? fullDayComparison?.source?.baselineOutcomePath ?? null;
  const preentry = args.joinedRows
    ? null
    : buildRawOhlcScannerArtifactSweepMorningLongPreentryFieldMinerReport({
      reportDir,
      replayPackagePath,
      outcomePath: baselineOutcomePath,
    }, generatedAt);
  const overlay = overlayFullDayOutcomes({
    joinedRows: args.joinedRows || preentry?.joinedRows || [],
    fullDayComparison,
    unresolvedDrilldown,
  });
  const splitValidation = buildRawOhlcScannerArtifactSweepMorningLongNoChaseSplitValidationReport({ joinedRows: overlay.rows }, generatedAt);
  const rankSimulation = buildRawOhlcScannerArtifactSweepMorningLongNoChaseRankSimulationReport({ joinedRows: overlay.rows }, generatedAt);
  const blockers = [
    !fullDayComparisonPath && !args.fullDayComparison ? 'missing full-day comparison path' : null,
    !unresolvedDrilldownPath && !args.unresolvedDrilldown ? 'missing unresolved drilldown path' : null,
    !fullDayComparison ? 'missing full-day comparison report' : null,
    !unresolvedDrilldown ? 'missing unresolved drilldown report' : null,
    fullDayComparison && fullDayComparison.status !== 'pass' ? `full-day comparison status ${fullDayComparison.status}` : null,
    unresolvedDrilldown && unresolvedDrilldown.status !== 'pass' ? `unresolved drilldown status ${unresolvedDrilldown.status}` : null,
    preentry && preentry.status !== 'pass' ? `pre-entry miner status ${preentry.status}` : null,
    overlay.summary.joinedRows === 0 ? 'no joined Sweep morning LONG rows available for full-day overlay' : null,
    overlay.summary.rowsMissingFullDayOutcome ? `${overlay.summary.rowsMissingFullDayOutcome} row(s) missing full-day outcome overlay` : null,
    splitValidation.status !== 'pass' ? `split validation status ${splitValidation.status}` : null,
    rankSimulation.status !== 'pass' ? `rank simulation status ${rankSimulation.status}` : null,
  ].filter((item): item is string => Boolean(item));
  const prepareNext = !blockers.length
    && splitValidation.summary.recommendation === 'prepare_research_only_rank_simulation'
    && rankSimulation.summary.recommendation === 'prepare_guarded_live_proposal';
  const base: Omit<RawOhlcScannerArtifactSweepMorningLongFullDayNoChaseRerunReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_morning_long_full_day_nochase_rerun',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir,
      fullDayComparisonPath,
      unresolvedDrilldownPath,
      replayPackagePath,
      baselineOutcomePath,
    },
    assumptions: {
      savedReportsOnly: true,
      overlaysFullDayOutcomeLabelsOnly: true,
      usesPreentryScannerFieldsOnlyForScoring: true,
      unresolvedClassUsedForResearchNotesOnly: true,
      noRuntimeRankingChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      ...overlay.summary,
      splitRecommendation: splitValidation.summary.recommendation,
      rankRecommendation: rankSimulation.summary.recommendation,
      changedSlates: rankSimulation.summary.changedSlates,
      baselineTopOneMesPl: rankSimulation.summary.baselineTopOneMesPl,
      simulatedTopOneMesPl: rankSimulation.summary.simulatedTopOneMesPl,
      topSelectionDeltaOneMesPl: rankSimulation.summary.topSelectionDeltaOneMesPl,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length ? 'inspect_inputs' : prepareNext ? 'prepare_next_guarded_validation' : 'keep_research_only',
    },
    splitValidation,
    rankSimulation,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved comparison/drilldown/pre-entry inputs before full-day no-chase rerun.']
      : prepareNext
        ? ['Prepare a separate guarded validation package before any scanner-visible no-chase rank proposal.']
        : ['Keep this full-day no-chase rerun research-only; do not install runtime rank behavior from this result.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildRawOhlcScannerArtifactSweepMorningLongFullDayNoChaseRerunReport({
    reportDir,
    fullDayComparisonPath: readFlag(args, '--full-day-comparison') || undefined,
    unresolvedDrilldownPath: readFlag(args, '--unresolved-drilldown') || undefined,
    replayPackagePath: readFlag(args, '--replay-package') || undefined,
    baselineOutcomePath: readFlag(args, '--baseline-outcome') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `raw-ohlc-scanner-artifact-sweep-morning-long-full-day-nochase-rerun-${Date.now()}.json`);
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
