import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorSimulationReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-separator-simulation';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSelectedLossDrilldownReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-selected-loss-drilldown';

type SimulatedRow = RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorSimulationReport['selectedRows'][number];

interface CliOptions {
  separatorSimulation: string;
  selectedLossDrilldown: string;
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

interface SecondSeparator {
  name: 'selected_loss_second_separator';
  tradeDate: string;
  session: string;
  direction: string;
  timeBucket: string;
  riskBucket: string;
  sourceLossRows: number;
}

export interface RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorSimulationReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_second_separator_simulation';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    reportDir: string;
    separatorSimulationPath: string;
    selectedLossDrilldownPath: string;
  };
  assumptions: {
    savedReportsOnly: true;
    htfMssOnly: true;
    promotionDisabled: true;
    secondSeparatorSimulationOnly: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  secondSeparator: SecondSeparator | null;
  summary: {
    inputSelectedRows: number;
    selectedRows: number;
    newlyRejectedRows: number;
    totalRejectedRows: number;
    selectedWinners: number;
    selectedLosses: number;
    selectedUnresolved: number;
    selectedOneMesPl: number | null;
    newlyRejectedWinners: number;
    newlyRejectedLosses: number;
    newlyRejectedUnresolved: number;
    newlyRejectedOneMesPl: number | null;
    totalRejectedWinners: number;
    totalRejectedLosses: number;
    totalRejectedUnresolved: number;
    totalRejectedOneMesPl: number | null;
    livePromotionAllowedRows: 0;
    recommendation: 'prepare_research_only_proposal_update' | 'revise_separator' | 'fix_inputs';
  };
  selectedRows: SimulatedRow[];
  newlyRejectedRows: SimulatedRow[];
  totalRejectedRows: SimulatedRow[];
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

export function parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorSimulationArgs(args = process.argv.slice(2)): CliOptions {
  const separatorSimulation = readFlag(args, '--separator-simulation');
  const selectedLossDrilldown = readFlag(args, '--selected-loss-drilldown');
  if (!separatorSimulation) throw new Error('--separator-simulation is required.');
  if (!selectedLossDrilldown) throw new Error('--selected-loss-drilldown is required.');
  return {
    separatorSimulation,
    selectedLossDrilldown,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
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

function isWinner(row: { outcomeStatus: string; outcomeLabel: string }): boolean {
  return row.outcomeStatus === 'resolved' && row.outcomeLabel === 't1_and_t2_hit';
}

function isLoss(row: { outcomeStatus: string; outcomeLabel: string }): boolean {
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

function deriveSecondSeparator(drilldown: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSelectedLossDrilldownReport | null): SecondSeparator | null {
  if (!drilldown || drilldown.lossRows.length === 0) return null;
  const dates = drilldown.summary.lossDates;
  const sessions = drilldown.summary.lossSessions;
  const directions = drilldown.summary.lossDirections;
  const buckets = drilldown.lossRows.map((row) => ({ time: timeBucket(row.proofTime), risk: riskBucket(row.riskPoints) }));
  const timeBuckets = [...new Set(buckets.map((bucket) => bucket.time))];
  const riskBuckets = [...new Set(buckets.map((bucket) => bucket.risk))];
  if (dates.length !== 1 || sessions.length !== 1 || directions.length !== 1 || timeBuckets.length !== 1 || riskBuckets.length !== 1) return null;
  return {
    name: 'selected_loss_second_separator',
    tradeDate: dates[0],
    session: sessions[0],
    direction: directions[0],
    timeBucket: timeBuckets[0],
    riskBucket: riskBuckets[0],
    sourceLossRows: drilldown.lossRows.length,
  };
}

function matchesSecondSeparator(row: SimulatedRow, separator: SecondSeparator | null): boolean {
  if (!separator) return false;
  return row.tradeDate === separator.tradeDate
    && row.session === separator.session
    && row.direction === separator.direction
    && timeBucket(row.proofTime) === separator.timeBucket
    && riskBucket(row.riskPoints) === separator.riskBucket;
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorSimulationReport, 'markdown'>): string {
  return [
    '# HTF MSS Second-Separator Simulation',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only promotion-disabled simulation. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Separator',
    report.secondSeparator
      ? `- ${report.secondSeparator.tradeDate} ${report.secondSeparator.session} ${report.secondSeparator.direction} ${report.secondSeparator.timeBucket} ${report.secondSeparator.riskBucket}.`
      : '- None.',
    '',
    '## Summary',
    `- Input selected rows: ${report.summary.inputSelectedRows}.`,
    `- Selected rows W/L/U: ${report.summary.selectedWinners}/${report.summary.selectedLosses}/${report.summary.selectedUnresolved}.`,
    `- Selected one-MES P/L: ${report.summary.selectedOneMesPl ?? '-'}.`,
    `- Newly rejected rows W/L/U: ${report.summary.newlyRejectedWinners}/${report.summary.newlyRejectedLosses}/${report.summary.newlyRejectedUnresolved}.`,
    `- Newly rejected one-MES P/L: ${report.summary.newlyRejectedOneMesPl ?? '-'}.`,
    `- Total rejected rows W/L/U: ${report.summary.totalRejectedWinners}/${report.summary.totalRejectedLosses}/${report.summary.totalRejectedUnresolved}.`,
    `- Total rejected one-MES P/L: ${report.summary.totalRejectedOneMesPl ?? '-'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorSimulationReport(args: {
  reportDir: string;
  separatorSimulationPath: string;
  selectedLossDrilldownPath: string;
  separatorSimulation: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorSimulationReport | null;
  selectedLossDrilldown: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSelectedLossDrilldownReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorSimulationReport {
  const secondSeparator = deriveSecondSeparator(args.selectedLossDrilldown);
  const inputSelectedRows = args.separatorSimulation?.selectedRows || [];
  const selectedRows = inputSelectedRows.filter((row) => !matchesSecondSeparator(row, secondSeparator));
  const newlyRejectedRows = inputSelectedRows.filter((row) => matchesSecondSeparator(row, secondSeparator));
  const totalRejectedRows = [...(args.separatorSimulation?.rejectedRows || []), ...newlyRejectedRows]
    .sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.proofTime.localeCompare(b.proofTime) || a.ticketId.localeCompare(b.ticketId));
  const blockers = [
    !args.separatorSimulation ? 'missing HTF-MSS separator simulation report' : null,
    args.separatorSimulation && args.separatorSimulation.status !== 'pass' ? `HTF-MSS separator simulation status ${args.separatorSimulation.status}` : null,
    args.separatorSimulation && args.separatorSimulation.summary.recommendation !== 'revise_separator'
      ? `HTF-MSS separator simulation recommendation ${args.separatorSimulation.summary.recommendation}`
      : null,
    !args.selectedLossDrilldown ? 'missing HTF-MSS selected-loss drilldown report' : null,
    args.selectedLossDrilldown && args.selectedLossDrilldown.status !== 'pass' ? `HTF-MSS selected-loss drilldown status ${args.selectedLossDrilldown.status}` : null,
    args.selectedLossDrilldown && args.selectedLossDrilldown.summary.recommendation !== 'add_second_separator_simulation'
      ? `HTF-MSS selected-loss drilldown recommendation ${args.selectedLossDrilldown.summary.recommendation}`
      : null,
    !secondSeparator ? 'could not derive one unambiguous second separator' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorSimulationReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_second_separator_simulation',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      separatorSimulationPath: args.separatorSimulationPath,
      selectedLossDrilldownPath: args.selectedLossDrilldownPath,
    },
    assumptions: {
      savedReportsOnly: true,
      htfMssOnly: true,
      promotionDisabled: true,
      secondSeparatorSimulationOnly: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    secondSeparator,
    summary: {
      inputSelectedRows: inputSelectedRows.length,
      selectedRows: selectedRows.length,
      newlyRejectedRows: newlyRejectedRows.length,
      totalRejectedRows: totalRejectedRows.length,
      selectedWinners: selectedRows.filter(isWinner).length,
      selectedLosses: selectedRows.filter(isLoss).length,
      selectedUnresolved: selectedRows.filter((row) => row.outcomeStatus !== 'resolved').length,
      selectedOneMesPl: sum(selectedRows.map((row) => row.oneMesPl)),
      newlyRejectedWinners: newlyRejectedRows.filter(isWinner).length,
      newlyRejectedLosses: newlyRejectedRows.filter(isLoss).length,
      newlyRejectedUnresolved: newlyRejectedRows.filter((row) => row.outcomeStatus !== 'resolved').length,
      newlyRejectedOneMesPl: sum(newlyRejectedRows.map((row) => row.oneMesPl)),
      totalRejectedWinners: totalRejectedRows.filter(isWinner).length,
      totalRejectedLosses: totalRejectedRows.filter(isLoss).length,
      totalRejectedUnresolved: totalRejectedRows.filter((row) => row.outcomeStatus !== 'resolved').length,
      totalRejectedOneMesPl: sum(totalRejectedRows.map((row) => row.oneMesPl)),
      livePromotionAllowedRows: 0,
      recommendation: blockers.length
        ? 'fix_inputs'
        : selectedRows.filter(isLoss).length === 0 && selectedRows.filter(isWinner).length > 0
          ? 'prepare_research_only_proposal_update'
          : 'revise_separator',
    },
    selectedRows,
    newlyRejectedRows,
    totalRejectedRows,
    blockers,
    recommendations: blockers.length
      ? ['Fix the saved simulation/drilldown inputs before using this second-separator simulation.']
      : [
        selectedRows.filter(isLoss).length === 0
          ? 'The second separator removes all selected stopped-before-T1 losses in this saved simulation; keep promotion disabled until a separate proposal update and approval contract.'
          : 'Selected rows remain loss-bearing; continue research before any proposal update.',
        'Do not change Discord, Supabase, NinjaTrader bridge, canExecute, scanner runtime, entry, stop, target, risk, or live ranking from this report.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorSimulationReport(
  report: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorSimulationReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-second-separator-simulation-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorSimulationCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorSimulationArgs(args);
  const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorSimulationReport({
    reportDir: options.outDir,
    separatorSimulationPath: options.separatorSimulation,
    selectedLossDrilldownPath: options.selectedLossDrilldown,
    separatorSimulation: fs.existsSync(options.separatorSimulation) ? readJson(options.separatorSimulation) : null,
    selectedLossDrilldown: fs.existsSync(options.selectedLossDrilldown) ? readJson(options.selectedLossDrilldown) : null,
  });
  const paths = writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorSimulationReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, status: report.status, secondSeparator: report.secondSeparator, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSecondSeparatorSimulationCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
