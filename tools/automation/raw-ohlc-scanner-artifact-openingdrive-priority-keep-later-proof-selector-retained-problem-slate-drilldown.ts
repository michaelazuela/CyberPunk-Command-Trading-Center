import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

interface FilteredSlateRow {
  slateId: string;
  filterDecision: 'retained' | 'excluded_insufficient_replay_runway' | 'excluded_high_adverse_stopped';
  filterReason: string;
  adverseR: number | null;
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
  laterPositiveRows: number;
  laterStoppedRows: number;
  laterUnresolvedRows: number;
}

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
  t1: number;
  t2: number;
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
}

interface JsonReport {
  status?: string;
  filteredSlateRows?: FilteredSlateRow[];
  problemSlateRows?: ProblemSlateRow[];
  rows?: OutcomeRow[];
}

interface RetainedProblemSlateRow {
  slateId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: 'LONG' | 'SHORT';
  earliestTicketId: string;
  earliestProofTime: string;
  outcomeLabel: string;
  outcomeStatus: 'resolved' | 'unresolved' | 'blocked';
  entryHit: boolean;
  entryHitTime: string | null;
  barsAfterProof: number;
  riskPoints: number;
  mfe: number | null;
  mae: number | null;
  mfeR: number | null;
  maeR: number | null;
  adverseR: number | null;
  laterRows: number;
  laterPositiveRows: number;
  laterStoppedRows: number;
  laterUnresolvedRows: number;
  filterReason: string;
  residueClass: 'entry_not_filled' | 'insufficient_follow_through' | 'moderate_adverse_stopped' | 'unresolved_after_entry' | 'other_retained_problem';
  nextProbe: string;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRetainedProblemSlateDrilldownReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_retained_problem_slate_drilldown';
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
    filterSimulationPath: string | null;
    problemDrilldownPath: string | null;
    outcomePath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    retainedMeansCurrentResearchFilterDidNotExclude: true;
    earliestSlateRowNoLookahead: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: {
    problemSlatesRead: number;
    retainedProblemSlates: number;
    retainedUnresolvedSlates: number;
    retainedStoppedSlates: number;
    retainedNoFillSlates: number;
    retainedNoTargetOrStopSlates: number;
    entryNotFilledSlates: number;
    insufficientFollowThroughSlates: number;
    moderateAdverseStoppedSlates: number;
    unresolvedAfterEntrySlates: number;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'mine_retained_residue_pre_entry_separators' | 'fix_inputs';
  };
  retainedProblemSlateRows: RetainedProblemSlateRow[];
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

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function ratio(value: number | null, risk: number): number | null {
  if (value === null || risk <= 0) return null;
  return round(value / risk);
}

function slateId(row: OutcomeRow): string {
  return [row.tradeDate, row.session, row.setupType, row.direction].join('|');
}

function residueClass(problem: ProblemSlateRow, outcome: OutcomeRow | null, mfeR: number | null): RetainedProblemSlateRow['residueClass'] {
  if (problem.earliestOutcomeLabel === 'no_fill' || outcome?.entryHitTime === null) return 'entry_not_filled';
  if (problem.earliestOutcomeLabel === 'stopped_before_t1') return 'moderate_adverse_stopped';
  if (problem.earliestOutcomeLabel === 'no_target_or_stop_hit' && (mfeR ?? 0) < 1) return 'insufficient_follow_through';
  if (problem.earliestOutcomeLabel === 'no_target_or_stop_hit') return 'unresolved_after_entry';
  return 'other_retained_problem';
}

function nextProbeFor(residue: RetainedProblemSlateRow['residueClass']): string {
  if (residue === 'entry_not_filled') return 'test pre-entry distance and pullback-completion filters';
  if (residue === 'insufficient_follow_through') return 'test proof-time follow-through and target-room quality filters';
  if (residue === 'moderate_adverse_stopped') return 'mine common proof-time context before changing stop/risk behavior';
  if (residue === 'unresolved_after_entry') return 'test time-to-resolution and target proximity filters';
  return 'inspect manually before any rank consumer';
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRetainedProblemSlateDrilldownReport['authority'] {
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRetainedProblemSlateDrilldownReport, 'markdown'>): string {
  return [
    '# OpeningDrive ProofSelectionSignal Retained Problem Slate Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-report drilldown. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Problem slates read: ${report.summary.problemSlatesRead}.`,
    `- Retained problem slates: ${report.summary.retainedProblemSlates}.`,
    `- Retained unresolved/stopped slates: ${report.summary.retainedUnresolvedSlates}/${report.summary.retainedStoppedSlates}.`,
    `- Retained no-fill/no-target-or-stop slates: ${report.summary.retainedNoFillSlates}/${report.summary.retainedNoTargetOrStopSlates}.`,
    `- Entry-not-filled slates: ${report.summary.entryNotFilledSlates}.`,
    `- Insufficient follow-through slates: ${report.summary.insufficientFollowThroughSlates}.`,
    `- Moderate-adverse stopped slates: ${report.summary.moderateAdverseStoppedSlates}.`,
    `- Unresolved-after-entry slates: ${report.summary.unresolvedAfterEntrySlates}.`,
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

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRetainedProblemSlateDrilldownReport(args: {
  reportDir?: string;
  filterSimulationPath?: string | null;
  problemDrilldownPath?: string | null;
  outcomePath?: string | null;
  filterSimulation?: JsonReport | null;
  problemDrilldown?: JsonReport | null;
  outcome?: JsonReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRetainedProblemSlateDrilldownReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const filterSimulationPath = args.filterSimulationPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-real-row-filter-simulation-');
  const problemDrilldownPath = args.problemDrilldownPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-real-row-problem-slate-drilldown-');
  const outcomePath = args.outcomePath ?? latestMatchingFile(reportDir, 'unified-positive-held-local-preview-replay-package-outcome-');
  const filterSimulation = args.filterSimulation ?? readJson(filterSimulationPath);
  const problemDrilldown = args.problemDrilldown ?? readJson(problemDrilldownPath);
  const outcome = args.outcome ?? readJson(outcomePath);
  const filteredBySlate = new Map((filterSimulation?.filteredSlateRows || []).map((row) => [row.slateId, row]));
  const outcomeGroups = new Map<string, OutcomeRow[]>();
  for (const row of outcome?.rows || []) outcomeGroups.set(slateId(row), [...(outcomeGroups.get(slateId(row)) || []), row]);

  const retainedProblemSlateRows = (problemDrilldown?.problemSlateRows || [])
    .filter((row) => filteredBySlate.get(row.slateId)?.filterDecision === 'retained')
    .map((problem): RetainedProblemSlateRow => {
      const outcomeRows = [...(outcomeGroups.get(problem.slateId) || [])].sort((a, b) => timeMs(a.proofTime) - timeMs(b.proofTime));
      const earliest = outcomeRows[0] || null;
      const mfeR = ratio(problem.earliestMfe, problem.earliestRiskPoints);
      const maeR = ratio(problem.earliestMae, problem.earliestRiskPoints);
      const residue = residueClass(problem, earliest, mfeR);
      return {
        slateId: problem.slateId,
        tradeDate: problem.tradeDate,
        session: problem.session,
        setupType: problem.setupType,
        direction: problem.direction,
        earliestTicketId: problem.earliestTicketId,
        earliestProofTime: problem.earliestProofTime,
        outcomeLabel: problem.earliestOutcomeLabel,
        outcomeStatus: earliest?.outcomeStatus || (problem.earliestResolvedOneMesPl === null ? 'unresolved' : 'resolved'),
        entryHit: Boolean(earliest?.entryHitTime),
        entryHitTime: earliest?.entryHitTime || null,
        barsAfterProof: problem.earliestBarsAfterProof,
        riskPoints: problem.earliestRiskPoints,
        mfe: problem.earliestMfe,
        mae: problem.earliestMae,
        mfeR,
        maeR,
        adverseR: filteredBySlate.get(problem.slateId)?.adverseR ?? maeR,
        laterRows: problem.laterRows,
        laterPositiveRows: problem.laterPositiveRows,
        laterStoppedRows: problem.laterStoppedRows,
        laterUnresolvedRows: problem.laterUnresolvedRows,
        filterReason: filteredBySlate.get(problem.slateId)?.filterReason || 'retained',
        residueClass: residue,
        nextProbe: nextProbeFor(residue),
      };
    });

  const blockers = [
    !filterSimulationPath ? 'missing filter simulation report path' : null,
    !problemDrilldownPath ? 'missing problem drilldown report path' : null,
    !outcomePath ? 'missing outcome report path' : null,
    !filterSimulation ? 'missing filter simulation report' : null,
    !problemDrilldown ? 'missing problem drilldown report' : null,
    !outcome ? 'missing outcome report' : null,
    filterSimulation && filterSimulation.status !== 'pass' ? `filter simulation status ${filterSimulation.status}` : null,
    problemDrilldown && problemDrilldown.status !== 'pass' ? `problem drilldown status ${problemDrilldown.status}` : null,
    outcome && outcome.status !== 'pass' ? `outcome report status ${outcome.status}` : null,
    problemDrilldown && (problemDrilldown.problemSlateRows || []).length === 0 ? 'problem drilldown has no problem slates' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRetainedProblemSlateDrilldownReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_retained_problem_slate_drilldown',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, filterSimulationPath, problemDrilldownPath, outcomePath },
    assumptions: {
      savedReportsOnly: true,
      retainedMeansCurrentResearchFilterDidNotExclude: true,
      earliestSlateRowNoLookahead: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      problemSlatesRead: (problemDrilldown?.problemSlateRows || []).length,
      retainedProblemSlates: retainedProblemSlateRows.length,
      retainedUnresolvedSlates: retainedProblemSlateRows.filter((row) => row.outcomeStatus === 'unresolved').length,
      retainedStoppedSlates: retainedProblemSlateRows.filter((row) => row.outcomeLabel === 'stopped_before_t1').length,
      retainedNoFillSlates: retainedProblemSlateRows.filter((row) => row.outcomeLabel === 'no_fill').length,
      retainedNoTargetOrStopSlates: retainedProblemSlateRows.filter((row) => row.outcomeLabel === 'no_target_or_stop_hit').length,
      entryNotFilledSlates: retainedProblemSlateRows.filter((row) => row.residueClass === 'entry_not_filled').length,
      insufficientFollowThroughSlates: retainedProblemSlateRows.filter((row) => row.residueClass === 'insufficient_follow_through').length,
      moderateAdverseStoppedSlates: retainedProblemSlateRows.filter((row) => row.residueClass === 'moderate_adverse_stopped').length,
      unresolvedAfterEntrySlates: retainedProblemSlateRows.filter((row) => row.residueClass === 'unresolved_after_entry').length,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length ? 'fix_inputs' : 'mine_retained_residue_pre_entry_separators',
    },
    retainedProblemSlateRows,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved-report inputs before retained problem-slate drilldown.']
      : [
        'Do not loosen canExecute; the retained residue is proof/entry-quality research, not execution authority.',
        'Mine pre-entry distance, entry fill, follow-through, and moderate-adverse context against winners before any runtime rank consumer.',
        'Keep the current high-adverse and insufficient-runway filters research-only until residue separators are validated.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRetainedProblemSlateDrilldownReport({
    reportDir,
    filterSimulationPath: readFlag(args, '--filter-simulation') || undefined,
    problemDrilldownPath: readFlag(args, '--problem-drilldown') || undefined,
    outcomePath: readFlag(args, '--outcome') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-retained-problem-slate-drilldown-${Date.now()}.json`);
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
