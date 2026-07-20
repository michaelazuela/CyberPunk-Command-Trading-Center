import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDriveCombinedCleanPocketSimulationReport,
} from './raw-ohlc-scanner-artifact-openingdrive-combined-clean-pocket-simulation';
import type {
  RawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport,
} from './raw-ohlc-scanner-artifact-openingdrive-fresh-replay-package';
import type {
  RawOhlcScannerArtifactOpeningDriveLowRiskApprovalContractReport,
} from './raw-ohlc-scanner-artifact-openingdrive-low-risk-approval-contract';

interface CliOptions {
  lowRiskContract: string;
  freshReplayPackage: string;
  combinedCleanPocketSimulation: string | null;
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

type ScenarioName =
  | 'low_risk_only'
  | 'tight_long_current'
  | 'fine_risk_current'
  | 'current_priority_package'
  | 'prior_best_combined_clean_pocket';

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
  source: string;
  lossFree: boolean;
  deltaVsLowRiskOneMesPl: number | null;
  livePromotionAllowedRows: 0;
}

export interface RawOhlcScannerArtifactOpeningDriveLowRiskComparisonSimulationReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_low_risk_comparison_simulation';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    lowRiskContractPath: string;
    freshReplayPackagePath: string;
    combinedCleanPocketSimulationPath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    comparisonOnly: true;
    lowRiskContractMustPass: true;
    outcomeFieldsAreEvaluationOnly: true;
    scannerVisibleInstallAllowedNow: false;
    livePromotionAllowed: false;
  };
  summary: {
    lowRiskContractStatus: string | null;
    lowRiskValidationRows: number;
    lowRiskValidationLosses: number;
    freshSelectedRows: number;
    freshSelectedLosses: number;
    freshCollisionEvents: number;
    bestLossFreeScenario: ScenarioName | null;
    livePromotionAllowedRows: 0;
    recommendation: 'preserve_low_risk_as_priority_additive_lane' | 'broaden_low_risk_research_before_any_proposal' | 'fix_inputs';
  };
  scenarios: ScenarioSummary[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');
const LOW_RISK_SELECTOR = 'low_risk_lt_4';
const TIGHT_SELECTOR = 'tight_long_risk_4_to_8';
const FINE_SELECTOR = 'fine_risk_24_to_32';

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

export function parseRawOhlcScannerArtifactOpeningDriveLowRiskComparisonSimulationArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_OUT_DIR;
  const lowRiskContract = readFlag(args, '--low-risk-contract') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-low-risk-approval-contract-\d+\.json$/);
  const freshReplayPackage = readFlag(args, '--fresh-replay-package') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-fresh-replay-package-\d+\.json$/);
  const combinedCleanPocketSimulation = readFlag(args, '--combined-clean-pocket-simulation') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-combined-clean-pocket-simulation-\d+\.json$/);
  if (!lowRiskContract) throw new Error('--low-risk-contract is required.');
  if (!freshReplayPackage) throw new Error('--fresh-replay-package is required.');
  return { lowRiskContract, freshReplayPackage, combinedCleanPocketSimulation, outDir, json: args.includes('--json') };
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

function delta(current: number | null, baseline: number | null): number | null {
  return current === null || baseline === null ? null : round(current - baseline);
}

function emptySummary(): Summary {
  return {
    rows: 0,
    winners: 0,
    losses: 0,
    otherResolved: 0,
    unresolved: 0,
    oneMesPl: null,
    avgRiskPoints: null,
  };
}

function toSummary(row: Summary | null | undefined): Summary {
  return row
    ? {
      rows: row.rows,
      winners: row.winners,
      losses: row.losses,
      otherResolved: row.otherResolved,
      unresolved: row.unresolved,
      oneMesPl: row.oneMesPl,
      avgRiskPoints: row.avgRiskPoints,
    }
    : emptySummary();
}

function fromFreshSelector(
  report: RawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport | null,
  selector: string,
): Summary {
  return toSummary(report?.selectorSummaries.find((row) => row.selector === selector));
}

function fromScenario(
  report: RawOhlcScannerArtifactOpeningDriveCombinedCleanPocketSimulationReport | null,
): Summary {
  const bestLossFree = (report?.scenarios || [])
    .filter((scenario) => scenario.lossFree)
    .sort((a, b) => (b.oneMesPl ?? 0) - (a.oneMesPl ?? 0))[0];
  return toSummary(bestLossFree);
}

function scenario(
  scenarioName: ScenarioName,
  source: string,
  summary: Summary,
  lowRiskSummary: Summary,
): ScenarioSummary {
  return {
    ...summary,
    scenario: scenarioName,
    source,
    lossFree: summary.rows > 0 && summary.losses === 0,
    deltaVsLowRiskOneMesPl: delta(summary.oneMesPl, lowRiskSummary.oneMesPl),
    livePromotionAllowedRows: 0,
  };
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDriveLowRiskComparisonSimulationReport, 'markdown'>): string {
  return [
    '# OpeningDrive Low-Risk Comparison Simulation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only comparison. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Low-risk validation rows/losses: ${report.summary.lowRiskValidationRows}/${report.summary.lowRiskValidationLosses}.`,
    `- Fresh selected rows/losses/collisions: ${report.summary.freshSelectedRows}/${report.summary.freshSelectedLosses}/${report.summary.freshCollisionEvents}.`,
    `- Best loss-free scenario: ${report.summary.bestLossFreeScenario ?? '-'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Scenarios',
    '| Scenario | Source | Rows | W/L/O/U | P/L | Avg Risk | Delta vs Low Risk | Loss Free |',
    '|---|---|---:|---|---:|---:|---:|---|',
    ...report.scenarios.map((row) => `| ${row.scenario} | ${row.source} | ${row.rows} | ${row.winners}/${row.losses}/${row.otherResolved}/${row.unresolved} | ${row.oneMesPl ?? '-'} | ${row.avgRiskPoints ?? '-'} | ${row.deltaVsLowRiskOneMesPl ?? '-'} | ${row.lossFree} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDriveLowRiskComparisonSimulationReport(args: {
  lowRiskContractPath: string;
  lowRiskContract: RawOhlcScannerArtifactOpeningDriveLowRiskApprovalContractReport | null;
  freshReplayPackagePath: string;
  freshReplayPackage: RawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport | null;
  combinedCleanPocketSimulationPath?: string | null;
  combinedCleanPocketSimulation?: RawOhlcScannerArtifactOpeningDriveCombinedCleanPocketSimulationReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDriveLowRiskComparisonSimulationReport {
  const lowRiskSummary = fromFreshSelector(args.freshReplayPackage, LOW_RISK_SELECTOR);
  const scenarios = [
    scenario('low_risk_only', 'fresh_selector_summary', lowRiskSummary, lowRiskSummary),
    scenario('tight_long_current', 'fresh_selector_summary', fromFreshSelector(args.freshReplayPackage, TIGHT_SELECTOR), lowRiskSummary),
    scenario('fine_risk_current', 'fresh_selector_summary', fromFreshSelector(args.freshReplayPackage, FINE_SELECTOR), lowRiskSummary),
    scenario('current_priority_package', 'fresh_replay_selected_summary', toSummary(args.freshReplayPackage?.summary.selectedSummary), lowRiskSummary),
    scenario('prior_best_combined_clean_pocket', 'combined_clean_pocket_simulation', fromScenario(args.combinedCleanPocketSimulation || null), lowRiskSummary),
  ];
  const bestLossFree = scenarios
    .filter((item) => item.lossFree)
    .sort((a, b) => (b.oneMesPl ?? 0) - (a.oneMesPl ?? 0))[0] || null;
  const blockers = [
    !args.lowRiskContract ? 'missing low-risk approval contract' : null,
    args.lowRiskContract && args.lowRiskContract.status !== 'pass' ? `low-risk approval contract status ${args.lowRiskContract.status}` : null,
    !args.freshReplayPackage ? 'missing fresh replay package' : null,
    args.freshReplayPackage && args.freshReplayPackage.status !== 'pass' ? `fresh replay package status ${args.freshReplayPackage.status}` : null,
    lowRiskSummary.rows === 0 ? 'fresh replay package has no low_risk_lt_4 selector rows' : null,
    args.lowRiskContract && args.lowRiskContract.summary.lowRiskLosses > 0 ? 'low-risk approval contract has validation losses' : null,
    args.freshReplayPackage && args.freshReplayPackage.summary.livePromotionAllowedRows !== 0 ? 'fresh replay package has live promotion rows' : null,
  ].filter((item): item is string => Boolean(item));
  const shouldBroaden = !blockers.length && lowRiskSummary.rows < 3;
  const base: Omit<RawOhlcScannerArtifactOpeningDriveLowRiskComparisonSimulationReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_low_risk_comparison_simulation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      lowRiskContractPath: args.lowRiskContractPath,
      freshReplayPackagePath: args.freshReplayPackagePath,
      combinedCleanPocketSimulationPath: args.combinedCleanPocketSimulationPath || null,
    },
    assumptions: {
      savedReportsOnly: true,
      comparisonOnly: true,
      lowRiskContractMustPass: true,
      outcomeFieldsAreEvaluationOnly: true,
      scannerVisibleInstallAllowedNow: false,
      livePromotionAllowed: false,
    },
    summary: {
      lowRiskContractStatus: args.lowRiskContract?.status || null,
      lowRiskValidationRows: args.lowRiskContract?.summary.lowRiskRows || 0,
      lowRiskValidationLosses: args.lowRiskContract?.summary.lowRiskLosses || 0,
      freshSelectedRows: args.freshReplayPackage?.summary.selectedRows || 0,
      freshSelectedLosses: args.freshReplayPackage?.summary.selectedSummary.losses || 0,
      freshCollisionEvents: args.freshReplayPackage?.summary.collisionEvents || 0,
      bestLossFreeScenario: bestLossFree?.scenario || null,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length
        ? 'fix_inputs'
        : shouldBroaden
          ? 'broaden_low_risk_research_before_any_proposal'
          : 'preserve_low_risk_as_priority_additive_lane',
    },
    scenarios,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved input reports before making any low-risk versus tight-long conclusion.']
      : [
        shouldBroaden
          ? 'The low-risk lane is clean but too small in the fresh package; keep it as priority/additive research and broaden evidence before a live proposal.'
          : 'Preserve low-risk as an additive priority lane, not a replacement for validated tight-long/fine-risk evidence.',
        'Do not install scanner-visible ranking, Discord, Supabase, bridge, canExecute, entry, stop, target, risk, scanner runtime, or trading-rule changes from this comparison.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDriveLowRiskComparisonSimulationReport(
  report: RawOhlcScannerArtifactOpeningDriveLowRiskComparisonSimulationReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-low-risk-comparison-simulation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDriveLowRiskComparisonSimulationCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactOpeningDriveLowRiskComparisonSimulationArgs(args);
  const combinedPath = options.combinedCleanPocketSimulation;
  const report = buildRawOhlcScannerArtifactOpeningDriveLowRiskComparisonSimulationReport({
    lowRiskContractPath: options.lowRiskContract,
    lowRiskContract: fs.existsSync(options.lowRiskContract)
      ? readJson<RawOhlcScannerArtifactOpeningDriveLowRiskApprovalContractReport>(options.lowRiskContract)
      : null,
    freshReplayPackagePath: options.freshReplayPackage,
    freshReplayPackage: fs.existsSync(options.freshReplayPackage)
      ? readJson<RawOhlcScannerArtifactOpeningDriveFreshReplayPackageReport>(options.freshReplayPackage)
      : null,
    combinedCleanPocketSimulationPath: combinedPath,
    combinedCleanPocketSimulation: combinedPath && fs.existsSync(combinedPath)
      ? readJson<RawOhlcScannerArtifactOpeningDriveCombinedCleanPocketSimulationReport>(combinedPath)
      : null,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDriveLowRiskComparisonSimulationReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, scenarios: report.scenarios, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try { runRawOhlcScannerArtifactOpeningDriveLowRiskComparisonSimulationCli(); } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
