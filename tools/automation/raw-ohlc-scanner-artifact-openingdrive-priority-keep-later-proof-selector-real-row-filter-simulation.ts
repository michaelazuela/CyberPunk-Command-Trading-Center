import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

interface SlateRow {
  slateId: string;
  rows: number;
  selectedTicketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: 'LONG' | 'SHORT';
  proofTime: string;
  outcomeStatus: string;
  outcomeLabel: string;
  resolvedOneMesPl: number | null;
}

interface ProblemSlateRow {
  slateId: string;
  earliestOutcomeLabel: string;
  earliestBarsAfterProof: number;
  earliestMfe: number | null;
  earliestMae: number | null;
  earliestRiskPoints: number;
  laterPositiveRows: number;
}

interface JsonReport {
  status?: string;
  slateRows?: SlateRow[];
  problemSlateRows?: ProblemSlateRow[];
  summary?: Record<string, unknown>;
}

interface FilteredSlateRow extends SlateRow {
  filterDecision: 'retained' | 'excluded_insufficient_replay_runway' | 'excluded_high_adverse_stopped';
  filterReason: string;
  adverseR: number | null;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowFilterSimulationReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_real_row_filter_simulation';
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
    slateAuditPath: string | null;
    problemDrilldownPath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    repeatedScannerSnapshotsAreNotIndependentTrades: true;
    minReplayBarsAfterProof: 2;
    highAdverseStoppedThresholdR: 3;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: {
    baselineSlates: number;
    baselineResolvedSlates: number;
    baselineUnresolvedSlates: number;
    baselineStoppedSlates: number;
    baselineGrossResolvedOneMesPl: number | null;
    retainedSlates: number;
    retainedResolvedSlates: number;
    retainedUnresolvedSlates: number;
    retainedStoppedSlates: number;
    retainedGrossResolvedOneMesPl: number | null;
    excludedInsufficientReplayRunwaySlates: number;
    excludedHighAdverseStoppedSlates: number;
    retainedGrossPlDelta: number | null;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'validate_filter_on_broader_real_rows_before_runtime_rank_consumer' | 'fix_inputs';
  };
  filteredSlateRows: FilteredSlateRow[];
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

function readJson(filePath: string | null): JsonReport | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as JsonReport;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowFilterSimulationReport['authority'] {
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

function sumResolved(rows: SlateRow[]): number | null {
  const resolved = rows.filter((row) => typeof row.resolvedOneMesPl === 'number');
  if (!resolved.length) return null;
  return round(resolved.reduce((sum, row) => sum + (row.resolvedOneMesPl || 0), 0));
}

function delta(after: number | null, before: number | null): number | null {
  if (after === null || before === null) return null;
  return round(after - before);
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowFilterSimulationReport, 'markdown'>): string {
  return [
    '# OpeningDrive ProofSelectionSignal Real-Row Filter Simulation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-report filter simulation. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Baseline slates: ${report.summary.baselineSlates}.`,
    `- Baseline unresolved/stopped slates: ${report.summary.baselineUnresolvedSlates}/${report.summary.baselineStoppedSlates}.`,
    `- Baseline gross resolved one-MES P/L: ${report.summary.baselineGrossResolvedOneMesPl ?? '-'}.`,
    `- Retained slates: ${report.summary.retainedSlates}.`,
    `- Retained unresolved/stopped slates: ${report.summary.retainedUnresolvedSlates}/${report.summary.retainedStoppedSlates}.`,
    `- Retained gross resolved one-MES P/L: ${report.summary.retainedGrossResolvedOneMesPl ?? '-'}.`,
    `- Retained gross P/L delta: ${report.summary.retainedGrossPlDelta ?? '-'}.`,
    `- Excluded insufficient replay-runway slates: ${report.summary.excludedInsufficientReplayRunwaySlates}.`,
    `- Excluded high-adverse stopped slates: ${report.summary.excludedHighAdverseStoppedSlates}.`,
    `- Runtime rank consumer allowed by this report: ${report.summary.runtimeRankConsumerAllowedByThisReport}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowFilterSimulationReport(args: {
  reportDir?: string;
  slateAuditPath?: string | null;
  problemDrilldownPath?: string | null;
  slateAudit?: JsonReport | null;
  problemDrilldown?: JsonReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowFilterSimulationReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const slateAuditPath = args.slateAuditPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-real-row-outcome-slate-audit-');
  const problemDrilldownPath = args.problemDrilldownPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-real-row-problem-slate-drilldown-');
  const slateAudit = args.slateAudit ?? readJson(slateAuditPath);
  const problemDrilldown = args.problemDrilldown ?? readJson(problemDrilldownPath);
  const slateRows = slateAudit?.slateRows || [];
  const problemBySlate = new Map((problemDrilldown?.problemSlateRows || []).map((row) => [row.slateId, row]));

  const filteredSlateRows: FilteredSlateRow[] = slateRows.map((row) => {
    const problem = problemBySlate.get(row.slateId);
    const adverseR = problem && problem.earliestRiskPoints > 0 && typeof problem.earliestMae === 'number'
      ? round(problem.earliestMae / problem.earliestRiskPoints)
      : null;
    if (problem && problem.earliestBarsAfterProof < 2) {
      return {
        ...row,
        filterDecision: 'excluded_insufficient_replay_runway',
        filterReason: `barsAfterProof=${problem.earliestBarsAfterProof}; minimum=2`,
        adverseR,
      };
    }
    if (problem && problem.earliestOutcomeLabel === 'stopped_before_t1' && (adverseR ?? 0) >= 3) {
      return {
        ...row,
        filterDecision: 'excluded_high_adverse_stopped',
        filterReason: `adverseR=${adverseR}; threshold=3`,
        adverseR,
      };
    }
    return { ...row, filterDecision: 'retained', filterReason: 'passes research filter simulation', adverseR };
  });
  const retained = filteredSlateRows.filter((row) => row.filterDecision === 'retained');
  const baselineGross = sumResolved(slateRows);
  const retainedGross = sumResolved(retained);
  const blockers = [
    !slateAuditPath ? 'missing real-row outcome slate audit report path' : null,
    !problemDrilldownPath ? 'missing real-row problem slate drilldown report path' : null,
    !slateAudit ? 'missing real-row outcome slate audit report' : null,
    !problemDrilldown ? 'missing real-row problem slate drilldown report' : null,
    slateAudit && slateAudit.status !== 'pass' ? `slate audit status ${slateAudit.status}` : null,
    problemDrilldown && problemDrilldown.status !== 'pass' ? `problem drilldown status ${problemDrilldown.status}` : null,
    slateRows.length === 0 ? 'slate audit has no slate rows' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowFilterSimulationReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_real_row_filter_simulation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, slateAuditPath, problemDrilldownPath },
    assumptions: {
      savedReportsOnly: true,
      repeatedScannerSnapshotsAreNotIndependentTrades: true,
      minReplayBarsAfterProof: 2,
      highAdverseStoppedThresholdR: 3,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      baselineSlates: slateRows.length,
      baselineResolvedSlates: slateRows.filter((row) => row.outcomeStatus === 'resolved').length,
      baselineUnresolvedSlates: slateRows.filter((row) => row.outcomeStatus === 'unresolved').length,
      baselineStoppedSlates: slateRows.filter((row) => row.outcomeLabel === 'stopped_before_t1').length,
      baselineGrossResolvedOneMesPl: baselineGross,
      retainedSlates: retained.length,
      retainedResolvedSlates: retained.filter((row) => row.outcomeStatus === 'resolved').length,
      retainedUnresolvedSlates: retained.filter((row) => row.outcomeStatus === 'unresolved').length,
      retainedStoppedSlates: retained.filter((row) => row.outcomeLabel === 'stopped_before_t1').length,
      retainedGrossResolvedOneMesPl: retainedGross,
      excludedInsufficientReplayRunwaySlates: filteredSlateRows.filter((row) => row.filterDecision === 'excluded_insufficient_replay_runway').length,
      excludedHighAdverseStoppedSlates: filteredSlateRows.filter((row) => row.filterDecision === 'excluded_high_adverse_stopped').length,
      retainedGrossPlDelta: delta(retainedGross, baselineGross),
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length ? 'fix_inputs' : 'validate_filter_on_broader_real_rows_before_runtime_rank_consumer',
    },
    filteredSlateRows,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved-report inputs before filter simulation.']
      : [
        'Treat the insufficient-runway rule as a data-quality filter, not a trading edge.',
        'Treat the high-adverse stopped rule as a caution/exclusion candidate until validated on broader real rows.',
        'Keep runtime ranking disabled; this report is not approval to change scanner-visible rank behavior.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowFilterSimulationReport({
    reportDir,
    slateAuditPath: readFlag(args, '--slate-audit') || undefined,
    problemDrilldownPath: readFlag(args, '--problem-drilldown') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-real-row-filter-simulation-${Date.now()}.json`);
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
