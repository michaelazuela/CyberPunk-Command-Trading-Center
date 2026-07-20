import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type Verdict = 'positive_candidate' | 'negative_candidate' | 'mixed_or_too_small';

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
  resolvedOneMesPl: number | null;
}

interface FullDayRollupReport {
  status?: string;
  rows?: OutcomeRow[];
}

interface FeatureStatRow {
  feature: string;
  value: string;
  totalRows: number;
  winnerRows: number;
  problemRows: number;
  unresolvedRows: number;
  grossResolvedOneMesPl: number;
  winnerRate: number;
  problemRate: number;
  verdict: Verdict;
}

export interface RawOhlcScannerArtifactSweepLunchLongFullDayStableFieldMinerReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_lunch_long_full_day_stable_field_miner';
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
    filter: {
      setupType: 'SweepMssFvgRetrace';
      session: 'lunch';
      direction: 'LONG';
    };
  };
  assumptions: {
    savedReportsOnly: true;
    usesStablePreentryFieldsOnly: true;
    outcomesUsedOnlyForResearchLabels: true;
    noRuntimeRankingChange: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: {
    targetRows: number;
    featureStats: number;
    positiveCandidates: number;
    negativeCandidates: number;
    bestPositiveCandidate: string | null;
    bestNegativeCandidate: string | null;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'validate_positive_candidate' | 'inspect_negative_candidate' | 'keep_research_only' | 'fix_inputs';
  };
  featureStats: FeatureStatRow[];
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

function round(value: number): number {
  return Math.round(value * 100) / 100;
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

function isTarget(row: OutcomeRow): boolean {
  return row.setupType === 'SweepMssFvgRetrace' && row.session === 'lunch' && row.direction === 'LONG';
}

function isWinner(row: OutcomeRow): boolean {
  return row.outcomeStatus === 'resolved' && (row.resolvedOneMesPl ?? 0) > 0;
}

function isProblem(row: OutcomeRow): boolean {
  return row.outcomeLabel === 'stopped_before_t1' || row.outcomeLabel === 'no_fill' || row.outcomeLabel === 'no_target_or_stop_hit';
}

function fields(row: OutcomeRow): Record<string, string> {
  const t1Points = Math.abs(row.t1 - row.entry);
  const t2Points = Math.abs(row.t2 - row.entry);
  return {
    proofHour: proofHour(row.proofTime),
    proofMinuteBucket: proofMinuteBucket(row.proofTime),
    riskBucket: riskBucket(row.riskPoints),
    t1PointsBucket: targetBucket(t1Points),
    t2PointsBucket: targetBucket(t2Points),
    t1ToRiskBucket: targetToRiskBucket(t1Points, row.riskPoints),
    t2ToRiskBucket: targetToRiskBucket(t2Points, row.riskPoints),
  };
}

function verdictFor(args: { totalRows: number; winnerRate: number; problemRate: number; grossResolvedOneMesPl: number }): Verdict {
  if (args.totalRows >= 12 && args.winnerRate >= 0.75 && args.problemRate <= 0.25 && args.grossResolvedOneMesPl > 0) return 'positive_candidate';
  if (args.totalRows >= 12 && args.problemRate >= 0.55 && args.winnerRate <= 0.45) return 'negative_candidate';
  return 'mixed_or_too_small';
}

function featureStats(rows: OutcomeRow[]): FeatureStatRow[] {
  const groups = new Map<string, OutcomeRow[]>();
  for (const row of rows) {
    for (const [feature, value] of Object.entries(fields(row))) {
      groups.set(`${feature}=${value}`, [...(groups.get(`${feature}=${value}`) || []), row]);
    }
  }
  return [...groups.entries()].map(([key, groupRows]) => {
    const separator = key.indexOf('=');
    const feature = key.slice(0, separator);
    const value = key.slice(separator + 1);
    const winnerRows = groupRows.filter(isWinner).length;
    const problemRows = groupRows.filter(isProblem).length;
    const grossResolvedOneMesPl = round(groupRows.reduce((sum, row) => sum + (row.resolvedOneMesPl || 0), 0));
    const winnerRate = round(winnerRows / groupRows.length);
    const problemRate = round(problemRows / groupRows.length);
    return {
      feature,
      value,
      totalRows: groupRows.length,
      winnerRows,
      problemRows,
      unresolvedRows: groupRows.filter((row) => row.outcomeStatus === 'unresolved').length,
      grossResolvedOneMesPl,
      winnerRate,
      problemRate,
      verdict: verdictFor({ totalRows: groupRows.length, winnerRate, problemRate, grossResolvedOneMesPl }),
    };
  }).sort((a, b) => (
    Number(b.verdict === 'positive_candidate') - Number(a.verdict === 'positive_candidate')
    || Number(b.verdict === 'negative_candidate') - Number(a.verdict === 'negative_candidate')
    || b.winnerRate - a.winnerRate
    || b.grossResolvedOneMesPl - a.grossResolvedOneMesPl
    || a.feature.localeCompare(b.feature)
  ));
}

function authority(): RawOhlcScannerArtifactSweepLunchLongFullDayStableFieldMinerReport['authority'] {
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepLunchLongFullDayStableFieldMinerReport, 'markdown'>): string {
  return [
    '# Raw OHLC Scanner Artifact Sweep Lunch LONG Full-Day Stable Field Miner',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-report field miner. It uses stable pre-entry time/risk/target-geometry fields only. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Target rows: ${report.summary.targetRows}.`,
    `- Feature stats: ${report.summary.featureStats}.`,
    `- Positive/negative candidates: ${report.summary.positiveCandidates} / ${report.summary.negativeCandidates}.`,
    `- Best positive candidate: ${report.summary.bestPositiveCandidate || 'none'}.`,
    `- Best negative candidate: ${report.summary.bestNegativeCandidate || 'none'}.`,
    `- Runtime rank consumer allowed by this report: ${report.summary.runtimeRankConsumerAllowedByThisReport}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepLunchLongFullDayStableFieldMinerReport(args: {
  reportDir?: string;
  fullDayRollupPath?: string | null;
  fullDayRollup?: FullDayRollupReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepLunchLongFullDayStableFieldMinerReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const fullDayRollupPath = args.fullDayRollupPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-full-day-model-session-direction-rollup-');
  const fullDayRollup = args.fullDayRollup ?? readJson<FullDayRollupReport>(fullDayRollupPath);
  const targetRows = (fullDayRollup?.rows || []).filter(isTarget);
  const stats = featureStats(targetRows);
  const positiveCandidates = stats.filter((row) => row.verdict === 'positive_candidate');
  const negativeCandidates = stats.filter((row) => row.verdict === 'negative_candidate');
  const blockers = [
    !fullDayRollupPath && !args.fullDayRollup ? 'missing full-day rollup path' : null,
    !fullDayRollup ? 'missing full-day rollup report' : null,
    fullDayRollup && fullDayRollup.status !== 'pass' ? `full-day rollup status ${fullDayRollup.status}` : null,
    targetRows.length === 0 ? 'no SweepMssFvgRetrace lunch LONG full-day rows found' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactSweepLunchLongFullDayStableFieldMinerReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_lunch_long_full_day_stable_field_miner',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir,
      fullDayRollupPath,
      filter: {
        setupType: 'SweepMssFvgRetrace',
        session: 'lunch',
        direction: 'LONG',
      },
    },
    assumptions: {
      savedReportsOnly: true,
      usesStablePreentryFieldsOnly: true,
      outcomesUsedOnlyForResearchLabels: true,
      noRuntimeRankingChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      targetRows: targetRows.length,
      featureStats: stats.length,
      positiveCandidates: positiveCandidates.length,
      negativeCandidates: negativeCandidates.length,
      bestPositiveCandidate: positiveCandidates[0] ? `${positiveCandidates[0].feature}=${positiveCandidates[0].value}` : null,
      bestNegativeCandidate: negativeCandidates[0] ? `${negativeCandidates[0].feature}=${negativeCandidates[0].value}` : null,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length
        ? 'fix_inputs'
        : positiveCandidates.length
          ? 'validate_positive_candidate'
          : negativeCandidates.length
            ? 'inspect_negative_candidate'
            : 'keep_research_only',
    },
    featureStats: stats.slice(0, 100),
    blockers,
    recommendations: blockers.length
      ? ['Fix saved full-day rollup input before stable field mining.']
      : positiveCandidates.length
        ? ['Validate the best positive stable-field candidate with a separate no-lookahead selection simulation before any scanner-visible proposal.']
        : ['No stable pre-entry field candidate is strong enough for a guarded proposal from this pass.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildRawOhlcScannerArtifactSweepLunchLongFullDayStableFieldMinerReport({
    reportDir,
    fullDayRollupPath: readFlag(args, '--full-day-rollup') || undefined,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `raw-ohlc-scanner-artifact-sweep-lunch-long-full-day-stable-field-miner-${Date.now()}.json`);
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
