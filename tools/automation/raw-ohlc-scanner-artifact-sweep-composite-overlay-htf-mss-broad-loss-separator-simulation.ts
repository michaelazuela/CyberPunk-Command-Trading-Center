import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-two-separator-broad-validation';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadSelectedLossDrilldownReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-broad-selected-loss-drilldown';

type Row = RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport['selectedRows'][number];

interface CliOptions {
  broadValidation: string;
  lossDrilldown: string;
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

export interface RawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadLossSeparatorSimulationReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_broad_loss_separator_simulation';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    reportDir: string;
    broadValidationPath: string;
    lossDrilldownPath: string;
  };
  assumptions: {
    savedReportsOnly: true;
    htfMssOnly: true;
    broadLossSeparatorSimulationOnly: true;
    promotionDisabled: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    inputSelectedRows: number;
    inputLossRows: number;
    scenariosTested: number;
    bestLossReductionScenario: string | null;
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

export function parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadLossSeparatorSimulationArgs(args = process.argv.slice(2)): CliOptions {
  const broadValidation = readFlag(args, '--broad-validation');
  const lossDrilldown = readFlag(args, '--loss-drilldown');
  if (!broadValidation) throw new Error('--broad-validation is required.');
  if (!lossDrilldown) throw new Error('--loss-drilldown is required.');
  return {
    broadValidation,
    lossDrilldown,
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

function timeBucket(proofTime: string): string {
  const hour = Number(proofTime.slice(11, 13));
  if (!Number.isFinite(hour)) return 'unknown';
  return `${String(hour).padStart(2, '0')}:00-${String(hour).padStart(2, '0')}:59`;
}

function comboKey(row: Row): string {
  return `${row.session}|${row.direction}|${timeBucket(row.proofTime)}|${riskBucket(row.riskPoints)}`;
}

function summarizeScenario(rows: Row[], name: string, description: string, rejectPredicate: (row: Row) => boolean): ScenarioSummary {
  const rejected = rows.filter(rejectPredicate);
  const selected = rows.filter((row) => !rejectPredicate(row));
  return {
    name,
    description,
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadLossSeparatorSimulationReport, 'markdown'>): string {
  return [
    '# HTF MSS Broad Loss Separator Simulation',
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
    `- Zero selected-loss scenario: ${report.summary.zeroSelectedLossScenario ?? '-'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Scenarios',
    ...report.scenarios.map((scenario) => `- ${scenario.name}: selected W/L/U ${scenario.selectedWinners}/${scenario.selectedLosses}/${scenario.selectedUnresolved}, selected P/L ${scenario.selectedOneMesPl ?? '-'}; rejected W/L/U ${scenario.rejectedWinners}/${scenario.rejectedLosses}/${scenario.rejectedUnresolved}, rejected P/L ${scenario.rejectedOneMesPl ?? '-'}.`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadLossSeparatorSimulationReport(args: {
  reportDir: string;
  broadValidationPath: string;
  lossDrilldownPath: string;
  broadValidation: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport | null;
  lossDrilldown: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadSelectedLossDrilldownReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadLossSeparatorSimulationReport {
  const rows = args.broadValidation?.selectedRows || [];
  const topCombos = (args.lossDrilldown?.buckets.bySessionDirectionTimeRisk || []).slice(0, 4).map((bucket) => bucket.key);
  const dominantCombo = args.lossDrilldown?.summary.dominantCombo || topCombos[0] || '';
  const scenarios = [
    summarizeScenario(rows, 'risk_gte_24', 'Reject all broad selected HTF-MSS rows with risk_gte_24.', (row) => riskBucket(row.riskPoints) === 'risk_gte_24'),
    summarizeScenario(rows, 'morning_risk_gte_24', 'Reject morning HTF-MSS rows with risk_gte_24.', (row) => row.session === 'morning' && riskBucket(row.riskPoints) === 'risk_gte_24'),
    summarizeScenario(rows, 'dominant_combo', `Reject only ${dominantCombo}.`, (row) => comboKey(row) === dominantCombo),
    summarizeScenario(rows, 'top4_loss_combos', `Reject top four loss combos: ${topCombos.join(', ')}.`, (row) => topCombos.includes(comboKey(row))),
  ];
  const blockers = [
    !args.broadValidation ? 'missing HTF-MSS broad validation report' : null,
    args.broadValidation && args.broadValidation.status !== 'pass' ? `HTF-MSS broad validation status ${args.broadValidation.status}` : null,
    args.broadValidation && args.broadValidation.summary.recommendation !== 'revise_separator'
      ? `HTF-MSS broad validation recommendation ${args.broadValidation.summary.recommendation}`
      : null,
    !args.lossDrilldown ? 'missing HTF-MSS broad selected-loss drilldown report' : null,
    args.lossDrilldown && args.lossDrilldown.status !== 'pass' ? `HTF-MSS broad selected-loss drilldown status ${args.lossDrilldown.status}` : null,
    args.lossDrilldown && args.lossDrilldown.summary.recommendation !== 'build_broad_loss_separator_simulation'
      ? `HTF-MSS broad selected-loss drilldown recommendation ${args.lossDrilldown.summary.recommendation}`
      : null,
    !rows.length ? 'no broad selected rows available' : null,
  ].filter((item): item is string => Boolean(item));
  const zeroSelectedLossScenario = scenarios.find((scenario) => scenario.selectedLosses === 0 && scenario.selectedWinners > 0);
  const bestLossReductionScenario = [...scenarios].sort((a, b) => a.selectedLosses - b.selectedLosses || a.rejectedWinners - b.rejectedWinners)[0] || null;
  const base: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadLossSeparatorSimulationReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_broad_loss_separator_simulation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      broadValidationPath: args.broadValidationPath,
      lossDrilldownPath: args.lossDrilldownPath,
    },
    assumptions: {
      savedReportsOnly: true,
      htfMssOnly: true,
      broadLossSeparatorSimulationOnly: true,
      promotionDisabled: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      inputSelectedRows: rows.length,
      inputLossRows: rows.filter(isLoss).length,
      scenariosTested: scenarios.length,
      bestLossReductionScenario: bestLossReductionScenario?.name || null,
      zeroSelectedLossScenario: zeroSelectedLossScenario?.name || null,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length
        ? 'fix_inputs'
        : zeroSelectedLossScenario
          ? 'prepare_research_only_proposal_update'
          : 'continue_feature_search',
    },
    scenarios,
    blockers,
    recommendations: blockers.length
      ? ['Fix the broad validation and selected-loss drilldown inputs before using this simulation.']
      : [
        zeroSelectedLossScenario
          ? 'A zero-selected-loss scenario exists in this saved simulation; package it as research-only and keep promotion disabled.'
          : 'No tested broad separator removes all selected losses; continue no-lookahead feature search before any implementation request.',
        'Do not change live scanner, Discord, Supabase, bridge, canExecute, entry, stop, target, or risk behavior from this report.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadLossSeparatorSimulationReport(
  report: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadLossSeparatorSimulationReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-broad-loss-separator-simulation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadLossSeparatorSimulationCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadLossSeparatorSimulationArgs(args);
  const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadLossSeparatorSimulationReport({
    reportDir: options.outDir,
    broadValidationPath: options.broadValidation,
    lossDrilldownPath: options.lossDrilldown,
    broadValidation: fs.existsSync(options.broadValidation) ? readJson(options.broadValidation) : null,
    lossDrilldown: fs.existsSync(options.lossDrilldown) ? readJson(options.lossDrilldown) : null,
  });
  const paths = writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadLossSeparatorSimulationReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, scenarios: report.scenarios, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadLossSeparatorSimulationCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
