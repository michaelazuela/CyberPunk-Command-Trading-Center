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
  outcomeLabel: string;
  outcomeStatus: 'resolved' | 'unresolved' | 'blocked';
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  riskPoints: number;
  resolvedOneMesPl: number | null;
}

interface FullDayRollupReport {
  status?: string;
  rows?: OutcomeRow[];
}

interface StableFieldMinerReport {
  status?: string;
  summary?: {
    bestPositiveCandidate?: string | null;
    bestNegativeCandidate?: string | null;
  };
}

interface SlateRow {
  slateId: string;
  rows: number;
  baselineTicketId: string | null;
  baselineOutcomeLabel: string | null;
  baselineOneMesPl: number | null;
  simulatedTicketId: string | null;
  simulatedOutcomeLabel: string | null;
  simulatedOneMesPl: number | null;
  topChanged: boolean;
  deltaOneMesPl: number | null;
}

export interface RawOhlcScannerArtifactSweepLunchShortFullDayStableSelectionSimulationReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_lunch_short_full_day_stable_selection_simulation';
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
    fullDayRollupPath: string | null;
    stableFieldMinerPath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    selectionSimulationOnly: true;
    baselineUsesEarliestProofPerSlate: true;
    simulatedUsesStablePreentryBucketsOnly: true;
    outcomesUsedOnlyForEvaluation: true;
    noRuntimeRankingChange: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  scoring: {
    positiveCandidate: string | null;
    negativeCandidate: string | null;
    positiveBoostPoints: number;
    negativePenaltyPoints: number;
  };
  summary: {
    targetRows: number;
    slates: number;
    changedSlates: number;
    baselineTopOneMesPl: number | null;
    simulatedTopOneMesPl: number | null;
    topSelectionDeltaOneMesPl: number | null;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'validate_with_scanner_fields' | 'keep_research_only' | 'fix_inputs';
  };
  slates: SlateRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const POSITIVE_BOOST_POINTS = 100;
const NEGATIVE_PENALTY_POINTS = 100;

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

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function bucket(value: number, cuts: number[], labels: string[]): string {
  for (let i = 0; i < cuts.length; i += 1) if (value < cuts[i]) return labels[i];
  return labels[labels.length - 1];
}

function proofHour(proofTime: string): string {
  return proofTime.match(/T(\d{2}):/)?.[1] || 'missing';
}

function proofMinuteBucket(proofTime: string): string {
  const minute = Number(proofTime.match(/T\d{2}:(\d{2})/)?.[1]);
  if (!Number.isFinite(minute)) return 'missing';
  if (minute < 15) return '00_to_14';
  if (minute < 30) return '15_to_29';
  if (minute < 45) return '30_to_44';
  return '45_to_59';
}

function riskBucket(value: number): string {
  if (!Number.isFinite(value)) return 'missing';
  if (value <= 8) return '<=8';
  if (value <= 12) return '8.25-12';
  if (value <= 18) return '12.25-18';
  if (value <= 25) return '18.25-25';
  return '>25';
}

function targetBucket(points: number): string {
  if (!Number.isFinite(points)) return 'missing';
  return bucket(points, [12, 20, 30, 45], ['lt_12', '12_to_19', '20_to_29', '30_to_44', 'gte_45']);
}

function targetToRiskBucket(targetPoints: number, riskPoints: number): string {
  if (!Number.isFinite(targetPoints) || !Number.isFinite(riskPoints) || riskPoints <= 0) return 'missing';
  return bucket(targetPoints / riskPoints, [1.5, 1.75, 2.25, 3], ['lt_1_5r', '1_5_to_1_74r', '1_75_to_2_24r', '2_25_to_2_99r', 'gte_3r']);
}

function featureValue(row: OutcomeRow, feature: string): string {
  const t1Points = Math.abs(row.t1 - row.entry);
  const t2Points = Math.abs(row.t2 - row.entry);
  const values: Record<string, string> = {
    proofHour: proofHour(row.proofTime),
    proofMinuteBucket: proofMinuteBucket(row.proofTime),
    riskBucket: riskBucket(row.riskPoints),
    t1PointsBucket: targetBucket(t1Points),
    t2PointsBucket: targetBucket(t2Points),
    t1ToRiskBucket: targetToRiskBucket(t1Points, row.riskPoints),
    t2ToRiskBucket: targetToRiskBucket(t2Points, row.riskPoints),
  };
  return values[feature] || 'missing';
}

function parseCandidate(candidate: string | null | undefined): { feature: string; value: string } | null {
  if (!candidate) return null;
  const index = candidate.indexOf('=');
  if (index <= 0) return null;
  return { feature: candidate.slice(0, index), value: candidate.slice(index + 1) };
}

function matches(row: OutcomeRow, candidate: { feature: string; value: string } | null): boolean {
  return Boolean(candidate && featureValue(row, candidate.feature) === candidate.value);
}

function score(row: OutcomeRow, positive: { feature: string; value: string } | null, negative: { feature: string; value: string } | null): number {
  return (matches(row, positive) ? POSITIVE_BOOST_POINTS : 0) - (matches(row, negative) ? NEGATIVE_PENALTY_POINTS : 0);
}

function isTarget(row: OutcomeRow): boolean {
  return row.setupType === 'NoInstalledSetup' && row.session === 'lunch' && row.direction === 'SHORT';
}

function groupBySlate(rows: OutcomeRow[]): Map<string, OutcomeRow[]> {
  const groups = new Map<string, OutcomeRow[]>();
  for (const row of rows) {
    const slateId = `${row.tradeDate}|${row.session}`;
    groups.set(slateId, [...(groups.get(slateId) || []), row]);
  }
  return groups;
}

function compareProof(a: OutcomeRow, b: OutcomeRow): number {
  return a.proofTime.localeCompare(b.proofTime) || a.ticketId.localeCompare(b.ticketId);
}

function compareSimulated(positive: { feature: string; value: string } | null, negative: { feature: string; value: string } | null) {
  return (a: OutcomeRow, b: OutcomeRow): number => (
    score(b, positive, negative) - score(a, positive, negative)
    || compareProof(a, b)
  );
}

function buildSlates(rows: OutcomeRow[], positive: { feature: string; value: string } | null, negative: { feature: string; value: string } | null): SlateRow[] {
  return [...groupBySlate(rows).entries()].map(([slateId, slateRows]) => {
    const baseline = [...slateRows].sort(compareProof)[0] || null;
    const simulated = [...slateRows].sort(compareSimulated(positive, negative))[0] || null;
    return {
      slateId,
      rows: slateRows.length,
      baselineTicketId: baseline?.ticketId || null,
      baselineOutcomeLabel: baseline?.outcomeLabel || null,
      baselineOneMesPl: baseline?.resolvedOneMesPl ?? null,
      simulatedTicketId: simulated?.ticketId || null,
      simulatedOutcomeLabel: simulated?.outcomeLabel || null,
      simulatedOneMesPl: simulated?.resolvedOneMesPl ?? null,
      topChanged: Boolean(baseline && simulated && baseline.ticketId !== simulated.ticketId),
      deltaOneMesPl: typeof baseline?.resolvedOneMesPl === 'number' && typeof simulated?.resolvedOneMesPl === 'number'
        ? round(simulated.resolvedOneMesPl - baseline.resolvedOneMesPl)
        : null,
    };
  }).sort((a, b) => a.slateId.localeCompare(b.slateId));
}

function authority(): RawOhlcScannerArtifactSweepLunchShortFullDayStableSelectionSimulationReport['authority'] {
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepLunchShortFullDayStableSelectionSimulationReport, 'markdown'>): string {
  return [
    '# Raw OHLC Scanner Artifact Sweep Lunch SHORT Full-Day Stable Selection Simulation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-report selection simulation. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Target rows: ${report.summary.targetRows}.`,
    `- Slates: ${report.summary.slates}.`,
    `- Changed slates: ${report.summary.changedSlates}.`,
    `- Baseline/simulated top one-MES P/L: ${report.summary.baselineTopOneMesPl ?? '-'} / ${report.summary.simulatedTopOneMesPl ?? '-'}.`,
    `- Top-selection delta: ${report.summary.topSelectionDeltaOneMesPl ?? '-'}.`,
    `- Runtime rank consumer allowed by this report: ${report.summary.runtimeRankConsumerAllowedByThisReport}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepLunchShortFullDayStableSelectionSimulationReport(args: {
  reportDir?: string;
  fullDayRollupPath?: string | null;
  stableFieldMinerPath?: string | null;
  fullDayRollup?: FullDayRollupReport | null;
  stableFieldMiner?: StableFieldMinerReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepLunchShortFullDayStableSelectionSimulationReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const fullDayRollupPath = args.fullDayRollupPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-full-day-model-session-direction-rollup-');
  const stableFieldMinerPath = args.stableFieldMinerPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-sweep-lunch-short-full-day-stable-field-miner-');
  const fullDayRollup = args.fullDayRollup ?? readJson<FullDayRollupReport>(fullDayRollupPath);
  const stableFieldMiner = args.stableFieldMiner ?? readJson<StableFieldMinerReport>(stableFieldMinerPath);
  const positiveCandidate = stableFieldMiner?.summary?.bestPositiveCandidate || null;
  const negativeCandidate = stableFieldMiner?.summary?.bestNegativeCandidate || null;
  const positive = parseCandidate(positiveCandidate);
  const negative = parseCandidate(negativeCandidate);
  const targetRows = (fullDayRollup?.rows || []).filter(isTarget);
  const slates = buildSlates(targetRows, positive, negative);
  const baselineTopOneMesPl = sum(slates.map((slate) => slate.baselineOneMesPl));
  const simulatedTopOneMesPl = sum(slates.map((slate) => slate.simulatedOneMesPl));
  const delta = sum(slates.map((slate) => slate.deltaOneMesPl));
  const blockers = [
    !fullDayRollupPath && !args.fullDayRollup ? 'missing full-day rollup path' : null,
    !stableFieldMinerPath && !args.stableFieldMiner ? 'missing stable field miner path' : null,
    !fullDayRollup ? 'missing full-day rollup report' : null,
    !stableFieldMiner ? 'missing stable field miner report' : null,
    fullDayRollup && fullDayRollup.status !== 'pass' ? `full-day rollup status ${fullDayRollup.status}` : null,
    stableFieldMiner && stableFieldMiner.status !== 'pass' ? `stable field miner status ${stableFieldMiner.status}` : null,
    !positive ? 'missing parseable positive candidate' : null,
    !negative ? 'missing parseable negative candidate' : null,
    targetRows.length === 0 ? 'no NoInstalledSetup lunch SHORT full-day rows found' : null,
    slates.length === 0 ? 'no lunch SHORT slates found' : null,
  ].filter((item): item is string => Boolean(item));
  const proposalWorthValidating = !blockers.length && typeof delta === 'number' && delta > 0 && slates.some((slate) => slate.topChanged);
  const base: Omit<RawOhlcScannerArtifactSweepLunchShortFullDayStableSelectionSimulationReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_lunch_short_full_day_stable_selection_simulation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, fullDayRollupPath, stableFieldMinerPath },
    assumptions: {
      savedReportsOnly: true,
      selectionSimulationOnly: true,
      baselineUsesEarliestProofPerSlate: true,
      simulatedUsesStablePreentryBucketsOnly: true,
      outcomesUsedOnlyForEvaluation: true,
      noRuntimeRankingChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    scoring: {
      positiveCandidate,
      negativeCandidate,
      positiveBoostPoints: POSITIVE_BOOST_POINTS,
      negativePenaltyPoints: NEGATIVE_PENALTY_POINTS,
    },
    summary: {
      targetRows: targetRows.length,
      slates: slates.length,
      changedSlates: slates.filter((slate) => slate.topChanged).length,
      baselineTopOneMesPl,
      simulatedTopOneMesPl,
      topSelectionDeltaOneMesPl: delta,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length ? 'fix_inputs' : proposalWorthValidating ? 'validate_with_scanner_fields' : 'keep_research_only',
    },
    slates,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved rollup/miner inputs before stable selection simulation.']
      : proposalWorthValidating
        ? ['Validate the same buckets against scanner-owned fields before any live-facing proposal.']
        : ['Keep the stable-field buckets research-only; this simulation did not prove top-selection improvement.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildRawOhlcScannerArtifactSweepLunchShortFullDayStableSelectionSimulationReport({
    reportDir,
    fullDayRollupPath: readFlag(args, '--full-day-rollup') || undefined,
    stableFieldMinerPath: readFlag(args, '--stable-field-miner') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `raw-ohlc-scanner-artifact-sweep-lunch-short-full-day-stable-selection-simulation-${Date.now()}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  if (args.includes('--json')) console.log(JSON.stringify({ outPath, status: report.status, summary: report.summary, scoring: report.scoring, blockers: report.blockers }, null, 2));
  else {
    console.log(report.markdown);
    console.log(`\nReport written: ${outPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
