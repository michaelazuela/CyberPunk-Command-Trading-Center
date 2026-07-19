import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-two-separator-broad-validation';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPackageSimulationReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-compound-package-simulation';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssResiduePackageSimulationReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-residue-package-simulation';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueLossDrilldownReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-second-residue-loss-drilldown';

type Row = RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport['selectedRows'][number];
type FeatureName = 'session' | 'direction' | 'timeBucket' | 'riskBucket' | 'fineRiskBucket';

interface CliOptions {
  broadValidation: string;
  packageSimulation: string;
  residuePackageSimulation: string;
  secondResidueDrilldown: string;
  packageName: string;
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

interface SecondResidueCompoundScenario {
  name: string;
  features: FeatureName[];
  key: string;
  selectedRows: number;
  selectedWinners: number;
  selectedLosses: number;
  selectedUnresolved: number;
  selectedOneMesPl: number | null;
  rejectedRows: number;
  rejectedWinners: number;
  rejectedLosses: number;
  rejectedUnresolved: number;
  rejectedOneMesPl: number | null;
  rejectedLossShare: number;
  rejectedWinnerCost: number;
  livePromotionAllowedRows: 0;
}

export interface RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueCompoundMinerReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_second_residue_compound_miner';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    reportDir: string;
    broadValidationPath: string;
    packageSimulationPath: string;
    residuePackageSimulationPath: string;
    secondResidueDrilldownPath: string;
    packageName: string;
  };
  assumptions: {
    savedReportsOnly: true;
    htfMssOnly: true;
    secondResidueOnly: true;
    compoundPreEntryFeaturesOnly: true;
    excludesDateRegimeFeatures: true;
    excludesReplayOutcomeFields: true;
    promotionDisabled: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    inputRows: number;
    packageRejectedRows: number;
    secondResidueRows: number;
    secondResidueLossRows: number;
    scenariosMined: number;
    topScenario: string | null;
    lowWinnerCostScenario: string | null;
    zeroWinnerCostScenario: string | null;
    livePromotionAllowedRows: 0;
    recommendation: 'simulate_second_residue_compound_package' | 'continue_feature_search' | 'fix_inputs';
  };
  topSecondResidueCompoundScenarios: SecondResidueCompoundScenario[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

export function parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueCompoundMinerArgs(args = process.argv.slice(2)): CliOptions {
  const broadValidation = readFlag(args, '--broad-validation');
  const packageSimulation = readFlag(args, '--package-simulation');
  const residuePackageSimulation = readFlag(args, '--residue-package-simulation');
  const secondResidueDrilldown = readFlag(args, '--second-residue-drilldown');
  if (!broadValidation) throw new Error('--broad-validation is required.');
  if (!packageSimulation) throw new Error('--package-simulation is required.');
  if (!residuePackageSimulation) throw new Error('--residue-package-simulation is required.');
  if (!secondResidueDrilldown) throw new Error('--second-residue-drilldown is required.');
  return {
    broadValidation,
    packageSimulation,
    residuePackageSimulation,
    secondResidueDrilldown,
    packageName: readFlag(args, '--package-name') || 'base_plus_zero_winner_residue_all',
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    json: args.includes('--json'),
  };
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

function isWinner(row: Row): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 't1_and_t2_hit';
}

function isLoss(row: Row): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 'stopped_before_t1';
}

function sum(rows: Row[]): number | null {
  const values = rows.map((row) => row.resolvedOneMesPl).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return values.length ? round(values.reduce((total, value) => total + value, 0)) : null;
}

function riskBucket(riskPoints: number): string {
  if (riskPoints < 4) return 'risk_lt_4';
  if (riskPoints < 8) return 'risk_4_to_8';
  if (riskPoints < 16) return 'risk_8_to_16';
  if (riskPoints < 24) return 'risk_16_to_24';
  return 'risk_gte_24';
}

function fineRiskBucket(riskPoints: number): string {
  const lower = Math.floor(riskPoints / 4) * 4;
  return `risk_${lower}_to_${lower + 4}`;
}

function timeBucket(proofTime: string): string {
  const hour = Number(proofTime.slice(11, 13));
  return Number.isFinite(hour) ? `${String(hour).padStart(2, '0')}:00-${String(hour).padStart(2, '0')}:59` : 'unknown';
}

function scenarioKeyFromName(name: string): string {
  return name.includes(':') ? name.slice(name.indexOf(':') + 1) : name;
}

function matchesKey(row: Row, key: string): boolean {
  const values = new Map([
    ['session', row.session],
    ['direction', row.direction],
    ['timeBucket', timeBucket(row.proofTime)],
    ['riskBucket', riskBucket(row.riskPoints)],
    ['fineRiskBucket', fineRiskBucket(row.riskPoints)],
  ]);
  return key.split('|').every((part) => {
    const [feature, expected] = part.split('=');
    return Boolean(feature && expected && values.get(feature) === expected);
  });
}

function featureValue(row: Row, feature: FeatureName): string {
  if (feature === 'session') return row.session;
  if (feature === 'direction') return row.direction;
  if (feature === 'timeBucket') return timeBucket(row.proofTime);
  if (feature === 'riskBucket') return riskBucket(row.riskPoints);
  return fineRiskBucket(row.riskPoints);
}

function compoundKey(row: Row, features: FeatureName[]): string {
  return features.map((feature) => `${feature}=${featureValue(row, feature)}`).join('|');
}

function scenarioName(features: FeatureName[], key: string): string {
  return `${features.join('+')}:${key}`.replace(/[^A-Za-z0-9:_+=|-]+/g, '_').slice(0, 160);
}

function summarize(secondResidueRows: Row[], features: FeatureName[], key: string, totalLosses: number): SecondResidueCompoundScenario {
  const rejected = secondResidueRows.filter((row) => compoundKey(row, features) === key);
  const selected = secondResidueRows.filter((row) => compoundKey(row, features) !== key);
  const rejectedLosses = rejected.filter(isLoss).length;
  const rejectedWinners = rejected.filter(isWinner).length;
  return {
    name: scenarioName(features, key),
    features,
    key,
    selectedRows: selected.length,
    selectedWinners: selected.filter(isWinner).length,
    selectedLosses: selected.filter(isLoss).length,
    selectedUnresolved: selected.filter((row) => row.outcomeStatus !== 'resolved').length,
    selectedOneMesPl: sum(selected),
    rejectedRows: rejected.length,
    rejectedWinners,
    rejectedLosses,
    rejectedUnresolved: rejected.filter((row) => row.outcomeStatus !== 'resolved').length,
    rejectedOneMesPl: sum(rejected),
    rejectedLossShare: totalLosses ? round(rejectedLosses / totalLosses) : 0,
    rejectedWinnerCost: rejectedWinners,
    livePromotionAllowedRows: 0,
  };
}

function mineScenarios(secondResidueRows: Row[], totalLosses: number): SecondResidueCompoundScenario[] {
  const featureSets: FeatureName[][] = [
    ['session', 'direction', 'timeBucket', 'fineRiskBucket'],
    ['session', 'direction', 'timeBucket', 'riskBucket'],
    ['session', 'direction', 'fineRiskBucket'],
    ['session', 'timeBucket', 'fineRiskBucket'],
    ['direction', 'timeBucket', 'fineRiskBucket'],
    ['session', 'direction', 'riskBucket'],
    ['session', 'timeBucket', 'riskBucket'],
    ['direction', 'timeBucket', 'riskBucket'],
  ];
  const scenarios: SecondResidueCompoundScenario[] = [];
  for (const features of featureSets) {
    const keys = new Set(secondResidueRows.map((row) => compoundKey(row, features)));
    for (const key of keys) {
      const scenario = summarize(secondResidueRows, features, key, totalLosses);
      if (scenario.rejectedLosses < 3) continue;
      if (scenario.rejectedWinners > 8) continue;
      scenarios.push(scenario);
    }
  }
  return scenarios.sort((a, b) =>
    b.rejectedLosses - a.rejectedLosses
    || a.rejectedWinnerCost - b.rejectedWinnerCost
    || a.selectedLosses - b.selectedLosses
    || (b.selectedOneMesPl ?? 0) - (a.selectedOneMesPl ?? 0),
  );
}

function packageKeys(args: {
  packageSimulation: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPackageSimulationReport | null;
  residuePackageSimulation: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssResiduePackageSimulationReport | null;
  packageName: string;
}): string[] | null {
  const selectedPackage = args.residuePackageSimulation?.packages.find((item) => item.name === args.packageName) || null;
  if (!selectedPackage) return null;
  const basePackage = args.packageSimulation?.packages.find((item) => item.name === selectedPackage.basePackageName) || null;
  if (!basePackage) return null;
  return [...basePackage.scenarioNames.map(scenarioKeyFromName), ...selectedPackage.residueScenarioNames.map(scenarioKeyFromName)];
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueCompoundMinerReport, 'markdown'>): string {
  return [
    '# HTF MSS Second Residue Compound Miner',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only second-residue compound miner. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Input rows: ${report.summary.inputRows}.`,
    `- Package rejected rows: ${report.summary.packageRejectedRows}.`,
    `- Second residue rows: ${report.summary.secondResidueRows}.`,
    `- Second residue loss rows: ${report.summary.secondResidueLossRows}.`,
    `- Scenarios mined: ${report.summary.scenariosMined}.`,
    `- Top scenario: ${report.summary.topScenario ?? '-'}.`,
    `- Low winner-cost scenario: ${report.summary.lowWinnerCostScenario ?? '-'}.`,
    `- Zero winner-cost scenario: ${report.summary.zeroWinnerCostScenario ?? '-'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Top Second-Residue Compound Scenarios',
    ...report.topSecondResidueCompoundScenarios.slice(0, 15).map((scenario) => `- ${scenario.name}: selected W/L/U ${scenario.selectedWinners}/${scenario.selectedLosses}/${scenario.selectedUnresolved}, selected P/L ${scenario.selectedOneMesPl ?? '-'}; rejected W/L/U ${scenario.rejectedWinners}/${scenario.rejectedLosses}/${scenario.rejectedUnresolved}, rejected P/L ${scenario.rejectedOneMesPl ?? '-'}.`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueCompoundMinerReport(args: {
  reportDir: string;
  broadValidationPath: string;
  packageSimulationPath: string;
  residuePackageSimulationPath: string;
  secondResidueDrilldownPath: string;
  packageName: string;
  broadValidation: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport | null;
  packageSimulation: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPackageSimulationReport | null;
  residuePackageSimulation: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssResiduePackageSimulationReport | null;
  secondResidueDrilldown: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueLossDrilldownReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueCompoundMinerReport {
  const rows = args.broadValidation?.selectedRows || [];
  const keys = packageKeys(args);
  const rejectedRows = keys ? rows.filter((row) => keys.some((key) => matchesKey(row, key))) : [];
  const secondResidueRows = keys ? rows.filter((row) => !keys.some((key) => matchesKey(row, key))) : [];
  const secondResidueLossRows = secondResidueRows.filter(isLoss).length;
  const topSecondResidueCompoundScenarios = mineScenarios(secondResidueRows, secondResidueLossRows).slice(0, 30);
  const selectedPackage = args.residuePackageSimulation?.packages.find((item) => item.name === args.packageName) || null;
  const blockers = [
    !args.broadValidation ? 'missing HTF-MSS broad validation report' : null,
    args.broadValidation && args.broadValidation.status !== 'pass' ? `HTF-MSS broad validation status ${args.broadValidation.status}` : null,
    !args.packageSimulation ? 'missing HTF-MSS compound package simulation report' : null,
    args.packageSimulation && args.packageSimulation.status !== 'pass' ? `HTF-MSS compound package simulation status ${args.packageSimulation.status}` : null,
    !args.residuePackageSimulation ? 'missing HTF-MSS residue package simulation report' : null,
    args.residuePackageSimulation && args.residuePackageSimulation.status !== 'pass' ? `HTF-MSS residue package simulation status ${args.residuePackageSimulation.status}` : null,
    !args.secondResidueDrilldown ? 'missing HTF-MSS second residue loss drilldown report' : null,
    args.secondResidueDrilldown && args.secondResidueDrilldown.status !== 'pass' ? `HTF-MSS second residue loss drilldown status ${args.secondResidueDrilldown.status}` : null,
    args.secondResidueDrilldown && args.secondResidueDrilldown.summary.recommendation !== 'mine_second_residue_compounds'
      ? `HTF-MSS second residue loss drilldown recommendation ${args.secondResidueDrilldown.summary.recommendation}`
      : null,
    !selectedPackage ? `residue package ${args.packageName} not found` : null,
    !keys ? `package keys for ${args.packageName} could not be reconstructed` : null,
    !secondResidueRows.length ? 'no second-residue rows available' : null,
  ].filter((item): item is string => Boolean(item));
  const lowWinnerCostScenario = topSecondResidueCompoundScenarios.find((scenario) => scenario.rejectedLosses >= 4 && scenario.rejectedWinnerCost <= 2) || null;
  const zeroWinnerCostScenario = topSecondResidueCompoundScenarios.find((scenario) => scenario.rejectedLosses >= 3 && scenario.rejectedWinnerCost === 0) || null;
  const base: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueCompoundMinerReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_second_residue_compound_miner',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      broadValidationPath: args.broadValidationPath,
      packageSimulationPath: args.packageSimulationPath,
      residuePackageSimulationPath: args.residuePackageSimulationPath,
      secondResidueDrilldownPath: args.secondResidueDrilldownPath,
      packageName: args.packageName,
    },
    assumptions: {
      savedReportsOnly: true,
      htfMssOnly: true,
      secondResidueOnly: true,
      compoundPreEntryFeaturesOnly: true,
      excludesDateRegimeFeatures: true,
      excludesReplayOutcomeFields: true,
      promotionDisabled: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      inputRows: rows.length,
      packageRejectedRows: rejectedRows.length,
      secondResidueRows: secondResidueRows.length,
      secondResidueLossRows,
      scenariosMined: topSecondResidueCompoundScenarios.length,
      topScenario: topSecondResidueCompoundScenarios[0]?.name || null,
      lowWinnerCostScenario: lowWinnerCostScenario?.name || null,
      zeroWinnerCostScenario: zeroWinnerCostScenario?.name || null,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length ? 'fix_inputs' : lowWinnerCostScenario || zeroWinnerCostScenario ? 'simulate_second_residue_compound_package' : 'continue_feature_search',
    },
    topSecondResidueCompoundScenarios,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved report inputs before using this second-residue compound miner.']
      : [
        lowWinnerCostScenario || zeroWinnerCostScenario
          ? 'A second-residue low winner-cost pocket exists; simulate a non-overlapping package before any implementation request.'
          : 'No low winner-cost second-residue pocket emerged; continue feature discovery before any scanner-visible proposal.',
        'Do not use date/regime, replay, MFE/MAE, or outcome-known fields for live filtering.',
        'Do not change live scanner, Discord, Supabase, bridge, canExecute, entry, stop, target, or risk behavior from this report.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueCompoundMinerReport(
  report: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueCompoundMinerReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-second-residue-compound-miner-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueCompoundMinerCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueCompoundMinerArgs(args);
  const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueCompoundMinerReport({
    reportDir: options.outDir,
    broadValidationPath: options.broadValidation,
    packageSimulationPath: options.packageSimulation,
    residuePackageSimulationPath: options.residuePackageSimulation,
    secondResidueDrilldownPath: options.secondResidueDrilldown,
    packageName: options.packageName,
    broadValidation: fs.existsSync(options.broadValidation) ? readJson(options.broadValidation) : null,
    packageSimulation: fs.existsSync(options.packageSimulation) ? readJson(options.packageSimulation) : null,
    residuePackageSimulation: fs.existsSync(options.residuePackageSimulation) ? readJson(options.residuePackageSimulation) : null,
    secondResidueDrilldown: fs.existsSync(options.secondResidueDrilldown) ? readJson(options.secondResidueDrilldown) : null,
  });
  const paths = writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueCompoundMinerReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, topSecondResidueCompoundScenarios: report.topSecondResidueCompoundScenarios.slice(0, 15), blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueCompoundMinerCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
