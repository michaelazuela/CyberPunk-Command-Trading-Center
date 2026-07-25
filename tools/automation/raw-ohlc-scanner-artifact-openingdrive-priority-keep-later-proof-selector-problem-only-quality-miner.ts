import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type ClassLabel = 'winner' | 'problem';
type Recommendation = 'validate_clean_problem_only_combos_against_broader_source' | 'broaden_source_before_runtime_consumer' | 'fix_inputs';

interface OverlayRow {
  slateId: string;
  tradeDate: string;
  session: string;
  direction: 'LONG' | 'SHORT';
  proofTime: string;
  classLabel: ClassLabel;
  outcomeLabel: string;
  resolvedOneMesPl: number | null;
  riskPoints: number;
  barsAfterProof: number;
  rowCount: number;
  entryHit: boolean;
  features: Record<string, string>;
  overlaySelected: boolean;
  overlayReason: string;
}

interface OverlayReport {
  status?: string;
  overlayRows?: OverlayRow[];
}

interface FeatureComboRow {
  featureCombo: string;
  matchedGroups: number;
  matchedProblemOnlyGroups: number;
  matchedNonProblemGroups: number;
  matchedRows: number;
  matchedProblemRows: number;
  matchedWinnerRows: number;
  problemOnlyPrecision: number;
  liveUsable: true;
  verdict: 'clean_problem_only_candidate' | 'contaminated_by_winners_or_mixed_groups';
}

interface ProblemOnlyGroupRow {
  groupId: string;
  slateRows: number;
  problemRows: number;
  winnerRows: number;
  directions: string[];
  proofWindows: string[];
  riskBuckets: string[];
  rowCountBuckets: string[];
  outcomeLabels: string[];
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProblemOnlyQualityMinerReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_problem_only_quality_miner';
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
    overlaySimulationPath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    problemOnlyMeansNoWinnerInSameDateSessionGroup: true;
    usesOnlyProofTimeAvailableOrClockDerivedFields: true;
    excludesOutcomeDerivedMfeMaeAndEntryHit: true;
    noRuntimeRankingChange: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: {
    dateSessionGroups: number;
    problemOnlyGroups: number;
    featureCombosTested: number;
    cleanProblemOnlyCombos: number;
    broadCleanProblemOnlyCombos: number;
    topCleanProblemOnlyCombo: string | null;
    topCleanProblemOnlyMatchedGroups: number;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: Recommendation;
  };
  problemOnlyGroups: ProblemOnlyGroupRow[];
  featureCombos: FeatureComboRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const FEATURE_KEYS = ['session', 'direction', 'riskBucket', 'proofWindow', 'rowCountBucket'] as const;

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

function readJson(filePath: string | null): OverlayReport | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as OverlayReport;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function groupId(row: OverlayRow): string {
  return `${row.tradeDate}|${row.session}`;
}

function featureValue(row: OverlayRow, key: typeof FEATURE_KEYS[number]): string {
  if (key === 'session') return row.session;
  if (key === 'direction') return row.direction;
  return row.features[key] || 'missing';
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function combinations<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [[]];
  if (items.length < size) return [];
  if (size === 1) return items.map((item) => [item]);
  return items.flatMap((item, index) => combinations(items.slice(index + 1), size - 1).map((rest) => [item, ...rest]));
}

function allCombos(rows: OverlayRow[]): string[][] {
  const combos: string[][] = [];
  for (const keys of [1, 2, 3].flatMap((size) => combinations([...FEATURE_KEYS], size))) {
    const values = uniqueSorted(rows.map((row) => keys.map((key) => `${key}=${featureValue(row, key)}`).join('&')));
    combos.push(...values.map((value) => value.split('&')));
  }
  return uniqueSorted(combos.map((combo) => combo.join('&'))).map((combo) => combo.split('&'));
}

function rowMatchesCombo(row: OverlayRow, combo: string[]): boolean {
  return combo.every((part) => {
    const [key, value] = part.split('=');
    return FEATURE_KEYS.includes(key as typeof FEATURE_KEYS[number]) && featureValue(row, key as typeof FEATURE_KEYS[number]) === value;
  });
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProblemOnlyQualityMinerReport['authority'] {
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProblemOnlyQualityMinerReport, 'markdown'>): string {
  return [
    '# OpeningDrive ProofSelectionSignal Problem-Only Quality Miner',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-report feature miner. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Date/session groups: ${report.summary.dateSessionGroups}.`,
    `- Problem-only groups: ${report.summary.problemOnlyGroups}.`,
    `- Feature combos tested: ${report.summary.featureCombosTested}.`,
    `- Clean problem-only combos: ${report.summary.cleanProblemOnlyCombos}.`,
    `- Broad clean problem-only combos: ${report.summary.broadCleanProblemOnlyCombos}.`,
    `- Top clean problem-only combo: ${report.summary.topCleanProblemOnlyCombo || 'none'}.`,
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

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProblemOnlyQualityMinerReport(args: {
  reportDir?: string;
  overlaySimulationPath?: string | null;
  overlaySimulation?: OverlayReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProblemOnlyQualityMinerReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const overlaySimulationPath = args.overlaySimulationPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-positive-lane-overlay-simulation-');
  const overlaySimulation = args.overlaySimulation ?? readJson(overlaySimulationPath);
  const rows = overlaySimulation?.overlayRows || [];
  const groups = new Map<string, OverlayRow[]>();
  for (const row of rows) groups.set(groupId(row), [...(groups.get(groupId(row)) || []), row]);
  const problemOnlyGroupIds = new Set([...groups.entries()].filter(([, groupRows]) => groupRows.every((row) => row.classLabel === 'problem')).map(([id]) => id));
  const problemOnlyGroups: ProblemOnlyGroupRow[] = [...groups.entries()]
    .filter(([id]) => problemOnlyGroupIds.has(id))
    .map(([id, groupRows]) => ({
      groupId: id,
      slateRows: groupRows.length,
      problemRows: groupRows.filter((row) => row.classLabel === 'problem').length,
      winnerRows: groupRows.filter((row) => row.classLabel === 'winner').length,
      directions: uniqueSorted(groupRows.map((row) => row.direction)),
      proofWindows: uniqueSorted(groupRows.map((row) => row.features.proofWindow || 'missing')),
      riskBuckets: uniqueSorted(groupRows.map((row) => row.features.riskBucket || 'missing')),
      rowCountBuckets: uniqueSorted(groupRows.map((row) => row.features.rowCountBucket || 'missing')),
      outcomeLabels: uniqueSorted(groupRows.map((row) => row.outcomeLabel)),
    }))
    .sort((a, b) => a.groupId.localeCompare(b.groupId));
  const featureCombos = allCombos(rows).map((combo): FeatureComboRow => {
    const matchedRows = rows.filter((row) => rowMatchesCombo(row, combo));
    const matchedGroupIds = new Set(matchedRows.map(groupId));
    const matchedProblemOnlyGroups = [...matchedGroupIds].filter((id) => problemOnlyGroupIds.has(id)).length;
    const matchedNonProblemGroups = matchedGroupIds.size - matchedProblemOnlyGroups;
    const verdict = matchedProblemOnlyGroups > 0 && matchedNonProblemGroups === 0
      ? 'clean_problem_only_candidate'
      : 'contaminated_by_winners_or_mixed_groups';
    return {
      featureCombo: combo.join('&'),
      matchedGroups: matchedGroupIds.size,
      matchedProblemOnlyGroups,
      matchedNonProblemGroups,
      matchedRows: matchedRows.length,
      matchedProblemRows: matchedRows.filter((row) => row.classLabel === 'problem').length,
      matchedWinnerRows: matchedRows.filter((row) => row.classLabel === 'winner').length,
      problemOnlyPrecision: matchedGroupIds.size ? round(matchedProblemOnlyGroups / matchedGroupIds.size) : 0,
      liveUsable: true,
      verdict,
    };
  }).sort((a, b) => (
    Number(b.verdict === 'clean_problem_only_candidate') - Number(a.verdict === 'clean_problem_only_candidate')
    || b.matchedProblemOnlyGroups - a.matchedProblemOnlyGroups
    || a.featureCombo.localeCompare(b.featureCombo)
  ));
  const blockers = [
    !overlaySimulationPath ? 'missing positive-lane overlay simulation report path' : null,
    !overlaySimulation ? 'missing positive-lane overlay simulation report' : null,
    overlaySimulation && overlaySimulation.status !== 'pass' ? `positive-lane overlay simulation status ${overlaySimulation.status}` : null,
    rows.length === 0 ? 'overlay simulation has no rows to mine' : null,
    groups.size === 0 ? 'overlay simulation has no date/session groups' : null,
  ].filter((item): item is string => Boolean(item));
  const cleanCombos = featureCombos.filter((row) => row.verdict === 'clean_problem_only_candidate');
  const broadCleanCombos = cleanCombos.filter((row) => row.matchedProblemOnlyGroups >= 2);
  const recommendation: Recommendation = blockers.length
    ? 'fix_inputs'
    : broadCleanCombos.length
      ? 'validate_clean_problem_only_combos_against_broader_source'
      : 'broaden_source_before_runtime_consumer';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProblemOnlyQualityMinerReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_problem_only_quality_miner',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, overlaySimulationPath },
    assumptions: {
      savedReportsOnly: true,
      problemOnlyMeansNoWinnerInSameDateSessionGroup: true,
      usesOnlyProofTimeAvailableOrClockDerivedFields: true,
      excludesOutcomeDerivedMfeMaeAndEntryHit: true,
      noRuntimeRankingChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      dateSessionGroups: groups.size,
      problemOnlyGroups: problemOnlyGroups.length,
      featureCombosTested: featureCombos.length,
      cleanProblemOnlyCombos: cleanCombos.length,
      broadCleanProblemOnlyCombos: broadCleanCombos.length,
      topCleanProblemOnlyCombo: cleanCombos[0]?.featureCombo || null,
      topCleanProblemOnlyMatchedGroups: cleanCombos[0]?.matchedProblemOnlyGroups || 0,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation,
    },
    problemOnlyGroups,
    featureCombos: featureCombos.slice(0, 50),
    blockers,
    recommendations: blockers.length
      ? ['Fix overlay simulation input before problem-only quality mining.']
      : broadCleanCombos.length
        ? [
          'Validate broad clean problem-only combos against a broader source before any scanner-visible rank consumer.',
          'Do not use this single saved set to remove raidReclaim, Sweep, canExecute, or approved model gates.',
        ]
        : [
          'Do not install a runtime rank consumer from this miner; clean problem-only combos are too narrow or absent.',
          'Broaden the candidate source or add richer proof-time fields before proposing any live-facing quality filter.',
        ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorProblemOnlyQualityMinerReport({
    reportDir,
    overlaySimulationPath: readFlag(args, '--overlay-simulation') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-problem-only-quality-miner-${Date.now()}.json`);
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
