import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

interface FilteredSlateRow {
  slateId: string;
  rows: number;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: 'LONG' | 'SHORT';
  proofTime: string;
  outcomeStatus: string;
  outcomeLabel: string;
  resolvedOneMesPl: number | null;
  filterDecision: 'retained' | 'excluded_insufficient_replay_runway' | 'excluded_high_adverse_stopped';
}

interface OutcomeRow {
  tradeDate: string;
  session: string;
  setupType: string;
  direction: 'LONG' | 'SHORT';
  proofTime: string;
  outcomeStatus: 'resolved' | 'unresolved' | 'blocked';
  outcomeLabel: string;
  riskPoints: number;
  barsAfterProof: number;
  entryHitTime: string | null;
  resolvedOneMesPl: number | null;
}

interface JsonReport {
  status?: string;
  filteredSlateRows?: FilteredSlateRow[];
  rows?: OutcomeRow[];
}

interface RetainedSlateFeatureRow {
  slateId: string;
  tradeDate: string;
  session: string;
  direction: 'LONG' | 'SHORT';
  proofTime: string;
  classLabel: 'winner' | 'problem';
  outcomeLabel: string;
  resolvedOneMesPl: number | null;
  riskPoints: number;
  barsAfterProof: number;
  rowCount: number;
  entryHit: boolean;
  features: Record<string, string>;
}

interface FeatureStat {
  feature: string;
  value: string;
  totalSlates: number;
  winnerSlates: number;
  problemSlates: number;
  winRate: number;
  problemRate: number;
  liveUsable: boolean;
  verdict: 'positive_lane_candidate' | 'negative_filter_candidate' | 'mixed_or_low_support';
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRetainedResidueSeparatorMinerReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_retained_residue_separator_miner';
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
    outcomePath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    retainedSlatesOnly: true;
    earliestSlateRowNoLookahead: true;
    usesOnlyProofTimeAvailableOrClockDerivedFeatures: true;
    excludesOutcomeDerivedMfeMaeFromSeparators: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: {
    retainedSlates: number;
    retainedWinnerSlates: number;
    retainedProblemSlates: number;
    featureStats: number;
    positiveLaneCandidates: number;
    negativeFilterCandidates: number;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'validate_low_risk_positive_lane_before_runtime_consumer' | 'fix_inputs';
  };
  retainedSlateRows: RetainedSlateFeatureRow[];
  featureStats: FeatureStat[];
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

function slateId(row: OutcomeRow): string {
  return [row.tradeDate, row.session, row.setupType, row.direction].join('|');
}

function riskBucket(value: number): string {
  if (value < 10) return 'risk_lt_10';
  if (value < 15) return 'risk_10_to_15';
  if (value < 20) return 'risk_15_to_20';
  if (value < 25) return 'risk_20_to_25';
  return 'risk_gte_25';
}

function barsBucket(value: number): string {
  if (value <= 5) return 'bars_lte_5';
  if (value <= 10) return 'bars_6_to_10';
  if (value <= 20) return 'bars_11_to_20';
  return 'bars_gt_20';
}

function rowCountBucket(value: number): string {
  if (value <= 2) return 'rows_lte_2';
  if (value <= 5) return 'rows_3_to_5';
  if (value <= 10) return 'rows_6_to_10';
  return 'rows_gt_10';
}

function proofWindow(value: string): string {
  const hours = Number(value.slice(11, 13));
  const minutes = Number(value.slice(14, 16));
  const total = hours * 60 + minutes;
  if (!Number.isFinite(total)) return 'proof_unknown';
  if (total < 10 * 60) return 'proof_before_10';
  if (total < 12 * 60) return 'proof_10_to_12';
  if (total < 14 * 60) return 'proof_12_to_14';
  if (total < 15 * 60) return 'proof_14_to_15';
  return 'proof_after_15';
}

function classLabel(row: FilteredSlateRow): 'winner' | 'problem' {
  return row.outcomeStatus === 'resolved' && typeof row.resolvedOneMesPl === 'number' && row.resolvedOneMesPl > 0 ? 'winner' : 'problem';
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRetainedResidueSeparatorMinerReport['authority'] {
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

function featureVerdict(total: number, winners: number, problems: number): FeatureStat['verdict'] {
  if (total >= 4 && winners >= 4 && problems === 0) return 'positive_lane_candidate';
  if (total >= 4 && problems >= 3 && problems >= winners * 2) return 'negative_filter_candidate';
  return 'mixed_or_low_support';
}

function buildFeatureStats(rows: RetainedSlateFeatureRow[]): FeatureStat[] {
  const groups = new Map<string, RetainedSlateFeatureRow[]>();
  for (const row of rows) {
    for (const [feature, value] of Object.entries(row.features)) {
      const key = `${feature}=${value}`;
      groups.set(key, [...(groups.get(key) || []), row]);
    }
  }
  return [...groups.entries()].map(([key, groupRows]) => {
    const [feature, value] = key.split('=');
    const winnerSlates = groupRows.filter((row) => row.classLabel === 'winner').length;
    const problemSlates = groupRows.length - winnerSlates;
    return {
      feature,
      value,
      totalSlates: groupRows.length,
      winnerSlates,
      problemSlates,
      winRate: round(winnerSlates / groupRows.length),
      problemRate: round(problemSlates / groupRows.length),
      liveUsable: true,
      verdict: featureVerdict(groupRows.length, winnerSlates, problemSlates),
    };
  }).sort((a, b) => {
    const verdictOrder = { positive_lane_candidate: 0, negative_filter_candidate: 1, mixed_or_low_support: 2 };
    return verdictOrder[a.verdict] - verdictOrder[b.verdict] || b.totalSlates - a.totalSlates || a.feature.localeCompare(b.feature);
  });
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRetainedResidueSeparatorMinerReport, 'markdown'>): string {
  return [
    '# OpeningDrive ProofSelectionSignal Retained Residue Separator Miner',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-report separator miner. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Retained slates: ${report.summary.retainedSlates}.`,
    `- Retained winner/problem slates: ${report.summary.retainedWinnerSlates}/${report.summary.retainedProblemSlates}.`,
    `- Feature stats: ${report.summary.featureStats}.`,
    `- Positive lane candidates: ${report.summary.positiveLaneCandidates}.`,
    `- Negative filter candidates: ${report.summary.negativeFilterCandidates}.`,
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

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRetainedResidueSeparatorMinerReport(args: {
  reportDir?: string;
  filterSimulationPath?: string | null;
  outcomePath?: string | null;
  filterSimulation?: JsonReport | null;
  outcome?: JsonReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRetainedResidueSeparatorMinerReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const filterSimulationPath = args.filterSimulationPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-real-row-filter-simulation-');
  const outcomePath = args.outcomePath ?? latestMatchingFile(reportDir, 'unified-positive-held-local-preview-replay-package-outcome-');
  const filterSimulation = args.filterSimulation ?? readJson(filterSimulationPath);
  const outcome = args.outcome ?? readJson(outcomePath);
  const outcomeBySlate = new Map<string, OutcomeRow>();
  for (const row of outcome?.rows || []) {
    const id = slateId(row);
    const existing = outcomeBySlate.get(id);
    if (!existing || timeMs(row.proofTime) < timeMs(existing.proofTime)) outcomeBySlate.set(id, row);
  }
  const retainedSlateRows: RetainedSlateFeatureRow[] = (filterSimulation?.filteredSlateRows || [])
    .filter((row) => row.filterDecision === 'retained')
    .map((row) => {
      const earliest = outcomeBySlate.get(row.slateId);
      const riskPoints = earliest?.riskPoints ?? 0;
      const barsAfterProof = earliest?.barsAfterProof ?? 0;
      const label = classLabel(row);
      return {
        slateId: row.slateId,
        tradeDate: row.tradeDate,
        session: row.session,
        direction: row.direction,
        proofTime: row.proofTime,
        classLabel: label,
        outcomeLabel: row.outcomeLabel,
        resolvedOneMesPl: row.resolvedOneMesPl,
        riskPoints,
        barsAfterProof,
        rowCount: row.rows,
        entryHit: Boolean(earliest?.entryHitTime),
        features: {
          session: row.session,
          direction: row.direction,
          riskBucket: riskBucket(riskPoints),
          barsAfterProofBucket: barsBucket(barsAfterProof),
          proofWindow: proofWindow(row.proofTime),
          rowCountBucket: rowCountBucket(row.rows),
          entryFillState: earliest?.entryHitTime ? 'entry_hit' : 'entry_not_hit',
        },
      };
    });
  const featureStats = buildFeatureStats(retainedSlateRows);
  const blockers = [
    !filterSimulationPath ? 'missing filter simulation report path' : null,
    !outcomePath ? 'missing outcome report path' : null,
    !filterSimulation ? 'missing filter simulation report' : null,
    !outcome ? 'missing outcome report' : null,
    filterSimulation && filterSimulation.status !== 'pass' ? `filter simulation status ${filterSimulation.status}` : null,
    outcome && outcome.status !== 'pass' ? `outcome report status ${outcome.status}` : null,
    retainedSlateRows.length === 0 ? 'no retained slate rows found' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRetainedResidueSeparatorMinerReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_retained_residue_separator_miner',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, filterSimulationPath, outcomePath },
    assumptions: {
      savedReportsOnly: true,
      retainedSlatesOnly: true,
      earliestSlateRowNoLookahead: true,
      usesOnlyProofTimeAvailableOrClockDerivedFeatures: true,
      excludesOutcomeDerivedMfeMaeFromSeparators: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      retainedSlates: retainedSlateRows.length,
      retainedWinnerSlates: retainedSlateRows.filter((row) => row.classLabel === 'winner').length,
      retainedProblemSlates: retainedSlateRows.filter((row) => row.classLabel === 'problem').length,
      featureStats: featureStats.length,
      positiveLaneCandidates: featureStats.filter((row) => row.verdict === 'positive_lane_candidate').length,
      negativeFilterCandidates: featureStats.filter((row) => row.verdict === 'negative_filter_candidate').length,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length ? 'fix_inputs' : 'validate_low_risk_positive_lane_before_runtime_consumer',
    },
    retainedSlateRows,
    featureStats,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved-report inputs before retained separator mining.']
      : [
        'Treat positive lanes as review-priority candidates only; do not approve execution or loosen canExecute.',
        'Do not use single-feature negative filters live until they are validated against independent retained winners.',
        'Next validate any low-risk positive lane and any entry-not-filled residue as research-only rank overlay candidates.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRetainedResidueSeparatorMinerReport({
    reportDir,
    filterSimulationPath: readFlag(args, '--filter-simulation') || undefined,
    outcomePath: readFlag(args, '--outcome') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-retained-residue-separator-miner-${Date.now()}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  if (args.includes('--json')) console.log(JSON.stringify({ outPath, status: report.status, summary: report.summary, topFeatureStats: report.featureStats.slice(0, 8), blockers: report.blockers }, null, 2));
  else {
    console.log(report.markdown);
    console.log(`\nReport written: ${outPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
