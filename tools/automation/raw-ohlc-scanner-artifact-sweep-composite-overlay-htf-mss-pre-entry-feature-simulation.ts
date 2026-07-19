import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-two-separator-broad-validation';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadFeatureSearchReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-broad-feature-search';

type Row = RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport['selectedRows'][number];
type FeatureBucket = RawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadFeatureSearchReport['topPreEntryCandidates'][number];

interface CliOptions {
  broadValidation: string;
  featureSearch: string;
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

interface ScenarioSummary {
  name: string;
  description: string;
  sourceFeature: string;
  sourceKey: string;
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
  lossReduction: number;
  rejectedWinnerCost: number;
  livePromotionAllowedRows: 0;
}

export interface RawOhlcScannerArtifactSweepCompositeOverlayHtfMssPreEntryFeatureSimulationReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_pre_entry_feature_simulation';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    reportDir: string;
    broadValidationPath: string;
    featureSearchPath: string;
  };
  assumptions: {
    savedReportsOnly: true;
    htfMssOnly: true;
    preEntryFeaturesOnly: true;
    replayOutcomeFieldsExcluded: true;
    promotionDisabled: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    inputSelectedRows: number;
    inputLossRows: number;
    scenariosTested: number;
    bestLossReductionScenario: string | null;
    bestInstallCandidate: string | null;
    zeroSelectedLossScenario: string | null;
    livePromotionAllowedRows: 0;
    recommendation: 'continue_feature_search' | 'prepare_research_only_proposal_update' | 'fix_inputs';
  };
  scenarios: ScenarioSummary[];
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

export function parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssPreEntryFeatureSimulationArgs(args = process.argv.slice(2)): CliOptions {
  const broadValidation = readFlag(args, '--broad-validation');
  const featureSearch = readFlag(args, '--feature-search');
  if (!broadValidation) throw new Error('--broad-validation is required.');
  if (!featureSearch) throw new Error('--feature-search is required.');
  return {
    broadValidation,
    featureSearch,
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

function sum(rows: Row[]): number | null {
  const values = rows.map((row) => row.resolvedOneMesPl).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return values.length ? round(values.reduce((total, value) => total + value, 0)) : null;
}

function isWinner(row: Row): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 't1_and_t2_hit';
}

function isLoss(row: Row): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 'stopped_before_t1';
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

function rowFeatureValue(row: Row, feature: string): string | null {
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
    case 'sessionDirectionTimeRisk':
      return `${row.session}|${row.direction}|${timeBucket(row.proofTime)}|${riskBucket(row.riskPoints)}`;
    default:
      return null;
  }
}

function scenarioName(bucket: FeatureBucket): string {
  return `${bucket.feature}:${bucket.key}`.replace(/[^A-Za-z0-9:_-]+/g, '_').slice(0, 120);
}

function summarizeScenario(rows: Row[], bucket: FeatureBucket): ScenarioSummary {
  const rejected = rows.filter((row) => rowFeatureValue(row, bucket.feature) === bucket.key);
  const selected = rows.filter((row) => rowFeatureValue(row, bucket.feature) !== bucket.key);
  const selectedLosses = selected.filter(isLoss).length;
  const rejectedWinners = rejected.filter(isWinner).length;
  const rejectedLosses = rejected.filter(isLoss).length;
  return {
    name: scenarioName(bucket),
    description: `Reject broad selected HTF-MSS rows where ${bucket.feature} equals ${bucket.key}.`,
    sourceFeature: bucket.feature,
    sourceKey: bucket.key,
    selectedRows: selected.length,
    selectedWinners: selected.filter(isWinner).length,
    selectedLosses,
    selectedUnresolved: selected.filter((row) => row.outcomeStatus !== 'resolved').length,
    selectedOneMesPl: sum(selected),
    rejectedRows: rejected.length,
    rejectedWinners,
    rejectedLosses,
    rejectedUnresolved: rejected.filter((row) => row.outcomeStatus !== 'resolved').length,
    rejectedOneMesPl: sum(rejected),
    lossReduction: rejectedLosses,
    rejectedWinnerCost: rejectedWinners,
    livePromotionAllowedRows: 0,
  };
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssPreEntryFeatureSimulationReport, 'markdown'>): string {
  return [
    '# HTF MSS Pre-Entry Feature Simulation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only promotion-disabled simulation. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Input selected rows: ${report.summary.inputSelectedRows}.`,
    `- Input loss rows: ${report.summary.inputLossRows}.`,
    `- Scenarios tested: ${report.summary.scenariosTested}.`,
    `- Best loss-reduction scenario: ${report.summary.bestLossReductionScenario ?? '-'}.`,
    `- Best install candidate: ${report.summary.bestInstallCandidate ?? '-'}.`,
    `- Zero selected-loss scenario: ${report.summary.zeroSelectedLossScenario ?? '-'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Scenarios',
    ...report.scenarios.slice(0, 15).map((scenario) => `- ${scenario.name}: selected W/L/U ${scenario.selectedWinners}/${scenario.selectedLosses}/${scenario.selectedUnresolved}, selected P/L ${scenario.selectedOneMesPl ?? '-'}; rejected W/L/U ${scenario.rejectedWinners}/${scenario.rejectedLosses}/${scenario.rejectedUnresolved}, rejected P/L ${scenario.rejectedOneMesPl ?? '-'}.`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssPreEntryFeatureSimulationReport(args: {
  reportDir: string;
  broadValidationPath: string;
  featureSearchPath: string;
  broadValidation: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport | null;
  featureSearch: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadFeatureSearchReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepCompositeOverlayHtfMssPreEntryFeatureSimulationReport {
  const rows = args.broadValidation?.selectedRows || [];
  const totalLosses = rows.filter(isLoss).length;
  const buckets = (args.featureSearch?.topPreEntryCandidates || [])
    .filter((bucket) => bucket.scope === 'pre_entry_candidate')
    .filter((bucket) => ['session', 'direction', 'timeBucket', 'riskBucket', 'fineRiskBucket', 'sessionDirectionTimeRisk'].includes(bucket.feature))
    .slice(0, 20);
  const seen = new Set<string>();
  const scenarios = buckets
    .filter((bucket) => {
      const key = `${bucket.feature}:${bucket.key}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((bucket) => summarizeScenario(rows, bucket))
    .filter((scenario) => scenario.rejectedRows > 0)
    .sort((a, b) => a.selectedLosses - b.selectedLosses || a.rejectedWinnerCost - b.rejectedWinnerCost || (b.selectedOneMesPl ?? 0) - (a.selectedOneMesPl ?? 0));
  const blockers = [
    !args.broadValidation ? 'missing HTF-MSS broad validation report' : null,
    args.broadValidation && args.broadValidation.status !== 'pass' ? `HTF-MSS broad validation status ${args.broadValidation.status}` : null,
    !args.featureSearch ? 'missing HTF-MSS broad feature search report' : null,
    args.featureSearch && args.featureSearch.status !== 'pass' ? `HTF-MSS broad feature search status ${args.featureSearch.status}` : null,
    args.featureSearch && args.featureSearch.summary.recommendation !== 'simulate_pre_entry_feature_candidates'
      ? `HTF-MSS broad feature search recommendation ${args.featureSearch.summary.recommendation}`
      : null,
    !rows.length ? 'no broad selected rows available' : null,
    !buckets.length ? 'no pre-entry feature buckets available' : null,
  ].filter((item): item is string => Boolean(item));
  const zeroSelectedLossScenario = scenarios.find((scenario) => scenario.selectedLosses === 0 && scenario.selectedWinners > 0);
  const bestLossReductionScenario = [...scenarios].sort((a, b) => b.lossReduction - a.lossReduction || a.rejectedWinnerCost - b.rejectedWinnerCost)[0] || null;
  const bestInstallCandidate = scenarios.find((scenario) => scenario.selectedLosses === 0 && scenario.rejectedWinnerCost === 0 && scenario.selectedWinners > 0) || null;
  const base: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssPreEntryFeatureSimulationReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_pre_entry_feature_simulation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      broadValidationPath: args.broadValidationPath,
      featureSearchPath: args.featureSearchPath,
    },
    assumptions: {
      savedReportsOnly: true,
      htfMssOnly: true,
      preEntryFeaturesOnly: true,
      replayOutcomeFieldsExcluded: true,
      promotionDisabled: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      inputSelectedRows: rows.length,
      inputLossRows: totalLosses,
      scenariosTested: scenarios.length,
      bestLossReductionScenario: bestLossReductionScenario?.name || null,
      bestInstallCandidate: bestInstallCandidate?.name || null,
      zeroSelectedLossScenario: zeroSelectedLossScenario?.name || null,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length
        ? 'fix_inputs'
        : bestInstallCandidate
          ? 'prepare_research_only_proposal_update'
          : 'continue_feature_search',
    },
    scenarios,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved report inputs before using this pre-entry feature simulation.']
      : [
        bestInstallCandidate
          ? 'A pre-entry scenario removed all selected losses without rejecting winners in this saved report set; package it as research-only and keep promotion disabled.'
          : 'No pre-entry feature scenario is implementation-ready; continue feature search with narrower combinations before any scanner-visible proposal.',
        'Outcome and replay fields remain excluded from live-use scenarios.',
        'Do not change live scanner, Discord, Supabase, bridge, canExecute, entry, stop, target, or risk behavior from this report.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssPreEntryFeatureSimulationReport(
  report: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssPreEntryFeatureSimulationReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-pre-entry-feature-simulation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssPreEntryFeatureSimulationCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssPreEntryFeatureSimulationArgs(args);
  const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssPreEntryFeatureSimulationReport({
    reportDir: options.outDir,
    broadValidationPath: options.broadValidation,
    featureSearchPath: options.featureSearch,
    broadValidation: fs.existsSync(options.broadValidation) ? readJson(options.broadValidation) : null,
    featureSearch: fs.existsSync(options.featureSearch) ? readJson(options.featureSearch) : null,
  });
  const paths = writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssPreEntryFeatureSimulationReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, scenarios: report.scenarios.slice(0, 15), blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssPreEntryFeatureSimulationCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
