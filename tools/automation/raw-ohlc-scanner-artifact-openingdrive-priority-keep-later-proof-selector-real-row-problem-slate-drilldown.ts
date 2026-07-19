import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

interface OutcomeRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: 'LONG' | 'SHORT';
  proofTime: string;
  outcomeStatus: 'resolved' | 'unresolved' | 'blocked';
  outcomeLabel: string;
  entry: number;
  stop: number;
  riskPoints: number;
  barsAfterProof: number;
  entryHitTime: string | null;
  firstReplayBarTime: string | null;
  stopHitTime: string | null;
  t1HitTime: string | null;
  t2HitTime: string | null;
  maximumFavorableExcursion: number | null;
  maximumAdverseExcursion: number | null;
  resolvedOneMesPl: number | null;
  resolvedR: number | null;
}

interface ProblemSlateRow {
  slateId: string;
  rows: number;
  earliestTicketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: 'LONG' | 'SHORT';
  earliestProofTime: string;
  earliestOutcomeLabel: string;
  earliestResolvedOneMesPl: number | null;
  earliestBarsAfterProof: number;
  earliestMfe: number | null;
  earliestMae: number | null;
  earliestRiskPoints: number;
  laterRows: number;
  laterResolvedRows: number;
  laterPositiveRows: number;
  laterStoppedRows: number;
  laterUnresolvedRows: number;
  bestLaterOutcomeLabel: string | null;
  bestLaterProofTime: string | null;
  bestLaterResolvedOneMesPl: number | null;
  note: string;
}

interface JsonReport {
  status?: string;
  rows?: OutcomeRow[];
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowProblemSlateDrilldownReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_real_row_problem_slate_drilldown';
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
  source: { reportDir: string; outcomePath: string | null };
  assumptions: {
    savedOutcomeRowsOnly: true;
    problemSlatesAreEarliestStoppedOrUnresolved: true;
    laterSameSlateRowsAreDiagnosticOnly: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: {
    outcomeRows: number;
    problemSlates: number;
    unresolvedProblemSlates: number;
    stoppedProblemSlates: number;
    problemSlatesWithLaterPositiveRows: number;
    problemSlatesWithOnlyOneBarAfterProof: number;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'test_minimum_replay_runway_or_later_proof_filter' | 'fix_inputs';
  };
  problemSlateRows: ProblemSlateRow[];
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

function timeMs(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function slateId(row: OutcomeRow): string {
  return [row.tradeDate, row.session, row.setupType, row.direction].join('|');
}

function isPositive(row: OutcomeRow): boolean {
  return typeof row.resolvedOneMesPl === 'number' && row.resolvedOneMesPl > 0;
}

function bestLater(rows: OutcomeRow[]): OutcomeRow | null {
  return rows
    .filter((row) => typeof row.resolvedOneMesPl === 'number')
    .sort((a, b) => (b.resolvedOneMesPl || 0) - (a.resolvedOneMesPl || 0))[0] || null;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowProblemSlateDrilldownReport['authority'] {
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

function noteFor(earliest: OutcomeRow, laterRows: OutcomeRow[]): string {
  if (earliest.barsAfterProof <= 1) return 'Earliest proof had only the proof/entry bar available; test a minimum replay-runway filter.';
  if (earliest.outcomeLabel === 'stopped_before_t1' && laterRows.some(isPositive)) return 'Earliest proof stopped, but later same-slate proof turned positive; test later proof confirmation, not rank loosening.';
  if (earliest.outcomeLabel === 'no_target_or_stop_hit' && laterRows.some(isPositive)) return 'Earliest proof was unresolved, but later same-slate proof turned positive; test delayed proof selection.';
  return 'Problem slate needs structural drilldown before runtime ranking.';
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowProblemSlateDrilldownReport, 'markdown'>): string {
  return [
    '# OpeningDrive ProofSelectionSignal Problem Slate Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-outcome drilldown. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Outcome rows: ${report.summary.outcomeRows}.`,
    `- Problem slates: ${report.summary.problemSlates}.`,
    `- Unresolved problem slates: ${report.summary.unresolvedProblemSlates}.`,
    `- Stopped problem slates: ${report.summary.stoppedProblemSlates}.`,
    `- Problem slates with later positive rows: ${report.summary.problemSlatesWithLaterPositiveRows}.`,
    `- Problem slates with only one bar after proof: ${report.summary.problemSlatesWithOnlyOneBarAfterProof}.`,
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

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowProblemSlateDrilldownReport(args: {
  reportDir?: string;
  outcomePath?: string | null;
  outcome?: JsonReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowProblemSlateDrilldownReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const outcomePath = args.outcomePath ?? latestMatchingFile(reportDir, 'unified-positive-held-local-preview-replay-package-outcome-');
  const outcome = args.outcome ?? readJson(outcomePath);
  const outcomeRows = outcome?.rows || [];
  const groups = new Map<string, OutcomeRow[]>();
  for (const row of outcomeRows) groups.set(slateId(row), [...(groups.get(slateId(row)) || []), row]);
  const problemSlateRows: ProblemSlateRow[] = [];
  for (const [id, rows] of groups) {
    const sorted = [...rows].sort((a, b) => timeMs(a.proofTime) - timeMs(b.proofTime));
    const earliest = sorted[0];
    if (!earliest || !['stopped_before_t1', 'no_target_or_stop_hit', 'no_fill', 'blocked'].includes(earliest.outcomeLabel)) continue;
    const later = sorted.slice(1);
    const best = bestLater(later);
    problemSlateRows.push({
      slateId: id,
      rows: sorted.length,
      earliestTicketId: earliest.ticketId,
      tradeDate: earliest.tradeDate,
      session: earliest.session,
      setupType: earliest.setupType,
      direction: earliest.direction,
      earliestProofTime: earliest.proofTime,
      earliestOutcomeLabel: earliest.outcomeLabel,
      earliestResolvedOneMesPl: earliest.resolvedOneMesPl,
      earliestBarsAfterProof: earliest.barsAfterProof,
      earliestMfe: earliest.maximumFavorableExcursion,
      earliestMae: earliest.maximumAdverseExcursion,
      earliestRiskPoints: earliest.riskPoints,
      laterRows: later.length,
      laterResolvedRows: later.filter((row) => row.outcomeStatus === 'resolved').length,
      laterPositiveRows: later.filter(isPositive).length,
      laterStoppedRows: later.filter((row) => row.outcomeLabel === 'stopped_before_t1').length,
      laterUnresolvedRows: later.filter((row) => row.outcomeStatus === 'unresolved').length,
      bestLaterOutcomeLabel: best?.outcomeLabel || null,
      bestLaterProofTime: best?.proofTime || null,
      bestLaterResolvedOneMesPl: best?.resolvedOneMesPl ?? null,
      note: noteFor(earliest, later),
    });
  }
  const blockers = [
    !outcomePath ? 'missing outcome report path' : null,
    !outcome ? 'missing outcome report' : null,
    outcome && outcome.status !== 'pass' ? `outcome report status ${outcome.status}` : null,
    outcomeRows.length === 0 ? 'outcome report has no rows' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowProblemSlateDrilldownReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_real_row_problem_slate_drilldown',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, outcomePath },
    assumptions: {
      savedOutcomeRowsOnly: true,
      problemSlatesAreEarliestStoppedOrUnresolved: true,
      laterSameSlateRowsAreDiagnosticOnly: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      outcomeRows: outcomeRows.length,
      problemSlates: problemSlateRows.length,
      unresolvedProblemSlates: problemSlateRows.filter((row) => row.earliestOutcomeLabel === 'no_target_or_stop_hit' || row.earliestOutcomeLabel === 'no_fill').length,
      stoppedProblemSlates: problemSlateRows.filter((row) => row.earliestOutcomeLabel === 'stopped_before_t1').length,
      problemSlatesWithLaterPositiveRows: problemSlateRows.filter((row) => row.laterPositiveRows > 0).length,
      problemSlatesWithOnlyOneBarAfterProof: problemSlateRows.filter((row) => row.earliestBarsAfterProof <= 1).length,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length ? 'fix_inputs' : 'test_minimum_replay_runway_or_later_proof_filter',
    },
    problemSlateRows,
    blockers,
    recommendations: blockers.length
      ? ['Fix outcome report inputs before problem-slate drilldown.']
      : [
        'Test a research-only minimum replay-runway filter for earliest proof rows with only one bar after proof.',
        'Test whether later same-slate proof selection separates unresolved/stopped earliest rows without loosening canExecute.',
        'Keep runtime ranking disabled until the filter is validated on positive and problem slates together.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const outcomePath = readFlag(args, '--outcome') || undefined;
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealRowProblemSlateDrilldownReport({ reportDir, outcomePath });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-real-row-problem-slate-drilldown-${Date.now()}.json`);
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
