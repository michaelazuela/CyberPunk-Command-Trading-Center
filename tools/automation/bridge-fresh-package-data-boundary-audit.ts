import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseBridgeHistorySmokeArgs,
  runBridgeHistorySmoke,
  type BridgeHistorySmokeReport,
} from './bridge-history-smoke';

type BoundaryRecommendation =
  | 'run_raw_scanner_artifact_generator'
  | 'load_ninjatrader_history'
  | 'rerun_with_active_contract'
  | 'fix_bridge_history_endpoint'
  | 'fix_smoke_inputs';

interface TimeframeBoundary {
  timeframe: string;
  rawBarCount: number;
  completedBarCount: number;
  sufficientForPackage: boolean;
  firstReturnedBarTimestamp: string | null;
  lastReturnedBarTimestamp: string | null;
  errorMessage: string | null;
}

export interface BridgeFreshPackageDataBoundaryAuditReport {
  reportType: 'bridge_fresh_package_data_boundary_audit';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: {
    readOnly: true;
    localOnly: true;
    researchOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: boolean;
    changesBridgeBehavior: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRiskRules: false;
    changesDiscordPosting: false;
    changesAppRuntime: false;
  };
  source: {
    reportDir: string;
    smokeReportPath: string | null;
    liveSmokeRun: boolean;
  };
  bridgeWindow: {
    instrument: string;
    bridgeInstrument: string;
    bridgeUrl: string;
    date: string;
    from: string;
    to: string;
  };
  summary: {
    liveRecentBarsAvailable: boolean;
    liveRecentRawBars: number;
    liveRecentCompletedBars: number;
    liveRecentRangeStart: string | null;
    liveRecentRangeEnd: string | null;
    historicalBarsAvailable: boolean;
    completedBarsAvailable: boolean;
    allRequestedTimeframesCompleted: boolean;
    likelyCause: BridgeHistorySmokeReport['likelyCause'];
    readyForMarketBarsJsonExport: boolean;
    recommendation: BoundaryRecommendation;
    livePromotionAllowedRows: 0;
  };
  timeframeBoundaries: TimeframeBoundary[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(readsLiveBridge: boolean): BridgeFreshPackageDataBoundaryAuditReport['authority'] {
  return {
    readOnly: true,
    localOnly: true,
    researchOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge,
    changesBridgeBehavior: false,
    changesScannerBehavior: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    changesRiskRules: false,
    changesDiscordPosting: false,
    changesAppRuntime: false,
  };
}

function classifyRecommendation(smoke: BridgeHistorySmokeReport | null, allTimeframesCompleted: boolean): BoundaryRecommendation {
  if (!smoke) return 'fix_smoke_inputs';
  if (allTimeframesCompleted) return 'run_raw_scanner_artifact_generator';
  if (smoke.likelyCause === 'instrument_mismatch') return 'rerun_with_active_contract';
  if (smoke.likelyCause === 'unsupported_historical_endpoint' || smoke.likelyCause === 'unsupported_timeframe') {
    return 'fix_bridge_history_endpoint';
  }
  if (smoke.liveRecentBarsAvailable && !smoke.completedBarsAvailable) return 'load_ninjatrader_history';
  if (!smoke.historicalBarsAvailable || !smoke.completedBarsAvailable) return 'load_ninjatrader_history';
  return 'fix_smoke_inputs';
}

function buildMarkdown(report: Omit<BridgeFreshPackageDataBoundaryAuditReport, 'markdown'>): string {
  return [
    '# Bridge Fresh Package Data Boundary Audit',
    '',
    `Status: ${report.status}`,
    '',
    `Authority: ${report.authority.readsLiveBridge ? 'read-only live bridge diagnostic' : 'saved-report-only diagnostic'}. It does not post Discord, write Supabase, change bridge behavior, change scanner behavior, change canExecute, or change trade math.`,
    '',
    '## Window',
    `- Instrument: ${report.bridgeWindow.instrument}.`,
    `- Bridge instrument: ${report.bridgeWindow.bridgeInstrument}.`,
    `- Date/time: ${report.bridgeWindow.date} ${report.bridgeWindow.from}-${report.bridgeWindow.to}.`,
    '',
    '## Summary',
    `- Live recent bars available: ${report.summary.liveRecentBarsAvailable}.`,
    `- Live recent range: ${report.summary.liveRecentRangeStart || '-'} to ${report.summary.liveRecentRangeEnd || '-'} (${report.summary.liveRecentCompletedBars}/${report.summary.liveRecentRawBars} completed/raw).`,
    `- Historical bars available: ${report.summary.historicalBarsAvailable}.`,
    `- Completed bars available: ${report.summary.completedBarsAvailable}.`,
    `- All requested timeframes completed: ${report.summary.allRequestedTimeframesCompleted}.`,
    `- Ready for market-bars JSON export: ${report.summary.readyForMarketBarsJsonExport}.`,
    `- Likely cause: ${report.summary.likelyCause}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Timeframes',
    '| Timeframe | Raw | Completed | Sufficient | First | Last | Error |',
    '|---|---:|---:|---|---|---|---|',
    ...report.timeframeBoundaries.map((item) => `| ${item.timeframe} | ${item.rawBarCount} | ${item.completedBarCount} | ${item.sufficientForPackage} | ${item.firstReturnedBarTimestamp || '-'} | ${item.lastReturnedBarTimestamp || '-'} | ${item.errorMessage || '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((item) => `- ${item}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildBridgeFreshPackageDataBoundaryAuditReport(args: {
  reportDir?: string;
  smokeReportPath?: string | null;
  smokeReport: BridgeHistorySmokeReport | null;
  liveSmokeRun?: boolean;
}, generatedAt = new Date().toISOString()): BridgeFreshPackageDataBoundaryAuditReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const smoke = args.smokeReport;
  const timeframeBoundaries: TimeframeBoundary[] = (smoke?.timeframeResults || []).map((result) => ({
    timeframe: result.timeframe,
    rawBarCount: result.rawBarCount,
    completedBarCount: result.completedBarCount,
    sufficientForPackage: result.completedBarCount > 0,
    firstReturnedBarTimestamp: result.firstReturnedBarTimestamp,
    lastReturnedBarTimestamp: result.lastReturnedBarTimestamp,
    errorMessage: result.errorMessage,
  }));
  const allRequestedTimeframesCompleted = timeframeBoundaries.length > 0 &&
    timeframeBoundaries.every((item) => item.sufficientForPackage);
  const recommendation = classifyRecommendation(smoke, allRequestedTimeframesCompleted);
  const blockers = [
    !smoke ? 'missing bridge history smoke report' : null,
    smoke && !allRequestedTimeframesCompleted ? 'one or more requested historical timeframes returned zero completed bars' : null,
    smoke?.likelyCause === 'instrument_mismatch' ? 'bridge instrument mismatch' : null,
    smoke?.liveRecentBarsAvailable && !smoke.completedBarsAvailable
      ? 'live recent bars exist, but historical completed bars are unavailable for the requested validation window'
      : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<BridgeFreshPackageDataBoundaryAuditReport, 'markdown'> = {
    reportType: 'bridge_fresh_package_data_boundary_audit',
    generatedAt,
    status: smoke ? 'pass' : 'fail',
    authority: authority(Boolean(args.liveSmokeRun)),
    source: {
      reportDir,
      smokeReportPath: args.smokeReportPath || null,
      liveSmokeRun: Boolean(args.liveSmokeRun),
    },
    bridgeWindow: {
      instrument: smoke?.instrument || '',
      bridgeInstrument: smoke?.bridgeInstrument || '',
      bridgeUrl: smoke?.bridgeUrl || '',
      date: smoke?.dateWindowTested.date || '',
      from: smoke?.dateWindowTested.from || '',
      to: smoke?.dateWindowTested.to || '',
    },
    summary: {
      liveRecentBarsAvailable: Boolean(smoke?.liveRecentBarsAvailable),
      liveRecentRawBars: smoke?.liveRecentResult?.rawBarCount || 0,
      liveRecentCompletedBars: smoke?.liveRecentResult?.completedBarCount || 0,
      liveRecentRangeStart: smoke?.liveRecentResult?.firstReturnedBarTimestamp || null,
      liveRecentRangeEnd: smoke?.liveRecentResult?.lastReturnedBarTimestamp || null,
      historicalBarsAvailable: Boolean(smoke?.historicalBarsAvailable),
      completedBarsAvailable: Boolean(smoke?.completedBarsAvailable),
      allRequestedTimeframesCompleted,
      likelyCause: smoke?.likelyCause || 'unknown',
      readyForMarketBarsJsonExport: allRequestedTimeframesCompleted,
      recommendation,
      livePromotionAllowedRows: 0,
    },
    timeframeBoundaries,
    blockers,
    recommendations: recommendation === 'run_raw_scanner_artifact_generator'
      ? [
        'Export or assemble the verified local market-bars JSON, then run the corrected raw scanner artifact generator command.',
        'Keep the package research-only until the replay/outcome/source-proof timing chain passes.',
      ]
      : recommendation === 'rerun_with_active_contract'
        ? ['Rerun bridge smoke against the active contract reported by /health before package generation.']
        : recommendation === 'fix_bridge_history_endpoint'
          ? ['Fix the bridge historical endpoint/timeframe support before attempting a fresh validation package.']
          : recommendation === 'load_ninjatrader_history'
            ? ['Load NinjaTrader historical data for the active contract and requested morning/lunch validation window, then rerun this audit.']
            : ['Fix smoke report inputs before using the package generator.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeBridgeFreshPackageDataBoundaryAuditReport(
  report: BridgeFreshPackageDataBoundaryAuditReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `bridge-fresh-package-data-boundary-audit-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export async function runBridgeFreshPackageDataBoundaryAuditCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const outDir = path.resolve(readFlag(rawArgs, '--out-dir') || DEFAULT_REPORT_DIR);
  const smokeReportPath = readFlag(rawArgs, '--smoke-report');
  const smokeReport = smokeReportPath
    ? readJson<BridgeHistorySmokeReport>(smokeReportPath)
    : await runBridgeHistorySmoke(parseBridgeHistorySmokeArgs(rawArgs));
  const report = buildBridgeFreshPackageDataBoundaryAuditReport({
    reportDir: outDir,
    smokeReportPath,
    smokeReport,
    liveSmokeRun: !smokeReportPath,
  });
  const paths = writeBridgeFreshPackageDataBoundaryAuditReport(report, outDir);
  if (rawArgs.includes('--json')) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runBridgeFreshPackageDataBoundaryAuditCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
