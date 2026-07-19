import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-two-separator-broad-validation';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPreEntryMinerReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-compound-pre-entry-miner';

type Row = RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport['selectedRows'][number];
type CompoundScenario = RawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPreEntryMinerReport['topCompoundScenarios'][number];

interface CliOptions {
  broadValidation: string;
  compoundMiner: string;
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
  scenarioNames: string[];
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

export interface RawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPackageSimulationReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_compound_package_simulation';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    reportDir: string;
    broadValidationPath: string;
    compoundMinerPath: string;
  };
  assumptions: {
    savedReportsOnly: true;
    htfMssOnly: true;
    compoundPackageSimulationOnly: true;
    preEntryFeaturesOnly: true;
    promotionDisabled: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    inputSelectedRows: number;
    inputLossRows: number;
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

export function parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPackageSimulationArgs(args = process.argv.slice(2)): CliOptions {
  const broadValidation = readFlag(args, '--broad-validation');
  const compoundMiner = readFlag(args, '--compound-miner');
  if (!broadValidation) throw new Error('--broad-validation is required.');
  if (!compoundMiner) throw new Error('--compound-miner is required.');
  return {
    broadValidation,
    compoundMiner,
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

function rowMatchesScenario(row: Row, scenario: CompoundScenario): boolean {
  const values = new Map([
    ['session', row.session],
    ['direction', row.direction],
    ['timeBucket', timeBucket(row.proofTime)],
    ['riskBucket', riskBucket(row.riskPoints)],
    ['fineRiskBucket', fineRiskBucket(row.riskPoints)],
  ]);
  for (const part of scenario.key.split('|')) {
    const [feature, expected] = part.split('=');
    if (!feature || !expected || values.get(feature) !== expected) return false;
  }
  return true;
}

function summarizePackage(rows: Row[], name: string, description: string, scenarios: CompoundScenario[]): PackageSummary {
  const rejected = rows.filter((row) => scenarios.some((scenario) => rowMatchesScenario(row, scenario)));
  const selected = rows.filter((row) => !scenarios.some((scenario) => rowMatchesScenario(row, scenario)));
  return {
    name,
    description,
    scenarioNames: scenarios.map((scenario) => scenario.name),
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

function buildPackages(rows: Row[], scenarios: CompoundScenario[]): PackageSummary[] {
  const zeroWinner = scenarios.filter((scenario) => scenario.rejectedWinnerCost === 0 && scenario.rejectedLosses >= 5);
  const lowWinner = scenarios.filter((scenario) => scenario.rejectedWinnerCost <= 2 && scenario.rejectedLosses >= 5);
  const topLoss = [...scenarios].sort((a, b) => b.rejectedLosses - a.rejectedLosses || a.rejectedWinnerCost - b.rejectedWinnerCost);
  return [
    summarizePackage(rows, 'zero_winner_cost_all', 'Reject all mined compound pockets with zero rejected winners and at least 5 rejected losses.', zeroWinner),
    summarizePackage(rows, 'zero_winner_cost_top3', 'Reject the top three zero-winner-cost compound pockets by rejected losses.', zeroWinner.slice(0, 3)),
    summarizePackage(rows, 'low_winner_cost_all', 'Reject all mined compound pockets with at most 2 rejected winners and at least 5 rejected losses.', lowWinner),
    summarizePackage(rows, 'top5_loss_reduction', 'Reject the top five compound pockets by rejected loss count regardless of winner cost.', topLoss.slice(0, 5)),
  ].filter((summary) => summary.scenarioNames.length > 0);
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPackageSimulationReport, 'markdown'>): string {
  return [
    '# HTF MSS Compound Package Simulation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only promotion-disabled package simulation. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Input selected rows: ${report.summary.inputSelectedRows}.`,
    `- Input loss rows: ${report.summary.inputLossRows}.`,
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

export function buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPackageSimulationReport(args: {
  reportDir: string;
  broadValidationPath: string;
  compoundMinerPath: string;
  broadValidation: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport | null;
  compoundMiner: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPreEntryMinerReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPackageSimulationReport {
  const rows = args.broadValidation?.selectedRows || [];
  const scenarios = args.compoundMiner?.topCompoundScenarios || [];
  const packages = buildPackages(rows, scenarios).sort((a, b) => a.selectedLosses - b.selectedLosses || a.rejectedWinners - b.rejectedWinners || (b.selectedOneMesPl ?? 0) - (a.selectedOneMesPl ?? 0));
  const blockers = [
    !args.broadValidation ? 'missing HTF-MSS broad validation report' : null,
    args.broadValidation && args.broadValidation.status !== 'pass' ? `HTF-MSS broad validation status ${args.broadValidation.status}` : null,
    !args.compoundMiner ? 'missing HTF-MSS compound pre-entry miner report' : null,
    args.compoundMiner && args.compoundMiner.status !== 'pass' ? `HTF-MSS compound pre-entry miner status ${args.compoundMiner.status}` : null,
    args.compoundMiner && args.compoundMiner.summary.recommendation !== 'simulate_compound_package'
      ? `HTF-MSS compound pre-entry miner recommendation ${args.compoundMiner.summary.recommendation}`
      : null,
    !rows.length ? 'no broad selected rows available' : null,
    !scenarios.length ? 'no compound scenarios available' : null,
  ].filter((item): item is string => Boolean(item));
  const zeroSelectedLossPackage = packages.find((item) => item.selectedLosses === 0 && item.selectedWinners > 0);
  const bestPackage = packages[0] || null;
  const base: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPackageSimulationReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_compound_package_simulation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      broadValidationPath: args.broadValidationPath,
      compoundMinerPath: args.compoundMinerPath,
    },
    assumptions: {
      savedReportsOnly: true,
      htfMssOnly: true,
      compoundPackageSimulationOnly: true,
      preEntryFeaturesOnly: true,
      promotionDisabled: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      inputSelectedRows: rows.length,
      inputLossRows: rows.filter(isLoss).length,
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
      ? ['Fix saved report inputs before using this compound package simulation.']
      : [
        zeroSelectedLossPackage
          ? 'A zero-selected-loss package exists in saved research; package it as research-only and keep promotion disabled.'
          : 'No compound package removes all selected losses; continue feature search or broaden validation before any scanner-visible proposal.',
        'Do not change live scanner, Discord, Supabase, bridge, canExecute, entry, stop, target, or risk behavior from this report.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPackageSimulationReport(
  report: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPackageSimulationReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-compound-package-simulation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPackageSimulationCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPackageSimulationArgs(args);
  const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPackageSimulationReport({
    reportDir: options.outDir,
    broadValidationPath: options.broadValidation,
    compoundMinerPath: options.compoundMiner,
    broadValidation: fs.existsSync(options.broadValidation) ? readJson(options.broadValidation) : null,
    compoundMiner: fs.existsSync(options.compoundMiner) ? readJson(options.compoundMiner) : null,
  });
  const paths = writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPackageSimulationReport(report, options.outDir);
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
    runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPackageSimulationCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
