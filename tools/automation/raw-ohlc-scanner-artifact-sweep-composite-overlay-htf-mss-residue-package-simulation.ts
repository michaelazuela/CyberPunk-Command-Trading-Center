import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-two-separator-broad-validation';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPackageSimulationReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-compound-package-simulation';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssResidueCompoundMinerReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-residue-compound-miner';

type Row = RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport['selectedRows'][number];
type Scenario = RawOhlcScannerArtifactSweepCompositeOverlayHtfMssResidueCompoundMinerReport['topResidueCompoundScenarios'][number];

interface CliOptions {
  broadValidation: string;
  packageSimulation: string;
  residueCompoundMiner: string;
  basePackageName: string;
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

interface PackageSummary {
  name: string;
  description: string;
  basePackageName: string;
  residueScenarioNames: string[];
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
  livePromotionAllowedRows: 0;
}

export interface RawOhlcScannerArtifactSweepCompositeOverlayHtfMssResiduePackageSimulationReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_residue_package_simulation';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    reportDir: string;
    broadValidationPath: string;
    packageSimulationPath: string;
    residueCompoundMinerPath: string;
    basePackageName: string;
  };
  assumptions: {
    savedReportsOnly: true;
    htfMssOnly: true;
    secondPackageSimulationOnly: true;
    preEntryFeaturesOnly: true;
    promotionDisabled: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    inputRows: number;
    basePackageRejectedRows: number;
    packagesTested: number;
    bestPackage: string | null;
    zeroSelectedLossPackage: string | null;
    livePromotionAllowedRows: 0;
    recommendation: 'prepare_research_only_proposal_update' | 'continue_feature_search' | 'fix_inputs';
  };
  packages: PackageSummary[];
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

export function parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssResiduePackageSimulationArgs(args = process.argv.slice(2)): CliOptions {
  const broadValidation = readFlag(args, '--broad-validation');
  const packageSimulation = readFlag(args, '--package-simulation');
  const residueCompoundMiner = readFlag(args, '--residue-compound-miner');
  if (!broadValidation) throw new Error('--broad-validation is required.');
  if (!packageSimulation) throw new Error('--package-simulation is required.');
  if (!residueCompoundMiner) throw new Error('--residue-compound-miner is required.');
  return {
    broadValidation,
    packageSimulation,
    residueCompoundMiner,
    basePackageName: readFlag(args, '--base-package-name') || 'zero_winner_cost_all',
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
  if (!Number.isFinite(hour)) return 'unknown';
  return `${String(hour).padStart(2, '0')}:00-${String(hour).padStart(2, '0')}:59`;
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

function scenarioKeyFromName(name: string): string {
  return name.includes(':') ? name.slice(name.indexOf(':') + 1) : name;
}

function summarize(rows: Row[], basePackageName: string, baseScenarioNames: string[], name: string, description: string, residueScenarios: Scenario[]): PackageSummary {
  const residueKeys = residueScenarios.map((scenario) => scenario.key);
  const rejected = rows.filter((row) =>
    baseScenarioNames.some((scenarioName) => matchesKey(row, scenarioKeyFromName(scenarioName)))
    || residueKeys.some((key) => matchesKey(row, key)),
  );
  const selected = rows.filter((row) => !rejected.includes(row));
  return {
    name,
    description,
    basePackageName,
    residueScenarioNames: residueScenarios.map((scenario) => scenario.name),
    selectedRows: selected.length,
    selectedWinners: selected.filter(isWinner).length,
    selectedLosses: selected.filter(isLoss).length,
    selectedUnresolved: selected.filter((row) => row.outcomeStatus !== 'resolved').length,
    selectedOneMesPl: sum(selected),
    rejectedRows: rejected.length,
    rejectedWinners: rejected.filter(isWinner).length,
    rejectedLosses: rejected.filter(isLoss).length,
    rejectedUnresolved: rejected.filter((row) => row.outcomeStatus !== 'resolved').length,
    rejectedOneMesPl: sum(rejected),
    livePromotionAllowedRows: 0,
  };
}

function buildPackages(rows: Row[], basePackageName: string, baseScenarioNames: string[], residueScenarios: Scenario[]): PackageSummary[] {
  const zeroWinner = residueScenarios.filter((scenario) => scenario.rejectedWinnerCost === 0 && scenario.rejectedLosses >= 4);
  const lowWinner = residueScenarios.filter((scenario) => scenario.rejectedWinnerCost <= 2 && scenario.rejectedLosses >= 4);
  const topLoss = [...residueScenarios].sort((a, b) => b.rejectedLosses - a.rejectedLosses || a.rejectedWinnerCost - b.rejectedWinnerCost);
  return [
    summarize(rows, basePackageName, baseScenarioNames, 'base_plus_zero_winner_residue_all', 'Base package plus all zero-winner-cost residue pockets with at least 4 rejected losses.', zeroWinner),
    summarize(rows, basePackageName, baseScenarioNames, 'base_plus_zero_winner_residue_top3', 'Base package plus top three zero-winner-cost residue pockets.', zeroWinner.slice(0, 3)),
    summarize(rows, basePackageName, baseScenarioNames, 'base_plus_low_winner_residue_all', 'Base package plus all residue pockets with at most 2 rejected winners and at least 4 rejected losses.', lowWinner),
    summarize(rows, basePackageName, baseScenarioNames, 'base_plus_top5_residue_loss', 'Base package plus top five residue pockets by rejected loss count regardless of winner cost.', topLoss.slice(0, 5)),
  ].filter((item) => item.residueScenarioNames.length > 0);
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssResiduePackageSimulationReport, 'markdown'>): string {
  return [
    '# HTF MSS Residue Package Simulation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only second package simulation. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Input rows: ${report.summary.inputRows}.`,
    `- Base package rejected rows: ${report.summary.basePackageRejectedRows}.`,
    `- Packages tested: ${report.summary.packagesTested}.`,
    `- Best package: ${report.summary.bestPackage ?? '-'}.`,
    `- Zero selected-loss package: ${report.summary.zeroSelectedLossPackage ?? '-'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Packages',
    ...report.packages.map((item) => `- ${item.name}: selected W/L/U ${item.selectedWinners}/${item.selectedLosses}/${item.selectedUnresolved}, selected P/L ${item.selectedOneMesPl ?? '-'}; rejected W/L/U ${item.rejectedWinners}/${item.rejectedLosses}/${item.rejectedUnresolved}, rejected P/L ${item.rejectedOneMesPl ?? '-'}.`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssResiduePackageSimulationReport(args: {
  reportDir: string;
  broadValidationPath: string;
  packageSimulationPath: string;
  residueCompoundMinerPath: string;
  basePackageName: string;
  broadValidation: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport | null;
  packageSimulation: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPackageSimulationReport | null;
  residueCompoundMiner: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssResidueCompoundMinerReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepCompositeOverlayHtfMssResiduePackageSimulationReport {
  const rows = args.broadValidation?.selectedRows || [];
  const basePackage = args.packageSimulation?.packages.find((item) => item.name === args.basePackageName) || null;
  const residueScenarios = args.residueCompoundMiner?.topResidueCompoundScenarios || [];
  const packages = basePackage
    ? buildPackages(rows, args.basePackageName, basePackage.scenarioNames, residueScenarios).sort((a, b) => a.selectedLosses - b.selectedLosses || a.rejectedWinners - b.rejectedWinners || (b.selectedOneMesPl ?? 0) - (a.selectedOneMesPl ?? 0))
    : [];
  const blockers = [
    !args.broadValidation ? 'missing HTF-MSS broad validation report' : null,
    args.broadValidation && args.broadValidation.status !== 'pass' ? `HTF-MSS broad validation status ${args.broadValidation.status}` : null,
    !args.packageSimulation ? 'missing HTF-MSS compound package simulation report' : null,
    args.packageSimulation && args.packageSimulation.status !== 'pass' ? `HTF-MSS compound package simulation status ${args.packageSimulation.status}` : null,
    !args.residueCompoundMiner ? 'missing HTF-MSS residue compound miner report' : null,
    args.residueCompoundMiner && args.residueCompoundMiner.status !== 'pass' ? `HTF-MSS residue compound miner status ${args.residueCompoundMiner.status}` : null,
    args.residueCompoundMiner && args.residueCompoundMiner.summary.recommendation !== 'simulate_residue_compound_package'
      ? `HTF-MSS residue compound miner recommendation ${args.residueCompoundMiner.summary.recommendation}`
      : null,
    !basePackage ? `base package ${args.basePackageName} not found` : null,
    !residueScenarios.length ? 'no residue compound scenarios available' : null,
  ].filter((item): item is string => Boolean(item));
  const zeroSelectedLossPackage = packages.find((item) => item.selectedLosses === 0 && item.selectedWinners > 0);
  const bestPackage = packages[0] || null;
  const base: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssResiduePackageSimulationReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_residue_package_simulation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      broadValidationPath: args.broadValidationPath,
      packageSimulationPath: args.packageSimulationPath,
      residueCompoundMinerPath: args.residueCompoundMinerPath,
      basePackageName: args.basePackageName,
    },
    assumptions: {
      savedReportsOnly: true,
      htfMssOnly: true,
      secondPackageSimulationOnly: true,
      preEntryFeaturesOnly: true,
      promotionDisabled: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      inputRows: rows.length,
      basePackageRejectedRows: basePackage?.rejectedRows || 0,
      packagesTested: packages.length,
      bestPackage: bestPackage?.name || null,
      zeroSelectedLossPackage: zeroSelectedLossPackage?.name || null,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length
        ? 'fix_inputs'
        : zeroSelectedLossPackage && zeroSelectedLossPackage.rejectedWinners === 0
          ? 'prepare_research_only_proposal_update'
          : 'continue_feature_search',
    },
    packages,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved report inputs before using this residue package simulation.']
      : [
        zeroSelectedLossPackage
          ? 'A zero-selected-loss second package exists in saved research; package it as research-only and keep promotion disabled.'
          : 'No second package removes all selected losses; continue residue feature search before any scanner-visible proposal.',
        'Do not change live scanner, Discord, Supabase, bridge, canExecute, entry, stop, target, or risk behavior from this report.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssResiduePackageSimulationReport(
  report: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssResiduePackageSimulationReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-residue-package-simulation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssResiduePackageSimulationCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssResiduePackageSimulationArgs(args);
  const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssResiduePackageSimulationReport({
    reportDir: options.outDir,
    broadValidationPath: options.broadValidation,
    packageSimulationPath: options.packageSimulation,
    residueCompoundMinerPath: options.residueCompoundMiner,
    basePackageName: options.basePackageName,
    broadValidation: fs.existsSync(options.broadValidation) ? readJson(options.broadValidation) : null,
    packageSimulation: fs.existsSync(options.packageSimulation) ? readJson(options.packageSimulation) : null,
    residueCompoundMiner: fs.existsSync(options.residueCompoundMiner) ? readJson(options.residueCompoundMiner) : null,
  });
  const paths = writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssResiduePackageSimulationReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, packages: report.packages, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssResiduePackageSimulationCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
