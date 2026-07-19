import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorSimulationReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-separator-simulation';

interface CliOptions {
  separatorSimulation: string;
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

interface LossRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  direction: string;
  riskPoints: number;
  proofTime: string;
  oneMesPl: number | null;
  positiveMatches: string[];
}

interface BucketOverlap {
  bucket: string;
  lossRows: number;
  totalSelectedRows: number;
  selectedLossRows: number;
  selectedWinnerRows: number;
  selectedUnresolvedRows: number;
}

export interface RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSelectedLossDrilldownReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_selected_loss_drilldown';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    reportDir: string;
    separatorSimulationPath: string;
  };
  assumptions: {
    savedSimulationOnly: true;
    selectedLossesOnly: true;
    drilldownOnly: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    selectedRows: number;
    selectedLosses: number;
    selectedWinners: number;
    selectedUnresolved: number;
    selectedOneMesPl: number | null;
    selectedLossOneMesPl: number | null;
    lossDates: string[];
    lossSessions: string[];
    lossDirections: string[];
    lossRiskMin: number | null;
    lossRiskMax: number | null;
    lossRiskAvg: number | null;
    sharedPositiveBuckets: string[];
    livePromotionAllowedRows: 0;
    recommendation: 'add_second_separator_simulation' | 'fix_inputs';
  };
  lossRows: LossRow[];
  bucketOverlaps: BucketOverlap[];
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

export function parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSelectedLossDrilldownArgs(args = process.argv.slice(2)): CliOptions {
  const separatorSimulation = readFlag(args, '--separator-simulation');
  if (!separatorSimulation) throw new Error('--separator-simulation is required.');
  return {
    separatorSimulation,
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

function avg(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0) / numeric.length) : null;
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

function lossRows(report: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorSimulationReport | null): LossRow[] {
  return (report?.selectedRows || [])
    .filter(isLoss)
    .map((row) => ({
      ticketId: row.ticketId,
      tradeDate: row.tradeDate,
      session: row.session,
      direction: row.direction,
      riskPoints: row.riskPoints,
      proofTime: row.proofTime,
      oneMesPl: row.oneMesPl,
      positiveMatches: row.positiveMatches,
    }))
    .sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.proofTime.localeCompare(b.proofTime) || a.ticketId.localeCompare(b.ticketId));
}

function sharedBuckets(rows: LossRow[]): string[] {
  if (!rows.length) return [];
  const shared = new Set(rows[0].positiveMatches);
  for (const row of rows.slice(1)) {
    for (const bucket of [...shared]) {
      if (!row.positiveMatches.includes(bucket)) shared.delete(bucket);
    }
  }
  return [...shared].sort();
}

function bucketOverlaps(
  report: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorSimulationReport | null,
  rows: LossRow[],
): BucketOverlap[] {
  const buckets = [...new Set(rows.flatMap((row) => row.positiveMatches))].sort();
  return buckets.map((bucket) => {
    const matching = (report?.selectedRows || []).filter((row) => row.positiveMatches.includes(bucket));
    return {
      bucket,
      lossRows: rows.filter((row) => row.positiveMatches.includes(bucket)).length,
      totalSelectedRows: matching.length,
      selectedLossRows: matching.filter(isLoss).length,
      selectedWinnerRows: matching.filter(isWinner).length,
      selectedUnresolvedRows: matching.filter((row) => row.outcomeStatus !== 'resolved').length,
    };
  }).sort((a, b) => b.lossRows - a.lossRows || b.selectedLossRows - a.selectedLossRows || a.bucket.localeCompare(b.bucket));
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSelectedLossDrilldownReport, 'markdown'>): string {
  return [
    '# HTF MSS Selected-Loss Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only selected-loss drilldown. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Selected rows W/L/U: ${report.summary.selectedWinners}/${report.summary.selectedLosses}/${report.summary.selectedUnresolved}.`,
    `- Selected one-MES P/L: ${report.summary.selectedOneMesPl ?? '-'}.`,
    `- Selected-loss one-MES P/L: ${report.summary.selectedLossOneMesPl ?? '-'}.`,
    `- Loss dates: ${report.summary.lossDates.join(', ') || '-'}.`,
    `- Loss sessions: ${report.summary.lossSessions.join(', ') || '-'}.`,
    `- Loss directions: ${report.summary.lossDirections.join(', ') || '-'}.`,
    `- Loss risk min/max/avg: ${report.summary.lossRiskMin ?? '-'}/${report.summary.lossRiskMax ?? '-'}/${report.summary.lossRiskAvg ?? '-'}.`,
    `- Shared positive buckets: ${report.summary.sharedPositiveBuckets.join('; ') || '-'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Loss Rows',
    '| Ticket | Date | Time | Session | Direction | Risk | P/L | Positive Buckets |',
    '|---|---|---|---|---|---:|---:|---|',
    ...report.lossRows.map((row) => `| ${row.ticketId} | ${row.tradeDate} | ${row.proofTime} | ${row.session} | ${row.direction} | ${row.riskPoints} | ${row.oneMesPl ?? '-'} | ${row.positiveMatches.join('; ')} |`),
    '',
    '## Bucket Overlaps',
    '| Bucket | Loss Rows | Selected Rows | Selected W/L/U |',
    '|---|---:|---:|---|',
    ...report.bucketOverlaps.map((row) => `| ${row.bucket} | ${row.lossRows} | ${row.totalSelectedRows} | ${row.selectedWinnerRows}/${row.selectedLossRows}/${row.selectedUnresolvedRows} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSelectedLossDrilldownReport(args: {
  reportDir: string;
  separatorSimulationPath: string;
  separatorSimulation: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSeparatorSimulationReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSelectedLossDrilldownReport {
  const selectedLossRows = lossRows(args.separatorSimulation);
  const selectedRows = args.separatorSimulation?.selectedRows || [];
  const blockers = [
    !args.separatorSimulation ? 'missing HTF-MSS separator simulation report' : null,
    args.separatorSimulation && args.separatorSimulation.status !== 'pass' ? `HTF-MSS separator simulation status ${args.separatorSimulation.status}` : null,
    args.separatorSimulation && args.separatorSimulation.summary.recommendation !== 'revise_separator'
      ? `HTF-MSS separator simulation recommendation ${args.separatorSimulation.summary.recommendation}`
      : null,
    args.separatorSimulation && selectedLossRows.length === 0 ? 'no selected stopped-before-T1 losses found' : null,
  ].filter((item): item is string => Boolean(item));
  const riskValues = selectedLossRows.map((row) => row.riskPoints);
  const base: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSelectedLossDrilldownReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_selected_loss_drilldown',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      separatorSimulationPath: args.separatorSimulationPath,
    },
    assumptions: {
      savedSimulationOnly: true,
      selectedLossesOnly: true,
      drilldownOnly: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      selectedRows: selectedRows.length,
      selectedLosses: selectedLossRows.length,
      selectedWinners: selectedRows.filter(isWinner).length,
      selectedUnresolved: selectedRows.filter((row) => row.outcomeStatus !== 'resolved').length,
      selectedOneMesPl: args.separatorSimulation?.summary.selectedOneMesPl ?? null,
      selectedLossOneMesPl: sum(selectedLossRows.map((row) => row.oneMesPl)),
      lossDates: [...new Set(selectedLossRows.map((row) => row.tradeDate))].sort(),
      lossSessions: [...new Set(selectedLossRows.map((row) => row.session))].sort(),
      lossDirections: [...new Set(selectedLossRows.map((row) => row.direction))].sort(),
      lossRiskMin: riskValues.length ? Math.min(...riskValues) : null,
      lossRiskMax: riskValues.length ? Math.max(...riskValues) : null,
      lossRiskAvg: avg(riskValues),
      sharedPositiveBuckets: sharedBuckets(selectedLossRows),
      livePromotionAllowedRows: 0,
      recommendation: blockers.length ? 'fix_inputs' : 'add_second_separator_simulation',
    },
    lossRows: selectedLossRows,
    bucketOverlaps: bucketOverlaps(args.separatorSimulation, selectedLossRows),
    blockers,
    recommendations: blockers.length
      ? ['Fix the saved separator simulation before using this drilldown.']
      : [
        'Use the shared positive buckets and loss-specific risk/time/direction pattern to add a second promotion-disabled separator simulation.',
        'Do not change Discord, Supabase, NinjaTrader bridge, canExecute, scanner runtime, entry, stop, target, risk, or live ranking from this report.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSelectedLossDrilldownReport(
  report: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssSelectedLossDrilldownReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-selected-loss-drilldown-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSelectedLossDrilldownCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSelectedLossDrilldownArgs(args);
  const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSelectedLossDrilldownReport({
    reportDir: options.outDir,
    separatorSimulationPath: options.separatorSimulation,
    separatorSimulation: fs.existsSync(options.separatorSimulation) ? readJson(options.separatorSimulation) : null,
  });
  const paths = writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSelectedLossDrilldownReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, lossRows: report.lossRows, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssSelectedLossDrilldownCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
