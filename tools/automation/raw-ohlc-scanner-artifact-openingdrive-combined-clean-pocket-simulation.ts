import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDriveFineRiskSlateDryRunReport,
} from './raw-ohlc-scanner-artifact-openingdrive-fine-risk-slate-dry-run';
import type {
  RawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport,
} from './raw-ohlc-scanner-artifact-openingdrive-fresh-replay-package';
import type {
  RawOhlcScannerArtifactOpeningDriveTightLongLaneMinerReport,
} from './raw-ohlc-scanner-artifact-openingdrive-tight-long-lane-miner';

type ScenarioName =
  | 'fine_risk_only'
  | 'fine_risk_plus_tight_10am_risk_4_to_5'
  | 'fine_risk_plus_all_live_zero_loss_tight_buckets';

interface CliOptions {
  slateDryRun: string;
  freshReplayPackage: string | null;
  tightLongMiner: string;
  outDir: string;
  json: boolean;
}

interface Authority {
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
}

interface SimulationRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  proofTime: string;
  direction: string;
  selector: string;
  riskPoints: number;
  outcomeLabel: string;
  outcomeStatus: string;
  oneMesPl: number | null;
  source: 'fine_risk' | 'tight_long_clean_pocket';
  addedBy: string;
}

interface Summary {
  rows: number;
  winners: number;
  losses: number;
  otherResolved: number;
  unresolved: number;
  oneMesPl: number | null;
  avgRiskPoints: number | null;
}

interface ScenarioSummary extends Summary {
  scenario: ScenarioName;
  addedTightLongRows: number;
  addedTightLongWinners: number;
  addedTightLongLosses: number;
  deltaVsFineRiskOnlyOneMesPl: number | null;
  deltaVsBroadBaselineOneMesPl: number | null;
  lossFree: boolean;
  livePromotionAllowedRows: 0;
}

export interface RawOhlcScannerArtifactOpeningDriveCombinedCleanPocketSimulationReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_combined_clean_pocket_simulation';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    slateDryRunPath: string;
    freshReplayPackagePath: string | null;
    tightLongMinerPath: string;
  };
  assumptions: {
    savedReportsOnly: true;
    simulationOnly: true;
    fineRiskRowsComeFromSlateDryRun: true;
    tightLongRowsComeFromRemovedSlateRows: true;
    onlyLiveUsableNoLookaheadBuckets: true;
    dateBucketsAreResearchContextOnly: true;
    outcomeFieldsAreEvaluationOnly: true;
    scannerVisibleInstallAllowedNow: false;
    livePromotionAllowed: false;
  };
  baseline: {
    broadSelected: Summary;
    fineRiskOnly: Summary;
  };
  scenarios: ScenarioSummary[];
  selectedRows: SimulationRow[];
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

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  const matches = fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
}

export function parseRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketSimulationArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const slateDryRun = readFlag(args, '--slate-dry-run') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-fine-risk-slate-dry-run-\d+\.json$/);
  const freshReplayPackage = readFlag(args, '--fresh-replay-package');
  const tightLongMiner = readFlag(args, '--tight-long-miner') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-tight-long-lane-miner-\d+\.json$/);
  if (!slateDryRun) throw new Error('--slate-dry-run is required.');
  if (!tightLongMiner) throw new Error('--tight-long-miner is required.');
  return { slateDryRun, freshReplayPackage, tightLongMiner, outDir, json: args.includes('--json') };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): Authority {
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

function isWinner(row: { outcomeStatus: string; outcomeLabel: string }): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 't1_and_t2_hit';
}

function isLoss(row: { outcomeStatus: string; outcomeLabel: string }): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 'stopped_before_t1';
}

function sum(rows: Array<{ oneMesPl: number | null }>): number | null {
  const values = rows.map((row) => row.oneMesPl).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return values.length ? round(values.reduce((total, value) => total + value, 0)) : null;
}

function avg(rows: Array<{ riskPoints: number }>): number | null {
  const values = rows.map((row) => row.riskPoints).filter((value) => Number.isFinite(value));
  return values.length ? round(values.reduce((total, value) => total + value, 0) / values.length) : null;
}

function summarize(rows: Array<{ outcomeStatus: string; outcomeLabel: string; oneMesPl: number | null; riskPoints: number }>): Summary {
  return {
    rows: rows.length,
    winners: rows.filter(isWinner).length,
    losses: rows.filter(isLoss).length,
    otherResolved: rows.filter((row) => row.outcomeStatus === 'resolved' && !isWinner(row) && !isLoss(row)).length,
    unresolved: rows.filter((row) => row.outcomeStatus !== 'resolved').length,
    oneMesPl: sum(rows),
    avgRiskPoints: avg(rows),
  };
}

function hourBucket(proofTime: string): string {
  const hour = new Date(proofTime).getHours().toString().padStart(2, '0');
  return `${hour}:00-${hour}:59`;
}

function riskBucket(riskPoints: number): string {
  if (riskPoints < 5) return 'risk_4_to_5';
  if (riskPoints < 6) return 'risk_5_to_6';
  if (riskPoints < 7) return 'risk_6_to_7';
  return 'risk_7_to_8';
}

function fineRiskBucket(riskPoints: number): string {
  const lower = Math.floor(riskPoints * 2) / 2;
  const upper = lower + 0.5;
  return `risk_${lower.toFixed(1)}_to_${upper.toFixed(1)}`;
}

function minuteBucket(proofTime: string): string {
  return new Date(proofTime).getMinutes().toString().padStart(2, '0');
}

function rowBucketValue(row: SimulationRow, bucketType: string): string | null {
  if (bucketType === 'hourBucket') return hourBucket(row.proofTime);
  if (bucketType === 'minuteBucket') return minuteBucket(row.proofTime);
  if (bucketType === 'riskBucket') return riskBucket(row.riskPoints);
  if (bucketType === 'fineRiskBucket') return fineRiskBucket(row.riskPoints);
  if (bucketType === 'hourBucket|riskBucket') return `${hourBucket(row.proofTime)}|${riskBucket(row.riskPoints)}`;
  return null;
}

function fineRiskRows(report: RawOhlcScannerArtifactOpeningDriveFineRiskSlateDryRunReport, freshReplayPackage: RawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport | null): SimulationRow[] {
  const sourceRows = freshReplayPackage
    ? freshReplayPackage.selectedRows.filter((row) => row.selector === 'fine_risk_24_to_32')
    : report.changedRows.filter((row) => row.slateAction === 'retained_by_fine_risk');
  return sourceRows
    .map((row) => ({
      ticketId: row.ticketId,
      tradeDate: row.tradeDate,
      session: row.session,
      proofTime: row.proofTime,
      direction: row.direction,
      selector: row.selector,
      riskPoints: row.riskPoints,
      outcomeLabel: row.outcomeLabel,
      outcomeStatus: row.outcomeStatus,
      oneMesPl: row.oneMesPl,
      source: 'fine_risk' as const,
      addedBy: 'fine_risk_only',
    }));
}

function tightLongRows(report: RawOhlcScannerArtifactOpeningDriveFineRiskSlateDryRunReport): SimulationRow[] {
  return report.changedRows
    .filter((row) => row.slateAction === 'removed_by_fine_risk' && row.selector === 'tight_long_risk_4_to_8')
    .map((row) => ({
      ticketId: row.ticketId,
      tradeDate: row.tradeDate,
      session: row.session,
      proofTime: row.proofTime,
      direction: row.direction,
      selector: row.selector,
      riskPoints: row.riskPoints,
      outcomeLabel: row.outcomeLabel,
      outcomeStatus: row.outcomeStatus,
      oneMesPl: row.oneMesPl,
      source: 'tight_long_clean_pocket',
      addedBy: 'unselected',
    }));
}

function dedupe(rows: SimulationRow[]): SimulationRow[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.ticketId)) return false;
    seen.add(row.ticketId);
    return true;
  });
}

function scenarioRows(
  scenario: ScenarioName,
  fineRows: SimulationRow[],
  tightRows: SimulationRow[],
  miner: RawOhlcScannerArtifactOpeningDriveTightLongLaneMinerReport,
): SimulationRow[] {
  if (scenario === 'fine_risk_only') return fineRows;
  if (scenario === 'fine_risk_plus_tight_10am_risk_4_to_5') {
    return dedupe([
      ...fineRows,
      ...tightRows
        .filter((row) => hourBucket(row.proofTime) === '10:00-10:59' && riskBucket(row.riskPoints) === 'risk_4_to_5')
        .map((row) => ({ ...row, addedBy: 'tight_10am_risk_4_to_5' })),
    ]);
  }
  const liveZeroLossBuckets = miner.zeroLossBuckets.filter((bucket) => bucket.liveUsable);
  const selectedTightRows = tightRows.filter((row) => liveZeroLossBuckets.some((bucket) => rowBucketValue(row, bucket.bucketType) === bucket.key));
  return dedupe([
    ...fineRows,
    ...selectedTightRows.map((row) => ({ ...row, addedBy: 'all_live_zero_loss_tight_buckets' })),
  ]);
}

function delta(current: number | null, baseline: number | null): number | null {
  return current === null || baseline === null ? null : round(current - baseline);
}

function scenarioSummary(
  scenario: ScenarioName,
  rows: SimulationRow[],
  fineOnlySummary: Summary,
  broadSummary: Summary,
): ScenarioSummary {
  const summary = summarize(rows);
  const added = rows.filter((row) => row.source === 'tight_long_clean_pocket');
  return {
    scenario,
    ...summary,
    addedTightLongRows: added.length,
    addedTightLongWinners: added.filter(isWinner).length,
    addedTightLongLosses: added.filter(isLoss).length,
    deltaVsFineRiskOnlyOneMesPl: delta(summary.oneMesPl, fineOnlySummary.oneMesPl),
    deltaVsBroadBaselineOneMesPl: delta(summary.oneMesPl, broadSummary.oneMesPl),
    lossFree: summary.losses === 0,
    livePromotionAllowedRows: 0,
  };
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDriveCombinedCleanPocketSimulationReport, 'markdown'>): string {
  return [
    '# OpeningDrive Combined Clean-Pocket Simulation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only package simulation. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Baselines',
    `- Broad selected W/L/O/U/P/L: ${report.baseline.broadSelected.winners}/${report.baseline.broadSelected.losses}/${report.baseline.broadSelected.otherResolved}/${report.baseline.broadSelected.unresolved}/${report.baseline.broadSelected.oneMesPl ?? '-'}.`,
    `- Fine-risk-only W/L/O/U/P/L: ${report.baseline.fineRiskOnly.winners}/${report.baseline.fineRiskOnly.losses}/${report.baseline.fineRiskOnly.otherResolved}/${report.baseline.fineRiskOnly.unresolved}/${report.baseline.fineRiskOnly.oneMesPl ?? '-'}.`,
    '',
    '## Scenarios',
    '| Scenario | Rows | W/L/O/U | P/L | Added Tight Rows | Added W/L | Delta vs Fine | Delta vs Broad | Loss Free |',
    '|---|---:|---|---:|---:|---|---:|---:|---|',
    ...report.scenarios.map((row) => `| ${row.scenario} | ${row.rows} | ${row.winners}/${row.losses}/${row.otherResolved}/${row.unresolved} | ${row.oneMesPl ?? '-'} | ${row.addedTightLongRows} | ${row.addedTightLongWinners}/${row.addedTightLongLosses} | ${row.deltaVsFineRiskOnlyOneMesPl ?? '-'} | ${row.deltaVsBroadBaselineOneMesPl ?? '-'} | ${row.lossFree} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketSimulationReport(args: {
  slateDryRunPath: string;
  slateDryRun: RawOhlcScannerArtifactOpeningDriveFineRiskSlateDryRunReport | null;
  freshReplayPackagePath?: string | null;
  freshReplayPackage?: RawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport | null;
  tightLongMinerPath: string;
  tightLongMiner: RawOhlcScannerArtifactOpeningDriveTightLongLaneMinerReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDriveCombinedCleanPocketSimulationReport {
  const freshReplayPackage = args.freshReplayPackage || null;
  const fineRows = args.slateDryRun ? fineRiskRows(args.slateDryRun, freshReplayPackage) : [];
  const tightRows = args.slateDryRun ? tightLongRows(args.slateDryRun) : [];
  const broadSelected = args.slateDryRun?.summary.baselineSummary || summarize([]);
  const fineOnlySummary = summarize(fineRows);
  const scenarioNames: ScenarioName[] = [
    'fine_risk_only',
    'fine_risk_plus_tight_10am_risk_4_to_5',
    'fine_risk_plus_all_live_zero_loss_tight_buckets',
  ];
  const scenarioRowSets = args.tightLongMiner
    ? scenarioNames.map((scenario) => ({ scenario, rows: scenarioRows(scenario, fineRows, tightRows, args.tightLongMiner) }))
    : [];
  const scenarios = scenarioRowSets.map((item) => scenarioSummary(item.scenario, item.rows, fineOnlySummary, broadSelected));
  const selectedRows = scenarioRowSets.find((item) => item.scenario === 'fine_risk_plus_tight_10am_risk_4_to_5')?.rows || [];
  const bestLossFree = scenarios
    .filter((scenario) => scenario.lossFree)
    .sort((a, b) => (b.oneMesPl ?? 0) - (a.oneMesPl ?? 0))[0] || null;
  const blockers = [
    !args.slateDryRun ? 'missing OpeningDrive fine-risk slate dry-run report' : null,
    args.slateDryRun && args.slateDryRun.status !== 'pass' ? `slate dry-run status ${args.slateDryRun.status}` : null,
    !args.tightLongMiner ? 'missing OpeningDrive tight-long miner report' : null,
    args.tightLongMiner && args.tightLongMiner.status !== 'pass' ? `tight-long miner status ${args.tightLongMiner.status}` : null,
    args.freshReplayPackagePath && !freshReplayPackage ? 'fresh replay package path was provided but could not be loaded' : null,
    fineRows.length === 0 ? 'no fine-risk rows found in slate dry-run' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactOpeningDriveCombinedCleanPocketSimulationReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_combined_clean_pocket_simulation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      slateDryRunPath: args.slateDryRunPath,
      freshReplayPackagePath: args.freshReplayPackagePath || null,
      tightLongMinerPath: args.tightLongMinerPath,
    },
    assumptions: {
      savedReportsOnly: true,
      simulationOnly: true,
      fineRiskRowsComeFromSlateDryRun: true,
      tightLongRowsComeFromRemovedSlateRows: true,
      onlyLiveUsableNoLookaheadBuckets: true,
      dateBucketsAreResearchContextOnly: true,
      outcomeFieldsAreEvaluationOnly: true,
      scannerVisibleInstallAllowedNow: false,
      livePromotionAllowed: false,
    },
    baseline: {
      broadSelected,
      fineRiskOnly: fineOnlySummary,
    },
    scenarios,
    selectedRows,
    blockers,
    recommendations: blockers.length
      ? ['Fix the saved input reports before comparing combined OpeningDrive packages.']
      : [
        bestLossFree
          ? `Best loss-free simulated package is ${bestLossFree.scenario} with ${bestLossFree.rows} rows, ${bestLossFree.winners} winners, ${bestLossFree.losses} losses, and ${bestLossFree.oneMesPl ?? '-'} one-MES P/L.`
          : 'No loss-free combined package was found; do not advance this path.',
        'Keep date buckets out of any live proposal; only reusable no-lookahead bucket fields are simulation candidates.',
        'Do not change Discord, Supabase, NinjaTrader bridge, canExecute, entry, stop, target, risk, scanner runtime, or trading rules from this simulation.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketSimulationReport(
  report: RawOhlcScannerArtifactOpeningDriveCombinedCleanPocketSimulationReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-combined-clean-pocket-simulation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketSimulationCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketSimulationArgs(args);
  const slateDryRun = fs.existsSync(options.slateDryRun)
    ? readJson<RawOhlcScannerArtifactOpeningDriveFineRiskSlateDryRunReport>(options.slateDryRun)
    : null;
  const freshReplayPackagePath = options.freshReplayPackage || slateDryRun?.source.freshReplayPackagePath || null;
  const report = buildRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketSimulationReport({
    slateDryRunPath: options.slateDryRun,
    slateDryRun,
    freshReplayPackagePath,
    freshReplayPackage: freshReplayPackagePath && fs.existsSync(freshReplayPackagePath)
      ? readJson<RawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport>(freshReplayPackagePath)
      : null,
    tightLongMinerPath: options.tightLongMiner,
    tightLongMiner: fs.existsSync(options.tightLongMiner)
      ? readJson<RawOhlcScannerArtifactOpeningDriveTightLongLaneMinerReport>(options.tightLongMiner)
      : null,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketSimulationReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, baseline: report.baseline, scenarios: report.scenarios, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try { runRawOhlcScannerArtifactOpeningDriveCombinedCleanPocketSimulationCli(); } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
