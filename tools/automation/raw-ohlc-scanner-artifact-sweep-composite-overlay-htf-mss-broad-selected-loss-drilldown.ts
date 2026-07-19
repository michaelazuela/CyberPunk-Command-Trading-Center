import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport } from './raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-two-separator-broad-validation';

type BroadValidationRow = RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport['selectedRows'][number];

interface CliOptions {
  broadValidation: string;
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

interface LossBucket {
  key: string;
  rows: number;
  oneMesPl: number;
}

export interface RawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadSelectedLossDrilldownReport {
  reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_broad_selected_loss_drilldown';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    reportDir: string;
    broadValidationPath: string;
  };
  assumptions: {
    savedBroadValidationOnly: true;
    selectedLossRowsOnly: true;
    htfMssOnly: true;
    drilldownOnly: true;
    promotionDisabled: true;
    noLiveRankInstalled: true;
    livePromotionAllowed: false;
  };
  summary: {
    broadSelectedRows: number;
    lossRows: number;
    lossOneMesPl: number;
    dominantRiskBucket: string | null;
    dominantRiskBucketRows: number;
    dominantTimeBucket: string | null;
    dominantTimeBucketRows: number;
    dominantCombo: string | null;
    dominantComboRows: number;
    livePromotionAllowedRows: 0;
    recommendation: 'build_broad_loss_separator_simulation' | 'fix_inputs';
  };
  buckets: {
    byDate: LossBucket[];
    bySession: LossBucket[];
    byDirection: LossBucket[];
    byDateSession: LossBucket[];
    byTimeBucket: LossBucket[];
    byRiskBucket: LossBucket[];
    bySessionDirection: LossBucket[];
    bySessionDirectionTimeRisk: LossBucket[];
  };
  lossRows: BroadValidationRow[];
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

export function parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadSelectedLossDrilldownArgs(args = process.argv.slice(2)): CliOptions {
  const broadValidation = readFlag(args, '--broad-validation');
  if (!broadValidation) throw new Error('--broad-validation is required.');
  return {
    broadValidation,
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

function isLoss(row: BroadValidationRow): boolean {
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

function rowPl(row: BroadValidationRow): number {
  return typeof row.resolvedOneMesPl === 'number' && Number.isFinite(row.resolvedOneMesPl) ? row.resolvedOneMesPl : 0;
}

function bucket(rows: BroadValidationRow[], keyFn: (row: BroadValidationRow) => string): LossBucket[] {
  const buckets = new Map<string, LossBucket>();
  for (const row of rows) {
    const key = keyFn(row);
    const current = buckets.get(key) || { key, rows: 0, oneMesPl: 0 };
    current.rows += 1;
    current.oneMesPl = round(current.oneMesPl + rowPl(row));
    buckets.set(key, current);
  }
  return [...buckets.values()].sort((a, b) => b.rows - a.rows || a.oneMesPl - b.oneMesPl || a.key.localeCompare(b.key));
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadSelectedLossDrilldownReport, 'markdown'>): string {
  return [
    '# HTF MSS Broad Selected-Loss Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only selected-loss drilldown. It does not install scanner-visible ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Broad selected rows: ${report.summary.broadSelectedRows}.`,
    `- Loss rows: ${report.summary.lossRows}.`,
    `- Loss one-MES P/L: ${report.summary.lossOneMesPl}.`,
    `- Dominant risk bucket: ${report.summary.dominantRiskBucket ?? '-'} (${report.summary.dominantRiskBucketRows}).`,
    `- Dominant time bucket: ${report.summary.dominantTimeBucket ?? '-'} (${report.summary.dominantTimeBucketRows}).`,
    `- Dominant combo: ${report.summary.dominantCombo ?? '-'} (${report.summary.dominantComboRows}).`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Top Date/Session Loss Buckets',
    ...report.buckets.byDateSession.slice(0, 10).map((item) => `- ${item.key}: ${item.rows}, ${item.oneMesPl}.`),
    '',
    '## Top Session/Direction/Time/Risk Buckets',
    ...report.buckets.bySessionDirectionTimeRisk.slice(0, 10).map((item) => `- ${item.key}: ${item.rows}, ${item.oneMesPl}.`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadSelectedLossDrilldownReport(args: {
  reportDir: string;
  broadValidationPath: string;
  broadValidation: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssTwoSeparatorBroadValidationReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadSelectedLossDrilldownReport {
  const selectedRows = args.broadValidation?.selectedRows || [];
  const lossRows = selectedRows.filter(isLoss);
  const blockers = [
    !args.broadValidation ? 'missing HTF-MSS broad validation report' : null,
    args.broadValidation && args.broadValidation.status !== 'pass' ? `HTF-MSS broad validation status ${args.broadValidation.status}` : null,
    args.broadValidation && args.broadValidation.summary.recommendation !== 'revise_separator'
      ? `HTF-MSS broad validation recommendation ${args.broadValidation.summary.recommendation}`
      : null,
    args.broadValidation && args.broadValidation.summary.livePromotionAllowedRows !== 0
      ? `HTF-MSS broad validation live promotion rows ${args.broadValidation.summary.livePromotionAllowedRows}`
      : null,
    args.broadValidation && lossRows.length === 0 ? 'no selected loss rows to drill down' : null,
  ].filter((item): item is string => Boolean(item));
  const byRiskBucket = bucket(lossRows, (row) => riskBucket(row.riskPoints));
  const byTimeBucket = bucket(lossRows, (row) => timeBucket(row.proofTime));
  const bySessionDirectionTimeRisk = bucket(lossRows, (row) => `${row.session}|${row.direction}|${timeBucket(row.proofTime)}|${riskBucket(row.riskPoints)}`);
  const base: Omit<RawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadSelectedLossDrilldownReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_sweep_composite_overlay_htf_mss_broad_selected_loss_drilldown',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      broadValidationPath: args.broadValidationPath,
    },
    assumptions: {
      savedBroadValidationOnly: true,
      selectedLossRowsOnly: true,
      htfMssOnly: true,
      drilldownOnly: true,
      promotionDisabled: true,
      noLiveRankInstalled: true,
      livePromotionAllowed: false,
    },
    summary: {
      broadSelectedRows: selectedRows.length,
      lossRows: lossRows.length,
      lossOneMesPl: round(lossRows.reduce((total, row) => total + rowPl(row), 0)),
      dominantRiskBucket: byRiskBucket[0]?.key || null,
      dominantRiskBucketRows: byRiskBucket[0]?.rows || 0,
      dominantTimeBucket: byTimeBucket[0]?.key || null,
      dominantTimeBucketRows: byTimeBucket[0]?.rows || 0,
      dominantCombo: bySessionDirectionTimeRisk[0]?.key || null,
      dominantComboRows: bySessionDirectionTimeRisk[0]?.rows || 0,
      livePromotionAllowedRows: 0,
      recommendation: blockers.length ? 'fix_inputs' : 'build_broad_loss_separator_simulation',
    },
    buckets: {
      byDate: bucket(lossRows, (row) => row.tradeDate),
      bySession: bucket(lossRows, (row) => row.session),
      byDirection: bucket(lossRows, (row) => row.direction),
      byDateSession: bucket(lossRows, (row) => `${row.tradeDate}|${row.session}`),
      byTimeBucket,
      byRiskBucket,
      bySessionDirection: bucket(lossRows, (row) => `${row.session}|${row.direction}`),
      bySessionDirectionTimeRisk,
    },
    lossRows,
    blockers,
    recommendations: blockers.length
      ? ['Fix the broad validation report before using this drilldown.']
      : [
        'Build a promotion-disabled broad loss separator simulation from these buckets before any implementation request.',
        'Start with risk_gte_24 and the largest morning/session-direction/time/risk buckets, then measure rejected winners before considering any rule.',
        'Do not change live scanner, Discord, Supabase, bridge, canExecute, entry, stop, target, or risk behavior from this report.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadSelectedLossDrilldownReport(
  report: RawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadSelectedLossDrilldownReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-sweep-composite-overlay-htf-mss-broad-selected-loss-drilldown-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadSelectedLossDrilldownCli(args = process.argv.slice(2)): void {
  const options = parseRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadSelectedLossDrilldownArgs(args);
  const report = buildRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadSelectedLossDrilldownReport({
    reportDir: options.outDir,
    broadValidationPath: options.broadValidation,
    broadValidation: fs.existsSync(options.broadValidation) ? readJson(options.broadValidation) : null,
  });
  const paths = writeRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadSelectedLossDrilldownReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, topBuckets: report.buckets.bySessionDirectionTimeRisk.slice(0, 5), blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactSweepCompositeOverlayHtfMssBroadSelectedLossDrilldownCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
