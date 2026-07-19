import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-two-separator-broad-validation';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPackageSimulationReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-compound-package-simulation';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssResiduePackageSimulationReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-residue-package-simulation';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueCompoundMinerReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-second-residue-compound-miner';

type Row = RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport['selectedRows'][number];
type Scenario = RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueCompoundMinerReport['topSecondResidueCompoundScenarios'][number];

interface CliOptions {
  broadValidation: string;
  packageSimulation: string;
  residuePackageSimulation: string;
  secondResidueCompoundMiner: string;
  packageName: string;
  outDir: string;
  json: boolean;
}

interface Authority {
  readOnly: true; localOnly: true; researchOnly: true; postsDiscord: false; writesSupabase: false; readsLiveSupabase: false; readsLiveBridge: false; runsSetupScanner: false; changesScannerBehavior: false; changesTradingLogic: false; changesCanExecute: false; changesEntryStopTargets: false; changesRiskRules: false; changesBridgeBehavior: false; changesDiscordPosting: false; changesAppRuntime: false;
}

interface PackageSummary {
  name: string;
  description: string;
  basePackageName: string;
  secondResidueScenarioNames: string[];
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

export interface RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResiduePackageSimulationReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_second_residue_package_simulation';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: { reportDir: string; broadValidationPath: string; packageSimulationPath: string; residuePackageSimulationPath: string; secondResidueCompoundMinerPath: string; packageName: string };
  assumptions: { savedReportsOnly: true; htfMssOnly: true; thirdPackageSimulationOnly: true; preEntryFeaturesOnly: true; promotionDisabled: true; noLiveRankInstalled: true; livePromotionAllowed: false };
  summary: { inputRows: number; basePackageRejectedRows: number; packagesTested: number; bestPackage: string | null; zeroSelectedLossPackage: string | null; livePromotionAllowedRows: 0; recommendation: 'prepare_research_only_proposal_update' | 'continue_feature_search' | 'fix_inputs' };
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

export function parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResiduePackageSimulationArgs(args = process.argv.slice(2)): CliOptions {
  const broadValidation = readFlag(args, '--broad-validation');
  const packageSimulation = readFlag(args, '--package-simulation');
  const residuePackageSimulation = readFlag(args, '--residue-package-simulation');
  const secondResidueCompoundMiner = readFlag(args, '--second-residue-compound-miner');
  if (!broadValidation) throw new Error('--broad-validation is required.');
  if (!packageSimulation) throw new Error('--package-simulation is required.');
  if (!residuePackageSimulation) throw new Error('--residue-package-simulation is required.');
  if (!secondResidueCompoundMiner) throw new Error('--second-residue-compound-miner is required.');
  return {
    broadValidation,
    packageSimulation,
    residuePackageSimulation,
    secondResidueCompoundMiner,
    packageName: readFlag(args, '--package-name') || 'base_plus_zero_winner_residue_all',
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T { return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T; }
function authority(): Authority { return { readOnly: true, localOnly: true, researchOnly: true, postsDiscord: false, writesSupabase: false, readsLiveSupabase: false, readsLiveBridge: false, runsSetupScanner: false, changesScannerBehavior: false, changesTradingLogic: false, changesCanExecute: false, changesEntryStopTargets: false, changesRiskRules: false, changesBridgeBehavior: false, changesDiscordPosting: false, changesAppRuntime: false }; }
function round(value: number): number { return Math.round(value * 100) / 100; }
function isWinner(row: Row): boolean { return row.outcomeStatus === 'resolved' && row.outcomeLabel === 't1_and_t2_hit'; }
function isLoss(row: Row): boolean { return row.outcomeStatus === 'resolved' && row.outcomeLabel === 'stopped_before_t1'; }
function sum(rows: Row[]): number | null {
  const values = rows.map((row) => row.resolvedOneMesPl).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return values.length ? round(values.reduce((total, value) => total + value, 0)) : null;
}
function riskBucket(riskPoints: number): string { if (riskPoints < 4) return 'risk_lt_4'; if (riskPoints < 8) return 'risk_4_to_8'; if (riskPoints < 16) return 'risk_8_to_16'; if (riskPoints < 24) return 'risk_16_to_24'; return 'risk_gte_24'; }
function fineRiskBucket(riskPoints: number): string { const lower = Math.floor(riskPoints / 4) * 4; return `risk_${lower}_to_${lower + 4}`; }
function timeBucket(proofTime: string): string { const hour = Number(proofTime.slice(11, 13)); return Number.isFinite(hour) ? `${String(hour).padStart(2, '0')}:00-${String(hour).padStart(2, '0')}:59` : 'unknown'; }
function scenarioKeyFromName(name: string): string { return name.includes(':') ? name.slice(name.indexOf(':') + 1) : name; }
function matchesKey(row: Row, key: string): boolean {
  const values = new Map([['session', row.session], ['direction', row.direction], ['timeBucket', timeBucket(row.proofTime)], ['riskBucket', riskBucket(row.riskPoints)], ['fineRiskBucket', fineRiskBucket(row.riskPoints)]]);
  return key.split('|').every((part) => {
    const [feature, expected] = part.split('=');
    return Boolean(feature && expected && values.get(feature) === expected);
  });
}

function packageKeys(args: {
  packageName: string;
  packageSimulation: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPackageSimulationReport | null;
  residuePackageSimulation: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssResiduePackageSimulationReport | null;
}): { keys: string[]; basePackageName: string | null } | null {
  const residuePackage = args.residuePackageSimulation?.packages.find((item) => item.name === args.packageName) || null;
  if (!residuePackage) return null;
  const basePackage = args.packageSimulation?.packages.find((item) => item.name === residuePackage.basePackageName) || null;
  if (!basePackage) return null;
  return {
    keys: [...basePackage.scenarioNames.map(scenarioKeyFromName), ...residuePackage.residueScenarioNames.map(scenarioKeyFromName)],
    basePackageName: residuePackage.name,
  };
}

function summarize(rows: Row[], baseKeys: string[], basePackageName: string, name: string, description: string, scenarios: Scenario[]): PackageSummary {
  const keys = [...baseKeys, ...scenarios.map((scenario) => scenario.key)];
  const rejected = rows.filter((row) => keys.some((key) => matchesKey(row, key)));
  const selected = rows.filter((row) => !keys.some((key) => matchesKey(row, key)));
  return {
    name,
    description,
    basePackageName,
    secondResidueScenarioNames: scenarios.map((scenario) => scenario.name),
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

function buildPackages(rows: Row[], baseKeys: string[], basePackageName: string, scenarios: Scenario[]): PackageSummary[] {
  const zeroWinner = scenarios.filter((scenario) => scenario.rejectedWinnerCost === 0 && scenario.rejectedLosses >= 3);
  const lowWinner = scenarios.filter((scenario) => scenario.rejectedWinnerCost <= 2 && scenario.rejectedLosses >= 4);
  const topLoss = [...scenarios].sort((a, b) => b.rejectedLosses - a.rejectedLosses || a.rejectedWinnerCost - b.rejectedWinnerCost);
  return [
    summarize(rows, baseKeys, basePackageName, 'base_plus_second_zero_winner_all', 'Base package plus all second-residue zero-winner-cost pockets.', zeroWinner),
    summarize(rows, baseKeys, basePackageName, 'base_plus_second_zero_winner_top3', 'Base package plus top three second-residue zero-winner-cost pockets.', zeroWinner.slice(0, 3)),
    summarize(rows, baseKeys, basePackageName, 'base_plus_second_low_winner_all', 'Base package plus all second-residue pockets with at most 2 rejected winners and at least 4 rejected losses.', lowWinner),
    summarize(rows, baseKeys, basePackageName, 'base_plus_second_top5_loss', 'Base package plus top five second-residue pockets by rejected loss count regardless of winner cost.', topLoss.slice(0, 5)),
  ].filter((item) => item.secondResidueScenarioNames.length > 0);
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResiduePackageSimulationReport, 'markdown'>): string {
  return ['# HTF MSS Second Residue Package Simulation', '', `Status: ${report.status}`, '', 'Authority: local-only read-only package simulation. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.', '', '## Summary', `- Input rows: ${report.summary.inputRows}.`, `- Base package rejected rows: ${report.summary.basePackageRejectedRows}.`, `- Packages tested: ${report.summary.packagesTested}.`, `- Best package: ${report.summary.bestPackage ?? '-'}.`, `- Zero selected-loss package: ${report.summary.zeroSelectedLossPackage ?? '-'}.`, `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`, `- Recommendation: ${report.summary.recommendation}.`, '', '## Packages', ...report.packages.map((item) => `- ${item.name}: selected W/L/U ${item.selectedWinners}/${item.selectedLosses}/${item.selectedUnresolved}, selected P/L ${item.selectedOneMesPl ?? '-'}; rejected W/L/U ${item.rejectedWinners}/${item.rejectedLosses}/${item.rejectedUnresolved}, rejected P/L ${item.rejectedOneMesPl ?? '-'}.`), '', '## Blockers', ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.'])].join('\n');
}

export function buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResiduePackageSimulationReport(args: {
  reportDir: string;
  broadValidationPath: string;
  packageSimulationPath: string;
  residuePackageSimulationPath: string;
  secondResidueCompoundMinerPath: string;
  packageName: string;
  broadValidation: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport | null;
  packageSimulation: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPackageSimulationReport | null;
  residuePackageSimulation: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssResiduePackageSimulationReport | null;
  secondResidueCompoundMiner: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResidueCompoundMinerReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResiduePackageSimulationReport {
  const rows = args.broadValidation?.selectedRows || [];
  const base = packageKeys(args);
  const packages = base ? buildPackages(rows, base.keys, base.basePackageName || args.packageName, args.secondResidueCompoundMiner?.topSecondResidueCompoundScenarios || []).sort((a, b) => a.selectedLosses - b.selectedLosses || a.rejectedWinners - b.rejectedWinners || (b.selectedOneMesPl ?? 0) - (a.selectedOneMesPl ?? 0)) : [];
  const blockers = [
    !args.broadValidation ? 'missing HTF-MSS broad validation report' : null,
    args.broadValidation && args.broadValidation.status !== 'pass' ? `HTF-MSS broad validation status ${args.broadValidation.status}` : null,
    !args.packageSimulation ? 'missing HTF-MSS compound package simulation report' : null,
    args.packageSimulation && args.packageSimulation.status !== 'pass' ? `HTF-MSS compound package simulation status ${args.packageSimulation.status}` : null,
    !args.residuePackageSimulation ? 'missing HTF-MSS residue package simulation report' : null,
    args.residuePackageSimulation && args.residuePackageSimulation.status !== 'pass' ? `HTF-MSS residue package simulation status ${args.residuePackageSimulation.status}` : null,
    !args.secondResidueCompoundMiner ? 'missing HTF-MSS second residue compound miner report' : null,
    args.secondResidueCompoundMiner && args.secondResidueCompoundMiner.status !== 'pass' ? `HTF-MSS second residue compound miner status ${args.secondResidueCompoundMiner.status}` : null,
    args.secondResidueCompoundMiner && args.secondResidueCompoundMiner.summary.recommendation !== 'simulate_second_residue_compound_package' ? `HTF-MSS second residue compound miner recommendation ${args.secondResidueCompoundMiner.summary.recommendation}` : null,
    !base ? `base package ${args.packageName} could not be reconstructed` : null,
  ].filter((item): item is string => Boolean(item));
  const zeroSelectedLossPackage = packages.find((item) => item.selectedLosses === 0 && item.selectedWinners > 0);
  const bestPackage = packages[0] || null;
  const baseReport: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResiduePackageSimulationReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_second_residue_package_simulation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir: args.reportDir, broadValidationPath: args.broadValidationPath, packageSimulationPath: args.packageSimulationPath, residuePackageSimulationPath: args.residuePackageSimulationPath, secondResidueCompoundMinerPath: args.secondResidueCompoundMinerPath, packageName: args.packageName },
    assumptions: { savedReportsOnly: true, htfMssOnly: true, thirdPackageSimulationOnly: true, preEntryFeaturesOnly: true, promotionDisabled: true, noLiveRankInstalled: true, livePromotionAllowed: false },
    summary: { inputRows: rows.length, basePackageRejectedRows: base ? rows.filter((row) => base.keys.some((key) => matchesKey(row, key))).length : 0, packagesTested: packages.length, bestPackage: bestPackage?.name || null, zeroSelectedLossPackage: zeroSelectedLossPackage?.name || null, livePromotionAllowedRows: 0, recommendation: blockers.length ? 'fix_inputs' : zeroSelectedLossPackage && zeroSelectedLossPackage.rejectedWinners === 0 ? 'prepare_research_only_proposal_update' : 'continue_feature_search' },
    packages,
    blockers,
    recommendations: blockers.length ? ['Fix saved report inputs before using this package simulation.'] : ['Do not install scanner-visible ranking unless a later approval contract proves the package is safe.', 'Do not change live scanner, Discord, Supabase, bridge, canExecute, entry, stop, target, or risk behavior from this report.'],
  };
  return { ...baseReport, markdown: buildMarkdown(baseReport) };
}

export function writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResiduePackageSimulationReport(report: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResiduePackageSimulationReport, outDir = DEFAULT_OUT_DIR): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-second-residue-package-simulation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResiduePackageSimulationCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResiduePackageSimulationArgs(args);
  const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResiduePackageSimulationReport({
    reportDir: options.outDir,
    broadValidationPath: options.broadValidation,
    packageSimulationPath: options.packageSimulation,
    residuePackageSimulationPath: options.residuePackageSimulation,
    secondResidueCompoundMinerPath: options.secondResidueCompoundMiner,
    packageName: options.packageName,
    broadValidation: fs.existsSync(options.broadValidation) ? readJson(options.broadValidation) : null,
    packageSimulation: fs.existsSync(options.packageSimulation) ? readJson(options.packageSimulation) : null,
    residuePackageSimulation: fs.existsSync(options.residuePackageSimulation) ? readJson(options.residuePackageSimulation) : null,
    secondResidueCompoundMiner: fs.existsSync(options.secondResidueCompoundMiner) ? readJson(options.secondResidueCompoundMiner) : null,
  });
  const paths = writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResiduePackageSimulationReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, packages: report.packages, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try { runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondResiduePackageSimulationCli(); } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
