import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-two-separator-broad-validation';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssPreEntryFeatureSimulationReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-pre-entry-feature-simulation';

type Row = RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport['selectedRows'][number];
type FeatureName = 'session' | 'direction' | 'timeBucket' | 'riskBucket' | 'fineRiskBucket';

interface CliOptions {
  broadValidation: string;
  preEntrySimulation: string;
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

interface CompoundScenario {
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

export interface RawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPreEntryMinerReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_compound_pre_entry_miner';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    reportDir: string;
    broadValidationPath: string;
    preEntrySimulationPath: string;
  };
  assumptions: {
    savedReportsOnly: true;
    htfMssOnly: true;
    compoundPreEntryFeaturesOnly: true;
    excludesDateRegimeFeatures: true;
    excludesReplayOutcomeFields: true;
    promotionDisabled: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    inputSelectedRows: number;
    inputLossRows: number;
    scenariosMined: number;
    topScenario: string | null;
    zeroSelectedLossScenario: string | null;
    lowWinnerCostScenario: string | null;
    livePromotionAllowedRows: 0;
    recommendation: 'simulate_compound_package' | 'continue_feature_search' | 'fix_inputs';
  };
  topCompoundScenarios: CompoundScenario[];
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

export function parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPreEntryMinerArgs(args = process.argv.slice(2)): CliOptions {
  const broadValidation = readFlag(args, '--broad-validation');
  const preEntrySimulation = readFlag(args, '--pre-entry-simulation');
  if (!broadValidation) throw new Error('--broad-validation is required.');
  if (!preEntrySimulation) throw new Error('--pre-entry-simulation is required.');
  return {
    broadValidation,
    preEntrySimulation,
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

function featureValue(row: Row, feature: FeatureName): string {
  switch (feature) {
    case 'session':
      return row.session;
    case 'direction':
      return row.direction;
    case 'timeBucket':
      return timeBucket(row.proofTime);
    case 'riskBucket':
      return riskBucket(row.riskPoints);
    case 'fineRiskBucket':
      return fineRiskBucket(row.riskPoints);
  }
}

function scenarioKey(row: Row, features: FeatureName[]): string {
  return features.map((feature) => `${feature}=${featureValue(row, feature)}`).join('|');
}

function scenarioName(features: FeatureName[], key: string): string {
  return `${features.join('+')}:${key}`.replace(/[^A-Za-z0-9:_+=|-]+/g, '_').slice(0, 160);
}

function summarize(rows: Row[], features: FeatureName[], key: string, totalLosses: number): CompoundScenario {
  const rejected = rows.filter((row) => scenarioKey(row, features) === key);
  const selected = rows.filter((row) => scenarioKey(row, features) !== key);
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

function mineScenarios(rows: Row[], totalLosses: number): CompoundScenario[] {
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
  const scenarios: CompoundScenario[] = [];
  for (const features of featureSets) {
    const keys = new Set(rows.map((row) => scenarioKey(row, features)));
    for (const key of keys) {
      const scenario = summarize(rows, features, key, totalLosses);
      if (scenario.rejectedLosses < 3) continue;
      if (scenario.rejectedWinners > 12) continue;
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPreEntryMinerReport, 'markdown'>): string {
  return [
    '# HTF MSS Compound Pre-Entry Miner',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only compound feature miner. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Input selected rows: ${report.summary.inputSelectedRows}.`,
    `- Input loss rows: ${report.summary.inputLossRows}.`,
    `- Scenarios mined: ${report.summary.scenariosMined}.`,
    `- Top scenario: ${report.summary.topScenario ?? '-'}.`,
    `- Zero selected-loss scenario: ${report.summary.zeroSelectedLossScenario ?? '-'}.`,
    `- Low winner-cost scenario: ${report.summary.lowWinnerCostScenario ?? '-'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Top Compound Scenarios',
    ...report.topCompoundScenarios.slice(0, 15).map((scenario) => `- ${scenario.name}: selected W/L/U ${scenario.selectedWinners}/${scenario.selectedLosses}/${scenario.selectedUnresolved}, selected P/L ${scenario.selectedOneMesPl ?? '-'}; rejected W/L/U ${scenario.rejectedWinners}/${scenario.rejectedLosses}/${scenario.rejectedUnresolved}, rejected P/L ${scenario.rejectedOneMesPl ?? '-'}.`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPreEntryMinerReport(args: {
  reportDir: string;
  broadValidationPath: string;
  preEntrySimulationPath: string;
  broadValidation: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport | null;
  preEntrySimulation: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssPreEntryFeatureSimulationReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPreEntryMinerReport {
  const rows = args.broadValidation?.selectedRows || [];
  const totalLosses = rows.filter(isLoss).length;
  const topCompoundScenarios = mineScenarios(rows, totalLosses).slice(0, 30);
  const blockers = [
    !args.broadValidation ? 'missing HTF-MSS broad validation report' : null,
    args.broadValidation && args.broadValidation.status !== 'pass' ? `HTF-MSS broad validation status ${args.broadValidation.status}` : null,
    !args.preEntrySimulation ? 'missing HTF-MSS pre-entry feature simulation report' : null,
    args.preEntrySimulation && args.preEntrySimulation.status !== 'pass' ? `HTF-MSS pre-entry feature simulation status ${args.preEntrySimulation.status}` : null,
    args.preEntrySimulation && args.preEntrySimulation.summary.recommendation !== 'continue_feature_search'
      ? `HTF-MSS pre-entry feature simulation recommendation ${args.preEntrySimulation.summary.recommendation}`
      : null,
    !rows.length ? 'no broad selected rows available' : null,
  ].filter((item): item is string => Boolean(item));
  const zeroSelectedLossScenario = topCompoundScenarios.find((scenario) => scenario.selectedLosses === 0 && scenario.selectedWinners > 0);
  const lowWinnerCostScenario = topCompoundScenarios.find((scenario) => scenario.rejectedLosses >= 5 && scenario.rejectedWinnerCost <= 2) || null;
  const base: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPreEntryMinerReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_compound_pre_entry_miner',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      broadValidationPath: args.broadValidationPath,
      preEntrySimulationPath: args.preEntrySimulationPath,
    },
    assumptions: {
      savedReportsOnly: true,
      htfMssOnly: true,
      compoundPreEntryFeaturesOnly: true,
      excludesDateRegimeFeatures: true,
      excludesReplayOutcomeFields: true,
      promotionDisabled: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      inputSelectedRows: rows.length,
      inputLossRows: totalLosses,
      scenariosMined: topCompoundScenarios.length,
      topScenario: topCompoundScenarios[0]?.name || null,
      zeroSelectedLossScenario: zeroSelectedLossScenario?.name || null,
      lowWinnerCostScenario: lowWinnerCostScenario?.name || null,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length
        ? 'fix_inputs'
        : lowWinnerCostScenario
          ? 'simulate_compound_package'
          : 'continue_feature_search',
    },
    topCompoundScenarios,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved report inputs before using this compound pre-entry miner.']
      : [
        lowWinnerCostScenario
          ? 'A low winner-cost compound pocket exists; simulate a combined package of disjoint pockets before any implementation request.'
          : 'No low winner-cost compound pocket emerged; continue feature discovery before any scanner-visible proposal.',
        'Do not use date/regime, replay, MFE/MAE, or outcome-known fields for live filtering.',
        'Do not change live scanner, Discord, Supabase, bridge, canExecute, entry, stop, target, or risk behavior from this report.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPreEntryMinerReport(
  report: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPreEntryMinerReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-compound-pre-entry-miner-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPreEntryMinerCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPreEntryMinerArgs(args);
  const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPreEntryMinerReport({
    reportDir: options.outDir,
    broadValidationPath: options.broadValidation,
    preEntrySimulationPath: options.preEntrySimulation,
    broadValidation: fs.existsSync(options.broadValidation) ? readJson(options.broadValidation) : null,
    preEntrySimulation: fs.existsSync(options.preEntrySimulation) ? readJson(options.preEntrySimulation) : null,
  });
  const paths = writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPreEntryMinerReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, topCompoundScenarios: report.topCompoundScenarios.slice(0, 15), blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssCompoundPreEntryMinerCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
